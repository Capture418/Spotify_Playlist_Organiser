import type { Pool, PoolConfig } from 'pg';
import { platformDatabaseConfig } from './home-config.ts';
import { homeProcessConfig } from './runtime-config.ts';
import { migrate, verifySchema } from './database.ts';
import type { JsonCipher } from './lifecycle.ts';
import { bounded } from './security.ts';
import type { PreparedListener } from './startup.ts';

/** Single supplied role owns schema and runtime; no external initialisation job. */
export async function startPreparedPlatform(env: NodeJS.ProcessEnv, snapshots: JsonCipher, dependencies: {
  pool: (config: PoolConfig) => Pool;
  compose: (pool: Pool, signal: AbortSignal) => Promise<PreparedListener>;
  migrateApp?: typeof migrate;
  verifyApp?: typeof verifySchema;
}, timeoutMs = 150000) {
  const config = platformDatabaseConfig(env), { port } = homeProcessConfig(env);
  if (snapshots.purpose !== 'snapshot') throw Error('Invalid startup cipher purpose');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 150000) throw Error('Invalid startup timeout');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let pool: Pool | undefined, listener: PreparedListener | undefined, closing: Promise<void> | undefined;
  let stage = 'configuration';
  function close(): Promise<void> {
    return closing ??= (async () => {
      controller.abort();
      try { await listener?.close(); } finally { await pool?.end(); }
    })();
  }
  async function step<T>(name: string, work: () => Promise<T>) {
    stage = name;
    return bounded(controller.signal, work);
  }
  try {
    pool = dependencies.pool(config);
    await step('application migration', () => (dependencies.migrateApp ?? migrate)(pool!, 3, snapshots, true));
    await step('application schema verification', () => (dependencies.verifyApp ?? verifySchema)(pool!));
    await step('recovery guard', async () => {
      const r = await pool!.query('SELECT blocked FROM recovery_guard');
      if (r.rows.length !== 1 || r.rows[0]?.blocked !== false) throw Error('Storage unavailable');
    });
    listener = await step('application composition', async () => {
      const app = await dependencies.compose(pool!, controller.signal);
      if (controller.signal.aborted) { await app.close(); throw Error('Startup cancelled'); }
      return app;
    });
    await step('database readiness', () => pool!.query('SELECT 1'));
    await step('listen', () => listener!.listen(port, '0.0.0.0', controller.signal));
    clearTimeout(timer);
    return { close };
  } catch {
    clearTimeout(timer);
    await close().catch(() => {});
    throw Error(`Startup failed at ${stage}`);
  }
}
