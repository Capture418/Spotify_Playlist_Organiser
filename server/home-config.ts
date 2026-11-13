import type { PoolConfig } from 'pg';

const names = ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'JOURNAL_DATABASE_URL', 'JOURNAL_MIGRATION_DATABASE_URL'] as const;
type Setting = typeof names[number];
function invalid(name: Setting): never { throw new Error(`Missing or invalid setting: ${name}`); }

/** Private Docker-network contract only; never forwards libpq URL options or logs values. */
function connection(env: NodeJS.ProcessEnv, name: Setting, expectedDatabase: string): PoolConfig {
  const value = env[name];
  if (!value || value.length > 4096 || (/['\\]/u.test(value) || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))) return invalid(name);
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.search || url.hash) return invalid(name);
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!user || !password || database !== expectedDatabase || [...user + password].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return invalid(name);
    const port = url.port ? Number(url.port) : 5432;
    if (!Number.isInteger(port) || port < 1 || port > 65535) return invalid(name);
    return { host: url.hostname, port, user, password, database, ssl: false };
  } catch { return invalid(name); }
}

/** Preparation only: creates no pools or connections and is not wired into production yet. */
export function homeDatabaseConfig(env: NodeJS.ProcessEnv) {
  const runtime = connection(env, names[0], 'music');
  const migration = connection(env, names[1], 'music');
  const journal = connection(env, names[2], 'music_journal');
  const journalMigration = connection(env, names[3], 'music_journal');
  for (const [entry, name] of [[migration, names[1]], [journal, names[2]], [journalMigration, names[3]]] as const) {
    if (entry.host !== runtime.host || entry.port !== runtime.port) invalid(name);
  }
  const users = new Set([runtime.user, migration.user, journal.user, journalMigration.user]);
  if (users.size !== 4) throw new Error('Database runtime and migration roles must be distinct');
  return { runtime, migration, journal, journalMigration };
}
