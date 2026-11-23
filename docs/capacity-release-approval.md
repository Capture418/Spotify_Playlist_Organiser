# 3 MiB storage release approval

Approved by the owner under D099 on 23 November 2026, using included allowance only.

## Scope

Raise the app’s serialized row-data ceiling from 1 MiB to 3 MiB (3,145,728 bytes). Keep the 12,000-row ceiling, transactional rejection/rollback and current recovery retention. Add a conservative COPY-escaped data estimate capped at 4,000,000 bytes, reserving 1,000,000 bytes below the host’s 5,000,000-byte backup cap for schema, migration records, headers and encryption. Normal unescaped data can use the 3 MiB allowance; escape-heavy values may hit the backup guard earlier. Fixed scalar/JSONB column types underpin this estimate; schema changes require re-review.

PostgreSQL’s COPY text format escapes backslashes and control characters, so a simple 3-versus-5 comparison is insufficient: https://www.postgresql.org/docs/16/sql-copy.html . No claim of measured dump safety is made before the checks below run.

No schema migration, dependency version change, server provisioning, credentials, settings, backup cap or retention changes. Real-data writes remain limited to the previously authorised tempo assignments, resumed only after health/digest verification. Preserve existing genre/occasion tags and reuse the saved Slow tag identity.

## Execution requested

Use included Actions allowance only; additional paid usage stays blocked. One reviewed branch push/PR; merge only the exact passing head. Existing PR and main workflows install their locked dependencies, build/test one image each with disposable PostgreSQL 16 resources and scoped cleanup. No local installations or database/container execution are proposed.

| Resource | Consumed | Additional maximum | New lifetime cap |
| --- | ---: | ---: | ---: |
| Image builds | 27 | 2 | 29 |
| Disposable test attempts | 30 | 2 | 32 |
| Deployment requests | 13 | 2 including conditional rollback | 15 |

The unused prior rollback reserve is included, not stacked. Expected use is two builds/tests and one deployment; no extra build, retry or rerun without renewed approval.

## Required evidence before production writes

- Local quality gate and self-review; verify unchanged migrations/workflows/credentials and exact deployed base.
- PostgreSQL 16: accept an ordinary 1.5 MB update; reject >3 MiB and escape-heavy updates; confirm rollback leaves metadata/organisation unchanged. Verify the escaped example is below 3 MiB of serialized rows but above the separate dump estimate.
- Measure actual plain pg_dump output with a 3,100,000-byte normal payload and 900,000 backslashes in JSONB; require each below 4,000,000 bytes, leaving a further margin for host wrapping. Keep existing journal dump and recovery checks. Stop on unexplained size or accounting differences.
- Main repeats verification, publishes the tested digest without rebuilding, and requests one normal-mode deployment. Require deployed outcome, schema 004, matching publish/deploy digests, and HTTPS health 200. No Spotify consent or new credentials.
- Before resuming tempo edits, retain the tested capacity-aware image as the new rollback floor. Rebase the private plan on a fresh organisation export; verify all final assignments and remove private temporary plans afterward.

## Rollback and stop conditions

The previous colour image is ghcr.io/capture418/spotify_playlist_organiser@sha256:1c0997d74a3c359fca4bced2e93b86ee99f1caff91f4d842efecc075a1913357. At most one conditional rollback to it is included, and only while saved data remains within its old 1 MiB limit. Do not perform new larger writes until deployment is verified. Once larger data is committed, the previous image may reject startup maintenance or writes; do not roll back to it. Halt and prepare a capacity-aware correction rather than remove real data or weaken guards. Automatic host rollback is part of its initial deployment request.

Stop on failed checks, missing included allowance, unexpected schema/data change, backup-size uncertainty, failed/rolled-back deployment, or exhausted counts. No deletion of valid recovery history, production restore, journal pruning or host changes.
