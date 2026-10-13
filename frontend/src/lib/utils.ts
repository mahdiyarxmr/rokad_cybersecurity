import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jalaali from 'jalaali-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// تبدیل اعداد به ارقام فارسی
export function toPersianDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// نام ماه‌های فارسی
export const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// نام روزهای هفته فارسی
export const PERSIAN_WEEKDAY_NAMES = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه',
];

// فرمت تاریخ به شمسی خوانا
export function formatToJalali(
  date: Date | string | null,
  options?: { showMonthName?: boolean; includeDayName?: boolean },
): string {
  if (!date) return '-';
  let d: Date;
  if (typeof date === 'string') {
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }

  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const dayStr = toPersianDigits(j.jd);
  const yearStr = toPersianDigits(j.jy);

  if (options?.showMonthName) {
    const monthName = PERSIAN_MONTH_NAMES[j.jm - 1];
    if (options.includeDayName) {
      const dayName = PERSIAN_WEEKDAY_NAMES[d.getDay()];
      return `${dayName} ${dayStr} ${monthName} ${yearStr}`;
    }
    return `${dayStr} ${monthName} ${yearStr}`;
  }

  const monthStr = toPersianDigits(j.jm.toString().padStart(2, '0'));
  return `${yearStr}/${monthStr}/${dayStr.padStart(2, '۰')}`;
}

/**
 * Clean user full name by removing any parenthesized roles or titles (e.g. "علیرضا عزیزپور (راهبر ارشد)" -> "علیرضا عزیزپور")
 * If the resulting name is empty or a generic placeholder like "کاربر سیستم", falls back to the provided fallback.
 */
export function cleanUserFullName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
): string {
  const full = [firstName || '', lastName || ''].filter(Boolean).join(' ');
  const cleaned = full.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const isGeneric = !cleaned || cleaned === 'کاربر سیستم';
  if (isGeneric && fallback) {
    return fallback.trim();
  }
  if (isGeneric) {
    return '';
  }
  return cleaned;
}

/**
 * Convert Persian and Arabic digits to standard English digits
 */
export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

