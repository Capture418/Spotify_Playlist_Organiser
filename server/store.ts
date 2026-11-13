import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { JsonCipher, pruneAccount } from './lifecycle.ts';
import type { DeletionCoordinator } from './journal.ts';
import { transaction } from './database.ts';
import { Fault, requireValue, record, text, uuid, revision, array, distinct, key, digest } from './validation.ts';
import { applyTagEdit, cleanTagName } from '../src/domain/library.ts';
import type { Library, LibraryItem, TagEdit } from '../src/domain/library.ts';
export const hashToken=(s:string)=>createHash('sha256').update(s).digest('hex');
export type Session={hash:string;account:string;csrf:string};
export type ExportData={format:'playlist-organiser';version:1;binding:string;revision:string;tags:{id:string;name:string}[];annotations:{itemId:string;tagIds:string[]}[]};
const DAY=86400000;
export class Store {
 snapshotsCipher?:JsonCipher; deletion?:DeletionCoordinator;
 pool:Pool;owner:string;now:()=>number;
 constructor(pool:Pool,owner:string,now=Date.now){this.pool=pool;this.owner=uuid(owner);this.now=now;}
 async permitted(){const q=await this.pool.query('SELECT blocked FROM recovery_guard');if(q.rows[0]?.blocked!==false)throw new Fault(503,'Recovery reconciliation required');}
 async session(token:string):Promise<Session>{
  await this.permitted();
  if(!/^[a-zA-Z0-9_-]{43}$/.test(token))throw new Fault(401,'Sign in required');
  const c=await this.pool.query('SELECT s.*,a.status FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE token_hash=$1',[hashToken(token)]);const s=c.rows[0];
  if(!s||s.account_id!==this.owner||s.status!=='active'||Number(s.absolute_ms)<=this.now()||Number(s.activity_ms)+7*DAY<=this.now())throw new Fault(401,'Sign in required');
  return {hash:s.token_hash,account:s.account_id,csrf:s.csrf};
 }
 async issue(account:string):Promise<{token:string;csrf:string}>{
  await this.permitted();
  if(account!==this.owner)throw new Fault(403,'Account not permitted');
  const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');
  const r=await this.pool.query("INSERT INTO sessions(token_hash,account_id,csrf,created_ms,activity_ms,absolute_ms) SELECT $1,id,$2,$3,$3,$4 FROM accounts WHERE id=$5 AND status='active' RETURNING token_hash",[hashToken(token),csrf,this.now(),this.now()+30*DAY,account]);
  if(!r.rowCount)throw new Fault(403,'Account not permitted');return {token,csrf};
 }
 async locked<T>(s:Session,work:(c:PoolClient,a:{binding:string;revision:string;generation:string})=>Promise<T>,activity=false):Promise<T>{
  await this.permitted();
  if(s.account!==this.owner)throw new Fault(403,'Account not permitted');
  return transaction(this.pool,async c=>{
   const a=await c.query("SELECT * FROM accounts WHERE id=$1 AND status='active' FOR UPDATE",[s.account]);if(!a.rowCount)throw new Fault(401,'Sign in required');
   const valid=await c.query('SELECT 1 FROM sessions WHERE token_hash=$1 AND account_id=$2 AND absolute_ms>$3 AND activity_ms>$4',[s.hash,s.account,this.now(),this.now()-7*DAY]);if(!valid.rowCount)throw new Fault(401,'Sign in required');
   if(activity)await c.query('UPDATE sessions SET activity_ms=$2 WHERE token_hash=$1',[s.hash,this.now()]);
   return work(c,a.rows[0]);
  });
 }
 async load(c:PoolClient,account:string):Promise<Library>{
  await c.query('DELETE FROM metadata_cache WHERE account_id=$1 AND expires_ms<=$2',[account,this.now()]);
  const items=await c.query('SELECT i.*,m.payload FROM items i LEFT JOIN metadata_cache m USING(account_id,kind,spotify_id) WHERE account_id=$1 ORDER BY kind,spotify_id',[account]);
  const tags=await c.query('SELECT tag_id AS id,name FROM tags WHERE account_id=$1 ORDER BY canonical',[account]);
  const annotations=await c.query('SELECT kind,spotify_id,tag_id FROM assignments WHERE account_id=$1 ORDER BY kind,spotify_id,tag_id',[account]);
  return {items:items.rows.map(i=>({id:`${i.kind}:${i.spotify_id}`,kind:i.kind,title:i.payload?.title??`Unavailable ${i.kind} (${i.spotify_id})`,available:i.available&&!!i.payload,source:i.payload?.source==='spotify'?'spotify':'demo',spotifyUrl:i.payload?.source==='spotify'&&i.payload?.spotifyUrl===`https://open.spotify.com/${i.kind}/${i.spotify_id}`?i.payload.spotifyUrl:null,artworkUrl:null,...(i.kind==='album'?{artists:i.payload?.artists??[]}:{ownerLabel:i.payload?.ownerLabel??''})} as LibraryItem)),tags:tags.rows,annotations:items.rows.map(i=>({itemId:`${i.kind}:${i.spotify_id}`,tagIds:annotations.rows.filter(a=>a.kind===i.kind&&a.spotify_id===i.spotify_id).map(a=>a.tag_id)}))};
 }
 async library(s:Session){return this.locked(s,async(c,a)=>({library:await this.load(c,s.account),revision:a.revision}));}
 async exportAt(c:PoolClient,account:string,a:{binding:string;revision:string}):Promise<ExportData>{const l=await this.load(c,account);return {format:'playlist-organiser',version:1,binding:a.binding,revision:a.revision,tags:l.tags.map(t=>({...t})),annotations:l.annotations.map(x=>({itemId:x.itemId,tagIds:[...x.tagIds]}))};}
 async export(s:Session){return this.locked(s,(c,a)=>this.exportAt(c,s.account,a),true);}
 validateExport(input:unknown,binding:string):ExportData{
  requireValue(Buffer.byteLength(JSON.stringify(input))<=10*1024*1024,'Restore too large');
  const r=record(input,['format','version','binding','revision','tags','annotations']);requireValue(r.format==='playlist-organiser'&&r.version===1&&r.binding===binding,'Wrong account or export format');
  const tags=array(r.tags,2000).map(x=>{const t=record(x,['id','name']);return {id:uuid(t.id),name:cleanTagName(text(t.name))};});requireValue(tags.every(t=>t.name.length>0));distinct(tags.map(t=>t.id));distinct(tags.map(t=>t.name.toLocaleLowerCase('en-GB')));
  const known=new Set(tags.map(t=>t.id));let total=0;
  const annotations=array(r.annotations,10000).map(x=>{const a=record(x,['itemId','tagIds']);const k=key(a.itemId);const ids=array(a.tagIds,2000).map(uuid);distinct(ids);requireValue(ids.every(id=>known.has(id)));total+=ids.length;return {itemId:`${k.kind}:${k.id}`,tagIds:ids};});distinct(annotations.map(a=>a.itemId));requireValue(total<=100000);
  return {format:'playlist-organiser',version:1,binding,revision:revision(r.revision),tags,annotations};
 }
 async persistOrganisation(c:PoolClient,account:string,data:Pick<ExportData,'tags'|'annotations'>){
  const existing=await c.query('SELECT kind,spotify_id FROM items WHERE account_id=$1',[account]);
  const identities=new Set([...existing.rows.map(i=>`${i.kind}:${i.spotify_id}`),...data.annotations.map(a=>a.itemId)]);
  requireValue(identities.size<=10000,'Too many library items');
  await c.query('DELETE FROM assignments WHERE account_id=$1',[account]);await c.query('DELETE FROM tags WHERE account_id=$1',[account]);
  for(const t of data.tags)await c.query('INSERT INTO tags VALUES($1,$2,$3,$4)',[account,t.id,t.name,cleanTagName(t.name).toLocaleLowerCase('en-GB')]);
  for(const a of data.annotations){const k=key(a.itemId);await c.query('INSERT INTO items(account_id,kind,spotify_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[account,k.kind,k.id]);for(const id of a.tagIds)await c.query('INSERT INTO assignments VALUES($1,$2,$3,$4)',[account,k.kind,k.id,id]);}
 }
 async mutation(s:Session,requestId:string,expected:string,payload:unknown,work:(c:PoolClient,a:{binding:string;revision:string;generation:string})=>Promise<Record<string,unknown>>){
  uuid(requestId);revision(expected);const d=digest(payload);
  return this.locked(s,async(c,a)=>{
   await c.query('DELETE FROM mutation_receipts WHERE account_id=$1 AND expires_ms<=$2',[s.account,this.now()]);
   const receipt=await c.query('SELECT digest,result FROM mutation_receipts WHERE account_id=$1 AND request_id=$2',[s.account,requestId]);if(receipt.rowCount){if(receipt.rows[0].digest!==d)throw new Fault(409,'Request identity already used');return receipt.rows[0].result;}
   if(a.revision!==expected)throw new Fault(409,'Library changed. Review the latest tags before reapplying.');
   const result=await work(c,a);const next=(BigInt(a.revision)+1n).toString();await c.query('UPDATE accounts SET revision=$2 WHERE id=$1',[s.account,next]);const out={...result,revision:next};await c.query('INSERT INTO mutation_receipts VALUES($1,$2,$3,$4,$5)',[s.account,requestId,d,out,this.now()+DAY]);return out;
  },true);
 }
 async edit(s:Session,input:unknown){const r=record(input,['requestId','revision','edit']);const e=record(r.edit,['mode','itemIds','tagIds','newTags']);requireValue(e.mode==='single'||e.mode==='bulk');const ids=array(e.itemIds,1000).map(x=>{key(x);return String(x);});distinct(ids);const tagIds=array(e.tagIds,2000).map(x=>text(x,100));distinct(tagIds);const drafts=array(e.newTags,2000).map(x=>{const t=record(x,['id','name']);return {id:text(t.id,100),name:cleanTagName(text(t.name))};});distinct(drafts.map(t=>t.id));
  return this.mutation(s,uuid(r.requestId),revision(r.revision),r,async(c,a)=>{
   const remap=new Map(drafts.map(t=>[t.id,randomUUID()]));const edit:TagEdit={mode:e.mode as 'single'|'bulk',itemIds:ids,tagIds:tagIds.map(x=>remap.get(x)??uuid(x)),newTags:drafts.map(t=>({id:remap.get(t.id)!,name:t.name}))};let next:Library;
   try{next=applyTagEdit(await this.load(c,s.account),edit);}catch{throw new Fault(422,'Invalid tag edit; nothing changed');}
   const value=this.validateExport({format:'playlist-organiser',version:1,binding:a.binding,revision:a.revision,tags:next.tags,annotations:next.annotations},a.binding);
   await this.persistOrganisation(c,s.account,value);return {};
  });
 }
 async preview(s:Session,input:unknown){return this.locked(s,async(c,a)=>{
  await c.query('DELETE FROM restore_previews WHERE account_id=$1 AND expires_ms<=$2',[s.account,this.now()]);const value=this.validateExport(input,a.binding),old=await this.exportAt(c,s.account,a),id=randomUUID();
  const count=await c.query('SELECT count(*) FROM restore_previews WHERE account_id=$1',[s.account]);if(Number(count.rows[0].count)>=10)throw new Fault(429,'Too many restore previews');
  await c.query('INSERT INTO restore_previews VALUES($1,$2,$3,$4,$5,$6,$7)',[s.account,id,s.hash,value,digest(value),a.revision,this.now()+300000]);
  const assignments=(v:ExportData)=>new Set(v.annotations.flatMap(a=>a.tagIds.map(t=>`${a.itemId}/${t}`)));const before=assignments(old),after=assignments(value);const beforeTags=new Set(old.tags.map(t=>`${t.id}/${t.name}`)),afterTags=new Set(value.tags.map(t=>`${t.id}/${t.name}`));
  const library=await this.load(c,s.account);
  return {id,revision:a.revision,tagsAdded:[...afterTags].filter(x=>!beforeTags.has(x)).length,tagsRemoved:[...beforeTags].filter(x=>!afterTags.has(x)).length,assignmentsAdded:[...after].filter(x=>!before.has(x)).length,assignmentsRemoved:[...before].filter(x=>!after.has(x)).length,affectedItems:new Set([...old.annotations,...value.annotations].filter(a=>[...before,...after].some(x=>x.startsWith(a.itemId+'/')&&before.has(x)!==after.has(x))).map(a=>a.itemId)).size,unavailableItems:value.annotations.filter(a=>!library.items.some(i=>i.id===a.itemId&&i.available)).length};
 },true);}
 async restore(s:Session,input:unknown){const r=record(input,['requestId','revision','previewId','confirm']);requireValue(r.confirm===true,'Confirmation required');const id=uuid(r.previewId);return this.mutation(s,uuid(r.requestId),revision(r.revision),r,async(c,a)=>{
  const found=await c.query('SELECT * FROM restore_previews WHERE account_id=$1 AND id=$2 AND session_hash=$3',[s.account,id,s.hash]);const p=found.rows[0];if(!p||Number(p.expires_ms)<=this.now()||p.revision!==a.revision)throw new Fault(409,'Preview expired or changed');requireValue(digest(p.payload)===p.digest,'Preview integrity failure');const data=this.validateExport(p.payload,a.binding);const old=await this.exportAt(c,s.account,a),snapshot=randomUUID();
  requireValue(this.snapshotsCipher,'Snapshot encryption unavailable');const sealed=this.snapshotsCipher.encrypt(old,`${s.account}/${snapshot}/${a.revision}`);await c.query('INSERT INTO restore_snapshots(account_id,id,payload,digest,revision,created_ms,encrypted) VALUES($1,$2,$3,$4,$5,$6,true)',[s.account,snapshot,sealed,digest(old),a.revision,this.now()]);await this.persistOrganisation(c,s.account,data);await pruneAccount(c,s.account,this.now(),snapshot);await c.query('DELETE FROM restore_previews WHERE account_id=$1',[s.account]);return {snapshot};
 });}
 async snapshots(s:Session){return this.locked(s,async c=>{await pruneAccount(c,s.account,this.now());return (await c.query('SELECT id,revision,created_ms FROM restore_snapshots WHERE account_id=$1 ORDER BY created_ms DESC',[s.account])).rows;});}
 async snapshotPreview(s:Session,id:string){uuid(id);const data=await this.locked(s,async c=>{
  const q=await c.query('SELECT * FROM restore_snapshots WHERE account_id=$1 AND id=$2 AND created_ms>$3',[s.account,id,this.now()-7*DAY]);const p=q.rows[0];
  if(!p||!p.encrypted||!this.snapshotsCipher)throw new Fault(422,'Snapshot unavailable; current organisation is unchanged');
  const value=this.snapshotsCipher.decrypt(p.payload,`${s.account}/${id}/${p.revision}`);
  if(digest(value)!==p.digest)throw new Fault(422,'Snapshot unavailable; current organisation is unchanged');return value;
 });return this.preview(s,data);}
 async signOut(s:Session,all=false){return this.locked(s,async c=>{await c.query(all?'DELETE FROM sessions WHERE account_id=$1':'DELETE FROM sessions WHERE token_hash=$1',[all?s.account:s.hash]);});}
 async remove(s:Session,confirmed:boolean){if(this.deletion){requireValue(confirmed,'Confirmation required');await this.locked(s,async()=>{});return this.deletion.erase(s.account,true);}requireValue(confirmed,'Confirmation required');return this.locked(s,async(c,a)=>{await c.query('INSERT INTO deletion_records VALUES($1,$2) ON CONFLICT(binding) DO UPDATE SET deleted_ms=EXCLUDED.deleted_ms',[a.binding,this.now()]);await c.query('DELETE FROM accounts WHERE id=$1',[s.account]);});}
 async beginImport(s:Session,kind:'album'|'playlist'){return this.locked(s,async(c,a)=>{const generation=randomUUID();await c.query('INSERT INTO collection_generations VALUES($1,$2,$3) ON CONFLICT(account_id,kind) DO UPDATE SET generation=EXCLUDED.generation',[s.account,kind,generation]);return {generation,accountGeneration:a.generation};},true);}
 async publishImport(s:Session,kind:'album'|'playlist',stamp:{generation:string;accountGeneration:string},items:readonly LibraryItem[],complete:boolean){requireValue(complete,'Incomplete collection');requireValue(items.length<=10000);distinct(items.map(x=>x.id));for(const item of items){const k=key(item.id);requireValue(k.kind===kind&&item.kind===kind);text(item.title,512);if(item.source==='spotify')requireValue(/^[A-Za-z0-9]{22}$/.test(k.id)&&item.spotifyUrl===`https://open.spotify.com/${kind}/${k.id}`);else requireValue(item.source==='demo'&&item.spotifyUrl===null);if(item.kind==='album'){requireValue(item.artists.length<=100);item.artists.forEach(x=>text(x,256));}else text(item.ownerLabel||'Unknown',256);}
  return this.locked(s,async(c,a)=>{const q=await c.query('SELECT generation FROM collection_generations WHERE account_id=$1 AND kind=$2',[s.account,kind]);if(a.generation!==stamp.accountGeneration||q.rows[0]?.generation!==stamp.generation)throw new Fault(409,'Refresh superseded');
   await c.query('UPDATE items SET available=false WHERE account_id=$1 AND kind=$2',[s.account,kind]);
   for(const item of items){const k=key(item.id);await c.query('INSERT INTO items VALUES($1,$2,$3,$4) ON CONFLICT(account_id,kind,spotify_id) DO UPDATE SET available=EXCLUDED.available',[s.account,kind,k.id,item.available]);const payload={source:item.source,spotifyUrl:item.spotifyUrl,...(item.kind==='album'?{title:item.title,artists:item.artists}:{title:item.title,ownerLabel:item.ownerLabel})};await c.query('INSERT INTO metadata_cache VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id,kind,spotify_id) DO UPDATE SET payload=EXCLUDED.payload,expires_ms=EXCLUDED.expires_ms',[s.account,kind,k.id,payload,this.now()+DAY]);}
   const final=await c.query('SELECT count(*) FROM items WHERE account_id=$1',[s.account]);requireValue(Number(final.rows[0].count)<=10000);await c.query('DELETE FROM collection_generations WHERE account_id=$1 AND kind=$2',[s.account,kind]);
  });
 }
}
