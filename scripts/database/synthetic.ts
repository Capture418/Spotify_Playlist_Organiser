import { FileJournal,DeletionCoordinator } from '../../server/journal.ts';
import { maintenance } from '../../server/lifecycle.ts';
import { journalCipher } from './support.ts';
import { readFile,stat } from 'node:fs/promises';
import { database,verifySchema } from '../../server/database.ts';
import { SyntheticStore as Store } from './support.ts';
import { appServer } from '../../server/http.ts';
import { createDemoLibrary } from '../../src/data/demo-library.ts';
const config=JSON.parse(await readFile(new URL('../../.local/synthetic-db.json',import.meta.url),'utf8'));
const pool=database({host:'127.0.0.1',port:55432,user:'organiser_app',password:config.app,database:process.argv.includes('--harness')?'organiser_test':'organiser',ssl:false});
await verifySchema(pool);
const store=new Store(pool,'00000000-0000-4000-8000-000000000001');
const journal=new FileJournal((await import('node:url')).fileURLToPath(new URL(process.argv.includes('--harness')?'../../.local/harness-deletions.json':'../../.local/synthetic-deletions.json',import.meta.url)),journalCipher);
try{await stat(journal.path);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'||!process.argv.includes('--initialise-journal'))throw Error('Verified synthetic journal required; explicit first-time initialisation only');await journal.initialise();}
await journal.read();store.deletion=new DeletionCoordinator(pool,journal);
const sweeper=await maintenance(pool,()=>{void pool.query('UPDATE recovery_guard SET blocked=true').catch(()=>server.close());});
const server=appServer(store,{origin:'http://127.0.0.1:4175',production:false,harness:process.argv.includes('--harness'),syntheticLogin:async()=>{const login=await store.issue(store.owner);store.snapshotsCipher=(await import('./support.ts')).snapshots;return login;},refresh:async s=>{
 const library=createDemoLibrary();for(const kind of ['playlist','album'] as const){const stamp=await store.beginImport(s,kind);await store.publishImport(s,kind,stamp,library.items.filter(i=>i.kind===kind),true);}
}});
server.listen(4175,'127.0.0.1',()=>console.log('Synthetic organiser on http://127.0.0.1:4175; invented data only.'));
for(const sig of ['SIGINT','SIGTERM'] as const)process.once(sig,()=>{sweeper.stop();server.close(()=>{void pool.end();});});
