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
#        executes) must invoke the accepted T013 authority, directly (an
#        Exec command line naming tests/operations/verify-startup.sh) or
#        through the committed package.json `verify:startup` mapping (which
#        must itself map to the accepted script); and (b) COMPLETION — the
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
#        must produce the REQUIRED EXPLICIT recurring-readiness result:
#        `not-ready` identifying the affected media dependency by its safe
#        dependency name (spec US2 scenario 3; data-model sections 4-5). A
#        failed unit or an unreachable readiness helper is NOT an acceptable
#        substitute and fails the stage, as does any ready result (a healthy
#        empty replacement). The omission is simulated WITHOUT deleting or
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
effective unit definition + invocation-scoped, ordered completion markers) +
private non-mutating recurring readiness -> C2 private network +
app-to-database access ->
C3 no published PostgreSQL host port -> C4 persistent volume attachments ->
C5 canonical tagline/media integrity baseline -> C6 three lifecycle cycles
-> C7 missing-attachment negative (requires the explicit not-ready result
naming the media dependency; guarded, checksum-verified, fail-closed
restore) -> C8 final integrity and no-residue wrap-up.

Required environment inputs (see the script header for the full input
reference): SONGHEALTH_APP_ORIGIN, SONGHEALTH_VALIDATION_TOKEN,
SONGHEALTH_VALIDATION_MEDIA_PATH. Topology names default to the approved
plan structure and may be overridden (SONGHEALTH_APP_UNIT,
SONGHEALTH_DB_UNIT, SONGHEALTH_APP_CONTAINER, SONGHEALTH_DB_CONTAINER,
SONGHEALTH_NETWORK, SONGHEALTH_DB_VOLUME, SONGHEALTH_MEDIA_VOLUME,
SONGHEALTH_DB_MOUNT_TARGET, SONGHEALTH_MEDIA_MOUNT_TARGET,
SONGHEALTH_READINESS_COMMAND, SONGHEALTH_APP_QUADLET).

The harness never touches the development database resources
(songhealth-dev-db, songhealth-dev-db-data) or the host media tree, never
deletes or recreates a volume, and restores any transient attachment
omission on every exit path; an unverified restore preserves the recovery
copy and the scratch directory and exits nonzero.

  --self-test  Run isolated failure-path demonstrations of the guarded
               restore/cleanup branches, the missing-attachment readiness
               acceptance, and the non-mutation detector, entirely against
               scratch files under a shimmed systemctl. Touches no real
               deployment, unit, or Quadlet; exits 0 only when every
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
	# T013 authority — an Exec command line (ExecStart/ExecStartPre/
	# ExecStartPost/ExecCondition) naming the accepted script
	# (verify-startup.sh), directly or through the committed package.json
	# `verify:startup` mapping when that mapping actually resolves to the
	# accepted script — and otherwise prints the actionable rejection
	# reason. This is the live WIRING half of the execution proof: journal
	# marker text alone (which can be fabricated) is never accepted without
	# it. Kept as a pure reasoner over unit-definition text (exactly what
	# `systemctl --user cat` yields) so the --self-test demonstrations
	# exercise the identical logic, including the negative cases.
	local unit_file="$1"
	local exec_lines=''
	exec_lines="$(grep -E '^(ExecStart|ExecStartPre|ExecStartPost|ExecCondition)=' "$unit_file" 2>/dev/null || true)"
	if [ -z "$exec_lines" ]; then
		printf 'the effective unit definition declares no Exec command line (ExecStart/ExecStartPre/ExecStartPost/ExecCondition) to inspect for the startup-gate wiring'
		return 0
	fi
	if printf '%s\n' "$exec_lines" | grep -Fq -- 'verify-startup.sh'; then
		printf ''
		return 0
	fi
	if printf '%s\n' "$exec_lines" | grep -Fq -- 'verify:startup'; then
		local mapped=''
		mapped="$(node -e '
			const fs = require("fs");
			const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
			const command = pkg && pkg.scripts ? pkg.scripts["verify:startup"] : undefined;
			process.stdout.write(typeof command === "string" && command.includes("verify-startup.sh") ? "mapped" : "unmapped");
		' "$ROOT/package.json" 2>/dev/null || true)"
		if [ "$mapped" = 'mapped' ]; then
			printf ''
			return 0
		fi
		printf 'the unit invokes the verify:startup npm script, but the committed package.json does not map verify:startup to the accepted T013 script %s' \
			"$T013_SCRIPT"
		return 0
	fi
	printf 'no Exec command line in the effective unit definition invokes the accepted T013 authority (%s directly, or via the package.json verify:startup mapping); journal marker text alone is not execution proof' \
		"$T013_SCRIPT"
	return 0
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
	reason="$(gate_wiring_reason "$unit_file")"
	if [ -n "$reason" ]; then
		fail_stage "$label" '%s' "$reason"
	fi
	info "$label" 'the effective unit definition of %s provably invokes the accepted T013 authority (%s direct / package.json verify:startup mapping)' \
		"$APP_UNIT" "$T013_SCRIPT"
	pass "$label" 'T013 startup-gate wiring proven on the effective application unit definition'
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

c7_negative_result_reason() {
	# c7_negative_result_reason <readiness-output-file>: prints '' (empty)
	# when the observed negative-state readiness result is EXACTLY the
	# required bounded outcome — an explicit `not-ready` whose output
	# identifies the affected media dependency by its safe dependency name —
	# and otherwise prints the actionable rejection reason. Kept as a pure
	# reasoner (no exit, no side effects) so the --self-test demonstrations
	# exercise the identical logic on synthetic states. A failed or
	# unreachable platform is deliberately NOT accepted: spec US2 scenario 3
	# and data-model sections 4-5 require the readiness check itself to
	# report not-ready and name the dependency.
	local out_file="$1"
	case $READINESS_STATE in
	not-ready) ;;
	ready)
		printf 'the platform reported READY with the expected media persistence attachment missing — a missing attachment must report not-ready and must never appear as a healthy empty replacement'
		return 0
		;;
	leaked)
		printf 'the readiness output exposed a configured secret value (value never printed); readiness output must be redacted in every state'
		return 0
		;;
	*)
		printf 'the platform did not produce the required explicit not-ready readiness result (readiness state: %s; %s) — a failed or unreachable platform is not a substitute: the readiness check itself must report not-ready and identify the affected media dependency' \
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
	# container to finish starting). Whatever the unit state, the ONLY
	# accepted outcome is the explicit not-ready result naming media —
	# enforced below by the shared reasoner; unit failure or unreachability
	# is not a substitute.
	local waited=0 unit_state=''
	while [ "$waited" -lt "$NEGATIVE_SETTLE_SECONDS" ]; do
		unit_state="$(systemctl --user is-active "$APP_UNIT" 2>/dev/null || true)"
		probe_readiness
		case $READINESS_STATE in
		ready | not-ready | leaked) break ;;
		esac
		sleep "$POLL_SECONDS"
		waited=$((waited + POLL_SECONDS))
	done
	info C7 'with the expected media attachment omitted: unit state %s, readiness %s (%s)' \
		"${unit_state:-unknown}" "$READINESS_STATE" "$READINESS_LINE"

	local reject_reason=''
	reject_reason="$(c7_negative_result_reason "$TMP_DIR/readiness.out")"
	if [ -n "$reject_reason" ]; then
		fail_stage C7 '%s' "$reject_reason"
	fi

	# Persistent state untouched by the omission: both volumes still exist
	# and the named-volume set is unchanged (no empty replacement store was
	# created anywhere).
	volumes_retained_check C7
	pass C7 'missing expected persistence attachment produced the required explicit not-ready result identifying the media dependency (%s); no healthy empty replacement and no persistent-state mutation' \
		"$READINESS_LINE"

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
	# self-test.
	mkdir -p "$ST_ROOT/bin"
	cat >"$ST_ROOT/bin/systemctl" <<SHIM
#!/usr/bin/env bash
printf '%s\n' "\$*" >>'$ST_ROOT/systemctl.log'
exit 0
SHIM
	chmod +x "$ST_ROOT/bin/systemctl"
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
	READINESS_STATE=''
	READINESS_LINE=''

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
	# definition that provably invokes the accepted T013 authority.
	local wdir="$ST_ROOT/wiring" reason_w='' saved_root="$ROOT"
	mkdir -p "$wdir"
	printf '[Service]\nExecStartPre=/app/tests/operations/verify-startup.sh\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/direct.unit"
	reason_w="$(gate_wiring_reason "$wdir/direct.unit")"
	if [ -z "$reason_w" ]; then
		st_case wiring-accepts-direct 'PASS an Exec line naming verify-startup.sh accepted'
	else
		st_fail wiring-accepts-direct "must accept: $reason_w"
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
	printf '[Service]\nExecStartPre=/bin/sh -c "npm run verify:startup"\nExecStart=/usr/bin/node ./dist/server/entry.mjs\n' >"$wdir/mapped.unit"
	reason_w="$(gate_wiring_reason "$wdir/mapped.unit")"
	if [ -z "$reason_w" ]; then
		st_case wiring-accepts-mapped 'PASS the verify:startup npm form accepted because the committed package.json maps it to verify-startup.sh'
	else
		st_fail wiring-accepts-mapped "must accept via the committed mapping: $reason_w"
	fi
	ROOT="$ST_ROOT"
	printf '{ "scripts": { "verify:startup": "echo not-the-gate" } }\n' >"$ST_ROOT/package.json"
	reason_w="$(gate_wiring_reason "$wdir/mapped.unit")"
	if [ -n "$reason_w" ]; then
		st_case wiring-rejects-unmapped 'PASS the verify:startup form rejected when package.json does not map it to the accepted script'
	else
		st_fail wiring-rejects-unmapped 'an unmapped verify:startup reference must be rejected'
	fi
	ROOT="$saved_root"

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
