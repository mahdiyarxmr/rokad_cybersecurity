import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import {
  SetMaintenanceModeDto,
  UpdatePlatformSettingDto,
  UpdateTenantBrandingDto,
} from '../dto/platform-settings.dto';

@Injectable()
export class SaasPlatformOpsService {
  private readonly logger = new Logger(SaasPlatformOpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // 1. Global Platform SaaS Metrics & Analytics
  async getPlatformMetrics() {
    // 1. Tenants count by status
    const totalTenants = await this.prisma.tenant.count();
    const activeTenants = await this.prisma.tenant.count({ where: { status: 'ACTIVE' } });
    const suspendedTenants = await this.prisma.tenant.count({ where: { status: 'SUSPENDED' } });

    // 2. Users count by role
    const totalUsers = await this.prisma.user.count();
    const totalStudents = await this.prisma.studentProfile.count();
    const totalTeachers = await this.prisma.teacherProfile.count();
    const totalParents = await this.prisma.parentProfile.count();

    // 3. Subscriptions & Estimated MRR
    const activeSubs = await this.prisma.tenantSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    let estimatedMrr = 0;
    for (const sub of activeSubs) {
      if (sub.plan) {
        estimatedMrr +=
          sub.billingCycle === 'MONTHLY'
            ? sub.plan.monthlyPrice
            : Math.round(sub.plan.annualPrice / 12);
      }
    }

    // 4. Content & Storage Metrics
    const materials = await this.prisma.courseMaterial.aggregate({
      _sum: { fileSizeMb: true },
      _count: true,
    });
    const totalStorageMb = Math.round((materials._sum?.fileSizeMb || 0) * 10) / 10;

    // 5. Total Exams & Payments
    const totalExams = await this.prisma.exam.count();
    const totalReceipts = await this.prisma.feeReceipt.count();

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      users: {
        total: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
      },
      commercial: {
        activeSubscriptions: activeSubs.length,
        estimatedMrrTomans: estimatedMrr,
      },
      storage: {
        totalFiles: materials._count || 0,
        totalStorageMb,
      },
      activity: {
        totalExams,
        totalReceipts,
      },
    };
  }

  // 2. Set Platform Maintenance Mode
  async setMaintenanceMode(
    dto: SetMaintenanceModeDto,
    updatedById: string,
  ) {
    const settingValue = {
      enabled: dto.enabled,
      message: dto.message || 'سامانه رکاد در حال به‌روزرسانی زیرساخت است.',
      estimatedEndTime: dto.estimatedEndTime,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.platformSetting.upsert({
      where: { key: 'PLATFORM_MAINTENANCE_MODE' },
      update: {
        value: settingValue,
        updatedById,
      },
      create: {
        key: 'PLATFORM_MAINTENANCE_MODE',
        value: settingValue,
        description: 'حالت تعمیرات سراسری پلتفرم رکاد',
        updatedById,
      },
    });

    // Update Redis cache for high-speed middleware checks
    const redis = this.redisService.getClient();
    if (redis) {
      await redis.set(
        'platform:maintenance',
        dto.enabled ? JSON.stringify(settingValue) : 'false',
      );
    }

    return {
      maintenanceMode: dto.enabled,
      details: settingValue,
    };
  }

  // 3. Get Current Maintenance Mode
  async getMaintenanceMode() {
    const redis = this.redisService.getClient();
    if (redis) {
      const cached = await redis.get('platform:maintenance');
      if (cached && cached !== 'false') {
        return JSON.parse(cached);
      }
    }

    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'PLATFORM_MAINTENANCE_MODE' },
    });

    return (setting?.value as any) || { enabled: false };
  }

  // 4. Update Tenant Specialized Branding (Multi-Campus & Themes)
  async updateTenantBranding(
    tenantId: string,
    dto: UpdateTenantBrandingDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('مرکز آموزشی مورد نظر یافت نشد');
    }

    const currentSettings = (tenant?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      branding: {
        ...(currentSettings.branding || {}),
        primaryColor: dto.primaryColor || currentSettings.branding?.primaryColor,
        secondaryColor: dto.secondaryColor || currentSettings.branding?.secondaryColor,
        faviconUrl: dto.faviconUrl || currentSettings.branding?.faviconUrl,
        backgroundImageUrl: dto.backgroundImageUrl || currentSettings.branding?.backgroundImageUrl,
        mottoText: dto.mottoText || currentSettings.branding?.mottoText,
        customConfig: dto.customConfig || currentSettings.branding?.customConfig,
      },
    };

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    // Purge cache
    const redis = this.redisService.getClient();
    if (redis) {
      await redis.del(`tenant:id:${tenantId}`);
      await redis.del(`tenant:slug:${tenant?.slug}`);
    }

    return updatedTenant;
  }

  // 5. Query Global Cross-Tenant Audit Logs
  async queryGlobalAuditLogs(params: {
    tenantId?: string;
    action?: string;
    userId?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.action) where.action = params.action;
    if (params.userId) where.userId = params.userId;

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, role: true, phone: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
  }

  // 6. Purge Redis Cache by Pattern
  async purgeSystemCache(pattern = '*') {
    const redis = this.redisService.getClient();
    if (!redis) {
      return { message: 'ردیس در دسترس نیست' };
    }

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return {
      message: `تعداد ${keys.length} کلید از حافظه کش پاک‌سازی شد`,
      purgedKeysCount: keys.length,
    };
  }
}
