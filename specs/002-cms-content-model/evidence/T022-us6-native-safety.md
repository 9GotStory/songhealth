# T022 — US6 native-safety runtime evidence (authorized disposable runtime)

Executed 2026-10-21 under PO authorization `01a15c0f-067c-756c-85a1-0331f764b5de`
+ GitHub [#26 issuecomment-6305625001](https://github.com/9GotStory/songhealth/issues/26#issuecomment-6305625001),
dispatch by codex-lead-reviewer. **This is a truthful execution record, NOT a
PASS claim**: T020 and T021 carry genuine, reproduced failures analyzed below;
their fixes are outside T022's bounded file scope and are reported for review
disposition.

## Identity

- Base: `e7e21d685563aded31ee9908320426dc7b4d9690` (accepted T021 source; PR #27
  verified OPEN/unmerged at that SHA and untouched). Branch
  `t022-disposable-native-safety`.
- Execution SHAs (committed on the branch):
  - `92b4c7e18f9defdf026baf75c89f9d143fcc3204` — T022 adaptation commit;
    **T019 and T020 executed here**.
  - `872747523541e8f091aa17c9f37aa1118ae8d02d` — one-line coordinator fix
    (undefined identifier `PERSISTENT_DEVELOVELOPMENT_ORIGIN` mis-typed in a
    log label inside `originIdentityHolds`; offline guards could not catch it
    because the line only executes on the live-origin path); **T021 executed
    here, twice**. Runtime-affecting diff between the two execution SHAs is
    exactly that identifier; `git show 8727475 --stat` = 1 file, 1 insertion,
    1 deletion.
- Final SHA adds only this evidence file. Total diff vs base: exactly the
  authorized set — `tests/browser/run-cms-public-reads.mjs`,
  `tests/browser/cms-public-reads.spec.ts` (target plumbing only),
  `tests/node/cms-public-reads-target.test.ts`, `README.md`,
  `specs/002-cms-content-model/quickstart.md`,
  `specs/002-cms-content-model/tasks.md` (reconciliation lines), this file.
  No T019/T020 file, helper, SSR fixture/integration, app/production config,
  `src/pages/`, schema, seed or lockfile changed.

## Disposable runtime (task-owned, isolation admitted BEFORE creation)

- Admission checks passed first: no `t022-*` container/volume/name
  pre-existed; ports 4323 and 45432 were free; rootless podman available;
  pinned Node 24.21.0 present at the toolchain path; postgres image repo
  digests include the pinned
  `sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf`.
- Resources created (all task-owned, all removed at cleanup):
  - volume `t022-songhealth-db-data`; container `t022-songhealth-db`
    (id `205bdc24c231…`, `docker.io/library/postgres:18.6`, published
    `127.0.0.1:45432→5432` — loopback only).
  - application: pinned Node + `node_modules/astro/bin/astro.mjs dev` with a
    scratch dev config importing the foundation config plus the T021
    `cmsPublicReadsIntegration` (strictPort), serving
    `http://127.0.0.1:4323/` — never 4322; separate scratch media directory.
  - credentials generated for this runtime only (mode-0600 files under
    gitignored `.tmp/t022/`, values never logged, never committed, removed at
    cleanup): app DB role, dev-bypass bootstrap on THIS disposable app only
    (initial setup, permitted — the shared-runtime prohibition does not apply
    to a fresh disposable instance), route token pair for the fixture route.
- Bring-up sequence (commands, values redacted): `podman volume create` →
  `podman run -d --name t022-songhealth-db -p 127.0.0.1:45432:5432 …
  postgres:18.6` → role/database via `psql` → EmDash migrations via
  `node node_modules/emdash/dist/cli/index.mjs migrate …
  --expected-target-fingerprint <fingerprint>` (91 migrations, check mode) →
  `POST /_emdash/api/setup/dev-bypass?token=1` (disposable app) → route
  probe verified 200 with token / 403 without.
- **The persistent runtime was never touched**: no request was issued to
  `127.0.0.1:4322` at any point; its controller, state, credentials, DB and
  media were not read or modified; the coordinator's disposable mode refuses
  the persistent origin by construction (`disposableOrigin()` rejects it) and
  the spec refuses a `SONGHEALTH_T021_TARGET_ORIGIN` naming 4322.
- Disclosure: running the dev server generates an untracked
  `emdash-env.d.ts` (astro sync artifact); it was removed before each
  coordinator run so the clean-worktree source-identity gate reflected the
  checkout. Gitignored run-status journals under `.tmp/feature002/` are
  preserved untouched (scope-reduction contract).

## Serial execution — T019 → T020 → T021, same disposable app

Toolchain: Node 24.21.0, repo-local Playwright 1.63.0, EmDash 1.1.0,
Astro 7.3.5 (all pinned by the lockfile; no substitution).

### T019 — `tests/browser/cms-lifecycle.spec.ts` (exit 0)

**7 passed / 6 skipped / 0 failed.** The skips are the suite's own recorded
gates; no assertion was weakened, hidden or reclassified.

### T020 — `tests/browser/cms-revisions.spec.ts` (exit 1)

**7 passed / 3 failed / 1 skipped.** All three failures are genuine
expectation-vs-pinned-behavior divergences in the T020 suite (authored before
any real runtime existed); each was reproduced and root-caused in the pinned
EmDash 1.1.0 source:

1. `cms-revisions.spec.ts:1988` — after `restoreRevision`, the test expects
   `draftRevisionId` to be null; pinned `restoreRevision`
   (`node_modules/emdash/src/database/repositories/content.ts`, restore path
   → `mapRow`) deliberately sets `draft_revision_id = revisionId` (the
   restored revision becomes the pending-draft pointer).
2. `cms-revisions.spec.ts:2523` — SEO metadata write expected to succeed;
   pinned runtime returns `400 VALIDATION_ERROR "Collection 'news' does not
   have SEO enabled"` (`api/handlers/content.ts:1202`, gate
   `plugins/context.ts:302-310`): on a freshly bootstrapped app the `news`
   collection has SEO disabled by default, and enabling it is an admin
   configuration action outside this task's scope.
3. `cms-revisions.spec.ts:2691` — unauthenticated revision reads expected
   error code `UNAUTHORIZED`; the pinned auth middleware returns
   `NOT_AUTHENTICATED` (`api/middleware/auth.ts:79,702` — `requirePerm`'s
   `UNAUTHORIZED` at `authorize.ts:41` is the authenticated-but-underprivileged
   path, not the anonymous one).

### T021 — coordinator `run-cms-public-reads.mjs`, disposable mode (exit 1)

Coordinator verified: exact source identity (declared SHA = clean
`git rev-parse HEAD`), origin identity (SSR marker on the admitted origin),
fixture readiness (probe 200/403 with/without the route token), schema/role
identity, 14-test discovery pre-pass, owned-fixture manifest, coverage
journal. First real execution of the T021 fixture route ever — no prior
baseline exists.

Run 1 (execution SHA `8727475`): **11 passed / 3 failed.**
Run 2 (same SHA, same app, diagnostic re-run): **12 passed / 2 failed.**
The coordinator refused false-green on both runs (PRIMARY FAILURE + COVERAGE
FAILURE with per-test terminal states). Stable failures:

- **A — `cms-public-reads.spec.ts:2014`** (both runs): an omitted optional
  field (`summary`) must stay absent; the native public read returns `null`.
  Root cause reproduced directly and in source: the public loader copies every
  non-system column of the collection table into `data` including nulls
  (`node_modules/emdash/src/loader.ts`, row→data loop), while the admin
  repository's `mapRow` skips null values — so admin reads show the field
  absent, public reads show `null`. The fixture serializes `entry.data`
  verbatim; the fabrication happens below it, in pinned native code.
- **B — `cms-public-reads.spec.ts:2507`** (both runs): the media availability
  control requires the single-media metadata read to expose a public address
  (`src`/`url`); pinned `handleMediaGet` returns the raw `MediaItem`, which
  has neither field (`api/handlers/media.ts:104-134`;
  `database/repositories/media.ts:57-76`). Only the LIST/UPLOAD response
  schemas extend `url` (`api/schemas/media.ts:247,282-300`). The positive
  control therefore cannot be established through the single-read path the
  test chose.
- **C — `cms-public-reads.spec.ts:2193`** (run 1 only): an expired 1s preview
  token appeared to serve the draft once. It did **not** reproduce in run 2,
  nor in a controlled direct reproduction (mint with `expiresIn:"1s"` → fresh
  token serves the staged draft with `isPreview:true`; after 1.6s the same
  token serves the published title with `isPreview:false`, matching
  `preview/tokens.ts` `exp < now → expired` and
  `astro/middleware/request-context.ts`'s valid-only preview context).
  Classified as a transient first-execution timing anomaly inside the
  1-second validity window, not an established pinned divergence; recorded
  because it occurred.

## FR / SC trace

- The T022 plumbing preserves every US6/T021 assertion, source/token/role
  check and teardown hook (spec assertions unchanged except URL bases now use
  `ADMITTED_TARGET_ORIGIN`; the persistent-refusal contract is retained and
  guard-tested).
- `tests/node/cms-public-reads-target.test.ts` — 7 offline controls, all
  passing: opt-in only; 4322 refused; malformed origins refused (including
  port `99999`); valid loopback admitted exactly; malformed/undeclared SHA
  refused; foreign SHA refused; spec persistent-contract retention.
- US6 public-read native safety is evidenced by the 23 T021 assertions that
  passed across both runs (published-only visibility, staged-content
  invisibility, preview/wrong-entry/wrong-collection boundaries, reference
  deferral, error-channel truthfulness, no privileged fallback), executed
  against a real pinned runtime for the first time.

## Limitations (truthful)

- **Not a PASS.** T020 (3 failures) and T021 (2 stable failures) require
  assertion/spec corrections in T019/T020/T021-owned files, which T022's
  authorization forbids changing; per the handoff these are reported as
  genuine runtime findings for review disposition, not fixed here.
- Single-role runtime: role-multiplexed cases were skipped by the suites'
  own gates (T019's six skips; T020's one skip) — no second test-owned role
  account was provisioned (out of scope).
- Failure C above is classified on evidence (two non-reproductions) rather
  than a first-principles explanation of the single occurrence.

## Cleanup record (task-owned resources only)

- Disposable app terminated by exact PID (cmdline verified as this task's
  `astro.mjs dev --config .tmp/t022/…` process and compared against the
  workspace daemon PID before termination); port 4323 confirmed closed.
- `podman rm -f t022-songhealth-db` and `podman volume rm
  t022-songhealth-db-data` — zero `t022` containers/volumes remain.
- All credential scratch removed (bootstrap/app passwords, encryption key,
  route token, access JSON); `.tmp/t022/` deleted entirely.
- The persistent shared runtime was not stopped, restarted or otherwise
  touched (nothing to restore — it was never accessed).
