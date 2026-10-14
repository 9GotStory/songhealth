# T001 — Development Inputs Evidence (Feature 002)

**Feature**: `002-cms-content-model`
**Task**: T001 (Phase 1: Setup — Reuse Existing Platform) — record the exact source baseline,
existing Feature 001 T006/T015 and T029 evidence, pinned native development readiness,
role/timezone fixtures, classification/official Area inputs and any demonstrated Organization
reuse case in this file; use `README.md`'s existing setup, identify missing inputs truthfully,
and keep Feature 001 T022/T028 PENDING without executing their gates.
**Recording date**: 2026-10-14 (UTC).
**Executor**: Claude Code (claude-developer, Multica DEV Executor), delegated by codex-lead-reviewer
under the Product Owner bounded T001-only authorization in Multica issue 9GOTSTORY-208.
**Scope**: T001 only. This is an input-recording artifact, not runtime verification: no
application/schema/seed/dependency/infrastructure change, no T002–T035 work, no runtime PASS or
readiness PASS claim, no production mutation, merge or deployment, and no Feature 001 gate
execution. Accurately documented missing inputs remain downstream blockers; they are not
converted into false readiness.

## 1. Official `$speckit.implement` workflow execution

The installed official instructions were located and executed; no handwritten workflow was
substituted and no skill bundle is committed (repository policy: `AGENTS.md` §Spec Kit Usage —
this repository does not vendor agent-specific Spec Kit skill bundles).

| Item | Recorded value |
| --- | --- |
| Resolver | Installed Specify CLI `specify 1.1.0` (`specify artifact info speckit.implement` → active command `command:speckit.implement`, strategy `replace`) |
| Instruction path | `.claude/skills/speckit-implement/SKILL.md` (claude integration skill; materialized locally through the official `specify integration upgrade claude` — the 20 managed skill files are per-checkout installs, absent from a fresh clone) |
| Integrity | SHA-256 `7186d59488f89dcf23abd17baed118b05c242d4f62f1de3f9f44625a2b1728f0` — byte-identical to the value pinned by the committed `.specify/integrations/claude.manifest.json` (integration version 1.1.0) |
| Disposition | Local read/execute only; untracked, removed before delivery; never committed. The manifest's `installed_at` timestamp rewritten by the materialization was reverted; the committed manifest is unchanged |

**Prerequisite commands** (Outline step 1):

```bash
specify integration upgrade claude          # materialize official skill files (local only)
SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model \
  .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

- The prerequisites script first failed with `Feature directory not found: …/specs/001-application-foundation`:
  this runtime's environment carries a stale `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation`
  (a feature that does not exist; Feature 001's actual directory is `001-platform-foundation`).
  Resolution used the script's own documented priority-1 explicit override
  (`common.sh` §get_feature_paths) set to the active feature `specs/002-cms-content-model`; the
  gitignored machine-local `.specify/feature.json` now points at the active feature. Result —
  exit `0`: `FEATURE_DIR` = absolute `…/songhealth/specs/002-cms-content-model`;
  `AVAILABLE_DOCS` = `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`
  (`--require-tasks` satisfied).
- Outline step 2 checklist gate (read-only, markers untouched):

  | Checklist | Total | Checked | Unchecked | Status |
  |-----------|-------|---------|-----------|--------|
  | cms.md | 36 | 36 | 0 | ✓ PASS |
  | requirements.md | 16 | 16 | 0 | ✓ PASS |

  All items checked → overall PASS; the skill auto-proceeds (no stop-and-ask applies).
- Outline step 3 context load: `tasks.md`, `plan.md`, `data-model.md`, `contracts/native-editorial.md`,
  `contracts/public-read.md`, `research.md`, `.specify/memory/constitution.md` (v3.0.0), and
  `quickstart.md` read in full; `spec.md` read in the sections owning T001's inputs (§User Story 3,
  FR-013/023, §Q-matrix, §Out of Scope, §Other inputs before implementation/UAT acceptance).
- Outline step 4 ignore-file verification: `.gitignore` (secrets/`.env*`, `node_modules/`, build
  output, `./media`, `.emdash/migrations.json`, `.tmp/`, logs, IDE/OS artifacts) and
  `.containerignore` already cover the essential patterns for this Node/TypeScript/Astro project;
  no ESLint/Prettier/Terraform/Helm config exists. No ignore file needed a change; none was made.

**Hook disposition** (`.specify/extensions.yml`, parsed without error):

| Hook | Registration | Disposition |
| --- | --- | --- |
| `hooks.before_implement` → git `speckit.git.commit` | `enabled: true`, `optional: true`, `condition: null` | **Optional — not auto-executed.** The baseline tree had no outstanding implementation changes; the only local edits were this task's materialized tooling state. Commit deferred to the explicit bounded delivery commit, per authorization |
| `hooks.after_implement` → git `speckit.git.commit` | `enabled: true`, `optional: true`, `condition: null` | **Optional — not auto-executed.** The single authorized delivery commit is made explicitly instead |
| `auto_execute_hooks` | `true` | Affects only mandatory hooks; none is registered for implement |

Bounded-scope note: the skill's "Done When — all tasks in tasks.md completed" end state is **not**
reached by design: the delegation authorizes T001 only. Execution is constrained to T001; T002–T035
remain unchecked and unexecuted.

## 2. Exact source baseline

| Item | Value (verified this run) |
| --- | --- |
| Repository | `9GotStory/songhealth` |
| Authorized delivery branch | `agent/codex-lead-reviewer/477dbb76ad5b` |
| Expected HEAD (delegation) | `933cc583267895e6d85b27753366e4972af2440c` |
| Local checkout HEAD | `933cc583267895e6d85b27753366e4972af2440c` — **match** (`933cc58` "docs: ratify Constitution v3.0.0 and reconcile review ownership") |
| Remote SHA (independently queried via `git ls-remote origin`) | `933cc583267895e6d85b27753366e4972af2440c` — **match**, no drift |
| Working tree at start | Clean of tracked changes (only the tooling state reconciled in §1 was present; it never enters the delivery) |
| Multica task branch | `agent/claude-developer/2be72b33a731` (tracks the authorized delivery branch; delivery pushes to the authorized branch, no force) |
| `specs/001-platform-foundation/` | Zero diff at baseline — Feature 001 markers and gates unchanged |

Baseline lineage for provenance (recorded in the approved artifacts, not re-derived): Feature 002
`tasks.md` verified generation baseline `7638637d30b6baf224952c9ade44504fe0243d4e`; `plan.md`
verified continuation HEAD `51a949e0d37965d22212e707dbd4557a905d5bd4`; current authorized HEAD
`933cc583…` (later commits: official native-only task generation, T021 dev-only route execution
note, Constitution v3.0.0 ratification).

`PROJECT-STATUS.md` and `PRE-IMPLEMENTATION-GATE.md` do not exist in the repository; consistent
with the delegation, no replacement approval is invented. The bounded T001 authorization in issue
9GOTSTORY-208 and Constitution v3.0.0 govern; earlier phase-run restrictions and
constitution-version references in historical artifacts are provenance only.

## 3. Approved prerequisites and pinned versions — actual state

Pins (unchanged, from `package.json` and the approved plan): Node 24.21.0 / npm 12.2.0,
TypeScript 6.0.3, Astro 7.3.5, `@astrojs/node` 11.1.6, `@astrojs/react` 6.0.5, React/React DOM
19.2.4, EmDash 1.1.0, `pg` 8.23.1, Playwright 1.63.0, PostgreSQL 18.6.

| Readiness item | Current observation (this run) | Standing |
| --- | --- | --- |
| Node/npm on default `PATH` | `v24.11.0` / `11.6.1` — **not** the pins | Gap (same host observation as the Plan/Tasks/Research runs; recorded there too) |
| Pinned toolchain availability | Workspace-scratch toolchain `/home/multica-agent/toolchain/node-v24.21.0-linux-x64` verified this run: `node v24.21.0`, `npm 12.2.0` — the same PATH-scoped approach accepted T015 used | **Available** via workspace scratch; default PATH still unpinned |
| Lockfile vs pins (`package-lock.json`, lockfileVersion 3) | All 11 runtime+dev pins equal the lockfile root entries (astro 7.3.5, emdash 1.1.0, `@astrojs/node` 11.1.6, `@astrojs/react` 6.0.5, react/react-dom 19.2.4, pg 8.23.1, `@playwright/test` 1.63.0, typescript 6.0.3, `@types/react` 19.2.18, `@types/react-dom` 19.2.7) | **Match** |
| EmDash archive integrity | Lockfile `node_modules/emdash` integrity equals the value independently recomputed in `research.md` (`sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==`); engines `node >=22.16` (satisfied by both 24.11.0 and 24.21.0) | **Match** |
| `node_modules` (README §1 `npm ci`) | Absent in this clone — not installed | Not established for this clone |
| `.env` (README §2) | Absent (secrets correctly never committed; `.env.example` present) | Not established for this clone |
| `./media` mount (README §3) | Absent in this clone | Not established for this clone |
| rootless Podman | `podman 5.8.4` rootless available (same version T006/T015 recorded on this host) | **Available** |
| README §8 readiness helper (`node scripts/verify-readiness.mjs`) | Executed under the pinned toolchain: fails at module resolution (`Cannot find package 'pg'`) because `node_modules` is absent — no ready/not-ready result exists for this clone. Recorded as **not established**, not as not-ready PASS/FAIL | Not established (per-clone §1 prerequisite missing) |

No prerequisite was repaired during this task (no `npm ci`, no `.env` creation, no media mount
creation, no container start) — per the delegation that is not T001 work.

## 4. Existing platform instance and canonical sources

- **Development database instance**: container `songhealth-dev-db` exists (exited
  `2026-10-08 08:36 +07` host-local, last state healthy), image
  `docker.io/library/postgres@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf`
  — the exact digest pinned in `scripts/dev-db.sh`; ownership label
  `songhealth.dev-db.managed-by=songhealth/scripts/dev-db.sh`; loopback `127.0.0.1:5432`. Named
  volume `songhealth-dev-db-data` present. This is the preserved Feature 001 T015 validation
  database (per accepted T015 §11: 90 applied migrations, the canonical validation `tagline`
  value/digest, one validation media asset).
- **Credential availability**: the instance's `PGPASSWORD`/`EMDASH_*` secrets existed only in the
  earlier run's git-ignored `.env` and are not available to this clone; the dev-db helper fails
  closed on such a mismatch by design. This run therefore neither started nor mutated the
  container or volume (no reset/recreate behavior exists, and persistent data is preserved).
  Truthful standing: the existing instance is **inspectable but not startable by this clone's
  available inputs**; a later authorized runtime task must either obtain the owning credentials or
  provision its own named instance through the same helper.
- **Canonical sources** (unchanged at baseline): `astro.config.mjs` (single Astro SSR app, Node
  adapter, React integration, native `postgres()` adapter, native `local()` media at `./media`,
  migration modes `runtime: "check"` / `dev: "auto"`); `src/live.config.ts` (single `_emdash`
  live registration); `seed/seed.json` (explicit empty version-1 Feature 001 seed — zero
  collections/relations/taxonomies/menus/redirects/widgetAreas/sections/content); minimal
  `src/pages/index.astro` with the foundation marker.

## 5. Feature 001 evidence cited (accepted historical evidence — not re-run)

| Evidence | Accepted result relevant to T001 | Dependency boundary recorded |
| --- | --- | --- |
| `specs/001-platform-foundation/evidence/T006-emdash-postgresql-compatibility.md` (2026-10-07) | Hard compatibility gate **PASS**: pinned EmDash 1.1.0 + PostgreSQL 18.6 build, migrate (90/90 core migrations), verify and start as one integrated Astro app; identity agreement proven on non-secret components only; deterministic manifest emission; fail-closed input validation | Source/compatibility acceptance only. Its host observation (node 24.11.0/npm 11.6.1 vs pins) was environmental, not a gate subject |
| `specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md` (2026-10-08) | US1 canonical platform validation **PASS** at `62026004…` under the exact pinned toolchain (every command under Node 24.21.0/npm 12.2.0, PATH-scoped): T013 startup gate, sole listener `127.0.0.1:4321`, public SSR marker, native Admin first-admin setup (passkey creation only, no login automation), canonical `tagline` SHA-256 match, native media round-trip, readiness matrix, 48/48 node + 2/2 browser checks. The development-only bootstrap `POST /_emdash/api/setup/dev-bypass?token=1` is runtime-verified: mints a scoped PAT, development builds only (production 403), does not alter canonical tagline/media state | Runtime validation of the foundation at that baseline. It created one disposable first-admin and used one scoped dev-bypass PAT — see §6 role-input standing |
| `specs/001-platform-foundation/evidence/T029-canonical-extension-seams.md` (2026-10-13) | Canonical extension-seams source evidence: all planned downstream capability groups map onto the one canonical foundation; zero Product collections/taxonomies/relations exist at the baseline seed; EmDash capability statements beyond baseline evidence are marked `[C7]` current vendor-documented **candidate seams** requiring confirmation against pinned `emdash` 1.1.0 before implementation relies on them | Explicitly review evidence, **not** architecture authority; no US3/US4 completion or final foundation acceptance claim; T022/T028 runtime evidence PENDING at that baseline |

**Feature 001 gate standing (preserved, not executed)**: T022 production durability **PENDING**;
T028 recovery **PENDING** — both `- [ ]` in `specs/001-platform-foundation/tasks.md` with zero
diff at this baseline. Original joins unchanged: T028 execution requires T022 PASS plus accepted
T023–T027 sources (including runtime-secret recovery); T030 execution requires T028 PASS plus
accepted T029 sources. T029 source review is not runtime or final foundation acceptance. Nothing
in this T001 recording waives, executes, or redefines those gates, and no runtime/final foundation
acceptance is claimed.

## 6. Missing inputs and fixture standing (spec §"Other inputs before implementation/UAT acceptance")

The approved spec's own pre-implementation/UAT input list is assessed one-by-one. Nothing below is
invented; an Administrator credential is not treated as proof of any other role.

| Input (spec owner) | T001 finding | Standing |
| --- | --- | --- |
| Real Organization/shared-object reuse example (FR-010/031; conditional T025) | **No demonstrated shared Organization reuse case exists** in current observations or in any accepted artifact (spec US3, plan §Verification, research §5, data-model §23 all treat it as a pending input; the baseline defines zero Product collections, so no shared-object reuse has ever been exercised) | **PENDING — not demonstrated.** The owner-text default governs; T025's conditional branch is expected N/A unless a genuine case is demonstrated before T025 executes. This recording makes no reuse claim |
| Service/facility inventories | None supplied in the repository, artifacts, or delegation; the baseline contains no Product data | **Missing input — pending** (population/UAT input; never fabricated) |
| Classification terms / official Area code and hierarchy sources (FR-013/018) | No authoritative classification inventory or official Area code source (Province → District → Subdistrict → Village) is supplied anywhere in the approved artifacts; research §4 records that actual code/term inventory and hierarchy correctness remain population/UAT inputs; Area terms require explicit official/stable codes in native term slugs | **Missing input — pending.** No term, code, or hierarchy is invented here |
| Operational role assignments — distinct native Contributor, Author/Editor and Administrator access | Only a single disposable first-admin account and one scoped dev-bypass PAT exist, from accepted T015 (and the PAT is scoped, development-only). **No distinct Contributor/Author/Editor fixture is demonstrated by any accepted evidence**; an Administrator credential does not prove draft-only refusal or own/others boundaries (quickstart Prerequisites; contracts/native-editorial.md). Fixture preparation is T002 scope and was not provisioned | **Missing input — pending** (T002 owns preparation under its own authorization) |
| Site timezone | No site timezone setting inspection was possible this run (no runtime/credentials), and no timezone decision exists in any accepted artifact. FR-023 requires explicit timezone at scheduling and editor UAT confirmation of date-only presentation/timezone expectations | **Missing input — pending.** No timezone decision is invented or inferred from host/container locale displays |
| Feature 001 dependency gate for subsequent Feature 002 work | T022/T028 remain PENDING with unchanged joins (§5) | Preserved dependency, not a T001 blocker |

**Distinguished classes** — current observations: §3–§4 of this file (this run, this host).
Accepted historical evidence: §5 (T006/T015/T029, cited with their own scopes and dates).
Missing inputs: §6 (remain downstream blockers, truthfully recorded). Later runtime blockers: §7.

## 7. Later runtime blockers (not T001 failures)

The following are preconditions for later authorized runtime tasks (from T002 onward), recorded so
they are not mistaken for delivered readiness:

1. Per-clone environment setup per README §1–§4: `npm ci` (lockfile-exact), `.env` from
   `.env.example` with real local values, `./media` mount, and a startable development database —
   this clone has none of them yet (§3–§4).
2. Pinned toolchain is available only via the workspace-scratch PATH-scoped installation; the
   default PATH still carries Node 24.11.0/npm 11.6.1. Every later pinned-runtime command must use
   the pinned toolchain, as T015 did.
3. Distinct native role fixtures and site timezone remain to be established (§6) before
   US6/lifecycle/UAT evidence can be produced.
4. Real classification/Area/service/facility/organization inputs remain population inputs; their
   absence stays pending and never becomes synthetic "official" data.
5. The T015 validation database is preserved but not startable with this clone's available
   credentials (§4); a later task must resolve instance ownership through the dev-db helper
   contract without deleting or reinitializing anything.

## 8. Cleanup and non-claims

- No task-owned service, container, application process, or database was started by this run, so
  none required `npm run dev-db:stop` or container removal; the existing `songhealth-dev-db`
  container and `songhealth-dev-db-data` volume were inspected read-only and left untouched
  (volumes and persistent data preserved). No credential scratch was created — no token, password,
  or secret was requested, minted, printed, or stored anywhere by this run.
- Local tooling state was reconciled before delivery: the materialized `.claude/` skill files
  (untracked, never committed) are removed, and the `.specify/integrations/claude.manifest.json`
  timestamp rewrite was reverted. The gitignored `.specify/feature.json` machine-local pointer now
  names the active feature (its documented purpose).
- **Non-claims**: no runtime, integration, scheduler, browser, readiness, T022, T028, US-story, or
  SC outcome is declared PASS; no runtime/final foundation acceptance; no schema/seed/application
  change; T002–T035 unexecuted; ChatGPT Independent Review and Product Owner acceptance remain
  required and are not assumed by this artifact.

## 9. Scope confirmation

- Changed files vs the authorized baseline `933cc583…`: exactly two — this evidence file
  `specs/002-cms-content-model/evidence/T001-development-inputs.md` (new) and the single T001
  checkbox in `specs/002-cms-content-model/tasks.md` (the only task marker changed; all other
  task/checklist markers preserved as scanned in §1).
- `git diff --check` on the delivery change: clean (no whitespace errors). No secret value,
  credential-bearing URL, token, or key appears in this artifact.
- Feature 001 artifacts: zero changes (§2, §5).
