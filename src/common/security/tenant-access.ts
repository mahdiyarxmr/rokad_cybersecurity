import { ForbiddenException } from '@nestjs/common';

export function assertActorTenant(
  actor: { tenantId?: string | null; isPlatformAdmin?: boolean | null; role?: string | null } | null | undefined,
  targetTenantId: string,
): void {
  if (!actor) {
    throw new ForbiddenException('کاربر احراز هویت نشده است');
  }
  if (actor.isPlatformAdmin || actor.role === 'SUPER_ADMIN') return;
  if (!actor.tenantId || actor.tenantId !== targetTenantId) {
    throw new ForbiddenException('دسترسی به داده مرکز آموزشی دیگر مجاز نیست');
  }
}
