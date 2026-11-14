// Operator-only recovery task. No shell/HTTP entry and no arbitrary command evaluation.
import { database } from './database.ts';
import { migrationConfig } from './hosted-config.ts';
import { AppendJournal } from './append-journal.ts';
import { JsonCipher, rotateSnapshots } from './lifecycle.ts';
import { reconcileRecovery, approveRecovery } from './journal.ts';

const timer=setTimeout(()=>{process.stderr.write('Task timed out\n');process.exit(1);},840000);
const pools:ReturnType<typeof database>[]=[];
try{
  const task=process.argv[2];if(!['reconcile','rotate-snapshots'].includes(task??''))throw Error('Unsupported task');
  const config=migrationConfig(process.env);
  const app=database({...config.databases.migration,options:'-c search_path=public'});pools.push(app);
  const jp=database({...config.databases.journalMigration,options:'-c search_path=public'});pools.push(jp);
  for(const p of pools)p.on('error',()=>{});
  const journal=new AppendJournal(jp,new JsonCipher(config.journalKeys,config.snapshots.current,'journal'));
  if(task==='reconcile'){
    const inventory=process.argv[3];
    if(!/^[a-f0-9]{64}$/.test(inventory??''))throw Error('Independent inventory required');
    const result=await reconcileRecovery(app,journal,inventory!,true);
    await approveRecovery(app,journal,result.receipt,true);
  }else{
    const cipher=new JsonCipher(config.snapshots.keys,config.snapshots.current,'snapshot');
    while(await rotateSnapshots(app,cipher)){}
  }
  process.stdout.write('Task complete\n');
}catch{process.stderr.write('Task failed\n');process.exitCode=1;}
finally{await Promise.allSettled(pools.map(p=>p.end()));clearTimeout(timer);}
