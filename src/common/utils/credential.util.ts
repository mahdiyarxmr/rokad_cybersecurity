import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { normalizePersianDigits } from './jalali.util';
import { isPublishedInsecureValue } from '../security/security-policy';

export interface TenantCredentialContext {
  slug?: string | null;
  theme?: string | null;
  type?: string | null;
  name?: string | null;
}

/**
 * برچسب شعبه فقط برای سازگاری تماس‌گیرنده‌های قدیمی است.
 * از این مقدار هرگز برای ساخت رمز عبور استفاده نکنید.
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

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';

/** رمز تصادفی. الگوی «پیشوند + کد ملی/موبایل» دیگر تولید نمی‌شود. */
export function generateRandomPassword(length = 16): string {
  const size = Math.max(12, length);
  let out = '';
  while (out.length < size) {
    const bytes = randomBytes(size);
    for (const byte of bytes) {
      if (byte >= 256 - (256 % PASSWORD_ALPHABET.length)) continue;
      out += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      if (out.length === size) break;
    }
  }
  return out;
}

function identifierForms(raw: string | number | null | undefined): string[] {
  if (raw === null || raw === undefined) return [];
  const text = String(raw).trim();
  if (!text) return [];
  const digits = normalizePersianDigits(text).replace(/\D/g, '');
  const stripped = digits.replace(/^0+/, '') || digits;
  return Array.from(new Set([text, digits, stripped].filter(Boolean)));
}

/**
 * رمزهایی که از شناسهٔ کاربر ساخته می‌شوند، یا قبلاً در مخزن منتشر شده‌اند، قابل قبول نیستند.
 */
export function isPredictablePassword(
  password: string | null | undefined,
  identifiers: Array<string | number | null | undefined> = [],
): boolean {
  const value = (password || '').trim();
  if (!value || value.length < 8) return true;
  if (isPublishedInsecureValue(value)) return true;
  for (const raw of identifiers) {
    for (const id of identifierForms(raw)) {
      if (value === id) return true;
      if (value.length === id.length + 1 && value.slice(1) === id && /^[bgcp]$/i.test(value[0])) {
        return true;
      }
    }
  }
  return false;
}

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
  mustChangePassword: true;
} {
  const prefix = getTenantPasswordPrefix(params.tenant);
  const cleanNationalCode = normalizeNationalCode(params.nationalCode);
  const strippedCode = stripLeadingZero(params.nationalCode);
  const cleanPhone = normalizePersianDigits(params.fallbackPhone).replace(/\D/g, '').trim();
  const username = strippedCode || cleanPhone || `user_${randomBytes(4).toString('hex')}`;
  const identifiers = [strippedCode, cleanNationalCode, cleanPhone, username];
  const requested = params.customPassword?.trim() || '';
  if (requested && isPredictablePassword(requested, identifiers)) {
    throw new BadRequestException('رمز عبور نباید از شناسه کاربر یا الگوی قدیمی ساخته شود');
  }
  const defaultPassword = generateRandomPassword();
  const finalPassword = requested || defaultPassword;

  return {
    username,
    nationalId: cleanNationalCode || undefined,
    defaultPassword,
    finalPassword,
    prefix,
    mustChangePassword: true,
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
  mustChangePassword: true;
} {
  const strippedCode = stripLeadingZero(params.studentNationalCode);
  const cleanPhone = normalizePersianDigits(params.fallbackPhone).replace(/\D/g, '').trim();
  const username = strippedCode
    ? `p${strippedCode}`
    : cleanPhone
      ? `p${cleanPhone}`
      : `parent_${randomBytes(4).toString('hex')}`;
  const identifiers = [strippedCode, cleanPhone, username, params.studentNationalCode];
  const requested = params.customPassword?.trim() || '';
  if (requested && isPredictablePassword(requested, identifiers)) {
    throw new BadRequestException('رمز عبور نباید از شناسه کاربر یا الگوی قدیمی ساخته شود');
  }
  const defaultPassword = generateRandomPassword();

  return {
    username,
    defaultPassword,
    finalPassword: requested || defaultPassword,
    mustChangePassword: true,
  };
}
