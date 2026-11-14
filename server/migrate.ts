import { pathToFileURL } from 'node:url';
import type { Pool, PoolConfig } from 'pg';
import { database, migrate, transaction } from './database.ts';
import { migrationConfig } from './hosted-config.ts';
import { migrateAppendJournal, verifyAppendJournal } from './append-journal.ts';
import { JsonCipher } from './lifecycle.ts';

export async function migrateHosted(env:NodeJS.ProcessEnv,open:(config:PoolConfig)=>Pool=database) {
  const config=migrationConfig(env);
  const pools:Pool[]=[];
  try {
    const app=open({...config.databases.migration,options:'-c search_path=public'});pools.push(app);
    const journal=open({...config.databases.journalMigration,options:'-c search_path=public'});pools.push(journal);
    for(const pool of pools)pool.on('error',()=>{});
    await migrateAppendJournal(journal);
    const identity=await verifyAppendJournal(journal);
    await migrate(app,3,new JsonCipher(config.snapshots.keys,config.snapshots.current,'snapshot'),true);
    await transaction(app,async c=>{
      await c.query('CREATE TABLE IF NOT EXISTS public.hosted_journal_binding(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),identity uuid NOT NULL)');
      const existing=await c.query('SELECT identity FROM public.hosted_journal_binding');
      if(existing.rows.length===0){
        const data=await c.query('SELECT (SELECT count(*) FROM accounts)+(SELECT count(*) FROM deletion_records) AS n');
        if(Number(data.rows[0].n)!==0)throw Error('Existing data needs explicit journal adoption');
        await c.query('INSERT INTO public.hosted_journal_binding VALUES(true,$1)',[identity]);
      }
      else if(existing.rows.length!==1||existing.rows[0].identity!==identity)throw Error('Journal binding mismatch');
    });
  } finally {await Promise.all(pools.map(p=>p.end()));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const timer=setTimeout(()=>{process.stderr.write('Migration timed out\n');process.exit(1);},840000);
  try {await migrateHosted(process.env);process.stdout.write('Migration complete\n');}
  catch{process.stderr.write('Migration failed\n');process.exitCode=1;}
  finally{clearTimeout(timer);}
}
