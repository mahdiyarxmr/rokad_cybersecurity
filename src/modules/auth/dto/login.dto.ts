import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'شناسه یا اسلاگ مدرسه (در صورت عدم ارسال از ساب‌دامین استخراج می‌شود)',
    example: 'rokad-boys',
  })
  @IsString()
  @IsOptional()
  tenantSlug?: string;

  @ApiProperty({
    description: 'نام کاربری، شماره همراه یا ایمیل',
    example: '09121234567',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'رمز عبور کاربر',
    example: 'Secret123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
