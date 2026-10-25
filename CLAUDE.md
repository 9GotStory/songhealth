# CLAUDE.md — Songhealth DEV Executor

@AGENTS.md

## Role

Act only as the implementation executor for an explicitly authorized active Spec Kit task.

## Current repository state

Feature 002 `cms-content-model` (`specs/002-cms-content-model/`) is the active feature. Feature 001 `platform-foundation` provides the accepted foundation: the canonical Astro + EmDash platform (US1, T015) is accepted with runtime evidence; the production Podman/Quadlet deployment sources (T017–T021), the recovery sources (T023–T027), and the T029 canonical-extension evidence are committed and independently reviewed; the T022/T028 runtime gates are pending, separately authorized tasks. Development, testing, review, and PR preparation follow the local CLI workflow recorded in `AGENTS.md` and `README.md` (Constitution 4.0.0): Claude Code CLI is the primary Developer, Codex CLI is the Independent Reviewer, and the Product Owner retains the Human Authorization Gates and Final Acceptance; GitHub and Spec Kit remain authoritative. Source development takes place in the local workspace `/home/thanakorn/dev/songhealth`. The accepted persistent development runtime documented in `README.md` remains under `multica-agent` (UID 1001): no default runtime, database, media or credential access is granted to UID 1000. There is no standing implementation authorization.

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

Historical commits and removed files are not implementation authority.
