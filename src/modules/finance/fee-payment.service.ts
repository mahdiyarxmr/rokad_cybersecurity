import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, CheckStatus, PaymentMethod } from '@prisma/client';
import {
  RecordCashPaymentDto,
  RecordChequePaymentDto,
  UpdateChequeStatusDto,
} from './dto/record-fee-payment.dto';

@Injectable()
export class FeePaymentService {
  private readonly logger = new Logger(FeePaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 1. Record Cash Payment (Immediately decreases balanceRemaining and issues receipt)
  async recordCashPayment(
    tenantId: string,
    recordedById: string,
    dto: RecordCashPaymentDto,
  ) {
    const contract = await this.prisma.studentFeeContract.findFirst({
      where: { id: dto.contractId, tenantId },
      include: {
        student: { include: { user: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!contract) {
      throw new NotFoundException('قرارداد شهریه مورد نظر یافت نشد');
    }

    const payAmount = new Prisma.Decimal(dto.amount);
    const balanceRemaining = new Prisma.Decimal(contract.balanceRemaining);

    if (payAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مبلغ پرداختی باید بزرگتر از صفر باشد');
    }

    if (payAmount.greaterThan(balanceRemaining)) {
      throw new BadRequestException(
        `مبلغ پرداختی (${Number(payAmount).toLocaleString('fa-IR')}) نمی‌تواند بیشتر از مانده بدهی قرارداد (${Number(balanceRemaining).toLocaleString('fa-IR')}) باشد`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create FeePayment record
      const payment = await tx.feePayment.create({
        data: {
          tenantId,
          feeContractId: contract.id,
          installmentId: dto.installmentId,
          method: PaymentMethod.CASH,
          amount: payAmount,
          cashReceivedAt: dto.cashReceivedAt ? new Date(dto.cashReceivedAt) : new Date(),
          recordedById,
          note: dto.note,
        },
      });

      // Update Installment if specified or auto-distribute
      if (dto.installmentId) {
        const inst = await tx.feeInstallment.findFirst({
          where: { id: dto.installmentId, contractId: contract.id },
        });
        if (inst) {
          const newPaid = new Prisma.Decimal(inst.paidAmount).add(payAmount);
          const instAmount = new Prisma.Decimal(inst.amount);
          const newStatus = newPaid.greaterThanOrEqualTo(instAmount) ? 'PAID' : 'PARTIALLY_PAID';
          await tx.feeInstallment.update({
            where: { id: inst.id },
            data: {
              paidAmount: newPaid,
              status: newStatus,
              paidAt: newStatus === 'PAID' ? new Date() : inst.paidAt,
            },
          });
        }
      }

      // Update Contract balanceRemaining
      const newContractBalance = balanceRemaining.minus(payAmount);
      const isFullySettled = newContractBalance.equals(0);

      await tx.studentFeeContract.update({
        where: { id: contract.id },
        data: {
          balanceRemaining: newContractBalance,
          status: isFullySettled ? 'COMPLETED' : contract.status,
        },
      });

      // Issue Official Fee Receipt
      const receiptNumber = `REC-CSH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const payerName = contract.student?.user
        ? `${contract.student.user.firstName} ${contract.student.user.lastName}`
        : 'پرداخت‌کننده محترم';

      const receipt = await tx.feeReceipt.create({
        data: {
          tenantId,
          contractId: contract.id,
          paymentId: payment.id,
          receiptNumber,
          amount: payAmount,
          payerName,
          paymentMethod: PaymentMethod.CASH,
          issuedById: recordedById,
        },
      });

      return {
        payment,
        receipt,
        remainingBalance: newContractBalance,
      };
    });
  }

  // 2. Record Cheque Payment (Registered as PENDING, DOES NOT reduce balanceRemaining)
  async recordChequePayment(
    tenantId: string,
    recordedById: string,
    dto: RecordChequePaymentDto,
  ) {
    const contract = await this.prisma.studentFeeContract.findFirst({
      where: { id: dto.contractId, tenantId },
      include: {
        student: { include: { user: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('قرارداد شهریه مورد نظر یافت نشد');
    }

    if (!/^\d{16}$/.test(dto.checkSayadId)) {
      throw new BadRequestException('کد صیادی باید دقیقاً ۱۶ رقم عددی باشد');
    }

    // Check duplicate checkSayadId in tenant
    const existingSayad = await this.prisma.feePayment.findFirst({
      where: {
        tenantId,
        checkSayadId: dto.checkSayadId,
      },
    });

    if (existingSayad) {
      throw new ConflictException(`چک با کد صیادی ${dto.checkSayadId} قبلاً در سیستم ثبت شده است`);
    }

    const chequeAmount = new Prisma.Decimal(dto.amount);
    if (chequeAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مبلغ چک باید بزرگتر از صفر باشد');
    }

    const payment = await this.prisma.feePayment.create({
      data: {
        tenantId,
        feeContractId: contract.id,
        installmentId: dto.installmentId,
        method: PaymentMethod.CHEQUE,
        amount: chequeAmount,
        checkNumber: dto.checkNumber,
        checkSayadId: dto.checkSayadId,
        bankName: dto.bankName,
        branchName: dto.branchName,
        checkOwnerName: dto.checkOwnerName,
        checkDueDate: new Date(dto.checkDueDate),
        checkStatus: CheckStatus.PENDING,
        recordedById,
        note: dto.note,
      },
      include: {
        feeContract: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    return payment;
  }

  // 3. Update Cheque Status (CASHED, BOUNCED, REPLACED)
  async updateChequeStatus(
    tenantId: string,
    paymentId: string,
    changedById: string,
    dto: UpdateChequeStatusDto,
  ) {
    const cheque = await this.prisma.feePayment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        feeContract: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    if (!cheque) {
      throw new NotFoundException('برگه چک مورد نظر یافت نشد');
    }

    if (cheque.method !== PaymentMethod.CHEQUE) {
      throw new BadRequestException('رکورد مورد نظر از نوع چک نمی‌باشد');
    }

    if (cheque.checkStatus === CheckStatus.CASHED && dto.status !== CheckStatus.CASHED) {
      throw new BadRequestException('چک وصول‌شده را نمی‌توان به وضعیت دیگری تغییر داد');
    }

    const contract = cheque.feeContract;
    const chequeAmount = new Prisma.Decimal(cheque.amount);
    const currentBalance = new Prisma.Decimal(contract.balanceRemaining);

    return this.prisma.$transaction(async (tx) => {
      let replacedPaymentId: string | null = null;

      // CASE A: Cheque is CASHED (Reduce debt now!)
      if (dto.status === CheckStatus.CASHED && cheque.checkStatus !== CheckStatus.CASHED) {
        const newBalance = currentBalance.minus(chequeAmount);
        const finalBalance = newBalance.lessThan(0) ? new Prisma.Decimal(0) : newBalance;

        // Check if there are other BOUNCED cheques on this contract
        const otherBounced = await tx.feePayment.findFirst({
          where: {
            tenantId,
            feeContractId: contract.id,
            id: { not: cheque.id },
            checkStatus: CheckStatus.BOUNCED,
          },
        });

        await tx.studentFeeContract.update({
          where: { id: contract.id },
          data: {
            balanceRemaining: finalBalance,
            hasFinancialHold: !!otherBounced,
            financialHoldReason: otherBounced ? contract.financialHoldReason : null,
            status: finalBalance.equals(0) ? 'COMPLETED' : contract.status,
          },
        });

        // Update installment if linked
        if (cheque.installmentId) {
          const inst = await tx.feeInstallment.findFirst({
            where: { id: cheque.installmentId },
          });
          if (inst) {
            const newPaid = new Prisma.Decimal(inst.paidAmount).add(chequeAmount);
            const instAmount = new Prisma.Decimal(inst.amount);
            const newStatus = newPaid.greaterThanOrEqualTo(instAmount) ? 'PAID' : 'PARTIALLY_PAID';
            await tx.feeInstallment.update({
              where: { id: inst.id },
              data: {
                paidAmount: newPaid,
                status: newStatus,
                paidAt: newStatus === 'PAID' ? new Date() : inst.paidAt,
              },
            });
          }
        }

        // Issue official receipt
        const receiptNumber = `REC-CHQ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const payerName = contract.student?.user
          ? `${contract.student.user.firstName} ${contract.student.user.lastName}`
          : 'صاحب چک';

        await tx.feeReceipt.create({
          data: {
            tenantId,
            contractId: contract.id,
            paymentId: cheque.id,
            receiptNumber,
            amount: chequeAmount,
            payerName,
            paymentMethod: PaymentMethod.CHEQUE,
            issuedById: changedById,
          },
        });
      }

      // CASE B: Cheque is BOUNCED (Do not reduce debt, activate Financial Hold!)
      else if (dto.status === CheckStatus.BOUNCED) {
        await tx.studentFeeContract.update({
          where: { id: contract.id },
          data: {
            hasFinancialHold: true,
            financialHoldReason: `برگشت چک صیادی به شماره ${cheque.checkNumber || cheque.checkSayadId} به مبلغ ${Number(chequeAmount).toLocaleString('fa-IR')} تومان عهده بانک ${cheque.bankName || ''}`,
          },
        });

        this.eventEmitter.emit('fee.cheque.bounced', {
          tenantId,
          contractId: contract.id,
          chequeId: cheque.id,
          studentName: contract.student?.user ? `${contract.student.user.firstName} ${contract.student.user.lastName}` : '',
          amount: Number(chequeAmount),
          checkNumber: cheque.checkNumber,
          sayadId: cheque.checkSayadId,
        });
      }

      // CASE C: Cheque is REPLACED (Create replacement record & track chain via replacedByPaymentId)
      else if (dto.status === CheckStatus.REPLACED) {
        if (dto.replacementCheque) {
          const newChq = await tx.feePayment.create({
            data: {
              tenantId,
              feeContractId: contract.id,
              installmentId: dto.replacementCheque.installmentId || cheque.installmentId,
              method: PaymentMethod.CHEQUE,
              amount: new Prisma.Decimal(dto.replacementCheque.amount),
              checkNumber: dto.replacementCheque.checkNumber,
              checkSayadId: dto.replacementCheque.checkSayadId,
              bankName: dto.replacementCheque.bankName,
              branchName: dto.replacementCheque.branchName,
              checkOwnerName: dto.replacementCheque.checkOwnerName,
              checkDueDate: new Date(dto.replacementCheque.checkDueDate),
              checkStatus: CheckStatus.PENDING,
              recordedById: changedById,
              note: `جایگزین چک برگشتی شماره ${cheque.checkNumber}`,
            },
          });
          replacedPaymentId = newChq.id;
        } else if (dto.replacementCash) {
          const cashAmount = new Prisma.Decimal(dto.replacementCash.amount);
          const newCash = await tx.feePayment.create({
            data: {
              tenantId,
              feeContractId: contract.id,
              installmentId: dto.replacementCash.installmentId || cheque.installmentId,
              method: PaymentMethod.CASH,
              amount: cashAmount,
              cashReceivedAt: dto.replacementCash.cashReceivedAt ? new Date(dto.replacementCash.cashReceivedAt) : new Date(),
              recordedById: changedById,
              note: `تسویه نقدی جایگزین چک شماره ${cheque.checkNumber}`,
            },
          });
          replacedPaymentId = newCash.id;

          // Deduct from balance since cash is immediately settled
          const newBalance = currentBalance.minus(cashAmount);
          const finalBalance = newBalance.lessThan(0) ? new Prisma.Decimal(0) : newBalance;
          await tx.studentFeeContract.update({
            where: { id: contract.id },
            data: {
              balanceRemaining: finalBalance,
              status: finalBalance.equals(0) ? 'COMPLETED' : contract.status,
            },
          });

          // Issue receipt for cash
          const receiptNumber = `REC-CSH-REP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          await tx.feeReceipt.create({
            data: {
              tenantId,
              contractId: contract.id,
              paymentId: newCash.id,
              receiptNumber,
              amount: cashAmount,
              payerName: contract.student?.user ? `${contract.student.user.firstName} ${contract.student.user.lastName}` : 'ولی دانش‌آموز',
              paymentMethod: PaymentMethod.CASH,
              issuedById: changedById,
            },
          });
        }

        // Check remaining bounced cheques
        const remainingBounced = await tx.feePayment.findFirst({
          where: {
            tenantId,
            feeContractId: contract.id,
            id: { not: cheque.id },
            checkStatus: CheckStatus.BOUNCED,
          },
        });
        if (!remainingBounced) {
          await tx.studentFeeContract.update({
            where: { id: contract.id },
            data: {
              hasFinancialHold: false,
              financialHoldReason: null,
            },
          });
        }
      }

      // Update original cheque record
      const updatedCheque = await tx.feePayment.update({
        where: { id: cheque.id },
        data: {
          checkStatus: dto.status,
          checkStatusChangedAt: new Date(),
          checkStatusChangedById: changedById,
          note: dto.note ? `${cheque.note || ''} | ${dto.note}`.trim() : cheque.note,
          replacedByPaymentId: replacedPaymentId,
        },
        include: {
          replacedByPayment: true,
          receipt: true,
          checkStatusChangedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return updatedCheque;
    });
  }

  // 4. List Cheques with filtering and search
  async listCheques(
    tenantId: string,
    filters?: {
      status?: CheckStatus;
      search?: string;
      studentId?: string;
      fromDueDate?: string;
      toDueDate?: string;
    },
  ) {
    const where: Prisma.FeePaymentWhereInput = {
      tenantId,
      method: PaymentMethod.CHEQUE,
    };

    if (filters?.status) {
      where.checkStatus = filters.status;
    }

    if (filters?.studentId) {
      where.feeContract = { studentId: filters.studentId };
    }

    if (filters?.fromDueDate || filters?.toDueDate) {
      where.checkDueDate = {};
      if (filters.fromDueDate) {
        where.checkDueDate.gte = new Date(filters.fromDueDate);
      }
      if (filters.toDueDate) {
        where.checkDueDate.lte = new Date(filters.toDueDate);
      }
    }

    if (filters?.search) {
      where.OR = [
        { checkNumber: { contains: filters.search, mode: 'insensitive' } },
        { checkSayadId: { contains: filters.search } },
        { bankName: { contains: filters.search, mode: 'insensitive' } },
        { checkOwnerName: { contains: filters.search, mode: 'insensitive' } },
        {
          feeContract: {
            student: {
              user: {
                OR: [
                  { firstName: { contains: filters.search, mode: 'insensitive' } },
                  { lastName: { contains: filters.search, mode: 'insensitive' } },
                  { nationalId: { contains: filters.search } },
                ],
              },
            },
          },
        },
      ];
    }

    return this.prisma.feePayment.findMany({
      where,
      include: {
        feeContract: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true, nationalId: true } },
              },
            },
          },
        },
        installment: true,
        recordedBy: { select: { firstName: true, lastName: true } },
        checkStatusChangedBy: { select: { firstName: true, lastName: true } },
        replacedByPayment: true,
        receipt: true,
      },
      orderBy: { checkDueDate: 'asc' },
    });
  }

  // 5. Cheque Ledger Summary Statistics
  async getChequeStats(tenantId: string) {
    const cheques = await this.prisma.feePayment.findMany({
      where: { tenantId, method: PaymentMethod.CHEQUE },
      select: { checkStatus: true, amount: true, checkDueDate: true },
    });

    const now = new Date();
    const threeDaysLater = new Date(Date.now() + 3 * 86400000);

    const stats = {
      totalCount: cheques.length,
      totalAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      cashedCount: 0,
      cashedAmount: 0,
      bouncedCount: 0,
      bouncedAmount: 0,
      replacedCount: 0,
      replacedAmount: 0,
      dueSoonCount: 0, // due in next 3 days and PENDING
    };

    for (const chq of cheques) {
      const amt = Number(chq.amount);
      stats.totalAmount += amt;

      if (chq.checkStatus === CheckStatus.PENDING) {
        stats.pendingCount++;
        stats.pendingAmount += amt;
        if (chq.checkDueDate && chq.checkDueDate >= now && chq.checkDueDate <= threeDaysLater) {
          stats.dueSoonCount++;
        }
      } else if (chq.checkStatus === CheckStatus.CASHED) {
        stats.cashedCount++;
        stats.cashedAmount += amt;
      } else if (chq.checkStatus === CheckStatus.BOUNCED) {
        stats.bouncedCount++;
        stats.bouncedAmount += amt;
      } else if (chq.checkStatus === CheckStatus.REPLACED) {
        stats.replacedCount++;
        stats.replacedAmount += amt;
      }
    }

    return stats;
  }
}
