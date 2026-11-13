import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verificationPlan,runtimeMounts} from './release/plan.mjs';
test('exact-image rehearsal uses immutable ID and no runtime overlay',()=>{
 const image='sha256:'+'a'.repeat(64),p=verificationPlan(['release',image]);assert.equal(p.image,image);assert.equal(p.setup,true);assert.deepEqual(runtimeMounts(p,'/invented'),[]);
 assert.notEqual(p.owner,verificationPlan(['setup']).owner);assert.ok(runtimeMounts(verificationPlan(['setup']),'/invented').join(' ').includes('/app/runtime'));
});
test('release plan refuses tags, malformed IDs, extra arguments and unknown modes',()=>{
 for(const args of [['release'],['release','latest'],['release','sha256:abcd'],['release','sha256:'+'a'.repeat(64),'extra'],['deploy'],['setup','extra']])assert.throws(()=>verificationPlan(args));
});
