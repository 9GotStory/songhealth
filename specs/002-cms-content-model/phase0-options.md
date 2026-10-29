# Plan Phase 0 — Enforcement Feasibility Options

> **Historical / superseded direction (2026-10-14):** Product Owner comment
> `01a135e9-23e0-78c3-bcea-c752516828a8` stops upstream pursuit and defers unavailable Q3/Q4
> guarantees from V1. This artifact preserves earlier evidence, not the current next action.
> The request draft is cancelled and remains unsubmitted; no maintainer contact occurred.
> Current scope/review standing is in [scope-reconciliation.md](scope-reconciliation.md),
> [spec.md](spec.md), [plan.md](plan.md) and [research.md](research.md).


**Date**: 2026-10-13 | **Feature**: `002-cms-content-model` | **Issue**: 9GOTSTORY-207

**Authorization**: Product Owner direction in comment `01a135cf-ace5-73b6-9883-59d8ff82adf9`:
Codex-only bounded feasibility research within existing Plan Phase 0. Independent Review confirmed
the earlier media gaps. Preserve Q1–Q4; no implementation, EmDash patch, dependency change,
Product amendment or Phase 1 until an approach is accepted.

**Standing**: Author research/options assessment, not independent PASS or a completed Plan.
**Result: enforcement not established — STOP at HUMAN GATE.**

**Recommendation**: Keep the current 1.1.0 pin. Prefer a vendor-supported upstream native
enforcement solution that covers media and content mutation atomically, with historical target
preservation. No examined released or current-main implementation provides that complete solution.
Do not upgrade to 1.2.0 for these blockers. A future native release or minimal supported extension
requires the evidence and approvals below; neither is approved or implemented here.

## Scope and provenance

The approved Clarify source remains `6129d4b6de13fdb05726ba5631fa7ed14672dd64`.
This research continues from prior research commit `6c0a7afe1a79424058a619c5c3df38748e9613fe`
on `agent/codex-lead-reviewer/477dbb76ad5b`. Existing [plan](plan.md) and [research](research.md)
remain partial Phase 0 artifacts. This assessment is supporting research, not another workflow phase.

Context7 was used first: `/websites/emdashcms` for lifecycle hooks, plugin context, storage and
media protection; `/websites/postgresql_18` for transaction consistency. Unversioned vendor pages
describe candidates; the exact packages and upstream commit establish the version-specific findings.
No application code, runtime data, dependency or upstream source was changed. No runtime test or
compatibility PASS is claimed. No upstream issue, message or PR was submitted.

| Source | Exact identity / evidence |
| --- | --- |
| Approved EmDash | [1.1.0 archive](https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz); SHA-512 matches committed lockfile, as recorded in research.md |
| Latest released candidate at inspection | npm dist-tag `latest` = 1.2.0; [release](https://github.com/emdash-cms/emdash/releases/tag/emdash%401.2.0), published 2026-10-06; [exact archive](https://registry.npmjs.org/emdash/-/emdash-1.2.0.tgz), independently integrity-verified |
| Current upstream main snapshot | [06f911b54f387a1284c767187042d7e11f6044fc](https://github.com/emdash-cms/emdash/tree/06f911b54f387a1284c767187042d7e11f6044fc); inspected read-only, not a released dependency or support commitment |
| Hook documentation | [Official reference](https://docs.emdashcms.com/reference/hooks/) and Context7; package registry/control flow settles differences between vendor pages |
| Transaction authority | [PostgreSQL 18 application consistency](https://www.postgresql.org/docs/18/applevel-consistency.html), [isolation](https://www.postgresql.org/docs/18/transaction-iso.html); not a Songhealth schema/locking authorization |

1.2.0 archive integrity:

```text
sha512-f9s7khWeuOxX5cRimlu9o224hn9TuKnYk/0Vsu1CS9oaVn78V1+MWyfEsZc2iDv8JYWrezEZFkpy/Q6pRgVgzg==
```

## Version-specific findings

Source paths in this section are inside the first-party npm package, not Songhealth application
paths. Current-main locations have the prefix `packages/core/`.

### Media deletion and replacement

In 1.1.0 and 1.2.0, `src/astro/routes/api/media/[id].ts:108` checks native permission/ownership,
then deletes through the runtime. `src/api/handlers/media.ts` deletes the media row before removing
or queuing storage cleanup, without inspecting published required dependencies. The 1.2.0 handler
diff only adds a media-create caption input; its delete behavior is unchanged. The native media
repository is byte-identical between releases.

`src/astro/routes/api/media/[id]/replace.ts:87` uploads bytes to the existing storage key.
The entire replacement route is byte-identical in 1.1.0, 1.2.0 and the inspected main snapshot.
The media DELETE route is likewise identical across all three. Replacement does not publish an
ITA correction and has no historical-evidence protection check.

Both releases' `src/plugins/types.ts:1800` register only before/after-upload media hooks.
Current main's registry and hook implementation match 1.2.0. No supported media deletion or
replacement policy veto was found in those registries. The main runtime still calls the same
unguarded deletion handler at `packages/core/src/emdash-runtime.ts:4926`.

Coverage matters beyond REST: in both releases, `src/mcp/server.ts:2790` calls runtime media
delete; `src/plugins/context.ts:1115` calls the underlying media-delete handler directly.
Native CLI `src/cli/commands/media.ts:147` uses `client.mediaDelete`, whose
`src/client/index.ts:1195` issues REST DELETE. An HTTP guard or runtime-method wrapper alone
does not demonstrate protection of all these supported paths.

### Content unpublish, trash, permanent deletion

| Operation | Exact 1.1.0 source | Exact 1.2.0 source | Native capability and remaining gap |
| --- | --- | --- | --- |
| Unpublish | `src/emdash-runtime.ts:4509` | same file `:4652` | Cancellable before-unpublish policy and current-entry revision fence; dependency check is outside the subsequent mutation transaction |
| Trash | `src/emdash-runtime.ts:3950`; handler `src/api/handlers/content.ts:1836` | runtime `:4093`; handler `:1867` | Boolean before-delete veto runs before the transaction; no native published-required-backlink veto in the repository mutation |
| Permanent deletion | runtime `:4020`; handler `:1940` | runtime `:4163`; handler `:1971` | Administrator REST permission and already-trashed requirement; no before-delete policy hook on purge |
| Parent publish | runtime `:4432`; handler `:2292` | runtime `:4575`; handler `:2341` | Publish policy precedes the handler transaction; staged references are promoted transactionally, but no shared lifecycle/published-availability fence established |

The official hook reference confirms the trash hook does not run again for permanent deletion.
Current main retains that behavior at runtime `:4147`. Purge does require a trashed row, so it
does not directly hard-delete a live entry; that protection must not be confused with checking
published backlinks or historical traceability. On last-of-group purge the native handler clears
reference edges (`1.1.0 :1977`, `1.2.0 :2008`) and deletes the entry's revisions.
It does not veto those actions based on a published parent's required link.

If trash and parent publication were atomically protected, the trashed-only purge rule could be
part of a safety proof. Such a proof is not established by the current hooks; adding a purge
hook alone would also leave concurrency and already-inconsistent relationships unresolved.

### Concurrent required-reference operations

In 1.1.0 `checkContentPolicy` begins at runtime `:4296`, and in 1.2.0 at `:4439`.
It runs plugin policy before calling the handler. Handler `withTransaction` starts later.
`src/database/transaction.ts` is byte-identical across releases: PostgreSQL gets a transaction,
but the outer policy reads are not part of it. No shared transaction/locking token is provided
by the exported `PluginContext` (`src/plugins/types.ts:1056`). Holding a lock in an unrelated
connection would not automatically enlist the native handler or other mutation paths.

`src/api/rev.ts` encodes the current entry's version and updated timestamp. That protects this
entry against a stale mutation; it does not bind a parent publication to an unchanged target or
bind a target removal to an unchanged set of published parents. Native relation storage uses
translation-group endpoints without restrictive content foreign keys
(`src/database/migrations/043_content_references.ts`). Native required-reference validation
checks selection/cardinality; it is not cross-resource published-availability/retention enforcement.

The following is a **source-derived counterexample to preflight-only checks**, not an executed
runtime trace. Assume a custom plugin independently checks required targets before parent publish
and published backlinks before target removal:

| Order | Parent publisher | Target remover |
| --- | --- | --- |
| 1 | Preflight sees target published/available | |
| 2 | | Preflight sees no published required parent yet |
| 3 | | Unpublishes/trashes target in its own mutation |
| 4 | Publishes parent in a different mutation; parent revision has not changed | |

No native cross-target fence demonstrated here forces step 4 to fail or makes step 3 reconsider
the impending publication. Even moving both checks into separate Read Committed transactions is
not a sufficient mutual exclusion proof. Making database isolation Serializable globally cannot
pull earlier out-of-transaction hook reads into the mutation transaction.

Upstream [PR #3487](https://github.com/emdash-cms/emdash/pull/3487), merged 2026-09-26, preserves
concurrent opposite-end reference-selection changes. Its purpose is merging staged relation edits,
not preventing target unpublish/trash/media removal. The inspected staged-reference code already
contains those protections; that PR is not a solution to this lifecycle race.

### Historical evidence and storage-only approaches

Q3 requires preservation under shared Document/media changes, not just an unchanged ITA record ID.
A live Document reference can resolve changed file/metadata later. Selecting an old native revision
alone is not a complete long-term strategy: `src/database/repositories/revision.ts:278` prunes old
revisions and protects the same entry's live/draft pointers, not arbitrary external revision IDs.
Revision JSON also does not preserve bytes overwritten at its referenced storage key. This is a
risk for an old-revision-reference proposal, not a new indefinite universal-audit requirement.

Supported storage descriptors exist, but `src/storage/types.ts` addresses objects by key;
upload/download/public URL do not expose a selected immutable storage version for evidence.
1.2.0 adds byte-range download options, not version-addressed historical reads.
Therefore enabling storage versioning alone does not establish stable public evidence targets.
A new S3/R2 baseline would additionally change the accepted local persistent-media architecture.

A custom adapter denying deletion is insufficient: native media-row deletion occurs first and
storage failure is handled as cleanup, rather than refusing the CMS deletion. Denying same-key
overwrites might preserve bytes, but does not solve native content removal or shared Document
changes and would still be custom extension work requiring approval.

## Bounded options assessment

| Option | Support / feasibility | Requirement coverage | Disposition and gate |
| --- | --- | --- | --- |
| A. Retain 1.1.0; configure native schema/roles and add ordinary content hooks | Supported primitives; hooks permit serial policy checks | Partial publish/schedule/unpublish/trash coverage; no media/purge/atomic cross-target solution | Insufficient as complete design. A hook is custom code even when its API is native; require extension review before any authoring |
| B. Upgrade to released 1.2.0 | Released; metadata compatibility screen below | Relevant media paths and missing transaction/purge seams remain | Do not upgrade for this blocker. Any separate upgrade needs explicit dependency/Human Gate and compatibility/migration evidence |
| C. Adopt current main/unreleased fix | Exact main snapshot inspected; no relevant complete fix found | Same critical gaps | Not a supported replacement release. No adoption or presumed future fix |
| D. Seek upstream-native enforcement support, then assess a released supported solution | Recommended direction; not an available/accepted implementation today | Can qualify only if upstream supplies complete coverage/atomicity and historical preservation evidence | HUMAN GATE to choose upstream path; no upstream contact/patch authorized here. Later exact-release acceptance required |
| E. Minimal Songhealth extension using supported transaction-scoped policy seams | Content hooks/plugin/storage APIs are supported; missing common transactional mutation seam is not established | Cannot currently prove media, purge and concurrency coverage together | Conditional fallback only if upstream establishes a supported complete seam. Requires architecture/extension and Human Gate approval; no workaround implementation |
| F. REST middleware, runtime monkey patch, SQL triggers, storage-only guard, UI restrictions or new snapshot system | HTTP/storage hooks solve only portions; runtime patching is not an established supported extension contract; SQL triggers couple to vendor schema | Bypasses, database/media coordination and revision-history gaps remain; some add prohibited infrastructure | Reject as current plan. No new CMS/reference/permission/storage framework; any materially different proposal requires its own demonstrated-gap architecture decision |

## Upgrade compatibility screen — 1.2.0 is not a blocker remedy

This is static compatibility evidence only, not upgrade approval:

- 1.1.0 and 1.2.0 declare the same engine/peer ranges: Node >=22.16, Astro >=6.0.0-beta.0,
  React/React DOM >=18 and `@astrojs/react` >=5.0.0-beta.0. Songhealth's Node 24.21.0,
  Astro 7.3.5, React 19.2.4 and React integration 6.0.5 satisfy those declared ranges.
- The PostgreSQL adapter and its descriptors are byte-identical across the two packages;
  it still uses `pg` and the native canonical inputs. This does not prove PostgreSQL 18.6
  runtime compatibility or database-content behavior for the new release.
- All 90 numbered migration files are byte-identical with the same names; the migration runner
  file differs. This is not a generated migration-manifest identity comparison or deployment gate.
- Native local-storage implementation/types differ (including range handling). Admin/auth and
  other bundled packages update to 1.2.0. Build, Admin, media and lifecycle regressions remain
  untested, and the lockfile was not resolved or changed.
- If an upgrade is separately chosen, require exact pin/lock/artifact identities, type/build
  checks, migration manifest/status comparison, review of native runtime configuration, approved
  restorable backup/recovery readiness for the actual risk, and focused Q1–Q4 regression evidence.
  Do not use this research to execute pending T022/T028 or claim foundation acceptance.

## Recommended Human Gate decision and evidence to reopen design

Choose **D, upstream-native first**, while keeping 1.1.0 and the Plan block. This recommends
a direction for obtaining a supported solution, not acceptance of an imaginary released capability.
No examined approach is sufficient to authorize Phase 1 now. If upstream cannot supply a supported
solution, return for a bounded architecture decision on E; do not silently weaken Q1–Q4.

Minimum acceptance evidence for any proposed approach:

1. A named supported mechanism and exact version/source covering media-row deletion before it
   commits, replacement before historical bytes change, and required content unpublish/trash/purge.
   Cover native REST/Admin, CLI, MCP, plugin writes and scheduler paths that can perform each action.
2. One demonstrated atomic consistency boundary for parent publish/reference promotion versus
   target removal/replacement. Show deterministic failure/conflict handling, including across
   concurrent requests/processes. Adding hook names without transaction semantics is insufficient.
3. A supported historical target/context representation that survives shared Document/media edits
   and relevant revision pruning. Deliberate authorized ITA correction must preserve live content
   until publication and identify actor/time/prior/replacement targets. No snapshot engine inferred.
4. Focused verification design: published required-media delete refused; optional unavailable links
   omitted; unrelated/unreferenced removal permitted; shared image replacement leaves past ITA
   unchanged; required-target unpublish/trash/purge refused; two opposite-order concurrent operations
   cannot commit an unavailable required link; schedule acceptance and execution revalidate;
   deliberately resolved references permit eligible maintenance with no automatic cascade.
5. Compatibility evidence against the exact Astro/EmDash/PostgreSQL/Node foundation and native
   storage/deployment contract. A dependency change requires explicit Human Gate authorization.
   A custom extension requires the accepted demonstrated-gap/minimal-extension/focused-test gate
   (`current/05` §13, `current/07` §7, `current/10` §22, Constitution II).
   Any technical baseline change requires accepted owning-architecture amendment first.

The Constitution's current-authority, minimal-extension, security and phased authorization
boundaries remain intact. No schema/model, custom RBAC/workflow, second foundation, production
operation, Phase 1 artifact or later Spec Kit command was produced. Q1–Q4 are unchanged.
**T022 and T028 remain PENDING**, with their original dependency joins unchanged.
