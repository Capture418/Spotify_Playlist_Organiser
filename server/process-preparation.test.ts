import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { prepareProcess } from './process-preparation.ts';
import type { ProcessHost } from './process-preparation.ts';
function fixture() {
  const events = new EventEmitter(), reports: string[] = [], exits: number[] = [];
  let timeout: (() => void) | undefined, cancelled = 0;
  const host: ProcessHost = {
    on: (signal, fn) => { events.on(signal, fn); }, off: (signal, fn) => { events.off(signal, fn); },
    report: status => { reports.push(status); }, exit: code => { exits.push(code); },
    deadline: (fn, ms) => { assert.equal(ms, 10000); timeout = fn; return () => { cancelled++; }; },
  };
  return { host, events, reports, exits, timeout: () => timeout!(), cancelled: () => cancelled };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
test('prepared process reports readiness only after startup and handles repeated signals once', async () => {
  const f = fixture(); let closes = 0;
  const p = prepareProcess(async () => ({ close: async () => { closes++; } }), f.host);
  assert.deepEqual(f.reports, []); await p.started; assert.deepEqual(f.reports, ['ready']);
  f.events.emit('SIGTERM'); f.events.emit('SIGINT'); p.stop(); await tick();
  assert.equal(closes, 1); assert.deepEqual(f.reports, ['ready', 'stopped']); assert.deepEqual(f.exits, [0]);
  assert.equal(f.cancelled(), 1); assert.equal(f.events.listenerCount('SIGTERM'), 0); assert.equal(f.events.listenerCount('SIGINT'), 0);
});
test('startup errors are sanitised and remove handlers without reporting ready', async () => {
  const f = fixture(); const p = prepareProcess(async () => { throw Error('invented secret configuration'); }, f.host);
  await p.started; assert.deepEqual(f.reports, ['startup-failed']); assert.deepEqual(f.exits, [1]);
  assert.equal(f.events.eventNames().length, 0);
});
test('signal during startup disposes the late application without reporting ready', async () => {
  const f = fixture(); let resolve!: (app: {close: () => Promise<void>}) => void, closes = 0;
  const p = prepareProcess(() => new Promise(r => { resolve = r; }), f.host);
  await tick(); f.events.emit('SIGINT'); resolve({close: async () => { closes++; }}); await p.started;
  assert.equal(closes, 1); assert.deepEqual(f.reports, ['stopped']); assert.deepEqual(f.exits, [0]);
});
test('hung startup shutdown deadline exits unsuccessfully and late result still disposes', async () => {
  const f = fixture(); let resolve!: (app: {close: () => Promise<void>}) => void, closes = 0;
  const p = prepareProcess(() => new Promise(r => { resolve = r; }), f.host);
  await tick(); p.stop(); f.timeout(); resolve({close: async () => { closes++; }}); await p.started;
  assert.equal(closes, 1); assert.deepEqual(f.reports, ['shutdown-timeout']); assert.deepEqual(f.exits, [1]);
});
test('failed or hung close never reports clean shutdown or exposes raw errors', async () => {
  for (const hung of [false, true]) {
    const f = fixture(); const p = prepareProcess(async () => ({close: () => hung ? new Promise<void>(() => {}) : Promise.reject(Error('invented private detail'))}), f.host);
    await p.started; p.stop(); await tick(); if (hung) f.timeout();
    assert.deepEqual(f.reports, ['ready', hung ? 'shutdown-timeout' : 'shutdown-failed']); assert.deepEqual(f.exits, [1]);
    assert.equal(f.events.eventNames().length, 0);
  }
});
