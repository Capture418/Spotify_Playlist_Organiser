import type { Pool, PoolConfig } from 'pg';
import { capacityPool } from './capacity.ts';
import { hostedConfig } from './hosted-config.ts';
import { verifySchema } from './database.ts';
import { AppendJournal, verifyAppendJournal } from './append-journal.ts';
import { JsonCipher } from './lifecycle.ts';
import { bounded, CredentialStore } from './security.ts';
import { Store } from './store.ts';
import { Setup, setupStore } from './setup.ts';
import { setupServer } from './setup-http.ts';
import { SpotifyTransport } from './spotify.ts';
import type { Transport } from './spotify.ts';
import { preparedListener } from './application.ts';
import { preparedApplication } from './integration.ts';
import type { PreparedListener } from './startup.ts';

/** Runtime opens only row-limited connections. No migration import or owner credential. */
export async function startHosted(env:NodeJS.ProcessEnv,deps:{pool:(c:PoolConfig)=>Pool;transport:Transport},local=false) {
  const config=hostedConfig(env,local);
  if(env.SETUP_MODE!==undefined&&env.SETUP_MODE!=='1')throw Error('Invalid setup mode');
  if(env.SETUP_MODE==='1'?!/^[A-Za-z0-9_-]{43,128}$/.test(env.SETUP_TOKEN??''):env.SETUP_TOKEN!==undefined)throw Error('Invalid setup configuration');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),150000);
  const pools:Pool[]=[];let listener:PreparedListener|undefined,closing:Promise<void>|undefined;
  const close=()=>closing??=(async()=>{controller.abort();try{await listener?.close();}finally{await Promise.all(pools.map(p=>p.end()));}})();
  try {
    const app=capacityPool(deps.pool({...config.databases.runtime,options:'-c search_path=public'}));pools.push(app);
    const jp=deps.pool({...config.journalDatabase,options:'-c search_path=public'});pools.push(jp);
    await bounded(controller.signal,async()=>{
      await verifySchema(app);const identity=await verifyAppendJournal(jp);
      const binding=await app.query('SELECT identity FROM public.hosted_journal_binding');
      if(binding.rows.length!==1||binding.rows[0].identity!==identity)throw Error('Journal binding mismatch');
      const journal=new AppendJournal(jp,new JsonCipher(config.journalKeys,config.snapshots.current,'journal'));
      const records=await journal.read();
      // An independent journal survives app-only restores; fence resurrected owners before serving.
      const active=await app.query('SELECT id FROM accounts');
      if(active.rows.some(row=>records.some(r=>r.account===row.id))){await app.query('UPDATE recovery_guard SET blocked=true');throw Error('Recovery required');}
      const guard=await app.query('SELECT blocked FROM recovery_guard');
      if(guard.rows.length!==1||guard.rows[0].blocked!==false)throw Error('Recovery required');
      const health=()=>Promise.all([app.query('SELECT 1'),jp.query('SELECT 1')]);
      const spotify=new SpotifyTransport(config.clientId,config.callback,deps.transport);
      if(env.SETUP_MODE==='1'){
        const setup=new Setup(env.SETUP_TOKEN!,config.owner,spotify,setupStore(app,config.owner,journal));
        listener=preparedListener(setupServer(setup,config.origin,health,local),()=>setup.close());
      }else{
        const store=new Store(app,config.owner.account);store.snapshotsCipher=new JsonCipher(config.snapshots.keys,config.snapshots.current,'snapshot');
        const application=await preparedApplication(store,config.owner,spotify,new CredentialStore(app,config.credentials.keys,config.credentials.current),journal,{localOAuth:local,health});
        listener=preparedListener(application.server,application.dispose);
      }
      if(controller.signal.aborted){await listener.close();throw Error('Startup cancelled');}
      await health();await listener.listen(config.port,'0.0.0.0',controller.signal);
    });
    clearTimeout(timer);return {close};
  }catch{clearTimeout(timer);await close().catch(()=>{});throw Error('Hosted startup failed');}
}
