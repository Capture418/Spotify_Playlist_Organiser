import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import type {Pool,PoolClient} from 'pg';
import {hostedConfig,migrationConfig} from './hosted-config.ts';
import {checkCapacity,capacityPool} from './capacity.ts';
import {JsonCipher} from './lifecycle.ts';
import {AppendJournal} from './append-journal.ts';
import {startHosted} from './hosted.ts';
const env={NODE_ENV:'production',PORT:'3000',DATABASE_URL:'postgres://app:invented@db/music',JOURNAL_DATABASE_URL:'postgres://journal:invented@db/music_journal',ORGANISER_ORIGIN:'https://music.example.invalid',ORGANISER_CALLBACK:'https://music.example.invalid/callback',ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32),ORGANISER_CREDENTIAL_KEYS:'v1:'+'11'.repeat(32),ORGANISER_CREDENTIAL_CURRENT:'v1',ORGANISER_SNAPSHOT_KEYS:'v1:'+'22'.repeat(32),ORGANISER_SNAPSHOT_CURRENT:'v1'};
test('hosted runtime takes only restricted URLs; migration requires four distinct roles',()=>{
 const c=hostedConfig(env);assert.equal(c.journalDatabase.database,'music_journal');assert.equal(c.databases.runtime.ssl,false);
 for(const key of ['MIGRATION_DATABASE_URL','JOURNAL_MIGRATION_DATABASE_URL'])assert.throws(()=>hostedConfig({...env,[key]:'private-url'}));
 assert.throws(()=>migrationConfig(env));
 const m=migrationConfig({...env,MIGRATION_DATABASE_URL:'postgres://owner:invented@db/music',JOURNAL_MIGRATION_DATABASE_URL:'postgres://journal_owner:invented@db/music_journal'});
 assert.equal(m.databases.migration.user,'owner');assert.equal(m.databases.journalMigration.user,'journal_owner');
 assert.throws(()=>migrationConfig({...env,MIGRATION_DATABASE_URL:env.DATABASE_URL,JOURNAL_MIGRATION_DATABASE_URL:env.JOURNAL_DATABASE_URL}));
});
test('journal key is deterministic, purpose-separated and follows retained snapshot versions',()=>{
 const c=hostedConfig(env),j=new JsonCipher(c.journalKeys,'v1','journal'),s=new JsonCipher(c.snapshots.keys,'v1','snapshot');
 assert.notDeepEqual(c.journalKeys.get('v1'),c.snapshots.keys.get('v1'));
 assert.deepEqual(hostedConfig(env).journalKeys,c.journalKeys);
 assert.throws(()=>s.decrypt(j.encrypt({invented:true},'id'),'id'));
 const rotated=hostedConfig({...env,ORGANISER_SNAPSHOT_KEYS:env.ORGANISER_SNAPSHOT_KEYS+',v2:'+'33'.repeat(32),ORGANISER_SNAPSHOT_CURRENT:'v2'});
 assert.deepEqual(rotated.journalKeys.get('v1'),c.journalKeys.get('v1'));
});
test('HTTP requires explicit local entry and exact loopback origin',()=>{
 const local={...env,NODE_ENV:'development',ORGANISER_ORIGIN:'http://127.0.0.1:3000',ORGANISER_CALLBACK:'http://127.0.0.1:3000/callback'};
 assert.equal(hostedConfig(local,true).callback,local.ORGANISER_CALLBACK);assert.throws(()=>hostedConfig(local));
 for(const origin of ['http://localhost:3000','http://192.168.1.2:3000','http://127.0.0.1:4174'])assert.throws(()=>hostedConfig({...local,ORGANISER_ORIGIN:origin,ORGANISER_CALLBACK:origin+'/callback'},true));
});
test('capacity overflow rolls back existing writes and releases the connection',async()=>{
 const calls:string[]=[];
 const client={query:async(sql:string)=>{calls.push(sql);return {rows:[{bytes:1048577,rows:10}]};},release:()=>calls.push('release')};
 const pool=capacityPool({connect:async()=>client} as unknown as Pool);
 await assert.rejects(pool.query('INSERT INTO items VALUES (1)'),/Storage capacity/);
 assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.includes('COMMIT'));assert.equal(calls.at(-1),'release');
 await assert.rejects(checkCapacity({query:async()=>({rows:[{bytes:10,rows:12001}]})} as unknown as PoolClient));
});
test('append journal retries immutable inserts without UPDATE or DELETE',async()=>{
 const c=hostedConfig(env),cipher=new JsonCipher(c.journalKeys,'v1','journal'),calls:string[]=[];
 const record={account:env.ORGANISER_ACCOUNT,operation:'22222222-2222-4222-8222-222222222222',deletedAt:1,state:'intent' as const};
 let stored:unknown;
 const client={query:async(sql:string,args?:unknown[])=>{calls.push(sql);if(sql.startsWith('SELECT payload'))return {rows:stored?[{payload:stored}]:[]};if(sql.startsWith('SELECT count'))return {rows:[{n:0}]};if(sql.startsWith('INSERT INTO public.journal_events'))stored=args![2];return {rows:[]};},release:()=>{}};
 const journal=new AppendJournal({connect:async()=>client} as unknown as Pool,cipher);
 await journal.put(record);await journal.put(record);
 assert.equal(calls.filter(s=>s.startsWith('INSERT')).length,1);assert.ok(!calls.some(s=>/^(UPDATE|DELETE)/.test(s)));
 await assert.rejects(journal.put({...record,deletedAt:2}),/Journal conflict/);
});
test('runtime schema failure closes both pools and never attempts schema mutation or live transport',async()=>{
 const calls:string[]=[],pools:{ended:boolean}[]=[];
 await assert.rejects(startHosted(env,{pool:()=>{const p={ended:false,connect:async()=>{throw Error('Unexpected connection');},query:async(sql:string)=>{calls.push(sql);throw Error('private-details');},end:async()=>{p.ended=true;}};pools.push(p);return p as unknown as Pool;},transport:async()=>{throw Error('Unexpected transport');}}),{message:'Hosted startup failed'});
 assert.equal(pools.length,2);assert.ok(pools.every(p=>p.ended));assert.ok(!calls.some(s=>/CREATE|ALTER|DROP|GRANT/.test(s)));
});
test('migration and maintenance invalid configuration exits redact input',()=>{
 for(const script of ['server/migrate.ts','server/task.ts']){
  const r=spawnSync(process.execPath,[script,'reconcile','bad'],{env:{DATABASE_URL:'private-sensitive-value'},encoding:'utf8',timeout:5000});
  assert.equal(r.status,1);assert.doesNotMatch(r.stdout+r.stderr,/private-sensitive-value|postgres:|stack|Error:/);
 }
});
