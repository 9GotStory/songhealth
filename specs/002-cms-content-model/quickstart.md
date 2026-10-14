# CMS Content Model — Quickstart Verification Guide

**Planning artifact only; no runtime PASS.** These are proportionate development
checks for the accepted native-only V1 Content Model. No custom publication
validation hook, human article approval or extra confirmation is planned.
See [spec.md](spec.md#q1-native-validation-matrix--retained-v1),
[data-model.md](data-model.md), [editorial contract](contracts/native-editorial.md)
and [public-read contract](contracts/public-read.md).

## Prerequisites and Environment

Use the single existing [README](../../README.md) workflow (pinned Node/npm,
EmDash 1.1.0, rootless-Podman PostgreSQL 18 helper, configured ignored environment
and persistent local `./media`). No parallel dev runtime or containerized Node.
T022/T028 Feature 001 durability/recovery are still **PENDING** and are not
redefined, waived or silently passed here.

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
Editing `seed/seed.json` alone does not update an existing DB; inspect/apply
native schema with authorized EmDash operations before testing.

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

An authorized staff account may publish or schedule a natively valid record
directly. A draft-only user cannot. Exercise native permission, lock, revision,
time and schedule outcomes with direct API requests and current state re-reads
after uncertain actions. Do not assert a universal schedule/reference
atomicity guarantee or expect custom `PUBLISH_REJECTED` policy cancellation.

## Feature Journeys

| Journey | Bounded outcome | Source |
| --- | --- | --- |
| Ten semantic collections | Native fields, editor labels and ordinary draft/save maintenance without duplicate display kinds | US1–4, SC-001 |
| Native save requiredness | Required title, Document file and Health Report Document enforced by schema; other omissions allowed where supported | FR-002/026, SC-006 |
| Direct Publish/Schedule | Native publisher allowed; draft-only denied; no Songhealth completeness hook/review/confirm | US6, SC-005/006 |
| Native revisions and preview | Published-only public content; authorized preview; no draft leakage and no blanket atomic staging of side metadata | FR-020/022/024 |
| Native references | Same Document identity reused; reciprocal facility/service links; optional relations never mandatory solely for publishing | US2/4, SC-002/003 |
| Shared target unavailable | Published-context readers safely omit unavailable linked content; missing file handled without draft fallback | FR-020/026 |
| Personnel/current assignment | Same Personnel identity updated without assignment-history records or account permission change | US3, SC-001 |
| Area and classifications | Real inventory/code hierarchy and staff-selected taxonomy; no invented taxonomy completeness policy | FR-013/018 |
| Thai staff maintenance | Understandable collection labels, pickers, errors and accepted English platform fallbacks | US7, SC-007 |
| Native lifecycle | Native Trash/restore, admin-only trash-first content purge, native media permission, truthful failures | US6, SC-005/006 |
| Conditional Organization | Only with demonstrated genuine reuse; otherwise owner fields suffice | FR-010/031 |

These are development-oriented verification journeys, **not** a requirement
to run every scenario after every task. Use focused API/build checks for the
actual code/configuration change and a broader feature smoke at completion.
Do not duplicate EmDash's internal test suite or run full production
backup/restore/Passkey/deployment UAT for this development feature.
D-ITA/D-REF historical and cross-record guarantees are deferred.

## Verification Commands and Cleanup

When the actual implementation/tests exist and are authorized:

```bash
npm run build
PLAYWRIGHT_BASE_URL="$EMDASH_SITE_URL" npm run test:browser
```

Record exact commit, versions, native schema state and observed results
without secrets; never call planned checks PASS until actually executed.
Stop only the application and task-owned development database containers:

```bash
npm run dev-db:stop
```

Do not delete named volumes, existing media or production data. No merge,
deployment or Feature 001 recovery gate is authorized by this guide.
