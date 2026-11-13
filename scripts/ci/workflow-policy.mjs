import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exact reviewed bytes, not a permissive YAML/regex parser. Changes require review.
export function verifyWorkflows(policy, draft, files) {
  assert.deepEqual(Object.keys(policy).sort(), ['mode', 'sha256']);
  assert.ok(['inactive', 'rehearsal'].includes(policy.mode));
  assert.equal(createHash('sha256').update(draft).digest('hex'), policy.sha256, 'Workflow review digest mismatch');
  const names = Object.keys(files);
  if (policy.mode === 'inactive') assert.deepEqual(names, [], 'Workflow activation is not approved');
  else {
    assert.deepEqual(names, ['pr-checks.yml'], 'Unexpected workflow inventory');
    assert.equal(files['pr-checks.yml'], draft, 'Active workflow differs from reviewed draft');
  }
}
