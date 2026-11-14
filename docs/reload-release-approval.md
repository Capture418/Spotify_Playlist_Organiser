# Reload app release approval package

Status: **preparation only; execution not yet approved** (D078, 14 November 2026).

## Candidate and evidence

Owner accepts the local Reload app button and requests CI/deployment preparation for iPhone verification. Branch `codex/reload-app`, implementation `4705c8e`, reviewed against fetched main `23e300239c6f62e4dc72f0c673fa1481331d233a`. The runtime diff adds a connected-library header button calling normal page reload, responsive wrapping and guards during requests, offline state, tag editing and restore/deletion confirmations. Saved server data stays intact; transient search, selection and filters reset. Refresh catalogue remains a separate action. No dependency, schema, workflow, API, credentials or caching change.

D077 evidence: full installed-host quality gate passed227 tests, lint/types/project/lockfile checks and frontend/backend builds. Invented390px browser preview verified visible button, actual reload and editor guard. Busy/offline/restore/delete guards were source-reviewed, not independently exercised in the connected runtime. This is technical-lead self-review, not independent assurance. Actual iPhone standalone behaviour remains pending. Owner has reported artwork success on Mac/iPhone/Home Screen; final artwork keyboard/200% zoom/network checks remain open and are included in the release review below, not claimed complete.

## Proposed combined allowance

Recorded consumption is13 builds,16 synthetic attempts and6 deployment requests. D076 caps are15/18/8; its unused reserves are restricted to artwork corrections. This package explicitly proposes reassignment of those unused reserves and a small extension, not two overlapping budgets.

| Resource | Maximum from approval | New lifetime cap | Increase over existing cap |
| --- | --- | --- | --- |
| Candidate image builds | 4: initial PR/main pair and one diagnosed corrective pair | 17 | 2 |
| Disposable synthetic test attempts | 4: same pairs, including failed/cancelled attempts | 20 | 2 |
| Deployment requests | 3: initial, one corrective, one rollback | 9 | 1 |

Expected use: **two builds, two synthetic attempts and one deployment**. The remaining pair/deployment are reserves for a diagnosed defect in the Reload app change or the outstanding artwork acceptance checks; no unrelated features. Supersede the unused D076 execution reserves on approval. Do not double-count them as still available under that package. Count each actual build and started synthetic attempt, including reruns/failures/cancellations; a skipped stage consumes none. No unbounded retries. Stop at caps or for unexplained security/data-integrity failures. Existing host automatic rollback is part of a deployment request, not a separate manual request.

Included Actions allowance only, paid usage blocked. Approve existing locked runner/container dependency installation and pinned disposable resources only. No laptop/server installations, billing changes or new infrastructure. Local host checks use already installed dependencies; no additional local image/database rehearsal is included.

## Execution sequence

1. Recheck remote main, active runs, exact candidate diff and dependency advisories. Confirm included allowance available and paid usage blocked. Check secret names only: existing normal-mode settings, setup secrets absent. No secret values read or changed. Re-review unexpected main changes.
2. Publish one reviewed PR. Require full Linux quality gate, candidate build, existing actual disposable PostgreSQL/runtime scenario and scoped cleanup. Existing tests cover saved organisation, refresh/import and artwork persistence; do not describe them as new automated browser reload coverage.
3. Review exact passing head, then merge. **Merge automatically builds, tests, publishes and deploys normal mode.** No duplicate dispatch. Verify published digest matches tested image and record source/digest/counters. Keep any GitHub action-time prompt as a user handoff for the existing run.
4. Require successful migration command, deployed outcome, normal app and minimal health200. Existing migrations remain idempotent; no schema change, reset or maintenance. Extract safe statuses only, not raw secret-bearing logs.
5. Finish desktop keyboard/200% zoom/header and bounded network review, including outstanding artwork checks: normal reload uses same-origin app/API resources plus the approved image hosts; image requests omit page referrer and organiser credentials. No HAR, private payloads or cookies retained. Recheck saved state using existing-owner read-only browsing; no catalogue import is required for this feature.
6. Guide owner through iPhone checks below. Diagnose any failure before using the single corrective PR/main pair and corrective deployment. Do not broaden security/network policy, scopes or storage to make a test pass.
7. If the release cannot safely remain running, use at most one manual deployment of the pre-change verified artwork image: `ghcr.io/capture418/spotify_playlist_organiser@sha256:b83fd60160dc2d16ee3b5920ac9994554564ea5efdbafce0ae902f065b493aae`. This preserves the owner-tested artwork and removes the new reload control. No rebuild, database restore or setup secrets. If that image is implicated in an artwork defect, stop and report rather than selecting another target silently. Verify health/normal mode and record the rollback; do not call the new feature accepted after rollback.

## iPhone acceptance

- Initially close/reopen the Home Screen app to fetch the new version. If the old page remains, load the site in Safari and reload there; no reinstall, cleared website data or new credentials should be necessary. The old version cannot yet provide the new button.
- Over home Wi-Fi or VPN, see Reload app in the header with a comfortable touch target. Tap once; the library returns, saved tags/artwork remain, and the session remains usable. A legitimately expired session may still require normal sign-in.
- Set a temporary search/filter, then reload: the transient view resets as documented. No Spotify catalogue import should start.
- Open a tag editor: the background reload action must be inaccessible/disabled. Cancel; reload is available again. Do not discard a real unsaved edit to test this.
- Repeat a reload in Safari and the Home Screen app. Check a playlist/album Spotify link and artwork still work. Confirm one saved tag is visible on both Mac and iPhone; no private names or screenshots needed.
- With connectivity disabled, the online-only UI should disable Reload app; reconnect before continuing. This is not offline-library support.
- Report results and explicitly accept the release. Device success is separate from CI/health success.

No new credentials/scopes, secret/settings changes, provisioning, paid usage, production deletion/restore/maintenance or unrelated styling is included. Evidence-only commits stay local to avoid unintended main-triggered releases.

Suggested approval: **“I approve docs/reload-release-approval.md, including reassignment of the unused artwork reserves, lifetime caps of17 builds/20 synthetic attempts/9 deployments, reviewed PR/merge and bounded normal-mode deployments. Included allowance only.”**
