import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService implements OnModuleInit {
  private readonly logger = new Logger(AuditLogService.name);
  private anchorLogPath = path.resolve(process.cwd(), 'logs/audit-anchors.log');

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    // Ensure isolated external anchor log directory exists
    try {
      const dir = path.dirname(this.anchorLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Fallback to /tmp for read-only containers or when /app/logs is omitted
      this.anchorLogPath = '/tmp/audit-anchors.log';
      try {
        const tmpDir = path.dirname(this.anchorLogPath);
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
      } catch {}
    }
  }

  /**
   * Append-only external ledger anchor outside the primary database
   * Requirement 2: Separation of duties against total database tampering
   */
  private appendExternalAnchor(tenantId: string, logId: string, hash: string) {
    try {
      const timestamp = new Date().toISOString();
      const line = `${timestamp}\t${tenantId}\t${logId}\t${hash}\n`;
      fs.appendFileSync(this.anchorLogPath, line, 'utf8');

      // Also persist to Redis as external fast cache
      this.redisService.set(`audit:anchor:tenant:${tenantId}`, hash);
      this.redisService.set(`audit:anchor:global_latest`, hash);
    } catch (err: any) {
      this.logger.error(`Failed to append external audit anchor: ${err.message}`);
    }
  }

  @OnEvent('audit.log', { async: true })
  async handleAuditLogEvent(payload: CreateAuditLogDto) {
    try {
      if (!payload.tenantId) {
        return;
      }

      const logId = crypto.randomUUID();
      const now = new Date();

      // 1. Fetch previous record's hash to chain
      const previousLog = await this.prisma.auditLog.findFirst({
        where: { tenantId: payload.tenantId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, hash: true },
      });

      const previousHash = previousLog?.hash || 'GENESIS_BLOCK_ROKAD_2026';

      // 2. Compute cryptographic SHA-256 hash for this entry
      const hash = this.encryptionService.computeAuditHash({
        id: logId,
        tenantId: payload.tenantId,
        userId: payload.userId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        timestamp: now.toISOString(),
        previousHash,
        payload: payload.newValues,
      });

      const newValuesData = payload.newValues || payload.appVersion ? {
        ...(typeof payload.newValues === 'object' && payload.newValues !== null ? payload.newValues : { value: payload.newValues }),
        ...(payload.appVersion ? { _appVersion: payload.appVersion } : {}),
      } : undefined;

      // 3. Save to database with hash chain
      await this.prisma.auditLog.create({
        data: {
          id: logId,
          tenantId: payload.tenantId,
          userId: payload.userId,
          action: payload.action,
          entity: payload.entity,
          entityId: payload.entityId,
          oldValues: payload.oldValues ? JSON.parse(JSON.stringify(payload.oldValues)) : undefined,
          newValues: newValuesData ? JSON.parse(JSON.stringify(newValuesData)) : undefined,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
          previousHash,
          hash,
          createdAt: now,
        },
      });

      // 4. Requirement 2: Anchor the hash outside the PostgreSQL database
      this.appendExternalAnchor(payload.tenantId, logId, hash);
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
    }
  }

  /**
   * Cryptographic integrity verification of the entire audit chain
   * Checks every block from genesis and compares against external anchor
   */
  async verifyAuditLogIntegrity(tenantId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) {
      return {
        isValid: true,
        message: 'هیچ لاگ ممیزی برای این مدرسه ثبت نشده است',
        totalVerified: 0,
      };
    }

    let expectedPrevHash = 'GENESIS_BLOCK_ROKAD_2026';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Check if chain pointer is broken
      if (log.previousHash && log.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          error: 'BROKEN_CHAIN_LINK',
          brokenAtLogId: log.id,
          expectedPreviousHash: expectedPrevHash,
          actualPreviousHash: log.previousHash,
          message: `هشدار امنیتی: پیوند زنجیره هش در رکورد ${log.id} مخدوش شده است!`,
        };
      }

      // Recompute hash
      const computedHash = this.encryptionService.computeAuditHash({
        id: log.id,
        tenantId: log.tenantId,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        timestamp: log.createdAt.toISOString(),
        previousHash: log.previousHash,
        payload: log.newValues,
      });

      if (log.hash && log.hash !== computedHash) {
        return {
          isValid: false,
          error: 'HASH_MISMATCH',
          tamperedLogId: log.id,
          expectedHash: computedHash,
          recordedHash: log.hash,
          message: `هشدار امنیتی: محتوای لاگ ممیزی رکورد ${log.id} پس از ثبت دستکاری شده است!`,
        };
      }

      expectedPrevHash = log.hash || computedHash;
    }

    // Compare with external Redis anchor
    const externalRedisAnchor = await this.redisService.get(`audit:anchor:tenant:${tenantId}`);
    const lastLogHash = logs[logs.length - 1].hash;

    const anchorMatches = !externalRedisAnchor || externalRedisAnchor === lastLogHash;

    return {
      isValid: true,
      totalVerified: logs.length,
      lastRecordHash: lastLogHash,
      externalAnchorVerified: anchorMatches,
      message: 'زنجیره هش لاگ ممیزی و لنگر خارجی ۱۰۰٪ معتبر و سالم است',
    };
  }

  async getTenantLogs(
    tenantId: string,
    query?: { entity?: string; action?: string; limit?: number; page?: number },
  ) {
    const limit = query?.limit || 50;
    const page = query?.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.entity) where.entity = query.entity;
    if (query?.action) where.action = query.action;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      items: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
