# راهنمای مشارکت در توسعه رکاد (Contributing Guide)

از اینکه علاقه‌مند به مشارکت در توسعه پلتفرم **رکاد** هستید بسیار سپاسگزاریم! این سند راهنمایی برای نحوه ارسال تغییرات، گزارش مشکلات، استاندارد کامیت‌ها و روند بازبینی کد است.

---

## 🧭 اصول و استانداردهای کدنویسی

1. **Clean Architecture & Module Isolation:**
   - هر ماژول دامنه مشخصی دارد (مانند `auth`، `finance`، `gradebook`).
   - سرویس‌ها نباید به شکل حلقه‌ای (Circular Dependency) به یکدیگر وابسته باشند.
   - کلیه دسترسی‌ها به پایگاه داده از طریق Prisma Service صورت می‌گیرد.

2. **Zero-Trust Security Standard:**
   - تمام اندپوینت‌های مدیریتی باید گارد مناسب (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`) داشته باشند.
   - عملیات حساس نیازمند تایید دومرحله‌ای یا Step-Up Auth هستند.
   - مبالغ مالی بدون استثنا باید از تایپ `Decimal` در Prisma استفاده کنند؛ استفاده از تایپ `Float` برای مبالغ ممنوع است.

3. **Frontend UI & Accessibility:**
   - طراحی مطابق با سیستم دیزاین فارسی و فونت ایران‌سنس ایکس (`IRANSansXFaNum`).
   - ریسپانسیو بودن کامل در تبلت، موبایل و دسکتاپ.
   - استفاده از کامپوننت‌های پایه در `components/ui/`.

---

## 🔀 جریان کاری گیت (Git Workflow)

1. **انشعاب از شاخه اصلی:**
   همواره شاخه جدید خود را از آخرین نسخه `main` منشعب کنید:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   # یا برای رفع باگ:
   git checkout -b fix/issue-description
   ```

2. **شیوه‌نامه نام‌گذاری شاخه‌ها:**
   * `feat/...` برای قابلیت‌ها و ماژول‌های جدید
   * `fix/...` برای رفع باگ و اشکالات
   * `refactor/...` برای بهبود ساختار کد بدون تغییر رفتار
   * `docs/...` برای اصلاح یا افزودن مستندات
   * `test/...` برای آزمون‌ها و تست‌های سیستمی

3. **استاندارد کامیت‌ها (Conventional Commits):**
   پیام‌های کامیت باید با استاندارد بین‌المللی سازگار باشند:
   * `feat(finance): add sayad cheque ledger and maturity alerts`
   * `fix(auth): prevent timing attacks on totp verification`
   * `docs(readme): add system architecture diagram`
   * `refactor(gradebook): optimize cumulative GPA calculation`

---

## 🧪 مراحل اعتبارسنجی قبل از ارسال PR

پیش از ایجاد Pull Request، اجرای فرمان‌های زیر در سیستم شما الزامی است:

```bash
# ۱. کامپایل و بیلد بک‌اند
pnpm build

# ۲. کامپایل و بیلد فرانت‌اند
pnpm --filter rokad-frontend build

# ۳. اعتبارسنجی شمای دیتابیس
npx prisma validate

# ۴. اجرای تست‌ها
pnpm test
```

---

## 📬 ارسال Pull Request

1. تغییرات خود را به مخزن پوش کنید.
2. یک Pull Request جدید به سمت شاخه `main` باز کنید.
3. الگوی Pull Request باز شده را با دقت پر کنید و اسکرین‌شات‌ها یا لاگ‌های اعتبارسنجی را ضمیمه نمایید.
4. تیم توسعه در کوتاه‌ترین زمان ممکن کد شما را بازبینی و بازخورد ارائه خواهد داد.
