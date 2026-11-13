# Public work plan and handover

Updated: 13 November2026.

## Current task

D049 completed: one cancellation-only attempt interrupted the bounded hold and independent cleanup verified no remaining job-labelled resources. PR #3 closed without merge. Temporary workflow is removed locally and policy inactive; publish retirement only after closure. No retries, merge or deployment.

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


## D048 bounded task and acceptance

Add an explicit cancellation-only CLI mode that sets up the existing isolated synthetic resources and waits at most120 seconds for cancellation without proceeding to integration scenarios. SIGINT/SIGTERM abort the wait; timeout is a failure, not a successful scenario. Preserve scoped cleanup and independent always-step cleanup; keep signal handlers local to the probe and remove them afterwards. Tests use injected waiting/signals/executors, no real sleep or Docker. Keep the real workflow absent and policy inactive; update the inactive draft/digest and exact unapplied activation proposal. No changes to dependencies, application code, database roles, production guards or previous evidence.

Implemented `cancellation-hold` as a separate CLI mode using the existing guarded launcher/receipt. Its fixed120-second abortable wait follows setup and never enters integration scenarios. SIGINT/SIGTERM abort it; listeners are removed when the probe finishes. Timeout fails rather than falling through. Both failure and cancellation enter scoped cleanup, whose errors remain failures. The independent workflow always-cleanup step remains unchanged. Draft step name/command and reviewed SHA256 are updated; policy remains inactive.

**Actual validation: PASS.** Full installed-host gate165 tests, zero failures/skips; project/lockfile checks, lint, TypeScript and client/server builds. Four new mocked tests cover live-resource hold, SIGINT, SIGTERM, uncancelled timeout, setup/pre-cancel failure, cleanup failure, no scenario execution and listener removal. Existing baseline/receipt-gap/ownership tests still pass. No timer delay, real process signal, Docker, database, network, installation or GitHub run was used. Logs: `.work/d048-quality.log`; final documentation checks recorded in `.work/d048-foundation.log`. Technical-lead self-review confirms application code, dependencies, lockfile, resource constraints, action/image pins and production guards unchanged.

Prepared `.work/d048-activation.patch` without applying it: policy mode change plus exact draft copy. Old D046 activation evidence is historical and must not be reused for this revised draft. Privacy/whitespace and patch applicability checks accompany the local checkpoint. No push, merge, activation or operational work occurred. Original private history/evidence and remote PRs remain unchanged. Next operational execution remains separately approved. The checkpoint will demonstrate cancellation with live disposable resources, not interruption of an in-flight SQL transaction or recovery from SIGKILL/runner loss.


## D049 execution

Preflight confirms only PR #1 open, no repository webhooks, Actions enabled, reviewed action release SHAs unchanged and no running jobs. Main remains README-only; remote rehearsal tree has no workflow file. GitHub retains the historical workflow registration as active, but it has no current main/branch file to trigger. D047's included-usage controls,90-day log retention and recent zero-vulnerability lockfile review remain evidence; no package/pin change. Apply exactly the reviewed D048 patch and run local validation before publishing. One attempt only; stop on failure or missed cancellation.


## D049 actual result — 13 November 2026

One attempt only: [run43502865462](https://github.com/Capture418/Spotify_Playlist_Organiser/actions/runs/43502865462), source `9718b0c1f726a399c66aab15b21c9e791f9a08dd`, [PR #3](https://github.com/Capture418/Spotify_Playlist_Organiser/pull/3). GitHub conclusion CANCELLED as intended, not a green baseline. The requested bounded cancellation/cleanup evidence is satisfied within the limits below.

Node22 runner quality gate passed165 tests, zero failures; pinned action setup, locked installation and Docker/PostgreSQL image preparation passed. Candidate image `sha256:38098f33348469cbcd3bc9f42a4d5f61f724bba74ad65472964564f947085fc5`. Live-resource READY marker at20:35:28.566 UTC; cancellation at20:35:46.781, well before the120-second timeout. No scenario-success or timeout completion occurred. The independent Scoped cleanup step succeeded at20:35:47.290 and positively verified an empty receipt and no job-labelled containers, volumes or networks remaining. This is observed cleanup, not an inference from runner disposal.

No `CANCELLED hold` signal-handler marker or in-process cleanup marker appears. Therefore this proves cancellation during an unfinished hold plus successful independent receipt-based cleanup, not graceful delivery/execution of the Node SIGINT/SIGTERM handler. It does not test SQL interruption/transaction rollback, SIGKILL recovery on a surviving runner, runner-loss cleanup or application graceful shutdown. Mocked signal-handler coverage remains local evidence only. No repeat is authorised or needed to describe this result honestly.

Included-allowance standard GitHub runner used under the owner's confirmed paid-usage block; no billing change or paid service, though invoice-level costs were not independently audited. No app credentials, live data, local/server installations, operational provisioning, merge or deployment. Main and PR #1 remain untouched. Retain `.work/d049-local-check.log`, `d049-cancellation.log`, `d049-cancel-observation.json` and run-id evidence privately; no database dump/artifact upload. D047 baseline evidence remains separate and is not re-claimed as part of this cancellation-only mode.

Closed PR #3 before publishing workflow retirement. Restore inactive policy and remove active file on the closed branch, then verify remote retirement and that this run has only attempt1. Preserve draft, history and evidence. Final local inactive gate and remote checks recorded after completion.

**Next:** owner review/accept D049 evidence, then propose a bounded normal PR-CI preparation task (restore baseline scenario command and define intended permanent trigger scope/required checks) without automatically activating or merging it. No further rehearsal or deployment is inferred. Constitution review: exact single-attempt authorisation honoured, truthful limits, scoped cleanup observed and temporary activation retired.
