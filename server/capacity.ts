import type { Pool, PoolClient } from 'pg';
import { Fault } from './validation.ts';
const tables='accounts sessions connections items metadata_cache tags assignments mutation_receipts restore_snapshots restore_previews collection_generations deletion_records recovery_guard hosted_journal_binding'.split(' ');
export const maxStorageBytes=3*1024*1024;
export const maxDumpDataBytes=4_000_000;
export const maxStorageRows=12000;
// JSON row text overcounts these fixed scalar/JSONB columns. Counting each
// backslash once more also bounds COPY text escaping; reserve 1 MB for schema,
// migration records, COPY headers and encryption within the host's 5 MB cap.
export const capacitySQL='SELECT sum(bytes)::text AS bytes,sum(dump_bytes)::text AS dump_bytes,sum(rows)::text AS rows FROM ('+tables.map(t=>`SELECT coalesce(sum(octet_length(encoded)),0) AS bytes,coalesce(sum(2*octet_length(encoded)-octet_length(replace(encoded,chr(92),''))),0) AS dump_bytes,count(*) AS rows FROM public.${t} t CROSS JOIN LATERAL (SELECT row_to_json(t)::text AS encoded) row_data`).join(' UNION ALL ')+') sizes';
export async function checkCapacity(client:Pick<PoolClient,'query'>){
  const r=await client.query(capacitySQL),usage=r.rows[0];
  const values=[Number(usage?.bytes),Number(usage?.dump_bytes),Number(usage?.rows)] as const;
  if(values.some(value=>!Number.isSafeInteger(value)||value<0)||values[0]>maxStorageBytes||values[1]>maxDumpDataBytes||values[2]>maxStorageRows)throw new Fault(507,'Storage capacity reached; export your organisation and contact the operator');
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
