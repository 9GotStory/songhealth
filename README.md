# สสอ.สอง Website — Initial Project Repository

Repository bootstrap package for the new website of สำนักงานสาธารณสุขอำเภอสอง.

## Current status

This repository is **ready for Pre-Implementation Bootstrap**, not yet for application coding.

The Product/System documentation is already established and frozen. The remaining gate is to initialize/reconcile Spec Kit on the real development machine, establish the canonical Constitution, select the first Delivery, and prepare its Delivery Context.

## Source of Truth

Canonical Product/System documents are under:

```text
docs/website-modernization-docs/
```

The active canonical set is:

```text
current/
├── 00-website-foundation.md
├── 01-information-architecture.md
├── 02-content-model.md
├── 03-sitemap.md
├── 04-homepage.md
├── 05-admin-cms.md
├── 06-roles-permissions.md
├── 07-publishing-workflow.md
├── 08-search.md
└── 10-system-blueprint.md   # FROZEN v1.1
```

`09-migration-plan.md` remains DEFERRED / NOT ACTIVE.

## Agent/runtime control

Repository control files are organized as:

- `AGENTS.md` — shared repository contract and Codex routing entry point
- `docs/operations/codex-orchestrator.md` — Codex PM/System Architect/Spec Kit Orchestrator/reviewer rules (routed from `AGENTS.md`)
- `CLAUDE.md` — Claude Code DEV Executor rules
- `PROJECT-STATUS.md` — workflow/gate mirror
- `SHORT-PROMPTS.md` — concise day-to-day Spec Kit control prompts
- `bootstrap/constitution.proposed.md` — proposed Constitution input only
- `docs/spec-context/_template.md` — per-Delivery routing template

There is intentionally no `QWEN.md`.

## Why there is no `src/`, `package.json`, database migration, or `infra/compose.yaml` yet

That is intentional.

Application scaffolding and executable infrastructure must come from an approved Delivery after:

```text
Constitution
→ Delivery Context READY
→ specify
→ clarify
→ plan
→ checklist/review
→ tasks
→ analyze CLEAN
→ authorized implementation
```

This prevents implementation choices from silently becoming requirements before Spec Kit has established the first Delivery.

## First bootstrap on the real development machine

From the repository root:

```text
1. initialize Git if this directory is not already a Git repository
2. verify `specify version`
3. verify `specify integration status`
4. confirm Codex + Claude Code integrations
5. inspect any pre-existing `SPECIFY_FEATURE_DIRECTORY`
6. run the Bootstrap/Resume prompt from `SHORT-PROMPTS.md`
7. reconcile `bootstrap/constitution.proposed.md` through `/speckit.constitution`
8. review/approve the resulting canonical Constitution
9. select the first approved Delivery in `PROJECT-STATUS.md`
10. create `docs/spec-context/<delivery-key>.md` from the template using targeted retrieval
11. mark Delivery Context `READY` only after Codex review
12. begin `/speckit.specify`
```

Do not start Claude implementation before a Task is explicitly authorized in `PROJECT-STATUS.md`.

## Environment architecture already accepted

Daily Development:

```text
Developer Host
├── Node.js / React / Vite
└── Podman
    └── MySQL-compatible CMS Database
        └── Named Volume
```

Production-like Verification:

```text
Podman
├── Nginx
├── production-built Node.js application
└── MySQL-compatible database
```

Production remains Bangmod Expert Hosting / Plesk-supported runtime. Local Podman/Nginx does not create a Production container requirement.
