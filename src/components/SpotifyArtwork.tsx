import { useState } from 'react';
import { artworkUrl } from '../domain/artwork.ts';
export function SpotifyArtwork({url, title}: {url: string | null; title: string}) {
  const safe = artworkUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  return safe && failed !== safe ? <img className="spotify-artwork" src={safe} alt={`Cover for ${title}`} width="300" height="300" loading="lazy" decoding="async" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={() => setFailed(safe)} />
    : <div className="artwork-placeholder" role="img" aria-label={`Artwork unavailable for ${title}`}><span>Artwork unavailable</span></div>;
}
