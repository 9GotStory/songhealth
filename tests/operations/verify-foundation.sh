#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth production smoke/lifecycle verification harness (Feature 001,
# T016 — RED verification harness for US2).
#
# This harness is the FAILING-first verification contract for the production
# implementation that T017–T020 will later deliver (OCI image + five Quadlet
# definitions). At any baseline where those artifacts are absent it must exit
# nonzero with one bounded, secret-free prerequisite failure that is
# attributable ONLY to that intentionally absent downstream implementation —
# never to a syntax error, an unchecked variable, an unbounded wait, secret
# leakage, or destructive probing (stage P0 runs before anything else and
# before any environment input is even required, so a bare run at the RED
# baseline always reports the missing deployment, not missing inputs).
#
# Contract coverage (delegation items map 1:1 to stage groups):
#
#   P0   RED prerequisite: the repository deployment definitions exist
#        (deploy/Containerfile + the five deploy/quadlet/* units from the
#        approved plan structure) and the T013 authority script is present.
#   R1   resolve and validate the EXACT task-owned runtime targets (units,
#        containers, network, volumes) BEFORE any lifecycle mutation; the
#        documented T015 development resources (songhealth-dev-db,
#        songhealth-dev-db-data, host ./media) are never targets and any
#        collision with them fails closed.
#   C1  (1) T013's startup-acceptance contract — status -> inspected-target
#        fingerprint-guarded apply -> check over the exact-build manifest,
#        plus the bounded media write/read/remove probe — completed for the
#        current start of the application unit before it is treated as READY.
#        Execution is tied to the accepted authority by TWO combined live
#        proofs: (a) WIRING — the unit's effective startup definition
#        (systemctl --user cat, i.e. the generated unit the manager actually
#        executes) must invoke the accepted T013 authority with PROVEN
#        EXECUTABLE IDENTITY in one of two approved forms. HOST FORM: an
#        absolute executable token whose realpath equals the repository
#        checkout's tests/operations/verify-startup.sh (a symlink resolving
#        to it is the authority; bare basenames and same-suffix paths in
#        unrelated trees are rejected), optionally behind a system
#        interpreter under /usr, or the trusted npm runner — the npm this
#        verification environment itself resolves — running the committed
#        verify:startup mapping, where that mapping is itself validated to
#        resolve to the authority against the package root. CONTAINER FORM
#        (Product Owner decision 2026-10-09): the approved in-container
#        startup gate invocation — the trusted podman runner (the podman
#        this verification environment resolves; bare `podman` is rejected)
#        executing a container run that names the expected application
#        container, references the intended application image identity as
#        the DIGEST-PINNED form SONGHEALTH_APP_IMAGE@sha256:<64 hex> (a
#        bare tag cannot prove which image was accepted; `latest` and other
#        repositories are rejected), mounts NOTHING whose destination is
#        not the expected media mount target (an overmounted /app/tests or
#        /app/package.json would shadow the accepted in-container gate
#        identity), and passes ONE sh -c startup payload whose COMPLETE
#        control flow is validated: the committed verify:startup mapping
#        invoked exactly once in command position, immediately followed by
#        the strict success separator `&&`, the accepted standalone server
#        (node dist/server/entry.mjs) exactly once with only `exec` and
#        KEY=VALUE assignments between, and NOTHING after the server entry
#        token — duplicate gate/server occurrences, missing separators,
#        failure bypasses (`;`, `||`, trailing commands), alternate server
#        launches, and command shadowing are rejected; the committed
#        package.json mapping is validated against the package root
#        exactly as for the host npm form; occurrences of the gate names
#        inside quoted strings are inert decoy text and are rejected; and
#        the COMPLETE payload prefix is controlled — shell function
#        definitions (name() tokens), unquoted command substitution
#        (backticks or $( )), and cd commands are rejected anywhere outside
#        quoted strings, so the validated gate/server suffix cannot be
#        reached through a redirected prefix. The structural shape alone
#        is not acceptance: the runtime identity binding
#        (require_container_gate_identity_for_unit, dispatched by the
#        caller WITHOUT command substitution so the accepted form
#        propagates) then ties the pinned digest to the deployed
#        container's ACTUAL image identity and proves the container's gate
#        script and package.json are byte-identical to the accepted
#        repository sources. Unprovable or untrusted
#        executables fail closed; occurrences of the names inside arbitrary
#        arguments, quoted shell payloads, or comments are rejected; and
#        (b) COMPLETION — the
#        journal of the unit's CURRENT systemd invocation (matched by
#        _SYSTEMD_INVOCATION_ID, never a wall-clock window, so pre-start
#        gates are covered and earlier invocations can never be reused)
#        must contain the gate's full derived marker sequence — every
#        `t013: [S<n>] PASS` stage marker plus the final PASS banner, all
#        derived at runtime from tests/operations/verify-startup.sh, in
#        ascending stage order. Journal text alone (a fabricated marker
#        sequence) is rejected by the wiring proof; a wired unit that did
#        not complete the gate is rejected by the ordered completion
#        evidence. Recurring readiness stays private (obtained only through
#        the container boundary) and non-mutating (the media snapshot hashes
#        directory metadata INCLUDING the media root and subdirectories plus
#        per-file CONTENT digests, so a create/read/remove probe or an
#        in-place byte change is detected, and the tagline digest is
#        captured on BOTH sides of the probe and compared).
#   C2  (2) both containers are attached to the approved private application
#        network; the required application-to-database access succeeds
#        through that private path only; the defined unintended host/public
#        PostgreSQL paths (any published host-port mapping, and the host to
#        the database container's private address) are evaluated in C3.
#   C3  (3) PostgreSQL publishes NO host port — proven from runtime/container
#        metadata (empty PortBindings, empty `podman port` mapping registry)
#        AND from the applicable host boundary by an actual bounded TCP
#        connect from the host to the database container's private address
#        (must be refused), never inferred from a successful private
#        connection.
#   C4  (4) the two expected separate persistent volumes exist and are
#        attached at their approved targets (database data at
#        /var/lib/postgresql — the official PostgreSQL 18 image's persistent
#        parent of PGDATA, researched in scripts/dev-db.sh — and media at the
#        stable in-container ./media mount path), as named-volume mounts
#        outside the ephemeral container layers.
#   C5  (7+8) integrity baseline: the canonical native EmDash Site Setting
#        `tagline` is retrieved through its intended native platform boundary
#        and compared EXACT VALUE FIRST, then its exact UTF-8 bytes are
#        hashed and compared with the canonical SHA-256; the designated
#        validation media is retrieved through its intended native public
#        media boundary and its bytes compared with the canonical media
#        SHA-256.
#   C6  (5) exactly three consecutive lifecycle cycles, each exercising
#        start, stop, restart, and replace/recreate of the ephemeral runtime
#        containers while retaining the named volumes; after every operation
#        the readiness state is re-probed, and both integrity checks are
#        rerun at every operational checkpoint (a stopped platform must
#        report not-ready, and integrity is asserted wherever the platform
#        is expected to serve it — every checkpoint where the unit runs).
#   C7  (6) a deliberately missing expected persistence attachment (the
#        media volume omitted from the application unit's Quadlet source)
#        must produce the REQUIRED EXPLICIT operational not-ready result
#        identifying the affected media dependency by its safe dependency
#        name (spec US2 scenario 3; data-model sections 4-5), in one of two
#        PO-approved evidence classes. T012 CLASS: when the container runs,
#        the recurring readiness helper itself reports `not-ready` naming
#        media. STARTUP REFUSAL CLASS (Product Owner decision 2026-10-09):
#        when the application container cannot start because the required
#        persistent media attachment is absent — so the helper cannot
#        execute — not-ready may instead be demonstrated by an
#        invocation-scoped, media-specific startup refusal, valid only when
#        ALL supporting conditions are established: the effective
#        attachment omission is verified from the GENERATED service's
#        execution argv (the podman run -v/--volume/--mount options —
#        absent, malformed, or unprovable execution definitions are
#        rejected evidence, and an attached service never qualifies); the
#        refusal belongs to the current attempted start (scoped by
#        _SYSTEMD_INVOCATION_ID, with the manager's current InvocationID
#        still equal to it); ONE refusal record names the required media
#        attachment as the startup-blocking cause in the approved guard
#        structure — the literal volume name, an attachment negation, and
#        the literal mount target in that order on the same line — so a
#        generic failure that merely co-occurs with the media identifiers
#        is rejected; the application never reaches Healthy/Ready — the
#        same invocation shows NO T013 gate output at all (stage markers
#        OR the completion banner) and its main process exited nonzero
#        (native state read as NAMED Key=Value properties in any order,
#        with the systemd 259 INTEGER ExecMainCode semantics — a
#        successful or still-running attempt is not refusal evidence, and
#        the nonzero exit is one component of the combined evidence set,
#        not a standalone no-healthy proof); every captured unit and
#        journal slice is secret-checked like the C1 collections; generic
#        failures, split or same-line unrelated mentions, stale logs, and
#        simple unreachability are rejected; and the original media volume
#        remains intact. This evidence is classified
#        STARTUP REFUSAL, never as a T012 readiness-helper result. Any
#        ready result (a healthy empty replacement) fails the stage in
#        either class. The omission is simulated WITHOUT deleting or
#        reinitializing persistent state, and the original attachment is
#        restored — verified by checksum — on every exit path, including
#        interruption (traps); when a byte-exact restore cannot be verified,
#        restoration fails closed: the recovery copy is preserved next to
#        the source AND the scratch directory holding the original backup is
#        kept (never deleted), with an actionable nonzero result.
#   C8   final integrity checkpoint, retained-volume/no-new-volume proof, and
#        the no-residue wrap-up.
#
# The harness never starts or stops the T005 development database, never
# touches songhealth-dev-db / songhealth-dev-db-data or the host ./media
# tree, never deletes or recreates a volume, and never runs the production
# application itself. Its mutations are exactly: user-systemd unit lifecycle
# operations on the two validated production units, removal of their two
# validated ephemeral containers (only after the owning unit is stopped) for
# the recreate exercise, and the guarded, checksum-verified transient edit of
# the application Quadlet source during C7.
#
# `--self-test` runs isolated failure-path demonstrations of the guarded
# restore/cleanup branches, the missing-attachment readiness acceptance, and
# the non-mutation detector, entirely against scratch files under a shimmed
# systemctl; it touches no real deployment, unit, or Quadlet.
#
# Inputs are external and environment-appropriate (no host-specific paths,
# credentials, or public endpoints are hard-coded). Required:
#
#   SONGHEALTH_APP_ORIGIN          proxy-facing loopback origin of the
#                                  production application publication,
#                                  e.g. http://127.0.0.1:8080
#   SONGHEALTH_VALIDATION_TOKEN    scoped EmDash personal access token with
#                                  settings:read, provisioned by the operator
#                                  for validation; read in-process by node
#                                  and NEVER printed or logged
#   SONGHEALTH_VALIDATION_MEDIA_PATH
#                                  URL path of the designated validation media
#                                  asset on the native public media file
#                                  boundary, e.g. /_emdash/api/media/file/<key>
#
# Optional topology overrides (defaults come from the approved plan
# structure; override only to match the deployed environment):
#
#   SONGHEALTH_APP_UNIT (songhealth-app.service)
#   SONGHEALTH_DB_UNIT (songhealth-db.service)
#   SONGHEALTH_APP_CONTAINER (systemd-songhealth-app)
#   SONGHEALTH_DB_CONTAINER (systemd-songhealth-db)
#   SONGHEALTH_NETWORK (songhealth)
#   SONGHEALTH_DB_VOLUME (songhealth-db-data)
#   SONGHEALTH_MEDIA_VOLUME (songhealth-media)
#   SONGHEALTH_DB_MOUNT_TARGET (/var/lib/postgresql)
#   SONGHEALTH_MEDIA_MOUNT_TARGET (/app/media)
#   SONGHEALTH_READINESS_COMMAND (node scripts/verify-readiness.mjs)
#   SONGHEALTH_APP_QUADLET (default: <xdg-config>/containers/systemd/
#   songhealth-app.container, derived from SONGHEALTH_APP_UNIT)
#   SONGHEALTH_APP_IMAGE (localhost/songhealth-app:0.0.1 — the intended
#                          application image identity for the C1 container
#                          wiring form; the exact token is required and may
#                          carry the deployment's digest pin
#                          <image>@sha256:<64 hex>)
#
# Secret safety: this harness holds no database credentials (all
# application-to-database probes execute inside the application container
# through `podman exec`, consuming only the container's own configured
# environment). It never prints credentials, secret values, bearer tokens,
# EMDASH_ENCRYPTION_KEY, PGPASSWORD, or a full credential-bearing migration
# URL; any captured command output is scrubbed of the known secret values
# before it is printed, and readiness output is additionally asserted to be
# secret-free. Only safe unit/container/network/volume/dependency names,
# non-secret digests, and HTTP status codes appear in output.
#
# Exit codes: 0 PASS | 1 FAIL (any stage, including the expected RED
# prerequisite failure) | 2 environment error | 4 missing or invalid input |
# 64 usage error.

set -euo pipefail

readonly EXIT_FAIL=1
readonly EXIT_ENV=2
readonly EXIT_CONFIG=4
readonly EXIT_USAGE=64

# Bounded waits so no stage can ever hang (seconds).
readonly UNIT_WAIT_SECONDS=300
readonly NEGATIVE_SETTLE_SECONDS=150
readonly EXEC_TIMEOUT_SECONDS=60
readonly CONNECT_TIMEOUT_SECONDS=5
readonly HTTP_TIMEOUT_SECONDS=30
readonly POLL_SECONDS=5
readonly JOURNAL_MAX_LINES=20000

# Canonical validation evidence (T015, non-environment-specific by design).
readonly TAGLINE_EXPECTED='Songhealth Feature 001 foundation validation'
readonly TAGLINE_EXPECTED_SHA256='84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415'
readonly MEDIA_EXPECTED_SHA256='3d8133b049b52f94d6f5a55ee8d1d1181b2eaa8a907eee557b16f0163a66198d'

# T013 authority: the reused startup-acceptance contract. The gate banner is
# derived from this script at runtime, never re-typed here, so this harness
# can only accept what the accepted T013 gate itself proves.
readonly T013_SCRIPT='tests/operations/verify-startup.sh'
readonly T013_BANNER_MARKER='t013: T013 startup acceptance gate: PASS'

# Repository deployment definitions required by the approved plan (Project
# Structure) and their owning tasks, for the P0 RED prerequisite check.
readonly DEPLOY_DEFINITION_FILES=(
	'deploy/Containerfile'
	'deploy/quadlet/songhealth.network'
	'deploy/quadlet/songhealth-db-data.volume'
	'deploy/quadlet/songhealth-media.volume'
	'deploy/quadlet/songhealth-db.container'
	'deploy/quadlet/songhealth-app.container'
)
readonly DEPLOY_DEFINITION_OWNERS=(
	'T017 (production OCI image)'
	'T018 (private application network)'
	'T018 (persistent PostgreSQL data volume)'
	'T018 (persistent media volume)'
	'T019 (PostgreSQL Quadlet unit)'
	'T020 (application Quadlet unit)'
)

# Documented T015/T005 development resources that this harness must never
# operate on, by name (scripts/dev-db.sh contract).
readonly DEV_GUARD_NAMES='songhealth-dev-db songhealth-dev-db-data'

# Approved topology defaults (plan Project Structure; Quadlet default
# container naming is systemd-<unit-base>). Environment-appropriate inputs
# may override every one of them.
APP_UNIT="${SONGHEALTH_APP_UNIT:-songhealth-app.service}"
DB_UNIT="${SONGHEALTH_DB_UNIT:-songhealth-db.service}"
APP_CONTAINER="${SONGHEALTH_APP_CONTAINER:-systemd-songhealth-app}"
DB_CONTAINER="${SONGHEALTH_DB_CONTAINER:-systemd-songhealth-db}"
NETWORK_NAME="${SONGHEALTH_NETWORK:-songhealth}"
DB_VOLUME="${SONGHEALTH_DB_VOLUME:-songhealth-db-data}"
MEDIA_VOLUME="${SONGHEALTH_MEDIA_VOLUME:-songhealth-media}"
DB_MOUNT_TARGET="${SONGHEALTH_DB_MOUNT_TARGET:-/var/lib/postgresql}"
MEDIA_MOUNT_TARGET="${SONGHEALTH_MEDIA_MOUNT_TARGET:-/app/media}"
READINESS_COMMAND="${SONGHEALTH_READINESS_COMMAND:-node scripts/verify-readiness.mjs}"
APP_IMAGE="${SONGHEALTH_APP_IMAGE:-localhost/songhealth-app:0.0.1}"

# Set while the harness runs.
ROOT=''
TMP_DIR=''
GATE_BANNER=''
GATE_STAGE_MARKERS=()
QUADLET_SOURCE=''
QUADLET_BACKUP=''
QUADLET_MODIFIED=''
QUADLET_SOURCE_SHA_BASE=''
VOLUME_SNAPSHOT=''
# Probe results of the most recent probe_readiness call.
READINESS_STATE=''
READINESS_LINE=''
# The wiring form most recently accepted by gate_wiring_reason
# (direct | mapped | container); consumed by the container-form runtime
# identity binding.
WIRING_FORM=''
# STARTUP REFUSAL evidence context (C7, Product Owner decision 2026-10-09):
# 'verified-omission' once the currently loaded unit definition provably
# lacks the media attachment AND the current-invocation journal slice has
# been captured for the refusal reasoner; '' otherwise.
REFUSAL_STATE=''

usage() {
	cat <<'EOF'
Usage: tests/operations/verify-foundation.sh [--self-test]

T016 production smoke/lifecycle verification harness (User Story 2, RED
verification-first): prove the production rootless Podman/Quadlet
foundation's startup acceptance (T013 contract), private network boundary,
absence of any published PostgreSQL host port, expected persistent volume
attachments, exactly three start/stop/restart/recreate lifecycle cycles with
retained validation state, the missing-attachment not-ready behavior, and
the canonical tagline/media integrity comparisons after every checkpoint.

Stage order: P0 repository deployment-definition prerequisite (the expected
RED failure while T017–T020 are unimplemented) -> R1 task-owned target
resolution/validation -> C1 startup-gate evidence (live wiring proof on the
effective unit definition — host-executable identity or the approved
in-container podman/image/payload form — plus invocation-scoped, ordered
completion markers) + private non-mutating recurring readiness -> C2 private
network + app-to-database access ->
C3 no published PostgreSQL host port -> C4 persistent volume attachments ->
C5 canonical tagline/media integrity baseline -> C6 three lifecycle cycles
-> C7 missing-attachment negative (requires the explicit operational
not-ready result naming the media dependency — a genuine T012 helper result
from a running container, or the Product Owner approved STARTUP REFUSAL
class: an invocation-scoped, media-specific startup refusal with the
effective omission verified and no gate completion; guarded,
checksum-verified, fail-closed restore) -> C8 final integrity and
no-residue wrap-up.

Required environment inputs (see the script header for the full input
reference): SONGHEALTH_APP_ORIGIN, SONGHEALTH_VALIDATION_TOKEN,
SONGHEALTH_VALIDATION_MEDIA_PATH. Topology names default to the approved
plan structure and may be overridden (SONGHEALTH_APP_UNIT,
SONGHEALTH_DB_UNIT, SONGHEALTH_APP_CONTAINER, SONGHEALTH_DB_CONTAINER,
SONGHEALTH_NETWORK, SONGHEALTH_DB_VOLUME, SONGHEALTH_MEDIA_VOLUME,
SONGHEALTH_DB_MOUNT_TARGET, SONGHEALTH_MEDIA_MOUNT_TARGET,
SONGHEALTH_READINESS_COMMAND, SONGHEALTH_APP_QUADLET, SONGHEALTH_APP_IMAGE).

The harness never touches the development database resources
(songhealth-dev-db, songhealth-dev-db-data) or the host media tree, never
deletes or recreates a volume, and restores any transient attachment
omission on every exit path; an unverified restore preserves the recovery
copy and the scratch directory and exits nonzero.

  --self-test  Run isolated failure-path demonstrations of the guarded
               restore/cleanup branches, the missing-attachment readiness
               acceptance (both the T012 result and the STARTUP REFUSAL
               class), the wiring reasoner (host and in-container forms
               with complete-prefix control), the caller dispatch and
               runtime identity binding, the execution-argv attachment
               classifier, the refusal-evidence collector (authentic
               named-property state shapes), and the non-mutation detector,
               entirely against scratch files under a shimmed systemctl,
               journalctl, and podman. Touches no real deployment, unit,
               Quadlet, or container engine; exits 0 only when every
               demonstration passes.

Exit codes: 0 PASS | 1 FAIL (any stage, including the expected RED
prerequisite failure while T017–T020 are unimplemented) | 2 environment
error | 4 missing/invalid input | 64 usage error.
EOF
}

die() {
	# die <exit-code> <message...>
	local code="$1"
	shift
	printf 't016: %s\n' "$*" >&2
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]
	local name="$1" status="$2"
	shift 2
	printf 't016: [%s] %s ' "$name" "$status"
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$@"
	printf '\n'
}

pass() { step "$1" PASS "${@:2}"; }
info() { step "$1" INFO "${@:2}"; }
warn() { step "$1" WARN "${@:2}"; }

fail_stage() {
	# fail_stage <stage-name> <printf-format> [args...]
	local name="$1"
	shift
	printf 't016: [%s] FAIL ' "$name" >&2
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$@" >&2
	printf '\n' >&2
	exit "$EXIT_FAIL"
}

# ---------------------------------------------------------------------------
# Secret-safe helpers
# ---------------------------------------------------------------------------

scrub() {
	# stdin -> stdout with every known secret VALUE replaced by [REDACTED].
	# The secret values are read from the environment inside the node
	# process, so they never appear on any command line. Used before any
	# captured command output may reach the terminal.
	node -e '
		const names = ["PGPASSWORD", "EMDASH_MIGRATION_DATABASE_URL", "EMDASH_ENCRYPTION_KEY", "EMDASH_TOKEN", "SONGHEALTH_VALIDATION_TOKEN"];
		const values = names.map((n) => process.env[n]).filter((v) => typeof v === "string" && v.length >= 4);
		let data = "";
		process.stdin.on("data", (c) => (data += c));
		process.stdin.on("end", () => {
			for (const value of values) data = data.replaceAll(value, "[REDACTED]");
			process.stdout.write(data);
		});
	'
}

file_free_of_secrets() {
	# file_free_of_secrets <file>: exit 0 when the file contains none of the
	# known secret-bearing input values. The file is never printed.
	node -e '
		const fs = require("fs");
		const names = ["PGPASSWORD", "EMDASH_MIGRATION_DATABASE_URL", "EMDASH_ENCRYPTION_KEY", "EMDASH_TOKEN", "SONGHEALTH_VALIDATION_TOKEN"];
		const values = names.map((n) => process.env[n]).filter((v) => typeof v === "string" && v.length >= 4);
		const data = fs.readFileSync(process.argv[1], "utf8");
		process.exit(values.some((v) => data.includes(v)) ? 1 : 0);
	' "$1" 2>/dev/null
}

print_tail() {
	# print_tail <label> <file> [lines]: scrubbed bounded tail for diagnosis.
	local label="$1" file="$2" lines="${3:-15}"
	if [ -s "$file" ]; then
		printf 't016: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't016: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Cleanup: above all, restore the C7 attachment omission on every exit path,
# then remove the scratch directory. No persistent state is ever deleted.
# ---------------------------------------------------------------------------

restore_app_quadlet() {
	# Byte-exact restore of the application Quadlet source after the C7
	# negative test, including from the interruption traps. Returns 0 ONLY
	# when there is nothing to restore or the restore is verified byte-exact
	# (SHA-256 equal to the recorded pre-edit baseline). Any restoration
	# problem fails closed and preserves the recovery material: an adjacent
	# recovery copy is written next to the source where possible, and the
	# scratch directory holding the original backup is kept by cleanup(), so
	# the recovery path is genuine on every exit path.
	if [ -z "$QUADLET_MODIFIED" ] || [ -z "$QUADLET_SOURCE" ] || [ -z "$QUADLET_BACKUP" ]; then
		return 0
	fi
	if [ ! -f "$QUADLET_BACKUP" ] || [ ! -f "$QUADLET_SOURCE" ]; then
		step cleanup WARN 'cannot attempt the byte-exact restore: the baseline copy (%s) or the source (%s) is missing; the scratch directory is KEPT — inspect it before any manual repair' \
			"$QUADLET_BACKUP" "$QUADLET_SOURCE"
		return 1
	fi
	local restored_sha=''
	if ! cat "$QUADLET_BACKUP" >"$QUADLET_SOURCE" 2>/dev/null ||
		! restored_sha="$(sha256sum "$QUADLET_SOURCE" | awk '{print $1}')" ||
		[ "$restored_sha" != "$QUADLET_SOURCE_SHA_BASE" ]; then
		# Unverified restore: never delete the recovery material. Keep a
		# recovery copy next to the source (durable, outside the scratch
		# directory) in addition to the original backup that cleanup()
		# preserves.
		local recovery="$QUADLET_SOURCE.t016-recovery"
		if cp -p "$QUADLET_BACKUP" "$recovery" 2>/dev/null; then
			step cleanup WARN 'byte-exact restore of %s could NOT be verified; recovery copy preserved at %s and the original backup kept at %s — restore manually, then run: systemctl --user daemon-reload && systemctl --user start %s' \
				"$QUADLET_SOURCE" "$recovery" "$QUADLET_BACKUP" "$APP_UNIT"
		else
			step cleanup WARN 'byte-exact restore of %s could NOT be verified and the adjacent recovery copy could not be written; the original backup is kept at %s — restore it manually, then run: systemctl --user daemon-reload && systemctl --user start %s' \
				"$QUADLET_SOURCE" "$QUADLET_BACKUP" "$APP_UNIT"
		fi
		return 1
	fi
	QUADLET_MODIFIED=''
	systemctl --user daemon-reload >/dev/null 2>&1 || true
	if systemctl --user is-active --quiet "$APP_UNIT" 2>/dev/null; then
		step cleanup INFO 'application Quadlet source restored byte-exact (SHA-256 verified); attachment definition matches the baseline again'
	else
		if timeout --kill-after=15 "${UNIT_WAIT_SECONDS}s" systemctl --user restart "$APP_UNIT" >/dev/null 2>&1; then
			step cleanup INFO 'application Quadlet source restored byte-exact and the unit restarted after the attachment-omission test'
		else
			step cleanup WARN 'application Quadlet source restored byte-exact, but the unit did not restart cleanly; run: systemctl --user start %s' "$APP_UNIT"
		fi
	fi
	return 0
}

cleanup() {
	# Preserves the scratch directory whenever the byte-exact restore is not
	# verified: it holds the only guaranteed copy of the pre-edit Quadlet
	# source (plus the adjacent recovery copy written by the restore). Only a
	# verified restore (or nothing to restore) may remove it. Returns nonzero
	# in the unrestorable case so the exit traps force an actionable nonzero
	# result.
	if restore_app_quadlet; then
		if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
			rm -rf "$TMP_DIR"
		fi
		return 0
	fi
	if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
		step cleanup WARN 'scratch directory KEPT (recovery material inside, never deleted while the restore is unverified): %s' "$TMP_DIR"
	fi
	return 1
}

on_exit() {
	# EXIT trap: never exit 0 with an unrestorable attachment omission.
	local ec=$?
	if ! cleanup; then
		if [ "$ec" -eq 0 ]; then
			ec=1
		fi
	fi
	exit "$ec"
}

on_signal() {
	# INT/TERM traps: run the same fail-closed cleanup and exit with the
	# signal-appropriate nonzero code (nonzero is guaranteed both ways; the
	# cleanup WARN lines carry the retained recovery path when a restore
	# could not be verified).
	trap - EXIT INT TERM
	cleanup || true
	exit "$1"
}

# ---------------------------------------------------------------------------
# P0 — RED prerequisite: the production deployment definitions exist
# ---------------------------------------------------------------------------

check_deployment_definitions() {
	local missing=()
	local absent_files='' file i
	if [ ! -f "$ROOT/$T013_SCRIPT" ]; then
		fail_stage P0 'the T013 startup-acceptance authority %s is absent from the repository; this harness reuses and anchors on it and cannot verify the startup gate without it' \
			"$T013_SCRIPT"
	fi
	for file in "${DEPLOY_DEFINITION_FILES[@]}"; do
		if [ ! -f "$ROOT/$file" ]; then
			missing+=("$file")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		for file in "${missing[@]}"; do
			absent_files+="${absent_files:+, }$file"
		done
		printf 't016: [P0] FAIL production deployment definition(s) absent from the repository: %s\n' "$absent_files" >&2
		printf 't016: [P0] these are the intentionally unimplemented T017–T020 production artifacts; the T016 harness fails closed for exactly this bounded prerequisite reason\n' >&2
		for i in "${!DEPLOY_DEFINITION_FILES[@]}"; do
			if [ ! -f "$ROOT/${DEPLOY_DEFINITION_FILES[$i]}" ]; then
				printf 't016: [P0] missing %s — owned by %s\n' \
					"${DEPLOY_DEFINITION_FILES[$i]}" "${DEPLOY_DEFINITION_OWNERS[$i]}" >&2
			fi
		done
		printf 't016: [P0] no lifecycle, network, volume, or persistence probe was attempted and nothing was mutated\n' >&2
		exit "$EXIT_FAIL"
	fi
	pass P0 'production deployment definitions present in the repository (Containerfile + five Quadlet units) and the T013 authority script resolved'
}

# ---------------------------------------------------------------------------
# Tool and input validation
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in podman systemctl journalctl node sha256sum timeout mktemp; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
}

validate_inputs() {
	local missing=()
	local var
	for var in SONGHEALTH_APP_ORIGIN SONGHEALTH_VALIDATION_TOKEN \
		SONGHEALTH_VALIDATION_MEDIA_PATH; do
		if [ -z "${!var:-}" ]; then
			missing+=("$var")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		printf 't016: [R1] FAIL missing required input(s): %s\n' "${missing[*]}" >&2
		printf 't016: [R1] supply the documented external validation inputs in the environment (never on a command line); see the script header\n' >&2
		exit "$EXIT_CONFIG"
	fi

	case $SONGHEALTH_APP_ORIGIN in
	http://* | https://*) ;;
	*)
		die "$EXIT_CONFIG" 'SONGHEALTH_APP_ORIGIN must be an absolute http:// or https:// origin (scheme + host + optional port, no path)'
		;;
	esac
	# Strip the scheme and require a bare authority: no path, query, or
	# fragment components (a simple glob cannot do this — shell wildcards
	# match "/" and the empty string, so a normal origin would be rejected).
	local origin_authority=''
	origin_authority="${SONGHEALTH_APP_ORIGIN#http://}"
	origin_authority="${origin_authority#https://}"
	case $origin_authority in
	'' | */* | *\?* | *\#*)
		die "$EXIT_CONFIG" 'SONGHEALTH_APP_ORIGIN must be a bare origin: host and optional port only, no path, query, or fragment'
		;;
	esac
	case $SONGHEALTH_VALIDATION_MEDIA_PATH in
	/*) ;;
	*) die "$EXIT_CONFIG" 'SONGHEALTH_VALIDATION_MEDIA_PATH must be an absolute URL path beginning with /' ;;
	esac

	# The resolved production targets must never collide with the documented
	# development resources this harness must not touch.
	local guard_name
	for guard_name in $DEV_GUARD_NAMES; do
		case " $APP_UNIT $DB_UNIT $APP_CONTAINER $DB_CONTAINER $NETWORK_NAME $DB_VOLUME $MEDIA_VOLUME " in
		*" $guard_name "*)
			die "$EXIT_CONFIG" "a resolved production target collides with the preserved development resource name $guard_name; this harness never operates on the T015 development database/media state"
			;;
		esac
	done
}

# ---------------------------------------------------------------------------
# R1 — resolve and validate the exact task-owned targets (read-only, before
# any mutation)
# ---------------------------------------------------------------------------

unit_exists() {
	# unit_exists <unit>: exit 0 when the user-systemd unit is known.
	systemctl --user cat "$1" >/dev/null 2>&1
}

container_running() {
	# container_running <container>: exit 0 when the container exists and
	# runs.
	podman ps --filter name="^$1\$" --filter status=running --format '{{.Names}}' 2>/dev/null | grep -Fxq "$1"
}

container_state() {
	# container_state <container>: prints the container state or 'absent'.
	local state=''
	state="$(podman container inspect "$1" --format '{{.State.Status}}' 2>/dev/null || true)"
	printf '%s' "${state:-absent}"
}

container_id() {
	# container_id <container>: prints the full container ID or empty.
	podman container inspect "$1" --format '{{.Id}}' 2>/dev/null || true
}

validate_container_ownership() {
	# validate_container_ownership <container> <unit>: the container must run
	# inside the owning unit's cgroup, proving it is this deployment's
	# task-owned ephemeral container and not a same-name foreign resource —
	# the precondition for any later stop/rm lifecycle exercise.
	local container="$1" unit="$2"
	local cgroup=''
	cgroup="$(podman container inspect "$container" --format '{{.CgroupPath}}' 2>/dev/null || true)"
	if [ -z "$cgroup" ]; then
		fail_stage R1 'could not resolve the cgroup of container %s' "$container"
	fi
	case $cgroup in
	*"$unit"*) ;;
	*)
		fail_stage R1 'container %s does not run in the cgroup of unit %s (cgroup owner mismatch); refusing to treat it as a task-owned target' \
			"$container" "$unit"
		;;
	esac
}

snapshot_volumes() {
	# snapshot_volumes: sorted named-volume list (names only, non-secret).
	podman volume ls --format '{{.Name}}' 2>/dev/null | sort || true
}

resolve_targets() {
	local unit
	for unit in "$APP_UNIT" "$DB_UNIT"; do
		if ! unit_exists "$unit"; then
			fail_stage R1 'user-systemd unit %s is not known; the approved Quadlet units must be installed in the rootless user location before production verification' \
				"$unit"
		fi
	done
	if ! systemctl --user is-system-running >/dev/null 2>&1; then
		die "$EXIT_ENV" 'the user systemd manager is not runnable from this session; production verification requires a rootless user session with user systemd (Quadlet baseline)'
	fi
	for unit in "$APP_UNIT" "$DB_UNIT"; do
		if ! systemctl --user is-active --quiet "$unit"; then
			fail_stage R1 'unit %s is not active; start the production deployment (systemctl --user start %s %s) before verification' \
				"$unit" "$DB_UNIT" "$APP_UNIT"
		fi
	done

	if ! container_running "$APP_CONTAINER"; then
		fail_stage R1 'application container %s is not running under unit %s' "$APP_CONTAINER" "$APP_UNIT"
	fi
	if ! container_running "$DB_CONTAINER"; then
		fail_stage R1 'database container %s is not running under unit %s' "$DB_CONTAINER" "$DB_UNIT"
	fi
	validate_container_ownership "$APP_CONTAINER" "$APP_UNIT"
	validate_container_ownership "$DB_CONTAINER" "$DB_UNIT"

	if ! podman network exists "$NETWORK_NAME" 2>/dev/null; then
		fail_stage R1 'the approved private application network %s does not exist' "$NETWORK_NAME"
	fi
	local volume
	for volume in "$DB_VOLUME" "$MEDIA_VOLUME"; do
		if ! podman volume exists "$volume" 2>/dev/null; then
			fail_stage R1 'expected persistent volume %s does not exist' "$volume"
		fi
	done

	# Baseline snapshot used by the later no-new-resources proof. Volumes are
	# never created or deleted by this harness; the snapshot only proves that
	# the set is unchanged. (The container-replacement proof captures each
	# cycle's own before/after container ids, because they legitimately
	# change across cycles.)
	VOLUME_SNAPSHOT="$(snapshot_volumes)"

	# Resolve the application Quadlet source for the guarded C7 negative test
	# before any mutation happens, so the omission test can never operate on
	# an unresolved path.
	if [ -n "${SONGHEALTH_APP_QUADLET:-}" ]; then
		QUADLET_SOURCE="$SONGHEALTH_APP_QUADLET"
	else
		local unit_base config_dir
		unit_base="${APP_UNIT%.service}"
		config_dir="${XDG_CONFIG_HOME:-$HOME/.config}"
		QUADLET_SOURCE="$config_dir/containers/systemd/$unit_base.container"
	fi
	if [ ! -f "$QUADLET_SOURCE" ]; then
		fail_stage R1 'the application Quadlet source %s is not present at the documented rootless user location; set SONGHEALTH_APP_QUADLET to the installed source path' \
			"$QUADLET_SOURCE"
	fi

	info R1 'resolved targets: units %s + %s, containers %s + %s, network %s, volumes %s + %s' \
		"$APP_UNIT" "$DB_UNIT" "$APP_CONTAINER" "$DB_CONTAINER" \
		"$NETWORK_NAME" "$DB_VOLUME" "$MEDIA_VOLUME"
	info R1 'application Quadlet source for the guarded negative test: %s' "$QUADLET_SOURCE"
	pass R1 'task-owned targets resolved and validated (unit cgroup ownership proven) before any lifecycle mutation; development resources guarded: %s' \
		"$DEV_GUARD_NAMES"
}

# ---------------------------------------------------------------------------
# C1 — T013 startup-acceptance gate evidence before READY, and private
# non-mutating recurring readiness
# ---------------------------------------------------------------------------

derive_gate_markers() {
	# The completion evidence this harness requires is derived from the
	# accepted T013 script itself at runtime, never re-typed here: the final
	# PASS banner AND every `t013: [S<n>] PASS` stage marker the script
	# emits (the `pass S<n>` calls it contains). The markers alone are NOT
	# execution proof — they are fixed prefixes that could be fabricated in
	# a log — so they are always combined with the live WIRING proof in
	# require_gate_wiring_for_unit (the effective unit definition must invoke
	# the accepted authority) and checked in ascending stage order within the
	# current invocation. If the script no longer contains the expected
	# sequence, this harness fails closed rather than accepting a drifted or
	# weakened substitute.
	GATE_BANNER="$(grep -oF "$T013_BANNER_MARKER" "$ROOT/$T013_SCRIPT" | head -1 || true)"

# The accepted T020 startup payload (exceptional round 4, blocker 2), base64
# of the exact sh -c payload committed in the accepted T020 candidate
# (deploy/quadlet/songhealth-app.container at fd5c2ea2, Exec= line): the
# mount/store guards, secret reads, export, the role-prerequisite node
# program, the T013 gate mapping, and the HOST=0.0.0.0 exec server launch.
# The container-form wiring accepts ONLY this payload (byte-equal after
# systemd escape decoding): executable-name whitelists cannot prove the
# approved commands and arguments, so a grouped eval, shell-function
# shadowing, an unauthorized assignment, an altered role-check program, or
# any execution redirection - however deeply quoted or nested - differs
# from the accepted payload and is rejected. The structural rules remain
# as earlier-diagnosis layers; this equality gate is the authority.
# base64 avoids every shell/JS quoting hazard for the 42 backticks and
# $q$ literals inside.
readonly APPROVED_STARTUP_PAYLOAD_B64='Z3JlcCAtcSAnIC9hcHAvbWVkaWEgJyAvcHJvYy9tb3VudHMgfHwgeyBlY2hvIHNvbmdoZWFsdGgtYXBwOiByZXF1aXJlZCBwZXJzaXN0ZW50IG1lZGlhIHZvbHVtZSBzb25naGVhbHRoLW1lZGlhIGlzIG5vdCBhdHRhY2hlZCBhdCAvYXBwL21lZGlhIC0gcmVmdXNpbmcgdG8gc3RhcnQgPiYyOyBleGl0IDE7IH07IHRlc3QgLXIgL2FwcC9tZWRpYS8uc29uZ2hlYWx0aC1tZWRpYS1zdG9yZSB8fCB7IGVjaG8gc29uZ2hlYWx0aC1hcHA6IG9wZXJhdG9yLW1hbmFnZWQgZXhpc3RpbmcgbWVkaWEgc3RvcmUgbWFya2VyIC5zb25naGVhbHRoLW1lZGlhLXN0b3JlIGlzIG1pc3NpbmcgYXQgL2FwcC9tZWRpYSAtIHRoZSBwZXJzaXN0ZW50IHN0b3JlIHdhcyBub3QgcHJvdmlzaW9uZWQgb3IgaGFzIGJlZW4gcmVwbGFjZWQgLSByZWZ1c2luZyB0byBzdGFydCA+JjI7IGV4aXQgMTsgfTsgSUZTPSByZWFkIC1yIEVNREFTSF9NSUdSQVRJT05fREFUQUJBU0VfVVJMIDwvcnVuL3NlY3JldHMvc29uZ2hlYWx0aC1taWdyYXRpb24tZGF0YWJhc2UtdXJsOyBJRlM9IHJlYWQgLXIgRU1EQVNIX0VOQ1JZUFRJT05fS0VZIDwvcnVuL3NlY3JldHMvc29uZ2hlYWx0aC1lbmNyeXB0aW9uLWtleTsgZXhwb3J0IEVNREFTSF9NSUdSQVRJT05fREFUQUJBU0VfVVJMIEVNREFTSF9FTkNSWVBUSU9OX0tFWTsgbm9kZSAtZSAnY29uc3QgcGc9cmVxdWlyZShgcGdgKTtjb25zdCBjPW5ldyBwZy5DbGllbnQoe2hvc3Q6cHJvY2Vzcy5lbnYuUEdIT1NULHBvcnQ6TnVtYmVyKHByb2Nlc3MuZW52LlBHUE9SVCksZGF0YWJhc2U6cHJvY2Vzcy5lbnYuUEdEQVRBQkFTRSx1c2VyOnByb2Nlc3MuZW52LlBHVVNFUixwYXNzd29yZDpwcm9jZXNzLmVudi5QR1BBU1NXT1JELGNvbm5lY3Rpb25UaW1lb3V0TWlsbGlzOjUwMDAscXVlcnlfdGltZW91dDo1MDAwfSk7Y29uc3QgZmFpbD1tPT57Y29uc29sZS5lcnJvcihgc29uZ2hlYWx0aC1hcHA6IGArbSk7cHJvY2Vzcy5leGl0KDEpfTsoYXN5bmMoKT0+e2F3YWl0IGMuY29ubmVjdCgpO2NvbnN0IHI9YXdhaXQgYy5xdWVyeShgc2VsZWN0IHJvbHN1cGVyIHMscm9sY3JlYXRlZGIgY2Qscm9sY3JlYXRlcm9sZSBjcixoYXNfZGF0YWJhc2VfcHJpdmlsZWdlKGN1cnJlbnRfdXNlcixjdXJyZW50X2RhdGFiYXNlKCksJHEkQ09OTkVDVCRxJCkgZGJjLGhhc19zY2hlbWFfcHJpdmlsZWdlKGN1cnJlbnRfdXNlciwkcSRwdWJsaWMkcSQsJHEkVVNBR0UkcSQpIHN1LGhhc19zY2hlbWFfcHJpdmlsZWdlKGN1cnJlbnRfdXNlciwkcSRwdWJsaWMkcSQsJHEkQ1JFQVRFJHEkKSBzYyBmcm9tIHBnX3JvbGVzIHdoZXJlIHJvbG5hbWU9Y3VycmVudF91c2VyYCk7Y29uc3QgYj1yLnJvd3NbMF07aWYoIWIpZmFpbChgbGVhc3QtcHJpdmlsZWdlIGFwcGxpY2F0aW9uLXJvbGUgcHJlcmVxdWlzaXRlIGZhaWxlZDogdGhlIGNvbm5lY3Rpbmcgcm9sZSBoYXMgbm8gcGdfcm9sZXMgcm93YCk7aWYoYi5zKWZhaWwoYGxlYXN0LXByaXZpbGVnZSBhcHBsaWNhdGlvbi1yb2xlIHByZXJlcXVpc2l0ZSBmYWlsZWQ6IHRoZSBjb25uZWN0aW5nIHJvbGUgaXMgU1VQRVJVU0VSIC0gdGhlIGJvb3RzdHJhcCBhZG1pbmlzdHJhdG9yIGlzIG5vdCB0aGUgYXBwbGljYXRpb24gaWRlbnRpdHlgKTtpZihiLmNkKWZhaWwoYGxlYXN0LXByaXZpbGVnZSBhcHBsaWNhdGlvbi1yb2xlIHByZXJlcXVpc2l0ZSBmYWlsZWQ6IHRoZSBjb25uZWN0aW5nIHJvbGUgaGFzIENSRUFURURCYCk7aWYoYi5jcilmYWlsKGBsZWFzdC1wcml2aWxlZ2UgYXBwbGljYXRpb24tcm9sZSBwcmVyZXF1aXNpdGUgZmFpbGVkOiB0aGUgY29ubmVjdGluZyByb2xlIGhhcyBDUkVBVEVST0xFYCk7aWYoIWIuZGJjKWZhaWwoYGxlYXN0LXByaXZpbGVnZSBhcHBsaWNhdGlvbi1yb2xlIHByZXJlcXVpc2l0ZSBmYWlsZWQ6IHRoZSBjb25uZWN0aW5nIHJvbGUgbGFja3MgQ09OTkVDVCBvbiB0aGUgdGFyZ2V0IGRhdGFiYXNlYCk7aWYoIWIuc3UpZmFpbChgbGVhc3QtcHJpdmlsZWdlIGFwcGxpY2F0aW9uLXJvbGUgcHJlcmVxdWlzaXRlIGZhaWxlZDogdGhlIGNvbm5lY3Rpbmcgcm9sZSBsYWNrcyBVU0FHRSBvbiBzY2hlbWEgcHVibGljYCk7aWYoIWIuc2MpZmFpbChgbGVhc3QtcHJpdmlsZWdlIGFwcGxpY2F0aW9uLXJvbGUgcHJlcmVxdWlzaXRlIGZhaWxlZDogdGhlIGNvbm5lY3Rpbmcgcm9sZSBsYWNrcyBDUkVBVEUgb24gc2NoZW1hIHB1YmxpY2ApO2NvbnN0IG89YXdhaXQgYy5xdWVyeShgc2VsZWN0IGNhc2UgYy5yZWxraW5kIHdoZW4gJHEkUyRxJCB0aGVuICRxJHNlcXVlbmNlJHEkIGVsc2UgJHEkdGFibGUkcSQgZW5kIGtpbmQsYy5yZWxuYW1lIG9iaixwZ19oYXNfcm9sZShjdXJyZW50X3VzZXIsYy5yZWxvd25lciwkcSRVU0FHRSRxJCkgb3duZWQsY2FzZSBjLnJlbGtpbmQgd2hlbiAkcSRTJHEkIHRoZW4gaGFzX3NlcXVlbmNlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkU0VMRUNUJHEkKSBhbmQgaGFzX3NlcXVlbmNlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkVVNBR0UkcSQpIGFuZCBoYXNfc2VxdWVuY2VfcHJpdmlsZWdlKGN1cnJlbnRfdXNlcixjLm9pZCwkcSRVUERBVEUkcSQpIGVsc2UgaGFzX3RhYmxlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkU0VMRUNUJHEkKSBhbmQgaGFzX3RhYmxlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkSU5TRVJUJHEkKSBhbmQgaGFzX3RhYmxlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkVVBEQVRFJHEkKSBhbmQgaGFzX3RhYmxlX3ByaXZpbGVnZShjdXJyZW50X3VzZXIsYy5vaWQsJHEkREVMRVRFJHEkKSBlbmQgZG1sIGZyb20gcGdfY2xhc3MgYyBqb2luIHBnX25hbWVzcGFjZSBuIG9uIG4ub2lkPWMucmVsbmFtZXNwYWNlIHdoZXJlIGMucmVsa2luZCBpbiAoJHEkciRxJCwkcSRwJHEkLCRxJFMkcSQpIGFuZCBuLm5zcG5hbWU9JHEkcHVibGljJHEkYCk7YXdhaXQgYy5lbmQoKTtmb3IoY29uc3QgeCBvZiBvLnJvd3Mpe2NvbnN0IHA9W107aWYoIXgub3duZWQpcC5wdXNoKGBub3Qgb3duZWQgYnkgdGhlIGNvbm5lY3Rpbmcgcm9sZSBkaXJlY3RseSBvciB0aHJvdWdoIHJvbGUgbWVtYmVyc2hpcGApO2lmKCF4LmRtbClwLnB1c2goYGxhY2tpbmcgZWZmZWN0aXZlIHJlcXVpcmVkIERNTCBwcml2aWxlZ2VzYCk7aWYocC5sZW5ndGg+MClmYWlsKGBsZWFzdC1wcml2aWxlZ2UgYXBwbGljYXRpb24tcm9sZSBwcmVyZXF1aXNpdGUgZmFpbGVkOiBleGlzdGluZyBFbURhc2ggYCt4LmtpbmQrYCBgK3gub2JqK2AgaW4gc2NoZW1hIHB1YmxpYyBpcyBgK3Auam9pbihgIGFuZCBgKSl9Y29uc29sZS5lcnJvcihgc29uZ2hlYWx0aC1hcHA6IGxlYXN0LXByaXZpbGVnZSBhcHBsaWNhdGlvbi1yb2xlIHByZXJlcXVpc2l0ZSB2ZXJpZmllZDogbm9uLXN1cGVydXNlciwgbm8gQ1JFQVRFREIsIG5vIENSRUFURVJPTEUsIGRhdGFiYXNlIENPTk5FQ1QsIHNjaGVtYSBwdWJsaWMgVVNBR0UgYW5kIENSRUFURSwgYW5kIGArby5yb3dzLmxlbmd0aCtgIGV4aXN0aW5nIEVtRGFzaCByZWxhdGlvbihzKSBpbiBzY2hlbWEgcHVibGljIHBhc3MgcmVxdWlyZWQgb3duZXJzaGlwIChkaXJlY3Qgb3IgaW5oZXJpdGVkKSBhbmQgZnVsbCBETUwgdmVyaWZpY2F0aW9uYCl9KSgpLmNhdGNoKGU9PmZhaWwoYGxlYXN0LXByaXZpbGVnZSBhcHBsaWNhdGlvbi1yb2xlIHByZXJlcXVpc2l0ZSBmYWlsZWQ6IGArKChlJiZlLmNvZGUpfHxgZXJyb3JgKSkpJyAmJiBucG0gcnVuIHZlcmlmeTpzdGFydHVwICYmIEhPU1Q9MC4wLjAuMCBleGVjIG5vZGUgZGlzdC9zZXJ2ZXIvZW50cnkubWpz'
APPROVED_STARTUP_PAYLOAD="$(printf '%s' "$APPROVED_STARTUP_PAYLOAD_B64" | base64 -d)"
export APPROVED_STARTUP_PAYLOAD
	if [ -z "$GATE_BANNER" ]; then
		fail_stage C1 'could not derive the T013 gate completion banner from %s; the authority script changed and this harness refuses to weaken its evidence anchor' \
			"$T013_SCRIPT"
	fi
	local stages=() s
	mapfile -t stages < <(grep -oE 'pass S[0-9]+ ' "$ROOT/$T013_SCRIPT" | awk '{print $2}' | sort -u)
	if [ "${#stages[@]}" -lt 6 ]; then
		fail_stage C1 'could not derive the full T013 stage sequence from %s (found %s distinct stage markers, expected at least the S1-S6 sequence); the authority script changed and this harness refuses to weaken its evidence anchor' \
			"$T013_SCRIPT" "${#stages[@]}"
	fi
	GATE_STAGE_MARKERS=()
	for s in "${stages[@]}"; do
		GATE_STAGE_MARKERS+=("t013: [$s] PASS")
	done
}

gate_wiring_reason() {
	# gate_wiring_reason <effective-unit-definition-file>: prints '' (empty)
	# when the effective startup definition provably invokes the accepted
	# T013 authority AS A COMMAND WITH PROVEN EXECUTABLE IDENTITY in one of
	# the two Product Owner approved forms, and otherwise the actionable
	# rejection reason. Structural command-position checks (tokenized Exec
	# lines, never substring presence in arguments, shell payloads, or
	# comments) PLUS identity anchors resolved against the trusted
	# execution context — the repository checkout this harness itself
	# anchors on and the trusted tool resolution of its environment:
	#   HOST FORM (original):
	#   AUTHORITY ANCHOR (the accepted script): the executable token must
	#     contain a '/' and its realpath (symlinks resolved) must EQUAL the
	#     realpath of <repo>/tests/operations/verify-startup.sh. A bare
	#     basename (unprovable systemd PATH resolution) and any same-suffix
	#     path in an unrelated tree are rejected. A symlink that RESOLVES to
	#     the authority file is the authority; a same-basename or
	#     same-suffix copy elsewhere is not.
	#   INTERPRETER ANCHOR: an interpreter token (sh/bash/dash/zsh/ksh) is
	#     trusted only as an absolute path whose realpath is a system
	#     interpreter under /usr.
	#   PACKAGE-RUN ANCHOR (npm): the npm token must be an absolute path
	#     whose realpath EQUALS the npm executable this harness's trusted
	#     environment itself resolves on PATH (the operator's real npm); a
	#     fake runner such as /tmp/npm never matches. Bare `npm` in a unit
	#     is rejected (the unit's own PATH is not provable here).
	#   CONTAINER FORM (Product Owner decision 2026-10-09 — the approved
	#   in-container startup gate invocation):
	#   PODMAN ANCHOR: the runner token must be an absolute path whose
	#     realpath EQUALS the podman executable this harness's environment
	#     resolves on PATH; bare `podman` is rejected.
	#   IMAGE/CONTAINER ANCHOR: the run must name the expected application
	#     container (the Quadlet-generated systemd-%N specifier form or the
	#     configured APP_CONTAINER literal) and reference the intended
	#     application image identity as the exact token SONGHEALTH_APP_IMAGE
	#     or that identity digest-pinned as <image>@sha256:<64 hex> — never
	#     `latest`, never a different repository or floating tag.
	#   STRUCTURAL PAYLOAD PROOF: the container command must be ONE sh -c
	#     startup payload whose quote-aware token stream (a) invokes the
	#     committed verify:startup mapping as [npm][run][verify:startup] in
	#     command position, (b) starts the accepted standalone server
	#     [node][dist/server/entry.mjs], and (c) chains the server strictly
	#     AFTER the gate with only success-preserving tokens between them
	#     (`&&`, `exec`, KEY=VALUE assignments) — `;`, `||`, or any other
	#     operator between gate and server is a failure-ignoring chain and
	#     is rejected. Occurrences of the gate names inside quoted strings
	#     are inert decoy text and are rejected.
	#   MAPPING VALIDATION (both package-run forms): the committed
	#   package.json verify:startup mapping must itself satisfy the
	#   authority-anchor rule, with relative tokens resolved against the
	#   package root (npm's documented script working directory) — not by
	#   substring search.
	# Relative script paths are accepted ONLY in the package.json mapping
	# context (defined base); in unit Exec lines every path must be absolute
	# and resolvable, else the identity is unprovable and the reasoner
	# fails closed. This is the live WIRING half of the execution proof;
	# journal marker text alone (which can be fabricated) is never accepted
	# without it. Kept as a pure reasoner over unit-definition text so the
	# --self-test demonstrations exercise the identical logic.
	local unit_file="$1" verdict='' out_reason="${2:-}" out_form="${3:-}"
	WIRING_FORM=''
	# Optional variable-name arguments (rework r2, finding 1): when given,
	# the verdict is stored into the CALLER's variables with printf -v
	# instead of being printed for command substitution - a form assigned
	# only inside $(...) cannot propagate to the caller, which previously
	# left the container identity binding permanently skipped. Bare
	# single-argument calls keep the original print-empty-on-accept
	# contract used by the self-test reasoner demonstrations.
	verdict="$(node -e '
		const fs = require("fs");
		const path = require("path");
		const ACCEPTED = "tests/operations/verify-startup.sh";
		const INTERPRETERS = new Set(["sh", "bash", "dash", "zsh", "ksh"]);
		const unitFile = process.argv[1];
		const pkgFile = process.argv[2];
		const rootDir = process.argv[3];
		const appImage = process.argv[4] || "localhost/songhealth-app:0.0.1";
		const appContainer = process.argv[5] || "systemd-songhealth-app";
		const mediaMountTarget = process.argv[6] || "/app/media";
		const fail = (reason) => { process.stdout.write("reject " + reason + "\n"); process.exit(0); };
		const realpathQuiet = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
		const authorityAnchor = realpathQuiet(path.join(rootDir, ACCEPTED));
		if (!authorityAnchor) fail("could not resolve the accepted T013 authority (" + ACCEPTED + ") in the repository checkout this harness verifies from");
		const resolveOnPath = (name) => {
			for (const dir of String(process.env.PATH || "").split(":").filter(Boolean)) {
				const resolved = realpathQuiet(path.join(dir, name));
				if (resolved) return resolved;
			}
			return null;
		};
		const trustedNpm = resolveOnPath("npm");
		const trustedPodman = resolveOnPath("podman");
		const underSystemPrefix = (p) => p === "/usr" || p.startsWith("/usr/");
		const resolvesToAuthority = (token, baseDir) => {
			if (typeof token !== "string" || !token.includes("/")) return false;
			let full = token;
			if (!path.isAbsolute(token)) {
				if (!baseDir) return false;
				full = path.join(baseDir, token);
			}
			const resolved = realpathQuiet(full);
			return resolved !== null && resolved === authorityAnchor;
		};
		const trustedInterpreter = (token) => {
			if (typeof token !== "string" || !token.includes("/")) return false;
			const resolved = realpathQuiet(token);
			return resolved !== null && underSystemPrefix(resolved) && INTERPRETERS.has(path.basename(resolved));
		};
		const trustedNpmToken = (token) => {
			if (typeof token !== "string" || !token.includes("/") || !trustedNpm) return false;
			const resolved = realpathQuiet(token);
			return resolved !== null && resolved === trustedNpm;
		};
		const invokesDirectly = (tokens, baseDir) => {
			if (tokens.length === 0) return false;
			if (resolvesToAuthority(tokens[0], baseDir)) return true;
			if (trustedInterpreter(tokens[0]) && tokens.length >= 2 && resolvesToAuthority(tokens[1], baseDir)) return true;
			return false;
		};
		const escapeRegExp = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const digestForm = new RegExp("^" + escapeRegExp(appImage) + "@sha256:[0-9a-f]{64}$");
		// Quote-aware shell lexer for the sh -c startup payload: emits
		// {text, quoted} tokens; ; && || become standalone operator tokens;
		// everything inside quotes is one inert string token.
		const shellTokens = (payload) => {
			const out = [];
			let cur = "", has = false, quoted = false, quoteChar = "", quoteSeen = false;
			for (let i = 0; i < payload.length; i++) {
				const ch = payload[i];
				if (quoted) {
					if (ch === quoteChar) { quoted = false; continue; }
					if (ch === "\\" && quoteChar === "\"" && i + 1 < payload.length) { cur += payload[i + 1]; i++; has = true; continue; }
					cur += ch; has = true; continue;
				}
				const SQ = String.fromCharCode(39), DQ = String.fromCharCode(34);
				if (ch === SQ || ch === DQ) { quoted = true; quoteChar = ch; quoteSeen = true; has = true; continue; }
				if (/\s/.test(ch)) {
					if (has) { out.push({ text: cur, quoted: quoteSeen }); cur = ""; has = false; quoteSeen = false; }
					continue;
				}
				if (ch === ";" || ch === "&" || ch === "|") {
					if (has) { out.push({ text: cur, quoted: quoteSeen }); cur = ""; has = false; quoteSeen = false; }
					if ((ch === "&" || ch === "|") && payload[i + 1] === ch) { out.push({ text: ch + ch, quoted: false }); i++; }
					else out.push({ text: ch, quoted: false });
					continue;
				}
				cur += ch; has = true;
			}
			if (has) out.push({ text: cur, quoted: quoteSeen });
			return out;
		};
		const isAssignment = (t) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(t);
		const acceptsContainerInvocation = (tokens) => {
			if (!trustedPodman) return "no trusted podman runner could be resolved in this verification environment";
			if (tokens[0] !== trustedPodman) return "the container runner token does not resolve to the podman executable this verification environment trusts";
			if (tokens[1] !== "run") return "the trusted runner is not executing a container run";
			const nameIdx = tokens.findIndex((t, i) => i >= 2 && t === "--name" && i + 1 < tokens.length);
			if (nameIdx === -1 || (tokens[nameIdx + 1] !== "systemd-%N" && tokens[nameIdx + 1] !== appContainer)) return "the container run does not name the expected application container";
			const n = tokens.length;
			if (n < 6 || tokens[n - 3] !== "sh" || tokens[n - 2] !== "-c") return "the container command is not one sh -c startup payload";
			const image = tokens[n - 4];
			if (image.startsWith("-")) return "no explicit application image token precedes the startup payload";
			if (/:(latest)$/.test(image) || image.endsWith(":latest")) return "a floating latest image tag is not the intended application image";
			// The container form requires the immutable digest-pinned form of
			// the intended identity: a bare tag cannot prove WHICH image the
			// deployment accepted, and an arbitrary digest under the expected
			// tag must not pass as the accepted artifact (the runtime
			// identity binding in require_container_gate_identity_for_unit
			// then ties this pinned digest to the actual container and the
			// accepted in-container sources).
			if (!digestForm.test(image)) return "the image token is not the digest-pinned intended application image identity";
			// Reject execution overrides that could shadow the accepted
			// in-container gate script or mapping: every volume/mount/tmpfs
			// destination must be exactly the expected media mount target.
			const mountSpecs = [];
			for (let i = 2; i < n - 3; i++) {
				const t = tokens[i];
				if (t === "-v" || t === "--volume" || t === "--mount" || t === "--tmpfs") { if (i + 1 < n) mountSpecs.push(tokens[i + 1]); }
				else if (t.startsWith("--volume=")) mountSpecs.push(t.slice("--volume=".length));
				else if (t.startsWith("--mount=")) mountSpecs.push(t.slice("--mount=".length));
				else if (t.startsWith("--tmpfs=")) mountSpecs.push(t.slice("--tmpfs=".length));
			}
			const destinationOf = (spec) => {
				if (spec.includes("target=")) {
					for (const kv of spec.split(",")) if (kv.startsWith("target=")) return kv.slice("target=".length);
					return null;
				}
				if (spec.includes(":")) { const parts = spec.split(":"); return parts.length >= 2 ? parts[1] : null; }
				return spec;
			};
			for (const spec of mountSpecs) {
				const dst = destinationOf(spec);
				if (dst === null || dst === "") return "an execution mount option is malformed and cannot be proven harmless";
				if (dst !== mediaMountTarget) return "an execution override mounts " + dst + ", which is not the expected media mount target and could shadow the accepted in-container gate identity";
			}
			const p = shellTokens(tokens[n - 1]);
			if (p.length === 0) return "the startup payload is empty";
			for (const t of p) {
				if (t.quoted && /verify:startup|verify-startup/.test(t.text)) return "an occurrence of the gate names inside a quoted string is inert decoy text, not execution";
			}
			// Complete-prefix control (rework r2 finding 2; corrected and
			// made POSITIVE in rework r3 findings 1+2). The token stream holds
			// {text, quoted} objects: textual checks use .text (the r2 scan
			// applied them to the object and threw, rejecting everything).
			// Beyond the r2 blacklist (function definitions, unquoted command
			// substitution, cd), the prefix is now POSITIVELY constrained to
			// the approved T020 startup shape: the payload is split into
			// command segments at top-level operators (;, &&, ||), and every
			// segment executable — the first unquoted non-assignment token —
			// must belong to the approved command set: the mount/store guards
			// (grep, test, echo, exit, and their { } grouping), the secret
			// reads (read behind leading KEY= assignments), export, the
			// role-prerequisite interpreter (node -e with exactly one quoted
			// program), the gate (npm), and the standalone server (node).
			// exec is approved ONLY as the final exec node
			// dist/server/entry.mjs launch. Anything else — eval, sh, bash,
			// ., source, command, arbitrary binaries, or a quoted string in
			// executable position — is an unrecognized executable prefix and
			// is rejected, so no redirected prefix (quoted or not) can reach
			// the validated gate/server suffix.
			for (let i = 0; i < p.length; i++) {
				const t = p[i].text;
				if (p[i].quoted) continue;
				if (/\(\)$/.test(t) || t === "()") return "a shell function definition in the startup payload shadows the accepted commands and is rejected";
				if (t.includes("`") || t.includes("$(")) return "command substitution in an unquoted startup-payload token can redirect execution and is rejected";
			}
			const APPROVED_EXECUTABLES = new Set(["grep", "echo", "exit", "test", "read", "export", "node", "npm", "{", "}"]);
			const segments = [];
			let segment = [];
			for (let i = 0; i < p.length; i++) {
				const tok = p[i];
				if (!tok.quoted && (tok.text === ";" || tok.text === "&&" || tok.text === "||")) { segments.push(segment); segment = []; continue; }
				segment.push(tok);
			}
			segments.push(segment);
			for (const seg of segments) {
				if (seg.length === 0) continue;
				let k = 0;
				while (k < seg.length && !seg[k].quoted && isAssignment(seg[k].text)) k++;
				if (k >= seg.length) continue;
				if (seg[k].quoted) return "a quoted string in executable position is not an approved startup command";
				const exe = seg[k].text;
				if (exe === "exec") {
					if (!(seg[k + 1] && !seg[k + 1].quoted && seg[k + 1].text === "node" && seg[k + 2] && !seg[k + 2].quoted && seg[k + 2].text === "dist/server/entry.mjs" && k + 3 === seg.length)) return "exec is only approved as the final standalone-server launch";
					continue;
				}
				if (exe === "cd") return "a directory change in the startup payload can redirect gate execution away from the committed mapping working directory and is rejected";
				if (exe === "node" && seg[k + 1] && !seg[k + 1].quoted && seg[k + 1].text === "-e") {
					if (!(seg[k + 2] && seg[k + 2].quoted && k + 3 === seg.length)) return "the node role-prerequisite must be node -e with exactly one quoted program";
					continue;
				}
				if (!APPROVED_EXECUTABLES.has(exe)) return "unrecognized executable prefix: " + exe + " is not part of the approved startup shape";
			}
			const isGate = (i) => !p[i].quoted && p[i].text === "npm" && p[i + 1] && !p[i + 1].quoted && p[i + 1].text === "run" && p[i + 2] && !p[i + 2].quoted && p[i + 2].text === "verify:startup";
			const isServer = (i) => !p[i].quoted && p[i].text === "node" && p[i + 1] && !p[i + 1].quoted && p[i + 1].text === "dist/server/entry.mjs";
			const gatePositions = [];
			const serverPositions = [];
			for (let i = 0; i < p.length; i++) { if (isGate(i)) gatePositions.push(i); if (isServer(i)) serverPositions.push(i); }
			if (gatePositions.length === 0) return "the startup payload does not invoke the committed verify:startup mapping as a command";
			if (gatePositions.length > 1 || serverPositions.length > 1) return "duplicate gate or standalone-server occurrences are command shadowing and are rejected";
			if (serverPositions.length === 0) return "the startup payload does not start the accepted standalone server";
			const gateIdx = gatePositions[0];
			const prev = gateIdx === 0 ? null : p[gateIdx - 1].text;
			if (prev !== null && prev !== ";" && prev !== "&&" && prev !== "||" && prev !== "(") return "the gate invocation is not in command position";
			// The actual success separator is mandatory immediately after the
			// gate: no separator at all (arguments masquerading as a chain)
			// is rejected, and everything up to the server must preserve it.
			if (!p[gateIdx + 3] || p[gateIdx + 3].text !== "&&") return "the gate invocation is not immediately followed by the strict success separator";
			const serverIdx = serverPositions[0];
			if (serverIdx === -1 || serverIdx < gateIdx + 3) return "the standalone server must start only after the gate invocation";
			for (let i = gateIdx + 4; i < serverIdx; i++) {
				const t = p[i].text;
				if (t === "exec") continue;
				if (isAssignment(t)) continue;
				return "the chain between the gate and the standalone server permits startup without successful gate completion (unexpected token)";
			}
			// The accepted startup payload ENDS at the standalone server: any
			// trailing commands (failure bypasses, alternate launches) are
			// rejected — nothing may follow the server entry path token.
			if (serverIdx + 2 !== p.length) return "commands follow the standalone server start (failure bypass or alternate launch) and are rejected";
			// (exceptional round 4, blocker 2) The authority gate: the decoded
			// startup payload must be BYTE-EQUAL to the accepted T020 startup
			// payload (passed via the environment as base64-decoded text).
			// Every structural rule above is an earlier-diagnosis layer; this
			// equality is what proves the approved commands AND arguments -
			// grouped eval bodies, function shadowing (quoted or not),
			// unauthorized assignments, altered role-check programs, and any
			// execution redirection all differ from the accepted payload.
			const approved = String(process.env.APPROVED_STARTUP_PAYLOAD || "");
			if (approved === "") return "the accepted T020 startup payload authority was not supplied to the reasoner; failing closed";
			if (tokens[n - 1] !== approved) return "the startup payload differs from the accepted T020 startup payload (approved commands and arguments are required byte-for-byte)";
			return "";
		};
		let text;
		try {
			text = fs.readFileSync(unitFile, "utf8");
		} catch {
			fail("could not read the effective unit definition");
		}
		const execLines = text.split("\n").filter((line) => /^(ExecStart|ExecStartPre|ExecStartPost|ExecCondition)=/.test(line));
		if (execLines.length === 0) {
			fail("the effective unit definition declares no Exec command line (ExecStart/ExecStartPre/ExecStartPost/ExecCondition) to inspect for the startup-gate wiring");
		}
		const tokenize = (line) => {
			const tokens = [];
			let current = "";
			let has = false;
			let quoted = false;
			for (let i = 0; i < line.length; i++) {
				const ch = line[i];
				if (ch === "\\") {
					if (i + 1 < line.length) {
						// systemd command-line escapes: \xHH hex escapes (as
						// emitted for generated Quadlet ExecStart arguments),
						// \" and \\ and any other escaped character taken
						// literally.
						if (line[i + 1] === "x" && i + 3 < line.length && /^[0-9a-f]{2}$/.test(line.slice(i + 2, i + 4))) {
							current += String.fromCharCode(parseInt(line.slice(i + 2, i + 4), 16));
							i += 3;
						} else { current += line[i + 1]; i++; }
						has = true;
					}
					continue;
				}
				if (ch === "\"") { quoted = !quoted; has = true; continue; }
				if (!quoted && /\s/.test(ch)) {
					if (has) { tokens.push(current); current = ""; has = false; }
					continue;
				}
				current += ch;
				has = true;
			}
			if (has) tokens.push(current);
			return tokens;
		};
		let sawPackageRun = false;
		let containerWired = false;
		const containerAttempts = [];
		for (const line of execLines) {
			const tokens = tokenize(line.slice(line.indexOf("=") + 1));
			if (invokesDirectly(tokens, null)) { process.stdout.write("accept direct\n"); process.exit(0); }
			if (trustedNpmToken(tokens[0]) && tokens[1] === "run" && tokens[2] === "verify:startup") sawPackageRun = true;
			if (trustedPodman && tokens[0] === trustedPodman && tokens[1] === "run") {
				const reason = acceptsContainerInvocation(tokens);
				if (reason === "") { sawPackageRun = true; containerWired = true; }
				else containerAttempts.push(reason);
			}
		}
		if (sawPackageRun) {
			let pkg;
			try {
				pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
			} catch {
				fail("the unit runs the trusted npm with `run verify:startup`, but the committed package.json could not be read to validate the mapping");
			}
			const command = pkg && pkg.scripts && typeof pkg.scripts["verify:startup"] === "string" ? pkg.scripts["verify:startup"] : undefined;
			if (command === undefined) {
				fail("the unit runs the trusted npm with `run verify:startup`, but the committed package.json has no verify:startup script mapping");
			}
			if (!invokesDirectly(tokenize(command), path.dirname(pkgFile))) {
				fail("the unit runs the trusted npm with `run verify:startup`, but the committed package.json mapping does not resolve to the accepted T013 authority " + ACCEPTED);
			}
			process.stdout.write(containerWired ? "accept container\n" : "accept mapped\n");
			process.exit(0);
		}
		let detail = "";
		if (containerAttempts.length > 0) detail = "; container-invocation rejection: " + containerAttempts[0];
		fail("no Exec command line provably invokes the accepted T013 authority by executable identity (an absolute path resolving to the repository checkout file " + ACCEPTED + ", the trusted npm runner resolved from this verification environment running the committed verify:startup mapping, or the approved in-container invocation: the trusted podman runner, the intended application image and container, and one sh -c payload running the validated verify:startup mapping with the standalone server strictly success-chained after it); bare basenames, pathname suffixes, unresolvable or untrusted executables, floating image tags, failure-ignoring chains, and occurrences inside arguments, shell payloads, or comments are not identity proof" + detail);
	' "$unit_file" "$ROOT/package.json" "$ROOT" "$APP_IMAGE" "$APP_CONTAINER" "$MEDIA_MOUNT_TARGET" 2>/dev/null || true)"
	case $verdict in
	'accept direct' | 'accept mapped' | 'accept container')
		WIRING_FORM="${verdict#accept }"
		if [ -n "$out_form" ]; then
			printf -v "$out_form" '%s' "${verdict#accept }"
			printf -v "$out_reason" '%s' ''
		else
			printf ''
		fi
		return 0
		;;
	reject\ ?*)
		if [ -n "$out_reason" ]; then
			printf -v "$out_reason" '%s' "${verdict#reject }"
			if [ -n "$out_form" ]; then printf -v "$out_form" '%s' ''; fi
		else
			printf '%s' "${verdict#reject }"
		fi
		return 0
		;;
	*)
		if [ -n "$out_reason" ]; then
			printf -v "$out_reason" '%s' 'the gate-wiring validation could not evaluate the effective unit definition (unexpected validator outcome); failing closed'
			if [ -n "$out_form" ]; then printf -v "$out_form" '%s' ''; fi
		else
			printf 'the gate-wiring validation could not evaluate the effective unit definition (unexpected validator outcome); failing closed'
		fi
		return 0
		;;
	esac
}

require_container_gate_identity_for_unit() {
	# require_container_gate_identity_for_unit <label> <effective-unit-file>:
	# the runtime half of the CONTAINER wiring form (rework r1, finding 1):
	# binds the accepted in-container gate invocation to the intended ACTUAL
	# container and the accepted immutable image and sources. The structural
	# reasoner proved the unit's shape; this proves, secret-free, that (a)
	# the unit's digest-pinned image token equals the deployed container's
	# actual image identity (an arbitrary digest under the expected tag, or
	# a different image, fails closed), and (b) the container's in-container
	# T013 gate script and package mapping are byte-identical (SHA-256) to
	# the accepted repository sources this harness anchors on — so no
	# overmounted or replaced /app/tests or /app/package.json can satisfy
	# the wiring. Digests and identities only; no secret values.
	local label="$1" unit_file="$2"
	local pinned='' actual='' cont_sums='' host_sums='' line='' f='' c='' h=''
	pinned="$(grep -oE "${APP_IMAGE}@sha256:[0-9a-f]{64}" "$unit_file" | head -1 || true)"
	if [ -z "$pinned" ]; then
		fail_stage "$label" 'the container-form wiring carries no digest-pinned application image token to bind to the actual container'
	fi
	if ! actual="$(timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" \
		podman container inspect "$APP_CONTAINER" --format '{{.ImageName}}' 2>/dev/null)" || [ -z "$actual" ]; then
		fail_stage "$label" 'could not inspect the actual image identity of container %s for the container-form identity binding' \
			"$APP_CONTAINER"
	fi
	if [ "$actual" != "$pinned" ]; then
		fail_stage "$label" 'the deployed container image identity %s does not equal the effective unit pinned identity %s — the wiring is not bound to the accepted image' \
			"$actual" "$pinned"
	fi
	if ! cont_sums="$(timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" \
		podman exec "$APP_CONTAINER" sha256sum /app/tests/operations/verify-startup.sh /app/package.json 2>/dev/null)"; then
		fail_stage "$label" 'could not read the in-container gate script and package mapping digests from %s' \
			"$APP_CONTAINER"
	fi
	c="$(printf '%s\n' "$cont_sums" | awk 'NR==1 { print $1 }')"
	h="$(printf '%s\n' "$cont_sums" | awk 'NR==2 { print $1 }')"
	local host_script='' host_pkg=''
	host_script="$(sha256sum "$ROOT/tests/operations/verify-startup.sh" | awk '{print $1}')"
	host_pkg="$(sha256sum "$ROOT/package.json" | awk '{print $1}')"
	if [ -z "$c" ] || [ -z "$h" ] || [ "$c" != "$host_script" ] || [ "$h" != "$host_pkg" ]; then
		fail_stage "$label" 'the in-container T013 gate script or package.json mapping differs from the accepted repository sources — the container gate identity is not proven'
	fi
	info "$label" 'container-form identity bound: deployed image %s; in-container gate script and package mapping byte-identical to the accepted sources' \
		"$pinned"
	pass "$label" 'container-form wiring bound to the intended container, accepted immutable image, and accepted in-container gate sources'
}

require_gate_wiring_for_unit() {
	# require_gate_wiring_for_unit <label>: the LIVE wiring half of the C1
	# execution proof. Captures the effective, currently-loaded definition of
	# the application unit exactly as the manager executes it
	# (`systemctl --user cat`), proves it secret-free, and requires the
	# gate_wiring_reason acceptance above. Combined with the invocation-
	# scoped ordered completion evidence in
	# require_gate_evidence_for_current_start, a fabricated marker-only
	# journal on a unit not wired to T013 is rejected here, and a wired unit
	# whose gate did not complete is rejected there.
	local label="$1"
	local unit_file="$TMP_DIR/unit-$label.txt" reason=''
	if ! timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" \
		systemctl --user cat "$APP_UNIT" >"$unit_file" 2>"$unit_file.err"; then
		print_tail 'systemctl cat diagnostics' "$unit_file.err"
		fail_stage "$label" 'reading the effective unit definition of %s failed' "$APP_UNIT"
	fi
	if ! file_free_of_secrets "$unit_file"; then
		fail_stage "$label" 'the captured effective unit definition contains a configured secret value; refusing to continue'
	fi
	local wiring_form=''
	gate_wiring_reason "$unit_file" reason wiring_form
	if [ -n "$reason" ]; then
		fail_stage "$label" '%s' "$reason"
	fi
	info "$label" 'the effective unit definition of %s provably invokes the accepted T013 authority as a command token (%s direct / npm or in-container verify:startup mapping validated as the accepted command; form: %s)' \
		"$APP_UNIT" "$T013_SCRIPT" "$wiring_form"
	pass "$label" 'T013 startup-gate wiring proven on the effective application unit definition'
	# For the container form, bind the structural shape proof to the actual
	# container, the accepted immutable image digest, and the accepted
	# in-container gate sources (rework r1 finding 1; dispatch made
	# effective in rework r2 finding 1 - the form is now obtained without
	# command substitution).
	if [ "$wiring_form" = 'container' ]; then
		require_container_gate_identity_for_unit "$label" "$unit_file"
	fi
}

current_invocation_id() {
	# current_invocation_id <unit>: the unit's CURRENT systemd invocation id
	# (empty when the unit has no current invocation).
	systemctl --user show "$1" -p InvocationID --value 2>/dev/null || true
}

collect_invocation_journal() {
	# collect_invocation_journal <invocation-id> <out-file>: bounded journal
	# slice for EXACTLY the given invocation of the application unit. Scoped
	# by _SYSTEMD_INVOCATION_ID rather than any wall-clock window: the slice
	# inherently covers that invocation's ExecStartPre/ExecStartPost work (a
	# pre-start gate is never excluded, as an ExecMainStartTimestamp-based
	# window would exclude it) and it can never admit an earlier invocation's
	# evidence during rapid restarts.
	local inv="$1" out="$2"
	if ! timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" \
		journalctl --user -u "$APP_UNIT" "_SYSTEMD_INVOCATION_ID=$inv" -n "$JOURNAL_MAX_LINES" --no-pager \
		>"$out" 2>"$out.err"; then
		return 1
	fi
	return 0
}

gate_markers_present() {
	# gate_markers_present <journal-file>: every derived T013 stage marker
	# AND the final banner must appear in the file, each first occurrence on
	# a strictly later line than the previous one (ascending stage order —
	# the order in which the accepted script actually emits them). Marker
	# text alone is not execution proof; this predicate is always combined
	# with the live wiring proof in require_gate_wiring_for_unit.
	local file="$1" marker prev=0 ln=''
	for marker in "${GATE_STAGE_MARKERS[@]}" "$GATE_BANNER"; do
		ln="$(grep -nF -m1 -- "$marker" "$file" | cut -d: -f1 || true)"
		if [ -z "$ln" ]; then
			return 1
		fi
		if [ "$ln" -le "$prev" ]; then
			return 1
		fi
		prev="$ln"
	done
	return 0
}

require_gate_evidence_for_current_start() {
	# require_gate_evidence_for_current_start <label>: the COMPLETION half of
	# the C1 execution proof — the full derived T013 evidence sequence
	# (every stage marker plus the final PASS banner, in ascending stage
	# order) must be present in the journal of the application unit's
	# CURRENT systemd invocation, proving the wired gate ran to completion
	# during this start (including any pre-start wiring) before the
	# application is treated as ready. Blocking readiness on gate failure is
	# the deployment's own contract (T020); this stage re-proves completion
	# on every start, including after every lifecycle operation below.
	# Always preceded by require_gate_wiring_for_unit so marker text alone
	# can never be accepted.
	local label="$1"
	local inv='' journal_file
	inv="$(current_invocation_id "$APP_UNIT")"
	if [ -z "$inv" ]; then
		fail_stage "$label" 'unit %s reports no current invocation; cannot scope the journal window for the T013 gate evidence' "$APP_UNIT"
	fi
	journal_file="$TMP_DIR/journal-$label.txt"
	if ! collect_invocation_journal "$inv" "$journal_file"; then
		print_tail 'journalctl diagnostics' "$journal_file.err"
		fail_stage "$label" 'reading the journal of unit %s (invocation %s) failed' "$APP_UNIT" "$inv"
	fi
	if ! gate_markers_present "$journal_file"; then
		fail_stage "$label" 'the full ordered T013 startup-acceptance evidence sequence is absent from the journal of the CURRENT invocation of %s (invocation %s); required markers, in ascending stage order: [%s] plus [%s] — the deployment must run the wired T013 gate (status -> inspected-target fingerprint-guarded apply -> check + bounded media probe) to completion during every start before the application is accepted ready' \
			"$APP_UNIT" "$inv" "${GATE_STAGE_MARKERS[*]}" "$GATE_BANNER"
	fi
	if ! file_free_of_secrets "$journal_file"; then
		fail_stage "$label" 'the captured unit journal contains a configured secret value; refusing to continue'
	fi
	info "$label" 'full T013 stage sequence + PASS banner present in the journal of the current invocation of %s (markers derived from %s)' \
		"$APP_UNIT" "$T013_SCRIPT"
	pass "$label" 'T013 startup-acceptance gate execution evidenced for the current application invocation'
}

media_walk_js() {
	# media_walk_js: prints the shared node program that walks a directory
	# tree and emits, sorted, one line per entry: the media ROOT's own
	# metadata (`d / <mtime>`), every subdirectory's metadata
	# (`d <path> <mtime>`), and every file's size, mtime, and CONTENT SHA-256
	# (`f <path> <size> <mtime> <sha256>`). Non-directory/non-file entries are
	# recorded by kind and mode. Hashing this listing detects create/delete
	# (directory mtimes change, including the root's), in-place byte changes
	# (content digests), and metadata-only touches — the exact classes of
	# prohibited persistent media writes (including a write/read/remove
	# probe) that a path/size/mtime-only hash of files would miss. One
	# program is shared by the in-container snapshot and the --self-test
	# demonstration so they cannot drift apart.
	cat <<'WALKJS'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = process.argv[1];
const lines = [];
const rootStat = fs.lstatSync(root);
lines.push("d / " + Math.floor(rootStat.mtimeMs));
const walk = (dir, prefix) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
		const full = path.join(dir, entry.name);
		const rel = prefix + "/" + entry.name;
		const st = fs.lstatSync(full);
		if (st.isDirectory()) {
			lines.push("d " + rel + " " + Math.floor(st.mtimeMs));
			walk(full, rel);
		} else if (st.isFile()) {
			const content = fs.readFileSync(full);
			lines.push("f " + rel + " " + st.size + " " + Math.floor(st.mtimeMs) + " " + crypto.createHash("sha256").update(content).digest("hex"));
		} else {
			lines.push("o " + rel + " " + st.mode);
		}
	}
};
walk(root, "");
process.stdout.write(lines.join("\n") + "\n");
WALKJS
}

media_tree_snapshot() {
	# media_tree_snapshot: prints a sha256 over the shared walk listing
	# (root/subdirectory metadata + per-file content digests) of the
	# in-container stable media mount, taken through the application
	# container's own node runtime (no shell requirement). Prints
	# 'unavailable' when the listing cannot be taken. Used only to prove
	# NON-MUTATION across a recurring readiness probe.
	local listing='' rc=0
	listing="$(timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" podman exec "$APP_CONTAINER" \
		node -e "$(media_walk_js)" "$MEDIA_MOUNT_TARGET" 2>/dev/null)" || rc=$?
	if [ "$rc" -ne 0 ]; then
		printf 'unavailable\n'
		return
	fi
	printf '%s' "$listing" | sha256sum | awk '{print $1}'
}

probe_readiness() {
	# probe_readiness: runs the deployment's recurring readiness helper
	# INSIDE the application container (private boundary; the container's own
	# configured environment is consumed there, never copied out). Sets
	# READINESS_STATE (ready | not-ready | unreachable | leaked |
	# indeterminate) and READINESS_LINE (one scrubbed, secret-free line).
	local out_file="$TMP_DIR/readiness.out" rc=0
	if ! container_running "$APP_CONTAINER"; then
		READINESS_STATE='unreachable'
		READINESS_LINE='application container not running (platform stopped or failed)'
		return
	fi
	# shellcheck disable=SC2086 # READINESS_COMMAND is a documented command
	# string (default: node scripts/verify-readiness.mjs); word splitting is
	# intentional and it is never attacker-controlled data.
	timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" podman exec "$APP_CONTAINER" \
		$READINESS_COMMAND >"$out_file" 2>&1 || rc=$?
	if ! file_free_of_secrets "$out_file"; then
		# The output is never printed in this case: it contains a configured
		# secret value, which the private recurring readiness contract
		# forbids.
		READINESS_STATE='leaked'
		READINESS_LINE='readiness output contained a configured secret value (value never printed)'
		return
	fi
	if grep -Fq 'readiness: not-ready' "$out_file"; then
		READINESS_STATE='not-ready'
	elif grep -Fq 'readiness: ready' "$out_file" && [ "$rc" -eq 0 ]; then
		READINESS_STATE='ready'
	elif grep -Fq 'readiness: ready' "$out_file"; then
		READINESS_STATE='not-ready'
	else
		READINESS_STATE='indeterminate'
	fi
	READINESS_LINE="$(grep -F 'readiness:' "$out_file" | tail -1 | scrub || true)"
	if [ -z "$READINESS_LINE" ]; then
		READINESS_LINE='readiness result line unavailable (helper produced no recognizable state line)'
	fi
}

capture_tagline_digest() {
	# capture_tagline_digest: prints the SHA-256 over the exact UTF-8 bytes
	# of the CURRENTLY retrieved native tagline value, or fails closed. Used
	# to capture the digest on BOTH sides of a recurring readiness probe so
	# the non-mutation claim compares the two captures directly, rather than
	# only checking the canonical value afterwards.
	timeout --kill-after=15 "${HTTP_TIMEOUT_SECONDS}s" node -e '
		(async () => {
			const crypto = require("crypto");
			const origin = process.env.SONGHEALTH_APP_ORIGIN;
			const token = process.env.SONGHEALTH_VALIDATION_TOKEN;
			const fail = (message) => { console.error(message); process.exit(1); };
			let response;
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 25000);
				response = await fetch(origin + "/_emdash/api/settings", {
					headers: { authorization: "Bearer " + token },
					signal: controller.signal,
				});
				clearTimeout(timer);
			} catch {
				fail("settings request failed (network/timeout)");
			}
			if (response.status !== 200) fail("settings endpoint returned http status " + response.status);
			let payload;
			try {
				payload = await response.json();
			} catch {
				fail("settings response is not the expected JSON shape");
			}
			const tagline = payload && payload.data && typeof payload.data.tagline === "string" ? payload.data.tagline : null;
			if (tagline === null) fail("settings response carries no tagline value");
			process.stdout.write(crypto.createHash("sha256").update(Buffer.from(tagline, "utf8")).digest("hex") + "\n");
		})();
	'
}

check_recurring_readiness_private() {
	# C1b: the recurring readiness probe must be private (executed only
	# through the container boundary — no public endpoint is consulted or
	# required) and non-mutating. Non-mutation is proven on BOTH anchors with
	# before/after captures: the media snapshot (root/subdirectory metadata
	# plus per-file content digests, so a create/read/remove probe or an
	# in-place byte change is detected) and the tagline digest (captured on
	# both sides of the probe, not merely asserted against the canonical
	# value afterwards).
	local tree_before='' tree_after='' tag_before='' tag_after=''
	tree_before="$(media_tree_snapshot)"
	tag_before="$(capture_tagline_digest)" ||
		fail_stage C1 'could not capture the tagline digest before the recurring readiness probe'
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C1 'recurring readiness reported %s (%s); expected ready on the healthy baseline before lifecycle testing' \
			"$READINESS_STATE" "$READINESS_LINE"
	fi
	tree_after="$(media_tree_snapshot)"
	tag_after="$(capture_tagline_digest)" ||
		fail_stage C1 'could not capture the tagline digest after the recurring readiness probe'
	if [ "$tree_before" = 'unavailable' ] || [ "$tree_after" = 'unavailable' ] || [ "$tree_before" != "$tree_after" ]; then
		fail_stage C1 'the recurring readiness probe mutated the expected media mount (snapshot digest changed across the probe; the snapshot covers root/subdirectory metadata and per-file content digests, so any persistent media write — including a bounded write/read/remove probe — is a violation of FR-011 recurring-readiness non-mutation)'
	fi
	if [ "$tag_before" != "$tag_after" ]; then
		fail_stage C1 'the tagline digest changed across the recurring readiness probe; recurring readiness MUST be non-mutating'
	fi
	info C1 'readiness (private, through the container boundary): %s' "$READINESS_LINE"
	check_tagline C1
	pass C1 'recurring readiness is private (container boundary only) and non-mutating (media snapshot with content digests and directory metadata, and tagline digest, all captured on both sides of the probe and unchanged)'
}

# ---------------------------------------------------------------------------
# C2 — approved private application network and app-to-database access
# ---------------------------------------------------------------------------

check_private_network() {
	local app_nets='' db_nets=''
	app_nets="$(podman container inspect "$APP_CONTAINER" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' 2>/dev/null || true)"
	db_nets="$(podman container inspect "$DB_CONTAINER" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' 2>/dev/null || true)"
	case " $app_nets" in
	*" $NETWORK_NAME "*) ;;
	*)
		fail_stage C2 'application container %s is not attached to the approved private network %s (attached: %s)' \
			"$APP_CONTAINER" "$NETWORK_NAME" "${app_nets:-none}"
		;;
	esac
	case " $db_nets" in
	*" $NETWORK_NAME "*) ;;
	*)
		fail_stage C2 'database container %s is not attached to the approved private network %s (attached: %s)' \
			"$DB_CONTAINER" "$NETWORK_NAME" "${db_nets:-none}"
		;;
	esac
	pass C2 'both runtime containers are attached to the approved private application network %s' "$NETWORK_NAME"

	# Required application-to-database access succeeds, proven through the
	# application container's own private path: the TCP check executes inside
	# the container and reads the container's own configured PGHOST/PGPORT
	# environment (values never leave the container; only the outcome does).
	local out_file="$TMP_DIR/app-to-db.out"
	if ! timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" podman exec "$APP_CONTAINER" \
		node -e '
			const net = require("net");
			const host = process.env.PGHOST;
			const port = Number(process.env.PGPORT || 5432);
			if (!host) { console.error("PGHOST is not configured in the application container environment"); process.exit(4); }
			const socket = net.connect({ host, port });
			const fail = (message) => { socket.destroy(); console.error(message); process.exit(1); };
			socket.setTimeout(10000, () => fail("application-to-database TCP check timed out"));
			socket.on("error", (error) => fail("application-to-database TCP check failed: " + String(error.code || "error")));
			socket.on("connect", () => { socket.destroy(); process.stdout.write("connected\n"); process.exit(0); });
		' >"$out_file" 2>&1; then
		print_tail 'application-to-database probe diagnostics' "$out_file"
		fail_stage C2 'the required application-to-database access over the private network failed (probe ran inside the application container using its own configured database target; no credentials were involved)'
	fi
	info C2 'application-to-database access verified through the private network path from inside the application container'
	info C2 'the defined unintended host/public PostgreSQL paths (any published host-port mapping, and the host to the database container private address) are probed and must be rejected in the next stage (C3)'
	pass C2 'required private application-to-database access succeeds on network %s' "$NETWORK_NAME"
}

# ---------------------------------------------------------------------------
# C3 — PostgreSQL publishes no host port (metadata AND host boundary)
# ---------------------------------------------------------------------------

check_no_published_db_port() {
	# Metadata: no host port bindings configured for the database container.
	local bindings=''
	bindings="$(podman container inspect "$DB_CONTAINER" --format '{{.HostConfig.PortBindings}}' 2>/dev/null || true)"
	if [ -n "$bindings" ] && [ "$bindings" != 'map[]' ]; then
		fail_stage C3 'database container %s declares host port bindings in its runtime configuration (PortBindings=%s); the production contract publishes no PostgreSQL host port' \
			"$DB_CONTAINER" "$bindings"
	fi

	# Host boundary: the runtime port-mapping registry must list nothing for
	# the database container.
	local port_map=''
	port_map="$(podman port "$DB_CONTAINER" 2>/dev/null || true)"
	if [ -n "$port_map" ]; then
		fail_stage C3 'the host port-mapping registry lists published port(s) for database container %s; the production contract publishes no PostgreSQL host port' \
			"$DB_CONTAINER"
	fi

	# Host boundary, actual probe: a bounded TCP connect FROM the verification
	# host to the database container's private address on every port the
	# image declares must be refused. This is deliberately NOT inferred from
	# the successful private connection in C2: the private path succeeds
	# inside the network while this host path must fail.
	local db_ip='' exposed='' port
	db_ip="$(podman container inspect "$DB_CONTAINER" \
		--format "{{range \$name, \$net := .NetworkSettings.Networks}}{{if eq \$name \"$NETWORK_NAME\"}}{{\$net.IPAddress}}{{end}}{{end}}" 2>/dev/null || true)"
	if [ -z "$db_ip" ]; then
		fail_stage C3 'could not resolve the private address of database container %s on network %s' \
			"$DB_CONTAINER" "$NETWORK_NAME"
	fi
	exposed="$(podman container inspect "$DB_CONTAINER" --format '{{.Config.ExposedPorts}}' 2>/dev/null || true)"
	local ports=() token
	for token in $(printf '%s' "$exposed" | tr -d 'map[]{}' | tr ' ' '\n' | cut -d/ -f1); do
		case $token in
		'' | *[!0-9]*) ;;
		*) ports+=("$token") ;;
		esac
	done
	if [ "${#ports[@]}" -eq 0 ]; then
		# The official PostgreSQL image always declares its listening port;
		# fall back to the standard port if the declaration is unreadable.
		ports=(5432)
	fi
	for port in "${ports[@]}"; do
		local probe_file="$TMP_DIR/host-refused-$port.out" rc=0
		timeout --kill-after=5 "$((CONNECT_TIMEOUT_SECONDS + 5))s" \
			node -e '
				const net = require("net");
				const socket = net.connect({ host: process.argv[1], port: Number(process.argv[2]) });
				socket.setTimeout(Number(process.argv[3]) * 1000, () => { socket.destroy(); process.stdout.write("refused(timeout)\n"); process.exit(0); });
				socket.on("error", (error) => { socket.destroy(); process.stdout.write("refused(" + String(error.code || "error") + ")\n"); process.exit(0); });
				socket.on("connect", () => { socket.destroy(); process.stdout.write("CONNECTED\n"); process.exit(3); });
			' "$db_ip" "$port" "$CONNECT_TIMEOUT_SECONDS" >"$probe_file" 2>&1 || rc=$?
		if [ "$rc" -eq 3 ] || grep -Fq 'CONNECTED' "$probe_file"; then
			fail_stage C3 'the verification host CONNECTED to the database container private address %s:%s — PostgreSQL is reachable from an unintended host/public path' \
				"$db_ip" "$port"
		fi
		if [ "$rc" -ne 0 ]; then
			print_tail 'host-boundary probe diagnostics' "$probe_file"
			fail_stage C3 'the host-boundary rejection probe against %s:%s did not complete within its bounded time' "$db_ip" "$port"
		fi
		info C3 'host-boundary probe %s:%s -> %s' "$db_ip" "$port" "$(cat "$probe_file")"
	done

	pass C3 'PostgreSQL publishes no host port (empty PortBindings, empty runtime port registry, and every host-boundary TCP connect to the private database address refused)'
}

# ---------------------------------------------------------------------------
# C4 — expected persistent volume attachments at the approved targets
# ---------------------------------------------------------------------------

check_live_mountpoint() {
	# check_live_mountpoint <container> <target> <kind>: the target must be a
	# live mount point inside the container. The application container is
	# probed with its own node runtime (no shell requirement); the database
	# container (a PostgreSQL image without node) is probed with cat, which
	# the official image provides. Both read only /proc/mounts.
	local container="$1" target="$2" kind="$3" rc=0
	if [ "$kind" = 'node' ]; then
		timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" podman exec "$container" \
			node -e '
				const fs = require("fs");
				const target = process.argv[1];
				const mounted = fs.readFileSync("/proc/mounts", "utf8").split("\n").some((line) => line.split(" ")[1] === target);
				process.exit(mounted ? 0 : 1);
			' "$target" >/dev/null 2>&1 || rc=$?
	else
		podman exec "$container" cat /proc/mounts 2>/dev/null |
			awk -v t="$target" '$2 == t { found = 1 } END { exit found ? 0 : 1 }' || rc=$?
	fi
	if [ "$rc" -ne 0 ]; then
		fail_stage C4 '%s is not a live mount point inside container %s' "$target" "$container"
	fi
}

check_volume_attachments() {
	# Each expected named volume must be mounted, as a named volume (never an
	# ephemeral bind or image-layer path), at its approved target in the
	# owning container. Named-volume mounts live outside the container's
	# ephemeral writable layer by construction; the C7 negative test below
	# additionally proves the attachment (not a baked directory) is what
	# carries the persistent state.
	local db_mounts='' app_mounts=''
	db_mounts="$(podman container inspect "$DB_CONTAINER" --format '{{range .Mounts}}{{.Type}}:{{.Name}}:{{.Destination}} {{end}}' 2>/dev/null || true)"
	app_mounts="$(podman container inspect "$APP_CONTAINER" --format '{{range .Mounts}}{{.Type}}:{{.Name}}:{{.Destination}} {{end}}' 2>/dev/null || true)"
	case " $db_mounts" in
	*" volume:$DB_VOLUME:$DB_MOUNT_TARGET "*)
		info C4 'database data: named volume %s mounted at %s in %s' "$DB_VOLUME" "$DB_MOUNT_TARGET" "$DB_CONTAINER"
		;;
	*)
		fail_stage C4 'database container %s does not mount named volume %s at the approved target %s (mounts: %s)' \
			"$DB_CONTAINER" "$DB_VOLUME" "$DB_MOUNT_TARGET" "${db_mounts:-none}"
		;;
	esac
	case " $app_mounts" in
	*" volume:$MEDIA_VOLUME:$MEDIA_MOUNT_TARGET "*)
		info C4 'media: named volume %s mounted at %s in %s' "$MEDIA_VOLUME" "$MEDIA_MOUNT_TARGET" "$APP_CONTAINER"
		;;
	*)
		fail_stage C4 'application container %s does not mount named volume %s at the approved target %s (mounts: %s)' \
			"$APP_CONTAINER" "$MEDIA_VOLUME" "$MEDIA_MOUNT_TARGET" "${app_mounts:-none}"
		;;
	esac

	check_live_mountpoint "$DB_CONTAINER" "$DB_MOUNT_TARGET" 'cat'
	check_live_mountpoint "$APP_CONTAINER" "$MEDIA_MOUNT_TARGET" 'node'

	pass C4 'both expected persistent volumes are attached as named volumes at their approved targets, outside the ephemeral container layers'
}

# ---------------------------------------------------------------------------
# C5/C6/C7/C8 integrity checkpoints — canonical tagline and validation media
# ---------------------------------------------------------------------------

check_tagline() {
	# check_tagline <stage-label>: retrieve the canonical native EmDash Site
	# Setting `tagline` through its intended native platform boundary (the
	# native settings REST surface, exactly the boundary T015 canonized),
	# reached over the deployment's proxy-facing loopback publication with a
	# scoped validation token that is read in-process and never printed.
	# Compare the EXACT value first, then hash the exact UTF-8 bytes and
	# compare the canonical SHA-256. The comparison happens entirely inside
	# the node process so no retrieved content is ever shell-evaluated.
	local label="$1"
	local out_file="$TMP_DIR/tagline-$label.out" err_file="$TMP_DIR/tagline-$label.err" rc=0
	timeout --kill-after=15 "${HTTP_TIMEOUT_SECONDS}s" node -e '
		(async () => {
			const crypto = require("crypto");
			const expectedValue = process.argv[1];
			const expectedSha256 = process.argv[2];
			const origin = process.env.SONGHEALTH_APP_ORIGIN;
			const token = process.env.SONGHEALTH_VALIDATION_TOKEN;
			const fail = (message) => { console.error(message); process.exit(1); };
			let response;
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 25000);
				response = await fetch(origin + "/_emdash/api/settings", {
					headers: { authorization: "Bearer " + token },
					signal: controller.signal,
				});
				clearTimeout(timer);
			} catch {
				fail("settings request failed (network/timeout)");
			}
			if (response.status !== 200) {
				fail("settings endpoint returned http status " + response.status + " (validation token rejected or platform unavailable; token never printed)");
			}
			let payload;
			try {
				payload = await response.json();
			} catch {
				fail("settings response is not the expected JSON shape");
			}
			const tagline = payload && payload.data && typeof payload.data.tagline === "string" ? payload.data.tagline : null;
			if (tagline === null) fail("settings response carries no tagline value");
			if (tagline !== expectedValue) {
				const shown = tagline.slice(0, 120).replace(/\s+/g, " ");
				fail("tagline VALUE mismatch: the retrieved value differs from the canonical validation value (retrieved, first 120 bytes, whitespace flattened: " + JSON.stringify(shown) + ")");
			}
			const bytes = Buffer.from(tagline, "utf8");
			const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
			if (sha256 !== expectedSha256) {
				fail("tagline DIGEST mismatch: sha256 " + sha256 + " of the exact UTF-8 bytes does not equal the canonical " + expectedSha256);
			}
			process.stdout.write("value-exact bytes=" + bytes.length + " sha256=" + sha256 + "\n");
		})();
	' "$TAGLINE_EXPECTED" "$TAGLINE_EXPECTED_SHA256" >"$out_file" 2>"$err_file" || rc=$?
	if [ "$rc" -ne 0 ] || [ ! -s "$out_file" ]; then
		print_tail "tagline retrieval diagnostics ($label)" "$err_file"
		fail_stage "$label" 'canonical tagline verification failed at checkpoint %s (see the bounded diagnostics above)' "$label"
	fi
	pass "$label" 'tagline integrity: exact canonical value matched first, then exact UTF-8 bytes hashed and matched the canonical SHA-256 %s at checkpoint %s' \
		"$TAGLINE_EXPECTED_SHA256" "$label"
}

check_media() {
	# check_media <stage-label>: retrieve the designated validation media
	# through its intended native public media file boundary over the
	# deployment's proxy-facing loopback publication and compare the exact
	# bytes with the canonical media SHA-256.
	local label="$1"
	local out_file="$TMP_DIR/media-$label.out" err_file="$TMP_DIR/media-$label.err" rc=0
	timeout --kill-after=15 "${HTTP_TIMEOUT_SECONDS}s" node -e '
		(async () => {
			const crypto = require("crypto");
			const expectedSha256 = process.argv[1];
			const origin = process.env.SONGHEALTH_APP_ORIGIN;
			const mediaPath = process.env.SONGHEALTH_VALIDATION_MEDIA_PATH;
			const fail = (message) => { console.error(message); process.exit(1); };
			let response;
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 25000);
				response = await fetch(origin + mediaPath, { signal: controller.signal });
				clearTimeout(timer);
			} catch {
				fail("media request failed (network/timeout)");
			}
			if (response.status !== 200) {
				fail("media boundary returned http status " + response.status + " for the designated validation media path");
			}
			const bytes = Buffer.from(await response.arrayBuffer());
			const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
			if (sha256 !== expectedSha256) {
				fail("media DIGEST mismatch: sha256 " + sha256 + " over " + bytes.length + " retrieved bytes does not equal the canonical " + expectedSha256);
			}
			process.stdout.write("bytes=" + bytes.length + " sha256=" + sha256 + "\n");
		})();
	' "$MEDIA_EXPECTED_SHA256" >"$out_file" 2>"$err_file" || rc=$?
	if [ "$rc" -ne 0 ] || [ ! -s "$out_file" ]; then
		print_tail "media retrieval diagnostics ($label)" "$err_file"
		fail_stage "$label" 'canonical validation-media verification failed at checkpoint %s (see the bounded diagnostics above)' "$label"
	fi
	pass "$label" 'media integrity: retrieved bytes match the canonical SHA-256 %s at checkpoint %s (%s)' \
		"$MEDIA_EXPECTED_SHA256" "$label" "$(cat "$out_file")"
}

integrity_checkpoint() {
	# integrity_checkpoint <stage-label>: both canonical integrity anchors
	# after every lifecycle checkpoint.
	local label="$1"
	check_tagline "$label"
	check_media "$label"
}

# ---------------------------------------------------------------------------
# C6 — exactly three lifecycle cycles (start, stop, restart, recreate)
# ---------------------------------------------------------------------------

wait_unit_active() {
	# wait_unit_active <stage> <unit> <purpose>: bounded poll for active.
	local stage="$1" unit="$2" purpose="$3" waited=0
	while ! systemctl --user is-active --quiet "$unit" 2>/dev/null; do
		if [ "$waited" -ge "$UNIT_WAIT_SECONDS" ]; then
			fail_stage "$stage" 'unit %s did not become active within the bounded %ss wait (%s)' \
				"$unit" "$UNIT_WAIT_SECONDS" "$purpose"
		fi
		sleep "$POLL_SECONDS"
		waited=$((waited + POLL_SECONDS))
	done
}

wait_unit_not_active() {
	# wait_unit_not_active <stage> <unit> <purpose>: bounded poll for any
	# non-active terminal state (failed/inactive), including absent.
	local stage="$1" unit="$2" purpose="$3" waited=0 state=''
	while :; do
		state="$(systemctl --user is-active "$unit" 2>/dev/null || true)"
		case $state in
		active | activating | deactivating | reloading | re-executing) ;;
		*) return 0 ;;
		esac
		if [ "$waited" -ge "$UNIT_WAIT_SECONDS" ]; then
			fail_stage "$stage" 'unit %s did not leave the active/activating states within the bounded %ss wait (%s)' \
				"$unit" "$UNIT_WAIT_SECONDS" "$purpose"
		fi
		sleep "$POLL_SECONDS"
		waited=$((waited + POLL_SECONDS))
	done
}

wait_app_ready_with_gate() {
	# wait_app_ready_with_gate <stage> <purpose>: bounded wait until the
	# application unit is active AND the reused T013 gate has evidenced
	# completion for the unit's CURRENT invocation (the full derived stage
	# sequence plus banner in ascending stage order, scoped by
	# _SYSTEMD_INVOCATION_ID so pre-start gate output is included and
	# earlier invocations can never satisfy the check). The invocation id is
	# re-read every poll because it changes on every restart.
	local stage="$1" purpose="$2" waited=0 inv='' journal_file
	journal_file="$TMP_DIR/journal-gate-poll.txt"
	while :; do
		if systemctl --user is-active --quiet "$APP_UNIT" 2>/dev/null; then
			inv="$(current_invocation_id "$APP_UNIT")"
			if [ -n "$inv" ] && collect_invocation_journal "$inv" "$journal_file" 2>/dev/null &&
				gate_markers_present "$journal_file"; then
				info "$stage" 'application ready for %s (unit active and the full T013 gate evidence present for invocation %s)' \
					"$purpose" "$inv"
				return 0
			fi
		fi
		if [ "$waited" -ge "$UNIT_WAIT_SECONDS" ]; then
			fail_stage "$stage" 'the application unit did not reach ready with T013 gate evidence within the bounded %ss wait (%s)' \
				"$UNIT_WAIT_SECONDS" "$purpose"
		fi
		sleep "$POLL_SECONDS"
		waited=$((waited + POLL_SECONDS))
	done
}

volumes_retained_check() {
	# volumes_retained_check <stage>: both named volumes still exist and the
	# named-volume set is unchanged since R1 (nothing was deleted, recreated,
	# or silently created — no empty replacement store).
	local stage="$1" current='' volume
	for volume in "$DB_VOLUME" "$MEDIA_VOLUME"; do
		if ! podman volume exists "$volume" 2>/dev/null; then
			fail_stage "$stage" 'expected persistent volume %s no longer exists; persistent state must never be deleted or recreated by lifecycle operations' \
				"$volume"
		fi
	done
	current="$(snapshot_volumes)"
	if [ "$current" != "$VOLUME_SNAPSHOT" ]; then
		fail_stage "$stage" 'the named-volume set changed during %s (a lifecycle operation created or removed a volume); expected the exact baseline set' "$stage"
	fi
}

lifecycle_cycle() {
	# lifecycle_cycle <n>: one full start/stop/restart/recreate cycle with a
	# readiness probe after every operation and both integrity checks at
	# every operational checkpoint. Ordering is always database-then-
	# application so dependency start-up is deterministic; only ephemeral
	# containers are ever replaced.
	local n="$1"
	local label="cycle-$n"

	# --- restart ---
	info C6 '%s: restart' "$label"
	systemctl --user restart "$DB_UNIT" ||
		fail_stage C6 '%s: restarting database unit %s failed' "$label" "$DB_UNIT"
	wait_unit_active C6 "$DB_UNIT" "$label restart database"
	systemctl --user restart "$APP_UNIT" ||
		fail_stage C6 '%s: restarting application unit %s failed' "$label" "$APP_UNIT"
	wait_app_ready_with_gate C6 "$label restart"
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C6 '%s: readiness after restart is %s (%s)' "$label" "$READINESS_STATE" "$READINESS_LINE"
	fi
	volumes_retained_check C6
	integrity_checkpoint "$label-restart"

	# --- stop (the stopped platform must report not-ready, never
	# stale-ready) ---
	info C6 '%s: stop' "$label"
	systemctl --user stop "$APP_UNIT" ||
		fail_stage C6 '%s: stopping application unit %s failed' "$label" "$APP_UNIT"
	wait_unit_not_active C6 "$APP_UNIT" "$label stop application"
	systemctl --user stop "$DB_UNIT" ||
		fail_stage C6 '%s: stopping database unit %s failed' "$label" "$DB_UNIT"
	wait_unit_not_active C6 "$DB_UNIT" "$label stop database"
	local state=''
	state="$(container_state "$APP_CONTAINER")"
	if [ "$state" = 'running' ]; then
		warn C6 '%s: application container still reports running after the unit stopped; continuing' "$label"
	fi
	probe_readiness
	if [ "$READINESS_STATE" = 'ready' ]; then
		fail_stage C6 '%s: readiness reported ready while the platform is stopped; a stopped platform must report not-ready' "$label"
	fi
	info C6 '%s: readiness while stopped: %s (%s)' "$label" "$READINESS_STATE" "$READINESS_LINE"
	volumes_retained_check C6

	# --- start ---
	info C6 '%s: start' "$label"
	systemctl --user start "$DB_UNIT" ||
		fail_stage C6 '%s: starting database unit %s failed' "$label" "$DB_UNIT"
	wait_unit_active C6 "$DB_UNIT" "$label start database"
	systemctl --user start "$APP_UNIT" ||
		fail_stage C6 '%s: starting application unit %s failed' "$label" "$APP_UNIT"
	wait_app_ready_with_gate C6 "$label start"
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C6 '%s: readiness after start is %s (%s)' "$label" "$READINESS_STATE" "$READINESS_LINE"
	fi
	volumes_retained_check C6
	integrity_checkpoint "$label-start"

	# --- replace/recreate (ephemeral containers only; named volumes
	# retained) ---
	info C6 '%s: replace/recreate' "$label"
	local old_app_id='' old_db_id='' new_app_id='' new_db_id=''
	old_app_id="$(container_id "$APP_CONTAINER")"
	old_db_id="$(container_id "$DB_CONTAINER")"
	systemctl --user stop "$APP_UNIT" ||
		fail_stage C6 '%s: stopping application unit %s for recreation failed' "$label" "$APP_UNIT"
	wait_unit_not_active C6 "$APP_UNIT" "$label recreate stop application"
	systemctl --user stop "$DB_UNIT" ||
		fail_stage C6 '%s: stopping database unit %s for recreation failed' "$label" "$DB_UNIT"
	wait_unit_not_active C6 "$DB_UNIT" "$label recreate stop database"
	# The containers are the validated task-owned ephemeral resources (R1
	# proved unit cgroup ownership); removing them after their units stopped
	# is exactly the replace/recreate exercise. Volumes are never touched.
	if [ "$(container_state "$APP_CONTAINER")" != 'absent' ]; then
		podman rm -f "$APP_CONTAINER" >/dev/null 2>&1 ||
			fail_stage C6 '%s: could not remove the stopped task-owned application container %s' "$label" "$APP_CONTAINER"
	fi
	if [ "$(container_state "$DB_CONTAINER")" != 'absent' ]; then
		podman rm -f "$DB_CONTAINER" >/dev/null 2>&1 ||
			fail_stage C6 '%s: could not remove the stopped task-owned database container %s' "$label" "$DB_CONTAINER"
	fi
	volumes_retained_check C6
	systemctl --user start "$DB_UNIT" ||
		fail_stage C6 '%s: starting database unit %s after recreation failed' "$label" "$DB_UNIT"
	wait_unit_active C6 "$DB_UNIT" "$label recreate start database"
	systemctl --user start "$APP_UNIT" ||
		fail_stage C6 '%s: starting application unit %s after recreation failed' "$label" "$APP_UNIT"
	wait_app_ready_with_gate C6 "$label recreate"
	new_app_id="$(container_id "$APP_CONTAINER")"
	new_db_id="$(container_id "$DB_CONTAINER")"
	if [ -n "$old_app_id" ] && [ "$new_app_id" = "$old_app_id" ]; then
		fail_stage C6 '%s: the application container was not replaced (container id unchanged across the recreate operation)' "$label"
	fi
	if [ -n "$old_db_id" ] && [ "$new_db_id" = "$old_db_id" ]; then
		fail_stage C6 '%s: the database container was not replaced (container id unchanged across the recreate operation)' "$label"
	fi
	info C6 '%s: ephemeral containers replaced (application and database container ids changed); named volumes retained' "$label"
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C6 '%s: readiness after recreate is %s (%s)' "$label" "$READINESS_STATE" "$READINESS_LINE"
	fi
	integrity_checkpoint "$label-recreate"

	pass C6 '%s complete: start, stop, restart, and replace/recreate exercised with readiness probes and both integrity checks at every checkpoint' "$label"
}

# ---------------------------------------------------------------------------
# C7 — missing expected persistence attachment reports not-ready (guarded
# negative test with byte-exact restore on every exit path)
# ---------------------------------------------------------------------------

classify_effective_media_attachment() {
	# classify_effective_media_attachment <effective-unit-file>: prints
	# 'attached', 'omitted', or 'unprovable' (introduced rework r1 finding 3;
	# rewritten in rework r2 finding 3 for faithful argv semantics). The
	# attachment in a Quadlet-GENERATED service is a podman run execution
	# argument, so this reasons over the EFFECTIVE ExecStart value with the
	# same quote-aware, systemd-escape-decoding tokenizer the wiring
	# reasoner uses: quoted option values stay whole, \xHH escapes DECODE
	# to their character (so -v songhealth-media:/app/medi\x61 attaches —
	# the decoding branch reads the effective COMMAND string; the earlier
	# array-indexed variant dropped every backslash, exceptional round 4
	# blocker 1),
	# the executable and 'run' subcommand are proven at their ACTUAL
	# leading positions (an /usr/bin/echo decoy that merely mentions podman
	# is unprovable), mount options are inspected only in the run-option
	# region before the image/command tail, and systemd ExecStart
	# override/reset semantics are honored (an empty ExecStart= resets
	# accumulated entries; the LAST surviving entry is effective).
	# 'attached' only when a recognized -v/--volume/--mount/--tmpfs option
	# (space or = form) has the expected media mount target as its
	# destination; malformed options and unparseable definitions are
	# 'unprovable' and are NEVER accepted as omission evidence. Pure text
	# reasoner over one file so the --self-test demonstrations exercise
	# identical logic.
	local unit_file="$1"
	node -e '
		const fs = require("fs");
		const target = process.argv[2];
		let text;
		try { text = fs.readFileSync(process.argv[1], "utf8"); } catch { process.stdout.write("unprovable\n"); process.exit(0); }
		// systemd ExecStart list semantics (rework r3, finding 3): ExecStart
		// is a resettable command LIST — an empty value resets it — and
		// multiple surviving commands are valid only for Type=oneshot
		// sequential execution. This classifier supports the single-command
		// application service, so EXACTLY ONE surviving entry may be
		// classified; zero or multiple survivors are unprovable (two
		// entries, first attached and second omitted, are NOT omission).
		let effective = [];
		for (const line of text.split("\n")) {
			if (!/^ExecStart=/.test(line)) continue;
			const value = line.slice("ExecStart=".length);
			if (value.trim() === "") { effective = []; continue; }
			effective.push(value);
		}
		if (effective.length !== 1) { process.stdout.write("unprovable\n"); process.exit(0); }
		const command = effective[0];
		const tokens = [];
		let current = "", has = false, quoted = false;
		for (let i = 0; i < command.length; i++) {
			const ch = command[i];
			if (ch === "\\") {
				// (exceptional round 4, blocker 1) bounds, lookahead, and
				// slices all read the effective COMMAND STRING - the previous
				// branch indexed the effective ARRAY (length 1 after the
				// single-entry check), so i + 1 < effective.length was always
				// false and every backslash escape was silently dropped,
				// turning /app/medi\x61 into /app/medix61 (false omission).
				if (i + 1 < command.length) {
					if (command[i + 1] === "x" && i + 3 < command.length && /^[0-9a-f]{2}$/.test(command.slice(i + 2, i + 4))) {
						current += String.fromCharCode(parseInt(command.slice(i + 2, i + 4), 16));
						i += 3;
					} else { current += command[i + 1]; i++; }
					has = true;
				}
				continue;
			}
			if (ch === "\"") { quoted = !quoted; has = true; continue; }
			if (!quoted && /\s/.test(ch)) {
				if (has) { tokens.push(current); current = ""; has = false; }
				continue;
			}
			current += ch;
			has = true;
		}
		if (has) tokens.push(current);
		if (!(tokens.length >= 2 && /(^|\/)podman$/.test(tokens[0]) && tokens[1] === "run")) { process.stdout.write("unprovable\n"); process.exit(0); }
		let end = tokens.length;
		if (tokens.length >= 3 && tokens[tokens.length - 3] === "sh" && tokens[tokens.length - 2] === "-c") end = tokens.length - 3;
		const destinationOf = (spec) => {
			if (spec.includes("target=")) {
				for (const kv of spec.split(",")) if (kv.startsWith("target=")) return kv.slice("target=".length);
				return null;
			}
			if (spec.includes(":")) { const parts = spec.split(":"); return parts.length >= 2 ? parts[1] : null; }
			return spec;
		};
		let attached = false, malformed = false;
		for (let i = 2; i < end; i++) {
			let spec = null;
			const t = tokens[i];
			if (t === "-v" || t === "--volume" || t === "--mount" || t === "--tmpfs") { if (i + 1 < end) spec = tokens[i + 1]; else { malformed = true; continue; } }
			else if (t.startsWith("--volume=")) spec = t.slice("--volume=".length);
			else if (t.startsWith("--mount=")) spec = t.slice("--mount=".length);
			else if (t.startsWith("--tmpfs=")) spec = t.slice("--tmpfs=".length);
			if (spec === null) continue;
			const dst = destinationOf(spec);
			if (dst === null || dst === "") { malformed = true; continue; }
			if (dst === target) attached = true;
		}
		if (attached) { process.stdout.write("attached\n"); process.exit(0); }
		if (malformed) { process.stdout.write("unprovable\n"); process.exit(0); }
		process.stdout.write("omitted\n");
	' "$unit_file" "$MEDIA_MOUNT_TARGET" 2>/dev/null || printf 'unprovable\n'
}

collect_startup_refusal_evidence() {
	# collect_startup_refusal_evidence: captures the STARTUP REFUSAL (C7,
	# Product Owner decision 2026-10-09) evidence context for the CURRENT
	# negative state (completed in rework r1, findings 3+5). Sets
	# REFUSAL_STATE='verified-omission' only when ALL of the following
	# hold; any failure leaves REFUSAL_STATE='' (the evidence class stays
	# unavailable and only a genuine T012 result can pass the stage).
	# Read-only, secret-checked, invocation-scoped:
	#   1. the currently loaded (generated) unit definition is captured and
	#      secret-free — a captured secret fails the stage outright;
	#   2. the EFFECTIVE EXECUTION ARGV of that definition is classified by
	#      classify_effective_media_attachment and must be 'omitted' — the
	#      attachment is a podman run argument in the generated service, so
	#      a Volume= text search or the edited Quadlet file alone proves
	#      nothing; 'attached' or 'unprovable' never yields acceptance;
	#   3. the current invocation's journal slice is captured and
	#      secret-free;
	#   4. the attempted start carries native state CONSISTENT with a
	#      pre-server refusal and no Healthy/Ready acceptance, taken
	#      together with the slice's complete absence of gate output: the
	#      manager's CURRENT InvocationID still equals the scoped invocation
	#      (stale or changed context rejected) and that invocation's main
	#      process exited nonzero (the guard's refusal exit). A nonzero
	#      final exit alone is not represented as proof of no earlier
	#      Healthy/Ready acceptance — it is one component of the combined
	#      evidence set (invocation consistency + nonzero exit + zero gate
	#      output in the scoped slice, checked by the reasoner); a
	#      successful exit, a still-running attempt, or absent state is not
	#      refusal evidence.
	REFUSAL_STATE=''
	local inv='' unit_file journal_file classification='' show='' s_inv='' s_code='' s_status=''
	unit_file="$TMP_DIR/unit-omitted-effective.txt"
	journal_file="$TMP_DIR/refusal-journal.txt"
	if ! timeout --kill-after=15 "${EXEC_TIMEOUT_SECONDS}s" \
		systemctl --user cat "$APP_UNIT" >"$unit_file" 2>/dev/null; then
		return 0
	fi
	if ! file_free_of_secrets "$unit_file"; then
		fail_stage C7 'the captured effective unit definition contains a configured secret value; refusing to continue'
	fi
	classification="$(classify_effective_media_attachment "$unit_file")"
	if [ "$classification" != 'omitted' ]; then
		return 0
	fi
	inv="$(current_invocation_id "$APP_UNIT")"
	if [ -z "$inv" ]; then
		return 0
	fi
	if ! collect_invocation_journal "$inv" "$journal_file"; then
		return 0
	fi
	if ! file_free_of_secrets "$journal_file"; then
		fail_stage C7 'the captured refusal journal contains a configured secret value; refusing to continue'
	fi
	# Named-property parsing (rework r2, finding 5): systemctl show does not
	# guarantee the requested property order across releases, and systemd
	# 259 prints ExecMainCode as an INTEGER (1 = exited; see the v259
	# property mapping and bus-print integer printer), not the word
	# 'exited'. Parse Key=Value lines BY NAME and validate the numeric exit
	# semantics: ExecMainCode must be exited (integer 1; the legacy string
	# form is still tolerated) and ExecMainStatus must be numeric and
	# nonzero (the guard's refusal exit). A successful exit, a non-numeric
	# status, or absent properties are not refusal evidence.
	show="$(systemctl --user show "$APP_UNIT" -p InvocationID -p ExecMainCode -p ExecMainStatus 2>/dev/null || true)"
	s_inv="$(printf '%s\n' "$show" | awk -F= '$1=="InvocationID"{print substr($0, index($0, "=") + 1)}')"
	s_code="$(printf '%s\n' "$show" | awk -F= '$1=="ExecMainCode"{print substr($0, index($0, "=") + 1)}')"
	s_status="$(printf '%s\n' "$show" | awk -F= '$1=="ExecMainStatus"{print substr($0, index($0, "=") + 1)}')"
	if [ -z "$s_inv" ] || [ -z "$s_code" ] || [ -z "$s_status" ]; then
		return 0
	fi
	if [ "$s_inv" != "$inv" ]; then
		return 0
	fi
	case $s_code in
	1 | exited) ;;
	*) return 0 ;;
	esac
	case $s_status in
	*[!0-9]* | '') return 0 ;;
	esac
	if [ "$s_status" -eq 0 ]; then
		return 0
	fi
	REFUSAL_STATE='verified-omission'
}

c7_negative_result_reason() {
	# c7_negative_result_reason <readiness-output-file> [refusal-journal]:
	# prints '' (empty) when the observed negative-state evidence is EXACTLY
	# the required bounded outcome — an explicit `not-ready` whose output
	# identifies the affected media dependency by its safe dependency name
	# (T012 class), or the complete STARTUP REFUSAL evidence set (unreachable
	# container + verified effective omission + invocation-scoped
	# media-identifying refusal + no gate completion) — and otherwise prints
	# the actionable rejection reason. Kept as a pure
	# reasoner (no exit, no side effects) so the --self-test demonstrations
	# exercise the identical logic on synthetic states. Two evidence classes
	# are accepted (Product Owner decision 2026-10-09): a genuine T012
	# not-ready result from a RUNNING container naming the media dependency,
	# or — only when the application container cannot start because the
	# required persistent media attachment is absent, so the helper cannot
	# execute — the STARTUP REFUSAL class: an invocation-scoped,
	# media-specific startup refusal with the effective attachment omission
	# verified and no gate completion in the same invocation. Generic
	# failures, stale logs, and simple unreachability remain rejected, and
	# the refusal is never classified as a readiness-helper result.
	local out_file="$1" refusal_file="${2:-}"
	case $READINESS_STATE in
	not-ready) ;;
	unreachable)
		if [ "$REFUSAL_STATE" != 'verified-omission' ]; then
			printf 'the platform is unreachable without the verified effective attachment omission required for the STARTUP REFUSAL evidence class (readiness state: %s; %s) — simple unreachability is not a substitute' \
				"$READINESS_STATE" "$READINESS_LINE"
			return 0
		fi
		if [ ! -s "$refusal_file" ]; then
			printf 'the STARTUP REFUSAL evidence class requires the current-invocation journal slice (readiness state: %s)' \
				"$READINESS_STATE"
			return 0
		fi
		# The refusal record must be ONE line that structurally matches the
		# approved guard diagnostic: after the literal media volume name and
		# BEFORE the literal mount target there must be an attachment-negation
		# (not attached / not mounted / missing / absent) — the guard's
		# "volume <V> is not attached at <T>" clause — and the line must
		# carry the refusal. Mere co-occurrence of a media mention with an
		# unrelated failure (same line or split lines) does not make media
		# absence the startup-blocking cause and is rejected.
		if ! awk -v v="$MEDIA_VOLUME" -v t="$MEDIA_MOUNT_TARGET" '
			{
				l = tolower($0)
				lv = tolower(v); lt = tolower(t)
				iv = index(l, lv)
				if (iv == 0) next
				it = index(l, lt)
				if (it == 0 || it <= iv) next
				seg = substr(l, iv + length(lv), it - iv - length(lv))
				# (exceptional round 4, blocker 3) the approved guard record is
				# "volume <V> ... <negation> ... at <T> - refusing to start":
				# the attachment clause (V, negation, T, in that order) must be
				# FOLLOWED ON THE SAME RECORD by the explicit refusal clause,
				# tying the refusal to the missing attachment. A refus* word
				# anywhere else on the line (a database "connection refused"
				# before the media warning) does not make media absence the
				# startup-blocking cause and is rejected, as are absence
				# warnings with no refusal at all.
				after = substr(l, it + length(lt))
				if (seg ~ /not attached|not mounted|missing|absent/ && after ~ /refus/) { found = 1; exit }
			}
			END { exit found ? 0 : 1 }
		' "$refusal_file"; then
			printf 'no single invocation-scoped refusal record identifies the required media attachment as the startup-blocking cause (the approved structure names the volume, negates its attachment, and names the mount target on one line; readiness state: %s) — unrelated media mentions, generic failures, and stale logs are not substitutes' \
				"$READINESS_STATE"
			return 0
		fi
		# No Healthy/Ready acceptance in the refused attempt: ANY gate stage
		# output in the scoped invocation contradicts a pre-server media
		# refusal (the guard runs before the gate), not merely the final
		# banner; native no-healthy state is separately established by the
		# collector from the invocation's nonzero main-process exit.
		if grep -qE 't013: \[S[0-9]+\]' "$refusal_file" || grep -qF "$GATE_BANNER" "$refusal_file"; then
			printf 'the current invocation also contains T013 gate output (a stage marker or the completion banner), contradicting a pre-server startup refusal (stale or contradictory evidence rejected; readiness state: %s)' \
				"$READINESS_STATE"
			return 0
		fi
		printf ''
		return 0
		;;
	ready)
		printf 'the platform reported READY with the expected media persistence attachment missing — a missing attachment must report not-ready and must never appear as a healthy empty replacement'
		return 0
		;;
	leaked)
		printf 'the readiness output exposed a configured secret value (value never printed); readiness output must be redacted in every state'
		return 0
		;;
	*)
		printf 'the platform did not produce the required explicit operational not-ready result (readiness state: %s; %s) — a failed or indeterminate platform is not a substitute: either the readiness check itself must report not-ready naming the affected media dependency, or the complete STARTUP REFUSAL evidence set must be established' \
			"$READINESS_STATE" "$READINESS_LINE"
			return 0
		;;
	esac
	if ! grep -qiE '(^|[^[:alpha:]])media([^[:alpha:]]|$)' "$out_file" 2>/dev/null; then
		printf 'the not-ready result did not identify the affected media dependency by its safe dependency name (the readiness output must name media)'
		return 0
	fi
	printf ''
	return 0
}

check_missing_attachment_negative() {
	# Omit ONLY the expected media-volume attachment from the application
	# unit's installed Quadlet source, then restart the unit: the platform's
	# recurring readiness must explicitly report not-ready naming the media
	# dependency, and must never come up healthy with an empty replacement
	# store. Persistent state is untouched (the named volume is not deleted,
	# unmounted, or reinitialized); the source file is restored byte-exact
	# and verified afterwards, and the EXIT/INT/TERM traps restore it — or
	# fail closed preserving the recovery material — even when this stage is
	# interrupted.
	local media_volume_lines=0 total_before=0 total_after=0
	media_volume_lines="$(grep -cE "^[[:space:]]*Volume=.*${MEDIA_VOLUME}" "$QUADLET_SOURCE" || true)"
	if [ "$media_volume_lines" -eq 0 ]; then
		fail_stage C7 'the application Quadlet source %s declares no Volume= line referencing the expected media volume %s; cannot simulate the attachment omission' \
			"$QUADLET_SOURCE" "$MEDIA_VOLUME"
	fi
	total_before="$(wc -l <"$QUADLET_SOURCE" | tr -d '[:space:]')"

	QUADLET_BACKUP="$TMP_DIR/quadlet-app.backup"
	cp -p "$QUADLET_SOURCE" "$QUADLET_BACKUP" ||
		fail_stage C7 'could not create the byte-exact baseline copy of %s; aborting before any modification' "$QUADLET_SOURCE"
	QUADLET_SOURCE_SHA_BASE="$(sha256sum "$QUADLET_BACKUP" | awk '{print $1}')"

	grep -vE "^[[:space:]]*Volume=.*${MEDIA_VOLUME}" "$QUADLET_BACKUP" >"$TMP_DIR/quadlet-app.modified"
	total_after="$(wc -l <"$TMP_DIR/quadlet-app.modified" | tr -d '[:space:]')"
	if [ "$((total_before - total_after))" -ne "$media_volume_lines" ]; then
		fail_stage C7 'the attachment-omission edit was not surgical; aborting before any unit change (nothing was modified)'
	fi
	# From here on the source may be modified: mark it FIRST so that any
	# failure — including a partial write or an interruption — takes the
	# trap-guarded byte-exact restore path.
	QUADLET_MODIFIED='yes'
	cat "$TMP_DIR/quadlet-app.modified" >"$QUADLET_SOURCE" ||
		fail_stage C7 'writing the attachment-omitted Quadlet source failed; the exit trap restores the byte-exact baseline'
	if [ "$(sha256sum "$QUADLET_SOURCE" | awk '{print $1}')" = "$QUADLET_SOURCE_SHA_BASE" ]; then
		fail_stage C7 'the attachment-omission edit changed nothing; aborting before any unit change'
	fi
	info C7 'media-volume attachment omitted from %s (%s line(s)); byte-exact baseline copy retained (SHA-256 %s) and every exit path restores it' \
		"$QUADLET_SOURCE" "$media_volume_lines" "$QUADLET_SOURCE_SHA_BASE"

	systemctl --user daemon-reload ||
		fail_stage C7 'daemon-reload after the guarded Quadlet edit failed; the original attachment is restored by the exit trap'
	systemctl --user restart "$APP_UNIT" ||
		info C7 'restarting the application unit with the omitted attachment reported failure (the platform refused the state; proceeding to the readiness evidence)'

	# Bounded settle: poll until the recurring readiness mechanism produces a
	# determinate result for the omission state (the helper may need the
	# container to finish starting). Two Product Owner approved evidence
	# classes are determinate here: a genuine T012 not-ready result from a
	# running container, or — when the container cannot start because the
	# required media attachment is absent, so the helper cannot execute —
	# the complete STARTUP REFUSAL evidence set, collected against the
	# CURRENT invocation only. Anything else keeps polling until the bound;
	# the shared reasoner below makes the final call, and unit failure or
	# simple unreachability alone is never accepted.
	local waited=0 unit_state='' determinate='no' evidence_class=''
	while [ "$waited" -lt "$NEGATIVE_SETTLE_SECONDS" ] && [ "$determinate" = 'no' ]; do
		unit_state="$(systemctl --user is-active "$APP_UNIT" 2>/dev/null || true)"
		probe_readiness
		REFUSAL_STATE=''
		case $READINESS_STATE in
		ready | not-ready | leaked)
			determinate='yes'
			;;
		unreachable)
			collect_startup_refusal_evidence
			if [ "$REFUSAL_STATE" = 'verified-omission' ] &&
				[ -z "$(c7_negative_result_reason "$TMP_DIR/readiness.out" "$TMP_DIR/refusal-journal.txt")" ]; then
				determinate='yes'
			fi
			;;
		esac
		if [ "$determinate" = 'no' ]; then
			sleep "$POLL_SECONDS"
			waited=$((waited + POLL_SECONDS))
		fi
	done
	# Evidence classification (never re-labeled): a T012 result only exists
	# when the container ran and the helper produced it; everything else
	# that passes the reasoner is STARTUP REFUSAL.
	evidence_class='STARTUP REFUSAL (invocation-scoped, media-specific, no gate completion; Product Owner decision 2026-10-09 — never a T012 readiness-helper result)'
	if [ "$READINESS_STATE" = 'not-ready' ]; then
		evidence_class='T012 readiness-helper result from the running container'
	fi
	info C7 'with the expected media attachment omitted: unit state %s, readiness %s (%s), evidence class: %s' \
		"${unit_state:-unknown}" "$READINESS_STATE" "$READINESS_LINE" "$evidence_class"

	local reject_reason=''
	reject_reason="$(c7_negative_result_reason "$TMP_DIR/readiness.out" "$TMP_DIR/refusal-journal.txt")"
	if [ -n "$reject_reason" ]; then
		fail_stage C7 '%s' "$reject_reason"
	fi

	# Persistent state untouched by the omission: both volumes still exist
	# and the named-volume set is unchanged (no empty replacement store was
	# created anywhere).
	volumes_retained_check C7
	pass C7 'missing expected persistence attachment produced the required explicit operational not-ready evidence identifying the media dependency (%s; evidence class: %s); no healthy empty replacement and no persistent-state mutation' \
		"$READINESS_LINE" "$evidence_class"

	# Restore the original attachment (byte-exact, checksum-verified) and
	# re-verify the platform end to end.
	if ! restore_app_quadlet; then
		fail_stage C7 'the byte-exact attachment restore could not be verified; a recovery copy was preserved next to the source and the exit cleanup keeps the scratch directory with the original backup — nothing is deleted'
	fi
	if ! systemctl --user is-active --quiet "$APP_UNIT" 2>/dev/null; then
		systemctl --user start "$APP_UNIT" ||
			fail_stage C7 'the application unit did not start after restoring the original attachment'
	fi
	wait_app_ready_with_gate C7 'restore'
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C7 'readiness after restoring the original attachment is %s (%s)' "$READINESS_STATE" "$READINESS_LINE"
	fi
	volumes_retained_check C7
	integrity_checkpoint C7-restore
	pass C7 'original attachment restored byte-exact (SHA-256 verified) and the platform re-verified ready with full integrity'
}

# ---------------------------------------------------------------------------
# --self-test: isolated failure-path demonstrations of the corrected
# branches (review round 1). Nothing here touches a real deployment: the
# restore/cleanup branches run against scratch files with a shimmed
# systemctl first on PATH, the negative-result reasoner runs on synthetic
# states, and the non-mutation detector runs against a scratch directory.
# Exit is 0 only when every demonstration passes.
# ---------------------------------------------------------------------------

ST_ROOT=''
ST_FAILURES=0
ST_PASSES=0

st_case() {
	# st_case <name> <verdict-line>
	printf 't016-selftest: [%s] %s\n' "$1" "$2"
	ST_PASSES=$((ST_PASSES + 1))
}

st_fail() {
	# st_fail <name> <reason>
	printf 't016-selftest: [%s] FAIL %s\n' "$1" "$2" >&2
	ST_FAILURES=$((ST_FAILURES + 1))
}

self_test() {
	local missing=()
	local tool
	for tool in node sha256sum mktemp grep cmp; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "self-test requires tool(s) not on PATH: ${missing[*]}"
	fi

	ST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/t016-selftest.XXXXXX")"

	# The wiring and ordered-marker demonstrations consume the same derived
	# markers and repository authorities the main verification path uses.
	ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
	derive_gate_markers

	# systemctl shim: records every invocation and succeeds, so the restore
	# branches never touch the real user systemd manager during the
	# self-test. It also serves optional fixture files (rework r2): a
	# captured effective unit for `--user cat`, sequenced InvocationID
	# values for single-property --value queries (simulating fresh or
	# changed invocations), and a named-property show payload for the
	# multi-property state query. journalctl and podman shims serve the
	# collector/refusal and identity-binding demonstrations the same way —
	# no real runtime manager, journal, or container engine is ever
	# invoked by the self-test.
	mkdir -p "$ST_ROOT/bin"
	cat >"$ST_ROOT/bin/systemctl" <<SHIM
#!/usr/bin/env bash
printf '%s\n' "\$*" >>'$ST_ROOT/systemctl.log'
case " \$* " in
*' --user cat '*)
	[ -f '$ST_ROOT/fx-unit' ] && cat '$ST_ROOT/fx-unit'
	exit 0
	;;
*' --value '*)
		if [ -f '$ST_ROOT/fx-inv' ]; then
		n="\$(cat '$ST_ROOT/fx-inv-count' 2>/dev/null || printf 0)"
		n=\$((n + 1))
		printf '%s' "\$n" >'$ST_ROOT/fx-inv-count'
		sed -n "\${n}p" '$ST_ROOT/fx-inv'
	fi
	exit 0
	;;
*' show '*)
	[ -f '$ST_ROOT/fx-show' ] && cat '$ST_ROOT/fx-show'
	exit 0
	;;
esac
exit 0
SHIM
	chmod +x "$ST_ROOT/bin/systemctl"
	cat >"$ST_ROOT/bin/journalctl" <<SHIM
#!/usr/bin/env bash
printf '%s\n' "\$*" >>'$ST_ROOT/journalctl.log'
[ -f '$ST_ROOT/fx-journal' ] && cat '$ST_ROOT/fx-journal'
exit 0
SHIM
	chmod +x "$ST_ROOT/bin/journalctl"
	cat >"$ST_ROOT/bin/podman" <<SHIM
#!/usr/bin/env bash
printf '%s\n' "\$*" >>'$ST_ROOT/podman.log'
case " \$* " in
*' container inspect '*)
	[ -f '$ST_ROOT/fx-podman-image' ] && cat '$ST_ROOT/fx-podman-image'
	exit 0
	;;
*' sha256sum '*)
	[ -f '$ST_ROOT/fx-podman-sums' ] && cat '$ST_ROOT/fx-podman-sums'
	exit 0
	;;
esac
exit 0
SHIM
	chmod +x "$ST_ROOT/bin/podman"
	PATH="$ST_ROOT/bin:$PATH"
	APP_UNIT='t016-selftest-absent.service'

	local src="$ST_ROOT/app.container" bak="$ST_ROOT/backup.container"

	# Case 1 — verified restore: returns 0, restores the content byte-exact,
	# and reloaded the manager (shim log).
	printf '[Container]\nVolume=songhealth-media.volume:/app/media\n' >"$src"
	cp -p "$src" "$bak"
	printf '[Container]\n' >"$src"
	QUADLET_SOURCE="$src"
	QUADLET_BACKUP="$bak"
	QUADLET_SOURCE_SHA_BASE="$(sha256sum "$bak" | awk '{print $1}')"
	QUADLET_MODIFIED='yes'
	if restore_app_quadlet &&
		[ "$(sha256sum "$src" | awk '{print $1}')" = "$QUADLET_SOURCE_SHA_BASE" ] &&
		grep -q 'daemon-reload' "$ST_ROOT/systemctl.log"; then
		st_case restore-verified 'PASS byte-exact restore returned 0, restored the content, and attempted daemon-reload (shimmed)'
	else
		st_fail restore-verified 'the verified-restore branch must return 0, restore byte-exact, and reload the manager'
	fi
	QUADLET_MODIFIED=''

	# Case 2 — unverifiable restore (doctored baseline digest): must fail
	# closed, keep the original backup, and write the adjacent recovery copy.
	printf '[Container]\n' >"$src"
	QUADLET_BACKUP="$bak"
	QUADLET_SOURCE_SHA_BASE="$(printf '0%.0s' {1..64})"
	QUADLET_MODIFIED='yes'
	local recovery="$src.t016-recovery" rc2=0
	rm -f "$recovery"
	restore_app_quadlet || rc2=$?
	if [ "$rc2" -ne 0 ] && [ -f "$bak" ] && [ -f "$recovery" ] && cmp -s "$recovery" "$bak"; then
		st_case restore-unverified 'PASS unverifiable restore returned nonzero and preserved the original backup AND the adjacent recovery copy'
	else
		st_fail restore-unverified 'an unverifiable restore must fail closed, keep the backup, and write the adjacent recovery copy'
	fi
	QUADLET_MODIFIED=''

	# Case 3 — missing baseline copy: must fail closed (no silent success).
	QUADLET_SOURCE="$src"
	QUADLET_BACKUP="$ST_ROOT/does-not-exist.backup"
	QUADLET_MODIFIED='yes'
	local rc3=0
	restore_app_quadlet || rc3=$?
	if [ "$rc3" -ne 0 ]; then
		st_case restore-missing-backup 'PASS missing baseline copy returned nonzero (no silent success)'
	else
		st_fail restore-missing-backup 'a missing baseline copy must not report success'
	fi
	QUADLET_MODIFIED=''
	QUADLET_BACKUP=''

	# Case 4 — cleanup with an unverified restore: must return nonzero, KEEP
	# the scratch directory holding the backup, and leave the adjacent
	# recovery copy in place.
	local keep_dir="$ST_ROOT/tmpdir-unverified"
	mkdir -p "$keep_dir"
	cp -p "$bak" "$keep_dir/quadlet-app.backup"
	printf '[Container]\n' >"$src"
	QUADLET_SOURCE="$src"
	QUADLET_BACKUP="$keep_dir/quadlet-app.backup"
	QUADLET_SOURCE_SHA_BASE="$(printf '0%.0s' {1..64})"
	QUADLET_MODIFIED='yes'
	local saved_tmp="$TMP_DIR"
	TMP_DIR="$keep_dir"
	rm -f "$recovery"
	local rc4=0
	cleanup || rc4=$?
	if [ "$rc4" -ne 0 ] && [ -d "$keep_dir" ] && [ -f "$keep_dir/quadlet-app.backup" ] && [ -f "$recovery" ]; then
		st_case cleanup-preserves-recovery 'PASS unverified restore: cleanup returned nonzero and kept BOTH the scratch directory (with the backup) and the adjacent recovery copy'
	else
		st_fail cleanup-preserves-recovery 'cleanup must fail closed and keep the recovery material when the restore is unverified'
	fi
	QUADLET_MODIFIED=''
	TMP_DIR="$saved_tmp"

	# Case 5 — cleanup with nothing to restore: returns 0 and removes the
	# scratch directory.
	local plain_dir="$ST_ROOT/tmpdir-clean"
	mkdir -p "$plain_dir"
	TMP_DIR="$plain_dir"
	QUADLET_MODIFIED=''
	local rc5=0
	cleanup || rc5=$?
	if [ "$rc5" -eq 0 ] && [ ! -d "$plain_dir" ]; then
		st_case cleanup-removes-scratch 'PASS clean state: scratch directory removed and 0 returned'
	else
		st_fail cleanup-removes-scratch 'cleanup must return 0 and remove the scratch directory when nothing needs restoring'
	fi
	TMP_DIR="$saved_tmp"

	# Case 6 — the negative-result reasoner accepts ONLY the explicit
	# not-ready result naming media.
	local reason='' out="$ST_ROOT/readiness.out"
	local state
	for state in ready unreachable indeterminate leaked; do
		READINESS_STATE="$state"
		READINESS_LINE="synthetic $state"
		reason="$(c7_negative_result_reason "$out")"
		if [ -n "$reason" ]; then
			st_case "reasoner-rejects-$state" 'PASS non-not-ready state rejected (unit failure/unreachability is not a substitute)'
		else
			st_fail "reasoner-rejects-$state" 'this state must be rejected'
		fi
	done
	READINESS_STATE='not-ready'
	READINESS_LINE='synthetic not-ready (database)'
	printf 'songhealth readiness: not-ready\nfailed dependency: database (PostgreSQL connectivity check failed)\n' >"$out"
	reason="$(c7_negative_result_reason "$out")"
	if [ -n "$reason" ]; then
		st_case reasoner-rejects-other-dependency 'PASS not-ready naming a different dependency rejected'
	else
		st_fail reasoner-rejects-other-dependency 'a not-ready result naming a non-media dependency must be rejected'
	fi
	printf 'songhealth readiness: not-ready\nfailed dependency: media (expected media mount missing or unreadable)\n' >"$out"
	reason="$(c7_negative_result_reason "$out")"
	if [ -z "$reason" ]; then
		st_case reasoner-accepts-media-notready 'PASS the explicit not-ready result naming the media dependency accepted'
	else
		st_fail reasoner-accepts-media-notready "must accept this result: $reason"
	fi
	# Case 6b — the STARTUP REFUSAL evidence class (Product Owner decision
	# 2026-10-09): accepted only with the COMPLETE evidence set, and
	# classified as startup refusal — never as a T012 readiness result.
	local rj="$ST_ROOT/refusal-journal.txt" reason_r=''
	READINESS_STATE='unreachable'
	READINESS_LINE='application container not running (platform stopped or failed)'
	REFUSAL_STATE='verified-omission'
	printf 'songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -z "$reason_r" ]; then
		st_case reasoner-accepts-startup-refusal 'PASS the invocation-scoped media-identifying startup refusal accepted (STARTUP REFUSAL class)'
	else
		st_fail reasoner-accepts-startup-refusal "must accept this evidence: $reason_r"
	fi
	printf 'Error: no secret with name or id songhealth-encryption-key: no such secret\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-generic-refusal 'PASS a generic startup failure that does not identify the media dependency rejected'
	else
		st_fail reasoner-rejects-generic-refusal 'a generic failure must be rejected in the refusal class'
	fi
	{
		printf 'songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start\n'
		printf 't013: [S1] PASS inputs valid\n'
	} >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-refusal-with-gate-output 'PASS a refusal slice that also contains T013 gate stage output rejected (contradiction/stale evidence)'
	else
		st_fail reasoner-rejects-refusal-with-gate-output 'any gate stage output contradicts a pre-server refusal and must be rejected'
	fi
	{
		printf 'songhealth-app: media path /app/media\n'
		printf 'songhealth-app: database connection refused\n'
	} >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-split-line-refusal 'PASS unrelated media mention and generic refusal on different lines rejected (one record must name the dependency as the blocking cause)'
	else
		st_fail reasoner-rejects-split-line-refusal 'a media mention plus an unrelated failure must not compose a refusal record'
	fi
	printf 'songhealth-app: database connection refused; media settings: songhealth-media /app/media\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-same-line-unrelated 'PASS a same-line generic failure that merely mentions the media identifiers rejected (media absence must be the blocking cause)'
	else
		st_fail reasoner-rejects-same-line-unrelated 'co-occurrence of media identifiers with an unrelated failure must be rejected'
	fi
	printf 'WARNING: songhealth-media is not attached at /app/media\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-absence-warning 'PASS an absence WARNING without an explicit refusal clause rejected (the approved guard diagnostic is required)'
	else
		st_fail reasoner-rejects-absence-warning 'absence words without a refusal clause must not compose a refusal record'
	fi
	printf 'songhealth-app: database connection refused; WARNING: songhealth-media is not attached at /app/media\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-combined-unrelated-refusal 'PASS a database refusal preceding a media warning rejected (the refusal clause must follow the attachment clause it refuses)'
	else
		st_fail reasoner-rejects-combined-unrelated-refusal 'an unrelated refusal word must not validate a media warning'
	fi
	{
		printf 'songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start\n'
		printf 't013: T013 startup acceptance gate: PASS\n'
	} >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-refusal-with-banner-only 'PASS a refusal slice containing only the completion banner (no stage markers) rejected'
	else
		st_fail reasoner-rejects-refusal-with-banner-only 'the completion banner alone must still contradict a pre-server refusal'
	fi
	REFUSAL_STATE=''
	printf 'songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start\n' >"$rj"
	reason_r="$(c7_negative_result_reason "$out" "$rj")"
	if [ -n "$reason_r" ]; then
		st_case reasoner-rejects-refusal-unverified-omission 'PASS unreachability without the verified effective omission rejected (simple unreachability is not a substitute)'
	else
		st_fail reasoner-rejects-refusal-unverified-omission 'the refusal class requires the verified omission context'
	fi
	READINESS_STATE=''
	READINESS_LINE=''
	REFUSAL_STATE=''

	# Case 6c — the effective-attachment classifier reasons over the
	# GENERATED service's execution argv (the attachment is a podman run
	# argument there, never a Volume= line): attached / omitted / unprovable.
	local cdir="$ST_ROOT/classify" cls=''
	mkdir -p "$cdir"
	cat >"$cdir/attached-v.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/media --publish 127.0.0.1:4321:4321 localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"
UNIT
	cls="$(classify_effective_media_attachment "$cdir/attached-v.service")"
	if [ "$cls" = 'attached' ]; then
		st_case classify-attached-volume 'PASS a generated service attaching media via -v classified attached'
	else
		st_fail classify-attached-volume "expected attached, got: $cls"
	fi
	cat >"$cdir/attached-mount.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm --mount type=volume,source=songhealth-media,target=/app/media localhost/songhealth-app:0.0.1@sha256:0000000000000000000000000000000000000000000000000000000000000000 sh -c "gate && server"
UNIT
	cls="$(classify_effective_media_attachment "$cdir/attached-mount.service")"
	if [ "$cls" = 'attached' ]; then
		st_case classify-attached-mount 'PASS a generated service attaching media via --mount target= classified attached'
	else
		st_fail classify-attached-mount "expected attached, got: $cls"
	fi
	cat >"$cdir/omitted.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm --publish 127.0.0.1:4321:4321 localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"
UNIT
	cls="$(classify_effective_media_attachment "$cdir/omitted.service")"
	if [ "$cls" = 'omitted' ]; then
		st_case classify-omitted 'PASS a generated service with no media attachment option classified omitted'
	else
		st_fail classify-omitted "expected omitted, got: $cls"
	fi
	printf '[Service]\nExecStart=/usr/bin/node dist/server/entry.mjs\n' >"$cdir/nopodman.service"
	cls="$(classify_effective_media_attachment "$cdir/nopodman.service")"
	if [ "$cls" = 'unprovable' ]; then
		st_case classify-unprovable-not-run 'PASS a non-podman-run ExecStart classified unprovable (never omission evidence)'
	else
		st_fail classify-unprovable-not-run "expected unprovable, got: $cls"
	fi
	printf '[Service]\n' >"$cdir/noexecstart.service"
	cls="$(classify_effective_media_attachment "$cdir/noexecstart.service")"
	if [ -z "$cls" ] || [ "$cls" = 'unprovable' ]; then
		st_case classify-unprovable-absent 'PASS an absent ExecStart classified unprovable (never omission evidence)'
	else
		st_fail classify-unprovable-absent "expected unprovable/empty, got: $cls"
	fi
	cat >"$cdir/quoted-attach.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm -v "songhealth-media:/app/media" localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"
UNIT
	cls="$(classify_effective_media_attachment "$cdir/quoted-attach.service")"
	if [ "$cls" = 'attached' ]; then
		st_case classify-attached-quoted 'PASS a QUOTED -v option value kept whole by the faithful tokenizer classified attached'
	else
		st_fail classify-attached-quoted "expected attached, got: $cls"
	fi
	cat >"$cdir/escaped-attach.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/medi\x61 localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"
UNIT
	cls="$(classify_effective_media_attachment "$cdir/escaped-attach.service")"
	if [ "$cls" = 'attached' ]; then
		st_case classify-attached-escaped 'PASS a systemd \xHH-escaped destination DECODED to the media target classified attached'
	else
		st_fail classify-attached-escaped "expected attached, got: $cls"
	fi
	cat >"$cdir/echo-decoy.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/echo /usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/media
UNIT
	cls="$(classify_effective_media_attachment "$cdir/echo-decoy.service")"
	if [ "$cls" = 'unprovable' ]; then
		st_case classify-decoy-argv 'PASS an echo argv that merely mentions podman run classified unprovable (positional executable proof)'
	else
		st_fail classify-decoy-argv "expected unprovable, got: $cls"
	fi
	cat >"$cdir/malformed.service" <<'UNIT'
[Service]
ExecStart=/usr/bin/podman run --name systemd-%N --rm -v
UNIT
	cls="$(classify_effective_media_attachment "$cdir/malformed.service")"
	if [ "$cls" = 'unprovable' ]; then
		st_case classify-malformed-option 'PASS a dangling -v with no value classified unprovable (never omission evidence)'
	else
		st_fail classify-malformed-option "expected unprovable, got: $cls"
	fi
	{
		printf '[Service]\n'
		printf 'ExecStart=/usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/media localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"\n'
		printf 'ExecStart=\n'
		printf 'ExecStart=/usr/bin/podman run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"\n'
	} >"$cdir/reset-then-real.service"
	cls="$(classify_effective_media_attachment "$cdir/reset-then-real.service")"
	if [ "$cls" = 'omitted' ]; then
		st_case classify-reset-then-real 'PASS an ExecStart= reset honored: the LAST surviving entry (no attachment) classified omitted'
	else
		st_fail classify-reset-then-real "expected omitted, got: $cls"
	fi
	{
		printf '[Service]\n'
		printf 'ExecStart=/usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/media localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"\n'
		printf 'ExecStart=\n'
	} >"$cdir/reset-only.service"
	cls="$(classify_effective_media_attachment "$cdir/reset-only.service")"
	if [ -z "$cls" ] || [ "$cls" = 'unprovable' ]; then
		st_case classify-reset-only 'PASS a lone ExecStart= reset (no effective command) classified unprovable (never omission evidence)'
	else
		st_fail classify-reset-only "expected unprovable/empty, got: $cls"
	fi
	{
		printf '[Service]\n'
		printf 'ExecStart=/usr/bin/podman run --name systemd-%N --rm -v songhealth-media:/app/media localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"\n'
		printf 'ExecStart=/usr/bin/podman run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "gate && server"\n'
	} >"$cdir/multi-entry.service"
	cls="$(classify_effective_media_attachment "$cdir/multi-entry.service")"
	if [ -z "$cls" ] || [ "$cls" = 'unprovable' ]; then
		st_case classify-multiple-entries 'PASS two surviving ExecStart entries (attached then omitted, no reset) classified unprovable - not omission'
	else
		st_fail classify-multiple-entries "expected unprovable/empty, got: $cls"
	fi

	# Collector state-collection demonstrations (rework r2, finding 5),
	# entirely through the shimmed systemctl/journalctl with authentic
	# Key=Value property shapes: named parsing must tolerate ANY property
	# order, accept the systemd-259 integer ExecMainCode (1) and the legacy
	# string form, reject stale invocation context, reject successful
	# exits, and complete only with the full evidence set.
	local saved_tmp="$TMP_DIR" refused='' props=''
	TMP_DIR="$ST_ROOT/collector-tmp"
	mkdir -p "$TMP_DIR"
	cp "$cdir/omitted.service" "$ST_ROOT/fx-unit"
	printf 'songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start\n' >"$ST_ROOT/fx-journal"
	for props in \
		'ExecMainStatus=1\nInvocationID=inv-9\nExecMainCode=1' \
		'ExecMainCode=1\nExecMainStatus=1\nInvocationID=inv-9' \
		'ExecMainCode=exited\nInvocationID=inv-9\nExecMainStatus=1'; do
		printf '%b\n' "$props" >"$ST_ROOT/fx-show"
		printf 'inv-9\n' >"$ST_ROOT/fx-inv"
		: >"$ST_ROOT/fx-inv-count"
		REFUSAL_STATE=''
		collect_startup_refusal_evidence
		if [ "$REFUSAL_STATE" = 'verified-omission' ]; then
			refused='yes'
		else
			refused='no'
			break
		fi
	done
	if [ "$refused" = 'yes' ]; then
		st_case collector-accepts-authentic-state 'PASS the collector verified the omission evidence from named properties in any order, integer and legacy ExecMainCode forms, nonzero status'
	else
		st_fail collector-accepts-authentic-state 'the collector must accept authentic state shapes for a genuine refusal attempt'
	fi
	printf 'inv-1\ninv-2\n' >"$ST_ROOT/fx-inv"
	: >"$ST_ROOT/fx-inv-count"
	printf 'ExecMainCode=1\nInvocationID=inv-2\nExecMainStatus=1\n' >"$ST_ROOT/fx-show"
	REFUSAL_STATE=''
	collect_startup_refusal_evidence
	if [ -z "$REFUSAL_STATE" ]; then
		st_case collector-rejects-stale-invocation 'PASS a changed invocation context between capture and state query rejected'
	else
		st_fail collector-rejects-stale-invocation 'a stale/changed invocation must not produce refusal evidence'
	fi
	printf 'inv-9\n' >"$ST_ROOT/fx-inv"
	: >"$ST_ROOT/fx-inv-count"
	printf 'ExecMainCode=1\nInvocationID=inv-9\nExecMainStatus=0\n' >"$ST_ROOT/fx-show"
	REFUSAL_STATE=''
	collect_startup_refusal_evidence
	if [ -z "$REFUSAL_STATE" ]; then
		st_case collector-rejects-success-exit 'PASS a successful (zero) main-process exit rejected as refusal evidence'
	else
		st_fail collector-rejects-success-exit 'a zero exit is not a refusal exit and must be rejected'
	fi
	rm -f "$ST_ROOT/fx-unit" "$ST_ROOT/fx-show" "$ST_ROOT/fx-inv" "$ST_ROOT/fx-inv-count" "$ST_ROOT/fx-journal"
	TMP_DIR="$saved_tmp"

	# Case 7 — the strengthened non-mutation detector catches the prohibited
	# probe classes the old path/size/mtime-only hash missed.
	local media="$ST_ROOT/media" h_before='' h_after=''
	mkdir -p "$media"
	h_before="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	printf 'probe-bytes' >"$media/.songhealth-probe"
	cat "$media/.songhealth-probe" >/dev/null
	rm -f "$media/.songhealth-probe"
	h_after="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	if [ "$h_before" != "$h_after" ]; then
		st_case detect-create-read-delete 'PASS create/read/delete probe in an empty directory detected (media-root metadata is hashed)'
	else
		st_fail detect-create-read-delete 'a create/read/delete probe must change the snapshot digest'
	fi
	printf 'AAAA' >"$media/f.dat"
	h_before="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	printf 'BBBB' >"$media/f.dat"
	h_after="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	if [ "$h_before" != "$h_after" ]; then
		st_case detect-in-place-change 'PASS same-size in-place byte change detected (content digest is hashed)'
	else
		st_fail detect-in-place-change 'a same-size in-place byte change must change the snapshot digest'
	fi
	# Isolated subdirectory case: the baseline is recaptured immediately
	# before the mkdir/rmdir so ONLY the directory mutation is measured
	# (the preceding in-place byte change must not contaminate it).
	h_before="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	mkdir "$media/subdir"
	rmdir "$media/subdir"
	h_after="$(node -e "$(media_walk_js)" "$media" | sha256sum | awk '{print $1}')"
	if [ "$h_before" != "$h_after" ]; then
		st_case detect-subdir-create-delete 'PASS subdirectory create/delete detected (baseline recaptured immediately before the mutation)'
	else
		st_fail detect-subdir-create-delete 'an isolated subdirectory create/delete must change the snapshot digest'
	fi

	# Case 8 — the gate-wiring reasoner accepts only an effective unit
	# definition whose Exec command invokes the accepted T013 authority
	# with PROVEN EXECUTABLE IDENTITY. The four bypass forms from review
	# round 4 (bare basename, interpreter + bare basename, same-suffix path
	# in an unrelated tree, fake npm runner) must all be rejected, alongside
	# the round-3 inert forms and the plain not-wired/fabricated units;
	# the positive controls use only executables whose identity this
	# verification environment can actually prove: the repository
	# authority file itself, a symlink resolving to it, a system
	# interpreter under /usr, and the npm this environment itself resolves.
	local wdir="$ST_ROOT/wiring" reason_w='' saved_root="$ROOT"
	local authority_path="$ROOT/$T013_SCRIPT"
	local trusted_npm_path=''
	trusted_npm_path="$(node -e '
		const fs = require("fs");
		const path = require("path");
		for (const dir of String(process.env.PATH || "").split(":").filter(Boolean)) {
			try { process.stdout.write(fs.realpathSync(path.join(dir, "npm"))); break; } catch {}
		}
	')"
	if [ -n "$trusted_npm_path" ]; then
		:
	else
		st_fail wiring-npm-resolution 'could not resolve a trusted npm in this environment for the positive control'
	fi
	mkdir -p "$wdir"
	ln -sfn "$authority_path" "$wdir/authority-link.sh"
	printf '[Service]\nExecStartPre=%s\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' "$authority_path" >"$wdir/direct.unit"
	reason_w="$(gate_wiring_reason "$wdir/direct.unit")"
	if [ -z "$reason_w" ]; then
		st_case wiring-accepts-direct 'PASS the repository authority file as the executable token accepted (realpath identity)'
	else
		st_fail wiring-accepts-direct "must accept: $reason_w"
	fi
	printf '[Service]\nExecStartPre=%s\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' "$wdir/authority-link.sh" >"$wdir/symlink.unit"
	reason_w="$(gate_wiring_reason "$wdir/symlink.unit")"
	if [ -z "$reason_w" ]; then
		st_case wiring-accepts-symlink 'PASS a symlink that RESOLVES to the authority accepted (resolution is identity)'
	else
		st_fail wiring-accepts-symlink "must accept: $reason_w"
	fi
	printf '[Service]\nExecStartPre=/bin/bash %s\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' "$authority_path" >"$wdir/interpreter.unit"
	reason_w="$(gate_wiring_reason "$wdir/interpreter.unit")"
	if [ -z "$reason_w" ]; then
		st_case wiring-accepts-interpreter 'PASS the system interpreter (/usr/bash) + authority path accepted'
	else
		st_fail wiring-accepts-interpreter "must accept: $reason_w"
	fi
	printf '[Service]\nExecStartPre=verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/bypass-bare.unit"
	reason_w="$(gate_wiring_reason "$wdir/bypass-bare.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-bare-basename 'PASS bypass 1: bare verify-startup.sh rejected (systemd PATH resolution unprovable)'
	else
		st_fail wiring-rejects-bare-basename 'a bare basename must be rejected unless its resolution to the authority is provable'
	fi
	printf '[Service]\nExecStartPre=/bin/bash verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/bypass-interp-bare.unit"
	reason_w="$(gate_wiring_reason "$wdir/bypass-interp-bare.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-interpreter-bare 'PASS bypass 2: interpreter + bare verify-startup.sh rejected'
	else
		st_fail wiring-rejects-interpreter-bare 'an interpreter running a bare basename must be rejected'
	fi
	printf '[Service]\nExecStartPre=/opt/inert/tests/operations/verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/bypass-suffix.unit"
	reason_w="$(gate_wiring_reason "$wdir/bypass-suffix.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-suffix-decoy 'PASS bypass 3: an unrelated tree with the accepted path suffix rejected'
	else
		st_fail wiring-rejects-suffix-decoy 'a same-suffix path outside the repository authority must be rejected'
	fi
	printf '[Service]\nExecStartPre=/tmp/npm run verify:startup\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/bypass-fake-npm.unit"
	reason_w="$(gate_wiring_reason "$wdir/bypass-fake-npm.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-fake-npm 'PASS bypass 4: a fake npm runner (/tmp/npm) rejected even with a correct committed mapping'
	else
		st_fail wiring-rejects-fake-npm 'a fake npm executable must be rejected regardless of the mapping'
	fi
	printf '[Service]\nExecStartPre=./tests/operations/verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/unit-relative.unit"
	reason_w="$(gate_wiring_reason "$wdir/unit-relative.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-unit-relative 'PASS a relative script path in a unit Exec line rejected (no provable working directory)'
	else
		st_fail wiring-rejects-unit-relative 'a relative path in unit context must fail closed'
	fi
	printf '[Service]\nExecStartPre=/bin/sh -c "echo verify-startup.sh"\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/inert-echo-script.unit"
	reason_w="$(gate_wiring_reason "$wdir/inert-echo-script.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-echoed-script 'PASS the script name echoed inside a shell payload rejected (inert text, not execution)'
	else
		st_fail wiring-rejects-echoed-script 'an echoed script name inside a -c payload must be rejected'
	fi
	printf '[Service]\nExecStartPre=/bin/sh -c "echo verify:startup"\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/inert-echo-mapped.unit"
	reason_w="$(gate_wiring_reason "$wdir/inert-echo-mapped.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-echoed-mapped 'PASS the npm script name echoed inside a shell payload rejected'
	else
		st_fail wiring-rejects-echoed-mapped 'an echoed npm script name inside a -c payload must be rejected'
	fi
	printf '[Service]\nExecStartPre=/bin/true # verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/inert-comment.unit"
	reason_w="$(gate_wiring_reason "$wdir/inert-comment.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-comment 'PASS a comment/argument-position occurrence rejected'
	else
		st_fail wiring-rejects-comment 'a # -position occurrence must be rejected'
	fi
	printf '[Service]\nExecStartPre=/opt/inert/verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/decoy-path.unit"
	reason_w="$(gate_wiring_reason "$wdir/decoy-path.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-decoy-path 'PASS a same-basename path outside the accepted tests/operations location rejected'
	else
		st_fail wiring-rejects-decoy-path 'a decoy same-basename path must be rejected'
	fi
	printf '[Service]\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/notwired.unit"
	reason_w="$(gate_wiring_reason "$wdir/notwired.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-not-wired 'PASS a unit with no T013 reference rejected (journal markers alone are not execution proof)'
	else
		st_fail wiring-rejects-not-wired 'a unit not wired to T013 must be rejected'
	fi
	{
		printf '[Service]\n'
		printf 'ExecStartPre=/bin/sh -c "echo t013: [S1] PASS fabricated; echo t013: [S2] PASS fabricated"\n'
		printf 'ExecStart=/usr/bin/node ./dist/server/entry.mjs\n'
	} >"$wdir/fabricated.unit"
	reason_w="$(gate_wiring_reason "$wdir/fabricated.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-fabricated 'PASS a unit that only echoes fabricated marker text rejected'
	else
		st_fail wiring-rejects-fabricated 'a fabricated marker-only unit must be rejected by the wiring proof'
	fi
	if [ -n "$trusted_npm_path" ]; then
		printf '[Service]\nExecStartPre=%s run verify:startup\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' "$trusted_npm_path" >"$wdir/mapped.unit"
		reason_w="$(gate_wiring_reason "$wdir/mapped.unit")"
		if [ -z "$reason_w" ]; then
			st_case wiring-accepts-mapped 'PASS the npm this environment resolves, running the committed verify:startup mapping that itself resolves to the authority'
		else
			st_fail wiring-accepts-mapped "must accept via the trusted npm + committed mapping: $reason_w"
		fi
		ROOT="$ST_ROOT"
		printf '{ "scripts": { "verify:startup": "echo not-the-gate" } }\n' >"$ST_ROOT/package.json"
		reason_w="$(gate_wiring_reason "$wdir/mapped.unit")"
		if [ -n "$reason_w" ]; then
			st_case wiring-rejects-unmapped 'PASS the trusted-npm form rejected when the committed mapping does not resolve to the authority'
		else
			st_fail wiring-rejects-unmapped 'a mapping that does not resolve to the accepted script must be rejected'
		fi
		ROOT="$saved_root"
	fi

	# In-container wiring cases (Product Owner decision 2026-10-09): the
	# approved in-container startup gate invocation is recognized
	# structurally — trusted podman runner, expected container name,
	# intended image identity (exact tag or digest-pinned), and ONE sh -c
	# payload running the validated verify:startup mapping with the
	# standalone server strictly success-chained after it. Failure-ignoring
	# chains, decoys, floating tags, and unprovable runners are rejected.
	local trusted_podman_path='' reason_c=''
	trusted_podman_path="$(node -e '
		const fs = require("fs");
		const path = require("path");
		for (const dir of String(process.env.PATH || "").split(":").filter(Boolean)) {
			try { process.stdout.write(fs.realpathSync(path.join(dir, "podman"))); break; } catch {}
		}
	')"
	if [ -n "$trusted_podman_path" ]; then
		# (rework r2, finding 6) The fixture is written through a QUOTED heredoc
		# so the payload's 42 backticks and $q$ expressions survive as literal
		# data (an unquoted heredoc would perform command/variable substitution
		# and abort under set -u on the unset q); the trusted runner path is
		# injected afterwards by placeholder substitution that never evaluates
		# the payload, and the byte-preservation case below proves no expansion
		# happened at construction.
		cat >"$wdir/container-ok.unit" <<'UNIT'
[Service]
ExecStart=__T016_TRUSTED_PODMAN__ run --name systemd-%N --replace --rm -v songhealth-media:/app/media --publish 127.0.0.1:4321:4321 localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "grep -q ' /app/media ' /proc/mounts || { echo songhealth-app: required persistent media volume songhealth-media is not attached at /app/media - refusing to start >&2; exit 1; }; test -r /app/media/.songhealth-media-store || { echo songhealth-app: operator-managed existing media store marker .songhealth-media-store is missing at /app/media - the persistent store was not provisioned or has been replaced - refusing to start >&2; exit 1; }; IFS= read -r EMDASH_MIGRATION_DATABASE_URL </run/secrets/songhealth-migration-database-url; IFS= read -r EMDASH_ENCRYPTION_KEY </run/secrets/songhealth-encryption-key; export EMDASH_MIGRATION_DATABASE_URL EMDASH_ENCRYPTION_KEY; node -e 'const pg=require(`pg`);const c=new pg.Client({host:process.env.PGHOST,port:Number(process.env.PGPORT),database:process.env.PGDATABASE,user:process.env.PGUSER,password:process.env.PGPASSWORD,connectionTimeoutMillis:5000,query_timeout:5000});const fail=m=>{console.error(`songhealth-app: `+m);process.exit(1)};(async()=>{await c.connect();const r=await c.query(`select rolsuper s,rolcreatedb cd,rolcreaterole cr,has_database_privilege(current_user,current_database(),$q$CONNECT$q$) dbc,has_schema_privilege(current_user,$q$public$q$,$q$USAGE$q$) su,has_schema_privilege(current_user,$q$public$q$,$q$CREATE$q$) sc from pg_roles where rolname=current_user`);const b=r.rows[0];if(!b)fail(`least-privilege application-role prerequisite failed: the connecting role has no pg_roles row`);if(b.s)fail(`least-privilege application-role prerequisite failed: the connecting role is SUPERUSER - the bootstrap administrator is not the application identity`);if(b.cd)fail(`least-privilege application-role prerequisite failed: the connecting role has CREATEDB`);if(b.cr)fail(`least-privilege application-role prerequisite failed: the connecting role has CREATEROLE`);if(!b.dbc)fail(`least-privilege application-role prerequisite failed: the connecting role lacks CONNECT on the target database`);if(!b.su)fail(`least-privilege application-role prerequisite failed: the connecting role lacks USAGE on schema public`);if(!b.sc)fail(`least-privilege application-role prerequisite failed: the connecting role lacks CREATE on schema public`);const o=await c.query(`select case c.relkind when $q$S$q$ then $q$sequence$q$ else $q$table$q$ end kind,c.relname obj,pg_has_role(current_user,c.relowner,$q$USAGE$q$) owned,case c.relkind when $q$S$q$ then has_sequence_privilege(current_user,c.oid,$q$SELECT$q$) and has_sequence_privilege(current_user,c.oid,$q$USAGE$q$) and has_sequence_privilege(current_user,c.oid,$q$UPDATE$q$) else has_table_privilege(current_user,c.oid,$q$SELECT$q$) and has_table_privilege(current_user,c.oid,$q$INSERT$q$) and has_table_privilege(current_user,c.oid,$q$UPDATE$q$) and has_table_privilege(current_user,c.oid,$q$DELETE$q$) end dml from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ($q$r$q$,$q$p$q$,$q$S$q$) and n.nspname=$q$public$q$`);await c.end();for(const x of o.rows){const p=[];if(!x.owned)p.push(`not owned by the connecting role directly or through role membership`);if(!x.dml)p.push(`lacking effective required DML privileges`);if(p.length>0)fail(`least-privilege application-role prerequisite failed: existing EmDash `+x.kind+` `+x.obj+` in schema public is `+p.join(` and `))}console.error(`songhealth-app: least-privilege application-role prerequisite verified: non-superuser, no CREATEDB, no CREATEROLE, database CONNECT, schema public USAGE and CREATE, and `+o.rows.length+` existing EmDash relation(s) in schema public pass required ownership (direct or inherited) and full DML verification`)})().catch(e=>fail(`least-privilege application-role prerequisite failed: `+((e&&e.code)||`error`)))' && npm run verify:startup && HOST=0.0.0.0 exec node dist/server/entry.mjs"
UNIT
		sed -i "s|__T016_TRUSTED_PODMAN__|${trusted_podman_path}|" "$wdir/container-ok.unit"
		reason_c="$(gate_wiring_reason "$wdir/container-ok.unit")"
		if [ -z "$reason_c" ]; then
			st_case wiring-accepts-container 'PASS the full current T020 startup payload accepted (trusted runner, digest-pinned intended image, complete gate-before-server control flow)'
		else
			st_fail wiring-accepts-container "must accept the approved full container invocation: $reason_c"
		fi
		if grep -qF 'q$CONNECT$q$' "$wdir/container-ok.unit" && \
			[ "$(awk 'BEGIN{r=0} {r+=gsub(/`/,"`")} END{print r+0}' "$wdir/container-ok.unit")" -ge 40 ]; then
			st_case wiring-fixture-byte-preserved 'PASS the full-payload fixture preserved the literal node/SQL text (no substitution at construction)'
		else
			st_fail wiring-fixture-byte-preserved 'the fixture payload must be byte-preserved (backticks and $q$ literals intact)'
		fi
		cat >"$wdir/container-tag.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-songhealth-app --rm localhost/songhealth-app:0.0.1 sh -c "npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-tag.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-untagged 'PASS a bare-tag image token rejected — it cannot prove which image the deployment accepted'
		else
			st_fail wiring-rejects-container-untagged 'an undigest-pinned image token must be rejected'
		fi
		cat >"$wdir/container-semi.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "npm run verify:startup; node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-semi.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-failure-ignoring 'PASS a failure-ignoring chain between gate and server rejected'
		else
			st_fail wiring-rejects-container-failure-ignoring 'a chain that starts the server regardless of gate failure must be rejected'
		fi
		cat >"$wdir/container-tail-bypass.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "npm run verify:startup && exec node dist/server/entry.mjs || true; exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-tail-bypass.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-tail-bypass 'PASS a trailing failure bypass after the server start rejected (commands after the server entry token)'
		else
			st_fail wiring-rejects-container-tail-bypass 'a payload that relaunches the server after a failed gate must be rejected'
		fi
		cat >"$wdir/container-nosep.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "npm run verify:startup node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-nosep.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-no-separator 'PASS a gate invocation with no success separator (server as mere arguments) rejected'
		else
			st_fail wiring-rejects-container-no-separator 'arguments masquerading as a chain must be rejected'
		fi
		cat >"$wdir/container-fn-shadow.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "npm() { return 0; }; npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-fn-shadow.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-fn-shadow 'PASS a shell function definition shadowing npm rejected (complete-prefix control)'
		else
			st_fail wiring-rejects-container-fn-shadow 'a function definition that neutralizes the gate must be rejected'
		fi
		cat >"$wdir/container-cd.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "cd /tmp; npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-cd.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-cd 'PASS a directory change before the gate rejected (working-directory redirect)'
		else
			st_fail wiring-rejects-container-cd 'a cd prefix that redirects gate execution must be rejected'
		fi
		cat >"$wdir/container-subst.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "X=\`cat /etc/hostname\`; npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-subst.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-substitution 'PASS an unquoted command substitution in the prefix rejected'
		else
			st_fail wiring-rejects-container-substitution 'unquoted command substitution can redirect execution and must be rejected'
		fi
		cat >"$wdir/container-eval-shadow.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "eval 'npm() { return 0; }'; npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-eval-shadow.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-eval-shadow 'PASS a quoted eval defining a shadow function rejected (positive executable whitelist)'
		else
			st_fail wiring-rejects-container-eval-shadow 'an eval prefix that neutralizes the gate must be rejected'
		fi
		cat >"$wdir/container-group-eval.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "{ eval 'npm() { return 0; }'; }; npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-group-eval.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-group-eval 'PASS a grouped eval shadowing the gate rejected (payload must be byte-equal to the accepted T020 payload)'
		else
			st_fail wiring-rejects-container-group-eval 'a guard-group body that neutralizes the gate must be rejected'
		fi
		reason_c="$(gate_wiring_reason "$wdir/container-ok.unit")"
		if [ -z "$reason_c" ]; then
			st_case wiring-accepts-container-approved-payload 'PASS the accepted T020 startup payload is the positive authority (byte-equal, dispatched)'
		else
			st_fail wiring-accepts-container-approved-payload "the full accepted payload must be accepted: $reason_c"
		fi
		sed "s|rolsuper s|rolsuper x|" "$wdir/container-ok.unit" >"$wdir/container-altered-role.unit"
		reason_c="$(gate_wiring_reason "$wdir/container-altered-role.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-altered-role 'PASS an altered role-check program rejected (any byte difference from the accepted payload)'
		else
			st_fail wiring-rejects-container-altered-role 'an altered approved-command argument must be rejected'
		fi

	# Caller-dispatch demonstrations (rework r2, finding 1): the accepted
	# wiring FORM must survive into the caller and actually dispatch the
	# runtime identity binding for the container form — matching identity
	# completes, mismatching identity fails closed — through the shimmed
	# podman, never a real engine.
	cp "$wdir/container-ok.unit" "$ST_ROOT/fx-unit"
	printf '%s\n' 'localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407' >"$ST_ROOT/fx-podman-image"
	sha256sum "$ROOT/tests/operations/verify-startup.sh" | awk '{print $1 "  /app/tests/operations/verify-startup.sh"}' >"$ST_ROOT/fx-podman-sums"
	sha256sum "$ROOT/package.json" | awk '{print $1 "  /app/package.json"}' >>"$ST_ROOT/fx-podman-sums"
	: >"$ST_ROOT/podman.log"
	local dispatch_rc=0
	require_gate_wiring_for_unit C1-dispatch >/dev/null 2>"$ST_ROOT/dispatch.err" || dispatch_rc=$?
	if [ "$dispatch_rc" -eq 0 ] &&
		grep -q 'container inspect' "$ST_ROOT/podman.log" &&
		grep -q 'sha256sum /app/tests/operations/verify-startup.sh' "$ST_ROOT/podman.log"; then
		st_case dispatch-container-identity-matching 'PASS the container form dispatched the runtime identity binding (actual image identity + in-container source digests verified, matching)'
	else
		st_fail dispatch-container-identity-matching "the dispatch must run and verify matching identities (rc=$dispatch_rc)"
	fi
	printf '%s\n' 'localhost/songhealth-app:0.0.1@sha256:1111111111111111111111111111111111111111111111111111111111111111' >"$ST_ROOT/fx-podman-image"
	# (rework r3, finding 6) fail_stage exits; an expected negative dispatch
	# must run in an isolated child shell so only the child terminates and
	# the || observes its status - the production fail_stage behavior is
	# unchanged.
	dispatch_rc=0
	( require_gate_wiring_for_unit C1-mismatch >/dev/null 2>"$ST_ROOT/dispatch.err" ) || dispatch_rc=$?
	if [ "$dispatch_rc" -ne 0 ] && grep -q 'does not equal the effective unit pinned identity' "$ST_ROOT/dispatch.err"; then
		st_case dispatch-container-identity-mismatch 'PASS a mismatching deployed image identity fails the stage closed through the dispatched binding'
	else
		st_fail dispatch-container-identity-mismatch "the dispatch must fail closed on identity mismatch (rc=$dispatch_rc)"
	fi
	# A host-form unit must NOT trigger the container identity dispatch.
	cp "$wdir/direct.unit" "$ST_ROOT/fx-unit"
	: >"$ST_ROOT/podman.log"
	dispatch_rc=0
	require_gate_wiring_for_unit C1-hostform >/dev/null 2>&1 || dispatch_rc=$?
	if [ ! -s "$ST_ROOT/podman.log" ]; then
		st_case dispatch-host-form-no-binding 'PASS the host form does not dispatch the container identity binding'
	else
		st_fail dispatch-host-form-no-binding 'the identity binding must not run for host-form wiring'
	fi
	rm -f "$ST_ROOT/fx-unit" "$ST_ROOT/fx-podman-image" "$ST_ROOT/fx-podman-sums"
		cat >"$wdir/container-overmount.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm -v songhealth-media:/app/media -v decoy-gate:/app/tests localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-overmount.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-overmount 'PASS an execution override mounting a destination other than the media target rejected (gate-shadowing defense)'
		else
			st_fail wiring-rejects-container-overmount 'an overmount that could shadow the in-container gate identity must be rejected'
		fi
		cat >"$wdir/container-echo.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "echo npm run verify:startup; node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-echo.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-echo-decoy 'PASS the gate names echoed as arguments (not command position) rejected'
		else
			st_fail wiring-rejects-container-echo-decoy 'an echoed gate invocation must be rejected'
		fi
		cat >"$wdir/container-quoted-decoy.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "echo \"npm run verify:startup\"; node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-quoted-decoy.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-quoted-decoy 'PASS the gate names inside a quoted string rejected as inert decoy text'
		else
			st_fail wiring-rejects-container-quoted-decoy 'a quoted-string occurrence must be rejected as inert text'
		fi
		cat >"$wdir/container-latest.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:latest sh -c "npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-latest.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-latest 'PASS a floating latest image tag rejected'
		else
			st_fail wiring-rejects-container-latest 'a floating latest tag must be rejected'
		fi
		cat >"$wdir/container-wrong-image.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm example.com/other/app:1.0.0 sh -c "npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-wrong-image.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-wrong-image 'PASS an unintended image identity rejected'
		else
			st_fail wiring-rejects-container-wrong-image 'an image outside the intended identity must be rejected'
		fi
		cat >"$wdir/container-bare-podman.unit" <<UNIT
[Service]
ExecStart=podman run --name systemd-%N --rm localhost/songhealth-app:0.0.1 sh -c "npm run verify:startup && exec node dist/server/entry.mjs"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-bare-podman.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-bare-podman 'PASS a bare podman runner rejected (unprovable executable identity)'
		else
			st_fail wiring-rejects-container-bare-podman 'a bare runner must be rejected as unprovable'
		fi
		cat >"$wdir/container-server-first.unit" <<UNIT
[Service]
ExecStart=${trusted_podman_path} run --name systemd-%N --rm localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407 sh -c "node dist/server/entry.mjs & npm run verify:startup"
UNIT
		reason_c="$(gate_wiring_reason "$wdir/container-server-first.unit")"
		if [ -n "$reason_c" ]; then
			st_case wiring-rejects-container-server-first 'PASS a payload that starts the server before (or parallel to) the gate rejected'
		else
			st_fail wiring-rejects-container-server-first 'the server must start only after successful gate completion'
		fi
	else
		st_fail wiring-podman-resolution 'could not resolve a trusted podman in this environment for the in-container positive controls'
	fi

	# Case 9 — the ordered completion-marker predicate.
	local jdir="$ST_ROOT/journal" jfile='' marker='' rc_m=0
	mkdir -p "$jdir"
	jfile="$jdir/inorder.log"
	: >"$jfile"
	printf 'systemd: starting application unit\n' >>"$jfile"
	for marker in "${GATE_STAGE_MARKERS[@]}"; do
		printf '%s gate stage completed\n' "$marker" >>"$jfile"
		printf 'interleaved application log line\n' >>"$jfile"
	done
	printf '%s\n' "$GATE_BANNER" >>"$jfile"
	if gate_markers_present "$jfile"; then
		st_case markers-accept-ordered 'PASS the full stage sequence in ascending order with the banner last accepted'
	else
		st_fail markers-accept-ordered 'an ascending complete marker sequence must be accepted'
	fi
	jfile="$jdir/fabricated-inorder.log"
	: >"$jfile"
	for marker in "${GATE_STAGE_MARKERS[@]}"; do
		printf '%s fabricated\n' "$marker" >>"$jfile"
	done
	printf '%s fabricated\n' "$GATE_BANNER" >>"$jfile"
	rc_m=0
	gate_markers_present "$jfile" || rc_m=$?
	if [ "$rc_m" -eq 0 ]; then
		st_case markers-accept-fabricated-text 'PASS marker predicate accepts fabricated in-order text BY DESIGN — the wiring proof (case 8) is what rejects it, which is why C1 always requires both'
	else
		st_fail markers-accept-fabricated-text 'unexpected: the marker predicate should accept fabricated in-order text; the wiring proof is the rejecting leg'
	fi
	jfile="$jdir/outoforder.log"
	: >"$jfile"
	printf '%s\n' "$GATE_BANNER" >>"$jfile"
	for marker in "${GATE_STAGE_MARKERS[@]}"; do
		printf '%s emitted\n' "$marker" >>"$jfile"
	done
	rc_m=0
	gate_markers_present "$jfile" || rc_m=$?
	if [ "$rc_m" -ne 0 ]; then
		st_case markers-reject-out-of-order 'PASS banner-before-stages ordering rejected'
	else
		st_fail markers-reject-out-of-order 'out-of-order marker sequences must be rejected'
	fi
	jfile="$jdir/swapped.log"
	{
		printf '%s emitted\n' "${GATE_STAGE_MARKERS[1]}"
		printf '%s emitted\n' "${GATE_STAGE_MARKERS[0]}"
		printf '%s\n' "$GATE_BANNER"
	} >>"$jfile"
	rc_m=0
	gate_markers_present "$jfile" || rc_m=$?
	if [ "$rc_m" -ne 0 ]; then
		st_case markers-reject-swapped 'PASS swapped stage order rejected'
	else
		st_fail markers-reject-swapped 'swapped stage order must be rejected'
	fi
	jfile="$jdir/missing.log"
	{
		for marker in "${GATE_STAGE_MARKERS[@]:0:3}" "${GATE_STAGE_MARKERS[@]:4}"; do
			printf '%s emitted\n' "$marker"
		done
		printf '%s\n' "$GATE_BANNER"
	} >>"$jfile"
	rc_m=0
	gate_markers_present "$jfile" || rc_m=$?
	if [ "$rc_m" -ne 0 ]; then
		st_case markers-reject-missing 'PASS a missing stage marker rejected'
	else
		st_fail markers-reject-missing 'a sequence with a missing stage must be rejected'
	fi

	rm -rf "$ST_ROOT"
	if [ "$ST_FAILURES" -eq 0 ]; then
		printf 't016-selftest: all %s demonstration(s) passed\n' "$ST_PASSES"
		return 0
	fi
	printf 't016-selftest: %s of %s demonstration(s) FAILED\n' "$ST_FAILURES" "$((ST_PASSES + ST_FAILURES))" >&2
	return 1
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

main() {
	local action="${1:-}"
	if [ "$#" -gt 0 ]; then
		case $action in
		-h | --help | help)
			usage
			return 0
			;;
		--self-test)
			# Isolated failure-path demonstrations (see the self_test
			# header); touches no real deployment, unit, or Quadlet.
			if self_test; then
				return 0
			fi
			exit "$EXIT_FAIL"
			;;
		*)
			usage >&2
			die "$EXIT_USAGE" "unexpected argument(s): $* (this harness takes no positional arguments; supported: --help, --self-test)"
			;;
		esac
	fi

	ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
	cd "$ROOT"

	TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/t016-foundation-verify.XXXXXX")"
	trap on_exit EXIT
	trap 'on_signal 130' INT
	trap 'on_signal 143' TERM

	# P0 — RED prerequisite, before any tool requirement or input need, so a
	# bare run at a baseline without the T017–T020 implementation always
	# fails for exactly that bounded, deployment-attributable reason.
	check_deployment_definitions

	require_tools
	info main 'node %s, podman %s, %s' \
		"$(node --version)" \
		"$(podman version --format '{{.Client.Version}}' 2>/dev/null || echo unknown)" \
		"$(systemctl --version 2>/dev/null | head -1 || echo 'systemd (version unknown)')"
	validate_inputs
	derive_gate_markers
	info main 'T013 gate evidence anchored on %s: %s stage markers + banner [%s]' \
		"$T013_SCRIPT" "${#GATE_STAGE_MARKERS[@]}" "${GATE_STAGE_MARKERS[*]} $GATE_BANNER"

	# R1 — resolve and validate every task-owned target before any mutation.
	resolve_targets

	# C1 — startup acceptance before READY + private non-mutating readiness.
	# Wiring proof first (live, on the effective unit definition), then the
	# invocation-scoped ordered completion evidence; together they tie the
	# accepted evidence to T013 actually executing on this start.
	require_gate_wiring_for_unit C1
	require_gate_evidence_for_current_start C1
	check_recurring_readiness_private

	# C2/C3/C4 — network boundary, no published database port, attachments.
	check_private_network
	check_no_published_db_port
	check_volume_attachments

	# C5 — canonical integrity baseline before any lifecycle mutation.
	integrity_checkpoint baseline

	# C6 — exactly three consecutive lifecycle cycles.
	local cycle
	for cycle in 1 2 3; do
		lifecycle_cycle "$cycle"
	done
	pass C6 'exactly three consecutive lifecycle cycles completed with 100%% retention of the canonical validation state'

	# C7 — missing-attachment negative with guarded restore.
	check_missing_attachment_negative

	# C8 — final integrity, retained volumes, and wrap-up.
	probe_readiness
	if [ "$READINESS_STATE" != 'ready' ]; then
		fail_stage C8 'final readiness is %s (%s)' "$READINESS_STATE" "$READINESS_LINE"
	fi
	volumes_retained_check C8
	integrity_checkpoint final
	pass C8 'final state verified: ready, both persistent volumes retained, canonical tagline and media intact'

	printf 't016: ================================================================\n'
	printf 't016: T016 production foundation verification: PASS\n'
	printf 't016: T013 startup gate evidenced before ready; private non-mutating readiness proven\n'
	printf 't016: private network access, no published database port, and volume attachments verified\n'
	printf 't016: three lifecycle cycles + missing-attachment negative passed with full integrity retention\n'
	printf 't016: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')"
	printf 't016: ================================================================\n'
}

main "$@"
