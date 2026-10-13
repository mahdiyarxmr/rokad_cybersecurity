import { randomBytes } from 'crypto';
import { normalizePersianDigits } from './jalali.util';

export interface TenantCredentialContext {
  slug?: string | null;
  theme?: string | null;
  type?: string | null;
  name?: string | null;
}

/**
 * پیش‌وند رمز عبور بر اساس نوع شعبه:
 * b پسرانه، g دخترانه، c کالج.
 */
export function getTenantPasswordPrefix(
  tenant?: TenantCredentialContext | null,
): 'b' | 'g' | 'c' {
  if (!tenant) return 'b';

  const slug = (tenant.slug || '').toLowerCase();
  const theme = (tenant.theme || '').toUpperCase();
  const name = (tenant.name || '').toLowerCase();
  const type = (tenant.type || '').toUpperCase();

  if (
    slug.includes('girl') ||
    slug.includes('dokhtar') ||
    theme === 'FEMALE' ||
    name.includes('دختر')
  ) {
    return 'g';
  }

  if (
    slug.includes('college') ||
    theme === 'COLLEGE' ||
    type === 'COLLEGE' ||
    name.includes('کالج')
  ) {
    return 'c';
  }

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

export function normalizeNationalCode(code?: string | number | null): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '');
  return digitsOnly.trim();
}

export function stripLeadingZero(code?: string | number | null): string {
  if (code === null || code === undefined) return '';
  const digitsOnly = normalizePersianDigits(code).replace(/\D/g, '');
  const stripped = digitsOnly.replace(/^0+/, '');
  return stripped || digitsOnly;
}

/**
 * نام کاربری = کد ملی بدون صفر اول، و اگر نبود شماره همراه.
 * رمز عبور = پیش‌وند شعبه + همان شناسه.
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

export function deriveStudentCode(
  nationalCode?: string | number | null,
  fallbackPhone?: string | number | null,
): string {
  const strippedCode = stripLeadingZero(nationalCode);
  if (strippedCode) return strippedCode;

  const cleanPhone = normalizePersianDigits(fallbackPhone)
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .trim();
  if (cleanPhone) return cleanPhone;

  return String(10000000 + (randomBytes(4).readUInt32BE(0) % 90000000));
}

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
