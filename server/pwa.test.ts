import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pwaAssetType } from './pwa.ts';
test('PWA assets form a fixed public allowlist, with no file traversal or private routes', () => {
  for (const [path, type] of [['/manifest.webmanifest', 'application/manifest+json'], ['/icons/icon-192.png', 'image/png'], ['/icons/icon-512.png', 'image/png'], ['/icons/apple-touch-icon.png', 'image/png'], ['/icons/library.svg', 'image/svg+xml']]) assert.equal(pwaAssetType(path!), type);
  for (const path of ['/icons/../../.env', '/icons/%2e%2e/.env', '/.env', '/api/library', '/callback', '/icons/private.png', '/sw.js', '/']) assert.equal(pwaAssetType(path), undefined);
});
test('manifest and local icons have a stable same-origin identity and valid PNG dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'Music Library Organiser'); assert.equal(manifest.short_name, manifest.name);
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.display, 'standalone');
  for (const [path, size] of [['/icons/apple-touch-icon.png', 180], ...manifest.icons.map((icon: {src:string;sizes:string}) => [icon.src, Number(icon.sizes.split('x')[0])])] ) {
    assert.equal(pwaAssetType(path as string), 'image/png');
    const data = readFileSync(new URL('../public' + path, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    assert.equal(data.readUInt32BE(16), size); assert.equal(data.readUInt32BE(20), size);
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /viewport-fit=cover/);
});

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { Store } from './store.ts';
import { appServer } from './http.ts';
test('public PWA routes preserve HTTP Host/method checks and production activation refusal', async () => {
  const pool = { query: () => { throw Error('No database access expected'); } } as unknown as Pool;
  const server = appServer(new Store(pool, '11111111-1111-4111-8111-111111111111'), { origin: 'https://example.invalid', production: true });
  async function request(url: string, method = 'GET', host = 'example.invalid') {
    return new Promise<number>(resolve => {
      let status = 200;
      server.emit('request', { url, method, headers: { host, 'x-forwarded-proto': 'https' }, socket: { remoteAddress: '127.0.0.1' } } as unknown as IncomingMessage, {
        headersSent: false, setHeader() {}, writeHead(value: number) { status = value; }, end() { resolve(status); },
      } as unknown as ServerResponse);
    });
  }
  try {
    for (const path of ['/manifest.webmanifest', '/icons/icon-512.png']) {
      assert.equal(await request(path, 'POST'), 405); assert.equal(await request(path, 'GET', 'wrong.invalid'), 403);
    }
    assert.equal(await request('/'), 503); assert.equal(await request('/api/library'), 401);
    for (const path of ['/sw.js', '/.env', '/icons/private.png', '/icons/%2e%2e/.env']) assert.equal(await request(path), 404);
  } finally { server.removeAllListeners(); }
});
