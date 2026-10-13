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
import { FeeService } from './fee.service';
import { CreateFeeContractDto } from './dto/create-fee-contract.dto';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Finance — Fee Management (مدیریت شهریه، طرح‌ها و اقساط)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance')
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  // ==========================================
  // FEE PLANS (طرح‌های شهریه سالانه)
  // ==========================================

  @Post('plans')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'تعریف طرح جدید شهریه در سطح سال تحصیلی / مقطع / کلاس' })
  async createFeePlan(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateFeePlanDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.createFeePlan(effectiveTenantId, dto);
  }

  @Get('plans')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'مشاهده لیست طرح‌های شهریه سال تحصیلی' })
  async listFeePlans(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.listFeePlans(effectiveTenantId, academicYearId);
  }

  @Get('plans/:id/preview')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'پیش‌نمایش تخصیص گروهی طرح شهریه و شمارش دانش‌آموزان مشمول' })
  async previewFeePlanAllocation(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') planId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.previewFeePlanAllocation(effectiveTenantId, planId);
  }

  @Post('plans/:id/apply')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'اجرای نهایی تخصیص گروهی طرح شهریه و بدهکار شدن تمام دانش‌آموزان مشمول' })
  async applyFeePlan(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') planId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.applyFeePlan(effectiveTenantId, planId, userId);
  }

  // ==========================================
  // CONTRACTS (قراردادهای شهریه دانش‌آموزان)
  // ==========================================

  @Post('contracts')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'ثبت قرارداد شهریه و اقساط‌بندی موردی/استثنا برای یک دانش‌آموز' })
  async createContract(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateFeeContractDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.createContract(effectiveTenantId, dto);
  }

  @Get('contracts')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'لیست قراردادهای شهریه دانش‌آموزان' })
  async listContracts(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('studentId') studentId?: string,
    @Query('hasHold') hasHold?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.listContracts(effectiveTenantId, {
      academicYearId,
      studentId,
      hasHold: hasHold !== undefined ? hasHold === 'true' : undefined,
    });
  }

  @Get('contracts/my-overview')
  @Roles(Role.STUDENT, Role.PARENT, Role.SCHOOL_ADMIN, Role.STAFF, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'مشاهده لیست قراردادها و اقساط شهریه توسط دانش‌آموز جاری' })
  async getMyContractsOverview(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getStudentContractsOverview(effectiveTenantId, userId);
  }

  @Get('contracts/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF, Role.PARENT)
  @ApiOperation({ summary: 'مشاهده جزئیات کامل قرارداد، چک‌ها، اقساط و مانده بدهی' })
  async getContractDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') contractId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getContractDetails(effectiveTenantId, contractId);
  }

  // ==========================================
  // PARENT PORTAL (درگاه اختصاصی والدین)
  // ==========================================

  @Get('parent/children')
  @Roles(Role.SUPER_ADMIN, Role.PARENT)
  @ApiOperation({ summary: 'لیست فرزندان تحت تکفل ولی جهت سوئیچ در پنل شهریه' })
  async getParentChildren(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getParentChildren(effectiveTenantId, userId);
  }

  @Get('parent/overview')
  @Roles(Role.SUPER_ADMIN, Role.PARENT)
  @ApiOperation({ summary: 'مشاهده صورت‌حساب مالی، اقساط، چک‌ها و پرداخت آنلاین توسط ولی' })
  async getParentFeeOverview(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('studentId') studentId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeService.getParentFeeOverview(effectiveTenantId, userId, studentId);
  }
}
