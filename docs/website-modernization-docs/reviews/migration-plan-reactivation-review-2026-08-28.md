# Migration Plan Reactivation Review — 28 สิงหาคม 2569

> **Document:** `current/09-migration-plan.md`  
> **Decision:** PASS — CANONICAL REACTIVATION AS WORKING DRAFT  
> **Resulting Status:** WORKING DRAFT — REACTIVATED v0.5  
> **Freeze Authorization:** NO  
> **Importer / Trial / Production Authorization:** NONE

## 1. Trigger

The former defer condition is now satisfied by real legacy evidence: WordPress REST/CPT/ACF discovery, an integrity-checked SQL baseline, and a filesystem inventory of `wp-content/uploads`. The SQL and uploads inventory were captured in separate controlled Cron runs while WordPress remained live, so they are discovery/mapping evidence rather than an atomic cutover snapshot.

## 2. Preservation Check

Canonical `09` was built from `archive/09-migration-plan-paused-2026-08-14.md` and preserves accepted Sections 1–87 before appending the evidence-backed reactivation addendum. Reactivation therefore adds evidence and corrected mappings without resetting accepted migration semantics.

## 3. Deep Review History

- Round 1 — CHANGES REQUIRED; repaired procurement semantics, unsafe redirect assumptions, complaint/feedback separation, resource URL coverage and import boundary.
- Round 2 — CHANGES REQUIRED; repaired non-atomic baseline wording and legacy binary ingest security.
- Round 3 — CHANGES REQUIRED; repaired manifest/URL drift and documentation-governance inconsistencies.
- Round 4 — PASS for the addendum/merge proposal.

## 4. Canonical Consistency Decision

`PROJECT-INDEX.md` becomes the current documentation-status authority and lists `09` as WORKING DRAFT v0.5. Frozen `10-system-blueprint.md` v1.1 is intentionally **not amended or version-bumped**: its statements that `09` was deferred are accurate historical status at the time v1.1 was frozen on 15 สิงหาคม 2569. Reactivation on 28 สิงหาคม 2569 does not retroactively make `09` a dependency of v1.1 and changes no architecture semantics.

This avoids semantic-version churn for a status-only change outside the Blueprint's architecture contract.

## 5. Evidence Boundary

Sensitive SQL, credentials, password hashes, form submissions and raw migration evidence are not committed to GitHub. Canonical documentation records only necessary provenance, counts, decisions, hashes and safety gates.

Key evidence:

- analyzed SQL SHA-256: `279977812ace31c24df7085455cfa249b8804e0c02bd70d85663ea7cef768597`;
- uploads inventory SHA-256: `9240f8bf7f849909101ddfa9626bac0cad653198fce648e79a2d39a0b5dd13f0`;
- 368 `public-new`, 7 directives, 20 procurements, 66 ITA posts, 14 Pages, 1,035 attachments, 5,358 upload files;
- one known missing binary: attachment 1479.

## 6. Gate Result

```text
Canonical Reactivation           PASS
09 status                        WORKING DRAFT v0.5
09 Freeze                        NOT AUTHORIZED
Frozen 00–08 semantics           UNCHANGED
Frozen 10 v1.1 architecture      UNCHANGED
Importer implementation          NOT AUTHORIZED
Trial Migration                  NOT AUTHORIZED
Production Import / Cutover      NOT AUTHORIZED
```

ANOM-001 through ANOM-008 and MODEL-GAP-001 remain explicit execution exceptions governed by the plan. They do not need to be erased before the plan itself can later undergo a separate Freeze Review.
