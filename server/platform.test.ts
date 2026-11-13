import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { startPreparedPlatform } from './platform-startup.ts';
import { AtomicDeletion } from './platform-deletion.ts';
import { migrate } from './database.ts';
import { setupStore } from './setup.ts';
import { JsonCipher } from './lifecycle.ts';
const owner = { account: '11111111-1111-4111-8111-111111111111', binding: 'invented-owner' };
const env = { NODE_ENV: 'production', PORT: '3000', DATABASE_URL: 'postgres://app:invented@db/music' };
const cipher = new JsonCipher(new Map([['v1', Buffer.alloc(32, 2)]]), 'v1', 'snapshot');
function fixture(failure = '') {
 const events: string[] = [];
 const action = async (name: string) => { events.push(name); if (failure === name) throw Error('private detail'); };
 const pool = {query: async (sql: string) => { await action(sql); return { rows: [{ blocked: failure === 'blocked' }] }; }, end: () => action('end')} as unknown as Pool;
 const dependencies = {
  pool: () => { events.push('pool'); return pool; },
  migrateApp: async (p: Pool, version?: number, snapshots?: JsonCipher, platform?: boolean) => {assert.equal(p,pool);assert.equal(version,3);assert.equal(snapshots,cipher);assert.equal(platform,true);await action('migrate');},
  verifyApp: async () => action('verify'),
  compose: async () => { await action('compose'); return {listen: async () => action('listen'),close: async () => action('close')}; },
 };
 return {events,dependencies};
}
test('single database startup migrates and verifies before readiness; shutdown is idempotent',async()=>{
 const f=fixture(), running=await startPreparedPlatform(env,cipher,f.dependencies);
 assert.deepEqual(f.events,['pool','migrate','verify','SELECT blocked FROM recovery_guard','compose','SELECT 1','listen']);
 await running.close();await running.close();assert.deepEqual(f.events.slice(-2),['close','end']);
});
test('single database startup fails closed and sanitises failures, never clears a blocked guard',async()=>{
 for(const failure of ['migrate','verify','blocked','compose','SELECT 1','listen']){
  const f=fixture(failure);await assert.rejects(startPreparedPlatform(env,cipher,f.dependencies),/^Error: Startup failed at /);
  assert.equal(f.events.filter(e=>e==='end').length,1);assert.ok(!f.events.some(e=>e.startsWith('UPDATE')));
  if(failure!=='listen')assert.ok(!f.events.includes('listen'));
 }
 const f=fixture();await assert.rejects(startPreparedPlatform({...env,JOURNAL_DATABASE_URL:'unused'},cipher,f.dependencies));assert.deepEqual(f.events,[]);
});
test('single database startup disposes late composition after deadline',async()=>{
 const f=fixture();let finish=()=>{};const original=f.dependencies.compose;
 f.dependencies.compose=async()=>{await new Promise<void>(resolve=>{finish=resolve;});return original();};
 await assert.rejects(startPreparedPlatform(env,cipher,f.dependencies,10),/composition/);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.ok(f.events.includes('close'));assert.ok(!f.events.includes('listen'));
});
function mockPool(query: (sql: string, args?: unknown[]) => Promise<unknown>) {
 const client={query,release:()=>{}};
 return {query,connect:async()=>client} as unknown as Pool;
}
test('atomic deletion commits evidence and cascading removal together; either write failure rolls back',async()=>{
 for(const failure of ['', 'INSERT INTO deletion_records', 'DELETE FROM accounts']){
  const events:string[]=[];
  const pool=mockPool(async(sql,args)=>{
   events.push(sql);
   if(failure&&sql.startsWith(failure))throw Error('injected');
   if(sql.startsWith('SELECT blocked'))return {rows:[{blocked:false}]};
   if(sql.startsWith('SELECT binding'))return {rows:[{binding:owner.binding}]};
   if(sql.startsWith('INSERT INTO deletion_records'))assert.equal(args?.[0],owner.binding);
   return {rows:[]};
  });
  const deletion=new AtomicDeletion(pool,()=>events.push('cancel'));
  if(failure)await assert.rejects(deletion.erase(owner.account,true));else assert.deepEqual(await deletion.erase(owner.account,true),{deleted:true,reconciled:true});
  assert.deepEqual(events.slice(0,2),['cancel','BEGIN']);
  assert.equal(events.at(-1),failure?'ROLLBACK':'COMMIT');
  assert.ok(!events.some(e=>e.startsWith('UPDATE recovery_guard')));
  if(!failure)assert.ok(events.findIndex(e=>e.startsWith('INSERT INTO deletion_records'))<events.findIndex(e=>e.startsWith('DELETE FROM accounts')));
 }
});
test('atomic deletion rejects unconfirmed or blocked operations before writes',async()=>{
 const events:string[]=[];const pool=mockPool(async sql=>{events.push(sql);return {rows:[{blocked:true}]};});
 const deletion=new AtomicDeletion(pool,()=>{});
 await assert.rejects(deletion.erase(owner.account,false));assert.equal(events.length,0);
 await assert.rejects(deletion.erase(owner.account,true));assert.equal(events.at(-1),'ROLLBACK');assert.ok(!events.some(e=>e.startsWith('DELETE')||e.startsWith('INSERT')));
});
test('fresh migration uses existing owning role, preserves canonical checksums and rolls back partial schema',async()=>{
 const events:string[]=[];const checksums:unknown[]=[];
 const pool=mockPool(async(sql,args)=>{events.push(sql);if(sql.startsWith('INSERT INTO schema_migrations'))checksums.push(args?.[1]);return {rows:[],rowCount:0};});
 await migrate(pool,3,cipher,true);
 assert.equal(events.at(-1),'COMMIT');assert.equal(checksums.length,3);assert.ok(checksums.every(c=>typeof c==='string'&&c.length===64));
 assert.ok(!events.some(e=>/TO organiser_app|CREATE ROLE|CREATE DATABASE/.test(e)));
 assert.ok(events.some(e=>e.includes('CREATE TABLE deletion_records')));
 for(const tables of [['accounts'],['schema_migrations']]){
  const calls:string[]=[];const partial=mockPool(async sql=>{calls.push(sql);return {rows:sql.includes('pg_tables')?tables.map(tablename=>({tablename})):[]};});
  await assert.rejects(migrate(partial,3,cipher,true),/Incomplete existing storage/);assert.equal(calls.at(-1),'ROLLBACK');
 }
});
test('single database setup closes on ownership, tombstones, blocked state and a concurrent completion',async()=>{
 for(const mode of ['fresh','owner','deletion','blocked','race']){
  const events:string[]=[];let counts=0;
  const pool=mockPool(async sql=>{events.push(sql);
   if(sql.includes('blocked'))return {rows:[{blocked:mode==='blocked'}]};
   if(sql.includes(' AS n'))return {rows:[{n:mode==='owner'||mode==='deletion'||(mode==='race'&&++counts>1)?1:0}]};
   return {rows:[]};
  });
  const store=setupStore(pool,owner);
  if(mode==='fresh'){await store.complete();assert.equal(events.at(-1),'COMMIT');}
  else {await assert.rejects(store.complete());assert.ok(!events.some(e=>e.startsWith('INSERT INTO accounts')));}
 }
});

test('platform restart preserves applied migrations and rejects missing tables or changed history',async()=>{
 const applied:{version:number;checksum:unknown}[]=[];
 const tables='schema_migrations accounts sessions connections items metadata_cache tags assignments mutation_receipts restore_snapshots restore_previews collection_generations deletion_records recovery_guard'.split(' ');
 await migrate(mockPool(async(sql,args)=>{
  if(sql.startsWith('INSERT INTO schema_migrations'))applied.push({version:args![0] as number,checksum:args![1]});
  return {rows:[],rowCount:0};
 }),3,cipher,true);
 for(const mode of ['restart','missing table','checksum']){
  const events:string[]=[];
  const pool=mockPool(async sql=>{
   events.push(sql);
   if(sql.includes('pg_tables'))return {rows:tables.filter(t=>mode!=='missing table'||t!=='deletion_records').map(tablename=>({tablename}))};
   if(sql.startsWith('SELECT version,checksum'))return {rows:applied.map(r=>mode==='checksum'?{...r,checksum:'changed'}:r)};
   return {rows:[],rowCount:0};
  });
  if(mode==='restart'){await migrate(pool,3,cipher,true);assert.equal(events.at(-1),'COMMIT');}
  else {await assert.rejects(migrate(pool,3,cipher,true));assert.equal(events.at(-1),'ROLLBACK');}
  assert.ok(!events.some(sql=>sql.startsWith('INSERT')||sql.includes('CREATE TABLE accounts')));
 }
});
