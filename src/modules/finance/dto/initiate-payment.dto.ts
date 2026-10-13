import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentGateway, PaymentMethod } from '@prisma/client';

export class InitiateOnlinePaymentDto {
  @ApiProperty({ description: 'شناسه قسط شهریه جهت پرداخت' })
  @IsString()
  @IsNotEmpty()
  installmentId: string;

  @ApiPropertyOptional({ description: 'آدرس بازگشت پس از پرداخت درگاه (Callback URL)' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @ApiPropertyOptional({
    description: 'درگاه پرداخت انتخابی',
    enum: PaymentGateway,
    default: PaymentGateway.ZARINPAL,
  })
  @IsEnum(PaymentGateway)
  @IsOptional()
  gateway?: PaymentGateway;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'کد پیگیری درگاه (Authority)' })
  @IsString()
  @IsNotEmpty()
  authority: string;

  @ApiPropertyOptional({ description: 'وضعیت بازگشتی درگاه (OK یا NOK)', example: 'OK' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class RecordOfflinePaymentDto {
  @ApiProperty({ description: 'شناسه قسط شهریه' })
  @IsString()
  @IsNotEmpty()
  installmentId: string;

  @ApiProperty({
    description: 'روش پرداخت آفلاین (POS_RECEIPT, BANK_TRANSFER, CHEQUE, CASH)',
    enum: PaymentMethod,
    default: PaymentMethod.POS_RECEIPT,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'شماره پیگیری فیش واریزی / کارت‌خوان / چک' })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string;

  @ApiPropertyOptional({ description: 'توضیحات واریز' })
  @IsString()
  @IsOptional()
  notes?: string;
}
