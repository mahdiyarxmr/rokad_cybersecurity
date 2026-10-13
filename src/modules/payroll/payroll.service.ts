import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateStaffPayrollProfileDto,
  GeneratePayrollSlipDto,
  ApproveAndPaySlipDto,
  CalculateMonthlyPayrollDto,
  ReviewPayrollSlipDto,
  CancelPayrollSlipDto,
  FinalizeMonthlyPayrollDto,
  CreatePayrollAdjustmentDto,
} from './dto/create-payroll.dto';
import {
  jalaliToGregorianDate,
  PERSIAN_MONTH_NAMES,
} from '../../common/utils/jalali.util';
import * as jalaali from 'jalaali-js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Upsert Staff Payroll Profile
  async upsertStaffProfile(
    tenantId: string,
    userId: string,
    dto: UpdateStaffPayrollProfileDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('کاربر پرسنل در این مدرسه یافت نشد');
    }

    return this.prisma.staffPayrollProfile.upsert({
      where: { userId },
      update: {
        contractType: dto.contractType,
        baseMonthlySalary: dto.baseMonthlySalary,
        hourlyRate: dto.hourlyRate || 0,
        bankAccountNumber: dto.bankAccountNumber,
        bankShebaNumber: dto.bankShebaNumber,
        bankName: dto.bankName,
        insuranceNumber: dto.insuranceNumber,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      create: {
        tenantId,
        userId,
        contractType: dto.contractType,
        baseMonthlySalary: dto.baseMonthlySalary,
        hourlyRate: dto.hourlyRate || 0,
        bankAccountNumber: dto.bankAccountNumber,
        bankShebaNumber: dto.bankShebaNumber,
        bankName: dto.bankName,
        insuranceNumber: dto.insuranceNumber,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // 2. Get Staff Payroll Profile
  async getStaffProfile(tenantId: string, userId: string) {
    const profile = await this.prisma.staffPayrollProfile.findFirst({
      where: { userId, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل حقوق و دستمزد برای این کاربر ثبت نشده است');
    }
    return profile;
  }

  // 3. Get All Staff Profiles
  async listStaffProfiles(tenantId: string) {
    return this.prisma.staffPayrollProfile.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            nationalId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 4. موتور محاسبه خودکار کارکرد ماهانه مدرسین بر اساس حضور و غیاب واقعی
   */
  async calculateMonthlyPayroll(
    tenantId: string,
    createdById: string,
    dto: CalculateMonthlyPayrollDto,
  ) {
    const { year, month } = dto;
    const daysInMonth = jalaali.jalaaliMonthLength(year, month);
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // بازه معادل میلادی برای فیلتر حضور و غیاب
    const gStartDate = jalaliToGregorianDate(startStr, 'start');
    const gEndDate = jalaliToGregorianDate(endStr, 'end');

    const gStartDateStr = gStartDate.toISOString().slice(0, 10);
    const gEndDateStr = gEndDate.toISOString().slice(0, 10);

    // استخراج تمام قراردادهای فعال این ماه
    const contracts = await this.prisma.teacherContract.findMany({
      where: {
        tenantId,
        effectiveFrom: { lte: gEndDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: gStartDate } },
        ],
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            teacherProfile: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!contracts.length) {
      throw new BadRequestException('هیچ قرارداد فعالی برای مدرسین در این ماه یافت نشد');
    }

    const generatedSlips: any[] = [];

    // پردازش تک‌تک قراردادها در تراکنش
    await this.prisma.$transaction(async (tx) => {
      for (const contract of contracts) {
        const teacher = contract.teacher;
        const teacherProfileId = teacher.teacherProfile?.id;

        // شمارش جلسات حضور در بازه ماه
        let sessionCount = 0;
        if (teacherProfileId) {
          sessionCount = await tx.teacherAttendance.count({
            where: {
              tenantId,
              teacherId: teacherProfileId,
              status: 'PRESENT',
              OR: [
                { date: { gte: startStr, lte: endStr } }, // در صورت ثبت فرمت شمسی
                { date: { gte: gStartDateStr, lte: gEndDateStr } }, // در صورت ثبت فرمت میلادی
              ],
            },
          });
        }

        const rateAmountNum = Number(contract.rateAmount);
        const baseSalaryNum = contract.baseSalary ? Number(contract.baseSalary) : 0;
        let calculatedAmountNum = 0;
        let sourceHoursNum: number | null = null;
        let hasCapWarning = false;
        let capWarningDetails: string | null = null;

        if (contract.rateType === 'PER_SESSION') {
          calculatedAmountNum = sessionCount * rateAmountNum + baseSalaryNum;
          if (contract.monthlyHourCap && sessionCount > contract.monthlyHourCap) {
            hasCapWarning = true;
            capWarningDetails = `تعداد جلسات تدریس (${sessionCount}) فراتر از سقف ماهانه قرارداد (${contract.monthlyHourCap}) است`;
          }
        } else {
          // ساعتی: هر جلسه معادل ۱.۵ ساعت آموزشی استاندارد
          sourceHoursNum = Number((sessionCount * 1.5).toFixed(2));
          calculatedAmountNum = Math.round(sourceHoursNum * rateAmountNum + baseSalaryNum);
          if (contract.monthlyHourCap && sourceHoursNum > contract.monthlyHourCap) {
            hasCapWarning = true;
            capWarningDetails = `ساعات تدریس (${sourceHoursNum} ساعت) فراتر از سقف ماهانه قرارداد (${contract.monthlyHourCap} ساعت) است`;
          }
        }

        // استخراج تعدیلات معلق قبلی برای این مدرس
        const pendingAdjustments = await tx.payrollAdjustment.findMany({
          where: {
            tenantId,
            teacherId: teacher.id,
            status: 'PENDING',
          },
        });

        const totalAdjustmentNum = pendingAdjustments.reduce(
          (sum, adj) => sum + Number(adj.amount),
          0,
        );

        const initialFinalAmount = Math.max(0, calculatedAmountNum + totalAdjustmentNum);
        const slipNumber = `PAY-${year}-${String(month).padStart(2, '0')}-${teacher.id.slice(0, 5).toUpperCase()}`;

        // بررسی فیش موجود برای این ماه و مدرس
        const existingSlip = await tx.payrollSlip.findUnique({
          where: {
            tenantId_userId_year_month: {
              tenantId,
              userId: teacher.id,
              year,
              month,
            },
          },
        });

        let slipId: string;

        if (existingSlip) {
          // اگر قبلاً صدور نهایی یا تسویه شده باشد، بدون تغییر می‌ماند
          if (existingSlip.status === 'ISSUED' || existingSlip.status === 'SETTLED' || existingSlip.status === 'PAID') {
            continue;
          }

          // بروزرسانی رکوردهای DRAFT یا REVIEWED با مقادیر محاسبه جدید
          const updated = await tx.payrollSlip.update({
            where: { id: existingSlip.id },
            data: {
              calculatedAmount: calculatedAmountNum,
              finalAmount: initialFinalAmount,
              grossPay: initialFinalAmount,
              totalDeductions: 0,
              netPay: initialFinalAmount,
              sourceSessionCount: sessionCount,
              sourceHours: sourceHoursNum,
              hasCapWarning,
              capWarningDetails,
              status: 'DRAFT',
            },
          });
          slipId = updated.id;

          // حذف اقلام قبلی
          await tx.payrollItem.deleteMany({
            where: { payrollSlipId: slipId },
          });
        } else {
          // ایجاد فیش پیش‌نویس جدید
          const created = await tx.payrollSlip.create({
            data: {
              tenantId,
              userId: teacher.id,
              year,
              month,
              slipNumber,
              calculatedAmount: calculatedAmountNum,
              finalAmount: initialFinalAmount,
              grossPay: initialFinalAmount,
              totalDeductions: 0,
              netPay: initialFinalAmount,
              sourceSessionCount: sessionCount,
              sourceHours: sourceHoursNum,
              hasCapWarning,
              capWarningDetails,
              status: 'DRAFT',
            },
          });
          slipId = created.id;
        }

        // ایجاد ردیف‌های اقلام فیش
        if (baseSalaryNum > 0) {
          await tx.payrollItem.create({
            data: {
              tenantId,
              payrollSlipId: slipId,
              type: 'BASE_SALARY',
              title: `حقوق ثابت پایه ماهیانه (${PERSIAN_MONTH_NAMES[month - 1]})`,
              amount: baseSalaryNum,
            },
          });
        }

        const teachingAmount = calculatedAmountNum - baseSalaryNum;
        if (teachingAmount > 0) {
          await tx.payrollItem.create({
            data: {
              tenantId,
              payrollSlipId: slipId,
              type: 'HOURLY_TEACHING',
              title:
                contract.rateType === 'PER_SESSION'
                  ? `حق‌التدریس ${sessionCount} جلسه تدریس رسمی`
                  : `حق‌التدریس ${sourceHoursNum} ساعت تدریس رسمی`,
              amount: teachingAmount,
              multiplierOrHours: contract.rateType === 'PER_SESSION' ? sessionCount : sourceHoursNum,
            },
          });
        }

        // درج تعدیلات اعمال‌شده به عنوان اقلام فیش و پیوند دادن آن‌ها
        for (const adj of pendingAdjustments) {
          const adjAmountNum = Number(adj.amount);
          await tx.payrollItem.create({
            data: {
              tenantId,
              payrollSlipId: slipId,
              type: 'ADJUSTMENT',
              title: `تعدیلات و اصلاحات معوقه: ${adj.reason}`,
              amount: adjAmountNum,
            },
          });

          await tx.payrollAdjustment.update({
            where: { id: adj.id },
            data: {
              appliedToSlipId: slipId,
            },
          });
        }

        generatedSlips.push(slipId);
      }
    });

    return {
      message: `محاسبه خودکار کارکرد برای ${generatedSlips.length} مدرس با موفقیت انجام شد`,
      year,
      month,
      processedCount: generatedSlips.length,
    };
  }

  /**
   * 5. بازبینی و ویرایش دستی مبلغ نهایی فیش توسط مدیر با ثبت دلیل و ردپای ممیزی
   */
  async reviewAndEditSlip(
    tenantId: string,
    slipId: string,
    dto: ReviewPayrollSlipDto,
    adminUser: any,
  ) {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
      include: { user: true },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی مورد نظر یافت نشد');
    }

    if (slip.status === 'ISSUED' || slip.status === 'SETTLED' || slip.status === 'PAID') {
      throw new BadRequestException(
        'این فیش قبلاً صادر قطعی شده و امکان ویرایش مستقیم آن وجود ندارد. لطفاً در صورت نیاز، تعدیل حقوق (PayrollAdjustment) ثبت فرمایید.',
      );
    }

    if (slip.status === 'CANCELLED') {
      throw new BadRequestException('این فیش باطل شده است و امکان ویرایش ندارد');
    }

    return this.prisma.payrollSlip.update({
      where: { id: slipId },
      data: {
        finalAmount: dto.finalAmount,
        netPay: dto.finalAmount,
        grossPay: dto.finalAmount,
        status: 'REVIEWED',
        editReason: dto.editReason.trim(),
        editedById: adminUser.id,
        editedAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
        editedBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
    });
  }

  /**
   * 6. ابطال صریح فیش حقوقی با ثبت دلیل
   */
  async cancelSlip(
    tenantId: string,
    slipId: string,
    dto: CancelPayrollSlipDto,
    adminUser: any,
  ) {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی یافت نشد');
    }

    if (slip.status === 'SETTLED' || slip.status === 'PAID') {
      throw new BadRequestException(
        'امکان ابطال فیشی که تسویه بانکی آن ثبت شده وجود ندارد. در صورت نیاز از ثبت تعدیلات استفاده نمایید.',
      );
    }

    if (slip.status === 'ISSUED' && !adminUser.isPlatformAdmin && !adminUser.permissions?.includes('finance.payroll.finalize')) {
      throw new ForbiddenException('فقط مدیر ارشد مجاز به ابطال فیش صادرشده است');
    }

    return this.prisma.payrollSlip.update({
      where: { id: slipId },
      data: {
        status: 'CANCELLED',
        cancelReason: dto.cancelReason.trim(),
        cancelledById: adminUser.id,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * 7. صدور دسته‌جمعی و قطعی فیش‌های ماه (Finalize)
   */
  async finalizeMonthlySlips(
    tenantId: string,
    year: number,
    month: number,
    adminUser: any,
  ) {
    const activeSlips = await this.prisma.payrollSlip.findMany({
      where: {
        tenantId,
        year,
        month,
        status: { in: ['DRAFT', 'REVIEWED'] },
      },
      include: { adjustmentsApplied: true },
    });

    if (!activeSlips.length) {
      throw new BadRequestException('هیچ فیش پیش‌نویس یا بازبینی‌شده‌ای برای صدور در این ماه وجود ندارد');
    }

    const slipIds = activeSlips.map((s) => s.id);

    return this.prisma.$transaction(async (tx) => {
      // تغییر وضعیت تمام فیش‌ها به ISSUED
      await tx.payrollSlip.updateMany({
        where: { id: { in: slipIds } },
        data: {
          status: 'ISSUED',
        },
      });

      // نهایی کردن تعدیلات متصل به این فیش‌ها به APPLIED
      await tx.payrollAdjustment.updateMany({
        where: {
          appliedToSlipId: { in: slipIds },
          status: 'PENDING',
        },
        data: {
          status: 'APPLIED',
          appliedAt: new Date(),
        },
      });

      return {
        message: `${activeSlips.length} فیش حقوقی برای ماه ${PERSIAN_MONTH_NAMES[month - 1]} ${year} با موفقیت صادر قطعی گردید`,
        count: activeSlips.length,
      };
    });
  }

  /**
   * 8. ثبت تعدیل حقوق پس از صدور (PayrollAdjustment)
   */
  async createAdjustment(
    tenantId: string,
    createdById: string,
    dto: CreatePayrollAdjustmentDto,
  ) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherId, tenantId },
    });

    if (!teacher) {
      throw new NotFoundException('مدرس مورد نظر یافت نشد');
    }

    return this.prisma.payrollAdjustment.create({
      data: {
        tenantId,
        teacherId: dto.teacherId,
        originalSlipId: dto.originalSlipId || null,
        amount: dto.amount,
        reason: dto.reason.trim(),
        createdById,
        status: 'PENDING',
      },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * 9. دریافت لیست تعدیلات
   */
  async getAdjustments(tenantId: string, teacherId?: string) {
    const where: any = { tenantId };
    if (teacherId) where.teacherId = teacherId;

    return this.prisma.payrollAdjustment.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        originalSlip: { select: { id: true, slipNumber: true, year: true, month: true } },
        appliedToSlip: { select: { id: true, slipNumber: true, year: true, month: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 10. دریافت لیست فیش‌های حقوقی با فیلتر کامل
   */
  async listPayrollSlips(
    tenantId: string,
    filters?: { year?: number; month?: number; status?: any; userId?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.year) where.year = filters.year;
    if (filters?.month) where.month = filters.month;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;

    return this.prisma.payrollSlip.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true, nationalId: true } },
        editedBy: { select: { firstName: true, lastName: true } },
        cancelledBy: { select: { firstName: true, lastName: true } },
        paidBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * 11. دریافت جزییات یک فیش
   */
  async getSlipById(tenantId: string, slipId: string) {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
      include: {
        tenant: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            nationalId: true,
            staffPayrollProfile: true,
          },
        },
        editedBy: { select: { firstName: true, lastName: true } },
        cancelledBy: { select: { firstName: true, lastName: true } },
        paidBy: { select: { firstName: true, lastName: true } },
        items: true,
        adjustmentsOrigin: true,
        adjustmentsApplied: true,
      },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی مورد نظر یافت نشد');
    }
    return slip;
  }

  /**
   * 12. تسویه و پرداخت بانکی (از فاز ۶)
   */
  async approveAndDisburse(
    tenantId: string,
    slipId: string,
    approverUserId: string,
    dto: ApproveAndPaySlipDto,
  ) {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی مورد نظر یافت نشد');
    }

    return this.prisma.payrollSlip.update({
      where: { id: slipId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidById: approverUserId,
        paymentRefNumber: dto.paymentRefNumber,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        paidBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
    });
  }

  /**
   * تولید مستقیم فیش حقوقی برای یک پرسنل بر مبنای پروفایل حقوقی
   */
  async generateSlipForUser(
    tenantId: string,
    createdById: string,
    dto: GeneratePayrollSlipDto,
  ) {
    const profile = await this.prisma.staffPayrollProfile.findFirst({
      where: { tenantId, userId: dto.userId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('پروفایل حقوقی برای این کاربر یافت نشد');
    }

    const baseSalary = Number(profile.baseMonthlySalary || 0);

    let items: Array<{
      type: any;
      title: string;
      amount: number;
      multiplierOrHours?: number;
      notes?: string;
    }> = [];

    let grossPay = 0;
    let totalDeductions = 0;
    let netPay = 0;

    if (dto.customItems && dto.customItems.length > 0) {
      items = dto.customItems.map((ci) => ({
        type: ci.type,
        title: ci.title,
        amount: ci.amount,
        multiplierOrHours: ci.multiplierOrHours,
        notes: ci.notes,
      }));
      grossPay = items.filter((i) => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
      totalDeductions = Math.abs(
        items.filter((i) => i.amount < 0).reduce((sum, i) => sum + i.amount, 0),
      );
      netPay = Math.max(0, grossPay - totalDeductions);
    } else {
      grossPay = baseSalary;
      const insuranceDeduction = Math.round(grossPay * 0.07);
      const taxable = Math.max(0, grossPay - 15000000);
      const taxDeduction = taxable > 0 ? Math.round(taxable * 0.1) : 0;
      totalDeductions = insuranceDeduction + taxDeduction;
      netPay = Math.max(0, grossPay - totalDeductions);

      const monthName = PERSIAN_MONTH_NAMES[dto.month] || `ماه ${dto.month}`;
      items.push({
        type: 'BASE_SALARY',
        title: `حقوق پایه ماهانه (${monthName})`,
        amount: grossPay,
      });

      if (insuranceDeduction > 0) {
        items.push({
          type: 'INSURANCE_DEDUCTION',
          title: 'بیمه تأمین اجتماعی سهم کارمند (۷٪)',
          amount: -insuranceDeduction,
        });
      }

      if (taxDeduction > 0) {
        items.push({
          type: 'TAX_DEDUCTION',
          title: 'مالیات بر حقوق',
          amount: -taxDeduction,
        });
      }
    }

    const slipNumber = `PAY-${dto.year}-${String(dto.month).padStart(2, '0')}-${profile.user.id.slice(0, 5).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const existingSlip = await tx.payrollSlip.findUnique({
        where: {
          tenantId_userId_year_month: {
            tenantId,
            userId: dto.userId,
            year: dto.year,
            month: dto.month,
          },
        },
      });

      let slip: any;
      if (existingSlip) {
        await tx.payrollItem.deleteMany({ where: { payrollSlipId: existingSlip.id } });
        slip = await tx.payrollSlip.update({
          where: { id: existingSlip.id },
          data: {
            calculatedAmount: grossPay,
            finalAmount: netPay,
            grossPay,
            totalDeductions,
            netPay,
            status: 'DRAFT',
          },
        });
      } else {
        slip = await tx.payrollSlip.create({
          data: {
            tenantId,
            userId: dto.userId,
            year: dto.year,
            month: dto.month,
            slipNumber,
            calculatedAmount: grossPay,
            finalAmount: netPay,
            grossPay,
            totalDeductions,
            netPay,
            status: 'DRAFT',
          },
        });
      }

      for (const item of items) {
        await tx.payrollItem.create({
          data: {
            tenantId,
            payrollSlipId: slip.id,
            type: item.type as any,
            title: item.title,
            amount: item.amount,
            multiplierOrHours: item.multiplierOrHours,
            notes: item.notes,
          },
        });
      }

      return tx.payrollSlip.findUnique({
        where: { id: slip.id },
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
          items: true,
        },
      });
    });
  }

  /**
   * 13. فیش‌های من در پرتال معلم (فقط فیش‌های قطعی ISSUED یا SETTLED)
   */
  async getMyPayrollSlips(tenantId: string, userId: string) {
    return this.prisma.payrollSlip.findMany({
      where: {
        tenantId,
        userId,
        status: { in: ['ISSUED', 'SETTLED', 'PAID'] },
      },
      include: { items: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
}
