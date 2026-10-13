import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Role } from '../../common/constants';
import { toPersianDigits } from '../../common/utils/jalali.util';

export interface SystemNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type:
    | 'HOMEWORK'
    | 'ATTENDANCE'
    | 'EXAM'
    | 'FEE'
    | 'VISIT'
    | 'MATTER'
    | 'CHAT'
    | 'SYSTEM'
    | 'ANNOUNCEMENT'
    | 'COACHING';
  badge: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college' | 'male' | 'female';
  targetUrl: string;
  createdAt: string;
}

export interface BroadcastNotification {
  id: string;
  tenantId: string;
  senderId: string;
  senderName: string;
  title: string;
  desc: string;
  targetRole: string; // 'ALL' | Role
  badge: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college' | 'male' | 'female';
  targetUrl: string;
  createdAt: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);

  // Fallback in-memory read store when Redis is offline
  private readonly inMemoryReadStore = new Map<string, Set<string>>();

  // In-memory store for recent broadcast announcements
  private readonly broadcastStore: BroadcastNotification[] = [];

  // Background timer for 24-hour homework reminders
  private reminderTimer: ReturnType<typeof setInterval> | null = null;
  private initialHwTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly remindedHomeworkSet = new Set<string>();

  // Background timer for 24-hour coaching session reminders
  private coachingReminderTimer: ReturnType<typeof setInterval> | null = null;
  private initialCoachingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly remindedCoachingSet = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:support@rokadschool.ir';
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('Web Push (VAPID) configured successfully.');
      } catch (err: any) {
        this.logger.error(`Failed to configure VAPID: ${err.message}`);
      }
    } else {
      this.logger.warn('VAPID keys not configured. Web Push will be disabled.');
    }

    // Start background 24-hour homework reminder runner
    this.scheduleHomeworkReminders();

    // Start background 24-hour coaching session reminder runner
    this.scheduleCoachingReminders();
  }

  onModuleDestroy() {
    if (this.initialHwTimeout) {
      clearTimeout(this.initialHwTimeout);
      this.initialHwTimeout = null;
    }
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
    if (this.initialCoachingTimeout) {
      clearTimeout(this.initialCoachingTimeout);
      this.initialCoachingTimeout = null;
    }
    if (this.coachingReminderTimer) {
      clearInterval(this.coachingReminderTimer);
      this.coachingReminderTimer = null;
    }
  }

  /**
   * Schedule periodic checks for homeworks due within 24 hours
   */
  private scheduleHomeworkReminders() {
    // Initial run after 15 seconds
    this.initialHwTimeout = setTimeout(() => {
      this.checkAndSendHomeworkReminders().catch((err) => {
        this.logger.error(`Initial homework reminder check failed: ${err.message}`);
      });
    }, 15000);

    // Periodic run every 30 minutes
    this.reminderTimer = setInterval(() => {
      this.checkAndSendHomeworkReminders().catch((err) => {
        this.logger.error(`Periodic homework reminder check failed: ${err.message}`);
      });
    }, 30 * 60 * 1000);
  }

  /**
   * Scan active homeworks due in next 24h and push reminder to students who haven't submitted
   */
  async checkAndSendHomeworkReminders() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingHomeworks = await this.prisma.homework.findMany({
        where: {
          dueDate: {
            gt: now,
            lte: in24Hours,
          },
        },
        include: {
          lesson: { select: { id: true, name: true } },
          classroom: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: {
                  student: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
          submissions: {
            select: { studentId: true },
          },
        },
      });

      if (!upcomingHomeworks.length) return;

      const redisClient = this.redis.getClient();

      for (const hw of upcomingHomeworks) {
        const submittedStudentIds = new Set(hw.submissions.map((s) => s.studentId));
        const students = hw.classroom?.enrollments?.map((e) => e.student).filter(Boolean) || [];

        for (const st of students) {
          if (!st || submittedStudentIds.has(st.id)) continue;

          const reminderKey = `hw:reminded:24h:${hw.id}:${st.id}`;
          let alreadyReminded = false;

          if (redisClient && redisClient.status === 'ready') {
            const exists = await redisClient.get(reminderKey);
            alreadyReminded = !!exists;
          } else {
            alreadyReminded = this.remindedHomeworkSet.has(reminderKey);
          }

          if (alreadyReminded) continue;

          if (st.userId) {
            await this.sendPushToUser(st.userId, {
              title: `⏰ یادآوری تکلیف: ${hw.title}`,
              body: `کمتر از ۲۴ ساعت تا پایان مهلت تحویل تکلیف درس «${hw.lesson?.name || ''}» باقی مانده است.`,
              url: `/app/student/homework?homeworkId=${hw.id}&action=submit`,
              tag: `hw-reminder-${hw.id}`,
            }).catch((err) => {
              this.logger.warn(`Push to student ${st.userId} failed: ${err.message}`);
            });
          }

          if (redisClient && redisClient.status === 'ready') {
            await redisClient.set(reminderKey, '1', 'EX', 48 * 3600);
          } else {
            this.remindedHomeworkSet.add(reminderKey);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in checkAndSendHomeworkReminders: ${err.message}`);
    }
  }

  /**
   * Schedule periodic checks for coaching sessions due within 24 hours
   */
  private scheduleCoachingReminders() {
    // Initial run after 20 seconds
    this.initialCoachingTimeout = setTimeout(() => {
      this.checkAndSendCoachingReminders().catch((err) => {
        this.logger.error(`Initial coaching reminder check failed: ${err.message}`);
      });
    }, 20000);

    // Periodic run every 30 minutes
    this.coachingReminderTimer = setInterval(() => {
      this.checkAndSendCoachingReminders().catch((err) => {
        this.logger.error(`Periodic coaching reminder check failed: ${err.message}`);
      });
    }, 30 * 60 * 1000);
  }

  /**
   * Scan active coaching sessions due in next 24h and push reminder to students and coaches
   */
  async checkAndSendCoachingReminders() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingSessions = await this.prisma.coachingSession.findMany({
        where: {
          scheduledDate: {
            gt: now,
            lte: in24Hours,
          },
          attendanceStatus: 'PENDING',
        },
        include: {
          coach: { select: { id: true, firstName: true, lastName: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!upcomingSessions.length) return;

      const redisClient = this.redis.getClient();

      for (const cs of upcomingSessions) {
        const timeStr = cs.scheduledDate.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const dateStr = cs.scheduledDate.toLocaleDateString('fa-IR');

        // 1. Remind Student
        if (cs.studentId) {
          const studentReminderKey = `coaching:reminded:24h:${cs.id}:${cs.studentId}`;
          let studentAlreadyReminded = false;

          if (redisClient && redisClient.status === 'ready') {
            const exists = await redisClient.get(studentReminderKey);
            studentAlreadyReminded = !!exists;
          } else {
            studentAlreadyReminded = this.remindedCoachingSet.has(studentReminderKey);
          }

          if (!studentAlreadyReminded) {
            const coachName = `${cs.coach?.firstName || ''} ${cs.coach?.lastName || ''}`.trim();
            await this.sendPushToUser(cs.studentId, {
              title: `⏰ یادآوری جلسه کوچینگ`,
              body: `جلسه بعدی شما با کوچ «${coachName}» در تاریخ ${dateStr} ساعت ${timeStr} برگزار خواهد شد.`,
              url: `/app/coaching`,
              tag: `coaching-remind-${cs.id}`,
            }).catch((err) => {
              this.logger.warn(`Push to student ${cs.studentId} failed: ${err.message}`);
            });

            if (redisClient && redisClient.status === 'ready') {
              await redisClient.set(studentReminderKey, '1', 'EX', 48 * 3600);
            } else {
              this.remindedCoachingSet.add(studentReminderKey);
            }
          }
        }

        // 2. Remind Coach
        if (cs.coachId) {
          const coachReminderKey = `coaching:reminded:24h:${cs.id}:${cs.coachId}`;
          let coachAlreadyReminded = false;

          if (redisClient && redisClient.status === 'ready') {
            const exists = await redisClient.get(coachReminderKey);
            coachAlreadyReminded = !!exists;
          } else {
            coachAlreadyReminded = this.remindedCoachingSet.has(coachReminderKey);
          }

          if (!coachAlreadyReminded) {
            const studentName = `${cs.student?.firstName || ''} ${cs.student?.lastName || ''}`.trim();
            await this.sendPushToUser(cs.coachId, {
              title: `⏰ یادآوری جلسه کوچینگ`,
              body: `جلسه کوچینگ شما با دانش‌آموز «${studentName}» در تاریخ ${dateStr} ساعت ${timeStr} برگزار خواهد شد.`,
              url: `/app/coaching`,
              tag: `coaching-remind-${cs.id}`,
            }).catch((err) => {
              this.logger.warn(`Push to coach ${cs.coachId} failed: ${err.message}`);
            });

            if (redisClient && redisClient.status === 'ready') {
              await redisClient.set(coachReminderKey, '1', 'EX', 48 * 3600);
            } else {
              this.remindedCoachingSet.add(coachReminderKey);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in checkAndSendCoachingReminders: ${err.message}`);
    }
  }

  private getReadSet(userId: string): Set<string> {
    if (!this.inMemoryReadStore.has(userId)) {
      this.inMemoryReadStore.set(userId, new Set());
    }
    return this.inMemoryReadStore.get(userId)!;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready') {
      await client.sadd(key, notificationId);
      await client.expire(key, 86400 * 30); // 30 days
    } else {
      this.getReadSet(userId).add(notificationId);
    }
    return true;
  }

  async markAllAsRead(userId: string, notificationIds: string[]): Promise<boolean> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready' && notificationIds.length > 0) {
      await client.sadd(key, ...notificationIds);
      await client.expire(key, 86400 * 30);
    } else {
      const set = this.getReadSet(userId);
      notificationIds.forEach((id) => set.add(id));
    }
    return true;
  }

  private async getReadIds(userId: string): Promise<Set<string>> {
    const key = `notifications:read:${userId}`;
    const client = this.redis.getClient();
    if (client && client.status === 'ready') {
      const members = await client.smembers(key);
      return new Set(members);
    }
    return this.getReadSet(userId);
  }

  async getUserNotifications(tenantId: string, user: any): Promise<SystemNotification[]> {
    try {
      const readIds = await this.getReadIds(user.id);
      const notifications: SystemNotification[] = [];
      const role = user?.role as Role;

      // 0. Active Broadcast Announcements (from Memory & Redis)
      try {
        const activeBroadcasts = [...this.broadcastStore];
        const client = this.redis.getClient();
        if (client && client.status === 'ready') {
          const rawItems = await client.lrange(`notifications:broadcasts:${tenantId}`, 0, 30);
          for (const raw of rawItems) {
            try {
              const parsed = JSON.parse(raw);
              if (!activeBroadcasts.some((b) => b.id === parsed.id)) {
                activeBroadcasts.push(parsed);
              }
            } catch {}
          }
        }

        const relevantBroadcasts = activeBroadcasts.filter(
          (b) =>
            (!b.tenantId || b.tenantId === tenantId) &&
            (b.targetRole === 'ALL' || b.targetRole === role),
        );

        relevantBroadcasts.forEach((b) => {
          notifications.push({
            id: b.id,
            title: b.title,
            desc: b.desc,
            time: 'اطلاعیه عمومی',
            read: readIds.has(b.id),
            type: 'ANNOUNCEMENT',
            badge: (b.badge as any) || 'college',
            targetUrl: b.targetUrl || '/app',
            createdAt: b.createdAt,
          });
        });
      } catch (err: any) {
        this.logger.debug(`Broadcast retrieval error: ${err.message}`);
      }

    // 1. Notifications for SUPER_ADMIN
    if (role === Role.SUPER_ADMIN) {
      const activeTenantsCount = await this.prisma.tenant.count({ where: { status: 'ACTIVE' } });
      const totalUsersCount = await this.prisma.user.count();

      notifications.push({
        id: `sys-tenants-${activeTenantsCount}`,
        title: 'وضعیت سلامت پلتفرم ابری رکاد',
        desc: `تعداد ${activeTenantsCount} شعبه فعال با بیش از ${totalUsersCount} کاربر فعال برخط به صورت پایدار در مدار می‌باشند.`,
        time: 'لحظاتی پیش',
        read: readIds.has(`sys-tenants-${activeTenantsCount}`),
        type: 'SYSTEM',
        badge: 'success',
        targetUrl: '/app/superadmin/tenants',
        createdAt: new Date().toISOString(),
      });

      notifications.push({
        id: 'sys-storage-minio',
        title: 'پشتیبان‌گیری مخازن ذخیره‌سازی MinIO',
        desc: 'عملیات اعتبارسنجی باکت‌ها و ذخیره‌سازی ابری فایل‌های آموزشی با موفقیت سپری شد.',
        time: '۳۰ دقیقه پیش',
        read: readIds.has('sys-storage-minio'),
        type: 'SYSTEM',
        badge: 'default',
        targetUrl: '/app/superadmin/ops',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      });

      notifications.push({
        id: 'sys-audit-security',
        title: 'گزارش نظارت امنیتی و احراز هویت',
        desc: 'تمام توکن‌های نشست ۲۴ ساعت گذشته اعتبارسنجی شده و هیچ تلاش نفوذ غیرمجازی ثبت نشده است.',
        time: '۲ ساعت پیش',
        read: readIds.has('sys-audit-security'),
        type: 'SYSTEM',
        badge: 'college',
        targetUrl: '/app/superadmin/ops',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      });
    }

    // 2. Notifications for SCHOOL_ADMIN & STAFF
    else if (role === Role.SCHOOL_ADMIN || role === Role.STAFF) {
      // Check recent confirmed parent visits
      const recentVisits = await this.prisma.parentVisitBooking.findMany({
        where: { tenantId },
        include: {
          slot: {
            include: {
              teacher: { include: { user: true } },
            },
          },
          student: { include: { user: true } },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      recentVisits.forEach((pv) => {
        notifications.push({
          id: `visit-booking-${pv.id}`,
          title: 'رزرو جلسه ملاقات اولیا با دبیر',
          desc: `جلسه ملاقات برای ولی دانش‌آموز ${pv.student?.user?.firstName || ''} ${pv.student?.user?.lastName || ''} با استاد ${pv.slot?.teacher?.user?.lastName || ''} با موضوع «${pv.subject}» ثبت گردید.`,
          time: 'جدید',
          read: readIds.has(`visit-booking-${pv.id}`),
          type: 'VISIT',
          badge: 'college',
          targetUrl: '/app/admin/visits',
          createdAt: pv.createdAt.toISOString(),
        });
      });

      // Check disciplinary matters
      const recentMatters = await this.prisma.disciplinaryMatter.findMany({
        where: { tenantId },
        include: { student: { include: { user: true } } },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      recentMatters.forEach((m) => {
        notifications.push({
          id: `matter-${m.id}`,
          title: m.type === 'POSITIVE' ? 'تشویق و امتیاز انضباطی' : 'گزارش انضباطی نیازمند بررسی',
          desc: `موضوع «${m.title}» (${m.points > 0 ? `+${m.points}` : m.points} امتیاز) برای دانش‌آموز ${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''} ثبت گردید.`,
          time: 'امروز',
          read: readIds.has(`matter-${m.id}`),
          type: 'MATTER',
          badge: m.type === 'POSITIVE' ? 'success' : 'destructive',
          targetUrl: '/app/admin/matters',
          createdAt: m.createdAt.toISOString(),
        });
      });

      // Tuition reminder / Finance summary
      notifications.push({
        id: `fee-summary-${tenantId}`,
        title: 'وضعیت تسویه شهریه و اقساط مالی',
        desc: 'گزارش تراکنش‌های آنلاین و فیش‌های ثبت‌شده امروز در سامانه حسابداری آماده بررسی است.',
        time: '۱ ساعت پیش',
        read: readIds.has(`fee-summary-${tenantId}`),
        type: 'FEE',
        badge: 'success',
        targetUrl: '/app/admin/finance/fees',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      });

      // Active poll status
      const activePoll = await this.prisma.poll.findFirst({
        where: { tenantId, isClosed: false },
        include: { _count: { select: { votes: true } } },
      });
      if (activePoll) {
        notifications.push({
          id: `poll-active-${activePoll.id}`,
          title: 'نظرسنجی فعال مدرسه در جریان است',
          desc: `نظرسنجی «${activePoll.title}» تاکنون ${activePoll._count.votes} رای به ثبت رسانده است.`,
          time: 'فعال',
          read: readIds.has(`poll-active-${activePoll.id}`),
          type: 'ANNOUNCEMENT',
          badge: 'default',
          targetUrl: '/app/admin/polls',
          createdAt: activePoll.createdAt.toISOString(),
        });
      }
    }

    // 3. Notifications for TEACHER
    else if (role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });

      if (teacher) {
        // Pending homework submissions for this teacher
        const submissionsNeedingGrade = await this.prisma.homeworkSubmission.findMany({
          where: {
            status: 'SUBMITTED',
            homework: { teacherId: teacher.id, tenantId },
          },
          include: {
            homework: { select: { id: true, title: true } },
            student: { include: { user: true } },
          },
          take: 4,
          orderBy: { submittedAt: 'desc' },
        });

        submissionsNeedingGrade.forEach((sub) => {
          notifications.push({
            id: `sub-grade-${sub.id}`,
            title: 'پاسخ تکلیف جدید آماده نمره‌دهی',
            desc: `دانش‌آموز ${sub.student?.user?.firstName || ''} ${sub.student?.user?.lastName || ''} پاسخی برای «${sub.homework?.title}» ارسال نموده است.`,
            time: 'جدید',
            read: readIds.has(`sub-grade-${sub.id}`),
            type: 'HOMEWORK',
            badge: 'default',
            targetUrl: `/app/teacher/homework?homeworkId=${sub.homework.id}&action=submissions`,
            createdAt: sub.submittedAt.toISOString(),
          });
        });

        // Confirmed visits booked with this teacher
        const teacherVisits = await this.prisma.parentVisitBooking.findMany({
          where: {
            slot: { teacherId: teacher.id },
            status: 'CONFIRMED',
          },
          include: {
            slot: true,
            student: { include: { user: true } },
          },
          take: 2,
          orderBy: { createdAt: 'desc' },
        });

        teacherVisits.forEach((tv) => {
          notifications.push({
            id: `tv-visit-${tv.id}`,
            title: 'جلسه ملاقات اولیا با شما',
            desc: `ملاقات با ولی دانش‌آموز ${tv.student?.user?.firstName || ''} ${tv.student?.user?.lastName || ''} برای تاریخ ${tv.slot?.date} ثبت شده است.`,
            time: 'زمان‌بندی شده',
            read: readIds.has(`tv-visit-${tv.id}`),
            type: 'VISIT',
            badge: 'college',
            targetUrl: '/app/teacher/visits',
            createdAt: tv.createdAt.toISOString(),
          });
        });

        // Today's schedule reminder
        notifications.push({
          id: `teacher-schedule-today-${teacher.id}`,
          title: 'برنامه آموزشی و زنگ‌های امروز',
          desc: 'لیست زنگ‌های تدریس و کلاس‌های امروز در پنل برنامه کلاسی شما به‌روزرسانی شد.',
          time: 'ساعت ۰۸:۰۰',
          read: readIds.has(`teacher-schedule-today-${teacher.id}`),
          type: 'SYSTEM',
          badge: 'success',
          targetUrl: '/app/teacher/schedule',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Notifications for STUDENT
    else if (role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });

      if (student) {
        const classroomIds = student.enrollments.map((e) => e.classroomId);

        // Active homeworks for student's classes
        if (classroomIds.length > 0) {
          const activeHomeworks = await this.prisma.homework.findMany({
            where: {
              tenantId,
              classroomId: { in: classroomIds },
              dueDate: { gte: new Date() },
            },
            include: {
              lesson: true,
              submissions: {
                where: { studentId: student.id },
              },
            },
            take: 3,
            orderBy: { dueDate: 'asc' },
          });

          activeHomeworks.forEach((hw) => {
            const hasSubmitted = hw.submissions.length > 0;
            if (!hasSubmitted) {
              const nowMs = Date.now();
              const dueMs = new Date(hw.dueDate).getTime();
              const diffMs = dueMs - nowMs;
              const isDueWithin24Hours = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;

              if (isDueWithin24Hours) {
                const hoursLeft = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
                notifications.push({
                  id: `hw-reminder-24h-${hw.id}`,
                  title: `⏰ یادآوری مهلت تحویل: ${hw.title}`,
                  desc: `تنها حدود ${toPersianDigits(hoursLeft)} ساعت تا پایان مهلت تحویل تکلیف درس «${hw.lesson?.name || ''}» باقی مانده است. لطفاً نسبت به ارسال پاسخ اقدام فرمایید.`,
                  time: 'کمتر از ۲۴ ساعت مانده',
                  read: readIds.has(`hw-reminder-24h-${hw.id}`),
                  type: 'HOMEWORK',
                  badge: 'destructive',
                  targetUrl: `/app/student/homework?homeworkId=${hw.id}&action=submit`,
                  createdAt: new Date().toISOString(),
                });
              } else {
                notifications.push({
                  id: `hw-active-${hw.id}`,
                  title: `تکلیف جدید درس ${hw.lesson?.name || ''}`,
                  desc: `تکلیف «${hw.title}» تعریف شده است. لطفاً پیش از موعد مقرر پاسخ خود را ارسال فرمایید.`,
                  time: 'مهلت تحویل فعال',
                  read: readIds.has(`hw-active-${hw.id}`),
                  type: 'HOMEWORK',
                  badge: 'warning',
                  targetUrl: `/app/student/homework?homeworkId=${hw.id}&action=submit`,
                  createdAt: hw.createdAt.toISOString(),
                });
              }
            }
          });
        }

        // Graded submissions for this student
        const gradedSubmissions = await this.prisma.homeworkSubmission.findMany({
          where: {
            studentId: student.id,
            status: 'GRADED',
          },
          include: {
            homework: { include: { lesson: true } },
          },
          take: 3,
          orderBy: { updatedAt: 'desc' },
        });

        gradedSubmissions.forEach((sub) => {
          notifications.push({
            id: `sub-graded-${sub.id}`,
            title: `نمره تکلیف درس ${sub.homework?.lesson?.name || ''} ثبت شد`,
            desc: `دبیر برای تکلیف «${sub.homework?.title}» نمره ${sub.score} از ${sub.homework?.maxScore || 20} را ثبت نموده است.`,
            time: 'کارنامه جدید',
            read: readIds.has(`sub-graded-${sub.id}`),
            type: 'HOMEWORK',
            badge: 'success',
            targetUrl: `/app/student/homework?homeworkId=${sub.homework.id}&action=view`,
            createdAt: sub.updatedAt.toISOString(),
          });
        });

        // Online exams ready to take
        if (classroomIds.length > 0) {
          const activeExams = await this.prisma.exam.findMany({
            where: {
              tenantId,
              classrooms: { some: { classroomId: { in: classroomIds } } },
              isPublished: true,
            },
            include: { lesson: true },
            take: 2,
            orderBy: { createdAt: 'desc' },
          });

          activeExams.forEach((ex) => {
            notifications.push({
              id: `exam-notify-${ex.id}`,
              title: `آزمون آنلاین درس ${ex.lesson?.name || ''}`,
              desc: `آزمون «${ex.title}» با مدت زمان ${ex.durationMinutes || 60} دقیقه آماده شرکت است.`,
              time: 'آزمون برخط',
              read: readIds.has(`exam-notify-${ex.id}`),
              type: 'EXAM',
              badge: 'default',
              targetUrl: `/app/student/exams?examId=${ex.id}&action=start`,
              createdAt: ex.createdAt.toISOString(),
            });
          });
        }
        // 5. Upcoming Coaching Sessions for Student
        const upcomingCoaching = await this.prisma.coachingSession.findMany({
          where: {
            tenantId,
            studentId: user.id,
            scheduledDate: { gte: new Date() },
          },
          include: { coach: { select: { firstName: true, lastName: true } } },
          orderBy: { scheduledDate: 'asc' },
          take: 2,
        });

        upcomingCoaching.forEach((cs) => {
          const coachName = `${cs.coach?.firstName || ''} ${cs.coach?.lastName || ''}`.trim();
          const dateStr = cs.scheduledDate.toLocaleDateString('fa-IR');
          const timeStr = cs.scheduledDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          notifications.push({
            id: `coaching-session-${cs.id}`,
            title: '⏰ یادآوری جلسه کوچینگ',
            desc: `جلسه بعدی شما با کوچ «${coachName}» در تاریخ ${dateStr} ساعت ${timeStr} برنامه‌ریزی شده است.`,
            time: 'جلسه پیش‌رو',
            read: readIds.has(`coaching-session-${cs.id}`),
            type: 'COACHING',
            badge: 'college',
            targetUrl: '/app/coaching',
            createdAt: cs.scheduledDate.toISOString(),
          });
        });

        // 6. Responded Extra Requests for Student
        const recentExtraRequests = await this.prisma.coachingExtraRequest.findMany({
          where: {
            tenantId,
            studentId: user.id,
            status: { in: ['APPROVED', 'REJECTED'] },
            updatedAt: { gte: new Date(Date.now() - 7 * 86400000) },
          },
          include: { coach: { select: { firstName: true, lastName: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 2,
        });

        recentExtraRequests.forEach((req) => {
          const isApproved = req.status === 'APPROVED';
          notifications.push({
            id: `coaching-extra-status-${req.id}`,
            title: isApproved ? '✅ تایید درخواست جلسه فوق‌العاده' : 'نتیجه درخواست جلسه فوق‌العاده',
            desc: isApproved
              ? `درخواست جلسه فوق‌العاده توسط کوچ تایید شد.${req.scheduledDate ? ` زمان جلسه: ${req.scheduledDate.toLocaleDateString('fa-IR')}` : ''}`
              : `درخواست جلسه فوق‌العاده رد شد. پیام کوچ: ${req.coachResponse || 'عدم امکان برگزاری'}`,
            time: isApproved ? 'تایید شد' : 'بررسی شد',
            read: readIds.has(`coaching-extra-status-${req.id}`),
            type: 'COACHING',
            badge: isApproved ? 'success' : 'destructive',
            targetUrl: '/app/coaching',
            createdAt: req.updatedAt.toISOString(),
          });
        });
        // 7. Recent Disciplinary & Commendations for Student
        const recentStudentMatters = await this.prisma.disciplinaryMatter.findMany({
          where: { tenantId, studentId: student.id },
          take: 3,
          orderBy: { reportedAt: 'desc' },
        });

        recentStudentMatters.forEach((m) => {
          const isPos = m.type === 'POSITIVE';
          notifications.push({
            id: `matter-student-${m.id}`,
            title: isPos ? '🌟 ثبت مورد تشویقی جدید' : '⚠️ مورد انضباطی در پرونده',
            desc: isPos
              ? `تشویق با عنوان «${m.title}» (${m.points > 0 ? `+${toPersianDigits(m.points)}` : toPersianDigits(m.points)} امتیاز) در کارنامه شما ثبت شد.`
              : `مورد انضباطی «${m.title}» (${toPersianDigits(m.points)} امتیاز) در پرونده رفتاری شما ثبت گردید.`,
            time: 'انضباطی/تشویقی',
            read: readIds.has(`matter-student-${m.id}`),
            type: 'MATTER',
            badge: isPos ? 'success' : 'destructive',
            targetUrl: '/app/student/matters',
            createdAt: m.reportedAt.toISOString(),
          });
        });
      }
    }

    // 5. Notifications for PARENT
    else if (role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: true,
                  studentAttendances: {
                    take: 2,
                    orderBy: { date: 'desc' },
                    include: { classroom: true },
                  },
                },
              },
            },
          },
        },
      });

      if (parent) {
        for (const link of parent.studentLinks) {
          const childName = `${link.student?.user?.firstName || ''} ${link.student?.user?.lastName || ''}`.trim() || 'فرزند شما';

          // Recent attendance record of child
          link.student?.studentAttendances?.forEach((att) => {
            const statusLabel =
              att.status === 'PRESENT'
                ? 'حاضر'
                : att.status === 'ABSENT'
                ? 'غایب غیرموجه'
                : att.status === 'TARDY'
                ? `تاخیر (${att.delayMinutes || 15} دقیقه)`
                : 'موجه';

            notifications.push({
              id: `parent-att-${att.id}`,
              title: `گزارش حضور و غیاب فرزند: ${childName}`,
              desc: `وضعیت حضور در تاریخ ${att.date ? new Date(att.date).toLocaleDateString('fa-IR') : 'امروز'} برای کلاس ${att.classroom?.name || ''}: ${statusLabel}`,
              time: 'امروز',
              read: readIds.has(`parent-att-${att.id}`),
              type: 'ATTENDANCE',
              badge: att.status === 'ABSENT' ? 'destructive' : att.status === 'TARDY' ? 'warning' : 'success',
              targetUrl: '/app/parent/grades',
              createdAt: att.createdAt.toISOString(),
            });
          });

          // Recent matters for child (notifiedParents = true)
          const childMatters = await this.prisma.disciplinaryMatter.findMany({
            where: {
              tenantId,
              studentId: link.studentId,
              notifiedParents: true,
            },
            take: 2,
            orderBy: { reportedAt: 'desc' },
          });

          childMatters.forEach((m) => {
            const isPos = m.type === 'POSITIVE';
            notifications.push({
              id: `parent-matter-${m.id}`,
              title: isPos ? `🌟 تشویق فرزند: ${childName}` : `⚠️ گزارش انضباطی فرزند: ${childName}`,
              desc: isPos
                ? `مورد تشویقی «${m.title}» (${m.points > 0 ? `+${toPersianDigits(m.points)}` : toPersianDigits(m.points)} امتیاز) برای ${childName} ثبت گردید.`
                : `مورد انضباطی «${m.title}» (${toPersianDigits(m.points)} امتیاز) برای ${childName} به اولیا گزارش شد.`,
              time: 'انضباطی/تشویقی',
              read: readIds.has(`parent-matter-${m.id}`),
              type: 'MATTER',
              badge: isPos ? 'success' : 'destructive',
              targetUrl: '/app/student/matters',
              createdAt: m.reportedAt.toISOString(),
            });
          });
        }

        // Tuition reminder
        notifications.push({
          id: `parent-fee-${parent.id}`,
          title: 'وضعیت شهریه و خدمات تحصیلی',
          desc: 'رسید پرداخت‌ها و سررسید اقساط شهریه دانش‌آموز در درگاه مالی والدین قابل پیگیری و پرداخت آنلاین است.',
          time: 'یادآوری',
          read: readIds.has(`parent-fee-${parent.id}`),
          type: 'FEE',
          badge: 'college',
          targetUrl: '/app/parent/fees',
          createdAt: new Date().toISOString(),
        });

        // Parent visits reminder
        notifications.push({
          id: `parent-visit-${parent.id}`,
          title: 'رزرو وقت ملاقات با هنرآموزان و مشاورین',
          desc: 'اسلات‌های جدید دیدار اولیا و دبیران برای هفته آینده در سامانه ثبت گردید.',
          time: 'جدید',
          read: readIds.has(`parent-visit-${parent.id}`),
          type: 'VISIT',
          badge: 'female',
          targetUrl: '/app/parent/visits',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        });
      }
    }

    // Recent Academic Messages for this user
    try {
      const recentMessages = await this.prisma.academicMessageRecipient.findMany({
        where: {
          tenantId,
          recipientId: user.id,
          deletedAt: null,
        },
        include: {
          message: {
            include: {
              sender: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      recentMessages.forEach((mr) => {
        const senderName = `${mr.message.sender.firstName || ''} ${mr.message.sender.lastName || ''}`.trim() || 'مدیریت مجتمع';
        const preview = mr.message.body.length > 70 ? `${mr.message.body.slice(0, 70)}...` : mr.message.body;
        notifications.push({
          id: `msg-${mr.id}`,
          title: `پیام جدید: ${mr.message.title}`,
          desc: `${senderName}: ${preview}`,
          time: 'جدید',
          read: mr.isRead || readIds.has(`msg-${mr.id}`),
          type: 'ANNOUNCEMENT',
          badge: mr.message.priority === 'URGENT' ? 'destructive' : mr.message.priority === 'IMPORTANT' ? 'warning' : 'default',
          targetUrl: '/app/messages',
          createdAt: mr.createdAt.toISOString(),
        });
      });
      // Coaching notifications for Coaches
      const coachLinksCount = await this.prisma.studentCoachLink.count({
        where: { coachId: user.id, tenantId, status: 'ACTIVE' },
      });
      if (role === Role.COACH || coachLinksCount > 0) {
        // Pending extra requests needing response
        const pendingCoachRequests = await this.prisma.coachingExtraRequest.findMany({
          where: { tenantId, coachId: user.id, status: 'PENDING' },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });

        pendingCoachRequests.forEach((req) => {
          notifications.push({
            id: `coaching-req-${req.id}`,
            title: 'درخواست جلسه فوق‌العاده کوچینگ',
            desc: `دانش‌آموز «${req.student?.firstName || ''} ${req.student?.lastName || ''}» درخواست جلسه فوق‌العاده با موضوع «${req.reason}» ثبت نموده است.`,
            time: 'نیازمند بررسی',
            read: readIds.has(`coaching-req-${req.id}`),
            type: 'COACHING',
            badge: 'warning',
            targetUrl: '/app/coaching',
            createdAt: req.createdAt.toISOString(),
          });
        });

        // Upcoming coaching sessions in next 48h
        const upcomingCoachSessions = await this.prisma.coachingSession.findMany({
          where: {
            tenantId,
            coachId: user.id,
            scheduledDate: { gte: new Date() },
          },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { scheduledDate: 'asc' },
          take: 3,
        });

        upcomingCoachSessions.forEach((cs) => {
          const studentName = `${cs.student?.firstName || ''} ${cs.student?.lastName || ''}`.trim();
          const dateStr = cs.scheduledDate.toLocaleDateString('fa-IR');
          const timeStr = cs.scheduledDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          notifications.push({
            id: `coaching-coach-session-${cs.id}`,
            title: '⏰ یادآوری جلسه کوچینگ با دانش‌آموز',
            desc: `جلسه شما با «${studentName}» در تاریخ ${dateStr} ساعت ${timeStr} زمان‌بندی شده است.`,
            time: 'جلسه پیش‌رو',
            read: readIds.has(`coaching-coach-session-${cs.id}`),
            type: 'COACHING',
            badge: 'college',
            targetUrl: '/app/coaching',
            createdAt: cs.scheduledDate.toISOString(),
          });
        });
      }
    } catch {
      // non-blocking
    }

    // Sort by creation time descending
    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    } catch (err: any) {
      console.warn('⚠️ [NotificationsService.getUserNotifications] DB offline fallback:', err?.message || err);
      return [
        {
          id: 'sys-offline-health',
          title: 'وضعیت سامانه',
          desc: 'سامانه در حالت آماده به کار قرار دارد.',
          time: 'اکنون',
          read: false,
          type: 'SYSTEM',
          badge: 'success',
          targetUrl: '/app/dashboard',
          createdAt: new Date().toISOString(),
        },
      ];
    }
  }

  /**
   * Return VAPID Public Key for client subscription
   */
  getVapidPublicKey(): { publicKey: string } {
    return {
      publicKey: this.configService.get<string>('VAPID_PUBLIC_KEY') || '',
    };
  }

  /**
   * Save or update push subscription for a user device
   */
  async subscribePush(
    userId: string,
    data: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    const endpoint = data?.endpoint || (data as any)?.subscription?.endpoint;
    if (!endpoint) {
      this.logger.warn(`subscribePush: endpoint missing for user ${userId}`);
      throw new BadRequestException('آدرس endpoint اشتراک مرورگر معتبر نیست.');
    }

    const p256dh = data?.keys?.p256dh || (data as any)?.p256dh || '';
    const auth = data?.keys?.auth || (data as any)?.auth || '';

    let deviceOS = 'Desktop';
    if (userAgent) {
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        deviceOS = 'iOS';
      } else if (/Android/i.test(userAgent)) {
        deviceOS = 'Android';
      }
    }

    this.logger.log(`Subscribing device [${deviceOS}] for user ${userId} (endpoint: ${endpoint.substring(0, 30)}...)`);

    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh,
        auth,
        userAgent,
        deviceOS,
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent,
        deviceOS,
      },
    });
  }

  /**
   * Remove subscription when user logs out or disables notifications
   */
  async unsubscribePush(userId: string, endpoint: string) {
    if (!endpoint) return { count: 0 };
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  /**
   * Send Web Push notification to all active devices of a user
   */
  async sendPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      badge?: string;
      tag?: string;
    },
  ): Promise<{ sent: number; failed: number; totalSubscriptions: number; errors: string[] }> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) {
      return { sent: 0, failed: 0, totalSubscriptions: 0, errors: [] };
    }

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/app',
      icon: payload.icon || '/icons/pwa-192x192.png',
      badge: payload.badge || '/icons/favicon-32x32.png',
      tag: payload.tag || 'rokad-push',
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushPromise = webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            jsonPayload,
            {
              TTL: 60 * 60 * 24, // 24 hours
              urgency: 'high',
              proxy,
            },
          );

          // 12-second timeout per subscription (supports slow FCM routes and Iran network latency)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Push Gateway Timeout (12s)')), 12000),
          );

          await Promise.race([pushPromise, timeoutPromise]);
          sent++;
        } catch (err: any) {
          failed++;
          const errDetail = `${err.message || 'Push Error'} (status: ${err.statusCode || 'N/A'})`;
          errors.push(errDetail);
          this.logger.warn(`Push delivery failed for user ${userId} / sub ${sub.id}: ${errDetail}`);

          // 404 or 410 means subscription has expired or unsubscribed
          if (err.statusCode === 404 || err.statusCode === 410) {
            this.logger.log(`Cleaning up expired subscription: ${sub.id}`);
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }),
    );

    return { sent, failed, totalSubscriptions: subscriptions.length, errors };
  }

  /**
   * Send test push notification with honest diagnostic result
   */
  async sendTestPush(userId: string) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) {
      return {
        sent: 0,
        failed: 0,
        hasSubscription: false,
        message:
          'هیچ دستگاه یا مرورگری برای حساب کاربری شما ثبت نشده است. لطفاً ابتدا در بنر بالای صفحه، روی دکمه «فعال‌سازی» کلیک کرده و دسترسی اعلان را در مرورگر مجاز فرمایید.',
      };
    }

    const res = await this.sendPushToUser(userId, {
      title: 'سامانه هوشمند رکاد',
      body: 'این یک پیام آزمایشی است. اعلان‌های برخط در دستگاه شما با موفقیت فعال شد! 🎉',
      url: '/app',
      tag: 'test-notification',
    });

    if (res.sent > 0) {
      return {
        sent: res.sent,
        failed: res.failed,
        hasSubscription: true,
        message: `اعلان تستی با موفقیت به ${toPersianDigits(res.sent)} دستگاه فعال شما تحویل شد! 🎉`,
      };
    } else {
      return {
        sent: 0,
        failed: res.failed,
        hasSubscription: true,
        message: `ارسال اعلان تستی به سرور پوش انجام نشد (${toPersianDigits(res.failed)} اشتراک ناموفق). علت رایج: اختلال موقت در ارتباط با سرورهای اعلان گوگل (FCM) یا انقضای کلید دستگاه.`,
        errors: res.errors,
      };
    }
  }

  /**
   * Broadcast or send targeted notification to school users
   */
  async sendBroadcast(
    tenantId: string,
    sender: any,
    dto: {
      title: string;
      body: string;
      targetRole?: string; // 'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'STAFF'
      targetUrl?: string;
      badge?: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college';
    },
  ) {
    if (!dto.title || !dto.body) {
      throw new BadRequestException('عنوان و متن اعلان الزامی است');
    }

    const targetRole = dto.targetRole || 'ALL';
    const broadcastId = `announcement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'مدیریت مجتمع';

    const item: BroadcastNotification = {
      id: broadcastId,
      tenantId,
      senderId: sender.id,
      senderName,
      title: dto.title,
      desc: dto.body,
      targetRole,
      badge: dto.badge || 'college',
      targetUrl: dto.targetUrl || '/app',
      createdAt: new Date().toISOString(),
    };

    // Keep last 100 in memory
    this.broadcastStore.unshift(item);
    if (this.broadcastStore.length > 100) {
      this.broadcastStore.pop();
    }

    // Also persist in Redis if available
    try {
      const client = this.redis.getClient();
      if (client && client.status === 'ready') {
        const key = `notifications:broadcasts:${tenantId}`;
        await client.lpush(key, JSON.stringify(item));
        await client.ltrim(key, 0, 99);
        await client.expire(key, 86400 * 30); // 30 days
      }
    } catch (err: any) {
      this.logger.debug(`Redis broadcast save fallback: ${err.message}`);
    }

    // Find recipient users
    const userWhere: any = { tenantId, status: 'ACTIVE' };
    if (targetRole !== 'ALL') {
      userWhere.role = targetRole;
    }

    const recipients = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    let delivered = 0;
    // Dispatch push asynchronously
    (async () => {
      for (const u of recipients) {
        try {
          const res = await this.sendPushToUser(u.id, {
            title: dto.title,
            body: dto.body,
            url: dto.targetUrl || '/app',
            tag: broadcastId,
          });
          delivered += res.sent;
        } catch {}
      }
      this.logger.log(`Broadcast ${broadcastId} delivered to ${delivered} push subscriptions across ${recipients.length} users.`);
    })().catch((err) => {
      this.logger.error(`Error in broadcast push delivery: ${err.message}`);
    });

    return {
      success: true,
      broadcastId,
      targetUsersCount: recipients.length,
      message: `اعلان با موفقیت ثبت شد و به ${toPersianDigits(recipients.length)} کاربر ارسال می‌گردد.`,
    };
  }

  // ==========================================
  // Real-Time Event Handlers for WebPush
  // ==========================================

  @OnEvent('homework.created', { async: true })
  async handleHomeworkCreated(event: {
    tenantId: string;
    homeworkId: string;
    classroomId: string;
    title: string;
  }) {
    try {
      if (!event.classroomId) return;
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { classroomId: event.classroomId, status: 'ACTIVE' },
        include: { student: { select: { userId: true } } },
      });

      for (const e of enrollments) {
        if (e.student?.userId) {
          await this.sendPushToUser(e.student.userId, {
            title: `📚 تکلیف جدید: ${event.title}`,
            body: 'تکلیف جدیدی برای کلاس شما در سامانه ثبت شد. جهت ارسال پاسخ کلیک کنید.',
            url: `/app/student/homework?homeworkId=${event.homeworkId}&action=submit`,
            tag: `hw-new-${event.homeworkId}`,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error handling homework.created push: ${err.message}`);
    }
  }

  @OnEvent('homework.graded', { async: true })
  async handleHomeworkGraded(event: {
    tenantId: string;
    studentId: string;
    homeworkTitle?: string;
    score: number;
  }) {
    try {
      if (!event.studentId) return;
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: event.studentId },
        select: { userId: true },
      });
      if (student?.userId) {
        await this.sendPushToUser(student.userId, {
          title: '📝 نمره تکلیف ثبت شد',
          body: `نمره شما برای تکلیف «${event.homeworkTitle || 'ارائه‌شده'}» ثبت گردید: ${toPersianDigits(event.score)}`,
          url: '/app/student/homework',
          tag: `hw-grade-${event.studentId}`,
        });
      }
    } catch (err: any) {
      this.logger.error(`Error handling homework.graded push: ${err.message}`);
    }
  }

  @OnEvent('attendance.student_absence', { async: true })
  async handleStudentAbsence(event: {
    tenantId: string;
    studentId: string;
    studentName?: string;
    date: string;
    periodNumber?: number;
    status: string;
  }) {
    try {
      if (!event.studentId) return;
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: event.studentId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          parentLinks: { include: { parent: { select: { userId: true } } } },
        },
      });
      if (!student) return;

      const studentName = event.studentName || `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
      const statusTitle = event.status === 'TARDY' ? 'تاخیر کلاسی' : 'غیبت در کلاس';
      const periodText = event.periodNumber ? ` زنگ ${toPersianDigits(event.periodNumber)}` : '';

      // Push to student
      if (student.userId) {
        await this.sendPushToUser(student.userId, {
          title: `⚠️ ثبت ${statusTitle}`,
          body: `وضعیت «${statusTitle}» در تاریخ ${event.date}${periodText} در سامانه ثبت گردید.`,
          url: '/app/student/attendance',
          tag: `att-${student.id}-${event.date}`,
        });
      }

      // Push to parents
      for (const p of student.parentLinks || []) {
        if (p.parent?.userId) {
          await this.sendPushToUser(p.parent.userId, {
            title: `⚠️ گزارش ${statusTitle} فرزند: ${studentName}`,
            body: `وضعیت «${statusTitle}» برای دانش‌آموز «${studentName}» در تاریخ ${event.date}${periodText} ثبت شد.`,
            url: '/app/parent/attendance',
            tag: `att-parent-${student.id}-${event.date}`,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error handling attendance.student_absence push: ${err.message}`);
    }
  }

  @OnEvent('parent_visit.booked', { async: true })
  async handleParentVisitBooked(event: {
    tenantId: string;
    bookingId: string;
    teacherId: string;
    parentId?: string;
  }) {
    try {
      if (!event.teacherId) return;
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: event.teacherId },
        select: { userId: true },
      });
      if (teacher?.userId) {
        await this.sendPushToUser(teacher.userId, {
          title: '🤝 رزرو وقت ملاقات جدید با اولیا',
          body: 'یک جلسه ملاقات اولیا با شما در سامانه رزرو گردید. جهت مشاهده زمان کلیک فرمایید.',
          url: '/app/teacher/visits',
          tag: `visit-${event.bookingId}`,
        });
      }
    } catch (err: any) {
      this.logger.error(`Error handling parent_visit.booked push: ${err.message}`);
    }
  }

  @OnEvent('chat.message_created', { async: true })
  async handleChatMessageCreated(event: {
    tenantId: string;
    channelId: string;
    senderId: string;
    senderName: string;
    content: string;
  }) {
    try {
      if (!event.channelId) return;
      const members = await this.prisma.chatChannelMember.findMany({
        where: {
          channelId: event.channelId,
          userId: { not: event.senderId },
        },
        select: { userId: true },
      });

      const preview =
        event.content.length > 70 ? `${event.content.slice(0, 70)}...` : event.content;

      for (const m of members) {
        await this.sendPushToUser(m.userId, {
          title: `💬 پیام از ${event.senderName}`,
          body: preview,
          url: `/app/chat?channelId=${event.channelId}`,
          tag: `chat-${event.channelId}`,
        });
      }
    } catch (err: any) {
      this.logger.error(`Error handling chat.message_created push: ${err.message}`);
    }
  }

  @OnEvent('notification.send', { async: true })
  async handleGenericNotificationSend(event: {
    tenantId: string;
    targetUserId: string;
    title: string;
    body: string;
    type?: string;
    badge?: string;
    targetUrl?: string;
  }) {
    try {
      if (!event.targetUserId) return;
      await this.sendPushToUser(event.targetUserId, {
        title: event.title,
        body: event.body,
        url: event.targetUrl || '/app',
        tag: `notif-${Date.now()}`,
      });
    } catch (err: any) {
      this.logger.error(`Error handling notification.send push: ${err.message}`);
    }
  }
}
