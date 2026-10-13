import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  InitiateOnlinePaymentDto,
  VerifyPaymentDto,
  RecordOfflinePaymentDto,
} from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

import { Public } from '../../common/decorators/public.decorator';
import { BruteForceService } from '../../common/redis/brute-force.service';

@ApiTags('Finance — Payments & Gateway (پرداخت آنلاین و درگاه بانکی)')
@Controller('finance/payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bruteForceService: BruteForceService,
  ) {}

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'ایجاد تراکنش و دریافت لینک اتصال به درگاه پرداخت زرین‌پال' })
  async initiateOnlinePayment(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: InitiateOnlinePaymentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.paymentService.initiateOnlinePayment(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'دریافت Callback بازگشت از درگاه و تایید تراکنش با قفل Idempotency' })
  async verifyPaymentGet(
    @Query('tenantId') tenantIdQuery: string,
    @Query('Authority') authorityGet: string,
    @Query('Status') statusGet: string,
    @Query('authority') authorityLower: string,
    @Query('status') statusLower: string,
    @Ip() ip: string,
  ) {
    const authority = authorityGet || authorityLower;
    const status = statusGet || statusLower;

    // Requirement 3: Enforce strict rate limiting on payment verification
    await this.bruteForceService.checkPaymentVerifyAllowed(authority || 'unknown', ip);

    return this.paymentService.verifyPayment(tenantIdQuery, {
      authority,
      status,
    });
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'تایید تراکنش درگاه از طریق درخواست POST' })
  async verifyPaymentPost(
    @Query('tenantId') tenantIdQuery: string,
    @Body() dto: VerifyPaymentDto,
    @Ip() ip: string,
  ) {
    // Requirement 3: Enforce strict rate limiting on payment verification
    await this.bruteForceService.checkPaymentVerifyAllowed(dto?.authority || 'unknown', ip);

    return this.paymentService.verifyPayment(tenantIdQuery, dto);
  }

  @Post('offline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.FINANCE_FEE_WRITE)
  @ApiOperation({ summary: 'ثبت دستی پرداخت‌های آفلاین (کارت‌خوان، فیش بانکی، چک، نقد)' })
  async recordOfflinePayment(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: RecordOfflinePaymentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.paymentService.recordOfflinePayment(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('receipts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'لیست رسیدهای رسمی صادر شده' })
  async listReceipts(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('contractId') contractId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.paymentService.listReceipts(effectiveTenantId, contractId);
  }
}
