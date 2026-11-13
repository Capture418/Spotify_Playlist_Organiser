import type { Pool } from 'pg';
import { transaction, verifySchema } from './database.ts';
import { verifyJournalSchema } from './journal-migration.ts';
import type { JsonCipher } from './lifecycle.ts';

/** Operator-only first-ever initialisation. Never called by app startup or an HTTP route.
 * These attestations require external operator evidence; SQL cannot prove lost history never existed.
 * Two databases cannot commit atomically: any interruption requires inspection, never automatic reset.
 */
export async function initialiseEmptyJournal(app: Pool, journal: Pool, cipher: JsonCipher,
  confirmation: { firstEver: boolean; appStopped: boolean; inventoryVerified: boolean },
  verify = { app: verifySchema, journal: verifyJournalSchema }) {
  if (app === journal || cipher.purpose !== 'journal' || confirmation.firstEver !== true || confirmation.appStopped !== true || confirmation.inventoryVerified !== true) throw Error('Explicit first-use confirmation required');
  await verify.app(app); await verify.journal(journal);
  await transaction(app, async c => {
    await c.query('SELECT pg_advisory_xact_lock(47174175)');
    const guard = await c.query('SELECT blocked FROM recovery_guard FOR UPDATE');
    if (guard.rows.length !== 1 || guard.rows[0].blocked !== true) throw Error('Blocked recovery guard required');
    const tables = ['accounts','sessions','connections','items','metadata_cache','tags','assignments','mutation_receipts','restore_snapshots','restore_previews','collection_generations','deletion_records'];
    for (const table of tables) if (Number((await c.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n) !== 0) throw Error('First-use storage must be empty');
    await transaction(journal, async j => {
      await j.query('LOCK TABLE deletion_journal IN EXCLUSIVE MODE');
      if (Number((await j.query('SELECT count(*) AS n FROM deletion_journal')).rows[0].n) !== 0) throw Error('Journal already exists; inspect instead of resetting');
      await j.query('INSERT INTO deletion_journal(singleton,payload) VALUES(true,$1)', [cipher.encrypt([], 'deletions')]);
    });
  });
  // Guard remains blocked. A fresh reconcile/approve process is a distinct operator action.
}
