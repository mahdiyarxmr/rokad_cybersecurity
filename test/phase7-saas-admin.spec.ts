import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 7 SaaS SuperAdmin & Platform Operations Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let boysAdminToken: string;

  let testTenantId: string;

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

    // 1. Login as Platform Super Admin
    const superAdminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'platform-root')
      .send({
        identifier: '09120000000',
        password: 'RokadAdminPass2026!',
      });
    superAdminToken = superAdminLogin.body.data.accessToken;

    // 2. Login as School Admin (Rokad Boys)
    const schoolAdminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09121111111',
        password: 'RokadBoysPass2026!',
      });
    boysAdminToken = schoolAdminLogin.body.data.accessToken;

    const boysTenant = await prisma.tenant.findUnique({
      where: { slug: 'rokad-boys' },
    });
    testTenantId = boysTenant!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Tenant Provisioning & Automated Onboarding Lifecycle', () => {
    let provisionedTenantId: string;
    const testSlug = `tenant-test-${Date.now()}`;

    it('POST /api/v1/saas/tenants/provision should provision complete tenant with admin user, terms, and roles', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/tenants/provision')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'مجتمع آموزشی آزمایشی فرزانگان',
          slug: testSlug,
          type: 'SCHOOL',
          theme: 'ECOSYSTEM',
          subdomain: `test-${Date.now()}`,
          adminFirstName: 'مریم',
          adminLastName: 'صادقی',
          adminPhone: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          adminPassword: 'Password1234!',
          planCode: 'STANDARD_SCHOOL',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant).toBeDefined();
      expect(res.body.data.tenant.slug).toBe(testSlug);
      expect(res.body.data.adminUser.role).toBe('SCHOOL_ADMIN');
      expect(res.body.data.academicYear).toBeDefined();
      expect(res.body.data.subscriptionPlan.code).toBe('STANDARD_SCHOOL');

      provisionedTenantId = res.body.data.tenant.id;
    });

    it('POST /api/v1/saas/tenants/impersonate should issue scoped access token for super admin support', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/tenants/impersonate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tenantId: provisionedTenantId,
          reason: 'بررسی وضعیت راه‌اندازی و پشتیبانی اولیه',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.tenant.id).toBe(provisionedTenantId);
      expect(res.body.data.impersonatedUser.role).toBe('SCHOOL_ADMIN');
    });

    it('PATCH /api/v1/saas/tenants/:id/status should suspend and reactivate tenant', async () => {
      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/v1/saas/tenants/${provisionedTenantId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(200);

      expect(suspendRes.body.success).toBe(true);
      expect(suspendRes.body.data.status).toBe('SUSPENDED');

      const activateRes = await request(app.getHttpServer())
        .patch(`/api/v1/saas/tenants/${provisionedTenantId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(activateRes.body.success).toBe(true);
      expect(activateRes.body.data.status).toBe('ACTIVE');
    });

    it('GET /api/v1/saas/tenants should list all tenants with subscriptions and member counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Subscription Plans, Quotas & Feature Flag Bundling', () => {
    let createdPlanId: string;
    const testPlanCode = `PLAN_${Date.now()}`;

    it('POST /api/v1/saas/subscriptions/plans should create new subscription plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/subscriptions/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: testPlanCode,
          name: 'پلن ویژه آکادمی‌های برتر',
          description: 'پکیج فول امکانات ویژه مراکز برگزیده',
          monthlyPrice: 5000000,
          annualPrice: 50000000,
          maxStudents: 800,
          maxTeachers: 80,
          maxStorageMb: 30720,
          bundledFeatureFlags: ['LMS_EXAMS', 'LIVE_CHAT', 'FINANCE_PAYROLL'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(testPlanCode);
      expect(res.body.data.maxStudents).toBe(800);
      createdPlanId = res.body.data.id;
    });

    it('GET /api/v1/saas/subscriptions/plans should list public subscription plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/subscriptions/plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/v1/saas/subscriptions/assign should assign plan to tenant and activate bundled flags', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/subscriptions/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tenantId: testTenantId,
          planIdOrCode: testPlanCode,
          billingCycle: 'ANNUAL',
          durationMonths: 12,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.planId).toBe(createdPlanId);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('GET /api/v1/saas/subscriptions/tenant/:tenantId should return quota breakdown and usage', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/saas/subscriptions/tenant/${testTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription).toBeDefined();
      expect(res.body.data.quotas.students).toBeDefined();
      expect(res.body.data.quotas.students.maxAllowed).toBe(800);
      expect(res.body.data.quotas.students.isExceeded).toBe(false);
    });
  });

  describe('3. Global Dynamic Role Templates & Distribution', () => {
    let createdTemplateId: string;
    const testRoleCode = `ROLE_TPL_${Date.now()}`;

    it('POST /api/v1/saas/roles/templates should create global role template', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/roles/templates')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: testRoleCode,
          name: 'سرپرست فوق‌برنامه و کارگاه‌ها',
          description: 'مدیریت و هماهنگی کلاس‌های مهارتی، کارگاهی و بازدید اولیاء',
          targetTenantType: 'SCHOOL',
          permissionCodes: ['attendance.read', 'homework.read', 'calendar.write'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(testRoleCode);
      expect(res.body.data.permissions.length).toBe(3);
      createdTemplateId = res.body.data.id;
    });

    it('GET /api/v1/saas/roles/templates should list all role templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/roles/templates')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/saas/roles/templates/:id/distribute should distribute role across matching tenants', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/saas/roles/templates/${createdTemplateId}/distribute`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          targetTenantIds: [testTenantId],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.distributedCount).toBeGreaterThanOrEqual(1);

      // Verify the role was created in the school tenant
      const rolesRes = await request(app.getHttpServer())
        .get('/api/v1/rbac/roles')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      const distributedRole = rolesRes.body.data.find(
        (r: any) => r.name === 'سرپرست فوق‌برنامه و کارگاه‌ها',
      );
      expect(distributedRole).toBeDefined();
    });
  });

  describe('4. Multi-Campus Hierarchy & Custom Branding', () => {
    it('PATCH /api/v1/saas/platform/branding/:tenantId should update custom branding tokens', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/saas/platform/branding/${testTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          primaryColor: '#1E40AF',
          secondaryColor: '#F59E0B',
          mottoText: 'پیشرو در یادگیری هوشمند و مهارتی',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.branding.primaryColor).toBe('#1E40AF');
      expect(res.body.data.settings.branding.mottoText).toBe('پیشرو در یادگیری هوشمند و مهارتی');
    });

    it('GET /api/v1/saas/tenants?type=COLLEGE should filter multi-campus branch organizations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/tenants?type=COLLEGE')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. Platform Operations, Global Metrics & Maintenance Mode', () => {
    it('GET /api/v1/saas/platform/metrics should return global platform metrics and MRR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/platform/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenants).toBeDefined();
      expect(res.body.data.tenants.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.users.total).toBeGreaterThan(0);
      expect(res.body.data.commercial).toBeDefined();
    });

    it('POST /api/v1/saas/platform/maintenance should set maintenance mode', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/platform/maintenance')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          enabled: true,
          message: 'سامانه در حال ارتقاء به نسخه ۲.۰ است.',
          estimatedEndTime: '2026-09-01T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.maintenanceMode).toBe(true);

      // Verify public maintenance status check
      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/saas/platform/maintenance')
        .expect(200);

      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.enabled).toBe(true);

      // Revert maintenance mode
      await request(app.getHttpServer())
        .post('/api/v1/saas/platform/maintenance')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ enabled: false })
        .expect(201);
    });

    it('GET /api/v1/saas/platform/audit-logs should return global cross-tenant audit entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/saas/platform/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/saas/platform/cache/purge should purge Redis system cache', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/saas/platform/cache/purge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ pattern: '*' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBeDefined();
    });
  });
});
