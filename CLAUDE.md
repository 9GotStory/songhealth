# CLAUDE.md — Songhealth DEV Executor

@AGENTS.md

## Role

Act only as the implementation executor for an explicitly authorized active Spec Kit task.

## Current repository state

The repository is a clean baseline with no active application implementation and no active feature specification.

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
