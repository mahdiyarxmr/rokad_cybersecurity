import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Platform — Phase 8 Extended Modules (Club, SMS, Coaching, Ka, Messages)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let boysAdminToken: string;
  let boysTeacherToken: string;
  let boysStudentToken: string;

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

    // Login as Boys School Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09121111111',
        password: 'RokadBoysPass2026!',
      });
    boysAdminToken = adminLogin.body.data.accessToken;

    // Login as Teacher
    const teacherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09123000001',
        password: 'RokadPass2026!',
      });
    boysTeacherToken = teacherLogin.body.data.accessToken;

    // Login as Student (unified creds)
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09124000001',
        password: 'b0012345678',
      });
    boysStudentToken = studentLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Rokad Business Club Engine', () => {
    it('GET /api/v1/club/my-status should return student membership and roadmap status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/club/my-status')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET /api/v1/club/challenges should return active challenges for student', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/club/challenges')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.challenges || res.body.data)).toBe(true);
    });

    it('GET /api/v1/club/admin/members should return member directory for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/club/admin/members')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.members || res.body.data)).toBe(true);
    });

    it('GET /api/v1/club/admin/milestones should return roadmap milestones for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/club/admin/milestones')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.milestones || res.body.data)).toBe(true);
    });

    it('GET /api/v1/club/admin/challenges should return all challenges for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/club/admin/challenges')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.challenges || res.body.data)).toBe(true);
    });
  });

  describe('2. SMS Management & Logs', () => {
    it('GET /api/v1/sms/templates should return configured SMS templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sms/templates')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/sms/quick-templates should return quick SMS templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sms/quick-templates')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/sms/logs should return SMS delivery logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sms/logs')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET /api/v1/sms/stats should return SMS delivery statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sms/stats')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('3. Coaching & Mentorship', () => {
    it('GET /api/v1/coaching/my-context should return user coaching context', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/coaching/my-context')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET /api/v1/coaching/students should return assigned coaching students', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/coaching/students')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('4. Ka Gamification Platform', () => {
    it('GET /api/v1/ka-student/activities should return available Ka activities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ka-student/activities')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it('GET /api/v1/ka-student/rewards should return available Ka rewards', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ka-student/rewards')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it('GET /api/v1/ka-student/leaderboard should return school leaderboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ka-student/leaderboard')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('GET /api/v1/ka-admin/activities should return activities in admin portal', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ka-admin/activities')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it('GET /api/v1/ka-admin/rewards should return rewards in admin portal', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ka-admin/rewards')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });
  });

  describe('5. Academic Messaging System', () => {
    it('GET /api/v1/messages/inbox should return inbox messages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/inbox')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/messages/sent should return sent messages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/sent')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
