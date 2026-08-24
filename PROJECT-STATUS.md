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
- **Status:** IMPLEMENTATION REWORK — T026

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED
- **Phase status:** T025 ACCEPTED — T026 REWORK; T027+ UNAUTHORIZED
- **Previous completed scope:** T025 — separate minimal Admin CSR foundation shell
- **Next valid action:** Claude Code corrects only T026-B01, returns corrective-result evidence,
  and stops for independent Codex re-review; T027+ remain unauthorized
- **Blocking issues:** T026-B01 — all three manifest resources hardcode
  `org.songhealth.foundation.checkout: local`. That value is identical across checkouts and cannot
  prove the checkout-scoped ownership required by Research Decision 5 and the Operations Contract's
  exact-ownership conjunction. The manifest must receive a stable checkout-scoped value from the
  orchestration boundary on every declared resource rather than claim the generic literal `local`.
- **Review evidence:** Independent review of `2f2fac9` against authorization commit `50815a8`
  confirms the direct parent and the exact authorized two-file diff: the new 61-line Development
  manifest plus only the T026 checkbox. Compose render/parse succeeds. The manifest contains one
  digest-pinned database service, loopback-only `127.0.0.1:3306` publication, the persistent named
  volume, Development-only placeholder database/user credentials aligned with the committed
  example, InnoDB/`utf8mb4` flags, and all seven custom label keys on the service, network, and
  volume. Independent `podman manifest inspect` confirms the pinned OCI index children identify
  MySQL `8.4.11` from the `8.4` source path. `git diff --check`, scope inspection, and direct-parent
  verification pass. T026-B01 remains blocking because the checkout label value is not
  checkout-scoped, despite the exact ownership contract. No T027+, Verification manifest,
  dependency/package/lockfile, Product schema/API/data, authentication, Production choice/parity
  claim, additional service, speculative structure, destructive lifecycle behavior, or unrelated
  refactor was added. Review against T026, FR-004–FR-005, FR-008, FR-015, Research Decisions 4–5,
  Data Store, the Operations Contract, Delivery Context, and Constitution Principles I–VI finds no
  Source-of-Truth conflict.
- **Non-blocking notes:** Focused T019–T023 suites remain expected-red at the absent T027+
  `scripts/foundation-operations.mjs` boundary and do not consume this manifest. This reviewer
  runtime has no `npx` executable, so those suites could not be reproduced locally; the manifest's
  supported Compose render/parse and digest inspection were independently reproduced.

## Authorized Implementation

- **Task / Scope:** T026-B01 rework only — replace the literal `local` checkout ownership value in
  `infra/compose.development.yaml` with one required runtime-supplied, stable checkout-scoped value
  and apply that same value to the service, network, and volume checkout labels; preserve all other
  accepted T026 behavior and keep the T026 checkbox complete
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
- **Expected verification:** render/parse the manifest with an explicit safe synthetic
  checkout-scoped input and prove the same non-empty value appears on the service, network, and
  volume; also prove render/parse fails when that required input is absent so no generic or empty
  ownership claim can be created. Run `git diff --check`, conflict-marker inspection, and
  no-skip/todo/only inspection. Return the exact changed files, commands/results, corrective commit
  SHA and direct parent, and confirmation that accepted T026 behavior is unchanged and no T027+ or
  unrelated scope was added.
- **Authorization state:** REWORK  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

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
