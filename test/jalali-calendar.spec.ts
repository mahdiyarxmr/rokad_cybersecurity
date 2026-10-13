import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import * as jalaali from 'jalaali-js';
import { AppModule } from '../src/app.module';
import {
  normalizePersianDigits,
  toPersianDigits,
  isValidJalaliDate,
  jalaliToGregorianDate,
  gregorianToJalali,
  getDefaultAcademicYearBoundaries,
} from '../src/common/utils/jalali.util';
import { IsJalaliDate } from '../src/common/decorators/is-jalali-date.decorator';
import { SchoolCalendarService } from '../src/modules/calendar/school-calendar.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

class SampleDateDto {
  @IsJalaliDate()
  date: string;
}

describe('Jalali Calendar Architecture & Edge Cases Tests', () => {
  let app: INestApplication;
  let calendarService: SchoolCalendarService;
  let prisma: PrismaService;
  let redisService: RedisService;
  const testTenantId = 'test-tenant-calendar-spec';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    calendarService = app.get<SchoolCalendarService>(SchoolCalendarService);
    prisma = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);

    // آماده‌سازی Tenant برای تست
    await prisma.tenant.upsert({
      where: { id: testTenantId },
      update: {},
      create: {
        id: testTenantId,
        name: 'هنرستان آزمایشی تقویم',
        slug: 'test-calendar-school',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.tenantHoliday.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.officialHoliday.deleteMany({
        where: {
          date: {
            in: [
              new Date('2025-05-10T00:00:00.000Z'),
              new Date('2025-05-11T00:00:00.000Z'),
            ],
          },
        },
      });
      await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Astronomical Leap Year & Esfand Length Tests (الگوریتم نجومی کبیسه)', () => {
    it('سال ۱۴۰۳ باید کبیسه باشد و اسفند ۳۰ روز داشته باشد', () => {
      expect(jalaali.isLeapJalaaliYear(1403)).toBe(true);
      expect(isValidJalaliDate('1403-12-30')).toBe(true);
      expect(isValidJalaliDate('1403-12-29')).toBe(true);
    });

    it('سال ۱۴۰۴ باید سال عادی باشد و اسفند ۳۰ روزه را رد کند', () => {
      expect(jalaali.isLeapJalaaliYear(1404)).toBe(false);
      expect(isValidJalaliDate('1404-12-30')).toBe(false);
      expect(isValidJalaliDate('1404-12-29')).toBe(true);
    });

    it('بررسی تعداد روزهای ماه‌های نیمه اول و دوم سال', () => {
      // ماه‌های ۱ تا ۶ باید ۳۱ روزه باشند
      expect(isValidJalaliDate('1404-01-31')).toBe(true);
      expect(isValidJalaliDate('1404-06-31')).toBe(true);
      expect(isValidJalaliDate('1404-06-32')).toBe(false);

      // ماه‌های ۷ تا ۱۱ باید ۳۰ روزه باشند
      expect(isValidJalaliDate('1404-07-30')).toBe(true);
      expect(isValidJalaliDate('1404-07-31')).toBe(false);
      expect(isValidJalaliDate('1404-11-30')).toBe(true);
      expect(isValidJalaliDate('1404-11-31')).toBe(false);
    });
  });

  describe('2. Persian/Arabic Digits Normalization (نرمال‌سازی ارقام فارسی و عربی)', () => {
    it('ارقام فارسی و عربی را به انگلیسی تبدیل کند', () => {
      expect(normalizePersianDigits('۱۴۰۴-۰۷-۰۱')).toBe('1404-07-01');
      expect(normalizePersianDigits('١٤٠٤-٠٧-٠١')).toBe('1404-07-01');
      expect(normalizePersianDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('تبدیل اعداد انگلیسی به فارسی برای لایه نمایش', () => {
      expect(toPersianDigits('1404-07-01')).toBe('۱۴۰۴-۰۷-۰۱');
    });

    it('اعتبارسنجی با ارقام فارسی معتبر ارزیابی شود', () => {
      expect(isValidJalaliDate('۱۴۰۴-۰۷-۰۱')).toBe(true);
      expect(isValidJalaliDate('۱۴۰۴-۱۲-۳۰')).toBe(false); // در سال ۱۴۰۴ اسفند ۳۰ روز ندارد
    });
  });

  describe('3. Validation Decorator @IsJalaliDate()', () => {
    it('ورودی معتبر شمسی را تأیید کند', async () => {
      const dto = new SampleDateDto();
      dto.date = '1404-07-01';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('ورودی با ارقام فارسی معتبر را تأیید کند', async () => {
      const dto = new SampleDateDto();
      dto.date = '۱۴۰۴-۰۷-۰۱';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('روز غیرمجاز (مثل ۳۰ اسفند ۱۴۰۴) را با خطای مناسب رد کند', async () => {
      const dto = new SampleDateDto();
      dto.date = '1404-12-30';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isJalaliDate).toContain('معتبر نیست');
    });
  });

  describe('4. Timezone & Tehran Horizon Normalization (تبدیل بدون لغزش نیمه‌شب)', () => {
    it('تبدیل تاریخ شمسی به میلادی و بازگشت به شمسی باید دقیق و منطبق باشد', () => {
      const gregorianDate = jalaliToGregorianDate('1404-07-01');
      const jalaliObj = gregorianToJalali(gregorianDate);

      expect(jalaliObj).not.toBeNull();
      expect(jalaliObj?.jalali).toBe('1404-07-01');
      expect(jalaliObj?.jalaliDisplay).toBe('۱ مهر ۱۴۰۴');
    });

    it('محاسبه صحیح مرز سال تحصیلی پیشنهادی', () => {
      const boundaries = getDefaultAcademicYearBoundaries(1404);
      const startJalali = gregorianToJalali(boundaries.startDate);
      const endJalali = gregorianToJalali(boundaries.endDate);

      expect(startJalali?.jalali).toBe('1404-07-01');
      expect(endJalali?.jalali).toBe('1405-03-31');
      expect(boundaries.titleFa).toBe('۱۴۰۴-۱۴۰۵');
    });
  });

  describe('5. Precedence Rules & Collision in isWorkingDay (اولویت‌بندی همزمانی)', () => {
    // جمعه ثابت: 2025-05-09 (معادل ۱۹ اردیبهشت ۱۴۰۴ - روز جمعه)
    // شنبه کاری: 2025-05-10 (معادل ۲۰ اردیبهشت ۱۴۰۴ - شنبه)
    // یکشنبه کاری: 2025-05-11 (معادل ۲۱ اردیبهشت ۱۴۰۴ - یکشنبه)

    it('اولویت ۱: روز جمعه باید به عنوان تعطیل هفتگی شناخته شود', async () => {
      const fridayDate = '2025-05-09';
      const res = await calendarService.isWorkingDay(testTenantId, fridayDate);

      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toBe('تعطیلی هفتگی (جمعه)');
    });

    it('اولویت ۲: تعطیل رسمی کشوری باید روز را تعطیل اعلام کند', async () => {
      const testDate = new Date('2025-05-10T00:00:00.000Z');
      await prisma.officialHoliday.upsert({
        where: { date: testDate },
        update: { titleFa: 'آزمون تعطیل رسمی' },
        create: { date: testDate, titleFa: 'آزمون تعطیل رسمی' },
      });

      const res = await calendarService.isWorkingDay(testTenantId, '2025-05-10');
      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toBe('تعطیل رسمی: آزمون تعطیل رسمی');
    });

    it('تداخل همزمانی: اگر هم تعطیل رسمی و هم تعطیل مدرسه در یک روز باشند، تعطیل رسمی ارجح است', async () => {
      const testDate = new Date('2025-05-10T00:00:00.000Z');

      // ثبت تعطیلی مدرسه در همان روز
      await prisma.tenantHoliday.upsert({
        where: {
          tenantId_date: {
            tenantId: testTenantId,
            date: testDate,
          },
        },
        update: { titleFa: 'تعطیلی داخلی مدرسه' },
        create: {
          tenantId: testTenantId,
          date: testDate,
          titleFa: 'تعطیلی داخلی مدرسه',
        },
      });

      // پاکسازی کش جهت بررسی منطق دیتابیس
      await calendarService.invalidateWorkingDayCache(testTenantId, '2025-05-10');

      const res = await calendarService.isWorkingDay(testTenantId, '2025-05-10');
      expect(res.isWorkingDay).toBe(false);
      // بر اساس قانون اولویت، تعطیل رسمی ارجح است
      expect(res.reason).toBe('تعطیل رسمی: آزمون تعطیل رسمی');
    });

    it('اولویت ۳: در صورت عدم وجود تعطیل رسمی، تعطیلی مدرسه اعمال می‌شود', async () => {
      const testDate2 = new Date('2025-05-11T00:00:00.000Z');

      await prisma.tenantHoliday.upsert({
        where: {
          tenantId_date: {
            tenantId: testTenantId,
            date: testDate2,
          },
        },
        update: { titleFa: 'اردوی آموزشی برون‌استانی' },
        create: {
          tenantId: testTenantId,
          date: testDate2,
          titleFa: 'اردوی آموزشی برون‌استانی',
        },
      });

      await calendarService.invalidateWorkingDayCache(testTenantId, '2025-05-11');

      const res = await calendarService.isWorkingDay(testTenantId, '2025-05-11');
      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toBe('تعطیل مدرسه: اردوی آموزشی برون‌استانی');
    });

    it('اولویت ۴: روز عادی غیرتعطیل باید روز کاری باشد', async () => {
      // دوشنبه عادی: 2025-05-12
      const normalWorkday = '2025-05-12';
      await calendarService.invalidateWorkingDayCache(testTenantId, normalWorkday);

      const res = await calendarService.isWorkingDay(testTenantId, normalWorkday);
      expect(res.isWorkingDay).toBe(true);
      expect(res.reason).toBeUndefined();
    });
  });

  describe('6. Redis Cache Layer in isWorkingDay', () => {
    it('بار دوم باید پاسخ مستقیم از کش بازگردانده شود', async () => {
      const testDay = '2025-05-13';
      await calendarService.invalidateWorkingDayCache(testTenantId, testDay);

      // فراخوانی اول (کش ست می‌شود)
      const res1 = await calendarService.isWorkingDay(testTenantId, testDay);
      expect(res1.isWorkingDay).toBe(true);

      // تغییر ساختگی در کش برای راستی‌آزمایی اینکه بار دوم از کش می‌آید
      const cacheKey = `rokad:calendar:working-day:${testTenantId}:${testDay}`;
      await redisService.set(
        cacheKey,
        JSON.stringify({ isWorkingDay: false, date: testDay, reason: 'لودشده از کش' }),
      );

      // فراخوانی دوم (باید مقدار کش را بازگرداند)
      const res2 = await calendarService.isWorkingDay(testTenantId, testDay);
      expect(res2.isWorkingDay).toBe(false);
      expect(res2.reason).toBe('لودشده از کش');

      // اینولیدیت کش
      await calendarService.invalidateWorkingDayCache(testTenantId, testDay);
      const res3 = await calendarService.isWorkingDay(testTenantId, testDay);
      expect(res3.isWorkingDay).toBe(true);
    });
  });
});
