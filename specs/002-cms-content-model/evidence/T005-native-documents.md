# T005 — Native Documents/Document Type Evidence (Feature 002)

**Feature**: `002-cms-content-model`
**Task**: T005 (Phase 2: Foundational — Shared Feature Prerequisites) — "Define `documents`/`document_type`
in `seed/seed.json` with '`title` string S; `summary` text O; `file` file S; `document_at` datetime O;
`fiscal_year` integer O; `owner_source` text O; `domain_status` select O (current/superseded/expired)'
and '`document_type` O; `topic` O'; use native file/Media shape and optional `document_successor`
(Document `successor` parent → Document) with 'one maximum; many predecessor records may point to
it,' without copied Media/File entities or retention enforcement."
**Recording date**: 2026-10-15 (UTC).
**Executor**: Claude Code (claude-developer, Multica DEV Executor), delegated by codex-lead-reviewer
(handoff comment `01a13df7-46c6-777e-9631-f2c5fed4c866`) under the Product Owner workflow correction
`01a13df6-3047-74d9-9251-c0b006fdb2a6` and the existing bounded T005-only authorization
(Multica issue 9GOTSTORY-223).
**Scope**: T005 only. Source/static verification only: no initialized-database schema application,
no runtime check, and no PASS claim of any runtime behavior (T006 owns native schema
inspection/application and the T003 run); no T006–T035 execution; no edits to existing
implementation tests; no application code, dependency, lockfile, infrastructure, database-volume or
production change; no additional collections; no merge or deployment.

## 1. Baseline and branch provenance

| Item | Value (verified this run) |
| --- | --- |
| Repository | `9GotStory/songhealth` |
| Authorized target/continuation branch | `agent/codex-lead-reviewer/477dbb76ad5b` |
| Expected baseline (delegation) | `1ba9bf93f5ea6d84b23dc73ab2bf376e0ddbf014` |
| Checkout HEAD at start | `1ba9bf93f5ea6d84b23dc73ab2bf376e0ddbf014` — **match**, working tree clean, no conflicting developer work present |
| Task markers at baseline | T001–T004 `[x]`, T005 `[ ]` — as delegated |
| Delivery branch | task checkout branch off the authorized line; pushed to the authorized branch, no force |

## 2. Delivered definitions

`seed/seed.json` now defines exactly one Product collection, one named relation, and four taxonomies
(`document_type` added; `topic` attached to `documents`; `audience`/`area` unchanged and still
pending their owning collections):

| Native definition | Delivered shape (all labels Thai, owning-document meaning) |
| --- | --- |
| Collection `documents` | `label`/`labelSingular` เอกสาร; `supports` exactly `drafts, revisions, preview, scheduling`; `titleField: "title"`, `dateField: "document_at"`; no `search`/`seo` (enabled only where useful — no approved usefulness case for Document) |
| Field `title` | `string`, `required: true`, label ชื่อเรื่อง (S) |
| Field `summary` | `text`, optional, label สรุป (O) |
| Field `file` | `file`, `required: true`, label ไฟล์เอกสาร (S) — native file/Media object shape only; no copied File/Media entity |
| Field `document_at` | `datetime`, optional, label วันที่เอกสาร (O); native offset-aware datetime (T003's supplied-value checks) |
| Field `fiscal_year` | `integer`, optional, label ปีงบประมาณ (O) |
| Field `owner_source` | `text`, optional, label เจ้าของ/แหล่งที่มา (O) |
| Field `domain_status` | `select`, optional, label สถานะเอกสาร (O); `validation.options` exactly `current`, `superseded`, `expired` |
| Field `successor` | `reference`, optional, label เอกสารฉบับถัดไป (O); explicitly bound `validation: { relation: "document_successor", relationSide: "parent" }`, no `targetCollection` (native derive-not-trust), no `multiple` flag (cardinality is relation-owned) |
| Relation `document_successor` | self-relation `parentCollection: "documents"` / `childCollection: "documents"`; `maxChildrenPerParent: 1` (one successor per predecessor); `maxParentsPerChild: null` (unlimited predecessors may reference the same successor); `parentLabel` เอกสารฉบับก่อนหน้า (the predecessor's role seen from the successor), `childLabel` เอกสารฉบับถัดไป (the successor's role seen from the predecessor); declared in `relations[]` before the bound field — no automatically named `documents_successor` edge set is created |
| Taxonomy `document_type` | label/labelSingular ประเภทเอกสาร, `hierarchical: false`, `collections: ["documents"]`, no terms (inventories stay pending authoritative sources) |
| Taxonomy `topic` (T004) | unchanged definition; `collections` `[]` → `["documents"]` (attachment added as its owning collection is introduced) |
| Taxonomies `audience`/`area` (T004) | byte-for-byte unchanged, still `collections: []` |

- Field order follows the approved data-model `documents` row exactly (title, summary, file,
  document_at, fiscal_year, owner_source, domain_status, then the `successor` reference) — logical
  staff ordering per the Common Native Contract.
- Requiredness uses the native top-level `required: true` only for `title` and `file` (S); every
  other field, the `document_type`/`topic` classifications and the `successor` reference stay
  optional with native supplied-value constraints only. No publication predicate, hook, immutable
  file or retention guarantee is introduced.
- Seed `meta.description` updated truthfully for the bounded result (documents +
  document_successor + document_type defined and attached; audience/area attachments still pending;
  menus/redirects/widgetAreas/sections/content still zero; built-in Posts/Pages model still
  suppressed; term inventories still intentionally empty).

## 3. Official `$speckit.implement` workflow disposition

Executed the installed official workflow (Specify CLI 1.1.0) for the existing feature — no
feature/branch initialization, no scope advance:

| Step | Disposition |
| --- | --- |
| Resolver | `specify artifact info speckit.implement --json` → active `command:speckit.implement`, strategy `replace` |
| Prerequisites | `SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` → exit `0`; `FEATURE_DIR` = `specs/002-cms-content-model`; `AVAILABLE_DOCS` = research.md, data-model.md, contracts/, quickstart.md, tasks.md (same explicit override T001/T004 recorded for this runtime's stale default) |
| Checklists (read-only gate) | cms.md 36/36 checked, requirements.md 16/16 checked → overall **PASS**, auto-proceed; markers untouched |
| Context load | tasks.md (T005 + shared constraints), plan.md, data-model.md, contracts/native-editorial.md, contracts/public-read.md, research.md, constitution v3.0.0, AGENTS.md, CLAUDE.md, current/02 §13/§20, current/05 §2, T001/T004 evidence, T003 `tests/browser/cms-document.spec.ts` read |
| Ignore files | `.gitignore` (incl. `node_modules/`, `.tmp/`) and `.containerignore` already cover the essentials; **no change made** |
| `hooks.before_implement` / `hooks.after_implement` | `.specify/extensions.yml` parsed without error; single git `speckit.git.commit` hook each — `enabled: true`, `optional: true`, `condition: null` → **optional, not auto-executed**; the single authorized delivery commit is explicit |
| Task execution | Only T005 executed and marked `[x]`; T006–T035 untouched. The workflow's "all tasks completed" end state is intentionally not reached (bounded T005-only authorization) |

## 4. Version and source evidence (exact pinned release)

Per `AGENTS.md` §External Documentation and Context7: Context7 first, then first-party
exact-release sources.

1. **Context7** (`/websites/emdashcms`, seed-files/content-model/field-types/relations pages):
   documents the general seed collection shape (`slug`, `label`, `labelSingular`, `supports`,
   `titleField`, `dateField`, `fields`), select options under field `validation`, reference-field
   binding, and that naming only `targetCollection` auto-creates a relation. Unversioned examples —
   the pinned archive below controls every release-sensitive claim.
2. **First-party exact release**: `https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz` downloaded
   fresh this run; recomputed SHA-512
   `sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHLqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==`
   equals the `package-lock.json` `node_modules/emdash` integrity (the value research.md, T002
   helpers and T004 §4 independently verified). Exact-release source consulted:
   - `src/seed/types.ts` — `SeedCollection` (`supports` typed `("drafts" | "revisions" | "preview" |
     "scheduling" | "search" | "seo")[]`, `titleField`, `dateField`), `SeedField` (`slug`, `label`,
     `type`, `required`, free-form `validation`), `SeedRelation` (`slug`, `parentCollection`,
     `childCollection`, `parentLabel`/`childLabel` (+ singular), `maxChildrenPerParent`/
     `maxParentsPerChild` — "Omitted or `null` is unlimited"), `SeedTaxonomy` (`collections`).
   - `src/seed/validate.ts` — collection/field/relation rules (slug pattern `^[a-z][a-z0-9_]*$`,
     labels required, `FIELD_TYPES` membership, positive-integer-or-null maxima); taxonomy
     `hierarchical`/`collections` required (empty `collections` array a warning only).
   - `src/seed/apply.ts` — relations are created "before the fields that name them";
     `resolveSeedFieldRelation` binds a named `validation.relation` and states `relationSide` "is
     only needed for a self-referential relation" (the explicit `parent` here) with
     `targetCollection` "derived rather than trusted"; an unbound reference field would get an
     automatically named relation (`{collection}_{field}` → `documents_successor`) — avoided by the
     explicit binding.
   - `src/api/handlers/validate-references.ts` — "Cardinality lives on the relation, not the field";
     a parent-side field's `maxSelected` is the relation's `max_children_per_parent` (so
     `maxChildrenPerParent: 1` is exactly "one successor per predecessor"), and
     `max_parents_per_child` unlimited preserves "many predecessor records may point to it".
   - `src/schema/zod-generator.ts` — `select` → enum of `validation.options`; `file` →
     `z.object({ id: z.string(), … })` (native media id object); `datetime` → offset-aware ISO
     (matches T003's checked refusals).
   - `src/seed/default.ts` — the built-in Posts/Pages seed applies only "when no user seed file
     exists"; the present user seed keeps suppressing it.

## 5. Static verification executed and outcomes

All commands under the pinned toolchain Node 24.21.0 / npm 12.2.0
(`/home/multica-agent/toolchain/node-v24.21.0-linux-x64`, PATH-scoped as T015/T001 established);
no project dependency change (`package.json`/`package-lock.json` untouched).

| Check | Command | Outcome |
| --- | --- | --- |
| Lockfile-exact dependency materialization | `npm ci` (repository root) | completed for verification only; `node_modules/emdash` version `1.1.0` (lockfile-resolved); tree removed again afterwards (§8) |
| Exact-release seed validation | `validateSeed(seed)` imported from the integrity-verified archive's `dist/seed/index.mjs` with externals resolving from the `npm ci` tree; seed read from `seed/seed.json` | **`valid: true`, `errors: []`**, warnings exactly the two truthful `taxonomies[n].collections: taxonomy "audience"/"area" is not assigned to any collections` notices (approved pending-attachment state; `topic`/`document_type` are attached) |
| Structural definition checks | 38 assertions over the parsed seed: exact field slugs/types/requiredness/order, select enum, explicit relation binding (named relation, `relationSide: parent`, no `targetCollection`, no `documents_successor` auto-duplicate), self-relation ends, `maxChildrenPerParent: 1` / `maxParentsPerChild: null`, Thai labels, `supports` set, `titleField`/`dateField`, taxonomy attachments/addition/preservation, unchanged empty boundaries, meta truthfulness | **38/38 PASS** |
| JSON well-formedness | `JSON.parse` of `seed/seed.json` | **OK** (implicit in the validator and assertion runs) |
| Scope check | `git status --porcelain` / `git diff --stat` vs baseline | Only `seed/seed.json` (modified), `specs/002-cms-content-model/tasks.md` (single T005 marker), this evidence file (new); T006–T035 markers, `tests/browser/`, `specs/001-platform-foundation/` and all Feature 001 artifacts unchanged |
| Whitespace | `git diff --check` | Clean — no whitespace errors |
| Secrets | none introduced | No token/credential/secret value in any delivered file |

## 6. Outstanding prerequisites and non-claims

- Editing `seed/seed.json` is bootstrap intent only: it does not update an initialized database.
  Inspect/apply on the authorized development instance and the T003 `cms-document.spec.ts` run are
  **T006** scope (separately authorized), as is any schema/runtime PASS claim. No schema was
  applied and no runtime was started by this task.
- Term inventories (`document_type` terms, `topic` terms, official Area codes) remain **pending
  population/UAT inputs** (T001 §6); nothing here invents terms.
- The `successor` reference's "one maximum" is the native relation cardinality; per the approved
  model it carries no target-availability, immutable-file or removal-protection guarantee (D-REF
  stays deferred), and no publication/validation hook exists here.
- Feature 001 T022 (production durability) and T028 (recovery) remain **PENDING** with their
  original joins; this task neither executes nor redefines them.
- No runtime, integration, scheduler, browser, readiness or SC outcome is declared PASS; Lead
  source verification, ChatGPT Independent Review and Product Owner acceptance remain required and
  are not assumed by this artifact.

## 7. Boundaries confirmation

- Accepted T001–T004 artifacts preserved: T004's three taxonomy definitions keep their labels,
  hierarchy and shape (only `topic.collections` gains its approved owning attachment);
  `tests/browser/` untouched; no dependency/lockfile/infrastructure change; no additional
  collections, menus, redirects, widgetAreas, sections or content; no duplicated File/Media entity;
  no custom validation/publication hook; no migration, merge or deployment; Feature 001 pending
  gates preserved.

## 8. Cleanup

- The verification `node_modules/` tree (materialized by `npm ci` for the validator's externals)
  and the owned `.tmp/t005-verify/` scratch (downloaded archive, extraction, validator script
  state) were removed after verification, restoring the per-clone state T001 recorded; `npm ci`
  recreates the tree exactly. No container, service, database, credential scratch or production
  resource was created, started or mutated by this run.
