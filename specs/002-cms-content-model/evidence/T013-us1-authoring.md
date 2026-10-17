# T013 — US1 Runtime Schema & Authoring Verification Evidence

**Task**: `specs/002-cms-content-model/tasks.md` T013 [US1] — Inspect/apply US1 definitions and run T007 plus the affected shared Document checks; record native field/identity/classification/media/Document maintenance, required-title versus optional-value outcomes, and direct native publishing.
**Issue**: Multica `9GOTSTORY-239` (`01a148b1-6fc9-7b16-9749-bf8f7b128430`)
**Executor**: `claude-developer` (Developer). Lead review: `codex-lead-reviewer`, corrective rounds 0/3 used at handoff.
**Authorization**: consolidated Product Owner direction in issue comment `01a14902-c9e6-7e0a-9482-6018771e985d` (2026-10-17), delegated to the Developer by Lead comment `01a14905-8a9a-7cd6-b99c-08ea1703d81e`. That authorization supersedes the earlier A/A2/B1/B2/C0/G01 staged gates in the issue description. A prior Developer attempt ended in a provider-quota failure after the schema delta and first test run; this evidence describes the completed resumed execution (interim Lead note `01a14918-1528-7585-9ae6-1133a2c0bea5` arranged the resume; no additional authorization was introduced).

## 1. Exact identifiers and versions

| Item | Value | Source |
| --- | --- | --- |
| Baseline (canonical) | `d14cb3166ccade43053f590443fd4a624eaa7826` on `002-cms-content-model` | `git fetch origin 002-cms-content-model` + `git rev-parse` at checkout; matches the authorized base |
| Candidate branch | `task/9GOTSTORY-239-t013-us1-authoring` (branched from the exact baseline) | this PR |
| Runtime source (stable) | `6ab72780c1a531956acc3c06838c3028e10ad77d` | controller `status` before AND after all work (unchanged; no promotion) |
| Runtime containers | app `56a74583da82…`, postgres `d91afe9ed319…`, both running | controller `status` before AND after (same IDs — no restart/lifecycle action) |
| Origin | `http://127.0.0.1:4322` | single persistent development runtime |
| Node | v24.21.0 (pinned toolchain `/home/multica-agent/toolchain/node-v24.21.0-linux-x64`) | `node --version` |
| npm | 12.2.0 | `npm --version` (pinned toolchain) |
| Playwright / @playwright/test | 1.63.0 | lockfile-exact `npm ci`; `npx playwright --version` |
| Astro | 7.3.5 | `node_modules/astro/package.json` (lockfile-exact) |
| EmDash | 1.1.0 | `node_modules/emdash/package.json` (lockfile-exact) |
| PostgreSQL | 18.6 (`docker.io/library/postgres:18.6@sha256:fc973eb9…`) | runtime `compose.yaml` image pin |
| App tooling image | `localhost/songhealth-dev-tooling:node24.21.0-npm12.2.0-r1` | runtime `compose.yaml` |

Dependencies were installed with `npm ci` (lockfile-exact; `esbuild` postinstall blocked by the repository's allowScripts policy, which does not affect these suites — no browser binary is launched by these API-level checks). No dependency was added, upgraded or substituted; no second server/stack was started.

## 2. Credential and identity evidence (no secrets)

- Existing development credential consumed at `/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json`, bounded to this task.
- File security revalidated immediately before use and unchanged after: regular file, mode `0600`, owner UID/GID `1001:1001`, single link, immediate parent mode `0700`, no symlink anywhere in the ancestry (`/home/multica-agent` → file). File mtime/stat unchanged post-run (no rewrite, no permission change).
- The JSON (`token`, `source` only) was loaded into process memory only. No plaintext PAT copy was made, no token hash or secret value appears in this evidence, in run logs, or in the journal; every tool used prints secret-scrubbed output only. The dev-bypass bootstrap (`POST /_emdash/api/setup/dev-bypass`) was **never** called — the existing credential was not rotated or replaced.
- Native identity established through `GET /_emdash/api/auth/me`: account id `01M52A3PGD2PS0WM525YD7A8KX`, email `dev@emdash.local` (the intended development fixture), name "Dev Admin", role **50** (Administrator). All subsequent actors (the schema driver and both suites' test actor) are bound to this same credential/account; both suites additionally pin `expected.role = 50` and assert `admin.email === "dev@emdash.local"` at bootstrap.
- **Scope metadata reported truthfully**: the PAT's scope list is not exposed by any supported native response in pinned EmDash 1.1.0 and was not assumed from the role. Effective permissions were established empirically through native operations only: `schema:read`/`schema:manage` (collection/relation/field/orphan reads and the 46 successful writes below), `taxonomies:read`/`taxonomies:manage` (listing, attachment updates, term create/delete in-suite), `content:read`/`content:write` (draft create/update/read), `content:publish_any` (direct Publish/Schedule/Unschedule 200s), `media:read`/`media:upload`/`media:delete` (owned fixture uploads and cleanup). No native permission failure occurred at any point.

## 3. Actual before-state (native inventory, 2026-10-17)

All reads through supported native interfaces (`GET /_emdash/api/schema/collections`, `…/schema/collections/{slug}?includeFields=true`, `GET /_emdash/api/relations`, `GET /_emdash/api/taxonomies`, `GET /_emdash/api/schema/orphans`). No internal-table SQL, no direct container access.

- **Collections**: `documents` only. Its full definition (8 fields — title string S, summary text O, file file S, document_at datetime O, fiscal_year integer O, owner_source text O, domain_status select O with current/superseded/expired, successor reference O bound `document_successor`/parent — plus Thai labels, order 0–7, `titleField: title`, `dateField: document_at`, supports drafts/revisions/preview/scheduling, source seed) matched the accepted T005 definition exactly. The five US1 kinds `pages`, `news`, `activities`, `announcements`, `health_content` were **absent** (404 on collection reads).
- **Relations**: `document_successor` only (documents→documents, maxChildrenPerParent 1, maxParentsPerChild null, bound field documents.successor parent side, 0 links). `page_documents`/`announcement_documents` absent.
- **Taxonomies**: platform built-ins `category`/`tag` (unattached; untouched); `topic` (label หัวข้อ, flat) displayed attachments `[documents]`; `audience` `[ ]`; `area` (hierarchical) `[ ]`; `document_type` `[documents]`; `news_category`/`announcement_type` absent.
- **Orphans / pending deletions**: `GET /_emdash/api/schema/orphans` → `items: []` (none). Because native taxonomy reads filter attachments to missing collections, the attachment lists above were re-read **after** collection creation (phase 6) before any attachment write, so each stored before-image was fully visible: `topic` stored `[documents]`, `audience` stored `[]`, `area` stored `[]` — i.e. the runtime's stored state was the T005-era seed state, not a filtered view of the US1 intent.

## 4. Applied native delta (46 writes, journal `apply-journal.jsonl`)

Driven programmatically from the baseline `seed/seed.json` (single source of truth), with a pre-write comparison and stop-on-mismatch guard per object. Shared `documents`/`document_successor` were verified unchanged first (phase 0) and no write touched them. Order per the Lead directive:

1. **Collections (5 × POST 201)**: `pages`, `news`, `activities`, `announcements`, `health_content` — label/labelSingular/supports (drafts/revisions/preview/scheduling) from the accepted definitions. No pending deletion existed to resume; no recovery/retry/delete behavior was invoked.
2. **Ordinary fields (28 × POST 201)**: per collection in seed order with explicit `sortOrder` (title first with `required: true`; every other field optional). Includes the `activities.gallery` repeater with subFields image (S, ภาพ) + caption (string, คำบรรยายภาพ).
3. **Named relations (2 × POST 201)**: `page_documents` (pages→documents) and `announcement_documents` (announcements→documents), all four Thai labels, unlimited both sides (`null`/`null`) — exact accepted definitions. **No** reference field was created with a bare `targetCollection` (which would have auto-generated a relation).
4. **Explicitly bound reference fields (2 × POST 201)**: `pages.documents` and `announcements.documents`, `validation: { relation, relationSide: "parent" }` only. After-state shows each relation with exactly one bound field per side — no duplicate edges.
5. **Title/date metadata (5 × PUT 200)**: `titleField: title` for all five; `dateField: activity_at` (activities) and `announcement_at` (announcements); dateField cleared to null for pages/news/health_content per the accepted definitions (no date field).
6. **Taxonomy attachments (after re-read)**: `topic` `[documents]` → `[documents, news, activities, announcements, health_content]`; `audience` `[]` → `[news, announcements, health_content]`; `area` `[]` → `[news, activities]` (3 × PUT 200, known-delta writes against fully-visible stored state — every stored attachment was explained by the accepted model before any write); `document_type` verified exact, **no write**; `news_category` → `[news]` and `announcement_type` → `[announcements]` created (2 × POST 201, label/labelSingular/hierarchical from the accepted definitions).

Provenance note: the five applied collections carry native `source: "manual"` (applied by supported native API operations at T013) versus `documents`' `source: "seed"` (bootstrap-applied). This is descriptive platform metadata only; definitions, labels and behavior are identical to the accepted seed intent, and a future seed apply uses `onConflict: "skip"` either way.

## 5. Verified after-state (native read-back)

- **Collections** (6): all five new kinds read back with the exact accepted fields — slug/Thai label/type/requiredness/order all matching `seed/seed.json` (documents unchanged). `titleField`/`dateField`/supports as accepted (see §3/§4).
- **Relations** (3): `announcement_documents(1 bound)`, `document_successor(1 bound)`, `page_documents(1 bound)`; linkCount 0; endpoints/labels/limits exact.
- **Taxonomies** (8 definitions incl. untouched built-ins `category`/`tag`): attachments exactly as listed in §4; all locales `en`; `area` hierarchical.
- Full machine-readable before/after snapshots and the 51-entry operation journal are preserved in the Lead's recovery packet and the task workspace (not committed — they contain no secrets but are runtime observations, not repository artifacts).

## 6. Test-authentication adaptation (committed change, for Lead review)

Per the Lead directive the suites no longer run the dev-bypass bootstrap (whose native endpoint replaces same-named existing tokens and applies seed intent). Bounded changes on three files, all in `tests/browser/`:

- `tests/browser/cms.helpers.ts`: (a) new narrowly scoped shared loader `loadDevAccessToken(path?)` + `DEV_ACCESS_CREDENTIAL_ENV` ("SONGHEALTH_DEV_ACCESS") — fail-closed (explicit path or env var; regular non-symlink file via `lstat`; mode 0600; JSON parsed in memory; non-empty string `token` required; no logging/rewriting), consumed by both suites so the security checks live in one place; (b) `uploadSyntheticMedia` now sends an explicit `deduplicate=false` multipart field — runtime observation: pinned EmDash 1.1.0's `mediaUploadDeduplicateForm` defaults `deduplicate` to `"true"`, so an omitted flag returned the pre-existing asset (`200 { item, deduplicated: true }`, observed live) and no ownable media id; the explicit opt-out is the documented supported control and keeps every upload a fresh owned fixture (a deduplicated id still is never registered, per the accepted ownership-safety contract); (c) corresponding comment corrections.
- `tests/browser/cms-authoring.spec.ts` and `tests/browser/cms-document.spec.ts`: `createDevBypassActor` → `createPatActor` (existing helper) with `loadDevAccessToken()`, `expected.role = NATIVE_ROLES.administrator`, and an email assertion binding the actor to `dev@emdash.local`; actor-description comments updated truthfully (scope metadata not assumed from role). One further runtime-forced expectation correction in `cms-authoring.spec.ts`: supplied explicit-offset datetimes are stored by pinned 1.1.0 `normalizeDatetime` as their UTC ISO instant (observed `2026-10-15T10:00:00+07:00` → read back `2026-10-15T03:00:00.000Z`), so the valid-control read-back now compares the **instant** for datetime fields — the same discipline the accepted schedule read-back already used; all other assertions unchanged.
- Untouched per directive: schema assertions/validation expectations, native `_rev` handling, failure-safe owned-fixture teardown, and every other suite/helper behavior. No dev-bypass fallback exists.

## 7. Test execution (exact commands and results)

Environment: `PATH=/home/multica-agent/toolchain/node-v24.21.0-linux-x64/bin:$PATH`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, `SONGHEALTH_DEV_ACCESS=/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json`, run from the task checkout after lockfile-exact `npm ci`.

- **Discovery**: `npx playwright test tests/browser/cms-authoring.spec.ts tests/browser/cms-document.spec.ts --list` → **29 tests in 2 files** (cms-authoring 16: five per-kind schema preconditions + eleven authoring checks; cms-document 13).
- **Run command** (final): `npx playwright test tests/browser/cms-authoring.spec.ts tests/browser/cms-document.spec.ts --workers=1 --retries=0`
- **Final result**: **29 passed, 0 failed, 0 skipped, 0 flaky, 0 did-not-run** (10.3s). Every `[cms-*] owned-fixture cleanup after test: complete` line present (29/29); zero UNRESOLVED.
- Honest execution history (same command each time): run 1 — 27/29 (both failures: second-and-later deterministic-PNG uploads deduplicated onto the first asset, exposing the pinned default described in §6); run 2 — 28/29 (remaining failure: the datetime read-back string-equality expectation corrected per §6); run 3 — 29/29 as above. Both corrections are committed with this evidence for Lead review; no assertion was weakened — the failing expectations were replaced by equivalent instant-identity/ownership-preserving ones.
- Coverage exercised live, all five kinds incl. Documents: native Save/Reopen by returned id; missing/null/empty required title refused (400 VALIDATION_ERROR) and invalid clears refused with title intact on re-read; representative invalid supplied values (non-datetime/offset-less dates, wrong types, image-without-id, string repeater, references keyed by non-reference field) refused as validation (distinguishable from 401/403/409); optional omissions permitted (title-only drafts) and representative optional supplied values read back (text/string/portableText/image selection by media id/gallery rows/datetime by instant/integer/select); `topic` classification term assignment and read-back by returned slug; separate `references` payload Page/Announcement Document selections (children listing identity, unknown-target 404 NOT_FOUND family); direct permitted Publish of valid incomplete title-only content (published + publishedAt read-back); future-offset (+07:00) Schedule acceptance, read-back by instant, and Unschedule; unauthenticated-save 401/403 control and stale-`_rev` 409 CONFLICT control; the three accepted Document file-normalization limitations verified as specified (empty-string → empty external reference; non-URL string → external src with empty id; non-string id → empty local-provider id).

## 8. Fixture cleanup and preservation

- **Cleanup (native operations only)**: all synthetic fixtures were created by, and cleaned through, the T002 registry with trash-aware reconciliation. Post-run native verification: `GET /_emdash/api/content/{c}/trash` → 0 items for all six collections; `GET /_emdash/api/content/{c}?q=songhealth-f002-synthetic&status=all` → 0; `GET /_emdash/api/media?q=…` → 0 (media store empty); synthetic `topic` term → `terms: []`. No unresolved cleanup; nothing uncertain to report. Failure paths were exercised too (refused creates leave no residue by construction; the suites' retain-until-proven term/entry/media protocol reconciled everything).
- **Never touched**: real/pre-existing records (none existed — all six collections held 0 entries before fixtures and 0 after), deduplicated assets (never registered; the probe pair used to diagnose §6 was deleted by its own id through the native DELETE), named volumes, broad/prefix-selected data, controller approval/state records, Production, T014+ scope, Feature 001 artifacts.
- **Preservation/health**: controller `status` after all work — same stable source `6ab72780…`, same two container IDs, both running; controller `verify` → `PASS: exact Dev identity, migration check, DB connection, SSR and Admin availability`. Credential file stat/mode/mtime unchanged. No `podman exec`, no restart, no source promotion (tests ran from the task checkout against the existing runtime, as authorized).

## 9. Standing and non-claims

- **T013 runtime criteria** (authorization's Definition of Done): active native schema equals the accepted US1 definitions ✔ (§5); T007 + shared Document checks pass for real with no requirement-blocking skips ✔ (§7 — 29/29, 0 skips); native Save and direct permitted publishing behave as specified ✔; synthetic fixtures fully cleaned ✔; development runtime and pre-existing data safe ✔; this evidence report complete and inspectable ✔. The T013 checkbox in `tasks.md` is therefore checked by this change; **every other task marker is unchanged** (T008–T012 remain unchecked by design — their definitions are accepted source inputs applied here; per the Lead handoff their markers are not T013's to flip).
- Not claimed by T013 (later owners): actual due-time scheduler execution (T019/T022), full RBAC matrix incl. Contributor/Author/Editor boundaries (T019), public-read acceptance (T021/T022), staff UAT (T032), and any merge/integration/final acceptance. A checked marker records task completion only — Lead review, ChatGPT Independent Review and Product Owner acceptance remain separate pending states.
- Candidate delivery: committed on `task/9GOTSTORY-239-t013-us1-authoring` with a PR targeting `002-cms-content-model`, unmerged. No canonical branch update.
