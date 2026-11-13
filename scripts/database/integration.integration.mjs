import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { spawnSync } from 'node:child_process';
import { prepare, OWNER, SECOND } from './prepare.mjs';
import { config } from './local.mjs';
import { database } from '../../server/database.ts';
import { SyntheticStore as Store } from './support.ts';
import { CredentialStore, SCOPES } from '../../server/security.ts';
import { SpotifyTransport } from '../../server/spotify.ts';
import { preparedApplication, bootstrapOwner, BootstrapPreparation } from '../../server/integration.ts';
const origin='https://organiser.example.invalid',callback=origin+'/callback';
function http(path,method='GET',headers={},body){return new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:4175,path,method,headers:{Host:'organiser.example.invalid',...headers}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);req.end(body);});}
test('prepared production integration composes OAuth, credentials, sessions, import and deletion using invented transport',async t=>{
 await prepare('organiser_test',true);
 const admin=database(config('migrator',false,'organiser_test')),pool=database(config('app',false,'organiser_test'));
 const store=new Store(pool,OWNER),owner={account:OWNER,binding:'invented-owner'},vault=new CredentialStore(pool,new Map([['test',randomBytes(32)]]),'test');
 let identity='invented-owner',mode='ok',calls=0;
 const id='A'.repeat(22);
 const transport=async(url,init)=>{
  calls++;assert.equal(init.redirect,'error');
  if(url==='https://accounts.spotify.com/api/token')return Response.json({access_token:'fake-access',refresh_token:'fake-refresh',token_type:'Bearer',expires_in:3600,scope:SCOPES.join(' ')});
  if(url==='https://api.spotify.com/v1/me')return Response.json({account_id:identity,email:'discard-me'});
  assert.match(url,/^https:\/\/api.spotify.com\/v1\/me\/(playlists|albums)\?limit=(50|10)&offset=\d+$/);
  const playlist=url.includes('/playlists?'),limit=playlist?50:10;
  if(mode==='partial'&&url.endsWith('offset=1'))return Response.json({}, {status:500});
  const item=playlist?{id,name:'Invented remote playlist',owner:{display_name:'Invented owner'},external_urls:{spotify:`https://open.spotify.com/playlist/${id}`}}:{album:{id,name:'Invented remote album',artists:[{name:'Invented artist'}],external_urls:{spotify:`https://open.spotify.com/album/${id}`}}};
  return Response.json({offset:0,limit,total:mode==='partial'?2:1,items:[item],next:mode==='partial'?`https://api.spotify.com/v1/me/${playlist?'playlists':'albums'}?limit=${limit}&offset=1`:null});
 };
 const records=new Map();const journal={read:async()=>[...records.values()],put:async r=>{records.set(r.operation,r);}};
 const spotify=new SpotifyTransport('a'.repeat(32),callback,transport);
 const {server,integration}=await preparedApplication(store,owner,spotify,vault,journal);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4175,'127.0.0.1',resolve);});
 try{
 const old=await store.issue(OWNER);
 let token,csrf;
 await t.test('login route requires origin, callback binds browser/state, and rotates sessions without exposing credentials',async()=>{
  assert.equal((await http('/')).status,503);assert.equal((await http('/api/login','POST',{'Content-Type':'application/json'},'{}')).status,403);
  const begin=await http('/api/login','POST',{Origin:origin,'Content-Type':'application/json'},'{}');assert.equal(begin.status,200);
  const authorize=new URL(JSON.parse(begin.text).authorizeUrl),browserCookie=begin.headers['set-cookie'][0].split(';')[0];assert.match(begin.headers['set-cookie'][0],/Secure; SameSite=Lax/);
  assert.equal(authorize.origin,'https://accounts.spotify.com');assert.equal(authorize.searchParams.get('scope'),SCOPES.join(' '));
  const route='/callback?code=invented-code&state='+authorize.searchParams.get('state');
  assert.equal((await http(route)).status,403);assert.equal(calls,0);
  const response=await http(route,'GET',{Cookie:browserCookie+`; __Host-organiser=${old.token}`,'Sec-Fetch-Site':'cross-site'});assert.equal(response.status,303);assert.equal(response.headers.location,'/');assert.doesNotMatch(response.text,/fake-access|fake-refresh|discard-me/);
  token=response.headers['set-cookie'][0].split(';')[0].split('=')[1];await assert.rejects(store.session(old.token));
  assert.equal((await http(route,'GET',{Cookie:browserCookie})).status,403);
  const session=await http('/api/session','GET',{Cookie:`__Host-organiser=${token}`});csrf=JSON.parse(session.text).csrf;
  assert.equal((await http('/api/synthetic-login','POST',{Origin:origin,'Content-Type':'application/json',Cookie:`__Host-organiser=${token}`,'X-CSRF-Token':csrf},'{}')).status,404);
 });
 await t.test('wrong identity and cancellation consume state and cannot replace the connection',async()=>{
  const before=(await admin.query('SELECT credential,version FROM connections WHERE account_id=$1',[OWNER])).rows;
  const browser=randomBytes(32).toString('base64url'),url=new URL(await integration.begin(browser));identity='foreign';
  await assert.rejects(integration.finish(browser,url.searchParams.get('state'),'fake'));identity=owner.binding;
  assert.deepEqual((await admin.query('SELECT credential,version FROM connections WHERE account_id=$1',[OWNER])).rows,before);
  const cancelled=randomBytes(32).toString('base64url'),requestUrl=new URL(await integration.begin(cancelled));integration.cancelLogin(cancelled);await assert.rejects(integration.finish(cancelled,requestUrl.searchParams.get('state'),'fake'));
 });
 await t.test('credential and session rotation roll back together on injected session failure',async()=>{
  const before=(await admin.query('SELECT credential,version FROM connections WHERE account_id=$1',[OWNER])).rows;
  const browser=randomBytes(32).toString('base64url'),url=new URL(await integration.begin(browser));
  await admin.query("CREATE FUNCTION reject_login() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER reject_login BEFORE INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION reject_login()");
  try{await assert.rejects(integration.finish(browser,url.searchParams.get('state'),'fake',token));}
  finally{await admin.query('DROP TRIGGER reject_login ON sessions; DROP FUNCTION reject_login()');}
  assert.deepEqual((await admin.query('SELECT credential,version FROM connections WHERE account_id=$1',[OWNER])).rows,before);
  await store.session(token);
 });
 await t.test('denied and duplicate OAuth callbacks consume pending authorisation without exchange',async()=>{
  for(const suffix of ['&error=access_denied','&code=duplicate']){
   const begin=await http('/api/login','POST',{Origin:origin,'Content-Type':'application/json'},'{}');
   const authorize=new URL(JSON.parse(begin.text).authorizeUrl),browserCookie=begin.headers['set-cookie'][0].split(';')[0],before=calls;
   const route='/callback?code=fake&state='+authorize.searchParams.get('state');
   assert.equal((await http(route+suffix,'GET',{Cookie:browserCookie})).status,403);
   assert.equal((await http(route,'GET',{Cookie:browserCookie})).status,403);assert.equal(calls,before);
  }
 });
 await t.test('authenticated refresh persists separate typed records and metadata only; partial publication preserves organisation',async()=>{
  const session=await store.session(token),before=await store.export(session);
  const refreshed=await http('/api/refresh','POST',{Origin:origin,'Content-Type':'application/json',Cookie:`__Host-organiser=${token}`,'X-CSRF-Token':csrf},'{}');assert.equal(refreshed.status,200);
  const library=(await store.library(session)).library;
  for(const kind of ['playlist','album']){const item=library.items.find(x=>x.id===`${kind}:${id}`);assert.equal(item.spotifyUrl,`https://open.spotify.com/${kind}/${id}`);assert.equal(item.source,'spotify');}
  assert.deepEqual((await store.export(session)).tags,before.tags);
  const exported=await store.export(session);assert.doesNotMatch(JSON.stringify(exported),/fake-access|fake-refresh|Invented remote|discard-me/);
  mode='partial';await assert.rejects(integration.refresh(session));mode='ok';assert.deepEqual(await store.export(session),exported);
 });
 await t.test('config mismatch and late OAuth completion cannot recreate a deleted owner',async()=>{
  await assert.rejects(preparedApplication(store,{...owner,binding:'wrong'},spotify,vault,journal));
  const browser=randomBytes(32).toString('base64url'),url=new URL(await integration.begin(browser));
  await store.remove(await store.session(token),true);
  await assert.rejects(integration.finish(browser,url.searchParams.get('state'),'fake'));
  assert.equal((await admin.query('SELECT 1 FROM accounts WHERE id=$1',[OWNER])).rowCount,0);
  await assert.rejects(bootstrapOwner(admin,owner,owner.binding,true));
 });
 await t.test('operator bootstrap needs confirmation and exact identity, refuses replacement and is idempotent',async()=>{
  // Only the already-approved disposable test database is cleared.
  await admin.query('DELETE FROM accounts WHERE id=$1',[SECOND]);
  const fresh={account:randomUUID(),binding:'invented-bootstrap'};
  await assert.rejects(bootstrapOwner(admin,fresh,'wrong',true));await assert.rejects(bootstrapOwner(admin,fresh,fresh.binding,false));
  const bootstrap=new BootstrapPreparation(admin,fresh,spotify);
  await assert.rejects(bootstrap.confirm(true));
  const browser=randomBytes(32).toString('base64url'),start=bootstrap.begin(browser);identity=fresh.binding;
  assert.deepEqual(await bootstrap.verify(browser,start.state,'fake'),{verified:true});
  await assert.rejects(bootstrap.confirm(false));await bootstrap.confirm(true);
  await assert.rejects(bootstrap.confirm(true));identity=owner.binding;
  await bootstrapOwner(admin,fresh,fresh.binding,true);
  await assert.rejects(bootstrapOwner(admin,{...fresh,account:randomUUID()},fresh.binding,true));
 });
 await t.test('production executable fails closed even with explicit configuration and activation flags',()=>{
  const result=spawnSync(process.execPath,['server/production.ts'],{encoding:'utf8',env:{...process.env,ORGANISER_ORIGIN:origin,ORGANISER_CALLBACK:callback,ORGANISER_OWNER:'invented',ORGANISER_DATABASE:'invented',ORGANISER_KEY:'a'.repeat(64),ORGANISER_ACTIVATE:'true'}});
  assert.notEqual(result.status,0);assert.match(result.stderr,/separate S04c operational gate/);
 });
 }finally{await new Promise(resolve=>server.close(resolve));await pool.end();await admin.end();}
});
