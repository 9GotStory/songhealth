# Delivery Context — <DELIVERY KEY / NAME>

> Routing map only. Do not copy long requirements here.

## Identity

- **Delivery:** <name>
- **Key:** <key>
- **Intent (non-authoritative summary):** <1–2 sentences>

## Authoritative Sources

| Ref | Source | Heading / IDs | Purpose |
|---|---|---|---|
| SRC-01 | `docs/<file>.md` | `REQ-...` / `DEC-...` / `§ <heading>` | <why> |
| SRC-02 | `docs/<file>.md` | `REQ-...` / `DEC-...` / `§ <heading>` | <why> |

Prefer stable requirement/decision IDs. Use headings only when no stable ID exists. During preparation, locate pointers with repository search first and read bounded source sections; do not open every long document in full just to build this map.

## Phase Routing

### Specify
- **Must read:** <refs defining WHAT/WHY>
- **If needed:** <supporting refs>

### Clarify
- active `spec.md`
- only refs directly related to unresolved ambiguity
- **Do not reopen:** <settled decision IDs>

### Plan
- approved `spec.md`
- <architecture/security/data/deployment refs relevant here>

### Checklist
- approved `spec.md` + `plan.md`
- <quality/security/privacy refs relevant here>

### Tasks / Analyze
- approved feature artifacts
- routed authority only where traceability/conflict checking requires it

### Implementation / Review
- authorized task references
- affected code/tests
- additional routed authority only for a concrete implementation question or conflict

### Converge / Acceptance
- current `spec.md`, `plan.md`, `tasks.md`, code, and verification evidence
- routed authority only to validate requirement/decision alignment or resolve a concrete conflict

## Dependencies

| Dependency | Required state |
|---|---|
| <dependency> | <state> |

## Approved Decisions to Preserve

- `<DEC-ID>` — <short label>

## Explicit Out of Scope

- <item>

## Cross-Cutting Routing

- **Security:** <refs or none>
- **Privacy:** <refs or none>
- **Data integrity:** <refs or none>
- **Deployment/hosting:** <refs or none>

## Maintenance

Update only when authoritative routing, dependencies, or approved decisions change. Keep this file short enough to read at the start of every phase.
