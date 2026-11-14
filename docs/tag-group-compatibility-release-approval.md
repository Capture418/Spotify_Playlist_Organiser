# MuLO tag group compatibility release approval

**Approved under D093 using included allowance only.** This package covers the compatibility release. A separate package will cover the tag group interface and production migration 004.

The local candidate is commit `b2ff5c7` on `codex/tag-group-compatibility`, based on deployed main `5d53568653c6c6ef4bae5d3b0a5e1926082c8aeb`. Its first deployment keeps the app database at schema 003. The same image can later start on schema 004 and preserve groups during tag edits and organisation recovery, giving the later feature rollout a rollback target. D091 records 227 passing local tests and the disposable PostgreSQL 18 rehearsal. PostgreSQL 16 container verification is pending.

## Requested allowance

Use included GitHub Actions allowance only, with paid usage blocked.

| Resource | Used | Additional maximum | Proposed lifetime cap |
| --- | ---: | ---: | ---: |
| Image builds | 21 | 2 | 23 |
| Disposable PostgreSQL and runtime test attempts | 24 | 2 | 26 |
| Deployment requests | 10 | 2, including one conditional rollback | 12 |

Use one image build and one disposable test attempt in the PR workflow and one of each in the main release workflow. Run the additional compatibility scenarios inside those same two attempts. Expected use is one deployment. Count started attempts, including failures and cancellations. A corrective build or rerun requires separate approval. This allowance supersedes the unused subtitle rollback slot for the purposes of this release.

## PostgreSQL 16 gates

Before publishing, adapt the existing disposable CI launcher and fixture to exercise the candidate image with the pinned PostgreSQL 16 image already used by CI. Keep both schema paths in the same scoped disposable attempt, using only invented data and the existing restricted runtime and migration roles. Review the test wiring and run the local quality gate before pushing. Both the PR and main runs must pass:

1. Run the candidate's hosted migration command on schema 003 and confirm the recorded history stays at 001–003. Start the hosted application, require healthy connected mode, and read and edit an invented tag with existing assignments.
2. Stop the app and apply the checked-in migration 004 to the disposable app database using the migration role. Seed an invented group and retain the existing assignments. Run the same compatibility migration command and confirm history stays at 001–004 with the expected checksums.
3. Start the same candidate image again. Verify reading and editing tags, exporting and recovering a grouped snapshot preserve group values and assignments. Check that a legacy export is still accepted and that an altered checksum or unsupported schema history is rejected.
4. Require the existing runtime, journal, shutdown and cleanup checks. Verify the database, containers and other job-owned resources are cleaned up.

## Release and rollback

1. At execution preflight, fetch current main and check the exact candidate diff, workflow triggers, open PRs, active runs, dependency advisories, included allowance and normal-mode setting names. Include a safe deployment check that reports the verified schema version and rejects an unexpected production schema before any upgrade. Keep the compatibility branch independent of the tag groups interface.
2. Publish one reviewed PR. Merge only the passing commit against the reviewed base. The merge triggers the main build, tests, image publication and deployment. Confirm the published digest matches the tested image and record the deployed digest. Leave any GitHub approval prompt to the owner.
3. Verify production reports schema 003, normal mode and HTTPS health 200. On iPhone, reload in Safari and the Home Screen app, confirm the library opens, and select and clear an existing tag filter. Record the result before preparing the separate tag groups rollout.
4. If the compatibility deployment needs a manual rollback and schema 003 is confirmed, use at most one request through the existing manual deployment workflow for the current subtitle image `ghcr.io/capture418/spotify_playlist_organiser@sha256:5b40d216c84657bcc2230d72030a48b83e2e47d4a75d6a2a30ac195f012f5b69`. Verify health afterward. The host's automatic rollback is part of the original request. If the schema is uncertain or incompatible, stop before a manual rollback.

Approval covers the reviewed branch push, PR, merge after checks pass, existing CI dependency steps, disposable PostgreSQL 16 verification and bounded deployment and rollback. Production migration 004, the tag groups rollout, settings changes, credentials, provisioning and paid usage are outside the package.
