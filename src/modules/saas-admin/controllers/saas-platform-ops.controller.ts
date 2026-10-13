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
import { SaasPlatformOpsService } from '../services/saas-platform-ops.service';
import {
  SetMaintenanceModeDto,
  UpdateTenantBrandingDto,
} from '../dto/platform-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/constants';
import { assertActorTenant } from '../../../common/security/tenant-access';

@ApiTags('SaaS SuperAdmin — Platform Operations (عملیات، متریک‌ها، برندینگ و نگهداری)')
@Controller('saas/platform')
export class SaasPlatformOpsController {
  constructor(
    private readonly platformOpsService: SaasPlatformOpsService,
  ) {}

  @Get('metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'داشبورد متریک‌ها و آمارهای کلان SaaS پلتفرم رکاد' })
  async getMetrics() {
    return this.platformOpsService.getPlatformMetrics();
  }

  @Public()
  @Get('maintenance')
  @ApiOperation({ summary: 'استعلام وضعیت حالت تعمیرات پلتفرم' })
  async getMaintenanceMode() {
    return this.platformOpsService.getMaintenanceMode();
  }

  @Post('maintenance')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'فعال یا غیرفعال‌سازی حالت تعمیرات سراسری پلتفرم' })
  async setMaintenanceMode(
    @CurrentUser('id') superAdminId: string,
    @Body() dto: SetMaintenanceModeDto,
  ) {
    return this.platformOpsService.setMaintenanceMode(dto, superAdminId);
  }

  @Patch('branding/:tenantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تنظیم برندینگ اختصاصی، رنگ سازمانی و تصاویر مدرسه یا کالج' })
  async updateBranding(
    @CurrentUser() actor: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantBrandingDto,
  ) {
    assertActorTenant(actor, tenantId);
    return this.platformOpsService.updateTenantBranding(tenantId, dto);
  }

  @Get('audit-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'جستجوگر لاگ‌های امنیتی سراسری پلتفرم بین تمام تننت‌ها' })
  async queryAuditLogs(
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformOpsService.queryGlobalAuditLogs({
      tenantId,
      action,
      userId,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('cache/purge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'پاک‌سازی دستی حافظه کش ردیس' })
  async purgeCache(@Body('pattern') pattern?: string) {
    return this.platformOpsService.purgeSystemCache(pattern || '*');
  }
}
