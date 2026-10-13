import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignCoachDto, UpdateSessionDto, CreateExtraRequestDto, RespondExtraRequestDto } from './dto/coaching.dto';
import { Role } from '../../common/constants';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * دریافت زمینه و داشبورد کوچینگ متناسب با نقش کاربر
   */
  async getMyCoachingContext(tenantId: string, user: any) {
    const role = user?.role as Role;

    if (role === Role.STUDENT) {
      // 1. اطلاعات برای دانش‌آموز
      const link = await this.prisma.studentCoachLink.findFirst({
        where: { tenantId, studentId: user.id, status: 'ACTIVE' },
        include: {
          coach: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, phone: true },
          },
        },
      });

      // جلسات آینده
      const now = new Date();
      const upcomingSessions = await this.prisma.coachingSession.findMany({
        where: {
          tenantId,
          studentId: user.id,
          scheduledDate: { gte: now },
        },
        include: {
          coach: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 5,
      });

      // سابقه جلسات گذشته
      const pastSessions = await this.prisma.coachingSession.findMany({
        where: {
          tenantId,
          studentId: user.id,
          scheduledDate: { lt: now },
        },
        include: {
          coach: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledDate: 'desc' },
        take: 10,
      });

      // درخواست‌های جلسه فوق‌العاده
      const extraRequests = await this.prisma.coachingExtraRequest.findMany({
        where: { tenantId, studentId: user.id },
        include: {
          coach: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // آمار حضور و غیاب
      const allPast = await this.prisma.coachingSession.findMany({
        where: { tenantId, studentId: user.id, scheduledDate: { lt: now } },
      });
      const totalPast = allPast.length;
      const attended = allPast.filter((s) => s.attendanceStatus === 'PRESENT').length;
      const absent = allPast.filter((s) => s.attendanceStatus === 'ABSENT').length;
      const excused = allPast.filter((s) => s.attendanceStatus === 'EXCUSED').length;

      return {
        role: 'STUDENT',
        link,
        nextSession: upcomingSessions[0] || null,
        upcomingSessions,
        pastSessions,
        extraRequests,
        stats: {
          totalPast,
          attended,
          absent,
          excused,
          attendanceRate: totalPast > 0 ? Math.round((attended / totalPast) * 100) : 100,
        },
      };
    }

    // 2. اطلاعات برای کوچ / مربی / مدیر
    const coachId = user.id;

    // محدوده جلسات امروز
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const isSuperOrSchoolAdmin = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF].includes(role);

    // جلسات امروز
    const todaySessions = await this.prisma.coachingSession.findMany({
      where: {
        tenantId,
        ...(isSuperOrSchoolAdmin ? {} : { coachId }),
        scheduledDate: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: { select: { studentCode: true } },
          },
        },
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // لیست دانش‌آموزان تحت پوشش کوچ
    const myStudents = await this.prisma.studentCoachLink.findMany({
      where: {
        tenantId,
        ...(isSuperOrSchoolAdmin ? {} : { coachId }),
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            studentProfile: {
              select: {
                studentCode: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { classroom: { select: { name: true } } },
                },
              },
            },
          },
        },
        coach: {
          select: { id: true, firstName: true, lastName: true },
        },
        sessions: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { slotDayOfWeek: 'asc' },
    });

    // درخواست‌های جلسه فوق‌العاده در انتظار
    const pendingExtraRequests = await this.prisma.coachingExtraRequest.findMany({
      where: {
        tenantId,
        ...(isSuperOrSchoolAdmin ? {} : { coachId }),
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: { select: { studentCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      role: isSuperOrSchoolAdmin ? 'ADMIN' : 'COACH',
      todaySessions,
      myStudents,
      pendingExtraRequests,
    };
  }

  /**
   * دریافت جلسات امروز یک کوچ
   */
  async getCoachTodaySessions(tenantId: string, coachId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return this.prisma.coachingSession.findMany({
      where: {
        tenantId,
        coachId,
        scheduledDate: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: { select: { studentCode: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  /**
   * دریافت لیست دانش‌آموزان تخصیص‌یافته به یک کوچ
   */
  async getCoachStudents(tenantId: string, coachId: string) {
    return this.prisma.studentCoachLink.findMany({
      where: { tenantId, coachId, status: 'ACTIVE' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            studentProfile: {
              select: {
                studentCode: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { classroom: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { slotDayOfWeek: 'asc' },
    });
  }

  /**
   * تولید کارنامه و پرونده تحلیلی جامع کوچینگ دانش‌آموز
   */
  async getStudentDossierReport(tenantId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, tenantId },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { classroom: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('دانش‌آموز مورد نظر یافت نشد');
    }

    const activeLink = await this.prisma.studentCoachLink.findFirst({
      where: { tenantId, studentId, status: 'ACTIVE' },
      include: {
        coach: {
          select: { id: true, firstName: true, lastName: true, role: true, phone: true },
        },
      },
    });

    const sessions = await this.prisma.coachingSession.findMany({
      where: { tenantId, studentId },
      include: {
        coach: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    // شاخص‌های تجمیعی
    const now = new Date();
    const pastSessions = sessions.filter((s) => new Date(s.scheduledDate) <= now);
    const totalPast = pastSessions.length;
    const attended = pastSessions.filter((s) => s.attendanceStatus === 'PRESENT').length;
    const absent = pastSessions.filter((s) => s.attendanceStatus === 'ABSENT').length;
    const excused = pastSessions.filter((s) => s.attendanceStatus === 'EXCUSED').length;
    const attendanceRate = totalPast > 0 ? Math.round((attended / totalPast) * 100) : 100;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, phone: true, address: true, logoUrl: true },
    });

    return {
      tenant: {
        name: tenant?.name || 'هنرستان هوشمند رکاد',
        slug: tenant?.slug || 'rokad-school',
        phone: tenant?.phone || '',
        address: tenant?.address || '',
        logoUrl: tenant?.logoUrl || '/logo.svg',
      },
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentCode: student.studentProfile?.studentCode || '---',
        nationalCode: student.studentProfile?.nationalCode || student.nationalId || '---',
        fatherName: student.studentProfile?.fatherName || '---',
        classroom: student.studentProfile?.enrollments[0]?.classroom?.name || 'کلاس عمومی',
        phone: student.phone,
      },
      activeCoach: activeLink?.coach || null,
      schedule: activeLink
        ? {
            slotDayOfWeek: activeLink.slotDayOfWeek,
            slotStartTime: activeLink.slotStartTime,
            slotEndTime: activeLink.slotEndTime,
            slotDurationMinutes: activeLink.slotDurationMinutes,
            recurrenceCycle: activeLink.recurrenceCycle,
          }
        : null,
      stats: {
        totalSessions: sessions.length,
        totalPast,
        attended,
        absent,
        excused,
        attendanceRate,
      },
      sessions,
    };
  }

  /**
   * انتساب یا تغییر کوچ دانش‌آموز با برنامه هفتگی ثابت
   */
  async assignCoach(tenantId: string, adminOrCoachId: string, dto: AssignCoachDto) {
    // غیرفعال کردن ارتباط فعال قبلی در صورت وجود
    await this.prisma.studentCoachLink.updateMany({
      where: { tenantId, studentId: dto.studentId, status: 'ACTIVE' },
      data: { status: 'INACTIVE' },
    });

    const link = await this.prisma.studentCoachLink.create({
      data: {
        tenantId,
        studentId: dto.studentId,
        coachId: dto.coachId,
        status: 'ACTIVE',
        slotDayOfWeek: dto.slotDayOfWeek !== undefined ? dto.slotDayOfWeek : 0,
        slotStartTime: dto.slotStartTime || '10:20',
        slotEndTime: dto.slotEndTime || '10:40',
        slotDurationMinutes: dto.slotDurationMinutes || 20,
        recurrenceCycle: 'BIWEEKLY',
        notes: dto.notes,
        startDate: new Date(),
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
      },
    });

    // تولید خودکار جلسات آینده (۴ جلسه دو هفته یک‌بار)
    await this.generateUpcomingBiweeklySessions(tenantId, link.id, dto.studentId, dto.coachId, link.slotDayOfWeek ?? 0, link.slotStartTime ?? '10:20', link.slotDurationMinutes);

    // ارسال نوتیفیکیشن اختصاص کوچ به دانش‌آموز و مربی
    this.notificationsService
      .sendPushToUser(dto.studentId, {
        title: '🎯 کوچ اختصاصی شما تخصیص یافت',
        body: 'کوچ و مشاور اختصاصی شما در سامانه تعیین شد. جهت مشاهده برنامه جلسات به صفحه کوچینگ مراجعه نمایید.',
        url: '/app/coaching',
        tag: `coaching-assigned-${link.id}`,
      })
      .catch(() => {});

    this.notificationsService
      .sendPushToUser(dto.coachId, {
        title: '📋 دانش‌آموز جدید تحت پوشش کوچینگ',
        body: 'دانش‌آموز جدیدی به لیست هدایت تحصیلی و کوچینگ شما اضافه گردید.',
        url: '/app/coaching',
        tag: `coaching-assigned-${link.id}`,
      })
      .catch(() => {});

    return link;
  }

  /**
   * تولید جلسات دوهفته‌ای آینده برای اسلات تعیین‌شده
   */
  private async generateUpcomingBiweeklySessions(
    tenantId: string,
    linkId: string,
    studentId: string,
    coachId: string,
    slotDayOfWeek: number, // 0 = شنبه, 1 = یک‌شنبه, ...
    slotStartTime: string,
    durationMinutes: number,
  ) {
    const [sh, sm] = slotStartTime.split(':').map(Number);
    const today = new Date();
    
    // پیدا کردن اولین تاریخ روز مورد نظر بعد از امروز
    // JavaScript getDay(): 0=یکشنبه, 1=دوشنبه, ..., 6=شنبه
    // تطبیق: شنبه در تقویم ایران = 6 در Date.getDay()
    const jsTargetDay = (slotDayOfWeek + 6) % 7;

    let cursor = new Date(today);
    while (cursor.getDay() !== jsTargetDay) {
      cursor.setDate(cursor.getDate() + 1);
    }
    cursor.setHours(sh || 10, sm || 20, 0, 0);

    // ایجاد ۴ جلسه با فاصله ۱۴ روز (دو هفته یک‌بار)
    for (let i = 0; i < 4; i++) {
      const sessionDate = new Date(cursor.getTime() + i * 14 * 24 * 60 * 60 * 1000);

      const existing = await this.prisma.coachingSession.findFirst({
        where: {
          tenantId,
          studentId,
          coachId,
          scheduledDate: sessionDate,
        },
      });

      if (!existing) {
        await this.prisma.coachingSession.create({
          data: {
            tenantId,
            linkId,
            studentId,
            coachId,
            sessionType: 'REGULAR',
            scheduledDate: sessionDate,
            durationMinutes,
            attendanceStatus: 'PENDING',
          },
        });
      }
    }
  }

  /**
   * ثبت حضور و غیاب و یادداشت‌های جلسه توسط کوچ
   */
  async updateSessionAttendanceAndNotes(
    tenantId: string,
    sessionId: string,
    coachId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.prisma.coachingSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new NotFoundException('جلسه مورد نظر یافت نشد');
    }

    return this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.attendanceStatus ? { attendanceStatus: dto.attendanceStatus } : {}),
        ...(dto.coachNotes !== undefined ? { coachNotes: dto.coachNotes } : {}),
        ...(dto.actionItems !== undefined ? { actionItems: dto.actionItems } : {}),
        conductedAt: new Date(),
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        coach: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * ثبت درخواست جلسه فوق‌العاده توسط دانش‌آموز
   */
  async requestExtraSession(tenantId: string, studentId: string, dto: CreateExtraRequestDto) {
    const activeLink = await this.prisma.studentCoachLink.findFirst({
      where: { tenantId, studentId, status: 'ACTIVE' },
    });

    if (!activeLink) {
      throw new BadRequestException('برای شما هنوز کوچ یا مربی تخصیص داده نشده است. لطفاً با معاونت یا مدیر مدرسه تماس بگیرید.');
    }

    const extraReq = await this.prisma.coachingExtraRequest.create({
      data: {
        tenantId,
        studentId,
        coachId: activeLink.coachId,
        reason: dto.reason,
        preferredDate: dto.preferredDate,
        status: 'PENDING',
      },
      include: {
        coach: { select: { firstName: true, lastName: true } },
      },
    });

    // اطلاع‌رسانی آنی به کوچ در خصوص درخواست جلسه فوق‌العاده
    this.notificationsService
      .sendPushToUser(activeLink.coachId, {
        title: '📩 درخواست جلسه فوق‌العاده کوچینگ',
        body: `دانش‌آموز درخواست جلسه فوق‌العاده با موضوع «${dto.reason}» ثبت نموده است.`,
        url: '/app/coaching',
        tag: `coaching-extra-req-${extraReq.id}`,
      })
      .catch(() => {});

    return extraReq;
  }

  /**
   * پاسخ و زمان‌بندی جلسه فوق‌العاده توسط کوچ
   */
  async respondToExtraRequest(
    tenantId: string,
    coachId: string,
    requestId: string,
    dto: RespondExtraRequestDto,
  ) {
    const request = await this.prisma.coachingExtraRequest.findFirst({
      where: { id: requestId, tenantId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (dto.status === 'APPROVED') {
      if (!dto.scheduledDate) {
        throw new BadRequestException('برای تایید درخواست، تعیین تاریخ و ساعت جلسه الزامی است');
      }

      const scheduledDateObj = new Date(dto.scheduledDate);
      const durationMinutes = dto.durationMinutes || 20;

      // ایجاد جلسه فوق‌العاده در تقویم
      const newSession = await this.prisma.coachingSession.create({
        data: {
          tenantId,
          studentId: request.studentId,
          coachId,
          sessionType: 'EXTRA',
          scheduledDate: scheduledDateObj,
          durationMinutes,
          attendanceStatus: 'PENDING',
        },
      });

      // به‌روزرسانی وضعیت درخواست
      await this.prisma.coachingExtraRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          coachResponse: dto.coachResponse || 'درخواست جلسه فوق‌العاده تایید و زمان‌بندی شد.',
          scheduledDate: scheduledDateObj,
        },
      });

      // اطلاع‌رسانی تایید جلسه به دانش‌آموز
      const dateStr = scheduledDateObj.toLocaleDateString('fa-IR');
      const timeStr = scheduledDateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      this.notificationsService
        .sendPushToUser(request.studentId, {
          title: '✅ تایید جلسه فوق‌العاده کوچینگ',
          body: `درخواست جلسه فوق‌العاده شما تایید شد. زمان برگزاری: ${dateStr} ساعت ${timeStr}`,
          url: '/app/coaching',
          tag: `coaching-extra-approved-${requestId}`,
        })
        .catch(() => {});

      return {
        success: true,
        session: newSession,
      };
    } else {
      // رد درخواست
      await this.prisma.coachingExtraRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          coachResponse: dto.coachResponse || 'متاسفانه در حال حاضر امکان هماهنگی جلسه فوق‌العاده وجود ندارد.',
        },
      });

      // اطلاع‌رسانی عدم تایید به دانش‌آموز
      this.notificationsService
        .sendPushToUser(request.studentId, {
          title: 'پیام درباره درخواست جلسه فوق‌العاده',
          body: dto.coachResponse || 'درخواست جلسه فوق‌العاده شما توسط کوچ بررسی شد.',
          url: '/app/coaching',
          tag: `coaching-extra-rejected-${requestId}`,
        })
        .catch(() => {});

      return {
        success: true,
        message: 'درخواست جلسه فوق‌العاده با موفقیت رد شد.',
      };
    }
  }

  /**
   * دریافت لیست کوچ‌های موجود در مدرسه
   */
  async listAvailableCoaches(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: [Role.COACH, Role.TEACHER, Role.STAFF, Role.SCHOOL_ADMIN] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        phone: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  /**
   * دریافت لیست دانش‌آموزان برای انتساب
   */
  async listStudentsForAssignment(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: Role.STUDENT,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        studentProfile: {
          select: {
            studentCode: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { classroom: { select: { name: true } } },
            },
          },
        },
        studentCoachingLinks: {
          where: { status: 'ACTIVE' },
          include: { coach: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }
}
