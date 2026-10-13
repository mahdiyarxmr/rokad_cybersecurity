import { gregorianToJalaliStr } from '../../../../utils/jalali';
import * as jalaali from 'jalaali-js';

export interface CalendarOccasion {
  day: number;
  month: number; // 1 to 12
  year?: number;
  title: string;
  isHoliday: boolean;
  type?: 'NATIONAL' | 'RELIGIOUS' | 'ANCIENT' | 'GLOBAL';
}

export interface DayCalendarInfo {
  year: number;
  month: number;
  day: number;
  jalaliStr: string; // YYYY-MM-DD
  gregorianStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0: شنبه, 1: یکشنبه, ..., 5: پنج‌شنبه, 6: جمعه
  dayOfWeekName: string;
  isFriday: boolean;
  isOfficialHoliday: boolean;
  holidayReason?: string;
  occasions: string[];
  isToday?: boolean;
}

export const PERSIAN_MONTHS = [
  { id: 1, name: 'فروردین', season: 'بهار', days: 31 },
  { id: 2, name: 'اردیبهشت', season: 'بهار', days: 31 },
  { id: 3, name: 'خرداد', season: 'بهار', days: 31 },
  { id: 4, name: 'تیر', season: 'تابستان', days: 31 },
  { id: 5, name: 'مرداد', season: 'تابستان', days: 31 },
  { id: 6, name: 'شهریور', season: 'تابستان', days: 31 },
  { id: 7, name: 'مهر', season: 'پاییز', days: 30 },
  { id: 8, name: 'آبان', season: 'پاییز', days: 30 },
  { id: 9, name: 'آذر', season: 'پاییز', days: 30 },
  { id: 10, name: 'دی', season: 'زمستان', days: 30 },
  { id: 11, name: 'بهمن', season: 'زمستان', days: 30 },
  { id: 12, name: 'اسفند', season: 'زمستان', days: 29 }, // ۱۴۰۵ کبیسه نیست (۲۹ روز)
];

export const WEEK_DAYS = [
  { id: 0, name: 'شنبه', short: 'ش' },
  { id: 1, name: 'یک‌شنبه', short: 'ی' },
  { id: 2, name: 'دوشنبه', short: 'د' },
  { id: 3, name: 'سه‌شنبه', short: 'س' },
  { id: 4, name: 'چهارشنبه', short: 'چ' },
  { id: 5, name: 'پنج‌شنبه', short: 'پ' },
  { id: 6, name: 'جمعه', short: 'ج' },
];

/**
 * مناسبت‌ها و تعطیلات تقویم رسمی سال ۱۴۰۵ هجری شمسی
 * (استخراج دقیق نجومی و تطبیق گاه‌شماری تقویم رسمی ایران)
 */
export const OFFICIAL_OCCASIONS_1405: CalendarOccasion[] = [
  // --- فروردین ۱۴۰۵ ---
  { month: 1, day: 1, title: 'جشن نوروز / آغاز سال ۱۴۰۵ هجری شمسی', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 1, title: 'تعطیل به مناسبت عید سعید فطر (۲ شوال)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 1, day: 2, title: 'عید نوروز (روز دوم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 3, title: 'عید نوروز (روز سوم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 4, title: 'عید نوروز (روز چهارم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 12, title: 'روز جمهوری اسلامی ایران', isHoliday: true, type: 'NATIONAL' },
  { month: 1, day: 13, title: 'روز طبیعت (سیزده‌بدر)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 18, title: 'روز جهانی بهداشت و سلامت', isHoliday: false, type: 'GLOBAL' },
  { month: 1, day: 24, title: 'شهادت امام جعفر صادق (ع) (۲۵ شوال)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 1, day: 29, title: 'روز ارتش جمهوری اسلامی ایران', isHoliday: false, type: 'NATIONAL' },
  { month: 1, day: 29, title: 'ولادت حضرت معصومه (س) و روز دختران', isHoliday: false, type: 'RELIGIOUS' },

  // --- اردیبهشت ۱۴۰۵ ---
  { month: 2, day: 1, title: 'روز بزرگداشت سعدی شیرازی', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 8, title: 'ولادت با سعادت امام رضا (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 2, day: 10, title: 'روز ملی خلیج فارس', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 11, title: 'روز جهانی کار و کارگر', isHoliday: false, type: 'GLOBAL' },
  { month: 2, day: 12, title: 'روز بزرگداشت مربی و شهادت استاد مرتضی مطهری', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 25, title: 'روز بزرگداشت حکیم ابوالقاسم فردوسی و پاسداشت زبان فارسی', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 26, title: 'شهادت امام جواد (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 2, day: 28, title: 'روز بزرگداشت حکیم عمر خیام', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 28, title: 'سالروز پیوند آسمانی حضرت علی (ع) و حضرت زهرا (س)', isHoliday: false, type: 'RELIGIOUS' },

  // --- خرداد ۱۴۰۵ ---
  { month: 3, day: 3, title: 'سالروز فتح خرمشهر و روز مقاومت و پیروزی', isHoliday: false, type: 'NATIONAL' },
  { month: 3, day: 3, title: 'شهادت امام محمد باقر (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 3, day: 5, title: 'روز عرفه / روز نیایش', isHoliday: false, type: 'RELIGIOUS' },
  { month: 3, day: 6, title: 'عید سعید قربان (۱۰ ذیحجه)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 3, day: 11, title: 'ولادت امام علی‌النقی الهادی (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 3, day: 14, title: 'رحلت حضرت امام خمینی (ره)', isHoliday: true, type: 'NATIONAL' },
  { month: 3, day: 14, title: 'عید سعید غدیر خم (۱۸ ذیحجه)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 3, day: 15, title: 'قیام خونین ۱۵ خرداد', isHoliday: true, type: 'NATIONAL' },

  // --- تیر ۱۴۰۵ ---
  { month: 4, day: 3, title: 'تاسوعای حسینی (۹ محرم)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 4, day: 4, title: 'عاشورای حسینی (۱۰ محرم)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 4, day: 6, title: 'شهادت امام زین‌العابدین (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 4, day: 7, title: 'شهادت مظلومانه دکتر بهشتی و ۷۲ تن از یاران / روز قوه قضائیه', isHoliday: false, type: 'NATIONAL' },
  { month: 4, day: 10, title: 'روز صنعت و معدن', isHoliday: false, type: 'NATIONAL' },
  { month: 4, day: 14, title: 'روز قلم', isHoliday: false, type: 'NATIONAL' },

  // --- مرداد ۱۴۰۵ ---
  { month: 5, day: 8, title: 'روز بزرگداشت شیخ شهاب‌الدین سهروردی (شیخ اشراق)', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 12, title: 'اربعین حسینی (۲۰ صفر)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 5, day: 14, title: 'سالروز صدور فرمان مشروطیت', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 17, title: 'روز خبرنگار', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 20, title: 'رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 5, day: 22, title: 'شهادت امام علی بن موسی الرضا (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 5, day: 30, title: 'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت مهدی (عج)', isHoliday: true, type: 'RELIGIOUS' },

  // --- شهریور ۱۴۰۵ ---
  { month: 6, day: 1, title: 'روز بزرگداشت ابوعلی سینا و روز پزشک', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 3, title: 'میلاد حضرت رسول اکرم (ص) به روایت اهل سنت / آغاز هفته وحدت', isHoliday: false, type: 'RELIGIOUS' },
  { month: 6, day: 4, title: 'روز کارمند', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 5, title: 'روز بزرگداشت محمد بن زکریای رازی و روز داروسازی', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 8, title: 'میلاد مسعود حضرت رسول اکرم (ص) و امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 6, day: 27, title: 'روز شعر و ادب فارسی و بزرگداشت استاد شهریار', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 28, title: 'ولادت امام حسن عسکری (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 6, day: 30, title: 'وفات حضرت معصومه (س)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 6, day: 31, title: 'آغاز هفته دفاع مقدس', isHoliday: false, type: 'NATIONAL' },

  // --- مهر ۱۴۰۵ ---
  { month: 7, day: 1, title: 'آغاز سال تحصیلی جدید و بازگشایی سراسری مدارس و هنرستان‌ها', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 8, title: 'روز بزرگداشت مولانا جلال‌الدین بلخی (رومی)', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 15, title: 'روز روستا و عشایر', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 20, title: 'روز بزرگداشت خواجه حافظ شیرازی', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 24, title: 'ولادت با سعادت حضرت زینب کبری (س) و روز پرستار', isHoliday: false, type: 'RELIGIOUS' },
  { month: 7, day: 26, title: 'روز تربیت بدنی و ورزش', isHoliday: false, type: 'NATIONAL' },

  // --- آبان ۱۴۰۵ ---
  { month: 8, day: 1, title: 'روز بزرگداشت ابوالفضل بیهقی', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 8, title: 'روز نوجوان و بسیج دانش‌آموزی (شهادت حسین فهمیده)', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 13, title: 'روز دانش‌آموز و روز ملی مبارزه با استکبار جهانی', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 22, title: 'شهادت حضرت فاطمه زهرا (س) (ایام فاطمیه)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 8, day: 24, title: 'روز کتاب، کتابخوانی و بزرگداشت علامه طباطبایی', isHoliday: false, type: 'NATIONAL' },

  // --- آذر ۱۴۰۵ ---
  { month: 9, day: 5, title: 'روز بسیج مستضعفان', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 7, title: 'روز نیروی دریایی جمهوری اسلامی ایران', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 9, title: 'ولادت با سعادت حضرت فاطمه زهرا (س) / روز زن و مادر', isHoliday: false, type: 'RELIGIOUS' },
  { month: 9, day: 16, title: 'روز دانشجو', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 19, title: 'ولادت امام محمد باقر (ع) / آغاز ماه رجب', isHoliday: false, type: 'RELIGIOUS' },
  { month: 9, day: 21, title: 'شهادت امام علی‌النقی الهادی (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 9, day: 25, title: 'روز پژوهش و فناوری', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 28, title: 'ولادت امام محمد تقی جوادالائمه (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 9, day: 30, title: 'شب یلدا (جشن شب چله / طولانی‌ترین شب سال)', isHoliday: false, type: 'ANCIENT' },

  // --- دی ۱۴۰۵ ---
  { month: 10, day: 1, title: 'جشن خرم‌روز / آغاز فصل زمستان', isHoliday: false, type: 'ANCIENT' },
  { month: 10, day: 1, title: 'ولادت حضرت امام علی (ع) / روز پدر و آغاز ایام اعتکاف', isHoliday: true, type: 'RELIGIOUS' },
  { month: 10, day: 3, title: 'وفات حضرت زینب کبری (س)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 11, title: 'آغاز سال نو میلادی ۲۰۲۷', isHoliday: false, type: 'GLOBAL' },
  { month: 10, day: 13, title: 'شهادت سردار سپهبد قاسم سلیمانی / روز جهانی مقاومت', isHoliday: false, type: 'NATIONAL' },
  { month: 10, day: 13, title: 'شهادت امام موسی کاظم (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 15, title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 10, day: 21, title: 'ولادت حضرت امام حسین (ع) / روز پاسدار', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 22, title: 'ولادت حضرت ابوالفضل العباس (ع) / روز جانباز', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 23, title: 'ولادت حضرت امام سجاد (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 29, title: 'ولادت حضرت علی‌اکبر (ع) و روز جوان', isHoliday: false, type: 'RELIGIOUS' },

  // --- بهمن ۱۴۰۵ ---
  { month: 11, day: 3, title: 'ولادت با سعادت حضرت مهدی (عج) / جشن نیمه شعبان', isHoliday: true, type: 'RELIGIOUS' },
  { month: 11, day: 12, title: 'بازگشت حضرت امام خمینی (ره) به میهن / آغاز دهه فجر انقلاب اسلامی', isHoliday: false, type: 'NATIONAL' },
  { month: 11, day: 19, title: 'آغاز ماه مبارک رمضان', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 22, title: 'سالروز پیروزی شکوهمند انقلاب اسلامی ایران (۲۲ بهمن)', isHoliday: true, type: 'NATIONAL' },

  // --- اسفند ۱۴۰۵ ---
  { month: 12, day: 3, title: 'ولادت با سعادت امام حسن مجتبی (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 12, day: 5, title: 'روز بزرگداشت خواجه نصیرالدین طوسی و روز مهندس', isHoliday: false, type: 'NATIONAL' },
  { month: 12, day: 7, title: 'ضربت خوردن حضرت امام علی (ع) / نخستین شب قدر', isHoliday: false, type: 'RELIGIOUS' },
  { month: 12, day: 9, title: 'شهادت مظلومانه حضرت امام علی (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 12, day: 11, title: 'شب قدر (۲۳ رمضان)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 12, day: 15, title: 'روز درختکاری و هفته منابع طبیعی', isHoliday: false, type: 'NATIONAL' },
  { month: 12, day: 18, title: 'عید سعید فطر (۱ شوال)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 12, day: 19, title: 'تعطیل به مناسبت عید سعید فطر (۲ شوال)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 12, day: 29, title: 'روز ملی شدن صنعت نفت ایران', isHoliday: true, type: 'NATIONAL' },
];

/**
 * دریافت اطلاعات کامل روزهای یک ماه در تقویم ۱۴۰۵
 */
export function getMonthDays1405(monthNumber: number, year: number = 1405): DayCalendarInfo[] {
  const monthMeta = PERSIAN_MONTHS.find((m) => m.id === monthNumber) || PERSIAN_MONTHS[0];
  const daysInMonth = monthMeta.days;

  const result: DayCalendarInfo[] = [];

  // بررسی روز جاری در تقویم
  const now = new Date();
  const todayJalaliStr = gregorianToJalaliStr(now); // e.g. 1405-06-24

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthNumber).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const jalaliStr = `${year}-${mm}-${dd}`;

    // مناسبت‌های این روز در تقویم ۱۴۰۵
    const matchingOccasions = OFFICIAL_OCCASIONS_1405.filter(
      (o) => o.month === monthNumber && o.day === d
    );
    const holidayOccasion = matchingOccasions.find((o) => o.isHoliday);

    // تاریخ میلادی متناظر و محاسبه دقیق روز هفته
    const { gy, gm, gd } = jalaali.toGregorian(year, monthNumber, d);
    const gregorianStr = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
    const gDate = new Date(gy, gm - 1, gd);
    // روز هفته در گاه‌شماری ایرانی: شنبه = ۰, یک‌شنبه = ۱, ..., پنج‌شنبه = ۵, جمعه = ۶
    const dayOfWeek = (gDate.getDay() + 1) % 7;
    const isFriday = dayOfWeek === 6;

    const isOfficialHoliday = Boolean(holidayOccasion) || isFriday;
    const holidayReason = holidayOccasion?.title || (isFriday ? 'تعطیل هفتگی (جمعه)' : undefined);

    result.push({
      year,
      month: monthNumber,
      day: d,
      jalaliStr,
      gregorianStr,
      dayOfWeek,
      dayOfWeekName: WEEK_DAYS[dayOfWeek].name,
      isFriday,
      isOfficialHoliday,
      holidayReason,
      occasions: matchingOccasions.map((o) => o.title),
      isToday: jalaliStr === todayJalaliStr,
    });
  }

  return result;
}

/**
 * دریافت تاریخ دقیق روز جاری به شمسی
 */
export function getTodayJalali(): {
  year: number;
  month: number;
  day: number;
  jalaliStr: string;
  monthName: string;
} {
  const now = new Date();
  const jalaliStr = gregorianToJalaliStr(now);
  const [y, m, d] = jalaliStr.split('-').map(Number);
  const monthName = PERSIAN_MONTHS.find((pm) => pm.id === m)?.name || 'شهریور';
  return {
    year: y || 1405,
    month: m || 6,
    day: d || 23,
    jalaliStr,
    monthName,
  };
}
