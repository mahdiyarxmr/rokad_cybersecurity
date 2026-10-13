import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum MessagePriorityDto {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  URGENT = 'URGENT',
}

export enum MessageTargetTypeDto {
  ALL = 'ALL',
  ROLE = 'ROLE',
  CLASSROOM = 'CLASSROOM',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum MessageTargetAudienceDto {
  ALL = 'ALL',
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  TEACHERS = 'TEACHERS',
  STAFF = 'STAFF',
}

export class MessageAttachmentDto {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان پیام الزامی است' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'متن پیام الزامی است' })
  body: string;

  @IsEnum(MessagePriorityDto)
  @IsOptional()
  priority?: MessagePriorityDto = MessagePriorityDto.NORMAL;

  @IsEnum(MessageTargetTypeDto)
  @IsNotEmpty({ message: 'نوع مخاطب الزامی است' })
  targetType: MessageTargetTypeDto;

  @IsEnum(MessageTargetAudienceDto)
  @IsOptional()
  targetAudience?: MessageTargetAudienceDto = MessageTargetAudienceDto.ALL;

  @IsString()
  @IsOptional()
  targetClassroomId?: string;

  @IsArray()
  @IsOptional()
  recipientIds?: string[];

  @IsArray()
  @IsOptional()
  attachments?: MessageAttachmentDto[];

  @IsString()
  @IsOptional()
  replyToId?: string;
}
