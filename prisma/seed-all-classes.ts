import { PrismaClient, AttendanceStatus, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seeding for classrooms, students, schedules & attendance...');

  // 1. Get Tenants
  const boysTenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-boys' } });
  if (!boysTenant) {
    throw new Error('Tenant rokad-boys not found! Please run primary seed first.');
  }

  const girlsTenant = await prisma.tenant.findUnique({ where: { slug: 'rokad-girls' } });

  // 2. Get Academic Year
  const academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: boysTenant.id, isCurrent: true },
  }) || await prisma.academicYear.findFirst({ where: { tenantId: boysTenant.id } });

  if (!academicYear) {
    throw new Error('Academic year not found for boys tenant!');
  }

  // 3. Educational Levels
  const grade10 = await prisma.educationalLevel.findFirst({
    where: { tenantId: boysTenant.id, code: 'GRADE_10' },
  });
  const grade11 = await prisma.educationalLevel.findFirst({
    where: { tenantId: boysTenant.id, code: 'GRADE_11' },
  });
  const grade12 = await prisma.educationalLevel.findFirst({
    where: { tenantId: boysTenant.id, code: 'GRADE_12' },
  });

  // 4. Study Fields
  const netField10 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_NET_10' },
  });
  const webField10 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_WEB_10' },
  });
  const mediaField10 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_MEDIA_10' },
  });
  const netField11 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_NET_11' },
  });
  const webField11 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_WEB_11' },
  });
  const netField12 = await prisma.studyField.findFirst({
    where: { tenantId: boysTenant.id, code: 'BOYS_NET_12' },
  });

  // 5. Teachers
  const teacher1 = await prisma.teacherProfile.findFirst({
    where: { tenantId: boysTenant.id },
    include: { user: true },
  });
  const teacher2 = await prisma.teacherProfile.findFirst({
    where: { tenantId: boysTenant.id, id: { not: teacher1?.id } },
    include: { user: true },
  }) || teacher1;

  if (!teacher1) {
    throw new Error('No teachers found in boysTenant!');
  }

  // 6. Lessons
  let defaultLesson = await prisma.lesson.findFirst({
    where: { tenantId: boysTenant.id },
  });
  if (!defaultLesson) {
    defaultLesson = await prisma.lesson.create({
      data: {
        tenantId: boysTenant.id,
        levelId: grade10?.id || '',
        name: 'دانش فنی و تخصصی',
        code: 'TECH-GEN-01',
        unitCount: 3,
        type: 'SPECIALIZED',
      },
    });
  }
  const lessons = await prisma.lesson.findMany({ where: { tenantId: boysTenant.id } });

  console.log('🏫 Defining and upserting classrooms...');

  // Classrooms definitions
  const classroomDefs = [
    {
      code: 'CLS-10-M1',
      name: 'کلاس ۱۰۱ شبکه و نرم‌افزار',
      levelId: grade10?.id,
      fieldId: netField10?.id,
      capacity: 30,
      roomNumber: 'اتاق ۱۰۱',
    },
    {
      code: 'CLS-10-M2',
      name: 'کلاس ۱۰۲ توسعه وب و اینترنت',
      levelId: grade10?.id,
      fieldId: webField10?.id,
      capacity: 28,
      roomNumber: 'اتاق ۱۰۲',
    },
    {
      code: 'CLS-10-M3',
      name: 'کلاس ۱۰۳ تولید چندرسانه‌ای',
      levelId: grade10?.id,
      fieldId: mediaField10?.id,
      capacity: 26,
      roomNumber: 'آتلیه رسانه',
    },
    {
      code: 'CLS-11-M1',
      name: 'کلاس ۲۰۱ شبکه و امنیت (یازدهم)',
      levelId: grade11?.id,
      fieldId: netField11?.id,
      capacity: 30,
      roomNumber: 'اتاق ۲۰۱',
    },
    {
      code: 'CLS-11-M2',
      name: 'کلاس ۲۰۲ پایگاه داده وب (یازدهم)',
      levelId: grade11?.id,
      fieldId: webField11?.id,
      capacity: 28,
      roomNumber: 'اتاق ۲۰۲',
    },
    {
      code: 'CLS-12-M1',
      name: 'کلاس ۳۰۱ مهندسی نرم‌افزار (دوازدهم)',
      levelId: grade12?.id,
      fieldId: netField12?.id,
      capacity: 25,
      roomNumber: 'کارگاه مرکزی',
    },
  ];

  const createdClassrooms: any[] = [];

  for (const cDef of classroomDefs) {
    if (!cDef.levelId) continue;
    const c = await prisma.classroom.upsert({
      where: {
        tenantId_academicYearId_code: {
          tenantId: boysTenant.id,
          academicYearId: academicYear.id,
          code: cDef.code,
        },
      },
      update: {
        name: cDef.name,
        capacity: cDef.capacity,
        roomNumber: cDef.roomNumber,
        mentorId: teacher1.userId,
      },
      create: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        levelId: cDef.levelId,
        fieldId: cDef.fieldId,
        name: cDef.name,
        code: cDef.code,
        capacity: cDef.capacity,
        roomNumber: cDef.roomNumber,
        mentorId: teacher1.userId,
      },
    });
    createdClassrooms.push(c);
  }

  console.log(`✅ ${createdClassrooms.length} classrooms ready.`);

  // 7. Seed Class Schedules so Teachers see all classes
  console.log('⏰ Seeding schedules for classrooms...');

  for (const c of createdClassrooms) {
    for (let period = 1; period <= 2; period++) {
      const assignedTeacher = period % 2 === 1 ? teacher1 : teacher2!;
      const assignedLesson = lessons.find((l) => l.fieldId === c.fieldId) || defaultLesson;
      const assignedLessonId = assignedLesson ? assignedLesson.id : defaultLesson.id;

      for (const day of ['SATURDAY', 'MONDAY', 'WEDNESDAY'] as const) {
        await prisma.classSchedule.upsert({
          where: {
            classroomId_dayOfWeek_periodNumber: {
              classroomId: c.id,
              dayOfWeek: day,
              periodNumber: period,
            },
          },
          update: {
            teacherId: assignedTeacher.id,
            lessonId: assignedLessonId,
          },
          create: {
            tenantId: boysTenant.id,
            classroomId: c.id,
            lessonId: assignedLessonId,
            teacherId: assignedTeacher.id,
            dayOfWeek: day,
            periodNumber: period,
            startTime: period === 1 ? '07:45' : '09:15',
            endTime: period === 1 ? '09:00' : '10:30',
          },
        });
      }
    }
  }

  // 8. Seed Pool of Students for all classes
  console.log('👥 Seeding students and enrolling them into each classroom...');
  const defaultPassword = await argon2.hash('RokadPass2026!');

  const studentDataList = [
    // Class 101
    { firstName: 'امیرعلی', lastName: 'صادقی', phone: '09124000001', code: '12345678', national: '0012345678', classIndex: 0 },
    { firstName: 'پارسا', lastName: 'مرادی', phone: '09124000002', code: '12345679', national: '0012345679', classIndex: 0 },
    { firstName: 'محمدطاها', lastName: 'کریمی', phone: '09124000003', code: '12345680', national: '0012345680', classIndex: 0 },
    { firstName: 'علی‌اصغر', lastName: 'رضایی', phone: '09124000004', code: '12345681', national: '0012345681', classIndex: 0 },
    { firstName: 'ایلیا', lastName: 'ناصری', phone: '09124000005', code: '12345682', national: '0012345682', classIndex: 0 },
    { firstName: 'سامیار', lastName: 'حسینی', phone: '09124000006', code: '12345683', national: '0012345683', classIndex: 0 },

    // Class 102
    { firstName: 'علیرضا', lastName: 'قاسمی', phone: '09124000007', code: '12345684', national: '0012345684', classIndex: 1 },
    { firstName: 'مهدی', lastName: 'حیدری', phone: '09124000008', code: '12345685', national: '0012345685', classIndex: 1 },
    { firstName: 'یونس', lastName: 'اکبری', phone: '09124000009', code: '12345686', national: '0012345686', classIndex: 1 },
    { firstName: 'برسام', lastName: 'زمانی', phone: '09124000010', code: '12345687', national: '0012345687', classIndex: 1 },
    { firstName: 'امیررضا', lastName: 'ابراهیمی', phone: '09124000011', code: '12345688', national: '0012345688', classIndex: 1 },

    // Class 103
    { firstName: 'طاها', lastName: 'سعیدی', phone: '09124000012', code: '12345689', national: '0012345689', classIndex: 2 },
    { firstName: 'متین', lastName: 'رستمی', phone: '09124000013', code: '12345690', national: '0012345690', classIndex: 2 },
    { firstName: 'دانیال', lastName: 'شریفی', phone: '09124000014', code: '12345691', national: '0012345691', classIndex: 2 },
    { firstName: 'پرهام', lastName: 'باقری', phone: '09124000015', code: '12345692', national: '0012345692', classIndex: 2 },

    // Class 201 (Grade 11)
    { firstName: 'کوروش', lastName: 'معتمدی', phone: '09124000016', code: '12345693', national: '0012345693', classIndex: 3 },
    { firstName: 'آرتین', lastName: 'جعفری', phone: '09124000017', code: '12345694', national: '0012345694', classIndex: 3 },
    { firstName: 'رهام', lastName: 'کیانی', phone: '09124000018', code: '12345695', national: '0012345695', classIndex: 3 },
    { firstName: 'کیان', lastName: 'خسروی', phone: '09124000019', code: '12345696', national: '0012345696', classIndex: 3 },

    // Class 202 (Grade 11)
    { firstName: 'مانی', lastName: 'نیک‌بین', phone: '09124000020', code: '12345697', national: '0012345697', classIndex: 4 },
    { firstName: 'شایان', lastName: 'مقصودی', phone: '09124000021', code: '12345698', national: '0012345698', classIndex: 4 },
    { firstName: 'سپهر', lastName: 'کاظمیان', phone: '09124000022', code: '12345699', national: '0012345699', classIndex: 4 },

    // Class 301 (Grade 12)
    { firstName: 'سینا', lastName: 'موسوی', phone: '09124000023', code: '12345700', national: '0012345700', classIndex: 5 },
    { firstName: 'فرزاد', lastName: 'بهرامی', phone: '09124000024', code: '12345701', national: '0012345701', classIndex: 5 },
    { firstName: 'آرمین', lastName: 'نوری', phone: '09124000025', code: '12345702', national: '0012345702', classIndex: 5 },
    { firstName: 'نوید', lastName: 'افشار', phone: '09124000026', code: '12345703', national: '0012345703', classIndex: 5 },
  ];

  const allStudentProfiles: { student: any; classroom: any; index: number }[] = [];

  for (const sData of studentDataList) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_phone: {
          tenantId: boysTenant.id,
          phone: sData.phone,
        },
      },
      update: {
        firstName: sData.firstName,
        lastName: sData.lastName,
      },
      create: {
        tenantId: boysTenant.id,
        firstName: sData.firstName,
        lastName: sData.lastName,
        phone: sData.phone,
        passwordHash: defaultPassword,
        role: 'STUDENT',
        gender: Gender.MALE,
        status: 'ACTIVE',
      },
    });

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        studentCode: sData.code,
        nationalCode: sData.national,
      },
      create: {
        tenantId: boysTenant.id,
        userId: user.id,
        studentCode: sData.code,
        nationalCode: sData.national,
        fatherName: 'احمد',
        birthDate: new Date('2009-06-15'),
      },
    });

    const targetClass = createdClassrooms[sData.classIndex] || createdClassrooms[0];

    await prisma.classEnrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId: targetClass.id,
          studentId: studentProfile.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        tenantId: boysTenant.id,
        academicYearId: academicYear.id,
        classroomId: targetClass.id,
        studentId: studentProfile.id,
        status: 'ACTIVE',
      },
    });

    allStudentProfiles.push({
      student: studentProfile,
      classroom: targetClass,
      index: sData.classIndex,
    });
  }

  console.log(`✅ Enrolled ${allStudentProfiles.length} students into all classrooms.`);

  // 9. Seed Attendance Records for Today and Past Dates
  console.log('📝 Seeding realistic attendance records across dates...');

  const datesToSeed = [
    '2026-09-13', // Today (Jalali 1405/06/23)
    '2026-09-12', // Yesterday
    '2026-09-10',
    '2026-09-08',
    '2026-09-01',
  ];

  let attendanceCount = 0;

  for (const dateStr of datesToSeed) {
    for (const item of allStudentProfiles) {
      // Deterministic variety: 85% Present, 5% Tardy, 5% Excused Absent, 5% Absent
      const seedVal = (item.student.studentCode.charCodeAt(item.student.studentCode.length - 1) + dateStr.charCodeAt(dateStr.length - 1)) % 10;
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let delayMinutes = 0;
      let reason: string | undefined = undefined;

      if (seedVal === 7) {
        status = AttendanceStatus.TARDY;
        delayMinutes = 15;
        reason = 'تاخیر در سرویس ایاب و ذهاب';
      } else if (seedVal === 8) {
        status = AttendanceStatus.EXCUSED_ABSENT;
        reason = 'مراجعه به پزشک با گواهی';
      } else if (seedVal === 9) {
        status = AttendanceStatus.ABSENT;
        reason = 'غیبت غیرموجه کلاسی';
      }

      await prisma.studentAttendance.upsert({
        where: {
          tenantId_classroomId_studentId_date_periodNumber: {
            tenantId: boysTenant.id,
            classroomId: item.classroom.id,
            studentId: item.student.id,
            date: dateStr,
            periodNumber: 1,
          },
        },
        update: {
          status,
          delayMinutes,
          reason,
        },
        create: {
          tenantId: boysTenant.id,
          academicYearId: academicYear.id,
          classroomId: item.classroom.id,
          studentId: item.student.id,
          date: dateStr,
          periodNumber: 1,
          status,
          delayMinutes,
          reason,
          recordedById: teacher1.userId,
        },
      });

      attendanceCount++;
    }
  }

  console.log(`✅ Seeded ${attendanceCount} student attendance records across all classes and dates!`);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
