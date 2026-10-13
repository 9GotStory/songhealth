# Implementation Plan: CMS Content Model

**Feature**: `002-cms-content-model` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`
**Reconciliation baseline**: `e2903e41be6aebd849352d4cc452906eb3d796fd`
**Verified continuation HEAD**: `2d3cfc96929ef9085194e3c79a11a38f374de0b1`
**Original approved Clarify source**: `6129d4b6de13fdb05726ba5631fa7ed14672dd64`

**Status**: Official Plan Phase 0 BLOCKED on retained Q1 reference-selection mapping (B-Q1-REF).
The reviewed V1 reconciliation is the current Product baseline under continuation comment
`01a13779-da61-71be-bc11-46d3ea9d5413`. This remains a partial Plan, not a completed design,
independent PASS, runtime acceptance or implementation authorization. Phase 1 prerequisites are unmet.

**Input**: Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8` explicitly defers
unavailable Q3/Q4 guarantees from V1 and stops upstream EmDash changes. This pass reconciles the
owning documents/specification. The later continuation instruction authorizes remaining research and
Phase 1 after its prerequisites. Setup was already completed; no reinitialization/Specify/Clarify
rerun occurs. A verified material new gap is reported within Phase 0 rather than worked around.

## Summary

Reduced V1 retains ordinary public content, Document/native Media reuse, current Personnel,
conditional Organization, Services/facilities/Areas, native lifecycle/roles and supported validation.
Q1 incomplete drafts/publication-required values and Q2 current assignments remain; public-only
linked reads and safe unavailable targets remain. Structured ITA history/evidence is deferred D-ITA.
Unavailable Q4 removal vetoes and cross-record atomic availability/retention are deferred D-REF.

The exact 1.1.0 gaps remain real. They no longer block reduced V1 acceptance because the Product
Owner has explicitly removed the affected guarantees from that acceptance scope, not because native
permissions, precautions or an implementation solved them. Deferred tests are not passed or included
in the V1 denominator. No Basic Page/Document fallback substitutes for structured historical ITA.

The canonical Astro + EmDash 1.1.0 + PostgreSQL foundation, local media, native development and
Podman/Quadlet production contracts remain. No replacement platform, upgrade, patch, snapshot or
relationship-locking subsystem is selected. Historical options/request artifacts are superseded
as current direction; the request remains unsubmitted and upstream pursuit is stopped.

See [scope-reconciliation.md](scope-reconciliation.md) for the scope matrix, requirement traceability,
full §23 screening, changed-file rationale and risks, and [research.md](research.md) for capability
limits. [native-feasibility.md](native-feasibility.md) records the new retained-Q1 gap: action hooks
exist, but save-time reference requiredness conflicts with incomplete drafts and the policy/context
path does not expose a complete effective-selection projection. Host exports and compare/revision
alternatives were considered; no complete supported adapter is established. This is not D-REF.

## Technical Context

**Language/Version**: TypeScript 6.0.3; Node.js 24.21.0; npm 12.2.0, pinned in `package.json`.

**Primary Dependencies**: Astro 7.3.5; EmDash 1.1.0; `@astrojs/node` 11.1.6 standalone adapter;
`@astrojs/react` 6.0.5; React 19.2.4; `pg` 8.23.1. Pins remain unchanged.

**Storage**: Existing EmDash native PostgreSQL adapter, PostgreSQL 18.6 foundation and native
local media at `./media`. The active database owns schema; seed files are bootstrap intent,
not automatic production schema migration. No new database or direct schema modification is planned.

**Testing**: Future mapping/validation, public-read and role/lifecycle fixtures using the existing
Playwright 1.63.0/native development workflow. This document-only pass ran no application test or
runtime acceptance gate. Static release observations are not runtime PASS.

**Target Platform**: Existing Linux Astro SSR runtime. Development stays native Node/npm with
the rootless-Podman PostgreSQL helper. Production stays rootless Podman + systemd Quadlet with
private PostgreSQL and persistent database/media; this issue authorizes no deployment.

**Project Type**: One integrated CMS-backed website; native Admin is the primary staff interface.

**Performance Goals**: No new quantitative target. Representative staff maintenance and publication
safety remain the seven active spec success criteria (SC-004 is deferred); production capacity
evidence belongs to its owning scope.

**Constraints**: Native-first mapping; Thai labels with correct English fallback; public-publishable
data only; native roles/ownership and editorial identity; no confidential data, speculative collections,
public page implementation, import, external-consumer API or infrastructure changes. D-ITA/D-REF
guarantees are deferred from V1; no upstream-change pursuit.

**Scale/Scope**: Six active staff journeys plus deferred US5; 12 active Q1 semantic-resource
rows plus four deferred ITA rows, not an approved collection count. Organization/additional relations
require demonstrated reuse. Real official inventories,
reference values and operational role assignments are not invented.

## Constitution Check

*Official gate: before research; re-evaluate after Phase 1 design.*

| Principle / boundary | Reconciliation assessment | Remaining gate |
| --- | --- | --- |
| I: current authority | Reviewed reconciliation is current Product baseline under explicit continuation; no requirements amended | B-Q1-REF reported rather than weakening Q1; no implementation authorization |
| II: native first | Native primitives retained; D-ITA/D-REF deferred without duplicate mechanisms | B-Q1-REF: complete supported selection-only candidate read not established; no host-table workaround selected |
| III: simplicity | No ITA fallback collection, custom CMS/media/reference/locking/snapshot subsystem, second foundation or speculative Organization relation | Concrete representation/cardinality choices wait for the same Plan after acceptance |
| IV: security/data protection | Native roles/ownership, administrator content-purge boundary, public-data limits, private production database and secret-free documents preserved | Permissions/usage/precautions are not dependency guarantees; preview/public linked reads still require focused verification |
| V: phased human authorization | Remaining Phase 0 research authorized; Phase 1 also authorized only once its official prerequisite is met | ERROR on unresolved B-Q1-REF; no Phase 1 or later command, no additional workflow phase |
| Independent review | Codex authors this explicitly authorized documentation pass; no production authorship | Author assessment only; independent PASS belongs to reviewer and final acceptance to human |
| Durability/operations | Foundation sources and runtime contract unchanged; T022/T028 PENDING | Original T028/T030 joins remain; no acceptance/waiver inferred |

No Constitution amendment/exception is requested. The scope decision follows its owning-authority
amendment route. **Post-design check NOT RUN**: Phase 1 prerequisite remains unmet. This is not full
Plan PASS. Constitution I/II/V require reporting this unresolved enforcement contract.

## Implementation Mapping Gate — Content Model §23

The [reconciliation screening](scope-reconciliation.md#content-model-23-screening) accounts for all
retained semantic resources, native classifications/media/settings and actual core relation uses
against the four questions: real entity; native primitive sufficiency; real reuse; maintenance value.
These are candidates and scope checks, not Phase 1 schema/field/relation definitions.

ITA structural/evidence primitives are outside V1. No historical helper entity, native-resource
duplicate, generic Contact, executive/Featured/Health News kind, custom permission or locking
entity is introduced. Organization remains conditional; Area remains native taxonomy/reference
selection based on official-code/query needs. Every final proposed relation must pass §23 in Plan.

Reduced-scope candidate screening remains valid, but full native-sufficiency/enforcement mapping
does not pass while B-Q1-REF is unresolved. This distinction preserves the reviewed reconciliation
assessment without converting it into complete design or SC-008 runtime acceptance.

## Project Structure

### Documentation (this feature)

```text
specs/002-cms-content-model/
├── spec.md                    # reduced V1 and explicit D-ITA/D-REF register
├── plan.md                    # partial Plan; scope-review Human Gate
├── research.md                # active reduced-scope capability evidence/risks
├── native-feasibility.md      # remaining Phase 0 findings and retained-Q1 blocker
├── scope-reconciliation.md    # traceability/mapping/consistency review handoff
├── clarify-review.md          # unchanged historical author evidence
├── specify-review.md          # unchanged historical author evidence
├── checklists/requirements.md # unchanged historical quality evaluation
├── phase0-options.md          # historical superseded options
├── upstream-feasibility.md    # historical superseded upstream direction
└── upstream-request-draft.md  # cancelled/unsubmitted historical draft
```

`data-model.md`, `contracts/` and `quickstart.md` remain absent: they are official Phase 1 outputs
after the research prerequisite is resolved. The continuation authorizes that phase, but B-Q1-REF
prevents entering it. `tasks.md` and later commands remain unauthorized.
The review handoff is supporting Plan evidence, not a separate workflow or approval document.

### Source Code (repository root)

```text
astro.config.mjs      # existing canonical integration, unchanged
src/live.config.ts   # existing _emdash registration, unchanged
src/pages/index.astro
seed/seed.json       # empty foundation seed, unchanged; zero Product collections
scripts/             # existing native development/foundation/recovery sources
tests/               # existing verification sources
```

**Structure Decision**: Retain the one foundation; exact feature configuration is not implemented
or designed in Phase 1 by this reconciliation.

## Foundation Dependencies

- T022 production durability: **PENDING**. T028 recovery: **PENDING**.
- T028 requires T022 PASS plus Codex-accepted T023–T027 sources, including the separate runtime-secret
  recovery prerequisite; T030 requires T028 PASS plus Codex-accepted T029 sources.
- T029 source evidence is not runtime PASS/final foundation acceptance. No dependency exception,
  waiver or new runtime authorization is created by reducing Product scope.
- Feature 002 implementation readiness remains subject to its later approved artifacts, dependencies,
  independent reviews and explicit bounded implementation Human Gate.

## Remaining Research and Stop

The [remaining Phase 0 report](native-feasibility.md) verifies scalar/action-hook wiring, documents
native revision/metadata boundaries, and screens classification/Area/Organization/public-read/editor
primitives. It identifies B-Q1-REF as an unresolved complete Q1 mapping, with source-derived
discriminating scenarios and explicitly considered native host exports. No requirement is weakened
and no workaround selected. Native UI availability is not staff UAT/runtime PASS. Do not pursue
upstream changes, enter Phase 1, or report normal Plan completion over this unmet prerequisite.

Before/after Plan hooks were re-read: enabled optional `speckit.git.commit` hooks, null conditions,
with auto-commit disabled. Optional hooks are skipped; no mandatory Plan hook exists. The delivery
commit records research, not successful phase completion. Official upstream Plan instructions were
checked again; their Phase 1 prerequisite and unresolved-research ERROR rule apply here. Original
setup remains valid; it was not rerun or used to overwrite existing artifacts.

## Complexity Tracking

No exception or additional subsystem is proposed. D-ITA/D-REF are deferred requirements with stable
traceability, not authorized extensions. This pass reports B-Q1-REF in the existing official Plan
Phase 0, with no new approval phase and no completed-design claim.
