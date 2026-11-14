# Music Library Organiser

A responsive personal organiser for Spotify playlists and saved albums. Shared tags, match-all filtering and all-word search help find music; Spotify remains the player.

This is a development snapshot. The default interface uses invented data and resets edits on reload. The Node/PostgreSQL foundation and an online-only PWA manifest are prepared, and the production executable requires explicit validated settings. No hosted service, live account connection or offline library is supplied by this repository.

## Development

One React/TypeScript/Vite application and one npm package. The lockfile pins dependencies. Supported package engines are Node22.18+ on the22 line or Node26; the local quality gate has been exercised on Node26. The CI configuration specifies Node22.23.5 and PostgreSQL16.16; Historical D062 verified the previous single-database design; current two-database verification results are in the work plan.

When dependency installation is separately authorised, use `npm ci --ignore-scripts`. With dependencies already present:

- `npm run dev`: loopback invented-data interface.
- `npm run check`: documentation, lockfile, lint, types, tests and frontend/backend builds.
- `npm run check:foundation`: documentation and foundation/mock tests.
- `npm run build`: frontend and emitted backend; this does not activate production.

Do not run database commands, Compose or the CI launcher without explicit disposable-resource approval. Some integration tools intentionally reset synthetic databases. The memory-only Spotify verification helper requires its own live-access approval and a public PKCE client ID; never provide a client secret.

## Boundaries

- Online-only PWA foundation: local manifest/icons and responsive layout, no service worker, offline catalogue, token storage or write queue in the browser.
- Read-only Spotify permissions only; no playback or library-modification feature.
- Same-origin server API, explicit owner binding and two databases with restricted runtime roles and host-run migrations; an independent append-only deletion journal fences restored data.
- Versioned encryption keys and restore/recovery controls are preparation mechanisms, not proof of hosted custody or backups.
- `.env.example` contains placeholders and a reserved example hostname. It is not a working deployment configuration.
- Normal PR CI is present under `.github/workflows` under D051. The prepared main workflow tests and publishes an image before digest-linked deployment; workflow activation and execution remain subject to approval.

Read [AGENTS.md](AGENTS.md), [the constitution](.ai/constitution.md), [architecture](docs/architecture.md), [decision summary](docs/decisions.md) and [work plan](docs/work-plan.md) before changes. Technical deployment gates are in the [deployment preparation plan](docs/home-deployment.md).

Personal operational records and private development history are intentionally excluded from this public snapshot. Public technical summaries preserve the implementation boundaries without publishing account observations or actual infrastructure details.


## App contract — operator-confirmed timing

The exact [home hosting contract](docs/home-hosting.md) is authoritative. Migrations run separately using owner URLs (15-minute host limit); the app must be healthy within 180 seconds and stop within 20 seconds. The app retains tighter 150/10-second budgets. See [hosted operations](docs/hosted-operations.md) for commands, restricted roles, local Compose, recovery and backup capacity limits.

The consolidated private-pilot approval package is [here](docs/pilot-approval.md). D064 approves that bounded package; secure user handoffs remain required.
