# CMS Content Model — Quickstart Verification Guide

**Reconciled with the delivered model and the executed commands (T034, 2026-10-29).** Results
are recorded in the evidence files, not here: T022 and T033 executed every command below on the
single runtime (`evidence/T022-us6-native-safety.md`, `evidence/T033-model-verification.md`). These are
proportionate future development checks for the approved native-only Product scope, instruction
`01a137d4-3956-7621-92a5-a654dea51ef2`. No custom publication
validation hook, human article approval or extra confirmation is planned.
See [spec.md](spec.md#q1-native-validation-matrix--retained-v1),
[data-model.md](data-model.md), [editorial contract](contracts/native-editorial.md)
and [public-read contract](contracts/public-read.md).

## Prerequisites and Environment

**Development runtime replacement (2026-10-28, T036):** the single development runtime is now
the UID-1000 rootless Podman + systemd Quadlet runtime at `http://127.0.0.1:4324/` described in
the [README](../../README.md) and
[docs/operations/development-quadlet.md](../../docs/operations/development-quadlet.md). Its
read-only check is `~/dev/songhealth-quadlet/scripts/dev-runtime-verify.sh`, and programmatic
Admin/API calls use its development PAT `~/.local/state/songhealth-qdev/dev-pat` (mode 0600).
The earlier UID-1001 runtime (origin `http://127.0.0.1:4322/`, Runtime Controller and auth-file
loader) was deleted on 2026-10-29 (T037); its wording remains in Git history.

**Delivered native model.** The model is verified by `evidence/t033/model-check.py`.
- **Collections and fields.** Ten collections with 80 fields, matching `data-model.md`. Only
  `title`, `documents.file` and `health_reports.report_document` are required at save.
- **Taxonomies and relations.** Nine Songhealth taxonomies (`area` is hierarchical) and six
  relation edge sets.
- **Supports.** Every collection has native `drafts`, `revisions`, `preview` and
  `scheduling`. No collection enables SEO, so a native SEO write is refused with
  `VALIDATION_ERROR`.
- **Organization.** The conditional `organizations` variant is **N/A**: no shared-organization
  case is recorded, so owner text fields carry ownership (T025).
- **Datetimes.** EmDash stores them as UTC ISO: `…T09:00:00+07:00` reads back as
  `…T02:00:00.000Z`.

**Schema: bootstrap versus an existing database.** The installer runs EmDash's
`setup/dev-bypass` once, on a fresh database only, and that applies `seed/seed.json`.
- On an existing database, editing the seed changes nothing: apply a schema change with
  EmDash's native schema operations, then re-run the T033 model check.
- `dev-runtime-update.sh` promotes source only; EmDash applies its own core migrations in
  development.

There is no parallel dev runtime and no second development stack. T022/T028 Feature 001
durability/recovery are still **PENDING** and are not redefined, waived or silently passed here.
- T028 still requires T022 PASS plus accepted T023–T027 sources, including runtime-secret
  recovery.
- T030 still requires T028 PASS plus accepted T029 sources.
- Required readiness belongs to later bounded implementation/acceptance authorization.

This guide produces no new runtime result by itself.

After bounded implementation authorization and accepted schema setup, check the runtime (it is
already running; do not start another server against its origin):

```bash
~/dev/songhealth-quadlet/scripts/dev-runtime-verify.sh
```

For automated development Admin/API access on the already-initialized shared runtime,
reuse the existing mode-0600 native development PAT through
`loadDevAccessToken()` / `createPatActor()` in `tests/browser/cms.helpers.ts`.
- **Role cases.** They use the installer's role fixture: `role-fixture@songhealth.test`, an
  Author with its own 0600 PAT in `role-fixture-pat`. EmDash offers no native way to create a
  second account on the IP origin: an invite needs a passkey.
- **Admin UI journeys.** They sign the test browser in through EmDash's development-only
  `GET /_emdash/api/auth/dev-bypass` (`SONGHEALTH_ADMIN_SESSION=dev-bypass`) and log out after
  each test. For the existing dev admin that route only sets the session cookie.
The README's dev-bypass route was for initial provisioning; **do not re-call**
`POST /_emdash/api/setup/dev-bypass?token=1` here, as it may rotate access or
re-apply seed. Never log or commit credentials. Use synthetic public-publishable test data.
For permission fixtures, the role suites move the role fixture between native roles with the
Administrator's native user API and restore it to Author afterwards. An Admin token alone does
not prove draft-only refusal or own/others boundaries. Do not invent a role or impersonation
layer.
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
Export `EMDASH_SITE_URL=http://127.0.0.1:4324` (the development runtime's origin) for the
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

When the actual implementation/tests exist and are authorized. Execution against the single
development runtime is bounded task work. The application is already running at
`http://127.0.0.1:4324`, so do not start another server against that origin. Its read-only
check is `~/dev/songhealth-quadlet/scripts/dev-runtime-verify.sh`
(`docs/operations/development-quadlet.md`).

**Single-runtime reconciliation (2026-10-19; retargeted by T036/T037).**
- T021/T022/T033/T034 use the same persistent Astro/EmDash app, PostgreSQL and media at
  `127.0.0.1:4324`.
- Ordinary Playwright tests and the special native public-read harness target that running
  app. **No runner starts another Astro server or substitutes a second instance**.
- The old standalone programmatic-`dev()` T021 runner assumption is superseded by the
  approved single-runtime design constraint.

**The public-read SSR fixture** is a **dev-only route on that existing server**.
- **Installation (T037).** The runtime's committed development configuration
  (`deploy/dev-quadlet/astro.dev.config.mjs`) installs it in `astro dev` only, and the
  installer provisions its route token. The fixture is verified against pinned Astro 7.3.5 /
  EmDash 1.1.0 and excluded from normal and production builds.
- **Updates.** It reaches the runtime only through promotion
  (`dev-runtime-update.sh --sha <commit>`); merging a PR does not update the runtime.
- **HOLD conditions.** A missing fixture route or a source mismatch is `HOLD`. It is not a
  reason to free port 4324 or to start a second process.

For focused ordinary suites (without the fixture route), run one suite at a time:

```bash
S=~/.local/state/songhealth-qdev
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324 SONGHEALTH_DEV_ACCESS=$S/dev-pat \
SONGHEALTH_ROLE_FIXTURE_ACCESS=$S/role-fixture-pat SONGHEALTH_ADMIN_SESSION=dev-bypass \
  npm run test:browser -- tests/browser/cms-lifecycle.spec.ts --workers=1
```

The suites are:
- `cms-document`, `cms-authoring` and `cms-reuse` (US1/US2);
- `cms-personnel` (US3) and `cms-facilities` (US4);
- `cms-lifecycle` and `cms-revisions` (US6, with role cases);
- `cms-lifecycle-ui` (the US6 Admin UI: publish, lock, required Document);
- `cms-editor` (the US7 Admin journeys);
- `foundation` (the Feature 001 regression).

Without the role fixture, the role cases skip. Without the dev Admin session, the Admin UI
journeys skip.

Invoke the single-runtime coordinator from a checkout at the runtime's promoted commit:

```bash
SONGHEALTH_DEV_ACCESS=~/.local/state/songhealth-qdev/dev-pat \
SONGHEALTH_T021_ROUTE_ACCESS=~/.local/state/songhealth-qdev/t021-route-access.json \
  node tests/browser/run-cms-public-reads.mjs
```

It must only coordinate Playwright and owned fixture cleanup against the
existing origin; it must not call programmatic `dev()`, `npm run dev`, or
terminate/restart the persistent server. The public-read suite is excluded
from ordinary suite invocations and run through this dedicated coordinator.
T033 uses that same sequence; T034 records only executed and verified commands.

The production build is checked in a clean checkout with `npm ci`. `astro.config.mjs`
validates its runtime inputs at build time, so supply the non-secret placeholder values of
`deploy/Containerfile`. Then confirm that `dist/` contains no reference to the T021 fixture
(`__feature002`, `cms-public-reads`).

Record exact commit, versions, native schema state and observed results
without secrets; never call planned checks PASS until actually executed. Report unavailable staff
evidence and real inventory inputs as pending, not completed by source inspection. Check only the
affected journeys during development; run a cohesive feature smoke before claiming the active SCs.
Stop nothing shared: the persistent runtime's containers and volumes stay up across tasks.
Clean only owned synthetic fixtures and private credential scratch after recording secret-free
results. Do not delete named volumes, existing media or production data. No merge,
deployment or Feature 001 recovery gate is authorized by this guide.
