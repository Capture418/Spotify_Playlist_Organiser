# Architecture and boundaries

This public summary describes the implemented development snapshot. It excludes personal account observations and actual infrastructure identifiers. Read the [constitution](../.ai/constitution.md), [decisions](decisions.md) and [work plan](work-plan.md).

## Product and interface

One responsive React/TypeScript/Vite app with plain CSS. A dark single-screen library combines playlists and saved albums, keeping editions separate by Spotify identity. Default All view, optional type/availability filters, title ordering, match-all tags and all-word literal search. Album artist names are searchable. Tags are shared across item types; annotations use type-qualified IDs rather than titles.

Single edits replace one item's assignments; bulk edits add tags to explicitly selected items and preserve existing tags. Demo state is React memory and resets on reload. The synthetic remote adapter confirms saves only after server acknowledgement, preserves failed drafts and detects revision conflicts. Cancelling does not write; retries retain mutation identity.

The PWA has a same-origin manifest, local generated icons, standalone display metadata and safe-area layout. No service worker, browser catalogue persistence or offline write queue. Actual iPhone standalone/session/keyboard/VPN behaviour remains a separate device gate.

## Code boundaries

- `src/domain`: pure filtering/tagging and edit-attempt rules.
- `src/data`: invented fixtures and remote API mapping.
- `src/features/library`: library/editor and separate connected/synthetic modes.
- `scripts/spotify`: separately gated memory-only verification helper and reusable validated mapping.
- `server`: HTTP, store, migrations, auth preparation, encrypted lifecycle/journal and startup seams.
- `scripts/database`: explicit disposable-resource tools and integration scenarios.
- `scripts/ci`: portable injected launcher; fake-executor tests run in the normal host gate.
- `public`: manifest and project-owned icons, reproducible with Node built-ins.

One repository/package; no framework expansion, telemetry, remote fonts or external artwork loading. UI renders untrusted metadata as text. Spotify is authoritative for imported metadata; the organiser owns tags. Partial refresh failures never erase organisation data.

## Persistence and security preparation

PostgreSQL stores account-scoped catalogue/organisation, sessions, receipts and encrypted restore snapshots. Separate application/journal databases each have distinct migration/runtime roles. Runtime cannot own/migrate databases. Applied migrations are versioned/checksummed; rollback swaps application images, so schema changes must remain compatible with the previous release.

Owner login is PKCE with explicit configured binding and exactly the approved read scopes. There is no first-visitor owner creation or implicit bootstrap. Production sessions use Secure/HttpOnly/SameSite cookies; state/CSRF/origin checks and bounded transport remain mandatory. Credentials are never browser-persistent. Versioned credential, snapshot and journal keys are separate purposes; retained versions support recovery. See the [foundation](s04b-foundation-spec.md) and [lifecycle plan](s04c-operational-plan.md).

`runtime-config.ts` validates explicit settings before side effects; the prepared startup seam migrates using separate pools, retires them, verifies schemas/journal/recovery/readiness, then composes an injected listener. Production entry remains blocked pending operational approval. The prepared authenticated application explicitly enables the connected root; other production server construction still blocks it. `application.ts` composes validated configuration, separate keys, store/vault, journal, injected Spotify transport and startup listener; it has no default network transport or implicit owner creation. No synthetic-login bypass is allowed in production.

Production application requests require canonical Host and a single forwarded HTTPS scheme. Forwarded origin/host/client-IP headers cannot determine trusted origins or rate-limit identity. Exact GET /health bypasses Host/scheme checks for container-local probes and returns bounded database readiness only. Actual proxy isolation must be verified before use; a scheme header does not authenticate its sender.

## Verification and deployment boundary

Host tests cover domain, validation, mocked HTTP/configuration/startup, security/lifecycle mechanics and CI resource plans. Actual disposable database tests are separate from the ordinary gate. D051 approves normal PR CI for all same-repository PR branches targeting main on GitHub-hosted Linux; no publishing/deploy job exists. Runner installations and synthetic resources are approved within included allowance; merging and required-check settings remain separate. Local image IDs are not registry digests or deployment approval.

No personal operational history, live-data verification counts, actual endpoint or recovery-custody location is part of this public summary. Deployment requires separately approved configuration, restricted access, backups/recovery, credentials, dependency review and device checks. See [deployment preparation](home-deployment.md).


D046 preparation adds an exact-byte workflow review policy and mocked inactive/rehearsal inventory checks. The launcher reports a safe database-start checkpoint and verifies empty receipts plus exact job-labelled resource inventories before cleanup success. Unknown resources are reported, never removed by inference. This does not activate CI or prove cancellation behaviour on GitHub.


D048 adds a test-only cancellation probe: resource setup followed by a fixed120-second abortable hold, with no integration scenarios. Timeout/cancellation fail the probe and always attempt scoped cleanup. SIGINT/SIGTERM handling is limited to this mode; no application/server signal behaviour changes. The draft remains inactive pending a new execution approval.


D050 restores normal synthetic integration execution in the draft and prepares normal PR event coverage. Exact-byte workflow policy now uses normal-pr for a future activated inventory; inactive still requires no workflow files. Event tests evaluate the exact draft condition with synthetic contexts, not the actual GitHub scheduler. Required-check/settings recommendations remain separate from workflow source.


D053 connects the shared library UI to session/login/callback/refresh routes. The server supplies the connected mode marker; the client validates the exact Spotify PKCE destination, callback and approved read scopes before navigation. Callback completion requests an initial catalogue import; failure preserves saved organisation and allows retry. Synthetic login/test controls remain excluded from production. Sign-out, conflicts and recovery reuse the established API adapter. The executable gate remains intact; operator bootstrap and actual deployment are separate work.


D055 adds `process-preparation.ts`, an injected process lifecycle with fixed status categories, idempotent signal handling and a bounded shutdown deadline. It has no operational defaults or executable caller. `docs/production-setup.md` specifies the operator sequence and separate callback/setup design checkpoint; normal startup cannot initialise a missing journal, create an owner or approve recovery.
