# Public Search / Search & Discovery Freeze Review — v1.0

> **Document:** `current/08-search.md`  
> **Status:** ACCEPTED / FROZEN  
> **Version:** 1.0  
> **Review Date:** 14 สิงหาคม 2569  
> **Result:** PASS

## Review Scope

Final review compared `08-search.md` against the complete Frozen baseline `00–07`, covering:

- Website Foundation / Citizen First / Search-as-First-Class principles
- Information Architecture and Domain ownership
- Sitemap `/search`, Search Groups, canonical destinations, query-state and public lifecycle behavior
- Content Model resource meaning, Search Units, shared Documents/Media and ITA Evidence context
- Homepage vs Search responsibility separation
- Admin CMS and Roles & Permissions boundaries
- Publishing Workflow lifecycle, Historical Public, Hidden/Internal, Expired/Superseded and Not Found/Gone behavior
- Thai matching, ranking, result ordering and semantic de-duplication
- Search Results UX, filters, URL-backed state, responsive/accessibility behavior
- Search freshness, lifecycle synchronization, reconciliation and failure safety
- Search operations/observability boundaries
- Security, privacy, abuse controls and Public Search API boundary
- over-engineering guardrails and implementation deferral to `10-system-blueprint.md`

## Canonical Integrity Restoration During Final Review

Before the Final Search review, `current/05-admin-cms.md`, `current/06-roles-permissions.md`, `current/07-publishing-workflow.md`, and `current/08-search.md` were found to have regressed to stale Working Draft snapshots on disk even though `PROJECT-INDEX.md`, `CHANGELOG.md`, Freeze Reviews, archives, and the latest Canonical ZIP recorded later accepted/frozen states.

The latest verified Canonical ZIP was used as the recovery source because it contained:

- `05-admin-cms.md` — FROZEN v1.0, 60 sections
- `06-roles-permissions.md` — FROZEN v1.0, 44 sections
- `07-publishing-workflow.md` — FROZEN v1.0, 43 sections
- `08-search.md` — WORKING DRAFT v0.1, 171 accepted sections before Final Review

The stale on-disk current files were preserved in `archive/` before restoration. This restoration changed no accepted product decision.

## Consistency Repairs Applied Before Freeze

Three non-architectural consistency repairs were applied:

1. **Search Group alignment** — Public Search Groups now use the Frozen Sitemap baseline exactly: `ทุกประเภท / ข่าวสาร / บริการประชาชน / ข้อมูลสุขภาพ / หน่วยบริการ / เอกสาร / ITA / เกี่ยวกับเรา`.
2. **Personnel / Organization route alignment** — Version 1 Search uses `/about/personnel` and `/about/organization` directory/anchored destinations. `08` no longer leaves room for creating new per-entity detail routes without Sitemap Impact Review / Controlled Amendment.
3. **Admin / reindex permission alignment** — Search health, if surfaced in Admin CMS, remains read-only/actionable and outside the normal Admin Work Dashboard. Version 1 adds no new CMS `search.reindex` permission after Frozen `06`; manual reindex remains operational maintenance unless a future Roles & Permissions Controlled Amendment explicitly introduces an application capability.

These repairs only clarified Frozen dependencies and introduced no new Search feature.

## Consistency Results

- Website Foundation — PASS
- Information Architecture — PASS
- Content Model v1.1 — PASS
- Sitemap / canonical route ownership — PASS
- Homepage responsibility boundary — PASS
- Admin CMS — PASS
- Roles & Permissions — PASS
- Publishing Workflow / lifecycle — PASS
- Search Unit / canonical resource model — PASS
- Searchable fields / Thai query behavior — PASS
- Ranking / ordering / semantic de-duplication — PASS
- Search Results UX / filters / URL query state — PASS
- Historical Public / Current Public behavior — PASS
- lifecycle synchronization / fail-closed visibility — PASS
- reconciliation / rebuildability — PASS
- operations / observability boundary — PASS
- security / privacy / abuse boundary — PASS
- external SEO/crawler boundary — PASS
- over-engineering guardrails — PASS
- implementation deferral to System Blueprint — PASS

## Version 1 Guardrails Confirmed

Version 1 intentionally does **not** require:

- AI/semantic/vector Search or LLM query rewriting
- PDF-wide OCR/full-text extraction pipeline
- advanced public query language
- popularity/click-based ranking or personalization
- sponsored/admin-boosted Search results
- Search configuration/ranking console
- Global synonym/thesaurus administration
- Search Usage Analytics or permanent raw-query history
- enterprise event streaming/exactly-once indexing
- Search job/queue administration UI
- CMS-exposed manual reindex capability
- CAPTCHA/login for normal Public Search
- dedicated Search infrastructure technology chosen at Product-document level

## Freeze Decision

**PASS — `08-search.md` is FROZEN as Public Search / Search & Discovery Baseline v1.0.**

Future changes require Impact Review and, where appropriate, Controlled Amendment/version increment.

Next planned document:

> **`09-migration-plan.md` — Migration Plan**
