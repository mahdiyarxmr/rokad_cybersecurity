import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  getTehranDayOfWeek,
  isValidJalaliDate,
  jalaliToGregorianDate,
  normalizePersianDigits,
  gregorianToJalali,
} from '../../common/utils/jalali.util';
import {
  CreateTenantHolidayDto,
  CreateOfficialHolidayDto,
} from './dto/create-holiday.dto';

export interface WorkingDayResult {
  isWorkingDay: boolean;
  date: string; // ISO or YYYY-MM-DD
  reason?: string;
}

@Injectable()
export class SchoolCalendarService {
  private readonly logger = new Logger(SchoolCalendarService.name);
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * تبدیل و نرمال‌سازی هر نوع ورودی تاریخ (شمسی، رشته میلادی یا شیء Date)
   * به یک شیء استاندارد Date در ابتدای روز UTC (جهت انطباق دقیق با ستون @db.Date در Postgres)
   */
  private normalizeDateOnly(dateInput: Date | string): { dateObj: Date; dateStr: string } {
    if (!dateInput) {
      throw new Error('تاریخ ورودی نامعتبر است');
    }

    let parsedDate: Date;
    if (dateInput instanceof Date) {
      parsedDate = dateInput;
    } else {
      const normalizedStr = normalizePersianDigits(dateInput);
      if (isValidJalaliDate(normalizedStr)) {
        parsedDate = jalaliToGregorianDate(normalizedStr, 'noon');
      } else {
        parsedDate = new Date(dateInput);
      }
    }

    if (isNaN(parsedDate.getTime())) {
      throw new Error(`تاریخ وارد شده قابل پردازش نیست: ${dateInput}`);
    }

    // استخراج تاریخ در افق زمانی تهران
    const tehranFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // خروجی استاندارد: "YYYY-MM-DD"
    const dateStr = tehranFormatter.format(parsedDate);
    const [gy, gm, gd] = dateStr.split('-').map(Number);

    // ساخت Date در 00:00:00 UTC برای مقایسه مستقیم در PostgreSQL @db.Date
    const dateObj = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0, 0));

    return { dateObj, dateStr };
  }

  /**
   * ساخت کلید کش اختصاصی در Redis برای بررسی روز کاری
   */
  private getCacheKey(tenantId: string, dateStr: string): string {
    return `rokad:calendar:working-day:${tenantId}:${dateStr}`;
  }

  /**
   * پاکسازی کش تاریخ مشخص برای یک مدرسه یا به صورت عمومی
   */
  async invalidateWorkingDayCache(tenantId: string, dateInput: Date | string): Promise<void> {
    try {
      const { dateStr } = this.normalizeDateOnly(dateInput);
      const cacheKey = this.getCacheKey(tenantId, dateStr);
      await this.redisService.del(cacheKey);
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate working day cache: ${err?.message}`);
    }
  }

  /**
   * تابع مرجع و مرکزی برای تعیین وضعیت «روز کاری» یا تعطیل بودن یک تاریخ
   * با کش‌گذاری سریع Redis و اعمال قاعده قطعی اولویت‌بندی:
   * اولویت ۱: جمعه (تعطیلی هفتگی الگوریتمی)
   * اولویت ۲: تعطیل رسمی کشور (OfficialHoliday)
   * اولویت ۳: تعطیل اختصاصی مدرسه (TenantHoliday)
   * اولویت ۴: روز کاری عادی (isWorkingDay: true)
   */
  async isWorkingDay(tenantId: string, dateInput: Date | string): Promise<WorkingDayResult> {
    const { dateObj, dateStr } = this.normalizeDateOnly(dateInput);
    const cacheKey = this.getCacheKey(tenantId, dateStr);

    // ۱. بررسی کش سریع Redis (Non-blocking)
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err: any) {
      // در صورت خطای ردیس، بدون توقف به کوئری پایگاه داده ادامه می‌دهیم
    }

    let result: WorkingDayResult;

    // ۲. اولویت ۱: بررسی روز جمعه (تعطیل هفتگی الگوریتمی)
    const { isFriday } = getTehranDayOfWeek(dateObj);
    if (isFriday) {
      result = {
        isWorkingDay: false,
        date: dateStr,
        reason: 'تعطیلی هفتگی (جمعه)',
      };
    } else {
      // ۳. اولویت ۲: بررسی تعطیل رسمی کشور (OfficialHoliday)
      const officialHoliday = await this.prisma.officialHoliday.findUnique({
        where: { date: dateObj },
      });

      if (officialHoliday) {
        result = {
          isWorkingDay: false,
          date: dateStr,
          reason: `تعطیل رسمی: ${officialHoliday.titleFa}`,
        };
      } else {
        // ۴. اولویت ۳: بررسی تعطیل اختصاصی مدرسه (TenantHoliday)
        const tenantHoliday = await this.prisma.tenantHoliday.findUnique({
          where: {
            tenantId_date: {
              tenantId,
              date: dateObj,
            },
          },
        });

        if (tenantHoliday) {
          result = {
            isWorkingDay: false,
            date: dateStr,
            reason: `تعطیل مدرسه: ${tenantHoliday.titleFa}`,
          };
        } else {
          // ۵. اولویت ۴: روز کاری عادی
          result = {
            isWorkingDay: true,
            date: dateStr,
          };
        }
      }
    }

    // ذخیره در کش Redis با TTL ۲۴ ساعته
    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);
    } catch (err: any) {
      // Non-blocking catch
    }

    return result;
  }

  /**
   * افزودن تعطیلی اختصاصی برای یک مدرسه
   */
  async addTenantHoliday(tenantId: string, dto: CreateTenantHolidayDto) {
    const { dateObj, dateStr } = this.normalizeDateOnly(dto.date);

    const existing = await this.prisma.tenantHoliday.findUnique({
      where: {
        tenantId_date: {
          tenantId,
          date: dateObj,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`برای این تاریخ قبلاً تعطیلی مدرسه ثبت شده است (${existing.titleFa})`);
    }

    const holiday = await this.prisma.tenantHoliday.create({
      data: {
        tenantId,
        date: dateObj,
        titleFa: dto.titleFa,
      },
    });

    // اینولیدیت کردن کش همان تاریخ
    await this.invalidateWorkingDayCache(tenantId, dateStr);

    return {
      ...holiday,
      jalaliInfo: gregorianToJalali(holiday.date),
    };
  }

  /**
   * حذف تعطیلی اختصاصی مدرسه
   */
  async removeTenantHoliday(tenantId: string, holidayId: string) {
    const holiday = await this.prisma.tenantHoliday.findFirst({
      where: { id: holidayId, tenantId },
    });

    if (!holiday) {
      throw new NotFoundException('تعطیلی مورد نظر یافت نشد');
    }

    await this.prisma.tenantHoliday.delete({
      where: { id: holidayId },
    });

    await this.invalidateWorkingDayCache(tenantId, holiday.date);

    return { message: 'تعطیلی مدرسه با موفقیت حذف گردید' };
  }

  /**
   * لیست تعطیلات اختصاصی مدرسه
   */
  async listTenantHolidays(tenantId: string) {
    const holidays = await this.prisma.tenantHoliday.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });

    return holidays.map((h) => ({
      ...h,
      jalaliInfo: gregorianToJalali(h.date),
    }));
  }

  /**
   * افزودن تعطیل رسمی کشوری (دسترسی ویژه سوپرادمین)
   */
  async addOfficialHoliday(dto: CreateOfficialHolidayDto) {
    const { dateObj, dateStr } = this.normalizeDateOnly(dto.date);

    const existing = await this.prisma.officialHoliday.findUnique({
      where: { date: dateObj },
    });

    if (existing) {
      throw new ConflictException(`تعطیل رسمی برای این تاریخ از قبل ثبت شده است (${existing.titleFa})`);
    }

    const holiday = await this.prisma.officialHoliday.create({
      data: {
        date: dateObj,
        titleFa: dto.titleFa,
      },
    });

    return {
      ...holiday,
      jalaliInfo: gregorianToJalali(holiday.date),
    };
  }

  /**
   * حذف تعطیل رسمی کشوری (دسترسی ویژه سوپرادمین)
   */
  async removeOfficialHoliday(holidayId: string) {
    const holiday = await this.prisma.officialHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday) {
      throw new NotFoundException('تعطیل رسمی مورد نظر یافت نشد');
    }

    await this.prisma.officialHoliday.delete({
      where: { id: holidayId },
    });

    return { message: 'تعطیل رسمی با موفقیت حذف گردید' };
  }

  /**
   * دریافت لیست تمام تعطیلات رسمی کشور
   */
  async listOfficialHolidays() {
    const holidays = await this.prisma.officialHoliday.findMany({
      orderBy: { date: 'asc' },
    });

    return holidays.map((h) => ({
      ...h,
      jalaliInfo: gregorianToJalali(h.date),
    }));
  }

  /**
   * دریافت تجمیعی تعطیلات (رسمی + اختصاصی مدرسه) در یک بازه زمانی
   */
  async listHolidaysInRange(tenantId: string, startDateInput: Date | string, endDateInput: Date | string) {
    const { dateObj: startDate } = this.normalizeDateOnly(startDateInput);
    const { dateObj: endDate } = this.normalizeDateOnly(endDateInput);

    const [officialHolidays, tenantHolidays] = await Promise.all([
      this.prisma.officialHoliday.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.tenantHoliday.findMany({
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    return {
      officialHolidays: officialHolidays.map((h) => ({
        ...h,
        jalaliInfo: gregorianToJalali(h.date),
      })),
      tenantHolidays: tenantHolidays.map((h) => ({
        ...h,
        jalaliInfo: gregorianToJalali(h.date),
      })),
    };
  }
}
