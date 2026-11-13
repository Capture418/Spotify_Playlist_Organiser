import { homeProcessConfig } from './runtime-config.ts';
import type { Pool, PoolConfig } from 'pg';
import { homeDatabaseConfig } from './home-config.ts';
import { migrate, verifySchema } from './database.ts';
import { migrateJournal, verifyJournalSchema } from './journal-migration.ts';
import { PostgresJournal } from './postgres-journal.ts';
import { JsonCipher } from './lifecycle.ts';
import { bounded } from './security.ts';

export type PreparedListener = {
  listen: (port: number, host: '0.0.0.0', signal: AbortSignal) => Promise<void>;
  close: () => Promise<void>;
};
type Dependencies = {
  pool: (config: PoolConfig) => Pool;
  compose: (runtime: Pool, journal: PostgresJournal, signal: AbortSignal) => Promise<PreparedListener>;
  migrateApp?: typeof migrate;
  migrateJournal?: typeof migrateJournal;
  verifyApp?: typeof verifySchema;
  verifyJournal?: typeof verifyJournalSchema;
};

/** Explicitly invoked preparation seam; production.ts never calls it. No implicit credentials/bootstrap. */
export async function startPreparedHome(
  env: NodeJS.ProcessEnv,
  ciphers: { snapshots: JsonCipher; journal: JsonCipher },
  dependencies: Dependencies,
  timeoutMs = 150000,
) {
  const configs = homeDatabaseConfig(env);
  const { port } = homeProcessConfig(env);
  if (ciphers.snapshots.purpose !== 'snapshot' || ciphers.journal.purpose !== 'journal') throw Error('Invalid startup cipher purposes');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 150000) throw Error('Invalid startup timeout');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const pools: Pool[] = [];
  const closed = new Set<Pool>();
  let listener: PreparedListener | undefined;
  let stage = 'configuration';
  let closing: Promise<void> | undefined;
  async function end(pool: Pool) { if (!closed.has(pool)) { closed.add(pool); await pool.end(); } }
  function close(): Promise<void> {
    if (!closing) closing = (async () => {
      controller.abort();
      if (listener) await listener.close().catch(() => {});
      await Promise.allSettled(pools.map(end));
    })();
    return closing;
  }
  async function step<T>(name: string, work: () => Promise<T>) {
    stage = name;
    return bounded(controller.signal, work);
  }
  try {
    for (const config of [configs.runtime, configs.migration, configs.journal, configs.journalMigration]) {
      const pool = dependencies.pool(config);
      if (pools.includes(pool)) throw Error('Distinct pools required');
      pools.push(pool);
    }
    const [runtime, migration, journalPool, journalMigration] = pools as [Pool, Pool, Pool, Pool];
    await step('journal migration', () => (dependencies.migrateJournal ?? migrateJournal)(journalMigration));
    await step('application migration', () => (dependencies.migrateApp ?? migrate)(migration, 3, ciphers.snapshots));
    await step('migration connection cleanup', () => Promise.all([end(migration), end(journalMigration)]));
    await step('application schema verification', () => (dependencies.verifyApp ?? verifySchema)(runtime));
    await step('journal schema verification', () => (dependencies.verifyJournal ?? verifyJournalSchema)(journalPool));
    const journal = new PostgresJournal(journalPool, ciphers.journal);
    await step('journal verification', () => journal.read());
    await step('recovery guard', async () => {
      const result = await runtime.query('SELECT blocked FROM recovery_guard');
      if (result.rows.length !== 1 || result.rows[0]?.blocked !== false) throw Error('Recovery reconciliation required');
    });
    // Late composition must dispose its own resources even if the deadline already won.
    listener = await step('application composition', async () => {
      const app = await dependencies.compose(runtime, journal, controller.signal);
      if (controller.signal.aborted) { await app.close(); throw Error('Startup cancelled'); }
      return app;
    });
    await step('database readiness', () => Promise.all([runtime.query('SELECT 1'), journalPool.query('SELECT 1')]));
    await step('listen', () => listener!.listen(port, '0.0.0.0', controller.signal));
    clearTimeout(timer);
    return { close, journal };
  } catch {
    clearTimeout(timer);
    await close();
    throw new Error(`Startup failed at ${stage}`);
  }
}
