import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { PasswordVaultService } from '../auth/password-vault.service';

describe('MembersService - Unified Credentials Generation', () => {
  let service: MembersService;
  let prisma: PrismaService;
  let boysTenantId: string;
  let girlsTenantId: string;
  let collegeTenantId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        PrismaService,
        TenantContextService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), on: jest.fn() },
        },
        {
          provide: PasswordVaultService,
          useValue: {
            encryptPasswordForTenant: jest.fn().mockResolvedValue('mock-encrypted-password'),
            decryptPasswordForTenant: jest.fn().mockResolvedValue('mock-decrypted-password'),
          },
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    prisma = module.get<PrismaService>(PrismaService);

    const boys = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
    const girls = await prisma.tenant.findUnique({ where: { slug: 'rokad-girls' } });
    const college = await prisma.tenant.findUnique({ where: { slug: 'rokad-college' } });

    boysTenantId = boys!.id;
    girlsTenantId = girls!.id;
    collegeTenantId = college!.id;
  });

  it('createStudent: auto-generates username=nationalCode and password=b+nationalCode for boys school', async () => {
    const testCode = '0098765431';
    const testPhone = '09129990001';
    // Cleanup if existed
    await prisma.studentProfile.deleteMany({ where: { nationalCode: testCode } });
    await prisma.user.deleteMany({ where: { tenantId: boysTenantId, OR: [{ username: testCode }, { phone: testPhone }] } });

    const student = await service.createStudent(boysTenantId, {
      firstName: 'علی',
      lastName: 'تست پسرانه',
      nationalCode: testCode,
      phone: testPhone,
    });

    expect(student.user.username).toBe(testCode);
    expect(student.user.nationalId).toBe(testCode);
    expect(student.nationalCode).toBe(testCode);

    // Verify password is b + testCode
    const isValidPass = await argon2.verify(student.user.passwordHash, `b${testCode}`);
    expect(isValidPass).toBe(true);

    // Cleanup
    await prisma.studentProfile.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: student.userId } });
  });

  it('createStudent: auto-generates username=nationalCode and password=g+nationalCode for girls school', async () => {
    const testCode = '0098765432';
    // Cleanup if existed
    await prisma.studentProfile.deleteMany({ where: { nationalCode: testCode } });
    await prisma.user.deleteMany({ where: { username: testCode } });

    const student = await service.createStudent(girlsTenantId, {
      firstName: 'نرگس',
      lastName: 'تست دخترانه',
      nationalCode: testCode,
      phone: '09129990002',
    });

    expect(student.user.username).toBe(testCode);
    expect(student.user.nationalId).toBe(testCode);

    // Verify password is g + testCode
    const isValidPass = await argon2.verify(student.user.passwordHash, `g${testCode}`);
    expect(isValidPass).toBe(true);

    // Cleanup
    await prisma.studentProfile.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: student.userId } });
  });

  it('bulkImportStudents: auto-generates username=nationalCode and password=c+nationalCode for college', async () => {
    const testCode = '0098765433';
    // Cleanup if existed
    await prisma.studentProfile.deleteMany({ where: { nationalCode: testCode } });
    await prisma.user.deleteMany({ where: { username: testCode } });

    const items = [
      {
        'کد ملی': testCode,
        'نام': 'مانی',
        'نام خانوادگی': 'تست کالج',
        'موبایل دانش آموز': '09129990003',
      },
    ];

    const result = await service.bulkImportStudents(collegeTenantId, items);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);

    const user = await prisma.user.findFirst({ where: { tenantId: collegeTenantId, username: testCode } });
    expect(user).toBeDefined();
    expect(user!.nationalId).toBe(testCode);

    // Verify password is c + testCode
    const isValidPass = await argon2.verify(user!.passwordHash, `c${testCode}`);
    expect(isValidPass).toBe(true);

    // Cleanup
    const profile = await prisma.studentProfile.findFirst({ where: { userId: user!.id } });
    if (profile) await prisma.studentProfile.delete({ where: { id: profile.id } });
    await prisma.user.delete({ where: { id: user!.id } });
  });
});
