# CI cancellation rehearsal — local preparation

D048 authorises local cancellation-timing preparation and mocked tests only. D047 completed its two attempts; the second did not interrupt unfinished work. The real policy remains `inactive` and there is no `.github/workflows` directory. PR #1 and remote branches are unchanged by D048. No additional execution is approved.

## Exact activation change for later review

After separate approval, activation is exactly two changes:

1. Change only `mode` from `inactive` to `rehearsal` in `docs/ci/workflow-policy.json`, retaining the reviewed SHA256.
2. Copy `docs/ci/pr-checks.yml.example` byte-for-byte to `.github/workflows/pr-checks.yml`.

An unapplied patch is prepared in ignored local evidence. Do not apply it under preparation approval. Tests use in-memory workflow inventories, never active repository workflow files. The policy rejects any workflow in inactive mode; rehearsal mode requires exactly the named file and exact reviewed bytes. The digest also detects simultaneous draft/active edits unless the review policy itself is changed. This is a review guard, not protection against a contributor changing the checks themselves. Any content or digest change requires a fresh review.

The draft retains the same-repository `codex/ci-rehearsal` PR guard, main target, opened/synchronize events, GitHub-hosted Linux, read-only token, pinned actions/images, 30-minute timeout and no deployment/secrets/upload/cache steps. Merely pushing a branch with the active workflow and opening/updating its matching PR can execute it: publication and activation approval must precede that operation.

## Cleanup evidence

The launcher emits a fixed phase marker after the synthetic database container starts. After removing only receipt-recorded, identity-verified resources, it verifies an empty receipt and lists remaining containers (including stopped ones), volumes and networks filtered by this run's exact owner label. It emits a fixed PASS cleanup marker only if every inventory query succeeds and returns empty. It never prints dumps, settings, connection URLs or tokens. Missing receipts, ownership changes, removal/receipt failures and unrecorded remnants cannot produce success.

A crash after creation but before recording can leave an unrecorded labelled resource: detection reports failure, never authorises deleting it. A crash after removal but before recording can leave a stale receipt: recovery fails closed. A replaced/relabeled resource or runner termination can prevent proof of cleanup. The inventory is a point-in-time observation, not a guarantee against concurrent external actors. Never substitute runner disposal for observed launcher cleanup.

## Cancellation checkpoint and evidence

The inactive draft now invokes `cancellation-hold` in a clearly named step. It sets up the same isolated resources, emits READY after setup, then awaits SIGINT/SIGTERM for at most120 seconds. It never calls the integration scenarios. A signal emits CANCELLED and enters normal scoped cleanup; the workflow's independent always-step remains. If no signal arrives, it fails and cleans up rather than falling through to a successful test run. Signal handlers are removed afterwards; ordinary baseline mode is unchanged. Hard process/runner termination may bypass finally, so retained receipt/always-step evidence still matters.

The two-minute hold is fixed in code, not an arbitrary environment-controlled duration. Mocked clocks/signals avoid waiting in host tests. This widens the cancellation window; it cannot guarantee GitHub's signal timing or survival of a runner. It tests cancellation while resources are live, not SQL rollback during an in-flight transaction.

## Proposed next execution — separate approval required

Propose one cancellation-only attempt on the reviewed revision, not another two-run cycle. Approval must explicitly cover push/new rehearsal PR, temporary activation, runner installations/image builds and synthetic resources within included allowance only. No retries, paid usage, merge or deployment. Recheck triggers, action/image review and repository policy before activation; D047's owner-confirmed cost controls stand unless circumstances change.

Monitor the named hold step and request normal cancellation once READY is observed. If only step status is available live, wait until the step has started and then request cancellation; require final timestamps/markers to prove READY preceded cancellation. If setup failed, the hold expired, cancellation missed the hold or cleanup cannot be verified, report failure/limitation and stop without extra attempts.

Acceptance evidence: READY with recorded live resources, signal/cancellation while hold is unfinished, and verified empty cleanup inventory. No scenario-success message should occur in this mode. Missing cleanup evidence is unverified. Close the temporary PR, retire the workflow and preserve redacted logs after the attempt. No dumps, keys or images are uploaded. No branch deletion, permanent CI rollout or main changes implied. New real data/credentials, deployment and device/operational acceptance remain separately gated.
