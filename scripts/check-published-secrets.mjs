import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const allow = new Set([
  'src/common/security/security-policy.ts',
  'test/security-policy.test.mjs',
  'scripts/check-published-secrets.mjs',
]);

const needles = [
  'rokad_super_secret_access_jwt_key_2026_x99!secure',
  'rokad_super_secret_refresh_jwt_key_2026_z88!secure',
  'rokad_super_secret_jwt_key_2026!',
  'rokad_default_master_encryption_key_2026',
  'rokad_default_blind_index_pepper_2026',
  'rokad_audit_default_pepper_2026',
  'RokadAdminPass2026!',
  'RokadPass2026!',
  'RokadParent2026!',
  'RokadBoysPass2026!',
  'RokadGirlsPass2026!',
  'Rokad1404!',
  'incidents.betterstack.com/api/v1/heartbeat/',
];

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'dist', '.git', 'coverage', 'uploads'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (/\.(ts|tsx|js|mjs|json|yml|yaml|md|env|example|html)$/.test(entry.name) || entry.name.startsWith('.env')) {
      files.push(full);
    }
  }
  return files;
}

const hits = [];
for (const file of await walk(root)) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (allow.has(rel) || rel.startsWith('test/')) continue;
  const text = await readFile(file, 'utf8');
  for (const needle of needles) {
    if (text.includes(needle)) hits.push(`${rel}: ${needle}`);
  }
}

if (hits.length) {
  console.error('Published secrets or monitoring tokens are still present:');
  for (const hit of hits) console.error(` - ${hit}`);
  process.exit(1);
}

console.log('No published secrets found outside the denylist.');
