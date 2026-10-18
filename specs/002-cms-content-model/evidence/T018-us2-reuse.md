# T018 — US2 Runtime Reuse Verification Evidence

**Task**: `specs/002-cms-content-model/tasks.md` T018 [US2] — Inspect/apply US2 definitions, run T014 and affected T003/T007 reuse checks, and record SC-002 shared-source identity, native Report requiredness/cardinality, optional omissions, truthful native failures and authorized media replacement/removal observations in this file; public-read safety is verified by T022 rather than inferred from selection validity.
**Issue**: Multica `9GOTSTORY-244` (`01a14dcd-71b0-7333-8135-539fc61e4416`)
**Executor**: `claude-developer` (Developer). Lead review: `codex-lead-reviewer`, corrective rounds 0/3 used at handoff (Lead handoff comment `01a14dce-ecbb-751e-a0c8-89777f3cd0f7`, 2026-10-18).
**Authorization**: Product Owner-authorized T018 [US2] only, delegated through the Lead handoff. T014–T017 are accepted source inputs consumed here; their definitions were not broadened.

## 1. Exact identifiers and versions

| Item | Value | Source |
| --- | --- | --- |
| Baseline (canonical) | `5af4b41f4d7ebbd4a5ccb29e776531828c38a970` on `002-cms-content-model` | `git fetch origin 002-cms-content-model` + `git rev-parse` at checkout; equals the authorized base exactly |
| Candidate branch | `t018-us2-reuse` (branched from the exact baseline; no prior work existed to preserve — the issue-managed checkout was clean at `001-platform-foundation` HEAD, reported here as required) | this PR |
| Runtime source (stable) | `6ab72780c1a531956acc3c06838c3028e10ad77d` | controller `status` before AND after all work (unchanged; no promotion) |
| Runtime containers | app `56a74583da82…`, postgres `d91afe9ed319…`, both running | controller `status` before AND after (same IDs — no lifecycle action taken by this task) |
| Origin | `http://127.0.0.1:4322` | single persistent development runtime |
| Node / npm | v24.21.0 / 12.2.0 | pinned toolchain `/home/multica-agent/toolchain/node-v24.21.0-linux-x64` |
| Playwright / @playwright/test | 1.63.0 | lockfile-exact `npm ci`; `npx playwright --version` |
| Astro | 7.3.5 | `node_modules/astro/package.json` (lockfile-exact) |
| EmDash | 1.1.0 | `node_modules/emdash/package.json` (lockfile-exact) |

Dependencies installed with `npm ci` (lockfile-exact; `esbuild` postinstall blocked by the repository's allowScripts policy — no browser binary is launched by these API-level checks, same standing as T013). No dependency added, upgraded or substituted; no second server/stack started; controller used for `status`/`verify` only.

## 2. Credential and identity evidence (no secrets)

- Existing development credential consumed at `/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json` through the accepted T013 loader (`loadDevAccessToken` → `createPatActor`; the schema driver applies the identical fail-closed checks: regular non-symlink file, mode `0600`, single-line JSON, token into memory only).
- File state before and after all work: regular file, mode `0600`, owner UID/GID `1001:1001`, single link, mtime unchanged (`2026-10-16 19:13 +0700`) — not rewritten, no permission change. The dev-bypass bootstrap was **never** called; no token rotation.
- Native identity: `GET /_emdash/api/auth/me` → account `01M52A3PGD2PS0WM525YD7A8KX`, `dev@emdash.local`, "Dev Admin", role **50** (Administrator); all three test suites additionally pin `expected.role = 50` and assert `admin.email === "dev@emdash.local"` at bootstrap.
- No token value, hash or credential-bearing string appears in the journal, snapshots, logs, or this report (the driver's journal records method/path/status/request bodies of schema operations only; test output is secret-scrubbed by the accepted T002 helpers).

## 3. Actual before-state (native inventory, 2026-10-18T07:07Z)

All reads through supported native interfaces (`GET /_emdash/api/schema/collections`, `GET /_emdash/api/schema/collections/{slug}?includeFields=true`, `GET /_emdash/api/relations`, `GET /_emdash/api/taxonomies`, `GET /_emdash/api/schema/orphans`, `GET /_emdash/api/admin/media-usage/collection-deletions?state=…`). No direct SQL, no container exec. Full machine-readable snapshot: `t018/before-state.json`.

- **Collections (6)**: `documents`, `pages`, `news`, `activities`, `announcements`, `health_content` — each compared field-by-field against the accepted `seed/seed.json`: Thai labels, types, requiredness (`title` required everywhere; `documents.file` required), field order, select options (`domain_status` current/superseded/expired), repeater subfields (`activities.gallery`), reference bindings (`successor`, `pages.documents`, `announcements.documents` — each parent-side), `titleField`/`dateField`, and `supports` all matched exactly. **Stop-on-mismatch guard passed.** Native-enriched metadata the seed does not declare (reference-field `validation.targetCollection`) was recorded in the snapshot and excluded from the equality comparison as native resolution output, not definition drift.
- **US2 objects absent**: `services`, `health_reports` returned 404 on their per-collection reads (the two 404 GETs in the journal); `service_documents`, `report_document`, `service_category`, `report_type` absent from the relations/taxonomies listings.
- **Relations (3)**: `announcement_documents`, `document_successor` (maxChildrenPerParent 1), `page_documents` — each with exactly one parent-side bound field and `linkCount: 0`.
- **Taxonomies (8 incl. built-ins)**: `category`/`tag` (platform built-ins, unattached, untouched); visible attachments `document_type [documents]`, `news_category [news]`, `announcement_type [announcements]`, `topic [documents, news, activities, announcements, health_content]`, `audience [news, announcements, health_content]`, `area (hierarchical) [news, activities]` — byte-equal to T013's journaled final visible state (evidence T013 §4.6).
- **Collection-deletion queue — the supported native read, not `schema/orphans`**: `GET /_emdash/api/admin/media-usage/collection-deletions?state={pending,retry,leased,failed}&limit=100` → **4 × HTTP 200, every list empty** (recorded verbatim in `t018/before-state.json`). No permission limit encountered. `GET /_emdash/api/schema/orphans` → `items: []` (orphan-table listing, kept distinct from queue evidence per the Lead directive).
- **Existing data/media/link state**: all six collections 0 live + 0 trash entries (`?status=all`, first page, no `nextCursor`); media store 0 items; all relation `linkCount` 0. Nothing pre-existing required preservation beyond definitions — and none was touched.

## 4. Applied native delta (32 writes, journal `t018/apply-journal.jsonl`)

Journal reconciliation: **99 records = 98 HTTP (66 GETs: 64×200 + 2×404 expected pre-creation probes + 32 writes: 27×201 + 5×200) + 1 terminal verification summary.** Write breakdown: 2 collection POSTs + 19 ordinary-field POSTs + 2 relation POSTs + 2 bound-reference-field POSTs + 2 metadata PUTs + 2 taxonomy POSTs + 3 attachment PUTs. **Zero DELETE/DROP/reset/recovery/retry operations.** Driven programmatically from the baseline `seed/seed.json` (single source of truth) with the pre-write comparison/stop guard of §3; order per the Lead directive — collections before relations, relations before binding reference fields:

1. **Collections (2 × POST 201)**: `services` (บริการ), `health_reports` (รายงานสุขภาพ), labelSingular + `supports` drafts/revisions/preview/scheduling from the accepted definitions.
2. **Ordinary fields (19 × POST 201)**: seed order with explicit `sortOrder` — services 13 (required `title`; optional summary, `ownership_type` select with the four approved direct/coordinated/related_health_service/external_digital options, provider_text, `channels` repeater with label string O + native url O subfields, eligibility/steps/required_documents_guidance/contact_location_guidance portableText, duration/fees/notes text, external_url url) and health_reports 6 (required `title`; optional summary, reporting_period, owner_source, report_at datetime, fiscal_year integer). Thai labels preserved exactly.
3. **Named relations (2 × POST 201)**: `service_documents` (services→documents, `null`/`null` — many-to-many) and `report_document` (health_reports→documents, **maxChildrenPerParent 1 / maxParentsPerChild null** — one Document maximum per Report, unlimited Report parents per Document), all four Thai labels each. No reference field was created with a bare `targetCollection` (no auto-generated relation).
4. **Bound reference fields (2 × POST 201)**: `services.documents` (optional, `validation { relation: service_documents, relationSide: parent }`) and `health_reports.report_document` (**required: true**, `validation { relation: report_document, relationSide: parent }`). After-state shows each named relation with exactly **one bound field, on the parent side** — no duplicate edge set (the T017 concern).
5. **Title/date metadata (2 × PUT 200)**: services `titleField: title` (its `dateField` was never set — the accepted definition has none); health_reports `titleField: title` + `dateField: report_at`.
6. **New taxonomies (2 × POST 201)**: `service_category` (หมวดบริการ, flat, `[services]`) and `report_type` (ประเภทรายงาน, flat, `[health_reports]`).
7. **Shared attachment updates (3 × PUT 200)**: `topic` → `[documents, news, activities, announcements, health_content, services, health_reports]`, `audience` → `[news, announcements, health_content, services]`, `area` → `[news, activities, health_reports]`. See §4a for the preservation proof and retained UNKNOWN.

## 4a. Taxonomy attachment preservation — evidence and retained UNKNOWN

The three shared-taxonomy PUTs are whole-list assignments (pinned 1.1.0 `handleTaxonomyUpdate`), so preservation had to be established before writing. Three tiers, kept distinct:

1. **Observed visible evidence (PASS)**: pre-apply filtered reads showed exactly T013's journaled final lists; immediately before each C7 PUT the lists were **re-read live** (3 GETs in the journal) — after `services`/`health_reports` existed, so any stored attachment to those two would have become visible — and still equaled T013's final lists exactly (no newly unhidden attachment; no visible drift). Each PUT body was the accepted seed list, a strict **superset** of the visible preimage: every visible attachment is retained, nothing dropped, only additions made. The driver would have stopped (and did not need to) on any preimage divergence, any newly unhidden attachment, or any would-be drop.
2. **Last-evidenced-writer chain (inference from journaled semantics, not stored-state proof)**: T013's accepted whole-list PUTs set the stored arrays to exactly the lists above (whole-list assignment replaces the array); T014–T017 were authoring/definition tasks that made no runtime writes; no other writer is evidenced between T013 and T018, and any visible-state change by such a writer would have tripped the C7 stop check.
3. **UNKNOWN (retained, not claimed as PASS)**: a hypothetical stored attachment to a collection **outside the eight now existing** — i.e. never visible through any filtered read — written by an unjournaled actor between T013 and T018 cannot be excluded post-hoc through any supported native interface and would have been replaced by these PUTs. There is no affirmative evidence any such entry ever existed; every visible attachment was retained and no observable loss occurred, but the raw-stored preimage beyond the visible+journaled state remains formally UNKNOWN, reported separately per the Lead directive. This mirrors and does not widen T013's F1 limit: T013's own historical F1/F2 UNKNOWNs remain historical records of that task.

**Deletion-queue side effect (T013 F2 analog) — discharged as a pre-apply fact for THIS task's creations**: ordinary native collection creation internally runs the platform's `finishPendingDeletion` pass; because all four queue states were read **empty through the supported native queue API before any write** (§3), that pass had nothing to resume for the two creations here. The post-test re-read (§7) shows all four states still empty. T013's historical F2 UNKNOWN (its own pre-T013 queue history) is retained unchanged as history.

## 5. Verified after-state (native read-back)

`GET`-verified immediately after the writes (`t018/after-state.json`) and re-verified after all testing (`t018/post-test-verification.json`):

- **Collections (8)**: the accepted ten-collection model's eight content collections active; `services` reads back **14 fields** in seed order (13 ordinary + bound `documents`), `health_reports` **7 fields** (6 ordinary + bound `report_document`), with Thai labels, `supports`, `titleField`/`dateField`, and native requiredness exactly as accepted. The six US1/Document collections byte-identical to before (untouched).
- **Relations (5)**: `announcement_documents`, `document_successor` (maxChildren 1), `page_documents`, `report_document` (**maxChildrenPerParent 1, maxParentsPerChild null**), `service_documents` (null/null) — each exactly one parent-side bound field, `linkCount` 0 at rest.
- **`health_reports.report_document`**: `type: reference`, **`required: true`**, `validation { relation: report_document, relationSide: parent }` — the T017 mandatory binding, active natively.
- **Taxonomies (12 incl. built-ins)**: `service_category [services]`, `report_type [health_reports]` created; `topic`/`audience`/`area` at the accepted lists with every prior attachment retained; built-ins `category`/`tag` untouched; `document_type`/`news_category`/`announcement_type` unchanged.
- Driver terminal comparison: **active native schema equals the accepted seed** for every collection, relation and taxonomy definition (exit 0); post-test re-comparison: 47/47 checks pass.

Provenance note: the two applied collections carry native `source: "manual"` (applied by supported native API operations) versus `documents`' `source: "seed"` — descriptive platform metadata only (same standing as T013 §4a); definitions, labels and behavior are identical to the accepted seed intent.

## 6. Test execution (exact commands and results)

Environment: `PATH=/home/multica-agent/toolchain/node-v24.21.0-linux-x64/bin:$PATH`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, `SONGHEALTH_DEV_ACCESS=/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json`, run from the task checkout after lockfile-exact `npm ci`. Each suite run once, serially, first-attempt PASS (no retries, no corrections, no assertion changes):

- **Discovery**: `npx playwright test tests/browser/cms-reuse.spec.ts tests/browser/cms-document.spec.ts tests/browser/cms-authoring.spec.ts --list` → **45 tests in 3 files** (cms-reuse 16, cms-document 13, cms-authoring 16).
- `npm run test:browser -- tests/browser/cms-reuse.spec.ts --workers=1 --retries=0` → **16 passed, 0 failed, 0 skipped, 0 flaky** (8.1s)
- `npm run test:browser -- tests/browser/cms-document.spec.ts --workers=1 --retries=0` → **13 passed, 0 failed, 0 skipped, 0 flaky** (3.1s)
- `npm run test:browser -- tests/browser/cms-authoring.spec.ts --workers=1 --retries=0` → **16 passed, 0 failed, 0 skipped, 0 flaky** (9.0s)
- **Total 45/45 executed and passed; 0 skips (no requirement-blocking skips); 0 did-not-run.** Full console logs: `test-cms-reuse.log`, `test-cms-document.log`, `test-cms-authoring.log`, delivered as issue attachments on the implementation-result comment (see § Artifact provenance).

Live coverage observed (runtime PASS, not source inspection), per the Lead's list:

- **Shared Document ID/file identity (SC-002)**: one Document and its native file selected unchanged from Announcement, Service and Health Report with zero duplicate records (native listings by marker-unique title/filename traversed to explicit cursor exhaustion).
- **Raw Media reuse/metadata/usage**: a public image selected and reused without any semantic Document; native alt and caption maintained and read back; mimeType/size/dimensions read back from the actual uploaded bytes; usage metadata read as the documented opt-in shape (observed `count=null coverage=stale` — asynchronous indexing, truthfully recorded, no immediacy or exact-value claim).
- **Document successor context**: domain status and successor identity distinct from publication state, including the staged/live read distinction.
- **Required reference semantics**: create refusals for omitted, empty, wrong-target (404 NOT_FOUND family) and excessive (over-cardinality) `report_document` selections (400 VALIDATION_ERROR, distinguishable from 401/403/409); invalid clear of the required selection refused with the selection surviving.
- **Optional omissions/relations**: a valid-selection Report saves as an incomplete draft with every other optional value omitted; optional relations (`service_documents`, `announcement_documents`) may be supplied empty.
- **Publish versus Schedule**: native Publish accepts valid incomplete reports and multi-Document announcements after its requiredness/cardinality recheck; a report whose required selection was emptied (sole target purged) refuses re-Publish while Schedule acceptance applies no reference predicate; future-offset schedule accepted and read back, unschedule works.
- **Authorized target/media maintenance**: target trash→purge carries no published-consumer veto (current state observed truthfully); media replacement under the same id and authorized removal keep selection identity with no availability promise (D-REF stays deferred).
- **cms-document/cms-authoring regressions**: required title/file enforcement, the three accepted V1 file-normalization limitations verified as specified, invalid types/select/dates refused, references payloads, direct Publish/Schedule of title-only content, unauthenticated 401/403 controls, stale-`_rev` 409 control — all unchanged and passing.

## 7. Cleanup and preservation evidence

- **Owned-fixture cleanup**: all 45 per-test `[cms-*] owned-fixture cleanup after test: complete` lines present (16/13/16); zero UNRESOLVED, zero residue.
- **Post-test native verification** (`t018/post-test-verification.json`, 47 checks, 0 problems): zero synthetic entries (`?q=songhealth-f002-synthetic&status=all`) and zero trash rows in all eight collections; media store empty (0 items); zero synthetic `topic` terms (terms listing HTTP 200, empty); orphan tables `[]`; deletion queue all four states HTTP 200 empty; **full active schema re-compared equal to the accepted seed**.
- **Pre-existing data/media**: none existed to lose (§3) — and post-test counts confirm zero content in all collections and media, i.e. tests left nothing behind.
- **Runtime preservation**: controller `status` after all work — same stable source `6ab72780…`, same app/postgres container IDs, both running; controller `verify` → `PASS: exact Dev identity, migration check, DB connection, SSR and Admin availability`. Credential file stat/mode/mtime unchanged. No `podman exec`, no restart, no source promotion; tests ran from the task checkout against the existing runtime, as authorized.

## 8. Standing, non-claims and residual risks

- **Observed PASS**: before-state equality with the accepted seed (incl. T013-final attachment preimage); deletion queue empty through the supported native API; the 32-write additive US2 delta applied exactly as accepted; after-state schema equality with the accepted seed; 45/45 tests passed with zero skips; owned fixtures fully cleaned; runtime identity and pre-existing data preserved.
- **UNKNOWN (retained, §4a tier 3)**: raw stored taxonomy preimages beyond the visible + T013-journaled state (a hypothetical never-visible attachment outside the eight existing collections) — no affirmative evidence any existed; every visible attachment retained.
- **PENDING / not claimed by T018**: T022 public-read safety is **not** claimed and cannot be inferred from selection validity; D-REF cross-record availability/removal enforcement remains deferred (no atomicity, byte-immutability or removal-veto guarantee); actual due-time scheduler execution (T019/T022); role matrix incl. Contributor/Author/Editor boundaries (T019); revision/lock depth (T020); Admin UI journey (T031); merge/integration/final acceptance. T013's historical F1/F2 UNKNOWNs remain unchanged history.
- **T018 checkbox**: flipped for T018 only (T013 precedent); every other task marker unchanged — T019/T020/T021/T022 remain pending and were not executed.
- Candidate delivery: committed on `t018-us2-reuse` with a PR targeting `002-cms-content-model`, unmerged. No canonical branch update.

## Artifact provenance (`specs/002-cms-content-model/evidence/t018/`)

| File | Provenance |
| --- | --- |
| `before-state.json` | Phase A inventory capture (read-only run, 2026-10-18T07:07Z), secret-free |
| `apply-journal.jsonl` | 99-record operation journal of the apply run (method/path/status/ms/request bodies; no credentials) |
| `after-state.json` | Phase D read-back immediately after the writes |
| `post-test-verification.json` | 47-check post-test preservation verification |
| `test-cms-reuse.log` / `test-cms-document.log` / `test-cms-authoring.log` | Full Playwright console output of the three serial runs — attached to the Multica implementation-result comment (the repository `.gitignore` excludes `*.log` globally; raw console logs are not repository artifacts, so they are delivered as reviewable issue attachments with identical content) |
| `t018-driver.mjs` / `t018-postcheck.mjs` | The exact scripts that produced the journal/snapshots (run with the pinned Node 24.21.0 toolchain; credential loaded in-memory from the mode-0600 dev-access file, never printed) |
