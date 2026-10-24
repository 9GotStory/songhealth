# T032 — US7 Native Admin Runtime & Staff Maintenance Evidence

**Task**: `specs/002-cms-content-model/tasks.md` T032 [US7] — Run T031 and one bounded staff author/select/reuse/find/correct session; verify native Thai field/title/date labels, logical ordering, selectors, readable errors and timezone; record journeys/outcomes and any pending staff evidence in this file.
**Issue**: Multica `9GOTSTORY-269` (`01a16df2-58d8-7c31-9164-88a1582a8d9f`)
**Executor**: `claude-developer`. Lead handoff comment `01a16df4-eb85-7b64-bd4b-ebfeca1b74eb` (2026-10-24), corrective rounds 0/3 used.
**Authorization**: Product Owner T032 Human Gate APPROVED ([GitHub issue #26 comment 6384365534](https://github.com/9GotStory/songhealth/issues/26#issuecomment-6384365534)); read in full before work. No PASS claim is made by this evidence.

## 1. Exact identities and versions

| Item | Value | Source |
| --- | --- | --- |
| Task checkout (test source) | `4f4abe30e8f9595fb115ba33a4dc1e56c89bbb13` — accepted T031, Draft PR #36 head, OPEN/unmerged | `git rev-parse HEAD` on the new T032 branch before work |
| Candidate branch | `task/t032-9gotstory-269-maintenance-evidence` (created from the exact T031 SHA; tests/helpers byte-unchanged) | this PR |
| Direct stack base | `task/t031-9gotstory-268-cms-editor-smoke` (PR #36 branch); canonical target `002-cms-content-model` remains `01ae470ddc10e60c107c1e4d68be75c43d236736`, unchanged | PR base; `git rev-parse origin/002-cms-content-model` |
| Serving source (stable runtime) | `6ab72780c1a531956acc3c06838c3028e10ad77d` — exactly the README-recorded expected SHA; verified before AND after all work, unchanged (no promotion) | controller `status` |
| Runtime containers | app `56a74583da82…`, postgres `d91afe9ed319…`, both running — the SAME container IDs the accepted T018/T030 evidence recorded | controller `status` before and after |
| Controller operations used | `status`, `verify` ONLY; `verify` → full `PASS: exact Dev identity, migration check, DB connection, SSR and Admin availability` before and after | `runtime.sh status` / `runtime.sh verify` |
| Origin | `http://127.0.0.1:4322` (`PLAYWRIGHT_BASE_URL`, the dispatch's exact value); the runner starts no server (`playwright.config.ts` has no `webServer`) | run environment |
| Node / npm | v24.21.0 / 12.2.0 | pinned toolchain `/home/multica-agent/toolchain/node-v24.21.0-linux-x64` |
| Playwright / @playwright/test / playwright-core | 1.63.0; browser chromium v1243 (Chrome for Testing 153.0.8010.12, pre-installed) | lockfile-exact `npm ci`; `npx playwright --version` |
| Astro / EmDash / @emdash-cms/admin | 7.3.5 / 1.1.0 / 1.1.0 | `node_modules/*/package.json` after `npm ci` |
| PostgreSQL | 18.6 (documented pin, immutable digest; the controller's `verify` PASS covers live DB identity `songhealth_dev`/`songhealth_dev_app` and connection) | README runtime table + `verify` |
| Native identity (PAT actor) | `dev@emdash.local`, "Dev Admin", role **50** (Administrator) — verified live via `GET /_emdash/api/auth/me` through the unchanged `loadDevAccessToken()`/`createPatActor()` | admission capture (`t032/pre-state.json`) |
| Development credential | regular non-symlink file, mode `0600`, owner `1001:1001`, size 123, mtime `2026-10-16 19:13 +0700` — unchanged before/after; token into memory only, never printed | `lstat` discipline in the admission driver |

Task source and serving source are distinct and both recorded: the suite ran from the T031-exact test source at `4f4abe3…` against the serving source `6ab72780…`. No lifecycle verb, no `podman exec`, no source promotion, no schema write, no reseed, no second server/DB/media stack, no production access, no deletion of existing resources.

## 2. Read-only admission (before any execution)

Controller `status`: the one existing `songhealth-dev-app`/`songhealth-dev-postgres` pair, both running, stable source exactly `6ab72780…`. Controller `verify`: full PASS. Toolchain and dependency pins per §1. Native identity and schema read through 19 GETs (all HTTP 200) by the read-only driver `t032/t032-admission.mjs` (T030-driver credential discipline; GETs only; no credential material in the capture):

- **Applied native US1–US4 schema confirmed field-level** (`t032/pre-state.json`): `health_services` หน่วยบริการสุขภาพ (12 fields: required `title` ชื่อทางการ string; `image` ภาพหน่วยบริการ image; `offered_services` บริการที่ให้ reference → `facility_services`, parent side); `services` บริการ (15 fields: required `title` ชื่อบริการ; `external_url` ลิงก์บริการภายนอก url; `offering_facilities` reference child side); `announcements` ประกาศ (`announcement_at` วันที่ประกาศ datetime, optional; `dateField: announcement_at`); `activities` กิจกรรม (`gallery` แกลเลอรีภาพ repeater, subFields `image` type image **required** + `caption` type string optional).
- `facility_type` ประเภทหน่วยบริการ present, `hierarchical: false`, attached `[health_services]`, term inventory **0** (the intentional empty inventory); `facility_services` exactly one edge set (parent `health_services` ↔ child `services`, both maxima null) with exactly the two bound selectors; `area` attachments `[news, activities, health_reports, health_services]` — all matching the accepted seed/T030 after-state.
- **Every beforeAll schema-gate expectation of the T031 suite is satisfied by these live reads**, so all four journey gates read "ready" — the skips in §4 are session-gate skips, not schema skips.
- `GET /_emdash/api/settings` → success with **empty data object** (no `timezone` key): the site timezone is unreadable through this endpoint on this runtime; the suite records that best-effort and its domain-date test would assert a non-empty rendered value instead of an exact one (moot this run — that journey skipped).
- **Pre-run state**: zero synthetic (`songhealth-f002-synthetic`) entries in all four journey collections, zero trash rows, media store 0 items.

## 3. Automated execution — exact commands and results

Environment: `PATH=/home/multica-agent/toolchain/node-v24.21.0-linux-x64/bin:$PATH`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, `SONGHEALTH_DEV_ACCESS=/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json`, run once, serially (`--workers=1 --retries=0`), from the task checkout after lockfile-exact `npm ci`. The accepted T031 file `tests/browser/cms-editor.spec.ts` and `tests/browser/cms.helpers.ts` are **byte-unchanged** (`git diff 4f4abe3 --stat` empty for tests/). Full console log delivered as an issue attachment (`t032-cms-editor-run.log`).

- **Discovery**: `npx playwright test tests/browser/cms-editor.spec.ts --list` → **5 tests in 1 file** (matches the accepted T031 record; discovery performs no native calls).
- **Execution**: `npm run test:browser -- tests/browser/cms-editor.spec.ts --workers=1 --retries=0` → **1 failed, 4 skipped, 0 passed**. Discovered 5; executed to a terminal outcome 5 (1 FAIL, 4 SKIP).

### 3a. Per-test outcomes

| # | Test | Outcome | Detail |
| --- | --- | --- | --- |
| 1 | native Admin boundary is reachable and localized in Thai with correct English fallback (always runs) | **FAIL** | `expect(html).toHaveAttribute("lang", "th")` — received `"en"`; 5.0s assertion timeout (13 locator retries, value stable). See §3b for the root cause. |
| 2 | maintenance journey: Thai labels, search/status filter, find and reopen, native media/reference/taxonomy selectors, reuse, and explicit save | **SKIP** | Detection-based session gate: navigating `/_emdash/admin/content/health_services` lands on the native sign-in outcome — no authenticated Admin browser session exists in this context (PAT authorizes REST only). Skip reason is the suite's fixed `SESSION_PREREQUISITE` text; fixtures are created only after the gate, so this run owned nothing. |
| 3 | a real native validation error surfaces readably and is corrected (services ลิงก์บริการภายนอก) | **SKIP** | Same session gate (schema gate verified ready by §2 reads). |
| 4 | the domain date stays separate from publication state and system metadata (announcements วันที่ประกาศ) | **SKIP** | Same session gate. |
| 5 | the native gallery repeater: one task-owned image row with its optional caption, saved explicitly (activities แกลเลอรีภาพ) | **SKIP** | Same session gate (gallery subfield requiredness re-verified live: image required, caption optional). |

Timeouts observed: exactly the one 5.0s assertion timeout on test 1 (plus its bounded 8s redirect wait, which resolved). No other timeouts; no flaky retries (retries=0); the suite ran once.

### 3b. Test 1 failure — exact diagnosis (UI observation + read-only probes)

The browser navigated `http://127.0.0.1:4322/_emdash/admin/` with the suite's `beforeEach` locale cookie (`emdash-locale=th`, set through Playwright's `addCookies` for the URL `http://127.0.0.1:4322/` — the platform's own documented switcher mechanism). The application answered:

```
HTTP 302 → http://localhost:4322/_emdash/admin/login?redirect=%2F_emdash%2Fadmin%2F
```

— an **auth redirect to the app's configured site-URL host `localhost:4322`**, a different cookie host from the authorized origin `127.0.0.1:4322`. The locale cookie is host-scoped to `127.0.0.1`, so it was NOT sent on the redirected navigation; the server then resolved the locale from Chromium's default `Accept-Language: en-US` and rendered `<html lang="en">` (the redirect itself landed on the native login outcome, whose pathname the suite's URL predicate accepts). Read-only unauthenticated counterfactual probes (curl, no session):

| Probe | Result |
| --- | --- |
| `GET http://127.0.0.1:4322/_emdash/admin/login` + `Cookie: emdash-locale=th` | `<html lang="th">` |
| `GET http://localhost:4322/_emdash/admin/login` + `Cookie: emdash-locale=th` | `<html lang="th">` |
| `GET http://localhost:4322/_emdash/admin/login`, no cookie, no Accept-Language | `<html lang="en">` |
| `GET http://127.0.0.1:4322/_emdash/admin/login` + `Accept-Language: th`, no cookie | `<html lang="th">` |

**Conclusion**: the platform's native Thai localization behaves exactly as the T031 source verification records (cookie → Accept-Language → en; Thai fully supported). The failure is an **origin-interaction finding**, not a label/seed defect and not runtime degradation: the app's own configured site host (`localhost`) in its unauthenticated Admin redirect crosses hosts with the authorized test origin (`127.0.0.1`), so a cookie scoped to the authorized origin never reaches the redirected page. Surfaced for Lead/PO decision — both conceivable remedies (adjusting the T031 suite's locale mechanism, or the runtime's site-URL/origin configuration) are outside T032's authorized corrections ("do not modify tests/helpers/assertions to force success"; no live configuration change). **No `seed/seed.json` refinement is warranted**: every applied label verified in §2 matches the approved seed; the failure does not involve schema, labels or seed content at all.

## 4. What was and was not exercised

- **Automated, actually exercised**: the native Admin boundary at the authorized origin (302 to the native login outcome — one of the two accepted T010 unauthenticated outcomes); the live localization resolution behavior (server-rendered `lang`, cookie/Accept-Language fallbacks via §3b probes); the full REST-side journey prerequisites (PAT actor identity, schema/labels/selectors/relation/taxonomy reads — all 200, §2); the suite's two-phase failure-safe cleanup machinery (ran after every test; nothing to reconcile).
- **Automated, NOT exercised (SKIP, session prerequisite)**: the four authenticated editor journeys — list/search/status filter, find/reopen/edit, native media/reference/`facility_type`/gallery controls, explicit Save/Preview, the URL validation correction, and the domain-date/timezone versus publication/system-metadata separation. These remain **held, not passed**: a browser Admin session cannot be legitimately established from this environment (PAT is REST-only; passkey is never automated; `auth/dev-bypass` and re-running `setup/dev-bypass` are both forbidden by the authorization and were not touched).
- **Manual staff session: NOT collected — PENDING.** No authorized staff participant was available to sign in manually through supported native authentication during this run. Per the authorization, attributable staff observations (author/select/reuse/find/correct) are absent, so **staff evidence and SC-007 remain PENDING**; automation here proves nothing about staff comprehension.

## 5. Cleanup, readback and preservation

- **Owned fixtures**: zero created (the four journeys skipped before fixture creation). Every per-test and final-worker cleanup line reports `complete (entries attempted 0, media attempted 0, terms registered 0)`; zero unresolved identities, zero residue — nothing UNKNOWN remains from this run.
- **Post-test native verification** (`t032/post-state.json`, the same 19 read-only GETs, all 200): pre-state and post-state **identical** — zero synthetic entries, zero trash rows, zero media items in all four journey collections; `facility_type` terms 0; schema, relation, taxonomy attachments and site settings unchanged.
- **Runtime preservation**: controller `status` after all work — same stable source `6ab72780…`, same app/postgres container IDs as before work and as the accepted T018/T030 records, both running; `verify` → full PASS. Credential file stat/mode/mtime unchanged. No existing data deleted; no schema write; no restart; no source promotion; no `podman exec`.

## 6. Standing, non-claims and acceptance limits

- **Observed results**: admission PASS in full (§1–§2); automated execution 1 FAIL + 4 SKIP with the FAIL root-caused to the §3b origin-interaction finding; cleanup proven complete; runtime preserved identically.
- **PENDING**: staff maintenance evidence and **SC-007** (no staff participant); the four authenticated automated journeys (no legitimate browser session); the authenticated verdict is HELD — a skip is not a PASS and the failed localization assertion is not waived.
- **Not claimed**: any runtime/review PASS; T033 readiness (its T022/T026/T030/T032 dependencies keep their standing); any seed change (none needed/made); any change to the T031 tests/helpers (byte-unchanged).
- **Unchanged standing**: **T022 remains DEFERRED — NOT PASSED**; T025 N/A, T026 acceptance, T030 limits and the D-ITA/D-REF deferrals remain as recorded. No checkbox in `../tasks.md` was changed by this task.

## Artifact provenance (`specs/002-cms-content-model/evidence/t032/`)

| File | Provenance |
| --- | --- |
| `t032-admission.mjs` | The exact read-only driver (GETs only, T030 credential discipline) that produced both captures |
| `pre-state.json` / `post-state.json` | The 19-GET admission and post-test captures (identical schema/data state; no credential material) |
| *(external provenance)* | Full test console log delivered as an issue attachment (`t032-cms-editor-run.log`); `*.log` is gitignored (T018/T030 precedent) |
