import { homeDatabaseConfig, platformDatabaseConfig } from './home-config.ts';

function invalid(name: string): never { throw Error(`Missing or invalid setting: ${name}`); }
function setting(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value || value.length > 4096 || (/['\\]/u.test(value) || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))) invalid(name);
  return value;
}
export function homeProcessConfig(env: NodeJS.ProcessEnv) {
  if (setting(env, 'NODE_ENV') !== 'production') invalid('NODE_ENV');
  const port = setting(env, 'PORT');
  if (!/^[1-9][0-9]{0,4}$/.test(port) || Number(port) > 65535) invalid('PORT');
  return { port: Number(port) };
}
function keyRing(env: NodeJS.ProcessEnv, purpose: string) {
  const name = `ORGANISER_${purpose}_KEYS`, currentName = `ORGANISER_${purpose}_CURRENT`;
  const entries = setting(env, name).split(',');
  const keys = new Map<string, Buffer>();
  for (const entry of entries) {
    const match = /^([a-zA-Z0-9_-]{1,32}):([a-fA-F0-9]{64})$/.exec(entry);
    if (!match || keys.has(match[1]!)) invalid(name);
    keys.set(match[1]!, Buffer.from(match[2]!, 'hex'));
  }
  const current = setting(env, currentName);
  if (!keys.has(current)) invalid(currentName);
  return { keys, current };
}
/** Pure validation only: no pools, transport, key generation or bootstrap. */
export function productionConfig(env: NodeJS.ProcessEnv) { const config = validateConfig(env, false); return { ...config, journal: config.journal! }; }
export function platformProductionConfig(env: NodeJS.ProcessEnv) { return validateConfig(env, true); }
function validateConfig(env: NodeJS.ProcessEnv, platform: boolean) {
  for (const name of ['ORGANISER_SYNTHETIC', 'ORGANISER_DATABASE', 'ORGANISER_KEY']) {
    if (env[name] !== undefined) invalid(name);
  }
  const processConfig = homeProcessConfig(env);
  const databases = platform ? { runtime: platformDatabaseConfig(env) } : homeDatabaseConfig(env);
  const origin = setting(env, 'ORGANISER_ORIGIN');
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) invalid('ORGANISER_ORIGIN');
  } catch { invalid('ORGANISER_ORIGIN'); }
  const callback = setting(env, 'ORGANISER_CALLBACK');
  if (callback !== origin + '/callback') invalid('ORGANISER_CALLBACK');
  const account = setting(env, 'ORGANISER_ACCOUNT');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(account)) invalid('ORGANISER_ACCOUNT');
  const binding = setting(env, 'ORGANISER_OWNER');
  if (binding.length > 256 || /\s/u.test(binding)) invalid('ORGANISER_OWNER');
  const clientId = setting(env, 'SPOTIFY_CLIENT_ID');
  if (!/^[a-zA-Z0-9]{32}$/.test(clientId)) invalid('SPOTIFY_CLIENT_ID');
  const credentials = keyRing(env, 'CREDENTIAL'), snapshots = keyRing(env, 'SNAPSHOT'), journal = platform ? undefined : keyRing(env, 'JOURNAL');
  if (platform) for (const name of ['ORGANISER_JOURNAL_KEYS', 'ORGANISER_JOURNAL_CURRENT']) if (env[name] !== undefined) invalid(name);
  // Never reuse encryption material between purposes, including retained versions.
  const seen = new Set<string>();
  for (const [name, ring] of [['CREDENTIAL', credentials], ['SNAPSHOT', snapshots], ['JOURNAL', journal]] as const) {
    for (const key of ring?.keys.values() ?? []) {
      const hex = key.toString('hex');
      if (seen.has(hex)) invalid(`ORGANISER_${name}_KEYS`);
      seen.add(hex);
    }
  }
  return { ...processConfig, databases, origin, callback, owner: { account, binding }, clientId, credentials, snapshots, journal };
}
