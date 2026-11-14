import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './database.ts';
import { JsonCipher } from './lifecycle.ts';
import { validateJournal } from './journal.ts';
import type { Deletion, Journal } from './journal.ts';
import { requireValue } from './validation.ts';
const definition = `CREATE TABLE public.journal_identity(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), id uuid NOT NULL);
CREATE TABLE public.journal_events(operation uuid NOT NULL, state text NOT NULL CHECK(state IN ('intent','complete')), payload jsonb NOT NULL, PRIMARY KEY(operation,state));`;
const checksum=createHash('sha256').update(definition).digest('hex');
export async function migrateAppendJournal(pool:Pool) {
  await transaction(pool,async c=>{
    await c.query('SELECT pg_advisory_xact_lock(47174176)');
    const tables=await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if(!tables.rows.length){
      await c.query('CREATE TABLE public.append_journal_migrations(version integer PRIMARY KEY,checksum text NOT NULL)');
      await c.query(definition);
      await c.query('INSERT INTO public.journal_identity VALUES(true,$1)',[randomUUID()]);
      await c.query('INSERT INTO public.append_journal_migrations VALUES(1,$1)',[checksum]);
    }
    const version=await c.query('SELECT version,checksum FROM public.append_journal_migrations ORDER BY version');
    requireValue(version.rows.length===1&&version.rows[0].version===1&&version.rows[0].checksum===checksum,'Journal schema mismatch');
  });
  await verifyAppendJournal(pool);
}
export async function verifyAppendJournal(pool:Pool) {
  const version=await pool.query('SELECT version,checksum FROM public.append_journal_migrations ORDER BY version');
  requireValue(version.rows.length===1&&version.rows[0].version===1&&version.rows[0].checksum===checksum,'Journal schema mismatch');
  const identity=await pool.query('SELECT id FROM public.journal_identity WHERE singleton=true');
  requireValue(identity.rows.length===1,'Journal identity missing');
  await pool.query('SELECT operation,state,payload FROM public.journal_events LIMIT 0');
  return String(identity.rows[0].id);
}
/** Runtime permissions are SELECT and INSERT only, including idempotent retries. */
export class AppendJournal implements Journal {
  readonly pool:Pool;readonly cipher:JsonCipher;
  constructor(pool:Pool,cipher:JsonCipher){this.pool=pool;this.cipher=cipher;}
  async read():Promise<Deletion[]> {
    await verifyAppendJournal(this.pool);
    const result=await this.pool.query('SELECT operation,state,payload FROM public.journal_events ORDER BY operation,state');
    requireValue(result.rows.length<=2000,'Journal capacity reached');
    const records=new Map<string,Deletion>();
    for(const row of result.rows){
      const [record]=validateJournal([this.cipher.decrypt(row.payload,`${row.operation}/${row.state}`)]);
      requireValue(record!.operation===row.operation&&record!.state===row.state,'Journal identity mismatch');
      const old=records.get(row.operation);
      if(old)requireValue(old.account===record!.account&&old.deletedAt===record!.deletedAt,'Journal conflict');
      if(!old||record!.state==='complete')records.set(row.operation,record!);
    }
    return [...records.values()];
  }
  async put(record:Deletion) {
    validateJournal([record]);
    await transaction(this.pool,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(47174177)');
      const old=await c.query('SELECT payload FROM public.journal_events WHERE operation=$1 AND state=$2',[record.operation,record.state]);
      if(old.rows.length){requireValue(JSON.stringify(this.cipher.decrypt(old.rows[0].payload,`${record.operation}/${record.state}`))===JSON.stringify(record),'Journal conflict');return;}
      const siblings=await c.query('SELECT state,payload FROM public.journal_events WHERE operation=$1',[record.operation]);
      for(const row of siblings.rows){const [r]=validateJournal([this.cipher.decrypt(row.payload,`${record.operation}/${row.state}`)]);requireValue(r!.account===record.account&&r!.deletedAt===record.deletedAt,'Journal conflict');}
      const count=await c.query('SELECT count(*) AS n FROM public.journal_events');
      requireValue(Number(count.rows[0].n)<2000,'Journal capacity reached');
      await c.query('INSERT INTO public.journal_events(operation,state,payload) VALUES($1,$2,$3)',[record.operation,record.state,this.cipher.encrypt(record,`${record.operation}/${record.state}`)]);
    });
  }
}
