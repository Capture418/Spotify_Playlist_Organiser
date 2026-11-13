# Deployment and CI preparation

This public document intentionally omits actual infrastructure identifiers, operator-specific procedures and private evidence. It is a development contract, not a deployable configuration or operational approval.

## Runtime target

One Node application and PostgreSQL16, Linux amd64. Explicit canonical HTTPS origin/callback, owner binding and configuration; no inferred first-use bootstrap. Existing production entry/root stay blocked. The Docker image declares uid1000, compiled runtime assets and a Node health probe; synthetic runtime verification checks read-only root, bounded tmpfs/resources and absence of dev/source material.

Database URLs are runtime-only settings. The application and independent deletion journal have separate databases and distinct runtime/migration roles. Migrations finish before listening, never run under runtime ownership, and preserve previous-version compatibility. Runtime filesystem is not durable custody. Existing PostgreSQL fixtures use invented values and must never be applied to operational databases.

Proxy scheme checks assume network isolation and header overwrite; neither assumption is proven by local mocks. Exact GET /health must work directly without forwarded headers, while all application routes retain canonical Host/HTTPS enforcement. It is not an authentication endpoint.

## Configuration

`.env.example` is deliberately incomplete. Server-supplied DATABASE_URL/PORT/NODE_ENV are not overridden by application secrets. Additional migration/journal URLs, owner/account/client identity and three independent versioned key rings are validated with bounded values and safe errors. Never log configuration objects, credentials or keys. Real settings, recovery custody and operator permissions require separate approval.

## Inactive CI

`docs/ci/pr-checks.yml.example` is outside the workflow activation directory. It targets ordinary opened/synchronize PRs to main, and its job requires the named same-repository rehearsal branch. It uses full action commit pins, contents:read, nonpersistent checkout credentials and no remote package cache, secrets, registry publishing, self-hosted deploy job or deployment command.

The future job builds one candidate image and passes its exact local ID through tests. That ID is not a registry manifest digest. Any later publishing/release process must prove it retains the tested artifact; a rebuild does not inherit acceptance automatically.

The launcher accepts only explicitly approved GitHub-hosted Linux context, rejects inherited operational settings/endpoints and uses a local Docker socket. It creates an internal per-job network/volume and disposable databases, without published ports. Existing integration assertions exercise roles/migrations, runtime health/outage/recovery and independent-journal restore with invented data. SQL dumps stay in process memory. App and database resources have explicit bounds; the host gate executes only mocked launcher operations.

## Cleanup limits

Receipts record job ownership and resource identities. Cleanup verifies those before deleting containers, then volume/network; it never prunes globally. Failed or cancelled workflows have scoped cleanup, but interruption between Docker operations and receipt updates can leave uncertain state. Fail closed on unknown/replaced resources. Actual cancellation rehearsal must distinguish observed cleanup from ephemeral-runner disposal; mocks are not operational evidence.

## Approval sequence

1. Review sanitised source and exact candidate/ref; preserve private history outside the public branch.
2. Separately approve push/PR, authentication, temporary runner installations/downloads, disposable resources and included-allowance use. Confirm repository policy/permissions and cost controls before execution. No paid usage by inference.
3. Run only the bounded approved rehearsal, record failures honestly and stop rather than silently retrying or weakening guards.
4. Review results before permanent CI activation, merge, publishing or deployment. No active workflow or deployment automation is supplied by this snapshot.

No actual endpoint, token, backup location, remote runner path or operator account should be added to this public document. Keep private operational evidence in separately controlled local records. See [lifecycle requirements](s04c-operational-plan.md) and [work plan](work-plan.md).
