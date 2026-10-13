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

## Development Workflow (Multica-first)

Product Owner decision of 2026-10-13 (Multica issue 9GOTSTORY-202). It aligns the development
workflow only; it changes no task deliverable, gate, architecture, or specification requirement.

- Development, testing, review, and pull-request preparation happen in Multica task runs under
  the Constitution's independent-review workflow (Codex reviews; the Product Owner accepts).
- The single development environment is the native workflow documented in `README.md` (native
  Node.js/npm tooling plus the rootless-Podman development PostgreSQL helper). Do not create or
  maintain a second development environment, containerized Node/npm tooling, or a Compose-style
  development stack.
- Development testing uses EmDash's native development-only bootstrap for programmatic
  Admin/API access (documented in `README.md` §7: `POST /_emdash/api/setup/dev-bypass`,
  development builds only). Never automate passkey login; production Admin authentication stays
  the native passkey flow.
- Production deployment remains rootless Podman + systemd Quadlet
  (`docs/operations/production-foundation.md`); development tooling must not grow into a
  parallel production-like stack.
- Every task run that starts a task-owned temporary container must clean it up before the run
  ends (stop the development database with `npm run dev-db:stop`; remove any ad-hoc container
  the task itself created). Cleanup stops or removes containers only: it never deletes named
  volumes, persistent data, accepted sources, or evidence. A task run that cannot clean up a
  container it owns reports that fact in its result instead of leaving it silently.
- The T022 and T028 runtime gates stay pending until separately authorized; no development
  workflow change may claim runtime acceptance that has not been produced.
