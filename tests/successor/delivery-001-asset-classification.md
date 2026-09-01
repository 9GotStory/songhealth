# Delivery 001 Successor Asset Classification — Delivery 002 (T051 register / T055 classification evidence)

Quickstart §10 record: a non-destructive register of the Delivery 001 runtime
assets considered by this Delivery, each classified KEEP / REUSE / SUPERSEDED
/ REMOVE-LATER with its replacement boundary and replacement evidence
(spec.md FR-026, FR-027; data-model.md §Successor Asset Classification;
research.md §11). Recorded by the DEV Executor; independent review is
Codex/Human owned.

## Binding rules

- **Nothing is deleted, disabled, or modified by this record.** Every asset
  below remains byte-present in this commit (verified in §4).
- `REMOVE-LATER` or `SUPERSEDED` classification alone authorizes nothing.
  Removal requires an implemented AND independently verified replacement plus
  a separate explicit removal authorization (FR-026).
- Every entry carries `removal_authorized=false` for Delivery 002 (data-model
  §Successor Asset Classification).
- Apparent disuse is never sufficient (research.md §11).
- The legacy Songhealth WordPress **Production system** is not a repository
  asset and is outside this register's reach; its retirement/migration scope
  is prohibited this Delivery (FR-027) and remains separately gated.

## T051 — the register

| # | Asset / group | Classification | Replacement boundary (what the successor must cover first) | Replacement evidence today | `removal_authorized` | Reviewer fields |
| - | ------------- | -------------- | ---------------------------------------------------------- | -------------------------- | -------------------- | --------------- |
| 1 | `apps/server/` — Delivery 001 Fastify/Kysely authoritative backend (bootstrap, http, migrations, config) | SUPERSEDED | Songhealth-owned semantics + data persistence + public API + Preview/binary policy on the WordPress baseline | Implemented in `songhealth-core` (identity T010–T012, eligibility/projection/listing T013–T018/T025, Preview T034–T035, protected binary T042–T044), independently reviewed Gates 02–05 (PASS); Product workflows beyond the foundation are NOT yet replaced (finished domain modules remain future Delivery scope) | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex; removal decision: Human |
| 2 | `apps/admin/` — Delivery 001 React/Vite CSR admin shell | SUPERSEDED | Authenticated staff administration of the two foundation resource types within WordPress wp-admin under Frozen roles | Implemented as the bounded `AdminExperience` (T033) with the Frozen role/capability model (T008/T009), independently reviewed Gate 04 (PASS). Finished Product admin workflows are deliberately NOT replaced (no custom Admin SPA is in scope — FR-015) | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex; removal decision: Human |
| 3 | `apps/web/` — React public application workspace | REUSE | n/a (actively reused) | Selectively rebound in Delivery 002 to the Songhealth public contract (T023/T024 detail/listing routes, T045/T046 documents) — not a removal candidate | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 4 | `infra/compose.development.yaml`, `infra/compose.verification.yaml` — Delivery 001 Node runtime profiles | SUPERSEDED | A clean local verification runtime for the successor stack | Implemented as `infra/compose.wordpress-verification.yaml` + `scripts/wordpress-verification.sh` (Gate 01.5, independently verified real-engine PASS, Human accepted 2026-08-29) | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex; removal decision: Human |
| 5 | `infra/Containerfile`, `infra/nginx/nginx.conf` — Delivery 001 image/reverse-proxy baseline | SUPERSEDED (local verification only; never a Production baseline) | Nothing in Delivery 002 requires a successor container/proxy baseline; the Frozen baseline is shared hosting + WordPress + the React app (FR-028 forbids a Production Docker/VPS baseline without evidence) | No successor replacement is proposed or needed — replacement is "none required"; any future need must first show the simpler Frozen baseline cannot satisfy a current requirement | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 6 | `scripts/foundation-operations.mjs` (+ `.d.mts`, `foundation-operations.test.ts`) — Delivery 001 operations/DB/lifecycle tooling | SUPERSEDED | Bounded disposable-runtime operations for the successor stack | Implemented as `scripts/wordpress-verification.sh` (start/stop/reset/ready workflows, Gate 01.5 accepted). The Delivery 001 T050/T051+ operations stages were never completed (T051+ retired), so no later-stage behavior is lost | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 7 | `tests/verification/*.ts` — Delivery 001 Node verification suites | SUPERSEDED | Verification evidence suites for the successor stack | Implemented as the plugin unit/integration/containment PHPUnit suites and the `apps/web` unit/contract/e2e suites (T002, T020–T022, T039–T041, T048), independently reviewed per gate | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 8 | Root `package.json` Delivery 001 script entries (`dev:*`, `db:*`, `verify:production-like`, `foundation:*` targets into `foundation-operations.mjs`; the intentional `exit 1` placeholders for retired security scripts) | SUPERSEDED | Named successor workflows for the successor stack | Successor operations entry points live in the WordPress verification script and the workspace scripts actually used by the successor (`build:web`, test projects). The retained entries are inert for the successor and remain runnable only against the preserved Delivery 001 assets | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 9 | `bootstrap/constitution.proposed.md` — bootstrap constitution input | KEEP | n/a (historical governance record) | Referenced by `PRE-IMPLEMENTATION-GATE.md` §C as the ratified constitution's input; retained for auditability | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 10 | `specs/001-application-foundation/` + Delivery 001 records in `docs/` | KEEP | n/a (historical Source-of-Truth and reconciliation records) | Delivery 001 is HISTORICAL / T050 ACCEPTED / T051+ RETIRED per PROJECT-STATUS; history is the reason to retain | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 11 | `.env.development.example`, `.env.verification.example`, `.env.real-engine.example` — Delivery 001 environment examples | KEEP | n/a (committed safe examples; no real credential) | Still referenced by Delivery 001 docs/tests; harmless committed examples (FR-021 pattern) | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |
| 12 | `tests/` root-level `successor/` tree predecessor content (US1–US3 evidence records) | REUSE | n/a | These are the Delivery 002 evidence records themselves; this batch appends US4 records alongside them | **false** | Classified by claude-developer 2026-09-01; independent review: pending Codex |

## T055 — classification evidence (non-destructive review)

- Review performed against the implemented replacement proof in the candidate
  commit; replacement evidence is claimed ONLY where an implemented successor
  behavior exists AND has already passed independent gate review (rows 1, 2,
  4, 6, 7). Rows 3, 9–12 are KEEP/REUSE and need no replacement. Row 5 has no
  successor and none is proposed (FR-028).
- Rows 1 and 2 are `SUPERSEDED` at the FOUNDATION boundary only: the finished
  Product workflows those Delivery 001 apps were planned to grow (rich admin
  UX, server-side domain modules) are intentionally NOT implemented in
  Delivery 002, and FR-015/Frozen semantics forbid a custom Admin SPA and a
  second user store as successors. Any removal decision must therefore be
  taken against the then-current Delivery scope, not this register alone.
- No file, directory, script entry, or lockfile pin belonging to any row was
  deleted, emptied, or renamed in this batch.

## §4 Preservation proof (recorded in `tests/successor/evidence/us4-sustainable-foundation.md` §5)

- `git status` of the candidate shows no deletion under any registered asset
  path; the batch diff's changed-file list contains no Delivery 001 asset
  path.
- Byte-presence check (`git diff --name-status base..candidate` filtered to
  the asset paths; content comparison) is recorded in the US4 evidence record
  with the exact command and empty deletion output.

## Consistency

- Schema per data-model.md §Successor Asset Classification: explicit
  asset/group ✓, classification ✓, replacement boundary ✓, replacement
  evidence ✓, reviewer ✓, `removal_authorized=false` ✓ (12/12 rows).
