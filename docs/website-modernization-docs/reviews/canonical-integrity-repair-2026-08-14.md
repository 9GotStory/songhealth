# Canonical Integrity Repair — Final Consistency Review

> **Date:** 14 สิงหาคม 2569  
> **Status:** COMPLETED  
> **Scope:** Frozen `01`, `02`, `03`, `05`, `06`; restoration of Frozen `05–08`; removal of regressed active `09`  
> **Semantic Change:** None — this repair restores/propagates decisions already accepted and recorded by the relevant Frozen baselines, amendment/freeze reviews, Project Index, Changelog, and latest verified Canonical ZIP.

## Trigger

During System Blueprint Final Consistency Review, the physical `current/` workspace was found to contain:

1. stale wording that contradicted already-accepted ITA Media Evidence, Contact ownership, and Administrator Module Scope decisions; and
2. a repository integrity regression where `05–08` had reverted to Working Draft snapshots, `10-system-blueprint.md` had reverted to a Section 1–23 snapshot, and deferred `09-migration-plan.md` had reappeared in `current/`.

## Recovery Actions

- Preserved the pre-repair on-disk copies in `archive/`.
- Restored `05-admin-cms.md`, `06-roles-permissions.md`, `07-publishing-workflow.md`, and `08-search.md` from the latest verified Canonical ZIP where they were FROZEN v1.0.
- Preserved the regressed `current/10-system-blueprint.md` Section 1–23 snapshot and restored the accepted Working Draft v0.1 Sections 1–441 from the same verified Canonical ZIP.
- Preserved and removed the regressed `current/09-migration-plan.md`; `09` remains DEFERRED / NOT ACTIVE and the paused historical copy remains under `archive/`.

## Consistency Repairs

### 01 — Information Architecture
- Propagated accepted ITA Evidence support for `Document`, `Media`, and `External URL` into Section 10.3.
- Updated the simple ITA evidence-entry workflow so Media Evidence can be uploaded/selected without creating a new generic file model.

### 02 — Content Model v1.1
- Corrected stale relationship/foundation wording so all ITA summaries consistently include `Document`, `Media`, and `External URL` Evidence.
- No Content Model semantics were added beyond the already-accepted v1.1 amendment.

### 03 — Sitemap
- Added `Media Evidence` to the ITA semantic tree.
- Confirmed that Media Evidence does not gain a new Public Detail Route merely because it is attached as ITA Evidence; ITA context and Media public-eligibility remain authoritative.

### 05 — Admin CMS
- Removed stale `Official Channels` ownership from Settings.
- Reaffirmed that official/public channels are owned by Contact Information, as already established in the Frozen Admin CMS final corrections.

### 06 — Roles & Permissions
- Corrected the earlier Module Scope sentence so Active non-Administrators require at least one Module Scope while Administrator receives All Modules by definition.
- This restores the rule already recorded in the Roles & Permissions Freeze Review and final sections.

## Version Treatment

No semantic version increment is applied in this repair because it does not introduce a new or changed Product/Architecture decision. It restores corrupted/stale canonical text to the already-approved Frozen decision set. Any future substantive change still follows the normal Impact Review → Controlled Amendment → version increment process.

## Result

Canonical Product/Information Architecture is restored to:

- `00–08` FROZEN
- `09` DEFERRED / NOT ACTIVE and absent from `current/`
- `10` WORKING DRAFT v0.1 pending Final Consistency Refinements

## Revalidation Note — Final Refinement 7

During the post-Refinement-7 integrity check, two stale `01-information-architecture.md` summary/relationship lines were found to have drifted back to the pre-Media wording even though Section 10.3 and the Frozen repair record already carried the accepted `Document / Media / External URL` decision. The stale relationship diagram and Decision Status summary were re-aligned to the already-approved Frozen semantics. No Product/Architecture decision changed and no version increment is required.
