import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
export enum LessonType {
  GENERAL = 'GENERAL',
  NON_TECHNICAL_COMPETENCY = 'NON_TECHNICAL_COMPETENCY',
  BASIC_COMPETENCY = 'BASIC_COMPETENCY',
  TECHNICAL_MODULAR_COMPETENCY = 'TECHNICAL_MODULAR_COMPETENCY',
  TECHNICAL_PRACTICAL_COMPETENCY = 'TECHNICAL_PRACTICAL_COMPETENCY',
  SPECIALIZED = 'SPECIALIZED',
  PRACTICAL = 'PRACTICAL',
  OPTIONAL = 'OPTIONAL',
  EXTRACURRICULAR = 'EXTRACURRICULAR',
}

export enum DayOfWeek {
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
}

export class CreateLessonDto {
  @ApiPropertyOptional({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsOptional()
  levelId?: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiProperty({ description: 'نام درس یا کتاب', example: 'حسابان ۱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد یکتای درس در مدرسه', example: 'CALC-10' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'تعداد واحد یا ضریب درس', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  unitCount?: number;

  @ApiPropertyOptional({
    description: 'نوع درس (GENERAL, SPECIALIZED, PRACTICAL, OPTIONAL)',
    enum: LessonType,
    default: 'GENERAL',
  })
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @ApiPropertyOptional({ description: 'توضیحات یا سرفصل درس' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'آیا درس به صورت پودمانی است؟ (مخصوص دروس فنی و مهارتی هنرستان)', default: false })
  @IsBoolean()
  @IsOptional()
  isModular?: boolean;

  @ApiPropertyOptional({ description: 'تعداد پودمان‌های درس (پیش‌فرض ۵ پودمان)', default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  podmanCount?: number;

  @ApiPropertyOptional({ description: 'عناوین پودمان‌ها (اختیاری)', type: [String] })
  @IsOptional()
  podmanTitles?: string[];

  @ApiPropertyOptional({ description: 'شناسه دبیران مدرس درس', type: [String] })
  @IsOptional()
  teacherIds?: string[];
}

export class UpdateLessonDto {
  @ApiPropertyOptional({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsOptional()
  levelId?: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiPropertyOptional({ description: 'نام درس یا کتاب', example: 'حسابان ۱' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'کد یکتای درس در مدرسه', example: 'CALC-10' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'تعداد واحد یا ضریب درس', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  unitCount?: number;

  @ApiPropertyOptional({
    description: 'نوع درس (GENERAL, NON_TECHNICAL_COMPETENCY, BASIC_COMPETENCY, TECHNICAL_MODULAR_COMPETENCY, TECHNICAL_PRACTICAL_COMPETENCY, SPECIALIZED, PRACTICAL, OPTIONAL)',
    enum: LessonType,
  })
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @ApiPropertyOptional({ description: 'توضیحات یا سرفصل درس' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'آیا درس به صورت پودمانی است؟' })
  @IsBoolean()
  @IsOptional()
  isModular?: boolean;

  @ApiPropertyOptional({ description: 'تعداد پودمان‌های درس', default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  podmanCount?: number;

  @ApiPropertyOptional({ description: 'عناوین پودمان‌ها (اختیاری)', type: [String] })
  @IsOptional()
  podmanTitles?: string[];

  @ApiPropertyOptional({ description: 'شناسه دبیران مدرس درس', type: [String] })
  @IsOptional()
  teacherIds?: string[];
}

export class CreateClassroomDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsOptional()
  levelId?: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiPropertyOptional({ description: 'شناسه کاربر معلم راهنما / سرپرست کلاس' })
  @IsString()
  @IsOptional()
  mentorId?: string;

  @ApiProperty({ description: 'نام کلاس', example: 'کلاس دهم ریاضی ۱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'کد یکتای کلاس', example: 'CLS-10-M1' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'ظرفیت کلاس', default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: 'شماره یا نام اتاق فیزیکی', example: 'اتاق ۱۰۱' })
  @IsString()
  @IsOptional()
  roomNumber?: string;
}

export class UpdateClassroomDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'شناسه مقطع تحصیلی' })
  @IsString()
  @IsOptional()
  levelId?: string;

  @ApiPropertyOptional({ description: 'شناسه رشته تحصیلی' })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiPropertyOptional({ description: 'شناسه کاربر معلم راهنما / سرپرست کلاس' })
  @IsString()
  @IsOptional()
  mentorId?: string;

  @ApiPropertyOptional({ description: 'نام کلاس', example: 'کلاس دهم ریاضی ۱' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'کد یکتای کلاس', example: 'CLS-10-M1' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'ظرفیت کلاس', default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: 'شماره یا نام اتاق فیزیکی', example: 'اتاق ۱۰۱' })
  @IsString()
  @IsOptional()
  roomNumber?: string;
}

export class EnrollStudentDto {
  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه درس' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({
    description: 'روز هفته',
    enum: DayOfWeek,
    example: 'SATURDAY',
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'شماره زنگ کلاسی (۱، ۲، ۳...)', example: 1 })
  @IsInt()
  @Min(1)
  periodNumber: number;

  @ApiProperty({ description: 'ساعت شروع', example: '07:30' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'ساعت پایان', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: 'آیا در صورت وجود زنگ درسی قبلی، جایگزین شود؟' })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;

  @ApiPropertyOptional({ description: 'تایید و ثبت حتی با وجود تداخل زمانی دبیر (عدم مسدودسازی)' })
  @IsOptional()
  @IsBoolean()
  allowTeacherConflict?: boolean;

  @ApiPropertyOptional({ description: 'آیا اسلات به صورت یک هفته در میان (هفته فرد و زوج) باشد؟' })
  @IsOptional()
  @IsBoolean()
  isSplitPeriod?: boolean;

  @ApiPropertyOptional({ description: 'شناسه درس هفته زوج در صورت یک هفته در میان بودن' })
  @IsOptional()
  @IsString()
  secondLessonId?: string;

  @ApiPropertyOptional({ description: 'شناسه دبیر هفته زوج در صورت یک هفته در میان بودن' })
  @IsOptional()
  @IsString()
  secondTeacherId?: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
