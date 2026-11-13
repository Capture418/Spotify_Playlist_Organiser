import { database } from './database.ts';
import type { Transport } from './spotify.ts';

/** Inert release preparation. Caller supplies transport; no connection on construction. */
export function releaseDependencies(send: Transport, open: typeof database = database) {
  return {
    pool: (config: Parameters<typeof database>[0]) => {
      const pool = open(config);
      // Idle connection failures must not become uncaught errors containing connection details.
      // Readiness and request queries still fail normally; pg retires the broken idle client.
      pool.on('error', () => {});
      return pool;
    },
    transport: (async (url, init) => {
      const token = url === 'https://accounts.spotify.com/api/token' && init.method === 'POST';
      const read = /^https:\/\/api\.spotify\.com\/v1\/me(?:\/(?:playlists|albums)\?limit=(?:50|10)&offset=\d+)?$/.test(url) && (init.method === undefined || init.method === 'GET');
      if ((!token && !read) || !init.signal) throw Error('Spotify request rejected');
      try { return await send(url, { ...init, redirect: 'error' }); }
      catch { throw Error('Spotify transport unavailable'); }
    }) satisfies Transport,
  };
}
