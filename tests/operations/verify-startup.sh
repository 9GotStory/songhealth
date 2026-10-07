#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth startup-acceptance gate (Feature 001, T013).
#
# The distinct deployment/startup acceptance gates from tasks.md T013 (User
# Story 1): before an environment may be accepted as ready for use, this gate
# proves — against the migration manifest emitted by the exact application
# build — the native EmDash migration sequence and the writeability of the
# stable media mount. It is deliberately SEPARATE from the T012 recurring
# readiness helper: normal recurring readiness (scripts/verify-readiness.mjs)
# stays private, repeatable, and non-mutating, while this gate is the one-time
# deployment/startup acceptance that may apply migrations and may write a
# bounded disposable media probe file. Any failure here blocks startup
# acceptance; the recurring helper is never turned into a mutating probe and is
# not modified by this gate.
#
# Steps (all fail closed; only exit 0 is PASS):
#
#   S1  validate the native runtime/migration inputs and prove — comparing
#       non-secret identity components only (host, port, database, user) —
#       that the PG* application inputs and EMDASH_MIGRATION_DATABASE_URL
#       identify the same intended database, before anything else runs
#   S2  build the exact application (astro build) so the native
#       .emdash/migrations.json manifest is emitted by this exact build (a
#       stale manifest is removed first; the manifest is consumed strictly as
#       emitted and is never synthesized, mirrored, or hand-edited), then
#       verify its identity fields, secret-freeness, and checksum
#   S3  inspect the intended target with `emdash migrate --status --json`
#       (no mutation), derive the actual target fingerprint from that
#       inspection, prove the reported target label agrees with the PG*
#       identity, and reject an invalid or unknown migration state
#   S4  apply pending native migrations with plain `emdash migrate` carrying
#       the required non-interactive --expected-target-fingerprint safety
#       value derived from the S3 inspection, then re-inspect the target and
#       require zero pending and zero unknown migrations
#   S5  verify the resulting state with `emdash migrate --check` (exit 0
#       means nothing pending and nothing unknown; it applies nothing)
#   S6  probe the stable ./media mount with one unique bounded disposable
#       file: create/write known bytes, read them back and compare, then
#       remove the probe and prove no residue remains. A missing mount (this
#       gate never creates ./media), an unwritable mount, a content mismatch,
#       or a failed cleanup fails acceptance
#
# Inputs come from the environment (never committed). Supply them from the
# ignored .env file, e.g.:
#
#   set -a; . ./.env; set +a; npm run verify:startup
#
# Required inputs (see .env.example): PGHOST, PGPORT, PGDATABASE, PGUSER,
# PGPASSWORD, EMDASH_MIGRATION_DATABASE_URL, EMDASH_SITE_URL, HOST, PORT,
# EMDASH_ENCRYPTION_KEY. The database target must already be reachable and
# the stable ./media mount must already exist: this gate proves migration
# state and media writeability, it does not create or manage database or
# media resources (development uses the T005 controls and an existing media
# directory; production maps persistent volumes to the same paths).
#
# The gate is idempotent and independently repeatable: against a database
# that already has every migration applied, the inspection reports nothing
# pending, the native apply is a verified no-op, --check still proves the
# clean state, and the media probe always removes its own disposable file.
# Nothing is deleted, reinitialized, or replaced by this gate.
#
# Secret safety: this script never prints PGPASSWORD, the migration URL, the
# encryption key, or any other secret value. Errors and diagnostics name the
# missing or mismatching field/resource only, identity evidence prints only
# the documented non-secret components (host, port, database, user), and any
# captured command output is scrubbed of the known secret values before it is
# printed.
#
# Exit codes: 0 PASS | 1 FAIL (any gate step) | 2 environment error |
# 4 missing or invalid input | 64 usage error.

set -euo pipefail

readonly EXIT_FAIL=1
readonly EXIT_ENV=2
readonly EXIT_CONFIG=4
readonly EXIT_USAGE=64

# Bounded waits so the gate can never hang (seconds).
readonly BUILD_TIMEOUT_SECONDS=900
readonly EMDASH_CMD_TIMEOUT_SECONDS=600

# Migration connection variable NAME the native manifest must record
# (set for the PostgreSQL adapter in the accepted astro.config.mjs).
readonly EXPECTED_MIGRATION_ENV_NAME='EMDASH_MIGRATION_DATABASE_URL'

# The stable application media mount path (blueprint §20.1): native EmDash
# local-media storage path, resolved at the application root this gate runs
# from. Never runtime-configured, and never created by this gate.
readonly MEDIA_MOUNT_PATH='media'

# Set while the gate runs.
ROOT=''
TMP_DIR=''
PROBE_FILE=''

usage() {
	cat <<'EOF'
Usage: tests/operations/verify-startup.sh

T013 startup-acceptance gate: prove, before the environment is accepted
as ready for use, that the exact application build's native migration
manifest drives a clean native migration sequence against the intended
PostgreSQL target and that the stable ./media mount is writable.

Sequence: input validation and PG*/migration-URL identity agreement ->
exact application build emitting the native .emdash/migrations.json
(identity + secret-freeness + checksum asserts) -> emdash migrate
--status --json target inspection, fingerprint derivation, and
invalid/unknown-state rejection -> non-interactive emdash migrate apply
with --expected-target-fingerprint -> post-apply re-inspection ->
emdash migrate --check -> bounded disposable media write/read/remove
probe against ./media with a no-residue proof.

The database target must already be reachable and ./media must already
exist; this gate creates and manages no database or media resource. It
is repeatable: an already-migrated database makes the apply a verified
no-op, and the media probe always removes its own file.

Provide all required inputs in the environment (see .env.example), e.g.:
  set -a; . ./.env; set +a; npm run verify:startup

Exit codes: 0 PASS | 1 FAIL | 2 environment error | 4 missing/invalid
input | 64 usage error.
EOF
}

die() {
	# die <exit-code> <message...>
	local code="$1"
	shift
	printf 't013: %s\n' "$*" >&2
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]
	local name="$1" status="$2"
	shift 2
	printf 't013: [%s] %s ' "$name" "$status"
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$@"
	printf '\n'
}

pass() { step "$1" PASS "${@:2}"; }
info() { step "$1" INFO "${@:2}"; }

fail_gate() {
	# fail_gate <step-name> <printf-format> [args...]
	local name="$1"
	shift
	printf 't013: [%s] FAIL ' "$name" >&2
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
		const names = ["PGPASSWORD", "EMDASH_MIGRATION_DATABASE_URL", "EMDASH_ENCRYPTION_KEY"];
		const values = names.map((n) => process.env[n]).filter((v) => typeof v === "string" && v.length >= 4);
		let data = "";
		process.stdin.on("data", (c) => (data += c));
		process.stdin.on("end", () => {
			for (const value of values) data = data.replaceAll(value, "[REDACTED]");
			process.stdout.write(data);
		});
	'
}

print_tail() {
	# print_tail <label> <file> [lines]: scrubbed bounded tail for diagnosis.
	local label="$1" file="$2" lines="${3:-15}"
	if [ -s "$file" ]; then
		printf 't013: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't013: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Cleanup: the temporary directory and — above all — any media probe residue.
# ---------------------------------------------------------------------------

cleanup() {
	if [ -n "$PROBE_FILE" ] && [ -e "$PROBE_FILE" ]; then
		# A failure between the probe write and its planned removal lands
		# here; no probe residue may survive this gate either way.
		if rm -f "$PROBE_FILE" 2>/dev/null && [ ! -e "$PROBE_FILE" ]; then
			step cleanup INFO 'removed leftover media probe file after a failed step (no residue remains)'
		else
			step cleanup WARN 'leftover media probe file could not be removed; remove it manually: %s' "$PROBE_FILE"
		fi
		PROBE_FILE=''
	fi
	if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
		rm -rf "$TMP_DIR"
	fi
}

# ---------------------------------------------------------------------------
# S1 — inputs and identity agreement (before anything else runs)
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in node npm npx sha256sum timeout; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
}

validate_inputs() {
	local missing=()
	local var
	for var in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD \
		EMDASH_MIGRATION_DATABASE_URL EMDASH_SITE_URL HOST PORT EMDASH_ENCRYPTION_KEY; do
		if [ -z "${!var:-}" ]; then
			missing+=("$var")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		printf 't013: [S1] FAIL missing required input(s): %s\n' "${missing[*]}" >&2
		printf 't013: [S1] provide the documented native inputs in the environment; see .env.example, e.g. set -a; . ./.env; set +a\n' >&2
		exit "$EXIT_CONFIG"
	fi

	case $PGPORT in
	*[!0-9]*)
		die "$EXIT_CONFIG" "PGPORT must be a TCP port number; the current value is not numeric"
		;;
	esac
	local pgport_value=$((10#$PGPORT))
	if [ "$pgport_value" -lt 1 ] || [ "$pgport_value" -gt 65535 ]; then
		die "$EXIT_CONFIG" "PGPORT is outside the valid TCP port range 1-65535"
	fi
}

migration_url_identity() {
	# Prints the non-secret identity components of EMDASH_MIGRATION_DATABASE_URL
	# as "<key> <value>" lines (host, port, database, user). The URL itself —
	# including its password — is read inside the node process from the
	# environment and never appears on a command line or in output. Parsing
	# mirrors the native EmDash 1.1.0 postgres migration executor: postgres or
	# postgresql scheme, port defaulting to 5432, no percent-decoding.
	node -e '
		const url = process.env.EMDASH_MIGRATION_DATABASE_URL;
		let parsed;
		try {
			parsed = new URL(url);
		} catch {
			console.error("EMDASH_MIGRATION_DATABASE_URL is not a valid URL");
			process.exit(4);
		}
		if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
			console.error("EMDASH_MIGRATION_DATABASE_URL must use the postgres:// or postgresql:// scheme");
			process.exit(4);
		}
		const database = parsed.pathname.slice(1);
		if (!parsed.hostname || !database) {
			console.error("EMDASH_MIGRATION_DATABASE_URL must identify a host and a database");
			process.exit(4);
		}
		process.stdout.write(
			`host ${parsed.hostname}\nport ${parsed.port || "5432"}\ndatabase ${database}\nuser ${parsed.username}\n`,
		);
	' || die "$EXIT_CONFIG" 'EMDASH_MIGRATION_DATABASE_URL is malformed'
}

check_identity_agreement() {
	local identity_file="$1"
	local url_host='' url_port='' url_database='' url_user='' key value
	while IFS=' ' read -r key value; do
		case $key in
		host) url_host="$value" ;;
		port) url_port="$value" ;;
		database) url_database="$value" ;;
		user) url_user="$value" ;;
		esac
	done <"$identity_file"

	local mismatches=()
	if [ "$url_host" != "$PGHOST" ]; then
		mismatches+=('host (PGHOST vs EMDASH_MIGRATION_DATABASE_URL)')
	fi
	if [ "$url_port" != "$PGPORT" ]; then
		mismatches+=('port (PGPORT vs EMDASH_MIGRATION_DATABASE_URL)')
	fi
	if [ "$url_database" != "$PGDATABASE" ]; then
		mismatches+=('database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)')
	fi
	if [ "$url_user" != "$PGUSER" ]; then
		mismatches+=('user (PGUSER vs EMDASH_MIGRATION_DATABASE_URL)')
	fi
	if [ "${#mismatches[@]}" -gt 0 ]; then
		printf 't013: [S1] FAIL the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: %s\n' \
			"${mismatches[*]}" >&2
		exit "$EXIT_CONFIG"
	fi

	# These four components are the documented non-secret identity evidence.
	info S1 'identity agreement: host=%s port=%s database=%s user=%s (password and full URL never printed)' \
		"$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER"
	pass S1 'inputs valid and PG*/migration-URL identity agreement proven (non-secret components only)'
}

# ---------------------------------------------------------------------------
# S2 — exact application build and the native manifest it emits
# ---------------------------------------------------------------------------

build_application() {
	# Remove any stale generated manifest first so this gate provably consumes
	# the manifest emitted by the exact application build (.emdash/ is
	# generated, gitignored output; never a tracked artifact). The exact
	# application build itself — not this gate — synthesizes the manifest.
	rm -f .emdash/migrations.json

	if ! timeout --kill-after=30 "${BUILD_TIMEOUT_SECONDS}s" npm run build \
		>"$TMP_DIR/build.out" 2>"$TMP_DIR/build.err"; then
		print_tail 'build output' "$TMP_DIR/build.out"
		print_tail 'build diagnostics' "$TMP_DIR/build.err"
		fail_gate S2 'astro build failed'
	fi
	pass S2 'exact application built (npm run build)'

	if [ ! -f .emdash/migrations.json ]; then
		fail_gate S2 'the exact application build did not emit the native .emdash/migrations.json manifest'
	fi
	if [ ! -f dist/server/entry.mjs ]; then
		fail_gate S2 'the exact application build did not emit dist/server/entry.mjs'
	fi
}

inspect_manifest() {
	local manifest="$1"
	local rc=0
	# Emits "<key> <value>" lines (no spaces inside any value) plus, only
	# when the secret-safety scan finds a problem, urlLike/secretKeys lines.
	node -e '
		const fs = require("fs");
		const text = fs.readFileSync(process.argv[1], "utf8");
		const m = JSON.parse(text);
		const lines = [
			`schemaVersion ${m.schemaVersion ?? ""}`,
			`emdashVersion ${m.emdashVersion ?? ""}`,
			`migrationCount ${Array.isArray(m.migrationSet?.names) ? m.migrationSet.names.length : 0}`,
			`migrationSetFingerprint ${m.migrationSet?.fingerprint ?? ""}`,
			`databaseType ${m.database?.type ?? ""}`,
			`connectionStringEnv ${m.database?.executorConfig?.connectionStringEnv ?? ""}`,
		];
		if (/:\/\//.test(text)) lines.push("urlLike present");
		const secretKeys = [...text.matchAll(/"([A-Za-z]*(?:password|secret|token|credential)[A-Za-z]*)"/gi)].map((x) => x[1]);
		if (secretKeys.length > 0) lines.push(`secretKeys ${secretKeys.join(",")}`);
		process.stdout.write(lines.join("\n") + "\n");
	' "$manifest" >"$TMP_DIR/manifest.parsed" || rc=$?
	if [ "$rc" -ne 0 ]; then
		fail_gate S2 'the emitted migration manifest is not valid JSON'
	fi

	local schema_version='' emdash_version='' migration_count=''
	local set_fp='' db_type='' env_name='' url_like='' secret_keys=''
	local key value
	while IFS=' ' read -r key value; do
		case $key in
		schemaVersion) schema_version="$value" ;;
		emdashVersion) emdash_version="$value" ;;
		migrationCount) migration_count="$value" ;;
		migrationSetFingerprint) set_fp="$value" ;;
		databaseType) db_type="$value" ;;
		connectionStringEnv) env_name="$value" ;;
		urlLike) url_like="$value" ;;
		secretKeys) secret_keys="$value" ;;
		esac
	done <"$TMP_DIR/manifest.parsed"

	# package.json is the manifest authority for the pinned EmDash version;
	# the version the exact build just emitted must equal it.
	local pinned_emdash_version
	pinned_emdash_version="$(node -p 'require("./package.json").dependencies.emdash')"
	if [ -z "$pinned_emdash_version" ]; then
		fail_gate S2 'could not read the pinned emdash dependency version from package.json'
	fi

	if [ "$schema_version" != '1' ]; then
		fail_gate S2 'unexpected manifest schemaVersion %s' "${schema_version:-missing}"
	fi
	if [ "$emdash_version" != "$pinned_emdash_version" ]; then
		fail_gate S2 'manifest emdashVersion %s does not match the pinned dependency %s' \
			"${emdash_version:-missing}" "$pinned_emdash_version"
	fi
	if ! printf '%s' "$migration_count" | grep -qE '^[0-9]+$' || [ "$migration_count" -lt 1 ]; then
		fail_gate S2 'manifest migration set is empty or missing'
	fi
	if ! printf '%s' "$set_fp" | grep -qE '^[0-9a-f]{64}$'; then
		fail_gate S2 'manifest migration-set fingerprint is missing or not a SHA-256 value'
	fi
	if [ "$db_type" != 'postgres' ]; then
		fail_gate S2 'manifest database type %s is not the native postgres adapter' "${db_type:-missing}"
	fi
	if [ "$env_name" != "$EXPECTED_MIGRATION_ENV_NAME" ]; then
		fail_gate S2 'manifest migration connection variable is %s, expected the NAME %s' \
			"${env_name:-missing}" "$EXPECTED_MIGRATION_ENV_NAME"
	fi
	if [ -n "$url_like" ]; then
		fail_gate S2 'manifest contains a URL-like string; the native manifest must be secret-free'
	fi
	if [ -n "$secret_keys" ]; then
		fail_gate S2 'manifest contains secret-looking key(s): %s' "$secret_keys"
	fi

	local checksum
	checksum="$(sha256sum "$manifest" | awk '{print $1}')"
	info S2 'manifest: emdash %s, %s migrations, migration-set fingerprint %s' \
		"$emdash_version" "$migration_count" "$set_fp"
	info S2 'manifest sha256: %s' "$checksum"
	info S2 'manifest records migration connection variable NAME %s (secret-free: no URLs, no secret keys)' \
		"$env_name"
	pass S2 'native .emdash/migrations.json emitted by the exact build; identity, checksum, and secret safety verified'
}

# ---------------------------------------------------------------------------
# S3/S4/S5 — native migration sequence (status -> apply -> check)
# ---------------------------------------------------------------------------

run_emdash() {
	# run_emdash <output-file> <args...>: bounded native CLI invocation.
	local out_file="$1"
	shift
	timeout --kill-after=30 "${EMDASH_CMD_TIMEOUT_SECONDS}s" \
		npx --no-install emdash "$@" >"$out_file" 2>"$out_file.err"
}

parse_status_json() {
	# parse_status_json <status-json-file>: sets STATUS_KIND, STATUS_LABEL,
	# STATUS_FINGERPRINT, STATUS_APPLIED, STATUS_PENDING, STATUS_UNKNOWN from
	# the native JSON report (stdout of --status --json).
	local rc=0
	node -e '
		const fs = require("fs");
		const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
		const t = report.target ?? {};
		const out = {
			kind: String(t.kind ?? ""),
			label: String(t.label ?? ""),
			fingerprint: String(t.fingerprint ?? ""),
			applied: (report.knownApplied ?? []).length,
			pending: (report.pending ?? []).length,
			unknown: (report.unknownApplied ?? []).length,
		};
		for (const [k, v] of Object.entries(out)) console.log(`${k} ${v}`);
	' "$1" >"$1.parsed" || rc=$?
	if [ "$rc" -ne 0 ]; then
		return 1
	fi
	local key value
	while IFS=' ' read -r key value; do
		case $key in
		kind) STATUS_KIND="$value" ;;
		label) STATUS_LABEL="$value" ;;
		fingerprint) STATUS_FINGERPRINT="$value" ;;
		applied) STATUS_APPLIED="$value" ;;
		pending) STATUS_PENDING="$value" ;;
		unknown) STATUS_UNKNOWN="$value" ;;
		esac
	done <"$1.parsed"
}

inspect_target() {
	local status_file="$TMP_DIR/status-before.json"
	if ! run_emdash "$status_file" migrate --status --json; then
		print_tail 'emdash migrate --status diagnostics' "$status_file.err"
		fail_gate S3 'native emdash migrate --status failed'
	fi
	if ! parse_status_json "$status_file"; then
		print_tail 'emdash migrate --status report' "$status_file"
		fail_gate S3 'the native status report is not the expected JSON shape'
	fi

	if [ "$STATUS_KIND" != 'postgres' ]; then
		fail_gate S3 'inspected migration target kind is %s, expected postgres' "${STATUS_KIND:-missing}"
	fi
	if ! printf '%s' "$STATUS_FINGERPRINT" | grep -qE '^[0-9a-f]{64}$'; then
		fail_gate S3 'inspected target fingerprint is missing or not a SHA-256 value'
	fi

	# The native postgres target label is host:port/database built from the
	# migration connection URL; it must agree with the PG* identity proven
	# in S1, so the inspected target is the intended database.
	local expected_label="${PGHOST}:${PGPORT}/${PGDATABASE}"
	if [ "$STATUS_LABEL" != "$expected_label" ]; then
		fail_gate S3 'inspected target label %s does not match the intended database identity %s' \
			"${STATUS_LABEL:-missing}" "$expected_label"
	fi

	# Reject an unknown migration state up front: migrations applied to the
	# target that this build's manifest does not know can never be cleared by
	# the apply step, so such a target is not acceptable for this build.
	if [ "$STATUS_UNKNOWN" -ne 0 ]; then
		fail_gate S3 'the inspected target reports %s unknown applied migration(s); this is not an acceptable target state for the exact build manifest' \
			"$STATUS_UNKNOWN"
	fi

	info S3 'inspected target: %s %s' "$STATUS_KIND" "$STATUS_LABEL"
	info S3 'target fingerprint (sha256 of the non-secret target identity): %s' "$STATUS_FINGERPRINT"
	info S3 'migration state before apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"
	pass S3 'target inspected with emdash migrate --status (no mutation); fingerprint derived from the inspected target; no unknown state'
}

apply_migrations() {
	# Plain native apply with the required non-interactive safety guard.
	# The fingerprint comes from the inspected target above — never
	# hard-coded — and EmDash fails the apply (exit 4) on any mismatch.
	local apply_file="$TMP_DIR/apply.json"
	if ! run_emdash "$apply_file" migrate --expected-target-fingerprint "$STATUS_FINGERPRINT"; then
		print_tail 'emdash migrate apply diagnostics' "$apply_file.err"
		fail_gate S4 'native emdash migrate apply failed (fingerprint guard or migration error)'
	fi

	local after="$TMP_DIR/status-after.json"
	if ! run_emdash "$after" migrate --status --json; then
		print_tail 'emdash migrate --status diagnostics' "$after.err"
		fail_gate S4 'post-apply status inspection failed'
	fi
	if ! parse_status_json "$after"; then
		fail_gate S4 'the post-apply status report is not the expected JSON shape'
	fi
	if [ "$STATUS_PENDING" -ne 0 ] || [ "$STATUS_UNKNOWN" -ne 0 ]; then
		fail_gate S4 'after apply, migrations remain pending=%s unknown=%s' "$STATUS_PENDING" "$STATUS_UNKNOWN"
	fi
	info S4 'migration state after apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"
	pass S4 'native emdash migrate applied with --expected-target-fingerprint from the inspected target; nothing pending, nothing unknown'
}

check_migrations() {
	local check_file="$TMP_DIR/check.out"
	local rc=0
	run_emdash "$check_file" migrate --check || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'emdash migrate --check diagnostics' "$check_file.err"
		fail_gate S5 'emdash migrate --check failed (exit %s: pending or unknown migrations remain, or an error occurred)' "$rc"
	fi
	info S5 'emdash migrate --check: no pending and no unknown migrations (exit 0; applies nothing)'
	pass S5 'migration state verified with emdash migrate --check'
}

# ---------------------------------------------------------------------------
# S6 — bounded disposable media write/read/remove probe
# ---------------------------------------------------------------------------

probe_media() {
	local media_dir="$ROOT/$MEDIA_MOUNT_PATH"

	# The stable application mount path must already exist as a directory.
	# This gate never creates it: a missing mount must stay missing (no
	# unintended empty replacement store), and a non-directory is not the
	# expected mount.
	if [ ! -d "$media_dir" ]; then
		if [ -e "$media_dir" ]; then
			fail_gate S6 'the expected media mount %s exists but is not a directory' "$MEDIA_MOUNT_PATH"
		fi
		fail_gate S6 'the expected media mount %s is missing (it must exist and be writable; this gate never creates it)' \
			"$MEDIA_MOUNT_PATH"
	fi

	# One unique, bounded, disposable probe file with known bytes.
	local probe_name probe payload
	probe_name=".songhealth-startup-probe-$(date -u +%Y%m%dT%H%M%SZ)-$$-$RANDOM"
	probe="$media_dir/$probe_name"
	PROBE_FILE="$probe"
	payload="songhealth t013 startup-acceptance media probe $probe_name"

	if ! printf '%s' "$payload" >"$probe" 2>"$TMP_DIR/probe-write.err"; then
		print_tail 'media probe write diagnostics' "$TMP_DIR/probe-write.err"
		fail_gate S6 'writing the disposable media probe failed: the expected media mount is not writable'
	fi

	# Read the bytes back and compare them exactly with what was written.
	local readback='' size=''
	readback="$(cat "$probe" 2>/dev/null)" || fail_gate S6 'reading the disposable media probe back failed'
	size="$(wc -c <"$probe" 2>/dev/null)" || fail_gate S6 'measuring the disposable media probe failed'
	size="${size//[[:space:]]/}"
	if ! printf '%s' "$size" | grep -qE '^[0-9]+$'; then
		fail_gate S6 'the media probe byte count is not a valid number'
	fi
	if [ "$size" -ne "${#payload}" ] || [ "$readback" != "$payload" ]; then
		fail_gate S6 'media probe content mismatch: the bytes read back differ from the known bytes written'
	fi

	# Remove the probe and prove that no residue remains.
	if ! rm -f "$probe" 2>"$TMP_DIR/probe-remove.err"; then
		print_tail 'media probe remove diagnostics' "$TMP_DIR/probe-remove.err"
		fail_gate S6 'removing the disposable media probe failed: acceptance cannot leave probe residue'
	fi
	if [ -e "$probe" ]; then
		fail_gate S6 'media probe residue remains after removal'
	fi
	PROBE_FILE=''

	info S6 'media probe %s: wrote and read back %s identical bytes, then removed it; no residue remains' \
		"$probe_name" "$size"
	pass S6 'bounded disposable media write/read/remove probe passed against the stable %s mount' \
		"$MEDIA_MOUNT_PATH"
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
		*)
			usage >&2
			die "$EXIT_USAGE" "unexpected argument(s): $* (this gate takes no arguments)"
			;;
		esac
	fi

	ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
	cd "$ROOT"

	TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/t013-startup-gate.XXXXXX")"
	trap cleanup EXIT

	require_tools
	info main 'node %s, npm %s' "$(node --version)" "$(npm --version)"
	validate_inputs

	# S1 — inputs and identity agreement, before anything else runs.
	migration_url_identity >"$TMP_DIR/url-identity.txt"
	check_identity_agreement "$TMP_DIR/url-identity.txt"

	# S2 — exact application build and the native manifest it emits.
	build_application
	inspect_manifest .emdash/migrations.json

	# S3-S5 — native migration sequence.
	inspect_target
	apply_migrations
	check_migrations

	# S6 — media writeability acceptance probe.
	probe_media

	printf 't013: ================================================================\n'
	printf 't013: T013 startup acceptance gate: PASS\n'
	printf 't013: native status -> apply (inspected-fingerprint guard) -> check passed against the exact-build manifest\n'
	printf 't013: media writeability proven with a bounded disposable probe; no residue remains\n'
	printf 't013: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')"
	printf 't013: ================================================================\n'
}

main "$@"
