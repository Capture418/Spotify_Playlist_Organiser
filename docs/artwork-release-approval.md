# Artwork release approval package

Status: **approved for bounded execution under D076**. Owner explicitly approved this package using included allowance only. Proposed wording below records the approved limits; all exclusions and stop conditions remain binding.

## Candidate and review

Branch `codex/spotify-artwork`, implementation ed5ef1e, against fetched main a0645c5aa96dc5c2d500ff29dfa2d0c12181a599. No open PR or active release observed during preparation. Review includes carried-forward local pilot evidence/acceptance docs, not private original history. Runtime diff adds validated artwork URLs, existing-cache persistence, direct browser images, fallback, attribution, explicit public logo asset and image-only CSP exception. No workflow/dependency/schema/credential change. A second technical-lead self-review is not independent security assurance.

Local evidence: full quality gate227 tests passed; mocked browser displayed successful, missing and failed images. Storage fake-client tests cover old/expired/invalid metadata and export exclusion. Local browser proof used intercepted invented image responses, so it does not establish actual CDN CORS/host coverage or image download performance. Prepared disposable scenario now explicitly asserts mocked artwork survives PG import/read, logo serving, image CSP and export exclusion; that new scenario is not executed until approval.

## Proposed bounded execution

| Action | Maximum |
| --- | --- |
| Additional candidate builds | **4**: initial PR/main pair, plus one diagnosed corrective PR/main pair |
| Additional disposable synthetic attempts | **4**, including failed/cancelled attempts |
| Lifetime caps if approved | **15 builds / 18 synthetic attempts** (currently11/14 consumed) |
| Deployment requests | **3 additional**, lifetime cap8 (currently5 consumed): initial artwork, at most one corrective artwork, and at most one return to accepted pilot |
| Publication | One artwork PR and, only for a diagnosed in-scope defect, one corrective PR; merge exact passing heads |
| Cost and installations | Included Actions allowance only; locked CI/container installs and existing pinned synthetic resources only; no host installs or paid usage |
| Live verification | Existing-owner read-only catalogue refresh; direct artwork requests; reversible existing-tag checks and private Mac/iPhone review |

Two builds/tests and one deployment are expected. Reserve allowances are not automatic retries. Every build counts, including reruns. Do not bypass failing gates or silently expand image hosts, scopes, credentials, cache/storage limits or proxy architecture. Unexplained security/data-integrity failures stop the release. Once caps are consumed, stop affected execution and report the concrete blocker.

## Execution and rollback

1. Recheck clean candidate, remote main, active runs, dependency advisories and exact diff. Confirm included allowance remains available with paid usage blocked; names-only secret inventory must retain nine settings with both setup secrets absent. Never read values or reactivate setup. Re-review unexpected main changes before proceeding.
2. Publish the reviewed branch/PR. Require full Linux quality gate, candidate image, actual disposable PG/runtime scenario and scoped cleanup. Check artwork persistence, old metadata compatibility, official logo packaging and export exclusion. No manual additional rehearsal outside the counters.
3. Merge only the exact passing head. **Merge triggers the main build/test/publish/deploy chain.** It builds a fresh candidate once, verifies it, publishes that image by immutable digest and deploys normal mode. Keep any GitHub action-time approval prompt as an owner handoff for that existing run. No duplicate dispatch.
4. Require deployed outcome, successful migration command, normal app and health200. Record safe statuses/source/digest without raw secret-bearing logs. Existing migrations run idempotently; no new schema change or reset is included.
5. Owner refreshes catalogue once to populate artwork URLs. Existing old records safely show fallback before refresh. Preserve tags and respect existing storage capacity guards; if refresh fails, diagnose without pruning data or loosening limits. Inspect only necessary browser request metadata, no HAR/cookies/tokens/private exports in evidence.
6. If a diagnosed in-scope defect needs code correction, use the reserved PR/main pair and one corrective deployment. Never disable CORS/referrer protections or widen to arbitrary image sources to make images load. Material design changes need approval.
7. If the artwork release cannot safely remain running, the package permits one manual same-workflow deployment of accepted image `ghcr.io/capture418/spotify_playlist_organiser@sha256:0ab3a14b5e0e6446f7f3858d5909ecf2589bbdfe58369f8d4ae4d9be4cb28179`. No rebuild, database restore or setup secrets. Old code ignores the additive cached artwork field; tags/schema remain compatible. Host automatic rollback is covered by its contract and is not a separate requested deployment. Record and verify any return to pilot; do not call artwork accepted after rollback.

## Mac/iPhone acceptance checks

- Representative albums, standard playlists, custom playlist covers and any missing-art cases: correct art, no distortion/cropping, fallback usable; no need to share private names.
- Titles/tags stable after refresh and reopening; search, filters and Spotify links still work. Artwork is omitted from organisation export.
- Scroll a larger library: lazy image loading, no repeated broken-image loops or disruptive layout shifts. Confirm allowed image-host coverage and CORS in actual browsers; rejected destinations stay fallback.
- Desktop keyboard,200% zoom and mobile layout: selection controls stay outside art, clear focus and touch targets, legible attribution.
- iPhone Safari and Home Screen app over VPN: art loads after refresh/reopen and the correct Spotify items open.
- Network metadata: only same-origin app resources plus reviewed Spotify image origins for artwork; images send no page referrer or organiser auth credentials. No real payloads/credentials stored as evidence.
- Owner explicitly accepts the artwork release after results are recorded. Retain the accepted pilot status if release checks reveal unresolved artwork defects.

No provisioning, new credentials/scopes, secret changes, billing/settings changes, host installation, new services, production maintenance, deletion, restore tests or unrelated styling/features are authorised by this proposal. Evidence-only commits stay local because main pushes trigger releases.

Suggested approval: **“I approve the artwork release package in docs/artwork-release-approval.md, including up to four additional builds and four synthetic attempts, the reviewed PR/merge, up to three bounded deployments including return to the accepted pilot if needed, and real Mac/iPhone artwork checks. Included allowance only.”**
