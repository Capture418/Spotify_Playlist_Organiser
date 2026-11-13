import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { JsonCipher } from './lifecycle.ts';
import { startPreparedHome } from './startup.ts';
const env = {
  NODE_ENV: 'production', PORT: '3000',
  DATABASE_URL: 'postgres://app:fake@db/music', MIGRATION_DATABASE_URL: 'postgres://migration:fake@db/music',
  JOURNAL_DATABASE_URL: 'postgres://journal:fake@db/music_journal', JOURNAL_MIGRATION_DATABASE_URL: 'postgres://journal_migration:fake@db/music_journal',
};
function fixture(failure = '') {
  const events: string[] = [];
  const keys = new Map([['invented', Buffer.alloc(32, 3)]]);
  const ciphers = { snapshots: new JsonCipher(keys, 'invented', 'snapshot'), journal: new JsonCipher(keys, 'invented', 'journal') };
  const action = async (name: string) => { events.push(name); if (failure === name) throw Error('private-injected-detail'); };
  const dependencies = {
    pool: (config: { user?: string }) => {
      events.push('pool:' + config.user);
      return {
        query: async (sql: string) => {
          await action(config.user + ':' + sql);
          if (sql.includes('deletion_journal')) return { rows: failure === 'missing journal' ? [] : [{ payload: ciphers.journal.encrypt([], 'deletions') }] };
          if (sql.includes('recovery_guard')) return { rows: [{ blocked: failure === 'blocked recovery' }] };
          return { rows: [{}] };
        },
        end: () => action('end:' + config.user),
      } as unknown as Pool;
    },
    migrateJournal: () => action('migrate:journal'), migrateApp: () => action('migrate:app'),
    verifyApp: () => action('verify:app'), verifyJournal: () => action('verify:journal'),
    compose: async () => { await action('compose'); return {
      listen: async (port: number, host: string, signal: AbortSignal) => {
        assert.equal(port, 3000); assert.equal(host, '0.0.0.0'); assert.equal(signal.aborted, false); await action('listen');
      }, close: () => action('close:listener'),
    }; },
  };
  return { events, ciphers, dependencies };
}

test('startup validates, migrates, retires migration pools and verifies both stores before listen', async () => {
  const f = fixture(); const running = await startPreparedHome(env, f.ciphers, f.dependencies);
  for (const name of ['migrate:journal', 'migrate:app', 'end:migration', 'end:journal_migration', 'verify:app', 'verify:journal', 'compose', 'app:SELECT 1', 'journal:SELECT 1']) {
    assert.ok(f.events.indexOf(name) >= 0 && f.events.indexOf(name) < f.events.indexOf('listen'), name);
  }
  assert.ok(f.events.indexOf('migrate:journal') < f.events.indexOf('migrate:app'));
  assert.ok(!f.events.includes('end:app'));
  await running.close(); await running.close();
  assert.equal(f.events.filter(e => e === 'close:listener').length, 1);
  for (const user of ['app', 'migration', 'journal', 'journal_migration']) assert.equal(f.events.filter(e => e === 'end:' + user).length, 1);
});

test('invalid configuration cannot create even an injected pool', async () => {
  for (const values of [{ ...env, PORT: '0' }, { ...env, NODE_ENV: 'development' }, { ...env, DATABASE_URL: '' }]) {
    const f = fixture(); await assert.rejects(startPreparedHome(values, f.ciphers, f.dependencies)); assert.deepEqual(f.events, []);
  }
});

test('migration, verification, missing journal and readiness failures prevent listening and close all pools', async () => {
  for (const failure of ['migrate:journal', 'migrate:app', 'verify:app', 'verify:journal', 'missing journal', 'blocked recovery', 'compose', 'app:SELECT 1', 'journal:SELECT 1']) {
    const f = fixture(failure);
    await assert.rejects(startPreparedHome(env, f.ciphers, f.dependencies), error => error instanceof Error && error.message.startsWith('Startup failed at ') && !error.message.includes('private-injected-detail'));
    assert.ok(!f.events.includes('listen'), failure);
    for (const user of ['app', 'migration', 'journal', 'journal_migration']) assert.equal(f.events.filter(e => e === 'end:' + user).length, 1);
  }
});

test('listen failure closes listener and pools', async () => {
  const f = fixture('listen'); await assert.rejects(startPreparedHome(env, f.ciphers, f.dependencies), /Startup failed at listen/);
  assert.ok(f.events.includes('close:listener')); assert.ok(f.events.includes('end:app'));
});

test('deadline during migration prevents late completion from continuing startup', async () => {
  const f = fixture(); let finish = () => {};
  f.dependencies.migrateJournal = () => new Promise<void>(resolve => { finish = resolve; });
  await assert.rejects(startPreparedHome(env, f.ciphers, f.dependencies, 5), /Startup failed at journal migration/);
  finish(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(!f.events.includes('migrate:app')); assert.ok(!f.events.includes('listen')); assert.ok(f.events.includes('end:app'));
});

test('late composition is disposed after deadline without listening', async () => {
  const f = fixture(); let finish = () => {};
  const original = f.dependencies.compose;
  f.dependencies.compose = async () => { await new Promise<void>(resolve => { finish = resolve; }); return original(); };
  await assert.rejects(startPreparedHome(env, f.ciphers, f.dependencies, 10), /Startup failed at application composition/);
  finish(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(f.events.includes('close:listener')); assert.ok(!f.events.includes('listen'));
});
