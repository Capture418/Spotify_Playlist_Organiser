import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { plan, launcher, postgres } from './ci/launcher.mjs';
const env = { CI: 'true', GITHUB_ACTIONS: 'true', CI_DISPOSABLE_APPROVED: 'synthetic-only', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' };
const image = 'sha256:' + 'a'.repeat(64);
const config = () => plan(env, '/invented/project', image, 'linux');
function fake() {
  const objects = new Map(), calls = [], saved = [];
  let next = 0, healthy = true;
  const execute = async (args, input) => {
    calls.push({ args, input }); const [kind, action] = args;
    if (action === 'inspect') {
      if (kind === 'image') return JSON.stringify([{ Id: args[2], Architecture: 'amd64', Os: 'linux', Config: { User: 'node', Cmd: ['node', 'runtime/server/production.js'] } }]);
      assert.ok(objects.has(args[2]), 'Missing mock resource'); return JSON.stringify([objects.get(args[2])]);
    }
    if (action === 'ls' || kind === 'ps') return '';
    if (action === 'create') {
      const id = kind === 'volume' ? args.at(-1) : (++next).toString(16).padStart(64, '0');
      const labels = { 'organiser.ci': config().owner };
      objects.set(id, { Id: id, Name: id, CreatedAt: 'invented-time', Labels: labels, Config: { Labels: labels }, Image: image,
        HostConfig: { ReadonlyRootfs: true, Memory: 536870912, NanoCpus: 1000000000, PortBindings: {} },
        State: { ExitCode: 0 }, Mounts: [{ Destination: '/var/lib/postgresql/data', Name: config().volume }] });
      return id;
    }
    if (action === 'rm') { objects.delete(args.at(-1)); return ''; }
    if (kind === 'start') {
      healthy = true;
      const created = calls.find(c => c.args[1] === 'create' && c.args.includes('delete'));
      return created ? 'INVENTORY ' + 'b'.repeat(64) : '';
    }
    if (kind === 'stop') { healthy = false; return ''; }
    if (kind === 'exec') {
      if (args.includes('pg_dump')) return 'PostgreSQL database dump invented';
      if (args.includes('psql')) {
        const database = args[args.indexOf('-d') + 1];
        return args.at(-1).includes('current_setting') ? database + ':160016' : '';
      }
      const code = args.at(-1);
      if (code.includes('wrong.invalid')) return '403';
      if (code.includes('path:"/"')) return '503';
      return healthy ? '200' : '503';
    }
    throw Error('Unexpected mock command: ' + args.join(' '));
  };
  return { objects, calls, saved, execute, save: state => saved.push(structuredClone(state)) };
}
test('CI plan refuses inherited settings, remote endpoints, unapproved platforms and mutable images', () => {
  for (const name of ['DATABASE_URL', 'JOURNAL_DATABASE_URL', 'APP_KEY', 'ORGANISER_OWNER', 'SPOTIFY_CLIENT_ID', 'PGHOST', 'DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_CONFIG']) assert.throws(() => plan({ ...env, [name]: 'invented-private' }, '/repo', image, 'linux'), /Refuse inherited/);
  for (const change of [{ CI: 'false' }, { CI_DISPOSABLE_APPROVED: '' }, { GITHUB_RUN_ID: '../bad' }]) assert.throws(() => plan({ ...env, ...change }, '/repo', image, 'linux'));
  assert.throws(() => plan(env, '/repo', image, 'darwin'));
  assert.throws(() => plan(env, '/repo', 'mutable:latest', 'linux'));
  assert.notEqual(config().owner, plan({ ...env, GITHUB_RUN_ATTEMPT: '2' }, '/repo', image, 'linux').owner);
});
test('future CI uses exact candidate, isolated network, no host ports and scoped successful cleanup', async () => {
  const f = fake(), job = launcher(config(), f.execute, f.save);
  await job.setup(); await job.exercise(async () => {}); await job.cleanup();
  assert.equal(f.objects.size, 0); assert.equal(job.state.resources.length, 0);
  const creates = f.calls.filter(c => c.args[1] === 'create');
  assert.ok(creates.some(c => c.args.includes('--internal')));
  for (const c of creates) assert.ok(!c.args.some(a => ['-p', '--publish', '--privileged'].includes(a)));
  for (const c of creates.filter(c => c.args[0] === 'container')) assert.ok(c.args.includes(image) || c.args.includes(postgres));
  assert.ok(f.calls.some(c => c.args.includes('reconcile'))); assert.ok(f.calls.some(c => c.args.includes('stale')));
  assert.ok(f.calls.some(c => c.input?.includes('PostgreSQL database dump')));
});
test('failed scenarios clean owned resources, while ownership changes prevent destructive commands', async () => {
  const f = fake(), job = launcher(config(), f.execute, f.save);
  await job.setup();
  const db = f.objects.get(job.state.db); db.Config.Labels['organiser.ci'] = 'unrelated';
  const before = f.calls.filter(c => c.args[1] === 'rm').length;
  await assert.rejects(job.cleanup(), /ownership/);
  assert.equal(f.calls.filter(c => c.args[1] === 'rm').length, before);
  db.Config.Labels['organiser.ci'] = config().owner;
  await job.cleanup(); assert.equal(f.objects.size, 0);
});
test('existing resource collision aborts before creation; failure during setup cleans recorded resources', async () => {
  const f = fake();
  const collision = launcher(config(), async args => args[0] === 'ps' ? config().db : f.execute(args), f.save);
  await assert.rejects(collision.setup(), /existing CI/); assert.equal(f.objects.size, 0);
  const broken = launcher(config(), async args => { if (args[0] === 'start' && args.length === 2) throw Error('Injected failure'); return f.execute(args); }, f.save);
  await assert.rejects(broken.setup(), /Injected/); await broken.cleanup(); assert.equal(f.objects.size, 0);
});
test('receipt from another job and replaced volume cannot authorise cleanup', async () => {
  const f = fake(); assert.throws(() => launcher(config(), f.execute, f.save, { owner: 'other', resources: [] }));
  const job = launcher(config(), f.execute, f.save); await job.setup();
  f.objects.get(config().volume).CreatedAt = 'replaced';
  await assert.rejects(job.cleanup()); assert.ok(f.objects.has(config().volume));
});
test('inactive draft preserves read-only PR boundaries and immutable action/image pins', () => {
  const draft = readFileSync(new URL('../docs/ci/pr-checks.yml.example', import.meta.url), 'utf8');
  assert.equal(existsSync(new URL('../.github/workflows/pr-checks.yml', import.meta.url)), false);
  assert.match(draft, /pull_request:\s+branches: \[main\]/); assert.match(draft, /contents: read/);
  assert.match(draft, /persist-credentials: false/); assert.match(draft, /runs-on: ubuntu-24.04/);
  assert.doesNotMatch(draft, /pull_request_target|self-hosted|secrets\.|packages: write|docker login|request-deploy|workflow_dispatch/);
  for (const action of draft.matchAll(/uses: ([^\s]+)/g)) assert.match(action[1], /^actions\/[a-z-]+@[a-f0-9]{40}$/);
  assert.match(draft, /types: \[opened, synchronize\]/);
  assert.ok(draft.includes("github.event.pull_request.head.repo.full_name == github.repository"));
  assert.ok(draft.includes("github.head_ref == 'codex/ci-rehearsal'"));
  assert.match(draft, /package-manager-cache: false/);
  assert.match(draft, /allow-unsafe-pr-checkout: false/);
  assert.ok(draft.includes(postgres)); assert.match(draft, /if: \$\{\{ always\(\) \}\}/);
});

test('scenario interruption can resume scoped cleanup from the last saved receipt', async () => {
  const f = fake();
  const job = launcher(config(), async (args, input) => {
    if (args[1] === 'create' && args.includes('tests')) throw Error('Injected cancellation');
    return f.execute(args, input);
  }, f.save);
  await job.setup();
  await assert.rejects(job.exercise(async () => {}), /cancellation/);
  const resumed = launcher(config(), f.execute, f.save, structuredClone(f.saved.at(-1)));
  await resumed.cleanup(); assert.equal(f.objects.size, 0);
});
test('wrong candidate architecture refuses all creation and runtime check failure prevents database creation', async () => {
  const f = fake();
  const wrong = launcher(config(), async args => {
    if (args[0] === 'image' && args[1] === 'inspect') return JSON.stringify([{ Id: image, Architecture: 'arm64' }]);
    return f.execute(args);
  }, f.save);
  await assert.rejects(wrong.setup()); assert.equal(f.objects.size, 0);
  const broken = launcher(config(), async args => {
    if (args[0] === 'start' && args.includes('-a')) { for (const r of f.objects.values()) r.State.ExitCode = 1; }
    return f.execute(args);
  }, f.save);
  await assert.rejects(broken.setup(), /runtime check failed/);
  assert.equal(f.calls.some(c => c.args.includes(postgres) && c.args[1] === 'create'), false);
  await broken.cleanup(); assert.equal(f.objects.size, 0);
});
