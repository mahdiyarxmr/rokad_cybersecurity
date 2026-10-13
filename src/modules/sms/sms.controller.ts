import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import {
  SendManualSmsDto,
  UpsertSmsTemplateDto,
  UpdateSmsConfigDto,
  CreateSmsQuickTemplateDto,
  UpdateSmsQuickTemplateDto,
} from './dto/send-manual-sms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('SMS Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('config')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت تنظیمات وب‌سرویس و درگاه‌های پیامک' })
  async getGatewayConfig(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getGatewayConfig(effectiveTenantId);
  }

  @Post('config')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'به‌روزرسانی تنظیمات درگاه پیامک و سوییچ به آموت یا کاوه نگار' })
  async updateGatewayConfig(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Body() dto: UpdateSmsConfigDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.updateGatewayConfig(dto, effectiveTenantId);
  }

  @Post('manual-send')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ارسال دستی پیامک (فردی، نقشی/گروهی، کلاسی یا شماره مستقیم)' })
  async sendManualSms(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('id') senderId: string,
    @Body() dto: SendManualSmsDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.sendManualSms(effectiveTenantId, senderId, dto);
  }

  @Get('logs')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت تاریخچه و لاگ پیامک‌های ارسالی' })
  async getSmsLogs(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getSmsLogs(
      effectiveTenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
      type,
      search,
    );
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'آمار و وضعیت تجمیعی پیامک‌های ارسالی' })
  async getSmsStats(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getSmsStats(effectiveTenantId);
  }

  @Get('templates')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت لیست الگوها و وضعیت اتوماسیون‌های پیامکی' })
  async getTemplates(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getTemplates(effectiveTenantId);
  }

  @Post('templates')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ثبت یا به‌روزرسانی قالب و تنظیمات اتوماسیون پیامک' })
  async upsertTemplate(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Body() dto: UpsertSmsTemplateDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.upsertTemplate(effectiveTenantId, dto);
  }

  @Post('trigger/cheques')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'اجرای دستی اتوماسیون یادآوری سررسید چک‌های صیادی' })
  async triggerCheques(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.processChequeDueReminders(effectiveTenantId);
  }

  @Post('trigger/birthdays')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'اجرای دستی اتوماسیون پیامک تبریک تولد امروز' })
  async triggerBirthdays(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.processBirthdayGreetings(effectiveTenantId);
  }

  // ==========================================
  // Quick Templates Endpoints
  // ==========================================
  @Get('quick-templates')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت لیست الگوهای سریع پیامک' })
  async getQuickTemplates(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getQuickTemplates(effectiveTenantId);
  }

  @Post('quick-templates')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'افزودن یک الگوی سریع جدید به درگاه' })
  async createQuickTemplate(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Body() dto: CreateSmsQuickTemplateDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.createQuickTemplate(effectiveTenantId, dto);
  }

  @Patch('quick-templates/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ویرایش الگوی سریع پیامک' })
  async updateQuickTemplate(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSmsQuickTemplateDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.updateQuickTemplate(effectiveTenantId, id, dto);
  }

  @Delete('quick-templates/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'حذف یک الگوی سریع' })
  async deleteQuickTemplate(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Param('id') id: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.deleteQuickTemplate(effectiveTenantId, id);
  }

  @Get(['recipients', 'directory'])
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت مخاطبان دفترچه تلفن مدرسه بر اساس نقش جهت ارسال پیامک' })
  async getRecipients(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.smsService.getDirectoryRecipients(effectiveTenantId, search);
  }
}



