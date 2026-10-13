import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonPlanSessionStatus } from '@prisma/client';

export class CreateSessionItemDto {
  @ApiProperty({ description: 'شماره جلسه تدریس', example: 1 })
  @IsInt()
  @Min(1)
  sessionNumber: number;

  @ApiProperty({ description: 'عنوان مبحث درس', example: 'مفهوم مشتق و تعبیر هندسی' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiPropertyOptional({ description: 'اهداف یادگیری جلسه' })
  @IsString()
  @IsOptional()
  objectives?: string;

  @ApiPropertyOptional({ description: 'فعالیت‌های کلاسی و وسایل کمک‌آموزشی' })
  @IsString()
  @IsOptional()
  activities?: string;

  @ApiPropertyOptional({ description: 'تاریخ برنامه‌ریزی‌شده تدریس', example: '2026-09-24T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  plannedDate?: string;
}

export class CreateLessonPlanDto {
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

  @ApiPropertyOptional({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ description: 'عنوان طرح درس', example: 'طرح درس جامع سالانه حسابان ۱' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات و اهداف کلی طرح درس' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'مجموع ساعت تدریس مصوب', default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalHoursPlanned?: number;

  @ApiPropertyOptional({
    description: 'لیست جلسات اولیه طرح درس',
    type: [CreateSessionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionItemDto)
  @IsOptional()
  sessions?: CreateSessionItemDto[];

  @ApiPropertyOptional({ description: 'شماره جلسه اولیه' })
  @IsOptional()
  sessionNumber?: number;

  @ApiPropertyOptional({ description: 'سرفصل‌های جلسه' })
  @IsString()
  @IsOptional()
  topics?: string;

  @ApiPropertyOptional({ description: 'اهداف آموزشی جلسه' })
  @IsString()
  @IsOptional()
  pedagogicalGoal?: string;
}

export class UpdateSessionStatusDto {
  @ApiProperty({
    description: 'وضعیت جلسه تدریس (PLANNED, COMPLETED, IN_PROGRESS, CANCELLED, MAKEUP_REQUIRED)',
    enum: LessonPlanSessionStatus,
    default: LessonPlanSessionStatus.COMPLETED,
  })
  @IsEnum(LessonPlanSessionStatus)
  status: LessonPlanSessionStatus;

  @ApiPropertyOptional({ description: 'تاریخ تدریس واقعی', example: '2026-09-24T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  actualDate?: string;

  @ApiPropertyOptional({ description: 'یادداشت یا توضیحات معلم' })
  @IsString()
  @IsOptional()
  notes?: string;
}
