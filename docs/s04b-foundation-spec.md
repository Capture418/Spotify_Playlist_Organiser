# Foundation specification — public technical summary

The implemented synthetic foundation follows these approved constraints. Personal identity-test observations and account/client details are omitted. Production remains gated; see [architecture](architecture.md) and [work plan](work-plan.md).

## Identity and sessions

Configure an explicit internal account UUID and verified immutable Spotify binding. Never bind by title, display name or email and never create an owner for the first visitor. The separately gated identity helper retains only bounded identity/token material in memory. Missing or mismatched identity must fail closed.

PKCE uses only playlist-read-private, playlist-read-collaborative and user-library-read. OAuth state/verifier are browser-bound, single-use and expire. Production session cookie is __Host-organiser, Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain. Store token hashes rather than raw session tokens, rotate on login, enforce seven-day idle/30-day absolute expiry and renew idle only for authenticated activity. Local synthetic auth has a distinct cookie/entry and cannot be mounted by production flags.

## Data integrity

All organisation data is account-scoped. Item identity includes playlist/album kind; preserve editions and separate user annotations from imported metadata. Parameterised SQL, transactions, revision conflicts and mutation receipts protect edits. Retrying an uncertain write must use the same identity/payload; a conflict requires deliberate reapplication.

Single edits replace one item's tag assignments. Bulk edits add tags only to explicit targets. Refresh stages complete validated pages before marking missing items unavailable; partial failures do not erase organisation. Metadata cache expiry removes stale descriptive fields while preserving authorised typed identities and tags.

Safety limits are explicit: bounded tag strings/arrays, item/assignment counts, bulk targets and restore payload sizes. Reject excess rather than silently truncating. Account switching, expiry and sign-out must clear browser drafts/receipts so an old operation cannot transfer to a new session.

## Restore and lifecycle

Organisation export excludes credentials and Spotify metadata. Restore is replace-only with version/schema/identity validation, a short-lived session-bound preview, explicit confirmation and an encrypted pre-replacement recoverable snapshot in the same transaction. Validate all references/duplicates/limits before modification; never apply an incomplete or invalid restore.

Snapshot, credential and deletion-journal encryption use separate versioned keys with authenticated identity/context. Expiry/deletion/recovery are part of the lifecycle contract, not optional cleanup. See [operational requirements](s04c-operational-plan.md). Key loss must never silently erase current tags or bypass encryption.

## Runtime and migration boundary

Version/checksum migrations, distinct runtime/migration roles and pre-listen verification are required. Application and independent journal databases have separate role pairs. Ordinary startup does not initialise missing journals or clear recovery fences. Schema expansion must leave the previous application release compatible; image rollback is not a database rollback.

Production origin/callback, owner/client identity and all keys/connections require explicit configuration. No implicit connection, credential generation, first-use bootstrap, public fake-login route or production activation in this snapshot. Tests use invented records; genuine account access, hosted recovery and actual-device behaviour require later approval and evidence.
