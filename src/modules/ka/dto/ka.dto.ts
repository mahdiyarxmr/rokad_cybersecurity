import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { KaActivityStatus, KaRewardStatus } from '@prisma/client';

export class CreateKaActivityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parent?: string;

  @IsOptional()
  @IsObject()
  valueInput?: any;

  @IsOptional()
  @IsObject()
  scoreDefinition?: any;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  hide?: boolean;
}

export class SubmitKaActivityDto {
  @IsString()
  activityId: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateKaRewardDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parent?: string;

  @IsNumber()
  minToken: number;

  @IsOptional()
  @IsNumber()
  maxToken?: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class ClaimKaRewardDto {
  @IsString()
  rewardId: string;

  @IsOptional()
  @IsNumber()
  customTokens?: number;
}

export class ReviewKaActivityDto {
  @IsEnum(KaActivityStatus)
  status: KaActivityStatus;

  @IsOptional()
  @IsNumber()
  scoreAwarded?: number;

  @IsOptional()
  @IsString()
  adminComment?: string;
}

export class DeliverKaRewardDto {
  @IsEnum(KaRewardStatus)
  status: KaRewardStatus;
}

export class DirectAwardKaActivityDto {
  @IsString()
  studentId: string;

  @IsString()
  activityId: string;

  @IsNumber()
  scoreAwarded: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  adminComment?: string;
}
