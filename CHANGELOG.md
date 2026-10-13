# Changelog

All notable changes to the **Rokad Platform** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-09

### 🚀 Added & Improved
- **بازطراحی صفحه ورود (LoginPage Redesign & Orbit Showcase):**
  - بازطراحی فرم ورود با چیدمان اسپلیت‌اسکرین مدرن و پنل دکوراتیو چرخشی انیمیشنی (Orbits) حاوی آیکون‌های پلتفرم و نماد رُکاد.
  - پشتیبانی کامل از دارک‌مود، تشخیص هوشمند روشن بودن کلید Caps Lock، دکمه پیشرفته نمایش/مخفی‌سازی رمز عبور با پوزیشنینگ ایزوله، و ارزیابی فیلد به فیلد با فوکوس خودکار.
  - تعبیه قابلیت `endAction` در مؤلفه ورودی [Input.tsx](file:///Users/behrad/Desktop/Projects/rokad-platform/frontend/src/components/ui/Input.tsx) و رفع هم‌پوشانی آیکون‌ها و خطاها.
  - بهینه‌سازی کامل ریسپانسیو موبایل با واحدهای `min-h-dvh` و حذف لایوت‌های متداخل قدیمی.
- **مشاهده‌پذیری و نظارت زنده (Observability & Health Checks):**
  - ارتقای اندپوینت `/health` با کد وضعیت واقعی HTTP 503 در صورت اختلال در PostgreSQL یا Redis جهت اطلاع فوری سیستم‌های پایش آپ‌تایم خارجی.
  - محاسبه و نمایش تاخیر میلی‌ثانیه‌ای دیتابیس و ردیس (`databaseMs`, `redisMs`).
  - افزودن پروب لایونس `/health/live` و ریدینس `/health/ready` و سازگاری با هر دو روت `/health` و `/api/v1/health`.
  - یکپارچه‌سازی سرویس دیده‌بان نبض (Dead Man's Snitch) با Better Stack Heartbeat جهت ارسال خودکار پالس‌های دوره‌ای و هشدار قطعی سرور یا دیتابیس.

## [1.0.1] - 2026-10-03

### 🚀 Fixed & Improved
- **همگام‌سازی لحظه‌ای داده‌ها و رفع مغایرت کش بین دستگاه‌ها (Data Sync & Cache Elimination):**
  - حذف کامل قانون کشینگ `api-metadata-cache` از Workbox و الزام قطعی ارسال کلیه درخواست‌های API به شبکه (`NetworkOnly`).
  - افزودن هدرهای ضد کش استاندارد (`Cache-Control: no-store, no-cache, must-revalidate`) و `Vary: Authorization, Origin, x-tenant-id` در کلیه پاسخ‌های API بک‌اند.
  - کاهش زمان ماندگاری کش React Query (`staleTime: 15s`) و فعال‌سازی بازیابی مجدد با فوکوس پنجره و اتصال مجدد شبکه (`refetchOnWindowFocus: true` و `refetchOnReconnect: true`).
  - افزودن پیکربندی اختصاصی `frontend/nginx.conf` برای هاست لیارا جهت تضمین عدم کش شدن فایل‌های ورودی PWA (`index.html`, `sw.js`, `push-worker.js`, `version.json`).
- **سیستم ارتقایافته کشف و اعمال آپدیت‌های PWA:**
  - استخراج خودکار فایل استاتیک `version.json` با شناسه یکتای زمان بیلد (`buildId`) در هر بار کامپایل برای تشخیص آنی نسخه جدید.
  - بازنویسی مکانیزم `forceAppUpdate` جهت جلوگیری از ایجاد لوپ ریفرش و تضمین ارتقای روان سرویس‌ورکر.
  - افزودن لیسنر فعال‌شدن صفحه گوشی (`visibilitychange`) جهت بررسی فوری نسخه به محض باز کردن برنامه.
- **تفکیک اکانت‌های چندنقشه و ورود همزمان (Multi-Role Support):**
  - پشتیبانی از پیشوند نام کاربری معلمی (`t09154489820`) و اولویت‌بندی تطابق نام کاربری در فرآیند احراز هویت.

## [0.7.14] - 2026-09-21

### 🚀 Fixed & Improved
- **پلتفرم گیمیفیکیشن و رتبه‌بندی «کا» (Ka Platform & Profile Avatars):**
  - افزودن دسترسی عمومی و تنظیم پالیسی خواندن روی مخزن ذخیره‌ساز ابری (MinIO Public Read Policy) برای نمایش مستقیم تصاویر پروفایل بدون مسدودیت 403.
  - یکپارچه‌سازی ابعاد تمام آواتارهای سکوی افتخار (Top 3 Podium) در سایز استاندارد و مربعی `w-14 h-14 sm:w-18 sm:h-18` با برش مرکز (`object-cover object-center aspect-square`).
  - حذف آیکون جام جهنده بالای آواتار نفر اول سکو جهت حفظ تقارن و زیبایی چیدمان بصری.
  - اتصال تصویر نمایه کاربر به دیتابیس PostgreSQL و اندپوینت `PATCH /auth/profile` همراه با پشتیبانی کامل در تمام جدول‌ها، هدر و پرونده تفصیلی هنرجویان.

## [0.7.12] - 2026-09-21

### 🚀 Added
- **سیستم مدیریت نسخه و انتشار پلتفرم (Release Versioning & PWA Auto-Update):**
  - تزریق خودکار نسخه در زمان کامپایل (`__APP_VERSION__` و `__BUILD_TIME__`) در Vite و خواندن مستقیم از `package.json` ریشه.
  - اندپوینت عمومی `GET /api/v1/version` برای استعلام سبک وضعیت نسخه، تاریخ بیلد و محیط ران‌تایم سرور.
  - هوک کلاینت `useAppVersionCheck` با پولینگ دوره‌ای ۵ دقیقه‌ای و استعلام در رویداد فوکوس مجدد تب مرورگر (`window onfocus` / `visibilitychange`).
  - ارتقای مؤلفه `PwaUpdatePrompt` با شناسایی ناهماهنگی نسخه و ارائه دکمه فورس‌آپدیت برای اجرای `skipWaiting()`، پاکسازی کش منسوخ مرورگر و بارگذاری مجدد.
  - الصاق خودکار هدر `X-App-Version` در تمام درخواست‌های Axios کلاینت و استخراج در فیلتر خطای سرور (`HttpExceptionFilter`) و متادیتای `AuditLog`.
  - اسکریپت `scripts/sync-version.js` (`npm run version:sync`) جهت تضمین همگام‌سازی دائمی شماره نسخه در ریشه و فرانت‌اند.
- **پلتفرم گیمیفیکیشن و توسعه مهارتی «کا» (Ka Platform):**
  - بازطراحی نئوبروتالیسم اسلایدرهای ۴ حوزه ارزیابی کا (آموزشی ۵۸۰، داوطلبانه ۳۶۰، شغلی ۲۳۵ و کسر انضباطی) همراه با جدول فرمول‌های محاسباتی هر ۲۲ فعالیت.
  - باتم‌شیت مودال اختصاصی بازشونده از پایین (Bottom Sheet Modal) در جدول رتبه‌بندی و سکوی افتخار (Top 3 Podium) با کلیک روی هر هنرجو.
  - تفکیک نقش‌ها و جریان ثبت فعالیت‌های شغلی برای دانش‌آموزان و میز ارزیابی و ثبت مستقیم نمره برای کادر مدرسه.

### 🛡️ Security & Observability
- ردیابی نسخه کلاینت روی خطاهای سرور و زنجیره رخدادهای امنیتی Audit Log جهت تسهیل دیباگ و شناسایی خطاهای کاربران دارای نسخه‌های قدیمی PWA.
- مجازسازی هدر `X-App-Version` در پیکربندی CORS بک‌اند.

---

## [1.0.0] - 2026-09-19

### 🚀 Added
- **Enterprise Zero-Trust Security Suite:**
  - RFC 6238 compliant Two-Factor Authentication (2FA TOTP) with QR generation and recovery codes.
  - Step-Up Authentication (`StepUpGuard`) for high-privilege operations (permission escalation, user deletion, financial settlements).
  - AES-256-GCM Envelope Encryption for sensitive PII data with per-record Data Encryption Keys (DEK).
  - HMAC-SHA256 Blind Indexing with secret pepper for sub-millisecond query performance over encrypted national codes and phones.
  - Cryptographic Chained Audit Logs (Blockchain-like SHA-256 Previous Hash linking) with external anchoring to Telegram channels.
  - Distributed Sliding-Window Anti-Brute-Force rate limiter backed by Redis.
- **Financial & Treasury Engine:**
  - Complete migration to Prisma `Decimal(15, 2)` for floating-point error elimination.
  - Dynamic `balanceRemaining` tracking on fee contracts.
  - Annual `FeePlan` model with configurable scopes (`ALL_SCHOOL`, `EDUCATIONAL_LEVEL`, `CLASSROOM`) and atomic group debt allocation.
  - Comprehensive Sayad Cheque Ledger with 16-digit ID validation, status lifecycle (`PENDING`, `CASHED`, `BOUNCED`, `REPLACED`), and automatic `hasFinancialHold` flag on bounced cheques.
  - Automated daily Cheque Reminder Scheduler at 09:00 AM for 3-day, 1-day, and due-day alerts.
  - Two-stage Excel batch import with server-side error validation and preview before commit.
  - Zarinpal online gateway integration with cryptographic idempotency and automatic receipt generation.
- **Multi-Tenant SaaS Operations:**
  - Two-tier tenant isolation (Prisma Client Extension + PostgreSQL Row-Level Security).
  - SuperAdmin platform operations console with live CPU, RAM, Redis, MinIO, and database health metrics.
  - Tenant provisioning, subscription plan assignments, and custom branding engine.
- **Next-Gen Academic & LMS Engine:**
  - Course curriculums, lesson plans, class enrollments, and schedule conflict resolution.
  - Automated gradebook with weighted continuous assessments and PDF report card generator.
  - Online exam engine with multiple-choice / descriptive question bank and timer enforcement.
  - Homework assignment submission portal backed by MinIO S3 object storage.
- **Realtime Communications & PWA:**
  - WebSocket multi-room chat powered by Socket.io and `@socket.io/redis-adapter`.
  - WebPush notifications via standard VAPID protocol.
  - Offline-first Progressive Web App (PWA) manifest with service worker caching.
  - Multi-child Parent Portal with direct Zarinpal checkout and cheque status monitoring.

### 🛡️ Security
- Timing-safe comparisons (`crypto.timingSafeEqual`) on all authentication tokens and webhook signatures.
- Principle of least privilege enforced via fine-grained RBAC permissions catalog.
- Helmet HTTP security headers and CORS protection with strict origin whitelisting.
