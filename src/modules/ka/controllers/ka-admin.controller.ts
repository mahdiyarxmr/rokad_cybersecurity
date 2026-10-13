import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Role } from '../../../common/constants';
import { KaActivitiesService } from '../services/ka-activities.service';
import { KaRewardsService } from '../services/ka-rewards.service';
import { KaLeaderboardService } from '../services/ka-leaderboard.service';
import { CreateKaActivityDto, CreateKaRewardDto, ReviewKaActivityDto, DeliverKaRewardDto, DirectAwardKaActivityDto } from '../dto/ka.dto';

@ApiTags('Ka Platform - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN, Role.STAFF, Role.SUPER_ADMIN)
@Controller('ka-admin')
export class KaAdminController {
  constructor(
    private readonly activitiesService: KaActivitiesService,
    private readonly rewardsService: KaRewardsService,
    private readonly leaderboardService: KaLeaderboardService,
  ) {}

  // -------------------------
  // Activities Management
  // -------------------------

  @Post('activities')
  createActivity(@CurrentTenant('id') tenantId: string, @Body() dto: CreateKaActivityDto) {
    return this.activitiesService.createActivity(tenantId, dto);
  }

  @Get('activities')
  getActivities(@CurrentTenant('id') tenantId: string) {
    return this.activitiesService.findAllActivities(tenantId);
  }

  @Get('activity-submissions')
  getSubmissions(@CurrentTenant('id') tenantId: string) {
    return this.activitiesService.findAllSubmissions(tenantId);
  }

  @Patch('activity-submissions/:id/review')
  reviewSubmission(
    @CurrentTenant('id') tenantId: string,
    @Param('id') submissionId: string,
    @Body() dto: ReviewKaActivityDto
  ) {
    return this.activitiesService.reviewSubmission(tenantId, submissionId, dto);
  }

  // -------------------------
  // Rewards Management
  // -------------------------

  @Post('rewards')
  createReward(@CurrentTenant('id') tenantId: string, @Body() dto: CreateKaRewardDto) {
    return this.rewardsService.createReward(tenantId, dto);
  }

  @Get('rewards')
  getRewards(@CurrentTenant('id') tenantId: string) {
    return this.rewardsService.findAllRewards(tenantId);
  }

  @Get('reward-claims')
  getClaims(@CurrentTenant('id') tenantId: string) {
    return this.rewardsService.findAllClaims(tenantId);
  }

  @Patch('reward-claims/:id/fulfill')
  fulfillReward(
    @CurrentTenant('id') tenantId: string,
    @Param('id') claimId: string,
    @Body() dto: DeliverKaRewardDto
  ) {
    return this.rewardsService.fulfillReward(tenantId, claimId, dto);
  }

  // -------------------------
  // Direct Score & History
  // -------------------------

  @Post('direct-award')
  directAward(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: DirectAwardKaActivityDto
  ) {
    return this.activitiesService.directAwardActivity(tenantId, dto);
  }

  @Get('students')
  getSchoolStudents(@CurrentTenant('id') tenantId: string) {
    return this.activitiesService.getSchoolStudents(tenantId);
  }

  @Get('students/:studentId/history')
  getStudentHistory(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.activitiesService.getStudentKaHistory(tenantId, studentId);
  }

  @Get('leaderboard')
  getLeaderboard(@CurrentTenant('id') tenantId: string) {
    return this.leaderboardService.getLeaderboard(tenantId);
  }
}

