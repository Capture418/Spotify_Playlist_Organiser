import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorisationLocation } from './connection.ts';
import type { LibraryApi } from './connection.ts';
const origin = 'https://music.example.invalid';
function destination() {
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id:'a'.repeat(32), response_type:'code', redirect_uri:origin+'/callback', scope:'playlist-read-private playlist-read-collaborative user-library-read', state:'s'.repeat(43), code_challenge_method:'S256', code_challenge:'c'.repeat(43) }).toString();
  return url;
}
const response = (authorizeUrl: unknown): LibraryApi => async <T>() => ({ authorizeUrl }) as T;
test('connected sign-in uses server login and only the approved read-only PKCE destination', async () => {
  const calls: unknown[] = [];
  const api: LibraryApi = async <T>(...args: [string,string,unknown?]) => { calls.push(args); return {authorizeUrl:destination().href} as T; };
  assert.equal(await authorisationLocation(api, origin), destination().href);
  assert.deepEqual(calls, [['login','',{}]]);
});
test('connected sign-in rejects redirected credentials, wrong callback, extra scopes and malformed grants', async () => {
  for (const change of [
    (u:URL)=>{u.hostname='outside.invalid';}, (u:URL)=>{u.protocol='http:';},
    (u:URL)=>{u.username='invented';}, (u:URL)=>{u.pathname='/other';}, (u:URL)=>{u.hash='private';},
    (u:URL)=>{u.searchParams.set('redirect_uri','https://outside.invalid/callback');},
    (u:URL)=>{u.searchParams.set('scope','playlist-modify-private');},
    (u:URL)=>{u.searchParams.append('state','duplicate');}, (u:URL)=>{u.searchParams.set('code_challenge_method','plain');},
    (u:URL)=>{u.searchParams.set('access_token','invented');}, (u:URL)=>{u.searchParams.delete('code_challenge');},
  ]) { const url=destination();change(url);await assert.rejects(authorisationLocation(response(url.href),origin)); }
  for (const value of [undefined,42,'not a URL']) await assert.rejects(authorisationLocation(response(value),origin));
  await assert.rejects(authorisationLocation(response(destination().href),'http://127.0.0.1'));
});
