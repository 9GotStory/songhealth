# Songhealth

เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง (Songhealth District Public Health Office website) — clean-rebuild implementation.

**Current implementation**: Feature 001 `platform-foundation` — one server-rendered Astro application
with EmDash as its integrated CMS/Admin, backed by PostgreSQL, developed natively on Node.js/npm.
Production container/lifecycle, durability, and recovery work is specified in the authority below
but not implemented yet. This README documents the currently accepted native development workflow
only.

## Authority

1. `AGENTS.md` (repository contract and authority order)
2. [.specify/memory/constitution.md](.specify/memory/constitution.md)
3. `docs/website-modernization-docs/current/` — Product/behavior truth (`00`–`09`) and technical
   architecture ([10-system-blueprint.md](docs/website-modernization-docs/current/10-system-blueprint.md))
4. `specs/001-platform-foundation/` — active Spec Kit feature artifacts

Do not reconstruct removed architecture from Git history or old branch names (see `AGENTS.md`).

## Prerequisites

- **Node.js `24.21.0` and npm `12.2.0`** — the exact pinned baseline in
  [package.json](package.json) (`engines` / `packageManager`). Check with `node --version` and
  `npm --version`.
- **rootless Podman** available on `PATH` and running as a non-root rootless session. Only the
  development PostgreSQL runs in a container; Node/npm/Astro/EmDash tooling stays native. The
  development database helper refuses a missing or rootful podman.
- a clean checkout of this repository.

## 1. Install dependencies

```bash
npm ci
```

Installs exactly the committed `package-lock.json`.

## 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env` (ignored by Git) and replace every placeholder with real local values. Never place a
usable secret in any committed file, example, or log.

| Input | Purpose | Secret-bearing |
| --- | --- | --- |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` | PostgreSQL runtime connection identity used by the application | no |
| `PGPASSWORD` | password for the PostgreSQL runtime role | yes |
| `EMDASH_MIGRATION_DATABASE_URL` | PostgreSQL connection URL used only by the native EmDash migration commands and the startup gate; its embedded password is part of the secret | yes |
| `EMDASH_SITE_URL` | public origin of the site (scheme + host + optional port, no trailing slash) | no |
| `HOST`, `PORT` | address and port the application server binds to (development default `127.0.0.1:4321`) | no |
| `EMDASH_ENCRYPTION_KEY` | EmDash encryption key; generate a unique strong key — no usable value is committed on purpose | yes |

The `PG*` runtime inputs and `EMDASH_MIGRATION_DATABASE_URL` **must identify the same intended
database**: application validation and the startup gate compare the non-secret identity
components (host, port, database, user) only, and never print a password or the full URL.

Load the values into your shell once per shell session — the database helper, dev server, startup
gate, and readiness helper all read them from the environment:

```bash
set -a; . ./.env; set +a
```

## 3. Prepare the local media directory

Media storage is **not** configured through an environment variable (there is no
`MEDIA_DIRECTORY`): the native EmDash local-media adapter always uses the stable application
mount path `./media`, which is ignored by Git. Create it once and keep it readable and writable
by the account running the application:

```bash
mkdir -p media
```

Recurring readiness only checks that the mount exists and is readable; the startup gate below
proves it is writable. Nothing in this repository creates or repairs the mount automatically.

## 4. Start the development PostgreSQL

```bash
npm run dev-db:start    # create (first run) and start; waits up to 60 s for readiness
npm run dev-db:status   # report ready / starting / unhealthy / stopped / absent
npm run dev-db:stop     # stop; the container and its data volume are preserved
```

- Only PostgreSQL runs in rootless Podman: the official PostgreSQL 18.6 image pinned by immutable
  digest, container `songhealth-dev-db`, data in the named volume `songhealth-dev-db-data`,
  published only on the loopback boundary matching `PGHOST` at `PGPORT`.
- `start` requires `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` in the
  environment; `status` and `stop` need no credentials.
- `stop` never deletes anything, and repeated starts never reinitialize existing data. The
  helper provides no reset, recreate, or delete behavior at all, and fails closed (without
  mutating it) on any same-name container it cannot prove it owns.

## 5. Startup-acceptance gate

Before the environment is accepted as ready for use, run the T013 gate:

```bash
npm run verify:startup
```

The gate ([tests/operations/verify-startup.sh](tests/operations/verify-startup.sh)):

1. validates all required inputs and proves — comparing non-secret identity components only —
   that the `PG*` runtime inputs and `EMDASH_MIGRATION_DATABASE_URL` identify the same intended
   database;
2. builds the exact application itself and consumes the native `.emdash/migrations.json` manifest
   that the build emits;
3. inspects the target with `emdash migrate --status --json` (no mutation), applies pending
   migrations with a non-interactive inspected-fingerprint guard, and verifies the result with
   `emdash migrate --check` (which applies nothing);
4. probes `./media` with one bounded disposable write/read/remove file and proves that no
   residue remains (it never creates the mount).

The database must already be reachable and `./media` must already exist — the gate creates and
manages no database or media resource. It is idempotent and independently repeatable: against an
already-migrated database the apply is a verified no-op. Only exit `0` is PASS (`1` FAIL, `2`
environment error, `4` missing/invalid input, `64` usage); its output is secret-scrubbed.

This one-time deployment/startup acceptance is distinct from the recurring readiness check in §8.

## 6. Start the application

```bash
npm run dev
```

The single Astro + EmDash platform starts natively and listens on `HOST`:`PORT`
(http://localhost:4321 with the development defaults). Development uses EmDash's native
automatic (`auto`) migration mode; the configured production runtime mode is `check`.

## 7. Verify the public and Admin surfaces

- **Public minimum SSR verification**: `GET /` must serve the stable marker
  `<meta name="songhealth-foundation" content="public-runtime">` (rendered by
  [src/pages/index.astro](src/pages/index.astro)).
- **Native EmDash Admin**: open `http://localhost:4321/_emdash/admin/`. On a fresh database it
  offers the native first-admin setup; afterwards the native sign-in page. Complete the one-time
  setup with a browser that supports passkeys. Availability verification accepts either the
  setup or the sign-in outcome and never automates passkey login.
- The committed explicit empty seed ([seed/seed.json](seed/seed.json)) intentionally defines no
  Product collections; it suppresses EmDash's built-in example Posts/Pages model.

Automated browser smoke for both surfaces (the application must be running):

```bash
npm run test:browser    # defaults to http://localhost:4321; override with PLAYWRIGHT_BASE_URL
```

## 8. Recurring readiness check (private, non-mutating)

```bash
node scripts/verify-readiness.mjs
```

Run it from the repository root with `HOST`, `PORT`, and the `PG*` inputs in the environment.
There is no `verify:readiness` npm script at this baseline. It checks, each within its own time
bound: the loopback `/` SSR marker, PostgreSQL connectivity, and `./media` presence/readability.
It prints only a `ready`/`not-ready` state, a timestamp, and at most a safe field or dependency
name, and exits `0` only when ready. It never mutates anything — in particular it never writes
media and never creates a missing media mount.

## 9. Verification commands

```bash
node --test "tests/node/*.test.ts"   # focused Node test suites (no npm test script exists)
npm run test:browser                 # browser smoke against the running application (see §7)
npm run build                        # production build; emits dist/server/entry.mjs and the
                                     # native .emdash/migrations.json manifest
```

The planned `npm test`, `npm run check`, and `npm run start` scripts referenced by
[specs/001-platform-foundation/quickstart.md](specs/001-platform-foundation/quickstart.md) do not
exist at this baseline.

## 10. Shutdown

1. Stop the dev server with `Ctrl+C`.
2. `npm run dev-db:stop` — the container and its data volume are preserved; nothing is deleted.

Restart later with `npm run dev-db:start`; the preserved volume is reused and existing data is
never reinitialized.

## Common failures and recovery

Recovery uses current helper behavior only; no reset or recreate tooling exists.

| Symptom | Cause and recovery |
| --- | --- |
| `astro dev` / `astro build` fails closed listing field names (for example `missing required input PGHOST` or `host identity disagrees between PGHOST and EMDASH_MIGRATION_DATABASE_URL`) | A required input is missing or malformed, or the `PG*` and migration-URL identities disagree. Fix `.env` and re-source it (§2). Configured values are never echoed. |
| `dev-db` exit `5` | Podman is missing or not running rootless. Install or repair the rootless Podman setup and run as a non-root user. |
| `dev-db` exit `4` reporting missing input(s) or a non-loopback `PGHOST` | Provide the five `PG*` inputs; `PGHOST` must be loopback (`127.0.0.1`, `localhost`, or `::1`). |
| `dev-db` exit `4` naming a mismatching field or resource on the existing `songhealth-dev-db` container | An existing same-name container does not match this helper's contract or the requested configuration. The helper refuses to start, stop, or otherwise mutate it; inspect it with `podman container inspect songhealth-dev-db` and align your `PG*` values with the resource you intend to use. |
| `dev-db:start` exit `1` (not ready within 60 s, or the container stopped during startup) | Inspect `podman logs songhealth-dev-db` (also `podman healthcheck run songhealth-dev-db`). Resolve an occupied `PGPORT` at its cause: starting against an existing container with a different `PGPORT` fails closed by design. |
| Readiness reports `not-ready` naming the **media** dependency | `./media` is missing or unreadable. Create or repair it manually (§3); no tool substitutes an empty replacement automatically. The startup gate additionally fails on an unwritable mount. |
| Readiness reports `not-ready` naming the **runtime** dependency | The application is not running at `HOST`:`PORT`, or `/` is not serving the expected marker. Start it (§6) and rerun the check. |
| Readiness reports `missing required input: <NAME>` | The values are not in this shell; re-source `.env` (§2). |
| `npm run verify:startup` fails (exit `1`/`2`/`4`/`64`) | Read the named step and field in its secret-scrubbed output — typically an unreachable database (§4), a missing `./media` mount (§3), or an identity disagreement (§2) — fix the cause, and rerun; the gate is idempotent. |
