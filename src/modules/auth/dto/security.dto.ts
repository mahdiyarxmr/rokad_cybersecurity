import { IsString, IsNotEmpty, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'توکن موقت دریافت شده در مرحله اول ورود' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ description: 'کد ۶ رقمی اپلیکیشن احراز هویت یا کد بازیابی اضطراری' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class EnableTwoFactorDto {
  @ApiProperty({ description: 'کد ۶ رقمی جهت تأیید فعال‌سازی' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'کد احراز هویت باید ۶ رقم باشد' })
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({ description: 'رمز عبور فعلی جهت تأیید غیرفعال‌سازی' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class StepUpVerifyDto {
  @ApiProperty({ description: 'کد ۶ رقمی احراز هویت دوعاملی جهت تأیید مرحله‌ای عملیات حساس' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'رمز عبور فعلی' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'رمز عبور جدید (حداقل ۸ کاراکتر)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد' })
  newPassword: string;
}
