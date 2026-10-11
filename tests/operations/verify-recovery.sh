#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth clean-recovery verification scenario (Feature 001, T024 —
# RED-first verification harness for US3).
#
# This harness is the FAILING-first verification contract for the recovery
# implementation that T025–T027 will later deliver (scripts/backup-
# foundation.sh, scripts/restore-foundation.sh, scripts/verify-restored-
# foundation.mjs). At any baseline where those artifacts are absent it must
# exit nonzero with one bounded, secret-free prerequisite failure that is
# attributable ONLY to that intentionally absent downstream implementation —
# never to a syntax error, an unchecked variable, an unbounded wait, secret
# leakage, or destructive probing (stage P0 runs before anything else and
# before any environment input or tool is even required, so a bare run at
# the RED baseline always reports the missing implementation, not missing
# inputs or tools). It never fabricates a recovery PASS: the backup
# procedure, the restore procedure, and the restored-foundation comparator
# are NEVER implemented inside this harness — it verifies them through their
# owning scripts, and this task deliberately does not make those scripts
# real (they are T025/T026/T027 work).
#
# Contract coverage (delegation items map 1:1 to stages):
#
#   P0   RED prerequisite: the recovery implementation sources exist in the
#        repository — scripts/backup-foundation.sh (T025), scripts/
#        restore-foundation.sh (T026, executable), and scripts/
#        verify-restored-foundation.mjs (T027, readable). Absent artifacts
#        produce the explicit bounded RED/blocked evidence above and stop
#        the run before anything else.
#   S1   inputs and fail-closed invocation, BEFORE any external mutation:
#        required environment inputs present and well-formed; the restore
#        target's PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL
#        identify the same intended database, proven by comparing non-secret
#        identity components only (host case-insensitively, exactly like the
#        accepted T008/T013 boundary); and the source active stores are
#        never recovery targets — the declared restore database identity
#        must differ from the declared active source database identity
#        (host:port/database), and the restore media mount must differ from
#        the active source media mount.
#   S2   Recovery Set pre-restore validation, strictly BEFORE any restore
#        attempt (existence -> checksums -> archive readability ->
#        association/anchor, in that order; an S2 failure means S3 never
#        runs):
#          a. recovery-manifest.json present, valid JSON, secret-free (no
#             URL-like strings, no secret-looking keys), one nonempty
#             recovery-set identifier associating both artifact classes and
#             the expected validation evidence with one quiescent known
#             state;
#          b. BOTH artifacts present and readable under the Recovery Set
#             directory (a set missing either artifact class is incomplete
#             and fails; artifact names must be basenames — path traversal
#             is rejected);
#          c. the database archive is a readable custom-format archive:
#             pg_restore --list succeeds with NO schema/table filter flags
#             (the harness itself never passes -n/-t/--table/--schema) and
#             emits a nonempty table of contents;
#          d. the media archive is readable (tar -tf listing succeeds) and
#             every manifest media entry path appears in the listing;
#          e. both artifact SHA-256 checksums match the recorded checksums;
#          f. the manifest's media evidence is nonempty and well-formed
#             (relative path, integer size, SHA-256 per entry), and the
#             recorded expected tagline evidence equals the canonical T015
#             evidence — exact UTF-8 value, exactly 44 bytes, no trailing
#             newline, SHA-256 84753035…a4415 — so no later comparator can
#             be fed a substituted anchor (Admin identity, passkey
#             metadata, an arbitrary row, or a Product collection).
#   S3   error-stopping restore into the clean target, driven through the
#        T026 authority script scripts/restore-foundation.sh (environment-
#        driven contract: no arguments; SONGHEALTH_RECOVERY_DIR + the
#        restore-target PG*/EMDASH_MIGRATION_DATABASE_URL inputs + the two
#        media mount inputs; exit status is the authority — 0 means the
#        complete unfiltered restore with pg_restore --exit-on-error
#        --no-owner --no-privileges succeeded, nonzero means it failed and
#        stopped). A restore failure fails this stage and S4–S6 acceptance
#        never runs. On success the restored media persistence is asserted:
#        the restore media mount exists, is a directory, and is nonempty.
#        Database persistence is proven downstream by S4 (native inspection
#        of the restored target) and S5 (the comparator reading the restored
#        state through its intended native boundary).
#   S4   exact-build native migration gate against the RESTORED target,
#        mirroring the accepted T013 authority sequence: rebuild the exact
#        application (stale manifest removed first; npm run build emits the
#        native .emdash/migrations.json) and verify manifest identity
#        (schemaVersion, emdashVersion == the package.json pin, nonempty
#        migration set, SHA-256 set fingerprint, native postgres adapter,
#        migration connection variable NAME only, secret-free), then
#        `emdash migrate --status --json` (no mutation; fingerprint derived
#        from the inspected target; inspected target label == the agreed
#        restore identity; unknown state rejected), then plain `emdash
#        migrate` carrying --expected-target-fingerprint from that
#        inspection, re-inspected to require zero pending and zero unknown,
#        then `emdash migrate --check` (exit 0). Any status/apply/check
#        failure or pending/unknown state blocks acceptance. Native
#        behavior only; no migration framework or service is introduced.
#   S5   restored-foundation integrity comparison, driven through the T027
#        authority script scripts/verify-restored-foundation.mjs
#        (environment-driven contract: same inputs as S3 plus the Recovery
#        Set; exit status is the authority — it owns the exact native
#        tagline value/digest comparison through the intended native
#        retrieval boundary and every designated media path/size/SHA-256
#        comparison, 100% recovered with zero unexplained differences; this
#        harness deliberately does NOT read the tagline or media itself and
#        does not substitute any non-native anchor). Exit 0 required;
#        captured output is secret-scrubbed.
#   S6   separate missing-secret failure, INDEPENDENT of Recovery Set
#        validity (it runs last and its failure alone blocks recovery
#        acceptance even when S2–S5 all passed, because runtime secrets are
#        restored separately, before operational-use acceptance — FR-014;
#        quickstart §7.1): PGPASSWORD present; the migration connection
#        credential (the password inside EMDASH_MIGRATION_DATABASE_URL)
#        present; EMDASH_ENCRYPTION_KEY present AND structurally usable in
#        the documented EmDash key format (the accepted T023 §8.3.3 K1
#        check: emdash_enc_v1_ + exactly 43 canonical unpadded-base64url
#        characters per element, comma-separated list allowed). Output is
#        field/dependency names and redacted pass/fail ONLY — values and
#        full credential URLs are never serialized into evidence, including
#        synthetic sentinels.
#
# Division of ownership (this harness verifies; it does not implement):
# T025 owns backup creation (this harness never runs pg_dump and never
# invokes backup-foundation.sh — it validates the Recovery Set that T025's
# contract produces, which is why T025's artifact presence is a P0
# prerequisite); T026 owns the restore; T027 owns the restored-state
# comparison. A later stubbed success run demonstrates harness control flow
# only, never runtime recovery acceptance (the self-test banner says so).
#
# `--self-test` runs the isolated synthetic scenario suite entirely under a
# scratch directory in TMPDIR: synthetic non-confidential fixtures, PATH-
# shimmed controlled stubs for pg_restore / npm / npx / emdash and stub
# implementations of the three T025–T027 scripts, sentinel redaction scans,
# ordering proofs (a failed stage provably prevents every later stub from
# being invoked), and a repository no-mutation proof. It touches no real
# database, media store, secret, deployment, or tracked source file.
#
# Inputs come from the environment (never committed). Required for a real
# verification run:
#
#   SONGHEALTH_RECOVERY_DIR        Recovery Set directory (absolute):
#                                  database archive + media archive +
#                                  recovery-manifest.json
#   PGHOST/PGPORT/PGDATABASE/PGUSER
#                                  the RESTORE target's identity (non-secret
#                                  components; the restored environment's
#                                  own runtime inputs)
#   EMDASH_MIGRATION_DATABASE_URL  the restored environment's migration
#                                  connection; must identify the same
#                                  intended database as PG* (checked by
#                                  non-secret identity components only)
#   SONGHEALTH_SOURCE_DB_IDENTITY  the ACTIVE source database identity as
#                                  host:port/database (non-secret) — the
#                                  restore target must differ
#   SONGHEALTH_SOURCE_MEDIA_MOUNT  absolute path of the ACTIVE source media
#                                  mount — the restore media mount must
#                                  differ
#   SONGHEALTH_RESTORE_MEDIA_MOUNT absolute path of the clean restore media
#                                  volume's stable application mount path
#
#   PGPASSWORD and EMDASH_ENCRYPTION_KEY are NOT S1 inputs: they are the S6
#   runtime-secret acceptance checks, and their absence must surface as S6's
#   independent rejection even when the Recovery Set is otherwise valid.
#   EMDASH_SITE_URL is optional pass-through context for the authority
#   scripts.
#
# Recovery Set manifest contract (produced by T025; validated by S2): a
# recovery-manifest.json in SONGHEALTH_RECOVERY_DIR of the shape
#   { "recoverySetId": "<opaque id>",
#     "createdAt": "<ISO-8601>",
#     "database": { "file": "database.dump", "format": "custom",
#                   "sha256": "<64 hex>" },
#     "media": { "file": "media.tar", "sha256": "<64 hex>",
#                "entries": [ { "path": "<relative>", "size": <int>,
#                               "sha256": "<64 hex>" } ] },
#     "expected": { "taglineValue": "<T015 canonical value>",
#                   "taglineSha256": "<T015 canonical digest>" } }
# containing no secrets and no URLs.
#
# Secret safety: this harness never prints PGPASSWORD, the migration URL,
# the encryption key, or any other secret value. Errors and diagnostics
# name the missing or mismatching field/resource only, identity evidence
# prints only the documented non-secret components (host, port, database,
# user), the S6 encryption-key format check runs byte-safely against a
# mode-0600 scratch file inside this run's own mktemp directory and prints
# only a fixed field-name result, and any captured command output is
# scrubbed of the known secret values before it is printed.
#
# Version-sensitive external semantics verified for this harness (Context7
# first where supported, per AGENTS.md; see the T024 implementation evidence
# for the dated record): PostgreSQL 18 `pg_restore` — `--exit-on-error`
# exits at the first error while sending SQL commands (default is to
# continue and report an error count), `--no-owner` and `--no-privileges`
# suppress ownership and grant/revoke restoration, and `--list` prints the
# archive table of contents, which filter flags (-n/-t) would restrict
# (postgresql.org/docs/18 app-pgrestore, via Context7, 2026-10-11). EmDash
# 1.1.0 migrate --status/--expected-target-fingerprint/--check behavior and
# the EMDASH_ENCRYPTION_KEY format follow the accepted in-repo authorities
# tests/operations/verify-startup.sh (T013) and docs/operations/
# runtime-secret-recovery.md §8.3.3/Appendix B (T023).
#
# Exit codes: 0 PASS | 1 FAIL (any stage, including the expected RED
# prerequisite failure) | 2 environment error | 4 missing or invalid input |
# 64 usage error.

set -euo pipefail

readonly EXIT_FAIL=1
readonly EXIT_ENV=2
readonly EXIT_CONFIG=4
readonly EXIT_USAGE=64

# Bounded waits so the harness can never hang (seconds).
readonly BUILD_TIMEOUT_SECONDS=900
readonly EMDASH_CMD_TIMEOUT_SECONDS=600
readonly RESTORE_TIMEOUT_SECONDS=900
readonly COMPARATOR_TIMEOUT_SECONDS=300
readonly ARCHIVE_LIST_TIMEOUT_SECONDS=120

# Canonical T015 database validation evidence (specs/001-platform-foundation/
# evidence/T015-us1-canonical-platform.md §5): the exact native EmDash Site
# Setting tagline value, its UTF-8 byte length, and its SHA-256 digest.
# Identical anchors to the accepted T016 harness.
readonly TAGLINE_EXPECTED='Songhealth Feature 001 foundation validation'
readonly TAGLINE_EXPECTED_SHA256='84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415'
readonly TAGLINE_EXPECTED_BYTES=44

# Migration connection variable NAME the native manifest must record
# (identical to the accepted T013 gate).
readonly EXPECTED_MIGRATION_ENV_NAME='EMDASH_MIGRATION_DATABASE_URL'

# The T025–T027 implementation sources this scenario verifies, with their
# owning tasks, for the P0 RED prerequisite check.
readonly BACKUP_SCRIPT='scripts/backup-foundation.sh'
readonly RESTORE_SCRIPT='scripts/restore-foundation.sh'
readonly COMPARATOR_SCRIPT='scripts/verify-restored-foundation.mjs'
readonly IMPLEMENTATION_FILES=("$BACKUP_SCRIPT" "$RESTORE_SCRIPT" "$COMPARATOR_SCRIPT")
readonly IMPLEMENTATION_OWNERS=('T025 (backup procedure)' 'T026 (restore procedure)' 'T027 (restored-foundation comparator)')

# Recovery Set manifest file name (T025 output contract, validated in S2).
readonly RECOVERY_MANIFEST_NAME='recovery-manifest.json'

# Set while the harness runs.
ROOT=''
TMP_DIR=''
# The agreed normalized restore-target identity proven in S1 (non-secret
# components; the URL-normalized host form, as in the accepted T013 gate).
AGREED_HOST=''
AGREED_PORT=''
AGREED_DATABASE=''
AGREED_USER=''

# The real repository root, independent of the self-test ROOT override.
REAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
	cat <<'EOF'
Usage: tests/operations/verify-recovery.sh [--self-test]

T024 clean-recovery verification scenario: validate a Recovery Set
(custom-format database archive + separate media archive + association
manifest with the canonical T015 tagline evidence) BEFORE any restore
attempt, drive the error-stopping restore into the clean target through
the T026 authority script, run the exact-build native migration
status/apply/check sequence against the restored target, drive the T027
comparator for the exact tagline value/digest and complete media
integrity, and independently reject missing/unusable required runtime
secrets (PGPASSWORD, the migration credential, EMDASH_ENCRYPTION_KEY).

At a baseline where the T025–T027 implementation sources are absent this
harness exits nonzero at the P0 RED prerequisite, attributing the failure
only to those intentionally unimplemented artifacts. It never implements
backup, restore, or the comparator itself, and never fabricates a
recovery PASS.

Sequence: P0 implementation-source prerequisite -> S1 inputs, restore-
target identity agreement, and source-store protection -> S2 pre-restore
Recovery Set validation (existence, checksums, readability, association,
T015 anchor) -> S3 error-stopping restore via scripts/restore-
foundation.sh + restored media persistence -> S4 exact-build manifest
identity + native status -> fingerprint-guarded apply -> check against
the restored target -> S5 comparator via scripts/verify-restored-
foundation.mjs -> S6 independent runtime-secret acceptance.

Provide all required inputs in the environment (see the script header);
the source active stores are never recovery targets. --self-test runs the
isolated synthetic scenario suite with controlled stubs under a scratch
directory (control-flow demonstration only, never runtime recovery
acceptance).

Exit codes: 0 PASS | 1 FAIL | 2 environment error | 4 missing/invalid
input | 64 usage error.
EOF
}

die() {
	# die <exit-code> <message...>
	local code="$1"
	shift
	printf 't024: %s\n' "$*" >&2
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]
	local name="$1" status="$2"
	shift 2
	printf 't024: [%s] %s ' "$name" "$status"
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$@"
	printf '\n'
}

pass() { step "$1" PASS "${@:2}"; }
info() { step "$1" INFO "${@:2}"; }

fail_stage() {
	# fail_stage <stage-name> <printf-format> [args...]
	local name="$1"
	shift
	printf 't024: [%s] FAIL ' "$name" >&2
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
		printf 't024: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't024: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Cleanup: the temporary directory only (this harness creates no probe
# files; every mutation of external state belongs to the T026 authority).
# ---------------------------------------------------------------------------

cleanup() {
	if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
		rm -rf "$TMP_DIR"
	fi
}

# ---------------------------------------------------------------------------
# P0 — RED prerequisite: the recovery implementation sources exist
# ---------------------------------------------------------------------------

check_recovery_implementations() {
	local missing=() broken=()
	local absent_files='' file i
	for file in "${IMPLEMENTATION_FILES[@]}"; do
		if [ ! -f "$ROOT/$file" ]; then
			missing+=("$file")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		for file in "${missing[@]}"; do
			absent_files+="${absent_files:+, }$file"
		done
		printf 't024: [P0] FAIL recovery implementation source(s) absent from the repository: %s\n' "$absent_files" >&2
		printf 't024: [P0] these are the intentionally unimplemented T025–T027 recovery artifacts; the T024 harness fails closed for exactly this bounded prerequisite reason and never fabricates a recovery PASS\n' >&2
		for i in "${!IMPLEMENTATION_FILES[@]}"; do
			if [ ! -f "$ROOT/${IMPLEMENTATION_FILES[$i]}" ]; then
				printf 't024: [P0] missing %s — owned by %s\n' \
					"${IMPLEMENTATION_FILES[$i]}" "${IMPLEMENTATION_OWNERS[$i]}" >&2
			fi
		done
		printf 't024: [P0] no Recovery Set validation, restore attempt, migration probe, comparison, or secret check was attempted and nothing was mutated\n' >&2
		exit "$EXIT_FAIL"
	fi
	# Invocation readiness for the two scripts this harness drives: the T026
	# restore authority must be executable (it is invoked directly) and the
	# T027 comparator must be readable (it is invoked through node).
	if [ ! -x "$ROOT/$RESTORE_SCRIPT" ]; then
		broken+=("$RESTORE_SCRIPT is not executable (the S3 restore authority must be directly invocable)")
	fi
	if [ ! -r "$ROOT/$COMPARATOR_SCRIPT" ]; then
		broken+=("$COMPARATOR_SCRIPT is not readable (the S5 comparator is invoked through node)")
	fi
	if [ "${#broken[@]}" -gt 0 ]; then
		for i in "${!broken[@]}"; do
			printf 't024: [P0] FAIL %s\n' "${broken[$i]}" >&2
		done
		printf 't024: [P0] the recovery implementation sources are present but not invocable; failing closed before any validation or mutation\n' >&2
		exit "$EXIT_FAIL"
	fi
	pass P0 'recovery implementation sources present and invocable (backup: T025 presence contract; restore: T026 executable; comparator: T027 readable)'
}

# ---------------------------------------------------------------------------
# S1 — tools, inputs, restore-target identity agreement, source protection
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in node npm npx tar sha256sum timeout mktemp pg_restore base64 od awk grep; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
}

validate_inputs() {
	local missing=()
	local var
	for var in SONGHEALTH_RECOVERY_DIR PGHOST PGPORT PGDATABASE PGUSER \
		EMDASH_MIGRATION_DATABASE_URL SONGHEALTH_SOURCE_DB_IDENTITY \
		SONGHEALTH_SOURCE_MEDIA_MOUNT SONGHEALTH_RESTORE_MEDIA_MOUNT; do
		if [ -z "${!var:-}" ]; then
			missing+=("$var")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		printf 't024: [S1] FAIL missing required input(s): %s\n' "${missing[*]}" >&2
		printf 't024: [S1] provide the documented inputs in the environment (see the script header); PGPASSWORD and EMDASH_ENCRYPTION_KEY are checked separately in S6\n' >&2
		exit "$EXIT_CONFIG"
	fi

	case $SONGHEALTH_RECOVERY_DIR in
	/*) ;;
	*)
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR must be an absolute path'
		;;
	esac
	if [ ! -d "$SONGHEALTH_RECOVERY_DIR" ]; then
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR is not an existing directory'
	fi

	case $PGPORT in
	*[!0-9]*)
		die "$EXIT_CONFIG" "PGPORT must be a TCP port number; the current value is not numeric"
		;;
	esac
	local pgport_value=$((10#$PGPORT))
	if [ "$pgport_value" -lt 1 ] || [ "$pgport_value" -gt 65535 ]; then
		die "$EXIT_CONFIG" 'PGPORT is outside the valid TCP port range 1-65535'
	fi

	local mount
	for mount in SONGHEALTH_SOURCE_MEDIA_MOUNT SONGHEALTH_RESTORE_MEDIA_MOUNT; do
		case ${!mount} in
		/*) ;;
		*)
			die "$EXIT_CONFIG" "$mount must be an absolute path"
			;;
		esac
	done
}

migration_url_identity() {
	# Prints the non-secret identity components of EMDASH_MIGRATION_DATABASE_URL
	# as "<key> <value>" lines (host, port, database, user). The URL itself —
	# including its password, present or absent — is read inside the node
	# process from the environment and never appears on a command line or in
	# output. Parsing mirrors the accepted T013 gate (and the native EmDash
	# 1.1.0 postgres migration executor): postgres or postgresql scheme, port
	# defaulting to 5432, no percent-decoding. A usable credential is NOT
	# required here: credential presence is the S6 secret-acceptance check,
	# so a credential-less URL must still reach S6 to be rejected there.
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

	# Host comparison mirrors the accepted T008/T013 boundary: DNS hostnames
	# are case-insensitive, so PGHOST is compared with the URL-normalized
	# hostname (already lowercase from the WHATWG URL parse)
	# case-insensitively. Port, database, and user are compared exactly.
	local mismatches=()
	if [ "$url_host" != "${PGHOST,,}" ]; then
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
		printf 't024: [S1] FAIL the restore target PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: %s\n' \
			"${mismatches[*]}" >&2
		exit "$EXIT_CONFIG"
	fi

	AGREED_HOST="$url_host"
	AGREED_PORT="$url_port"
	AGREED_DATABASE="$url_database"
	AGREED_USER="$url_user"

	# These four components are the documented non-secret identity evidence.
	info S1 'restore-target identity agreement: host=%s port=%s database=%s user=%s (host compared case-insensitively as in the accepted T008/T013 boundary; password and full URL never printed)' \
		"$AGREED_HOST" "$AGREED_PORT" "$AGREED_DATABASE" "$AGREED_USER"
	pass S1 'inputs valid and restore-target PG*/migration-URL identity agreement proven (non-secret components only)'
}

check_source_store_protection() {
	# The source active stores must never be recovery targets. The operator
	# declares the active source database identity (host:port/database,
	# non-secret) and the active source media mount; the harness proves the
	# restore target differs from both before anything runs. Host comparison
	# is case-insensitive (as above); port and database are exact.
	local src_identity_file="$TMP_DIR/source-identity.txt"
	local src_host='' src_port='' src_database='' key value

	node -e '
		const raw = process.env.SONGHEALTH_SOURCE_DB_IDENTITY;
		const m = /^([^:\/]+):(\d+)\/(.+)$/.exec(raw.trim());
		if (!m) {
			console.error("SONGHEALTH_SOURCE_DB_IDENTITY must be host:port/database");
			process.exit(4);
		}
		process.stdout.write(`host ${m[1]}\nport ${m[2]}\ndatabase ${m[3]}\n`);
	' >"$src_identity_file" || die "$EXIT_CONFIG" 'SONGHEALTH_SOURCE_DB_IDENTITY is malformed (expected host:port/database)'
	while IFS=' ' read -r key value; do
		case $key in
		host) src_host="$value" ;;
		port) src_port="$value" ;;
		database) src_database="$value" ;;
		esac
	done <"$src_identity_file"

	if [ "${src_host,,}" == "${AGREED_HOST,,}" ] && [ "$src_port" == "$AGREED_PORT" ] &&
		[ "$src_database" == "$AGREED_DATABASE" ]; then
		fail_input_source 'the declared restore target IS the active source database (host:port/database agree); source active stores must never be recovery targets'
	fi

	# Media mounts: lexical inequality after trailing-slash normalization
	# (both already proven absolute), plus realpath-equality rejection when
	# both exist, so symlink aliasing cannot bypass the lexical check.
	local src_media="${SONGHEALTH_SOURCE_MEDIA_MOUNT%/}"
	local restore_media="${SONGHEALTH_RESTORE_MEDIA_MOUNT%/}"
	if [ "$src_media" == "$restore_media" ]; then
		fail_input_source 'the declared restore media mount IS the active source media mount; source active stores must never be recovery targets'
	fi
	if [ -d "$src_media" ] && [ -d "$restore_media" ]; then
		local src_real='' restore_real=''
		src_real="$(cd "$src_media" && pwd -P)"
		restore_real="$(cd "$restore_media" && pwd -P)"
		if [ "$src_real" == "$restore_real" ]; then
			fail_input_source 'the declared restore media mount resolves to the active source media mount; source active stores must never be recovery targets'
		fi
	fi

	info S1 'source-store protection: restore target %s:%s/%s and restore media mount differ from the declared active source database identity and source media mount' \
		"$AGREED_HOST" "$AGREED_PORT" "$AGREED_DATABASE"
}

fail_input_source() {
	printf 't024: [S1] FAIL %s\n' "$1" >&2
	exit "$EXIT_CONFIG"
}

# ---------------------------------------------------------------------------
# S2 — Recovery Set pre-restore validation (before ANY restore attempt)
# ---------------------------------------------------------------------------

parse_recovery_manifest() {
	# parse_recovery_manifest <manifest-file>: emits "<key> <value>" lines
	# (values contain no spaces) plus one "entry <path>" line per media
	# entry, and "urlLike"/"secretKeys" lines only when the secret-safety
	# scan finds a problem. Sets MANIFEST_* globals on success.
	local manifest="$1"
	local rc=0
	node -e '
		const fs = require("fs");
		const [file, expectedValue, expectedSha, expectedBytes] = process.argv.slice(1);
		const text = fs.readFileSync(file, "utf8");
		const m = JSON.parse(text);
		const expected = m.expected ?? {};
		const value = typeof expected.taglineValue === "string" ? expected.taglineValue : "";
		const lines = [
			`recoverySetId ${typeof m.recoverySetId === "string" && m.recoverySetId ? "present" : "missing"}`,
			`createdAt ${typeof m.createdAt === "string" && m.createdAt ? "present" : "missing"}`,
			`dbFile ${m.database?.file ?? ""}`,
			`dbFormat ${m.database?.format ?? ""}`,
			`dbSha256 ${m.database?.sha256 ?? ""}`,
			`mediaFile ${m.media?.file ?? ""}`,
			`mediaSha256 ${m.media?.sha256 ?? ""}`,
			`mediaEntryCount ${Array.isArray(m.media?.entries) ? m.media.entries.length : 0}`,
			`taglineBytes ${Buffer.byteLength(value, "utf8")}`,
			`taglineTrailingNewline ${value.endsWith("\n") ? "yes" : "no"}`,
			`taglineValueMatches ${value === expectedValue ? "yes" : "no"}`,
			`taglineShaMatches ${expected.taglineSha256 === expectedSha ? "yes" : "no"}`,
			`taglineBytesMatch ${Buffer.byteLength(value, "utf8") === Number(expectedBytes) ? "yes" : "no"}`,
		];
		if (/:\/\//.test(text)) lines.push("urlLike present");
		const secretKeys = [...text.matchAll(/"([A-Za-z]*(?:password|secret|token|credential)[A-Za-z]*)"/gi)].map((x) => x[1]);
		if (secretKeys.length > 0) lines.push(`secretKeys ${secretKeys.join(",")}`);
		for (const e of (Array.isArray(m.media?.entries) ? m.media.entries : [])) {
			const shapeOk = e && typeof e.path === "string" && typeof e.size === "number" && /^[0-9a-f]{64}$/.test(String(e.sha256 ?? ""));
			lines.push(`entry ${shapeOk ? e.path : "MALFORMED"}`);
		}
		process.stdout.write(lines.join("\n") + "\n");
	' "$manifest" "$TAGLINE_EXPECTED" "$TAGLINE_EXPECTED_SHA256" "$TAGLINE_EXPECTED_BYTES" \
		>"$TMP_DIR/manifest.parsed" || rc=$?
	if [ "$rc" -ne 0 ]; then
		return 1
	fi
	local key value
	MANIFEST_DB_FILE=''
	MANIFEST_DB_SHA=''
	MANIFEST_MEDIA_FILE=''
	MANIFEST_MEDIA_SHA=''
	while IFS=' ' read -r key value; do
		case $key in
		dbFile) MANIFEST_DB_FILE="$value" ;;
		dbSha256) MANIFEST_DB_SHA="$value" ;;
		mediaFile) MANIFEST_MEDIA_FILE="$value" ;;
		mediaSha256) MANIFEST_MEDIA_SHA="$value" ;;
		esac
	done <"$TMP_DIR/manifest.parsed"
}

validate_recovery_set() {
	local dir="$SONGHEALTH_RECOVERY_DIR"
	local manifest="$dir/$RECOVERY_MANIFEST_NAME"

	# (a) manifest present, valid, secret-free, associating one state.
	if [ ! -f "$manifest" ]; then
		fail_stage S2 'the Recovery Set manifest %s is absent from %s; without the common association evidence the set cannot be validated or restored' \
			"$RECOVERY_MANIFEST_NAME" "$dir"
	fi
	if [ ! -r "$manifest" ]; then
		fail_stage S2 'the Recovery Set manifest is present but unreadable'
	fi
	if ! parse_recovery_manifest "$manifest"; then
		fail_stage S2 'the Recovery Set manifest is not valid JSON'
	fi

	local key value
	local recovery_set_id='' created_at='' db_format='' entry_count=0
	local tagline_bytes='' tagline_trailing_nl='' tagline_value_ok='' tagline_sha_ok='' tagline_bytes_ok=''
	local url_like='' secret_keys='' bad_entry=0 entry_path
	while IFS=' ' read -r key value; do
		case $key in
		recoverySetId) recovery_set_id="$value" ;;
		createdAt) created_at="$value" ;;
		dbFormat) db_format="$value" ;;
		mediaEntryCount) entry_count="$value" ;;
		taglineBytes) tagline_bytes="$value" ;;
		taglineTrailingNewline) tagline_trailing_nl="$value" ;;
		taglineValueMatches) tagline_value_ok="$value" ;;
		taglineShaMatches) tagline_sha_ok="$value" ;;
		taglineBytesMatch) tagline_bytes_ok="$value" ;;
		urlLike) url_like="$value" ;;
		secretKeys) secret_keys="$value" ;;
		entry)
			entry_path="$value"
			case $entry_path in
			MALFORMED | /* | *..*) bad_entry=1 ;;
			esac
			;;
		esac
	done <"$TMP_DIR/manifest.parsed"

	if [ "$recovery_set_id" != 'present' ]; then
		fail_stage S2 'the manifest has no recovery-set identifier; the database and media artifacts cannot be associated with one known validation state'
	fi
	if [ "$created_at" != 'present' ]; then
		fail_stage S2 'the manifest has no creation time for the known validation state'
	fi
	if [ -n "$url_like" ]; then
		fail_stage S2 'the manifest contains a URL-like string; the Recovery Set must be secret-free (credentials never travel with the artifacts)'
	fi
	if [ -n "$secret_keys" ]; then
		fail_stage S2 'the manifest contains secret-looking key(s): %s; runtime secrets are recovered separately and never enter the Recovery Set' \
			"$secret_keys"
	fi

	# Artifact names must be basenames inside the Recovery Set directory —
	# a manifest pointing outside the set (path traversal) is unusable.
	local file
	for file in "$MANIFEST_DB_FILE" "$MANIFEST_MEDIA_FILE"; do
		case $file in
		'' | */* | *..*)
			fail_stage S2 'a manifest artifact name is empty or is not a basename inside the Recovery Set directory (path traversal rejected)'
			;;
		esac
	done
	if [ "$db_format" != 'custom' ]; then
		fail_stage S2 'the recorded database archive format is %s; the contract requires a complete custom-format pg_dump archive' \
			"${db_format:-missing}"
	fi

	# (b) BOTH artifact classes present and readable — a set missing either
	# one when both were present at backup time is incomplete (spec edge
	# case) and fails before any restore attempt.
	local db_archive="$dir/$MANIFEST_DB_FILE"
	local media_archive="$dir/$MANIFEST_MEDIA_FILE"
	for file in "$db_archive" "$media_archive"; do
		if [ ! -e "$file" ]; then
			fail_stage S2 'the Recovery Set is incomplete: %s is absent; an incomplete set fails validation and no restore is attempted' \
				"$(basename "$file")"
		fi
		if [ ! -f "$file" ]; then
			fail_stage S2 'the Recovery Set artifact %s is not a regular file' "$(basename "$file")"
		fi
		if [ ! -r "$file" ]; then
			fail_stage S2 'the Recovery Set artifact %s is unreadable; an unreadable input fails validation and no restore is attempted' \
				"$(basename "$file")"
		fi
	done

	# (e) both artifact checksums must match the recorded values — a
	# mismatched (or corrupted-and-recorded-differently) artifact is
	# rejected before readability probing and before any restore attempt.
	local actual_db_sha='' actual_media_sha=''
	actual_db_sha="$(sha256sum "$db_archive" | awk '{print $1}')"
	actual_media_sha="$(sha256sum "$media_archive" | awk '{print $1}')"
	if ! printf '%s' "$MANIFEST_DB_SHA" | grep -qE '^[0-9a-f]{64}$'; then
		fail_stage S2 'the recorded database archive checksum is missing or not a SHA-256 value'
	fi
	if ! printf '%s' "$MANIFEST_MEDIA_SHA" | grep -qE '^[0-9a-f]{64}$'; then
		fail_stage S2 'the recorded media archive checksum is missing or not a SHA-256 value'
	fi
	if [ "$actual_db_sha" != "$MANIFEST_DB_SHA" ]; then
		fail_stage S2 'database archive checksum mismatch: the artifact does not match the checksum recorded for this recovery-set state (corrupt or mismatched input rejected before restore)'
	fi
	if [ "$actual_media_sha" != "$MANIFEST_MEDIA_SHA" ]; then
		fail_stage S2 'media archive checksum mismatch: the artifact does not match the checksum recorded for this recovery-set state (corrupt or mismatched input rejected before restore)'
	fi
	info S2 'artifact checksums match the recorded recovery-set evidence (database %s, media %s)' \
		"${actual_db_sha:0:16}…" "${actual_media_sha:0:16}…"

	# (c) the database archive is a readable custom-format archive: the
	# table of contents must list successfully. NO filter flags are passed —
	# the listing and the later restore are unfiltered by contract (filters
	# would also restrict what --list reports, per the PostgreSQL 18
	# pg_restore reference verified for this harness).
	local toc="$TMP_DIR/database-toc.txt"
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		pg_restore --list "$db_archive" >"$toc" 2>"$TMP_DIR/pgrestore-list.err"; then
		print_tail 'pg_restore --list diagnostics' "$TMP_DIR/pgrestore-list.err" 5
		fail_stage S2 'the database archive is not a readable custom-format archive: pg_restore --list failed (corrupt or unusable input rejected before restore)'
	fi
	if ! [ -s "$toc" ]; then
		fail_stage S2 'the database archive table of contents is empty: the archive does not carry the complete database state'
	fi
	info S2 'database archive readable: pg_restore --list produced a nonempty unfiltered table of contents'

	# (d) the media archive is readable and carries every designated entry.
	local listing="$TMP_DIR/media-listing.txt"
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		tar --list --file "$media_archive" >"$listing" 2>"$TMP_DIR/tar-list.err"; then
		print_tail 'tar --list diagnostics' "$TMP_DIR/tar-list.err" 5
		fail_stage S2 'the media archive is not readable: tar --list failed (corrupt or unusable input rejected before restore)'
	fi
	if ! [ -s "$listing" ]; then
		fail_stage S2 'the media archive listing is empty: the archive does not carry the designated media'
	fi
	sed 's#^\./##' "$listing" | grep -v '^$' >"$listing.norm" || true
	while IFS=' ' read -r key value; do
		[ "$key" = 'entry' ] || continue
		if ! grep -Fxq -- "$value" "$listing.norm"; then
			fail_stage S2 'the media archive does not contain the designated media entry %s recorded for this recovery-set state (mismatched set rejected before restore)' \
				"$value"
		fi
	done <"$TMP_DIR/manifest.parsed"
	info S2 'media archive readable: tar --list succeeded and every designated media entry path is present in the archive'

	# (f) media evidence well-formed and the T015 anchor exact.
	if ! printf '%s' "$entry_count" | grep -qE '^[0-9]+$' || [ "$entry_count" -lt 1 ]; then
		fail_stage S2 'the manifest records no designated media evidence; a recovery set for the known validation state must designate at least one media item'
	fi
	if [ "$bad_entry" -ne 0 ]; then
		fail_stage S2 'a designated media evidence entry is malformed (path/size/SHA-256 required; paths must be relative and free of traversal)'
	fi
	if [ "$tagline_value_ok" != 'yes' ] || [ "$tagline_sha_ok" != 'yes' ]; then
		fail_stage S2 'the recorded expected tagline evidence does not match the canonical T015 evidence (exact value and SHA-256 required; no substituted anchor is acceptable)'
	fi
	if [ "$tagline_bytes_ok" != 'yes' ] || [ "$tagline_bytes" != "$TAGLINE_EXPECTED_BYTES" ] || [ "$tagline_trailing_nl" != 'no' ]; then
		fail_stage S2 'the recorded expected tagline is not the canonical %s-byte UTF-8 value without a trailing newline' \
			"$TAGLINE_EXPECTED_BYTES"
	fi
	info S2 'expected tagline evidence equals the canonical T015 value: %s bytes, no trailing newline, sha256 %s' \
		"$TAGLINE_EXPECTED_BYTES" "$TAGLINE_EXPECTED_SHA256"

	pass S2 'Recovery Set validated pre-restore: complete, checksum-matched, readable (unfiltered pg_restore --list + tar --list), one association identifier, canonical T015 anchor (ordering: existence -> checksums -> readability -> association; no restore attempt before this pass)'
}

# ---------------------------------------------------------------------------
# S3 — error-stopping restore into the clean target (T026 authority)
# ---------------------------------------------------------------------------

run_restore() {
	# The restore itself belongs to the accepted T026 authority script. The
	# harness drives it environment-driven with no arguments; its exit
	# status is the authority. Any restore error must stop this scenario:
	# on nonzero exit nothing later runs (no migration probe, no
	# comparison, no secret acceptance — a partial restore can never be
	# accepted). The harness asserts only what it owns: invocation,
	# bounded execution, secret-scrubbed diagnostics, exit status, and the
	# restored media persistence afterwards. The unfiltered error-stopping
	# pg_restore --exit-on-error --no-owner --no-privileges semantics are
	# T026's own reviewed contract; a restore that wrongly ignored errors
	# cannot pass S4/S5 downstream.
	local out_file="$TMP_DIR/restore.out"
	local rc=0
	timeout --kill-after=30 "${RESTORE_TIMEOUT_SECONDS}s" \
		"$ROOT/$RESTORE_SCRIPT" >"$out_file" 2>"$out_file.err" || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'restore diagnostics' "$out_file.err"
		print_tail 'restore output' "$out_file"
		fail_stage S3 'the T026 restore authority failed (exit %s): an error-stopping restore failure blocks every subsequent success and acceptance; nothing was compared or accepted' \
			"$rc"
	fi
	print_tail 'restore output' "$out_file" 5
	pass S3 'T026 restore authority exited 0 (complete unfiltered error-stopping restore into the clean target)'
}

check_restored_media_persistence() {
	# Clean-target media persistence: after the restore, the restore media
	# mount must exist as a directory and hold content. A missing or empty
	# mount is a failed restore target, not a success.
	local mount="${SONGHEALTH_RESTORE_MEDIA_MOUNT%/}"
	if [ ! -d "$mount" ]; then
		if [ -e "$mount" ]; then
			fail_stage S3 'the restore media mount exists but is not a directory'
		fi
		fail_stage S3 'the restore media mount is absent after restore: clean-target media persistence failed'
	fi
	if ! find "$mount" -mindepth 1 -print -quit 2>/dev/null | grep -q .; then
		fail_stage S3 'the restore media mount is empty after restore: the designated media was not persisted into the clean target'
	fi
	pass S3 'restored media persisted into the clean target mount (exists, directory, nonempty); database persistence is proven by the S4 native inspection and the S5 comparator'
}

# ---------------------------------------------------------------------------
# S4 — exact-build manifest + native migration gate against the restored
# target (mirrors the accepted T013 authority sequence)
# ---------------------------------------------------------------------------

build_application() {
	# Remove any stale generated manifest first so this harness provably
	# consumes the manifest emitted by the exact application build
	# (.emdash/ is generated, gitignored output; never a tracked artifact).
	rm -f .emdash/migrations.json

	if ! timeout --kill-after=30 "${BUILD_TIMEOUT_SECONDS}s" npm run build \
		>"$TMP_DIR/build.out" 2>"$TMP_DIR/build.err"; then
		print_tail 'build output' "$TMP_DIR/build.out"
		print_tail 'build diagnostics' "$TMP_DIR/build.err"
		fail_stage S4 'astro build failed; the exact-build manifest identity cannot be established against the restored target'
	fi
	if [ ! -f .emdash/migrations.json ]; then
		fail_stage S4 'the exact application build did not emit the native .emdash/migrations.json manifest'
	fi
	if [ ! -f dist/server/entry.mjs ]; then
		fail_stage S4 'the exact application build did not emit dist/server/entry.mjs'
	fi
	info S4 'exact application built (npm run build); native manifest emitted'
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
	' "$manifest" >"$TMP_DIR/emdash-manifest.parsed" || rc=$?
	if [ "$rc" -ne 0 ]; then
		fail_stage S4 'the emitted migration manifest is not valid JSON'
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
	done <"$TMP_DIR/emdash-manifest.parsed"

	# package.json is the manifest authority for the pinned EmDash version.
	local pinned_emdash_version
	pinned_emdash_version="$(node -p 'require("./package.json").dependencies.emdash')"
	if [ -z "$pinned_emdash_version" ]; then
		fail_stage S4 'could not read the pinned emdash dependency version from package.json'
	fi

	if [ "$schema_version" != '1' ]; then
		fail_stage S4 'unexpected manifest schemaVersion %s' "${schema_version:-missing}"
	fi
	if [ "$emdash_version" != "$pinned_emdash_version" ]; then
		fail_stage S4 'manifest emdashVersion %s does not match the pinned dependency %s' \
			"${emdash_version:-missing}" "$pinned_emdash_version"
	fi
	if ! printf '%s' "$migration_count" | grep -qE '^[0-9]+$' || [ "$migration_count" -lt 1 ]; then
		fail_stage S4 'manifest migration set is empty or missing'
	fi
	if ! printf '%s' "$set_fp" | grep -qE '^[0-9a-f]{64}$'; then
		fail_stage S4 'manifest migration-set fingerprint is missing or not a SHA-256 value'
	fi
	if [ "$db_type" != 'postgres' ]; then
		fail_stage S4 'manifest database type %s is not the native postgres adapter' "${db_type:-missing}"
	fi
	if [ "$env_name" != "$EXPECTED_MIGRATION_ENV_NAME" ]; then
		fail_stage S4 'manifest migration connection variable is %s, expected the NAME %s' \
			"${env_name:-missing}" "$EXPECTED_MIGRATION_ENV_NAME"
	fi
	if [ -n "$url_like" ]; then
		fail_stage S4 'manifest contains a URL-like string; the native manifest must be secret-free'
	fi
	if [ -n "$secret_keys" ]; then
		fail_stage S4 'manifest contains secret-looking key(s): %s' "$secret_keys"
	fi
	info S4 'manifest: emdash %s, %s migrations, migration-set fingerprint %s' \
		"$emdash_version" "$migration_count" "$set_fp"
	pass S4 'exact-build native .emdash/migrations.json identity, checksum inputs, and secret safety verified'
}

run_emdash() {
	# run_emdash <output-file> <args...>: bounded native CLI invocation
	# against the restored target (connection through
	# EMDASH_MIGRATION_DATABASE_URL from the environment).
	local out_file="$1"
	shift
	timeout --kill-after=30 "${EMDASH_CMD_TIMEOUT_SECONDS}s" \
		npx --no-install emdash "$@" >"$out_file" 2>"$out_file.err"
}

parse_status_json() {
	# parse_status_json <status-json-file>: sets STATUS_KIND, STATUS_LABEL,
	# STATUS_FINGERPRINT, STATUS_APPLIED, STATUS_PENDING, STATUS_UNKNOWN
	# from the native JSON report (stdout of --status --json).
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

migration_gate() {
	# status -> fingerprint-guarded apply -> check, against the RESTORED
	# target, exactly as the accepted T013 authority sequences it.
	local status_file="$TMP_DIR/emdash-status-before.json"
	if ! run_emdash "$status_file" migrate --status --json; then
		print_tail 'emdash migrate --status diagnostics' "$status_file.err"
		fail_stage S4 'native emdash migrate --status failed against the restored target'
	fi
	if ! parse_status_json "$status_file"; then
		print_tail 'emdash migrate --status report' "$status_file"
		fail_stage S4 'the native status report is not the expected JSON shape'
	fi

	if [ "$STATUS_KIND" != 'postgres' ]; then
		fail_stage S4 'inspected restored migration target kind is %s, expected postgres' "${STATUS_KIND:-missing}"
	fi
	if ! printf '%s' "$STATUS_FINGERPRINT" | grep -qE '^[0-9a-f]{64}$'; then
		fail_stage S4 'inspected restored-target fingerprint is missing or not a SHA-256 value'
	fi

	# The native postgres target label is host:port/database built from the
	# migration connection URL's identity; it must agree with the identity
	# proven in S1 (the AGREED normalized form), so the inspected target is
	# the restored database and not some other target.
	local expected_label="${AGREED_HOST}:${AGREED_PORT}/${AGREED_DATABASE}"
	if [ "$STATUS_LABEL" != "$expected_label" ]; then
		fail_stage S4 'inspected target label %s does not match the restored target identity %s' \
			"${STATUS_LABEL:-missing}" "$expected_label"
	fi
	if [ "$STATUS_UNKNOWN" -ne 0 ]; then
		fail_stage S4 'the restored target reports %s unknown applied migration(s); this is not an acceptable target state for the exact build manifest' \
			"$STATUS_UNKNOWN"
	fi
	info S4 'restored target inspected: %s %s' "$STATUS_KIND" "$STATUS_LABEL"
	info S4 'restored-target fingerprint (sha256 of the non-secret target identity): %s' "$STATUS_FINGERPRINT"
	info S4 'migration state before apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"

	local apply_file="$TMP_DIR/emdash-apply.json"
	if ! run_emdash "$apply_file" migrate --expected-target-fingerprint "$STATUS_FINGERPRINT"; then
		print_tail 'emdash migrate apply diagnostics' "$apply_file.err"
		fail_stage S4 'native emdash migrate apply failed against the restored target (fingerprint guard or migration error)'
	fi

	local after="$TMP_DIR/emdash-status-after.json"
	if ! run_emdash "$after" migrate --status --json; then
		print_tail 'emdash migrate --status diagnostics' "$after.err"
		fail_stage S4 'post-apply status inspection failed'
	fi
	if ! parse_status_json "$after"; then
		fail_stage S4 'the post-apply status report is not the expected JSON shape'
	fi
	if [ "$STATUS_PENDING" -ne 0 ] || [ "$STATUS_UNKNOWN" -ne 0 ]; then
		fail_stage S4 'after apply against the restored target, migrations remain pending=%s unknown=%s; pending or unknown state blocks acceptance' \
			"$STATUS_PENDING" "$STATUS_UNKNOWN"
	fi
	info S4 'migration state after apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"

	local check_file="$TMP_DIR/emdash-check.out"
	local rc=0
	run_emdash "$check_file" migrate --check || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'emdash migrate --check diagnostics' "$check_file.err"
		fail_stage S4 'emdash migrate --check failed (exit %s: pending or unknown migrations remain against the restored target, or an error occurred)' "$rc"
	fi
	info S4 'emdash migrate --check: no pending and no unknown migrations against the restored target (exit 0; applies nothing)'
	pass S4 'exact-build manifest identity + native status -> inspected-fingerprint-guarded apply -> check passed against the restored target'
}

# ---------------------------------------------------------------------------
# S5 — restored-foundation integrity comparison (T027 authority)
# ---------------------------------------------------------------------------

run_comparator() {
	# The exact tagline value/digest comparison through the intended native
	# retrieval boundary and every designated media path/size/SHA-256
	# comparison belong to the T027 comparator. This harness deliberately
	# does not read the tagline or media bytes itself: feeding the
	# comparator the validated Recovery Set (S2 pinned its expected
	# evidence to the canonical T015 anchor) and requiring exit 0 keeps the
	# native-retrieval and no-substitution checks with their owner while
	# still blocking acceptance on any wrong/missing tagline or
	# missing/changed media item.
	local out_file="$TMP_DIR/comparator.out"
	local rc=0
	timeout --kill-after=30 "${COMPARATOR_TIMEOUT_SECONDS}s" \
		node "$ROOT/$COMPARATOR_SCRIPT" >"$out_file" 2>"$out_file.err" || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'comparator diagnostics' "$out_file.err"
		print_tail 'comparator output' "$out_file"
		fail_stage S5 'the T027 restored-foundation comparator failed (exit %s): a wrong or missing tagline value/digest, a missing or changed designated media item, or an unknown migration state blocks recovery acceptance' \
			"$rc"
	fi
	print_tail 'comparator output' "$out_file" 5
	pass S5 'T027 comparator exited 0: exact canonical T015 tagline value/digest and every designated media path/size/SHA-256 recovered with zero unexplained differences'
}

# ---------------------------------------------------------------------------
# S6 — independent runtime-secret acceptance (missing-secret failure)
# ---------------------------------------------------------------------------

check_secret_pgpassword() {
	if [ -z "${PGPASSWORD:-}" ]; then
		fail_stage S6 'missing required runtime secret: PGPASSWORD (field name only; the value is never printed) — recovery acceptance is blocked even though the Recovery Set and restore checks passed; runtime secrets are recovered separately from the database/media artifacts'
	fi
	pass S6 'PGPASSWORD present (name-only check)'
}

check_secret_migration_credential() {
	# The password inside EMDASH_MIGRATION_DATABASE_URL: parsed inside the
	# node process from the environment; only the presence result is
	# printed. Never the URL, never the password.
	local state
	state="$(node -e '
		let parsed;
		try {
			parsed = new URL(process.env.EMDASH_MIGRATION_DATABASE_URL);
		} catch {
			console.log("missing");
			process.exit(0);
		}
		console.log(parsed.password ? "present" : "missing");
	')"
	if [ "$state" != 'present' ]; then
		fail_stage S6 'missing required runtime secret: the password inside EMDASH_MIGRATION_DATABASE_URL (field name only; the URL and value are never printed) — recovery acceptance is blocked even though the Recovery Set and restore checks passed'
	fi
	pass S6 'migration connection credential present inside EMDASH_MIGRATION_DATABASE_URL (name-only check)'
}

check_secret_encryption_key() {
	# EMDASH_ENCRYPTION_KEY must be present AND structurally usable in the
	# documented EmDash key format, per the accepted T023 §8.3.3 K1 check
	# (one complete key/list line; per element the literal prefix
	# emdash_enc_v1_ followed by exactly 43 canonical unpadded-base64url
	# characters; comma-separated key lists allowed; a noncanonical final
	# encoding rejected by the decode/re-encode round trip the pinned
	# EmDash parser performs). The value is materialized only into a
	# mode-0600 scratch file inside this run's own mktemp directory, every
	# intermediate artifact lives in an owner-private scratch directory,
	# and the checks print nothing but fixed refusal messages naming the
	# field — never the value.
	if [ -z "${EMDASH_ENCRYPTION_KEY:-}" ]; then
		fail_stage S6 'missing required runtime secret: EMDASH_ENCRYPTION_KEY (field name only; the value is never printed) — recovery acceptance is blocked even though the Recovery Set and restore checks passed'
	fi
	local material="$TMP_DIR/key.material"
	(umask 077 && printf '%s' "$EMDASH_ENCRYPTION_KEY" >"$material")

	local k1_rc=0
	(
		k1_refuse() { printf '%s\n' "$1" >&2; exit 1; }

		# Invocation-local cleanup state, initialized before any trap is
		# installed: nothing is eligible for deletion until this
		# invocation's own checked scratch creation succeeds and is
		# validated into the k1. namespace.
		scratch=''

		k1_cleanup() {
			crc=0
			if [ -n "$scratch" ] && [ -d "$scratch" ]; then
				local artifact
				for artifact in dump line body expect std raw enc nopad url; do
					rm -f -- "$scratch/$artifact" >/dev/null 2>&1 || crc=1
				done
				rmdir -- "$scratch" >/dev/null 2>&1 || crc=1
			fi
			return "$crc"
		}
		trap 'st=$?; k1_cleanup || { [ "$st" -eq 0 ] && st=1; }; exit $st' EXIT
		trap 'exit 130' INT TERM HUP

		[ -f "$material" ] && [ -r "$material" ] || k1_refuse 'EMDASH_ENCRYPTION_KEY usability check could not read its private staging copy'
		nr=$(awk 'END{print NR}' "$material" 2>/dev/null) || k1_refuse 'EMDASH_ENCRYPTION_KEY usability check could not read its private staging copy'
		case "$nr" in '' | *[!0-9]*) k1_refuse 'EMDASH_ENCRYPTION_KEY usability check produced no usable result' ;; esac
		[ "$nr" -eq 1 ] || k1_refuse 'EMDASH_ENCRYPTION_KEY is not a single complete key/list line'

		umask 077
		sdir=$(dirname -- "$material" 2>/dev/null) || k1_refuse 'EMDASH_ENCRYPTION_KEY staging directory could not be determined'
		case "$sdir" in /*) ;; *) k1_refuse 'EMDASH_ENCRYPTION_KEY staging path must be absolute' ;; esac
		cand=$(mktemp -d "$sdir/k1.XXXXXX" 2>/dev/null) || k1_refuse 'EMDASH_ENCRYPTION_KEY scratch directory could not be created'
		case "$cand" in
		"$sdir"/k1.??*) scratch=$cand ;;
		*) k1_refuse 'EMDASH_ENCRYPTION_KEY scratch path is outside the expected namespace - nothing is deleted; inspect and remove it manually' ;;
		esac

		# Byte-safe whitelist: od dumps every byte exactly — NUL included —
		# and every dumped byte pair must belong to the permitted set (key
		# alphabet, comma, hyphen, newline).
		od -An -v -tx1 "$material" >"$scratch/dump" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY byte check could not read its private staging copy'
		awk 'BEGIN { ok = 1 }
		     { for (i = 1; i <= NF; i++) if ($i !~ /^(0a|2c|2d|3[0-9]|4[1-9a-f]|5[0-9a]|5f|6[1-9a-f]|7[0-9a])$/) ok = 0 }
		     END { exit !ok }' "$scratch/dump" 2>/dev/null ||
			k1_refuse 'EMDASH_ENCRYPTION_KEY byte check failed: forbidden byte present'

		# Structural format: prefix + 43 base64url characters per element,
		# comma-separated.
		line=$(cat "$material" 2>/dev/null) || k1_refuse 'EMDASH_ENCRYPTION_KEY structural check could not read its private staging copy'
		printf '%s\n' "$line" >"$scratch/line" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY structural check input could not be prepared'
		LC_ALL=C grep -qxE 'emdash_enc_v1_[A-Za-z0-9_-]{43}(,emdash_enc_v1_[A-Za-z0-9_-]{43})*' "$scratch/line" 2>/dev/null ||
			k1_refuse 'EMDASH_ENCRYPTION_KEY structural format check failed (expected emdash_enc_v1_ + 43 canonical base64url characters per element)'

		# Canonical encoding per element: URL-to-standard translation,
		# decoding, encoding, padding/newline removal, standard-to-URL
		# translation — each stage's own status checked immediately — and
		# only after every stage succeeded, the exact-equality comparison
		# (which also fixes the decoded length at exactly 32 bytes).
		oldIFS=$IFS
		IFS=,
		set -f
		for elem in $line; do
			body=${elem#emdash_enc_v1_}
			printf '%s=' "$body" >"$scratch/body" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY canonical check input could not be prepared'
			printf '%s' "$body" >"$scratch/expect" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY canonical comparison input could not be prepared'
			tr -- '-_' '/+' <"$scratch/body" >"$scratch/std" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY URL-to-standard translation failed'
			base64 -d <"$scratch/std" >"$scratch/raw" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY base64 decoding failed'
			base64 <"$scratch/raw" >"$scratch/enc" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY base64 encoding failed'
			tr -d '\n=' <"$scratch/enc" >"$scratch/nopad" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY padding removal failed'
			tr -- '/+' '-_' <"$scratch/nopad" >"$scratch/url" 2>/dev/null || k1_refuse 'EMDASH_ENCRYPTION_KEY standard-to-URL translation failed'
			cmp -s "$scratch/expect" "$scratch/url" || k1_refuse 'EMDASH_ENCRYPTION_KEY contains a noncanonical key element encoding'
		done
		IFS=$oldIFS
		set +f
	) || k1_rc=$?
	rm -f -- "$material"
	if [ "$k1_rc" -ne 0 ]; then
		fail_stage S6 'unusable required runtime secret: EMDASH_ENCRYPTION_KEY (failed the documented T023 K1 format/usability check; the value is never printed) — recovery acceptance is blocked even though the Recovery Set and restore checks passed'
	fi
	pass S6 'EMDASH_ENCRYPTION_KEY present and structurally usable in the documented emdash_enc_v1_ format (T023 K1 check; name-only evidence)'
}

# ---------------------------------------------------------------------------
# main flow
# ---------------------------------------------------------------------------

run_verification() {
	# P0 — RED prerequisite, before any tool or input is required.
	check_recovery_implementations

	require_tools
	info main 'node %s' "$(node --version)"
	validate_inputs

	# S1 — inputs, restore-target identity agreement, source protection:
	# all fail-closed before any external mutation.
	migration_url_identity >"$TMP_DIR/url-identity.txt"
	check_identity_agreement "$TMP_DIR/url-identity.txt"
	check_source_store_protection

	# S2 — Recovery Set pre-restore validation; no restore attempt before
	# this passes.
	validate_recovery_set

	# S3 — error-stopping restore into the clean target + persistence.
	run_restore
	check_restored_media_persistence

	# S4 — exact-build manifest identity + native migration gate against
	# the restored target.
	build_application
	inspect_manifest .emdash/migrations.json
	migration_gate

	# S5 — restored-foundation integrity comparison.
	run_comparator

	# S6 — independent runtime-secret acceptance (last: secrets are
	# restored separately, before operational-use acceptance).
	check_secret_pgpassword
	check_secret_migration_credential
	check_secret_encryption_key

	printf 't024: ================================================================\n'
	printf 't024: T024 recovery verification: PASS\n'
	if [ -n "${SONGHEALTH_T024_TEST_ROOT:-}" ]; then
		printf 't024: SELF-TEST SCRATCH RUN against stub implementations: this is a control-flow demonstration ONLY and is NOT runtime recovery acceptance\n'
	else
		printf 't024: Recovery Set validated pre-restore; error-stopping restore into the clean target verified; exact-build migration gate passed\n'
		printf 't024: canonical T015 tagline value/digest and designated media verified through the T027 comparator; runtime secrets independently accepted\n'
	fi
	printf 't024: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')"
	printf 't024: final acceptance belongs to the T028 recovery drill, independent Codex review, and the Product Owner\n'
	printf 't024: ================================================================\n'
}

main() {
	local action="${1:-}"
	if [ "$#" -gt 0 ]; then
		case $action in
		-h | --help | help)
			usage
			return 0
			;;
		--self-test)
			self_test
			return $?
			;;
		*)
			usage >&2
			die "$EXIT_USAGE" "unexpected argument(s): $* (this harness takes no arguments except --self-test)"
			;;
		esac
	fi

	# The self-test scratch-root override is an internal contract used only
	# by this script's own --self-test scenario children; a real
	# verification run never sets it.
	if [ -n "${SONGHEALTH_T024_TEST_ROOT:-}" ]; then
		ROOT="$(cd "$SONGHEALTH_T024_TEST_ROOT" && pwd)"
	else
		ROOT="$REAL_ROOT"
	fi
	cd "$ROOT"

	TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/t024-recovery.XXXXXX")"
	trap cleanup EXIT

	run_verification
}

# ---------------------------------------------------------------------------
# --self-test: isolated synthetic scenario suite (controlled stubs only)
# ---------------------------------------------------------------------------
#
# Everything below runs entirely under one scratch directory in TMPDIR:
# synthetic non-confidential Recovery Set fixtures, PATH-shimmed controlled
# stubs for pg_restore/npm/npx/emdash, stub stand-ins for the three
# T025–T027 implementation scripts (clearly marked as controlled stubs),
# synthetic sentinel secret values whose strings must never appear in any
# captured output, per-scenario ordering proofs via stub call logs, and a
# repository no-mutation proof. A stubbed success demonstrates harness
# control flow ONLY — never runtime recovery acceptance — and the positive
# banner says exactly that.

self_test() {
	local self
	self="$REAL_ROOT/tests/operations/$(basename "${BASH_SOURCE[0]}")"
	local orig_path="$PATH"
	local failures=0 total=0
	# st is deliberately NOT local: the EXIT trap fires after self_test has
	# returned, when its locals no longer exist (same for cleanup_done).
	st=''

	st="$(mktemp -d "${TMPDIR:-/tmp}/t024-recovery-selftest.XXXXXX")" || return 1
	# The cleanup-done flag must NOT be local: the EXIT trap fires after
	# self_test has returned, when its locals no longer exist.
	cleanup_done=0
	st_cleanup() {
		if [ "${cleanup_done:-0}" -eq 1 ]; then
			return 0
		fi
		cleanup_done=1
		if [ -n "${st:-}" ]; then
			rm -rf -- "$st"
		fi
	}
	trap st_cleanup EXIT
	trap 'st_cleanup; exit 130' INT TERM HUP

	local st_root="$st/repo" st_bin="$st/bin" st_calls="$st/calls" st_fix="$st/fixtures"
	mkdir -p "$st_root/scripts" "$st_bin" "$st_calls" "$st_fix"

	# Repository no-mutation baseline (the real checkout may contain this
	# harness as an untracked file; it must be unchanged by the self-test).
	git -C "$REAL_ROOT" status --porcelain >"$st/repo-status.before" 2>/dev/null || : >"$st/repo-status.before"

	# --- synthetic sentinel secret values (format-valid where validity is
	# required; their strings must never appear in captured output).
	local sentinel_pg='SENTINEL-PGPASSWORD-t024'
	local sentinel_migpw='SENTINEL-MIGPW-t024'
	local sentinel_enckey_malformed='SENTINEL-ENCKEY-MALFORMED-t024'
	# 32 distinctive bytes -> canonical emdash_enc_v1_ key material.
	local sentinel_enckey
	sentinel_enckey="emdash_enc_v1_$(printf 't024sentinelenckeypattern0000001' | base64 | tr -- '/+' '-_' | tr -d '=')"
	printf '%s\n%s\n%s\n%s\n' "$sentinel_pg" "$sentinel_migpw" "$sentinel_enckey" "$sentinel_enckey_malformed" >"$st/sentinels"

	# --- scratch repository: real package.json (pinned-version authority
	# for the S4 manifest identity check) + stub implementation scripts.
	cp "$REAL_ROOT/package.json" "$st_root/package.json"

	cat >"$st_root/scripts/$(basename "$BACKUP_SCRIPT")" <<'EOF'
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): stands in for the future T025
# backup procedure. The harness never invokes it (backup creation precedes
# verification); this stub only records any unexpected invocation.
set -u
printf 'backup-foundation %s\n' "$*" >>"${ST_CALLS:?}/backup-foundation.calls"
printf 't025-stub: backup authority present (controlled stub)\n'
EOF
	cat >"$st_root/scripts/$(basename "$RESTORE_SCRIPT")" <<'EOF'
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): stands in for the future T026
# restore procedure. Success materializes the fixture media into the clean
# restore mount; STUB_RESTORE_MODE=fail simulates an error-stopping
# pg_restore failure.
set -u
printf 'restore-foundation %s\n' "$*" >>"${ST_CALLS:?}/restore-foundation.calls"
if [ "${STUB_RESTORE_MODE:-ok}" != ok ]; then
	printf 't026-stub: restore FAILED (controlled failure): pg_restore: error: out of memory\n' >&2
	exit 3
fi
mkdir -p "${SONGHEALTH_RESTORE_MEDIA_MOUNT:?}" || exit 3
cp -a "${ST_MEDIA_SRC:?}/." "${SONGHEALTH_RESTORE_MEDIA_MOUNT:?}/" || exit 3
printf 't026-stub: restore: PASS (controlled stub; unfiltered error-stopping restore simulation)\n'
exit 0
EOF
	cat >"$st_root/scripts/$(basename "$COMPARATOR_SCRIPT")" <<'EOF'
// Controlled stub (T024 self-test ONLY): stands in for the future T027
// restored-foundation comparator. ESM module syntax: the real T027 script
// is an .mjs run through node.
import fs from "node:fs";
fs.appendFileSync(`${process.env.ST_CALLS}/verify-restored-foundation.calls`, "verify-restored-foundation invoked\n");
if (process.env.STUB_COMPARATOR_MODE === "fail") {
	console.error("t027-stub: comparator FAILED (controlled failure): restored tagline digest mismatch");
	process.exit(1);
}
console.log("t027-stub: tagline: exact value + SHA-256 match (controlled stub)");
console.log("t027-stub: media: 100% designated entries matched; 0 unexplained differences (controlled stub)");
EOF
	chmod +x "$st_root/scripts/$(basename "$BACKUP_SCRIPT")" "$st_root/scripts/$(basename "$RESTORE_SCRIPT")"

	# --- PATH-shimmed controlled tool stubs.
	cat >"$st_bin/pg_restore" <<'EOF'
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): mimics the documented PostgreSQL
# pg_restore behavior the harness relies on — --list prints the archive
# table of contents and fails on a missing/unreadable input or a file
# without the custom-format PGDMP magic. The harness must invoke --list
# with no filter flags; any other mode is refused.
set -u
printf 'pg_restore %s\n' "$*" >>"${ST_CALLS:?}/pg_restore.calls"
list=no
file=''
for a in "$@"; do
	case "$a" in
	--list | -l) list=yes ;;
	-*) : ;;
	*) file="$a" ;;
	esac
done
[ "$list" = yes ] || { printf 'pg_restore-stub: unsupported mode (the harness must use --list only)\n' >&2; exit 2; }
if [ -z "$file" ] || [ ! -r "$file" ]; then
	printf 'pg_restore: error: could not read input file\n' >&2
	exit 1
fi
magic="$(head -c 5 -- "$file" 2>/dev/null || true)"
if [ "$magic" != 'PGDMP' ]; then
	printf 'pg_restore: error: did not find magic string in file header\n' >&2
	exit 1
fi
printf '; Version: 18.6 (controlled-stub TOC)\n;\n4; 2615 1 SCHEMA - public emdash\n9; 2610 1 DATABASE emdash postgres\n9; 2610 2 TABLE settings emdash\n'
exit 0
EOF
	cat >"$st_bin/emdash" <<EOF
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): mimics the documented EmDash 1.1.0
# migrate CLI surface the accepted T013 gate uses. Modes via
# STUB_EMDASH_MODE: ok | fail-status | fail-apply | fail-check | unknown |
# leave-pending (post-apply re-inspection still reports a pending
# migration). Target label comes from ST_EMDASH_LABEL so the harness's
# inspected-label agreement check runs for real.
set -u
calls="\${ST_CALLS:?}/emdash.calls"
printf 'emdash %s\n' "\$*" >>"\$calls"
mode="\${STUB_EMDASH_MODE:-ok}"
label="\${ST_EMDASH_LABEL:?}"
fp='1111111111111111111111111111111111111111111111111111111111111111'
n="\$(wc -l <"\$calls" 2>/dev/null || printf '0')"
n="\${n//[[:space:]]/}"
[ "\${1:-}" = migrate ] || { printf 'emdash-stub: unsupported subcommand\n' >&2; exit 2; }
case "\${2:-}" in
--status)
	[ "\$mode" = fail-status ] && { printf 'emdash-stub: status failed (controlled failure)\n' >&2; exit 1; }
	pending='[]'
	unknown='[]'
	[ "\$mode" = unknown ] && unknown='["999_alien_migration"]'
	if [ "\$mode" = leave-pending ] && [ "\$n" -ge 2 ]; then pending='["091_redirect_artifacts"]'; fi
	printf '{"target":{"kind":"postgres","label":"%s","fingerprint":"%s"},"knownApplied":["001_initial","002_settings","003_media"],"pending":%s,"unknownApplied":%s}\n' "\$label" "\$fp" "\$pending" "\$unknown"
	exit 0
	;;
--expected-target-fingerprint)
	[ "\$mode" = fail-apply ] && { printf 'emdash-stub: apply failed (controlled failure): fingerprint guard or migration error\n' >&2; exit 1; }
	exit 0
	;;
--check)
	[ "\$mode" = fail-check ] && { printf 'emdash-stub: check failed (controlled failure): pending migrations remain\n' >&2; exit 1; }
	exit 0
	;;
*)
	printf 'emdash-stub: unsupported invocation\n' >&2
	exit 2
	;;
esac
EOF
	cat >"$st_bin/npm" <<'EOF'
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): stands in for `npm run build`,
# emitting a synthetic exact-build native migration manifest whose
# emdashVersion is read from the REAL package.json pin, so the harness's
# manifest-identity check runs against the real authority value.
set -u
printf 'npm %s\n' "$*" >>"${ST_CALLS:?}/npm.calls"
[ "${1:-}" = run ] && [ "${2:-}" = build ] || { printf 'npm-stub: unsupported invocation\n' >&2; exit 1; }
mkdir -p .emdash dist/server || exit 1
pin="$(node -p 'require("./package.json").dependencies.emdash')" || exit 1
node -e '
	const pin = process.argv[1];
	const names = Array.from({ length: 90 }, (_, i) => `${String(i + 1).padStart(3, "0")}_migration`);
	const m = {
		schemaVersion: 1,
		emdashVersion: pin,
		migrationSet: { names, fingerprint: "2222222222222222222222222222222222222222222222222222222222222222" },
		database: { type: "postgres", executorConfig: { connectionStringEnv: "EMDASH_MIGRATION_DATABASE_URL" } },
	};
	require("fs").writeFileSync(".emdash/migrations.json", JSON.stringify(m, null, 2) + "\n");
' "$pin" || exit 1
: >dist/server/entry.mjs || exit 1
printf 'npm-stub: synthetic exact-build manifest emitted (controlled stub)\n'
exit 0
EOF
	cat >"$st_bin/npx" <<'EOF'
#!/usr/bin/env bash
# Controlled stub (T024 self-test ONLY): stands in for `npx --no-install
# emdash ...` by dispatching to the PATH-shimmed emdash stub.
set -u
printf 'npx %s\n' "$*" >>"${ST_CALLS:?}/npx.calls"
[ "${1:-}" = --no-install ] && shift
[ "${1:-}" = emdash ] || { printf 'npx-stub: unsupported invocation\n' >&2; exit 1; }
shift
exec emdash "$@"
EOF
	chmod +x "$st_bin/pg_restore" "$st_bin/emdash" "$st_bin/npm" "$st_bin/npx"

	# --- synthetic Recovery Set fixtures (builder: variant -> fixture dir).
	build_set() {
		# build_set <dir> <variant>
		local dir="$1" variant="$2"
		mkdir -p "$dir/media-src/assets"
		printf 'PGDMP-songhealth-t024-synthetic-custom-format-database-archive-fixture-payload\n' >"$dir/database.dump"
		printf 'synthetic public-publishable validation media A (t024 self-test fixture)\n' >"$dir/media-src/assets/validation-a.txt"
		head -c 139 /dev/zero | tr '\0' 'B' >"$dir/media-src/assets/validation-b.png"
		tar --create --file "$dir/media.tar" --directory "$dir/media-src" . >/dev/null 2>&1
		local db_sha media_sha entries='[]'
		db_sha="$(sha256sum "$dir/database.dump" | awk '{print $1}')"
		media_sha="$(sha256sum "$dir/media.tar" | awk '{print $1}')"
		entries="$(node -e '
			const fs = require("fs");
			const path = process.argv[1];
			const entries = [];
			for (const name of fs.readdirSync(`${path}/assets`)) {
				const p = `assets/${name}`;
				const buf = fs.readFileSync(`${path}/assets/${name}`);
				entries.push({ path: p, size: buf.length, sha256: require("crypto").createHash("sha256").update(buf).digest("hex") });
			}
			process.stdout.write(JSON.stringify(entries));
		' "$dir/media-src")"
		case $variant in
		no-media) rm -f "$dir/media.tar" ;;
		corrupt-db)
			printf 'this-is-not-a-custom-format-pgdump-archive-it-is-garbage-for-the-corrupt-fixture\n' >"$dir/database.dump"
			db_sha="$(sha256sum "$dir/database.dump" | awk '{print $1}')"
			;;
		corrupt-media)
			printf 'not-a-tar-archive-garbage-for-the-corrupt-media-fixture\n' >"$dir/media.tar"
			media_sha="$(sha256sum "$dir/media.tar" | awk '{print $1}')"
			;;
		sha-mismatch) media_sha="$(printf '%064d' 0)" ;;
		anchor-mismatch) ;;
		entry-missing) entries='[{"path":"assets/absent-from-archive.txt","size":1,"sha256":"0000000000000000000000000000000000000000000000000000000000000000"}]' ;;
		traversal-db-file) ;;
		esac
		local tagline_sha="$TAGLINE_EXPECTED_SHA256"
		local db_file='database.dump'
		case $variant in
		anchor-mismatch) tagline_sha="$(printf '%064d' 1 | tr '01' 'ab')" ;;
		traversal-db-file) db_file='../database.dump' ;;
		esac
		node -e '
			const [out, dbFile, dbSha, mediaSha, entriesJson, taglineSha] = process.argv.slice(1);
			const m = {
				recoverySetId: "t024-selftest-recovery-set",
				createdAt: "2026-10-11T00:00:00Z",
				database: { file: dbFile, format: "custom", sha256: dbSha },
				media: { file: "media.tar", sha256: mediaSha, entries: JSON.parse(entriesJson) },
				expected: { taglineValue: process.argv[7], taglineSha256: taglineSha },
			};
			require("fs").writeFileSync(out, JSON.stringify(m, null, 2) + "\n");
		' "$dir/$RECOVERY_MANIFEST_NAME" "$db_file" "$db_sha" "$media_sha" "$entries" "$tagline_sha" "$TAGLINE_EXPECTED"
	}
	build_set "$st_fix/good" good
	build_set "$st_fix/no-media" no-media
	build_set "$st_fix/corrupt-db" corrupt-db
	build_set "$st_fix/corrupt-media" corrupt-media
	build_set "$st_fix/sha-mismatch" sha-mismatch
	build_set "$st_fix/anchor-mismatch" anchor-mismatch
	build_set "$st_fix/entry-missing" entry-missing
	build_set "$st_fix/traversal" traversal-db-file

	# The unreadable-database fixture reuses the good set with mode 000.
	chmod 000 "$st_fix/good/database.dump"

	# The active SOURCE media mount (a distinct scratch store the harness
	# must never touch) and the clean restore mount parent.
	mkdir -p "$st/source-media-mount" "$st/restore-media-mount"
	printf 'active source media (must never be a recovery target)\n' >"$st/source-media-mount/active-source-asset.txt"
	local source_media_digest_before
	source_media_digest_before="$(find "$st/source-media-mount" -type f -exec sha256sum {} + | sort)"

	# --- base child environment.
	local base_env=()
	base_env+=("HOME=$HOME")
	base_env+=("PATH=$st_bin:$orig_path")
	base_env+=("SONGHEALTH_T024_TEST_ROOT=$st_root")
	base_env+=("SONGHEALTH_RECOVERY_DIR=$st_fix/good")
	base_env+=('PGHOST=restore.local')
	base_env+=('PGPORT=5532')
	base_env+=('PGDATABASE=songhealth_restore')
	base_env+=('PGUSER=songhealth')
	base_env+=("PGPASSWORD=$sentinel_pg")
	base_env+=("EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth:$sentinel_migpw@restore.local:5532/songhealth_restore")
	base_env+=("EMDASH_ENCRYPTION_KEY=$sentinel_enckey")
	base_env+=('EMDASH_SITE_URL=http://restore.local:8080')
	base_env+=('SONGHEALTH_SOURCE_DB_IDENTITY=source.local:5432/songhealth')
	base_env+=("SONGHEALTH_SOURCE_MEDIA_MOUNT=$st/source-media-mount")
	base_env+=("SONGHEALTH_RESTORE_MEDIA_MOUNT=$st/restore-media-mount")
	base_env+=("ST_CALLS=$st_calls")
	base_env+=("ST_MEDIA_SRC=$st_fix/good/media-src")
	base_env+=('ST_EMDASH_LABEL=restore.local:5532/songhealth_restore')
	base_env+=('STUB_EMDASH_MODE=ok')
	base_env+=('STUB_RESTORE_MODE=ok')
	base_env+=('STUB_COMPARATOR_MODE=ok')

	local CASE_ENV=()
	local EXTRA_FLAGS=()

	set_case_env() {
		local k="$1" v="$2" e
		local out=()
		for e in "${CASE_ENV[@]}"; do
			case $e in
			"$k="*) ;;
			*) out+=("$e") ;;
			esac
		done
		out+=("$k=$v")
		CASE_ENV=("${out[@]}")
	}

	unset_case_env() {
		# removes a variable from the child environment entirely (a later
		# NAME=VALUE word would defeat `env -u NAME`)
		local k="$1" e
		local out=()
		for e in "${CASE_ENV[@]}"; do
			case $e in
			"$k="*) ;;
			*) out+=("$e") ;;
			esac
		done
		CASE_ENV=("${out[@]}")
	}

	reset_case_env() {
		EXTRA_FLAGS=()
		CASE_ENV=("${base_env[@]}")
		# Per-case stub call logs are cleared here so "not called" ordering
		# assertions reflect THIS case's child run only. The backup stub's
		# log is deliberately NEVER cleared: the global assertion at the
		# end proves the harness never invokes the backup authority in any
		# scenario.
		local name
		for name in pg_restore restore-foundation verify-restored-foundation emdash npm npx; do
			: >"$st_calls/$name.calls" 2>/dev/null || true
		done
	}

	local current_case='' child_rc=0
	st_case() {
		# st_case <name> <ok|fail> <detail>
		local name="$1" outcome="$2" detail="$3"
		total=$((total + 1))
		if [ "$outcome" = ok ]; then
			printf '[self-test] case %-26s PASS  %s\n' "$name" "$detail"
		else
			printf '[self-test] case %-26s FAIL  %s\n' "$name" "$detail"
			failures=$((failures + 1))
		fi
	}

	run_child() {
		# any arguments are forwarded to the child harness invocation
		local prefix="$st/out/$current_case"
		mkdir -p "$st/out"
		child_rc=0
		env -i "${EXTRA_FLAGS[@]+"${EXTRA_FLAGS[@]}"}" "${CASE_ENV[@]}" \
			bash "$self" "$@" >"$prefix.out" 2>"$prefix.err" || child_rc=$?
	}

	expect_rc() {
		local want="$1"
		if [ "$child_rc" -eq "$want" ]; then
			return 0
		fi
		printf '[self-test] case %s: expected exit %s, got %s\n' "$current_case" "$want" "$child_rc" >&2
		tail -n 5 "$st/out/$current_case.out" "$st/out/$current_case.err" >&2 2>/dev/null || true
		return 1
	}

	expect_output() {
		local pattern="$1"
		grep -qE -- "$pattern" "$st/out/$current_case.out" "$st/out/$current_case.err" 2>/dev/null
	}

	expect_no_output() {
		local pattern="$1"
		! grep -qE -- "$pattern" "$st/out/$current_case.out" "$st/out/$current_case.err" 2>/dev/null
	}

	expect_stub_called() {
		[ -s "$st_calls/$1.calls" ]
	}

	expect_stub_not_called() {
		! [ -s "$st_calls/$1.calls" ]
	}

	expect_no_sentinels() {
		local f
		for f in "$st/out/$current_case.out" "$st/out/$current_case.err"; do
			if grep -F -f "$st/sentinels" "$f" >/dev/null 2>&1;
				then printf '[self-test] case %s: a sentinel secret value leaked into %s\n' "$current_case" "$f" >&2
				return 1
			fi
		done
		return 0
	}

	printf 't024 self-test: isolated synthetic scenario suite under %s\n' "$st"
	printf 't024 self-test: controlled stubs only; a stubbed success demonstrates control flow, never runtime recovery acceptance\n'

	# ---- invocation contracts -------------------------------------------
	reset_case_env
	current_case='help'
	EXTRA_FLAGS=()
	CASE_ENV=("HOME=$HOME" "PATH=$orig_path")
	run_child --help
	if expect_rc 0 && expect_output '^Usage: tests/operations/verify-recovery.sh'; then
		st_case help ok 'exit 0, usage shown'
	else
		st_case help fail '--help did not exit 0 with usage'
	fi

	reset_case_env
	current_case='invalid-arg'
	CASE_ENV=("HOME=$HOME" "PATH=$orig_path")
	run_child --bogus
	if expect_rc 64 && expect_output 'unexpected argument'; then
		st_case invalid-arg ok 'invalid invocation fails closed with exit 64 before any tool, input, or mutation'
	else
		st_case invalid-arg fail 'invalid invocation did not fail closed with exit 64'
	fi

	# ---- baseline RED (real repository, no scratch root, no stubs) ------
	reset_case_env
	current_case='baseline-red'
	CASE_ENV=("HOME=$HOME" "PATH=$orig_path")
	run_child
	if expect_rc 1 && expect_output '\[P0\] FAIL' &&
		expect_output 'backup-foundation.sh' && expect_output 'restore-foundation.sh' &&
		expect_output 'verify-restored-foundation.mjs' && expect_output 'T025' &&
		expect_no_output 'syntax error|command not found'; then
		st_case baseline-red ok 'real baseline: explicit nonzero RED evidence naming exactly the absent T025–T027 sources (not a syntax/tooling failure)'
	else
		st_case baseline-red fail 'bare run at the real baseline did not produce the bounded P0 RED failure'
	fi

	# ---- S1: fail-closed inputs and source protection --------------------
	reset_case_env
	current_case='scratch-missing-inputs'
	# P0 passes against the scratch implementations; the environment carries
	# NO scenario inputs at all, so S1 must fail closed before any mutation.
	CASE_ENV=("HOME=$HOME" "PATH=$st_bin:$orig_path" "SONGHEALTH_T024_TEST_ROOT=$st_root")
	run_child
	if expect_rc 4 && expect_output 'missing required input' &&
		expect_stub_not_called restore-foundation; then
		st_case scratch-missing-inputs ok 'scratch implementations present but inputs missing: exit 4 at S1, no restore attempted'
	else
		st_case scratch-missing-inputs fail 'missing inputs did not fail closed at S1 before any mutation'
	fi

	reset_case_env
	current_case='source-db-collision'
	set_case_env SONGHEALTH_SOURCE_DB_IDENTITY 'restore.local:5532/songhealth_restore'
	run_child
	if expect_rc 4 && expect_output '\[S1\] FAIL' && expect_output 'never be recovery targets' &&
		expect_stub_not_called restore-foundation; then
		st_case source-db-collision ok 'restore target equal to the declared source database rejected at S1'
	else
		st_case source-db-collision fail 'source-database collision was not rejected'
	fi

	reset_case_env
	current_case='source-media-collision'
	set_case_env SONGHEALTH_RESTORE_MEDIA_MOUNT "$st/source-media-mount"
	run_child
	if expect_rc 4 && expect_output '\[S1\] FAIL' && expect_output 'never be recovery targets' &&
		expect_stub_not_called restore-foundation; then
		st_case source-media-collision ok 'restore media mount equal to the source media mount rejected at S1'
	else
		st_case source-media-collision fail 'source-media collision was not rejected'
	fi

	# ---- S2: Recovery Set pre-restore validation -------------------------
	reset_case_env
	current_case='set-incomplete'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/no-media"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'incomplete' &&
		expect_stub_not_called pg_restore &&
		expect_stub_not_called restore-foundation; then
		st_case set-incomplete ok 'missing media artifact: incomplete set rejected before any checksum/readability probe or restore attempt'
	else
		st_case set-incomplete fail 'incomplete Recovery Set was not rejected pre-restore'
	fi

	reset_case_env
	current_case='set-unreadable-db'
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'unreadable' &&
		expect_stub_not_called restore-foundation; then
		st_case set-unreadable-db ok 'unreadable database archive rejected before restore (mode-000 fixture)'
	else
		st_case set-unreadable-db fail 'unreadable database archive was not rejected'
	fi
	chmod 644 "$st_fix/good/database.dump"

	reset_case_env
	current_case='set-corrupt-db'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/corrupt-db"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'pg_restore --list failed' &&
		expect_output 'magic string|did not find magic' &&
		expect_stub_not_called restore-foundation; then
		st_case set-corrupt-db ok 'corrupt (non-custom-format) database archive rejected by unfiltered pg_restore --list despite a matching recorded checksum'
	else
		st_case set-corrupt-db fail 'corrupt database archive was not rejected'
	fi

	reset_case_env
	current_case='set-corrupt-media'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/corrupt-media"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'tar --list failed' &&
		expect_stub_not_called restore-foundation; then
		st_case set-corrupt-media ok 'corrupt media archive rejected by tar --list despite a matching recorded checksum'
	else
		st_case set-corrupt-media fail 'corrupt media archive was not rejected'
	fi

	reset_case_env
	current_case='set-checksum-mismatch'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/sha-mismatch"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'checksum mismatch' &&
		expect_stub_not_called pg_restore &&
		expect_stub_not_called restore-foundation; then
		st_case set-checksum-mismatch ok 'checksum-mismatched artifact rejected before readability probing and restore'
	else
		st_case set-checksum-mismatch fail 'checksum mismatch was not rejected pre-restore'
	fi

	reset_case_env
	current_case='set-anchor-mismatch'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/anchor-mismatch"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'canonical T015' &&
		expect_stub_not_called restore-foundation; then
		st_case set-anchor-mismatch ok 'expected tagline evidence that does not equal the canonical T015 value/digest rejected (no substituted anchor)'
	else
		st_case set-anchor-mismatch fail 'non-canonical tagline anchor was not rejected'
	fi

	reset_case_env
	current_case='set-entry-missing'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/entry-missing"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'does not contain the designated media entry' &&
		expect_stub_not_called restore-foundation; then
		st_case set-entry-missing ok 'manifest media entry absent from the media archive rejected (association mismatch)'
	else
		st_case set-entry-missing fail 'archive/manifest media association mismatch was not rejected'
	fi

	reset_case_env
	current_case='set-traversal-file'
	set_case_env SONGHEALTH_RECOVERY_DIR "$st_fix/traversal"
	run_child
	if expect_rc 1 && expect_output '\[S2\] FAIL' && expect_output 'basename' &&
		expect_stub_not_called restore-foundation; then
		st_case set-traversal-file ok 'manifest artifact name escaping the Recovery Set directory (path traversal) rejected'
	else
		st_case set-traversal-file fail 'path traversal in the manifest was not rejected'
	fi

	# ---- S3: error-stopping restore --------------------------------------
	reset_case_env
	current_case='restore-fails'
	set_case_env STUB_RESTORE_MODE fail
	run_child
	if expect_rc 1 && expect_output '\[S3\] FAIL' && expect_output 'error-stopping' &&
		expect_stub_called restore-foundation &&
		expect_stub_not_called emdash &&
		expect_stub_not_called verify-restored-foundation; then
		st_case restore-fails ok 'restore failure stops the scenario: no migration probe and no comparison/acceptance ran afterwards'
	else
		st_case restore-fails fail 'a failing restore did not stop subsequent success/acceptance'
	fi

	# ---- S4: migration gate failures --------------------------------------
	reset_case_env
	current_case='migration-status-fails'
	set_case_env STUB_EMDASH_MODE fail-status
	run_child
	if expect_rc 1 && expect_output '\[S4\] FAIL' && expect_output -- '--status failed' &&
		expect_stub_not_called verify-restored-foundation; then
		st_case migration-status-fails ok 'native --status failure against the restored target blocks acceptance before any comparison'
	else
		st_case migration-status-fails fail 'a status failure did not block acceptance'
	fi

	reset_case_env
	current_case='migration-unknown-state'
	set_case_env STUB_EMDASH_MODE unknown
	run_child
	if expect_rc 1 && expect_output '\[S4\] FAIL' && expect_output 'unknown applied migration' &&
		expect_stub_not_called verify-restored-foundation; then
		st_case migration-unknown-state ok 'unknown migration state on the restored target rejected before apply/comparison'
	else
		st_case migration-unknown-state fail 'an unknown migration state was not rejected'
	fi

	reset_case_env
	current_case='migration-pending-left'
	set_case_env STUB_EMDASH_MODE leave-pending
	run_child
	if expect_rc 1 && expect_output '\[S4\] FAIL' && expect_output 'remain pending=' &&
		expect_stub_not_called verify-restored-foundation; then
		st_case migration-pending-left ok 'pending migrations remaining after apply block acceptance before comparison'
	else
		st_case migration-pending-left fail 'a post-apply pending state did not block acceptance'
	fi

	reset_case_env
	current_case='migration-check-fails'
	set_case_env STUB_EMDASH_MODE fail-check
	run_child
	if expect_rc 1 && expect_output '\[S4\] FAIL' && expect_output -- '--check failed' &&
		expect_stub_not_called verify-restored-foundation; then
		st_case migration-check-fails ok 'native --check failure against the restored target blocks acceptance'
	else
		st_case migration-check-fails fail 'a check failure did not block acceptance'
	fi

	# ---- S5: comparator failure ------------------------------------------
	reset_case_env
	current_case='comparator-fails'
	set_case_env STUB_COMPARATOR_MODE fail
	run_child
	if expect_rc 1 && expect_output '\[S5\] FAIL' && expect_output 'comparator failed'; then
		st_case comparator-fails ok 'wrong/missing tagline (or changed media) reported by the comparator blocks recovery acceptance'
	else
		st_case comparator-fails fail 'a comparator failure did not block acceptance'
	fi

	# ---- S6: independent missing-secret rejection -------------------------
	# Each case keeps the Recovery Set and all stubs valid, proving the
	# secret checks fire independently of Recovery Set validity.
	reset_case_env
	current_case='secret-pgpassword-missing'
	unset_case_env PGPASSWORD
	run_child
	if expect_rc 1 && expect_output '\[S6\] FAIL' && expect_output 'missing required runtime secret: PGPASSWORD' &&
		expect_output '\[S5\] PASS'; then
		st_case secret-pgpassword-missing ok 'missing PGPASSWORD rejected at S6 although the Recovery Set, restore, and comparison all passed'
	else
		st_case secret-pgpassword-missing fail 'a missing PGPASSWORD was not independently rejected'
	fi

	reset_case_env
	current_case='secret-migcred-missing'
	set_case_env EMDASH_MIGRATION_DATABASE_URL 'postgresql://songhealth@restore.local:5532/songhealth_restore'
	run_child
	if expect_rc 1 && expect_output '\[S6\] FAIL' && expect_output 'password inside EMDASH_MIGRATION_DATABASE_URL' &&
		expect_output '\[S5\] PASS'; then
		st_case secret-migcred-missing ok 'missing migration-connection credential rejected at S6 although the set and restore checks passed'
	else
		st_case secret-migcred-missing fail 'a missing migration credential was not independently rejected'
	fi

	reset_case_env
	current_case='secret-enckey-missing'
	unset_case_env EMDASH_ENCRYPTION_KEY
	run_child
	if expect_rc 1 && expect_output '\[S6\] FAIL' && expect_output 'missing required runtime secret: EMDASH_ENCRYPTION_KEY' &&
		expect_output '\[S5\] PASS'; then
		st_case secret-enckey-missing ok 'missing EMDASH_ENCRYPTION_KEY rejected at S6 although the set and restore checks passed'
	else
		st_case secret-enckey-missing fail 'a missing encryption key was not independently rejected'
	fi

	reset_case_env
	current_case='secret-enckey-malformed'
	set_case_env EMDASH_ENCRYPTION_KEY "$sentinel_enckey_malformed"
	run_child
	if expect_rc 1 && expect_output '\[S6\] FAIL' && expect_output 'unusable required runtime secret: EMDASH_ENCRYPTION_KEY' &&
		expect_output '\[S5\] PASS'; then
		st_case secret-enckey-malformed ok 'structurally unusable EMDASH_ENCRYPTION_KEY rejected by the T023 K1 usability check (field name only)'
	else
		st_case secret-enckey-malformed fail 'a malformed encryption key was not rejected'
	fi

	# ---- positive control flow (stubs succeed) ---------------------------
	reset_case_env
	rm -rf "$st/restore-media-mount"
	mkdir -p "$st/restore-media-mount"
	current_case='positive-control-flow'
	run_child
	if expect_rc 0 && expect_output 'T024 recovery verification: PASS' &&
		expect_output 'SELF-TEST SCRATCH RUN' && expect_output 'NOT runtime recovery acceptance' &&
		expect_output '\[P0\] PASS' && expect_output '\[S1\] PASS' && expect_output '\[S2\] PASS' &&
		expect_output '\[S3\] PASS' && expect_output '\[S4\] PASS' && expect_output '\[S5\] PASS' &&
		expect_output '\[S6\] PASS' &&
		expect_stub_called pg_restore && expect_stub_called restore-foundation &&
		expect_stub_called emdash && expect_stub_called verify-restored-foundation &&
		expect_output 'canonical T015 value'; then
		st_case positive-control-flow ok 'all stages pass under controlled stubs; banner is explicitly control-flow-only, never runtime recovery acceptance'
	else
		st_case positive-control-flow fail 'the stubbed success scenario did not complete with the control-flow-only banner'
	fi

	# ---- global assertions ------------------------------------------------
	if expect_stub_not_called backup-foundation; then
		st_case backup-never-invoked ok 'the T025 backup authority is a presence-only prerequisite: never invoked by the harness in any scenario'
	else
		st_case backup-never-invoked fail 'the backup authority stub was invoked — outside this harness contract'
	fi

	local source_media_digest_after
	source_media_digest_after="$(find "$st/source-media-mount" -type f -exec sha256sum {} + | sort)"
	if [ "$source_media_digest_before" == "$source_media_digest_after" ]; then
		st_case source-store-untouched ok 'the declared active source media store is byte-identical after every scenario (never a recovery target)'
	else
		st_case source-store-untouched fail 'the active source media store changed during the self-test'
	fi

	git -C "$REAL_ROOT" status --porcelain >"$st/repo-status.after" 2>/dev/null || : >"$st/repo-status.after"
	if cmp -s "$st/repo-status.before" "$st/repo-status.after"; then
		st_case repository-unmutated ok 'the real repository working tree is unchanged by the self-test (scratch/stubs outside tracked source)'
	else
		st_case repository-unmutated fail 'the self-test mutated the repository working tree'
	fi

	printf 't024 self-test: %s scenario case(s), %s failure(s)\n' "$total" "$failures"
	if [ "$failures" -ne 0 ]; then
		printf 't024 self-test: FAIL\n' >&2
		return "$EXIT_FAIL"
	fi
	printf 't024 self-test: PASS (synthetic fixtures and controlled stubs only)\n'
	return 0
}

main "$@"
