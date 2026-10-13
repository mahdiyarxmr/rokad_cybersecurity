import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Check if a feature flag is enabled for a specific tenant
   */
  async isEnabled(flagKey: string, tenantId?: string): Promise<boolean> {
    const cacheKey = `ff:${tenantId || 'global'}:${flagKey}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached !== null && cached !== undefined) {
      return cached === 'true';
    }

    // 1. Look up the feature flag definition
    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
    });

    if (!featureFlag) {
      // If flag is not defined, default to false
      await this.redisService.set(cacheKey, 'false', 300);
      return false;
    }

    let isEnabled = featureFlag.defaultEnabled;

    // 2. Look up tenant override if tenantId is provided
    if (tenantId) {
      const override = await this.prisma.tenantFeatureFlag.findUnique({
        where: {
          tenantId_featureFlagId: {
            tenantId,
            featureFlagId: featureFlag.id,
          },
        },
      });

      if (override) {
        isEnabled = override.isEnabled;
      }
    }

    // Cache the result for 10 minutes
    await this.redisService.set(cacheKey, isEnabled ? 'true' : 'false', 600);
    return isEnabled;
  }

  /**
   * Get all feature flags and their resolved status for a tenant
   */
  async getTenantFlags(tenantId: string) {
    const allFlags = await this.prisma.featureFlag.findMany({
      orderBy: { category: 'asc' },
    });

    const overrides = await this.prisma.tenantFeatureFlag.findMany({
      where: { tenantId },
    });

    const overrideMap = new Map<string, { isEnabled: boolean; config: any }>();
    for (const ov of overrides) {
      overrideMap.set(ov.featureFlagId, {
        isEnabled: ov.isEnabled,
        config: ov.config,
      });
    }

    return allFlags.map((flag) => {
      const override = overrideMap.get(flag.id);
      return {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        defaultEnabled: flag.defaultEnabled,
        isEnabled: override !== undefined ? override.isEnabled : flag.defaultEnabled,
        hasOverride: override !== undefined,
        config: override?.config || null,
      };
    });
  }

  /**
   * Set or update a feature flag override for a tenant
   */
  async setTenantFlag(tenantId: string, flagKey: string, isEnabled: boolean, config?: any) {
    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
    });

    if (!featureFlag) {
      throw new NotFoundException(`قابلیت '${flagKey}' در سیستم تعریف نشده است`);
    }

    const result = await this.prisma.tenantFeatureFlag.upsert({
      where: {
        tenantId_featureFlagId: {
          tenantId,
          featureFlagId: featureFlag.id,
        },
      },
      update: {
        isEnabled,
        config: config !== undefined ? config : undefined,
      },
      create: {
        tenantId,
        featureFlagId: featureFlag.id,
        isEnabled,
        config: config !== undefined ? config : undefined,
      },
    });

    // Invalidate Redis cache
    const cacheKey = `ff:${tenantId}:${flagKey}`;
    await this.redisService.del(cacheKey);

    return result;
  }

  /**
   * Register a new global feature flag
   */
  async registerFlag(data: {
    key: string;
    name: string;
    description?: string;
    category?: string;
    defaultEnabled?: boolean;
  }) {
    return this.prisma.featureFlag.upsert({
      where: { key: data.key },
      update: {
        name: data.name,
        description: data.description,
        category: data.category || 'GENERAL',
        defaultEnabled: data.defaultEnabled || false,
      },
      create: {
        key: data.key,
        name: data.name,
        description: data.description,
        category: data.category || 'GENERAL',
        defaultEnabled: data.defaultEnabled || false,
      },
    });
  }
}
