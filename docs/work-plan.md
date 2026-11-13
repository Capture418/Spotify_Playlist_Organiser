# Public work plan and handover

Updated: 13 November2026.

## Current task

D058: D057 accepted. Candidate image build passed; single exact-image rehearsal stopped at the required recovery fence. Cleanup verified. Fixture correction prepared locally; another execution awaits approval. Operational gates unchanged.

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

Closed PR #3 before publishing workflow retirement. Restore inactive policy and remove active file on the closed branch, then verify remote retirement and that this run has only attempt1. Preserve draft, history and evidence. Final local inactive gate passed165 tests, zero failures/skips, lint/types/build and whitespace checks. Remote API confirms branch7ce338d has no workflow files; PR #3 CLOSED/unmerged; PR #1 OPEN at0bfeb55; main unchanged at3f54e32. New run43502865462 completed at attempt1; historical D047 run remains at attempt2, with no extra run.

**Next:** owner review/accept D049 evidence, then propose a bounded normal PR-CI preparation task (restore baseline scenario command and define intended permanent trigger scope/required checks) without automatically activating or merging it. No further rehearsal or deployment is inferred. Constitution review: exact single-attempt authorisation honoured, truthful limits, scoped cleanup observed and temporary activation retired.


## D050 scope and acceptance

Prepare normal PR CI from the tested baseline while preserving cleanup/resource/security boundaries. Restore ordinary synthetic scenario execution, remove the one-off branch restriction and propose same-repository PRs targeting main on opened/synchronize/reopened/ready_for_review, including drafts. Keep the actual workflow absent. Update exact-byte policy with a distinct normal-pr mode, test event/branch/repository inclusion and rejection using synthetic contexts, and retain all cancellation/cleanup regressions. Document proposed required-check semantics and recurring-resource approval gates without changing GitHub settings.

See [normal PR CI proposal](ci/normal-pr-plan.md). Implementation complete: inactive draft restores baseline `run`, expands only the intended PR actions and removes only the one-off head-branch restriction. Exact repository/same-repository guard stays. No path filter or draft skip; no push/manual/fork/deploy job. Fixed pins, permissions, timeouts, resource constraints and cleanup logic are unchanged. Proposed future policy mode is normal-pr; the old rehearsal mode now fails validation and actual mode remains inactive.

**Actual validation: PASS.** Full installed-host gate166 tests, zero failures/skips; project/lockfile checks, lint, type checks and client/server builds. New mocked event matrix evaluates the exact draft condition for ordinary feature/fix/rehearsal branches and allowed actions; rejects fork/copy repos, other base branches and push/manual/target/closed/label events. Exact-byte inventory/mutation tests and all previous baseline/cancellation/cleanup regressions pass. These mocks are not a GitHub scheduler/branch-protection verification. No dependency/lockfile/application change; no external call, Docker/database operation, installation or remote CI run. Evidence `.work/d050-quality.log` and final documentation checks `.work/d050-foundation.log`.

Prepared but did not apply `.work/d050-activation.patch`: normal-pr policy mode and exact reviewed draft copy only. Existing older activation patches are historical; do not reuse them. Required-check recommendation is documented but no GitHub check requirement or rule is configured. Fork skipping must never be treated as code validation; contributor policy remains bounded to same-repository work.

Constitution/self-review: authorised local preparation only; no private-history publication, source privacy/whitespace reviewed, workflow remains absent and approval gates intact. No independent security audit claimed. D047/D049 execution approvals are exhausted; no recurring execution is inferred. **Next:** owner reviews the proposed normal event scope and separately approves publication/activation, recurring runner installations and disposable resources with an included-allowance execution bound; required-check settings, merges and deployment remain separate decisions.


## D051 activation and verification

Preflight: Actions enabled, reviewed action release SHAs unchanged, no repository webhooks, only original PR #1 open and all historical runs completed. Existing paid-usage block and included allowance remain owner-confirmed. Pins/lockfile unchanged since the recent reviewed rehearsals. Apply exactly the D050 activation patch; preserve main and PR #1. No automatic retry loop. CI is active on this branch's PR candidate; main remains README-only until a separately approved merge, so this does not claim every older branch already contains the workflow.

Local activated quality gate passed166 tests, lint/types/build and whitespace checks before publication. No application feature/dependency change. Published source `da7b46a43d72601e32e5004bb3c5aa9517c4edfe` and opened [PR #4](https://github.com/Capture418/Spotify_Playlist_Organiser/pull/4). No private-history publication, main push or merge.


## D051 verified result — 13 November 2026

[Normal CI run43504490222](https://github.com/Capture418/Spotify_Playlist_Organiser/actions/runs/43504490222) attempt1 completed SUCCESS on the recorded source. GitHub-hosted Node22 quality gate166 tests, zero failures; locked install, lint/types, client/server builds, Docker candidate build, pinned PostgreSQL and full synthetic role/migration/runtime/health/restore scenarios passed. Candidate image `sha256:91e66d7f181e6bf07be3c91ccb4d0b5024899e5fd28bb0674ba6cea26fca71f4`. Both normal cleanup and the independent always-step verified empty receipt and no remaining job-labelled containers, volumes or networks. Evidence `.work/d051-run.log`, local gate `.work/d051-local-check.log`. No rerun was needed.

Actual check identity: `verify`, GitHub App `github-actions` id15368, check-run132158444926, SUCCESS for `da7b46a43d72601e32e5004bb3c5aa9517c4edfe`. This is a candidate for a separately approved required-check configuration, not an applied setting. No branch-rule changes, merge queue, auto-merge or deployment changes occurred. PR #4 remains OPEN/unmerged; main still README seed `3f54e32771a04fd38a2f998ca871bca123257f75`. PR #1 remains the original snapshot proposal; no alteration/closure is inferred. The workflow stays active on this candidate under D051; it has not been merged into main or retrofitted onto older branches.

Execution used standard GitHub runners under owner-confirmed included allowance/paid-usage block. No billing setting changed or paid service selected; invoice-level usage not independently audited. Runner-only installations/synthetic resources were within D051. No local/server installation, real data, app credentials, operational provisioning or deployment. Source approval/security boundaries remain; this is not hosted application or device acceptance. Broader same-repository events are statically/mocked tested; only PR opened execution was exercised here, not every event type.

Final result documentation is checkpointed locally, avoiding an unnecessary documentation-only synchronize run. **Next:** review PR #4 and separately decide merge sequencing with PR #1 and required-check settings. Recommend the observed `verify` check from GitHub Actions for the intended current revision, while retaining owner merge approval and explicitly handling excluded fork PRs; a skipped fork check is not validation. Do not apply settings or merge without approval. Constitution review confirms bounded authorised CI, observed cleanup, no production activation and preserved private history/evidence.


## D052 PR review — 13 November 2026

Reviewed published PR #4 head `da7b46a43d72601e32e5004bb3c5aa9517c4edfe`, not the later local documentation-only checkpoints. GitHub reports OPEN/MERGEABLE with successful `verify`; PR #1 OPEN/MERGEABLE at `0bfeb550eec92516fdacb00f61ab125b2a46652b`, no checks. Both target README-only main3f54e32. Local ancestry proves #1's exact head is an ancestor of #4; the16-file delta is CI tooling/tests and docs only. No application src/server, Dockerfile, package or lockfile change relative to the previously reviewed snapshot. Reviewed the workflow, exact-byte policy, launcher cleanup, cancellation module and regression coverage. Diff whitespace passed; D051166-test hosted quality/integration/cleanup evidence is still for the exact published head. No redundant application run was requested. Later local documentation differs from #4 and is not claimed as remotely tested.

No blocking defect found for the approved same-repository normal-CI/development-snapshot scope. Technical-lead self-review, not independent security audit or production readiness certification. Two nonblocking observations: active workflow line1 still says INACTIVE (historical comment; execution is demonstrably active), and the required-check proposal must account for skipped fork jobs. GitHub accepts skipped/neutral checks for merge requirements; the same-repository condition at workflow line14 is therefore not a fail-closed fork merge gate. Do not describe `verify` alone as enforcing actual test execution for arbitrary PRs. Recommend a small separately approved eligibility-failure change before relying on it as the sole automated merge gate; reject disallowed forks before checkout, without executing fork code. No code changed in this review.

Read-only API inspection: no repository rulesets; main protection returned404 Branch not protected; merge-commit/squash/rebase methods available; auto-merge false; repository webhooks empty. No setting changed. Source contains only PR CI, no main-push/deploy workflow; production entry deliberately throws. External server-side automation is not proven absent by repository checks alone.

## Proposed merge sequence — not executed

1. Prefer **merge PR #4 directly using a merge commit**, after explicit approval, rechecking the exact published head, main and green current check. It already contains #1 and all accepted CI changes. This avoids landing a separate older untested snapshot or changing the tested merge base first. Preserve the sanitised ancestry; no private branch merge, direct main push, squash/rebase rewriting or branch deletion.
2. Verify resulting main tree equals the reviewed #4 tree and retains the sole PR-only workflow, then inspect #1. It may be marked merged because its commit is now reachable; if still open, close it as superseded/included, with explicit permission covering that housekeeping. **Do not merge #1 again after #4.** No deployment is part of this sequence.
3. Configure required checks only under a separate settings approval. Preferred prerequisite is the small fork-eligibility correction above, with reviewed/tested source. If owner wants to retain same-repository/manual-only policy initially, document that technical checks do not reject skipped forks and retain explicit human merge review; do not silently accept that limitation as universal enforcement.

Alternative if two separately recorded merges are important: merge #1 with a normal merge commit (not squash), refresh #4 against new main and require a fresh successful check before merging #4. This introduces an extra validation stage and #1 has no hosted check of its own, so it is not the recommended path. If any unpublished documentation is included before either merge, push/review the new head and wait for its CI; old green evidence must not be attributed to a changed revision.

## Proposed main rules — not applied

Use one main-targeted ruleset (or equivalent branch protection), require PRs, require context `verify` from GitHub Actions App15368, require branch up to date with main, require conversation resolution, block force pushes/deletion and apply protections to administrators/no routine bypass. Do not enable merge queue or auto-merge. No new deploy/main-push job. Confirm compatibility/available rule schema at application time.

Recommend0 mandatory GitHub approving reviews initially for this single-owner workflow while retaining explicit owner acceptance in the development process. GitHub disallows author self-approval; setting1 without another reviewer could block the owner. If the owner wants a technical second-person gate and nominates another reviewer with appropriate access, use1, dismiss stale approvals and require approval after the latest push. Do not invent that reviewer or change collaborators. Zero approvals is a deliberate proposed usability tradeoff, not a claim of enforced human review.

References checked: [required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [protected branch settings](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule), [author approval limits](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews). Settings and fork policy need explicit owner approval; this proposal does not modify them.

## Product readiness and shortest path to a working product

We have an accepted responsive invented-data interface, combined playlist/album tagging/filtering, proven read-only helper feasibility (earlier private evidence), synthetic persistent-session/edit/conflict/export/restore flows, security/lifecycle/startup components, online-only PWA assets and tested Linux/PG16 CI with cleanup evidence. This is a working prototype and tested backend foundation, not an integrated hosted product. Passing166 tests does not mean production is connected. `server/production.ts` deliberately refuses startup; `src/app/main.tsx` selects demo or synthetic UI, and `SyntheticLibrary` still calls synthetic-login. PreparedApplication/BootstrapPreparation are components, not a complete production executable/operator process.

Remaining delivery slices:

1. **Complete the real application flow in code, first with mocked/invented inputs.** Production-facing sign-in/reconnect UI, session lifecycle and initial/refresh import of playlists/albums into the shared tag library; preserve edits/conflicts, exports/restores and deletion UX. Compose validated runtime config, migration/startup checks, owner bootstrap, transports, keys, journal, listener and maintenance/shutdown. Keep demo/test controls out of production. This is more than removing the deliberate guard; leave activation gated until the operational prerequisites hold. Recommend this as the next substantive development milestone after repository consolidation.
2. **Finish release/deployment preparation.** Build/publish a reviewed immutable image and adapt the actual home-server runner/proxy contract; executable health/startup budget, backwards-compatible migration/rollback strategy and exact tested-image handoff. No deploy workflow or registry publication is present yet. Preparation can be synthetic; actual publishing, credentials, server changes and deployment remain separately approved.
3. **Verify real operational prerequisites before meaningful private data.** Actual app/journal databases and least-privilege roles, runtime settings and Spotify HTTPS callback, owner binding, separate encryption keys with recoverable custody, encrypted backups and tested restore/deletion reconciliation. Earlier approvals selected policies; existence/correctness on the server is not verified by local synthetic tests. Confirm with the operator rather than assume provisioned resources/backups.
4. **Approved private pilot over VPN.** Deploy, connect the real read-only account, check full library coverage/tag preservation and edits across Mac/iPhone, browser/session expiry/reconnect, concurrent edits, outage/restore/revocation. Test actual iPhone Add to Home Screen/standalone layout/login/Spotify links. Online-only means VPN/network required; offline library editing and App Store distribution are not included. After acceptance, use the app with the approved recovery arrangements.

No honest completion percentage/date follows from current evidence: integration and server/device acceptance are substantial remaining work. CI setup is now established; future effort should concentrate on the production user journey and operational readiness, not further rehearsals without a concrete gap. This roadmap is a proposal, not approval to connect real data, provision services or deploy.

D052 constitution check: acceptance recorded, exact PR/source and real evidence distinguished, no merge/settings/deploy action, private history retained. Documentation/foundation and whitespace checks validate this local handover. No public PR comment/review submitted or source changed.


## D053 implementation and verification — 13 November 2026

Scope/acceptance: connect the existing production-facing user journey and prepared startup composition using invented inputs, preserve approved tagging/conflict/recovery semantics and all authentication/proxy guards, keep synthetic controls out of connected mode, validate with installed-host tests and browser review. Likely files were the shared library UI, API mapping, HTTP/prepared application/startup composition and their tests. No design change or new dependency was needed.

Implemented a server-selected connected interface, validated Spotify PKCE sign-in/reconnect navigation, session loading and initial import after callback, catalogue refresh, existing server-confirmed editing/recovery/deletion controls and connected-mode wording. The connected interface cannot mount synthetic authentication/harness controls. Callback redirect carries only a non-sensitive completion marker. Added explicit application composition connecting configuration, purpose-separated keys, store/vault, independent journal and transport to the migration/readiness startup sequence. Listener shutdown disposes maintenance even when startup fails before listening. No owner is created implicitly; existing bootstrap/recovery gates remain. `npm start` still deliberately refuses activation.

Installed-host full quality gate: 173 tests passed, zero failures/skips; project/lockfile validation, lint, TypeScript and client/server builds passed. Seven new mocked tests cover OAuth destination validation, composition/key separation, listener failure/cancellation/disposal, secure cookie/callback/CSRF routing and synthetic-control exclusion. No installations, database/container creation, real credentials or live Spotify calls. This is mocked integration evidence, not a new PostgreSQL16 or hosted-CI execution.

Browser review used the built connected UI against an ignored, memory-only invented API preview on loopback. Observed initial refresh then library load, tag save confirmation, retained tag after catalogue refresh, combined title/tag search, sign-out clearing the library and a deliberately disabled login returning a safe error without navigation. Desktop layout and 390×844 narrow viewport inspected. Found and fixed stale synthetic wording in the shared connected screen. Actual production HTML title is now changed at the HTTP boundary; preview served the demo title and is not evidence for that title change. Preview request log showed local assets/session/library/edit/refresh/signout/login paths; this was not a comprehensive browser network audit. Preview stopped and viewport override reset. No actual iPhone/standalone, 200% zoom, live OAuth or HTTPS-cookie browser test is claimed.

Technical-lead self-review, including a separate pass over auth boundaries and startup cleanup, found no intended weakening of existing guards. Not an independent security audit. No lockfile, dependency, workflow, migration or deployment change. Private history/evidence preserved; no remote push, merge, rule setting or provisioning. Constitution review: bounded approved scope, invented data, honest evidence and operational gates retained.

Next proposed bounded task: exercise this new composition against disposable local PostgreSQL16 and mocked Spotify end to end (including reconnect, failed initial import, cross-session edits, shutdown and recovery), under explicit approval for synthetic database/container execution. Then prepare the executable/operator bootstrap and immutable-image release package for review. Real owner bootstrap, keys, server readiness/backups, live OAuth, deployment and Mac/iPhone acceptance remain separate gates. Do not remove the production guard merely because the local UI and unit tests pass.


## D054 scope and acceptance

Use installed Docker/cached images, newly owned disposable app/journal databases and internal networking only. Exercise actual startup, connected HTTP/OAuth session flow, failed initial import and retry, shared tags/conflicts, reconnect, restore snapshot, deletion/recovery and clean shutdown. Test scripts and documentation are the expected changes; fix only failures within the accepted design. Run host quality checks and verify task-resource cleanup. No live Spotify transport, browser/device acceptance or production activation is implied.


## D054 actual results — 13 November 2026

PASS: five end-to-end scenario groups against real disposable PostgreSQL16, using the current compiled application mounted read-only into the already-installed Node22.23.5 runtime. Existing runtime image `sha256:855c5e68e89e22e1c5cb58fd56e0204d757284e140e3360d17286b942991b1e1`; PostgreSQL digest `sha256:a2f7e20374cd8fd8ed4a588b79549e10589bea7b1686e77922f5ac741b80b8a1`. This is current-source verification in a cached runtime, not a newly built immutable release image. No pull, install or image build. Preflight found about14GiB available disk and Docker4GiB memory; each container bounded to512MiB/one CPU.

- Actual separate roles, migrations, journal/recovery approval and integrated startup; migration pools retired, production-facing HTML marker/title served, internal health and Host/session guards enforced.
- HTTP login and callback with mocked token/identity exchange, secure cookie attributes, failed initial import followed by successful playlist/album import.
- Shared tag saved to both item types, second-session stale revision rejected, refresh failure preserved organisation, successful refresh preserved tags, reconnect invalidated the replaced session while retaining the other session.
- Replace-only restore preview/confirmation created a snapshot; snapshot preview/confirmation recovered assignments. Shutdown closed startup pools/listener and restart preserved organisation/session access.
- Sign-out invalidated the session; disconnect wrote the independent encrypted deletion journal and invalidated access; deleted-owner startup failed closed and released its pools.

`npm run check` passed173 host tests, zero failures/skips, project/lockfile checks, lint, TypeScript and both builds. New database scenarios are separate from that173 count. Existing application code needed no correction. Added `scripts/database/connected-run.mjs` and `connected.mjs`; the former requires explicit `CONNECTED_DISPOSABLE_APPROVED=synthetic-only`, local Mac Docker context, cached artifacts and an absent receipt. It refuses inherited operational settings and existing resources, then uses label/identity-checked cleanup. Keep receipts/evidence ignored. A future rerun requires review/archive of the empty receipt; do not blindly remove a receipt that may describe remaining resources.

Actual preparation failures: tagged PostgreSQL reference was absent but its exact digest was cached; the local executor now uses that digest without pulling. The old cached image lacked newer PWA runtime files, so the current compiled runtime is mounted read-only for both runtime validation and the connected scenarios. Two test-client errors (assuming cookie attribute order and sending an undefined pre-session header) were corrected. All failed attempts ran scoped cleanup before another attempt. No application guard was weakened.

Final run evidence: `.work/d054-e2e.log`, `.work/connected-e2e/scenarios.log`, `.work/d054-quality-final.log`. Final receipt resources array empty. A separate post-run Docker query independently returned no task-labelled containers, volumes or networks. All network resources were internal, no host ports published, app filesystem read-only, non-root, capabilities dropped and no-new-privileges enabled. Existing unrelated Docker resources were preserved.

Limits: HTTP client supplied the trusted proxy headers inside the isolated container; no real HTTPS proxy, browser cookie enforcement, live Spotify or iPhone test. The independent journal and snapshot recovery paths were exercised, but this task did not repeat the older pg_dump/server-loss backup restoration suite. No claim that server backups/roles/keys exist. No real data/credentials, operational provisioning, installation, spending, push, merge, settings change or deployment. Production executable refusal still verified by runtime check.

Technical-lead self-review of test resource boundaries, assertions and cleanup; not an independent security audit. Constitution review confirms approved synthetic-only execution, truthful limits and preserved approval gates. **Next proposal:** bounded release preparation for the executable/operator bootstrap and deployment contract, with mocked tests and a reviewable configuration/rollback checklist. Actual credentials, image publication, server provisioning, installation, deployment and live/device acceptance require separate approvals.


## D055 scope and acceptance

Prepare a dependency-injected process lifecycle around the accepted startup composition, including safe status reporting, repeated signals, startup failure and bounded shutdown. Keep production.ts blocked and default real transports unavailable. Document exact initial setup versus recovery order, owner verification/confirmation, configuration custody, release artifact/rollback evidence and separate activation approvals. Expected files: server process preparation/tests and canonical/operator docs. Use host mocked tests and full quality gate only; no database/container operation or browser/live OAuth.


## D055 actual results — 13 November 2026

Added the dependency-injected `prepareProcess` lifecycle: readiness only after startup, SIGINT/SIGTERM handling, one close on repeated signals, sanitised fixed failure categories,10-second stop deadline and late-start disposal. There is no import-time process/network/database activity, no default pool/transport and no executable caller. `production.ts`, image command, workflow, schema, dependencies and lockfile remain unchanged.

Prepared `docs/production-setup.md`: executable wiring proposal; setting names/custody; ordered first-time migration/journal/recovery/verified-owner setup; ordinary restart versus restore; immutable-image/previous-release compatibility evidence and separate approval gates. No runnable real setup command or public setup endpoint was introduced. The owner-bootstrap primitive exists, but its operator callback/UI delivery still requires an approved design and operator access contract; this is stated explicitly, not marked operationally complete. Proposed10-second app shutdown deadline requires an operator stop grace greater than10 seconds (recommend15), still to confirm.

Actual checks: `npm run check` PASS178 tests, zero failures/skips, project/lockfile checks, lint, TypeScript and client/server builds. Five new mocked tests cover readiness/repeated signals, sanitised startup failure, stop during startup, deadline with late result and failed/hung close. No real signals, process exits, delays, listeners, database/container execution or live transport used by those tests. Evidence `.work/d055-quality.log`; final documentation checks `.work/d055-foundation.log`. Diff whitespace and a separate technical-lead self-review of process cleanup/status and operational boundaries passed. Not independent security review or executable/container acceptance.

Constitution check: D054 acceptance recorded; one bounded preparation task; no installation, real data/credentials, provisioning, spending, push, merge, settings or deployment. Private evidence/history retained. Production activation still refuses; the initialisation/recovery design remains operator-confirmed and cannot silently recreate a missing journal or deleted owner.

Next: owner review/accept D055 and obtain operator answers before implementing the temporary setup delivery. Exact questions: Can a short-lived setup process use the existing canonical HTTPS callback/proxy while ordinary app traffic is stopped? Can access during that window be restricted to the owner/operator beyond merely knowing the URL? Can container stop grace be at least15 seconds? Confirm the180-second healthy-start budget. Request answers only, no provisioning or settings change. Then propose a bounded synthetic implementation/rehearsal of that approved operator mode and executable wiring; real activation, credentials, immutable-image publication and deployment stay separate.


### D055 timing follow-up

Owner confirmed the operator contract:180 seconds to become healthy including migrations;20 seconds shutdown after SIGTERM. The local README lacked that contract section, so it now records the supplied limits with an attribution/verification boundary. Updated the current setup package; historical proposal above remains a record of the earlier question. App startup150 seconds and shutdown10 seconds already fit; no source/runtime change needed. No remote README or server setting independently inspected, fetched or changed. D055 acceptance and temporary setup callback/access decisions remain outstanding. Documentation/foundation and whitespace checks passed; no application tests or operational checks repeated for this documentation-only clarification. No push, merge, deployment or other gated action.


## D056 scope and acceptance

Build token/session/PKCE/identity/confirmation setup flow, isolate normal routes, retain honest health and durable one-time ownership semantics. Reuse existing persisted accounts plus retained deletion records as the completion latch, checked transactionally under the bootstrap lock; independent journal/recovery checks prevent restoration bypass. This avoids a schema change and preserves prior-image compatibility. No automatic journal initialisation or recovery approval. Test unit/session/HTTP security, actual PostgreSQL setup-to-normal/restart/deletion refusal and resource cleanup. Expected files: setup service/HTTP, application mode composition, tests and operator docs.


## D056 actual result — 13 November 2026

Implemented prepared same-image setup mode with token POST and constant-time hashed comparison, five-minute Secure/HttpOnly/SameSite=Lax session, CSRF-protected forms, session-bound state/PKCE, exact configured account-ID check and explicit confirmation. Token is never a URL parameter; query strings on non-callback routes are rejected. Unauthenticated view is a generic token form, not privileged setup details. Normal app routes are not mounted. Setup stores no Spotify grants or metadata; completion/close clears all in-memory sessions/proofs. Global unlock limits are five attempts/minute then15-minute lockout, plus120 general requests/minute. This bounded global lockout avoids an indefinite lockout; LAN/VPN users could still deliberately cause temporary denial of service.

Durable closure uses any existing account or retained deletion record, plus independent journal refusal, instead of a new table/migration. Atomic completion takes the existing bootstrap advisory lock and recovery-guard row lock and rechecks all local ownership/deletion state. This keeps existing migration checksums/version unchanged and previous normal source compatible. Restore to stale database state still requires independent journal reconciliation; no claim to infer lost deletion records. Setup requires an explicitly initialised journal and approved recovery state. Setup health reports minimal200 only when both database queries succeed (503 otherwise); completed setup remains healthy but closed until the operator returns it to normal.

Actual host quality gate PASS184 tests, zero failures/skips, project/lockfile validation, lint, types and frontend/server builds. Six added tests cover token/session/state/PKCE/identity, proof/confirmation, expiry/lockout, form/HTTP/health/error boundaries and invalid/leftover mode settings before resources. An initial strip-only TypeScript incompatibility in the new constructor was corrected before the passing gate. No dependency installation/change.

Actual disposable Node22/PostgreSQL16 run PASS with current compiled source mounted read-only into the cached runtime, mocked Spotify and internal networking/no published ports. Added setup checks to the guarded existing runner via explicit `setup` argument and independent D056 receipt/labels. Observed: unauthenticated callback/normal-route rejection; token cookie and CSRF enforcement; wrong owner rejection; successful verification and explicit completion; no stored connection grants; setup closed immediately and after restart with restored setup configuration; normal-mode library/login/import/conflict/restore/restart flows passed; deleted owner could not be recreated with setup configuration restored. This simulates configuration rollback, not a real deploy or old-image execution. Previous normal schema compatibility follows no schema change; no new old-image rehearsal claimed.

Final scoped cleanup reported an empty receipt/resources inventory; separate Docker queries confirmed zero task-labelled containers, volumes and networks. No unrelated resources changed. Evidence `.work/d056-e2e.log`, `.work/setup-e2e/scenarios.log`, `.work/setup-e2e/receipt.json`, `.work/d056-quality-final.log`. About13GiB disk available before execution; cached artifacts only, no pulls/build/install. Normal executable remains blocked and cached runtime verification confirms refusal. No real Spotify, credentials, server provisioning, settings, push, merge or deployment.

Self-review covered token placement, session/CSRF binding, identity enforcement, expiry, concurrent completion checks, shutdown invalidation, persisted refusal and secret-free error handling. Not an independent security audit. No live proxy/log inspection, browser/iPhone/Secure-cookie enforcement test, actual server timeout/rollback or backup drill in this task. Owner accepts residual callback exposure in operator-restricted error logs; do not claim those logs can never contain codes.

Constitution review: bounded approved implementation/resource use, existing semantics and guards retained, scope/results documented truthfully, private evidence preserved. Next: owner acceptance of D056, then bounded release-readiness preparation/rehearsal for the gated executable, exact image and operator initial journal/recovery procedure. Actual keys/token/configuration, initial storage/server actions, real OAuth/device acceptance and setup-to-normal deployments remain separate approvals. Remove setup mode and token together during that later return; failed normal deployment remains urgent.


## D057 scope and acceptance

Add an exact cached-image verification mode with no compiled-runtime bind overlay, a first-ever-empty journal initialisation primitive with explicit operator attestations and no recovery approval, and mocked safety tests. Prepare the later build/install/resource approval package and identify how the no-shell server will run privileged initialisation. Expected files: guarded runner/plan tests, operator primitive/tests, rehearsal fixture and docs. Full installed-host gate; no Docker/DB/build/publish execution.


## D057 actual results — 13 November 2026

Prepared `release <sha256:image-id>` mode in the existing local runner with a pure validated argument/mount plan. It rejects tags/unknown arguments, inspects exact image identity and omits the host compiled-runtime overlay for both runtime inspection and connected scenarios. Uses separate D057 resource names/receipt; existing internal network, role fixtures, restrictions and scoped cleanup remain. No release mode was executed. Added planned explicit journal-initialisation assertions to the existing invented setup-to-normal scenario; those assertions are not claimed as database-tested yet.

Added `initialiseEmptyJournal`, an operator-only injected-pool primitive with no executable/HTTP caller or default connections. Requires first-ever/app-stopped/independent-inventory attestations, distinct pools, journal-purpose cipher, verified schemas, blocked recovery guard and empty application/journal storage. Locks bootstrap/guard and journal table; inserts encrypted empty journal only, never resets data or clears the guard. Cross-database partial commit is explicitly surfaced and requires operator inspection; retries never overwrite an existing journal. No migration/schema/role change. External first-use evidence remains necessary because empty SQL tables cannot prove absence of lost history.

Prepared `docs/release-rehearsal.md` with exact artifact evidence, proposed Linux-amd64 Docker build and its explicit in-container npm installation/download approval requirement, immutable-ID execution, scoped cleanup, failure boundaries and remaining release gates. No image built/pulled/published, no Docker/database command run, no dependency installation, real credentials/data, server provisioning, settings change, push, merge or deployment. Production executable and workflow unchanged.

Validation PASS: full installed-host gate191 tests, zero failures/skips, project/lockfile checks, lint, TypeScript and frontend/server builds. Seven new mocked tests cover exact-image/no-overlay plan and rejected arguments, initialisation confirmation/purpose/empty-state checks, encrypted payload/blocked guard, insert rollback and cross-database partial commit. Evidence `.work/d057-quality-final.log`; final documentation/foundation `.work/d057-foundation.log`; diff whitespace passed. Technical-lead separate self-review of role boundary, partial failure, no implicit recovery and image identity; not independent security audit or actual image/database rehearsal.

Operator checkpoint: no user shell and one app slot mean a supported operator-run one-time maintenance job must be agreed before real initialisation. No public initialisation endpoint or automatic startup bypass added. Ask the operator whether a reviewed-image maintenance job can run with app stopped, injected secret-safe configuration and all required roles; ask for the supported invocation and first-use/inventory/backup evidence, not secret values or immediate changes.

Next approval proposal: accept D057 and separately approve one bounded local candidate Docker build (including its locked in-container dependency installations and any explicitly permitted downloads), exact-image runtime/initialisation/setup-to-normal verification and disposable local resources with cleanup. No automatic retry on failed execution; retain evidence and report. Real operator invocation, credentials, registry publication, executable activation, server provisioning, deployment and device acceptance remain gated. Constitution check confirms bounded preparation, truthful evidence, preserved private history and approval gates.


## D058 execution scope

Source code baseline357aee841e14458ccca5435f9633228cbd69bfe7; only approval/evidence documentation changes before building. Preflight clean Git tree,12GiB available disk, Docker4GiB memory and exact pinned amd64 Node/PostgreSQL artifacts cached. Dockerfile SHA25648331707c09ea8bb05e682747e2a7c02a1481b31ecefd36108c3fc8b9c110c89; lockfile SHA25694706ec4d2c18e16174fbbc4160cddf8398f828e80c3e1254499b49fa906768d. Build one local Linux-amd64 image, inspect exact identity, run release-mode operator/setup/normal tests without host runtime overlay, verify cleanup. No production activation or live data.


## D058 actual outcome — 13 November 2026

One local Linux-amd64 build PASS. Exact local image ID `sha256:ffae59f1c5a534da80d9690c28d9e8ec6705e1538e3d9060cafb0c594d0c292c`; inspect confirms linux/amd64, node user, expected blocked production command and15-second health interval/5-second timeout/3 retries. Both npm-ci layers were CACHED; the approved installation allowance was not used for a fresh dependency install. Source compilation and client/server builds ran in the image. No host installation, registry publication or remote deployment. Retain `.work/release-candidate.id`, `.work/d058-build.log`, `.work/d058-image.json`. This local image identity is not a published registry digest or production acceptance.

One exact-image disposable verification attempt FAILED at operator initialisation with `Blocked recovery guard required`. Runtime restrictions/assets/default executable-refusal check passed before creating the test databases. The current v3 migration deliberately inserts `blocked=false`; the new initialisation primitive requires a prior explicit operator fence. The harness omitted that fence. This is a rehearsal-fixture/procedure defect; the security guard correctly refused. No journal initialisation or subsequent setup-to-normal scenario success is claimed for this attempt.

Scoped cleanup PASS; final receipt has no resources. Independent Docker container/volume/network queries returned no task-labelled resources. Existing resources and the candidate image retained. No automatic retry or rebuild. Evidence `.work/d058-e2e.log`, `.work/release-e2e/receipt.json`; preserve the failed receipt/log before any later approved execution.

Prepared the missing explicit `UPDATE recovery_guard SET blocked=true` in the disposable harness after migration and before first-use initialisation; updated both operator/rehearsal documents. Did not edit applied migrations, relax the initialisation check, auto-fence in the production app or approve recovery. This harness is mounted separately, so the application image is unchanged and can be reused for an approved rerun; do not attribute the failed attempt's result to the corrected harness.

Documentation/foundation gate32 tests passed for initial approval docs. Full installed-host gate after the fixture correction PASS191 tests, zero failures/skips, lint/types and both builds, recorded in `.work/d058-quality.log`; no additional database execution. Technical-lead self-review confirmed the fence is before privileged journal creation and remains blocked until separate reconciliation/approval. Constitution check: exact bounded execution, observed failure/cleanup, no hidden retries and no real data/credentials, server provisioning, push, merge, settings change or deployment.

Next decision: approve one rerun using this same exact image and the corrected external harness, with disposable local resources and cleanup. No image rebuild or fresh installation is needed. The operator maintenance-job invocation question and production executable activation remain separate outstanding work.
