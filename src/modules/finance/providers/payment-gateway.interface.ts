export interface PaymentRequestOptions {
  tenantId: string;
  amount: number; // in Tomans or Rials
  description: string;
  callbackUrl: string;
  mobile?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRequestResult {
  authority: string;
  paymentUrl: string;
  rawResponse?: any;
}

export interface PaymentVerifyOptions {
  authority: string;
  amount: number;
}

export interface PaymentVerifyResult {
  isSuccess: boolean;
  refId?: string;
  cardPan?: string;
  code: number;
  message?: string;
  rawResponse?: any;
}

export interface PaymentGatewayProvider {
  readonly gatewayName: string;
  requestPayment(options: PaymentRequestOptions): Promise<PaymentRequestResult>;
  verifyPayment(options: PaymentVerifyOptions): Promise<PaymentVerifyResult>;
}

export const PAYMENT_GATEWAY_PROVIDER = 'PAYMENT_GATEWAY_PROVIDER';
