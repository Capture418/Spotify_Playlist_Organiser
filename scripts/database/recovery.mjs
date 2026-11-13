import assert from 'node:assert/strict';
import { writeFileSync,unlinkSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { config,credentials,root,bin,stop,start } from './local.mjs';
import { prepare,OWNER } from './prepare.mjs';
import { database,migrate,verifySchema } from '../../server/database.ts';
import { SyntheticStore as Store,snapshots,journalCipher } from './support.ts';
import { FileJournal,DeletionCoordinator,reconcileRecovery,approveRecovery } from '../../server/journal.ts';
import { digest } from '../../server/validation.ts';
const evidence=join(root,'.work/s04c2');mkdirSync(evidence,{recursive:true});
await prepare('organiser_test',true);
let admin=database(config('migrator',false,'organiser_test'));let store=new Store(admin,OWNER);const login=await store.issue(OWNER),session=await store.session(login.token);const before=await store.export(session);
const c=new pg.Client(config('migrator',false,'organiser_test'));c.on('error',()=>{});await c.connect();await c.query('BEGIN');await c.query('DELETE FROM tags WHERE account_id=$1',[OWNER]);
await admin.end();await stop(false,true);await c.end().catch(()=>{});await start(false);
admin=database(config('migrator',false,'organiser_test'));store=new Store(admin,OWNER);assert.deepEqual(await store.export(session),before);console.log('PASS: immediate shutdown/restart rolls back uncommitted organisation changes');
const pass=join(root,'.local/recovery-pass');const secrets=credentials();writeFileSync(pass,`127.0.0.1:55432:organiser_test:organiser_migrator:${secrets.migrator}\n127.0.0.1:55433:organiser_recovery:organiser_migrator:${secrets.migrator}\n`,{mode:0o600});
function run(name,args){const r=spawnSync(join(bin,name),args,{env:{PATH:'/usr/bin:/bin',PGPASSFILE:pass},encoding:'utf8',timeout:60000});if(r.status!==0)throw Error(`${name} failed; no credential output`);}
let recovery;
try{
 const backup=join(evidence,'synthetic-recovery.dump');run('pg_dump',['-h','127.0.0.1','-p','55432','-U','organiser_migrator','-d','organiser_test','--no-owner','--no-privileges','-Fc','-f',backup]);
 const journal=new FileJournal(join(evidence,'recovery-journal-'+Date.now()+'.json'),journalCipher);await journal.initialise();
 await new DeletionCoordinator(admin,journal).erase(OWNER,true);
 recovery=database(config('migrator',true,'organiser_recovery'));await recovery.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 run('pg_restore',['-h','127.0.0.1','-p','55433','-U','organiser_migrator','-d','organiser_recovery','--no-owner','--no-privileges','--exit-on-error',backup]);
 const restored=new Store(recovery,OWNER);assert.deepEqual(await restored.export(session),before);console.log('PASS: separate-cluster dump/restore preserves organisation');
 // No server is attached to this isolated cluster. A stale inventory must fail closed.
 await assert.rejects(reconcileRecovery(recovery,journal,'0'.repeat(64),true));await assert.rejects(restored.issue(OWNER));
 const receipt=await reconcileRecovery(recovery,journal,digest(await journal.read()),true);await approveRecovery(recovery,journal,receipt.receipt,true);
 assert.equal((await recovery.query('SELECT 1 FROM accounts WHERE id=$1',[OWNER])).rowCount,0);await assert.rejects(restored.session(login.token));
 assert.equal((await recovery.query('SELECT 1 FROM connections')).rowCount,0);
 console.log('PASS: independent post-backup journal prevents resurrection; stale inventory blocks; restored sessions and credentials invalidated');
 // Rehearse the actual pre-v3 interactive synthetic backup, never overwrite the source database.
 await recovery.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 run('pg_restore',['-h','127.0.0.1','-p','55433','-U','organiser_migrator','-d','organiser_recovery','--no-owner','--no-privileges','--exit-on-error',join(evidence,'before-v3.dump')]);
 const tagsBefore=(await recovery.query('SELECT * FROM tags ORDER BY account_id,tag_id')).rows;
 const annotationsBefore=(await recovery.query('SELECT * FROM assignments ORDER BY account_id,kind,spotify_id,tag_id')).rows;
 const oldSnapshots=(await recovery.query('SELECT * FROM restore_snapshots')).rows;
 await migrate(recovery,3,snapshots);await verifySchema(recovery);
 assert.deepEqual((await recovery.query('SELECT * FROM tags ORDER BY account_id,tag_id')).rows,tagsBefore);
 assert.deepEqual((await recovery.query('SELECT * FROM assignments ORDER BY account_id,kind,spotify_id,tag_id')).rows,annotationsBefore);
 for(const row of oldSnapshots){const current=(await recovery.query('SELECT * FROM restore_snapshots WHERE id=$1',[row.id])).rows[0];assert.deepEqual(snapshots.decrypt(current.payload,`${row.account_id}/${row.id}/${row.revision}`),row.payload);}
 const cleanJournal=new FileJournal(join(evidence,'migration-journal-'+Date.now()+'.json'),journalCipher);await cleanJournal.initialise();
 const verified=await reconcileRecovery(recovery,cleanJournal,digest(await cleanJournal.read()),true);await approveRecovery(recovery,cleanJournal,verified.receipt,true);
 console.log('PASS: actual pre-migration synthetic backup upgrades on separate cluster; organisation and recoverable snapshot contents preserved');

}finally{unlinkSync(pass);await admin.end();if(recovery)await recovery.end();}
