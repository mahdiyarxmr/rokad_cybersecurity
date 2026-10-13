import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateHomeworkDto {
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

  @ApiProperty({ description: 'عنوان تکلیف', example: 'حل مسائل فصل اول حسابان' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'توضیحات و سرفصل تکلیف' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'فایل‌های پیوست تکلیف (لینک دانلود)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[];

  @ApiProperty({ description: 'مهلت تحویل تکلیف', example: '2026-09-10T23:59:59.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'سقف نمره تکلیف', default: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({ description: 'آیا تکلیف دارای نمره است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isGraded?: boolean;

  @ApiPropertyOptional({ description: 'آیا تحویل با تاخیر مجاز است؟', default: false })
  @IsBoolean()
  @IsOptional()
  allowLateSubmissions?: boolean;

  @ApiPropertyOptional({ description: 'تاریخ و زمان برنامه‌ریزی‌شده برای انتشار تکلیف' })
  @IsDateString()
  @IsOptional()
  publishAt?: string;
}

export class SubmitHomeworkDto {
  @ApiPropertyOptional({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'یادداشت یا پاسخ متنی دانش‌آموز' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'فایل‌های ارسالی دانش‌آموز' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[];
}

export class GradeSubmissionDto {
  @ApiProperty({ description: 'نمره ثبت‌شده', example: 18.5 })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ description: 'بازخورد یا توضیحات دبیر' })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ description: 'آیا نیاز به ارسال مجدد دارد؟', default: false })
  @IsBoolean()
  @IsOptional()
  resubmitRequired?: boolean;
}
