import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTenantFlagDto {
  @ApiProperty({ description: 'کلید قابلیت (مانند lms_online_exam)', example: 'lms_online_exam' })
  @IsString()
  @IsNotEmpty()
  flagKey: string;

  @ApiProperty({ description: 'وضعیت فعال بودن برای این تننت', example: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiPropertyOptional({ description: 'تنظیمات سفارشی JSON برای این ماژول' })
  @IsOptional()
  config?: any;
}
