import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/constants';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateClassroomDto,
  UpdateClassroomDto,
  EnrollStudentDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto/create-lesson.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Lessons
  async listLessons(
    tenantId: string,
    levelId?: string,
    fieldId?: string,
    user?: any,
    teacherId?: string,
  ) {
    const where: any = {
      tenantId,
      ...(levelId ? { levelId } : {}),
      ...(fieldId ? { fieldId } : {}),
    };

    let effectiveTeacherId = teacherId;
    if (!effectiveTeacherId && user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        effectiveTeacherId = teacher.id;
      }
    }

    if (effectiveTeacherId) {
      where.OR = [
        { teacherLessons: { some: { teacherId: effectiveTeacherId } } },
        { schedules: { some: { teacherId: effectiveTeacherId } } },
      ];
    }

    return this.prisma.lesson.findMany({
      where,
      include: {
        level: true,
        field: true,
        podmans: {
          orderBy: { number: 'asc' },
        },
        teacherLessons: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        _count: {
          select: {
            lessonPlans: true,
            podmans: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createLesson(tenantId: string, dto: CreateLessonDto) {
    let levelId =
      dto.levelId && typeof dto.levelId === 'string' && dto.levelId.trim() !== ''
        ? dto.levelId.trim()
        : undefined;

    if (!levelId) {
      const defaultLevel = await this.prisma.educationalLevel.findFirst({
        where: { tenantId },
        orderBy: { orderIndex: 'asc' },
      });
      if (defaultLevel) {
        levelId = defaultLevel.id;
      } else {
        const createdLevel = await this.prisma.educationalLevel.create({
          data: {
            tenantId,
            name: 'پایه دهم',
            code: 'LVL-DEFAULT',
            orderIndex: 1,
          },
        });
        levelId = createdLevel.id;
      }
    }

    const existing = await this.prisma.lesson.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`درسی با کد '${dto.code}' قبلاً در این مدرسه ثبت شده است`);
    }

    const sanitizedFieldId =
      dto.fieldId && typeof dto.fieldId === 'string' && dto.fieldId.trim() !== ''
        ? dto.fieldId.trim()
        : undefined;

    const unitCount =
      dto.unitCount !== undefined && dto.unitCount !== null
        ? Number(dto.unitCount)
        : (dto as any).units
        ? Number((dto as any).units)
        : 1;

    const isModularLessonType = [
      'NON_TECHNICAL_COMPETENCY',
      'BASIC_COMPETENCY',
      'TECHNICAL_MODULAR_COMPETENCY',
    ].includes(dto.type as string);

    const isModular = dto.isModular !== undefined ? Boolean(dto.isModular) : isModularLessonType;
    const podmanCount = isModular ? Math.max(1, dto.podmanCount || 5) : 5;

    return this.prisma.$transaction(
      async (tx) => {
        const lesson = await tx.lesson.create({
          data: {
            tenantId,
            levelId: levelId!,
            fieldId: sanitizedFieldId,
            name: dto.name,
            code: dto.code,
            unitCount: unitCount > 0 ? unitCount : 1,
            type: (dto.type as any) || 'GENERAL',
            description: dto.description,
            isModular,
            podmanCount,
          },
        });

        if (isModular) {
          const podmanCreates: Array<{
            tenantId: string;
            lessonId: string;
            number: number;
            title: string;
          }> = [];
          for (let i = 1; i <= podmanCount; i++) {
            const customTitle = dto.podmanTitles && dto.podmanTitles[i - 1]?.trim();
            podmanCreates.push({
              tenantId,
              lessonId: lesson.id,
              number: i,
              title: customTitle || `پودمان ${i}`,
            });
          }
          await tx.podman.createMany({
            data: podmanCreates,
          });
        }

        if (dto.teacherIds && Array.isArray(dto.teacherIds) && dto.teacherIds.length > 0) {
          await tx.teacherLesson.createMany({
            data: dto.teacherIds.map((teacherId) => ({
              tenantId,
              lessonId: lesson.id,
              teacherId,
            })),
          });
        }

        return tx.lesson.findUnique({
          where: { id: lesson.id },
          include: {
            level: true,
            field: true,
            podmans: { orderBy: { number: 'asc' } },
            teacherLessons: {
              include: {
                teacher: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            _count: {
              select: {
                lessonPlans: true,
                podmans: true,
              },
            },
          },
        });
      },
      {
        timeout: 15000,
        maxWait: 5000,
      },
    );
  }

  async updateLesson(tenantId: string, id: string, dto: UpdateLessonDto) {
    const existing = await this.prisma.lesson.findFirst({
      where: { id, tenantId },
      include: { podmans: true, teacherLessons: true },
    });
    if (!existing) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.prisma.lesson.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException(`درسی با کد '${dto.code}' قبلاً در این مدرسه ثبت شده است`);
      }
    }

    const sanitizedFieldId =
      dto.fieldId !== undefined
        ? dto.fieldId && dto.fieldId.trim() !== ''
          ? dto.fieldId.trim()
          : null
        : undefined;

    const unitCount =
      dto.unitCount !== undefined && dto.unitCount !== null
        ? Number(dto.unitCount)
        : (dto as any).units !== undefined
        ? Number((dto as any).units)
        : undefined;

    const isModular =
      dto.isModular !== undefined
        ? Boolean(dto.isModular)
        : dto.type !== undefined
        ? ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(
            dto.type as string,
          )
        : existing.isModular;

    const podmanCount =
      dto.podmanCount !== undefined
        ? Math.max(1, Number(dto.podmanCount) || 5)
        : existing.podmanCount;

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Update basic lesson properties
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.code !== undefined) updateData.code = dto.code;
        if (dto.levelId !== undefined && dto.levelId.trim() !== '') updateData.levelId = dto.levelId;
        if (sanitizedFieldId !== undefined) updateData.fieldId = sanitizedFieldId;
        if (unitCount !== undefined) updateData.unitCount = unitCount > 0 ? unitCount : 1;
        if (dto.type !== undefined) updateData.type = dto.type;
        if (dto.description !== undefined) updateData.description = dto.description;
        updateData.isModular = isModular;
        updateData.podmanCount = isModular ? podmanCount : 5;

        await tx.lesson.update({
          where: { id },
          data: updateData,
        });

        // 2. Update teachers if teacherIds is provided
        if (dto.teacherIds !== undefined && Array.isArray(dto.teacherIds)) {
          await tx.teacherLesson.deleteMany({
            where: { lessonId: id, tenantId },
          });

          if (dto.teacherIds.length > 0) {
            await tx.teacherLesson.createMany({
              data: dto.teacherIds.map((teacherId) => ({
                tenantId,
                lessonId: id,
                teacherId,
              })),
            });
          }
        }

        // 3. Update or sync podmans
        if (isModular) {
          const currentPodmans = await tx.podman.findMany({
            where: { lessonId: id, tenantId },
            orderBy: { number: 'asc' },
          });

          const targetCount = podmanCount;
          for (let i = 1; i <= targetCount; i++) {
            const customTitle =
              dto.podmanTitles && dto.podmanTitles[i - 1]?.trim()
                ? dto.podmanTitles[i - 1]?.trim()
                : undefined;
            const existingPodman = currentPodmans.find((p) => p.number === i);

            if (existingPodman) {
              if (customTitle) {
                await tx.podman.update({
                  where: { id: existingPodman.id },
                  data: { title: customTitle },
                });
              }
            } else {
              await tx.podman.create({
                data: {
                  tenantId,
                  lessonId: id,
                  number: i,
                  title: customTitle || `پودمان ${i}`,
                },
              });
            }
          }

          if (currentPodmans.length > targetCount) {
            const extraIds = currentPodmans.slice(targetCount).map((p) => p.id);
            await tx.podman.deleteMany({
              where: { id: { in: extraIds } },
            });
          }
        }

        return tx.lesson.findUnique({
          where: { id },
          include: {
            level: true,
            field: true,
            podmans: { orderBy: { number: 'asc' } },
            teacherLessons: {
              include: {
                teacher: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            _count: {
              select: {
                lessonPlans: true,
                podmans: true,
              },
            },
          },
        });
      },
      {
        timeout: 15000,
        maxWait: 5000,
      },
    );
  }

  async deleteLesson(tenantId: string, id: string) {
    const existing = await this.prisma.lesson.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    return this.prisma.lesson.delete({
      where: { id },
    });
  }

  // 2. Classrooms
  async listClassrooms(tenantId: string, academicYearId?: string, user?: any) {
    const whereClause: any = { tenantId };
    if (academicYearId) {
      whereClause.academicYearId = academicYearId;
    }

    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });
      const classIds = student?.enrollments.map((e) => e.classroomId) || [];
      whereClause.id = { in: classIds };
    } else if (user?.role === Role.PARENT) {
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
      const classIds =
        parent?.studentLinks.flatMap((link) => link.student.enrollments.map((e) => e.classroomId)) || [];
      whereClause.id = { in: classIds };
    } else if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        const teacherClassroomsCount = await this.prisma.classroom.count({
          where: {
            tenantId,
            OR: [
              { schedules: { some: { teacherId: teacher.id } } },
              { mentorId: user.id },
            ],
          },
        });
        if (teacherClassroomsCount > 0) {
          whereClause.OR = [
            { schedules: { some: { teacherId: teacher.id } } },
            { mentorId: user.id },
          ];
        }
      }
    }

    return this.prisma.classroom.findMany({
      where: whereClause,
      include: {
        level: true,
        field: true,
        academicYear: true,
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            schedules: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createClassroom(tenantId: string, dto: CreateClassroomDto) {
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear =
        (await this.prisma.academicYear.findFirst({
          where: { tenantId, isCurrent: true },
        })) ||
        (await this.prisma.academicYear.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        }));
      if (!currentYear) {
        throw new BadRequestException('ابتدا باید حداقل یک سال تحصیلی در مدرسه تعریف شود');
      }
      academicYearId = currentYear.id;
    }

    let levelId = dto.levelId;
    if (!levelId) {
      const defaultLevel = await this.prisma.educationalLevel.findFirst({
        where: { tenantId },
        orderBy: { orderIndex: 'asc' },
      });
      if (defaultLevel) {
        levelId = defaultLevel.id;
      } else {
        const createdLevel = await this.prisma.educationalLevel.create({
          data: {
            tenantId,
            name: 'پایه عمومی',
            code: 'LVL-DEFAULT',
            orderIndex: 1,
          },
        });
        levelId = createdLevel.id;
      }
    }

    const existing = await this.prisma.classroom.findFirst({
      where: {
        tenantId,
        academicYearId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException('کلاسی با این نام یا کد در این سال تحصیلی قبلاً ثبت شده است');
    }

    let fieldId = dto.fieldId && dto.fieldId.trim() !== '' ? dto.fieldId : undefined;
    if (!fieldId) {
      const defaultField = await this.prisma.studyField.findFirst({
        where: { tenantId, levelId },
      });
      if (defaultField) {
        fieldId = defaultField.id;
      }
    }

    return this.prisma.classroom.create({
      data: {
        tenantId,
        academicYearId: academicYearId!,
        levelId: levelId!,
        fieldId,
        mentorId: dto.mentorId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity || 30,
        roomNumber: dto.roomNumber,
      },
      include: {
        level: true,
        field: true,
      },
    });
  }

  async updateClassroom(tenantId: string, classroomId: string, dto: UpdateClassroomDto) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    if ((dto.name && dto.name !== classroom.name) || (dto.code && dto.code !== classroom.code)) {
      const targetYearId = dto.academicYearId || classroom.academicYearId;
      const targetName = dto.name || classroom.name;
      const targetCode = dto.code || classroom.code;

      const existing = await this.prisma.classroom.findFirst({
        where: {
          tenantId,
          academicYearId: targetYearId,
          id: { not: classroomId },
          OR: [{ name: targetName }, { code: targetCode }],
        },
      });
      if (existing) {
        throw new ConflictException('کلاسی با این نام یا کد در این سال تحصیلی قبلاً ثبت شده است');
      }
    }

    return this.prisma.classroom.update({
      where: { id: classroomId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.code ? { code: dto.code.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: Number(dto.capacity) } : {}),
        ...(dto.roomNumber !== undefined ? { roomNumber: dto.roomNumber ? dto.roomNumber.trim() : null } : {}),
        ...(dto.levelId ? { levelId: dto.levelId } : {}),
        ...(dto.fieldId !== undefined ? { fieldId: dto.fieldId && dto.fieldId.trim() !== '' ? dto.fieldId : null } : {}),
        ...(dto.academicYearId ? { academicYearId: dto.academicYearId } : {}),
        ...(dto.mentorId !== undefined ? { mentorId: dto.mentorId || null } : {}),
      },
      include: {
        level: true,
        field: true,
      },
    });
  }

  async getClassroomDetails(tenantId: string, classroomId: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
      include: {
        level: true,
        field: true,
        mentor: true,
        enrollments: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
        schedules: {
          include: {
            lesson: true,
            teacher: {
              include: {
                user: true,
              },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر یافت نشد');
    }
    return classroom;
  }

  async deleteClassroom(tenantId: string, classroomId: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
    });

    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    await this.prisma.classroom.delete({
      where: { id: classroomId },
    });

    return {
      message: `کلاس «${classroom.name}» با موفقیت حذف گردید`,
      deletedClassroomId: classroomId,
    };
  }

  // 3. Class Enrollment
  async enrollStudent(tenantId: string, dto: EnrollStudentDto) {
    // Check classroom and capacity
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس یافت نشد');
    }

    if (classroom._count.enrollments >= classroom.capacity) {
      throw new BadRequestException('ظرفیت کلاس تکمیل شده است');
    }

    // Check student
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    // Check if already enrolled in this class
    const existing = await this.prisma.classEnrollment.findFirst({
      where: {
        classroomId: dto.classroomId,
        studentId: dto.studentId,
      },
    });
    if (existing) {
      throw new ConflictException('دانش‌آموز قبلاً در این کلاس ثبت‌نام شده است');
    }

    return this.prisma.classEnrollment.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        classroomId: dto.classroomId,
        studentId: dto.studentId,
        status: 'ACTIVE',
      },
      include: {
        classroom: true,
        student: {
          include: { user: true },
        },
      },
    });
  }

  async listEnrolledStudents(tenantId: string, classroomId: string) {
    return this.prisma.classEnrollment.findMany({
      where: { tenantId, classroomId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  // 4. Class Schedules (Timetable with Conflict Detection)
  async createSchedule(tenantId: string, dto: CreateScheduleDto) {
    if (!dto.periodNumber || dto.periodNumber < 1 || dto.periodNumber > 10) {
      throw new BadRequestException('شماره زنگ کلاسی باید بین ۱ تا ۱۰ باشد');
    }

    // 0. Verify classroom, lesson, and teacher belong to this tenant (Zero Tenant Data Leakage)
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر در این مدرسه یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر در این مدرسه یافت نشد');
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: dto.teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    if (dto.isSplitPeriod) {
      if (dto.secondLessonId) {
        const secondLesson = await this.prisma.lesson.findFirst({
          where: { id: dto.secondLessonId, tenantId },
        });
        if (!secondLesson) {
          throw new NotFoundException('درس دوم مورد نظر در این مدرسه یافت نشد');
        }
      }

      if (dto.secondTeacherId) {
        const secondTeacher = await this.prisma.teacherProfile.findFirst({
          where: { id: dto.secondTeacherId, tenantId },
        });
        if (!secondTeacher) {
          throw new NotFoundException('دبیر دوم مورد نظر در این مدرسه یافت نشد');
        }
      }
    }

    // 1. If slot already has a schedule in this classroom, check for conflict / replacement
    const existingSlot = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        classroomId: dto.classroomId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      },
    });

    if (existingSlot && !dto.replaceExisting) {
      throw new ConflictException(
        `تداخل برنامه: در زنگ ${dto.periodNumber} از روز ${dto.dayOfWeek} قبلاً درسی برای این کلاس تعریف شده است`,
      );
    }

    // 2. Check teacher conflict in another classroom
    const teacherConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        classroomId: { not: dto.classroomId },
        OR: [{ teacherId: dto.teacherId }, { secondTeacherId: dto.teacherId }],
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      },
      include: {
        classroom: true,
        teacher: { include: { user: true } },
        secondTeacher: { include: { user: true } },
      },
    });

    let secondTeacherConflict: any = null;
    if (dto.isSplitPeriod && dto.secondTeacherId) {
      secondTeacherConflict = await this.prisma.classSchedule.findFirst({
        where: {
          tenantId,
          classroomId: { not: dto.classroomId },
          OR: [{ teacherId: dto.secondTeacherId }, { secondTeacherId: dto.secondTeacherId }],
          dayOfWeek: dto.dayOfWeek,
          periodNumber: dto.periodNumber,
        },
        include: {
          classroom: true,
          teacher: { include: { user: true } },
          secondTeacher: { include: { user: true } },
        },
      });
    }

    if ((teacherConflict || secondTeacherConflict) && !dto.allowTeacherConflict) {
      let conflictingTeacher = '';
      if (teacherConflict) {
        if (teacherConflict.teacherId === dto.teacherId && teacherConflict.teacher?.user) {
          conflictingTeacher = `${teacherConflict.teacher.user.firstName || ''} ${teacherConflict.teacher.user.lastName || ''}`.trim();
        } else if (teacherConflict.secondTeacherId === dto.teacherId && teacherConflict.secondTeacher?.user) {
          conflictingTeacher = `${teacherConflict.secondTeacher.user.firstName || ''} ${teacherConflict.secondTeacher.user.lastName || ''}`.trim();
        }
      }
      if (!conflictingTeacher && secondTeacherConflict) {
        if (secondTeacherConflict.teacherId === dto.secondTeacherId && secondTeacherConflict.teacher?.user) {
          conflictingTeacher = `${secondTeacherConflict.teacher.user.firstName || ''} ${secondTeacherConflict.teacher.user.lastName || ''}`.trim();
        } else if (secondTeacherConflict.secondTeacherId === dto.secondTeacherId && secondTeacherConflict.secondTeacher?.user) {
          conflictingTeacher = `${secondTeacherConflict.secondTeacher.user.firstName || ''} ${secondTeacherConflict.secondTeacher.user.lastName || ''}`.trim();
        }
      }
      if (!conflictingTeacher) {
        conflictingTeacher = 'دبیر انتخابی';
      }

      const conflictingClassroom =
        teacherConflict?.classroom?.name || secondTeacherConflict?.classroom?.name || 'کلاس دیگر';

      throw new ConflictException(
        `تداخل برنامه دبیر: ${conflictingTeacher} در این روز و زنگ کلاسی، در کلاس '${conflictingClassroom}' تدریس دارد`,
      );
    }

    const scheduleInclude = {
      lesson: {
        include: {
          level: true,
          field: true,
        },
      },
      teacher: {
        include: { user: true },
      },
      secondLesson: {
        include: {
          level: true,
          field: true,
        },
      },
      secondTeacher: {
        include: { user: true },
      },
    };

    if (existingSlot && dto.replaceExisting) {
      return this.prisma.classSchedule.update({
        where: { id: existingSlot.id },
        data: {
          lessonId: dto.lessonId,
          teacherId: dto.teacherId,
          isSplitPeriod: Boolean(dto.isSplitPeriod),
          secondLessonId: dto.isSplitPeriod ? dto.secondLessonId || null : null,
          secondTeacherId: dto.isSplitPeriod ? dto.secondTeacherId || null : null,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
        include: scheduleInclude,
      });
    }

    return this.prisma.classSchedule.create({
      data: {
        tenantId,
        classroomId: dto.classroomId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
        isSplitPeriod: Boolean(dto.isSplitPeriod),
        secondLessonId: dto.isSplitPeriod ? dto.secondLessonId || null : null,
        secondTeacherId: dto.isSplitPeriod ? dto.secondTeacherId || null : null,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      include: scheduleInclude,
    });
  }

  async updateSchedule(tenantId: string, scheduleId: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.classSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('برنامه کلاسی مورد نظر یافت نشد');
    }

    const classroomId = dto.classroomId || existing.classroomId;
    const lessonId = dto.lessonId || existing.lessonId;
    const teacherId = dto.teacherId || existing.teacherId;
    const dayOfWeek = dto.dayOfWeek || existing.dayOfWeek;
    const periodNumber = dto.periodNumber !== undefined ? dto.periodNumber : existing.periodNumber;
    const startTime = dto.startTime || existing.startTime;
    const endTime = dto.endTime || existing.endTime;
    const isSplitPeriod = dto.isSplitPeriod !== undefined ? Boolean(dto.isSplitPeriod) : existing.isSplitPeriod;
    const secondLessonId = isSplitPeriod ? (dto.secondLessonId !== undefined ? dto.secondLessonId : existing.secondLessonId) : null;
    const secondTeacherId = isSplitPeriod ? (dto.secondTeacherId !== undefined ? dto.secondTeacherId : existing.secondTeacherId) : null;

    if (!periodNumber || periodNumber < 1 || periodNumber > 10) {
      throw new BadRequestException('شماره زنگ کلاسی باید بین ۱ تا ۱۰ باشد');
    }

    // Verify entities belong to tenant
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, tenantId },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس درس مورد نظر در این مدرسه یافت نشد');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر در این مدرسه یافت نشد');
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    if (isSplitPeriod) {
      if (secondLessonId) {
        const secondLesson = await this.prisma.lesson.findFirst({
          where: { id: secondLessonId, tenantId },
        });
        if (!secondLesson) {
          throw new NotFoundException('درس دوم مورد نظر در این مدرسه یافت نشد');
        }
      }

      if (secondTeacherId) {
        const secondTeacher = await this.prisma.teacherProfile.findFirst({
          where: { id: secondTeacherId, tenantId },
        });
        if (!secondTeacher) {
          throw new NotFoundException('دبیر دوم مورد نظر در این مدرسه یافت نشد');
        }
      }
    }

    // Check slot conflict with other schedules in this classroom
    const slotConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        id: { not: scheduleId },
        classroomId,
        dayOfWeek,
        periodNumber,
      },
    });

    if (slotConflict && !dto.replaceExisting) {
      throw new ConflictException(
        `تداخل برنامه: در زنگ ${periodNumber} از روز ${dayOfWeek} قبلاً درسی برای این کلاس تعریف شده است`,
      );
    }

    // Check teacher conflict in other classrooms
    const teacherConflict = await this.prisma.classSchedule.findFirst({
      where: {
        tenantId,
        id: { not: scheduleId },
        classroomId: { not: classroomId },
        OR: [{ teacherId }, { secondTeacherId: teacherId }],
        dayOfWeek,
        periodNumber,
      },
      include: {
        classroom: true,
        teacher: { include: { user: true } },
        secondTeacher: { include: { user: true } },
      },
    });

    let secondTeacherConflict: any = null;
    if (isSplitPeriod && secondTeacherId) {
      secondTeacherConflict = await this.prisma.classSchedule.findFirst({
        where: {
          tenantId,
          id: { not: scheduleId },
          classroomId: { not: classroomId },
          OR: [{ teacherId: secondTeacherId }, { secondTeacherId }],
          dayOfWeek,
          periodNumber,
        },
        include: {
          classroom: true,
          teacher: { include: { user: true } },
          secondTeacher: { include: { user: true } },
        },
      });
    }

    if ((teacherConflict || secondTeacherConflict) && !dto.allowTeacherConflict) {
      let conflictingTeacher = '';
      if (teacherConflict) {
        if (teacherConflict.teacherId === teacherId && teacherConflict.teacher?.user) {
          conflictingTeacher = `${teacherConflict.teacher.user.firstName || ''} ${teacherConflict.teacher.user.lastName || ''}`.trim();
        } else if (teacherConflict.secondTeacherId === teacherId && teacherConflict.secondTeacher?.user) {
          conflictingTeacher = `${teacherConflict.secondTeacher.user.firstName || ''} ${teacherConflict.secondTeacher.user.lastName || ''}`.trim();
        }
      }
      if (!conflictingTeacher && secondTeacherConflict) {
        if (secondTeacherConflict.teacherId === secondTeacherId && secondTeacherConflict.teacher?.user) {
          conflictingTeacher = `${secondTeacherConflict.teacher.user.firstName || ''} ${secondTeacherConflict.teacher.user.lastName || ''}`.trim();
        } else if (secondTeacherConflict.secondTeacherId === secondTeacherId && secondTeacherConflict.secondTeacher?.user) {
          conflictingTeacher = `${secondTeacherConflict.secondTeacher.user.firstName || ''} ${secondTeacherConflict.secondTeacher.user.lastName || ''}`.trim();
        }
      }
      if (!conflictingTeacher) {
        conflictingTeacher = 'دبیر انتخابی';
      }

      const conflictingClassroom =
        teacherConflict?.classroom?.name || secondTeacherConflict?.classroom?.name || 'کلاس دیگر';

      throw new ConflictException(
        `تداخل برنامه دبیر: ${conflictingTeacher} در این روز و زنگ کلاسی، در کلاس '${conflictingClassroom}' تدریس دارد`,
      );
    }

    const scheduleInclude = {
      lesson: {
        include: {
          level: true,
          field: true,
        },
      },
      teacher: {
        include: { user: true },
      },
      secondLesson: {
        include: {
          level: true,
          field: true,
        },
      },
      secondTeacher: {
        include: { user: true },
      },
    };

    if (slotConflict && dto.replaceExisting) {
      await this.prisma.classSchedule.delete({
        where: { id: slotConflict.id },
      });
    }

    return this.prisma.classSchedule.update({
      where: { id: scheduleId },
      data: {
        classroomId,
        lessonId,
        teacherId,
        isSplitPeriod,
        secondLessonId,
        secondTeacherId,
        dayOfWeek,
        periodNumber,
        startTime,
        endTime,
      },
      include: scheduleInclude,
    });
  }

  async deleteSchedule(tenantId: string, scheduleId: string) {
    const schedule = await this.prisma.classSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!schedule) {
      throw new NotFoundException('برنامه کلاسی مورد نظر یافت نشد');
    }

    return this.prisma.classSchedule.delete({
      where: { id: scheduleId },
    });
  }

  async getClassSchedule(tenantId: string, classroomId: string, user?: any) {
    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });
      const isEnrolled = student?.enrollments.some((e) => e.classroomId === classroomId);
      if (!isEnrolled) {
        throw new ForbiddenException('هر دانش‌آموز فقط مجاز به مشاهده برنامه کلاسی کلاس خود می‌باشد');
      }
    } else if (user?.role === Role.PARENT) {
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
      const isAllowed = parent?.studentLinks.some((link) =>
        link.student.enrollments.some((e) => e.classroomId === classroomId)
      );
      if (!isAllowed) {
        throw new ForbiddenException('شما فقط مجاز به مشاهده برنامه کلاسی فرزندان خود هستید');
      }
    }

    return this.prisma.classSchedule.findMany({
      where: { tenantId, classroomId },
      include: {
        lesson: {
          include: {
            level: true,
            field: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        secondLesson: {
          include: {
            level: true,
            field: true,
          },
        },
        secondTeacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async getMySchedule(tenantId: string, user: any, studentIdQuery?: string) {
    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              classroom: {
                include: {
                  level: true,
                  field: true,
                  mentor: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!student || student.enrollments.length === 0) {
        return { classroom: null, schedules: [] };
      }

      const activeEnrollment = student.enrollments[0];
      const classroom = activeEnrollment.classroom;
      const schedules = await this.getClassSchedule(tenantId, classroom.id, user);

      return {
        classroom,
        schedules,
      };
    } else if (user?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher) {
        return { teacher: null, schedules: [] };
      }
      const schedules = await this.getTeacherSchedule(tenantId, teacher.id);
      return {
        teacher,
        schedules,
      };
    } else if (user?.role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: true,
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    include: {
                      classroom: {
                        include: {
                          level: true,
                          field: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!parent || parent.studentLinks.length === 0) {
        return { classroom: null, schedules: [], allChildren: [] };
      }

      const allChildren = parent.studentLinks.map((link) => ({
        id: link.student.id,
        firstName: link.student.user.firstName,
        lastName: link.student.user.lastName,
        nationalCode: link.student.nationalCode,
        classroomName: link.student.enrollments[0]?.classroom?.name,
        classroomId: link.student.enrollments[0]?.classroom?.id,
      }));

      // Select targeted student if studentIdQuery provided and belongs to parent's children
      const targetLink = studentIdQuery
        ? parent.studentLinks.find(
            (l) => l.student.id === studentIdQuery || l.student.userId === studentIdQuery,
          ) || parent.studentLinks[0]
        : parent.studentLinks[0];

      const activeStudent = targetLink.student;
      const activeEnrollment = activeStudent.enrollments[0];
      if (!activeEnrollment) {
        return {
          classroom: null,
          schedules: [],
          student: activeStudent,
          allChildren,
        };
      }

      const classroom = activeEnrollment.classroom;
      const schedules = await this.getClassSchedule(tenantId, classroom.id, user);

      return {
        classroom,
        schedules,
        student: activeStudent,
        allChildren,
      };
    } else {
      throw new BadRequestException('این متد فقط برای نقش‌های دانش‌آموز، والد یا دبیر معتبر است');
    }
  }

  async getTeacherSchedule(tenantId: string, teacherId: string) {
    return this.prisma.classSchedule.findMany({
      where: {
        tenantId,
        OR: [{ teacherId }, { secondTeacherId: teacherId }],
      },
      include: {
        classroom: true,
        lesson: true,
        secondLesson: true,
        teacher: { include: { user: true } },
        secondTeacher: { include: { user: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }
}
