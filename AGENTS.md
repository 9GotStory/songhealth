# AGENTS.md — Songhealth Repository Contract

## Authority

Use this order:

1. Product Owner decisions
2. `.specify/memory/constitution.md`
3. `docs/website-modernization-docs/current/00–09` for Product/behavior truth
4. `docs/website-modernization-docs/current/10-system-blueprint.md` for current technical architecture
5. active Spec Kit feature artifacts, when one exists
6. implementation code/tests as evidence only

A downstream artifact MUST NOT silently override an upstream authority.

## Clean Rebuild

The repository has been reset to the current Songhealth baseline.

- Do not infer requirements from removed implementation, old Delivery numbers, old branches, or Git history.
- Do not recreate superseded architecture from historical evidence.
- Use Git history only when the task explicitly requires migration provenance, forensic comparison, or historical evidence.
- Prefer approved platform-native capability before custom infrastructure.
- Custom abstractions/extensions require a demonstrated current gap.

## Spec Kit Usage

This repository does not vendor agent-specific Spec Kit skill bundles. Use the current upstream `github/spec-kit` process/instructions through the AI agent selected for the task. Local `.specify/` files are project state/templates, not a replacement for checking current upstream Spec Kit behavior when version-sensitive workflow details matter.

Do not recreate `.agents/skills` or `.claude/skills` as committed project content unless the Product Owner explicitly changes this repository policy.

## Context Discipline

Read only the minimum current authority needed for the task.

For a new feature:
1. identify the owning sections in `current/`;
2. read the Constitution;
3. create/use the active Spec Kit feature;
4. preserve the Product/architecture boundary;
5. stop at the requested Spec Kit phase.

## External Documentation and Context7

For current or version-sensitive behavior of frameworks, libraries, SDKs, APIs, and
developer tooling, agents MUST verify the relevant documentation instead of relying on
model memory.

Use the configured Context7 MCP as the first documentation source when it supports the
relevant technology.

- Resolve documentation for the actual library/tool and version relevant to the approved
  architecture, plan, manifest, or lockfile.
- Use Context7 to verify capabilities, supported APIs, configuration, compatibility, and
  current usage patterns before introducing custom code or making version-sensitive
  technical decisions.
- If Context7 does not cover the technology, is incomplete, or cannot establish the
  required fact, use authoritative first-party upstream documentation or package metadata.
- Do not treat Context7 or external documentation as Product authority. External sources
  explain what a technology can do; Product Owner decisions, the Constitution, current
  documents, and approved feature artifacts determine what Songhealth must do.
- When a planning or implementation decision materially depends on version-specific
  external behavior, record the verified conclusion and relevant version/source in the
  appropriate research, plan, or implementation evidence.
- If verified upstream behavior conflicts with an approved assumption, do not silently
  work around it. Surface the conflict for review at the current gate.

## Implementation Gate

There is no standing implementation authorization.

Implementation may begin only when an active feature has approved `spec.md`, `plan.md`, `tasks.md`, dependencies are ready, and the Product Owner has explicitly authorized the bounded scope.

Do not create application code, infrastructure, schema, or dependencies merely because the repository is currently empty.

## Development Workflow (Claude Code, Constitution 5.0.0)

Product Owner decisions of 2026-10-13 (Multica issue 9GOTSTORY-202) and 2026-10-14
(governance reconciliation `01a13882-2e10-7cbf-b207-409fdd20b9b3`, accepted by approval
`01a13896-b7d9-700e-9ea6-00973f11d963`) established the Multica-first execution/review
assignments. The Product Owner's 2026-10-25 ratification (official decision:
https://github.com/9GotStory/songhealth/pull/38#issuecomment-6395631601) replaced them with the
local CLI workflow of Constitution 4.0.0 (Claude Code CLI as Developer, Codex CLI as Independent
Reviewer). The Product Owner's governance reform recorded as Constitution 5.0.0 (see its amendment
record in `.specify/memory/constitution.md`) replaces that review arrangement with one workflow:

**Product Owner → Claude Code + Spec Kit → automated tests / GitHub CI → Product Owner acceptance**

Bounded preparation or review expressly authorized by the Product Owner remains distinct from
standing authorization for future implementation. Task deliverables and requirements, existing
Feature 002 acceptance and deferral records, Spec Kit stages, Human Authorization Gates,
architecture, security requirements and runtime restrictions are unchanged:

- Claude Code is the sole AI development tool. Within an authorized scope it clarifies
  requirements, plans, prepares Spec Kit artifacts, implements, writes and runs automated tests,
  debugs and corrects, self-reviews (including security-focused inspection), refactors where
  necessary, prepares acceptance evidence and reports unresolved risks to the Product Owner. It
  may use separate sessions or subagents when technically useful; that remains self-review and is
  never presented as independent third-party review. Codex and ChatGPT are removed from this
  workflow: no Codex, ChatGPT or other external AI tool develops, reviews, assesses or approves
  Songhealth work.
- Until Feature 002 is complete, development uses Claude Code with Spec Kit and GitHub only.
  After Feature 002 the Product Owner intends to move to Claude Code with the "Matt skills"
  workflow; that change takes effect only through its own Constitution amendment.
- Inside an authorized bounded task, Claude Code fixes defects, improves tests, corrects or
  refactors the implementation, re-runs tests and repeats self-review without a new approval for
  each correction, and does not start new documentation-correction cycles, approval gates or
  verification frameworks. It stops for a new Product Owner decision before new source scope, an
  architectural change, a destructive or sensitive operation, a runtime action not yet authorized,
  or an exception to a security or other mandatory requirement.
- Completion is evidence-based: approved requirements, a correct implementation, passing
  applicable automated tests, security verification proportionate to the risk, GitHub CI results
  where CI is configured, required runtime evidence, and Product Owner acceptance. A Claude Code
  PASS never accepts work by itself; failed required tests, known material security defects and
  unresolved mandatory runtime checks block acceptance.
- The Product Owner alone approves new features and material scope changes, architecture and
  governance changes, destructive or sensitive operations, production deployment and runtime
  provisioning, Git merges, final feature acceptance, and documented exceptions.
- Spec Kit remains the specification and task framework, and GitHub (`9GotStory/songhealth`)
  the source of truth for source, issues, pull requests, CI and decision history. One authorized
  implementation task is in effect at a time; an authorization applies only to its named bounded
  scope.
- Historical Multica decisions, agent names, branch names, and accepted Codex/ChatGPT reviews,
  verdicts and evidence retain their provenance and are not rewritten; they assign no future
  execution or review duties. Where an artifact written before 5.0.0 asks for a Codex, ChatGPT,
  Lead or other external Independent Review step (or Multica execution) for work that is still
  open, the evidence-based completion above satisfies it. Findings from those reviews that are
  still open remain open defects until corrected and verified. Existing accepted evidence and
  Feature 001 dependency joins are not invalidated.
- The single development environment is the UID-1000 rootless Podman + systemd Quadlet
  development runtime (Product Owner decision 2026-10-28; Feature 002 T036; contract in
  `docs/operations/development-quadlet.md`): user units from `deploy/dev-quadlet/`, containers
  `songhealth-qdev-app` (Astro/EmDash dev server on the digest-pinned Node 24.21.0 production
  build base) and `songhealth-qdev-db` (PostgreSQL 18.6, no host port), volumes
  `songhealth-qdev-db-data`/`songhealth-qdev-media`, the runtime source checkout
  `~/dev/songhealth-quadlet` at a detached promoted commit, and the development origin
  `http://127.0.0.1:4324/`. Do not create or maintain any other development environment or
  development stack.
- The earlier UID-1001 (`multica-agent`) runtime at `127.0.0.1:4322` is retired as a development
  and test target and left untouched — not used, stopped, migrated, copied or deleted — until a
  separate Product Owner deletion decision. Its credentials stay inaccessible to the local
  workspace, and nothing is taken from it.
- Programmatic Admin/API tests use the runtime's own development PAT
  (`~/.local/state/songhealth-qdev/dev-pat`, mode 0600), minted once by EmDash's native
  development-only bootstrap (`POST /_emdash/api/setup/dev-bypass`) during installation. That
  bootstrap is an initial-setup action, not a recurring test setup operation; do not re-run it on
  an initialized runtime. Never print, commit or copy the PAT into evidence. Never automate
  passkey login; production Admin authentication stays the native passkey flow.
- Production deployment remains rootless Podman + systemd Quadlet
  (`docs/operations/production-foundation.md`); development tooling must not grow into a
  parallel production-like stack.
- The runtime persists across tasks and sessions. Task cleanup covers task-owned temporary
  resources only: remove ad-hoc containers the task itself created, owned synthetic
  fixtures/media, and private credential scratch. Cleanup must never stop or remove the runtime's
  containers, and never deletes its volumes, persistent data, accepted sources, or evidence. A
  task run that cannot clean up a resource it owns reports that fact in its result instead of
  leaving it silently.
- Source reaches the runtime only through `scripts/dev-runtime-update.sh --sha <commit>`
  (backup first, clean detached commit); never edit the runtime checkout in place or bypass the
  entrypoint's promoted-commit and store-marker checks. Installing or updating the runtime and
  destructive operations (`uninstall --purge`, restore) remain Product Owner-authorized actions.
- The T022 and T028 runtime gates stay pending until separately authorized; no development
  workflow change may claim runtime acceptance that has not been produced.

### Development runtime history

The UID-1000 Quadlet sources were accepted as source-only Phase 1 (`cd390b0`, PO gate 6410811185)
and Phase 2A (`5d31acc`); Feature 002 T036 replaced the Phase 2B staged-installer design with the
converging installer and designated the runtime as the single development runtime (Product Owner
decision 2026-10-28). T037 (Product Owner decision 2026-10-29) moved the T021 public-read
coordinator to this runtime:
- the runtime's committed development configuration
  (`deploy/dev-quadlet/astro.dev.config.mjs`) installs the dev-only fixture route;
- the installer provisions its route token;
- the coordinator observes the runtime source through `dev-runtime-verify.sh`;
- ordinary suites read the PAT through `SONGHEALTH_DEV_ACCESS` (commands in
  `docs/operations/development-quadlet.md`).

## Single Persistent Development Runtime — Mandatory Design and Test Gate

Product Owner clarification (2026-10-19): **one development application/server, one
PostgreSQL database, one media store, and one test target**. This is a repository-wide
design constraint, not merely a port convention.

- Task workspaces (Multica issues historically; local CLI task branches) may contain separate
  source checkouts for isolated authoring and static checks. They MUST NOT start a second
  Astro/EmDash server, a parallel development
  stack, or an alternate database/media store for functional/integration verification.
  All authorized runtime tests target the single development application at
  `http://127.0.0.1:4324` with its PostgreSQL and media volumes.
- Never resolve a test-port collision by killing/restarting the shared app, switching
  ports, using another host/process as a substitute, or claiming a separate server is
  the accepted runtime. An occupied shared origin is its intended state, not permission
  to free it.
- Tests requiring server-rendered Astro/EmDash context (including native public-query
  and signed-preview checks) MUST use a separately reviewed **development-only test
  integration on the existing server**. A test runner must not call Astro `dev()`,
  `npm run dev`, or another startup path to introduce a second server. Verify the
  test-only route's native request-context support, access boundary, and exclusion
  from normal/production builds; never place a test route in production `src/pages/`
  or register a test integration in canonical production configuration.
- A dev-only integration not yet installed on the runtime source/server is
  **NOT READY**: identify the source/config lifecycle prerequisite and STOP. Source
  advancement and integration registration go through `scripts/dev-runtime-update.sh`
  with an exact commit and explicit Product Owner authorization; editing the runtime
  checkout in place or bypassing its guards is never an alternative. No standing
  authorization is created here.
- A task must verify both the repository candidate SHA and the runtime source SHA
  (`scripts/dev-runtime-verify.sh` reports it) before interpreting runtime results. A committed test or merged PR does not
  implicitly update the persistent application; version mismatch and missing
  test-integration prerequisites are BLOCKED/UNVERIFIED, never PASS.
- Tests and agents may use the runtime's development PAT
  (`~/.local/state/songhealth-qdev/dev-pat`, mode 0600). Do not rerun `setup/dev-bypass`
  on an initialized runtime, rotate existing credentials, expose tokens, or impersonate
  native roles. Require distinct test-owned native accounts for role/lock tests; absent
  prerequisites are reported rather than silently skipped as success.
- This rule applies to planning, Spec Kit Tasks, source implementation, runtime
  testing, cleanup, and handoff. If an accepted task describes a competing-server
  harness, reconcile its execution contract **before implementation** under review
  and Product Owner approval; do not implement the conflicting runner and defer
  its failure until a later integration task.
