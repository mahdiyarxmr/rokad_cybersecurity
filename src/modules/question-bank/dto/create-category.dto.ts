import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
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
import { QuestionType, DifficultyLevel } from '@prisma/client';

export class CreateQuestionCategoryDto {
  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'نام سرفصل یا فصل کتاب', example: 'فصل اول: مشتق و کاربردهای آن' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش', default: 1 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class QuestionOptionDto {
  @ApiProperty({ description: 'متن گزینه', example: 'f\'(x) = 2x + 1' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'فرمول یا کد LaTeX/HTML' })
  @IsString()
  @IsOptional()
  formulaHtml?: string;

  @ApiPropertyOptional({ description: 'تصویر گزینه' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'آیا این گزینه صحیح است؟', default: false })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ description: 'شماره ترتیب گزینه (۱، ۲، ۳، ۴)', default: 1 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiPropertyOptional({ description: 'شناسه سرفصل موضوعی' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'نوع سوال (MULTIPLE_CHOICE, DESCRIPTIVE, TRUE_FALSE, FILL_IN_BLANK)',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'سطح سختی سوال (EASY, MEDIUM, HARD, OLYMPIAD)',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
  })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ description: 'متن صورت سوال', example: 'مشتق تابع y = x^2 + x را در نقطه x = 2 محاسبه نمایید.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'فرمول صورت سوال (LaTeX / HTML)' })
  @IsString()
  @IsOptional()
  formulaHtml?: string;

  @ApiPropertyOptional({ description: 'تصاویر سوال' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'بارم پیشنهادی سوال', default: 1.0 })
  @IsNumber()
  @Min(0.25)
  @IsOptional()
  defaultScore?: number;

  @ApiPropertyOptional({ description: 'زمان پیشنهادی پاسخگویی به ثانیه', default: 60 })
  @IsInt()
  @Min(10)
  @IsOptional()
  suggestedTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'پاسخ تشریحی کامل و راهنمای حل' })
  @IsString()
  @IsOptional()
  solutionExplanation?: string;

  @ApiPropertyOptional({
    description: 'گزینه‌های سوال (الزامی برای سوالات تستی و صحیح/غلط)',
    type: [QuestionOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @IsOptional()
  options?: QuestionOptionDto[];
}
