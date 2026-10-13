import { Module } from '@nestjs/common';
import { FeeService } from './fee.service';
import { FeeController } from './fee.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { FeePaymentService } from './fee-payment.service';
import { FeePaymentController } from './fee-payment.controller';
import { FeeImportService } from './fee-import.service';
import { FeeImportController } from './fee-import.controller';
import { ChequeReminderScheduler } from './cheque-reminder.scheduler';
import { ZarinpalPaymentProvider } from './providers/zarinpal.provider';
import { MockSandboxPaymentProvider } from './providers/mock-sandbox.provider';
import { PAYMENT_GATEWAY_PROVIDER } from './providers/payment-gateway.interface';

@Module({
  controllers: [
    FeeController,
    PaymentController,
    FeePaymentController,
    FeeImportController,
  ],
  providers: [
    FeeService,
    PaymentService,
    FeePaymentService,
    FeeImportService,
    ChequeReminderScheduler,
    ZarinpalPaymentProvider,
    MockSandboxPaymentProvider,
    {
      provide: PAYMENT_GATEWAY_PROVIDER,
      useClass: ZarinpalPaymentProvider,
    },
  ],
  exports: [
    FeeService,
    PaymentService,
    FeePaymentService,
    FeeImportService,
    PAYMENT_GATEWAY_PROVIDER,
  ],
})
export class FinanceModule {}
