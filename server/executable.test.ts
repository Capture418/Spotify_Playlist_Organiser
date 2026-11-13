import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {executable,processHost} from './executable.ts';
import type {ProcessHost} from './process-preparation.ts';
const env={NODE_ENV:'production',PORT:'3000',DATABASE_URL:'postgres://app:invented@db/music',ORGANISER_ORIGIN:'https://music.example.invalid',ORGANISER_CALLBACK:'https://music.example.invalid/callback',ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32),ORGANISER_CREDENTIAL_KEYS:'v1:'+'11'.repeat(32),ORGANISER_CREDENTIAL_CURRENT:'v1',ORGANISER_SNAPSHOT_KEYS:'v1:'+'22'.repeat(32),ORGANISER_SNAPSHOT_CURRENT:'v1'};
function fixture(){
 const events=new EventEmitter(),reports:string[]=[],exits:number[]=[];
 const host:ProcessHost={on:(s,fn)=>{events.on(s,fn);},off:(s,fn)=>{events.off(s,fn);},report:s=>{reports.push(s);},exit:c=>{exits.push(c);},deadline:()=>()=>{}};
 const dependencies={pool:()=>{throw Error('Unexpected connection');},transport:async()=>{throw Error('Unexpected transport');}};
 return {host,dependencies,reports,exits,events};
}
test('executable refuses default activation and validates before process or resource effects',()=>{
 assert.throws(()=>executable(env),/Production activation requires/);
 const f=fixture();assert.throws(()=>executable({...env,DATABASE_URL:''},f));assert.equal(f.events.eventNames().length,0);
 assert.throws(()=>executable({...env,SETUP_MODE:'1',SETUP_TOKEN:'s'.repeat(43)}),/Production activation requires/);
});
test('executable passes explicit setup and normal dependencies into lifecycle; signals close once',async()=>{
 for(const setup of [false,true]){
  const f=fixture();let closes=0;
  const settings=setup?{...env,SETUP_MODE:'1',SETUP_TOKEN:'s'.repeat(43)}:env;
  const p=executable(settings,{...f,start:async(actual,deps)=>{assert.equal(actual,settings);assert.equal(deps,f.dependencies);return {close:async()=>{closes++;}};}});
  await p.started;assert.deepEqual(f.reports,['ready']);f.events.emit('SIGTERM');f.events.emit('SIGINT');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closes,1);assert.deepEqual(f.exits,[0]);assert.deepEqual(f.reports,['ready','stopped']);assert.equal(f.events.eventNames().length,0);
 }
});
test('executable startup failure is sanitised and cannot report ready',async()=>{
 const f=fixture(),p=executable(env,{...f,start:async()=>{throw Error('invented token and request URL');}});
 await p.started;assert.deepEqual(f.reports,['startup-failed']);assert.deepEqual(f.exits,[1]);assert.equal(f.events.eventNames().length,0);
});
test('process host forwards only fixed status and numeric exit; construction is inert',()=>{
 const events=new EventEmitter(),writes:string[]=[],exits:number[]=[];
 const target=Object.assign(events,{stdout:{write:(s:string)=>{writes.push(s);return true;}},exit:(code:number)=>{exits.push(code);}});
 const host=processHost(target as unknown as Parameters<typeof processHost>[0]);assert.deepEqual(writes,[]);assert.deepEqual(exits,[]);
 const listener=()=>{};host.on('SIGTERM',listener);host.off('SIGTERM',listener);host.report('startup-failed');host.exit(1);
 assert.deepEqual(writes,['Application startup-failed\n']);assert.deepEqual(exits,[1]);assert.equal(events.eventNames().length,0);
});
