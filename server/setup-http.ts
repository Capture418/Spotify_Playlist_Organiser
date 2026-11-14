import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { databaseHealth } from './health.ts';
import { Fault } from './validation.ts';
import type { Setup } from './setup.ts';
const cookie = (id: string) => `__Host-setup=${id}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${id ? 300 : 0}`;
async function form(req: IncomingMessage, fields: string[]) {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') throw new Fault(422, 'Form required');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { size += chunk.length; if (size > 4096) throw new Fault(413, 'Form too large'); chunks.push(chunk); }
  const data = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  if ([...data.keys()].some(k => !fields.includes(k)) || fields.some(k => data.getAll(k).length !== 1)) throw new Fault(422, 'Invalid form');
  return data;
}
const page = (body: string) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MuLO setup</title></head><body><main><h1>MuLO setup</h1>'+body+'</main></body></html>';
export function setupServer(setup: Setup, canonical: string, health: () => Promise<unknown>, local = false) {
  if(local&&canonical!=='http://127.0.0.1:3000')throw Error('Invalid local setup');
  const cookieName=local?'setup-local':'__Host-setup';
  const sessionCookie=(id:string)=>local?`setup-local=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${id?300:0}`:cookie(id);
  const origin = new URL(canonical);
  if ((!local && origin.protocol !== 'https:') || origin.origin !== canonical) throw Error('Setup HTTPS origin required');
  let requests = 0, until = 0;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      if (req.url === '/health' && req.method === 'GET') {
        const status = await databaseHealth(health); res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify({status: status === 200 ? 'ok' : 'unavailable'})); return;
      }
      if (req.headers.host !== origin.host || !local && (req.headers['x-forwarded-proto'] !== 'https' || (req.rawHeaders ?? []).filter((v,i) => i % 2 === 0 && v.toLowerCase() === 'x-forwarded-proto').length > 1)) throw new Fault(403, 'Request rejected');
      if (Date.now() >= until) { requests = 0; until = Date.now()+60000; }
      if (++requests > 120) throw new Fault(429, 'Try later');
      const url = new URL(req.url ?? '/', origin);
      if (url.origin !== origin.origin || (url.pathname !== '/callback' && url.search)) throw new Fault(403, 'Request rejected');
      const matches = (req.headers.cookie ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(cookieName+'='));
      const id = matches.length === 1 ? matches[0]!.slice(cookieName.length+1) : '';
      const redirect = (to: string) => { res.writeHead(303, {Location: to}); res.end(); };
      // Native form POSTs become Origin:null under no-referrer (including Safari).
      // Form pages expose only their origin; callback/error responses retain no-referrer.
      const html = (body: string) => { res.setHeader('Referrer-Policy', 'origin'); res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(page(body)); };
      if (url.pathname === '/callback' && req.method === 'GET') {
        const q = url.searchParams;
        if ([...q.keys()].some(k => !['code','state'].includes(k)) || ['code','state'].some(k => q.getAll(k).length !== 1)) { setup.cancel(id); throw new Fault(403, 'Authorisation rejected'); }
        await setup.callback(id, q.get('state')!, q.get('code')!); redirect('/'); return;
      }
      if (req.method === 'GET' && url.pathname === '/') {
        if (!id) { html('<form method="post" action="/setup/unlock"><label>Setup token <input name="token" type="password" required autocomplete="off" maxlength="128"></label><button>Unlock setup</button></form>'); return; }
        const view = await setup.view(id);
        // CSRF is generated base64url, never untrusted markup or a credential.
        html(view.verified ? `<p>Configured owner verified. Confirm to create the owner account once.</p><form method="post" action="/setup/confirm"><input type="hidden" name="csrf" value="${view.csrf}"><label><input type="checkbox" name="confirm" value="yes" required>Confirm owner setup</label><button>Complete setup</button></form>` : `<p>Verify the configured Spotify owner. No library will be imported during setup.</p><form method="post" action="/setup/begin"><input type="hidden" name="csrf" value="${view.csrf}"><button>Verify with Spotify</button></form>`); return;
      }
      if (req.method !== 'POST' || req.headers.origin !== canonical || req.headers['sec-fetch-site'] === 'cross-site') throw new Fault(403, 'Request rejected');
      if (url.pathname === '/setup/unlock') { const data = await form(req, ['token']); const session = await setup.unlock(data.get('token')!); res.setHeader('Set-Cookie', sessionCookie(session)); redirect('/'); return; }
      if (url.pathname === '/setup/begin') {
        const data = await form(req, ['csrf']);
        const destination = new URL(await setup.begin(id, data.get('csrf')!));
        if (destination.origin !== 'https://accounts.spotify.com' || destination.pathname !== '/authorize' || destination.username || destination.password || destination.hash) throw new Fault(403, 'Authorisation destination rejected');
        const href = destination.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Keep form-action self: browsers can apply it to a POST's external redirects too.
        // A deliberate link navigation carries only the existing PKCE request, never the POST body.
        html(`<p>Your verification is ready. Continue to Spotify to review access, then return here.</p><a href="${href}" rel="noreferrer" referrerpolicy="no-referrer">Continue to Spotify</a>`); return;
      }
      if (url.pathname === '/setup/confirm') { const data = await form(req, ['csrf','confirm']); await setup.confirm(id, data.get('csrf')!, data.get('confirm') === 'yes'); res.setHeader('Set-Cookie', sessionCookie('')); html('<p>Setup completed and closed. Remove setup mode and token together, then deploy normal mode. If that deployment fails, contact the operator promptly.</p>'); return; }
      throw new Fault(404, 'Not found');
    } catch (error) {
      // Never log request URLs, bodies, headers, exceptions or OAuth responses.
      res.writeHead(error instanceof Fault ? error.status : 503, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Setup request unavailable. Retry safely or contact the operator.');
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.timeout = 15000;
  server.on('close', () => setup.close()); return server;
}
