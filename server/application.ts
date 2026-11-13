import { Setup, setupStore } from './setup.ts';
import { setupServer } from './setup-http.ts';
import type { Server } from 'node:http';
import type { Pool, PoolConfig } from 'pg';
import { platformProductionConfig } from './runtime-config.ts';
import { startPreparedPlatform } from './platform-startup.ts';
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
  start?: typeof startPreparedPlatform;
  application?: typeof preparedApplication;
}) {
  const config = platformProductionConfig(env);
  if (env.SETUP_MODE !== undefined && env.SETUP_MODE !== '1') throw Error('Invalid setup mode');
  if (env.SETUP_MODE === '1' ? !/^[A-Za-z0-9_-]{43,128}$/.test(env.SETUP_TOKEN ?? '') : env.SETUP_TOKEN !== undefined) throw Error('Invalid setup configuration'); // All settings validated before any side effects.
  const snapshots = new JsonCipher(config.snapshots.keys, config.snapshots.current, 'snapshot');
  const spotify = new SpotifyTransport(config.clientId, config.callback, dependencies.transport);
  return (dependencies.start ?? startPreparedPlatform)(env, snapshots, {
    pool: dependencies.pool,
    compose: async (runtime, signal) => {
      signal.throwIfAborted();
      if (env.SETUP_MODE === '1') {
        const setup = new Setup(env.SETUP_TOKEN!, config.owner, spotify, setupStore(runtime, config.owner));
        const server = setupServer(setup, config.origin, () => runtime.query('SELECT 1'));
        return preparedListener(server, () => setup.close());
      }
      const store = new Store(runtime, config.owner.account);
      store.snapshotsCipher = snapshots;
      const vault = new CredentialStore(runtime, config.credentials.keys, config.credentials.current);
      const app = await (dependencies.application ?? preparedApplication)(store, config.owner, spotify, vault);
      const listener = preparedListener(app.server, app.dispose);
      if (signal.aborted) { await listener.close(); throw Error('Startup cancelled'); }
      return listener;
    },
  });
}
