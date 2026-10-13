import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { UpdateTenantFlagDto } from './dto/update-tenant-flag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get('my-school')
  @ApiOperation({ summary: 'دریافت وضعیت تمام قابلیت‌های ماژولار مدرسه جاری' })
  async getMySchoolFlags(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.featureFlagsService.getTenantFlags(effectiveTenantId);
  }

  @Post('my-school/toggle')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تغییر وضعیت یک قابلیت برای مدرسه جاری' })
  async toggleMySchoolFlag(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateTenantFlagDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.featureFlagsService.setTenantFlag(
      effectiveTenantId,
      dto.flagKey,
      dto.isEnabled,
      dto.config,
    );
  }

  @Get('tenants/:tenantId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'مدیریت سوپرادمین: دریافت فلگ‌های یک مدرسه مشخص' })
  async getTenantFlagsByAdmin(@Param('tenantId') tenantId: string) {
    return this.featureFlagsService.getTenantFlags(tenantId);
  }

  @Post('tenants/:tenantId/set')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'مدیریت سوپرادمین: تخصیص یا لغو ماژول برای یک مدرسه' })
  async setTenantFlagByAdmin(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantFlagDto,
  ) {
    return this.featureFlagsService.setTenantFlag(
      tenantId,
      dto.flagKey,
      dto.isEnabled,
      dto.config,
    );
  }
}
