import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { BrandTheme } from '../../../common/constants';

export class RegisterSchoolDto {
  @ApiProperty({ description: 'نام مدرسه / مرکز آموزشی', example: 'مدرسه هوشمند رکاد پسرانه' })
  @IsString()
  @IsNotEmpty()
  schoolName: string;

  @ApiProperty({ description: 'اسلاگ یکتا برای ساب‌دامین و دسترسی', example: 'rokad-boys' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ description: 'ساب‌دامین اختصاصی', example: 'boys' })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiPropertyOptional({
    description: 'تم رنگی و پرسونا (ECOSYSTEM, MALE, FEMALE, COLLEGE, CLUB)',
    enum: BrandTheme,
    default: BrandTheme.ECOSYSTEM,
  })
  @IsEnum(BrandTheme)
  @IsOptional()
  theme?: BrandTheme;

  @ApiProperty({ description: 'نام مدیر مدرسه', example: 'علیرضا' })
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @ApiProperty({ description: 'نام خانوادگی مدیر مدرسه', example: 'محمدی' })
  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @ApiProperty({ description: 'شماره همراه مدیر مدرسه', example: '09121234567' })
  @IsString()
  @IsNotEmpty()
  adminPhone: string;

  @ApiPropertyOptional({ description: 'ایمیل مدیر مدرسه', example: 'admin@rokadschool.ir' })
  @IsEmail()
  @IsOptional()
  adminEmail?: string;

  @ApiProperty({ description: 'رمز عبور مدیر (حداقل ۸ کاراکتر)', example: 'Secret123!' })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  adminPassword: string;
}
