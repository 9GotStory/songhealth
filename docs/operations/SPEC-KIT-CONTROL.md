# Spec Kit Control Suite — สสอ.สอง Website

A small control layer for using Spec Kit with **Codex as orchestrator/reviewer** and **Claude Code as DEV Executor**. Qwen is only the model/API backend inside Claude Code.

Validated against Spec Kit v0.16.4 behavior as of 2026-08-15. Before adoption—and after Spec Kit upgrades—run `specify version` and `specify integration status` in the real repository.

## Files

- `AGENTS.md` — shared repository contract.
- `docs/operations/codex-orchestrator.md` — Codex-only orchestration/review rules; `AGENTS.md` routes Codex here.
- `CLAUDE.md` — Claude Code implementation rules.
- `bootstrap/constitution.proposed.md` — proposed Constitution input for reconciliation; **not** a canonical repository Constitution until approved and applied through Spec Kit.
- `PROJECT-STATUS.md` — planned Delivery, workflow gate, and authorized implementation scope.
- `docs/spec-context/_template.md` — per-Delivery targeted-retrieval routing template.
- `SHORT-PROMPTS.md` — day-to-day commands.

There is **no `QWEN.md`** and no separate Qwen workflow role.

## Model

```text
Codex
  ├─ prepare per-Delivery Context routing
  ├─ Spec Kit design/orchestration
  ├─ task authorization
  └─ independent review
          ↓
Claude Code
  ├─ scoped speckit implement
  ├─ code changes
  └─ tests/verification
     (Qwen backend)
          ↓
Codex review → next task / converge
```

## Active feature

Before the first `specify`, `PROJECT-STATUS.md` selects the planned Delivery Context.

After `specify`, resolve the active feature using Spec Kit's runtime rules: `SPECIFY_FEATURE_DIRECTORY` when explicitly set, otherwise `.specify/feature.json`. `PROJECT-STATUS.md` only mirrors the resolved feature for workflow coordination. A pre-existing `SPECIFY_FEATURE_DIRECTORY` that conflicts with the planned Delivery is a blocker; do not silently change it.

## Delivery Context

Each Delivery has a small routing map:

```text
docs/spec-context/<delivery-key>.md
```

Codex creates or reconciles this map **before `/speckit.specify` for every new Delivery**. It discovers candidate authority by searching stable requirement/decision IDs and headings, then reads only bounded relevant sections. The map points each phase to precise Source-of-Truth pointers without copying requirements. This is what lets the same short prompts work across different features without loading every long document.

## Per-Delivery control flow

```text
approved Delivery
      ↓
prepare/reconcile Delivery Context
      ↓
specify → clarify → plan → checklist/review → tasks → analyze
      ↓
scoped implement ↔ Codex review
      ↓
converge → Product Owner acceptance
```

The Constitution is project-wide: establish it once and amend it only when durable principles change.

## Checklist gate

`/speckit.checklist` generates reviewer-owned requirements-quality checks. Codex must review them before Tasks and mark `[x]` only when each criterion is actually satisfied. Real gaps loop back to Specify/Clarify.

## One-task implementation

Spec Kit officially supports scoped/staged `implement` runs with prompt arguments. This project applies a stricter project policy: each run is limited to the task (or explicitly approved small batch) authorized in `PROJECT-STATUS.md`, after checking it is still incomplete and dependency-ready, then returns to Codex for independent review.

## Integrations

Codex and Claude are multi-install-safe Spec Kit integrations. If both are installed, do **not** change the default integration on every task just to move between agents; each keeps its own core command/skill directory.

The default integration matters for shared templates, extensions, and presets. If the project relies on an extension/preset override from the non-default agent, verify that the override is registered for that integration; use `specify integration status` and switch deliberately only when required.

## Agent-context extension

Spec Kit's `agent-context` extension is opt-in. This suite keeps root `AGENTS.md` / `CLAUDE.md` plus `docs/operations/codex-orchestrator.md` stable, with feature context under `docs/spec-context/`.

Do not enable automatic feature-context injection into these root files by default. If the repository already uses the extension, reconcile or retarget it before adopting this suite.

## Constitution

The included `bootstrap/constitution.proposed.md` remains `1.0.0-proposed`. It is input for reconciliation only. Do not copy it over `.specify/memory/constitution.md`; use `/speckit.constitution` after Product Owner approval so Spec Kit owns the canonical update.

## Adoption

1. Check `specify version` and `specify integration status`.
2. Reconcile existing `AGENTS.md`, `CLAUDE.md`, and `.specify/memory/constitution.md` instead of overwriting blindly.
3. Confirm Codex and Claude integrations needed by the repository are installed.
4. Reconcile/disable any root-file agent-context injection that conflicts with this suite.
5. Run the Bootstrap/Resume prompt in Codex to reconcile repository state and select the approved planned Delivery.
6. If the canonical Constitution is missing or approved durable principles changed, run the **Constitution** prompt and review the result before continuing.
7. Run the **Prepare Delivery Context** prompt; Codex creates/reconciles the first real routing map from `_template.md`.
8. Continue with `Specify` only after `PROJECT-STATUS.md` marks the Delivery Context `READY`.
