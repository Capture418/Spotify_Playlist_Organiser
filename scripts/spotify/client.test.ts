import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CALLBACK, equal, pageUrl, playlist, SCOPES, SpotifySession } from './client.ts';
const clientId = 'a'.repeat(32);
const id = 'a'.repeat(22);
const item = (key = id) => ({ id: key, name: '<img src=x>', owner: { display_name: 'Invented owner' }, external_urls: { spotify: `https://open.spotify.com/playlist/${key}` }, description: 'discard', images: ['discard'] });
const token = () => ({ access_token: 'synthetic-test-token', token_type: 'Bearer', expires_in: 3600, scope: SCOPES, refresh_token: 'must-not-retain' });
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const page = (items = [item()], offset = 0, total = items.length, next: string | null = null) => ({ items, offset, total, next, limit: 50 });
async function authorise(session: SpotifySession) {
  const url = new URL(session.connect(clientId));
  await session.callback(new URLSearchParams({ state: url.searchParams.get('state')!, code: 'synthetic-code' }));
}
test('PKCE uses S256, fixed callback, exact scopes, no secret; refresh token discarded', async () => {
  let auth: URL;
  const session = new SpotifySession(async (url, init) => {
    assert.equal(url, 'https://accounts.spotify.com/api/token');
    assert.equal(init?.redirect, 'error');
    const body = init?.body as URLSearchParams;
    assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), auth.searchParams.get('code_challenge'));
    assert.equal(body.get('redirect_uri'), CALLBACK);
    assert.equal(body.has('client_secret'), false);
    return response(token());
  });
  auth = new URL(session.connect(clientId));
  assert.equal(auth.searchParams.get('scope'), SCOPES);
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  const params = new URLSearchParams({ state: auth.searchParams.get('state')!, code: 'synthetic' });
  await session.callback(params);
  assert.equal(session.connected, true);
  assert.doesNotMatch(JSON.stringify(session), /synthetic-test-token|must-not-retain/);
  await assert.rejects(session.callback(params), /Invalid/);
  session.disconnect();
});
test('cancelled, mismatched, duplicate and ambiguous callbacks never exchange', async () => {
  let calls = 0;
  const session = new SpotifySession(async () => { calls++; return response(token()); });
  const state = new URL(session.connect(clientId)).searchParams.get('state')!;
  for (const params of [new URLSearchParams({ state: 'wrong', code: 'x' }), new URLSearchParams(`state=${state}&code=x&code=y`), new URLSearchParams({ state, code: 'x', error: 'denied' })]) await assert.rejects(session.callback(params));
  await session.callback(new URLSearchParams({ state, error: 'access_denied' }));
  assert.equal(calls, 0); assert.equal(session.connected, false);
});
test('expired authorisation clears pending state', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const session = new SpotifySession(async () => { assert.fail('No exchange expected'); });
  const state = new URL(session.connect(clientId)).searchParams.get('state')!;
  t.mock.timers.tick(300_001);
  await assert.rejects(session.callback(new URLSearchParams({ state, code: 'x' })));
});
test('scope escalation and malformed token are rejected', async () => {
  for (const data of [{ ...token(), scope: `${SCOPES} playlist-modify-private` }, { ...token(), expires_in: -1 }, { ...token(), access_token: 'bad\nheader' }]) {
    const session = new SpotifySession(async () => response(data)); await authorise(session); assert.equal(session.connected, false);
  }
});
test('multi-page import minimises fields and commits complete catalogue', async () => {
  let reads = 0;
  const session = new SpotifySession(async (url, init) => {
    if (String(url).endsWith('/token')) return response(token());
    assert.equal(init?.redirect, 'error'); assert.equal((init!.headers as Record<string, string>).Authorization, 'Bearer synthetic-test-token');
    reads++;
    return response(reads === 1 ? page([item()], 0, 2, 'https://api.spotify.com/v1/me/playlists?offset=1&limit=50') : page([item('b'.repeat(22))], 1, 2));
  });
  await authorise(session); await session.refresh();
  assert.equal(reads, 2); assert.equal(session.items.length, 2);
  assert.deepEqual(Object.keys(session.items[0]!), ['id', 'name', 'owner', 'url']);
  session.disconnect(); assert.equal(session.items.length, 0);
});
test('partial failure and malformed/looping pagination preserve previous catalogue', async () => {
  let data: unknown = page();
  const session = new SpotifySession(async url => response(String(url).endsWith('/token') ? token() : data));
  await authorise(session); await session.refresh();
  for (const bad of [page([], 0, 1), page([item()], 0, 2, 'https://evil.example/'), page([item()], 0, 2, 'https://api.spotify.com/v1/me/playlists?limit=50&offset=0'), page([item(), item()]), { ...page(), items: [null] }, { ...page(), total: 5001 }]) {
    data = bad; await session.refresh(); assert.equal(session.items.length, 1); assert.doesNotMatch(session.message, /^Complete/);
  }
  session.disconnect();
});
test('pagination and links cannot redirect credentials or navigation', () => {
  for (const url of ['https://evil.example/v1/me/playlists?limit=50&offset=0','https://api.spotify.com/v1/me/playlists?limit=50&offset=0&offset=0','https://user@api.spotify.com/v1/me/playlists?limit=50&offset=0','https://api.spotify.com/v1/me/playlists?limit=50&offset=0#x']) assert.throws(() => pageUrl(url, 0));
  assert.throws(() => playlist({ ...item(), external_urls: { spotify: 'javascript:alert(1)' } }));
  assert.equal(equal('é', 'a'), false);
});
test('401/403 clear metadata and access; expiry clears without a new request', async t => {
  for (const status of [401, 403]) {
    let fail = false;
    const session = new SpotifySession(async url => String(url).endsWith('/token') ? response(token()) : response(page(), fail ? status : 200));
    await authorise(session); await session.refresh(); fail = true; await session.refresh();
    assert.equal(session.connected, false); assert.equal(session.items.length, 0);
  }
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const session = new SpotifySession(async () => response(token())); await authorise(session);
  t.mock.timers.tick(3_600_001); assert.equal(session.connected, false);
});
test('429 honours Retry-After, makes no automatic retry; quota stops reconnection', async () => {
  for (const quota of [false, true]) {
    let calls = 0;
    const session = new SpotifySession(async url => { calls++; return String(url).endsWith('/token') ? response(token()) : response({ error: quota ? 'QUOTA_EXCEEDED' : 'limited' }, 429, { 'retry-after': '120' }); });
    await authorise(session); await session.refresh();
    await assert.rejects(session.refresh(), /cooldown/); session.disconnect(); assert.throws(() => session.connect(clientId), /cooldown/); assert.equal(calls, 2);
  }
});
test('disconnect during exchange prevents late token resurrection', async () => {
  let release!: (value: Response) => void;
  const session = new SpotifySession(() => new Promise(resolve => { release = resolve; }));
  const pending = authorise(session); session.disconnect(); release(response(token())); await pending;
  assert.equal(session.connected, false);
});
test('disconnect during import prevents late metadata resurrection', async () => {
  let release!: (value: Response) => void;
  const session = new SpotifySession(url => String(url).endsWith('/token') ? Promise.resolve(response(token())) : new Promise(resolve => { release = resolve; }));
  await authorise(session); const pending = session.refresh(); session.disconnect(); release(response(page())); await pending;
  assert.equal(session.items.length, 0);
});
test('network errors and oversized responses never expose raw data', async () => {
  for (const fetcher of [async () => { throw new Error('private-upstream-data'); }, async () => new Response('x'.repeat(1_000_001))]) {
    const session = new SpotifySession(fetcher); await authorise(session); assert.equal(session.connected, false); assert.doesNotMatch(session.message, /private-upstream-data|xxxx/);
  }
});
test('a later page failure preserves the last complete import', async () => {
  let phase = 0;
  const session = new SpotifySession(async url => {
    if (String(url).endsWith('/token')) return response(token());
    if (phase === 0) return response(page());
    if (String(url).endsWith('offset=0')) return response(page([item('b'.repeat(22))], 0, 2, 'https://api.spotify.com/v1/me/playlists?limit=50&offset=1'));
    return response({ error: 'synthetic upstream failure' }, 503);
  });
  await authorise(session); await session.refresh(); phase = 1; await session.refresh();
  assert.equal(session.items[0]!.id, id); assert.equal(session.items.length, 1);
  session.connect(clientId); assert.equal(session.items.length, 0); assert.equal(session.connected, false); session.disconnect();
});
test('request timeout is sanitised and cannot establish a session', async () => {
  const session = new SpotifySession(async (_url, init) => {
    assert.ok(init?.signal);
    throw new DOMException('synthetic timeout', 'TimeoutError');
  });
  await authorise(session); assert.equal(session.connected, false); assert.match(session.message, /timed out/);
});
test('OAuth extension fields are ignored, never forwarded or used as destinations', async () => {
  let exchanges = 0;
  const session = new SpotifySession(async (url, init) => {
    exchanges++;
    assert.equal(url, 'https://accounts.spotify.com/api/token');
    const body = init!.body as URLSearchParams;
    assert.equal(body.get('redirect_uri'), CALLBACK);
    assert.equal(body.has('extension'), false);
    assert.equal(body.has('scope'), false);
    return response(token());
  });
  const state = new URL(session.connect(clientId)).searchParams.get('state')!;
  await session.callback(new URLSearchParams({ state, code: 'synthetic', extension: 'ignored', redirect_uri: 'https://evil.example', scope: 'playlist-modify-private' }));
  assert.equal(exchanges, 1); assert.equal(session.connected, true); session.disconnect();
});

test('pagination strips extra query fields without forwarding destinations or credentials', () => {
  assert.equal(pageUrl('https://api.spotify.com/v1/me/playlists?limit=50&offset=50&extra=ignored&redirect_uri=https%3A%2F%2Fevil.example', 50), 'https://api.spotify.com/v1/me/playlists?limit=50&offset=50');
});
