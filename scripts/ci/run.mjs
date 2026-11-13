// Inactive draft entry. Running containers is a separate approval, never part of npm check.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { cancellationProbe, withCancellationSignals } from './cancellation.mjs';
import { plan, launcher } from './launcher.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(root, '.work/ci');
const receipt = resolve(directory, 'receipt.json');
const mode = process.argv[2];
try {
  if (!['run', 'cleanup', 'cancellation-hold'].includes(mode)) throw Error('Expected run, cleanup or cancellation-hold');
  const image = readFileSync(resolve(directory, 'candidate.id'), 'utf8').trim();
  const config = plan(process.env, root, image);
  mkdirSync(resolve(directory, 'docker-config'), { recursive: true });
  function execute(args, input) {
    // Ignore inherited Docker context/auth and unrelated environment; no shell interpolation.
    try {
      return execFileSync('docker', ['--config', resolve(directory, 'docker-config'), '--host', 'unix:///var/run/docker.sock', ...args], {
        cwd: root, env: { PATH: process.env.PATH, LANG: 'C.UTF-8' }, input,
        encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch { throw Error('CI Docker command failed'); }
  }
  const save = state => { writeFileSync(receipt + '.tmp', JSON.stringify(state), { mode: 0o600 }); renameSync(receipt + '.tmp', receipt); };
  let state;
  if (mode !== 'cleanup') {
    state = { owner: config.owner, resources: [] };
    writeFileSync(receipt, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
  } else if (existsSync(receipt)) state = JSON.parse(readFileSync(receipt, 'utf8'));
  else { throw Error('Missing receipt; cleanup cannot be verified'); }
  const job = launcher(config, execute, save, state, message => console.log(message));
  if (mode === 'cleanup') await job.cleanup();
  else if (mode === 'cancellation-hold') {
    await withCancellationSignals(process, signal => cancellationProbe(job, { signal, report: message => console.log(message) }));
  } else {
    try { await job.setup(); await job.exercise(); console.log('PASS synthetic CI database/health/restore checks for ' + image); }
    finally { await job.cleanup(); }
  }
} catch {
  // No raw command output, data, credentials or connection details in CI logs.
  console.error('CI preparation runner failed; no success claimed. Review task resources before retry.');
  process.exitCode = 1;
}
