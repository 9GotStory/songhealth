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
database URL, EmDash encryption key, site origin, and media path. Never paste secret values into the
evidence log.

Expected:

- `npm ci` uses the committed lockfile without rewriting it;
- PostgreSQL starts in a rootless development container;
- Astro + EmDash start as one process/application;
- `http://localhost:4321/` returns the minimum SSR marker;
- `http://localhost:4321/_emdash/admin/` reaches native setup or native sign-in;
- the independent maintainer requires zero undocumented intervention.

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

## 3. Operational readiness matrix

Run the private helper and native migration check:

```bash
npm run verify:readiness
npx emdash migrate --check
```

Capture the exit status and redacted output for each case:

| Case | Expected result |
|---|---|
| Valid configuration, runtime, database, migrations, and media mount | `ready`; both commands succeed. |
| Missing required configuration | Startup/readiness fails with the field name, never its value. |
| PostgreSQL unavailable | `not-ready`; database identified safely. |
| Pending/unknown native migration | Release/start check fails; deployment is not accepted ready. |
| Expected media mount absent/unreadable | Normal readiness is `not-ready`; no empty replacement store is accepted. |
| Media mount unwritable during deployment/startup verification | Startup acceptance fails; the bounded reversible probe leaves no test file. |

Expected: all defined checks produce the listed result and no output contains a configured secret.
The normal public `/` response is recorded separately from operational ready/not-ready evidence.
Normal recurring probes do not write to persistent media; writeability is tested explicitly during
deployment/startup and integration verification.

## 4. Seed validation state

Through native EmDash Admin:

1. set the designated disposable native site/system value;
2. upload the designated public-publishable media asset;
3. retrieve the value and the media through their native boundaries;
4. record the database value's canonical digest and the media path, size, and SHA-256 in the
   validation manifest.

Do not add Product collections or production editorial content.

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
database and media volumes. After every operation, it reruns readiness and compares the designated
database value and media bytes to the validation manifest.

Expected: 100% of designated records/media remain retrievable and unchanged for all three cycles.
Recreation with either expected volume omitted must be `not-ready`, not a healthy empty system.

## 7. Recovery drill

Before creating artifacts, confirm that every required operator-provided runtime secret—including
`EMDASH_ENCRYPTION_KEY`—has an independently protected recovery copy. Record only the secret name,
protected recovery reference/version, and a pass/fail availability result. Do not print or copy the
secret value into the repository, recovery manifest, transcript, or planning artifacts.

Quiesce validation writes, assign one recovery-set identifier, then create a complete unfiltered
PostgreSQL custom archive and the separate media archive:

```bash
export RECOVERY_DIR=/approved/backup/location
pg_dump --format=custom --file "$RECOVERY_DIR/database.dump" "$PGDATABASE"
pg_restore --list "$RECOVERY_DIR/database.dump"
tar --create --file "$RECOVERY_DIR/media.tar" --directory "$MEDIA_DIRECTORY" .
sha256sum "$RECOVERY_DIR/database.dump" "$RECOVERY_DIR/media.tar"
```

Use a protected PostgreSQL connection mechanism; do not place database credentials on the command
line or in captured output. Record the recovery-set identifier, ISO timestamp, tool/server versions,
artifact checksums, and expected database/media validation evidence in the manifest. The two
artifacts are associated with the same quiescent state but are not an atomic snapshot.

Restore the required runtime secrets through the external protected mechanism, then restore into a
new empty database and media volume—not over the active source stores:

```bash
pg_restore --exit-on-error --no-owner --no-privileges \
  --dbname "$RESTORE_DATABASE" "$RECOVERY_DIR/database.dump"
tar --extract --file "$RECOVERY_DIR/media.tar" --directory "$RESTORE_MEDIA_DIRECTORY"
npx emdash migrate --check
npm run verify:restored-foundation
```

Expected:

- the complete PostgreSQL logical archive and media archive both match their recorded checksums;
- `pg_restore --list` can read the database archive before restore;
- restore into the clean database completes with zero ignored restore errors and no schema/table
  filters;
- the restored database contains the complete designated EmDash validation state and has no pending
  or unknown native migrations;
- restored media is available through native EmDash behavior;
- 100% of designated validation records and media are present;
- canonical record values, file sizes, and SHA-256 digests show zero unexplained differences;
- independently protected runtime secrets are injected successfully without their values appearing
  in Git or evidence output;
- an incomplete, corrupt, mismatched, or unusable recovery set—or a missing required secret—fails
  and is never reported as recovered.

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

The implementation is not accepted solely because the executor reports success. Codex performs the
independent review against `spec.md`, `plan.md`, the later approved `tasks.md`, the Constitution, and
`current/10` before Product Owner acceptance.
