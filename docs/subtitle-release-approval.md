# MuLO subtitle release approval

**Approved under D089 using included allowance only.** The owner accepted the subtitle locally and requested a release package for iPhone review.

The candidate adds “Use tags to match the mood” below “Your library.” in the original muted style. Compared with the local copy of the deployed main commit, the app diff covers only the shared library screen and its stylesheet. The local quality gate passed 227 tests, lint, type checks and both builds.

## Requested allowance

Use included GitHub Actions allowance only, with paid usage blocked.

| Resource | Used | Additional maximum | Proposed lifetime cap |
| --- | ---: | ---: | ---: |
| Image builds | 19 | 2 | 21 |
| Disposable PostgreSQL and runtime test attempts | 22 | 2 | 24 |
| Deployment requests | 9 | 2, including one conditional rollback | 11 |

Expected use is two builds, two test attempts and one deployment. The PR uses one build and test attempt. Merging after it passes triggers the second build and test attempt, image publication and deployment. The second deployment request is for rollback only. Count started attempts, including failed or cancelled ones. A failed check that requires a corrective build or rerun needs separate approval.

## Execution and rollback

1. Fetch current main and check open PRs, active runs, dependency advisories, normal-mode setting names and available included allowance. Prepare a fresh branch from current main with the subtitle and relevant release docs. Check the final diff before pushing.
2. Push the reviewed branch and open one PR. Require a passing Linux quality gate, candidate image build, disposable PostgreSQL/runtime checks and cleanup. Verify the passing commit and current base before merging.
3. Monitor the main workflow through deploy. Confirm the tested digest matches the deployed image, normal mode is active and HTTPS health returns 200. If GitHub presents an approval prompt, leave it for the owner.
4. If a deployed regression requires rollback, use the existing manual deploy workflow once with the accepted D087 image `ghcr.io/capture418/spotify_playlist_organiser@sha256:ccbfa18384a6e3a1a3d1def22dc218eb051156444ac892785f0af0d815e6b9f0`. Check health again and record the outcome. Automatic host rollback counts as part of the original request.

Approval covers the reviewed PR push and merge, existing CI runner dependency and disposable test steps, deployment and the conditional rollback. Credentials, settings changes, paid usage, provisioning and production data changes are outside scope.

## iPhone checks

1. On home Wi-Fi or VPN, reload in Safari and choose **Reload app** from the ellipsis menu in the Home Screen app.
2. In both views, check that “Use tags to match the mood” appears immediately beneath “Your library.” and is readable in portrait, with no clipping or overlap.
3. Tap an existing tag to confirm it still filters the library, then clear the filter. Report any issues or accept the release once both views pass.
