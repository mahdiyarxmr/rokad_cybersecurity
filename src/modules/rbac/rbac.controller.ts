import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import {
  CreateSchoolRoleDto,
  UpdateSchoolRoleDto,
  SyncUserRolesDto,
  SetUserOverrideDto,
} from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('RBAC & Role Builder (سازنده نقش و مدیریت دسترسی)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // 1. Permissions Catalog
  @Get('permissions')
  @ApiOperation({ summary: 'کاتالوگ جامع پرمیشن‌های سیستمی با متادیتای فارسی و دسته‌بندی' })
  async listPermissions() {
    return this.rbacService.listPermissions();
  }

  // 2. School Roles CRUD
  @Get('roles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'فهرست نقش‌های سازمانی تعریف‌شده در مدرسه جاری' })
  async listSchoolRoles(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.listRoles(effectiveTenantId);
  }

  @Post('roles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'ایجاد نقش سازمانی جدید در مدرسه' })
  async createSchoolRole(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateSchoolRoleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.createRole(effectiveTenantId, adminId, dto);
  }

  @Patch('roles/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'ویرایش نام، توضیحات یا پرمیشن‌های نقش سازمانی' })
  async updateSchoolRole(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') roleId: string,
    @Body() dto: UpdateSchoolRoleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.updateRole(effectiveTenantId, adminId, roleId, dto);
  }

  @Delete('roles/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'حذف نقش سازمانی (با اعتبارسنجی عدم تخصیص به کاربران)' })
  async deleteSchoolRole(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') roleId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.deleteRole(effectiveTenantId, adminId, roleId);
  }

  @Patch('roles/:id/restore')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'بازگردانی نقش سازمانی حذف‌شده (Restore)' })
  async restoreSchoolRole(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') roleId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.restoreRole(effectiveTenantId, adminId, roleId);
  }

  // 3. Members & Access Management
  @Get('members')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'فهرست کاربران مدرسه با نقش‌های سازمانی و اوررایدهای فعال' })
  async listMembersAccess(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('search') search?: string,
    @Query('staffOnly') staffOnly?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    const isStaffOnly = staffOnly !== undefined ? staffOnly === 'true' : true;
    return this.rbacService.listTenantMembersWithAccess(effectiveTenantId, {
      search,
      staffOnly: isStaffOnly,
    });
  }

  @Get('members/:userId/detail')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'دریافت تفکیک کامل دسترسی‌های مؤثر کاربر جهت نمایش در دراور' })
  async getMemberEffectivePermissions(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.getUserEffectivePermissionsDetail(effectiveTenantId, userId);
  }

  @Patch('members/:userId/roles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'تخصیص یکپارچه نقش‌های سازمانی به یک کاربر' })
  async syncMemberRoles(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: SyncUserRolesDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.syncUserRoles(effectiveTenantId, adminId, userId, dto);
  }

  @Patch('members/:userId/overrides')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'اعطا یا سلب موردی یک دسترسی برای کاربر (GRANT / REVOKE)' })
  async setMemberOverride(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: SetUserOverrideDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.setUserOverride(effectiveTenantId, adminId, userId, dto);
  }

  @Delete('members/:userId/overrides/:permissionCode')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'حذف اورراید موردی و بازگشت به ارث‌بری از نقش' })
  async removeMemberOverride(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.removeUserOverride(effectiveTenantId, adminId, userId, permissionCode);
  }

  @Patch('members/:userId/overrides/:permissionCode/restore')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.RBAC_MANAGE)
  @ApiOperation({ summary: 'بازگردانی اورراید دسترسی حذف‌شده (Restore)' })
  async restoreMemberOverride(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.rbacService.restoreUserOverride(effectiveTenantId, adminId, userId, permissionCode);
  }

  // 4. Current User Permissions
  @Get('my-permissions')
  @ApiOperation({ summary: 'دریافت لیست پرمیشن‌های فعال کاربر جاری در این مدرسه' })
  async getMyPermissions(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.rbacService.getUserPermissions(effectiveTenantId, userId);
  }
}
