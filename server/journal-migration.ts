import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { transaction } from './database.ts';

async function definition() {
  const sql = await readFile(new URL('./journal-migrations/001-journal.sql', import.meta.url), 'utf8');
  return { sql, checksum: createHash('sha256').update(sql).digest('hex') };
}
function validate(rows: { version: number; checksum: string }[], checksum: string, required: boolean) {
  if (rows.length === 0 && !required) return;
  if (rows.length !== 1 || rows[0]!.version !== 1 || rows[0]!.checksum !== checksum) throw Error('Incompatible journal schema');
}

/** Schema changes only: never creates a database or silently replaces missing journal data. */
export async function migrateJournal(pool: Pool) {
  const { sql, checksum } = await definition();
  await transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(47174176)');
    await client.query('CREATE TABLE IF NOT EXISTS journal_schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL)');
    const applied = await client.query('SELECT version,checksum FROM journal_schema_migrations ORDER BY version');
    validate(applied.rows, checksum, false);
    if (!applied.rows.length) {
      await client.query(sql);
      await client.query('INSERT INTO journal_schema_migrations(version,checksum) VALUES(1,$1)', [checksum]);
    }
    await client.query('GRANT SELECT ON journal_schema_migrations TO music_journal_app');
  });
}

export async function verifyJournalSchema(pool: Pool) {
  const { checksum } = await definition();
  const applied = await pool.query('SELECT version,checksum FROM journal_schema_migrations ORDER BY version');
  validate(applied.rows, checksum, true);
}
