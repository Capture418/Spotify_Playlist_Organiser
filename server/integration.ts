import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, verifySchema } from './database.ts';
import { Store, hashToken } from './store.ts';
import type { Session } from './store.ts';
import { CredentialStore, OAuthGate, seal } from './security.ts';
import { binding, SpotifyTransport } from './spotify.ts';
import { Fault, requireValue, uuid } from './validation.ts';
import { importCollection } from './import.ts';
import { maintenance } from './lifecycle.ts';
import { AtomicDeletion } from './platform-deletion.ts';
import { DeletionCoordinator } from './journal.ts';
import type { Journal } from './journal.ts';
import { appServer } from './http.ts';

export type OwnerConfig = { account: string; binding: string };
/** Operator-only primitive, never mounted as an HTTP route. Caller must verify identity through OAuth first. */
export async function bootstrapOwner(pool: Pool, config: OwnerConfig, verifiedIdentity: string, confirmed: boolean) {
  uuid(config.account); binding(config.binding);
  requireValue(confirmed && verifiedIdentity === config.binding, 'Confirmed owner identity required');
  await transaction(pool, async c => {
    await c.query('SELECT pg_advisory_xact_lock(47174175)');
    if ((await c.query('SELECT 1 FROM deletion_records WHERE binding=$1', [config.binding])).rowCount) throw new Fault(409, 'Deleted binding requires separate operator review');
    const owners = await c.query('SELECT id,binding FROM accounts');
    if (owners.rowCount) {
      requireValue(owners.rowCount === 1 && owners.rows[0].id === config.account && owners.rows[0].binding === config.binding, 'Owner configuration mismatch');
      return;
    }
    await c.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)', [config.account, config.binding, randomUUID()]);
  });
}

export class Integration {
  private readonly store: Store;
  private readonly owner: OwnerConfig;
  private readonly spotify: SpotifyTransport;
  private readonly vault: CredentialStore;
  private readonly gate: OAuthGate;
  private readonly pending = new Map<string, { generation: string; expires: number }>();
  private readonly active = new Set<AbortController>();
  constructor(store: Store, owner: OwnerConfig, spotify: SpotifyTransport, vault: CredentialStore) {
    requireValue(store.owner === uuid(owner.account)); binding(owner.binding);
    requireValue(vault.pool===store.pool,'Credential database mismatch');
    this.store = store; this.owner = {...owner}; this.spotify = spotify; this.vault = vault;
    this.gate = new OAuthGate(owner.binding, spotify.callback);
  }
  async verifyOwner() {
    await this.store.permitted();
    await verifySchema(this.store.pool);
    const q = await this.store.pool.query('SELECT binding,generation FROM accounts WHERE id=$1', [this.owner.account]);
    if (q.rows[0]?.binding !== this.owner.binding) throw new Fault(403, 'Owner configuration mismatch');
    return q.rows[0].generation as string;
  }
  async begin(browser: string) {
    requireValue(/^[a-zA-Z0-9_-]{43}$/.test(browser));
    for (const [id, item] of this.pending) if (item.expires <= Date.now()) this.pending.delete(id);
    const generation = await this.verifyOwner();
    const request = this.gate.begin(browser);
    this.pending.set(browser, { generation, expires: Date.now() + 300000 });
    const url = new URL('https://accounts.spotify.com/authorize');
    url.search = new URLSearchParams({ client_id: this.spotify.clientId, response_type: 'code', redirect_uri: request.callback, scope: request.scopes.join(' '), state: request.state, code_challenge_method: 'S256', code_challenge: request.challenge }).toString();
    return url.href;
  }
  async finish(browser: string, state: string, code: string, oldToken?: string) {
    const pending = this.pending.get(browser); this.pending.delete(browser);
    const controller = new AbortController(); this.active.add(controller);
    try {
      const grant = await this.gate.finish(browser, state, code, async (value, verifier, callback) => {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
        const tokens = await this.spotify.exchange(value, verifier, callback, signal);
        const identity = await this.spotify.identity(tokens.accessToken, signal);
        return { ...tokens, binding: identity };
      });
      if (!pending || pending.expires <= Date.now()) throw new Fault(403, 'Authorisation expired');
      // Credential replacement, reactivation and session rotation commit together under the account lock.
      await this.store.permitted();
      return await transaction(this.store.pool, async c => {
        const q = await c.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE', [this.owner.account]);
        const account = q.rows[0];
        if (!account || account.binding !== this.owner.binding || account.generation !== pending.generation || controller.signal.aborted) throw new Fault(403, 'Account unavailable');
        const old = await c.query('SELECT version FROM connections WHERE account_id=$1', [this.owner.account]);
        const version = (old.rows[0]?.version ?? 0) + 1;
        const encrypted = seal(grant.refreshToken, this.vault.keys.get(this.vault.current)!, this.vault.current, this.owner.account, version);
        await c.query('INSERT INTO connections VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET credential=EXCLUDED.credential,version=EXCLUDED.version', [this.owner.account, encrypted, version]);
        await c.query("UPDATE accounts SET status='active' WHERE id=$1", [this.owner.account]);
        if (oldToken) await c.query('DELETE FROM sessions WHERE account_id=$1 AND token_hash=$2', [this.owner.account, hashToken(oldToken)]);
        const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url'), now = Date.now();
        await c.query('INSERT INTO sessions VALUES($1,$2,$3,$4,$4,$5)', [hashToken(token), this.owner.account, csrf, now, now + 30 * 86400000]);
        return { token, csrf };
      });
    } finally { controller.abort(); this.active.delete(controller); }
  }
  cancelLogin(browser: string) { this.pending.delete(browser); this.gate.pending.delete(browser); }
  cancel() { for (const controller of this.active) controller.abort(); this.pending.clear(); this.gate.pending.clear(); }
  async refresh(session: Session) {
    await this.store.library(session);
    const controller = new AbortController(); this.active.add(controller);
    try {
      const access = await this.vault.refresh(this.owner.account, (token, signal) => this.spotify.refresh(token, AbortSignal.any([signal, controller.signal])));
      for (const kind of ['playlist', 'album'] as const) {
        await importCollection(this.store, session, kind, (offset, signal) => this.spotify.page(kind, offset, access, AbortSignal.any([signal, controller.signal])));
      }
    } finally { controller.abort(); this.active.delete(controller); }
  }
}

/** Prepared factory only. It never listens and the production executable remains blocked. */
export async function preparedApplication(store: Store, owner: OwnerConfig, spotify: SpotifyTransport, vault: CredentialStore, journal?: Journal) {
  requireValue(store.snapshotsCipher,'Snapshot encryption required');
  if (journal) await journal.read();
  const integration = new Integration(store, owner, spotify, vault);
  await integration.verifyOwner();
  store.deletion = journal ? new DeletionCoordinator(store.pool,journal,()=>integration.cancel()) : new AtomicDeletion(store.pool,()=>integration.cancel());
  const sweeper=await maintenance(store.pool,()=>{integration.cancel();void store.pool.query('UPDATE recovery_guard SET blocked=true').catch(()=>server.close());});
  const origin = new URL(spotify.callback).origin;
  const server = appServer(store, { origin, production: true, connectedInterface: true, auth: integration, refresh: s => integration.refresh(s), disconnected: () => integration.cancel() });
  const dispose = () => { sweeper.stop(); integration.cancel(); };
  server.on('close', dispose);
  return { server, integration, dispose };
}

/** Memory-only operator verification. No executable or public route invokes this preparation helper. */
export class BootstrapPreparation {
  private readonly pool: Pool;
  private readonly config: OwnerConfig;
  private readonly spotify: SpotifyTransport;
  private readonly gate: OAuthGate;
  private proofUntil = 0;
  constructor(pool: Pool, config: OwnerConfig, spotify: SpotifyTransport) {
    uuid(config.account); binding(config.binding);
    this.pool=pool; this.config={...config}; this.spotify=spotify;
    this.gate=new OAuthGate(config.binding,spotify.callback);
  }
  begin(browser:string) { this.proofUntil=0; return this.gate.begin(browser); }
  async verify(browser:string,state:string,code:string) {
    this.proofUntil=0;
    await this.gate.finish(browser,state,code,async(value,verifier,callback)=>{
      const signal=AbortSignal.timeout(10000);
      const grant=await this.spotify.exchange(value,verifier,callback,signal);
      return {...grant,binding:await this.spotify.identity(grant.accessToken,signal)};
    });
    this.proofUntil=Date.now()+300000;
    return {verified:true};
  }
  async confirm(confirmed:boolean) {
    requireValue(confirmed&&this.proofUntil>Date.now(),'Fresh verified owner confirmation required');
    this.proofUntil=0;
    await bootstrapOwner(this.pool,this.config,this.config.binding,true);
  }
}
