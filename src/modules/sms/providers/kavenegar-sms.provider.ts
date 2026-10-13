import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsProvider,
  SmsSendSingleOptions,
  SmsSendResult,
  SmsSendBulkOptions,
  SmsBulkSendResult,
} from '../interfaces/sms-provider.interface';

@Injectable()
export class KavenegarSmsProvider implements ISmsProvider {
  readonly name = 'KAVENEGAR';
  private readonly logger = new Logger('SMS_KAVENEGAR');
  private apiKey: string;
  private senderLine: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('KAVENEGAR_API_KEY') || '';
    this.senderLine = this.configService.get<string>('KAVENEGAR_SENDER_LINE') || '10008000';
  }

  updateCredentials(apiKey: string, senderLine?: string) {
    this.apiKey = apiKey;
    if (senderLine !== undefined) {
      this.senderLine = senderLine;
    }
  }

  getCredentials() {
    return {
      apiKey: this.apiKey,
      senderLine: this.senderLine,
    };
  }

  async sendSingle(options: SmsSendSingleOptions): Promise<SmsSendResult> {
    if (!this.apiKey) {
      this.logger.warn('Kavenegar API key not configured. Falling back to simulation.');
      return {
        success: true,
        messageId: `sim-kav-${Date.now()}`,
        provider: this.name,
        cost: 1,
      };
    }

    try {
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          receptor: options.to,
          sender: this.senderLine,
          message: options.message,
        }),
      });

      const data = await response.json();
      if (data?.return?.status === 200 && data.entries?.length > 0) {
        return {
          success: true,
          messageId: String(data.entries[0].messageid),
          cost: data.entries[0].cost,
          provider: this.name,
          rawResponse: data,
        };
      }

      return {
        success: false,
        provider: this.name,
        errorMessage: data?.return?.message || 'Kavenegar error response',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Kavenegar send failure: ${err.message}`);
      return {
        success: false,
        provider: this.name,
        errorMessage: err.message,
      };
    }
  }

  async sendBulk(options: SmsSendBulkOptions): Promise<SmsBulkSendResult> {
    if (!this.apiKey) {
      const results = options.recipients.map((phone) => ({
        phone,
        success: true,
        messageId: `sim-kav-bulk-${Date.now()}`,
      }));
      return {
        success: true,
        total: options.recipients.length,
        sentCount: options.recipients.length,
        failedCount: 0,
        provider: this.name,
        results,
      };
    }

    try {
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/sendarray.json`;
      const receptors = JSON.stringify(options.recipients);
      const senders = JSON.stringify(options.recipients.map(() => this.senderLine));
      const messages = JSON.stringify(options.recipients.map(() => options.message));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          receptor: receptors,
          sender: senders,
          message: messages,
        }),
      });

      const data = await response.json();
      if (data?.return?.status === 200 && Array.isArray(data.entries)) {
        const results = data.entries.map((entry: any, index: number) => ({
          phone: options.recipients[index],
          success: entry.status < 100,
          messageId: String(entry.messageid),
          errorMessage: entry.statustext,
        }));

        const sentCount = results.filter((r: any) => r.success).length;
        return {
          success: true,
          total: options.recipients.length,
          sentCount,
          failedCount: options.recipients.length - sentCount,
          provider: this.name,
          results,
        };
      }

      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({ phone: p, success: false, errorMessage: data?.return?.message })),
      };
    } catch (err: any) {
      this.logger.error(`Kavenegar bulk send failure: ${err.message}`);
      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({ phone: p, success: false, errorMessage: err.message })),
      };
    }
  }
}
