import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'کد یکتای پلن', example: 'PRO_CAMPUS' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'نام نمایشی پلن', example: 'پلن حرفه‌ای مجتمع‌های آموزشی' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'توضیحات و مشخصات پلن' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'قیمت ماهیانه (تومان)', example: 4500000 })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ description: 'قیمت سالیانه با تخفیف (تومان)', example: 45000000 })
  @IsNumber()
  @Min(0)
  annualPrice: number;

  @ApiProperty({ description: 'سقف تعداد دانش‌آموز مجاز', example: 500 })
  @IsInt()
  @Min(1)
  maxStudents: number;

  @ApiProperty({ description: 'سقف تعداد معلمان و پرسنل مجاز', example: 50 })
  @IsInt()
  @Min(1)
  maxTeachers: number;

  @ApiProperty({ description: 'سقف فضای ابری به مگابایت (e.g. 20480 for 20GB)', example: 20480 })
  @IsInt()
  @Min(500)
  maxStorageMb: number;

  @ApiPropertyOptional({
    description: 'کلید فیچرفلگ‌های پکیج این پلن',
    example: ['LMS_EXAMS', 'LIVE_CHAT', 'FINANCE_PAYROLL', 'ONLINE_CLASSES'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bundledFeatureFlags?: string[];

  @ApiPropertyOptional({ description: 'آیا در صفحه پلن‌ها عمومی باشد', default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class AssignSubscriptionDto {
  @ApiProperty({ description: 'شناسه مدرسه مقصد' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'شناسه یا کد پلن اشتراک' })
  @IsString()
  @IsNotEmpty()
  planIdOrCode: string;

  @ApiPropertyOptional({
    description: 'دوره پرداخت (MONTHLY, ANNUAL, LIFETIME, CUSTOM)',
    enum: BillingCycle,
    default: BillingCycle.ANNUAL,
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ description: 'تعداد ماه‌های اشتراک', example: 12, default: 12 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;

  @ApiPropertyOptional({ description: 'مبلغ پرداختی تننت (تومان)' })
  @IsNumber()
  @IsOptional()
  paidAmount?: number;

  @ApiPropertyOptional({ description: 'تخفیف ویژه اختصاص‌یافته' })
  @IsNumber()
  @IsOptional()
  customDiscount?: number;

  @ApiPropertyOptional({ description: 'توضیحات قرارداد اشتراک' })
  @IsString()
  @IsOptional()
  notes?: string;
}
