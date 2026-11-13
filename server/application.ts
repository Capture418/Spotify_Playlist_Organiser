import type { Server } from 'node:http';
import type { Pool, PoolConfig } from 'pg';
import { productionConfig } from './runtime-config.ts';
import { startPreparedHome } from './startup.ts';
import type { PreparedListener } from './startup.ts';
import { preparedApplication } from './integration.ts';
import { Store } from './store.ts';
import { CredentialStore } from './security.ts';
import { JsonCipher } from './lifecycle.ts';
import { SpotifyTransport } from './spotify.ts';
import type { Transport } from './spotify.ts';

/** Own listener and maintenance even if startup fails before the server listens. */
export function preparedListener(server: Server, dispose: () => void): PreparedListener {
  let closing: Promise<void> | undefined;
  return {
    listen: (port, host, signal) => new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(Error('Startup cancelled')); return; }
      const clear = () => { server.off('error', failed); signal.removeEventListener('abort', cancelled); };
      const failed = () => { clear(); reject(Error('Listener failed')); };
      const cancelled = () => { clear(); reject(Error('Startup cancelled')); };
      server.once('error', failed); signal.addEventListener('abort', cancelled, { once: true });
      try { server.listen({ port, host, signal }, () => { clear(); resolve(); }); }
      catch { failed(); }
    }),
    close: () => {
      if (!closing) closing = (async () => {
        dispose();
        if (server.listening) await new Promise<void>((resolve, reject) => {
          server.close(error => error ? reject(Error('Listener shutdown failed')) : resolve());
          server.closeAllConnections();
        });
      })();
      return closing;
    },
  };
}

/** Explicit composition only: no default network/pool, no owner creation, no executable activation. */
export async function startIntegratedApplication(env: NodeJS.ProcessEnv, dependencies: {
  pool: (config: PoolConfig) => Pool;
  transport: Transport;
  start?: typeof startPreparedHome;
  application?: typeof preparedApplication;
}) {
  const config = productionConfig(env); // All settings validated before any side effects.
  const snapshots = new JsonCipher(config.snapshots.keys, config.snapshots.current, 'snapshot');
  const journal = new JsonCipher(config.journal.keys, config.journal.current, 'journal');
  const spotify = new SpotifyTransport(config.clientId, config.callback, dependencies.transport);
  return (dependencies.start ?? startPreparedHome)(env, { snapshots, journal }, {
    pool: dependencies.pool,
    compose: async (runtime, journalStore, signal) => {
      signal.throwIfAborted();
      const store = new Store(runtime, config.owner.account);
      store.snapshotsCipher = snapshots;
      const vault = new CredentialStore(runtime, config.credentials.keys, config.credentials.current);
      const app = await (dependencies.application ?? preparedApplication)(store, config.owner, spotify, vault, journalStore);
      const listener = preparedListener(app.server, app.dispose);
      if (signal.aborted) { await listener.close(); throw Error('Startup cancelled'); }
      return listener;
    },
  });
}
