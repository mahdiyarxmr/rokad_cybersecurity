import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { TeacherContractService } from './teacher-contract.service';
import { PayrollExportService } from './payroll-export.service';
import {
  UpdateStaffPayrollProfileDto,
  GeneratePayrollSlipDto,
  ApproveAndPaySlipDto,
  CreateTeacherContractDto,
  CalculateMonthlyPayrollDto,
  ReviewPayrollSlipDto,
  CancelPayrollSlipDto,
  FinalizeMonthlyPayrollDto,
  CreatePayrollAdjustmentDto,
} from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Finance — Payroll & Salaries (حقوق و دستمزد کادر و مدرسین)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance/payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly contractService: TeacherContractService,
    private readonly exportService: PayrollExportService,
  ) {}

  // ==================== قراردادهای مدرسین ====================

  @Post('contracts')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت و تمدید قرارداد مالی و نرخ تدریس مدرس' })
  async createContract(
    @CurrentUser('id') createdById: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTeacherContractDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.contractService.createContract(effectiveTenantId, createdById, dto);
  }

  @Get('contracts')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'لیست قراردادهای مدرسین با فیلتر سال تحصیلی' })
  async getContracts(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.contractService.getContracts(effectiveTenantId, {
      academicYearId,
      teacherId,
    });
  }

  @Delete('contracts/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'حذف قرارداد مالی مدرس' })
  async deleteContract(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') contractId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.contractService.deleteContract(effectiveTenantId, contractId);
  }

  // ==================== موتور محاسبه خودکار ====================

  @Post('calculate')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'محاسبه خودکار حقوق ماهانه بر اساس حضور و غیاب واقعی مدرسین' })
  async calculateMonthly(
    @CurrentUser('id') createdById: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CalculateMonthlyPayrollDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.calculateMonthlyPayroll(effectiveTenantId, createdById, dto);
  }

  // ==================== بازبینی، ویرایش و ابطال فیش ====================

  @Patch('slips/:id/review')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'بازبینی و ویرایش دستی مبلغ نهایی فیش توسط مدیر با ثبت دلیل' })
  async reviewSlip(
    @CurrentUser() adminUser: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
    @Body() dto: ReviewPayrollSlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.reviewAndEditSlip(effectiveTenantId, slipId, dto, adminUser);
  }

  @Patch('slips/:id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ابطال رسمی فیش حقوقی با ثبت دلیل' })
  async cancelSlip(
    @CurrentUser() adminUser: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
    @Body() dto: CancelPayrollSlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.cancelSlip(effectiveTenantId, slipId, dto, adminUser);
  }

  @Post('finalize')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'صدور قطعی و دسته‌جمعی فیش‌های حقوقی ماه' })
  async finalizeMonth(
    @CurrentUser() adminUser: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: FinalizeMonthlyPayrollDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.finalizeMonthlySlips(effectiveTenantId, dto.year, dto.month, adminUser);
  }

  // ==================== تعدیلات حقوق (Adjustments) ====================

  @Post('adjustments')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت تعدیل حقوق برای اعمال در ماه بعد' })
  async createAdjustment(
    @CurrentUser('id') createdById: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreatePayrollAdjustmentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.createAdjustment(effectiveTenantId, createdById, dto);
  }

  @Get('adjustments')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'لیست تعدیلات حقوق مدرسین' })
  async getAdjustments(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getAdjustments(effectiveTenantId, teacherId);
  }

  // ==================== فیش‌های حقوقی ====================

  @Post('slips')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'تولید فیش حقوقی برای یک پرسنل بر مبنای پروفایل حقوقی' })
  async generateSlip(
    @CurrentUser('id') createdById: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: GeneratePayrollSlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.generateSlipForUser(effectiveTenantId, createdById, dto);
  }

  @Get('slips')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'لیست فیش‌های حقوقی با فیلتر سال، ماه و وضعیت' })
  async listSlips(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.listPayrollSlips(effectiveTenantId, {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      status,
      userId,
    });
  }

  @Get('slips/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'مشاهده جزییات کامل یک فیش حقوقی' })
  async getSlipById(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getSlipById(effectiveTenantId, slipId);
  }

  @Get('my-slips')
  @ApiOperation({ summary: 'مشاهده فیش‌های حقوقی صادرشده توسط خود مدرس/کارمند' })
  async getMySlips(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getMyPayrollSlips(effectiveTenantId, userId);
  }

  @Patch('slips/:id/disburse')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت تسویه حساب بانکی فیش حقوقی' })
  async disburseSlip(
    @CurrentUser('id') approverId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
    @Body() dto: ApproveAndPaySlipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.approveAndDisburse(
      effectiveTenantId,
      slipId,
      approverId,
      dto,
    );
  }

  // ==================== خروجی‌ها (Exports) ====================

  @Get('export/excel')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'دانلود فایل اکسل کارکرد و حقوق ماهانه مدرسین' })
  async exportExcel(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    const now = new Date();
    const y = parseInt(year, 10) || now.getFullYear();
    const m = parseInt(month, 10) || (now.getMonth() + 1);
    const buffer = await this.exportService.generateMonthlyExcel(effectiveTenantId, y, m);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${y}-${String(m).padStart(2, '0')}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('export/print/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF, Role.TEACHER)
  @ApiOperation({ summary: 'چاپ فیش حقوقی رسمی تکی (Print / PDF)' })
  async printSlip(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slipId: string,
    @Res() res: Response,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    const html = await this.exportService.generateSingleSlipHtml(effectiveTenantId, slipId);
    res.type('html').send(html);
  }

  // ==================== پروفایل پرسنلی ====================

  @Post('profiles/:userId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_WRITE)
  @ApiOperation({ summary: 'ثبت و ویرایش پروفایل حقوق و دستمزد پرسنل/معلم' })
  async upsertProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffPayrollProfileDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.upsertStaffProfile(effectiveTenantId, userId, dto);
  }

  @Get('profiles')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'لیست تمام پروفایل‌های مالی پرسنل' })
  async listProfiles(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.listStaffProfiles(effectiveTenantId);
  }

  @Get('profiles/:userId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_PAYROLL_READ)
  @ApiOperation({ summary: 'مشاهده اطلاعات حقوقی و شماره حساب پرسنل' })
  async getProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.payrollService.getStaffProfile(effectiveTenantId, userId);
  }
}
