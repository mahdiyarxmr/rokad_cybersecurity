import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitEventIdeaDto {
  @ApiProperty({ description: 'عنوان ایده' })
  @IsString()
  @IsNotEmpty({ message: 'عنوان ایده الزامی است' })
  title: string;

  @ApiProperty({ description: 'توضیحات ایده' })
  @IsString()
  @IsNotEmpty({ message: 'توضیحات ایده الزامی است' })
  description: string;

  @ApiPropertyOptional({ description: 'دسته‌بندی ایده' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'اهداف طرح' })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiPropertyOptional({ description: 'متریال پیشنهادی' })
  @IsString()
  @IsOptional()
  suggestedMaterials?: string;

  @ApiPropertyOptional({ description: 'فایل ضمیمه' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'نام نویسنده در صورت ارسال دستی' })
  @IsString()
  @IsOptional()
  authorName?: string;
}

export class UpdateEventIdeaDto {
  @ApiPropertyOptional({ description: 'عنوان ایده' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'توضیحات ایده' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'وضعیت ایده' })
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  @IsOptional()
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'شماره ایده' })
  @IsNumber()
  @IsOptional()
  ideaNumber?: number;

  @ApiPropertyOptional({ description: 'نام نویسنده' })
  @IsString()
  @IsOptional()
  authorName?: string;
}

export class UpdateEventWizardStepsDto {
  @ApiPropertyOptional({ description: 'لیست مراحل بازگشایی‌شده برای دانش‌آموزان' })
  @IsArray()
  @IsOptional()
  unlockedSteps?: number[];

  @ApiPropertyOptional({ description: 'آیا ثبت ایده جدید قفل است؟' })
  @IsBoolean()
  @IsOptional()
  isIdeaSubmissionLocked?: boolean;
}

export class UpdateEventTeamsDto {
  @ApiProperty({ description: 'داده‌های تیم‌های تشکیل‌شده' })
  teams: Record<string, any>;
}

export class SubmitEventVoteDto {
  @ApiProperty({ description: 'شناسه‌های گزینه‌های انتخابی' })
  @IsArray()
  selectedOptionIds: string[];
}
