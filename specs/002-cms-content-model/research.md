# CMS Content Model — Plan Research

**Date**: 2026-10-13 | **Feature**: `002-cms-content-model` | **Issue**: 9GOTSTORY-207

**Source SHA**: `6129d4b6de13fdb05726ba5631fa7ed14672dd64`

**Status**: **BLOCKED during official Plan Phase 0 — HUMAN GATE required.** Partial research,
not a complete design, independent PASS, or runtime acceptance.

**Human Gate continuation (2026-10-13)**: The Product Owner authorized bounded Codex-only Phase 0
feasibility research in comment `01a135cf-ace5-73b6-9883-59d8ff82adf9`, preserving Q1–Q4 and
withholding implementation, dependency changes and Phase 1. The resulting
[options assessment](phase0-options.md) checks 1.1.0, released 1.2.0 and an exact upstream-main
snapshot, including content deletion and concurrency. No complete supported enforcement approach
was established; recommendation is upstream-native first while keeping the current pin and Human Gate.

## Workflow and provenance

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

Locations below are **inside that exact upstream package**, not Songhealth paths. This is static
release evidence, not a runtime test. No dependency, CMS record, database, schema, media object
or production runtime was mutated.

## R1 — Required media deletion protection: native gap

Decision: Do not claim Q4/FR-025 is natively enforced; block selection of a safe implementation.

Rationale: This call chain contains no published-content required-reference veto:

| Exact package source | Observed behavior |
| --- | --- |
| `src/astro/routes/api/media/[id].ts:108` | DELETE checks native delete/ownership permission and calls runtime media deletion |
| `src/emdash-runtime.ts:4802` | Calls native handler and invalidates settings cache; no deletion policy hook |
| `src/api/handlers/media.ts:359` | Finds media, tracks cleanup, deletes media row and removes/queues storage cleanup; no content-usage veto |
| `src/database/repositories/media.ts:622` | Deletes by media ID without a published-dependency predicate |
| `src/database/repositories/media.ts:632` | Checks other media rows sharing a storage key, not published content requirements |
| `src/plugins/types.ts:1800` | Registered media hooks cover before/after upload; no before-delete hook |

Native usage reporting/indexing is not removal enforcement. Core migration
`src/database/migrations/046_media_usage_index.ts` stores media/source identifiers as ordinary text,
not a restrictive content-to-media foreign key. PostgreSQL cannot infer publication requirements.

Failure scenario from inspected source: a published Document/News/ITA entry requires an asset;
an otherwise authorized user issues native media DELETE. The path deletes it without checking
the published dependency. Native permission alone does not satisfy Q4's refusal even when the
actor otherwise has permission. This scenario was not executed against a runtime.

Alternatives considered: Duplicate Media/File or custom reference database is prohibited and
cannot intercept native mutation. Hidden controls or staff instructions do not enforce direct
API/MCP/CLI operations. Blanket permission removal is not selected: it removes legitimate
maintenance after reference resolution and is not established as a supported least-privilege solution
for all required responsibilities.

## R2 — Historical ITA media replacement: native gap

Decision: Do not claim native content revisions preserve historical media bytes; retain Q3 as
a blocking design requirement.

Rationale: `src/astro/routes/api/media/[id]/replace.ts:14` checks edit/ownership permission,
ready state, image type/size. At line 87 it uploads replacement bytes to the existing
`media.storageKey`, then updates metadata. `src/database/repositories/media.ts:593` updates
size/dimensions/hash on the same ready media row. There is no ITA usage check or historical
preservation hook in this path. Registered media hooks provide no before-replace veto.

Failure scenario from inspected source: a published historical ITA requirement selects an image;
an authorized user replaces it through native PUT. The same evidence key yields new bytes without
deliberate correction/publication of the ITA revision. Its prior content revision cannot recover the
overwritten bytes. This conflicts with Q3/FR-017/SC-004 preservation under shared-media edits.
The scenario was not executed against a runtime.

Alternatives considered: Retaining media ID, URL or content revision cannot preserve bytes
overwritten at that key. Content before-publish hooks do not run on image replacement. A universal
snapshot engine, new DAM/storage subsystem or forked Admin is unauthorized. A supported immutable
target/protection approach has not been established and is not invented.

## R3 — Content policy seams: available, not a complete solution

Decision: Record supported candidates without overstating coverage.

Rationale: `src/emdash-runtime.ts:4447`, `:4515`, and `:4550` call native
`content:beforePublish`, `content:beforeUnpublish`, and `content:beforeSchedule` policy hooks.
The policy path hydrates pending draft data for publish/schedule, rejects cancellation and
carries a revision precondition into the write. Scheduler-origin publication uses the same
publish policy and has native explicit rejection evidence. These are candidate Q1/cross-record
Q4 seams without a new scheduling engine.

`src/emdash-runtime.ts:3951` invokes `content:beforeDelete` on trash with a boolean result;
`:4020` permanently deletes from trash without that hook. The vendor
[hook reference](https://docs.emdashcms.com/reference/hooks) documents this limit. This is not
proof of safe permanent deletion under every future required-reference mapping.

Alternatives considered: Content hooks cannot establish media-delete/replace coverage. A preflight
lookup plus parent `_rev` does not prove cross-target atomicity under concurrent publication and
target removal. PostgreSQL 18 documentation requires appropriate transaction consistency controls;
no direct locks/migrations or custom relationship service is authorized by this research.

Q1 validation placement, Q4 concurrent target protection/permanent deletion, revision retention
and exact ITA storage/editor usability still require research after the blocking capability boundary
is resolved. They are not verified designs.

## Preserved Clarify decisions and foundation boundaries

- Q1 stays exactly the spec's 16-row publication matrix, with conditional/optional fields,
  incomplete drafts under native identity/safety constraints, and publication/schedule validation.
- Q2 retains current assignment/unit/visibility on one Personnel identity; no assignment history.
- Q3 retains all published ITA years without automatic expiry; native-authorized traceable
  corrections must be deliberate, preserving history under current/shared edits.
- Q4 requires published targets/existing files at publish, schedule acceptance and execution;
  unavailable optional links are omitted; published required dependencies prevent removal;
  resolution/replacement is deliberate, with no cascade or draft exposure.
- T022 durability and T028 recovery stay **PENDING**. T028 requires T022 PASS plus accepted
  T023–T027 sources; T030 requires T028 PASS plus accepted T029 sources. No runtime gate,
  acceptance state or Feature 001 task marker changed.

## Human Gate required to resume Plan

Required bounded decision: establish an approved supported way to prevent required media deletion
and preserve historical ITA evidence under shared media replacement, covering trusted native
mutation paths. Provide capability evidence for the pin, or approve a separately verified upstream
release/owning-architecture change if necessary. Preserve Q1–Q4; do not infer permission to weaken
them or introduce new infrastructure.

Evidence needed before design resumes:

1. Exact supported interception/protection mechanism and version/source.
2. Coverage of native Admin/direct REST and relevant MCP/CLI/plugin/scheduled operations,
   without UI-only or single-path bypass.
3. Bounded deletion, historical replacement and concurrency scenarios, including permitted
   maintenance after deliberate resolution and prior/live preservation.
4. For an extension, demonstrated-gap/minimal-extension/test review under owning authorities;
   for a baseline change, accepted owning-authority amendment before downstream adoption.

This is the existing Plan review stop, not an additional workflow phase. Research remains
incomplete; Phase 1 `data-model.md`, `contracts/` and `quickstart.md` are not generated as a
completed design. No later Spec Kit command is authorized by this issue.
