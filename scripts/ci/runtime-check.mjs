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
const env = { NODE_ENV: 'production', PORT: '3000', ORGANISER_ORIGIN: 'https://example.invalid', ORGANISER_CALLBACK: 'https://example.invalid/callback', ORGANISER_ACCOUNT: '11111111-1111-4111-8111-111111111111', ORGANISER_OWNER: 'invented-owner', SPOTIFY_CLIENT_ID: 'a'.repeat(32) };
env.DATABASE_URL = 'postgres://app:invented@db/music';
for (const [purpose, byte] of [['CREDENTIAL', '11'], ['SNAPSHOT', '22']]) { env[`ORGANISER_${purpose}_KEYS`] = 'v1:' + byte.repeat(32); env[`ORGANISER_${purpose}_CURRENT`] = 'v1'; }
Object.assign(process.env, env);
await assert.rejects(import('../runtime/server/production.js'), { message: 'Production activation requires the separate S04c operational gate.' });
console.log('PASS exact candidate runtime restrictions/assets/production refusal');
