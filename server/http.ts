import { ARTWORK_ORIGINS } from '../src/domain/artwork.ts';
import { pwaAssetType } from './pwa.ts';
import { databaseHealth } from './health.ts';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Store } from './store.ts';
import type { Session } from './store.ts';
import { Fault,record,uuid } from './validation.ts';
import { cookie,equal } from './security.ts';
type Auth={begin:(browser:string)=>Promise<string>;finish:(browser:string,state:string,code:string,oldToken?:string)=>Promise<{token:string;csrf:string}>;cancelLogin:(browser:string)=>void};
type Options={localOAuth?:boolean;health?:()=>Promise<unknown>;connectedInterface?:boolean;harness?:boolean;auth?:Auth;disconnected?:()=>void;origin:string;production:boolean;syntheticLogin?:()=>Promise<{token:string;csrf:string}>;refresh?:(s:Session)=>Promise<void>};
async function body(req:IncomingMessage){if(req.headers['content-type']!=='application/json')throw new Fault(422,'JSON required');let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024)throw new Fault(422,'Request too large');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Fault(422,'Invalid JSON');}}
export function appServer(store:Store,options:Options){
 if(options.connectedInterface&&(!options.production||!options.auth||options.harness||options.syntheticLogin))throw Error('Connected interface requires production authentication');
 if(options.production&&options.harness)throw Error('Synthetic harness cannot be mounted in production');
 if(options.production&&options.syntheticLogin)throw Error('Synthetic auth cannot be mounted in production');
 const local=options.localOAuth===true;if(local&&(options.origin!=='http://127.0.0.1:3000'||!options.production||!options.auth||options.syntheticLogin||options.harness))throw Error('Invalid local OAuth factory');
 const loginName=local?'organiser-local-login':'__Host-organiser-login';
 const sessionName=local?'organiser-synthetic':'__Host-organiser';
 const secure=local?'':' Secure;';
 const origin=new URL(options.origin);if(options.production&&!local&&(origin.protocol!=='https:'||origin.origin!==options.origin))throw Error('Production HTTPS origin required');if(options.auth&&!options.production)throw Error('OAuth requires production factory');if(!options.production&&(origin.hostname!=='127.0.0.1'||origin.protocol!=='http:'))throw Error('Synthetic server must be loopback');
 const limits=new Map<string,{count:number;until:number}>();
 function rateLimit(key:string,maximum:number){
  const now=Date.now();
  for(const [k,v] of limits)if(v.until<=now)limits.delete(k);
  if(!limits.has(key)&&limits.size>=1000)throw new Fault(429,'Please wait before retrying');
  const rate=limits.get(key)??{count:0,until:now+60000};
  limits.set(key,rate);
  if(++rate.count>maximum)throw new Fault(429,'Please wait before retrying');
 }
 function json(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data: "+ARTWORK_ORIGINS.join(" ")+"; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   // Internal container probes use a loopback Host. Exempt only this fixed,
   // read-only endpoint; all application and OAuth routes retain Host checks.
   if(req.url==='/health'){
    if(req.method!=='GET')throw new Fault(405,'Method rejected');
    const status=await databaseHealth(options.health??(()=>store.pool.query('SELECT 1')));
    json(res,status,{status:status===200?'ok':'unavailable'});return;
   }
   if(req.headers.host!==origin.host)throw new Fault(403,'Host rejected');
   if(options.production&&!local){
    const raw=req.rawHeaders??[];
    const count=raw.filter((value,index)=>index%2===0&&value.toLowerCase()==='x-forwarded-proto').length;
    if(req.headers['x-forwarded-proto']!=='https'||count>1)throw new Fault(403,'HTTPS proxy required');
   }
   const path=new URL(req.url??'/',origin).pathname;
   if(path==='/callback'&&options.auth){
    rateLimit('ip:'+(req.socket.remoteAddress??'unknown'),240);
    if(req.method!=='GET')throw new Fault(405,'Method rejected');
    const cookies=(name:string)=>(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
    const browsers=cookies(loginName);
    if(browsers.length!==1)throw new Fault(403,'Authorisation rejected');
    const browser=browsers[0]!.slice(loginName.length+1);
    const query=new URL(req.url!,origin).searchParams;
    if(!/^[a-zA-Z0-9_-]{43}$/.test(browser)||query.has('error')||query.getAll('state').length!==1||query.getAll('code').length!==1){options.auth.cancelLogin(browser);throw new Fault(403,'Authorisation rejected');}
    const previous=cookies(sessionName);
    const login=await options.auth.finish(browser,query.get('state')!,query.get('code')!,previous.length===1?previous[0]!.slice(sessionName.length+1):undefined);
    res.setHeader('Set-Cookie',[cookie(login.token,!local),`${loginName}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`]);
    res.writeHead(303,{Location:options.connectedInterface?'/?connected=1':'/'});res.end();return;
   }
   if(!path.startsWith('/api/')){
    if(req.method!=='GET')throw new Fault(405,'Method rejected');
    if(options.production&&!options.connectedInterface&&path==='/')throw new Fault(503,'Production interface activation is not approved');
    const publicType=pwaAssetType(path);
    if(publicType){const data=await readFile(new URL('../dist'+path,import.meta.url));res.setHeader('Content-Type',publicType);res.end(data);return;}
    const asset=/^\/assets\/[a-zA-Z0-9_-]+\.(js|css)$/.exec(path);if(path!=='/'&&!asset)throw new Fault(404,'Not found');
    const data=await readFile(new URL('../dist'+(path==='/'?'/index.html':path),import.meta.url));
    res.setHeader('Content-Type',path==='/'?'text/html':path.endsWith('.js')?'text/javascript':'text/css');res.end(path==='/'&&(!options.production||options.connectedInterface)?data.toString().replace('Music Library Organiser — demo library',options.connectedInterface?'Music Library Organiser':'Music Library Organiser — demo library').replace('<head>',`<head><meta name="organiser-mode" content="${options.connectedInterface?'connected':options.harness?'harness':'synthetic'}">`):data);return;
   }
   rateLimit('ip:'+(req.socket.remoteAddress??'unknown'),240);
   if(req.headers['sec-fetch-site']==='cross-site')throw new Fault(403,'Cross-site request rejected');
   const write=req.method==='POST';if(req.method!=='GET'&&!write)throw new Fault(405,'Method rejected');
   if(write&&req.headers.origin!==options.origin)throw new Fault(403,'Origin rejected');
   if(path==='/api/login'&&write&&options.auth){
    record(await body(req),[]);const browser=randomBytes(32).toString('base64url');
    const location=await options.auth.begin(browser);
    res.setHeader('Set-Cookie',`${loginName}=${browser}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=300`);
    json(res,200,{authorizeUrl:location});return;
   }
   if(path==='/api/synthetic-login'&&write&&options.syntheticLogin){const payload=record(await body(req),[]);void payload;const login=await options.syntheticLogin();res.setHeader('Set-Cookie',cookie(login.token,false));json(res,200,{csrf:login.csrf});return;}
   const name=options.production&&!local?'__Host-organiser':'organiser-synthetic';const matches=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));if(matches.length!==1)throw new Fault(401,'Sign in required');const session=await store.session(matches[0]!.slice(name.length+1));
   rateLimit('session:'+session.hash,120);
   if(write&&!equal(String(req.headers['x-csrf-token']??''),session.csrf))throw new Fault(403,'Form verification failed');
   if(path==='/api/session'&&!write){json(res,200,{csrf:session.csrf});return;}
   if(path==='/api/library'&&!write){json(res,200,await store.library(session));return;}
   if(path==='/api/export'&&!write){res.setHeader('Content-Disposition','attachment; filename="music-library-organisation.json"');json(res,200,await store.export(session));return;}
   if(path==='/api/snapshots'&&!write){json(res,200,await store.snapshots(session));return;}
   if(!write)throw new Fault(404,'Not found');const input=await body(req);
   if(path==='/api/test/expire'&&options.harness){record(input,[]);await store.signOut(session,true);json(res,200,{ok:true});return;}
   if(path==='/api/test/snapshot-key'&&options.harness){record(input,[]);store.snapshotsCipher=undefined;json(res,200,{ok:true});return;}
   if(path==='/api/edit'){json(res,200,await store.edit(session,input));return;}
   if(path==='/api/restore/preview'){json(res,200,await store.preview(session,input));return;}
   if(path==='/api/restore/confirm'){json(res,200,await store.restore(session,input));return;}
   if(path==='/api/snapshots/preview'){const r=record(input,['id']);json(res,200,await store.snapshotPreview(session,uuid(r.id)));return;}
   if(path==='/api/refresh'&&options.refresh){record(input,[]);await options.refresh(session);json(res,200,{ok:true});return;}
   if(path==='/api/signout'||path==='/api/signout-all'){record(input,[]);await store.signOut(session,path.endsWith('-all'));res.setHeader('Set-Cookie',cookie('',options.production&&!local)+'; Max-Age=0');json(res,200,{ok:true});return;}
   if(path==='/api/disconnect'){const r=record(input,['confirm']);const deleted=await store.remove(session,r.confirm===true);options.disconnected?.();res.setHeader('Set-Cookie',cookie('',options.production&&!local)+'; Max-Age=0');json(res,200,{ok:true,...(deleted??{deleted:true,reconciled:true})});return;}
   throw new Fault(404,'Not found');
  }catch(error){if(!res.headersSent)json(res,error instanceof Fault?error.status:503,{error:error instanceof Fault?error.message:'Service unavailable. Nothing is confirmed saved; retry safely.'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.timeout=15000;return server;
}
