import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateTermDto,
  UpdateTermDto,
  CreateEducationalLevelDto,
  CreateStudyFieldDto,
} from './dto/create-academic-year.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Academic Years
  async listAcademicYears(tenantId: string) {
    return this.prisma.academicYear.findMany({
      where: { tenantId },
      include: {
        terms: true,
        _count: {
          select: { classrooms: true, classEnrollments: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createAcademicYear(tenantId: string, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`سال تحصیلی '${dto.name}' قبلاً ثبت شده است`);
    }

    if (dto.isCurrent) {
      // Set all other years to not current
      await this.prisma.academicYear.updateMany({
        where: { tenantId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  async updateAcademicYear(tenantId: string, id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, tenantId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    if (dto.name && dto.name !== year.name) {
      const existing = await this.prisma.academicYear.findFirst({
        where: { tenantId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`سال تحصیلی '${dto.name}' قبلاً ثبت شده است`);
      }
    }

    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { tenantId, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
      },
      include: {
        terms: true,
      },
    });
  }

  async deleteAcademicYear(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { classrooms: true, classEnrollments: true },
        },
      },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    if (year._count.classrooms > 0 || year._count.classEnrollments > 0) {
      throw new ConflictException('امکان حذف سال تحصیلی دارای کلاس یا دانش‌آموز ثبت‌نامی وجود ندارد');
    }

    await this.prisma.academicYear.delete({
      where: { id },
    });

    return { message: 'سال تحصیلی با موفقیت حذف شد' };
  }

  // 2. Terms
  async createTerm(tenantId: string, dto: CreateTermDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, tenantId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { tenantId, academicYearId: dto.academicYearId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  async updateTerm(tenantId: string, id: string, dto: UpdateTermDto) {
    const term = await this.prisma.term.findFirst({
      where: { id, tenantId },
    });
    if (!term) {
      throw new NotFoundException('نیم‌سال تحصیلی مورد نظر یافت نشد');
    }

    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { tenantId, academicYearId: term.academicYearId, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
      },
    });
  }

  async deleteTerm(tenantId: string, id: string) {
    const term = await this.prisma.term.findFirst({
      where: { id, tenantId },
    });
    if (!term) {
      throw new NotFoundException('نیم‌سال تحصیلی مورد نظر یافت نشد');
    }

    await this.prisma.term.delete({
      where: { id },
    });

    return { message: 'نیم‌سال تحصیلی با موفقیت حذف شد' };
  }

  // 3. Educational Levels
  async listLevels(tenantId: string) {
    return this.prisma.educationalLevel.findMany({
      where: { tenantId },
      include: {
        studyFields: true,
        _count: {
          select: { classrooms: true, lessons: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createLevel(tenantId: string, dto: CreateEducationalLevelDto) {
    const existing = await this.prisma.educationalLevel.findFirst({
      where: {
        tenantId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException(`مقطع تحصیلی با این نام یا کد قبلاً ثبت شده است`);
    }

    return this.prisma.educationalLevel.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        orderIndex: dto.orderIndex || 1,
      },
    });
  }

  // 4. Study Fields
  async listFields(tenantId: string, levelId?: string) {
    return this.prisma.studyField.findMany({
      where: {
        tenantId,
        ...(levelId ? { levelId } : {}),
      },
      include: {
        level: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createField(tenantId: string, dto: CreateStudyFieldDto) {
    const level = await this.prisma.educationalLevel.findFirst({
      where: { id: dto.levelId, tenantId },
    });
    if (!level) {
      throw new NotFoundException('مقطع تحصیلی مورد نظر یافت نشد');
    }

    const existing = await this.prisma.studyField.findFirst({
      where: {
        tenantId,
        levelId: dto.levelId,
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });
    if (existing) {
      throw new ConflictException(`این رشته تحصیلی در این مقطع قبلاً ثبت شده است`);
    }

    return this.prisma.studyField.create({
      data: {
        tenantId,
        levelId: dto.levelId,
        name: dto.name,
        code: dto.code,
      },
      include: {
        level: true,
      },
    });
  }

  // 5. School Admin Dynamic Dashboard Stats
  async getSchoolDashboardStats(tenantId: string) {
    const [
      studentsCount,
      teachersCount,
      classrooms,
      lessonsCount,
      currentYear,
      feesSummary,
      attendanceStats,
      subInfo,
    ] = await Promise.all([
      this.prisma.studentProfile.count({ where: { tenantId } }),
      this.prisma.teacherProfile.count({ where: { tenantId } }),
      this.prisma.classroom.findMany({
        where: { tenantId },
        include: {
          level: true,
          field: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.lesson.count({ where: { tenantId } }),
      this.prisma.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
        include: { terms: { where: { isCurrent: true } } },
      }),
      this.prisma.studentFeeContract.aggregate({
        where: { tenantId },
        _sum: { finalPayableAmount: true, balanceRemaining: true },
        _count: true,
      }),
      this.prisma.studentAttendance.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.tenantSubscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        include: { plan: true },
      }),
    ]);

    const totalStudents = studentsCount;
    const totalTeachers = teachersCount;
    const totalCapacity = classrooms.reduce((acc, c) => acc + (c.capacity || 0), 0);

    const totalFees = Number(feesSummary._sum?.finalPayableAmount || 0);
    const balanceRemaining = Number(feesSummary._sum?.balanceRemaining || 0);
    const paidFees = Math.max(0, totalFees - balanceRemaining);

    let totalAttendanceRecords = 0;
    let presentRecords = 0;
    for (const a of attendanceStats) {
      totalAttendanceRecords += a._count.id;
      if (a.status === 'PRESENT') {
        presentRecords += a._count.id;
      }
    }
    const attendanceRate =
      totalAttendanceRecords > 0
        ? Math.round((presentRecords / totalAttendanceRecords) * 1000) / 10
        : 100;

    return {
      studentsCount: totalStudents,
      maxStudents: subInfo?.plan?.maxStudents || (totalCapacity > 0 ? totalCapacity : 150),
      teachersCount: totalTeachers,
      maxTeachers: subInfo?.plan?.maxTeachers || 40,
      classroomsCount: classrooms.length,
      classrooms: classrooms.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        roomNumber: c.roomNumber,
        capacity: c.capacity,
        studentsCount: c._count.enrollments,
        levelName: c.level?.name,
        fieldName: c.field?.name,
      })),
      lessonsCount,
      currentYear: currentYear?.name || '۱۴۰۵-۱۴۰۶',
      currentTerm: currentYear?.terms?.[0]?.name || 'نیم‌سال اول',
      financial: {
        paidAmount: paidFees,
        totalAmount: totalFees,
        collectionRate: totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0,
      },
      attendanceRate,
    };
  }
}
