import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeePlanScope } from '@prisma/client';

export class FeePlanInstallmentConfigItemDto {
  @ApiProperty({ description: 'شماره قسط', example: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ description: 'عنوان قسط', example: 'پیش‌پرداخت شهریه' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'درصد از کل یا مبلغ مستقیم', example: 30 })
  @IsNumber()
  @Min(1)
  percentOrAmount: number;

  @ApiProperty({ description: 'فاصله ماه از شروع سال تحصیلی (ماه سررسید)', example: 0 })
  @IsInt()
  @Min(0)
  dueMonthOffset: number;
}

export class CreateFeePlanDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'عنوان طرح شهریه', example: 'شهریه سالانه پایه دهم تجربی ۱۴۰۴-۱۴۰۵' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'مبلغ مصوب شهریه (تومان)', example: 36000000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({
    description: 'دامنه شمول طرح شهریه',
    enum: FeePlanScope,
    default: FeePlanScope.ALL_SCHOOL,
  })
  @IsEnum(FeePlanScope)
  appliesTo: FeePlanScope;

  @ApiPropertyOptional({ description: 'شناسه مقطع تحصیلی (در صورت EDUCATIONAL_LEVEL)' })
  @IsString()
  @IsOptional()
  educationalLevelId?: string;

  @ApiPropertyOptional({ description: 'شناسه کلاس (در صورت CLASSROOM)' })
  @IsString()
  @IsOptional()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی طرح' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'تعداد پیش‌فرض اقساط', example: 3, default: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  installmentCount?: number;

  @ApiPropertyOptional({
    description: 'تمپلیت پیکربندی اقساط',
    type: [FeePlanInstallmentConfigItemDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FeePlanInstallmentConfigItemDto)
  installmentConfig?: FeePlanInstallmentConfigItemDto[];
}
