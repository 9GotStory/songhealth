# T035 — Feature 002 implementation handoff

**Status: implementation complete except the T032 staff session.**
- Every task is checked except T032. It stays open because SC-007 needs a bounded staff
  session.
- This handoff makes no Feature 002 acceptance, Feature 001 acceptance, merge or deployment
  claim. The Product Owner decides acceptance and merges.

The work was checked by Claude Code self-review and automated tests only
(Constitution 5.0.0). No independent third-party review exists. Under the 5.0.0 workflow,
the evidence-based completion recorded here satisfies the Independent Review steps that
earlier artifacts named for still-open work.

## Exact identities

| Item | Value |
| --- | --- |
| Canonical `002-cms-content-model` | `7530366` (PRs #40–#42 merged 2026-10-29) |
| PR #43, T022 + T032 automated | head `7567a29`, open: the merge needs the Product Owner |
| Closeout PR, T033–T035 | stacked on PR #43, open: the merge needs the Product Owner |
| Runtime under test | `http://127.0.0.1:4324` serving `7567a29`; VERIFY PASS (15 checks) |
| Pins (unchanged) | Node 24.21.0, npm 12.2.0, Astro 7.3.5, EmDash 1.1.0, `@emdash-cms/admin` 1.1.0, Playwright 1.63.0, PostgreSQL 18.6 |

**What Feature 002 delivered, by area.** No dependency, production route or canonical
configuration was added. `astro.config.mjs` and `src/` are unchanged since Feature 001.
- **Native model:** `seed/seed.json`, with 10 collections, 80 fields, 9 taxonomies and 6
  relations.
- **Tests:** `tests/browser/cms.helpers.ts` and the suites `cms-document`, `cms-authoring`,
  `cms-reuse`, `cms-personnel`, `cms-facilities`, `cms-lifecycle`, `cms-revisions`,
  `cms-lifecycle-ui`, `cms-editor` and `cms-public-reads`.
- **T021 fixture:** the dev-only route and integration (`tests/browser/fixtures/`) and the
  coordinator (`run-cms-public-reads.mjs`).
- **Development runtime:** `deploy/dev-quadlet/`, `scripts/dev-runtime-*.sh` and
  `docs/operations/development-quadlet.md`. These cover the role fixture, the route token
  and the 15-check verify.
- **Specs and evidence:** `specs/002-cms-content-model/` (spec, plan, tasks, quickstart,
  data model, contracts) and its `evidence/`.
- **Governance:** Constitution 5.0.0 (`.specify/memory/constitution.md`), `AGENTS.md`,
  `CLAUDE.md` and `README.md`.

## Task coverage

| Tasks | Standing | Evidence |
| --- | --- | --- |
| T001–T007 (setup, shared model, US1 tests) | checked | `T001`, `T004`, `T005`, `T006`, `T013` evidence |
| T008–T013 (US1 kinds) | checked | `T013-us1-authoring.md`; T033 model check |
| T014–T018 (US2 reuse) | checked | `T018-us2-reuse.md` |
| T019–T022 (US6 safety) | checked | `T022-us6-native-safety.md`: 13 + 12 + 14 + 3 passed on the single runtime |
| T023–T026 (US3 Personnel; T025 Organization N/A) | checked | `T026-us3-directory.md`; `cms-personnel` 11 passed (T033) |
| T027–T030 (US4 facilities) | checked | `T030-us4-facilities.md`; `cms-facilities` 20 passed (T033) |
| T031 (US7 editor smoke) | checked | `cms-editor.spec.ts`, 5 passed |
| T032 (US7 runtime + staff session) | **open** | `T032-us7-maintenance.md`: the automated part passed 5 of 5; the staff session is pending |
| T033 (model review + integrated run) | checked | `T033-model-verification.md`: model check PASS, build PASS, node 48 passed, browser 125 passed |
| T034 (README + quickstart) | checked | `README.md`, `quickstart.md` |
| T035 (this handoff) | checked | this file |
| T036–T037 (single development runtime) | checked | `T036-dev-runtime.md`, `T037-single-runtime-completion.md` |

## Story and success-criterion coverage

User stories:
- **US1, US2, US3, US4, US6:** delivered and verified on the single runtime with synthetic
  fixtures.
- **US7:** the automated Admin journeys are verified; staff comprehension is pending.
- **US5 (ITA):** DEFERRED (D-ITA). It is excluded from the V1 denominators, together with
  FR-014–FR-017 and SC-004.

Success criteria:
- **Verified:** SC-002, SC-003, SC-005, SC-006 and SC-008.
- **SC-001:** create, save and reopen are verified by automation; staff identification
  shares the pending staff session.
- **SC-007:** DEFERRED — NOT VERIFIED / NOT PASSED.
- The per-FR table is in `T033-model-verification.md`.

## Conditional N/A

- **Organization (FR-010, T025).** No genuine shared-organization reuse case is recorded,
  so owner text fields carry ownership. The `organizations` collection and its three
  conditional relations were not created.

## Pending dependencies (not passed)

1. **The SC-007 staff session (T032).** Real staff author, select, reuse, find and correct
   representative records in the native Admin, and the outcomes are recorded in the T032
   evidence. The login route and the procedure are in that file.
2. **Official inventory population.** Real Area codes, facilities and services. Official
   source discovery is paused. This is data entry into the delivered model, not a schema
   change.
3. **Feature 001 production-host gates.** T022 (execute T016 on a production-capable host)
   and T028 (recovery drill) remain open. The earlier production-foundation stack on UID 1001
   was deleted (T037), and the accepted production image is preserved on UID 1000.
4. **Merges.** PR #43, then the closeout PR, into `002-cms-content-model`. Later the
   feature branch goes into `main`, when the Product Owner accepts Feature 002.
5. **Upstream observations for the Product Owner's information.** These are not Songhealth
   defects:
   - EmDash's reference-picker checkboxes are named after the field, not the item
     (`aria-labelledby`);
   - datetimes are stored as UTC;
   - on the IP origin, passkeys and native invites are unavailable.

## Superseded open PRs

These open PRs are superseded. Closing them is a separate Product Owner action:
- **#15 and #16:** their heads are already in canonical.
- **#28:** the disposable-runtime T022 run. Its test fixes are ported in PR #43.
- **#37:** the T032 evidence from the deleted 4322 runtime. Its boot-loader fix is ported in
  PR #43.
