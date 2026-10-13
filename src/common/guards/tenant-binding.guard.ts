import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, TENANT_HEADER_ID } from '../constants';
import { TenantContextService } from '../tenant/tenant-context.service';

/**
 * After JWT authentication, pin the request tenant to the authenticated user.
 * A client-supplied x-tenant-id must not move a school user into another tenant.
 * Missing tenant context is never treated as platform-admin.
 */
@Injectable()
export class TenantBindingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const store = this.tenantContext.getStore();

    if (!user) {
      if (store && !store.isPlatformAdmin && store.tenantType === 'PLATFORM' && !store.tenantId) {
        store.tenantType = 'UNRESOLVED';
      }
      return true;
    }

    const platformAdmin = user.isPlatformAdmin === true || user.role === 'SUPER_ADMIN';
    if (store) {
      store.userId = user.id;
      store.isPlatformAdmin = platformAdmin;
    }

    if (platformAdmin) {
      if (store && !store.tenantId) {
        store.tenantType = 'PLATFORM';
      }
      return true;
    }

    if (isPublic) return true;

    if (!user.tenantId) {
      throw new ForbiddenException('حساب کاربری به مرکز آموزشی متصل نیست');
    }

    const headerTenant = `${request.headers?.[TENANT_HEADER_ID] || ''}`.trim();
    if (headerTenant && headerTenant !== user.tenantId) {
      throw new ForbiddenException('شناسه مرکز آموزشی درخواست با حساب شما هم‌خوان نیست');
    }

    request.tenantId = user.tenantId;
    request.tenant = user.tenant || { id: user.tenantId, status: 'ACTIVE', type: 'SCHOOL' };

    if (store) {
      store.tenantId = user.tenantId;
      store.tenantType = 'SCHOOL';
      store.isPlatformAdmin = false;
      if (user.tenant?.slug) store.tenantSlug = user.tenant.slug;
      if (user.tenant?.name) store.tenantName = user.tenant.name;
    }

    return true;
  }
}
