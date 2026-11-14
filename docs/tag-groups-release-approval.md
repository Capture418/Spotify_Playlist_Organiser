# MuLO tag groups and migration 004 release approval

**Approved under D095 using included allowance only.** The owner accepted the compatibility release after the iPhone checks passed in Safari and the Home Screen app. This package requests fresh approval for the tag groups interface and the additive production migration.

Production was last verified on schema 003 at main commit `a8820113408ccfa5b47a36c7a68238d147adea0e`. The accepted compatibility image, which passed PostgreSQL 16 tests on both schemas, is the rollback target for this release.

The feature adds collapsible Genre, Occasion and Tempo sections, keeps selected tags visible and places existing tags in Ungrouped until moved by the owner. Migration 004 adds a nullable group column without reclassifying any tags. Tag IDs and assignments are preserved. Older exports restore as Ungrouped, and exports and recovery snapshots from the new release retain groups.

## Requested allowance

Use included GitHub Actions allowance only, with paid usage blocked.

| Resource | Used | Additional maximum | Proposed lifetime cap |
| --- | ---: | ---: | ---: |
| Image builds | 23 | 2 | 25 |
| Disposable PostgreSQL and runtime test attempts | 26 | 2 | 28 |
| Deployment requests | 11 | 2, including one conditional rollback | 13 |

Expected use is one build and test attempt for the PR, one of each for main, and one production deployment. The unused compatibility rollback slot is reassigned within this limit. Count started attempts, including failures and cancellations. A corrective build or rerun needs separate approval.

## Before publication and merge

1. Fetch main and build a fresh candidate from the verified compatibility base. Check the diff, workflows, open PRs, active runs, advisories, included allowance and normal-mode setting names. Review backup availability and the operational rollback procedure. Preserve the published migration 004 checksum.
2. Run the local quality gate. Adapt the existing PostgreSQL 16 fixture to seed tags and assignments on schema 003, then run the feature image's actual hosted migration command and require schema 004. Update the compatibility-only CI expectations so the fixture applies 004 once through that command. Verify replay and checksum validation.
3. On schema 004, verify restricted-role startup, Ungrouped legacy tags, cross-session group changes, assignment preservation, and grouped exports and snapshot recovery. Reuse the verified compatibility image by digest within the same disposable attempt to confirm it still starts against the migrated fixture and preserves groups during writes. Require existing journal, cleanup and runtime checks. No extra image build is needed for the rollback image.
4. Publish one reviewed PR and merge only after the exact candidate passes CI and its base is rechecked. The main workflow repeats the gate before publication and deployment. Leave any GitHub approval prompt to the owner.

## Production verification and rollback

Approve applying migration 004 only through the host migration command for this release. Verify the tested and deployed digests match, the migration log confirms schema 004, and normal mode returns HTTPS health 200. If needed, use at most one manual deployment of the accepted compatibility image `ghcr.io/capture418/spotify_playlist_organiser@sha256:13b7a1516a2236a386d022692b339f82f131f0d2aebec661385cd96c185ad0c5`. Verify schema 004 and health after rollback. Keep the additive column and saved group data in place. Automatic host rollback is part of the original deployment request. Stop on an unexplained migration or integrity failure and report the outcome.

Approval covers the reviewed push, PR, passing merge, existing CI dependencies and disposable resources, one migration and deployment, and the conditional rollback. Server provisioning, credential or settings changes, paid usage and production restore or deletion are outside scope.

## iPhone review

Reload MuLO in Safari and from the Home Screen app. In both, check that Genre, Occasion and Tempo expand and collapse, existing tags are Ungrouped, and selected filters remain visible when collapsed. If you want to start organising, move one existing tag and confirm it still shows the same items and appears in the new group after reload. Report the results before accepting the release.
