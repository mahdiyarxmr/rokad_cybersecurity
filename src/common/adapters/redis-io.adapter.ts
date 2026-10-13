import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    appOrHttpServer: INestApplicationContext | any,
    private readonly configService: ConfigService,
  ) {
    super(appOrHttpServer);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('REDIS_PORT', '6379'), 10);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    let pubClient: Redis | null = null;
    let subClient: Redis | null = null;

    try {
      pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      pubClient.on('error', (err) => {
        this.logger.debug(`Redis pubClient error: ${err.message}`);
      });

      subClient = pubClient.duplicate();
      subClient.on('error', (err) => {
        this.logger.debug(`Redis subClient error: ${err.message}`);
      });

      await pubClient.connect();
      await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('⚡ RedisIoAdapter connected successfully for WebSocket multi-instance synchronization');
    } catch (err: any) {
      this.logger.warn(`RedisIoAdapter fallback (in-memory WebSocket): ${err.message}`);
      try { pubClient?.disconnect(false); } catch {}
      try { subClient?.disconnect(false); } catch {}
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
