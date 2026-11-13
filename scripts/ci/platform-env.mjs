// Invented values only; never import operational settings into synthetic resources.
export const platformEnv = {
 NODE_ENV:'production',PORT:'3000',DATABASE_URL:'postgres://music_app:invented-local-app-only@db:5432/music',
 ORGANISER_ORIGIN:'https://music.example.invalid',ORGANISER_CALLBACK:'https://music.example.invalid/callback',
 ORGANISER_ACCOUNT:'11111111-1111-4111-8111-111111111111',ORGANISER_OWNER:'invented-owner',SPOTIFY_CLIENT_ID:'a'.repeat(32),
 ORGANISER_CREDENTIAL_KEYS:'v1:'+'11'.repeat(32),ORGANISER_CREDENTIAL_CURRENT:'v1',
 ORGANISER_SNAPSHOT_KEYS:'v1:'+'22'.repeat(32),ORGANISER_SNAPSHOT_CURRENT:'v1',
 SETUP_MODE:'1',SETUP_TOKEN:'s'.repeat(43),
};
