# PROJECT STATUS

> Workflow/gate mirror only. Not a Source of Truth.

## Repository Bootstrap

- **Repository state:** BOOTSTRAP COMPLETE — DELIVERY IMPLEMENTATION / REVIEW LOOP ACTIVE
- **Product/System Source of Truth:** `docs/website-modernization-docs/`
- **System Blueprint:** `docs/website-modernization-docs/current/10-system-blueprint.md` — FROZEN v1.1
- **Spec Kit control layer:** INSTALLED AS REPOSITORY FILES
- **Canonical Constitution:** ESTABLISHED — `.specify/memory/constitution.md` v1.0.0
- **Spec Kit runtime/integrations:** VERIFIED — Specify CLI 0.16.4; Codex + Claude integrations OK

## Planned Delivery

- **Delivery:** 001-application-foundation — Application Foundation & Development Runtime
- **Delivery Context:** `docs/spec-context/001-application-foundation.md`
- **Delivery Context state:** READY  <!-- UNSET | DRAFT | READY | STALE -->
- **Status:** IMPLEMENTATION AUTHORIZED — T026

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T025 ACCEPTED — T026 AUTHORIZED; T027+ UNAUTHORIZED
- **Previous completed scope:** T025 — separate minimal Admin CSR foundation shell
- **Next valid action:** Claude Code implements only T026, returns implementation-result evidence,
  and stops for independent Codex review; T027+ remain unauthorized
- **Blocking issues:** NONE
- **Review evidence:** Independent review of `7201cc3` against authorization commit `e60a71f`
  confirms exactly the two authorized Admin implementation files plus the T025 checkbox. The
  default-only component renders a static semantic Admin foundation/readiness shell, and the
  separate React/Vite CSR entry mounts it through the existing `#root` boundary. There is no
  fetching, navigation, form or interactive mutation, routing, data access, Product/domain content,
  CMS/editorial behavior, authentication/session/access-control behavior, or additional export.
  Focused Vitest passes 8/8. Root `tsc --noEmit` reports exactly the five accepted T027+ TS2307
  missing-boundary diagnostics and no T025 diagnostic or other error. `git diff --check`,
  conflict-marker inspection, no-skip/todo/only inspection, direct-parent verification, and
  clean-tree verification pass. No T026+, dependency, package, lockfile, manifest, schema/API,
  Production decision, shared package, speculative structure, or unrelated refactor was added.
  Review against T025, FR-001–FR-002, FR-016, the accepted T018 contract, plan, Delivery Context,
  and Constitution Principles I–VI finds no Source-of-Truth conflict.
  Product Owner Human Gate accepted T025.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. The
  lockfile-exact install uses Node 24.19.0 with bundled npm 11.17.0 and emits the known npm-engine
  warning because the repository requests npm 12; neither limitation authorizes dependency,
  manifest, or lockfile changes.

## Authorized Implementation

- **Task / Scope:** T026 only — define the provisional Development database in
  `infra/compose.development.yaml` with an immutable digest resolving specifically to MySQL 8.4,
  loopback-only publication, a persistent named volume, Development-only credentials, InnoDB and
  `utf8mb4`, and the complete canonical Compose/custom ownership labels; change only that manifest
  and mark only T026 complete in `specs/001-application-foundation/tasks.md`
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T026
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-004–FR-005, FR-008, and FR-015;
  `specs/001-application-foundation/plan.md` Persistence and migrations;
  `specs/001-application-foundation/research.md` Decisions 4–5;
  `specs/001-application-foundation/data-model.md` Data Store;
  `specs/001-application-foundation/contracts/foundation-operations.md` Operation-target ownership
  and isolation; `specs/001-application-foundation/tasks.md` T026 and dependency rules; and
  `.env.development.example`
- **Expected verification:** prove the manifest parses/renders with the repository's supported
  Compose tooling and contains only the Development database service and its persistent named
  volume; prove the immutable image digest resolves specifically to `mysql:8.4`; verify database
  publication is explicitly bound to loopback, credentials/database identity are Development-only
  and align with `.env.development.example`, InnoDB/`utf8mb4` are configured, and every service,
  network, and volume resource carries the required canonical Compose labels plus
  `org.songhealth.foundation.delivery`, `.checkout`, `.environment`, `.runtime-profile`,
  `.operation-target`, `.resource`, and `.ownership-schema` with the correct Development values.
  Run relevant focused manifest/operation-target tests where runnable, `git diff --check`,
  conflict-marker inspection, and no-skip/todo/only inspection. Return the exact changed files,
  commands/results, commit SHA, image tag/digest resolution evidence, and confirmation that no
  T027+, Verification manifest, dependency/package/lockfile, Product data/schema/API,
  authentication, Production decision/parity claim, additional service, speculative structure,
  destructive lifecycle behavior, or unrelated refactor was added.
- **Authorization state:** AUTHORIZED  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

## Rules

- Do not create application code merely to make the repository look initialized.
- Before first `specify`, verify `specify version` and `specify integration status` on the real development machine.
- Reconcile `bootstrap/constitution.proposed.md` through `/speckit.constitution`; do not copy it directly to `.specify/memory/constitution.md`.
- Before first `specify`, this file selects the planned Delivery and points to its Delivery Context.
- Do not run `specify` until the Delivery Context state is `READY`.
- After `specify`, mirror the feature resolved by Spec Kit; never override runtime feature state.
- Treat a conflicting pre-existing `SPECIFY_FEATURE_DIRECTORY` as a blocker; do not silently set/unset it to reconcile status.
- Codex updates this file after each phase/review gate.
- Clear task authorization after PASS or supersession.
- Do not use this file as a changelog.
