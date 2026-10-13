import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherContractDto } from './dto/create-payroll.dto';

@Injectable()
export class TeacherContractService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ثبت قرارداد جدید برای مدرس با حفظ تاریخچه نرخ‌ها
   * در صورتی که برای مدرس قرارداد فعالی وجود داشته باشد، تاریخ پایان آن به تاریخ شروع قرارداد جدید تنظیم می‌شود.
   */
  async createContract(
    tenantId: string,
    createdById: string,
    dto: CreateTeacherContractDto,
  ) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherId, tenantId },
    });

    if (!teacher) {
      throw new NotFoundException('مدرس مورد نظر در این مدرسه یافت نشد');
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, tenantId },
    });

    if (!academicYear) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    const effectiveFromDate = new Date(dto.effectiveFrom);
    if (isNaN(effectiveFromDate.getTime())) {
      throw new BadRequestException('فرمت تاریخ شروع قرارداد نامعتبر است');
    }

    const effectiveToDate = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveToDate && isNaN(effectiveToDate.getTime())) {
      throw new BadRequestException('فرمت تاریخ پایان قرارداد نامعتبر است');
    }

    return this.prisma.$transaction(async (tx) => {
      // بستن قراردادهای فعال قبلی در همین سال تحصیلی که تاریخ پایان ندارند یا با این تاریخ تداخل دارند
      await tx.teacherContract.updateMany({
        where: {
          tenantId,
          teacherId: dto.teacherId,
          academicYearId: dto.academicYearId,
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: effectiveFromDate } },
          ],
        },
        data: {
          effectiveTo: effectiveFromDate,
        },
      });

      return tx.teacherContract.create({
        data: {
          tenantId,
          teacherId: dto.teacherId,
          academicYearId: dto.academicYearId,
          rateType: dto.rateType,
          rateAmount: dto.rateAmount,
          monthlyHourCap: dto.monthlyHourCap || null,
          baseSalary: dto.baseSalary !== undefined && dto.baseSalary !== null ? dto.baseSalary : null,
          effectiveFrom: effectiveFromDate,
          effectiveTo: effectiveToDate,
          createdById,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              name: true,
              isCurrent: true,
            },
          },
        },
      });
    });
  }

  /**
   * دریافت لیست قراردادها با فیلتر سال تحصیلی و مدرس
   */
  async getContracts(
    tenantId: string,
    query?: { academicYearId?: string; teacherId?: string },
  ) {
    const where: any = { tenantId };
    if (query?.academicYearId) where.academicYearId = query.academicYearId;
    if (query?.teacherId) where.teacherId = query.teacherId;

    return this.prisma.teacherContract.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
      },
    });
  }

  /**
   * استخراج قرارداد فعال مدرس در یک تاریخ معین
   */
  async getActiveContract(tenantId: string, teacherId: string, targetDate: Date) {
    return this.prisma.teacherContract.findFirst({
      where: {
        tenantId,
        teacherId,
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * حذف قرارداد مدرس
   */
  async deleteContract(tenantId: string, contractId: string) {
    const contract = await this.prisma.teacherContract.findFirst({
      where: { id: contractId, tenantId },
    });

    if (!contract) {
      throw new NotFoundException('قرارداد مورد نظر یافت نشد');
    }

    return this.prisma.teacherContract.delete({
      where: { id: contractId },
    });
  }
}
