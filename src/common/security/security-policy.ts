import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Values that were committed to the public upstream repository.
 * They must never be accepted as live secrets.
 */
export const PUBLISHED_INSECURE_VALUES = [
  'rokad_super_secret_access_jwt_key_2026_x99!secure',
  'rokad_super_secret_refresh_jwt_key_2026_z88!secure',
  'rokad_super_secret_jwt_key_2026!',
  'rokad_secret_2026',
  'rokad_redis_secret',
  'rokad_minio_secret_2026',
  'rokad_minio_admin',
  'rokad_default_master_encryption_key_2026',
  'rokad_default_blind_index_pepper_2026',
  'rokad_audit_default_pepper_2026',
  'your_64_char_hex_encryption_key_here',
  'your_64_char_hex_blind_index_key_here',
  'your_64_char_hex_audit_hash_pepper_here',
  'RokadAdminPass2026!',
] as const;

const PUBLISHED_SET = new Set<string>(PUBLISHED_INSECURE_VALUES);

const ephemeralSecrets = new Map<string, string>();

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

export function isPublishedInsecureValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  if (PUBLISHED_SET.has(trimmed)) return true;
  if (/^change[-_]?me/i.test(trimmed) || trimmed.includes('replace-with') || trimmed.includes('replace-minio')) return true;
  if (trimmed.includes('your_64_char_hex')) return true;
  if (/incidents\.betterstack\.com\/api\/v1\/heartbeat\/(?!YOUR_TOKEN\b)[A-Za-z0-9]{8,}/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Return a usable secret or fail closed.
 * Production never falls back to a published or empty value.
 * Other environments get a process-local ephemeral secret so the public
 * defaults cannot be used to forge tokens.
 */
export function resolveSecret(
  name: string,
  value: string | undefined | null,
  options?: { minLength?: number; env?: NodeJS.ProcessEnv },
): string {
  const env = options?.env ?? process.env;
  const minLength = options?.minLength ?? 32;
  const trimmed = (value ?? '').trim().replace(/^['"]|['"]$/g, '');
  const unsafe = !trimmed || trimmed.length < minLength || isPublishedInsecureValue(trimmed);

  if (!unsafe) return trimmed;

  if (isProduction(env)) {
    throw new Error(
      `[security] ${name} is missing, too short, or a published default. Refusing to start.`,
    );
  }

  const cached = ephemeralSecrets.get(name);
  if (cached) return cached;
  const generated = crypto.randomBytes(32).toString('hex');
  ephemeralSecrets.set(name, generated);
  if (env.NODE_ENV !== 'test') {
    console.warn(
      `[security] ${name} is missing or unsafe. Using a process-local secret. Set a unique value before any shared or production deployment.`,
    );
  }
  return generated;
}

export function resetEphemeralSecretsForTests(): void {
  ephemeralSecrets.clear();
}

export function resolveCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = (env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.includes('*')) {
    throw new Error('[security] CORS_ORIGINS must not contain * when credentials are enabled');
  }
  if (list.length > 0) return list;
  if (isProduction(env)) {
    throw new Error('[security] CORS_ORIGINS must be an explicit allowlist in production');
  }
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
}

export const SENSITIVE_PERMISSIONS = new Set([
  'finance.fee.write',
  'finance.check.manage',
  'finance.fee.import',
  'finance.payroll.write',
  'rbac.manage',
  'role.write',
  'role.assign',
]);

export function requiresEnrolledMfa(permissions: string[] | undefined | null): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((permission) => SENSITIVE_PERMISSIONS.has(permission));
}

/** Modules that may be fetched without a session (branding / public covers only). */
export const PUBLIC_MEDIA_MODULES = new Set([
  'branding',
  'public',
  'logos',
  'school',
  'school-public',
  'calendar',
]);

export function isPublicMediaModule(moduleName: string | undefined | null): boolean {
  return PUBLIC_MEDIA_MODULES.has((moduleName || '').toLowerCase());
}

export function isDownloadPath(url: string | undefined | null): boolean {
  if (!url) return false;
  const pathOnly = url.split('?')[0];
  return pathOnly.includes('/storage/files/') || pathOnly.includes('/finance/payroll/export/');
}

export function isCrossSiteFetch(secFetchSite: string | undefined | null): boolean {
  return (secFetchSite || '').toLowerCase() === 'cross-site';
}

export const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  'svg',
  'html',
  'htm',
  'xhtml',
  'js',
  'mjs',
  'cjs',
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'bash',
  'php',
  'phtml',
  'asp',
  'aspx',
  'jsp',
]);

export function isBlockedUpload(filename: string, mimetype?: string | null): boolean {
  const ext = path.extname(filename || '').toLowerCase().replace('.', '');
  if (BLOCKED_UPLOAD_EXTENSIONS.has(ext)) return true;
  const mime = (mimetype || '').toLowerCase();
  return mime.includes('svg') || mime === 'text/html' || mime === 'application/javascript' || mime === 'text/javascript';
}

export function safeBasename(name: string): string {
  let decoded = name || '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep raw value
  }
  const base = path.basename(decoded).replace(/\0/g, '');
  if (!base || base === '.' || base === '..' || base.includes('/') || base.includes('\\') || base.includes('..')) {
    throw new Error('invalid filename');
  }
  return base;
}

export function assertContainedPath(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path escapes storage root');
  }
  return resolved;
}

export function assertSafeTenantId(tenantId: string): string {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(tenantId || '')) {
    throw new Error('invalid tenant id');
  }
  return tenantId;
}

export function signMediaQuery(
  moduleName: string,
  filename: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = 6 * 60 * 60,
): { exp: number; sig: string } {
  const exp = nowSeconds + ttlSeconds;
  const sig = crypto.createHmac('sha256', secret).update(`${moduleName}\n${filename}\n${exp}`).digest('hex');
  return { exp, sig };
}

export function verifyMediaSignature(
  moduleName: string,
  filename: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxTtlSeconds = 12 * 60 * 60,
): boolean {
  const exp = typeof expRaw === 'string' ? Number(expRaw) : typeof expRaw === 'number' ? expRaw : NaN;
  const sig = typeof sigRaw === 'string' ? sigRaw : '';
  if (!Number.isFinite(exp) || !sig || sig.length < 32) return false;
  if (exp < nowSeconds) return false;
  if (exp > nowSeconds + maxTtlSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${moduleName}\n${filename}\n${exp}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const STORAGE_URL_RE =
  /((?:https?:\/\/[^/\s"'<>]+)?\/api\/v1\/storage\/files\/)([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+)(?:\?[^"'<>\s]*)?/g;

export function signStorageUrlsInValue(value: unknown, secret: string, ttlSeconds = 6 * 60 * 60): unknown {
  if (!secret || value == null) return value;
  if (typeof value === 'string') {
    return value.replace(STORAGE_URL_RE, (_match, prefix: string, moduleName: string, filename: string) => {
      const { exp, sig } = signMediaQuery(moduleName, filename, secret, undefined, ttlSeconds);
      return `${prefix}${moduleName}/${filename}?exp=${exp}&sig=${sig}`;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => signStorageUrlsInValue(item, secret, ttlSeconds));
  }
  if (typeof value === 'object') {
    if (value instanceof Date) return value;
    const record = value as Record<string, unknown>;
    if (typeof (record as { toNumber?: () => number }).toNumber === 'function') return value;
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      copy[key] = signStorageUrlsInValue(record[key], secret, ttlSeconds);
    }
    return copy;
  }
  return value;
}

export function verifyHs256Jwt(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): any {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed jwt');
  const [header, payload, signature] = parts;
  const headerJson = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  if (headerJson?.alg !== 'HS256') throw new Error('unsupported jwt alg');
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('bad jwt signature');
  }
  const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (body?.exp && Number(body.exp) < nowSeconds) throw new Error('jwt expired');
  return body;
}

export const AUTH_COOKIE_NAME = 'rokad_access';
export const SECURITY_TXT = `Contact: mailto:security@rokad.ir
Preferred-Languages: fa, en
Canonical: https://rokadschool.ir/.well-known/security.txt
Policy: https://github.com/mahdiyarxmr/rokad_cybersecurity/blob/arena/ab1d3c90-rokad-cybersecurity/docs/SECURITY-REMEDIATION.md
Expires: 2027-10-13T00:00:00.000Z
`;
