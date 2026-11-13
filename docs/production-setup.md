# Production startup and operator setup preparation

D055 preparation only. This is a review package, not permission or a runnable deployment guide. No real setting values belong here. D054 verified the connected composition with invented data; it did not provision the server or verify backups. `npm start` and the image command still refuse activation.

## Proposed executable wiring

A separately reviewed activation change will connect `prepareProcess` to `startIntegratedApplication`, an explicit PostgreSQL pool factory and the real Spotify transport. The current code supplies none of those operational defaults. Keep `productionConfig` validation before resource creation, all four pools distinct and bounded, safe pool error handlers, and no dotenv/config-file fallback. The real transport must use the existing bounded Spotify adapter, honour aborts and reject redirects; no alternate host or generic proxy. Recheck current official Spotify requirements before live integration.

The future process host supplies SIGINT/SIGTERM handlers, fixed-category reporting, a10-second shutdown deadline and process exit. `prepareProcess` itself has no import-time handlers or side effects. It reports ready only after the startup factory resolves; repeated signals close once. Startup/shutdown failures report fixed categories, never error objects, URLs, identities, configuration or cookies. Timeout exits unsuccessfully. The deadline applies to stop requests including requests during startup; a late application handle is closed without a ready report. This does not promise transaction completion on SIGKILL. The operator-confirmed server grace is20 seconds after SIGTERM, leaving10 seconds beyond the prepared app deadline. The server allows180 seconds to become healthy, migrations included. These are owner-reported contract facts, not independently verified server settings.

Startup remains bounded at150 seconds within the stated180-second deployment budget: validate settings; open separate runtime/migration pools; migrate journal and application; close migration pools; verify schemas/journal/recovery guard; verify configured owner; start maintenance; verify database readiness; then listen. Health is internal GET /health on port3000 with no Host/forwarded-header requirement. All other application requests retain the canonical Host and HTTPS checks. A healthy response does not certify backups, owner consent or a working external proxy.

Do not add a magic activation environment flag in this preparation. Release approval must review the actual executable diff, tested artifact and operator readiness evidence together. No supervisor may turn a startup failure into automatic bootstrap, journal initialisation, schema reset or recovery approval.

## Configuration handoff

Use the existing `.env.example` as a names/formats contract, not as a file to populate in this task. Server-owned DATABASE_URL, PORT and NODE_ENV stay server-owned. The14 app-owned settings cover canonical origin/callback, account UUID, verified owner binding, public client ID, three additional role URLs and three versioned key rings/current versions. APP_NAME is the deployment helper's secret naming convention; the app receives NAME. No client secret, VITE_ secret, bootstrap bypass or operational R2/age credential belongs in the app.

Operator prepares real settings only after approval, in approved secret custody. Never paste them into chat, commands recorded in shell history, PRs or logs. GitHub secrets cannot be read back; independently recoverable owner-held key copies are required. Keep credential/snapshot/journal material independent and retain old versions needed by database ciphertext, backups and rollback images. Key creation, custody locations and rotation remain separate operational actions.

## First-time setup sequence — proposed, not executed

1. Obtain approval for the exact server operations and image. Operator establishes empty application and independent journal databases, least-privilege runtime/migration roles and private networking. Do not run `db/init/10-app-role.sql`: that file contains disposable test identities/passwords. Verify database identities and roles before any mutation. Stop if existing data or an unexplained journal is found.
2. Confirm encrypted backups and independent journal backup inventory, retention, restore method and recoverable keys. The approved separate journal database protects application-only restores; it does not eliminate losses after the last surviving backup. Require a restore drill before meaningful organisation data. Do not infer backup existence from a successful login or health probe.
3. Run versioned application/journal migrations as their distinct migration roles using the reviewed image. Check checksums/schema versions and previous-release compatibility. Application startup must not be exposed yet.
4. For verified first-ever empty storage only, an explicit operator initialisation operation creates the encrypted empty journal. Existing `PostgresJournal` has no automatic empty fallback. A missing journal on an existing installation is recovery failure, not permission to initialise. This operation needs a reviewed operator command and confirmation; none is activated by this package.
5. Keep recovery guard blocked while verifying independent inventory. Use `reconcileRecovery` then `approveRecovery` with the fresh in-process receipt and explicit confirmation, in the same process/pool. This clears sessions/credentials; do not run it on an ordinary restart. An inventory digest must come from independently checked operator evidence, not be computed from suspect restored storage and called authoritative.
6. Verify the intended Spotify identity with the existing `BootstrapPreparation` PKCE flow, then explicitly confirm it within its five-minute proof window. `bootstrapOwner` remains operator-only, refuses replacement and refuses a deleted binding. No first-visitor owner creation. The operator UI/callback entry is still an activation design checkpoint below, not a public route in this source.
7. Only after owner creation and readiness evidence, approve the production executable and deployment. Validate health/startup budget, VPN-only HTTPS routing and Secure-cookie behaviour. Then separately approve the real account connection and pilot; check imports, reconnect, tagging across devices and iPhone standalone/link behaviour.

Steps4–6 are privileged one-time operations and must not be embedded in normal container startup. Keep app stopped and operator access exclusive. Do not expose migration, journal initialisation, recovery approval or owner replacement endpoints to ordinary users.

## Operator entry checkpoint

Recommend a short-lived, operator-invoked setup mode, available only during an explicit approved maintenance window. It should reuse the exact canonical HTTPS callback and PKCE/state/browser binding, verify the configured owner and require a second explicit confirmation before owner creation; no token or proof persistence. The normal application cannot start before the owner exists, so this needs a separately reviewed callback handler, routing/access restriction and lifecycle. Do not improvise by pasting an OAuth code into a shell or disabling callback guards.

Before implementation/activation, obtain the operator's answer: can a temporary setup process use the existing HTTPS proxy while ordinary app traffic is unavailable, restricted to the owner/operator over VPN? What additional access restriction can be enforced during setup? If not, propose and approve another verified identity-bootstrap delivery method. This package deliberately does not introduce an unapproved public setup endpoint. Existing `BootstrapPreparation` is the tested primitive, not a completed operator UI.

## Restart, rollback and recovery

Ordinary restart replays compatible migrations, verifies journal/guard/owner and starts. It never reinitialises keys, journal or owner. Shutdown closes listener, maintenance and pools. Failed startup returns unsuccessful status with no private error output; operator investigates privately rather than enabling bypasses.

Deployment rollback swaps the image and prior secrets only. It must not roll back the database. The previous image must understand retained schema and key versions. Require expand-first migrations and exact tested image identity; D054's read-only mounted build is not a publishable image proof. A rebuild needs its own verification. No registry, deploy workflow, merge or server action is provided here.

For database restore/server loss: keep access offline; preserve current independent journal and keys; determine the latest trustworthy inventory and loss window; restore app data; verify schemas and independent journal; reconcile deletion intent; clear restored sessions/credentials; obtain a fresh in-process recovery receipt and explicit approval before reopening. Never replace the journal with the application backup as a convenience. Missing/uncertain journal or keys keeps access blocked. Deleted owners need a separate explicit decision, not automatic onboarding. Do not claim this package repeats the pg_dump/restore drill.

## Evidence and decisions needed before activation

- Owner acceptance of this preparation; separately approve the temporary operator bootstrap delivery design after the operator answers above.
- Operator timing is confirmed:180 seconds to become healthy including migrations,20 seconds after SIGTERM. Actual databases/roles, proxy isolation/header overwrite and secret delivery still need verification. No credential values requested.
- Verify backup schedule/retention for both databases, encrypted off-site copies, independent inventory, key custody and a restore/deletion reconciliation drill. Prior policy approval is not proof of implementation.
- Approve a bounded synthetic rehearsal of the future executable/operator mode and exact release image. Its initialisation, signals/timeouts, interrupted setup, backup recovery and previous-image compatibility need execution evidence.
- Separately approve real settings/owner verification, publication, provisioning/settings and deployment. PR merges/required checks remain their own gates; no automatic main-push deployment inferred.

This is technical-lead preparation/self-review, not an independent security audit or live-system acceptance.
