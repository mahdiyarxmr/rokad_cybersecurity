import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import {
  ProvisionTenantDto,
  ImpersonateTenantDto,
} from '../dto/provision-tenant.dto';

@Injectable()
export class SaasTenantLifecycleService {
  private readonly logger = new Logger(SaasTenantLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  // 1. Provision Complete Tenant with Onboarding
  async provisionTenant(dto: ProvisionTenantDto) {
    // Validate Slug Uniqueness
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`شناسه مدرسه (slug) '${dto.slug}' تکراری است`);
    }

    if (dto.subdomain) {
      const existingSub = await this.prisma.tenant.findUnique({
        where: { subdomain: dto.subdomain },
      });
      if (existingSub) {
        throw new ConflictException(`زیردامنه '${dto.subdomain}' قبلاً ثبت شده است`);
      }
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          type: dto.type || 'SCHOOL',
          theme: dto.theme || 'ECOSYSTEM',
          subdomain: dto.subdomain,
          customDomain: dto.customDomain,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          parentTenantId: dto.parentTenantId,
          status: 'ACTIVE',
        },
      });

      // 2. Create School Admin User
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          phone: dto.adminPhone,
          passwordHash,
          role: 'SCHOOL_ADMIN',
          status: 'ACTIVE',
        },
      });

      // 3. Create Default Current Academic Year & Terms
      const academicYear = await tx.academicYear.create({
        data: {
          tenantId: tenant.id,
          name: 'سال تحصیلی ۱۴۰۴-۱۴۰۵',
          startDate: new Date('2026-09-23T00:00:00.000Z'),
          endDate: new Date('2027-06-21T00:00:00.000Z'),
          isCurrent: true,
          terms: {
            create: [
              {
                tenantId: tenant.id,
                name: 'نیم‌سال اول',
                startDate: new Date('2026-09-23T00:00:00.000Z'),
                endDate: new Date('2027-01-20T00:00:00.000Z'),
              },
              {
                tenantId: tenant.id,
                name: 'نیم‌سال دوم',
                startDate: new Date('2027-01-21T00:00:00.000Z'),
                endDate: new Date('2027-06-21T00:00:00.000Z'),
              },
            ],
          },
        },
      });

      // 4. Seed Standard School Roles
      const adminRole = await tx.schoolRole.create({
        data: {
          tenantId: tenant.id,
          name: 'مدیر مدرسه',
          description: 'دسترسی کامل مدیریتی به تمامی بخش‌های مدرسه',
          isSystem: true,
        },
      });

      await tx.userSchoolRole.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          schoolRoleId: adminRole.id,
        },
      });

      // Attach all existing system permissions to the Admin Role
      const allPermissions = await tx.permission.findMany();
      for (const perm of allPermissions) {
        await tx.rolePermission.create({
          data: {
            schoolRoleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }

      // 5. Attach Default / Selected Subscription Plan
      let plan: any = null;
      if (dto.planCode) {
        plan = await tx.subscriptionPlan.findUnique({
          where: { code: dto.planCode },
        });
      }
      if (!plan) {
        plan = await tx.subscriptionPlan.findFirst({
          where: { isActive: true },
          orderBy: { monthlyPrice: 'asc' },
        });
      }

      if (plan) {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            billingCycle: 'ANNUAL',
            status: 'ACTIVE',
            startDate: new Date(),
            endDate,
            paidAmount: plan.annualPrice,
          },
        });
      }

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: 'TENANT_PROVISIONED',
          entity: 'Tenant',
          entityId: tenant.id,
          newValues: {
            name: tenant.name,
            slug: tenant.slug,
            planCode: plan?.code,
          },
        },
      });

      return {
        tenant,
        adminUser: {
          id: adminUser.id,
          name: `${adminUser.firstName} ${adminUser.lastName}`,
          phone: adminUser.phone,
          role: adminUser.role,
        },
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
        },
        subscriptionPlan: plan ? { code: plan.code, name: plan.name } : null,
      };
    });
  }

  // 2. Impersonate Tenant (Super Admin Scoped Token)
  async impersonateTenant(
    superAdminUserId: string,
    dto: ImpersonateTenantDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      include: { users: { where: { role: 'SCHOOL_ADMIN' }, take: 1 } },
    });

    if (!tenant) {
      throw new NotFoundException('مدرسه مورد نظر یافت نشد');
    }

    const targetUser = tenant.users[0];
    if (!targetUser) {
      throw new NotFoundException('هیچ کاربر مدیر مدرسه‌ای در این تننت یافت نشد');
    }

    // Generate Scoped Impersonation Token
    const payload = {
      sub: targetUser.id,
      tenantId: tenant.id,
      role: targetUser.role,
      isImpersonated: true,
      impersonatedBy: superAdminUserId,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, tokenUse: 'access' },
      { expiresIn: '15m' },
    );

    // Log Impersonation for Strict Compliance
    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: superAdminUserId,
        action: 'SUPER_ADMIN_IMPERSONATION',
        entity: 'Tenant',
        entityId: tenant.id,
        newValues: {
          reason: dto.reason || 'پشتیبانی فنی و بررسی وضعیت مدرسه',
          targetUserId: targetUser.id,
        },
      },
    });

    return {
      accessToken,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      impersonatedUser: {
        id: targetUser.id,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        role: targetUser.role,
      },
    };
  }

  // 3. List All Tenants with Relations & Subscriptions
  async listTenants(filters?: {
    type?: any;
    status?: any;
    parentTenantId?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.parentTenantId) where.parentTenantId = filters.parentTenantId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.tenant.findMany({
      where,
      include: {
        parentTenant: { select: { id: true, name: true, slug: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: { select: { code: true, name: true, maxStudents: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            studentProfiles: true,
            teacherProfiles: true,
            subTenants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. Update Status with Instant Cache Purge
  async updateStatus(tenantId: string, status: any) {
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('مرکز آموزشی مورد نظر یافت نشد');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });

    const redis = this.redisService.getClient();
    if (redis) {
      await redis.del(`tenant:id:${tenant.id}`);
      await redis.del(`tenant:slug:${tenant.slug}`);
      if (tenant.subdomain) await redis.del(`tenant:subdomain:${tenant.subdomain}`);
      if (tenant.customDomain) await redis.del(`tenant:customdomain:${tenant.customDomain}`);
    }

    return tenant;
  }
}
