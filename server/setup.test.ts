import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Setup } from './setup.ts';
import { SpotifyTransport } from './spotify.ts';
import { SCOPES } from './security.ts';
const token = 'a'.repeat(43), owner = {account:'11111111-1111-4111-8111-111111111111',binding:'invented-owner'};
function fixture() {
  let now = 1000, completed = false, identity = owner.binding, calls = 0, writes = 0;
  const spotify = new SpotifyTransport('a'.repeat(32),'https://music.example.invalid/callback',async url => {
    calls++;
    if (url.endsWith('/api/token')) return Response.json({access_token:'invented-access',refresh_token:'invented-refresh',token_type:'Bearer',expires_in:3600,scope:SCOPES.join(' ')});
    assert.equal(url,'https://api.spotify.com/v1/me'); return Response.json({account_id:identity,display_name:owner.binding,email:owner.binding});
  });
  const store = {available:async () => {if(completed)throw Error('closed');},complete:async () => {if(completed)throw Error('closed');completed=true;writes++;}};
  const setup = new Setup(token,owner,spotify,store,()=>now);
  return {setup,store,spotify,calls:()=>calls,writes:()=>writes,time:(n:number)=>{now+=n;},identity:(s:string)=>{identity=s;}};
}
async function flow(f: ReturnType<typeof fixture>, id:string) {const v=await f.setup.view(id);return new URL(await f.setup.begin(id,v.csrf));}
test('setup needs token, session-bound PKCE, exact identity and explicit confirmation',async()=>{
 const f=fixture();await assert.rejects(f.setup.unlock('wrong'));const id=await f.setup.unlock(token),other=await f.setup.unlock(token),url=await flow(f,id);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 await assert.rejects(f.setup.callback(other,url.searchParams.get('state')!,'invented'));assert.equal(f.calls(),0);
 await f.setup.callback(id,url.searchParams.get('state')!,'invented');const view=await f.setup.view(id);assert.equal(view.verified,true);
 await assert.rejects(f.setup.confirm(id,view.csrf,false));await assert.rejects(f.setup.confirm(id,'wrong',true));
 await f.setup.confirm(id,view.csrf,true);assert.equal(f.writes(),1);await assert.rejects(f.setup.view(other));await assert.rejects(f.setup.unlock(token));
 const restarted=new Setup(token,owner,f.spotify,f.store);await assert.rejects(restarted.unlock(token));
});
test('setup rejects wrong owner despite matching display name/email and consumes callback state',async()=>{
 const f=fixture(),id=await f.setup.unlock(token),url=await flow(f,id);f.identity('different-owner');
 await assert.rejects(f.setup.callback(id,url.searchParams.get('state')!,'invented'));const calls=f.calls();
 await assert.rejects(f.setup.callback(id,url.searchParams.get('state')!,'invented'));assert.equal(f.calls(),calls);
 assert.equal((await f.setup.view(id)).verified,false);assert.equal(f.writes(),0);
});
test('setup expires sessions, cancels denied callbacks and limits global guessing with bounded lockout',async()=>{
 const f=fixture(),id=await f.setup.unlock(token),url=await flow(f,id);f.setup.cancel(id);
 await assert.rejects(f.setup.callback(id,url.searchParams.get('state')!,'invented'));assert.equal(f.calls(),0);
 f.time(300001);await assert.rejects(f.setup.view(id));
 for(let i=0;i<5;i++)await assert.rejects(f.setup.unlock('wrong'));
 await assert.rejects(f.setup.unlock(token),{status:429});f.time(60000);await assert.rejects(f.setup.unlock(token),{status:429});
 f.time(15*60000);assert.ok(await f.setup.unlock(token));
});
test('setup confirmation without OAuth and closed sessions cannot create ownership',async()=>{
 const f=fixture(),id=await f.setup.unlock(token),view=await f.setup.view(id);
 await assert.rejects(f.setup.confirm(id,view.csrf,true));f.setup.close();await assert.rejects(flow(f,id));assert.equal(f.writes(),0);
});
