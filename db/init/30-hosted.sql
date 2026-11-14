-- Disposable local fixtures only. Never run on the home server.
CREATE ROLE music_migrator LOGIN PASSWORD 'invented-local-migrator-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE music_app LOGIN PASSWORD 'invented-local-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE music_journal_migrator LOGIN PASSWORD 'invented-local-journal-migrator-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE music_journal_app LOGIN PASSWORD 'invented-local-journal-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE music OWNER music_migrator;
CREATE DATABASE music_journal OWNER music_journal_migrator;
REVOKE ALL ON DATABASE music FROM PUBLIC;
REVOKE ALL ON DATABASE music_journal FROM PUBLIC;
GRANT CONNECT ON DATABASE music TO music_app;
GRANT CONNECT ON DATABASE music_journal TO music_journal_app;
\connect music
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO music_app;
ALTER DEFAULT PRIVILEGES FOR ROLE music_migrator IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO music_app;
ALTER DEFAULT PRIVILEGES FOR ROLE music_migrator IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO music_app;
\connect music_journal
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO music_journal_app;
ALTER DEFAULT PRIVILEGES FOR ROLE music_journal_migrator IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO music_journal_app;
