-- Apply using the journal migration owner, never the application runtime role.
-- Separate database and migration history from music. No automatic empty journal.
CREATE TABLE deletion_journal (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
REVOKE ALL ON deletion_journal FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO music_journal_app;
GRANT SELECT, UPDATE ON deletion_journal TO music_journal_app;
-- Operator-only first-use bootstrap must insert the encrypted empty payload explicitly.
-- Missing row after startup/restore is an error, never implicit initialisation.
