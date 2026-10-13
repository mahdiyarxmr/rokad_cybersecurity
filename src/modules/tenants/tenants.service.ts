import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException('مرکز آموزشی مورد نظر یافت نشد');
    }
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (!tenant) {
      throw new NotFoundException('مرکز آموزشی مورد نظر یافت نشد');
    }
    return tenant;
  }

  async listAll(query?: { type?: string; status?: string }) {
    const where: any = {};
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    const existing = await this.findById(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        theme: dto.theme as any,
        subdomain: dto.subdomain,
        customDomain: dto.customDomain,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        settings: dto.settings,
      },
    });

    // Invalidate old and new cache keys instantly
    await this.invalidateTenantCache(existing);
    await this.invalidateTenantCache(tenant);

    return tenant;
  }

  async changeStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP') {
    await this.findById(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status },
    });

    // Immediate Cache Eviction
    await this.invalidateTenantCache(tenant);

    return {
      message: `وضعیت مدرسه به '${status}' تغییر یافت و کش سرور بلافاصله پاک‌سازی شد`,
      tenant,
    };
  }

  /**
   * Immediately evict all Redis cache entries associated with a tenant
   */
  async invalidateTenantCache(tenant: {
    id?: string;
    slug?: string;
    subdomain?: string | null;
    customDomain?: string | null;
  }) {
    const keysToDelete: string[] = [];

    if (tenant.id) keysToDelete.push(`tenant:id:${tenant.id}`);
    if (tenant.slug) keysToDelete.push(`tenant:slug:${tenant.slug}`);
    if (tenant.subdomain) keysToDelete.push(`tenant:subdomain:${tenant.subdomain}`);
    if (tenant.customDomain) keysToDelete.push(`tenant:domain:${tenant.customDomain}`);

    for (const key of keysToDelete) {
      await this.redisService.del(key);
    }
  }

  /**
   * Get home banner configuration strictly isolated per tenant
   */
  async getBanners(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as any) || {};
    return {
      slides: settings.homeBanners?.slides || null,
      bannerTypes: settings.homeBanners?.bannerTypes || null,
    };
  }

  /**
   * Update home banner configuration for the current tenant in PostgreSQL
   */
  async updateBanners(
    tenantId: string,
    data: { slides?: any[]; bannerTypes?: any[] },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const currentSettings = (tenant?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      homeBanners: {
        ...(currentSettings.homeBanners || {}),
        ...(data.slides !== undefined ? { slides: data.slides } : {}),
        ...(data.bannerTypes !== undefined ? { bannerTypes: data.bannerTypes } : {}),
      },
    };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
      select: { id: true, settings: true },
    });

    await this.invalidateTenantCache({ id: tenantId } as any);
    return {
      slides: (updated.settings as any)?.homeBanners?.slides || [],
      bannerTypes: (updated.settings as any)?.homeBanners?.bannerTypes || [],
    };
  }
}

