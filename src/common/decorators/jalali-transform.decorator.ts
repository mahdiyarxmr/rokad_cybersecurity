import { Transform } from 'class-transformer';
import { SetMetadata } from '@nestjs/common';
import { jalaliToGregorianDate, isValidJalaliDate } from '../utils/jalali.util';

export const JALALI_DATE_METADATA_KEY = 'custom:jalali_date_field';

/**
 * دکوراتور تبدیل خودکار ورودی تاریخ شمسی در سطح DTO با استفاده از class-transformer
 * رشته تاریخ شمسی (انگلیسی یا فارسی) را قبل از رسیدن به کنترلر/سرویس به Date میلادی استاندارد تبدیل می‌کند.
 */
export function TransformJalaliToDate(timeOfDay: 'start' | 'noon' | 'end' = 'noon') {
  return Transform(({ value }) => {
    if (!value) return value;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      if (isValidJalaliDate(value)) {
        return jalaliToGregorianDate(value, timeOfDay);
      }
      // اگر از قبل میلادی یا ISO معتبر باشد
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return value;
  });
}

/**
 * دکوراتور نشانه‌گذاری فیلدهای خروجی مدل یا DTO جهت تبدیل خودکار به ساختار سه‌گانه تاریخ در اینترسپتور
 * { gregorian, jalali, jalaliDisplay }
 */
export function JalaliDate(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingProperties: (string | symbol)[] =
      Reflect.getMetadata(JALALI_DATE_METADATA_KEY, target.constructor) || [];
    if (!existingProperties.includes(propertyKey)) {
      existingProperties.push(propertyKey);
      Reflect.defineMetadata(JALALI_DATE_METADATA_KEY, existingProperties, target.constructor);
    }
  };
}
