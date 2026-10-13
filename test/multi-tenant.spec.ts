import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 1 Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /api/v1/health should return 200 OK and healthy status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.services.database).toBe('ok');
    });
  });

  describe('2. Multi-Tenant School Registration (Onboarding)', () => {
    const randomSlug = `test-school-${Date.now()}`;

    it('POST /api/v1/auth/register-school should create a tenant and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register-school')
        .send({
          schoolName: 'مدرسه آزمایشی البرز',
          slug: randomSlug,
          subdomain: randomSlug,
          theme: 'MALE',
          adminFirstName: 'آزمایش',
          adminLastName: 'تستی',
          adminPhone: `0910${Math.floor(1000000 + Math.random() * 9000000)}`,
          adminEmail: `${randomSlug}@rokadschool.ir`,
          adminPassword: 'Password123!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.slug).toBe(randomSlug);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('POST /api/v1/auth/register-school should fail with duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register-school')
        .send({
          schoolName: 'مدرسه تکراری',
          slug: randomSlug,
          adminFirstName: 'تکرار',
          adminLastName: 'تکراری',
          adminPhone: '09199999999',
          adminPassword: 'Password123!',
        })
        .expect(409);
    });
  });

  describe('3. Multi-Tenant Login & Token Family Rotation', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/login with Boys School Admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', 'rokad-boys')
        .send({
          identifier: '09121111111',
          password: 'RokadBoysPass2026!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.slug).toBe('rokad-boys');
      expect(res.body.data.user.role).toBe('SCHOOL_ADMIN');
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /api/v1/auth/refresh should rotate the refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken);

      // Save new token
      const newRefreshToken = res.body.data.refreshToken;

      // 4. Token Reuse Detection Test
      // Trying to reuse the OLD refresh token must trigger security alarm and revoke family!
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken }) // Re-using old token
        .expect(401);

      // Even the new token should now be revoked because the entire family was invalidated!
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });
  });

  describe('4. Feature Flags Per-Tenant Gating', () => {
    let boysToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', 'rokad-boys')
        .send({
          identifier: '09121111111',
          password: 'RokadBoysPass2026!',
        });
      boysToken = res.body.data.accessToken;
    });

    it('GET /api/v1/feature-flags/my-school should return feature flags', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/my-school')
        .set('Authorization', `Bearer ${boysToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const examFlag = res.body.data.find((f: any) => f.key === 'lms_online_exam');
      expect(examFlag).toBeDefined();
    });

    it('POST /api/v1/feature-flags/my-school/toggle should toggle flag for this school', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/feature-flags/my-school/toggle')
        .set('Authorization', `Bearer ${boysToken}`)
        .send({
          flagKey: 'lms_online_exam',
          isEnabled: false,
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      // Verify flag is now disabled for boys school
      const checkRes = await request(app.getHttpServer())
        .get('/api/v1/feature-flags/my-school')
        .set('Authorization', `Bearer ${boysToken}`)
        .expect(200);

      const examFlag = checkRes.body.data.find((f: any) => f.key === 'lms_online_exam');
      expect(examFlag.isEnabled).toBe(false);
    });
  });

  describe('5. Strict Tenant Data Isolation (Zero Tenant Leakage)', () => {
    let boysToken: string;
    let girlsToken: string;

    beforeAll(async () => {
      // Login as Boys School Admin
      const boysLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', 'rokad-boys')
        .send({
          identifier: '09121111111',
          password: 'RokadBoysPass2026!',
        });
      boysToken = boysLogin.body.data.accessToken;

      // Login as Girls School Admin
      const girlsLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', 'rokad-girls')
        .send({
          identifier: '09121111112',
          password: 'RokadGirlsPass2026!',
        });
      girlsToken = girlsLogin.body.data.accessToken;
    });

    it('GET /api/v1/tenants/my-school for Boys Admin returns only Boys School', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/my-school')
        .set('Authorization', `Bearer ${boysToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('rokad-boys');
      expect(res.body.data.theme).toBe('MALE');
    });

    it('GET /api/v1/tenants/my-school for Girls Admin returns only Girls School', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants/my-school')
        .set('Authorization', `Bearer ${girlsToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('rokad-girls');
      expect(res.body.data.theme).toBe('FEMALE');
    });

    it('Tenant update on Boys school does not alter Girls school', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/tenants/my-school')
        .set('Authorization', `Bearer ${boysToken}`)
        .send({
          address: 'تهران، زعفرانیه، شعبه پسرانه',
        })
        .expect(200);

      const checkGirls = await request(app.getHttpServer())
        .get('/api/v1/tenants/my-school')
        .set('Authorization', `Bearer ${girlsToken}`)
        .expect(200);

      expect(checkGirls.body.data.address).not.toBe('تهران، زعفرانیه، شعبه پسرانه');
    });
  });

  describe('6. Asynchronous Audit Logging Verification', () => {
    it('Audit logs should be created for state changes without blocking', async () => {
      // Allow async event loop to flush
      await new Promise((resolve) => setTimeout(resolve, 200));

      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      expect(logs.length).toBeGreaterThan(0);
      const loginLog = logs.find((l) => l.action === 'LOGIN' || l.action === 'REGISTER_SCHOOL');
      expect(loginLog).toBeDefined();
    });
  });
});
