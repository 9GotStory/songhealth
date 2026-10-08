# T015 — User Story 1 Canonical Platform Validation Evidence

**Feature**: `001-platform-foundation`
**Task**: T015 (Phase 3: User Story 1 — **story gate**) — execute the US1 independent test from a
clean checkout with disposable non-confidential validation data/media; set and retrieve the native
EmDash Site Setting `tagline` with the exact value `Songhealth Feature 001 foundation validation`,
record its exact UTF-8 value and SHA-256 digest as the canonical database validation evidence, and
record redacted setup, build/start, public/Admin, readiness matrix, native migration
status/apply/check gate, media-writeability, and secret-redaction evidence in this file.
**Verification date**: 2026-10-08 (UTC). This document describes **only this fresh validation run**.
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer.
**Authorized baseline**: commit `62026004049af64f56be1ce113da56a024210e04`
(= `origin/001-platform-foundation`; direct parent
`78b3a6681e9a45b97d2c6e23107d3a6344c803a9`). The baseline carries the Product Owner-accepted
Human Gate `9GOTSTORY-156` change: the validated `HOST`/`PORT` inputs are wired into Astro's
native `server.host`/`server.port` configuration, with a focused regression in
`tests/node/config.test.ts`. Verified before any work: `git fetch origin` resolved
`origin/001-platform-foundation` to exactly this SHA; a fresh managed checkout produced a clean
worktree on the new agent branch `agent/claude-developer/2f6d8825c9df` at exactly this commit;
`git status` empty.
**Non-replay declaration**: the blocked branch `agent/claude-developer/1e839dc97648` and its
commits `2ab0d37999a4486988caced492ab53d7e419e2f0` / `23e30d2a7129cd7c4a50941cda39a4c2b496d6f3`
were not continued, cherry-picked, amended, or copied, and none of their database/media state,
logs, or recorded results is used as proof here. Every result below was produced by this run
against `6202600…`.
**Scope**: T015 only. Existing T008–T014 tests/scripts/configuration (including the accepted
Human Gate change) were executed as the implementation under validation and never modified. No
T016/OCI/Quadlet/production-lifecycle/durability/recovery work; no direct SQL writes; no
passkey-login automation; no EmDash-internal testing; no new public endpoint, framework,
service, or architecture.

## Method

- Followed `README.md` §Prerequisites–§10 and `.env.example` literally as an independent
  maintainer from the exact baseline: exact pinned toolchain → `npm ci` → `.env` with the
  documented development defaults → `mkdir -p media` → `dev-db:start` → `npm run
  verify:startup` → `npm run dev` (listener/public/Admin verification) → browser smoke →
  readiness matrix → focused Node suites → failure/redaction cases → documented shutdown.
- Every command ran under **exactly Node `24.21.0` and npm `12.2.0`** (verified per shell:
  `node --version` → `v24.21.0`, `npm --version` → `12.2.0`), from a self-contained toolchain
  installed in workspace scratch outside the repository (official `nodejs.org`
  `node-v24.21.0-linux-x64` tarball + `npm@12.2.0`, PATH-scoped; no system-wide change).
- All database/media content is disposable and non-confidential: the validation tagline, a
  deterministic 139-byte PNG, and a disposable admin identity. No secret value,
  credential-bearing URL, or encryption key appears in this artifact; secret-bearing inputs
  lived only in the ignored `.env` (mode 0600) and, for the validation PAT, a 0600 file under
  the ignored `.tmp/` scratch tree.
- Only documented native interfaces were used: the README/T013–T014 helper scripts, the native
  `emdash` CLI, the native EmDash REST surfaces (`/_emdash/api/...`), the native Admin UI setup
  wizard, and the native first-admin passkey ceremony performed by a browser-provided WebAuthn
  authenticator.

## Summary verdict

| # | T015 criterion | Result (this run) |
|---|---|---|
| 1 | Clean checkout from exactly `62026004049af64f56be1ce113da56a024210e04`; documented prerequisites; fresh disposable state with ownership-verified removal of prior non-canonical T015 resources | **PASS** |
| 2 | Exact pinned toolchain (Node 24.21.0 / npm 12.2.0) for every command; clean `npm ci`; zero engine warnings; lockfile unchanged | **PASS** |
| 3 | Production build emits `dist/server/entry.mjs` + native `.emdash/migrations.json` of the exact build | **PASS** |
| 4 | T013 startup-acceptance gate: manifest identity/secret-freeness, `--status`, inspected-target fingerprint-guarded apply, `--check`, bounded media write/read/remove with no residue | **PASS** (exit 0; gate header records the toolchain and `tested tree: 6202600…`) |
| 5 | Documented `npm run dev` path: **sole listener on the configured `127.0.0.1:4321` boundary**; `GET /` serves the T011 SSR marker | **PASS** |
| 6 | Native EmDash Admin availability and the applicable fresh first-admin setup/sign-in path (setup offered and completed once; native sign-in offered afterwards; passkey creation only — no login automated) | **PASS** |
| 7 | Canonical `tagline` set through the native platform path; retrieved through the native platform path; exact 44-byte value, no trailing newline; SHA-256 derived from the retrieved bytes | **PASS** — `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` (match) |
| 8 | Designated validation media stored/retrieved through the native media boundary; safe identity/path/size/SHA-256; byte equality; distinct from the T013 probe; no residue | **PASS** |
| 9 | T012 recurring readiness matrix through the documented configuration: normal READY; built-server READY; database unavailable → not-ready naming database; media missing → not-ready naming media without replacement; missing inputs → field-name-only; private and non-mutating | **PASS** |
| 10 | Focused Node suites (incl. the accepted HOST/PORT regression) and Playwright public/Admin smoke | **PASS** (48/48; 2/2) |
| 11 | Missing/invalid configuration and target-identity failures name fields only; supplied secret sentinels appear in **zero** captured outputs; no password, key, PAT, or full migration URL printed | **PASS** |
| 12 | Only this evidence file committed; `git diff --check` clean; committed-secret scan clean | **PASS** |

**Overall: every T015 validation criterion passes on this fresh run.** No blocker.

## Exact versions and identities

| Item | Value |
|---|---|
| Node.js / npm (exact pins; used for every command) | `v24.21.0` / `12.2.0` |
| Authorized baseline (tested tree) | `62026004049af64f56be1ce113da56a024210e04` (parent `78b3a668…`) |
| EmDash (installed = `package.json` pin = manifest `emdashVersion`) | `1.1.0` |
| Astro / Node adapter / React (installed = pins) | `astro 7.3.5` / `@astrojs/node 11.1.6` / `react`+`react-dom 19.2.4` |
| `pg` driver (installed = pin) | `8.23.1` |
| Playwright (`@playwright/test` installed = pin) / managed Chromium | `1.63.0` / `chromium-1243` (fallback build `ubuntu24.04-x64`; host OS unsupported by Playwright — warning recorded, smoke passed) |
| Development PostgreSQL image (pinned by digest in `scripts/dev-db.sh`; running container identity matched the pin) | `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf` |
| Host container runtime (recorded; README requires only a rootless session) | `podman 5.8.4` (rootless); plan's 6.1.3 is the production reference, not a dev prerequisite pin |
| Verification host | Fedora Linux x86_64; `localhost` is IPv6-first in address selection, which the accepted baseline fix makes irrelevant for the listener (§3) |

## 1. Clean checkout, prerequisites, dependency install, fresh disposable state

- `multica repo checkout … --fresh` → new clean worktree on branch
  `agent/claude-developer/2f6d8825c9df` at exactly `62026004049af64f56be1ce113da56a024210e04`;
  `git status` empty; `git log -1` confirms the baseline commit ("fix: wire validated HOST/PORT
  into Astro's native server configuration (T015 Human Gate)").
- **Prior non-canonical T015 resources removed only after ownership verification**: the
  existing `songhealth-dev-db` container was inspected and carries the T005 helper's ownership
  label (`songhealth/scripts/dev-db.sh`), the `songhealth-dev-db-data` volume was created by
  this executor's earlier T015 runs, and `./media` held only this executor's prior validation
  asset — all demonstrably disposable T015-owned resources. Removed explicitly
  (`podman rm` + `podman volume rm` + delete of the stale media file and `.tmp/t015` scratch),
  then recreated fresh. No non-disposable or production state existed or was touched.
- `.env` regenerated fresh from `.env.example` (git-ignored; mode 0600) with the documented
  development defaults verbatim — `EMDASH_SITE_URL=http://localhost:4321`, **`HOST=127.0.0.1`**,
  `PORT=4321`, `PGHOST=localhost`, `PGPORT=5432`, `PGDATABASE=songhealth`, `PGUSER=songhealth` —
  plus a freshly generated `PGPASSWORD`, the identity-matching
  `EMDASH_MIGRATION_DATABASE_URL`, and a freshly generated unique `EMDASH_ENCRYPTION_KEY`
  (written programmatically; never echoed).
- `mkdir -p media` (stable mount; no `MEDIA_DIRECTORY` input exists).
- `dev-db:start` on the removed-and-recreated resources → fresh PostgreSQL 18.6 initialized
  (container `songhealth-dev-db`, volume `songhealth-dev-db-data`, loopback `127.0.0.1:5432`);
  `ready` reported, exit 0. No alignment/recovery path was needed this run (fresh credentials
  match the fresh container).
- **`rm -rf node_modules && npm ci`** — PASS, exit 0: `added 599 packages, and audited 600
  packages in 14s; found 0 vulnerabilities`. The **complete** captured output contains **zero**
  `EBADENGINE`/engine warnings (the project engines and every dependency range, including
  `@emdash-cms/registry-verification@0.3.3`'s `^24.15.0`, are satisfied by Node 24.21.0).
  `package-lock.json` untouched (`git status` clean after install). npm 12 behavioral note,
  recorded: `esbuild@0.28.2`'s postinstall was blocked by npm 12's `allowScripts` — harmless
  here because Astro 7 builds through rolldown, and the T013 gate's own build passed
  immediately after.

## 2. Startup-acceptance gate (T013) — manifest, status/apply/check, media probe

`set -a; . ./.env; set +a; npm run verify:startup` against the fresh volume — exit **0**; the
gate rebuilds the exact application itself:

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
t013: [S6] INFO media probe .songhealth-startup-probe.I6xiKe5B80Tt: exclusively claimed, wrote and read back 85 identical bytes, then removed it; no residue remains
t013: [S6] PASS bounded disposable media write/read/remove probe passed against the stable media mount (exclusive claim, no clobber, no symlink follow)
t013: T013 startup acceptance gate: PASS
t013: tested tree: 62026004049af64f56be1ce113da56a024210e04
```

- The manifest belongs to the exact build at the exact baseline: the gate removes stale
  `.emdash/migrations.json`, builds itself, and asserts identity (`schemaVersion 1`,
  `emdashVersion 1.1.0`, **90** ordered migrations `001_initial`…`091_redirect_artifacts`, set
  fingerprint `319ab15f…46b69b`), checksum `0cb53f90…22495`, and secret-freeness (`://` absent;
  connection-variable **name** only) before consuming it.
- Native sequence exactly as documented: `--status` inspection (no mutation) → fingerprint
  `453b4163…d61ba3` derived from the inspected target (never hard-coded) → non-interactive
  guarded apply (all 90 on the fresh volume: `applied=0 pending=90` → `applied=90 pending=0`)
  → `--check` clean while applying nothing.
- The bounded media probe (startup acceptance, distinct from recurring readiness and from the
  validation media in §6) wrote/read/removed one exclusively-claimed disposable file under
  `./media` and proved no residue; after the entire validation the mount contained exactly the
  one designated validation asset (§6).

## 3. Documented dev start — sole listener on the configured boundary; public SSR

With the documented inputs loaded (`HOST=127.0.0.1`, `PORT=4321`), `npm run dev` started the
single Astro + EmDash platform. Listener and public verification:

```text
$ ss -tlnp | grep 4321
LISTEN 0 511  127.0.0.1:4321  0.0.0.0:*  users:(("MainThread",pid=…))     # the SOLE listener
$ curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/   → 200
$ curl -s http://127.0.0.1:4321/ | grep songhealth-foundation
<meta name="songhealth-foundation" content="public-runtime">              # exact T011 marker
$ curl http://[::1]:4321/                                        → 000 (refused)
```

- The accepted Human Gate change works as designed: `astro dev` consumes the validated
  `HOST`/`PORT` through Astro's native `server` configuration and binds exactly the configured
  loopback boundary — one socket on `127.0.0.1:4321`, nothing on `::1` or any other address.
  (This was the defect the earlier blocked rounds identified at the previous baseline; it is
  fixed by the accepted `6202600…` change, not by anything this run changed.)
- The configured public origin `EMDASH_SITE_URL=http://localhost:4321` also reaches the same
  application through that listener (address fallback after `::1` refuses): `GET
  http://localhost:4321/` → 200. The browser flow in §4 runs on this public origin.
- Documented production start path additionally verified: `node ./dist/server/entry.mjs` with
  `HOST=127.0.0.1 PORT=4322` → sole listener `127.0.0.1:4322`, `GET /` → 200 with the same
  marker, readiness `ready` (§7 R2).

## 4. Native EmDash Admin availability and the applicable fresh setup path

- **Availability before setup**: `GET /_emdash/admin/` → **302 → `/_emdash/admin/setup` → 200**
  — the native first-admin setup flow offered on the fresh database (redirect target on the
  configured origin; also asserted by the browser smoke).
- **Applicable setup path — completed once, natively**: the documented one-time setup wizard
  through the public Admin UI with a **disposable** identity
  (`t015-validation@songhealth.invalid`):
  1. *Set up your site* — site title `Songhealth T015 Validation`, tagline
     `Songhealth Feature 001 foundation validation` (the exact required value), native
     "Empty site" start (the committed explicit-empty seed defines no collections);
  2. *Create your account* — disposable email/name;
  3. *Secure your account* — **created a new passkey** via a browser-provided WebAuthn
     authenticator (Playwright CDP virtual authenticator: CTAP2, resident key, user
     verification — the automation equivalent of "a browser that supports passkeys"; the
     delegation authorizes passkey creation during first-admin setup). This is account
     **creation**; **no passkey login/sign-in was automated at any point**.
  - Recorded fact: the wizard's browser flow runs on the configured public origin
    `EMDASH_SITE_URL=http://localhost:4321` because WebAuthn ceremonies are origin-bound and
    EmDash derives the relying-party origin from `EMDASH_SITE_URL`. A first driver attempt on
    the raw `127.0.0.1` origin failed the ceremony client-side (origin mismatch — the wizard
    stayed on the step; no admin was created and setup remained unconsumed, so no reset was
    needed); the retry on the public origin completed. The listener fact of §3 is unaffected.
  - Verified native behavior (installed `emdash@1.1.0` source): `POST
    /_emdash/api/setup/admin/verify` creates the first admin and registers the passkey but
    establishes **no login session**, so the wizard's final "Open the dashboard" step lands on
    the native sign-in page. Recorded post-setup state:
    `GET /_emdash/admin/` → **302 → `/_emdash/admin/login`** — the native sign-in outcome the
    T010 contract accepts. The browser was closed without authenticating again.
- **Programmatic native API access for validation** (no login automation): the platform's own
  development-only bootstrap `POST /_emdash/api/setup/dev-bypass?token=1` — documented in the
  installed package source ("For agent/browser testing…", "Optionally create a PAT token
  (?token=1) for headless/CLI testing") — was used once on the disposable dev database to mint
  a scoped personal access token (`ec_pat_…`; saved to a 0600 file under the ignored `.tmp/`
  scratch; value never printed in full or committed; the saved JSON artifact stores only a
  redaction marker). The endpoint is gated to `import.meta.env.DEV` (production builds answer
  403), applies the same committed explicit-empty seed, and does not alter the canonical
  tagline/media state.
- **Auth boundary**: unauthenticated `GET /_emdash/api/settings` → **401**
  (`NOT_AUTHENTICATED`) — settings are not publicly exposed.

## 5. Canonical `tagline` — native set, native retrieval, exact value and SHA-256

**Set (native platform path).** The value was set through the native first-admin setup wizard's
site step (§4). Mechanism, verified in the installed `emdash@1.1.0` source and recorded for
traceability: `POST /_emdash/api/setup` overrides the loaded seed's `settings` with the wizard's
`title`/`tagline` form values, and the native seed applier writes them as the native Site
Settings `site:title` / `site:tagline` (write-once). **No direct SQL write was performed
anywhere in this validation; no hand-crafted seed file was introduced.**

**Retrieve (native platform path).** `GET /_emdash/api/settings` with the Bearer PAT → **200**:

```json
{ "success": true, "data": {
    "tagline": "Songhealth Feature 001 foundation validation",
    "title": "Songhealth T015 Validation" } }
```

**Exact value and digest — derived from the retrieved value.** The retrieved `data.tagline`
string was written verbatim to a scratch file: **44 bytes**, `od`-verified (final byte = `n` of
`validation`; **no trailing newline**). Independent derivations agree:

| Derivation | Result |
|---|---|
| `sha256sum` over the saved 44-byte UTF-8 file | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Node `crypto.createHash("sha256").update(value, "utf8")` over the in-memory retrieved string | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| Delegated expectation | `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` — **match** |

- Exact-value check: retrieved string === `Songhealth Feature 001 foundation validation`
  (**true**; 44 UTF-8 bytes).

## 6. Validation media — native storage, native retrieval, identity

- **Designated asset (new this run)**: deterministic public-publishable PNG
  `songhealth-t015-validation.png` (96×32, teal), **139 bytes**, SHA-256
  `3d8133b049b52f94d6f5a55ee8d1d1181b2eaa8a907eee557b16f0163a66198d`.
- **Native upload**: `POST /_emdash/api/media` (documented multipart REST boundary) with the
  Bearer PAT → **201 Created**; platform identity: mediaId `01M4CJ8AKP8W62Y21BSNVA6HBP`,
  storageKey `01M4CJ8AJRECG1DX2JN2Y95FDV.png`, MIME `image/png`, size 139.
- **Native retrieval**: `GET /_emdash/api/media/file/01M4CJ8AJRECG1DX2JN2Y95FDV.png` → **200**,
  139 bytes, SHA-256 **byte-identical** to the uploaded asset.
- **Native CLI confirmation**: `npx --no-install emdash media list --url http://127.0.0.1:4321
  --json` (PAT) lists the same item — `songhealth-t015-validation.png`, `image/png`, 139 B,
  storageKey `01M4CJ8AJRECG1DX2JN2Y95FDV.png`, status `ready`, native content hash
  `sha1:209414ee88f02d83882223f2e68456a6af8096dd`.
- **Stable mount / no residue**: the asset physically resides at
  `./media/01M4CJ8AJRECG1DX2JN2Y95FDV.png` (139 bytes, mode 0644, same SHA-256) and is the
  **only** file in the mount — the T013 probe removed its own disposable file with a no-residue
  proof, and this validation-media storage is a separate, deliberate act through the native
  media boundary (distinct from the gate's writeability probe, as required).

## 7. Recurring readiness matrix (T012; documented configuration; private, non-mutating)

`node scripts/verify-readiness.mjs` with the loaded documented inputs
(`HOST=127.0.0.1`, `PORT=4321`, `PG*` from `.env`) — no substitutions. Output is only a state
token, an ISO-8601 timestamp, and at most a safe field/dependency name.

| Case | Result | Exit |
|---|---|---|
| R1 Normal operation (`npm run dev` on the configured boundary; DB ready; media readable) | `songhealth readiness: ready` | **0** |
| R2 Built standalone server (`node ./dist/server/entry.mjs`, `HOST=127.0.0.1 PORT=4322`; readiness with those inputs) — "where applicable" | `ready` | **0** |
| R3 Database unavailable (`dev-db:stop`, volume preserved) | `not-ready`; `failed dependency: database (PostgreSQL connectivity check failed)` | **1** |
| R4 Expected media mount absent (directory moved aside for the check, then restored) | `not-ready`; `failed dependency: media (expected media mount missing or unreadable)` — no replacement created | **1** |
| R5a Missing `PGDATABASE` | `not-ready`; `missing required input: PGDATABASE` | **1** |
| R5b Missing `PGPASSWORD` | `not-ready`; `missing required input: PGPASSWORD` | **1** |

- Non-mutation affirmed: R4 left no created mount (the directory was absent throughout the
  check and was restored by the explicit operator `mv`); no readiness run wrote media or
  mutated the database. Migration mutation and the persistent media write remain exclusively
  in the T013 startup acceptance (§2), as designed.

## 8. Missing/invalid configuration and dependency failures — redaction evidence

Secret **sentinels** supplied as the secret-bearing values (`PGPASSWORD=SENTINEL-PGPASSWORD-t015f`,
migration-URL password `SENTINEL-MIGPW-t015f`, `EMDASH_ENCRYPTION_KEY=SENTINEL-ENCKEY-t015f`);
every captured output scanned for the sentinel strings.

| Case | Command (env curated around `.env`) | Output (verbatim, secret-free) | Exit | Sentinel hits |
|---|---|---|---|---|
| F1 Missing `EMDASH_ENCRYPTION_KEY` at build | `env -u EMDASH_ENCRYPTION_KEY npm run build` | `Songhealth runtime configuration is invalid (see .env.example): missing required input EMDASH_ENCRYPTION_KEY` | 1 | n/a |
| F2 `PGDATABASE`/URL target-identity disagreement at build (sentinels) | `PGDATABASE=songhealth_mismatch PGPASSWORD=SENTINEL… EMDASH_ENCRYPTION_KEY=SENTINEL… EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth:SENTINEL…@localhost:5432/songhealth npm run build` | `…invalid…: database identity disagrees between PGDATABASE and EMDASH_MIGRATION_DATABASE_URL` | 1 | **0** |
| F3 Same disagreement at the T013 gate (sentinels) | same env, `npm run verify:startup` | `t013: [S1] FAIL the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)` | 4 | **0** |
| F4 Dev container password mismatch (sentinel) | `PGPASSWORD=SENTINEL-wrong-db-pw-t015f npm run dev-db:start` | `existing container songhealth-dev-db does not match this helper or the requested configuration; mismatching: initialization password (POSTGRES_PASSWORD)` (+ refuse-to-mutate notice) | 4 | **0** |

- Across all captured outputs: only safe field/dependency names; **no** password, encryption
  key, PAT, or full migration URL was ever printed; sentinel scans counted **0** everywhere.
  The gate's passing run prints only the non-secret identity components and secret-free
  manifest/target fingerprints.

## 9. Focused tests

- `node --test "tests/node/*.test.ts"`: **48 pass / 0 fail across 11 suites**, including the
  accepted Human Gate regression suite `validated HOST/PORT are carried in the exported Astro
  server configuration` (PASS), alongside the configuration/redaction, aggregate-readiness,
  loopback-SSR, PostgreSQL-connectivity, media-mount, and missing-inputs contracts.
- `npx playwright install chromium` (once; cached `chromium-1243`) then `npm run test:browser`
  against the running dev server on the documented boundary: **2 passed** — public SSR marker;
  native Admin availability.

## 10. Commands executed (secret-free forms; every command under Node 24.21.0 / npm 12.2.0)

```bash
git fetch origin && git rev-parse origin/001-platform-foundation   # 62026004049af64f56be1ce113da56a024210e04
multica repo checkout https://github.com/9GotStory/songhealth.git --fresh
node --version && npm --version                                    # v24.21.0 / 12.2.0
rm -rf node_modules && npm ci                                      # full output captured (§1)
cp .env.example .env  # values written programmatically; documented defaults verbatim
mkdir -p media
set -a; . ./.env; set +a
npm run dev-db:start / dev-db:status / dev-db:stop
npm run verify:startup
npm run dev                           # sole listener 127.0.0.1:4321 (§3)
ss -tlnp | grep 4321                  # listener proof
curl … http://127.0.0.1:4321/         # SSR marker 200;  [::1]:4321 refused
node ./dist/server/entry.mjs          # built start HOST=127.0.0.1 PORT=4322 (§3, §7 R2)
node scripts/verify-readiness.mjs     # §7 matrix, documented inputs
node --test "tests/node/*.test.ts"
npx playwright install chromium && npm run test:browser
npx --no-install emdash media list --url http://127.0.0.1:4321 --json   # PAT-authenticated
# native API validation (§4–§6) used the platform REST surface with the Bearer PAT
```

## 11. Final state, cleanup, and persistence

- The dev server and the built standalone server started by this validation were stopped by
  their exact PIDs; no orphan process remains.
- `npm run dev-db:stop` at the end: container `songhealth-dev-db` and volume
  `songhealth-dev-db-data` preserved, holding this run's canonical validation state (exact
  `tagline` value/digest, validation media `01M4CJ8AJRECG1DX2JN2Y95FDV.png`, 90 applied
  migrations) for follow-up review inspection. The only deletions this run were the
  ownership-verified removals of prior non-canonical T015 resources before starting (§1).
- `.env`, `.tmp/` scratch (incl. the PAT file), the workspace-scratch toolchain, `./media`,
  `node_modules/`, `dist/`, and `.emdash/` are git-ignored/local state outside Git; the
  untracked generated `emdash-env.d.ts` (emitted by `astro sync`/build) was removed as
  disposable generated output.

## Environment observations (recorded, not failures)

- npm 12 blocks `esbuild@0.28.2`'s postinstall via `allowScripts` (recorded in §1); harmless
  under the pinned stack (Astro 7 builds through rolldown; the gate build passed).
- Playwright reports the host OS as unsupported and uses its fallback `ubuntu24.04-x64`
  Chromium build (revision 1243); the browser smoke passed against it.
- The host's default `node` (24.11.0) was not used for any command; every command ran under
  the PATH-scoped exact toolchain.

## Blockers

None. Every documented step of the US1 validation passed on this fresh run at the exact
canonical baseline.

## Scope confirmation

- Changed files vs the authorized baseline `6202600…` (verified with `git status` / `git
  diff`): exactly **one** committed file — this evidence file
  `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md`.
- `git diff --check` before commit: clean. Committed-secret scan: no sentinel values, no
  `ec_pat_` token, no password/encryption-key/migration-URL values, no passkey data; the only
  secret-adjacent strings are the documented sentinel *labels* supplied as inputs in §8, never
  any captured output.
- No application code, configuration, README, or T008–T014 artifact was modified; no local
  environment files, generated migrations (`.emdash/`), raw logs, database/media state,
  credentials, or secret values are committed; no T016/OCI/Quadlet/production
  lifecycle/durability/recovery work was started; no Product collection, homepage composition,
  or any explicit out-of-scope capability was delivered.
