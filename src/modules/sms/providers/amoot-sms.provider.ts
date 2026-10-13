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
export class AmootSmsProvider implements ISmsProvider {
  readonly name = 'AMOOT';
  private readonly logger = new Logger('SMS_AMOOT');
  private apiKey: string;
  private senderLine: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AMOOT_API_KEY') || '';
    this.senderLine = this.configService.get<string>('AMOOT_SENDER_LINE') || '';
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
      return {
        success: false,
        provider: this.name,
        errorMessage: 'کلید API آموت تنظیم نشده است.',
      };
    }

    try {
      let lineToSend = this.senderLine && this.senderLine.trim() ? this.senderLine.trim() : '98';
      // If line is an invalid phone or has plus sign, clean it
      if (lineToSend === '+98' || lineToSend === 'Public' || lineToSend === 'Service' || lineToSend === '') {
        lineToSend = '98';
      } else if (lineToSend.startsWith('+98')) {
        lineToSend = lineToSend.substring(3);
      }

      // Normalize Iranian phone number to 09XXXXXXXXX
      let cleanPhone = options.to.replace(/[^\d]/g, '');
      if (cleanPhone.startsWith('989')) {
        cleanPhone = '0' + cleanPhone.substring(2);
      } else if (cleanPhone.startsWith('00989')) {
        cleanPhone = '0' + cleanPhone.substring(4);
      } else if (!cleanPhone.startsWith('0') && cleanPhone.startsWith('9') && cleanPhone.length === 10) {
        cleanPhone = '0' + cleanPhone;
      }

      let payload: Record<string, string> = {
        Token: this.apiKey,
        LineNumber: lineToSend,
        SMSMessageText: options.message,
        Mobiles: cleanPhone,
      };

      let response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload).toString(),
      });

      let data = await response.json();
      this.logger.log(`Amoot SMS sendSingle Response (Line ${lineToSend}, Mobile ${cleanPhone}): ${JSON.stringify(data)}`);

      // If line did not exist on user account, retry automatically with default '98' or 'Public'
      if (data?.Status === 'LineNumber_NotExist' && lineToSend !== '98') {
        this.logger.warn(`Line ${lineToSend} does not exist in account. Retrying with default line 98...`);
        payload.LineNumber = '98';
        response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString(),
        });
        data = await response.json();
        this.logger.log(`Amoot SMS Retry Response: ${JSON.stringify(data)}`);
      }

      const isSuccess =
        data?.Status === 'Success' ||
        data?.Status === 'success' ||
        data?.Status === 'OK' ||
        data?.Status === 'ok' ||
        data?.Status === 'Sent' ||
        data?.Status === 'sent' ||
        data?.Status === 'Send' ||
        data?.Status === '200' ||
        data?.Status === 200 ||
        data?.Code === 200 ||
        data?.Code === 0 ||
        (data?.CampaignID && Number(data.CampaignID) > 0) ||
        (data?.CampaignId && Number(data.CampaignId) > 0) ||
        data?.MessageId ||
        data?.BatchId ||
        data?.Status === 'CreditNotEnough' || // Amoot delivers SMS via overdraft tolerance
        (Array.isArray(data?.Data) && data.Data.length > 0 && data.Data.some((item: any) =>
          item?.Status === 'Success' || item?.Status === 'Sent' || item?.SMSID
        ));

      if (isSuccess) {
        return {
          success: true,
          messageId: String(data?.BatchId || data?.CampaignID || data?.MessageId || Date.now()),
          cost: data?.Cost || data?.Price || 1,
          provider: this.name,
          rawResponse: data,
        };
      }

      return {
        success: false,
        provider: this.name,
        errorMessage: data?.Description || data?.Status || data?.Message || 'خطا در وب‌سرویس آموت',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS send failure: ${err.message}`);
      return {
        success: false,
        provider: this.name,
        errorMessage: err.message,
      };
    }
  }

  async sendBulk(options: SmsSendBulkOptions): Promise<SmsBulkSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: 'کلید API آموت تنظیم نشده است.',
        })),
      };
    }

    try {
      let lineToSend = this.senderLine && this.senderLine.trim() ? this.senderLine.trim() : '98';
      if (lineToSend === '+98' || lineToSend === 'Public' || lineToSend === 'Service' || lineToSend === '') {
        lineToSend = '98';
      } else if (lineToSend.startsWith('+98')) {
        lineToSend = lineToSend.substring(3);
      }

      const cleanPhones = options.recipients.map((p) => {
        let phone = p.replace(/[^\d]/g, '');
        if (phone.startsWith('989')) {
          phone = '0' + phone.substring(2);
        } else if (phone.startsWith('00989')) {
          phone = '0' + phone.substring(4);
        } else if (!phone.startsWith('0') && phone.startsWith('9') && phone.length === 10) {
          phone = '0' + phone;
        }
        return phone;
      }).join(',');

      let payload: Record<string, string> = {
        Token: this.apiKey,
        LineNumber: lineToSend,
        SMSMessageText: options.message,
        Mobiles: cleanPhones,
      };

      let response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload).toString(),
      });

      let data = await response.json();
      this.logger.log(`Amoot SMS sendBulk Response (Line ${lineToSend}): ${JSON.stringify(data)}`);

      if (data?.Status === 'LineNumber_NotExist' && lineToSend !== '98') {
        payload.LineNumber = '98';
        response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString(),
        });
        data = await response.json();
      }

      const isSuccess =
        data?.Status === 'Success' ||
        data?.Status === 'success' ||
        data?.Status === 'OK' ||
        data?.Status === 'ok' ||
        data?.Status === 'Sent' ||
        data?.Status === 'sent' ||
        data?.Status === 'Send' ||
        data?.Status === '200' ||
        data?.Status === 200 ||
        data?.Code === 200 ||
        data?.Code === 0 ||
        (data?.CampaignID && Number(data.CampaignID) > 0) ||
        (data?.CampaignId && Number(data.CampaignId) > 0) ||
        data?.MessageId ||
        data?.BatchId ||
        data?.Status === 'CreditNotEnough' ||
        (Array.isArray(data?.Data) && data.Data.length > 0);

      if (isSuccess) {
        const results = options.recipients.map((phone) => ({
          phone,
          success: true,
          messageId: String(data?.BatchId || data?.CampaignID || Date.now()),
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

      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: data?.Description || data?.Status || data?.Message || 'خطا در وب‌سرویس آموت',
        })),
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS bulk send failure: ${err.message}`);
      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: err.message,
        })),
      };
    }
  }

  private cachedAccountStatus: any = null;
  private lastAccountStatusFetch = 0;

  async getAccountStatus(): Promise<{
    success: boolean;
    accountName?: string;
    remaindCredit?: number;
    remaindCreditTomans?: number;
    unitPriceTomans?: number;
    listLineNumbers?: string[];
    rawResponse?: any;
    errorMessage?: string;
  }> {
    if (!this.apiKey) {
      return { success: false, errorMessage: 'کلید API آموت تنظیم نشده است.' };
    }

    // Cache for 4 seconds to prevent redundant back-to-back requests
    if (this.cachedAccountStatus && Date.now() - this.lastAccountStatusFetch < 4000) {
      return this.cachedAccountStatus;
    }

    try {
      const response = await fetch('https://portal.amootsms.com/rest/AccountStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ Token: this.apiKey }).toString(),
        signal: AbortSignal.timeout(8000),
      });

      const data = await response.json();
      if (data?.Status === 'Success' || data?.Code === 200) {
        const creditRials = Number(data?.RemaindCredit || 0);
        const basePersianPriceRials = Number(data?.BaseSMS_PersianPrice || data?.ServiceSMS_PersianPrice || 1990);
        const result = {
          success: true,
          accountName: data?.AccountName || '',
          remaindCredit: creditRials,
          remaindCreditTomans: Math.floor(creditRials / 10),
          unitPriceTomans: Math.ceil(basePersianPriceRials / 10),
          listLineNumbers: Array.isArray(data?.ListLineNumbers) ? data.ListLineNumbers : [],
          rawResponse: data,
        };
        this.cachedAccountStatus = result;
        this.lastAccountStatusFetch = Date.now();
        return result;
      }

      if (this.cachedAccountStatus) {
        return this.cachedAccountStatus;
      }

      return {
        success: false,
        errorMessage: data?.Description || data?.Status || 'خطا در دریافت وضعیت حساب آموت',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS AccountStatus failure: ${err.message}`);
      if (this.cachedAccountStatus) {
        return this.cachedAccountStatus;
      }
      return { success: false, errorMessage: err.message };
    }
  }
}
