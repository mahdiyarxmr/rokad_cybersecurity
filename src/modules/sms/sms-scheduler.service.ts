import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SmsService } from './sms.service';

@Injectable()
export class SmsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly smsService: SmsService) {}

  onModuleInit() {
    this.logger.log('SmsSchedulerService initialized. Starting automated background timers...');
    // Run an initial lightweight scan 10 seconds after startup
    setTimeout(() => {
      this.runDailyAutomationJobs().catch((err) =>
        this.logger.error(`Initial automation run error: ${err.message}`),
      );
    }, 10000);

    // Schedule hourly periodic tick
    this.timer = setInterval(
      () => {
        this.runDailyAutomationJobs().catch((err) =>
          this.logger.error(`Periodic automation run error: ${err.message}`),
        );
      },
      1000 * 60 * 60, // Every 1 hour
    );
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Daily scheduler logic (executed hourly to check hour matches)
   */
  async runDailyAutomationJobs(force = false) {
    const now = new Date();
    const currentHour = now.getHours();

    // Unless forced, only execute the daily reminder jobs at 09:00 AM
    if (!force && currentHour !== 9) {
      this.logger.debug(
        `Skipping automated SMS scan (current hour is ${currentHour}, scheduled for 09:00 AM).`,
      );
      return;
    }

    this.logger.log(`Running daily scheduled SMS automation at hour ${currentHour}:00...`);

    // 1. Cheque Due Reminder Scan
    try {
      const chequeRes = await this.smsService.processChequeDueReminders();
      this.logger.log(`Cheque reminder scan complete: ${chequeRes.sentCount} SMS sent.`);
    } catch (err: any) {
      this.logger.error(`Error in cheque due automation: ${err.message}`);
    }

    // 2. Birthday Greetings Scan
    try {
      const bdayRes = await this.smsService.processBirthdayGreetings();
      this.logger.log(`Birthday greeting scan complete: ${bdayRes.sentCount} SMS sent.`);
    } catch (err: any) {
      this.logger.error(`Error in birthday automation: ${err.message}`);
    }
  }
}
