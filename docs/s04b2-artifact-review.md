# Artifact review — public summary

This snapshot contains pinned source dependencies and Docker base references. Machine-specific installation records, download locations and private verification logs are excluded. Their omission is not a claim that a fresh checkout has installed or verified anything.

The lockfile is npm-generated with direct versions matching package.json. A development review reported zero known npm advisories; that is time-specific and must be repeated before release. Declared licence metadata includes MIT, Apache-2.0, MPL-2.0, ISC, BSD-3-Clause and 0BSD. Optional fsevents declares an install script; the approved installation procedure disables lifecycle scripts.

Dockerfile and disposable test declarations pin Node22 and PostgreSQL16 images by digest. Images have not been rebuilt or scanned as part of sanitising this snapshot. Full container OS/advisory/licence assessment is a separate release check. Action references are immutable draft pins with metadata/licence review, not a comprehensive bundled-code audit or permission to execute them.

No dependencies, actions, images or tools may be installed merely because this document exists. See [setup gates](s04b2-setup-plan.md).
