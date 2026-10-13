export const JSON_BODY_HARD_CAP_BYTES = 8 * 1024 * 1024;
export const JSON_BODY_DEFAULT = '2mb';

export function parseByteLimit(raw: string | undefined | null): number | null {
  const value = (raw || '').trim().toLowerCase();
  const match = value.match(/^(\d+(?:\.\d+)?)(b|kb|mb)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2];
  if (unit === 'mb') return Math.floor(amount * 1024 * 1024);
  if (unit === 'kb') return Math.floor(amount * 1024);
  return Math.floor(amount);
}

/** Ignore missing, invalid, or oversized body limits. Never honor a 150mb-style override. */
export function resolveJsonBodyLimit(raw?: string | null): string {
  const bytes = parseByteLimit(raw || JSON_BODY_DEFAULT);
  if (bytes == null || bytes > JSON_BODY_HARD_CAP_BYTES) return JSON_BODY_DEFAULT;
  if (bytes < 1024) return JSON_BODY_DEFAULT;
  return (raw || JSON_BODY_DEFAULT).trim().toLowerCase();
}

export function inspectJsonShape(value: unknown, depth = 0): string | null {
  if (depth > 12) return 'depth';
  if (typeof value === 'string') return value.length > 100_000 ? 'string' : null;
  if (Array.isArray(value)) {
    if (value.length > 5000) return 'array';
    for (const item of value) {
      const problem = inspectJsonShape(item, depth + 1);
      if (problem) return problem;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length > 120) return 'keys';
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return 'key';
      const problem = inspectJsonShape((value as Record<string, unknown>)[key], depth + 1);
      if (problem) return problem;
    }
  }
  return null;
}

export interface RateBucket {
  count: number;
  resetAt: number;
}

export function consumeRateLimit(
  store: Map<string, RateBucket>,
  key: string,
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { allowed: current.count <= max, retryAfterSeconds };
}

export function rateLimitForPath(url: string): { name: string; windowMs: number; max: number } | null {
  const path = (url || '').split('?')[0];
  if (
    path === '/health' ||
    path === '/api/v1/health' ||
    path.startsWith('/health/') ||
    path.startsWith('/api/v1/health/')
  ) {
    return null;
  }
  if (/\/auth\/(login|refresh|register|forgot|2fa)/.test(path)) {
    return { name: 'auth', windowMs: 60_000, max: 20 };
  }
  if (/import|export|bulk|report|preview/.test(path)) {
    return { name: 'heavy', windowMs: 60_000, max: 10 };
  }
  return { name: 'api', windowMs: 60_000, max: 180 };
}
