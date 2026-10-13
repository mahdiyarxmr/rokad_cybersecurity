import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  CreateSchoolRoleDto,
  UpdateSchoolRoleDto,
  AssignRoleDto,
  SyncUserRolesDto,
  SetUserOverrideDto,
} from './dto/create-role.dto';
import {
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  PermissionCatalogItem,
} from './rbac-catalog';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * دریافت کاتالوگ جامع پرمیشن‌ها به همراه متادیتای فارسی و دسته‌بندی
   */
  async listPermissions() {
    // Ensure all catalog permissions exist in DB
    await this.ensureCatalogPermissionsInDb();

    return {
      categories: PERMISSION_CATEGORIES,
      permissions: PERMISSION_CATALOG,
      totalCount: PERMISSION_CATALOG.length,
    };
  }

  /**
   * همگام‌سازی اطمینان‌بخش پرمیشن‌های کاتالوگ در جدول Permission دیتابیس
   */
  private async ensureCatalogPermissionsInDb() {
    try {
      const existingCodes = new Set(
        (await this.prisma.permission.findMany({ select: { code: true } })).map((p) => p.code),
      );

      const missing = PERMISSION_CATALOG.filter((item) => !existingCodes.has(item.code));
      if (missing.length > 0) {
        for (const item of missing) {
          await this.prisma.permission.create({
            data: {
              code: item.code,
              name: item.labelFa,
              module: item.category,
              description: item.descriptionFa,
            },
          });
        }
      }
    } catch (e: any) {
      this.logger.warn(`Permission sync notice: ${e?.message}`);
    }
  }

  /**
   * دریافت فهرست تمام نقش‌های سازمانی مدرسه به همراه تعداد اعضا و پرمیشن‌ها
   */
  async listRoles(tenantId: string) {
    const roles = await this.prisma.schoolRole.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    });

    // Map permissions with Persian metadata
    const catalogMap = new Map<string, PermissionCatalogItem>(
      PERMISSION_CATALOG.map((p) => [p.code, p]),
    );

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      assignedUsersCount: role._count.userRoles,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => {
        const meta = catalogMap.get(rp.permission.code);
        return {
          code: rp.permission.code,
          labelFa: meta?.labelFa || rp.permission.name,
          category: meta?.category || rp.permission.module,
          categoryFa: meta?.categoryFa || 'عمومی',
          isSensitive: meta?.isSensitive || false,
          icon: meta?.icon || 'Shield',
        };
      }),
    }));
  }

  /**
   * ایجاد نقش سازمانی جدید در مدرسه
   */
  async createRole(tenantId: string, adminId: string, dto: CreateSchoolRoleDto) {
    const existing = await this.prisma.schoolRole.findFirst({
      where: {
        tenantId,
        name: dto.name.trim(),
      },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException(`نقش سازمانی با نام '${dto.name}' قبلاً در این مدرسه ثبت شده است`);
      }

      // If existing role was soft-deleted, restore and reactivate it with new permissions
      await this.ensureCatalogPermissionsInDb();
      const permissions = await this.prisma.permission.findMany({
        where: { code: { in: dto.permissionCodes } },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.schoolRole.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            description: dto.description?.trim(),
          },
        });
        await tx.rolePermission.deleteMany({ where: { schoolRoleId: existing.id } });
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              schoolRoleId: existing.id,
              permissionId: p.id,
            })),
          });
        }
      });

      await this.recordAuditLog(
        tenantId,
        adminId,
        'RESTORE_AND_UPDATE_ROLE',
        'SchoolRole',
        existing.id,
        null,
        { name: existing.name, permissionCodes: dto.permissionCodes },
      );

      return this.prisma.schoolRole.findUnique({
        where: { id: existing.id },
        include: { permissions: { include: { permission: true } } },
      });
    }

    await this.ensureCatalogPermissionsInDb();

    // Find permissions matching codes
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: dto.permissionCodes },
      },
    });

    const newRole = await this.prisma.schoolRole.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'CREATE_ROLE',
      'SchoolRole',
      newRole.id,
      null,
      { name: newRole.name, permissionCodes: dto.permissionCodes },
    );

    return newRole;
  }

  /**
   * ویرایش نقش سازمانی
   */
  async updateRole(
    tenantId: string,
    adminId: string,
    roleId: string,
    dto: UpdateSchoolRoleDto,
  ) {
    const role = await this.prisma.schoolRole.findFirst({
      where: { id: roleId, tenantId },
      include: {
        userRoles: { select: { userId: true } },
        permissions: { include: { permission: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('نقش مورد نظر یافت نشد');
    }

    if (dto.name && dto.name.trim() !== role.name) {
      const duplicate = await this.prisma.schoolRole.findFirst({
        where: {
          tenantId,
          name: dto.name.trim(),
          id: { not: roleId },
        },
      });
      if (duplicate) {
        throw new ConflictException(`نقش دیگری با عنوان '${dto.name}' در این مدرسه وجود دارد`);
      }
    }

    const oldValues = {
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((p) => p.permission.code),
    };

    await this.prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.schoolRole.update({
        where: { id: roleId },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          description: dto.description !== undefined ? dto.description?.trim() : undefined,
        },
      });

      // Update permissions if provided
      if (dto.permissionCodes && Array.isArray(dto.permissionCodes)) {
        await tx.rolePermission.deleteMany({
          where: { schoolRoleId: roleId },
        });

        const perms = await tx.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
        });

        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({
              schoolRoleId: roleId,
              permissionId: p.id,
            })),
          });
        }
      }
    });

    // Invalidate Redis cache for all users holding this role
    for (const ur of role.userRoles) {
      await this.invalidateUserPermissionsCache(tenantId, ur.userId);
    }

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'UPDATE_ROLE',
      'SchoolRole',
      roleId,
      oldValues,
      dto,
    );

    return this.prisma.schoolRole.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  /**
   * حذف امن نقش سازمانی (بررسی عدم تخصیص به کاربران)
   */
  async deleteRole(tenantId: string, adminId: string, roleId: string) {
    const role = await this.prisma.schoolRole.findFirst({
      where: { id: roleId, tenantId },
      include: {
        _count: { select: { userRoles: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('نقش مورد نظر در این مدرسه یافت نشد');
    }

    if (role.isSystem) {
      throw new ForbiddenException('نقش‌های پایه سیستمی قابل حذف نیستند');
    }

    if (role._count.userRoles > 0) {
      throw new ConflictException(
        `این نقش در حال حاضر به ${role._count.userRoles} کاربر اختصاص داده شده است. ابتدا نقش آن‌ها را تغییر دهید.`,
      );
    }

    await this.prisma.schoolRole.update({
      where: { id: roleId },
      data: { deletedAt: new Date() },
    });

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'DELETE_ROLE',
      'SchoolRole',
      roleId,
      { name: role.name },
      null,
    );

    return { message: `نقش '${role.name}' با موفقیت حذف شد` };
  }

  /**
   * بازگردانی نقش سازمانی حذف‌شده (Restore Soft-Deleted Role)
   */
  async restoreRole(tenantId: string, adminId: string, roleId: string) {
    const role = await this.prisma.schoolRole.findFirst({
      where: { id: roleId, tenantId, deletedAt: { not: null } },
    });

    if (!role) {
      throw new NotFoundException('نقش حذف‌شده مورد نظر یافت نشد');
    }

    const restored = await this.prisma.schoolRole.update({
      where: { id: roleId },
      data: { deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    await this.recordAuditLog(
      tenantId,
      adminId,
      'RESTORE_ROLE',
      'SchoolRole',
      roleId,
      null,
      { name: role.name },
    );

    return restored;
  }

  /**
   * لیست کاربران مدرسه به همراه نقش‌های سازمانی و اوررایدهای فعال
   */
  async listTenantMembersWithAccess(
    tenantId: string,
    query?: { search?: string; staffOnly?: boolean },
  ) {
    const where: any = { tenantId, status: 'ACTIVE' };

    if (query?.staffOnly) {
      where.role = { in: ['TEACHER', 'STAFF', 'SCHOOL_ADMIN', 'COACH', 'SUPER_ADMIN'] };
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { nationalId: { contains: s } },
        { username: { contains: s, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        nationalId: true,
        role: true,
        avatarUrl: true,
        userSchoolRoles: {
          include: {
            schoolRole: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });

    const catalogMap = new Map<string, PermissionCatalogItem>(
      PERMISSION_CATALOG.map((p) => [p.code, p]),
    );

    return users.map((u) => {
      const assignedRoles = u.userSchoolRoles.map((usr) => ({
        id: usr.schoolRole.id,
        name: usr.schoolRole.name,
        permissionsCount: usr.schoolRole.permissions.length,
      }));

      const activeOverrides = u.permissionOverrides.map((ov) => {
        const meta = catalogMap.get(ov.permissionCode);
        return {
          id: ov.id,
          permissionCode: ov.permissionCode,
          effect: ov.effect,
          reason: ov.reason,
          labelFa: meta?.labelFa || ov.permissionCode,
          isSensitive: meta?.isSensitive || false,
          createdAt: ov.createdAt,
        };
      });

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        phone: u.phone,
        nationalId: u.nationalId,
        baseRole: u.role,
        avatarUrl: u.avatarUrl,
        schoolRoles: assignedRoles,
        overrides: activeOverrides,
        overridesCount: activeOverrides.length,
      };
    });
  }

  /**
   * دریافت تفصیلی دسترسی‌های مؤثر یک کاربر (برای دراور دسترسی)
   */
  async getUserEffectivePermissionsDetail(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userSchoolRoles: {
          include: {
            schoolRole: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: true,
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    const catalogMap = new Map<string, PermissionCatalogItem>(
      PERMISSION_CATALOG.map((p) => [p.code, p]),
    );

    // 1. Base Role Defaults
    const baseRolePermCodes = this.getBaseRolePermissions(user.role);

    // 2. School Roles permissions
    const roleGrantedMap = new Map<string, string[]>(); // code -> [roleNames]
    for (const usr of user.userSchoolRoles) {
      for (const rp of usr.schoolRole.permissions) {
        const code = rp.permission.code;
        const current = roleGrantedMap.get(code) || [];
        current.push(usr.schoolRole.name);
        roleGrantedMap.set(code, current);
      }
    }

    // 3. Overrides Map
    const overridesMap = new Map<string, { effect: 'GRANT' | 'REVOKE'; reason?: string | null }>();
    for (const ov of user.permissionOverrides) {
      overridesMap.set(ov.permissionCode, { effect: ov.effect, reason: ov.reason });
    }

    // Compute effective set
    const effectiveSet = new Set<string>();
    baseRolePermCodes.forEach((c) => effectiveSet.add(c));
    roleGrantedMap.forEach((_, code) => effectiveSet.add(code));

    // Apply Overrides:
    overridesMap.forEach((ov, code) => {
      if (ov.effect === 'GRANT') {
        effectiveSet.add(code);
      } else if (ov.effect === 'REVOKE') {
        effectiveSet.delete(code);
      }
    });

    // Build enriched detailed list
    const permissionsDetail = PERMISSION_CATALOG.map((item) => {
      const isBaseDefault = baseRolePermCodes.includes(item.code);
      const grantingRoles = roleGrantedMap.get(item.code) || [];
      const override = overridesMap.get(item.code);
      const isGranted = effectiveSet.has(item.code);

      let source = 'NONE';
      if (override) {
        source = override.effect === 'GRANT' ? 'OVERRIDE_GRANT' : 'OVERRIDE_REVOKE';
      } else if (grantingRoles.length > 0) {
        source = 'SCHOOL_ROLE';
      } else if (isBaseDefault) {
        source = 'BASE_ROLE';
      }

      return {
        ...item,
        isEffective: isGranted,
        source,
        grantingRoles,
        overrideEffect: override?.effect || null,
        overrideReason: override?.reason || null,
      };
    });

    return {
      userId: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      baseRole: user.role,
      schoolRoles: user.userSchoolRoles.map((r) => ({ id: r.schoolRole.id, name: r.schoolRole.name })),
      totalEffectiveCount: effectiveSet.size,
      permissions: permissionsDetail,
    };
  }

  /**
   * تخصیص یکپارچه نقش‌های سازمانی به یک کاربر (Sync Roles) با رعایت گاردریل‌ها
   */
  async syncUserRoles(
    tenantId: string,
    adminId: string,
    targetUserId: string,
    dto: SyncUserRolesDto,
  ) {
    const adminUser = await this.prisma.user.findFirst({
      where: { id: adminId, tenantId },
    });

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      include: {
        userSchoolRoles: { include: { schoolRole: true } },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    // Verify all requested roleIds exist in tenant
    const targetRoles = await this.prisma.schoolRole.findMany({
      where: {
        id: { in: dto.schoolRoleIds },
        tenantId,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (targetRoles.length !== dto.schoolRoleIds.length) {
      throw new NotFoundException('یک یا چند نقش درخواستی یافت نشد');
    }

    // Guardrail 1: Privilege Escalation check
    // Only base SCHOOL_ADMIN or SUPER_ADMIN can assign a role containing 'rbac.manage'
    const grantsRbacManage = targetRoles.some((r) =>
      r.permissions.some((p) => p.permission.code === 'rbac.manage'),
    );

    if (grantsRbacManage && adminUser?.role !== 'SCHOOL_ADMIN' && adminUser?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'تنها مدیر ارشد آموزشگاه مجاز به تخصیص نقش دارای دسترسی مدیریت نقش‌ها (rbac.manage) است',
      );
    }

    // Guardrail 2: Self lockout prevention
    // If admin is modifying their own roles, ensure they do not lock themselves out of rbac.manage
    if (adminId === targetUserId && adminUser?.role !== 'SCHOOL_ADMIN' && adminUser?.role !== 'SUPER_ADMIN') {
      const currentHasRbac = await this.hasPermission(tenantId, adminId, 'rbac.manage');
      if (currentHasRbac && !grantsRbacManage) {
        throw new ForbiddenException('مدیر نمی‌تواند دسترسی مدیریت نقش را از خود سلب کند');
      }
    }

    const oldRoleNames = targetUser.userSchoolRoles.map((r) => r.schoolRole.name);
    const newRoleNames = targetRoles.map((r) => r.name);

    await this.prisma.$transaction(async (tx) => {
      await tx.userSchoolRole.deleteMany({
        where: { tenantId, userId: targetUserId },
      });

      if (dto.schoolRoleIds.length > 0) {
        await tx.userSchoolRole.createMany({
          data: dto.schoolRoleIds.map((rid) => ({
            tenantId,
            userId: targetUserId,
            schoolRoleId: rid,
          })),
        });
      }
    });

    await this.invalidateUserPermissionsCache(tenantId, targetUserId);

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'SYNC_USER_ROLES',
      'User',
      targetUserId,
      { roles: oldRoleNames },
      { roles: newRoleNames },
    );

    return {
      message: 'نقش‌های سازمانی کاربر با موفقیت به‌روزرسانی شدند',
      assignedRoles: newRoleNames,
    };
  }

  /**
   * ثبت یا ویرایش اورراید موردی یک پرمیشن برای کاربر (GRANT یا REVOKE)
   */
  async setUserOverride(
    tenantId: string,
    adminId: string,
    targetUserId: string,
    dto: SetUserOverrideDto,
  ) {
    const adminUser = await this.prisma.user.findFirst({
      where: { id: adminId, tenantId },
    });

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر هدف یافت نشد');
    }

    // Guardrail 1: Lockout prevention for rbac.manage
    if (adminId === targetUserId && dto.permissionCode === 'rbac.manage' && dto.effect === 'REVOKE') {
      throw new ForbiddenException('مدیر مدرسه نمی‌تواند دسترسی مدیریت نقش (rbac.manage) را از خود سلب کند');
    }

    // Guardrail 2: Privilege Escalation check
    if (
      dto.permissionCode === 'rbac.manage' &&
      dto.effect === 'GRANT' &&
      adminUser?.role !== 'SCHOOL_ADMIN' &&
      adminUser?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'تنها مدیر ارشد آموزشگاه مجاز به اعطای مستقیم دسترسی مدیریت نقش‌هاست',
      );
    }

    const existingOverride = await this.prisma.userPermissionOverride.findUnique({
      where: {
        tenantId_userId_permissionCode: {
          tenantId,
          userId: targetUserId,
          permissionCode: dto.permissionCode,
        },
      },
    });

    const savedOverride = await this.prisma.userPermissionOverride.upsert({
      where: {
        tenantId_userId_permissionCode: {
          tenantId,
          userId: targetUserId,
          permissionCode: dto.permissionCode,
        },
      },
      update: {
        effect: dto.effect,
        reason: dto.reason?.trim(),
        grantedById: adminId,
      },
      create: {
        tenantId,
        userId: targetUserId,
        permissionCode: dto.permissionCode,
        effect: dto.effect,
        reason: dto.reason?.trim(),
        grantedById: adminId,
      },
    });

    await this.invalidateUserPermissionsCache(tenantId, targetUserId);

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'SET_PERMISSION_OVERRIDE',
      'UserPermissionOverride',
      savedOverride.id,
      existingOverride ? { effect: existingOverride.effect } : null,
      { permissionCode: dto.permissionCode, effect: dto.effect, reason: dto.reason },
    );

    return savedOverride;
  }

  /**
   * حذف اورراید موردی یک پرمیشن و بازگشت به رفتار پیش‌فرض نقش (Inherit)
   */
  async removeUserOverride(
    tenantId: string,
    adminId: string,
    targetUserId: string,
    permissionCode: string,
  ) {
    const existing = await this.prisma.userPermissionOverride.findUnique({
      where: {
        tenantId_userId_permissionCode: {
          tenantId,
          userId: targetUserId,
          permissionCode,
        },
      },
    });

    if (!existing) {
      return { message: 'اوررایدی برای این پرمیشن وجود نداشت' };
    }

    await this.prisma.userPermissionOverride.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await this.invalidateUserPermissionsCache(tenantId, targetUserId);

    // Record Audit Log
    await this.recordAuditLog(
      tenantId,
      adminId,
      'REMOVE_PERMISSION_OVERRIDE',
      'UserPermissionOverride',
      existing.id,
      { permissionCode, effect: existing.effect },
      null,
    );

    return { message: 'اورراید با موفقیت حذف شد و به حالت ارث‌بری از نقش بازگشت' };
  }

  /**
   * بازگردانی اورراید دسترسی حذف‌شده (Restore Soft-Deleted Override)
   */
  async restoreUserOverride(
    tenantId: string,
    adminId: string,
    targetUserId: string,
    permissionCode: string,
  ) {
    const existing = await this.prisma.userPermissionOverride.findFirst({
      where: {
        tenantId,
        userId: targetUserId,
        permissionCode,
        deletedAt: { not: null },
      },
    });

    if (!existing) {
      throw new NotFoundException('اورراید حذف‌شده یافت نشد');
    }

    const restored = await this.prisma.userPermissionOverride.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });

    await this.invalidateUserPermissionsCache(tenantId, targetUserId);

    await this.recordAuditLog(
      tenantId,
      adminId,
      'RESTORE_PERMISSION_OVERRIDE',
      'UserPermissionOverride',
      existing.id,
      null,
      { permissionCode, effect: existing.effect },
    );

    return restored;
  }

  /**
   * محاسبه و دریافت لیست تمام پرمیشن‌های فعال مؤثر کاربر با فرمول هیبریدی:
   * (BaseRole Perms ∪ SchoolRoles Perms ∪ GRANT Overrides) \ REVOKE Overrides
   */
  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    const cacheKey = `user_perms:${tenantId}:${userId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userSchoolRoles: {
          include: {
            schoolRole: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: true,
      },
    });

    if (!user) {
      return [];
    }

    // Super Admin & School Admin have all system permissions by default
    if (user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      const allCodes = PERMISSION_CATALOG.map((p) => p.code);
      await this.redisService.set(cacheKey, JSON.stringify(allCodes), 600);
      return allCodes;
    }

    const permissionSet = new Set<string>();

    // 1. Base Role Defaults
    const baseDefaults = this.getBaseRolePermissions(user.role);
    baseDefaults.forEach((p) => permissionSet.add(p));

    // 2. Add permissions from assigned SchoolRoles
    for (const usr of user.userSchoolRoles) {
      for (const rp of usr.schoolRole.permissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    // 3. Apply Overrides: (∪ GRANT) \ REVOKE
    for (const ov of user.permissionOverrides) {
      if (ov.effect === 'GRANT') {
        permissionSet.add(ov.permissionCode);
      } else if (ov.effect === 'REVOKE') {
        permissionSet.delete(ov.permissionCode);
      }
    }

    const permissions = Array.from(permissionSet);
    await this.redisService.set(cacheKey, JSON.stringify(permissions), 600);

    return permissions;
  }

  /**
   * بررسی دارا بودن یک پرمیشن خاص توسط کاربر
   */
  async hasPermission(tenantId: string, userId: string, permissionCode: string): Promise<boolean> {
    const perms = await this.getUserPermissions(tenantId, userId);
    return perms.includes(permissionCode);
  }

  /**
   * پرمیشن‌های پیش‌فرض بر اساس نقش پایه کاربر
   */
  private getBaseRolePermissions(role: string): string[] {
    switch (role) {
      case 'TEACHER':
        return [
          'lesson.read',
          'attendance.write',
          'attendance.read',
          'homework.write',
          'homework.read',
          'grades.write',
          'grades.read',
          'schedule.read',
          'student.read',
          'exam.read',
          'exam.write',
          'blog.write',
        ];
      case 'STUDENT':
        return [
          'lesson.read',
          'schedule.read',
          'attendance.read',
          'homework.read',
          'grades.read',
          'exam.read',
          'coaching.read',
        ];
      case 'PARENT':
        return [
          'student.read',
          'attendance.read',
          'grades.read',
          'homework.read',
          'schedule.read',
          'finance.fee.read',
          'coaching.read',
        ];
      case 'COACH':
        return [
          'coaching.read',
          'coaching.write',
          'student.read',
          'blog.write',
          'schedule.read',
        ];
      case 'STAFF':
        return [
          'attendance.read',
          'attendance.write',
          'student.read',
          'teacher.read',
          'calendar.write',
          'blog.write',
        ];
      default:
        return [];
    }
  }

  /**
   * ابطال کش پرمیشن کاربر در ردیس
   */
  async invalidateUserPermissionsCache(tenantId: string, userId: string) {
    await this.redisService.del(`user_perms:${tenantId}:${userId}`);
  }

  /**
   * ثبت خودکار لاگ بازرسی در جدول AuditLog
   */
  private async recordAuditLog(
    tenantId: string,
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          entity,
          entityId,
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to record audit log in RbacService: ${e?.message}`);
    }
  }
}
