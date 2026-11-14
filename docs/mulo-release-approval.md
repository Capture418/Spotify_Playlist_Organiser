# MuLO release approval package

**Approved under D086 using included Actions allowance only.**

The release changes the library header to **MuLO: Music Library Organiser**, uses **MuLO** for the browser and Home Screen app names, and removes the subtext beneath “Your library.” and the connected library information box. D084 records the local quality gate with 227 passing tests, lint, type checks and both builds.

The last accepted deployment is D083, from main commit `5af823ad05aec45e3d5f78f9ae94dc3d3a1a59ae`. The local `origin/main` reference predates it. At execution, fetch current main and prepare a fresh `codex/` branch with the reviewed rebrand and release docs. Verify the PR diff against that base before publishing so the previous release branch's local evidence commits stay local.

## Allowance requested

Use included GitHub Actions allowance only, with paid usage blocked. This package requests fresh authority to use the remaining capacity under the existing lifetime caps.

| Resource | Recorded use | Expected additional use | Maximum additional use | Lifetime cap |
| --- | ---: | ---: | ---: | ---: |
| Image builds | 17 | 2 | 2 | 19 |
| Disposable PostgreSQL and runtime test attempts | 20 | 2 | 2 | 22 |
| Deployment requests | 8 | 1 | 2 | 10 |

The two build and test attempts cover the PR and main workflows. The second deployment request is reserved for a manual rollback to D083 if needed. Count started attempts, including failures and cancellations. A failed check or any need for a corrective build or rerun requires a fresh decision. Approval covers the reviewed branch push, PR, merge after CI passes, normal release, and the bounded rollback. Existing CI runner and container dependency steps and disposable test resources are included. Credentials, repository settings, Spotify permissions, server provisioning, paid usage and production data changes remain outside scope.

## Release steps

1. Confirm current main, open PRs, active workflow runs, dependency advisories and included allowance before any push. Review the exact candidate and existing workflows. Confirm normal-mode settings by name only.
2. Open one PR. Require successful Linux quality checks, candidate image build, disposable PostgreSQL/runtime tests and cleanup. Review the passing commit and current base before merging.
3. The merge triggers the main build, test, image publication and deployment. Verify the release digest matches the tested image, then confirm the normal-mode deployment outcome and HTTPS health response. Use the existing GitHub approval prompt if it appears.
4. If a deployed regression requires a manual rollback, use the existing deployment workflow once with the verified D083 digest `ghcr.io/capture418/spotify_playlist_organiser@sha256:ca0382f835083691bd2841946fe29bc3720fdc53c3c35f3467d14846c35159dc`. Check normal mode and health again. The host's automatic rollback is part of the original request. Record the outcome and stop if the rollout fails.

## iPhone checks

1. On home Wi-Fi or VPN, reload the library in Safari and use **Reload app** from the ellipsis menu in the Home Screen app. In both, check that the full header fits and the ellipsis remains easy to reach.
2. Confirm the green information box and subtext are gone and that search, artwork and an existing tag still display. Open and close the ellipsis menu.
3. Check for the **MuLO** label on the Home Screen. If the existing icon retains its old label while the app itself shows the new header, report that separately. A fresh Home Screen addition can verify the new default label. Keep the existing icon unless you choose to replace it.
4. Report any layout or naming issues and confirm acceptance after the checks pass.
