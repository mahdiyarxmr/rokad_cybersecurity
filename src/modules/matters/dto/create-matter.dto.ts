import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MatterType } from '@prisma/client';

export class CreateMatterDto {
  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({
    description: 'نوع مورد (POSITIVE, NEGATIVE, WARNING, SUSPENSION, COUNSELING_REFERRAL)',
    enum: MatterType,
    default: MatterType.POSITIVE,
  })
  @IsEnum(MatterType)
  type: MatterType;

  @ApiProperty({ description: 'عنوان مورد یا دستاورد', example: 'کسب رتبه اول مسابقات علمی' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'شرح کامل مورد انضباطی یا تشویقی' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'امتیاز مثبت یا کسر نمره انضباط', default: 0 })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ description: 'اقدام صورت‌گرفته (تذکر شفاهی، کتبی، دعوت از اولیا)' })
  @IsString()
  @IsOptional()
  actionTaken?: string;

  @ApiPropertyOptional({ description: 'آیا به اولیا اطلاع‌رسانی شود؟', default: false })
  @IsBoolean()
  @IsOptional()
  notifiedParents?: boolean;
}
