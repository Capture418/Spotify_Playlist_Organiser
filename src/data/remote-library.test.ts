import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, ApiError } from './remote-library.ts';

test('offline writes fail before transport and never enqueue a mutation', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  let calls = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
  globalThis.fetch = async () => { calls++; throw new Error('No transport expected'); };
  try {
    await assert.rejects(request('edit', 'invented-csrf', {}), error => error instanceof ApiError && error.status === 0);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
