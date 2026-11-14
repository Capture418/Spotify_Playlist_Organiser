# Remaining pilot release approval package — D068 preparation

Status: **proposed, not approved for execution**. The owner accepted D067 and authorised this review/package only. This package supersedes conflicting execution instructions in the older pilot proposal once explicitly approved. Hosting authority remains the unchanged [home hosting contract](home-hosting.md).

## Outcome

A working Music Library Organiser at the existing HTTPS site, with the existing owner's playlists and saved albums imported read-only, persistent shared tags usable on Mac and iPhone, and online-only Home Screen installation. No new infrastructure, scopes, account model or product features.

## Reviewed candidate and evidence

Branch `codex/hosting-contract`; implementation commit `0d21e2d`; authoritative contract commit `4cc5ddb`. Documentation-only preparation commits may follow without changing the reviewed runtime. Remote main was read and fetched at `792915aed4c51fa8b9c29a562becbf12b52683a2`; no open PRs were returned on 14 November 2026. Recheck the actual base/head before execution rather than assuming those observations stay current.

This was a second **self-review**, not an independent security audit. Reviewed the actual diff against refreshed main, migration/runtime credential separation, public-schema grants and checksums, immutable journal records and identity binding, storage limits, health/cleanup, task commands, workflow triggers/permissions/digest linkage and D067 evidence. No additional release-blocking code finding was identified in that review. Corrected stale active architecture descriptions in this preparation. No runtime or workflow changes were needed.

D067 evidence: full installed-host gate passed 222 tests; exact-image PG16 verification passed restricted roles/cross-database denial, migration refusal/repeatability, mocked setup/OAuth/import, shared tags/conflicts, snapshots/restore, deletion, independent restore fencing, journal outage/recovery, real SIGTERM, dump limits and scoped cleanup. Local image `sha256:a4bd3a55e59d5b8cad54820ca46a8e06eaac1b67173f4ba11c5df81e9a1ec1c2` is evidence, not a published release digest. GitHub Linux CI, a new registry artifact, host deployment, real-library capacity and iPhone installation remain to be verified. Current action pins and dependencies are unchanged; no fresh external advisory audit is claimed here.

## One proposed execution approval

Approval would cover all of the following, with routine corrections inside these limits:

| Resource/action | Proposed bound |
| --- | --- |
| Additional candidate image builds | **3 maximum**: one PR check, one main release, one contingency |
| Additional disposable synthetic verification attempts | **4 maximum**, including failed or cancelled attempts |
| New lifetime counters | Builds at most **6 total** (3 already used); synthetic attempts at most **10 total** (6 already used) |
| Source publication | Push the sanitised release branch, open/update one PR, review its exact diff and merge it only with current passing checks |
| Workflow activation | Activate the reviewed main-push build/test/publish/deploy chain and manual deploy/maintenance definitions through that merge |
| Registry publication | Publish only the successfully tested main candidate to `ghcr.io/capture418/spotify_playlist_organiser`, record and verify its immutable digest; use the existing short-lived job token |
| Deploy requests | At most **4**: setup, one diagnosed corrective setup retry if needed, normal, one diagnosed corrective normal retry if needed |
| Credentials | Reuse existing settings and keys; guided private verification; remove **both** `APP_SETUP_MODE` and `APP_SETUP_TOKEN` together after setup; no other secret creation/rotation/deletion |
| Live pilot | Existing owner's consent, read-only playlist/album import, reversible tag edits and Mac/iPhone review |
| Cost/installations | Included allowance only; locked runner/container dependency installation and pinned synthetic images; no host installations or paid usage |

Two builds and two synthetic attempts are expected. The third build is a contingency, replacing the earlier two-build recommendation to reduce another approval round if a diagnosed correction is needed. It is not permission to weaken checks. A workflow rerun that rebuilds consumes another build even when its source is unchanged; four test attempts do not authorise four full build-workflow reruns. Batch local fixes before pushing. No automatic retries after caps, unexplained security/data-integrity failures or uncertain resource ownership.

The four deploy requests are a new remaining maximum, not additive to old unused setup/normal retry allowances. Automatic host rollback is permitted by the settled contract and is not a separate requested deploy. Corrective deploys require a diagnosed cause, verified candidate, unchanged approved design and remaining counters; never blind retries. Source corrections still need successful review/CI and must fit build limits. If those conditions cannot be met, report the single concrete blocker.

## Execution sequence and stop conditions

1. **Before publishing:** inspect current Git status/main and public diff; confirm the existing settings by names/status only, including setup mode/token, retained encryption keys, owner identity, client ID and exact HTTPS callback. Values stay in GitHub/password manager/browser. Confirm there is no unexpected running deployment and that included allowance remains available with paid usage blocked. Reuse Dad's supplied provisioning/backup facts; do not ask him to repeat settled details. Perform a current dependency/security check before live release; a material finding stops the affected release. No new credentials or permission scopes are authorised.
2. **PR:** push `codex/hosting-contract`, open one PR and run its GitHub-hosted Linux quality and synthetic image checks. Count any automatically triggered run. Review the merge diff, current successful check SHA, cleanup and secret-free runtime artifact before merging. No direct main push, force push or required-check/settings changes. Unrelated new main changes require review and may consume the same bounded allowance.
3. **Merge is also activation:** merging starts main CI, which builds its own candidate, tests it, verifies cleanup, publishes that exact image without rebuilding and passes its digest to the dependent deploy job. **Do not merge until ready for setup deployment.** A GitHub action-time “Approve and run” prompt, if shown, remains a user handoff for the existing run, not a reason to dispatch a duplicate. Future unrelated merges/deployments are not authorised by this package.
4. **Setup deployment:** the host runs `["node","runtime/server/migrate.js"]` using its owner URLs, then runs the app with restricted runtime URLs. Require outcome `deployed`, successful migration exit and HTTPS `/health` 200 before initiating Spotify sign-in. Record source SHA, run IDs, digest and safe statuses. A refusal/rollback/failure is not success; diagnose before any permitted corrective request. No database reset, restore, adoption of unexpected existing data or schema repair is authorised.
5. **Secure setup handoff:** the owner enters the existing setup token in the page's POST form, reviews Spotify consent in the browser and confirms the verified owner. Do not request secrets or codes in chat. Setup creates the owner latch, not the library import. Never sign in against an unhealthy app. The accepted nginx error-log caveat still applies.
6. **Return to normal:** remove both setup secrets in the same configuration change, retain all other settings/keys, and invoke the manual deploy workflow with the **same successfully deployed digest**. Do not rerun the release/build workflow merely to change mode. Require `deployed` and healthy normal mode. Treat failure as urgent: rollback can restore setup settings, but the durable latch must refuse another setup. Use only the bounded corrective normal attempt once the cause is understood.
7. **Pilot review:** normal-mode Spotify login/import; owner confirms playlist and album coverage, tags persist across Mac/iPhone, a small shared-tag edit survives refresh/reopen, concurrent edits produce a recoverable conflict, Spotify links open the correct editions, and Safari/Home Screen access works over VPN. Check desktop/mobile layout, keyboard access, 200% zoom and network requests. Export organisation privately before meaningful tagging work; retain synthetic evidence for destructive restore/deletion rather than testing those on real data. The user performs actual iPhone/Spotify handoff checks; emulation does not substitute.
8. **Finish:** record actual results, counters, cleanup, deployed digest and unresolved device observations; request owner pilot acceptance. Keep follow-up evidence commits local until a later approved release, because another main push would trigger the active release workflow. Do not claim a functioning accepted product solely from CI or health.

Maintenance workflows may become available through the reviewed merge, but **running production maintenance, key rotation, recovery tasks, account deletion, token revocation, database restores or backup tests is excluded**. Also excluded: provisioning, server policy changes, new credentials, subscriptions, billing changes, repository protection/settings changes, feature additions, unrelated merges and unattended future releases.

## Residual limits and handoffs

Existing contract risks remain accepted: VPN/online access, short deploy downtime, up to four hours of restore loss, retained master versions for journal history, and no rollback compatibility with the obsolete single-database image. The host reports no prior deployed image. A first-deploy failure may leave the site stopped; do not substitute the obsolete image. Synthetic backup/size evidence does not establish that the owner's full library fits the conservative storage budget; a rejected import must preserve organisation and be reported, not silently relaxed or pruned.

No new decision is needed from Dad on the settled contract. User interaction is needed only for GitHub security prompts if presented, private token/consent/setup steps, coordinated setup-secret removal and actual iPhone review. Ask one platform question only if a demonstrated requirement cannot be met within the contract.

Suggested approval: **“I approve the remaining pilot release package in docs/release-approval.md, including up to three additional builds, four synthetic attempts, the reviewed PR/merge and workflow activation, and the bounded setup/normal deployments. Use included allowance only and guide me through the private setup and iPhone checks.”**
