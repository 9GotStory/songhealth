# T030 — US4 Runtime Facilities Verification Evidence

**Task**: `specs/002-cms-content-model/tasks.md` T030 [US4] — Inspect/apply US4 definitions and run T027 plus affected Service/reuse checks; record reciprocal IDs, supplied official-code/source/hierarchy evidence, location versus coverage, native coordinate validation, operational status and optional Area/link behavior in this file; leave unavailable real inventory evidence pending rather than treating synthetic codes as official.
**Issue**: Multica `9GOTSTORY-267` (`01a16b27-3ecd-7d1f-9907-524075e362b0`)
**Executor**: `claude-developer` (Developer). Lead review: `codex-lead-reviewer`; initial dispatch handoff comment `01a16b28-9f07-72d5-a44a-8872c82e5930` (2026-10-23), corrective rounds 0/3 used.
**Authorization**: Product Owner-authorized T030 [US4] only, under the Product Owner's exact approval ([GitHub issue #26 comment 6376983090](https://github.com/9GotStory/songhealth/issues/26#issuecomment-6376983090)): routine admission (controller `status`/`verify`) followed by supported native schema operations when admission passes. No second approval was required for those authorized steps. Delegated through the Lead handoff on 9GOTSTORY-267.

## 1. Exact identifiers and versions

| Item | Value | Source |
| --- | --- | --- |
| Accepted T029 baseline (branch base) | `c729aa6e702c886ad63c62c75f71712227a4ed4c` (PR #34 head, OPEN/unmerged) | checkout `git rev-parse HEAD` before work; PR #34 re-verified OPEN |
| Verified direct T028 parent | `f33545e7f1f93edab1bb29d529d38696e8ad3b6e` | `git log` at checkout (T029's direct parent) |
| Accepted unchanged T027 tests | `bb59693ae2466ef7876c8bc10138786ac377224e` | `git log` at checkout |
| Candidate branch | `task/t030-9gotstory-267-runtime-verification` (created from the exact T029 baseline) | this PR |
| Canonical target | `002-cms-content-model` at `01ae470ddc10e60c107c1e4d68be75c43d236736` | `git rev-parse origin/002-cms-content-model` before and after (unchanged) |
| Frozen/open heads preserved | PRs #27–#34 all re-verified OPEN at their accepted SHAs; no merge, rebase, push-force or branch change | `gh pr list` |
| Runtime source (stable) | `6ab72780c1a531956acc3c06838c3028e10ad77d` — the README-documented SHA, verified afresh | controller `status` before AND after all work (unchanged; no promotion) |
| Runtime containers | app `56a74583da82…`, postgres `d91afe9ed319…`, both running — the SAME container IDs the accepted T018 evidence recorded | controller `status` before AND after (no lifecycle action taken) |
| Origin | `http://127.0.0.1:4322` | single persistent development runtime; SSR marker `<meta name="songhealth-foundation" content="public-runtime">` re-probed 200 |
| Node / npm | v24.21.0 / 12.2.0 | pinned toolchain `/home/multica-agent/toolchain/node-v24.21.0-linux-x64` |
| Playwright / @playwright/test | 1.63.0 | lockfile-exact `npm ci`; `npx playwright --version` |
| Astro / EmDash | 7.3.5 / 1.1.0 | `node_modules/{astro,emdash}/package.json` (lockfile-exact) |
| Controller operations used | `status`, `verify` ONLY (the authorized routine verbs); `verify` → full `PASS: exact Dev identity, migration check, DB connection, SSR and Admin availability` before and after | `runtime.sh status` / `runtime.sh verify` |

No lifecycle verb (`up`/`stop`/`restart-app`/`promote`/`bootstrap`/…), no `podman exec`, no source promotion, no migration/seed replay, no second server/DB/media stack, no production access, no deletion of existing resources. Tests ran from the task checkout against the existing runtime with the runner's explicit origin override; `playwright.config.ts` has no `webServer` and starts nothing.

**Version-sensitive API verification** (recorded per `AGENTS.md` §External Documentation): Context7 (`/websites/emdashcms`) first — number fields support `validation.min`/`max` (inclusive), and a reference field binds to an existing relation via `validation.relation` + `relationSide` with one field per end (a second field over the same end is rejected). Then the authoritative installed `emdash@1.1.0` dist in this checkout's lockfile-exact `node_modules`: `dist/entry-lock-sxz2PGAT.mjs:516-535` (`fieldValidation` explicitly accepts `min`/`max` numeric and `relation`/`relationSide` enum tokens) and `dist/zod-generator-BQilAboC.mjs:143-144` (`validation.min`/`max` map to `z.number().min(...)`/`.max(...)` — inclusive bounds). This corroborates the accepted T027-recorded surface and the T018-verified schema write API used below.

## 2. Admission — controller, access, and the safe native maintenance route

- **Controller admission** (§1): `status` reported the one existing `songhealth-dev-app`/`songhealth-dev-postgres` pair, both running, stable source exactly `6ab72780…`; `verify` printed its full PASS line. Runtime identity (source SHA, containers) is independent of the repository/test SHA `c729aa6…` and was recorded as such. Toolchain, origin, SSR marker and DB identity per §1.
- **Native Admin/API access**: the existing development-scoped PAT was consumed from the mode-`0600` controller-format credential file through the accepted unchanged loader (`loadDevAccessToken()` → `createPatActor()`); the driver applies the identical fail-closed checks (regular non-symlink file, mode `0600`, token into memory only). File state before and after all work: regular file, mode `0600`, owner `1001:1001`, size 123, mtime `2026-10-16 19:13 +0700` — not rewritten, no permission change, never printed. Native identity: `GET /_emdash/api/auth/me` → account `01M52A3PGD2PS0WM525YD7A8KX`, `dev@emdash.local`, "Dev Admin", role **50** (Administrator); the test suites additionally pin `expected.role = 50` and assert `admin.email === "dev@emdash.local"`. The dev-bypass bootstrap was **never** called; no token rotation.
- **Safe route established** (before any write): the exact T018-precedent maintenance route — additive native schema POSTs/PUTs with pre-write comparison and stop-on-mismatch — is supported by the initialized runtime. Pending-deletion effects: all four collection-deletion queue states read **empty** through the supported native queue API before any write (`GET /_emdash/api/admin/media-usage/collection-deletions?state={pending,retry,leased,failed}` → 4 × HTTP 200, empty), so the platform's internal `finishPendingDeletion` pass on collection creation had nothing to resume; re-read empty after apply and after testing. Orphan tables: `GET /_emdash/api/schema/orphans` → `items: []` before, after and post-test. Media usage: media store 0 items throughout; the attempted bare `/_emdash/api/admin/media-usage?limit=1` observation probe answered **404** (no such list route in 1.1.0) — recorded truthfully as a refused read-only probe; the supported queue route above is the media-usage evidence. Generated-type effects: schema writes regenerate the runtime's live schema immediately without restart — proven by the Phase D read-back (below) through the same supported GETs the tests then consumed, matching the accepted T018 behavior.
- **No unsafe condition**: no conflicting definitions, no duplicated relation between the two collections, no unknown preservation effect on writes (the one whole-list attachment PUT carried the §4a preimage guard).

## 3. Actual before-state (native inventory, 2026-10-23T23:54Z)

All reads through supported native interfaces (`GET /_emdash/api/schema/collections[/{slug}?includeFields=true]`, `GET /_emdash/api/relations`, `GET /_emdash/api/taxonomies`, `GET /_emdash/api/schema/orphans`, the deletion-queue reads, content/trash/media listings). No direct SQL, no container exec. Full machine-readable snapshot: `t030/before-state.json`.

- **Collections (9)**: `documents`, `pages`, `news`, `activities`, `announcements`, `health_content`, `services`, `health_reports`, `personnel` — each compared field-by-field (labels, labelSingular, supports, titleField/dateField, types, requiredness, select options, repeater subfields, reference bindings, field order) against the accepted `seed/seed.json`: all matched exactly, with `services` missing **exactly** the T029 `offering_facilities` selector (the outstanding US4 delta) and nothing else. `personnel` is **present** and byte-matches its accepted T024 definition — a preservation input outside T030 scope (its runtime application belongs to T026's unexecuted join), recorded truthfully, untouched by this task.
- **US4 objects absent**: `health_services` → 404 on its per-collection read (the one expected pre-creation probe in the journal); `facility_services`, `facility_type` absent from the relations/taxonomies listings; `services.offering_facilities` absent; **zero** relations connecting `health_services` and `services` in either orientation (no duplicated backlink edge set).
- **Relations (5)**: `announcement_documents`, `document_successor`, `page_documents`, `report_document`, `service_documents` — all exactly the accepted T018-final definitions, each one parent-side bound field, `linkCount: 0`.
- **Taxonomies (10 incl. built-ins)**: `category`/`tag` (platform built-ins, unattached, untouched); attachments `document_type [documents]`, `news_category [news]`, `announcement_type [announcements]`, `service_category [services]`, `report_type [health_reports]`, `topic [documents, news, activities, announcements, health_content, services, health_reports]`, `audience [news, announcements, health_content, services]`, `area (hierarchical) [news, activities, health_reports]` — the topic/audience lists equal the accepted seed and `area` equals the accepted T018-final preimage exactly.
- **Data/media/link state**: all nine collections 0 live + 0 trash entries; media store 0 items; all relation `linkCount` 0. Nothing pre-existing required preservation beyond definitions and the `personnel` definition — and none was touched.

## 4. Applied native delta (18 writes, journal `t030/apply-journal.jsonl`)

Journal reconciliation: **98 records = 97 HTTP (79 GETs: 77×200 + 2×404 [the expected `health_services` pre-creation probe; the refused `media-usage` observation probe §2] + 18 writes: 16×201 + 2×200) + 1 terminal verification summary (`problems: []`).** **Zero DELETE/DROP/reset/recovery/retry operations.** Driven programmatically from the baseline `seed/seed.json` (single source of truth) with the pre-write comparison/stop guard of §3; relation declared before either selector was bound; dependency order per the accepted T018 directive:

1. **Collection (1 × POST 201)**: `health_services` (หน่วยบริการสุขภาพ), labelSingular + `supports` drafts/revisions/preview/scheduling.
2. **Ordinary fields (11 × POST 201)**: seed order with explicit `sortOrder` — required `title` (ชื่อทางการ); optional `facility_code`, `display_name`, `operational_status` (select: active/temporarily_closed/inactive), `address`, `latitude` (min −90, max 90), `longitude` (min −180, max 180), `opening_hours`, `public_contact`, `affiliation_text` (owner text — Organization N/A per the accepted T025/T026 disposition), `image`. Thai labels preserved exactly.
3. **Named relation (1 × POST 201)**: `facility_services` (parent `health_services` → child `services`, `maxChildrenPerParent: null` / `maxParentsPerChild: null` — many;many, unbounded), all four Thai labels. No reference field was created with a bare `targetCollection` (no auto-generated second edge set).
4. **Bound reference selectors (2 × POST 201)**: `health_services.offered_services` (optional, `validation { relation: facility_services, relationSide: parent }`) and `services.offering_facilities` (optional, `validation { relation: facility_services, relationSide: child }`) — the child-side selector appended to the EXISTING `services` collection at its seed order position (last), preserving all 14 pre-existing fields and their order.
5. **Title metadata (1 × PUT 200)**: `health_services` `titleField: title` (the accepted definition sets no `dateField`).
6. **Taxonomy (1 × POST 201)**: `facility_type` (ประเภทหน่วยบริการ, flat, `[health_services]`).
7. **Shared attachment update (1 × PUT 200)**: `area` → `[news, activities, health_reports, health_services]` — the one whole-list assignment, guarded per §4a. `topic`/`audience` re-verified at their accepted seed lists immediately before that PUT; no write issued for them.

### 4a. Area attachment preservation — evidence and retained UNKNOWN

The area PUT is a whole-list assignment (pinned 1.1.0 `handleTaxonomyUpdate`, the T018-recorded semantics), so preservation had to be established before writing. Three tiers, kept distinct:

1. **Observed visible evidence (PASS)**: the pre-apply filtered read showed exactly T018's journaled final list `[news, activities, health_reports]`; immediately before the C7 PUT the list was **re-read live** — after `health_services` existed, so any stored attachment to it would have become visible — and still equaled the T018 final list (no newly unhidden attachment, no drift). The PUT body was the accepted seed list, a strict **superset** of the visible preimage: every visible attachment retained, only `health_services` added. The driver would have stopped (and did not need to) on any preimage divergence, any newly unhidden attachment, or any would-be drop.
2. **Last-evidenced-writer chain (inference)**: T018's accepted whole-list PUT set the stored array to exactly the list above; T019–T029 were authoring tasks that made no runtime writes; no other writer is evidenced between T018 and T030, and any visible-state change by such a writer would have tripped the stop check.
3. **UNKNOWN (retained, not claimed as PASS)**: a hypothetical stored attachment to a collection outside those visible through filtered reads, written by an unjournaled actor between T018 and T030, cannot be excluded post-hoc through any supported native interface and would have been replaced by this PUT. No affirmative evidence any such entry ever existed; every visible attachment was retained. (Same standing as T018 §4a tier 3.)

**Collection-creation queue side effect**: all four deletion-queue states were read empty through the supported native queue API before any write (§2), so the internal `finishPendingDeletion` pass on the one collection creation here had nothing to resume; post-apply and post-test re-reads remain empty (§7).

## 5. Verified after-state (native read-back, `t030/after-state.json`)

`GET`-verified immediately after the writes; the driver's terminal comparison exited 0: **the active native schema equals the accepted seed for every live collection, relation and taxonomy** — labels/labelSingular, supports, titleField/dateField, per-field type/requiredness/validation (select options, numeric min/max, repeater subFields, reference relation+side bindings), field order, relation endpoints/labels/both maxima, taxonomy labels/hierarchy/attachments.

- **Collections (10)**: the nine pre-existing collections byte-identical to before (untouched; `services` now carries 15 fields = its 14 prior + the bound `offering_facilities` last); `health_services` reads back **12 fields** in seed order with `title` the only required field, `latitude −90..90` / `longitude −180..180` read back exactly, `titleField: title`, no `dateField`.
- **`facility_services` relation**: parent `health_services`, child `services`, both maxima `null` (many;many), `linkCount: 0` at rest, exactly **two** bound selectors — `health_services.offered_services` (parent side) and `services.offering_facilities` (child side) — over the one edge set; no other relation connects the two collections in either orientation.
- **Taxonomies (11 incl. built-ins)**: `facility_type [health_services]` created; `area (hierarchical)` at `[news, activities, health_reports, health_services]` with every prior attachment retained; `topic`/`audience`/the five kind-specific classifications and the two platform built-ins unchanged.
- **Generated-type/runtime effect**: the live schema reads (the same supported GETs the tests consume) reflect the applied definitions immediately — no restart, no source change, no migration (migration status remains at its accepted `check`-mode state; `verify` PASS throughout).
- Provenance: the applied objects carry native `source: "manual"` (applied by supported native API operations) versus `source: "seed"` on the bootstrap-applied collections — descriptive platform metadata only (same standing as T018 §5); definitions, labels and behavior are identical to the accepted seed intent.

## 6. Test execution (exact commands and results)

Environment: `PATH=/home/multica-agent/toolchain/node-v24.21.0-linux-x64/bin:$PATH`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, `SONGHEALTH_DEV_ACCESS=/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json`, run from the task checkout after lockfile-exact `npm ci` (`esbuild` postinstall blocked by the repository's allowScripts policy — no browser binary is launched by these API-level checks, same standing as T013/T018). Each suite run once, serially (`--workers=1 --retries=0`), first-attempt PASS (no retries, no corrections, no assertion changes). The runner starts no server (`playwright.config.ts` has no `webServer`); the occupied shared origin is its intended state.

- **Discovery**: `npx playwright test tests/browser/cms-facilities.spec.ts --list` → **20 tests in 1 file** (discovery performs no native calls; it is not execution).
- `npm run test:browser -- tests/browser/cms-facilities.spec.ts --workers=1 --retries=0` → **20 passed, 0 failed, 0 skipped, 0 flaky** (6.5s)
- **Bounded affected Service/reuse cases** (exactly the two `cms-reuse.spec.ts` cases that exercise the `services` collection whose definition the T029 delta modified): `npm run test:browser -- tests/browser/cms-reuse.spec.ts --workers=1 --retries=0 --grep "services schema precondition|shared identity: one Document and its native file"` → **2 passed, 0 failed, 0 skipped, 0 flaky** (1.9s)
- **Total 22/22 executed and passed; 0 skips (no requirement-blocking skips); 0 did-not-run.** Full console logs delivered as issue attachments on the implementation-result comment (the repository `.gitignore` excludes `*.log` globally; T018 precedent).

Per-case outcomes (all PASS):

| # | Case (cms-facilities.spec.ts) |
| --- | --- |
| 1 | health_services schema precondition: approved native data-field definition with inclusive coordinate ranges and no extra fields |
| 2 | facility_services precondition: exactly one reciprocal edge set, bound on both sides with unbounded maxima |
| 3 | the four Service ownership modes save and read back distinctly, ownership independent from channels |
| 4 | Service ownership guidance omissions are permitted and an invalid ownership value is refused |
| 5 | create/save/reopen: title-only minimal Health Service saves with permitted optional omissions |
| 6 | create refuses missing, null and empty required official-name title |
| 7 | update refuses invalid clearing of the required official-name title; the record stays intact |
| 8 | valid control: optional facility fields save and read back, including affiliation owner text and an image selection |
| 9 | coordinates: valid numeric zero and inclusive boundaries save and read back; invalid types and out-of-range values are refused |
| 10 | create refuses representative invalid supplied values for the approved optional facility types |
| 11 | operational_status changes alone never change publication state; no completeness rule gates publishing |
| 12 | synthetic area hierarchy retains supplied codes in slugs, parent identities and source description; label edits retain code/identity |
| 13 | facility physical address/coordinates are distinct from the coverage area selection |
| 14 | optional facility_type classification selects a clearly synthetic term |
| 15 | one shared Service at two facilities: exact reciprocal identities in both directions, no copied Service |
| 16 | the child-side offering_facilities selector writes the same single edge set |
| 17 | empty optional selections are permitted on both sides of the relation |
| 18 | staged versus live reciprocal semantics: a pending published-side edit is not a live edge until native publication |
| 19 | unauthenticated Save is an authorization refusal, distinct from native validation |
| 20 | a stale _rev facility update is a native state conflict, distinct from validation and authorization |

| # | Case (cms-reuse.spec.ts, bounded set) |
| --- | --- |
| 21 | services schema precondition: approved native definition is active |
| 22 | shared identity: one Document and its native file are selected unchanged from Announcement, Service and Health Report with zero duplicates |

Live coverage observed (runtime PASS, not source inspection), per the dispatch's verification list:

- **Reciprocal exact IDs in native staged/live states**: one Service related to two Health Services reads the SAME identity from both directions over the one edge set (each facility's `offered_services` children listing = exactly the shared Service id, once; the Service's `offering_facilities` parents listing = exactly the two facility ids, once each); the child-side selector writes the same edge the parent-side view reads; no duplicate Service record and no duplicated reverse relation exists. Staged/live semantics: a published facility's staged `offered_services` edit shows in the facility's own (drafts-reading) view but NOT as a live inverse edge until native publication promotes it — and promotion makes it live while the original edge survives.
- **Zero/range acceptance and native refusals**: coordinates 0/0, 90/180 and −90/−180 save and read back exactly; 90.0001, −90.5, 180.5, −180.5001 and non-numeric types (string, boolean) are refused 400 VALIDATION_ERROR, distinguishable from 401/403 authorization, 404 missing-schema and 409 CONFLICT state refusals.
- **Optional omissions**: title-only facility saves and publishes directly; every optional field's omission is valid; explicit empty selections on both relation sides save and read back empty.
- **Synthetic coded four-level Area hierarchy and label edits**: Province → District → Subdistrict → Village synthetic terms retain supplied code slugs, native parent identities and the synthetic source description; a Province label edit leaves slug/id identity and the child's parent pointer intact.
- **Location versus coverage**: one facility carries physical address + coordinates AND a coverage `area` term, each reading back its own value independently.
- **Operational status versus publishing**: `operational_status` transitions (active → temporarily_closed → inactive) never change the native publication state; the staged value reads for the drafts caller with `liveData` intact underneath; a title-only facility publishes with no completeness gate.
- **Reuse (bounded)**: the `services` schema precondition holds with the new selector present; SC-002 shared Document/file identity across Announcement/Service/Health Report still holds with zero duplicates after the services definition change.

**Synthetic-versus-official boundary**: every facility code, Area term and facility_type term used above is explicitly synthetic (marker-carrying slugs/labels/description), created and deleted through supported native term operations. **Real authoritative facility/Area inventory remains PENDING** (T001 §6) — no synthetic code is treated as official and no inventory acceptance is claimed.

## 7. Cleanup and preservation evidence

- **Owned-fixture cleanup**: all 22 per-test `[cms-*] owned-fixture cleanup after test: complete` lines present (20 facilities + 2 reuse); zero UNRESOLVED, zero residue. Synthetic area/facility_type terms were deleted child-before-parent through the native term API with ownership/identity guards (the suite's accepted T027 contract).
- **Post-test native verification** (`t030/post-test-verification.json`, **68 checks, 0 problems**): zero synthetic entries (`?q=songhealth-f002-synthetic&status=all`) and zero trash rows in all ten collections; media store empty (0 items); zero synthetic terms in `area` (complete hierarchical tree walk — descendants only appear nested), `facility_type` and `topic`; full live-schema re-check — collection set, per-collection labels/titleField/dateField/field count/order, per-field type/requiredness/label, numeric min/max (latitude/longitude), select options, reference relation+side bindings, relation endpoints/maxima and the TWO-selector `facility_services` binding (parent + child, one per side), taxonomy attachment sets and hierarchy flags — all equal to the accepted seed; orphan tables `[]`; deletion queue all four states HTTP 200 empty; credential file still mode `0600`. *(Correction applied during execution: the postcheck's first run reported 67/68 — its relation-binding check read wrong key names (`field`/`collection`) for the native `boundFields` shape (`fieldSlug`/`collectionSlug`); the underlying live binding was correct on first read. The script's key access was fixed and re-run to 68/68; no runtime state, test, seed or definition changed.)*
- **Pre-existing data/media**: none existed to lose (§3) — post-test counts confirm zero content in all collections and media; the tests left nothing behind.
- **Runtime preservation**: controller `status` after all work — same stable source `6ab72780…`, same app/postgres container IDs as before work and as the accepted T018 record, both running; `verify` → full PASS. Credential file stat/mode/mtime unchanged. The applied US4 definitions remain (they are this task's authorized deliverable, not task-owned temporary resources); the `personnel` definition and every pre-existing definition/data path are preserved untouched. No `podman exec`, no restart, no source promotion; tests ran from the task checkout against the existing runtime, as authorized.

## 8. Standing, non-claims and residual risks

- **Observed PASS**: admission (controller `status`/`verify`, toolchain, origin, identity); before-state equality with the accepted seed (incl. the T018-final area preimage and the untouched `personnel` preservation input); the 18-write additive US4 delta applied exactly as accepted; after-state full-schema equality with the accepted seed; 22/22 tests passed with zero skips; owned fixtures and synthetic terms fully cleaned; post-test verification 68/68; runtime identity and pre-existing definitions preserved.
- **UNKNOWN (retained, §4a tier 3)**: raw stored taxonomy preimage beyond the visible + T018-journaled state (a hypothetical never-visible attachment outside the visible collections) — no affirmative evidence any existed; every visible attachment retained.
- **PENDING / not claimed by T030**: real authoritative facility/Area code inventory and population (T001 §6) — synthetic codes prove behavior only; public-read safety (T021/T022 — **T022 remains DEFERRED — NOT PASSED**); role matrix (T019 runtime), revision/lock depth (T020 runtime), Admin UI journey (T031/T032); D-REF cross-record availability/removal enforcement (deferred — no availability/retention claim from selection identity); merge/integration/final acceptance; T033+ work.
- **Task markers**: no checkbox in `../tasks.md` was changed by this task (T030 and every other marker keep their prior state; a checked marker is not an acceptance state).
- Candidate delivery: committed on `task/t030-9gotstory-267-runtime-verification` with an evidence PR stacked on the T029 branch (`task/t029-9gotstory-266-facility-services-relation`, PR #34), targeting it as direct base; the canonical target `002-cms-content-model` (`01ae470…`) is unchanged and reported as the stack's eventual destination. No merge, no canonical branch update.

## Artifact provenance (`specs/002-cms-content-model/evidence/t030/`)

| File | Provenance |
| --- | --- |
| `before-state.json` | Phase A inventory capture (read-only, verified twice — inventory run and apply run Phase A; identical state) |
| `apply-journal.jsonl` | 98-record operation journal of the apply run (method/path/status/ms/request bodies; no credentials) |
| `after-state.json` | Phase D read-back immediately after the writes, with the terminal comparison result |
| `post-test-verification.json` | 68-check post-test preservation verification (§7) |
| `t030-driver.mjs` / `t030-postcheck.mjs` | The exact scripts that produced the journal/snapshots (run with the pinned Node 24.21.0 toolchain; credential loaded in-memory from the mode-0600 dev-access file, never printed). The postcheck embeds the §7 key-name correction |
| *(external provenance)* | The two full test-console logs are delivered as issue attachments (`t030-test-facilities.log`, `t030-test-reuse.log`), not repository artifacts (`*.log` is gitignored; T018 precedent) |
