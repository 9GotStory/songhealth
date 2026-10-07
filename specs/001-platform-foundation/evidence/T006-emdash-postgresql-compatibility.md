# T006 — Native EmDash + PostgreSQL Compatibility Gate Evidence

**Feature**: `001-platform-foundation`
**Task**: T006 (Phase 2: Foundational — **hard compatibility gate**) — run the blocking native
EmDash/PostgreSQL 18.6 compatibility gate against the actual pinned combination and record
redacted pass/fail evidence.
**Verification date**: 2026-10-07
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer.
**Authorized baseline**: commit `6fbd0ce3f9e9a69d56c66f7da894b03bf82f4c46`
(= `origin/001-platform-foundation`; accepted clean baseline including T004/T005). Verified
before writing: worktree clean at that commit; bounded implementation branch
`t006-emdash-postgresql-compat` cut from it.
**Tested tree**: commit `f6c8fde01d66bf080b6863b5e134c89a56cb6e5d` (branch
`t006-emdash-postgresql-compat`; the only change from the baseline is this task's harness
`tests/operations/verify-emdash-postgresql-compatibility.sh`. This evidence file lands in the
commit that follows on the same branch; the branch tip reported in the review handoff is the
reviewable final state).
**Scope**: two owned outputs only — the harness and this evidence. No EmDash patching, no
compatibility adapter/layer, no migration framework or service, no alternate database or
architecture, no Product content, and no T007+ behavior.

## Method

- Native EmDash behavior only. The exact application was built with `npm run build`
  (`astro build`), which emitted the native `.emdash/migrations.json` manifest; the manifest was
  consumed as emitted and never synthesized, mirrored, or hand-edited.
- The native migration sequence from `quickstart.md` §3.2 and `plan.md` was executed exactly:
  `emdash migrate --status --json` (inspect, no mutation) → derive the target fingerprint from
  that inspected target → plain `emdash migrate` apply with the required non-interactive
  `--expected-target-fingerprint` → `emdash migrate --check`.
- Version-sensitive CLI/manifest semantics were verified before implementation against current
  first-party sources: EmDash documentation via Context7 (`/websites/emdashcms`, CLI reference
  and core-migrations pages) and the installed `emdash@1.1.0` package sources
  (`src/cli/commands/migrate.ts`, `src/db/postgres-migrations.ts`, `src/migrations/target.ts`,
  `src/database/migrations/policy.ts`), which confirmed: the JSON report carries
  `target.fingerprint`; non-interactive apply without a matching fingerprint exits 4; the
  postgres target label is `host:port/database` built from the migration connection URL with the
  password omitted; and runtime `check` mode throws on pending migrations during application
  runtime initialization.
- The gate ran twice against the real pinned combination: **run 1** against a freshly initialized
  development database (full apply path), and **run 2** as an immediate independent rerun against
  the persisted database (idempotency/rerun proof). Before the recorded runs, an earlier
  reconnaissance container+volume created by the same executor the same day was removed as an
  explicit operator action so run 1 exercised first-time initialization; the harness itself
  never deletes or reinitializes anything.
- Secret safety: all inputs were supplied from an ignored local `.env` (never committed). No
  secret value, credential-bearing URL, or encryption key appears in this artifact; the harness
  additionally scrubs known secret values from any diagnostic output it prints.

## Summary verdict

| # | Gate criterion (delegation acceptance) | Result |
|---|---|---|
| 1 | Actual pinned EmDash `1.1.0` + PostgreSQL `18.6` combination, accepted T004 configuration, T005 rootless-Podman controls | **PASS** |
| 2 | Exact application build/sync emits the native `.emdash/migrations.json`; consumed as emitted, not synthesized | **PASS** |
| 3 | `emdash migrate --status` → plain native `emdash migrate` with `--expected-target-fingerprint` derived from the inspected target → `emdash migrate --check` | **PASS** |
| 4 | Integrated Astro + EmDash application starts after migration verification (no T007+ behavior added) | **PASS** |
| 5 | `PG*` runtime inputs vs `EMDASH_MIGRATION_DATABASE_URL` identity agreement, non-secret components only (host, port, database, user); no secrets printed | **PASS** |
| 6 | Fail-closed on missing/malformed/mismatched inputs, build/manifest, status/apply/check, or startup failure; T005 container and volume preserved | **PASS** |
| 7 | Harness bounded, deterministic, non-interactive, cleanup-safe, independently rerunnable; no patching/adapter/framework/alternate-DB/Product content | **PASS** |
| 8 | Redacted evidence with versions, image identity, manifest identity/checksum + secret-safety, identity agreement, sequence outcomes, startup outcome, commands, blockers | **PASS** (this document) |
| 9 | Shell static checks + full execution against the real pinned combination; only the two T006-owned files changed | **PASS** |

**Gate outcome: PASS.** The pinned native combination EmDash 1.1.0 + PostgreSQL 18.6 builds,
migrates (90/90 core migrations), verifies, and starts as one integrated Astro application.
No blocker; dependent Phase 2 work (T007/T008) may proceed subject to Codex review.

## Exact versions and identities

| Item | Value |
|---|---|
| EmDash (CMS/Admin) | `1.1.0` — installed from the committed lockfile; equals the `package.json` pin; the emitted manifest records `emdashVersion 1.1.0` |
| `pg` (PostgreSQL driver) | `8.23.1` — installed; equals the `package.json` pin |
| PostgreSQL server | `PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit` (reported by `select version()` through the application's own `pg` client using the `PG*` runtime inputs) |
| Pinned PostgreSQL image | `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf` (pin read from the accepted `scripts/dev-db.sh`; the running container's image identity matched the same digest) |
| Astro / Node adapter | `astro 7.3.5` / `@astrojs/node 11.1.6` (installed; equal the pins) |
| Host toolchain (recorded) | `node v24.11.0`, `npm 11.6.1`, `podman 5.8.4` (rootless) — see Environment observations |

## Non-secret target-identity agreement (before any migration)

- Compared components (non-secret only): **host `localhost`, port `5432`, database
  `songhealth`, user `songhealth`** — the `PG*` runtime inputs and
  `EMDASH_MIGRATION_DATABASE_URL` agreed on all four. The password and the full URL were never
  printed, logged, or placed on any command line.
- The inspected native target (from `emdash migrate --status --json`) reported
  `postgres localhost:5432/songhealth`, agreeing with the `PG*` identity, and the harness
  asserted that equality before apply.
- Target fingerprint (SHA-256 over the non-secret target identity, printed by the native CLI):
  `453b4163492c7a9f271fd64142da8e338d96af92c0e895f61c0ff1c3e9d61ba3`. The apply step consumed
  exactly this value, derived at runtime from the inspected target — never hard-coded.

## Native migration manifest (exact build)

- `npm run build` emitted `.emdash/migrations.json` (the stale copy was removed first so the
  run provably consumed the fresh emission; the file is gitignored generated output).
- Identity: `schemaVersion 1`, `emdashVersion 1.1.0`, **90** ordered core migrations
  (`001_initial` … `091_redirect_artifacts`), migration-set fingerprint
  `319ab15f96c2b36351ff1c748631e0c9c586914737650062d7cf69152046b69b`.
- Manifest SHA-256: `0cb53f901de78669c06c67f5ba568636e56a51a19f5eabd88f5fca1c11b22495`
  (identical across both runs' fresh builds — deterministic emission).
- Database section: `type postgres`, executor entrypoint
  `emdash/internal/db/postgres-migrations`, and migration connection variable **NAME**
  `EMDASH_MIGRATION_DATABASE_URL` only.
- **Secret-safety scan: PASS** — the manifest text contains no URL-like string (`://`) and no
  password/secret/token/credential-named keys; it records the connection-variable name only, as
  native behavior promises.

## Migration sequence outcomes

| Step (native command) | Run 1 (fresh database) | Run 2 (independent rerun) |
|---|---|---|
| `emdash migrate --status --json` | exit 0; applied=0 pending=90 unknown=0 | exit 0; applied=90 pending=0 unknown=0 |
| `emdash migrate --expected-target-fingerprint <derived>` | exit 0; executed all 90; after: applied=90 pending=0 unknown=0 | exit 0; verified no-op; applied=90 pending=0 unknown=0 |
| `emdash migrate --check` | exit 0 (nothing pending, nothing unknown; applies nothing) | exit 0 |

Both runs used `npx --no-install emdash` (project-local binary; no network installs, no
prompts). Run 2 additionally demonstrates that the persisted T005 volume retained the fully
migrated state across harness runs without reinitialization.

## Integrated application startup

- The built application (`dist/server/entry.mjs`, `@astrojs/node` standalone) was started with
  the native runtime inputs (`PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`,
  `EMDASH_SITE_URL`, `HOST=127.0.0.1`, `PORT=4321`, `EMDASH_ENCRYPTION_KEY`) and answered HTTP
  within ~1 second in both runs.
- `GET /_emdash/admin/` → **302 → `GET /_emdash/admin/setup` → 200** (native first-admin setup
  flow). This path performs full EmDash runtime initialization, which enforces the configured
  runtime `check` migration policy against the database — so the 200 result proves the
  integrated Astro + EmDash + PostgreSQL 18.6 runtime started against the migrated database.
- `GET /` → 404, recorded as informational only: the minimum SSR verification page is T011
  scope, so at this gate any HTTP answer proves the public server. No T007+ behavior
  (configuration validation wiring, SSR marker, readiness helper) was added or required.
- The application process (started and stopped by the harness itself) terminated cleanly on
  SIGTERM within 1 s in both runs; no leftover application process remains.

## Harness behavior verification (fail-closed paths)

Beyond the two passing gate runs, the harness's own fail-closed behavior was exercised with
disposable mismatched inputs (all rejected before any database or migration work, exit 4, field
names only, no values):

- missing `EMDASH_ENCRYPTION_KEY` → `missing required input(s): EMDASH_ENCRYPTION_KEY`;
- `PGDATABASE` disagreeing with the migration URL → mismatch reported as
  `database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)`;
- migration-URL user disagreeing with `PGUSER` → mismatch reported as
  `user (PGUSER vs EMDASH_MIGRATION_DATABASE_URL)`;
- `PORT` equal to `PGPORT` → rejected before start.

## Static checks

- `bash -n tests/operations/verify-emdash-postgresql-compatibility.sh` — PASS (syntax).
- `shellcheck` 0.11.0 on the harness — PASS (no findings; the only suppressed codes are
  SC2016 for intentionally single-quoted `node -e` programs and SC2153 for the native `HOST`/
  `PORT` input names, each with an explanatory comment).
- Full execution against the real pinned database/application combination — PASS (runs 1 and 2
  above).

## Commands executed (secret-free forms)

```bash
set -a; . ./.env; set +a          # ignored local inputs; values never printed
./tests/operations/verify-emdash-postgresql-compatibility.sh
```

Inside the harness (all bounded by `timeout`, outputs captured and secret-scrubbed):

```bash
npm ci
npm run build                                  # emits .emdash/migrations.json
npx --no-install emdash migrate --status --json
npx --no-install emdash migrate --expected-target-fingerprint "$EMDASH_TARGET_FINGERPRINT"
npx --no-install emdash migrate --check
node ./dist/server/entry.mjs                   # started/stopped by the harness
./scripts/dev-db.sh {status|start|stop}        # T005 controls; nothing ever deleted
```

## Persistence and cleanup evidence

- The T005 container (`songhealth-dev-db`) and named volume (`songhealth-dev-db-data`) were
  preserved throughout; the harness stopped the container at the end of each run that started it
  and never deleted or reinitialized anything. Post-run state: container stopped, volume present
  with all 90 migration records retained.
- A container that is already ready when the gate begins is left running (the harness stops only
  what it started).

## Environment observations (recorded, not gate failures)

- The verification host runs `node v24.11.0` / `npm 11.6.1`, while `package.json` pins
  `engines.node 24.21.0` / `npm 12.2.0`. The gate's pinned subject is the EmDash 1.1.0 +
  PostgreSQL 18.6 combination (both asserted exact), and EmDash 1.1.0 declares `node >=22.16`;
  `npm ci` completed against the committed lockfile without error. Flagged for reviewer
  awareness; no dependency or manifest was changed.
- `podman 5.8.4` (rootless) is the development-parity runtime here; the researched production
  reference is 6.1.3. The development database image is digest-pinned, and its running identity
  matched the pin, so this does not affect the tested combination.

## Blockers

None. The blocking gate **PASSED**; no architecture or dependency resolution is required.

## Scope confirmation

- Changed files vs the accepted baseline `6fbd0ce…` (verified via `git status`/`git diff` on
  the branch): exactly the two T006-owned outputs —
  `tests/operations/verify-emdash-postgresql-compatibility.sh` and this evidence file.
- The accepted T004/T005 files (`package.json`, `package-lock.json`, `.env.example`,
  `astro.config.mjs`, `src/live.config.ts`, `seed/seed.json`, `scripts/dev-db.sh`) were consumed
  as-is and not modified. Generated outputs (`.emdash/`, `dist/`, `node_modules/`, `.env`,
  `./media`) remain gitignored and uncommitted.
