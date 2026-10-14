# CMS Content Model — Quickstart Verification Guide

**Reconciled official Phase 1 guide for Independent Review; no runtime PASS.** These are
proportionate future development checks for the approved native-only Product scope, instruction
`01a137d4-3956-7621-92a5-a654dea51ef2`. No custom publication
validation hook, human article approval or extra confirmation is planned.
See [spec.md](spec.md#q1-native-validation-matrix--retained-v1),
[data-model.md](data-model.md), [editorial contract](contracts/native-editorial.md)
and [public-read contract](contracts/public-read.md).

## Prerequisites and Environment

Use the single existing [README](../../README.md) workflow (pinned Node/npm,
EmDash 1.1.0, rootless-Podman PostgreSQL 18 helper, configured ignored environment
and persistent local `./media`). No parallel dev runtime or containerized Node.
T022/T028 Feature 001 durability/recovery are still **PENDING** and are not
redefined, waived or silently passed here. T028 still requires T022 PASS plus accepted T023–T027
sources (including runtime-secret recovery); T030 still requires T028 PASS plus accepted T029
sources. Required readiness belongs to later bounded implementation/acceptance authorization.
The current shell's Node 24.11.0/npm 11.6.1 are not pinned 24.21.0/12.2.0, so no integration
result is produced here. Use the pinned native environment before executing this guide.

After bounded implementation authorization and accepted schema setup:

```bash
node --version
npm --version
npm ci
npm run dev-db:start
npm run dev-db:status
npm run dev
```

Run the application in a foreground terminal. For automated development Admin/API
access use the native `POST /_emdash/api/setup/dev-bypass?token=1` path documented
in README §7. Keep any token in ignored mode-0600 files; never log or commit it.
No production Passkey automation. Use synthetic public-publishable test data.
For permission fixtures prepare distinct native Contributor, Author/Editor and Administrator
access via supported native account/role operations; an Admin token alone does not prove
draft-only refusal or own/others boundaries. Do not invent a role or impersonation layer.
Editing `seed/seed.json` alone does not update an existing DB; inspect/apply
native schema with authorized EmDash operations before testing.
No publication plugin, custom hook capability or additional confirmation is a prerequisite.

## Focused Native API Checks

Use the existing EmDash API and fresh `_rev` values as documented in the
[editorial contract](contracts/native-editorial.md). Obtain real synthetic
fixture IDs via native responses; do not fabricate authoritative Area codes,
organizations or service/facility inventories.

A Health Report requires an existing Document reference when saved:

```json
{"data":{"title":"Synthetic report draft"},"references":{"report_document":[]}}
```

Expect native save refusal for missing required reference. With a valid
Document ID, the same report may omit other optional values and save:

```json
{"data":{"title":"Synthetic report draft"},"references":{"report_document":["<existing-document-id>"]}}
```

Likewise, a semantic content record needs its native title; a Document
needs its native file. Native supplied-value/type/cardinality errors
must still be refused at create/save. Other missing optional values
or taxonomies do **not** cause a Songhealth publish/schedule rejection.

Prepare private `.tmp/feature002/curl-auth.cfg` with the development token, and payload files
`.tmp/feature002/report-missing-reference.json` and `report-with-reference.json` using the examples
above and actual fixture IDs. The auth file must be ignored/mode-0600; never include it in evidence.
From the configured native development environment, send each payload to the existing endpoint:

```bash
curl --silent --show-error --config .tmp/feature002/curl-auth.cfg \
  --json @.tmp/feature002/report-missing-reference.json \
  "$EMDASH_SITE_URL/_emdash/api/content/health_reports"
curl --silent --show-error --config .tmp/feature002/curl-auth.cfg \
  --json @.tmp/feature002/report-with-reference.json \
  "$EMDASH_SITE_URL/_emdash/api/content/health_reports"
```

Expected: native required-reference refusal, then a draft with that single selection and a title,
despite optional omissions. Also cover missing/null/empty title, missing or malformed Document
file object, invalid clear of a required value, and representative invalid supplied type/format/
select/range/cardinality. A valid native file value has an uploaded fixture media `id`; its
presence does not prove later byte availability. No custom required-field or publication predicate.

An authorized staff account may publish or schedule a natively valid record
directly. A draft-only user cannot. Exercise native permission, lock, revision,
time and schedule outcomes with direct API requests and current state re-reads
after uncertain actions. Do not assert a universal schedule/reference
atomicity guarantee or expect custom `PUBLISH_REJECTED` policy cancellation.
Using the native Publish/Schedule endpoints in the contract, publish a title-only Page and
schedule another with a valid future timezone-offset timestamp/current `_rev`. Expect native
allowed outcomes despite optional omissions; observe actual due-time publication without early
exposure. A native error must remain a truthful refusal/overdue state, not a fabricated success
or a hook-completeness failure. Do not add a scheduler/retry manager or freeze shared metadata.

## Feature Journeys

| Journey | Bounded outcome | Source |
| --- | --- | --- |
| Ten semantic collections | Native fields, editor labels and ordinary draft/save maintenance without duplicate display kinds | US1–4, SC-001 |
| Native save requiredness | Required title, Document file and Health Report Document enforced by schema; other omissions allowed where supported | FR-002/026, SC-006 |
| Direct Publish/Schedule | Native publisher allowed; draft-only denied; no Songhealth completeness hook/review/confirm | US6, SC-005/006 |
| Native revisions and preview | Published-only public content; authorized preview; no draft leakage and no blanket atomic staging of side metadata | FR-020/022/024 |
| Native references | Same Document identity reused; reciprocal facility/service links; optional relations never mandatory solely for publishing | US2/4, SC-002/003 |
| Native public reads | In the existing Astro-runtime test harness, published context excludes drafts/trashed targets, authorized signed preview reads intended pending data, and unauthenticated preview parameters confer no access; handle optional omissions/unavailable targets/files, pagination/errors without draft fallback | FR-020/026, SC-005/006 |
| Personnel/current assignment | Same Personnel identity updated without assignment-history records or account permission change | US3, SC-001 |
| Area and classifications | Real inventory/code hierarchy and staff-selected taxonomy; no invented taxonomy completeness policy | FR-013/018 |
| Thai staff maintenance | Understandable collection labels, pickers, errors and accepted English platform fallbacks | US7, SC-007 |
| Native lifecycle | Native Trash/restore, admin-only trash-first content purge, native media permission, truthful failures | US6, SC-005/006 |
| Conditional Organization | Only with demonstrated genuine reuse; otherwise owner fields suffice and that branch is N/A with a reason | FR-010/031 |
| Delivered model review | Account for every native kind/relation with the existing four §23 questions; no duplicate metadata/entities or unapproved extension | FR-031/032, SC-008 |

These are development-oriented verification journeys, **not** a requirement
to run every scenario after every task. Use focused API/build checks for the
actual code/configuration change and a broader feature smoke at completion.
Do not duplicate EmDash's internal test suite or run full production
backup/restore/Passkey/deployment UAT for this development feature.
D-ITA/D-REF historical and cross-record guarantees are deferred.

## Verification Commands and Cleanup

When the actual implementation/tests exist and are authorized:

Analyze finding **I1** is an existing T021/T033/T034 execution/documentation correction, not a
new task or gate. Against ordinary `npm run dev`, select the relevant ordinary test files explicitly
(example below); exclude `cms-public-reads.spec.ts`. T033 runs all applicable ordinary checks and
then the dedicated public-read runner. Stop only the run-owned ordinary server before that runner;
an occupied origin is a precondition failure, not permission to terminate another process. T021
owns the temporary route and awaited failure/signal cleanup; T034 records final verified invocations.

```bash
npm run build
PLAYWRIGHT_BASE_URL="$EMDASH_SITE_URL" npm run test:browser -- tests/browser/cms-lifecycle.spec.ts
```

After stopping the owned ordinary server, run the public-read check separately:

```bash
node tests/browser/run-cms-public-reads.mjs
```

Record exact commit, versions, native schema state and observed results
without secrets; never call planned checks PASS until actually executed. Report unavailable staff
evidence and real inventory inputs as pending, not completed by source inspection. Check only the
affected journeys during development; run a cohesive feature smoke before claiming the active SCs.
Stop the foreground application with Ctrl-C in its owning terminal and stop only database
containers started by this run:

```bash
npm run dev-db:stop
```

Clean only owned synthetic fixtures and private credential scratch after recording secret-free
results. Do not delete named volumes, existing media or production data. No merge,
deployment or Feature 001 recovery gate is authorized by this guide.
