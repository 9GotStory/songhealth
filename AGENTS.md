# AGENTS.md — Songhealth Repository Contract

## Authority

Use this order:

1. Product Owner decisions
2. `.specify/memory/constitution.md`
3. `docs/website-modernization-docs/current/00–09` for Product/behavior truth
4. `docs/website-modernization-docs/current/10-system-blueprint.md` for current technical architecture
5. active Spec Kit feature artifacts, when one exists
6. implementation code/tests as evidence only

A downstream artifact MUST NOT silently override an upstream authority.

## Clean Rebuild

The repository has been reset to the current Songhealth baseline.

- Do not infer requirements from removed implementation, old Delivery numbers, old branches, or Git history.
- Do not recreate superseded architecture from historical evidence.
- Use Git history only when the task explicitly requires migration provenance, forensic comparison, or historical evidence.
- Prefer approved platform-native capability before custom infrastructure.
- Custom abstractions/extensions require a demonstrated current gap.

## Context Discipline

Read only the minimum current authority needed for the task.

For a new feature:
1. identify the owning sections in `current/`;
2. read the Constitution;
3. create/use the active Spec Kit feature;
4. preserve the Product/architecture boundary;
5. stop at the requested Spec Kit phase.

## Implementation Gate

There is no standing implementation authorization.

Implementation may begin only when an active feature has approved `spec.md`, `plan.md`, `tasks.md`, dependencies are ready, and the Product Owner has explicitly authorized the bounded scope.

Do not create application code, infrastructure, schema, or dependencies merely because the repository is currently empty.
