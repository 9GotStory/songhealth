# Phase 0 — Upstream Native Enforcement Feasibility

> **Historical / superseded direction (2026-10-14):** Product Owner comment
> `01a135e9-23e0-78c3-bcea-c752516828a8` stops upstream pursuit and defers unavailable Q3/Q4
> guarantees from V1. This artifact preserves earlier evidence, not the current next action.
> The request draft is cancelled and remains unsubmitted; no maintainer contact occurred.
> Current scope/review standing is in [scope-reconciliation.md](scope-reconciliation.md),
> [spec.md](spec.md), [plan.md](plan.md) and [research.md](research.md).


**Date**: 2026-10-13 | **Issue**: 9GOTSTORY-207 | **Feature**: `002-cms-content-model`

**Authorized baseline**: `cb8110662832d62d7acddf10af5c0a3a8e55f62f`

**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`

**Direction**: Product Owner comment `01a135d8-6635-7d61-b499-3c0d97e9dd95` authorizes Codex-only
upstream research and a request draft within the existing Plan Phase 0 Human Gate. No submission,
maintainer contact, implementation, vendor patch, dependency/schema change or Phase 1 is authorized.

**Outcome: Plan remains BLOCKED.** Relevant upstream proposals exist, but no inspected maintainer
response, accepted design or supported extension contract establishes the complete Q3/Q4 enforcement.
The [upstream request draft](upstream-request-draft.md) is local and unsubmitted, for Human Review.

## Search coverage and evidence limits

Used read-only GitHub CLI issue/PR search, Discussion GraphQL search, selected complete discussion
bodies/comments/replies, relevant PR bodies/comments, and the proposal index. Context7 refreshed the
official hook/context documentation. Version-specific source findings remain in
[phase0-options.md](phase0-options.md), which inspected integrity-verified 1.1.0/1.2.0 packages.
The current upstream main SHA was rechecked and remains
`06f911b54f387a1284c767187042d7e11f6044fc`.

Initial broad `media` and `reference` discussion scans were capped at 30 and not treated as
complete. More focused searches covered all pages: `media delete` (28 discussion matches),
`media replacement` (8), `required reference` (29), `content policy` (38 across two pages), and
`transaction` (24). Issue/PR keyword searches also covered deletion, replacement, required references,
unpublish, policy, immutable media and transactions. The broad media-title PR scan was capped at 60;
targeted follow-ups and linked artifacts supplied the relevant candidates below.

This is a bounded survey of publicly retrievable evidence, not proof that no unpublished solution
exists. A label inviting a design PR, a prototype, bot triage, or a merged partial primitive does
not establish a released complete enforcement contract. No reproduction was executed in this run;
the request's scenarios are proposed tests derived from source and accepted requirements.

## Relevant upstream work

| Topic / primary source | Inspected state and substance | Effect on Songhealth feasibility |
| --- | --- | --- |
| [Discussion #1503](https://github.com/emdash-cms/emdash/discussions/1503), media usage and safe deletes | Current API label: `Design PR welcome`; two comments. Proposes usage indexing plus warning or blocking on in-use deletion | Directly relevant prior demand; an invitation to design does not establish required-reference blocking or concurrency semantics |
| [Discussion #1655](https://github.com/emdash-cms/emdash/discussions/1655), media roadmap | Starts with usage data/read-only Used in; later safety warning and replacement are described as follow-ups | A warning/usage view is weaker than Q4's trusted refusal; roadmap intent is not support for enforcement |
| [Discussion #1784](https://github.com/emdash-cms/emdash/discussions/1784), provider-aware usage foundation | Mirror describes safe-delete and replacement as excluded; completion comment links #1674 in 0.26.0 | Usage indexing is implemented foundation, not a removal veto |
| [Discussion #1815](https://github.com/emdash-cms/emdash/discussions/1815) / [PR #1746](https://github.com/emdash-cms/emdash/pull/1746) | PR merged 2026-07-06; mirror completion references 0.28.0. Original scope expressly excludes safe delete, replacement and media-delete behavior changes | Generation fencing keeps usage projections coherent; it is not atomic publication/removal authorization |
| [PR #2538](https://github.com/emdash-cms/emdash/pull/2538), tracking activation | Merged 2026-08-27; adds durable indexing/setup, truthful coverage and live-write safety | Makes reporting usable; does not establish mandatory dependency enforcement |
| [Discussion #3740](https://github.com/emdash-cms/emdash/discussions/3740), media revisions and atomic replacement | Posted 2026-10-02; no comments/labels at inspection. Author describes a private prototype with retained originals, new objects and transactional pointer changes | Closest replacement proposal. Prototype only exercised Node/SQLite/local storage, lacks restore and complete cache/reader proof; no PostgreSQL proof or maintainer-approved contract |
| [PR #2899](https://github.com/emdash-cms/emdash/pull/2899), in-place replacement | Merged 2026-09-04; deliberately retains identity/key/URL and changes stored bytes for existing usages | Confirms global replacement is native behavior; it does not freeze past-year evidence |
| [Issue #3049](https://github.com/emdash-cms/emdash/issues/3049) / [PR #3067](https://github.com/emdash-cms/emdash/pull/3067) | Issue closed with PR merged 2026-09-24; shared handler cleans storage/retries and reports `storageDeleted` | Fixes intended-delete cleanup and truthful reporting. Row-first deletion remains; this is not a veto protecting published references |
| [Discussion #1995](https://github.com/emdash-cms/emdash/discussions/1995) / [PR #3185](https://github.com/emdash-cms/emdash/pull/3185) | Completion comment reports hooks shipped in 0.39.0; PR merged 2026-09-20. Source verifies publication-policy hooks in 1.1.0 | Supported complete-candidate publish/schedule/unpublish checks and entry revision fences are useful partial primitives; no media/purge veto or shared cross-target transaction contract |
| [Discussion #2995](https://github.com/emdash-cms/emdash/discussions/2995), earlier pre-publication gap | Describes older 0.31.1/0.35.0 limits; later #3185 resolves the principal publish-hook absence | Do not repeat an obsolete claim that 1.1.0 lacks before-publish; the current request concerns remaining gaps |
| [Issue #4004](https://github.com/emdash-cms/emdash/issues/4004), authoritative dependencies | Open; requests bounded checks of live and staged/scheduled references in 1.2.0. One EmDashBot triage comment; no human maintainer solution in inspected comments | Related demand for a trusted dependency query. Bot suggests design discussion; neither query API nor transaction fence is offered as supported |
| [Discussion #4007](https://github.com/emdash-cms/emdash/discussions/4007), admission and recovery | No comments at inspection; author explicitly asks who owns host evidence and fencing | Related unsolved enforcement-boundary question, not a reusable accepted contract |
| [PR #2980](https://github.com/emdash-cms/emdash/pull/2980) / [Discussion #3465](https://github.com/emdash-cms/emdash/discussions/3465) | Merged single-key storage/KV conditional writes; the earlier request was closed as outdated after recognizing them | Supported CAS on a plugin-owned key does not enlist CMS mutation or media bytes; a cooperating-plugin lock cannot constrain all native writers |
| [Discussion #3503](https://github.com/emdash-cms/emdash/discussions/3503), conditional atomic batches | Unaccepted proposal with one author follow-up; expressly excludes atomic combination with CMS content or external effects | Even the proposed batch scope would not supply Songhealth's content/media boundary |
| [PR #3487](https://github.com/emdash-cms/emdash/pull/3487), opposite-end relation updates | Merged 2026-09-26; preserves concurrent staged-reference selections | Merge correctness differs from preventing unavailable required targets during removal/publication |

The current [accepted proposal index](https://github.com/emdash-cms/emdash/blob/06f911b54f387a1284c767187042d7e11f6044fc/proposals/README.md)
contains readable revision history. That [accepted design](https://github.com/emdash-cms/emdash/blob/06f911b54f387a1284c767187042d7e11f6044fc/proposals/readable-revision-history.md)
changes revision review presentation, not revision creation, asset versioning or lifecycle enforcement.
Its presence does not resolve these blockers.

## Supported-contract assessment

The verified supported pieces are native content policy hooks, native identity/revisions,
reference-selection merging, media usage reporting, shared storage cleanup, and single-key plugin CAS.
None inspected joins all required mutation paths into one enforceable consistency boundary.

Remaining proof obligations are unchanged:

- Media deletion must be refused before the media row/object is removed when published content
  requires it. Cover REST/Admin, CLI, MCP, plugin media access and local-provider paths; an HTTP
  check alone is insufficient.
- Historical evidence must retain the intended target/context and bytes under shared Document/media
  edits; current native replacement changes the same storage key. Retaining content JSON or an old
  revision ID alone is insufficient under overwrite/pruning.
- Required content targets must be protected on unpublish, trash and purge; parent publish/schedule
  validation and target removal must coordinate under concurrency. The trash-only purge precondition
  is useful but needs a complete invariant proof rather than reliance on preflight absence.
- A dependency report must distinguish absence from incomplete/stale/failed coverage, and have an
  atomic or fenced relationship to the mutation it authorizes. After-hooks and projection generation
  fencing do not establish that relationship.

No inspected human maintainer response offers a supported solution satisfying all of these for
the existing Node/PostgreSQL/local-storage foundation. No response has been requested by this run.

## Request routing and publication boundary

Upstream [issue-template configuration](https://github.com/emdash-cms/emdash/blob/06f911b54f387a1284c767187042d7e11f6044fc/.github/ISSUE_TEMPLATE/config.yml)
routes feature requests to Ideas Discussions, with ordinary issues for reproduced bugs. The
draft is therefore an opening feature/support request for Human Review, not an allegation of a
runtime-reproduced bug or a design PR. It references existing proposals to avoid implying a new
unrelated initiative or duplicating already-shipped hooks.

The [upstream AI policy](https://github.com/emdash-cms/emdash/blob/06f911b54f387a1284c767187042d7e11f6044fc/AI_POLICY.md)
permits help preparing an opening draft; before posting, a human must review/edit/disclose and
post manually. Its relevant wording includes “AI can help prepare the opening post of a Discussion”
and “post it manually.” Agents cannot write/post Discussion replies or open design PRs. This
aligns with the Product Owner's explicit no-submission/no-contact instruction; no permission is
inferred from choosing Option D.

Because the capability affects stored data, plugin surfaces and security/concurrency boundaries,
upstream's [proposal process](https://github.com/emdash-cms/emdash/blob/06f911b54f387a1284c767187042d7e11f6044fc/proposals/README.md)
suggests RFC review may be appropriate; upstream maintainers must choose that route. An upstream
design process is not an additional Songhealth Spec Kit phase or authorization to participate.

## Minimal extension versus explicit architecture reconsideration

| Decision | Implications | Required gate |
| --- | --- | --- |
| Wait for native upstream support (recommended first) | Preserves one canonical foundation and native maintenance ownership; availability/date are unknown and Plan stays blocked. Maintainer interest/prototype alone is insufficient | Human chooses whether to publish the reviewed opening request; later exact supported contract/release and compatibility evidence are required before approach acceptance |
| Minimal supported extension | Could encode Songhealth-specific Q1 publication and Q3/Q4 dependency/retention invariants while reusing native identities/roles/relations. Requires a supported common interception/transaction boundary covering media, content and purge; current APIs do not establish it. Additional hooks without atomicity cannot qualify | Demonstrated-gap/minimal-extension/focused-test review under Constitution II and current/05 §13, current/07 §7, current/10 §22; Human approval of exact supported approach. No authoring before later implementation authorization |
| Explicit architecture reconsideration | If upstream cannot provide a supported boundary, retaining both the fixed requirements and the current pin cannot be represented as feasible by an unproven local guard. Review technical baseline/support ownership, migration/durability/security/testing consequences and all affected canonical-foundation assumptions; do not install a parallel CMS/backend or change Product meaning | Accepted amendment to owning current/10 before downstream adoption; bounded Product Owner authorization and renewed independent review of affected feature/foundation dependencies. Any Product change would require its own explicit decision, which this direction prohibits |

No extension or replacement architecture is selected in this assessment. A monkey patch, vendor
fork, custom media/reference framework or broad custom locking engine is not a minimal supported
extension merely because it closes one scenario. A future dependency upgrade remains separately
gated; EmDash 1.1.0 and its lockfile remain unchanged here.

## Human Review handoff

Review the concise draft and choose whether a human should edit/disclose/post it as an opening
Ideas request. This is a concrete reviewable draft, not a request to authorize implementation.
Acceptance of the draft or its future publication does not unblock Plan: the supported enforcement
approach still requires complete coverage, atomicity, historical-preservation and compatibility
evidence described in [phase0-options.md](phase0-options.md).

Only planning/research documents changed. Approved Clarify Q1–Q4 and current Product/architecture
authorities are preserved. T022/T028 remain **PENDING**, T028 retains its T022 PASS plus accepted
T023–T027 join, and T030 retains its T028 PASS plus accepted T029 join. No runtime acceptance or
final foundation claim is made. Stop at the existing Phase 0 Human Gate.
