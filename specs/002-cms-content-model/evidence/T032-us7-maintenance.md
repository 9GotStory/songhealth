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

---

# Corrective Round 1 — 2026-10-24 (Asia/Bangkok)

**Authorization**: Product Owner corrective comment `01a16e14-5201-754c-8701-ae772f71f1ec` ("Proceed with **T032 Corrective Round 1/3**… Fix only the Thai locale cookie propagation between `127.0.0.1:4322` and `localhost:4322`"), following the Lead's BLOCKED verdict (`01a16e05-4d92-7d42-9f36-56d1c89e9cce`) on the initial candidate. Lead corrective handoff: `01a16e15-6b06-7201-ac8a-104c51797a83`. **Corrective baseline**: `4314cb28438e32be361123b7c6efcdf94b91b0db` (Draft PR #37 OPEN, verified). Everything above in this file is the **historical initial-execution record and is preserved unchanged**: the original suite result **1 FAIL / 4 SKIP / 0 PASS**, the §3b diagnosis, and the original captures/log all stand exactly as recorded. This section records only Round 1.

## R1.1 The correction (smallest test-side change)

`tests/browser/cms-editor.spec.ts` `beforeEach` — before (baseline `4314cb2`):

```ts
test.beforeEach(async ({ page }) => {
	const origin = (await configuredDevelopmentOrigin()).replace(/\/+$/, "");
	await page.context().addCookies([{ name: "emdash-locale", value: "th", url: `${origin}/` }]);
});
```

After (Round 1): the same `url`-cookie for the configured origin, plus the **same non-authentication locale cookie for exactly the other verified loopback alias** of the configured port (dot-free `domain` = that host only — no subdomain or arbitrary-host expansion), with the corrective rationale documented in the file:

```ts
const LOOPBACK_HOST_ALIASES = ["127.0.0.1", "localhost"] as const;

test.beforeEach(async ({ page }) => {
	const origin = (await configuredDevelopmentOrigin()).replace(/\/+$/, "");
	const originHost = new URL(origin).hostname;
	await page.context().addCookies([
		{ name: "emdash-locale", value: "th", url: `${origin}/` },
		...LOOPBACK_HOST_ALIASES.filter((host) => host !== originHost).map((host) => ({
			name: "emdash-locale",
			value: "th",
			domain: host,
			path: "/",
		})),
	]);
});
```

Net diff: **+24/−1 lines in one function**. No assertion, timeout, redirect handling, session gate, helper, fixture or cleanup change anywhere; every assertion — including `lang=th` (`:1046`→`:1069` after the comment insert) and the native sign-in copy — is intact. TypeScript diagnostics: `npx tsc --noEmit` → **exactly the 3 unchanged pre-existing diagnostics** (all in `tests/node/foundation.test.ts`), before and after the change. Version-sensitive API usage verified against pinned Playwright documentation per repository policy (Context7 `/microsoft/playwright` v1.63.0, `BrowserContext.addCookies`): a cookie set with `url` is scoped to that URL's host; `domain`+`path` is the documented alternative and a dot-free domain value applies to exactly that host — which is what makes the alias entry the bounded propagation the authorization names, nothing broader.

## R1.2 Admission re-verification (before execution)

Controller `status`: serving source exactly `6ab72780c1a531956acc3c06838c3028e10ad77d`, app `56a74583da82…` / postgres `d91afe9ed319…` both running — unchanged identity vs every prior record. Controller `verify`: full PASS. Checkout at the exact corrective baseline `4314cb2` (+ this round's test edit only). No runtime, site-URL, schema, seed or dependency change; no lifecycle verb; no `podman exec`.

## R1.3 Discovery and execution — only the localization boundary test

- **Discovery**: `npx playwright test tests/browser/cms-editor.spec.ts --grep "native Admin boundary is reachable and localized in Thai with correct English fallback" --list` → **exactly 1 test in 1 file** (confirmed before running). The full suite and the authenticated journeys were NOT run.
- **Execution 1 (cold)**: same grep with `--workers=1 --retries=0`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322` → **1 failed**. **The corrected locale propagation is proven effective: the `lang="th"` assertion PASSED** (the run moved past it), and the redirected login document — reached at `http://localhost:4322/_emdash/admin/login?redirect=…` — now renders server-side Thai. The failure moved to the **next** fixed assertion, the native sign-in copy's `toBeVisible` (5.0s timeout, `cms-editor.spec.ts:1078`): the page snapshot still showed the un-hydrated `Loading EmDash...` shell when the window closed.
- **Execution 2 (warm re-run, to separate cold-start latency from determinism)**: identical outcome — `lang=th` passes; sign-in copy not visible within the fixed 5.0s; same snapshot.
- **Read-only timing probe** (diagnostic only, `.tmp/`, not a test change and not committed): with the same two loopback cookie entries — redirect answered in **147ms** with **`lang=th`** on the redirected host; the sign-in copy ("เข้าสู่ระบบด้วย Passkey", matched by the assertion's Thai|`Passkey` alternation) became **visible 5173ms after the redirect (5320ms total)**; **zero console/page errors**. Every hydration resource serves 200 on both hosts (island `PluginRegistry.mjs`, React renderer, the virtual registries, and the 46.3MB pre-bundled `@emdash-cms_admin.js` in ~0.6s).

**Mechanism conclusion (Round 1 finding)**: dev-mode hydration of the Admin SPA on this runtime takes ≈5.2s after redirect — deterministically just past the assertion's fixed 5.0s visibility window — while the authorized correction itself achieves exactly what it was scoped to do: the native Thai locale now propagates across the verified loopback redirect and the document (and the embedded island locale props) render Thai. The remaining failure is a **fixed-timeout margin, not absent functionality and not a localization defect**; adjusting that assertion's window was not part of this round's authorized correction ("keep the real … native sign-in-copy assertions intact"), so it is reported, not changed.

## R1.4 Cleanup and preservation (after execution)

Suite cleanup lines: `complete (entries attempted 0, media attempted 0, terms registered 0)` — this boundary test owns no fixtures and none were created; **zero residue, nothing UNKNOWN**. Post-run 19-GET read-only re-check (the committed admission driver, output not added to captures): zero synthetic entries/trash/media, schema state identical. Controller `status` after: same source SHA, same app/postgres container IDs, both running; `verify` → full PASS. Credential file untouched.

## R1.5 Round 1 standing

- **Correction proven effective end-to-end**: locale cookie propagates across `127.0.0.1:4322 → localhost:4322` (Lead-reproduced redirect), server renders `lang=th`, island carries `locale: th`, Thai sign-in copy renders.
- **The single authorized test still reports FAIL** at the next fixed assertion (sign-in-copy visibility, 5.0s window vs ≈5.2s observed hydration) — outside Round 1's authorized scope to alter; recorded for Lead/PO decision.
- Historical initial-suite record unchanged (1 FAIL / 4 SKIP / 0 PASS). Authenticated journeys remain HELD; staff evidence and **SC-007 remain PENDING**. No PASS claim. **T022 remains DEFERRED — NOT PASSED**; all other accepted outcomes/deferrals unchanged.

## Round 1 artifact provenance

| Item | Provenance |
| --- | --- |
| Commit | appended on `task/t032-9gotstory-269-maintenance-evidence` (descendant of `4314cb2`); Draft PR #37 updated, base `task/t031-9gotstory-268-cms-editor-smoke` unchanged |
| Changed files | `tests/browser/cms-editor.spec.ts` (+24/−1, §R1.1) and this evidence file (Round 1 section only) |
| Attachments | both Round 1 boundary-run console logs delivered on the corrective-result comment (gitignored `*.log`, T018/T030 precedent); probe output quoted verbatim in §R1.3 |

---

# Corrective Round 2 addendum — 2026-10-24 (Asia/Bangkok)

**Authorization**: [PO R2 Human Gate (PR #37 comment 6384941329)](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6384941329) ("NATIVE SIGN-IN READINESS ONLY"), PO issue comment `01a16e27-8d73-7034-ace9-84b3eb815590`, Lead R2 handoff `01a16e28-a1e3-7e28-b348-f36644c85a8d`; follows the Lead R1 BLOCKED verdict (`01a16e20-c155-7b53-b779-bf513722a5f6`) and the [ChatGPT R1 Independent Review](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6384919135). **R2 baseline**: `9bfbff22d437851ce6a6eb52253f535f76406dc5` (Draft PR #37 OPEN head, verified). Everything above — the initial record (§1–§6, **1 FAIL / 4 SKIP / 0 PASS**) and the whole Round 1 section — is preserved verbatim; this addendum appends R2 only. No other tracked file changed; no new tracked files.

**Qualifications required this round** (correcting R1 overcertainty per the ChatGPT R1 review):
- R1's "dev-mode hydration takes ≈5.2s … deterministically just past" wording is **provisional, now superseded by the R2 measurements below**: three fresh-load observations put AdminApp mount at 5.26–5.33s post-redirect on THIS runtime at THIS time — a measured distribution, not a universal threshold, and the R2 correction is bounded with ~4× margin rather than tuned to it.
- Cookies are **host/path-scoped, not port-isolated** (Playwright/browser cookie model): the R1 test comment's "loopback aliases of the configured port" phrasing describes the verified navigation/redirect destination, not a cookie-level port restriction. No authentication cookie is involved — the propagated value is the non-authentication locale preference only.

## R2.1 Admission (before diagnosis)

Controller `status`/`verify` only: serving source exactly `6ab72780c1a531956acc3c06838c3028e10ad77d`, app `56a74583da82…` / postgres `d91afe9ed319…` unchanged and running, full PASS; checkout clean at the exact R2 baseline. Origin `http://127.0.0.1:4322`.

## R2.2 Diagnosis before any edit (bounded, read-only, unauthenticated)

Three fresh browser contexts (fresh cookie jar each), navigating exactly as the boundary test does, milestone-instrumented; no session, no writes, not committed (`.tmp/` diagnostic, output below verbatim):

```
load 1: redirect settled +147ms → http://localhost:4322/_emdash/admin/login?redirect=… ;
  html lang "th" readable +187ms (loader still present: true);
  AdminApp mounted (loader detached) +5404ms (5257ms post-redirect);
  sign-in copy visible +5420ms (5273ms post-redirect, 16ms post-mount); copy: เข้าสู่ระบบด้วย Passkey;
  console/page/request errors: none; >=400 responses: none
load 2: redirect +129ms; lang "th" +165ms; mounted +5460ms (5331ms post-redirect);
  copy visible +5467ms (5338ms post-redirect, 7ms post-mount); errors none; >=400 none
load 3: redirect +129ms; lang "th" +177ms; mounted +5428ms (5299ms post-redirect);
  copy visible +5443ms (5314ms post-redirect, 15ms post-mount); errors none; >=400 none
```

**Diagnosis**: the redirect completes in ~130–150ms and the login document is server-rendered Thai (`lang=th` readable ~30–50ms later — the R1 locale propagation confirmed again on every load, loader shell still present at that moment). The sign-in copy is SPA-rendered: `AdminApp` mounts 5.26–5.33s post-redirect (download + parse of the 46.3MB pre-bundled admin app dominates), and the copy appears **7–16ms after mount**. The assertion's own 5.0s window starts when the `lang` check passes (~0.17s post-redirect) and therefore closes ~0.1–0.2s **before mount on every observed load** — matching the R1 runs' and the Lead's independent `Loading EmDash...` failure snapshots. **Alternative causes excluded by observation**: zero console errors, zero page errors, zero failed requests, zero ≥400 responses across all loads; every hydration resource serves 200 (R1 §R1.3). Residual uncertainty recorded honestly: three loads + R1's runs characterize THIS runtime now; load-dependent variance (host contention, colder caches) is why the correction below carries ~4× margin instead of a tuned threshold.

**Platform behavior source-verified** (pinned `@emdash-cms/admin@1.1.0` dist in this lockfile-exact checkout, the T031 verification method): `AdminApp`'s mount `useEffect` removes the boot loader — `document.getElementById("emdash-boot-loader")?.remove()` (`dist/index.js:77213`) — with i18n activated during the render that precedes it; the login UI renders with that same mount. The loader's dismissal is therefore the platform's OWN "SPA mounted" landmark, present server-rendered before mount.

## R2.3 The correction (smallest, boundary-test-only, login branch only)

`tests/browser/cms-editor.spec.ts` — inside the `/login` branch, one bounded readiness wait on the platform's own mount landmark, immediately before the unchanged real assertion (+19 lines including the directly necessary comment; nothing else changed):

```ts
// … the platform's OWN mount signal is the boot loader's dismissal …
await page.locator("#emdash-boot-loader").waitFor({ state: "detached", timeout: 20_000 });
await expect(page.getByText(PASSKEY_SIGNIN_COPY).first()).toBeVisible();   // unchanged, default window
```

- **Landmark, not a widened assertion**: the real sign-in-copy assertion keeps its default window byte-identical; `PASSKEY_SIGNIN_COPY`'s Thai|English fallback alternation is untouched, as are the `lang=th` assertion, the pathname predicate/redirect handling, the positive authenticated sidebar landmark, the R1 locale hook, all four gated journeys, helpers, fixtures and cleanup.
- **Bound justification**: 20s ≈ 4× the measured 5.26–5.33s mount, margin for colder transforms/host contention, still narrowly bounded and per-site (no global `expect.timeout` change, no sleep); a loader that never dismisses fails loudly as an environment truth — no FAIL→PASS/SKIP conversion is possible (the visible-copy assertion still guards the outcome; if the landmark element were ever absent pre-mount, `waitFor detached` simply proceeds and the unchanged assertion decides).
- **Playwright 1.63.0 semantics verified** (Context7 `/microsoft/playwright` v1.63.0): `waitFor` state `"detached"` = "wait for element to not be present in DOM"; per-assertion/per-wait `timeout` is the documented bounded option. `git diff --check` clean; `npx tsc --noEmit` → exactly the 3 pre-existing diagnostics, unchanged. The setup branch and the authenticated branch are untouched (the authenticated sidebar assertion may warrant the same readiness treatment when a legitimate session first exists — noted for a future authorized round; not changed on unexercised speculation).

## R2.4 Execution (single run, exactly the authorized case)

- **Discovery**: `--grep "native Admin boundary is reachable and localized in Thai with correct English fallback" --list` → **exactly 1 test in 1 file** (confirmed before running).
- **Execution** (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, `--workers=1 --retries=0`, pinned tooling, run ONCE — no retry-to-green): **1 passed, 0 failed, 0 skipped** (test 5.4s, total 6.3s). The run's own console line records the completed journey: `[cms-editor] Admin boundary reached at /_emdash/admin/login (unauthenticated; no session attempted)` — redirect → server-rendered `lang=th` → loader-detached mount landmark → native Thai sign-in copy visible. Full log attached to the R2 result comment.
- **Scope of this PASS — deliberately narrow**: it establishes the **localized unauthenticated Admin boundary only** (Thai document language + native Thai sign-in copy at the login outcome on the authorized origin). It is NOT the historical suite's rerun, NOT any authenticated journey, and NOT T032/US7/SC-007 acceptance: the four authenticated editor journeys remain **HELD/PENDING** (no legitimate browser session; PAT authorizes REST only), staff observation and **SC-007 remain PENDING**, and the initial **1 FAIL / 4 SKIP / 0 PASS** record plus all R1 results stand unchanged.

## R2.5 Cleanup and preservation

Suite cleanup: `complete (entries attempted 0, media attempted 0, terms registered 0)` — the boundary test owns no fixtures; none created; zero residue, nothing UNKNOWN. Post-run 19-GET read-only re-check: zero synthetic entries/trash/media, schema identical. Controller `status` after: serving SHA `6ab72780…`, same app/postgres container IDs, both running; `verify` → full PASS. No runtime/config/auth/schema/seed/dependency change, no lifecycle verb, no `podman exec`, no bypass endpoint, no second server. Worktree: only `tests/browser/cms-editor.spec.ts` modified plus this addendum; `t032/` captures and driver untouched.

## R2.6 Delivery

Appended on `task/t032-9gotstory-269-maintenance-evidence` as a descendant of `9bfbff2…` (ancestry: `4f4abe3` → `4314cb2` → `9bfbff2` → this commit); Draft PR #37 updated in place, base `task/t031-9gotstory-268-cms-editor-smoke` preserved; accepted T031 `4f4abe3…` and the canonical target unchanged. Changed files (exactly the two authorized paths): `tests/browser/cms-editor.spec.ts` (+19), `specs/002-cms-content-model/evidence/T032-us7-maintenance.md` (this addendum). R2 execution log delivered as a Multica attachment (not committed; `*.log` gitignored, T018/T030 precedent). **T022 remains DEFERRED — NOT PASSED**; T025 N/A, T026 acceptance, T030 limits and D-ITA/D-REF deferrals unchanged. No R3 is authorized.

---

# PO Deferral Record — 2026-10-24 (Asia/Bangkok)

**Provenance**: [Product Owner T032 deferral decision (PR #37 comment 6386273659)](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386273659), following the [Option B secure-test-authentication architecture NO-GO (PR #37 comment 6386211045)](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386211045) and the [Independent reconciliation review (PR #37 comment 6386381150)](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386381150); this record is authored under the [T032 Governance-only Deferral Record gate (PR #37 comment 6386423257)](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386423257). Evidence baseline: this file's entire prior content (initial record, R1, R2) is preserved byte-identically as the prefix of this appended section.

**Recorded standing**:

- **T032 [US7] = DEFERRED — NOT PASSED / NOT ACCEPTED.** This is an owner disposition concerning unmet authenticated-browser/session admission-security prerequisites (independently validated; Option B NO-GO), **not a demonstrated CMS failure and not task acceptance**.
- **Accepted isolated result preserved**: the R2 **localized unauthenticated native Admin login boundary — 1 PASS** ([Independent Review PR #37 comment 6385094908](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6385094908); [limited PO acceptance PR #37 comment 6385115750](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6385115750)) — an isolated single-case result, not a full-suite rerun and not T032 acceptance.
- **Historical record preserved**: initial execution **5 discovered / 0 PASS / 1 FAIL / 4 SKIP** (§3a) and the R1 diagnostic/correction history (§R1) stand unchanged; the four authenticated editor journeys remain **HELD/PENDING — never executed authenticated, not PASS, not SKIP-reclassified**.
- **SC-007 = DEFERRED — NOT VERIFIED / NOT PASSED** for the current phase: no staff participation was obtained, and automation never establishes staff comprehension. The requirement remains in force for a future phase.
- **Dependency standing**: **T022 remains DEFERRED — NOT PASSED**, independently blocking T033 alongside T032; T026 accepted, T030 bounded accepted, T025 conditional N/A, D-ITA/D-REF deferrals — all unchanged. Corrective rounds remain **2/3**; R3 neither used nor authorized.
- **No new tests, runs, or evidence were produced for this record**; no authentication, bypass, session or runtime work was performed.
