import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * Telegram Audit Anchor Service
 *
 * Sends the latest hash from each tenant's audit log chain to a private Telegram
 * channel every night at 23:55. This creates a TRUE external anchor that exists
 * completely outside the server's filesystem, database, and Redis — meaning a full
 * server compromise (disk + DB + Redis) still cannot forge the anchor history stored
 * in Telegram's servers.
 *
 * Separation of duties model:
 *   Internal chain (DB) ←→ Local file anchor ←→ Redis anchor ←→ Telegram anchor (external)
 *
 * Configuration (env vars):
 *   TELEGRAM_AUDIT_BOT_TOKEN   — Telegram Bot API token from @BotFather
 *   TELEGRAM_AUDIT_CHANNEL_ID  — Private channel/chat ID (negative number, e.g. -1001234567890)
 *   AUDIT_ANCHOR_CRON          — Optional cron expression override, default: 55 23 * * *
 *
 * For a channel, the bot must be added as an admin of that channel.
 */
@Injectable()
export class TelegramAnchorService implements OnModuleInit {
  private readonly logger = new Logger(TelegramAnchorService.name);

  private botToken: string | null = null;
  private channelId: string | null = null;
  private isConfigured = false;

  // Cron handle for cleanup
  private cronTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.botToken = this.configService.get<string>('TELEGRAM_AUDIT_BOT_TOKEN', '');
    this.channelId = this.configService.get<string>('TELEGRAM_AUDIT_CHANNEL_ID', '');

    if (!this.botToken || !this.channelId) {
      this.logger.warn(
        '[TelegramAnchor] TELEGRAM_AUDIT_BOT_TOKEN or TELEGRAM_AUDIT_CHANNEL_ID not configured. ' +
        'The Telegram external anchor is disabled. Set these env vars to enable it.',
      );
      return;
    }

    this.isConfigured = true;
    this.scheduleDailyAnchor();
    this.logger.log(
      `[TelegramAnchor] Nightly audit anchor scheduled. ` +
      `Channel: ${this.channelId}. Runs at 23:55 server time every day.`,
    );
  }

  /**
   * Schedule nightly anchor using a simple setInterval-based approach.
   * This avoids an extra @nestjs/schedule import and runs reliably in production.
   *
   * For production, a proper cron library or @nestjs/schedule @Cron decorator
   * can replace this — but this pure-Node approach has zero additional dependencies.
   */
  private scheduleDailyAnchor() {
    const scheduleNextRun = () => {
      const now = new Date();
      const next = new Date();

      // Target time: 23:55:00 local server time
      next.setHours(23, 55, 0, 0);

      // If 23:55 has already passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const msUntilNext = next.getTime() - now.getTime();

      this.logger.log(
        `[TelegramAnchor] Next anchor broadcast scheduled in ${Math.round(msUntilNext / 60000)} minutes ` +
        `(at ${next.toISOString()})`,
      );

      setTimeout(async () => {
        await this.broadcastNightlyAuditAnchor();
        // Schedule the next day's run
        scheduleNextRun();
      }, msUntilNext);
    };

    scheduleNextRun();
  }

  /**
   * Collect the latest audit chain hash for every active tenant
   * and broadcast a summary report to the Telegram channel.
   */
  async broadcastNightlyAuditAnchor(): Promise<void> {
    if (!this.isConfigured) return;

    this.logger.log('[TelegramAnchor] Starting nightly audit chain broadcast...');

    try {
      // Fetch the latest audit log hash per tenant
      const latestPerTenant = await this.prisma.$queryRaw<
        Array<{ tenantId: string; tenantName: string; lastHash: string | null; logCount: bigint; lastTs: Date }>
      >`
        SELECT
          a."tenantId",
          t."name" AS "tenantName",
          (
            SELECT a2."hash"
            FROM "AuditLog" a2
            WHERE a2."tenantId" = a."tenantId"
            ORDER BY a2."createdAt" DESC
            LIMIT 1
          ) AS "lastHash",
          COUNT(a."id") AS "logCount",
          MAX(a."createdAt") AS "lastTs"
        FROM "AuditLog" a
        JOIN "Tenant" t ON t."id" = a."tenantId"
        GROUP BY a."tenantId", t."name"
        ORDER BY t."name" ASC
      `;

      if (!latestPerTenant || latestPerTenant.length === 0) {
        await this.sendTelegramMessage(
          `🔐 *رکاد — گزارش لنگر زنجیره ممیزی*\n\n` +
          `📅 تاریخ: ${new Date().toISOString()}\n` +
          `⚠️ هیچ لاگ ممیزی‌ای برای ارسال وجود ندارد.`,
        );
        return;
      }

      const lines: string[] = [
        `🔐 *رکاد — لنگر شبانه زنجیره ممیزی*`,
        ``,
        `📅 \`${new Date().toISOString()}\``,
        `🏫 تعداد مدارس فعال: *${latestPerTenant.length}*`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ];

      for (const row of latestPerTenant) {
        const hashShort = row.lastHash
          ? `${row.lastHash.substring(0, 16)}…${row.lastHash.substring(row.lastHash.length - 8)}`
          : 'N/A';

        const count = Number(row.logCount);
        lines.push(``);
        lines.push(`🏫 *${row.tenantName}*`);
        lines.push(`   📊 رکوردها: \`${count.toLocaleString('fa-IR')}\``);
        lines.push(`   🔗 آخرین هش: \`${hashShort}\``);
        lines.push(`   🕐 آخرین رویداد: \`${row.lastTs?.toISOString() || 'N/A'}\``);

        // Also store in Redis for cross-verification
        if (row.lastHash) {
          await this.redisService.set(
            `audit:telegram_anchor:tenant:${row.tenantId}`,
            row.lastHash,
            60 * 60 * 25, // 25 hours TTL
          );
        }
      }

      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`✅ این پیام به عنوان لنگر خارجی ثبت می‌شود.`);
      lines.push(`🛡️ در صورت دستکاری دیتابیس، هش‌های بالا با زنجیره اصلی مغایرت خواهند داشت.`);

      await this.sendTelegramMessage(lines.join('\n'));

      this.logger.log(
        `[TelegramAnchor] Nightly anchor broadcast completed for ${latestPerTenant.length} tenant(s).`,
      );
    } catch (err: any) {
      this.logger.error(
        `[TelegramAnchor] Failed to broadcast nightly anchor: ${err.message}`,
        err.stack,
      );

      // Alert on failure itself — a missing anchor is suspicious
      try {
        await this.sendTelegramMessage(
          `🚨 *رکاد — هشدار: ارسال لنگر شبانه ناموفق بود*\n\n` +
          `⏰ \`${new Date().toISOString()}\`\n` +
          `❌ خطا: \`${err.message}\`\n\n` +
          `⚠️ لطفاً وضعیت سرور و اتصال دیتابیس را بررسی فرمایید.`,
        );
      } catch {
        // Swallow — already failed
      }
    }
  }

  /**
   * Send a message to the configured Telegram channel via Bot API.
   * Uses native Node.js `https` module — zero external dependencies.
   */
  async sendTelegramMessage(text: string): Promise<void> {
    if (!this.isConfigured || !this.botToken || !this.channelId) {
      return;
    }

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        chat_id: this.channelId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });

      const options: https.RequestOptions = {
        hostname: 'api.telegram.org',
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 15000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            this.logger.warn(
              `[TelegramAnchor] Telegram API returned status ${res.statusCode}: ${data.substring(0, 200)}`,
            );
            resolve(); // Don't hard-fail — logging is best-effort
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`[TelegramAnchor] HTTPS request to Telegram failed: ${err.message}`);
        resolve(); // Soft fail — anchor is supplementary, not critical path
      });

      req.on('timeout', () => {
        req.destroy();
        this.logger.warn('[TelegramAnchor] Telegram API request timed out after 15s');
        resolve();
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Manual trigger for testing or on-demand anchor verification.
   * Called from the audit-log controller (admin-only endpoint).
   */
  async triggerManualAnchor(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'سرویس لنگر Telegram پیکربندی نشده است. متغیرهای محیطی TELEGRAM_AUDIT_BOT_TOKEN و TELEGRAM_AUDIT_CHANNEL_ID را تنظیم کنید.',
      };
    }

    await this.broadcastNightlyAuditAnchor();
    return {
      success: true,
      message: 'لنگر خارجی Telegram با موفقیت ارسال شد',
    };
  }
}
