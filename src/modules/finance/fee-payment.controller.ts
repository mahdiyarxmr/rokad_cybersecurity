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
import { FeePaymentService } from './fee-payment.service';
import {
  RecordCashPaymentDto,
  RecordChequePaymentDto,
  UpdateChequeStatusDto,
} from './dto/record-fee-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';
import { CheckStatus } from '@prisma/client';

@ApiTags('Finance — Cash & Cheque Management (مدیریت پرداخت‌های نقدی و چک)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance/payments')
export class FeePaymentController {
  constructor(private readonly feePaymentService: FeePaymentService) {}

  @Post('cash')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'ثبت پرداخت نقدی شهریه و کسر آنی از مانده بدهی قرارداد' })
  async recordCashPayment(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: RecordCashPaymentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feePaymentService.recordCashPayment(effectiveTenantId, userId, dto);
  }

  @Post('cheque')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'ثبت چک صیادی دریافتی از اولیا (با وضعیت اولیه در انتظار وصول)' })
  async recordChequePayment(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: RecordChequePaymentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feePaymentService.recordChequePayment(effectiveTenantId, userId, dto);
  }

  @Patch('cheque/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_CHECK_MANAGE)
  @ApiOperation({ summary: 'تغییر وضعیت چک (وصول شد / برگشت خورد / جایگزین شد)' })
  async updateChequeStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') paymentId: string,
    @Body() dto: UpdateChequeStatusDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feePaymentService.updateChequeStatus(
      effectiveTenantId,
      paymentId,
      userId,
      dto,
    );
  }

  @Get('cheques')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'مشاهده دفتر چک‌های دریافتی مدرسه با فیلتر وضعیت و جستجو' })
  async listCheques(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('status') status?: CheckStatus,
    @Query('search') search?: string,
    @Query('studentId') studentId?: string,
    @Query('fromDueDate') fromDueDate?: string,
    @Query('toDueDate') toDueDate?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feePaymentService.listCheques(effectiveTenantId, {
      status,
      search,
      studentId,
      fromDueDate,
      toDueDate,
    });
  }

  @Get('cheques/stats')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_READ)
  @ApiOperation({ summary: 'آمار تجمیعی دفتر چک (مبالغ و تعداد وصول‌شده، معلق، برگشتی و سررسید نزدیک)' })
  async getChequeStats(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feePaymentService.getChequeStats(effectiveTenantId);
  }
}
