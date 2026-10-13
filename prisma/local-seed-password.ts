import { randomBytes } from 'crypto';

/** Local seed only. Production must never call this. */
export function localSeedPassword(label: string): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to create seed passwords in production');
  }
  const fromEnv = process.env.SEED_PASSWORD?.trim() || '';
  if (fromEnv) {
    if (fromEnv.length < 12 || /rokad/i.test(fromEnv) || fromEnv.includes('2026')) {
      throw new Error('SEED_PASSWORD is too short or matches a published sample');
    }
    return fromEnv;
  }
  const password = randomBytes(18).toString('base64url');
  console.log(`[seed] temporary password for ${label}: ${password}`);
  return password;
}
