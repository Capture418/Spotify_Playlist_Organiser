import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'node:http';
import type { Pool } from 'pg';
import { Store } from './store.ts';
import { appServer } from './http.ts';

async function request(path: string, headers: IncomingHttpHeaders, method = 'GET', rawHeaders: string[] = [], production = true) {
  let queries = 0;
  const pool = { query: async () => { queries++; return { rows: [] }; } } as unknown as Pool;
  const server = appServer(new Store(pool, '11111111-1111-4111-8111-111111111111'), {
    origin: production ? 'https://music.example.invalid' : 'http://127.0.0.1:3000', production,
  });
  try {
    return await new Promise<{status: number; body: string; queries: number}>(resolve => {
      let status = 200;
      server.emit('request', { url: path, method, headers, rawHeaders, socket: { remoteAddress: '127.0.0.1' } } as IncomingMessage, {
        headersSent: false, setHeader() {}, writeHead(value: number) { status = value; },
        end(body: string) { resolve({status, body, queries}); },
      } as unknown as ServerResponse);
    });
  } finally { server.removeAllListeners(); }
}
const trusted = { host: 'music.example.invalid', 'x-forwarded-proto': 'https' };
test('production routes reject missing, chained, duplicate or non-HTTPS scheme before data access', async () => {
  for (const path of ['/', '/api/library', '/callback', '/manifest.webmanifest', '/health?x=1']) {
    for (const scheme of [undefined, 'http', 'https,http', 'https, https', 'HTTPS', ['https', 'https']]) {
      const response = await request(path, { ...trusted, 'x-forwarded-proto': scheme });
      assert.equal(response.status, 403); assert.equal(response.queries, 0);
    }
    assert.equal((await request(path, trusted, 'GET', ['X-Forwarded-Proto', 'https', 'x-forwarded-proto', 'https'])).status, 403);
  }
});
test('forwarded host/origin cannot bypass canonical Host, authentication or production refusal', async () => {
  const spoofed = { ...trusted, forwarded: 'host=evil.invalid;proto=http', 'x-forwarded-host': 'evil.invalid', 'x-forwarded-for': 'invented' };
  assert.equal((await request('/api/library', spoofed)).status, 401);
  assert.equal((await request('/', spoofed)).status, 503);
  assert.equal((await request('/api/library', { ...trusted, host: 'evil.invalid', 'x-forwarded-host': trusted.host })).status, 403);
  assert.equal((await request('/api/edit', { ...trusted, origin: 'https://evil.invalid' }, 'POST')).status, 403);
  assert.equal((await request('/api/edit', { ...trusted, origin: 'https://music.example.invalid' }, 'POST')).status, 401);
});
test('only exact health keeps direct probe access; synthetic loopback does not require proxy headers', async () => {
  assert.deepEqual(await request('/health', { host: '127.0.0.1:3000' }), { status: 200, body: '{"status":"ok"}', queries: 1 });
  assert.equal((await request('/health', {}, 'POST')).status, 405);
  for (const path of ['/health/', '/health?x=1', '/api/library']) assert.equal((await request(path, { host: '127.0.0.1:3000' })).status, 403);
  assert.equal((await request('/api/library', { host: '127.0.0.1:3000' }, 'GET', [], false)).status, 401);
});
