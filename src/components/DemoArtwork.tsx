const sleeves: Record<string, { theme: string; label: string; number: string }> = {
  'demo-001': { theme: 'corners', label: 'quiet corners', number: '01' },
  'demo-002': { theme: 'soul', label: 'late-night soul', number: '02' },
  'demo-003': { theme: 'disco', label: 'kitchen disco', number: '03' },
  'demo-004': { theme: 'hours', label: 'after hours', number: '04' },
  'demo-005': { theme: 'weekend', label: 'weekend warm-up', number: '05' },
  'demo-006': { theme: 'focus', label: 'deep focus', number: '06' },
  'demo-007': { theme: 'dinner', label: 'dinner at home', number: '07' },
  'demo-008': { theme: 'finds', label: 'new finds', number: '08' },
};

/** Original CSS placeholders, not Spotify artwork or external assets. */
export function DemoArtwork({ itemId, title }: { itemId: string; title: string }) {
  const sleeve = (itemId.startsWith('playlist:') ? sleeves[itemId.slice('playlist:'.length)] : undefined)
    ?? { theme: 'focus', label: title.toLocaleLowerCase('en-GB'), number: 'ALBUM' };
  return (
    <div className={`artwork artwork--${sleeve.theme}`} aria-hidden="true">
      <span className="artwork-edition">DEMO / {sleeve.number}</span>
      <div className="artwork-shape" />
      <span className="artwork-label">{sleeve.label}</span>
    </div>
  );
}
