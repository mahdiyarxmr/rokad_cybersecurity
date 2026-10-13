import { Module } from '@nestjs/common';
import { KaActivitiesService } from './services/ka-activities.service';
import { KaRewardsService } from './services/ka-rewards.service';
import { KaLeaderboardService } from './services/ka-leaderboard.service';
import { KaAdminController } from './controllers/ka-admin.controller';
import { KaStudentController } from './controllers/ka-student.controller';

@Module({
  providers: [KaActivitiesService, KaRewardsService, KaLeaderboardService],
  controllers: [KaAdminController, KaStudentController]
})
export class KaModule {}
