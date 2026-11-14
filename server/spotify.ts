import { selectArtwork } from '../src/domain/artwork.ts';
import { album, playlist, pageUrl } from '../scripts/spotify/client.ts';
import type { LibraryItem } from '../src/domain/library.ts';
import type { Page } from './import.ts';
import { bounded, RefreshRejected, SCOPES } from './security.ts';
import { Fault, requireValue, text } from './validation.ts';

export type Transport = (url: string, init: RequestInit) => Promise<Response>;
export type Grant = { accessToken: string; refreshToken: string; scopes: string[]; expiresIn: number };
function object(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'Invalid Spotify response');
  return value as Record<string, unknown>;
}
export function binding(value: unknown): string {
  const id = text(value, 256);
  requireValue(!/\s/u.test(id), 'Invalid account identity');
  return id;
}
/** No default network transport: callers must explicitly supply one. Production entry stays blocked. */
export class SpotifyTransport {
  readonly clientId: string;
  readonly callback: string;
  private readonly send: Transport;
  private readonly now: () => number;
  private retryAt = 0;
  constructor(clientId: string, callback: string, send: Transport, now = Date.now) {
    requireValue(/^[a-zA-Z0-9]{32}$/.test(clientId), 'Client configuration required');
    const url = new URL(callback);
    requireValue((url.protocol === 'https:' || callback === 'http://127.0.0.1:3000/callback') && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/callback');
    this.clientId = clientId; this.callback = callback; this.send = send; this.now = now;
  }
  private async json(url: string, init: RequestInit, signal: AbortSignal, refreshing = false): Promise<Record<string, unknown>> {
    if (this.now() < this.retryAt) throw new Fault(429, 'Spotify cooldown active; retry later');
    const controller = new AbortController();
    const deadline = AbortSignal.any([signal, controller.signal, AbortSignal.timeout(10000)]);
    try {
      return await bounded(deadline, async () => {
        const response = await this.send(url, { ...init, redirect: 'error', signal: deadline });
        if (response.redirected || response.status >= 300 && response.status < 400) throw new Fault(503, 'Spotify redirect rejected');
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = []; let size = 0;
        try {
          if (reader) for (;;) {
            const chunk = await reader.read(); if (chunk.done) break;
            size += chunk.value.length;
            if (size > 1000000) throw new Fault(503, 'Spotify response too large');
            chunks.push(chunk.value);
          }
        } finally { if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); } }
        if (response.status === 429) {
          const raw = response.headers.get('retry-after');
          const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : 60;
          this.retryAt = this.now() + Math.max(1, Number.isFinite(seconds) ? seconds : 60) * 1000;
          throw new Fault(429, 'Spotify cooldown active; retry later');
        }
        let data: Record<string, unknown>;
        try { data = object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { throw new Fault(503, 'Invalid Spotify response'); }
        if (refreshing && response.status === 400 && data.error === 'invalid_grant') throw new RefreshRejected();
        if (!response.ok) throw new Fault(response.status === 401 || response.status === 403 ? 401 : 503, 'Spotify access unavailable; reconnect may be required');
        return data;
      });
    } catch (error) {
      if (error instanceof Fault || error instanceof RefreshRejected) throw error;
      throw new Fault(503, 'Spotify request failed');
    } finally { controller.abort(); }
  }
  private grant(data: Record<string, unknown>, previous?: string): Grant {
    requireValue(data.token_type === 'Bearer' && Number.isSafeInteger(data.expires_in) && Number(data.expires_in) > 0 && Number(data.expires_in) <= 86400, 'Invalid token response');
    const scopes = text(data.scope, 512).split(' ');
    requireValue([...scopes].sort().join(' ') === [...SCOPES].sort().join(' '), 'Unexpected grant');
    return { accessToken: text(data.access_token, 8192), refreshToken: text(data.refresh_token ?? previous, 8192), scopes, expiresIn: Number(data.expires_in) };
  }
  async exchange(code: string, verifier: string, callback: string, signal: AbortSignal): Promise<Grant> {
    requireValue(callback === this.callback && /^[A-Za-z0-9_-]{43}$/.test(verifier));
    return this.grant(await this.json('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: text(code, 2048), code_verifier: verifier, redirect_uri: callback, client_id: this.clientId }).toString(),
    }, signal));
  }
  async refresh(token: string, signal: AbortSignal): Promise<Grant> {
    return this.grant(await this.json('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: text(token, 8192), client_id: this.clientId }).toString(),
    }, signal, true), token);
  }
  async identity(token: string, signal: AbortSignal): Promise<string> {
    const data = await this.json('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${text(token, 8192)}` } }, signal);
    return binding(data.account_id);
  }
  async page(kind: 'playlist' | 'album', offset: number, token: string, signal: AbortSignal): Promise<Page> {
    requireValue(Number.isSafeInteger(offset) && offset >= 0 && offset <= 10000);
    const collection = kind === 'playlist' ? 'playlists' : 'albums', limit = kind === 'playlist' ? 50 : 10;
    const url = pageUrl(`https://api.spotify.com/v1/me/${collection}?limit=${limit}&offset=${offset}`, offset, collection);
    const data = await this.json(url, { headers: { Authorization: `Bearer ${text(token, 8192)}` } }, signal);
    requireValue(data.offset === offset && data.limit === limit && Array.isArray(data.items) && data.items.length <= limit);
    requireValue(Number.isSafeInteger(data.total) && Number(data.total) >= 0 && Number(data.total) <= limit * 100);
    let items: LibraryItem[];
    try {
      items = data.items.map(value => {
        if (kind === 'playlist') {
          const p = playlist(value);
          return { kind, id: `playlist:${p.id}`, title: text(p.name, 512), ownerLabel: text(p.owner || 'Spotify user'), available: true, source: 'spotify', spotifyUrl: p.url, artworkUrl: selectArtwork(object(value).images) };
        }
        const a = album(value);
        return { kind, id: `album:${a.id}`, title: text(a.name, 512), artists: a.artists.map(x => text(x)), available: true, source: 'spotify', spotifyUrl: a.url, artworkUrl: selectArtwork(object(object(value).album).images) };
      });
    } catch { throw new Fault(503, 'Invalid Spotify collection'); }
    let next: number | null = null;
    if (data.next !== null) {
      requireValue(typeof data.next === 'string'); next = offset + items.length;
      try { pageUrl(data.next, next, collection); } catch { throw new Fault(503, 'Invalid Spotify pagination'); }
    }
    return { offset, total: Number(data.total), items, next };
  }
}
