import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {Pool} from 'pg';
import {releaseDependencies} from './release-dependencies.ts';
test('release dependencies are inert and attach an idle pool error handler without logging',()=>{
 let calls=0;const pool=new EventEmitter();
 const deps=releaseDependencies(async()=>{throw Error('Unexpected request');},()=>{calls++;return pool as Pool;});
 assert.equal(calls,0);assert.equal(deps.pool({}),pool);assert.equal(calls,1);
 assert.doesNotThrow(()=>pool.emit('error',Error('invented private connection detail')));
});
test('release transport permits only approved read and token destinations and disallows redirects',async()=>{
 const calls:string[]=[];const signal=new AbortController().signal;
 const deps=releaseDependencies(async(url,init)=>{calls.push(url);assert.equal(init.redirect,'error');assert.equal(init.signal,signal);return Response.json({});});
 for(const url of ['https://api.spotify.com/v1/me','https://api.spotify.com/v1/me/playlists?limit=50&offset=0','https://api.spotify.com/v1/me/albums?limit=10&offset=10'])await deps.transport(url,{signal});
 await deps.transport('https://accounts.spotify.com/api/token',{method:'POST',signal,redirect:'follow'});
 assert.equal(calls.length,4);
 for(const url of ['http://api.spotify.com/v1/me','https://api.spotify.com.evil.invalid/v1/me','https://api.spotify.com/v1/me?extra=yes','https://api.spotify.com/v1/me/player','https://other.invalid/'])await assert.rejects(deps.transport(url,{signal}));
 await assert.rejects(deps.transport('https://api.spotify.com/v1/me',{method:'DELETE',signal}));
 await assert.rejects(deps.transport('https://api.spotify.com/v1/me',{}));assert.equal(calls.length,4);
});
test('release transport suppresses underlying errors and preserves cancellation signal',async()=>{
 const signal=AbortSignal.abort();const deps=releaseDependencies(async(_url,init)=>{assert.equal(init.signal,signal);throw Error('invented token in URL');});
 await assert.rejects(deps.transport('https://api.spotify.com/v1/me',{signal}),{message:'Spotify transport unavailable'});
});
