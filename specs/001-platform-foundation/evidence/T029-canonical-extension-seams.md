# T029 — Canonical Extension Seams — Source Evidence (User Story 4)

**Feature**: `001-platform-foundation`
**Task**: T029 (Phase 6: User Story 4) — prepare feature-scoped review evidence mapping the
currently planned downstream capability groups to the canonical foundation, identifying the
existing native extension seams they rely on, referencing the owning authority for each boundary,
stating that this artifact is review evidence rather than architecture authority, and demonstrating
that no second backend/platform foundation or speculative abstraction is needed.
**Verification date**: 2026-10-13 (UTC).
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer under the Product Owner
authorization recorded in Multica issue 9GOTSTORY-201.
**Authorized baseline**: commit `c8701eafb332b4638d84ff7afce636079d2fcc2a`
(= `origin/001-platform-foundation`; includes the accepted T027 source-review PASS at
`bde36a0c5d037c9f0e454399b5209d5f3cc1d6b5` and, through its prerequisite review records, the
accepted T023–T026 sources, per the delegation). Verified before editing: `git fetch origin`
resolved `origin/001-platform-foundation` to exactly this SHA; the managed checkout was clean at
this commit; the candidate branch `t029-canonical-extension-seams` was cut from exactly this
commit. Baseline `git diff --check` was reported clean by the delegating reviewer.
**Scope**: T029 only — this single evidence file. Document-only task: no runtime execution, no
application tests, no Product collection/feature implementation, no abstraction, no second backend,
no change to the Constitution, Spec Kit task definitions, architecture, application code, database,
or deployment, no task-marker change, no T022/T028/T030/T031/T032 execution, and no fix to adjacent
documentation or package-script gaps.

## 1. Standing of this artifact — review evidence, not architecture authority

- This document is **feature-scoped review evidence for Feature 001 / T029**. It records how the
  currently planned downstream capability groups map onto one canonical foundation. It is
  downstream of the authorities it cites (Constitution §I; `AGENTS.md` §Authority) and **must not
  be read as new Product or architecture authority**: it cannot override `current/00–09`,
  `current/10-system-blueprint.md`, the Constitution, or the approved Spec Kit artifacts, and a
  downstream artifact must not silently override an upstream authority (`AGENTS.md` §Authority).
- **Pending runtime evidence, explicitly**: **T022 production-durability runtime evidence is
  pending** and **T028 recovery runtime evidence is pending** at this baseline. Under the approved
  Development-First Sequencing amendment (`tasks.md` Phase 6 Sequencing and Notes; bounded Product
  Owner decisions of 2026-10-11 and 2026-10-13, Multica issues 9GOTSTORY-194 and 9GOTSTORY-200),
  T029 source authoring/review may proceed before those runtime gates — but **source review cannot
  substitute for runtime PASS, waive a failed gate, establish US3/US4 completion, or satisfy final
  acceptance**. T028 retains its runtime/source join (execution requires both T022 PASS and
  Codex-accepted sources for all of T023–T027); **T030 may execute only after both T028 PASS and
  Codex-accepted T029 sources** (`tasks.md` Dependencies & Execution Order, Blocking Gates).
- **No completion claim**: this artifact makes **no** US3 or US4 completion claim, no final
  Feature 001 acceptance claim, and no claim that any planned Product capability below has been
  implemented or runtime-verified beyond the foundation evidence explicitly cited.

## 2. Method and sources

- Authorities read at the exact baseline: `.specify/memory/constitution.md` (v2.0.0);
  `AGENTS.md`; approved `specs/001-platform-foundation/spec.md`, `plan.md`, `tasks.md`,
  `research.md`, `data-model.md`, `quickstart.md`, `checklists/foundation-review.md`;
  `docs/website-modernization-docs/current/00-website-foundation.md` through
  `09-migration-plan.md`; `docs/website-modernization-docs/current/10-system-blueprint.md`
  (§§1–16, 22–23 emphasis). Clarifications were read where embedded in `spec.md`; no separate
  `PROJECT-STATUS.md` or `PRE-IMPLEMENTATION-GATE.md` exists in the repository.
- Implementation files were read at the baseline as **evidence only, never authority**
  (`AGENTS.md` §Authority item 6): `astro.config.mjs`, `src/live.config.ts`, `seed/seed.json`,
  `src/pages/index.astro`, `package.json`, plus the accepted T006/T015 evidence files and the
  accepted foundation/recovery source files enumerated in §3.
- Version-sensitive EmDash capability/API statements that go beyond supplied baseline evidence
  were verified through Context7 (`/websites/emdashcms`, i.e. `docs.emdashcms.com`) on
  2026-10-13, against the pinned `emdash` **1.1.0** dependency (`package.json`; the same
  combination was runtime-verified as installed-equals-pin by the accepted T006/T015 evidence).
  Each such statement is marked **[C7]** with its exact page; see §9. No other EmDash/Astro API
  is asserted beyond supplied evidence, and no unsupported API is invented.

## 3. Foundation baseline inventory — installed/configured seams vs implemented behavior vs planned work

The delegation's required distinction, at the exact baseline:

| Layer | Installed / configured at baseline (concrete repository evidence) | Actually implemented foundation behavior (runtime-evidenced) | Planned, **not** implemented Product work |
|---|---|---|---|
| Application platform | `astro.config.mjs`: one Astro `output: "server"` app, `@astrojs/node` standalone adapter, React integration, EmDash integration with native `postgres()` adapter, native `local()` media adapter (`./media`, `/_emdash/api/media/file`), native migration modes (`runtime: "check"`, `dev: "auto"`); T008 fail-fast configuration validation in the same file | Integrated app builds, starts, serves the minimum SSR surface; native migration status/apply/check sequence passes (accepted `specs/001-platform-foundation/evidence/T006-emdash-postgresql-compatibility.md`,
  `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md`) | Nothing — this is the canonical single platform itself |
| Content collections | `src/live.config.ts`: the single `_emdash` live collection registered via `defineLiveCollection` + `emdashLoader()`; `seed/seed.json`: explicit empty version-1 seed (`collections`, `relations`, `taxonomies`, `menus`, `redirects`, `widgetAreas`, `sections`, `content` all empty) | **Zero** Product collections, content, taxonomies, relations, redirects, menus, widgets, or sections are defined; the seed's stated purpose is to suppress EmDash's built-in example Posts/Pages model (plan §One Astro + EmDash platform; `data-model.md` §2) | All Songhealth Product collections of `02-content-model.md` §24 |
| Public pages | `src/pages/index.astro`: one minimum SSR verification page with the `songhealth-foundation` marker — deliberately no Homepage composition, Product content, navigation, styling, CMS-driven sections, API behavior, or readiness logic (its own header comment; T011) | The minimum public runtime serves its verification marker on the configured boundary (accepted T015 evidence §3) | Every canonical route of `03-sitemap.md` §19 and all Homepage composition of `04-homepage.md` |
| Admin / editorial | Native EmDash Admin mounted by the integration at its standard `/_emdash/` routes (React integration registered for it) | Native Admin availability and the fresh first-admin setup/sign-in path were runtime-evidenced at T015; the canonical native site `tagline` setting was set/retrieved through native platform paths | No Product collection exists to exercise editorial workflows: **no verified editorial workflow for Product content exists or is claimed**; roles/permissions assignments are future operational policy |
| Operations & recovery sources | Accepted sources in the baseline: `scripts/verify-readiness.mjs` (T012), `tests/operations/verify-startup.sh` (T013), `verify-foundation.sh` (T016), `verify-recovery.sh` (T024), `scripts/backup-foundation.sh` (T025), `scripts/restore-foundation.sh` (T026), `scripts/verify-restored-foundation.mjs` (T027), `docs/operations/production-foundation.md` (T021), `docs/operations/runtime-secret-recovery.md` (T023), `deploy/Containerfile` + `deploy/quadlet/{songhealth.network, songhealth-db-data.volume, songhealth-media.volume, songhealth-db.container, songhealth-app.container}` (T017–T020) | US1 runtime PASS (T015); T022 production-durability runtime execution **pending**; T028 recovery runtime execution **pending** | — |

The empty `seed/seed.json`, the `_emdash` loader in `src/live.config.ts`, the integrated
`astro.config.mjs`, and the minimum `src/pages/index.astro` are **foundation evidence**: they
establish installed/configured native seams and implemented foundation behavior. They do **not**
establish Product collections, Product pages, or verified editorial workflows.

## 4. Group 1 — Content Models

- **Owning authority (file and section)**: `02-content-model.md` §1 (Modeling Rules), §2 (Native
  System Metadata), §20 (Lifecycle Rule), §21 (Classification Rule), §22 (Explicit Non-Goals),
  §23 (Implementation Mapping Gate), §24 (Content Model Decision); technical authority
  `10-system-blueprint.md` §4 (Content Model); Feature 001 boundary `data-model.md` §2 and
  `spec.md` §Explicitly Out of Scope ("Full Songhealth content model implementation").
- **Existing native seam**: EmDash collections with typed fields, taxonomies, and relations,
  declared through the native seed file and managed as the active runtime schema; no ORM/domain
  entity layer may mirror them (`10-system-blueprint.md` §4: "Map Content Types → EmDash
  collections/fields/relations/taxonomies"; seed files are for bootstrap/environment setup, the
  EmDash database model is the active runtime schema). Verified shape **[C7]**: the seed format
  defines `collections` (with `fields`, `supports` such as `drafts`/`revisions`/`search`/`seo`),
  `taxonomies` (hierarchical terms attached to collections), `relations`, `menus`,
  `widgetAreas`, and `content` (`docs.emdashcms.com/themes/seed-files`,
  `/themes/creating-themes`) — exactly the top-level keys present, empty, in the baseline
  `seed/seed.json`.
- **Concrete repository evidence**: `seed/seed.json` (all model arrays explicitly empty — the
  seam is installed and deliberately unused); `src/live.config.ts` (the `_emdash` live collection
  that carries EmDash content into Astro); `astro.config.mjs` (EmDash integrated against
  PostgreSQL, so collection data lives in the one foundation database). Research basis already
  accepted in the baseline: `research.md` §3 (empty native seed; native seed format permits all
  sections empty; "the empty seed is configuration, not a custom schema framework").
- **Downstream feature boundary**: a later approved feature defines exact
  collection/field/relation definitions in a fresh Spec Kit after Human Acceptance — the gate is
  `02-content-model.md` §23 (Implementation Mapping Gate: Product entity vs
  presentation/classification; native field/taxonomy/media/settings primitive sufficiency; real
  reuse/relationship requirement; duplication-vs-maintenance), and §21 (prefer taxonomy for
  classification; do not create collections for Topic/Audience/Type). Version 1 canonical
  semantic collections are listed in §24. Native system metadata (stable internal ID, slug,
  publication state, timestamps, author/revision) must be reused, not duplicated (§2); domain
  state must not become CMS workflow state (§20); §22 non-goals (no Health Metric collection, no
  duplicate Media collection, no generic Contact/File collections, no approval/workflow/audit/
  search-projection entities, no dashboard metrics in CMS, no universal status model).
- **Why no second backend / competing foundation / speculative abstraction is necessary**: the
  content model's storage, editing, validation, relation, and taxonomy mechanisms are native
  EmDash capabilities running inside the single Astro application against the single PostgreSQL
  database (`10-system-blueprint.md` §4, §2). The Constitution (§II) prohibits recreating
  Domain/Application/Policy layers or any speculative abstraction merely because it existed
  historically; `specs/001-platform-foundation/checklists/foundation-review.md` CHK010 confirms the planned structure
  forecloses a separate backend/API server and repository/service wrappers. Nothing in the
  planned content model requires a second database, API, or schema mirror.

## 5. Group 2 — Public Pages

- **Owning authority (file and section)**: `03-sitemap.md` §1 (Principles), §3 (URL Identity),
  §15 (URL Conventions + canonical route table), §16 (Redirects), §17 (404, Gone and
  Unpublished), §19 (Consolidated Sitemap), §21 (Decision: slug-first public URLs + native
  stable content ID + redirect continuity); `04-homepage.md` §1 (Homepage is a curated +
  automated view of canonical content, not a new content repository), §13 (Data Ownership),
  §14 (Admin/Curation via native primitives), §19 (Explicit Non-Goals), §20 (Acceptance);
  technical authority `10-system-blueprint.md` §8 (Public Routing and Identity: Astro owns
  public page composition/routes; EmDash provides routable collection metadata, stable internal
  content IDs, slugs, and public URL resolution), §9 (Public Content Reads), §13 (SEO/redirects/
  404), §14 (Homepage).
- **Existing native seam**: Astro's file-based routing under `src/pages/` in the single SSR
  application, with public reads of EmDash content through the registered `_emdash` live
  collection. Verified shape **[C7]**: Astro pages query EmDash content with
  `getEmDashCollection`/`getEmDashEntry` from `emdash`, and collection queries default to
  **published** status (`docs.emdashcms.com/guides/querying-content`,
  `/concepts/architecture`); draft preview uses EmDash's signed, expiring preview token
  (`generatePreviewToken`, `docs.emdashcms.com/reference/api`) — matching the authority that
  draft preview must use EmDash's signed preview flow and public collection reads must read
  published content (`10-system-blueprint.md` §9; `07-publishing-workflow.md` §8).
- **Concrete repository evidence**: `src/pages/index.astro` (the one public route that exists —
  the T011 minimum verification page, runtime-evidenced at T015 with its SSR marker on the
  configured `127.0.0.1:4321` boundary); `src/live.config.ts` (the query seam installed);
  `astro.config.mjs` (`output: "server"` + Node standalone — one self-contained public runtime,
  no separate host server; `research.md` §1).
- **Downstream feature boundary**: every planned public page — the `03-sitemap.md` §19 tree
  (`/about/*`, `/news/*`, `/activities/*`, `/announcements/*`, `/services/*`,
  `/health-services/*`, `/health/*`, `/documents/*`, `/pages/{slug}`, `/ita/*`, `/search`,
  `/contact`) and the full Homepage composition of `04-homepage.md` §3 — is **planned,
  unimplemented Product work**. Homepage non-goals hold (`04-homepage.md` §19: no page builder,
  no personalization/A-B/AI ranking, no separate homepage database/model copies; §14: no custom
  Homepage application) — "Homepage is a view, not a platform" (§20). URL identity stays
  slug-first with the native stable internal ID; no second Songhealth Public ID may be invented
  (`03-sitemap.md` §3, §21).
- **Why no second backend / competing foundation / speculative abstraction is necessary**: the
  same Astro application that serves the minimum verification page is the public runtime the
  authority assigns to all future pages; EmDash supplies the metadata/slug/identity side
  natively (`10-system-blueprint.md` §8). A separate frontend/backend split or a second public
  identity system is explicitly rejected (`research.md` §1 alternatives;
  `specs/001-platform-foundation/checklists/foundation-review.md` CHK010; `03-sitemap.md` §21). Feature-local presentation
  helpers are permitted only for real reuse of presentation/domain calculation, not as a generic
  repository/service wrapper (`10-system-blueprint.md` §9).

## 6. Group 3 — Publishing Behavior

- **Owning authority (file and section)**: `07-publishing-workflow.md` §1 (native publishing
  lifecycle first; domain metadata stays domain-specific), §2 (core editorial lifecycle: Draft →
  Publish now/Schedule → Published; live + pending draft; unpublish; Trash; permanent deletion),
  §3 (no formal approval workflow in Version 1), §4 (published changes), §5 (one-time scheduling
  via native scheduler), §6 (domain-specific lifecycle metadata), §7 (validation: field/relation
  constraints first; publish hooks only for mandatory cross-resource invariants), §8 (secure
  native preview), §9 (revisions, autosave, locking, concurrency — native), §10 (Trash/restore),
  §11 (traceability via native evidence); `06-roles-permissions.md` §1 (native RBAC first), §2
  (product access requirements), §3 (draft authoring ≠ publish permission — a permission
  boundary, not an approval workflow), §9 (no custom approval permission model); technical
  authority `10-system-blueprint.md` §6 (native authentication + RBAC + ownership; native roles
  Subscriber/Contributor/Author/Editor/Admin; no Songhealth role hierarchy, Module Scope, or
  permission database), §7 (native lifecycle: draft/published/scheduled/live + pending draft
  revision/unpublish/trash-restore-permanent delete/revisions/preview/edit locking/optimistic
  concurrency; no custom approval workflow in Version 1).
- **Existing native seam**: the EmDash editorial lifecycle, roles, and Admin delivered by the
  integrated platform. Verified shape **[C7]** (`docs.emdashcms.com/reference/content-lifecycle`,
  `/guides/working-with-content`, `/reference/mcp-server`): entries are `draft`, `scheduled`, or
  `published`; a published entry can hold a pending draft revision that goes live only on
  "Publish changes"; `Schedule`/`Change schedule`/`Remove schedule`; `Unpublish` removes the
  live revision from public queries while keeping an editable draft; Trash is separate from
  status with restore and privileged permanent delete; revision-enabled collections keep
  revision history and revision restore; preview uses signed expiring tokens; entries carry edit
  locks (`ENTRY_LOCKED` refusals name the holder) and `_rev` optimistic-concurrency tokens that
  refuse stale saves. This matches the authority's required baseline lifecycle
  (`07-publishing-workflow.md` §2, §4, §5, §8, §9) item for item.
- **Concrete repository evidence**: `astro.config.mjs` (the integration that mounts the native
  Admin and its lifecycle against the foundation database; native migration modes `runtime:
  "check"` / `dev: "auto"`); `seed/seed.json` (defines **zero** workflow states or approval
  entities — deliberately, per `02-content-model.md` §22 and `07-publishing-workflow.md` §14);
  accepted T015 runtime evidence that the native Admin route, first-admin setup wizard, native
  sign-in, and the native settings REST surface operate on the running platform (passkey
  creation was exercised; passkey login was never automated, and no editorial workflow for
  Product content exists to this day).
- **Downstream feature boundary**: all editorial behavior for Product content — publishing,
  scheduling, preview, revisions, role assignment (an operational policy of the office,
  `10-system-blueprint.md` §6), draft-only staff patterns (`06-roles-permissions.md` §3) — is
  **planned, unimplemented and unverified Product work**: no Product collection exists, so no
  Product editorial workflow has been exercised at runtime. Domain metadata (announcement
  expiry, health-service operational status, document successor/expiry, ITA fiscal-year
  semantics) must be modeled as domain fields, never as universal CMS workflow states
  (`07-publishing-workflow.md` §6; `02-content-model.md` §20).
- **Why no second backend / competing foundation / speculative abstraction is necessary**: every
  required publishing capability maps to a native lifecycle/RBAC feature already installed;
  Version 1 explicitly excludes an approval engine, reviewer assignment, custom scheduler,
  custom revision/lock systems, and custom RBAC/Module Scope
  (`07-publishing-workflow.md` §14; `06-roles-permissions.md` §11;
  `10-system-blueprint.md` §23). The Constitution (§II) prohibits recreating an Approval Engine
  or custom RBAC absent a demonstrated gap; the only accepted Songhealth-specific extension to
  date remains the T012 readiness helper (`specs/001-platform-foundation/checklists/foundation-review.md` CHK007; `tasks.md`
  Scope Guardrails).

## 7. Group 4 — Other Bounded Product Features (representative capabilities)

Each row maps a representative bounded capability to its owning authority, native seam, baseline
repository evidence, and boundary. **None of these Product capabilities is implemented at this
baseline**; media/Admin availability are runtime-evidenced only as foundation behavior.

| Capability | Owning authority (file/section) | Native seam (installed or platform-provided) | Baseline repository / accepted evidence | Boundary preserved |
|---|---|---|---|---|
| **Media Library** (native-first media) | `02-content-model.md` §14 (no Songhealth Media collection; use the CMS Media Library); `05-admin-cms.md` §5 (native Media Library baseline); `10-system-blueprint.md` §11 | EmDash native media library on the native `local()` storage adapter configured at the stable `./media` mount, served at `/_emdash/api/media/file` (`astro.config.mjs`) | `astro.config.mjs` storage block; accepted T015 evidence: native upload `POST /_emdash/api/media`, native retrieval, byte-identical digests, CLI `emdash media list` | No DAM, folder hierarchy, image editor, check-in/out, custom media-usage database, or protected-file delivery; media storage is for public-publishable website assets only (`05-admin-cms.md` §5; `10-system-blueprint.md` §11; Constitution §IV) |
| **Global Search** (native-first search) | `08-search.md` §1 (use CMS/database search capability first; search discovers content, does not own it), §10 (no custom Search Projection if the native index tracks the CMS lifecycle), §14 (non-goals: no dedicated external search service, custom ranking engine, vector/semantic search); `10-system-blueprint.md` §10 | Native EmDash content search: collections declare `search` support with per-field `searchable` flags, and search is exposed through the platform's own surfaces — verified **[C7]** for the `emdash search` full-text CLI with collection/locale/limit filters (`docs.emdashcms.com/themes/seed-files`; `/reference/cli`). The server-side global search API/function named by `10-system-blueprint.md` §10 is authority direction to be confirmed against the pinned version when that feature is specified | `seed/seed.json` (no collections, so no searchable fields exist yet); no `/search` route exists — only `src/pages/index.astro` | Thai-appropriate tokenizer (trigram) configuration, searchable fields/weights set exactly; no search infrastructure of Songhealth's own; dedicated search technology reconsidered only on measured relevance/scale/UAT failure (`10-system-blueprint.md` §10; `08-search.md` §4, §15) |
| **Admin CMS** (native-first Admin) | `05-admin-cms.md` §1 (use the CMS, do not rebuild it; customization order: labels → built-in config → built-in permissions/workflow → small plugin/hook/widget → custom Admin page only for a proven gap), §13 (Extension Gate), §14 (non-goals incl. custom Admin SPA); `10-system-blueprint.md` §5 | Native EmDash Admin mounted by the integration at `/_emdash/` with React registered for it (`astro.config.mjs`); Thai labels via platform localization, no Admin fork | `astro.config.mjs` React + EmDash integrations; accepted T015 evidence: native Admin setup/sign-in availability on the running platform | No custom Admin SPA, role builder, notification center, workflow inbox; custom Admin components only through the §13 gate |
| **Relations & reuse** | `02-content-model.md` §13 (Document as semantic record + native media), §19 (core relationships); `10-system-blueprint.md` §12 | Native EmDash relation/reference fields with native transaction/relation validation | `seed/seed.json` (`relations: []` — seam present, deliberately empty) | No custom relationship service; no data duplication merely because presentation differs (`10-system-blueprint.md` §12) |
| **SEO, redirects, 404** | `03-sitemap.md` §16 (redirects), §17 (404/Gone/unpublished), §18 (legacy URL handling); `10-system-blueprint.md` §13 | Native EmDash SEO features, sitemap/robots/canonical metadata, and redirect/404 facilities; the native core migration set installed by the platform includes redirect artifacts (accepted T006/T015 evidence: the 90 core migrations run `001_initial`…`091_redirect_artifacts`) | Accepted T006/T015 migration-manifest evidence; `seed/seed.json` (`redirects: []`) | No custom redirect manager or redirect subsystem before a proven gap; Astro templates keep canonical page semantics (`10-system-blueprint.md` §13; `03-sitemap.md` §16) |
| **ITA** | `02-content-model.md` §18 (structured yearly evidence directory; evidence points to Document / native Media / External URL; no compliance/scoring/workflow engine); `03-sitemap.md` §11 (routes); `05-admin-cms.md` §7 (native collection editor + relation picker first); `10-system-blueprint.md` §15 | Structured EmDash collections/relations per the Content Model; native editor first; custom widget/page only on a clear UAT gap | None — planned; no ITA resources exist at baseline | No ITA compliance engine, scoring engine, approval workflow, workflow designer, or automatic evidence carry-forward (`05-admin-cms.md` §7; `10-system-blueprint.md` §15) |
| **WordPress migration** (native-first importer) | `09-migration-plan.md` §1 (native importer first; customize only mapping gaps), §4 (preferred import path: WXR/exporter → native Analyze/Review/Prepare/Import/Copy-Media flow), §16 (native importer boundary), §17 (non-goals: no generic importer framework/custom identity registry/custom redirect service); `10-system-blueprint.md` §16 | Native EmDash WordPress import flow — verified **[C7]**: a WXR import REST surface exists, executing a WXR file with post-type/author mappings, `skipExisting`, and per-section import against target collections (`POST /_emdash/api/import/wordpress/execute`, `docs.emdashcms.com/migration/content-import`). The rerun-guard behavior (collection + slug + locale identity of `skipExisting`) is recorded as an authority-mandated implementation caution in `10-system-blueprint.md` §16 | None — planned and **not authorized**: `09-migration-plan.md` §18 records Trial/Production import/cutover/retirement all `NOT AUTHORIZED` | Custom migration code only for transformations the native importer cannot perform correctly, as temporary tooling, never a permanent application layer; WordPress is the source, never the target model (`09-migration-plan.md` §1, §16) |

Adjacent bounded areas that are **not** CMS features and stay outside these seams: the Dashboard
is a separate analytical data domain with its own ownership — the CMS must not become its metric
store (`00-website-foundation.md` §1.3; `02-content-model.md` §17); single-source-of-truth reuse
(no duplicate copies across homepage/sections/search) is a content-ownership rule
(`00-website-foundation.md` §3.6; `04-homepage.md` §13).

## 8. Why one canonical foundation suffices — and the governed evolution path

- **Traceability**: all four groups resolve to the same installed platform — one Astro SSR
  application, one integrated EmDash CMS/Admin, one PostgreSQL database, one native local-media
  boundary (`10-system-blueprint.md` §2, §3; `spec.md` FR-001; plan §One Astro + EmDash
  platform). No mapped capability requires a second application, backend/API server, database,
  identity system, or deployment stack; the explicit non-goal list
  (`10-system-blueprint.md` §23) and the feature's out-of-scope list (`spec.md`) both forbid
  them, and `specs/001-platform-foundation/checklists/foundation-review.md` CHK010 verified the structure forecloses them.
- **No speculative abstraction**: every mapped seam is a platform capability already integrated
  at the baseline; the single accepted Songhealth-specific extension remains the T012 aggregate
  readiness helper, justified by a demonstrated native gap (no aggregate ready/not-ready
  primitive) and bounded by focused tests (`research.md` §7 Demonstrated gap;
  `specs/001-platform-foundation/checklists/foundation-review.md` CHK007; `tasks.md` Scope Guardrails). Any future apparent
  native-capability gap must stop at review and be escalated, not solved opportunistically
  (`tasks.md` Scope Guardrails; `10-system-blueprint.md` §22 Extension Gate: accepted Product
  requirement impossible natively, reproduced/explained gap, smallest extension, gap test).
- **Genuine-gap / owning-authority-amendment evolution path (preserved)**: a platform boundary
  may evolve only when an approved requirement demonstrates a genuine gap **and** the owning
  authority is amended — for Product/behavior boundaries the owning document in `current/00–09`,
  for technical boundaries
  `docs/website-modernization-docs/current/10-system-blueprint.md`, each amended and accepted before
  downstream implementation changes (`spec.md` US4, FR-017, SC-007, and the 2026-10-06
  clarification "a boundary may evolve after a genuine requirement gap and amendment of its
  owning authority"; Constitution §I and §Governance; `specs/001-platform-foundation/checklists/foundation-review.md` CHK004).
  This artifact records seams as they exist at the baseline; it amends nothing.

## 9. External verification record (version-sensitive claims)

| Verified fact | Source (checked 2026-10-13) | Version anchor |
|---|---|---|
| `_emdash` live collection registered with `defineLiveCollection` + `emdashLoader()` in `src/live.config.ts`; pages query via `getEmDashCollection`/`getEmDashEntry`; queries default to published status | Context7 `/websites/emdashcms` → `docs.emdashcms.com/concepts/architecture`, `/guides/querying-content` (also matches the baseline file verbatim) | `emdash` pinned `1.1.0` (`package.json`); installed-equals-pin runtime-verified by accepted T006/T015 evidence |
| Content lifecycle: draft/scheduled/published; live + pending draft; publish changes; schedule/unschedule; unpublish; Trash/restore/permanent delete; revisions and revision restore; signed expiring preview tokens; edit locks (`ENTRY_LOCKED`); `_rev` stale-save refusal | Context7 `/websites/emdashcms` → `docs.emdashcms.com/reference/content-lifecycle`, `/guides/working-with-content`, `/reference/api` (`generatePreviewToken`), `/reference/mcp-server` | same |
| Seed format defines `collections` (fields; `supports` incl. `drafts`/`revisions`/`search`/`seo`), `taxonomies`, `relations`, `menus`, `widgetAreas`, `content` | Context7 `/websites/emdashcms` → `docs.emdashcms.com/themes/seed-files`, `/themes/creating-themes` (the baseline `seed/seed.json` uses the same schema and keys) | same |
| Native WordPress WXR import surface (`POST /_emdash/api/import/wordpress/execute` with `postTypeMappings`, `skipExisting`, author mappings, import sections) | Context7 `/websites/emdashcms` → `docs.emdashcms.com/migration/content-import` | same |
| Native full-text search CLI (`emdash search`, collection/locale/limit filters) and per-field `searchable` flags | Context7 `/websites/emdashcms` → `docs.emdashcms.com/reference/cli`, `/themes/seed-files` | same |

No claim above goes beyond these pages plus supplied baseline evidence. The server-side global
search API named by `10-system-blueprint.md` §10 and the Admin UI details of the WordPress
import flow are treated as **owning-authority direction for future features**, to be confirmed
against the pinned version at those features' specification time — not asserted here as verified
EmDash 1.1.0 API fact beyond what is recorded above.

## 10. Pending gates and what this artifact does not establish

- **T022 (US2 production durability) runtime evidence: PENDING.** **T028 (US3 recovery) runtime
  evidence: PENDING** (and may execute only after T022 PASS plus Codex-accepted T023–T027
  sources). **T030** may execute only after both T028 PASS and Codex-accepted T029 sources
  (`tasks.md` Dependencies & Execution Order, Blocking Gates, Notes).
- Source review of this document cannot substitute for any runtime PASS, waive a failed gate,
  establish US3/US4 completion, or satisfy final Feature 001 acceptance. US4's independent test
  (the T030 architecture/specification review mapping all four groups, finding no second
  foundation and no unjustified boundary replacement) has **not** been performed by this
  author and remains T030's deliverable.
- No Product collection, Product page, editorial workflow, search surface, migration import, or
  any other explicit out-of-scope capability (`spec.md` §Explicitly Out of Scope) has been
  delivered or implied as delivered by this artifact.

## 11. Scope confirmation

- Changed files vs the authorized baseline `c8701eaf…`: exactly **one** — this evidence file
  `specs/001-platform-foundation/evidence/T029-canonical-extension-seams.md` (verified with
  `git status`/`git diff --stat` before commit; see the review handoff for the candidate SHA).
- `git diff --check` on the candidate change: clean (no whitespace errors).
- No task markers were modified in `tasks.md`; no Constitution, Spec Kit, architecture,
  application, database, or deployment file was touched; no secrets, credentials, or
  non-public data appear in this artifact.

## 12. Limitations

- This is a source-only artifact authored under Development-First Sequencing: it reflects the
  accepted source baseline and cited authorities as of 2026-10-13 and the pinned `emdash` 1.1.0
  documented surface verified through Context7 on that date; it contains no runtime execution of
  the application, tests, or operational gates (per the delegation: "This document-only task
  requires no runtime execution or application tests").
- EmDash documentation via Context7 reflects the vendor's current published documentation; where
  that documentation and the pinned 1.1.0 package could diverge, the accepted in-repository
  runtime evidence (T006/T015, both recorded against installed `emdash@1.1.0`) takes precedence
  for the facts it covers, and every remaining capability statement is framed as future
  feature direction to be confirmed at that feature's specification time.
- The author is the implementation executor, not the reviewer: independent Codex review (PASS /
  REWORK / BLOCKED) and separate Product Owner Source Acceptance — and any merge — remain
  outstanding.
