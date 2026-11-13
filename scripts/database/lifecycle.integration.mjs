import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {prepare,OWNER} from './prepare.mjs';
import {config,root} from './local.mjs';
import {SyntheticStore as Store,snapshots,journalCipher} from './support.ts';
import {database,migrate,verifySchema} from '../../server/database.ts';
import {JsonCipher,cleanup,rotateSnapshots,maintenance,DAY} from '../../server/lifecycle.ts';
import {FileJournal,DeletionCoordinator,reconcileRecovery,approveRecovery} from '../../server/journal.ts';
import {digest} from '../../server/validation.ts';
test('approved lifecycle policies on PostgreSQL and an independent encrypted synthetic journal',async t=>{
 await prepare('organiser_test',true);
 const pool=database(config('migrator',false,'organiser_test'));let now=Date.now();const store=new Store(pool,OWNER,()=>now);
 const dir=await mkdtemp(root+'.work/lifecycle-');const journal=new FileJournal(dir+'/journal',journalCipher);await journal.initialise();
 let session=await store.session((await store.issue(OWNER)).token);
 const restore=async()=>{const p=await store.preview(session,await store.export(session));return store.restore(session,{requestId:randomUUID(),revision:p.revision,previewId:p.id,confirm:true});};
 try{
 await t.test('snapshot payload encrypted, context bound, capped at ten and expires exactly at seven days',async()=>{
  let last;for(let i=0;i<12;i++){last=await restore();}assert.equal((await pool.query('SELECT 1 FROM restore_snapshots WHERE id=$1',[last.snapshot])).rowCount,1);
  const rows=await pool.query('SELECT * FROM restore_snapshots WHERE account_id=$1 ORDER BY created_ms',[OWNER]);assert.equal(rows.rowCount,10);
  assert.ok(rows.rows.every(x=>x.encrypted&&!JSON.stringify(x.payload).includes('Evening')));
  const row=rows.rows[0];assert.throws(()=>snapshots.decrypt(row.payload,`${OWNER}/${randomUUID()}/${row.revision}`));
  const before=await store.export(session);now=Number(row.created_ms)+7*DAY;
  // Renew this synthetic session to isolate snapshot expiry from session expiry.
  session=await store.session((await store.issue(OWNER)).token);
  await assert.rejects(store.snapshotPreview(session,row.id));await cleanup(pool,now);
  assert.equal((await pool.query('SELECT 1 FROM restore_snapshots WHERE id=$1',[row.id])).rowCount,0);
  assert.deepEqual((await store.export(session)).tags,before.tags);
 });
 await t.test('snapshot loss, tampering and interrupted key rotation preserve current organisation',async()=>{
  await restore();const before=await store.export(session);
  const row=(await pool.query('SELECT * FROM restore_snapshots LIMIT 1')).rows[0];
  const wrong=new JsonCipher(new Map([['other',Buffer.alloc(32,44)]]),'other','snapshot');store.snapshotsCipher=wrong;
  await assert.rejects(store.snapshotPreview(session,row.id));assert.deepEqual(await store.export(session),before);store.snapshotsCipher=snapshots;
  const rotated=new JsonCipher(new Map([...snapshots.keys,['v2',Buffer.alloc(32,55)]]),'v2','snapshot');
  await pool.query("CREATE FUNCTION reject_rotation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER reject_rotation BEFORE UPDATE ON restore_snapshots FOR EACH ROW EXECUTE FUNCTION reject_rotation()");
  await assert.rejects(rotateSnapshots(pool,rotated,1));await pool.query('DROP TRIGGER reject_rotation ON restore_snapshots; DROP FUNCTION reject_rotation()');
  while(await rotateSnapshots(pool,rotated,2)){}
  store.snapshotsCipher=rotated;await store.snapshotPreview(session,row.id);assert.deepEqual(await store.export(session),before);
  await pool.query("UPDATE restore_snapshots SET payload=jsonb_set(payload,'{tag}','\"tampered\"') WHERE id=$1",[row.id]);
  await assert.rejects(store.snapshotPreview(session,row.id));assert.deepEqual(await store.export(session),before);
  // Restore original envelope so subsequent independent scenarios retain valid recovery data.
  await pool.query('UPDATE restore_snapshots SET payload=$2 WHERE id=$1',[row.id,row.payload]);store.snapshotsCipher=new JsonCipher(rotated.keys,rotated.current,'snapshot');
 });
 await t.test('startup and idle maintenance remove expired payloads, not organisation; concurrent restore/prune serialise',async()=>{
  const before=await store.export(session);await pool.query('UPDATE metadata_cache SET expires_ms=$1',[now-1]);await pool.query('UPDATE restore_previews SET expires_ms=$1',[now-1]);await pool.query('UPDATE mutation_receipts SET expires_ms=$1',[now-1]);
  const expired=await store.issue(OWNER);await pool.query('UPDATE sessions SET absolute_ms=$1 WHERE token_hash=$2',[now-1,(await store.session(expired.token)).hash]);
  let failed=false;const service=await maintenance(pool,()=>{failed=true;},()=>now);
  await service.tick();service.stop();assert.equal(failed,false);
  for(const table of ['metadata_cache','restore_previews','mutation_receipts'])assert.equal((await pool.query(`SELECT 1 FROM ${table}`)).rowCount,0);
  await assert.rejects(store.session(expired.token));await Promise.all([restore(),cleanup(pool,now)]);assert.deepEqual((await store.export(session)).tags,before.tags);
 });
 await t.test('forward migration converts legacy invented snapshots and refuses missing encryption key atomically',async()=>{
  const before=await store.export(session),id=randomUUID();
  // This downgrade fixture is only in the resettable organiser_test schema.
  await pool.query('DELETE FROM restore_snapshots');await pool.query('DROP TABLE recovery_guard; DROP INDEX snapshots_expiry; ALTER TABLE restore_snapshots DROP COLUMN encrypted; DELETE FROM schema_migrations WHERE version=3');
  await pool.query('INSERT INTO restore_snapshots VALUES($1,$2,$3,$4,$5,$6)',[OWNER,id,before,digest(before),before.revision,now]);
  await assert.rejects(migrate(pool,3),/encryption/);assert.equal((await pool.query('SELECT 1 FROM schema_migrations WHERE version=3')).rowCount,0);
  await migrate(pool,3,snapshots);await verifySchema(pool);store.snapshotsCipher=snapshots;await store.snapshotPreview(session,id);
 });
 await t.test('journal encryption, rotation and inventory approval prevent stale/corrupt/missing recovery access',async()=>{
  const record={account:randomUUID(),operation:randomUUID(),deletedAt:now,state:'intent'};await journal.put(record);
  const raw=await readFile(journal.path,'utf8');assert.equal(raw.includes(record.account),false);
  const lost=new FileJournal(journal.path,new JsonCipher(new Map([['missing',Buffer.alloc(32,77)]]),'missing','journal'));await assert.rejects(lost.read());
  await writeFile(journal.path+'.lock','');await assert.rejects(journal.rotate());assert.equal(await readFile(journal.path,'utf8'),raw);await rm(journal.path+'.lock');
  await assert.rejects(approveRecovery(pool,journal,digest(await journal.read()),true));
  await assert.rejects(reconcileRecovery(pool,journal,'0'.repeat(64),true));await assert.rejects(store.issue(OWNER));
  await writeFile(journal.path,'corrupt');await assert.rejects(reconcileRecovery(pool,journal,'0'.repeat(64),true));await writeFile(journal.path,raw);
  const secondCipher=new JsonCipher(new Map([...journalCipher.keys,['j2',Buffer.alloc(32,66)]]),'j2','journal');const rotated=new FileJournal(journal.path,secondCipher);await rotated.rotate();
  const result=await reconcileRecovery(pool,rotated,digest(await rotated.read()),true);assert.equal((await pool.query('SELECT 1 FROM sessions')).rowCount,0);assert.equal((await pool.query('SELECT 1 FROM connections')).rowCount,0);
  await assert.rejects(store.issue(OWNER));await approveRecovery(pool,rotated,result.receipt,true);
  session=await store.session((await store.issue(OWNER)).token);
  await assert.rejects(rotated.retire(record.operation,{allCopiesExpired:false,reconciled:true}));await rotated.retire(record.operation,{allCopiesExpired:true,reconciled:true});
  // Continue with the rotated journal; old key material remains for retained artifacts.
  journal.cipher.keys.set('j2',Buffer.alloc(32,66));
 });
 await t.test('journal failure still deletes accessible data and blocks access until operator reconciliation',async()=>{
  const broken={read:async()=>{throw Error('unavailable');},put:async()=>{throw Error('unavailable');}};
  const coordinator=new DeletionCoordinator(pool,broken);await assert.rejects(coordinator.erase(OWNER,false));
  const outcome=await coordinator.erase(OWNER,true);assert.deepEqual(outcome,{deleted:true,reconciled:false});assert.equal((await pool.query('SELECT 1 FROM accounts WHERE id=$1',[OWNER])).rowCount,0);await assert.rejects(store.issue(OWNER));
  const record={account:OWNER,operation:randomUUID(),deletedAt:now,state:'intent'};await journal.put(record);
  const result=await reconcileRecovery(pool,journal,digest(await journal.read()),true);await approveRecovery(pool,journal,result.receipt,true);await assert.rejects(store.issue(OWNER));
 });
 await t.test('completion write failure retains intent; crash recovery reapplies it and requires fresh approval',async()=>{
  const id=randomUUID();await pool.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)',[id,'invented-completion-failure',randomUUID()]);
  const broken={read:()=>journal.read(),put:async r=>{if(r.state==='complete')throw Error('injected completion failure');await journal.put(r);}};
  assert.equal((await new DeletionCoordinator(pool,broken).erase(id,true)).reconciled,false);
  assert.equal((await journal.read()).find(x=>x.account===id).state,'intent');
  assert.equal((await pool.query('SELECT 1 FROM accounts WHERE id=$1',[id])).rowCount,0);
  await assert.rejects(reconcileRecovery(pool,new FileJournal(dir+'/missing',journalCipher),'0'.repeat(64),true));
  const result=await reconcileRecovery(pool,journal,digest(await journal.read()),true);await approveRecovery(pool,journal,result.receipt,true);
  assert.equal((await journal.read()).find(x=>x.account===id).state,'complete');
 });
 await t.test('concurrent confirmed deletion retries produce one durable operation',async()=>{
  const id=randomUUID();await pool.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)',[id,'invented-concurrent-delete',randomUUID()]);
  const coordinator=new DeletionCoordinator(pool,journal);const results=await Promise.all([coordinator.erase(id,true),coordinator.erase(id,true)]);
  assert.ok(results.every(x=>x.reconciled));assert.equal((await journal.read()).filter(x=>x.account===id).length,1);
  assert.equal((await pool.query('SELECT 1 FROM accounts WHERE id=$1',[id])).rowCount,0);
 });
 await t.test('database deletion failure fences processing; retry completes the same journal intention',async()=>{
  const id=randomUUID();await pool.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)',[id,'invented-delete-retry',randomUUID()]);
  await pool.query("CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER reject_delete BEFORE DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION reject_delete()");
  const coordinator=new DeletionCoordinator(pool,journal);await assert.rejects(coordinator.erase(id,true));await pool.query('DROP TRIGGER reject_delete ON accounts; DROP FUNCTION reject_delete()');
  assert.equal((await pool.query('SELECT status FROM accounts WHERE id=$1',[id])).rows[0].status,'suspended');
  const intent=(await journal.read()).find(x=>x.account===id);assert.equal(intent.state,'intent');await coordinator.erase(id,true);assert.equal((await journal.read()).find(x=>x.account===id).operation,intent.operation);assert.equal((await journal.read()).find(x=>x.account===id).state,'complete');
 });
 }finally{await pool.end();await rm(dir,{recursive:true,force:true});}
});
