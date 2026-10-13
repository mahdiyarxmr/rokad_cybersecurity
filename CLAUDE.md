# دستورالعمل‌های توسعه و قوانین کدنویسی پلتفرم رکاد (CLAUDE.md)

این سند قوانین قطعی و استانداردهای برنامه‌نویسی و مهندسی نرم‌افزار را برای توسعه ماژول‌های پلتفرم رکاد (Rokad Platform) مشخص می‌کند. کلیه توسعه‌دهندگان و دستیارهای هوش مصنوعی موظف به رعایت ۱۰۰٪ این اصول هستند.

---

## ۱. استانداردهای زبان و فریم‌ورک
* **بک‌اند:** Node.js v20+ با **NestJS** و **TypeScript** در حالت Strict (`strict: true`).
* **ORM:** **Prisma ORM** با اتکا به Client Extensions برای اعمال خودکار فیلترهای چندمستأجری.
* **پایگاه داده:** PostgreSQL 16+ به همراه فعال بودن سیاست‌های RLS.
* **کش / صف:** Redis با کتابخانه `ioredis` و `BullMQ`.
* **مدیریت تاریخ:** تمام فیلدهای دیتابیس با UTC ذخیره می‌شوند (`DateTime @default(now())`). در لایه نمایش/پاسخ از Jalali Calendar استفاده می‌شود.

---

## ۲. قوانین طلایی چندمستأجری (Multi-Tenancy Golden Rules)

> [!CRITICAL]
> **قانون ۱: هیچ کوئری یا مدلی نباید بدون در نظر گرفتن `tenant_id` به دیتابیس فرستاده شود.**

1. **مدل‌های وابسته به تننت:** در فایل `schema.prisma`، هر جدولی که داده آن متعلق به یک مدرسه/شعبه است باید دارای فیلد `tenantId String` و رابطه با مدل `Tenant` باشد.
2. **ایندکس‌های ترکیبی اجباری:** در تمام جداول چندمستأجری، ایندکس‌های ترکیبی باید با `tenantId` آغاز شوند:
   ```prisma
   @@index([tenantId, createdAt])
   @@unique([tenantId, email])
   ```
3. **دسترسی به تننت در کنترلرها:** همیشه از دکوراتور `@CurrentTenant()` برای دریافت مشخصات مدرسه جاری استفاده شود.
4. **تزریق خودکار فیلترها:** از سرویس `PrismaService` که اکستنشن چندمستأجری را فعال کرده استفاده کنید. در شرایط کوئری مستقیم/Raw SQL، حتماً `current_setting('app.current_tenant_id')` را در نظر داشته باشید.

---

## ۳. ساختار پوشه‌بندی ماژولار (Clean Modular Architecture)

ساختار کد باید کاملاً ماژولار و مطابق با فازبندی‌های پروژه باشد:

```
src/
├── common/                  # ابزارها، اینترسپتورها، فیلترها، گاردها و دکوراتورهای عمومی
│   ├── decorators/          # @CurrentUser(), @CurrentTenant(), @RequireFeature(), @Roles()
│   ├── filters/             # HttpExceptionFilter (فرمت استاندارد خطاها)
│   ├── guards/              # JwtAuthGuard, RolesGuard, FeatureFlagGuard
│   ├── interceptors/        # TransformInterceptor, AuditLogInterceptor
│   ├── pipes/               # ValidationPipe عمومی
│   └── tenant/              # TenantContextService (AsyncLocalStorage), TenantMiddleware
├── config/                  # تنظیمات محیطی معتبرشده با Joi / Zod
├── database/ / prisma/      # PrismaService, PrismaTenantExtension, Seeds
├── modules/                 # ماژول‌های مستقل دامنه
│   ├── auth/                # فاز ۱: ورود، ثبت مدرسه، صدور توکن، مدیریت Token Family
│   ├── tenants/             # فاز ۱ و ۷: مدیریت مشخصات مدارس و ساب‌دامین‌ها
│   ├── feature-flags/       # فاز ۱: سیستم فعال/غیرفعال‌سازی ماژول‌ها per-tenant
│   ├── audit-log/           # فاز ۱: ثبت غیرهمگام رخدادهای ممیزی
│   ├── users/               # فاز ۲: کاربران، پرسنل، معلمان، دانش‌آموزان
│   ├── academic/            # فاز ۲ و ۳: سال تحصیلی، کلاس‌ها، دروس، برنامه هفتگی
│   ├── operations/          # فاز ۳: حضور و غیاب، تکالیف، تقویم
│   ├── lms/                 # فاز ۴: بانک سوال، آزمون‌ساز، نمرات
│   ├── live/                # فاز ۵: وب‌سوکت، چت زنده، کلاس آنلاین
│   └── finance/             # فاز ۶: شهریه، حقوق و دستمزد، سیستم کا
└── main.ts                  # نقطه ورود اصلی برنامه با Swagger و میدلورها
```

---

## ۴. استانداردهای نام‌گذاری (Naming Conventions)
* **فایل‌ها:** به صورت kebab-case (مانند `tenant-context.service.ts`, `jwt-auth.guard.ts`).
* **کلاس‌ها و اینترفیس‌ها:** به صورت PascalCase (مانند `TenantContextService`, `CreateSchoolDto`).
* **متغیرها و متدها:** به صورت camelCase (مانند `findTenantBySubdomain`, `refreshTokenFamily`).
* **جدول‌های دیتابیس:** به صورت PascalCase در پریزما (مانند `Tenant`, `User`, `FeatureFlag`).
* **فیلدهای جدول:** به صورت camelCase در پریزما و mapping به snake_case یا camelCase منظم.
* **ثابت‌ها و Enumها:** به صورت UPPER_SNAKE_CASE (مانند `Role.SCHOOL_ADMIN`, `TenantStatus.ACTIVE`).

---

## ۵. امنیت و احراز هویت (Authentication & Security)
* **رمز عبور:** فقط با الگوریتم **Argon2id** هش می‌شود. استفاده از md5، sha1 یا پلین تکست اکیداً ممنوع است.
* **توکن‌های JWT:**
  * `AccessToken`: کوتاه‌مدت (۱۵ دقیقه) شامل `sub` (User ID)، `tenantId`، `role` و `permissions`.
  * `RefreshToken`: بلندمدت (۷ تا ۳۰ روز) با الگوی **Token Family Rotation**.
* **تشخیص سرقت توکن (Reuse Detection):** در صورت دریافت یک رفرش توکن استفاده‌شده، بلافاصله کل توکن‌های آن خانواده باطل می‌شوند.
* **محافظت ورودی‌ها:** تمام DTOها باید با `class-validator` و `class-transformer` اعتبارسنجی شوند و `whitelist: true` و `forbidNonWhitelisted: true` روی `ValidationPipe` فعال باشد.

---

## ۶. قالب استاندارد پاسخ‌های API (Unified Response Format)
تمامی پاسخ‌های موفق API باید ساختار زیر را داشته باشند:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "عملیات با موفقیت انجام شد",
  "meta": {
    "timestamp": "2026-08-31T10:00:00.000Z",
    "tenantId": "cly..."
  }
}
```

و در صورت بروز خطا:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "شماره موبایل وارد شده نامعتبر است",
  "errors": [ ... ],
  "timestamp": "2026-08-31T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```
