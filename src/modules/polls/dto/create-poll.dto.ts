import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PollType, TargetAudience } from '@prisma/client';

export class CreatePollOptionDto {
  @ApiProperty({ description: 'متن گزینه نظرسنجی', example: 'بله، کاملاً موافقم' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export const PORSCAD_QUESTION_TYPES = [
  'choice',
  'picture_choice',
  'dropdown',
  'yes_no',
  'likert',
  'nps',
  'rating',
  'matrix',
  'ranking',
  'short_text',
  'long_text',
  'number',
  'email',
  'phone_ir',
  'link',
  'telegram_id',
  'statement',
  'group',
  'file_upload',
  'payment',
  // legacy Rokad type kept for old polls
  'opinion_scale',
] as const;
export type PorscadQuestionType = (typeof PORSCAD_QUESTION_TYPES)[number];

export class CreateSurveyQuestionDto {
  @ApiProperty({
    description:
      'نوع سوال پرس‌کاد (choice, picture_choice, dropdown, yes_no, likert, nps, rating, matrix, ranking, short_text, long_text, number, email, phone_ir, link, telegram_id, statement, group, file_upload, payment)',
    example: 'choice',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'متن سوال', example: 'کیفیت خدمات مدرسه چگونه بود؟' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات سوال' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'متن راهنما داخل کادر' })
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'گزینه‌های پاسخ (برای choice و dropdown)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({ description: 'حداکثر انتخاب (تک/چندگزینه‌ای)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSelections?: number;

  @ApiPropertyOptional({ description: 'پاسخ اجباری', default: true })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ description: 'نحوه نمایش گزینه‌ها', enum: ['buttons', 'list'] })
  @IsString()
  @IsOptional()
  displayMode?: 'buttons' | 'list';

  @ApiPropertyOptional({ description: 'تنظیمات اعتبارسنجی پرس‌کاد (min, max, step, minLength, maxLength, ...)' })
  @IsObject()
  @IsOptional()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'شروط پرش به سوالات دیگر' })
  @IsArray()
  @IsOptional()
  jump_actions?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'شروط نمایش پرس‌کاد' })
  @IsArray()
  @IsOptional()
  conditions?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'امتیاز یا نمره سوال' })
  @IsInt()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ description: 'پاسخ صحیح سوال' })
  @IsOptional()
  correct_answer?: unknown;

  @ApiPropertyOptional({ description: 'شناسه سوال در پرس‌کاد (اختیاری؛ سرور از porscadMeta بازسازی می‌کند)' })
  @IsString()
  @IsOptional()
  porscadQuestionId?: string | null;
}

export class CreatePollDto {
  @ApiProperty({ description: 'عنوان نظرسنجی', example: 'نظرسنجی کیفیت اردوهای علمی و آموزشی' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات نظرسنجی' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع نظرسنجی (SINGLE_CHOICE, MULTIPLE_CHOICE, RATING_SCALE)',
    enum: PollType,
    default: PollType.SINGLE_CHOICE,
  })
  @IsEnum(PollType)
  @IsOptional()
  pollType?: PollType;

  @ApiPropertyOptional({
    description: 'مخاطبان نظرسنجی (ALL, STUDENTS, PARENTS, TEACHERS, STAFF)',
    enum: TargetAudience,
    default: TargetAudience.ALL,
  })
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @ApiPropertyOptional({ description: 'شناسه کلاس‌های مخاطب' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiProperty({ description: 'تاریخ شروع نظرسنجی', example: '2026-09-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ پایان نظرسنجی', example: '2026-09-20T23:59:59.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا آرا به صورت ناشناس ذخیره شود؟', default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'آیا پاسخ‌دهی به این نظرسنجی برای مخاطبان اجباری و تکلیفی است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'جلوگیری از ثبت پاسخ تکراری توسط یک کاربر', default: true })
  @IsBoolean()
  @IsOptional()
  preventDuplicate?: boolean;

  @ApiProperty({
    description: 'لیست گزینه‌های نظرسنجی (حداقل ۲ گزینه برای تک/چند انتخابی)',
    type: [CreatePollOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  @IsOptional()
  options?: CreatePollOptionDto[];

  @ApiPropertyOptional({
    description: 'سوالات فرم پرس‌کاد (چندسؤالی، مرحله‌به‌مرحله)',
    type: [CreateSurveyQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  @IsOptional()
  questions?: CreateSurveyQuestionDto[];

  @ApiPropertyOptional({ description: 'شناسه فرم پرس‌کاد پس از ایجاد در سامانه' })
  @IsString()
  @IsOptional()
  porscadFormId?: string;

  @ApiPropertyOptional({ description: 'شناسه عمومی فرم پرس‌کاد' })
  @IsString()
  @IsOptional()
  porscadFormPublicId?: string;

  @ApiPropertyOptional({ description: 'شناسه‌های سوالات پرس‌کاد (questionId به ترتیب)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  porscadQuestionIds?: string[];

  @ApiPropertyOptional({ description: 'متادیتای فرم پرس‌کاد' })
  @IsObject()
  @IsOptional()
  porscadMeta?: Record<string, unknown>;
}

export class SubmitPollAnswersDto {
  @ApiProperty({
    description: 'پاسخ‌های سؤال‌ها: { [questionId یا index]: مقدار }',
    example: { '0': 'گزینه الف', '1': 4 },
  })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string | number | boolean | string[]>;

  @ApiPropertyOptional({ description: 'شناسه پاسخ پرس‌کاد پس از ثبت' })
  @IsString()
  @IsOptional()
  porscadResponseId?: string;

  @ApiPropertyOptional({ description: 'نام پاسخ‌دهنده (از اکانت کاربر)' })
  @IsString()
  @IsOptional()
  respondentName?: string;
}

export class CastVoteDto {
  @ApiPropertyOptional({ description: 'شناسه گزینه‌های انتخاب‌شده' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ description: 'امتیاز عددی (بین ۱ تا ۵)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  ratingValue?: number;

  @ApiPropertyOptional({ description: 'پاسخ یا نظر متنی تشریحی' })
  @IsString()
  @IsOptional()
  textResponse?: string;
}

export type PollStatusAction =
  | 'close'
  | 'open'
  | 'archive'
  | 'unarchive';

export class UpdatePollStatusDto {
  @ApiProperty({
    description: 'عملیات وضعیت: close (بستن), open (بازگشایی), archive (آرشیو), unarchive (خروج از آرشیو)',
    enum: ['close', 'open', 'archive', 'unarchive'],
  })
  @IsIn(['close', 'open', 'archive', 'unarchive'])
  action: PollStatusAction;
}
