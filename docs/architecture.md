# Architecture and boundaries

**Current hosting authority (D067):** [home hosting](home-hosting.md) supersedes older hosting sections below. Production now uses `hosted.ts` with two restricted runtime connections; `migrate.ts` is the host-run owner command. The journal is append-only encrypted intent/completion rows, bound to the app database by identity. [Hosted operations](hosted-operations.md) records recovery, key retention, dump budgets and exact local/host commands. Historical platform/startup modules remain for regression evidence and are not production entry points.


**Historical sections:** Earlier D059–D066 notes below describe the evolution of the project, not the active runtime contract. D067 above supersedes their hosting and entry-point statements.


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

One repository/package; no framework expansion, telemetry, remote fonts ; D074 permits validated direct Spotify image requests with no-referrer and anonymous CORS. UI renders untrusted metadata as text. Spotify is authoritative for imported metadata; the organiser owns tags. Partial refresh failures never erase organisation data.

## Persistence and security preparation

PostgreSQL stores account-scoped catalogue/organisation, sessions, receipts and encrypted restore snapshots. The current platform uses separate owner migration and restricted runtime roles in the app and journal databases. App-local deletion records commit with cascading account deletion; the independent append-only journal retains intent/completion across app-only restores. Applied migrations are versioned/checksummed; rollback swaps application images, so schema changes must remain compatible with the previous release.

Owner login is PKCE with explicit configured binding and exactly the approved read scopes. There is no first-visitor owner creation or implicit bootstrap. Production sessions use Secure/HttpOnly/SameSite cookies; state/CSRF/origin checks and bounded transport remain mandatory. Credentials are never browser-persistent. Versioned credential and snapshot keys are separate purposes; retained versions support recovery. The hosted append-only journal uses a distinct derived encryption purpose; older singleton/file adapters remain historical. See the [foundation](s04b-foundation-spec.md) and [lifecycle plan](s04c-operational-plan.md).

`hostedConfig` validates only the two runtime URLs and rejects migration credentials. `hosted.ts` verifies schemas and the app/journal identity binding, composes both health checks, and selects setup or connected mode without DDL. `migrate.ts` applies public-schema migrations separately with owner URLs. Independent append-only deletion intent/completion records fence app-only restores; setup remains closed after use. The local-only executable supports exact loopback HTTP while production keeps HTTPS requirements. The old platform/application/executable factories remain solely for regression evidence. See [hosted operations](hosted-operations.md).

Production application requests require canonical Host and a single forwarded HTTPS scheme. Forwarded origin/host/client-IP headers cannot determine trusted origins or rate-limit identity. Exact GET /health bypasses Host/scheme checks for container-local probes and returns bounded database readiness only. Actual proxy isolation must be verified before use; a scheme header does not authenticate its sender.

## Verification and deployment boundary

Host tests cover domain, validation, mocked HTTP/configuration/startup, security/lifecycle mechanics and CI resource plans. Actual disposable database tests are separate from the ordinary gate. D051 approves normal PR CI for all same-repository PR branches targeting main on GitHub-hosted Linux; D067 prepares a main-push build/test/publish/deploy chain and manual deploy/task definitions, still local pending execution approval. Runner installations and synthetic resources are approved within included allowance; merging and required-check settings remain separate. Local image IDs are not registry digests or deployment approval.

No personal operational history, live-data verification counts, actual endpoint or recovery-custody location is part of this public summary. Deployment requires separately approved configuration, restricted access, backups/recovery, credentials, dependency review and device checks. See [deployment preparation](home-deployment.md).


D046 preparation adds an exact-byte workflow review policy and mocked inactive/rehearsal inventory checks. The launcher reports a safe database-start checkpoint and verifies empty receipts plus exact job-labelled resource inventories before cleanup success. Unknown resources are reported, never removed by inference. This does not activate CI or prove cancellation behaviour on GitHub.


D048 adds a test-only cancellation probe: resource setup followed by a fixed120-second abortable hold, with no integration scenarios. Timeout/cancellation fail the probe and always attempt scoped cleanup. SIGINT/SIGTERM handling is limited to this mode; no application/server signal behaviour changes. The draft remains inactive pending a new execution approval.


D050 restores normal synthetic integration execution in the draft and prepares normal PR event coverage. Exact-byte workflow policy now uses normal-pr for a future activated inventory; inactive still requires no workflow files. Event tests evaluate the exact draft condition with synthetic contexts, not the actual GitHub scheduler. Required-check/settings recommendations remain separate from workflow source.


D053 connects the shared library UI to session/login/callback/refresh routes. The server supplies the connected mode marker; the client validates the exact Spotify PKCE destination, callback and approved read scopes before navigation. Callback completion requests an initial catalogue import; failure preserves saved organisation and allows retry. Synthetic login/test controls remain excluded from production. Sign-out, conflicts and recovery reuse the established API adapter. The executable gate remains intact; operator bootstrap and actual deployment are separate work.


D055 adds `process-preparation.ts`, an injected process lifecycle with fixed status categories, idempotent signal handling and a bounded shutdown deadline. It has no operational defaults or executable caller. `docs/production-setup.md` specifies the operator sequence and separate callback/setup design checkpoint; normal startup cannot initialise a missing journal, create an owner or approve recovery.


D056 adds the prepared same-image setup branch to application composition. `setup.ts` provides token/session-bound PKCE and exact-owner confirmation; `setup-http.ts` serves isolated forms, strict proxy/origin checks and minimal database health, with no application logging. Existing account/deletion records and the independent journal form the durable one-time latch without a migration. Normal executable activation remains blocked; setup requires previously prepared journal/recovery state. See `docs/production-setup.md` for operational limits and accepted restricted error-log risk.


D057 prepares exact-image verification without the host runtime overlay and an operator-only empty-journal initialisation primitive. The primitive requires explicit external first-use evidence, empty storage and a blocked recovery guard; it never resets existing journal data or approves recovery. No executable/HTTP initialisation entry is activated. `docs/release-rehearsal.md` defines the later execution package and no-shell operator checkpoint.


D061 joins the validated application to `prepareProcess` through the injected `executable` boundary and inert `processHost` adapter. The default production entry supplies no dependencies and still refuses activation. The current exact-image rehearsal uses one owning role/database and the same executable boundary with mocked Spotify and an observed lifecycle host. Historical release/setup launcher modes are rejected. Real container/database and OS-signal verification remain separate; see `docs/release-rehearsal.md`.


D063 records D062 acceptance and prepares `docs/pilot-approval.md`. `release-dependencies.ts` supplies an inert, tested transport/pool adapter; the proposed activation diff stays unapplied in `docs/release/pilot-activation.patch`. The default entry still refuses. The package combines release verification, publication, secure credential handoffs, setup/normal deployment and owner acceptance; none of that operational scope is approved by preparation.


D074 local artwork implementation retains one validated image URL in existing expiring metadata JSON, never image bytes or organisation exports. Exact HTTPS image origins are centralised in src/domain/artwork.ts and reused by CSP, import selection, storage normalisation and rendering. Missing old fields and invalid URLs become null; catalogue import remains usable. No schema migration. Artwork fits without cropping; failed/missing art gets a neutral fallback. Bulk selection is outside the art. Official white Spotify logo is served locally. Browser image loads are lazy, no-referrer and anonymous CORS; hosts without CORS support fall back safely. Source/domain allowlist changes require review. Production remains the accepted D073 pilot until separately approved release.


D080 moves connected-library administration into a native modal Settings & data panel, reached from a compact header disclosure alongside Reload app and Refresh from Spotify. Normal Tab navigation, Escape/outside dismissal and focus return are preserved. Existing API handlers remain in ConnectedLibrary; closing settings cancels pending confirmation UI without mutation. Polling success no longer overwrites action/error feedback or creates a permanent status banner. Demo/synthetic controls remain distinct; no storage or authentication change.
