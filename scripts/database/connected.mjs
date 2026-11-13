// Invented end-to-end fixture; mounted only into the disposable verification container.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { Pool } from 'pg';
import { executable } from '../runtime/server/executable.js';
import { platformProductionConfig } from '../runtime/server/runtime-config.js';
import { SCOPES } from '../runtime/server/security.js';
assert.equal(process.env.CONNECTED_DISPOSABLE,'synthetic-only');
assert.equal(process.getuid(),1000);assert.equal(process.arch,'x64');
const origin='https://music.example.invalid';
const env={NODE_ENV:'production',PORT:'3000',ORGANISER_ORIGIN:origin,ORGANISER_CALLBACK:origin+'/callback',ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32)};
env.DATABASE_URL='postgres://music_app:invented-local-app-only@db:5432/music';
for(const [purpose,byte] of [['CREDENTIAL','11'],['SNAPSHOT','22']]){env[`ORGANISER_${purpose}_KEYS`]='invented:'+byte.repeat(32);env[`ORGANISER_${purpose}_CURRENT`]='invented';}
const config=platformProductionConfig(env),pools=[];
function pool(c){const p=new Pool({...c,max:4,connectionTimeoutMillis:2000,statement_timeout:5000});p.on('error',()=>{});pools.push(p);return p;}
const runtime=pool(config.databases.runtime);
let mode='ok',identity=config.owner.binding,calls=0,running;
const id='A'.repeat(22);
const transport=async(url,init)=>{
 calls++;assert.equal(init.redirect,'error');
 if(url==='https://accounts.spotify.com/api/token')return Response.json({access_token:'invented-access',refresh_token:'invented-refresh',token_type:'Bearer',expires_in:3600,scope:SCOPES.join(' ')});
 if(url==='https://api.spotify.com/v1/me')return Response.json({account_id:identity});
 assert.match(url,/^https:\/\/api.spotify.com\/v1\/me\/(playlists|albums)\?limit=(50|10)&offset=\d+$/);
 if(mode==='fail')return Response.json({}, {status:500});
 const playlist=url.includes('playlists'),limit=playlist?50:10;
 const item=playlist?{id,name:'Invented playlist',owner:{display_name:'Invented owner'},external_urls:{spotify:`https://open.spotify.com/playlist/${id}`}}:{album:{id,name:'Invented album',artists:[{name:'Invented artist'}],external_urls:{spotify:`https://open.spotify.com/album/${id}`}}};
 return Response.json({offset:0,limit,total:1,items:[item],next:null});
};
function http(path,session,body,headers={}){return new Promise((resolve,reject)=>{
 const req=request({host:'127.0.0.1',port:3000,path,method:body===undefined?'GET':'POST',headers:{Host:'music.example.invalid','X-Forwarded-Proto':'https',Origin:origin,...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf??''}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text,data:()=>JSON.parse(text)}));});req.setTimeout(15000,()=>req.destroy(Error('HTTP timeout')));req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
});}
async function login(old){const begin=await http('/api/login',null,{});assert.equal(begin.status,200);const url=new URL(begin.data().authorizeUrl);assert.equal(url.searchParams.get('scope'),SCOPES.join(' '));const cookie=begin.headers['set-cookie'][0].split(';')[0];const result=await http('/callback?code=invented&state='+url.searchParams.get('state'),null,undefined,{Cookie:cookie+(old?'; '+old.cookie:'')});assert.equal(result.status,303);assert.equal(result.headers.location,'/?connected=1');assert.ok(['HttpOnly','Secure','SameSite=Lax'].every(flag=>result.headers['set-cookie'][0].split('; ').includes(flag)),'Session cookie flags');const session={cookie:result.headers['set-cookie'][0].split(';')[0]};const response=await http('/api/session',session);assert.equal(response.status,200);session.csrf=response.data().csrf;return session;}
async function setupRequest(path,cookie='',body){return new Promise((resolve,reject)=>{
 const req=request({host:'127.0.0.1',port:3000,path,method:body===undefined?'GET':'POST',headers:{Host:'music.example.invalid','X-Forwarded-Proto':'https',Origin:origin,Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/x-www-form-urlencoded'})}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.setTimeout(15000,()=>req.destroy(Error('Setup timeout')));req.on('error',reject);req.end(body===undefined?undefined:new URLSearchParams(body).toString());
});}
async function setupVerification(){
 env.SETUP_MODE='1';env.SETUP_TOKEN='s'.repeat(43);running=await start();
 assert.equal((await http('/health',null,undefined,{Host:'127.0.0.1:3000','X-Forwarded-Proto':''})).status,200);
 assert.equal((await setupRequest('/api/library')).status,403);
 const before=calls;assert.equal((await setupRequest('/callback?state=unknown&code=unknown')).status,403);assert.equal(calls,before);
 const unlock=await setupRequest('/setup/unlock','',{token:env.SETUP_TOKEN});assert.equal(unlock.status,303);
 const cookie=unlock.headers['set-cookie'][0].split(';')[0];assert.ok(unlock.headers['set-cookie'][0].includes('Secure; HttpOnly; SameSite=Lax'));
 const page=await setupRequest('/',cookie);assert.equal(page.status,200);const csrf=/name="csrf" value="([A-Za-z0-9_-]+)"/.exec(page.text)[1];
 assert.equal((await setupRequest('/setup/confirm',cookie,{csrf,confirm:'yes'})).status,403);
 assert.equal((await setupRequest('/setup/begin',cookie,{csrf:'wrong'})).status,403);
 const begin=await setupRequest('/setup/begin',cookie,{csrf});assert.equal(begin.status,303);const url=new URL(begin.headers.location);
 identity='different-owner';assert.equal((await setupRequest('/callback?code=invented&state='+url.searchParams.get('state'),cookie)).status,403);identity=config.owner.binding;
 const again=await setupRequest('/setup/begin',cookie,{csrf});const state=new URL(again.headers.location).searchParams.get('state');
 const verified=await setupRequest('/callback?code=invented&state='+state,cookie);assert.equal(verified.status,303);assert.equal(verified.headers.location,'/');
 const confirm=await setupRequest('/setup/confirm',cookie,{csrf,confirm:'yes'});assert.equal(confirm.status,200);
 assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'1');assert.equal((await runtime.query('SELECT count(*) AS n FROM connections')).rows[0].n,'0');
 assert.equal((await setupRequest('/setup/unlock','',{token:env.SETUP_TOKEN})).status,403);
 await running.close();running=await start(); // Restored setup config must not reopen after restart/rollback.
 assert.equal((await setupRequest('/setup/unlock','',{token:env.SETUP_TOKEN})).status,409);assert.equal((await http('/health')).status,200);
 await running.close();running=undefined;delete env.SETUP_MODE;delete env.SETUP_TOKEN;
 console.log('PASS setup token/session/CSRF/PKCE/exact owner/confirmation; durable closure after restart and setup-config rollback; no stored OAuth grants');
}
async function get(path,s){const r=await http(path,s);assert.equal(r.status,200,r.text);return r.data();}
async function post(path,s,body){const r=await http(path,s,body);assert.equal(r.status,200,r.text);return r.data();}
async function start(){
 const before=pools.length,reports=[],exits=[];let stopped;
 const closed=new Promise(resolve=>{stopped=resolve;});
 const host={on:()=>{},off:()=>{},report:status=>reports.push(status),exit:code=>{exits.push(code);stopped();},deadline:(fn,ms)=>{const timer=setTimeout(fn,ms);return()=>clearTimeout(timer);}};
 const process=executable(env,{dependencies:{pool,transport},host});await process.started;
 assert.deepEqual(reports,['ready'],'Application startup failed');assert.equal(pools.length-before,1);
 return {close:async()=>{process.stop();await closed;assert.deepEqual(exits,[0]);assert.ok(pools.slice(before).every(p=>p.ended));}};
}
try{
 const row=(await runtime.query("SELECT current_database() AS db,current_setting('server_version_num') AS v,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS super")).rows[0];
 assert.equal(row.db,'music');assert.match(row.v,/^16\d{4}$/);assert.equal(row.super,false);
 assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'0');
 await setupVerification(); // App startup itself migrates genuinely fresh storage.
 running=await start();
 const root=await http('/');assert.equal(root.status,200);assert.match(root.text,/name="organiser-mode" content="connected"/);assert.match(root.text,/<title>Music Library Organiser<\/title>/);
 assert.equal((await http('/health',null,undefined,{Host:'127.0.0.1:3000','X-Forwarded-Proto':''})).status,200);
 assert.equal((await http('/',null,undefined,{Host:'wrong.invalid'})).status,403);assert.equal((await http('/api/library')).status,401);
 console.log('PASS single PG16 role/app-owned migrations/guard/startup, connected HTML and HTTP guards');
 let a=await login();mode='fail';assert.equal((await http('/api/refresh',a,{})).status,503);assert.equal((await get('/api/library',a)).library.items.length,0);mode='ok';await post('/api/refresh',a,{});
 let state=await get('/api/library',a);assert.equal(state.library.items.length,2);assert.deepEqual(state.library.items.map(i=>i.kind).sort(),['album','playlist']);
 console.log('PASS OAuth session/callback, failed initial import and successful retry');
 const b=await login(),oldRevision=state.revision;
 const edit={requestId:randomUUID(),revision:oldRevision,edit:{mode:'bulk',itemIds:state.library.items.map(i=>i.id),tagIds:['new-tag'],newTags:[{id:'new-tag',name:'Invented shared tag'}]}};
 await post('/api/edit',a,edit);assert.equal((await http('/api/edit',b,{...edit,requestId:randomUUID()})).status,409);
 state=await get('/api/library',b);assert.equal(state.library.tags.length,1);assert.ok(state.library.annotations.every(x=>x.tagIds.length===1));
 const exported=await get('/api/export',a);mode='fail';assert.equal((await http('/api/refresh',a,{})).status,503);mode='ok';assert.deepEqual(await get('/api/export',a),exported);await post('/api/refresh',a,{});assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 const old=a;a=await login(a);assert.equal((await http('/api/session',old)).status,401);assert.equal((await http('/api/session',b)).status,200);
 console.log('PASS shared playlist/album tags, cross-session conflict, failed refresh preservation and reconnect rotation');
 const preview=await post('/api/restore/preview',a,{...exported,tags:[],annotations:[]});await post('/api/restore/confirm',a,{previewId:preview.id,revision:preview.revision,requestId:randomUUID(),confirm:true});
 const saved=await get('/api/snapshots',a);assert.equal(saved.length,1);const recover=await post('/api/snapshots/preview',a,{id:saved[0].id});await post('/api/restore/confirm',a,{previewId:recover.id,revision:recover.revision,requestId:randomUUID(),confirm:true});assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 await running.close();running=undefined;assert.ok(pools.slice(1).every(p=>p.ended));await assert.rejects(http('/health'));
 running=await start();assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 console.log('PASS replace-only restore, encrypted recoverable snapshot, shutdown and persisted restart');
 await post('/api/signout',b,{});assert.equal((await http('/api/session',b)).status,401);
 // Inject a database failure after tombstone insertion to prove both changes roll back.
 await runtime.query("CREATE FUNCTION reject_test_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'invented failure'; END $$; CREATE TRIGGER reject_test_delete BEFORE DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION reject_test_delete()");
 try {
  assert.ok((await http('/api/disconnect',a,{confirm:true})).status>=400);
  assert.equal((await runtime.query('SELECT count(*) AS n FROM deletion_records')).rows[0].n,'0');
  assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'1');
  assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 } finally { await runtime.query('DROP TRIGGER reject_test_delete ON accounts; DROP FUNCTION reject_test_delete()'); }
 console.log('PASS failed deletion rolls back tombstone and preserves account organisation');
 await post('/api/disconnect',a,{confirm:true});assert.equal((await http('/api/library',a)).status,401);assert.equal((await runtime.query('SELECT count(*) AS n FROM deletion_records')).rows[0].n,'1');
 assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'0');
 await running.close();running=undefined;await assert.rejects(start(),/Application startup failed/);assert.ok(pools.slice(1).every(p=>p.ended));
 {env.SETUP_MODE='1';env.SETUP_TOKEN='s'.repeat(43);running=await start();assert.equal((await setupRequest('/setup/unlock','',{token:env.SETUP_TOKEN})).status,409);await running.close();running=undefined;console.log('PASS setup refuses deleted owner even after restored setup configuration');}
 assert.ok(calls>0);console.log('PASS signout, transactional deletion record, deleted owner blocks restart; all startup pools closed');
}finally{if(running)await running.close();await Promise.all(pools.filter(p=>!p.ended).map(p=>p.end()));}
