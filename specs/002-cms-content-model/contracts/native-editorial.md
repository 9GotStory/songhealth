# Native Editorial and Save-Time Validation Contract

**Phase 1 reconciled design for Independent Review**, instruction `01a137d4-3956-7621-92a5-a654dea51ef2`.
No new public API, custom Admin, implementation or test
result is delivered. This contract describes the existing EmDash 1.1.0 Admin/API consumed by staff
and direct native-only publishing. Model: [data-model.md](../data-model.md); current rules:
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
| Publish | `POST /_emdash/api/content/{collection}/{id}/publish` | `_rev`; native role/lock/slug/revision/reference constraints; no Songhealth policy hook |
| Schedule | `POST /_emdash/api/content/{collection}/{id}/schedule` | `scheduledAt` ISO datetime with timezone offset, `_rev`; native scheduling only; no Songhealth policy hook |
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
All semantic `title` fields and Document `file` also have native `required: true`. File values
use native objects containing a media `id`, not a copied file or an immutable evidence snapshot.
Create must supply required fields; an update may omit an unchanged field but must not invalidly
clear it. Native validation failures remain distinguishable from permission/state refusals.

Raw native input normalization is distinct from, and precedes, that schema
validation (accepted V1 limitation, Product Owner approval
`01a13ed2-7a42-7aa7-b8a9-546c558ef316`): the pinned EmDash 1.1.0
create/update-time media value normalization (`src/media/normalize.ts`, the
documented URL-input creation path) accepts three exact observed raw file
inputs — `""` and `"not-an-object"` (strings that are neither http(s) URLs,
internal media URLs nor resolvable local media IDs) and `{id: 123}` (no
explicit `provider`/`src`) — storing, respectively,
`{provider: "external", id: "", src: ""}`,
`{provider: "external", id: "", src: "not-an-object"}` and
`{id: "", provider: "local"}`. These are observed results for those exact
inputs, not universal rules. Omitted/null files
and objects with neither `id` nor `src` are still native refusals, and all
other requiredness/type/format refusals above are unchanged. A normalized empty
`id`/`src` is not a selection of any real available file and grants no
availability or retention guarantee; no hook, validation engine or core change
is introduced.

## Validation Contract — Native Only

1. **Create/save:** EmDash schema enforces `required` fields/references,
   type/format/unique values and relation/cardinality constraints. Semantic
   titles, Document file and Health Report → Document use native save-time
   requiredness. An otherwise incomplete draft is saveable where native
   validation permits. Supplying invalid values can still be rejected.
2. **Publish/Schedule:** A user with native RBAC publish authority may act
   without article review, approval, Songhealth confirmation or a custom
   publication completeness gate. EmDash's built-in role/lifecycle/time/
   revision and applicable built-in checks remain in force. Native publication revalidates
   reference requiredness/cardinality; Schedule retains its actual native action semantics,
   without assuming the same reference predicate at every action point. Missing optional content/
   taxonomy selections are not blocked by Songhealth hooks.
3. **Relationships:** Optional/conditional selections remain editorial
   context. No custom reference-selection adapter, effective-selection
   reconstruction, relation snapshot or action-point predicate exists.
4. **Availability:** A valid selected reference/file does not guarantee
   published target, immutable bytes, future availability or removal veto.
   D-ITA/D-REF remain deferred. Public reads follow published-only safety.

No `content:beforePublish` / `content:beforeSchedule` registration,
`hooks.content-policy:register` capability, `taxonomies:read` plugin,
`src/plugins/publication-validation.ts` source or extra middleware is
authorized. Native errors are reported truthfully; supplied-invalid data,
permissions or state conflicts do not become false success.
No required taxonomy, meaningful-body/gallery/channel heuristic, extra reviewer or article
quality decision is substituted for the removed completeness policy. A native-authorized,
natively valid record with optional omissions may publish/schedule.

## Outcomes and Revision Limits

Use the native success/error envelope truthfully. Expect native validation/authorization/conflict codes and actual EmDash
outcomes; no Songhealth hook policy-cancellation codes are expected. Refusal
must not be shown as success; uncertain actions require a current-state read before retry.

Published content-data/reference edits stage under native revisions. Taxonomy/SEO/byline side writes
and shared asset changes are not frozen with them. At due time, the native scheduler uses
EmDash's built-in publishing path; native errors may leave a scheduled/overdue item. Observe actual state/reason/logs—no uniform recovery or
new retry scheduler is promised. No early publication or automatic domain expiry/unpublish.

Acceptance evidence must exercise trusted direct APIs as well as UI, current/stale `_rev`, locks,
native mandatory-reference save/publication semantics, native Publish/Schedule
permissions and truthful failure states; no custom hook fixtures. Detailed journeys are in [quickstart.md](../quickstart.md). No result in
this contract is declared PASS before implementation and independent verification.
