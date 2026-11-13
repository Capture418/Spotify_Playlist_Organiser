# D057 release-image and operator-initialisation rehearsal package

Preparation only. D056 accepted; no image build, dependency installation/download, container/database creation, registry push, secret access, server operation or deployment is authorised by D057. Existing production executable refuses activation. This package proposes a bounded local execution approval; it is not a production release approval.

## What changed

The local database runner has a `release` mode requiring an exact `sha256:` local image ID. It refuses tags and extra arguments, inspects the supplied ID, and never mounts `.work/runtime` over the image. Only the invented verification script and existing role fixture are mounted read-only. This closes the D054/D056 evidence gap: their current code was mounted into an older cached runtime, rather than baked into the tested image.

The mode reuses internal networking, non-root/read-only app execution, bounded tmpfs/memory/CPU, dropped capabilities and label/identity-checked cleanup. It uses its own `music-release-d057` resource names and `.work/release-e2e` receipt. It neither builds nor pulls images. Missing images fail; never substitute another artifact to make the run pass. Existing receipts require review, not automatic deletion.

The image's default command remains blocked and is checked as such. A separately mounted harness explicitly invokes prepared composition with invented settings and mocked Spotify. Therefore a passing rehearsal would prove image-packaged components, not a live production executable, actual proxy behaviour or deployed owner setup. No registry manifest digest is produced by a local image ID.

## Proposed bounded execution — approval still required

1. Confirm clean source/ref, available disk/memory, installed Docker context and exact cached base/PostgreSQL digests. Record source commit, Dockerfile/lockfile hashes, platform and image ID in ignored evidence. Preserve private history and unrelated resources.
2. Build one Linux amd64 candidate from this source using the existing Dockerfile, locally only. Proposed command with the installed Docker binary: `docker --context desktop-linux build --platform linux/amd64 --pull=false --iidfile .work/release-candidate.id .`. `--pull=false` is not a guarantee of no downloads if layers are missing; stop for review if required artifacts are absent. The Dockerfile runs `npm ci --ignore-scripts` and `npm ci --omit=dev --ignore-scripts` inside build stages. These are dependency installations and may require registry downloads, so the approval must explicitly cover them. No host installation or Docker upgrade is proposed. Do not use real build args, secrets, private files, SSH forwarding or remote cache/publication.
3. Review the resulting exact image configuration: Linux amd64, non-root node user, runtime-only assets/dependencies, expected blocked command and health probe. Retain local image ID and build log privately; do not claim a new security advisory review from a successful install/build. Run dependency advisory review under its own allowed network scope before any real release.
4. With explicit disposable-resource approval, invoke `CONNECTED_DISPOSABLE_APPROVED=synthetic-only node scripts/database/connected-run.mjs release <exact-local-image-id>`. The placeholder must be replaced with the inspected immutable ID, not a tag. Do not execute this command under D057 preparation alone.
5. Exercise current packaged schemas, explicit empty-journal initialisation/refusal, recovery reconciliation/approval, token setup/owner verification, return to normal, library edits/conflicts/restore, shutdown/restart and restored-setup-config refusal. All Spotify replies and identities remain invented. No external network from the internal test network or published ports. Initialisation uses the operator migration pools; normal app pools retain their existing grants.
6. Require all assertions, successful container exits and scoped cleanup. Independently query labelled containers/volumes/networks and inspect the empty receipt. A failed or interrupted run is not a pass. Stop, retain evidence and report before another execution; no automatic retry loop. If ownership is uncertain, inspect rather than prune.

Acceptance evidence: exact source/image identity, install/build outcomes, runtime restrictions/blocked executable, initialisation and setup-to-normal assertions, resource cleanup and stated omissions. Keep the tested image; do not rebuild and attribute the old result to a new image. Publication and eventual registry digest verification are separate approvals.

## Operator first-use initialisation primitive

`server/operator-initialisation.ts` exports `initialiseEmptyJournal` without a CLI, listener, default pool or import-time side effects. It requires separate app/journal pools, journal-purpose encryption and explicit first-ever/app-stopped/inventory-verified attestations. These attestations represent outside evidence: SQL cannot prove a missing database has never contained deleted data.

The existing version3 migration initially inserts an open recovery guard. With the application stopped, the operator must explicitly set `recovery_guard.blocked=true` before calling this primitive; do not change an applied migration or weaken the primitive to skip that fence. After schema verification, it holds the bootstrap advisory lock and blocked recovery-guard row lock, rejects all application data/deletion history, and inserts the encrypted empty journal only when the journal table is truly empty under an exclusive lock. It never updates/deletes an existing journal, clears the recovery guard, creates an owner or connects Spotify. The schema and role grants are unchanged.

The two database commits are not atomic. If the journal commits and the app transaction or process subsequently fails, leave the app offline and inspect. A retry must refuse the existing journal, even if empty; never reset it automatically. Retain the verified journal and proceed through the separately confirmed recovery procedure after inspection. Recovery reconciliation and approval require a fresh in-process receipt and independent inventory, as before. A lost/stale journal is not first-use initialisation.

## No-shell server checkpoint

The server has one app slot and no user shell. D056's setup mode deliberately needs an initialised journal and approved recovery state before it listens; it cannot itself safely supply those missing prerequisites. The operator must run the initialisation/migration/recovery actions before exposing setup mode. Do not hide these privileged mutations inside normal startup or weaken readiness to bypass the dependency.

Recommendation: an operator-controlled one-time maintenance job using the reviewed image, injected approved configuration and separate migration/runtime roles, with app traffic stopped and secrets absent from logs. No public HTTP initialisation endpoint. This is a proposal, not an implemented server facility. If the server cannot run such a job, revisit the design with the owner; do not silently turn on automatic initialisation.

Questions to send the operator (answers only; no action requested):

- Can you run a one-time maintenance job from the reviewed image before the app slot starts, despite us having no shell? What supported invocation mechanism is available?
- Can it receive the four database-role connections and approved keys without exposing values in arguments/logs/public job output, and run while ordinary app traffic is stopped?
- Can you supply first-ever empty-storage evidence, independent journal inventory and backup/key-recovery evidence, or identify what is still unimplemented? Do not send secrets.

Once answered, propose the exact command/interface and approval scope. Do not claim server backups or least-privilege roles exist merely because their policy was approved.

## Separate release gates and limits

This preparation does not remove production.ts refusal or wire a real transport. A future executable diff needs review, real signal/shutdown and exact-image testing, current Spotify requirements/security review, operator readiness and explicit activation approval. Runtime150-second startup and10-second stop deadlines fit the reported180/20-second server contract; they have not been verified on that server here.

Real credentials/owner identity, provisioning, settings, merge/push, registry publication and both setup/normal deployments remain separate. Remove setup mode and token together on return to normal; a failed return remains urgent because rollback may restore settings. Persisted setup closure and independent recovery checks remain mandatory. Actual browser Secure-cookie handling, iPhone PWA, proxy/log behaviour, server-loss recovery and prior-release rollback execution need their own evidence.
