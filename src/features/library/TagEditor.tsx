import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { Icon } from '../../components/Icon.tsx';
import { ApiError } from '../../data/remote-library.ts';
import { itemLabel, prepareTag } from '../../domain/library.ts';
import type { LibraryItem, Tag, TagEdit } from '../../domain/library.ts';

type Props = {
  mode: 'single' | 'bulk';
  items: readonly LibraryItem[];
  tags: readonly Tag[];
  initialTagIds: readonly string[];
  returnFocus: RefObject<HTMLInputElement | null>;
  onSave: (edit: TagEdit, reapply?: boolean) => void | Promise<void>;
  persistent?: boolean;
  latestTags?: {title:string;tags:string[]}[];
  onCancel: () => void;
};

export function TagEditor({ mode, items, tags, initialTagIds, returnFocus, onSave, onCancel, persistent = false, latestTags = [] }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newTagRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const newTagId = useId();
  const [draftTags, setDraftTags] = useState<readonly Tag[]>(tags);
  const [picked, setPicked] = useState<readonly string[]>(initialTagIds);
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const retry = useRef<TagEdit | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    headingRef.current?.focus();
    return () => {
      dialog?.close();
      // The edited card may disappear from a filtered view after saving.
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      else returnFocus.current?.focus();
    };
  }, [returnFocus]);

  function toggleTag(id: string) {
    setPicked(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
    setError('');
  }

  function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = prepareTag(draftTags, name, `demo-tag-${crypto.randomUUID()}`);
      if (result.created) setDraftTags(previous => [...previous, result.tag]);
      setPicked(previous => previous.includes(result.tag.id) ? previous : [...previous, result.tag.id]);
      setName('');
      setError('');
      setFeedback(result.created ? `“${result.tag.name}” is ready to apply.` : `Selected existing tag “${result.tag.name}”.`);
      newTagRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tag could not be created.');
    }
  }

  async function save(reapply = false) {
    setBusy(true);
    try {
      // Save includes an unfinished, non-empty tag entry as well; it must not
      // silently discard text simply because Add tag was not pressed first.
      const pending = name.trim() ? prepareTag(draftTags, name, `demo-tag-${crypto.randomUUID()}`) : null;
      const appliedIds = pending ? [...new Set([...picked, pending.tag.id])] : picked;
      const appliedTags = pending?.created ? [...draftTags, pending.tag] : draftTags;
      const existingIds = new Set(tags.map(tag => tag.id));
      const edit = retry.current ?? {
        mode,
        itemIds: items.map(item => item.id),
        tagIds: appliedIds,
        newTags: appliedTags.filter(tag => !existingIds.has(tag.id) && appliedIds.includes(tag.id)),
      };
      retry.current = edit;
      await onSave(edit, reapply);
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.status === 409);
      setError(cause instanceof Error ? cause.message : 'Nothing was changed. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <dialog ref={dialogRef} className="tag-editor" aria-labelledby={headingId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{mode === 'bulk' ? 'BULK TAGGING' : 'ITEM TAGS'}</p>
          <h2 id={headingId} ref={headingRef} tabIndex={-1}>
            {mode === 'bulk' ? `Add tags to ${items.length} ${items.length === 1 ? 'item' : 'items'}` : items[0]?.title}
          </h2>
        </div>
        <button type="button" className="icon-button" disabled={busy} onClick={onCancel} aria-label="Cancel tag editing"><Icon name="close" /></button>
      </div>
      <p className="editor-description" id={descriptionId}>
        {mode === 'bulk' ? 'Choose tags to add. Every existing tag stays in place.' : 'Choose as many as you like. Click a selected tag to remove it.'}
      </p>
      {mode === 'bulk' && (
        <div className="target-summary">
          <p>These items will be updated:</p>
          <ul>{items.map(item => <li key={item.id}>{itemLabel(item)}</li>)}</ul>
        </div>
      )}
      <div className="editor-tags" role="group" aria-label={mode === 'bulk' ? 'Tags to add' : 'Item tags'}>
        {draftTags.map(tag => (
          <button key={tag.id} type="button" className="tag-choice" aria-pressed={picked.includes(tag.id)} disabled={busy || !!retry.current} onClick={() => toggleTag(tag.id)}>
            {picked.includes(tag.id) && <Icon name="check" />}{tag.name}
          </button>
        ))}
      </div>
      <form className="new-tag-form" onSubmit={createTag}>
        <label htmlFor={newTagId}>Create a tag</label>
        <div className="new-tag-input">
          <input disabled={busy || !!retry.current} ref={newTagRef} id={newTagId} value={name} onChange={event => { setName(event.target.value); setError(''); }}
            placeholder="For example, Road trip" autoComplete="off" />
          <button type="submit" className="secondary-button" disabled={busy || !!retry.current || !name.trim()}>Add tag</button>
        </div>
      </form>
      <p className="editor-feedback" role="status">{feedback}</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      {conflict && <div role="status"><h3>Latest saved tags</h3>{latestTags.map(i => <p key={i.title}>{i.title}: {i.tags.join(', ') || 'No tags'}</p>)}<p>Your draft remains selected above. Reapply deliberately, or cancel to keep the latest saved state.</p></div>}
      <p className="editor-note">{persistent ? 'Saved only after server confirmation. Errors keep your draft.' : 'Demo edits only. Reloading resets this library.'}</p>
      <div className="editor-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-button" onClick={() => void save(conflict)} disabled={busy || (mode === 'bulk' && picked.length === 0 && !name.trim())}>
          {busy ? 'Saving…' : conflict ? 'Reapply my draft' : retry.current ? 'Retry same save' : mode === 'bulk' ? 'Apply tags' : 'Save tags'}
        </button>
      </div>
    </dialog>
  );
}
