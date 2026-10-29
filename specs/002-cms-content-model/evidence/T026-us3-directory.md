# T026 — US3 Directory Evidence (T025 conditional Organization disposition: N/A; T026 execution NOT EXECUTED)

**Feature**: `002-cms-content-model`
**This revision's task**: T025 [US3] — the conditional Organization branch of
[`../tasks.md`](../tasks.md) T025, executed as its **N/A owner-text disposition** into this
evidence path. **T026 itself is NOT EXECUTED — PENDING separate authorization and
prerequisites** (see §4); this file currently contains the T025 disposition only.
**Issue**: Multica `9GOTSTORY-262` (`01a1641f-9f09-7b95-b2e2-2ea6d45a6f55`)
**Executor**: `claude-developer` (Developer), delegated by `codex-lead-reviewer`; initial
handoff, corrective rounds 0 used.
**Authorization**: Product Owner-authorized **T025 documentation-only conditional
Organization N/A disposition**, delegated through the Lead handoff on 9GOTSTORY-262
(2026-10-22). Source-authoring/documentation only: no runtime access or execution, no
seed/schema application, no database/media/credential writes, no application start/build,
no merge/deployment, no T026/later task dispatch, no task-marker change, no Final
Acceptance claim.

## 0. Document standing

[`../tasks.md`](../tasks.md) T025 names this file (`specs/002-cms-content-model/evidence/T026-us3-directory.md`)
as the evidence path for its N/A branch: *"otherwise record N/A and the owner-text reason in
`specs/002-cms-content-model/evidence/T026-us3-directory.md` and create no Organization
schema/links."* This file was absent at the accepted input and is created here solely to
carry that disposition. **The evidence filename does not establish T026 completion**; T026
(inspect/apply US3 definitions, run T023, record execution results) remains unexecuted and
would append its own separately authorized content under §4's pending state.

## 1. Exact identifiers, inputs and cited authority

| Item | Value | Source / authority |
| --- | --- | --- |
| Accepted input (exact) | T024 `42993eb664add79b5e2e410e611518d57691257c` (PR #30, OPEN/unmerged) | Product Owner T024 acceptance record — [PR #30 comment 6343542704](https://github.com/9GotStory/songhealth/pull/30#issuecomment-6343542704): *"T024 SOURCE AUTHORING = ACCEPTED"* (source authoring only) |
| Parent | T023 `0daeaa5736537a3ef5783d7eaae37ee5cb43ce0d` (PR #29, OPEN/unmerged) | same acceptance record; accepted T023 test-source authoring |
| Canonical baseline | `002-cms-content-model` at `01ae470ddc10e60c107c1e4d68be75c43d236736` | verified by `git rev-parse origin/002-cms-content-model` before and after this task (unchanged) |
| Frozen/open heads preserved | PR #27 `e7e21d685563aded31ee9908320426dc7b4d9690`; PR #28 `7e9b01947844db6a1ac722617a376e188fbdda81`; PR #29 `0daeaa57…`; PR #30 `42993eb6…` | all re-verified OPEN at these exact SHAs before and after; no merge, rebase, push-force or branch change |
| T025 conditional test | *"Only for a genuine shared-object case recorded by T001"* | [`../tasks.md`](../tasks.md) T025; dependency section: *"T025 is conditional: a recorded **N/A** owner-text disposition satisfies its edge without claiming Organization implementation."* |
| Demonstrated-reuse input | **No demonstrated shared Organization reuse case exists** | [`T001-development-inputs.md`](T001-development-inputs.md) §6, row 1: *"PENDING — not demonstrated. The owner-text default governs; T025's conditional branch is expected N/A unless a genuine case is demonstrated before T025 executes."* |
| Product authority | Organization exists only for meaningful reuse; owner text otherwise | [`02` §8](../../../docs/website-modernization-docs/current/02-content-model.md) (Personnel owner fields incl. Organizational Unit), [§9](../../../docs/website-modernization-docs/current/02-content-model.md) (Organization *"ใช้เมื่อองค์กร/หน่วยงานมีข้อมูลและถูกอ้างซ้ำอย่างมีความหมาย"* — used when the organization has data and is meaningfully reused), [§15](../../../docs/website-modernization-docs/current/02-content-model.md) (owner-held contact), [§23](../../../docs/website-modernization-docs/current/02-content-model.md) (Implementation Mapping Gate) |
| Feature artifacts | [`../spec.md`](../spec.md) US3 scenario 3, FR-008–010, FR-031; [`../data-model.md`](../data-model.md) conditional `organizations` row, §23 Mapping Accounting; [`../research.md`](../research.md) §5 | as cited below |

No newer reuse case is supplied by issue 9GOTSTORY-262; the issue authorizes this
documentation disposition only.

## 2. T025 conditional Organization disposition — **Organization: N/A for this authorized T025 disposition**

T025's activation condition has not been met. [T001 §6](T001-development-inputs.md) records
that **no demonstrated shared Organization reuse case exists** in current observations or in
any accepted artifact — the baseline defines zero Product collections exercising any
shared-object reuse — and no genuine case has been demonstrated between T001 and this
disposition. Per [`../tasks.md`](../tasks.md) T025, the conditional branch therefore resolves
to its recorded alternative:

> **Organization: N/A for this authorized T025 disposition** — no genuine shared-object
> reuse case has been demonstrated, so the owner-text default governs.

- **Owner unit/provider/affiliation text is the accepted default.**
  [`02` §8](../../../docs/website-modernization-docs/current/02-content-model.md) keeps
  Organizational Unit and current public assignment as Personnel owner data;
  [`../research.md`](../research.md) §5 decides *"No Organization collection by default
  without the existing demonstrated-reuse case. Use current unit/provider/affiliation text
  on its owner."*; [`../data-model.md`](../data-model.md) records *"Without a confirmed
  current reuse case, native owner unit/provider/affiliation fields remain the default."*
  The accepted T024 `personnel` definition (see §3) carries exactly these owner-text fields.
- **A repeated organizational name alone supplies no demonstrated shared metadata case.**
  [`../spec.md`](../spec.md) US3 scenario 3 activates Organization only for *"an
  organization with its own metadata reused by several records"* — shared identity/metadata
  with demonstrated reuse, per FR-010 (*"Organization MUST become a reusable entity only
  where identity/metadata and demonstrated reuse justify it; … Internal/external naming
  alone MUST NOT require separate entities."*) and FR-031/`02` §23's four mapping questions.
  The same organizational name appearing in several owners' text fields demonstrates
  co-occurrence, not a shared maintained object, and does not satisfy that condition.
- **This records the existing condition — it invents no permanent prohibition and no new
  workflow.** A future genuine demonstrated case remains the existing §23 input
  ([`../data-model.md`](../data-model.md): *"Demonstrated reuse is the existing §23 input,
  not a newly invented workflow phase"*). Such a case would require its own bounded
  implementation authorization under the established review workflow before any
  `organizations` variant or link is defined; nothing in this disposition amends
  [`../spec.md`](../spec.md), [`../data-model.md`](../data-model.md),
  [`../tasks.md`](../tasks.md) or any current authority, or creates a new approval phase.

## 3. What is not created, and preservation of accepted source

**No Organization schema or link is created by this disposition.** Explicitly:

- no `organizations` collection (or any variant) is defined in
  [`../../../seed/seed.json`](../../../seed/seed.json);
- no Organization selector/reference field exists on any collection;
- none of the three conditional relations — `personnel_organization`
  (Personnel `organization` → Organization), `organization_parent` (Organization
  self-parent), `facility_organization` (Health Service `organization` → Organization) —
  is declared or bound.

Verified against the accepted input `42993eb664add79b5e2e410e611518d57691257c` and
re-verified on this candidate: the seed's collection set is exactly the nine accepted
collections (`documents`, `pages`, `news`, `activities`, `announcements`,
`health_content`, `services`, `health_reports`, `personnel`); the strings
`personnel_organization`, `organization_parent` and `facility_organization` occur **zero**
times; the only `organizational_unit`/`current_assignment` occurrences are the accepted
T024 `personnel` owner-text fields. The accepted `personnel` definition is preserved
byte-for-byte: nine fields with only `title` (ชื่อที่แสดง) required; optional owner text
`current_assignment` (ตำแหน่ง/หน้าที่ปัจจุบัน — current public assignment) and
`organizational_unit` (หน่วยงานสังกัด — organizational unit); optional `prefix`,
`first_name`, `last_name`, `profile_image`, `public_visible`, `public_contact`; native
drafts/revisions/preview/scheduling; `titleField: "title"`; no account link, assignment
history, Citizen ID/DOB/private address or HR data.

**Every pre-existing repository file is byte-identical to the accepted input.** This task's
entire change is the creation of this one evidence document; `seed/seed.json`,
[`../../../tests/browser/cms-personnel.spec.ts`](../../../tests/browser/cms-personnel.spec.ts)
(accepted T023), [`../tasks.md`](../tasks.md) checkboxes and all other source, governance,
manifest/lockfile and evidence files are untouched (verified by full-tree comparison:
input-to-candidate diff inventory is exactly one added file, this path, with zero
modifications or deletions).

**Future facility affiliation text remains a downstream requirement, not a delivered Health
Service schema.** `health_services`/`facility_type` are not defined at this baseline (they
are US4 T028 scope); T028's conditional `facility_organization` remains inactivated by this
N/A disposition, under which T028 preserves its `affiliation_text` owner field per
[`../tasks.md`](../tasks.md) T028. No Health Service schema, affiliation field or facility
data is delivered or claimed here.

## 4. T025 N/A documentation versus T026 execution — **NOT EXECUTED — PENDING**

These two states are distinct and must not be conflated:

| State | Standing |
| --- | --- |
| **T025 N/A documentation** (this document, §2–§3) | Authored under the 9GOTSTORY-262 bounded documentation authorization; delivered for Lead review, ChatGPT Independent Review and Product Owner acceptance. Claims nothing beyond the recorded disposition. |
| **T026 execution/verification** | **NOT EXECUTED — PENDING separate authorization and prerequisites.** No US3 schema inspection/application, no T023 test run, no runtime observation of any kind. The evidence filename creates no T026 completion: T026's execution record does not exist in this file and remains to be appended under its own authorization. |

No runtime proof is claimed or implied: **no** same-ID assignment change/visibility/contact
evidence, **no** account permission/authorship observation, **no** native revision behavior,
**no** public-read evidence. T023's acceptance remains **test-source authoring only** and
T024's acceptance remains **source authoring only** (PR #30 comment 6343542704: *"This
accepts the authored seed definition only"*; Personnel runtime behavior awaits independently
authorized execution/verification). **T022 remains DEFERRED — NOT PASSED** and its runtime
dependency is not waived by this disposition; the 2026-10-22 T023 source-authoring exception
(authorizing T023 test authoring only) does not relax T024–T026 prerequisites, and
[`../tasks.md`](../tasks.md) still joins T023→T024→T025→T026 to the unmet T022 runtime
acceptance for execution. Feature 001 T022/T028 standing is unchanged: PENDING, no gate
executed, no marker touched.

## 5. Dependency-edge standing and non-claims

[`../tasks.md`](../tasks.md) (Dependencies & Execution Order) states: *"T025 is conditional:
a recorded **N/A** owner-text disposition satisfies its edge without claiming Organization
implementation. Missing evidence for an applicable outcome is pending, not N/A or PASS."*
The disposition recorded in §2 is the applicable N/A branch — the activation condition
(genuine demonstrated reuse) is absent and truthfully recorded as such — so, **after this
artifact passes its required reviews and receives Product Owner acceptance**, it can satisfy
T025's conditional dependency edge in the task graph.

This document itself claims none of that. It claims **no** Organization implementation, **no**
US3 runtime acceptance, **no** full-feature acceptance, and **no** permission to dispatch
T026 or any later task (T027+ consume T026, not this document). Task markers in
[`../tasks.md`](../tasks.md) are unchanged by this task: a checked marker records task
completion only, and Lead review PASS, ChatGPT Independent Review PASS and Product Owner
Final Acceptance are separate states evidenced per artifact — none is claimed here.
