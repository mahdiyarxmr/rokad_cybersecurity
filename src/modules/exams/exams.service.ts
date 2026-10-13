import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateExamDto,
  AddExamQuestionDto,
  ImportFromBankDto,
  BulkAddExamQuestionsDto,
} from './dto/create-exam.dto';
import {
  SubmitExamAnswersDto,
  GradeExamParticipationDto,
} from './dto/participate-exam.dto';
import { Role } from '../../common/constants';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Exam
  async createExam(tenantId: string, dto: CreateExamDto, user?: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    let teacherId = dto.teacherId;

    if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher) {
        throw new ForbiddenException('پروفایل دبیر برای این کاربر یافت نشد');
      }
      teacherId = teacher.id;

      // Enforce: Teacher can only create exams for their assigned lessons
      const teachesLesson = await this.prisma.teacherLesson.findFirst({
        where: { teacherId: teacher.id, lessonId: dto.lessonId, tenantId },
      });
      const hasSchedule = await this.prisma.classSchedule.findFirst({
        where: { teacherId: teacher.id, lessonId: dto.lessonId, tenantId },
      });

      if (!teachesLesson && !hasSchedule) {
        throw new ForbiddenException(
          'شما فقط مجاز به تعریف آزمون برای دروس تخصیص‌یافته به خودتان هستید',
        );
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
      }
    }

    if (!teacherId) {
      const fallbackTeacher = await this.prisma.teacherProfile.findFirst({
        where: { tenantId },
      });
      if (!fallbackTeacher) {
        throw new NotFoundException('پروفایل معلم برای انتساب به آزمون یافت نشد');
      }
      teacherId = fallbackTeacher.id;
    }

    // Resolve academic year if not provided
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear =
        (await this.prisma.academicYear.findFirst({
          where: { tenantId, isCurrent: true },
        })) ||
        (await this.prisma.academicYear.findFirst({
          where: { tenantId },
          orderBy: { startDate: 'desc' },
        }));
      if (!currentYear) {
        throw new BadRequestException('هیچ سال تحصیلی فعالی تعریف نشده است');
      }
      academicYearId = currentYear.id;
    }

    const calculatedTotalScore =
      dto.questions && dto.questions.length > 0
        ? dto.questions.reduce((sum, q) => sum + (q.score || 1.0), 0)
        : 20;

    const targetClassroomIds = Array.from(
      new Set([
        ...(dto.classroomIds || []),
        ...(dto.classroomId ? [dto.classroomId] : []),
      ]),
    );

    return (this.prisma.exam.create as any)({
      data: {
        tenantId,
        academicYearId,
        termId: dto.termId,
        lessonId: dto.lessonId,
        teacherId,
        title: dto.title,
        description: dto.description,
        examType: dto.examType || dto.type || 'ONLINE',
        round: dto.round || 'CLASS_EXAM',
        durationMinutes: dto.durationMinutes,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        totalScore: dto.totalScore || calculatedTotalScore,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        shuffleOptions: dto.shuffleOptions ?? true,
        showResultsImmediately: dto.showResultsImmediately ?? false,
        status: 'SCHEDULED',
        isPublished: true,
        classrooms: {
          create: targetClassroomIds.map((cid) => ({
            tenantId,
            classroomId: cid,
          })),
        },
        questions: {
          create: (dto.questions || []).map((q, idx) => ({
            questionId: q.questionId,
            orderIndex: q.orderIndex || idx + 1,
            score: q.score,
          })),
        },
      },
      include: {
        classrooms: { include: { classroom: true } },
        questions: { include: { question: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  // 2. List Exams
  async listExams(
    tenantId: string,
    filters?: { classroomId?: string; lessonId?: string; teacherId?: string },
    user?: any,
  ) {
    const where: any = { tenantId };
    if (filters?.lessonId) where.lessonId = filters.lessonId;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.classroomId) {
      where.classrooms = { some: { classroomId: filters.classroomId } };
    }

    let studentId: string | null = null;
    if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        where.teacherId = teacher.id;
      }
    } else if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: { enrollments: true },
      });
      if (student) {
        studentId = student.id;
        const studentClassIds = student.enrollments.map((e) => e.classroomId);
        where.classrooms = { some: { classroomId: { in: studentClassIds } } };
      }
    }

    const exams = await this.prisma.exam.findMany({
      where,
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        classrooms: { include: { classroom: true } },
        _count: { select: { questions: true, participations: true } },
        questions: {
          select: {
            id: true,
            score: true,
            question: { select: { type: true } },
          },
        },
        participations: studentId
          ? {
              where: { studentId },
              select: {
                id: true,
                status: true,
                totalScore: true,
                graceScore: true,
                graceReason: true,
                isGraded: true,
                submittedAt: true,
                teacherFeedback: true,
              },
            }
          : false,
      },
      orderBy: { startTime: 'desc' },
    });

    if (user?.role === Role.STUDENT) {
      return exams.map((exam) => {
        const isPublished = exam.isResultsPublished || exam.showResultsImmediately;
        const mappedParticipations = (exam.participations || []).map((p: any) => {
          if (!isPublished) {
            return {
              id: p.id,
              status: p.status,
              submittedAt: p.submittedAt,
              totalScore: null,
              isGraded: false,
              isResultsPublished: false,
            };
          }
          return {
            ...p,
            isResultsPublished: true,
          };
        });

        return {
          ...exam,
          participations: mappedParticipations,
        };
      });
    }

    return exams;
  }

  // Add Question directly to Exam (Manual or by Question ID)
  async addQuestionToExam(
    tenantId: string,
    examId: string,
    dto: AddExamQuestionDto,
    user?: any,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: { teacher: true, questions: true },
    });
    if (!exam) {
      throw new NotFoundException('آزمون مورد نظر یافت نشد');
    }

    if (user?.role === Role.TEACHER && exam.teacher.userId !== user.id) {
      throw new ForbiddenException('شما مجاز به افزودن سوال به این آزمون نیستید');
    }

    let questionId = dto.questionId;

    if (!questionId) {
      if (!dto.text) {
        throw new BadRequestException('متن صورت سوال الزامی است');
      }

      const question = await this.prisma.question.create({
        data: {
          tenantId,
          lessonId: exam.lessonId,
          createdById: user?.id || exam.teacher.userId,
          type: (dto.type as any) || 'MULTIPLE_CHOICE',
          difficulty: 'MEDIUM',
          text: dto.text,
          solutionExplanation: dto.solutionExplanation,
          defaultScore: dto.score,
          options:
            dto.options && dto.options.length > 0
              ? {
                  create: dto.options.map((opt, idx) => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    orderIndex: idx + 1,
                  })),
                }
              : undefined,
        },
      });
      questionId = question.id;
    } else {
      const existingQ = await this.prisma.question.findFirst({
        where: { id: questionId, tenantId },
      });
      if (!existingQ) {
        throw new NotFoundException('سوال مورد نظر در بانک سوالات یافت نشد');
      }
    }

    const nextOrderIndex = exam.questions.length + 1;

    const examQuestion = await this.prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: questionId,
        orderIndex: nextOrderIndex,
        score: dto.score,
      },
      include: {
        question: {
          include: { options: true },
        },
      },
    });

    return examQuestion;
  }

  // Import Multiple Questions from Question Bank to Exam
  async importQuestionsFromBank(
    tenantId: string,
    examId: string,
    dto: ImportFromBankDto,
    user?: any,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: { teacher: true, questions: true },
    });
    if (!exam) {
      throw new NotFoundException('آزمون مورد نظر یافت نشد');
    }

    if (user?.role === Role.TEACHER && exam.teacher.userId !== user.id) {
      throw new ForbiddenException('شما مجاز به تغییر این آزمون نیستید');
    }

    if (!dto.questionIds || dto.questionIds.length === 0) {
      throw new BadRequestException('حداقل یک سوال باید برای ایمپورت انتخاب شود');
    }

    const bankQuestions = await this.prisma.question.findMany({
      where: {
        id: { in: dto.questionIds },
        tenantId,
      },
      include: { options: true },
    });

    if (bankQuestions.length === 0) {
      throw new BadRequestException('هیچ سوال معتبری در بانک سوالات یافت نشد');
    }

    const existingIds = new Set(exam.questions.map((q) => q.questionId));
    const toAdd = bankQuestions.filter((q) => !existingIds.has(q.id));

    if (toAdd.length === 0) {
      throw new BadRequestException('تمام سوالات انتخابی قبلاً به این آزمون افزوده شده‌اند');
    }

    let currentIndex = exam.questions.length;
    const addedExamQuestions: any[] = [];

    for (const q of toAdd) {
      currentIndex += 1;
      const eq = await this.prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: q.id,
          orderIndex: currentIndex,
          score: dto.defaultScore || q.defaultScore || 1.0,
        },
        include: {
          question: {
            include: { options: true },
          },
        },
      });
      addedExamQuestions.push(eq);
    }

    return {
      message: `${addedExamQuestions.length} سوال با موفقیت از بانک سوالات به آزمون افزوده شد`,
      importedCount: addedExamQuestions.length,
      questions: addedExamQuestions,
    };
  }

  // Bulk Add Questions (from Excel Parser or Batch Form)
  async bulkAddQuestionsToExam(
    tenantId: string,
    examId: string,
    dto: BulkAddExamQuestionsDto,
    user?: any,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: { teacher: true, questions: true },
    });
    if (!exam) {
      throw new NotFoundException('آزمون مورد نظر یافت نشد');
    }

    if (user?.role === Role.TEACHER && exam.teacher.userId !== user.id) {
      throw new ForbiddenException('شما مجاز به افزودن سوال به این آزمون نیستید');
    }

    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('لیست سوالات ارسالی خالی است');
    }

    let currentIndex = exam.questions.length;
    const addedExamQuestions: any[] = [];

    for (const qDto of dto.questions) {
      let qId = qDto.questionId;

      if (!qId) {
        if (!qDto.text) continue;

        const question = await this.prisma.question.create({
          data: {
            tenantId,
            lessonId: exam.lessonId,
            createdById: user?.id || exam.teacher.userId,
            type: (qDto.type as any) || 'MULTIPLE_CHOICE',
            difficulty: 'MEDIUM',
            text: qDto.text,
            solutionExplanation: qDto.solutionExplanation,
            defaultScore: qDto.score || 1.0,
            options:
              qDto.options && qDto.options.length > 0
                ? {
                    create: qDto.options.map((opt, idx) => ({
                      text: opt.text,
                      isCorrect: opt.isCorrect,
                      orderIndex: idx + 1,
                    })),
                  }
                : undefined,
          },
        });
        qId = question.id;
      }

      currentIndex += 1;
      const eq = await this.prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: qId,
          orderIndex: currentIndex,
          score: qDto.score || 1.0,
        },
        include: {
          question: {
            include: { options: true },
          },
        },
      });
      addedExamQuestions.push(eq);
    }

    return {
      message: `${addedExamQuestions.length} سوال با موفقیت به آزمون افزوده شد`,
      count: addedExamQuestions.length,
      questions: addedExamQuestions,
    };
  }

  // Get Exam Participations
  async getExamParticipations(tenantId: string, examId: string, user?: any) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: { teacher: true },
    });
    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    if (user?.role === Role.TEACHER && exam.teacher.userId !== user.id) {
      throw new ForbiddenException('شما فقط به نتایج آزمون‌های خود دسترسی دارید');
    }

    return this.prisma.examParticipation.findMany({
      where: { examId, tenantId },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                nationalId: true,
              },
            },
          },
        },
        answers: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  // 3. Start Online Exam (Student Paper Assembly with Deterministic Shuffle)
  async startExam(tenantId: string, examId: string, studentUserId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, tenantId },
      include: { enrollments: true },
    });
    if (!student) {
      throw new ForbiddenException('پروفایل دانش‌آموزی یافت نشد');
    }

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: {
        classrooms: true,
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    // Check if student belongs to one of the classrooms
    const studentClassIds = student.enrollments.map((e) => e.classroomId);
    const hasAccess = exam.classrooms.some((ec) =>
      studentClassIds.includes(ec.classroomId),
    );
    if (!hasAccess) {
      throw new ForbiddenException('شما مجاز به شرکت در این آزمون نیستید');
    }

    const now = new Date();
    if (now < exam.startTime) {
      throw new BadRequestException('زمان برگزاری آزمون هنوز فرا نرسیده است');
    }
    if (now > exam.endTime) {
      throw new BadRequestException('مهلت شرکت در آزمون به پایان رسیده است');
    }

    // Check existing participation
    let participation = await this.prisma.examParticipation.findUnique({
      where: { examId_studentId: { examId, studentId: student.id } },
      include: { answers: true },
    });

    if (participation) {
      if (participation.status === 'SUBMITTED' || participation.status === 'TIMED_OUT') {
        throw new ConflictException('شما قبلاً در این آزمون شرکت کرده و پاسخ‌های خود را ثبت کرده‌اید');
      }
    } else {
      // Calculate server deadline (Exam End Time or Started At + Duration + 1 min grace buffer)
      const allowedDurationMs = (exam.durationMinutes + 1) * 60 * 1000;
      const calculatedDeadlineMs = Math.min(
        exam.endTime.getTime(),
        now.getTime() + allowedDurationMs,
      );
      const serverDeadline = new Date(calculatedDeadlineMs);

      // Generate Deterministic Per-Student Shuffle Order
      let questionList = [...exam.questions];
      if (exam.shuffleQuestions) {
        questionList = this.shuffleArray(questionList);
      }
      const questionOrder = questionList.map((q) => q.questionId);

      const optionOrders: Record<string, string[]> = {};
      for (const eq of exam.questions) {
        if (eq.question.options && eq.question.options.length > 0) {
          let opts = [...eq.question.options];
          if (exam.shuffleOptions) {
            opts = this.shuffleArray(opts);
          }
          optionOrders[eq.questionId] = opts.map((o) => o.id);
        }
      }

      participation = await this.prisma.examParticipation.create({
        data: {
          tenantId,
          examId,
          studentId: student.id,
          startedAt: now,
          serverDeadline,
          status: 'IN_PROGRESS',
          questionOrder,
          optionOrders,
        },
        include: { answers: true },
      });
    }

    // Render questions to student strictly in their persisted order without solutions/correct flags!
    const orderedQuestions = participation.questionOrder.map((qid) => {
      const examQ = exam.questions.find((q) => q.questionId === qid);
      if (!examQ) return null;

      const savedOptionOrder = (participation?.optionOrders as any)?.[qid];
      let options = examQ.question.options;
      if (savedOptionOrder && Array.isArray(savedOptionOrder)) {
        options = savedOptionOrder
          .map((oid) => examQ.question.options.find((o) => o.id === oid))
          .filter(Boolean) as any;
      }

      return {
        questionId: examQ.question.id,
        score: examQ.score,
        type: examQ.question.type,
        difficulty: examQ.question.difficulty,
        text: examQ.question.text,
        formulaHtml: examQ.question.formulaHtml,
        imageUrls: examQ.question.imageUrls,
        suggestedTimeSeconds: examQ.question.suggestedTimeSeconds,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          formulaHtml: opt.formulaHtml,
          imageUrl: opt.imageUrl,
          orderIndex: opt.orderIndex,
        })),
      };
    }).filter(Boolean);

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalScore: exam.totalScore,
      },
      participation: {
        id: participation.id,
        startedAt: participation.startedAt,
        serverDeadline: participation.serverDeadline,
        status: participation.status,
      },
      questions: orderedQuestions,
    };
  }

  // 4. Submit Online Exam Answers (Server-Side Deadline Enforcement & Auto-Grading)
  async submitExamAnswers(
    tenantId: string,
    examId: string,
    studentUserId: string,
    dto: SubmitExamAnswersDto,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, tenantId },
    });
    if (!student) {
      throw new ForbiddenException('پروفایل دانش‌آموزی یافت نشد');
    }

    const participation = await this.prisma.examParticipation.findUnique({
      where: { examId_studentId: { examId, studentId: student.id } },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException('برگه آزمون برای شما ایجاد نشده است');
    }

    if (participation.status === 'SUBMITTED') {
      throw new ConflictException('پاسخ‌های شما قبلاً در سامانه ثبت شده است');
    }

    const now = new Date();

    // Strict Server-Side Time Enforcement
    if (now > participation.serverDeadline) {
      await this.prisma.examParticipation.update({
        where: { id: participation.id },
        data: { status: 'TIMED_OUT', submittedAt: now },
      });
      throw new BadRequestException('مهلت زمانی آزمون در سرور به پایان رسیده است');
    }

    const tabSwitchCount = dto.tabSwitchCount || 0;
    const flaggedForReview = tabSwitchCount >= 3;

    // Process & Auto-grade Multiple Choice Answers
    let autoGradedTotalScore = 0;
    let hasDescriptiveQuestions = false;

    const answerRecords: any[] = [];
    for (const ans of dto.answers) {
      const examQuestion = participation.exam.questions.find(
        (eq) => eq.questionId === ans.questionId,
      );
      if (!examQuestion) continue;

      let scoreAwarded: number | null = null;
      let isAutoGraded = false;

      if (
        examQuestion.question.type === 'MULTIPLE_CHOICE' ||
        examQuestion.question.type === 'TRUE_FALSE'
      ) {
        const correctOption = examQuestion.question.options.find(
          (o) => o.isCorrect,
        );
        if (correctOption && ans.selectedOptionId === correctOption.id) {
          scoreAwarded = examQuestion.score;
        } else {
          scoreAwarded = 0;
        }
        autoGradedTotalScore += scoreAwarded;
        isAutoGraded = true;
      } else {
        hasDescriptiveQuestions = true;
      }

      answerRecords.push({
        participationId: participation.id,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId || null,
        descriptiveAnswer: ans.descriptiveAnswer || ans.textAnswer || null,
        scoreAwarded,
        isAutoGraded,
      });
    }

    // Save answers and finalize submission in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const record of answerRecords) {
        await tx.examAnswer.upsert({
          where: {
            participationId_questionId: {
              participationId: record.participationId,
              questionId: record.questionId,
            },
          },
          update: record,
          create: record,
        });
      }

      await tx.examParticipation.update({
        where: { id: participation.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          tabSwitchCount,
          flaggedForReview,
          totalScore: hasDescriptiveQuestions ? null : autoGradedTotalScore,
          isGraded: !hasDescriptiveQuestions,
        },
      });
    });

    return {
      message: 'پاسخ‌های آزمون با موفقیت در سامانه ثبت و ارسال گردید و پس از بررسی دبیر کارنامه صادر خواهد شد',
      status: 'SUBMITTED',
      isGraded: !hasDescriptiveQuestions,
      autoGradedScore: !hasDescriptiveQuestions ? autoGradedTotalScore : null,
      totalScore: !hasDescriptiveQuestions ? autoGradedTotalScore : null,
      flaggedForReview,
    };
  }

  // 5. Get Detailed Exam Participation Sheet for Teacher Grading
  async getExamParticipationSheet(tenantId: string, participationId: string) {
    const participation = await this.prisma.examParticipation.findFirst({
      where: { id: participationId, tenantId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                nationalId: true,
              },
            },
          },
        },
        exam: {
          include: {
            lesson: true,
            questions: {
              include: {
                question: {
                  include: { options: { orderBy: { orderIndex: 'asc' } } },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: true,
      },
    });

    if (!participation) {
      throw new NotFoundException('برگه آزمون یافت نشد');
    }

    const answersMap = new Map(participation.answers.map((a) => [a.questionId, a]));

    const questionsReview = participation.exam.questions.map((eq) => {
      const studentAnswer = answersMap.get(eq.questionId);
      return {
        questionId: eq.questionId,
        orderIndex: eq.orderIndex,
        score: eq.score,
        type: eq.question.type,
        text: eq.question.text,
        options: eq.question.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        studentAnswer: studentAnswer
          ? {
              selectedOptionId: studentAnswer.selectedOptionId,
              descriptiveAnswer: studentAnswer.descriptiveAnswer,
              scoreAwarded: studentAnswer.scoreAwarded,
              isAutoGraded: studentAnswer.isAutoGraded,
              teacherComment: studentAnswer.teacherComment,
            }
          : null,
      };
    });

    return {
      participation: {
        id: participation.id,
        examId: participation.examId,
        studentId: participation.studentId,
        startedAt: participation.startedAt,
        submittedAt: participation.submittedAt,
        tabSwitchCount: participation.tabSwitchCount,
        flaggedForReview: participation.flaggedForReview,
        totalScore: participation.totalScore,
        graceScore: participation.graceScore || 0,
        graceReason: participation.graceReason,
        teacherFeedback: participation.teacherFeedback,
        isGraded: participation.isGraded,
        status: participation.status,
      },
      student: participation.student,
      exam: {
        id: participation.exam.id,
        title: participation.exam.title,
        totalScore: participation.exam.totalScore,
        lessonName: participation.exam.lesson?.name,
        isResultsPublished: participation.exam.isResultsPublished,
      },
      questions: questionsReview,
    };
  }

  // 6. Grade Descriptive Answers & Apply Grace Score (Teacher Grading)
  async gradeDescriptiveAnswers(
    tenantId: string,
    participationId: string,
    dto: GradeExamParticipationDto,
  ) {
    const participation = await this.prisma.examParticipation.findFirst({
      where: { id: participationId, tenantId },
      include: {
        answers: true,
        exam: { include: { questions: true } },
      },
    });

    if (!participation) {
      throw new NotFoundException('برگه مشارکت آزمون یافت نشد');
    }

    const graceScore = Number(dto.graceScore) || 0;
    const graceReason = dto.graceReason || null;

    await this.prisma.$transaction(async (tx) => {
      for (const g of (dto.grades || [])) {
        await tx.examAnswer.update({
          where: {
            participationId_questionId: {
              participationId,
              questionId: g.questionId,
            },
          },
          data: {
            scoreAwarded: Number(g.scoreAwarded) || 0,
            teacherComment: g.teacherComment || null,
          },
        });
      }

      // Re-aggregate total score
      const allAnswers = await tx.examAnswer.findMany({
        where: { participationId },
      });
      const rawScore = allAnswers.reduce(
        (sum, a) => sum + (a.scoreAwarded || 0),
        0,
      );

      // Total score = rawScore + graceScore, capped at exam.totalScore
      const totalScore = Math.min(
        participation.exam.totalScore,
        Math.round((rawScore + graceScore) * 100) / 100,
      );

      await tx.examParticipation.update({
        where: { id: participationId },
        data: {
          totalScore,
          graceScore,
          graceReason,
          isGraded: true,
          teacherFeedback: dto.teacherFeedback || null,
        },
      });
    });

    return {
      message: 'تصحیح و ثبت نمرات برگه با موفقیت انجام شد',
      participationId,
      graceScore,
      graceReason,
    };
  }

  // 7. Toggle Publish Exam Results (Teacher Controlled)
  async togglePublishResults(
    tenantId: string,
    examId: string,
    publish?: boolean,
    user?: any,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: { teacher: true },
    });

    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    if (user?.role === Role.TEACHER && exam.teacher.userId !== user.id) {
      throw new ForbiddenException('شما مجاز به تغییر وضعیت انتشار کارنامه این آزمون نیستید');
    }

    const nextState = publish !== undefined ? publish : !exam.isResultsPublished;

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        isResultsPublished: nextState,
        resultsPublishedAt: nextState ? new Date() : null,
      },
    });

    return {
      message: nextState
        ? 'کارنامه و نمرات آزمون با موفقیت برای کلیه دانش‌آموزان کلاس منتشر شد'
        : 'انتشار کارنامه لغو گردید و نمرات برای دانش‌آموزان پنهان شد',
      isResultsPublished: updated.isResultsPublished,
      resultsPublishedAt: updated.resultsPublishedAt,
    };
  }

  // 8. Get Exam Results & Summary Stats
  async getExamResults(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: {
        lesson: true,
        participations: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true, phone: true, nationalId: true } } } },
            answers: true,
          },
          orderBy: { totalScore: 'desc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('آزمون یافت نشد');
    }

    const totalStudents = exam.participations.length;
    const gradedCount = exam.participations.filter((p) => p.isGraded).length;
    const needsGradingCount = exam.participations.filter(
      (p) => (p.status === 'SUBMITTED' || p.status === 'TIMED_OUT') && !p.isGraded,
    ).length;
    const tabSwitchFlaggedCount = exam.participations.filter(
      (p) => p.tabSwitchCount > 0,
    ).length;

    const scores = exam.participations
      .filter((p) => p.isGraded && p.totalScore !== null)
      .map((p) => p.totalScore as number);

    const averageScore =
      scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        totalScore: exam.totalScore,
        lessonName: exam.lesson?.name,
        isResultsPublished: exam.isResultsPublished,
        resultsPublishedAt: exam.resultsPublishedAt,
      },
      stats: {
        totalStudents,
        gradedCount,
        needsGradingCount,
        tabSwitchFlaggedCount,
        averageScore,
        maxScore,
        minScore,
      },
      participations: exam.participations.map((p) => ({
        id: p.id,
        studentName: `${p.student.user.firstName} ${p.student.user.lastName}`,
        phone: p.student.user.phone,
        nationalId: p.student.user.nationalId,
        status: p.status,
        startedAt: p.startedAt,
        submittedAt: p.submittedAt,
        totalScore: p.totalScore,
        graceScore: p.graceScore || 0,
        graceReason: p.graceReason,
        teacherFeedback: p.teacherFeedback,
        isGraded: p.isGraded,
        tabSwitchCount: p.tabSwitchCount,
        flaggedForReview: p.flaggedForReview,
      })),
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
