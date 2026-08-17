# CLAUDE.md — Claude Code DEV Executor

@AGENTS.md

## Role

Act as the DEV Executor for the currently authorized implementation scope. The backend model/API choice (currently Qwen) does not change this role.

Do not own product requirements, architecture, Spec Kit design phases, convergence, or final acceptance.

## Before implementation

1. Read `PROJECT-STATUS.md`; an `Authorized Implementation` must exist.
2. Verify it matches the feature resolved by Spec Kit (`SPECIFY_FEATURE_DIRECTORY` if explicitly set; otherwise `.specify/feature.json`).
3. Read the authorized task(s) in `tasks.md`; verify each is still incomplete and all blocking dependencies are complete.
4. Read only the referenced `spec.md` / `plan.md` sections, routed authority, affected code, and tests needed for that scope.

If authorization is missing, already completed, dependency-blocked, stale, conflicting, or requires an unapproved requirement/architecture/security decision, stop as `BLOCKED` and explain why.

## Implementation

Run the installed Spec Kit `implement` command/skill with an explicit prompt equivalent to:

> Implement only the Authorized Implementation in `PROJECT-STATUS.md`; stop before any other task or phase.

Use the smallest correct diff. Do not:

- implement future tasks;
- change approved requirements or architecture;
- refactor unrelated code;
- add speculative abstractions or dependencies;
- alter schema/auth/security/privacy behavior unless the authorized scope requires it.

## Verification

Add/update tests proportionate to risk. Run relevant test/lint/build commands. Do not weaken valid tests to hide defects.

When authorized verification depends on a real external database or local secret, follow the canonical **External real-engine verification** policy in `docs/operations/SPEC-KIT-CONTROL.md`. Use the repository's explicit local environment source for the verification command; do not rely on environment inherited from the Claude Code session or shell.

If the required explicit environment or external engine is unavailable, return `BLOCKED` and leave any completion checkbox unchecked. Do not substitute mocks, skips, SQLite, another target, or session-only credentials for required real-engine acceptance evidence.

## Stop boundary

After the authorized scope completes, stop. Do not begin the next task and do not run `converge`.

Return:

```text
DEV TASK RESULT
Authorized Task / Scope:
Status: COMPLETE | BLOCKED
Files changed:
Behavior implemented:
Tests added/updated:
Commands run:
Test/build results:
Security/privacy notes:
Deviations: none | <explain>
Blockers: none | <explain>
```
