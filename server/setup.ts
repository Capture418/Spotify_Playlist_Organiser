import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './database.ts';
import { OAuthGate } from './security.ts';
import { Fault } from './validation.ts';
import type { OwnerConfig } from './integration.ts';
import type { SpotifyTransport } from './spotify.ts';
import type { Journal } from './journal.ts';
const hash = (s: string) => createHash('sha256').update(s).digest();
export interface SetupStore { available(): Promise<void>; complete(): Promise<void> }
/** Existing owner and retained deletion records form a durable, global one-time latch. */
export function setupStore(pool: Pool, owner: OwnerConfig, journal: Journal): SetupStore {
  async function available() {
    const r = await pool.query('SELECT blocked FROM recovery_guard');
    if (r.rows.length !== 1 || r.rows[0].blocked !== false) throw new Fault(503, 'Setup unavailable');
    if ((await journal.read()).length) throw new Fault(409, 'Setup closed');
    const q = await pool.query('SELECT (SELECT count(*) FROM accounts)+(SELECT count(*) FROM deletion_records) AS n');
    if (Number(q.rows[0].n) !== 0) throw new Fault(409, 'Setup closed');
  }
  return { available, complete: async () => {
    await available();
    await transaction(pool, async c => {
      await c.query('SELECT pg_advisory_xact_lock(47174175)');
      const guard = await c.query('SELECT blocked FROM recovery_guard FOR UPDATE');
      if (guard.rows[0]?.blocked !== false) throw new Fault(503, 'Setup unavailable');
      const prior = await c.query('SELECT (SELECT count(*) FROM accounts)+(SELECT count(*) FROM deletion_records) AS n');
      if (Number(prior.rows[0].n) !== 0) throw new Fault(409, 'Setup closed');
      await c.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)', [owner.account, owner.binding, randomUUID()]);
    });
  } };
}
type Session = { csrf: string; expires: number; verified: boolean; busy: boolean };
export class Setup {
  private sessions = new Map<string, Session>();
  private gate: OAuthGate;
  private tokenHash: Buffer;
  private attempts = 0;
  private windowUntil = 0;
  private lockedUntil = 0;
  private stopped = false;
  private spotify: SpotifyTransport; private store: SetupStore; private now: () => number;
  constructor(token: string, owner: OwnerConfig, spotify: SpotifyTransport, store: SetupStore, now = Date.now) {
    this.spotify = spotify; this.store = store; this.now = now;
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw Error('Invalid setup configuration');
    this.tokenHash = hash(token); this.gate = new OAuthGate(owner.binding, spotify.callback, now);
  }
  private session(id: string) {
    const s = this.sessions.get(hash(id).toString('hex'));
    if (this.stopped || !s || s.expires <= this.now()) throw new Fault(403, 'Setup session required');
    return s;
  }
  async unlock(token: string) {
    if (this.stopped) throw new Fault(403, 'Setup closed');
    if (this.now() < this.lockedUntil) throw new Fault(429, 'Try later');
    if (this.now() >= this.windowUntil) { this.attempts = 0; this.windowUntil = this.now() + 60000; }
    if (++this.attempts > 5) { this.lockedUntil = this.now() + 15 * 60000; throw new Fault(429, 'Try later'); }
    if (!timingSafeEqual(hash(token), this.tokenHash)) throw new Fault(403, 'Setup access rejected');
    await this.store.available();
    for (const [key, s] of this.sessions) if (s.expires <= this.now()) this.sessions.delete(key);
    if (this.sessions.size >= 20) throw new Fault(429, 'Try later');
    const id = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    this.sessions.set(hash(id).toString('hex'), { csrf, expires: this.now() + 300000, verified: false, busy: false });
    return id;
  }
  async view(id: string) { const s = this.session(id); await this.store.available(); return {csrf: s.csrf, verified: s.verified}; }
  private async write(id: string, csrf: string) {
    const s = this.session(id);
    if (!timingSafeEqual(hash(csrf), hash(s.csrf)) || s.busy) throw new Fault(403, 'Setup request rejected');
    await this.store.available(); return s;
  }
  async begin(id: string, csrf: string) {
    const s = await this.write(id, csrf); s.verified = false;
    const flow = this.gate.begin(hash(id).toString('hex'));
    const url = new URL('https://accounts.spotify.com/authorize');
    url.search = new URLSearchParams({client_id: this.spotify.clientId, response_type: 'code', redirect_uri: flow.callback, scope: flow.scopes.join(' '), state: flow.state, code_challenge_method: 'S256', code_challenge: flow.challenge}).toString();
    return url.href;
  }
  cancel(id: string) { this.gate.pending.delete(hash(id).toString('hex')); const s = this.sessions.get(hash(id).toString('hex')); if (s) s.verified = false; }
  async callback(id: string, state: string, code: string) {
    const s = this.session(id); if (s.busy) throw new Fault(403, 'Setup request rejected');
    s.verified = false; s.busy = true;
    try {
      await this.store.available();
      await this.gate.finish(hash(id).toString('hex'), state, code, async (value, verifier, callback) => {
        const signal = AbortSignal.timeout(10000);
        const grant = await this.spotify.exchange(value, verifier, callback, signal);
        return {...grant, binding: await this.spotify.identity(grant.accessToken, signal)};
      });
      this.session(id); await this.store.available(); s.verified = true;
    } finally { s.busy = false; }
  }
  async confirm(id: string, csrf: string, confirmed: boolean) {
    const s = await this.write(id, csrf);
    if (!confirmed || !s.verified) throw new Fault(403, 'Verified confirmation required');
    s.verified = false; s.busy = true;
    try { await this.store.complete(); this.close(); } finally { s.busy = false; }
  }
  close() { this.stopped = true; this.sessions.clear(); this.gate.pending.clear(); this.tokenHash.fill(0); }
}
