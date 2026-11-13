-- Forward migration. Existing invented payloads are encrypted by the migration runner
-- in the same transaction before recording this version. Applied SQL is never edited.
ALTER TABLE restore_snapshots ADD COLUMN encrypted boolean NOT NULL DEFAULT false;
CREATE INDEX snapshots_expiry ON restore_snapshots(account_id,created_ms);
CREATE TABLE recovery_guard (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), blocked boolean NOT NULL DEFAULT true);
INSERT INTO recovery_guard VALUES(true,false);
GRANT SELECT,UPDATE ON recovery_guard TO organiser_app;
