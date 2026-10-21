# CMS Content Model — Quickstart Verification Guide

**Reconciled official Phase 1 guide for Independent Review; no runtime PASS.** These are
proportionate future development checks for the approved native-only Product scope, instruction
`01a137d4-3956-7621-92a5-a654dea51ef2`. No custom publication
validation hook, human article approval or extra confirmation is planned.
See [spec.md](spec.md#q1-native-validation-matrix--retained-v1),
[data-model.md](data-model.md), [editorial contract](contracts/native-editorial.md)
and [public-read contract](contracts/public-read.md).

## Prerequisites and Environment

Use the single persistent development runtime documented in the [README](../../README.md):
the single Fedora environment, account `multica-agent` (UID 1001), rootless Podman +
Podman Compose; containers `songhealth-dev-app` (Astro 7.3.5 SSR + EmDash 1.1.0 on the pinned
Node 24.21.0/npm 12.2.0 tooling image) and `songhealth-dev-postgres` (PostgreSQL 18.6);
dedicated persistent database/media volumes; stable source
`/home/multica-agent/projects/songhealth-dev` pinned to the accepted Feature 002 SHA; Runtime
Controller `/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh`; development
origin `http://127.0.0.1:4322/`. The runtime and its data survive Multica issues and agent
sessions; `status` and `verify` are the only authorized routine controller operations. No
parallel dev runtime and no second development stack. T022/T028 Feature 001 durability/recovery
are still **PENDING** and are not redefined, waived or silently passed here. T028 still
requires T022 PASS plus accepted T023–T027 sources (including runtime-secret recovery); T030
still requires T028 PASS plus accepted T029 sources. Required readiness belongs to later
bounded implementation/acceptance authorization. The pinned toolchain runs inside the shared
runtime's tooling image; this guide produces no new runtime result by itself. Accepted
activation evidence covers SSR, Admin authentication, native build, migration 90/90 and
existing persistence with `state.complete=true`; live HMR, a new full persistence-restart test
and automatic startup after a Fedora reboot remain **NOT TESTED** — never documented as PASS.

After bounded implementation authorization and accepted schema setup, check the shared runtime
(it is already running detached; do not start another server against its origin):

```bash
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh status
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh verify
```

For automated development Admin/API access on the already-initialized shared runtime,
reuse the existing mode-0600 native development PAT through
`loadDevAccessToken()` / `createPatActor()` in `tests/browser/cms.helpers.ts`.
The README's dev-bypass route was for initial provisioning; **do not re-call**
`POST /_emdash/api/setup/dev-bypass?token=1` here, as it may rotate access or
re-apply seed. Never log or commit credentials. Use synthetic public-publishable test data.
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
Export `EMDASH_SITE_URL=http://127.0.0.1:4322` (the shared runtime's development origin) for the
examples below, then send each payload to the existing endpoint:

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

When the actual implementation/tests exist and are authorized. Execution against the shared
runtime is bounded task work: the only authorized routine controller operations are
`status`/`verify`, and the application is already running detached at
`http://127.0.0.1:4322` — do not start another server against that origin.

**2026-10-19 single-runtime reconciliation:** T021/T022/T033/T034 use the same
persistent Astro/EmDash app, PostgreSQL and media at `127.0.0.1:4322`.
Ordinary Playwright tests and the special native public-read harness target that
running app. **No runner starts another Astro server or substitutes a second
instance**. The old standalone programmatic-`dev()` T021 runner assumption is
superseded by the approved single-runtime design constraint.

The public-read SSR fixture requires a **dev-only route on that existing server**.
Before any T022 run, independently verify the integration against pinned
Astro 7.3.5 / EmDash 1.1.0, ensure its native public/preview request context is
authentic, prove the fixture is excluded from normal/production builds, and
obtain separate Product Owner authorization for any source promotion, private
dev-config registration or app restart through the Runtime Controller's
reviewed maintenance path. The stable source is not updated by PR merge.
A missing fixture route, unsupported installation method or source mismatch is
`HOLD`, not a reason to free occupied port 4322, start a second process or
silently change the controller. Routine controller permissions remain
`status` and `verify`.

For focused ordinary suites (without the fixture route):

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 npm run test:browser -- tests/browser/cms-lifecycle.spec.ts
```

When **separately authorized** T022 preconditions and route registration have
been satisfied, invoke the single-runtime coordinator:

```bash
node tests/browser/run-cms-public-reads.mjs
```

It must only coordinate Playwright and owned fixture cleanup against the
existing origin; it must not call programmatic `dev()`, `npm run dev`, or
terminate/restart the persistent server. The public-read suite is excluded
from ordinary suite invocations and run through this dedicated coordinator.
T033 uses that same sequence; T034 records only executed and verified commands.

**2026-10-21 T022 disposable-runtime exception (PO decision
[6305625001](https://github.com/9GotStory/songhealth/issues/26#issuecomment-6305625001),
Multica authorization `01a15c0f-067c-756c-85a1-0331f764b5de`):** the serial
T022 join may instead run against ONE task-owned disposable runtime — a
fresh checkout of the accepted source, a task-unique PostgreSQL (pinned 18.6
digest) with its own volume on a recorded free loopback port, a host `astro
dev` process on a loopback port other than 4322 with a fresh `./media`, and
a task-private dev config registering the existing T021 integration. The
coordinator's explicit disposable mode (`SONGHEALTH_T021_DISPOSABLE_ORIGIN`
plus `SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA` — the committed execution SHA
the checkout's clean HEAD must match) replaces the controller observation
with verified checkout provenance plus the protected route identity probe,
pins `PLAYWRIGHT_BASE_URL` to the disposable origin and exports
`SONGHEALTH_T021_TARGET_ORIGIN` for the spec's target guard; the persistent
origin 4322 is refused in this mode before any request or credential read.
Serial usage on that one disposable app:

```bash
PLAYWRIGHT_BASE_URL=<disposable origin> npm run test:browser -- tests/browser/cms-lifecycle.spec.ts --workers=1
PLAYWRIGHT_BASE_URL=<same origin> npm run test:browser -- tests/browser/cms-revisions.spec.ts --workers=1
SONGHEALTH_T021_DISPOSABLE_ORIGIN=<same origin> \
SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA=<execution SHA> node tests/browser/run-cms-public-reads.mjs
```

The exception is bounded to T022 execution: it creates no standing second
development environment, does not change the persistent-only policy for any
other task, and the disposable PostgreSQL/app/media/credentials are cleaned
up as task-owned resources afterward. No controller, sidecar or recovery
framework is introduced. Outside this mode the coordinator keeps its
persistent-only contract unchanged.

Record exact commit, versions, native schema state and observed results
without secrets; never call planned checks PASS until actually executed. Report unavailable staff
evidence and real inventory inputs as pending, not completed by source inspection. Check only the
affected journeys during development; run a cohesive feature smoke before claiming the active SCs.
Stop nothing shared: the persistent runtime's containers and volumes stay up across tasks.
Clean only owned synthetic fixtures and private credential scratch after recording secret-free
results. Do not delete named volumes, existing media or production data. No merge,
deployment or Feature 001 recovery gate is authorized by this guide.
