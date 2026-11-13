import type { Pool } from 'pg';
import { transaction } from './database.ts';
import { requireValue, uuid } from './validation.ts';

/** Tombstone and cascading deletion share one commit and the same backup loss window. */
export class AtomicDeletion {
  private readonly pool: Pool;
  private readonly cancel: () => void;
  constructor(pool: Pool, cancel: () => void) { this.pool = pool; this.cancel = cancel; }
  async erase(account: string, confirmed: boolean) {
    uuid(account); requireValue(confirmed, 'Confirmation required');
    this.cancel();
    await transaction(this.pool, async c => {
      await c.query('SELECT pg_advisory_xact_lock(47174175)');
      const guard = await c.query('SELECT blocked FROM recovery_guard FOR UPDATE');
      requireValue(guard.rows.length === 1 && guard.rows[0]?.blocked === false, 'Storage unavailable');
      const result = await c.query('SELECT binding FROM accounts WHERE id=$1 FOR UPDATE', [account]);
      if (result.rows.length) {
        await c.query('INSERT INTO deletion_records VALUES($1,$2) ON CONFLICT(binding) DO UPDATE SET deleted_ms=EXCLUDED.deleted_ms', [result.rows[0].binding, Date.now()]);
        await c.query('DELETE FROM accounts WHERE id=$1', [account]);
      }
    });
    return { deleted: true, reconciled: true };
  }
}
