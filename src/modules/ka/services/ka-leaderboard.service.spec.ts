import { Test, TestingModule } from '@nestjs/testing';
import { KaLeaderboardService } from './ka-leaderboard.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('KaLeaderboardService', () => {
  let service: KaLeaderboardService;

  const mockPrisma = {
    kaStudentToken: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    classroom: {
      findMany: jest.fn(),
    },
    schoolGrade: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KaLeaderboardService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<KaLeaderboardService>(KaLeaderboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
