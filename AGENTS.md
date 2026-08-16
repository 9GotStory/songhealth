# AGENTS.md — Shared Repository Contract

## Purpose

Repository-wide instructions that are safe for every project agent. Keep this file stable and free of feature-specific requirements.

## Runtime roles

- **Codex:** orchestration, architecture, review, and acceptance gate. Before Codex-only orchestration work, read `docs/operations/codex-orchestrator.md`.
- **Claude Code:** implementation executor. Its runtime instructions are in `CLAUDE.md`.
- **Qwen:** model/API backend used by Claude Code; it is not a project agent and has no repository instruction file.

## Authority by scope

- **Product Owner:** final authority for business requirements, scope, product decisions, and acceptance.
- **`.specify/memory/constitution.md`:** approved durable project-wide engineering principles. If it does not yet exist, use the approved bootstrap baseline only as input to `/speckit.constitution`; do not treat the proposed baseline as authoritative.
- **Approved Source-of-Truth documents:** product, architecture, domain, security/privacy, and operational decisions.
- **Active feature artifacts:** `spec.md` → `plan.md` → `tasks.md` within their respective scopes.
- **Routing/status files:** pointers only; they never redefine authoritative content.
- **Code/tests:** implementation evidence, not a source for silently changing requirements.

If authoritative sources materially conflict, stop and report the conflict instead of guessing.

## Context discipline

Use minimum sufficient context:

1. Resolve the current Delivery/feature.
2. Read its routing map under `docs/spec-context/`. If the map is missing or mismatched, non-orchestrator agents stop; Codex follows the Delivery Context preparation rule in `docs/operations/codex-orchestrator.md`.
3. Locate required `REQ-*`, `DEC-*`, or headings with repository search (`rg`/equivalent) before opening long documents.
4. Read a bounded section around each relevant pointer; widen only when the local context is insufficient.
5. Read only the feature artifacts needed for the current phase/task.
6. Expand further only for a concrete ambiguity, conflict, dependency, or implementation blocker.

Do not read whole long Source-of-Truth documents by default, and do not copy their content into agent, routing, or status files.

## Active feature

Before first `specify`, `PROJECT-STATUS.md` points to the planned Delivery Context.

After `specify`, resolve the active feature using Spec Kit's own resolution rules: `SPECIFY_FEATURE_DIRECTORY` when explicitly set, otherwise `.specify/feature.json`. `PROJECT-STATUS.md` may mirror the resolved feature but must never override runtime state. Do not set or change `SPECIFY_FEATURE_DIRECTORY` merely to make status files agree.

## Scope discipline

- Work on one approved Delivery/Feature at a time.
- Prefer the smallest correct change.
- Do not invent requirements or future scope.
- Do not perform unrelated refactors.
- Security/privacy-sensitive changes must trace to approved requirements or decisions.

## Stable instruction files

Keep `AGENTS.md`, `CLAUDE.md`, and `docs/operations/codex-orchestrator.md` stable across features, not immutable. Update them only for durable recurring guidance; feature-specific plan/context injection belongs outside these durable instructions unless explicitly adopted by the project.
