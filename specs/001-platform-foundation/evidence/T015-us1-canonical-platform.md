# T015 — User Story 1 Canonical Platform Validation Evidence

**Feature**: `001-platform-foundation`
**Task**: T015 (Phase 3: User Story 1 — **story gate**) — execute the US1 independent test from a
clean checkout with disposable non-confidential validation data/media; set and retrieve the native
EmDash Site Setting `tagline` with the exact value `Songhealth Feature 001 foundation validation`,
record its exact UTF-8 value and SHA-256 digest as the canonical database validation evidence, and
record redacted setup, build/start, public/Admin, readiness matrix, native migration
status/apply/check gate, media-writeability, and secret-redaction evidence in this file.
**Verification dates**: 2026-10-07 – 2026-10-08 (UTC).
**Revision**: **round 2 (corrective)**. Round 1 executed the sequence under the host's default
Node 24.11.0 / npm 11.6.1 and marked the documented-prerequisites criterion PASS while substituting
`HOST=localhost` for the documented `HOST=127.0.0.1` in the recurring-readiness acceptance case —
both rejected by the Codex round-1 review. This round re-ran the canonical sequence from the exact
baseline under **exactly Node 24.21.0 and npm 12.2.0** (the pinned prerequisite) and followed the
committed README/`.env.example` development/readiness path **exactly, including `HOST=127.0.0.1`,
with no substitutions**. The retraction in §12 records exactly which round-1 claims were wrong and
why. The factual outcome of the documented path is a **FAIL** recorded in §7 and §11: the
`IMPLEMENTATION_BLOCKED` return is deliberate, per the round-1 review instruction ("If that exact
authorized path cannot produce the required ready result … report the factual FAIL/BLOCKED gate
outcome and return `IMPLEMENTATION_BLOCKED`").
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer.
**Authorized baseline**: commit `78b3a6681e9a45b97d2c6e23107d3a6344c803a9`
(= `origin/001-platform-foundation`; the accepted baseline through T014). Verified before any
work: clean worktree at exactly that commit on the agent implementation branch
`agent/claude-developer/1e839dc97648`.
**Tested tree**: repository sources unchanged from the baseline — T015 is a validation/evidence
task. The T013 gate in this round ran at `2ab0d37999a4486988caced492ab53d7e419e2f0` (the branch
carrying the round-1 evidence file, which this round-2 evidence replaces); the only delta vs the
baseline in either commit is this evidence file.
**Scope**: T015 only. Existing T009–T014 tests/scripts/configuration were executed as the
implementation under validation and never modified. No application code, configuration, README, or
requirement was changed under T015; no T016/OCI/Quadlet/production-lifecycle/durability/recovery
work; no direct SQL writes; no passkey-login automation; no EmDash-internal testing; no new public
endpoint, framework, service, or architecture.

## 0. Blocking finding (factual FAIL of the documented development/readiness path)

With the exact pinned toolchain and the committed README + `.env.example` followed literally
(`HOST=127.0.0.1`, `PORT=4321`; `set -a; . ./.env; set +a`; `npm run dev`;
`node scripts/verify-readiness.mjs` with the loaded inputs and **no substitution**), the
recurring readiness check reports:

```text
songhealth readiness: not-ready
timestamp: 2026-10-07T23:14:19.583Z
failed dependency: runtime (loopback SSR verification failed)   # exit 1
```

Precise cause, all verified under Node 24.21.0 on this host:

- `astro dev` (Astro 7.3.5, as pinned) does not read the `HOST` environment variable — the
  installed `astro` dist contains no `process.env.HOST` reference — so `npm run dev` binds its
  default `localhost`, which this host resolves to `::1` only:
  `ss -tlnp` → `LISTEN [::1]:4321`, and `curl http://127.0.0.1:4321/` → connection refused
  (000) while `curl http://localhost:4321/` → 200 with the SSR marker.
- The readiness helper correctly probes the documented `HOST`:`PORT` (`127.0.0.1:4321`), finds
  nothing listening there, and fails closed — **accurate, non-false-ready behavior**; the defect
  is the README §6 claim that the dev server "listens on HOST:PORT" together with the shipped
  `HOST=127.0.0.1` example, not the helper.
- Consequence beyond the ready case: with the documented inputs, every dev-workflow readiness
  invocation names `runtime` first, so the database/media dependency naming in the approved
  matrix is not reachable on this host either (§7).
- The documented `HOST`/`PORT` inputs **are** honored by the documented production start path:
  the built standalone server (`node ./dist/server/entry.mjs`) started with `HOST=127.0.0.1`
  `PORT=4322` answered `200` with the SSR marker and the readiness helper reported `ready`
  (exit 0) — §7 row B. The defect is specific to `astro dev` (README §6/§8).
- A repair (e.g. amending README §6, `.env.example`, or wiring the dev-server host) is outside
  T015's authorized boundary — the round-1 review explicitly forbids changing application code,
  configuration, README, or requirements under T015. This is escalated for Product Owner
  decision; T015 returns `IMPLEMENTATION_BLOCKED` on this criterion while every other criterion
  below passes under the exact toolchain.

## Summary verdict

| # | T015 criterion | Result (round 2, exact toolchain) |
|---|---|---|
| 1 | Exact documented prerequisite toolchain (Node 24.21.0 / npm 12.2.0) available and used | **PASS** (self-contained toolchain, §1) |
| 2 | `npm ci` against the committed lockfile; actual outcome captured | **PASS** — 599 added / 600 audited / 0 vulnerabilities; **zero engine warnings** (§1) |
| 3 | Production build emits `dist/server/entry.mjs` + native `.emdash/migrations.json` of the exact build | **PASS** |
| 4 | T013 startup-acceptance gate: manifest identity/secret-freeness, `--status`, fingerprint-guarded apply, `--check`, bounded media probe, no residue | **PASS** (exit 0; gate header itself records `node v24.21.0, npm 12.2.0`) |
| 5 | Application start and public SSR marker — dev server (at its native `localhost` binding) and built standalone server (`HOST`/`PORT` honored) | **PASS** |
| 6 | Native EmDash Admin availability and the applicable setup path (first-admin setup offered; completed once natively; native sign-in offered afterwards; sign-in never automated) | **PASS** |
| 7 | Canonical `tagline` set through the native platform path; retrieved through the native platform path; exact UTF-8 value + SHA-256 digest derived from the retrieved value | **PASS** — digest `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| 8 | Validation media stored/retrieved through the native media boundary; path/size/SHA-256 recorded; no disposable residue | **PASS** |
| 9 | Recurring readiness matrix on the **documented** path (`HOST=127.0.0.1`, no substitutions): expected `ready` for normal operation | **FAIL — blocking** (§0, §7): documented inputs yield `not-ready (runtime)`; no documented command/value produces `ready` on this host |
| 10 | Missing/invalid configuration and dependency failures name fields only; supplied secret sentinels appear in **zero** captured outputs | **PASS** |
| 11 | Focused Node tests and Playwright public/Admin browser smoke | **PASS** (47/47; 2/2) |
| 12 | No local environment files, generated migrations, raw logs, database/media state, credentials, passkey data, or secret values committed; `git diff --check` clean | **PASS** |

**Overall: FAIL/BLOCKED on the US1 documented dev-readiness acceptance path (criterion 9);
all other T015 validation criteria pass under the exact toolchain.** Returned as
`IMPLEMENTATION_BLOCKED` for Product Owner decision per the round-1 review instruction.

## Exact versions and identities

| Item | Value |
|---|---|
| Node.js / npm (the exact pinned prerequisite; used for every command this round) | `v24.21.0` / `12.2.0` |
| Toolchain provenance | official `nodejs.org` `node-v24.21.0-linux-x64` tarball + `npm@12.2.0` installed into a self-contained workspace-scratch prefix, PATH-scoped per shell; no system-wide change |
| Authorized baseline | `78b3a6681e9a45b97d2c6e23107d3a6344c803a9` (`origin/001-platform-foundation`) |
| EmDash (installed = `package.json` pin = manifest `emdashVersion`) | `1.1.0` |
| Astro / Node adapter / React (installed = pins) | `astro 7.3.5` / `@astrojs/node 11.1.6` / `react`+`react-dom 19.2.4` |
| `pg` driver (installed = pin) | `8.23.1` |
| Playwright (`@playwright/test` installed = pin) / managed Chromium | `1.63.0` / `chromium-1243` (fallback build for `ubuntu24.04-x64`; host OS unsupported by Playwright — warning recorded, smoke passed) |
| Development PostgreSQL image (pinned by digest in `scripts/dev-db.sh`; running container identity matched the pin) | `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf` |
| Host container runtime (recorded; README requires only "rootless Podman available") | `podman 5.8.4` (rootless); the researched 6.1.3 figure in the plan is the production reference, not a dev prerequisite pin |
| Verification host | Fedora Linux, x86_64; `localhost` resolves IPv6-first (`::1` before `127.0.0.1` in address selection — §0) |

## 1. Clean checkout, prerequisites, dependency install, configuration

- Checkout of `https://github.com/9GotStory/songhealth.git` on the agent branch produced a clean
  worktree at exactly `78b3a6681e9a45b97d2c6e23107d3a6344c803a9`; `git status` empty before work.
- **Prerequisite toolchain (round 2)**: every command this round ran under
  `PATH=<scratch>/node-v24.21.0-linux-x64/bin:…` with `node --version` → `v24.21.0` and
  `npm --version` → `12.2.0`, exactly the `engines`/`packageManager` pins. The toolchain lives in
  workspace scratch outside the repository and is not committed.
- `rm -rf node_modules && npm ci` — **PASS, exit 0**: `added 599 packages, and audited 600
  packages in 13s; found 0 vulnerabilities`. The **complete** captured output contains **zero**
  `EBADENGINE`/engine warnings — under Node 24.21.0 the project engines and every dependency
  range (including `@emdash-cms/registry-verification@0.3.3`, `^24.15.0`) are satisfied. (Package
  counts differ from round 1's 703/704 because npm 12 resolves/counts differently than npm 11;
  `package-lock.json` was consumed unchanged either way — `git diff` empty after install.)
  npm 12 behavioral note, recorded: `1 package had install scripts blocked because they are not
  covered by allowScripts: esbuild@0.28.2 (postinstall)` — harmless here because Astro 7 builds
  through rolldown, and the T013 gate's own `npm run build` (S2) passed immediately after.
- `.env` created from `.env.example` (git-ignored; mode 0600) with the **documented development
  defaults kept verbatim**: `EMDASH_SITE_URL=http://localhost:4321`, **`HOST=127.0.0.1`**,
  `PORT=4321`, `PGHOST=localhost`, `PGPORT=5432`, `PGDATABASE=songhealth`, `PGUSER=songhealth`,
  plus `PGPASSWORD`, the identity-matching `EMDASH_MIGRATION_DATABASE_URL`, and a freshly
  generated unique `EMDASH_ENCRYPTION_KEY` (values written programmatically; never echoed).
- **Database alignment (documented recovery path)**: the host's preserved T005/T006 development
  container/volume required aligning `PG*` to its initialization identity via
  `podman container inspect` per the README failure/recovery table (first start with a fresh
  password correctly failed closed, exit 4, `mismatching: initialization password
  (POSTGRES_PASSWORD)` — §8 F4).
- `mkdir -p media` per README §3 (stable mount; no `MEDIA_DIRECTORY` input exists).

### Disposable dev-database resets (explicitly recorded operator actions)

The one-time native first-admin setup ceremony is consumable once per database and its passkey is
bound to the performing browser's authenticator. Round 1 consumed it twice on incomplete driver
iterations (a URL-predicate bug, then the wizard's native success step) and reset the disposable
volume twice more to redo the one-time flow with complete capture (three resets total, plus one
fresh-volume re-run of the persisted-database gate idempotency check). Round 2 performed **one
further reset** (`dev-db:stop` → `podman rm songhealth-dev-db` → `podman volume rm
songhealth-dev-db-data` → `dev-db:start`) so the entire canonical sequence below ran on a fresh
volume under the exact toolchain — four resets total, all on this disposable development resource
only, same class of recorded operator action as the accepted T006 evidence. The T005 helper itself
never deleted anything (it offers no such behavior).

## 2. Startup-acceptance gate (T013) — manifest, status/apply/check, media probe

Round-2 canonical run against the fresh volume, under the exact toolchain
(`set -a; . ./.env; set +a; npm run verify:startup`, exit **0**; the gate rebuilds the exact
application itself):

```text
t013: [main] INFO node v24.21.0, npm 12.2.0
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
t013: [S6] INFO media probe .songhealth-startup-probe.cpYSwdbPA7Rg: exclusively claimed, wrote and read back 85 identical bytes, then removed it; no residue remains
t013: [S6] PASS bounded disposable media write/read/remove probe passed against the stable media mount (exclusive claim, no clobber, no symlink follow)
t013: T013 startup acceptance gate: PASS
t013: tested tree: 2ab0d37999a4486988caced492ab53d7e419e2f0
```

- Manifest belongs to the exact build: the gate removes stale `.emdash/migrations.json`, builds
  itself, and asserts identity (`schemaVersion 1`, `emdashVersion 1.1.0`, **90** ordered
  migrations `001_initial`…`091_redirect_artifacts`, set fingerprint `319ab15f…46b69b`),
  checksum `0cb53f90…22495`, and secret-freeness (`://` absent; connection-variable **name**
  only) before consuming it — identical to the values T006 recorded (deterministic emission).
- Native sequence exactly as documented: `--status` inspection (no mutation) → fingerprint
  `453b4163…d61ba3` derived from the inspected target (never hard-coded) → non-interactive
  guarded apply (all 90 on the fresh volume) → `--check` clean while applying nothing.
- **Idempotency observations**: round 1 additionally passed the gate against the persisted
  T006-era volume (`applied=90 pending=0`, verified no-op apply, `--check` clean), and the
  canonical tagline was re-retrieved identically after a database stop/start cycle — ordinary
  restarts never reinitialize the preserved volume.
- The bounded media probe wrote/read/removed one exclusively-claimed disposable file under
  `./media` with a no-residue proof; after the full validation the mount contained only the
  designated validation asset (§6).

## 3. Application start, public SSR marker, tests

- `npm run dev` (documented dev start): `GET http://localhost:4321/` → **200** `text/html` with
  the exact marker `<meta name="songhealth-foundation" content="public-runtime" />`. Binding
  fact (part of the §0 finding): the dev server listens on `[::1]:4321` only — `HOST=127.0.0.1`
  is not consumed by `astro dev`; `curl http://127.0.0.1:4321/` → connection refused.
- Built standalone start (`node ./dist/server/entry.mjs`, `HOST=127.0.0.1 PORT=4322` — the
  documented native server inputs): `GET http://127.0.0.1:4322/` → **200** with the same marker;
  readiness against it → `ready`, exit 0 (§7 row B). The `HOST`/`PORT` contract holds on this
  path.
- `npx playwright install chromium` (once; cached `chromium-1243`) then `npm run test:browser`
  against the running dev server: **2 passed** — public SSR marker; native Admin availability.
- `node --test "tests/node/*.test.ts"`: **47 pass / 0 fail** across 10 suites.

## 4. Native EmDash Admin availability and the applicable setup path

- **Availability before setup**: `GET /_emdash/admin/` → **302 → `/_emdash/admin/setup` → 200**
  (native first-admin setup offered on a fresh database; also asserted by the browser smoke).
- **Applicable setup path — completed once, natively, under the exact toolchain**: the documented
  one-time setup wizard through the public Admin UI with a **disposable** identity
  (`t015-validation@songhealth.invalid`):
  1. *Set up your site* — site title `Songhealth T015 Validation`, tagline
     `Songhealth Feature 001 foundation validation` (the exact required value), native
     "Empty site" start (the committed explicit-empty seed defines no collections);
  2. *Create your account* — disposable email/name;
  3. *Secure your account* — **created a new passkey** via a browser-provided WebAuthn
     authenticator (Playwright CDP virtual authenticator: CTAP2, resident key, user verification
     — the automation equivalent of "a browser that supports passkeys"). This is account
     **creation**; **no passkey login/sign-in was automated at any point**.
  - Verified native behavior (installed `emdash@1.1.0` source): `POST
    /_emdash/api/setup/admin/verify` creates the first admin and registers the passkey but
    establishes **no login session**, so the wizard's final "Open the dashboard" step lands on
    the native sign-in page. Recorded post-setup state:
    `GET /_emdash/admin/` → **302 → `/_emdash/admin/login?redirect=%2F_emdash%2Fadmin`** — the
    native sign-in outcome the T010 contract accepts. The browser was closed without
    authenticating again.
- **Programmatic native API access for validation** (no login automation): the platform's own
  development-only bootstrap `POST /_emdash/api/setup/dev-bypass?token=1` — documented in the
  installed package source ("For agent/browser testing…", "Optionally create a PAT token
  (?token=1) for headless/CLI testing") — was used once on the disposable dev database to mint a
  scoped personal access token (`ec_pat_…`; saved to a 0600 file under the ignored `.tmp/`
  scratch, value never printed in full or committed; the raw value was additionally scrubbed
  from the local JSON artifact). The endpoint is gated to `import.meta.env.DEV` (production
  builds answer 403), applies the same committed explicit-empty seed, and does not alter the
  canonical tagline/media state.
- **Auth boundary**: unauthenticated `GET /_emdash/api/settings` → **401**
  `{"code":"NOT_AUTHENTICATED"}` — settings are not publicly exposed.

## 5. Canonical `tagline` — native set, native retrieval, exact value and SHA-256

**Set (native platform path).** The value was set through the native first-admin setup wizard's
site step (§4). Mechanism, verified in the installed `emdash@1.1.0` source and recorded for
traceability: `POST /_emdash/api/setup` overrides the loaded seed's `settings` with the wizard's
`title`/`tagline` form values, and the native seed applier writes them as the native Site
Settings `site:title` / `site:tagline` (write-once). **No direct SQL write was performed anywhere
in this validation; no hand-crafted seed file was introduced.**

**Retrieve (native platform path).** `GET /_emdash/api/settings` with the Bearer PAT → **200**:

```json
{ "success": true, "data": {
    "tagline": "Songhealth Feature 001 foundation validation",
    "title": "Songhealth T015 Validation" } }
```

**Exact value and digest — derived from the retrieved value.** The retrieved `data.tagline`
string was written verbatim to a scratch file (44 bytes; `od`-verified — the final byte is the
`n` of `validation`, **no trailing newline**). Independent derivations agree:

| Derivation | Result |
|---|---|
| `sha256sum` over the saved 44-byte UTF-8 file | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Node `crypto.createHash("sha256").update(value, "utf8")` over the in-memory retrieved string | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Delegated expectation | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` — **match** |

- Exact-value check: retrieved string === `Songhealth Feature 001 foundation validation`
  (**true**; 44 UTF-8 bytes). Verified under both round-1 and round-2 toolchains, and across a
  database stop/start cycle (identical value/digest; no reinitialization).
- Recorded platform facts (installed 1.1.0, reviewer awareness): the settings **update** REST
  route is `POST /_emdash/api/settings` (the docs hub's `PUT` description does not match the
  pinned version — a `PUT` answers 404); no redundant settings update was needed or performed
  because the wizard natively set the exact value. The passkey-mode verify step does not also
  persist the legacy `emdash:site_tagline` key (only the OAuth callback path calls
  `finalizeSetup`); the canonical store used by this evidence and by the native settings API is
  `site:tagline`, which the wizard's native seed-settings path wrote.

## 6. Validation media — native storage, native retrieval, identity

- **Designated asset**: deterministic public-publishable PNG `songhealth-t015-validation.png`
  (96×32, teal), 139 bytes, SHA-256
  `3d8133b049b52f94d6f5a55ee8d1d1181b2eaa8a907eee557b16f0163a66198d`. (An SVG attempt was
  correctly rejected by the platform — `400 {"code":"INVALID_TYPE","File type not allowed"}` —
  because the native global upload allowlist deliberately excludes `image/svg+xml`; observed
  native security behavior, not worked around.)
- **Native upload** (round 2, exact toolchain): `POST /_emdash/api/media` (documented multipart
  REST boundary) with the Bearer PAT → **201 Created**; platform identity: mediaId
  `01M4CACYFT8HT3VSTTR34P4KYQ`, storageKey `01M4CACYBP7ZJBK3RN7258YRBN.png`, MIME `image/png`,
  size 139.
- **Native retrieval**: `GET /_emdash/api/media/file/01M4CACYBP7ZJBK3RN7258YRBN.png` → **200**,
  139 bytes, SHA-256 **byte-identical** to the uploaded asset.
- **Native CLI confirmation**: `npx --no-install emdash media list --url http://localhost:4321
  --json` (PAT) lists the same item — filename, MIME, size 139, 96×32, storageKey, native
  content hash `sha1:209414ee88f02d83882223f2e68456a6af8096dd`, status `ready`.
- **Stable mount / residue**: the asset physically resides at
  `./media/01M4CACYBP7ZJBK3RN7258YRBN.png` (139 bytes, mode 0644, same SHA-256). After the full
  validation the mount contains exactly this one file: the T013 probe removed its own disposable
  file, and the round-1 asset orphaned by the round-2 volume reset (its platform record died
  with the old volume) was removed as disposable residue by explicit operator action.

## 7. Recurring readiness matrix (private, non-mutating)

`node scripts/verify-readiness.mjs` prints only a state token, an ISO-8601 timestamp, and at
most a safe field/dependency name; it never mutates anything.

### A. Documented path (committed `.env.example` values, `HOST=127.0.0.1`; no substitutions)

| Case | Result | Exit |
|---|---|---|
| Normal operation (`npm run dev` running; DB ready; media readable) — documented inputs loaded from `.env` | `not-ready`; `failed dependency: runtime (loopback SSR verification failed)` | **1** |
| Database unavailable (`dev-db:stop`, volume preserved) | `not-ready`; `failed dependency: runtime (loopback SSR verification failed)` (runtime probe fails first; database naming unreachable on this host with documented inputs) | **1** |
| Expected media mount absent (directory moved aside for the check, then restored) | `not-ready`; `failed dependency: runtime (…)` (same masking) | **1** |
| Missing `PGDATABASE` | `not-ready`; `missing required input: PGDATABASE` (field name only) | **1** |

**Documented-path outcome: the approved `ready` state is NOT reachable — criterion FAIL (§0).**
Every fail-closed result above is individually correct (nothing serves `127.0.0.1:4321`), and no
undocumented value or command was used to obtain them.

### B. Documented inputs on the documented production start path (built standalone server)

| Case | Result | Exit |
|---|---|---|
| `node ./dist/server/entry.mjs` with `HOST=127.0.0.1 PORT=4322`; readiness with those inputs | `ready` | **0** |

`HOST`/`PORT` are honored by the built server; the defect is specific to `astro dev`.

### C. Supplementary diagnostics — NOT the documented acceptance path (recorded for the Product Owner's root-cause work; `HOST=localhost`, the loopback value the dev server actually binds on this host and one of the three loopback forms the T005 helper accepts)

| Case | Result | Exit |
|---|---|---|
| Normal operation | `ready` | **0** |
| Database unavailable | `not-ready`; `failed dependency: database (PostgreSQL connectivity check failed)` | **1** |
| Media mount absent | `not-ready`; `failed dependency: media (expected media mount missing or unreadable)` | **1** |
| Missing `PGPASSWORD` | `not-ready`; `missing required input: PGPASSWORD` | **1** |

These rows show the helper itself satisfies the approved ready/not-ready matrix once its probe
address matches a real listener; they are diagnostics only and are **not** offered as acceptance
results (the round-1 error, retracted in §12).

- Non-mutation affirmed throughout: the media-absent cases left no created mount (restored by
  explicit operator `mv`); no media write and no database mutation ever occurred in a readiness
  run. Migration mutation and the persistent media write remain exclusively in the T013 startup
  acceptance (§2), as designed.

## 8. Missing/invalid configuration and dependency failures — redaction evidence

Secret **sentinels** supplied as the secret-bearing values (`PGPASSWORD=SENTINEL-PGPASSWORD-t015`,
migration-URL password `SENTINEL-MIGPW-t015`, `EMDASH_ENCRYPTION_KEY=SENTINEL-ENCKEY-t015`);
every captured output scanned for the sentinel strings. All re-run under the exact toolchain
(round 2); results identical to round 1.

| Case | Command (env curated around `.env`) | Output (verbatim, secret-free) | Exit | Sentinel hits |
|---|---|---|---|---|
| F1 Missing `EMDASH_ENCRYPTION_KEY` at build | `env -u EMDASH_ENCRYPTION_KEY npm run build` | `Songhealth runtime configuration is invalid (see .env.example): missing required input EMDASH_ENCRYPTION_KEY` | 1 | n/a |
| F2 `PGDATABASE`/URL identity disagreement at build (sentinels) | `PGDATABASE=songhealth_mismatch PGPASSWORD=SENTINEL… EMDASH_ENCRYPTION_KEY=SENTINEL… EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth:SENTINEL…@localhost:5432/songhealth npm run build` | `…invalid…: database identity disagrees between PGDATABASE and EMDASH_MIGRATION_DATABASE_URL` | 1 | **0** |
| F3 Same disagreement at the T013 gate (sentinels) | same env, `npm run verify:startup` | `t013: [S1] FAIL the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)` | 4 | **0** |
| F4 Dev container password mismatch (sentinel) | `PGPASSWORD=SENTINEL-wrong-db-password-4T015 npm run dev-db:start` | `existing container songhealth-dev-db does not match this helper or the requested configuration; mismatching: initialization password (POSTGRES_PASSWORD)` + refuse-to-mutate notice | 4 | **0** |

- Across all captured outputs: only safe field/dependency names; **no** password, encryption
  key, or full migration URL was ever printed; sentinel scans counted **0** everywhere. The
  gate's passing runs print only the non-secret identity components and secret-free
  manifest/target fingerprints.

## 9. Commands executed (secret-free forms; every command this section under Node 24.21.0 / npm 12.2.0)

```bash
multica repo checkout https://github.com/9GotStory/songhealth.git   # clean at 78b3a668…
npm ci                                # after rm -rf node_modules; full output captured (§1)
cp .env.example .env                  # documented defaults kept verbatim incl. HOST=127.0.0.1
mkdir -p media
set -a; . ./.env; set +a
npm run dev-db:start / dev-db:status / dev-db:stop
npm run build
npm run verify:startup
npx playwright install chromium
npm run dev                           # binds [::1]:4321 (§0 finding)
node ./dist/server/entry.mjs          # built start; honors HOST/PORT (§7 B)
npm run test:browser
node --test "tests/node/*.test.ts"
node scripts/verify-readiness.mjs     # §7 A (documented inputs), B, C
npx --no-install emdash media list --url http://localhost:4321 --json   # PAT-authenticated
curl … http://localhost:4321/         # SSR marker 200
curl … http://127.0.0.1:4321/         # refused (§0 evidence)
ss -tlnp | grep 4321                  # [::1]:4321 binding evidence
# native API validation (§4–§6) used the platform REST surface with the Bearer PAT
```

## 10. Final state, cleanup, and persistence

- The dev server, the built standalone server, and any auxiliary processes started by this
  validation were stopped by their exact PIDs; no orphan process remains.
- `npm run dev-db:stop` at the end: container `songhealth-dev-db` and volume
  `songhealth-dev-db-data` preserved, holding the canonical round-2 validation state (exact
  `tagline` value/digest, validation media `01M4CACYBP7ZJBK3RN7258YRBN.png`, 90 applied
  migrations) for follow-up review inspection. Nothing was deleted by the helpers; the only
  deletions were the four recorded disposable-volume resets (§1) and the removed orphaned media
  residue (§6).
- `.env`, `.tmp/` scratch (incl. the PAT file and toolchain path outside the repo),
  `./media`, `node_modules/`, `dist/`, `.emdash/` are git-ignored local state; none is committed.

## 11. Blocker

**The documented US1 development/readiness acceptance path cannot produce the approved `ready`
state on this host, and T015 is not authorized to repair it.** Full statement in §0: `.env.example`
and README §2 prescribe `HOST=127.0.0.1`; README §6 states `npm run dev` "listens on HOST:PORT";
README §8 directs the readiness check with those inputs; but `astro dev` (Astro 7.3.5) ignores
`HOST` and binds the host-resolved `localhost` — `::1` only on this host — so the documented
readiness probe of `127.0.0.1:4321` correctly fails closed. The built standalone server honors
`HOST`/`PORT` and reports `ready` (§7 B), so the mismatch is between the README's dev-server
claim and Astro 7 dev-server behavior on IPv6-first-localhost hosts. Resolution requires a
Product Owner decision (amend README §6/§8 and/or `.env.example`, or wire the dev-server host in
`astro.config.mjs`) — each is a change T015 is explicitly forbidden from making. All other T015
criteria pass (§ Summary verdict).

## 12. Round-1 retraction (what was wrong, and what changed)

- **Toolchain claim**: round 1 ran under the host's Node 24.11.0 / npm 11.6.1 yet marked the
  documented-prerequisites criterion PASS, and stated `npm ci` completed "with no engine error" —
  the round-1 captured tail did not show engine warnings, but the claim was unverified against
  the full output and, as the reviewer's independent `npm ci` showed, that Node version is
  outside the project engines and outside `@emdash-cms/registry-verification@0.3.3`'s
  `^24.15.0`. **Retracted.** Round 2 ran everything under exactly Node 24.21.0 / npm 12.2.0
  with the complete `npm ci` output captured: zero engine warnings (§1).
- **Readiness acceptance claim**: round 1 presented `HOST=localhost` readiness rows as the
  acceptance matrix and claimed "documented prerequisites only; zero undocumented intervention".
  Substituting `HOST=localhost` is an undocumented deviation from the committed
  `.env.example`/README path. **Retracted as acceptance evidence**; those rows now appear only
  as clearly-labeled supplementary diagnostics (§7 C), and §7 A records the factual documented
  path outcome: `not-ready (runtime)` — the FAIL that blocks T015.
- Everything else from round 1 (gate, manifest identity, tagline value/digest, media, tests,
  failure redaction) was re-executed and re-captured under the exact toolchain this round.

## Environment observations (recorded, not failures)

- The verification host's default `node` is 24.11.0 / npm 11.6.1 (used unintentionally in round
  1 — see §12); round 2 used the self-contained exact toolchain for every command. Host podman
  is 5.8.4 (rootless); the README's only podman prerequisite is availability of a rootless
  session, and the development image is digest-pinned, so no prerequisite deviation remains.
- `localhost` on this host resolves IPv6-first for the dev-server bind (`::1`); `/etc/hosts`
  lists both families. Hosts that resolve `localhost` to `127.0.0.1` first would not reproduce
  the §0 failure as observed here — the defect is host-class-dependent, which is itself part of
  the finding.
- Playwright reports the host OS as unsupported and uses its fallback `ubuntu24.04-x64`
  Chromium build (revision 1243); the browser smoke passed against it.
- One executor-run interruption (provider quota) occurred during round 1; the resumed run
  re-verified all live state before continuing. Round 2 (this corrective) ran uninterrupted.

## Scope confirmation

- Changed files vs the accepted baseline `78b3a668…` (verified with `git status` / `git diff`):
  exactly **one** committed file — this evidence file
  `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md` (replacing the round-1
  version). The untracked generated `emdash-env.d.ts` (emitted by `astro sync`/build) was removed
  as disposable generated output and is not committed.
- `git diff --check` before commit: clean. Secret scan of the committed file: no sentinel
  values, no `ec_pat_` token, no password/key/URL values.
- No application code, configuration, README, T009–T014 artifact, or requirement was modified;
  no local environment files, generated migrations (`.emdash/`), raw logs, database/media state,
  credentials, passkey data, or secret values are committed; no T016/OCI/Quadlet/production
  lifecycle/durability/recovery work was started; no Product collection, homepage composition,
  or any explicit out-of-scope capability was delivered.
