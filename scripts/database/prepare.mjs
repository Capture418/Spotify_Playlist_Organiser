import { randomUUID } from 'node:crypto';
import { database,migrate,transaction } from '../../server/database.ts';
import { createDemoLibrary } from '../../src/data/demo-library.ts';
import { SyntheticStore as Store, snapshots } from './support.ts';
import { config } from './local.mjs';
export const OWNER='00000000-0000-4000-8000-000000000001';
export const SECOND='00000000-0000-4000-8000-000000000002';
export async function prepare(name='organiser',reset=false){
 if(!['organiser','organiser_test'].includes(name)||reset&&name!=='organiser_test')throw Error('Only disposable synthetic test reset permitted');
 const pool=database(config('migrator',false,name));
 try{
  if(reset)await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await migrate(pool,3,snapshots);
  for(const id of [OWNER,SECOND]){
   const binding=id===OWNER?'invented-owner':'invented-second';const q=await pool.query('SELECT 1 FROM accounts WHERE id=$1',[id]);if(q.rowCount)continue;
   const deleted=await pool.query('SELECT 1 FROM deletion_records WHERE binding=$1',[binding]);if(deleted.rowCount)continue;
   await pool.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)',[id,binding,randomUUID()]);
   const store=new Store(pool,id);const issued=await store.issue(id),s=await store.session(issued.token);const library=createDemoLibrary();
   for(const kind of ['playlist','album']){const stamp=await store.beginImport(s,kind);await store.publishImport(s,kind,stamp,library.items.filter(i=>i.kind===kind),true);}
   const map=new Map(library.tags.map(t=>[t.id,randomUUID()]));await transaction(pool,c=>store.persistOrganisation(c,id,{tags:library.tags.map(t=>({id:map.get(t.id),name:t.name})),annotations:library.annotations.map(a=>({itemId:a.itemId,tagIds:a.tagIds.map(t=>map.get(t))}))}));await store.signOut(s);
  }
 }finally{await pool.end();}
}
if(process.argv[1]?.endsWith('/prepare.mjs')){await prepare();console.log('Synthetic schema and invented library prepared.');}
