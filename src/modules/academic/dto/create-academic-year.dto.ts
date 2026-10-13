import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({ description: 'عنوان سال تحصیلی', example: '۱۴۰۴-۱۴۰۵' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'تاریخ شروع سال تحصیلی', example: '2025-09-23T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ پایان سال تحصیلی', example: '2026-06-20T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا سال تحصیلی جاری است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto {
  @ApiPropertyOptional({ description: 'عنوان سال تحصیلی', example: '۱۴۰۴-۱۴۰۵' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'تاریخ شروع سال تحصیلی', example: '2025-09-23T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاریخ پایان سال تحصیلی', example: '2026-06-20T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'آیا سال تحصیلی جاری است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class CreateTermDto {
  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'نام ترم (نیم‌سال اول، نیم‌سال دوم، تابستان)', example: 'نیم‌سال اول' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'تاریخ شروع ترم', example: '2025-09-23T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ پایان ترم', example: '2026-01-20T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا ترم جاری است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateTermDto {
  @ApiPropertyOptional({ description: 'نام ترم (نیم‌سال اول، نیم‌سال دوم، تابستان)', example: 'نیم‌سال اول' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'تاریخ شروع ترم', example: '2025-09-23T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاریخ پایان ترم', example: '2026-01-20T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'آیا ترم جاری است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class CreateEducationalLevelDto {
  @ApiProperty({ description: 'نام مقطع تحصیلی (ابتدایی، متوسطه اول، متوسطه دوم، کالج)', example: 'متوسطه دوم' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد مقطع تحصیلی', example: 'HIGH_SCHOOL_2' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش', default: 1 })
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class CreateStudyFieldDto {
  @ApiProperty({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsNotEmpty()
  levelId: string;

  @ApiProperty({ description: 'نام رشته تحصیلی (ریاضی و فیزیک، علوم تجربی، شبکه)', example: 'ریاضی و فیزیک' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد رشته', example: 'MATH_PHYSICS' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
