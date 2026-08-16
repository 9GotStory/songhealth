# Pre-Implementation Gate

> **State:** OPEN — repository assembled, runtime bootstrap pending

Implementation may begin only when every required gate below is PASS.


## Agent Instruction Routing

- [ ] `AGENTS.md` exists at repository root.
- [ ] `CLAUDE.md` exists at repository root.
- [ ] `docs/operations/codex-orchestrator.md` exists and is routed from `AGENTS.md`.
- [ ] no separate root Codex-specific instruction file is present.
- [ ] no `QWEN.md` is present.

## A. Repository baseline

- [x] Frozen Product/IA documents `00–08` present
- [x] System Blueprint `10` present as FROZEN v1.1
- [x] Project Index / Changelog / reviews / archive present
- [x] Codex / Claude / shared agent controls present
- [x] Delivery Context template present
- [x] Proposed Constitution present as bootstrap input only

## B. Target-machine Spec Kit runtime

- [ ] `specify version` verified
- [ ] `specify integration status` verified
- [ ] Codex integration verified
- [ ] Claude Code integration verified
- [ ] default-sensitive extensions/presets reviewed if present
- [ ] `SPECIFY_FEATURE_DIRECTORY` checked for stale/conflicting override

## C. Constitution

- [ ] proposed Constitution reconciled against the real repository
- [ ] `/speckit.constitution` completed
- [ ] canonical `.specify/memory/constitution.md` reviewed and approved

## D. First Delivery

- [ ] Product Owner selects/approves first Delivery
- [ ] `PROJECT-STATUS.md` updated with Delivery key
- [ ] `docs/spec-context/<delivery-key>.md` created/reconciled
- [ ] Delivery Context state = `READY`

## E. Spec Kit feature gates

- [ ] `specify` complete
- [ ] `clarify` complete
- [ ] `plan` complete
- [ ] requirements checklist reviewed
- [ ] `tasks` complete
- [ ] `analyze` clean

## F. Implementation authorization

- [ ] next incomplete dependency-ready Task selected
- [ ] Task explicitly authorized in `PROJECT-STATUS.md`
- [ ] Claude Code handoff has exact scope/references/verification

Only after A–F pass may application implementation begin.
