import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCOPES, SpotifySession } from './client.ts';
const token = { access_token: 'fake-token', token_type: 'Bearer', expires_in: 3600, scope: SCOPES, refresh_token: 'discard-refresh' };
const reply = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
async function connect(session: SpotifySession) {
  const auth = new URL(session.connect('a'.repeat(32)));
  await session.callback(new URLSearchParams({ state: auth.searchParams.get('state')!, code: 'fake-code' }));
}
test('identity is explicit, uses fixed GET endpoint/exact scopes, exposes only boolean and clears on reconnect', async () => {
  const calls: string[] = [];
  const session = new SpotifySession(async (url, init) => {
    calls.push(String(url));
    if (String(url).endsWith('/token')) return reply(token);
    assert.equal(url, 'https://api.spotify.com/v1/me');
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    assert.ok(init);
    assert.equal((init.headers as Record<string,string>).Authorization, 'Bearer fake-token');
    assert.ok(init?.signal);
    return reply({ account_id: 'invented-account', email: 'discard-profile', images: ['discard-profile'] });
  });
  await assert.rejects(session.checkIdentity(), /Connect/);
  await connect(session); assert.equal(calls.length, 1); assert.equal(session.identityVerified, false);
  await session.checkIdentity(); assert.equal(calls.length, 2); assert.equal(session.identityVerified, true);
  assert.doesNotMatch(JSON.stringify(session), /invented-account|discard-profile|fake-token|discard-refresh/);
  assert.deepEqual(session.items, []); assert.deepEqual(session.albums, []);
  await connect(session); assert.equal(session.identityVerified, false); session.disconnect();
});
test('missing, malformed, excessive and whitespace identity fail without leaking profile data or stale success', async () => {
  let body: unknown = { account_id: 'valid-fake' };
  const session = new SpotifySession(async url => reply(String(url).endsWith('/token') ? token : body));
  await connect(session);
  for (const bad of [null, [], {}, { id: 'mutable-only' }, ...['', ' ', 'a\nb', 'a\u007fb', 'x'.repeat(257), 123, null].map(account_id => ({ account_id }))]) {
    body = { account_id: 'valid-fake' }; await session.checkIdentity(); assert.equal(session.identityVerified, true);
    body = bad; await session.checkIdentity(); assert.equal(session.identityVerified, false);
    assert.doesNotMatch(session.message, /valid-fake|mutable-only/);
  }
  session.disconnect();
});
test('identity 401/403 clear the session; 429 enforces cooldown without automatic retries', async () => {
  for (const status of [401,403,429]) {
    let calls = 0;
    const session = new SpotifySession(async url => {
      calls++; return String(url).endsWith('/token') ? reply(token) : reply({ private: 'never-log' }, status, { 'Retry-After': '120' });
    });
    await connect(session); await session.checkIdentity();
    assert.equal(session.identityVerified, false); assert.equal(calls, 2);
    assert.equal(session.connected, status === 429); assert.doesNotMatch(session.message, /never-log/);
    await assert.rejects(session.checkIdentity(), status === 429 ? /cooldown/ : /Connect/);
    assert.equal(calls, 2); session.disconnect();
  }
});
test('identity transport timeout, invalid JSON and response size errors are sanitised', async () => {
  for (const failure of ['timeout','json','size']) {
    const session = new SpotifySession(async url => {
      if (String(url).endsWith('/token')) return reply(token);
      if (failure === 'timeout') throw new DOMException('private-response', 'TimeoutError');
      return new Response(failure === 'json' ? 'private-response' : 'x'.repeat(1_000_001));
    });
    await connect(session); await session.checkIdentity();
    assert.equal(session.identityVerified, false); assert.doesNotMatch(session.message, /private-response/); session.disconnect();
  }
});
test('disconnect and expiry discard late identity responses and cannot resurrect success', async t => {
  t.mock.timers.enable({ apis: ['Date','setTimeout'] });
  for (const expire of [false,true]) {
    let resolve!: (value: Response) => void;
    const session = new SpotifySession(async url => String(url).endsWith('/token') ? reply(token) : new Promise<Response>(done => { resolve = done; }));
    await connect(session);
    const pending = session.checkIdentity();
    await assert.rejects(session.checkIdentity(), /already in progress/);
    await assert.rejects(session.refresh(), /already in progress/);
    if (expire) t.mock.timers.tick(3_600_001); else session.disconnect();
    resolve(reply({ account_id: 'late-private-id' })); await pending;
    assert.equal(session.identityVerified, false); assert.equal(session.connected, false);
    assert.doesNotMatch(session.message, /passed|late-private-id/);
  }
});
test('verified identity clears on expiry without another request', async t => {
  t.mock.timers.enable({ apis: ['Date','setTimeout'] });
  const session = new SpotifySession(async url => reply(String(url).endsWith('/token') ? token : { account_id: 'invented' }));
  await connect(session); await session.checkIdentity(); assert.equal(session.identityVerified, true);
  t.mock.timers.tick(3_600_001); assert.equal(session.identityVerified, false);
});
