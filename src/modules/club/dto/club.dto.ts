import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import {
  ClubDepartment,
  ClubGrade,
  ClubMembershipStatus,
  ClubMilestoneType,
  ClubMilestoneStatus,
  ClubChallengeType,
} from '@prisma/client';

export class CreateClubChallengeDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  missionBrief: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsEnum(ClubDepartment)
  department: ClubDepartment;

  @IsOptional()
  @IsEnum(ClubChallengeType)
  type?: ClubChallengeType;

  @IsOptional()
  @IsEnum(ClubGrade)
  minGrade?: ClubGrade;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  maxDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  maxScore?: number;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateClubChallengeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  missionBrief?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsEnum(ClubDepartment)
  department?: ClubDepartment;

  @IsOptional()
  @IsEnum(ClubChallengeType)
  type?: ClubChallengeType;

  @IsOptional()
  @IsEnum(ClubGrade)
  minGrade?: ClubGrade;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  maxDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  maxScore?: number;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateClubMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  weight?: number;

  @IsEnum(ClubMilestoneType)
  type: ClubMilestoneType;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class UpdateClubMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsEnum(ClubMilestoneType)
  type?: ClubMilestoneType;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class SubmitChallengeDto {
  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  figmaUrl?: string;

  @IsOptional()
  @IsString()
  demoUrl?: string;

  @IsOptional()
  @IsString()
  submissionNotes?: string;

  @IsOptional()
  attachments?: any;
}

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsEnum(ClubGrade)
  overrideGrade?: ClubGrade;
}

export class UpdateClubMembershipDto {
  @IsOptional()
  @IsEnum(ClubMembershipStatus)
  status?: ClubMembershipStatus;

  @IsOptional()
  @IsEnum(ClubDepartment)
  department?: ClubDepartment;

  @IsOptional()
  @IsEnum(ClubGrade)
  grade?: ClubGrade;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class TeacherApprovalDto {
  @IsEnum(ClubMilestoneStatus)
  status: ClubMilestoneStatus; // APPROVED or REJECTED

  @IsOptional()
  @IsString()
  notes?: string;
}
