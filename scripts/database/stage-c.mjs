// D033 invented-data harness. Mounted separately; never copied into the runtime image.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { migrate, verifySchema } from '../runtime/server/database.js';
import { migrateJournal, verifyJournalSchema } from '../runtime/server/journal-migration.js';
import { PostgresJournal } from '../runtime/server/postgres-journal.js';
import { JsonCipher } from '../runtime/server/lifecycle.js';
import { DeletionCoordinator, reconcileRecovery, approveRecovery } from '../runtime/server/journal.js';
import { startPreparedHome } from '../runtime/server/startup.js';
import { appServer } from '../runtime/server/http.js';
import { Store } from '../runtime/server/store.js';
import { digest } from '../runtime/server/validation.js';

assert.equal(process.env.STAGE_C_DISPOSABLE, 'spotify-organiser-verify');
assert.equal(process.arch, 'x64');
assert.equal(process.getuid(), 1000);
const mode = process.argv[2];
const identities = {
  app: ['music_app', 'invented-local-app-only', 'music'],
  migration: ['music_migrator', 'invented-local-migrator-only', 'music'],
  journal: ['music_journal_app', 'invented-local-journal-app-only', 'music_journal'],
  journalMigration: ['music_journal_migrator', 'invented-local-journal-migrator-only', 'music_journal'],
};
const pools = [];
function pool(config) {
  const p = new Pool({ ...config, max: 4, connectionTimeoutMillis: 1500, statement_timeout: 2000, idle_in_transaction_session_timeout: 3000 });
  p.on('error', () => {}); // Expected injected outages; never log connection details.
  pools.push(p); return p;
}
function connect(name, database) {
  const [user, password, db] = identities[name];
  return pool({ host: 'db', port: 5432, user, password, database: database ?? db, ssl: false });
}
const app = connect('app'), owner = connect('migration'), jp = connect('journal'), jo = connect('journalMigration');
const snapshots = new JsonCipher(new Map([['invented-s1', Buffer.alloc(32, 17)]]), 'invented-s1', 'snapshot');
const cipher = new JsonCipher(new Map([['invented-j1', Buffer.alloc(32, 29)]]), 'invented-j1', 'journal');
const journal = new PostgresJournal(jp, cipher);
const env = { NODE_ENV: 'production', PORT: '3000' };
for (const [name, setting] of [['app', 'DATABASE_URL'], ['migration', 'MIGRATION_DATABASE_URL'], ['journal', 'JOURNAL_DATABASE_URL'], ['journalMigration', 'JOURNAL_MIGRATION_DATABASE_URL']]) {
  const [user, password, db] = identities[name]; env[setting] = `postgres://${user}:${password}@db:5432/${db}`;
}
async function identity(p, name) {
  const row = (await p.query("SELECT current_database() AS db,current_user AS role,current_setting('server_version_num') AS version")).rows[0];
  assert.equal(row.db, identities[name][2]); assert.equal(row.role, identities[name][0]);
  assert.equal(Math.floor(Number(row.version) / 10000), 16);
}
async function guard() { await Promise.all([[app, 'app'], [owner, 'migration'], [jp, 'journal'], [jo, 'journalMigration']].map(([p, n]) => identity(p, n))); }
async function scenario(name, action) { await test(name, async () => { await guard(); await action(); }); }
async function bootstrap() { await jo.query('INSERT INTO deletion_journal(singleton,payload) VALUES(true,$1)', [cipher.encrypt([], 'deletions')]); }
async function seed(id = randomUUID()) {
  await app.query('INSERT INTO accounts(id,binding,generation) VALUES($1,$2,$3)', [id, 'invented-' + id, randomUUID()]); return id;
}
async function blocked() { return (await app.query('SELECT blocked FROM recovery_guard')).rows[0].blocked; }
async function recover(expected) {
  expected ??= digest(await journal.read());
  const r = await reconcileRecovery(app, journal, expected, true);
  assert.equal(await blocked(), true);
  await approveRecovery(app, journal, r.receipt, true);
}
async function assertStartupReject(pattern, overrides = {}, timeout) {
  let composed = false; const created = [];
  await assert.rejects(startPreparedHome(env, { snapshots, journal: cipher }, {
    pool: config => { const p = pool(config); created.push(p); return p; },
    compose: async () => { composed = true; throw Error('must not compose'); }, ...overrides,
  }, timeout), pattern);
  assert.equal(composed, false);
  assert.ok(created.every(p => p.ended));
}
async function runTests() {
  await scenario('PG16 identities, non-superuser owners and cross-database isolation', async () => {
    for (const p of [owner, jo, app, jp]) {
      const r = (await p.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];
      assert.deepEqual(r, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
    }
    for (const n of Object.keys(identities)) {
      const other = connect(n, identities[n][2] === 'music' ? 'music_journal' : 'music');
      await assert.rejects(other.query('SELECT 1'), { code: '42501' });
    }
  });
  await scenario('actual app and journal migration failures roll back all migration work', async () => {
    await owner.query('CREATE TABLE accounts(sentinel integer)');
    await assert.rejects(migrate(owner, 3, snapshots));
    assert.equal((await owner.query("SELECT to_regclass('schema_migrations') AS name")).rows[0].name, null);
    await owner.query('DROP TABLE accounts');
    await jo.query('CREATE TABLE deletion_journal(sentinel integer)');
    await assert.rejects(migrateJournal(jo));
    assert.equal((await jo.query("SELECT to_regclass('journal_schema_migrations') AS name")).rows[0].name, null);
    await jo.query('DROP TABLE deletion_journal');
    await migrate(owner, 3, snapshots); await migrateJournal(jo);
  });
  await scenario('migration replay, checksum/future rejection and no downgrade', async () => {
    const before = (await owner.query('SELECT * FROM schema_migrations ORDER BY version')).rows;
    await migrate(owner, 3, snapshots); await migrateJournal(jo);
    assert.deepEqual((await owner.query('SELECT * FROM schema_migrations ORDER BY version')).rows, before);
    await assert.rejects(migrate(owner, 2, snapshots), /Incompatible/);
    for (const [p, table, fn, verify] of [[owner, 'schema_migrations', () => migrate(owner, 3, snapshots), () => verifySchema(app)], [jo, 'journal_schema_migrations', () => migrateJournal(jo), () => verifyJournalSchema(jp)]]) {
      const old = (await p.query(`SELECT checksum FROM ${table} WHERE version=1`)).rows[0].checksum;
      await p.query(`UPDATE ${table} SET checksum='injected' WHERE version=1`);
      await assert.rejects(fn()); await assert.rejects(verify());
      await p.query(`UPDATE ${table} SET checksum=$1 WHERE version=1`, [old]);
      await p.query(`INSERT INTO ${table}(version,checksum) VALUES(99,'invented-future')`);
      await assert.rejects(fn()); await assert.rejects(verify());
      await p.query(`DELETE FROM ${table} WHERE version=99`);
    }
    await verifySchema(app); await verifyJournalSchema(jp);
  });
  await scenario('missing journal blocks actual startup without silent repair; bootstrap is explicit', async () => {
    await assertStartupReject(/journal verification/);
    assert.equal((await jo.query('SELECT * FROM deletion_journal')).rowCount, 0);
    await bootstrap(); assert.deepEqual(await journal.read(), []);
  });
  await scenario('runtime CRUD works but DDL, ownership, role escalation and journal INSERT/DELETE fail', async () => {
    for (const [p, table, role] of [[app, 'accounts', 'music_migrator'], [jp, 'deletion_journal', 'music_journal_migrator']]) {
      for (const sql of ['CREATE TABLE forbidden(id integer)', 'CREATE SCHEMA forbidden', `DROP TABLE ${table}`, `ALTER TABLE ${table} ADD COLUMN forbidden integer`, `SET ROLE ${role}`]) await assert.rejects(p.query(sql), { code: '42501' });
    }
    await assert.rejects(jp.query('DELETE FROM deletion_journal'), { code: '42501' });
    await assert.rejects(jp.query("INSERT INTO deletion_journal(payload) VALUES('{}')"), { code: '42501' });
    const id = await seed();
    await app.query('UPDATE accounts SET revision=1 WHERE id=$1', [id]);
    assert.equal(Number((await app.query('SELECT revision FROM accounts WHERE id=$1', [id])).rows[0].revision), 1);
    await app.query('DELETE FROM accounts WHERE id=$1', [id]);
  });
  await scenario('independent connections serialize journal updates; committed-response loss is retryable', async () => {
    const other = new PostgresJournal(connect('journal'), cipher);
    const records = Array.from({ length: 24 }, () => ({ account: randomUUID(), operation: randomUUID(), deletedAt: 1000, state: 'intent' }));
    await Promise.all(records.map((r, i) => (i % 2 ? other : journal).put(r)));
    assert.equal((await journal.read()).length, 24);
    const r = records[0];
    await assert.rejects((async () => { await other.put({ ...r, state: 'complete' }); throw Error('lost response'); })());
    await journal.put(r); assert.equal((await journal.read()).find(x => x.operation === r.operation).state, 'complete');
    await assert.rejects(other.put({ ...r, account: randomUUID() }), /identity mismatch/);
    assert.equal((await journal.read()).length, 24);
  });
  await scenario('journal row locking actually blocks a second connection until commit', async () => {
    const client = await jo.connect(); await client.query('BEGIN');
    try {
      await client.query('SELECT * FROM deletion_journal FOR UPDATE');
      let finished = false;
      const pending = journal.put({ account: randomUUID(), operation: randomUUID(), deletedAt: 1001, state: 'intent' }).then(() => { finished = true; });
      await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(finished, false);
      await client.query('COMMIT'); await pending; assert.equal(finished, true);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
  await scenario('wrong keys, corrupted/missing rows and write denial fail closed', async () => {
    const saved = (await jo.query('SELECT payload FROM deletion_journal')).rows[0].payload;
    const wrong = new JsonCipher(new Map([['invented-j1', Buffer.alloc(32, 99)]]), 'invented-j1', 'journal');
    await assert.rejects(new PostgresJournal(jp, wrong).read());
    await jo.query("UPDATE deletion_journal SET payload='{}'"); await assert.rejects(journal.read());
    await assertStartupReject(/journal verification/);
    await jo.query('DELETE FROM deletion_journal'); await assert.rejects(journal.read());
    await assertStartupReject(/journal verification/);
    await jo.query('INSERT INTO deletion_journal(payload) VALUES($1)', [saved]);
    await jo.query('REVOKE UPDATE ON deletion_journal FROM music_journal_app');
    try { await assert.rejects(journal.put({ account: randomUUID(), operation: randomUUID(), deletedAt: 1002, state: 'intent' }), { code: '42501' }); }
    finally { await jo.query('GRANT UPDATE ON deletion_journal TO music_journal_app'); }
    assert.deepEqual((await jo.query('SELECT payload FROM deletion_journal')).rows[0].payload, saved);
  });
  await scenario('actual deletion failures preserve intent and fence access; retries do not reopen guard', async () => {
    const id = await seed();
    await owner.query("CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER reject_delete BEFORE DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION reject_delete()");
    const coordinator = new DeletionCoordinator(app, journal);
    try { await assert.rejects(coordinator.erase(id, true)); }
    finally { await owner.query('DROP TRIGGER reject_delete ON accounts; DROP FUNCTION reject_delete()'); }
    assert.equal(await blocked(), true);
    const intent = (await journal.read()).find(r => r.account === id); assert.equal(intent.state, 'intent');
    assert.equal((await app.query('SELECT status FROM accounts WHERE id=$1', [id])).rows[0].status, 'suspended');
    assert.equal((await coordinator.erase(id, true)).reconciled, false);
    assert.equal((await journal.read()).find(r => r.account === id).operation, intent.operation);
    await assertStartupReject(/recovery guard/); await recover();
  });
  await scenario('intent/write and completion interruptions erase accessible data and require recovery', async () => {
    for (const failState of ['intent', 'complete']) {
      const id = await seed();
      const broken = { read: () => journal.read(), put: async r => { if (r.state === failState) throw Error('injected'); await journal.put(r); } };
      assert.equal((await new DeletionCoordinator(app, broken).erase(id, true)).reconciled, false);
      assert.equal((await app.query('SELECT * FROM accounts WHERE id=$1', [id])).rowCount, 0); assert.equal(await blocked(), true);
      if (failState === 'intent') await journal.put({ account: id, operation: randomUUID(), deletedAt: 1003, state: 'intent' });
      else assert.equal((await journal.read()).find(r => r.account === id).state, 'intent');
      await recover();
    }
  });
  await scenario('key version compatibility requires retained keys; snapshot identity binding is preserved', async () => {
    const rotated = new JsonCipher(new Map([...cipher.keys, ['invented-j2', Buffer.alloc(32, 31)]]), 'invented-j2', 'journal');
    const saved = (await jo.query('SELECT payload FROM deletion_journal')).rows[0].payload;
    assert.deepEqual(rotated.decrypt(saved, 'deletions'), await journal.read());
    const next = rotated.encrypt(await journal.read(), 'deletions');
    assert.throws(() => cipher.decrypt(next, 'deletions'));
    assert.deepEqual(rotated.decrypt(next, 'deletions'), await journal.read());
    const envelope = snapshots.encrypt({ invented: true }, 'snapshot-context');
    assert.throws(() => snapshots.decrypt(envelope, 'other-context'));
  });
  await scenario('real startup timeout waits for bounded SQL and closes every pool without listening', async () => {
    const lock = await owner.connect(); await lock.query('BEGIN'); await lock.query('SELECT pg_advisory_xact_lock(47174174)');
    const start = Date.now();
    try { await assertStartupReject(/application migration/, {}, 1000); }
    finally { await lock.query('ROLLBACK'); lock.release(); }
    assert.ok(Date.now() - start < 5000);
    await verifySchema(app); await verifyJournalSchema(jp);
  });
  await scenario('successful startup closes migration pools before composing and listening', async () => {
    const created = []; let composed = false, listened = false;
    const start = Date.now();
    const running = await startPreparedHome(env, { snapshots, journal: cipher }, {
      pool: config => { const p = pool(config); created.push(p); return p; },
      compose: async () => {
        assert.ok(created[1].ended && created[3].ended); composed = true;
        return { listen: async () => { listened = true; }, close: async () => {} };
      },
    });
    assert.ok(composed && listened); await running.close(); assert.ok(created.every(p => p.ended));
    console.log('synthetic startup milliseconds', Date.now() - start);
  });
}
const restoreOwner = '11111111-1111-4111-8111-111111111111';
async function fixture() {
  await guard(); await seed(restoreOwner);
  await app.query('INSERT INTO sessions VALUES($1,$2,$3,$4,$4,$5)', ['invented-session', restoreOwner, 'invented-csrf', Date.now(), Date.now() + 60000]);
  await app.query('INSERT INTO connections VALUES($1,$2,1)', [restoreOwner, { invented: true }]);
  const tag = '22222222-2222-4222-8222-222222222222';
  await app.query('INSERT INTO tags VALUES($1,$2,$3,$4)', [restoreOwner, tag, 'Invented evening', 'invented evening']);
  for (const kind of ['playlist', 'album']) {
    await app.query('INSERT INTO items VALUES($1,$2,$3,true)', [restoreOwner, kind, 'invented-item']);
    await app.query('INSERT INTO assignments VALUES($1,$2,$3,$4)', [restoreOwner, kind, 'invented-item', tag]);
    await app.query('INSERT INTO metadata_cache VALUES($1,$2,$3,$4,$5)', [restoreOwner, kind, 'invented-item', { title: 'Invented ' + kind }, Date.now() + 60000]);
  }
  const snapshotId = randomUUID(), payload = { tags: ['Invented evening'] };
  await app.query('INSERT INTO restore_snapshots VALUES($1,$2,$3,$4,0,$5,true)', [restoreOwner, snapshotId, snapshots.encrypt(payload, `${restoreOwner}/${snapshotId}/0`), digest(payload), Date.now()]);
  const row = (await app.query('SELECT * FROM restore_snapshots WHERE id=$1', [snapshotId])).rows[0];
  assert.deepEqual(snapshots.decrypt(row.payload, `${restoreOwner}/${snapshotId}/0`), payload);
  console.log('PASS invented playlist/album/shared-tag/session/encrypted-snapshot restore fixture created');
}
async function deleteFixture() {
  await guard(); assert.equal((await new DeletionCoordinator(app, journal).erase(restoreOwner, true)).reconciled, true);
  console.log('INVENTORY', digest(await journal.read()));
}
async function reconcileFixture() {
  await guard();
  assert.equal((await app.query('SELECT * FROM accounts WHERE id=$1', [restoreOwner])).rowCount, 1);
  await assert.rejects(approveRecovery(app, journal, digest(await journal.read()), true));
  await recover(process.argv[3]);
  for (const table of ['accounts', 'sessions', 'connections', 'items', 'tags', 'assignments', 'metadata_cache', 'restore_snapshots']) assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
  console.log('PASS app-only restore reapplied deletion, cleared restored credentials, required fresh operator receipt');
}
async function staleFixture() {
  await guard();
  await assert.rejects(reconcileRecovery(app, journal, process.argv[3], true), /inventory mismatch/);
  assert.equal(await blocked(), true); await assertStartupReject(/recovery guard/);
  await jo.query('DELETE FROM deletion_journal');
  await assert.rejects(reconcileRecovery(app, journal, process.argv[3], true));
  assert.equal(await blocked(), true); await assertStartupReject(/journal verification/);
  console.log('PASS stale/missing journal after total restore keeps access blocked');
}
async function serve() {
  await guard(); const start = Date.now();
  const running = await startPreparedHome(env, { snapshots, journal: cipher }, {
    pool,
    compose: async runtime => {
      const store = new Store(runtime, restoreOwner);
      const server = appServer(store, { origin: 'https://example.invalid', production: true });
      return {
        listen: async (port, host, signal) => { signal.throwIfAborted(); server.listen(port, host); await once(server, 'listening'); if (signal.aborted) { server.close(); throw Error('cancelled'); } },
        close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
      };
    },
  });
  const mounts = readFileSync('/proc/mounts', 'utf8'); assert.match(mounts, / \/ overlay ro,/); assert.match(mounts, / \/tmp tmpfs .*size=65536k/);
  assert.equal(readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim(), '536870912');
  console.log('READY synthetic-only; startup milliseconds', Date.now() - start);
  let stopping = false;
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => {
    if (stopping) return; stopping = true; await running.close(); await closePools(); console.log('STOPPED cleanly'); process.exit(0);
  });
}
async function closePools() { await Promise.all(pools.filter(p => !p.ended).map(p => p.end())); }
try {
  if (mode === 'tests') await runTests();
  else if (mode === 'fixture') await fixture();
  else if (mode === 'delete') await deleteFixture();
  else if (mode === 'reconcile') await reconcileFixture();
  else if (mode === 'stale') await staleFixture();
  else if (mode === 'serve') await serve();
  else throw Error('Unknown synthetic test mode');
} finally { if (mode !== 'serve') await closePools(); }
