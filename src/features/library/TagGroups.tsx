import type { ReactNode } from 'react';
import { tagGroups } from '../../domain/library.ts';
import type { Tag } from '../../domain/library.ts';

type Props = {
  tags: readonly Tag[];
  selected: readonly string[];
  renderTag: (tag: Tag) => ReactNode;
};

export function TagGroups({ tags, selected, renderTag }: Props) {
  const picked = tags.filter(tag => selected.includes(tag.id));
  return (
    <div className="tag-groups">
      {picked.length > 0 && <div className="filter-tags" role="group" aria-label="Selected tags">
        {picked.map(renderTag)}
      </div>}
      {[...tagGroups, 'Ungrouped'].map(group => {
        const members = tags.filter(tag => (tag.group ?? 'Ungrouped') === group);
        if (group === 'Ungrouped' && !members.length) return null;
        const remaining = members.filter(tag => !selected.includes(tag.id));
        return <details key={group}>
          <summary>{group} ({members.length})</summary>
          {remaining.length > 0
            ? <div className="filter-tags" role="group" aria-label={group}>{remaining.map(renderTag)}</div>
            : <p>{members.length ? 'All tags in this group are selected.' : 'No tags yet.'}</p>}
        </details>;
      })}
    </div>
  );
}
