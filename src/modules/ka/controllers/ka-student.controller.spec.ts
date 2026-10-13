import { Test, TestingModule } from '@nestjs/testing';
import { KaStudentController } from './ka-student.controller';
import { KaActivitiesService } from '../services/ka-activities.service';
import { KaRewardsService } from '../services/ka-rewards.service';
import { KaLeaderboardService } from '../services/ka-leaderboard.service';

describe('KaStudentController', () => {
  let controller: KaStudentController;

  const mockActivitiesService = {
    findAll: jest.fn(),
    submitActivity: jest.fn(),
    getMySubmissions: jest.fn(),
  };

  const mockRewardsService = {
    findAll: jest.fn(),
    claimReward: jest.fn(),
    getMyClaims: jest.fn(),
  };

  const mockLeaderboardService = {
    getStudentProfile: jest.fn(),
    getSchoolLeaderboard: jest.fn(),
    getGradeLeaderboard: jest.fn(),
    getClassLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KaStudentController],
      providers: [
        { provide: KaActivitiesService, useValue: mockActivitiesService },
        { provide: KaRewardsService, useValue: mockRewardsService },
        { provide: KaLeaderboardService, useValue: mockLeaderboardService },
      ],
    }).compile();

    controller = module.get<KaStudentController>(KaStudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
