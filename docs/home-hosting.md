# Home hosting contract

How this app runs on Dad's home server. Dad confirmed it on 14 November 2026.
The platform is settled: build within it, and don't redesign it. Only ask Dad
when a requirement can't be met within it at all. Then send one message: what's
needed, why this contract can't meet it, and the smallest platform change that
would.

## Current state (14 Nov 2026)

- **The deploy helper is fixed and installed.** Deploys were refused with
  "token is missing or malformed" because the helper capped the job token at 255
  characters, and GitHub's new tokens are about 520. The limit is now 4096.
  Nothing in this repository needs to change for that. Re-run the deploy job
  once the checklist below is done.
- **The journal database exists.** The `music_journal` database and all four
  roles (below) are set up and empty. Both databases are backed up.
- **One-shot runs are installed:** the deploy's migrate step and maintenance
  tasks.
- **Nothing is deployed yet**, so the site returns 502. Don't start Spotify
  setup until a deploy reports `deployed` and `/health` answers.

## How a deploy works

1. A push to `main` runs CI on GitHub's runners. CI builds the image for
   `linux/amd64` and pushes it to GHCR. The image name must be all lower case.
2. The `deploy` job runs on Dad's runner (`runs-on: [self-hosted, music-deploy]`)
   and calls `/opt/music-runner/request-deploy`. It passes:
   - `IMAGE`: `ghcr.io/<owner>/<repo>@<digest>`, pinned by digest;
   - `GHCR_TOKEN`: `${{ secrets.GITHUB_TOKEN }}`; the job needs
     `permissions: packages: read`;
   - `APP_SECRETS`: `${{ toJSON(secrets) }}`;
   - `MIGRATE_COMMAND`: a JSON array, see "Migrations".
3. The server pulls the image, stops the old app, runs the migrate command,
   starts the new app, and waits up to 180 s for it to become healthy. If
   anything fails, the previous image comes back with its previous settings.
4. The job prints one outcome, plus the app's last 50 log lines:
   - `deployed`: the new image is running.
   - `rolled_back`: the new image failed, and the previous one is running again.
   - `failed`: the new image failed and there was no previous image (or that
     failed too). The app is stopped. If there was a previous image, Dad is
     needed.
   - `refused`: the request was wrong: the image or digest, a reserved or
     malformed setting, or a pull the token couldn't make.

   The job also prints the migrate command's exit code and its last 50 lines.
   The job fails unless the outcome is `deployed`.

Only workflows on `main` run on Dad's runner: pushes, `workflow_dispatch` and
`workflow_run`. Pull requests, other branches and other repositories are refused.
Use `concurrency: { group: deploy, cancel-in-progress: false }` on every job
that uses the runner, so deploys and tasks never overlap.

Deploy job:

```yaml
  deploy:
    needs: image
    runs-on: [self-hosted, music-deploy]
    permissions:
      packages: read
    concurrency:
      group: deploy
      cancel-in-progress: false
    steps:
      - run: /opt/music-runner/request-deploy
        env:
          IMAGE: ghcr.io/<owner>/<repo>@${{ needs.image.outputs.digest }}
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APP_SECRETS: ${{ toJSON(secrets) }}
          MIGRATE_COMMAND: '["node","dist/migrate.js"]'
```

Replace the migrate command with this app's real one.

## Settings and secrets

- Add them under the repository's Settings → Secrets and variables → Actions,
  named `APP_<NAME>`. For example, `APP_SPOTIFY_CLIENT_ID` reaches the app as
  `SPOTIFY_CLIENT_ID`. Secrets without the `APP_` prefix are not sent.
- Keys must be upper case (letters, digits and `_`). Values must be one line,
  at most 4096 characters, with no single quote and no backslash. At most 32
  keys.
- **Reserved:** the server sets these, and a secret with one of these names is
  refused: `DATABASE_URL`, `JOURNAL_DATABASE_URL`, `MIGRATION_DATABASE_URL`,
  `JOURNAL_MIGRATION_DATABASE_URL`, `PORT`, `NODE_ENV`, `PGHOST`, `PGPORT`,
  `PGUSER`, `PGPASSWORD` and `PGDATABASE`.
- A change takes effect on the next deploy. Re-running the last deploy job
  applies it straight away.

## What the app must do

- Listen on `PORT` (3000).
- Serve `GET /health`: 200 only when the database is reachable. Keep it open
  (no token) and minimal.
- Become healthy within **180 seconds** of starting.
- Stop cleanly on `SIGTERM` within **20 seconds**.
- Run as uid 1000 with a **read-only filesystem**, except `/tmp` (64 MB, wiped
  on restart). Limits: 512 MB RAM, 1 CPU, 256 processes, no capabilities.
- `node` must be in the image: the healthcheck uses it.
- Trust `X-Forwarded-Proto` and `Host` from nginx: TLS ends there.
- Network: outbound internet only. There's no access to anything else on the
  home network. That's intended, not a bug to work around.

## Databases

Both live in Postgres 16, in the app's own private instance. No TLS is needed:
the network is isolated.

| Database | Running app's role | Rights | Owner role (migrations, tasks) |
| --- | --- | --- | --- |
| `music` | via `DATABASE_URL` | SELECT, INSERT, UPDATE, DELETE on rows; sequences | via `MIGRATION_DATABASE_URL` |
| `music_journal` | via `JOURNAL_DATABASE_URL` | **SELECT and INSERT only**: it can never change or delete an entry | via `JOURNAL_MIGRATION_DATABASE_URL` |

- **The running app gets only `DATABASE_URL` and `JOURNAL_DATABASE_URL`.** It
  can't create, alter or drop tables, so it must not migrate at startup. If it
  tries, the deploy fails and rolls back.
- Each role can connect only to its own database.
- **Keep everything in the `public` schema.** The app's rights to new tables
  follow automatically from there. Another schema would leave the app with no
  access to it.
- The journal is append-only against the running app, not against migrations
  or tasks, which run as the owner.

## Migrations

- Put the command in `MIGRATE_COMMAND`, as a JSON array of 1 to 16 words, each
  at most 256 characters. It runs as argv with no shell, and the first word may
  not start with `-`.
- It runs from the **new** image, with the app stopped, in a container with the
  app's limits. It gets the app's settings, `DATABASE_URL`,
  `JOURNAL_DATABASE_URL`, `MIGRATION_DATABASE_URL` and
  `JOURNAL_MIGRATION_DATABASE_URL`. It must use the `MIGRATION_*` URLs.
- It must exit 0 within **15 minutes**. If it fails or times out, the new app
  never starts and the previous one comes back.
- **The database is not rolled back.** Every migration must leave the schema
  usable by the previous image too: expand only. Add columns and tables; drop
  or rename in a later deploy, once no running image needs the old shape.
  Prefer migrations that each run in one transaction.

## Maintenance tasks

A one-off command from **the image currently deployed**, with the app stopped
and then brought back:

```yaml
name: maintenance
on:
  workflow_dispatch:
    inputs:
      task:
        description: Task to run
        type: choice
        options: [reindex]
permissions:
  contents: read
jobs:
  task:
    runs-on: [self-hosted, music-deploy]
    concurrency:
      group: deploy
      cancel-in-progress: false
    steps:
      - run: /opt/music-runner/request-task
        env:
          TASK_COMMAND: '["node","dist/tasks/${{ inputs.task }}.js"]'
          APP_SECRETS: ${{ toJSON(secrets) }}
```

- Start it with "Run workflow" in the Actions tab, or
  `gh workflow run maintenance -f task=<name>`.
- It gets the same environment as a migration, and the same 15-minute limit.
  Optional `IMAGE`: if set, the task is refused unless that digest is the one
  deployed.
- With nothing deployed, a task is refused.
- The job prints `task_succeeded` or `task_failed`, the exit code, the task's
  last 50 log lines, and whether the app came back healthy. It fails unless
  both went well.
- A task's settings exist on the server only while it runs.

## Web

- The app is served at `https://music.darktrain.co.uk`, reachable only on the
  home network and the VPN.
- The Spotify redirect URIs are `https://music.darktrain.co.uk/callback` and,
  for local development, `http://127.0.0.1:3000/callback`. Open the app at
  `127.0.0.1`, not `localhost`.
- nginx's access log never records query strings or the Referer. Its error log
  records a request in full if the app can't answer it, so run Spotify sign-in
  only against a healthy app.

## Setup mode (agreed design)

- Switch it on with an `APP_` secret (for example `APP_SETUP_MODE=1`) and a
  redeploy. Switch it off by deleting the setup secrets in the same change and
  redeploying.
- The setup token goes in a POST body, never a URL. Use a session cookie that
  is `Secure`, `HttpOnly` and `SameSite`.
- Bind the OAuth `state` to that session, and use PKCE.
- Check the owner by Spotify user ID. Rate-limit token attempts and compare the
  token in constant time.
- Library routes are closed during setup. Setup refuses to run again once it
  has succeeded.
- `/health` stays open and minimal.
- A rollback restores the last healthy settings. A failed return to normal can
  therefore bring setup mode back, and refusing to re-run makes that harmless.

## Logs and secrets

- Never log secrets, tokens, authorisation codes, session IDs or connection
  URLs. The app's last log lines appear in job output.

## Backups

- Both databases are backed up separately every four hours, encrypted, off the
  server. Each dump is capped at 5 MB.
- Restoring `music` never touches `music_journal`. Restores are Dad's job; after
  one, assume up to 4 hours of data may be missing.

## Local development

- In this repo, `docker compose up` runs the app with `postgres:16-alpine`.
- Mirror production locally: two databases, a migration step run before the
  app, and an app role limited to rows (SELECT and INSERT only on the journal).
  Then "works locally" means it works at home.
