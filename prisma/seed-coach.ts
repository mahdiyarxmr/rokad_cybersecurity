import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dedicated COACH user...');

  const boysTenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-boys' },
  });

  if (!boysTenant) {
    console.error('boys tenant not found');
    return;
  }

  const defaultPass = await argon2.hash('RokadPass2026!');

  // Create or update coach user
  const coachUser = await prisma.user.upsert({
    where: {
      tenantId_phone: {
        tenantId: boysTenant.id,
        phone: '09129990001',
      },
    },
    update: {
      role: 'COACH',
      firstName: 'علیرضا',
      lastName: 'شایان (کوچ)',
      username: 'coach_boys',
      nationalId: '0099990001',
      status: 'ACTIVE',
      passwordHash: defaultPass,
    },
    create: {
      tenantId: boysTenant.id,
      firstName: 'علیرضا',
      lastName: 'شایان (کوچ)',
      phone: '09129990001',
      username: 'coach_boys',
      nationalId: '0099990001',
      email: 'coach.shayan@rokadschool.ir',
      passwordHash: defaultPass,
      role: 'COACH',
      status: 'ACTIVE',
    },
  });

  console.log('Coach user ready:', coachUser.id, coachUser.role);

  // Find a student to link
  const student = await prisma.user.findFirst({
    where: {
      tenantId: boysTenant.id,
      role: 'STUDENT',
    },
  });

  if (student) {
    console.log('Linking student to coach:', student.firstName, student.lastName);

    // Upsert StudentCoachLink
    const link = await prisma.studentCoachLink.upsert({
      where: {
        tenantId_studentId_status: {
          tenantId: boysTenant.id,
          studentId: student.id,
          status: 'ACTIVE',
        },
      },
      update: {
        coachId: coachUser.id,
        slotDayOfWeek: 2, // سه شنبه
        slotStartTime: '10:00',
        slotEndTime: '10:20',
        slotDurationMinutes: 20,
        recurrenceCycle: 'BIWEEKLY',
        notes: 'برنامه هدایت تحصیلی و شغلی تخصصی',
      },
      create: {
        tenantId: boysTenant.id,
        studentId: student.id,
        coachId: coachUser.id,
        status: 'ACTIVE',
        slotDayOfWeek: 2,
        slotStartTime: '10:00',
        slotEndTime: '10:20',
        slotDurationMinutes: 20,
        recurrenceCycle: 'BIWEEKLY',
        notes: 'برنامه هدایت تحصیلی و شغلی تخصصی',
      },
    });

    // Create a couple of sessions
    const now = new Date();
    await prisma.coachingSession.upsert({
      where: { id: 'session-demo-coach-today' },
      update: {
        coachId: coachUser.id,
        studentId: student.id,
        scheduledDate: now,
      },
      create: {
        id: 'session-demo-coach-today',
        tenantId: boysTenant.id,
        linkId: link.id,
        coachId: coachUser.id,
        studentId: student.id,
        scheduledDate: now,
        durationMinutes: 20,
        attendanceStatus: 'PENDING',
        coachNotes: 'بررسی وضعیت پیشرفت پروژه پودمان اول و هدف‌گذاری مهارت‌های نرم',
        actionItems: 'تکمیل سناریوی مصاحبه و ارسال تمرین تا یکشنبه هفته آینده',
      },
    });

    console.log('Coaching session created successfully!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
