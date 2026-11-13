import { createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './database.ts';
import { Fault, requireValue } from './validation.ts';
export const SCOPES=['playlist-read-private','playlist-read-collaborative','user-library-read'];
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export type Sealed={keyVersion:string;nonce:string;tag:string;body:string};
export function seal(value:string,key:Buffer,keyVersion:string,account:string,version:number):Sealed {requireValue(key.length===32&&value.length<=8192);const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(`${account}/${version}/${keyVersion}`));const body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return {keyVersion,nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:body.toString('base64')};}
export function unseal(value:Sealed,keys:Map<string,Buffer>,account:string,version:number):string {try{const key=keys.get(value.keyVersion);if(!key)throw Error();const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(value.nonce,'base64'));cipher.setAAD(Buffer.from(`${account}/${version}/${value.keyVersion}`));cipher.setAuthTag(Buffer.from(value.tag,'base64'));return Buffer.concat([cipher.update(Buffer.from(value.body,'base64')),cipher.final()]).toString('utf8');}catch{throw new Fault(401,'Reconnect required');}}
export class RefreshRejected extends Error {}
export class CredentialStore {
 pool:Pool;keys:Map<string,Buffer>;current:string;
 constructor(pool:Pool,keys:Map<string,Buffer>,current:string){this.pool=pool;this.keys=keys;this.current=current;if(!keys.get(current)||keys.get(current)!.length!==32)throw Error('Key configuration required');}
 async put(account:string,token:string){return transaction(this.pool,async c=>{const a=await c.query("SELECT id FROM accounts WHERE id=$1 AND status='active' FOR UPDATE",[account]);if(!a.rowCount)throw new Fault(401,'Reconnect required');const old=await c.query('SELECT version FROM connections WHERE account_id=$1',[account]);const version=(old.rows[0]?.version??0)+1;await c.query('INSERT INTO connections VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET credential=EXCLUDED.credential,version=EXCLUDED.version',[account,seal(token,this.keys.get(this.current)!,this.current,account,version),version]);});}
 async refresh(account:string,exchange:(token:string,signal:AbortSignal)=>Promise<{refreshToken:string;accessToken:string}>) {
  // The row lock serialises exchanges across processes. A crash after remote rotation requires reconnect.
  const outcome = await transaction(this.pool,async c=>{const a=await c.query("SELECT id FROM accounts WHERE id=$1 AND status='active' FOR UPDATE",[account]);if(!a.rowCount)throw new Fault(401,'Reconnect required');const q=await c.query('SELECT * FROM connections WHERE account_id=$1',[account]);const old=q.rows[0];if(!old)throw new Fault(401,'Reconnect required');const token=unseal(old.credential,this.keys,account,old.version);const signal=AbortSignal.timeout(10000);
   let result: {refreshToken:string;accessToken:string};
   try { result=await bounded(signal,()=>exchange(token,signal)); }
   catch(error){if(!(error instanceof RefreshRejected))throw new Fault(503,'Reconnect may be required');await c.query("UPDATE accounts SET status='suspended' WHERE id=$1",[account]);await c.query('DELETE FROM sessions WHERE account_id=$1',[account]);await c.query('DELETE FROM connections WHERE account_id=$1',[account]);return null;}
   requireValue(typeof result.refreshToken==='string'&&result.refreshToken.length>0&&result.refreshToken.length<=8192&&typeof result.accessToken==='string'&&result.accessToken.length>0&&result.accessToken.length<=8192,'Invalid token response');const version=old.version+1;await c.query('UPDATE connections SET credential=$2,version=$3 WHERE account_id=$1',[account,seal(result.refreshToken,this.keys.get(this.current)!,this.current,account,version),version]);return result.accessToken;
  });
  if(outcome===null)throw new Fault(401,'Reconnect required');return outcome;
 }
 async rotate(account:string){return this.refresh(account,async token=>({refreshToken:token,accessToken:'synthetic-key-rotation'})).then(()=>undefined);}
}
export class OAuthGate {
 pending=new Map<string,{state:string;verifier:string;expires:number}>();now:()=>number;ownerBinding:string;callback:string;
 constructor(ownerBinding:string,callback:string,now=Date.now){this.ownerBinding=ownerBinding;this.callback=callback;this.now=now;}
 begin(browser:string){for(const [k,v]of this.pending)if(v.expires<=this.now())this.pending.delete(k);if(this.pending.size>=100)throw new Fault(429,'Try later');const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');this.pending.set(browser,{state,verifier,expires:this.now()+300000});return {state,challenge:createHash('sha256').update(verifier).digest('base64url'),callback:this.callback,scopes:[...SCOPES]};}
 async finish(browser:string,state:string,code:string,exchange:(code:string,verifier:string,callback:string)=>Promise<{binding:string;scopes:string[];refreshToken:string;accessToken:string}>){const pending=this.pending.get(browser);this.pending.delete(browser);if(!pending||pending.expires<=this.now()||!equal(pending.state,state)||!code||code.length>2048)throw new Fault(403,'Authorisation rejected');const result=await bounded(AbortSignal.timeout(10000),()=>exchange(code,pending.verifier,this.callback));if(result.binding!==this.ownerBinding||[...result.scopes].sort().join(' ')!==[...SCOPES].sort().join(' '))throw new Fault(403,'Account or grant rejected');requireValue(result.refreshToken.length>0&&result.refreshToken.length<=8192&&result.accessToken.length>0&&result.accessToken.length<=8192);return result;}
}
export function cookie(token:string,production:boolean){return `${production?'__Host-organiser':'organiser-synthetic'}=${token}; Path=/; HttpOnly; SameSite=Lax${production?'; Secure':''}; Max-Age=2592000`;}

export async function bounded<T>(signal:AbortSignal,work:()=>Promise<T>):Promise<T>{
 if(signal.aborted)throw new Fault(503,'Request timed out');
 let abort:()=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{
  abort=()=>reject(new Fault(503,'Request timed out'));
  signal.addEventListener('abort',abort,{once:true});
 });
 try{return await Promise.race([cancelled,work()]);}
 finally{signal.removeEventListener('abort',abort);}
}
