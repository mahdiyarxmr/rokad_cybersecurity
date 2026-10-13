import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Precision Seeding for Rokad Boy & Girl Technical High Schools...');

  const passwordHash = await argon2.hash('Rokad1404!');

  // 1. Core Feature Flags
  const flags = [
    { key: 'academic_attendance', name: 'حضور و غیاب', defaultEnabled: true },
    { key: 'academic_homework', name: 'تکالیف درسی', defaultEnabled: true },
    { key: 'lms_question_bank', name: 'بانک سوالات', defaultEnabled: true },
    { key: 'lms_online_exam', name: 'آزمون آنلاین', defaultEnabled: true },
    { key: 'live_chat', name: 'پیام‌رسان کلاسی', defaultEnabled: true },
    { key: 'finance_fee_engine', name: 'مدیریت شهریه', defaultEnabled: true },
    { key: 'finance_payroll', name: 'حقوق و دستمزد', defaultEnabled: true },
  ];

  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: f,
      create: f,
    });
  }

  // 2. Tenants: Boys & Girls Schools
  const boys = await prisma.tenant.upsert({
    where: { slug: 'rokad-boys' },
    update: {
      name: 'هنرستان پسرانه رکاد',
      theme: 'MALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
    },
    create: {
      name: 'هنرستان پسرانه رکاد',
      slug: 'rokad-boys',
      subdomain: 'boys',
      theme: 'MALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
      phone: '09121111111',
    },
  });

  const girls = await prisma.tenant.upsert({
    where: { slug: 'rokad-girls' },
    update: {
      name: 'هنرستان دخترانه رکاد',
      theme: 'FEMALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
    },
    create: {
      name: 'هنرستان دخترانه رکاد',
      slug: 'rokad-girls',
      subdomain: 'girls',
      theme: 'FEMALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
      phone: '09121111112',
    },
  });

  // Enable all feature flags for both schools
  const allFlags = await prisma.featureFlag.findMany();
  for (const t of [boys, girls]) {
    for (const fl of allFlags) {
      await prisma.tenantFeatureFlag.upsert({
        where: {
          tenantId_featureFlagId: {
            tenantId: t.id,
            featureFlagId: fl.id,
          },
        },
        update: { isEnabled: true },
        create: {
          tenantId: t.id,
          featureFlagId: fl.id,
          isEnabled: true,
        },
      });
    }
  }

  // 3. Academic Years (1404-1405)
  const boysYear = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId: boys.id, name: '۱۴۰۴-۱۴۰۵' } },
    update: { isCurrent: true },
    create: {
      tenantId: boys.id,
      name: '۱۴۰۴-۱۴۰۵',
      startDate: new Date('2025-09-23T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  const girlsYear = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId: girls.id, name: '۱۴۰۴-۱۴۰۵' } },
    update: { isCurrent: true },
    create: {
      tenantId: girls.id,
      name: '۱۴۰۴-۱۴۰۵',
      startDate: new Date('2025-09-23T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  // 4. Grades 10, 11, 12 for both schools
  const grades = [
    { name: 'پایه دهم', code: 'GRADE_10', orderIndex: 10 },
    { name: 'پایه یازدهم', code: 'GRADE_11', orderIndex: 11 },
    { name: 'پایه دوازدهم', code: 'GRADE_12', orderIndex: 12 },
  ];

  const boysLevels: Record<string, any> = {};
  const girlsLevels: Record<string, any> = {};

  for (const g of grades) {
    boysLevels[g.code] = await prisma.educationalLevel.upsert({
      where: { tenantId_code: { tenantId: boys.id, code: g.code } },
      update: { name: g.name, orderIndex: g.orderIndex },
      create: { tenantId: boys.id, name: g.name, code: g.code, orderIndex: g.orderIndex },
    });

    girlsLevels[g.code] = await prisma.educationalLevel.upsert({
      where: { tenantId_code: { tenantId: girls.id, code: g.code } },
      update: { name: g.name, orderIndex: g.orderIndex },
      create: { tenantId: girls.id, name: g.name, code: g.code, orderIndex: g.orderIndex },
    });
  }

  // 5. Fields of Study
  // Boys: شبکه و نرم‌افزار رایانه & تولید محتوای چندرسانه‌ای
  // Girls: شبکه و نرم‌افزار رایانه
  const boysFields: Record<string, any> = {};
  const girlsFields: Record<string, any> = {};

  for (const code of ['GRADE_10', 'GRADE_11', 'GRADE_12']) {
    const lvlB = boysLevels[code];
    boysFields[`${code}_NET`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: boys.id,
          levelId: lvlB.id,
          name: 'شبکه و نرم‌افزار رایانه',
        },
      },
      update: { code: `B_${code}_NET` },
      create: {
        tenantId: boys.id,
        levelId: lvlB.id,
        name: 'شبکه و نرم‌افزار رایانه',
        code: `B_${code}_NET`,
      },
    });

    boysFields[`${code}_WEB`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: boys.id,
          levelId: lvlB.id,
          name: 'تولید و توسعه پایگاه‌های اینترنتی',
        },
      },
      update: { code: `B_${code}_WEB` },
      create: {
        tenantId: boys.id,
        levelId: lvlB.id,
        name: 'تولید و توسعه پایگاه‌های اینترنتی',
        code: `B_${code}_WEB`,
      },
    });

    boysFields[`${code}_MEDIA`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: boys.id,
          levelId: lvlB.id,
          name: 'تولید محتوای چندرسانه‌ای',
        },
      },
      update: { code: `B_${code}_MEDIA` },
      create: {
        tenantId: boys.id,
        levelId: lvlB.id,
        name: 'تولید محتوای چندرسانه‌ای',
        code: `B_${code}_MEDIA`,
      },
    });

    const lvlG = girlsLevels[code];
    girlsFields[`${code}_NET`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: girls.id,
          levelId: lvlG.id,
          name: 'شبکه و نرم‌افزار رایانه',
        },
      },
      update: { code: `G_${code}_NET` },
      create: {
        tenantId: girls.id,
        levelId: lvlG.id,
        name: 'شبکه و نرم‌افزار رایانه',
        code: `G_${code}_NET`,
      },
    });

    girlsFields[`${code}_WEB`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: girls.id,
          levelId: lvlG.id,
          name: 'تولید و توسعه پایگاه‌های اینترنتی',
        },
      },
      update: { code: `G_${code}_WEB` },
      create: {
        tenantId: girls.id,
        levelId: lvlG.id,
        name: 'تولید و توسعه پایگاه‌های اینترنتی',
        code: `G_${code}_WEB`,
      },
    });

    girlsFields[`${code}_MEDIA`] = await prisma.studyField.upsert({
      where: {
        tenantId_levelId_name: {
          tenantId: girls.id,
          levelId: lvlG.id,
          name: 'تولید محتوای چندرسانه‌ای',
        },
      },
      update: { code: `G_${code}_MEDIA` },
      create: {
        tenantId: girls.id,
        levelId: lvlG.id,
        name: 'تولید محتوای چندرسانه‌ای',
        code: `G_${code}_MEDIA`,
      },
    });
  }

  // 6. Realistic Classrooms
  // Boys: دهم شبکه، دهم چندرسانه‌ای، یازدهم شبکه، یازدهم چندرسانه‌ای، دوازدهم شبکه، دوازدهم چندرسانه‌ای
  const boysClassesDef = [
    { name: 'دهم شبکه و نرم‌افزار الف', code: 'B-10-NET-A', level: 'GRADE_10', field: 'GRADE_10_NET', room: 'کارگاه ۱۰۱' },
    { name: 'دهم چندرسانه‌ای الف', code: 'B-10-MEDIA-A', level: 'GRADE_10', field: 'GRADE_10_MEDIA', room: 'آتلیه رسانه ۱' },
    { name: 'یازدهم شبکه و نرم‌افزار الف', code: 'B-11-NET-A', level: 'GRADE_11', field: 'GRADE_11_NET', room: 'کارگاه ۲۰۲' },
    { name: 'یازدهم چندرسانه‌ای الف', code: 'B-11-MEDIA-A', level: 'GRADE_11', field: 'GRADE_11_MEDIA', room: 'آتلیه رسانه ۲' },
    { name: 'دوازدهم شبکه و نرم‌افزار الف', code: 'B-12-NET-A', level: 'GRADE_12', field: 'GRADE_12_NET', room: 'کارگاه ۳۰۱' },
    { name: 'دوازدهم چندرسانه‌ای الف', code: 'B-12-MEDIA-A', level: 'GRADE_12', field: 'GRADE_12_MEDIA', room: 'استودیو ضبط' },
  ];

  const boysClasses: Record<string, any> = {};
  for (const c of boysClassesDef) {
    boysClasses[c.code] = await prisma.classroom.upsert({
      where: {
        tenantId_academicYearId_code: {
          tenantId: boys.id,
          academicYearId: boysYear.id,
          code: c.code,
        },
      },
      update: {
        name: c.name,
        levelId: boysLevels[c.level].id,
        fieldId: boysFields[c.field].id,
        roomNumber: c.room,
      },
      create: {
        tenantId: boys.id,
        academicYearId: boysYear.id,
        levelId: boysLevels[c.level].id,
        fieldId: boysFields[c.field].id,
        name: c.name,
        code: c.code,
        roomNumber: c.room,
        capacity: 25,
      },
    });
  }

  // Girls: دهم شبکه، یازدهم شبکه، دوازدهم شبکه
  const girlsClassesDef = [
    { name: 'دهم شبکه و نرم‌افزار', code: 'G-10-NET', level: 'GRADE_10', field: 'GRADE_10_NET', room: 'کارگاه رایانه ۱' },
    { name: 'یازدهم شبکه و نرم‌افزار', code: 'G-11-NET', level: 'GRADE_11', field: 'GRADE_11_NET', room: 'کارگاه رایانه ۲' },
    { name: 'دوازدهم شبکه و نرم‌افزار', code: 'G-12-NET', level: 'GRADE_12', field: 'GRADE_12_NET', room: 'سایت تخصصی' },
  ];

  const girlsClasses: Record<string, any> = {};
  for (const c of girlsClassesDef) {
    girlsClasses[c.code] = await prisma.classroom.upsert({
      where: {
        tenantId_academicYearId_code: {
          tenantId: girls.id,
          academicYearId: girlsYear.id,
          code: c.code,
        },
      },
      update: {
        name: c.name,
        levelId: girlsLevels[c.level].id,
        fieldId: girlsFields[c.field].id,
        roomNumber: c.room,
      },
      create: {
        tenantId: girls.id,
        academicYearId: girlsYear.id,
        levelId: girlsLevels[c.level].id,
        fieldId: girlsFields[c.field].id,
        name: c.name,
        code: c.code,
        roomNumber: c.room,
        capacity: 25,
      },
    });
  }

  // 7. Core High School Vocational Lessons
  // Boys Lessons
  const boysLessonsDef = [
    // مشترک دهم
    { name: 'دانش فنی پایه شبکه', code: 'B-NET-BASE-10', units: 3, level: 'GRADE_10', field: 'GRADE_10_NET' },
    { name: 'نصب و راه‌اندازی سیستم‌های رایانه‌ای', code: 'B-SYS-SETUP-10', units: 8, level: 'GRADE_10', field: 'GRADE_10_NET' },
    { name: 'طراحی گرافیک رایانه‌ای و تصویرسازی', code: 'B-GRAPHIC-10', units: 8, level: 'GRADE_10', field: 'GRADE_10_MEDIA' },
    { name: 'عکاسی دیجیتال و نورپردازی', code: 'B-PHOTO-10', units: 4, level: 'GRADE_10', field: 'GRADE_10_MEDIA' },
    // یازدهم
    { name: 'توسعه برنامه‌سازی و پایگاه‌داده', code: 'B-DEV-DB-11', units: 8, level: 'GRADE_11', field: 'GRADE_11_NET' },
    { name: 'پیاده‌سازی سیستم‌های اطلاعاتی و وب', code: 'B-WEB-DEV-11', units: 8, level: 'GRADE_11', field: 'GRADE_11_NET' },
    { name: 'تدوین فیلم و تولید پویانمایی دو بعدی', code: 'B-ANIM-EDIT-11', units: 8, level: 'GRADE_11', field: 'GRADE_11_MEDIA' },
    // دوازدهم
    { name: 'نصب و نگهداری تجهیزات شبکه و امنیت', code: 'B-NET-SEC-12', units: 8, level: 'GRADE_12', field: 'GRADE_12_NET' },
    { name: 'تجارت الکترونیک و امنیت شبکه', code: 'B-ECOMM-12', units: 8, level: 'GRADE_12', field: 'GRADE_12_NET' },
    { name: 'صداگذاری، جلوه‌های ویژه و موشن گرافیک', code: 'B-MOTION-FX-12', units: 8, level: 'GRADE_12', field: 'GRADE_12_MEDIA' },
    // عمومی
    { name: 'فارسی و نگارش', code: 'B-FA-GEN', units: 2, level: 'GRADE_10' },
    { name: 'ریاضی ۱', code: 'B-MATH-1', units: 3, level: 'GRADE_10' },
  ];

  const boysLessons: Record<string, any> = {};
  for (const l of boysLessonsDef) {
    boysLessons[l.code] = await prisma.lesson.upsert({
      where: { tenantId_code: { tenantId: boys.id, code: l.code } },
      update: {
        name: l.name,
        unitCount: l.units,
        levelId: boysLevels[l.level].id,
        fieldId: l.field ? boysFields[l.field].id : null,
      },
      create: {
        tenantId: boys.id,
        name: l.name,
        code: l.code,
        unitCount: l.units,
        levelId: boysLevels[l.level].id,
        fieldId: l.field ? boysFields[l.field].id : null,
        type: 'SPECIALIZED',
      },
    });
  }

  // Girls Lessons
  const girlsLessonsDef = [
    { name: 'دانش فنی پایه شبکه و نرم‌افزار', code: 'G-NET-BASE-10', units: 3, level: 'GRADE_10', field: 'GRADE_10_NET' },
    { name: 'تولید محتوای الکترونیک و برنامه‌سازی', code: 'G-CONTENT-PROG-10', units: 8, level: 'GRADE_10', field: 'GRADE_10_NET' },
    { name: 'پیاده‌سازی سیستم‌های اطلاعاتی و طراحی وب', code: 'G-WEB-SYS-11', units: 8, level: 'GRADE_11', field: 'GRADE_11_NET' },
    { name: 'توسعه برنامه‌سازی و پایگاه داده', code: 'G-DEV-DB-11', units: 8, level: 'GRADE_11', field: 'GRADE_11_NET' },
    { name: 'نصب و نگهداری تجهیزات شبکه و امنیت', code: 'G-NET-SEC-12', units: 8, level: 'GRADE_12', field: 'GRADE_12_NET' },
    { name: 'تجارت الکترونیک و امنیت شبکه', code: 'G-ECOMM-12', units: 8, level: 'GRADE_12', field: 'GRADE_12_NET' },
  ];

  const girlsLessons: Record<string, any> = {};
  for (const l of girlsLessonsDef) {
    girlsLessons[l.code] = await prisma.lesson.upsert({
      where: { tenantId_code: { tenantId: girls.id, code: l.code } },
      update: {
        name: l.name,
        unitCount: l.units,
        levelId: girlsLevels[l.level].id,
        fieldId: girlsFields[l.field].id,
      },
      create: {
        tenantId: girls.id,
        name: l.name,
        code: l.code,
        unitCount: l.units,
        levelId: girlsLevels[l.level].id,
        fieldId: girlsFields[l.field].id,
        type: 'SPECIALIZED',
      },
    });
  }

  // 8. Users & Accounts for Login (Standardized Password: "Rokad1404!")
  console.log('👥 Creating standard users for Boy and Girl campuses...');

  // Boys Admin
  const boysAdmin = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: boys.id, phone: '09121111111' } },
    update: { passwordHash, role: 'SCHOOL_ADMIN', status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      firstName: 'مدیر',
      lastName: 'هنرستان پسرانه',
      phone: '09121111111',
      email: 'boys-admin@rokad.ir',
      username: 'boysadmin',
      passwordHash,
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Girls Admin
  const girlsAdmin = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: girls.id, phone: '09121111112' } },
    update: { passwordHash, role: 'SCHOOL_ADMIN', status: 'ACTIVE' },
    create: {
      tenantId: girls.id,
      firstName: 'مدیره',
      lastName: 'هنرستان دخترانه',
      phone: '09121111112',
      email: 'girls-admin@rokad.ir',
      username: 'girlsadmin',
      passwordHash,
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Boys Teachers
  const teacherBoy1User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: boys.id, phone: '09122222221' } },
    update: { passwordHash, role: 'TEACHER', status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      firstName: 'مهندس محمدرضا',
      lastName: 'کاظمی (شبکه و وب)',
      phone: '09122222221',
      email: 'kazemi@rokad.ir',
      username: 'kazemi',
      passwordHash,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherBoy1Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacherBoy1User.id },
    update: { speciality: 'مهندسی شبکه و وب' },
    create: {
      tenantId: boys.id,
      userId: teacherBoy1User.id,
      speciality: 'مهندسی شبکه و وب',
      degree: 'ارشد نرم‌افزار',
    },
  });

  const teacherBoy2User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: boys.id, phone: '09122222222' } },
    update: { passwordHash, role: 'TEACHER', status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      firstName: 'استاد نیما',
      lastName: 'صادقی (چندرسانه‌ای)',
      phone: '09122222222',
      email: 'sadeghi@rokad.ir',
      username: 'sadeghi',
      passwordHash,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherBoy2Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacherBoy2User.id },
    update: { speciality: 'جلوه‌های بصری و تدوین' },
    create: {
      tenantId: boys.id,
      userId: teacherBoy2User.id,
      speciality: 'جلوه‌های بصری و تدوین',
      degree: 'کارشناسی سینما و چندرسانه‌ای',
    },
  });

  // Girls Teacher
  const teacherGirl1User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: girls.id, phone: '09122222223' } },
    update: { passwordHash, role: 'TEACHER', status: 'ACTIVE' },
    create: {
      tenantId: girls.id,
      firstName: 'مهندس سارا',
      lastName: 'تهرانی (شبکه و نرم‌افزار)',
      phone: '09122222223',
      email: 'tehrani@rokad.ir',
      username: 'tehrani',
      passwordHash,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherGirl1Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacherGirl1User.id },
    update: { speciality: 'شبکه و نرم‌افزار' },
    create: {
      tenantId: girls.id,
      userId: teacherGirl1User.id,
      speciality: 'شبکه و نرم‌افزار',
      degree: 'کارشناسی ارشد شبکه',
    },
  });

  // Boys Students (Enrolled in Classrooms)
  const boyStudent1User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: boys.id, phone: '09123333331' } },
    update: { passwordHash, role: 'STUDENT', status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      firstName: 'امیرعلی',
      lastName: 'رضایی (دهم شبکه)',
      phone: '09123333331',
      username: 'amiralir',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  const boyStudent1Profile = await prisma.studentProfile.upsert({
    where: { userId: boyStudent1User.id },
    update: { studentCode: '4041001' },
    create: {
      tenantId: boys.id,
      userId: boyStudent1User.id,
      studentCode: '4041001',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classroomId_studentId: {
        classroomId: boysClasses['B-10-NET-A'].id,
        studentId: boyStudent1Profile.id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      academicYearId: boysYear.id,
      classroomId: boysClasses['B-10-NET-A'].id,
      studentId: boyStudent1Profile.id,
      status: 'ACTIVE',
    },
  });

  const boyStudent2User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: boys.id, phone: '09123333332' } },
    update: { passwordHash, role: 'STUDENT', status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      firstName: 'بردیا',
      lastName: 'کریمی (دهم رسانه)',
      phone: '09123333332',
      username: 'bardia',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  const boyStudent2Profile = await prisma.studentProfile.upsert({
    where: { userId: boyStudent2User.id },
    update: { studentCode: '4041002' },
    create: {
      tenantId: boys.id,
      userId: boyStudent2User.id,
      studentCode: '4041002',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classroomId_studentId: {
        classroomId: boysClasses['B-10-MEDIA-A'].id,
        studentId: boyStudent2Profile.id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: boys.id,
      academicYearId: boysYear.id,
      classroomId: boysClasses['B-10-MEDIA-A'].id,
      studentId: boyStudent2Profile.id,
      status: 'ACTIVE',
    },
  });

  // Girls Student
  const girlStudent1User = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: girls.id, phone: '09123333333' } },
    update: { passwordHash, role: 'STUDENT', status: 'ACTIVE' },
    create: {
      tenantId: girls.id,
      firstName: 'ستایش',
      lastName: 'مرادی (دهم شبکه)',
      phone: '09123333333',
      username: 'setayesh',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  const girlStudent1Profile = await prisma.studentProfile.upsert({
    where: { userId: girlStudent1User.id },
    update: { studentCode: '4042001' },
    create: {
      tenantId: girls.id,
      userId: girlStudent1User.id,
      studentCode: '4042001',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classroomId_studentId: {
        classroomId: girlsClasses['G-10-NET'].id,
        studentId: girlStudent1Profile.id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: girls.id,
      academicYearId: girlsYear.id,
      classroomId: girlsClasses['G-10-NET'].id,
      studentId: girlStudent1Profile.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Precision Seeding Completed Successfully for Rokad High Schools!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
