import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVisitSlotDto {
  @ApiPropertyOptional({ description: 'شناسه پروفایل معلم یا مشاور' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ description: 'تاریخ به فرمت YYYY-MM-DD', example: '2026-09-12' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'ساعت شروع', example: '10:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'ساعت پایان', example: '10:20' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: 'مدت جلسه به دقیقه', default: 15 })
  @IsInt()
  @Min(5)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'ظرفیت اسلات (تعداد اولیا همزمان)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacityPerSlot?: number;

  @ApiPropertyOptional({ description: 'محل ملاقات (اتاق مشاوره، دفتر اساتید)' })
  @IsString()
  @IsOptional()
  roomLocation?: string;

  @ApiPropertyOptional({ description: 'آیا جلسه به صورت آنلاین/مجازی است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isVirtual?: boolean;

  @ApiPropertyOptional({ description: 'لینک جلسه آنلاین در صورت مجازی بودن' })
  @IsString()
  @IsOptional()
  virtualMeetingUrl?: string;
}

export class BookVisitDto {
  @ApiProperty({ description: 'شناسه اسلات زمانی ملاقات' })
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز مورد نظر' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'موضوع یا دلیل درخواست ملاقات', example: 'بررسی وضعیت پیشرفت درسی درس حسابان' })
  @IsString()
  @IsNotEmpty()
  subject: string;
}
