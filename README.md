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
- **Feature 003 `public-website`:** complete: the public website and the Homepage (spec #51,
  tickets #52–#67). The Product Owner gave it Final Acceptance on 2026-11-01 (#51 comment
  6559139711), and it was merged into `main`. The development runtime keeps the demo dataset until
  the Product Owner asks for its removal.
- **Feature 004 `ita`:** complete: ITA, with MOIT entries and their Evidence in the CMS, the
  `/ita` pages, search and the staff checklist (spec #121, tickets #122–#128, ADR 0006). The
  Product Owner gave it Final Acceptance on 2026-11-03 (#121 comment 6606337870), and it was merged
  into `main`. The fiscal years before 2570 and 2570's 6-month Round arrive with the WordPress
  migration (Feature 005).
- **Feature 006 `frontend-design`:** complete: the public design settled on real content, with Thai
  titles that keep compound words whole, the Featured picture whole, a shorter phone Homepage, Post
  pages in two columns and an Activity's photos as folding thumbnails (spec #144, tickets
  #145–#151, ADR 0007). `docs/design/DESIGN.md` v1.0 records it with the code. The Product Owner
  gave it Final Acceptance on 2026-11-05 (#144 comment 6660349967), and it was merged into `main`.
- **Feature 005 `wordpress-migration`:** complete: the script that plans, imports and verifies the
  Legacy site's content from a reviewed Classification list, redirects from the old addresses,
  filters that offer only terms with items, and the cutover runbook (spec #174, tickets #175–#185,
  ADR 0008). The Product Owner gave it Final Acceptance on 2026-11-09 (#174 comment 6737259420), and
  it was merged into `main`. The production import, the cutover and WordPress's retirement stay NOT
  AUTHORIZED (`09` §18).
- **Feature 007 `frontend-refinement`:** complete: detail refinements of the accepted design: a
  compact header with an icon-only menu below 1024 px, a one-line current breadcrumb on phones,
  cards that open from their whole surface, a compact Homepage Quick Access, ร้องเรียน kept whole
  in Thai titles, a two-row phone pager, an outlined clear action in the filter forms, and News and
  Health Content posts without an empty trailing row (spec #190, tickets #191–#198).
  `docs/design/DESIGN.md` v1.1 records it with the code. The Product Owner gave it Final Acceptance
  on 2026-11-10 (#190 comment 6759434955), and it was merged into `main`.

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
  pass `.githooks/pre-commit` (the pinned Node, formatting, Knip, typecheck, the
  invisible-character scan, and ShellCheck when a shell script is staged) and
  `.githooks/commit-msg` (a `type(scope): ` subject). `scripts/check-node.sh` also stops
  `scripts/dev-runtime-env.sh`, and with it every runtime test, on another Node.
- **Workspace and runtime:** source development happens in `/home/thanakorn/dev/songhealth`
  (user `thanakorn`, UID 1000). The single development runtime is the one below
  (`http://127.0.0.1:4324`); no other development runtime, database or media store is created.
- **Sessions side by side:** a session working beside another keeps to its own worktree. Make it
  with `git worktree add .tmp/worktrees/<ticket> <branch>`: its dependencies take about 900 MB,
  so it stays on disk under the ignored `.tmp`, out of the RAM-backed `/tmp` (#194 retro). Install
  its own dependencies as [Prototype workspace](#prototype-workspace) shows, run
  `node scripts/with-build-inputs.mjs astro sync` there once, for typecheck, and
  `git worktree remove` it when the ticket's retro is done. They still share the one runtime:
  `--replace` in [the promotion steps](docs/operations/development-quadlet.md#promote-a-new-commit).
- **Production:** rootless Podman + systemd Quadlet
  ([docs/operations/production-foundation.md](docs/operations/production-foundation.md)). Feature
  001's runtime gates T022 and T028 are still open and need a production-capable host.

### Prototype workspace

Put new throwaway prototype builders and their working output under the ignored
`.tmp/prototypes/<ticket>/` directory. Run them from the repository root, for example
`node .tmp/prototypes/191/header.mjs`, so their paths to the repository's source are explicit.
`scripts/` holds maintained commands and is a Knip entry; a local untracked builder there joins
its dependency scan too (#191 retro).

Keep existing user prototypes in place. An isolated worktree lets implementation checks inspect
only the ticket's source when unrelated working files interfere. Start it at the intended baseline,
verify its branch/HEAD, and run checks and formatting there. Bootstrap a fresh worktree with its
own dependencies, using the Node/npm versions in `package.json` (#193 retro, Product Owner
comment 6722771184). Run this from that worktree; a root `node_modules` symlink can appear as an
untracked file despite `node_modules/` in `.gitignore`, which makes source scans fail with
`EISDIR`. The first check stops before installation touches such a link:

```bash
(
  set -e
  scripts/check-node.sh
  test ! -L node_modules
  npm ci
  test -d node_modules
  test -z "$(git ls-files --others --exclude-standard -- node_modules)"
  npm run build:check
  npm run typecheck
)
```

Success means an ignored dependency directory, followed by a passing build and typecheck. This
follows CI's build-before-typecheck order (`.github/workflows/checks.yml`) to generate Astro types.
Use `npm run format` to fix formatting: it includes the comment wrapper that Prettier alone omits.
Record the prototype's question, verdict and source context with its ticket; publishing the
prototype follows that ticket's scope.

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
scripts/dev-runtime-verify.sh                   # read-only checks, the content model included; ends with VERIFY: PASS|FAIL
scripts/dev-runtime-admin-activity.sh           # read-only: Admin pages opened in the last 10 minutes
scripts/dev-runtime-backup.sh <dir>             # database dump + media archive
scripts/dev-runtime-uninstall.sh [--purge]      # remove the units (keep data) | delete everything
```

Tests target the runtime with its own credentials, which are never printed or committed.
`scripts/dev-runtime-env.sh` runs a command with the origin and the credential file paths
(`docs/operations/development-quadlet.md`, Browser and API tests):

```bash
# ordinary suites (the role fixture enables the T019/T020 role cases; the dev Admin session
# enables the Admin UI journeys of cms-lifecycle-ui, cms-editor and cms-menus-ui); without a suite,
# every suite. playwright.config.ts runs them one worker at a time
scripts/dev-runtime-env.sh npm run test:browser -- tests/browser/<suite>.spec.ts
# every suite that reads a Homepage section, before the review of a change to the Homepage
scripts/dev-runtime-env.sh npm run test:browser:homepage
# T021 public reads, only through the coordinator, from a checkout at the promoted commit
scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs
```

Public-page suites (Feature 003) take `test` from `tests/browser/public.helpers.ts`. It guards
every page against third-party requests, and it provides the axe (WCAG 2.2 AA and page
structure, with every icon hidden from assistive technology), focus and reflow checks and the
desktop and 320 px viewports. A suite declares those checks with `testAccessibilityAndReflow` and
adds a case only for each further width its ticket names, as
`tests/browser/public-filter-form.spec.ts` does at 375 px. `tokenColor` gives a colour token as
the browser computes it, for a check of an element's colour (#197 retro).

A suite that needs its own published content starts from
`tests/browser/public-pagination.spec.ts`. Its `beforeAll` uses `devAdminActor`,
`createOwnedTerm`, `createSyntheticDraft` and `publishEntryAt` from
`tests/browser/cms.helpers.ts`, and its `afterAll` calls `removeSuiteFixtures` (#196 retro).

For JavaScript-disabled journeys, set `test.use({ javaScriptEnabled: false })` in the public
suite. The harness records this native option for its fixture context, including any additional
pages in that context. `expectNoAxeViolations` reports the JavaScript prerequisite immediately
for that context; run axe in JavaScript-enabled cases and verify no-script navigation separately.
This uses Playwright 1.63.0's native option fixture (`node_modules/playwright/lib/index.js`,
`javaScriptEnabled`), including `test.use` overrides.

### First browser interaction check

For a public interaction change, make the first tracer reach its accessible name, axe, keyboard
focus and real navigation before extending the change across components/contexts (#193 retro,
Product Owner comment 6722771184). Use the existing public HTTP seam and choose a case that reaches
what changed. `tests/browser/public-cards.spec.ts` is the worked example for whole-surface pointer
activation, title-named links, modified-click tabs and hidden controls across breakpoints.

The card example below selects one 320 px News interaction case and its native new-tab case.
The existing cases exercise the actual runtime; a passing click alone does not establish their
accessibility. Keep JavaScript-enabled axe and JavaScript-disabled navigation in separate cases.
Run serially through the normal environment wrapper, which honors another session's open
[development window](docs/operations/development-quadlet.md#a-window):

```bash
(
  set -e
  mkdir -p .tmp
  interaction_dir=$(mktemp -d .tmp/interaction-first.XXXXXX)
  printf 'Interaction evidence: %s\n' "$interaction_dir"
  git rev-parse HEAD > "$interaction_dir/test-client-sha.txt"
  git diff HEAD -- src/components tests/browser/public-cards.spec.ts > "$interaction_dir/test-client.patch"
  ~/dev/songhealth-quadlet/scripts/dev-runtime-verify.sh > "$interaction_dir/runtime-verify.log"
  interaction_status=0
  scripts/dev-runtime-env.sh node node_modules/@playwright/test/cli.js test \
    tests/browser/public-cards.spec.ts \
    --grep 'News whole-card links.*320px|native modified click' --grep-invert 'Health News' \
    --workers=1 --output="$interaction_dir/artifacts" \
    > "$interaction_dir/test.log" 2>&1 || interaction_status=$?
  printf '%s\n' "$interaction_status" > "$interaction_dir/exit-status.txt"
  tail -n 10 "$interaction_dir/test.log"
  exit "$interaction_status"
)
```

Keep the client SHA/patch and runtime verify result distinct. Adding `--list` to the selected
Playwright command previews the two cases without running fixtures (Playwright 1.63.0,
`node_modules/playwright/lib/program.js`). After the first interaction passes, expand coverage to
all affected kinds/contexts and run the required final suites. This selection changes no test
assertion, timeout, retry, fixture restoration or cleanup behavior.

### Homepage diagnostics

For a timeout in the existing all-sections Homepage case, use this selected diagnostic run
(#192 retro, Product Owner comment 6719407526). Its named steps distinguish native fixture setup,
page rendering, axe, keyboard focus and reflow. The test keeps its existing assertions, timeout,
retries and cleanup. Record the test-client SHA and the runtime's verified source separately:

```bash
mkdir -p .tmp
diagnostic_dir=$(mktemp -d .tmp/homepage-diagnostic.XXXXXX)
printf 'Diagnostics: %s\n' "$diagnostic_dir"
git rev-parse HEAD > "$diagnostic_dir/test-client-sha.txt"
git diff HEAD -- tests/browser/public-homepage.spec.ts > "$diagnostic_dir/test-client.patch"
~/dev/songhealth-quadlet/scripts/dev-runtime-verify.sh > "$diagnostic_dir/runtime-verify.log" &&
  scripts/dev-runtime-env.sh node node_modules/@playwright/test/cli.js test \
    tests/browser/public-homepage.spec.ts --grep 'with every section showing' \
    --workers=1 --reporter=json --trace=on --output="$diagnostic_dir/artifacts" \
    > "$diagnostic_dir/report.json" 2> "$diagnostic_dir/stderr.log"
```

The SHA and scoped patch distinguish committed source from edits to the selected case. The pinned
runner writes JSON directly, keeping npm's console preamble out of the report. Read
its `stats`, the selected result's `status`/`duration`, and the named `steps` first; inspect its
errors, stderr and trace where a phase failed or took unexpected time. Keep each run's directory
and exit status: a later passing run is separate evidence. The trace is available even on a pass
for timing inspection. Playwright 1.63.0's CLI/reporters and `test.step` support these artifacts
(`node_modules/playwright/types/test.d.ts`). Trace recording has a cost even when successful traces
are discarded with `retain-on-failure`; measure this selected run before broadening its use.

### Public-page evidence

Pull-request screenshots of public pages come from
`node scripts/capture-screenshots.mjs <out-dir> <path>...`. The script's header shows how to put
them on an image-only `evidence/` branch, so no image enters the code tree. While the demo dataset
below is installed, it fills every page, so the script alone captures a page with content. A state
the dataset does not hold, such as a Document whose file was deleted, takes its content from
`scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>`. The
runner makes the module's synthetic content, captures the paths the module returns, and removes
everything it made. A selector as a third argument, such as
`'section[aria-labelledby=home-leadership]'`, captures that element alone on each page, to look at
one part of a long page. `scripts/screenshot-fixtures/news.ts` is the example. The Admin's sidebar, as an
Administrator, an Editor or an Author sees it, comes from
`scripts/dev-runtime-env.sh node scripts/capture-admin.ts <out-dir> [<role>]`.

Text on a gradient or over a decoration is read with
`node scripts/measure-text-contrast.ts [--fixtures <module>] <path> <selector>...` before the
suites run: axe leaves such text unmeasured. It prints the lowest contrast under the text's own
pixels at five widths; its header says how.

The runtime holds the demo dataset: content marked `[ตัวอย่าง]` that fills every page for the
Product Owner's review. `scripts/dev-runtime-env.sh node scripts/demo-dataset.ts add` installs it
and `… remove` takes it away. It stays installed, the Product Owner's exception to the cleanup rule
below (`docs/operations/development-quadlet.md`, Demo dataset).

Latency evidence for a list that reads more than one page (ADR 0002, ADR 0004) comes from
`scripts/dev-runtime-env.sh node scripts/measure-latency.ts <fixtures-module> [runs]`. It times
the module's paths before and after making its synthetic content, then removes the content, and
prints a table for the pull request. `scripts/latency-fixtures/dated-lists.ts` is the example.

Whether a title fits a column comes from `node scripts/thai-title-widths.ts`. It prints how wide
each Thai word a title keeps whole (`src/lib/thai-title.ts`) is at each title size, in the site's
font. Compare it with the column at the tightest width before a spec or ticket says a title fits.

Admin login uses EmDash's development-only bypass (browsers accept passkeys only on a domain
origin, not `127.0.0.1`):
`http://127.0.0.1:4324/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`. The services start
with the user session; linger is not enabled, so the runtime stops when the last session ends.

### Runtime rules

- One runtime, one database, one media store, one test target: `http://127.0.0.1:4324`
  (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324`). Never start a second Astro/EmDash server or
  stack for verification (`CLAUDE.md`, Runtimes). The one exception is
  `scripts/production-image-check.sh`, which runs the production image briefly against this
  runtime's data and removes it (Product Owner, #67 comment 6558196151;
  `docs/operations/development-quadlet.md`, Production image check).
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
terms, bylines, redirects and menu items (`docs/operations/development-quadlet.md`, Daily use).

Production prerequisites, deployment and recovery live in
[docs/operations/production-foundation.md](docs/operations/production-foundation.md) and are
unchanged by the development-runtime decision; T022/T028 remain PENDING. The WordPress migration's
production import and cutover follow
[docs/operations/wordpress-cutover.md](docs/operations/wordpress-cutover.md), NOT AUTHORIZED until
the production track asks (`09` §18).
