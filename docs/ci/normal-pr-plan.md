# Normal PR CI — inactive proposal

D050 accepts D049 and authorises local preparation/mocked tests only. This plan does not activate a workflow, authorise recurring resource use or change branch protection. The real policy is `inactive`; no `.github/workflows` file exists.

## Prepared defaults for review

- Ordinary `pull_request` events targeting `main`: opened, synchronize, reopened and ready_for_review. All same-repository source branches, including draft PRs. No path filters, so documentation-only changes still receive a result. Draft coverage costs some additional runs but avoids treating draft status as a security boundary.
- Exact repository identity and same-repository head required. No fork job, `pull_request_target`, push, schedule, manual dispatch, merge queue, registry publishing or deployment trigger. Fork contributions need a separate reviewed policy; a skipped job is not validation of fork code.
- One `verify` job on GitHub-hosted Ubuntu24.04, maximum30 minutes, per-PR cancellation of superseded runs. Different PRs can run concurrently; this is not a global cost cap. No automatic retries.
- Existing immutable action/image pins, Node22, locked npm install with scripts disabled, full host quality gate, one candidate Docker build, pinned PostgreSQL and synthetic integration/runtime/health/restore tests. Normal CI invokes `run`, never the deliberate cancellation hold. Independent always-cleanup and receipt/ownership guards stay intact.
- Read-only contents token, no persisted checkout credential, app secrets, external cache or artifact uploads. No home runner, real Spotify data, operational database or deployment. Standard runner destruction is not substituted for cleanup evidence.

These defaults are prepared for approval, not standing authorisation to execute them. Recurring runs would perform installations and create disposable resources on each eligible event, unlike the exhausted one-off D047/D049 approvals. Included-allowance/paid-usage controls remain required; do not infer unlimited use from the30-minute timeout.

## Exact proposed activation diff

Change `docs/ci/workflow-policy.json` mode from `inactive` to `normal-pr`, retaining its reviewed digest. Copy `docs/ci/pr-checks.yml.example` byte-for-byte to `.github/workflows/pr-checks.yml`. No other workflow file is allowed. An unapplied patch is retained as local review evidence. The obsolete `rehearsal` policy mode is rejected; old activation patches are historical only.

The exact-byte policy detects file/pin/permission/trigger changes, including changes to both active file and draft without updating the digest. It is a contributor review check, not a tamper-proof security boundary: reviewers must inspect policy and tests as well as the workflow. The normal draft's wider eligibility means its eventual push/PR may start work immediately. Publication and activation must be approved before that step.

## Review and merge checks — recommendation only

Keep the existing `verify` job name stable. After an approved activation proves its actual GitHub check context, propose requiring that exact GitHub Actions check for `main`, plus explicit owner review of the diff and merge approval. Require the check for the intended current candidate revision; a prior branch result, cancelled job or skipped fork job is not acceptance. Do not set a required check before it exists and its behaviour is verified. No branch rules/settings, bypass permissions, auto-merge, merge queue or main-push deployment are configured here.

Workflow conditions alone do not enforce merge safety. Fork PRs are outside this proposal and must not be accepted on a skipped `verify` result. Requiring stricter contributor rules or supporting fork tests is a separate choice. Maintain private history outside publication branches.

## Next approval package

Review/accept this prepared scope first. Then separately authorise the exact publication branch/PR, activation and recurring eligible-event policy, runner downloads/installations, disposable synthetic resources and bounded included-allowance usage. A first validation run should be explicitly bounded, with failures stopping for review rather than unapproved retries. GitHub settings/required-check changes and merges remain separate approvals; deployment remains excluded.

Before activation recheck current trigger state, action/image/lockfile review, runner support, log retention and budget controls. No such remote checks, installs or executions are performed by D050. After a successful approved run, use the actual check identity to prepare a separate required-check/settings request. Historical D047 baseline and D049 cancellation evidence support this design but do not prove the modified normal-event policy on GitHub.
