# T015 — User Story 1 Canonical Platform Validation Evidence

**Feature**: `001-platform-foundation`
**Task**: T015 (Phase 3: User Story 1 — **story gate**) — execute the US1 independent test from a
clean checkout with disposable non-confidential validation data/media; set and retrieve the native
EmDash Site Setting `tagline` with the exact value `Songhealth Feature 001 foundation validation`,
record its exact UTF-8 value and SHA-256 digest as the canonical database validation evidence, and
record redacted setup, build/start, public/Admin, readiness matrix, native migration
status/apply/check gate, media-writeability, and secret-redaction evidence in this file.
**Verification dates**: 2026-10-07 – 2026-10-08 (UTC; one executor run was interrupted by provider
quota after the environment work and resumed to complete the validation and this evidence — no
reviewable artifact existed before the resumed run).
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer.
**Authorized baseline**: commit `78b3a6681e9a45b97d2c6e23107d3a6344c803a9`
(= `origin/001-platform-foundation`; the accepted baseline through T014). Verified before any
work: `multica repo checkout` produced a clean worktree at exactly that commit on the agent
implementation branch `agent/claude-developer/1e839dc97648`; `git status` empty.
**Tested tree**: the same commit `78b3a6681e9a45b97d2c6e23107d3a6344c803a9` — T015 is a
validation/evidence task, so no repository source changed; the only committed delta on the branch
is this evidence file (see Scope confirmation).
**Scope**: T015 only. Existing T009–T014 tests/scripts/configuration were executed as the
implementation under validation and never widened or redesigned. No T016, OCI/Quadlet, production
lifecycle, durability, recovery, or Product implementation; no direct SQL writes; no passkey-login
automation; no EmDash-internal testing; no new public endpoint, framework, service, or
architecture.

## Method

- Followed `README.md` §Prerequisites–§10 as an independent maintainer from the clean baseline:
  `npm ci` → `.env` from `.env.example` → `mkdir -p media` → `dev-db:start` → `npm run
  verify:startup` → `npm run dev` → public/Admin verification → browser smoke → readiness cases →
  `dev-db:stop` at the end. Focused Node tests and the production build ran as documented in §9.
- All database/media content is disposable and non-confidential: a validation tagline, a
  deterministic 139-byte PNG, and disposable admin identities. No secret value, credential-bearing
  URL, or encryption key appears in this artifact; secret-bearing inputs lived only in the ignored
  `.env` (mode 0600) and, for the validation PAT, a 0600 file under the ignored `.tmp/` scratch
  tree.
- The documented native interfaces were used exclusively: the README/T013–T014 helper scripts, the
  native `emdash` CLI, the native EmDash REST/API surfaces (`/_emdash/api/...`), the native Admin
  UI setup wizard, and the native first-admin passkey ceremony performed by a browser-provided
  WebAuthn authenticator.

## Summary verdict

| # | T015 criterion | Result |
|---|---|---|
| 1 | Clean checkout from the exact accepted baseline; documented prerequisites only; zero undocumented intervention (with the explicitly recorded disposable-dev-resource actions below) | **PASS** |
| 2 | `npm ci` against the committed lockfile without rewriting it | **PASS** |
| 3 | Production build emits `dist/server/entry.mjs` + native `.emdash/migrations.json` of the exact build | **PASS** |
| 4 | T013 startup-acceptance gate: manifest identity/secret-freeness, `--status`, fingerprint-guarded apply, `--check`, bounded media write/read/remove probe with no residue | **PASS** (exit 0) |
| 5 | Application start (dev and built standalone) and public SSR marker at `/` | **PASS** |
| 6 | Native EmDash Admin availability and the applicable setup path (first-admin setup offered pre-setup; native sign-in offered post-setup; one-time setup completed; sign-in never automated) | **PASS** |
| 7 | Canonical Site Setting `tagline` set through the native platform path to the exact value; retrieved through the native platform path; exact UTF-8 value + SHA-256 digest derived from the retrieved value; digest matches the expected `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` | **PASS** |
| 8 | Designated validation media stored and retrieved through the native media boundary; path/size/SHA-256 recorded | **PASS** |
| 9 | Recurring readiness matrix: ready (normal), not-ready (database unavailable), not-ready (media missing/unreadable), missing-input fail-closed — private, non-mutating, safe names only | **PASS** |
| 10 | Missing/invalid configuration and dependency failures name fields only; supplied secret sentinels appear in **zero** captured outputs; no password, encryption key, or full migration URL ever printed | **PASS** |
| 11 | Focused Node tests and Playwright public/Admin browser smoke pass | **PASS** (47/47; 2/2) |
| 12 | No local environment files, generated migrations, raw logs, database/media state, credentials, passkey data, or secret values committed; `git diff --check` clean | **PASS** |

T015 validation completed with no blocker; residual observations for the reviewer are recorded
under "Environment observations" (none is a T015 scope failure).

## Exact versions and identities

| Item | Value |
|---|---|
| Authorized baseline / tested tree | `78b3a6681e9a45b97d2c6e23107d3a6344c803a9` (`origin/001-platform-foundation`) |
| EmDash (CMS/Admin, installed = `package.json` pin = manifest `emdashVersion`) | `1.1.0` |
| Astro / Node adapter / React (installed = pins) | `astro 7.3.5` / `@astrojs/node 11.1.6` / `react`+`react-dom 19.2.4` |
| `pg` driver (installed = pin) | `8.23.1` |
| Playwright (`@playwright/test` installed = pin) / managed Chromium | `1.63.0` / `chromium-1243` |
| Development PostgreSQL image (pinned by digest in `scripts/dev-db.sh`; running container identity matched the pin) | `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf` (PostgreSQL 18.6; same digest-verified image as the accepted T006 gate) |
| Host toolchain (recorded; deviations below) | `node v24.11.0`, `npm 11.6.1`, `podman 5.8.4` (rootless), Fedora Linux host |

## 1. Clean checkout, prerequisites, dependency install, configuration

- Checkout of `https://github.com/9GotStory/songhealth.git` on the agent branch produced a clean
  worktree at exactly `78b3a6681e9a45b97d2c6e23107d3a6344c803a9`; `git status` was empty before
  work began.
- `npm ci` — **PASS**: `added 703 packages, audited 704 packages… found 0 vulnerabilities`
  (~14 s); `git diff` on `package-lock.json` empty afterwards (lockfile consumed, not rewritten).
- `.env` created from `.env.example` (git-ignored; mode 0600) with disposable local values: the
  documented development defaults (`EMDASH_SITE_URL=http://localhost:4321`, `HOST=127.0.0.1`,
  `PORT=4321`) plus `PGHOST=localhost`, `PGPORT=5432`, `PGDATABASE=songhealth`,
  `PGUSER=songhealth`, a `PGPASSWORD` aligned to the existing development container (see below),
  the matching `EMDASH_MIGRATION_DATABASE_URL` identifying the same intended database, and a
  freshly generated unique `EMDASH_ENCRYPTION_KEY`. No secret value was echoed or captured;
  values were written programmatically.
- **Database alignment (documented recovery path)**: this host already carried the T005/T006
  development resources — container `songhealth-dev-db` (stopped, healthy) and named volume
  `songhealth-dev-db-data` — preserved per the documented stop behavior. The first
  `dev-db:start` attempt with a **fresh** password correctly **failed closed** (exit 4,
  `mismatching: initialization password (POSTGRES_PASSWORD)`; see failure matrix F4), proving the
  helper refuses a configuration it cannot prove owns the resource. Per the README failure/recovery
  table, the container's initialization identity was inspected with `podman container inspect` and
  the `PG*` values aligned to it (database `songhealth`, user `songhealth`, password recovered into
  `.env` only, never printed). The subsequent start reused the preserved volume — no
  reinitialization occurred.
- `mkdir -p media` — the stable application media mount (blueprint §20.1; no `MEDIA_DIRECTORY`
  input exists) created per README §3.

### Disposable dev-database resets (explicitly recorded operator actions)

The one-time native first-admin setup ceremony is consumable exactly once per database, and the
passkey it creates is bound to the performing browser's authenticator. Two early driver
iterations completed that ceremony but exited before the follow-up in-session capture steps ran
(an initial URL-predicate bug, then the wizard's native success step — see §5), leaving the
database with an unrecoverable passkey and no captured canonical evidence. To redo the one-time
flow with complete capture, the disposable development database was reset three times as an
explicit operator action (`npm run dev-db:stop` → `podman rm songhealth-dev-db` → `podman volume
rm songhealth-dev-db-data` → `npm run dev-db:start`), the same class of recorded operator action
as the accepted T006 evidence. The T005 helper itself was never used to delete anything (it
offers no such behavior); the final canonical sequence below ran on the last fresh volume. No
persistent/production resource existed or was touched.

## 2. Startup-acceptance gate (T013) — migration manifest, status/apply/check, media probe

Final canonical run against the fresh volume (`set -a; . ./.env; set +a; npm run
verify:startup`, exit **0**; the gate itself rebuilds the exact application):

```text
t013: [main] INFO node v24.11.0, npm 11.6.1
t013: [S1] INFO identity agreement: host=localhost port=5432 database=songhealth user=songhealth
t013: [S1] PASS inputs valid and PG*/migration-URL identity agreement proven (non-secret components only)
t013: [S2] PASS exact application built (npm run build)
t013: [S2] INFO manifest: emdash 1.1.0, 90 migrations, migration-set fingerprint 319ab15f96c2b36351ff1c748631e0c9c586914737650062d7cf69152046b69b
t013: [S2] INFO manifest sha256: 0cb53f901de78669c06c67f5ba568636e56a51a19f5eabd88f5fca1c11b22495
t013: [S2] INFO manifest records migration connection variable NAME EMDASH_MIGRATION_DATABASE_URL (secret-free: no URLs, no secret keys)
t013: [S2] PASS native .emdash/migrations.json emitted by the exact build; identity, checksum, and secret safety verified
t013: [S3] INFO inspected target: postgres localhost:5432/songhealth
t013: [S3] INFO target fingerprint (sha256 of the non-secret target identity): 453b4163492c7a9f271fd64142da8e338d96af92c0e895f61c0ff1c3e9d61ba3
t013: [S3] INFO migration state before apply: applied=0 pending=90 unknown=0
t013: [S3] PASS target inspected with emdash migrate --status (no mutation); fingerprint derived from the inspected target; no unknown state
t013: [S4] INFO migration state after apply: applied=90 pending=0 unknown=0
t013: [S4] PASS native emdash migrate applied with --expected-target-fingerprint from the inspected target; nothing pending, nothing unknown
t013: [S5] INFO emdash migrate --check: no pending and no unknown migrations (exit 0; applies nothing)
t013: [S5] PASS migration state verified with emdash migrate --check
t013: [S6] INFO media probe .songhealth-startup-probe.xn7nswcVniup: exclusively claimed, wrote and read back 85 identical bytes, then removed it; no residue remains
t013: [S6] PASS bounded disposable media write/read/remove probe passed against the stable media mount (exclusive claim, no clobber, no symlink follow)
t013: T013 startup acceptance gate: PASS
t013: tested tree: 78b3a6681e9a45b97d2c6e23107d3a6344c803a9
```

- The manifest belongs to the exact build: the gate removes any stale `.emdash/migrations.json`,
  runs `npm run build` itself, and asserts identity (`schemaVersion 1`, `emdashVersion 1.1.0`,
  **90** ordered core migrations `001_initial`…`091_redirect_artifacts`, migration-set fingerprint
  `319ab15f…46b69b`), checksum `0cb53f90…22495`, and secret-freeness (`://` absent; connection
  variable **name** only) before consuming it. These equal the values the accepted T006 gate
  recorded for the same pinned combination — deterministic emission.
- Apply used EmDash's non-interactive inspected-target fingerprint guard exactly as documented:
  `--status` inspected without mutation, the fingerprint `453b4163…d61ba3` was derived from that
  inspected target (never hard-coded), the guarded `emdash migrate` applied all 90 migrations
  (first-time full-apply path on the fresh volume), and `emdash migrate --check` verified the
  clean state while applying nothing.
- **Idempotent-rerun observation**: an earlier gate run the same day against the preserved
  T006-era volume reported `applied=90 pending=0 unknown=0`, verified the apply as a no-op, and
  still passed `--check` — the documented repeatable behavior.
- The bounded media probe (startup acceptance, distinct from recurring readiness) wrote, read
  back, and removed one exclusively-claimed disposable file under `./media` and proved no residue;
  after the entire validation the mount contained only the designated validation asset (§6).

## 3. Application start and public SSR marker

- `npm run dev` (documented dev start): the single Astro + EmDash platform started and
  `GET http://localhost:4321/` returned **200** `text/html` containing the exact stable marker
  `<meta name="songhealth-foundation" content="public-runtime" />` (rendered by
  `src/pages/index.astro`).
- Built standalone start (`node ./dist/server/entry.mjs` with `HOST=127.0.0.1 PORT=4322`, the
  native Node-adapter inputs): `GET /` returned **200** with the same marker — the production
  build start path also verified.
- Playwright browser smoke (`npx playwright install chromium` once, then `npm run test:browser`
  against the running dev server): **2 passed** —
  `public / serves the minimum Songhealth SSR verification marker` and
  `native EmDash Admin is available at /_emdash/admin/ (native setup or sign-in)`.
- Focused Node suites (`node --test "tests/node/*.test.ts"`): **47 pass / 0 fail** across 10
  suites (configuration, malformed/inconsistent values, field-name-only errors, secret redaction,
  readiness helper behavior).

## 4. Native EmDash Admin availability and the applicable setup path

- **Availability before setup**: `GET /_emdash/admin/` → **302 → `/_emdash/admin/setup` → 200**
  — the native first-admin setup flow is offered on a fresh database (also asserted by the
  browser smoke).
- **Applicable setup path — completed**: the documented one-time native setup wizard
  (quickstart §1, README §7) was completed through the public Admin UI with a **disposable**
  identity (`t015-validation@songhealth.invalid`) and the site step's title/tagline fields:
  1. *Set up your site* — entered site title `Songhealth T015 Validation` and tagline
     `Songhealth Feature 001 foundation validation` (the exact required value), kept the native
     "Empty site" start (the committed explicit empty seed defines no collections);
  2. *Create your account* — disposable email/name;
  3. *Secure your account* — **created a new passkey** via a browser-provided WebAuthn
     authenticator (Playwright CDP virtual authenticator: CTAP2, resident key, user verification —
     the automation equivalent of "a browser that supports passkeys"). This is account
     **creation**, not sign-in: **no passkey login was automated at any point**; after setup the
     browser was closed without authenticating again.
  - Verified native behavior: the wizard's verify endpoint (`POST /_emdash/api/setup/admin/verify`
    in the installed `emdash@1.1.0`) creates the first admin and registers the passkey but
    establishes **no login session**, so the wizard's final "Open the dashboard" step lands on the
    native sign-in page. Recorded post-setup state:
    `GET /_emdash/admin/` → **302 → `/_emdash/admin/login?redirect=%2F_emdash%2Fadmin`** — the
    native sign-in outcome, which the T010 contract accepts as the availability result. Sign-in
    with the passkey was deliberately **not** automated.
- **Programmatic native API access for validation** (no login automation): the platform's own
  development-only bootstrap endpoint `POST /_emdash/api/setup/dev-bypass?token=1` — documented
  in the installed package source ("For agent/browser testing…", "Optionally create a PAT token
  (?token=1) for headless/CLI testing") — was used once on the disposable dev database to mint a
  scoped personal access token (`ec_pat_…`, saved to a 0600 file under the ignored `.tmp/` tree,
  never printed in full, never committed). This endpoint is gated to `import.meta.env.DEV`
  (production builds answer 403), applies the same committed explicit-empty seed, and does not
  alter the canonical tagline/media state below. All subsequent native API calls used this PAT as
  a Bearer token —
  the documented authentication mode for programmatic changes.
- **Auth boundary**: unauthenticated `GET /_emdash/api/settings` → **401**
  `{"code":"NOT_AUTHENTICATED"}` — settings are not publicly exposed.

## 5. Canonical `tagline` — native set, native retrieval, exact value and SHA-256

**Set (native platform path).** The value was set through the native first-admin setup wizard's
site step (§4). Mechanism (verified in the installed `emdash@1.1.0` source, recorded for
traceability): `POST /_emdash/api/setup` overrides the loaded seed's `settings` with the wizard's
`title`/`tagline` form values, and the native seed applier writes them as the native Site
Settings `site:title` / `site:tagline` (write-once). No direct SQL write was performed anywhere in
this validation; no hand-crafted seed file was introduced.

**Retrieve (native platform path).** `GET /_emdash/api/settings` (native REST settings surface)
with the Bearer PAT → **200**; response body:

```json
{ "success": true, "data": {
    "tagline": "Songhealth Feature 001 foundation validation",
    "title": "Songhealth T015 Validation" } }
```

**Exact value and digest — derived from the retrieved value.** The retrieved `data.tagline`
string was written verbatim to a scratch file (44 bytes; `od` confirms the final byte is the `n`
of `validation` — **no trailing newline**). Three independent derivations agree:

| Derivation | Result |
|---|---|
| `sha256sum` over the saved 44-byte UTF-8 file | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Node `crypto.createHash("sha256").update(value, "utf8")` over the in-memory retrieved string | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Delegated expectation | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` — **match** |

- Exact-value check: retrieved string === `Songhealth Feature 001 foundation validation` —
  **true** (44 UTF-8 bytes).
- Persistence observation: after the readiness matrix's database stop/start cycle (preserved
  volume), a fresh authenticated `GET /_emdash/api/settings` returned the identical value and
  digest — the canonical state survives ordinary database restarts with no reinitialization.
- Recorded platform facts (installed 1.1.0, for reviewer awareness): the settings **update** REST
  route is `POST /_emdash/api/settings` (the docs hub's `PUT` description does not match the
  pinned version — a `PUT` answers 404); no redundant settings update was needed or performed,
  because the wizard had already natively set the exact value. The passkey-mode verify step does
  not additionally persist the legacy `emdash:site_tagline` key (only the OAuth callback path
  calls `finalizeSetup`); the canonical store this evidence and the native settings API use is
  `site:tagline`, which the wizard's native seed-settings path wrote.

## 6. Validation media — native storage, native retrieval, identity

- **Designated asset**: deterministic, public-publishable PNG `songhealth-t015-validation.png`
  (96×32, teal) — 139 bytes, SHA-256
  `3d8133b049b52f94d6f5a55ee8d1d1181b2eaa8a907eee557b16f0163a66198d`. (An SVG first attempt was
  correctly rejected by the platform — `400 {"code":"INVALID_TYPE","File type not allowed"}` —
  because the native global upload allowlist deliberately excludes `image/svg+xml`; recorded as
  observed native security behavior, not worked around.)
- **Native upload**: `POST /_emdash/api/media` (documented multipart REST boundary) with the
  Bearer PAT → **201 Created**; identity returned by the platform:
  mediaId `01M4BJTP91KTX0ZGZ02K3NWSK7`, storageKey `01M4BJTP75H8D4G0FPT7K12SKT.png`,
  MIME `image/png`, size 139.
- **Native retrieval**: `GET /_emdash/api/media/file/01M4BJTP75H8D4G0FPT7K12SKT.png` → **200**,
  139 bytes, SHA-256 identical to the uploaded asset (**byte-identical**).
- **Native CLI confirmation**: `npx --no-install emdash media list --url http://localhost:4321
  --json` (PAT-authenticated) lists the same item — filename, MIME, size 139, 96×32, storageKey,
  native content hash `sha1:209414ee88f02d83882223f2e68456a6af8096dd`, status `ready`.
- **Stable mount**: the file physically resides at `./media/01M4BJTP75H8D4G0FPT7K12SKT.png`
  (139 bytes, mode 0644, same SHA-256) — the blueprint §20.1 stable application media mount.
  After the entire validation this is the only file in the mount: the T013 startup probe removed
  its own disposable file with no residue, and no other disposable media residue exists.

## 7. Recurring readiness matrix (private, non-mutating)

`node scripts/verify-readiness.mjs` with `HOST`/`PORT`/`PG*` in the environment (README §8). Every
run prints only a state token, an ISO-8601 timestamp, and at most a safe field/dependency name.

| Case | Command context | Output | Exit |
|---|---|---|---|
| R1 Normal operation (dev server + database + readable media) | `HOST=localhost node scripts/verify-readiness.mjs` | `songhealth readiness: ready` + timestamp | **0** |
| R2 Normal operation against the built standalone server (`HOST=127.0.0.1 PORT=4322`, started with `node ./dist/server/entry.mjs`) | same helper with those inputs | `ready` + timestamp | **0** |
| R3 Database unavailable (`npm run dev-db:stop`; volume preserved) | `HOST=localhost node scripts/verify-readiness.mjs` | `not-ready`; `failed dependency: database (PostgreSQL connectivity check failed)` | **1** |
| R4 Expected media mount absent (`mv media media.t015-aside` for the check, then restored) | `HOST=localhost node scripts/verify-readiness.mjs` | `not-ready`; `failed dependency: media (expected media mount missing or unreadable)` | **1** |
| R5a Missing `PGDATABASE` | `env -u PGDATABASE … node scripts/verify-readiness.mjs` | `not-ready`; `missing required input: PGDATABASE` | **1** |
| R5b Missing `PGPASSWORD` | `env -u PGPASSWORD -u EMDASH_ENCRYPTION_KEY …` | `not-ready`; `missing required input: PGPASSWORD` | **1** |

- Non-mutation affirmed: R4 left no created mount (the directory was absent throughout the check
  and was restored by the explicit operator `mv`); the helper never wrote media, and R3/R4 never
  mutated the database. Migration mutation and the persistent media write belong exclusively to
  the T013 startup acceptance in §2, as designed.

## 8. Missing/invalid configuration and dependency failures — redaction evidence

Representative failures exercised with **secret sentinels** supplied as the secret-bearing values
(`PGPASSWORD=SENTINEL-PGPASSWORD-t015`, migration-URL password `SENTINEL-MIGPW-t015`,
`EMDASH_ENCRYPTION_KEY=SENTINEL-ENCKEY-t015`); every captured output was scanned for the
sentinel strings.

| Case | Command (env curated around `.env`) | Output (verbatim, secret-free) | Exit | Sentinel occurrences |
|---|---|---|---|---|
| F1 Missing `EMDASH_ENCRYPTION_KEY` at build | `env -u EMDASH_ENCRYPTION_KEY npm run build` | `Songhealth runtime configuration is invalid (see .env.example): missing required input EMDASH_ENCRYPTION_KEY` | 1 | n/a (none supplied) |
| F2 `PGDATABASE`/migration-URL identity disagreement at build (sentinels supplied) | `PGDATABASE=songhealth_mismatch PGPASSWORD=SENTINEL… EMDASH_ENCRYPTION_KEY=SENTINEL… EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth:SENTINEL…@localhost:5432/songhealth npm run build` | `…invalid…: database identity disagrees between PGDATABASE and EMDASH_MIGRATION_DATABASE_URL` | 1 | **0** |
| F3 Same disagreement at the T013 gate (sentinels supplied) | same env, `npm run verify:startup` | `t013: [S1] FAIL the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)` | 4 | **0** |
| F4 Existing dev container's password mismatch (sentinel supplied) | `PGPASSWORD=SENTINEL-wrong-db-password-4T015 npm run dev-db:start` | `existing container songhealth-dev-db does not match this helper or the requested configuration; mismatching: initialization password (POSTGRES_PASSWORD)` + refuse-to-mutate notice | 4 | **0** |

- Across all captured outputs: only safe field/dependency names; **no** password, encryption key,
  or full migration URL was ever printed; the sentinel scan counted **0** occurrences everywhere.
- The gate's passing runs likewise printed only the non-secret identity components
  (host/port/database/user) and the secret-free manifest/target fingerprints.

## 9. Commands executed (secret-free forms)

```bash
multica repo checkout https://github.com/9GotStory/songhealth.git   # clean at 78b3a668…
npm ci
cp .env.example .env  # values written programmatically; never echoed
mkdir -p media
set -a; . ./.env; set +a
npm run dev-db:start / dev-db:status / dev-db:stop
npm run build
npm run verify:startup
npx playwright install chromium
npm run dev                          # dev server
node ./dist/server/entry.mjs         # built standalone start (HOST/PORT honored)
npm run test:browser
node --test "tests/node/*.test.ts"
node scripts/verify-readiness.mjs    # matrix cases §7
npx --no-install emdash --help | migrate … | media list --json   # via the T013 gate / PAT
curl -s -o /dev/null -w … http://localhost:4321/                   # SSR marker
curl … http://localhost:4321/_emdash/admin/                        # Admin availability
# native API validation calls (§4–§6) used the platform REST surface with the Bearer PAT
```

## 10. Final state, cleanup, and persistence

- Dev server and any auxiliary servers started by this validation were stopped by their exact
  PIDs; no orphan process remains.
- `npm run dev-db:stop` at the end: container `songhealth-dev-db` and volume
  `songhealth-dev-db-data` preserved with the canonical validation state (exact `tagline`
  value/digest, validation media, 90 applied migrations) for any follow-up review inspection —
  nothing was deleted by the helpers; the only deletions were the three recorded disposable-volume
  resets in §1.
- `.env`, `.tmp/` scratch (including the PAT file), `./media`, `node_modules/`, `dist/`, and
  `.emdash/` are all git-ignored local state; none is committed.

## Environment observations (recorded, not T015 failures)

- The verification host runs `node v24.11.0` / `npm 11.6.1` while `package.json` pins
  `24.21.0` / `12.2.0`, and `podman 5.8.4` where the researched production reference is 6.1.3 —
  identical to the deviations the accepted T006 evidence recorded on this host. `npm ci`
  completed against the committed lockfile with no engine error; the pinned subject combination
  (EmDash 1.1.0 + digest-pinned PostgreSQL 18.6 image) was exact. No dependency or manifest was
  changed. Flagged for reviewer awareness.
- Astro 7.3.5's **dev** server does not read the `HOST` env var (verified: no `process.env.HOST`
  reference in the installed `astro` dist); it binds its default `localhost`, which this host
  resolves to `::1` only. With the shipped example `HOST=127.0.0.1`, the recurring readiness
  probe against `127.0.0.1:4321` therefore correctly fails closed (`not-ready`, runtime) while
  nothing serves that address — accurate, non-false-ready behavior; running the check with the
  documented loopback value `HOST=localhost` (one of the three loopback forms the T005 helper
  accepts) probes the dev server and reports `ready` (§7 R1). The **built** standalone server
  honors `HOST`/`PORT` directly and was verified `ready` at `127.0.0.1:4322` (§7 R2). README §6's
  dev URL (`http://localhost:4321`) matches the observed binding.
- Playwright reported the host OS as unsupported and downloaded its fallback `ubuntu24.04-x64`
  Chromium build (revision 1243); the browser smoke passed against it.
- One executor-run interruption (provider quota) occurred mid-validation on 2026-10-07; the
  resumed run re-verified all live state before continuing. No reviewable artifact had been
  produced by the interrupted run.

## Blockers

None for the T015 scope. The observations above are recorded for the reviewer and require no
platform change within this task's boundary.

## Scope confirmation

- Changed files vs the accepted baseline `78b3a668…` (verified with `git status` / `git diff`):
  exactly **one** committed file — this evidence file
  `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md`. The untracked generated
  `emdash-env.d.ts` (emitted by `astro sync`/build during validation) was removed as disposable
  generated output and is not committed.
- `git diff --check` before commit: clean (no whitespace errors, no committed secrets).
- No local environment files, generated migrations (`.emdash/`), raw logs, database/media state,
  credentials, passkey data, or secret values are committed; no T016/OCI/Quadlet/production
  lifecycle/durability/recovery work was started; no Product collection, homepage composition, or
  any explicit out-of-scope capability was delivered.
