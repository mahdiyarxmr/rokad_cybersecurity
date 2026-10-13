import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSchoolProfileDto {
  @ApiPropertyOptional({ description: 'شعار مدرسه', example: 'پرورش استعداد، پیشرو در نوآوری' })
  @IsString()
  @IsOptional()
  motto?: string;

  @ApiPropertyOptional({ description: 'متن درباره مدرسه (HTML / Markdown)' })
  @IsString()
  @IsOptional()
  aboutHtml?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر کاور یا بنر مدرسه' })
  @IsString()
  @IsOptional()
  headerImageUrl?: string;

  @ApiPropertyOptional({ description: 'لینک شبکه‌های اجتماعی (ایتا، شاد، بله، تلگرام، اینستاگرام)' })
  @IsOptional()
  socialLinks?: any;

  @ApiPropertyOptional({ description: 'نام مدیر مدرسه' })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({ description: 'پیام مدیر مدرسه به دانش‌آموزان و اولیا' })
  @IsString()
  @IsOptional()
  managerMessage?: string;

  @ApiPropertyOptional({ description: 'دستاوردهای مدرسه (JSON)' })
  @IsOptional()
  achievements?: any;
}

export class CreateBlogPostDto {
  @ApiProperty({ description: 'عنوان مقاله، خبر یا پست رسانه', example: 'برگزاری کارگاه تخصصی هوش مصنوعی در هنرستان رکاد' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'اسلاگ انگلیسی یا فارسی برای آدرس وبلاگ', example: 'ai-workshop-in-rokad' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'متن کامل نوشته یا توضیحات پست' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'تصویر شاخص مقاله یا تصویر اول' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'نوع پست: استاندارد، اسلایدی، سند، یا اطلاعیه', example: 'SLIDESHOW' })
  @IsString()
  @IsOptional()
  postType?: string;

  @ApiPropertyOptional({ description: 'لیست تصاویر اسلایدی', example: ['https://.../slide1.jpg', 'https://.../slide2.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'پیوست‌ها و فایل‌های قابل دانلود (JSON)' })
  @IsOptional()
  attachments?: any;

  @ApiPropertyOptional({ description: 'نوع مخاطب: ALL (همه), ROLES (نقش‌های خاص), CLASSROOMS (کلاس‌های خاص)', default: 'ALL' })
  @IsString()
  @IsOptional()
  audienceType?: string;

  @ApiPropertyOptional({ description: 'نقش‌های مخاطب هدف', example: ['STUDENT', 'PARENT'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRoles?: string[];

  @ApiPropertyOptional({ description: 'شناسه‌های کلاس‌های مخاطب هدف' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassroomIds?: string[];

  @ApiPropertyOptional({ description: 'آیا پست در بالای فید پین شود؟', default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'آیا امکان ثبت کامنت مجاز است؟', default: true })
  @IsBoolean()
  @IsOptional()
  allowComments?: boolean;

  @ApiPropertyOptional({ description: 'آیا بلافاصله منتشر شود؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'برچسب‌ها (تگ‌ها)', example: ['مسابقات', 'نوآوری', 'آموزش'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CreateMediaCommentDto {
  @ApiProperty({ description: 'متن نظر کاربر', example: 'بسیار عالی و کاربردی بود، خسته نباشید.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
