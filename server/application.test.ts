import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import { preparedListener, startIntegratedApplication } from './application.ts';
import type { preparedApplication } from './integration.ts';
import type { PostgresJournal } from './postgres-journal.ts';
const env = ():NodeJS.ProcessEnv => ({
 NODE_ENV:'production', PORT:'3000', DATABASE_URL:'postgres://app:invented@db/music', MIGRATION_DATABASE_URL:'postgres://migrator:invented@db/music',
 JOURNAL_DATABASE_URL:'postgres://journal:invented@db/music_journal', JOURNAL_MIGRATION_DATABASE_URL:'postgres://journal_migrator:invented@db/music_journal',
 ORGANISER_ORIGIN:'https://music.example.invalid',ORGANISER_CALLBACK:'https://music.example.invalid/callback',ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32),
 ORGANISER_CREDENTIAL_KEYS:'v1:'+'11'.repeat(32),ORGANISER_CREDENTIAL_CURRENT:'v1',ORGANISER_SNAPSHOT_KEYS:'v1:'+'22'.repeat(32),ORGANISER_SNAPSHOT_CURRENT:'v1',ORGANISER_JOURNAL_KEYS:'v1:'+'33'.repeat(32),ORGANISER_JOURNAL_CURRENT:'v1',
});
function fakeServer(failure=false) {
 const events:string[]=[];
 const server=Object.assign(new EventEmitter(),{listening:false,
  listen:(_options:unknown,ready:()=>void)=>{events.push('listen');if(failure)server.emit('error',Error('invented private detail'));else{server.listening=true;ready();}},
  close:(done:(error?:Error)=>void)=>{events.push('close');server.listening=false;done();},
  closeAllConnections:()=>{events.push('connections closed');},
 });
 return {server:server as unknown as Server,events};
}
test('integrated composition validates before resources and binds owner, purpose keys and explicit transport',async()=>{
 let opened=0, composed=0, sent=0, disposed=0;
 const pool={} as Pool, journal={} as PostgresJournal, fake=fakeServer();
 const dependencies:Parameters<typeof startIntegratedApplication>[1]={
  pool:()=>{opened++;return pool;},transport:async()=>{sent++;throw Error('No live transport');},
  application:async(store,owner,spotify,vault,givenJournal)=>{
   composed++;assert.equal(store.pool,pool);assert.equal(vault.pool,pool);assert.equal(store.owner,owner.account);
   assert.equal(owner.binding,'invented-owner');assert.equal(store.snapshotsCipher?.purpose,'snapshot');
   assert.notDeepEqual(store.snapshotsCipher?.keys.get('v1'),vault.keys.get('v1'));
   assert.equal(spotify.callback,env().ORGANISER_CALLBACK);assert.equal(givenJournal,journal);
   return {server:fake.server,dispose:()=>{disposed++;}} as Awaited<ReturnType<typeof preparedApplication>>;
  },
  start:async(_env,ciphers,options)=>{
   assert.equal(ciphers.journal.purpose,'journal');assert.equal(ciphers.snapshots.purpose,'snapshot');
   assert.notDeepEqual(ciphers.journal.keys.get('v1'),ciphers.snapshots.keys.get('v1'));
   options.pool({});const listener=await options.compose(pool,journal,new AbortController().signal);
   await listener.listen(3000,'0.0.0.0',new AbortController().signal);return {close:listener.close,journal};
  },
 };
 await assert.rejects(startIntegratedApplication({...env(),ORGANISER_OWNER:''},dependencies));
 assert.equal(opened,0);assert.equal(composed,0);
 const running=await startIntegratedApplication(env(),dependencies);assert.equal(composed,1);assert.equal(sent,0);
 await running.close();await running.close();assert.equal(disposed,1);assert.deepEqual(fake.events,['listen','close','connections closed']);
});
test('listener failures and aborted startup do not expose raw errors and still dispose maintenance',async()=>{
 const fake=fakeServer(true);let disposed=0;
 const listener=preparedListener(fake.server,()=>{disposed++;});
 await assert.rejects(listener.listen(3000,'0.0.0.0',new AbortController().signal),{message:'Listener failed'});
 await listener.close();await listener.close();assert.equal(disposed,1);assert.equal(fake.server.listenerCount('error'),0);
 const cancelled=fakeServer();const c=new AbortController();c.abort();
 const another=preparedListener(cancelled.server,()=>{});await assert.rejects(another.listen(3000,'0.0.0.0',c.signal),/cancelled/);
 assert.deepEqual(cancelled.events,[]);await another.close();
});
test('listener wait rejects cancellation and removes temporary event listeners',async()=>{
 const server=Object.assign(new EventEmitter(),{listening:false,listen:()=>{}}) as unknown as Server;
 const c=new AbortController();const listener=preparedListener(server,()=>{});
 const listening=listener.listen(3000,'0.0.0.0',c.signal);c.abort();await assert.rejects(listening,/cancelled/);
 assert.equal(server.listenerCount('error'),0);await listener.close();
});
