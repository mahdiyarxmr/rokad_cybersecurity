export interface SmsSendSingleOptions {
  to: string;
  message: string;
  template?: string;
  params?: Record<string, string>;
  tenantId?: string;
}

export interface SmsSendBulkOptions {
  recipients: string[];
  message: string;
  tenantId?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  cost?: number;
  errorMessage?: string;
  rawResponse?: any;
}

export interface SmsBulkSendResult {
  success: boolean;
  total: number;
  sentCount: number;
  failedCount: number;
  provider: string;
  results: Array<{ phone: string; success: boolean; messageId?: string; errorMessage?: string }>;
}

export interface ISmsProvider {
  readonly name: string;
  sendSingle(options: SmsSendSingleOptions): Promise<SmsSendResult>;
  sendBulk(options: SmsSendBulkOptions): Promise<SmsBulkSendResult>;
}
