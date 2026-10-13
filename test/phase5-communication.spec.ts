import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisIoAdapter } from '../src/common/adapters/redis-io.adapter';

describe('Rokad Multi-Tenant Platform — Phase 5 Communication & Content Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let boysAdminToken: string;
  let boysTeacherToken: string;
  let boysStudentToken: string;

  let testClassroomId: string;
  let testAcademicYearId: string;
  let testLessonId: string;
  let testStudentProfileId: string;
  let testTeacherProfileId: string;
  let testTeacherUserId: string;
  let testStudentUserId: string;

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

    // 1. Login as Boys School Admin
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
    testStudentUserId = studentLogin.body.data.user.id;

    // Fetch prerequisite entities
    const classrooms = await request(app.getHttpServer())
      .get('/api/v1/classes/classrooms')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    const studentEnrollment = await prisma.classEnrollment.findFirst({
      where: { student: { userId: testStudentUserId } },
    });
    testClassroomId = studentEnrollment?.classroomId || classrooms.body.data[0].id;
    const targetClassroom = classrooms.body.data.find((c: any) => c.id === testClassroomId) || classrooms.body.data[0];
    testAcademicYearId = targetClassroom.academicYearId;

    const lessons = await request(app.getHttpServer())
      .get('/api/v1/classes/lessons')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testLessonId = lessons.body.data[0].id;

    const students = await request(app.getHttpServer())
      .get('/api/v1/members/students')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testStudentProfileId = students.body.data[0].id;

    const teachers = await request(app.getHttpServer())
      .get('/api/v1/members/teachers')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testTeacherProfileId = teachers.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Unified Storage Module (MinIO)', () => {
    let uploadedFileKey: string;

    it('POST /api/v1/storage/upload should upload multipart file to MinIO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .field('moduleName', 'materials')
        .attach('file', Buffer.from('PDF File Content Sample'), 'sample-handout.pdf')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fileKey).toContain('tenants/');
      expect(res.body.data.mimeType).toBeDefined();
      uploadedFileKey = res.body.data.fileKey;
    });

    it('POST /api/v1/storage/presigned-upload should generate presigned upload URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/presigned-upload')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          moduleName: 'materials',
          filename: 'heavy-video-lecture.mp4',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.fileKey).toContain('heavy-video-lecture.mp4');
    });

    it('POST /api/v1/homework/upload should use unified MinIO storage for homework attachments', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/homework/upload')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .attach('file', Buffer.from('Homework Exercise PDF'), 'calculus-ex.pdf')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fileKey).toContain('tenants/');
      expect(res.body.data.fileKey).toContain('/homework/');
    });
  });

  describe('2. Learning Materials & Pre-Authorized Presigned URLs', () => {
    let createdMaterialId: string;

    it('POST /api/v1/learning-materials should create course material attached to classroom', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/learning-materials')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          title: `جزوه تست یکپارچه ${Date.now()}`,
          description: 'نکات تکمیلی و سوالات پرتکرار',
          materialType: 'DOCUMENT',
          fileKey: 'tenants/rokad-boys/materials/sample-handout.pdf',
          fileUrl: 'http://localhost:9000/rokad-storage/tenants/rokad-boys/materials/sample-handout.pdf',
          fileSizeMb: 2.5,
          mimeType: 'application/pdf',
          classroomIds: [testClassroomId],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain('جزوه تست');
      createdMaterialId = res.body.data.id;
    });

    it('GET /api/v1/learning-materials should list materials with classroom filtering', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/learning-materials?classroomId=${testClassroomId}`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/learning-materials/:id/download-url should generate short-lived Presigned URL for enrolled student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/learning-materials/${createdMaterialId}/download-url`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(900); // 15 mins expiry
    });
  });

  describe('3. Integrated Noticeboard (Calendar / Announcements)', () => {
    it('GET /api/v1/calendar/announcements should retrieve targeted announcements', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calendar/announcements?audience=ALL')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('4. Real-Time Chat & Channels', () => {
    let createdDirectChannelId: string;
    let createdClassChannelId: string;

    it('POST /api/v1/chat/channels/direct should create 1-on-1 direct chat channel', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chat/channels/direct')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          recipientUserId: testStudentUserId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('DIRECT');
      expect(res.body.data.members.length).toBe(2);
      createdDirectChannelId = res.body.data.id;
    });

    it('POST /api/v1/chat/channels/class should create class group channel', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chat/channels/class')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          classroomId: testClassroomId,
          name: 'گفتگوی کلاس دهم ریاضی ۱ تستی',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('CLASS_GROUP');
      createdClassChannelId = res.body.data.id;
    });

    it('POST /api/v1/chat/messages should send chat message via REST and persist in DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          channelId: createdDirectChannelId,
          content: 'سلام، وضعیت تکلیف فصل اول شما بررسی شد.',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('سلام، وضعیت تکلیف فصل اول شما بررسی شد.');
    });

    it('GET /api/v1/chat/channels/:id/messages should list message history with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/chat/channels/${createdDirectChannelId}/messages`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/chat/channels should list user channels with unread/last message summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/chat/channels')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('5. WebSocket Chat & Multi-Instance Redis Adapter Sync Proof', () => {
    let app1: INestApplication;
    let app2: INestApplication;
    let clientSocket1: ClientSocketType;
    let clientSocket2: ClientSocketType;

    beforeAll(async () => {
      // Build Instance 1 on Port 4011
      const moduleFixture1 = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app1 = moduleFixture1.createNestApplication();
      app1.setGlobalPrefix('api/v1');
      const config1 = app1.get(ConfigService);
      const adapter1 = new RedisIoAdapter(app1, config1);
      await adapter1.connectToRedis();
      app1.useWebSocketAdapter(adapter1);
      await app1.listen(4011);

      // Build Instance 2 on Port 4012 (connected to the same Redis instance)
      const moduleFixture2 = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app2 = moduleFixture2.createNestApplication();
      app2.setGlobalPrefix('api/v1');
      const config2 = app2.get(ConfigService);
      const adapter2 = new RedisIoAdapter(app2, config2);
      await adapter2.connectToRedis();
      app2.useWebSocketAdapter(adapter2);
      await app2.listen(4012);
    });

    afterAll(async () => {
      if (clientSocket1) clientSocket1.disconnect();
      if (clientSocket2) clientSocket2.disconnect();
      if (app1) await app1.close();
      if (app2) await app2.close();
    });

    it('Should synchronize messages across separate instances via Redis Adapter (Multi-Instance Proof)', (done) => {
      // Client 1 connects to Instance 1
      clientSocket1 = ClientSocket('http://localhost:4011/chat', {
        auth: { token: boysTeacherToken },
        transports: ['websocket'],
      });

      // Client 2 connects to Instance 2
      clientSocket2 = ClientSocket('http://localhost:4012/chat', {
        auth: { token: boysStudentToken },
        transports: ['websocket'],
      });

      let channelId: string;

      const onBothConnected = async () => {
        if (!clientSocket1.connected || !clientSocket2.connected) return;

        // Create test channel
        const tenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
        const tenantId = tenant!.id;
        const directChannel = await prisma.chatChannel.create({
          data: {
            tenantId,
            type: 'DIRECT',
            createdById: testTeacherUserId,
            members: {
              create: [
                { tenantId, userId: testTeacherUserId, isAdmin: true },
                { tenantId, userId: testStudentUserId, isAdmin: false },
              ],
            },
          },
        });
        channelId = directChannel.id;

        // Client 2 listens for message on Instance 2
        clientSocket2.on('receive_message', (msg: any) => {
          try {
            expect(msg.content).toBe('پیام همگام‌شده بلادرنگ بین دو سرور مجزا از طریق ردیس');
            expect(msg.channelId).toBe(channelId);
            done();
          } catch (error) {
            done(error);
          }
        });

        // Client 1 joins channel on Instance 1
        clientSocket1.emit('join_channel', { channelId });

        // Client 2 joins channel on Instance 2
        clientSocket2.emit('join_channel', { channelId });

        // Small delay to ensure rooms are synced via Redis adapter
        setTimeout(() => {
          // Client 1 sends message on Instance 1
          clientSocket1.emit('send_message', {
            channelId,
            content: 'پیام همگام‌شده بلادرنگ بین دو سرور مجزا از طریق ردیس',
          });
        }, 500);
      };

      clientSocket1.on('connect', onBothConnected);
      clientSocket2.on('connect', onBothConnected);
    }, 15000);
  });
});
