# Upstream request draft — Human Review only

> **Historical / superseded direction (2026-10-14):** Product Owner comment
> `01a135e9-23e0-78c3-bcea-c752516828a8` stops upstream pursuit and defers unavailable Q3/Q4
> guarantees from V1. This artifact preserves earlier evidence, not the current next action.
> The request draft is cancelled and remains unsubmitted; no maintainer contact occurred.
> Current scope/review standing is in [scope-reconciliation.md](scope-reconciliation.md),
> [spec.md](spec.md), [plan.md](plan.md) and [research.md](research.md).


**Publication status**: Local, unsubmitted. No maintainer contact occurred. Intended route is an
opening Ideas Discussion, subject to human review/editing/disclosure/manual publication and separate
Product Owner authorization. Proposed scenarios have not been executed; they are not observed results.

## Proposed title

Supported native protection for published dependencies and historical media evidence

## Proposed opening post

We are planning a public content model on EmDash 1.1.0 with Astro 7.3.5, Node 24.21.0,
PostgreSQL 18.6 and persistent local media. We want to reuse native lifecycle/roles/relations,
without patching core or building another media or workflow system.

Does a supported native solution or extension contract cover required published dependencies
and historical media targets atomically? We found related work in
[safe-delete discussion #1503](https://github.com/emdash-cms/emdash/discussions/1503),
[replacement proposal #3740](https://github.com/emdash-cms/emdash/discussions/3740) and
[dependency-check issue #4004](https://github.com/emdash-cms/emdash/issues/4004).

### Remaining capability

Inspection of the [exact 1.1.0 package](https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz) finds:

- Media deletion removes the CMS row before storage cleanup without checking required published
  usages. [PR #3067](https://github.com/emdash-cms/emdash/pull/3067) addresses cleanup/failure
  reporting, rather than dependency refusal.
- Image replacement writes new bytes at the existing key. Retaining a content revision does not
  preserve overwritten bytes or freeze a shared Document target.
- Publication-policy hooks exist, but checks occur before the handler transaction. Entry `_rev`
  does not fence another target or its set of dependent parents. Permanent deletion bypasses the
  trash hook. [PR #3487](https://github.com/emdash-cms/emdash/pull/3487) merges relation selections,
  rather than protecting target availability during removal.

### Expected guarantees

Allow incomplete drafts. At publish, schedule acceptance and scheduled execution, required
content targets must be published/available and required file assets must exist. Optional unavailable
links may be omitted publicly without blocking the parent or exposing drafts.

Refuse unpublish/trash/purge or media removal while published content requires the target,
including otherwise authorized actors. Deliberate reference resolution permits eligible maintenance;
no automatic unpublish/delete cascade. Historical published years retain their intended evidence
context/bytes under shared edits. Authorized deliberate corrections preserve live content until
publication and identify actor/time/prior/replacement targets.

### Minimal scenarios to verify

Use synthetic fixtures in a disposable test site; these are proposed scenarios, not runtime results:

1. Publish a Document selecting media M and a parent requiring that Document. Attempt native
   `DELETE /_emdash/api/media/M`: expect refusal with row/object and live content intact.
2. Publish historical evidence selecting Document/M with byte hash A. Replace M with same-format
   bytes B through native image PUT: the historical evidence must still resolve A until deliberately
   corrected. Repeat with a shared Document file change; an unchanged evidence ID alone is insufficient.
3. With published parent P requiring target T, attempt native unpublish and trash: refuse.
   Cover permanent deletion with its already-trashed precondition and any pre-existing inconsistent
   dependency. After deliberate published-reference resolution, eligible trash/purge may succeed.
4. Interleave parent publication and target removal: publisher sees T available; remover sees no
   published P; remover commits; publisher attempts commit. They must not both succeed with an
   unavailable required link. Repeat across processes and schedule execution.

Cover native Admin/REST, CLI, MCP, plugin/provider mutation and scheduler paths where applicable;
not just visible buttons. Failed/incomplete dependency verification must not authorize unsafe removal.

Which supported API/version provides this, or which existing proposal should carry the missing
contract? For an extension, we need complete mutation coverage and transaction/fencing semantics
for Node/PostgreSQL/local storage. We are seeking guidance, not proposing an implementation or
claiming prototype compatibility.

*Prepared with OpenAI Codex assistance for human review. Evidence is source analysis; no runtime
reproduction, implementation or benchmark accompanies this request.*
