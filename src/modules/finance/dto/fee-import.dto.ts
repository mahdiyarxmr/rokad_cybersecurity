import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportFeeAllocationRowDto {
  @ApiProperty({ description: 'شماره ردیف در فایل اکسل', example: 2 })
  @IsNumber()
  rowIndex: number;

  @ApiProperty({ description: 'کد ملی یا شماره دانش‌آموزی', example: '0012345678' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'مبلغ شهریه (تومان)', example: 35000000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'مبلغ تخفیف (تومان)', example: 5000000, default: 0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'علت تخفیف یا توضیحات' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConfirmFeeAllocationImportDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'شناسه طرح شهریه (در صورت انتساب به طرح مشخص)' })
  @IsString()
  @IsOptional()
  feePlanId?: string;

  @ApiProperty({
    description: 'لیست ردیف‌های معتبر جهت ثبت نهایی',
    type: [ImportFeeAllocationRowDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFeeAllocationRowDto)
  rows: ImportFeeAllocationRowDto[];
}

export class ImportFeePaymentRowDto {
  @ApiProperty({ description: 'شماره ردیف در فایل اکسل', example: 2 })
  @IsNumber()
  rowIndex: number;

  @ApiProperty({ description: 'کد ملی یا شماره دانش‌آموزی', example: '0012345678' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'نوع پرداخت (نقدی یا چک)', example: 'چک' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: 'مبلغ پرداختی (تومان)', example: 10000000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'تاریخ دریافت نقدی یا سررسید چک', example: '1404/08/15' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'شماره سریال چک' })
  @IsString()
  @IsOptional()
  checkNumber?: string;

  @ApiPropertyOptional({ description: 'کد صیادی ۱۶ رقمی چک' })
  @IsString()
  @IsOptional()
  checkSayadId?: string;

  @ApiPropertyOptional({ description: 'نام بانک صادرکننده چک' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConfirmFeePaymentImportDto {
  @ApiProperty({
    description: 'لیست ردیف‌های معتبر پرداخت جهت ثبت نهایی',
    type: [ImportFeePaymentRowDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportFeePaymentRowDto)
  rows: ImportFeePaymentRowDto[];
}
