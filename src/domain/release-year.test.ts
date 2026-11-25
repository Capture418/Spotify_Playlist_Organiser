import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseYear, spotifyReleaseYear } from './release-year.ts';

test('Spotify year, month and day precision retain the supplied edition year', () => {
  for (const value of ['1973', '1973-03', '1973-03-24']) assert.equal(spotifyReleaseYear(value), '1973');
  assert.equal(spotifyReleaseYear('2024-02-29'), '2024');
  assert.equal(spotifyReleaseYear('2000-02-29'), '2000');
});

test('missing, malformed and impossible release dates omit the year', () => {
  for (const value of [undefined, null, 1973, '', '0000', '197', '19730', ' 1973', '1973-00', '1973-13', '1973-02-29', '1900-02-29', '1973-04-31', '1973-01-00', '1973-01-01T00:00:00Z', '<script>1973</script>']) {
    assert.equal(spotifyReleaseYear(value), null, String(value));
  }
  for (const value of [undefined, null, 1973, '1973-01', '0000', '1973<script>']) assert.equal(releaseYear(value), null);
});
