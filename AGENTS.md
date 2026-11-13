# Project instructions for coding agents

Before planning or editing, read:

1. [The constitution](.ai/constitution.md).
2. [The architecture](docs/architecture.md).
3. [The decision log](docs/decisions.md).
4. [The current task and handover](docs/work-plan.md).

These are the source of truth for this snapshot. Surface conflicts before affected work. Work only in this project and inspect Git status before changes. Preserve user work; never initialise or alter another repository. Use one package and small reviewable changes, without a multi-agent hierarchy. Follow the canonical constitution rather than inventing competing rules.

**Current boundary (D056):** same-image setup mode with invented data/mocked Spotify and disposable local PostgreSQL verification is authorised; live credentials/data, server provisioning and production activation remain gated. D051 normal CI authorisation remains. D050 accepted; normal PR CI activation, push/PR, runner installations and synthetic resources for eligible same-repository PRs to main are approved, included allowance only. Merge, required-check settings and deployment remain separately gated. No app credentials, real data or Mac/server installations. Production guards remain. See the work plan for actual run evidence.

Use a descriptive `codex/` branch. Never push directly to main or merge without owner approval. Normal PR workflow execution is authorised by D051; local database/container execution is not implied by ordinary checks. Do not weaken environment, resource-ownership, proxy or production guards to make a test pass.

Existing commands: `npm run check` (full installed-host gate), `npm run check:foundation`, `npm run dev` (loopback invented demo), `npm run build` and `npm run build:server`. Database commands can create/reset resources and are separately gated. `npm start` intentionally refuses production activation. No dependency installation is implied by a code-review task.

Never put tokens, real keys, private exports or operational credentials into files, logs, images or commits. No VITE_ secrets. Placeholder configuration and invented test values must stay clearly identified.

At handover update the work plan; record decisions only when made. Report actual changes/checks, limitations and next approvals. Do not claim a browser, device, database, security audit or hosted CI check that was not performed. Keep this file short; amend canonical rules only with approval.
