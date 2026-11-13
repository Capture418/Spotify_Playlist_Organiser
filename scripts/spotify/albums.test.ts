import { test } from 'node:test';
import assert from 'node:assert/strict';
import { album, pageUrl, SCOPES, SpotifySession } from './client.ts';
const id = 'a'.repeat(22);
const saved = (key = id) => ({ added_at: '2026-01-01', album: { id: key, name: '<script>title</script>', artists: [{ name: '<img>artist' }], external_urls: { spotify: `https://open.spotify.com/album/${key}` }, images: [{ url: 'https://unused.example/image' }], tracks: { next: 'https://unused.example/tracks', items: [] } } });
const token = (scope = SCOPES) => ({ access_token: 'synthetic', token_type: 'Bearer', expires_in: 3600, scope });
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const page = (items: unknown[] = [saved()], offset = 0, total = items.length, next: string | null = null) => ({ items, offset, total, next, limit: 10 });
const playlistPage = { items: [{ id, name: 'Invented playlist', owner: { display_name: 'Invented owner' }, external_urls: { spotify: `https://open.spotify.com/playlist/${id}` } }], offset: 0, total: 1, next: null, limit: 50 };
async function connect(session: SpotifySession) {
  const state = new URL(session.connect('a'.repeat(32))).searchParams.get('state')!;
  await session.callback(new URLSearchParams({ state, code: 'synthetic' }));
}
test('album mapping retains minimal escaped-at-rendering fields and distinct edition IDs', () => {
  assert.deepEqual(album(saved()), { id, name: '<script>title</script>', artists: ['<img>artist'], url: `https://open.spotify.com/album/${id}` });
  assert.notEqual(album(saved()).id, album(saved('b'.repeat(22))).id);
  for (const raw of [null, { album: null }, { album: { ...saved().album, artists: [] } }, { album: { ...saved().album, external_urls: { spotify: 'https://evil.example' } } }]) assert.throws(() => album(raw));
});
test('saved albums require the exact expanded scopes; old or broader grants fail closed', async () => {
  assert.equal(SCOPES, 'playlist-read-private playlist-read-collaborative user-library-read');
  for (const scope of ['playlist-read-private playlist-read-collaborative', `${SCOPES} user-library-modify`]) {
    const session = new SpotifySession(async () => response(token(scope))); await connect(session);
    assert.equal(session.connected, false); assert.equal(session.albums.length, 0);
  }
});
test('album pagination only targets fixed album endpoint with the smaller page size', () => {
  assert.equal(pageUrl('https://api.spotify.com/v1/me/albums?offset=10&limit=10&extra=discard', 10, 'albums'), 'https://api.spotify.com/v1/me/albums?limit=10&offset=10');
  for (const url of ['https://api.spotify.com/v1/me/playlists?limit=10&offset=10', 'https://api.spotify.com/v1/me/albums?limit=50&offset=10', 'https://api.spotify.com/v1/me/albums?limit=10&offset=0', 'https://evil.example/v1/me/albums?limit=10&offset=10']) assert.throws(() => pageUrl(url, 10, 'albums'));
});
test('multiple album pages import atomically; same ID in playlist is independent', async () => {
  const calls: string[] = [];
  const session = new SpotifySession(async (url, init) => {
    calls.push(String(url)); assert.equal(init?.redirect, 'error');
    if (String(url).endsWith('/token')) return response(token());
    if (String(url).includes('/playlists?')) return response(playlistPage);
    return response(String(url).endsWith('offset=0') ? page([saved()], 0, 2, 'https://api.spotify.com/v1/me/albums?limit=10&offset=1') : page([saved('b'.repeat(22))], 1, 2));
  });
  await connect(session); await session.refresh(); await session.refresh('albums');
  assert.equal(session.items.length, 1); assert.equal(session.albums.length, 2);
  assert.equal(session.items[0]!.id, session.albums[0]!.id);
  assert.equal(session.items[0]!.name, 'Invented playlist');
  assert.match(session.message, /2 saved albums across 2 pages/);
  assert.equal(calls.length, 4); assert.ok(calls.every(url => /^https:\/\/(accounts.spotify.com\/api\/token|api.spotify.com\/v1\/me\/(albums|playlists)\?)/.test(url)));
  session.disconnect(); assert.equal(session.items.length, 0); assert.equal(session.albums.length, 0);
});
test('empty albums are a successful empty result, independently of playlists', async () => {
  const session = new SpotifySession(async url => response(String(url).endsWith('/token') ? token() : String(url).includes('/playlists?') ? playlistPage : page([])));
  await connect(session); await session.refresh(); await session.refresh('albums');
  assert.equal(session.items.length, 1); assert.equal(session.albums.length, 0); assert.match(session.message, /Complete import: 0 saved albums/); session.disconnect();
});
test('malformed, unavailable, duplicate, oversized-total and partial album imports preserve both complete collections', async () => {
  let data: unknown = page();
  const session = new SpotifySession(async url => response(String(url).endsWith('/token') ? token() : String(url).includes('/playlists?') ? playlistPage : data));
  await connect(session); await session.refresh(); await session.refresh('albums');
  for (const bad of [page([null]), page([saved(), saved()]), page([], 0, 1), page([saved()], 0, 1001), page([saved()], 0, 2, 'https://api.spotify.com/v1/me/albums?limit=10&offset=0')]) {
    data = bad; await session.refresh('albums'); assert.equal(session.albums.length, 1); assert.equal(session.items.length, 1); assert.doesNotMatch(session.message, /^Complete/);
  }
  session.disconnect();
});
test('later album-page failure cannot replace a previous complete album import', async () => {
  let phase = 0;
  const session = new SpotifySession(async url => {
    if (String(url).endsWith('/token')) return response(token());
    if (!phase) return response(page());
    return String(url).endsWith('offset=0') ? response(page([saved('b'.repeat(22))], 0, 2, 'https://api.spotify.com/v1/me/albums?limit=10&offset=1')) : response({}, 503);
  });
  await connect(session); await session.refresh('albums'); phase = 1; await session.refresh('albums');
  assert.equal(session.albums[0]!.id, id); assert.doesNotMatch(session.message, /^Complete/); session.disconnect();
});
test('album revocation clears both collections, and cannot become a false empty success', async () => {
  let denied = false;
  const session = new SpotifySession(async url => String(url).endsWith('/token') ? response(token()) : String(url).includes('/playlists?') ? response(playlistPage) : response(page(), denied ? 403 : 200));
  await connect(session); await session.refresh(); await session.refresh('albums'); denied = true; await session.refresh('albums');
  assert.equal(session.connected, false); assert.equal(session.items.length, 0); assert.equal(session.albums.length, 0); assert.match(session.message, /Access denied/);
});
test('album rate limit preserves completed data and prevents further requests during cooldown', async () => {
  let limited = false, calls = 0;
  const session = new SpotifySession(async url => { calls++; return String(url).endsWith('/token') ? response(token()) : response(page(), limited ? 429 : 200, { 'retry-after': '120' }); });
  await connect(session); await session.refresh('albums'); limited = true; await session.refresh('albums');
  assert.equal(session.albums.length, 1); await assert.rejects(session.refresh(), /cooldown/); assert.equal(calls, 3); session.disconnect();
});
test('disconnect and account reconnect prevent late album response resurrection', async () => {
  let release!: (value: Response) => void;
  const session = new SpotifySession(url => String(url).endsWith('/token') ? Promise.resolve(response(token())) : new Promise(resolve => { release = resolve; }));
  await connect(session); const pending = session.refresh('albums'); session.connect('b'.repeat(32)); release(response(page())); await pending;
  assert.equal(session.albums.length, 0); assert.equal(session.connected, false); session.disconnect();
});
test('synthetic ten-album pages with embedded tracks fit existing response bound; tracks are discarded', async () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ ...saved(String(i).padStart(22, 'a')), album: { ...saved(String(i).padStart(22, 'a')).album, tracks: { next: 'https://unused.example/tracks', items: Array.from({ length: 50 }, () => ({ name: 'Invented track', artists: [{ name: 'Invented artist' }], uri: 'spotify:track:synthetic', ignored: 'x'.repeat(1000) })) } } }));
  const payload = page(items);
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) > 500_000);
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 1_000_000);
  const session = new SpotifySession(async url => response(String(url).endsWith('/token') ? token() : payload));
  await connect(session); await session.refresh('albums'); assert.equal(session.albums.length, 10);
  assert.ok(JSON.stringify(session.albums).length < 5000); session.disconnect();
});
test('oversized album responses preserve the previous import; expiry clears albums proactively', async t => {
  let oversized = false;
  const session = new SpotifySession(async url => String(url).endsWith('/token') ? response(token()) : oversized ? new Response('x'.repeat(1_000_001)) : response(page()));
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  await connect(session); await session.refresh('albums'); oversized = true; await session.refresh('albums');
  assert.equal(session.albums.length, 1); assert.match(session.message, /size limit/);
  t.mock.timers.tick(3_600_001); assert.equal(session.albums.length, 0); assert.equal(session.connected, false);
});
