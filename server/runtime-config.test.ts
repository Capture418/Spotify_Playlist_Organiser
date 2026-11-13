import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { JsonCipher } from './lifecycle.ts';
import { CredentialStore } from './security.ts';
import { SpotifyTransport } from './spotify.ts';
import type { Pool } from 'pg';
import { productionConfig } from './runtime-config.ts';

const fixture = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production', PORT: '3000',
  DATABASE_URL: 'postgres://app:invented@db/music',
  MIGRATION_DATABASE_URL: 'postgres://migrator:invented@db/music',
  JOURNAL_DATABASE_URL: 'postgres://journal:invented@db/music_journal',
  JOURNAL_MIGRATION_DATABASE_URL: 'postgres://journal_migrator:invented@db/music_journal',
  ORGANISER_ORIGIN: 'https://music.example.invalid',
  ORGANISER_CALLBACK: 'https://music.example.invalid/callback',
  ORGANISER_ACCOUNT: '11111111-1111-4111-8111-111111111111', ORGANISER_OWNER: 'invented-owner',
  SPOTIFY_CLIENT_ID: 'a'.repeat(32),
  ORGANISER_CREDENTIAL_KEYS: 'v1:' + '11'.repeat(32), ORGANISER_CREDENTIAL_CURRENT: 'v1',
  ORGANISER_SNAPSHOT_KEYS: 'v1:' + '22'.repeat(32), ORGANISER_SNAPSHOT_CURRENT: 'v1',
  ORGANISER_JOURNAL_KEYS: 'v1:' + '33'.repeat(32), ORGANISER_JOURNAL_CURRENT: 'v1',
});
test('runtime configuration maps invented identities, separate pools and versioned keys without side effects', () => {
  const env = fixture(), before = { ...env }, config = productionConfig(env);
  assert.deepEqual(env, before);
  assert.equal(config.port, 3000); assert.equal(config.owner.binding, 'invented-owner');
  assert.equal(config.databases.runtime.ssl, false);
  assert.equal(config.journal.keys.get('v1')?.length, 32);
  const rotated = productionConfig({ ...env, ORGANISER_CREDENTIAL_KEYS: env.ORGANISER_CREDENTIAL_KEYS + ',v2:' + '44'.repeat(32), ORGANISER_CREDENTIAL_CURRENT: 'v2' });
  assert.equal(rotated.credentials.keys.size, 2); assert.equal(rotated.credentials.current, 'v2');
});
test('every required runtime setting rejects missing/control/oversized values with names-only errors', () => {
  for (const name of Object.keys(fixture())) {
    for (const value of [undefined, '', 'private\nvalue', 'private\tvalue', 'x'.repeat(4097)]) {
      assert.throws(() => productionConfig({ ...fixture(), [name]: value }), { message: `Missing or invalid setting: ${name}` });
    }
  }
});
test('invalid origins, callback, identities, key references and legacy or synthetic controls fail closed', () => {
  for (const [name, values] of Object.entries({
    NODE_ENV: ['development'], PORT: ['0', '65536', '03000'],
    ORGANISER_ORIGIN: ['http://music.example.invalid', 'https://music.example.invalid/', 'https://u:p@music.example.invalid', 'not-a-url'],
    ORGANISER_CALLBACK: ['https://other.invalid/callback', 'https://music.example.invalid/callback?x=1'],
    ORGANISER_ACCOUNT: ['invalid'], ORGANISER_OWNER: ['two words'], SPOTIFY_CLIENT_ID: ['invalid'],
    ORGANISER_CREDENTIAL_CURRENT: ['missing'], ORGANISER_SNAPSHOT_CURRENT: ['missing'], ORGANISER_JOURNAL_CURRENT: ['missing'],
    ORGANISER_CREDENTIAL_KEYS: ['v1:bad', 'v1:' + '11'.repeat(32) + ',v1:' + '44'.repeat(32)],
    ORGANISER_SNAPSHOT_KEYS: ['v1:' + '11'.repeat(32)],
    ORGANISER_SYNTHETIC: ['', 'false'], ORGANISER_DATABASE: ['legacy'], ORGANISER_KEY: ['legacy'],
  })) for (const value of values) assert.throws(() => productionConfig({ ...fixture(), [name]: value }), { message: `Missing or invalid setting: ${name}` });
});
test('valid full configuration still cannot activate the production executable', () => {
  const result = spawnSync(process.execPath, ['server/production.ts'], { env: fixture(), encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production activation requires the separate S04c operational gate/);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /postgres:\/\/|invented-owner|111111111111111111/);
});

test('validated settings fit existing cipher and transport dependencies without connecting', () => {
  const config = productionConfig(fixture());
  const pool = { query: () => { throw Error('Unexpected database access'); } } as unknown as Pool;
  const vault = new CredentialStore(pool, config.credentials.keys, config.credentials.current);
  assert.equal(vault.current, 'v1');
  const snapshots = new JsonCipher(config.snapshots.keys, config.snapshots.current, 'snapshot');
  const journal = new JsonCipher(config.journal.keys, config.journal.current, 'journal');
  const envelope = snapshots.encrypt({ invented: true }, config.owner.account);
  assert.deepEqual(snapshots.decrypt(envelope, config.owner.account), { invented: true });
  assert.throws(() => journal.decrypt(envelope, config.owner.account));
  const spotify = new SpotifyTransport(config.clientId, config.callback, async () => { throw Error('Unexpected network request'); });
  assert.equal(spotify.callback, config.callback);
});
