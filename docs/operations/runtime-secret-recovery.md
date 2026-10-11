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

2. **Verify the staged material before replacing anything.** Run the format and identity checks
   of §8.3.3 (K1 format validity and K2 same-state identity for the encryption key) and confirm
   the bootstrap staging file carries its credential without embedded newlines (§8.3.4), all
   **before** any live secret is replaced: a refusal at this step leaves the external runtime
   boundary untouched. K3 (injection) and the stage-C usability checks run later, against the
   retained staging files (step 6).

3. **Recreate the three Podman secrets from the staging files.** The command line carries only
   the path; `--replace` updates an existing secret of the same name:

   ```bash
   podman secret create --replace songhealth-db-password <protected-staging-file>
   podman secret create --replace songhealth-migration-database-url <protected-staging-file>
   podman secret create --replace songhealth-encryption-key <protected-staging-file>
   ```

   Replaced secrets reach **newly created containers only** — an existing container keeps the old
   value until it is recreated (verified Podman behavior, Appendix B) — so step 5 is not
   optional.

4. **Restore `PGPASSWORD` into the environment file.** Update the `PGPASSWORD` key of
   `~/.config/containers/systemd/songhealth-app.env` with the applicable credential, written in
   the representation that round-trips its intended bytes exactly — the accepted
   `EnvironmentFile` comment/quoting rules apply (no inline comments, backslash and quote
   handling; [`production-foundation.md`](production-foundation.md) §4.3). If authentication
   fails while the credential is otherwise confirmed, suspect the file encoding first: fix the
   representation, never the value. Keep the file at mode `0600`. No other key of the file is a
   secret; non-secret keys are restored as ordinary configuration (§3).

5. **Recreate the containers so replaced values reach the runtime.** The Quadlet lifecycle does
   this natively — a stop removes the container, the next start creates a fresh one
   ([`production-foundation.md`](production-foundation.md) §7.2):

   ```bash
   systemctl --user stop songhealth-app.service songhealth-db.service
   systemctl --user start songhealth-app.service
   ```

6. **Run the stage-C usability checks (§8.3) with the staging files still in place.** K3
   compares the container's mounted secret against the retained staging file, and the bootstrap
   applicability probe of §8.3.4 reads the mounted secret — the staging files are therefore
   retained until stage C completes, not removed after step 3.

7. **Remove the staging files only after stage C completes** — in the operator's usual protected
   way, on success **and on refusal alike**. A refusal under investigation may retain its
   staging files (protected) until the investigation ends; they are removed then. Then record
   the evidence — per-entry restore result and opaque reference only (§10).

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

A direct consequence, verified against the accepted gates themselves: generic startup and
readiness acceptance do **not** establish this entry's recovery. The accepted input checks — the
configuration boundary and the T013 gate's S1 — verify only that `EMDASH_ENCRYPTION_KEY` is
present and non-empty; the T012 readiness helper does not consume the key at all; and the
application's own malformed-key validation reports an operator-facing diagnostic without making
unrelated requests unavailable. A nonempty malformed key — or a **different valid key** — can
therefore coexist with a full startup PASS and an aggregate `ready` result. Usability evidence
for this entry is entry-specific (§8.3.3): format validity, same-state key identity, and
injection, none of which generic gate markers can substitute for.

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

### 8.2 Stage B — restoration and installation (per §6)

Stage the applicable versions, verify the staged material before replacing anything, recreate
the three Podman secrets from staging files, restore `PGPASSWORD` into the environment file in
an exact-byte representation, and recreate the containers (§6.2). The staging files are
**retained** through stage C — the injection and usability checks consume them (§8.3.3 K3,
§8.3.4) — and are removed only afterwards (§6.2 step 7). The restore result per entry is the
observable outcome of those steps. Secret **installation** — the secret exists under its
expected name after recreation — can be confirmed name-only:

```bash
podman secret ls --format '{{.Name}}'
```

Installation evidence stops there: a name in the listing proves the secret exists and can mount,
not that its value is applicable to or usable on the recovery target. For the encryption key and
the bootstrap credential, installation is explicitly **not** usability (§8.3.3, §8.3.4).

### 8.3 Stage C — usability (per-entry evidence; no new committed mechanism)

Usability is proven **per entry**, by the signals that actually authenticate or verify that
entry. For two entries the accepted production gates already do exactly that — they connect with
the recovered credential and fail closed on a wrong one (§8.3.2). For the encryption key and the
bootstrap credential the generic gates do **not** exercise the entry — presence is checked, the
value is not — so §8.3.3 and §8.3.4 define entry-specific, secret-safe operator verification
instead. No plugin, seeded encrypted setting, custom verifier, code change, or new committed
gate is added: the checks below are documented operator procedures using standard tools, with
file paths (never values) in command arguments and no value in any output.

#### 8.3.1 Common fail-closed signals (all entries)

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

These signals are necessary for every entry, and a signal naming a secret-bearing input as
missing or unusable marks that entry **fail** (investigate the named prerequisite, never the
output, and never print a value while investigating). They are **sufficient** usability evidence
only where they authenticate the entry's own credential — which is the case for exactly two
entries:

#### 8.3.2 Entries 1–2 — the gates authenticate these credentials

- **Entry 1 (`PGPASSWORD`).** The application unit's least-privilege application-role
  prerequisite connects to the recovered database over TCP **as the configured `PG*` identity,
  with the recovered credential**, strictly before any migration mutation; authentication
  failure refuses startup naming the failed prerequisite only. The T012 helper's bounded
  PostgreSQL connectivity check re-proves the same authentication on demand. A passed
  prerequisite together with S1 is entry-specific usability evidence: the recovered credential
  actually authenticated as `PGUSER`.
- **Entry 2 (the migration URL's embedded password).** The T013 gate's S3 status and S4 apply
  steps connect through the recovered `EMDASH_MIGRATION_DATABASE_URL`, authenticating its
  embedded credential; S1/S3 additionally prove the non-secret identity agreement against the
  `PG*` inputs. Passed gate stages are entry-specific usability evidence for this credential.

#### 8.3.3 Entry 3 — `EMDASH_ENCRYPTION_KEY`: entry-specific verification required

**Why generic markers do not suffice.** The accepted input checks (the configuration boundary
and S1) verify presence only; the T012 helper does not consume the key; and the application's
own key validation is deliberately non-blocking for unrelated behavior — a malformed value
produces an operator-facing startup diagnostic while unrelated requests continue. With this
foundation's empty plugin state there is no encrypted setting whose decryption could fail
visibly, so a **nonempty malformed key — or a different valid key — coexists with startup PASS
and aggregate READY** (§7.2). Generic gate markers therefore prove only that *some* nonempty
value was injected; they cannot mark this entry `pass`.

**Entry-specific evidence — all three of the following are required:**

- **K1 — format validity of the staged material** (operator-side, structural, no value output;
  runs **before** any secret is replaced — §6.2 step 2). K1 checks exactly the permitted
  whole-file representation — one complete key/list line, an optional single terminal newline,
  and nothing else — and the canonical encoding of every element. The per-element format is the
  documented current EmDash key format: the literal prefix `emdash_enc_v1_` followed by the
  unpadded-base64url encoding of 32 random bytes — 43 base64url characters (`[A-Za-z0-9_-]`,
  no `=` padding) by encoding arithmetic from the documented 32-byte length (Appendix B).
  Length and alphabet alone do **not** prove canonical encoding: the pinned EmDash parser
  rejects key strings whose trailing base64 bits are non-zero (a decode/re-encode equality
  check — Appendix B), so K1 performs the same round trip with standard tools. The byte check
  is **byte-safe**: `od` dumps every byte exactly — NUL included — and every dumped byte must
  belong to the permitted set; no text-pattern residue match is used, because shell text tools
  cannot reliably see NUL and command substitution silently drops it. The byte check runs
  **before** the file is loaded into a shell variable. **Every stage is a sequential command
  whose own exit status is checked immediately — producers and consumers alike — with no
  pipelines, no `pipefail` assumption, and no implicit `set -e`**: the line count, the byte
  dump and its write redirection, every file read, the structural feed and its `grep`, and
  each canonical transformation (URL-to-standard translation, decode, encode, padding/newline
  removal, standard-to-URL translation) is individually refused on its own failure. The
  exact-equality comparison runs **only after all stages succeeded**, and is a separate,
  mandatory check of its own — so a command that emits complete, correct output and then
  fails is rejected: output equality alone never establishes successful execution, and
  command-status evidence and canonical-byte evidence remain independent. Decoded binary
  material lives only in **protected intermediate files**, never in a shell variable: an
  atomically created, operator-private scratch directory (GNU `mktemp -d` with a template of
  trailing `X`es — never a predictable shared path and never `mktemp -u`; Appendix B) is
  created inside the staging file's own protected directory (the staging path is required to
  be absolute so the scratch stays inside that area) under `umask 077`, with owner-only
  permissions on the directory and every file; a failed setup refuses. **Cleanup ownership is
  separated from path existence**: the invocation-local cleanup state is initialized to empty
  *before any trap is installed*, overwriting any inherited value — subshell isolation alone
  does not clear an inherited variable — so initially nothing is eligible for deletion; a
  path becomes eligible only after this invocation's own checked `mktemp` succeeded **and**
  the printed path is validated to belong to the staging area and the `k1.` namespace. A
  missing staging file, a failed line/setup check, a failed or interrupted creation, or a
  merely printed foreign path therefore can never authorize deletion of an inherited or
  unrelated path; uncertain residue is left owner-only protected for operator investigation,
  and no cleanup target is ever guessed. Removal is bounded: only the explicit K1 artifact
  names inside the eligible directory are removed, then the directory itself via `rmdir` —
  no recursive deletion, no glob, no caller-provided artifact list, and never the staging
  file; unexpected contents block directory removal (counting as cleanup failure) and are
  preserved. Cleanup is guarded on success, refusal, and handled interruption
  (`INT`/`TERM`/`HUP` → exit 130) by the subshell's `EXIT` trap: it preserves the validation
  status, and a cleanup failure can only turn success into refusal — never the reverse. An
  unhandled interruption (a signal the trap cannot catch, such as `SIGKILL`) leaves any
  residue owner-only protected inside the staging area for operator cleanup; the staging file
  itself is retained through K3/stage C (§6.2), untouched by cleanup. The whole check runs in
  a subshell, so its variables, `umask`, and traps stay local — the caller's state and traps
  are never modified — and a refusal exits the check, not the operator's shell. Every value
  flows through shell builtins, stdin, and the protected
  files — `printf`, `test`, and parameter expansion never place key material in an external
  command argument, and `awk`/`od`/`cat`/`grep`/`tr`/`base64`/`cmp`/`dirname`/`mktemp`/`rm`
  receive fixed syntax and paths only; tool diagnostics are suppressed and replaced by fixed
  refusal messages, so no trace or value is ever emitted (Bash- and POSIX-`sh`-compatible;
  GNU coreutils environment — `od -v`, `mktemp -d` — as the deployment already mandates
  elsewhere). The staging file is operator-owned and quiescent while K1 runs. The checks
  print nothing except a fixed diagnostic naming the failed stage; the exit statuses are the
  result:

  ```bash
  f=<protected-staging-file>

  # K1 — sequential stages, each checking its own exit status immediately.
  # Runs in a subshell: variables, umask, and traps stay local, and a refusal
  # exits the check, not the operator's shell.
  (
    k1_refuse() { echo "$1" >&2; exit 1; }

    # invocation-local cleanup state — initialized before any trap is installed,
    # overwriting any inherited value: nothing is eligible for deletion until
    # this invocation's own checked scratch creation succeeds and is validated;
    # subshell isolation alone does not clear an inherited variable
    scratch=''

    # bounded cleanup: only the explicit K1 artifact names inside the eligible
    # directory, then the directory itself via rmdir — no recursive deletion, no
    # glob, no caller-provided list, and never the staging file; unexpected
    # contents block directory removal (a cleanup failure) and are preserved
    k1_cleanup() {
      crc=0
      if [ -n "$scratch" ] && [ -d "$scratch" ]; then
        for artifact in dump line body expect std raw enc nopad url; do
          rm -f -- "$scratch/$artifact" >/dev/null 2>&1 || crc=1
        done
        rmdir -- "$scratch" >/dev/null 2>&1 || crc=1
      fi
      return "$crc"
    }

    # cleanup runs on success, refusal, and handled interruption; the validation
    # status is preserved, and a cleanup failure can only turn success into
    # refusal — never the reverse
    trap 'st=$?; k1_cleanup || { [ "$st" -eq 0 ] && st=1; }; exit $st' EXIT
    trap 'exit 130' INT TERM HUP

    # staging input present and readable
    [ -f "$f" ] && [ -r "$f" ] || k1_refuse 'staging file absent or unreadable'
    # whole-file shape: exactly one line (a single terminal newline is acceptable;
    # leading or trailing blank lines and any second line are not)
    nr=$(awk 'END{print NR}' "$f" 2>/dev/null) || k1_refuse 'line check could not read the staging file'
    case "$nr" in ''|*[!0-9]*) k1_refuse 'line check produced no usable result' ;; esac
    [ "$nr" -eq 1 ] || k1_refuse 'staging file is not a single line'

    # protected scratch: atomically created by mktemp inside the staging file's own
    # protected directory (absolute path enforced); umask 077 keeps every artifact
    # owner-only; binary decoded material lives only in these files, never in a
    # shell variable
    umask 077
    sdir=$(dirname -- "$f" 2>/dev/null) || k1_refuse 'staging directory could not be determined'
    case "$sdir" in /*) ;; *) k1_refuse 'staging file path must be absolute so the scratch directory stays inside the protected staging area' ;; esac
    # cleanup eligibility is recorded only here: after this invocation's own
    # checked creation succeeded AND the resulting path is validated to belong
    # to the protected staging area and the k1. namespace. A missing staging
    # file, a failed earlier check, a failed or interrupted creation, or a
    # merely printed foreign path never authorizes deletion of anything; any
    # uncertain residue is left protected for operator investigation, and no
    # cleanup target is ever guessed
    cand=$(mktemp -d "$sdir/k1.XXXXXX" 2>/dev/null) || k1_refuse 'scratch directory could not be created'
    case "$cand" in
      "$sdir"/k1.??*) scratch=$cand ;;
      *) k1_refuse 'created path is outside the expected staging-area K1 namespace - nothing is deleted; inspect and remove it manually' ;;
    esac

    # byte-safe whitelist: od dumps every byte exactly — NUL included — and every
    # dumped byte pair must belong to the permitted set (key alphabet, comma,
    # hyphen, newline)
    od -An -v -tx1 "$f" > "$scratch/dump" 2>/dev/null || k1_refuse 'byte check could not read the staging file'
    awk 'BEGIN { ok = 1 }
         { for (i = 1; i <= NF; i++) if ($i !~ /^(0a|2c|2d|3[0-9]|4[1-9a-f]|5[0-9a]|5f|6[1-9a-f]|7[0-9a])$/) ok = 0 }
         END { exit !ok }' "$scratch/dump" 2>/dev/null \
      || k1_refuse 'byte check failed: forbidden byte present or check did not complete'

    # structural format: prefix + 43 base64url characters per element, comma-separated
    line=$(cat "$f" 2>/dev/null) || k1_refuse 'staging file could not be read'
    printf '%s\n' "$line" > "$scratch/line" 2>/dev/null || k1_refuse 'structural check input could not be prepared'
    LC_ALL=C grep -qxE 'emdash_enc_v1_[A-Za-z0-9_-]{43}(,emdash_enc_v1_[A-Za-z0-9_-]{43})*' "$scratch/line" 2>/dev/null \
      || k1_refuse 'structural format check failed'

    # canonical encoding per element: URL-to-standard translation, decoding,
    # encoding, padding/newline removal, standard-to-URL translation — each
    # stage's own status checked immediately — and only after every stage
    # succeeded, the exact-equality comparison (which also fixes the decoded
    # length at exactly 32 bytes — 43 unpadded characters is that length's
    # unique encoding)
    oldIFS=$IFS; IFS=,; set -f
    for elem in $line; do
      body=${elem#emdash_enc_v1_}
      printf '%s=' "$body" > "$scratch/body" 2>/dev/null || k1_refuse 'canonical check input could not be prepared'
      printf '%s'  "$body" > "$scratch/expect" 2>/dev/null || k1_refuse 'canonical comparison input could not be prepared'
      tr -- '-_' '/+' < "$scratch/body" > "$scratch/std" 2>/dev/null || k1_refuse 'URL-to-standard translation failed'
      base64 -d < "$scratch/std" > "$scratch/raw" 2>/dev/null || k1_refuse 'base64 decoding failed'
      base64 < "$scratch/raw" > "$scratch/enc" 2>/dev/null || k1_refuse 'base64 encoding failed'
      tr -d '\n=' < "$scratch/enc" > "$scratch/nopad" 2>/dev/null || k1_refuse 'padding removal failed'
      tr -- '/+' '-_' < "$scratch/nopad" > "$scratch/url" 2>/dev/null || k1_refuse 'standard-to-URL translation failed'
      cmp -s "$scratch/expect" "$scratch/url" || k1_refuse 'noncanonical key element encoding'
    done
    IFS=$oldIFS; set +f
  )
  ```

  Refused, among others: an absent or unreadable staging file; a leading or trailing blank
  line; any second line; an empty file; a bare prefix; wrong length; `=` padding; whitespace;
  CRLF; a NUL byte anywhere in the file — leading, embedded, before the terminal newline, or
  trailing; any byte outside the permitted set; a noncanonical final encoding (for example a
  trailing character whose nonsignificant bits are non-zero); and any noncanonical element of
  a rotation list. K1 proves format only — never that the key is the *applicable* one.

- **K2 — same-state key identity** (runs **before** any secret is replaced — §6.2 step 2). The
  staged material must be the applicable protected version for the target known state (§5.2),
  proven against the protected record itself: either byte-identical to the applicable version's
  protected bytes (`cmp --silent <protected-staging-file> <applicable-protected-version>` —
  exit status only, nothing printed), or matching a SHA-256 digest that the operator recorded
  **inside the protected record** when the version was protected
  (`sha256sum <protected-staging-file>`, compared against the recorded digest; only the match
  result is recorded anywhere else). A digest of 256-bit-random key material is non-invertible;
  even so, a digest is recorded only inside the protected record itself — never in evidence,
  Git, or review artifacts — and is never recorded at all for low-entropy passwords. A K2
  mismatch means a wrong or stale version was staged: re-select the applicable reference or
  escalate (§9.2); do not proceed on an unverified guess.

- **K3 — injection** (runs after replacement and container recreation, against the staging file
  **retained through stage C** — §6.2 steps 6–7). The recreated application container must
  carry exactly the staged applicable material — the mounted secret, compared byte-for-byte
  against the staging file with the bytes flowing over stdin, never through a command argument:

  ```bash
  podman exec -i systemd-songhealth-app \
    cmp -s /run/secrets/songhealth-encryption-key - < <protected-staging-file>
  ```

  Exit 0 proves the running container's mounted key secret is byte-identical to the staged
  applicable material.

**Negative runtime signal.** An EmDash invalid/malformed-key diagnostic in the unit journal
belongs to the **current** recovery attempt only — the journal of this unit's present start
cycle (`journalctl --user -u songhealth-app.service -e`, read for the current attempt, never
historical records — the same invocation-scoping discipline the accepted STARTUP REFUSAL
evidence class uses). Such a diagnostic observed for the current attempt is an immediate
**fail**, whatever K1 says. The **absence** of a diagnostic establishes nothing: it is not
evidence that the application accepted the key, and only K1–K3 carry the affirmative evidence
for this entry.

**Refusal rule.** An invalid, missing, or mismatched key — any K1/K2/K3 failure — refuses
operational recovery acceptance **even when the application is READY**. Without all three
checks observed for this entry, its usability stays `pending` (unexercised) or `fail`; generic
startup PASS and aggregate READY can never alone mark this row `pass`.

**Honest boundary.** The empty foundation has no encrypted plugin settings, so no Feature 001
runtime path demonstrates decryption of encrypted settings. K1–K3 are structural and identity
proof of the protected material and of its injection into the runtime — strictly stronger than
generic markers, but still not a decryption demonstration; that boundary is inherent to the
foundation's empty seed and is not worked around here.

#### 8.3.4 Entry 4 — bootstrap credential: availability, installation, applicability

Three distinct facts, never collapsed into one:

1. **Availability** (stage A): the protected recovery copy of the bootstrap credential exists,
   is independent, and its applicable version is identified — a statement about the operator's
   protected mechanism only.
2. **Installation** (stage B): the Podman secret `songhealth-db-password` was recreated from
   the staged file and mounts (name-only listing, successful container creation) — a statement
   about the secret store only.
3. **Applicability/usability**: the restored credential **authenticates as `POSTGRES_USER`
   against the recovery target cluster** — the only fact that matters for this entry's row.

**Why generic markers do not suffice.** On an already-initialized store, Phase B never applies
the secret to the stored administrator credential (§3, §9.1), so a *wrong* restored secret can
exist, mount, and coexist with a healthy database and a READY application: the database unit's
health command is `pg_isready`, which verifies server availability **without verifying any
credential** (Appendix B), and the application gates authenticate the separate least-privilege
application identity, not the bootstrap administrator. Neither name-only listing, container
creation, database health, nor application gate markers may mark this entry's usability `pass`.

**Applicability evidence — one mechanism for both recovery targets.** Applicability is proven
**only** by an actual secret-safe password-authenticated probe as `POSTGRES_USER` against the
recovery target, executed after authorized provisioning/start of the target's database unit.
The two targets differ only in what the probe is combined with:

- **Clean-cluster recovery (the recovery-drill case).** The target store is initialized by the
  explicit Phase A procedure *from this staged secret* (`POSTGRES_PASSWORD_FILE`; Phase A passes
  no authentication-method override, so the image's password-based host authentication defaults
  are in force — Appendix B). The accepted Phase A final-server identity verification
  ([`production-foundation.md`](production-foundation.md) §5.1) remains the recorded
  **provisioning** evidence — it proves the intended database and bootstrap identity exist —
  but it is **not** usability proof: its checks connect locally, under the image's local
  `trust` authentication, and never authenticate the password. The probe below must still run
  against the newly provisioned target before this entry's usability may be marked `pass`.
- **Already-initialized store.** Phase B never applies the secret to the stored administrator
  credential (§3, §9.1), so nothing but the probe can establish that the restored credential
  matches the stored one.

**The probe** — private-network, password-authenticated, current-attempt:

```bash
podman exec systemd-songhealth-db sh -c 'pw=$(cat /run/secrets/songhealth-db-password) || { echo "bootstrap secret read failed" >&2; exit 1; }; [ -n "$pw" ] || { echo "bootstrap secret is empty" >&2; exit 1; }; PGPASSWORD="$pw" psql -h systemd-songhealth-db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select current_user"'
```

Its conditions and semantics, all of which hold by construction of the command:

- **The secret read succeeds and is nonempty** — guarded explicitly before any connection is
  attempted; a missing/unreadable/empty mounted secret fails with a fixed diagnostic naming the
  condition, never a value.
- **The credential never appears in any command argument** — it is read from the mounted secret
  inside the container shell at runtime, held in a shell variable, and passed to `psql` through
  the environment; the only output is the single non-secret `current_user` identity value.
- **The selected connection exercises password authentication, not local trust and no
  alternate credential fallback** — it targets the server's private-network name
  (`systemd-songhealth-db`), so the connection arrives from the container's network address
  rather than the socket or loopback, where the image's local `trust` authentication would
  exercise no password (Appendix B); `PGPASSWORD` takes precedence over any password-file
  lookup, and the database container carries no alternate credential source.
- **The result belongs to the intended target and the current attempt** — `systemd-songhealth-db`
  is this deployment's generated database container, `podman exec` runs it now against that
  container, and the verdict is read only from this invocation's exit status and output; stale
  journal records or an earlier attempt's result are never substituted.
- **The probe authenticates the whole staged material as read** — command substitution yields
  the secret's full content (trailing newlines stripped), so a pass proves the entire staged
  material is exactly the operative credential. This is what closes the first-line divergence:
  see the file-consumption semantics below.

**Verdicts.** Exit 0 with `current_user` equal to `POSTGRES_USER` (a non-secret identity
component) is the applicability evidence. A completed **authentication failure** means the
restored credential does not match the stored one: usability **fail** — re-select the
applicable protected version or escalate (§9.2); never reset, reinitialize, or modify any store
or unit to make the check pass. A **connection-level** failure (name resolution, unreachable,
timeout) is *inconclusive*, not a pass or fail — resolve the connectivity problem and re-run
the probe; only a completed authentication attempt yields a verdict.

**Accepted file-consumption semantics (documented, not redefined).** The operative bootstrap
credential is the **first line** of the secret file: the image reads `POSTGRES_PASSWORD_FILE`
into the environment through command substitution, and `initdb --pwfile` takes the first line
of the password file (Appendix B). A staging file containing two lines therefore provisions
the first-line password while the full staged material differs — and the probe above then
**fails authentication**, because it submits the whole material as read; Phase A identity
checks alone would not expose this (they authenticate nothing). The single-line staging
representation — the credential as the file's one line, an optional terminal newline, **no
embedded newlines** — makes the staged material and the operative credential coincide, which
§6.2 step 2 asks the operator to confirm before replacement. This paragraph documents how the
accepted image consumes the input; it changes no credential, and it invents no narrower
credential-generation policy — the operator's credential choice remains the operator's.

If applicability is unexercised or unproven — on either target — this entry's usability stays
**`pending`** (or `fail` on a completed negative verdict) — never inferred from existence,
installation, Phase A identity checks, database health, or application markers.

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
secret-scrubbed gate markers and redacted helper output of §8.3.1, the name-only secret listings
of §8.2 (installation evidence), and the entry-specific operator checks of §8.3.3–§8.3.4.

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

Recording rules: `pass` requires the cited stage's observable actually observed for that entry —
and for the **usability** column, the entry-specific evidence defined in §8.3:

- entries 1–2: the authenticating gates of §8.3.2 (prerequisite connection/S1 and readiness for
  `PGPASSWORD`; S3/S4 for the migration URL's credential) are admissible, because those gates
  authenticate these credentials themselves;
- entry 3 (`EMDASH_ENCRYPTION_KEY`): admissible only with K1 + K2 + K3 observed (§8.3.3) —
  generic startup PASS and aggregate READY can never alone mark this row `pass`;
- entry 4 (bootstrap credential): admissible only with the password-authenticated
  private-network probe of §8.3.4, **on both clean and already-initialized recovery targets**
  (after authorized provisioning/start of the target) — Phase A final-server identity evidence
  is provisioning evidence only and can never mark usability `pass`; neither can name-only
  listing, container creation, database health, or application gate markers.

`fail` records the named refusal, failed check, or missing dependency; an inconclusive probe
result is recorded as such, not as `pass`. `pending` means not exercised under authorization —
including an unexercised applicability probe or key-material check. A `pending` or `fail` in any
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
  format is `emdash_enc_v1_` + 32 random bytes as unpadded base64url (43 base64url characters
  by encoding arithmetic — the basis of §8.3.3's K1 pattern), generated by the documented
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
  `pg_isready` (the `app-pg-isready` reference page) verifies server availability without
  verifying credentials or identity (the basis of §8.3.4's rejection of database health as
  bootstrap-credential evidence).
- **Official PostgreSQL image** (docker-library: the image documentation and the current
  `docker-entrypoint.sh` source, fetched 2026-10-11): the image establishes `trust`
  authentication for local connections — a password is not required when connecting from inside
  the database container itself (socket or localhost), but is required when connecting from a
  different host/container — and the entrypoint appends a single `host all all all <method>`
  line to `pg_hba.conf`, where the method defaults to the server's password-encryption setting
  (`scram-sha-256` for PostgreSQL 18) unless `POSTGRES_HOST_AUTH_METHOD` overrides it. Phase A
  passes no such override, so password authentication governs connections arriving from other
  addresses (the basis of §8.3.4's private-network probe and its socket/loopback caveat). The
  same entrypoint reads `POSTGRES_PASSWORD_FILE` into the environment through command
  substitution (its `file_env` helper) and passes the value to `initdb --pwfile`; PostgreSQL 18
  documents that `initdb --pwfile` "read[s] the bootstrap superuser's password from a file. The
  first line of the file is taken as the password" (postgresql.org/docs/18, `app-initdb`,
  verified 2026-10-11) — together the basis of §8.3.4's accepted file-consumption semantics
  (first-line consumption at initialization; whole-material authentication by the probe).
- **EmDash 1.1.0 key parser acceptance** (the pinned, lock-integrity-verified package, as
  independently verified against the package source in the T023 corrective review): the
  encryption-key parser enforces canonical unpadded-base64url encoding through a
  decode/re-encode equality check, rejecting values whose trailing base64 bits are non-zero
  even when length and alphabet are correct. §8.3.3's K1 round-trip check mirrors that
  acceptance contract with standard tools, so a key the application would reject cannot pass
  K1.
- **GNU coreutils `mktemp`** (the GNU coreutils manual, via Context7, verified 2026-10-11):
  `mktemp -d TEMPLATE` creates a directory instead of a file, granting read/write/search
  permissions to the current user only — no group or other permissions — further restrictable
  by `umask`; the template requires trailing `X`es (at least three) that are replaced to form
  the unique name, and creation is atomic. §8.3.3's K1 uses `mktemp -d` with a template
  inside the protected staging directory under `umask 077` for exactly these properties;
  predictable shared paths and `mktemp -u` are not used.

Upstream documentation explains what the technology does; the Product authorities and the
committed deployment units cited above remain the authority for what this deployment does.
