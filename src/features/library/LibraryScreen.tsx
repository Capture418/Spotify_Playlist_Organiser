import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LibraryActions } from './LibraryActions.tsx';
import { Icon } from '../../components/Icon.tsx';
import { createDemoLibrary } from '../../data/demo-library.ts';
import { applyTagEdit, filterItems, tagIdsFor, tagsFor } from '../../domain/library.ts';
import type { ItemKind, TagEdit } from '../../domain/library.ts';
import { LibraryCard } from './LibraryCard.tsx';
import { TagEditor } from './TagEditor.tsx';

import type { RemoteLibrary } from '../../data/remote-library.ts';

type EditorTarget = { mode: 'single' | 'bulk'; itemIds: readonly string[] };

export function LibraryScreen({ remote, connected = false, onReload, onRefresh, onSettings, notice, reloadDisabled = false }: { remote?: RemoteLibrary; connected?: boolean; onReload?: () => void; onRefresh?: () => void; onSettings?: () => void; notice?: ReactNode; reloadDisabled?: boolean }) {
  const [library, setLibrary] = useState(() => remote?.state.library ?? createDemoLibrary());
  useEffect(() => { if (remote) setLibrary(remote.state.library); }, [remote?.state]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ItemKind | 'all'>('all');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [filterTags, setFilterTags] = useState<readonly string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [feedback, setFeedback] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = filterItems(library, { query, tagIds: filterTags, kind, showUnavailable });
  const hasFilters = kind !== 'all' || query.trim().length > 0 || filterTags.length > 0;
  const visibleIds = new Set(visible.map(item => item.id));
  const hiddenSelected = selected.filter(id => !visibleIds.has(id)).length;
  const editorItems = editor ? library.items.filter(item => editor.itemIds.includes(item.id)) : [];

  function clearFilters() {
    setQuery('');
    setKind('all');
    setFilterTags([]);
    setFeedback('');
  }

  function toggleFilter(id: string) {
    setFilterTags(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
    setFeedback('');
  }

  function toggleSelection(id: string) {
    setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  }

  function finishSelection() {
    setSelected([]);
    setSelecting(false);
  }

  async function saveTags(edit: TagEdit, reapply = false) {
    // The modal makes the rest of the page inert; no concurrent UI edit can run.
    if (remote) await remote.save(edit, reapply);
    else setLibrary(applyTagEdit(library, edit));
    setFeedback(edit.mode === 'bulk'
      ? `Tags added to ${edit.itemIds.length} ${edit.itemIds.length === 1 ? 'item' : 'items'}. Existing tags were kept.`
      : `Tags updated for ${editorItems[0]?.title ?? 'this item'}.`);
    setEditor(null);
    if (edit.mode === 'bulk') finishSelection();
  }

  return (
    <div className={`app-shell${selecting ? ' is-selecting' : ''}`}>
      <a className="skip-link" href="#library">Skip to library</a>
      <header className="app-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>MuLO: Music Library Organiser</span></div>
        <div className="header-actions">
        <span className="demo-badge"><span aria-hidden="true" />{connected ? 'Connected library' : remote ? 'Synthetic library' : 'Local demo'}</span>
        {onReload && onRefresh && onSettings && <LibraryActions onReload={onReload} onRefresh={onRefresh} onSettings={onSettings} disabled={reloadDisabled || editor !== null}/>}
        </div>
      </header>
      {notice}
      <main id="library" tabIndex={-1}>
        <div className="page-intro">
          <p className="eyebrow">LESS SCROLLING. MORE LISTENING.</p>
          <h1>Your library.</h1>
        </div>
        {!connected && (
          <div className="demo-notice" id="demo-notice">
            <span className="notice-symbol" aria-hidden="true">i</span>
            <p><strong>{remote ? 'Synthetic library.' : 'Try the demo.'}</strong> These playlists and albums are invented. {remote ? 'Changes save to the local database after confirmation.' : 'Changes reset on reload.'} Spotify isn’t connected.</p>
          </div>
        )}
        <section className="filter-panel" aria-label="Find items">
          <div className="library-views" role="group" aria-label="Library type">
            {(['all', 'playlist', 'album'] as const).map(value => (
              <button key={value} type="button" className="view-button" aria-pressed={kind === value}
                onClick={() => { setKind(value); setFeedback(''); }}>
                {value === 'all' ? 'All' : value === 'playlist' ? 'Playlists' : 'Albums'}
              </button>
            ))}
          </div>
          <label className="search-label" htmlFor="item-search">Search titles, album artists and tags</label>
          <div className="search-field">
            <Icon name="search" />
            <input ref={searchRef} id="item-search" type="search" value={query}
              placeholder="Try evening slow" autoComplete="off" spellCheck={false}
              aria-describedby="search-hint" onChange={event => { setQuery(event.target.value); setFeedback(''); }} />
            {query && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><Icon name="close" /></button>}
          </div>
          <p className="search-hint" id="search-hint">Every word must match a title, tag or album artist.</p>
          <div className="filter-heading"><h2>Filter by tags</h2><span className="match-rule">Match all selected</span></div>
          <div className="filter-tags" role="group" aria-label="Filter by tags">
            {library.tags.map(tag => (
              <button key={tag.id} type="button" className="filter-chip" aria-pressed={filterTags.includes(tag.id)} onClick={() => toggleFilter(tag.id)}>
                {filterTags.includes(tag.id) && <Icon name="check" />}{tag.name}
              </button>
            ))}
          </div>
        <label className="availability-control">
            <input type="checkbox" checked={showUnavailable} onChange={event => setShowUnavailable(event.target.checked)} />
            Show unavailable ({library.items.filter(item => !item.available).length})
          </label>
        </section>
        <section aria-labelledby="results-title" className="results-section">
          <div className="results-toolbar">
            <div className="results-heading">
              <h2 id="results-title">{hasFilters ? 'Matching items' : 'Your collection'}</h2>
              <p role="status" aria-live="polite" aria-atomic="true">{visible.length} of {library.items.length} items · Title A–Z{!showUnavailable ? ' · Unavailable hidden' : ''}</p>
            </div>
            <div className="results-actions">
              {hasFilters && <button type="button" className="text-button" onClick={clearFilters}>Clear filters</button>}
              <button type="button" className="secondary-button" aria-pressed={selecting}
                onClick={() => { if (selecting) finishSelection(); else { setSelecting(true); setFeedback(''); } }}>
                <Icon name={selecting ? 'close' : 'select'} />{selecting ? 'Done selecting' : 'Select items'}
              </button>
            </div>
          </div>
          <p className="app-feedback" role="status">{feedback}</p>
          {visible.length > 0 ? (
            <ul className="item-grid" aria-label="Library items">
              {visible.map(item => (
                <li key={item.id}>
                  <LibraryCard item={item} tags={tagsFor(library, item.id)} selecting={selecting}
                    selected={selected.includes(item.id)} onSelect={() => toggleSelection(item.id)}
                    onEdit={() => { remote?.begin(); setEditor({ mode: 'single', itemIds: [item.id] }); }} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="search" /></div>
              <h3>No items match yet.</h3>
              <p>Try removing a tag or using fewer words. Selected tags must all match.</p>
              <button type="button" className="primary-button" onClick={clearFilters}>Clear all filters</button>
            </div>
          )}
        </section>
        <details className="install-guide">
          <summary>Use on your iPhone</summary>
          <p>Once your private HTTPS address is ready, open it in Safari, tap Share, then Add to Home Screen. Choose Open as Web App if offered.</p>
          <p>{connected ? 'Keep your VPN connected and home server available. The library needs a connection to browse and save changes.' : 'The online library will need your VPN and home server. This preview uses invented data; iPhone installation and private access are not ready yet.'}</p>
        </details>
        <footer className="app-footer"><span>Made for finding. Spotify stays your player.</span><span>{connected ? 'Private library · Online' : remote ? 'Synthetic · Local database' : 'Prototype · Memory only'}</span></footer>
      </main>
      {selecting && (
        <section className="selection-bar" aria-label="Bulk tagging">
          <div className="selection-summary">
            <strong role="status">{selected.length} selected{hiddenSelected > 0 ? ` · ${hiddenSelected} outside this view` : ''}</strong>
            <span>Selections stay selected when you filter.</span>
          </div>
          <div className="selection-actions">
            <button type="button" className="text-button" disabled={visible.length === 0}
              onClick={() => setSelected(previous => [...new Set([...previous, ...visibleIds])])}>Select all shown</button>
            <button type="button" className="text-button" disabled={selected.length === 0} onClick={() => setSelected([])}>Clear selection</button>
            <button type="button" className="primary-button" disabled={selected.length === 0}
              onClick={() => { remote?.begin(); setEditor({ mode: 'bulk', itemIds: selected }); }}><Icon name="tag" />Add tags</button>
          </div>
        </section>
      )}
      {editor && (
        <TagEditor mode={editor.mode} items={editorItems} tags={library.tags}
          initialTagIds={editor.mode === 'single' && editor.itemIds[0] ? tagIdsFor(library, editor.itemIds[0]) : []}
          returnFocus={searchRef} persistent={!!remote} latestTags={editorItems.map(i => ({title:i.title,tags:tagsFor(library,i.id).map(t=>t.name)}))} onSave={saveTags} onCancel={() => { remote?.cancel(); setEditor(null); }} />
      )}
    </div>
  );
}
