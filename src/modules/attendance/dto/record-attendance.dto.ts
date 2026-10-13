import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, TeacherAttendanceStatus, DisciplinaryRewardType } from '@prisma/client';

export class SingleStudentAttendanceItemDto {
  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'وضعیت حضور (PRESENT, ABSENT, TARDY, EXCUSED_ABSENT, EXPELLED)',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'میزان تاخیر به دقیقه (در صورت وضعیت TARDY)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayMinutes?: number;

  @ApiPropertyOptional({ description: 'توضیح یا دلیل غیبت/تاخیر' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'نمره پرسش کلاسی از ۲۰ (اختیاری)', example: 18.5 })
  @IsNumber()
  @Min(0)
  @Max(20)
  @IsOptional()
  oralGrade?: number;

  @ApiPropertyOptional({
    description: 'نوع مورد انضباطی یا تشویقی جلسه',
    enum: DisciplinaryRewardType,
  })
  @IsEnum(DisciplinaryRewardType)
  @IsOptional()
  rewardDisciplineType?: DisciplinaryRewardType;

  @ApiPropertyOptional({ description: 'شرح مورد تشویقی یا انضباطی' })
  @IsString()
  @IsOptional()
  rewardDisciplineNote?: string;

  @ApiPropertyOptional({ description: 'یادداشت اختصاصی جلسه دبیر برای این دانش‌آموز' })
  @IsString()
  @IsOptional()
  sessionNote?: string;
}

export class BulkRecordStudentAttendanceDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی (اختیاری - خودکار از کلاس استخراج می‌شود)' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional({ description: 'شناسه درس' })
  @IsString()
  @IsOptional()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'شناسه برنامه هفتگی' })
  @IsString()
  @IsOptional()
  scheduleId?: string;

  @ApiProperty({ description: 'تاریخ حضور و غیاب به فرمت YYYY-MM-DD', example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'شماره زنگ کلاسی (null برای روزانه کل)', example: 1 })
  @IsInt()
  @IsOptional()
  periodNumber?: number;

  @ApiProperty({
    description: 'لیست وضعیت حضور و غیاب دانش‌آموزان کلاس',
    type: [SingleStudentAttendanceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleStudentAttendanceItemDto)
  attendances: SingleStudentAttendanceItemDto[];
}

export class RecordTeacherAttendanceDto {
  @ApiProperty({ description: 'شناسه پروفایل معلم' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'تاریخ به فرمت YYYY-MM-DD', example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'ساعت ورود', example: '07:30' })
  @IsString()
  @IsOptional()
  entryTime?: string;

  @ApiPropertyOptional({ description: 'ساعت خروج', example: '13:50' })
  @IsString()
  @IsOptional()
  exitTime?: string;

  @ApiProperty({
    description: 'وضعیت تردد معلم',
    enum: TeacherAttendanceStatus,
    default: TeacherAttendanceStatus.PRESENT,
  })
  @IsEnum(TeacherAttendanceStatus)
  status: TeacherAttendanceStatus;

  @ApiPropertyOptional({ description: 'توضیحات یا علت مرخصی' })
  @IsString()
  @IsOptional()
  notes?: string;
}
