# PROJECT STATUS

> Workflow/gate mirror only. Not a Source of Truth.

## Repository Bootstrap

- **Repository state:** PRE-IMPLEMENTATION BOOTSTRAP COMPLETE
- **Product/System Source of Truth:** `docs/website-modernization-docs/`
- **System Blueprint:** `docs/website-modernization-docs/current/10-system-blueprint.md` — FROZEN v1.1
- **Spec Kit control layer:** INSTALLED AS REPOSITORY FILES
- **Canonical Constitution:** ESTABLISHED — `.specify/memory/constitution.md` v1.0.0
- **Spec Kit runtime/integrations:** VERIFIED — Specify CLI 0.16.4; Codex + Claude integrations OK

## Planned Delivery

- **Delivery:** 001-application-foundation — Application Foundation & Development Runtime
- **Delivery Context:** `docs/spec-context/001-application-foundation.md`
- **Delivery Context state:** READY  <!-- UNSET | DRAFT | READY | STALE -->
- **Status:** CHECKLIST REVIEW CHANGES REQUIRED — RETURN TO CLARIFY

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** CHECKLIST REVIEW
- **Phase status:** CHANGES REQUIRED — 22/40 CRITERIA SATISFIED; 18 REQUIREMENTS GAPS REMAIN
- **Previous completed phase:** CHECKLIST GENERATION
- **Next valid action:** run Clarify for the unchecked checklist findings; rerun Plan if design
  contracts change, then regenerate/review the custom checklist before Tasks
- **Blocking issues:** CHK002, CHK003, CHK005, CHK008, CHK012, CHK016–CHK019, CHK023,
  CHK026–CHK030, CHK034, CHK037, CHK039

## Authorized Implementation

- **Task / Scope:** NONE
- **Runtime:** Claude Code
- **Required references:** NONE
- **Expected verification:** NONE
- **Authorization state:** NONE  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

## Rules

- Do not create application code merely to make the repository look initialized.
- Before first `specify`, verify `specify version` and `specify integration status` on the real development machine.
- Reconcile `bootstrap/constitution.proposed.md` through `/speckit.constitution`; do not copy it directly to `.specify/memory/constitution.md`.
- Before first `specify`, this file selects the planned Delivery and points to its Delivery Context.
- Do not run `specify` until the Delivery Context state is `READY`.
- After `specify`, mirror the feature resolved by Spec Kit; never override runtime feature state.
- Treat a conflicting pre-existing `SPECIFY_FEATURE_DIRECTORY` as a blocker; do not silently set/unset it to reconcile status.
- Codex updates this file after each phase/review gate.
- Clear task authorization after PASS or supersession.
- Do not use this file as a changelog.
