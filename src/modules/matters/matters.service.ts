import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatterDto } from './dto/create-matter.dto';
import { UpdateMatterDto } from './dto/update-matter.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createMatter(
    tenantId: string,
    reportedById: string,
    dto: CreateMatterDto,
  ) {
    let student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { user: true },
    });
    if (!student) {
      const enrollment = await this.prisma.classEnrollment.findUnique({
        where: { id: dto.studentId },
        include: { student: { include: { user: true } } },
      });
      if (enrollment?.student) {
        student = enrollment.student;
      } else {
        student = await this.prisma.studentProfile.findFirst({
          where: { userId: dto.studentId, tenantId },
          include: { user: true },
        });
      }
    }
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
      });
      academicYearId = currentYear ? currentYear.id : (await this.prisma.academicYear.findFirst({ where: { tenantId } }))?.id || '';
    }

    const shouldNotifyParents = dto.notifiedParents !== undefined ? dto.notifiedParents : false;

    const matter = await this.prisma.disciplinaryMatter.create({
      data: {
        tenantId,
        studentId: student.id,
        academicYearId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        points: dto.points || 0,
        actionTaken: dto.actionTaken,
        notifiedParents: shouldNotifyParents,
        reportedById,
      },
      include: {
        student: { include: { user: true } },
        reportedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    this.eventEmitter.emit('matter.recorded', {
      tenantId,
      studentId: student.id,
      matterType: dto.type,
      points: dto.points,
    });

    // 1. Push notification to student
    const isPositive = dto.type === 'POSITIVE';
    const studentTitle = isPositive ? '🌟 ثبت مورد تشویقی جدید' : '⚠️ ثبت مورد انضباطی در پرونده';
    const pointsStr = dto.points !== undefined && dto.points !== 0 ? ` (${dto.points > 0 ? `+${dto.points}` : dto.points} امتیاز)` : '';
    const studentBody = isPositive
      ? `مورد تشویقی «${dto.title}»${pointsStr} در کارنامه انضباطی شما ثبت گردید.`
      : `مورد انضباطی «${dto.title}»${pointsStr} در پرونده رفتاری شما ثبت شد.`;

    if (student.userId) {
      this.notificationsService
        .sendPushToUser(student.userId, {
          title: studentTitle,
          body: studentBody,
          url: '/app/student/matters',
          tag: `matter-${matter.id}`,
        })
        .catch(() => {});
    }

    // 2. Push notification to linked parent(s)
    if (shouldNotifyParents) {
      const studentName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || 'فرزند شما';
      const parentLinks = await this.prisma.parentStudentLink.findMany({
        where: { studentId: student.id },
        include: { parent: true },
      });

      const parentTitle = isPositive
        ? `🌟 تشویق ثبت‌شده برای ${studentName}`
        : `⚠️ گزارش انضباطی فرزند: ${studentName}`;
      const parentBody = isPositive
        ? `مورد تشویقی «${dto.title}»${pointsStr} برای ${studentName} در سامانه مدرسه ثبت گردید.`
        : `مورد انضباطی «${dto.title}»${pointsStr} برای ${studentName} به اولیا گزارش گردید.`;

      for (const link of parentLinks) {
        if (link.parent?.userId) {
          this.notificationsService
            .sendPushToUser(link.parent.userId, {
              title: parentTitle,
              body: parentBody,
              url: '/app/student/matters',
              tag: `matter-parent-${matter.id}`,
            })
            .catch(() => {});
        }
      }
    }

    return matter;
  }

  async updateMatter(
    tenantId: string,
    matterId: string,
    dto: UpdateMatterDto,
  ) {
    if (matterId.startsWith('att-')) {
      const attId = matterId.replace('att-', '');
      const att = await this.prisma.studentAttendance.findFirst({
        where: { id: attId, tenantId },
      });
      if (!att) {
        throw new NotFoundException('مورد انضباطی یا ارزیابی جلسه یافت نشد');
      }

      let rewardDisciplineType = att.rewardDisciplineType;
      if (dto.type) {
        if (dto.type === 'POSITIVE') {
          rewardDisciplineType = (dto.points && dto.points >= 2) ? 'EXCELLENT' : 'POSITIVE';
        } else if (dto.type === 'WARNING') {
          rewardDisciplineType = 'WARNING';
        } else if (dto.type === 'NEGATIVE' || dto.type === 'SUSPENSION' || dto.type === 'COUNSELING_REFERRAL') {
          rewardDisciplineType = 'NEGATIVE';
        }
      }

      const updated = await this.prisma.studentAttendance.update({
        where: { id: attId },
        data: {
          ...(dto.oralGrade !== undefined ? { oralGrade: dto.oralGrade } : {}),
          rewardDisciplineType,
          ...(dto.title || dto.description
            ? {
                rewardDisciplineNote: dto.title || dto.description || '',
                sessionNote: dto.description || att.sessionNote,
              }
            : {}),
        },
        include: {
          student: { include: { user: true } },
          recordedBy: { select: { firstName: true, lastName: true, role: true } },
          classroom: { select: { id: true, name: true, roomNumber: true } },
          lesson: { select: { id: true, name: true, code: true } },
        },
      });

      return this.mapAttendanceToMatter(updated);
    }

    const matter = await this.prisma.disciplinaryMatter.findFirst({
      where: { id: matterId, tenantId },
    });
    if (!matter) {
      throw new NotFoundException('مورد انضباطی مورد نظر یافت نشد');
    }

    const updatedMatter = await this.prisma.disciplinaryMatter.update({
      where: { id: matterId },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.points !== undefined ? { points: dto.points } : {}),
        ...(dto.actionTaken !== undefined ? { actionTaken: dto.actionTaken?.trim() || null } : {}),
        ...(dto.notifiedParents !== undefined ? { notifiedParents: dto.notifiedParents } : {}),
      },
      include: {
        student: { include: { user: true } },
        reportedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return this.mapDirectMatter(updatedMatter);
  }

  async deleteMatter(tenantId: string, matterId: string) {
    if (matterId.startsWith('att-')) {
      const attId = matterId.replace('att-', '');
      const att = await this.prisma.studentAttendance.findFirst({
        where: { id: attId, tenantId },
      });
      if (!att) {
        throw new NotFoundException('مورد انضباطی یا ارزیابی جلسه یافت نشد');
      }
      return this.prisma.studentAttendance.update({
        where: { id: attId },
        data: {
          oralGrade: null,
          rewardDisciplineType: null,
          rewardDisciplineNote: null,
          sessionNote: null,
        },
      });
    }

    const matter = await this.prisma.disciplinaryMatter.findFirst({
      where: { id: matterId, tenantId },
    });
    if (!matter) {
      throw new NotFoundException('مورد انضباطی مورد نظر یافت نشد');
    }

    return this.prisma.disciplinaryMatter.delete({
      where: { id: matterId },
    });
  }

  private mapAttendanceToMatter(att: any) {
    let type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL' = 'POSITIVE';
    let points = 0;
    let title = 'ارزیابی جلسه کلاسی';

    const rewardType = att.rewardDisciplineType;
    const grade = att.oralGrade;

    if (rewardType === 'EXCELLENT') {
      type = 'POSITIVE';
      points = 2;
      title = 'تشویق کلاسی (عالی)';
    } else if (rewardType === 'POSITIVE') {
      type = 'POSITIVE';
      points = 1;
      title = 'نمره مثبت کلاسی';
    } else if (rewardType === 'NEGATIVE') {
      type = 'NEGATIVE';
      points = -1;
      title = 'نمره منفی کلاسی';
    } else if (rewardType === 'WARNING') {
      type = 'WARNING';
      points = -0.5;
      title = 'تذکر انضباطی در جلسه';
    } else if (rewardType === 'HOMEWORK_INCOMPLETE') {
      type = 'NEGATIVE';
      points = -1;
      title = 'عدم انجام تکالیف درسی';
    } else if (grade !== null && grade !== undefined) {
      if (grade >= 14) {
        type = 'POSITIVE';
        points = grade >= 18 ? 2 : 1;
      } else {
        type = 'NEGATIVE';
        points = grade < 10 ? -1 : 0;
      }
      title = `نمره پرسش کلاسی: ${grade} از ۲۰`;
    }

    if (grade !== null && grade !== undefined && rewardType && rewardType !== 'NONE') {
      title = `${title} (${grade} از ۲۰)`;
    }

    const descParts: string[] = [];
    if (att.rewardDisciplineNote?.trim()) {
      descParts.push(att.rewardDisciplineNote.trim());
    } else if (grade !== null && grade !== undefined) {
      descParts.push(`ثبت نمره پرسش کلاسی ${grade} از ۲۰ در دفتر کلاسی`);
    }

    return {
      id: `att-${att.id}`,
      source: 'CLASSROOM_SESSION',
      attendanceId: att.id,
      studentId: att.studentId,
      student: att.student,
      academicYearId: att.academicYearId,
      type,
      title,
      description: descParts.join(' — ') || 'ثبت در دفتر کلاسی و حضور غیاب',
      points,
      actionTaken: att.classroom ? `کلاس ${att.classroom.name}` : undefined,
      classroom: att.classroom ? { id: att.classroom.id, name: att.classroom.name, roomNumber: att.classroom.roomNumber } : null,
      lesson: att.lesson ? { id: att.lesson.id, name: att.lesson.name, code: att.lesson.code } : null,
      periodNumber: att.periodNumber || null,
      sessionDate: att.date,
      oralGrade: att.oralGrade,
      rewardDisciplineType: att.rewardDisciplineType,
      rewardDisciplineNote: att.rewardDisciplineNote,
      sessionNote: att.sessionNote,
      reportedById: att.recordedById,
      reportedBy: att.recordedBy,
      reportedAt: att.createdAt || new Date(att.date),
      notifiedParents: false,
    };
  }

  private mapDirectMatter(m: any) {
    return {
      ...m,
      source: 'DIRECT_MATTER',
      classroom: null,
      lesson: null,
      periodNumber: null,
      sessionDate: m.reportedAt ? new Date(m.reportedAt).toISOString().slice(0, 10) : null,
      oralGrade: null,
      rewardDisciplineType: null,
    };
  }

  async getMyMatters(tenantId: string, user: any) {
    if (user.role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!student) return { matters: [], totalPoints: 0, positiveCount: 0, negativeCount: 0 };
      return this.getStudentMatters(tenantId, student.id);
    } else if (user.role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: { studentLinks: { include: { student: true } } },
      });
      if (!parent || parent.studentLinks.length === 0) {
        return { matters: [], totalPoints: 0, positiveCount: 0, negativeCount: 0 };
      }
      const studentId = parent.studentLinks[0].studentId;
      return this.getStudentMatters(tenantId, studentId);
    } else {
      return this.listMatters(tenantId);
    }
  }

  async getStudentMatters(tenantId: string, studentId: string) {
    const [directMatters, attendanceRecords] = await Promise.all([
      this.prisma.disciplinaryMatter.findMany({
        where: { tenantId, studentId },
        include: {
          student: { include: { user: true } },
          reportedBy: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { reportedAt: 'desc' },
      }),
      this.prisma.studentAttendance.findMany({
        where: {
          tenantId,
          studentId,
          OR: [
            { rewardDisciplineType: { not: null, notIn: ['NONE'] } },
            { oralGrade: { not: null } },
            { rewardDisciplineNote: { not: null } },
          ],
        },
        include: {
          student: { include: { user: true } },
          recordedBy: { select: { firstName: true, lastName: true, role: true } },
          classroom: { select: { id: true, name: true, roomNumber: true } },
          lesson: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mappedDirect = directMatters.map((m) => this.mapDirectMatter(m));
    const mappedAttendance = attendanceRecords.map((att) => this.mapAttendanceToMatter(att));

    const combined = [...mappedDirect, ...mappedAttendance].sort((a, b) => {
      const dateA = new Date(a.reportedAt || a.sessionDate).getTime();
      const dateB = new Date(b.reportedAt || b.sessionDate).getTime();
      return dateB - dateA;
    });

    const totalPoints = combined.reduce((sum, m) => sum + (m.points || 0), 0);

    return {
      matters: combined,
      totalPoints,
      positiveCount: combined.filter((m) => m.type === 'POSITIVE').length,
      negativeCount: combined.filter(
        (m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION',
      ).length,
    };
  }

  async listMatters(tenantId: string, type?: string) {
    const [directMatters, attendanceRecords] = await Promise.all([
      this.prisma.disciplinaryMatter.findMany({
        where: {
          tenantId,
          ...(type && type !== 'ALL' ? { type: type as any } : {}),
        },
        include: {
          student: { include: { user: true } },
          reportedBy: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { reportedAt: 'desc' },
      }),
      this.prisma.studentAttendance.findMany({
        where: {
          tenantId,
          OR: [
            { rewardDisciplineType: { not: null, notIn: ['NONE'] } },
            { oralGrade: { not: null } },
            { rewardDisciplineNote: { not: null } },
          ],
        },
        include: {
          student: { include: { user: true } },
          recordedBy: { select: { firstName: true, lastName: true, role: true } },
          classroom: { select: { id: true, name: true, roomNumber: true } },
          lesson: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mappedDirect = directMatters.map((m) => this.mapDirectMatter(m));
    let mappedAttendance = attendanceRecords.map((att) => this.mapAttendanceToMatter(att));

    if (type && type !== 'ALL') {
      mappedAttendance = mappedAttendance.filter((m) => m.type === type);
    }

    return [...mappedDirect, ...mappedAttendance].sort((a, b) => {
      const dateA = new Date(a.reportedAt || a.sessionDate).getTime();
      const dateB = new Date(b.reportedAt || b.sessionDate).getTime();
      return dateB - dateA;
    });
  }
}
