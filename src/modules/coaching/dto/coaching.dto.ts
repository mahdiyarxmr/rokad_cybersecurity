import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCoachDto {
  @ApiProperty({ description: 'شناسه کاربری دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'شناسه کاربری کوچ' })
  @IsString()
  @IsNotEmpty()
  coachId: string;

  @ApiPropertyOptional({ description: 'روز هفته جلسه (0=شنبه, 1=یکشنبه, ..., 5=پنج‌شنبه)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  slotDayOfWeek?: number;

  @ApiPropertyOptional({ description: 'ساعت شروع جلسه (مثلاً 10:20)' })
  @IsOptional()
  @IsString()
  slotStartTime?: string;

  @ApiPropertyOptional({ description: 'ساعت پایان جلسه (مثلاً 10:40)' })
  @IsOptional()
  @IsString()
  slotEndTime?: string;

  @ApiPropertyOptional({ description: 'مدت جلسه به دقیقه (پیش‌فرض ۲۰ دقیقه)' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'یادداشت یا هماهنگی‌های اولیه' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'], description: 'وضعیت حضور و غیاب' })
  @IsOptional()
  @IsEnum(['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'])
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';

  @ApiPropertyOptional({ description: 'یادداشت‌ها و نکات ثبت‌شده توسط کوچ' })
  @IsOptional()
  @IsString()
  coachNotes?: string;

  @ApiPropertyOptional({ description: 'اهداف، تکالیف و برنامه‌های تعیین‌شده برای جلسه بعد' })
  @IsOptional()
  @IsString()
  actionItems?: string;
}

export class CreateExtraRequestDto {
  @ApiProperty({ description: 'دلیل یا موضوع نیاز به جلسه فوق‌العاده' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'تاریخ یا زمان پیشنهادی دانش‌آموز' })
  @IsOptional()
  @IsString()
  preferredDate?: string;
}

export class RespondExtraRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], description: 'نتیجه بررسی درخواست' })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'توضیحات کوچ' })
  @IsOptional()
  @IsString()
  coachResponse?: string;

  @ApiPropertyOptional({ description: 'تاریخ و زمان تعیین‌شده برای جلسه فوق‌العاده (ISO Date String)' })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'مدت جلسه به دقیقه (پیش‌فرض ۲۰)' })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;
}
