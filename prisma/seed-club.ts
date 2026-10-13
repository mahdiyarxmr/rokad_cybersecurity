import { PrismaClient, ClubDepartment, ClubGrade, ClubMembershipStatus, ClubMilestoneType, ClubMilestoneStatus, ClubChallengeType, ClubSubmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rokad Business Club Seed...');

  const boysTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-boys' },
  });

  if (!boysTenant) {
    console.error('❌ Boys tenant not found!');
    return;
  }

  const tenantId = boysTenant.id;

  // 1. Find a specialized lesson for teacher approval milestone
  const sampleLesson =
    (await prisma.lesson.findFirst({
      where: { tenantId, name: { contains: 'حسابان' } },
    })) ||
    (await prisma.lesson.findFirst({
      where: { tenantId },
    }));

  // 2. Seed Dynamic Roadmap Milestones
  console.log('Creating Onboarding Roadmap Milestones...');

  const milestone1 = await prisma.clubRoadmapMilestone.upsert({
    where: { id: 'm-tech-approval-1' },
    update: {
      title: 'تأییدیه استاد درس تخصصی',
      description: 'احراز صلاحیت فنی، انضباط کاری و درک مهارت‌های پایه توسط دبیر تخصصی',
      icon: 'code',
      orderIndex: 1,
      weight: 30,
      type: ClubMilestoneType.TEACHER_APPROVAL,
      lessonId: sampleLesson?.id,
    },
    create: {
      id: 'm-tech-approval-1',
      tenantId,
      title: 'تأییدیه استاد درس تخصصی',
      description: 'احراز صلاحیت فنی، انضباط کاری و درک مهارت‌های پایه توسط دبیر تخصصی',
      icon: 'code',
      orderIndex: 1,
      weight: 30,
      type: ClubMilestoneType.TEACHER_APPROVAL,
      lessonId: sampleLesson?.id,
    },
  });

  const milestone2 = await prisma.clubRoadmapMilestone.upsert({
    where: { id: 'm-placement-challenge-2' },
    update: {
      title: 'چالش ورودی تعیین سطح و دپارتمان',
      description: 'ارسال پروژه عملی ورود به باشگاه؛ نمره این چالش دپارتمان تخصصی و گرید (A/B/C) شما را تعیین می‌کند',
      icon: 'target',
      orderIndex: 2,
      weight: 50,
      type: ClubMilestoneType.PLACEMENT_CHALLENGE,
    },
    create: {
      id: 'm-placement-challenge-2',
      tenantId,
      title: 'چالش ورودی تعیین سطح و دپارتمان',
      description: 'ارسال پروژه عملی ورود به باشگاه؛ نمره این چالش دپارتمان تخصصی و گرید (A/B/C) شما را تعیین می‌کند',
      icon: 'target',
      orderIndex: 2,
      weight: 50,
      type: ClubMilestoneType.PLACEMENT_CHALLENGE,
    },
  });

  const milestone3 = await prisma.clubRoadmapMilestone.upsert({
    where: { id: 'm-admin-interview-3' },
    update: {
      title: 'مصاحبه انگیزه و روحیه تیمی با راهبر باشگاه',
      description: 'جلسه آشنایی حضوری برای بررسی اشتیاق رشد، تفکر کارآفرینی و تعهد تیمی برای ورود به پروژه‌های استودیو',
      icon: 'users',
      orderIndex: 3,
      weight: 20,
      type: ClubMilestoneType.ADMIN_CHECKLIST,
    },
    create: {
      id: 'm-admin-interview-3',
      tenantId,
      title: 'مصاحبه انگیزه و روحیه تیمی با راهبر باشگاه',
      description: 'جلسه آشنایی حضوری برای بررسی اشتیاق رشد، تفکر کارآفرینی و تعهد تیمی برای ورود به پروژه‌های استودیو',
      icon: 'users',
      orderIndex: 3,
      weight: 20,
      type: ClubMilestoneType.ADMIN_CHECKLIST,
    },
  });

  console.log('✅ 3 Milestones established.');

  // 3. Seed Challenges for all 3 Departments
  console.log('Creating Department Challenges...');

  const challengeEngineer = await prisma.clubChallenge.upsert({
    where: { slug: 'engineer-placement-jwt-auth' },
    update: {
      title: 'پیاده‌سازی مینی‌سرویس احراز هویت با JWT و توکن رفرش',
      description: 'توسعه یک ماژول بک‌اند استاندارد با تفکیک توکن‌ها و امنیت بالا',
      missionBrief: `شما باید با استفاده از NestJS یا Express، یک ماژول احراز هویت پیاده‌سازی کنید که:
1. ثبت نام و ورود کاربر با کد ملی و رمز عبور امن (هش‌شده با Argon2 یا Bcrypt).
2. صدور جفت توکن Access Token (انقضای ۱۵ دقیقه) و Refresh Token (انقضای ۷ روز).
3. مکانیزم چرخش رفرش توکن (Token Family Rotation) برای جلوگیری از Replay Attack.
4. محافظت از اندپوینت پروفایل با میدلور یا گارد احراز هویت.

معیار داوری: تمیزی کد، تایپ‌سیفتی، پایداری در برابر خطاها و رعایت استانداردهای REST API.`,
      rules: 'ارسال آدرس مخزن GitHub معتبر + فایل README راهنمای راه‌اندازی الزامی است.',
      department: ClubDepartment.ENGINEER,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
    create: {
      tenantId,
      title: 'پیاده‌سازی مینی‌سرویس احراز هویت با JWT و توکن رفرش',
      slug: 'engineer-placement-jwt-auth',
      description: 'توسعه یک ماژول بک‌اند استاندارد با تفکیک توکن‌ها و امنیت بالا',
      missionBrief: `شما باید با استفاده از NestJS یا Express، یک ماژول احراز هویت پیاده‌سازی کنید که:
1. ثبت نام و ورود کاربر با کد ملی و رمز عبور امن (هش‌شده با Argon2 یا Bcrypt).
2. صدور جفت توکن Access Token (انقضای ۱۵ دقیقه) و Refresh Token (انقضای ۷ روز).
3. مکانیزم چرخش رفرش توکن (Token Family Rotation) برای جلوگیری از Replay Attack.
4. محافظت از اندپوینت پروفایل با میدلور یا گارد احراز هویت.

معیار داوری: تمیزی کد، تایپ‌سیفتی، پایداری در برابر خطاها و رعایت استانداردهای REST API.`,
      rules: 'ارسال آدرس مخزن GitHub معتبر + فایل README راهنمای راه‌اندازی الزامی است.',
      department: ClubDepartment.ENGINEER,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
  });

  const challengeArtist = await prisma.clubChallenge.upsert({
    where: { slug: 'artist-placement-ui-design-system' },
    update: {
      title: 'طراحی دیزاین‌سیستم و کیت UI موبایل در فیگما',
      description: 'خلق یک کیت رابط کاربری کامل بر پایه سبک مدرن نئوبروتالیسم برای اپلیکیشن دانش‌آموزی',
      missionBrief: `ماموریت شما خلق یک سیستم طراحی جذاب در فیگما است که شامل:
1. تعریف پالت رنگی با کنتراست مناسب و تم‌های دارک و لایت.
2. کامپوننت‌های پایه: دکمه‌ها با سایه سخت (Hard Shadows)، اینپوت‌ها، بج‌های متالیک و کارتهای محتوا.
3. طراحی حداقل ۳ اسکرین کلیدی موبایل: صفحه پروفایل دانش‌آموز، لیست تکالیف، و کارت باشگاه افتخارات.
4. رعایت سیستم گرید و تایپوگرافی فارسی استاندارد.`,
      rules: 'ارسال لینک عمومی یا View-Only فایل Figma + اسکرین‌شات از آرت‌بوردها.',
      department: ClubDepartment.ARTIST,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
    create: {
      tenantId,
      title: 'طراحی دیزاین‌سیستم و کیت UI موبایل در فیگما',
      slug: 'artist-placement-ui-design-system',
      description: 'خلق یک کیت رابط کاربری کامل بر پایه سبک مدرن نئوبروتالیسم برای اپلیکیشن دانش‌آموزی',
      missionBrief: `ماموریت شما خلق یک سیستم طراحی جذاب در فیگما است که شامل:
1. تعریف پالت رنگی با کنتراست مناسب و تم‌های دارک و لایت.
2. کامپوننت‌های پایه: دکمه‌ها با سایه سخت (Hard Shadows)، اینپوت‌ها، بج‌های متالیک و کارتهای محتوا.
3. طراحی حداقل ۳ اسکرین کلیدی موبایل: صفحه پروفایل دانش‌آموز، لیست تکالیف، و کارت باشگاه افتخارات.
4. رعایت سیستم گرید و تایپوگرافی فارسی استاندارد.`,
      rules: 'ارسال لینک عمومی یا View-Only فایل Figma + اسکرین‌شات از آرت‌بوردها.',
      department: ClubDepartment.ARTIST,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
  });

  const challengeJack = await prisma.clubChallenge.upsert({
    where: { slug: 'jack-placement-lean-canvas' },
    update: {
      title: 'تدوین بوم مدل ناب (Lean Canvas) و استراتژی ورود به بازار',
      description: 'طراحی ارزش پیشنهادی و مدل اقتصادی برای یک استارتاپ فناوری آموزشی',
      missionBrief: `فرض کنید می‌خواهید یک محصول جدید برای بهبود تعامل اولیا و مدرسه ارائه دهید:
1. بوم مدل ناب (Lean Canvas) شامل ۹ بلوک اصلی را تکمیل کنید.
2. مزیت ناعادلانه (Unfair Advantage) و ارزش منحصربه‌فرد را تعریف کنید.
3. ۲ جریان درآمدی عملیاتی و ساختار هزینه‌های اولیه را برآورد کنید.
4. یک سناریوی Pitch Deck ۲ دقیقه‌ای به صورت متنی یا ویدیویی آماده کنید.`,
      rules: 'ارسال فایل PDF یا لینک داکیومنت شامل بوم ناب و توضیحات استراتژی.',
      department: ClubDepartment.JACK_OF_ALL_TRADES,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
    create: {
      tenantId,
      title: 'تدوین بوم مدل ناب (Lean Canvas) و استراتژی ورود به بازار',
      slug: 'jack-placement-lean-canvas',
      description: 'طراحی ارزش پیشنهادی و مدل اقتصادی برای یک استارتاپ فناوری آموزشی',
      missionBrief: `فرض کنید می‌خواهید یک محصول جدید برای بهبود تعامل اولیا و مدرسه ارائه دهید:
1. بوم مدل ناب (Lean Canvas) شامل ۹ بلوک اصلی را تکمیل کنید.
2. مزیت ناعادلانه (Unfair Advantage) و ارزش منحصربه‌فرد را تعریف کنید.
3. ۲ جریان درآمدی عملیاتی و ساختار هزینه‌های اولیه را برآورد کنید.
4. یک سناریوی Pitch Deck ۲ دقیقه‌ای به صورت متنی یا ویدیویی آماده کنید.`,
      rules: 'ارسال فایل PDF یا لینک داکیومنت شامل بوم ناب و توضیحات استراتژی.',
      department: ClubDepartment.JACK_OF_ALL_TRADES,
      type: ClubChallengeType.PLACEMENT,
      maxDays: 7,
      maxScore: 100,
      isPublished: true,
    },
  });

  const challengeUpgrade = await prisma.clubChallenge.upsert({
    where: { slug: 'engineer-upgrade-websocket-engine' },
    update: {
      title: 'چالش نخبگی: معماری سامانه چت بلادرنگ توزیع‌شده با Redis Adapter',
      description: 'چالش ارتقا به گرید A جهت پذیرش مستقیم در تیم محصولات رکاد استودیو',
      missionBrief: 'پیاده‌سازی یک Gateway با Socket.IO و اتصال به Redis Pub/Sub جهت مدیریت روم‌های چت با مقیاس‌پذیری چندسروری.',
      department: ClubDepartment.ENGINEER,
      type: ClubChallengeType.GRADE_UPGRADE,
      minGrade: ClubGrade.B,
      maxDays: 10,
      maxScore: 100,
      isPublished: true,
    },
    create: {
      tenantId,
      title: 'چالش نخبگی: معماری سامانه چت بلادرنگ توزیع‌شده با Redis Adapter',
      slug: 'engineer-upgrade-websocket-engine',
      description: 'چالش ارتقا به گرید A جهت پذیرش مستقیم در تیم محصولات رکاد استودیو',
      missionBrief: 'پیاده‌سازی یک Gateway با Socket.IO و اتصال به Redis Pub/Sub جهت مدیریت روم‌های چت با مقیاس‌پذیری چندسروری.',
      department: ClubDepartment.ENGINEER,
      type: ClubChallengeType.GRADE_UPGRADE,
      minGrade: ClubGrade.B,
      maxDays: 10,
      maxScore: 100,
      isPublished: true,
    },
  });

  console.log('✅ 4 Challenges created.');

  // 4. Setup Demo Student (Amirali Sadeghi / 0012345678)
  const demoStudent = await prisma.user.findFirst({
    where: { username: '0012345678' },
  });

  const teacherKazemi = await prisma.user.findFirst({
    where: { username: 'kazemi' },
  });

  if (demoStudent) {
    console.log('Configuring Demo Student Club Roadmap...');

    // Initialize Club Membership (In Roadmap)
    await prisma.clubMembership.upsert({
      where: { userId: demoStudent.id },
      update: {
        status: ClubMembershipStatus.IN_ROADMAP,
        department: null,
        grade: null,
      },
      create: {
        tenantId,
        userId: demoStudent.id,
        status: ClubMembershipStatus.IN_ROADMAP,
      },
    });

    // Milestone 1 (Teacher Approval) is APPROVED by Kazemi!
    await prisma.clubStudentMilestoneProgress.upsert({
      where: {
        tenantId_studentId_milestoneId: {
          tenantId,
          studentId: demoStudent.id,
          milestoneId: milestone1.id,
        },
      },
      update: {
        status: ClubMilestoneStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: teacherKazemi?.id,
        notes: 'صلاحیت فنی در درس برنامه‌نویسی و اخلاق حرفه‌ای تایید شد.',
      },
      create: {
        tenantId,
        studentId: demoStudent.id,
        milestoneId: milestone1.id,
        status: ClubMilestoneStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: teacherKazemi?.id,
        notes: 'صلاحیت فنی در درس برنامه‌نویسی و اخلاق حرفه‌ای تایید شد.',
      },
    });

    // Milestone 2 is PENDING
    await prisma.clubStudentMilestoneProgress.upsert({
      where: {
        tenantId_studentId_milestoneId: {
          tenantId,
          studentId: demoStudent.id,
          milestoneId: milestone2.id,
        },
      },
      update: {
        status: ClubMilestoneStatus.PENDING,
      },
      create: {
        tenantId,
        studentId: demoStudent.id,
        milestoneId: milestone2.id,
        status: ClubMilestoneStatus.PENDING,
      },
    });

    // Milestone 3 is PENDING
    await prisma.clubStudentMilestoneProgress.upsert({
      where: {
        tenantId_studentId_milestoneId: {
          tenantId,
          studentId: demoStudent.id,
          milestoneId: milestone3.id,
        },
      },
      update: {
        status: ClubMilestoneStatus.PENDING,
      },
      create: {
        tenantId,
        studentId: demoStudent.id,
        milestoneId: milestone3.id,
        status: ClubMilestoneStatus.PENDING,
      },
    });

    console.log('✅ Demo Student (Amirali) has 30% progress on Business Club roadmap.');
  }

  // 5. Setup an Elite Student (Kian Ahmadi / st_4041008) who is already Grade A and Studio-Ready!
  const eliteStudent = await prisma.user.findFirst({
    where: { username: 'st_4041008' },
  });

  if (eliteStudent) {
    await prisma.clubMembership.upsert({
      where: { userId: eliteStudent.id },
      update: {
        status: ClubMembershipStatus.STUDIO_READY,
        department: ClubDepartment.ENGINEER,
        grade: ClubGrade.A,
        joinedAt: new Date('2026-08-15'),
        promotedToGradeAAt: new Date('2026-09-10'),
        adminNotes: 'نخبه فنی دپارتمان مهندسی — منتسب به تیم پلتفرم در رکاد استودیو',
      },
      create: {
        tenantId,
        userId: eliteStudent.id,
        status: ClubMembershipStatus.STUDIO_READY,
        department: ClubDepartment.ENGINEER,
        grade: ClubGrade.A,
        joinedAt: new Date('2026-08-15'),
        promotedToGradeAAt: new Date('2026-09-10'),
        adminNotes: 'نخبه فنی دپارتمان مهندسی — منتسب به تیم پلتفرم در رکاد استودیو',
      },
    });

    // All milestones approved for elite student
    for (const m of [milestone1, milestone2, milestone3]) {
      await prisma.clubStudentMilestoneProgress.upsert({
        where: {
          tenantId_studentId_milestoneId: {
            tenantId,
            studentId: eliteStudent.id,
            milestoneId: m.id,
          },
        },
        update: {
          status: ClubMilestoneStatus.APPROVED,
          approvedAt: new Date(),
        },
        create: {
          tenantId,
          studentId: eliteStudent.id,
          milestoneId: m.id,
          status: ClubMilestoneStatus.APPROVED,
          approvedAt: new Date(),
        },
      });
    }

    console.log('✅ Elite Student (Kian) initialized as Grade A (Studio-Ready).');
  }

  console.log('🎉 Rokad Business Club Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
