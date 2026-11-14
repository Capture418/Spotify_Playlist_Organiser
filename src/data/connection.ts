export type LibraryApi = <T>(path: string, csrf: string, body?: unknown) => Promise<T>;

/** Only the server's expected PKCE authorisation destination may leave this origin. */
export async function authorisationLocation(api: LibraryApi, origin: string): Promise<string> {
  const response = await api<{ authorizeUrl?: unknown }>('login', '', {});
  if (typeof response.authorizeUrl !== 'string') throw Error('Sign-in response was invalid. Please retry.');
  const url = new URL(response.authorizeUrl);
  const scopes = url.searchParams.get('scope')?.split(' ').sort().join(' ');
  const keys = ['client_id', 'response_type', 'redirect_uri', 'scope', 'state', 'code_challenge_method', 'code_challenge'];
  if (url.origin !== 'https://accounts.spotify.com' || url.pathname !== '/authorize' || url.username || url.password || url.hash ||
      [...url.searchParams.keys()].some(key => !keys.includes(key)) || keys.some(key => url.searchParams.getAll(key).length !== 1) ||
      url.searchParams.get('response_type') !== 'code' || url.searchParams.get('code_challenge_method') !== 'S256' ||
      url.searchParams.get('redirect_uri') !== origin + '/callback' || !(origin.startsWith('https://') || origin === 'http://127.0.0.1:3000') ||
      !/^[a-zA-Z0-9]{32}$/.test(url.searchParams.get('client_id') ?? '') ||
      !/^[a-zA-Z0-9_-]{43}$/.test(url.searchParams.get('state') ?? '') ||
      !/^[a-zA-Z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') ?? '') ||
      scopes !== 'playlist-read-collaborative playlist-read-private user-library-read') {
    throw Error('Sign-in destination was rejected. Please retry.');
  }
  return url.href;
}
