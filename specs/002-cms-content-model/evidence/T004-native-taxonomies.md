# T004 — Shared Native Taxonomies Evidence (Feature 002)

**Feature**: `002-cms-content-model`
**Task**: T004 (Phase 2: Foundational — Shared Feature Prerequisites) — "Define shared native `topic`,
`audience` and hierarchical `area` taxonomies in `seed/seed.json`, with approved labels/attachments as
each owning collection is introduced; quote Area's 'explicit official/stable code in native term
slug, name in label, parent via native group identity' and 'Province → District → Subdistrict →
Village'; add no invented term inventory, Area/classification collection or taxonomy publication
gate, and retain office contact in native site settings."
**Recording date**: 2026-10-15 (UTC).
**Corrective round**: 1/3 (2026-10-15) — evidence-only corrections per Lead REWORK comment
`01a13da6-6337-706f-a7b3-9139803bb3be` (integrity digest transcription; validator dependency
environment and reproduction instructions); see §5a. Implementation content unchanged.
**Executor**: Claude Code (claude-developer, Multica DEV Executor), delegated by codex-lead-reviewer
under the Product Owner bounded T004-only authorization in Multica issue 9GOTSTORY-221.
**Scope**: T004 only. Source/static verification only: no initialized-database schema application,
runtime check, or PASS claim (T006 owns inspection/application and the T003 run); no T005–T035
execution; no application code, dependency, infrastructure, database-volume or production change;
no merge or deployment.

## 1. Required constraint quotes (approved Data Model authority)

The `area` taxonomy preserves the approved model, quoted verbatim from
[data-model.md](../data-model.md) §Taxonomies, Area and Owner Settings:

> `area` (hierarchical) … "Explicit official/stable code in native term slug, name in label, parent
> via native group identity; selection is editor-maintained, not a custom publication requirement"

and:

> "Area terms model applicable Province → District → Subdistrict → Village hierarchy."

Term population (codes, names, hierarchy edges) is intentionally absent: no authoritative
classification inventory or official Area code source exists (T001 §6 records it as a missing
population/UAT input). The seed therefore defines the taxonomy structure with **empty term
inventories and empty collection attachments**; T001's finding remains pending, and nothing here
invents terms or official codes.

## 2. Delivered definitions

`seed/seed.json` now defines exactly three native taxonomies (no collections, relations, menus,
redirects, widgetAreas, sections, or content are introduced):

| Taxonomy | Native label (Thai, owning-document meaning) | `hierarchical` | `collections` | `terms` |
| --- | --- | --- | --- | --- |
| `topic` | หัวข้อ (shared Topic/health classification) | `false` | `[]` | omitted |
| `audience` | กลุ่มเป้าหมาย (shared intended audience) | `false` | `[]` | omitted |
| `area` | พื้นที่ (hierarchical geographic classification) | `true` | `[]` | omitted |

- Labels follow the Data Model's Common Native Contract ("Use the owning document's Thai field
  meaning as native `label`"); `current/02` carries the meanings Topic / Health Topic (§4/§7),
  Audience (§4) and Area Reference (§10). `labelSingular` repeats the Thai label (Thai has no
  singular/plural distinction).
- Attachments are empty because **no approved owning collection exists at this baseline**; the
  approved attachment matrix in data-model.md attaches taxonomies only as their owning collections
  are introduced (T008–T012, T015–T016, T028). No future collection or dangling attachment is
  introduced.
- No custom Area/classification collection, taxonomy validator, or publication gate is defined;
  office contact stays in native site settings (unchanged — no settings block is added).
- Seed `meta` was stale ("Defines zero Product … taxonomies"); it now truthfully describes the
  three taxonomies, the intentionally empty inventories, the pending attachments, and the still
  preserved empty collections/content and built-in Posts/Pages model suppression.

## 3. Official `$speckit.implement` workflow disposition

Executed the installed official workflow (Specify CLI 1.1.0) for the existing feature — no
feature/branch initialization, no scope advance:

| Step | Disposition |
| --- | --- |
| Resolver | `specify artifact info speckit.implement --json` → active `command:speckit.implement`, strategy `replace` — matches the canonical installed command file named by the delegation |
| Prerequisites (Outline 1) | `SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` → exit `0`; `FEATURE_DIR` = `specs/002-cms-content-model`; `AVAILABLE_DOCS` = research.md, data-model.md, contracts/, quickstart.md, tasks.md (the runtime's stale `specs/001-application-foundation` override required the same explicit override T001 recorded) |
| Checklists (Outline 2, read-only gate) | cms.md 36/36 checked, requirements.md 16/16 checked → overall **PASS**, auto-proceed; markers untouched |
| Context load (Outline 3) | tasks.md, plan.md, data-model.md, contracts/, research.md, quickstart.md, constitution v3.0.0, AGENTS.md, current/02 read; T001 evidence used for baseline/pending inputs |
| Ignore files (Outline 4) | `.gitignore` and `.containerignore` already cover the Node/TypeScript/Astro essentials; no ESLint/Prettier/Terraform/Helm config exists; **no change made** |
| `hooks.before_implement` | `.specify/extensions.yml` parsed without error; single git `speckit.git.commit` hook — `enabled: true`, `optional: true`, `condition: null` → **optional, not auto-executed** (tree had no outstanding implementation changes; the delivery commit is explicit per authorization) |
| `hooks.after_implement` | Same registration, `optional: true` → **optional, not auto-executed**; the single authorized delivery commit is made explicitly |
| Task execution | Only T004 executed and marked `[x]`; T005–T035 untouched. The workflow's "all tasks completed" end state is intentionally not reached (bounded T004-only authorization) |

## 4. Version and source evidence (exact pinned release)

Per `AGENTS.md` §External Documentation and Context7: Context7 first, then first-party
exact-release sources.

1. **Context7** (`/websites/emdashcms` → docs.emdashcms.com/themes/seed-files): documents the seed
   taxonomy shape (`name`, `label`, `labelSingular`, `hierarchical`, `collections`, `terms` with
   `slug`/`label`/`parent`), `validateSeed`/`applySeed` from `emdash/seed`, and that a taxonomy with
   no collections and a parent on a flat taxonomy are validator **warnings**, not errors.
2. **First-party exact release**: `https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz`
   downloaded; recomputed SHA-512
   `sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHLqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==`
   equals the `package-lock.json` `node_modules/emdash` integrity (the same value research.md
   independently recomputed). Re-verified 2026-10-15 (corrective round 1/3) from a fresh
   registry download: recomputed digest again equals the unchanged lockfile value. Exact-release
   source consulted:
   - `src/seed/types.ts` — `SeedTaxonomy` (`name`, `label`, `labelSingular?`, `hierarchical?`,
     `collections?`, `terms?`) and `SeedTaxonomyTerm` (`slug`, `label`, `description?`, `parent?`
     — "Slug of parent term (for hierarchical taxonomies)").
   - `src/seed/validate.ts` — taxonomy rules: `name` required and unique per locale; `label`
     required; **`hierarchical` required** (error when undefined); **`collections` required as an
     array** (error when undefined) with an **empty array a warning only** ("not assigned to any
     collections"); term `slug`/`label` required, `parent` must name an existing same-taxonomy term
     slug on hierarchical taxonomies.
   - `src/seed/default.ts` — the built-in Posts/Pages/categories/tags seed applies only "when no
     user seed file exists", so the present user seed keeps suppressing it.
   - `src/api/schemas/taxonomies.ts` — native term shapes (slug/label/parentId/description)
     consistent with the seed term shape (research.md §4 cites the adjacent term/group identity
     code).

## 5. Static verification executed and outcomes

| Check | Command (pinned Node 24.21.0) | Outcome |
| --- | --- | --- |
| JSON well-formedness | `JSON.parse` of `seed/seed.json` under `node v24.21.0` | **OK** |
| Exact-release seed validation (original run, 2026-10-14/15) | `validateSeed(seed)` imported from the integrity-verified `emdash@1.1.0` archive's `dist/seed/index.mjs` under pinned Node 24.21.0, with the archive's external imports resolving against the repository's lockfile-resolved dependency tree — see §5a for the accurate environment description and the verified reproduction commands | `valid: true`, `errors: []`, `warnings`: exactly the three truthful `taxonomies[n].collections: taxonomy "topic"/"audience"/"area" is not assigned to any collections` (matches the approved pending-attachment state) |
| Scope check | `git status --porcelain` / `git diff --stat` | Only `seed/seed.json` (modified), `specs/002-cms-content-model/tasks.md` (single T004 marker), this evidence file (new); T005–T035 markers and all Feature 001 artifacts unchanged |
| Whitespace | `git diff --check` | Clean — no whitespace errors |
| Secrets | none introduced | No token/credential/secret value in any delivered file |

## 5a. Corrective round 1/3 — validator environment correction and verified reproduction (2026-10-15)

Lead REWORK comment `01a13da6-6337-706f-a7b3-9139803bb3be` required two evidence corrections;
both are resolved here. Seed definitions, task markers, dependencies/lockfile and all other
content are unchanged by this round.

1. **Integrity value typo.** §4's recorded digest dropped one character (`LDHqat` instead of
   `LDHLqat`). The corrected value above was recomputed from a fresh registry download and equals
   the unchanged `package-lock.json` integrity. The original run's computation was correct; only
   this record's transcription was wrong.

2. **Inaccurate two-package setup claim.** The original validation did **not** run against a
   `kysely`/`zod`-only environment. Its install command
   (`npm install --no-save --ignore-scripts … kysely@0.29.0 zod@4.5.4`) executed from a scratch
   directory without its own `package.json`, so npm resolved the project root as the repository
   and materialized the repository's full lockfile-declared dependency tree (596 packages) in the
   gitignored repository-root `node_modules/`; the validator import then resolved `kysely`, `zod`,
   `@oslojs/crypto` and the remaining external imports from there. The original
   `valid: true` / 0 errors / 3 warnings result is genuine (corroborated by the run execution
   log) — only its environment description was inaccurate. The unreported repository-root
   `node_modules/` residue from that run was removed during this corrective round.

   Confirmed independently (Lead review and this round): a two-package environment cannot import
   the validator — from a bare integrity-verified archive with only `kysely`/`zod` resolvable,
   the import fails with
   `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@oslojs/crypto' imported from …/dist/secrets-….mjs`.
   Installing the archive's own declared tree directly is also not viable: its `package.json`
   references unpublished `@emdash-cms/atproto-test-utils@0.0.0` (registry 404) and carries
   `@tiptap/react`↔`@types/react` peer conflicts (ERESOLVE).

   **Verified clean-scratch reproduction** (pinned Node 24.21.0 / npm 12.2.0; no project
   dependency change — `package.json` and `package-lock.json` untouched):

   ```bash
   cd <songhealth-repo>
   npm ci                                                  # README §1: installs exactly the committed lockfile (599 packages)
   mkdir -p .tmp/t004-verify && cd .tmp/t004-verify
   curl -fsSL -o emdash-1.1.0.tgz https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz
   # integrity: recomputed SHA-512 base64 equals package-lock.json's node_modules/emdash value (§4)
   tar -xzf emdash-1.1.0.tgz
   node --input-type=module -e "
     import { validateSeed } from './package/dist/seed/index.mjs';
     import { readFileSync } from 'node:fs';
     const seed = JSON.parse(readFileSync('../../seed/seed.json','utf8'));
     console.log(JSON.stringify(validateSeed(seed)));
   "
   ```

   Executed 2026-10-15 with exactly these steps (under `.tmp/t004r1/`): `npm ci` reported
   **"added 599 packages in 15s"**; the fresh archive's recomputed digest equals the lockfile
   (§4); the validator import resolved its externals from the repository-root
   `node_modules/` installed by `npm ci`; result: **`valid: true`, 0 errors, 3 warnings** —
   identical to the original genuine result (the same three pending-attachment notices). This
   reproduction is recorded separately from the original execution; it is a new run, not a
   re-labeled old one. The `node_modules/` tree materialized for this verification was removed
   afterwards to restore the per-clone state T001 recorded; `npm ci` recreates it exactly.

## 6. Outstanding prerequisites and non-claims

- Term inventories (classification terms, official Area codes, Province → District → Subdistrict →
  Village edges) remain **pending population/UAT inputs**; no synthetic "official" data exists.
- Taxonomy attachments are added only as each owning collection is introduced by its authorized
  task; none exists at this baseline.
- Editing `seed/seed.json` is bootstrap intent only: it does not update an initialized database.
  Inspect/apply on the authorized development instance and the T003 run are **T006** scope
  (separately authorized), as is any schema/runtime PASS claim.
- Feature 001 T022 (production durability) and T028 (recovery) remain **PENDING** with their
  original joins; this task neither executes nor redefines them.
- No runtime, integration, scheduler, browser, readiness, or SC outcome is declared PASS; ChatGPT
  Independent Review and Product Owner acceptance remain required.
- Owned scratch removed before delivery in both rounds (`.tmp/t004/` original validator tooling;
  `.tmp/t004r1/` corrective verification), together with the repository-root `node_modules/` the
  original run's install had silently materialized (§5a) — the per-clone state T001 recorded is
  restored, and no container, service, credential scratch, or database was created, started, or
  mutated by either run.
