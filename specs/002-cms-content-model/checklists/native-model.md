# Native CMS Content Model — Requirements Quality Checklist

**Purpose:** Review the quality of retained V1 requirements for Feature 002 before task breakdown. This is a requirements-writing checklist, not implementation, browser, API, runtime, or release testing.
**Created:** 2026-10-14
**Feature:** [spec.md](../spec.md)
**Planning references:** [plan.md](../plan.md), [data-model.md](../data-model.md), [native editorial contract](../contracts/native-editorial.md), [public-read contract](../contracts/public-read.md)
**Focus:** Native content semantics, Q1 save/publication rules, shared sources and visibility, explicit deferred scope.
**Depth:** Standard; **Audience:** Independent requirements reviewer.

**Ownership:** Reviewer-owned quality questions. An item is marked `[x]` only after the reviewer has assessed and accepted the quality of the written requirement; it never represents implementation PASS. All generated items begin unchecked. This is separate from the existing Specify/Clarify `requirements.md`.

## Requirement Completeness

- [ ] CHK001 Are the ten unconditional V1 semantic content kinds distinguished by their real content purpose and fields, without requiring presentation-only duplicates? [Completeness, FR-001, FR-003, Data Model §Collection Fields]
- [ ] CHK002 Are the boundaries among Document, native Media and Health Report specified, including reuse without duplicate file records? [Completeness, FR-004–007, SC-002]
- [ ] CHK003 Are Personnel's current assignment, public visibility, and separation from CMS editing accounts unambiguous, with past-assignment history excluded? [Completeness, FR-008/009, Q2]
- [ ] CHK004 Is Organization's creation conditional on demonstrated shared identity/metadata reuse, with a clear simpler alternative when reuse is absent? [Completeness, FR-010, Data Model §23 Mapping Accounting]
- [ ] CHK005 Are Service, Health Service, Area hierarchy, ownership/channel distinction and reciprocal facility/service meaning specified without creating a transaction engine? [Completeness, FR-011–013, SC-003]
- [ ] CHK006 Are classification taxonomies and the official/stable Area-code requirement distinguished from additional content entities or fabricated seed inventories? [Completeness, FR-013/018/031]

## Validation Clarity and Consistency

- [ ] CHK007 Does the retained Q1 matrix clearly distinguish native save-time requiredness (S), publish/schedule presence predicates (P), and optional/editor-reviewed relationships (O)? [Clarity, FR-002/026, Spec §Q1 Native Validation Matrix]
- [ ] CHK008 Is the mandatory Health Report → Document reference explicitly required at create/save, without simultaneously promising a draft missing that reference? [Consistency, FR-002/007/026, US2.6, SC-006]
- [ ] CHK009 Are incomplete drafts permitted only within native identity, value/format, confidentiality and authorization constraints, without suggesting that every omission is saveable? [Clarity, FR-002, SC-006]
- [ ] CHK010 Are all applicable publication-specific content-data and classification requirements defined with observable, objective presence criteria, including legitimate zero/false values and alternative image/gallery cases? [Measurability, FR-002/026, Data Model §Common Native Contract]
- [ ] CHK011 Are manual publish, schedule acceptance and due-time execution requirements differentiated without claiming unsupported custom reference selection checks or cross-record atomic guarantees? [Consistency, FR-002/023/026, Spec §Q1 Native Validation Matrix]
- [ ] CHK012 Are optional/conditional Document, facility and Organization relations distinguished from automatically enforced publication conditions, and is staff editorial responsibility explicit? [Clarity, FR-026, Native Editorial Contract §Validation Contract]
- [ ] CHK013 Do the spec, owning Product documents and design contracts agree on content-data revisions versus separately maintained taxonomies, SEO, bylines, shared media and linked records? [Consistency, FR-022/024, Plan §Constitution Check]

## Security, Public Reads and Scope Boundaries

- [ ] CHK014 Are the requirements for published-only public reads, authorized preview and unavailable linked targets explicit without allowing anonymous draft exposure? [Coverage, FR-020/026, SC-005, Public-Read Contract]
- [ ] CHK015 Are native roles, ownership, schema administration, trash/restore, permanent-content deletion and separate media removal authority adequately distinguished? [Clarity, FR-021/025/027, US6]
- [ ] CHK016 Are public-publishable-data restrictions explicit for Personnel, files and media, with private/clinical/HR information excluded? [Completeness, FR-028, Constitution §IV]
- [ ] CHK017 Are D-ITA structured historical evidence, D-REF published-target veto/atomic availability and any unavailable legacy ITA cutover decision visibly excluded from V1 acceptance, rather than counted as passed or replaced by Basic Pages? [Consistency, Deferred Requirements D-ITA/D-REF, SC-004]
- [ ] CHK018 Is it clear that native selection, permission, revision history or staff precautions do not amount to immutable files, reference-retention locks or historical ITA enforcement? [Ambiguity, FR-025/026, D-ITA/D-REF]

## Acceptance, Exceptions and Dependencies

- [ ] CHK019 Do the active user stories and success criteria define objectively assessable editorial journeys for reuse, current assignments, relationships, validation and ordinary CMS maintenance without requiring out-of-scope public page construction? [Measurability, US1–4/6–7, SC-001–003/005–008]
- [ ] CHK020 Do the written requirements cover missing mandatory reference, incomplete scalar draft, rejected publication/schedule, and uncertain outcome scenarios with clear expected policy rather than disguised runtime test instructions? [Coverage, FR-002/023/026, SC-006]
- [ ] CHK021 Are Thai staff-facing labels, acceptable platform English fallback and representative content selection/error situations specified sufficiently to judge usability later without requiring a custom Admin? [Clarity, FR-029, SC-007]
- [ ] CHK022 Are the exact native-first boundary, conditional mapping decisions, remaining external inventory inputs and Feature 001 T022/T028 dependencies documented without confusing planning completeness with runtime/release acceptance? [Dependencies, FR-031/032, Plan §Verification Design and Implementation Dependencies]

## Notes

- Review the **wording and completeness** of requirements; do not execute the Quickstart, test application behavior, start PostgreSQL, automate passkey sign-in, or claim runtime PASS in this checklist phase.
- Questions about implementation examples are only to assess whether the requirements distinguish supported native semantics from prohibited custom behavior.
- The previously accepted and then superseded Q1 answer, and deferred Q3/Q4 requirements, remain historical traceability rather than active V1 tests.
- If an item reveals a genuine requirement gap, identify its exact affected section; avoid reopening resolved Product decisions or creating new approval loops for editorial wording.
