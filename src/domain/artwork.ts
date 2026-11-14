/** Exact image hosts only; no credentials, query strings or arbitrary proxy destinations. */
export const ARTWORK_ORIGINS = ['https://i.scdn.co', 'https://mosaic.scdn.co', 'https://image-cdn-ak.spotifycdn.com', 'https://image-cdn-fa.spotifycdn.com'] as const;
export function artworkUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (!ARTWORK_ORIGINS.some(origin => u.origin === origin) || u.username || u.password || u.search || u.hash || !/^\/[A-Za-z0-9/_-]+$/.test(u.pathname)) return null;
    return u.href === value ? value : null;
  } catch { return null; }
}
export function selectArtwork(images: unknown): string | null {
  if (!Array.isArray(images) || images.length > 20) return null;
  const choices = images.flatMap(image => {
    if (!image || typeof image !== 'object') return [];
    const url = artworkUrl(image.url);
    const width = Number.isSafeInteger(image.width) && image.width > 0 ? image.width : 0;
    return url ? [{url, width}] : [];
  });
  const sized = choices.filter(x => x.width >= 300).sort((a,b) => a.width-b.width);
  return (sized[0] ?? choices.sort((a,b) => b.width-a.width)[0])?.url ?? null;
}
