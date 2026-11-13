import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './database.ts';
import { Fault, requireValue } from './validation.ts';
export const DAY = 86400000;
export type Envelope = { keyVersion:string; nonce:string; tag:string; body:string };
export class JsonCipher {
  readonly keys:Map<string,Buffer>; readonly current:string; readonly purpose:string;
  constructor(keys:Map<string,Buffer>,current:string,purpose:string){
    requireValue(keys.get(current)?.length===32 && ['snapshot','journal'].includes(purpose),'Encryption configuration required');
    this.keys=keys;this.current=current;this.purpose=purpose;
  }
  encrypt(value:unknown,identity:string):Envelope {
    const plain=Buffer.from(JSON.stringify(value));requireValue(plain.length<=12*1024*1024,'Payload too large');
    const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.keys.get(this.current)!,nonce);
    cipher.setAAD(Buffer.from(`${this.purpose}/1/${identity}/${this.current}`));
    const body=Buffer.concat([cipher.update(plain),cipher.final()]).toString('base64');
    return {keyVersion:this.current,nonce:nonce.toString('base64'),body,tag:cipher.getAuthTag().toString('base64')};
  }
  decrypt(value:Envelope,identity:string):unknown {
    try {
      const key=this.keys.get(value.keyVersion);if(!key||key.length!==32||value.body.length>17*1024*1024)throw Error();
      const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(value.nonce,'base64'));
      cipher.setAAD(Buffer.from(`${this.purpose}/1/${identity}/${value.keyVersion}`));cipher.setAuthTag(Buffer.from(value.tag,'base64'));
      return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.body,'base64')),cipher.final()]).toString('utf8'));
    }catch{throw new Fault(422,'Snapshot or recovery record unavailable; current organisation is unchanged');}
  }
}
export async function pruneAccount(c:PoolClient,account:string,now:number,keep:string|null=null){
  await c.query('DELETE FROM restore_snapshots WHERE account_id=$1 AND created_ms<=$2',[account,now-7*DAY]);
  await c.query('DELETE FROM restore_snapshots WHERE account_id=$1 AND id IN (SELECT id FROM restore_snapshots WHERE account_id=$1 ORDER BY (id=$2) DESC NULLS LAST,created_ms DESC,id DESC OFFSET 10)',[account,keep]);
  for(const table of ['restore_previews','metadata_cache','mutation_receipts'])await c.query(`DELETE FROM ${table} WHERE account_id=$1 AND expires_ms<=$2`,[account,now]);
  await c.query('DELETE FROM sessions WHERE account_id=$1 AND (absolute_ms<=$2 OR activity_ms<=$3)',[account,now,now-7*DAY]);
}
export async function cleanup(pool:Pool,now=Date.now()){
  const accounts=await pool.query('SELECT id FROM accounts ORDER BY id');
  for(const {id} of accounts.rows)await transaction(pool,async c=>{
    await c.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[id]);await pruneAccount(c,id,now);
  });
}
/** Startup sweep is awaited. Failures are surfaced; no unhandled timer rejection. */
export async function maintenance(pool:Pool,onFailure:()=>void,now=Date.now){
  await cleanup(pool,now());let running=false,stopped=false;
  const tick=async()=>{if(running||stopped)return;running=true;try{await cleanup(pool,now());}catch{onFailure();}finally{running=false;}};
  const timer=setInterval(()=>void tick(),60000);timer.unref();
  return {tick,stop:()=>{stopped=true;clearInterval(timer);}};
}
export async function rotateSnapshots(pool:Pool,cipher:JsonCipher,limit=25){
  requireValue(Number.isInteger(limit)&&limit>0&&limit<=100);
  return transaction(pool,async c=>{
    // One account at a time, same lock order as restore and pruning.
    const accounts=await c.query('SELECT id FROM accounts ORDER BY id FOR UPDATE');let count=0;
    for(const {id} of accounts.rows){
      const rows=await c.query("SELECT * FROM restore_snapshots WHERE account_id=$1 AND payload->>'keyVersion'<>$2 ORDER BY id LIMIT $3",[id,cipher.current,limit-count]);
      for(const row of rows.rows){const identity=`${id}/${row.id}/${row.revision}`;const value=cipher.decrypt(row.payload,identity);const encrypted=cipher.encrypt(value,identity);cipher.decrypt(encrypted,identity);await c.query('UPDATE restore_snapshots SET payload=$3 WHERE account_id=$1 AND id=$2',[id,row.id,encrypted]);count++;}
      if(count===limit)break;
    }return count;
  });
}
