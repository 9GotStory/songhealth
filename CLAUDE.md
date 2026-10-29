# CLAUDE.md — Songhealth

The Songhealth District Public Health Office website (เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง): one
server-rendered Astro 7.3.5 application with EmDash 1.1.0 as its integrated CMS, on
PostgreSQL 18.6. This file is the repository's only rules file. Claude Code develops; the
Product Owner decides.

## Authority

Higher sources win; a lower source never silently overrides a higher one.

1. Product Owner decisions.
2. `docs/website-modernization-docs/current/00`–`09`: Product and behavior truth.
   `current/10-system-blueprint.md`: technical architecture.
3. `GLOSSARY.md` and `docs/adr/`: the domain language and recorded decisions (see Domain docs).
4. Specs and tickets in the issue tracker.
5. Code, tests and evidence.

When two sources conflict, stop at that boundary and ask the Product Owner. Git history, removed
code and old branches are records, never requirements: consult them only for provenance or
forensics. `specs/001-platform-foundation/` and `specs/002-cms-content-model/` are the accepted
records of the first two features (written in the retired Spec Kit format). Feature 001's open
runtime gates (T022, T028, then T030–T032) still live in its `tasks.md`.

## Workflow

Work follows Matt Pocock's skills (`mattpocock/skills`) and their main flow:

`/grill-with-docs` → `/prototype` when a question needs running code → `/to-spec` →
`/to-tickets` → `/implement` per ticket (or `/implement-spec`), which drives `/tdd` and closes
with `/code-review` → `/pr` → `/retro`.

- **On-ramps:** `/triage` for incoming issues, `/diagnosing-bugs` for hard bugs, `/wayfinder` for
  an effort too big for one session. `/ask-matt` routes when the fit is unclear.
- **Scope:** an authorized ticket covers its own fixes, tests, refactors and re-reviews. Ask the
  Product Owner before new scope, an architecture change, a destructive or sensitive operation,
  production deployment or runtime provisioning, or a security exception.
- **Review:** report self-review as self-review; a Claude Code session or subagent is never an
  independent reviewer.
- **Acceptance:** evidence-based (passing tests, CI where configured, runtime evidence where the
  change needs it), then the Product Owner's acceptance. A Claude Code PASS is never acceptance.
- **Merges:** GitHub `9GotStory/songhealth` is the source of truth, and `main` is the integration
  branch. When a PR's checks pass and it stays in scope, merge it yourself:
  - run `gh pr merge <n> --merge --match-head-commit <headRefOid>` as a standalone command;
  - then verify the merged tree.

  A feature the Product Owner has not accepted goes into `main` only on their word.

## Checks

The feedback loop for `/implement` and `/tdd` (Node 24.21.0, npm 12.2.0):
- `npm run typecheck`;
- `npm run test:node`;
- `npm run build:check` when a page, the layout or the Astro config changes;
- `npm run format` before each commit, and `npm run lint:shell` when a shell script changes;
- the browser suites against the development runtime. Their commands and credential variables
  are in `README.md`; the public-read suite runs through `tests/browser/run-cms-public-reads.mjs`.

CI (`.github/workflows/checks.yml`) runs the build, typecheck, node tests, `format:check` and
`lint:shell` on every pull request; the browser suites stay local to the development runtime.

## Agent skills

### Issue tracker

GitHub Issues of `9GotStory/songhealth`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Current documentation (Context7)

Model memory goes stale. Verify version-sensitive behavior of frameworks, libraries, SDKs, APIs and
tools before relying on it:

- **Context7 MCP first:** resolve the actual library at the version the manifests pin
  (`package.json`, `package-lock.json`, the digest-pinned images). Where Context7 lacks the
  technology or the fact, use first-party upstream documentation or package metadata.
- **EmDash:** Context7 lacks its 1.1.0 internals. Start from the verified facts in
  `docs/agents/emdash-1.1.0.md`, read the installed `node_modules/emdash/src` for the rest, and add
  each new fact to that file with its source path.
- **Pinned versions:** use the versions the manifests pin; upgrading or substituting a dependency
  needs the Product Owner's approval.
- **Capability versus requirement:** documentation tells what a technology can do; the Product
  Owner and the current documents decide what Songhealth must do. When verified behavior
  contradicts an approved assumption, surface the conflict instead of working around it.
- **Recording:** record a version-specific conclusion that a decision rests on, with its version
  and source, in the spec, ticket or PR.

## Engineering principles

- **Platform-native first.** Use supported Astro and EmDash capabilities and extension points.
  A Songhealth-specific plugin, hook, helper or service needs a demonstrated native gap. It is the
  smallest correct solution, with focused tests. Historical layers justify nothing: Domain,
  Application or Policy layers, custom RBAC, approval engines, and search, media, redirect or
  importer subsystems.
- **Simple and proportionate.** Choose the simplest structure that meets the requirement; size
  verification to the actual risk.
- **Security.** Secrets stay outside the repository and out of output and evidence. Use least
  privilege and server-enforced native controls. Production PostgreSQL is never publicly reachable.
  The CMS and its media hold only public-publishable website content, never confidential health
  records.

## Runtimes

**Development: one runtime.** The UID-1000 rootless Podman + systemd Quadlet runtime at
`http://127.0.0.1:4324`; its contract and commands are in `docs/operations/development-quadlet.md`.
- **One of each:** one application, database, media store and test target. Every runtime test
  targets this origin, and an occupied port is its normal state.
- **Source:** it reaches the runtime only through
  `~/dev/songhealth-quadlet/scripts/dev-runtime-update.sh --sha <commit>`. Read results only
  against the commit `dev-runtime-verify.sh` reports.
- **Credentials:** the 0600 files under `~/.local/state/songhealth-qdev/` (`dev-pat`,
  `role-fixture-pat`, `t021-route-access.json`) feed the tests through environment variables
  (`README.md`). Keep their values out of every output.
- **Logins:** the Admin and the UI tests sign in through `auth/dev-bypass`. `setup/dev-bypass` is
  a one-time installation step. Passkey login stays manual.
- **Pruning:** keep `podman volume prune` / `podman system prune --volumes` away while the runtime
  is stopped: they delete the development data. Keep `podman image prune -a` /
  `podman system prune -a` away entirely: UID 1000 also stores the accepted Feature 001
  production image (`localhost/songhealth-app:0.0.1@sha256:4cfccf41…`), which no rebuild
  reproduces.
- **Cleanup:** a task cleans only what it created (synthetic fixtures, ad-hoc containers,
  credential scratch). The runtime's containers, volumes and data persist across tasks.

**Production.** Rootless Podman + systemd Quadlet as `current/10-system-blueprint.md` defines:
- one Astro + EmDash application container;
- PostgreSQL on a private network;
- persistent database and media volumes that survive container recreation.

Procedures are in `docs/operations/production-foundation.md` and
`docs/operations/runtime-secret-recovery.md`. Docker, Compose and Kubernetes are not baselines.
