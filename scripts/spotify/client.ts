import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const ORIGIN = 'http://127.0.0.1:4174';
export const CALLBACK = `${ORIGIN}/callback`;
export const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read';
export type Collection = 'playlists' | 'albums';
const PAGE_SIZE = { playlists: 50, albums: 10 } as const;
export const random = () => randomBytes(32).toString('base64url');
export function equal(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export class Failure extends Error {
  retryAt = 0;
  constructor(message: string, retryAt = 0) { super(message); this.retryAt = retryAt; }
}
function requireValue(ok: unknown, field = 'object'): asserts ok {
  if (!ok) throw new Failure(`Unexpected Spotify response (${field}). No partial import was saved.`);
}
function record(value: unknown): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function label(value: unknown): string {
  requireValue(typeof value === 'string' && value.length <= 1000, 'label');
  return value;
}
export type Playlist = { id: string; name: string; owner: string; url: string };
export function playlist(value: unknown): Playlist {
  const item = record(value);
  requireValue(typeof item.id === 'string' && /^[A-Za-z0-9]{22}$/.test(item.id), 'playlist identity');
  const url = `https://open.spotify.com/playlist/${item.id}`;
  requireValue(record(item.external_urls).spotify === url, 'playlist link');
  const owner = record(item.owner);
  return { id: item.id, name: label(item.name), owner: owner.display_name == null ? 'Spotify user' : label(owner.display_name), url };
}
export type Album = { id: string; name: string; artists: string[]; url: string };
export function album(value: unknown): Album {
  const item = record(record(value).album);
  requireValue(typeof item.id === 'string' && /^[A-Za-z0-9]{22}$/.test(item.id), 'album identity');
  const url = `https://open.spotify.com/album/${item.id}`;
  requireValue(record(item.external_urls).spotify === url, 'album link');
  requireValue(Array.isArray(item.artists) && item.artists.length > 0 && item.artists.length <= 100, 'album artists');
  return { id: item.id, name: label(item.name), artists: item.artists.map(artist => label(record(artist).name)), url };
}
export function pageUrl(value: string, expectedOffset: number, kind: Collection = 'playlists'): string {
  requireValue(kind === 'playlists' || kind === 'albums', 'collection');
  const limit = PAGE_SIZE[kind];
  let url: URL;
  try { url = new URL(value); } catch { throw new Failure('Invalid pagination destination.'); }
  requireValue(url.origin === 'https://api.spotify.com' && !url.username && !url.password && !url.hash && url.pathname === `/v1/me/${kind}`, 'pagination destination');
  // Discard extra server query fields; construct the next URL ourselves below.
  requireValue(url.searchParams.getAll('limit').length === 1 && url.searchParams.getAll('offset').length === 1, 'pagination parameters');
  requireValue(url.searchParams.get('limit') === String(limit) && url.searchParams.get('offset') === String(expectedOffset), 'pagination position');
  return `https://api.spotify.com/v1/me/${kind}?limit=${limit}&offset=${expectedOffset}`;
}

/** No response bodies or underlying errors escape this boundary. Redirects cannot forward credentials. */
async function json(fetcher: typeof fetch, url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (response.body) for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 1_000_000) throw new Failure('Spotify response exceeded the safe size limit.');
      chunks.push(chunk);
    }
    if (response.status === 401 || response.status === 403) throw new Failure('Access denied or revoked. Reconnect after checking app access.');
    if (response.status === 429) {
      const raw = response.headers.get('retry-after');
      const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
      const date = raw ? Date.parse(raw) : NaN;
      const retryAt = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Number.isFinite(date) ? date : Date.now() + 60_000;
      // Treat any quota indication conservatively: no further requests this process.
      const text = Buffer.concat(chunks).toString('utf8');
      const quota = /quota[_ -]?exceeded/i.test(text);
      throw new Failure(quota ? 'Spotify quota exhausted. Stop this session.' : 'Spotify rate limit reached. Wait before retrying.', quota ? Infinity : Math.max(Date.now() + 1000, retryAt));
    }
    if (!response.ok) throw new Failure('Spotify request failed. No partial import was saved.');
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof Failure) throw error;
    throw new Failure('Spotify request failed or timed out. No partial import was saved.');
  }
}

async function readCollection<T extends { id: string }>(fetcher: typeof fetch, token: string, signal: AbortSignal, kind: Collection, map: (value: unknown) => T): Promise<{ items: T[]; pages: number }> {
  const staged: T[] = [];
  const ids = new Set<string>();
  const limit = PAGE_SIZE[kind];
  let next: string | null = `https://api.spotify.com/v1/me/${kind}?limit=${limit}&offset=0`, total: number | undefined, pages = 0;
  while (next) {
    if (++pages > 100) throw new Failure('Import exceeded 100 pages. No partial import was saved.');
    const url = pageUrl(next, staged.length, kind);
    const data = record(await json(fetcher, url, { headers: { Authorization: `Bearer ${token}` } }, signal));
    requireValue(Number.isInteger(data.total) && Number(data.total) >= 0 && Number(data.total) <= limit * 100, 'page total');
    requireValue(data.offset === staged.length, 'page offset');
    requireValue(data.limit === limit, 'page limit');
    if (total === undefined) total = Number(data.total);
    requireValue(data.total === total && Array.isArray(data.items) && data.items.length <= limit, 'page items or changed total');
    for (const raw of data.items) { const item = map(raw); requireValue(!ids.has(item.id), 'duplicate item'); ids.add(item.id); staged.push(item); }
    requireValue(data.next === null || (typeof data.next === 'string' && data.items.length > 0), 'next page');
    next = data.next as string | null;
    requireValue(staged.length <= total && (next !== null || staged.length === total), 'incomplete total');
  }
  return { items: staged, pages };
}

export class SpotifySession {
  #fetch: typeof fetch;
  #clientId = '';
  #pending: { state: string; verifier: string; expires: number } | undefined;
  #token: { value: string; expires: number } | undefined;
  #controller = new AbortController();
  #generation = 0;
  #busy = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #retryAt = 0;
  #items: Playlist[] = [];
  #albums: Album[] = [];
  #accountId: string | undefined;
  message = 'Disconnected. No Spotify data has been read.';
  constructor(fetcher: typeof fetch = fetch) { this.#fetch = fetcher; }
  get items(): readonly Playlist[] { this.#expire(); return this.#items; }
  get albums(): readonly Album[] { this.#expire(); return this.#albums; }
  get identityVerified(): boolean { this.#expire(); return this.#accountId !== undefined; }
  get connected(): boolean { this.#expire(); return Boolean(this.#token); }
  #expire() { if (this.#token && Date.now() >= this.#token.expires) this.disconnect('Session expired. Reconnect to continue.'); }
  disconnect(message = 'Disconnected. Tokens and library cleared from this helper.') {
    this.#generation++;
    this.#controller.abort();
    this.#controller = new AbortController();
    clearTimeout(this.#timer);
    this.#pending = undefined; this.#token = undefined; this.#items = []; this.#albums = []; this.#accountId = undefined; this.#clientId = ''; this.#busy = false;
    this.message = message;
    // Rate/quota cooldown deliberately survives disconnect and reconnect.
  }
  connect(clientId: string): string {
    if (!/^[a-f0-9]{32}$/i.test(clientId)) throw new Failure('Enter a valid public client ID, not a client secret.');
    if (Date.now() < this.#retryAt) throw new Failure('Spotify cooldown is active. Wait before reconnecting.');
    this.disconnect('Awaiting Spotify authorisation.');
    this.#clientId = clientId;
    const verifier = random();
    this.#pending = { state: random(), verifier, expires: Date.now() + 300_000 };
    this.#timer = setTimeout(() => this.disconnect('Authorisation expired. Reconnect.'), 300_000);
    this.#timer.unref();
    const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: CALLBACK, scope: SCOPES,
      state: this.#pending.state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
    return `https://accounts.spotify.com/authorize?${params}`;
  }
  async callback(params: URLSearchParams): Promise<void> {
    const pending = this.#pending;
    const keys = [...params.keys()];
    if (!pending) throw new Failure('Invalid callback: no pending connection. Start again.');
    if (Date.now() >= pending.expires) throw new Failure('Invalid callback: connection expired. Start again.');
    if (!equal(params.get('state') ?? '', pending.state)) throw new Failure('Invalid callback: state mismatch. Start again.');
    // RFC 6749 section 4.1.2: ignore unrecognised response parameters.
    // Only state/code/error are consumed; extras cannot choose an endpoint or scope.
    if (new Set(keys).size !== keys.length) throw new Failure('Invalid callback: duplicate parameters.');
    if (Boolean(params.get('code')) === Boolean(params.get('error'))) throw new Failure('Invalid callback: expected one code or error.');
    clearTimeout(this.#timer);
    this.#pending = undefined; // Consume before any asynchronous work; replay cannot exchange twice.
    if (params.has('error')) { this.disconnect('Spotify authorisation cancelled or denied.'); return; }
    const code = params.get('code')!;
    if (code.length > 4096) throw new Failure('Invalid callback.');
    const generation = this.#generation;
    const signal = this.#controller.signal;
    const started = Date.now();
    this.#busy = true;
    try {
      const data = record(await json(this.#fetch, 'https://accounts.spotify.com/api/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.#clientId, grant_type: 'authorization_code', code, redirect_uri: CALLBACK, code_verifier: pending.verifier }),
      }, signal));
      requireValue(typeof data.access_token === 'string' && /^[\x21-\x7e]{1,8192}$/.test(data.access_token));
      requireValue(data.token_type === 'Bearer' && typeof data.expires_in === 'number' && Number.isInteger(data.expires_in) && data.expires_in > 0 && data.expires_in <= 86400);
      requireValue(typeof data.scope === 'string' && data.scope.split(' ').sort().join(' ') === SCOPES.split(' ').sort().join(' '));
      if (generation !== this.#generation) return;
      this.#token = { value: data.access_token, expires: started + data.expires_in * 1000 };
      this.#timer = setTimeout(() => this.disconnect('Session expired. Reconnect to continue.'), Math.max(0, this.#token.expires - Date.now()));
      this.#timer.unref();
      this.message = 'Connected with the three approved read scopes. Choose playlists or saved albums to read.';
      // refresh_token and all other response fields are never retained.
    } catch (error) { if (generation === this.#generation) this.#failed(error, true); }
    finally { if (generation === this.#generation) this.#busy = false; }
  }
  #failed(error: unknown, clear = false) {
    const failure = error instanceof Failure ? error : new Failure('Request failed.');
    this.#retryAt = Math.max(this.#retryAt, failure.retryAt);
    if (clear || failure.message.startsWith('Access denied')) this.disconnect(failure.message);
    else this.message = failure.message;
  }
  /** Explicit S04b.1 probe; the identifier is never exposed or used as an owner pin. */
  async checkIdentity(): Promise<void> {
    this.#expire();
    if (!this.#token) throw new Failure('Connect before checking identity.');
    if (this.#busy) throw new Failure('A request is already in progress.');
    if (Date.now() < this.#retryAt) throw new Failure('Spotify cooldown is active. No request was sent.');
    const generation = this.#generation, signal = this.#controller.signal, token = this.#token.value;
    this.#busy = true;
    this.#accountId = undefined; // A failed recheck must not leave a stale success result.
    try {
      const data = record(await json(this.#fetch, 'https://api.spotify.com/v1/me', {
        method: 'GET', headers: { Authorization: `Bearer ${token}` },
      }, signal));
      // Treat the identifier as opaque; do not assume playlist-ID length/encoding.
      requireValue(typeof data.account_id === 'string' && data.account_id.length <= 256 &&
        data.account_id.length > 0 && !/\s/u.test(data.account_id) && [...data.account_id].every(char => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127), 'account identity');
      this.#expire();
      if (generation !== this.#generation) return;
      this.#accountId = data.account_id;
      this.message = 'Identity check passed under the existing three scopes. Identifier held only in process memory; no owner pin saved.';
      // No other profile field is retained, rendered or logged.
    } catch (error) { if (generation === this.#generation) this.#failed(error); }
    finally { if (generation === this.#generation) this.#busy = false; }
  }
  async refresh(kind: Collection = 'playlists'): Promise<void> {
    requireValue(kind === 'playlists' || kind === 'albums', 'collection');
    this.#expire();
    if (!this.#token) throw new Failure('Connect before reading library metadata.');
    if (this.#busy) throw new Failure('A request is already in progress.');
    if (Date.now() < this.#retryAt) throw new Failure('Spotify cooldown is active. No request was sent.');
    const generation = this.#generation, signal = this.#controller.signal, token = this.#token.value;
    this.#busy = true;
    try {
      const result = kind === 'albums'
        ? await readCollection(this.#fetch, token, signal, 'albums', album)
        : await readCollection(this.#fetch, token, signal, 'playlists', playlist);
      this.#expire();
      if (generation !== this.#generation) return;
      // The branch chooses both the fixed endpoint and mapper, never upstream data.
      if (kind === 'albums') this.#albums = result.items as Album[];
      else this.#items = result.items as Playlist[];
      this.message = `Complete import: ${result.items.length} ${kind === 'albums' ? 'saved albums' : 'playlists'} across ${result.pages} pages. Compare coverage with Spotify; special collections may be absent.`;
    } catch (error) { if (generation === this.#generation) this.#failed(error); }
    finally { if (generation === this.#generation) this.#busy = false; }
  }
}
