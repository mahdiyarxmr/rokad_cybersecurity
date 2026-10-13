#!/usr/bin/env node
/**
 * Synchronizes the version field from the root package.json to frontend/package.json
 * Ensures unified release versioning across the entire Rokad platform.
 */
const fs = require('fs');
const path = require('path');

const rootPkgPath = path.resolve(__dirname, '../package.json');
const frontendPkgPath = path.resolve(__dirname, '../frontend/package.json');

try {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf-8'));

  const previousFrontendVersion = frontendPkg.version;
  frontendPkg.version = rootPkg.version;

  fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2) + '\n', 'utf-8');

  console.log(`[Version Sync] Successfully synced version: ${rootPkg.version}`);
  console.log(`  Root package.json:     ${rootPkg.version}`);
  console.log(`  Frontend package.json: ${previousFrontendVersion} -> ${frontendPkg.version}`);
} catch (error) {
  console.error('[Version Sync Error] Failed to sync versions:', error.message);
  process.exit(1);
}
