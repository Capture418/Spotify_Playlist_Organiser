// D054 local-only, cached artifacts and disposable resources. No build, pull or installation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
const plan=verificationPlan(process.argv.slice(2)),setupMode=plan.setup;
const directory=resolve(root,'.work',plan.directory);mkdirSync(directory,{recursive:true});
const receipt=resolve(directory,'receipt.json');assert.ok(!existsSync(receipt),'Existing receipt needs review before another run');
const docker='/Applications/Docker.app/Contents/Resources/bin/docker';
function execute(args,input){if(args[0]==='container'&&args[1]==='create'&&args.includes('/app/verification/runtime-check.mjs'))args=[...args.slice(0,2),...runtimeMounts(plan,root.replace(/\/$/,'')),...args.slice(2)];args=args.map(arg=>arg===postgres?'postgres@'+postgres.split('@')[1]:arg);return execFileSync(docker,['--context','desktop-linux',...args],{cwd:root,env:{PATH:process.env.PATH,HOME:homedir()},encoding:'utf8',stdio:['pipe','pipe','pipe'],input,timeout:120000,maxBuffer:8*1024*1024});}
assert.equal(JSON.parse(execute(['context','inspect','desktop-linux']))[0].Endpoints.docker.Host,'unix://'+resolve(homedir(),'.docker/run/docker.sock'));
const image=JSON.parse(execute(['image','inspect',plan.image??'spotify-organiser-verification:phase2']))[0].Id;
if(plan.exact)assert.equal(image,plan.image,'Image identity changed');
const owner=plan.owner;
const config={root,image,owner,network:owner+'-net',volume:owner+'-db',db:owner+'-postgres'};
const state={owner,resources:[]};
const save=s=>writeFileSync(receipt,JSON.stringify(s),{mode:0o600});
save(state);
const job=launcher(config,execute,save,state,console.log);
try{
 await job.setup();
 let ready=false;
 for(let i=0;i<30;i++){try{execute(['exec',state.db,'psql','-XAt','-U','postgres','-d','music_journal','-c','SELECT 1']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 assert.ok(ready,'Database did not become ready');
 const id=execute(['container','create','--name',owner+'-app','--label','organiser.ci='+owner,'--pull','never','--platform','linux/amd64','--network',config.network,'--user','1000:1000','--read-only','--tmpfs','/tmp:size=67108864,mode=1777','--memory','512m','--cpus','1','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','128','-e','CONNECTED_DISPOSABLE=synthetic-only',...(plan.exact?['-e','INITIALISATION_DISPOSABLE=synthetic-only']:[]),...(setupMode?['-e','SETUP_DISPOSABLE=synthetic-only']:[]),...runtimeMounts(plan,root.replace(/\/$/,'')),'--mount',`type=bind,src=${resolve(root,'scripts/database/connected.mjs')},dst=/app/verification/connected.mjs,readonly`,'--entrypoint','node',image,'/app/verification/connected.mjs']).trim();
 const found=JSON.parse(execute(['container','inspect',id]))[0];assert.equal(found.Config.Labels['organiser.ci'],owner);assert.equal(found.Id,id);
 state.resources.push({kind:'container',id});save(state);
 assert.equal(found.HostConfig.ReadonlyRootfs,true);assert.equal(Object.keys(found.HostConfig.PortBindings??{}).length,0);
 const output=execute(['start','-a',id]);writeFileSync(resolve(directory,'scenarios.log'),output);console.log(output);
 assert.equal(JSON.parse(execute(['container','inspect',id]))[0].State.ExitCode,0,'Connected scenarios failed');
}finally{await job.cleanup();}
