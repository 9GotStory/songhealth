# Migration Plan Pre-Freeze Review — Round 3 — 28 สิงหาคม 2569

> **Document reviewed:** `current/09-migration-plan.md` WORKING DRAFT — REACTIVATED v0.5 candidate  
> **Result:** CHANGES REQUIRED  
> **Freeze:** NOT AUTHORIZED

## Blocking finding

### PF-01 — Incorrect importer-contract cross-reference

Gate C in Section 88.18.3 stated that a controlled importer must satisfy “Section 15”. Section 15 is **Structural Cleanup**, not the importer execution contract.

The authoritative importer contract in this document is **Section 88.15 — Import Execution Contract**.

Leaving the reference unchanged could cause a later implementation agent to use the wrong requirement boundary.

## Required correction

Replace the Gate C reference:

```text
Section 15
```

with:

```text
Section 88.15
```

No Product, IA, migration semantics, lifecycle, security or architecture decision changes.

## Cross-document spot-check result

The following remained aligned with Frozen baselines:

- procurement: Announcement semantics + reusable Document;
- ITA Evidence: Document / Media / External URL;
- redirects: meaningful successor only, no blanket homepage redirect;
- file ingest: legacy MIME/extension are untrusted; target signature/content/format validation applies;
- Search: canonical public eligibility remains authoritative;
- Frozen `00–08` and Frozen `10-system-blueprint.md` v1.1 remain unchanged.
