import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EditAttempt} from './edit-attempt.ts';
test('editing pins the opening revision; uncertain retries keep payload and id; reapply is deliberate',()=>{const attempt=new EditAttempt();const edit={mode:'single' as const,itemIds:['album:invented'],tagIds:[],newTags:[]};attempt.begin('4');const first=attempt.request(edit,'5');assert.equal(first.revision,'4');const retry=attempt.request({...edit,itemIds:['album:changed']},'6');assert.deepEqual(retry,first);const reapply=attempt.request(edit,'6',true);assert.equal(reapply.revision,'6');assert.notEqual(reapply.requestId,first.requestId);attempt.cancel();assert.throws(()=>attempt.request(edit,'6'));});
