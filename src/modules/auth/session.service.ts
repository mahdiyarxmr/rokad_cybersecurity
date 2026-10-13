import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to parse simple user-agent details (OS, Browser, Device)
   */
  parseUserAgent(userAgent?: string): { browser: string; os: string; deviceType: string } {
    if (!userAgent) {
      return { browser: 'مرورگر نامشخص', os: 'نامشخص', deviceType: 'DESKTOP' };
    }

    const ua = userAgent.toLowerCase();

    let os = 'سایر';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    let browser = 'مرورگر وب';
    if (ua.includes('edg')) browser = 'Microsoft Edge';
    else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Google Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    let deviceType = 'DESKTOP';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'MOBILE';
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
      deviceType = 'TABLET';
    }

    return { browser, os, deviceType };
  }

  /**
   * Hash a refresh token to create a unique session fingerprint
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Record a new active session upon successful login or token issuance
   */
  async createSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const sessionTokenHash = this.hashToken(refreshToken);
    const { browser, os, deviceType } = this.parseUserAgent(userAgent);

    return this.prisma.userSession.create({
      data: {
        userId,
        tenantId,
        sessionTokenHash,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
        browser,
        os,
        deviceType,
        isRevoked: false,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Update last activity on a session
   */
  async touchSession(refreshToken: string) {
    const sessionTokenHash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { sessionTokenHash, isRevoked: false },
      data: { lastActiveAt: new Date() },
    });
  }

  async assertSameTenant(
    actor: { id?: string; tenantId?: string; isPlatformAdmin?: boolean; role?: string },
    targetUserId: string,
  ) {
    if (actor?.isPlatformAdmin || actor?.role === 'SUPER_ADMIN') return;
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { tenantId: true },
    });
    if (!target) throw new NotFoundException('کاربر مورد نظر یافت نشد');
    if (!actor?.tenantId || target.tenantId !== actor.tenantId) {
      throw new ForbiddenException('دسترسی به نشست کاربران مرکز آموزشی دیگر مجاز نیست');
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      browser: s.browser,
      os: s.os,
      deviceType: s.deviceType,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: currentHash ? s.sessionTokenHash === currentHash : false,
    }));
  }

  /**
   * Revoke a single specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('نشست مورد نظر یافت نشد');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);

    return {
      success: true,
      message: 'نشست دستگاه با موفقیت خاتمه یافت',
    };
  }

  /**
   * Requirement 4: Revoke all other sessions (called on password change or emergency signout)
   */
  async revokeAllOtherSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;

    const where: any = {
      userId,
      isRevoked: false,
    };

    if (currentHash) {
      where.sessionTokenHash = { not: currentHash };
    }

    const result = await this.prisma.userSession.updateMany({
      where,
      data: { isRevoked: true },
    });

    // Also revoke token families in database
    await this.prisma.refreshTokenFamily.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedReason: 'PASS_CHANGE_OR_ALL_SESSIONS_REVOKED',
      },
    });

    this.logger.log(`Revoked ${result.count} other sessions for user ${userId}`);

    return {
      success: true,
      revokedCount: result.count,
      message: 'تمام نشست‌های فعال در سایر دستگاه‌ها با موفقیت خاتمه یافتند',
    };
  }

  /**
   * Check if a session token is revoked
   */
  async isSessionRevoked(refreshToken: string): Promise<boolean> {
    const sessionTokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { sessionTokenHash },
      select: { isRevoked: true },
    });

    return !session || session.isRevoked;
  }
}
