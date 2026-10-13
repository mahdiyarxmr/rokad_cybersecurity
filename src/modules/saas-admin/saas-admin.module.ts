import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

import { SaasTenantLifecycleService } from './services/saas-tenant-lifecycle.service';
import { SaasSubscriptionService } from './services/saas-subscription.service';
import { SaasRoleTemplateService } from './services/saas-role-template.service';
import { SaasPlatformOpsService } from './services/saas-platform-ops.service';
import { TenantQuotaGuard } from './guards/tenant-quota.guard';
import { resolveSecret } from '../../common/security/security-policy';

import { SaasTenantsController } from './controllers/saas-tenants.controller';
import { SaasSubscriptionsController } from './controllers/saas-subscriptions.controller';
import { SaasRoleTemplatesController } from './controllers/saas-role-templates.controller';
import { SaasPlatformOpsController } from './controllers/saas-platform-ops.controller';

@Module({
  imports: [
    FeatureFlagsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveSecret('JWT_ACCESS_SECRET', config.get<string>('JWT_ACCESS_SECRET')),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [
    SaasTenantsController,
    SaasSubscriptionsController,
    SaasRoleTemplatesController,
    SaasPlatformOpsController,
  ],
  providers: [
    SaasTenantLifecycleService,
    SaasSubscriptionService,
    SaasRoleTemplateService,
    SaasPlatformOpsService,
    TenantQuotaGuard,
  ],
  exports: [
    SaasTenantLifecycleService,
    SaasSubscriptionService,
    SaasRoleTemplateService,
    SaasPlatformOpsService,
    TenantQuotaGuard,
  ],
})
export class SaasAdminModule {}
