import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exact reviewed bytes, not a permissive YAML/regex parser. Changes require review.
export function verifyWorkflows(policy, draft, files, extra = {}) {
  assert.deepEqual(Object.keys(policy).sort(), ['mode', 'sha256']);
  assert.ok(['inactive', 'normal-pr'].includes(policy.mode));
  assert.equal(createHash('sha256').update(draft).digest('hex'), policy.sha256, 'Workflow review digest mismatch');
  const names = Object.keys(files);
  if (policy.mode === 'inactive') assert.deepEqual(names, [], 'Workflow activation is not approved');
  else {
    assert.deepEqual(names.sort(), ['pr-checks.yml', ...Object.keys(extra)].sort(), 'Unexpected workflow inventory');
    for (const [name, hash] of Object.entries(extra)) {
      assert.ok(['pilot-release.yml','pilot-deploy.yml'].includes(name));
      assert.equal(createHash('sha256').update(files[name]).digest('hex'),hash,'Pilot workflow review digest mismatch');
    }
    assert.equal(files['pr-checks.yml'], draft, 'Active workflow differs from reviewed draft');
  }
}
