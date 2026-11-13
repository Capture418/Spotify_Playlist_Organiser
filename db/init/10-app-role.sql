-- Disposable local Compose only. Public invented passwords, never apply to a real server.
-- Preserves existing migration checksums: organiser_app is a NOLOGIN grant group.
CREATE ROLE organiser_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE music_migrator LOGIN PASSWORD 'invented-local-migrator-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE music_app LOGIN PASSWORD 'invented-local-app-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION IN ROLE organiser_app;
CREATE DATABASE music OWNER music_migrator;
REVOKE ALL ON DATABASE music FROM PUBLIC;
GRANT CONNECT ON DATABASE music TO music_app;
\connect music
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

\connect postgres
CREATE ROLE music_journal_migrator LOGIN PASSWORD 'invented-local-journal-migrator-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE music_journal_app LOGIN PASSWORD 'invented-local-journal-app-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE DATABASE music_journal OWNER music_journal_migrator;
REVOKE ALL ON DATABASE music_journal FROM PUBLIC;
GRANT CONNECT ON DATABASE music_journal TO music_journal_app;
\connect music_journal
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- Journal schema/adapter migration follows separately; runtime owns neither database.
