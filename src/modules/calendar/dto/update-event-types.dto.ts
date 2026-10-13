import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EventTypeItemDto {
  @ApiProperty({ description: 'کد یکتای نوع رویداد', example: 'CUSTOM_1727299100' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'عنوان نمایشی فارسی نوع رویداد', example: 'کارگاه رباتیک و هوش مصنوعی' })
  @IsString()
  @IsNotEmpty()
  titleFa: string;

  @ApiProperty({ description: 'رنگ برچسب', example: 'blue' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ description: 'نوع پایه سیستمی رویداد', example: 'ACADEMIC' })
  @IsString()
  @IsNotEmpty()
  baseType: string;

  @ApiPropertyOptional({ description: 'آیا نوع رویداد پیش‌فرض سیستمی است؟', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateEventTypesDto {
  @ApiProperty({ description: 'فهرست انواع رویدادهای مدرسه', type: [EventTypeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTypeItemDto)
  eventTypes: EventTypeItemDto[];
}
