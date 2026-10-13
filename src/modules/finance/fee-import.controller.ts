import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FeeImportService } from './fee-import.service';
import {
  ConfirmFeeAllocationImportDto,
  ConfirmFeePaymentImportDto,
} from './dto/fee-import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Finance — Excel Import (ورود گروهی اطلاعات مالی از اکسل)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
@Controller('finance/fees/import')
export class FeeImportController {
  constructor(private readonly feeImportService: FeeImportService) {}

  // ==========================================
  // TEMPLATES
  // ==========================================

  @Get('template/allocation')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @ApiOperation({ summary: 'دانلود فایل نمونه اکسل جهت تخصیص گروهی شهریه' })
  async downloadAllocationTemplate(@Res() res: Response) {
    const buffer = this.feeImportService.generateAllocationTemplateBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fee_allocation_template.xlsx"',
    });
    res.end(buffer);
  }

  @Get('template/payments')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @ApiOperation({ summary: 'دانلود فایل نمونه اکسل جهت ثبت گروهی پرداخت‌ها (نقدی و چک)' })
  async downloadPaymentTemplate(@Res() res: Response) {
    const buffer = this.feeImportService.generatePaymentTemplateBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fee_payments_template.xlsx"',
    });
    res.end(buffer);
  }

  // ==========================================
  // ALLOCATION IMPORT
  // ==========================================

  @Post('allocation/preview')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'پیش‌نمایش و اعتبارسنجی سرور برای فایل اکسل تخصیص شهریه' })
  async previewAllocation(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('academicYearId') academicYearId: string,
    @Query('feePlanId') feePlanId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('فایل اکسل بارگذاری نشده است');
    }
    if (!academicYearId) {
      throw new BadRequestException('شناسه سال تحصیلی الزامی است');
    }

    const effectiveTenantId = tenantId || userTenantId;
    return this.feeImportService.previewAllocationExcel(
      effectiveTenantId,
      academicYearId,
      file.buffer,
      feePlanId,
    );
  }

  @Post('allocation/confirm')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @ApiOperation({ summary: 'تایید و ثبت نهایی ردیف‌های معتبر تخصیص شهریه' })
  async confirmAllocation(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: ConfirmFeeAllocationImportDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeImportService.confirmAllocationImport(effectiveTenantId, userId, dto);
  }

  // ==========================================
  // PAYMENTS IMPORT
  // ==========================================

  @Post('payments/preview')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'پیش‌نمایش و اعتبارسنجی سرور برای فایل اکسل پرداخت‌ها' })
  async previewPayments(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایل اکسل بارگذاری نشده است');
    }

    const effectiveTenantId = tenantId || userTenantId;
    return this.feeImportService.previewPaymentExcel(effectiveTenantId, file.buffer);
  }

  @Post('payments/confirm')
  @RequirePermissions(AppPermission.FINANCE_FEE_IMPORT)
  @ApiOperation({ summary: 'تایید و ثبت نهایی ردیف‌های معتبر پرداخت (نقدی و چک)' })
  async confirmPayments(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: ConfirmFeePaymentImportDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.feeImportService.confirmPaymentImport(effectiveTenantId, userId, dto);
  }
}
