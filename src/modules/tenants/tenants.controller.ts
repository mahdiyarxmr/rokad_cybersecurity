import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '../../common/constants';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Get('info/:slug')
  @ApiOperation({ summary: 'دریافت مشخصات عمومی مدرسه برای صفحه لندینگ/ورود' })
  async getPublicInfo(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      theme: tenant.theme,
      logoUrl: tenant.logoUrl,
      status: tenant.status,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('my-school')
  @ApiOperation({ summary: 'دریافت مشخصات کامل مدرسه جاری' })
  async getMySchool(@CurrentTenant('id') tenantId: string) {
    if (!tenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.tenantsService.findById(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @Patch('my-school')
  @ApiOperation({ summary: 'ویرایش تنظیمات و مشخصات مدرسه جاری (راهبر مدرسه)' })
  async updateMySchool(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    if (!tenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.tenantsService.update(tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('my-school/banners')
  @ApiOperation({ summary: 'دریافت بنرهای اسلایدر اختصاصی مدرسه جاری' })
  async getSchoolBanners(@CurrentTenant('id') tenantId: string) {
    if (!tenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.tenantsService.getBanners(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @Patch('my-school/banners')
  @ApiOperation({ summary: 'ویرایش بنرهای اسلایدر اختصاصی مدرسه جاری (راهبر مدرسه)' })
  async updateSchoolBanners(
    @CurrentTenant('id') tenantId: string,
    @Body() body: { slides?: any[]; bannerTypes?: any[] },
  ) {
    if (!tenantId) {
      throw new ForbiddenException('کانتکست مدرسه برای این کاربر مشخص نیست');
    }
    return this.tenantsService.updateBanners(tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'مدیریت سوپرادمین: تعلیق، فعال‌سازی یا تغییر وضعیت مدرسه همراه با ابطال آنی کش' })
  async changeTenantStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP',
  ) {
    return this.tenantsService.changeStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Get('all')
  @ApiOperation({ summary: 'مدیریت سوپر ادمین: لیست تمام مدارس و مراکز ثبت‌شده' })
  async listAllSchools() {
    return this.tenantsService.listAll();
  }
}
