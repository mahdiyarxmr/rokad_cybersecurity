import { normalizePersianDigits } from './jalali.util';

export interface TenantCredentialContext {
  slug?: string | null;
  theme?: string | null;
  type?: string | null;
  name?: string | null;
}

/**
 * تعیین پیش‌وند رمز عبور بر اساس نوع شعبه مرکز آموزشی:
 * - 'b' برای هنرستان پسرانه (Boys)
 * - 'g' برای هنرستان دخترانه (Girls)
 * - 'c' برای کالج رکاد (College)
 */
export function getTenantPasswordPrefix(
  tenant?: TenantCredentialContext | null,
): 'b' | 'g' | 'c' {
  if (!tenant) return 'b';

  const slug = (tenant.slug || '').toLowerCase();
  const theme = (tenant.theme || '').toUpperCase();
  const name = (tenant.name || '').toLowerCase();
  const type = (tenant.type || '').toUpperCase();

  // 1. Girls School
  if (
    slug.includes('girl') ||
    slug.includes('dokhtar') ||
    theme === 'FEMALE' ||
    name.includes('دختر')
  ) {
    return 'g';
  }

  // 2. College
  if (
    slug.includes('college') ||
    theme === 'COLLEGE' ||
    type === 'COLLEGE' ||
    name.includes('کالج')
  ) {
    return 'c';
  }

  // 3. Boys School (default fallback for vocational boys)
  if (
    slug.includes('boy') ||
    slug.includes('pesar') ||
    theme === 'MALE' ||
    name.includes('پسر')
  ) {
    return 'b';
  }

  return 'b';
}

/**
 * نرمال‌سازی کد ملی (تبدیل ارقام فارسی/عربی، حذف فواصل و کاراکترهای غیرعددی)
 */
export function normalizeNationalCode(
  code?: string | number | null,
): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '');
  return digitsOnly.trim();
}

/**
 * حذف صفرهای اول کد ملی (یا عدد) جهت ساخت نام کاربری و شماره استاندارد
 * - مثال: 0960158881 -> 960158881
 * - کدهای بدون صفر اول دست‌نخورده باقی می‌مانند: 6420024730 -> 6420024730
 */
export function stripLeadingZero(code?: string | number | null): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '');
  const stripped = digitsOnly.replace(/^0+/, '');
  return stripped || digitsOnly;
}

/**
 * تولید خودکار نام کاربری و رمز عبور یکپارچه:
 * - نام کاربری = کد ملی بدون صفر اول (کدهای بدون صفر بدون تغییر می‌مانند)
 * - رمز عبور = پیش‌وند شعبه (b / g / c) + کد ملی بدون صفر اول
 */
export function generateUnifiedCredentials(params: {
  tenant?: TenantCredentialContext | null;
  nationalCode?: string | number | null;
  fallbackPhone?: string | number | null;
  customPassword?: string | null;
}): {
  username: string;
  nationalId?: string;
  defaultPassword: string;
  finalPassword: string;
  prefix: 'b' | 'g' | 'c';
} {
  const prefix = getTenantPasswordPrefix(params.tenant);
  const cleanNationalCode = normalizeNationalCode(params.nationalCode);
  const strippedCode = stripLeadingZero(params.nationalCode);
  const cleanPhone = normalizePersianDigits(params.fallbackPhone).replace(/\D/g, '').trim();

  const username = strippedCode || cleanPhone || `user_${Date.now()}`;
  const defaultPassword = strippedCode
    ? `${prefix}${strippedCode}`
    : cleanPhone
      ? `${prefix}${cleanPhone}`
      : 'RokadPass2026!';
  const finalPassword = params.customPassword?.trim() ? params.customPassword.trim() : defaultPassword;

  return {
    username,
    nationalId: cleanNationalCode || undefined,
    defaultPassword,
    finalPassword,
    prefix,
  };
}

/**
 * تولید شماره دانش‌آموزی استاندارد بر مبنای کد ملی بدون صفر:
 * طبق استاندارد آموزش و پرورش و سامانه‌های سیدا/سناد، شماره دانش‌آموزی معادل کد ملی بدون صفر اول (صفرهای سمت چپ) است.
 * مثال: 0012345678 -> 12345678
 * مثال: 0923456789 -> 923456789
 * در صورت عدم وجود کد ملی، از شماره همراه بدون صفر یا عدد تصادفی استفاده می‌شود.
 */
export function deriveStudentCode(
  nationalCode?: string | number | null,
  fallbackPhone?: string | number | null,
): string {
  const strippedCode = stripLeadingZero(nationalCode);
  if (strippedCode) {
    return strippedCode;
  }

  const cleanPhone = normalizePersianDigits(fallbackPhone)
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .trim();
  if (cleanPhone) {
    return cleanPhone;
  }

  return String(Math.floor(10000000 + Math.random() * 90000000));
}

/**
 * تولید خودکار شناسه و رمز عبور یکپارچه برای والد دانش‌آموز:
 * - نام کاربری سیستمی والد = p + کد ملی فرزند بدون صفر
 * - رمز عبور والد = پیش‌وند 'p' + کد ملی فرزند بدون صفر (مثال: p960158881)
 */
export function generateParentCredentials(params: {
  studentNationalCode?: string | number | null;
  fallbackPhone?: string | number | null;
  customPassword?: string | null;
}): {
  username: string;
  defaultPassword: string;
  finalPassword: string;
} {
  const strippedCode = stripLeadingZero(params.studentNationalCode);
  const cleanPhone = normalizePersianDigits(params.fallbackPhone).replace(/\D/g, '').trim();

  const username = strippedCode
    ? `p${strippedCode}`
    : cleanPhone
      ? `p${cleanPhone}`
      : `parent_${Date.now()}`;
  const defaultPassword = strippedCode
    ? `p${strippedCode}`
    : cleanPhone
      ? `p${cleanPhone}`
      : 'RokadParent2026!';
  const finalPassword = params.customPassword?.trim() ? params.customPassword.trim() : defaultPassword;

  return {
    username,
    defaultPassword,
    finalPassword,
  };
}
