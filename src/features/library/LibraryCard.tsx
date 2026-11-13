import { DemoArtwork } from '../../components/DemoArtwork.tsx';
import { Icon } from '../../components/Icon.tsx';
import { itemLabel } from '../../domain/library.ts';
import type { LibraryItem, Tag } from '../../domain/library.ts';

type Props = {
  item: LibraryItem;
  tags: readonly Tag[];
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

export function LibraryCard({ item, tags, selecting, selected, onSelect, onEdit }: Props) {
  return (
    <article className={`item-card${selected ? ' is-selected' : ''}`} aria-labelledby={`title-${item.id}`}>
      <div className="artwork-wrap">
        <DemoArtwork itemId={item.id} title={item.title} />
        {selecting && (
          <label className="item-selector">
            <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${itemLabel(item)}`} />
          </label>
        )}
      </div>
      <div className="card-content">
        <p className="item-type">{item.kind === 'album' ? 'Album' : 'Playlist'}{!item.available && ' · Unavailable'}</p>
        <h3 id={`title-${item.id}`}>{item.title}</h3>
        <p className="item-owner">{item.kind === 'album' ? item.artists.join(', ') : item.ownerLabel}</p>
        {!item.available && <p className="unavailable-note">Missing from the demo library. Your tags are kept.</p>}
        {tags.length > 0 ? (
          <ul className="card-tags" aria-label={`Tags for ${item.title}`}>
            {tags.map(tag => <li key={tag.id}>{tag.name}</li>)}
          </ul>
        ) : <p className="untagged">Not tagged yet</p>}
        <div className="card-actions">
          <button type="button" className="edit-button" onClick={onEdit} aria-label={`Edit tags for ${itemLabel(item)}`}>
            <Icon name="tag" /> <span>Edit tags</span>
          </button>
          <button type="button" className="spotify-preview" disabled
            aria-describedby="demo-notice" title="Invented item — Spotify is not connected.">
            <span>Open in Spotify</span><Icon name="arrow" />
          </button>
        </div>
      </div>
    </article>
  );
}
