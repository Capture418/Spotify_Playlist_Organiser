# CI rehearsal readiness — preparation only

D046 authorises local source changes and mocked tests. The real policy remains `inactive` and there is no `.github/workflows` directory. PR #1 and its accepted snapshot are unchanged remotely. The new local branch derives only from that public history.

## Exact activation change for later review

After separate approval, activation is exactly two changes:

1. Change only `mode` from `inactive` to `rehearsal` in `docs/ci/workflow-policy.json`, retaining the reviewed SHA256.
2. Copy `docs/ci/pr-checks.yml.example` byte-for-byte to `.github/workflows/pr-checks.yml`.

An unapplied patch is prepared in ignored local evidence. Do not apply it under preparation approval. Tests use in-memory workflow inventories, never active repository workflow files. The policy rejects any workflow in inactive mode; rehearsal mode requires exactly the named file and exact reviewed bytes. The digest also detects simultaneous draft/active edits unless the review policy itself is changed. This is a review guard, not protection against a contributor changing the checks themselves. Any content or digest change requires a fresh review.

The draft retains the same-repository `codex/ci-rehearsal` PR guard, main target, opened/synchronize events, GitHub-hosted Linux, read-only token, pinned actions/images, 30-minute timeout and no deployment/secrets/upload/cache steps. Merely pushing a branch with the active workflow and opening/updating its matching PR can execute it: publication and activation approval must precede that operation.

## Cleanup evidence

The launcher emits a fixed phase marker after the synthetic database container starts. After removing only receipt-recorded, identity-verified resources, it verifies an empty receipt and lists remaining containers (including stopped ones), volumes and networks filtered by this run's exact owner label. It emits a fixed PASS cleanup marker only if every inventory query succeeds and returns empty. It never prints dumps, settings, connection URLs or tokens. Missing receipts, ownership changes, removal/receipt failures and unrecorded remnants cannot produce success.

A crash after creation but before recording can leave an unrecorded labelled resource: detection reports failure, never authorises deleting it. A crash after removal but before recording can leave a stale receipt: recovery fails closed. A replaced/relabeled resource or runner termination can prevent proof of cleanup. The inventory is a point-in-time observation, not a guarantee against concurrent external actors. Never substitute runner disposal for observed launcher cleanup.

## Bounded execution proposal — not approved

- Recheck current repository workflow/trigger/action permissions, log retention, runner compatibility and pinned artifact/security review before activation. Existing owner-confirmed included allowance and paid-usage block stand unless circumstances change.
- Separately authorise a named branch push and rehearsal PR, temporary activation, existing GitHub authentication/automatic read-only token, runner-only Node/npm/action/image downloads and Docker builds, and disposable synthetic databases/containers/volume/network. No Mac/server installs, new secrets or real data.
- Propose one baseline job, then only if successful with verified cleanup, one controlled cancellation attempt; sequential, each with 30-minute timeout, included allowance only, no paid usage or automatic retries.
- Cancel the second attempt after the database-start marker. Verify cleanup step completion and its positive marker while evidence is available. If timing prevents cancellation or the runner is terminated before verification, record the limitation and stop; do not silently add attempts.
- Keep normal GitHub logs plus a redacted handover only. No uploaded database dumps or images. A successful scenario message before cleanup is not overall success. Missing cleanup evidence is unverified, not passed.
- Approval for execution should include observation, the one rerun/cancel and closure of the rehearsal PR after evidence collection. Closing does not disable a branch's workflow forever: further matching PR updates/reopening/recreation remain gated. No merge, branch deletion, permanent CI rollout, required-check configuration, registry publication or deployment implied.

Acceptance requires recorded source SHA/candidate image ID, passing baseline checks, observed cleanup and honest cancellation results. Failure or uncertain resource ownership stops the rehearsal. The real platform, Docker/PostgreSQL semantics, cancellation scheduling and ephemeral runner disposal remain unverified by mocks.
