import test from 'node:test';
import assert from 'node:assert/strict';
import { spotifyLink, type LibraryItem } from './library.ts';
const id = 'a'.repeat(22);
const album: LibraryItem = { id: `album:${id}`, kind: 'album', title: 'Invented album', artists: ['Invented artist'], source: 'spotify', available: true, spotifyUrl: `https://open.spotify.com/album/${id}`, artworkUrl: null };
test('imported albums and playlists expose only their matching canonical Spotify links', () => {
  assert.equal(spotifyLink(album), album.spotifyUrl);
  const playlist: LibraryItem = { ...album, kind: 'playlist', id: `playlist:${id}`, ownerLabel: 'Invented owner', spotifyUrl: `https://open.spotify.com/playlist/${id}` };
  assert.equal(spotifyLink(playlist), playlist.spotifyUrl);
  for (const change of [{source:'demo' as const}, {available:false}, {spotifyUrl:null}, {id:'album:invalid'}, {id:`playlist:${id}`}]) assert.equal(spotifyLink({...album,...change}), null);
  for (const url of [`http://open.spotify.com/album/${id}`, `https://outside.invalid/album/${id}`, `https://open.spotify.com/playlist/${id}`, `https://open.spotify.com/album/${'b'.repeat(22)}`, `https://open.spotify.com/album/${id}?redirect=elsewhere`, 'javascript:alert(1)']) assert.equal(spotifyLink({...album,spotifyUrl:url}), null);
});
