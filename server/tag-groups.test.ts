import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { Store } from './store.ts';

test('restore validation preserves groups and accepts ungrouped legacy exports', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const store = new Store({} as Pool, id, Date.now, true);
  const tag = { id, name: 'Invented evening' };
  const legacy = {
    format: 'playlist-organiser', version: 1, binding: 'invented', revision: '0',
    tags: [tag], annotations: [{ itemId: 'playlist:invented', tagIds: [id] }],
  };
  assert.deepEqual(store.validateExport(legacy, legacy.binding), legacy);
  const grouped = { ...legacy, tags: [{ ...tag, group: 'Occasion' }] };
  assert.deepEqual(store.validateExport(grouped, grouped.binding), grouped);
  assert.throws(() => store.validateExport({ ...legacy, tags: [{ ...tag, group: 'Unknown' }] }, legacy.binding), /Invalid tag group/);
});
