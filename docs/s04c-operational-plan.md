# Lifecycle and operational requirements — public summary

This document describes technical requirements only. Actual endpoint, operator identity, backup destination, vault/recovery location and private evidence are intentionally absent. Production activation and real data/credentials remain gated.

## Retention and failure behaviour

- Keep at most10 organisation snapshots per account, usable for7 days. Create the encrypted pre-restore snapshot before committing replacement. Remove expired/excess snapshots; they are not a history of every edit.
- Previews expire after5 minutes; metadata cache and mutation receipts after24 hours. Reject expired data immediately and prune on startup and at least once per minute while running. Prune expired sessions too. Stopped processes cannot sweep; backup retention is separate.
- Ordinary sign-out invalidates the relevant session(s) and keeps organisation. Definitive refresh rejection suspends access and requires reconnect; transient transport failure does not delete tags.
- Explicit disconnect/deletion fences access and removes organisation, cached data, sessions, credentials and snapshots according to the approved deletion contract. Clearing a local session is not evidence of provider-side grant revocation. Treat remote grant revocation as a separately verified outcome.

## Keys and backups

Separate versioned encryption for credentials, snapshots and the deletion journal. Keep runtime keys outside the database and independently recoverable copies in owner-approved custody separate from backup files. Retain old versions while retained artifacts require them; key retirement/destruction needs approval and recovery evidence. Missing credential keys require reconnection; missing snapshot keys make those snapshots unavailable, without deleting current organisation. Unknown/tampered ciphertext fails closed.

Backup schedule, retention, encryption, access and disposal must be explicitly approved and verified; do not assume backups exist. An application snapshot is not protection against losing the database itself. Same-server loss can lose all records after the latest surviving backup. Restoring a coherent stale backup does not prove it contains the latest deletion intent.

## Independent deletion reconciliation

The journal must survive an application-database-only restore. Minimal encrypted intention/completion records live behind the separate journal boundary; no catalogue or refresh token belongs in the journal. Application writes and an independent journal cannot be assumed to share one database transaction: explicit fencing/retry/reconciliation is required.

Uncertain or interrupted deletion keeps the recovery guard blocked. Restore remains offline until schema/checksums, independent inventory, deletion reconciliation and credential/session invalidation pass. A fresh in-process verification receipt and explicit operator approval are required before reopening. Missing or uncertain inventory must not be interpreted as consent to reconnect a deleted account.

Recovery copies and old keys must be retained/retired consistently with every backup that could resurrect data. A matching digest cannot prove an operator-supplied inventory is current; independent custody and an actual recovery drill remain mandatory before meaningful real data.

## Release gates

Verify restricted HTTPS/proxy routing, explicit owner bootstrap, Secure cookies, session isolation, key recovery, backup restoration, deletion/revocation, previous-version migration compatibility, dependency security and actual phone/desktop behaviour. Logs contain fixed categories/statuses, never private bodies, tokens, cookies, identifiers or query-bearing URLs. No telemetry is selected.

Preparation tests and code review are not deployed-system acceptance or an independent security audit. No cloud account, service, credential, installer, budget or deployment is authorised by this public plan. See [deployment preparation](home-deployment.md).
