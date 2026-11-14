# Compact menu release approval package

Status: **approved for bounded execution under D082** (14 November 2026). Owner approved this package using included allowance only; all limits and exclusions apply.

## Candidate and evidence

Owner accepts the local menu changes and requests release preparation for iPhone checks. Branch `codex/library-actions-menu`, implementation `64232e7`, reviewed against fetched main `c145189fd6da25ef8e18e5a218d6d1142bc79cc7`. No open PR; latest PR and release runs are completed successfully at preparation time.

The connected library's permanent admin bar becomes a header disclosure with Reload app, Refresh from Spotify and Settings & data. The native modal panel contains existing export, recovery and account controls, with higher-impact actions separated. Close/Escape cancels pending confirmation UI without writing. Busy/offline guards and existing API handlers remain. Successful background polling becomes silent rather than replacing operation feedback. No dependency, workflow, schema, credentials, scopes or storage changes.

D080 local evidence: full quality gate227 tests passed; invented connected-browser checks at390px verified menu/panel fit, focus/dismissal, deletion confirmation without submission, guarded restore preview and cancellation, refresh error visibility and disabled reload/refresh while busy. Desktop1280px DOM measurements showed no horizontal overflow and a fitting panel; screenshot surface was cropped, so a complete desktop visual check remains. This is technical-lead self-review, not independent security assurance. CI database tests exercise existing runtime behaviour, not these browser interactions. Actual iPhone Safari/Home Screen behaviour is not yet verified.

## Proposed allowance and boundaries

Consumption is15 builds/18 synthetic attempts/7 deployment requests; current D079 caps are17/20/9. This package proposes reassigning its unused reserves to this release and extending the caps. These are one combined budget, not overlapping allocations.

| Resource | Maximum from approval | New lifetime cap | Increase over existing cap |
| --- | --- | --- | --- |
| Candidate image builds | 4: initial PR/main pair plus one diagnosed corrective pair | 19 | 2 |
| Disposable synthetic attempts | 4, including failed/cancelled attempts | 22 | 2 |
| Deployment requests | 3: initial, one corrective, one rollback | 10 | 1 |

Expected use: **two builds, two synthetic attempts and one deployment**. Count actual builds and started attempts, including reruns; skipped stages consume none. The corrective reserve is only for diagnosed defects in this menu release or the carried-forward reload/artwork acceptance checks. No unrelated feature work. On approval, unused D079 reserves are superseded, not retained as an additional budget. Stop at caps, unexplained security/data-integrity failures or any required material design change; no automatic retries or weakened checks.

Included Actions allowance only, paid usage blocked. Existing locked runner/container dependency installations and pinned disposable synthetic resources are included. No laptop/server installations, extra local database/image rehearsal, new infrastructure, credentials, scopes, secret/settings changes, paid usage, production maintenance, deletion or restore execution.

## Execution and rollback

1. Recheck exact diff, main, active runs and dependency advisories. Confirm included allowance remains available with paid usage blocked. Inspect setting names only: normal-mode settings retained and setup secrets absent. Re-review unexpected main changes; do not read or change values.
2. Publish one reviewed PR. Require Linux full quality gate, candidate image, actual disposable PostgreSQL/runtime verification and scoped cleanup. Local installed-host checks are permitted; no new host dependency installation.
3. Review the exact passing head, then merge. **Merge automatically runs the main build/test/publish/deploy chain.** Verify the published immutable digest corresponds to its tested image; no duplicate dispatch. Leave any GitHub action-time approval prompt to the owner for that run.
4. Require successful migration command, deployed outcome, normal mode and health200. Existing migrations are idempotent; no new schema migration/reset. Record safe source/digest/status markers and counters, never raw sensitive logs.
5. Review desktop layout, keyboard/focus,200% zoom and menu/modal cancellation, preserving existing user state. Finish outstanding artwork enlarged-card/editor and image-request-header checks where tooling permits. Inspect only necessary request metadata: same-origin API/app plus approved artwork hosts, no image referrer/organiser credentials. No HAR, response payload, cookie or private export evidence. Clearly record any remaining limitation rather than claiming completion.
6. Guide owner through the private iPhone checklist below. No production delete, restore, all-device sign-out or simulated token expiry. Any corrective release uses the single reserved PR/main pair and one corrective deployment only after diagnosis.
7. If the new release cannot safely remain running, permit at most one same-workflow deployment of the verified pre-menu image `ghcr.io/capture418/spotify_playlist_organiser@sha256:9de566dcf8ee1e710d9206670c452baef65feceacd65776fd9bbdd6ae2ab08cb`. It preserves the owner-tested artwork and Reload app button, restoring the previous control layout. No rebuild, database restore or setup secrets. Verify health/normal mode and report rollback; do not declare the menu accepted. Host automatic rollback belongs to its deployment request and is not an additional manual request. If the rollback image itself is implicated, stop rather than silently selecting a different one.

## iPhone checks after deployment

Use home Wi-Fi or VPN. Keep private titles, exports and credentials off chat.

1. Use the existing Reload app button once (or reload Safari) to get the new version. Confirm the permanent admin bar is gone and the ellipsis is easy to reach in Safari and the Home Screen app.
2. Open the menu: Reload app, Refresh from Spotify and Settings & data are available. Tap outside to close it. Reload app returns the library with saved tags/artwork intact; temporary search/filter state resets as before.
3. Refresh from Spotify once: see progress/completion or a usable error, with existing tags preserved. This is the existing read-only Spotify import, not new permissions. Avoid repeated retries if it fails.
4. Open Settings & data: text and controls fit, scroll when needed, and Close returns to the library. Export, Preview restore, Recover a snapshot and account controls are present. Export organisation may be checked once and retained privately; **do not select a restore file, confirm replacement/deletion or sign out all devices**. Dangerous operations remain synthetic-test evidence only.
5. Open an ordinary tag editor and cancel without changes. Background menu actions must be inaccessible while it is open. Check one playlist/album Spotify link and confirm a saved tag remains visible on Mac and iPhone.
6. Briefly disconnect internet: reload/refresh and online-dependent settings actions should disable; reconnect to continue. This is still an online-only app, not offline browsing.
7. Report any clipped controls, unexpected dismissal, errors or changed data. Explicit release acceptance follows the recorded results; CI/health alone is not device acceptance. Prior incomplete artwork checks remain explicit until completed.

Evidence-only commits remain local after release so they do not trigger another deployment. No unrelated styling or feature changes are included.

Suggested approval: **“I approve docs/menu-release-approval.md, including reserve reassignment, lifetime caps of19 builds/22 synthetic attempts/10 deployments, reviewed PR/merge and bounded deployments. Included allowance only.”**
