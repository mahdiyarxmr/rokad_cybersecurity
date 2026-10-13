import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInstallmentItemDto {
  @ApiProperty({ description: 'شماره قسط', example: 1 })
  @IsInt()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ description: 'عنوان قسط', example: 'پیش‌پرداخت شهریه' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'تاریخ سررسید قسط', example: '2026-09-20T00:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'مبلغ قسط (تومان)', example: 10000000 })
  @IsNumber()
  @Min(1000)
  amount: number;
}

export class CreateFeeContractDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'شناسه پرونده دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'شماره قرارداد شهریه', example: 'FEE-1404-001' })
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @ApiProperty({ description: 'کل مبلغ مصوب شهریه (تومان)', example: 35000000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'مبلغ تخفیف یا بورسیه', example: 5000000, default: 0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'علت تخفیف (فرزند فرهنگی، رتبه برتر، ...)' })
  @IsString()
  @IsOptional()
  discountReason?: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی قرارداد' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'شناسه طرح شهریه مرجع' })
  @IsString()
  @IsOptional()
  feePlanId?: string;

  @ApiPropertyOptional({ description: 'آیا قرارداد به صورت موردی/استثنا ثبت شده است', default: false })
  @IsBoolean()
  @IsOptional()
  isIndividual?: boolean;

  @ApiProperty({
    description: 'لیست اقساط تعریف‌شده برای قرارداد',
    type: [CreateInstallmentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstallmentItemDto)
  installments: CreateInstallmentItemDto[];
}
