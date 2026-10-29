# T036 — Single development runtime (UID-1000 rootless Quadlet): evidence

**Status: EXECUTED — offline checks, live install/verify and the 2026-10-28T23:07Z recheck
PASS; awaiting Product Owner acceptance.** Claude Code self-review only (Constitution 5.0.0);
no external review exists.

## Authorization and scope

- **Product Owner decisions, 2026-10-28** (Claude Code session; recorded in PR #40 and PR #41):
  - Codex and ChatGPT are removed from the workflow.
  - Development uses Claude Code + Spec Kit + GitHub until Feature 002 is complete.
  - Dev-bypass is used first.
  - There is a single development runtime: the UID-1000 Quadlet at `http://127.0.0.1:4324`.
  - The UID-1001 runtime is left untouched (not used, stopped, migrated or deleted) until a
    separate deletion decision.
  - The live install was authorized once the offline checks passed, with a one-time
    dev-bypass setup and a 0600 development PAT.
- **Commits.**
  - Installed commit `a52d02d7a1d38b9fde7b03feb085a36635a0a4c2` (branch
    `task/002-dev-runtime-quadlet`).
  - Parents: merge `55e23d4` (accepted `cd390b0` + `5d31acc`) over governance `97ea687`
    (PR #40, base `ed7d6bc`).
- **Host.** Fedora 44 (kernel 7.2.7), podman 5.8.4 with netavark/aardvark-dns, Quadlet 5.8.4,
  systemd 259.8, SELinux Enforcing, cgroups v2, user `thanakorn` (UID 1000), linger off.

## Root causes fixed (2026-10-28 functional review)

| # | Defect in the accepted `5d31acc` installer and the Phase 2B G2 candidate | Evidence | Fix |
| --- | --- | --- | --- |
| B1 | `emdash migrate` always exits 4 when run without a TTY: EmDash 1.1.0 refuses a non-interactive apply without `--expected-target-fingerprint` | `node_modules/emdash/dist/cli/index.mjs:3158` (interactive means stdin and stdout are both TTYs, line 2967) | Use the canonical `astro.config.mjs` `migrations.dev: "auto"`: EmDash applies core migrations on the first request. Verify runs the non-mutating `migrate --check`, which needs no fingerprint. |
| B2 | `EMDASH_ENCRYPTION_KEY` came from `openssl rand -base64 32`; EmDash requires `emdash_enc_v1_` plus 43 base64url characters | `dist/secrets-*.mjs`; the repo's own `docs/operations/runtime-secret-recovery.md` §7 | Generate `emdash_enc_v1_$(openssl rand 32 \| basenc --base64url \| tr -d '=\n')`. EmDash's own validator accepted **300/300** generated keys and rejected **50/50** old-format keys. |

## Offline checks (before any runtime action)

| Check | Result |
| --- | --- |
| `bash -n` (all scripts), `bash --posix -n` (entrypoint) | OK |
| shellcheck 0.10.0 (`uvx --from shellcheck-py==0.10.0.1 shellcheck -x -P scripts …`; `-s sh` for the entrypoint) | clean |
| `QUADLET_UNIT_DIRS=<copy> /usr/libexec/podman/quadlet -dryrun -user` | rc 0; all 5 services generated (`songhealth-dev-{network,db-data-volume,media-volume,db,app}.service`); no generator errors or warnings |
| EmDash 1.1.0 `validateEncryptionKeyAtStartup` over generated keys | 300/300 accepted; old format 50/50 rejected |
| `git diff --check`; secret-pattern scan of the diff | clean (the only match is the public image digest) |

## Live install — `scripts/dev-runtime-install.sh --sha a52d02d…`

- **Run.** 2026-10-28T16:50:57Z → 16:52:01Z (**64 s**), exit 0. Output:
  [t036/install-1-output.txt](t036/install-1-output.txt). npm deprecation warnings come from
  upstream packages.
- **Clone and hand-over.** The installer cloned `~/dev/songhealth-quadlet` at the commit and
  handed over to that commit's installer.
- **Images.**
  - Pulled `node:24.21.0-bookworm-slim@sha256:d6aa754f…`.
  - `postgres:18.6@sha256:fc973eb9…` was already present.
- **Dependencies.** npm 12.2.0 `npm ci` ran in a temporary container: 599 packages.
- **Resources.** Created 4 secrets, 2 labeled volumes (plus the media marker) and 5 units.
- **Database.** The first database start initialized the cluster. The app role vector was
  `t|f|f|f|songhealth_qdev_app` (login, not superuser, not createdb, not createrole, owns
  `songhealth_qdev`).
- **Application.** The app started and EmDash applied its migrations.
- **Setup.** `setup/dev-bypass?content=0&token=1` ran once and saved the PAT to
  `~/.local/state/songhealth-qdev/dev-pat` (0600, 50 bytes, never printed).
- **Running versions** (read inside the app container):
  - Node `v24.21.0`, Astro `7.3.5`, EmDash `1.1.0`.
  - The containers run the two digest-pinned images.
- **`scripts/dev-runtime-verify.sh`: VERIFY: PASS (13/13).**
  - services active; containers healthy;
  - publication is loopback 4324 only, and the database has no host port;
  - the SSR marker is served; Admin is reachable; setup is complete;
  - `migrate --check` is clean;
  - the role is least-privilege;
  - the source is the promoted commit and the tree is clean;
  - the encryption key was accepted;
  - the PAT authenticates.

## Live acceptance (beyond verify) — [t036/acceptance.sh](t036/acceptance.sh)

Output: [t036/acceptance-output.txt](t036/acceptance-output.txt) — **ACCEPTANCE: PASS (9/9)**.

| Check | Result |
| --- | --- |
| Dev-bypass login (`/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`) | session user `dev@emdash.local`, role 50 (admin) |
| Media upload through the API with the PAT | accepted; file present in volume `songhealth-qdev-media` |
| Restart persistence (`restart songhealth-dev-db.service`, which restarts the app through `Requires=`) | after restart the uploaded media is still served and the PAT still authenticates (data persisted) |
| File watching | a new untracked page was served without a restart, then returned 404 after removal |
| Fixture cleanup | synthetic media deleted through the API; only the store marker remains in the volume; probe page removed |
| Resource use (informational) | app ≈ 513 MB, db ≈ 33 MB |

## Live update — `scripts/dev-runtime-update.sh --sha 3deb34a…`

2026-10-28T16:55:09Z → 16:55:32Z (**23 s**), exit 0. The run backed up, stopped the app,
moved the checkout, handed over to the new commit's installer and finished with VERIFY: PASS
13/13. Output: [t036/update-1-output.txt](t036/update-1-output.txt).

- **Installer hand-over.** The new commit's installer reported dependencies, secrets,
  volumes and units as up to date, and restarted only the app.
- **Backup set** `~/.local/state/songhealth-qdev/backups/20261028T165509Z/` (directory 0700):
  - four files;
  - `sha256sum --check --strict` passes;
  - the metadata records the pre-update commit `a52d02d…`, which is what restore needs for a
    rollback;
  - `pg_restore --list` reads the dump (81 table-data entries);
  - the media archive contains the store marker.

## Idempotency, security and boundaries

- **Re-run.** A second `install.sh --sha a52d02d…` exited 0. Every step reported
  present/up to date, VERIFY: PASS, and the container IDs and start times were unchanged.
  Output: [t036/install-2-rerun-output.txt](t036/install-2-rerun-output.txt).
- **Secret leakage scan** (values compared in memory; counts only, nothing printed).
  - **Scope:** the user journal of both services, both container logs, and every installer
    and acceptance output.
  - **Result:** each of the 4 secrets and the PAT occurs **0** times.
  - **podman inspect:** the app container's `podman inspect` contains no secret value.
- **Autostart.** `systemctl --user is-enabled` reports `generated` for both services, wired
  into `default.target.wants`.
- **State after the run.** The first-init authorization flag was removed after the role was
  verified. The runtime checkout has no tracked drift.
- **Retired UID-1001 runtime.** Untouched: `127.0.0.1:4322` is still listening; nothing was
  read from or written to it.

## Recheck — 2026-10-28T23:07Z (runtime at `35e8bc2`)

All checks were read-only except one scratch backup, which was written and then deleted. The
Admin UI was in use during the recheck, so nothing was restarted. The runtime was not promoted
to this commit, which changes no application code. Output:
[t036/recheck-output.txt](t036/recheck-output.txt).

| Check | Result |
| --- | --- |
| Verify: the promoted commit's script, and this commit's fixed script | VERIFY: PASS (13/13) each. Both services active with 0 automatic restarts since they last started (database 16:52:42Z, app 16:56:38Z) |
| Running versions and images | Node `v24.21.0`, Astro `7.3.5`, EmDash `1.1.0`, Vite `8.3.3`; both containers run the digests pinned in the units |
| Seed versus live schema ([t036/seed-schema-check.py](t036/seed-schema-check.py), GET only) | All 10 collections, 80 fields, 9 taxonomies and 6 relations are present; the live-only `category` and `tag` are EmDash built-ins. The seed defines no content, terms or bylines, so the `content=0` setup skipped nothing |
| HMR WebSocket ([t036/hmr-ws-probe.py](t036/hmr-ws-probe.py)) | The handshake a browser tab makes through the published port (same origin, `vite-hmr`, page token) returns `101` and the `connected` message; a tokenless connection is refused with `400` |
| Secret leakage (method as above) | 0 occurrences of the 4 secrets and the PAT in the unit journal, both container logs, `podman inspect`, every patch and message of PR #41 (which includes PR #40), this commit's changes, both PR texts and the session logs |
| GitHub | PR #40 and #41 are open, draft and `MERGEABLE`. Neither head has workflow runs: the repository's only workflow (the T016 self-test) exists on `main` only |

Defects found and fixed in this commit:

- **`dev-runtime-verify.sh`.** Two checks piped into `grep -q` under `pipefail`. Once the
  output outgrew the 64 KiB pipe buffer, the SSR check would fail spuriously (curl exit 23)
  and the key check could pass despite a match (SIGPIPE). Both now capture the whole output
  before matching.
- **`dev-runtime-backup.sh`.** Run directly from a shell with the host's `th_TH` `LC_TIME`,
  it named the backup set with the Buddhist-era year (`2569…`). It now formats the timestamp
  in the C locale. The scratch backup above, run from such a shell, is named `2026…` and
  passes `sha256sum --check --strict`. Through `dev-runtime-update.sh` it already ran in the C
  locale.
- **Where to run the scripts.** The documentation now says to operate the runtime with the
  scripts of its own checkout, `~/dev/songhealth-quadlet/scripts/`. A pre-T036 checkout, such
  as the workspace's Phase 1 branch, still has the Phase 1 scripts.
- **This file.** The "Idempotency, security and boundaries" heading lost in `35e8bc2` is
  restored.

## Limits and open items (not claimed)

- **HMR.** File watching and route reload are proven by the probe page, and the HMR
  WebSocket channel by the recheck probe. An update applied in a real browser was not
  exercised.
- **Generated file.** The dev server creates an untracked `emdash-env.d.ts` in the runtime
  checkout. Verify ignores untracked files.
- **Passkeys.** They cannot work on the IP-literal origin, by design (dev-bypass is the
  development login). Moving to `http://localhost:4324` is a separate reviewed change.
- **Linger** is off: the runtime stops when the last user session ends.
- **Browser tests.** Not run here. Tests that assume the retired runtime (the T021
  coordinator, controller and auth-file loader) are adapted in their own tasks.
- **Rollback.** Not exercised live. The update/backup path and the rollback procedure in
  `docs/operations/development-quadlet.md` are documented; restore admits only a backup whose
  commit matches the runtime marker.
- **Restore not exercised.** The accepted restore script (`5d31acc`) was not exercised; backup
  was exercised through the update.
