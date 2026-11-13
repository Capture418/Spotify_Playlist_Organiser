-- Disposable synthetic rehearsal only. Never apply to the server.
CREATE ROLE music_app LOGIN PASSWORD 'invented-local-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE music OWNER music_app;
REVOKE ALL ON DATABASE music FROM PUBLIC;
