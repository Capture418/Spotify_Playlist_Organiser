import assert from 'node:assert/strict';
import { test } from 'node:test';
import { homeDatabaseConfig } from './home-config.ts';
const fixture = () => ({
  DATABASE_URL: 'postgres://music_app:invented%40password@db:5432/music',
  MIGRATION_DATABASE_URL: 'postgres://music_migrator:invented@db:5432/music',
  JOURNAL_DATABASE_URL: 'postgres://music_journal_app:invented@db:5432/music_journal',
  JOURNAL_MIGRATION_DATABASE_URL: 'postgres://music_journal_migrator:invented@db:5432/music_journal',
});

test('home config separates four role connections without connecting and decodes passwords', () => {
  const config = homeDatabaseConfig(fixture());
  assert.equal(config.runtime.password, 'invented@password');
  assert.equal(config.runtime.ssl, false);
  assert.equal(config.runtime.connectionString, undefined);
  assert.equal(config.journal.database, 'music_journal');
  assert.equal(config.migration.database, 'music');
});

test('missing and malformed settings report only their names, never their values', () => {
  for (const name of Object.keys(fixture())) {
    for (const value of ['', 'private-invalid-value', 'postgres://u:private@db:5432/wrong', 'x'.repeat(4097)]) {
      assert.throws(() => homeDatabaseConfig({ ...fixture(), [name]: value }), { message: `Missing or invalid setting: ${name}` });
    }
  }
});

test('URL overrides, malformed encoding and cross-server connections are rejected', () => {
  for (const value of [
    'postgres://u:p@db/music?sslmode=disable', 'postgres://u:p@db/music#fragment',
    'https://u:p@db/music', 'postgres://u:%ZZ@db/music',
    'postgres://u:p@db:0/music', 'postgres://u:p\\x@db/music',
    'postgres://u:p\nx@db/music', 'postgres://u:p@db/music/extra',
  ]) assert.throws(() => homeDatabaseConfig({ ...fixture(), DATABASE_URL: value }));
  assert.throws(() => homeDatabaseConfig({ ...fixture(), JOURNAL_DATABASE_URL: 'postgres://j:p@other:5432/music_journal' }));
});

test('role reuse or a journal pointed at the app database cannot weaken separation', () => {
  assert.throws(() => homeDatabaseConfig({ ...fixture(), MIGRATION_DATABASE_URL: fixture().DATABASE_URL }), /roles must be distinct/);
  assert.throws(() => homeDatabaseConfig({ ...fixture(), JOURNAL_DATABASE_URL: 'postgres://j:p@db/music' }), /JOURNAL_DATABASE_URL/);
});
