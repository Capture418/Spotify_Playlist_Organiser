import { hkdfSync } from 'node:crypto';
import { connection, homeDatabaseConfig } from './home-config.ts';
import { platformProductionConfig } from './runtime-config.ts';

/** Host-owned URLs are parsed independently; the runtime never needs owner credentials. */
export function hostedConfig(env: NodeJS.ProcessEnv, local = false) {
  if (env.MIGRATION_DATABASE_URL !== undefined || env.JOURNAL_MIGRATION_DATABASE_URL !== undefined) throw Error('Owner credentials forbidden in app');
  const journal = connection(env, 'JOURNAL_DATABASE_URL', 'music_journal');
  const clean = { ...env }; delete clean.JOURNAL_DATABASE_URL;
  if (local) {
    if (env.NODE_ENV !== 'development' || env.ORGANISER_ORIGIN !== 'http://127.0.0.1:3000' || env.ORGANISER_CALLBACK !== 'http://127.0.0.1:3000/callback' || env.PORT !== '3000') throw Error('Local configuration required');
    clean.NODE_ENV='production'; clean.ORGANISER_ORIGIN='https://local.invalid'; clean.ORGANISER_CALLBACK='https://local.invalid/callback';
  }
  const config = platformProductionConfig(clean);
  if (journal.user === config.databases.runtime.user) throw Error('Distinct runtime roles required');
  if (local) {config.origin=env.ORGANISER_ORIGIN!;config.callback=env.ORGANISER_CALLBACK!;}
  // Independent encryption purpose without new secrets; master versions remain in existing custody.
  const journalKeys = new Map([...config.snapshots.keys].map(([version,key]) => [version,Buffer.from(hkdfSync('sha256',key,'music-library-organiser','append-journal-v1',32))]));
  return {...config,journalDatabase:journal,journalKeys,local};
}
export function migrationConfig(env: NodeJS.ProcessEnv) {
  const databases=homeDatabaseConfig(env);
  const clean={...env};delete clean.MIGRATION_DATABASE_URL;delete clean.JOURNAL_MIGRATION_DATABASE_URL;
  return {...hostedConfig(clean,env.NODE_ENV==='development'),databases};
}
