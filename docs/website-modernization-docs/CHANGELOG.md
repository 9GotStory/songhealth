# Documentation Changelog

## 28 สิงหาคม 2569 — Post-Freeze Semantic Consistency Correction

A post-freeze semantic review found two stale status sentences retained from the reactivation phase.

Corrections:
- `COMPLETE-MANIFEST.md`: removed the contradictory “not Frozen” sentence after `09` had already been frozen as v1.0;
- `PROJECT-INDEX.md`: replaced stale “does not Freeze 09” wording with current Freeze-state wording;
- added `reviews/migration-plan-postfreeze-semantic-review-round-1-2026-08-28.md`.

No migration rules, Product/IA semantics, architecture, or execution gates changed. `current/09-migration-plan.md`, Frozen `00–08`, and Frozen `10-system-blueprint.md` v1.1 remain unchanged.

## 28 สิงหาคม 2569 — Migration Plan Freeze v1.0

Human Acceptance `ACCEPT — Freeze Migration Plan 09` was recorded after canonical commit `489bd1253c56d83f1ba54c2691845921874e0fbd` passed exact post-commit verification.

- `current/09-migration-plan.md` → **FROZEN v1.0**
- added Human Acceptance and Freeze Review records
- Frozen `00–08` unchanged
- Frozen `10-system-blueprint.md` v1.1 unchanged
- importer implementation, Trial Migration and Production Cutover remain unauthorized

## 28 สิงหาคม 2569

### Migration Plan — Evidence-backed Canonical Reactivation as Working Draft v0.5

The previous defer condition for `09-migration-plan.md` is satisfied by real WordPress SQL plus `wp-content/uploads` inventory evidence. Deep Review Rounds 1–3 returned `CHANGES REQUIRED` and were repaired; Round 4 returned PASS for canonical reactivation.

Documentation actions:
- restored the accepted archived `09` foundation/strategy (Sections 1–87) into `current/09-migration-plan.md` and appended the evidence-backed reactivation addendum;
- set `current/09-migration-plan.md` to **WORKING DRAFT — REACTIVATED v0.5**;
- added `reviews/migration-plan-reactivation-review-2026-08-28.md`;
- updated `PROJECT-INDEX.md` to list active Working Draft `09`, correct the stale current-status reference to System Blueprint v1.1, and distinguish current 09 status from historical defer wording inside Frozen `10`;
- preserved pre-reactivation `PROJECT-INDEX.md` and `CHANGELOG.md` in `archive/`;
- intentionally left Frozen `10-system-blueprint.md` v1.1 unchanged because reactivation changes current documentation state, not the architecture frozen on 15 สิงหาคม 2569; `09` does not become a retroactive dependency of v1.1;
- rebuilt the synchronized canonical documentation package after mutation.

Evidence basis:
- analyzed SQL SHA-256 `279977812ace31c24df7085455cfa249b8804e0c02bd70d85663ea7cef768597`;
- uploads inventory SHA-256 `9240f8bf7f849909101ddfa9626bac0cad653198fce648e79a2d39a0b5dd13f0`;
- SQL/uploads baseline is explicitly **non-atomic discovery/mapping evidence**, not final cutover truth;
- legacy file MIME/extension is untrusted and every migrated binary remains subject to Frozen v1 file-security validation.

Gate result:
```text
Canonical Reactivation           PASS
09 Freeze                        NOT AUTHORIZED
Importer Implementation          NOT AUTHORIZED
Trial Migration                  NOT AUTHORIZED
Production Import / Cutover      NOT AUTHORIZED
Frozen 00–08 semantics           UNCHANGED
Frozen 10 v1.1 architecture      UNCHANGED
```

Sensitive SQL dumps, credentials and raw personal/plugin evidence are not committed to GitHub.


## 15 สิงหาคม 2569

### System Blueprint Controlled Amendment v1.1 — Podman Development Database & Production-like Nginx Verification

Impact Review completed after the v1.0 Freeze. The new decision is Technical Architecture only and does not amend Frozen Product/Information Architecture `00–08`.

Accepted changes:
- daily Development runs Node.js / React / Vite natively on the Developer Host.
- the CMS MySQL-compatible Development database runs in Podman instead of requiring a native long-running DB service on the Developer OS.
- Development DB persistence uses a Podman named volume; container recreation does not inherently destroy the local data volume.
- local/CI database-sensitive tests use a real MySQL-compatible engine; the image/version may be provisional until the real Bangmod Production engine is inspected, then it aligns/pins as closely as practical.
- a Production-like Verification profile may run Podman Nginx + the production-built Node.js application + a real MySQL-compatible database.
- Nginx verifies reverse-proxy/application contracts such as trusted-proxy/forwarded-header/routing/body-limit behavior; it does not claim exact Plesk/Bangmod parity.
- Production remains Bangmod Expert Hosting/Plesk-supported Node.js + hosting MySQL-compatible DB; no Podman, self-managed Nginx, Kubernetes, or Production container-orchestration mandate was introduced.
- reproducible Development/Verification manifests stay intentionally small; Redis/Search engine/queue/object-storage/extra services are not added without a real Delivery requirement.
- Production secrets and unsanitized Production data remain outside ordinary local/verification environments.

Documentation actions:
- archived the previous Frozen v1.0 Blueprint as `archive/10-system-blueprint-v1.0-pre-podman-environment-amendment-2026-08-15.md`.
- updated `current/10-system-blueprint.md` to **FROZEN v1.1, Sections 1–705 continuous**.
- created `reviews/system-blueprint-amendment-v1.1-podman-environment-review.md`.
- updated `PROJECT-INDEX.md` canonical version/current documentation point.
- Frozen `00–08`, Constitution, and deferred `09-migration-plan.md` remain unchanged.

Consistency result:

```text
Blocking contradictions = 0
Frozen Product/IA semantics changed = 0
Production hosting target changed = 0
Accidental Production container mandate = 0
Security/no-over-engineering regressions = 0
```

**Amendment Decision: PASS — `10-system-blueprint.md` is FROZEN as System Blueprint Baseline v1.1.**


## 14 สิงหาคม 2569

### System Blueprint Final Consistency Re-check — PASS / Frozen v1.0

Completed the final cross-document consistency review of Frozen `00–08` against `current/10-system-blueprint.md`. The review found five residual alignment issues; all were consistency repairs of already-Frozen/Accepted decisions rather than new Product scope.

Repairs applied before Freeze:
- aligned earlier Security Sections 175/178 with the later Accepted Google OIDC requirement: Google OIDC is a bounded Version 1 authentication adapter, while local CMS identity/session/MFA/Role/Module Scope remains authoritative and additional identity platforms/providers are still evidence-driven.
- corrected the Section 42 ITA Evidence illustration from Document-only to typed Document / Media / validated External URL evidence.
- closed Homepage temporal placement execution: allowed `start_at` / `end_at` windows are derived presentation eligibility using the shared Clock + current source lifecycle; no whole-Homepage Scheduled lifecycle or unnecessary activation job is introduced.
- made the Frozen Public ID non-reassignment rule explicit in the UUIDv7 identity strategy; assigned Public IDs are immutable and never intentionally recycled/reassigned to another resource.
- closed the Frozen Sitemap Redirect Registry boundary with one small controlled mapping store for manual/future legacy internal redirects, protected operational Application/CLI maintenance, one-hop/loop/open-redirect validation, and no new CMS redirect-management permission/UI.

Final consistency gates:
```text
Blocking contradictions = 0
Unresolved Blueprint responsibilities = 0
Accidental over-engineering = 0 material issues
Security invariant regressions = 0
Canonical current/ integrity regressions = 0
```

Verification:
- Frozen `00–08` status/version baseline intact.
- active `current/` contains only `00–08 + 10`; `09` remains DEFERRED / NOT ACTIVE.
- `10-system-blueprint.md` Sections **1–696 continuous**, no missing/duplicate section numbers.
- targeted cross-document invariant suite passed **56/56 checks**.
- Freeze review created at `reviews/system-blueprint-freeze-review.md`.
- pre-freeze Blueprint/Index/Changelog preserved in `archive/`.

**Freeze Decision: PASS — `10-system-blueprint.md` is FROZEN as System Blueprint Baseline v1.0.**

Implementation constants explicitly designated evidence-based (for example exact DB vendor/collation, Search tokenizer details/numeric bounds, Autosave TTL, pool/cache/log/backup/RPO-RTO/image parameters and exact Node LTS patch) remain implementation/deployment verification decisions and do not reopen the architecture Freeze when they stay within the documented guardrails.

`09-migration-plan.md` remains deferred until real WordPress SQL + `wp-content/uploads/` evidence is available.

### System Blueprint Final Refinement 7 — Public Search Bounds, Safe Snippets & Abuse Protection Accepted

Accepted and added to `current/10-system-blueprint.md` as Sections 617–649; Section 650 advances the Final Consistency Review to the final routing/URL refinement.

Key decisions:
- Public Search is a bounded allowlisted query capability; the server enforces finite query, pagination/result-window and execution bounds while exact numeric values remain evidence-based.
- a blank/missing meaningful query remains a Search landing state and never enumerates all content.
- clients cannot supply arbitrary persistence fields, sort expressions, regex, scripts, SQL-like expressions or implementation-specific Search instructions.
- the Search projection contains public-safe fields only, and every candidate is re-checked against current canonical public eligibility before response.
- the Frozen `Eventually fresh, never eventually secure` rule is an explicit security invariant.
- snippets/highlights derive from public-safe plain text and controlled text rendering, not raw editor HTML or `dangerouslySetInnerHTML`.
- result/snippet/response size is bounded, Historical Public context remains explicit, and Search failure is distinct from valid zero results.
- raw Search queries remain minimized/omitted from routine logs; Search responses remain `private/no-store` and `/search` remains `noindex`.
- Version 1 uses lightweight privacy-aware route throttling; no Redis, CAPTCHA, fingerprinting, persistent tracking or enterprise bot platform is introduced without real abuse/scale evidence.
- execution uses bounded retrieval/resource usage and rejects ambiguous parameter pollution; Thai/Unicode and contextual year normalization are explicit validation/test cases.
- Search maintenance remains operational, Search security constants are not ordinary CMS settings, and SSR/client Search paths share one authoritative Application policy.
- bounds, stale-eligibility suppression, safe snippets/highlights, throttling and high-match workloads are mandatory regression/performance verification areas.

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–650 continuous**.

Next refinement: **Permanent Redirect Status, Thai Slug, Unicode Normalization & URL Safety**.

### System Blueprint Final Refinement 5 — Privacy, Cookie & Third-party Technology Baseline Accepted

Accepted and added to `current/10-system-blueprint.md` as Sections 567–590; Section 591 advances the Final Consistency Review to Announcement Expiry & Domain-time Background Processing.

Key decisions:
- anonymous Public Website usage is stateless/cookie-free where functionality does not require browser state; behavioral/advertising tracking, profiling and third-party analytics are not Version 1 defaults
- essential CMS/session/authentication cookies remain narrowly scoped security mechanisms and are documented according to real purpose
- Privacy Notice, Cookie Policy and Accessibility Statement remain required canonical public Basic Pages and must reflect implemented processing
- a Cookie Policy does not automatically require a cookie banner/CMP; consent-management capability is introduced only for an approved real use case where the agency's applicable privacy/PDPA review requires it
- Google OIDC remains an authentication dependency only and does not implicitly authorize Google Analytics, advertising, broader Google API access, visitor tracking or ambient One Tap behavior
- new/materially changed third-party technology requires explicit purpose plus proportionate Security, Privacy/PDPA, Cookie/Storage, Data Transfer, CSP, Accessibility and Performance review before Production use
- future consent-dependent non-essential technology remains inactive until the applicable choice is established, cannot gate unrelated core public service and must support appropriate withdrawal/change without dark-pattern UX
- external links and embedded third-party technology are treated as different trust boundaries; embedding receives the stronger integrated-technology review
- approved external dependencies use lightweight engineering/deployment documentation rather than a new CMS vendor-governance platform
- operational/security telemetry remains purpose-limited and privacy-minimized; technical metadata may be retained proportionately for security/operations but not repurposed into an unrestricted behavioral store
- Public Search analytics/history is not a Version 1 baseline
- Security and Privacy are complementary: collect the minimum required to deliver and secure the service, then protect it appropriately
- final legal/PDPA basis, notice wording and consent obligations are confirmed against the real Production processing inventory by the agency's responsible PDPA/DPO/legal process before go-live
- privacy-impacting changes participate in release review so notices, CSP, third-party records, retention and verification remain aligned with implementation

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–591 continuous**.

Next refinement: **Announcement Expiry & Domain-time Background Processing**.

### System Blueprint Final Refinement 4 — Google OpenID Connect Authentication Integration Accepted

Accepted and added to `current/10-system-blueprint.md` as Sections 543–565; Section 566 advances the Final Consistency Review to Privacy, Cookie & Third-party Technology Baseline.

Key decisions:
- Google-based CMS sign-in is OpenID Connect (OIDC) authentication on OAuth 2.0, not generic OAuth authorization treated as identity proof.
- Google establishes external identity only; local CMS Active state, MFA, Role, Module Scope, resource state and Domain/security invariants remain authoritative.
- no Google/JIT self-registration or automatic privilege creation in Version 1; CMS Users are explicitly pre-provisioned/approved.
- stable external identity uses `provider + Google sub → CMS user_id`; verified email may assist controlled initial linking but is not the durable identity key.
- optional Google Workspace restriction is explicit and environment-verified rather than inferred from email suffix alone.
- Publisher/Administrator privileged access continues to require the accepted local CMS MFA policy after Google authentication.
- successful OIDC ends in the existing opaque server-side CMS session model; Google tokens are not browser CMS session credentials.
- use a maintained server-oriented OIDC/OAuth library and applicable authorization-code protections such as state/nonce/PKCE; provider assertions are verified server-side.
- sign-in requests only necessary identity scopes; no Google API scopes or long-lived API-token storage without a separate approved authorization requirement.
- local authentication remains available in Version 1; local and Google methods resolve to one stable CMS User identity.
- CMS Disable/Role/Scope/security recovery remains authoritative over a valid Google account.
- linking/unlinking/relinking and recovery are security-sensitive, re-authenticated/auditable operations that must prevent lockout.
- environment-specific provider credentials/callbacks stay outside Git; One Tap is not a Version 1 baseline requirement.
- Google OIDC success/failure/linking paths become mandatory security regression and OWASP ASVS verification evidence.

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–566 continuous**.

Next refinement: **Privacy, Cookie & Third-party Technology Baseline**.

### System Blueprint Final Refinement 2 — Rich Text, XSS & Controlled Embed Accepted

Before applying the accepted refinement, an on-disk canonical regression was detected again: active `09-migration-plan.md` had reappeared and `10-system-blueprint.md` had reverted to Sections 1–23. The latest verified Canonical ZIP still contained the correct Refinement 1 baseline (`00–08` + `10`, `10` Sections 1–472). The stale `09`/`10` files were preserved in `archive/`, the verified baseline was restored, and Refinement 2 was applied only after recovery.

Accepted and added to `current/10-system-blueprint.md` as Sections 473–505.

Key decisions:
- Security is the primary decision priority for Rich Text authoring/rendering while still following Simple — Structured — Sustainable and avoiding unnecessary infrastructure complexity.
- canonical Rich Text is structured, versioned and allowlisted rather than arbitrary author-controlled HTML.
- backend runtime validation is authoritative for structure, bounds, URLs and resource references; editor UI restrictions alone are not a security boundary.
- normal CMS authors, including Administrators using the CMS, cannot inject custom HTML/CSS/JavaScript, executable DOM attributes, scripts or arbitrary iframes.
- canonical Public/Preview rendering uses controlled React components and does not rely on `dangerouslySetInnerHTML` as the normal Rich Text path.
- rich clipboard input is untrusted, normalized/sanitized and converted into approved structured content; raw source HTML is discarded as a canonical storage contract.
- links use safe protocol validation and internal resources/Media/Documents prefer stable lifecycle-aware references where appropriate.
- parent publication never elevates referenced child lifecycle/public eligibility.
- Search text/snippets derive from public-safe structured/plain-text projections rather than raw editor markup.
- arbitrary third-party embed markup is unsupported; approved embed use cases use typed provider/resource representations and application-generated browser output.
- no third-party embed provider is a mandatory Version 1 dependency; each provider requires Security/CSP/Privacy-Cookie/Accessibility/performance/fallback review.
- provider policy is controlled in reviewed code/configuration rather than arbitrary CMS settings; iframe/CSP permissions remain least-privilege.
- Rich Text schema versioning supports format evolution without introducing revision history; unknown content fails safely.
- future WordPress HTML migration remains an isolated migration parser/sanitizer/mapper boundary and cannot weaken the normal new-system schema.
- stored-XSS and malformed-content regression tests plus applicable OWASP ASVS 5 evidence are required.
- the Rich Text editor library is deliberately not frozen at architecture level and remains replaceable.

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–506 continuous**.

Next refinement: **Identity, Administrator Safety & Authorization Edge Cases**.

### System Blueprint Final Refinement 1 — Autosave, Recovery & Protected Preview Accepted

Before applying the accepted refinement, an on-disk canonical regression was detected again: active `09-migration-plan.md` had reappeared and `10-system-blueprint.md` had reverted to Sections 1–23. The latest verified Canonical ZIP still contained the correct Phase 1 baseline (`00–08` + `10`, `10` Sections 1–441). The stale `09`/`10` files were preserved in `archive/`, the verified baseline was restored, and the refinement was then applied to that baseline rather than to stale files.

Accepted and added to `current/10-system-blueprint.md` as Sections 442–471.

Key decisions:
- Canonical Save, ephemeral Recovery and protected Preview are distinct; only canonical Save is authoritative persistence.
- Autosave never mutates canonical Draft/Published state directly and cannot silently alter live Published content while an editor is typing.
- Recovery uses server-side ephemeral SQL storage, not a revision-history/collaboration/offline-authoring subsystem.
- Recovery records retain user/target or authoring-session identity, base canonical version, recovery version, allowlisted validated working payload, timestamps and expiry.
- base-version and recovery-version checks prevent stale recovery overwrite and silent multi-tab last-write-wins behavior; Version 1 has no automatic merge/CRDT.
- not-yet-saved resources may use an opaque authoring-session identity rather than creating abandoned empty canonical Drafts solely for Autosave.
- Autosave is dirty-only, debounced/bounded; exact interval/TTL remains evidence-based and Autosave failure does not block normal editing.
- every Autosave/Restore/Preview/canonical command re-checks current session/User/Role/Module Scope/capability; Disable/Demote/Scope changes therefore apply immediately.
- Recovery payloads are allowlisted/runtime-validated and refer to staged Media/Documents by internal identity rather than embedding binary data.
- successful canonical Save/Publish resolves related Recovery only after commit; failed canonical mutations preserve recovery data; expired recovery is safe periodic-maintenance data.
- routine Autosave does not create Business Audit spam.
- Protected Preview reuses Public rendering components through in-process Application capabilities and may render unsaved working state while Public continues to use canonical state.
- Preview is authenticated/current-permission-aware, author-specific for unsaved Recovery, `no-store`, `noindex`, excluded from Public Search/sitemap/canonical routing, and has no anonymous/shareable token baseline.
- private/staged Media remains private during Preview and is delivered through authenticated lifecycle-aware access; Preview has no business-lifecycle side effects.

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–472 continuous**.

Next refinement: **Rich Text, XSS & Controlled Embed Architecture**.

### Final Consistency Review — Phase 1 Canonical Integrity Repair Completed

System Blueprint Final Consistency Review detected both stale cross-document wording and a physical canonical-workspace regression. Repairs were applied without changing the already-accepted Product/Architecture semantics.

Recovery and repair actions:
- preserved pre-repair copies of affected files in `archive/`
- restored `05-admin-cms.md`, `06-roles-permissions.md`, `07-publishing-workflow.md`, and `08-search.md` from the latest verified Canonical ZIP because the on-disk `current/` copies had reverted to Working Draft snapshots
- preserved a regressed `10-system-blueprint.md` Section 1–23 snapshot and restored the accepted Working Draft v0.1 Sections 1–441 from the verified Canonical ZIP
- preserved and removed the regressed active `current/09-migration-plan.md`; Migration Plan remains DEFERRED / NOT ACTIVE
- restored canonical `current/` to Frozen `00–08` plus Working Draft `10`
- propagated already-accepted ITA Media Evidence semantics through `01-information-architecture.md`, stale summary/relationship wording in `02-content-model.md`, and ITA semantics in `03-sitemap.md`
- removed stale `Official Channels` ownership from Admin Settings and reaffirmed Contact Information ownership in `05-admin-cms.md`
- corrected stale Module Scope wording in `06-roles-permissions.md`: Active non-Administrators require at least one Module Scope; Administrator receives All Modules by definition
- created `reviews/canonical-integrity-repair-2026-08-14.md` documenting the recovery/repair rationale and the no-semantic-change treatment
- no Frozen semantic version was incremented because this operation restores corrupted/stale canonical text to decisions already approved by the existing amendment/freeze records; substantive future changes still require the normal Controlled Amendment/version process

Result: **Phase 1 PASS.**

Next phase: **System Blueprint Final Consistency Review — Phase 2: Final Blueprint Refinements**.

### System Blueprint — Testing, Quality Gates & Security Verification Strategy Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- testing is risk/invariant-driven rather than based on arbitrary test counts or global coverage percentages
- Vitest is the preferred Domain/Application/unit/integration baseline, Fastify `inject()` is preferred for in-process HTTP integration where appropriate, and Playwright is the primary critical-journey browser/E2E framework
- database-sensitive tests use a real MySQL-compatible engine and align with the verified Production engine family once known
- schema migrations, transaction atomicity, optimistic concurrency, concurrent Document supersession, Scheduled Publication idempotency, Search failure isolation and authorization/Module Scope are first-class regression targets
- Public/Admin API tests verify runtime validation, canonical error/status semantics, concurrency, authorization and explicit DTO field allowlists
- full Chromium/Firefox/WebKit E2E is primarily a Release/scheduled gate; Pull Requests use a faster critical subset
- accessibility combines automated Playwright/axe-style checks with targeted keyboard/manual verification; responsive/mobile/Thai rendering remain explicit review concerns
- SSR/SEO tests inspect actual server HTML, primary content, metadata, lifecycle HTTP status/redirect behavior, noindex and sitemap eligibility before hydration
- Media tests verify upload/content/path/size/privacy controls plus original preservation and responsive WebP derivative behavior
- Pull Request gates emphasize typecheck/lint/architecture/unit/core integration/build/secret/security checks; Release Candidate gates add deeper migrations/E2E/concurrency/accessibility/SSR/SEO/Media/security/staging verification
- OWASP ASVS 5 is tracked through requirement applicability/implementation/verification/evidence under the accepted risk-based L1 + selected-L2 policy without unsupported compliance claims
- dependency/SAST findings are triaged by relevance/severity/reachability/mitigation; committed secrets are merge-blocking and exposed credentials are rotated
- application-specific security controls receive direct regression tests instead of relying only on generic scanners
- backup/restore drills remain operational release-readiness evidence; synthetic deterministic test data is the default and Production-derived data requires sanitization/minimization
- flaky tests are investigated rather than permanently hidden with retries; visual regression is targeted; Merge and Release gates intentionally differ in depth/cost
- manual workflow/accessibility/security/recovery verification remains necessary where automation cannot prove correctness

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–441 continuous**.

Next phase: **System Blueprint Final Consistency Review** across Frozen `00–08` and `10-system-blueprint.md` before Final Review/Freeze.

### System Blueprint — Deployment, Environment, Backup & Disaster Recovery Architecture Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- Development, Staging, and Production are separate logical environments; Staging may initially share the Expert Hosting account but never Production database/storage/sessions/secrets
- GitHub is authoritative for application code; Production deploys only approved immutable revisions and direct Production editing is not normal workflow
- CI validates typecheck/lint/tests/builds before release; automatic deployment on every `main` change is not a Version 1 requirement
- deployment is a controlled release flow including build/validation, explicit schema migration, activation/restart, health gates and smoke tests
- release candidates are built before activation and zero-downtime is not claimed until verified against real Expert Hosting/Nginx Unit behavior
- schema migrations remain explicit/version-controlled/rollback-aware; expand-migrate-contract is reserved for high-risk destructive changes
- application rollback and database recovery are separate; backup restore is not the routine response to a bad code release
- environment secrets/credentials are isolated and protected outside Git under OWASP-aligned secrets-management practices
- canonical recovery set is SQL + original Media/Documents + required configuration/secret recovery material; Search/WebP/build/dependency/temp artifacts are reconstructible
- provider backup is only one protection layer; no unverified Expert Hosting frequency/retention guarantee is assumed
- at least one protected/encrypted backup copy is independent of the Production hosting account
- backup frequency/retention and RPO/RTO are finalized from actual risk/volume and measured restore drills before Go-live
- backups are considered reliable only after isolated restore verification of data, originals, application configuration and critical workflows
- deployment/runtime/Cron/recovery requirements are documented as a reproducible operational manifest; Terraform/Ansible/Docker/Kubernetes remain deferred
- CMS Admin does not imply DirectAdmin/SSH/deployment/backup access
- Expert Hosting remains the target until measured resource/worker/service/isolation/network/backup/observability requirements justify VPS/other infrastructure

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–387 continuous**.

Next topic: **Testing, Quality Gates & Security Verification Strategy**.

### System Blueprint — Logging, Observability, Error Handling & System Health Architecture Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- Business Audit, Operational/Application Logs, and Security Event Logs are semantically distinct even when infrastructure is shared
- Fastify/Pino structured JSON logging is the Version 1 operational baseline with stable event names and structured safe context
- server-generated Request IDs correlate HTTP execution; background Scheduler/maintenance runs use Operation IDs
- whole request bodies/Domain objects/raw DB rows are not routinely logged; secrets/authentication material and unnecessary personal data are excluded/redacted
- raw Public Search queries are omitted/minimized in routine logs unless a separately reviewed purpose exists
- expected validation/404/conflict/Domain outcomes are distinguished from operational incidents; log-injection resistance and meaningful log levels are required
- centralized error mapping provides canonical client-safe responses while stack traces/SQL/filesystem/internal details stay in protected server logs
- derived failures are never silently swallowed: they may degrade independently but remain observable/recoverable
- health is separated into Liveness, Readiness, and Operational Health using a small `Healthy / Degraded / Unavailable` model
- public health endpoints reveal minimal information; Admin sees a small actionable health view for Database/Scheduler/Scheduled Publishing/Search/Storage rather than raw logs
- critical dependencies are distinguished from degradable subsystems
- Version 1 observability is Structured Logs + Correlation + Audit + System Health; OpenTelemetry/Collector/metrics/distributed tracing remain optional extension points
- production raw SQL logging is disabled by default and performance thresholds are evidence-based
- Operational/Security/Audit data use bounded purpose-driven retention, protected access and rotation/capacity controls; Admin CMS does not expose raw server logs
- alerting focuses on sustained/actionable problems rather than expected noise
- UI/API success is reported only after authoritative canonical commit; observability is not citizen behavioral analytics
- OWASP ASVS 5 Security Logging/Error Handling plus OWASP Logging/Error Handling guidance are the verification/implementation baseline without blanket compliance claims

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–333 continuous**.

Next topic: **Deployment, Environment, Backup & Disaster Recovery Architecture**.

### System Blueprint — Background Jobs, Scheduling & Reliability Architecture Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- Hosting Cron/Scheduler is a periodic wake-up mechanism while canonical SQL state determines due work
- individual publication schedules remain canonical resource state rather than generic Job records or per-content Cron entries
- `scheduled_at <= now` provides overdue catch-up after missed runs, restarts, deployments, or downtime
- background transitions reuse the same Application/Domain capabilities as interactive workflows and never bypass Domain rules through standalone SQL scripts
- scheduled publication is idempotent/current-state-aware/transaction-safe; repeated or overlapping execution cannot create duplicate logical publication
- a small SQL-backed scheduler lease may prevent ordinary overlap while idempotency remains the final correctness guarantee
- critical transitions may use targeted row locking and bounded deterministic batches; engine-specific multi-worker claiming remains deferred
- execution failure leaves content Scheduled/overdue and retryable; Overdue is operational rather than a new Domain lifecycle state
- scheduler heartbeat and overdue indicators provide actionable health without a full job-management dashboard
- scheduled-publication Audit distinguishes human initiator/scheduler from System executor; technical retry noise stays in operational logs
- Search synchronization remains post-commit and repairable through reconciliation; temporary Media cleanup uses explicit lifecycle rules
- retries target transient failures; canonical due state enables automatic recovery after downtime
- Transactional Outbox, Redis, BullMQ, dedicated workers, generic Job tables, distributed locks, and exact-second scheduling are not Version 1 dependencies
- Redis/BullMQ is introduced only when measured workload requires independent workers, high concurrency, long-running tasks, richer retry/backoff, or similar capabilities
- any future queue worker continues to invoke the same idempotent Application capabilities
- schedule times persist as UTC with `Asia/Bangkok` staff interpretation; injectable Clock supports deterministic time-based testing

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–284 continuous**.

Next topic: **Logging, Observability, Error Handling & System Health Architecture**.

### System Blueprint — Public Rendering, Routing, SEO & Caching Architecture Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- Public Web uses **React Router Framework Mode + React + Vite** while Fastify remains the primary backend/application HTTP runtime
- Public rendering is SSR-oriented hybrid: CMS-driven canonical pages SSR by default, deployment-static content may pre-render, and Admin remains CSR-oriented
- normal CMS publication does not require frontend rebuild/deploy; SSR reuses in-process Application capabilities rather than localhost HTTP
- Frozen Sitemap remains route authority and canonical URL generation is centralized; stable Public ID remains separate from mutable Title/Slug
- Public server responses use truthful `200/404/410/redirect` semantics and unrelated removed content is not redirected generically
- server-rendered SEO metadata, self-canonical URLs, sitemap projection, robots/noindex, Open Graph/social metadata, and structured data derive from canonical public state
- `/search` remains `noindex` and outside sitemap; robots guidance is never a security boundary
- caching follows mutability: hashed Vite assets and versioned responsive WebP derivatives may be long-lived immutable, while SSR HTML starts conservative/revalidated and Search/Admin/Auth responses avoid shared caching
- stale cache may never preserve public access after Hidden/Internal/Withdrawn lifecycle changes
- primary public content remains meaningful in SSR HTML before JavaScript enhancement
- baseline performance uses SSR, responsive WebP, code splitting, minimal client JS, appropriate HTTP caching, and efficient SQL before CDN/Redis/edge complexity
- internal Public Search and external search-engine SEO remain separate concerns
- Next.js as an additional runtime, RSC, edge rendering, ISR, full-page cache, PWA/AMP, and crawler-specific rendering are not Version 1 requirements

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–247 continuous**.

Next topic: **Background Jobs, Scheduling & Reliability Architecture**.

### System Blueprint — Media, File Storage & Upload Security Architecture Accepted (WebP-by-Default)

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- uploaded binaries are stored outside directly public/executable web roots where practical; SQL owns structured identity/metadata/relationships and storage owns bytes
- file existence never implies public eligibility; current Domain/public lifecycle controls delivery
- uploads begin private and use purpose-aware authorization, bounded streaming/size limits, extension allowlists, MIME/signature/content verification, and parser/format validation
- Version 1 raster formats are JPEG/PNG/WebP and the baseline public-document format is PDF; CMS-uploaded SVG and compressed archives remain excluded without a proven use case
- original raster assets remain canonical while Public Website delivery automatically uses optimized responsive **WebP derivatives** by default
- derivative presets are limited to real UI uses and CMS staff are not asked to configure compression, dimensions, EXIF stripping, or WebP conversion
- image validation limits decoded dimensions/pixel count and public derivatives strip unnecessary metadata
- malware scanning remains a supported hook when reliable infrastructure exists; CDR is risk-based and the system makes no false claim that scanning is active
- filesystem/storage and SQL coordination uses short transactions plus retry-safe cleanup/reconciliation rather than long DB transactions during file processing
- checksums, safe MIME/download headers, stable opaque media identity, reference-safe deletion, orphan handling, capacity safeguards, and security logging are explicit baseline concerns
- database metadata plus canonical original binaries form the recoverable backup unit; presentation derivatives are reconstructible
- OWASP ASVS 5 File Handling and OWASP File Upload guidance are the security verification/implementation baseline
- S3/CDN/media microservices/DAM/video/OCR/archive/SVG-processing complexity remains deferred until a real requirement exists

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–216 continuous**.

Next topic: **Public Rendering, Routing, SEO & Caching Architecture**.

### System Blueprint — Authentication, Session & Security Architecture Accepted (OWASP-Aligned)

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- OWASP ASVS 5.0.0 is the primary application-security verification baseline; OWASP Cheat Sheet Series guides implementation and OWASP Top 10:2025 is used as a risk-awareness checklist
- applicable ASVS L1 requirements form the minimum verification floor and selected L2 controls are adopted based on risk; the project does not claim blanket ASVS level compliance without actual verification
- Admin CMS uses opaque cookie-based server-side sessions rather than JWT access/refresh tokens as the normal browser-authentication mechanism
- Secure/HttpOnly/SameSite cookies, explicit CSRF protection, restrictive same-origin/CORS behavior, server-enforced session expiry/regeneration/revocation, and current Role/Module Scope authorization are baseline controls
- Argon2id plus a modern passphrase policy is the password baseline; login/recovery receives throttling and account-enumeration resistance
- MFA is required for **Admin and Publisher** because of system/public-impact privilege; Editor/Viewer support MFA and deployment policy may strengthen it
- reset/recovery/MFA recovery uses short-lived or single-use protected mechanisms; security questions are excluded and sensitive security changes may require reauthentication
- backend authorization is explicit/default-deny and covers function/capability, Module Scope, resource state, and field exposure as applicable
- HTTPS, verified proxy-trust configuration, security headers/CSP, secrets hygiene, security logging without reusable secrets, and dependency/supply-chain hygiene are delivery requirements
- OWASP-ASVS-based implementation/security verification is required before production; installing middleware alone is not treated as proof of security
- external SSO/Identity Platform remains deferred until a real federation requirement exists

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–179 continuous**.

Next topic: **Media, File Storage & Upload Security Architecture**.

### System Blueprint — Database Technology, Data Access & Transaction Strategy Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- production persistence uses the MySQL-compatible relational database supplied by Bangmod Expert Hosting; exact MySQL/MariaDB vendor/version is verified at deployment rather than guessed in architecture
- InnoDB + `utf8mb4` are the business-table baseline; exact collation is selected after real engine/version and Thai behavior are verified
- **Kysely** is the Version 1 TypeScript data-access/query-builder baseline; SQL remains visible/predictable and Domain/Application models remain persistence-independent
- raw SQL remains permitted when deliberate, parameterized, localized, and clearer/technically necessary
- Database Row, Domain/Application Model, and API DTO remain separate boundaries
- internal relational identity uses numeric PKs where appropriate while publicly addressable canonical resources use stable UUIDv7 `public_id`; Title/Slug are not identity
- foreign keys, unique/not-null constraints, and targeted checks enforce structural integrity while Domain/Application code owns lifecycle/business rules
- delete cascades are conservative and limited to strictly owned child records
- persisted `version` compare-and-update implements optimistic concurrency; targeted row locking is reserved for critical transitions
- Application use cases own transaction boundaries; cross-Module atomic work is allowed through explicit Module capabilities within one SQL transaction, never direct cross-Module table mutation
- accountable Audit can join canonical transactions; Search projection work remains derived and post-commit
- transactions stay short; deadlock retry is bounded and only for safe/idempotent operations
- relational schema is default; JSON and technical soft-delete are exceptions, not generic application frameworks
- absolute timestamps persist in UTC and use `Asia/Bangkok` for business interpretation/display; semantic calendar dates remain separate
- indexes are driven by constraints and actual query patterns; DB FULLTEXT/indexing does not redefine Frozen Search behavior
- schema migrations are version-controlled and explicit, are not auto-run on normal production startup, and applied migration history is immutable
- schema migrations, seed/bootstrap/reference data, and deferred WordPress content migration are separate workflows
- connection pools are bounded but exact sizing is deferred to verified Expert Hosting limits
- least-privilege database credentials are preferred where hosting supports them; phpMyAdmin is not the normal schema deployment path for the new application

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–147 continuous**.

Next topic: **Authentication, Session & Security Architecture**.

### System Blueprint — Backend Framework, API Style & Runtime Validation Strategy Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- backend is TypeScript on a supported Node.js LTS runtime; Fastify is the Version 1 HTTP framework
- Fastify remains a transport/HTTP adapter and does not replace the accepted Module/Application/Domain architecture
- API style is pragmatic REST: normal resource editing uses resource-oriented operations while meaningful lifecycle transitions use explicit Domain actions
- Public/Admin/Auth are separate logical API surfaces within the same backend application
- every external input receives runtime schema validation; TypeScript compile-time typing alone is insufficient at trust boundaries
- TypeBox / JSON Schema is the preferred transport contract baseline for request/response validation, TypeScript inference, serialization, and OpenAPI generation
- Transport validation and Domain/Application business validation remain separate concerns
- explicit response schemas and DTO mapping form an allowlist; ORM/Domain/internal metadata is never serialized directly to clients
- Public and Admin DTOs may differ according to visibility and workflow context; mutable Titles/Slugs are not authoritative resource identity
- a canonical machine-readable API error model is used without exposing stack traces, SQL errors, filesystem paths, or internal exceptions
- HTTP status semantics are standardized: `400` transport/schema failure, `401` unauthenticated, `403` forbidden, `404` unavailable/not found, `409` concurrency/current-state conflict, `422` structurally valid Domain/business-rule violation where appropriate
- optimistic concurrency is enforced by the backend API and conflicting updates are not silently overwritten
- page-based pagination is the Version 1 default where needed; filters/sorts are explicit allowlists rather than arbitrary database query exposure
- OpenAPI is generated from runtime route schemas for developer/integration use; public production Swagger UI is not a baseline feature
- dependencies are wired through explicit composition; no DI container/service locator is required in Version 1
- Fastify plugins/hooks are reserved for HTTP/infrastructure concerns and do not become an invisible global Application dependency registry
- framework-specific code stays at the transport/bootstrap edge so Domain/Application behavior remains framework-independent

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–114 continuous**.

Next topic: **Database Technology, Data Access & Transaction Strategy**.

### System Blueprint — Repository & Codebase Structure Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- one repository with a lightweight workspace/monorepo structure; primary applications are `apps/web`, `apps/admin`, and `apps/server`
- only a small number of genuine shared packages (`contracts`, neutral `ui`, developer `config`) are introduced as needed
- Server is organized module-first with pragmatic Domain/Application/Infrastructure boundaries; ceremonial Clean Architecture is explicitly avoided
- backend Domain Entities, ORM models, database rows, repositories, and internal permission objects never become shared frontend/API contracts
- transport DTOs/runtime schemas are the browser/server sharing boundary; Public/Admin representations can differ by visibility/workflow needs
- shared UI is limited to neutral primitives; Public and Admin feature components remain application-owned
- each Server module exposes an intentional public entry point and cross-module consumers cannot deep-import another module's persistence/internals
- internal module communication stays in-process; HTTP controllers only handle transport/auth/validation/mapping and do not own business rules
- Public/Admin use typed API-client boundaries and API inputs are runtime-validated in addition to TypeScript compile-time typing
- database schema evolution is version controlled; schema migrations, reference/bootstrap seeds, and future WordPress migration remain separate concerns
- Cron/CLI operations reuse the authoritative Application/Domain core; root scripts are not a second production implementation path
- runtime configuration/secrets stay outside source code and are validated at startup
- tests are primarily colocated with owning modules/features; critical invariants matter more than coverage percentage alone
- circular/deep imports, giant Shared/Utils areas, frontend access to backend internals, and manual phpMyAdmin schema changes as normal workflow are explicit smells/anti-patterns
- Nx/Turborepo, remote caches, internal package publishing/versioning, custom architecture tooling, and empty folder architecture are deferred until real need exists

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–88 continuous**.

Next topic: **Backend Framework, API Style & Runtime Validation Strategy**.

### Canonical Integrity Repair Before Repository Structure Update

A current-directory regression was detected before applying the accepted Repository Structure changes.

Actions:
- preserved the stale/regressed `08-search.md`, `09-migration-plan.md`, and `10-system-blueprint.md` copies in `archive/`
- restored `current/08-search.md` from the last verified Canonical ZIP as **FROZEN v1.0, Sections 1–172**
- restored `current/10-system-blueprint.md` from the last verified Canonical ZIP at the accepted **Sections 1–50** baseline before applying this update
- removed the reappeared `current/09-migration-plan.md`; Migration remains **DEFERRED / NOT ACTIVE**
- no accepted Product/System Blueprint decision was replaced by the stale working copies

### System Blueprint — Application Boundaries & Module Architecture Accepted

Accepted and added to `current/10-system-blueprint.md`.

Key decisions:
- Version 1 is organized into Business/Domain Modules, Cross-Cutting Application Modules, and a deliberately small Technical Foundation
- Business Modules are `Editorial Content`, `Organization & Directory`, `Citizen Services`, `Health Services & Area`, `Health Information`, `Documents & Media`, `ITA`, and `Homepage`
- `Identity & Access`, `Publishing`, `Search`, and `Audit` are cross-cutting application concerns and do not replace canonical Domain ownership
- Editorial Content owns Basic Page / News / Activity / Announcement / Health Content with Domain-specific lifecycle semantics
- Organization & Directory owns Personnel / Organization / Contact Information / Related Organization; Personnel remains separate from CMS User identity
- Citizen Services owns Service while referencing canonical shared Documents/resources rather than duplicating file metadata
- Health Services & Area owns Health Service plus the purpose-specific Province → District → Subdistrict → Village geographic master; Area is not generalized into a taxonomy engine
- Health Information owns Health Report as a first-class resource that references, but is not reduced to, a Report Document
- Documents & Media owns canonical Document/Media identity, lifecycle, file/storage metadata and reusable resource relationships
- ITA owns Fiscal Year / MOIT / Requirement / Evidence relationships while reusing canonical Document/Media resources
- Homepage owns configuration and placements only; source lifecycle/public eligibility remains authoritative
- Publishing coordinates authorized publication transitions but does not duplicate Domain lifecycle state or become a generic workflow/state-machine platform
- Search remains a derived read projection; Audit records accountable actions without becoming authorization or lifecycle authority
- normal dependency direction is Presentation → Application Capability → Domain → Persistence/Infrastructure
- cross-module communication is explicit and in-process; direct cross-module repository/table mutation and internal localhost HTTP are prohibited
- cross-module references use stable internal identities instead of titles/slugs/URLs
- Shared Foundation remains small and technical; business concepts stay in their owning Module
- atomic canonical business invariants may use the single SQL transaction boundary; Search synchronization remains outside the canonical mutation transaction while required accountable Audit records join the critical transaction when practical
- generic Content/Entity/Workflow frameworks, module-per-table/screen designs, large Shared/Common business-logic areas, Search-as-Source-of-Truth, Homepage content copies, ITA file duplication, Personnel=CMS User, and CMS/Dashboard data mixing are explicit anti-patterns

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–50 continuous**.

Next topic: **Repository & Codebase Structure**.

### System Blueprint — Architecture Foundation & Technical Boundaries Accepted

Accepted and created `current/10-system-blueprint.md` as **WORKING DRAFT v0.1**.

Key decisions:
- Version 1 uses a Node.js Modular Monolith with explicit internal module/data/action boundaries rather than premature microservices
- React + Vite remains the frontend direction, but the Public Website is not constrained to pure CSR; hybrid SSR/pre-render/client rendering remains available by route need
- Admin CMS is CSR-oriented and remains a separate presentation/security context while sharing the same Application/Domain Core
- backend authorization, validation, lifecycle, concurrency, and public-impact rules are authoritative; frontend checks are UX only
- API surfaces model Domain capabilities rather than generic raw-table CRUD
- server-side rendering uses Application services directly rather than unnecessary localhost HTTP calls into the same application
- relational SQL remains the canonical CMS Source of Truth; Dashboard/Analytical Data keeps a separate logical database/API/data-ownership boundary
- Search begins as an application module/derived public projection; dedicated Search infrastructure is added only if Frozen `08` cannot be satisfied simply enough otherwise
- Redis remains optional rather than a Version 1 dependency
- scheduled/background work begins with idempotent Node application tasks triggered by hosting scheduler/Cron instead of a distributed queue platform
- Media binary storage is separated from structured Media identity/metadata/relationships stored in SQL
- Identity & Access stays within the primary backend application; no separate identity microservice is required in Version 1
- same-origin / one-primary-application deployment is the baseline when practical
- production follows a supported Node.js LTS policy; exact version remains a deployment concern
- microservices, Kubernetes, brokers, dedicated Search service, Redis dependency, GraphQL, WebSockets, serverless architecture, object storage/CDN, and similar complexity require evidence before adoption
- technical choices must implement Frozen `00–08` semantics and cannot silently redesign Product behavior for framework convenience
- `09-migration-plan.md` remains Deferred and is not a dependency of the active System Blueprint

Next topic: **Application Boundaries & Module Architecture**.

### Migration Plan — Deferred Pending Real WordPress Evidence

Migration planning is paused until the real legacy WordPress database and media files can be inspected.

Actions:
- removed `current/09-migration-plan.md` from the active Canonical working set
- preserved the previous draft as `archive/09-migration-plan-paused-2026-08-14.md` for historical reference only
- restored the active Canonical baseline to Frozen documents `00–08`
- previous `09` draft decisions are not active Canonical requirements and must be revalidated before reuse
- migration work will resume after inspecting a full WordPress SQL dump plus `wp-content/uploads/`, with particular attention to Post ↔ Featured Image / Attachment / embedded image / Gallery / plugin metadata relationships
- this deferral avoids designing migration rules from assumptions about the real legacy storage structure

Current state: **Migration Plan DEFERRED; no active Working Draft document.**

### Migration Plan — Migration Decision Rules, Historical Retention & De-duplication Policy Accepted

Accepted and added to `current/09-migration-plan.md`.

Key decisions:
- Migration Decision and Target Lifecycle are separate; legacy publication state never determines target Current/Published state by itself
- Current/Historical decisions depend on validity, public value, safety/privacy risk, duplication, and successor relationships rather than age alone
- Historical Public is selective and must carry explicit Domain lifecycle context
- News/Activity generally preserve legitimate history; Announcement preserves Current plus selected meaningful Historical records
- Health Content and Service use safety/current-truth-first retention; obsolete guidance is reviewed, redirected, updated, or kept Backup-only rather than remaining misleading Historical Public
- Personnel/Organization primarily preserve verified current structured records, while legitimate historical references remain intact in parent content
- Health Service Current migration requires verification; Temporarily Closed remains Current, Inactive Historical is selective, and Hidden is not a migration parking state
- Documents may retain meaningful Expired/Superseded history with successor relationships; Health Reports preserve legitimate reporting history broadly
- ITA preserves Fiscal Year-specific historical relationships and does not auto-follow newer Evidence
- Contact Information is current-first; obsolete contacts are Backup-only by default
- de-duplication distinguishes Exact Duplicate / Semantic Duplicate / Historical Version and never merges legitimate versions solely because titles/content look similar
- duplicate/absorbed legacy URLs may map to one canonical target; unrelated removed content is never redirected generically to Homepage/category
- historical migration re-evaluates privacy/safety; `Once Public = Always Public` is explicitly rejected
- no universal age-based retention/deletion rule is Frozen in Version 1
- migration manifest records concise decision reason, target type/lifecycle, duplicate/version relations, review requirement, and legacy URL outcome
- AI migration scoring/auto-decisions, title-only dedup, automatic republishing/activation of obsolete content, and enterprise retention tooling remain excluded

Next topic: **Legacy URL Mapping, Redirects & Link Rewrite Strategy**.


### Migration Plan — Legacy Inventory, Classification & Content Mapping Strategy Accepted

Accepted and added to `current/09-migration-plan.md`.

Key decisions:
- Inventory, Classification, Migration Decision, and Target Mapping are separate steps; WordPress storage type does not determine target Domain by itself
- inventory covers Posts, Pages, Media/Documents, Taxonomies, Navigation, Users, and evidence-backed custom structures, with legacy identity/URL traceability retained
- every known legacy Public URL stays in the manifest even when content does not migrate
- legacy Posts map by meaning into News / Activity / Announcement / Health Content / Document-led content / Review rather than universally becoming News
- legacy Pages are decomposed into Frozen structured resources where appropriate rather than universally becoming Basic Pages
- Personnel, Organization, Health Service, Service, Contact Information, ITA, Documents, and Health Reports retain structured Domain semantics during migration
- media inventory is usage-aware; orphaned/generated/duplicate/broken assets are reviewed instead of blindly copied
- PDFs are classified by public/business meaning and relationships; `PDF` is not a target Content Type
- Categories/Tags and legacy menus are classification/navigation evidence only and cannot override the Frozen taxonomy/IA/Sitemap
- WordPress Users are inventoried for trustworthy attribution and controlled onboarding only; authentication/legacy Roles are not automatically migrated
- deterministic rules automate clear cases while ambiguous meaning enters Review Required; Version 1 does not require AI/ML classification
- migration supports 1→1, 1→Many, and Many→1 mappings and preserves provenance
- practical duplicate checks use URL/content/title/canonical-subject/file-hash evidence without an advanced duplicate platform
- target lifecycle/date semantics follow Domain meaning and evidence rather than blindly copying legacy status or `post_date`
- imported records pass Frozen target validation and may remain Draft/Review rather than fabricating missing data
- one external migration manifest is the working Source of Truth for source identity, decisions, mappings, redirects, validation, exceptions, and outcomes
- human review is exception-focused and risk-based, with stronger review for high-value structured/public Domains

Next topic: **Migration Decision Rules, Historical Retention & De-duplication Policy**.

### Migration Plan — Migration Foundation & Scope Accepted

Accepted and created `current/09-migration-plan.md` as **WORKING DRAFT v0.1**.

Key decisions:
- Migration is a controlled transition into the Frozen IA/Content Model/lifecycle/URL rules rather than a one-to-one WordPress copy
- legacy content is classified by meaning and ongoing public value before migration
- migration decisions distinguish Current, Historical, Review Required, Redirect Only, Do Not Migrate, and Backup-only outcomes
- WordPress IDs/URLs support traceability and redirect mapping but never become the new canonical identity model
- legacy URLs redirect only to meaningful canonical successors; blanket homepage redirects are prohibited
- Media migration prefers referenced legitimate original/canonical assets instead of every thumbnail/derivative or unused upload
- PDFs/Documents are mapped into Document/Health Report/ITA/Service relationships instead of remaining contextless attachment URLs
- internal legacy links are rewritten toward new canonical URLs where reliable mapping exists
- structural cleanup removes legacy presentation debt while preserving legitimate content meaning
- deterministic migration work is automated; ambiguous classification/metadata/ownership/history receives targeted human review
- trustworthy original dates/attribution are preserved; unknown legacy actors are never fabricated
- migration remains traceable and repeatable/idempotent during preparation
- trial migration plus final delta/synchronization precedes production cutover
- WordPress roles/passwords/plugin/theme configuration are not blindly migrated into the new CMS security/presentation model
- validation covers structure, semantic mapping, public lifecycle/visibility, files/relationships, Search eligibility, and redirects
- migration reconciliation records decisions/failures without requiring an enterprise migration dashboard
- cutover includes verified backup, practical fallback/rollback planning, stabilization, and controlled legacy retirement
- one canonical public website remains after cutover; permanent WordPress↔New CMS dual-write is excluded
- “No data loss” means intentionally preserved legitimate information is never lost without an explicit migration decision, not that every technical artifact survives
- exact extraction/import/redirect/DNS/batch/retention/authentication implementation remains deferred until requirements justify it

Next topic: **Legacy Inventory, Classification & Content Mapping Strategy**.

### Public Search / Search & Discovery v1.0 — Final Consistency Review & Freeze

Final Search review against Frozen `00–07` completed with **PASS** and `current/08-search.md` is now **FROZEN v1.0**.

Consistency repairs applied before Freeze:
- aligned Public Search Groups exactly to the Frozen Sitemap baseline: `ทุกประเภท / ข่าวสาร / บริการประชาชน / ข้อมูลสุขภาพ / หน่วยบริการ / เอกสาร / ITA / เกี่ยวกับเรา`
- aligned Version 1 Personnel/Organization Search destinations to `/about/personnel` and `/about/organization`; Search does not create new per-entity routes
- aligned Search operations with Frozen Admin/Roles boundaries: Search health is read-only/actionable and outside the Admin Work Dashboard; Version 1 adds no CMS `search.reindex` permission, and any future CMS-exposed maintenance action requires Roles & Permissions Impact Review / Controlled Amendment

Final consistency result:
- Foundation / IA / Content Model / Sitemap / Homepage — PASS
- Admin CMS / Roles & Permissions / Publishing Workflow — PASS
- Search Unit / Thai matching / ranking / de-duplication — PASS
- Search UX / filters / URL query-state — PASS
- lifecycle synchronization / fail-closed / reconciliation — PASS
- operations / observability / security / privacy — PASS
- over-engineering and System Blueprint deferral — PASS

Freeze record: `reviews/search-freeze-review.md`.

Next planned document: **`09-migration-plan.md` — Migration Plan**.

### Canonical Integrity Restoration During 08 Final Review

Before the Final Search review, physical `current/05-admin-cms.md`, `current/06-roles-permissions.md`, `current/07-publishing-workflow.md`, and `current/08-search.md` were detected as stale Working Draft snapshots despite later accepted/frozen states recorded by Project Index, Changelog, Freeze Reviews, archives, and the latest Canonical ZIP.

Recovery actions:
- preserved each stale on-disk current copy in `archive/` with `stale-current-detected-2026-08-14-final-search-review` filenames
- restored `05` FROZEN v1.0 (60 sections), `06` FROZEN v1.0 (44 sections), `07` FROZEN v1.0 (43 sections), and `08` Working Draft v0.1 (171 accepted sections) from the latest verified Canonical ZIP
- preserved `08-search-v0.1-pre-final-review-2026-08-14.md`, plus pre-Freeze Index/Changelog snapshots, before applying Final Review repairs
- restoration changed no accepted product decision; Final Review corrections were applied separately and then `08` was Frozen v1.0

### Public Search / Search & Discovery — Search Security, Privacy & Abuse Boundaries Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- Public Search operates over an explicitly public-safe projection and never becomes a generic CMS/database query interface
- Public Search exposes only a small allowlisted/server-validated keyword/filter/page contract; arbitrary fields, raw conditions, regex, scripting, engine-native syntax, and unbounded request controls are excluded
- user queries are treated as data; safe parameterized query execution and server-side validation remain authoritative
- legitimate short acronyms remain supported while query/result/page dimensions have reasonable upper bounds
- Hidden/Internal/withdrawn/missing/Public-ineligible resources reveal neither content nor existence, suppressed counts, or facet counts
- stable identifier knowledge never bypasses canonical Public eligibility
- snippets/highlights/API results use sanitized public-safe fields only and never expose internal notes, approval/audit data, private contacts, or raw editor markup
- Global Public Search remains Public-information-only and never implicitly expands into patient/case/application/authenticated/internal search
- Version 1 uses proportionate rate limiting/resource protection without mandatory login, CAPTCHA, profiling, or enterprise bot management for normal use
- clients cannot select unbounded/expensive algorithms, unlimited result sizes, or internal Search-engine controls
- dynamic `/search?...` URLs are user discovery views rather than canonical SEO pages and should remain `noindex`; crawler directives are not security controls
- Public Search API responses are purpose-built/read-only/minimal and never send sensitive CMS fields for the frontend to hide
- public Search errors remain generic/safe while infrastructure details remain operational-only
- raw Search queries are potentially sensitive user input and follow data-minimization/bounded-retention principles
- future usage analytics/history/personalization requires separate need/privacy review
- Version 1 relies on straightforward public projection, canonical eligibility, bounded validated requests, safe output, graceful failure, and proportionate abuse controls rather than an enterprise security platform

Next topic: **Final Search Consistency Review & Freeze Readiness**.

### Public Search / Search & Discovery — Search Operations, Reindexing, Observability & Admin Boundaries Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- Search operations are system responsibilities; Editors/Publishers manage canonical content and never perform routine indexing/retry/cache repair
- Administrator-facing Search health remains small/actionable rather than exposing queue/worker/payload/index internals
- simple derived health such as Healthy / Degraded / Unavailable may exist; exact thresholds remain implementation concerns
- incremental synchronization is the normal path; full rebuild/reindex exists for controlled recovery/maintenance from canonical truth
- scoped reindex may exist where useful, but Version 1 does not require a Search administration console or per-record retry workflow
- reconciliation complements retry and converges Search toward latest canonical truth without continuous full-record comparison
- operational observability covers availability, query failures, synchronization/freshness, and reconciliation health; Search Usage Analytics remains outside Version 1 baseline
- raw Search queries are treated as potentially sensitive input; operational logs follow data minimization and bounded-retention principles
- alerts target sustained actionable conditions; visibility-safety failures receive highest priority and always fail closed
- no staff-editable ranking weights, query boosts/pinning, or global Search synonym manager in Version 1
- manual reindex, if exposed, is Administrator-only and cannot change/bypass lifecycle or visibility
- Search maintenance may degrade availability but never privacy/visibility guarantees
- engine/projection/queue/retry/reconciliation/monitoring/SLA details remain deferred to `10-system-blueprint.md`

Next topic: **Search Security, Privacy & Abuse Boundaries**.


### Public Search / Search & Discovery — Search Index Freshness, Lifecycle Synchronization & Failure Safety Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- canonical CMS/Domain state is always the Source of Truth; Search remains a reconstructible derived discovery projection
- Search synchronization failure does not normally roll back an otherwise successful canonical publication/update
- discovery freshness may be eventually consistent briefly, but visibility/privacy must always fail closed
- every Public Search result rechecks current canonical Public eligibility so stale index/cache data cannot prolong exposure
- Draft, Pending Review, Approved-but-unpublished, Scheduled-before-successful-publication, Hidden, and Internal records remain absent from Public Search
- newly Published content becomes Search-eligible only after actual publication succeeds; scheduler failure creates no Search result
- Published changes refresh Search projection while canonical public pages remain authoritative for latest committed content
- Archive/Closed/Expired/Superseded/Inactive follow Domain-specific Historical Public semantics rather than a universal remove-from-search rule
- Hidden/Internal/Withdrawal/Delete are visibility-critical transitions that immediately suppress Public discovery from the user perspective
- Document supersession synchronizes from the canonical atomic successor/predecessor transition without coupling Search to the same database transaction
- Health Service Temporarily Closed remains current/searchable with status; Hidden becomes immediately non-public; Inactive remains domain-specific
- Personnel/Organization visibility changes do not retroactively rewrite legitimate historical public content
- Contact/Media/ITA supporting data may refresh parent projections without becoming standalone Search Units
- Homepage placement/promotion timing never controls source Search eligibility
- freshness expectations distinguish visibility-critical, public-state-critical, and ordinary content-freshness changes without fixed numeric SLA in the Product Contract
- Search projection can be reconciled/rebuilt from canonical data; index loss never implies content loss
- retries/reconciliation are idempotent, latest-canonical-state-wins, and safe against stale/out-of-order updates
- missing canonical records and stale caches fail closed
- Search subsystem failure degrades Search only; canonical public pages/navigation/direct URLs remain independent
- indexing/retry/rebuild are operational states, not Content lifecycle states, and routine technical retries do not pollute Publishing Audit history
- enterprise streaming/exactly-once/search-job-console/zero-lag infrastructure remains excluded unless later requirements justify it

Next topic: **Search Operations, Reindexing, Observability & Admin Boundaries**.

### Public Search / Search & Discovery — Search Results UX, Filters & Query-State Behavior Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- `/search` is the single Global Public Search surface; module-specific search remains within relevant modules
- explicit submit Search keeps query visible; mandatory search-as-you-type is excluded from the baseline
- query, filters, and pagination are shareable/recoverable URL state
- result cards use canonical Title/Name links, human-readable type labels, Domain-relevant metadata, and explicit historical lifecycle context
- filters remain intentionally small: Search Group/Content Type first, Fiscal Year only where Domain semantics justify it
- active filters are visible/clearable, preserve query, generally persist during query refinement, and reset page to 1 when query/filter changes
- predictable URL-backed pagination replaces infinite scroll; page size remains system-controlled
- zero-result, loading, and Search Error are distinct states; errors preserve query and expose no internal detail
- empty `/search` is not an all-content listing or Sitemap; no arbitrary minimum query length blocks valid acronyms
- Desktop/Mobile share one Search model while presentation remains responsive
- accessibility-first semantics apply to Search input, filter controls, result updates, status labels, and error/loading states
- Public Search exposes only public-safe metadata and never private patient/case/application records
- autocomplete, trending queries, personalized suggestions, and custom Search History are not Version 1 baseline requirements

Next topic: **Search Index Freshness, Lifecycle Synchronization & Failure Safety**.

### Public Search / Search & Discovery — Search Ranking, Result Ordering & De-duplication Rules Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- directness/matching strength rank before generic recency
- exact canonical Title/Name and curated Alias matches outrank phrase/prefix/metadata/body/supporting relationships
- direct canonical answers outrank indirect mentions without fixed global Content-Type favoritism
- Current Public is preferred over comparable Historical Public, but stronger explicit historical matches remain discoverable
- current successors are preferred for general queries while exact predecessor identity remains retrievable
- recency is a supporting signal using Domain-meaningful dates
- ITA current fiscal year gets only modest default preference; explicit query/filter year overrides it
- Health Report over attached Report Document, Service over pure supporting resources, and ITA Requirement over context-only Evidence are handled through semantic de-duplication
- de-duplication is query-sensitive result-set presentation logic and never destroys underlying canonical Search identity
- shared resources retain one Search identity even when reused by multiple parents
- no artificial content-type diversity quota, popularity/click ranking, sponsored/admin-promoted results, behavioral personalization, or AI/ML reranking in Version 1
- filters narrow the candidate set while keeping the same relevance model; weak unrelated results are not added merely to fill pages
- deterministic tie-breaking ultimately falls back to stable identity
- numeric score formulas and engine-specific ranking parameters remain deferred to `10-system-blueprint.md`

Next topic: **Search Results UX, Filters & Query-State Behavior**.


### Public Search / Search & Discovery — Searchable Fields, Matching & Thai Query Behavior Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- searchable fields are selected by public meaning rather than database presence
- Title/Name and authored Summary are the strongest matching fields by default, followed by meaningful metadata and Body/Description
- Public Search indexes only public-safe projections and excludes internal notes, Audit data, private contacts, and internal-only relationships
- Version 1 does not require full-text extraction or OCR of every PDF
- Thai Search tolerates harmless whitespace, punctuation, Unicode, Latin-case, and Thai/Arabic numeral differences
- year-aware fields may deterministically match Buddhist Era/Gregorian equivalents without transforming arbitrary numbers
- identifiers and codes prioritize exact matching and reject aggressive fuzzy behavior
- reasonable Thai word/prefix matching is required while unrestricted substring matching is not baseline
- stable public aliases/abbreviations may support Organization, Health Service, Service, and stable reference data without changing canonical identity
- no mandatory Search Keywords on routine content and no large thesaurus/medical ontology/search terminology platform
- public-safe relationships/supporting child content may contribute matching signals without creating duplicate results
- ITA matching supports Fiscal Year, MOIT formatting, Requirement titles/codes, and useful Evidence Document titles
- typo tolerance remains conservative; no AI query rewrite, semantic expansion, automatic correction platform, or AI-generated result summaries
- searchable text is normalized public text rather than HTML/CMS markup; snippets prefer authored Summary or a safe public excerpt

Next topic: **Search Ranking, Result Ordering & De-duplication Rules**.


### Public Search / Search & Discovery — Searchable Content & Search Unit Model Accepted

Accepted and added to `current/08-search.md`.

Key decisions:
- Search Unit means a meaningful canonical public destination, not every database record/file/attachment
- one canonical resource normally produces one Global Search result; supporting resources do not automatically duplicate it
- News, Activity, Announcement, Health Content, Health Report, Basic Page/semantic pages, Service, Health Service, and meaningful standalone Documents are primary Search Units
- Health Report is returned through its canonical report page; attached report PDF/Document is normally suppressed as a Global Search duplicate
- standalone Documents remain searchable when they have independent public meaning; supporting attachments may resolve through parent context
- Personnel/Organization are conditional on legitimate public destinations; no profile is invented solely for Search and Master Data alone is not searchable
- Contact Information and Media are not standalone Public Search Units
- ITA uses Fiscal Year and Requirement as primary Search Units; MOIT/Section carries context and Evidence normally resolves through Requirement
- Homepage/menu items/raw Dashboard metrics/pagination/list state are not Search Units; meaningful Hub/Dashboard entry pages are conditional
- Search Unit and Searchable Source are explicitly separate concepts
- semantic duplicate results are suppressed in Global Search while module-specific discovery may still expose canonical Documents
- Search eligibility is derived from Domain, canonical identity, Public Visibility and lifecycle; no universal `Show in Search` checkbox
- stable canonical identity, not Title/Slug/Filename, identifies Search Units across lifecycle changes

Next topic: **Searchable Fields, Matching & Thai Query Behavior**.


### Public Search / Search & Discovery — Foundation Accepted / Working Draft Started

Created `current/08-search.md` as **WORKING DRAFT v0.1** after acceptance of the Search Foundation.

Key accepted decisions:
- Public Search is a first-class discovery feature but does not replace clear IA/navigation
- Public Search and Admin Search remain separate concerns
- Frozen `/search`, Cross-Content Search, Search Group, canonical-destination, and shareable-query-state constraints are inherited rather than redefined
- Public Search eligibility never exceeds canonical Public Visibility; Draft/Pending Review/Approved-unpublished/Scheduled-before-publication/Internal/Hidden/withdrawn content never leaks through normal results
- Current Public information is preferred while eligible Historical Public information may remain discoverable with explicit lifecycle context
- Search eligibility/searchable units/result metadata follow Domain meaning rather than universal database rules
- results lead to canonical pages; raw files are not the default destination where canonical pages exist
- Dashboard raw analytical data remains outside Global Search; ITA Search must retain Fiscal Year/MOIT/Requirement context
- Version 1 uses deterministic keyword-oriented search with Thai-language usability as a functional requirement
- small curated aliases may be added only for real terminology; no enterprise synonym/ontology system
- no-result behavior provides clear recovery guidance without AI suggestions
- filters remain small/evidence-driven and reuse existing taxonomy/master data
- Search Index is derived and never the Source of Truth or a visibility authority; search failures fail closed
- no AI semantic/vector/conversational search, personalization, Search Analytics platform, or enterprise search administration in Version 1

Next topic: **Searchable Content & Search Unit Model**.


### Publishing Workflow v1.0 — Final Consistency Review & Freeze

User accepted all Final Review corrections. `current/07-publishing-workflow.md` was restored from the retained accepted pre-edge-cases snapshot plus the accepted Edge Cases decision, corrected across all affected sections, verified against Frozen `00–06`, and frozen as **FROZEN — Publishing Workflow Baseline v1.0**.

Final corrections applied:
- restored `Hidden` for Health Service / Personnel / Organization / Document and meaningful Document `Expired` from Frozen Content Model/Sitemap semantics
- replaced singleton Contact Configuration wording with structured Contact Information (`Public / Internal / Hidden` visibility + Status) and Publisher-level public-impact changes
- removed whole-Homepage Scheduled Configuration; scheduling remains only for eligible temporal placements from Frozen Homepage rules
- aligned bulk actions with Admin CMS: Bulk Publish/destructive Bulk Delete excluded; domain-safe Bulk Archive may exist where justified
- clarified Scheduled editing under Approval OFF vs Approval ON content lock
- replaced ambiguous `Editor Working State` wording with `Authorized Working Changes`

Final result: Foundation PASS, IA PASS, Content Model v1.1 PASS, Sitemap PASS, Homepage PASS, Admin CMS PASS, Roles & Permissions PASS, scheduling/approval/history/audit/concurrency PASS, over-engineering PASS. No unresolved architecture blocker remains.

Artifacts:
- `current/07-publishing-workflow.md` — FROZEN v1.0
- `reviews/publishing-workflow-freeze-review.md`
- `archive/07-publishing-workflow-v0.1-pre-freeze.md`

Next planned document: **`08-search.md` — Public Search / Search & Discovery**.

### Canonical 07 Integrity Restoration Before Freeze

During Freeze execution, the physical `current/07-publishing-workflow.md` was found to have reverted to a stale Section-24 snapshot while Changelog/Index and retained archives recorded accepted decisions through Section 41. The file was restored from `archive/07-publishing-workflow-v0.1-pre-edge-cases-2026-08-14.md` (accepted through Section 39) plus the separately accepted Edge Cases baseline, then Final Review corrections were applied. No accepted product decision was silently invented or discarded.


### Canonical Frozen Baseline Integrity Restoration During 07 Final Review

During the Final Publishing Workflow Consistency Review, `current/05-admin-cms.md` and `current/06-roles-permissions.md` were found to have reverted to stale Working Draft snapshots even though `PROJECT-INDEX.md`, Freeze Reviews, and prior Changelog records correctly identified them as Frozen v1.0.

Integrity restoration completed without changing accepted product decisions:
- restored `current/05-admin-cms.md` to **FROZEN — Admin CMS Baseline v1.0**, Sections 1–60, using retained accepted material plus `reviews/admin-cms-freeze-review.md` and the documented five freeze corrections
- restored `current/06-roles-permissions.md` to **FROZEN — Roles & Permissions Baseline v1.0**, Sections 1–44, including all six documented final-review corrections/limitations
- corrected the Admin CMS `Last Updated` header to 14 สิงหาคม 2569 to match its Freeze Review
- preserved the stale detected copies in `archive/05-admin-cms-stale-current-detected-2026-08-14.md` and `archive/06-roles-permissions-stale-current-detected-2026-08-14.md`
- no new Product/Workflow decision was introduced by this restoration

The 07 Final Review therefore continues against the physically restored Frozen `00–06` baselines.

### Publishing Workflow — Edge Cases & Cross-Workflow Consistency Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- latest valid committed state wins when Approval, Schedule, lifecycle, concurrency, or authorization collide
- with Approval OFF, Scheduled content may be edited/revalidated in place; with Approval ON, Approved/Scheduled content is locked and substantive changes require Cancel → Draft → Review again
- Reschedule does not invalidate Approval; Approval remains point-in-time readiness and dependencies are revalidated at publication/execution
- Announcement Expiry overrides stale Published editing; Reopen remains a Publisher-level lifecycle action in Version 1
- Disabled submitters/reviewers do not cancel organizational workflow; current authorization governs subsequent actions
- Pending/Approved/Scheduled records do not jump directly to Archive; Draft semantics are restored first where appropriate
- stale Published edits cannot reverse newer Archive/Close/Inactivate/Supersede/etc. transitions
- current Homepage source invalidation uses eligibility/fallback safely; invalid Scheduled Homepage replacements fail without disturbing the current Homepage
- Document replacement revalidates the intended predecessor at commit and never guesses a new replacement chain
- Permanent Withdrawal and ordinary lifecycle changes do not cascade across related records/resources
- generic post-publication invalidity does not auto-unpublish already-Published content by default
- permission changes are prospective and never undo previously committed workflow decisions
- repeated/concurrent manual or automatic actions commit only one valid transition/Audit event
- historical integrity is stronger than editing convenience; presentation surfaces consume lifecycle eligibility rather than override it

Next topic: **Final Publishing Workflow Consistency Review**


### Publishing Workflow — UX & Action Presentation Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- publishing UI shows a small set of meaningful next actions rather than the underlying state machine
- one stable publishing action region is used; domain-language verbs replace arbitrary status dropdowns
- Approval UI disappears completely when disabled for a Module
- Published records use `Save Changes`; Editors without public-impact authority remain read-only
- Scheduled records expose scheduled time plus Publish Now / Reschedule / Cancel actions
- readiness uses Errors/Warnings without scores or AI quality gates
- Publish/Schedule commit current valid working data without requiring a redundant Save first
- exceptional lifecycle actions remain secondary/deliberate; Document replacement/entity lifecycles use domain-specific UX
- no routine list-level or bulk public-impact transitions in Version 1
- Preview remains protected/non-public; record history stays contextual rather than becoming an activity feed
- desktop/mobile preserve the same workflow semantics; server-confirmed state remains authoritative
- Version 1 excludes workflow wizards, giant state diagrams, bulk publishing, quality dashboards, lock-heavy permission UI, and duplicated publishing editor designs

Next topic: **Publishing Edge Cases & Cross-Workflow Consistency**




### Publishing Workflow — Audit, Attribution & Workflow History Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- Record Metadata, record-level Workflow History, and Central Audit Log are separate concerns
- Created/Updated/Published/Scheduled/Approved attribution keeps distinct workflow meaning and stable identities
- routine Draft saves/Autosave do not flood Workflow History; meaningful workflow/public-impact transitions do
- Scheduled Publish keeps both human scheduler attribution and System execution attribution
- Return for Revision requires a concise internal reason
- Published Changes are auditable even when lifecycle state remains Published
- record-level history is contextual for authorized record users; Central Audit remains Administrator-level in Version 1
- Document Supersession is traceable in both directions; Published File Correction and Permanent Withdrawal use stronger audit context and require reasons
- internal workflow reasons and staff attribution are not Public transparency data by default
- imported legacy content preserves trustworthy dates/attribution and never fabricates missing actors
- normal validation/permission/concurrency failures do not create Audit noise; repetitive scheduler retries remain technical logs
- meaningful public-impact transitions and Audit events are one logical operation; exact atomic mechanism is deferred to `10-system-blueprint.md`
- no full revision diff/restore, activity feed, audit modification/deletion, public staff audit log, productivity analytics, or enterprise audit/reporting subsystem in Version 1

Next topic: **Publishing Workflow UX & Action Presentation**


### Publishing Workflow — Historical Visibility Rules Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- Current Public, Historical Public, and Non-Public are conceptual/derived behaviors, not another universal status field
- Archive/Closed/Expired/Superseded do not automatically mean deleted; historical visibility follows Domain meaning
- historical records leave current/Homepage surfaces and carry clear non-current context
- canonical Public ID/URL remain stable through ordinary lifecycle transitions
- News, Activity, Health Report, historical Documents, Superseded Documents, and historical ITA years may retain public historical detail
- Archived Health Content and Service may remain historical only with strong non-current context and no current promotion
- Temporarily Closed Health Services remain current directory information; Inactive services do not
- Inactive Personnel leave current Personnel/Leadership views while historical relations remain intact
- Superseded Documents retain original identity/file, link to successor, and do not auto-redirect
- historical ITA Evidence and other historical relations never auto-follow successors
- Permanent Withdrawal is distinct from Archive and maps to Gone/Redirect semantics where appropriate; unpublished/nonexistent content remains Not Found
- original publication dates/authorship/identity/relationships are preserved through lifecycle transitions
- previously Public content is lifecycle-first rather than Hard Delete
- no age-based automatic archival/deletion, universal Archive Center, or universal Restore action in Version 1

Next topic: **Publishing Audit, Attribution & Workflow History**



### Publishing Workflow — Optional Approval Workflow Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- Approval Workflow remains OFF by default and is invisible in routine CMS workflow while disabled
- Version 1 uses one lightweight approval stage: Draft → Pending Review → Approved → Publish/Schedule
- Editors/Publishers may Submit; Publishers/Administrators Review, Return, and Approve within authorized Module Scope
- no new Reviewer/Approver role and no mandatory different-person approval in Version 1
- Pending Review is not edited in place; Withdraw/Return sends work back to Draft
- Return for Revision requires a concise reason; routine Submit/Approve/Publish/Schedule does not
- Approval requires full Publish Readiness; any publication-content edit after Approval invalidates it and returns the package to Draft
- Publish/Schedule always recheck current authorization/readiness/concurrency even after Approval
- Cancel Schedule returns to Draft and invalidates prior Approval; Publish Now from Scheduled does not require re-approval
- Approval is configured per eligible publishable Module, never per User or per Record
- Personnel, Health Service, Organization, and Contact lifecycles remain outside Approval Workflow in Version 1
- Approval never cascades to related resources
- Review work remains a lightweight Dashboard queue with no reviewer assignment, SLA, claiming, workflow inbox, or external approval routing
- Version 1 Approval does not create proposed revisions for already Published content; Published edits remain Publisher-level direct Save Changes
- Approval configuration changes are prospective and cannot be disabled while unresolved Pending Review/Approved items remain
- meaningful Approval transitions are audited; enterprise workflow and collaboration features remain excluded

Next topic: **Archival, Expiry, Supersession & Historical Visibility Rules**


### Publishing Workflow — Scheduled Execution & Failure Recovery Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- scheduler processes only current Scheduled records whose time is due/overdue and catches up after downtime
- execution is idempotent and safe against overlapping scheduler runs
- current committed state is rechecked at commit; Cancel/Reschedule committed first prevents stale execution
- runtime/public invariants are revalidated before Scheduled → Published
- failure remains Scheduled with an actionable condition; no Draft fallback, partial publication, or generic Failed lifecycle state
- Document replacement and Homepage replacement preserve the previous valid public state until successor publication succeeds
- automatic retry may exist but remains bounded/calm and implementation-defined; no job/retry management console in Version 1
- fixing the underlying cause clears failure conditions; staff do not manually resolve scheduler warnings
- Disabled schedulers or later Role/Scope changes do not cancel already committed organizational schedules
- execution uses the current valid Scheduled record rather than an obsolete revision snapshot
- system-driven Expiry is separate from Scheduled Publish and must also be idempotent
- Audit preserves human scheduler attribution plus system execution while repetitive retries remain technical logs
- no hidden system bypass; lifecycle/validation/concurrency/integrity rules still apply
- exact Cron/queue/locking/retry infrastructure remains deferred to `10-system-blueprint.md`

Next topic: **Optional Approval Workflow & Direct Publish Coexistence**


### Publishing Workflow — Validation & Readiness Rules Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- validation is separated into Draft Validation, Publish Readiness, and Runtime/Transition Validation
- Draft may remain incomplete but cannot be structurally invalid
- Publish and Schedule share the same full publication-readiness rules
- Scheduled execution rechecks current runtime invariants before public commit
- validation rules derive from the Content Model and Domain semantics
- Errors block public-impact transitions; Warnings remain non-blocking by default
- readiness is derived/current-state based and backend validation is authoritative
- required / optional / conditional relationships are distinguished
- related resources are validated by public meaning; parent publication never auto-publishes dependencies
- external URL remote availability failures are Warnings by default when syntax/security checks pass
- Health Content review status does not auto-unpublish valid content
- ITA missing Evidence is Warning by default and remains separate from compliance scoring
- Homepage validation separates required invariants from optional auto-hide sections
- no Force Publish, AI quality gate, readiness percentage, dynamic rule builder, or subjective publish gate in Version 1

Next topic: **Scheduled Publishing Execution & Failure Recovery**


### Publishing Workflow — Transition Rules & Action Semantics Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- every public-impact transition rechecks current authorization, state, validation, and concurrency at commit time
- Save Draft never publishes; Publish and Schedule require Publisher-level authority
- Scheduled is publication-ready; editing/rescheduling revalidates readiness; Cancel Schedule returns to Draft
- Published content remains Published while working changes are prepared; Save Changes commits public changes
- Archive / Close / Supersede / Activate / Temporarily Close / Inactivate / Reopen / Reactivate remain Domain actions
- Announcement Expiry may be system-driven while historical public access may remain; validated Reopen is supported
- Document replacement is atomic; scheduled successor cannot Supersede current Document until publication succeeds
- Correct Published File remains exceptional Administrator-only correction
- parent publication never silently publishes or elevates related resources
- system-driven transitions do not bypass Domain/integrity invariants
- meaningful lifecycle/public-impact transitions are audited; Draft saves/Autosave remain outside publishing Audit noise
- confirmation is reserved for materially disruptive or exceptional actions

Canonical integrity repair in the same update:
- the physical `07-publishing-workflow.md` still ended after the previously accepted Foundation even though `PROJECT-INDEX.md` / `CHANGELOG.md` already recorded the accepted Canonical Publishing State Model
- restored the previously accepted Canonical Publishing State Model into Section 24–25
- added the newly accepted Transition Rules into Section 26–27
- preserved the pre-repair copy at `archive/07-publishing-workflow-pre-state-transition-repair-2026-08-14.md`
- no unaccepted architecture decision was introduced by the repair

Next topic: **Publishing Validation & Readiness Rules**

### Publishing Workflow — Canonical Publishing State Model Accepted

Accepted and added to `current/07-publishing-workflow.md`.

Key decisions:
- shared publishing core is Draft / Scheduled / Published only for domains that genuinely publish
- no generic Unpublished state, universal Unpublish action, or arbitrary status dropdown
- Editorial content generally uses Draft / Scheduled / Published / Archived
- Announcement additionally distinguishes Closed and Expired
- Activity does not auto-expire after its Event Date
- Health Content review state remains separate from publishing lifecycle
- Health Service uses Draft / Active / Temporarily Closed / Inactive; Hidden is excluded from Version 1
- Personnel and Organization use Draft / Active / Inactive
- Contact Information uses Published Configuration + Working Changes
- Document distinguishes Superseded from Archived and may link to a successor
- Media has no editorial publishing lifecycle
- Homepage uses Draft / Scheduled / Published without a staff-facing Archive workflow
- ITA Fiscal Year uses Draft / Published / Archived; Scheduled ITA publication is excluded from Version 1
- Scheduled is a committed workflow state; Cancel Schedule returns to Draft while cancellation remains an Audit event
- Published content remains Published while authorized working changes are prepared
- lifecycle automation is limited to semantics that are explicit and justified
- universal state-machine configuration is deliberately rejected as over-engineering

Next topic: **Publishing Transition Rules & Action Semantics**


### Publishing Workflow — Foundation Accepted / Working Draft Started

Created `current/07-publishing-workflow.md` as **WORKING DRAFT v0.1** after acceptance of the Publishing Workflow Foundation.

Key accepted decisions:
- Draft is the working state and may be incomplete; Save Draft/Autosave never publish.
- Publish is an explicit public-impact action.
- Create/Edit does not imply Publish; public-impact authority follows `06-roles-permissions.md`.
- Direct Publish and Scheduled Publish are ON by default for authorized users; Approval Workflow remains OFF by default.
- Scheduled Publish is part of Publish authority in Version 1.
- Published content remains live at the last valid public state while an authorized Publisher edits working changes.
- Editor without Publish authority does not edit live Published content in Version 1.
- Domain lifecycle actions remain domain-specific; no arbitrary universal status dropdown.
- Parent publication never silently publishes or elevates related resources.
- Valid committed schedules are organizational state and are not automatically cancelled by later scheduler Disable/Role/Scope changes.
- Publish Now and Scheduled Publish use the same publication-validity rules.
- Errors block publication; Warnings remain non-blocking where Domain permits.
- No revision branching, recurring publishing schedule, or generic scheduled unpublish in Version 1.
- Meaningful publication events are audited; Autosave is excluded from normal publishing audit noise.
- Publishing timezone baseline is `Asia/Bangkok`.

Next topic: **Canonical Publishing State Model**



### Roles & Permissions — Final Review and Freeze v1.0

Final consistency review completed against Frozen `00–05`; all accepted corrections were applied and `current/06-roles-permissions.md` is now FROZEN v1.0.

Final corrections:
- edits to already Public/Active records that change public output require Publisher-level authority
- `audit.view` is Administrator-only by default in Version 1 while remaining a separate architectural capability
- Hard Delete is Administrator-only by default and only where Admin CMS safety rules explicitly allow it
- Active non-Administrator requires at least one Module Scope; Administrator receives All Modules by definition
- CMS Role and Personnel Role/Assignment are explicitly separate concepts
- one Role level applies uniformly across all assigned Module Scopes in Version 1; mixed per-module responsibility levels require future Impact Review/Controlled Amendment rather than over-granting

Consistency results: Foundation PASS, IA PASS, Content Model v1.1 PASS, Sitemap PASS, Homepage PASS, Admin CMS PASS, ITA/Document/Shared Resource boundaries PASS, security guardrails PASS, over-engineering review PASS.

Artifacts:
- `current/06-roles-permissions.md` — FROZEN v1.0
- `reviews/roles-permissions-freeze-review.md`
- `archive/06-roles-permissions-v0.1-pre-freeze.md`

Next planned document: **07-publishing-workflow.md — Publishing Workflow**

### Canonical Roles & Permissions Consistency Repair

During the Final Roles & Permissions Consistency Review, `PROJECT-INDEX.md` and `CHANGELOG.md` correctly reflected accepted decisions through Permission Denied / Authorization Edge Cases, but the physical canonical `current/06-roles-permissions.md` still ended at the earlier Section 40 Working Draft tail.

The canonical file was repaired by restoring only previously accepted decisions:
- Section 39 — Module Capability Matrix & Default Role Mapping
- Section 40 — Role Assignment / Module Scope Administration UX
- Section 41 — User & Role Administration Rules / Guardrails
- Section 42 — Permission Denied / Authorization Edge Cases
- Section 43–44 — current pending/final-review status

The pre-repair copy is preserved at `archive/06-roles-permissions-pre-final-review-repair-2026-08-14.md`. No new role/permission decision was introduced by this repair.

Next topic remains: **Final Roles & Permissions Consistency Review**

### Roles & Permissions — Permission Denied / Authorization Edge Cases

Accepted and added to `current/06-roles-permissions.md`.

Key decisions:
- authorization denial, lifecycle restriction, validation error, conflict and Not Found are distinct meanings
- authorization decision order is Account Status → Module/Reference Access → Capability → Domain State → Validation/Concurrency
- unavailable capabilities are normally hidden; state-dependent unavailable actions use contextual hide/disable behavior
- direct URLs, Preview, Dashboard, Admin Search, Quick Actions, uploads and APIs enforce current server-side authorization
- permission failures do not reveal unauthorized record details
- Draft authorship is not private ownership; authorized colleagues can continue organizational work
- Editors cannot change live Published content without public-impact authority; Administrator is not a lifecycle/validation/concurrency bypass
- Role/Scope/Disable changes affect future requests, including Save, Autosave and Preview from already-open pages
- Reference/Use Access is distinct from Module Management Access
- parent publication never silently publishes/activates/elevates related resources
- valid scheduled publication remains scheduled after later scheduler disable or Role/Scope change
- disabling a user does not unpublish content, cancel valid schedules, remove Drafts or rewrite historical attribution
- ordinary authorization denials do not flood staff Audit Log/Notifications; security-event logging is deferred to System Blueprint
- backend authorization is authoritative; no Force Override, private-Draft ownership, row-level security or enterprise policy engine in Version 1

Next topic: **Final Roles & Permissions Consistency Review**


### Roles & Permissions — User & Role Administration Rules / Guardrails

Accepted and added to `current/06-roles-permissions.md`.

Key decisions:
- Authorization-level CMS User lifecycle is Active / Disabled only
- Active non-Administrator users require one Role + at least one Module Scope
- CMS access is administrator-provisioned; no public self-registration/access-request workflow
- CMS User and Personnel lifecycles remain independent
- Disable preserves Role/Scope, organizational content, authorship, relationships, and Audit history
- Disable/Role/Scope changes must promptly affect effective authorization, including existing sessions; technical mechanism deferred to System Blueprint
- Backend authorization is authoritative; hidden UI is not a security boundary
- Effective authorization evaluates Account Status + Role + Module Scope/Capability + domain state
- Administrator self-role-change and self-disable are prohibited; the last Active Administrator cannot be disabled or demoted
- Administrator promotion/demotion/reactivation uses stronger impact confirmation
- Disabled user reactivation preserves prior Role/Scope but requires review before activation
- No normal User hard-delete workflow in Version 1
- Reference/use access remains separate from management access
- Work Dashboard, Admin Search, navigation, record actions, and relationship pickers are permission-aware
- Authorization changes use explicit Save and optimistic concurrency
- User creation/status/Role/Scope changes are audited
- Users may see a read-only human-readable summary of their own permissions
- No user groups, multi-role, temporary permission, access request, impersonation, bulk permission tools, Super Admin, or enterprise IAM subsystem in Version 1

Next topic: **Permission Denied / Authorization Edge Cases**


### Roles & Permissions — Role Assignment / Module Scope Administration UX Accepted

Accepted and added to `current/06-roles-permissions.md`.

Key decisions:
- User administration is based on human-readable Role + Module Scope rather than raw permission matrices
- Viewer / Editor / Publisher begin with no Module Scope selected; Administrator receives All Modules
- Role definitions remain system-controlled and the `สิทธิ์การใช้งาน` page is a read-only role/capability reference in Version 1
- Module Scope is grouped by real staff work and remains whole-module access
- Media/Document supporting-resource access inside an authorized workflow does not imply full library management scope
- ITA and Homepage specialized capabilities are derived from Role rather than configured per user
- meaningful Role changes show human-readable impact; stronger confirmations are limited to high-impact actions
- Disabled users preserve content, authorship and Audit history; CMS User lifecycle remains separate from Personnel
- self-disable is prohibited; Administrator self-demotion is not self-service; last Active Administrator cannot be disabled or demoted
- Role/Scope/Account Status changes are audited without mandatory reason for every routine change
- Authentication mechanisms remain deferred to the System Blueprint
- no arbitrary Role Builder, user groups, multi-role assignment, temporary access, impersonation, per-user overrides, or enterprise IAM UI in Version 1

Next topic: **User & Role Administration Rules / Guardrails**

### Roles & Permissions — Module Capability Matrix Accepted

Accepted and added to `current/06-roles-permissions.md`.

Key decisions:
- Version 1 uses **One Role + Module Scope**
- Role defines responsibility depth; Module Scope defines where it applies
- Module Scope is whole-module access, not row-level/ownership/Area security
- capabilities use Module + Meaningful Action rather than universal CRUD
- any action changing what the public currently sees requires Publisher-level authority for that Module
- Editorial, Service, Health Service, Personnel, Organization, Contact, Document, Media, Homepage, ITA, Reference Data, and System capability patterns are defined
- Published Document file correction is Administrator-only by default; normal revisions use Supersede
- ITA separates Evidence / Structure / Publish; Homepage Manage/Publish remains independent from source content permissions
- Administrator gets All Modules and system-administration capabilities by default
- no field-level, row-level, Area-based, per-user action overrides, multi-role inheritance, arbitrary custom roles, or ABAC in Version 1

Next topic: **Role Assignment / Module Scope Administration UX**

### Roles & Permissions — Foundation Accepted

Created `current/06-roles-permissions.md` as WORKING DRAFT v0.1.

Accepted foundation decisions:
- four CMS responsibility roles: Viewer, Editor, Publisher, Administrator
- authorization based on explicit Module + Meaningful Action capabilities
- Create/Edit does not imply Publish
- Publish, Schedule, and Save Changes to Published content are public-impact actions
- one CMS role per user in Version 1; no per-user overrides or multi-role inheritance
- shared Media/Document Use/Create/Manage boundaries
- ITA Evidence / Structure / Publish and Homepage Manage / Publish remain independently permissionable
- administrative capabilities for Users, Permissions, Audit, Settings, and Reference Data remain distinct
- Disabled users preserve Audit history; CMS User and Personnel are separate concepts
- permission changes are audited; unauthorized self-escalation and last-admin lockout are guarded against
- no ABAC, field-level/row-level security, arbitrary custom role builder, temporary permissions, or enterprise IAM engine in Version 1

Next topic: **Module Capability Matrix & Default Role Mapping**

### Admin CMS v1.0 — Final Consistency Review & Freeze

Final cross-document review completed against Frozen `00–04` and Content Model v1.1.

Applied five blocking consistency corrections before Freeze:
- added Health Report Admin management and separated staff label `ความรู้สุขภาพ` from `รายงานสุขภาพ`
- added `หน่วยงานที่เกี่ยวข้อง` for reusable External Organization management
- aligned all ITA Evidence wording to Document / Media / External URL
- removed public Official Channels from Settings ownership; Contact Information remains the source of truth
- made Scheduled Publish Failure actionable while success remains normal Published state + feedback/Audit

Also restored Sections 52–58 physically into the canonical file after detecting a stale uploaded tail that still stopped at Section 51.

Result: `current/05-admin-cms.md` is now **FROZEN — Admin CMS Baseline v1.0**.

Freeze review: `reviews/admin-cms-freeze-review.md`.

Next planned document: `06-roles-permissions.md`.

### Historical Review Artifact Restoration

Canonical workspace integrity was completed by restoring `content-model-amendment-v1.1.md` and `02-content-model-v1.0.md` from retained conversation artifacts. The missing Foundation, Sitemap, and Homepage review records were reconstructed transparently from their still-Frozen canonical baselines and marked as restored review records rather than presented as untouched originals.

### Canonical Baseline Integrity Repair

Before the Final Admin CMS review, verified and restored the actual Frozen `00–04` files into `current/` so the canonical workspace physically matches `PROJECT-INDEX.md`. The first recovered `00/01` copies were old drafts and were replaced with the correct FROZEN v1.0 files before review.



### Canonical Admin CMS Consistency Repair

During validation before the final design topic, `PROJECT-INDEX.md` and `CHANGELOG.md` were found to be ahead of the actual canonical `current/05-admin-cms.md`, which still stopped at Section 51. The canonical file has now been repaired so all previously accepted decisions are physically present in the source of truth.

Restored/added accepted sections:
- 52 Relationship / Shared Data Selection UX
- 53 ITA Admin Workflow
- 54 Publishing / Validation / Scheduling UX
- 55 Draft / Autosave / Preview / Conflict Handling
- 56 Admin Responsive / Accessibility Rules
- 57 Admin Notifications / Warnings
- 58 Settings & Global Configuration Boundary

The pre-repair working copy is preserved at `archive/05-admin-cms-pre-repair-2026-08-14.md`.

Next topic: **Final Admin CMS Consistency Review**

### Admin CMS — Settings & Global Configuration Boundary

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Settings configure the system and do not duplicate website content
- Contact, Personnel, Organization, Homepage, ITA, Media, Documents, Area, and policy pages remain owned by their dedicated modules
- Reference Data is separate from Settings and receives CRUD UI only when genuinely maintained by staff
- Stable lifecycle/system enums are controlled values rather than arbitrary settings
- Version 1 Settings remain intentionally small: Site Identity, a few useful defaults, and read-only System Information
- New records remain Draft by system rule; Audit/URL/Public-ID/security behavior is not exposed as arbitrary toggles
- Secrets and infrastructure configuration remain outside normal CMS UI
- No menu/footer builder, feature-flag console, JSON editor, taxonomy control center, or mega-settings page in Version 1

Next topic: **Final Admin CMS Consistency Review**


### Admin CMS — Admin Notifications / Warnings

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Four message meanings only: Error, Warning, Information, Success
- Place messages at the nearest actionable context: Field → Record → Module → Work Dashboard
- Work Dashboard is an actionable queue, not a notification inbox
- Resolve underlying conditions rather than maintaining unread/read state
- Health Review Due, Scheduled Publish Failure, and invalid Homepage curation may escalate to Dashboard
- ITA missing evidence stays primarily in the ITA workspace
- Local editor issues remain local: validation, upload, autosave, conflict, duplicate resource warnings
- Aggregate duplicate/similar Dashboard warnings
- Audit Log remains separate from warning/notification behavior
- No Notification Center, bell, unread counts, email/LINE/SMS/push defaults, preferences, task assignment, or AI priority in Version 1

Next topic: **Settings & Global Configuration Boundary**


### Admin CMS — Draft / Autosave / Preview / Conflict Handling

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Manual Save remains explicit; Autosave is a recovery safety net
- Autosave never silently changes public lifecycle state
- Published content keeps in-progress recovery separate from the live page until explicit Save Changes
- Recovery is offered, not silently applied
- Unsaved-change warnings appear only when meaningful work is at risk
- Preview can use latest working state without mandatory Manual Save first
- Preview remains protected and clearly marked as non-public
- Optimistic concurrency prevents silent last-writer-wins overwrites
- Conflict handling preserves the current user's work and avoids automatic overwrite/merge
- No record locking, live presence, real-time collaboration, CRDT/OT, full diff viewer, or offline-first sync in Version 1
- Autosave/recovery events do not flood the normal Audit Log
- Exact autosave interval/storage/recovery lifetime/concurrency mechanism is deferred to the System Blueprint

Next topic: **Admin Responsive / Accessibility Rules**

### Admin CMS — Publishing / Validation / Scheduling UX

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Explicit Save Draft / Publish / Schedule / Save Changes actions
- Draft tolerates incomplete work; Publish and Schedule require valid publication state
- Domain-specific validation with blocking Errors and non-blocking Warnings
- Preview is available but not mandatory before publication
- Schedule uses simple Thailand Date + Time; no recurrence/cron/timezone complexity
- Scheduled publication failure never masquerades as Published
- No generic scheduled unpublish; domain lifecycle remains separate
- Status is controlled through meaningful lifecycle actions rather than a free-form dropdown
- Published content is directly editable by authorized staff; no revision branching in Version 1
- Approval remains optional and OFF by default
- Permission-aware action visibility
- Health Content review remains independent from public lifecycle and never auto-unpublishes

Next topic: **Draft / Autosave / Preview / Conflict Handling**


## 13 สิงหาคม 2569

### Admin CMS — Admin Responsive / Accessibility Rules

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Desktop-first but responsive for light/urgent work
- One Admin application; no separate Mobile Admin or native app
- Responsive tables may become prioritized list/card views
- Mobile ITA remains usable without requiring Desktop-equivalent productivity
- Accessibility is built into core components/workflows
- Semantic/native controls, keyboard operation, visible focus, labels, error association, contrast, and non-color-only state are baseline
- Drag/hover/gesture interactions always require accessible alternatives
- Thai language, Buddhist Era display, zoom, and text resize are first-class considerations
- Exact breakpoint values remain Design System/implementation details
- No accessibility toolbar, mandatory Dark Mode, offline Admin, or separate mobile workflow in Version 1

Next topic: **Admin Notifications / Warnings**


### Admin CMS — ITA Admin Workflow

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Fiscal Year → MOIT → Requirement → Evidence is the primary mental model
- Evidence supports Document, Media, and External URL
- Existing resources may be selected or new resources uploaded directly in ITA
- Evidence order is manageable; removing Evidence does not delete the shared resource
- Lightweight completion counts are allowed for work management, but no compliance scoring
- Missing Evidence is a warning by default, not an assumed publish blocker
- Fiscal Year is the publication unit
- Published ITA remains directly editable by authorized staff with Preview + Audit Log
- New years may copy structure only; Evidence is never copied automatically
- Structure Management and Evidence Management can be permission-separated
- Historical Evidence is not automatically migrated to successor resources
- No template engine, compliance engine, workflow designer, or automatic link-monitoring subsystem in Version 1

Next topic: **Publishing / Validation / Scheduling UX**


### Admin CMS — Relationship / Shared Data Selection UX

Accepted and added to `current/05-admin-cms.md`.

Key decisions:
- Search-first, context-rich selectors instead of giant dropdowns
- Resource-specific picker patterns
- Simplified Area selection for the local operating context
- Structured internal entities; free text for one-off external participants
- Inline creation mainly for Document and Media
- Removing a relationship never deletes the shared record
- Lifecycle/status context shown where useful
- No automatic relationship rewriting or successor migration
- Permission-aware selection and creation
- No universal picker, nested modal maze, AI entity matching, favorites system, or relationship graph in Version 1

Next topic: **ITA Admin Workflow**


### Canonical Workspace Established

จัดโครงสร้างเอกสารใหม่เพื่อแก้ปัญหาไฟล์กระจายหลาย path

Canonical source ย้ายมาอยู่ภายใต้:

```text
website-modernization-docs/current/
```

### Current Baseline

- `00-website-foundation.md` — v1.0 FROZEN
- `01-information-architecture.md` — v1.0 FROZEN
- `02-content-model.md` — v1.1 FROZEN
- `03-sitemap.md` — v1.0 FROZEN
- `04-homepage.md` — v1.0 FROZEN
- `05-admin-cms.md` — v0.1 WORKING DRAFT

### Content Model v1.1

Controlled Amendment:
- ITA Evidence รองรับ `Document`
- ITA Evidence รองรับ `Media`
- ITA Evidence รองรับ `External URL`
- Document และ Media ยังคงเป็น Shared Resource คนละชนิด
- Historical ITA Evidence ไม่เปลี่ยนไปหา successor อัตโนมัติ

เวอร์ชันเดิม `02-content-model v1.0` ถูกเก็บไว้ใน `archive/`

### File Naming Policy

ต่อจากนี้:
- เอกสารหลักมี filename คงที่
- Working/Frozen/Amended แสดงผ่าน Status + Version ในไฟล์
- Review/Amendment records อยู่ใน `reviews/`
- เวอร์ชันที่ถูกแทนที่อยู่ใน `archive/`

## 14 สิงหาคม 2569

### System Blueprint — Final Refinement 3: Identity, Administrator Safety & Authorization Edge Cases

Accepted and added to `current/10-system-blueprint.md` (Sections 507–541).

Key decisions:
- one normalized canonical local username maps to one CMS User and is protected by database uniqueness
- email is not an implicit second login alias in Version 1; Personnel/display identity remain separate
- canonical usernames are not reused and are immutable through normal CMS administration after activation
- no shared/default passwords; setup/reset/recovery uses controlled short-lived single-use mechanisms
- Publisher/Administrator privileged access remains gated by mandatory MFA
- Role/Scope/Disable changes affect subsequent protected requests without waiting for re-login
- Administrator cannot change own Role/Scope or Disable self through normal CMS administration
- at least one Active Administrator is preserved transactionally under concurrency
- no hidden permanent Super Administrator or standing MFA-bypass identity
- break-glass recovery is a narrow infrastructure-controlled procedure with security evidence
- staged/long-running operations re-check current authorization before canonical finalization
- already-committed Scheduled Publication remains valid after later human demotion while System execution re-checks canonical state
- Disabled accounts retain historical stable identity/Audit attribution
- identity and administrator edge cases are mandatory security regression/OWASP ASVS evidence

New requirement introduced for next refinement: **Google OpenID Connect (OIDC) Authentication Integration**. This will be designed as federated authentication on top of OAuth 2.0 while preserving local CMS authorization and security invariants.


### System Blueprint — Final Refinement 6: Announcement Expiry & Domain-time Background Processing

Accepted and added to `current/10-system-blueprint.md` (Sections 592–615).

Key decisions:
- Announcement automatic expiry is a Domain-owned `Published → Expired` transition driven by canonical `expires_at`; Cron/Scheduler is only the wake-up mechanism
- due discovery uses `status = Published` and `expires_at <= now`, providing overdue catch-up after missed scheduler runs or downtime
- overdue expiry is operational state, not a new lifecycle value
- expiry is idempotent, current-state-aware, transaction-safe and race-safe with manual lifecycle actions such as Close
- Expired does not automatically mean Archived, Hidden, Deleted, Permanently Withdrawn, 404 or generic unpublish
- legitimate Expired Announcements may remain Historical Public with explicit expired context under the Frozen Sitemap/Search semantics
- Homepage/curated placements cannot override canonical lifecycle and stop promoting Expired sources as current
- successful automatic expiry records System/domain-time Audit atomically with the canonical mutation; Search refresh remains post-commit/reconcilable
- persistent overdue expiry is visible through small actionable System Health, not a generic job dashboard
- no generic `scheduled_actions` table, scheduled-unpublish UI or generic time-based workflow engine is introduced in Version 1
- other content types inherit shared Clock/Cron/lease primitives only, not Announcement expiry semantics
- expiry catch-up/concurrency/Audit/Search-failure/lifecycle-surface cases are mandatory regression tests

Next refinement: **Public Search Bounds, Safe Snippets & Abuse Protection**.

### Documentation Distribution Rule

เพิ่มกติกาการแจกจ่ายเอกสารใน `PROJECT-INDEX.md` เพื่อป้องกัน local copies คนละ revision กัน:

- `website-modernization-docs-current.zip` เป็น **recommended canonical download artifact** สำหรับการเก็บในเครื่อง
- ลิงก์ Markdown รายไฟล์เป็น inspection/convenience links ไม่ใช่ independently synchronized document set
- เมื่อมี package ใหม่ ให้แทนที่ชุดเอกสารในเครื่องจาก ZIP ใหม่ทั้งชุด แทนการอัปเดต `.md` ทีละไฟล์
- ทุก canonical documentation mutation ต้อง rebuild และ verify Canonical ZIP ก่อนปิดรอบ

No product/system requirement changed. This is a documentation distribution and local-storage rule only.

### System Blueprint — Final Refinement 8: Permanent Redirect Status, Thai Slug, Unicode Normalization & URL Safety

Accepted and added to `current/10-system-blueprint.md` (Sections 651–691).

Key decisions:
- HTTP `301 Moved Permanently` is the default permanent canonical redirect for ordinary GET/HEAD public canonicalization and approved permanent route/legacy moves; Admin/API mutation routes do not rely on public canonical redirects
- dynamic canonical routes remain `/{resource}/{public-id}/{slug?}` with UUIDv7 Public ID as stable identity and slug as optional human-readable metadata
- Thai is a first-class slug language; no mandatory ASCII-only or Thai-to-English transliteration baseline
- slug normalization is deterministic and Unicode NFC-based with lowercase Latin, controlled characters, normalized hyphen separators and finite evidence-based length limits
- Published Title changes do not silently alter canonical URLs; explicit slug changes retain Public ID and stale/missing/wrong slugs redirect one hop to the current canonical destination
- ordinary same-ID slug correction needs no generic slug-history table; legacy route mapping remains a separate controlled migration concern
- standard URL/runtime parsing and encoding are authoritative; double decoding, unsafe encoded separators, malformed percent encoding and traversal-style path semantics are rejected/fail safely
- canonical absolute origin comes from validated configuration rather than untrusted Host headers
- redirect targets are controlled internal destinations and cannot become a generic open-redirect facility
- current public eligibility/lifecycle is evaluated before canonicalization so Hidden/Internal resources do not leak canonical slugs and Gone resources return `410` before URL correction
- canonical redirects, canonical tags, Sitemap and Public Search destinations share one canonical URL authority
- Thai/Unicode URL handling, Host-header manipulation, open redirect, encoding edge cases and lifecycle-before-canonicalization are mandatory Security/SEO regression tests
- no generic redirect-management CMS, ASCII-only slug platform, custom URL parser or speculative edge redirect infrastructure is introduced in Version 1

Next step: **Final `00–08 ↔ 10` cross-document consistency re-check before Freeze**.

