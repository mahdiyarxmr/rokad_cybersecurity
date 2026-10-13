import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 6 Finance & Payroll Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let boysAdminToken: string;
  let boysTeacherToken: string;
  let boysStudentToken: string;

  let testAcademicYearId: string;
  let testStudentProfileId: string;
  let testTeacherUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Login as School Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09121111111',
        password: 'RokadBoysPass2026!',
      });
    boysAdminToken = adminLogin.body.data.accessToken;

    // 2. Login as Teacher
    const teacherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09123000001',
        password: 'RokadPass2026!',
      });
    boysTeacherToken = teacherLogin.body.data.accessToken;
    testTeacherUserId = teacherLogin.body.data.user.id;

    // 3. Login as Student
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09124000001',
        password: 'b0012345678',
      });
    boysStudentToken = studentLogin.body.data.accessToken;

    // Fetch prerequisite entities
    const classrooms = await request(app.getHttpServer())
      .get('/api/v1/classes/classrooms')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testAcademicYearId = classrooms.body.data[0].academicYearId;

    const students = await request(app.getHttpServer())
      .get('/api/v1/members/students')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testStudentProfileId = students.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Student Fee Contracts & Installment Breakdown', () => {
    let createdContractId: string;
    let testInstallmentId: string;

    it('POST /api/v1/finance/contracts should create tuition fee contract with discount & installments', async () => {
      const newStudentRes = await request(app.getHttpServer())
        .post('/api/v1/members/students')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          firstName: 'آرمین',
          lastName: 'حسابی',
          studentCode: `STU-FEE-${Date.now()}`,
          phone: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          password: 'RokadPass2026!',
        });

      const dedicatedStudentId = newStudentRes.body.data.id;
      const contractNumber = `FEE-TEST-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/contracts')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          academicYearId: testAcademicYearId,
          studentId: dedicatedStudentId,
          contractNumber,
          totalAmount: 20000000,
          discountAmount: 2000000,
          discountReason: 'تخفیف آزمون ورودی',
          notes: 'پرداخت در ۲ قسط',
          installments: [
            {
              installmentNumber: 1,
              title: 'قسط اول',
              dueDate: new Date('2026-10-01T00:00:00.000Z').toISOString(),
              amount: 9000000,
            },
            {
              installmentNumber: 2,
              title: 'قسط دوم',
              dueDate: new Date('2026-12-01T00:00:00.000Z').toISOString(),
              amount: 9000000,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.finalPayableAmount).toBe(18000000);
      expect(res.body.data.installments.length).toBe(2);
      createdContractId = res.body.data.id;
      testInstallmentId = res.body.data.installments[0].id;
    });

    it('GET /api/v1/finance/contracts should list tuition contracts with summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/contracts')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/finance/contracts/:id should return details with computed remaining balance', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/contracts/${createdContractId}`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.finalPayableAmount).toBeGreaterThan(0);
    });

    it('GET /api/v1/finance/contracts/my-overview should allow student to view own fee breakdown', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/contracts/my-overview')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Online Payment Gateway & Idempotent Verification', () => {
    let testInstallment: any;
    let generatedAuthority: string;

    beforeAll(async () => {
      // Find an unpaid installment
      const tenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
      testInstallment = await prisma.feeInstallment.findFirst({
        where: { tenantId: tenant!.id, status: 'UNPAID' },
      });
    });

    it('POST /api/v1/finance/payments/initiate should initiate payment with server-side amount recalculation', async () => {
      if (!testInstallment) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/payments/initiate')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .send({
          installmentId: testInstallment.id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.authority).toBeDefined();
      expect(res.body.data.amount).toBeDefined();
      expect(Number(res.body.data.amount)).toBe(Number(testInstallment.amount));
      generatedAuthority = res.body.data.authority;
    });

    it('GET /api/v1/finance/payments/verify should verify transaction server-side and issue FeeReceipt', async () => {
      if (!generatedAuthority) return;

      const tenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/payments/verify?tenantId=${tenant!.id}&Authority=${generatedAuthority}&Status=OK`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt).toBeDefined();
      expect(res.body.data.receipt.receiptNumber).toContain('REC-');
    });

    it('Security Test: Resending duplicate callback must be idempotent and prevent double spending', async () => {
      if (!generatedAuthority) return;

      const tenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/payments/verify?tenantId=${tenant!.id}&Authority=${generatedAuthority}&Status=OK`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('قبلاً');
    });
  });

  describe('3. Offline Payments & Receipt Ledger', () => {
    it('POST /api/v1/finance/payments/offline should record POS/cheque payment by Admin', async () => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
      let installment = await prisma.feeInstallment.findFirst({
        where: { tenantId: tenant!.id, status: 'UNPAID' },
      });

      if (!installment) {
        installment = await prisma.feeInstallment.findFirst({
          where: { tenantId: tenant!.id },
        });
      }

      if (installment) {
        // Reset to unpaid for testing offline payment
        await prisma.feeInstallment.update({
          where: { id: installment.id },
          data: { status: 'UNPAID', paidAmount: 0 },
        });

        const res = await request(app.getHttpServer())
          .post('/api/v1/finance/payments/offline')
          .set('Authorization', `Bearer ${boysAdminToken}`)
          .send({
            installmentId: installment.id,
            method: 'POS_RECEIPT',
            referenceNumber: `POS-REF-${Date.now()}`,
            notes: 'پرداخت حضوری با دستگاه پوز دفتر آموزشگاه',
          })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.receipt.paymentMethod).toBe('POS_RECEIPT');
        expect(res.body.data.transaction.status).toBe('SUCCESSFUL');
      }
    });

    it('GET /api/v1/finance/payments/receipts should list all financial receipts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/payments/receipts')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Staff Payroll Profiles & Monthly Payslip Engine', () => {
    let generatedSlipId: string;

    it('POST /api/v1/finance/payroll/profiles/:userId should upsert salary profile', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/finance/payroll/profiles/${testTeacherUserId}`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          contractType: 'FULL_TIME_SALARY',
          baseMonthlySalary: 24000000,
          hourlyRate: 400000,
          bankName: 'بانک پاسارگاد',
          bankAccountNumber: '987654321',
          bankShebaNumber: 'IR980570000000000987654321',
          insuranceNumber: '55443322',
          isActive: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.baseMonthlySalary).toBe(24000000);
      expect(res.body.data.bankName).toBe('بانک پاسارگاد');
    });

    it('POST /api/v1/finance/payroll/slips should generate monthly payslip with auto-computed deductions', async () => {
      // Delete any existing slip for this test month to ensure clean state
      await prisma.payrollSlip.deleteMany({
        where: { userId: testTeacherUserId, year: 1404, month: 9 },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/payroll/slips')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          userId: testTeacherUserId,
          year: 1404,
          month: 9, // آذر
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.grossPay).toBe(24000000);
      expect(res.body.data.netPay).toBeLessThan(24000000);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      generatedSlipId = res.body.data.id;
    });

    it('GET /api/v1/finance/payroll/slips should list all monthly slips', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/payroll/slips?year=1404')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('PATCH /api/v1/finance/payroll/slips/:id/disburse should approve and mark payslip as PAID', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/finance/payroll/slips/${generatedSlipId}/disburse`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          paymentRefNumber: `PAYA-TEST-${Date.now()}`,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.paidAt).toBeDefined();
    });

    it('GET /api/v1/finance/payroll/my-slips should allow teacher to view own payslips', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/payroll/my-slips')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
