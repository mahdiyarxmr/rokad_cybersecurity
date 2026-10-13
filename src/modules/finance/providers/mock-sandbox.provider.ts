import { Injectable } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  PaymentRequestOptions,
  PaymentRequestResult,
  PaymentVerifyOptions,
  PaymentVerifyResult,
} from './payment-gateway.interface';

@Injectable()
export class MockSandboxPaymentProvider implements PaymentGatewayProvider {
  readonly gatewayName = 'MOCK_SANDBOX';

  async requestPayment(
    options: PaymentRequestOptions,
  ): Promise<PaymentRequestResult> {
    const authority = `MOCK-AUTH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const paymentUrl = `https://mock-gateway.rokadschool.ir/pay/${authority}`;

    return {
      authority,
      paymentUrl,
      rawResponse: { simulated: true, amount: options.amount },
    };
  }

  async verifyPayment(
    options: PaymentVerifyOptions,
  ): Promise<PaymentVerifyResult> {
    if (options.authority.includes('FAIL')) {
      return {
        isSuccess: false,
        code: -1,
        message: 'شبیه‌سازی تراکنش ناموفق',
        rawResponse: { simulated: true, success: false },
      };
    }

    const refId = `REF-MOCK-${Date.now()}`;
    return {
      isSuccess: true,
      refId,
      cardPan: '502229******4321',
      code: 100,
      message: 'تراکنش با موفقیت شبیه‌سازی شد',
      rawResponse: { simulated: true, refId },
    };
  }
}
