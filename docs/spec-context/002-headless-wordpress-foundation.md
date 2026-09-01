# Delivery Context — 002-headless-wordpress-foundation

> **State:** READY — HUMAN SELECTED / INDEPENDENT REVIEW PASS  
> **Implementation Authorization:** HUMAN AUTHORIZED — Delivery 002 Gate 07 / T057–T060 Final Cross-Cutting Verification; T001–T056 accepted/complete according to persisted Gate outcomes; unresolved T054 Production-specific Bangmod account facts remain `DEFERRED-EVIDENCE-GATE`
> Human-selected routing map. Do not treat this file as an active Spec Kit feature until the Context READY gate passes and the next Spec Kit phase is explicitly started.

## Identity

- **Selected Delivery:** Headless WordPress Foundation & Public Contract
- **Key:** `002-headless-wordpress-foundation`
- **Intent:** Establish the smallest clean WordPress + `songhealth-core` + React public-contract foundation required for later Product Deliveries.
- **Predecessor:** `001-application-foundation`, accepted through T050 and retained as historical evidence.

## Authoritative Sources

- `current/00-website-foundation.md` effective v1.1
- `current/01-information-architecture.md` v1.0
- `current/02-content-model.md` v1.1
- `current/03-sitemap.md` v1.0
- `current/05-admin-cms.md` effective v1.1
- `current/06-roles-permissions.md` v1.0
- `current/07-publishing-workflow.md` v1.0
- `current/08-search.md` v1.0
- `current/09-migration-plan.md` effective v1.1
- `current/10-system-blueprint.md` effective v1.2
- `.specify/memory/constitution.md` v1.0.0
- `docs/spec-reconciliation/001-to-headless-wordpress-reconciliation-2026-08-29.md`

For append-only amended documents, the final Canonical Freeze Binding defines effective status/version.

## Proposed In Scope

1. clean WordPress runtime/development baseline suitable for Bangmod/DirectAdmin;
2. `songhealth-core` bootstrap and ownership boundary;
3. minimum WordPress registration conventions needed for a safe foundation without premature Product behavior;
4. Songhealth public REST namespace/contract foundation with allowlisted output and public eligibility;
5. React public application consuming the Songhealth contract rather than Fastify/Kysely;
6. immutable Songhealth Public ID infrastructure;
7. containment of native WordPress public REST/routes so they cannot bypass Songhealth eligibility/canonical URLs;
8. bounded authenticated React Preview foundation if needed;
9. protected binary/current-eligibility delivery foundation sufficient to preserve Frozen security;
10. minimum configuration/secrets/health/diagnostic/dependency/security/test gates;
11. real Bangmod PHP/WordPress/database capability evidence before Production-specific version locks;
12. controlled `REMOVE-LATER` plan for superseded Delivery 001 runtime assets.

## Proposed Out of Scope

- importer implementation;
- Trial Migration / Production Import / Production Cutover;
- legacy WordPress retirement;
- Product content migration or finished domain modules;
- custom Admin React SPA;
- custom user store;
- broad deletion of Delivery 001 code before successor proof;
- dedicated search, Redis, broker, microservices, private object storage, production Docker/VPS without evidence.

## Gate

```text
Context state            READY
Human selection          PASS
Spec Kit specify         COMPLETE (Specify / Clarify / Plan / Tasks / Analyze)
T001–T056                ACCEPTED / COMPLETE ACCORDING TO PERSISTED GATE OUTCOMES
Gate 07 / T057–T060      HUMAN AUTHORIZED — FINAL CROSS-CUTTING VERIFICATION
T054 Bangmod facts       DEFERRED-EVIDENCE-GATE — PRODUCTION-SPECIFIC FACTS UNRESOLVED
T051+ from Delivery 001  NOT AUTHORIZED
Importer                 NOT AUTHORIZED
Migration / Import       NOT AUTHORIZED
Trial Migration          NOT AUTHORIZED
Production Cutover       NOT AUTHORIZED
Production deployment    NOT AUTHORIZED
Legacy retirement        NOT AUTHORIZED
Destructive deletion     NOT AUTHORIZED
Speculative infrastructure NOT AUTHORIZED
```
