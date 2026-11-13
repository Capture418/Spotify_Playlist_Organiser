import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { JsonCipher } from './lifecycle.ts';
import { initialiseEmptyJournal } from './operator-initialisation.ts';
const cipher = new JsonCipher(new Map([['invented',Buffer.alloc(32,33)]]),'invented','journal');
const confirmed = {firstEver:true,appStopped:true,inventoryVerified:true};
const verify = {app:async()=>{},journal:async()=>{}};
function fixture({blocked=true,existing=0,nonempty='',failInsert=false,failAppCommit=false}={}) {
 const events:string[]=[];let payload:unknown;
 function pool(kind:string) { const client = {query:async(sql:string,values?:unknown[])=>{
  events.push(kind+':'+sql);
  if(kind==='app'&&sql==='COMMIT'&&failAppCommit)throw Error('injected app commit failure');
  if(sql.startsWith('SELECT blocked'))return {rows:[{blocked}]};
  if(sql.includes('count(*)'))return {rows:[{n:sql.includes('deletion_journal')?existing:nonempty&&sql.endsWith(nonempty)?1:0}]};
  if(sql.startsWith('INSERT')){if(failInsert)throw Error('injected');payload=values?.[0];}
  return {rows:[]};
 },release:()=>{events.push(kind+':release');}};return {connect:async()=>client} as unknown as Pool; }
 return {app:pool('app'),journal:pool('journal'),events,payload:()=>payload};
}
test('first-use initialisation inserts encrypted empty journal once and never clears recovery guard',async()=>{
 const f=fixture();await initialiseEmptyJournal(f.app,f.journal,cipher,confirmed,verify);
 assert.deepEqual(cipher.decrypt(f.payload() as Parameters<JsonCipher['decrypt']>[0],'deletions'),[]);
 assert.ok(f.events.includes('journal:COMMIT'));assert.ok(f.events.includes('app:COMMIT'));
 assert.ok(!f.events.some(x=>/UPDATE|DELETE|TRUNCATE|DROP/.test(x)&&!x.includes('FOR UPDATE')));
});
test('initialisation rejects missing attestations, shared pools and wrong purpose before database work',async()=>{
 const f=fixture();for(const key of Object.keys(confirmed))await assert.rejects(initialiseEmptyJournal(f.app,f.journal,cipher,{...confirmed,[key]:false},verify));
 await assert.rejects(initialiseEmptyJournal(f.app,f.app,cipher,confirmed,verify));
 await assert.rejects(initialiseEmptyJournal(f.app,f.journal,new JsonCipher(cipher.keys,cipher.current,'snapshot'),confirmed,verify));assert.deepEqual(f.events,[]);
});
test('existing owner/deletion history/journal or open guard refuses first-use reset',async()=>{
 for(const options of [{blocked:false},{existing:1},{nonempty:'accounts'},{nonempty:'deletion_records'}]){
  const f=fixture(options);await assert.rejects(initialiseEmptyJournal(f.app,f.journal,cipher,confirmed,verify));assert.equal(f.payload(),undefined);assert.ok(f.events.includes('app:ROLLBACK'));
 }
});
test('journal write failure rolls back both transactions and does not claim recovery approval',async()=>{
 const f=fixture({failInsert:true});await assert.rejects(initialiseEmptyJournal(f.app,f.journal,cipher,confirmed,verify));
 assert.ok(f.events.includes('journal:ROLLBACK'));assert.ok(f.events.includes('app:ROLLBACK'));assert.ok(!f.events.includes('app:COMMIT'));
});


test('cross-database partial commit is surfaced rather than resetting the committed journal',async()=>{
 const f=fixture({failAppCommit:true});await assert.rejects(initialiseEmptyJournal(f.app,f.journal,cipher,confirmed,verify));
 assert.ok(f.events.includes('journal:COMMIT'));assert.ok(f.events.includes('app:ROLLBACK'));assert.ok(f.payload());
 assert.equal(f.events.filter(x=>x.startsWith('journal:INSERT')).length,1);
 assert.ok(!f.events.some(x=>/DELETE|TRUNCATE|DROP/.test(x)));
});
