// Invented end-to-end fixture; mounted only into the disposable verification container.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { Pool } from 'pg';
import { startHosted } from '../runtime/server/hosted.js';
import { hostedConfig } from '../runtime/server/hosted-config.js';
import {capacityPool} from '../runtime/server/capacity.js';
import { SCOPES } from '../runtime/server/security.js';
assert.equal(process.env.CONNECTED_DISPOSABLE,'synthetic-only');
assert.equal(process.getuid(),1000);assert.equal(process.arch,'x64');
const origin='https://music.example.invalid';
const env={NODE_ENV:'production',PORT:'3000',ORGANISER_ORIGIN:origin,ORGANISER_CALLBACK:origin+'/callback',ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32)};
env.DATABASE_URL='postgres://music_app:invented-local-app-only@db:5432/music';
for(const [purpose,byte] of [['CREDENTIAL','11'],['SNAPSHOT','22']]){env[`ORGANISER_${purpose}_KEYS`]='v1:'+byte.repeat(32);env[`ORGANISER_${purpose}_CURRENT`]='v1';}
env.JOURNAL_DATABASE_URL='postgres://music_journal_app:invented-local-journal-app-only@db:5432/music_journal';
const config=hostedConfig(env),pools=[];
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
 const begin=await setupRequest('/setup/begin',cookie,{csrf});assert.equal(begin.status,200);assert.equal(begin.headers.location,undefined);assert.match(begin.headers['content-security-policy'],/form-action 'self';/);const url=new URL(/href="([^"]+)"/.exec(begin.text)[1].replaceAll('&amp;','&'));
 identity='different-owner';assert.equal((await setupRequest('/callback?code=invented&state='+url.searchParams.get('state'),cookie)).status,403);identity=config.owner.binding;
 const again=await setupRequest('/setup/begin',cookie,{csrf});assert.equal(again.status,200);const state=new URL(/href="([^"]+)"/.exec(again.text)[1].replaceAll('&amp;','&')).searchParams.get('state');
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
 const before=pools.length;const started=await startHosted(env,{pool,transport});assert.equal(pools.length-before,2);
 return {close:async()=>{await started.close();assert.ok(pools.slice(before).every(p=>p.ended));}};
}
try{
 const row=(await runtime.query("SELECT current_database() AS db,current_setting('server_version_num') AS v,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS super")).rows[0];
 assert.equal(row.db,'music');assert.match(row.v,/^16\d{4}$/);assert.equal(row.super,false);
 assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'0');
 await setupVerification(); // Host migration has already completed; runtime cannot run DDL.
 const localEnv={...env,NODE_ENV:'development',ORGANISER_ORIGIN:'http://127.0.0.1:3000',ORGANISER_CALLBACK:'http://127.0.0.1:3000/callback'};
 running=await startHosted(localEnv,{pool,transport},true);
 const localHeaders={Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000','X-Forwarded-Proto':''};
 const localBegin=await http('/api/login',null,{},localHeaders);assert.equal(localBegin.status,200);
 const localURL=new URL(localBegin.data().authorizeUrl);assert.equal(localURL.searchParams.get('redirect_uri'),localEnv.ORGANISER_CALLBACK);
 assert.ok(!localBegin.headers['set-cookie'][0].includes('Secure'));
 const localFinish=await http('/callback?code=invented&state='+localURL.searchParams.get('state'),null,undefined,{...localHeaders,Cookie:localBegin.headers['set-cookie'][0].split(';')[0]});assert.equal(localFinish.status,303);
 assert.equal((await http('/api/session',null,undefined,{...localHeaders,Cookie:localFinish.headers['set-cookie'][0].split(';')[0]})).status,200);
 await running.close();running=undefined;
 console.log('PASS explicit local HTTP PKCE callback and session; no proxy bypass in production');
 running=await start();
 const root=await http('/');assert.equal(root.status,200);assert.match(root.text,/name="organiser-mode" content="connected"/);assert.match(root.text,/<title>Music Library Organiser<\/title>/);
 assert.equal((await http('/health',null,undefined,{Host:'127.0.0.1:3000','X-Forwarded-Proto':''})).status,200);
 assert.equal((await http('/',null,undefined,{Host:'wrong.invalid'})).status,403);assert.equal((await http('/api/library')).status,401);
 console.log('PASS restricted PG16 roles/host-run migrations/guard/startup, connected HTML and HTTP guards');
 let a=await login();mode='fail';assert.equal((await http('/api/refresh',a,{})).status,503);assert.equal((await get('/api/library',a)).library.items.length,0);mode='ok';await post('/api/refresh',a,{});
 let state=await get('/api/library',a);assert.equal(state.library.items.length,2);assert.deepEqual(state.library.items.map(i=>i.kind).sort(),['album','playlist']);
 console.log('PASS OAuth session/callback, failed initial import and successful retry');
 const b=await login(),oldRevision=state.revision;
 const edit={requestId:randomUUID(),revision:oldRevision,edit:{mode:'bulk',itemIds:state.library.items.map(i=>i.id),tagIds:['new-tag'],newTags:[{id:'new-tag',name:'Invented shared tag'}]}};
 await post('/api/edit',a,edit);assert.equal((await http('/api/edit',b,{...edit,requestId:randomUUID()})).status,409);
 state=await get('/api/library',b);assert.equal(state.library.tags.length,1);assert.ok(state.library.annotations.every(x=>x.tagIds.length===1));
 const exported=await get('/api/export',a);mode='fail';assert.equal((await http('/api/refresh',a,{})).status,503);mode='ok';assert.deepEqual(await get('/api/export',a),exported);await post('/api/refresh',a,{});assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 const old=a;a=await login(a);assert.equal((await http('/api/session',old)).status,401);assert.equal((await http('/api/session',b)).status,200);
 await assert.rejects(capacityPool(runtime).query("UPDATE metadata_cache SET payload=jsonb_build_object('oversized',repeat('x',1100000))"),/Storage capacity/);
 assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 console.log('PASS oversized write rolled back without losing organisation');
 console.log('PASS shared playlist/album tags, cross-session conflict, failed refresh preservation and reconnect rotation');
 const preview=await post('/api/restore/preview',a,{...exported,tags:[],annotations:[]});await post('/api/restore/confirm',a,{previewId:preview.id,revision:preview.revision,requestId:randomUUID(),confirm:true});
 const saved=await get('/api/snapshots',a);assert.equal(saved.length,1);const recover=await post('/api/snapshots/preview',a,{id:saved[0].id});await post('/api/restore/confirm',a,{previewId:recover.id,revision:recover.revision,requestId:randomUUID(),confirm:true});assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 await running.close();running=undefined;assert.ok(pools.slice(1).every(p=>p.ended));await assert.rejects(http('/health'));
 running=await start();assert.deepEqual((await get('/api/export',a)).annotations,exported.annotations);
 console.log('PASS replace-only restore, encrypted recoverable snapshot, shutdown and persisted restart');
 await post('/api/signout',b,{});assert.equal((await http('/api/session',b)).status,401);
 // Both runtime roles lack DDL; journal can only append.
 await assert.rejects(runtime.query('CREATE TABLE forbidden(id int)'),/permission denied/);
 const jp=pool(config.journalDatabase);
 for(const sql of ['CREATE TABLE forbidden(id int)','UPDATE journal_identity SET id=id','DELETE FROM journal_events'])await assert.rejects(jp.query(sql),/permission denied/);
 await jp.end();
 for(const [source,database] of [[config.databases.runtime,'music_journal'],[config.journalDatabase,'music']]){const other=pool({...source,database});try{await assert.rejects(other.query('SELECT 1'),/permission denied/);}finally{await other.end();}}
 console.log('PASS runtime DDL and cross-database connections denied; journal UPDATE and DELETE denied');
 await post('/api/disconnect',a,{confirm:true});assert.equal((await http('/api/library',a)).status,401);assert.equal((await runtime.query('SELECT count(*) AS n FROM deletion_records')).rows[0].n,'1');
 assert.equal((await runtime.query('SELECT count(*) AS n FROM accounts')).rows[0].n,'0');
 await running.close();running=undefined;await assert.rejects(start(),/Hosted startup failed/);assert.ok(pools.slice(1).every(p=>p.ended));
 {env.SETUP_MODE='1';env.SETUP_TOKEN='s'.repeat(43);running=await start();assert.equal((await setupRequest('/setup/unlock','',{token:env.SETUP_TOKEN})).status,409);await running.close();running=undefined;console.log('PASS setup refuses deleted owner even after restored setup configuration');}
 assert.ok(calls>0);console.log('PASS signout, independent append-only deletion record, deleted owner blocks restart; all startup pools closed');
}finally{if(running)await running.close();await Promise.all(pools.filter(p=>!p.ended).map(p=>p.end()));}
