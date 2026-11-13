// Explicit local orchestration for D033. No downloads, remote contexts or real settings.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const evidence = resolve(root, '.work/docker-verification/stage-c');
const docker = '/Applications/Docker.app/Contents/Resources/bin/docker';
const project = 'spotify-organiser-verify', volume = project + '_music-db';
const compose = ['compose', '--env-file', resolve(evidence, 'synthetic.env'), '-p', project, '-f', resolve(root, 'scripts/database/stage-c.compose.yml')];
function run(args, options = {}) { return execFileSync(docker, ['--context', 'desktop-linux', ...args], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, ...options }); }
function c(args, options) { return run([...compose, ...args], options); }
function id(service) { const value = c(['ps', '-a', '-q', service]).trim(); assert.match(value, /^[a-f0-9]{12,64}$/); return value; }
function inspect(resource, name) { return JSON.parse(run([resource, 'inspect', name]))[0]; }
function safeResources() {
  const state = JSON.parse(readFileSync(resolve(evidence, 'identity.json'), 'utf8'));
  const v = inspect('volume', volume);
  assert.equal(v.CreatedAt, state.volumeCreatedAt); assert.equal(v.Labels['com.docker.compose.project'], project);
  assert.equal(v.Labels['organiser.purpose'], 'stage-c-disposable');
  const db = inspect('container', id('db'));
  assert.equal(db.Id, state.databaseContainer); assert.equal(db.Config.Labels['com.docker.compose.project'], project);
  assert.equal(db.Mounts.find(m => m.Destination === '/var/lib/postgresql/data').Name, volume);
  assert.equal(db.HostConfig.PortBindings['5432/tcp'][0].HostIp, '127.0.0.1');
  return db.Id;
}
function sql(database, statement, options) {
  assert.ok(['music', 'music_journal'].includes(database));
  const container = safeResources();
  const identity = run(['exec', container, 'psql', '-XAt', '-U', 'postgres', '-d', database, '-c', "SELECT current_database() || ':' || current_setting('server_version_num')"]);
  assert.match(identity.trim(), new RegExp('^' + database + ':16[0-9]{4}$'));
  return run(['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, ...(statement ? ['-c', statement] : [])], options);
}
async function waitFor(action, label, limit = 60000) {
  const end = Date.now() + limit;
  while (Date.now() < end) { try { if (await action()) return; } catch {} await new Promise(r => setTimeout(r, 500)); }
  throw Error('Timed out: ' + label);
}
async function ready() { await waitFor(() => inspect('container', safeResources()).State.Health.Status === 'healthy', 'database health'); }
function harness(mode, ...args) { safeResources(); return c(['run', '--rm', '--no-deps', '-T', 'app', mode, ...args]); }
const endpoint = JSON.parse(run(['context', 'inspect', 'desktop-linux']))[0].Endpoints.docker.Host;
assert.equal(endpoint, 'unix://' + resolve(homedir(), '.docker/run/docker.sock'));
mkdirSync(evidence, { recursive: true });
const mode = process.argv[2];
if (mode === 'setup') {
  assert.ok(!run(['volume', 'ls', '--format', '{{.Name}}']).split('\n').includes(volume), 'Refuse existing volume');
  assert.equal(c(['ps', '-a', '-q']).trim(), '', 'Refuse existing test containers');
  c(['create', '--no-build', '--pull', 'never', 'db']);
  const v = inspect('volume', volume), db = id('db');
  writeFileSync(resolve(evidence, 'identity.json'), JSON.stringify({ volumeCreatedAt: v.CreatedAt, databaseContainer: db }, null, 2));
  safeResources(); c(['start', 'db']); await ready();
  sql('music', 'SELECT current_database(),version()'); sql('music_journal', 'SELECT current_database()');
  console.log('PASS isolated PostgreSQL16 resources created and identities verified');
} else if (mode === 'reset') {
  const appContainer = c(['ps', '-a', '-q', 'app']).trim();
  if (appContainer) assert.notEqual(inspect('container', appContainer).State.Status, 'running', 'Stop synthetic listener before resetting');
  for (const [db, role] of [['music', 'music_migrator'], ['music_journal', 'music_journal_migrator']]) {
    sql(db, `DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION ${role}; REVOKE CREATE ON SCHEMA public FROM PUBLIC;`);
  }
  console.log('Reset only the identity-checked disposable schemas');
} else if (mode === 'tests') {
  await ready(); const output = harness('tests'); writeFileSync(resolve(evidence, 'database-tests.log'), output); console.log(output);
} else if (mode === 'health') {
  await ready(); c(['up', '-d', '--no-build', '--pull', 'never', 'app']);
  // Internal-only Docker networking did not publish host ports on this engine.
  // Probe the actual container loopback, exactly as the deployed healthcheck does.
  const appId = id('app');
  const request = async (path, host) => {
    const code = `import {request} from 'node:http';const q=request({host:'127.0.0.1',port:3000,path:${JSON.stringify(path)},headers:${JSON.stringify(host ? { Host: host, 'X-Forwarded-Proto': 'https' } : {})}},r=>{let body='';r.on('data',c=>body+=c);r.on('end',()=>console.log(JSON.stringify({status:r.statusCode,body:JSON.parse(body)})))});q.setTimeout(5000,()=>q.destroy(Error('timeout')));q.on('error',()=>process.exit(1));q.end();`;
    const response = JSON.parse(run(['exec', appId, 'node', '--input-type=module', '-e', code]));
    return { status: response.status, json: async () => response.body };
  };
  await waitFor(async () => (await request('/health')).status === 200, 'app startup');
  const app = inspect('container', id('app'));
  assert.equal(app.Config.User, '1000:1000'); assert.equal(app.HostConfig.ReadonlyRootfs, true);
  assert.equal(app.HostConfig.Memory, 536870912); assert.equal(app.HostConfig.NanoCpus, 1000000000);
  assert.equal(app.HostConfig.PortBindings['3000/tcp'][0].HostIp, '127.0.0.1');
  assert.equal((await request('/health', 'wrong.invalid')).status, 200);
  assert.equal((await request('/api/library', 'wrong.invalid')).status, 403);
  assert.equal((await request('/', 'example.invalid')).status, 503);
  safeResources(); c(['stop', '-t', '10', 'db']);
  await waitFor(async () => (await request('/health')).status === 503, 'health fails during outage');
  assert.deepEqual(await (await request('/health')).json(), { status: 'unavailable' });
  safeResources(); c(['start', 'db']); await ready();
  await waitFor(async () => (await request('/health')).status === 200, 'health recovers');
  c(['stop', '-t', '10', 'app']);
  assert.equal(inspect('container', id('app')).State.ExitCode, 0);
  const logs = c(['logs', '--no-color', 'app']); assert.match(logs, /STOPPED cleanly/);
  assert.doesNotMatch(logs, /invented-local-|postgres:\/\//);
  writeFileSync(resolve(evidence, 'health.log'), logs + '\nPASS health200/outage503/restart200, Host boundary, root refusal, resource limits and graceful stop\n');
  console.log('PASS actual startup/container-loopback HTTP health outage and recovery; clean stop; resources/Host checks');
} else if (mode === 'restore') {
  await ready(); assert.notEqual(inspect('container', id('app')).State.Status, 'running');
  console.log(harness('fixture'));
  for (const db of ['music', 'music_journal']) {
    sql(db, 'SELECT 1');
    const dump = run(['exec', safeResources(), 'pg_dump', '-U', 'postgres', '--clean', '--if-exists', '-d', db]);
    assert.ok(dump.includes('PostgreSQL database dump')); writeFileSync(resolve(evidence, db + '.sql'), dump);
  }
  const deleted = harness('delete'); const inventory = /INVENTORY ([a-f0-9]{64})/.exec(deleted)?.[1]; assert.ok(inventory);
  writeFileSync(resolve(evidence, 'current-inventory.txt'), inventory + '\n');
  sql('music', null, { input: readFileSync(resolve(evidence, 'music.sql'), 'utf8') });
  const appRestore = harness('reconcile', inventory);
  for (const db of ['music', 'music_journal']) sql(db, null, { input: readFileSync(resolve(evidence, db + '.sql'), 'utf8') });
  const staleRestore = harness('stale', inventory);
  writeFileSync(resolve(evidence, 'restore.log'), appRestore + staleRestore);
  console.log(appRestore + staleRestore);
} else if (mode === 'stop') {
  safeResources();
  for (const service of ['app', 'db']) assert.equal(inspect('container', id(service)).Config.Labels['com.docker.compose.project'], project);
  c(['down', '--timeout', '10']);
  assert.equal(inspect('volume', volume).Labels['organiser.purpose'], 'stage-c-disposable');
  console.log('Stopped/removed only task containers/network; disposable volume retained');
} else throw Error('Expected setup/reset/tests/health/restore/stop');
