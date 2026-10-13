import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rokad Multi-Tenant Platform — Phase 4 LMS & Exam Engine Tests', () => {
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
    testClassroomId = classrooms.body.data[0].id;
    testAcademicYearId = classrooms.body.data[0].academicYearId;

    const teacherLessons = await request(app.getHttpServer())
      .get('/api/v1/classes/lessons')
      .set('Authorization', `Bearer ${boysTeacherToken}`);
    testLessonId = teacherLessons.body.data[0].id;

    const students = await request(app.getHttpServer())
      .get('/api/v1/members/students')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    const currentStudent =
      students.body.data.find((s: any) => s.user?.phone === '09124000001') ||
      students.body.data[0];
    testStudentProfileId = currentStudent.id;
    if (currentStudent.enrollments?.[0]?.classroomId) {
      testClassroomId = currentStudent.enrollments[0].classroomId;
    }

    const teachers = await request(app.getHttpServer())
      .get('/api/v1/members/teachers')
      .set('Authorization', `Bearer ${boysAdminToken}`);
    testTeacherProfileId = teachers.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Lesson Plans & Syllabus Tracking', () => {
    let createdPlanId: string;
    let createdSessionId: string;

    it('POST /api/v1/lesson-plans should allow teacher to create lesson plan with sessions', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/lesson-plans')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          title: `طرح درس پیشرفته آزمایشی ${Date.now()}`,
          description: 'برنامه بودجه‌بندی تدریس هفتگی',
          totalHoursPlanned: 30,
          sessions: [
            {
              sessionNumber: 1,
              topic: 'مقدمات مشتق و شیب خط مماس',
              objectives: 'درک مفهوم هندسی مشتق',
              activities: 'حل ۵ تمرین کلاسی',
            },
            {
              sessionNumber: 2,
              topic: 'قوانین مشتق‌گیری توابع جبری',
              objectives: 'مشتق ضرب و تقسیم توابع',
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sessions.length).toBe(2);
      createdPlanId = res.body.data.id;
      createdSessionId = res.body.data.sessions[0].id;
    });

    it('GET /api/v1/lesson-plans/:id should return plan details with progress stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lesson-plans/${createdPlanId}`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.progress.totalSessions).toBe(2);
      expect(res.body.data.progress.progressPercentage).toBe(0);
    });

    it('PATCH /api/v1/lesson-plans/sessions/:sessionId/status should update teaching status to COMPLETED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/lesson-plans/sessions/${createdSessionId}/status`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          status: 'COMPLETED',
          actualDate: new Date().toISOString(),
          notes: 'تدریس شد و تکالیف مربوطه تعیین گردید.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  describe('2. Question Bank & Categories', () => {
    let createdCategoryId: string;
    let createdMCQId: string;
    let correctOptionId: string;

    it('POST /api/v1/question-bank/categories should create question topic category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/question-bank/categories')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          lessonId: testLessonId,
          name: `فصل دوم: مشتق و کاربردها ${Date.now()}`,
          orderIndex: 2,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('فصل دوم');
      createdCategoryId = res.body.data.id;
    });

    it('POST /api/v1/question-bank/questions should create multiple-choice question with options and key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/question-bank/questions')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          lessonId: testLessonId,
          categoryId: createdCategoryId,
          type: 'MULTIPLE_CHOICE',
          difficulty: 'MEDIUM',
          text: 'مشتق تابع f(x) = x^3 - 3x در نقطه x = 1 کدام است؟',
          defaultScore: 2.0,
          suggestedTimeSeconds: 45,
          solutionExplanation: "f'(x) = 3x^2 - 3 -> f'(1) = 3(1) - 3 = 0",
          options: [
            { text: '0', isCorrect: true, orderIndex: 1 },
            { text: '3', isCorrect: false, orderIndex: 2 },
            { text: '-3', isCorrect: false, orderIndex: 3 },
            { text: '6', isCorrect: false, orderIndex: 4 },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.options.length).toBe(4);
      createdMCQId = res.body.data.id;
      correctOptionId = res.body.data.options[0].id;
    });

    it('GET /api/v1/question-bank/questions should query questions by lesson', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/question-bank/questions?lessonId=${testLessonId}`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('3. Online Exam Engine, Anti-Cheat, & Auto-Grading', () => {
    let createdExamId: string;
    let question1Id: string;
    let question1CorrectOptionId: string;

    beforeAll(async () => {
      // Create fresh MCQ question for exam
      const qRes = await request(app.getHttpServer())
        .post('/api/v1/question-bank/questions')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          lessonId: testLessonId,
          type: 'MULTIPLE_CHOICE',
          difficulty: 'EASY',
          text: 'آزمون سنجش: مقدار مشتق تابع ثابت f(x) = 100 چند است؟',
          defaultScore: 2.0,
          options: [
            { text: '0', isCorrect: true, orderIndex: 1 },
            { text: '100', isCorrect: false, orderIndex: 2 },
          ],
        });
      question1Id = qRes.body.data.id;
      question1CorrectOptionId = qRes.body.data.options[0].id;
    });

    it('POST /api/v1/exams should reject teacher creating exam for unassigned lesson (403)', async () => {
      const allLessons = await request(app.getHttpServer())
        .get('/api/v1/classes/lessons')
        .set('Authorization', `Bearer ${boysAdminToken}`);
      const unassignedLesson = allLessons.body.data.find(
        (l: any) => l.name === 'تجارت الکترونیک و امنیت شبکه',
      );

      if (unassignedLesson) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/exams')
          .set('Authorization', `Bearer ${boysTeacherToken}`)
          .send({
            lessonId: unassignedLesson.id,
            title: 'آزمون غیرمجاز',
            durationMinutes: 30,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000).toISOString(),
            classroomIds: [testClassroomId],
          })
          .expect(403);

        expect(res.body.message).toContain('شما فقط مجاز به تعریف آزمون برای دروس تخصیص‌یافته به خودتان هستید');
      }
    });

    it('POST /api/v1/exams should create scheduled online exam', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          title: `آزمون جامع آنلاین تستی ${Date.now()}`,
          description: 'آزمون تستی زمان‌دار با تصحیح خودکار و ضدتقلب',
          examType: 'ONLINE',
          durationMinutes: 30,
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 864000000).toISOString(),
          totalScore: 2.0,
          shuffleQuestions: true,
          shuffleOptions: true,
          classroomIds: [testClassroomId],
          questions: [
            {
              questionId: question1Id,
              score: 2.0,
              orderIndex: 1,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      createdExamId = res.body.data.id;
    });

    it('POST /api/v1/exams/:id/start should allow student to enter exam and receive tailored paper with server deadline', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${createdExamId}/start`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.participation.serverDeadline).toBeDefined();
      expect(res.body.data.questions.length).toBe(1);
      expect(res.body.data.questions[0].options[0].isCorrect).toBeUndefined(); // Security: solutions hidden!
    });

    it('POST /api/v1/exams/:id/submit should submit answers with soft tab-switch flag and perform auto-grading', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${createdExamId}/submit`)
        .set('Authorization', `Bearer ${boysStudentToken}`)
        .send({
          tabSwitchCount: 3, // Soft review flag
          answers: [
            {
              questionId: question1Id,
              selectedOptionId: question1CorrectOptionId, // Correct answer
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.isGraded).toBe(true);
      expect(res.body.data.autoGradedScore).toBe(2.0);
      expect(res.body.data.flaggedForReview).toBe(true); // Flagged for teacher inspection
    });

    it('GET /api/v1/exams/:id/results should allow teacher to view class results and review flags', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exams/${createdExamId}/results`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalStudents).toBeGreaterThanOrEqual(1);
      expect(res.body.data.stats.averageScore).toBe(2.0);
      expect(res.body.data.participations[0].flaggedForReview).toBe(true);
    });

    it('POST /api/v1/exams/:id/questions/import-bank should import existing questions from bank into exam', async () => {
      // 1. Create a bank question first
      const qRes = await request(app.getHttpServer())
        .post('/api/v1/question-bank/questions')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          lessonId: testLessonId,
          type: 'DESCRIPTIVE',
          difficulty: 'MEDIUM',
          text: 'سوال تشریحی جهت تست ایمپورت از بانک سوالات',
          defaultScore: 3.5,
        })
        .expect(201);

      const bankQId = qRes.body.data.id;

      // 2. Import into exam
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${createdExamId}/questions/import-bank`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          questionIds: [bankQId],
          defaultScore: 3.0,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1);
      expect(res.body.data.questions[0].score).toBe(3.0);
    });

    it('POST /api/v1/exams/:id/questions/bulk should bulk insert questions extracted from Excel or batch input', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${createdExamId}/questions/bulk`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          questions: [
            {
              text: 'سوال تستی وارد شده از اکسل نمونه',
              type: 'MULTIPLE_CHOICE',
              score: 2.5,
              options: [
                { text: 'پاسخ الف', isCorrect: true },
                { text: 'پاسخ ب', isCorrect: false },
              ],
            },
            {
              text: 'سوال تشریحی وارد شده از اکسل نمونه',
              type: 'DESCRIPTIVE',
              score: 4.0,
              solutionExplanation: 'راهنمای حل تشریحی...',
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('4. Gradebook & Weighted GPA Report Card', () => {
    it('POST /api/v1/gradebook/bulk should reject score exceeding maxScore (Boundary Check)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/gradebook/bulk')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          classroomId: testClassroomId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          gradeType: 'QUIZ',
          title: 'کوییز تست نمره غیرمجاز',
          maxScore: 20,
          grades: [
            {
              studentId: testStudentProfileId,
              score: 25.0, // Invalid! > maxScore (20)
            },
          ],
        })
        .expect(400);
    });

    it('POST /api/v1/gradebook/bulk should record valid classroom grades', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/gradebook/bulk')
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .send({
          academicYearId: testAcademicYearId,
          classroomId: testClassroomId,
          lessonId: testLessonId,
          teacherId: testTeacherProfileId,
          gradeType: 'MIDTERM',
          title: 'نمره آزمون میان‌ترم',
          maxScore: 20,
          weight: 2.0,
          grades: [
            {
              studentId: testStudentProfileId,
              score: 18.5,
              description: 'عملکرد عالی در مسائل تحلیلی',
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it('GET /api/v1/gradebook/classroom/:classroomId should view gradebook matrix', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/gradebook/classroom/${testClassroomId}`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.grades.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/gradebook/student/:studentId/report-card should calculate Weighted GPA transcript', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/gradebook/student/${testStudentProfileId}/report-card`)
        .set('Authorization', `Bearer ${boysTeacherToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript.totalUnits).toBeGreaterThan(0);
      expect(res.body.data.transcript.weightedGpaOutOf20).toBeGreaterThanOrEqual(10);
      expect(res.body.data.transcript.status).toBe('PASS');
    });
  });
});
