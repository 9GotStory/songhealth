# Runtime Secret Recovery (Feature 001)

Operator documentation for the independently protected runtime-secret recovery path of the
Songhealth production foundation: the inventory of every secret the as-built foundation actually
requires, the ownership and protected backup/reference expectations for each entry, the restore
procedure into the existing external runtime boundary, the same-key requirement for
`EMDASH_ENCRYPTION_KEY`, ordered availability/restoration/usability checks, and the non-secret
evidence procedure. This document describes the accepted deployment **as built**; it selects no
secret-management platform, adds no policy or mechanism, and performs no runtime operation.

**Authority** (in the repository's authority order): the Constitution
([`.specify/memory/constitution.md`](../../.specify/memory/constitution.md));
[`docs/website-modernization-docs/current/10-system-blueprint.md`](../website-modernization-docs/current/10-system-blueprint.md)
§§18–20.1; the approved Feature 001 artifacts in
[`specs/001-platform-foundation/`](../../specs/001-platform-foundation/) — in particular
[spec.md](../../specs/001-platform-foundation/spec.md) FR-007/FR-014 and the *Runtime Secret
Recovery* entity, [plan.md](../../specs/001-platform-foundation/plan.md) *Configuration and
secrets* and *Backup, restore, and secret recovery*, [research.md](../../specs/001-platform-foundation/research.md)
§10, [data-model.md](../../specs/001-platform-foundation/data-model.md) §§6–7,
[quickstart.md](../../specs/001-platform-foundation/quickstart.md) §7.1, and
[tasks.md](../../specs/001-platform-foundation/tasks.md) T023; and, as the as-built evidence for
every behavior claimed below:

| Artifact | Role |
|---|---|
| [`deploy/quadlet/songhealth-app.container`](../../deploy/quadlet/songhealth-app.container) | application unit — the two Podman secrets, the environment file, and the startup gates that consume them |
| [`deploy/quadlet/songhealth-db.container`](../../deploy/quadlet/songhealth-db.container) | database unit — the bootstrap secret and initialization-only consumption |
| [`.env.example`](../../.env.example) | the committed variable-name contract and secret classification |
| [`tests/operations/verify-startup.sh`](../../tests/operations/verify-startup.sh) | T013 startup-acceptance gate (S1–S6), including identity agreement and secret scrubbing |
| [`scripts/verify-readiness.mjs`](../../scripts/verify-readiness.mjs) | T012 recurring readiness helper (redacted output) |
| [`production-foundation.md`](production-foundation.md) | T021 operations documentation — §4.3 environment files, §4.4 protected secret inputs, §5.2 least-privilege role, §7–§8 lifecycle and readiness |

**Verification status**: this document is a documentation-only deliverable (T023). It records no
runtime evidence and fabricates none: every evidence row below ships as **pending**. Runtime
secret recovery is exercised only by the separately authorized recovery drill (T028), which
requires the T022 runtime PASS plus Codex-accepted sources for all of T023–T027. See §11.

## 1. Scope, authority, and verification status

In scope here: the secret inventory of the Feature 001 foundation as built, ownership and access
responsibility, the independently protected recovery copy and its version selection, restoration
into the existing external runtime boundary, ordered availability/restoration/usability checks,
rotation and escalation boundaries, and the non-secret evidence procedure.

Out of scope, unchanged:

- **Selecting or building a secret-management platform** — the operator's existing protected
  mechanism is used; Feature 001 deliberately adds none (spec *Runtime Secret Recovery* entity;
  research §10; blueprint §18).
- **Placing secret values or access credentials in Git, images/build artifacts, tests,
  transcripts, planning artifacts, logs, or review evidence** — including this document. Every
  example below uses placeholders only.
- **Backup/restore of database and media** — the Recovery Set procedure is the later T025–T027
  source work; this document treats it only as a separate, independently required dependency
  (data-model §6–§7).
- **Any RTO/RPO, schedule, retention, or rating policy** — no time or rating threshold applies
  (spec clarification 2026-10-06); none is invented here.
- **Destructive reset of any store, and any unsupported key-rotation procedure** (§9).
- **Executing the drill** — T028, gated on T022 PASS and accepted T023–T027 sources (§11).

## 2. What runtime-secret recovery is — and is not

Runtime Secret Recovery is the independently protected recovery path for the required external
runtime secrets and keys (spec *Key Entities*). It is a **separate recovery dependency**, not a
Recovery Set artifact: the Recovery Set contains only the database archive, the media archive, and
their common association evidence — never secrets or secret-recovery material (data-model §6).

Three facts follow, and none may be collapsed:

1. **Both are required for recovery readiness.** A valid Recovery Set with unrecovered secrets is
   not an operationally usable recovery; recovered secrets over an invalid Recovery Set are not a
   recovery of the state at all. FR-014: "Required runtime secrets and keys MUST have an
   independently protected recovery path **before the restored application is accepted as
   operationally usable**."
2. **Source review proves neither.** This document is source-level documentation only; it
   establishes no runtime fact about any secret, store, or host. Only the authorized drill (T028)
   produces recovery evidence.
3. **Recovery means the same applicable values.** Recovering a secret means restoring the value
   (or, for the encryption key, the applicable key list — §7) that belongs to the state being
   recovered into the external runtime boundary. Generating a fresh replacement value and
   restarting is re-provisioning, not recovery, and must never be reported as recovery (§7, §9).

## 3. Secret inventory (as built)

The complete inventory of secret-bearing inputs the as-built foundation actually consumes. Every
entry cites its consuming unit; **nothing else is a required secret**, and no additional
credential may be invented. The non-secret inputs are listed afterwards because secret recovery
is meaningless without their identity agreement (§6.4).

| # | Secret / secret-bearing input | Class | Mechanism (as built) | Consumed by |
|---|---|---|---|---|
| 1 | `PGPASSWORD` — the least-privilege application role's credential | application runtime | one key of the operator-managed, host-protected file `~/.config/containers/systemd/songhealth-app.env` (mode `0600`), forwarded by bare name into the application container's configured environment | `songhealth-app.container` — `Environment=PGPASSWORD` forwarding; every application database connection, including the startup prerequisites, the T013 gate, and the T012 readiness helper / healthcheck |
| 2 | the password embedded in `EMDASH_MIGRATION_DATABASE_URL` (the URL's identity components — host, port, database, user — are non-secret) | application migration | Podman secret `songhealth-migration-database-url`, mounted read-only at `/run/secrets/`, read by the startup command and exported only into the application process environment | `songhealth-app.container` — startup command; the T013 gate's native migration status/apply/check calls |
| 3 | `EMDASH_ENCRYPTION_KEY` | application encryption key | Podman secret `songhealth-encryption-key`, same read-only mount and process-environment-only export | `songhealth-app.container` — startup command; the application process (§7) |
| 4 | `songhealth-db-password` — the **bootstrap administrator** credential | bootstrap (initialization only) | Podman secret `songhealth-db-password`, mounted at `/run/secrets/` and consumed through the official image's native `POSTGRES_PASSWORD_FILE` input | `songhealth-db.container` — cluster initialization (Phase A) only |

Why entry 4 is **not** an application credential: the official PostgreSQL image initializes
`POSTGRES_USER` as the cluster bootstrap administrator *with superuser privileges*. That
administrator identity is deliberately distinct from the application's `PGUSER`, and the
application unit's startup prerequisites structurally reject it (the connecting role must not be
`SUPERUSER` and must hold neither `CREATEDB` nor `CREATEROLE`). The application role is the one
stable, least-privilege role matching `PGUSER`, with its own separately protected credential —
entry 1 — never `songhealth-db-password` and never the bootstrap administrator
([`production-foundation.md`](production-foundation.md) §5.2). The bootstrap credential is
consumed only at Phase A initialization; normal startup contains no initialization path, so
replacing the secret never changes an existing cluster's stored bootstrap credential (§9).

**No additional credential exists in the foundation.** The backup/restore procedures planned for
T025–T026 consume the same protected `PG*` / migration inputs through a protected connection
mechanism (quickstart §7.2) — the foundation defines no separate "backup credential," and none
may be introduced under this document. The committed
[`.env.example`](../../.env.example) is the variable-name contract: its two remaining named
inputs are non-secret, and no secret value is committed anywhere.

**Non-secret external inputs (not part of secret recovery).** `HOST`, `PORT`, `PGHOST`,
`PGPORT`, `PGDATABASE`, `PGUSER`, `EMDASH_SITE_URL` (in `songhealth-app.env`), and
`POSTGRES_USER`, `POSTGRES_DB` (in `songhealth-db.env`) are non-secret identity and boundary
inputs. Restoring them is ordinary configuration restore outside this document's scope — but the
recovered platform cannot start or authenticate without them, and the identity ones participate
in the agreement checks of §6.4. Secret recovery covers exactly entries 1–4.

## 4. Ownership and access responsibility

Every entry in §3 is owned end to end by the **deployment operator** — the human administrator of
the non-root account that owns the user-systemd deployment, its environment files, and its Podman
objects ([`production-foundation.md`](production-foundation.md) §3–§4). Ownership spans five
responsibilities, none of which any committed artifact, image, unit, or automation performs:

1. **Create** each secret once, from a protected file, never from a value on the command line
   (§6.2).
2. **Protect** the live inputs: `songhealth-app.env` at mode `0600` operator-owned; Podman
   secrets in the deployment user's rootless secret store. Access to the values is bounded to the
   deployment host account and the mechanisms themselves — the units forward or mount them by
   name, and no committed component reads, logs, or serializes them.
3. **Keep the independently protected recovery copy** of every entry, with version references
   (§5).
4. **Restore** entries into the external runtime boundary when recovering (§6).
5. **Record the non-secret evidence** of availability/restore/usability (§10).

Access rules that hold for every responsibility: values and access credentials never enter Git,
images or build artifacts, tests, transcripts, planning artifacts, logs, or review evidence; the
units and gates print field names, conditions, and non-secret identity components only; raw
`podman inspect` of the application container (which carries `PGPASSWORD` in its `Env`) and any
dump of the application process environment are secret-bearing output and are never pasted into
evidence (§10; [`production-foundation.md`](production-foundation.md) §4.3, §9).

## 5. Independently protected recovery copies and version selection

### 5.1 The copy and its independence

Each §3 entry has a recovery copy kept in the operator's existing protected mechanism outside the
repository. Feature 001 selects no product for this; whatever mechanism the operator governs is
acceptable **only if** the copy is:

- **access-protected** — unavailable to anyone without deliberate operator authorization, and
  protected at rest comparably to the live inputs;
- **independently available** — reachable without the deployment platform running, and
  independent of:
  1. Git and every repository artifact;
  2. the active containers (any container layer, configured environment, or mounted secret file);
  3. the active database and media volumes;
  4. the database/media Recovery Set artifacts — the copy is never placed inside a Recovery Set
     or its manifest (data-model §6–§7); and
  5. the active runtime secret store itself — a value that exists only as a live Podman secret or
     only in `songhealth-app.env` on the deployment host is not a recovery copy; the copy must
     survive loss of the deployment host's rootless Podman storage and environment files.

Staging a value out of the copy (§6.2) is the only intended read path; the copy itself is never
displayed, never attached, and never pasted anywhere.

### 5.2 Version selection

Recovery is state-specific: each known validation state (identified by its Recovery Set
identifier) has an applicable value — or, for entry 3, an applicable key list (§7) — for every
entry. The operator therefore records, per known state, the **opaque protected recovery
reference/version** of each entry's applicable copy: a label that identifies which protected
version to stage (a password-manager entry id, a versioned file label — the reference itself
carries no value and no access credential). Two rules keep the association honest:

- The reference/version association is recorded **in the secret-recovery evidence only**
  (§10's template has a column for it), never inside the Recovery Set manifest, which contains no
  secret-recovery material.
- **Ambiguity refuses.** If the applicable version for the target state cannot be determined,
  availability is a **fail**, not a guess; staging an unverified version and "testing whether it
  works" against the recovered platform is prohibited (§9).

## 6. Restore into the external runtime boundary

Restoration targets the accepted external input mechanism of the deployment being recovered —
the same three Podman secret names and the same environment-file key set consumed by the as-built
units ([`production-foundation.md`](production-foundation.md) §4.3–§4.4) — never a new mechanism,
and never the units themselves. All examples use placeholders; no real value appears in any
command, argument, or output in this document.

### 6.1 Preconditions

Restore runs only when §8 stage A (availability) has passed for every entry, and — for a full
platform recovery — alongside the separately authorized Recovery Set restore (T026), which is an
independent dependency (§2). Do not run restoration steps "to see if the value looks right":
values are never displayed.

### 6.2 Procedure

1. **Stage, don't show.** Write the applicable version of each entry from the protected recovery
   copy into a protected staging file (mode `0600`, operator-owned, outside Git, outside the
   containers and volumes), using the operator's mechanism. No value on a command line, no shell
   tracing (`set -x` and equivalents stay off), no terminal echo of file contents.

   ```bash
   # mechanism chosen by the operator; placeholders only — never a real value as an argument
   # <staging-file> examples: a mode-0600 file in an operator-controlled protected directory
   ```

2. **Recreate the three Podman secrets from the staging files.** The command line carries only
   the path; `--replace` updates an existing secret of the same name:

   ```bash
   podman secret create --replace songhealth-db-password <protected-staging-file>
   podman secret create --replace songhealth-migration-database-url <protected-staging-file>
   podman secret create --replace songhealth-encryption-key <protected-staging-file>
   ```

   Replaced secrets reach **newly created containers only** — an existing container keeps the old
   value until it is recreated (verified Podman behavior, Appendix B) — so step 4 is not
   optional.

3. **Restore `PGPASSWORD` into the environment file.** Update the `PGPASSWORD` key of
   `~/.config/containers/systemd/songhealth-app.env` with the applicable credential, written in
   the representation that round-trips its intended bytes exactly — the accepted
   `EnvironmentFile` comment/quoting rules apply (no inline comments, backslash and quote
   handling; [`production-foundation.md`](production-foundation.md) §4.3). If authentication
   fails while the credential is otherwise confirmed, suspect the file encoding first: fix the
   representation, never the value. Keep the file at mode `0600`. No other key of the file is a
   secret; non-secret keys are restored as ordinary configuration (§3).

4. **Recreate the containers so replaced values reach the runtime.** The Quadlet lifecycle does
   this natively — a stop removes the container, the next start creates a fresh one
   ([`production-foundation.md`](production-foundation.md) §7.2):

   ```bash
   systemctl --user stop songhealth-app.service songhealth-db.service
   systemctl --user start songhealth-app.service
   ```

5. **Remove the staging files** in the operator's usual protected way once restoration is
   accepted.

6. **Record the evidence** — per-entry restore result and opaque reference only (§10).

### 6.3 What restore does not do

Restore never: writes any value into Git, an image, a build artifact, a test, a transcript, or a
log; edits the committed units; changes identity components (§6.4); re-keys the encryption
secret (§7); or initializes, resets, or repairs any store. A refusal encountered after restore is
investigated at its named prerequisite (§8.3), never worked around.

### 6.4 Identity and credential agreement (no values disclosed)

Two agreements must hold after restoration; both are enforced by existing, accepted gates that
compare **non-secret components only** and never print credentials or full URLs:

- **`PG*` / migration identity agreement.** The migration URL staged into
  `songhealth-migration-database-url` must identify the same intended database as the `PG*`
  inputs — same host, port, database, and user. The T013 gate's S1 proves the agreement by
  comparing those non-secret identity components and re-proves it in S3 against the inspected
  native target label; a mismatch blocks startup naming the mismatching component only
  ([`tests/operations/verify-startup.sh`](../../tests/operations/verify-startup.sh) S1;
  [`production-foundation.md`](production-foundation.md) §4.4).
- **Application credential agreement.** The recovered `PGPASSWORD` must authenticate as the
  configured `PGUSER` against the recovered cluster. Cluster-global roles — the application role
  and the bootstrap administrator — are **not** contained in a single-database `pg_dump` archive
  (roles are cluster-wide; Appendix B), so after any clean-cluster restore the operator
  re-provisions the least-privilege application role per
  [`production-foundation.md`](production-foundation.md) §5.2 with a credential matching the
  recovered entry 1. Disagreement surfaces as the application unit's failed prerequisite
  connection or S1 — fail-closed, value-free — and is fixed at the credential/provisioning side,
  never by weakening the prerequisite.

The bootstrap identity stays distinct throughout: `POSTGRES_USER` is never `PGUSER`, and
`songhealth-db-password` is never an application credential (§3).

## 7. `EMDASH_ENCRYPTION_KEY`: the same-key requirement

### 7.1 What the key is and what it protects

`EMDASH_ENCRYPTION_KEY` encrypts EmDash plugin settings declared with the secret setting type
(AES-GCM, with the plugin ID and setting key as authenticated data). The value is
operator-provided and never stored in the database; EmDash generates correctly formatted values
(`emdash_enc_v1_` followed by 32 random bytes) through its documented generate command. A
malformed value produces an operator-facing startup message, and operations that need encrypted
plugin settings **fail closed** while unrelated site requests continue (Appendix B).

Two verified consequences anchor this section (Appendix B):

- **A database backup does not contain the key.** Restoring a database without every key its
  encrypted settings reference leaves those settings unreadable.
- **Values carry a stored key fingerprint (`kid`).** During native rotation older keys are
  retained in a comma-separated list, and reads select the older key by `kid`. The "applicable"
  recovery material for a state may therefore be a **list of keys**, not one key.

### 7.2 Recovery restores the same applicable key(s)

Recovery of a database state requires the **same applicable key list** for that state:

- Recovering only the newest key when the state's stored settings reference an older `kid` leaves
  those settings unreadable — the recovery is incomplete for exactly the entries encrypted under
  the missing key.
- **A newly generated key is not recovery.** Generating a fresh key and starting the application
  produces a deployment that *cannot read* the restored state's encrypted settings; presenting it
  as "recovered" is prohibited. A lost key with no usable protected copy is an escalation (§9),
  never a re-key.
- Version selection (§5.2) for this entry identifies the applicable key list, and the staged
  secret material is exactly that list (in the documented comma-separated form when more than one
  key applies).
- If the required key, or any key in its applicable list, is missing or unusable: the entry's
  availability result is **fail**, operational recovery acceptance is prevented (§8), and the
  operator escalates (§9). The application's own fail-closed behavior — refusing operations that
  need encrypted settings, with an operator-facing message for a malformed value — is the runtime
  backstop, not a substitute for the protected copy.

Feature 001's explicit empty seed means no plugin settings (secret or otherwise) are seeded
today, and the foundation's validation state does not depend on encrypted settings. That does
not weaken this section: the accepted research decision (research §10) explicitly rejected
ignoring secret recovery on that basis, because foundation recovery must preserve the runtime
boundary later bounded features depend on. The recovery path is the same-key path regardless of
how many settings currently exist.

## 8. Ordered availability, restoration, and usability checks

The three stages run **in order**; each entry's evidence (§10) records the per-stage result. A
**missing or unusable required secret at any stage prevents operational recovery acceptance** —
recovery readiness is denied, not deferred to a footnote.

### 8.1 Stage A — availability (no runtime operation)

For each §3 entry, against the target known state:

1. The protected recovery copy exists and is readable through the operator's mechanism, under
   the recorded opaque reference (§5.2).
2. Independence holds (§5.1): the copy is reachable without the platform running and lives
   outside Git, the active containers and secret store, the active volumes, and the Recovery Set
   artifacts.
3. The applicable version/key-list is identified unambiguously (§5.2, §7.2).

A `fail` at any point stops before stage B; nothing is staged.

### 8.2 Stage B — restoration (per §6)

Stage the applicable versions, recreate the three Podman secrets from staging files, restore
`PGPASSWORD` into the environment file in an exact-byte representation, recreate the containers,
remove the staging files. The restore result per entry is the observable outcome of those steps —
secret existence after recreation can be confirmed name-only:

```bash
podman secret ls --format '{{.Name}}'
```

### 8.3 Stage C — usability (existing fail-closed signals; no new mechanism)

Usability is proven by the accepted production gates themselves — this document adds no
verification mechanism:

- **Missing Podman secret** → container creation fails for the affected unit (both units require
  their secrets at creation).
- **Missing or empty `PGPASSWORD`** → the application unit's `ExecCondition` **skips** the unit
  before any container exists (skip semantics, not failure;
  [`production-foundation.md`](production-foundation.md) §8.3).
- **Identity or credential disagreement** → the application unit's least-privilege/public-only
  schema prerequisites or the T013 gate's S1 refuse, naming the failed prerequisite or the
  mismatching **non-secret** component only.
- **Full startup acceptance** → the application unit's startup sequence passes the prerequisites
  and the T013 gate S1–S6, whose PASS markers land in the unit journal:
  `journalctl --user -u songhealth-app.service -e` (gate output is secret-scrubbed by design).
  The migration status/apply/check sequence must pass against the recovered database — it is the
  startup gate, not an optional check.
- **Aggregate readiness** → the T012 helper reports `ready`:
  `podman exec systemd-songhealth-app node scripts/verify-readiness.mjs` (redacted output;
  [`production-foundation.md`](production-foundation.md) §8.2).

A usability signal that names a secret-bearing input as missing or unusable marks that entry
**fail**; investigate the named prerequisite, never the output, and never print the value while
investigating.

### 8.4 Relationship to the Recovery Set and later integrity verification

These stages prove secret recovery only. Recovery Set validity (archive readability, checksums,
error-stopping restore, migration state) and post-restore integrity (the exact native site
`tagline` value/digest and every designated media digest) are proven by the separately authorized
T025–T027 sources and the T028 drill (quickstart §7.2). Operational recovery acceptance requires
both halves; §8 alone proves only one (§2).

## 9. Rotation and escalation boundaries

### 9.1 Rotation: no policy exists, and none is invented here

Feature 001 defines **no rotation schedule, trigger, or procedure of its own** — no interval, no
event, no SLA. Rotation, when an operator separately chooses it, is an explicit operator act
bounded as follows:

- **Database credentials (entries 1 and 2).** Rotation is a native PostgreSQL credential change
  for the existing role through the local administrative boundary — never a store reset, and
  never a change to the identity components (host, port, database, user stay fixed; §6.4). Every
  consuming location must be updated consistently and together: the role's credential in the
  cluster, `PGPASSWORD` in `songhealth-app.env`, the password embedded in the migration URL
  secret (identity components unchanged), and the protected recovery copy under a **new opaque
  reference** — a rotation whose recovery copy is not updated leaves the next recovery staging a
  stale credential. The least-privilege end state (§3, §5.2 of
  [`production-foundation.md`](production-foundation.md)) is preserved unchanged; the
  prerequisites re-verify it at the next start.
- **Encryption key (entry 3).** EmDash documents a native rotation mechanism: prepend the new key
  to the variable's value and retain older keys after commas; new and re-saved settings encrypt
  with the first key while stored `kid` fingerprints select older keys for reads; every plugin
  secret must be re-saved before an old key is removed, and integrations verified from a
  deployment containing only the new key; EmDash does not report which key IDs remain in use
  (Appendix B). This document **records that boundary; Feature 001 performs no rotation**. Two
  hard rules: rotation is never a recovery substitute (§7.2), and after any rotation the
  protected recovery reference for subsequent states must identify the rotated key list —
  recovering a pre-rotation list for a post-rotation state fails exactly as §7.2 describes.
- **Bootstrap credential (entry 4).** Consumed only at Phase A initialization (§3); an existing
  cluster's bootstrap credential is whatever Phase A established. Rotating it meaningfully means
  a native cluster-level credential change through the administrative boundary — not replacing
  the Podman secret, which Phase B never applies to an existing store.

### 9.2 Escalation

Escalate — stop work and surface the situation to the Product Owner at the current gate — when
any of the following holds, because each exceeds what an operator may resolve alone under the
accepted sources:

- a required entry's protected recovery copy is missing, unreadable, or not independent (§5.1);
- the applicable version or key list for the target state cannot be determined (§5.2, §7.2);
- the applicable `EMDASH_ENCRYPTION_KEY` — or any key in its applicable list — is unavailable,
  making the restored state's encrypted settings unreadable (§7);
- a restored value fails usability with the copy believed correct (an authenticity question about
  the protected copy itself);
- a proposed resolution would require any of: generating a replacement key and reporting it as
  recovery; re-initializing, resetting, or discarding a store or volume; discarding or bypassing
  a Recovery Set; weakening a startup prerequisite or readiness gate; or amending an accepted
  source.

Escalation never includes improvised destructive action: no store reset, no re-key presented as
recovery, no prerequisite bypass. Until resolved, the affected entry's evidence stays **fail**
and operational recovery acceptance is denied — an honest refused recovery, not a fabricated one.

## 10. Non-secret evidence procedure and template

Recovery evidence contains, per §3 entry: the secret/input name **as consumed**, the opaque
protected recovery reference/version, and the availability/restore/usability results (§8 stages).
Nothing else. Values, access credentials, full connection URLs, raw `podman inspect` or process
environment dumps, and shell traces are prohibited in evidence; only named fields, non-secret
identity components, and pass/fail/pending results appear. Acceptable observables are the
secret-scrubbed gate markers and the redacted helper output of §8.3, plus name-only secret
listings (§8.2).

This document ships the template with **every result `pending`** — it is documentation, not
runtime evidence, and no result may be pre-filled or fabricated. The template is populated only
by the authorized recovery drill, whose evidence lands in the T028 deliverable
(`specs/001-platform-foundation/evidence/T028-us3-recovery.md`, per tasks.md T028):

| Secret / input (as consumed) | Opaque recovery reference / version | Availability (§8.1) | Restore (§8.2) | Usability (§8.3) |
|---|---|---|---|---|
| `PGPASSWORD` — application role credential, in `songhealth-app.env` | *record at drill* | pending | pending | pending |
| password in `EMDASH_MIGRATION_DATABASE_URL` — Podman secret `songhealth-migration-database-url` | *record at drill* | pending | pending | pending |
| `EMDASH_ENCRYPTION_KEY` (applicable key list) — Podman secret `songhealth-encryption-key` | *record at drill* | pending | pending | pending |
| bootstrap administrator credential — Podman secret `songhealth-db-password` | *record at drill* | pending | pending | pending |

Recording rules: `pass` requires the cited stage's observable (e.g. journal gate markers for
usability) actually observed for that entry; `fail` records the named refusal or missing
dependency; `pending` means not exercised under authorization. A `pending` or `fail` in any
required row prevents operational recovery acceptance (§8).

## 11. Runtime gates and deferred work

T023 is **documentation and source review only**. Nothing here executes an operator example,
accesses or creates a real secret or persistent store, installs anything, builds an image, runs a
runtime operation or test, changes host configuration, deploys, or integrates into the canonical
branch. The mandatory runtime gates are unchanged: **T022** (production durability on a
production-capable verification host) is pending and blocks nothing in this source work only by
the Development-First Sequencing decision; **T028** (the complete recovery drill, including the
separate non-secret runtime-secret recovery result) may execute only after **T022 PASS plus
Codex-accepted sources for all of T023–T027** (tasks.md Phase 5). CA-01 remains deferred
(tasks.md Notes). Source review of this document establishes neither Recovery Set validity nor
successful secret recovery (§2); final acceptance belongs to the Product Owner, and canonical
integration requires separate Product Owner approval.

## Appendix A. T023 element traceability

| `tasks.md` T023 element | Sections |
|---|---|
| runtime-secret inventory | §3 |
| independently protected backup/reference | §5 |
| restore | §6, §8.2 |
| rotation/escalation | §9 |
| non-secret evidence procedure | §10 |
| including `EMDASH_ENCRYPTION_KEY` | §7 |
| without selecting a secret-management platform | §1, §5.1 |
| no values in Git, Recovery Set artifacts, tests, transcripts, planning artifacts, or logs | §1, §4, §5, §6.3, §10 |

## Appendix B. Verified external documentation sources

Version-sensitive facts this document relies on were verified against current first-party
upstream documentation (first via Context7, per the repository contract in
[`AGENTS.md`](../../AGENTS.md)), on 2026-10-11:

- **EmDash** (docs.emdashcms.com — deployment/secrets, deployment/nodejs, reference/cli, and
  deployment/cloudflare, via Context7): `EMDASH_ENCRYPTION_KEY` encrypts plugin settings declared
  with the secret setting type (AES-GCM, plugin ID + setting key as authenticated data); the
  value is operator-provided, never stored in the database, and a database backup does not
  contain it — restoring a database without every key its encrypted settings reference leaves
  those values unreadable; a malformed value produces an operator-facing startup message while
  operations needing encrypted settings fail closed and unrelated requests continue; the value
  format is `emdash_enc_v1_` + 32 random bytes (unpadded base64url), generated by the documented
  `emdash secrets generate` command; native rotation prepends a new key and retains older keys
  comma-separated, with stored `kid` fingerprints selecting older keys for reads, every plugin
  secret re-saved before an old key is removed, and no reporting of which key IDs remain in use.
- **Podman** (docs.podman.io — `podman-secret-create(1)`, `podman-secret-rm(1)`,
  `podman-secret-ls(1)`, via Context7): `podman secret create NAME <file>` creates a secret from
  a local file; `--replace` updates an existing secret of the same name and affects **newly
  created containers only**; removing a secret is safe for in-use containers, and a secret
  recreated under the same name does not change the value already mounted in an existing
  container; `podman secret ls --format "{{.Name}}"` lists secret names only (the name-only
  availability observable of §8.2).
- **PostgreSQL 18** (postgresql.org/docs/18 — backup-dump and the `pg_dump`/`pg_dumpall`
  reference pages, via Context7): `pg_dump` dumps a single database and does not dump roles or
  tablespaces, which are cluster-wide; `pg_dumpall --globals-only` exists for global objects (the
  basis of §6.4's statement that cluster-global roles are not in the Recovery Set's archive).

Upstream documentation explains what the technology does; the Product authorities and the
committed deployment units cited above remain the authority for what this deployment does.
