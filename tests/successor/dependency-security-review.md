# Cross-Graph Dependency & Security Review — Delivery 002 (T049)

Reviewable procedure and execution record for the two dependency graphs this
foundation actually owns (spec.md FR-023; research.md §10; quickstart.md §8).
Recorded by the DEV Executor; independent review is Codex/Human owned.

- **Base:** `b827f2c735b4d4dd4f324f7aed1e9747f98cdd48` (persisted Gate 05 state)
- **Candidate:** this batch's commit on `agent/claude-developer/g06`
- **Scope discipline:** no dependency is added, removed, or re-pinned by this
  batch. This review records the graphs as locked and their
  compatibility/support, advisory, justification, ownership, maintenance, and
  replacement posture (Constitution I/VI; FR-023).

## 1. Procedure (repeatable)

Run against the exact candidate checkout, in the approved local verification
runtime, with bounded non-sensitive output only:

| # | Check | Command (from `wordpress/` unless noted) | Records |
| - | ----- | -------- | ------- |
| 1 | PHP locked-install integrity | `php composer.phar install --no-interaction` (idempotent against `composer.lock`) | install result |
| 2 | PHP advisories | `php composer.phar audit --locked` | advisories found |
| 3 | PHP direct graph | `php composer.phar show --direct` | name/version/purpose |
| 4 | PHP update horizon | `php composer.phar outdated --direct` | available updates |
| 5 | npm locked-install integrity | `npm ci` (repository root) | added packages count |
| 6 | npm advisories (both scopes) | `npm audit --omit=dev`; `npm audit` | vulnerabilities found |
| 7 | npm direct graph | `npm ls --workspace apps/web --depth 0` | name/version |
| 8 | npm update horizon | `npm outdated --workspace apps/web` | available updates |
| 9 | Graph soundness gates | unit/integration/containment suites; `npx tsc -p tsconfig.json --noEmit`; `npx vitest run --project contract`; `npx vitest run --project unit app/routes/foundation.test.tsx`; `npm run build:web` | pass/fail/skip counts |

Rules: never paste credentials, lockfile hashes of secret-bearing artifacts, or
internal paths into the record; never "fix" an advisory by silently upgrading
past a compatibility pin; a Production version lock requires Bangmod account
evidence (`bangmod-capability-evidence.md`), never this review alone (FR-002).

## 2. Graph A — PHP / WordPress / plugin (`wordpress/composer.json`)

Runtime requirement: `php ^8.3`. The first-party `songhealth-core` plugin has
**zero third-party production dependencies** — its declared dependencies are
WordPress Core APIs only. All Composer packages are dev-only verification
tooling, pinned by `composer.lock`:

| Package | Locked | Kind | Requirement justification | Ownership / maintenance | Update path | Replacement consideration |
| ------- | ------ | ---- | -------------------------- | ----------------------- | ----------- | -------------------------- |
| `phpunit/phpunit` | 9.6.36 | dev | The pinned unit/integration test runner (T001 baseline). | PHPUnit project (community-maintained, active). | 9.6.x in-range updates only; major 12 exists but is deliberately NOT taken — `wp-phpunit` 7.1 requires the PHPUnit 9 API the suites are written against. | Any runner swap is a verification-infrastructure change requiring its own authorization; none proposed. |
| `wp-phpunit/wp-phpunit` | 7.1.0 | dev | The WordPress core PHPUnit library matching the pinned WordPress 7.1 verification core (T001/T002). | WordPress project (the official distribution channel for the core test library). | Follows the WordPress core line used by the verification profile; moving core versions is a verification-profile decision, evidence-gated for Production (FR-002). | None — this is the platform's own test library. |
| `yoast/phpunit-polyfills` | 3.1.2 | dev | Keeps the suites runnable across PHPUnit cross-version API differences (T001 baseline decision). | Yoast (established WordPress ecosystem maintainer). | 3.x in-range; major 4 exists, NOT taken (no requirement; avoids a runner-API change). | Droppable if the runner line ever stabilizes; no action proposed. |

WordPress Core and PHP versions in this record (7.1 / 8.3.33) are the
digest-pinned **local verification profile only** (Gate 01.5 images); they are
not Production locks (FR-002; SC-009 defers those to account evidence).

**Advisories:** `composer audit --locked` → `No security vulnerability
advisories found.`

## 3. Graph B — npm / frontend (root `package.json` + workspaces)

The React public application (`apps/web`) is the only successor frontend
graph; `apps/admin` and `apps/server` are preserved Delivery 001 workspaces
(classified non-destructively in `delivery-001-asset-classification.md`; their
dependencies are retained, not consumed by the successor).

Locked by `package-lock.json` (lockfileVersion 3); locked install resolves
215 packages.

| Package | Locked | Kind | Requirement justification | Ownership / maintenance | Update path | Replacement consideration |
| ------- | ------ | ---- | -------------------------- | ----------------------- | ----------- | -------------------------- |
| `react` / `react-dom` | 19.2.8 | prod | The Frozen React public-presentation boundary (FR-010; plan structure). | Meta/react community (active). | In-range minors; majors via an authorized presentation-layer change only. | None — React is the approved presentation owner. |
| `react-router` / `@react-router/dev` | 8.3.0 | prod/dev | Framework-mode canonical routing bound to the public contract (FR-011; T023/T024). | Remix/React Router team (active). | 8.3.1 patch available — NOT taken this batch (no driving requirement; scope discipline). | A routing swap would be an architecture change requiring approved review. |
| `isbot` | 5.2.1 | prod | SSR bot detection used by the framework entry. | Community (active). | 5.2.2 patch available — not taken this batch. | Framework-provided alternative only via authorized change. |
| `typescript` | 5.9.3 | dev | Type gate for the presentation boundary (`tsc --noEmit`). | Microsoft (active). | Major 7 exists — NOT taken (5.9 is the pinned type-check baseline; no requirement). | n/a |
| `vite` | 8.2.1 | dev | Build tooling of the framework toolchain. | Vite team (active). | 8.2.2 patch available — not taken this batch. | Toolchain-level swap requires authorization. |
| `vitest` | 4.1.10 | dev | Frontend unit/contract runner (T022 baseline). | Vitest team (active). | 4.1.11 patch available — not taken this batch. | Runner swap is verification infrastructure change. |
| `@playwright/test` | 1.62.1 | dev | Browser evidence runner (T021 baseline; e2e suites). | Microsoft (active). | In-range only; browser evidence is a locked verification pin. | n/a |
| `@types/react`, `@types/react-dom` | 19.2.18 / 19.2.4 | dev | Type definitions matching the React line. | DefinitelyTyped (active). | In-range. | n/a |

**Advisories:** `npm audit --omit=dev` → `found 0 vulnerabilities`;
`npm audit` (all scopes, including dev and the preserved Delivery 001
workspaces) → `found 0 vulnerabilities`.

## 4. Cross-graph findings and dispositions

| Finding | Disposition |
| ------- | ----------- |
| 0 advisories in either graph (both scopes) | No forced action. |
| Available but not applied: `react-router` 8.3.1, `isbot` 5.2.2, `vite` 8.2.2, `vitest` 4.1.11, `@types/*` bumps (frontend); `phpunit` 12 / `phpunit-polyfills` 4 / `typescript` 7 majors (toolchains) | Deliberately not taken: no advisory or requirement drives them in this batch, and Constitution II / FR-023 forbid speculative churn. A future update is a normal reviewable change against the same procedure. |
| Dev-only PHP graph; plugin runtime has no third-party dependency | The smallest correct runtime supply chain (FR-023); retained. |
| Preserved Delivery 001 workspaces (`apps/admin`, `apps/server`: `fastify`, `kysely`, `mysql2`, `@sinclair/typebox`, `@vitejs/plugin-react`) remain in the lockfile | Retained unchanged — they are part of classified, preserved assets; the successor consumes none of them. No advisory affects them. Their eventual removal follows the successor-classification record, not this review. |

## 5. Verification evidence (this batch's run)

```text
$ cd wordpress && php composer.phar audit --locked
No security vulnerability advisories found.
$ cd .. && npm audit --omit=dev && npm audit
found 0 vulnerabilities            (both scopes)
$ npm ci                           → added 215 packages (locked install, in 3s)
$ cd wordpress && php vendor/bin/phpunit --testsuite unit
OK (73 tests, 956 assertions)
$ php vendor/bin/phpunit --testsuite integration
OK (90 tests, 1566 assertions)
$ composer test:containment        (php composer.phar test:containment)
OK, but incomplete, skipped, or risky tests! (24 tests, 240 assertions, 2 skipped)
$ cd apps/web && npx vitest run --project contract
Tests  22 passed (22)
$ npx vitest run --project unit app/routes/foundation.test.tsx
Tests  9 passed (9)
$ npx tsc -p tsconfig.json --noEmit → clean
$ npm run build:web                → react-router build ✓ (client + ssr)
```

The 2 containment skips are the two live Apache-layer probe cases, skipped
with recorded reasons when no live probe fixture is supplied (the documented
Gate 05 no-probe mode); they exercise storage-server denial unchanged by this
batch. Containment assertions grew by 8 over the Gate 05 no-probe record
(232 → 240) because the two new operator routes (T052) are part of the
per-route containment loops — the loop covers more approved shapes, and no
assertion was weakened.

## 6. Environment limits

- Advisories were checked from the pinned verification containers against the
  locked graphs (`--locked` / lockfile-resolved `npm ci`); runtime network
  access to the advisory databases was available and the commands completed.
- Production-specific version or capability locks are NOT created here; they
  remain gated on actual Bangmod account evidence (FR-002; SC-009).
