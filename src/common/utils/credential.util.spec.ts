import {
  getTenantPasswordPrefix,
  normalizeNationalCode,
  generateUnifiedCredentials,
  generateParentCredentials,
  deriveStudentCode,
} from './credential.util';

describe('Unified Credential Generation System (سامانه ورود یکپارچه)', () => {
  describe('Tenant Password Prefix Resolution', () => {
    it('returns "b" for boys school via slug, theme, or name', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-boys' })).toBe('b');
      expect(getTenantPasswordPrefix({ theme: 'MALE' })).toBe('b');
      expect(getTenantPasswordPrefix({ name: 'هنرستان پسرانه رکاد' })).toBe('b');
    });

    it('returns "g" for girls school via slug, theme, or name', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-girls' })).toBe('g');
      expect(getTenantPasswordPrefix({ theme: 'FEMALE' })).toBe('g');
      expect(getTenantPasswordPrefix({ name: 'هنرستان فنی دخترانه رکاد' })).toBe('g');
    });

    it('returns "c" for college via slug, theme, or type', () => {
      expect(getTenantPasswordPrefix({ slug: 'rokad-college' })).toBe('c');
      expect(getTenantPasswordPrefix({ theme: 'COLLEGE' })).toBe('c');
      expect(getTenantPasswordPrefix({ type: 'COLLEGE' })).toBe('c');
      expect(getTenantPasswordPrefix({ name: 'کالج فناوری رکاد' })).toBe('c');
    });

    it('falls back to "b" if tenant context is missing or unspecified', () => {
      expect(getTenantPasswordPrefix(null)).toBe('b');
      expect(getTenantPasswordPrefix({})).toBe('b');
    });
  });

  describe('National Code Normalization', () => {
    it('normalizes Persian digits and removes whitespace/hyphens', () => {
      expect(normalizeNationalCode('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(normalizeNationalCode(' 001-234567-8 ')).toBe('0012345678');
      expect(normalizeNationalCode(undefined)).toBe('');
      expect(normalizeNationalCode(null)).toBe('');
    });
  });

  describe('Unified Credentials Auto-Generation', () => {
    it('generates username=nationalCode without leading zero and password=b+code for boys school', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-boys', theme: 'MALE' },
        nationalCode: '۰۱۲۳۴۵۶۷۸۹',
        fallbackPhone: '09121111111',
      });

      expect(creds.username).toBe('123456789');
      expect(creds.nationalId).toBe('0123456789');
      expect(creds.prefix).toBe('b');
      expect(creds.defaultPassword).toBe('b123456789');
      expect(creds.finalPassword).toBe('b123456789');
    });

    it('generates username=nationalCode without leading zero and password=g+code for girls school', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-girls', theme: 'FEMALE' },
        nationalCode: '0023456789',
        fallbackPhone: '09122222222',
      });

      expect(creds.username).toBe('23456789');
      expect(creds.prefix).toBe('g');
      expect(creds.defaultPassword).toBe('g23456789');
      expect(creds.finalPassword).toBe('g23456789');
    });

    it('generates username=nationalCode without leading zero and password=c+code for college', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-college', theme: 'COLLEGE' },
        nationalCode: '0034567890',
      });

      expect(creds.username).toBe('34567890');
      expect(creds.prefix).toBe('c');
      expect(creds.defaultPassword).toBe('c34567890');
      expect(creds.finalPassword).toBe('c34567890');
    });

    it('preserves national codes that do not have leading zeros', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-boys' },
        nationalCode: '6420024730',
      });

      expect(creds.username).toBe('6420024730');
      expect(creds.defaultPassword).toBe('b6420024730');
    });

    it('respects customPassword if explicitly provided', () => {
      const creds = generateUnifiedCredentials({
        tenant: { slug: 'rokad-boys' },
        nationalCode: '0012345678',
        customPassword: 'MyCustomPass123!',
      });

      expect(creds.username).toBe('12345678');
      expect(creds.defaultPassword).toBe('b12345678');
      expect(creds.finalPassword).toBe('MyCustomPass123!');
    });
  });

  describe('Student Code Derivation (شماره دانش‌آموزی = کد ملی بدون صفر)', () => {
    it('strips leading zeros from 10-digit national code', () => {
      expect(deriveStudentCode('0012345678')).toBe('12345678');
      expect(deriveStudentCode('۰۱۲۳۴۵۶۷۸۹')).toBe('123456789');
      expect(deriveStudentCode('0923456789')).toBe('923456789');
    });

    it('keeps national code unchanged if there are no leading zeros', () => {
      expect(deriveStudentCode('1234567890')).toBe('1234567890');
    });

    it('falls back to phone number without leading zero if national code is absent', () => {
      expect(deriveStudentCode(null, '09123456789')).toBe('9123456789');
    });
  });

  describe('Parent Credential Generation (سامانه ورود اولیاء)', () => {
    it('generates username=p+childNationalCode without leading zero and password=p+code', () => {
      const creds = generateParentCredentials({
        studentNationalCode: '0012345678',
        fallbackPhone: '09125000001',
      });

      expect(creds.username).toBe('p12345678');
      expect(creds.defaultPassword).toBe('p12345678');
      expect(creds.finalPassword).toBe('p12345678');
    });

    it('handles Persian digits in child national code', () => {
      const creds = generateParentCredentials({
        studentNationalCode: '۰۰۱۲۳۴۵۶۷۸',
      });

      expect(creds.username).toBe('p12345678');
      expect(creds.defaultPassword).toBe('p12345678');
    });

    it('preserves code without leading zeros for parent', () => {
      const creds = generateParentCredentials({
        studentNationalCode: '6420024730',
      });

      expect(creds.username).toBe('p6420024730');
      expect(creds.defaultPassword).toBe('p6420024730');
    });

    it('respects customPassword if provided for parent', () => {
      const creds = generateParentCredentials({
        studentNationalCode: '0012345678',
        customPassword: 'CustomParentPass2026!',
      });

      expect(creds.username).toBe('p12345678');
      expect(creds.defaultPassword).toBe('p12345678');
      expect(creds.finalPassword).toBe('CustomParentPass2026!');
    });
  });
});

