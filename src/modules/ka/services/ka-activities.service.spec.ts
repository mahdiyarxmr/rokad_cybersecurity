import { Test, TestingModule } from '@nestjs/testing';
import { KaActivitiesService } from './ka-activities.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('KaActivitiesService', () => {
  let service: KaActivitiesService;

  const mockPrisma = {
    kaActivity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kaStudentActivity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    kaStudentToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KaActivitiesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<KaActivitiesService>(KaActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
