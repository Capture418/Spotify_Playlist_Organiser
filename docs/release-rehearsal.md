# Single-database release rehearsal — D061 preparation

**D067 hosting supersession:** [home-hosting.md](home-hosting.md) is authoritative; [hosted operations](hosted-operations.md) supplies current commands. Earlier single-database, startup migration, missing-journal and manual-only workflow statements below are historical. Keep the pilot's approved execution counters; this notice does not activate workflows or authorise deployment.


D062 authorises one build and one disposable run; both passed with verified cleanup. Exact image and evidence are in `docs/work-plan.md`. That execution allowance is exhausted; the package below remains a reference for any separately approved future run. The fixed platform contract remains authoritative. Old release/setup modes and the D058 rerun are superseded.

## Prepared wiring and scenarios

`server/executable.ts` validates configuration, then joins application composition to the process lifecycle using explicitly injected database/Spotify dependencies and process host. The host adapter emits fixed status categories and supplies signal/exit handling. It is inert until called. The production entry calls this boundary without dependencies and still refuses activation; no environment flag bypass or live fetch default is provided.

The prepared `connected.mjs` harness invokes this image-packaged executable boundary with the actual disposable database, mocked Spotify transport and an observed lifecycle host. It starts with empty application storage: the app migrates using the single non-superuser owning role, then serves setup. It exercises token/CSRF/PKCE/exact-owner confirmation, no stored setup grants, durable closure after restart, normal login/import/retry, shared tags, conflicts, reconnect, replace-only restore/snapshot recovery, lifecycle shutdown/restart, rollback of an injected deletion failure, atomic deletion and refusal to recreate the owner. The harness uses lifecycle stop rather than sending a real operating-system signal; real SIGTERM delivery/timing remains separate evidence.

`connected-run.mjs platform <exact-image-id>` uses a dedicated `music-platform-d061` label/name prefix and `.work/platform-e2e/receipt.json`. Only the single-database synthetic SQL fixture is mounted. It creates one application database and one non-superuser owning role inside disposable PostgreSQL; no journal database or additional application role. The default legacy CI scenarios remain historical and cannot run through the single-database launcher mode.

Exact image content is mandatory: no tag or compiled host-runtime overlay. Old modes are rejected. The image command/refusal and runtime assets/restrictions are inspected first. Application verification runs uid1000, read-only root,64MB ephemeral tmpfs,512MB/one CPU, dropped capabilities, no published ports and an internal Docker network. No Spotify network call can leave that network. Fixture scripts are mounted read-only; they are not production endpoints or a synthetic-login bypass in the app.

## Proposed next execution package — not authorised by D061

1. Record clean source revision, Dockerfile/lockfile hashes, free disk/memory, installed Docker context and cached immutable Node/PostgreSQL artifacts. No host installation or server access.
2. Build one local Linux-amd64 candidate with the existing Dockerfile and record its exact local image ID. Approval must cover the Docker build and its locked in-container npm dependency installations/downloads if necessary. No secrets/build arguments, SSH, registry publication or remote cache. A local image ID is not a published registry digest.
3. Inspect that exact image and execute once using `CONNECTED_DISPOSABLE_APPROVED=synthetic-only node scripts/database/connected-run.mjs platform <exact-local-image-id>`. The launcher does not build or pull and refuses inherited operational settings, wrong Docker endpoints, mutable image IDs, existing receipts and colliding resources.
4. Require all scenario assertions and successful exits. Cleanup verifies label/identity before removal and then positively checks empty receipts and no labelled containers/volumes/networks. Independently inspect the final resource inventories. Never prune unknown resources or erase existing evidence to retry. Stop on failure and report before any new attempt.

Retain build/image/scenario/cleanup evidence in ignored `.work/`. No automatic retry, push, merge or deployment. No current approval covers running these commands.

## Acceptance limits and remaining gates

Mocked tests prove wiring, argument/fixture selection and cleanup logic, not PostgreSQL behaviour or real container timings. A later successful rehearsal would prove packaged components using a mocked transport and lifecycle host; it would not activate the default production command or prove real signal delivery, HTTPS proxy/cookie behaviour, actual Spotify, iPhone PWA behaviour or backup restoration. Deletion history shares the accepted database restore loss window.

Live transport/credential wiring, default executable activation, actual signal/container checks, registry publication and setup/normal deployment require their separate review/approval. No more questions about covered platform facts are needed. Remove setup mode/token together when eventually returning to normal; failed return remains urgent.
