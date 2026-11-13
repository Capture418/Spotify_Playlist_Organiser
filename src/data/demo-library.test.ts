import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from '../../tests/fixtures/demo-library.json' with { type: 'json' };
import albums from '../../tests/fixtures/demo-albums.json' with { type: 'json' };
import { applyTagEdit, tagIdsFor } from '../domain/library.ts';
import { createDemoLibrary } from './demo-library.ts';

test('combined demo preserves eight original playlists and adds six invented albums', () => {
  const library = createDemoLibrary();
  assert.equal(library.items.length, 14);
  assert.deepEqual(library.tags, fixture.tags);
  for (const original of fixture.playlists) {
    assert.deepEqual(library.items.find(item => item.id === `playlist:${original.id}`), {
      id: `playlist:${original.id}`, kind: 'playlist', title: original.title,
      ownerLabel: original.ownerLabel, available: true, source: 'demo', spotifyUrl: null, artworkUrl: null,
    });
  }
  for (const annotation of fixture.annotations) {
    assert.deepEqual(tagIdsFor(library, `playlist:${annotation.playlistId}`), annotation.tagIds);
  }
  assert.equal(library.items.filter(item => !item.available).length, 1);
  assert.equal(new Set(library.items.map(item => item.id)).size, 14);
});

test('every demo record has no remote artwork or launchable Spotify destination', () => {
  for (const item of createDemoLibrary().items) {
    assert.equal(item.source, 'demo');
    assert.equal(item.spotifyUrl, null);
    assert.equal(item.artworkUrl, null);
  }
});

test('new mounts reset mixed edits and do not mutate either fixture', () => {
  const before = structuredClone({ fixture, albums });
  const changed = applyTagEdit(createDemoLibrary(), {
    mode: 'bulk', itemIds: ['playlist:demo-008', 'album:demo-005'], tagIds: ['tag-dance'], newTags: [],
  });
  for (const id of ['playlist:demo-008', 'album:demo-005']) {
    assert.deepEqual(tagIdsFor(changed, id), ['tag-dance']);
    assert.deepEqual(tagIdsFor(createDemoLibrary(), id), []);
  }
  assert.deepEqual({ fixture, albums }, before);
});

test('mounts do not share metadata, artist or annotation arrays', () => {
  const first = createDemoLibrary();
  const second = createDemoLibrary();
  assert.notEqual(first.tags, second.tags);
  assert.notEqual(first.items[0], second.items[0]);
  assert.notEqual(first.annotations[0]?.tagIds, second.annotations[0]?.tagIds);
  const a = first.items.find(item => item.kind === 'album');
  const b = second.items.find(item => item.kind === 'album');
  assert.notEqual(a?.artists, b?.artists);
});
