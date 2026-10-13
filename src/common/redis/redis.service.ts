import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 200, 5000),
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        this.logger.debug(`Redis service error: ${err.message}`);
      });

      this.client.on('ready', () => {
        this.logger.log(`Redis reconnected on ${host}:${port}`);
      });

      await this.client.connect();
      this.logger.log(`Connected to Redis on ${host}:${port}`);
    } catch (err: any) {
      this.logger.warn(`Redis connection failed: ${err?.message}. Operating in fallback mode.`);
      try {
        this.client?.disconnect(false);
      } catch {}
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || this.client.status !== 'ready') return null;
      return await this.client.get(key);
    } catch (err) {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.client || this.client.status !== 'ready') return;
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      // Non-blocking catch
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.client || this.client.status !== 'ready') return;
      await this.client.del(key);
    } catch (err) {
      // Non-blocking catch
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.client || this.client.status !== 'ready') return 1;
      const count = await this.client.incr(key);
      if (count === 1 && ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (err) {
      return 1;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.client || this.client.status !== 'ready') return -1;
      return await this.client.ttl(key);
    } catch (err) {
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!this.client || this.client.status !== 'ready') return;
      await this.client.expire(key, seconds);
    } catch (err) {
      // Non-blocking catch
    }
  }
}
