import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { setupServer } from './setup-http.ts';
import type { Setup } from './setup.ts';
test('setup HTTP protects forms, suppresses secret errors, isolates routes and exposes only honest health',async()=>{
 let unlocked=0, healthy=true;
 const server=setupServer({unlock:async()=>{unlocked++;return 'i'.repeat(43);},view:async()=>({csrf:'c'.repeat(43),verified:false}),callback:async()=>{throw Error('invented-private-code');},cancel:()=>{},close:()=>{}} as unknown as Setup,'https://music.example.invalid',async()=>{if(!healthy)throw Error('private database');});
 async function request(url:string,method='GET',headers:Record<string,string>={},body=''){
  return new Promise<{status:number;body:string;headers:Record<string,unknown>}>(resolve=>{
   let status=200;const output:Record<string,unknown>={};
   const req=Object.assign(Readable.from([Buffer.from(body)]),{url,method,headers:{host:'music.example.invalid','x-forwarded-proto':'https',...headers},socket:{}}) as unknown as IncomingMessage;
   server.emit('request',req,{setHeader:(k:string,v:unknown)=>{output[k]=v;},writeHead:(n:number,h:Record<string,unknown>)=>{status=n;Object.assign(output,h);},end:(data:string)=>resolve({status,body:data,headers:output})} as unknown as ServerResponse);
  });
 }
 try{
  assert.equal((await request('/health','GET',{host:'127.0.0.1:3000','x-forwarded-proto':''})).status,200);healthy=false;assert.equal((await request('/health')).status,503);
  const root=await request('/');assert.match(root.body,/type="password"/);assert.doesNotMatch(root.body,/Verify with Spotify/);assert.equal(root.headers['Referrer-Policy'],'no-referrer');
  assert.equal((await request('/?token=invented')).status,403);assert.equal((await request('/api/library')).status,403);
  assert.equal((await request('/setup/unlock','POST',{},'token=invented')).status,403);assert.equal(unlocked,0);
  const headers={origin:'https://music.example.invalid','content-type':'application/x-www-form-urlencoded'};
  assert.equal((await request('/setup/unlock','POST',headers,'token=a&token=b')).status,422);
  const ok=await request('/setup/unlock','POST',headers,'token=invented');assert.equal(ok.status,303);assert.match(String(ok.headers['Set-Cookie']),/Secure; HttpOnly; SameSite=Lax/);
  const failed=await request('/callback?state=a&code=invented-private-code');assert.equal(failed.status,503);assert.doesNotMatch(failed.body,/invented-private-code/);
 }finally{server.removeAllListeners();}
});
