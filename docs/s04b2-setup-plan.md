# Runtime and dependency setup gates

This public summary preserves approval separation without publishing workstation inventory or operator-specific installation evidence.

1. Review exact artifacts/digests, dependency lockfile, licences/advisories, available resources and compatibility. Do not infer installation approval.
2. Only after explicit installation approval, use reviewed components in the approved project/disposable environment; keep lifecycle scripts disabled and do not change system security settings. Installation does not authorise database creation.
3. Separately approve disposable resource identities, synthetic credentials, migrations, reset/restore tests and cleanup. Never reuse operational or unrelated databases.
4. Run applicable quality/runtime checks, preserve bounded evidence and stop for owner review. Actual live credentials, provisioning, spending, publication and deployment remain separate.

The source uses one package and the existing PostgreSQL client; no ORM, native client, global test runner or extra service is required by this plan. The optional Mac-local database tools are not automatically portable to other hosts. The CI launcher is a separate Linux path and must not bypass its environment/resource checks to run on a workstation.

See [artifact review](s04b2-artifact-review.md), [foundation](s04b-foundation-spec.md) and [deployment preparation](home-deployment.md).
