import { mkdir, open, readFile, rename, unlink, lstat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction,verifySchema } from './database.ts';
import { JsonCipher } from './lifecycle.ts';
import { digest, requireValue, uuid } from './validation.ts';
export type Deletion = {account:string;operation:string;deletedAt:number;state:'intent'|'complete'};
export interface Journal {read():Promise<Deletion[]>;put(record:Deletion):Promise<void>;}
export function validateJournal(value:unknown):Deletion[]{
 requireValue(Array.isArray(value)&&value.length<=10000,'Invalid recovery journal');
 const ids=new Set<string>();
 for(const r of value){requireValue(r&&typeof r==='object'&&Object.keys(r).sort().join(',')==='account,deletedAt,operation,state');uuid(r.account);uuid(r.operation);requireValue(Number.isSafeInteger(r.deletedAt)&&r.deletedAt>=0&&(r.state==='intent'||r.state==='complete')&&!ids.has(r.operation));ids.add(r.operation);}
 return value as Deletion[];
}
/** Explicit initialisation only. Missing/corrupt files never silently become an empty journal. */
export class FileJournal implements Journal {
 readonly path:string;readonly cipher:JsonCipher;
 constructor(path:string,cipher:JsonCipher){this.path=path;this.cipher=cipher;}
 async initialise(){await mkdir(dirname(this.path),{recursive:true,mode:0o700});const f=await open(this.path,'wx',0o600);try{await f.writeFile(JSON.stringify(this.cipher.encrypt([],'deletions')));await f.sync();}finally{await f.close();}}
 async read(){const info=await lstat(this.path);requireValue(info.isFile()&&!info.isSymbolicLink()&&info.size<=17*1024*1024);const raw=await readFile(this.path,'utf8');requireValue(raw.length<=17*1024*1024);return validateJournal(this.cipher.decrypt(JSON.parse(raw),'deletions'));}
 private async rewrite(change:(records:Deletion[])=>Deletion[]){
  const lock=await open(this.path+'.lock','wx',0o600);const temp=this.path+'.'+randomUUID()+'.tmp';
  try{const next=validateJournal(change(await this.read()));const payload=this.cipher.encrypt(next,'deletions');this.cipher.decrypt(payload,'deletions');const f=await open(temp,'wx',0o600);try{await f.writeFile(JSON.stringify(payload));await f.sync();}finally{await f.close();}await rename(temp,this.path);const directory=await open(dirname(this.path),'r');try{await directory.sync();}finally{await directory.close();}}
  finally{await unlink(temp).catch(()=>{});await lock.close();await unlink(this.path+'.lock');}
 }
 async put(record:Deletion){validateJournal([record]);await this.rewrite(rows=>{const old=rows.find(x=>x.operation===record.operation);if(old){requireValue(old.account===record.account&&old.deletedAt===record.deletedAt);return rows.map(x=>x.operation===record.operation?{...record,state:x.state==='complete'?'complete':record.state}:x);}return [...rows,record];});}
 async rotate(){await this.rewrite(rows=>rows);}
 async retire(operation:string,confirmation:{allCopiesExpired:boolean;reconciled:boolean}){
  requireValue(confirmation.allCopiesExpired&&confirmation.reconciled,'Backup inventory confirmation required');
  await this.rewrite(rows=>{requireValue(rows.find(x=>x.operation===operation)?.state==='complete');return rows.filter(x=>x.operation!==operation);});
 }
}
export class DeletionCoordinator {
 readonly pool:Pool;readonly journal:Journal;readonly cancel:()=>void;
 private pending:Promise<unknown>=Promise.resolve();
 constructor(pool:Pool,journal:Journal,cancel:()=>void=()=>{}){this.pool=pool;this.journal=journal;this.cancel=cancel;}
 erase(account:string,confirmed:boolean){
  const operation=this.pending.then(()=>this.eraseOnce(account,confirmed));this.pending=operation.catch(()=>{});return operation;
 }
 private async eraseOnce(account:string,confirmed:boolean){
  uuid(account);requireValue(confirmed,'Confirmation required');this.cancel();
  // Fence login/import before touching independent storage. This also supports suspended accounts.
  const prior=await this.pool.query('SELECT blocked FROM recovery_guard');
  await transaction(this.pool,async c=>{await c.query('UPDATE recovery_guard SET blocked=true');await c.query("UPDATE accounts SET status='suspended',generation=$2 WHERE id=$1",[account,randomUUID()]);await c.query('DELETE FROM sessions WHERE account_id=$1',[account]);await c.query('DELETE FROM connections WHERE account_id=$1',[account]);});
  let records:Deletion[]=[];let journalReady=true;
  try{records=await this.journal.read();}catch{journalReady=false;}
  const intent=records.find(x=>x.account===account)??{account,operation:randomUUID(),deletedAt:Date.now(),state:'intent' as const};
  try{if(!journalReady)throw Error();await this.journal.put(intent);}catch{journalReady=false;}
  try{
   await transaction(this.pool,async c=>{
    const result=await c.query('SELECT binding FROM accounts WHERE id=$1 FOR UPDATE',[account]);
    if(result.rowCount)await c.query('INSERT INTO deletion_records VALUES($1,$2) ON CONFLICT(binding) DO UPDATE SET deleted_ms=EXCLUDED.deleted_ms',[result.rows[0].binding,intent.deletedAt]);
    await c.query('DELETE FROM accounts WHERE id=$1',[account]);
    if(!journalReady)await c.query('UPDATE recovery_guard SET blocked=true');
   });
  }catch{await this.pool.query('UPDATE recovery_guard SET blocked=true');throw Error('Deletion incomplete; processing stopped and operator reconciliation required');}
  if(journalReady)try{await this.journal.put({...intent,state:'complete'});}catch{journalReady=false;}
  if(journalReady&&prior.rows[0]?.blocked===false)await this.pool.query('UPDATE recovery_guard SET blocked=false');
  return {deleted:true,reconciled:journalReady&&prior.rows[0]?.blocked===false};
 }
}
const verifiedRecoveries=new WeakMap<Pool,string>();
/** Operator-only recovery. The independently verified journal digest comes from backup inventory. */
export async function reconcileRecovery(pool:Pool,journal:Journal,expectedDigest:string,confirmed:boolean){
 verifiedRecoveries.delete(pool);
 await pool.query('UPDATE recovery_guard SET blocked=true');
 requireValue(confirmed&&expectedDigest.length===64,'Independent recovery inventory confirmation required');
 await verifySchema(pool);
 const records=await journal.read();requireValue(digest(records)===expectedDigest,'Journal inventory mismatch');
 await transaction(pool,async c=>{
  for(const r of records){const found=await c.query('SELECT binding FROM accounts WHERE id=$1 FOR UPDATE',[r.account]);if(found.rowCount)await c.query('INSERT INTO deletion_records VALUES($1,$2) ON CONFLICT DO NOTHING',[found.rows[0].binding,r.deletedAt]);await c.query('DELETE FROM accounts WHERE id=$1',[r.account]);}
  await c.query('DELETE FROM sessions');await c.query('DELETE FROM connections');
 });
 // Intent is sufficient to prevent resurrection; completion follows successful reconciliation.
 for(const r of records)await journal.put({...r,state:'complete'});
 const receipt=digest(await journal.read());
 verifiedRecoveries.set(pool,receipt);
 return {receipt};
}
export async function approveRecovery(pool:Pool,journal:Journal,receipt:string,confirmed:boolean){
 requireValue(confirmed&&verifiedRecoveries.get(pool)===receipt&&digest(await journal.read())===receipt,'Recovery approval required');
 const sessions=await pool.query('SELECT (SELECT count(*) FROM sessions)+(SELECT count(*) FROM connections) AS n');requireValue(Number(sessions.rows[0].n)===0,'Restored credentials must be cleared');
 await pool.query('UPDATE recovery_guard SET blocked=false');verifiedRecoveries.delete(pool);
}
