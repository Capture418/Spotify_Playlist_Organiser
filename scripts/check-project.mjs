#!/usr/bin/env node
/**
 * Read-only, dependency-free foundation validation.
 * Does not execute an app, make network requests or audit application security.
 * Run from any directory: node <project>/scripts/check-project.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const documents = [
  'README.md', 'AGENTS.md', '.ai/constitution.md',
  'docs/architecture.md', 'docs/decisions.md', 'docs/work-plan.md'
];
const required = [
  ...documents, '.editorconfig', '.gitignore', 'src/app/main.tsx',
  'package.json', '.nvmrc', '.npmrc', 'index.html', 'vite.config.ts',
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'scripts/check-lockfile.mjs', 'scripts/check-project.test.mjs', 'scripts/check-lockfile.test.mjs',
  'scripts/check-project.mjs', 'tests/fixtures/demo-library.json'
];
let failures = 0;

function check(name, action) {
  try {
    action();
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL: ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function unique(values, description) {
  assert.equal(new Set(values).size, values.length, `${description} must be unique`);
}

check('Required project source files exist within the project', () => {
  for (const relative of required) {
    const location = path.join(root, relative);
    assert.ok(fs.lstatSync(location).isFile(), `Missing regular file: ${relative}`);
    assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Unexpected symlink: ${relative}`);
    const actual = path.relative(root, fs.realpathSync(location));
    assert.ok(!actual.startsWith('..') && !path.isAbsolute(actual), `File escapes project: ${relative}`);
  }
});

check('Markdown file links resolve inside the project', () => {
  for (const relative of documents) {
    for (const match of read(relative).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
      const target = path.resolve(root, path.dirname(relative), href.split('#')[0]);
      const within = path.relative(root, target);
      assert.ok(!within.startsWith('..') && !path.isAbsolute(within), `External file link in ${relative}: ${href}`);
      assert.ok(fs.existsSync(target), `Broken file link in ${relative}: ${href}`);
    }
  }
});

check('Ignore rules cover local secrets and generated output', () => {
  const rules = new Set(read('.gitignore').split(/\r?\n/).map(line => line.trim()));
  for (const requiredRule of ['.env', '.env.*', 'node_modules/', 'dist/', 'coverage/', '.work/', '.local/', 'exports/']) {
    assert.ok(rules.has(requiredRule), `Missing ignore rule: ${requiredRule}`);
  }
});

check('Invented fixture identities and references are consistent', () => {
  const data = JSON.parse(read('tests/fixtures/demo-library.json'));
  assert.equal(data.mode, 'demo');
  assert.equal(data.schemaVersion, 1);
  assert.ok(Array.isArray(data.tags) && Array.isArray(data.playlists) && Array.isArray(data.annotations));
  unique(data.tags.map(tag => tag.id), 'Tag IDs');
  unique(data.tags.map(tag => tag.name.trim().toLowerCase()), 'Normalised tag names');
  unique(data.playlists.map(playlist => playlist.id), 'Playlist IDs');
  unique(data.annotations.map(annotation => annotation.playlistId), 'Annotation playlist IDs');
  const tagIds = new Set(data.tags.map(tag => tag.id));
  const playlistIds = new Set(data.playlists.map(playlist => playlist.id));
  for (const tag of data.tags) {
    assert.ok(typeof tag.name === 'string' && tag.name.trim().length > 0, 'Tag name is empty');
  }
  for (const playlist of data.playlists) {
    assert.match(playlist.id, /^demo-\d{3}$/);
    assert.equal(playlist.source, 'demo');
    assert.ok(typeof playlist.title === 'string' && playlist.title.trim().length > 0, 'Playlist title is empty');
    for (const key of ['spotifyPlaylistId', 'spotifyUrl', 'artworkUrl']) {
      assert.equal(playlist[key], null, `Demo ${key} must not point to live content`);
    }
  }
  for (const annotation of data.annotations) {
    assert.ok(playlistIds.has(annotation.playlistId), 'Annotation refers to a missing playlist');
    unique(annotation.tagIds, 'Tags on a playlist');
    assert.ok(annotation.tagIds.every(id => tagIds.has(id)), 'Annotation refers to a missing tag');
  }
  assert.equal(data.annotations.length, data.playlists.length, 'Every demo playlist needs an annotation record');
  for (const example of data.proposedSearchExamples) {
    assert.ok(example.selectedTagIds.every(id => tagIds.has(id)), 'Example refers to a missing tag');
    assert.ok(example.expectedPlaylistIds.every(id => playlistIds.has(id)), 'Example refers to a missing playlist');
    unique(example.expectedPlaylistIds, 'Expected playlist IDs');
    assert.equal(typeof example.query, 'string');
  }
});

if (failures > 0) {
  console.error(`\n${failures} foundation check group(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nFoundation checks passed. No application build, device test or security audit was performed.');
}
