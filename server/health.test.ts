import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHealth } from './health.ts';

test('health succeeds only after the database query resolves', async () => {
  let finish: () => void = () => {};
  const query = new Promise<void>(resolve => { finish = resolve; });
  let completed = false;
  const result = databaseHealth(() => query).then(status => { completed = true; return status; });
  await Promise.resolve();
  assert.equal(completed, false);
  finish();
  assert.equal(await result, 200);
});

test('database failure returns only an error status, then a later healthy query recovers', async () => {
  assert.equal(await databaseHealth(async () => { throw new Error('invented-private-database-detail'); }), 503);
  assert.equal(await databaseHealth(async () => ({ rows: [{ '?column?': 1 }] })), 200);
});

test('a hung database query cannot hang the health response', async () => {
  assert.equal(await databaseHealth(() => new Promise(() => {}), 5), 503);
});

// Exercise the actual HTTP listener without binding a port or opening a database.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { Store } from './store.ts';
import { appServer } from './http.ts';

async function request(path: string, method: string, query: (sql: string) => Promise<unknown>) {
  const pool = { query } as unknown as Pool;
  const store = new Store(pool, '00000000-0000-4000-8000-000000000001');
  const server = appServer(store, { origin: 'https://music.example.invalid', production: true });
  const response = await new Promise<{ status: number; body: string }>(resolve => {
    let status = 0;
    const res = {
      headersSent: false,
      setHeader() {},
      writeHead(value: number) { status = value; },
      end(body: string) { resolve({ status, body }); },
    } as unknown as ServerResponse;
    const req = { url: path, method, headers: { host: '127.0.0.1:3000' } } as IncomingMessage;
    server.emit('request', req, res);
  });
  server.removeAllListeners();
  return response;
}

test('internal health route probes SELECT 1 and returns safe 200/503 responses', async () => {
  const queries: string[] = [];
  assert.deepEqual(await request('/health', 'GET', async sql => { queries.push(sql); }), { status: 200, body: '{"status":"ok"}' });
  assert.deepEqual(queries, ['SELECT 1']);
  assert.deepEqual(await request('/health', 'GET', async () => { throw Error('private-detail'); }), { status: 503, body: '{"status":"unavailable"}' });
});

test('health Host exception does not permit writes or bypass application Host checks', async () => {
  let calls = 0;
  const query = async () => { calls++; };
  assert.equal((await request('/health', 'POST', query)).status, 405);
  for (const path of ['/api/library', '/callback', '/', '/health?extra=1']) {
    assert.equal((await request(path, 'GET', query)).status, 403);
  }
  assert.equal(calls, 0);
});
