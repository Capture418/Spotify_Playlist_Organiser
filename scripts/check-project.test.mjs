import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixturePath = 'tests/fixtures/demo-library.json';
const files = [
  '.ai/constitution.md', '.editorconfig', '.gitignore', '.nvmrc', '.npmrc',
  'AGENTS.md', 'README.md', 'docs/architecture.md', 'docs/decisions.md', 'docs/work-plan.md',
  'docs/menu-release-approval.md', 'docs/reload-release-approval.md', 'docs/artwork-release-approval.md', 'docs/release-approval.md', 'docs/home-hosting.md', 'docs/hosted-operations.md', 'docs/pilot-approval.md', 'docs/production-setup.md', 'docs/platform-contract.md', 'docs/ci/normal-pr-plan.md', 'docs/ci/rehearsal-readiness.md', 'docs/home-deployment.md', 'docs/s04c-operational-plan.md', 'docs/s04b-foundation-spec.md', 'docs/s04b2-setup-plan.md', 'docs/s04b2-artifact-review.md',
  'package.json', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'vite.config.ts', 'src/app/main.tsx', 'scripts/check-project.mjs',
  'scripts/check-project.test.mjs', 'scripts/check-lockfile.mjs', 'scripts/check-lockfile.test.mjs', fixturePath,
];

function checkDisposableCopy(mutate = () => {}) {
  // All temporary files stay inside this project, and are removed even on failure.
  const work = join(root, '.work');
  mkdirSync(work, { recursive: true });
  const directory = mkdtempSync(join(work, 'foundation-test-'));
  try {
    for (const relative of files) {
      const target = join(directory, relative);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(root, relative), target);
    }
    mutate(directory);
    const result = spawnSync(process.execPath, [join(directory, 'scripts/check-project.mjs')], {
      cwd: directory, encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function fixtureMutation(mutate) {
  return (directory) => {
    const file = join(directory, fixturePath);
    const fixture = JSON.parse(readFileSync(file, 'utf8'));
    mutate(fixture);
    writeFileSync(file, JSON.stringify(fixture));
  };
}

test('accepts the supplied foundation and invented fixture', () => {
  const result = checkDisposableCopy();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Foundation checks passed/);
});

test('rejects a duplicate tag identity', () => {
  const result = checkDisposableCopy(fixtureMutation(data => data.tags.push(data.tags[0])));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Tag IDs must be unique/);
});

test('rejects tag names that differ only in case or outer whitespace', () => {
  const result = checkDisposableCopy(fixtureMutation(data => {
    data.tags.push({ id: 'tag-duplicate', name: ' evening ' });
  }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Normalised tag names must be unique/);
});

test('rejects a tag annotation referencing an unknown playlist', () => {
  const result = checkDisposableCopy(fixtureMutation(data => {
    data.annotations[0].playlistId = 'demo-999';
  }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing playlist/);
});

test('rejects a live destination in a demo record', () => {
  const result = checkDisposableCopy(fixtureMutation(data => {
    data.playlists[0].spotifyUrl = 'https://example.invalid/not-a-playlist';
  }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not point to live content/);
});

test('rejects a broken internal documentation link', () => {
  const result = checkDisposableCopy(directory => {
    const file = join(directory, 'README.md');
    writeFileSync(file, readFileSync(file, 'utf8') + '\n[Missing](missing.md)\n');
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Broken file link/);
});

test('rejects removal of the secrets ignore rule', () => {
  const result = checkDisposableCopy(directory => {
    const file = join(directory, '.gitignore');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^\.env\r?\n/m, ''));
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing ignore rule: .env/);
});

test('does not mutate the authoritative demo fixture', () => {
  const before = readFileSync(join(root, fixturePath));
  checkDisposableCopy(fixtureMutation(data => { data.mode = 'invalid'; }));
  assert.deepEqual(readFileSync(join(root, fixturePath)), before);
});
