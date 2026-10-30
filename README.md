# Songhealth

เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง (Songhealth District Public Health Office website) — clean-rebuild implementation.

**Current implementation**: one server-rendered Astro 7.3.5 application with EmDash 1.1.0 as its
integrated CMS/Admin, backed by PostgreSQL 18.6.
- **Feature 001 `platform-foundation`:** delivered the canonical platform. Its production deployment
  sources (rootless Podman + Quadlet) and recovery sources are committed and reviewed. The runtime
  gates T022 (production durability) and T028 (recovery drill) remain open (see §11 of
  [docs/operations/production-foundation.md](docs/operations/production-foundation.md)).
- **Feature 002 `cms-content-model`:** complete. The Product Owner gave it Final Acceptance on
  2026-10-29, and it was merged into `main`. For T032, the Product Owner waived the staff session
  and accepted the automated Admin journeys as the SC-007 evidence.

A checked task marker in `specs/` records completion only; acceptance is a separate state,
evidenced per artifact. Runtime testing targets the single development runtime documented below,
at `http://127.0.0.1:4324`.

## Rules and authority

[`CLAUDE.md`](CLAUDE.md) is the repository's only rules file: authority order, workflow, merges,
Context7 documentation checks, engineering principles and runtime rules. The authority order is:
1. Product Owner decisions.
2. `docs/website-modernization-docs/current/`: Product and behavior truth (`00`–`09`) and technical
   architecture ([10-system-blueprint.md](docs/website-modernization-docs/current/10-system-blueprint.md)).
3. `GLOSSARY.md` and `docs/adr/`: the domain language and decisions.
4. Specs and tickets in GitHub Issues.

`specs/001-platform-foundation/` and `specs/002-cms-content-model/` are the accepted records of
Features 001 and 002. They are history: Git history and removed code never define requirements.

## Development workflow (Claude Code + Matt Pocock's skills)

On 2026-10-29 the Product Owner retired Spec Kit, the Constitution and `AGENTS.md`. Development
uses Claude Code with Matt Pocock's skills ([mattpocock/skills](https://github.com/mattpocock/skills))
and their workflow:

```
/grill-with-docs → (/prototype) → /to-spec → /to-tickets → /implement (/tdd + /code-review) → /pr → /retro
```

- **Where things live:**
  - specs and tickets in GitHub Issues of `9GotStory/songhealth`, with the five default triage
    labels;
  - the domain language in `GLOSSARY.md` and decisions in `docs/adr/`;
  - the skills' configuration in `docs/agents/`.
- **Who does what:** Claude Code implements, tests, self-reviews and merges in-scope PRs. The
  Product Owner decides scope, architecture, destructive operations, production deployment and
  feature acceptance.
- **Commit checks:** `git config core.hooksPath .githooks`, once per clone, makes every commit
  pass `.githooks/pre-commit` (formatting, Knip, typecheck, the invisible-character scan, and
  ShellCheck when a shell script is staged).
- **Workspace and runtime:** source development happens in `/home/thanakorn/dev/songhealth`
  (user `thanakorn`, UID 1000). The single development runtime is the one below
  (`http://127.0.0.1:4324`); no other development runtime, database or media store is created.
- **Production:** rootless Podman + systemd Quadlet
  ([docs/operations/production-foundation.md](docs/operations/production-foundation.md)). Feature
  001's runtime gates T022 and T028 are still open and need a production-capable host.

## The development runtime

The single development runtime (Product Owner decision 2026-10-28; Feature 002 T036). Full
contract, procedures and failure handling:
[docs/operations/development-quadlet.md](docs/operations/development-quadlet.md).

| Resource | Value |
| --- | --- |
| Owner | local user `thanakorn` (UID 1000): rootless Podman + systemd **user** Quadlet units from `deploy/dev-quadlet/` |
| Origin | `http://127.0.0.1:4324/` — loopback only |
| Application | `songhealth-dev-app.service` → container `songhealth-qdev-app`: Astro 7.3.5 + EmDash 1.1.0 dev server on `node:26.13.0-bookworm-slim` pinned by digest (the production build base); npm 12.2.1 dependencies |
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
scripts/dev-runtime-model-update.sh             # give the database the seed's content model (backs up first)
scripts/dev-runtime-verify.sh                   # read-only checks; ends with VERIFY: PASS|FAIL
scripts/dev-runtime-admin-activity.sh           # read-only: Admin pages opened in the last 10 minutes
scripts/dev-runtime-backup.sh <dir>             # database dump + media archive
scripts/dev-runtime-uninstall.sh [--purge]      # remove the units (keep data) | delete everything
```

Tests target the runtime with its own credentials, which are never printed or committed.
`scripts/dev-runtime-env.sh` runs a command with the origin and the credential file paths
(`docs/operations/development-quadlet.md`, Browser and API tests):

```bash
# ordinary suites (the role fixture enables the T019/T020 role cases; the dev Admin session
# enables the Admin UI journeys of cms-lifecycle-ui and cms-editor; one worker at a time)
scripts/dev-runtime-env.sh npm run test:browser -- tests/browser/<suite>.spec.ts --workers=1
# T021 public reads, only through the coordinator, from a checkout at the promoted commit
scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs
```

Public-page suites (Feature 003) take `test` from `tests/browser/public.helpers.ts`. It guards
every page against third-party requests, and it provides the axe (WCAG 2.2 AA and page
structure), focus and reflow checks and the desktop and 320 px viewports.

Pull-request screenshots of public pages come from
`node scripts/capture-screenshots.mjs <out-dir> <path>...`. The script's header shows how to put
them on an image-only `evidence/` branch, so no image enters the code tree. A page that needs
content to show takes it from `scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>`. The runner makes the module's synthetic content, captures the paths
the module returns, and removes everything it made. `scripts/screenshot-fixtures/news.ts` is the
example.

Latency evidence for a list that reads more than one page (ADR 0002, ADR 0004) comes from
`scripts/dev-runtime-env.sh node scripts/measure-latency.ts <fixtures-module> [runs]`. It times
the module's paths before and after making its synthetic content, then removes the content, and
prints a table for the pull request. `scripts/latency-fixtures/dated-lists.ts` is the example.

Admin login uses EmDash's development-only bypass (browsers accept passkeys only on a domain
origin, not `127.0.0.1`):
`http://127.0.0.1:4324/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`. The services start
with the user session; linger is not enabled, so the runtime stops when the last session ends.

### Runtime rules

- One runtime, one database, one media store, one test target: `http://127.0.0.1:4324`
  (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324`). Never start a second Astro/EmDash server or
  stack for verification (`CLAUDE.md`, Runtimes).
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
`scripts/dev-runtime-residue.sh` checks the runtime's share of it: synthetic entries, media,
terms, bylines and redirects (`docs/operations/development-quadlet.md`, Daily use).

Production prerequisites, deployment and recovery live in
[docs/operations/production-foundation.md](docs/operations/production-foundation.md) and are
unchanged by the development-runtime decision; T022/T028 remain PENDING.
