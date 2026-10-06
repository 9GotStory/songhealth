# T001 — Dependency Baseline Revalidation Evidence

**Feature**: `001-platform-foundation`
**Task**: T001 (Phase 1: Setup) — revalidate the approved dependency/platform baseline without
changing approved architecture.
**Verification date**: 2026-10-06
**Executor**: Claude Code (DEV Executor), delegated by Codex lead reviewer.
**Authorized baseline**: commit `aeb76320fc228ee4afbb1c0c4956d72a931cc613`
(= `origin/001-platform-foundation`; handoff branch
`agent/codex-lead-reviewer/908d56e051ae`). Verified before writing: HEAD
`aeb76320fc228ee4afbb1c0c4956d72a931cc613`, clean worktree (empty `git status --porcelain`),
implementation branch `agent/claude-developer/9de0d4bb463c` cut from that commit.
**Scope**: documentation-only. No dependency installation, scaffold, package/lock/config change,
application/infrastructure/test file, Spec Kit artifact change, or T002+ work was performed.

## Method and source policy

Per `AGENTS.md` (External Documentation and Context7) and the repository `CLAUDE.md`,
Context7 MCP was used first where it supports the technology (Astro, EmDash, Podman/Quadlet);
facts Context7 could not establish (exact registry metadata, release dates, lifecycle windows,
PostgreSQL policy) were verified against authoritative first-party sources:

- npm registry metadata via `npm view <pkg>@<version>` (registry.npmjs.org, package-authoritative)
- nodejs.org release blog, dist index, and the upstream `nodejs/release` schedule
- postgresql.org release notes and versioning policy
- github.com/containers/podman release v6.1.3 and docs.podman.io unit references
  (podman-systemd.unit(5), podman-container.unit(5), podman-secret-create(1), reached through
  Context7's indexed copies)

Context7 library IDs used: `/websites/podman_io_en` (Podman/Quadlet), `/websites/emdashcms`
(EmDash), `/withastro/docs` (resolved; registry metadata was more authoritative for the
engine/peer facts needed here, so Astro facts below cite package metadata).

Every item below was checked on 2026-10-06. No secrets or confidential values appear in this
artifact; only public version numbers, dates, and published constraint ranges.

## Summary verdict

| # | Approved item | Role | Exists (date) | Support status on 2026-10-06 | Declared constraints satisfied | Verdict |
|---|---|---|---|---|---|---|
| 1 | Node.js 24.21.0 | Server runtime (LTS line 24 "Krypton") | Yes — 2026-09-08 (blog; dist index 2026-09-07) | Active LTS; line EOL 2028-04-30 | n/a (base) | VALID |
| 2 | npm 12.2.0 | Package manager | Yes — published 2026-09-30 | Current `latest`; undeleted/undeprecated | engines `node ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` ✓ | VALID |
| 3 | Astro 7.3.5 | SSR framework | Yes — published 2026-09-24 | Current major line (7.x); undeleted/undeprecated | engines `node >=22.12.0`, `npm >=9.6.5` ✓ | VALID |
| 4 | `@astrojs/node` 11.1.6 | Node adapter (standalone) | Yes — published 2026-09-16 | Current major line (11.x); undeleted/undeprecated | peer `astro ^7.2.1` ✓ (7.3.5) | VALID |
| 5 | EmDash 1.1.0 | CMS/Admin (Astro integration) | Yes — published 2026-10-01 | Current `latest`; undeleted/undeprecated | engines `node >=22.16` ✓; peers astro ≥6 ✓, react ≥18 ✓, react-dom ≥18 ✓, `@astrojs/react` ≥5-beta ✓, `pg ^8` optional ✓ | VALID |
| 6 | `@astrojs/react` 6.0.5 | React integration | Yes — published 2026-08-31 | Published/undeleted; newer major 7.0.1 exists (see Risks) | peers `react`/`react-dom ^17 \|\| ^18 \|\| ^19` ✓ (19.2.4); engines `node >=22.12.0` ✓; `@types/*` peers noted in Risks | VALID |
| 7 | React / ReactDOM 19.2.4 | Admin UI runtime | Yes — published 2026-01-26 | Published/undeleted; react `latest` is 19.3.0 | react-dom peer `react ^19.2.4` ✓ (exact); engines `node >=0.10.0` ✓ | VALID |
| 8 | TypeScript 6.0.3 | Language/toolchain | Yes — published 2026-04-16 | Published/undeleted; newer major 7.0.2 exists (see Risks) | engines `node >=14.17` ✓ | VALID |
| 9 | `pg` 8.23.1 | PostgreSQL driver | Yes — published 2026-09-30 | Current `latest`; undeleted/undeprecated | engines `node >= 16.0.0` ✓; `pg-native` peer optional ✓; satisfies EmDash optional `pg ^8.0.0` ✓ | VALID |
| 10 | PostgreSQL 18.6 | Database server | Yes — released 2026-08-13 | Current minor of the current supported major; line supported to 2030-11-14 | EmDash publishes no server-major matrix — deferred to T006 gate | VALID (metadata level) |
| 11 | Podman 6.1.3 + rootless Quadlet | Container runtime / lifecycle | Yes — released 2026-09-29 | Current upstream release | Required Quadlet capabilities verified (see §Quadlet) | VALID (reference release) |

**Baseline conclusion**: every approved exact version exists, is undeleted and undeprecated,
remains supported/appropriate for its assigned role as of 2026-10-06, and the set's declared
engine/peer constraints are mutually satisfied on Node.js 24.21.0 + npm 12.2.0. **No stop
condition was triggered; T001 reports no BLOCKED.** Version-currency observations that do not
affect validity are recorded under Risks.

## Per-item revalidation records

### 1. Node.js 24.21.0 (LTS, "Krypton")

- Exists: official release blog "2026-09-08, Version 24.21.0 'Krypton' (LTS)"
  (nodejs.org/en/blog/release/v24.21.0). The site footer marks v24.21.0 as "Latest LTS".
  nodejs.org dist index lists v24.21.0 dated 2026-09-07, `lts: "Krypton"`, modules 137,
  OpenSSL 3.5.8.
- Line status (upstream `nodejs/release` `schedule.json`): v24 released 2025-05-06, LTS start
  2025-10-28, Maintenance start **2026-10-20**, end-of-life **2028-04-30**. On the verification
  date Node 24 is in Active LTS; Node 26 is Current (released 2026-05-05, LTS start 2026-10-28).
  Node 22 "Jod" is in Maintenance (EOL 2027-04-30). All odd lines and ≤ v21 are EOL.
- The research phase-0 statement "Node 24 is Active LTS, while Node 26 is Current" is therefore
  **confirmed for 2026-10-06**. Note the line transitions to Maintenance LTS on 2026-10-20
  (critical-fixes-only) — still supported for ~19 further months, so the approved choice remains
  appropriate for the foundation and matches `current/10` "supported Node.js version".
- Facts confirmed: bundled npm in Node 24.21.0 is **11.19.0** (dist index). The approved npm
  12.2.0 is a deliberate standalone pin, not the bundled client — see Risks item R3.

### 2. npm 12.2.0

- Exists: registry metadata for `npm@12.2.0`, published 2026-09-30; dist-tag `latest` =
  12.2.0; no `deprecated` field.
- Declared engines: `node: ^22.22.2 || ^24.15.0 || >=26.0.0`. Node 24.21.0 satisfies
  `^24.15.0` (≥ 24.15.0, < 25). ✓
- Satisfies Astro 7.3.5's declared `engines.npm >= 9.6.5`. ✓
- One committed `package-lock.json` + `npm ci` reproducibility remains the documented npm
  mechanism (docs.npmjs.com lockfile / `npm ci`, as cited in research.md §2).

### 3. Astro 7.3.5

- Exists: registry metadata for `astro@7.3.5`, published 2026-09-24; no `deprecated` field.
- Current major line: dist-tag `latest` = 7.3.6 (one patch newer than the approved pin);
  `beta` = 7.4.0-beta.1; `legacy` = 4.16.19. The 7.x line is the active stable major.
- Declared engines: `node >=22.12.0`, `npm >=9.6.5`, `pnpm >=7.1.0` — Node 24.21.0 and
  npm 12.2.0 satisfy the two that apply (npm chosen as the sole package manager). ✓
- Peer dependency `@astrojs/markdown-remark ^7.3.0` is Astro's own internal pair and resolves
  inside Astro's dependency tree at install time (T002's `npm ci`); it constrains no other
  approved item.

### 4. `@astrojs/node` 11.1.6

- Exists: registry metadata, published 2026-09-16; no `deprecated` field; current major line
  (`latest` = 11.1.7).
- Declared peerDependencies: `astro ^7.2.1` — Astro 7.3.5 satisfies. ✓
- No `engines` field is declared; nothing else to satisfy.
- Standalone mode remains the adapter's documented self-contained-Node shape, as assumed by
  research.md §1 and plan.md (role assignment only; no deployment design done here).

### 5. EmDash 1.1.0

- Exists: registry metadata for `emdash@1.1.0`, published 2026-10-01; dist-tag `latest` =
  1.1.0; no `deprecated` field.
- Declared engines: `node >=22.16` — Node 24.21.0 satisfies. ✓
- Declared peerDependencies: `astro >=6.0.0-beta.0` (7.3.5 ✓), `react >=18.0.0` (19.2.4 ✓),
  `react-dom >=18.0.0` (19.2.4 ✓), `@astrojs/react >=5.0.0-beta.0` (6.0.5 ✓),
  `@emdash-cms/auth-atproto >=0.2.8` — **optional** per `peerDependenciesMeta`. The AT Protocol
  auth plugin is not required for the approved foundation (native passkey authentication); its
  absence is a supported configuration, not an unmet constraint.
- Declared optionalDependencies: `pg ^8.0.0` (8.23.1 ✓, the PostgreSQL path used here) and
  `@libsql/kysely-libsql ^0.4.0` (not used).
- First-party docs re-check (docs.emdashcms.com via Context7 `/websites/emdashcms`):
  existing-project guide requires **Astro 6 or later and Node.js 22.16 or later** and installs
  exactly `emdash @astrojs/node @astrojs/react react react-dom`; Node deployment prerequisites
  state **Node.js v22.16.0 or higher**; the PostgreSQL adapter uses `pg.Pool` with `pg`
  installed as a site dependency. All consistent with the approved set and the
  registry-declared constraints above.
- **Source limitation (unchanged)**: EmDash publishes **no PostgreSQL server-major
  compatibility matrix** (checked in package metadata and docs on 2026-10-06). Compatibility of
  EmDash 1.1.0 with PostgreSQL 18.6 is therefore **not claimed by this evidence**; it remains
  the explicit empirical T006 hard gate, per research.md §4, CHK028, and the handoff
  instruction.

### 6. `@astrojs/react` 6.0.5

- Exists: registry metadata, published 2026-08-31; no `deprecated` field.
- Declared engines: `node >=22.12.0` — Node 24.21.0 satisfies. ✓
- Declared peerDependencies: `react ^17.0.2 || ^18.0.0 || ^19.0.0` (19.2.4 ✓),
  `react-dom ^17.0.2 || ^18.0.0 || ^19.0.0` (19.2.4 ✓), plus `@types/react` and
  `@types/react-dom` at `^19.0.0`-inclusive ranges — see Risks item R2.
- Version-currency note: dist-tag `latest` = 7.0.1 (a newer major exists; its peers also accept
  React 19 but add `oxc-transform-react`). Research.md §2 recorded that EmDash's upstream
  catalog tests **the React 6 adapter** against Astro 7 / React 19, so the approved 6.0.5 pin
  is the researched-compatible choice and satisfies every declared constraint of the approved
  set. No substitution is proposed or needed.

### 7. React 19.2.4 / ReactDOM 19.2.4

- Exist: registry metadata for both, published 2026-01-26; no `deprecated` fields.
- `react@19.2.4` engines: `node >=0.10.0` ✓. `react-dom@19.2.4` peerDependencies:
  `react ^19.2.4` — the approved React pin is an **exact match** (19.2.4), the strictest
  cross-pair in the set. ✓
- Satisfy EmDash peers (`react >=18`, `react-dom >=18`) and `@astrojs/react` 6.0.5 peers
  (`^19.0.0`). ✓ Version-currency note: react `latest` = 19.3.0; the approved 19.2.4 remains a
  published, undeleted version and no approved constraint requires 19.3.

### 8. TypeScript 6.0.3

- Exists: registry metadata, published 2026-04-16; no `deprecated` field.
- Declared engines: `node >=14.17` — Node 24.21.0 satisfies. ✓
- No package in the approved set declares a peer constraint on `typescript`.
- Version-currency note: `latest` = 7.0.2 (a newer major exists). TypeScript publishes no vendor
  support matrix that would retire a published 6.x version; 6.0.3 remains installable and is
  the pinned toolchain per plan.md. Currency follow-up is an authorized-change decision, not a
  T001 validity defect.

### 9. `pg` 8.23.1

- Exists: registry metadata, published 2026-09-30; dist-tag `latest` = 8.23.1; no
  `deprecated` field.
- Declared engines: `node >= 16.0.0` ✓. Declared peer `pg-native >=3.0.1` is marked
  **optional** in `peerDependenciesMeta`; the pure-JS client is a supported configuration
  (and is what EmDash's adapter uses via `pg.Pool`).
- Satisfies EmDash's optional `pg ^8.0.0` ✓. EmDash docs additionally floor `pg >= 8.16.3`
  only for the Cloudflare Hyperdrive adapter path (not the approved Node deployment path);
  8.23.1 exceeds that floor regardless. ✓

### 10. PostgreSQL 18.6

- Exists: official release notes "E.2-style release 18.6", released **2026-08-13**
  (postgresql.org/docs/release/18.6/). 18.5 was never shipped (regression found post-wrap);
  the 18.x version list is 18.0–18.4, 18.6.
- Support status (postgresql.org/support/versioning, 2026-10-06): supported majors are
  18 / 17 / 16 / 15 / 14; **major 18 is the newest released major** (PostgreSQL 19 is only at
  Beta 4) and **18.6 is its current minor and the latest minor overall**; major 18 is
  community-supported until **2030-11-14** (5-year policy). The policy's guidance — always run
  the current minor of your major — is exactly met by 18.6.
- 18.6 ships many security fixes (CVE-2026-6471, CVE-2026-14663, CVE-2026-6464,
  CVE-2026-16239, CVE-2026-14669, CVE-2026-14664, CVE-2026-18024, CVE-2026-15741,
  CVE-2026-14666, CVE-2026-18408, CVE-2026-14680) plus bug fixes; minor upgrades within 18.x
  require no dump/restore. Using 18.6 rather than an older minor is therefore the supported,
  security-current choice.
- **Compatibility conclusion (scoped)**: valid, current, and fully supported as a PostgreSQL
  release. EmDash↔PostgreSQL 18 **runtime** compatibility is intentionally **not** asserted
  here — no published EmDash server-major matrix exists (see item 5), so it stays a T006
  empirical gate. This evidence neither claims it nor works around its absence.

### 11. Podman 6.1.3 and rootless systemd Quadlet capabilities

- Exists: upstream release `v6.1.3`, published **2026-09-29**
  (github.com/containers/podman/releases/tag/v6.1.3); it is the current tagged release. Stable
  patch release in the 6.1.x line; headline change is security fix CVE-2026-94603 (checkpoint
  image sandbox bypass) with checkpoint-image support removed from `podman run`. Nothing in the
  release notes removes or degrades Quadlet/rootless behavior.
- Per plan.md, 6.1.3 is the **upstream reference release**; the production host must use a
  vendor-supported package whose Quadlet provides the researched capabilities, with the exact
  host version recorded in verification evidence (T022). This is reconfirmed as the right
  reading; T001 does not select a host package.
- **Required Quadlet capabilities verified against podman-systemd.unit(5),
  podman-container.unit(5), and podman-secret-create(1) (docs.podman.io, via Context7
  `/websites/podman_io_en`, 2026-10-06)** — capability evidence only, no deployment files
  designed here:
  - **Unit kinds**: the Quadlet generator reads files with extensions `.container`, `.volume`,
    `.network`, `.build`, `.pod`, `.kube`, `.artifact` and generates a corresponding
    `.service` per file. `.container`/`.network`/`.volume` (the kinds Feature 001's topology
    uses) are all generator-supported. ✓
  - **Rootless user-systemd path**: "Both system and user systemd units are supported." For
    non-root users, Quadlet search paths are `$XDG_RUNTIME_DIR/containers/systemd/`,
    `$XDG_CONFIG_HOME/containers/systemd/` (i.e. `~/.config/containers/systemd/`),
    `/etc/containers/systemd/users/${UID}`, `/etc/containers/systemd/users/`,
    `/usr/share/containers/systemd/users/${UID}`, and `/usr/share/containers/systemd/users/`.
    `[Install] WantedBy=default.target` enables user units. User units for `nologin` users are
    manageable via `systemctl --machine user@. --user`. ✓
  - **Health**: `[Container]` exposes the health-check key family (`HealthCmd` and related
    interval/retries/start-period/timeout options). `Notify=healthy` (podman-container.unit(5))
    postpones the systemd startup notification until Podman marks the container healthy, and
    requires a configured healthcheck — exactly the mechanism plan.md relies on to make
    ready/not-ready observable through user systemd (`pg_isready` for the DB container). ✓
  - **Dependencies**: standard `[Unit]` `After=`/`Requires=` may reference other Quadlet units
    (upstream example: `After=basic.container` + `Requires=basic.container`), so app/DB startup
    ordering and network/volume unit dependencies are expressible natively; generated services
    are ordinary systemd services managed by `systemctl`. ✓
  - **Secrets**: `[Container]` `Secret=` key — "Use a Podman secret in the container either as
    a file or an environment variable… equivalent to the Podman `--secret` option" — and
    `podman secret create` supports file-based secrets mounted under `/run/secrets` (e.g.
    `--secret source=…,type=mount,uid=…,gid=…,mode=440`), plus `type=env` exposure. External
    runtime secrets therefore have a native rootless path without baking values into images. ✓
- Conclusion: the approved rootless user-systemd Quadlet path and the `.container`,
  `.network`, `.volume`, health, dependency, and secret behaviors required by `current/10`
  §3.1 and plan.md are documented upstream capabilities of the current release; nothing
  requires a parallel Docker/Compose baseline or a workaround.

## Cross-set compatibility analysis (verified facts)

All constraints below are registry-declared `engines`/`peerDependencies` checked on 2026-10-06
against the exact approved versions:

- Node 24.21.0 satisfies every declared engine floor in the set: Astro `>=22.12.0`,
  `@astrojs/react` `>=22.12.0`, EmDash `>=22.16`, TypeScript `>=14.17`, `pg` `>= 16.0.0`,
  React `>=0.10.0`.
- npm 12.2.0 satisfies its own engines on Node 24.21.0 (`^24.15.0`) and Astro's
  `engines.npm >= 9.6.5`.
- Adapter/framework pairs: `@astrojs/node` 11.1.6 ↔ Astro 7.3.5 (`^7.2.1` ✓);
  `@astrojs/react` 6.0.5 ↔ React/ReactDOM 19.2.4 (`^19.0.0` ✓); `react-dom` 19.2.4 ↔
  `react` 19.2.4 (exact `^19.2.4` ✓).
- EmDash 1.1.0's peer envelope (Astro ≥6, React/ReactDOM ≥18, `@astrojs/react` ≥5-beta) and
  optional `pg ^8.0.0` are all satisfied by the approved pins; its only unsatisfied-by-design
  peer (`@emdash-cms/auth-atproto`) is declared optional.
- These are **metadata-level** conclusions. They establish that no declared constraint blocks
  the set; they do **not** establish runtime behavior (build, sync, migrate, serve) or EmDash↔
  PostgreSQL 18 server compatibility, which is exactly what T002 (pinning) and T006 (empirical
  gate) exist to prove.

## Verified facts vs source limitations vs the T006 gate

- **Verified facts**: existence, publish dates, dist-tags, non-deprecation, engine/peer
  declarations, Node/PostgreSQL lifecycle windows, Podman release identity, and the Quadlet
  capability set above, each tied to the dated source listed below.
- **Source limitations**: (a) EmDash publishes no PostgreSQL server-major compatibility matrix;
  (b) the npm registry expresses declared intent, not runtime proof; (c) Podman vendor-package
  versions on the eventual production host may lag the 6.1.3 upstream reference; (d) Node
  24's Active-LTS phase ends 2026-10-20, after which the line is Maintenance LTS until
  2028-04-30.
- **Deferred to T006 (unchanged)**: EmDash 1.1.0 ↔ PostgreSQL 18.6 native compatibility —
  build/sync manifest, `emdash migrate --status`/`migrate`/`--check`, and application start
  against the actual pinned combination. T001 explicitly does not claim this compatibility and
  has invented no workaround for its absence.

## Risks and observations for downstream tasks (no baseline change requested)

- **R1 — EmDash/PostgreSQL 18 major compatibility (explicit, pre-approved risk)**: no published
  matrix; T006 remains the fail-fast hard gate with Product Owner/architecture escalation on
  failure (tasks.md Phase 2 CRITICAL; CHK028). Unchanged by this revalidation.
- **R2 — `@types/react` / `@types/react-dom` are peer-required by `@astrojs/react` 6.0.5
  (`^19.0.0`-inclusive ranges) but are not named in the approved plan baseline.** T002 must
  resolve these type packages (at React-19-compatible versions) when creating
  `package.json`/lockfile to keep the peer graph clean. This is a pinning completion inside the
  approved architecture, flagged here for the reviewer; no version decision was made by T001.
- **R3 — Node 24.21.0 bundles npm 11.19.0; the approved npm 12.2.0 is a standalone pin.**
  T002/T014 must make the npm version explicit and reproducible (e.g. documented install or
  tooling pin) so `npm ci`/lockfile generation runs on 12.2.0, not the bundled 11.x.
- **R4 — Version currency (informational, not validity defects)**: `astro` 7.3.6,
  `@astrojs/node` 11.1.7, `react`/`react-dom` 19.3.0, `@astrojs/react` 7.0.1, and TypeScript
  7.0.2 exist as of 2026-10-06. The approved pins remain published, undeleted, and satisfy all
  declared constraints; adopting any newer version is an explicitly authorized change
  (Constitution §V), out of T001 scope. Note `@astrojs/react` 6.0.5 is one major behind
  `latest` and is the version EmDash's upstream catalog tests (research.md §2).
- **R5 — Node 24 LTS phase transition on 2026-10-20**: Active → Maintenance LTS (critical
  fixes only) until EOL 2028-04-30. The line remains supported across the entire Feature 001
  horizon; recorded so the Product Owner sees the phase change, which requires no action now.
- **R6 — Production host Podman version**: upstream 6.1.3 is the reference; the actual
  vendor-supported host package version must be recorded in T022 evidence per plan.md.

## Stop-condition evaluation

| Condition | Result |
|---|---|
| Any approved exact version does not exist | Not triggered — all 11 items verified to exist with dates |
| Any item deprecated/withdrawn or unsupported for its role | Not triggered — none deprecated; Node 24 LTS to 2028-04-30, PostgreSQL 18 to 2030-11-14, npm/EmDash/`pg` are current `latest`, others published and current-line |
| Declared engine/peer/platform constraint violated by the set | Not triggered — all declared constraints satisfied (analysis above); optional peers excluded by design |
| Approved architecture requires an invalid/stale capability | Not triggered — Quadlet rootless/health/dependency/secret behaviors all documented upstream |

**Result: no BLOCKED. The approved dependency/platform baseline is revalidated as valid for
T002+ to pin and implement, with runtime EmDash/PostgreSQL compatibility still owed to the
T006 empirical gate.**

## Verification commands executed (2026-10-06)

- `git rev-parse HEAD` → `aeb76320fc228ee4afbb1c0c4956d72a931cc613`; `git status --porcelain`
  → empty (before writing, and re-checked before commit).
- `npm view <pkg>@<version> version engines peerDependencies peerDependenciesMeta
  optionalDependencies deprecated` for astro@7.3.5, emdash@1.1.0, @astrojs/node@11.1.6,
  @astrojs/react@6.0.5, react@19.2.4, react-dom@19.2.4, typescript@6.0.3, pg@8.23.1, npm@12.2.0
  (registry.npmjs.org).
- `npm view <pkg> time --json` / `dist-tags --json` for publish dates and currency.
- Context7 (`/websites/emdashcms`, `/websites/podman_io_en`; `/withastro/docs` resolved) for
  EmDash requirements/adapters and Quadlet unit references.
- First-party page fetches: nodejs.org release blog v24.21.0, nodejs.org dist index,
  nodejs.org previous-releases, nodejs/release schedule.json, postgresql.org
  docs/release/18.6 and support/versioning, github.com/containers/podman release v6.1.3.
- No `npm install`/`npm ci`, build, or test was run — not required or authorized for this
  documentation-only task.

## Sources (all accessed 2026-10-06)

1. npm registry metadata (registry.npmjs.org) via `npm view` for the nine pinned packages.
2. Node.js v24.21.0 release blog — https://nodejs.org/en/blog/release/v24.21.0
3. Node.js dist index — https://nodejs.org/dist/index.json
4. Node.js previous releases — https://nodejs.org/en/about/previous-releases
5. Node.js release schedule — https://github.com/nodejs/release (schedule.json)
6. PostgreSQL 18.6 release notes — https://www.postgresql.org/docs/release/18.6/
7. PostgreSQL versioning policy — https://www.postgresql.org/support/versioning/
8. Podman v6.1.3 release — https://github.com/containers/podman/releases/tag/v6.1.3
9. Podman Quadlet references (via Context7-indexed docs.podman.io):
   podman-systemd.unit(5), podman-container.unit(5), podman-secret-create(1),
   podman-auto-update(1).
10. EmDash documentation (via Context7 `/websites/emdashcms`, docs.emdashcms.com):
    existing-project guide, deployment/nodejs, deployment/database, reference/configuration.

## Secret safety

This artifact contains only public version numbers, dates, published constraint ranges, and
public documentation URLs. No credentials, tokens, connection strings, environment values, or
other secret or confidential data are included.
