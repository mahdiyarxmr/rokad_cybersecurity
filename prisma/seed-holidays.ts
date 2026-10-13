import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HolidaySeedItem {
  date: string; // ISO date string (YYYY-MM-DD)
  titleFa: string;
}

/**
 * تعطیلات رسمی مصوب کشور (ملی، تقویمی و مناسبت‌های مذهبی استخراج‌شده از تقویم رسمی کشور)
 * برای سال‌های تحصیلی ۱۴۰۳-۱۴۰۴، ۱۴۰۴-۱۴۰۵ و ۱۴۰۵-۱۴۰۶
 */
const OFFICIAL_HOLIDAYS_SEED: HolidaySeedItem[] = [
  // --- سال ۱۴۰۳ (کبیسه نجومی) ---
  { date: '2024-03-20', titleFa: 'آغاز نوروز و سال نو' },
  { date: '2024-03-21', titleFa: 'عید نوروز' },
  { date: '2024-03-22', titleFa: 'عید نوروز' },
  { date: '2024-03-23', titleFa: 'عید نوروز' },
  { date: '2024-03-31', titleFa: 'روز جمهوری اسلامی ایران' },
  { date: '2024-04-01', titleFa: 'روز طبیعت (سیزده‌بدر)' },
  { date: '2024-04-10', titleFa: 'عید سعید فطر' },
  { date: '2024-04-11', titleFa: 'تعطیل به مناسبت عید فطر' },
  { date: '2024-05-04', titleFa: 'شهادت امام جعفر صادق (ع)' },
  { date: '2024-06-03', titleFa: 'رحلت امام خمینی (ره)' },
  { date: '2024-06-04', titleFa: 'قیام خونین ۱۵ خرداد' },
  { date: '2024-06-17', titleFa: 'عید سعید قربان' },
  { date: '2024-06-25', titleFa: 'عید سعید غدیر خم' },
  { date: '2024-07-15', titleFa: 'تاسوعای حسینی' },
  { date: '2024-07-16', titleFa: 'عاشورای حسینی' },
  { date: '2024-08-25', titleFa: 'اربعین حسینی' },
  { date: '2024-09-02', titleFa: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)' },
  { date: '2024-09-04', titleFa: 'شهادت امام رضا (ع)' },
  { date: '2024-09-12', titleFa: 'شهادت امام حسن عسکری (ع)' },
  { date: '2024-09-21', titleFa: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)' },
  { date: '2024-12-05', titleFa: 'شهادت حضرت فاطمه زهرا (س)' },
  { date: '2025-01-14', titleFa: 'ولادت حضرت امام علی (ع) و روز پدر' },
  { date: '2025-01-28', titleFa: 'مبعث حضرت رسول اکرم (ص)' },
  { date: '2025-02-10', titleFa: 'سالروز پیروزی انقلاب اسلامی ایران' },
  { date: '2025-02-15', titleFa: 'ولادت حضرت قائم (عج) و نیمه شعبان' },
  { date: '2025-03-19', titleFa: 'روز ملی شدن صنعت نفت ایران' },
  { date: '2025-03-20', titleFa: 'آخرین روز سال (تعطیل کبیسه ۳۰ اسفند)' },

  // --- سال ۱۴۰۴ (سال عادی - اسفند ۲۹ روزه) ---
  { date: '2025-03-21', titleFa: 'آغاز جشن نوروز و سال نو' },
  { date: '2025-03-22', titleFa: 'عید نوروز' },
  { date: '2025-03-23', titleFa: 'عید نوروز' },
  { date: '2025-03-24', titleFa: 'عید نوروز' },
  { date: '2025-03-31', titleFa: 'عید سعید فطر' },
  { date: '2025-04-01', titleFa: 'روز جمهوری اسلامی ایران / تعطیل عید فطر' },
  { date: '2025-04-02', titleFa: 'روز طبیعت (سیزده‌بدر)' },
  { date: '2025-04-24', titleFa: 'شهادت امام جعفر صادق (ع)' },
  { date: '2025-06-04', titleFa: 'رحلت امام خمینی (ره)' },
  { date: '2025-06-05', titleFa: 'قیام ۱۵ خرداد' },
  { date: '2025-06-06', titleFa: 'عید سعید قربان' },
  { date: '2025-06-14', titleFa: 'عید سعید غدیر خم' },
  { date: '2025-07-05', titleFa: 'تاسوعای حسینی' },
  { date: '2025-07-06', titleFa: 'عاشورای حسینی' },
  { date: '2025-08-14', titleFa: 'اربعین حسینی' },
  { date: '2025-08-22', titleFa: 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)' },
  { date: '2025-08-24', titleFa: 'شهادت امام رضا (ع)' },
  { date: '2025-09-01', titleFa: 'شهادت امام حسن عسکری (ع)' },
  { date: '2025-09-10', titleFa: 'میلاد رسول اکرم (ص) و امام صادق (ع)' },
  { date: '2025-11-24', titleFa: 'شهادت حضرت فاطمه زهرا (س)' },
  { date: '2026-01-03', titleFa: 'ولادت امام علی (ع)' },
  { date: '2026-01-17', titleFa: 'مبعث حضرت رسول اکرم (ص)' },
  { date: '2026-02-04', titleFa: 'ولادت حضرت مهدی (عج) و نیمه شعبان' },
  { date: '2026-02-11', titleFa: 'سالروز پیروزی انقلاب اسلامی' },
  { date: '2026-03-20', titleFa: 'روز ملی شدن صنعت نفت ایران' },

  // --- سال ۱۴۰۵ ---
  { date: '2026-03-21', titleFa: 'آغاز نوروز و سال نو' },
  { date: '2026-03-22', titleFa: 'عید نوروز' },
  { date: '2026-03-23', titleFa: 'عید نوروز' },
  { date: '2026-03-24', titleFa: 'عید نوروز' },
  { date: '2026-04-01', titleFa: 'روز جمهوری اسلامی ایران' },
  { date: '2026-04-02', titleFa: 'روز طبیعت (سیزده‌بدر)' },
  { date: '2026-05-13', titleFa: 'شهادت امام جعفر صادق (ع)' },
  { date: '2026-06-04', titleFa: 'رحلت امام خمینی (ره)' },
  { date: '2026-06-05', titleFa: 'قیام خونین ۱۵ خرداد' },
  { date: '2026-06-16', titleFa: 'عید سعید قربان' },
  { date: '2026-06-25', titleFa: 'عید سعید غدیر خم' },
  { date: '2026-07-14', titleFa: 'تاسوعای حسینی' },
  { date: '2026-07-15', titleFa: 'عاشورای حسینی' },
  { date: '2027-02-11', titleFa: 'پیروزی انقلاب اسلامی ایران' },
  { date: '2027-03-20', titleFa: 'روز ملی شدن صنعت نفت ایران' },
];

export async function seedOfficialHolidays() {
  console.log(`⏳ شروع ثبت تعطیلات رسمی کشوری (${OFFICIAL_HOLIDAYS_SEED.length} مناسبت)...`);

  let addedCount = 0;
  for (const item of OFFICIAL_HOLIDAYS_SEED) {
    const dateObj = new Date(`${item.date}T00:00:00.000Z`);

    await prisma.officialHoliday.upsert({
      where: { date: dateObj },
      update: { titleFa: item.titleFa },
      create: {
        date: dateObj,
        titleFa: item.titleFa,
      },
    });
    addedCount++;
  }

  console.log(`✅ با موفقیت ${addedCount} روز تعطیل رسمی کشوری در پایگاه داده ثبت شد.`);
}

if (require.main === module) {
  seedOfficialHolidays()
    .catch((e) => {
      console.error('❌ خطا در ثبت تعطیلات رسمی:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
