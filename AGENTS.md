# Project instructions for coding agents

Before planning or editing, read:

1. [The constitution](.ai/constitution.md).
2. [The architecture](docs/architecture.md).
3. [The decision log](docs/decisions.md).
4. [The current task and handover](docs/work-plan.md).

These are the source of truth for this snapshot. Surface conflicts before affected work. Work only in this project and inspect Git status before changes. Preserve user work; never initialise or alter another repository. Use one package and small reviewable changes, without a multi-agent hierarchy. Follow the canonical constitution rather than inventing competing rules.

**Current boundary (D063):** The fixed platform contract in `docs/platform-contract.md` supersedes historical separate-journal/four-role/external-job launch assumptions. Do not build against music_journal until its existence is confirmed. Initialisation belongs in the app startup. Covered platform facts/risks are settled; do not ask for reconfirmation. Real credentials/data, server actions, merging/settings and deployment remain gated. D062 is accepted. One exact-image single-database rehearsal passed with cleanup. Routine local preparation may proceed without repeated checkpoint confirmations; the consolidated pilot proposal in `docs/pilot-approval.md` is not execution approval. Credentials, extra resource runs and default production activation remain gated.

Use a descriptive `codex/` branch. Never push directly to main or merge without owner approval. Normal PR workflow execution is authorised by D051; local database/container execution is not implied by ordinary checks. Do not weaken environment, resource-ownership, proxy or production guards to make a test pass.

Existing commands: `npm run check` (full installed-host gate), `npm run check:foundation`, `npm run dev` (loopback invented demo), `npm run build` and `npm run build:server`. Database commands can create/reset resources and are separately gated. `npm start` intentionally refuses production activation. No dependency installation is implied by a code-review task.

Never put tokens, real keys, private exports or operational credentials into files, logs, images or commits. No VITE_ secrets. Placeholder configuration and invented test values must stay clearly identified.

At handover update the work plan; record decisions only when made. Report actual changes/checks, limitations and next approvals. Do not claim a browser, device, database, security audit or hosted CI check that was not performed. Keep this file short; amend canonical rules only with approval.
