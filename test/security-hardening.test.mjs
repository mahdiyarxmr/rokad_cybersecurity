import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  consumeRateLimit,
  inspectJsonShape,
  resolveJsonBodyLimit,
} from '../src/common/security/abuse-controls.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('json body limit cannot be raised to 150mb', () => {
  assert.equal(resolveJsonBodyLimit('150mb'), '2mb');
  assert.equal(resolveJsonBodyLimit('2mb'), '2mb');
  assert.equal(resolveJsonBodyLimit(''), '2mb');
});

test('json shape rejects deep or prototype keys', () => {
  assert.equal(inspectJsonShape({ ok: true }), null);
  assert.equal(inspectJsonShape({ constructor: { x: 1 } }), 'key');
  let deep = { n: 0 };
  let cursor = deep;
  for (let i = 0; i < 20; i++) {
    cursor.next = { n: i };
    cursor = cursor.next;
  }
  assert.equal(inspectJsonShape(deep), 'depth');
});

test('rate limiter blocks the request after the cap', () => {
  const store = new Map();
  assert.equal(consumeRateLimit(store, 'ip', 1_000, 60_000, 2).allowed, true);
  assert.equal(consumeRateLimit(store, 'ip', 1_001, 60_000, 2).allowed, true);
  assert.equal(consumeRateLimit(store, 'ip', 1_002, 60_000, 2).allowed, false);
});

test('source no longer builds passwords from a tenant prefix', () => {
  const creds = read('src/common/utils/credential.util.ts');
  assert.equal(creds.includes('${prefix}${strippedCode}'), false);
  assert.equal(creds.includes('tryRecoverPlaintext'), false);
  const vault = read('src/modules/auth/password-vault.service.ts');
  assert.equal(vault.includes('tryRecoverPlaintext'), false);
  const users = read('src/modules/members/users.controller.ts');
  assert.equal(users.includes('username: true'), false);
  assert.match(users, /@Roles\(/);
});

test('runtime config closes the availability findings', () => {
  const main = read('src/main.ts');
  assert.equal(main.includes('contentSecurityPolicy: false'), false);
  assert.match(main, /resolveJsonBodyLimit/);
  assert.match(main, /enableShutdownHooks/);
  const compose = read('docker-compose.yml');
  assert.equal(compose.includes('minio/minio:latest'), false);
  assert.match(compose, /RELEASE\.2025-10-15T17-29-55Z/);
  assert.match(compose, /maxmemory 256mb/);
  assert.equal(compose.includes('0.0.0.0:'), false);
  const npmrc = read('.npmrc');
  assert.equal(npmrc.includes('dangerously-allow-all-builds'), false);
  assert.equal(npmrc.includes('enable-pre-post-scripts'), false);
  const pkg = read('package.json');
  assert.match(pkg, /"@nestjs\/common": "\^10\.4\.22"/);
  assert.match(pkg, /"xlsx": "npm:@e965\/xlsx@0\.20\.3"/);
  assert.equal(pkg.includes('"xlsx": "^0.18.5"'), false);
});
