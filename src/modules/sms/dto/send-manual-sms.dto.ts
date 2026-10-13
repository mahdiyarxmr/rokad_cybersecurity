import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ManualSmsTargetType {
  INDIVIDUAL = 'INDIVIDUAL',
  ROLE = 'ROLE',
  CLASS = 'CLASS',
  DIRECT_PHONE = 'DIRECT_PHONE',
}

export enum TargetRoleAudience {
  ALL = 'ALL',
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  TEACHERS = 'TEACHERS',
  STAFF = 'STAFF',
}

export enum ClassAudienceType {
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  BOTH = 'BOTH',
}

export class SendManualSmsDto {
  @ApiProperty({ enum: ManualSmsTargetType, description: 'نوع گیرندگان (فرد، نقش/گروه، کلاس یا شماره مستقیم)' })
  @IsEnum(ManualSmsTargetType)
  @IsNotEmpty()
  targetType: ManualSmsTargetType;

  @ApiProperty({ description: 'متن پیامک ارسالی' })
  @IsString()
  @IsNotEmpty()
  message: string;

  // For INDIVIDUAL (Single or Multiple)
  @ApiPropertyOptional({ description: 'شناسه کاربر هدف (در صورت ارسال به یک فرد)' })
  @IsString()
  @IsOptional()
  targetUserId?: string;

  @ApiPropertyOptional({ description: 'لیست شناسه‌های کاربران هدف (در صورت انتخاب چند فرد)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetUserIds?: string[];

  // For DIRECT_PHONE
  @ApiPropertyOptional({ description: 'شماره تلفن مستقیم گیرنده' })
  @IsString()
  @IsOptional()
  directPhone?: string;

  // For DIRECT_PHONE bulk or custom phones
  @ApiPropertyOptional({ description: 'لیست شماره تلفن‌های مستقیم', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  directPhones?: string[];

  // For ROLE
  @ApiPropertyOptional({ enum: TargetRoleAudience, description: 'نقش گروه هدف' })
  @IsEnum(TargetRoleAudience)
  @IsOptional()
  targetRole?: TargetRoleAudience;

  // For CLASS
  @ApiPropertyOptional({ description: 'شناسه کلاس' })
  @IsString()
  @IsOptional()
  classroomId?: string;

  @ApiPropertyOptional({ enum: ClassAudienceType, description: 'گیرندگان کلاس (دانش‌آموزان، والدین یا هردو)' })
  @IsEnum(ClassAudienceType)
  @IsOptional()
  classAudience?: ClassAudienceType;
}

export class UpsertSmsTemplateDto {
  @ApiProperty({ description: 'نوع الگو (غیبت، سررسید چک، تبریک تولد و...)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'عنوان نمایشی الگو' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'متن الگو با متغیرهای پویا مانند {نام}، {تاریخ}' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'وضعیت فعال/غیرفعال بودن اتوماسیون' })
  @IsOptional()
  isEnabled?: boolean;
}

export class UpdateSmsConfigDto {
  @ApiProperty({ description: 'درگاه پیش‌فرض ارسال پیامک', enum: ['AMOOT', 'KAVENEGAR', 'SANDBOX'] })
  @IsString()
  @IsNotEmpty()
  provider: 'AMOOT' | 'KAVENEGAR' | 'SANDBOX';

  @ApiPropertyOptional({ description: 'توکن یا کلید API آموت پیامک' })
  @IsString()
  @IsOptional()
  amootApiKey?: string;

  @ApiPropertyOptional({ description: 'شماره خط فرستنده آموت' })
  @IsString()
  @IsOptional()
  amootSenderLine?: string;

  @ApiPropertyOptional({ description: 'کلید وب‌سرویس کاوه نگار' })
  @IsString()
  @IsOptional()
  kavenegarApiKey?: string;

  @ApiPropertyOptional({ description: 'شماره خط فرستنده کاوه نگار' })
  @IsString()
  @IsOptional()
  kavenegarSenderLine?: string;
}

export class CreateSmsQuickTemplateDto {
  @ApiProperty({ description: 'عنوان الگو (مثلا: لغو کلاس، تبریک عید)' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'متن پیامک الگو' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'دسته‌بندی الگو (GENERAL, ACADEMIC, ANNOUNCEMENT, FINANCIAL, EMERGENCY)' })
  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateSmsQuickTemplateDto {
  @ApiPropertyOptional({ description: 'عنوان الگو' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'متن پیامک الگو' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'دسته‌بندی الگو' })
  @IsString()
  @IsOptional()
  category?: string;
}


