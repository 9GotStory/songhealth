# Roles & Permissions Freeze Review — v1.0

> **Document:** `06-roles-permissions.md`  
> **Date:** 14 สิงหาคม 2569  
> **Status:** ACCEPTED / FROZEN  
> **Result:** PASS

## Review Scope

Reviewed against Frozen baselines `00`–`05`, including Content Model v1.1 and Admin CMS v1.0.

## Corrections Applied Before Freeze

1. Clarified that edits to already Public/Active records which change public output require Publisher-level authority, even when the Domain does not use a `Publish` label.
2. Corrected `audit.view` baseline so Administrator is the only default Version 1 role receiving Full Audit access; the capability remains architecturally separate for future amendment.
3. Defined Hard Delete as Administrator-only by default and only where Admin CMS safety rules explicitly allow it; lifecycle-first remains the default.
4. Corrected Module Scope wording: Active non-Administrator requires at least one Module Scope; Administrator receives All Modules by definition.
5. Clarified that CMS Role and Personnel Role/Assignment are separate models and never auto-synchronize.
6. Documented the known Version 1 limitation that one User has one Role level across all assigned Module Scopes; mixed per-module responsibility levels require future Impact Review/Controlled Amendment rather than intentional over-granting.

## Consistency Results

- Website Foundation alignment — PASS
- Information Architecture alignment — PASS
- Content Model v1.1 coverage — PASS
- Sitemap boundary alignment — PASS
- Homepage permission boundary — PASS
- Admin CMS publishing/lifecycle alignment — PASS
- ITA Evidence / Structure / Publish boundary — PASS
- Document / Media / Shared Resource boundary — PASS
- Account lifecycle / Administrator guardrails — PASS
- Permission Denied / authorization edge cases — PASS
- Backend-authoritative security model — PASS
- Over-engineering review — PASS

## Known Version 1 Limitation

One CMS User has one Role level across all assigned Module Scopes. Version 1 does not support assigning `Publisher` responsibility for one Module and `Editor` responsibility for another Module to the same User.

This limitation is accepted intentionally to keep the Version 1 permission model understandable and auditable. If a real staffing requirement needs mixed per-module responsibility levels, it must go through Impact Review / Controlled Amendment rather than over-granting access.

## Freeze Decision

`06-roles-permissions.md` is approved as **Roles & Permissions Baseline v1.0**.

Future changes require Impact Review and the project Controlled Amendment process where applicable.

## Next Document

`07-publishing-workflow.md`
