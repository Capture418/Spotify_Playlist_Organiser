/** Cached years are optional metadata; never guess from titles or saved-at timestamps. */
export function releaseYear(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9]{4}$/.test(value) && value !== '0000' ? value : null;
}

/** Spotify dates have year, month or day precision. Invalid dates omit only the year. */
export function spotifyReleaseYear(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^([0-9]{4})(?:-([0-9]{2})(?:-([0-9]{2}))?)?$/.exec(value);
  if (!match || !releaseYear(match[1])) return null;
  if (match[2]) {
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3] ?? 1);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]!) return null;
  }
  return match[1]!;
}
