import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { JsonCipher } from './lifecycle.ts';
import { PostgresJournal } from './postgres-journal.ts';
import type { Deletion } from './journal.ts';
const record: Deletion = { account: '00000000-0000-4000-8000-000000000001', operation: '00000000-0000-4000-8000-000000000002', deletedAt: 1, state: 'intent' };
function fixture() {
  const cipher = new JsonCipher(new Map([['invented', Buffer.alloc(32, 7)]]), 'invented', 'journal');
  const state = { payload: cipher.encrypt([], 'deletions') as unknown, missing: false, failWrite: false, released: false, queries: [] as string[] };
  let pending: unknown;
  const query = async (sql: string, values?: unknown[]) => {
    state.queries.push(sql);
    if (sql === 'BEGIN') pending = state.payload;
    if (sql.startsWith('SELECT payload')) return { rows: state.missing ? [] : [{ payload: state.payload }] };
    if (sql.startsWith('UPDATE')) {
      if (state.failWrite) throw Error('injected failure');
      pending = values![0]; return { rowCount: 1 };
    }
    if (sql === 'COMMIT') state.payload = pending;
    return {};
  };
  const pool = { query, connect: async () => ({ query, release: () => { state.released = true; } }) } as unknown as Pool;
  return { state, cipher, journal: new PostgresJournal(pool, cipher) };
}

test('journal encrypts records, locks updates and handles intent/completion retries monotonically', async () => {
  const { state, journal } = fixture();
  await journal.put(record);
  await journal.put({ ...record, state: 'complete' });
  await journal.put(record);
  assert.deepEqual(await journal.read(), [{ ...record, state: 'complete' }]);
  assert.ok(state.queries.includes('SELECT payload FROM deletion_journal WHERE singleton=true FOR UPDATE'));
  assert.ok(state.released);
  assert.ok(!JSON.stringify(state.payload).includes(record.account));
});

test('journal missing/corrupt state never becomes an empty journal', async () => {
  const { state, journal } = fixture();
  state.missing = true;
  await assert.rejects(journal.read()); await assert.rejects(journal.put(record));
  state.missing = false; state.payload = {};
  await assert.rejects(journal.read());
  assert.ok(!state.queries.some(sql => sql.startsWith('INSERT') || sql.startsWith('CREATE')));
});

test('journal identity mismatch and write failure roll back and preserve prior records', async () => {
  const { state, journal } = fixture();
  await journal.put(record);
  await assert.rejects(journal.put({ ...record, deletedAt: 2 }));
  state.failWrite = true;
  await assert.rejects(journal.put({ ...record, state: 'complete' }));
  assert.deepEqual(await journal.read(), [record]);
  assert.ok(state.queries.includes('ROLLBACK'));
  assert.ok(state.released);
});
