import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Only release-control/docs changes can reuse existing runtime evidence.
export function imageRequired(paths) {
  return paths.length === 0 || paths.some(path => !(
    path.startsWith('docs/') || path.startsWith('.github/workflows/') ||
    ['scripts/ci/image-required.mjs', 'scripts/ci/workflow-policy.mjs', 'scripts/ci-launcher.test.mjs'].includes(path)
  ));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Checkout is the GitHub PR merge commit; first parent is the target branch.
  const parents = execFileSync('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], {encoding:'utf8'}).trim().split(' ');
  if (parents.length !== 3) throw Error('Expected PR merge commit');
  const paths = execFileSync('git', ['diff', '--name-only', '-z', 'HEAD^1', 'HEAD'], {encoding:'utf8'}).split('\0').filter(Boolean);
  const required = imageRequired(paths);
  appendFileSync(process.env.GITHUB_OUTPUT, `required=${required}\n`);
  console.log(required ? 'Runtime-affecting change: image verification required' : 'Release-control/docs-only change: quality gate runs; no image rebuild');
}
