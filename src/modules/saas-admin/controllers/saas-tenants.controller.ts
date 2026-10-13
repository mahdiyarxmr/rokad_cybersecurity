import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaasTenantLifecycleService } from '../services/saas-tenant-lifecycle.service';
import {
  ProvisionTenantDto,
  ImpersonateTenantDto,
} from '../dto/provision-tenant.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/constants';

@ApiTags('SaaS SuperAdmin — Tenants & Onboarding (مدیریت تننت‌ها و ثبت مدرسه)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('saas/tenants')
export class SaasTenantsController {
  constructor(
    private readonly lifecycleService: SaasTenantLifecycleService,
  ) {}

  @Post('provision')
  @ApiOperation({ summary: 'ایجاد و راه‌اندازی آنی مرکز آموزشی/مدرسه (Onboarding خودکار)' })
  async provisionTenant(@Body() dto: ProvisionTenantDto) {
    return this.lifecycleService.provisionTenant(dto);
  }

  @Post('impersonate')
  @ApiOperation({ summary: 'ورود نیابتی سوپرادمین به پنل یک مدرسه جهت پشتیبانی فنی' })
  async impersonateTenant(
    @CurrentUser('id') superAdminId: string,
    @Body() dto: ImpersonateTenantDto,
  ) {
    return this.lifecycleService.impersonateTenant(superAdminId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست جامع تمام مدارس و مراکز با جزئیات پلن و تعداد کاربران' })
  async listTenants(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('parentTenantId') parentTenantId?: string,
    @Query('search') search?: string,
  ) {
    return this.lifecycleService.listTenants({
      type,
      status,
      parentTenantId,
      search,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'تغییر وضعیت مرکز (فعال، تعلیق، در حال راه‌اندازی)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP',
  ) {
    return this.lifecycleService.updateStatus(id, status);
  }
}
