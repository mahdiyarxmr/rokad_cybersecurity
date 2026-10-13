import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JALALI_DATE_METADATA_KEY } from '../decorators/jalali-transform.decorator';
import { gregorianToJalali } from '../utils/jalali.util';
import { ConfigService } from '@nestjs/config';
import { resolveSecret, signStorageUrlsInValue } from '../security/security-policy';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    tenantId?: string;
    [key: string]: any;
  };
}

/**
 * پردازش بازگشتی داده‌ها جهت غنی‌سازی فیلدهای تاریخ با معادل شمسی جلالی
 * بر اساس فیلدهای نشانه‌گذاری شده با دکوراتور @JalaliDate()
 */
function enrichDataWithJalali(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  // اگر داده از نوع اعشاری پرایسما (Decimal) باشد، به عدد تبدیل شود
  if (typeof data.toNumber === 'function') {
    return data.toNumber();
  }

  if (Array.isArray(data)) {
    return data.map((item) => enrichDataWithJalali(item));
  }

  const constructor = data.constructor;
  const markedFields: (string | symbol)[] = constructor
    ? Reflect.getMetadata(JALALI_DATE_METADATA_KEY, constructor) || []
    : [];

  const result: any = Array.isArray(data) ? [] : { ...data };

  for (const key of Object.keys(data)) {
    const val = data[key];
    if (markedFields.includes(key) && val) {
      result[key] = gregorianToJalali(val);
    } else if (val && typeof val === 'object') {
      result[key] = enrichDataWithJalali(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly configService: ConfigService) {}

  private signUrls<V>(value: V): V {
    try {
      const secret = resolveSecret(
        'JWT_ACCESS_SECRET',
        this.configService.get<string>('JWT_ACCESS_SECRET'),
      );
      const ttl = Number(this.configService.get<string>('MEDIA_URL_TTL_SECONDS', '21600'));
      return signStorageUrlsInValue(value, secret, Number.isFinite(ttl) ? ttl : 21600) as V;
    } catch {
      return value;
    }
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // If response already matches standard structure, enrich data and return
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return {
            ...res,
            data: this.signUrls(enrichDataWithJalali(res.data)),
          };
        }

        let data = res;
        let message = 'عملیات با موفقیت انجام شد';

        if (res && typeof res === 'object' && 'message' in res && 'data' in res) {
          message = res.message;
          data = res.data;
        }

        data = this.signUrls(enrichDataWithJalali(data));
        const tenantId = request?.tenant?.id || request?.tenantId;

        return {
          success: true,
          statusCode,
          data,
          message,
          meta: {
            timestamp: new Date().toISOString(),
            tenantId: tenantId || undefined,
          },
        };
      }),
    );
  }
}
