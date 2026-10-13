import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import {
  CreateSubscriptionPlanDto,
  AssignSubscriptionDto,
} from '../dto/subscription-plan.dto';

@Injectable()
export class SaasSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  // 1. Create Subscription Plan
  async createPlan(dto: CreateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`پلن با کد '${dto.code}' قبلاً تعریف شده است`);
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        monthlyPrice: dto.monthlyPrice,
        annualPrice: dto.annualPrice,
        maxStudents: dto.maxStudents,
        maxTeachers: dto.maxTeachers,
        maxStorageMb: dto.maxStorageMb,
        bundledFeatureFlags: dto.bundledFeatureFlags || [],
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
        isActive: true,
      },
    });
  }

  // 2. List Subscription Plans
  async listPlans(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.subscriptionPlan.findMany({
      where,
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  // 3. Get Plan Details
  async getPlan(idOrCode: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
    });
    if (!plan) {
      throw new NotFoundException('پلن اشتراک مورد نظر یافت نشد');
    }
    return plan;
  }

  // 4. Assign / Upgrade Subscription to Tenant
  async assignSubscription(dto: AssignSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('مدرسه مورد نظر یافت نشد');
    }

    const plan = await this.getPlan(dto.planIdOrCode);

    const durationMonths = dto.durationMonths || 12;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const paidAmount =
      dto.paidAmount !== undefined
        ? dto.paidAmount
        : dto.billingCycle === 'MONTHLY'
        ? plan.monthlyPrice * durationMonths
        : plan.annualPrice;

    return this.prisma.$transaction(async (tx) => {
      // Mark previous subscriptions as EXPIRED / CANCELLED
      await tx.tenantSubscription.updateMany({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      // Create new active subscription
      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          billingCycle: dto.billingCycle || 'ANNUAL',
          status: 'ACTIVE',
          startDate,
          endDate,
          paidAmount,
          customDiscount: dto.customDiscount || 0,
          notes: dto.notes,
        },
        include: { plan: true },
      });

      // Automatically enable bundled feature flags for this tenant
      if (plan.bundledFeatureFlags && plan.bundledFeatureFlags.length > 0) {
        for (const flagKey of plan.bundledFeatureFlags) {
          const flag = await tx.featureFlag.findUnique({
            where: { key: flagKey },
          });
          if (flag) {
            await tx.tenantFeatureFlag.upsert({
              where: {
                tenantId_featureFlagId: {
                  tenantId: tenant.id,
                  featureFlagId: flag.id,
                },
              },
              update: { isEnabled: true },
              create: {
                tenantId: tenant.id,
                featureFlagId: flag.id,
                isEnabled: true,
              },
            });
          }
        }
      }

      return subscription;
    });
  }

  // 5. Check Quota Usage for Tenant
  async checkQuota(tenantId: string, quotaType: 'STUDENTS' | 'TEACHERS' | 'STORAGE_MB') {
    const activeSub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    // Default fallbacks if no active subscription
    const maxStudents = activeSub?.plan?.maxStudents || 100;
    const maxTeachers = activeSub?.plan?.maxTeachers || 20;
    const maxStorageMb = activeSub?.plan?.maxStorageMb || 5120;

    if (quotaType === 'STUDENTS') {
      const currentStudents = await this.prisma.studentProfile.count({
        where: { tenantId },
      });
      return {
        quotaType,
        currentUsage: currentStudents,
        maxAllowed: maxStudents,
        isExceeded: currentStudents >= maxStudents,
        remaining: Math.max(0, maxStudents - currentStudents),
      };
    }

    if (quotaType === 'TEACHERS') {
      const currentTeachers = await this.prisma.teacherProfile.count({
        where: { tenantId },
      });
      return {
        quotaType,
        currentUsage: currentTeachers,
        maxAllowed: maxTeachers,
        isExceeded: currentTeachers >= maxTeachers,
        remaining: Math.max(0, maxTeachers - currentTeachers),
      };
    }

    // STORAGE_MB
    const materials = await this.prisma.courseMaterial.aggregate({
      where: { tenantId },
      _sum: { fileSizeMb: true },
    });
    const currentStorageMb = Math.round((materials._sum?.fileSizeMb || 0) * 10) / 10;

    return {
      quotaType,
      currentUsage: currentStorageMb,
      maxAllowed: maxStorageMb,
      isExceeded: currentStorageMb >= maxStorageMb,
      remaining: Math.max(0, maxStorageMb - currentStorageMb),
    };
  }

  // 6. Get Current Tenant Subscription
  async getTenantSubscription(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const studentQuota = await this.checkQuota(tenantId, 'STUDENTS');
    const teacherQuota = await this.checkQuota(tenantId, 'TEACHERS');
    const storageQuota = await this.checkQuota(tenantId, 'STORAGE_MB');

    return {
      subscription: sub,
      quotas: {
        students: studentQuota,
        teachers: teacherQuota,
        storage: storageQuota,
      },
    };
  }
}
