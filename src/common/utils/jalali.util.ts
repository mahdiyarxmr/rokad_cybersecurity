import * as jalaali from 'jalaali-js';

export interface StandardJalaliDateResponse {
  gregorian: string; // ISO 8601 UTC string
  jalali: string;    // YYYY-MM-DD
  jalaliDisplay: string; // e.g. "۱ مهر ۱۴۰۵"
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * تبدیل ارقام فارسی و عربی به ارقام انگلیسی (لاتین)
 */
export function normalizePersianDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i))
      .replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return result.trim();
}

/**
 * تبدیل ارقام انگلیسی به ارقام فارسی جهت نمایش در رابط کاربری
 */
export function toPersianDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(String(i), 'g'), PERSIAN_DIGITS[i]);
  }
  return result;
}

/**
 * اعتبارسنجی دقیق تاریخ شمسی (فرمت YYYY-MM-DD با در نظر گرفتن سال‌های کبیسه نجومی و اسفند ۲۹ یا ۳۰ روزه)
 * توجه: سال‌های معتبر شمسی در بازه ۱۲۰۰ تا ۱۷۰۰ در نظر گرفته می‌شوند تا از تداخل با سال‌های میلادی (مانند ۲۰۲۴، ۲۰۲۵ و ...) جلوگیری شود.
 */
export function isValidJalaliDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const normalized = normalizePersianDigits(dateStr);
  const match = normalized.match(/^(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
  if (!match) return false;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  // سال شمسی باید در دامنه منطقی تقویم هجری خورشیدی باشد (نه سال میلادی)
  if (jy < 1200 || jy > 1700) return false;

  if (jm < 1 || jm > 12) return false;

  const maxDays = jalaali.jalaaliMonthLength(jy, jm);
  if (jd < 1 || jd > maxDays) return false;

  return jalaali.isValidJalaaliDate(jy, jm, jd);
}

/**
 * تبدیل تاریخ شمسی ورودی به Date میلادی استاندارد با نرمال‌سازی افق تهران (Asia/Tehran - UTC+03:30)
 * تا از خطای لغزش نیمه‌شب به روز قبل یا بعد در UTC به طور قطعی جلوگیری شود.
 */
export function jalaliToGregorianDate(
  jalaliStr: string,
  timeOfDay: 'start' | 'noon' | 'end' = 'noon',
): Date {
  const normalized = normalizePersianDigits(jalaliStr);
  const match = normalized.match(/^(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
  if (!match) {
    throw new Error(`تاریخ شمسی وارد شده معتبر نمی‌باشد: ${jalaliStr}`);
  }

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  if (!isValidJalaliDate(normalized)) {
    throw new Error(`روز یا ماه در تاریخ شمسی معتبر نیست: ${jalaliStr}`);
  }

  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);

  if (timeOfDay === 'start') {
    // 00:00:00 در وقت رسمی ایران (UTC+03:30) معادل 20:30:00 UTC روز قبل است
    return new Date(Date.UTC(gy, gm - 1, gd - 1, 20, 30, 0, 0));
  } else if (timeOfDay === 'end') {
    // 23:59:59.999 در وقت رسمی ایران معادل 20:29:59.999 UTC همان روز است
    return new Date(Date.UTC(gy, gm - 1, gd, 20, 29, 59, 999));
  } else {
    // 12:00:00 (ظهر) در وقت رسمی ایران معادل 08:30:00 UTC است که در مرکز روز قرار دارد
    return new Date(Date.UTC(gy, gm - 1, gd, 8, 30, 0, 0));
  }
}

/**
 * تبدیل شیء Date یا رشته ISO میلادی به خروجی سه‌گانه استاندارد رکاد
 */
export function gregorianToJalali(dateInput: Date | string | null | undefined): StandardJalaliDateResponse | null {
  if (!dateInput) return null;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return null;

  // استخراج دقیق تقویم میلادی در افق تهران
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const gy = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const gm = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const gd = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);

  const jalali = `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  const jalaliDisplay = `${toPersianDigits(jd)} ${PERSIAN_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;

  return {
    gregorian: date.toISOString(),
    jalali,
    jalaliDisplay,
  };
}

/**
 * تشخیص روز هفته به سبک تقویم ایران در افق زمانی تهران
 * ۰ = شنبه، ۱ = یکشنبه، ...، ۶ = جمعه
 */
export function getTehranDayOfWeek(date: Date): { dayIndex: number; isFriday: boolean; dayNameFa: string } {
  // نام روز در تایم‌زون تهران
  const formatter = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
  });
  const weekdayName = formatter.format(date);

  // استخراج روز هفته میلادی در افق تهران
  const tehranDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const [y, m, d] = tehranDateStr.split('-').map(Number);
  const tehranDay = new Date(y, m - 1, d).getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat

  // تبدیل به تقویم ایران: شنبه: 0, یکشنبه: 1, ..., پنج‌شنبه: 5, جمعه: 6
  const dayIndex = (tehranDay + 1) % 7;
  const isFriday = dayIndex === 6;

  return {
    dayIndex,
    isFriday,
    dayNameFa: weekdayName,
  };
}

/**
 * تابع کمکی و پیشنهادی پیش‌فرض برای تعیین بازه سال تحصیلی (۱ مهر تا ۳۱ خرداد سال بعد)
 * توجه: این تابع صرفاً Helper جهت پیشنهاد مقدار پیش‌فرض به فرم ادمین است؛ منبع حقیقت نهایی، رکوردهای AcademicYear در دیتابیس است.
 */
export function getDefaultAcademicYearBoundaries(jalaliYear: number): {
  startDate: Date;
  endDate: Date;
  titleFa: string;
} {
  const startDate = jalaliToGregorianDate(`${jalaliYear}-07-01`, 'start');
  const endDate = jalaliToGregorianDate(`${jalaliYear + 1}-03-31`, 'end');
  const titleFa = `${toPersianDigits(jalaliYear)}-${toPersianDigits(jalaliYear + 1)}`;

  return {
    startDate,
    endDate,
    titleFa,
  };
}
