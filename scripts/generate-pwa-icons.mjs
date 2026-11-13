// Project-owned neutral library spines. Reproducible PNGs; no external tooling/assets.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const directory = new URL('../public/icons/', import.meta.url);
mkdirSync(directory, { recursive: true });
const bars = [[164, 174, 40, 182], [236, 132, 40, 224], [308, 152, 40, 204]];
const background = [18, 19, 19], ink = [213, 230, 172];
function inside(x, y, [left, top, width, height]) {
  const radius = 12;
  const cx = Math.max(left + radius, Math.min(x, left + width - radius));
  const cy = Math.max(top + radius, Math.min(y, top + height - radius));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}
function chunk(type, bytes) {
  const data = Buffer.concat([Buffer.from(type), bytes]); let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, data, checksum]);
}
for (const [size, name] of [[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']]) {
  const pixels = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let coverage = 0;
    for (const dy of [.25, .75]) for (const dx of [.25, .75]) if (bars.some(bar => inside((x + dx) * 512 / size, (y + dy) * 512 / size, bar))) coverage += .25;
    for (let c = 0; c < 3; c++) pixels[y * (size * 3 + 1) + 1 + x * 3 + c] = Math.round(background[c] * (1 - coverage) + ink[c] * coverage);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  writeFileSync(new URL(name + '.png', directory), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
}
writeFileSync(new URL('library.svg', directory), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#121313"/>${bars.map(([x,y,width,height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#d5e6ac"/>`).join('')}</svg>\n`);
