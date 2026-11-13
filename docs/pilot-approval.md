# Consolidated private pilot approval package — D063

Status: **prepared, not approved for execution**. D062 is accepted. Credentials, real Spotify access, publication/merging and deployment have not been authorised by preparation. This package groups those actions into one bounded decision. Routine implementation and fixes inside the accepted design do not need further checkpoint approvals.

## Outcome to review

One owner uses the existing VPN/home-network HTTPS site on Mac and iPhone, imports real playlists and saved albums read-only, shares tags across both, saves edits to the existing PostgreSQL database, and opens items in Spotify. The iPhone can add the online-only app to its Home Screen. VPN/network access is required; no offline library or editing is promised. The operator helps with infrastructure/secrets, not a second organiser account. Adding another owner's library is outside this pilot.

No new hosting, journal database, roles, domain, tunnel, subscriptions, analytics, scopes or database reset. The fixed platform contract stands without further questions. Backups run every four hours and an older restore can undo deletions as well as edits. App-image rollback does not roll back the database. These accepted limits are unchanged.

## What is already proven, and what remains

D062 passed one exact-image PostgreSQL16 rehearsal of fresh app-owned migrations, setup, imports, shared tagging/conflicts, reconnect, replace-only restore/snapshots, restart and atomic deletion/rollback. Its local image was `sha256:33fd6ec3afa5687cffb581823aa32ecb0a4fe59bbadad0405bfa62b603e0ce0c`. That image's default command deliberately refuses activation; **do not deploy it as the pilot**.

D063 adds an inert release-dependency adapter with mocked destination/method/redirect/error tests. The proposed activation diff is `docs/release/pilot-activation.patch`, not applied. It supplies the existing database factory, restricted Spotify transport and actual process host to the executable. It catches configuration failures with fixed text. Idle database errors are handled without logging connection details; ordinary health/request failures remain visible through status. No real transport was called.

The final activated revision, image digest, real signal timing and deployment workflow have not yet been verified. They are execution prerequisites below, not implied by D062. Approval would authorise completing and verifying them without asking again for each implementation step; it would not permit deploying failed or unreviewed code.

## One execution scope proposed for approval

Authorise the following as one pilot operation:

- Complete the reviewed release wiring and its tests, including replacing obsolete default-refusal test expectations with actual startup/health/shutdown checks. Move the active synthetic CI path onto the single-database fixture; retain cleanup and trust boundaries. Keep mocks outside the production image and default production path.
- Publish the sanitised candidate on `codex/pilot-release`, open/update one review PR, run included-allowance CI, and merge only that reviewed PR with current successful checks and a merge commit. Preserve private history; no direct main push, force push, rule changes or automatic future deployments. Older overlapping PRs may be closed as superseded after confirming inclusion, not merged again.
- Build/test up to three candidate images and run up to six disposable synthetic verification attempts total, including runner/container dependency installations, ordinary fixes and cleanup. These are proposed upper bounds to avoid one-run approval loops; not a requirement to consume them. No host installation or paid usage. Stop on an unexplained security/data-integrity failure or uncertain resource ownership.
- Publish only the successful tested image to `ghcr.io/capture418/spotify-playlist-organiser` and record its immutable registry digest. Recommend a public, sanitised runtime image matching the already-public source: no secrets/private data in any layer, no added pull credential on the server. Public package visibility is included in this proposed approval, not assumed from the public repository.
- Create/store the named runtime keys and setup token through the owner/operator's approved secret interfaces, confirm the existing Spotify app's private configuration and permit this owner's real read-only OAuth/import. Never paste secrets into chat, repository files or logs.
- Deploy that digest through the existing `music-deploy` job in setup mode, then deploy the **same digest** in normal mode after deleting both setup settings. Permit one corrective return-to-normal deployment of the same verified digest if needed, plus the platform's normal automatic rollback. No database restore/reset or new server provisioning is included.
- Perform the Mac/iPhone private pilot checks below. Do not delete real organisation or revoke the working connection merely to demonstrate a test.

Paid usage remains blocked; do not enable billing, buy service capacity or request new broad credentials. If the scope/bounds cannot deliver a passing candidate, report the concrete problem together rather than continuing indefinitely.

## Release and artifact checkpoints — developer handles these

1. Apply the reviewed activation diff and finish any ordinary compatibility fixes. Full host/runner quality gate; dependency advisory review before release. No credentials in tests. Review the final diff separately for raw logging, wrong-owner access, CSRF/state/PKCE, proxy enforcement, persistence and setup closure. Record self-review versus independent review honestly.
2. Exercise the **activated default command**, not only the injected composition. With invented configuration and disposable storage, observe startup/health within180 seconds and real SIGTERM exit within20 seconds, repeated startup, database outage/recovery, refusal of invalid settings and setup-to-normal state. Use mocks only in external verification code for Spotify; no production environment switch selecting a fake account.
3. Run the single-database connected scenarios, failed deletion rollback, durable setup closure, and a synthetic backup/restore check showing the accepted loss behaviour. Do not weaken schema/proxy guards to pass. Verify resource cleanup after every attempt. Preserve failed evidence. Verify previous-release compatibility before a later image rollback; for the first app release, record the platform's actual prior-slot fallback rather than claiming it is a working organiser.
4. Build once per candidate, test the image, and publish that exact artifact. If publication runs in GitHub-hosted Linux, build/test there in the same bounded release operation before pushing; a fresh runner rebuild cannot inherit the local image's result. Record source SHA, Dockerfile/lockfile hashes, local image/platform manifest identity and registry digest. Pull/inspect by digest to verify mapping; never deploy `latest` or an untested rebuild.
5. Prefer a reviewed GitHub-hosted publish job with `contents:read` and `packages:write`, using its short-lived GITHUB_TOKEN. It receives no APP_ secrets. Registry tokens, if a separate interactive publication path is explicitly chosen, are a credential handoff; never reuse the server's runner Administration token or assume the Git fine-grained token can publish packages. No credential creation is needed during preparation.
6. The existing operator deployment job receives only the chosen digest and APP_ settings and uses `[self-hosted, music-deploy]`. Do not invent a replacement deploy service or shell access. Read/review its existing invocation before triggering it; the exact helper syntax is not present in this checkout. The operator can run the existing job if direct invocation is unavailable. This is an execution handoff, not a request to redesign the platform. No app build or untrusted PR execution belongs on that runner.

A status report containing the final commit, passing checks, digest and nonsecret configuration names precedes server execution. Within an approved package this is an information checkpoint, not another approval request unless something material changed.

## Configuration and custody — no values in this document

| Deployment secret name | Purpose / handling |
| --- | --- |
| APP_ORGANISER_ORIGIN | Existing canonical HTTPS origin, exact spelling, no trailing slash. |
| APP_ORGANISER_CALLBACK | That origin plus `/callback`; must exactly match existing Spotify app registration. |
| APP_ORGANISER_ACCOUNT | One generated organiser UUID, fixed for this owner. Not the Spotify account ID. |
| APP_ORGANISER_OWNER | Verified immutable Spotify `account_id`, not display name, email or mutable username. |
| APP_SPOTIFY_CLIENT_ID | Existing app's public client ID. No client secret for PKCE. |
| APP_ORGANISER_CREDENTIAL_KEYS | Independent random32-byte key, encoded `v1:64hex`; protects refresh tokens. |
| APP_ORGANISER_CREDENTIAL_CURRENT | `v1` initially. |
| APP_ORGANISER_SNAPSHOT_KEYS | A different random32-byte key, encoded `v1:64hex`; protects snapshots. |
| APP_ORGANISER_SNAPSHOT_CURRENT | `v1` initially. |
| APP_SETUP_MODE | `1` during setup only; delete with token for normal deploy. |
| APP_SETUP_TOKEN | Random32 bytes encoded as43-character base64url, owner/operator only; POST body, never URL. |

Nine normal settings, eleven during setup. Server supplies DATABASE_URL, NODE_ENV and PORT; never add APP_ versions or overwrite them. No migration/journal URL, journal key, VITE_ secret, Spotify client secret, backup-storage credential or runner Administration token enters app configuration.

Owner/operator generate and retain encryption keys in their password manager and enter deployment secrets using the trusted interface. GitHub secrets are not readable backup copies. Keep versions needed by retained database ciphertext/backups/rollback images. The setup token is temporary: remove the active secret and working copy after setup, while acknowledging the platform may retain previous settings for rollback. Do not rotate encryption keys as part of troubleshooting.

If the immutable owner ID is not already available privately, the package permits one memory-only identity verification with the existing app and approved scopes, performed through the owner's browser. Retain only the verified binding in private configuration; do not log/store the returned profile or OAuth grant. The user performs any required consent/terms action themselves. Do not silently fall back from account_id to a different identity field.

## Spotify checks — official documentation reviewed 13 November 2026

Keep exactly `playlist-read-private`, `playlist-read-collaborative`, `user-library-read`. No profile/email, write or playback scope is added. `/v1/me` is used only to verify the configured identity; the profile is not imported. The current implementation reads `account_id`, as recommended by Spotify's [May2026 identity change](https://developer.spotify.com/documentation/web-api/references/changes/may-2026).

Development mode requires Premium for the app owner and explicit user allowlisting. Confirm these in the existing dashboard during the approved credential step; earlier private feasibility evidence is not a fresh account-state check. No extended-quota application is proposed. Respect429 cooldown; no automated repeated import loop. See [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Use the existing HTTPS callback exactly; do not weaken production validation for local testing. Spotify permits explicit loopback HTTP for development, not `localhost`. PKCE uses S256 and state remains session-bound. See [redirect requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) and [PKCE flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow). Collection coverage will be compared privately against the real library; no titles or exports are needed in chat.

## Setup, normal mode and recovery

1. Owner/operator enter the reviewed settings after approval. Deploy setup digest; verify platform outcome `deployed`, healthy app and VPN HTTPS access before initiating OAuth. No raw logs/configuration screenshots copied to public evidence. App stdout contains fixed statuses only.
2. Owner submits the setup token in the form, signs into Spotify, reviews consent and confirms the verified owner. Setup must show completion and refuse reuse. No catalogue or refresh token is retained by setup.
3. Remove APP_SETUP_MODE and APP_SETUP_TOKEN together. Redeploy exactly the same digest with normal settings. Verify successful outcome and normal login page, then connect the real library. Setup and normal login are separate consent/session flows; do not mistake successful setup for an imported catalogue.
4. If deployment is refused/failed/rolled_back, stop OAuth and imports. Record only outcome/digest/safe diagnostics. Database changes remain. In particular, a failed normal deployment may restore setup settings: treat it as urgent, keep the durable closure intact and correct normal settings without recreating the owner. The approved corrective deployment is bounded above.
5. If safe normal operation cannot be restored, ask the operator to leave the slot on its last safe image/settings under the existing mechanism. No blind retries, automatic data restore, clearing of deletion records or recovery guard. A needed database restore/destructive fix requires a specific new approval. This does not reopen the accepted four-hour backup model.

## Final owner review — one checklist

- Mac: sign in, verify playlist/album coverage privately, add shared tags, search/filter, refresh and confirm tags remain. Test a stale edit from a second session: it should report a conflict rather than silently overwrite.
- iPhone on VPN: Safari login and the same saved tags; edit a tag, reload and verify on Mac. Add to Home Screen, launch/close/reopen, check keyboard/layout and session behaviour.
- Open two playlists and two album editions through Spotify links, including Safari fallback. No playback is built into this app.
- Export organisation privately and verify the file is offered; do not send it to chat. Replace-only restore/deletion already have synthetic tests. Do not restore or delete a real library just to tick a box.
- Temporarily lose network/VPN: display an honest failure, retain unsaved draft where applicable and never claim a failed save succeeded. Reconnect and retry once. Check sign-out prevents library access.

Pilot acceptance means these checks pass against the final digest and real service, not merely the demo. Record outcomes without private titles/tokens. The developer reports remaining issues in one consolidated handover.

## Proposed approval wording

> I approve the consolidated pilot execution scope in docs/pilot-approval.md: release activation and ordinary fixes, up to three candidate builds/six synthetic verification attempts with installation and cleanup, sanitised release PR/merge after passing review and checks, publication of the tested public GHCR image, the listed credential/real-read-only-Spotify setup through secure owner/operator handoffs, setup and normal deployments plus one corrective normal deployment, and Mac/iPhone pilot verification. Use included allowance only. No new infrastructure, scopes, destructive real-data operations or unrelated settings changes.

This wording is a proposal, not a recorded decision. Browser consent or secret-entry handoffs can still require the owner's action; they are not additional engineering milestone approvals. If the owner approves only preparation, credentials and deployment remain blocked.
