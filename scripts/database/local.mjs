import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import pg from 'pg';
export const root = fileURLToPath(new URL('../../', import.meta.url));
const local = join(root, '.local');
export const bin = join(root, '.work/tools/Postgres.app/Contents/Versions/18/bin');
export function credentials() { return JSON.parse(readFileSync(join(local, 'synthetic-db.json'), 'utf8')); }
export function config(role = 'app', recovery = false, database = 'organiser_test') {
 const secret = credentials();
 return { host: '127.0.0.1', port: recovery ? 55433 : 55432, user: `organiser_${role}`, password: secret[role], database, ssl: false, connectionTimeoutMillis: 3000, statement_timeout: 10000, application_name: 'organiser-synthetic' };
}
function cluster(recovery) { return join(local, recovery ? 'postgres-recovery' : 'postgres-data'); }
function run(name, args, input) {
 const env = {PATH:'/usr/bin:/bin', LANG:'en_US.UTF-8', TMPDIR:join(local,'tmp')};
 const result = spawnSync(join(bin,name), args, {env, input, encoding:'utf8', timeout:60000});
 if (result.status !== 0) throw new Error(`${name} failed; inspect project database log (no credentials logged).`);
 return result.stdout;
}
async function free(port) { await new Promise((ok,bad)=>{const s=createServer();s.once('error',bad);s.listen(port,'127.0.0.1',()=>s.close(ok));}); }
export async function initialise() {
 mkdirSync(local,{recursive:true,mode:0o700});mkdirSync(join(local,'tmp'),{recursive:true,mode:0o700});
 const path=join(local,'synthetic-db.json');
 if(!existsSync(path)) writeFileSync(path,JSON.stringify(Object.fromEntries(['admin','migrator','app'].map(x=>[x,randomBytes(32).toString('hex')]))),{mode:0o600,flag:'wx'});
 for(const recovery of [false,true]) {
  const data=cluster(recovery); if(existsSync(data)) {if(!existsSync(join(data,'PG_VERSION')))throw Error('Refusing existing non-cluster directory');continue;}
  await free(recovery?55433:55432);
  const password=join(local,'init-password');writeFileSync(password,credentials().admin,{mode:0o600});
  try {run('initdb',['-D',data,'-U','organiser_admin','--pwfile='+password,'--auth-local=scram-sha-256','--auth-host=scram-sha-256','--encoding=UTF8','--locale=C']);}
  finally { const {unlinkSync}=await import('node:fs');unlinkSync(password); }
  const socket=join(local,recovery?'recovery-socket':'postgres-socket');mkdirSync(socket,{mode:0o700});
  writeFileSync(join(data,'postgresql.conf'),`listen_addresses = '127.0.0.1'\nport = ${recovery?55433:55432}\nunix_socket_directories = '${socket.replaceAll("'","''")}'\npassword_encryption = 'scram-sha-256'\nmax_connections = 20\nshared_buffers = '32MB'\nlog_statement = 'none'\nlog_min_error_statement = 'panic'\nlog_connections = off\nlog_disconnections = off\n`);
  writeFileSync(join(data,'pg_hba.conf'),'local all all scram-sha-256\nhost all all 127.0.0.1/32 scram-sha-256\n');
 }
}
export async function start(recovery=false) {
 const data=cluster(recovery);if(realpathSync(data)!==data)throw Error('Unexpected data directory');
 if(existsSync(join(data,'postmaster.pid')))throw Error('Cluster already has a PID file; verify before reuse');
 await free(recovery?55433:55432);
 run('pg_ctl',['-D',data,'-l',join(local,recovery?'postgres-recovery.log':'postgres.log'),'-w','start']);
 const c=new pg.Client(config('admin',recovery,'postgres'));await c.connect();
 try {
  const result=await c.query('show data_directory');if(result.rows[0].data_directory!==data)throw Error('Wrong cluster');
  for(const role of ['migrator','app']) {
   const name=`organiser_${role}`; const found=await c.query('select 1 from pg_roles where rolname=$1',[name]);
   if(!found.rowCount)await c.query(`CREATE ROLE ${pg.escapeIdentifier(name)} LOGIN PASSWORD ${pg.escapeLiteral(credentials()[role])} NOSUPERUSER NOCREATEDB NOCREATEROLE`);
  }
  for(const name of recovery?['organiser_recovery']:['organiser','organiser_test']) {
   const found=await c.query('select 1 from pg_database where datname=$1',[name]);
   if(!found.rowCount)await c.query(`CREATE DATABASE ${pg.escapeIdentifier(name)} OWNER organiser_migrator`);
   await c.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(name)} FROM PUBLIC`);
   await c.query(`GRANT CONNECT ON DATABASE ${pg.escapeIdentifier(name)} TO organiser_app`);
  }
 } finally {await c.end();}
}
export async function stop(recovery=false, immediate=false) {
 const data=cluster(recovery), pid=join(data,'postmaster.pid');if(!existsSync(pid))return;
 if(realpathSync(data)!==data || readFileSync(pid,'utf8').split('\n')[1]!==data)throw Error('Wrong cluster PID');
 run('pg_ctl',['-D',data,'-m',immediate?'immediate':'fast','-w','stop']);
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try {const action=process.argv[2];if(action==='init')await initialise();else if(action==='start'){await start();await start(true);}else if(action==='stop'){await stop();await stop(true);}else throw Error('Use init, start or stop');console.log('Synthetic database action complete.');}
 catch {console.error('Synthetic database action failed; no automatic reset or foreign service action.');process.exitCode=1;}
}
