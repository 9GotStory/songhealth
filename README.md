# Songhealth

เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง (Songhealth District Public Health Office website) — clean-rebuild implementation.

**Current implementation**: one server-rendered Astro 7.3.5 application with EmDash 1.1.0 as its
integrated CMS/Admin, backed by PostgreSQL 18.6. Feature 001 `platform-foundation` delivered the
canonical platform; its production deployment sources (rootless Podman + Quadlet) and recovery
sources are committed and independently reviewed, with their runtime verification gates — T022
(production durability) and T028 (recovery drill) — pending, separately authorized tasks (see §11
of [docs/operations/production-foundation.md](docs/operations/production-foundation.md)).
Feature 002 `002-cms-content-model` is the active feature. Its tasks T001–T031 and T033–T037
are checked (executed). T032 stays open until its bounded staff session supplies SC-007. A
checked marker records task completion
only: Product Owner Final Acceptance — and, for work reviewed before Constitution 5.0.0, the
recorded Lead and Independent Review outcomes — are distinct states evidenced per artifact, not
established by task markers, an issue's status, or acceptance of the development runtime. Source
development, testing, self-review and pull-request preparation follow the Claude Code workflow
below; authorized runtime testing targets the single development runtime documented in this
README — the UID-1000 rootless Quadlet runtime at `http://127.0.0.1:4324`.

## Authority

1. `AGENTS.md` (repository contract and authority order)
2. [.specify/memory/constitution.md](.specify/memory/constitution.md)
3. `docs/website-modernization-docs/current/` — Product/behavior truth (`00`–`09`) and technical
   architecture ([10-system-blueprint.md](docs/website-modernization-docs/current/10-system-blueprint.md))
4. `specs/001-platform-foundation/` — accepted Feature 001 artifacts;
   `specs/002-cms-content-model/` — active Feature 002 artifacts

Do not reconstruct removed architecture from Git history or old branch names (see `AGENTS.md`).

## Development workflow (Claude Code)

The Product Owner ratified the local CLI governance transition on 2026-10-25 (official
decision: https://github.com/9GotStory/songhealth/pull/38#issuecomment-6395631601), replacing
the Multica-first execution/review assignments of 2026-10-13/2026-10-14 (recorded in
`AGENTS.md` and the Constitution as accepted history) while preserving the 2026-10-16
development-runtime decision (Multica issue 9GOTSTORY-232). The governance reform recorded as
Constitution 5.0.0 (ratified 2026-10-28) then removed Codex and ChatGPT from that workflow
entirely; until Feature 002 is complete, development uses Claude Code with Spec Kit and GitHub only:
**Product Owner → Claude Code + Spec Kit → automated tests / GitHub CI → Product Owner
acceptance** (details in `AGENTS.md` and the Constitution):

- Source development takes place in the local workspace `/home/thanakorn/dev/songhealth` (local
  user `thanakorn`, UID 1000). Claude Code is the sole AI development tool: it implements, tests,
  self-reviews and corrects within an authorized scope, and its self-review is never presented as
  independent review; Codex, ChatGPT and other external AI tools are not used. Completion is
  evidence-based (approved requirements, correct implementation, passing applicable tests,
  risk-proportionate security verification, CI where configured, required runtime evidence), and
  the Product Owner gives final acceptance and implementation authorization. Spec Kit stages and
  the Human Gate remain. One authorized implementation task is in effect at a time. GitHub
  (`9GotStory/songhealth`) is the source of truth for source, issues, pull requests and CI.
- The **single development runtime** is the UID-1000 rootless Podman + systemd Quadlet runtime
  described below (`http://127.0.0.1:4324`), owned end-to-end by the local workspace user
  (Product Owner decision 2026-10-28; Feature 002 T036). It replaced the earlier UID-1001
  (`multica-agent`) runtime, which was deleted on 2026-10-29 (T037; see "Deleted UID-1001
  runtimes" below); it is no longer a development or test target,
  and no data, media or credential is taken from it.
- No other development runtime, PostgreSQL database or media store is created. The earlier
  native-host workflow (host `npm ci` / `npm run dev` plus the `dev-db` helper) stays superseded
  (see “Superseded native-host workflow”).
- Programmatic Admin/API tests use this runtime's own development PAT, minted once by the native
  `setup/dev-bypass` during installation and kept at `~/.local/state/songhealth-qdev/dev-pat`
  (mode 0600; never printed, committed or copied into evidence). Passkey login is never automated.
- Production deployment remains rootless Podman + systemd Quadlet
  ([docs/operations/production-foundation.md](docs/operations/production-foundation.md)). The
  development runtime is a deliberately simpler development profile of that pattern and must not
  grow into a parallel production stack.
- Task runs clean up only task-owned temporary resources; the runtime, its volumes and its data
  are never stopped, removed or deleted by cleanup (see “Task-run cleanup”).
- The T022/T028 runtime gates remain pending until separately authorized; nothing in the
  development workflow may claim their runtime acceptance.

## The development runtime

The single development runtime (Product Owner decision 2026-10-28; Feature 002 T036). Full
contract, procedures and failure handling:
[docs/operations/development-quadlet.md](docs/operations/development-quadlet.md).

| Resource | Value |
| --- | --- |
| Owner | local user `thanakorn` (UID 1000): rootless Podman + systemd **user** Quadlet units from `deploy/dev-quadlet/` |
| Origin | `http://127.0.0.1:4324/` — loopback only |
| Application | `songhealth-dev-app.service` → container `songhealth-qdev-app`: Astro 7.3.5 + EmDash 1.1.0 dev server on `node:24.21.0-bookworm-slim` pinned by digest (the production build base); npm 12.2.0 dependencies |
| Database | `songhealth-dev-db.service` → container `songhealth-qdev-db`: PostgreSQL 18.6 pinned by digest, database `songhealth_qdev`, least-privilege app role `songhealth_qdev_app`, no host port |
| Volumes | `songhealth-qdev-db-data`, `songhealth-qdev-media` (media at the application's stable `./media` path) |
| Source | `~/dev/songhealth-quadlet` — a full clone at a detached, promoted commit, bind-mounted at `/src` |
| Dev configuration | `deploy/dev-quadlet/astro.dev.config.mjs`: the canonical configuration plus the development-only T021 public-read fixture route (token-guarded, `astro dev` only; T037) |
| Secrets | podman secrets `songhealth-qdev-*`; development PAT `~/.local/state/songhealth-qdev/dev-pat`, role fixture PAT `~/.local/state/songhealth-qdev/role-fixture-pat` (a second native account, Author, for the T019/T020 role cases) and T021 route token copy `~/.local/state/songhealth-qdev/t021-route-access.json` (all 0600) |

```bash
# First install: from any checkout that contains T036. Afterwards: from the runtime's own
# checkout ~/dev/songhealth-quadlet, whose scripts always belong to the promoted commit.
scripts/dev-runtime-install.sh --sha <commit>   # install (converges; safe to re-run)
scripts/dev-runtime-update.sh --sha <commit>    # promote another commit (backs up first)
scripts/dev-runtime-verify.sh                   # read-only checks; ends with VERIFY: PASS|FAIL
scripts/dev-runtime-backup.sh <dir>             # database dump + media archive
scripts/dev-runtime-uninstall.sh [--purge]      # remove the units (keep data) | delete everything
```

Tests target the runtime with its own credentials, which are never printed or committed:

```bash
# ordinary suites (the role fixture enables the T019/T020 role cases; the dev Admin session
# enables the Admin UI journeys of cms-lifecycle-ui and cms-editor; one worker at a time)
S=~/.local/state/songhealth-qdev
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324 SONGHEALTH_DEV_ACCESS=$S/dev-pat \
SONGHEALTH_ROLE_FIXTURE_ACCESS=$S/role-fixture-pat SONGHEALTH_ADMIN_SESSION=dev-bypass \
  npm run test:browser -- tests/browser/<suite>.spec.ts --workers=1
# T021 public reads, only through the coordinator, from a checkout at the promoted commit
SONGHEALTH_DEV_ACCESS=~/.local/state/songhealth-qdev/dev-pat \
SONGHEALTH_T021_ROUTE_ACCESS=~/.local/state/songhealth-qdev/t021-route-access.json \
  node tests/browser/run-cms-public-reads.mjs
```

Admin login uses EmDash's development-only bypass (browsers accept passkeys only on a domain
origin, not `127.0.0.1`):
`http://127.0.0.1:4324/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`. The services start
with the user session; linger is not enabled, so the runtime stops when the last session ends.

### Runtime rules

- One runtime, one database, one media store, one test target: `http://127.0.0.1:4324`
  (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324`). Never start a second Astro/EmDash server or
  stack for verification (mandatory gate in `AGENTS.md`).
- Interpret runtime results only against the commit `dev-runtime-verify.sh` reports. Source
  changes reach the runtime only through `dev-runtime-update.sh`: the runtime checkout is never
  edited in place.
- `setup/dev-bypass` (initial setup) runs once, during installation; it is not a test setup step.
- Never run `podman volume prune` / `podman system prune --volumes` while the runtime is stopped:
  that deletes the development database and media.
- Never run `podman image prune -a` / `podman system prune -a` as UID 1000. This account's
  storage also holds the accepted Feature 001 production image
  `localhost/songhealth-app:0.0.1@sha256:4cfccf41…`, and a rebuild cannot reproduce it.

### Deleted UID-1001 runtimes

On 2026-10-29 the Product Owner deleted every Songhealth runtime of account `multica-agent`
(UID 1001), without a backup (Feature 002 T037; evidence in
`specs/002-cms-content-model/evidence/T037-single-runtime-completion.md`). That covered:

- the controller-managed development runtime at `http://127.0.0.1:4322`, with its Runtime
  Controller and stable source;
- the production-foundation Quadlet stack at `127.0.0.1:4321`;
- the superseded `dev-db` container.

The accepted Feature 001 production image was first moved, digest-preserved, to UID 1000. Other
workloads of that account were not touched. The runtimes' operating procedures remain in Git
history.

## Superseded native-host workflow

The earlier canonical workflow — host `npm ci`, sourcing `.env` into the shell, the
`dev-db:start`/`dev-db:status`/`dev-db:stop` helper ([scripts/dev-db.sh](scripts/dev-db.sh)),
host `npm run dev` on port 4321, the one-time `npm run verify:startup` gate, and host-side
`node scripts/verify-readiness.mjs` — is superseded as development instructions by the
development runtime above. Its committed helper scripts, tests, and evidence remain accepted
implementation and history, preserved unchanged: do not use them to create a second development
stack.

## Task-run cleanup

Every task run cleans up only **task-owned temporary resources** before it ends:

- remove ad-hoc containers the task itself created, owned synthetic fixtures and test media,
  and private credential/token scratch files;
- **never** stop or remove the runtime's `songhealth-qdev-app` / `songhealth-qdev-db` containers
  or delete its volumes (`songhealth-qdev-db-data`, `songhealth-qdev-media`), persistent data,
  media, accepted sources, or evidence.

Cleanup is part of task completion, never deferred to a later task. A task run that cannot
clean up a resource it owns reports that fact in its result instead of leaving it silently.

Production prerequisites, deployment and recovery live in
[docs/operations/production-foundation.md](docs/operations/production-foundation.md) and are
unchanged by the development-runtime decision; T022/T028 remain PENDING.
