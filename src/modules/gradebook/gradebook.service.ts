import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkRecordGradeDto } from './dto/record-grade.dto';
import { BulkRecordPodmanGradeDto } from './dto/record-podman-grade.dto';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Bulk Record Grades
  async recordBulkGrades(
    tenantId: string,
    recordedById: string,
    dto: BulkRecordGradeDto,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    const maxScore = dto.maxScore || 20;

    // Strict boundary validation for every score
    for (const item of dto.grades) {
      if (item.score < 0 || item.score > maxScore) {
        throw new BadRequestException(
          `نمره نامعتبر برای دانش‌آموز ${item.studentId}. نمره باید بین ۰ تا ${maxScore} باشد. نمره ارسالی: ${item.score}`,
        );
      }
    }

    const entryDate = dto.date ? new Date(dto.date) : new Date();
    const academicYearId = dto.academicYearId || classroom.academicYearId;

    let teacherId = dto.teacherId;
    if (!teacherId) {
      const teacherProf = await this.prisma.teacherProfile.findFirst({
        where: { userId: recordedById, tenantId },
      });
      if (teacherProf) {
        teacherId = teacherProf.id;
      } else {
        const schedule = await this.prisma.classSchedule.findFirst({
          where: { tenantId, classroomId: dto.classroomId, lessonId: dto.lessonId },
        });
        if (schedule?.teacherId) {
          teacherId = schedule.teacherId;
        } else {
          const lessonTeacher = await this.prisma.teacherLesson.findFirst({
            where: { tenantId, lessonId: dto.lessonId },
          });
          teacherId =
            lessonTeacher?.teacherId ||
            (await this.prisma.teacherProfile.findFirst({ where: { tenantId } }))?.id ||
            '';
        }
      }
    }

    const createdEntries = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.grades) {
        let resolvedStudentId = item.studentId;
        const profile = await tx.studentProfile.findUnique({
          where: { id: resolvedStudentId },
        });
        if (!profile) {
          const enrollment = await tx.classEnrollment.findUnique({
            where: { id: resolvedStudentId },
          });
          if (enrollment) {
            resolvedStudentId = enrollment.studentId;
          } else {
            const byUser = await tx.studentProfile.findFirst({
              where: { userId: resolvedStudentId, tenantId },
            });
            if (byUser) {
              resolvedStudentId = byUser.id;
            }
          }
        }

        const startOfDay = new Date(entryDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(entryDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await tx.gradeEntry.findFirst({
          where: {
            tenantId,
            classroomId: dto.classroomId,
            lessonId: dto.lessonId,
            studentId: resolvedStudentId,
            gradeType: dto.gradeType,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (existing) {
          const updated = await tx.gradeEntry.update({
            where: { id: existing.id },
            data: {
              score: item.score,
              maxScore,
              title: dto.title,
              description: item.description,
              weight: dto.weight || existing.weight || 1.0,
              recordedById,
            },
          });
          records.push(updated);
        } else {
          const record = await tx.gradeEntry.create({
            data: {
              tenantId,
              academicYearId,
              termId: dto.termId,
              classroomId: dto.classroomId,
              lessonId: dto.lessonId,
              studentId: resolvedStudentId,
              teacherId,
              examId: dto.examId,
              gradeType: dto.gradeType,
              title: dto.title,
              score: item.score,
              maxScore,
              weight: dto.weight || 1.0,
              date: entryDate,
              description: item.description,
              recordedById,
            },
          });
          records.push(record);
        }
      }
      return records;
    });

    return {
      message: `تعداد ${createdEntries.length} نمره با موفقیت در دفتر نمرات ثبت گردید`,
      count: createdEntries.length,
    };
  }

  // 2. Get Class Gradebook Matrix
  async getClassGradebook(
    tenantId: string,
    classroomId: string,
    lessonId?: string,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        enrollments: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('کلاس یافت نشد');
    }

    const where: any = { tenantId, classroomId };
    if (lessonId) where.lessonId = lessonId;

    const grades = await this.prisma.gradeEntry.findMany({
      where,
      include: {
        student: { include: { user: true } },
        lesson: true,
      },
      orderBy: { date: 'asc' },
    });

    // Calculate class statistics
    const scores = grades.map((g) => (g.score / g.maxScore) * 20);
    const averageNormalizedScore =
      scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        totalStudents: classroom.enrollments.length,
      },
      stats: {
        totalGradesRecorded: grades.length,
        averageScoreOutOf20: averageNormalizedScore,
      },
      grades: grades.map((g) => ({
        id: g.id,
        studentId: g.studentId,
        studentName: `${g.student.user.firstName} ${g.student.user.lastName}`,
        lessonName: g.lesson.name,
        gradeType: g.gradeType,
        title: g.title,
        score: g.score,
        maxScore: g.maxScore,
        weight: g.weight,
        date: g.date,
      })),
    };
  }

  // 3. Get Student Report Card with Weighted GPA
  async getStudentReportCard(
    tenantId: string,
    studentId: string,
    academicYearId?: string,
    requestingUser?: any,
  ) {
    let resolvedStudentId = studentId;
    let student: any = null;

    if (studentId === 'me' || requestingUser?.role === 'STUDENT') {
      student = await this.prisma.studentProfile.findFirst({
        where: { userId: requestingUser?.id || studentId, tenantId },
        include: { user: true },
      });
      if (student) resolvedStudentId = student.id;
    } else if (requestingUser?.role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: requestingUser.id, tenantId },
        include: { studentLinks: { include: { student: { include: { user: true } } } } },
      });
      if (parent && parent.studentLinks.length > 0) {
        student = parent.studentLinks[0].student;
        resolvedStudentId = student.id;
      }
    }

    if (!student) {
      student = await this.prisma.studentProfile.findFirst({
        where: { id: resolvedStudentId, tenantId },
        include: { user: true },
      });
      if (!student) {
        student = await this.prisma.studentProfile.findFirst({
          where: { userId: resolvedStudentId, tenantId },
          include: { user: true },
        });
        if (student) resolvedStudentId = student.id;
      }
    }

    if (!student) {
      throw new NotFoundException('دانش‌آموز یافت نشد');
    }

    const where: any = { tenantId, studentId: resolvedStudentId };
    if (academicYearId) where.academicYearId = academicYearId;

    const grades = await this.prisma.gradeEntry.findMany({
      where,
      include: {
        lesson: true,
        academicYear: true,
      },
      orderBy: { date: 'asc' },
    });

    const podmanGrades = await this.prisma.podmanGrade.findMany({
      where: {
        tenantId,
        studentId: resolvedStudentId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        lesson: true,
        podman: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group regular grades by lesson
    const lessonGradesMap: Record<
      string,
      {
        lesson: any;
        grades: any[];
        totalWeightedScore: number;
        totalWeight: number;
      }
    > = {};

    for (const g of grades) {
      if (!lessonGradesMap[g.lessonId]) {
        lessonGradesMap[g.lessonId] = {
          lesson: g.lesson,
          grades: [],
          totalWeightedScore: 0,
          totalWeight: 0,
        };
      }

      const normalizedScoreOutOf20 = (g.score / g.maxScore) * 20;
      lessonGradesMap[g.lessonId].grades.push(g);
      lessonGradesMap[g.lessonId].totalWeightedScore +=
        normalizedScoreOutOf20 * g.weight;
      lessonGradesMap[g.lessonId].totalWeight += g.weight;
    }

    // Group podman grades by lesson
    const podmanLessonsMap: Record<
      string,
      {
        lesson: any;
        podmanGrades: Record<number, any>;
      }
    > = {};

    for (const pg of podmanGrades) {
      if (!podmanLessonsMap[pg.lessonId]) {
        podmanLessonsMap[pg.lessonId] = {
          lesson: pg.lesson,
          podmanGrades: {},
        };
      }
      const existingPg = podmanLessonsMap[pg.lessonId].podmanGrades[pg.podman.number];
      if (!existingPg || pg.isPassed || (!existingPg.isPassed && pg.finalScore > existingPg.finalScore)) {
        podmanLessonsMap[pg.lessonId].podmanGrades[pg.podman.number] = pg;
      }
    }

    let totalWeightedPoints = 0;
    let totalUnits = 0;
    const lessonReports: any[] = [];

    // Process non-modular lessons (traditional assessment)
    for (const lessonId in lessonGradesMap) {
      // If this lesson is handled in podmanLessonsMap, skip regular handling
      if (podmanLessonsMap[lessonId] || lessonGradesMap[lessonId].lesson?.isModular) {
        continue;
      }

      const entry = lessonGradesMap[lessonId];
      const lessonAverage =
        entry.totalWeight > 0
          ? parseFloat((entry.totalWeightedScore / entry.totalWeight).toFixed(2))
          : 0;

      const unitCount = entry.lesson.unitCount || 1;
      totalWeightedPoints += lessonAverage * unitCount;
      totalUnits += unitCount;

      lessonReports.push({
        lessonId,
        lessonName: entry.lesson.name,
        lessonCode: entry.lesson.code,
        isModular: false,
        unitCount,
        lessonAverageOutOf20: lessonAverage,
        isPassed: lessonAverage >= 10,
        status: lessonAverage >= 10 ? 'PASSED' : 'FAILED',
        recordedAssessmentsCount: entry.grades.length,
      });
    }

    // Process modular lessons (strict 5-podman competency assessment)
    for (const lessonId in podmanLessonsMap) {
      const entry = podmanLessonsMap[lessonId];
      const podmanCount = entry.lesson.podmanCount || 5;
      let totalPodmanScore = 0;
      let passedCount = 0;
      const unpassedNumbers: number[] = [];
      const podmanDetails: any[] = [];

      for (let num = 1; num <= podmanCount; num++) {
        const pGrade = entry.podmanGrades[num];
        if (pGrade) {
          totalPodmanScore += pGrade.finalScore;
          if (pGrade.isPassed) {
            passedCount++;
          } else {
            unpassedNumbers.push(num);
          }
          podmanDetails.push({
            podmanNumber: num,
            title: pGrade.podman?.title || `پودمان ${num}`,
            continuousScore: pGrade.continuousScore,
            competencyScore: pGrade.competencyScore,
            finalScore: pGrade.finalScore,
            isPassed: pGrade.isPassed,
            attemptType: pGrade.attemptType,
          });
        } else {
          unpassedNumbers.push(num);
          podmanDetails.push({
            podmanNumber: num,
            title: `پودمان ${num}`,
            continuousScore: null,
            competencyScore: null,
            finalScore: null,
            isPassed: false,
            attemptType: null,
          });
        }
      }

      // Golden Rule: To pass a modular lesson, EVERY podman must have score >= 12
      const allPassed = passedCount === podmanCount;
      const lessonAverage = parseFloat((totalPodmanScore / podmanCount).toFixed(2));
      const unitCount = entry.lesson.unitCount || 1;

      // Only add to weighted GPA if completed / all passed
      if (allPassed) {
        totalWeightedPoints += lessonAverage * unitCount;
      }
      totalUnits += unitCount;

      lessonReports.push({
        lessonId,
        lessonName: entry.lesson.name,
        lessonCode: entry.lesson.code,
        isModular: true,
        podmanCount,
        unitCount,
        lessonAverageOutOf20: lessonAverage,
        isPassed: allPassed,
        status: allPassed ? 'PASSED' : 'INCOMPLETE_RETAKE_NEEDED',
        passedPodmanCount: passedCount,
        unpassedPodmanNumbers: unpassedNumbers,
        podmans: podmanDetails,
      });
    }

    const weightedGpa =
      totalUnits > 0
        ? parseFloat((totalWeightedPoints / totalUnits).toFixed(2))
        : 0;

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
      },
      transcript: {
        totalUnits,
        passedUnits: lessonReports
          .filter((l) => l.isPassed)
          .reduce((sum, l) => sum + l.unitCount, 0),
        weightedGpaOutOf20: weightedGpa,
        status: weightedGpa >= 12 ? 'PASS' : 'CONDITIONAL',
      },
      lessons: lessonReports,
    };
  }

  // 4. Bulk Record Podman Grades
  async recordBulkPodmanGrades(
    tenantId: string,
    recordedById: string,
    dto: BulkRecordPodmanGradeDto,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
      include: { podmans: true },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    // Find or create Podman record for this lesson & number
    let podman = lesson.podmans.find((p) => p.number === dto.podmanNumber);
    if (!podman) {
      podman = await this.prisma.podman.create({
        data: {
          tenantId,
          lessonId: dto.lessonId,
          number: dto.podmanNumber,
          title: `پودمان ${dto.podmanNumber}`,
        },
      });
    }

    // Validate grades
    for (const item of dto.grades) {
      if (item.continuousScore < 0 || item.continuousScore > 5) {
        throw new BadRequestException(
          `نمره مستمر نامعتبر برای دانش‌آموز ${item.studentId}. نمره مستمر باید بین ۰ تا ۵ باشد. مقدار ارسالی: ${item.continuousScore}`,
        );
      }
      if (![1, 2, 3].includes(item.competencyScore)) {
        throw new BadRequestException(
          `سطح شایستگی نامعتبر برای دانش‌آموز ${item.studentId}. سطح شایستگی باید ۱، ۲ یا ۳ باشد. مقدار ارسالی: ${item.competencyScore}`,
        );
      }
    }

    const entryDate = dto.date ? new Date(dto.date) : new Date();
    const academicYearId = dto.academicYearId || classroom.academicYearId;
    const attemptType = dto.attemptType || 'REGULAR';

    let teacherId = dto.teacherId;
    if (!teacherId) {
      const teacherProf = await this.prisma.teacherProfile.findFirst({
        where: { userId: recordedById, tenantId },
      });
      if (teacherProf) {
        teacherId = teacherProf.id;
      } else {
        const schedule = await this.prisma.classSchedule.findFirst({
          where: { tenantId, classroomId: dto.classroomId, lessonId: dto.lessonId },
        });
        if (schedule?.teacherId) {
          teacherId = schedule.teacherId;
        } else {
          const lessonTeacher = await this.prisma.teacherLesson.findFirst({
            where: { tenantId, lessonId: dto.lessonId },
          });
          teacherId =
            lessonTeacher?.teacherId ||
            (await this.prisma.teacherProfile.findFirst({ where: { tenantId } }))?.id ||
            '';
        }
      }
    }

    const savedRecords = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const item of dto.grades) {
        let resolvedStudentId = item.studentId;
        const profile = await tx.studentProfile.findUnique({
          where: { id: resolvedStudentId },
        });
        if (!profile) {
          const enrollment = await tx.classEnrollment.findUnique({
            where: { id: resolvedStudentId },
          });
          if (enrollment) {
            resolvedStudentId = enrollment.studentId;
          } else {
            const byUser = await tx.studentProfile.findFirst({
              where: { userId: resolvedStudentId, tenantId },
            });
            if (byUser) {
              resolvedStudentId = byUser.id;
            }
          }
        }

        const continuous = Number(item.continuousScore);
        const competency = Number(item.competencyScore);
        // Formula: continuous (0-5) + competency (1-3) * 5 = total out of 20
        const finalScore = parseFloat((continuous + competency * 5).toFixed(2));
        // Passing threshold: 12
        const isPassed = finalScore >= 12;

        const existing = await tx.podmanGrade.findFirst({
          where: {
            tenantId,
            podmanId: podman!.id,
            studentId: resolvedStudentId,
            attemptType,
          },
        });

        if (existing) {
          const updated = await tx.podmanGrade.update({
            where: { id: existing.id },
            data: {
              continuousScore: continuous,
              competencyScore: competency,
              finalScore,
              isPassed,
              date: entryDate,
              notes: item.notes,
              recordedById,
            },
          });
          records.push(updated);
        } else {
          const created = await tx.podmanGrade.create({
            data: {
              tenantId,
              academicYearId,
              classroomId: dto.classroomId,
              lessonId: dto.lessonId,
              podmanId: podman!.id,
              studentId: resolvedStudentId,
              teacherId,
              continuousScore: continuous,
              competencyScore: competency,
              finalScore,
              isPassed,
              attemptType,
              date: entryDate,
              notes: item.notes,
              recordedById,
            },
          });
          records.push(created);
        }
      }
      return records;
    });

    return {
      message: `تعداد ${savedRecords.length} نمره پودمان ${dto.podmanNumber} با موفقیت در دفتر ارزشیابی ثبت گردید`,
      count: savedRecords.length,
      podmanNumber: dto.podmanNumber,
    };
  }

  // 5. Get Classroom Podman Matrix
  async getClassPodmanMatrix(
    tenantId: string,
    classroomId: string,
    lessonId: string,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        enrollments: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, tenantId },
      include: {
        podmans: {
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('درس یافت نشد');
    }

    // Ensure podmans exist if modular
    if (lesson.isModular && lesson.podmans.length === 0) {
      const podmansToCreate: Array<{
        tenantId: string;
        lessonId: string;
        number: number;
        title: string;
      }> = [];
      for (let i = 1; i <= (lesson.podmanCount || 5); i++) {
        podmansToCreate.push({
          tenantId,
          lessonId,
          number: i,
          title: `پودمان ${i}`,
        });
      }
      await this.prisma.podman.createMany({ data: podmansToCreate });
      lesson.podmans = await this.prisma.podman.findMany({
        where: { tenantId, lessonId },
        orderBy: { number: 'asc' },
      });
    }

    // Fetch all podman grades in this classroom and lesson
    const grades = await this.prisma.podmanGrade.findMany({
      where: {
        tenantId,
        classroomId,
        lessonId,
      },
      include: {
        podman: true,
        student: { include: { user: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Map by studentId -> podmanNumber -> grade
    const studentGradesMap: Record<string, Record<number, any>> = {};
    for (const g of grades) {
      if (!studentGradesMap[g.studentId]) {
        studentGradesMap[g.studentId] = {};
      }
      const current = studentGradesMap[g.studentId][g.podman.number];
      if (!current || g.isPassed || (!current.isPassed && g.finalScore > current.finalScore)) {
        studentGradesMap[g.studentId][g.podman.number] = {
          id: g.id,
          continuousScore: g.continuousScore,
          competencyScore: g.competencyScore,
          finalScore: g.finalScore,
          isPassed: g.isPassed,
          attemptType: g.attemptType,
          date: g.date,
          notes: g.notes,
        };
      }
    }

    const totalPodmans = lesson.podmanCount || 5;

    const studentsResult = classroom.enrollments.map((enr) => {
      const st = enr.student;
      const podmanGradesObj = studentGradesMap[st.id] || {};
      let allPassed = true;
      let completedCount = 0;
      let totalScore = 0;
      const unpassedPodmans: number[] = [];

      for (let num = 1; num <= totalPodmans; num++) {
        const pg = podmanGradesObj[num];
        if (pg) {
          totalScore += pg.finalScore;
          completedCount++;
          if (!pg.isPassed) {
            allPassed = false;
            unpassedPodmans.push(num);
          }
        } else {
          allPassed = false;
          unpassedPodmans.push(num);
        }
      }

      const averageScore =
        completedCount === totalPodmans && allPassed
          ? parseFloat((totalScore / totalPodmans).toFixed(2))
          : completedCount > 0
          ? parseFloat((totalScore / completedCount).toFixed(2))
          : 0;

      return {
        studentId: st.id,
        studentName: `${st.user.firstName} ${st.user.lastName}`,
        nationalCode: st.nationalCode,
        studentCode: st.studentCode,
        podmanGrades: podmanGradesObj,
        completedPodmanCount: completedCount,
        allPodmansPassed: allPassed && completedCount === totalPodmans,
        unpassedPodmanNumbers: unpassedPodmans,
        lessonAverageOutOf20: averageScore,
        status:
          allPassed && completedCount === totalPodmans
            ? 'PASSED'
            : unpassedPodmans.length > 0
            ? 'RETAKE_NEEDED'
            : 'IN_PROGRESS',
      };
    });

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        totalStudents: classroom.enrollments.length,
      },
      lesson: {
        id: lesson.id,
        name: lesson.name,
        code: lesson.code,
        isModular: lesson.isModular,
        podmanCount: totalPodmans,
        podmans: lesson.podmans,
      },
      students: studentsResult,
    };
  }

  /**
   * پرونده ۳۶۰ درجه عملکرد تحصیلی، انضباطی، تکالیف و حضور و غیاب دانش‌آموز در یک درس مشخص
   */
  async getStudentSubjectDossier(
    tenantId: string,
    studentId: string,
    classroomId: string,
    lessonId?: string,
  ) {
    let resolvedStudentId = studentId;
    let student = await this.prisma.studentProfile.findFirst({
      where: { id: resolvedStudentId, tenantId },
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
    });

    if (!student) {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: { id: studentId, tenantId },
      });
      if (enrollment) {
        resolvedStudentId = enrollment.studentId;
        student = await this.prisma.studentProfile.findFirst({
          where: { id: resolvedStudentId, tenantId },
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
        });
      } else {
        const byUser = await this.prisma.studentProfile.findFirst({
          where: { userId: studentId, tenantId },
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
        });
        if (byUser) {
          student = byUser;
          resolvedStudentId = byUser.id;
        }
      }
    }

    if (!student) {
      throw new NotFoundException('دانش‌آموز یافت نشد');
    }

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: { level: true, field: true },
    });

    let lesson: any = null;
    if (lessonId && lessonId !== 'undefined' && lessonId !== 'null') {
      lesson = await this.prisma.lesson.findFirst({
        where: { id: lessonId, tenantId },
        include: { podmans: { orderBy: { number: 'asc' } } },
      });
    }

    // 1. Attendance & Oral Question Sessions
    const attendanceWhere: any = {
      tenantId,
      studentId: resolvedStudentId,
      classroomId,
    };
    if (lessonId && lessonId !== 'undefined' && lessonId !== 'null') {
      attendanceWhere.OR = [{ lessonId }, { lessonId: null }];
    }

    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: attendanceWhere,
      orderBy: [{ date: 'desc' }, { periodNumber: 'desc' }],
    });

    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const tardyCount = attendanceRecords.filter((r) => r.status === 'TARDY').length;
    const excusedCount = attendanceRecords.filter((r) => r.status === 'EXCUSED_ABSENT').length;
    const attendanceRate =
      totalSessions > 0
        ? Math.round(((presentCount + tardyCount * 0.5) / totalSessions) * 100)
        : 100;

    // Oral Grades
    const oralGrades = attendanceRecords
      .map((r) => r.oralGrade)
      .filter((g): g is number => typeof g === 'number' && !isNaN(g));
    const oralAverage =
      oralGrades.length > 0
        ? Number((oralGrades.reduce((a, b) => a + b, 0) / oralGrades.length).toFixed(2))
        : null;

    // Disciplinary & Reward Events from Sessions
    const sessionPositiveRewardsCount = attendanceRecords.filter(
      (r) => r.rewardDisciplineType === 'POSITIVE' || r.rewardDisciplineType === 'EXCELLENT',
    ).length;
    const sessionNegativeDisciplineCount = attendanceRecords.filter(
      (r) =>
        r.rewardDisciplineType === 'NEGATIVE' ||
        r.rewardDisciplineType === 'WARNING' ||
        r.rewardDisciplineType === 'HOMEWORK_INCOMPLETE',
    ).length;

    // Disciplinary & Commendation Matters from the Matters Module
    const studentMatters = await this.prisma.disciplinaryMatter.findMany({
      where: {
        tenantId,
        studentId: resolvedStudentId,
      },
      include: {
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
    });

    const matterPositiveCount = studentMatters.filter((m) => m.type === 'POSITIVE').length;
    const matterNegativeCount = studentMatters.filter(
      (m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION',
    ).length;

    const positiveRewardsCount = sessionPositiveRewardsCount + matterPositiveCount;
    const negativeDisciplineCount = sessionNegativeDisciplineCount + matterNegativeCount;

    // 2. Homework Stats
    const homeworkWhere: any = {
      tenantId,
      classroomId,
    };
    if (lessonId && lessonId !== 'undefined' && lessonId !== 'null') {
      homeworkWhere.lessonId = lessonId;
    }

    const homeworkList = await this.prisma.homework.findMany({
      where: homeworkWhere,
      include: {
        submissions: {
          where: { studentId },
        },
      },
      orderBy: { dueDate: 'desc' },
      take: 20,
    });

    const totalHomeworks = homeworkList.length;
    const submittedHomeworks = homeworkList.filter(
      (h) => h.submissions.length > 0 && h.submissions[0].status !== 'PENDING',
    ).length;
    const gradedHomeworks = homeworkList.filter(
      (h) => h.submissions.length > 0 && h.submissions[0].score !== null,
    );
    const homeworkScores = gradedHomeworks.map((h) => {
      const sub = h.submissions[0];
      const max = h.maxScore || 20;
      return (Number(sub.score) / max) * 20;
    });
    const homeworkAverage =
      homeworkScores.length > 0
        ? Number((homeworkScores.reduce((a, b) => a + b, 0) / homeworkScores.length).toFixed(2))
        : null;

    // 3. Official Grades (GradeEntry)
    const gradeEntries = await this.prisma.gradeEntry.findMany({
      where: {
        tenantId,
        studentId,
        classroomId,
        ...(lessonId && lessonId !== 'undefined' && lessonId !== 'null' ? { lessonId } : {}),
      },
      orderBy: { date: 'desc' },
    });

    // 4. Podman Grades (if vocational)
    const podmanGrades = await this.prisma.podmanGrade.findMany({
      where: {
        tenantId,
        studentId,
        classroomId,
        ...(lessonId && lessonId !== 'undefined' && lessonId !== 'null' ? { lessonId } : {}),
      },
      include: { podman: true },
      orderBy: { podman: { number: 'asc' } },
    });

    // 5. Overall Holistic Performance Score Calculation (out of 20)
    let scoreSum = 0;
    let weightSum = 0;

    // Attendance weight: 15%
    if (totalSessions > 0) {
      scoreSum += (attendanceRate / 100) * 20 * 0.15;
      weightSum += 0.15;
    }

    // Oral questions weight: 25%
    if (oralAverage !== null) {
      scoreSum += oralAverage * 0.25;
      weightSum += 0.25;
    }

    // Homework weight: 20%
    if (homeworkAverage !== null) {
      scoreSum += homeworkAverage * 0.2;
      weightSum += 0.2;
    }

    // Exam / Formal Grades weight: 40%
    if (gradeEntries.length > 0) {
      const examAvg =
        gradeEntries.reduce((a, b) => a + b.score, 0) / gradeEntries.length;
      scoreSum += examAvg * 0.4;
      weightSum += 0.4;
    } else if (podmanGrades.length > 0) {
      const podAvg =
        podmanGrades.reduce((a, b) => a + b.finalScore, 0) / podmanGrades.length;
      scoreSum += podAvg * 0.4;
      weightSum += 0.4;
    }

    const overallScore =
      weightSum > 0 ? Number((scoreSum / weightSum).toFixed(2)) : null;

    return {
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        name: `${student.user.firstName} ${student.user.lastName}`,
        nationalCode: student.nationalCode,
        studentCode: student.studentCode,
        avatarUrl: student.user.avatarUrl,
        phone: student.user.phone,
      },
      classroom: classroom
        ? {
            id: classroom.id,
            name: classroom.name,
            level: classroom.level?.name,
            field: classroom.field?.name,
          }
        : null,
      lesson: lesson
        ? {
            id: lesson.id,
            name: lesson.name,
            code: lesson.code,
            isModular: lesson.isModular,
            podmanCount: lesson.podmanCount,
            podmans: lesson.podmans,
          }
        : null,
      kpis: {
        attendanceRate,
        totalSessions,
        presentCount,
        absentCount,
        tardyCount,
        excusedCount,
        oralAverage,
        oralGradesCount: oralGrades.length,
        positiveRewardsCount,
        negativeDisciplineCount,
        sessionPositiveRewardsCount,
        sessionNegativeDisciplineCount,
        matterPositiveCount,
        matterNegativeCount,
        mattersTotalPoints: studentMatters.reduce((acc, m) => acc + (m.points || 0), 0),
        totalHomeworks,
        submittedHomeworks,
        homeworkAverage,
        overallScore,
      },
      sessions: attendanceRecords.map((r) => ({
        id: r.id,
        date: r.date,
        periodNumber: r.periodNumber,
        status: r.status,
        delayMinutes: r.delayMinutes,
        reason: r.reason,
        oralGrade: r.oralGrade,
        rewardDisciplineType: r.rewardDisciplineType,
        rewardDisciplineNote: r.rewardDisciplineNote,
        sessionNote: r.sessionNote,
      })),
      homeworks: homeworkList.map((h) => {
        const sub = h.submissions[0];
        return {
          id: h.id,
          title: h.title,
          dueDate: h.dueDate,
          maxScore: h.maxScore,
          isSubmitted: !!sub && sub.status !== 'PENDING',
          submissionStatus: sub?.status || 'PENDING',
          score: sub?.score ?? null,
          feedback: sub?.feedback ?? null,
          submittedAt: sub?.submittedAt ?? null,
        };
      }),
      gradeEntries: gradeEntries.map((g) => ({
        id: g.id,
        title: g.title,
        gradeType: g.gradeType,
        score: g.score,
        maxScore: g.maxScore,
        date: g.date,
      })),
      podmanGrades: podmanGrades.map((p) => ({
        id: p.id,
        podmanNumber: p.podman.number,
        podmanTitle: p.podman.title,
        continuousScore: p.continuousScore,
        competencyScore: p.competencyScore,
        isPassed: p.isPassed,
      })),
      matters: studentMatters.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        points: m.points,
        actionTaken: m.actionTaken,
        notifiedParents: m.notifiedParents,
        reportedAt: m.reportedAt,
        reportedBy: m.reportedBy
          ? `${m.reportedBy.firstName || ''} ${m.reportedBy.lastName || ''}`.trim()
          : null,
      })),
    };
  }
}

