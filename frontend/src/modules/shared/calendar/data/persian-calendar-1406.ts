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
  { id: 12, name: 'اسفند', season: 'زمستان', days: 29 }, // ۱۴۰۶ کبیسه نیست
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
 * مناسبت‌ها و تعطیلات تقویم رسمی سال ۱۴۰۶ هجری شمسی
 * (منطبق بر استخراج مرکز تقویم و گاه‌شماری رسمی جمهوری اسلامی ایران)
 */
export const OFFICIAL_OCCASIONS_1406: CalendarOccasion[] = [
  // --- فروردین ۱۴۰۶ ---
  { month: 1, day: 1, title: 'جشن نوروز / آغاز سال ۱۴۰۶ هجری شمسی', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 2, title: 'عید نوروز (روز دوم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 3, title: 'عید نوروز (روز سوم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 4, title: 'عید نوروز (روز چهارم)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 12, title: 'روز جمهوری اسلامی ایران', isHoliday: true, type: 'NATIONAL' },
  { month: 1, day: 13, title: 'روز طبیعت (سیزده‌بدر)', isHoliday: true, type: 'ANCIENT' },
  { month: 1, day: 18, title: 'روز جهانی بهداشت و سلامت', isHoliday: false, type: 'GLOBAL' },
  { month: 1, day: 23, title: 'ولادت حضرت فاطمه زهرا (س) / روز زن و مادر', isHoliday: false, type: 'RELIGIOUS' },
  { month: 1, day: 29, title: 'روز ارتش جمهوری اسلامی ایران', isHoliday: false, type: 'NATIONAL' },

  // --- اردیبهشت ۱۴۰۶ ---
  { month: 2, day: 1, title: 'روز بزرگداشت سعدی شیرازی', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 10, title: 'روز ملی خلیج فارس', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 11, title: 'روز جهانی کار و کارگر', isHoliday: false, type: 'GLOBAL' },
  { month: 2, day: 12, title: 'روز بزرگداشت مربی و شهادت استاد مرتضی مطهری', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 14, title: 'ولادت حضرت معصومه (س) و روز دختران', isHoliday: false, type: 'RELIGIOUS' },
  { month: 2, day: 24, title: 'ولادت امام رضا (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 2, day: 25, title: 'روز بزرگداشت حکیم ابوالقاسم فردوسی و پاسداشت زبان فارسی', isHoliday: false, type: 'NATIONAL' },
  { month: 2, day: 28, title: 'روز بزرگداشت حکیم عمر خیام', isHoliday: false, type: 'NATIONAL' },

  // --- خرداد ۱۴۰۶ ---
  { month: 3, day: 3, title: 'سالروز فتح خرمشهر و روز مقاومت و پیروزی', isHoliday: false, type: 'NATIONAL' },
  { month: 3, day: 14, title: 'رحلت حضرت امام خمینی (ره)', isHoliday: true, type: 'NATIONAL' },
  { month: 3, day: 15, title: 'قیام خونین ۱۵ خرداد', isHoliday: true, type: 'NATIONAL' },
  { month: 3, day: 17, title: 'روز عرفه / روز نیایش', isHoliday: false, type: 'RELIGIOUS' },
  { month: 3, day: 18, title: 'عید سعید قربان', isHoliday: true, type: 'RELIGIOUS' },
  { month: 3, day: 23, title: 'ولادت امام علی‌النقی الهادی (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 3, day: 26, title: 'عید سعید غدیر خم', isHoliday: true, type: 'RELIGIOUS' },
  { month: 3, day: 28, title: 'ولادت امام موسی کاظم (ع)', isHoliday: false, type: 'RELIGIOUS' },

  // --- تیر ۱۴۰۶ ---
  { month: 4, day: 7, title: 'شهادت مظلومانه آیت‌الله دکتر بهشتی و ۷۲ تن از یاران / روز قوه قضائیه', isHoliday: false, type: 'NATIONAL' },
  { month: 4, day: 10, title: 'روز صنعت و معدن', isHoliday: false, type: 'NATIONAL' },
  { month: 4, day: 14, title: 'روز قلم', isHoliday: false, type: 'NATIONAL' },
  { month: 4, day: 15, title: 'تاسوعای حسینی (۹ محرم)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 4, day: 16, title: 'عاشورای حسینی (۱۰ محرم)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 4, day: 18, title: 'شهادت امام زین‌العابدین (ع)', isHoliday: false, type: 'RELIGIOUS' },

  // --- مرداد ۱۴۰۶ ---
  { month: 5, day: 8, title: 'روز بزرگداشت شیخ شهاب‌الدین سهروردی (شیخ اشراق)', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 14, title: 'سالروز صدور فرمان مشروطیت', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 17, title: 'روز خبرنگار', isHoliday: false, type: 'NATIONAL' },
  { month: 5, day: 25, title: 'اربعین حسینی (۲۰ صفر)', isHoliday: true, type: 'RELIGIOUS' },

  // --- شهریور ۱۴۰۶ ---
  { month: 6, day: 1, title: 'روز بزرگداشت ابوعلی سینا و روز پزشک', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 2, title: 'رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 6, day: 4, title: 'شهادت امام علی بن موسی الرضا (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 6, day: 5, title: 'روز بزرگداشت محمد بن زکریای رازی و روز داروسازی', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 12, title: 'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت مهدی (عج)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 6, day: 21, title: 'ولادت حضرت رسول اکرم (ص) به روایت اهل سنت / آغاز هفته وحدت', isHoliday: false, type: 'RELIGIOUS' },
  { month: 6, day: 21, title: 'میلاد حضرت رسول اکرم (ص) و امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 6, day: 27, title: 'روز شعر و ادب فارسی و بزرگداشت استاد شهریار', isHoliday: false, type: 'NATIONAL' },
  { month: 6, day: 31, title: 'آغاز هفته دفاع مقدس', isHoliday: false, type: 'NATIONAL' },

  // --- مهر ۱۴۰۶ ---
  { month: 7, day: 1, title: 'آغاز سال تحصیلی جدید و بازگشایی سراسری مدارس', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 8, title: 'روز بزرگداشت مولوی (جلال‌الدین محمد بلخی)', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 15, title: 'روز روستا و عشایر', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 20, title: 'روز بزرگداشت حافظ شیرازی', isHoliday: false, type: 'NATIONAL' },
  { month: 7, day: 24, title: 'روز ملی پارالمپیک و ورزش', isHoliday: false, type: 'NATIONAL' },

  // --- آبان ۱۴۰۶ ---
  { month: 8, day: 1, title: 'روز بزرگداشت ابوالفضل بیهقی', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 8, title: 'روز نوجوان و بسیج دانش‌آموزی (شهادت حسین فهمیده)', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 13, title: 'روز دانش‌آموز و روز ملی مبارزه با استکبار جهانی', isHoliday: false, type: 'NATIONAL' },
  { month: 8, day: 18, title: 'ولادت حضرت زینب کبری (س) و روز پرستار', isHoliday: false, type: 'RELIGIOUS' },
  { month: 8, day: 24, title: 'روز کتاب، کتابخوانی و بزرگداشت علامه طباطبایی', isHoliday: false, type: 'NATIONAL' },

  // --- آذر ۱۴۰۶ ---
  { month: 9, day: 5, title: 'روز بسیج مستضعفان', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 7, title: 'روز نیروی دریایی', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 16, title: 'روز دانشجو', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 22, title: 'شهادت حضرت فاطمه زهرا (س)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 9, day: 25, title: 'روز پژوهش و فناوری', isHoliday: false, type: 'NATIONAL' },
  { month: 9, day: 30, title: 'شب یلدا (جشن شب چله / انقلاب زمستانی)', isHoliday: false, type: 'ANCIENT' },

  // --- دی ۱۴۰۶ ---
  { month: 10, day: 1, title: 'جشن خرم‌روز / آغاز فصل زمستان', isHoliday: false, type: 'ANCIENT' },
  { month: 10, day: 11, title: 'آغاز سال نو میلادی ۲۰۲۸', isHoliday: false, type: 'GLOBAL' },
  { month: 10, day: 13, title: 'شهادت سردار سپهبد قاسم سلیمانی / روز جهانی مقاومت', isHoliday: false, type: 'NATIONAL' },
  { month: 10, day: 21, title: 'ولادت امام محمد باقر (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 10, day: 23, title: 'شهادت امام علی‌النقی الهادی (ع)', isHoliday: false, type: 'RELIGIOUS' },

  // --- بهمن ۱۴۰۶ ---
  { month: 11, day: 1, title: 'ولادت امام محمد تقی جوادالائمه (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 4, title: 'ولادت حضرت امام علی (ع) / روز پدر و آغاز ایام اعتکاف', isHoliday: true, type: 'RELIGIOUS' },
  { month: 11, day: 6, title: 'وفات حضرت زینب کبری (س)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 12, title: 'بازگشت امام خمینی (ره) به میهن / آغاز دهه فجر', isHoliday: false, type: 'NATIONAL' },
  { month: 11, day: 16, title: 'شهادت امام موسی کاظم (ع)', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 18, title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'RELIGIOUS' },
  { month: 11, day: 22, title: 'سالروز پیروزی شکوهمند انقلاب اسلامی ایران (۲۲ بهمن)', isHoliday: true, type: 'NATIONAL' },
  { month: 11, day: 24, title: 'ولادت حضرت امام حسین (ع) / روز پاسدار', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 25, title: 'ولادت حضرت ابوالفضل العباس (ع) / روز جانباز', isHoliday: false, type: 'RELIGIOUS' },
  { month: 11, day: 26, title: 'ولادت امام زین‌العابدین (ع)', isHoliday: false, type: 'RELIGIOUS' },

  // --- اسفند ۱۴۰۶ ---
  { month: 12, day: 2, title: 'ولادت حضرت علی‌اکبر (ع) و روز جوان', isHoliday: false, type: 'RELIGIOUS' },
  { month: 12, day: 5, title: 'روز بزرگداشت خواجه نصیرالدین طوسی و روز مهندس', isHoliday: false, type: 'NATIONAL' },
  { month: 12, day: 6, title: 'ولادت با سعادت حضرت مهدی (عج) / نیمه شعبان', isHoliday: true, type: 'RELIGIOUS' },
  { month: 12, day: 15, title: 'روز درختکاری و هفته منابع طبیعی', isHoliday: false, type: 'NATIONAL' },
  { month: 12, day: 29, title: 'روز ملی شدن صنعت نفت ایران', isHoliday: true, type: 'NATIONAL' },
];

/**
 * دریافت اطلاعات کامل یک ماه در تقویم ۱۴۰۶
 */
export function getMonthDays1406(monthNumber: number, year: number = 1406): DayCalendarInfo[] {
  const monthMeta = PERSIAN_MONTHS.find((m) => m.id === monthNumber) || PERSIAN_MONTHS[0];
  const daysInMonth = monthMeta.days;

  const result: DayCalendarInfo[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    // Jalali string
    const mm = String(monthNumber).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const jalaliStr = `${year}-${mm}-${dd}`;

    // Occasions for this day
    const matchingOccasions = OFFICIAL_OCCASIONS_1406.filter(
      (o) => o.month === monthNumber && o.day === d
    );
    const holidayOccasion = matchingOccasions.find((o) => o.isHoliday);

    // محاسبه روز هفته به روش استاندارد تقویم ایران:
    // ۱ فروردین ۱۴۰۶ مصادف با یکشنبه (Sunday) ۲۱ مارس ۲۰۲۷ است.
    // آفست تعداد روزها از ۱ فروردین ۱۴۰۶:
    let dayOfYear = 0;
    for (let m = 1; m < monthNumber; m++) {
      dayOfYear += PERSIAN_MONTHS[m - 1].days;
    }
    dayOfYear += d - 1;

    // یکشنبه = اندیس ۱ در هفته شمسی (شنبه: ۰، یکشنبه: ۱، ...)
    const dayOfWeek = (1 + dayOfYear) % 7;
    const isFriday = dayOfWeek === 6;

    const isOfficialHoliday = Boolean(holidayOccasion) || isFriday;
    const holidayReason = holidayOccasion?.title || (isFriday ? 'تعطیل هفتگی (جمعه)' : undefined);

    result.push({
      year,
      month: monthNumber,
      day: d,
      jalaliStr,
      gregorianStr: '',
      dayOfWeek,
      dayOfWeekName: WEEK_DAYS[dayOfWeek].name,
      isFriday,
      isOfficialHoliday,
      holidayReason,
      occasions: matchingOccasions.map((o) => o.title),
    });
  }

  return result;
}
