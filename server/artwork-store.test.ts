import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool,PoolClient} from 'pg';
import {Store} from './store.ts';
test('cached artwork is validated, old and expired metadata degrade safely, exports omit images',async()=>{
 const owner='11111111-1111-4111-8111-111111111111';
 const store=new Store({} as Pool,owner,()=>100);
 const url='https://i.scdn.co/image/invented';
 const payload={source:'spotify',title:'Invented',artists:['Invented'],artworkUrl:url};
 const rows=[{kind:'album',spotify_id:'a'.repeat(22),available:true,payload},{kind:'album',spotify_id:'b'.repeat(22),available:true,payload:{...payload,artworkUrl:undefined}},{kind:'album',spotify_id:'c'.repeat(22),available:true,payload:null},{kind:'album',spotify_id:'d'.repeat(22),available:true,payload:{...payload,artworkUrl:'https://outside.invalid/image'}},{kind:'album',spotify_id:'e'.repeat(22),available:false,payload}];
 const calls:string[]=[];
 const client={query:async(sql:string)=>{calls.push(sql);return {rows:sql.startsWith('SELECT i.')?rows:[]};}} as unknown as PoolClient;
 const library=await store.load(client,owner);assert.deepEqual(library.items.map(x=>x.artworkUrl),[url,null,null,null,null]);assert.ok(calls[0]!.startsWith('DELETE FROM metadata_cache'));
 const exported=await store.exportAt(client,owner,{binding:'invented',revision:'1'});assert.doesNotMatch(JSON.stringify(exported),/artwork|scdn|Invented/);
});
