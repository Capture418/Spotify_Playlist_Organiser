// Preparation only. No commands run on import; the CLI requires explicit CI approval.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
export const postgres = 'postgres:16.16-alpine3.24@sha256:a2f7e20374cd8fd8ed4a588b79549e10589bea7b1686e77922f5ac741b80b8a1';
const label = 'organiser.ci';
export function plan(env, root, image, platform = process.platform) {
  assert.equal(platform, 'linux', 'Linux CI only');
  assert.equal(env.CI, 'true'); assert.equal(env.GITHUB_ACTIONS, 'true');
  assert.equal(env.CI_DISPOSABLE_APPROVED, 'synthetic-only');
  for (const name of Object.keys(env)) {
    if (/^(APP_|ORGANISER_|SPOTIFY_|PG)/.test(name) || name.endsWith('DATABASE_URL') || /^DOCKER_(HOST|CONTEXT|TLS_VERIFY|CERT_PATH|CONFIG)$/.test(name)) throw Error('Refuse inherited operational setting: ' + name);
  }
  for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert.match(env[name] ?? '', /^[1-9][0-9]{0,19}$/);
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  assert.ok(!/[,\r\n]/.test(resolve(root)), 'Unsupported mount path');
  const owner = `music-ci-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  return { root: resolve(root), image, owner, network: owner + '-net', volume: owner + '-db', db: owner + '-postgres' };
}

/** Injected command executor and receipt writer make safety branches testable without Docker. */
export function launcher(config, execute, save, state = { owner: config.owner, resources: [] }) {
  assert.equal(state.owner, config.owner);
  let serial = state.resources.filter(r => r.kind === 'container').length;
  const run = async (args, input) => String(await execute(args, input)).trim();
  const inspect = async (kind, id) => JSON.parse(await run([kind, 'inspect', id]))[0];
  async function verify(resource) {
    const found = await inspect(resource.kind, resource.id);
    assert.equal((found.Config?.Labels ?? found.Labels)?.[label], config.owner, 'Resource ownership mismatch');
    assert.equal(resource.kind === 'volume' ? found.Name : found.Id, resource.id, 'Resource identity mismatch');
    if (resource.kind === 'volume') assert.equal(found.CreatedAt, resource.created);
    return found;
  }
  async function remember(kind, id) {
    const found = await inspect(kind, id);
    const resource = { kind, id: kind === 'volume' ? found.Name : found.Id, ...(kind === 'volume' ? { created: found.CreatedAt } : {}) };
    await verify(resource); state.resources.push(resource); save(state); return resource;
  }
  async function create(kind, args) {
    return remember(kind, await run([kind, 'create', '--label', `${label}=${config.owner}`, ...args]));
  }
  async function remove(resource) {
    await verify(resource);
    await run([resource.kind, 'rm', ...(resource.kind === 'container' ? ['-f'] : []), resource.id]);
    state.resources = state.resources.filter(r => r !== resource); save(state);
  }
  async function cleanup() {
    // Containers before volume/network. Never use compose down, wildcard removal or prune.
    for (const kind of ['container', 'volume', 'network']) {
      for (const resource of [...state.resources].reverse().filter(r => r.kind === kind)) await remove(resource);
    }
  }
  async function preflight() {
    assert.equal(state.resources.length, 0, 'Existing receipt requires reviewed cleanup');
    for (const kind of ['container', 'volume', 'network']) {
      const args = kind === 'container' ? ['ps', '-a', '--format', '{{.Names}}'] : [kind, 'ls', '--format', '{{.Name}}'];
      const actual = (await run(args)).split('\n');
      assert.ok(!actual.some(name => name.startsWith(config.owner)), 'Refuse existing CI resources');
    }
    const image = await inspect('image', config.image);
    assert.equal(image.Id, config.image); assert.equal(image.Architecture, 'amd64'); assert.equal(image.Os, 'linux');
    assert.equal(image.Config.User, 'node');
    assert.deepEqual(image.Config.Cmd, ['node', 'runtime/server/production.js']);
    await inspect('image', postgres); // already-pulled immutable image required
  }
  async function setup() {
    await preflight();
    await runtimeCheck();
    await create('network', ['--internal', config.network]);
    await create('volume', [config.volume]);
    const db = await create('container', ['--name', config.db, '--pull', 'never', '--platform', 'linux/amd64',
      '--network', config.network, '--network-alias', 'db', '--memory', '512m', '--cpus', '1',
      '--mount', `type=volume,src=${config.volume},dst=/var/lib/postgresql/data`,
      '--mount', `type=bind,src=${resolve(config.root, 'db/init/10-app-role.sql')},dst=/docker-entrypoint-initdb.d/10-app-role.sql,readonly`,
      '-e', 'POSTGRES_PASSWORD=invented-local-admin-only', '-e', 'POSTGRES_USER=postgres', '-e', 'POSTGRES_DB=postgres', postgres]);
    state.db = db.id; save(state); await run(['start', db.id]);
  }
  function resource(id) { const r = state.resources.find(r => r.id === id); assert.ok(r, 'Unrecorded resource'); return r; }
  async function sql(database, statement, input) {
    assert.ok(['music', 'music_journal'].includes(database));
    const db = await verify(resource(state.db));
    assert.equal(db.Mounts.find(m => m.Destination === '/var/lib/postgresql/data')?.Name, config.volume);
    const identity = await run(['exec', state.db, 'psql', '-XAt', '-U', 'postgres', '-d', database, '-c', "SELECT current_database() || ':' || current_setting('server_version_num')"]);
    assert.match(identity, new RegExp('^' + database + ':16[0-9]{4}$'));
    return run(['exec', '-i', state.db, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, ...(statement ? ['-c', statement] : [])], input);
  }
  const constraints = ['--pull', 'never', '--platform', 'linux/amd64', '--user', '1000:1000', '--read-only', '--tmpfs', '/tmp:size=67108864,mode=1777', '--memory', '512m', '--cpus', '1', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--pids-limit', '128'];
  async function runtimeCheck() {
    const c = await create('container', ['--name', `${config.owner}-runtime`, ...constraints, '--network', 'none',
      '--mount', `type=bind,src=${resolve(config.root, 'scripts/ci/runtime-check.mjs')},dst=/app/verification/runtime-check.mjs,readonly`,
      '--entrypoint', 'node', config.image, '/app/verification/runtime-check.mjs']);
    await run(['start', '-a', c.id]);
    assert.equal((await verify(c)).State.ExitCode, 0, 'Candidate runtime check failed');
    await remove(c);
  }
  async function app(mode, ...args) {
    const c = await create('container', ['--name', `${config.owner}-app-${++serial}`, ...constraints,
      '--network', config.network, '-e', 'STAGE_C_DISPOSABLE=spotify-organiser-verify',
      '--mount', `type=bind,src=${resolve(config.root, 'scripts/database/stage-c.mjs')},dst=/app/verification/stage-c.mjs,readonly`,
      '--entrypoint', 'node', config.image, '/app/verification/stage-c.mjs', mode, ...args]);
    return c;
  }
  async function harness(mode, ...args) {
    const c = await app(mode, ...args);
    const output = await run(['start', '-a', c.id]);
    assert.equal((await verify(c)).State.ExitCode, 0, 'Synthetic scenario failed');
    await remove(c); return output;
  }
  async function wait(check, pause) {
    for (let n = 0; n < 30; n++) { try { if (await check()) return; } catch {} await pause(); }
    throw Error('Synthetic readiness timed out');
  }
  async function exercise(pause = () => new Promise(r => setTimeout(r, 1000))) {
    await wait(async () => { await sql('music', 'SELECT 1'); await sql('music_journal', 'SELECT 1'); return true; }, pause);
    await harness('tests');
    const service = await app('serve'); await run(['start', service.id]);
    async function health(path = '/health', host) {
      await verify(service);
      const code = `import {request} from 'node:http';const q=request({host:'127.0.0.1',port:3000,path:${JSON.stringify(path)},headers:${JSON.stringify(host ? {Host:host, 'X-Forwarded-Proto':'https'} : {})}},r=>{r.resume();r.on('end',()=>console.log(r.statusCode))});q.setTimeout(3000,()=>q.destroy());q.on('error',()=>process.exit(1));q.end();`;
      return Number(await run(['exec', service.id, 'node', '--input-type=module', '-e', code]));
    }
    await wait(async () => await health() === 200, pause);
    const runtime = await verify(service);
    assert.equal(runtime.Image, config.image); assert.equal(runtime.HostConfig.ReadonlyRootfs, true);
    assert.equal(runtime.HostConfig.Memory, 536870912); assert.equal(runtime.HostConfig.NanoCpus, 1000000000);
    assert.equal(Object.keys(runtime.HostConfig.PortBindings ?? {}).length, 0);
    assert.equal(await health('/api/library', 'wrong.invalid'), 403);
    assert.equal(await health('/', 'example.invalid'), 503);
    await verify(resource(state.db)); await run(['stop', '-t', '10', state.db]);
    await wait(async () => await health() === 503, pause);
    await run(['start', state.db]); await wait(async () => await health() === 200, pause);
    await run(['stop', '-t', '10', service.id]); assert.equal((await verify(service)).State.ExitCode, 0);
    await remove(service);
    await harness('fixture');
    // Dumps stay in process memory; never upload them or print private-looking payloads.
    const dumps = {};
    for (const db of ['music', 'music_journal']) { await sql(db, 'SELECT 1'); dumps[db] = await run(['exec', state.db, 'pg_dump', '-U', 'postgres', '--clean', '--if-exists', '-d', db]); assert.match(dumps[db], /PostgreSQL database dump/); }
    const inventory = /INVENTORY ([a-f0-9]{64})/.exec(await harness('delete'))?.[1]; assert.ok(inventory);
    await sql('music', null, dumps.music); await harness('reconcile', inventory);
    for (const db of ['music', 'music_journal']) await sql(db, null, dumps[db]);
    await harness('stale', inventory);
  }
  return { setup, exercise, cleanup, preflight, state };
}
