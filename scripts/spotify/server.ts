import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { equal, Failure, ORIGIN, random, SpotifySession } from './client.ts';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function page(session: SpotifySession, csrf: string): string {
  const connected = session.connected;
  const form = (action: string, body: string) => `<form method="post" action="/${action}"><input type="hidden" name="csrf" value="${csrf}">${body}</form>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotify read-only feasibility</title>
  <style>body{font:17px system-ui;background:#141719;color:#f2f5f3;max-width:760px;margin:32px auto;padding:0 20px;line-height:1.6;overflow-wrap:anywhere}input,button,a{font:inherit}input:not([type=hidden]){box-sizing:border-box;width:100%;padding:12px}button{min-height:44px;padding:8px 16px;margin:12px 0;cursor:pointer}a{color:#70e6ab}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #70e6ab;outline-offset:4px}li{margin:16px 0}small{display:block}h1{line-height:1.2}</style>
  <main><h1>Spotify read-only feasibility</h1><p>Mac-only S04b.1 helper. Tokens, checked identity and library metadata stay in process memory. No tags, playback or Spotify edits.</p>
  <p role="status">${escapeHtml(session.message)}</p>
  ${connected ? form('refresh', '<button>Read / refresh playlists</button>') + form('albums', '<button>Read / refresh saved albums</button>') + form('identity', '<button>Check account identity</button>') : form('connect', '<label for="client">Public Spotify client ID</label><input id="client" name="client" required pattern="[a-fA-F0-9]{32}" maxlength="32" autocomplete="off" spellcheck="false"><p>Use the dedicated developer app with redirect URI <code>http://127.0.0.1:4174/callback</code>. Never enter a client secret.</p><button>Connect to Spotify</button>')}
  ${form('disconnect', '<button>Disconnect and clear memory</button>')}
  <p>Scopes: <code>playlist-read-private</code>, <code>playlist-read-collaborative</code> and <code>user-library-read</code>. Library-read permits broader saved-content access; collection reads are limited to playlists and saved albums. Check account identity explicitly reads the profile endpoint, retains only its account identifier in memory, and displays only the verified account ID for private configuration. Expiry requires reconnecting. Closing this tab does not stop the helper: use Disconnect, then stop the terminal process. Disconnect does not revoke the grant in your Spotify account.</p>
  <p id="identity-status">Identity verified in this session: ${session.identityVerified ? 'yes' : 'no'}.</p>
  ${session.verifiedAccountId ? `<label for="verified-owner">Verified Spotify account ID — copy privately to APP_ORGANISER_OWNER</label><input id="verified-owner" readonly autocomplete="off" spellcheck="false" value="${escapeHtml(session.verifiedAccountId)}"><p>Keep this out of chat and screenshots. Disconnect after saving the GitHub secret.</p>` : ''}
  <h2>Playlists (${session.items.length})</h2><ul id="playlists">${session.items.map(item => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name || 'Untitled playlist')}</a><small>${escapeHtml(item.owner)}</small></li>`).join('')}</ul>
  <h2>Saved albums (${session.albums.length})</h2><ul id="albums">${session.albums.map(item => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name || 'Untitled album')}</a><small>${escapeHtml(item.artists.join(', '))}</small></li>`).join('')}</ul>
  <p>Links open Spotify with a browser fallback; they do not start playback. Test representative links on your iPhone separately. Reload an old tab to clear any previously rendered text after session expiry.</p></main></html>`;
}
async function formBody(req: IncomingMessage): Promise<URLSearchParams> {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') throw new Failure('Invalid form.');
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) throw new Failure('Form too large.'); chunks.push(chunk); }
  const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  if ([...params.keys()].length !== new Set(params.keys()).size) throw new Failure('Duplicate form fields.');
  return params;
}
export function createHelper(session = new SpotifySession()) {
  let cookie = '', csrf = random();
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', req.url === '/' ? 'same-origin' : 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://accounts.spotify.com; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const reply = (status: number, body: string) => { res.statusCode = status; res.end(body); };
    const redirect = (location: string) => { res.setHeader('Location', location); reply(303, ''); };
    try {
      if (req.headers.host !== new URL(ORIGIN).host || !req.url?.startsWith('/') || req.url.startsWith('//') || req.url.length > 8192) return reply(403, 'Rejected host or URL.');
      const url = new URL(req.url, ORIGIN);
      const callback = req.method === 'GET' && url.pathname === '/callback';
      const cookies = (req.headers.cookie ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith('s03='));
      const boundBrowser = Boolean(cookie) && cookies.length === 1 && equal(cookies[0]!.slice(4), cookie);
      // The redirect after OAuth still has cross-site Fetch Metadata. Permit only
      // its read-only, top-level landing page in the already-bound browser.
      const landing = req.method === 'GET' && req.url === '/' && boundBrowser &&
        req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document';
      if (!callback && !landing && req.headers['sec-fetch-site'] === 'cross-site') return reply(403, 'Cross-site request rejected.');
      if (req.headers.origin && req.headers.origin !== ORIGIN) return reply(403, 'Origin rejected.');
      if (!cookie && req.method === 'GET' && req.url === '/') {
        cookie = random();
        res.setHeader('Set-Cookie', `s03=${cookie}; HttpOnly; SameSite=Lax; Path=/`);
      } else if (cookies.length !== 1 || !equal(cookies[0]!.slice(4), cookie) || !cookie) {
        return reply(403, 'This helper belongs to another browser session. Stop and restart it to change browsers.');
      }
      if (req.method === 'GET' && req.url === '/') return reply(200, page(session, csrf));
      if (callback) {
        try { await session.callback(url.searchParams); }
        catch (error) { session.message = error instanceof Failure ? error.message : 'Callback failed safely. Start again.'; }
        return redirect('/');
      }
      if (req.method !== 'POST' || url.search || !['/connect', '/refresh', '/albums', '/identity', '/disconnect'].includes(url.pathname)) return reply(404, 'Not found.');
      if (req.headers.origin !== ORIGIN) return reply(403, 'Origin required.');
      const data = await formBody(req);
      if (!equal(data.get('csrf') ?? '', csrf) || [...data.keys()].some(k => !['csrf', 'client'].includes(k))) return reply(403, 'Invalid form token.');
      if (url.pathname === '/disconnect') { session.disconnect(); csrf = random(); }
      if (url.pathname === '/connect') return redirect(session.connect(data.get('client') ?? ''));
      if (url.pathname === '/refresh') await session.refresh();
      if (url.pathname === '/albums') await session.refresh('albums');
      if (url.pathname === '/identity') await session.checkIdentity();
      return redirect('/');
    } catch (error) {
      session.message = error instanceof Failure ? error.message : 'Request failed safely.';
      redirect('/');
    }
  };
  const server = createServer((req, res) => { void handler(req, res); });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 30;
  server.on('close', () => session.disconnect());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createHelper();
  server.on('error', () => { console.error('Helper could not start. Check that port 4174 is free.'); process.exitCode = 1; });
  server.listen(4174, '127.0.0.1', () => console.log(`S03 helper: ${ORIGIN} — stop with Ctrl+C. No request logging.`));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { server.close(); server.closeAllConnections(); });
}
