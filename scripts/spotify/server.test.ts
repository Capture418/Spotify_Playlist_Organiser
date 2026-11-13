import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHelper, escapeHtml } from './server.ts';
import { ORIGIN, SCOPES, SpotifySession } from './client.ts';
// Exercise the actual HTTP listener without requiring a listening socket in the quality gate.
function harness(session = new SpotifySession(async () => { assert.fail('No upstream call expected'); })) {
  const server = createHelper(session);
  const request = (url = '/', method = 'GET', headers: Record<string, string> = {}, body = '') => new Promise<{ status: number; headers: Record<string, string>; body: string }>(resolve => {
    const req = Object.assign(Readable.from(body ? [Buffer.from(body)] : []), { url, method, headers: { host: '127.0.0.1:4174', ...headers } });
    const result = { status: 200, headers: {} as Record<string, string>, body: '' };
    const res = { statusCode: 200, setHeader: (key: string, value: string) => { result.headers[key.toLowerCase()] = value; }, end: (value: string) => { result.status = res.statusCode; result.body = value; resolve(result); } };
    server.emit('request', req, res);
  });
  return { request, server };
}
test('loopback host, origin and browser session isolate the helper', async () => {
  const { request } = harness();
  assert.equal((await request('/', 'GET', { host: 'evil.example' })).status, 403);
  assert.equal((await request('/', 'GET', { 'sec-fetch-site': 'cross-site' })).status, 403);
  const first = await request();
  assert.equal(first.status, 200); assert.match(first.headers['set-cookie']!, /HttpOnly; SameSite=Lax/);
  assert.equal(first.headers['cache-control'], 'no-store'); assert.equal(first.headers['referrer-policy'], 'same-origin');
  assert.match(first.headers['content-security-policy']!, /frame-ancestors 'none'/);
  assert.equal((await request()).status, 403);
  const cookie = first.headers['set-cookie']!.split(';')[0]!;
  assert.equal((await request('/', 'GET', { cookie })).status, 200);
  assert.equal((await request('/', 'GET', { cookie, origin: 'https://evil.example' })).status, 403);
});
test('POST requires session, exact origin and CSRF; auth URL is fixed', async () => {
  const { request, server } = harness();
  const first = await request();
  const cookie = first.headers['set-cookie']!.split(';')[0]!;
  const csrf = /name="csrf" value="([^"]+)"/.exec(first.body)![1]!;
  const headers = { cookie, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' };
  assert.equal((await request('/connect', 'POST', headers, 'csrf=wrong')).status, 403);
  assert.equal((await request('/disconnect', 'POST', { cookie }, `csrf=${csrf}`)).status, 403);
  const auth = await request('/connect', 'POST', headers, new URLSearchParams({ csrf, client: 'a'.repeat(32) }).toString());
  assert.equal(auth.status, 303); assert.equal(new URL(auth.headers.location!).origin, 'https://accounts.spotify.com');
  const callback = await request('/callback?state=wrong&code=not-a-real-code', 'GET', { cookie });
  assert.equal(callback.headers.location, '/'); assert.doesNotMatch(callback.body, /not-a-real-code/);
  await request('/disconnect', 'POST', headers, `csrf=${csrf}`);
  server.emit('close');
});
test('HTML output escapes all untrusted delimiters', () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'bad\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;');
});
test('OAuth landing permits only bound top-level GET, never bootstrap, fetch, frame or POST', async () => {
  const { request } = harness();
  const navigation = { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' };
  assert.equal((await request('/', 'GET', navigation)).status, 403);
  const first = await request();
  const cookie = first.headers['set-cookie']!.split(';')[0]!;
  const bound = { ...navigation, cookie };
  assert.equal((await request('/', 'GET', bound)).status, 200);
  assert.equal((await request('/', 'GET', { ...bound, cookie: 's03=wrong' })).status, 403);
  assert.equal((await request('/', 'GET', { ...bound, 'sec-fetch-mode': 'cors' })).status, 403);
  assert.equal((await request('/', 'GET', { ...bound, 'sec-fetch-dest': 'iframe' })).status, 403);
  assert.equal((await request('/refresh', 'POST', bound)).status, 403);
  assert.equal((await request('/connect', 'POST', bound)).status, 403);
  assert.equal((await request('/', 'GET', { ...bound, origin: 'https://evil.example' })).status, 403);
});
test('saved-album route has origin/CSRF protection and renders untrusted metadata as text', async () => {
  let calls = 0;
  const session = new SpotifySession(async url => {
    calls++;
    return new Response(JSON.stringify(String(url).endsWith('/token') ? { access_token: 'synthetic', token_type: 'Bearer', expires_in: 3600, scope: SCOPES } : { items: [{ album: { id: 'a'.repeat(22), name: '<script>bad</script>', artists: [{ name: '<img src=x>' }], external_urls: { spotify: `https://open.spotify.com/album/${'a'.repeat(22)}` } } }], total: 1, limit: 10, offset: 0, next: null }));
  });
  const { request, server } = harness(session);
  const first = await request();
  const cookie = first.headers['set-cookie']!.split(';')[0]!;
  const csrf = /name="csrf" value="([^"]+)"/.exec(first.body)![1]!;
  const headers = { cookie, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' };
  const auth = await request('/connect', 'POST', headers, new URLSearchParams({ csrf, client: 'a'.repeat(32) }).toString());
  const state = new URL(auth.headers.location!).searchParams.get('state')!;
  await request(`/callback?state=${state}&code=synthetic`, 'GET', { cookie });
  assert.equal((await request('/albums', 'POST', { ...headers, origin: 'https://evil.example' }, `csrf=${csrf}`)).status, 403);
  assert.equal((await request('/albums', 'POST', headers, 'csrf=wrong')).status, 403);
  assert.equal(calls, 1);
  await request('/albums', 'POST', headers, `csrf=${csrf}`);
  const rendered = await request('/', 'GET', { cookie });
  assert.match(rendered.body, /Saved albums \(1\)/);
  assert.match(rendered.body, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(rendered.body, /&lt;img src=x&gt;/);
  assert.doesNotMatch(rendered.body, /<script>|<img |synthetic/);
  assert.equal(calls, 2); server.emit('close');
});

test('identity POST is bound to browser/origin/CSRF and displays only verified ID privately; shutdown clears it', async () => {
  let calls = 0;
  const session = new SpotifySession(async url => {
    calls++;
    return new Response(JSON.stringify(String(url).endsWith('/token')
      ? { access_token: 'private-token', token_type: 'Bearer', expires_in: 3600, scope: SCOPES }
      : { account_id: 'private-account', display_name: 'private-name', email: 'private-email' }));
  });
  const { request, server } = harness(session);
  const first = await request();
  const cookie = first.headers['set-cookie']!.split(';')[0]!;
  const csrf = /name="csrf" value="([^"]+)"/.exec(first.body)![1]!;
  const headers = { cookie, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' };
  const auth = await request('/connect', 'POST', headers, new URLSearchParams({ csrf, client: 'a'.repeat(32) }).toString());
  const state = new URL(auth.headers.location!).searchParams.get('state')!;
  await request(`/callback?state=${state}&code=fake`, 'GET', { cookie });
  for (const denied of [{ ...headers, cookie:'s03=wrong' }, { ...headers, origin:'https://evil.example' }, { ...headers, 'sec-fetch-site':'cross-site' }]) {
    assert.equal((await request('/identity','POST',denied,`csrf=${csrf}`)).status,403);
  }
  assert.equal((await request('/identity','POST',headers,'csrf=wrong')).status,403);
  assert.equal((await request('/identity','GET',{ cookie })).status,404);
  assert.equal(calls,1);
  await request('/identity','POST',headers,`csrf=${csrf}`);
  const rendered = await request('/','GET',{ cookie });
  assert.match(rendered.body,/Identity verified in this session: yes/);
  assert.match(rendered.body,/id="verified-owner"[^>]*value="private-account"/);
  assert.doesNotMatch(rendered.body,/private-name|private-email|private-token/);
  assert.equal(rendered.headers['cache-control'],'no-store'); assert.equal(calls,2);
  server.emit('close'); assert.equal(session.identityVerified,false);
  assert.doesNotMatch((await request('/', 'GET', { cookie })).body, /private-account|id="verified-owner"/);
});
