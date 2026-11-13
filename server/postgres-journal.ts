import type { Pool } from 'pg';
import { transaction } from './database.ts';
import type { JsonCipher, Envelope } from './lifecycle.ts';
import { validateJournal } from './journal.ts';
import type { Deletion, Journal } from './journal.ts';
import { requireValue } from './validation.ts';

/** Independent journal pool only. No schema creation, bootstrap or retirement at runtime. */
export class PostgresJournal implements Journal {
  readonly pool: Pool; readonly cipher: JsonCipher;
  constructor(pool: Pool, cipher: JsonCipher) { this.pool = pool; this.cipher = cipher; }
  private decode(rows: { payload: unknown }[]) {
    requireValue(rows.length === 1, 'Recovery journal missing');
    const payload = rows[0]!.payload;
    requireValue(Buffer.byteLength(JSON.stringify(payload) ?? '') <= 17 * 1024 * 1024, 'Recovery journal too large');
    return validateJournal(this.cipher.decrypt(payload as Envelope, 'deletions'));
  }
  async read(): Promise<Deletion[]> {
    return this.decode((await this.pool.query('SELECT payload FROM deletion_journal WHERE singleton=true')).rows);
  }
  async put(record: Deletion): Promise<void> {
    validateJournal([record]);
    await transaction(this.pool, async client => {
      const records = this.decode((await client.query('SELECT payload FROM deletion_journal WHERE singleton=true FOR UPDATE')).rows);
      const previous = records.find(item => item.operation === record.operation);
      if (previous) requireValue(previous.account === record.account && previous.deletedAt === record.deletedAt, 'Recovery journal identity mismatch');
      const next = validateJournal(previous
        ? records.map(item => item.operation === record.operation ? { ...record, state: item.state === 'complete' ? 'complete' : record.state } : item)
        : [...records, record]);
      const payload = this.cipher.encrypt(next, 'deletions');
      this.cipher.decrypt(payload, 'deletions');
      requireValue(Buffer.byteLength(JSON.stringify(payload)) <= 17 * 1024 * 1024, 'Recovery journal too large');
      const result = await client.query('UPDATE deletion_journal SET payload=$1, revision=revision+1 WHERE singleton=true', [payload]);
      requireValue(result.rowCount === 1, 'Recovery journal missing');
    });
  }
}
