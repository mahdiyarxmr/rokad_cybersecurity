import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { RedisService } from '../../common/redis/redis.service';
import { BruteForceService } from '../../common/redis/brute-force.service';
import { normalizePersianDigits } from '../../common/utils/jalali.util';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly redisService: RedisService,
    private readonly bruteForceService: BruteForceService,
  ) {}

  /**
   * Generate initial 2FA setup secret and QR code data URL
   */
  async generateSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    // Generate RFC 6238 Base32 Secret
    const secret = generateSecret();
    const accountName = user.username || user.phone || user.email || 'user';
    const schoolName = user.tenant?.name || 'Rokad School';

    const otpauthUrl = generateURI({
      secret,
      label: accountName,
      issuer: `Rokad (${schoolName})`,
    });

    // Generate QR Code as Data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: '#151C28',
        light: '#FFFFFF',
      },
    });

    // Store pending secret temporarily in Redis for 10 minutes (600s)
    await this.redisService.set(`2fa:pending:${userId}`, secret, 600);

    return {
      success: true,
      secret,
      qrCodeUrl,
      otpauthUrl,
    };
  }

  /**
   * Confirm and activate 2FA using 6-digit TOTP code
   */
  async enable2FA(userId: string, token: string) {
    const cleanToken = normalizePersianDigits((token || '').trim());
    const secret = await this.redisService.get(`2fa:pending:${userId}`);

    if (!secret) {
      throw new BadRequestException('مهلت تأیید فعال‌سازی به پایان رسیده است. لطفاً فرآیند را مجدداً شروع کنید.');
    }

    const checkResult = verifySync({ token: cleanToken, secret });
    if (!checkResult?.valid) {
      throw new BadRequestException('کد ۶ رقمی وارد شده نامعتبر است. ساعت دستگاه خود را بررسی فرمایید.');
    }

    // Generate 8 Emergency Recovery Codes (e.g. 4B2A-9X1Z)
    const recoveryCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const codePart1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const codePart2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const plainCode = `${codePart1}-${codePart2}`;
      recoveryCodes.push(plainCode);

      // Fast hash for verification storage
      const hashed = crypto.createHash('sha256').update(plainCode).digest('hex');
      hashedCodes.push(hashed);
    }

    // Encrypt TOTP Secret using AES-256-GCM
    const encryptedSecret = this.encryptionService.encrypt(secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorRecoveryCodes: hashedCodes,
        twoFactorConfirmedAt: new Date(),
        twoFactorLastStepUpAt: new Date(),
      },
    });

    // Remove pending secret
    await this.redisService.del(`2fa:pending:${userId}`);

    this.logger.log(`2FA successfully enabled for user ${userId}`);

    return {
      success: true,
      message: 'احراز هویت دو مرحله‌ای با موفقیت فعال گردید',
      recoveryCodes,
    };
  }

  /**
   * Verify TOTP token or single-use recovery code
   */
  async verify2FAToken(userId: string, inputCode: string): Promise<boolean> {
    const raw = normalizePersianDigits((inputCode || '').trim());
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // 1. Try TOTP 6-digit code verification
    const cleanDigits = raw.replace(/\D/g, '');
    if (cleanDigits.length === 6) {
      const decryptedSecret = this.encryptionService.decrypt(user.twoFactorSecret);
      if (decryptedSecret) {
        const checkResult = verifySync({ token: cleanDigits, secret: decryptedSecret });
        if (checkResult?.valid) return true;
      }
    }

    // 2. Try Emergency Recovery Code (single-use burning)
    const upperInput = raw.toUpperCase().replace(/\s+/g, '');
    const inputHash = crypto.createHash('sha256').update(upperInput).digest('hex');

    const codeIndex = user.twoFactorRecoveryCodes.indexOf(inputHash);
    if (codeIndex !== -1) {
      // Burn recovery code from array
      const updatedCodes = [...user.twoFactorRecoveryCodes];
      updatedCodes.splice(codeIndex, 1);

      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorRecoveryCodes: updatedCodes },
      });

      this.logger.warn(`User ${userId} logged in using single-use emergency recovery code. ${updatedCodes.length} codes remaining.`);
      return true;
    }

    return false;
  }

  /**
   * Disable 2FA with password confirmation
   */
  async disable2FA(userId: string, passwordConfirm: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const isPasswordValid = await argon2.verify(user.passwordHash, passwordConfirm);
    if (!isPasswordValid) {
      throw new UnauthorizedException('رمز عبور وارد شده نادرست است');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
        twoFactorConfirmedAt: null,
        twoFactorLastStepUpAt: null,
      },
    });

    this.logger.log(`2FA disabled for user ${userId}`);

    return {
      success: true,
      message: 'احراز هویت دومرحله‌ای با موفقیت غیرفعال شد',
    };
  }

  /**
   * Requirement 5: Step-Up Authentication
   * Verify TOTP code for sensitive actions (e.g. viewing/revoking other users' sessions)
   * Grants a 10-minute step-up grace period
   *
   * NOTE: Step-up uses the SAME 2FA-specific rate limiting as the login flow.
   * This prevents an attacker who has already logged in from brute-forcing
   * the 6-digit TOTP code to elevate their privileges on sensitive endpoints.
   * Threshold: 3 failed attempts / 5 min → 5-min lock; 5 failed / 5 min → 15-min lock.
   */
  async verifyStepUp(userId: string, code: string, ipAddress?: string) {
    // Guard: 2FA-specific strict rate limiting (separate from login brute-force window)
    await this.bruteForceService.check2FAAllowed(userId, ipAddress);

    const isValid = await this.verify2FAToken(userId, code);
    if (!isValid) {
      await this.bruteForceService.record2FAFailedAttempt(userId, ipAddress);
      throw new UnauthorizedException('کد امنیتی دوعاملی نامعتبر است');
    }

    // Clear step-up 2FA counters on success
    await this.bruteForceService.record2FASuccess(userId, ipAddress);

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorLastStepUpAt: now },
    });

    return {
      success: true,
      message: 'تأیید هویت امنیتی مرحله‌ای (Step-up Auth) با موفقیت انجام شد',
      verifiedAt: now.toISOString(),
      expiresInMinutes: 10,
    };
  }
}
