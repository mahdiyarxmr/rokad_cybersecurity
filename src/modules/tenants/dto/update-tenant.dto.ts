import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BrandTheme } from '../../../common/constants';

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'نام مدرسه', example: 'مدرسه هوشمند رکاد پسرانه' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'تم رنگی پرسونای رکاد (ECOSYSTEM, MALE, FEMALE, COLLEGE, CLUB)',
    enum: BrandTheme,
  })
  @IsEnum(BrandTheme)
  @IsOptional()
  theme?: BrandTheme;

  @ApiPropertyOptional({ description: 'آدرس وبسایت یا ساب‌دامین اختصاصی' })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiPropertyOptional({ description: 'دامنه اختصاصی (مانند school.ir)' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'شماره تماس مدرسه' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'ایمیل مدرسه' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'آدرس فیزیکی مدرسه' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'تنظیمات سفارشی JSON' })
  @IsOptional()
  settings?: any;
}
