import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from './redis.service';
import { normalizePersianDigits } from '../utils/jalali.util';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger(BruteForceService.name);

  // In-memory fallback if Redis is offline
  private readonly memoryLocks = new Map<string, number>();
  private readonly memoryAttempts = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if login is permitted or currently locked due to previous failed attempts
   */
  async checkLoginAllowed(identifier: string, ipAddress?: string): Promise<void> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    const userLockKey = `brute:lock:user:${cleanId}`;
    const ipLockKey = `brute:lock:ip:${ip}`;

    const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(ip);

    const [userTtl, ipTtl] = await Promise.all([
      this.redisService.ttl(userLockKey),
      isLoopback ? Promise.resolve(-2) : this.redisService.ttl(ipLockKey),
    ]);

    let maxTtl = Math.max(userTtl, isLoopback ? 0 : ipTtl);

    // Fallback check in memory
    if (maxTtl <= 0) {
      const now = Date.now();
      const memUserLock = this.memoryLocks.get(cleanId);
      const memIpLock = isLoopback ? 0 : this.memoryLocks.get(ip);
      const memLock = Math.max(memUserLock || 0, memIpLock || 0);

      if (memLock > now) {
        maxTtl = Math.ceil((memLock - now) / 1000);
      }
    }

    if (maxTtl > 0) {
      const minutes = Math.ceil(maxTtl / 60);
      this.logger.warn(`Blocked login attempt for ${cleanId} from ${ip}. Locked for ${maxTtl}s.`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `به دلیل ورودهای ناموفق مکرر، ورود موقتاً مسدود شده است. لطفاً ${minutes} دقیقه دیگر تلاش فرمایید.`,
          remainingSeconds: maxTtl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record a failed login attempt and apply lockouts dynamically
   */
  async recordFailedAttempt(identifier: string, ipAddress?: string): Promise<number> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    const userAttemptKey = `brute:attempt:user:${cleanId}`;
    const ipAttemptKey = `brute:attempt:ip:${ip}`;

    // 10-minute tracking window (600 seconds)
    const [userAttempts, ipAttempts] = await Promise.all([
      this.redisService.incr(userAttemptKey, 600),
      this.redisService.incr(ipAttemptKey, 600),
    ]);

    const maxAttempts = Math.max(userAttempts, ipAttempts);

    // Progressive Lockout
    if (maxAttempts >= 10) {
      // 30-minute lockout
      const lockSeconds = 1800;
      await Promise.all([
        this.redisService.set(`brute:lock:user:${cleanId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(cleanId, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(ip, Date.now() + lockSeconds * 1000);
      this.logger.warn(`User ${cleanId} and IP ${ip} locked out for 30 minutes after ${maxAttempts} failed attempts.`);
    } else if (maxAttempts >= 5) {
      // 5-minute lockout
      const lockSeconds = 300;
      await Promise.all([
        this.redisService.set(`brute:lock:user:${cleanId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(cleanId, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(ip, Date.now() + lockSeconds * 1000);
      this.logger.warn(`User ${cleanId} and IP ${ip} locked out for 5 minutes after ${maxAttempts} failed attempts.`);
    }

    return maxAttempts;
  }

  /**
   * Clear failed attempt counters and unlock on successful login
   */
  async recordLoginSuccess(identifier: string, ipAddress?: string): Promise<void> {
    const cleanId = normalizePersianDigits(identifier.trim().toLowerCase());
    const ip = ipAddress || 'unknown';

    await Promise.all([
      this.redisService.del(`brute:attempt:user:${cleanId}`),
      this.redisService.del(`brute:lock:user:${cleanId}`),
      this.redisService.del(`brute:attempt:ip:${ip}`),
      this.redisService.del(`brute:lock:ip:${ip}`),
    ]);

    this.memoryLocks.delete(cleanId);
    this.memoryLocks.delete(ip);
    this.memoryAttempts.delete(cleanId);
    this.memoryAttempts.delete(ip);
  }

  /**
   * Requirement 3: Enforce strict rate-limiting on Payment Verification to prevent race conditions
   * Max 5 verification attempts per orderId/trackId within 60 seconds
   */
  async checkPaymentVerifyAllowed(orderIdOrTrackId: string, ipAddress?: string): Promise<void> {
    const track = (orderIdOrTrackId || 'unknown').trim();
    const ip = ipAddress || 'unknown';
    const rateKey = `rate:payment_verify:${track}:${ip}`;

    const attempts = await this.redisService.incr(rateKey, 60);

    if (attempts > 5) {
      const ttl = await this.redisService.ttl(rateKey);
      this.logger.warn(`Payment verification rate limit exceeded for ${track} from ${ip}. Attempts: ${attempts}`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'تعداد تلاش‌های استعلام و تأیید تراکنش بیش از حد مجاز است. لطفاً یک دقیقه بعد مجدداً بررسی فرمایید.',
          remainingSeconds: Math.max(ttl, 1),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Strict 2FA Code Rate Limiting (Protects 6-digit TOTP / Recovery space)
   * Max 3-5 failed attempts per 5 minutes per user/IP
   */
  async check2FAAllowed(userId: string, ipAddress?: string): Promise<void> {
    const ip = ipAddress || 'unknown';
    const userLockKey = `brute:lock:2fa:user:${userId}`;
    const ipLockKey = `brute:lock:2fa:ip:${ip}`;

    const [userTtl, ipTtl] = await Promise.all([
      this.redisService.ttl(userLockKey),
      this.redisService.ttl(ipLockKey),
    ]);

    let maxTtl = Math.max(userTtl, ipTtl);

    // Memory fallback
    if (maxTtl <= 0) {
      const now = Date.now();
      const memUserLock = this.memoryLocks.get(`2fa:${userId}`);
      const memIpLock = this.memoryLocks.get(`2fa:ip:${ip}`);
      const memLock = Math.max(memUserLock || 0, memIpLock || 0);

      if (memLock > now) {
        maxTtl = Math.ceil((memLock - now) / 1000);
      }
    }

    if (maxTtl > 0) {
      const minutes = Math.ceil(maxTtl / 60);
      this.logger.warn(`Blocked 2FA verification attempt for user ${userId} from ${ip}. Locked for ${maxTtl}s.`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `تعداد تلاش‌های ناموفق کد امنیتی دوعاملی بیش از حد مجاز است. لطفاً ${minutes} دقیقه دیگر مجدداً تلاش فرمایید.`,
          remainingSeconds: maxTtl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record failed 2FA verification attempt with strict cooldown
   * 3 failed attempts in 5 minutes -> 5 minutes lock
   * 5 failed attempts in 5 minutes -> 15 minutes lock
   */
  async record2FAFailedAttempt(userId: string, ipAddress?: string): Promise<number> {
    const ip = ipAddress || 'unknown';
    const userAttemptKey = `brute:attempt:2fa:user:${userId}`;
    const ipAttemptKey = `brute:attempt:2fa:ip:${ip}`;

    // 5-minute tracking window (300 seconds)
    const [userAttempts, ipAttempts] = await Promise.all([
      this.redisService.incr(userAttemptKey, 300),
      this.redisService.incr(ipAttemptKey, 300),
    ]);

    const maxAttempts = Math.max(userAttempts, ipAttempts);

    if (maxAttempts >= 5) {
      // 15-minute lock
      const lockSeconds = 900;
      await Promise.all([
        this.redisService.set(`brute:lock:2fa:user:${userId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:2fa:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(`2fa:${userId}`, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(`2fa:ip:${ip}`, Date.now() + lockSeconds * 1000);
      this.logger.warn(`2FA locked for user ${userId} and IP ${ip} for 15 minutes after ${maxAttempts} failed attempts.`);
    } else if (maxAttempts >= 3) {
      // 5-minute lock
      const lockSeconds = 300;
      await Promise.all([
        this.redisService.set(`brute:lock:2fa:user:${userId}`, 'locked', lockSeconds),
        this.redisService.set(`brute:lock:2fa:ip:${ip}`, 'locked', lockSeconds),
      ]);
      this.memoryLocks.set(`2fa:${userId}`, Date.now() + lockSeconds * 1000);
      this.memoryLocks.set(`2fa:ip:${ip}`, Date.now() + lockSeconds * 1000);
      this.logger.warn(`2FA locked for user ${userId} and IP ${ip} for 5 minutes after ${maxAttempts} failed attempts.`);
    }

    return maxAttempts;
  }

  /**
   * Clear 2FA failed attempt counters on success
   */
  async record2FASuccess(userId: string, ipAddress?: string): Promise<void> {
    const ip = ipAddress || 'unknown';

    await Promise.all([
      this.redisService.del(`brute:attempt:2fa:user:${userId}`),
      this.redisService.del(`brute:lock:2fa:user:${userId}`),
      this.redisService.del(`brute:attempt:2fa:ip:${ip}`),
      this.redisService.del(`brute:lock:2fa:ip:${ip}`),
    ]);

    this.memoryLocks.delete(`2fa:${userId}`);
    this.memoryLocks.delete(`2fa:ip:${ip}`);
  }
}
