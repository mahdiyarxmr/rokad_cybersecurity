import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaasSubscriptionService } from '../services/saas-subscription.service';
import {
  CreateSubscriptionPlanDto,
  AssignSubscriptionDto,
} from '../dto/subscription-plan.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Role } from '../../../common/constants';
import { assertActorTenant } from '../../../common/security/tenant-access';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('SaaS SuperAdmin — Subscriptions & Plans (پلن‌های اشتراک و سهمیه‌ها)')
@Controller('saas/subscriptions')
export class SaasSubscriptionsController {
  constructor(
    private readonly subscriptionService: SaasSubscriptionService,
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'مشاهده لیست پلن‌های اشتراک عمومی (قابل مشاهده برای لندینگ و مدارس)' })
  async listPublicPlans() {
    return this.subscriptionService.listPlans(false);
  }

  @Public()
  @Get('plans/:idOrCode')
  @ApiOperation({ summary: 'مشاهده مشخصات یک پلن اشتراک' })
  async getPlan(@Param('idOrCode') idOrCode: string) {
    return this.subscriptionService.getPlan(idOrCode);
  }

  @Post('plans')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ایجاد پلن اشتراک جدید توسط سوپرادمین' })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @Post('assign')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'اختصاص یا ارتقاء پلن اشتراک برای یک مدرسه' })
  async assignSubscription(@Body() dto: AssignSubscriptionDto) {
    return this.subscriptionService.assignSubscription(dto);
  }

  @Get('tenant/:tenantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'مشاهده اشتراک فعال و مصرف سهمیه‌های دانش‌آموز/فضا برای یک مدرسه' })
  async getTenantSubscription(
    @CurrentUser() actor: any,
    @Param('tenantId') tenantId: string,
  ) {
    assertActorTenant(actor, tenantId);
    return this.subscriptionService.getTenantSubscription(tenantId);
  }
}
