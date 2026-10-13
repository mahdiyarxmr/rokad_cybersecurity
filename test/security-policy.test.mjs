import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import * as policy from '../src/common/security/security-policy.ts';

test('published JWT default is rejected', () => {
  assert.equal(
    policy.isPublishedInsecureValue('rokad_super_secret_access_jwt_key_2026_x99!secure'),
    true,
  );
});

test('production refuses a published secret', () => {
  policy.resetEphemeralSecretsForTests();
  assert.throws(
    () =>
      policy.resolveSecret('JWT_ACCESS_SECRET', 'rokad_super_secret_access_jwt_key_2026_x99!secure', {
        env: { NODE_ENV: 'production' },
      }),
    /Refusing to start/,
  );
});

test('production refuses a wildcard CORS list', () => {
  assert.throws(
    () => policy.resolveCorsOrigins({ NODE_ENV: 'production', CORS_ORIGINS: '*' }),
    /must not contain/,
  );
});

test('production requires an explicit CORS allowlist', () => {
  assert.throws(() => policy.resolveCorsOrigins({ NODE_ENV: 'production' }), /CORS_ORIGINS/);
});

test('development does not reuse the published secret', () => {
  policy.resetEphemeralSecretsForTests();
  const secret = policy.resolveSecret('JWT_ACCESS_SECRET', 'rokad_super_secret_access_jwt_key_2026_x99!secure', {
    env: { NODE_ENV: 'development' },
  });
  assert.notEqual(secret, 'rokad_super_secret_access_jwt_key_2026_x99!secure');
  assert.equal(secret.length >= 32, true);
});

test('sensitive finance and rbac permissions require enrolled MFA', () => {
  assert.equal(policy.requiresEnrolledMfa(['finance.payroll.write']), true);
  assert.equal(policy.requiresEnrolledMfa(['attendance.read']), false);
});

test('student media modules are not public', () => {
  assert.equal(policy.isPublicMediaModule('messages'), false);
  assert.equal(policy.isPublicMediaModule('homework'), false);
  assert.equal(policy.isPublicMediaModule('avatars'), false);
  assert.equal(policy.isPublicMediaModule('calendar'), true);
});

test('path containment rejects traversal', () => {
  const root = path.resolve('/tmp/rokad-uploads');
  assert.throws(() => policy.assertContainedPath(root, path.resolve('/tmp/rokad-uploads/../../etc/passwd')));
  const inside = policy.assertContainedPath(root, path.resolve('/tmp/rokad-uploads/messages/file.bin'));
  assert.equal(inside.startsWith(root), true);
});

test('blocked uploads include svg and html', () => {
  assert.equal(policy.isBlockedUpload('photo.svg', 'image/svg+xml'), true);
  assert.equal(policy.isBlockedUpload('notes.pdf', 'application/pdf'), false);
});

test('media signature expires and rejects tampering', () => {
  const secret = 'test-media-secret-32-characters-min';
  const now = 1_700_000_000;
  const { exp, sig } = policy.signMediaQuery('messages', 'file.bin', secret, now, 60);
  assert.equal(policy.verifyMediaSignature('messages', 'file.bin', String(exp), sig, secret, now + 10), true);
  assert.equal(policy.verifyMediaSignature('messages', 'file.bin', String(exp), sig, secret, now + 120), false);
  assert.equal(policy.verifyMediaSignature('messages', 'other.bin', String(exp), sig, secret, now + 10), false);
});

test('response rewriter signs storage urls and leaves other strings', () => {
  const secret = 'test-media-secret-32-characters-min';
  const signed = policy.signStorageUrlsInValue(
    { fileUrl: '/api/v1/storage/files/messages/abc-file.pdf', note: 'سلام' },
    secret,
    60,
  );
  assert.match(signed.fileUrl, /exp=\d+&sig=[a-f0-9]{64}$/);
  assert.equal(signed.note, 'سلام');
});

test('download paths are limited to exports and storage', () => {
  assert.equal(policy.isDownloadPath('/api/v1/finance/payroll/export/excel?year=1'), true);
  assert.equal(policy.isDownloadPath('/api/v1/members?ticket=1'), false);
});
