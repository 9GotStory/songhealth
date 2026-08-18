---

description: "Dependency-ordered implementation tasks for the Application Foundation & Development Runtime"
---

# Tasks: Application Foundation & Development Runtime

**Input**: Design documents from `specs/001-application-foundation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by FR-013 and SC-001–SC-008. Within each story, write the listed tests first and
observe their relevant failure before implementing the behavior they specify.

**Organization**: Tasks are grouped by user story and ordered so each phase reaches an independently
testable checkpoint. Requirement references are included in every task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after the phase prerequisites because it changes different files and
  does not depend on an incomplete task in the same phase.
- **[Story]**: Maps the task to User Story 1, 2, or 3.
- Every task names the exact repository path it changes or validates.

## Phase 1: Setup (Shared Workspace)

**Purpose**: Establish only the approved three-workspace toolchain and safe repository inputs.

- [X] T001 Create the private npm workspace root, Node/npm engine policy, and root command names in `package.json` (Refs: FR-001, FR-012; Plan §Technical Context)
- [X] T002 [P] Create the React Router Framework Mode Public workspace manifest and build configuration in `apps/web/package.json`, `apps/web/vite.config.ts`, and `apps/web/react-router.config.ts` (Refs: FR-001–FR-002; Plan §Runtime composition)
- [X] T003 [P] Create the separate React/Vite Admin CSR workspace shell configuration in `apps/admin/package.json`, `apps/admin/vite.config.ts`, and `apps/admin/index.html` (Refs: FR-001–FR-002; Plan §Runtime composition)
- [X] T004 [P] Create the Fastify/Kysely server workspace manifest and exports in `apps/server/package.json` (Refs: FR-001–FR-002; Plan §Runtime composition)
- [X] T005 [P] Configure strict shared ESM TypeScript compilation without a shared runtime package in `tsconfig.json` (Refs: FR-012, FR-016; Plan §Project Structure)
- [X] T006 [P] Configure the baseline ESLint flat setup and TypeScript/static-check inputs in `eslint.config.js` (Refs: FR-013; Constitution Principle V)
- [X] T007 Create ignored local-state/secret rules and non-secret configuration templates in `.gitignore`, `.env.development.example`, and `.env.verification.example` (Refs: FR-005–FR-008; Operations Contract §Configuration examples)
- [X] T008 Resolve compatible approved dependency releases and commit the exact single-workspace graph in `package-lock.json` (Refs: FR-013, FR-015; Research Decisions 1–2)

**Checkpoint**: `npm ci` can reproduce exactly three application workspaces with no speculative
package, service, or module hierarchy.

---

## Phase 2: Foundational (Blocking Application Contracts)

**Purpose**: Implement the configuration, persistence, health, and composition contracts shared by
all user stories.

**⚠️ CRITICAL**: Complete this phase before any user-story implementation.

- [X] T009 [P] Write failing tests for all six configuration rejection classes, four identity dimensions, fixture provenance, and fail-before-work behavior in `apps/server/src/config.test.ts` (Refs: FR-005–FR-008, SC-004; Data Model §Execution Context)
- [X] T010 Implement immutable TypeBox-backed runtime configuration and closed Safe Diagnostic construction in `apps/server/src/config.ts` (Refs: FR-005–FR-008; HTTP Contract §SafeDiagnostic)
- [X] T011 [P] Write failing real-engine tests for non-mutating migration status, explicit apply, pending readiness, serialization, and persistence-marker semantics in `apps/server/src/migrations.test.ts` (Refs: FR-004, FR-009, SC-002; Data Model §Migration State)
- [X] T012 Create the sole foundation-operational marker migration in `apps/server/src/migrations/001-foundation-persistence-marker.ts` (Refs: SC-002, FR-002, FR-016; Research Decision 7)
- [X] T013 Implement Kysely database composition plus explicit migration status/apply and marker access in `apps/server/src/database.ts` and `apps/server/src/migrations.ts` (Refs: FR-004, FR-009, SC-002; Plan §Persistence and migrations)
- [X] T014 [P] Write failing Fastify injection tests for liveness, readiness components, pending migrations, and closed error schemas in `apps/server/src/health.test.ts` (Refs: FR-007, FR-009–FR-010; HTTP Contract `/health/live` and `/health/ready`)
- [X] T015 Implement the operational HTTP schemas, liveness, readiness, and safe failure serialization in `apps/server/src/health.ts` and `apps/server/src/http.ts` (Refs: FR-007, FR-009–FR-010; HTTP Contract §Schemas)
- [X] T016 Compose validated configuration, database capabilities, health routes, and startup ordering as the server-owned Fastify plugin in `apps/server/src/bootstrap.ts` (Refs: FR-001–FR-002, FR-006, FR-009; Plan §Runtime composition)

**Checkpoint**: Configuration, database/migration, and health contracts pass independently through
focused tests, with no frontend or lifecycle orchestration required.

---

## Phase 3: User Story 1 — Start a Safe Daily Development Environment (Priority: P1) 🎯 MVP

**Goal**: A maintainer can prepare, start, inspect, recover, restart, reset, and stop the isolated
daily foundation from a clean checkout without Production credentials/data or undocumented work.

**Independent Test**: Run Quickstart §§1–5 from a clean Development target; overall readiness passes,
the marker survives restart, exact confirmed reset removes it, unsafe states refuse mutation, and
interrupted work yields the documented retry/recover/reset/manual-review decision.

### Tests for User Story 1

- [X] T017 [P] [US1] Write failing Public foundation route and no-Product-behavior tests in `apps/web/app/routes/foundation.test.tsx` (Refs: FR-001–FR-002, FR-016; US1)
- [X] T018 [P] [US1] Write failing Admin CSR shell boundary and no-authentication tests in `apps/admin/src/app.test.tsx` (Refs: FR-001–FR-002, FR-016; US1)
- [X] T019 [US1] Write failing preflight and daily setup/start/ready/stop/restart command tests in `scripts/foundation-operations.test.ts` (Refs: FR-003, FR-006, SC-001; Operations Contract §Commands)
- [ ] T020 [US1] Add failing exact-ownership, action-token, lock/re-inventory, drift, and forbidden-deletion tests in `scripts/foundation-operations.test.ts` (Refs: FR-004, FR-017, SC-002; Data Model §Resource Inventory)
- [ ] T021 [P] [US1] Write failing interruption and recovery-decision tests for retry, non-destructive recover, reset, manual review, and immutable primary failures in `tests/verification/lifecycle-recovery.test.ts` (Refs: FR-003, FR-017; Data Model §Recovery Assessment)
- [ ] T022 [P] [US1] Write failing Development/Verification isolation, marker continuity, exact reset, and non-target inventory tests in `tests/verification/foundation-operation-target.test.ts` (Refs: FR-004, FR-008, SC-002; Quickstart §2)
- [ ] T023 [P] [US1] Write failing daily stdout/stderr, application-log, HTTP, exact-sentinel, and encoded-sentinel nondisclosure tests in `tests/verification/diagnostic-surfaces.test.ts` (Refs: FR-007, SC-004; Operations Contract §Safe diagnostic contract)

### Implementation for User Story 1

- [ ] T024 [P] [US1] Implement the minimal Public SSR foundation route and route registration in `apps/web/app/root.tsx`, `apps/web/app/routes.ts`, and `apps/web/app/routes/foundation.tsx` (Refs: FR-001–FR-002, FR-016; Plan §Runtime composition)
- [ ] T025 [P] [US1] Implement the separate minimal Admin CSR foundation shell in `apps/admin/src/app.tsx` and `apps/admin/src/main.tsx` (Refs: FR-001–FR-002, FR-016; Plan §Runtime composition)
- [ ] T026 [P] [US1] Define the provisional digest-pinned, loopback-only Development database, persistent volume, credentials, and complete ownership labels in `infra/compose.development.yaml` (Refs: FR-004–FR-005, FR-008, FR-015; Research Decisions 4–5)
- [ ] T027 [US1] Implement prerequisite checking and idempotent Development database setup in `scripts/foundation-operations.mjs` and expose `foundation:check`/`dev:setup` in `package.json` (Refs: FR-003, FR-006, SC-001; Operations Contract §Commands)
- [ ] T028 [US1] Implement supervised native Public/Admin/server startup and bounded overall readiness in `scripts/foundation-operations.mjs` and expose `dev:start`/`dev:ready` in `package.json` (Refs: FR-003, FR-009, SC-001; Operations Contract §Commands)
- [ ] T029 [US1] Implement idempotent stop and restart while preserving the Development volume in `scripts/foundation-operations.mjs` and expose `dev:stop`/`dev:restart` in `package.json` (Refs: FR-003–FR-004, SC-002; Operations Contract §Commands)
- [ ] T030 [US1] Implement typed Podman inventory normalization and exact resource/attachment ownership predicates in `scripts/foundation-operations.mjs` (Refs: FR-004, FR-017, SC-002; Data Model §Owned Runtime Resource)
- [ ] T031 [US1] Implement action-bound confirmation tokens, per-target locking, immediate re-inventory, drift refusal, and bounded exact mutation in `scripts/foundation-operations.mjs` (Refs: FR-004, FR-017, SC-002; Data Model §Resource Inventory)
- [ ] T032 [US1] Implement mode-0600 atomic lifecycle journals, signal/interruption handling, and immutable primary/secondary failures in `scripts/foundation-operations.mjs` (Refs: FR-003, FR-017; Data Model §Lifecycle Operation)
- [ ] T033 [US1] Implement the ordered retry/recover/reset/manual-review assessment and evidence digests in `scripts/foundation-operations.mjs` (Refs: FR-003, FR-017; Data Model §Recovery Assessment)
- [ ] T034 [US1] Implement the sole allowlisted Development repair and its connectivity/integrity/migration postchecks in `scripts/foundation-operations.mjs` (Refs: FR-003, FR-017; Operations Contract `foundation:recover`)
- [ ] T035 [US1] Implement marker write/read, routine restart proof, reconstructible exact reset, migration restoration, and non-target comparison in `apps/server/src/migrations.ts` and `scripts/foundation-operations.mjs` (Refs: FR-004, SC-002; Quickstart §2)
- [ ] T036 [US1] Implement non-mutating `db:status` and explicit `db:migrate` adapters in `scripts/foundation-operations.mjs` and `package.json` (Refs: FR-003–FR-004, FR-009; Operations Contract §Commands)
- [ ] T037 [US1] Expose status/inventory, interruption injection, recovery, confirmed reset, and persistence-check command adapters in `scripts/foundation-operations.mjs` and `package.json` (Refs: FR-003–FR-004, FR-017; Operations Contract §Commands)
- [ ] T038 [US1] Map application, orchestration, Podman, Compose, and database failures to the closed diagnostic contract without raw passthrough in `apps/server/src/http.ts` and `scripts/foundation-operations.mjs` (Refs: FR-007, SC-004; Operations Contract §Safe diagnostic contract)
- [ ] T039 [US1] Execute the complete independent US1 acceptance sequence and correct only in-scope failures using `specs/001-application-foundation/quickstart.md` §§1–5 (Refs: SC-001–SC-002, SC-004–SC-005, SC-007)

**Checkpoint**: User Story 1 is independently usable as the MVP and passes all daily lifecycle,
persistence, recovery, isolation, configuration, and nondisclosure evidence.

---

## Phase 4: User Story 2 — Run Release-Shaped Verification (Priority: P2)

**Goal**: A reviewer can run one clean, isolated Production-like command that emits all twenty
bounded results, cleans up exactly, reports safely, and makes no Production-parity claim.

**Independent Test**: With Development stopped or running, invoke `npm run verify:production-like`
from an absent Verification inventory and obtain all twenty ordered PASS results, exact cleanup,
atomic reporting, isolation, the parity disclaimer, and completion within ten minutes.

### Tests for User Story 2

- [ ] T040 [P] [US2] Write failing Fastify-to-React-Router adapter tests for GET/HEAD, streaming, redirects, errors, aborts, repeated headers, and response/logging ownership in `apps/web/server.test.ts` (Refs: FR-009–FR-010; Plan §Runtime composition)
- [ ] T041 [P] [US2] Add failing ordered-result, `PREREQUISITE_FAILED`, first-failure, timing, parity, and independent-target tests in `tests/verification/foundation-operation-target.test.ts` (Refs: FR-009–FR-011, SC-003; Data Model §Verification Run)
- [ ] T042 [P] [US2] Add failing Nginx/app/database exposure, forwarded-header, direct-port, Public/Admin/server-route, and SSR HTML tests in `tests/verification/diagnostic-surfaces.test.ts` (Refs: FR-009–FR-011; Research Decision 8)
- [ ] T043 [P] [US2] Add failing current-run cleanup, stale-entry refusal, target-appropriate cleanup-decision, interrupted cleanup, atomic-report, and secondary-failure tests in `tests/verification/lifecycle-recovery.test.ts` (Refs: FR-017, SC-003; Operations Contract §Failure behavior)

### Implementation for User Story 2

- [ ] T044 [US2] Configure independent production builds and release output for all three workspaces in `package.json`, `apps/web/package.json`, `apps/admin/package.json`, and `apps/server/package.json` (Refs: FR-009, FR-013; Plan §Testing and security evidence)
- [ ] T045 [P] [US2] Build the provisional Linux/Node 24 release image without repository metadata or development-only content in `infra/Containerfile` (Refs: FR-009, FR-013, FR-015; Security Contract `v5.0.0-13.4.1`)
- [ ] T046 [P] [US2] Define the isolated disposable Nginx/application/database topology, internal ports, distinct credentials/volume, and ownership labels in `infra/compose.verification.yaml` (Refs: FR-005, FR-008–FR-009; Research Decision 5)
- [ ] T047 [P] [US2] Configure the one-hop verification proxy, route forwarding, direct-app isolation, bounded headers, and safe logging in `infra/nginx/nginx.conf` (Refs: FR-009–FR-011; Research Decision 6)
- [ ] T048 [US2] Implement the single-listener Fastify/Public/Admin release composition and React Router handoff in `apps/web/server.ts` (Refs: FR-001, FR-009, FR-016; Plan §Runtime composition)
- [ ] T049 [US2] Implement Verification build/start plus valid and six invalid configuration result stages in `scripts/foundation-operations.mjs` and expose `verify:production-like` in `package.json` (Refs: FR-006, FR-009–FR-010, SC-003; Operations Contract §Verification result contract)
- [ ] T050 [US2] Implement migration, database, liveness, readiness, and dependency-blocked result stages in `scripts/foundation-operations.mjs` (Refs: FR-009–FR-010, SC-003; Operations Contract §Verification result contract)
- [ ] T051 [US2] Implement operation-target isolation, one-hop proxy assertions, and Public/Admin/server route checks in `scripts/foundation-operations.mjs` (Refs: FR-008–FR-011; Operations Contract §Verification result contract)
- [ ] T052 [US2] Implement safe container/proxy failure adapters and whole-report nondisclosure/schema validation in `apps/web/server.ts` and `scripts/foundation-operations.mjs` (Refs: FR-007, FR-010, SC-004; HTTP Contract §SafeDiagnostic)
- [ ] T053 [US2] Implement the target-appropriate Verification cleanup assessment, exact current-run cleanup, and explicit inventory-confirmed stale/interrupted cleanup in `scripts/foundation-operations.mjs` (Refs: FR-009, FR-017; Operations Contract `foundation:cleanup`)
- [ ] T054 [US2] Implement ordered result aggregation, immutable primary/secondary failures, parity statement, and atomic final report emission in `scripts/foundation-operations.mjs` (Refs: FR-009–FR-011, SC-003; Data Model §Verification Run)
- [ ] T055 [US2] Execute two clean independent Verification runs and correct only in-scope failures using `specs/001-application-foundation/quickstart.md` §6 (Refs: SC-003, SC-005, SC-007)

**Checkpoint**: User Story 2 passes independently of Development state and produces complete,
safe, reproducible release-shaped evidence without implying Production parity.

---

## Phase 5: User Story 3 — Extend the Foundation Without Architectural Drift (Priority: P3)

**Goal**: A future maintainer can identify responsibility boundaries, use common quality/security
entry points, and reject speculative or out-of-scope structure.

**Independent Test**: From repository guidance, identify the Public/Admin/Server ownership boundary,
run the complete common check, inspect the security evidence, and show that no Product behavior,
empty hierarchy, unapproved service, or unsupported Production decision exists.

### Tests for User Story 3

- [ ] T056 [US3] Write failing pinned-scanner canary, tracked-secret, raw-output, and scanner-failure tests in `scripts/security-gates.test.ts` (Refs: FR-007, FR-013; Security Contract §Gate behavior)
- [ ] T057 [US3] Add failing dependency normalization, exact-ledger reconciliation, unknown-state, actionability, approval-staleness, expiry-boundary, due-date, and empty-ledger tests in `scripts/security-gates.test.ts` (Refs: FR-013, SC-008; Security Contract §Dependency finding evidence)
- [ ] T058 [US3] Add failing ASVS schema, chapter inventory, applicable-evidence, selected-L2-rationale, and FR-016 N/A tests in `scripts/security-gates.test.ts` (Refs: FR-013, FR-016; Security Contract §Evidence artifact)

### Implementation for User Story 3

- [ ] T059 [US3] Implement the immutable-digest Gitleaks canary and tracked-content secret gate with safe diagnostics in `scripts/security-gates.mjs` (Refs: FR-007, FR-013; Security Contract §Gate behavior)
- [ ] T060 [US3] Implement finding normalization, canonical severity mapping, lock/release-graph hashing, and exact ledger reconciliation in `scripts/security-gates.mjs` (Refs: FR-013, SC-008; Data Model §Dependency Finding Review)
- [ ] T061 [US3] Implement actionability, unknown-state blocking, approval staleness/expiry, Medium/Low deadlines, policy-time injection, and overdue reporting in `scripts/security-gates.mjs` (Refs: FR-013, SC-008; Security Contract §Dependency finding evidence)
- [ ] T062 [US3] Create the current normalized dependency evidence envelope and reviewed finding rows in `docs/security/dependency-findings.json` (Refs: FR-013, SC-008; Security Contract §Dependency finding evidence)
- [ ] T063 [US3] Implement the ASVS evidence validator and safe failure behavior in `scripts/security-gates.mjs` (Refs: FR-013, FR-016; Security Contract §Gate behavior)
- [ ] T064 [US3] Create the foundation-scoped ASVS 5.0.0 applicability/implementation/verification/evidence matrix in `docs/security/asvs-foundation-evidence.md` (Refs: FR-013, FR-016; Security Contract §Minimum applicability inventory)
- [ ] T065 [US3] Enforce Public/Admin/Server import direction, prohibit speculative package/module boundaries, and complete deterministic lint/static rules in `eslint.config.js` (Refs: FR-001, FR-012–FR-013, FR-016; Plan §Project Structure)
- [ ] T066 [US3] Wire `security:secrets`, `security:dependencies`, `security:asvs`, `security:check`, independent builds, and the common `check` entry point in `package.json` (Refs: FR-013; Operations Contract §Commands)
- [ ] T067 [P] [US3] Document prerequisites, boundary ownership, daily/Verification workflows, failure interpretation, data lifecycle, troubleshooting limits, and provisional Production decisions in `README.md` (Refs: FR-014–FR-015; US3)
- [ ] T068 [US3] Run the independent boundary/security/documentation review and correct only in-scope failures using `specs/001-application-foundation/quickstart.md` §7 (Refs: SC-005–SC-006, SC-008)

**Checkpoint**: User Story 3 makes the current foundation understandable and reviewable without
adding Product scope, speculative architecture, or a security platform.

---

## Phase 6: Polish & Cross-Cutting Acceptance

**Purpose**: Prove the integrated Delivery against the approved success criteria without expanding
scope.

- [ ] T069 Run `npm ci` and the complete typecheck/lint/build/test/security pipeline, correcting only traceable foundation defects in the files selected by `package.json` (Refs: FR-013, SC-004, SC-008)
- [ ] T070 Execute the entire validation guide twice from independently clean operation-target states and correct only in-scope defects using `specs/001-application-foundation/quickstart.md` §§1–8 (Refs: SC-001–SC-005, SC-007)
- [ ] T071 Review all diagnostics, journals, surfaced logs, and Verification reports against the protected-output taxonomy in `tests/verification/diagnostic-surfaces.test.ts` (Refs: FR-007, FR-010, SC-004; Constitution Principle IV)
- [ ] T072 Audit the delivered tree and maintainer guidance for zero Product behavior, zero unapproved services, zero empty speculative hierarchies, and no frozen Production claim in `README.md` and `package.json` (Refs: FR-012, FR-015–FR-016, SC-006)

**Checkpoint**: Every required acceptance scenario, common gate, and success criterion passes twice;
the Delivery remains bounded to the approved foundation.

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)** has no dependency.
2. **Foundational (Phase 2)** depends on Phase 1 and blocks every user story.
3. **User Story 1 (Phase 3)** depends on Phase 2 and is the independently deliverable MVP.
4. **User Story 2 (Phase 4)** depends on User Story 1's runnable application/database foundation;
   it does not depend on a running Development target.
5. **User Story 3 (Phase 5)** depends on the implemented US1/US2 boundaries so its common checks,
   evidence, and guidance describe the real foundation.
6. **Polish (Phase 6)** depends on all selected user stories.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (P1 / MVP) → US2 (P2) → US3 (P3) → Cross-cutting acceptance
```

The implementation order is sequential at story level because US2 packages the application
foundation created by US1, while US3 verifies and documents both. Runtime acceptance remains
independent: US2 must pass with Development stopped or running, and US3 uses only documented public
entry points.

### Within Each User Story

- Write the story's tests first and observe the relevant failure.
- Implement data/configuration models before lifecycle or transport adapters that consume them.
- Implement exact ownership and failure handling before any destructive reset/cleanup path.
- Complete the story checkpoint before beginning the next story.

## Parallel Opportunities

- **Setup**: T002–T006 may run in parallel after T001; T007 is also independent of application source.
- **Foundational**: T009, T011, and T014 are parallel test-authoring tasks; their paired
  implementations remain ordered.
- **US1**: T017, T018, T021, T022, and T023 can be authored in parallel; T024–T026 implement different
  files in parallel before orchestration integration.
- **US2**: T040–T043 can be authored in parallel; T045–T047 implement separate image/manifest/proxy
  files in parallel after the release-build contract is known.
- **US3**: T067 can proceed alongside the security-gate sequence once US1 and US2 are complete.

## Parallel Examples

### User Story 1

```text
T017: Public boundary tests in apps/web/app/routes/foundation.test.tsx
T018: Admin boundary tests in apps/admin/src/app.test.tsx
T021: Recovery tests in tests/verification/lifecycle-recovery.test.ts
T022: Isolation/persistence tests in tests/verification/foundation-operation-target.test.ts
T023: Nondisclosure tests in tests/verification/diagnostic-surfaces.test.ts
```

### User Story 2

```text
T040: Fastify/React Router adapter tests in apps/web/server.test.ts
T041: Ordered Verification result tests in tests/verification/foundation-operation-target.test.ts
T042: Proxy/route/isolation tests in tests/verification/diagnostic-surfaces.test.ts
T043: Cleanup/reporting tests in tests/verification/lifecycle-recovery.test.ts
```

### User Story 3

```text
T056–T058: Sequential test additions in scripts/security-gates.test.ts
T067: Maintainer guidance in README.md can proceed in parallel with T056–T066
```

## Requirement Traceability

| Requirement / outcome | Primary task coverage |
|---|---|
| FR-001–FR-002, FR-012, FR-016 | T001–T006, T017–T018, T024–T025, T048, T065, T067, T072 |
| FR-003–FR-004, FR-017, SC-001–SC-002 | T019–T022, T026–T037, T039 |
| FR-005–FR-008, SC-004 | T007, T009–T010, T023, T026, T030–T031, T038, T046, T052, T071 |
| FR-009–FR-011, SC-003 | T014–T016, T028, T040–T055 |
| FR-013, SC-008 | T006, T008, T044–T045, T056–T066, T068–T069 |
| FR-014–FR-015, SC-005–SC-007 | T039, T055, T067–T072 |

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete User Story 1 through T039.
3. Stop and independently validate Quickstart §§1–5 before adding Verification packaging.

### Incremental Delivery

1. **US1** delivers the safe daily foundation and local data lifecycle.
2. **US2** adds isolated release-shaped Verification without changing the daily path.
3. **US3** adds the common gates, evidence, and guidance for safe extension.
4. **Phase 6** proves the integrated Delivery twice without adding new scope.

## Notes

- `[P]` tasks change different files and have no incomplete same-phase prerequisite.
- User-story labels are present only in story phases.
- Tests precede implementation in each story because this feature explicitly requires deterministic
  acceptance and security evidence.
- No task authorizes Product schemas/APIs/UI, authentication, Production deployment/data, new
  services, shared packages, or final Production runtime/database/proxy decisions.
- Implementation remains unauthorized until a specific task or approved small batch is handed off.
