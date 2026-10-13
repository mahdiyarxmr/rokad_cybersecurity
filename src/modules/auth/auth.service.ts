import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto, VerifyTwoFactorDto } from './dto/security.dto';
import { TwoFactorService } from './two-factor.service';
import { SessionService } from './session.service';
import { PasswordVaultService } from './password-vault.service';
import { BruteForceService } from '../../common/redis/brute-force.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { Role, TenantType } from '../../common/constants';
import { normalizePersianDigits } from '../../common/utils/jalali.util';
import { resolveSecret } from '../../common/security/security-policy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionService: SessionService,
    private readonly bruteForceService: BruteForceService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordVaultService: PasswordVaultService,
  ) {}

  /**
   * Register a new school and create its initial administrator
   */
  async registerSchool(dto: RegisterSchoolDto, ipAddress?: string, userAgent?: string): Promise<any> {
    await this.bruteForceService.checkLoginAllowed(
      dto.adminPhone || dto.adminEmail || dto.slug,
      ipAddress,
    );
    // Check if tenant slug is already taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new ConflictException('شناسه/اسلاگ انتخاب‌شده برای این مدرسه قبلاً ثبت شده است');
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    // Create Tenant and Admin User inside transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          type: TenantType.SCHOOL as any,
          name: dto.schoolName,
          slug: dto.slug,
          subdomain: dto.subdomain || dto.slug,
          theme: (dto.theme || 'ECOSYSTEM') as any,
          status: 'ACTIVE',
          email: dto.adminEmail,
          phone: dto.adminPhone,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          phone: dto.adminPhone,
          email: dto.adminEmail,
          passwordHash,
          role: Role.SCHOOL_ADMIN as any,
          status: 'ACTIVE',
        },
      });

      return { tenant, user };
    });

    // Initialize Vault and encrypt initial admin password
    try {
      const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
        result.tenant.id,
        dto.adminPassword,
      );
      if (encryptedPassword) {
        await this.prisma.user.update({
          where: { id: result.user.id },
          data: { encryptedPassword },
        });
      }
    } catch (vaultErr: any) {
      this.logger.warn(`Failed to encrypt initial admin password into vault: ${vaultErr.message}`);
    }

    // Issue initial token pair
    const tokens = await this.createTokenPair(
      result.user.id,
      result.tenant.id,
      result.user.role,
      result.user.isPlatformAdmin,
      ipAddress,
      userAgent,
      result.user,
    );

    await this.sessionService.createSession(
      result.user.id,
      result.tenant.id,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'REGISTER_SCHOOL',
      entity: 'Tenant',
      entityId: result.tenant.id,
      newValues: { schoolName: dto.schoolName, slug: dto.slug },
      ipAddress,
      userAgent,
    });

    return {
      message: 'مدرسه و کاربر مدیر با موفقیت ثبت شدند',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        theme: result.tenant.theme,
      },
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        phone: result.user.phone,
        email: result.user.email,
        role: result.user.role,
      },
      ...tokens,
    };
  }

  /**
   * Tenant-aware login with phone/email/username + password
   */
  async login(dto: LoginDto, currentTenantId?: string, ipAddress?: string, userAgent?: string): Promise<any> {
    const rawIdentifier = dto.identifier ? dto.identifier.trim() : '';
    const cleanIdentifier = normalizePersianDigits(rawIdentifier);

    // 1. Anti-Brute-Force & Lockout check
    await this.bruteForceService.checkLoginAllowed(cleanIdentifier || rawIdentifier, ipAddress);

    let tenantId = currentTenantId;

    if (!tenantId && dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    // Key Separation: calculate Blind Index for national ID search
    const nationalBlind = this.encryptionService.blindIndex(cleanIdentifier);
    const strippedPIdentifier = cleanIdentifier.startsWith('p') ? cleanIdentifier.slice(1) : '';
    const strippedNationalBlind = strippedPIdentifier ? this.encryptionService.blindIndex(strippedPIdentifier) : null;

    const strippedZeroIdentifier = cleanIdentifier.replace(/^0+/, '');
    const strippedZeroPIdentifier = strippedPIdentifier ? strippedPIdentifier.replace(/^0+/, '') : '';
    const paddedTenIdentifier = cleanIdentifier.length < 10 && /^\d+$/.test(cleanIdentifier) ? cleanIdentifier.padStart(10, '0') : '';

    // Look for candidate users matching identifier in this tenant (supports both direct match & parent matching child's national code)
    let candidateUsers: any[] = [];
    try {
      candidateUsers = await this.prisma.user.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          OR: [
            { username: cleanIdentifier },
            { username: `p${cleanIdentifier}` },
            { username: `p_${cleanIdentifier}` },
            { username: `t${cleanIdentifier}` },
            { username: `t_${cleanIdentifier}` },
            ...(strippedPIdentifier ? [{ username: strippedPIdentifier }] : []),
            ...(strippedZeroIdentifier ? [{ username: strippedZeroIdentifier }, { username: `p${strippedZeroIdentifier}` }] : []),
            ...(strippedZeroPIdentifier ? [{ username: strippedZeroPIdentifier }, { username: `p${strippedZeroPIdentifier}` }] : []),
            ...(paddedTenIdentifier ? [{ username: paddedTenIdentifier }, { username: `p${paddedTenIdentifier}` }] : []),
            { nationalId: cleanIdentifier },
            ...(strippedPIdentifier ? [{ nationalId: strippedPIdentifier }] : []),
            ...(strippedZeroIdentifier ? [{ nationalId: strippedZeroIdentifier }] : []),
            ...(paddedTenIdentifier ? [{ nationalId: paddedTenIdentifier }] : []),
            ...(nationalBlind ? [{ nationalIdBlindIndex: nationalBlind }] : []),
            ...(strippedNationalBlind ? [{ nationalIdBlindIndex: strippedNationalBlind }] : []),
            { phone: cleanIdentifier },
            { email: rawIdentifier.toLowerCase() },
            { email: cleanIdentifier.toLowerCase() },
            { studentProfile: { nationalCode: cleanIdentifier } },
            ...(strippedZeroIdentifier ? [{ studentProfile: { nationalCode: strippedZeroIdentifier } }] : []),
            ...(paddedTenIdentifier ? [{ studentProfile: { nationalCode: paddedTenIdentifier } }] : []),
            ...(nationalBlind ? [{ studentProfile: { nationalCodeBlindIndex: nationalBlind } }] : []),
            { studentProfile: { studentCode: cleanIdentifier } },
            ...(strippedZeroIdentifier ? [{ studentProfile: { studentCode: strippedZeroIdentifier } }] : []),
            ...(paddedTenIdentifier ? [{ studentProfile: { studentCode: paddedTenIdentifier } }] : []),
            // Match Parent account linked to student with this national code or username
            {
              parentProfile: {
                studentLinks: {
                  some: {
                    student: {
                      OR: [
                        { nationalCode: cleanIdentifier },
                        ...(strippedZeroIdentifier ? [{ nationalCode: strippedZeroIdentifier }] : []),
                        ...(paddedTenIdentifier ? [{ nationalCode: paddedTenIdentifier }] : []),
                        ...(nationalBlind ? [{ nationalCodeBlindIndex: nationalBlind }] : []),
                        { studentCode: cleanIdentifier },
                        ...(strippedZeroIdentifier ? [{ studentCode: strippedZeroIdentifier }] : []),
                        ...(paddedTenIdentifier ? [{ studentCode: paddedTenIdentifier }] : []),
                        { user: { username: cleanIdentifier } },
                        ...(strippedZeroIdentifier ? [{ user: { username: strippedZeroIdentifier } }] : []),
                        ...(paddedTenIdentifier ? [{ user: { username: paddedTenIdentifier } }] : []),
                        ...(strippedPIdentifier ? [{ nationalCode: strippedPIdentifier }] : []),
                        ...(strippedPIdentifier ? [{ user: { username: strippedPIdentifier } }] : []),
                        ...(strippedZeroPIdentifier ? [{ user: { username: strippedZeroPIdentifier } }] : []),
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
        include: {
          tenant: true,
        },
      });
    } catch (dbErr: any) {
      this.logger.error(`[AuthService] Database query in login failed: ${dbErr.message}`, dbErr.stack);
      throw new ServiceUnavailableException(
        'سرویس احراز هویت موقتاً در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید.',
      );
    }

    // Verify Password across candidate users (e.g. distinguishing Student vs Parent entering the same national ID)
    let authenticatedUser: any = null;
    const cleanPassword = normalizePersianDigits(dto.password || '');

    // Prioritize exact username match
    candidateUsers.sort((a, b) => {
      if (a.username === cleanIdentifier) return -1;
      if (b.username === cleanIdentifier) return 1;
      return 0;
    });

    for (const candidate of candidateUsers) {
      if (candidate.status !== 'ACTIVE') continue;
      let isValid = false;
      try {
        isValid = (await argon2.verify(candidate.passwordHash, dto.password)) ||
                  (cleanPassword !== dto.password ? await argon2.verify(candidate.passwordHash, cleanPassword) : false);
      } catch (e) {}
      if (isValid) {
        authenticatedUser = candidate;
        break;
      }
    }

    // If not matched or candidateUsers was empty in the scoped tenant,
    // search across all other active tenants for this identifier and password!
    if (!authenticatedUser) {
      try {
        const otherTenantCandidates = await this.prisma.user.findMany({
          where: {
            ...(tenantId ? { tenantId: { not: tenantId } } : {}),
            status: 'ACTIVE',
            OR: [
              { username: cleanIdentifier },
              { username: `p${cleanIdentifier}` },
              { username: `p_${cleanIdentifier}` },
              { username: `t${cleanIdentifier}` },
              { username: `t_${cleanIdentifier}` },
              ...(strippedPIdentifier ? [{ username: strippedPIdentifier }] : []),
              ...(strippedZeroIdentifier ? [{ username: strippedZeroIdentifier }, { username: `p${strippedZeroIdentifier}` }] : []),
              ...(strippedZeroPIdentifier ? [{ username: strippedZeroPIdentifier }, { username: `p${strippedZeroPIdentifier}` }] : []),
              ...(paddedTenIdentifier ? [{ username: paddedTenIdentifier }, { username: `p${paddedTenIdentifier}` }] : []),
              { nationalId: cleanIdentifier },
              ...(strippedPIdentifier ? [{ nationalId: strippedPIdentifier }] : []),
              ...(strippedZeroIdentifier ? [{ nationalId: strippedZeroIdentifier }] : []),
              ...(paddedTenIdentifier ? [{ nationalId: paddedTenIdentifier }] : []),
              ...(nationalBlind ? [{ nationalIdBlindIndex: nationalBlind }] : []),
              ...(strippedNationalBlind ? [{ nationalIdBlindIndex: strippedNationalBlind }] : []),
              { phone: cleanIdentifier },
              { email: rawIdentifier.toLowerCase() },
              { email: cleanIdentifier.toLowerCase() },
              { studentProfile: { nationalCode: cleanIdentifier } },
              ...(strippedZeroIdentifier ? [{ studentProfile: { nationalCode: strippedZeroIdentifier } }] : []),
              ...(paddedTenIdentifier ? [{ studentProfile: { nationalCode: paddedTenIdentifier } }] : []),
              ...(nationalBlind ? [{ studentProfile: { nationalCodeBlindIndex: nationalBlind } }] : []),
              { studentProfile: { studentCode: cleanIdentifier } },
              ...(strippedZeroIdentifier ? [{ studentProfile: { studentCode: strippedZeroIdentifier } }] : []),
              ...(paddedTenIdentifier ? [{ studentProfile: { studentCode: paddedTenIdentifier } }] : []),
            ],
          },
          include: {
            tenant: true,
          },
        });

        // Prioritize exact username match
        otherTenantCandidates.sort((a, b) => {
          if (a.username === cleanIdentifier) return -1;
          if (b.username === cleanIdentifier) return 1;
          return 0;
        });

        for (const candidate of otherTenantCandidates) {
          if (candidate.status !== 'ACTIVE') continue;
          let isValid = false;
          try {
            isValid = (await argon2.verify(candidate.passwordHash, dto.password)) ||
                      (cleanPassword !== dto.password ? await argon2.verify(candidate.passwordHash, cleanPassword) : false);
          } catch (e) {}
          if (isValid) {
            authenticatedUser = candidate;
            break;
          }
        }
      } catch (crossErr: any) {
        this.logger.warn(`[AuthService] Cross-tenant user search skipped: ${crossErr.message}`);
      }
    }

    if (!authenticatedUser) {
      await this.bruteForceService.recordFailedAttempt(cleanIdentifier || rawIdentifier, ipAddress);
      throw new UnauthorizedException('اطلاعات ورود (نام کاربری یا رمز عبور) اشتباه است');
    }

    const user = authenticatedUser;

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری شما غیرفعال یا معلق شده است');
    }

    if (user.tenant && user.tenant.status !== 'ACTIVE' && !user.isPlatformAdmin) {
      throw new UnauthorizedException('مرکز آموزشی مربوطه غیرفعال یا معلق است');
    }

    // 2. If Two-Factor Authentication is enabled on this account
    if (user.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          tenantId: user.tenantId,
          requiresTwoFactor: true,
          tokenUse: '2fa',
        },
        {
          secret: this.accessSecret(),
          expiresIn: '5m',
        },
      );

      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'لطفاً کد ۶ رقمی اپلیکیشن احراز هویت دومرحله‌ای (Google Authenticator / 2FA) را وارد نمایید',
      };
    }

    // 3. Clear brute force lock on success
    await this.bruteForceService.recordLoginSuccess(cleanIdentifier || rawIdentifier, ipAddress);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (user.mustChangePassword) {
      return this.buildPasswordChangeResponse(user);
    }

    // Issue Token Pair with new Token Family
    const tokens = await this.createTokenPair(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
      ipAddress,
      userAgent,
      user,
    );

    // Register active user session
    await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'Auth',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      message: 'ورود موفقیت‌آمیز بود',
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        theme: user.tenant.theme,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
        twoFactorEnabled: user.twoFactorEnabled,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  /**
   * Complete 2FA Login using 6-digit TOTP code or emergency recovery code
   */
  async verifyTwoFactorLogin(
    dto: VerifyTwoFactorDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken, {
        secret: this.accessSecret(),
      });
    } catch {
      throw new UnauthorizedException('مهلت ۵ دقیقه‌ای توکن موقت ورود به پایان رسیده است. لطفاً مجدداً لاگین کنید.');
    }

    if (!payload?.requiresTwoFactor || payload?.tokenUse !== '2fa' || !payload?.sub) {
      throw new UnauthorizedException('توکن نامعتبر است');
    }

    const userId = payload.sub;

    // Requirement: Strict 2FA-specific rate limiting (3 failed/5min → 5-min lock, 5 failed/5min → 15-min lock)
    // This is intentionally stricter than the general login brute-force (5/10 attempts, 10-min window)
    // because the 6-digit TOTP space (1M possibilities) is far smaller than a typical password space.
    await this.bruteForceService.check2FAAllowed(userId, ipAddress);

    const isValid = await this.twoFactorService.verify2FAToken(userId, dto.code);
    if (!isValid) {
      await this.bruteForceService.record2FAFailedAttempt(userId, ipAddress);
      throw new UnauthorizedException('کد ۶ رقمی یا کد بازیابی اضطراری وارد شده نادرست است');
    }

    // Clear 2FA-specific rate-limit counters on success
    await this.bruteForceService.record2FASuccess(userId, ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری فعال نیست');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        twoFactorLastStepUpAt: new Date(),
      },
    });

    if (user.mustChangePassword) {
      return this.buildPasswordChangeResponse(user);
    }

    const tokens = await this.createTokenPair(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
      ipAddress,
      userAgent,
      user,
    );

    // Register active user session
    await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN_2FA',
      entity: 'Auth',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      message: 'ورود دومرحله‌ای با موفقیت انجام شد',
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        theme: user.tenant.theme,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
        twoFactorEnabled: true,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  /**
   * Requirement 4: Change Password & Revoke all other sessions
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const isOldValid = await argon2.verify(user.passwordHash, dto.oldPassword);
    if (!isOldValid) {
      throw new BadRequestException('رمز عبور فعلی وارد شده نادرست است');
    }
    if (dto.newPassword === dto.oldPassword) {
      throw new BadRequestException('رمز جدید باید با رمز فعلی متفاوت باشد');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      user.tenantId,
      dto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        encryptedPassword: encryptedPassword || undefined,
        mustChangePassword: false,
      },
    });

    // Requirement 4: Revoke all other active sessions!
    await this.sessionService.revokeAllOtherSessions(userId, currentRefreshToken);

    const tokens = await this.createTokenPair(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
      ipAddress,
      userAgent,
      user,
    );
    await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.eventEmitter.emit('audit.log', {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      mustChangePassword: false,
      message: 'رمز عبور با موفقیت به‌روزرسانی شد و تمامی نشست‌های فعال در سایر دستگاه‌ها باطل گردیدند',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
        tenantId: user.tenantId,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            theme: user.tenant.theme,
          }
        : undefined,
      ...tokens,
    };
  }

  /**
   * Refresh Token Rotation with Token Family Reuse Detection
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    try {
      return await this.refreshTokenCore(dto, ipAddress, userAgent);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      // 503 (not 401): transient DB blip must not wipe the client session.
      if (this.prisma.isConnectionError(err)) {
        this.logger.error(`Refresh token failed (DB unavailable): ${err?.message}`);
        throw new ServiceUnavailableException(
          'اتصال به سرور برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید',
        );
      }
      throw err;
    }
  }

  private async refreshTokenCore(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const rawToken = dto.refreshToken;
    const tokenHash = this.hashToken(rawToken);

    // Look up token with its family and user (reconnect-retry only on the read —
    // never re-run the whole rotation after isUsed was flipped).
    const tokenRecord = await this.prisma.withReconnectRetry(() =>
      this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          family: {
            include: {
              user: {
                include: { tenant: true },
              },
            },
          },
        },
      }),
    );

    if (!tokenRecord) {
      throw new UnauthorizedException('توکن رفرش نامعتبر است');
    }

    const { family } = tokenRecord;

    // 1. Check if token family was already revoked
    if (family.isRevoked) {
      throw new UnauthorizedException('سشن منقضی یا باطل شده است. لطفاً دوباره وارد شوید');
    }

    // 2. REUSE DETECTION: If token was already used, this indicates theft/replay attack!
    if (tokenRecord.isUsed) {
      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for userId: ${family.userId}, familyId: ${family.id}`,
      );

      // Invalidate the ENTIRE token family immediately
      await this.prisma.refreshTokenFamily.update({
        where: { id: family.id },
        data: {
          isRevoked: true,
          revokedReason: 'TOKEN_REUSE_DETECTED',
        },
      });

      this.eventEmitter.emit('audit.log', {
        tenantId: family.tenantId,
        userId: family.userId,
        action: 'SECURITY_ALERT_TOKEN_REUSE',
        entity: 'Auth',
        entityId: family.id,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException(
        'فعالیت مشکوک در سشن امنیتی شما شناسایی شد. تمام سشن‌های این دستگاه لغو شدند. لطفاً مجدداً لاگین کنید.',
      );
    }

    // 3. Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('توکن رفرش منقضی شده است');
    }

    if (family.user.mustChangePassword) {
      await this.prisma.refreshTokenFamily.update({
        where: { id: family.id },
        data: { isRevoked: true, revokedReason: 'PASSWORD_RESET_REQUIRED' },
      });
      throw new UnauthorizedException('تغییر رمز عبور الزامی است. لطفاً دوباره وارد شوید.');
    }

    // 4-5. Atomic rotation: mark used + insert successor together (never half-rotate).
    const newRawRefreshToken = this.generateSecureRandomToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);

    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          familyId: family.id,
          tokenHash: newTokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      }),
    ]);

    // 6. Generate new Access Token
    const user = family.user;
    const accessToken = this.signAccessToken(
      user.id,
      user.tenantId,
      user.role,
      user.isPlatformAdmin,
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  /**
   * Invalidate session / Logout
   */
  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord) {
        await this.prisma.refreshTokenFamily.update({
          where: { id: tokenRecord.familyId },
          data: { isRevoked: true, revokedReason: 'USER_LOGOUT' },
        });
      }
    } else if (userId) {
      // Invalidate all families for user
      await this.prisma.refreshTokenFamily.updateMany({
        where: { userId },
        data: { isRevoked: true, revokedReason: 'USER_LOGOUT_ALL' },
      });
    }

    return { message: 'خروج از حساب کاربری با موفقیت انجام شد' };
  }

  /**
   * Helper: create Access + Refresh Token pair with new Family
   */
  private async createTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    isPlatformAdmin: boolean,
    ipAddress?: string,
    userAgent?: string,
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
      phone?: string | null;
      email?: string | null;
    },
  ) {
    const accessToken = this.signAccessToken(userId, tenantId, role, isPlatformAdmin, user);

    // Create a new Token Family
    const family = await this.prisma.refreshTokenFamily.create({
      data: {
        userId,
        tenantId,
      },
    });

    const rawRefreshToken = this.generateSecureRandomToken();
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        familyId: family.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  private buildPasswordChangeResponse(user: any) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        isPlatformAdmin: !!user.isPlatformAdmin,
        tokenUse: 'password_change',
      },
      { secret: this.accessSecret(), expiresIn: '15m' },
    );
    return {
      mustChangePassword: true,
      message: 'برای ادامه باید رمز عبور را تغییر دهید.',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            theme: user.tenant.theme,
          }
        : undefined,
    };
  }

  private signAccessToken(
    userId: string,
    tenantId: string,
    role: string,
    isPlatformAdmin: boolean,
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
      phone?: string | null;
      email?: string | null;
    },
  ): string {
    const payload = {
      sub: userId,
      tenantId,
      role,
      isPlatformAdmin,
      tokenUse: 'access' as const,
      ...(user?.firstName ? { firstName: user.firstName } : {}),
      ...(user?.lastName ? { lastName: user.lastName } : {}),
      ...(user?.username ? { username: user.username } : {}),
      ...(user?.phone ? { phone: user.phone } : {}),
      ...(user?.email ? { email: user.email } : {}),
    };

    return this.jwtService.sign(payload, {
      secret: this.accessSecret(),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private accessSecret(): string {
    return resolveSecret(
      'JWT_ACCESS_SECRET',
      this.configService.get<string>('JWT_ACCESS_SECRET'),
    );
  }

  async issueDownloadTicket(user: {
    id: string;
    tenantId: string;
    role: string;
    isPlatformAdmin: boolean;
  }): Promise<{ ticket: string; expiresIn: number }> {
    const ticket = this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
        tokenUse: 'download',
      },
      { secret: this.accessSecret(), expiresIn: '60s' },
    );
    return { ticket, expiresIn: 60 };
  }

  private generateSecureRandomToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async updateProfile(
    userId: string,
    dto: { avatarUrl?: string; firstName?: string; lastName?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.firstName ? { firstName: dto.firstName } : {}),
        ...(dto.lastName ? { lastName: dto.lastName } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        username: true,
        tenantId: true,
      },
    });
    return updated;
  }

  /**
   * Get all schools where the user's phone or national ID has an active account
   */
  async getUserSchools(phone?: string) {
    if (!phone) return [];
    const users = await this.prisma.user.findMany({
      where: {
        phone,
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      tenantId: u.tenant.id,
      tenantName: u.tenant.name,
      tenantSlug: u.tenant.slug,
      theme: u.tenant.theme,
      role: u.role,
      isPlatformAdmin: u.isPlatformAdmin,
    }));
  }

  /**
   * Switch the current user's active school context without requiring re-entering password
   */
  async switchSchool(
    userId: string,
    targetTenantSlug: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!currentUser || !currentUser.phone) {
      throw new BadRequestException('کاربر جاری فاقد شماره همراه معتبر است');
    }

    if (!targetTenantSlug) {
      throw new BadRequestException('شناسه یا اسلاگ مدرسه مقصد الزامی است');
    }

    const targetTenant = await this.prisma.tenant.findUnique({
      where: { slug: targetTenantSlug },
    });
    if (!targetTenant) {
      throw new NotFoundException('مدرسه مقصد یافت نشد');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        tenantId: targetTenant.id,
        phone: currentUser.phone,
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    if (!targetUser) {
      throw new ForbiddenException('حساب کاربری فعالی برای شما در مدرسه مقصد یافت نشد');
    }

    // Issue tokens for target tenant
    const tokens = await this.createTokenPair(
      targetUser.id,
      targetUser.tenantId,
      targetUser.role,
      targetUser.isPlatformAdmin,
      ipAddress,
      userAgent,
      targetUser,
    );

    await this.sessionService.createSession(
      targetUser.id,
      targetUser.tenantId,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    return {
      message: `انتقال به ${targetTenant.name} با موفقیت انجام شد`,
      tenant: {
        id: targetTenant.id,
        name: targetTenant.name,
        slug: targetTenant.slug,
        theme: targetTenant.theme,
      },
      user: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        phone: targetUser.phone,
        email: targetUser.email,
        role: targetUser.role,
        isPlatformAdmin: targetUser.isPlatformAdmin,
      },
      ...tokens,
    };
  }
}
