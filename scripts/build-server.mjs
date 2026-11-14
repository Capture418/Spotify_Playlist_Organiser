import assert from 'node:assert/strict';
import { cpSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../.work/runtime/', import.meta.url);
rmSync(output, { recursive: true, force: true });
const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server-build.json'], { cwd: root, stdio: 'inherit' });
if (result.error || result.status !== 0) process.exit(1);
mkdirSync(new URL('server/migrations/', output), { recursive: true });
cpSync(new URL('../server/migrations/', import.meta.url), new URL('server/migrations/', output), { recursive: true });
cpSync(new URL('../server/journal-migrations/', import.meta.url), new URL('server/journal-migrations/', output), { recursive: true });
cpSync(new URL('../dist/', import.meta.url), new URL('dist/', output), { recursive: true });
const manifest = JSON.parse(readFileSync(new URL('dist/manifest.webmanifest', output), 'utf8'));
assert.equal(manifest.name, 'MuLO');
for (const file of ['spotify/logo-white.svg', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/library.svg', ...manifest.icons.map(icon => icon.src.slice(1))]) {
  assert.deepEqual(readFileSync(new URL('dist/' + file, output)), readFileSync(new URL('../public/' + file, import.meta.url)));
}
console.log('Backend JavaScript and runtime assets built; live runtime requires explicit valid settings.');
