import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rokad Platform Comprehensive Database Seeding...');

  // 1. Seed Core Feature Flags
  console.log('📦 1. Seeding Core Feature Flags...');
  const featureFlags = [
    {
      key: 'academic_attendance',
      name: 'سامانه حضور و غیاب هوشمند',
      description: 'ثبت تردد روزانه دانش‌آموزان و ارسال اعلان به والدین',
      category: 'ERP_ACADEMIC',
      defaultEnabled: true,
    },
    {
      key: 'academic_homework',
      name: 'مدیریت و تصحیح تکالیف',
      description: 'امکان تعریف، تحویل و نمره‌دهی به تکالیف درسی',
      category: 'ERP_ACADEMIC',
      defaultEnabled: true,
    },
    {
      key: 'lms_question_bank',
      name: 'بانک سوالات و آزمون‌ساز',
      description: 'طراحی آزمون و دسته‌بندی سوالات تستی و تشریحی',
      category: 'LMS',
      defaultEnabled: true,
    },
    {
      key: 'lms_online_exam',
      name: 'موتور آزمون آنلاین',
      description: 'برگزاری امتحانات آنلاین با تصحیح خودکار و ضدتقلب',
      category: 'LMS',
      defaultEnabled: true,
    },
    {
      key: 'live_chat',
      name: 'پیام‌رسان و چت درون‌برنامه‌ای',
      description: 'چت کلاسی، گفتگوی معلم با دانش‌آموز و والدین',
      category: 'LIVE_COMMUNICATION',
      defaultEnabled: true,
    },
    {
      key: 'live_online_class',
      name: 'کلاس آنلاین و وبینار',
      description: 'اتصال به بیگ‌بلوباتن و جیتسی جهت پخش زنده کلاس',
      category: 'LIVE_COMMUNICATION',
      defaultEnabled: true,
    },
    {
      key: 'finance_fee_engine',
      name: 'مدیریت شهریه و اقساط',
      description: 'محاسبه شهریه، ثبت فیش، اقساط‌بندی و پرداخت آنلاین',
      category: 'FINANCE',
      defaultEnabled: true,
    },
    {
      key: 'finance_payroll',
      name: 'حقوق و دستمزد اساتید و پرسنل',
      description: 'محاسبه کارکرد ساعتی، فیش حقوقی و تسویه‌حساب',
      category: 'FINANCE',
      defaultEnabled: true,
    },
    {
      key: 'ka_system',
      name: 'سیستم کا و تنظیمات پیشرفته',
      description: 'ماژول سیستم کا و امتیازدهی اختصاصی رکاد',
      category: 'FINANCE_KA',
      defaultEnabled: true,
    },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: flag,
      create: flag,
    });
  }

  // 2. Seed System Permissions (Phase 2)
  console.log('🛡️ 2. Seeding System Permissions...');
  const permissions = [
    // Academic & Classes
    { code: 'academic.year.read', module: 'ERP_ACADEMIC', name: 'مشاهده سال‌های تحصیلی' },
    { code: 'academic.year.write', module: 'ERP_ACADEMIC', name: 'ایجاد و ویرایش سال تحصیلی' },
    { code: 'academic.level.write', module: 'ERP_ACADEMIC', name: 'مدیریت مقاطع تحصیلی' },
    { code: 'academic.field.write', module: 'ERP_ACADEMIC', name: 'مدیریت رشته‌های تحصیلی' },
    { code: 'lesson.read', module: 'ERP_ACADEMIC', name: 'مشاهده دروس و کتاب‌ها' },
    { code: 'lesson.write', module: 'ERP_ACADEMIC', name: 'تعریف و ویرایش دروس' },
    { code: 'classroom.read', module: 'ERP_ACADEMIC', name: 'مشاهده کلاس‌های درس' },
    { code: 'classroom.write', module: 'ERP_ACADEMIC', name: 'ایجاد و ویرایش کلاس درس' },
    { code: 'schedule.read', module: 'ERP_ACADEMIC', name: 'مشاهده برنامه هفتگی' },
    { code: 'schedule.write', module: 'ERP_ACADEMIC', name: 'تنظیم و ویرایش برنامه هفتگی' },
    { code: 'enrollment.write', module: 'ERP_ACADEMIC', name: 'ثبت‌نام و کلاس‌بندی دانش‌آموزان' },

    // Members Directory
    { code: 'student.read', module: 'ERP_MEMBERS', name: 'مشاهده پرونده دانش‌آموزان' },
    { code: 'student.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش دانش‌آموزان' },
    { code: 'teacher.read', module: 'ERP_MEMBERS', name: 'مشاهده لیست معلمان' },
    { code: 'teacher.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش معلمان' },
    { code: 'coach.read', module: 'ERP_MEMBERS', name: 'مشاهده مربیان و مشاوران' },
    { code: 'coach.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش مربیان' },
    { code: 'staff.read', module: 'ERP_MEMBERS', name: 'مشاهده پرسنل اداری' },
    { code: 'staff.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش پرسنل' },
    { code: 'parent.read', module: 'ERP_MEMBERS', name: 'مشاهده پرونده اولیا' },
    { code: 'parent.write', module: 'ERP_MEMBERS', name: 'ثبت و ویرایش اولیا' },
    { code: 'parent.student.link', module: 'ERP_MEMBERS', name: 'پیوند والد و دانش‌آموز' },

    // Roles & RBAC
    { code: 'role.read', module: 'RBAC', name: 'مشاهده نقش‌های مدرسه' },
    { code: 'role.write', module: 'RBAC', name: 'ایجاد و ویرایش نقش‌ها' },
    { code: 'role.assign', module: 'RBAC', name: 'تخصیص نقش سازمانی به کاربران' },

    // Profiles & Blogs
    { code: 'school.profile.write', module: 'PROFILE', name: 'ویرایش مشخصات عمومی مدرسه' },
    { code: 'blog.write', module: 'PROFILE', name: 'نگارش مقاله در وبلاگ مدرسه' },
    { code: 'blog.publish', module: 'PROFILE', name: 'انتشار و تایید مقالات' },

    // Daily Operations
    { code: 'attendance.read', module: 'OPERATIONS', name: 'مشاهده آمار حضور و غیاب' },
    { code: 'attendance.write', module: 'OPERATIONS', name: 'ثبت حضور و غیاب کلاسی' },
    { code: 'homework.read', module: 'OPERATIONS', name: 'مشاهده تکالیف' },
    { code: 'homework.write', module: 'OPERATIONS', name: 'تعریف و نمره‌دهی تکلیف' },
    { code: 'calendar.write', module: 'OPERATIONS', name: 'مدیریت تقویم و رویدادها' },

    // LMS & Grades
    { code: 'exam.read', module: 'LMS', name: 'مشاهده آزمون‌ها' },
    { code: 'exam.write', module: 'LMS', name: 'طراحی آزمون و سوالات' },
    { code: 'grades.read', module: 'LMS', name: 'مشاهده کارنامه و نمرات' },
    { code: 'grades.write', module: 'LMS', name: 'ثبت و نهایی‌سازی نمرات' },

    // Finance & HR
    { code: 'finance.fee.read', module: 'FINANCE', name: 'مشاهده وضعیت شهریه دانش‌آموزان' },
    { code: 'finance.fee.write', module: 'FINANCE', name: 'ثبت فیش و تقسیط شهریه' },
    { code: 'finance.check.manage', module: 'FINANCE', name: 'مدیریت و تغییر وضعیت چک‌ها' },
    { code: 'finance.fee.import', module: 'FINANCE', name: 'ورود گروهی اطلاعات مالی از اکسل' },
    { code: 'finance.payroll.read', module: 'FINANCE', name: 'مشاهده فیش‌های حقوقی' },
    { code: 'finance.payroll.write', module: 'FINANCE', name: 'محاسبه و صدور حقوق' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  // 3. Seed Platform Root Tenant & Global SuperAdmin
  console.log('👑 3. Seeding Platform Root Tenant & Super Admin...');
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform-root' },
    update: {
      name: 'مرکز مدیریت پلتفرم رکاد',
      type: 'PLATFORM',
      theme: 'ECOSYSTEM',
      status: 'ACTIVE',
    },
    create: {
      name: 'مرکز مدیریت پلتفرم رکاد',
      slug: 'platform-root',
      subdomain: 'admin',
      type: 'PLATFORM',
      theme: 'ECOSYSTEM',
      status: 'ACTIVE',
      email: 'admin@rokadschool.ir',
      phone: '09120000000',
    },
  });

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to seed production with repository sample accounts. Create production users out of band.',
    );
  }
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
  const publishedSample = superAdminPassword.length < 12 || /rokad/i.test(superAdminPassword) && /2026/.test(superAdminPassword);
  if (!superAdminPassword || publishedSample) {
    throw new Error(
      'Set SUPER_ADMIN_PASSWORD to a unique value before seeding. Published sample passwords are rejected.',
    );
  }
  const superAdminPasswordHash = await argon2.hash(superAdminPassword);
  await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: platformTenant.id,
        phone: '09120000000',
      },
    },
    update: {
      passwordHash: superAdminPasswordHash,
      isPlatformAdmin: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      tenantId: platformTenant.id,
      firstName: 'مدیر کل',
      lastName: 'پلتفرم رکاد',
      phone: '09120000000',
      email: 'admin@rokadschool.ir',
      username: 'superadmin',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      status: 'ACTIVE',
    },
  });

  // 4. Seed Rokad Boys School Tenant
  console.log('👦 4. Seeding Rokad Boys School Structure & Members...');
  const boysTenant = await prisma.tenant.upsert({
    where: { slug: 'rokad-boys' },
    update: {
      name: 'هنرستان فنی و حرفه‌ای پسرانه رکاد',
      type: 'SCHOOL',
      theme: 'MALE',
      subdomain: 'boys',
      status: 'ACTIVE',
    },
    create: {
      name: 'هنرستان فنی و حرفه‌ای پسرانه رکاد',
      slug: 'rokad-boys',
      subdomain: 'boys',
      type: 'SCHOOL',
      theme: 'MALE',
      status: 'ACTIVE',
      email: 'boys@rokadschool.ir',
      phone: '09121111111',
      address: 'تهران، مجتمع آموزشی رکاد پسرانه',
    },
  });

  const boysAdminPasswordHash = await argon2.hash('RokadBoysPass2026!');
  const boysAdmin = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09121111111',
      },
    },
    update: {
      passwordHash: boysAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
    },
    create: {
      tenantId: boysTenant.id,
      firstName: 'امیرحسین',
      lastName: 'امیریان (راهبر پسرانه)',
      phone: '09101654176',
      email: 'boys-admin@rokadschool.ir',
      username: '09101654176',
      passwordHash: boysAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  const boysVice = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: boysTenant.id,
        username: 'boysvice',
      },
    },
    update: {
      phone: '09021600933',
      passwordHash: boysAdminPasswordHash,
      role: 'STAFF',
      status: 'ACTIVE',
    },
    create: {
      tenantId: boysTenant.id,
      firstName: 'عماد',
      lastName: 'پورحسنی (معاون پسرانه)',
      phone: '09021600933',
      email: 'boys-vice@rokadschool.ir',
      username: '09021600933',
      passwordHash: boysAdminPasswordHash,
      role: 'STAFF',
      status: 'ACTIVE',
      staffProfile: {
        create: {
          tenantId: boysTenant.id,
          department: 'آموزش',
          jobTitle: 'معاون آموزشی',
        },
      },
    },
  });

  const coachPasswordHash = await argon2.hash('RokadPass2026!');
  const boysCoach = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09129990001',
      },
    },
    update: {
      passwordHash: coachPasswordHash,
      role: 'COACH',
      status: 'ACTIVE',
    },
    create: {
      tenantId: boysTenant.id,
      firstName: 'استاد علی',
      lastName: 'صادقی (کوچ و مشاور)',
      phone: '09129990001',
      email: 'coach@rokadschool.ir',
      username: 'boyscoach',
      passwordHash: coachPasswordHash,
      role: 'COACH',
      status: 'ACTIVE',
    },
  });

  // 5. Seed Academic Structure for Boys School (Only Current Academic Year 1405-1406)
  const academicYear = await prisma.academicYear.upsert({
    where: {
      tenantId_name: {
        tenantId: boysTenant.id,
        name: '۱۴۰۵-۱۴۰۶',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: boysTenant.id,
      name: '۱۴۰۵-۱۴۰۶',
      startDate: new Date('2026-09-23T00:00:00.000Z'),
      endDate: new Date('2027-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  await prisma.term.upsert({
    where: {
      academicYearId_name: {
        academicYearId: academicYear.id,
        name: 'نیم‌سال اول',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: boysTenant.id,
      academicYearId: academicYear.id,
      name: 'نیم‌سال اول',
      startDate: new Date('2026-09-23T00:00:00.000Z'),
      endDate: new Date('2027-01-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });


  // 5.1 Seed Girls School (شعبه دخترانه)
  const girlsTenant = await prisma.tenant.upsert({
    where: { slug: 'rokad-girls' },
    update: {
      name: 'هنرستان فنی و حرفه‌ای دخترانه رکاد',
      type: 'SCHOOL',
      theme: 'FEMALE',
      subdomain: 'girls',
      status: 'ACTIVE',
    },
    create: {
      name: 'هنرستان فنی و حرفه‌ای دخترانه رکاد',
      slug: 'rokad-girls',
      subdomain: 'girls',
      type: 'SCHOOL',
      theme: 'FEMALE',
      status: 'ACTIVE',
      email: 'girls@rokadschool.ir',
      phone: '09121111112',
      address: 'تهران، مجتمع آموزشی رکاد دخترانه',
    },
  });

  const girlsAdminPasswordHash = await argon2.hash('RokadGirlsPass2026!');
  const girlsAdmin = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: girlsTenant.id,
        phone: '09121111112',
      },
    },
    update: {
      passwordHash: girlsAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
    },
    create: {
      tenantId: girlsTenant.id,
      firstName: 'رویا',
      lastName: 'دولت‌آبادی (راهبر دخترانه)',
      phone: '09307966319',
      email: 'girls-admin@rokadschool.ir',
      username: '09307966319',
      passwordHash: girlsAdminPasswordHash,
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  const girlsVice = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: girlsTenant.id,
        phone: '09122221112',
      },
    },
    update: {
      phone: '09150747096',
      passwordHash: girlsAdminPasswordHash,
      role: 'STAFF',
      status: 'ACTIVE',
    },
    create: {
      tenantId: girlsTenant.id,
      firstName: 'مبینا',
      lastName: 'فلاح (معاون دخترانه)',
      phone: '09150747096',
      email: 'girls-vice@rokadschool.ir',
      username: '09150747096',
      passwordHash: girlsAdminPasswordHash,
      role: 'STAFF',
      status: 'ACTIVE',
      staffProfile: {
        create: {
          tenantId: girlsTenant.id,
          department: 'آموزش',
          jobTitle: 'معاون آموزشی',
        },
      },
    },
  });

  const girlsAcademicYear = await prisma.academicYear.upsert({
    where: {
      tenantId_name: {
        tenantId: girlsTenant.id,
        name: '۱۴۰۵-۱۴۰۶',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: girlsTenant.id,
      name: '۱۴۰۵-۱۴۰۶',
      startDate: new Date('2026-09-23T00:00:00.000Z'),
      endDate: new Date('2027-06-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  await prisma.term.upsert({
    where: {
      academicYearId_name: {
        academicYearId: girlsAcademicYear.id,
        name: 'نیم‌سال اول',
      },
    },
    update: { isCurrent: true },
    create: {
      tenantId: girlsTenant.id,
      academicYearId: girlsAcademicYear.id,
      name: 'نیم‌سال اول',
      startDate: new Date('2026-09-23T00:00:00.000Z'),
      endDate: new Date('2027-01-20T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  // 6. Seed Teacher
  const defaultPass = await argon2.hash('RokadPass2026!');

  const teacherUser = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09123000001',
      },
    },
    update: {},
    create: {
      tenantId: boysTenant.id,
      firstName: 'دکتر بهزاد',
      lastName: 'کاظمی',
      phone: '09123000001',
      email: 'kazemi@rokadschool.ir',
      passwordHash: defaultPass,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      userId: teacherUser.id,
      speciality: 'ریاضیات و حسابان پیشرفته',
      degree: 'دکتری ریاضی کاربردی',
      employmentType: 'FULL_TIME',
    },
  });
  // 7. Seed School Profiles
  await prisma.schoolProfile.upsert({
    where: { tenantId: boysTenant.id },
    update: {},
    create: {
      tenantId: boysTenant.id,
      motto: 'تربیت نسل پیشرو، خلاق و کارآفرین در اکوسیستم آموزشی رکاد',
      aboutHtml: '<h2>درباره مجتمع پسرانه رکاد</h2><p>مدرسه رکاد با رویکرد آموزش پروژه‌محور و تلفیق فناوری با مهارت‌های زندگی فعالیت می‌کند.</p>',
      managerName: 'علیرضا احمدی',
      managerMessage: 'با همراهی اولیای گرامی و اساتید فرهیخته، آینده‌ای درخشان را رقم می‌زنیم.',
    },
  });

  await prisma.schoolProfile.upsert({
    where: { tenantId: girlsTenant.id },
    update: {},
    create: {
      tenantId: girlsTenant.id,
      motto: 'پرورش دختران توانمند، نوآور و اخلاق‌مدار در رکاد',
      aboutHtml: '<h2>درباره مجتمع دخترانه رکاد</h2><p>فضایی پویا و شاداب برای یادگیری علوم نوین و مهارت‌های کاربردی دیجیتال.</p>',
      managerName: 'فاطمه حسینی',
      managerMessage: 'آینده از آنِ دختران دانا و پرتلاش امروز است.',
    },
  });



  // 12. Phase 7: Seed SaaS SuperAdmin & Platform Operations
  console.log('⚡ 12. Seeding Phase 7 SaaS SuperAdmin (Plans, Global Roles & Platform Ops)...');

  // Subscription Plans
  const trialPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'FREE_TRIAL' },
    update: {},
    create: {
      code: 'FREE_TRIAL',
      name: 'پلن آزمایشی ۱۴ روزه',
      description: 'دسترسی آزمایشی به امکانات پایه سامانه',
      monthlyPrice: 0,
      annualPrice: 0,
      maxStudents: 50,
      maxTeachers: 10,
      maxStorageMb: 1024,
      bundledFeatureFlags: ['LMS_EXAMS'],
      isPublic: true,
      isActive: true,
    },
  });

  const standardPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'STANDARD_SCHOOL' },
    update: {},
    create: {
      code: 'STANDARD_SCHOOL',
      name: 'پلن جامع مدارس استاندارد',
      description: 'پکیج کامل ERP، سیستم آزمون‌ساز آنلاین، حضور و غیاب، چت و امور مالی',
      monthlyPrice: 2500000,
      annualPrice: 25000000,
      maxStudents: 400,
      maxTeachers: 40,
      maxStorageMb: 15360, // 15 GB
      bundledFeatureFlags: ['LMS_EXAMS', 'LIVE_CHAT', 'FINANCE_PAYROLL'],
      isPublic: true,
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'PRO_CAMPUS' },
    update: {},
    create: {
      code: 'PRO_CAMPUS',
      name: 'پلن سازمانی مجتمع‌ها و کالج‌ها',
      description: 'ظرفیت نامحدود، چندشعبه‌ای، هوش مصنوعی اختصاصی، فضای ابری نامحدود',
      monthlyPrice: 6500000,
      annualPrice: 65000000,
      maxStudents: 1500,
      maxTeachers: 150,
      maxStorageMb: 51200, // 50 GB
      bundledFeatureFlags: ['LMS_EXAMS', 'LIVE_CHAT', 'FINANCE_PAYROLL', 'ONLINE_CLASSES', 'MULTI_CAMPUS'],
      isPublic: true,
      isActive: true,
    },
  });

  // Assign Standard Plan to Boys School
  const subEndDate = new Date();
  subEndDate.setFullYear(subEndDate.getFullYear() + 1);

  await prisma.tenantSubscription.create({
    data: {
      tenantId: boysTenant.id,
      planId: standardPlan.id,
      billingCycle: 'ANNUAL',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: subEndDate,
      paidAmount: standardPlan.annualPrice,
    },
  });

  // Global Role Templates
  const vicePrincipalTemplate = await prisma.globalRoleTemplate.upsert({
    where: { code: 'ACADEMIC_VICE_PRINCIPAL' },
    update: {},
    create: {
      code: 'ACADEMIC_VICE_PRINCIPAL',
      name: 'معاون آموزشی استاندارد',
      description: 'قالب کشوری نقش معاونت آموزشی مدارس با دسترسی کامل به فرآیندهای تحصیلی و آزمون‌ها',
      targetTenantType: 'SCHOOL',
      isSystem: true,
      permissions: {
        create: [
          { permissionCode: 'attendance.read' },
          { permissionCode: 'attendance.write' },
          { permissionCode: 'homework.read' },
          { permissionCode: 'homework.write' },
          { permissionCode: 'exam.read' },
          { permissionCode: 'exam.write' },
          { permissionCode: 'grades.read' },
          { permissionCode: 'grades.write' },
        ],
      },
    },
  });

  const chiefAccountantTemplate = await prisma.globalRoleTemplate.upsert({
    where: { code: 'CHIEF_ACCOUNTANT' },
    update: {},
    create: {
      code: 'CHIEF_ACCOUNTANT',
      name: 'حسابدار ارشد مالی',
      description: 'قالب کشوری مدیریت مالی، شهریه، اقساط و حقوق و دستمزد',
      targetTenantType: 'SCHOOL',
      isSystem: true,
      permissions: {
        create: [
          { permissionCode: 'finance.fee.read' },
          { permissionCode: 'finance.fee.write' },
          { permissionCode: 'finance.payroll.read' },
          { permissionCode: 'finance.payroll.write' },
        ],
      },
    },
  });

  // 8.5. Official Ka Platform Rewards (سیستم جامع پاداش مدارس رُکاد)
  console.log('🎁 Seeding Official Ka Platform Rewards...');
  const officialRewards = [
    // ۱. پاداش‌های عمومی
    { parent: 'پاداش‌های عمومی', name: 'تخفیف شهریه فوق برنامه', minToken: 300, maxToken: 500, icon: 'Percent', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'تخفیف هزینه شرکت در رویدادها و اردوها', minToken: 50, maxToken: 500, icon: 'Compass', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'کمک‌هزینه ثبت‌نام در دوره‌های آموزشی', minToken: 100, maxToken: 500, icon: 'GraduationCap', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'کمک‌هزینه خرید اشتراک وب‌سایت‌های آموزشی', minToken: 50, maxToken: 200, icon: 'Globe', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'کمک‌هزینه خرید کتاب‌های توسعه فردی', minToken: 50, maxToken: 200, icon: 'BookOpen', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'کمک‌هزینه خرید بازی‌های فکری', minToken: 50, maxToken: 200, icon: 'Gamepad2', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'کمک‌هزینه خرید لوازم الکترونیکی', minToken: 100, maxToken: 300, icon: 'Laptop', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'سرمایه‌گذاری روی ایده‌ها', minToken: 200, maxToken: 500, icon: 'Lightbulb', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'رزرو جلسات مشاوره اختصاصی', minToken: 200, maxToken: 500, icon: 'UserCheck', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'رزرو تایم عکاسی اختصاصی', minToken: 200, maxToken: 200, icon: 'Camera', color: '#652D90' },
    { parent: 'پاداش‌های عمومی', name: 'چاپ لوازم اختصاصی (لیوان، لباس یا ...)', minToken: 50, maxToken: 300, icon: 'Printer', color: '#652D90' },

    // ۲. پاداش‌های اختصاصی (۵ نفر برتر پایه)
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'اولویت در ثبت‌نام رویدادها', minToken: 0, maxToken: 0, icon: 'در لحظه', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'اولویت در تخصیص پروژه‌ها و فرصت‌های شغلی', minToken: 0, maxToken: 0, icon: 'در لحظه', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'تخصیص فضای کار در خارج از زمان مدرسه', minToken: 0, maxToken: 0, icon: 'پایان هر ماه', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'نمایش دائمی نمونه‌کارها در مدرسه', minToken: 0, maxToken: 0, icon: 'پایان هر ماه', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'معرفی در فضای مجازی', minToken: 0, maxToken: 0, icon: '۱۵ بهمن / ۱۵ تیر', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'شرکت در رویدادها و اردوهای ویژه', minToken: 0, maxToken: 0, icon: '۱۵ بهمن / ۱۵ تیر', color: '#F8A41D' },
    { parent: 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', name: 'ثبت عکس در دیوار افتخارات', minToken: 0, maxToken: 0, icon: '۱۵ شهریور', color: '#F8A41D' },

    // ۳. پاداش نیکوکارانه
    { parent: 'پاداش نیکوکارانه', name: 'کمک به انجام امور نیکوکارانه در مدرسه و خارج از مدرسه', minToken: 1, maxToken: null, icon: 'به میزان دلخواه', color: '#E0195B' },
  ];

  for (const t of [boysTenant, girlsTenant]) {
    for (const rew of officialRewards) {
      const existing = await prisma.kaReward.findFirst({
        where: { tenantId: t.id, name: rew.name },
      });
      if (!existing) {
        await prisma.kaReward.create({
          data: {
            tenantId: t.id,
            parent: rew.parent,
            name: rew.name,
            minToken: rew.minToken,
            maxToken: rew.maxToken,
            icon: rew.icon,
            color: rew.color,
          },
        });
      }
    }
  }

  // Global Platform Settings
  await prisma.platformSetting.upsert({
    where: { key: 'PLATFORM_MAINTENANCE_MODE' },
    update: {},
    create: {
      key: 'PLATFORM_MAINTENANCE_MODE',
      value: {
        enabled: false,
        message: 'سامانه رکاد فعال است.',
      },
      description: 'حالت تعمیرات سراسری پلتفرم رکاد',
    },
  });

  console.log('✅ Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6 & Phase 7 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
