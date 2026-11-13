import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { cancellationProbe, withCancellationSignals, holdMilliseconds } from './ci/cancellation.mjs';
import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { verifyWorkflows } from './ci/workflow-policy.mjs';
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
    if (action === 'ls' || kind === 'ps') {
      if (!args.includes('--filter')) return '';
      const type = kind === 'ps' ? 'container' : kind;
      assert.equal(args[args.indexOf('--filter') + 1], `label=organiser.ci=${config().owner}`);
      assert.equal(args.at(-1), type === 'volume' ? '{{.Name}}' : '{{.ID}}');
      return [...objects.values()].filter(o => o.kind === type && (o.Config?.Labels ?? o.Labels)?.['organiser.ci'] === config().owner).map(o => o.Id).join('\n');
    }
    if (action === 'create') {
      const id = kind === 'volume' ? args.at(-1) : (++next).toString(16).padStart(64, '0');
      const labels = { 'organiser.ci': config().owner };
      objects.set(id, { kind, Id: id, Name: id, CreatedAt: 'invented-time', Labels: labels, Config: { Labels: labels }, Image: image,
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
  const directory = new URL('../.github/workflows/', import.meta.url);
  const files = {};
  if (existsSync(directory)) for (const name of readdirSync(directory)) {
    const file = new URL(name, directory);
    assert.ok(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink());
    files[name] = readFileSync(file, 'utf8');
  }
  verifyWorkflows(JSON.parse(readFileSync(new URL('../docs/ci/workflow-policy.json', import.meta.url))), draft, files);
  assert.match(draft, /pull_request:\s+branches: \[main\]/); assert.match(draft, /contents: read/);
  assert.match(draft, /persist-credentials: false/); assert.match(draft, /runs-on: ubuntu-24.04/);
  assert.doesNotMatch(draft, /pull_request_target|self-hosted|secrets\.|packages: write|docker login|request-deploy|workflow_dispatch/);
  for (const action of draft.matchAll(/uses: ([^\s]+)/g)) assert.match(action[1], /^actions\/[a-z-]+@[a-f0-9]{40}$/);
  assert.match(draft, /types: \[opened, synchronize\]/);
  assert.ok(draft.includes("github.event.pull_request.head.repo.full_name == github.repository"));
  assert.ok(draft.includes("github.head_ref == 'codex/ci-rehearsal'"));
  assert.match(draft, /package-manager-cache: false/);
  assert.match(draft, /allow-unsafe-pr-checkout: false/);
  assert.match(draft, /run: node scripts\/ci\/run.mjs cancellation-hold/);
  assert.doesNotMatch(draft, /run: node scripts\/ci\/run.mjs run\s/);
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

test('workflow policy accepts only inactive inventory or byte-exact reviewed rehearsal', () => {
  const draft = readFileSync(new URL('../docs/ci/pr-checks.yml.example', import.meta.url), 'utf8');
  const policy = JSON.parse(readFileSync(new URL('../docs/ci/workflow-policy.json', import.meta.url)));
  verifyWorkflows({ ...policy, mode: 'inactive' }, draft, {});
  const active = { ...policy, mode: 'rehearsal' };
  verifyWorkflows(active, draft, { 'pr-checks.yml': draft });
  assert.throws(() => verifyWorkflows({ ...policy, mode: 'inactive' }, draft, { 'pr-checks.yml': draft }));
  for (const files of [{}, { 'other.yml': draft }, { 'pr-checks.yml': draft, 'extra.yaml': draft }]) assert.throws(() => verifyWorkflows(active, draft, files));
  for (const changed of [draft.replace('contents: read', 'contents: write'), draft.replace('pull_request:', 'pull_request_target:'), draft.replace('ubuntu-24.04', 'self-hosted'), draft + '\n# unexpected change\n']) {
    assert.throws(() => verifyWorkflows(active, draft, { 'pr-checks.yml': changed }));
    assert.throws(() => verifyWorkflows(active, changed, { 'pr-checks.yml': changed }));
  }
  assert.throws(() => verifyWorkflows({ ...active, mode: 'anything' }, draft, {}));
});

test('cleanup reports verified success and a safe cancellation checkpoint only after operations', async () => {
  const f = fake(), reports = [];
  const job = launcher(config(), f.execute, f.save, undefined, message => reports.push(message));
  await job.setup();
  assert.deepEqual(reports, ['PHASE synthetic database started; cancellation checkpoint']);
  await job.cleanup(); await job.cleanup();
  assert.equal(f.objects.size, 0);
  assert.equal(reports.filter(x => x.startsWith('PASS cleanup:')).length, 2);
});

test('create-before-receipt interruption detects unrecorded remnants without deleting them', async () => {
  const f = fake(), reports = [];
  const broken = launcher(config(), async (args, input) => {
    const output = await f.execute(args, input);
    if (args[0] === 'volume' && args[1] === 'create') throw Error('Interrupted after create');
    return output;
  }, f.save);
  await assert.rejects(broken.setup(), /Interrupted/);
  const resumed = launcher(config(), f.execute, f.save, structuredClone(f.saved.at(-1)), m => reports.push(m));
  await assert.rejects(resumed.cleanup(), /Unrecorded/);
  assert.ok(f.objects.has(config().volume));
  assert.equal(f.calls.some(c => c.args[0] === 'volume' && c.args[1] === 'rm'), false);
  assert.deepEqual(reports, []);
});

test('remove-before-receipt interruption and inventory failures never claim cleanup success', async () => {
  const f = fake(); const job = launcher(config(), f.execute, f.save);
  await job.setup(); const durable = structuredClone(f.saved.at(-1));
  const reports = [];
  const broken = launcher(config(), f.execute, () => { throw Error('Receipt write interrupted'); }, structuredClone(durable), m => reports.push(m));
  await assert.rejects(broken.cleanup(), /Receipt write/);
  const resumed = launcher(config(), f.execute, f.save, durable, m => reports.push(m));
  await assert.rejects(resumed.cleanup(), /Missing mock resource/);
  assert.deepEqual(reports, []);
  const empty = launcher(config(), async () => { throw Error('Inventory unavailable'); }, f.save, undefined, m => reports.push(m));
  await assert.rejects(empty.cleanup(), /Inventory unavailable/);
  assert.deepEqual(reports, []);
});

test('cancellation hold keeps resources live until a signal and then verifies cleanup', async () => {
  const f = fake(), source = new EventEmitter(), reports = [];
  const job = launcher(config(), f.execute, f.save, undefined, m => reports.push(m));
  await assert.rejects(withCancellationSignals(source, signal => cancellationProbe(job, {
    signal, report: m => reports.push(m),
    wait: async (ms, value, options) => {
      assert.equal(ms, 120000); assert.equal(ms, holdMilliseconds);
      assert.equal(value, undefined); assert.equal(options.signal, signal);
      assert.ok(f.objects.has(job.state.db));
      assert.equal(job.state.resources.length, 3);
      assert.ok(reports.some(m => m.startsWith('READY cancellation hold:')));
      source.emit('SIGINT'); options.signal.throwIfAborted();
    },
  })), { name: 'AbortError' });
  assert.equal(f.objects.size, 0);
  assert.ok(reports.some(m => m.startsWith('CANCELLED hold:')));
  assert.ok(reports.at(-1).startsWith('PASS cleanup:'));
  assert.equal(f.calls.some(c => c.args.includes('tests') || c.args.includes('serve')), false);
  assert.equal(source.listenerCount('SIGINT'), 0); assert.equal(source.listenerCount('SIGTERM'), 0);
});

test('uncancelled hold expires as failure, cleans resources and never runs scenarios', async () => {
  const f = fake(), reports = [], controller = new AbortController();
  const job = launcher(config(), f.execute, f.save, undefined, m => reports.push(m));
  await assert.rejects(cancellationProbe(job, { signal: controller.signal, report: m => reports.push(m), wait: async () => {} }), /expired without cancellation/);
  assert.equal(f.objects.size, 0);
  assert.equal(reports.some(m => m.startsWith('CANCELLED')), false);
  assert.equal(f.calls.some(c => c.args.includes('tests')), false);
});

test('setup failure and pre-cancelled probes clean up without reaching the hold', async () => {
  for (const cancelled of [true, false]) {
    const controller = new AbortController(), calls = [];
    if (cancelled) controller.abort();
    const job = { setup: async () => { calls.push('setup'); throw Error('Setup failed'); }, cleanup: async () => { calls.push('cleanup'); } };
    await assert.rejects(cancellationProbe(job, { signal: controller.signal, wait: async () => { calls.push('wait'); } }));
    assert.deepEqual(calls, cancelled ? ['cleanup'] : ['setup', 'cleanup']);
  }
});

test('SIGTERM cancels a hold, cleanup failure stays failure and signal listeners are removed', async () => {
  const source = new EventEmitter(), reports = [];
  await assert.rejects(withCancellationSignals(source, signal => cancellationProbe({
    setup: async () => {}, cleanup: async () => { throw Error('Cleanup unverified'); },
  }, { signal, report: m => reports.push(m), wait: async () => { source.emit('SIGTERM'); signal.throwIfAborted(); } })), /Cleanup unverified/);
  assert.equal(source.listenerCount('SIGINT'), 0); assert.equal(source.listenerCount('SIGTERM'), 0);
  assert.equal(reports.some(m => m.startsWith('PASS')), false);
});
