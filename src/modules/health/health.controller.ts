import { Controller, Get, Headers, Res, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

import { HeartbeatService } from './heartbeat.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly heartbeatService: HeartbeatService,
  ) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'بررسی زنده بودن پروسس سرور (Liveness Probe - فوق‌العاده سریع و بدون بار دیتابیس)' })
  checkLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.1.0',
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'بررسی آمادگی کامل سرویس و اتصال به تمام وابستگی‌ها (Readiness Probe)' })
  async checkReady(@Res({ passthrough: true }) res: Response) {
    return this.check(res);
  }

  @Public()
  @Get('heartbeat/ping')
  @ApiOperation({ summary: 'ارسال دستی هارت‌بیت؛ فقط با توکن داخلی' })
  async triggerHeartbeat(@Headers('x-health-token') token?: string) {
    const expected = this.configService.get<string>('HEALTH_INTERNAL_TOKEN');
    if (!expected || token !== expected) {
      throw new UnauthorizedException('دسترسی به این مسیر مجاز نیست');
    }
    return await this.heartbeatService.pingHeartbeat('manual-endpoint');
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'بررسی عمیق و زنده سلامت سرور، دیتابیس، ردیس و استوریج همراه با تاخیر میلی‌ثانیه‌ای' })
  async check(@Res({ passthrough: true }) res: Response) {
    let dbStatus = 'ok';
    let dbLatencyMs: number | null = null;
    let redisStatus = 'ok';
    let redisLatencyMs: number | null = null;
    let storageStatus = 'ok';

    // 1. Check PostgreSQL Database with Latency Benchmark
    const dbStart = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round(performance.now() - dbStart);
    } catch (err: any) {
      dbStatus = process.env.NODE_ENV === 'production' ? 'error' : `error: ${err.message}`;
    }

    // 2. Check Redis Service with Latency Benchmark
    const redisStart = performance.now();
    try {
      const redisClient = this.redisService.getClient();
      if (!redisClient || redisClient.status !== 'ready') {
        redisStatus = 'disconnected';
      } else {
        const pong = await redisClient.ping();
        if (pong !== 'PONG') {
          redisStatus = `unexpected response: ${pong}`;
        } else {
          redisLatencyMs = Math.round(performance.now() - redisStart);
        }
      }
    } catch (err: any) {
      redisStatus = process.env.NODE_ENV === 'production' ? 'error' : `error: ${err.message}`;
    }

    // 3. Check Storage (Disk or MinIO)
    const storageDriver = this.configService.get<string>('STORAGE_DRIVER', 'disk').toLowerCase();
    if (storageDriver === 'minio') {
      try {
        const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const minioPort = this.configService.get<number>('MINIO_PORT', 9000);
        const minioUrl = `http://${minioEndpoint}:${minioPort}/minio/health/live`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const storageRes = await fetch(minioUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!storageRes.ok) {
          storageStatus = `minio_http_${storageRes.status}`;
        }
      } catch (err: any) {
        storageStatus = `minio_error: ${err.message}`;
      }
    } else {
      // Local disk check
      try {
        const configuredUploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
        const uploadDir = path.isAbsolute(configuredUploadDir)
          ? configuredUploadDir
          : path.resolve(process.cwd(), configuredUploadDir);

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        storageStatus = 'disk_ok';
      } catch (err: any) {
        storageStatus = process.env.NODE_ENV === 'production' ? 'disk_error' : `disk_error: ${err.message}`;
      }
    }

    const isHealthy =
      dbStatus === 'ok' &&
      redisStatus === 'ok' &&
      (storageStatus === 'ok' || storageStatus === 'disk_ok');

    // Return HTTP 503 if any core service is down so external Uptime monitors trigger alerts
    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.1.0',
      latencies: {
        databaseMs: dbLatencyMs,
        redisMs: redisLatencyMs,
      },
      services: {
        database: dbStatus,
        redis: redisStatus,
        storage: storageStatus,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}
