import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SaasSubscriptionService } from '../services/saas-subscription.service';

export const REQUIRE_QUOTA_KEY = 'require_quota';
export type QuotaType = 'STUDENTS' | 'TEACHERS' | 'STORAGE_MB';

export const RequireQuota = (type: QuotaType) =>
  SetMetadata(REQUIRE_QUOTA_KEY, type);

@Injectable()
export class TenantQuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SaasSubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaType = this.reflector.getAllAndOverride<QuotaType>(
      REQUIRE_QUOTA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!quotaType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id || request.user?.tenantId;

    if (!tenantId) {
      return true; // Platform Admin or unauthenticated
    }

    const quotaResult = await this.subscriptionService.checkQuota(
      tenantId,
      quotaType,
    );

    if (quotaResult.isExceeded) {
      const typeLabels: Record<QuotaType, string> = {
        STUDENTS: 'دانش‌آموزان',
        TEACHERS: 'معلمان و پرسنل',
        STORAGE_MB: 'فضای ذخیره‌سازی ابری',
      };

      throw new ForbiddenException(
        `سقف مجاز ${typeLabels[quotaType]} در پلن اشتراک این مرکز آموزشی (${quotaResult.maxAllowed}) تکمیل شده است. جهت افزودن، لطفاً پلن اشتراک خود را ارتقاء دهید.`,
      );
    }

    return true;
  }
}
