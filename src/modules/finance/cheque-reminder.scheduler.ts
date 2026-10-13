import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class ChequeReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChequeReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.scheduleDailyRun();
    this.logger.log('Cheque maturity reminder scheduler initialized (daily at 09:00 AM).');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleDailyRun() {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(9, 0, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const msUntilNext = next.getTime() - now.getTime();
      this.timer = setTimeout(async () => {
        try {
          await this.handleDailyChequeReminders();
        } catch (err: any) {
          this.logger.error(`Cheque reminder job failed: ${err?.message}`);
        }
        scheduleNext();
      }, msUntilNext);
    };

    scheduleNext();
  }

  async handleDailyChequeReminders() {
    this.logger.log('Executing daily cheque maturity reminder job...');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Target windows:
    // Window 0: Today (0 days left)
    const todayStart = new Date(now);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Window 1: Tomorrow (1 day left)
    const tomorrowStart = new Date(now.getTime() + 86400000);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Window 3: 3 days ahead
    const threeDaysStart = new Date(now.getTime() + 3 * 86400000);
    const threeDaysEnd = new Date(threeDaysStart);
    threeDaysEnd.setHours(23, 59, 59, 999);

    // Find pending cheques maturing in these windows
    const pendingCheques = await this.prisma.feePayment.findMany({
      where: {
        method: PaymentMethod.CHEQUE,
        checkStatus: CheckStatus.PENDING,
        checkDueDate: {
          gte: todayStart,
          lte: threeDaysEnd,
        },
      },
      include: {
        feeContract: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true } },
                parentLinks: {
                  include: {
                    parent: {
                      include: {
                        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
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

    if (pendingCheques.length === 0) {
      this.logger.log('No pending cheques due for reminder today.');
      return;
    }

    let notificationsDispatched = 0;

    for (const cheque of pendingCheques) {
      if (!cheque.checkDueDate) continue;

      const dueTime = new Date(cheque.checkDueDate).getTime();
      let daysRemaining: number | null = null;

      if (dueTime >= todayStart.getTime() && dueTime <= todayEnd.getTime()) {
        daysRemaining = 0;
      } else if (dueTime >= tomorrowStart.getTime() && dueTime <= tomorrowEnd.getTime()) {
        daysRemaining = 1;
      } else if (dueTime >= threeDaysStart.getTime() && dueTime <= threeDaysEnd.getTime()) {
        daysRemaining = 3;
      }

      if (daysRemaining === null) continue;

      const parents = cheque.feeContract?.student?.parentLinks?.map((l) => l.parent.user) || [];
      const studentName = `${cheque.feeContract?.student?.user?.firstName || ''} ${cheque.feeContract?.student?.user?.lastName || ''}`.trim();
      const amountStr = Number(cheque.amount).toLocaleString('fa-IR');

      let message = '';
      if (daysRemaining === 0) {
        message = `امروز سررسید چک شماره ${cheque.checkNumber || ''} به مبلغ ${amountStr} تومان (دانش‌آموز: ${studentName}) است. لطفاً از کافی بودن موجودی حساب اطمینان حاصل فرمایید.`;
      } else if (daysRemaining === 1) {
        message = `فردا سررسید چک شماره ${cheque.checkNumber || ''} به مبلغ ${amountStr} تومان (دانش‌آموز: ${studentName}) عهده بانک ${cheque.bankName || ''} است.`;
      } else if (daysRemaining === 3) {
        message = `چک شماره ${cheque.checkNumber || ''} به مبلغ ${amountStr} تومان (دانش‌آموز: ${studentName})، ۳ روز دیگر سررسید می‌شود.`;
      }

      for (const parent of parents) {
        // Emit non-blocking event for Notifications module & WebPush
        this.eventEmitter.emit('notification.send', {
          tenantId: cheque.tenantId,
          targetUserId: parent.id,
          title: 'یادآوری سررسید چک شهریه',
          body: message,
          type: 'FEE',
          badge: daysRemaining === 0 ? 'destructive' : 'warning',
          targetUrl: '/app/parent/fees',
        });
        notificationsDispatched++;
      }
    }

    this.logger.log(`Cheque reminder job completed: ${notificationsDispatched} notifications sent for ${pendingCheques.length} maturing cheques.`);
  }
}
