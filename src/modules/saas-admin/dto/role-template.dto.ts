import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TenantType } from '@prisma/client';

export class CreateRoleTemplateDto {
  @ApiProperty({ description: 'کد یکتای قالب نقش', example: 'CHIEF_ACCOUNTANT' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'نام نمایشی قالب نقش', example: 'حسابدار ارشد مالی' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'توضیحات و مسئولیت‌های این نقش' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع تننت هدف این قالب نقش',
    enum: TenantType,
    default: TenantType.SCHOOL,
  })
  @IsEnum(TenantType)
  @IsOptional()
  targetTenantType?: TenantType;

  @ApiProperty({
    description: 'لیست کدهای پرمیشن اختصاص‌یافته به این قالب نقش',
    example: ['finance.fee.read', 'finance.fee.write', 'finance.payroll.read', 'finance.payroll.write'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}

export class DistributeRoleTemplateDto {
  @ApiPropertyOptional({
    description: 'لیست شناسه‌های مدارس مقصد (در صورت خالی بودن به همه مدارس با نوع منطبق توزیع می‌شود)',
    example: ['tenant-uuid-1', 'tenant-uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetTenantIds?: string[];
}
