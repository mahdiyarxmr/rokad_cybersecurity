import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLessonPlanDto,
  CreateSessionItemDto,
  UpdateSessionStatusDto,
} from './dto/create-lesson-plan.dto';

@Injectable()
export class LessonPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createLessonPlan(tenantId: string, dto: CreateLessonPlanDto, user?: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    // Resolve teacherId
    let teacherId = dto.teacherId;
    if (!teacherId && user) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        teacherId = teacher.id;
      }
    }
    if (!teacherId) {
      const lessonTeacher = await this.prisma.teacherLesson.findFirst({
        where: { tenantId, lessonId: dto.lessonId },
      });
      if (lessonTeacher) {
        teacherId = lessonTeacher.teacherId;
      } else {
        const anyTeacher = await this.prisma.teacherProfile.findFirst({
          where: { tenantId },
        });
        if (anyTeacher) teacherId = anyTeacher.id;
      }
    }
    if (!teacherId) {
      throw new NotFoundException('پروفایل معلم برای ثبت طرح درس یافت نشد');
    }

    // Resolve academicYearId
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
      });
      if (currentYear) {
        academicYearId = currentYear.id;
      } else {
        const anyYear = await this.prisma.academicYear.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });
        if (anyYear) academicYearId = anyYear.id;
      }
    }
    if (!academicYearId) {
      throw new NotFoundException('سال تحصیلی فعال یافت نشد');
    }

    // Build sessions list
    let sessionsData: any[] = [];
    if (dto.sessions && dto.sessions.length > 0) {
      sessionsData = dto.sessions.map((s) => ({
        sessionNumber: s.sessionNumber,
        topic: s.topic,
        objectives: s.objectives,
        activities: s.activities,
        plannedDate: s.plannedDate ? new Date(s.plannedDate) : undefined,
        status: 'PLANNED',
      }));
    } else if (dto.topics || dto.pedagogicalGoal) {
      sessionsData = [
        {
          sessionNumber: dto.sessionNumber || 1,
          topic: dto.topics || dto.title,
          objectives: dto.pedagogicalGoal,
          status: 'PLANNED',
        },
      ];
    }

    return this.prisma.lessonPlan.create({
      data: {
        tenantId,
        academicYearId,
        termId: dto.termId,
        lessonId: dto.lessonId,
        teacherId,
        title: dto.title,
        description: dto.description,
        totalHoursPlanned: dto.totalHoursPlanned || 30,
        sessions: {
          create: sessionsData,
        },
      },
      include: {
        lesson: true,
        teacher: { include: { user: true } },
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });
  }

  async listLessonPlans(tenantId: string, lessonId?: string, teacherId?: string) {
    return this.prisma.lessonPlan.findMany({
      where: {
        tenantId,
        ...(lessonId ? { lessonId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLessonPlanDetails(tenantId: string, planId: string) {
    const plan = await this.prisma.lessonPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        lesson: true,
        academicYear: true,
        teacher: { include: { user: true } },
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });

    if (!plan) {
      throw new NotFoundException('طرح درس یافت نشد');
    }

    const totalSessions = plan.sessions.length;
    const completedSessions = plan.sessions.filter((s) => s.status === 'COMPLETED').length;
    const progressPercentage = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return {
      plan,
      progress: {
        totalSessions,
        completedSessions,
        progressPercentage,
      },
    };
  }

  async addSession(tenantId: string, planId: string, dto: CreateSessionItemDto) {
    const plan = await this.prisma.lessonPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!plan) {
      throw new NotFoundException('طرح درس یافت نشد');
    }

    const existing = await this.prisma.lessonPlanSession.findUnique({
      where: {
        lessonPlanId_sessionNumber: {
          lessonPlanId: planId,
          sessionNumber: dto.sessionNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`جلسه شماره ${dto.sessionNumber} قبلاً در این طرح درس ثبت شده است`);
    }

    return this.prisma.lessonPlanSession.create({
      data: {
        lessonPlanId: planId,
        sessionNumber: dto.sessionNumber,
        topic: dto.topic,
        objectives: dto.objectives,
        activities: dto.activities,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        status: 'PLANNED',
      },
    });
  }

  async updateSessionStatus(
    tenantId: string,
    sessionId: string,
    dto: UpdateSessionStatusDto,
  ) {
    const session = await this.prisma.lessonPlanSession.findFirst({
      where: { id: sessionId, lessonPlan: { tenantId } },
    });
    if (!session) {
      throw new NotFoundException('جلسه طرح درس یافت نشد');
    }

    return this.prisma.lessonPlanSession.update({
      where: { id: sessionId },
      data: {
        status: dto.status,
        actualDate: dto.actualDate ? new Date(dto.actualDate) : undefined,
        notes: dto.notes,
      },
    });
  }
}
