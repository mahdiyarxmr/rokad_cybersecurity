import { PrismaClient, DayOfWeek, UserRole, AttendanceStatus, DisciplinaryRewardType, GradeType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive Seed for Gradebook & Classrooms Evaluation Testing...');

  const passwordHash = await argon2.hash('Rokad1404!');

  // 1. Get or Create Boys High School Tenant
  const school = await prisma.tenant.upsert({
    where: { slug: 'rokad-boys' },
    update: {
      name: 'هنرستان فنی پسرانه رکاد',
      theme: 'MALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
    },
    create: {
      name: 'هنرستان فنی پسرانه رکاد',
      slug: 'rokad-boys',
      subdomain: 'boys',
      theme: 'MALE',
      type: 'SCHOOL',
      status: 'ACTIVE',
      phone: '09121111111',
    },
  });

  const tenantId = school.id;
  console.log('✅ Tenant Verified:', school.name, tenantId);

  // 2. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId, name: '۱۴۰۴-۱۴۰۵' } },
    update: { isCurrent: true },
    create: {
      tenantId,
      name: '۱۴۰۴-۱۴۰۵',
      startDate: new Date('2025-09-23T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  // 3. Educational Levels & Fields
  const grade10 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId, code: 'GRADE_10' } },
    update: { name: 'پایه دهم', orderIndex: 10 },
    create: { tenantId, name: 'پایه دهم', code: 'GRADE_10', orderIndex: 10 },
  });

  const grade11 = await prisma.educationalLevel.upsert({
    where: { tenantId_code: { tenantId, code: 'GRADE_11' } },
    update: { name: 'پایه یازدهم', orderIndex: 11 },
    create: { tenantId, name: 'پایه یازدهم', code: 'GRADE_11', orderIndex: 11 },
  });

  const fieldNet10 = await prisma.studyField.upsert({
    where: {
      tenantId_levelId_name: {
        tenantId,
        levelId: grade10.id,
        name: 'شبکه و نرم‌افزار رایانه',
      },
    },
    update: { code: 'B_10_NET' },
    create: {
      tenantId,
      levelId: grade10.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'B_10_NET',
    },
  });

  const fieldNet11 = await prisma.studyField.upsert({
    where: {
      tenantId_levelId_name: {
        tenantId,
        levelId: grade11.id,
        name: 'شبکه و نرم‌افزار رایانه',
      },
    },
    update: { code: 'B_11_NET' },
    create: {
      tenantId,
      levelId: grade11.id,
      name: 'شبکه و نرم‌افزار رایانه',
      code: 'B_11_NET',
    },
  });

  const upsertUser = async (data: any) => {
    const existing = await prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          ...(data.username ? [{ username: data.username }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });
    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          ...data,
          tenantId,
        },
      });
    }
    return prisma.user.create({
      data: {
        ...data,
        tenantId,
      },
    });
  };

  // 4. Test Accounts: Manager (Admin), Vice Principal (Staff), Teacher
  // 4.1 Admin (مدیر)
  const adminUser = await upsertUser({
    firstName: 'علیرضا',
    lastName: 'افشار (مدیر هنرستان)',
    phone: '09121111111',
    username: 'boysadmin',
    email: 'boys-admin@rokad.ir',
    passwordHash,
    role: UserRole.SCHOOL_ADMIN,
    status: 'ACTIVE',
  });

  // 4.2 Staff (معاون آموزشی)
  const viceUser = await upsertUser({
    firstName: 'حمید',
    lastName: 'حسینی (معاون آموزشی)',
    phone: '09121111119',
    username: 'boysvice',
    email: 'vice@rokad.ir',
    passwordHash,
    role: UserRole.STAFF,
    status: 'ACTIVE',
  });

  await prisma.staffProfile.upsert({
    where: { userId: viceUser.id },
    update: { personnelCode: 'STF-1404-01' },
    create: {
      tenantId,
      userId: viceUser.id,
      personnelCode: 'STF-1404-01',
    },
  });

  // 4.3 Teacher (مهندس کاظمی)
  const teacherUser = await upsertUser({
    firstName: 'محمدرضا',
    lastName: 'کاظمی',
    phone: '09122222221',
    username: 'kazemi',
    email: 'kazemi@rokad.ir',
    passwordHash,
    role: UserRole.TEACHER,
    status: 'ACTIVE',
  });

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: { speciality: 'مهندسی کامپیوتر و شبکه' },
    create: {
      tenantId,
      userId: teacherUser.id,
      speciality: 'مهندسی کامپیوتر و شبکه',
      degree: 'کارشناسی ارشد نرم‌افزار',
    },
  });

  console.log('✅ Accounts ready:');
  console.log('   - مدیر: boysadmin / Rokad1404! (09121111111)');
  console.log('   - معاون: boysvice / Rokad1404! (09121111119)');
  console.log('   - دبیر: kazemi / Rokad1404! (09122222221)');

  // 5. Classrooms
  const class10NetA = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId,
        academicYearId: academicYear.id,
        code: 'B-10-NET-A',
      },
    },
    update: {
      name: 'دهم شبکه و نرم‌افزار الف',
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      roomNumber: 'کارگاه رایانه ۱۰۱',
      mentorId: teacherUser.id,
    },
    create: {
      tenantId,
      academicYearId: academicYear.id,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      name: 'دهم شبکه و نرم‌افزار الف',
      code: 'B-10-NET-A',
      roomNumber: 'کارگاه رایانه ۱۰۱',
      capacity: 30,
      mentorId: teacherUser.id,
    },
  });

  const class11NetA = await prisma.classroom.upsert({
    where: {
      tenantId_academicYearId_code: {
        tenantId,
        academicYearId: academicYear.id,
        code: 'B-11-NET-A',
      },
    },
    update: {
      name: 'یازدهم شبکه و نرم‌افزار الف',
      levelId: grade11.id,
      fieldId: fieldNet11.id,
      roomNumber: 'سایت تخصصی ۲۰۲',
      mentorId: teacherUser.id,
    },
    create: {
      tenantId,
      academicYearId: academicYear.id,
      levelId: grade11.id,
      fieldId: fieldNet11.id,
      name: 'یازدهم شبکه و نرم‌افزار الف',
      code: 'B-11-NET-A',
      roomNumber: 'سایت تخصصی ۲۰۲',
      capacity: 30,
      mentorId: teacherUser.id,
    },
  });

  // 6. Lessons: Theory (General) & Modular (Podman)
  // 6.1 Lessons Definition
  const lessonsData = [
    // دروس عمومی (نظری - کارنامه‌ای)
    {
      name: 'ریاضی ۱ (فنی)',
      code: 'B-MATH-1',
      unitCount: 3,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: false,
      podmanCount: 5,
      podmanTitles: [],
    },
    {
      name: 'فارسی و نگارش ۱',
      code: 'B-FA-10',
      unitCount: 2,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: false,
      podmanCount: 5,
      podmanTitles: [],
    },
    {
      name: 'زبان انگلیسی ۱',
      code: 'B-EN-10',
      unitCount: 2,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: false,
      podmanCount: 5,
      podmanTitles: [],
    },
    {
      name: 'فیزیک فنی',
      code: 'B-PHY-10',
      unitCount: 2,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: false,
      podmanCount: 5,
      podmanTitles: [],
    },

    // دروس تخصصی و کارگاهی (پودمانی)
    {
      name: 'نصب و راه‌اندازی سیستم‌های رایانه‌ای',
      code: 'B-SYS-SETUP-10',
      unitCount: 8,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: true,
      podmanCount: 5,
      podmanTitles: [
        'راه‌اندازی قطعات سخت‌افزار و کار با BIOS/UEFI',
        'نصب سیستم‌عامل ویندوز و درایورهای سخت‌افزاری',
        'نصب سیستم‌عامل لینوکس و تنظیمات اولیه محیطی',
        'کار با تجهیزات جانبی، چاپگرها و عیب‌یابی اولیه',
        'مونتاژ نهایی، ارتقا سیستم و نگهداری پیشگیرانه',
      ],
    },
    {
      name: 'دانش فنی پایه شبکه و نرم‌افزار',
      code: 'B-NET-BASE-10',
      unitCount: 3,
      levelId: grade10.id,
      fieldId: fieldNet10.id,
      isModular: true,
      podmanCount: 5,
      podmanTitles: [
        'مفاهیم پایه فناوری اطلاعات و محاسبات دودویی',
        'مدل مرجع OSI و تشریح لایه‌های شبکه',
        'کابل‌کشی ساخت‌یافته و تجهیزات پسیو شبکه',
        'آدرس‌دهی منطقی IPv4 و اصول Subnetting',
        'ایمنی در محیط کار و استانداردهای حرفه‌ای',
      ],
    },
    {
      name: 'توسعه برنامه‌سازی و پایگاه‌داده',
      code: 'B-DEV-DB-11',
      unitCount: 8,
      levelId: grade11.id,
      fieldId: fieldNet11.id,
      isModular: true,
      podmanCount: 5,
      podmanTitles: [
        'تحلیل مسئله، الگوریتم‌ها و فلوچارت',
        'مدل‌سازی رابطه‌ای و طراحی جداول پایگاه داده',
        'زبان SQL و تعریف کلیدهای اصلی و خارجی',
        'پرس‌وجوهای پیشرفته و دستورات DML در SQL',
        'اتصال نرم‌افزار کاربردی به بانک اطلاعاتی',
      ],
    },
    {
      name: 'پیاده‌سازی سیستم‌های اطلاعاتی و وب',
      code: 'B-WEB-DEV-11',
      unitCount: 8,
      levelId: grade11.id,
      fieldId: fieldNet11.id,
      isModular: true,
      podmanCount: 5,
      podmanTitles: [
        'ساختار صفحات وب مدرن با HTML5 و معناشناسی',
        'طراحی ظاهر و قالب‌بندی وب با CSS3',
        'طراحی واکنش‌گرا با Flexbox و CSS Grid',
        'تعامل پویای کاربر با JavaScript و دستکاری DOM',
        'انتشار، تست و میزبانی وب‌سایت روی سرور',
      ],
    },
  ];

  const createdLessons: Record<string, any> = {};

  for (const ld of lessonsData) {
    const lesson = await prisma.lesson.upsert({
      where: { tenantId_code: { tenantId, code: ld.code } },
      update: {
        name: ld.name,
        unitCount: ld.unitCount,
        levelId: ld.levelId,
        fieldId: ld.fieldId,
        isModular: ld.isModular,
        podmanCount: ld.podmanCount,
        type: ld.isModular ? 'TECHNICAL_MODULAR_COMPETENCY' : 'GENERAL',
      },
      create: {
        tenantId,
        name: ld.name,
        code: ld.code,
        unitCount: ld.unitCount,
        levelId: ld.levelId,
        fieldId: ld.fieldId,
        isModular: ld.isModular,
        podmanCount: ld.podmanCount,
        type: ld.isModular ? 'TECHNICAL_MODULAR_COMPETENCY' : 'GENERAL',
      },
    });

    createdLessons[ld.code] = lesson;

    // Seed Podmans if modular
    if (ld.isModular && ld.podmanTitles.length > 0) {
      for (let i = 0; i < ld.podmanTitles.length; i++) {
        const pNum = i + 1;
        const pTitle = ld.podmanTitles[i];
        await prisma.podman.upsert({
          where: {
            lessonId_number: {
              lessonId: lesson.id,
              number: pNum,
            },
          },
          update: {
            title: `پودمان ${pNum}: ${pTitle}`,
          },
          create: {
            tenantId,
            lessonId: lesson.id,
            number: pNum,
            title: `پودمان ${pNum}: ${pTitle}`,
          },
        });
      }
    }

    // Connect Teacher to Lesson
    await prisma.teacherLesson.upsert({
      where: {
        teacherId_lessonId: {
          teacherId: teacherProfile.id,
          lessonId: lesson.id,
        },
      },
      update: {},
      create: {
        tenantId,
        teacherId: teacherProfile.id,
        lessonId: lesson.id,
      },
    });
  }

  console.log('✅ Lessons & Podmans seeded and assigned to teacher Kazemi.');

  // 7. Connect Classroom Schedules (برنامه هفتگی)
  const mathLesson = createdLessons['B-MATH-1'];
  const sysSetupLesson = createdLessons['B-SYS-SETUP-10'];
  const netBaseLesson = createdLessons['B-NET-BASE-10'];
  const faLesson = createdLessons['B-FA-10'];

  const scheduleSlots = [
    { classroomId: class10NetA.id, lessonId: mathLesson.id, dayOfWeek: DayOfWeek.SATURDAY, period: 1, start: '08:00', end: '09:30' },
    { classroomId: class10NetA.id, lessonId: sysSetupLesson.id, dayOfWeek: DayOfWeek.SATURDAY, period: 2, start: '09:45', end: '11:15' },
    { classroomId: class10NetA.id, lessonId: sysSetupLesson.id, dayOfWeek: DayOfWeek.SATURDAY, period: 3, start: '11:30', end: '13:00' },
    { classroomId: class10NetA.id, lessonId: netBaseLesson.id, dayOfWeek: DayOfWeek.SUNDAY, period: 1, start: '08:00', end: '09:30' },
    { classroomId: class10NetA.id, lessonId: faLesson.id, dayOfWeek: DayOfWeek.SUNDAY, period: 2, start: '09:45', end: '11:15' },
    // Class 11 Net A:
    { classroomId: class11NetA.id, lessonId: createdLessons['B-DEV-DB-11'].id, dayOfWeek: DayOfWeek.MONDAY, period: 1, start: '08:00', end: '09:30' },
    { classroomId: class11NetA.id, lessonId: createdLessons['B-WEB-DEV-11'].id, dayOfWeek: DayOfWeek.MONDAY, period: 2, start: '09:45', end: '11:15' },
  ];

  for (const slot of scheduleSlots) {
    await prisma.classSchedule.upsert({
      where: {
        classroomId_dayOfWeek_periodNumber: {
          classroomId: slot.classroomId,
          dayOfWeek: slot.dayOfWeek,
          periodNumber: slot.period,
        },
      },
      update: {
        lessonId: slot.lessonId,
        teacherId: teacherProfile.id,
        startTime: slot.start,
        endTime: slot.end,
      },
      create: {
        tenantId,
        classroomId: slot.classroomId,
        lessonId: slot.lessonId,
        teacherId: teacherProfile.id,
        dayOfWeek: slot.dayOfWeek,
        periodNumber: slot.period,
        startTime: slot.start,
        endTime: slot.end,
      },
    });
  }

  console.log('✅ Weekly Class Schedules established.');

  // 8. Roster of 10 Realistic Students in Class 10 Net A
  const studentsRoster = [
    { code: '4041001', nationalId: '0012345671', first: 'امیرعلی', last: 'رضایی', phone: '09123333331' },
    { code: '4041002', nationalId: '0012345672', first: 'بردیا', last: 'کریمی', phone: '09123333332' },
    { code: '4041003', nationalId: '0012345673', first: 'محمدحسین', last: 'حسینی', phone: '09123333333' },
    { code: '4041004', nationalId: '0012345674', first: 'پارسا', last: 'جعفری', phone: '09123333334' },
    { code: '4041005', nationalId: '0012345675', first: 'علی', last: 'اکبری', phone: '09123333335' },
    { code: '4041006', nationalId: '0012345676', first: 'شایان', last: 'مهدوی', phone: '09123333336' },
    { code: '4041007', nationalId: '0012345677', first: 'آرتین', last: 'قاسمی', phone: '09123333337' },
    { code: '4041008', nationalId: '0012345688', first: 'کیان', last: 'احمدی', phone: '09123333338' },
    { code: '4041009', nationalId: '0012345679', first: 'دانیال', last: 'طاهری', phone: '09123333339' },
    { code: '4041010', nationalId: '0012345680', first: 'سینا', last: 'رستمی', phone: '09123333340' },
  ];

  const studentProfiles: any[] = [];

  for (const st of studentsRoster) {
    const studentUser = await upsertUser({
      firstName: st.first,
      lastName: st.last,
      phone: st.phone,
      nationalId: st.nationalId,
      username: `st_${st.code}`,
      passwordHash,
      role: UserRole.STUDENT,
      status: 'ACTIVE',
    });

    const stProfile = await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: { studentCode: st.code },
      create: {
        tenantId,
        userId: studentUser.id,
        studentCode: st.code,
      },
    });

    studentProfiles.push({ profile: stProfile, user: studentUser, data: st });

    // Enroll in Class 10 Net A
    await prisma.classEnrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId: class10NetA.id,
          studentId: stProfile.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        tenantId,
        academicYearId: academicYear.id,
        classroomId: class10NetA.id,
        studentId: stProfile.id,
        status: 'ACTIVE',
      },
    });

    // Parent account for this student (Username: p + nationalId, Password: p + nationalId)
    const parentPasswordHash = await argon2.hash(`p${st.nationalId}`);
    const parentPhone = `0999${st.nationalId.slice(3)}`;

    const parentUser = await upsertUser({
      nationalId: `PAR-${st.nationalId}`,
      username: `p${st.nationalId}`,
      passwordHash: parentPasswordHash,
      firstName: `ولی دانش‌آموز ${st.first}`,
      lastName: st.last,
      phone: parentPhone,
      role: UserRole.PARENT,
      status: 'ACTIVE',
    });

    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        tenantId,
        userId: parentUser.id,
      },
    });

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfile.id,
          studentId: stProfile.id,
        },
      },
      update: { isPrimaryContact: true },
      create: {
        tenantId,
        parentId: parentProfile.id,
        studentId: stProfile.id,
        relationType: 'FATHER',
        isPrimaryContact: true,
      },
    });
  }

  console.log(`✅ 10 Students enrolled in "${class10NetA.name}" with synchronized Parent accounts.`);

  // 9. Historical Attendance & Classroom Evaluations (4 Previous Sessions)
  const sessionDates = ['2026-09-12', '2026-09-15', '2026-09-19', '2026-09-22'];

  const evaluationConfigs = [
    {
      oralGrades: [19.5, 20, 19, 20],
      rewardTypes: [DisciplinaryRewardType.EXCELLENT, DisciplinaryRewardType.POSITIVE, null, DisciplinaryRewardType.EXCELLENT],
      notes: ['تسلط کامل بر مفاهیم شبکه و پاسخ دقیق به سوال', 'حل تشریحی مساله روی تخته', 'همکاری عالی با سایر همکلاسی‌ها', 'ارائه پروژه بسیار باکیفیت'],
    },
    {
      oralGrades: [17, 18, 16.5, 17.5],
      rewardTypes: [DisciplinaryRewardType.POSITIVE, null, DisciplinaryRewardType.EXCELLENT, null],
      notes: ['تحویل به موقع تکلیف و پاسخگویی منظم', 'حضور به موقع و مشارکت کلاسی', 'حل تمرین کارگاهی به درستی', 'دقت مناسب در پیکربندی'],
    },
    {
      oralGrades: [14, 15, 13, 14.5],
      rewardTypes: [null, DisciplinaryRewardType.NEGATIVE, null, DisciplinaryRewardType.POSITIVE],
      notes: ['پاسخ نسبی به مباحث مقدماتی', 'کمی بی‌توجهی به توضیحات کارگاهی دبیر', 'نیاز به تمرین بیشتر در منزل', 'پیشرفت محسوس در جلسه آخر'],
    },
    {
      oralGrades: [19, 18.5, 20, 19],
      rewardTypes: [DisciplinaryRewardType.EXCELLENT, DisciplinaryRewardType.POSITIVE, null, DisciplinaryRewardType.EXCELLENT],
      notes: ['درک عمیق از عیب‌یابی سخت‌افزار', 'کمک به راه‌اندازی سیستم هم‌گروهی‌ها', 'حل سریع کوییز کلاسی', 'علاقه‌مند و پیگیر مباحث پیشرفته'],
    },
    {
      oralGrades: [12, 13.5, 14, 15],
      rewardTypes: [DisciplinaryRewardType.WARNING, null, DisciplinaryRewardType.POSITIVE, null],
      notes: ['عدم آمادگی در جلسه اول برای پاسخگویی', 'بهبود نسبی بعد از تذکر دبیر', 'انجام تکلیف به صورت کامل', 'تمرکز بهتر در کارگاه رایانه'],
    },
  ];

  for (let sIdx = 0; sIdx < sessionDates.length; sIdx++) {
    const dStr = sessionDates[sIdx];

    for (let stIdx = 0; stIdx < studentProfiles.length; stIdx++) {
      const st = studentProfiles[stIdx];
      const cfg = evaluationConfigs[stIdx % evaluationConfigs.length];

      const oralGrade = cfg.oralGrades[sIdx];
      const rewardType = cfg.rewardTypes[sIdx];
      const note = cfg.notes[sIdx];
      const isAbsent = stIdx === 8 && sIdx === 1;

      await prisma.studentAttendance.upsert({
        where: {
          tenantId_classroomId_studentId_date_periodNumber: {
            tenantId,
            classroomId: class10NetA.id,
            studentId: st.profile.id,
            date: dStr,
            periodNumber: 2,
          },
        },
        update: {
          lessonId: sysSetupLesson.id,
          status: isAbsent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
          oralGrade: isAbsent ? null : oralGrade,
          rewardDisciplineType: isAbsent ? null : rewardType,
          rewardDisciplineNote: isAbsent ? 'غیبت با اطلاع قبلی' : (rewardType ? 'ثبت در دفتر ارزیابی کلاسی دبیر' : null),
          sessionNote: isAbsent ? 'غایب' : note,
          recordedById: teacherUser.id,
        },
        create: {
          tenantId,
          academicYearId: academicYear.id,
          classroomId: class10NetA.id,
          studentId: st.profile.id,
          lessonId: sysSetupLesson.id,
          date: dStr,
          periodNumber: 2,
          status: isAbsent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
          oralGrade: isAbsent ? null : oralGrade,
          rewardDisciplineType: isAbsent ? null : rewardType,
          rewardDisciplineNote: isAbsent ? 'غیبت با اطلاع قبلی' : (rewardType ? 'ثبت در دفتر ارزیابی کلاسی دبیر' : null),
          sessionNote: isAbsent ? 'غایب' : note,
          recordedById: teacherUser.id,
        },
      });
    }
  }

  console.log('✅ 4 Sessions of Attendance, Oral Questioning & Discipline evaluations populated.');

  // 10. Homeworks & Submissions
  // Clean prior demo homeworks for this class to avoid duplicates
  const existingHw = await prisma.homework.findMany({
    where: { classroomId: class10NetA.id },
  });
  if (existingHw.length === 0) {
    const hw1 = await prisma.homework.create({
      data: {
        tenantId,
        classroomId: class10NetA.id,
        lessonId: sysSetupLesson.id,
        teacherId: teacherProfile.id,
        title: 'تمرین کارگاهی: مراحل نصب ویندوز ۱۱ و پارتیشن‌بندی GPT',
        description: 'گزارش مراحل نصب ویندوز همراه با تصویر تنظیمات BIOS/UEFI و جدول ساختار پارتیشن‌ها ارسال گردد.',
        dueDate: new Date(Date.now() + 7 * 86400 * 1000),
        maxScore: 20,
        isGraded: true,
      },
    });

    const hw2 = await prisma.homework.create({
      data: {
        tenantId,
        classroomId: class10NetA.id,
        lessonId: mathLesson.id,
        teacherId: teacherProfile.id,
        title: 'حل تمرین‌های پایانی فصل اول ریاضی ۱ (صفحه ۲۵)',
        description: 'پاسخ تشریحی سوالات ۱ تا ۵ فصل اول با دست‌خط خوانا آپلود شود.',
        dueDate: new Date(Date.now() + 3 * 86400 * 1000),
        maxScore: 20,
        isGraded: true,
      },
    });

    for (let i = 0; i < studentProfiles.length; i++) {
      const st = studentProfiles[i];
      const score = Math.max(12, Math.min(20, 19.5 - (i * 0.7)));

      await prisma.homeworkSubmission.create({
        data: {
          tenantId,
          homeworkId: hw1.id,
          studentId: st.profile.id,
          content: `گزارش کامل کارگاه نصب سیستم‌عامل توسط دانش‌آموز ${st.user.firstName} ${st.user.lastName}`,
          status: 'GRADED',
          score: parseFloat(score.toFixed(1)),
          feedback: score >= 17 ? 'عالی و با دقت فراوان تنظیم شده است.' : 'خوب بود، اما بخش پارتیشن‌بندی جای کار دارد.',
          gradedById: teacherUser.id,
          gradedAt: new Date(),
        },
      });

      if (i < 7) {
        await prisma.homeworkSubmission.create({
          data: {
            tenantId,
            homeworkId: hw2.id,
            studentId: st.profile.id,
            content: 'پاسخ تمرینات صفحه ۲۵',
            status: i < 4 ? 'GRADED' : 'SUBMITTED',
            score: i < 4 ? parseFloat((18 - (i * 0.5)).toFixed(1)) : null,
            feedback: i < 4 ? 'پاسخ‌ها صحیح هستند.' : null,
            gradedById: i < 4 ? teacherUser.id : null,
            gradedAt: i < 4 ? new Date() : null,
          },
        });
      }
    }
  }

  console.log('✅ Homeworks and student submissions ready.');

  // 11. Existing Official Grades in Gradebook
  // 11.1 Theory Lesson ("ریاضی ۱"): Seed Midterm / Continuous 1 and Final 1
  const generalGradeScores = [
    { c1: 19.5, f1: 19 },
    { c1: 17.5, f1: 16.5 },
    { c1: 14, f1: 13 },
    { c1: 18.5, f1: 18 },
    { c1: 13, f1: 12 },
    { c1: 16, f1: 15.5 },
    { c1: 17, f1: 16 },
    { c1: 15.5, f1: 14.5 },
    { c1: 11.5, f1: 10 },
    { c1: 18, f1: 17.5 },
  ];

  // Clean old grades for clean test state
  await prisma.gradeEntry.deleteMany({
    where: {
      tenantId,
      classroomId: class10NetA.id,
      lessonId: mathLesson.id,
    },
  });

  for (let i = 0; i < studentProfiles.length; i++) {
    const st = studentProfiles[i];
    const sc = generalGradeScores[i];

    // Continuous 1 (مستمر نوبت اول)
    await prisma.gradeEntry.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        classroomId: class10NetA.id,
        lessonId: mathLesson.id,
        studentId: st.profile.id,
        teacherId: teacherProfile.id,
        recordedById: teacherUser.id,
        gradeType: GradeType.CLASS_ACTIVITY,
        title: 'مستمر نوبت اول',
        score: sc.c1,
        maxScore: 20,
      },
    });

    // Final 1 (پایانی نوبت اول)
    await prisma.gradeEntry.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        classroomId: class10NetA.id,
        lessonId: mathLesson.id,
        studentId: st.profile.id,
        teacherId: teacherProfile.id,
        recordedById: teacherUser.id,
        gradeType: GradeType.FINAL_TERM_1,
        title: 'پایانی نوبت اول',
        score: sc.f1,
        maxScore: 20,
      },
    });
  }

  console.log('✅ Theory Grades (Continuous 1 & Final 1) seeded for "ریاضی ۱".');

  // 11.2 Modular Lesson ("نصب و راه‌اندازی سیستم‌های رایانه‌ای"): Seed Podman 1 & Podman 2
  const sysPodmans = await prisma.podman.findMany({
    where: { lessonId: sysSetupLesson.id },
    orderBy: { number: 'asc' },
  });

  const p1 = sysPodmans.find((p) => p.number === 1);
  const p2 = sysPodmans.find((p) => p.number === 2);

  if (p1 && p2) {
    for (let i = 0; i < studentProfiles.length; i++) {
      const st = studentProfiles[i];

      // Podman 1
      const p1Continuous = Math.max(2, Math.min(5, 4.8 - (i * 0.25)));
      const p1Competency = i < 7 ? 3 : 2;
      const p1Final = p1Continuous + (p1Competency * 5);

      await prisma.podmanGrade.upsert({
        where: {
          podmanId_studentId_attemptType: {
            podmanId: p1.id,
            studentId: st.profile.id,
            attemptType: 'REGULAR',
          },
        },
        update: {
          continuousScore: parseFloat(p1Continuous.toFixed(1)),
          competencyScore: p1Competency,
          finalScore: parseFloat(p1Final.toFixed(1)),
          isPassed: p1Final >= 12,
        },
        create: {
          tenantId,
          academicYearId: academicYear.id,
          classroomId: class10NetA.id,
          lessonId: sysSetupLesson.id,
          podmanId: p1.id,
          studentId: st.profile.id,
          teacherId: teacherProfile.id,
          recordedById: teacherUser.id,
          continuousScore: parseFloat(p1Continuous.toFixed(1)),
          competencyScore: p1Competency,
          finalScore: parseFloat(p1Final.toFixed(1)),
          isPassed: p1Final >= 12,
          notes: 'ارزیابی شایستگی پودمان ۱ سخت‌افزار و بایوس',
        },
      });

      // Podman 2
      const p2Continuous = Math.max(2.5, Math.min(5, 4.5 - (i * 0.2)));
      const p2Competency = i === 8 ? 1 : (i < 5 ? 3 : 2);
      const p2Final = p2Continuous + (p2Competency * 5);

      await prisma.podmanGrade.upsert({
        where: {
          podmanId_studentId_attemptType: {
            podmanId: p2.id,
            studentId: st.profile.id,
            attemptType: 'REGULAR',
          },
        },
        update: {
          continuousScore: parseFloat(p2Continuous.toFixed(1)),
          competencyScore: p2Competency,
          finalScore: parseFloat(p2Final.toFixed(1)),
          isPassed: p2Final >= 12,
        },
        create: {
          tenantId,
          academicYearId: academicYear.id,
          classroomId: class10NetA.id,
          lessonId: sysSetupLesson.id,
          podmanId: p2.id,
          studentId: st.profile.id,
          teacherId: teacherProfile.id,
          recordedById: teacherUser.id,
          continuousScore: parseFloat(p2Continuous.toFixed(1)),
          competencyScore: p2Competency,
          finalScore: parseFloat(p2Final.toFixed(1)),
          isPassed: p2Final >= 12,
          notes: 'ارزیابی شایستگی پودمان ۲ نصب ویندوز',
        },
      });
    }

    console.log('✅ Modular Podman Grades seeded for Podman 1 and 2.');
  }

  console.log('\n======================================================');
  console.log('🎉 COMPREHENSIVE SEED FINISHED SUCCESSFULLY! 🎉');
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('❌ Comprehensive Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
