# Implementation Plan: CMS Content Model

**Feature**: `002-cms-content-model` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`

**Exact approved source SHA**: `6129d4b6de13fdb05726ba5631fa7ed14672dd64`

**Status**: **BLOCKED — HUMAN GATE during Phase 0 research.** This is a partial Plan
artifact, not a completed implementation plan, independent PASS, or implementation authorization.
Phase 1 design has not run. Do not proceed to Checklist, Tasks, Analyze, or implementation.

**Input**: Multica issue 9GOTSTORY-207 (`01a135bf-1792-7dce-9185-47e8d25ad268`)
authorizes the official Spec Kit Plan workflow only, Codex only, with no delegation.
The older authorization statements in the preserved spec describe its Clarify run;
this issue provides the bounded Plan authorization from the approved SHA above.

## Summary

Feature 002 defines structured public website content on the existing Astro SSR + EmDash +
PostgreSQL foundation. It preserves accepted Clarify Q1–Q4: incomplete drafts, current Personnel
assignments only, retained/traceably corrected ITA history, and required-reference publication/removal
protection. No second CMS, backend, database, workflow engine, or RBAC is permitted.

Pinned-release research found an enforcement gap for Q3 and Q4. EmDash 1.1.0's native media
delete path does not check published content usage, and native image replacement overwrites the
same storage object. Its media hooks cover upload, not delete or replace. Native usage tracking
and content revisions cannot be claimed to enforce these requirements.
See [research.md](research.md) for integrity-verified release evidence and the bounded Human Gate.

No corrective mechanism is selected. A supported, approved approach must be established before
research can finish and Phase 1 can define the model and contracts. No staff convention, hidden
control, snapshot system, or custom media subsystem replaces the accepted trusted enforcement.

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
safety remain spec SC-001–008 outcomes; production capacity evidence belongs to its owning scope.

**Constraints**: Native-first mapping; Thai labels with correct English fallback; public-publishable
data only; native roles/ownership and editorial identity; no confidential data, speculative collections,
public page implementation, import, external-consumer API or infrastructure changes. Q3/Q4 media
enforcement feasibility is blocked.

**Scale/Scope**: Seven staff journeys and 16 Q1 semantic-resource rows, not an approved collection
count. Organization/additional relations require demonstrated reuse. Real official inventories,
reference values and operational role assignments are not invented.

## Constitution Check

*Official gate: before Phase 0 research; re-evaluate after Phase 1 design.*

| Principle / boundary | Research-entry check | Current gate result |
| --- | --- | --- |
| I: current authority | PASS for bounded Plan research from approved Clarify SHA | HUMAN GATE: report pinned capability conflict; do not weaken Q3/Q4 or change owning authorities |
| II: platform-native first | PASS: inspect canonical/native seams first | BLOCKED: no supported removal/replacement enforcement approach established; no custom extension approved |
| III: simplest sufficient architecture | PASS: reuse the one foundation | No duplicate subsystem proposed; complete design withheld |
| IV: security/data protection | PASS for public-publishable, secret-free research | Trusted removal/reference enforcement required; UI-only prevention insufficient |
| V: phased human authorization | PASS: issue authorizes Plan only | STOP within Plan; no design completion or later phase claimed |
| Independent review | Codex authors planning documents under explicit issue authorization | Author evidence for ChatGPT Independent Review/Product Owner decision, not independent PASS |
| Operations/durability | Existing foundation unchanged | T022/T028 PENDING; no runtime or final foundation acceptance |

Post-design Constitution evaluation: **NOT RUN**, because Phase 1 has not begun. This is not
a successful Plan gate and does not support advancement to Checklist.

## Implementation Mapping Gate — Content Model §23

All future collections/relations must answer: Product identity versus presentation/classification;
native primitive sufficiency; demonstrated reuse; duplication benefit versus maintenance cost.
The bounded screening relevant to the stopped research is:

| Candidate | 1. Product entity? | 2. Existing primitive? | 3. Real reuse? | 4. Duplication benefit? | Disposition |
| --- | --- | --- | --- | --- | --- |
| Raw media/file | Asset, not new content identity | Native media/storage and image/file fields | Shared Document/content/ITA assets | Another collection duplicates CMS ownership and cannot protect bytes | Reject duplicate Media/File; record safety gap |
| Document | Real metadata around a public file | Collection + native file-field candidate | Announcement/Service/Report/ITA reuse | One record avoids per-context file/metadata duplication | Preserve semantics; exact definition awaits Phase 1 |
| ITA evidence | Ordered target/context belonging to a requirement | Relation/structured-field candidates need safe historical behavior | Document/media/URL references required | Routable Evidence/snapshot subsystem not justified by this blocker | Storage not selected; preserve Q3/Q4 and stop |
| Reference/retention guard | Invariant, not content entity | Content policy hooks exist; media delete/replace hooks absent | Published dependency/history protection required | Custom media/reference database duplicates infrastructure | No new collection/subsystem/workaround authorized |

This is not complete SC-008 accounting. A completed design must account for every proposed resource
and relation. Collection counts, Organization/Area representation and ITA cardinalities are not approved.

## Project Structure

### Documentation (this feature)

```text
specs/002-cms-content-model/
├── spec.md                    # preserved approved Clarify source
├── clarify-review.md          # preserved Clarify evidence
├── specify-review.md          # preserved Specify evidence
├── checklists/requirements.md # preserved earlier quality evaluation
├── plan.md                    # partial Plan; blocked in Phase 0
└── research.md                # exact-release findings and Human Gate
```

`data-model.md`, `contracts/` and `quickstart.md` are **not generated**: official Phase 1
requires complete research and a passing gate. `tasks.md` is not a Plan output and is unauthorized.
No additional phase or replacement approval document is created.

### Source Code (repository root)

```text
astro.config.mjs      # existing SSR/EmDash/PostgreSQL/local-media integration
src/live.config.ts   # existing single _emdash live collection registration
src/pages/index.astro
seed/seed.json       # existing empty version-1 seed; zero Product collections
scripts/             # existing development/foundation/recovery sources
tests/               # existing foundation/browser/operations verification
```

**Structure Decision**: Extend canonical seams only after a completed/reviewed Plan and the later
human implementation gate. No feature implementation path or application layer is added here.

## Foundation Dependencies

- T022 production durability: **PENDING**. T028 recovery: **PENDING**.
- T028 execution still requires T022 PASS plus Codex-accepted T023–T027 sources, including the
  separately documented runtime-secret recovery prerequisite.
- T030 still requires T028 PASS plus Codex-accepted T029 sources. T029 source evidence is
  not runtime acceptance or final foundation acceptance.
- This issue authorizes Plan research despite those pending gates. It authorizes no dependent
  runtime work and establishes no new Development-First Sequencing exception.
- Feature 002 implementation readiness/dependencies must be established explicitly at its later
  Human Gate; this partial plan neither waives nor invents that decision.

## Complexity Tracking

No Constitution exception is requested or approved. The native gap remains a blocker, not
permission for an unreviewed extension. [Research](research.md#human-gate-required-to-resume-plan)
states the bounded decision and evidence needed to resume Plan.
