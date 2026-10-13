import * as jalaali from 'jalaali-js';

const PERSIAN_MONTH_NAMES = [
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

export function toPersianDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function normalizeDigits(str: string): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * تبدیل رشته تاریخ شمسی به شیء Date میلادی استاندارد
 */
export function jalaliToGregorianDate(jalaliStr: string): Date {
  const normalized = normalizeDigits(jalaliStr.trim());
  const match = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) {
    const fallback = new Date(jalaliStr);
    if (!isNaN(fallback.getTime())) return fallback;
    throw new Error(`تاریخ شمسی نامعتبر است: ${jalaliStr}`);
  }

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  // اگر ورودی از قبل سال میلادی باشد
  if (jy >= 1800) {
    return new Date(Date.UTC(jy, jm - 1, jd, 12, 0, 0));
  }

  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
}

/**
 * تبدیل تاریخ میلادی یا ISO به رشته استاندارد شمسی YYYY-MM-DD
 */
export function gregorianToJalaliStr(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

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
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

const PERSIAN_WEEK_DAYS_FULL = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
];

/**
 * قالب‌بندی متنی خوانا برای نمایش در UI (مثلاً: ۲۳ شهریور ۱۴۰۵)
 * به صورت هوشمند هم رشته شمسی (1405-06-23) و هم رشته یا تاریخ میلادی را پردازش می‌کند.
 */
export function formatJalaliDisplay(
  dateInput: Date | string | null | undefined,
  includeWeekday = false
): string {
  if (!dateInput) return '';

  let jy: number;
  let jm: number;
  let jd: number;
  let dayOfWeek = 0;

  if (typeof dateInput === 'string') {
    const norm = normalizeDigits(dateInput.trim());
    const match = norm.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);

      if (y >= 1200 && y <= 1700) {
        jy = y;
        jm = m;
        jd = d;
        const g = jalaali.toGregorian(y, m, d);
        dayOfWeek = new Date(g.gy, g.gm - 1, g.gd).getDay();
      } else {
        const j = jalaali.toJalaali(y, m, d);
        jy = j.jy;
        jm = j.jm;
        jd = j.jd;
        dayOfWeek = new Date(y, m - 1, d).getDay();
      }
    } else {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) return dateInput;
      const j = jalaali.toJalaali(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
      jy = j.jy;
      jm = j.jm;
      jd = j.jd;
      dayOfWeek = parsed.getDay();
    }
  } else {
    if (isNaN(dateInput.getTime())) return '';
    const j = jalaali.toJalaali(dateInput.getFullYear(), dateInput.getMonth() + 1, dateInput.getDate());
    jy = j.jy;
    jm = j.jm;
    jd = j.jd;
    dayOfWeek = dateInput.getDay();
  }

  const monthName = PERSIAN_MONTH_NAMES[jm - 1] || '';
  const dateFormatted = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;

  if (includeWeekday) {
    const weekdayName = PERSIAN_WEEK_DAYS_FULL[dayOfWeek] || '';
    return `${weekdayName} ${dateFormatted}`;
  }

  return dateFormatted;
}

/**
 * دریافت سال، ماه و روز جاری شمسی
 */
export function getCurrentJalaliYearMonth(): { year: number; month: number; day: number } {
  const now = new Date();
  const j = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return {
    year: j.jy,
    month: j.jm,
    day: j.jd,
  };
}

export interface JalaliWeekInfo {
  weekNumber: number;
  activeWeek: 1 | 2; // 1: هفته فرد (هفته اول), 2: هفته زوج (هفته دوم)
  weekLabel: string; // "هفته فرد" یا "هفته زوج"
  dayOfYear: number;
  jy: number;
  jm: number;
  jd: number;
}

const safeToJalaali = (gy: number, gm: number, gd: number) => {
  if (typeof (jalaali as any).toJalaali === 'function') {
    return (jalaali as any).toJalaali(gy, gm, gd);
  }
  if (typeof (jalaali as any).default?.toJalaali === 'function') {
    return (jalaali as any).default.toJalaali(gy, gm, gd);
  }
  return { jy: 1404, jm: 1, jd: 1 };
};

const safeToGregorian = (jy: number, jm: number, jd: number) => {
  if (typeof (jalaali as any).toGregorian === 'function') {
    return (jalaali as any).toGregorian(jy, jm, jd);
  }
  if (typeof (jalaali as any).default?.toGregorian === 'function') {
    return (jalaali as any).default.toGregorian(jy, jm, jd);
  }
  return { gy: 2025, gm: 3, gd: 21 };
};

/**
 * محاسبه دقیق هفته جاری شمسی و تعیین تناوب هفته فرد / هفته زوج
 * این متد به صورت خودکار هر شنبه تغییر می‌کند (یک هفته هفته فرد، هفته بعد هفته زوج)
 */
export function getCurrentJalaliWeekInfo(dateInput: Date | string = new Date()): JalaliWeekInfo {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const j = safeToJalaali(validDate.getFullYear(), validDate.getMonth() + 1, validDate.getDate());

  const dayOfYear = (j.jm <= 6 ? (j.jm - 1) * 31 : 6 * 31 + (j.jm - 7) * 30) + j.jd;
  const gFarvardin1 = safeToGregorian(j.jy, 1, 1);
  const dFarvardin1 = new Date(gFarvardin1.gy, gFarvardin1.gm - 1, gFarvardin1.gd);
  const dowFarvardin1 = (dFarvardin1.getDay() + 1) % 7; // شنبه = 0, ..., جمعه = 6

  const weekNumber = Math.floor((dayOfYear - 1 + dowFarvardin1) / 7) + 1;
  const activeWeek: 1 | 2 = weekNumber % 2 === 1 ? 1 : 2;
  const weekLabel = activeWeek === 1 ? 'هفته فرد' : 'هفته زوج';

  return {
    weekNumber,
    activeWeek,
    weekLabel,
    dayOfYear,
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
  };
}
