# بریف تکنیکال کامل — فرانت‌اند پلتفرم رکاد (Rokad Platform Frontend)

## ۱. معرفی و هدف

فرانت‌اند رکاد یک **اپلیکیشن یکپارچه SPA** است که چهار پرسونای اصلی پلتفرم (سوپرادمین SaaS، مدیر مدرسه/کادر، معلم، دانش‌آموز/والدین) را در یک کدبیس واحد، با **روت‌بندی بر اساس نقش (Role-Based Routing)**، سرویس می‌دهد. این اپ مستقیماً به API بک‌اند NestJS (فازهای ۱ تا ۷) متصل می‌شود و هیچ منطق تجاری در سمت کلاینت تکرار نمی‌شود — فرانت صرفاً مصرف‌کننده API است.

**دو استثنای مهم:** `SchoolProfile` (پروفایل عمومی مدرسه) و `ProfileBlog` (وبلاگ) صفحات عمومی و بدون‌نیاز-به-لاگین هستند و به‌عنوان یک **micro-app جدا با Next.js** (برای SEO/SSR) ساخته می‌شوند — خارج از اسکوپ این بریف.

---

## ۲. استک تکنولوژی

| لایه | انتخاب | دلیل |
|---|---|---|
| **Build Tool** | Vite | سرعت HMR بالا، سادگی پیکربندی، هم‌خوانی با استک سیستم کا |
| **زبان** | TypeScript (strict mode) | type-safety مشترک با اسکیمای Prisma بک‌اند (از طریق تولید خودکار تایپ‌ها) |
| **UI Framework** | React 18 | |
| **Routing** | React Router v6 (Data Router / `createBrowserRouter`) | پشتیبانی از nested layouts و loaders برای role-based routing |
| **مدیریت State سرور** | TanStack Query (React Query) | کش، invalidation، retry، هماهنگ با REST API بک‌اند؛ جایگزین Redux برای داده‌های سروری |
| **مدیریت State کلاینت** | Zustand | برای state سبک UI (سایدبار باز/بسته، تم، فیلترهای موقت) — نه برای داده سرور |
| **فرم‌ها** | React Hook Form + Zod | اعتبارسنجی schema-based، هماهنگ با DTOهای بک‌اند (Zod schema می‌تونه از روی همون Swagger/DTO تولید بشه) |
| **UI Kit** | shadcn/ui (روی Tailwind CSS) | کامپوننت‌های قابل‌شخصی‌سازی کامل (کپی می‌شن در کد، نه dependency بسته)، سازگاری خوب با RTL |
| **استایل‌دهی** | Tailwind CSS (با پلاگین RTL) | |
| **HTTP Client** | Axios (با Interceptor مرکزی) | برای پیاده‌سازی ساده‌تر Refresh Token Rotation در Interceptor |
| **Real-time** | socket.io-client | برای اتصال به ChatModule فاز ۵ (هم‌خوان با Redis Adapter بک‌اند) |
| **نمودار/چارت** | Recharts | برای داشبورد سوپرادمین و گزارش‌های مالی/تحصیلی |
| **جدول‌های داده** | TanStack Table | صفحه‌بندی، فیلتر، مرتب‌سازی سمت کلاینت/سرور برای لیست‌های حجیم (دانش‌آموزان، تراکنش‌ها) |
| **تست واحد** | Vitest + React Testing Library | هم‌خانواده با Vite |
| **تست E2E** | Playwright | پوشش جریان‌های کامل (لاگین → ثبت نمره → مشاهده کارنامه) |
| **i18n / RTL** | لایه i18n سفارشی یا `react-i18next` | فارسی زبان اصلی و RTL پیش‌فرض؛ ساختار باید از روز اول چندزبانه-پذیر باشه حتی اگه فعلاً فقط فارسیه |

---

## ۳. معماری روت‌بندی بر اساس نقش (Role-Based Routing)

```
/                        → صفحه ورود (Tenant-aware Login)
/app                     → Layout اصلی (بعد از احراز هویت)
  ├── /super-admin/*     → فقط User.role === SUPER_ADMIN
  ├── /admin/*           → فقط SCHOOL_ADMIN (+ Permission-gated sub-routes)
  ├── /teacher/*         → فقط TEACHER
  ├── /student/*         → فقط STUDENT
  └── /parent/*          → فقط PARENT
```

- **گارد دوسطحی سمت کلاینت** — دقیقاً هم‌راستا با معماری بک‌اند:
  1. `RoleGuard` (درشت): بر اساس `User.role` از JWT decode شده، مسیرهای غیرمجاز را قبل از رندر رد می‌کند (redirect به `/403` یا داشبورد پیش‌فرض نقش).
  2. `PermissionGuard` (ریز): برای صفحاتی که نیاز به Permission خاص دارند (مثلاً `finance.read` برای صفحه گزارش مالی داخل پنل مدیر)، لیست Permission های کاربر (که هنگام لاگین از `/api/v1/auth/me` گرفته می‌شود) چک می‌شود.
- **مهم:** گارد سمت کلاینت فقط برای UX است (مخفی کردن لینک‌ها، جلوگیری از رندر بی‌مورد) — هرگز جایگزین گارد سمت سرور (`PermissionsGuard` بک‌اند) نیست. باید فرض شود کاربر بدخواه می‌تواند مستقیماً به API درخواست بزند؛ امنیت واقعی همیشه سمت سرور است.

---

## ۴. ساختار پوشه‌بندی

```
src/
├── app/
│   ├── router.tsx                 ← تعریف تمام روت‌ها + Guardها
│   ├── providers.tsx              ← QueryClientProvider, ThemeProvider, ...
│   └── layouts/
│       ├── AuthLayout.tsx
│       ├── SuperAdminLayout.tsx
│       ├── SchoolAdminLayout.tsx
│       ├── TeacherLayout.tsx
│       └── StudentParentLayout.tsx
│
├── modules/                       ← هر پرسونا، ماژول مستقل با صفحات خودش
│   ├── super-admin/
│   │   ├── tenants/                (لیست، Onboarding، suspend/activate)
│   │   ├── subscriptions/          (Feature Flag per-tenant)
│   │   ├── role-builder/           (Dynamic Permission Builder)
│   │   └── platform-utils/         (Audit Log, Backup, File Mgmt)
│   ├── school-admin/
│   │   ├── academic/                (سال/ترم/مقطع/رشته/کلاس)
│   │   ├── members/                 (دانش‌آموز/معلم/پرسنل/والدین)
│   │   ├── finance/                 (شهریه، اقساط، تراکنش‌ها)
│   │   ├── payroll/
│   │   └── reports/
│   ├── teacher/
│   │   ├── attendance/
│   │   ├── homework/
│   │   ├── exams/
│   │   ├── gradebook/
│   │   └── lesson-plans/
│   ├── student-parent/
│   │   ├── homework/
│   │   ├── exams/
│   │   ├── grades/
│   │   ├── fee-payment/             (اتصال به Zarinpal از سمت کلاینت)
│   │   └── children/                (فقط والدین — my-children)
│   └── shared/
│       ├── chat/                    ← مشترک بین همه نقش‌ها
│       ├── notifications/
│       └── calendar/
│
├── components/                    ← کامپوننت‌های UI عمومی (shadcn/ui customized)
├── hooks/                          ← هوک‌های مشترک (useAuth, usePermission, useTenant)
├── lib/
│   ├── api/
│   │   ├── client.ts               ← نمونه Axios با baseURL و Interceptor
│   │   ├── endpoints/              ← هر ماژول بک‌اند یک فایل (attendance.api.ts, exams.api.ts, ...)
│   │   └── types/                  ← تایپ‌های تولیدشده از OpenAPI (بخش ۶)
│   ├── auth/
│   │   ├── token-storage.ts        ← مدیریت Access/Refresh Token
│   │   └── auth-context.tsx
│   └── socket/
│       └── socket-client.ts        ← اتصال socket.io با namespace بر اساس تننت
│
└── styles/
    └── globals.css                 ← Tailwind + تنظیمات RTL
```

---

## ۵. احراز هویت و مدیریت توکن (هماهنگ با فاز ۱ بک‌اند)

- **ذخیره Access Token:** در memory (Zustand store)، **نه** localStorage — برای کاهش ریسک XSS.
- **ذخیره Refresh Token:** به‌صورت `httpOnly Secure Cookie` (نیازمند تغییر کوچک در بک‌اند برای ست‌کردن کوکی به‌جای بازگرداندن توکن در body پاسخ) — این امن‌ترین الگوی رایج است. اگر بک‌اند فعلاً توکن را در body برمی‌گرداند، حداقل در `sessionStorage` (نه `localStorage`) نگه‌داری شود تا با بستن تب پاک شود.
- **Axios Interceptor:**
  - Request Interceptor: افزودن خودکار هدر `Authorization: Bearer <accessToken>`.
  - Response Interceptor: در صورت دریافت `401`، تلاش خودکار برای `POST /api/v1/auth/refresh` و تکرار درخواست اصلی؛ در صورت شکست refresh (یعنی Token Family Reuse Detection بک‌اند فعال شده)، logout کامل و ریدایرکت به صفحه ورود.
- **تشخیص تننت:** لاگین باید ساب‌دامین یا اسلاگ تننت را به هدر `x-tenant-slug` اضافه کند (هماهنگ با `TenantMiddleware` بک‌اند)، یا در آدرس‌دهی SPA از `{slug}.rokadschool.ir` استفاده شود.

---

## ۶. یکپارچگی نوع (Type Safety) بین فرانت و بک‌اند

برای جلوگیری از ناهماهنگی دستی بین DTOهای NestJS و تایپ‌های فرانت:

- از **`openapi-typescript`** یا **`orval`** برای تولید خودکار تایپ‌های TypeScript و/یا هوک‌های TanStack Query مستقیماً از مستندات Swagger بک‌اند (`http://localhost:4000/api/docs-json`) استفاده شود.
- این فرآیند در یک اسکریپت `pnpm generate:api-types` قرار گیرد که در CI هم قبل از build اجرا می‌شود — هرگونه Breaking Change در بک‌اند بلافاصله در فرانت خطای type-check ایجاد می‌کند (به‌جای باگ runtime).

---

## ۷. ملاحظات چندمستأجری در فرانت

- **برندینگ per-tenant:** بر اساس `SchoolProfile.brandTheme` (که در seed های قبلی دیدیم `MALE`/`FEMALE`/`ECOSYSTEM` بود)، رنگ‌بندی و لوگوی اپ باید در لود اولیه (قبل از رندر UI) از API خوانده و به‌صورت CSS Variables اعمال شود.
- **Feature Flag سمت کلاینت:** بعد از لاگین، لیست فلگ‌های فعال تننت از `/api/v1/feature-flags/my-school` گرفته و در یک Context/Store نگه‌داری شود؛ کامپوننت‌های مرتبط با ماژول‌های غیرفعال (مثلاً اگر یک مدرسه اشتراک LMS ندارد) اصلاً در منو رندر نمی‌شوند — هماهنگ با `FeatureFlagGuard` بک‌اند.

---

## ۸. مدیریت فایل و آپلود (هماهنگ با فاز ۵)

- آپلود مستقیم به MinIO از سمت کلاینت با **Presigned Upload URL** (نه عبور فایل از بک‌اند NestJS) — درخواست URL از `StorageService`، سپس `PUT` مستقیم به MinIO با پیشرفت آپلود (progress bar) از طریق Axios `onUploadProgress`.
- دانلود محتوای آموزشی نیز طبق معماری بک‌اند، ابتدا یک درخواست به API برای گرفتن Presigned Download URL کوتاه‌مدت (۱۵ دقیقه)، سپس باز کردن آن URL.

---

## ۹. ترتیب پیشنهادی توسعه پنل‌ها

```
۱. زیرساخت مشترک (Auth, Router, API Client, UI Kit, RTL setup)
۲. پنل سوپرادمین (اولویت تعیین‌شده)
۳. پنل مدیر مدرسه (بیشترین حجم ماژول)
۴. پنل معلم
۵. پنل دانش‌آموز/والدین
۶. ماژول‌های مشترک نهایی (چت زنده، اعلان‌های Push)
```

هر پنل به‌ترتیب زیرماژول‌های بک‌اند مربوطه (که در بریف‌های قبلی فازبندی شد) توسعه می‌یابد — یعنی همان منطق وابستگی بک‌اند، اینجا هم برای اولویت‌بندی صفحات تکرار می‌شود.

---

## ۱۰. نکات کیفیت و پرفورمنس

- **Code Splitting بر اساس ماژول نقش:** هر پوشه زیر `modules/` با `React.lazy` بارگذاری تنبل شود — یک دانش‌آموز نباید کد باندل پنل سوپرادمین را دانلود کند.
- **RTL از روز اول:** تمام کامپوننت‌های shadcn/ui و Tailwind باید با `dir="rtl"` تست شوند؛ آیکون‌های جهت‌دار (فلش، breadcrumb) باید نسخه آینه‌شده داشته باشند.
- **Skeleton Loading:** برای جداول و کارت‌های داده (به‌خصوص در پنل سوپرادمین با لیست تننت‌ها) به‌جای اسپینر ساده.
- **تست E2E حداقلی برای هر پنل قبل از merge:** یک جریان کامل (لاگین → عملیات اصلی → خروج) با Playwright، هم‌راستا با انضباط تستی که در بک‌اند رعایت شده.