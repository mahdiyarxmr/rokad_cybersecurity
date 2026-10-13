import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSchoolRoleDto {
  @ApiProperty({ description: 'نام نقش در مدرسه (مانند ناظم پایه دهم، حسابدار)', example: 'ناظم پایه دهم' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'توضیحات نقش' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'لیست کدهای پرمیشن منتسب به این نقش',
    example: ['attendance.read', 'attendance.write', 'student.read'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}

export class UpdateSchoolRoleDto {
  @ApiPropertyOptional({ description: 'نام نقش در مدرسه' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'توضیحات نقش' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'لیست کدهای پرمیشن منتسب به این نقش',
    example: ['attendance.read', 'attendance.write'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}

export class AssignRoleDto {
  @ApiProperty({ description: 'شناسه کاربری' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'شناسه نقش مدرسه' })
  @IsString()
  @IsNotEmpty()
  schoolRoleId: string;
}

export class SyncUserRolesDto {
  @ApiProperty({
    description: 'لیست شناسه‌های نقش‌های سازمانی مدرسه برای این کاربر',
    example: ['uuid-role-1', 'uuid-role-2'],
  })
  @IsArray()
  @IsString({ each: true })
  schoolRoleIds: string[];
}

export class SetUserOverrideDto {
  @ApiProperty({ description: 'کد فنی پرمیشن', example: 'finance.fee.read' })
  @IsString()
  @IsNotEmpty()
  permissionCode: string;

  @ApiProperty({
    description: 'نوع اثر اورراید (GRANT یا REVOKE)',
    enum: ['GRANT', 'REVOKE'],
    example: 'GRANT',
  })
  @IsString()
  @IsIn(['GRANT', 'REVOKE'])
  effect: 'GRANT' | 'REVOKE';

  @ApiPropertyOptional({ description: 'دلیل اعطا یا سلب موردی دسترسی' })
  @IsString()
  @IsOptional()
  reason?: string;
}
