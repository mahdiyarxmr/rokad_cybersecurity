import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, TargetAudience } from '@prisma/client';

export class EventWorkflowModuleDto {
  @ApiProperty({ description: 'کلید ماژول (IDEA_SUBMISSION, IDEA_HALL, VOTING, TEAM_FORMATION, EVENT_CANVAS)' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'شماره مرحله (از ۱ شروع می‌شود)' })
  @IsNotEmpty()
  step: number;

  @ApiPropertyOptional({ description: 'فعال بودن ماژول', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class CreateEventDto {
  @ApiProperty({ description: 'عنوان رویداد', example: 'برگزاری اولین آزمون جامع ترم اول' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی رویداد' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع یا دسته‌بندی رویداد (ACADEMIC, STARTUP_WEEKEND, ... یا کلید سفارشی)',
    default: 'ACADEMIC',
  })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'کد نوع رویداد',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'نوع پایه سیستمی برای انوم دیتابیس (ACADEMIC, EXAM, MEETING, ...)',
  })
  @IsString()
  @IsOptional()
  baseType?: string;

  @ApiProperty({ description: 'تاریخ و زمان شروع', example: '2026-09-15T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاریخ و زمان پایان', example: '2026-09-15T12:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'آیا رویداد کل روز است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'مخاطبان هدف رویداد (ALL, STUDENTS, TEACHERS, PARENTS, STAFF, SPECIFIC_CLASSES)',
    enum: TargetAudience,
    default: TargetAudience.ALL,
  })
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @ApiPropertyOptional({ description: 'شناسه کلاس‌های هدف (در صورت مخاطب خاص)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiPropertyOptional({ description: 'محل برگزاری (سالن همایش، اتاق جلسه، آنلاین)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر کاور یا بنر رویداد' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'برچسب‌های رویداد', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'کلید دسته‌بندی سفارشی (در صورت وجود)' })
  @IsString()
  @IsOptional()
  categoryKey?: string;

  @ApiPropertyOptional({
    description: 'ماژول‌های جریان کار رویداد (آرایه‌ای از {key, step, enabled})',
    type: [EventWorkflowModuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventWorkflowModuleDto)
  workflowModules?: EventWorkflowModuleDto[];
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'عنوان رویداد' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی رویداد' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'نوع یا دسته‌بندی رویداد' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ description: 'کد نوع رویداد' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'نوع پایه سیستمی برای انوم دیتابیس' })
  @IsString()
  @IsOptional()
  baseType?: string;

  @ApiPropertyOptional({ description: 'تاریخ و زمان شروع' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاریخ و زمان پایان' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'آیا رویداد کل روز است؟' })
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional({ enum: TargetAudience })
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiPropertyOptional({ description: 'محل برگزاری' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر کاور رویداد' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'کلید دسته‌بندی سفارشی (در صورت وجود)' })
  @IsString()
  @IsOptional()
  categoryKey?: string;

  @ApiPropertyOptional({
    description: 'ماژول‌های جریان کار رویداد',
    type: [EventWorkflowModuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventWorkflowModuleDto)
  workflowModules?: EventWorkflowModuleDto[];
}
