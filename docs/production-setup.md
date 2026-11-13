# Production startup and setup — D060

This is preparation, not execution approval. The [fixed platform contract](platform-contract.md) is authoritative. The executable still refuses activation. Historical separate-journal/external-job procedures are superseded; do not use the old disposable rehearsal as a current release check.

## Current composition

`startIntegratedApplication` validates the supplied DATABASE_URL, NODE_ENV and PORT plus canonical HTTPS origin/callback, configured owner UUID/Spotify ID, client ID and independent credential/snapshot key rings. It rejects migration/journal URLs and journal keys. No key generation, default network transport or automatic owner selection occurs. APP_ settings are injected without the prefix; server-reserved settings are not replaced.

`startPreparedPlatform` uses one pool under the existing non-superuser database-owning role. In one migration transaction it locks, distinguishes empty public storage from incomplete existing storage, validates historical checksums and applies missing migrations. It omits only the historical grants to the unavailable organiser_app role: the supplied role owns the tables it creates. Canonical migration SQL/checksums are unchanged. It creates no database or role and performs no independent journal initialisation. A partial schema, missing migration history, changed checksum, newer schema or missing/blocked recovery guard refuses startup. An empty database after total loss cannot be distinguished from a new installation; operator restore procedure remains authoritative.

Startup verifies schema and guard before composition, checks database readiness before listening, and retains the150-second deadline. No existing blocked guard is cleared automatically. The prepared process lifecycle retains10-second shutdown within the server's20-second allowance. Actual PostgreSQL semantics and exact-image timings remain to be verified in a separately approved disposable rehearsal.

## First use and normal operation

1. Under later deployment/credential approval, supply the reviewed configuration and enable SETUP_MODE=1 with a43–128-character base64url SETUP_TOKEN. Startup migrates fresh storage itself. No shell, extra container or one-off initialisation job is needed.
2. Wait for healthy status before Spotify sign-in. GET /health reports only bounded reachability of the one application database and needs no token, Host or forwarded headers. Closed setup remains healthy.
3. Submit the token in the POST body. The generic token form reveals no private state. A five-minute Secure/HttpOnly/SameSite=Lax session binds CSRF, OAuth state and PKCE. Constant-time token comparison and bounded global guessing limits remain. Normal library routes are absent. Only the exact configured Spotify account ID can verify; display names/emails are not identity.
4. Explicitly confirm the verified owner. Setup stores no Spotify grant or catalogue. The transaction locks and rechecks all ownership/deletion state before creating the owner. Existing account or deletion records close setup globally, including after restart or configuration rollback.
5. Delete SETUP_MODE and SETUP_TOKEN together and redeploy normal mode. A failed return is urgent: rollback can restore those settings, although the database latch still refuses repeat setup. Normal mode rejects leftover setup tokens and requires the existing configured owner. Separately approve the real connection/pilot and device tests.

Never log settings, request bodies/URLs, session IDs, authorisation codes or tokens. Restricted proxy error-log exposure remains an accepted risk; application logs must stay secret-free. Strict canonical HTTPS/proxy checks are unchanged.

## Deletion and restore

Current deletion cancels active integration work and locks setup/guard/account state. The minimal binding/timestamp tombstone and cascading removal of account data commit in one database transaction. Failure rolls both writes back; there is no second database write or partial-journal reconciliation. Tombstones are retained, not automatically expired, and prevent ordinary setup from recreating deleted accounts. They are database records, not independently encrypted journal payloads; backups are encrypted under the fixed contract. Credential/snapshot payload encryption remains unchanged.

The operator restores the entire database from its encrypted backups. Data, setup state and deletion evidence share the accepted four-hour loss window. An older backup may restore deleted data, credentials and sessions; deletion after that backup may be lost. This is the accepted single-database model, not independent deletion-history survival. Review the restored state and repeat lost deletions as needed. No unavailable journal digest or separate recovery-approval process is required for a coherent unblocked backup. A blocked or corrupt restored database still refuses startup; never reset its guard or initialise over it automatically.

## Remaining release work

Prepare a matching single-database disposable harness and executable wiring with injected mocked transport first. The historical two-database harness is not current-platform evidence. Then obtain separate execution approval for the exact-image/database checks. Live transport/credentials, server changes, publication, merging and deployment remain separate gates. There are no new platform questions.
