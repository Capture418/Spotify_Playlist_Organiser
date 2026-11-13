import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { Store } from './store.ts';
import { appServer } from './http.ts';
const origin='https://music.example.invalid';
function fixture(){
 const store=new Store({} as Pool,'11111111-1111-4111-8111-111111111111');
 const token='t'.repeat(43),csrf='c'.repeat(43);let refreshes=0;
 store.session=async value=>{assert.equal(value,token);return {account:store.owner,hash:'invented',csrf};};
 store.library=async()=>({revision:'0',library:{items:[],tags:[],annotations:[]}});
 const auth={begin:async()=> 'https://accounts.spotify.com/authorize?invented',finish:async()=>({token,csrf}),cancelLogin:()=>{}};
 const options={origin,production:true,connectedInterface:true,auth,refresh:async()=>{refreshes++;}};
 const server=appServer(store,options);
 async function request(url:string,method='GET',body?:unknown,headers:Record<string,string>={}){
  return new Promise<{status:number;body:string;headers:Record<string,unknown>}>(resolve=>{
   let status=200;const output:Record<string,unknown>={};
   const req=Object.assign(Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]),{url,method,headers:{host:'music.example.invalid','x-forwarded-proto':'https',origin,'content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}}) as unknown as IncomingMessage;
   server.emit('request',req,{headersSent:false,setHeader:(k:string,v:unknown)=>{output[k]=v;},writeHead:(n:number,h?:Record<string,unknown>)=>{status=n;Object.assign(output,h);},end:(data:string)=>resolve({status,body:data,headers:output})} as unknown as ServerResponse);
  });
 }
 return {store,options,server,request,token,csrf,getRefreshes:()=>refreshes};
}
test('connected login/callback uses secure cookies and requests first import without putting credentials in URL',async()=>{
 const f=fixture();try{
  const login=await f.request('/api/login','POST',{});assert.equal(login.status,200);assert.match(String(login.headers['Set-Cookie']),/HttpOnly; Secure; SameSite=Lax/);
  const callback=await f.request('/callback?state=invented&code=invented','GET',undefined,{cookie:'__Host-organiser-login='+'b'.repeat(43)});
  assert.equal(callback.status,303);assert.equal(callback.headers.Location,'/?connected=1');
  assert.ok(JSON.stringify(callback.headers['Set-Cookie']).includes('HttpOnly'));assert.ok(!String(callback.headers.Location).includes(f.token));
  const session=await f.request('/api/session','GET',undefined,{cookie:'__Host-organiser='+f.token});assert.deepEqual(JSON.parse(session.body),{csrf:f.csrf});
  assert.equal((await f.request('/api/refresh','POST',{}, {cookie:'__Host-organiser='+f.token})).status,403);
  assert.equal((await f.request('/api/refresh','POST',{}, {cookie:'__Host-organiser='+f.token,'x-csrf-token':f.csrf})).status,200);assert.equal(f.getRefreshes(),1);
  assert.equal((await f.request('/api/library','GET')).status,401);
  assert.equal((await f.request('/api/synthetic-login','POST',{})).status,401);
  assert.equal((await f.request('/api/library','GET',undefined,{host:'outside.invalid'})).status,403);
 }finally{f.server.removeAllListeners();}
});
test('connected interface cannot be combined with synthetic login, harness or missing production auth',()=>{
 const f=fixture();f.server.removeAllListeners();
 for(const override of [{production:false},{auth:undefined},{harness:true},{syntheticLogin:async()=>({token:f.token,csrf:f.csrf})}]) assert.throws(()=>appServer(f.store,{...f.options,...override}),/Connected interface requires/);
});
