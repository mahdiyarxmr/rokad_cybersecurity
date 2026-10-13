import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckStatus } from '@prisma/client';

export class RecordCashPaymentDto {
  @ApiProperty({ description: 'شناسه قرارداد شهریه دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiPropertyOptional({ description: 'شناسه قسط مرتبط (در صورت انتساب به قسط مشخص)' })
  @IsString()
  @IsOptional()
  installmentId?: string;

  @ApiProperty({ description: 'مبلغ نقدی دریافتی (تومان)', example: 5000000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiPropertyOptional({ description: 'تاریخ و زمان دریافت نقدی', example: '2026-09-18T10:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  cashReceivedAt?: string;

  @ApiPropertyOptional({ description: 'یادداشت یا توضیحات دریافت وجه' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RecordChequePaymentDto {
  @ApiProperty({ description: 'شناسه قرارداد شهریه دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiPropertyOptional({ description: 'شناسه قسط مرتبط (در صورت انتساب به قسط مشخص)' })
  @IsString()
  @IsOptional()
  installmentId?: string;

  @ApiProperty({ description: 'مبلغ چک (تومان)', example: 10000000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: 'شماره سریال چک', example: '123456/78' })
  @IsString()
  @IsNotEmpty()
  checkNumber: string;

  @ApiProperty({
    description: 'کد صیادی ۱۶ رقمی چک',
    example: '1234567890123456',
  })
  @IsString()
  @Matches(/^\d{16}$/, { message: 'کد صیادی چک باید دقیقاً یک عدد ۱۶ رقمی باشد' })
  checkSayadId: string;

  @ApiProperty({ description: 'نام بانک صادرکننده چک', example: 'بانک ملی ایران' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiPropertyOptional({ description: 'نام یا کد شعبه بانک', example: 'شعبه مرکزی' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ description: 'نام و نام‌خانوادگی صاحب حساب چک (در صورت مغایرت با ولی)' })
  @IsString()
  @IsOptional()
  checkOwnerName?: string;

  @ApiProperty({ description: 'تاریخ سررسید چک', example: '2026-11-20T00:00:00.000Z' })
  @IsDateString()
  checkDueDate: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی چک' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateChequeStatusDto {
  @ApiProperty({
    description: 'وضعیت جدید چک',
    enum: CheckStatus,
    example: CheckStatus.CASHED,
  })
  @IsEnum(CheckStatus)
  status: CheckStatus;

  @ApiPropertyOptional({ description: 'علت تغییر وضعیت یا یادداشت حسابدار (مثلاً دلیل برگشت چک)' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({
    description: 'اطلاعات چک یا پرداخت جایگزین (در صورت انتخاب وضعیت REPLACED)',
    type: RecordChequePaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordChequePaymentDto)
  replacementCheque?: RecordChequePaymentDto;

  @ApiPropertyOptional({
    description: 'اطلاعات پرداخت نقدی جایگزین (در صورت تسویه نقدی چک برگشتی)',
    type: RecordCashPaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordCashPaymentDto)
  replacementCash?: RecordCashPaymentDto;
}
