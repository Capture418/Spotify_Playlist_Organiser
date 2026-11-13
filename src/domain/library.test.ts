import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from '../../tests/fixtures/demo-library.json' with { type: 'json' };
import { createDemoLibrary } from '../data/demo-library.ts';
import {
  applyTagEdit, cleanTagName, filterItems, prepareTag, tagIdsFor, tagsFor,
} from './library.ts';
import type { Library, TagEdit } from './library.ts';

const ids = (library: Library, query = '', tagIds: readonly string[] = []) =>
  filterItems(library, { query, tagIds, kind: 'playlist' }).map(item => item.id).sort();
const edit = (overrides: Partial<TagEdit> = {}): TagEdit => ({
  mode: 'single', itemIds: ['playlist:demo-001'], tagIds: ['tag-soul'], newTags: [], ...overrides,
});

for (const example of fixture.proposedSearchExamples) {
  test(`approved fixture example: ${example.name}`, () => {
    assert.deepEqual(ids(createDemoLibrary(), example.query, example.selectedTagIds), example.expectedPlaylistIds.map(id => `playlist:${id}`).sort());
  });
}

test('chips and search are combined, not alternative filters', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'jazz', ['tag-evening', 'tag-slow']), ['playlist:demo-004']);
});

test('words can match different fields in any order', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'soul night evening'), ['playlist:demo-002']);
});

test('search ignores case, repeated whitespace and leading/trailing space', () => {
  assert.deepEqual(ids(createDemoLibrary(), '  EVENING\n\tSLOW  '), ['playlist:demo-001', 'playlist:demo-002', 'playlist:demo-004']);
});

test('repeated query terms and selected tags do not duplicate results', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'slow slow', ['tag-evening', 'tag-evening']), ['playlist:demo-001', 'playlist:demo-002', 'playlist:demo-004']);
});

test('search is literal text, not a regular expression', () => {
  assert.deepEqual(ids(createDemoLibrary(), '.*'), []);
});

test('search does not silently include owner labels or internal IDs', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'demo collection'), []);
  assert.deepEqual(ids(createDemoLibrary(), 'playlist:demo-001'), []);
});

test('partial words match within a title or a tag', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'kitch upb'), ['playlist:demo-003']);
});

test('unknown tags fail closed instead of showing every item', () => {
  assert.deepEqual(ids(createDemoLibrary(), '', ['tag-unknown']), []);
});

test('untagged items can be found by title', () => {
  assert.deepEqual(ids(createDemoLibrary(), 'new finds'), ['playlist:demo-008']);
});

test('an empty library produces an empty result', () => {
  assert.deepEqual(ids({ items: [], tags: [], annotations: [] }), []);
});

test('query and returned tag lookup do not modify input data', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  ids(library, 'slow');
  tagsFor(library, 'playlist:demo-001');
  assert.deepEqual(library, before);
});

test('display tags come from stable tag identities', () => {
  const library = createDemoLibrary();
  assert.deepEqual(tagsFor(library, 'playlist:demo-002').map(tag => tag.name), ['Evening', 'Slow', 'Soul']);
  assert.deepEqual(tagsFor(library, 'not-present'), []);
});

test('tag names normalise whitespace and Unicode compatibility forms', () => {
  assert.equal(cleanTagName('  Dinner\n party  '), 'Dinner party');
  assert.equal(cleanTagName('Ｅｖｅｎｉｎｇ'), 'Evening');
});

test('blank tag creation gives a useful error', () => {
  assert.throws(() => prepareTag([], '  \n ', 'new'), /Give the tag a name/);
});

test('existing tag names are reused rather than duplicated', () => {
  const library = createDemoLibrary();
  const result = prepareTag(library.tags, ' EVENING ', 'unused-id');
  assert.equal(result.created, false);
  assert.equal(result.tag.id, 'tag-evening');
  assert.equal(result.tag, library.tags[0]);
});

test('multi-word names are deduplicated after whitespace normalisation', () => {
  const result = prepareTag([{ id: 'a', name: 'Dinner party' }], 'dinner   PARTY', 'b');
  assert.equal(result.tag.id, 'a');
  assert.equal(result.created, false);
});

test('new tag identities must be non-empty and unique', () => {
  assert.throws(() => prepareTag([], 'New', ' '), /could not be created/);
  assert.throws(() => prepareTag(createDemoLibrary().tags, 'New', 'tag-evening'), /could not be created/);
});

test('preparing and abandoning a draft leaves the library untouched', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  prepareTag(library.tags, 'Road trip', 'tag-new');
  assert.deepEqual(library, before);
});

test('single editing replaces selected tags and allows removing every tag', () => {
  const library = createDemoLibrary();
  const changed = applyTagEdit(library, edit());
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-001'), ['tag-soul']);
  const empty = applyTagEdit(changed, edit({ tagIds: [] }));
  assert.deepEqual(tagIdsFor(empty, 'playlist:demo-001'), []);
});

test('single editing preserves metadata and all unrelated annotations', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  const changed = applyTagEdit(library, edit());
  assert.equal(changed.items, library.items);
  assert.equal(changed.tags, library.tags);
  assert.equal(changed.annotations[1], library.annotations[1]);
  assert.deepEqual(library, before);
});

test('bulk adds to all explicit targets and preserves each existing tag', () => {
  const library = createDemoLibrary();
  const changed = applyTagEdit(library, edit({
    mode: 'bulk', itemIds: ['playlist:demo-003', 'playlist:demo-008'], tagIds: ['tag-evening', 'tag-slow'],
  }));
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-003'), ['tag-dance', 'tag-upbeat', 'tag-evening', 'tag-slow']);
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-008'), ['tag-evening', 'tag-slow']);
  assert.equal(changed.annotations[0], library.annotations[0]);
});

test('bulk targets are explicit and are not derived from the current filter', () => {
  const library = createDemoLibrary();
  assert.deepEqual(ids(library, 'kitchen'), ['playlist:demo-003']);
  const changed = applyTagEdit(library, edit({ mode: 'bulk', itemIds: ['playlist:demo-003', 'playlist:demo-005'] }));
  assert.ok(tagIdsFor(changed, 'playlist:demo-003').includes('tag-soul'));
  assert.ok(tagIdsFor(changed, 'playlist:demo-005').includes('tag-soul'));
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-008'), []);
});

test('bulk changes deduplicate targets and tags, including already assigned tags', () => {
  const changed = applyTagEdit(createDemoLibrary(), edit({
    mode: 'bulk', itemIds: ['playlist:demo-001', 'playlist:demo-001'], tagIds: ['tag-evening', 'tag-evening', 'tag-soul'],
  }));
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-001'), ['tag-evening', 'tag-slow', 'tag-ambient', 'tag-soul']);
});

test('repeating the same bulk add is idempotent', () => {
  const change = edit({ mode: 'bulk', itemIds: ['playlist:demo-001', 'playlist:demo-008'] });
  const once = applyTagEdit(createDemoLibrary(), change);
  assert.deepEqual(applyTagEdit(once, change), once);
});

test('new selected tags are committed atomically with annotations', () => {
  const library = createDemoLibrary();
  const changed = applyTagEdit(library, edit({
    tagIds: ['new'], newTags: [{ id: 'new', name: ' Road   trip ' }],
  }));
  assert.deepEqual(changed.tags.at(-1), { id: 'new', name: 'Road trip' });
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-001'), ['new']);
  assert.equal(library.tags.length, 9);
});

test('unselected draft tags cannot leak into the library', () => {
  assert.throws(() => applyTagEdit(createDemoLibrary(), edit({
    newTags: [{ id: 'new', name: 'Abandoned' }],
  })), /must be applied/);
});

test('new definitions cannot duplicate an existing name', () => {
  assert.throws(() => applyTagEdit(createDemoLibrary(), edit({
    tagIds: ['new'], newTags: [{ id: 'new', name: 'EVENING' }],
  })), /already exists/);
});

test('no-target edits and multi-target individual edits are rejected', () => {
  assert.throws(() => applyTagEdit(createDemoLibrary(), edit({ itemIds: [] })), /Select at least one/);
  assert.throws(() => applyTagEdit(createDemoLibrary(), edit({ itemIds: ['playlist:demo-001', 'playlist:demo-002'] })), /exactly one/);
});

test('bulk removal is not supported', () => {
  assert.throws(() => applyTagEdit(createDemoLibrary(), edit({ mode: 'bulk', tagIds: [] })), /at least one tag/);
});

test('unknown target rejects the entire operation without partial changes', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  assert.throws(() => applyTagEdit(library, edit({ mode: 'bulk', itemIds: ['playlist:demo-001', 'missing'] })), /item is no longer/);
  assert.deepEqual(library, before);
});

test('unknown tag rejects the entire operation without partial changes', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  assert.throws(() => applyTagEdit(library, edit({ tagIds: ['tag-soul', 'missing'] })), /tag is no longer/);
  assert.deepEqual(library, before);
});

test('an invalid new-tag batch does not partially commit', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  assert.throws(() => applyTagEdit(library, edit({
    tagIds: ['new-a', 'new-b'],
    newTags: [{ id: 'new-a', name: 'Travel' }, { id: 'new-b', name: 'travel' }],
  })), /already exists/);
  assert.deepEqual(library, before);
});

test('a missing annotation can be created without replacing metadata', () => {
  const original = createDemoLibrary();
  const library = { ...original, annotations: original.annotations.filter(item => item.itemId !== 'playlist:demo-008') };
  const changed = applyTagEdit(library, edit({ itemIds: ['playlist:demo-008'] }));
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-008'), ['tag-soul']);
  assert.equal(changed.items, original.items);
});

test('tagged results change immediately after an edit', () => {
  const changed = applyTagEdit(createDemoLibrary(), edit({ itemIds: ['playlist:demo-008'] }));
  assert.deepEqual(ids(changed, '', ['tag-soul']), ['playlist:demo-002', 'playlist:demo-008']);
});

test('item renaming does not lose tags tied to its identity', () => {
  const library = createDemoLibrary();
  const renamed = { ...library, items: library.items.map(item => item.id === 'playlist:demo-001' ? { ...item, title: 'Renamed' } : item) };
  assert.deepEqual(tagIdsFor(renamed, 'playlist:demo-001'), tagIdsFor(library, 'playlist:demo-001'));
  assert.deepEqual(ids(renamed, 'renamed', ['tag-evening']), ['playlist:demo-001']);
});

test('markup-like names remain ordinary strings in the domain', () => {
  const name = '<img src=x onerror=alert(1)>';
  const changed = applyTagEdit(createDemoLibrary(), edit({ tagIds: ['new'], newTags: [{ id: 'new', name }] }));
  assert.equal(changed.tags.at(-1)?.name, name);
});

test('All/type filters intersect with every tag and title/artist query word', () => {
  const library = createDemoLibrary();
  const filters = { query: 'MIRA evening win', tagIds: ['tag-evening', 'tag-slow'] };
  assert.deepEqual(filterItems(library, filters).map(item => item.id), ['album:demo-001']);
  assert.deepEqual(filterItems(library, { ...filters, kind: 'album' }).map(item => item.id), ['album:demo-001']);
  assert.deepEqual(filterItems(library, { ...filters, kind: 'playlist' }), []);
  assert.deepEqual(filterItems(library, { query: 'north lena upbeat', tagIds: [] }).map(item => item.id), ['album:demo-003']);
  assert.equal(filterItems(library, { query: '', tagIds: [] }).length, 13);
  assert.equal(filterItems(library, { query: '', tagIds: [], kind: 'album' }).length, 5);
});

test('mixed title order ignores case and ties use kind then identity without mutation', () => {
  const original = createDemoLibrary();
  const items = original.items.filter(item => ['playlist:demo-001', 'album:demo-001', 'album:demo-002'].includes(item.id))
    .map((item, index) => ({ ...item, title: index === 0 ? 'SAME' : 'same' })).reverse();
  const library = { ...original, items };
  const before = structuredClone(library);
  assert.deepEqual(filterItems(library, { query: '', tagIds: [] }).map(item => item.id),
    ['album:demo-001', 'album:demo-002', 'playlist:demo-001']);
  assert.deepEqual(library, before);
  assert.equal(filterItems(original, { query: '', tagIds: [] })[0]?.title, 'After Hours');
});

test('shared raw IDs across types and album editions never share assignments', () => {
  const library = createDemoLibrary();
  const changed = applyTagEdit(library, { mode: 'single', itemIds: ['album:demo-001'], tagIds: [], newTags: [] });
  assert.deepEqual(tagIdsFor(changed, 'album:demo-001'), []);
  assert.deepEqual(tagIdsFor(changed, 'album:demo-002'), ['tag-evening']);
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-001'), ['tag-evening', 'tag-slow', 'tag-ambient']);
  assert.equal(changed.items, library.items);
});

test('mixed additive bulk retains different assignments and rejects an invalid batch atomically', () => {
  const library = createDemoLibrary();
  const before = structuredClone(library);
  const change: TagEdit = { mode: 'bulk', itemIds: ['album:demo-001', 'playlist:demo-003'], tagIds: ['tag-jazz'], newTags: [] };
  const changed = applyTagEdit(library, change);
  assert.deepEqual(tagIdsFor(changed, 'album:demo-001'), ['tag-evening', 'tag-slow', 'tag-jazz']);
  assert.deepEqual(tagIdsFor(changed, 'playlist:demo-003'), ['tag-dance', 'tag-upbeat', 'tag-jazz']);
  assert.deepEqual(tagIdsFor(changed, 'album:demo-003'), tagIdsFor(library, 'album:demo-003'));
  assert.throws(() => applyTagEdit(library, { ...change, itemIds: [...change.itemIds, 'album:missing'] }), /Nothing was changed/);
  assert.deepEqual(library, before);
});

test('unavailable items retain editable tags and still obey type/search/chip filters', () => {
  const library = createDemoLibrary();
  assert.deepEqual(filterItems(library, { query: 'faded', tagIds: [] }), []);
  const changed = applyTagEdit(library, { mode: 'single', itemIds: ['album:demo-006'], tagIds: ['tag-jazz'], newTags: [] });
  const filters = { query: 'mira faded', tagIds: ['tag-jazz'], showUnavailable: true };
  assert.deepEqual(filterItems(changed, filters).map(item => item.id), ['album:demo-006']);
  assert.deepEqual(filterItems(changed, { ...filters, kind: 'playlist' }), []);
  assert.deepEqual(filterItems(changed, { ...filters, tagIds: ['tag-evening'] }), []);
  const restored = { ...changed, items: changed.items.map(item => ({ ...item, available: true })) };
  assert.deepEqual(tagIdsFor(restored, 'album:demo-006'), ['tag-jazz']);
  assert.equal(filterItems(restored, { ...filters, showUnavailable: false }).length, 1);
});
