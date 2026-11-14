/** Prototype data only. This is not the future Spotify/account schema. */
export type Tag = Readonly<{ id: string; name: string }>;
export type ItemKind = 'playlist' | 'album';
export type LibraryItem = Readonly<{
  /** Type-qualified identity, never a title. */
  id: string;
  title: string;
  available: boolean;
  source: 'demo' | 'spotify';
  spotifyUrl: string | null;
  artworkUrl: null;
} & ({ kind: 'playlist'; ownerLabel: string } | { kind: 'album'; artists: readonly string[] })>;

/** Only canonical Spotify destinations matching the item's type-qualified identity. */
export function spotifyLink(item: LibraryItem): string | null {
  const prefix = `${item.kind}:`;
  if (item.source !== 'spotify' || !item.available || !item.id.startsWith(prefix)) return null;
  const id = item.id.slice(prefix.length);
  if (!/^[A-Za-z0-9]{22}$/.test(id)) return null;
  const expected = `https://open.spotify.com/${item.kind}/${id}`;
  return item.spotifyUrl === expected ? expected : null;
}

export function itemKey(kind: ItemKind, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

export function itemLabel(item: LibraryItem): string {
  return `${item.title} — ${item.kind === 'album' ? 'Album' : 'Playlist'}${item.available ? '' : ' (unavailable)'}`;
}

export type Annotation = Readonly<{ itemId: string; tagIds: readonly string[] }>;
export type Library = Readonly<{
  items: readonly LibraryItem[];
  tags: readonly Tag[];
  annotations: readonly Annotation[];
}>;
export type Filters = Readonly<{ query: string; tagIds: readonly string[]; kind?: ItemKind | 'all'; showUnavailable?: boolean }>;
export type TagEdit = Readonly<{
  mode: 'single' | 'bulk';
  itemIds: readonly string[];
  tagIds: readonly string[];
  newTags: readonly Tag[];
}>;

export function cleanTagName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

function normalise(value: string): string {
  return cleanTagName(value).toLocaleLowerCase('en-GB');
}

export function tagIdsFor(library: Library, itemId: string): readonly string[] {
  return library.annotations.find(item => item.itemId === itemId)?.tagIds ?? [];
}

export function tagsFor(library: Library, itemId: string): readonly Tag[] {
  const ids = new Set(tagIdsFor(library, itemId));
  return library.tags.filter(tag => ids.has(tag.id));
}

/** Type AND every chip AND every query word; album artists are searchable too. */
export function filterItems(library: Library, filters: Filters): readonly LibraryItem[] {
  const tags = new Map(library.tags.map(tag => [tag.id, normalise(tag.name)]));
  if (filters.tagIds.some(id => !tags.has(id))) return [];
  const annotations = new Map(library.annotations.map(item => [item.itemId, item.tagIds]));
  const words = normalise(filters.query).split(' ').filter(Boolean);

  return library.items.filter(item => {
    if (filters.kind && filters.kind !== 'all' && item.kind !== filters.kind) return false;
    if (!filters.showUnavailable && !item.available) return false;
    const attached = annotations.get(item.id) ?? [];
    if (!filters.tagIds.every(id => attached.includes(id))) return false;
    const fields = [normalise(item.title), ...attached.map(id => tags.get(id) ?? ''),
      ...(item.kind === 'album' ? item.artists.map(normalise) : [])];
    return words.every(word => fields.some(field => field.includes(word)));
  }).sort((a, b) => {
    const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
    return compare(normalise(a.title), normalise(b.title)) || compare(a.kind, b.kind) || compare(a.id, b.id);
  });
}

/** A new tag is only a draft until applyTagEdit commits it. */
export function prepareTag(
  tags: readonly Tag[],
  name: string,
  newId: string,
): Readonly<{ tag: Tag; created: boolean }> {
  const cleaned = cleanTagName(name);
  if (!cleaned) throw new Error('Give the tag a name first.');
  const existing = tags.find(tag => normalise(tag.name) === normalise(cleaned));
  if (existing) return { tag: existing, created: false };
  if (!newId.trim() || tags.some(tag => tag.id === newId)) {
    throw new Error('That tag could not be created. Please try again.');
  }
  return { tag: { id: newId, name: cleaned }, created: true };
}

/** Atomic, immutable edit. Item metadata is never changed here. */
export function applyTagEdit(library: Library, edit: TagEdit): Library {
  const itemIds = [...new Set(edit.itemIds)];
  const selectedTagIds = [...new Set(edit.tagIds)];
  if (!itemIds.length) throw new Error('Select at least one item.');
  if (edit.mode === 'single' && itemIds.length !== 1) {
    throw new Error('An individual edit must target exactly one item.');
  }
  const knownItems = new Set(library.items.map(item => item.id));
  if (itemIds.some(id => !knownItems.has(id))) {
    throw new Error('A selected item is no longer available. Nothing was changed.');
  }
  if (edit.mode === 'bulk' && !selectedTagIds.length) {
    throw new Error('Choose at least one tag to add.');
  }

  const tags = [...library.tags];
  for (const draft of edit.newTags) {
    if (!selectedTagIds.includes(draft.id)) {
      throw new Error('A new tag must be applied to an item.');
    }
    const prepared = prepareTag(tags, draft.name, draft.id);
    if (!prepared.created) throw new Error('A tag with that name already exists.');
    tags.push(prepared.tag);
  }
  const knownTags = new Set(tags.map(tag => tag.id));
  if (selectedTagIds.some(id => !knownTags.has(id))) {
    throw new Error('A selected tag is no longer available. Nothing was changed.');
  }

  const targets = new Set(itemIds);
  const updated = new Set<string>();
  const annotations = library.annotations.map(annotation => {
    if (!targets.has(annotation.itemId)) return annotation;
    updated.add(annotation.itemId);
    return {
      itemId: annotation.itemId,
      tagIds: edit.mode === 'single'
        ? selectedTagIds
        : [...new Set([...annotation.tagIds, ...selectedTagIds])],
    };
  });
  for (const itemId of itemIds) {
    if (!updated.has(itemId)) annotations.push({ itemId, tagIds: selectedTagIds });
  }
  return {
    items: library.items,
    tags: edit.newTags.length ? tags : library.tags,
    annotations,
  };
}
