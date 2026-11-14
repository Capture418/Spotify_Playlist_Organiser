import type { Pool, PoolClient } from 'pg';
import { Fault } from './validation.ts';
const tables='accounts sessions connections items metadata_cache tags assignments mutation_receipts restore_snapshots restore_previews collection_generations deletion_records recovery_guard hosted_journal_binding'.split(' ');
export const capacitySQL='SELECT sum(bytes)::text AS bytes,sum(rows)::text AS rows FROM ('+tables.map(t=>`SELECT coalesce(sum(octet_length(row_to_json(t)::text)),0) AS bytes,count(*) AS rows FROM public.${t} t`).join(' UNION ALL ')+') sizes';
export async function checkCapacity(client:Pick<PoolClient,'query'>){
  const r=await client.query(capacitySQL);
  if(Number(r.rows[0].bytes)>1024*1024||Number(r.rows[0].rows)>12000)throw new Fault(507,'Storage capacity reached; export your organisation and contact the operator');
}
/** Serialize application writes and check before commit. Failed capacity checks roll back, never prune. */
export function capacityPool(pool:Pool):Pool {
  const connect=pool.connect.bind(pool);
  async function client(){
    const c=await connect(),query=c.query.bind(c);let transaction=false;
    const wrapped=new Proxy(c,{get(target,key){
      if(key==='query')return async(...args:unknown[])=>{
        const sql=typeof args[0]==='string'?args[0]:'';
        if(sql==='BEGIN'){const r=await query('BEGIN');transaction=true;await query('SELECT pg_advisory_xact_lock(47174178)');return r;}
        if(sql==='COMMIT'&&transaction)await checkCapacity({query} as Pick<PoolClient,'query'>);
        const r=await (query as (...a:unknown[])=>Promise<unknown>)(...args);
        if(sql==='COMMIT'||sql==='ROLLBACK')transaction=false;return r;
      };
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});return wrapped;
  }
  return new Proxy(pool,{get(target,key){
    if(key==='connect')return client;
    if(key==='query')return async(...args:unknown[])=>{
      const sql=typeof args[0]==='string'?args[0]:'';
      if(!/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql))return (pool.query.bind(pool) as (...a:unknown[])=>Promise<unknown>)(...args);
      const c=await client();try{await c.query('BEGIN');const r=await (c.query.bind(c) as (...a:unknown[])=>Promise<unknown>)(...args);await c.query('COMMIT');return r;}
      catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
