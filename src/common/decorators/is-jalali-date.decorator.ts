import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidJalaliDate } from '../utils/jalali.util';

/**
 * دکوراتور اعتبارسنجی تاریخ شمسی برای فیلدهای ورودی DTO
 * فرمت استاندارد: YYYY-MM-DD (پشتیبانی از ارقام فارسی و انگلیسی، بررسی دقیق سال‌های کبیسه و روزهای ماه)
 */
export function IsJalaliDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isJalaliDate',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} معتبر نیست (فرمت صحیح: ۱۴۰۴-۰۷-۰۱ یا 1404-07-01)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return isValidJalaliDate(value);
        },
      },
    });
  };
}
