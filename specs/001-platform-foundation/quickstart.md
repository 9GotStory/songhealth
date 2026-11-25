# Platform Foundation Validation Quickstart

This guide is the planned end-to-end validation contract for Feature 001. The commands become
runnable after the later, separately authorized implementation phase. They intentionally verify the
foundation only; they are not a full production operations manual.

## Prerequisites

- clean checkout of branch `001-platform-foundation` after implementation;
- Node.js 24.21.0 LTS and npm 12.2.0;
- rootless Podman with Quadlet/user-systemd support (Podman 6.1.3 is the researched reference);
- PostgreSQL 18 client tools for `pg_dump` and `pg_restore`;
- a browser with passkey support for the one-time Admin setup/verification;
- a Linux production-capable verification host for Quadlet, private-network, and recreation tests;
- only disposable non-confidential validation text and a public-publishable validation asset.

Record exact tool versions before testing:

```bash
node --version
npm --version
podman version
systemctl --user --version
pg_dump --version
pg_restore --version
```

Expected: recorded versions satisfy the pinned manifest/deployment baseline. A mismatch stops the
run; do not silently continue with a different major.

## 1. Clean-checkout development setup

```bash
npm ci
cp .env.example .env
npm run dev:db:start
npm run dev
```

Supply real local values only in ignored `.env`/secret inputs. At minimum, provide the documented
native runtime inputs: the PostgreSQL runtime connection (`PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER`, `PGPASSWORD`), the EmDash migration connection (`EMDASH_MIGRATION_DATABASE_URL`, which
must identify the same intended database as the `PG*` inputs), the public origin
(`EMDASH_SITE_URL`), and the EmDash encryption key (`EMDASH_ENCRYPTION_KEY`). Media storage needs
no environment value: the native EmDash local-media adapter uses the ignored stable application
path `./media`. Never paste secret values into the evidence log.

Expected:

- `npm ci` uses the committed lockfile without rewriting it;
- PostgreSQL starts in a rootless development container;
- Astro + EmDash start as one process/application;
- `http://localhost:4321/` returns the minimum SSR marker;
- `http://localhost:4321/_emdash/admin/` reaches native setup or native sign-in;
- the independent maintainer requires zero undocumented intervention.

Development may use EmDash's native automatic migration mode. Production acceptance uses the
explicit manifest-driven sequence in Section 3.2.

Complete native setup using a disposable Admin identity and passkey. Confirm the Admin contains no
Songhealth Product collections; the explicit empty seed must prevent example Posts/Pages content
scope.

## 2. Static, focused, and browser checks

```bash
npm run check
npm test
npm run test:browser
npm run build
npm run start
```

Expected:

- type/config checks pass;
- focused tests prove required-config failure and secret redaction;
- browser smoke verifies `/` and the native Admin availability result;
- the production build starts through `dist/server/entry.mjs` using external runtime values;
- no test assumes a public health/readiness endpoint.

## 3. Readiness and startup acceptance

### 3.1 Repeatable operational readiness

Run the private helper on demand:

```bash
npm run verify:readiness
```

Capture the exit status and redacted output for each case:

| Case | Expected result |
|---|---|
| Valid configuration, runtime, database, and readable media mount | `ready`; the private helper succeeds. |
| Missing required configuration | Startup/readiness fails with the field name, never its value. |
| PostgreSQL unavailable | `not-ready`; database identified safely. |
| Expected media mount absent/unreadable | Normal readiness is `not-ready`; no empty replacement store is accepted. |

Expected: the helper is repeatable, private/internal, non-mutating, and produces the listed result
without exposing configured secrets. The normal public `/` response is recorded separately; no
public operational endpoint is required.

### 3.2 Database and migration startup gate

During every supported production deployment/startup procedure, use the migration manifest emitted
by the exact application build. Inspect the intended target, apply pending native migrations, and
then verify the resulting state before the application is declared ready:

```bash
npm run build
npx emdash migrate --status --json
npx emdash migrate --expected-target-fingerprint "$EMDASH_TARGET_FINGERPRINT"
npx emdash migrate --check
```

Derive and verify `EMDASH_TARGET_FINGERPRINT` from the inspected intended target; do not hard-code a
different environment's fingerprint. The apply command consumes `.emdash/migrations.json` emitted
by that exact build. The native migration commands connect through `EMDASH_MIGRATION_DATABASE_URL`;
before acceptance, confirm by non-secret identity components only (host, port, database, user)
that it identifies the same intended database as the `PG*` runtime inputs, and never print the
password or the full URL. Expected: `--status` inspects without mutation, plain `migrate` applies pending
native migrations with EmDash's non-interactive target safety, and `--check` applies nothing and
passes only when no pending or unknown migrations remain. Any status, apply, or check failure blocks
readiness. This gate uses supported EmDash behavior and introduces no custom migration framework or
service.

### 3.3 Media writeability acceptance gate

During deployment/startup acceptance and integration verification, run the documented bounded
write/read/remove probe—or the smallest equally reliable implementation selected later—against the
expected persistent media mount.

Expected: successful write/read/remove evidence is required before the environment is accepted as
ready for use; failure blocks acceptance and no probe file remains. Normal recurring readiness
checks never perform persistent media writes.

## 4. Seed validation state

Through native EmDash Admin:

1. set the native Site Setting `tagline` to the exact disposable public-safe value
   `Songhealth Feature 001 foundation validation`;
2. upload the designated public-publishable media asset;
3. retrieve that same `tagline` and the media through their native boundaries;
4. record the exact UTF-8 tagline value and SHA-256 digest plus the media path, size, and SHA-256 in
   the validation manifest.

Do not use Admin identity, passkey metadata, an arbitrary internal row, or a new Product collection
as the database validation value. Do not add Product collections or production editorial content.

## 5. Production Quadlet smoke and isolation

Install the implemented Quadlet files in the documented rootless user location and reload/start the
user systemd units:

```bash
systemctl --user daemon-reload
systemctl --user start songhealth-app.service
systemctl --user status songhealth-db.service songhealth-app.service
npm run verify:production
```

Expected:

- PostgreSQL becomes healthy before the application is accepted ready;
- the native database/migration startup gate and the media-writeability acceptance gate have both
  passed before the application is declared ready;
- the application is reachable only through the configured loopback/proxy-facing boundary;
- both containers share the private Songhealth network;
- PostgreSQL has no published host port;
- an application-to-database check succeeds;
- every defined unintended host/public PostgreSQL connection attempt is rejected;
- exact image references/digests, Quadlet state, health output, network attachments, and volume
  attachments are captured without secrets.

The verification host must already provide the external HTTPS/proxy boundary for production
passkey UAT. This feature does not select the proxy product.

## 6. Lifecycle durability

Run the operational verification sequence three consecutive times:

```bash
npm run verify:lifecycle
```

Each sequence performs start, stop, restart, and container recreation while retaining the named
database and media volumes. After every operation, it reruns readiness and compares the canonical
native site `tagline` value/digest and media bytes to the validation manifest.

Expected: the exact native site `tagline` value/digest and 100% of designated media remain
retrievable and unchanged for all three cycles. Recreation with either expected volume omitted must
be `not-ready`, not a healthy empty system.

## 7. Recovery drill

### 7.1 Runtime Secret Recovery

Confirm that every required operator-provided runtime secret—including
`EMDASH_ENCRYPTION_KEY`—has an independently protected recovery copy. Record only the secret name,
protected recovery reference/version, and a pass/fail availability result. Do not print or copy the
secret value into the repository, Recovery Set, recovery manifest, transcript, planning artifacts,
or logs. This is a separate recovery dependency and does not create a secret-management platform.

### 7.2 Recovery Set creation and restore

The drill uses `scripts/recovery-set.ts` (`docs/operations/production-foundation.md` §7.6),
which replaced T024–T027's sources in #221 and serves any site, the validation state and real
content alike. On the production host, after T022, in the order of #221's decision 11:

```bash
SET=<an empty directory outside both volumes, mode 0700>
systemctl --user stop songhealth-app.service
node scripts/recovery-set.ts backup production "$SET"     # prints the totals and SHA-256 to record
systemctl --user stop songhealth-db.service
podman volume rm songhealth-db-data songhealth-media      # the drill's recreated persistence only
# Quadlet recreates both volumes: provision them (production-foundation.md §5.1–§5.3) and
# recover the runtime secrets (§7.1, runtime-secret-recovery.md)
systemctl --user start songhealth-db.service
node scripts/recovery-set.ts restore production "$SET"    # type yes for the database, then the media
systemctl --user start songhealth-app.service
```

The Recovery Set is the complete custom-format `pg_dump`, the ustar archive of the media volume
and the manifest, associated with one stopped state but not an atomic snapshot, and holding no
runtime secret. The commands need no database credential: they reach PostgreSQL through
`podman exec` on the database container's local socket.

Expected:

- the backup refuses while the application runs, and writes the three files with the totals;
- the restore admits the set (both archives match the manifest's sizes and SHA-256, `pg_restore
  --list` reads the dump, the media archive holds exactly the manifest's files, the set is
  `production`'s and of the image the unit pins) before it changes anything;
- restore into the freshly provisioned database completes with `--exit-on-error` and no
  schema/table filters, and its integrity check shows zero differences in every table's row count
  and digest, the migrations and every media file;
- the application starts and passes readiness, with no pending native migration;
- independently protected runtime secrets are injected successfully without their values appearing
  in Git or evidence output;
- an incomplete, corrupt, mismatched or other-runtime Recovery Set is refused with nothing changed
  (the planning module's node:test cases, `tests/node/recovery-set.test.ts`); and
- independently, a missing or unusable required runtime secret prevents the restored application
  from being accepted as operationally usable.

This drill does not measure an RTO/RPO, use physical cluster recovery, grant replication privileges,
enable WAL archiving/PITR, create a standby, orchestrate continuous backup, or claim an atomic
database-and-media snapshot. Those production-grade recovery decisions remain deferred.

## 8. Evidence handoff

Provide the independent reviewer with:

- tool, dependency, image, and digest versions;
- clean-checkout setup transcript from a non-author maintainer;
- build/start/public/Admin results;
- readiness matrix and secret-redaction result;
- three lifecycle-cycle reports;
- network/port and volume evidence;
- logical database archive/restore verification, media checksums, non-secret runtime-secret
  recovery result, restore transcript, and final integrity diff;
- confirmation that the explicit out-of-scope capabilities remain absent.

The implementation is not accepted solely because its Multica executor reports success. Under the
accepted governance reconciliation, ChatGPT performs Independent Review against `spec.md`, `plan.md`,
the approved `tasks.md`, the Constitution and `current/10`; the author does not perform that review.
The Product Owner provides final acceptance and explicit bounded implementation authorization.

**Governance note (Constitution 5.0.0)**: for work in this feature that is still open, each requirement in this file to obtain ChatGPT (or Codex) Independent Review PASS/REWORK, to hand off to an independent reviewer, or to execute through a Multica handoff is satisfied by Claude Code execution and self-review with evidence-based Product Owner acceptance (Constitution 5.0.0, Governance). Recorded reviews, verdicts and Codex-accepted source joins remain unchanged provenance; the task requirements, runtime gates, acceptance criteria and required Product Owner authorizations are unchanged.
