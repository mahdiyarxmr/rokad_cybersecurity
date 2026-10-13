import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ChannelType, MessageAttachmentType } from '@prisma/client';

export class CreateDirectChannelDto {
  @ApiProperty({ description: 'شناسه کاربری طرف مقابل گفتگو' })
  @IsString()
  @IsNotEmpty()
  recipientUserId: string;
}

export class CreateClassChannelDto {
  @ApiProperty({ description: 'شناسه کلاس درس' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @ApiPropertyOptional({ description: 'نام کانال کلاس' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'توضیحات کانال' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'شناسه کانال گفتگو' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ description: 'متن پیام', example: 'سلام، زمان آزمون میان‌ترم مشخص شد؟' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'کلید فایل پیوست در MinIO' })
  @IsString()
  @IsOptional()
  attachmentKey?: string;

  @ApiPropertyOptional({ description: 'آدرس فایل پیوست' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiPropertyOptional({
    description: 'نوع فایل پیوست (IMAGE, VIDEO, AUDIO, FILE, NONE)',
    enum: MessageAttachmentType,
    default: MessageAttachmentType.NONE,
  })
  @IsEnum(MessageAttachmentType)
  @IsOptional()
  attachmentType?: MessageAttachmentType;

  @ApiPropertyOptional({ description: 'شناسه پیامی که به آن پاسخ داده می‌شود (Reply)' })
  @IsString()
  @IsOptional()
  replyToId?: string;
}
