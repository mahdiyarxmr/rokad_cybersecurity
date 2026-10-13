import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/constants';
import { KaActivitiesService } from '../services/ka-activities.service';
import { KaRewardsService } from '../services/ka-rewards.service';
import { KaLeaderboardService } from '../services/ka-leaderboard.service';
import { SubmitKaActivityDto, ClaimKaRewardDto } from '../dto/ka.dto';

@ApiTags('Ka Platform - Student & Shared')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ka-student')
export class KaStudentController {
  constructor(
    private readonly activitiesService: KaActivitiesService,
    private readonly rewardsService: KaRewardsService,
    private readonly leaderboardService: KaLeaderboardService,
  ) {}

  // -------------------------
  // Activities
  // -------------------------

  @Get('activities')
  getAvailableActivities(@CurrentTenant('id') tenantId: string) {
    return this.activitiesService.findAllActivities(tenantId);
  }

  @Post('activity-submissions')
  @Roles(Role.STUDENT)
  submitActivity(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKaActivityDto
  ) {
    return this.activitiesService.submitActivity(tenantId, userId, dto);
  }

  @Get('activity-submissions')
  @Roles(Role.STUDENT)
  getMySubmissions(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.getMySubmissions(tenantId, userId);
  }

  // -------------------------
  // Rewards
  // -------------------------

  @Get('rewards')
  getAvailableRewards(@CurrentTenant('id') tenantId: string) {
    return this.rewardsService.findAllRewards(tenantId);
  }

  @Post('reward-claims')
  @Roles(Role.STUDENT)
  claimReward(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ClaimKaRewardDto
  ) {
    return this.rewardsService.claimReward(tenantId, userId, dto);
  }

  @Get('reward-claims')
  @Roles(Role.STUDENT)
  getMyClaims(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.rewardsService.getMyRewards(tenantId, userId);
  }

  // -------------------------
  // Leaderboard
  // -------------------------

  @Get('leaderboard')
  getLeaderboard(@CurrentTenant('id') tenantId: string) {
    return this.leaderboardService.getLeaderboard(tenantId);
  }

  @Get('students/:studentId/summary')
  getStudentSummary(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.activitiesService.getStudentKaHistory(tenantId, studentId);
  }
}
