import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../constants/permissions';
import { RbacService } from '../../modules/rbac/rbac.service';
import { Role } from '../constants';
import { requiresEnrolledMfa } from '../security/security-policy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenant?.id || user?.tenantId;

    if (!user) {
      throw new ForbiddenException('کاربر احراز هویت نشده است');
    }

    if (requiresEnrolledMfa(requiredPermissions) && !user.twoFactorEnabled) {
      throw new ForbiddenException({
        success: false,
        statusCode: 403,
        requiresTwoFactorSetup: true,
        message:
          'برای عملیات مالی، حقوق یا مدیریت نقش‌ها، فعال‌سازی احراز هویت دومرحله‌ای الزامی است',
      });
    }

    // Platform and school owners keep full in-tenant access. Staff must pass RBAC.
    if (
      user.isPlatformAdmin ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.SCHOOL_ADMIN
    ) {
      return true;
    }

    if (!tenantId) {
      throw new ForbiddenException('کانتکست تننت برای بررسی دسترسی مشخص نیست');
    }

    const userPermissions = await this.rbacService.getUserPermissions(
      tenantId,
      user.id,
    );

    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `شما مجوزهای لازم برای این عملیات را ندارید. مجوزهای مورد نیاز: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
