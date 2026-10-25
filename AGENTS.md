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

## Development Workflow (local CLI)

Product Owner decisions of 2026-10-13 (Multica issue 9GOTSTORY-202) and 2026-10-14
(governance reconciliation `01a13882-2e10-7cbf-b207-409fdd20b9b3`, accepted by approval
`01a13896-b7d9-700e-9ea6-00973f11d963`) established the Multica-first execution/review
assignments. The Product Owner ratified the local CLI governance transition on 2026-10-25
(official decision:
https://github.com/9GotStory/songhealth/pull/38#issuecomment-6395631601), replacing those
assignments with the local CLI workflow below; task deliverables, gates, architecture and
requirements remain. The matching Constitution amendment (3.0.0 → 4.0.0) is recorded in
`.specify/memory/constitution.md`. Bounded preparation or review expressly authorized by the
Product Owner remains distinct from standing authorization for future implementation.
Historical Multica decisions, existing Feature 002 acceptance and deferral records, Spec Kit
stages, Human Authorization Gates and runtime restrictions are unchanged:

- Claude Code CLI is the primary Developer, executing bounded authorized development, testing
  and pull-request preparation tasks; Codex CLI is the Independent Reviewer of the resulting
  artifacts and evidence. The author does not review their own artifact. The Product Owner
  provides final acceptance and explicit bounded implementation authorization. The Spec Kit
  stages and Human Authorization Gate are preserved.
- Spec Kit and GitHub remain authoritative; GitHub (`9GotStory/songhealth`) is the source of
  truth for source, issues, pull requests and CI. One authorized implementation task is in
  effect at a time; an authorization applies only to its named bounded scope.
- Historical Multica decisions, agent names, branch names and accepted Codex/ChatGPT
  source-review evidence retain their provenance; they do not assign future execution or
  Independent Review duties. Existing accepted evidence and Feature 001 dependency joins are
  not invalidated by this transition.
- The single development environment is the persistent rootless-Podman development runtime
  documented in `README.md`: on the single Fedora environment, account `multica-agent` (UID 1001),
  containers `songhealth-dev-app` (Astro/EmDash dev server on the pinned Node/npm tooling image)
  and `songhealth-dev-postgres` (PostgreSQL 18.6), dedicated persistent database/media volumes,
  stable source at `/home/multica-agent/projects/songhealth-dev`, and the Runtime Controller at
  `/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh` serving the development
  origin `http://127.0.0.1:4322/`. The Product Owner decision of 2026-10-16 (Multica issue
  9GOTSTORY-232) supersedes the earlier native-host development workflow as the canonical
  development instructions; it does not change native-only CMS/Product meaning. Do not create or
  maintain a second development environment or development stack. That runtime was created under
  the Multica workflow and remains a separate existing runtime whose ownership and access are
  pending explicit Product Owner review: local source development under
  `/home/thanakorn/dev/songhealth` does not migrate, replicate or inherit access to the runtime,
  its database, media volumes, Runtime Controller or credentials. The local CLI workspace
  (UID 1000) has no default permission to access, copy, expose or reuse those UID 1001
  credentials; the approved-loader PAT reuse permitted below for separately authorized tasks on
  the existing runtime grants no credential access to the local workspace.
- Programmatic Admin/API tests on the already-initialized shared application reuse
  its existing development-scoped PAT via the approved mode-0600 loader. EmDash's native
  development-only bootstrap (`POST /_emdash/api/setup/dev-bypass`) was an initial-setup
  action, not a recurring test setup operation; do not re-run it on the shared runtime.
  Never automate passkey login; production Admin authentication stays the native passkey flow.
- Production deployment remains rootless Podman + systemd Quadlet
  (`docs/operations/production-foundation.md`); development tooling must not grow into a
  parallel production-like stack.
- The shared persistent runtime survives Multica issues, agent sessions and workflow
  transitions. Task cleanup covers
  task-owned temporary resources only: remove ad-hoc containers the task itself created,
  owned synthetic fixtures/media, and private credential scratch. Cleanup must never stop or
  remove the shared `songhealth-dev-app`/`songhealth-dev-postgres` containers, and never
  deletes named volumes, persistent data, accepted sources, or evidence. A task run that cannot
  clean up a resource it owns reports that fact in its result instead of leaving it silently.
- Runtime Controller operations are authorization-gated by its recorded activation; routine
  documentation describes only `status` and `verify`. Startup, shutdown, restart, build or
  persistence tests, promotion, bootstrap and recovery are not standing operations and require
  their own explicit review and Product Owner authorization; the controller CLI has no general
  `exec` operation. Advancing the stable runtime source to a new SHA likewise requires
  separately reviewed and Product Owner-authorized promotion/maintenance: never bypass the
  controller's clean/detached/source-SHA protection, overwrite the stable source, edit
  controller approval/state records, or perform automatic checkout/rebase/restart.
- The T022 and T028 runtime gates stay pending until separately authorized; no development
  workflow change may claim runtime acceptance that has not been produced.

## Single Persistent Development Runtime — Mandatory Design and Test Gate

Product Owner clarification (2026-10-19): **one development application/server, one
PostgreSQL database, one media store, and one test target**. This is a repository-wide
design constraint, not merely a port convention.

- Task workspaces (Multica issues historically; local CLI task branches) may contain separate
  source checkouts for isolated authoring and static checks. They MUST NOT start a second
  Astro/EmDash server, a parallel development
  stack, or an alternate database/media store for functional/integration verification.
  All authorized runtime tests target the **existing** shared development application
  at `http://127.0.0.1:4322` with its existing PostgreSQL and media volumes.
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
- A dev-only integration not yet installed on the persistent source/server is
  **NOT READY**: identify the source/config lifecycle prerequisite and STOP. Source
  advancement, integration registration, and any app restart require their own exact
  SHA/config review, controller-supported procedure, and explicit Product Owner
  authorization; editing the controller's private state/configuration or bypassing
  its guards is never an alternative. No standing authorization is created here.
- A task must verify both the repository candidate SHA and the stable runtime source
  SHA before interpreting runtime results. A committed test or merged PR does not
  implicitly update the persistent application; version mismatch and missing
  test-integration prerequisites are BLOCKED/UNVERIFIED, never PASS.
- Tests and agents may use the existing scoped development credential via the
  approved mode-0600 PAT loader. Do not rerun `setup/dev-bypass` on an initialized
  shared runtime, rotate existing credentials, expose tokens, or impersonate native
  roles. Require distinct test-owned native accounts for role/lock tests; absent
  prerequisites are reported rather than silently skipped as success.
- This rule applies to planning, Spec Kit Tasks, source implementation, runtime
  testing, cleanup, and handoff. If an accepted task describes a competing-server
  harness, reconcile its execution contract **before implementation** under review
  and Product Owner approval; do not implement the conflicting runner and defer
  its failure until a later integration task.
