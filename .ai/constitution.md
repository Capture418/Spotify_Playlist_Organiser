# Project constitution

Version: 0.2 • Established: 12 November 2026 • Updated: 12 November 2026 (D009: owner-requested saved-album scope)

Project: Spotify Playlist Organiser (working name)

This is the canonical working constitution for the requested development foundation. It implements the owner's brief; it does not turn proposed designs into approved decisions. Unresolved choices are recorded in `docs/decisions.md`.

## 1. Purpose and boundaries

Build a private, responsive companion for organising playlists and saved albums on iPhone and Mac. A playlist can have multiple independent tags. The companion helps the owner find a playlist or saved album and opens it in Spotify; Spotify remains the music player.

The first prototype uses invented data. The eventual integration is read-only from Spotify's perspective. Playlist-level tagging, search and a reliable hand-off are the core. Saved-album organisation is also in product scope (D009); its interaction design and additional Spotify permissions require approval before implementation. No track-level tagging, recommendation engine, player, social platform, AI classification, analytics service or public product without an explicit scope decision.

Preserve the useful development practices: inspect before changing, separate authoritative data from derived views, implement small complete slices, validate and leave an accurate handover. Do not copy unrelated architectures or native-app structures.

## 2. Authority and approvals

The owner controls product direction, user experience, architecture approvals, privacy, cost and releases. ChatGPT acts as lead developer: proposes designs, explains trade-offs, implements approved work, reviews it and reports evidence. The owner is not expected to supervise routine coding.

Bring every unresolved product, UX, architecture or security design choice to the owner with a recommendation, the meaningful alternative and its consequences. Routine implementation inside an approved design does not require a fresh design decision.

Explicit approval is required before selecting or changing the stack, persistence or account model; changing interaction semantics or visual direction; adding a service or significant dependency; requesting Spotify permissions; using real private data; choosing token/session storage; publishing or exposing the app; incurring cost; destructive operations or migrations; and merging, pushing or deploying a release. Never interpret silence or approval of a prototype as approval of these separate actions.

Record approvals and their scope in the decision log. A proposed decision stays proposed until approved. If a security issue emerges, pause the affected work, explain impact and options, and continue only unrelated safe work. Do not silently accept the risk.

## 3. One contained project

Use one repository and one application, with no monorepo, extra packages or services unless justified and approved. Keep source, configuration, tests and documentation in this directory. Do not change other projects, system configuration, global tool installations or unrelated files.

Use the canonical file layout in the architecture document. Keep temporary investigation output in ignored `.work/`; generated output, caches, local runtime data and dependencies are not source. Commit only invented fixtures, never personal exports, credentials or production database copies. Git history replaces `final-v2`, `_old`, backup source trees and duplicate constitutions.

Use one package manager, a committed lockfile and a documented supported runtime once approved. Dependencies must have a clear purpose, compatible licence and proportionate security review. Small standard-library solutions are preferred where they are clearer, not merely to avoid dependencies at all costs.

## 4. Development cycle

For every task:

1. **Read and inspect.** Re-read this constitution, architecture, decisions and current work plan; inspect relevant code and Git status.
2. **Define.** Record the goal, scope, acceptance criteria, likely files, tests and decisions needed in the current task. One active task by default.
3. **Resolve choices.** Obtain required design and security approvals before the affected implementation. Present recommendations, not unexplained menus of options.
4. **Implement.** Make the smallest complete change, with tests alongside it. Avoid unrelated refactoring. Use a short-lived task branch once Git is initialised.
5. **Verify and review.** Run applicable checks; inspect the diff for correctness, regressions, unnecessary files, credentials and adherence to this constitution. For risky changes, obtain a second review; identify whether it was independent or a self-review.
6. **Demonstrate and hand over.** Summarise changes, actual test results, known limits and decisions needed. Update the work plan. Request owner acceptance before merge or release.

Use bounded milestones and small reviewable commits. Do not change the meaning of an acceptance criterion to make a test pass. A blocked task remains blocked, not completed. No unrequested background work or unattended deployment.

## 5. Data integrity and ownership

Spotify is authoritative for imported playlist metadata; this app is authoritative for the owner's tags and organisation. Keep them separate. Use stable playlist identities, not names; namespace user-owned data by the signed-in organiser account when accounts are introduced.

Refreshing metadata must not overwrite tags. Incomplete imports, timeouts, rate limits or lost access must never erase organisation data. A playlist missing from a completed refresh may be marked unavailable, not silently deleted. Account switching must not expose another account's local or server-side data.

Changes to persistent schemas require versioning, validation and an approved migration with backup/recovery appropriate to the risk. Before the app holds meaningful real tagging work, provide a tested export/restore path for user-authored organisation data. Do not promise permanent storage of Spotify metadata independently of its applicable rules.

Cross-device conflicts, offline edits and deletion behaviour are design choices to approve, not assumptions to hide in implementation. Do not describe local browser storage as cross-device synchronisation.

## 6. Security and privacy

Use only the minimum approved Spotify read permissions. Never request a Spotify password, add playlist-modification or playback permissions, or introduce tracking as a convenience. Follow the current official API and platform requirements, rechecked at integration time.

Never put secrets or tokens in committed files, screenshots, task logs, exported fixtures or chat. Public client identifiers are not secrets, but client secrets and refresh tokens are. Browser bundles and build-time frontend environment variables are not safe secret storage. OAuth flow, redirect validation, session handling and token storage require explicit security review before live integration.

Do not persist authentication tokens in browser local storage or IndexedDB as an unreviewed shortcut. Separate demo and live modes; keep preview environments free of real credentials and private exports. No third-party scripts, remote fonts, analytics or external data processing without approval.

Treat playlist titles, descriptions, artwork URLs, tags, imported files and API responses as untrusted input. Render text safely, validate navigation destinations, and never execute content supplied by a playlist or imported file. Bound retries and handle revoked access safely.

Any hosted release requires an approved access-control model, HTTPS, appropriate secret handling, dependency review and recovery procedure. An obscure URL is not access control. Enforce authorisation at the data boundary, not just by hiding buttons.

## 7. Quality and definition of done

Keep domain logic separate from rendering, persistence and Spotify calls, but do not build a general-purpose framework. Prefer typed, readable code, small modules and explicit errors. Use British English in interface text and documentation.

Test tag combinations, text search, duplicates, bulk changes, empty states and persistence. When integration exists, test pagination, malformed responses, authentication expiry, rate limits, partial refresh and preservation of tags. When sync exists, test account isolation, concurrent edits and recovery.

An implementation task is complete only when its acceptance criteria are met; relevant lint, type, test and build checks pass; its diff is reviewed; documentation is current; and limitations are stated. Maintain keyboard access, labelled controls, visible focus, readable contrast and usable touch targets.

Automated browser emulation is not a real iPhone or Mac test. The native Spotify hand-off, browser fallback and installed web-app behaviour require actual device verification before release. A design proposal is not a security review; a successful build is not proof of correctness.

## 8. Continuity and amendments

At the start and end of every development task, consult this constitution. Keep only one canonical copy. `AGENTS.md` points here; `docs/decisions.md` holds decisions; `docs/work-plan.md` holds current progress. Record what actually happened, not what an earlier chat assumed.

Amendments require owner approval, a version/date update and a decision-log entry. Do not weaken a rule silently to remove a blocker. Repository instructions guide contributors but do not technically enforce a sandbox, branch protection or deployment restrictions; configure enforcement separately when approved.


Public-copy note: personal project names are generalised in this snapshot. The substantive approval, privacy, security and validation requirements above are unchanged.
