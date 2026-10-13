import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateKaActivityDto, SubmitKaActivityDto, ReviewKaActivityDto, DirectAwardKaActivityDto } from '../dto/ka.dto';
import { KaActivityStatus } from '@prisma/client';

@Injectable()
export class KaActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  // ADMIN: Activity Management
  // ============================

  async createActivity(tenantId: string, dto: CreateKaActivityDto) {
    return this.prisma.kaActivity.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async findAllActivities(tenantId: string) {
    return this.prisma.kaActivity.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
    });
  }

  // ============================
  // STUDENT: Submit Activity
  // ============================

  async submitActivity(tenantId: string, userId: string, dto: SubmitKaActivityDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const activity = await this.prisma.kaActivity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity || activity.tenantId !== tenantId) {
      throw new NotFoundException('Activity not found');
    }

    return this.prisma.kaStudentActivity.create({
      data: {
        tenantId,
        studentId: student.id,
        activityId: activity.id,
        details: dto.details,
        status: KaActivityStatus.PENDING,
      },
    });
  }

  async getMySubmissions(tenantId: string, userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    return this.prisma.kaStudentActivity.findMany({
      where: { tenantId, studentId: student.id },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================
  // ADMIN: Review Submissions
  // ============================

  async findAllSubmissions(tenantId: string) {
    return this.prisma.kaStudentActivity.findMany({
      where: { tenantId },
      include: { 
        activity: true,
        student: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewSubmission(tenantId: string, submissionId: string, dto: ReviewKaActivityDto) {
    const submission = await this.prisma.kaStudentActivity.findUnique({
      where: { id: submissionId },
      include: { student: true }
    });

    if (!submission || submission.tenantId !== tenantId) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== KaActivityStatus.PENDING) {
      throw new BadRequestException('Submission is already reviewed');
    }

    // Update submission status
    const updated = await this.prisma.kaStudentActivity.update({
      where: { id: submissionId },
      data: {
        status: dto.status,
        scoreAwarded: dto.scoreAwarded,
        adminComment: dto.adminComment,
      },
    });

    // If approved, update student's score and token
    if (dto.status === KaActivityStatus.APPROVED && dto.scoreAwarded) {
      const currentScore = submission.student.kaScore || 0;
      const newScore = Math.max(0, currentScore + dto.scoreAwarded);
      const newToken = Math.max(0, Math.floor(newScore * 0.95));

      await this.prisma.studentProfile.update({
        where: { id: submission.studentId },
        data: {
          kaScore: newScore,
          kaToken: newToken, // As per rule: token = floor(score * 0.95)
        },
      });
    }

    return updated;
  }

  // ============================
  // ADMIN: Direct Score Entry (Positive/Negative)
  // ============================

  async directAwardActivity(tenantId: string, dto: DirectAwardKaActivityDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException('دانش‌آموز یافت نشد');
    }

    const activity = await this.prisma.kaActivity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity || activity.tenantId !== tenantId) {
      throw new NotFoundException('فعالیت یافت نشد');
    }

    const record = await this.prisma.kaStudentActivity.create({
      data: {
        tenantId,
        studentId: student.id,
        activityId: activity.id,
        details: dto.details,
        scoreAwarded: dto.scoreAwarded,
        adminComment: dto.adminComment || 'ثبت مستقیم توسط کادر مدرسه',
        status: KaActivityStatus.APPROVED,
      },
      include: {
        activity: true,
      },
    });

    // به‌روزرسانی امتیاز و توکن
    const currentScore = student.kaScore || 0;
    const newScore = Math.max(0, currentScore + dto.scoreAwarded);
    const newToken = Math.max(0, Math.floor(newScore * 0.95));

    await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        kaScore: newScore,
        kaToken: newToken,
      },
    });

    return record;
  }

  async getSchoolStudents(tenantId: string) {
    return this.prisma.studentProfile.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentKaHistory(tenantId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        enrollments: {
          include: { classroom: true },
        },
      },
    });

    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException('دانش‌آموز یافت نشد');
    }

    const activities = await this.prisma.kaStudentActivity.findMany({
      where: { tenantId, studentId },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });

    const rewards = await this.prisma.kaStudentReward.findMany({
      where: { tenantId, studentId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      student,
      activities,
      rewards,
    };
  }
}

