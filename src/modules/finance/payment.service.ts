import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  PAYMENT_GATEWAY_PROVIDER,
  PaymentGatewayProvider,
} from './providers/payment-gateway.interface';
import {
  InitiateOnlinePaymentDto,
  VerifyPaymentDto,
  RecordOfflinePaymentDto,
} from './dto/initiate-payment.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY_PROVIDER)
    private readonly gatewayProvider: PaymentGatewayProvider,
  ) {}

  // 1. Initiate Online Payment
  async initiateOnlinePayment(
    tenantId: string,
    payerUserId: string,
    dto: InitiateOnlinePaymentDto,
  ) {
    const installment = await this.prisma.feeInstallment.findFirst({
      where: { id: dto.installmentId, tenantId },
      include: {
        contract: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!installment) {
      throw new NotFoundException('قسط شهریه مورد نظر یافت نشد');
    }

    if (installment.status === 'PAID') {
      throw new BadRequestException('این قسط قبلاً به طور کامل تسویه شده است');
    }

    // Crucial: Recalculate remaining amount strictly on server-side
    const instAmt = new Prisma.Decimal(installment.amount);
    const paidAmt = new Prisma.Decimal(installment.paidAmount);
    const remainingAmount = instAmt.minus(paidAmt);
    if (remainingAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مبلغ مانده این قسط صفر است');
    }

    const trackingCode = `TRK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const description = `پرداخت ${installment.title} - دانش‌آموز ${installment.contract.student.user.firstName} ${installment.contract.student.user.lastName}`;
    const callbackUrl =
      dto.callbackUrl ||
      `http://localhost:4000/api/v1/finance/payments/verify?tenantId=${tenantId}`;

    // Create append-only transaction in PENDING state
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        tenantId,
        contractId: installment.contractId,
        installmentId: installment.id,
        payerUserId,
        gateway: dto.gateway || 'ZARINPAL',
        method: 'ONLINE_GATEWAY',
        amount: remainingAmount,
        status: 'PENDING',
        trackingCode,
        idempotencyKey: randomUUID(),
      },
    });

    // Request payment from gateway
    const gatewayResult = await this.gatewayProvider.requestPayment({
      tenantId,
      amount: Number(remainingAmount),
      description,
      callbackUrl,
      mobile: installment.contract.student.user.phone || undefined,
    });

    // Update transaction with gateway authority
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        authority: gatewayResult.authority,
        gatewayRequestPayload: {
          amount: Number(remainingAmount),
          callbackUrl,
          description,
        },
        gatewayResponsePayload: gatewayResult.rawResponse,
      },
    });

    return {
      trackingCode,
      authority: gatewayResult.authority,
      paymentUrl: gatewayResult.paymentUrl,
      amount: remainingAmount,
    };
  }

  // 2. Verify Payment Callback with Distributed Idempotency Lock
  async verifyPayment(tenantId: string, dto: VerifyPaymentDto) {
    const lockKey = `lock:verify:${dto.authority}`;

    // Redis distributed lock for idempotency
    const redis = this.redisService.getClient();
    if (redis) {
      const acquired = await redis.set(lockKey, 'locked', 'EX', 30, 'NX');
      if (!acquired) {
        // Another concurrent callback is processing this authority right now
        this.logger.warn(`Concurrent duplicate verification blocked for authority: ${dto.authority}`);
        // Return existing transaction status
        const existingTx = await this.prisma.paymentTransaction.findFirst({
          where: { authority: dto.authority, tenantId },
          include: { receipt: true },
        });
        if (existingTx && existingTx.status === 'SUCCESSFUL') {
          return {
            success: true,
            message: 'تراکنش قبلاً با موفقیت تایید شده است',
            receipt: existingTx.receipt,
          };
        }
      }
    }

    try {
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: { authority: dto.authority, tenantId },
        include: {
          installment: true,
          contract: {
            include: {
              student: {
                include: { user: { select: { firstName: true, lastName: true } } },
              },
            },
          },
        },
      });

      if (!transaction) {
        throw new NotFoundException('تراکنش مالی با این شناسه مرجع یافت نشد');
      }

      // Idempotency: If already SUCCESSFUL, return existing receipt safely
      if (transaction.status === 'SUCCESSFUL') {
        const existingReceipt = await this.prisma.feeReceipt.findUnique({
          where: { transactionId: transaction.id },
        });
        return {
          success: true,
          message: 'تراکنش قبلاً تایید شده است',
          receipt: existingReceipt,
          transaction,
        };
      }

      // Check if gateway returned NOK
      if (dto.status && dto.status.toUpperCase() === 'NOK') {
        await this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            errorMessage: 'تراکنش توسط کاربر در درگاه پرداخت لغو گردید',
          },
        });
        throw new BadRequestException('پرداخت توسط کاربر لغو گردید');
      }

      // Call Gateway Verify API server-side
      const verifyResult = await this.gatewayProvider.verifyPayment({
        authority: dto.authority,
        amount: Number(transaction.amount),
      });

      if (!verifyResult.isSuccess) {
        await this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            errorMessage: verifyResult.message || 'خطا در اعتبارسنجی درگاه',
            gatewayResponsePayload: verifyResult.rawResponse,
          },
        });
        throw new BadRequestException(
          verifyResult.message || 'تایید تراکنش در درگاه پرداخت ناموفق بود',
        );
      }

      // Atomic Execution: Mark transaction SUCCESSFUL, update Installment & issue Receipt
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Update Transaction
        const updatedTx = await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'SUCCESSFUL',
            refId: verifyResult.refId,
            cardPan: verifyResult.cardPan,
            verifiedAt: new Date(),
            gatewayResponsePayload: verifyResult.rawResponse,
          },
        });

        // 2. Update Fee Installment & Contract Balance
        const txAmount = new Prisma.Decimal(transaction.amount);

        if (transaction.installmentId) {
          const inst = await tx.feeInstallment.findUnique({
            where: { id: transaction.installmentId },
          });
          if (inst) {
            const newPaidAmount = new Prisma.Decimal(inst.paidAmount).add(txAmount);
            const instAmount = new Prisma.Decimal(inst.amount);
            const newStatus =
              newPaidAmount.greaterThanOrEqualTo(instAmount) ? 'PAID' : 'PARTIALLY_PAID';

            await tx.feeInstallment.update({
              where: { id: inst.id },
              data: {
                paidAmount: newPaidAmount,
                status: newStatus,
                paidAt: newStatus === 'PAID' ? new Date() : inst.paidAt,
              },
            });
          }
        }

        if (transaction.contractId) {
          const contract = await tx.studentFeeContract.findUnique({
            where: { id: transaction.contractId },
          });
          if (contract) {
            const currentBal = new Prisma.Decimal(contract.balanceRemaining);
            const newBal = currentBal.minus(txAmount);
            const finalBal = newBal.lessThan(0) ? new Prisma.Decimal(0) : newBal;
            await tx.studentFeeContract.update({
              where: { id: contract.id },
              data: {
                balanceRemaining: finalBal,
                status: finalBal.equals(0) ? 'COMPLETED' : contract.status,
              },
            });
          }
        }

        // 3. Issue Fee Receipt
        const receiptNumber = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const payerName = transaction.contract?.student?.user
          ? `${transaction.contract.student.user.firstName} ${transaction.contract.student.user.lastName}`
          : 'پرداخت‌کننده محترم';

        const receipt = await tx.feeReceipt.create({
          data: {
            tenantId,
            transactionId: updatedTx.id,
            contractId: transaction.contractId!,
            receiptNumber,
            amount: transaction.amount,
            payerName,
            paymentMethod: 'ONLINE_GATEWAY',
          },
        });

        return { transaction: updatedTx, receipt };
      });

      this.eventEmitter.emit('fee.payment.success', {
        tenantId,
        transactionId: result.transaction.id,
        receiptNumber: result.receipt.receiptNumber,
        amount: result.transaction.amount,
      });

      return {
        success: true,
        message: 'پرداخت و اعتبارسنجی با موفقیت انجام شد و رسید صادر گردید',
        receipt: result.receipt,
        refId: verifyResult.refId,
        cardPan: verifyResult.cardPan,
      };
    } finally {
      if (redis) {
        await redis.del(lockKey);
      }
    }
  }

  // 3. Record Offline Payment (POS, Cash, Cheque, Transfer)
  async recordOfflinePayment(
    tenantId: string,
    recordedById: string,
    dto: RecordOfflinePaymentDto,
  ) {
    const installment = await this.prisma.feeInstallment.findFirst({
      where: { id: dto.installmentId, tenantId },
      include: {
        contract: {
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });

    if (!installment) {
      throw new NotFoundException('قسط مورد نظر یافت نشد');
    }

    if (installment.status === 'PAID') {
      throw new BadRequestException('این قسط قبلاً تسویه شده است');
    }

    const instAmount = new Prisma.Decimal(installment.amount);
    const paidAmount = new Prisma.Decimal(installment.paidAmount);
    const remainingAmount = instAmount.minus(paidAmount);
    const trackingCode = `OFF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.create({
        data: {
          tenantId,
          contractId: installment.contractId,
          installmentId: installment.id,
          payerUserId: recordedById,
          gateway: 'MANUAL_OFFLINE',
          method: dto.method,
          amount: remainingAmount,
          status: 'SUCCESSFUL',
          refId: dto.referenceNumber,
          trackingCode,
          verifiedAt: new Date(),
          errorMessage: dto.notes,
        },
      });

      await tx.feeInstallment.update({
        where: { id: installment.id },
        data: {
          paidAmount: installment.amount,
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Update contract balance
      const contract = await tx.studentFeeContract.findUnique({
        where: { id: installment.contractId },
      });
      if (contract) {
        const curBal = new Prisma.Decimal(contract.balanceRemaining);
        const newBal = curBal.minus(remainingAmount);
        const finalBal = newBal.lessThan(0) ? new Prisma.Decimal(0) : newBal;
        await tx.studentFeeContract.update({
          where: { id: contract.id },
          data: {
            balanceRemaining: finalBal,
            status: finalBal.equals(0) ? 'COMPLETED' : contract.status,
          },
        });
      }

      const receiptNumber = `REC-OFF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const payerName = `${installment.contract.student.user.firstName} ${installment.contract.student.user.lastName}`;

      const receipt = await tx.feeReceipt.create({
        data: {
          tenantId,
          transactionId: transaction.id,
          contractId: installment.contractId,
          receiptNumber,
          amount: remainingAmount,
          payerName,
          paymentMethod: dto.method,
          issuedById: recordedById,
        },
      });

      return { transaction, receipt };
    });
  }

  // 4. List Receipts
  async listReceipts(tenantId: string, contractId?: string) {
    const where: any = { tenantId };
    if (contractId) where.contractId = contractId;

    return this.prisma.feeReceipt.findMany({
      where,
      include: {
        contract: {
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        transaction: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
