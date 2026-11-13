/** Structural reproducibility guard. This is not a dependency security audit. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function validateLockfile(manifest, lockfile) {
  assert.equal(lockfile.lockfileVersion, 3, 'Expected npm lockfile version 3');
  assert.equal(lockfile.name, manifest.name, 'Lockfile project name differs');
  assert.equal(lockfile.version, manifest.version, 'Lockfile project version differs');
  const rootPackage = lockfile.packages?.[''];
  assert.ok(rootPackage, 'Lockfile has no root package');
  assert.deepEqual(rootPackage.engines ?? {}, manifest.engines ?? {}, 'Runtime requirements differ');

  for (const key of ['dependencies', 'devDependencies']) {
    assert.deepEqual(rootPackage[key] ?? {}, manifest[key] ?? {}, `${key} differ from package.json`);
    for (const [name, version] of Object.entries(manifest[key] ?? {})) {
      const entry = lockfile.packages[`node_modules/${name}`];
      assert.ok(entry, `Missing locked direct dependency: ${name}`);
      assert.equal(entry.version, version, `Direct dependency is not pinned as specified: ${name}`);
      assert.ok(typeof entry.integrity === 'string' && entry.integrity.length > 0, `Missing integrity: ${name}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const lockfile = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
    validateLockfile(manifest, lockfile);
    console.log('PASS: npm lockfile matches the manifest. This is not a security audit.');
  } catch (error) {
    console.error('FAIL: A valid npm-generated package-lock.json is required before this setup is complete.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
