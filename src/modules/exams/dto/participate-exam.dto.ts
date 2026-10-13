import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerItemDto {
  @ApiProperty({ description: 'شناسه سوال' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiPropertyOptional({ description: 'شناسه گزینه انتخاب‌شده برای سوالات تستی' })
  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @ApiPropertyOptional({ description: 'پاسخ متنی/تشریحی دانش‌آموز' })
  @IsString()
  @IsOptional()
  descriptiveAnswer?: string;

  @ApiPropertyOptional({ description: 'پاسخ متنی/تشریحی دانش‌آموز (نام فیلد جایگزین فرانت‌اند)' })
  @IsString()
  @IsOptional()
  textAnswer?: string;
}

export class SubmitExamAnswersDto {
  @ApiPropertyOptional({ description: 'تعداد دفعات تعویض تب/ترک صفحه آزمون (سیگنال نرم جهت بررسی دبیر)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  tabSwitchCount?: number;

  @ApiProperty({
    description: 'پاسخ‌های ثبت‌شده',
    type: [SubmitAnswerItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers: SubmitAnswerItemDto[];
}

export class GradeDescriptiveAnswerDto {
  @ApiProperty({ description: 'شناسه سوال آزمون' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'نمره داده‌شده توسط معلم', example: 1.75 })
  @IsNumber()
  @Min(0)
  scoreAwarded: number;

  @ApiPropertyOptional({ description: 'بازخورد یا کامنت دبیر روی پاسخ' })
  @IsString()
  @IsOptional()
  teacherComment?: string;
}

export class GradeExamParticipationDto {
  @ApiPropertyOptional({ description: 'بازخورد کلی معلم روی آزمون دانش‌آموز' })
  @IsString()
  @IsOptional()
  teacherFeedback?: string;

  @ApiPropertyOptional({ description: 'نمره ارفاقی اضافه شده توسط دبیر', example: 1.5, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  graceScore?: number;

  @ApiPropertyOptional({ description: 'علت یا توضیحات نمره ارفاقی' })
  @IsString()
  @IsOptional()
  graceReason?: string;

  @ApiProperty({
    description: 'نمرات ثبت‌شده برای پاسخ‌های تشریحی',
    type: [GradeDescriptiveAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeDescriptiveAnswerDto)
  grades: GradeDescriptiveAnswerDto[];
}
