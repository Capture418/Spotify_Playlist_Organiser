/** Public, non-personal assets only; never turn a URL into an arbitrary file path. */
const assets = new Map([
  ['/manifest.webmanifest', 'application/manifest+json'],
  ['/icons/library.svg', 'image/svg+xml'],
  ['/icons/apple-touch-icon.png', 'image/png'],
  ['/icons/icon-192.png', 'image/png'],
  ['/icons/icon-512.png', 'image/png'],
]);
export function pwaAssetType(path: string): string | undefined { return assets.get(path); }
