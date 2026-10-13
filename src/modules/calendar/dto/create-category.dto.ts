import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EventCategoryDto {
  @ApiProperty({ description: 'کلید یکتای دسته‌بندی (مثل STARTUP_WEEKEND)', example: 'MY_CATEGORY' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'عنوان فارسی دسته‌بندی', example: 'رویداد ویژه من' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'کلید آیکون (اختیاری)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'کلاس رنگی (اختیاری)' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'قابل حذف بودن', default: false })
  @IsBoolean()
  @IsOptional()
  removable?: boolean;
}

export class CreateEventCategoryDto {
  @ApiProperty({ type: EventCategoryDto })
  @ValidateNested()
  @Type(() => EventCategoryDto)
  @IsObject()
  @IsNotEmpty()
  category: EventCategoryDto;
}

export class UpdateEventCategoryDto {
  @ApiPropertyOptional({ description: 'عنوان جدید' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'آیکون جدید' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'کلاس رنگی جدید' })
  @IsString()
  @IsOptional()
  color?: string;
}
