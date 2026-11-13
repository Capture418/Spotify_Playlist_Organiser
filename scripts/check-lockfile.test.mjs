import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateLockfile } from './check-lockfile.mjs';

// Deliberately invented test input, never used as the project's real lockfile.
const manifest = {
  name: 'test-only', version: '0.0.0', engines: { node: '>=26 <27' },
  dependencies: { 'invented-test-package': '1.0.0' },
};
const lockfile = {
  name: 'test-only', version: '0.0.0', lockfileVersion: 3,
  packages: {
    '': { engines: manifest.engines, dependencies: manifest.dependencies },
    'node_modules/invented-test-package': { version: '1.0.0', integrity: 'test-input-not-a-real-hash' },
  },
};

test('accepts structurally matching lockfile input', () => {
  assert.doesNotThrow(() => validateLockfile(manifest, lockfile));
});

test('rejects a manifest/lockfile dependency mismatch', () => {
  const changed = structuredClone(lockfile);
  changed.packages[''].dependencies['invented-test-package'] = '2.0.0';
  assert.throws(() => validateLockfile(manifest, changed), /dependencies differ/);
});

test('rejects a missing locked direct dependency', () => {
  const changed = structuredClone(lockfile);
  delete changed.packages['node_modules/invented-test-package'];
  assert.throws(() => validateLockfile(manifest, changed), /Missing locked/);
});

test('rejects an incorrect locked version', () => {
  const changed = structuredClone(lockfile);
  changed.packages['node_modules/invented-test-package'].version = '0.9.0';
  assert.throws(() => validateLockfile(manifest, changed), /not pinned/);
});

test('rejects lockfile input without integrity information', () => {
  const changed = structuredClone(lockfile);
  delete changed.packages['node_modules/invented-test-package'].integrity;
  assert.throws(() => validateLockfile(manifest, changed), /Missing integrity/);
});
