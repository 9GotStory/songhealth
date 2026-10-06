# Songhealth

เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง — Clean Rebuild baseline.

## Current state

This repository intentionally contains **no active application implementation and no active feature specification**.

The previous React/Vite/Fastify/Headless WordPress implementation, its tests, infrastructure, Delivery specs, review evidence, and bootstrap artifacts have been removed from the active tree. Git history remains available when historical evidence is explicitly needed.

## Active Source of Truth

1. Product Owner decisions
2. `.specify/memory/constitution.md`
3. `docs/website-modernization-docs/current/00-website-foundation.md` through `09-migration-plan.md`
4. `docs/website-modernization-docs/current/10-system-blueprint.md`

The current architecture baseline is intentionally platform-native:

- Astro SSR
- EmDash
- TypeScript
- PostgreSQL
- persistent media storage

See `10-system-blueprint.md` for the authoritative technical baseline.

## Spec Kit

Spec Kit tooling is installed under `.specify/`, with Codex/Claude skill integrations under `.agents/` and `.claude/`.

There is currently **no active `specs/` feature**.

The next valid product-development step is to create a fresh Spec Kit feature from the current documentation baseline, beginning with a new `001-platform-foundation` specification.

Implementation remains unauthorized until the required Spec Kit phases and Product Owner gates are completed.

## Clean-rebuild rule

Do not reconstruct removed architecture from Git history, previous branch names, old task numbers, or prior implementation patterns unless historical evidence is explicitly required for migration or a documented impact review.

> Build the new Songhealth from the current requirements, not from the shape of the old system.
