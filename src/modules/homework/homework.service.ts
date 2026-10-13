import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  GradeSubmissionDto,
} from './dto/create-homework.dto';

import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Upload attachment for homework or submission using unified MinIO StorageService
   */
  async uploadAttachment(
    tenantId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    return this.storageService.uploadFile(tenantId, 'homework', file);
  }

  /**
   * Create a new homework assignment
   */
  async createHomework(tenantId: string, dto: CreateHomeworkDto, user?: any) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر یافت نشد');
    }

    let teacherId = dto.teacherId;

    if (user?.role === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher) {
        throw new ForbiddenException('پروفایل دبیر برای این کاربر یافت نشد');
      }
      teacherId = teacher.id;

      // Check if this teacher is assigned to this lesson
      const teachesLesson = await this.prisma.teacherLesson.findFirst({
        where: { teacherId: teacher.id, lessonId: dto.lessonId, tenantId },
      });
      const hasSchedule = await this.prisma.classSchedule.findFirst({
        where: { teacherId: teacher.id, lessonId: dto.lessonId, tenantId },
      });

      if (!teachesLesson && !hasSchedule) {
        throw new ForbiddenException('شما فقط مجاز به تعریف تکلیف برای دروس تخصیص‌یافته به خودتان هستید');
      }
    } else if (!teacherId && user) {
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
        if (anyTeacher) {
          teacherId = anyTeacher.id;
        }
      }
    }

    if (!teacherId) {
      throw new BadRequestException('پروفایل دبیر مربوطه برای این تکلیف مشخص نشده است');
    }

    let finalDescription = dto.description || '';
    if (dto.publishAt) {
      finalDescription = `<!--SCHEDULED_PUBLISH:${new Date(dto.publishAt).toISOString()}-->\n` + finalDescription;
    }

    const homework = await this.prisma.homework.create({
      data: {
        tenantId,
        classroomId: dto.classroomId,
        lessonId: dto.lessonId,
        teacherId,
        title: dto.title,
        description: finalDescription,
        attachmentUrls: dto.attachmentUrls || [],
        dueDate: new Date(dto.dueDate),
        maxScore: dto.maxScore || 20,
        isGraded: dto.isGraded !== undefined ? dto.isGraded : true,
        allowLateSubmissions: dto.allowLateSubmissions || false,
      },
      include: {
        classroom: true,
        lesson: true,
        teacher: { include: { user: true } },
      },
    });

    this.eventEmitter.emit('homework.created', {
      tenantId,
      homeworkId: homework.id,
      classroomId: dto.classroomId,
      title: dto.title,
    });

    return this.parseHomeworkMeta(homework);
  }

  /**
   * Helper to parse scheduled publish metadata stored in description
   */
  private parseHomeworkMeta(hw: any) {
    if (!hw) return hw;
    let publishAt: string | null = null;
    let cleanDescription = hw.description || '';
    const match = cleanDescription.match(/^<!--SCHEDULED_PUBLISH:(.*?)-->\n?/);
    if (match) {
      publishAt = match[1];
      cleanDescription = cleanDescription.replace(match[0], '');
    }
    const isScheduled = !!publishAt && new Date(publishAt).getTime() > Date.now();

    let submissionStats: { total: number; graded: number; pending: number } | undefined;
    if (hw.submissions && Array.isArray(hw.submissions)) {
      const total = hw.submissions.length;
      const graded = hw.submissions.filter((s: any) => s.status === 'GRADED').length;
      const pending = hw.submissions.filter((s: any) => s.status !== 'GRADED').length;
      submissionStats = { total, graded, pending };
    } else if (hw._count?.submissions !== undefined) {
      submissionStats = {
        total: hw._count.submissions,
        graded: 0,
        pending: hw._count.submissions,
      };
    }

    return {
      ...hw,
      description: cleanDescription,
      publishAt,
      isScheduled,
      submissionStats,
    };
  }

  /**
   * List all homeworks in school or for current teacher/student
   */
  async listAllHomeworks(tenantId: string, user?: any) {
    const whereClause: any = { tenantId };
    let studentProfileId: string | undefined;
    let parentStudentIds: string[] = [];

    if (user?.role === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        whereClause.teacherId = teacher.id;
      }
    } else if (user?.role === 'STUDENT') {
      let student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: { enrollments: { where: { status: 'ACTIVE' } } },
      });
      if (!student) {
        student = await this.prisma.studentProfile.findFirst({
          where: { userId: user.id },
          include: { enrollments: { where: { status: 'ACTIVE' } } },
        });
      }
      if (student) {
        studentProfileId = student.id;
        const classIds = student.enrollments.map((e) => e.classroomId) || [];
        whereClause.OR = [
          { classroomId: { in: classIds } },
          { submissions: { some: { studentId: studentProfileId } } },
        ];
      }
    } else if (user?.role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    select: { classroomId: true },
                  },
                },
              },
            },
          },
        },
      });
      if (parent) {
        parentStudentIds = parent.studentLinks.map((l) => l.studentId);
        const classIds = parent.studentLinks.flatMap((l) =>
          l.student.enrollments.map((e) => e.classroomId),
        );
        whereClause.classroomId = { in: classIds };
        if (parentStudentIds.length === 1) {
          studentProfileId = parentStudentIds[0];
        }
      }
    }

    const includeClause: any = {
      classroom: true,
      lesson: true,
      teacher: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { submissions: true },
      },
    };

    if (studentProfileId) {
      includeClause.submissions = {
        where: { studentId: studentProfileId },
        include: {
          gradedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      };
    } else if (parentStudentIds.length > 0) {
      includeClause.submissions = {
        where: { studentId: { in: parentStudentIds } },
        include: {
          gradedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      };
    } else {
      // For teacher / admin: include submission status summary
      includeClause.submissions = {
        select: { id: true, status: true, score: true },
      };
    }

    const homeworks = await this.prisma.homework.findMany({
      where: whereClause,
      include: includeClause,
      orderBy: { createdAt: 'desc' },
    });

    const parsed = homeworks.map((hw) => this.parseHomeworkMeta(hw));

    // If student or parent, do not expose homework that is scheduled for future
    if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
      return parsed.filter((hw) => !hw.isScheduled);
    }

    return parsed;
  }

  /**
   * List homeworks for a classroom
   */
  async listClassHomeworks(tenantId: string, classroomId: string) {
    return this.prisma.homework.findMany({
      where: { tenantId, classroomId },
      include: {
        lesson: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get homework details with submission summary
   */
  async getHomeworkDetails(tenantId: string, homeworkId: string, user?: any) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
      include: {
        lesson: true,
        classroom: true,
        teacher: { include: { user: true } },
        submissions: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('تکلیف مورد نظر یافت نشد');
    }

    const parsed = this.parseHomeworkMeta(homework);
    if ((user?.role === 'STUDENT' || user?.role === 'PARENT') && parsed.isScheduled) {
      throw new NotFoundException('تکلیف مورد نظر یافت نشد یا هنوز منتشر نشده است');
    }

    return parsed;
  }

  /**
   * Delete a homework assignment
   */
  async deleteHomework(tenantId: string, homeworkId: string, user?: any) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
    });
    if (!homework) {
      throw new NotFoundException('تکلیف مورد نظر یافت نشد');
    }

    if (user?.role === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher || teacher.id !== homework.teacherId) {
        throw new ForbiddenException('شما فقط مجاز به حذف تکالیف مربوط به خودتان هستید');
      }
    }

    await this.prisma.homeworkSubmission.deleteMany({
      where: { homeworkId, tenantId },
    });

    return this.prisma.homework.delete({
      where: { id: homeworkId },
    });
  }

  /**
   * Get all submissions for a homework
   */
  async getHomeworkSubmissions(tenantId: string, homeworkId: string) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
    });
    if (!homework) {
      throw new NotFoundException('تکلیف یافت نشد');
    }

    return this.prisma.homeworkSubmission.findMany({
      where: { homeworkId, tenantId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Submit homework response by student
   */
  async submitHomework(
    tenantId: string,
    homeworkId: string,
    dto: SubmitHomeworkDto,
    user?: any,
  ) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId },
    });
    if (!homework) {
      throw new NotFoundException('تکلیف یافت نشد');
    }

    let studentId = dto.studentId;
    if (!studentId && user?.id) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId && user?.id) {
      const studentFallback = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id },
      });
      if (studentFallback) {
        studentId = studentFallback.id;
      }
    }

    if (!studentId) {
      throw new BadRequestException('پروفایل دانش‌آموزی برای این کاربر یافت نشد');
    }

    const now = new Date();
    const isLate = now > homework.dueDate;

    if (isLate && !homework.allowLateSubmissions) {
      throw new BadRequestException('مهلت تحویل این تکلیف به پایان رسیده و امکان ارسال با تاخیر فعال نیست');
    }

    const status = isLate ? 'LATE' : 'SUBMITTED';

    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId,
        },
      },
      update: {
        content: dto.content,
        attachmentUrls: dto.attachmentUrls || [],
        submittedAt: now,
        status,
      },
      create: {
        tenantId,
        homeworkId,
        studentId,
        content: dto.content,
        attachmentUrls: dto.attachmentUrls || [],
        submittedAt: now,
        status,
      },
      include: {
        student: { include: { user: true } },
      },
    });
  }

  /**
   * Grade a student submission
   */
  async gradeSubmission(
    tenantId: string,
    submissionId: string,
    gradedById: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, tenantId },
      include: { homework: true },
    });
    if (!submission) {
      throw new NotFoundException('پاسخ ارسالی یافت نشد');
    }

    if (dto.score > submission.homework.maxScore) {
      throw new BadRequestException(
        `نمره نمی‌تواند بیشتر از سقف نمره (${submission.homework.maxScore}) باشد`,
      );
    }

    const status = dto.resubmitRequired ? 'RESUBMIT_REQUIRED' : 'GRADED';

    const graded = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status,
        gradedAt: new Date(),
        gradedById,
      },
      include: {
        student: { include: { user: true } },
        homework: true,
      },
    });

    this.eventEmitter.emit('homework.graded', {
      tenantId,
      studentId: submission.studentId,
      homeworkTitle: submission.homework.title,
      score: dto.score,
    });

    return graded;
  }
}
