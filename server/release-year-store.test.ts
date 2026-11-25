import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import { Store } from './store.ts';

test('years round-trip through existing metadata JSON; legacy/invalid entries omit them and exports exclude them', async () => {
  const owner='11111111-1111-4111-8111-111111111111';
  const id='a'.repeat(22);
  let payload: unknown;
  const client={query:async(sql:string,values:unknown[]=[])=>{
    if(sql.startsWith('INSERT INTO metadata_cache')) payload=values[3];
    if(sql.startsWith('SELECT i.')) return {rows:[{kind:'album',spotify_id:id,available:true,payload}]};
    if(sql.startsWith('SELECT count'))return {rows:[{count:'1'}]};
    return {rowCount:1,rows:[{blocked:false,binding:'invented',revision:'1',generation:'invented'}]};
  },release:()=>{}} as unknown as PoolClient;
  const pool={query:client.query.bind(client),connect:async()=>client} as unknown as Pool;
  const store=new Store(pool,owner,()=>100);
  await store.publishImport({account:owner,hash:'invented',csrf:'invented'},'album',{generation:'invented',accountGeneration:'invented'},[{id:`album:${id}`,kind:'album',artists:['Invented'],releaseYear:'1973',title:'Invented',available:true,source:'spotify',spotifyUrl:`https://open.spotify.com/album/${id}`,artworkUrl:null}],true);
  assert.equal((payload as {releaseYear:string}).releaseYear,'1973');
  const read=async()=>{const item=(await store.load(client,owner)).items[0]!;assert.ok(item.kind==='album');return item.releaseYear;};
  assert.equal(await read(),'1973');
  assert.doesNotMatch(JSON.stringify(await store.exportAt(client,owner,{binding:'invented',revision:'1'})),/releaseYear|1973/);
  for(const value of [undefined,'not a year',1973]){payload={title:'Invented',artists:[],releaseYear:value};assert.equal(await read(),null);}
  payload=null;assert.equal(await read(),null);
});
