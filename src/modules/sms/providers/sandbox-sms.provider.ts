import { Injectable, Logger } from '@nestjs/common';
import {
  ISmsProvider,
  SmsSendSingleOptions,
  SmsSendResult,
  SmsSendBulkOptions,
  SmsBulkSendResult,
} from '../interfaces/sms-provider.interface';

@Injectable()
export class SandboxSmsProvider implements ISmsProvider {
  readonly name = 'SANDBOX';
  private readonly logger = new Logger('SMS_SANDBOX');

  async sendSingle(options: SmsSendSingleOptions): Promise<SmsSendResult> {
    const messageId = `sbx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this.logger.log(
      `[SANDBOX SMS DISPATCH] To: ${options.to} | Template: ${options.template || 'CUSTOM'} | Message: "${options.message}" | MsgID: ${messageId}`,
    );

    return {
      success: true,
      messageId,
      provider: this.name,
      cost: 1,
    };
  }

  async sendBulk(options: SmsSendBulkOptions): Promise<SmsBulkSendResult> {
    const results = options.recipients.map((phone) => {
      const messageId = `sbx-bulk-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      this.logger.log(
        `[SANDBOX BULK SMS DISPATCH] To: ${phone} | Message: "${options.message}" | MsgID: ${messageId}`,
      );
      return {
        phone,
        success: true,
        messageId,
      };
    });

    return {
      success: true,
      total: options.recipients.length,
      sentCount: options.recipients.length,
      failedCount: 0,
      provider: this.name,
      results,
    };
  }
}
