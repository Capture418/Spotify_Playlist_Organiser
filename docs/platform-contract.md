# Fixed hosting contract — D059

Owner-supplied platform facts supersede earlier deployment assumptions. Do not redesign the platform or request reconfirmation of these facts. This public summary omits the actual hostname; retain the supplied canonical origin/callback in later approved private configuration.

## Deploy and runtime

One GHCR image digest plus APP_ secrets goes through the existing self-hosted music-deploy job. The server pulls and replaces one slot, waits for health, and restores the previous image/settings on failure. Outcomes are deployed/rolled_back/failed/refused; last50 app log lines are public job output. No user shell, one-off runner or additional containers. Migrations and all required initialisation happen in the app's own startup. Old app stops first; no overlap. Database changes survive image rollback, so previous-code compatibility still matters.

Linux amd64, uid1000, Node in image, read-only root except64MB ephemeral /tmp, no capabilities,512MB RAM,1 CPU. Server supplies DATABASE_URL, PORT3000 and NODE_ENV. Other settings arrive from APP_ secrets at deployment. Healthy within180 seconds including migrations;20 seconds after SIGTERM to stop. GET /health is unauthenticated/minimal and200 only when the database is reachable. App's tighter150/10-second internal budgets fit this contract.

## Data and network

Only the application PostgreSQL16 database is currently available. Use its server-supplied non-superuser role and isolated private network without TLS. Do not require unprovisioned migration roles, a separate connection URL or a separate music_journal database. The latter is planned, not available: do not build or rehearse against it until the operator confirms it exists.

Encrypted off-server backups run every4 hours. Restores belong to the operator; accept up to4 hours of lost changes. Outbound internet is permitted; other home-network access is intentionally blocked. No workaround or extra service is needed.

For the current target, deletion records must stay in the application database and commit with deletion of organisation. They therefore share its backup/restore loss window; do not claim independent deletion-history survival. Existing independent-journal code/evidence is historical and cannot be presented as current platform readiness. A later independent journal is a separate future change, not a launch dependency.

## Web and setup

Existing canonical HTTPS site is reachable only on LAN/VPN. nginx terminates TLS and supplies Host/X-Forwarded-Proto; retain strict canonical checks. Existing HTTPS /callback stays unchanged; local dev callback is http://127.0.0.1:3000/callback. The local callback allowance must not weaken production HTTPS validation.

Same-image setup mode is enabled by an APP_ secret and redeploy. Token POST only, Secure/HttpOnly/SameSite session, session-bound OAuth state and PKCE, exact Spotify owner-ID verification, explicit confirmation, no library routes during setup, durable closure after completion and minimal health. Delete mode/token together and redeploy normal mode. A failed return-to-normal requires prompt attention because rollback restores previous settings.

Startup must prepare fresh storage within the existing app process. Fresh installation detection and durable setup closure must be transactional and distinguish new storage from missing/corrupt existing state; never reset existing organisation or deletion history. Recovery after operator restore must respect the accepted backup loss model rather than require unavailable independent evidence. No automatic live owner selection, token logging or public SQL/admin endpoint.

Access logs omit query strings/Referer. Restricted nginx error logs may contain full failed callback requests. Sign-in starts only against a healthy app; a later failure remains possible. Owner accepts this residual risk. App logs must never contain secrets, tokens, codes, session IDs, request bodies or query URLs. No new logging/security questions are pending.

## Implementation status and next work

D058's image and rehearsal depend on obsolete separate-journal/external-job assumptions. Retain them as historical evidence, not as a deployable candidate. Cancel the proposed same-image D058 rerun; it would not verify this contract.

D060 adapts the injected application composition to single-pool startup/migrations, same-database atomic deletion and setup closure. It needs only credential/snapshot keys and the supplied database role. Historical SQL/checksums stay unchanged; platform migration execution omits historical grants to the unavailable role. No missing/blocked recovery state is silently reset. Production executable remains blocked and no default live transport is introduced. Mocked tests are not actual PostgreSQL or immutable-image evidence; prepare a matching single-database harness next.

No real credentials/data, server actions, registry publication, merge/settings or deployment are authorised merely by this clarification. Existing separate approvals still apply. Ask the operator only if a requirement truly cannot be met within this contract, in one message identifying the need, incompatibility and smallest change. There is no such platform question at this stage.
