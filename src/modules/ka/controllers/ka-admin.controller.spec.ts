import { Test, TestingModule } from '@nestjs/testing';
import { KaAdminController } from './ka-admin.controller';
import { KaActivitiesService } from '../services/ka-activities.service';
import { KaRewardsService } from '../services/ka-rewards.service';
import { KaLeaderboardService } from '../services/ka-leaderboard.service';

describe('KaAdminController', () => {
  let controller: KaAdminController;

  const mockActivitiesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    getPendingSubmissions: jest.fn(),
    reviewSubmission: jest.fn(),
    directAward: jest.fn(),
  };

  const mockRewardsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    getClaims: jest.fn(),
    deliverReward: jest.fn(),
  };

  const mockLeaderboardService = {
    getSchoolLeaderboard: jest.fn(),
    getGradeLeaderboard: jest.fn(),
    getClassLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KaAdminController],
      providers: [
        { provide: KaActivitiesService, useValue: mockActivitiesService },
        { provide: KaRewardsService, useValue: mockRewardsService },
        { provide: KaLeaderboardService, useValue: mockLeaderboardService },
      ],
    }).compile();

    controller = module.get<KaAdminController>(KaAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
