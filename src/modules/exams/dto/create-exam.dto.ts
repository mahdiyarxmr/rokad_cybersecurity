import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType, ExamStatus } from '@prisma/client';

export class ExamQuestionItemDto {
  @ApiProperty({ description: 'شناسه سوال در بانک سوالات' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiPropertyOptional({ description: 'ترتیب سوال در آزمون', default: 1 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @ApiProperty({ description: 'بارم نمره اختصاص‌یافته به این سوال', example: 2.0 })
  @IsNumber()
  @Min(0.25)
  score: number;
}

export class CreateExamDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'شناسه ترم' })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiPropertyOptional({ description: 'شناسه پروفایل معلم طراح آزمون' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ description: 'عنوان آزمون', example: 'آزمون میان‌ترم حسابان ۱' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات و دستورالعمل آزمون' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع آزمون (ONLINE, PAPER_BASED, HYBRID)',
    enum: ExamType,
    default: ExamType.ONLINE,
  })
  @IsEnum(ExamType)
  @IsOptional()
  examType?: ExamType;

  @ApiPropertyOptional({
    description: 'نوع آزمون جهت سازگاری کلاینت',
    enum: ExamType,
  })
  @IsEnum(ExamType)
  @IsOptional()
  type?: ExamType;

  @ApiPropertyOptional({
    description: 'نوبت آزمون (CLASS_EXAM, CONTINUOUS, MIDTERM_1, FINAL_2)',
    example: 'CONTINUOUS',
  })
  @IsString()
  @IsOptional()
  round?: string;

  @ApiProperty({ description: 'مدت زمان آزمون به دقیقه', example: 60 })
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @ApiProperty({ description: 'زمان باز شدن آزمون', example: '2026-09-25T08:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'زمان پایان و مهلت شرکت در آزمون', example: '2026-09-25T12:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'سقف کل بارم آزمون', default: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalScore?: number;

  @ApiPropertyOptional({ description: 'حداقل نمره قبولی', default: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  passingScore?: number;

  @ApiPropertyOptional({ description: 'آیا سوالات برای هر دانش‌آموز بر زده شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ description: 'آیا گزینه‌های تستی برای هر دانش‌آموز بر زده شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ description: 'آیا مشاهده کارنامه و نمرات بلافاصله پس از آزمون فعال باشد؟', default: false })
  @IsBoolean()
  @IsOptional()
  showResultsImmediately?: boolean;

  @ApiPropertyOptional({ description: 'شناسه کلاس مخاطب آزمون (تک کلاس)' })
  @IsString()
  @IsOptional()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'لیست شناسه‌های کلاس‌های مخاطب آزمون' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  classroomIds?: string[];

  @ApiPropertyOptional({
    description: 'لیست سوالات و بارم‌بندی آزمون',
    type: [ExamQuestionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionItemDto)
  @IsOptional()
  questions?: ExamQuestionItemDto[];
}

export class AddExamQuestionDto {
  @ApiPropertyOptional({ description: 'شناسه سوال در بانک سوالات (اختیاری اگر از قبل موجود باشد)' })
  @IsString()
  @IsOptional()
  questionId?: string;

  @ApiPropertyOptional({ description: 'متن صورت سوال (در صورت ایجاد سوال جدید الزامی است)' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'نوع سوال', enum: ['MULTIPLE_CHOICE', 'DESCRIPTIVE'] })
  @IsString()
  @IsOptional()
  type?: 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';

  @ApiProperty({ description: 'بارم نمره اختصاص‌یافته به این سوال', example: 2.0 })
  @IsNumber()
  @Min(0.1)
  score: number;

  @ApiPropertyOptional({ description: 'گزینه‌های تستی سوال' })
  @IsArray()
  @IsOptional()
  options?: Array<{ text: string; isCorrect: boolean }>;

  @ApiPropertyOptional({ description: 'راهنمای حل و پاسخ تشریحی' })
  @IsString()
  @IsOptional()
  solutionExplanation?: string;
}

export class ImportFromBankDto {
  @ApiProperty({ description: 'لیست شناسه‌های سوالات انتخابی از بانک سوالات' })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];

  @ApiPropertyOptional({ description: 'بارم نمره پیش‌فرض برای هر سوال (اختیاری)' })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  defaultScore?: number;
}

export class BulkAddExamQuestionsDto {
  @ApiProperty({
    description: 'لیست سوالات استخراج‌شده از اکسل یا فرم جهت افزودن دسته‌جمعی',
    type: [AddExamQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddExamQuestionDto)
  questions: AddExamQuestionDto[];
}

