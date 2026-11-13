# Public work plan and handover

Updated: 13 November2026.

## Current task

D047 rehearsal finished: baseline passed on GitHub; second attempt cancelled with verified empty cleanup inventory, but the scenario completed before cancellation was reported. No third attempt. PR #2 closed without merge. Temporary workflow removed and policy inactive; result/deactivation commit98efc76 was pushed after closure. PR #1 and main remain untouched.

## Existing implementation

- Combined invented-data library, shared tags, filtering/search and single/bulk editing.
- Synthetic account-isolated persistence, versioned migrations, restore preview/confirmation/snapshots, encrypted lifecycle/deletion recovery and prepared auth/startup seams.
- Online-only PWA manifest/icons/layout; no offline catalogue or queued writes.
- Strict production Host/HTTPS scheme guard, exact internal health exemption and validated runtime settings.
- Inactive PR-only CI draft and portable disposable-test launcher with fake-executor regression coverage.

## Sanitisation changes

Public README/architecture/decisions/handover and operational documents summarise technical contracts without personal chronology, account counts, family references, local username or actual hostname. Constitution rules are preserved with unrelated-project names generalised. Test origins/config examples use a reserved example domain. The optional Mac verification launcher derives its expected Docker socket from the current user's home directory rather than a named account; it still requires the same local desktop context and exact socket layout.

The public Git candidate is based only on the README seed, without private ancestry. Original private branches, source and evidence remain preserved separately. Never merge or push private local history into this public candidate as a shortcut.

## Verification

13 November 2026: the exported snapshot passed `npm run check` using the existing host Node 26 runtime and installed dependencies: 157 tests passed, zero failures or skips; project/lockfile checks, lint, TypeScript, client and server builds passed. No installation was performed. A limited source privacy/secret-pattern review of all 111 allowlisted files found no recognised secrets or targeted personal details. This is a technical-lead self-review, not an independent security audit. Actual Docker/PG16, GitHub CI, production activation and device checks were not repeated in this task.

## D046 scope and acceptance

Replace the preparation-only workflow absence test with an exact reviewed-content policy; keep the real policy inactive. Add safe cancellation/cleanup markers and verify the receipt and job-labelled resource inventory before claiming cleanup. Exercise normal, failure and interruption paths with injected executors only. Update public approval summaries, prepare the exact later activation diff, run installed-host checks and stop for owner review.

## D046 implementation and verification

Completed locally. The exact-byte SHA256 policy rejects all active workflows while mode is inactive; mocked rehearsal mode accepts only the named byte-identical reviewed draft. Tests reject extra/renamed workflows, changed permissions/triggers/runners and simultaneous draft/content changes without digest review. The policy file itself is review-controlled, not a security boundary against source editors.

Cleanup retains receipt/identity-based deletion, then verifies an empty receipt and exact job-labelled container/volume/network inventories. Fixed markers report the database-start checkpoint and verified cleanup. Mock scenarios cover normal cleanup, resumption after cancellation, create-before-receipt remnants, remove-before-receipt stale state, unavailable inventories and ownership changes. Unknown resources are never deleted by inference. Missing receipts cannot claim cleanup success.

**Actual checks: PASS.** Full installed-host `npm run check`:161 tests, zero failures/skips; project/lockfile, lint, type checks, client/server builds. An initial documentation-fixture failure exposed the new checklist link missing from the disposable foundation fixture; added that document to the fixture and reran the full gate successfully. No package or lockfile change. Final documentation/foundation checks passed25 tests; whitespace and unapplied activation-patch applicability checks passed. Evidence stays ignored in `.work/d046-quality.log` and `.work/d046-foundation.log`.

Prepared but did not apply `.work/d046-activation.patch`: change policy mode and copy the exact reviewed draft to its active path. Actual policy remains inactive and no active workflow exists. No Docker command, database, GitHub job, browser/device test, installation or advisory query was performed. GitHub cancellation timing and actual cleanup semantics remain unverified until separately approved execution. Technical-lead self-review, not independent security review. Private history/evidence and public PR #1 remain unchanged.

Constitution review: bounded approved local source/mocked verification only, production/security guards retained, actual results and limitations recorded; no operational approval inferred.

## Next gate

Review this local change and the [rehearsal checklist](ci/rehearsal-readiness.md). Any push/PR, temporary workflow activation, runner installation/downloads, disposable database/container creation and included-allowance execution needs explicit approval. No merge is required to conduct a separately approved rehearsal PR against main. Real credentials/data, paid spending and deployment remain excluded.


## D047 execution

Preflight: repository public, main default, only PR #1 open, zero existing workflows and no repository webhooks. Actions enabled; reviewed checkout/setup-node release SHAs unchanged. Log retention is90 days (no setting changed). Owner-confirmed included allowance/paid-usage block retained. Temporary runner/image/database operations approved; no local installation. Activation changes policy mode to rehearsal and copies exact reviewed draft; no changes to pins, job permissions or triggers. Stop on baseline failure and report without a second attempt.


## D047 actual outcomes — 13 November 2026

Accepted D046 and executed only the two approved attempts of [run43500524091](https://github.com/Capture418/Spotify_Playlist_Organiser/actions/runs/43500524091), head `25ff1ec61faa1672a47ec0558999e3eeb7cb71d1`, via [rehearsal PR #2](https://github.com/Capture418/Spotify_Playlist_Organiser/pull/2). No merge or deployment. Standard GitHub-hosted Ubuntu runner version2.338.2 executed pinned actions and Node22. No account billing/settings change or paid service; owner-confirmed included allowance and paid-usage block retained. Actual invoicing was not independently audited. Existing action release SHAs matched; fresh credential-free lockfile audit reported0 known vulnerabilities. Local activated-workflow gate passed161 tests before publication.

**Attempt1 baseline: PASS.** GitHub quality gate161 tests, zero failures; locked dependency installation, lint/types/client/server builds, linux/amd64 candidate build, pinned PostgreSQL pull and synthetic role/migration/runtime/health/outage/restore checks passed. Candidate image `sha256:ecfa028b68e6639797aaeac8ab6384f18c0cf9cebbd91007700b9ca5c10b675e`. Database-start marker20:20:21 UTC; scenario success20:20:29; normal and always-step cleanup both positively reported empty receipt and no remaining job-labelled containers, volumes or networks. This is actual runner evidence, not mock inference.

**Attempt2 controlled cancellation: CANCELLED, with a material coverage limit.** Same source revision, fresh runner/build, image `sha256:a19590ef18c87ee9c078a3fd1c5e6d5a81de2cc27ea74e1d0f06b26aec832a8a`. Monitor observed integration in progress at about4.7 seconds into the step and requested cancellation. Final logs establish database-start marker20:22:10.783 UTC, scenario success20:22:22.630, normal cleanup success20:22:23.000, cancellation reported20:22:23.020, and always-step cleanup success20:22:23.113. Thus cleanup was observed on a cancelled job, but actual interruption of unfinished synthetic work and recovery of resources from that interruption were **not demonstrated**. Do not mark that acceptance criterion passed or infer it from runner disposal. No extra attempt, injected delay, source change/retry or force cancellation was performed.

Private ignored evidence: `.work/d047-baseline.log`, `d047-cancellation.log`, `d047-cancel-observation.json`, `d047-audit.json`, `d047-local-check.log`; no dumps or secret values published. Normal GitHub log retention90 days. Logs capture only synthetic operations and fixed runner markers; no live Spotify or operational database access. Actual hosted login/VPN/device/backups/key custody remain outside this rehearsal.

Closed PR #2 after both attempts; restore inactive policy and remove the workflow in a follow-up commit on the closed branch, avoiding any third PR-triggered attempt. Preserve the inactive reviewed draft and all evidence. Do not delete branches, alter main or change PR #1. Final API verification: remote branch at98efc76, no workflow files in its tree; PR #2 CLOSED/unmerged; PR #1 OPEN at0bfeb55; main unchanged at README seed3f54e32. Exactly one workflow run with two attempts, completed/cancelled, and no third attempt. Final inactive local full gate passed161 tests, zero failures/skips, lint/types/build; whitespace checks passed.

**Next decision:** accept the baseline and stated cancellation limitation, or separately approve a bounded preparation change for a deterministic cancellation hold point, followed by a separately approved additional attempt. Permanent CI rollout, any merge, real data/credentials and deployment remain separately gated. No automatic extra work. Constitution review: narrow authorisation used, results/limits recorded honestly, private history preserved and temporary activation retired.
