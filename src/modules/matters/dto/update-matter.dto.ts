import { PartialType } from '@nestjs/swagger';
import { CreateMatterDto } from './create-matter.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateMatterDto extends PartialType(CreateMatterDto) {
  @IsNumber()
  @IsOptional()
  oralGrade?: number;
}
