# CLAUDE.md — Songhealth Development (Claude Code)

@AGENTS.md

## Role

Claude Code is the sole AI development tool for Songhealth (Constitution 5.0.0). Work only within an
explicitly authorized active Spec Kit task or other Product Owner-authorized scope: plan, implement,
test, self-review, correct and prepare acceptance evidence there; the Product Owner authorizes scope
and accepts results.

## Current repository state

Feature 002 `cms-content-model` (`specs/002-cms-content-model/`) is the active feature. Feature 001 `platform-foundation` provides the accepted foundation: the canonical Astro + EmDash platform (US1, T015) is accepted with runtime evidence; the production Podman/Quadlet deployment sources (T017–T021), the recovery sources (T023–T027), and the T029 canonical-extension evidence are committed and independently reviewed; the T022/T028 runtime gates are pending, separately authorized tasks. Development, testing, self-review, and PR preparation follow the Claude Code workflow recorded in `AGENTS.md` and `README.md` (Constitution 5.0.0): Claude Code develops and self-reviews (never presented as independent review), Codex and ChatGPT are removed from the workflow, development uses Claude Code with Spec Kit and GitHub only until Feature 002 is complete, acceptance is evidence-based, and the Product Owner retains the Human Authorization Gates and Final Acceptance; GitHub and Spec Kit remain authoritative. Source development takes place in the local workspace `/home/thanakorn/dev/songhealth`. The single development runtime is the UID-1000 rootless Quadlet runtime at `http://127.0.0.1:4324` (Feature 002 T036; `README.md`, `docs/operations/development-quadlet.md`); the earlier UID-1001 (`multica-agent`) Songhealth runtimes were deleted on 2026-10-29 (Feature 002 T037). There is no standing implementation authorization.

If no current authorized task exists, do not implement, scaffold, install dependencies, create infrastructure, or restore historical code.

## When implementation is authorized

- read the current Constitution and routed `current/` authority;
- read only the active feature's approved `spec.md`, `plan.md`, and authorized task;
- use the smallest correct change;
- prefer platform-native Astro/EmDash capability before custom abstractions;
- add verification proportional to risk;
- stop after the authorized scope.
- before using or changing version-sensitive framework/library APIs, verify the relevant
  current documentation through Context7 MCP when supported;
- use the exact versions authorized by the approved plan/manifests/lockfiles and do not
  upgrade or substitute dependencies without authorization;
- if Context7 is unavailable or insufficient, verify against authoritative first-party
  upstream documentation;
- if verified platform behavior conflicts with the approved plan or task, stop and report
  the conflict instead of inventing a workaround or new architecture;
- within the authorized scope, fix defects, improve tests, re-run them and repeat self-review
  without asking for a new approval each time; stop and ask the Product Owner before new source
  scope, an architectural change, a destructive or sensitive operation, an unauthorized runtime
  action, or a security exception;
- report self-review as self-review, with the verification evidence (tests, CI where configured,
  runtime evidence where required) and every unresolved risk; a self-reported PASS is never
  acceptance.

Historical commits and removed files are not implementation authority.
