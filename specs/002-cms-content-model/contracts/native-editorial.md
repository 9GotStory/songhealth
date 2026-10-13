# Native Editorial and Validation Contract

**Phase 1 design for Independent Review.** No new public API, custom Admin, implementation or test
result is delivered. This contract describes the existing EmDash 1.1.0 Admin/API consumed by staff
and the bounded publication-hook proposal. Model: [data-model.md](../data-model.md); current rules:
[spec.md](../spec.md#q1-native-validation-matrix--retained-v1).

## Staff Surface and Authorization

Use `/_emdash/admin/` native collection lists, fields, taxonomies, media/reference selectors,
revisions, preview, one-time schedule and Trash/restore. Thai collection/field labels describe
actual content meaning; untranslated platform strings may correctly fall back to English.

Native Contributor is the draft-only case; native Author/Editor ownership/publish permissions
govern own/others' content. Native Administrator owns schema/users/plugins/settings and trash-first
permanent content deletion. Raw media deletion follows its separate native ownership/role rules.
These are native boundaries, not new Product roles or cross-record dependency enforcement. Personnel
assignment/visibility changes do not change login accounts/permissions or erase native authorship.

## Native Request Shapes

These endpoints are existing native interfaces, not a new Songhealth API. Use native authentication
and the latest returned `_rev` for update/publish/schedule preconditions. Native API schemas allow
some omitted tokens; bounded automation must supply current preconditions where supported and
re-read uncertain results instead of assuming all calls are idempotent.

| Operation | Existing interface | Relevant payload / native boundary |
| --- | --- | --- |
| Create draft | `POST /_emdash/api/content/{collection}` | `data`, optional `slug`, `taxonomies`, `references`; native API status is draft-only |
| Read/edit snapshot | `GET /_emdash/api/content/{collection}/{id}` | Native item/`_rev`; authorized draft visibility, paginated reference selections |
| Update draft | `PUT /_emdash/api/content/{collection}/{id}` | `data` and/or `references`, `_rev`; separate metadata/taxonomy/byline writes have native boundaries |
| Publish | `POST /_emdash/api/content/{collection}/{id}/publish` | `_rev`; native role/lock/slug/revision/reference constraints and `beforePublish` policy |
| Schedule | `POST /_emdash/api/content/{collection}/{id}/schedule` | `scheduledAt` ISO datetime with timezone offset, `_rev`; native scheduling and `beforeSchedule` policy |
| Unschedule | `DELETE /_emdash/api/content/{collection}/{id}/schedule` | Native permission/lock behavior; no fabricated unschedule policy hook |
| Unpublish | `POST /_emdash/api/content/{collection}/{id}/unpublish` | Native ownership/permission/precondition behavior, no D-REF veto |
| Trash / restore | `DELETE /_emdash/api/content/{collection}/{id}` / `POST .../{id}/restore` | Native authorization and reversible lifecycle; public reads exclude trashed content |
| Permanent content delete | `DELETE /_emdash/api/content/{collection}/{id}/permanent` | Native administrator permission and already-trashed precondition; no dependency lock |
| Preview URL | `POST /_emdash/api/content/{collection}/{id}/preview-url` | Native authorized signed-preview flow; not an unauthenticated query parameter |

`references` is a separate object, mapping bound field slug to selected entry ID arrays; it does
not belong in `data`. Example: a synthetic report draft can supply
`references: { report_document: ["<existing-document-id>"] }` while its optional-at-save scalar
fields remain incomplete. Omitted/empty required `report_document`, wrong targets or excessive
cardinality follow native refusal. Other relationship fields permit empty selections and have no
conditional publication predicate. This distinction closes B-Q1-REF without an adapter.

## Validation Contract

1. **Save-time:** native field/type/format/supplied-value constraints and the genuinely mandatory
   Report Document reference apply. Missing permitted non-required content fields can draft.
2. **Publication actions:** the finite content-data/classification predicates in the accepted matrix
   apply to manual publish, schedule acceptance and due-time execution through the appropriate
   native hook. Native publication additionally revalidates required references/cardinality.
3. **Relationships:** no hook checks/reconstructs relation selections. Conditional or optional links
   remain native editorial context; no automatic conditional publication enforcement is claimed.
4. **Availability:** a valid selection/file value does not guarantee published targets, immutable
   bytes, later availability or deletion refusal. D-ITA/D-REF remain excluded from acceptance.

The planned native plugin registers exactly `content:beforePublish` and `content:beforeSchedule`.
It uses candidate `event.content.data` and current `ctx.taxonomies.getEntryTerms(collection, id,
{ taxonomy, locale })`. Native media values are checked for a selected ID, not target existence.
Boolean false, native stored boolean 0/1, and numeric zero are valid present values. Blank text-only Portable Text blocks and
gallery/channel rows without their meaningful value do not satisfy publication presence. Optional
fields need no artificial value. Checks reflect the policy read and native current-entry fence;
they do not freeze separately maintained taxonomy metadata in a cross-record transaction.
External URL applies to current/00 §8.1 external digital service ownership; no other relationship
condition is inferred. Area/health-term semantic accuracy belongs to the verified inventory/editor
review, not an invented automated classifier.

Explicit rejection returns `{ cancel: true, reason }` through the native hook contract, with a
readable explanation naming the field/classification and operation. Hook exceptions/timeouts use
abort behavior; no `errorPolicy: continue` is selected. A missing/disabled plugin means those checks
are not active: configuration/registration is a required verification precondition, not a new
server-level guarantee against native administrator configuration changes.

Capabilities are only `hooks.content-policy:register` and `taxonomies:read`. No storage/routes/
network/content writes, internal table reads, reference snapshots or promotion-algorithm mirror.
The Node-compatible configuration uses a file/module native descriptor plus `createPlugin`/
`definePlugin`, not an inline resolved plugin or Cloudflare sandbox. Exact source evidence is in
[research.md](../research.md#2-remaining-publication-validation).

## Outcomes and Revision Limits

Use the native success/error envelope truthfully. Expect native validation/authorization/conflict
codes and native `PUBLISH_REJECTED` / `SCHEDULE_REJECTED` for explicit policy cancellation. Refusal
must not be shown as success; uncertain actions require a current-state read before retry.

Published content-data/reference edits stage under native revisions. Taxonomy/SEO/byline side writes
and shared asset changes are not frozen with them. At due time, the native publish path invokes the
policy again: explicit policy cancellation uses native rejection/unscheduling handling; other native
errors may leave a scheduled/overdue item. Observe actual state/reason/logs—no uniform recovery or
new retry scheduler is promised. No early publication or automatic domain expiry/unpublish.

Acceptance evidence must exercise trusted direct APIs as well as UI, current/stale `_rev`, locks,
all three supported policy points, native mandatory-reference save/publication constraints and
truthful failure states. Detailed journeys are in [quickstart.md](../quickstart.md). No result in
this contract is declared PASS before implementation and independent verification.
