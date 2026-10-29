# T033 — Delivered model review and integrated verification

**Status: EXECUTED — all checks passed; awaiting Product Owner acceptance.**
- The delivered native model matches `data-model.md`.
- The production build, the node foundation tests and every Feature 002 browser suite pass
  on the single development runtime.
- Open items, which this record does not close:
  - SC-007, which needs the staff session;
  - the official inventory population;
  - the deferred D-ITA/D-REF scope;
  - the Feature 001 production-host gates T022 and T028.

This is a Claude Code self-review only (Constitution 5.0.0). The Spec Kit Analyze command
was not run, and no production gate was repeated (`tasks.md` T033).

## Identities

| Item | Value |
| --- | --- |
| Commit under test | `7567a293718369ee35d82b09d52428f5f32f8232`. The runtime was promoted to this commit (backup `~/.local/state/songhealth-qdev/backups/20261029T024810Z`); verify passed before and after. |
| Runtime | `http://127.0.0.1:4324`, the UID-1000 Quadlet development runtime |
| Toolchain | Node 24.21.0, npm 12.2.0, Astro 7.3.5, EmDash 1.1.0, `@emdash-cms/admin` 1.1.0, Playwright 1.63.0 (chromium), PostgreSQL 18.6 |
| Live schema | 10 collections, 80 fields, 9 Songhealth taxonomies (plus the unattached EmDash built-ins `category` and `tag`), 6 relations |

## Model review

- **The live schema matches `data-model.md`** (`t033/model-check.py`, output
  `t033/model-check-output.txt`: MODEL-CHECK PASS). The script compares every field and
  relation with the model's tables:
  - each field's native type and save-time requiredness: only `title`, `documents.file` and
    `health_reports.report_document` are required;
  - select options, coordinate ranges and repeater subfields;
  - native supports (`drafts`, `revisions`, `preview`, `scheduling`; SEO nowhere);
  - the taxonomy attachments and the Area hierarchy;
  - the six relation edge sets with their maxima and field bindings.
- **The seed matches the live schema** (`t033/seed-schema-check-output.txt`: SEED-SCHEMA
  PASS).
- **Canonical configuration and source are unchanged.** `astro.config.mjs` and `src/` (which
  contains `src/live.config.ts`) were last changed on 2026-10-08 by Feature 001 (`6202600`,
  T015). Feature 002 changed neither.
- **The test fixture is excluded from production.** The T021 fixture lives only in the
  development configuration `deploy/dev-quadlet/astro.dev.config.mjs`. The production build
  contains no file referring to the fixture route or integration
  (`__feature002|cms-public-reads|songhealth:t021`: 0 files under `dist/`).
- **Conditional Organization is N/A.** No genuine shared-organization case is recorded
  (T025, `T026-us3-directory.md`). `organizations` and its three conditional relations are
  absent, and owner text fields carry ownership.

### The four §23 mapping questions (FR-031, SC-008)

The four questions are:
1. Is it a real Product identity?
2. Is the native capability sufficient?
3. Is there demonstrated reuse or a demonstrated relationship?
4. Does it avoid duplication, and can staff maintain it?

| Delivered group | 1. Real identity | 2. Native sufficiency | 3. Reuse / relationship | 4. Duplication and maintenance (result) |
| --- | --- | --- | --- | --- |
| `pages`, `news`, `activities`, `announcements`, `health_content` | Five distinct prose, time and guidance meanings | Native fields, media, taxonomies, revisions, preview, scheduling (`cms-authoring` 16 passed) | US1; Pages and Announcements reuse Documents | Five kinds, no generic-page substitute; the editor journeys run in Thai (`cms-editor` 5 passed) |
| `personnel` | A current public person, separate from login accounts | Native fields, image, visibility (`cms-personnel` 11 passed) | US3 keeps the same identity when the assignment changes | One person, with no history or account entity |
| `health_services` and `services` | A real facility versus citizen guidance | Native fields, selects, number ranges, repeaters (`cms-facilities` 20 passed) | One `facility_services` edge set, readable from both sides | Two meanings and one relation; no case engine |
| `documents` and `health_reports` | A file-backed source versus report metadata | Native required file and required single reference (`cms-document` 13, `cms-reuse` 16 passed) | One Document reused by Announcement, Service, Page and Report | One file source; no File/Media duplicate |
| Taxonomies (`topic`, `audience`, `area`, six type/category taxonomies) | Classifications, with no lifecycle of their own | Native taxonomies; `area` is hierarchical | Shared across their attached kinds | No classification or Area collections |
| Six relation edge sets | Real support, report, successor and reciprocal-offering needs | Native maxima and bindings (model check) | US2/US4 | One edge set per need; no custom selection or lock subsystem |
| Media, contacts, system metadata | Platform assets and owner values | Native media, settings and system fields | Owner reuse | No duplicate Media, Contact, author or status entities |
| Organization (conditional) | Not demonstrated | Not needed: owner text suffices | None recorded | N/A, not created |
| D-ITA / D-REF | Deferred scope | Not represented | Excluded from V1 acceptance | No ITA, snapshot or locking entities |

## Verification

All runs used the commit under test.

| Check | Output | Result |
| --- | --- | --- |
| `npm run build` (clean checkout, `npm ci`, the Containerfile's placeholder inputs) | `t033/build-output.txt` | exit 0; `dist/server/entry.mjs` present; `.emdash/migrations.json` present with no URL |
| Node foundation tests (`node --test tests/node/config.test.ts tests/node/foundation.test.ts`) | `t033/node-tests-output.txt` | 48 passed, 0 failed |
| `foundation.spec.ts` (Feature 001 browser regression) | `t033/integrated-run-output.txt` | 2 passed |
| `cms-document.spec.ts` (T003) | same | 13 passed |
| `cms-authoring.spec.ts` (T007) | same | 16 passed |
| `cms-reuse.spec.ts` (T014) | same | 16 passed |
| `cms-personnel.spec.ts` (T023) | same | 11 passed |
| `cms-facilities.spec.ts` (T027) | same | 20 passed |
| `cms-lifecycle.spec.ts` (T019, role fixture) | same | 13 passed |
| `cms-revisions.spec.ts` (T020, role fixture) | same | 12 passed |
| `cms-lifecycle-ui.spec.ts` (T022 UI, dev Admin session) | same | 3 passed |
| `cms-editor.spec.ts` (T031/T032, dev Admin session) | same | 5 passed |
| T021 coordinator (`cms-public-reads.spec.ts`) | same | 14 passed, no owned-fixture residue |
| Runtime verify, before and after | same | VERIFY: PASS (15 checks) |

- **Browser totals:** 125 passed, 0 failed, 0 skipped.
- **Typecheck:** `tsc --noEmit` shows only the same two errors that existed before
  (`tests/node/config.test.ts:173`, `tests/node/foundation.test.ts:304`).

## Active FR/SC coverage

| Item | Evidence | Standing |
| --- | --- | --- |
| FR-001, FR-003 | `cms-authoring`, model check | verified |
| FR-002, FR-026 (native requiredness and validation) | `cms-document`, `cms-authoring`, `cms-reuse`, UI required-Document check, model check | verified |
| FR-004–FR-007 (Document, media, reuse, Health Report) | `cms-document`, `cms-reuse`, T021 missing-file read | verified |
| FR-008–FR-009 (Personnel) | `cms-personnel` | verified |
| FR-010 (Organization) | conditional N/A (T025) | N/A, no recorded reuse case |
| FR-011–FR-013 (Service, Health Service, Area) | `cms-facilities`, model check | verified for structure and synthetic fixtures. Real official Area codes and facility inventory are a later population input (official inventory discovery is paused). |
| FR-018, FR-019 (classifications, contacts) | model check, `cms-authoring` | verified |
| FR-020 (public reads, preview) | T021 coordinator | verified |
| FR-021, FR-025, FR-027 (roles, trash, administration) | `cms-lifecycle` with the role fixture | verified |
| FR-022–FR-024 (editorial state, scheduling, revisions, locks) | `cms-lifecycle`, `cms-revisions`, UI lock and publish checks | verified |
| FR-028 (public data only) | model review: no sensitive fields | verified by review |
| FR-029 (Thai staff maintenance) | `cms-editor` journeys | automated part verified; staff comprehension is pending (SC-007) |
| FR-030–FR-032 (native identity reuse, mapping, scope) | model check, §23 table, unchanged canonical configuration | verified |
| FR-014–FR-017, SC-004 (ITA) | — | DEFERRED (D-ITA), not V1 acceptance |
| SC-001 | `cms-authoring`, `cms-personnel`, `cms-facilities`, `cms-editor` | create, save and reopen verified by automation; staff identification shares SC-007's pending staff session |
| SC-002, SC-003, SC-005, SC-006, SC-008 | the suites above and this review | verified with synthetic fixtures |
| SC-007 | T032 | DEFERRED — NOT VERIFIED / NOT PASSED: the staff session is pending |

## Pending, not passed

- **SC-007 staff session:** T032 stays open.
- **Official inventory population:** real Area codes, facilities and services. This is a
  data input, not a schema change.
- **Deferred guarantees:** D-ITA and D-REF.
- **Feature 001 production-host gates:** T022 (execute T016 on a production-capable host)
  and T028 (recovery drill) remain open in `specs/001-platform-foundation/tasks.md`. The
  UID-1001 production-foundation stack that served earlier attempts was deleted in T037; any
  future run needs a production-capable host.

## Cleanup

Checked after the integrated run.
- **Fixtures:** every suite's owned-fixture cleanup reported complete. Synthetic entries
  across all ten collections, live and in trash: 0. Media: 0. Synthetic terms and bylines:
  0. Entry locks: 0.
- **Users:** the dev admin and the role fixture (back to Author, enabled).
- **Secrets:** 0 occurrences of the runtime credentials or `ec_pat_` in `t033/`.
- **Temporary checkout:** the clean build checkout lived in the session scratchpad and was
  removed after the build.
