# Songhealth

เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง (Songhealth District Public Health Office website) — clean-rebuild implementation.

**Current implementation**: one server-rendered Astro 7.3.5 application with EmDash 1.1.0 as its
integrated CMS/Admin, backed by PostgreSQL 18.6. Feature 001 `platform-foundation` delivered the
canonical platform; its production deployment sources (rootless Podman + Quadlet) and recovery
sources are committed and independently reviewed, with their runtime verification gates — T022
(production durability) and T028 (recovery drill) — pending, separately authorized tasks (see §11
of [docs/operations/production-foundation.md](docs/operations/production-foundation.md)).
Feature 002 `002-cms-content-model` is the active feature; shared native model tasks T001–T007
are checked (executed) and T008–T035 are pending. A checked marker records task completion
only: bounded Lead review PASS, ChatGPT Independent Review PASS and Product Owner Final
Acceptance are distinct states evidenced per artifact — not established by task markers, an
issue's status, or acceptance of the development runtime. Development, testing and review run
against the single persistent development runtime documented in this README.

## Authority

1. `AGENTS.md` (repository contract and authority order)
2. [.specify/memory/constitution.md](.specify/memory/constitution.md)
3. `docs/website-modernization-docs/current/` — Product/behavior truth (`00`–`09`) and technical
   architecture ([10-system-blueprint.md](docs/website-modernization-docs/current/10-system-blueprint.md))
4. `specs/001-platform-foundation/` — accepted Feature 001 artifacts;
   `specs/002-cms-content-model/` — active Feature 002 artifacts

Do not reconstruct removed architecture from Git history or old branch names (see `AGENTS.md`).

## Development workflow (Multica-first)

Per the Product Owner development decision of 2026-10-13 (Multica issue 9GOTSTORY-202), the
accepted governance reconciliation of 2026-10-14 (recorded in `AGENTS.md` and the Constitution),
and the development-runtime decision of 2026-10-16 (Multica issue 9GOTSTORY-232):

- Multica agents execute bounded authorized tasks; ChatGPT performs Independent Review of their
  artifacts/evidence, and the Product Owner gives final acceptance and implementation
  authorization. Authors do not independently review their own artifacts; Spec Kit
  stages/Human Gate remain.
- Development, testing and pull-request preparation happen in Multica task runs against the
  **single persistent development runtime** described below. There is one development
  environment; no second development stack may be created. The 2026-10-16 decision supersedes
  the earlier native-host development workflow (host `npm ci` / `npm run dev` plus the `dev-db`
  helper) as the canonical development instructions; those committed helpers remain accepted
  implementation files, not the path for the shared runtime (see “Superseded native-host
  workflow”).
- Development testing reuses the existing native development-scoped PAT for
  programmatic Admin/API access; EmDash's dev-only bootstrap was an initial-provisioning
  step, not a recurring test action. Passkey login is never automated.
- Production deployment remains rootless Podman + systemd Quadlet
  ([docs/operations/production-foundation.md](docs/operations/production-foundation.md)). The
  development runtime is Podman Compose-based tooling and must not grow into a parallel
  production-like stack.
- Task runs clean up only task-owned temporary resources; the shared runtime, its volumes and
  its data are never stopped, removed or deleted by cleanup (see “Task-run cleanup”).
- The T022/T028 runtime gates remain pending until separately authorized; nothing in the
  development workflow may claim their runtime acceptance.

## The persistent development runtime

Provisioned once and accepted through ChatGPT Final Independent Review and Product Owner
activation (2026-10-16). It is shared infrastructure: the containers, the stable source and the
dedicated volumes survive completion of Multica issues and agent sessions.

| Resource | Value |
| --- | --- |
| Host | the single Fedora environment, account `multica-agent` (UID 1001), rootless Podman + Podman Compose |
| Application | container `songhealth-dev-app` — Astro 7.3.5 SSR + EmDash 1.1.0 dev server on the pinned tooling image `localhost/songhealth-dev-tooling:node24.21.0-npm12.2.0-r1` (Node 24.21.0 / npm 12.2.0), `restart: unless-stopped` |
| Database | container `songhealth-dev-postgres` — PostgreSQL 18.6 pinned by immutable digest, database `songhealth_dev`, least-privileged application role `songhealth_dev_app` (the separate bootstrap role exists only in the PostgreSQL service environment), no published port, `restart: unless-stopped` |
| Volumes | external named volumes `songhealth-dev-postgres-data-v1` (database) and `songhealth-dev-media-v1` (media, mounted at the application's stable `./media` path) — both persist across issues and sessions |
| Networks | `songhealth-dev-app-net`; internal `songhealth-dev-db-net` |
| Stable source | `/home/multica-agent/projects/songhealth-dev` — a real detached, clean worktree (durable store `/home/multica-agent/projects/.songhealth-dev.git`) pinned to the exact accepted SHA `6ab72780c1a531956acc3c06838c3028e10ad77d`, bind-mounted read-write at `/app` |
| Development origin | `http://127.0.0.1:4322/` — loopback-only publication `127.0.0.1:4322 → 4321`; the server binds `0.0.0.0:4321` only inside its own container network namespace |
| Runtime Controller | `/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh` (wrapper delegating to `runtime.py`) under an account-private installation root |

Inside the container the application runs with `NODE_ENV=development` and
`EMDASH_MIGRATIONS_MODE=check`: the entry guard runs the native `emdash migrate --check` (no
auto-migration) before every dev-server start and refuses any configuration or dependency
mismatch — exact Node/npm versions, database identity, media mount — without printing secrets.
The external `config/astro.dev.config.mjs` imports the unchanged repository `astro.config.mjs`
and adds only `vite.server.strictPort=true`; it does not patch application code.

### Accepted evidence and honest limits

Accepted at activation and recorded in the owning issue (not re-executed by this documentation):
SSR marker, Admin authentication, native build, migration status 90/90 applied, existing
persistence, and controller state `complete=true`. **Not tested — never document as PASS:** live
HMR behavior (excluded from activation), a new full persistence-restart test, and automatic
startup after a Fedora reboot — `restart: unless-stopped` supports daemon/session independence,
but host-reboot autostart is not promised.

## Runtime status and verification — the authorized routine operations

The controller gates every operation against its recorded activation. The currently authorized
routine operations are exactly **`status`** and **`verify`**:

```bash
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh status
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh verify
```

- `status` inspects only: it prints the project, the pinned source SHA, the recorded container
  IDs, and each container's running state as JSON.
- `verify` is non-mutating: it runs the in-container native migration check and readiness
  helper, checks the development database identity (`songhealth_dev` / `songhealth_dev_app`),
  probes the public SSR marker and native Admin availability, and never calls
  setup/dev-bypass, seeds, or writes fixtures. Only its full `PASS` line is success.

### Startup and shutdown — restrictions

- The runtime is designed to stay up: detached containers with `restart: unless-stopped`, whose
  data volumes survive issue completion and agent sessions. There is **no routine shutdown** of
  the shared runtime, and task cleanup must never stop or remove it.
- Controller verbs such as `up`, `stop`, `restart-app`, `test-build`, `test-persistence`,
  `promote`, `bootstrap`, and the one-time recovery/resume actions exist in the controller but
  are **not authorized by the current activation record** — the controller refuses them, and
  they must not be advertised or attempted as available operations. Any lifecycle action needs
  its own explicit review and Product Owner authorization. `test-hmr`, `down`, `prune`,
  `cleanup`, `source-promotion`, production/legacy mutation and s2-assets mutation are
  explicitly excluded.
- The controller CLI has **no general `exec`** operation; do not invent one. Direct ad-hoc
  `podman exec` into the shared containers is not an authorized substitute for controller
  operations.
- If `status` shows a container not running, or `verify` fails or prints `HOLD`: report the
  secret-scrubbed output. Do not restart, re-bootstrap, reset state, or delete anything to
  force a recovery — partial or failed states are preserved deliberately for investigation.

## Environment inputs and secret handling

Application inputs ([.env.example](.env.example) documents the field meanings) are supplied to
the containers from the account-private `runtime.env` (mode `0600`) under the controller's
installation root — never from a committed file, log, or comment. Secret-bearing inputs include
`PGPASSWORD`, `EMDASH_ENCRYPTION_KEY`, `EMDASH_MIGRATION_DATABASE_URL`, and the PostgreSQL
bootstrap password; identity components always describe the same intended database
(`songhealth_dev` at `songhealth-dev-postgres:5432`, role `songhealth_dev_app`). Never print,
copy, or commit these values or the full migration URL; the controller and entry guard compare
non-secret identity components only.

A native development Admin token minted at initial setup is stored mode `0600` in
`dev-access.json` under the installation root (marked “native Dev setup; never print or
commit”). It is account-private access material, not a value to embed in tasks, evidence, or
comments.

## Verify the public and Admin surfaces

- **Public SSR**: `GET http://127.0.0.1:4322/` must serve the stable marker
  `<meta name="songhealth-foundation" content="public-runtime">` (rendered by
  [src/pages/index.astro](src/pages/index.astro)).
- **Native EmDash Admin**: `http://127.0.0.1:4322/_emdash/admin/` serves the native sign-in
  page (the one-time first-admin setup is already complete on the existing database).
  Availability verification accepts the sign-in outcome; it never automates passkey login,
  which remains the production Admin mechanism.
- The committed seed ([seed/seed.json](seed/seed.json)) is bootstrap intent for a fresh
  database; see “The existing development database” for bootstrap-versus-existing-schema
  behavior.

**Development testing access — existing native PAT.** The already-initialized
shared runtime has a native development-scoped personal access token in an
account-private mode-`0600` credential file (`dev-access.json`). Reuse it through
`loadDevAccessToken()` / `createPatActor()` from `tests/browser/cms.helpers.ts`;
never print, commit, or rotate it during ordinary test runs. The upstream
development-only `POST /_emdash/api/setup/dev-bypass?token=1` was used at
**initial provisioning** (verified in
[specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md](specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md)
§4; production builds refuse this route). It can re-apply setup/seed or mint a
replacement credential, so **do not call it again on the initialized shared
runtime** unless separately reviewed and Product Owner-authorized. This
development PAT never replaces native production passkey authentication.

## The existing development database

The shared database already exists with the accepted shared Feature 002 model applied
(migration status 90/90 at activation). Because the runtime starts in migration `check` mode
with no auto-migration:

- `seed/seed.json` is **bootstrap intent only**: editing it does not update an initialized
  database. Inspect/apply approved native definitions through supported EmDash schema
  operations as each task's contract specifies; verify matching existing definitions rather
  than destructively reseeding.
- Schema, dependency, or configuration transitions additionally require the separately
  reviewed maintenance path — they are outside code-only source promotion (see “Source
  advancement boundary”).
- No reset, recreate, or delete behavior exists for the shared database, the media volume, or
  any named volume, and none may be improvised.

## Source advancement boundary

The stable runtime source is pinned to the exact accepted SHA recorded by the controller
(`6ab72780c1a531956acc3c06838c3028e10ad77d`). Task branches are developed in separate Multica
workspace checkouts; the shared runtime never consumes a new candidate implicitly:

- Moving the stable source to a new SHA requires a **separately reviewed and Product
  Owner-authorized promotion** recorded in a matching promotion approval (from/to full SHA plus
  real Independent Review and Product Owner references, descendant ancestry, clean worktree).
  Promotion is not in the current activation's operation list; using it first requires that
  separate authorization.
- The controller's promotion path is code-only: it refuses any change involving `package.json`,
  `package-lock.json`, `astro.config.mjs`, `src/live.config.ts`, or `seed/seed.json` — those
  schema/dependency/configuration transitions need separately reviewed maintenance, not a claim
  that generic promotion suffices. A code-only promotion issues no install, migration, or
  lifecycle command.
- Never bypass the clean/detached/source-SHA protection, overwrite the stable source, edit
  controller approval/state records, or perform automatic checkout/rebase/restart of the stable
  worktree or the runtime.

## Single-runtime design and test integration rule (2026-10-19)

The Product Owner confirmed that the persistent development application is the **only**
functional/integration-test server: one Astro/EmDash instance at
`http://127.0.0.1:4322`, one PostgreSQL database, one media store. Separate task
checkouts remain suitable for code editing and offline/static verification, but
must not start a second server/stack to simulate runtime acceptance.

- Browser/native API tests target the already-running shared origin. An occupied
  port 4322 is normal. Do not kill/restart the shared application, launch another
  Astro server, select an alternate port, or replace the development database/media.
- Astro SSR native-query tests need the **same app's request context**. A development-only
  test integration/route may be used only after its compatibility with pinned
  Astro 7.3.5 / EmDash 1.1.0 is independently verified, its loopback/dev-only
  access and production-build exclusion are proven, and its registration in the
  persistent dev server has a separately accepted source/config maintenance plan.
  The test runner orchestrates requests/owned fixtures; it must not invoke
  programmatic `dev()` or spawn a second application server.
- The stable runtime source remains independently pinned (currently
  `6ab72780c1a531956acc3c06838c3028e10ad77d`). A Git merge or task-worktree
  commit does not advance it. A missing test route, a source SHA mismatch, or
  a required restart means **HOLD**, not an invitation to use a second server.
  Source promotion, runtime configuration changes, and app restart are subject
  to separate reviewed controller-compatible approval; routine verbs remain
  only `status` / `verify`.
- On the initialized shared app, reuse the existing mode-0600 development PAT
  through `loadDevAccessToken()`/`createPatActor()`. The earlier dev-bypass
  bootstrap instructions describe initial provisioning only: do **not** call
  that setup endpoint again merely to run tests or rotate the working token.
  Distinct test-owned role credentials remain a prerequisite where needed.
- Exclude development-only test integrations/routes from normal and production
  builds; do not persist a test page in production `src/pages/`, modify
  canonical production integration/configuration, or expose privileged
  private API data through a public test route. Unverified integration
  feasibility or missing approval must be reported before implementation.

Feature 002 T021/T022/T033 instructions must follow this rule; see
`specs/002-cms-content-model/tasks.md` and its quickstart.

## Browser tests and the development origin

Browser suites run under the pinned `@playwright/test` 1.63.0
([playwright.config.ts](playwright.config.ts)), whose `baseURL` **default remains
`http://localhost:4321`**. Against the persistent runtime, always set the explicit override:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 npm run test:browser
```

Executing test suites or builds that touch the shared runtime is bounded task work under its
own authorization — the current routine activation covers `status`/`verify` only. There is no
`npm test` script at this baseline; focused Node suites (`node --test "tests/node/*.test.ts"`)
run under a task's own authorized pinned toolchain (the pinned host toolchain
`/home/multica-agent/toolchain/node-v24.21.0-linux-x64` remains available for task workspaces).
Use synthetic public-publishable test data, mint access through the dev bypass, and clean up
only owned fixtures and scratch.

## Superseded native-host workflow

The earlier canonical workflow — host `npm ci`, sourcing `.env` into the shell, the
`dev-db:start`/`dev-db:status`/`dev-db:stop` helper ([scripts/dev-db.sh](scripts/dev-db.sh)),
host `npm run dev` on port 4321, the one-time `npm run verify:startup` gate, and host-side
`node scripts/verify-readiness.mjs` — is superseded as development instructions by the
persistent runtime above. Its committed helper scripts, tests, and evidence remain accepted
implementation and history, preserved unchanged: do not run them against, or in place of, the
shared runtime, and do not use them to create a second development stack. For the shared
runtime, startup acceptance is the accepted activation evidence, and recurring readiness is the
controller's `verify` operation.

## Task-run cleanup

Every Multica task run cleans up only **task-owned temporary resources** before it ends:

- remove ad-hoc containers the task itself created, owned synthetic fixtures and test media,
  and private credential/token scratch files;
- **never** stop or remove the shared `songhealth-dev-app` / `songhealth-dev-postgres`
  containers, and never delete or prune their named volumes
  (`songhealth-dev-postgres-data-v1`, `songhealth-dev-media-v1`), persistent data, media,
  accepted sources, or evidence.

Cleanup is part of task completion, never deferred to a later task. A task run that cannot
clean up a resource it owns reports that fact in its result instead of leaving it silently. An
occupied origin or a running shared runtime is a precondition to coordinate with — never
permission to terminate another process.

## Common failures and recovery

| Symptom | Cause and response |
| --- | --- |
| `status` reports a container not running, or `verify` exits nonzero / prints `HOLD` | Report the exact secret-scrubbed output in the task/issue. Do not restart, reset, re-bootstrap, or delete anything: partial or failed states are preserved deliberately, and recovery actions require their own authorization. |
| `runtime.sh` refuses an operation (approval-binding refusal) | The operation is not in the current activation list. Only `status` and `verify` are routine; anything else needs separate review and Product Owner authorization. |
| Something else already listens on `127.0.0.1:4322` | The runtime publishes loopback-only and fails closed on collision; it never picks another port or kills an occupant. Resolve the collision at its cause under proper authorization. |
| Browser tests target `localhost:4321` or get connection-refused | The Playwright default is 4321; set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322` for the shared runtime. |
| Temptation to `podman exec` into the shared containers or edit `/home/multica-agent/projects/songhealth-dev` directly | Don't. The controller CLI has no `exec` operation, and the stable source is guarded (clean, detached, exact SHA); the controller refuses drifted state. Source changes go through separately authorized promotion/maintenance. |
| A task needs a schema/dependency/configuration change consumed by the runtime | It cannot arrive via code-only promotion (the controller refuses changes to `package.json`, `package-lock.json`, `astro.config.mjs`, `src/live.config.ts`, `seed/seed.json`). Plan and request separately reviewed maintenance first. |

Production prerequisites, deployment and recovery live in
[docs/operations/production-foundation.md](docs/operations/production-foundation.md) and are
unchanged by the development-runtime decision; T022/T028 remain PENDING.
