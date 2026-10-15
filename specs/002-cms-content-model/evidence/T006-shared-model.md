# T006 — Shared Native Model Verification Evidence (Feature 002)

**Feature**: `002-cms-content-model`
**Task**: T006 (Phase 2: Foundational — Shared Feature Prerequisites) — "Inspect/apply the shared
native definitions, run T003 in the pinned development environment and record required title/file
versus optional/type behavior, active native schema and unchanged foundation boundaries in
`specs/002-cms-content-model/evidence/T006-shared-model.md`; preserve `src/live.config.ts`'s single
`_emdash` registration and existing database/media configuration, with no plugin registration or
production-readiness duplication."
**Recording date**: 2026-10-15 (UTC).
**Executor**: Claude Code (claude-developer, agent id `6b276025-bd09-475f-99d4-695a4aa8200b`,
Multica DEV Executor), delegated by codex-lead-reviewer (handoff comment
`01a13e32-ac0b-74c4-94e3-28f0ebae535d`) under the Product Owner routing correction
`01a13e30-e7ee-7203-83a4-b38cac5e623d` (Multica issue 9GOTSTORY-224).
**Scope**: T006 only. Initial delivery: runtime verification executed, 9 passed / 1 failed —
the failing T003 expectation was root-caused (§6) and surfaced unedited for review (marker left
`[ ]`). **Corrective round 1 (§9), authorized by Product Owner approval
`01a13ed2-7a42-7aa7-b8a9-546c558ef316`, reconciled the three conflicting expectations, added
focused normalization regressions, and reran the complete revised suite: 13 passed / 0 failed /
0 skipped — T006 is complete.** The historical 9-pass/1-fail record is retained below unchanged.
No T007+ work, no schema/seed/source/dependency change, no Feature 001 change, no merge or
deployment.

## 1. Official `$speckit.implement` workflow execution

Installed official instructions located, materialized and executed; no handwritten workflow
substituted; no skill bundle committed (repository policy `AGENTS.md` §Spec Kit Usage).

| Item | Recorded value |
| --- | --- |
| Resolver | Installed Specify CLI `specify 1.1.0`; `specify integration upgrade claude` materialized the 20 managed per-checkout skill files (absent from a fresh clone) |
| Instruction path | `.claude/skills/speckit-implement/SKILL.md` |
| Integrity | SHA-256 `7186d59488f89dcf23abd17baed118b05c242d4f62f1de3f9f44625a2b1728f0` — byte-identical to the value pinned by committed `.specify/integrations/claude.manifest.json` (integration version 1.1.0); local read/execute only, untracked, never committed; the manifest `installed_at` timestamp rewrite was reverted before delivery |
| Prerequisites (Outline 1) | Ambient `SPECIFY_FEATURE_DIRECTORY` again carried the stale `specs/001-application-foundation` default T001 recorded; resolved with the script's documented priority-1 explicit override: `SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` → exit `0`; `FEATURE_DIR` = absolute `…/songhealth/specs/002-cms-content-model`; `AVAILABLE_DOCS` = research.md, data-model.md, contracts/, quickstart.md, tasks.md (`--require-tasks` satisfied) |
| Checklists (Outline 2, read-only gate) | cms.md 36/36 checked; requirements.md 16/16 checked → overall **PASS**, auto-proceed; markers untouched |
| Context load (Outline 3) | tasks.md (T006 + shared constraints + dependency graph), plan.md, data-model.md, contracts/native-editorial.md, contracts/public-read.md, research.md, constitution v3.0.0, quickstart.md, AGENTS.md, CLAUDE.md, spec.md (Q1 matrix/FR-002/FR-026/edge cases), T001/T004/T005 evidence, T003 `tests/browser/cms-document.spec.ts`, T002 `tests/browser/cms.helpers.ts` |
| Ignore files (Outline 4) | `.gitignore` (secrets/`.env*`, `node_modules/`, `.tmp/`, `/media/`, build output, `.emdash/migrations.json`) and `.containerignore` already cover the essentials; **no change made**. Generated per-clone artifacts (`emdash-env.d.ts`, `.claude/`) remain untracked and out of the delivery |
| Hooks | `.specify/extensions.yml` parsed without error; `hooks.before_implement`/`hooks.after_implement` → single git `speckit.git.commit` each — `enabled: true`, `optional: true`, `condition: null` → **optional, not auto-executed**; the single authorized delivery commit is explicit |
| Task execution | Only T006 executed; T007–T035 untouched. The workflow's "all tasks completed" end state is intentionally **not** reached (bounded T006-only authorization, one unresolved review decision) |

## 2. Baseline and branch provenance

| Item | Value (verified this run) |
| --- | --- |
| Repository | `9GotStory/songhealth` |
| Authorized baseline (delegation) | `63d05913296a8ed5205ab3597a9c547bca59b388` |
| Remote HEAD of `agent/codex-lead-reviewer/477dbb76ad5b` (`git fetch` + `rev-parse`) | `63d05913296a8ed5205ab3597a9c547bca59b388` — **match**, no drift |
| Candidate branch | `agent/claude-developer/7f29d94c7ff0` reset to the exact baseline SHA before work; working tree clean at start (no conflicting developer work) |
| Task markers at baseline | T001–T005 `[x]`, T006 `[ ]` — as delegated; Feature 001 T022/T028 remain `[ ]` PENDING with zero diff |

## 3. Per-clone prerequisites resolved (README single native workflow)

All commands under the pinned PATH-scoped toolchain
`/home/multica-agent/toolchain/node-v24.21.0-linux-x64` (Node **v24.21.0** / npm **12.2.0**,
the same approach T015/T001 established; the default PATH still carries 24.11.0/11.6.1 and was
not used). Runtime pins verified from the installed tree: **astro 7.3.5, emdash 1.1.0,
@playwright/test 1.63.0, @astrojs/node 11.1.6, @astrojs/react 6.0.5, react 19.2.4, pg 8.23.1,
typescript 6.0.3** — all equal to `package.json`/`package-lock.json`; no dependency change.

| Readiness item (README §) | Action this run | Result |
| --- | --- | --- |
| §1 `npm ci` | Executed under the pinned toolchain | **OK** (lockfile-exact; esbuild 0.28.2 binary available via `@esbuild/linux-x64` despite npm's blocked-postinstall warning) |
| §2 `.env` | Created (mode 0600, git-ignored) — see credential recovery below | **OK** |
| §3 `./media` | `mkdir -p media` | **OK** |
| §4 dev-db | `set -a; . ./.env; set +a; npm run dev-db:start` | **OK** — see below |
| §6 `npm run dev` | Started; Astro 7.3.5 daemonized the dev server | **OK** at `http://127.0.0.1:4322` (see port note) |
| §7 Playwright driver | `npx playwright install chromium` (one-time, pinned local CLI) | **OK** (chromium-1243) |
| §7 public SSR verification | `GET /` on the dev origin | **OK** — `<meta name="songhealth-foundation" content="public-runtime">` served |

**Database credential recovery (no invented credentials, no reset, no ownership bypass).**
T001 §4 records the preserved `songhealth-dev-db` container / `songhealth-dev-db-data` volume
with credentials unavailable to a fresh clone; no earlier run's `.env` exists anywhere on this
host (verified by filesystem search). Recovery followed the README §Common-failures documented
path for exactly this state — *"inspect it with `podman container inspect songhealth-dev-db` and
align your `PG*` values with the resource you intend to use"*: the container's own preserved
initialization configuration (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from the
container config; the helper's `verify_existing_container` compares exactly these) was read
in-shell by the rootless owner and written into `.env` (mode 0600) **without ever being printed,
logged or committed**. `npm run dev-db:start` then passed the helper's complete fail-closed
verification — ownership label `songhealth.dev-db.managed-by=songhealth/scripts/dev-db.sh`, pinned
PostgreSQL 18.6 digest `fc973eb…`, named volume at `/var/lib/postgresql`, single loopback publish
`127.0.0.1:5432`, and an exact match of all three initialization values — and **started the
existing container with its data volume preserved** (no create, reset, recreate or reinitialize
path exists or was used). `EMDASH_SITE_URL`/`HOST`/`PORT` use the documented development values.
`EMDASH_ENCRYPTION_KEY` was generated with the platform's own supported pure no-DB command
`emdash secrets generate`: the pinned source (`src/config/secrets.ts`) defines it as the key for
encrypting **plugin secrets at rest** and its own error message directs generating a new key
*"only if no stored plugin setting depends on the lost key"* — the preserved T015 database has
zero plugins (canonical foundation; T015/T001 evidence), so no stored setting depends on the lost
key. No other secret was minted or invented.

**Development origin/port note (truthful configuration).** The documented development port 4321
is occupied on this host by `systemd-songhealth-app` — the Feature 001 Quadlet production-parity
app container (Up 42 h, publishing `127.0.0.1:4321`), **not a resource owned by this run and
therefore untouched** (no stop, no kill, no port takeover). Astro 7.3.5's daemonized dev server
consequently bound the next free port: `http://127.0.0.1:4322` (pid recorded by `astro dev`;
managed via `astro dev status/stop`). All T006 verification was pinned to this run-owned dev
origin via `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322`, which the T003 suite's
`configuredDevelopmentOrigin()` and the T002 helper request boundary honor; the production-parity
container on 4321 was never exercised (dev-bypass against a production build would 403; no
request was sent to it beyond the single marker read that first identified the occupant, before
this note was established, and that origin was then excluded from all further work).

## 4. Active native schema (inspect/apply on the authorized development instance)

Bootstrap used the platform's documented development-only native access (README §7):
`POST /_emdash/api/setup/dev-bypass?token=1` against `http://127.0.0.1:4322` — this both mints
the scoped PAT and **applies the committed seed with `onConflict: "skip"`** (non-destructive:
existing definitions are matched and skipped, nothing is reseeded, overwritten or deleted). The
PAT travelled only into mode-0600 scratch under `.tmp/feature002/` and in-memory shell state;
never printed in full, never committed (bootstrap rotates/mints per call — an earlier scratch
token presented `INVALID_TOKEN` on later use; the run simply re-bootstrapped, and the final
scratch file is removed in §8). Dev mode used the canonical `astro.config.mjs` migration mode
`dev: "auto"` against the preserved database (T015's 90 applied core migrations intact; no
manual migration was run). Post-application native API reads (`schema:read`):

| Native definition | Observed active schema | Approved definition match |
| --- | --- | --- |
| Collection `documents` | Exactly one Product collection: label/labelSingular เอกสาร; `supports` exactly `drafts, revisions, preview, scheduling`; `titleField: "title"`, `dateField: "document_at"`; `source: "seed"`; `hasSeo: false` | ✓ T005 |
| Field `title` | `string`, `required: true`, label ชื่อเรื่อง | ✓ S |
| Field `summary` | `text`, optional, label สรุป | ✓ O |
| Field `file` | `file`, `required: true`, label ไฟล์เอกสาร | ✓ S |
| Field `document_at` | `datetime`, optional, label วันที่เอกสาร | ✓ O |
| Field `fiscal_year` | `integer`, optional, label ปีงบประมาณ | ✓ O |
| Field `owner_source` | `text`, optional, label เจ้าของ/แหล่งที่มา | ✓ O |
| Field `domain_status` | `select`, optional, `validation.options` exactly `current, superseded, expired`, label สถานะเอกสาร | ✓ O |
| Field `successor` | `reference`, optional, label เอกสารฉบับถัดไป; active `validation` `{relation: "document_successor", relationSide: "parent", targetCollection: "documents"}` (target derived by the platform, exactly the derive-not-trust shape T005 recorded) | ✓ O, explicitly bound |
| Relation `document_successor` | Exactly **one** relation exists: self-relation `documents`→`documents`; `maxChildrenPerParent: 1`, `maxParentsPerChild: null` (unlimited); parentLabel เอกสารฉบับก่อนหน้า / childLabel เอกสารฉบับถัดไป; `boundFields: [{documents.successor, side: parent}]`; `linkCount: 0` | ✓ one successor per predecessor, many predecessors per successor; **no duplicate automatically named `documents_successor` edge set** |
| Taxonomies | Product: `topic` (หัวข้อ, attached `["documents"]`), `audience` (กลุ่มเป้าหมาย, unattached), `area` (พื้นที่, `hierarchical: true`, unattached), `document_type` (ประเภทเอกสาร, attached `["documents"]`) | ✓ T004/T005 |
| Platform built-ins | `taxdef_category` (Categories) and `taxdef_tag` (Tags) — reserved-id platform taxonomy defaults, English labels, zero collections attached; pre-existing platform baseline, not Feature 002 definitions, not Product taxonomies, unchanged by this run | noted, no action |

Foundation boundaries preserved with **zero diff at delivery** (§7): `astro.config.mjs` (single
SSR app, Node adapter, React integration, native `postgres()` adapter, local `./media` media,
migration modes unchanged), `src/live.config.ts` (the single `_emdash` live registration),
`seed/seed.json`, `tests/browser/`, `package.json`/`package-lock.json`, `playwright.config.ts`,
all Feature 001 artifacts. No plugin, no internal-table writes, no migration subsystem, no
dependency upgrade.

## 5. T003 runtime execution — exact commands and results

Command (serial, one worker, pinned to the run-owned dev origin):

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 \
  npm run test:browser -- tests/browser/cms-document.spec.ts --workers=1
```

Toolchain: Node v24.21.0 / npm 12.2.0 (PATH-scoped pinned), Playwright 1.63.0
(chromium-1243), against the pinned EmDash 1.1.0 dev app (`astro dev`, migration mode auto) on
PostgreSQL 18.6 (`songhealth-dev-db`, preserved volume). **Exit code 1. Counts: 9 passed,
1 failed, 0 skipped, 0 flaky (10 tests, 3.7s).** Per-test outcome:

| # | Test | Result |
| --- | --- | --- |
| 1 | documents schema precondition: required title/file configuration is active | ✓ |
| 2 | valid control: minimal Document saves with only required fields and permitted optional omissions | ✓ |
| 3 | valid control: optional supplied values save (summary, offset-aware datetime, integer year, owner, select) | ✓ |
| 4 | valid control: an update may omit unchanged required fields | ✓ |
| 5 | create refuses missing, null and empty required title | ✓ |
| 6 | create refuses missing, null and malformed required file objects | **✘ FAILED** (§6) |
| 7 | update refuses invalid clearing of required title and file | ✓ |
| 8 | create refuses supplied invalid types, select values and dates | ✓ |
| 9 | update refuses a representative supplied invalid select value | ✓ |
| 10 | unauthenticated Save is an authorization refusal, distinct from native validation | ✓ |

Observed behavior record (per the task's required categories):

- **Required-title refusals** — create with title omitted / `null` / `""` each refused with the
  native `400 VALIDATION_ERROR` envelope (not 401/403); update-side empty/null title clears also
  refused (test 7). ✓
- **Valid uploaded-media selection** — `{id: <uploaded synthetic media id>}` saves (201), read-back
  returns the same media id as the file selection; no immutability/availability claim made. ✓
- **Optional omissions** — a Document with only `title`+`file` saves; summary, document_at,
  fiscal_year, owner_source, domain_status, classifications and the successor relation are all
  permitted omissions at native save. ✓
- **Optional supplied values** — summary text, offset-aware datetime (`2026-10-15T10:00:00+07:00`),
  integer fiscal year, owner text and the `current` select value all save alongside required
  fields. ✓
- **Supplied invalid type/select/date refusals** — create and update refuse non-string title,
  string and non-integer fiscal_year, out-of-options `domain_status`, non-datetime and
  offset-less `document_at` (400 `VALIDATION_ERROR`, never 401/403). ✓
- **Required-file refusals** — `file` omitted and `file: null` refused at create; invalid clears
  to `null`/`{}` on update refused; `file: {}` refused (`file.id: expected string, received
  undefined`). The remaining malformed-file sub-cases are the §6 conflict. Part ✗
- **Authorization distinction** — an unauthenticated valid POST to the same endpoint is refused
  by the authorization layer (401/403 family, native code ≠ `VALIDATION_ERROR`), proving the
  families stay distinguishable in the live app. ✓

## 6. Unresolved finding — accepted T003 expectation conflicts with pinned native file-value normalization

Test 6 asserts six create-time file shapes are all refused. Actual pinned EmDash 1.1.0 behavior
(verified by direct native-API probes this run, and by the pinned archive source):

| Sub-case (T003 expectation: refuse) | Actual outcome | Stored value |
| --- | --- | --- |
| `file` omitted | REFUSED (required) — as expected | — |
| `file: null` | REFUSED — as expected | — |
| `file: ""` | **ACCEPTED (201)** | `{"provider":"external","id":"","src":""}` |
| `file: "not-an-object"` | **ACCEPTED (201)** | `{"provider":"external","id":"","src":"not-an-object"}` |
| `file: {}` | REFUSED (`file.id` expected string) — as expected | — |
| `file: {"id": 123}` | **ACCEPTED (201)** | `{"id":"","provider":"local"}` |

The test's failure lands on the first divergent sub-case (`file: ""`); the assertion throws
there, so sub-cases 4 and 6 never execute in-run — the probes above establish their outcomes.

**Root cause (pinned archive, integrity-verified `emdash@1.1.0`).** T003's verified-API notes read
`src/schema/zod-generator.ts` (file → `z.object({ id: z.string(), … })`) and concluded a bare
string is a type refusal. The archive additionally contains a **documented media value
normalization layer** that runs at content create/update time before that schema sees the value —
`node_modules/emdash/dist/normalize-BuWa0lvd.mjs` (`src/media/normalize.ts`):

> "Normalizes media field values into a consistent shape regardless of creation path (seed
> scripts, media picker, WP import, **URL input**). Called at content create/update time… —
> Bare URL string → `{ provider: "external", id: "", src: url }` — Bare internal media URL →
> resolved via local provider's `get()` — Bare local media ID → resolved via local provider's
> `get()` — Object with `provider` + `id` → enriched…"

So a **bare string is a first-class native file-value shape** (the URL-input path), not a supplied
value error: `"not-an-object"` normalizes to an external file object whose string `id` `""` then
satisfies the zod object schema. The non-string-id object is likewise coerced (dropped to `id: ""`)
rather than refused. Nothing about the applied schema differs from the approved definitions
(§4 — `file` is `type: file`, `required: true`); the divergence is platform-intrinsic to the
pinned release.

**Assessment.** This is a verified-upstream-behavior conflict with an approved assumption
(AGENTS.md §External Documentation: "If verified upstream behavior conflicts with an approved
assumption, do not silently work around it. Surface the conflict for review at the current
gate"). Three of the six sub-cases assert refusals the pinned platform does not make; the
data-model's "malformed supplied values retain native refusal" holds for omitted/null/`{}` but a
bare string is not malformed in this platform — it is the documented URL-input alternative shape.
The native required-file guarantee the Q1 matrix actually needs ("Document file required at save")
is enforced for missing/null values; the URL-input path yields a present-but-empty external
reference, which the platform accepts. No custom hook may re-tighten this (rejected native-only
decision), so the disposition is a review decision, not an implementation gap.

**Disposition (why the marker stays unchecked).** Per the delegation — "run existing T003", "never
weaken tests to obtain green results", "Preserve accepted T001–T005 artifacts except changes
explicitly required by T006" — this run did **not** modify the accepted test, did not change
schema/configuration to force refusal (removing the media provider to skip normalization would
violate the preserved database/media configuration and would be manufacturing a green result),
and does not claim runtime PASS. Requested decision for Lead review / Product Owner: authorize a
bounded corrective round to T003's three sub-case expectations (aligning them to the documented
normalization behavior above, with the refusal family kept for omitted/null/`{}`), or record an
alternative disposition. Until then T006's shared-model verification join cannot truthfully claim
completion, so the T006 marker remains `[ ]`.

## 7. Scope confirmation

- Changed files vs the exact baseline `63d0591…`: exactly one — this evidence file (new).
  The T006 checkbox is intentionally **not** ticked (§6). `git diff --check` on the delivery
  change: clean. No secret value, token, password or credential-bearing URL appears in this
  artifact (probe outputs above are the stored content values only).
- Untracked per-clone artifacts excluded from the delivery: `.claude/` (workflow materialization,
  never committed per repository policy), `emdash-env.d.ts` (dev-server-generated), `.env`
  (recovered configuration, mode 0600, ignored), `.tmp/` scratch (ignored), `media/` (ignored),
  `node_modules/` (ignored).
- Zero diff at delivery in: `astro.config.mjs`, `src/live.config.ts` (single `_emdash`
  registration preserved), `seed/seed.json`, `tests/browser/`, `package.json`,
  `package-lock.json`, `playwright.config.ts`, `README.md`, `AGENTS.md`, `CLAUDE.md`,
  `.specify/` (manifest timestamp reverted), and all of `specs/001-platform-foundation/`
  (T022/T028 PENDING, joins unchanged).
- No plugin registration, no internal-table writes, no migration subsystem, no dependency
  upgrade, no production-readiness duplication, no Feature 001 change, no T007+ work, no merge,
  no deployment, no task-marker closure.

## 8. Cleanup and non-claims

- **Owned synthetic fixtures**: every T003 test's failure-safe teardown reported
  `owned-fixture cleanup … complete` (afterAll safety net included). The four T006 probe entries
  (`t006-probe-a/b/d/e`) were resolved through the native path (trash `200` → permanent `200`);
  a follow-up listing finds **zero probe residue**. No pre-existing content, media or the T015
  validation media/tagline state was touched; no named volume was deleted (the helper has no
  delete path).
- **Owned processes/resources**: the run-owned dev server was stopped (`astro dev stop`, verified
  down) and the run-started database container stopped with `npm run dev-db:stop` (container and
  `songhealth-dev-db-data` volume preserved). The production-parity `systemd-songhealth-app` /
  `systemd-songhealth-db` containers and all other host containers were never started, stopped
  or mutated by this run.
- **Credential scratch**: `.tmp/feature002/` token files and the captured test log were removed
  after this evidence was written; `.env` (mode 0600, git-ignored) is retained as this clone's
  configuration for later authorized tasks — it contains only the recovered matching inputs of
  the preserved resource and the locally generated key, never committed.
- **Non-claims**: no runtime PASS of test 6; no SC/US completion; no T007+ execution; no
  Lead/Independent/Owner acceptance; Feature 001 T022/T028 remain PENDING with unchanged joins;
  D-ITA/D-REF remain deferred. Dev-bypass is development-only and proves nothing about production
  Passkey flows. A single Administrator actor was used (T001 §6 distinct-role input remains
  pending); no role-boundary coverage is claimed.

## 9. Corrective round 1 — Product-Owner-authorized reconciliation (2026-10-15, UTC)

**Authorization.** Human Gate `01a13ecf-ec08-7d27-8b6d-c0d292c1e943` (seven bounded items) made
effective by explicit Product Owner approval `01a13ed2-7a42-7aa7-b8a9-546c558ef316` ("APPROVED —
Human Gate GRANTED… I explicitly approve accepting the verified EmDash 1.1.0 native file
normalization behavior as a documented V1 limitation"), following Lead review
`01a13ec9-e2a7-7662-a18f-f0013c404419` (verdict BLOCKED pending exactly this decision; the Lead
independently reproduced the normalization/schema behavior under the integrity-verified package).
Corrective delegation: `01a13ed3-8c1e-72ff-a9c5-367e3c91afd9` (round 1 of maximum 3). Executor:
claude-developer. The §5–§6 original run result (**9 passed / 1 failed / 0 skipped, exit 1**) is
retained above unchanged as the historical record; this section records the authorized correction
and the fresh complete run — it does not overwrite that history.

**Correction baseline.** `90217c5c173d33a64fcbcbf32efa341990358040` (the prior T006 candidate;
sole parent the original baseline `63d05913296a8ed5205ab3597a9c547bca59b388`; both remote SHAs
verified unchanged before work). Workflow gates re-executed for this round: prerequisites exit 0
with the explicit `SPECIFY_FEATURE_DIRECTORY=specs/002-cms-content-model` override; checklists
cms 36/36 + requirements 16/16 PASS (read-only); `before_implement`/`after_implement` optional →
not auto-executed, explicit delivery commit instead; no materialized workflow bundle or
tooling-generated file committed.

**Exact authorized changes (this round).**

1. `tests/browser/cms-document.spec.ts` — the former "create refuses missing, null and malformed
   required file objects" test now asserts the three genuine native refusals only (file omitted;
   `null`; `{}` — refused `400 VALIDATION_ERROR`), and the three Product-Owner-accepted inputs
   moved into **three new focused regression tests**, one per input, each asserting the exact
   stored normalized representation through native read-back of the returned id:
   `file: ""` → `{provider: "external", id: "", src: ""}`;
   `file: "not-an-object"` → `{provider: "external", id: "", src: "not-an-object"}`;
   `file: {id: 123}` → `{id: "", provider: "local"}`. Each regression explicitly asserts
   `id === ""` and states in its assertion messages that an empty id/src selects **no real
   available file** (documents the normalization boundary; no availability/retention claim).
   No case was silently deleted, skipped or reduced to success-only; required-title refusals,
   invalid clears, invalid optional type/select/date refusals, valid uploaded-media/optional-
   omission/update controls and the authorization-distinction control are byte-for-byte
   unchanged; the failure-safe owned-fixture teardown (afterEach + afterAll) is unchanged; the
   verified-API header notes were corrected to record normalization-before-validation.
2. `specs/002-cms-content-model/spec.md` — conflicting provisions only: FR-002 and FR-026 now
   carry the normalization exception by reference, and a labeled "Native file-value
   normalization — accepted V1 limitation" note after the Q1 matrix distinguishes raw native
   input normalization from subsequent schema validation, records the three accepted shapes and
   the retained refusals, cites the approval, and preserves the native-only architecture and the
   no-availability-guarantee boundary.
3. `specs/002-cms-content-model/data-model.md` — Common Native Contract: same bounded
   normalization distinction appended to the "malformed supplied values retain native refusal"
   sentence.
4. `specs/002-cms-content-model/contracts/native-editorial.md` — Native Request Shapes: same
   bounded distinction appended after the file-value/required-clear sentences.
5. `specs/002-cms-content-model/tasks.md` — the single T006 marker `[ ]` → `[x]` (below, after
   the fresh complete passing run).
6. This evidence section.

**Fresh runtime verification (complete revised suite).** Environment re-established through the
same README workflow: `npm run dev-db:start` re-passed the helper's fail-closed
ownership/configuration verification on the preserved `songhealth-dev-db` (volume/data intact;
`onConflict: skip` seed path re-run via dev-bypass, matching the already-applied schema — nothing
reseeded); the run-owned dev server bound `http://127.0.0.1:4322` again (port 4321 remains
occupied by the production-parity `systemd-songhealth-app` container, untouched); active schema
re-verified before testing (`documents` present, `title` string+required, `file` file+required).
Toolchain: Node v24.21.0 / npm 12.2.0, Playwright 1.63.0, emdash 1.1.0, PostgreSQL 18.6.

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 \
  npm run test:browser -- tests/browser/cms-document.spec.ts --workers=1
```

**Result: exit 0 — 13 passed, 0 failed, 0 skipped (3.8s).** Per-test: schema precondition ✓;
valid minimal save with uploaded-media `id` + optional omissions ✓; optional supplied values ✓;
update omitting unchanged required fields ✓; required-title refusals ✓; **missing/null/
empty-object file refusals ✓**; **normalization regression: `""` → external/empty ✓**;
**normalization regression: `"not-an-object"` → external/src preserved ✓**; **normalization
regression: `{id:123}` → local/empty id ✓**; invalid-clear refusals ✓; invalid
type/select/date refusals ✓; update invalid select ✓; unauthenticated authorization refusal ✓.
Failure-safe owned-fixture cleanup reported complete after **all 13** tests (0 unresolved).

**T006 completion.** All required checks pass under the approved corrected expectations; the T006
marker is ticked in `tasks.md` (the only task-list change). Remaining documented limitations (not
blockers): the three accepted normalized file shapes are V1 platform limitations per the approval
(empty id/src ≠ real file selection, no availability/retention guarantee; D-REF deferred);
distinct-role fixtures remain a pending T001 §6 input; the URL-input normalization means a bare
string never produces a supplied-value refusal — editorially, staff file selection uses the
native picker/upload path.

**Round-1 cleanup (with accurate recovery attribution).** All owned synthetic fixtures were
resolved by the suite's own failure-safe teardown (13/13 complete, zero unresolved — no probe
fixtures were created this round). A provider quota failure (`agent_error.provider_quota_limit`,
429) interrupted this run after the marker edit but **before** the run-owned services were
stopped; per the Lead's recovery inspection note (`01a13edd-08f8-7c66-bd4b-4622e0369d62`), the
Lead — after confirming project/process identity and the helper's ownership label — performed the
recovery cleanup with the project-scoped `astro dev stop` and the ownership-checking
`npm run dev-db:stop`, and verified: no dev server/listener remains on 4322, the database
container is exited, and the `songhealth-dev-db-data` volume is present (production-parity and
unrelated services untouched). This resumed delivery re-verified that state (no dev server
running; container stopped with volume preserved) and removed the run's credential scratch
(dev-bypass token, mode 0600) and test log; the port-4321 occupant and all other host resources
were never touched by this task.
