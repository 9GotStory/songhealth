# Development runtime — UID-1000 rootless Podman + systemd Quadlet (Feature 002 T036, T037)

The **single development runtime** for Songhealth (Product Owner decision 2026-10-28): one
application server, one PostgreSQL database, one media store and one test target, owned
end-to-end by the local workspace user (`thanakorn`, UID 1000). It reuses the accepted
production pattern (rootless Podman + systemd Quadlet, digest-pinned images, podman secrets,
private network, marker-guarded persistent stores) with development simplifications: the
Astro dev server instead of the built image, and loopback publication only.

It replaced the earlier UID-1001 (`multica-agent`) runtime at `127.0.0.1:4322`, which was
deleted on 2026-10-29 together with that account's production-foundation stack (T037). No data,
media or credentials were taken from it: this runtime started from a fresh database.

## Topology

| Resource | Value |
| --- | --- |
| Origin | `http://127.0.0.1:4324/` — loopback only; the same port inside the container keeps the origin, the Vite HMR socket and `EMDASH_SITE_URL` equal |
| Units (`~/.config/containers/systemd/`) | `songhealth-dev.network`, `songhealth-dev-db-data.volume`, `songhealth-dev-media.volume`, `songhealth-dev-db.container`, `songhealth-dev-app.container` (sources in `deploy/dev-quadlet/`) |
| Services | `songhealth-dev-db.service`, `songhealth-dev-app.service` (user manager; started with the user session) |
| Application | container `songhealth-qdev-app`: `node:26.13.0-bookworm-slim@sha256:bc0a2afd…` (the production build base), Astro 7.3.5 + EmDash 1.1.0 dev server, dependencies installed with npm 12.2.1 |
| Database | container `songhealth-qdev-db`: `postgres:18.6@sha256:fc973eb9…` (same as production), database `songhealth_qdev`, bootstrap superuser `songhealth_qdev_admin`, least-privilege app role `songhealth_qdev_app` (owns the database and schema `public`), no host port |
| Network | `songhealth-qdev` (private) |
| Volumes | `songhealth-qdev-db-data` (PostgreSQL 18 parent path `/var/lib/postgresql`), `songhealth-qdev-media` (the application's stable `./media` path, marker `.songhealth-qdev-media-store`) |
| Source | `~/dev/songhealth-quadlet` — a full clone of the workspace repository at a **detached, promoted commit**, bind-mounted at `/src`; the promoted commit is recorded in `.songhealth-qdev-source-identity` |
| Dev configuration | `deploy/dev-quadlet/astro.dev.config.mjs`: the canonical `astro.config.mjs` plus the development-only T021 public-read fixture route `/__feature002/public-reads`, which exists in `astro dev` only and answers only requests carrying the route token |
| Secrets | podman secrets `songhealth-qdev-db-password`, `-app-password`, `-migration-database-url`, `-encryption-key` (EmDash format `emdash_enc_v1_<43 base64url>`), and the T021 fixture route token `songhealth-qdev-t021-route-token` |
| Local state | `~/.local/state/songhealth-qdev/` (0700): development PAT `dev-pat` (0600), role fixture PAT `role-fixture-pat` (0600), T021 route token client copy `t021-route-access.json` (0600), `backups/`; `~/.local/share/songhealth-qdev/initdb/` (app-role init script) |

## Install

```bash
cd ~/dev/songhealth                          # any checkout that contains T036
scripts/dev-runtime-install.sh --sha <commit>
```

After the first install, run every runtime script from the runtime's own checkout,
`~/dev/songhealth-quadlet/scripts/`: those scripts always belong to the promoted commit. A
checkout that predates T036 (such as a branch at the Phase 1 commits) still has the Phase 1
scripts, which do not operate this runtime.

The installer converges the host to this runtime and is **safe to re-run**. Each step checks
the real state first and only adds what is missing:

1. **Preflight.** UID 1000; the required tools; the user manager is running; port 4324 is
   free; at least 4 GiB of available memory (6 GiB recommended).
2. **Source.** Clones the workspace repository into `~/dev/songhealth-quadlet` at the commit,
   then continues with **that commit's** installer, so the runtime is defined by exactly one
   commit.
3. **Images and dependencies.**
   - Pulls the two digest-pinned images.
   - Runs `npm ci` with npm 12.2.1 in a temporary container from the app image. It re-runs
     only when `package-lock.json`, the image or the npm version changes.
4. **Secrets.**
   - Generates the four runtime secrets once.
   - Generates the T021 route token pair: a podman secret plus a 0600 client copy. It replaces
     the pair whole if half of it is missing.
   - Values pass only through stdin pipes, so they never reach argv, the environment or any
     output.
5. **Volumes.**
   - Creates the two labeled volumes and the media store marker.
   - Never adopts an unlabeled volume or a media volume without its marker.
6. **Units.** Copies the units and the init script, checks the Quadlet generation, then runs
   `daemon-reload`.
7. **Database.**
   - On the first start, the official image initializes the cluster and runs
     `initdb/10-songhealth-app-role.sh`. That script creates the app role, reading its
     password through psql from the mounted secret, with statement logging disabled.
   - The installer then verifies the role vector.
8. **Application.**
   - Starts the app. On its first request in development EmDash applies its core migrations
     itself (`astro.config.mjs` sets `migrations.dev: "auto"`), so no separate migration
     step exists.
   - Then runs EmDash's native `setup/dev-bypass` **once**. That call applies the Feature 002
     seed, creates the development admin `dev@emdash.local` and mints the development PAT
     into `dev-pat` (0600, never printed).
   - Then creates the role fixture once: a second native account `role-fixture@songhealth.test`
     (Author) with its own PAT in `role-fixture-pat` (0600) for the T019/T020 role cases.
     EmDash has no native way to create it here: an invite completes only with a passkey, and
     browsers reject the rpId `127.0.0.1`. So the installer writes the same user row as
     EmDash's dev-bypass and a token row in EmDash's own format (SHA-256 hash only). It
     re-mints only the PAT when the file is missing, and stops if the account was left with
     another role or disabled.
9. **Verify.** Runs `scripts/dev-runtime-verify.sh`.

## Daily use

- **Admin login.** Use EmDash's development-only bypass:
  `http://127.0.0.1:4324/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`. Passkeys
  need a domain origin: browsers reject the IP literal `127.0.0.1` as a WebAuthn rpId. To
  use passkeys later, change the origin to `http://localhost:4324` in the app unit; that is
  a reviewed change.
- **Logs.** `journalctl --user -u songhealth-dev-app.service -f` (and `…-db.service`).
- **Start/stop.**
  - `systemctl --user start|stop|restart songhealth-dev-app.service`. Stopping the database
    also stops the app.
  - Both services start with the user session. Linger is **not** enabled, so the runtime
    stops when the last session ends. Enabling linger (`loginctl enable-linger`) is a
    separate decision.
- **Browser and API tests.** Target `http://127.0.0.1:4324`.
  - **Credentials.** Never print, commit or copy the PAT or the route token into evidence.
    Do not re-run `setup/dev-bypass` as test setup.
  - **Variables.** `scripts/dev-runtime-env.sh <command>` runs a command with
    `PLAYWRIGHT_BASE_URL`, the credential file paths (`SONGHEALTH_DEV_ACCESS`,
    `SONGHEALTH_ROLE_FIXTURE_ACCESS`, `SONGHEALTH_T021_ROUTE_ACCESS`) and
    `SONGHEALTH_ADMIN_SESSION=dev-bypass`. A variable set beforehand, even to empty, wins.
  - **Ordinary suites:**

    ```bash
    scripts/dev-runtime-env.sh npm run test:browser -- tests/browser/<suite>.spec.ts --workers=1
    ```

    Without `SONGHEALTH_ROLE_FIXTURE_ACCESS` the T019/T020 role cases skip. The role cases
    change the fixture's role and restore it to Author at the end.
  - **Admin UI suites** (`cms-lifecycle-ui.spec.ts`, `cms-editor.spec.ts`).
    `SONGHEALTH_ADMIN_SESSION=dev-bypass` signs the test browser in through EmDash's
    development-only `auth/dev-bypass` session route (Product Owner decision 2026-10-29). For
    the existing dev admin it only sets the session cookie; each test logs out afterwards.
    Without it the authenticated journeys skip with that prerequisite.
  - **T021 public-read suite.** It runs only through its coordinator, from a checkout at the
    promoted commit:

    ```bash
    scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs
    ```

    It holds (exit 3, nothing run) unless verify passes and the runtime source equals that
    checkout's HEAD.
  - **Residue.** At the end of a task run, `scripts/dev-runtime-residue.sh` counts what the tests
    left behind: synthetic entries (live or in trash), media, terms, bylines, redirects and menu
    items. It exits 1 while any remain.
  - **The 404 log.** EmDash logs every miss, including the tests' deliberate requests for
    missing pages. That log can only be cleared as a whole, so its synthetic misses stay until
    one clear just before the Product Owner's review (Feature 003 handoff, #67). Residue
    reports them and does not fail on them.
- **Source edits.** Make them in the workspace and promote them. The runtime checkout is never
  edited in place: the app refuses to start when its HEAD is not the promoted commit, and
  verify fails on a dirty tree.

## Promote a new commit

```bash
~/dev/songhealth-quadlet/scripts/dev-runtime-update.sh --sha <commit>   # [--no-backup] [--force]
```

The update runs these steps:

1. Refuses when an Admin page was opened in the last 10 minutes, and lists those page loads. The
   restart in steps 3–5 would cut off someone editing in the Admin, and the Product Owner uses
   this Admin. Verify's own probe of the Admin does not count, and neither do the browser suites'
   own Admin sessions: `tests/browser/cms.helpers.ts` records each one's start and end in
   `~/.local/state/songhealth-qdev/admin-test-sessions` when the suite runs through
   `scripts/dev-runtime-env.sh`.
   - Pass `--force` only for Admin loads you know are your own and the guard still lists, such as
     a test that failed before it logged out.
   - Before a restart the update does not make (`systemctl --user restart …`), run
     `scripts/dev-runtime-admin-activity.sh`. It lists recent Admin loads with this same filter, so
     verify's probe never reads as a person.
   - The guard sees page loads only. The Admin routes its screens in the browser
     (`@tanstack/react-router`), so an editor who opened it earlier and kept working passes
     unseen.
2. Backs up the database and media to `~/.local/state/songhealth-qdev/backups/<UTC>/`.
3. Stops the app.
4. Moves the checkout to the commit and records it.
5. Hands over to that commit's installer. The installer runs `npm ci` only if the lockfile
   changed, refreshes changed units, starts the app and runs verify.

Keep the backup whenever the commit can change data: a new `package-lock.json` (an EmDash upgrade
runs its migrations on the first request), the seed, the content model, or a model-update step.
A commit that changes only code, tests or docs can skip it with `--no-backup`. That suits the
repeated promotions of a test-first loop, where the last backup taken already holds the data.

A promotion never changes the content model of the existing database. When the commit's
`seed/seed.json` changes the model, verify reports the content-model check as FAIL at the end of
the promotion until the model-update step below has run.

If that commit upgrades EmDash, its new core migrations run on the first request. Going
**back** afterwards means restoring the pre-update backup. Restore admits a backup only when
its recorded commit equals the runtime's promoted commit, so first point the checkout back at
the backup's commit while the app is stopped:

```bash
cd ~/dev/songhealth-quadlet
systemctl --user stop songhealth-dev-app.service
git -C ~/dev/songhealth-quadlet checkout --detach <old-commit>
printf '%s\n' <old-commit> > ~/dev/songhealth-quadlet/.songhealth-qdev-source-identity
scripts/dev-runtime-restore.sh --confirm <dir>/qdev-db-<ts>.dump <dir>/qdev-media-<ts>.tar \
  <dir>/qdev-checksums-<ts>.sha256 <dir>/qdev-meta-<ts>.txt
scripts/dev-runtime-install.sh --sha <old-commit>    # reinstalls deps/units if needed, starts, verifies
```

## Update the content model

EmDash applies the seed only when it sets up a fresh database. An existing database gets a later
content model from the model-update step:

```bash
~/dev/songhealth-quadlet/scripts/dev-runtime-model-update.sh
```

- **What it does.**
  - It runs `scripts/model-update.mjs` in the app container. The script compares the promoted
    commit's seed with the database through EmDash's native schema API, with the development PAT
    on standard input.
  - When changes are pending, the step backs up the database and media to
    `~/.local/state/songhealth-qdev/backups/<UTC>/`, applies the changes, reads the model again
    to confirm it, and runs verify.
  - With nothing pending, it changes nothing and takes no backup, so it is safe to run again.
- **What it manages.** For each collection in the seed:
  - its URL pattern;
  - its `supports` values: it adds the missing ones and removes none, and SEO also sets the flag
    that puts the collection in the native sitemap;
  - whether it is routable;
  - its fields: it creates the seed's fields that the collection lacks, such as Personnel's
    `leadership_order`, and removes none. A new seed field also joins the approved field list of
    the Feature 002 suite that allow-lists that collection (`tests/browser/cms-personnel.spec.ts`,
    `cms-facilities.spec.ts`), or that suite fails on the unexpected field.

  For each taxonomy the seed gives reference terms, such as the Document Types `policy`, `plan` and
  `result` that the About pages list by, it adds the terms whose slug the taxonomy lacks. A term
  staff relabelled keeps its label, and no term is removed.

  For each menu the seed declares, such as the three Homepage menus staff curate, it creates the
  menu, empty, when the database has no menu of that name. A menu staff relabelled keeps its label,
  and no menu or item is removed.

  A URL pattern that the database already has with another value, a field it has with another
  type, or a collection or taxonomy the database lacks, stops the step before it changes anything.
  Replacing a pattern would move every public address of the collection, and changing a field's
  type would change its stored values, so each is a Product Owner decision, not a step.
- **Types.** Nothing needs regenerating. The repository does not use EmDash's generated types, and
  the dev server rewrites its untracked `emdash-env.d.ts` after each schema change.
- **Production.** The same script updates a production database:
  `production-foundation.md` §7.4.

## Demo dataset

The demo dataset is realistic content that fills every page and every Homepage section, so the
Product Owner can review the site before real content exists (#66; spec #51 "Demo dataset",
approved Q4). It is development-only: it never enters the seed, a production database or a
production image. It stays installed on this runtime until the Product Owner asks for its removal.
That is the Product Owner's exception to the task-run cleanup rule (2026-10-29).

```bash
scripts/dev-runtime-env.sh node scripts/demo-dataset.ts add      # install it, or complete it
scripts/dev-runtime-env.sh node scripts/demo-dataset.ts remove   # take all of it away
```

- **What it holds.** `scripts/demo-dataset/content.ts` defines it: News (some of it Health News),
  Activities with and without pictures, Announcements (current, upcoming and closed), Services,
  Health Services in three demo Areas, Health Content, Health Reports with their Documents,
  Documents of the types policy, plan and result (one superseded by its successor), Personnel
  with two Leadership, the reserved Basic Pages, Office Contact values with the Facebook and
  YouTube handles, and items in the three Homepage menus. Each Document's file is a one-page Thai
  PDF that `add` prints with Playwright's Chromium, the one the browser suites use, in the site's
  own Noto Sans Thai (#66 comment 6541144669). A runtime that holds a PDF of the same name keeps it
  until `remove` and `add` print it again.
- **How it is marked.**
  - Every title starts with `[ตัวอย่าง]`. The Personnel prefix stays empty, so each name starts
    with the mark (#61 comment 6514145827).
  - Entry slugs, term slugs and media filenames start with `demo-`. The reserved Basic Pages
    (`about`, `organization`, `privacy`, `accessibility`) keep their reserved slugs, so the
    commands recognise them by the title mark.
  - Each menu item it adds has the CSS class `demo-dataset`, which the Homepage never renders.
  - Its dates count from the day `add` runs: an Announcement it shows as current closes 30 to 45
    days later, and one has no closing date.
- **`add`** reads the runtime through the native API and installs what is missing:
  - it creates the missing terms, pictures, PDFs and entries, and takes the dataset's entries out
    of the trash;
  - it publishes each dataset entry that is not published;
  - it fills each Homepage menu that is empty or holds only the dataset's items, and each Office
    Contact value and handle that is unset.

  An entry it finds keeps its fields: to bring back the dataset as defined, or to move its dates
  to today, run `remove` and then `add`. What holds content the dataset did not make stays as it
  is, and `add` names it on a `left … as it is` line: a Basic Page at a reserved slug whose title
  lacks the mark, a menu with an item the dataset did not add, an Office Contact value or a handle
  with another value.
- **`remove`**:
  - it takes the dataset's items out of the menus;
  - it moves each demo entry to the trash and purges it, including one in the trash already or
    one the dataset no longer lists;
  - it deletes the demo terms, pictures and PDFs, so an entry of the office's own that used one
    loses it;
  - it unsets each Office Contact value and empties each handle that still holds the dataset's
    value. The settings API can empty a handle but not delete it, and the site shows an empty
    handle as unset.
- **Each command confirms its work.** After it changes the runtime, it reads the runtime again and
  plans once more. It exits 0 when nothing is left to do, 1 when something is (it names what), and
  2 for a wrong argument. A second `add` therefore changes nothing.
- **Credentials.** The commands act as `dev@emdash.local` with the development PAT that
  `SONGHEALTH_DEV_ACCESS` names, and never print it. Only the development-only `setup/dev-bypass`
  creates that account, so the commands cannot run against production.
- **Tests.** The browser suites tolerate the dataset. They assert on their own uniquely titled
  fixtures, and a test of an empty section returns the runtime's own entries to draft and
  publishes them again at their own dates (`tests/browser/public.helpers.ts` `BorrowedEntries`).
  `tests/browser/public-demo-dataset.spec.ts` checks that the installed dataset fills every page
  and every Homepage section, and skips while the dataset is not installed. The residue scan
  counts only synthetic fixtures, so the dataset never counts as residue.

## Verify

`scripts/dev-runtime-verify.sh` is read-only and prints one PASS/FAIL line per check, then
`VERIFY: PASS` or `VERIFY: FAIL`. It checks:

- both services are active and both containers healthy;
- publication is loopback 4324 only, and the database has no host port;
- the public SSR marker is served and the native Admin UI is reachable;
- EmDash setup is complete;
- `emdash migrate --check` reports no pending or unknown migrations (run inside the app container);
- the least-privilege app role owns `songhealth_qdev`;
- the runtime source is the promoted commit, with a clean tree;
- EmDash accepted `EMDASH_ENCRYPTION_KEY`;
- the development PAT authenticates as `dev@emdash.local` (Administrator);
- the role fixture PAT authenticates as `role-fixture@songhealth.test`, enabled, with role Author;
- the dev-only T021 fixture route answers its 0600 route token and refuses requests without it;
- the database has the promoted seed's content model, fields, reference terms and menus: the
  model-update step's read-only check, run in the app container.

Runtime results are interpreted only against the commit verify reports.

## Backup and restore

- **Backup.** `scripts/dev-runtime-backup.sh <existing-dir>` writes four files: a `pg_dump -Fc`
  of `songhealth_qdev`, a ustar archive of the media volume, a sha256 manifest and provenance
  metadata.
- **Restore.** `scripts/dev-runtime-restore.sh --confirm <dump> <media-tar> <checksums> <meta>`
  restores into the running database with the app stopped. It admits only a backup whose
  recorded commit equals the runtime's promoted commit (see the rollback steps above).
- **What a backup covers.** Database and media only. The secrets (including
  `EMDASH_ENCRYPTION_KEY`, needed to read encrypted plugin settings) live in the podman secret
  store and are not part of any backup.

## Uninstall

- `scripts/dev-runtime-uninstall.sh` stops the runtime and removes its units. It keeps the
  data, secrets, PAT, backups and checkout, so the installer brings the runtime back as it was.
- `scripts/dev-runtime-uninstall.sh --purge` additionally deletes the two volumes, the four
  runtime secrets, the T021 route token pair, the network and both PATs, after a typed
  confirmation. It never deletes the checkout
  or backups.

## Guards and failure handling

| Symptom | Cause and response |
| --- | --- |
| The app exits with `refusing` (exit 78; not restarted) | The message names the cause: dependencies are missing (re-run the installer), the checkout is not the promoted commit (use `update`), the media store marker is missing, or a secret is malformed. |
| The database refuses: "no database cluster and no first-initialization authorization" | The data volume was recreated or emptied. Restore a backup; never let it re-initialize silently. |
| Install stops: "app role missing or wrong" | The first initialization failed partway. The database holds no application data yet, so run `uninstall --purge` and install again. |
| Install refuses an unlabeled volume, a media volume without its marker, or partial secrets | A foreign or half-made resource. Inspect it; purge only what this runtime created. |
| Port 4324 is in use | Something else listens there. There is no fallback port: resolve the conflict at its cause. |
| The PAT check fails | `dev-pat` is missing, has the wrong mode or was revoked. Minting a new one means running `setup/dev-bypass?token=1`, which rotates the token; do that only deliberately. It also applies the seed again, which empties the seed's menus, the Homepage menus included (emdash 1.1.0 `src/seed/apply.ts`): note their items first and put them back in the Admin. |
| The role fixture check fails | `role-fixture-pat` is missing, or a role test was interrupted and left the account with another role or disabled. Restore it in the Admin (Users: Author, enabled), or delete the file; then re-run the installer, which re-mints the PAT. |
| The content-model check fails | The database lacks part of the promoted seed's model: run `scripts/dev-runtime-model-update.sh`. If the step reports a problem instead, a URL pattern or a field type differs from the seed's, or a collection or taxonomy is missing. Bring that to the Product Owner before changing any of them. |
| The T021 coordinator holds | The message names the prerequisite. Verify fails: fix the runtime first. The runtime is at another commit: promote the tested commit. The route is missing (404): the commit predates the dev configuration. The token is unprovisioned (503) or does not match (403): delete `t021-route-access.json` and re-run the installer. |

**Never run `podman volume prune` or `podman system prune --volumes` while the runtime is
stopped.** Stopped containers do not hold the volumes, so prune deletes the development database
and media. **Never run `podman image prune -a` or `podman system prune -a` either.** This
account's storage also holds the accepted Feature 001 production image
`localhost/songhealth-app:0.0.1@sha256:4cfccf41…`, which no rebuild can reproduce
(`docs/operations/production-foundation.md` §4.5).

## Boundaries

- Production definitions (`deploy/quadlet/`, `deploy/Containerfile`,
  `docs/operations/production-foundation.md`) are unchanged.
- This runtime must not grow into a parallel production stack. T022/T028 remain pending.
- The T021 fixture route exists only in this runtime's `astro dev`. `astro build` and
  `deploy/Containerfile` never load the dev configuration or `tests/browser/`.
