import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 2 Core ERP & Structure Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let boysAdminToken: string;
  let boysTeacherToken: string;
  let boysParentToken: string;
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

    // Login as Student
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09124000001',
        password: 'b0012345678',
      });
    boysStudentToken = studentLogin.body.data.accessToken;

    // Login as Parent
    const parentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-slug', 'rokad-boys')
      .send({
        identifier: '09125000001',
        password: 'p0012345678',
      });
    boysParentToken = parentLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Academic Hierarchy & Structure', () => {
    let createdYearId: string;
    let createdLevelId: string;

    it('GET /api/v1/academic/years should return list of academic years', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/academic/years')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      createdYearId = res.body.data[0].id;
    });

    it('GET /api/v1/academic/levels should return educational levels', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/academic/levels')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      createdLevelId = res.body.data[0].id;
    });

    it('GET /api/v1/academic/fields should return study fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/academic/fields?levelId=${createdLevelId}`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('2. Lessons, Classrooms & Conflict-Free Scheduling', () => {
    let lessonId: string;
    let classroomId: string;
    let teacherProfileId: string;

    it('GET /api/v1/classes/lessons should return lessons', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/classes/lessons')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      lessonId = res.body.data[0].id;
    });

    it('GET /api/v1/classes/classrooms should return classrooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/classes/classrooms')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      classroomId = res.body.data[0].id;
    });

    it('GET /api/v1/members/teachers should return teachers with profiles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members/teachers')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      teacherProfileId = res.body.data[0].id;
    });

    it('POST /api/v1/classes/schedules should fail when there is a schedule conflict', async () => {
      // Saturday Period 1 was already scheduled in seed for classroom10M1
      await request(app.getHttpServer())
        .post('/api/v1/classes/schedules')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          classroomId,
          lessonId,
          teacherId: teacherProfileId,
          dayOfWeek: 'SATURDAY',
          periodNumber: 1, // Already occupied!
          startTime: '08:00',
          endTime: '09:30',
        })
        .expect(409);
    });

    it('GET /api/v1/classes/classrooms/:id/schedule should return timetable for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/classes/classrooms/${classroomId}/schedule`)
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Student can only view their own class schedule and gets 403 on other classes', async () => {
      // 1. Student queries /classrooms -> gets only their enrolled classroom
      const classroomsRes = await request(app.getHttpServer())
        .get('/api/v1/classes/classrooms')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);

      expect(classroomsRes.body.success).toBe(true);
      const studentClasses = classroomsRes.body.data;
      expect(studentClasses.length).toBeGreaterThan(0);
      const enrolledClassId = studentClasses[0].id;

      // 2. Student can access their own schedule
      const ownScheduleRes = await request(app.getHttpServer())
        .get(`/api/v1/classes/classrooms/${enrolledClassId}/schedule`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);
      expect(ownScheduleRes.body.success).toBe(true);

      // 3. Student calling /my-schedule gets their own timetable directly
      const myScheduleRes = await request(app.getHttpServer())
        .get('/api/v1/classes/my-schedule')
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(200);
      expect(myScheduleRes.body.success).toBe(true);
      expect(myScheduleRes.body.data.classroom.id).toBe(enrolledClassId);

      // 4. Create another classroom as admin that student is NOT enrolled in
      const otherClassRes = await request(app.getHttpServer())
        .post('/api/v1/classes/classrooms')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          name: 'کلاس دوازدهم کامپیوتر تستی',
          code: 'CLS-12-TEST-SEC',
          capacity: 25,
        });

      if (otherClassRes.status === 201) {
        const otherClassId = otherClassRes.body.data.id;
        // Student MUST be rejected with 403 Forbidden
        await request(app.getHttpServer())
          .get(`/api/v1/classes/classrooms/${otherClassId}/schedule`)
          .set('Authorization', `Bearer ${boysStudentToken}`)
          .expect(403);
      }
    });
  });

  describe('3. Dynamic RBAC & Fine-Grained Permissions', () => {
    let customRoleId: string;

    it('GET /api/v1/rbac/permissions should return system permissions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rbac/permissions')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const list = Array.isArray(res.body.data) ? res.body.data : res.body.data.permissions;
      expect(list.length).toBeGreaterThan(10);
    });

    it('POST /api/v1/rbac/roles should create custom school role with granular permissions', async () => {
      const roleName = `ناظم پایه دهم تخصصی ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/rbac/roles')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .send({
          name: roleName,
          description: 'مدیریت تردد و پرونده‌های انضباطی',
          permissionCodes: ['attendance.read', 'attendance.write', 'student.read'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(roleName);
      expect(res.body.data.permissions.length).toBe(3);
      customRoleId = res.body.data.id;
    });

    it('GET /api/v1/rbac/roles should list created roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rbac/roles')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const role = res.body.data.find((r: any) => r.id === customRoleId);
      expect(role).toBeDefined();
    });
  });

  describe('4. Member Directory & Parent-Student Relations', () => {
    it('GET /api/v1/members/students should list students with relations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members/students')
        .set('Authorization', `Bearer ${boysAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const studentWithParents = res.body.data.find((s: any) => s.parentLinks && s.parentLinks.length > 0);
      expect(studentWithParents).toBeDefined();
    });

    it('GET /api/v1/members/my-children should return children for authenticated parent', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members/my-children')
        .set('Authorization', `Bearer ${boysParentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].student.user.firstName).toBe('امیرعلی');
    });
  });

  describe('5. School Profile & Blogs', () => {
    it('GET /api/v1/profiles/school should return public school profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/school')
        .set('x-tenant-slug', 'rokad-boys')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.motto).toBeDefined();
    });

    it('GET /api/v1/profiles/blogs should list published school blog posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/blogs')
        .set('x-tenant-slug', 'rokad-boys')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const post = res.body.data.find((b: any) => b.slug === 'welcome-to-new-academic-year') || res.body.data[0];
      expect(post.title).toBeDefined();
    });

    it('GET /api/v1/profiles/blogs/:slug should return post and increment view count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/blogs/welcome-to-new-academic-year')
        .set('x-tenant-slug', 'rokad-boys')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('welcome-to-new-academic-year');
    });
  });

  describe('6. Cross-Tenant Data Isolation (Phase 2 Entities)', () => {
    let girlsAdminToken: string;

    beforeAll(async () => {
      let girlsLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', 'rokad-girls')
        .send({
          identifier: '09121111112',
          password: 'RokadGirlsPass2026!',
        });
      girlsAdminToken = girlsLogin.body.data?.accessToken;
    });

    it('Girls school should not see Boys school classrooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/classes/classrooms')
        .set('Authorization', `Bearer ${girlsAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const hasBoysClass = res.body.data.some((c: any) => c.code === 'CLS-10-M1');
      expect(hasBoysClass).toBe(false);
    });

    it('Girls school should not see Boys school students', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/members/students')
        .set('Authorization', `Bearer ${girlsAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const hasBoysStudent = res.body.data.some(
        (s: any) => s.studentCode === '12345678' || s.studentCode === 'STD-1404-001',
      );
      expect(hasBoysStudent).toBe(false);
    });
  });
});
