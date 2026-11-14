# Hosted operations

Authority: [home hosting contract](home-hosting.md). Do not run these steps without the applicable execution approval.

## Image and lifecycle

The production command remains `node runtime/server/production.js`. It opens only DATABASE_URL and JOURNAL_DATABASE_URL, verifies schemas and journal identity, and starts without DDL. Health checks both connections. Owner URLs in the runtime environment are rejected. Startup is bounded to 150 seconds; process shutdown to 10 seconds within the host's 180/20-second limits.

`MIGRATE_COMMAND` is `["node","runtime/server/migrate.js"]`. This opens only MIGRATION_DATABASE_URL and JOURNAL_MIGRATION_DATABASE_URL. It creates public-schema objects using owner defaults, without creating roles or hardcoding grants. Existing migration bytes/checksums remain unchanged; historical grants are omitted when applying them to this host. The command exits zero only after both stores verify, has a 14-minute deadline, closes pools and emits fixed status text. Each database change uses a transaction; there is no claim of a cross-database transaction. A partial successful migration is safe to rerun. Never modify an applied SQL migration. Future changes must preserve old-image readability; add schema extensions without changing the existing three-version baseline until a separately reviewed compatibility transition.

Fresh, empty storage gets a journal identity. The app database binds to it. An existing owner or deletion history without a binding requires explicit adoption rather than automatic initialisation. A mismatched/missing journal fails closed.

## Append-only journal and recovery

Journal intent and completion are separate encrypted inserts keyed by operation/state. The runtime needs SELECT and INSERT only; idempotent retries do not update history. The existing coordinator fences processing, records intent, removes organisation transactionally, then appends completion. Failure leaves processing fenced for recovery. An app-only restore that resurrects an owner recorded in the journal is blocked at startup.

Journal encryption derives a 32-byte key from each existing snapshot key version with HKDF-SHA256, salt `music-library-organiser` and info `append-journal-v1`; journal AEAD purpose and operation/state binding are distinct from snapshots. No new credential is required. Keep all master versions needed by immutable journal records and retained backups. Snapshot rotation does not retire journal keys. Do not retire a master merely because snapshots were rotated.

Maintenance exposes only `reconcile` and `rotate-snapshots` from the currently deployed image. It uses the host request-task helper and shared deploy concurrency, with the app stopped. Reconciliation requires a 64-character lowercase SHA256 digest independently checked against journal backup inventory. It must not manufacture confirmation by hashing whatever happens to be restored. A mismatch leaves the recovery guard blocked; successful reconciliation clears restored sessions/grants before reopening. Restores and independent inventory verification remain operator responsibilities. No automatic restore or journal pruning is implemented. Simultaneous loss/restoration of both stores still has the accepted four-hour recovery loss window.

## Storage budget

The hosted runtime serializes app writes and rejects commits above 1 MiB of serialized row data or 12,000 rows across the fixed application tables. This reserves substantial room for SQL escaping/schema overhead below each 5 MB dump cap. Journal writes stop at 2,000 immutable events. Oversized operations roll back; existing organisation is not silently pruned. Existing approved retention rules still apply. Future schema additions must extend capacity accounting. Test actual pg_dump sizes, not filesystem relation sizes; backups are the operator's responsibility.

## Local development

`docker compose up` uses PG16 with two databases/four invented roles, an owner-only migration service followed by the restricted app service. Supply the app settings from `.env.example` privately; Compose overrides the database URLs and origin for local use. Existing single-database volumes are incompatible: do not delete or repurpose them automatically. Use an explicitly approved fresh Compose project/volume.

Local uses `node runtime/server/local.js`, development mode and exactly `http://127.0.0.1:3000/callback`. It uses unprefixed HttpOnly/SameSite cookies suitable for loopback HTTP. Only the app's loopback port is published. Production still requires canonical HTTPS and the proxy header; the local exception cannot be enabled through production environment variables. The older memory-only helper at port 4174 is independent.

## Release and maintenance workflow

The prepared main-push workflow builds one linux/amd64 image, runs synthetic verification, cleans scoped resources, publishes the exact tested image under `ghcr.io/capture418/spotify_playlist_organiser`, verifies its identity and hands its digest to deployment. Manual deploy remains available for an explicitly reviewed tested digest with the same migrate command. The old image-copy shortcut is removed. Every self-hosted job is main-only and shares `deploy` concurrency without cancellation. No app secrets enter the build/test job.

These workflow edits are local until reviewed publication/activation. Existing PR runtime image checks remain enabled. A PR build and subsequent main build each count against the pilot's candidate allowance; do not trigger either without reviewing the remaining budget. No workflow here changes repository secrets or settings.
