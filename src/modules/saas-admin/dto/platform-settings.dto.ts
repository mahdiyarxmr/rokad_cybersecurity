import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePlatformSettingDto {
  @ApiProperty({ description: 'کلید یکتای تنظیمات پلتفرم', example: 'PLATFORM_MAINTENANCE_MODE' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'ارزش و کانفیگ به فرمت JSON' })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({ description: 'توضیحات کاربرد این تنظیم' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SetMaintenanceModeDto {
  @ApiProperty({ description: 'فعال یا غیرفعال بودن حالت تعمیرات سراسری', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'پیام نمایش داده شده به کاربران در صفحه تعمیرات', example: 'سامانه در حال ارتقاء و به‌روزرسانی زیرساخت است.' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: 'زمان تخمینی پایان تعمیرات' })
  @IsString()
  @IsOptional()
  estimatedEndTime?: string;
}

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional({ description: 'رنگ سازمانی اصلی (Hex)', example: '#4F46E5' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'رنگ سازمانی ثانویه (Hex)', example: '#06B6D4' })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'آدرس آیکون و فاوآیکون (Favicon)' })
  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر پس‌زمینه لندینگ یا ورود' })
  @IsString()
  @IsOptional()
  backgroundImageUrl?: string;

  @ApiPropertyOptional({ description: 'متن کپی‌رایت یا شعار برند' })
  @IsString()
  @IsOptional()
  mottoText?: string;

  @ApiPropertyOptional({ description: 'تنظیمات سفارشی JSON' })
  @IsObject()
  @IsOptional()
  customConfig?: Record<string, any>;
}
