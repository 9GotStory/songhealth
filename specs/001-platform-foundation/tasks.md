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
- [ ] T003 [P] Establish repository hygiene and external configuration names with safe placeholders only in `.gitignore` and `.env.example`; exclude local environment files, development media, build output, and raw validation logs while never committing secret values

**Checkpoint**: The repository has a reproducible package baseline and safe configuration surface, but no feature behavior is accepted yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the native single-application integration and resolve the PostgreSQL 18.6 compatibility risk before user-story work.

**CRITICAL**: T006 is a hard gate. If it fails, stop every dependent task and escalate to the Product Owner/architecture authority. Do not downgrade PostgreSQL, patch EmDash, add a compatibility layer, or change architecture automatically.

- [ ] T004 [P] Configure the canonical Astro SSR application with the standalone Node adapter, React, integrated EmDash, native PostgreSQL adapter, native persistent local-media adapter, live-collection loader, and an explicit version-1 empty seed in `astro.config.mjs`, `src/live.config.ts`, and `seed/seed.json`; the seed must define zero Product collections, content, taxonomies, relations, redirects, menus, widgets, or sections
- [ ] T005 [P] Add bounded rootless-Podman development PostgreSQL 18.6 start, stop, and status controls without containerizing Node/Astro tooling in `scripts/dev-db.sh` and the corresponding scripts in `package.json`
- [ ] T006 Run the blocking native EmDash/PostgreSQL 18.6 compatibility gate against the actual pinned combination—initialize, apply/check supported native migrations, and start the integrated application—using `tests/operations/verify-emdash-postgresql-compatibility.sh`; write redacted pass/fail evidence with exact versions to `specs/001-platform-foundation/evidence/T006-emdash-postgresql-compatibility.md`, and halt all dependent work on failure
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
- [ ] T013 [US1] Implement the distinct startup-acceptance gates using native `emdash migrate --check` plus a bounded disposable media write/read/remove probe in `tests/operations/verify-startup.sh` and corresponding `package.json` scripts; migration/check or media-writeability failure blocks READY, while normal recurring readiness remains non-mutating
- [ ] T014 [US1] Document the clean-checkout native Node/npm development workflow, rootless PostgreSQL helper, external configuration, ignored local media, native Admin/passkey setup, startup gates, readiness command, shutdown, and common failure recovery in `README.md`
- [ ] T015 [US1] Execute the User Story 1 independent test from a clean checkout with disposable non-confidential validation data/media and record redacted setup, build/start, public/Admin, readiness matrix, migration-gate, media-writeability, and secret-redaction evidence in `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md`

**Checkpoint**: User Story 1 is independently usable as the MVP platform foundation. Stop for Codex PASS/REWORK before production lifecycle work.

---

## Phase 4: User Story 2 — Operate Without Losing Persistent Data (Priority: P2)

**Goal**: Operate the approved rootless Podman/Quadlet production foundation through start, stop, restart, and recreation without data loss or unintended PostgreSQL exposure.

**Independent Test**: With designated validation database/media state present, complete three start/stop/restart/recreate cycles, retain all state and integrity, reject every defined unintended host/public PostgreSQL connection, preserve private application access, and report not-ready when an expected persistence attachment is missing.

### Operational verification for User Story 2

- [ ] T016 [US2] Create the failing bounded production smoke/lifecycle verification harness for startup gates, private-network access, absence of a published PostgreSQL port, expected volume attachments, three lifecycle cycles, missing-volume not-ready behavior, and database/media integrity comparisons in `tests/operations/verify-foundation.sh`

### Implementation for User Story 2

- [ ] T017 [P] [US2] Build the single pinned production Astro + EmDash OCI runtime with external runtime configuration and no embedded secrets in `deploy/Containerfile` and `.containerignore`; do not add Docker Compose or a second production stack
- [ ] T018 [P] [US2] Define the rootless private application network and separate persistent PostgreSQL/media volumes in `deploy/quadlet/songhealth.network`, `deploy/quadlet/songhealth-db-data.volume`, and `deploy/quadlet/songhealth-media.volume`
- [ ] T019 [US2] Define the pinned PostgreSQL 18.6 rootless Quadlet with private-network-only attachment, persistent database volume, external secrets/configuration, native container health, and no published host port in `deploy/quadlet/songhealth-db.container`
- [ ] T020 [US2] Define the single Astro + EmDash application Quadlet with the persistent media volume, private network, proxy-facing loopback publication, external secrets/configuration, startup ordering, migration/readiness gates, and restart behavior in `deploy/quadlet/songhealth-app.container`
- [ ] T021 [US2] Document rootless user-systemd installation, start/stop/restart/recreation, private database boundary, persistent volume handling, readiness interpretation, and the external HTTPS/reverse-proxy boundary without selecting a proxy product in `docs/operations/production-foundation.md`
- [ ] T022 [US2] Execute T016 on a production-capable verification host and record redacted Quadlet unit, image digest, health, network, port, volume, three-cycle lifecycle, missing-attachment, and persistence-integrity evidence in `specs/001-platform-foundation/evidence/T022-us2-production-durability.md`

**Checkpoint**: User Story 2 proves production lifecycle durability and private PostgreSQL exposure. Stop for Codex PASS/REWORK before recovery work.

---

## Phase 5: User Story 3 — Recover Foundation Data (Priority: P3)

**Goal**: Restore the complete designated EmDash database state, persistent media, and independently protected runtime secrets into a clean/recreated runtime with measurable integrity.

**Independent Test**: Create database and media artifacts for one known validation state, restore them into clean PostgreSQL/media persistence, separately recover required runtime secrets, and demonstrate 100% designated-record/media recovery with zero unexplained integrity differences; incomplete, corrupt, mismatched, or secret-incomplete recovery must fail closed.

### Recovery verification for User Story 3

- [ ] T023 [P] [US3] Document the independently protected runtime-secret inventory, backup/reference, restore, rotation/escalation, and non-secret evidence procedure—including `EMDASH_ENCRYPTION_KEY`—without selecting a secret-management platform or placing values in Git, Recovery Set artifacts, tests, transcripts, planning artifacts, or logs in `docs/operations/runtime-secret-recovery.md`
- [ ] T024 [P] [US3] Create the failing clean-recovery verification scenario for archive readability, error-stopping restore, native migration state, designated database-record comparison, complete media checksum comparison, Recovery Set mismatch/corruption handling, and separate missing-secret failure in `tests/operations/verify-recovery.sh`

### Implementation for User Story 3

- [ ] T025 [US3] Implement the bounded backup procedure using a complete unfiltered custom-format `pg_dump`, a separate complete media archive, checksums, and one common recovery-set identifier/manifest for the same quiescent known state in `scripts/backup-foundation.sh`; do not add atomic snapshots, WAL/PITR, replication privileges, standby infrastructure, continuous orchestration, or secrets to the Recovery Set
- [ ] T026 [US3] Implement restore into a clean PostgreSQL database and clean media volume with `pg_restore --exit-on-error --no-owner --no-privileges`, no schema/table filters, pre-restore artifact validation, and fail-closed handling in `scripts/restore-foundation.sh`; keep runtime-secret restoration a separate prerequisite for operational-use acceptance
- [ ] T027 [US3] Implement the restored-foundation integrity comparator for the designated native EmDash validation record, native migration state, and every designated media path/size/SHA-256 digest in `scripts/verify-restored-foundation.mjs`; output only redacted pass/fail evidence with zero secret values
- [ ] T028 [US3] Execute the complete recovery drill against clean/recreated persistence and record the Recovery Set identity, tool/server versions, archive/checksum validation, restore result, 100% designated data/media comparison, zero unexplained differences, and separate non-secret runtime-secret recovery result in `specs/001-platform-foundation/evidence/T028-us3-recovery.md`

**Checkpoint**: User Story 3 proves the approved minimum logical recovery baseline. Stop for Codex PASS/REWORK before downstream-foundation review.

---

## Phase 6: User Story 4 — Build from the Canonical Foundation (Priority: P4)

**Goal**: Demonstrate that later approved content-model, public-page, publishing, and other bounded Product work can extend one canonical platform without creating a competing foundation.

**Independent Test**: An architecture/specification review maps all four downstream capability groups to the single foundation, finds no duplicate application/backend/platform boundary, and finds no boundary replacement without a documented requirement gap and owning-authority amendment.

- [ ] T029 [US4] Document the canonical extension seams, authority-amendment rule, native-first extension gate, and explicit prohibition on a second backend/platform or speculative Domain/Application/Policy, service/repository, plugin, RBAC, search, media, redirect, importer, broker, microservice, or Kubernetes framework in `docs/development/platform-foundation-boundaries.md`
- [ ] T030 [US4] Prepare downstream-capability traceability evidence mapping content models, public pages, publishing behavior, and other bounded Product features to the canonical foundation, with explicit confirmation that no Product collection or competing foundation was delivered, for independent Codex review in `specs/001-platform-foundation/evidence/T030-us4-extension-review.md`

**Checkpoint**: All four user stories are independently satisfied without expanding Feature 001 scope.

---

## Phase 7: Final Verification & Evidence Handoff

**Purpose**: Run the approved end-to-end contract and assemble a bounded, secret-free handoff for independent acceptance review.

- [ ] T031 Execute every applicable step in `specs/001-platform-foundation/quickstart.md` against the completed foundation, rerun type/tests/build plus rootless Podman/Quadlet smoke, and record a redacted pass/fail matrix with exact versions and no undocumented checks in `specs/001-platform-foundation/evidence/T031-full-foundation-validation.md`
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
T022 -> {T023 || T024}
T024 -> T025 -> T026 -> T027
{T023, T027} -> T028 [US3 GATE] -> T029 -> T030 [US4 GATE]
T030 -> T031 -> T032
```

### Phase Dependencies

- **Setup (Phase 1)**: T001 completes before parallel T002/T003.
- **Foundational (Phase 2)**: T004/T005 require Setup; T006 requires both and blocks all later work; T007/T008 follow only after T006 passes.
- **User Story 1 (Phase 3)**: Requires T008; T009/T010 precede their protected behavior; T015 is the story gate.
- **User Story 2 (Phase 4)**: Requires T015 PASS; T016 defines verification before deployment work; T022 is the story gate.
- **User Story 3 (Phase 5)**: Requires T022 PASS; T024 defines recovery verification before backup/restore implementation; T028 is the story gate.
- **User Story 4 (Phase 6)**: Requires T028 PASS so the review covers the complete foundation; T030 is the story gate.
- **Final phase**: Requires T030 PASS; T032 follows full validation T031.

### Blocking Gates

- **T006 — PostgreSQL 18.6 / EmDash compatibility**: Hard stop on failure; only Product Owner/architecture resolution can unblock dependent work.
- **T015 — Canonical platform/MVP**: Must pass clean-checkout, public/Admin, readiness, migration, media-writeability, and secret-redaction criteria.
- **T022 — Production durability**: Must pass private-network, no-public-DB, lifecycle, missing-attachment, and persistence checks.
- **T028 — Recovery**: Must pass clean logical restore, media restore, integrity, and separate runtime-secret recovery criteria.
- **T030 — Canonical extension review**: Must find no second foundation or Product-scope expansion.
- **T031 — Full validation**: Must pass before final evidence handoff.

### Parallel Opportunities

- **T002 + T003** after T001: package initialization and repository/config hygiene own different files and use no shared runtime.
- **T004 + T005** after Phase 1: application configuration and development PostgreSQL controls own different files; neither consumes the other's unfinished artifacts.
- **T009 + T010**, then **T011 + T012**, after T008: Node readiness tests/public browser tests and their corresponding page/helper implementations are file-disjoint; each pair joins before T013.
- **T017 + T018** after T016: OCI image files and network/volume Quadlets are file-disjoint and share no mutable runtime during authoring; both join before container-unit completion.
- **T023 + T024** after T022: secret-recovery documentation and recovery verification scenario own different files and do not consume each other's outputs.
- No user-story phases run in parallel because each later story consumes evidence and boundaries established by the previous priority.

---

## Implementation Strategy

### MVP Boundary

The suggested MVP is **Phase 1 + Phase 2 + User Story 1 through T015**. This yields the canonical single Astro + EmDash platform, proves the selected database combination, and demonstrates clean-checkout startup, Admin/public availability, persistence boundaries, and private readiness without authorizing production lifecycle or recovery work early.

### Incremental Delivery

1. Complete Setup and pass T006 before accepting any downstream database-dependent implementation.
2. Complete US1 and obtain Codex PASS/REWORK at T015.
3. Add production Podman/Quadlet durability and obtain review at T022.
4. Add the logical database/media recovery boundary and obtain review at T028.
5. Complete the canonical-extension review at T030.
6. Run final validation and hand off the evidence index; do not begin implementation without the separate Human Gate authorization required by the Constitution.

## Scope Guardrails

- There is no `contracts/` task because Feature 001 introduces no Songhealth-owned external API, library, webhook, or CLI contract.
- No task may add Product collections, Homepage composition, editorial content, Search, migration, Dashboard/analytics, custom RBAC/workflow, separate backend/API, Domain/Application/Policy layers, repository/service wrappers, custom media/redirect/import frameworks, Redis, brokers, microservices, Kubernetes, Docker/Compose production, a monitoring stack, or a reverse-proxy product.
- The readiness helper in T012 is the only demonstrated Songhealth-specific extension. Any additional apparent native-capability gap must stop at review and be escalated; do not create an unapproved extension opportunistically.
- Physical backup, WAL archiving, PITR, replication, standby systems, RPO/RTO commitments, continuous backup orchestration, atomic cross-store backup, and a secret-management platform remain deferred.
- Use only disposable non-confidential database records, public-publishable validation media, and redacted evidence. Never place secret values in Git, tests, evidence, planning artifacts, or logs.

## Notes

- Every completed task must return its focused verification evidence for independent Codex PASS/REWORK before dependent tasks continue.
- `[P]` means file/resource independence only after the documented prerequisites are satisfied.
- Tests and operational verification precede or accompany the behavior they protect.
- Commit only the bounded implementation and permitted redacted evidence for the selected task; do not include later-task work because a file is already open.
- Stop on every blocking-gate failure and preserve the current authority boundary.
