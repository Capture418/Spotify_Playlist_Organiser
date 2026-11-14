# Public decision summary

This is a sanitised summary of decisions supporting the current source. It deliberately omits private conversation transcripts, account observations and infrastructure identifiers. It does not grant new operational approvals or replace the requirement to record future owner decisions.

| Decision | Approved scope |
| --- | --- |
| D002/D003 | React/TypeScript/Vite, dark library, match-all tags, all-word search, single/bulk editing and temporary invented demo state. |
| D004/D009 | Separately gated read-only feasibility helper; playlist-read-private, playlist-read-collaborative and user-library-read. No write/playback scopes. |
| D011–D018 | Combined playlist/album library; account-isolated PostgreSQL foundation; replace-only restore with preview, confirmation and recoverable snapshot. Synthetic implementation accepted. |
| D019–D022 | Prepared integration/lifecycle with versioned separate-purpose encryption, expiry/revocation, deletion fencing and operator-led recovery. Synthetic implementation accepted; no production activation. |
| D026/D028/D029 | Container/PostgreSQL target, separate journal database, distinct runtime/migration roles and encrypted backup direction; startup preparation. Actual infrastructure identifiers/custody are private. |
| D031–D034 | Bounded artifact/build/disposable database verification; results accepted within documented local limits, not deployed-system acceptance. |
| D035/D036 | Music Library Organiser online-only PWA foundation accepted; no service worker/offline catalogue. |
| D037/D038 | Runtime configuration and strict HTTPS proxy checks accepted after synthetic host verification. |
| D039/D040 | Inactive test-only CI and portable launcher preparation accepted; rehearsal still gated. |
| D041 | Candidate/action/trigger review; reviewed inactive action pins and named-branch scope. |
| D042 | One-time README-only public bootstrap; exception completed, not standing main-push approval. |
| D043 | Use Git and checkpoint existing approved work locally; no automatic push or server activation. |
| D044 | Prepare this sanitised public snapshot while preserving private local history/evidence. No push, CI activation, installation, provisioning, spending or deployment. |
| D045 | Sanitised snapshot accepted; named public branch push and PR #1 authorised and completed. No merge or CI activation. |
| D046 | CI rehearsal readiness preparation approved: local workflow policy, safe cleanup evidence and mocked tests. Pushes, merging, activation, installations, provisioning, spending and deployment remain gated. |

D046 owner approval: “I approve CI rehearsal readiness preparation. Go ahead with the local changes and mocked tests. Keep pushes, merging, CI activation, installations, provisioning, spending and deployment behind separate approval.”

All implementation remains bounded by the [constitution](../.ai/constitution.md). Future approvals must state exact scope and preserve the distinction between source preparation, installation/resource use, credentials, public push, workflow activation and deployment. No approval is inferred from silence or a successful test.


## D047 — readiness acceptance and bounded CI rehearsal

Owner accepts D046 and approves the two-run CI rehearsal: branch push/PR, temporary activation, runner installations and synthetic containers/databases. Included allowance only; no merging or deployment. Scope is one baseline attempt and, only after success with verified cleanup, one controlled cancellation attempt, with observation and rehearsal-PR closure per the accepted checklist. No automatic retries, real data/application credentials, Mac/server installations, paid spending or service provisioning.


D047 outcome: two attempts only; baseline passed, second cancelled after scenario completion with verified cleanup. Interrupted-operation recovery remains unverified. Rehearsal PR closed and temporary workflow retired; any additional attempt needs a new bounded approval. No merge/deployment authorised or performed.


## D048 — local cancellation timing preparation

Owner instruction: “Go ahead with the local preparation change to make cancellation timing reliable, with mocked tests.” Approves a bounded test-only hold with mocked cancellation/timeout/cleanup checks and updated inactive workflow proposal. No further CI attempt, push, activation, installation, resource creation, spending, merge or deployment is inferred. D047 results and limits remain unchanged.


## D049 — D048 acceptance and one cancellation-only rehearsal

Owner accepts D048 and explicitly approves one cancellation-only CI rehearsal, including push/PR, temporary activation, runner installations and synthetic resources. Included allowance only; no extra retries, merging or deployment. Covers the reviewed120-second hold, observation/cancel, cleanup evidence, PR closure and workflow retirement. No real data/application credentials or local/server installations.


D049 result: one attempt cancelled during the unfinished live-resource hold; independent cleanup verified empty inventory. No graceful-handler execution claim. PR #3 closed; temporary activation retired. Further runs, permanent CI activation, merge and deployment require separate approval.


## D050 — D049 acceptance and normal PR CI preparation

Owner instruction: “I accept D049. Go ahead with local preparation for normal PR CI and mocked tests. Keep pushes, CI activation, installations, provisioning, spending, merging and deployment behind separate approval.” Accepts the recorded cancellation/cleanup evidence and its limits. Approves local preparation only; proposed normal trigger/resource/required-check defaults await review, not operational activation.


## D051 — D050 acceptance and normal PR CI activation

Owner instruction: “I accept D050 and approve normal PR CI, including push/PR, activation, runner installations and synthetic resources for eligible PRs. Use included allowance only; keep merging, required-check settings and deployment separately gated.” Approves the reviewed same-repository PR/main event scope and recurring runner-only installations/synthetic resources within included allowance. No paid usage, operational data/credentials, Mac/server installs, merge, required-check settings or deployment. Preserve private history and production guards.


## D052 — D051 acceptance and review/roadmap request

Owner accepts D051 and requests PR #4 review, proposed merge sequence for PRs #1/#4, required-check settings and a product-readiness assessment. Merging, settings changes and deployment remain separately gated. Review/proposals only; no new implementation, public review posting, push or resource operation inferred.


## D053 — Invented-data production integration

Owner authorises production integration using invented data first. Real data, credentials, server provisioning, merging, required-check settings and deployment remain separately gated. This implementation connects the existing interface to prepared production authentication/API and composes validated startup, store, keys, journal and maintenance with explicit injected transports. No dependency installation, database creation, live Spotify connection, implicit owner bootstrap or production executable activation is inferred. Existing approved interaction/security/lifecycle designs remain unchanged.


## D054 — D053 acceptance and disposable end-to-end verification

Owner accepts D053 and approves end-to-end verification with disposable local PostgreSQL databases and mocked Spotify responses. Only invented fixture identities, encryption material and database passwords are used. Real data/credentials, installations, server provisioning, merging, settings and deployment remain separately gated. No push or hosted run is needed.


## D055 — D054 acceptance and startup/operator preparation

Owner accepts D054 and authorises production startup and operator setup preparation. Implement/test preparation with injected dependencies and invented inputs; prepare the operator runbook and activation review. Real data, credentials, installations, provisioning, merging, settings and deployment remain separately gated. No production executable activation, live transport, public operator route or resource creation is inferred.


### D055 operator timing clarification

Owner reports operator confirmation:180 seconds to become healthy, migrations included;20 seconds to shut down after SIGTERM, also documented in the operator README contract. Record these limits in this checkout's README/setup package. Existing app limits of150 seconds startup and10 seconds shutdown remain within that budget; no code/settings change required. This does not accept D055 or approve activation. Temporary setup callback/access questions remain outstanding.


## D056 — Same-image setup mode and disposable verification

Owner approves setup mode using invented data/mocked Spotify and disposable local PostgreSQL. Same image/slot/callback; token POST, Secure HttpOnly SameSite session, session-bound state/PKCE, exact configured Spotify owner ID, bounded guessing, explicit confirmation and durable refusal after completion. Normal routes unavailable in setup. Real data/credentials, installations, server provisioning, merging, settings and deployment remain gated. Remove setup mode/token together when later returning to normal; failed return is urgent because rollback may restore secrets. Operator reports path-only access logs without Referer and restricted error logs; owner accepts residual callback-query exposure there. Do not claim independent server verification or that secret deletion removes rollback copies.


## D057 — D056 acceptance and release/initialisation rehearsal preparation

Owner accepts D056 and approves preparation of the release-image and operator-initialisation rehearsal. This permits local source, mocked tests and an execution approval package, not Docker builds/downloads, installations, database creation or operational execution. Real data/credentials, server provisioning, merging, settings and deployment remain gated. Production executable stays blocked; no registry publication or push implied.


## D058 — D057 acceptance and local image rehearsal

Owner accepts D057 and approves the local image build, container dependency installation and disposable verification with cleanup. Execute one bounded candidate build and the prepared exact-image rehearsal. Real data/credentials, server provisioning, merging, settings and deployment remain separately gated. No host installation, registry publication or push. Preserve failed evidence and report before another execution.


## D059 — Fixed platform contract supersedes hosting assumptions

Owner supplies the settled platform contract and directs work within it without further questions on covered facts. No shell, one-off runner or extra containers; startup owns migrations/initialisation. Only application PostgreSQL is available; music_journal is planned, not provisioned and must not be a build dependency. Backups every4 hours and residual logging/restore risks are accepted. Existing same-image setup design remains. See `docs/platform-contract.md`. Supersedes earlier external-job/four-role/separate-journal launch prerequisites and the D058 rerun proposal. No real data, credential, server, merge/settings or deployment approval is inferred. Current single-database target retains deletion evidence transactionally with app data and shares the accepted restore loss window; no independent restore-survival claim.


## D060 — Single-database adaptation

Owner approves adapting startup, initialisation and deletion storage to the fixed single-database contract using invented data and mocked tests. Real data, credentials, server changes, merging and deployment remain separately gated. No installation, resource creation or live execution is inferred. Existing setup safeguards and accepted four-hour restore loss model remain.


## D061 — D060 acceptance and rehearsal/executable preparation

Owner accepts D060 and approves single-database rehearsal preparation and executable wiring using mocked tests. Actual execution, real data, credentials, server changes, merging and deployment remain separately gated. No resource creation, installation, live transport activation or push is inferred.


## D062 — D061 acceptance and one local rehearsal

Owner accepts D061 and approves one local image build including container dependency installation, and one disposable single-database rehearsal with cleanup. Owner requests autonomous progress to a reviewable functioning app; routine local implementation and invented-data preview work may proceed without repeated confirmations. This does not authorise extra rehearsal attempts, real data/credentials, server changes, publication, merging or deployment.


## D063 — D062 acceptance and consolidated pilot preparation

Owner accepts D062 and approves preparing the real Spotify/server pilot as one approval package, avoiding repeated small confirmations. Credentials and deployment remain gated. This permits routine local source/document preparation and mocked tests, not live activation, secrets, extra resource execution, publication, merging or deployment. Proposed operational scope in the pilot package is not approval.


## D064 — Consolidated pilot execution approved

Owner approves the complete execution scope in docs/pilot-approval.md using included allowance only, with secure credential and Spotify consent guidance. Limits: three candidate builds, six synthetic verification attempts, setup and normal deployment plus one corrective normal deployment. Covers the reviewed release PR/merge, public tested-image publication and listed credential/real-data handoffs. No new infrastructure/scopes, destructive real-data operation or unrelated settings change.


## D065 — Tested image registry alias and one setup retry

Owner approves publishing the same tested image under spotify_playlist_organiser, verifying its digest and retrying setup once. No rebuild or new credentials. The existing short-lived release-job token is used; no server allowlist change. Workflow-only quality checks and reviewed PR/merge support this correction; no runtime/source-image change.


## D066 — Host-run migrations and token-length diagnosis

Owner confirms operator diagnosed token refusal: helper limited tokens to255 characters versus current GitHub tokens around520; operator is fixing it. No credentials change. Owner directs retry once updated helper is installed, but first changes deployment contract: host runs a JSON-array MIGRATE_COMMAND from the new image with app stopped, supplying MIGRATION_DATABASE_URL and JOURNAL_MIGRATION_DATABASE_URL; app receives DATABASE_URL and JOURNAL_DATABASE_URL with row-only runtime permissions. App must not run schema migrations at startup. This supersedes D059 startup migration/owning-runtime-role assumptions. Read the operator README “One-shot runs” before final command/workflow wiring. Separate journal availability/roles and exact one-shot environment/exit/timeout contract remain to be confirmed from that source; do not silently restore historical journal behaviour or invent new keys. No immediate dispatch of old image, secret changes or server provisioning.


## D067 — Authoritative hosting contract checklist implementation

Owner supplies docs/home-hosting.md as the exact replacement for earlier hosting contracts, then approves completing the resulting checklist. Implement restricted two-database runtime, separate owner migration/task commands, append-only journal, mirrored local configuration and synthetic verification. Preserve credentials/settings; no deploy retry or remote workflow activation is inferred from this local implementation request. D064 build/test counters still bound executable verification. Use existing versioned snapshot master keys with a distinct HKDF journal purpose; retain versions while immutable journal history needs them. New storage budgets fail writes explicitly rather than silently removing organisation.


## D068 — D067 accepted; release review and approval-package preparation

Owner accepts D067 and approves release review plus preparation of one package for remaining CI, merge and deployment, including an allowance extension. This is preparation only. Existing counters remain3/3 builds and6/6 synthetic attempts; proposed increases, pushes, workflow activation, merging, secret changes and deployment are not authorised yet. See docs/release-approval.md for the concrete proposed sequence, bounds and secure handoffs.


## D069 — Remaining pilot release execution approved

Owner approves docs/release-approval.md, including up to three additional builds and four synthetic attempts (lifetime6/10), reviewed branch push/PR/merge, workflow activation, verified-image publication and four bounded setup/normal deploy requests. Included allowance only. Reuse existing credentials, with private setup/consent and iPhone handoffs; coordinated removal of both setup secrets after setup is included. Package exclusions and stop conditions remain binding. Owner confirms retained token/keys, exact HTTPS callback and available included allowance with paid usage blocked.


## D070 — Setup-form correction execution and one-build extension

Owner approves one extra candidate build (lifetime cap7), publication/reviewed merge of the prepared Safari setup-form correction after CI passes, and corrective setup deployment. Included allowance only; synthetic cap10 and new deployment cap4 remain unchanged. No credential changes or bypass of origin/CSRF/privacy checks. Existing private setup and same-digest normal-mode handoffs remain.


## D071 — Safari authorisation handoff correction approved

Owner approves two additional candidate builds and two disposable synthetic attempts (lifetime caps9/12), corrective branch push/PR and merge after passing CI, and one additional setup deployment (total cap5). Included allowance only. Preserve normal and corrective-normal deployment slots, existing credentials and all security checks. Execute the prepared explicit Spotify link correction; no unrelated changes or automatic retries beyond these limits.


## D072 — Imported Spotify card links corrective release

Owner approves two additional candidate builds and two synthetic attempts (lifetime caps11/14), corrective PR publication and merge after passing CI, and use of the remaining corrective-normal deployment (cap5 unchanged). Included allowance only. Publish the prepared validated playlist/album link correction; no credentials, schema, dependencies, workflow changes or unrelated features.


## D073 — Pilot accepted — 14 November 2026

Owner explicitly accepts the pilot after the recorded Mac/iPhone, Spotify links, Home Screen, shared-tag persistence, export, concurrent-edit recovery, VPN, keyboard,200% zoom and bounded browser-network checks passed. Accepted running release is maina0645c5aa96dc5c2d500ff29dfa2d0c12181a599, image `ghcr.io/capture418/spotify_playlist_organiser@sha256:0ab3a14b5e0e6446f7f3858d5909ecf2589bbdfe58369f8d4ae4d9be4cb28179`. Existing online/VPN and backup/recovery limitations remain unchanged. Acceptance closes the pilot; it does not authorise further releases, installations, spending, provisioning, credentials, maintenance or features.


## D074 — Direct Spotify artwork local implementation approved

Owner approves direct artwork loading from Spotify image servers, local implementation and tests. Scope: existing cards, unmodified artwork, attribution, neutral fallback and narrowly validated image destinations. Existing metadata cache may retain selected URLs, not image binaries; no new scopes or credentials. Browser image requests reveal device IP/image requests to Spotify infrastructure. Deployment, pushes/CI resources and installations remain separately gated; no release allowance extended.


## D075 — Artwork accepted locally; release preparation requested

Owner is happy with D074 artwork changes and requests one CI/deployment approval package with build/test allowance and real Mac/iPhone checks. Preparation only; no new execution resources, push, merge or deploy authorised. Proposed bounds and rollback in docs/artwork-release-approval.md remain unapproved until explicit owner acceptance.


## D076 — Artwork release execution approved

Owner explicitly approves docs/artwork-release-approval.md using included allowance only: up to four additional builds/four synthetic attempts (lifetime15/18), reviewed initial and bounded corrective PR/merge, and up to three additional deployments (lifetime8) including return to accepted pilot if needed. Existing credentials/settings retained; real Mac/iPhone artwork checks included. Package stop conditions and exclusions remain binding.


## D077 — Explicit app reload control requested

Owner reports artwork works on Mac/iPhone/Home Screen and asks for a phone refresh button, clarifying it must reload the app itself, not refresh Spotify. Implement locally a clearly labelled Reload app in the connected library header, reusing normal page reload without new caching or service workers. Preserve saved data; transient search/selection reset. Disable during operations/offline and pending editor/restore/delete confirmation. No publication/deployment approval is inferred; D076 reserves cover diagnosed artwork corrections, not this new control.
