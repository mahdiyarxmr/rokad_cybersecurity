import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../constants';
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id || request.tenantId;

    if (!tenantId) {
      // If no tenant context, check default state or bypass for super admin
      if (request.user?.isPlatformAdmin) {
        return true;
      }
      throw new ForbiddenException('کانتکست تننت برای بررسی ماژول یافت نشد');
    }

    const isEnabled = await this.featureFlagsService.isEnabled(
      requiredFeature,
      tenantId,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `ماژول '${requiredFeature}' برای این مرکز آموزشی فعال نشده است`,
      );
    }

    return true;
  }
}
