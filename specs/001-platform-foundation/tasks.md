---

description: "Actionable task graph for the Songhealth Platform Foundation"
---

# Tasks: Platform Foundation

**Input**: Approved design documents from `specs/001-platform-foundation/`

**Prerequisites**: Approved `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and the 30/30 reviewer-owned `checklists/foundation-review.md`

**Tests**: Focused tests and operational verification are required because Feature 001 must produce independently reviewable evidence. Test Songhealth configuration and integration boundaries only; do not duplicate Astro, EmDash, PostgreSQL, Podman, or Quadlet upstream test suites.

**Organization**: Tasks are grouped by shared prerequisites and the four approved user stories. Each task is a bounded Multica handoff that must receive independent Codex review before dependent work proceeds.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Safe to execute in parallel only after the stated prerequisites are complete; marked tasks own different files and no shared mutable runtime resource.
- **[Story]**: Maps the task to an approved user story from `spec.md`.
- Every task includes exact expected file paths and stays within Feature 001.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the version-pinned, secret-safe repository baseline required for the real compatibility gate.

- [ ] T001 Revalidate the approved Node 24 LTS, npm, Astro, Node adapter, EmDash, React, TypeScript, `pg`, PostgreSQL 18.6, Podman, and Quadlet baseline using Context7 first where supported and authoritative first-party sources otherwise; record dated results and any stop condition without changing approved architecture in `specs/001-platform-foundation/evidence/T001-dependency-baseline.md`
- [ ] T002 [P] Initialize the single root TypeScript/Astro package with exact approved dependency versions, reproducible npm scripts, and one lockfile in `package.json`, `package-lock.json`, and `tsconfig.json`; do not add a monorepo, backend package, or unbounded `latest` dependency
- [ ] T003 [P] Establish repository hygiene and external configuration names with safe placeholders only in `.gitignore` and `.env.example`; exclude local environment files, development media, build output including generated `.emdash/migrations.json`, and raw validation logs while never committing secret values

**Checkpoint**: The repository has a reproducible package baseline and safe configuration surface, but no feature behavior is accepted yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the native single-application integration and resolve the PostgreSQL 18.6 compatibility risk before user-story work.

**CRITICAL**: T006 is a hard gate. If it fails, stop every dependent task and escalate to the Product Owner/architecture authority. Do not downgrade PostgreSQL, patch EmDash, add a compatibility layer, or change architecture automatically.

- [ ] T004 [P] Configure the canonical Astro SSR application with the standalone Node adapter, React, integrated EmDash, native PostgreSQL adapter, native persistent local-media adapter, live-collection loader, native production `check` and development `auto` migration modes, and an explicit version-1 empty seed in `astro.config.mjs`, `src/live.config.ts`, and `seed/seed.json`; build/sync must emit the native migration manifest, and the seed must define zero Product collections, content, taxonomies, relations, redirects, menus, widgets, or sections
- [ ] T005 [P] Add bounded rootless-Podman development PostgreSQL 18.6 start, stop, and status controls without containerizing Node/Astro tooling in `scripts/dev-db.sh` and the corresponding scripts in `package.json`
- [ ] T006 Run the blocking native EmDash/PostgreSQL 18.6 compatibility gate against the actual pinned combination using `tests/operations/verify-emdash-postgresql-compatibility.sh`: build/sync the exact application manifest, inspect the intended target with `emdash migrate --status`, apply pending migrations with native `emdash migrate` while preserving required non-interactive target-fingerprint safety, verify with `emdash migrate --check`, and start the integrated application; write redacted pass/fail evidence with exact versions to `specs/001-platform-foundation/evidence/T006-emdash-postgresql-compatibility.md`, halt all dependent work on any failure, and do not add a migration framework or service
- [ ] T007 Add focused failing tests for required configuration, malformed or inconsistent values, safe field-name-only errors, and secret redaction in `tests/node/config.test.ts`; tests must not contain real credentials or secret values
- [ ] T008 Wire required environment values through supported Astro/EmDash configuration and add only the minimal fail-fast validation needed to satisfy T007 in `astro.config.mjs` and `src/live.config.ts`; do not create a configuration service, helper framework, repository, or plugin abstraction

**Checkpoint**: The actual EmDash/PostgreSQL 18.6 combination has passed the blocking gate and the shared configuration boundary is ready. No user-story work may start before this checkpoint.

---

## Phase 3: User Story 1 — Start the Canonical Platform (Priority: P1) 🎯 MVP

**Goal**: From a clean checkout, start one Astro + EmDash platform with minimum public behavior, native Admin/passkey setup, persistent data/media boundaries, and private ready/not-ready evidence.

**Independent Test**: A non-author maintainer uses only documented prerequisites and external configuration to start the platform, reach the minimum SSR surface and native Admin setup/sign-in, store and retrieve designated non-confidential database/media validation items, and obtain the expected readiness result with zero undocumented intervention or secret disclosure.

### Focused verification for User Story 1

- [ ] T009 [P] [US1] Add focused failing tests for the demonstrated aggregate-readiness gap in `tests/node/foundation.test.ts`, covering ready/not-ready exit behavior, loopback SSR, bounded PostgreSQL connectivity, non-mutating media mount presence/readability, missing dependencies, and secret-redacted output
- [ ] T010 [P] [US1] Add focused browser smoke coverage for the minimum public SSR marker and native EmDash Admin setup/sign-in availability—without automating passkey login or testing EmDash internals—in `tests/browser/foundation.spec.ts` and `playwright.config.ts`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Implement only the minimum public-runtime verification page with a stable SSR marker and no Homepage composition or Product content in `src/pages/index.astro`
- [ ] T012 [P] [US1] Implement the smallest private, repeatable, on-demand, non-mutating aggregate readiness helper satisfying T009 in `scripts/verify-readiness.mjs`; it may check loopback SSR, PostgreSQL connectivity, and expected-media-mount presence/readability, but must not expose a public endpoint or become a health API, monitoring framework, service layer, or plugin framework
- [ ] T013 [US1] Implement the distinct startup-acceptance gates in `tests/operations/verify-startup.sh` and corresponding `package.json` scripts: consume the exact application build's native migration manifest, inspect the intended target with `emdash migrate --status`, apply pending migrations with native `emdash migrate` while preserving required non-interactive target-fingerprint safety, verify the result with `emdash migrate --check`, and run a bounded disposable media write/read/remove probe; any status/apply/check or media-writeability failure blocks READY, while normal recurring readiness remains non-mutating and no migration service/framework is added
- [ ] T014 [US1] Document the clean-checkout native Node/npm development workflow, rootless PostgreSQL helper, external configuration, ignored local media, native Admin/passkey setup, startup gates, readiness command, shutdown, and common failure recovery in `README.md`
- [ ] T015 [US1] Execute the User Story 1 independent test from a clean checkout with disposable non-confidential validation data/media; set and retrieve the native EmDash Site Setting `tagline` with exact value `Songhealth Feature 001 foundation validation`, record its exact UTF-8 value and SHA-256 digest as the canonical database validation evidence, and record redacted setup, build/start, public/Admin, readiness matrix, native migration status/apply/check gate, media-writeability, and secret-redaction evidence in `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md`

**Checkpoint**: User Story 1 is independently usable as the MVP platform foundation. Stop for Codex PASS/REWORK before production lifecycle work.

---

## Phase 4: User Story 2 — Operate Without Losing Persistent Data (Priority: P2)

**Goal**: Operate the approved rootless Podman/Quadlet production foundation through start, stop, restart, and recreation without data loss or unintended PostgreSQL exposure.

**Independent Test**: With the canonical native site `tagline` value/digest and designated validation media present, complete three start/stop/restart/recreate cycles, retain all state and integrity, reject every defined unintended host/public PostgreSQL connection, preserve private application access, and report not-ready when an expected persistence attachment is missing.

### Operational verification for User Story 2

- [ ] T016 [US2] Create the failing bounded production smoke/lifecycle verification harness for startup gates, private-network access, absence of a published PostgreSQL port, expected volume attachments, three lifecycle cycles, missing-volume not-ready behavior, exact native site `tagline` value/digest comparison, and media integrity comparison in `tests/operations/verify-foundation.sh`

### Implementation for User Story 2

- [ ] T017 [P] [US2] Build the single pinned production Astro + EmDash OCI runtime, retaining the native migration manifest emitted by that exact application build for deployment/startup use, with external runtime configuration and no embedded secrets in `deploy/Containerfile` and `.containerignore`; do not add Docker Compose or a second production stack
- [ ] T018 [P] [US2] Define the rootless private application network and separate persistent PostgreSQL/media volumes in `deploy/quadlet/songhealth.network`, `deploy/quadlet/songhealth-db-data.volume`, and `deploy/quadlet/songhealth-media.volume`
- [ ] T019 [US2] Define the pinned PostgreSQL 18.6 rootless Quadlet with private-network-only attachment, persistent database volume, external secrets/configuration, native container health, and no published host port in `deploy/quadlet/songhealth-db.container`
- [ ] T020 [US2] Define the single Astro + EmDash application Quadlet in `deploy/quadlet/songhealth-app.container` with the persistent media volume, private network, proxy-facing loopback publication, external secrets/configuration, restart behavior, and startup ordering that runs T013's exact-build-manifest status/apply/check migration gate before the application is accepted ready; block readiness on migration failure without adding a migration container, service, or orchestration layer
- [ ] T021 [US2] Document rootless user-systemd installation, start/stop/restart/recreation, private database boundary, persistent volume handling, readiness interpretation, and the external HTTPS/reverse-proxy boundary without selecting a proxy product in `docs/operations/production-foundation.md`
- [ ] T022 [US2] Execute T016 on a production-capable verification host and record redacted Quadlet unit, image/build-manifest identity, native migration status/apply/check outcome, health, network, port, volume, three-cycle lifecycle, missing-attachment, and persistence-integrity evidence in `specs/001-platform-foundation/evidence/T022-us2-production-durability.md`; every lifecycle comparison must retrieve and match the exact native site `tagline` value/digest established by T015

**Checkpoint**: User Story 2 proves production lifecycle durability and private PostgreSQL exposure at the mandatory T022 runtime gate. Stop for Codex PASS/REWORK on T022 before any dependent runtime work. Under the approved Development-First Sequencing decision (see Notes), Phase 5 source authoring may proceed in parallel after T021 acceptance without requiring T022 PASS.

---

## Phase 5: User Story 3 — Recover Foundation Data (Priority: P3)

**Goal**: Restore the complete designated EmDash database state, persistent media, and independently protected runtime secrets into a clean/recreated runtime with measurable integrity.

**Independent Test**: Create database and media artifacts for one known validation state, restore them into clean PostgreSQL/media persistence, separately recover required runtime secrets, and demonstrate exact canonical native site `tagline` value/digest recovery plus 100% designated-media recovery with zero unexplained integrity differences; incomplete, corrupt, mismatched, or secret-incomplete recovery must fail closed.

**Sequencing (Development-First, bounded Product Owner decision of 2026-10-11)**: T023–T027 may be authored as sources and independently reviewed once the accepted production source boundary through T021 and the earlier gates are in place; T022 runtime PASS is not a prerequisite for that source work, which still requires separate bounded Product Owner authorization per task. Source review does not establish runtime acceptance, complete US2/US3, waive any failed gate, or satisfy final feature acceptance: T022 remains a mandatory runtime acceptance gate, and T028 may execute only after both T022 PASS and Codex-accepted sources for all of T023–T027.

### Recovery verification for User Story 3

- [ ] T023 [P] [US3] Document the independently protected runtime-secret inventory, backup/reference, restore, rotation/escalation, and non-secret evidence procedure—including `EMDASH_ENCRYPTION_KEY`—without selecting a secret-management platform or placing values in Git, Recovery Set artifacts, tests, transcripts, planning artifacts, or logs in `docs/operations/runtime-secret-recovery.md`
- [ ] T024 [P] [US3] Create the failing clean-recovery verification scenario for archive readability, error-stopping restore, native migration status/apply/check state, exact native EmDash Site Setting `tagline` value/digest comparison from T015, complete media checksum comparison, Recovery Set mismatch/corruption handling, and separate missing-secret failure in `tests/operations/verify-recovery.sh`

### Implementation for User Story 3

- [ ] T025 [US3] Implement the bounded backup procedure using a complete unfiltered custom-format `pg_dump`, a separate complete media archive, checksums, and one common recovery-set identifier/manifest that records the native site `tagline` value/digest and media evidence for the same quiescent known state in `scripts/backup-foundation.sh`; do not add atomic snapshots, WAL/PITR, replication privileges, standby infrastructure, continuous orchestration, or secrets to the Recovery Set
- [ ] T026 [US3] Implement restore into a clean PostgreSQL database and clean media volume with `pg_restore --exit-on-error --no-owner --no-privileges`, no schema/table filters, pre-restore artifact validation, and fail-closed handling in `scripts/restore-foundation.sh`; keep runtime-secret restoration a separate prerequisite for operational-use acceptance
- [ ] T027 [US3] Implement the restored-foundation integrity comparator for the native EmDash Site Setting `tagline` exact value/digest established by T015, native migration state, and every designated media path/size/SHA-256 digest in `scripts/verify-restored-foundation.mjs`; do not substitute Admin identity, passkey metadata, arbitrary internal rows, or a Product collection, and output only redacted pass/fail evidence with zero secret values
- [ ] T028 [US3] Execute the complete recovery drill against clean/recreated persistence and record the Recovery Set identity, tool/server versions, archive/checksum validation, restore result, exact restored native site `tagline` value/digest comparison from T027, 100% designated data/media comparison, zero unexplained differences, and separate non-secret runtime-secret recovery result in `specs/001-platform-foundation/evidence/T028-us3-recovery.md`

**Checkpoint**: User Story 3 proves the approved minimum logical recovery baseline. Stop for Codex PASS/REWORK before downstream-foundation review.

---

## Phase 6: User Story 4 — Build from the Canonical Foundation (Priority: P4)

**Goal**: Demonstrate that later approved content-model, public-page, publishing, and other bounded Product work can extend one canonical platform without creating a competing foundation.

**Independent Test**: An architecture/specification review maps all four downstream capability groups to the single foundation, finds no duplicate application/backend/platform boundary, and finds no boundary replacement without a documented requirement gap and owning-authority amendment.

- [ ] T029 [US4] Prepare feature-scoped review evidence in `specs/001-platform-foundation/evidence/T029-canonical-extension-seams.md` that maps the currently planned downstream capability groups to the canonical foundation, identifies the existing native extension seams they rely on, references the owning authority for each boundary, explicitly states that the artifact is review evidence rather than architecture authority, and demonstrates that no second backend/platform foundation or speculative abstraction is needed
- [ ] T030 [US4] Independently review T029's canonical-extension evidence against the owning authority and record PASS/REWORK traceability for content models, public pages, publishing behavior, and other bounded Product features, including explicit confirmation that no Product collection, competing foundation, or speculative abstraction was delivered, in `specs/001-platform-foundation/evidence/T030-us4-extension-review.md`

**Checkpoint**: All four user stories are independently satisfied without expanding Feature 001 scope.

---

## Phase 7: Final Verification & Evidence Handoff

**Purpose**: Run the approved end-to-end contract and assemble a bounded, secret-free handoff for independent acceptance review.

- [ ] T031 Execute every applicable step in `specs/001-platform-foundation/quickstart.md` against the completed foundation, including exact-build migration-manifest identity, native status/apply/check sequencing with target-fingerprint safety, canonical native site `tagline` lifecycle/recovery comparison, type/tests/build, and rootless Podman/Quadlet smoke; record a redacted pass/fail matrix with exact versions and no undocumented checks in `specs/001-platform-foundation/evidence/T031-full-foundation-validation.md`
- [ ] T032 Assemble the evidence index linking T001, T006, T015, T022, T028, T030, and T031 results; confirm secret values and confidential data are absent, every explicit out-of-scope capability remains absent, and unresolved items are visible for Codex review in `specs/001-platform-foundation/evidence/README.md`

**Final checkpoint**: Stop for Tasks Review and later bounded human authorization. Task generation itself grants no implementation authorization.

---

## Dependencies & Execution Order

### Task Dependency Graph

```text
T001 -> {T002 || T003}
{T002, T003} -> {T004 || T005}
{T004, T005} -> T006 [HARD COMPATIBILITY GATE] -> T007 -> T008
T008 -> {T009 || T010}
T009 -> T012
T010 -> T011
{T011, T012} -> T013 -> T014 -> T015 [US1 GATE]
T015 -> T016 -> {T017 || T018}
T018 -> T019
{T017, T019} -> T020 -> T021 -> T022 [US2 GATE]
T021 -> {T023 || T024} [DFS: source authoring/review only; T022 PASS not required]
T024 -> T025 -> T026 -> T027 [each edge: accepted source review before dependent work]
{T022, T023, T027} -> T028 [US3 GATE: joins T022 PASS + accepted T023–T027 sources] -> T029 -> T030 [US4 GATE]
T030 -> T031 -> T032
```

**Development-First Sequencing (graph)**: The `T021 -> {T023 || T024}` edge records the bounded Product Owner decision that recovery sources may be authored and reviewed once the production source boundary through T021 is accepted, without waiting for T022 runtime PASS. Every other edge keeps its original meaning, and each Phase 5 dependency still requires independent Codex source review before dependent work proceeds. The T028 join is explicit: T028 execution requires both T022 PASS and Codex-accepted sources for T023–T027, including T023's separately documented runtime-secret recovery prerequisite.

### Phase Dependencies

- **Setup (Phase 1)**: T001 completes before parallel T002/T003.
- **Foundational (Phase 2)**: T004/T005 require Setup; T006 requires both and blocks all later work; T007/T008 follow only after T006 passes.
- **User Story 1 (Phase 3)**: Requires T008; T009/T010 precede their protected behavior; T015 is the story gate.
- **User Story 2 (Phase 4)**: Requires T015 PASS; T016 defines verification before deployment work; T022 is the story gate.
- **User Story 3 (Phase 5)**: Source authoring requires the accepted production source boundary through T021—not T022 PASS—under Development-First Sequencing, with separate bounded Product Owner authorization; T023/T024 remain file-independent; T024 defines recovery verification before backup/restore implementation, and each Phase 5 dependency requires independent source review before dependent work proceeds; T028 is the story gate and requires the join of T022 PASS plus accepted T023–T027 sources.
- **User Story 4 (Phase 6)**: Requires T028 PASS so the review covers the complete foundation; T030 is the story gate.
- **Final phase**: Requires T030 PASS; T032 follows full validation T031.

### Blocking Gates

- **T006 — PostgreSQL 18.6 / EmDash compatibility**: Hard stop on failure; only Product Owner/architecture resolution can unblock dependent work.
- **T015 — Canonical platform/MVP**: Must pass clean-checkout, public/Admin, readiness, migration, media-writeability, and secret-redaction criteria.
- **T022 — Production durability**: Must pass private-network, no-public-DB, lifecycle, missing-attachment, and persistence checks. Under Development-First Sequencing it remains a mandatory runtime acceptance gate whose PASS is required before T028 executes; it no longer blocks T023–T027 source authoring and review.
- **T028 — Recovery**: Must pass clean logical restore, media restore, integrity, and separate runtime-secret recovery criteria. Execution requires the explicit join of T022 PASS and Codex-accepted sources for T023–T027, including T023's separately documented runtime-secret recovery prerequisite.
- **T030 — Canonical extension review**: Must find no second foundation or Product-scope expansion.
- **T031 — Full validation**: Must pass before final evidence handoff.

### Parallel Opportunities

- **T002 + T003** after T001: package initialization and repository/config hygiene own different files and use no shared runtime.
- **T004 + T005** after Phase 1: application configuration and development PostgreSQL controls own different files; neither consumes the other's unfinished artifacts.
- **T009 + T010**, then **T011 + T012**, after T008: Node readiness tests/public browser tests and their corresponding page/helper implementations are file-disjoint; each pair joins before T013.
- **T017 + T018** after T016: OCI image files and network/volume Quadlets are file-disjoint and share no mutable runtime during authoring; both join before container-unit completion.
- **T023 + T024** after T021 acceptance: secret-recovery documentation and recovery verification scenario own different files, do not consume each other's outputs, and require no T022 runtime PASS.
- No user-story phases run in parallel at runtime because each later story consumes runtime evidence and boundaries established by the previous priority. The single bounded exception is Development-First Sequencing: Phase 5 source authoring/review may overlap a still-pending T022 runtime gate, and the two lines rejoin at T028.

---

## Implementation Strategy

### MVP Boundary

The suggested MVP is **Phase 1 + Phase 2 + User Story 1 through T015**. This yields the canonical single Astro + EmDash platform, proves the selected database combination, and demonstrates clean-checkout startup, Admin/public availability, persistence boundaries, and private readiness without authorizing production lifecycle or recovery work early.

### Incremental Delivery

1. Complete Setup and pass T006 before accepting any downstream database-dependent implementation.
2. Complete US1 and obtain Codex PASS/REWORK at T015.
3. Author and review the production Podman/Quadlet source boundary through T021, then execute the durability gate T022 and obtain review.
4. After T021 acceptance, and in parallel with any still-pending T022 execution, author and independently review the logical database/media recovery sources T023–T027 (Development-First Sequencing; separate bounded Product Owner authorization per task).
5. Execute T028 only after the explicit join of T022 PASS and accepted T023–T027 sources, and obtain review.
6. Complete the canonical-extension review at T030.
7. Run final validation and hand off the evidence index; do not begin implementation without the separate Human Gate authorization required by the Constitution.

## Scope Guardrails

- There is no `contracts/` task because Feature 001 introduces no Songhealth-owned external API, library, webhook, or CLI contract.
- No task may add Product collections, Homepage composition, editorial content, Search, migration, Dashboard/analytics, custom RBAC/workflow, separate backend/API, Domain/Application/Policy layers, repository/service wrappers, custom media/redirect/import frameworks, Redis, brokers, microservices, Kubernetes, Docker/Compose production, a monitoring stack, or a reverse-proxy product.
- The readiness helper in T012 is the only demonstrated Songhealth-specific extension. Any additional apparent native-capability gap must stop at review and be escalated; do not create an unapproved extension opportunistically.
- Physical backup, WAL archiving, PITR, replication, standby systems, RPO/RTO commitments, continuous backup orchestration, atomic cross-store backup, and a secret-management platform remain deferred.
- Use only disposable non-confidential database records, public-publishable validation media, and redacted evidence. Never place secret values in Git, tests, evidence, planning artifacts, or logs.

## Notes

- **Development-First Sequencing (bounded Product Owner decision of 2026-10-11, Multica issue 9GOTSTORY-194)**: T023–T027 may be authored and independently reviewed as sources after the accepted production source boundary through T021, without T022 runtime PASS. The decision changes sequencing only: no task deliverable, gate, architecture, or specification requirement changes; each recovery-source task still requires separate bounded Product Owner authorization and independent Codex source review before dependent work proceeds; and source review does not establish runtime acceptance, complete US2/US3, waive any failed gate, or satisfy final feature acceptance. T022 and T028 remain mandatory runtime acceptance gates, T028 requires both T022 PASS and accepted T023–T027 sources, and all final evidence requirements—including T022/T028 evidence—are unchanged.
- **CA-01 remains deferred** and is unaffected by this amendment.
- Every completed task must return its focused verification evidence for independent Codex PASS/REWORK before dependent tasks continue.
- `[P]` means file/resource independence only after the documented prerequisites are satisfied.
- Tests and operational verification precede or accompany the behavior they protect.
- Commit only the bounded implementation and permitted redacted evidence for the selected task; do not include later-task work because a file is already open.
- Stop on every blocking-gate failure and preserve the current authority boundary.
