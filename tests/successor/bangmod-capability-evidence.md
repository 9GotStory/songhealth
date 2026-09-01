# Actual Bangmod Capability Evidence — Delivery 002 (T050 checklist / T054 execution record)

Quickstart §9 record for the approved Production baseline check: Bangmod
Expert Hosting / DirectAdmin (spec.md FR-002; SC-009). Recorded by the DEV
Executor; independent review is Codex/Human owned.

## Evidence rule (binding)

Only **direct, account-specific, redacted evidence** collected by an
authorized operator against the actual account may resolve a fact below.
Public Bangmod/DirectAdmin documentation, marketing pages, package lists, or
general platform knowledge are **not** account proof and can never create a
Production version or capability lock. Every fact without direct account
evidence stays `DEFERRED-EVIDENCE-GATE` and triggers bounded re-evaluation
when access is later authorized. No environment, version, or topology detail
is invented here, and no Production deployment, migration, or cutover work is
authorized or performed by this record (FR-002, FR-027, FR-028).

## T050 — the actual-account evidence checklist

For each fact: what direct evidence would resolve it (collected through the
account's own control panel / SSH session / file manager / DNS and TLS
state), and the safe redaction applied before recording.

| # | Capability fact | Direct evidence that resolves it | Redaction on recording |
| - | --------------- | -------------------------------- | ---------------------- |
| 1 | PHP version available to the account (and per-site selection) | Control-panel PHP version display for the actual site; a phpinfo-equivalent output read inside the account | Record major.minor.release + selector capability only; no paths, no modules dump beyond the required extension list |
| 2 | Required PHP extensions (for WordPress Core + the foundation: e.g. mysqli/pdo-mysql, json, mbstring, openssl, fileinfo, gd/imagick as actually required) | Extension list from the account's PHP environment | Extension names + present/absent; no configuration values |
| 3 | Database compatibility and access (MySQL/MariaDB line, database/user provisioning, reachable host) | Control-panel DB page; a connection from the account to a created disposable database | Engine + version line; host recorded as "account-internal" — never the hostname, user, or credential |
| 4 | HTTPS / domain posture (certificate issuance, TLS suitability for the canonical origin) | Live TLS state of the actual domain from the account's provisioned certificate | Domain recorded redacted (`<domain>`); CA + grade summary only |
| 5 | Document root control (per-site root, ability to place the WordPress installation at the root) | Control-panel domain → document-root mapping | Structure only (`<docroot>`), no absolute paths |
| 6 | Protected-file controls (out-of-docroot placement OR server-denied location for protected binary storage; `.htaccess`/Require rules honored) | A placement/probe result inside the account: a file readable only through mediation, direct URL denied | Denial status + method; never the storage path or filename |
| 7 | Git / deployment path (composer/wp-cli availability on host or a build-artifact upload flow) | Command availability or the documented upload flow exercised on the account | Tool + version or flow shape; no credentials |
| 8 | Required cron/CLI (WP-Cron vs system cron availability, CLI PHP) | Cron entry capability in the panel; CLI PHP invocation | Present/absent + schedule shape |
| 9 | Log access (web + PHP error logs reachable, bounded retention) | Panel log viewer or log file download for the actual site | Log kinds + retention figure; no log contents |
| 10 | Backup/restore capability (account-level backups, restore drill on a disposable copy) | A restore drill result on a disposable copy inside the account | Capability + drill outcome; no data contents |
| 11 | React hosting shape (static/SSR serving of the public application at the canonical origin) | The served application shape observed on the account | Shape + status; no origin values beyond the redacted domain |
| 12 | Endpoint routing (canonical React routes vs WordPress REST paths both reachable without conflict) | Live route probes against the account's origins | Status codes per route shape; no hostnames |

## T054 — execution record

- **Status:** NOT EXECUTED — no actual Bangmod account access is available to
  this implementation run. No credentials, control panel, SSH, DNS, or TLS
  access to the real account exists in this environment, and this batch's
  authorization provides none.
- **Result per fact:** every fact in the checklist above (1–12) is recorded
  as **`DEFERRED-EVIDENCE-GATE`**. Nothing is resolved, and no Production
  version or capability lock is created, assumed, or narrowed.
- **Consequence:** all Production-specific decisions remain open, including
  Production PHP/WordPress/database versions, the Production protected-binary
  storage realization (out-of-docroot vs server-denied location), Production
  TLS posture, deployment flow, cron choice, log retention, backup/restore
  drill, and the React hosting/routing shape. The Frozen deployment baseline
  (HTTPS-only public origin) continues to govern configuration validation
  (T006 `production` rules) without asserting any account fact.
- **Re-evaluation:** when an authorized operator with actual account access
  executes the checklist, each row's direct evidence is recorded here
  (redacted per the table) and reviewed independently; contradictions or gaps
  stay deferred rather than resolved by inference (quickstart §9).

## Boundary notes

- No `DEFERRED-EVIDENCE-GATE` row is treated as PASS, and none blocks the
  local verification work this Delivery is scoped to (tasks.md US4
  checkpoint).
- This record does not authorize Production deployment, importer work, Trial
  Migration, Production Import, cutover, legacy retirement, or speculative
  infrastructure (FR-027, FR-028).
- Reviewer (independent): pending Codex review of this batch; Human
  acceptance where required.
