import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'شناسه ترم تحصیلی' })
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

  @ApiProperty({ description: 'عنوان جزوه یا محتوای آموزشی', example: 'جزوه دست‌نویس حل تمرین‌های فصل اول' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات تکمیلی' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع محتوا (DOCUMENT, VIDEO, AUDIO, LINK, ARCHIVE)',
    enum: MaterialType,
    default: MaterialType.DOCUMENT,
  })
  @IsEnum(MaterialType)
  @IsOptional()
  materialType?: MaterialType;

  @ApiPropertyOptional({ description: 'کلید فایل در MinIO Storage', example: 'tenants/rokad-boys/materials/xyz.pdf' })
  @IsString()
  @IsOptional()
  fileKey?: string;

  @ApiPropertyOptional({ description: 'آدرس فایل یا لینک محتوا', example: 'http://localhost:9000/rokad-storage/tenants/rokad-boys/materials/xyz.pdf' })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'حجم فایل به مگابایت', example: 4.2 })
  @IsOptional()
  fileSizeMb?: number;

  @ApiPropertyOptional({ description: 'نوع MIME فایل', example: 'application/pdf' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'آیا دانلود مستقیم مجاز است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isDownloadable?: boolean;

  @ApiPropertyOptional({ description: 'آیا برای دانش‌آموزان منتشر شده است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'شناسه کلاس‌های مجاز برای مشاهده این جزوه' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  classroomIds?: string[];

  @ApiPropertyOptional({ description: 'شناسه کلاس مجاز برای مشاهده این جزوه' })
  @IsString()
  @IsOptional()
  classroomId?: string;
}
