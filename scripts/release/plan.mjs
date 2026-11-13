import assert from 'node:assert/strict';
/** Current single-database rehearsal only. Historical modes cannot select obsolete infrastructure. */
export function verificationPlan(args) {
 assert.equal(args.length,2,'Expected platform and exact image ID');
 assert.equal(args[0],'platform','Historical rehearsal modes are superseded');
 assert.match(args[1],/^sha256:[a-f0-9]{64}$/,'An immutable local image ID is required');
 return {setup:true,exact:true,image:args[1],directory:'platform-e2e',owner:'music-platform-d061'};
}
export function runtimeMounts(plan,root) {
 assert.equal(plan.exact,true);assert.ok(root);
 return [];
}
