# Spec Kit Reconciliation — Delivery 001 → Headless WordPress Successor

> **Date:** 29 สิงหาคม 2569  
> **Canonical Architecture Head:** `2677e783d782c4ffd28d4d4fa6a0be2bf0cb3a30`  
> **Delivery 001 accepted boundary:** T050  
> **T051+:** NOT AUTHORIZED / DO NOT CONTINUE  
> **Successor Delivery:** `002-headless-wordpress-foundation` — PROPOSAL ONLY / NOT SELECTED  
> **Implementation Authorization:** NONE

## Decision

Delivery `001-application-foundation` remains accepted historical evidence through T050. It is not
rewritten into WordPress, and T051+ must not resume because 001 was specified/planned against the
superseded Node.js/Fastify/Kysely/custom-Admin runtime.

Future implementation follows the Frozen architecture:

```text
React Public Website
        │
Songhealth Public REST Contract
        │
songhealth-core WordPress Plugin
        │
WordPress Core
        │
WordPress Database + Media Library
```

## Historical Spec Kit Classification

```text
spec.md        KEEP — HISTORICAL
plan.md        KEEP — HISTORICAL / SUPERSEDED FOR FUTURE IMPLEMENTATION
research.md    KEEP — HISTORICAL / RE-EVALUATE PLATFORM-SPECIFIC DECISIONS
data-model.md  KEEP — HISTORICAL / REUSE ONLY GENERIC INVARIANTS
quickstart.md  KEEP — HISTORICAL
contracts/     KEEP — HISTORICAL / REUSE SECURITY & DIAGNOSTIC INVARIANTS SELECTIVELY
tasks.md       KEEP — HISTORICAL; T051+ MUST NOT BE RESUMED
checklists/    KEEP — HISTORICAL
```

Do not retroactively mark unfinished tasks complete or convert old task text into WordPress tasks.

## Repository Asset Classification

| Asset / area | Classification | Successor treatment |
|---|---|---|
| Git history through T050 | KEEP | Preserve exactly as accepted governance/evidence. |
| Constitution | KEEP | Remains authoritative unless separately amended. |
| `apps/web` React public layer | REUSE SELECTIVELY | React/Vite/public UX remain useful; rebind to Songhealth REST. |
| `apps/web/server.ts` Fastify release composition | SUPERSEDED / REMOVE-LATER | Do not extend. |
| `apps/admin` custom React Admin | SUPERSEDED / REMOVE-LATER | `wp-admin` + `songhealth-core` is baseline. |
| `apps/server` Fastify/Kysely runtime | SUPERSEDED / REMOVE-LATER | Do not extend. Reuse generic security ideas only. |
| Kysely foundation migration/marker | SUPERSEDED | Not target CMS persistence. |
| Node release `Containerfile` | SUPERSEDED / REMOVE-LATER | Production Docker is not baseline. |
| Node verification Compose/Nginx | SUPERSEDED / RE-EVALUATE | Do not treat as successor architecture. |
| `foundation-operations.mjs` | KEEP AS HISTORY / REMOVE-LATER | Do not implement T051+. |
| old verification tests | REUSE SELECTIVELY | Preserve fail-closed, nondisclosure, idempotency patterns; rewrite runtime-specific expectations. |
| safe diagnostic / nondisclosure rules | REUSE AS INVARIANT | Platform-independent security value remains. |
| dependency vulnerability policy | REUSE AS GOVERNANCE | Apply to PHP/WordPress/plugin and Node frontend graphs as applicable. |
| ASVS evidence approach | REUSE SELECTIVELY | Re-scope to WordPress/PHP/React/auth/media. |
| root npm/Vite/TypeScript | REUSE SELECTIVELY | Keep only what React public build still requires. |
| old `.env.*` contracts | SUPERSEDED / RE-EVALUATE | Successor environment contract must come from actual needs. |
| `package.json` / lock graph | REUSE SELECTIVELY | Prune only through successor tasks. |
| README runtime instructions | RECONCILE LATER | Update after successor runtime is approved/implemented. |

## Removal Policy

`REMOVE-LATER` is not deletion authorization. Removal requires an explicitly authorized successor
task after replacement is implemented and independently verified.

## Proposed Successor

```text
002-headless-wordpress-foundation
```

Proposed intent: establish the smallest clean WordPress + `songhealth-core` + React public-contract
foundation for later Product Deliveries, without activating legacy migration.

## Gate

```text
001 historical acceptance   T050 ACCEPTED
001 T051+                    RETIRED / NOT AUTHORIZED
002                          PROPOSAL ONLY / NOT SELECTED
002 Context                  DRAFT
Spec Kit specify             NOT AUTHORIZED
Implementation               NOT AUTHORIZED
Importer                     NOT AUTHORIZED
Trial Migration              NOT AUTHORIZED
Production Cutover           NOT AUTHORIZED
```
