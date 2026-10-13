import { Test, TestingModule } from '@nestjs/testing';
import { KaRewardsService } from './ka-rewards.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('KaRewardsService', () => {
  let service: KaRewardsService;
  let prisma: typeof mockPrisma;

  const mockPrisma = {
    kaReward: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kaRewardClaim: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    kaStudentToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KaRewardsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<KaRewardsService>(KaRewardsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list rewards for tenant', async () => {
    mockPrisma.kaReward.findMany.mockResolvedValueOnce([
      { id: '1', title: 'اردوی ویژه تفریحی', category: 'EXCLUSIVE' },
    ]);

    const result = await service.findAllRewards('tenant-1');
    expect(result).toHaveLength(1);
    expect(mockPrisma.kaReward.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      orderBy: { minToken: 'asc' },
    });
  });
});
