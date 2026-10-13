import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as jalaali from 'jalaali-js';

export interface PersianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

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

const PERSIAN_WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toPersianDigits(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function normalizeDigits(str: string): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i))
      .replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * تبدیل رشته به آبجکت شمسی { jy, jm, jd }
 */
function parseDateToJalali(dateStr: string | null | undefined): { jy: number; jm: number; jd: number } | null {
  if (!dateStr) return null;
  const normalized = normalizeDigits(dateStr.trim());

  // بررسی فرمت YYYY-MM-DD یا YYYY/MM/DD
  const match = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    // اگر سال در بازه شمسی باشد (۱۳۰۰ تا ۱۶۰۰)
    if (y >= 1200 && y <= 1700) {
      return { jy: y, jm: m, jd: d };
    }

    // اگر سال میلادی باشد (مثلاً 2026-09-15)
    if (y >= 1900 && y <= 2100) {
      const j = jalaali.toJalaali(y, m, d);
      return { jy: j.jy, jm: j.jm, jd: j.jd };
    }
  }

  // تلاش برای پارس استاندارد Date میلادی یا ISO
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const j = jalaali.toJalaali(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    return { jy: j.jy, jm: j.jm, jd: j.jd };
  }

  return null;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  placeholder = 'انتخاب تاریخ...',
  disabled = false,
  className,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // محاسبه امروز در تقویم شمسی
  const todayJalali = useMemo(() => {
    const now = new Date();
    const j = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { jy: j.jy, jm: j.jm, jd: j.jd };
  }, []);

  // مقدار انتخاب‌شده فعلی
  const parsedSelected = useMemo(() => parseDateToJalali(value), [value]);

  // ماهی که در حال مشاهده است
  const [viewDate, setViewDate] = useState<{ jy: number; jm: number }>(() => {
    if (parsedSelected) {
      return { jy: parsedSelected.jy, jm: parsedSelected.jm };
    }
    return { jy: todayJalali.jy, jm: todayJalali.jm };
  });

  // اگر مقدار value از بیرون تغییر کرد، viewDate همگام شود
  useEffect(() => {
    if (parsedSelected) {
      setViewDate({ jy: parsedSelected.jy, jm: parsedSelected.jm });
    }
  }, [value]);

  // بستن منو با کلیک در بیرون
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // رفتن به ماه قبل
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    let newM = viewDate.jm - 1;
    let newY = viewDate.jy;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setViewDate({ jy: newY, jm: newM });
  };

  // رفتن به ماه بعد
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    let newM = viewDate.jm + 1;
    let newY = viewDate.jy;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setViewDate({ jy: newY, jm: newM });
  };

  // انتخاب روز
  const handleDaySelect = (day: number) => {
    const formattedDate = `${viewDate.jy}-${String(viewDate.jm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  // دکمه انتخاب امروز
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedDate = `${todayJalali.jy}-${String(todayJalali.jm).padStart(2, '0')}-${String(todayJalali.jd).padStart(2, '0')}`;
    onChange(formattedDate);
    setViewDate({ jy: todayJalali.jy, jm: todayJalali.jm });
    setIsOpen(false);
  };

  // پاک کردن مقدار
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // ساخت روزهای ماه برای تقویم شبکه
  const calendarGrid = useMemo(() => {
    const daysInMonth = jalaali.jalaaliMonthLength(viewDate.jy, viewDate.jm);

    // تبدیل روز اول ماه به میلادی برای استخراج روز هفته
    const firstDayGregorian = jalaali.toGregorian(viewDate.jy, viewDate.jm, 1);
    const firstDayDate = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
    const jsDay = firstDayDate.getDay(); // 0: Sun, 6: Sat

    // شروع هفته در ایران: شنبه = 0، یکشنبه = 1، ...، جمعه = 6
    const startDayOfWeek = (jsDay + 1) % 7;

    const slots: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      slots.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      slots.push(d);
    }
    return slots;
  }, [viewDate.jy, viewDate.jm]);

  // لیست سال‌های قابل انتخاب
  const yearOptions = useMemo(() => {
    const current = todayJalali.jy;
    const years: number[] = [];
    for (let y = current - 15; y <= current + 5; y++) {
      years.push(y);
    }
    return years;
  }, [todayJalali.jy]);

  // برچسب متنی نمایشی در اینپوت
  const displayValue = useMemo(() => {
    if (!parsedSelected) return '';
    return `${toPersianDigits(parsedSelected.jd)} ${PERSIAN_MONTH_NAMES[parsedSelected.jm - 1]} ${toPersianDigits(parsedSelected.jy)}`;
  }, [parsedSelected]);

  const inputId = id || (label ? `datepicker-${label.replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full text-right relative" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-normal mb-1.5">
          {label}
        </label>
      )}

      {/* فیلد ورودی کلیک‌خور */}
      <div
        id={inputId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={twMerge(
          clsx(
            'flex h-11 w-full items-center justify-between rounded-xl border bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm cursor-pointer select-none transition-colors shadow-xs',
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'hover:border-primary',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700',
            isOpen ? 'border-primary ring-2 ring-primary/20' : '',
            className,
          ),
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className={clsx('truncate', displayValue ? 'text-ink-normal dark:text-white font-semibold' : 'text-gray-400 dark:text-gray-500')}>
            {displayValue || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>}

      {/* تقویم بازشو */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 right-0 w-72 bg-white dark:bg-[#151C28] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#242F42] p-3.5 select-none animate-in fade-in zoom-in-95 duration-150">
          {/* هدر: انتخاب سال و ماه و ناوبری */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewDate.jm}
                onChange={(e) => setViewDate({ ...viewDate, jm: parseInt(e.target.value, 10) })}
                className="text-xs font-semibold text-gray-800 dark:text-white bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-1.5 pr-2.5 pl-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
              >
                {PERSIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx + 1} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewDate.jy}
                onChange={(e) => setViewDate({ ...viewDate, jy: parseInt(e.target.value, 10) })}
                className="text-xs font-semibold text-gray-800 dark:text-white bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-1.5 pr-2.5 pl-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* روزهای هفته (شنبه تا جمعه) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-800">
            {PERSIAN_WEEK_DAYS.map((day, idx) => (
              <span
                key={idx}
                className={clsx(
                  'text-[11px] font-bold',
                  idx === 6 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500',
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* شبکه روزهای ماه */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8 w-8" />;
              }

              const isSelected =
                parsedSelected &&
                parsedSelected.jy === viewDate.jy &&
                parsedSelected.jm === viewDate.jm &&
                parsedSelected.jd === day;

              const isToday =
                todayJalali.jy === viewDate.jy &&
                todayJalali.jm === viewDate.jm &&
                todayJalali.jd === day;

              const dayOfWeek = (idx % 7);
              const isFriday = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={clsx(
                    'h-8 w-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center mx-auto',
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/30'
                      : isToday
                        ? 'border border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 font-bold'
                        : isFriday
                          ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* پاورقی: دکمه امروز */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              امروز ({toPersianDigits(todayJalali.jd)} {PERSIAN_MONTH_NAMES[todayJalali.jm - 1]})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
