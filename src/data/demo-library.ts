import fixture from '../../tests/fixtures/demo-library.json' with { type: 'json' };
import albums from '../../tests/fixtures/demo-albums.json' with { type: 'json' };
import { itemKey } from '../domain/library.ts';
import type { Library, TagGroup } from '../domain/library.ts';

const demoGroups: Readonly<Record<string, TagGroup>> = {
  'tag-evening': 'Occasion',
  'tag-slow': 'Tempo',
  'tag-soul': 'Genre',
};

/** Each mount clones invented fixtures. No Spotify IDs or launchable destinations. */
export function createDemoLibrary(): Library {
  return {
    items: [
      ...fixture.playlists.map(({ id, title, ownerLabel }) => ({
        id: itemKey('playlist', id), kind: 'playlist' as const, title, ownerLabel,
        available: true, source: 'demo' as const, spotifyUrl: null, artworkUrl: null,
      })),
      ...albums.map(({ id, title, artists, available, releaseYear }) => ({
        id: itemKey('album', id), kind: 'album' as const, title, artists: [...artists], releaseYear: releaseYear ?? null,
        available, source: 'demo' as const, spotifyUrl: null, artworkUrl: null,
      })),
    ],
    tags: fixture.tags.map(({ id, name }) => ({ id, name, ...(demoGroups[id] ? { group: demoGroups[id] } : {}) })),
    annotations: [
      ...fixture.annotations.map(({ playlistId, tagIds }) => ({
        itemId: itemKey('playlist', playlistId), tagIds: [...tagIds],
      })),
      ...albums.map(({ id, tagIds }) => ({ itemId: itemKey('album', id), tagIds: [...tagIds] })),
    ],
  };
}
