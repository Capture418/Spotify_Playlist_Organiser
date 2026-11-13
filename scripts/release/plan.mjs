import assert from 'node:assert/strict';
/** Pure argv plan: release verification must use exact image content, never host-built overlays. */
export function verificationPlan(args) {
 if(args.length===0)return {setup:false,exact:false,directory:'connected-e2e',owner:'music-connected-d054'};
 if(args.length===1&&args[0]==='setup')return {setup:true,exact:false,directory:'setup-e2e',owner:'music-setup-d056'};
 assert.equal(args.length,2,'Expected release and exact image ID');assert.equal(args[0],'release');
 assert.match(args[1],/^sha256:[a-f0-9]{64}$/,'An immutable local image ID is required');
 return {setup:true,exact:true,image:args[1],directory:'release-e2e',owner:'music-release-d057'};
}
export function runtimeMounts(plan,root) {
 return plan.exact?[]:['--mount',`type=bind,src=${root}/.work/runtime,dst=/app/runtime,readonly`];
}
