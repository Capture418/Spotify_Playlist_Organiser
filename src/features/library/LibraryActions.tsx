import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function LibraryActions({ onReload, onRefresh, onSettings, disabled = false }: {
  onReload: () => void; onRefresh: () => void; onSettings: () => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function choose(action: () => void) { setOpen(false); trigger.current?.focus(); action(); }
  return <div className="library-actions" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" className="secondary-button actions-trigger" aria-label="Library actions" aria-expanded={open} aria-controls="library-actions-list" onClick={() => setOpen(value => !value)}><span aria-hidden="true">⋯</span></button>
    {open && <div id="library-actions-list" className="actions-popover" role="group" aria-label="Library actions">
      <button type="button" disabled={disabled} onClick={() => choose(onReload)}>Reload app</button>
      <button type="button" disabled={disabled} onClick={() => choose(onRefresh)}>Refresh from Spotify</button>
      <button type="button" onClick={() => choose(onSettings)}>Settings &amp; data</button>
    </div>}
  </div>;
}

export function SettingsPanel({ children, busy, onClose }: { children: ReactNode; busy: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal(); heading.current?.focus();
    return () => { element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="settings-panel" aria-labelledby="settings-heading" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="settings-heading"><h2 id="settings-heading" ref={heading} tabIndex={-1}>Settings &amp; data</h2><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Close</button></div>
    {children}
  </dialog>;
}
