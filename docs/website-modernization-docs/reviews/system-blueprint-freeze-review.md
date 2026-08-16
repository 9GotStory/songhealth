# System Blueprint Freeze Review — v1.0

> **Document:** `current/10-system-blueprint.md`  
> **Status:** ACCEPTED / FROZEN  
> **Version:** 1.0  
> **Review Date:** 14 สิงหาคม 2569  
> **Result:** PASS

## Review Scope

Final review compared the complete `10-system-blueprint.md` against the Frozen baseline `00–08`, including:

- Website Foundation principles: Simple — Structured — Sustainable, Citizen First, Mobile First, Accessibility, Security/Privacy by Design, no over-engineering
- Information Architecture Domain ownership and shared-resource boundaries
- Content Model identities, lifecycle semantics, ITA Evidence, Documents/Media, Health Report, Contact and Related Organization
- Sitemap stable Public ID, canonical routes, redirects, 404/Gone, Thai/Unicode URL behavior and Public ID non-reassignment
- Homepage curation, source eligibility, fallback and temporal placement scheduling
- Admin CMS Save/Autosave/Recovery/Preview, file workflow and staff-first usability
- Roles & Permissions, Module Scope, Administrator invariants, current authorization and recovery
- Publishing Workflow, optional approval, Scheduled Publish, transaction/atomicity and Announcement Expiry
- Public Search matching/ranking/lifecycle safety, public-safe projection, bounded requests/output and abuse controls
- authentication/session/MFA, Google OIDC, security headers, CSRF, secrets and OWASP ASVS verification boundaries
- Privacy/Cookie/third-party technology baseline
- SQL/Kysely/transaction/Audit/Search separation and canonical-data ownership
- Media/File Upload security and WebP derivative architecture
- Public SSR/routing/SEO/caching and canonical URL generation
- Background work, Cron/reliability, Search reconciliation and operational health
- deployment, environment, backup/restore and disaster-recovery boundaries
- testing, quality gates, accessibility, security verification and release evidence
- implementation deferrals that remain intentionally evidence-based rather than architecture blockers

## Canonical Integrity Baseline

The canonical `current/` set at review time contains only:

```text
00-website-foundation.md
01-information-architecture.md
02-content-model.md
03-sitemap.md
04-homepage.md
05-admin-cms.md
06-roles-permissions.md
07-publishing-workflow.md
08-search.md
10-system-blueprint.md
```

`09-migration-plan.md` remains DEFERRED / NOT ACTIVE and is preserved in `archive/`, not in `current/`.

Before mutation, the pre-freeze Blueprint/Index/Changelog were preserved in `archive/`.

## Final Consistency Repairs Applied Before Freeze

The final re-check found five concrete alignment issues. All were repairs of already-Frozen/Accepted behavior, not new Product scope.

### 1. Google OIDC vs Earlier SSO Exclusion

Earlier Security text still stated that external SSO/Google SSO was deferred. That wording became stale after the Accepted Google OIDC refinement.

Repair:

- Google OIDC is the accepted bounded Version 1 external authentication adapter.
- local CMS User identity, server-side session, privileged MFA, Role/Module Scope and recovery remain authoritative.
- separate identity platforms, LDAP/AD and additional providers remain unnecessary without a new evidence-backed requirement.

### 2. ITA Evidence Illustrative Reference

A cross-module example still showed only `ITA Evidence → document_id`, even though the Frozen IA/Content/CMS decision is Document / Media / External URL.

Repair:

- the example now uses a typed target: `document_id` / `media_id` / validated `external_url`.

### 3. Homepage Temporal Placement Execution

Frozen Homepage/Publishing allows scheduling only for eligible temporal placements such as Urgent Alert, Featured and Health Information, but the Blueprint had not explicitly closed the execution model.

Repair:

- `start_at` / `end_at` remain canonical placement data.
- activation/deactivation is derived presentation eligibility using the shared injectable Clock plus current source eligibility.
- no whole-Homepage Scheduled lifecycle and no unnecessary background mutation/job family are introduced.
- invalid due placements fail safely through Frozen fallback/hide behavior without disturbing the valid Published Homepage.

### 4. Public ID Non-reassignment

Frozen Sitemap prohibits reassignment of an issued Public ID, while the Blueprint had selected UUIDv7 but had not stated the non-reassignment invariant explicitly.

Repair:

- assigned `public_id` is immutable and never intentionally reassigned/recycled to another resource.
- normal APIs do not allow caller-selected historical IDs.
- migration/import fails safely on identity collision.

### 5. Redirect Registry Implementation Boundary

Frozen Sitemap requires a small Redirect Registry for explicit/manual and legacy mappings. The Blueprint had resolved redirect safety/status/Unicode behavior but had not closed the storage/maintenance boundary.

Repair:

- Version 1 uses one small controlled redirect mapping store for exact internal old paths and controlled internal canonical targets.
- manual and future legacy mappings share that store; automatic same-ID slug/case/trailing-slash canonicalization does not create rows.
- mappings are validated against open redirects, loops, self-redirects, malformed paths and avoidable chains.
- maintenance is a protected operational Application/CLI/deployment capability in v1, not raw SQL and not a new CMS permission/UI.
- any future staff-facing redirect UI requires Roles & Permissions/Admin CMS Impact Review.

## Consistency Results

```text
Website Foundation / principles                         PASS
Information Architecture / Domain ownership             PASS
Content Model / lifecycle / shared resources             PASS
Sitemap / Public ID / routes / Redirect / 404-410        PASS
Homepage / curation / temporal placement semantics       PASS
Admin CMS / Save-Recovery-Preview / file workflow        PASS
Roles & Permissions / current authorization / recovery   PASS
Publishing / scheduling / approval / atomicity           PASS
Search / Thai behavior / lifecycle safety / abuse        PASS
Security / Identity / Google OIDC / MFA                  PASS
Privacy / Cookie / third-party technology                PASS
Database / transactions / Audit / Search separation      PASS
Media / WebP / upload security                           PASS
SSR / SEO / canonical URL / Thai-Unicode URL safety      PASS
Background reliability / Announcement expiry             PASS
Deployment / backup / restore / operations                PASS
Testing / ASVS verification / release gates              PASS
Over-engineering guardrails                              PASS
Implementation deferral boundaries                       PASS
Canonical current/ integrity                              PASS
```

Final gates:

```text
Blocking contradictions = 0
Unresolved Blueprint responsibilities = 0
Accidental over-engineering = 0 material issues
Security invariant regressions = 0
Canonical current/ integrity regressions = 0
```

## Implementation Constants Intentionally Not Frozen

The following remain evidence-based implementation/deployment decisions and do not block the architecture Freeze because the Blueprint defines their boundaries and verification criteria:

- exact MySQL vs MariaDB vendor/version on Expert Hosting
- exact database collation
- exact Public Search tokenizer/matching implementation within the Frozen Search contract
- exact SQL connection-pool size
- exact Autosave interval and Recovery TTL
- exact Search query/page/rate-limit numeric values
- exact cache durations
- exact log retention/rotation values
- exact RPO/RTO and routine backup frequency/retention
- exact malware-scanner integration if a reliable provider/capability is available
- exact responsive-image dimensions/encoder quality
- exact performance budgets after measurement
- exact Node.js LTS patch/version
- exact WordPress migration mappings until real migration evidence exists
- exact Rich Text editor library
- exact Google Workspace domain unless organizational configuration is verified

These values may be finalized during implementation/staging/deployment verification without changing Frozen Product semantics or architecture boundaries.

## Structural Verification

The final Blueprint contains Sections **1–696 continuously**, with no missing or duplicate numbered sections.

A targeted cross-document invariant suite covering canonical file set/status/version, ITA Evidence, Contact ownership, Module Scope, Homepage scheduling, Autosave/Recovery/Preview, Rich Text/XSS, Google OIDC/MFA, Privacy/Cookie, Announcement Expiry, Search fail-closed behavior, Public ID non-reassignment, Redirect Registry, Thai/NFC URL semantics, WebP, transaction/Audit/Search separation and anti-over-engineering boundaries passed **56/56 checks** before Freeze.

## Freeze Decision

**PASS — `10-system-blueprint.md` is FROZEN as System Blueprint Baseline v1.0.**

Future semantic changes require Impact Review and, where appropriate, Controlled Amendment/version increment under `PROJECT-INDEX.md`.

`09-migration-plan.md` remains deferred until the real WordPress SQL export and `wp-content/uploads/` evidence are available.
