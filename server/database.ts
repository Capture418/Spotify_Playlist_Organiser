import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import type { JsonCipher } from './lifecycle.ts';
import type { PoolClient, PoolConfig } from 'pg';
export function database(config: PoolConfig): Pool {
 if (process.env.NODE_PG_FORCE_NATIVE || !config.host || !config.user || !config.database || !config.password || config.connectionString) throw Error('Explicit database settings required');
 return new Pool({...config,max:4,connectionTimeoutMillis:3000,statement_timeout:10000,idle_in_transaction_session_timeout:15000});
}
export async function transaction<T>(pool: Pool, work: (c: PoolClient)=>Promise<T>): Promise<T> {
 const c=await pool.connect();try {await c.query('BEGIN');const value=await work(c);await c.query('COMMIT');return value;}catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
export async function migrate(pool: Pool, maximum=3,snapshots?:JsonCipher): Promise<void> {
 await transaction(pool,async c=>{
  await c.query('SELECT pg_advisory_xact_lock(47174174)');
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied=await c.query<{version:number;checksum:string}>('SELECT version,checksum FROM schema_migrations ORDER BY version');
  const paths=(await readdir(new URL('./migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
  if(applied.rows.some(x=>x.version>maximum))throw Error('Incompatible schema');
  for(const path of paths){const version=Number(path.split('-')[0]);if(version>maximum)continue;const sql=await readFile(new URL('./migrations/'+path,import.meta.url),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');const previous=applied.rows.find(x=>x.version===version);if(previous){if(previous.checksum!==checksum)throw Error('Applied migration checksum mismatch');continue;}await c.query(sql);
   if(version===3){const rows=await c.query('SELECT * FROM restore_snapshots');if(rows.rowCount&&!snapshots)throw Error('Snapshot encryption required for migration');for(const row of rows.rows)await c.query('UPDATE restore_snapshots SET payload=$3,encrypted=true WHERE account_id=$1 AND id=$2',[row.account_id,row.id,snapshots!.encrypt(row.payload,`${row.account_id}/${row.id}/${row.revision}`)]);}
   await c.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);}
  await c.query('GRANT SELECT ON schema_migrations TO organiser_app');
 });
}
export async function verifySchema(pool: Pool) {const r=await pool.query('SELECT version,checksum FROM schema_migrations ORDER BY version');if(r.rows.map(x=>x.version).join(',')!=='1,2,3')throw Error('Incompatible schema');for(const name of (await readdir(new URL('./migrations/',import.meta.url))).filter(x=>x.endsWith('.sql'))){const version=Number(name.split('-')[0]);const sql=await readFile(new URL('./migrations/'+name,import.meta.url),'utf8');if(r.rows.find(x=>x.version===version)?.checksum!==createHash('sha256').update(sql).digest('hex'))throw Error('Applied migration checksum mismatch');}const legacy=await pool.query('SELECT 1 FROM restore_snapshots WHERE NOT encrypted LIMIT 1');if(legacy.rowCount)throw Error('Unconverted snapshot');}
