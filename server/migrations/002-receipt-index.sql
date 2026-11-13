CREATE INDEX receipts_expiry ON mutation_receipts(expires_ms);
CREATE INDEX sessions_account ON sessions(account_id);
CREATE INDEX metadata_expiry ON metadata_cache(expires_ms);
