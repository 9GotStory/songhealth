# Spec Kit — Short Prompts

Use the invocation syntax exposed by the current agent (`$speckit-*`, `/speckit.*`, or installed skill form).

## Bootstrap / Resume — Codex

```text
Read AGENTS.md, then follow its Codex routing to docs/operations/codex-orchestrator.md. Reconcile repository state, resolve the approved planned Delivery and any existing Delivery Context, and update PROJECT-STATUS.md. If a Spec Kit feature exists, resolve it using Spec Kit's runtime rules (SPECIFY_FEATURE_DIRECTORY override when set; otherwise .specify/feature.json). Do not create a new feature, run a lifecycle phase, or modify application code.
```

## Constitution — Codex, initial setup or when project-wide principles changed

```text
If the canonical Constitution is missing, or approved durable project-wide principles changed, run speckit constitution using the reconciled approved principles. Never copy the proposed baseline over an existing Constitution blindly. Stop after the phase.
```

## Prepare Delivery Context — Codex, before every new Delivery

```text
For the approved planned Delivery in PROJECT-STATUS.md, create or reconcile docs/spec-context/<delivery-key>.md from the template. Discover candidate authority by searching stable REQ/DEC IDs and headings first, then read only bounded relevant sections. Map phase routing, dependencies, preserved decisions, and explicit out-of-scope boundaries. Mark the Delivery Context READY only when coherent. Do not run Specify or modify application code.
```

## Specify — Codex

```text
Run speckit specify for the planned Delivery in PROJECT-STATUS.md only if its Delivery Context state is READY. If SPECIFY_FEATURE_DIRECTORY is already set and conflicts with that Delivery, stop and report it; do not change the override silently. Use the Specify routing only. Stop after Specify, verify the feature resolved by Spec Kit matches the planned Delivery/routing map, and update the status mirror.
```

## Clarify — Codex

```text
Run speckit clarify for the active feature. Resolve only material unresolved ambiguity from routed authority; preserve settled decisions. Stop after Clarify.
```

## Plan — Codex

```text
Run speckit plan for the active feature using the approved spec and Plan-routed constraints. Choose the smallest correct design. Stop after Plan.
```

## Checklist — Codex

```text
Run speckit checklist for the active feature. Generate requirements-quality checks focused on completeness, clarity, security/privacy, authorization/data integrity where relevant, and testability. Stop after generation.
```

## Checklist Review Gate — Codex

```text
Review the generated custom checklist against the approved spec and routed authority. Mark an item [x] only when its requirements-quality criterion is satisfied. If any gap is real, return to specify/clarify before Tasks. Do not implement.
```

## Tasks — Codex

```text
Run speckit tasks for the active feature. Create only small, dependency-ordered, testable tasks traceable to the approved spec/plan. Stop after Tasks.
```

## Analyze — Codex

```text
Run speckit analyze for the active feature, then check material findings against routed Source of Truth. If blocking issues exist, fix them in the owning upstream artifact and re-run Analyze until clean. Do not implement.
```

## Authorize Next Task — Codex

```text
Identify the next valid incomplete task, verify all blocking dependencies are complete, update PROJECT-STATUS.md Authorized Implementation, and return an IMPLEMENTATION HANDOFF for Claude Code. Do not implement.
```

## Implement Authorized Task — Claude Code

```text
/speckit-implement

Re-read PROJECT-STATUS.md before making any change. Treat its current Authorized Implementation and Authorization state as the sole execution authority for this run; do not rely on task, scope, or completion state from prior conversation/session context.

Run speckit implement only for the currently Authorized Implementation in PROJECT-STATUS.md. Before editing, verify that the task/scope you are about to execute exactly matches the current persisted authorization. If it does not, stop and report the mismatch without changing files.

Follow CLAUDE.md, run only the verification required by the current authorization, and stop before any other task. Do not run converge and do not commit unless explicitly authorized.
```

## Review — Codex

```text
Review the completed authorized scope against the actual diff, tests, task/spec/plan, Constitution, and routed authority. Do not fix implementation during review. Persist the review outcome and current authorization/rework state in PROJECT-STATUS.md according to the Codex orchestration contract, verify the mirror is current, then return TASK REVIEW.
```

## Fix Blocking Findings — Claude Code

```text
/speckit-implement

Re-read PROJECT-STATUS.md before making any change. Treat its current Authorized Implementation, blocking finding IDs, and Authorization state as the sole execution authority for this run; do not rely on findings, scope, or completion state from prior conversation/session context.

Run speckit implement only for the currently re-authorized blocking-fix scope in PROJECT-STATUS.md. Before editing, verify that the scope and finding IDs you are about to execute exactly match the current persisted authorization. If they do not, stop and report the mismatch without changing files.

Run only the verification required by the current authorization and stop. Do not implement any other task, do not run converge, and do not commit unless explicitly authorized.
```

## Converge — Codex

```text
After all current tasks pass review, run speckit converge for the active feature. If it appends genuine tasks, return to the implementation loop. Stop after Converge.
```

## Acceptance Gate — Codex

```text
Perform the final Delivery acceptance-gate review against routed authority, Constitution, spec, plan, tasks, code, tests, and convergence result. Update PROJECT-STATUS.md. Return READY FOR PRODUCT OWNER ACCEPTANCE or NOT READY. Do not start the next Delivery.
```
