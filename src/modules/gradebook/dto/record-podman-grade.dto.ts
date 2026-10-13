import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkRecordPodmanGradeItemDto {
  @ApiProperty({ description: 'شناسه دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'نمره مستمر پودمان (بین ۰ تا ۵)', example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  continuousScore: number;

  @ApiProperty({
    description: 'سطح شایستگی پایانی پودمان (۱: عدم احراز، ۲: در حد انتظار، ۳: بالاتر از حد انتظار)',
    example: 3,
  })
  @IsInt()
  @IsIn([1, 2, 3])
  competencyScore: number;

  @ApiPropertyOptional({ description: 'یادداشت یا توضیحات برای ارزشیابی دانش‌آموز' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkRecordPodmanGradeDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiProperty({ description: 'شناسه درس پودمانی' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'شماره پودمان (۱ تا ۵)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  podmanNumber: number;

  @ApiPropertyOptional({ description: 'شناسه پروفایل هنرآموز/معلم' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'نوبت ارزشیابی (REGULAR: اصلی، RETAKE_1: جبرانی دی‌ماه، RETAKE_2: جبرانی خرداد/شهریور)',
    default: 'REGULAR',
    enum: ['REGULAR', 'RETAKE_1', 'RETAKE_2'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['REGULAR', 'RETAKE_1', 'RETAKE_2'])
  attemptType?: string;

  @ApiPropertyOptional({ description: 'تاریخ ثبت ارزشیابی پودمان' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'لیست نمرات مستمر و شایستگی دانش‌آموزان کلاس برای این پودمان',
    type: [BulkRecordPodmanGradeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecordPodmanGradeItemDto)
  grades: BulkRecordPodmanGradeItemDto[];
}
