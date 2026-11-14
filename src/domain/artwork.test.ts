import test from 'node:test';
import assert from 'node:assert/strict';
import { artworkUrl, selectArtwork, ARTWORK_ORIGINS } from './artwork.ts';
test('artwork permits exact HTTPS image hosts and rejects unsafe destinations', () => {
  for (const host of ARTWORK_ORIGINS) assert.equal(artworkUrl(host+'/image/invented'),host+'/image/invented');
  for (const value of [null, '', 'http://i.scdn.co/image/a', 'https://i.scdn.co.evil.invalid/image/a', 'https://user@i.scdn.co/image/a', 'https://i.scdn.co/image/a?token=x', 'https://i.scdn.co/image/a#x', 'https://127.0.0.1/a', 'data:image/png;base64,a', 'javascript:alert(1)', 'https://i.scdn.co/a/../b']) assert.equal(artworkUrl(value),null);
});
test('artwork selects a suitable size and tolerates missing or malformed images', () => {
 const image=(width:number)=>({width,url:`https://i.scdn.co/image/invented${width}`});
 assert.equal(selectArtwork([image(640),image(64),image(300)]),image(300).url);
 assert.equal(selectArtwork([image(64),image(128)]),image(128).url);
 for(const value of [undefined,null,[],[null,{}, {url:'https://outside.invalid/a'}],Array(21).fill(image(300))]) assert.equal(selectArtwork(value),null);
});
