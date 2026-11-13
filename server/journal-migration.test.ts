import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { migrateJournal, verifyJournalSchema } from './journal-migration.ts';
function fixture() {
  const state = { rows: [] as { version: number; checksum: string }[], calls: [] as string[], fail: false, releases: 0 };
  let pending = state.rows;
  const query = async (sql: string, values?: unknown[]) => {
    state.calls.push(sql);
    if (sql === 'BEGIN') pending = [...state.rows];
    if (sql.startsWith('SELECT version')) return { rows: state.rows };
    if (sql.includes('CREATE TABLE deletion_journal') && state.fail) throw Error('injected SQL failure');
    if (sql.startsWith('INSERT INTO journal_schema')) pending = [{ version: 1, checksum: values![0] as string }];
    if (sql === 'COMMIT') state.rows = pending;
    return { rows: [] };
  };
  const pool = { query, connect: async () => ({ query, release: () => { state.releases++; } }) } as unknown as Pool;
  return { state, pool };
}

test('journal migration locks, records checksum and is repeatable without reapplying schema', async () => {
  const f = fixture(); await migrateJournal(f.pool); await migrateJournal(f.pool); await verifyJournalSchema(f.pool);
  assert.equal(f.state.calls.filter(sql => sql.includes('CREATE TABLE deletion_journal')).length, 1);
  assert.equal(f.state.releases, 2);
  assert.equal(f.state.calls.filter(sql => sql === 'SELECT pg_advisory_xact_lock(47174176)').length, 2);
  assert.ok(!f.state.calls.some(sql => sql.startsWith('INSERT INTO deletion_journal')));
});

test('changed, future and missing journal schema fail closed', async () => {
  for (const rows of [[{ version: 1, checksum: 'wrong' }], [{ version: 2, checksum: 'future' }]]) {
    const f = fixture(); f.state.rows = rows;
    await assert.rejects(migrateJournal(f.pool)); await assert.rejects(verifyJournalSchema(f.pool));
    assert.ok(f.state.calls.includes('ROLLBACK'));
    assert.ok(!f.state.calls.some(sql => sql.includes('CREATE TABLE deletion_journal')));
  }
  await assert.rejects(verifyJournalSchema(fixture().pool));
});

test('failed journal DDL does not commit a migration receipt', async () => {
  const f = fixture(); f.state.fail = true; await assert.rejects(migrateJournal(f.pool));
  assert.deepEqual(f.state.rows, []); assert.ok(f.state.calls.includes('ROLLBACK')); assert.ok(!f.state.calls.includes('COMMIT'));
});
