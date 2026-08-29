# Implementation Plan: Headless WordPress Foundation & Public Contract

**Branch**: `002-headless-wordpress-foundation` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-headless-wordpress-foundation/spec.md`

## Summary

Establish the smallest clean successor: WordPress Core provides CMS, identity, editor, database, and
media primitives; a first-party `songhealth-core` plugin registers only Basic Page and Document
Resource foundation shells and owns immutable Public IDs, eligibility, authorization, protected-file
delivery, Preview, and Songhealth REST projections; React consumes only that REST contract. Native
WordPress public surfaces are contained, Songhealth search remains deferred, and Production locks
remain gated on evidence from the actual Songhealth Bangmod account.

## Technical Context

**Language/Version**: PHP on a WordPress-supported runtime (current official recommendation PHP 8.3+;
exact Production PHP evidence-gated), current supported WordPress at implementation time, and the
repository's existing TypeScript/React/Vite frontend toolchain

**Primary Dependencies**: WordPress Core REST, post-type, metadata, capability, authentication,
nonce, media, and test primitives; first-party `songhealth-core`; existing React/Vite packages. No
additional WordPress plugin or backend service is selected.

**Storage**: WordPress database and Media Library primitives. Public IDs use a tiny plugin-owned
identity registry table with unique Public ID and one-to-one resource keys; other bounded fields use
registered post metadata. Protected bytes use a WordPress-
managed protected location with no direct anonymous URL and `songhealth-core` mediated delivery.

**Testing**: WordPress/PHP unit and REST integration tests, frontend unit/contract tests in the
existing runner, and browser E2E checks for canonical routes, Preview, containment, and revocation;
dependency/security review covers WordPress/PHP/plugin and npm/frontend graphs

**Target Platform**: Reproducible local WordPress/PHP/MySQL-compatible verification; Production
baseline Bangmod Expert Hosting/DirectAdmin with HTTPS. Public Bangmod docs describe MySQL 8.4 and
per-domain PHP selection, but actual account versions/modules/filesystem/cron/deployment capabilities
are not proven.

**Project Type**: Headless web application: WordPress CMS/plugin backend plus React public frontend

**Performance Goals**: Bounded list work is proportional to capped page size; detail, listing,
Preview, and download avoid unbounded scans and N+1 projections. No numeric target is invented;
representative response evidence is recorded and tuning follows measured need.

**Constraints**: Default deny; current server-side eligibility on every anonymous disclosure;
neutral nondisclosure; no ineligible count/pagination leakage; nonce is not authorization; Preview is
authenticated/authorized/`no-store`/`noindex`; protected bytes have no bypassable public path; safe
config/diagnostics; no importer/cutover, Production Docker/VPS, Redis, queue, microservice, search
engine, or private object store baseline

**Scale/Scope**: Two foundation types, public detail and bounded listing, one bounded Preview
interface, protected download, and minimum React routes. Finished domain workflows/fields and
Songhealth public search are excluded.

## Constitution Check

*GATE: passed before Phase 0 and re-checked after Phase 1.*

| Principle / gate | Evaluation before design |
| --- | --- |
| I. Security First | PASS — current eligibility, server authorization, neutral denial, protected delivery, Preview isolation, safe errors, and security verification are explicit. |
| II. Simple — Structured — Sustainable | PASS — Core supplies commodity mechanics and one bounded first-party plugin owns only Songhealth semantics; no speculative service exists. |
| III. Requirement-Driven Architecture | PASS — choices trace to FR-001–FR-030 and effective Frozen amendments without changing Product semantics. |
| IV. Privacy/Data Minimization | PASS — outputs are allowlisted; CMS identities, internal IDs, protected state, and confidential content are excluded. |
| V. Quality/Verification | PASS — contract, authorization, containment, Preview, lifecycle, configuration, and E2E evidence is planned. |
| VI. Operational Sustainability | PASS — shared hosting is preserved and account-specific locks wait for direct evidence. |
| Phase gate | PASS — Context, Specify, and Clarify are complete with independent PASS; this run stops after Plan Phase 1. |

No violation or exception is required.

### Post-design re-check

PASS. The Phase 0/1 artifacts preserve these boundaries, add no second identity authority, raw
WordPress public projection, speculative dependency, or future Delivery scope, and tie security
mechanisms to FR-004–FR-024 with verification. Production PHP/account capabilities remain an
operational evidence gate, not an unresolved Product/design clarification. All Technical Context
questions are settled at the appropriate evidence level.

## Project Structure

### Documentation (this feature)

```text
specs/002-headless-wordpress-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-rest.md
│   ├── preview.md
│   └── protected-binary.md
└── tasks.md                 # future $speckit-tasks output; not created here
```

### Source Code (repository root; planned successor layout)

```text
wordpress/
├── wp-content/plugins/songhealth-core/
│   ├── songhealth-core.php
│   ├── src/
│   │   ├── Content/
│   │   ├── Identity/
│   │   ├── Eligibility/
│   │   ├── Authorization/
│   │   ├── Rest/
│   │   ├── Preview/
│   │   ├── Binary/
│   │   └── Diagnostics/
│   └── tests/{unit,integration}/
└── tests/containment/

apps/web/                    # selectively reused React public application
├── app/{routes,components,services}/
└── tests/{contract,e2e}/

tests/successor/             # cross-boundary acceptance/evidence

apps/admin/                  # preserved 001; SUPERSEDED / REMOVE-LATER
apps/server/                 # preserved 001; SUPERSEDED / REMOVE-LATER
infra/                       # preserved; no successor Production container baseline
```

**Structure Decision**: Add a clean WordPress root with one first-party plugin and selectively rebind
`apps/web`. Keep Delivery 001 assets and classify without deletion. This separates commodity CMS,
Songhealth policy, and presentation without a standalone backend or custom Admin app.

## Design Sequence

1. Establish clean local WordPress verification and plugin bootstrap.
2. Register two admin-visible/non-publicly-queryable types, capability mapping, identity registry,
   metadata, and
   create-time Public ID invariant.
3. Implement shared current eligibility/projection, detail/list, and native-surface containment.
4. Bind React canonical routes to the public contract.
5. Add authenticated Preview and protected delivery using fresh policy checks.
6. Add safe config/diagnostics, risk verification, hosting-account checkpoint, dependency evidence,
   and non-destructive successor classification.

## Complexity Tracking

No Constitution violations require justification.
