# Foundation Data Model

Feature 001 adds no Songhealth Product content collections. The persisted objects below exist only
to configure, verify, and recover the platform foundation. EmDash owns its system schema; later
features define Product collections under their own approved specifications.

## 1. Runtime Configuration

**Persistence**: External process environment, protected secret input, or host deployment
configuration; never application database content solely for configuration convenience.

| Field | Classification | Rules |
|---|---|---|
| Public site origin | Non-secret, environment-specific | Absolute HTTPS origin in production; available at build and runtime where EmDash requires it. |
| Application host/port | Non-secret, environment-specific | Must match the container/proxy boundary and must not expose an unintended interface. |
| PostgreSQL connection | Secret-bearing | References only the private DB boundary; stable least-privilege EmDash role; value never logged. |
| EmDash encryption key | Secret | Valid EmDash key; stored and recovered outside the repository/database/media artifacts; value never logged. |
| Media directory | Non-secret path | Must resolve to the intended persistent media mount in production and be writable. |
| Image references | Non-secret deployment value | Exact version and immutable digest; never unbounded `latest`. |

**Relationships**: Configures the Application Runtime, Persistent Database, and Persistent Media
Store. Required operator-provided secrets have an independent protected recovery procedure linked
to recovery readiness by name/reference only; secret values are never included in the Recovery Set
or reviewable evidence.

**Validation rules**:

- Missing, malformed, or mutually inconsistent required values fail startup/readiness.
- Error and readiness output may name the missing field or dependency but must not print values.
- Committed examples contain names and safe placeholders only.

## 2. Native EmDash Foundation State

**Persistence**: PostgreSQL, in EmDash-owned tables and migrations.

**Fields relevant to this feature**:

- native migration version/state;
- native site setup state;
- native first-Admin identity and passkey metadata created during controlled setup;
- the native site `tagline` setting used as the canonical database validation value;
- native media metadata for the validation asset.

**Relationships**:

- The Admin and public runtime use the same EmDash state.
- Native media metadata points to bytes in the Persistent Media Store.
- The complete logical database archive captures this state; the media archive captures bytes
  separately.

**Validation rules**:

- The committed seed is native EmDash seed format version `1` and defines zero Product collections,
  content, taxonomies, relations, redirects, menus, widgets, or sections.
- No confidential health information or production editorial content may be used.
- Re-running startup/setup against existing state must not overwrite or silently reinitialize it.
- The exact application build's native migration manifest must be inspected, pending migrations
  applied through native EmDash behavior, and the resulting state verified with no pending or
  unknown migrations before the deployment is accepted ready.

## 3. Foundation Validation Record — Native Site Tagline

**Persistence**: The native EmDash Site Setting named `tagline`; not a new Songhealth Product
collection.

| Field | Rules |
|---|---|
| Stable identifier/path | Native EmDash Site Setting `tagline`. |
| Expected value | Exact disposable public-safe text: `Songhealth Feature 001 foundation validation`. |
| Recorded digest | SHA-256 over the exact UTF-8 tagline value, recorded before lifecycle/recovery verification. |

**Relationships**: Recorded in the Recovery Manifest and captured by the complete PostgreSQL
logical archive.

**Validation rules**: The tagline must be retrievable before lifecycle/recovery tests, after each
lifecycle cycle, and after restore; its exact value and digest must match. Admin identity, passkey
metadata, arbitrary internal rows, and a new Product collection are not substitutes for this
validation value.

## 4. Public-Publishable Validation Asset

**Persistence**: Metadata in PostgreSQL; file bytes in EmDash's native local media directory.

| Field | Rules |
|---|---|
| Native media identifier/key | Generated/managed by EmDash. |
| Filename and media type | Non-confidential, explicitly allowed test asset. |
| Byte length | Recorded before lifecycle/recovery tests. |
| SHA-256 digest | Recorded before lifecycle/recovery tests and compared afterward. |

**Relationships**: Native metadata references the stored object; both the database artifact and
media archive are required for complete recovery.

**Validation rules**:

- The asset must be uploadable and retrievable through native EmDash media behavior.
- Bytes, size, and digest remain unchanged through three lifecycle cycles and recovery.
- An unavailable or unreadable expected media mount causes recurring readiness to report
  `not-ready`; failure of the separate writeability acceptance gate prevents the environment from
  being accepted as ready for use. The runtime must not silently substitute an empty directory.

## 5. Readiness Result

**Persistence**: Ephemeral private operator evidence; it is not an application database entity.
Operational readiness is repeatable and callable on demand, and normal recurring evaluation is
non-mutating.

| Field | Rules |
|---|---|
| Overall state | Exactly `ready` or `not-ready` for the required recurring foundation dependencies. |
| Runtime check | Expected SSR marker from loopback `/`. |
| Database check | Bounded successful query/connection against the configured database. |
| Database/migration startup gate | The exact build's native manifest is inspected with `emdash migrate --status`; pending migrations are applied with native `emdash migrate` using target-fingerprint safety when required; `emdash migrate --check` then verifies no pending or unknown migrations. Failure blocks readiness and does not invoke a custom migration framework or service. |
| Media recurring check | Expected mount presence/readability, evaluated without mutation. |
| Media writeability gate | Deployment/startup or integration evidence proves writeability with a bounded reversible probe or equally small reliable mechanism before the environment is accepted as ready for use. |
| Timestamp/context | ISO 8601 timestamp and environment label; no secret-bearing values. |
| Failed dependency | Safe dependency name/reason when not-ready. |

**Relationships**: Reflects the Application Runtime and both persistence boundaries. It may be
consumed by Podman health/systemd readiness and retained as acceptance evidence. The recurring
operational result and the two deployment/startup gates are distinct evidence; readiness is not
declared until the native database/migration gate and media-writeability gate have passed.

**State transitions**:

```text
starting -> ready                 when startup gates and recurring dependency checks pass
starting -> not-ready             when any required check fails
ready -> not-ready                when database/media/runtime becomes unavailable
not-ready -> ready                only after all required checks pass again
restoring -> not-ready            until restore and integrity verification both succeed
restoring -> ready                after complete verified recovery
```

No public endpoint is implied by these states.

## 6. Recovery Set and Manifest

**Persistence**: Operator-controlled backup location outside both runtime containers and active
persistent volumes.

| Field/artifact | Rules |
|---|---|
| PostgreSQL logical archive | Complete unfiltered custom-format dump of the EmDash database schema and data. |
| Media archive | Complete archive of the expected persistent media directory for the known validation state. |
| Database verification evidence | Readable archive table of contents, successful error-stopping restore into a clean database, native status/apply/check migration result, and exact native `tagline` value/digest comparison. |
| Media checksum manifest | Path, size, and SHA-256 for every designated media file. |
| Recovery metadata | One recovery-set identifier, ISO 8601 creation time, PostgreSQL/tool versions, artifact checksums, and expected validation items from the same known state. |

**Relationships**: Database and media artifacts together restore Native EmDash Foundation State and
the Validation Asset. The manifest associates both artifacts with one known validation state; it
does not make their creation atomic. The Recovery Set contains the database and media artifacts and
their common association evidence; it does not contain runtime secrets or secret-recovery material.

**Validation rules**:

- A set missing either artifact when both were present is incomplete and must fail validation.
- The logical archive checksum and table of contents must validate before restore begins.
- Restore targets a clean PostgreSQL database and clean media volume; the source active stores are
  not overwritten by the acceptance drill.
- `pg_restore` must use no schema/table filters and must stop on the first restore error.
- The exact native site `tagline` value/digest and all designated media must be restored, with zero
  unexplained differences.
- A corrupt archive, failed restore, or mismatched manifest fails closed.

## 7. Runtime Secret Recovery Evidence

**Persistence**: Reviewable evidence contains only required secret names, an opaque protected-backup
version/reference, and pass/fail results. Secret values and access credentials remain solely in the
independently protected operator mechanism.

**Relationships**: This evidence is not part of the database/media Recovery Set. Recovery readiness
requires both a verified Recovery Set and successful restoration of required runtime secrets into
the external runtime secret boundary before the recovered application is accepted ready.

**Validation rules**:

- At minimum, the inventory includes `EMDASH_ENCRYPTION_KEY` and any other operator-provided secret
  that the implemented foundation actually requires.
- The protected backup must be available independently of Git, active containers, the active
  database/media volumes, and their recovery artifacts.
- Restoration must produce only a pass/fail result or opaque version reference; values must not
  enter Git, planning artifacts, command transcripts, logs, or review evidence.
- A missing or unusable required secret prevents recovery readiness.

## Boundary Summary

```text
Astro SSR + native EmDash Admin
       |                 |
       v                 v
PostgreSQL state     Native media directory
       |                 |
       v                 v
Logical DB archive   Separate media archive
       |                 |
       +--------+--------+
                |
                v
     Recovery Set + manifest ------+
                                    |
Protected secret backup/recovery   |
                |                   |
                v                   |
        Secret recovery evidence ---+
                                    |
                                    v
                          Verified recovery readiness
```

There are no Domain/Application/Policy entities, repository abstractions, custom media records, or
pre-designed Songhealth content types in this model.
