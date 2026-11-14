// D061 preparation. Execution separately gated; cached exact image and disposable resources only.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificationPlan, runtimeMounts } from '../release/plan.mjs';
import { launcher, postgres } from '../ci/launcher.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.platform,'darwin');
assert.equal(process.env.CONNECTED_DISPOSABLE_APPROVED,'synthetic-only');
for(const name of Object.keys(process.env))assert.ok(!/^(APP_|ORGANISER_|SPOTIFY_|SETUP_|PG|DOCKER_)/.test(name)&&!name.endsWith('DATABASE_URL'),'Refuse inherited operational configuration');
const plan=verificationPlan(process.argv.slice(2));
const directory=resolve(root,'.work',plan.directory);mkdirSync(directory,{recursive:true});
const receipt=resolve(directory,'receipt.json');assert.ok(!existsSync(receipt),'Existing receipt needs review before another run');
const docker='/Applications/Docker.app/Contents/Resources/bin/docker';
function execute(args,input){if(args[0]==='logs'){const r=spawnSync(docker,['--context','desktop-linux',...args],{cwd:root,env:{PATH:process.env.PATH,HOME:homedir()},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error('Log capture failed');return r.stdout+r.stderr;}if(args[0]==='container'&&args[1]==='create'&&args.includes('/app/verification/runtime-check.mjs'))args=[...args.slice(0,2),...runtimeMounts(plan,root.replace(/\/$/,'')),...args.slice(2)];args=args.map(arg=>arg===postgres?'postgres@'+postgres.split('@')[1]:arg);return execFileSync(docker,['--context','desktop-linux',...args],{cwd:root,env:{PATH:process.env.PATH,HOME:homedir()},encoding:'utf8',stdio:['pipe','pipe','pipe'],input,timeout:120000,maxBuffer:8*1024*1024});}
assert.equal(JSON.parse(execute(['context','inspect','desktop-linux']))[0].Endpoints.docker.Host,'unix://'+resolve(homedir(),'.docker/run/docker.sock'));
const image=JSON.parse(execute(['image','inspect',plan.image]))[0].Id;
if(plan.exact)assert.equal(image,plan.image,'Image identity changed');
const owner=plan.owner;
const config={root,image,owner,network:owner+'-net',volume:owner+'-db',db:owner+'-postgres',hosted:true};
const state={owner,resources:[]};
const save=s=>writeFileSync(receipt,JSON.stringify(s),{mode:0o600});
save(state);
const job=launcher(config,execute,save,state,console.log);
try{
 await job.setup();
 await job.platformExercise();
}finally{await job.cleanup();}
