# PROJECT STATUS

> Workflow/gate mirror only. Not a Source of Truth.

## Repository Bootstrap

- **Repository state:** INITIAL REPOSITORY ASSEMBLED
- **Product/System Source of Truth:** `docs/website-modernization-docs/`
- **System Blueprint:** `docs/website-modernization-docs/current/10-system-blueprint.md` — FROZEN v1.1
- **Spec Kit control layer:** INSTALLED AS REPOSITORY FILES
- **Canonical Constitution:** NOT ESTABLISHED YET
- **Spec Kit runtime/integrations:** NOT VERIFIED ON TARGET MACHINE

## Planned Delivery

- **Delivery:** UNSET
- **Delivery Context:** UNSET
- **Delivery Context state:** UNSET  <!-- UNSET | DRAFT | READY | STALE -->
- **Status:** AWAITING PRE-IMPLEMENTATION BOOTSTRAP

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Feature directory:** UNSET
- **Verified:** NO

## Workflow Gate

- **Current phase:** BOOTSTRAP
- **Phase status:** READY TO START
- **Previous completed phase:** DOCUMENTATION / SYSTEM BLUEPRINT v1.1 FREEZE
- **Next valid action:** verify Spec Kit runtime/integrations, reconcile Constitution, select approved first Delivery, then prepare Delivery Context
- **Blocking issues:** canonical Constitution and target-machine Spec Kit runtime are not yet verified

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
