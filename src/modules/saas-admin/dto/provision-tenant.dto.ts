import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { BrandTheme, TenantType } from '@prisma/client';

export class ProvisionTenantDto {
  @ApiProperty({ description: 'نام رسمی مدرسه یا مرکز آموزشی', example: 'دبیرستان دخترانه رکاد' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'شناسه یکتای آدرس تننت (Slug)', example: 'rokad-girls' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'نوع مرکز آموزشی (SCHOOL, COLLEGE, CLUB, PROJECT_INSTITUTE, MULTI_CAMPUS_NETWORK)',
    enum: TenantType,
    default: TenantType.SCHOOL,
  })
  @IsEnum(TenantType)
  @IsOptional()
  type?: TenantType;

  @ApiPropertyOptional({
    description: 'تم رنگی و بصری برند',
    enum: BrandTheme,
    default: BrandTheme.FEMALE,
  })
  @IsEnum(BrandTheme)
  @IsOptional()
  theme?: BrandTheme;

  @ApiPropertyOptional({ description: 'زیردامنه اختصاصی', example: 'girls' })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiPropertyOptional({ description: 'دامنه سفارشی کامل', example: 'girls.rokadschool.ir' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'شماره تلفن تماس مرکز' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'ایمیل رسمی مرکز' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'آدرس فیزیکی مرکز' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'شناسه سازمان یا برند والد (برای مجتمع‌های چندشعبه‌ای)' })
  @IsString()
  @IsOptional()
  parentTenantId?: string;

  // Initial Admin User Info
  @ApiProperty({ description: 'نام مدیر مدرسه', example: 'فاطمه' })
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @ApiProperty({ description: 'نام خانوادگی مدیر مدرسه', example: 'کریمی' })
  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @ApiProperty({ description: 'شماره موبایل مدیر مدرسه (جهت ورود)', example: '09122222222' })
  @IsString()
  @IsNotEmpty()
  adminPhone: string;

  @ApiProperty({ description: 'کلمه عبور اولیه مدیر مدرسه', example: 'RokadGirlsPass2026!' })
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiPropertyOptional({ description: 'کد پلن اشتراک انتخابی اولیه (e.g. STANDARD_SCHOOL, FREE_TRIAL)' })
  @IsString()
  @IsOptional()
  planCode?: string;
}

export class ImpersonateTenantDto {
  @ApiProperty({ description: 'شناسه مدرسه مقصد جهت ورود نیابتی' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ description: 'علت ورود نیابتی برای ثبت در لاگ حسابرسی' })
  @IsString()
  @IsOptional()
  reason?: string;
}
