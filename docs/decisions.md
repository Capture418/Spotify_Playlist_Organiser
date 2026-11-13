# Public decision summary

This is a sanitised summary of decisions supporting the current source. It deliberately omits private conversation transcripts, account observations and infrastructure identifiers. It does not grant new operational approvals or replace the requirement to record future owner decisions.

| Decision | Approved scope |
| --- | --- |
| D002/D003 | React/TypeScript/Vite, dark library, match-all tags, all-word search, single/bulk editing and temporary invented demo state. |
| D004/D009 | Separately gated read-only feasibility helper; playlist-read-private, playlist-read-collaborative and user-library-read. No write/playback scopes. |
| D011–D018 | Combined playlist/album library; account-isolated PostgreSQL foundation; replace-only restore with preview, confirmation and recoverable snapshot. Synthetic implementation accepted. |
| D019–D022 | Prepared integration/lifecycle with versioned separate-purpose encryption, expiry/revocation, deletion fencing and operator-led recovery. Synthetic implementation accepted; no production activation. |
| D026/D028/D029 | Container/PostgreSQL target, separate journal database, distinct runtime/migration roles and encrypted backup direction; startup preparation. Actual infrastructure identifiers/custody are private. |
| D031–D034 | Bounded artifact/build/disposable database verification; results accepted within documented local limits, not deployed-system acceptance. |
| D035/D036 | Music Library Organiser online-only PWA foundation accepted; no service worker/offline catalogue. |
| D037/D038 | Runtime configuration and strict HTTPS proxy checks accepted after synthetic host verification. |
| D039/D040 | Inactive test-only CI and portable launcher preparation accepted; rehearsal still gated. |
| D041 | Candidate/action/trigger review; reviewed inactive action pins and named-branch scope. |
| D042 | One-time README-only public bootstrap; exception completed, not standing main-push approval. |
| D043 | Use Git and checkpoint existing approved work locally; no automatic push or server activation. |
| D044 | Prepare this sanitised public snapshot while preserving private local history/evidence. No push, CI activation, installation, provisioning, spending or deployment. |
| D045 | Sanitised snapshot accepted; named public branch push and PR #1 authorised and completed. No merge or CI activation. |
| D046 | CI rehearsal readiness preparation approved: local workflow policy, safe cleanup evidence and mocked tests. Pushes, merging, activation, installations, provisioning, spending and deployment remain gated. |

D046 owner approval: “I approve CI rehearsal readiness preparation. Go ahead with the local changes and mocked tests. Keep pushes, merging, CI activation, installations, provisioning, spending and deployment behind separate approval.”

All implementation remains bounded by the [constitution](../.ai/constitution.md). Future approvals must state exact scope and preserve the distinction between source preparation, installation/resource use, credentials, public push, workflow activation and deployment. No approval is inferred from silence or a successful test.


## D047 — readiness acceptance and bounded CI rehearsal

Owner accepts D046 and approves the two-run CI rehearsal: branch push/PR, temporary activation, runner installations and synthetic containers/databases. Included allowance only; no merging or deployment. Scope is one baseline attempt and, only after success with verified cleanup, one controlled cancellation attempt, with observation and rehearsal-PR closure per the accepted checklist. No automatic retries, real data/application credentials, Mac/server installations, paid spending or service provisioning.


D047 outcome: two attempts only; baseline passed, second cancelled after scenario completion with verified cleanup. Interrupted-operation recovery remains unverified. Rehearsal PR closed and temporary workflow retired; any additional attempt needs a new bounded approval. No merge/deployment authorised or performed.


## D048 — local cancellation timing preparation

Owner instruction: “Go ahead with the local preparation change to make cancellation timing reliable, with mocked tests.” Approves a bounded test-only hold with mocked cancellation/timeout/cleanup checks and updated inactive workflow proposal. No further CI attempt, push, activation, installation, resource creation, spending, merge or deployment is inferred. D047 results and limits remain unchanged.


## D049 — D048 acceptance and one cancellation-only rehearsal

Owner accepts D048 and explicitly approves one cancellation-only CI rehearsal, including push/PR, temporary activation, runner installations and synthetic resources. Included allowance only; no extra retries, merging or deployment. Covers the reviewed120-second hold, observation/cancel, cleanup evidence, PR closure and workflow retirement. No real data/application credentials or local/server installations.


D049 result: one attempt cancelled during the unfinished live-resource hold; independent cleanup verified empty inventory. No graceful-handler execution claim. PR #3 closed; temporary activation retired. Further runs, permanent CI activation, merge and deployment require separate approval.


## D050 — D049 acceptance and normal PR CI preparation

Owner instruction: “I accept D049. Go ahead with local preparation for normal PR CI and mocked tests. Keep pushes, CI activation, installations, provisioning, spending, merging and deployment behind separate approval.” Accepts the recorded cancellation/cleanup evidence and its limits. Approves local preparation only; proposed normal trigger/resource/required-check defaults await review, not operational activation.
