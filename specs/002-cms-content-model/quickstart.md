# CMS Content Model — Quickstart Verification Guide

**Planning artifact, not execution evidence.** Run these journeys only after bounded implementation
authorization, native schema/plugin delivery and required readiness. Current repository has no
Feature 002 application/schema/tests implementation. The official Plan is complete as documentation;
this guide does not authorize Checklist/Tasks/Analyze/Implementation or production operations.

Model/rules: [data-model.md](data-model.md), [spec.md](spec.md#q1-native-validation-matrix--retained-v1),
[editorial contract](contracts/native-editorial.md), [public-read contract](contracts/public-read.md).

## Prerequisites and Native Setup

Use the existing [README](../../README.md) native development environment only: Node **24.21.0**,
npm **12.2.0**, pinned lockfile, rootless-Podman PostgreSQL helper, configured development inputs,
local `./media`, and canonical startup/readiness evidence. Native production passkeys are not
automated. T022/T028 stay PENDING until separately authorized; this guide never executes or waives
their production durability/recovery gates.

After source implementation is authorized/delivered, run from repository root:

```bash
node --version
npm --version
npm ci
```

Configure/load ignored `.env` and prepare media according to README §§2–3; never print secret inputs.
Use the existing helper and native server in the configured environment:

```bash
npm run dev-db:start
npm run dev-db:status
npm run dev
```

Run the server in a foreground terminal; keep its cleanup handle/terminal. In a second terminal,
point the test runner at the configured `EMDASH_SITE_URL` without changing production configuration.
An initialized DB needs native schema inspection/application through approved implementation;
editing seed alone must not be assumed to migrate it. Confirm the native collections/relations and
the two-hook validation plugin are present/active before accepting any results. No private-table
scripts or new development stack.

Development testing access uses native `POST /_emdash/api/setup/dev-bypass?token=1` as described in
README §7. Capture any token only in ignored mode-0600 scratch; never print/commit it. Prepare native
Contributor, Author/Editor and Administrator test access with approved native accounts/roles; no
custom role system or automated production passkey ceremony. Fixtures are synthetic/public-publishable.
Do not overwrite real records, invent official inventories or treat synthetic Area codes as official.

## Runnable Native API Check — Mandatory Reference Versus Other Draft Gaps

Prepare `.tmp/feature002/curl-auth.cfg` privately with the native test token, and two JSON payload
files with actual fixture IDs obtained from native responses. The first payload can be:

```json
{"data":{"title":"Synthetic report draft"},"references":{"report_document":[]}}
```

The second differs by a single selected existing Document ID:

```json
{"data":{"title":"Synthetic report draft"},"references":{"report_document":["<fixture-document-id>"]}}
```

The second is intentionally incomplete in other scalar/classification publication values. Invoke
the existing native endpoint using private auth configuration (no secret in logs/command arguments):

```bash
curl --silent --show-error --config .tmp/feature002/curl-auth.cfg \
  --json @.tmp/feature002/report-missing-reference.json \
  "$EMDASH_SITE_URL/_emdash/api/content/health_reports"
curl --silent --show-error --config .tmp/feature002/curl-auth.cfg \
  --json @.tmp/feature002/report-with-reference.json \
  "$EMDASH_SITE_URL/_emdash/api/content/health_reports"
```

Expected: first native create refuses the missing mandatory selection; second draft creates with
the required selection while other permitted values are incomplete. Then use the returned ID and
current `_rev` with native publish/schedule endpoints from the editorial contract: incomplete scalar/
classification values must receive readable policy refusal. Fill the model's publication fields and
retry with a refreshed `_rev` to obtain the native permitted outcome. Save the body/error/status
evidence without secret headers. Do not call a save refusal a publication-only check or claim all
missing-reference drafts save.

## End-to-end Journeys and Evidence

| Journey | Steps / expected outcome | Traceability |
| --- | --- | --- |
| Ten native semantic kinds | Create/reopen permitted drafts, identify fields and native title/media/types; no duplicate Featured/Health News/leadership kind or Basic Page substitution | US1–4, SC-001, FR-001/003–013/030 |
| Mandatory Report Document | Empty/omitted selection refuses create; wrong target/too many selections follows native refusal; valid single selection permits an otherwise incomplete draft; invalid clear refuses save | US2.6, FR-002/026, SC-006 |
| Other incomplete drafts | Omit one P data/classification predicate per applicable matrix row while satisfying native mandatory references (for Activity media, omit both alternatives); save succeeds where native permits; malformed supplied values retain native refusal | US1.6–7, FR-002, SC-006 |
| Optional/conditional relations | Empty optional Documents/facility/Organization links save and do not trigger invented conditional publication gates; preserve needed editorial context manually | Current Q1 matrix, FR-026 |
| Publication predicates | With active hooks, omit each applicable P predicate at manual publish and schedule acceptance, respecting alternatives/conditions; readable native policy refusal. Restore valid values and verify native permitted action | US1.7, US6, SC-005/006 |
| Due-time revalidation | Schedule a complete candidate; clear an allowed P field or current required taxonomy selection before due time; no early publication, due-time refusal and native state/reason evidence; valid candidate publishes through ordinary scheduler | FR-023/026, SC-005/006 |
| Native reference action semantics | Schedule uses its native checks, not a custom selection predicate. After authorized independent target mutation, record native publication/overdue outcome; this tests actual native constraints, not a D-REF veto | US2.6–8, deferred-scope boundary |
| Data/metadata revisions | Publish, stage content-data/reference edits, compare public/live versus authorized preview; verify current taxonomy/SEO/byline/shared-media boundary without promising frozen side data | US6.2, FR-022/024, SC-005 |
| Roles/concurrency/lifecycle | Draft-only direct publish/schedule refused; own/others permissions enforced; stale `_rev`/lock conflict does not silently overwrite; native Trash/restore and administrator trash-first content purge | US6, FR-021/024/025/027, SC-005/006 |
| Document/media reuse | Select one Document/file from Announcement, Service, Report and applicable About content; IDs/file stay shared; select raw image without a semantic Document. Native replacement/removal changes current state or becomes unavailable | US2, FR-004–007, SC-002 |
| Current Personnel | Change/end current assignment on same ID, maintain appropriate public visibility; no account/permission change, past directory or sensitive HR fields | Q2, US3, FR-008/009/028 |
| Service/facility/Area | One Service at two facilities via both native selector sides; same IDs, official-code fixtures preserved, location versus coverage distinct; ownership has four current Product meanings | US4, SC-003, FR-011–013 |
| Conditional Organization | Only with a recorded genuine shared-object case, activate/test the one conditional variant and justified links; otherwise demonstrate owner-text maintenance without an Organization collection | US3.3, FR-010/031 |
| Native public reads | In the Astro test harness, published-context queries exclude drafts/trashed targets; authorized signed preview sees intended pending data, unauthenticated preview parameter cannot; missing targets/files produce safe native outcomes | US2.7, FR-020/026, public-read contract |
| Thai maintenance | Staff find/select/reopen/correct records and errors with recognizable labels, gallery/relations/taxonomy/schedule timezone; correct platform English fallback permitted; no undocumented technical intervention | US7, SC-007 |
| §23/model review | Review every proposed resource/relation and rejected duplicate/subsystem; conditional variants require their documented case; no D-ITA/D-REF fixture is counted as implemented/PASS | FR-031/032, SC-008 |

Taxonomy terms have native maintenance, not a content publication lifecycle. Code hierarchy and
classification appropriateness use the supplied authoritative inventory/editor review; automatic
classification predicates check required presence. Deferred ITA/evidence and target-removal/atomicity
fixtures stay outside the V1 denominator. Missing files do not imply a confidential-media guarantee.

## Automated Verification After Implementation

Existing test commands are reusable, but the Feature 002 scenarios must first be authored within
the authorized implementation/test scope. Foundation browser smoke alone does not prove this model.
The planned native query harness belongs under tests, not a new production route/public API.

```bash
npm run build
PLAYWRIGHT_BASE_URL="$EMDASH_SITE_URL" npm run test:browser
```

Record exact commit/tool versions, active schema/plugin/role preconditions, native outcome/error
codes, scenario IDs and independent review/UAT evidence. Report failures or skipped cases truthfully;
no runtime result is provided by this Plan. Required-reference and hook tests must cover native API
calls and all supported origins/action points, not only hidden UI controls. Disabled/missing plugin
is a failed configuration precondition and must not be misreported as enforced Q1.

## Cleanup

Stop the foreground server with Ctrl-C in its owning terminal. Stop only a development database
container started by this test run using the existing helper:

```bash
npm run dev-db:stop
```

Never delete named volumes or existing media/production data. Manage only this run's synthetic
fixtures via authorized native lifecycle, and remove secret scratch credentials after successful
evidence capture. T022/T028 remain PENDING; no merge, deployment or later Spec Kit phase is implied.
