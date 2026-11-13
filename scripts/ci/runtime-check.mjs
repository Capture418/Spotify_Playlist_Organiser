// Mounted read-only for future CI; excluded from the production image.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
assert.equal(process.getuid(), 1000); assert.equal(process.arch, 'x64');
assert.match(readFileSync('/proc/mounts', 'utf8'), / \/ overlay ro,/);
assert.match(readFileSync('/proc/mounts', 'utf8'), / \/tmp tmpfs .*size=65536k/);
const manifest = JSON.parse(readFileSync('/app/runtime/dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.name, 'Music Library Organiser');
for (const file of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/library.svg']) assert.ok(existsSync('/app/runtime/dist/' + file));
for (const file of ['/app/.env', '/app/src', '/app/node_modules/typescript', '/app/runtime/server/proxy.test.js']) assert.equal(existsSync(file), false);
const {spawnSync}=await import('node:child_process');
const result=spawnSync(process.execPath,['runtime/server/production.js'],{env:{NODE_ENV:'production',PORT:'3000'},encoding:'utf8',timeout:5000});
assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr,'Application configuration-failed\n');
console.log('PASS exact candidate runtime restrictions/assets/invalid configuration refusal');
