import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpotifyTransport } from './spotify.ts';
import { RefreshRejected, SCOPES } from './security.ts';
const client = 'a'.repeat(32), callback = 'https://example.invalid/callback';
const signal = () => AbortSignal.timeout(1000);
const grant = { access_token: 'fake-access', refresh_token: 'fake-refresh', token_type: 'Bearer', expires_in: 3600, scope: SCOPES.join(' ') };

test('PKCE exchange and refresh use exact fixed requests, and missing rotated refresh token retains previous', async () => {
  const calls: {url:string; init:RequestInit}[] = [];
  const api = new SpotifyTransport(client, callback, async (url, init) => { calls.push({url,init}); return Response.json(calls.length === 1 ? grant : {...grant, refresh_token: undefined}); });
  await api.exchange('invented-code', 'v'.repeat(43), callback, signal());
  const refreshed = await api.refresh('fake-previous', signal());
  assert.equal(refreshed.refreshToken, 'fake-previous');
  assert.equal(calls[0]!.url, 'https://accounts.spotify.com/api/token');
  const body = new URLSearchParams(String(calls[0]!.init.body));
  assert.equal(body.get('code_verifier'), 'v'.repeat(43)); assert.equal(body.get('redirect_uri'), callback);
  assert.equal(body.get('client_id'), client); assert.equal(body.has('client_secret'), false);
  assert.equal(calls[0]!.init.redirect, 'error');
  await assert.rejects(api.exchange('x', 'v'.repeat(43), 'https://evil.invalid/callback', signal()));
  assert.equal(calls.length, 2);
});
test('grant schema and scope changes fail; invalid_grant is distinct from transient or denied requests', async () => {
  for (const changed of [{scope: SCOPES.slice(1).join(' ')}, {scope: SCOPES.join(' ')+' extra'}, {token_type:'Basic'}, {expires_in:0}, {refresh_token:''}, {access_token:'x'.repeat(8193)}]) {
    const api = new SpotifyTransport(client,callback,async()=>Response.json({...grant,...changed}));
    await assert.rejects(api.exchange('fake','v'.repeat(43),callback,signal()));
  }
  for (const status of [400,401,403,500]) {
    const api = new SpotifyTransport(client,callback,async()=>Response.json({error:'invalid_grant',detail:'never expose'}, {status}));
    await assert.rejects(api.refresh('fake',signal()),error=>status===400 ? error instanceof RefreshRejected : error instanceof Error && !(error instanceof RefreshRejected) && !error.message.includes('never expose'));
  }
});
test('identity retains only immutable account_id and refuses malformed or missing identity', async () => {
  const api = new SpotifyTransport(client,callback,async url=>{assert.equal(url,'https://api.spotify.com/v1/me');return Response.json({account_id:'invented-owner',email:'discard',id:'mutable'});});
  assert.equal(await api.identity('fake',signal()),'invented-owner');
  for(const account_id of [undefined,'','bad identity','x'.repeat(257)]) {
    await assert.rejects(new SpotifyTransport(client,callback,async()=>Response.json({account_id})).identity('fake',signal()));
  }
});
test('response limits, malformed JSON, redirects and ignored cancellation cannot escape the transport boundary', async () => {
  for(const response of [new Response('bad json'),new Response('x'.repeat(1000001)),new Response('',{status:302,headers:{Location:'https://evil.invalid'}})]) {
    await assert.rejects(new SpotifyTransport(client,callback,async()=>response).identity('fake',signal()));
  }
  const controller=new AbortController();
  const api=new SpotifyTransport(client,callback,async()=>{controller.abort();return new Promise(()=>{});});
  await assert.rejects(api.identity('fake',controller.signal));
  await assert.rejects(new SpotifyTransport(client,callback,async()=>{throw Error('secret upstream detail');}).identity('fake',signal()),error=>error instanceof Error&&!error.message.includes('secret'));
});
test('429 stops subsequent upstream requests until explicit later retry, without automatic retries', async () => {
  let now=0,calls=0;
  const api=new SpotifyTransport(client,callback,async()=>{calls++;return calls===1?Response.json({}, {status:429,headers:{'Retry-After':'120'}}):Response.json({account_id:'invented'});},()=>now);
  await assert.rejects(api.identity('fake',signal())); await assert.rejects(api.identity('fake',signal())); assert.equal(calls,1);
  now=120001;assert.equal(await api.identity('fake',signal()),'invented');assert.equal(calls,2);
});
test('collection mapping validates destination and drops track/artwork/profile payloads', async () => {
  const id='A'.repeat(22);
  for(const kind of ['playlist','album'] as const) {
    const item=kind==='playlist'?{id,name:'Invented',owner:{display_name:'Invented owner'},external_urls:{spotify:`https://open.spotify.com/playlist/${id}`},tracks:{private:'discard'}}:{album:{id,name:'Invented',artists:[{name:'Invented artist'}],external_urls:{spotify:`https://open.spotify.com/album/${id}`},images:[{url:'https://evil.invalid'}],tracks:{private:'discard'}}};
    const api=new SpotifyTransport(client,callback,async()=>Response.json({offset:0,limit:kind==='playlist'?50:10,total:1,next:null,items:[item]}));
    const page=await api.page(kind,0,'fake',signal());assert.equal(page.items[0]!.id,`${kind}:${id}`);assert.equal(page.items[0]!.source,'spotify');assert.equal(page.items[0]!.artworkUrl,null);assert.doesNotMatch(JSON.stringify(page),/private|images|tracks|evil/);
    const bad=new SpotifyTransport(client,callback,async()=>Response.json({offset:0,limit:kind==='playlist'?50:10,total:2,next:'https://evil.invalid/?offset=1',items:[item]}));
    await assert.rejects(bad.page(kind,0,'fake',signal()));
  }
});
