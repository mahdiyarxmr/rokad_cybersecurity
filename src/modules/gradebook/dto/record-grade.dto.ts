import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradeType } from '@prisma/client';

export class BulkRecordGradeItemDto {
  @ApiProperty({ description: 'شناسه دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'نمره کسب‌شده (بین ۰ تا سقف مجاز)', example: 18.5 })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ description: 'یادداشت یا توضیحات برای نمره دانش‌آموز' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkRecordGradeDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'شناسه ترم تحصیلی' })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiPropertyOptional({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'شناسه آزمون متصل به این نمره' })
  @IsString()
  @IsOptional()
  examId?: string;

  @ApiProperty({
    description: 'نوع نمره (CLASS_ACTIVITY, QUIZ, HOMEWORK_GRADE, MIDTERM, FINAL_TERM_1, FINAL_TERM_2, CUSTOM)',
    enum: GradeType,
    default: GradeType.CLASS_ACTIVITY,
  })
  @IsEnum(GradeType)
  gradeType: GradeType;

  @ApiProperty({ description: 'عنوان ستون نمره', example: 'ارزیابی مستمر مهرماه' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'سقف کل نمره', default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({ description: 'ضریب وزنی این آزمون در محاسبه معدل کلاسی', default: 1.0 })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'تاریخ ثبت نمره', example: '2026-09-28T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'لیست نمرات دانش‌آموزان',
    type: [BulkRecordGradeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecordGradeItemDto)
  grades: BulkRecordGradeItemDto[];
}
