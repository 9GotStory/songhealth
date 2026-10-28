# Development runtime — UID-1000 rootless Podman + systemd Quadlet (Feature 002 T036)

The **single development runtime** for Songhealth (Product Owner decision 2026-10-28): one
application server, one PostgreSQL database, one media store and one test target, owned
end-to-end by the local workspace user (`thanakorn`, UID 1000). It reuses the accepted
production pattern (rootless Podman + systemd Quadlet, digest-pinned images, podman secrets,
private network, marker-guarded persistent stores) with development simplifications: the
Astro dev server instead of the built image, and loopback publication only.

It replaces the earlier UID-1001 (`multica-agent`) runtime at `127.0.0.1:4322`. That runtime is
**left untouched** — not stopped, migrated, copied or deleted — until a separate Product Owner
deletion decision. It is no longer a development or test target, and nothing (data, media or
credentials) is taken from it: this runtime starts from a fresh database.

## Topology

| Resource | Value |
| --- | --- |
| Origin | `http://127.0.0.1:4324/` — loopback only; the same port inside the container keeps the origin, the Vite HMR socket and `EMDASH_SITE_URL` equal |
| Units (`~/.config/containers/systemd/`) | `songhealth-dev.network`, `songhealth-dev-db-data.volume`, `songhealth-dev-media.volume`, `songhealth-dev-db.container`, `songhealth-dev-app.container` (sources in `deploy/dev-quadlet/`) |
| Services | `songhealth-dev-db.service`, `songhealth-dev-app.service` (user manager; started with the user session) |
| Application | container `songhealth-qdev-app`: `node:24.21.0-bookworm-slim@sha256:d6aa754f…` (the production build base), Astro 7.3.5 + EmDash 1.1.0 dev server, dependencies installed with npm 12.2.0 |
| Database | container `songhealth-qdev-db`: `postgres:18.6@sha256:fc973eb9…` (same as production), database `songhealth_qdev`, bootstrap superuser `songhealth_qdev_admin`, least-privilege app role `songhealth_qdev_app` (owns the database and schema `public`), no host port |
| Network | `songhealth-qdev` (private) |
| Volumes | `songhealth-qdev-db-data` (PostgreSQL 18 parent path `/var/lib/postgresql`), `songhealth-qdev-media` (the application's stable `./media` path, marker `.songhealth-qdev-media-store`) |
| Source | `~/dev/songhealth-quadlet` — a full clone of the workspace repository at a **detached, promoted commit**, bind-mounted at `/src`; the promoted commit is recorded in `.songhealth-qdev-source-identity` |
| Secrets | podman secrets `songhealth-qdev-db-password`, `-app-password`, `-migration-database-url`, `-encryption-key` (EmDash format `emdash_enc_v1_<43 base64url>`) |
| Local state | `~/.local/state/songhealth-qdev/` (0700): development PAT `dev-pat` (0600), `backups/`; `~/.local/share/songhealth-qdev/initdb/` (app-role init script) |

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
   - Runs `npm ci` with npm 12.2.0 in a temporary container from the app image. It re-runs
     only when `package-lock.json` or the image changes.
4. **Secrets.** Generates the four podman secrets once. Values pass only through stdin pipes
   from shell builtins, so they never reach argv, the environment or any output.
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
- **Programmatic Admin/API tests.**
  - Read the PAT from `~/.local/state/songhealth-qdev/dev-pat`. Never print, commit or copy
    it into evidence.
  - Do not re-run `setup/dev-bypass` as test setup.
  - Target `http://127.0.0.1:4324` (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324`).
- **Source edits.** Make them in the workspace and promote them. The runtime checkout is never
  edited in place: the app refuses to start when its HEAD is not the promoted commit, and
  verify fails on a dirty tree.

## Promote a new commit

```bash
~/dev/songhealth-quadlet/scripts/dev-runtime-update.sh --sha <commit>   # [--no-backup]
```

The update runs these steps:

1. Backs up the database and media to `~/.local/state/songhealth-qdev/backups/<UTC>/`.
2. Stops the app.
3. Moves the checkout to the commit and records it.
4. Hands over to that commit's installer. The installer runs `npm ci` only if the lockfile
   changed, refreshes changed units, starts the app and runs verify.

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
- the development PAT authenticates.

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
  secrets, the network and the PAT, after a typed confirmation. It never deletes the checkout
  or backups.

## Guards and failure handling

| Symptom | Cause and response |
| --- | --- |
| The app exits with `refusing` (exit 78; not restarted) | The message names the cause: dependencies are missing (re-run the installer), the checkout is not the promoted commit (use `update`), the media store marker is missing, or a secret is malformed. |
| The database refuses: "no database cluster and no first-initialization authorization" | The data volume was recreated or emptied. Restore a backup; never let it re-initialize silently. |
| Install stops: "app role missing or wrong" | The first initialization failed partway. The database holds no application data yet, so run `uninstall --purge` and install again. |
| Install refuses an unlabeled volume, a media volume without its marker, or partial secrets | A foreign or half-made resource. Inspect it; purge only what this runtime created. |
| Port 4324 is in use | Something else listens there. There is no fallback port: resolve the conflict at its cause. |
| The PAT check fails | `dev-pat` is missing, has the wrong mode or was revoked. Minting a new one means running `setup/dev-bypass?token=1`, which rotates the token; do that only deliberately. |

**Never run `podman volume prune` or `podman system prune --volumes` while the runtime is
stopped.** Stopped containers do not hold the volumes, so prune deletes the development database
and media.

## Boundaries

- Production definitions (`deploy/quadlet/`, `deploy/Containerfile`,
  `docs/operations/production-foundation.md`) are unchanged.
- This runtime must not grow into a parallel production stack. T022/T028 remain pending.
- The browser tests that still assume the retired runtime are adapted to this origin in their
  own tasks. That includes the T021 coordinator, which assumes the UID-1001 controller and its
  PAT loader. Setting `PLAYWRIGHT_BASE_URL` alone is not enough.
