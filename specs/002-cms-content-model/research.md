# CMS Content Model — Plan Research

**Date**: 2026-10-14 | **Feature**: `002-cms-content-model` | **Issue**: 9GOTSTORY-207

**Current reconciliation baseline**: `e2903e41be6aebd849352d4cc452906eb3d796fd`
**Original Clarify source**: `6129d4b6de13fdb05726ba5631fa7ed14672dd64`

**Standing**: Partial existing Plan Phase 0; reduced authorities/specification await independent
review/human acceptance. Research/design are not complete. No runtime or independent PASS.

## Current Product Decision and Applicability

Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8` stops upstream pursuit and defers
structured ITA historical evidence (D-ITA) plus unavailable Q4 target-removal/atomic availability
guarantees (D-REF). Q1 publication-required field/selection values, incomplete drafts, Q2 current
assignments and independent public-read/native-authority boundaries remain. Owning documents and
spec are reconciled; this pass stops for their review rather than advancing to Phase 1.

The previous blocker leaves reduced V1 acceptance because its requirements are explicitly deferred,
not because native gaps are repaired. No deferred fixture is counted as implemented/PASS. This
does not defer Q1 or claim all remaining native semantics are already verified.

The prior options, upstream survey and request remain historical evidence. Their upstream-first
recommendation and request-publication next step are superseded; the draft is cancelled/unsubmitted.
No further upstream changes/contact are pursued. See [scope-reconciliation.md](scope-reconciliation.md).

## Pinned 1.1.0 Capability Findings — Scope-adjusted Disposition

All package paths below belong to the integrity-verified upstream `emdash@1.1.0` archive,
not Songhealth files. The previous 1.2.0/main survey is historical comparison only, not an upgrade
candidate or current prerequisite. This reconciliation changes no package or runtime state.

| Capability / exact source | Finding | Reduced V1 disposition |
| --- | --- | --- |
| Media DELETE: `src/astro/routes/api/media/[id].ts:108`; runtime `:4802`; `src/api/handlers/media.ts:359`; media repository `:622` | Permission/ownership then row-first deletion/storage cleanup; no required-published-reference veto | Ordinary native maintenance retained; D-REF veto deferred, missing consumers handled safely |
| Image PUT: `src/astro/routes/api/media/[id]/replace.ts:87`; media repository `:593` | Overwrites existing key and updates current row; no historical target freeze | Ordinary shared reuse retained; D-ITA immutable/historical-preservation workflow deferred |
| Media hooks: `src/plugins/types.ts:1800` | Before/after upload only; no delete/replace veto | No missing-hook workaround or upstream pursuit |
| Content policy: `src/emdash-runtime.ts:4296`, `:4432`, `:4509`, `:4543` | Publish/schedule/unpublish policy, candidate hydration and current-entry revision fence; scheduler checks publish policy at due time | Supported candidate for retained Q1 action validation; full field/selection coverage still requires proof |
| Trash/purge: runtime `:3950`, `:4020`; content handler `:1940` | Trash before-delete hook; purge bypasses it, requires trashed row and native admin REST permission; cleans edges/revisions | Native lifecycle/access retained; D-REF dependent-target veto and D-ITA archival guarantee not claimed |
| Transaction/plugin context: `src/database/transaction.ts`; `src/plugins/types.ts:1056` | Hook policy reads precede handler transaction; no plugin-shared content transaction provided | Entry protections retained; cross-record atomicity deferred D-REF |
| Native revision prune: `src/database/repositories/revision.ts:278` | Finite revision pruning protects this entry's live/draft pointers, not arbitrary external historical references or media bytes | Native editorial history retained; no indefinite immutable evidence claim |
| Schema requiredness: `src/schema/zod-generator.ts:41`; required references `src/api/handlers/validate-references.ts:127` | Required flags/selections can be checked on saves/creates, which is not Q1 publication-only requiredness | Exact native schema/publication-hook mapping is a remaining Plan obligation; do not silently impose all Q1 fields at draft save |

Decision: retain these native primitives and document their limits. Alternatives rejected for
this reduced scope: a second CMS/backend/database, duplicate Media/reference index, custom lock/
snapshot/history engine, vendor patch/fork/monkey patch, dependency upgrade, upstream intervention,
or operational precautions presented as enforcement. Native usage reporting may guide maintenance
but cannot authorize an absent atomic guarantee.

## Retained Validation and Revision Risks

- **Q1 remains required.** Native publication hooks are available, but a per-resource mapping must
  show complete candidate field/selection checks at publish, schedule acceptance and execution while
  allowing incomplete drafts. Native save-time required flags alone cannot satisfy both. No custom
  generic policy engine or implementation is approved by this source evidence.
- **Actual revision scope matters.** Native content-data/selected staged references and other shared
  or separately maintained data are not automatically one revision. Taxonomy/SEO/byline behavior,
  classification requiredness, byline alternatives and gallery selection must be checked in the
  remaining Plan. Revised lifecycle promises cover actual native staged content data, not blanket
  cross-record/metadata freezing. No new immutable/current-metadata subsystem is proposed.
- **Public boundaries remain.** Linked content must be read through published-only paths; drafts
  cannot leak via preview/query parameters. Missing assets may be unavailable after authorized
  maintenance; native public media itself is for public-publishable data, not confidentiality.
- **Representation/UAT remains.** Official-code Area hierarchy, reciprocal service/facility reuse,
  conditional Organization reuse, Thai labels and staff selectors need bounded mapping evidence.
  No official inventory, new collection or guaranteed native editor fit is invented.
- **Native lifecycle smoke evidence remains.** Scheduling/timezone, locks/stale-entry writes,
  trash/restore, administrator content purge and truthful uncertain/failing outcomes must be checked
  on retained fixtures after design/authorization. Document review is not those outcomes.

These risks do not reinstate D-ITA/D-REF into V1. They are not automatically resolved by scope
reduction and must be addressed through the same remaining Plan or returned to its existing gate.

## Current Human Gate and Foundation Boundary

Required now: ChatGPT Independent Review and Human Acceptance of the revised authorities/spec.
After acceptance, resume the same official Plan research and Phase 1 steps. Do not rerun setup,
Specify/Clarify, reinitialize, create a separate workflow, or start Checklist/Tasks/Analyze/Implementation.
No data model/contracts/quickstart or production change was produced in this pass.

T022 durability and T028 recovery remain **PENDING**. T028 requires T022 PASS plus accepted
T023–T027 sources; T030 requires T028 PASS plus accepted T029 sources. No final foundation or
runtime acceptance/waiver is inferred. The Constitution stays 2.0.0; no exception is requested.

## Original workflow provenance — historical setup

Decision: Continue the existing clarified feature on managed branch
`agent/codex-lead-reviewer/477dbb76ad5b`, from exactly the approved SHA.

Rationale: Fetching the named Clarify source branch resolved to approved
`6129d4b6de13fdb05726ba5631fa7ed14672dd64`. The clean checkout was fast-forwarded to it before
planning. Draft PR #14 remained open against `001-platform-foundation`, with head branch
`002-cms-content-model` at stale Specify SHA `4e3fb02b44ac5650cc63b17e441b7cb0321ddc00`.
Neither the PR nor its head was altered.

Alternatives considered: Stale remote specification, rerunning Specify/Clarify and initializing
or renumbering the feature were rejected by the issue.

Installed Specify CLI: 1.1.0. The official agent Plan instruction is
`specify_cli/core_pack/commands/plan.md`, checked against the
[current upstream workflow](https://github.com/github/spec-kit/blob/main/templates/commands/plan.md).
Plan is an agent instruction workflow, not a shell `specify plan` subcommand. Repository policy
deliberately excludes vendored agent-specific bundles; none was recreated.

Official setup ran from repository root:

```bash
SPECIFY_FEATURE=002-cms-content-model \
SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model \
SPECIFY_FEATURE_NO_PERSIST=1 \
bash .specify/scripts/bash/setup-plan.sh --json
```

JSON resolved `FEATURE_SPEC`, `IMPL_PLAN` and `FEATURE_DIR` to this feature. Its `BRANCH` is
the logical feature identifier; the actual Git branch is recorded above. Supported overrides
preserved tracked feature state. The copied official template supplies the plan structure.

Before/after Plan hooks in `.specify/extensions.yml` parse successfully: both are enabled,
optional `speckit.git.commit` hooks with null conditions. Their event auto-commit flags and the
default in `.specify/extensions/git/git-config.yml` are false. Optional hooks are skipped; no
mandatory hook exists. The explicit delivery commit records blocked research, not successful phase
completion. Codex performed research directly under the no-delegation constraint.

Read authorities: `AGENTS.md`, Constitution 2.0.0, approved Feature 002 spec/Clarify handoff,
`current/02-content-model.md`, `05-admin-cms.md`, `06-roles-permissions.md`,
`07-publishing-workflow.md`, and `10-system-blueprint.md`. Foundation task dependencies,
T029 seam evidence, README and canonical integration were inspected as baseline evidence.
No `PROJECT-STATUS.md` or `PRE-IMPLEMENTATION-GATE.md` is present; no substitute approval is invented.

## Documentation and exact release evidence

Context7 was used first:

| Technology | Resolved source | Subject | Limit |
| --- | --- | --- | --- |
| EmDash | `/websites/emdashcms` | Fields/repeaters/references, content policy hooks, media usage/deletion | Unversioned vendor docs; exact 1.1.0 behavior checked separately |
| Astro | `/withastro/docs` | SSR live reads/errors, Node standalone integration | Unversioned docs, not 7.3.5 runtime validation |
| PostgreSQL | `/websites/postgresql_18` | Transaction isolation/cross-record consistency | Major-18 docs, not new 18.6 compatibility/runtime acceptance |

Primary documentation:

- [EmDash field types](https://docs.emdashcms.com/reference/field-types)
- [EmDash hooks](https://docs.emdashcms.com/reference/hooks)
- [EmDash plugin hooks](https://docs.emdashcms.com/plugins/creating-plugins/hooks)
- [EmDash REST API](https://docs.emdashcms.com/reference/rest-api)
- [Astro live content](https://docs.astro.build/en/guides/content-collections/)
- [Astro Node integration](https://docs.astro.build/en/guides/integrations-guide/node/)
- [PostgreSQL 18 application-level consistency](https://www.postgresql.org/docs/18/applevel-consistency.html)

The exact first-party [EmDash 1.1.0 npm archive](https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz)
was downloaded with `npm pack` and inspected outside the repository. It includes vendor TypeScript
sources. Metadata version is 1.1.0. Independently computed archive SHA-512 integrity equals npm
metadata and the committed `package-lock.json` entry:

```text
sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHLqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==
```

Package locations above are **inside that exact upstream package**, not Songhealth paths. This is static
release evidence, not a runtime test. No dependency, CMS record, database, schema, media object
or production runtime was mutated.
