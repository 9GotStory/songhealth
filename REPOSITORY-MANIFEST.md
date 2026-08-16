# Repository Assembly Manifest

> **Assembly date:** 15 สิงหาคม 2569
> **State:** Initial repository / Pre-Implementation Bootstrap

## Inputs

1. `website-modernization-docs-complete-v1.1-20260815.zip`
   - complete Product/System Source of Truth package
   - `10-system-blueprint.md` FROZEN v1.1

2. `spec-kit-control-suite-rechecked-final.zip`
   - AGENTS/CLAUDE controls plus Codex orchestrator guidance
   - PROJECT-STATUS template semantics
   - proposed Constitution bootstrap input
   - Delivery Context template
   - Spec Kit short prompts / adoption guidance

## Assembly decisions

- Product/System docs are placed under `docs/website-modernization-docs/` without changing their internal canonical structure.
- `AGENTS.md` and `CLAUDE.md` remain root runtime control files.
- Codex-only orchestration guidance is stored at `docs/operations/codex-orchestrator.md` and is explicitly routed from `AGENTS.md`; no separate root Codex-specific instruction file is used.
- the Control Suite README is preserved as `docs/operations/SPEC-KIT-CONTROL.md`.
- `PROJECT-STATUS.md` is updated only to reflect truthful repository-bootstrap state; no Delivery or feature is invented.
- no canonical Constitution is fabricated.
- no `.specify/feature.json` is fabricated.
- no application scaffold or infrastructure implementation is fabricated before an approved Delivery.


## Bootstrap Structure Recheck — 15 สิงหาคม 2569

- removed the separate root Codex-specific instruction file to avoid implying that it is a native Codex auto-discovery instruction file.
- preserved all Codex-specific orchestration content at `docs/operations/codex-orchestrator.md`.
- updated `AGENTS.md` to route Codex explicitly to that file.
- updated README, short prompts, Spec Kit control documentation, and manifest references.
- `CLAUDE.md` remains at repository root because it is the Claude Code-specific runtime instruction file.

### Development Documentation Tooling

- `.codex/config.toml` — project-scoped Codex MCP configuration for Context7.
- `.mcp.json` — project-scoped Claude Code MCP configuration for Context7.
- Context7 is a technical-reference layer only and is not project Source of Truth.