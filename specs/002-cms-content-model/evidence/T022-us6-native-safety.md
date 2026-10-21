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

---

# Corrective round 1/1 — 2026-10-21 (PO authorization 6319293398)

Start SHA `2c897e38d7a85e17dc0de522a2f4d94b67b28bd4` (Lead BLOCKED verdict
above preserved verbatim). Execution SHA **`0c58a93947561cb4674a850cf8e380082536cf02`**
(two commits: `0c09b5e` — role-ready coverage, three T020 expectation fixes,
T021 null/media/expiry corrections, serving-process admission, fail-closed
disposable inputs, guard/TS fixes; `0c58a93` — restore-pointer assertion
corrected to the verified native invariant). Final SHA adds only this
appendix. All prior failed-run records above are retained untouched.

## Corrections (each verified against pinned source AND the live runtime)

1. **C1 role fixtures** — ONE distinct test-owned native account provisioned
   on the disposable app through the product's own dev-provisioning pattern
   (direct user row insert, exactly what `setup/dev-bypass` does, plus the
   native `handleApiTokenCreate` for the PAT): id `01M5GBMFA11NTR6HTW0CH51325`,
   `t022r2-role-fixture@songhealth.test`, Author (30) — verified live via
   `GET /_emdash/api/auth/me` and the suites' `assertDistinctActors` /
   email-not-dev assertions. PAT scopes mirror the native dev token (scopes
   are route admission only; RBAC decisions stay role-based —
   `authorize.ts requirePerm`). With `SONGHEALTH_ROLE_FIXTURE_ACCESS` set,
   the previously skipped T019 role-phase cases and the T020 second-writer
   case all RAN (no skip remained in either suite).
2. **C2/T020 restore** — controlled probe (two PUT saves → publish → restore)
   proved the pinned runtime RETAINS the restore-created audit revision as
   `draftRevisionId` (pointer == post-restore history head, ≠ the originally
   selected revision id, ≠ null) while the restored data is live. Assertion
   now pins exactly that; the history/authorship/version assertions are
   unchanged.
3. **C2/T020 SEO** — SEO enabled on `news` in the disposable setup only
   (`PUT /_emdash/api/schema/collections/news {hasSeo:true}`, native schema
   API; repo seed unchanged). The successful current-state metadata test
   (taxonomy/SEO/byline) now exercises its positive path, and a NEW
   boundary test asserts the truthful disabled refusal (400
   VALIDATION_ERROR on non-SEO `pages`) with zero partial state.
4. **C2/T020 anonymous reads** — expected code corrected to
   `NOT_AUTHENTICATED` (401) with the verified citation
   `src/astro/middleware/auth.ts:79,702`; the authenticated-insufficient
   family (403 FORBIDDEN) remains covered by the T019 role controls.
5. **C3/T021 optional null** — omitted optional fields admit the native
   public-loader representation (`null` or key-absent, `src/loader.ts:529-564`)
   while any fabricated value still fails.
6. **C3/T021 media availability** — the single-media read (no address field)
   is replaced by the supported LIST surface
   (`GET /_emdash/api/media`, `url: /_emdash/api/media/file/{key}`,
   `src/astro/routes/api/media.ts addUrlToMedia`) bound to the exact owned
   asset id: positive fetch before removal, native removal, same-address
   unavailability after — no invented URL, no foreign host.
7. **C4 preview expiry** — the fixed 1500ms sleep is replaced by a bounded
   clock-boundary wait derived from the returned integer-second `expiresAt`
   (verifier floors seconds and refuses only when `exp < now`,
   `src/preview/tokens.ts:136-142,256-259`); offline guard drives the
   INSTALLED native verifier with dummy material (valid vs expired). The
   first-run anomaly stays recorded above; its timing explanation is now
   structural, not speculative.
8. **C5 coordinator** — (a) disposable inputs are all-or-nothing: a partial
   request HOLDs (exit 3) BEFORE the controller observation, credential
   reads, HTTP and child start — proven by a guard CLI run with a fake
   controller spy that is never invoked; (b) the admitted endpoint is bound
   to the real serving process — listener → pid → astro-dev command line →
   cwd == this checkout → HEAD == declared execution SHA (run log:
   `bound to serving process pid 3616394`), with dead/foreign/wrong-root/
   wrong-HEAD/multi-listener refusals guard-tested; (c) tracked source
   integrity is re-verified AFTER the run (SOURCE FAILURE otherwise);
   (d) spec target validation aligned with the coordinator (99999 and
   malformed ports refused, executed-initializer guard).

## Corrective serial execution (ONE fresh task-owned disposable app)

Pinned toolchain unchanged. Fresh resources: volume `t022r2-songhealth-db-data`,
container `t022r2-songhealth-db` (postgres 18.6, pinned repo digest
`fc973eb9…`, `127.0.0.1:45432`), host astro dev on `127.0.0.1:4323` with the
T021 integration, fresh `./media`, 91 migrations, dev-bypass bootstrap +
fresh admin PAT, role fixture (above), SEO-on-news setup, route token probe
403/200. Execution SHA declared to the coordinator = clean-checkout HEAD.

| Suite | Result | Exit |
| --- | --- | --- |
| T019 `cms-lifecycle.spec.ts` (role fixture supplied) | **13 passed / 0 failed / 0 skipped** (role-phase RBAC, disabled-account, second-writer, due-time scheduling all exercised) | 0 |
| T020 `cms-revisions.spec.ts` (role fixture supplied) | **12 passed / 0 failed / 0 skipped** (second-writer lock case included; new SEO boundary test included) | 0 |
| T021 coordinator, disposable mode | **14 passed / 0 failed / 0 skipped**, coverage journal complete, owned-fixture cleanup verified, serving-process admission + post-run source check green | 0 |

Offline verification at the same SHAs: guard suite
`tests/node/cms-public-reads-target.test.ts` **14/14** (incl. the CLI
partial-input HOLD sentinel with fake-controller spy, serving-process
admission positives/negatives, native-verifier expiry boundary, executed
spec-initializer target validation); TypeScript `node_modules/.bin/tsc
--noEmit` with the same pinned dependencies: **2 diagnostics, both
pre-existing at base `e7e21d6` (`config.test.ts:173`,
`foundation.test.ts:304`), zero introduced** (the six prior guard-file
diagnostics and one interim spec diagnostic are resolved; the Lead's
comparison harness reported the base as 3 — both totals disclosed).

## Truthful disclosures

- **Interrupted predecessor instance**: a first corrective serial attempt
  ran T019 (13/0/0) and T020 (11/1) on an earlier task-owned instance; a
  workspace session boundary removed that instance's container, volume and
  credential scratch before the serial run completed (no operator cleanup,
  no persistent-runtime involvement). Its single failure was the
  restore-pointer assertion, root-caused via the controlled probe above and
  corrected (`0c58a93`). The FINAL serial results in the table come entirely
  from the replacement instance; the interrupted attempt's numbers are
  recorded here, not discarded.
- The role-fixture account/PAT and all synthetic fixtures lived only in the
  disposable database and are removed with it at cleanup; nothing was
  provisioned or written on the persistent runtime (never contacted).
- `emdash-env.d.ts` (untracked astro-sync artifact) is removed before each
  coordinator run so the clean-worktree identity gate reflects the checkout;
  the post-run source check ignores untracked artifacts by design (tracked
  changes or a moved HEAD fail the run).

## Corrective cleanup record

- App terminated by its exact recorded PID (cmdline verified as this task's
  `astro dev` process; compared against the workspace daemon PID first);
  port 4323 confirmed closed.
- `t022r2-songhealth-db` container and `t022r2-songhealth-db-data` volume
  removed after identity/label checks; zero task-owned containers/volumes
  remain.
- All credential scratch (admin PAT, role-fixture PAT, route token, DB
  password, encryption key) and the provisioning scripts removed; run-status
  journals retained per the scope-reduction contract.
- PR #27 verified OPEN/unmerged at `e7e21d6…` throughout; persistent 4322
  never contacted; production untouched.
