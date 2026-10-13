import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, FeePlanScope } from '@prisma/client';
import { CreateFeeContractDto } from './dto/create-fee-contract.dto';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';

@Injectable()
export class FeeService {
  private readonly logger = new Logger(FeeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. FEE PLANS & GROUP ALLOCATION
  // ==========================================

  async createFeePlan(tenantId: string, dto: CreateFeePlanDto) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, tenantId },
    });
    if (!academicYear) {
      throw new NotFoundException('سال تحصیلی مورد نظر یافت نشد');
    }

    const plan = await this.prisma.feePlan.create({
      data: {
        tenantId,
        academicYearId: dto.academicYearId,
        title: dto.title,
        amount: new Prisma.Decimal(dto.amount),
        appliesTo: dto.appliesTo,
        educationalLevelId: dto.educationalLevelId,
        classroomId: dto.classroomId,
        description: dto.description,
        installmentCount: dto.installmentCount || (dto.installmentConfig?.length || 1),
        installmentConfig: (dto.installmentConfig as any) || undefined,
      },
      include: {
        academicYear: { select: { name: true } },
        educationalLevel: { select: { name: true } },
        classroom: { select: { name: true } },
        _count: { select: { contracts: true } },
      },
    });

    return plan;
  }

  async listFeePlans(tenantId: string, academicYearId?: string) {
    const where: Prisma.FeePlanWhereInput = { tenantId };
    if (academicYearId) where.academicYearId = academicYearId;

    return this.prisma.feePlan.findMany({
      where,
      include: {
        academicYear: { select: { name: true } },
        educationalLevel: { select: { name: true } },
        classroom: { select: { name: true } },
        _count: { select: { contracts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeePlan(tenantId: string, id: string) {
    const plan = await this.prisma.feePlan.findFirst({
      where: { id, tenantId },
      include: {
        academicYear: true,
        educationalLevel: true,
        classroom: true,
        contracts: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, nationalId: true } },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('طرح شهریه مورد نظر یافت نشد');
    }
    return plan;
  }

  // Preview Fee Plan Group Allocation
  async previewFeePlanAllocation(tenantId: string, planId: string) {
    const plan = await this.getFeePlan(tenantId, planId);

    // Identify eligible students according to scope
    let studentEnrollments: any[] = [];

    if (plan.appliesTo === FeePlanScope.ALL_SCHOOL) {
      studentEnrollments = await this.prisma.classEnrollment.findMany({
        where: { tenantId, academicYearId: plan.academicYearId, status: 'ACTIVE' },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, nationalId: true, phone: true } },
            },
          },
          classroom: { select: { id: true, name: true } },
        },
      });
    } else if (plan.appliesTo === FeePlanScope.EDUCATIONAL_LEVEL && plan.educationalLevelId) {
      studentEnrollments = await this.prisma.classEnrollment.findMany({
        where: {
          tenantId,
          academicYearId: plan.academicYearId,
          status: 'ACTIVE',
          classroom: { levelId: plan.educationalLevelId },
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, nationalId: true, phone: true } },
            },
          },
          classroom: { select: { id: true, name: true } },
        },
      });
    } else if (plan.appliesTo === FeePlanScope.CLASSROOM && plan.classroomId) {
      studentEnrollments = await this.prisma.classEnrollment.findMany({
        where: {
          tenantId,
          academicYearId: plan.academicYearId,
          classroomId: plan.classroomId,
          status: 'ACTIVE',
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, nationalId: true, phone: true } },
            },
          },
          classroom: { select: { id: true, name: true } },
        },
      });
    }

    // De-duplicate students in case of multiple active enrollments
    const uniqueStudentsMap = new Map<string, any>();
    studentEnrollments.forEach((e) => {
      if (e.student && !uniqueStudentsMap.has(e.student.id)) {
        uniqueStudentsMap.set(e.student.id, {
          studentId: e.student.id,
          name: `${e.student.user?.firstName || ''} ${e.student.user?.lastName || ''}`,
          nationalId: e.student.user?.nationalId || '',
          classroomName: e.classroom?.name || '',
        });
      }
    });

    const eligibleStudents = Array.from(uniqueStudentsMap.values());
    const studentIds = eligibleStudents.map((s) => s.studentId);

    // Existing contracts in this academic year
    const existingContracts = await this.prisma.studentFeeContract.findMany({
      where: {
        tenantId,
        academicYearId: plan.academicYearId,
        studentId: { in: studentIds },
      },
      select: { studentId: true, contractNumber: true },
    });

    const contractedSet = new Set(existingContracts.map((c) => c.studentId));

    const readyToAllocate = eligibleStudents.filter((s) => !contractedSet.has(s.studentId));
    const alreadyAllocated = eligibleStudents.filter((s) => contractedSet.has(s.studentId));

    return {
      plan: {
        id: plan.id,
        title: plan.title,
        amount: plan.amount,
        academicYearName: plan.academicYear?.name,
        installmentCount: plan.installmentCount,
      },
      totalEligibleCount: eligibleStudents.length,
      readyToAllocateCount: readyToAllocate.length,
      alreadyAllocatedCount: alreadyAllocated.length,
      readyStudents: readyToAllocate,
      alreadyAllocatedStudents: alreadyAllocated,
    };
  }

  // Apply Fee Plan Group Allocation to all eligible unassigned students
  async applyFeePlan(tenantId: string, planId: string, recordedById: string) {
    const preview = await this.previewFeePlanAllocation(tenantId, planId);
    const plan = await this.prisma.feePlan.findFirst({
      where: { id: planId, tenantId },
      include: { academicYear: true },
    });

    if (!plan) {
      throw new NotFoundException('طرح شهریه یافت نشد');
    }

    if (preview.readyToAllocateCount === 0) {
      throw new BadRequestException('هیچ دانش‌آموز جدیدی برای اعمال این طرح شهریه وجود ندارد (تمام مشمولین دارای قرارداد هستند)');
    }

    const planAmount = new Prisma.Decimal(plan.amount);
    const installmentConfig = Array.isArray(plan.installmentConfig) ? (plan.installmentConfig as any[]) : [];
    const installmentCount = plan.installmentCount || 1;

    return this.prisma.$transaction(async (tx) => {
      let createdCount = 0;

      for (const st of preview.readyStudents) {
        const contractNumber = `FEE-${plan.academicYear.name.replace(/[^0-9]/g, '') || '1404'}-${Math.floor(1000 + Math.random() * 9000)}`;

        const contract = await tx.studentFeeContract.create({
          data: {
            tenantId,
            academicYearId: plan.academicYearId,
            studentId: st.studentId,
            contractNumber,
            totalAmount: planAmount,
            discountAmount: new Prisma.Decimal(0),
            finalPayableAmount: planAmount,
            balanceRemaining: planAmount,
            feePlanId: plan.id,
            isIndividual: false,
            status: 'ACTIVE',
          },
        });

        // Generate Installments
        if (installmentConfig.length > 0) {
          for (const item of installmentConfig) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + (item.dueMonthOffset || 0));
            const percent = (item.percentOrAmount || (100 / installmentConfig.length)) / 100;
            const instAmount = planAmount.times(percent);

            await tx.feeInstallment.create({
              data: {
                tenantId,
                contractId: contract.id,
                installmentNumber: item.number || 1,
                title: item.title || `قسط شماره ${item.number}`,
                dueDate,
                amount: instAmount,
                paidAmount: new Prisma.Decimal(0),
                status: 'UNPAID',
              },
            });
          }
        } else {
          // Evenly split installments
          const singleAmount = planAmount.dividedBy(installmentCount);
          for (let i = 0; i < installmentCount; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i * 2);

            await tx.feeInstallment.create({
              data: {
                tenantId,
                contractId: contract.id,
                installmentNumber: i + 1,
                title: i === 0 ? 'پیش‌پرداخت شهریه' : `قسط شماره ${i + 1}`,
                dueDate,
                amount: singleAmount,
                paidAmount: new Prisma.Decimal(0),
                status: 'UNPAID',
              },
            });
          }
        }

        createdCount++;
      }

      return {
        success: true,
        message: `طرح شهریه "${plan.title}" با موفقیت روی ${createdCount} دانش‌آموز اعمال گردید و همه آنها بدهکار شدند`,
        createdCount,
      };
    });
  }

  // ==========================================
  // 2. INDIVIDUAL CONTRACT CREATION
  // ==========================================

  async createContract(tenantId: string, dto: CreateFeeContractDto) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز مورد نظر یافت نشد');
    }

    const totalAmount = new Prisma.Decimal(dto.totalAmount);
    const discountAmount = new Prisma.Decimal(dto.discountAmount || 0);
    const finalPayableAmount = totalAmount.minus(discountAmount);

    if (finalPayableAmount.lessThan(0)) {
      throw new BadRequestException('مبلغ تخفیف نمی‌تواند بیشتر از کل مبلغ شهریه باشد');
    }

    // Validate installment sum
    const installmentsSum = dto.installments.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(installmentsSum - Number(finalPayableAmount)) > 1) {
      throw new BadRequestException(
        `مجموع اقساط (${installmentsSum.toLocaleString('fa-IR')}) با مبلغ نهایی قابل پرداخت (${Number(finalPayableAmount).toLocaleString('fa-IR')}) برابر نیست`,
      );
    }

    // Check unique contract number
    const existingNumber = await this.prisma.studentFeeContract.findUnique({
      where: {
        tenantId_contractNumber: {
          tenantId,
          contractNumber: dto.contractNumber,
        },
      },
    });
    if (existingNumber) {
      throw new ConflictException('شماره قرارداد تکراری است');
    }

    // Check unique per student/year
    const existingContract = await this.prisma.studentFeeContract.findUnique({
      where: {
        tenantId_academicYearId_studentId: {
          tenantId,
          academicYearId: dto.academicYearId,
          studentId: dto.studentId,
        },
      },
    });
    if (existingContract) {
      throw new ConflictException('قرارداد شهریه برای این دانش‌آموز در این سال تحصیلی قبلاً ثبت شده است');
    }

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.studentFeeContract.create({
        data: {
          tenantId,
          academicYearId: dto.academicYearId,
          studentId: dto.studentId,
          contractNumber: dto.contractNumber,
          totalAmount,
          discountAmount,
          finalPayableAmount,
          balanceRemaining: finalPayableAmount,
          discountReason: dto.discountReason,
          notes: dto.notes,
          feePlanId: dto.feePlanId,
          isIndividual: dto.isIndividual !== undefined ? dto.isIndividual : !dto.feePlanId,
          status: 'ACTIVE',
        },
      });

      for (const item of dto.installments) {
        await tx.feeInstallment.create({
          data: {
            tenantId,
            contractId: contract.id,
            installmentNumber: item.installmentNumber,
            title: item.title,
            dueDate: new Date(item.dueDate),
            amount: new Prisma.Decimal(item.amount),
            paidAmount: new Prisma.Decimal(0),
            status: 'UNPAID',
          },
        });
      }

      return tx.studentFeeContract.findUnique({
        where: { id: contract.id },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true, nationalId: true } } } },
          academicYear: { select: { name: true } },
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });
    });
  }

  // ==========================================
  // 3. CONTRACT DETAILS & LISTING
  // ==========================================

  async listContracts(
    tenantId: string,
    filters?: { academicYearId?: string; studentId?: string; hasHold?: boolean },
  ) {
    const where: Prisma.StudentFeeContractWhereInput = { tenantId };
    if (filters?.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.hasHold !== undefined) where.hasFinancialHold = filters.hasHold;

    return this.prisma.studentFeeContract.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true, nationalId: true } },
          },
        },
        academicYear: { select: { name: true } },
        feePlan: { select: { title: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: {
          select: { id: true, method: true, amount: true, checkStatus: true, recordedAt: true },
        },
        _count: { select: { receipts: true, transactions: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContractDetails(tenantId: string, contractId: string) {
    const contract = await this.prisma.studentFeeContract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true, nationalId: true } },
          },
        },
        academicYear: true,
        feePlan: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          include: {
            recordedBy: { select: { firstName: true, lastName: true } },
            checkStatusChangedBy: { select: { firstName: true, lastName: true } },
            replacedByPayment: true,
          },
          orderBy: { recordedAt: 'desc' },
        },
        receipts: {
          orderBy: { issuedAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('قرارداد شهریه مورد نظر یافت نشد');
    }

    const totalPaid = Number(contract.finalPayableAmount) - Number(contract.balanceRemaining);

    return {
      ...contract,
      summary: {
        totalAmount: contract.totalAmount,
        discountAmount: contract.discountAmount,
        finalPayableAmount: contract.finalPayableAmount,
        totalPaid,
        remainingBalance: contract.balanceRemaining,
        hasFinancialHold: contract.hasFinancialHold,
        financialHoldReason: contract.financialHoldReason,
        isFullyPaid: Number(contract.balanceRemaining) === 0,
      },
    };
  }

  // ==========================================
  // 4. PARENT PORTAL & MULTI-CHILD SUPPORT
  // ==========================================

  // Get Children linked to Parent
  async getParentChildren(tenantId: string, parentUserId: string) {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { userId: parentUserId, tenantId },
      include: {
        studentLinks: {
          include: {
            student: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, nationalId: true } },
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { classroom: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('پروفایل اولیا برای این حساب کاربری یافت نشد');
    }

    return parent.studentLinks.map((link) => ({
      studentId: link.student.id,
      relationType: link.relationType,
      firstName: link.student.user.firstName,
      lastName: link.student.user.lastName,
      nationalId: link.student.user.nationalId,
      classroomName: link.student.enrollments[0]?.classroom?.name || 'تعیین نشده',
    }));
  }

  // Get Parent Fee Overview with Multi-Child selection
  async getParentFeeOverview(tenantId: string, parentUserId: string, targetStudentId?: string) {
    const children = await this.getParentChildren(tenantId, parentUserId);

    if (children.length === 0) {
      throw new NotFoundException('هیچ پرونده دانش‌آموزی متصل به این حساب ولی یافت نشد');
    }

    const selectedChild = targetStudentId
      ? children.find((c) => c.studentId === targetStudentId) || children[0]
      : children[0];

    const contracts = await this.prisma.studentFeeContract.findMany({
      where: { tenantId, studentId: selectedChild.studentId },
      include: {
        academicYear: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: {
          orderBy: { recordedAt: 'desc' },
        },
        receipts: { orderBy: { issuedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      children,
      selectedChild,
      contracts,
    };
  }

  // Get Student Fee Contracts Overview for Student Portal
  async getStudentContractsOverview(tenantId: string, userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) {
      return [];
    }
    return this.prisma.studentFeeContract.findMany({
      where: { tenantId, studentId: student.id },
      include: {
        academicYear: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: {
          orderBy: { recordedAt: 'desc' },
        },
        receipts: { orderBy: { issuedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
