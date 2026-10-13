import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private heartbeatTimer: NodeJS.Timeout | null = null;
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    const heartbeatUrl = this.configService.get<string>('BETTERSTACK_HEARTBEAT_URL');
    const explicitlyEnabled = this.configService.get<string>('ENABLE_HEARTBEAT') === 'true';
    if (!explicitlyEnabled || !heartbeatUrl) {
      this.logger.log('Heartbeat monitoring is disabled until BETTERSTACK_HEARTBEAT_URL and ENABLE_HEARTBEAT=true are set');
      return;
    }

    const intervalSec = Number(
      this.configService.get<string>('HEARTBEAT_INTERVAL_SECONDS', '60'),
    );
    const intervalMs = Math.max(10, intervalSec) * 1000;

    this.logger.log(
      `💓 Better Stack Heartbeat monitor active. Pinging every ${intervalSec}s.`,
    );

    // Initial ping 5 seconds after server bootstrap
    setTimeout(() => {
      this.pingHeartbeat('bootstrap');
    }, 5000);

    // Recurring interval
    this.heartbeatTimer = setInterval(() => {
      this.pingHeartbeat('interval');
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Pings Better Stack Heartbeat endpoint only if the platform is genuinely healthy.
   * If core dependencies (DB/Redis) are degraded, ping is intentionally skipped so
   * Better Stack triggers an emergency incident notification.
   */
  async pingHeartbeat(triggerSource = 'manual'): Promise<{ sent: boolean; reason?: string }> {
    const url = this.configService.get<string>('BETTERSTACK_HEARTBEAT_URL');

    if (!url || url === 'disabled' || url.includes('YOUR_TOKEN')) {
      return { sent: false, reason: 'URL not configured' };
    }

    // 1. Verify Database Health
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      this.logger.warn(
        `[Heartbeat] Skipping heartbeat ping: PostgreSQL is degraded (${err.message}). Better Stack will alert.`,
      );
      return { sent: false, reason: `Database degraded: ${err.message}` };
    }

    // 2. Verify Redis Health (if Redis is configured)
    try {
      const client = this.redisService.getClient();
      if (client && client.status === 'ready') {
        const pong = await client.ping();
        if (pong !== 'PONG') {
          this.logger.warn(
            `[Heartbeat] Skipping heartbeat ping: Redis response unexpected (${pong}).`,
          );
          return { sent: false, reason: `Redis unexpected response: ${pong}` };
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[Heartbeat] Skipping heartbeat ping: Redis error (${err.message}).`,
      );
      return { sent: false, reason: `Redis error: ${err.message}` };
    }

    // 3. Dispatch HTTP Ping to Better Stack
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Rokad-Platform-Heartbeat/1.1.0',
        },
        body: JSON.stringify({
          status: 'ok',
          source: triggerSource,
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        this.logger.debug?.(`[Heartbeat] Successfully pinged Better Stack (${triggerSource})`);
        return { sent: true };
      } else {
        this.logger.warn(
          `[Heartbeat] Better Stack responded with HTTP ${res.status}`,
        );
        return { sent: false, reason: `HTTP status ${res.status}` };
      }
    } catch (err: any) {
      this.logger.warn(
        `[Heartbeat] Failed to dispatch heartbeat ping: ${err.message}`,
      );
      return { sent: false, reason: err.message };
    }
  }
}
