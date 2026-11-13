import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verificationPlan,runtimeMounts} from './release/plan.mjs';
test('single-database rehearsal uses immutable image, dedicated receipt and no runtime overlay',()=>{
 const image='sha256:'+'a'.repeat(64),p=verificationPlan(['platform',image]);
 assert.equal(p.image,image);assert.equal(p.directory,'platform-e2e');assert.equal(p.owner,'music-platform-d061');assert.deepEqual(runtimeMounts(p,'/invented'),[]);
 assert.throws(()=>runtimeMounts({exact:false},'/invented'));
});
test('single-database plan refuses old modes, mutable images and extra arguments',()=>{
 for(const args of [[],['setup'],['release','sha256:'+'a'.repeat(64)],['platform'],['platform','latest'],['platform','sha256:abcd'],['platform','sha256:'+'a'.repeat(64),'extra'],['deploy']])assert.throws(()=>verificationPlan(args));
});
