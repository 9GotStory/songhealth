#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth backup foundation (Feature 001, T025 — Recovery Set creation).
#
# Bounded backup procedure for one quiescent known validation state
# (quickstart §7.2; plan "Backup, restore, and secret recovery"; data-model
# §6; tasks.md T025). It creates, in an operator-provided Recovery Set
# directory OUTSIDE the active persistence:
#
#   database.dump            complete UNFILTERED custom-format pg_dump archive
#                            of the whole EmDash database (no -n/-t/--table/
#                            --schema selection, no data-only/schema-only
#                            narrowing; PostgreSQL 18 reference verified via
#                            Context7 2026-10-11: custom format is the
#                            pg_restore-oriented archive format)
#   media.tar                complete separate archive of the persistent media
#                            store at the stable application path ./media
#                            (quickstart form: tar --create --directory
#                            ./media .), never read from a MEDIA_DIRECTORY
#                            runtime input (none exists)
#   recovery-manifest.json   the common association evidence of the accepted
#                            T024 S2 contract (tests/operations/
#                            verify-recovery.sh, "Recovery Set manifest
#                            contract"): { recoverySetId, createdAt,
#                            database.{file,format:"custom",sha256,size},
#                            media.{file,sha256,size,entries:[{path,size,
#                            sha256}]}, expected.{taglineValue,taglineSha256},
#                            versions } — one identifier associating both
#                            artifact classes and the expected validation
#                            evidence with the same known state.
#
# Before anything is archived the OBSERVED native EmDash Site Setting tagline
# is verified against the canonical T015 evidence (specs/001-platform-
# foundation/evidence/T015-us1-canonical-platform.md §5): exact UTF-8 value
# `Songhealth Feature 001 foundation validation`, exactly 44 bytes, no
# trailing newline, SHA-256 84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a
# 579d827a938a4415. EmDash 1.1.0 stores native site settings as JSON values
# in the native `options` table under the `site:` prefix with the tagline at
# name `site:tagline` (verified from the pinned package source, integrity-
# matched to package-lock.json) — the observation reads that native storage
# through psql, so no Admin identity, passkey metadata, or arbitrary row is
# ever used as the anchor. A database whose observed state does not match the
# canonical evidence never produces a Recovery Set.
#
# Division of ownership: this script CREATES the Recovery Set only. Restore
# (T026 scripts/restore-foundation.sh), restored-foundation comparison (T027
# scripts/verify-restored-foundation.mjs), the recovery drill (T028), and
# runtime-secret recovery (docs/operations/runtime-secret-recovery.md) are
# separate dependencies. No database mutation or restore belongs to T025.
# Runtime secrets are NOT part of the Recovery Set: nothing under T025's
# control reads a secret value, and the manifest carries no URLs and no
# secret-looking keys.
#
# Creation is SEQUENTIAL (tagline observation -> database archive -> media
# archive -> manifest) under an operator-declared quiescent state; it is not
# an atomic cross-store snapshot and no atomic/WAL/PITR/replication/
# standby/orchestration capability is added (explicitly deferred).
#
# Inputs come from the environment (never committed; never arguments):
#
#   SONGHEALTH_RECOVERY_DIR  absolute path of an EXISTING writable directory
#                            outside the active persistence; the Recovery Set
#                            is published into it. Basenames database.dump,
#                            media.tar, and recovery-manifest.json must not
#                            already exist there (existing evidence is never
#                            overwritten), and the directory must be safely
#                            separated from the media store (equal, ancestor,
#                            descendant, symlink/unresolved-tail alias, and
#                            same-device:inode relationships are all refused).
#   PGHOST/PGPORT/PGDATABASE/PGUSER
#                            the native PostgreSQL client identity inputs for
#                            the database being archived (.env.example).
#   PGPASSWORD               secret-bearing; consumed natively by libpq
#                            through the environment (or its supported
#                            protected fallback), never placed on a command
#                            line, never echoed. Auth failures fail closed
#                            with scrubbed diagnostics.
#
# The media source is NOT an environment input: it is the stable application
# mount path ./media resolved against the application root (this script's
# parent directory's parent), matching the documented development and
# production shape.
#
# Fail-closed behavior (every case exits nonzero and publishes nothing):
# missing/invalid inputs; a missing, unreadable, empty, or non-file-containing
# media store (a replacement store is never created); unsafe Recovery Set
# directory/media overlap; pre-existing artifact basenames (including as
# dangling symlinks); an unobservable, absent, or non-canonical observed
# tagline; pg_dump/psql/tar failures; empty or unreadable archives; checksum,
# entry, or manifest inconsistencies. Artifacts are staged inside the Recovery
# Set directory and renamed into place only after every validation passes
# (manifest last; each move guarded, no-clobber, and exact-destination-basename
# — a late directory or directory symlink can never become a container or a
# redirection for the artifact); a destination entry that appears after
# preflight is never clobbered, and any publish-time or post-publish
# verification failure rolls back ONLY artifacts this invocation demonstrably
# published and still owns: each artifact's device:inode object identity is
# established from the STAGED file object BEFORE the move and the landed
# object must carry exactly that identity (rename preserves it), plus the
# current digest — a post-rename destination reading is never the sole
# ownership source, and an identical-bytes replacement is a different file
# object and is refused — leaving foreign, replaced, symlinked, or ambiguous
# entries untouched, so a partial set is never left looking complete.
#
# Secret safety: this script never prints PGPASSWORD, the migration URL, the
# encryption key, or any other secret value. Redaction is structural
# (mirroring the accepted T024 harness): every published DIAGNOSTIC flows
# through publish_diag/scrub and every stdout line carrying DYNAMIC values
# (including the operator-supplied Recovery Set directory path in the final
# success message) flows through publish_out/scrub; underlying tool error
# streams (mv, sha256sum, stat, find, mktemp, cd) are captured and released
# only through the scrubbed tail, never inherited. scrub redacts every
# nonempty supplied secret regardless of length, the full migration URL, and
# the URL password's standalone (percent-encoded and decoded)
# representations; node-side JSON readers report parser failures with FIXED
# messages (the default SyntaxError echoes an excerpt of the raw input);
# errors name the failing field/resource only; invalid invocations never
# echo argument values.
#
# Exit codes: 0 PASS | 1 FAIL (any stage) | 2 environment error (missing
# tools) | 4 missing or invalid input | 64 usage error.

set -euo pipefail

readonly EXIT_FAIL=1
readonly EXIT_ENV=2
readonly EXIT_CONFIG=4
readonly EXIT_USAGE=64

# Bounded waits so the procedure can never hang (seconds).
readonly PSQL_TIMEOUT_SECONDS=60
readonly DUMP_TIMEOUT_SECONDS=900
readonly TAR_TIMEOUT_SECONDS=300
readonly ARCHIVE_LIST_TIMEOUT_SECONDS=120

# Canonical T015 database validation evidence (T015 §5; identical anchors to
# the accepted T016/T024 harnesses): the exact native EmDash Site Setting
# tagline value, its UTF-8 byte length, and its SHA-256 digest.
readonly TAGLINE_EXPECTED='Songhealth Feature 001 foundation validation'
readonly TAGLINE_EXPECTED_SHA256='84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415'
readonly TAGLINE_EXPECTED_BYTES=44

# The native EmDash 1.1.0 site-settings storage the observation reads
# (verified from the pinned package source): site settings are JSON values in
# the options table under the 'site:' prefix.
readonly TAGLINE_QUERY="SELECT value FROM options WHERE name = 'site:tagline'"

# Recovery Set artifact names (T024 S2 output contract; quickstart §7.2).
readonly DB_ARCHIVE_NAME='database.dump'
readonly MEDIA_ARCHIVE_NAME='media.tar'
readonly RECOVERY_MANIFEST_NAME='recovery-manifest.json'

# Application root (parent of this script's scripts/ directory) and the
# stable application media mount path ./media under it.
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly APP_ROOT
readonly MEDIA_DIR="$APP_ROOT/media"

# Set while the procedure runs.
SCRATCH=''
STAGING_DIR=''
RECOVERY_DIR=''
# Evidence gathered by the stages.
DB_SHA256=''
DB_SIZE=''
DB_TOC_ENTRIES=''
MEDIA_SHA256=''
MEDIA_SIZE=''
MEDIA_ENTRY_COUNT=''
PG_SERVER_VERSION=''
PG_DUMPER_VERSION=''
PG_RESTORE_VERSION=''
PSQL_VERSION=''
RECOVERY_SET_ID=''
CREATED_AT=''
# Manifest digest (computed at build; the rollback ownership proof and the
# post-publication verification both use it) and the per-artifact
# "this invocation demonstrably published it" flags.
MANIFEST_SHA256=''
PUBLISHED_DB=0
PUBLISHED_MEDIA=0
PUBLISHED_MANIFEST=0
# Device:inode identity of each published file object, recorded from the
# single stat reading that also proves the landed type at the verified move;
# the rollback ownership proof requires the CURRENT object to still carry it.
PUBLISHED_DB_ID=''
PUBLISHED_MEDIA_ID=''
PUBLISHED_MANIFEST_ID=''

usage() {
	cat <<'EOF'
Usage: scripts/backup-foundation.sh

T025 backup foundation: create one Recovery Set for a quiescent known
validation state — a complete unfiltered custom-format PostgreSQL archive
(pg_dump), a separate complete media archive of the stable application media
path ./media, and recovery-manifest.json associating both artifact classes
and the expected validation evidence (canonical T015 tagline value/digest,
per-file media path/size/SHA-256, PostgreSQL server/tool versions) with one
recovery-set identifier and ISO-8601 creation time.

The observed native EmDash Site Setting tagline is verified against the
canonical T015 evidence BEFORE anything is archived; a non-canonical state
produces no Recovery Set. Every failure fails closed and publishes nothing;
existing artifacts in the Recovery Set directory are never overwritten.

Provide the inputs in the environment (see the script header):
SONGHEALTH_RECOVERY_DIR (absolute, existing, writable, safely separated from
the media store) plus the native PGHOST/PGPORT/PGDATABASE/PGUSER identity
inputs; PGPASSWORD travels through the protected connection mechanism
(native libpq environment), never on a command line.

This script performs no restore, no database mutation, and no runtime-secret
recovery (T026/T027/T028 and docs/operations/runtime-secret-recovery.md own
those). Creation is sequential, not an atomic cross-store snapshot.

Exit codes: 0 PASS | 1 FAIL | 2 environment error | 4 missing/invalid input
| 64 usage error.
EOF
}

die() {
	# die <exit-code> <message...>: the message is sanitized before
	# publication and never echoes raw argument or input values.
	local code="$1"
	shift
	local message=''
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't025: ' >&2
	printf '%s\n' "$message" | publish_diag
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]
	local name="$1" status="$2"
	shift 2
	printf 't025: [%s] %s ' "$name" "$status"
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$@"
	printf '\n'
}

pass() { step "$1" PASS "${@:2}"; }
info() { step "$1" INFO "${@:2}"; }

fail_stage() {
	# fail_stage <stage-name> <printf-format> [args...]: the message is
	# sanitized before publication (publish_diag), so substituted values
	# cannot carry a secret VALUE into evidence. Exits 1 and publishes
	# nothing (the EXIT trap removes all staging).
	local name="$1"
	shift
	local message=''
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't025: [%s] FAIL ' "$name" >&2
	printf '%s\n' "$message" | publish_diag
	exit "$EXIT_FAIL"
}

fail_input() {
	# fail_input <message...>: an invalid input or unsafe preconditions
	# (exit 4), sanitized like every published diagnostic.
	local message=''
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't025: [S1] FAIL ' >&2
	printf '%s\n' "$message" | publish_diag
	exit "$EXIT_CONFIG"
}

# ---------------------------------------------------------------------------
# Secret-safe helpers (structural redaction, mirroring the accepted T024
# harness)
# ---------------------------------------------------------------------------

scrub() {
	# stdin -> stdout with every known secret VALUE replaced by [REDACTED].
	# The secret values are read from the environment inside the node
	# process, so they never appear on any command line. Coverage: every
	# NONEMPTY supplied secret regardless of length, the full migration URL,
	# and the migration credential's STANDALONE representations (percent-
	# encoded and decoded), so a diagnostic printing only the credential is
	# redacted too. Longer values are replaced first so a value containing
	# another cannot shield it.
	node -e '
		const names = ["PGPASSWORD", "EMDASH_MIGRATION_DATABASE_URL", "EMDASH_ENCRYPTION_KEY"];
		const values = names
			.map((n) => process.env[n])
			.filter((v) => typeof v === "string" && v.length >= 1);
		const url = process.env.EMDASH_MIGRATION_DATABASE_URL;
		if (typeof url === "string" && url.length >= 1) {
			try {
				const parsed = new URL(url);
				if (parsed.password) {
					values.push(parsed.password);
					try {
						values.push(decodeURIComponent(parsed.password));
					} catch {}
				}
			} catch {}
		}
		values.sort((a, b) => b.length - a.length);
		let data = "";
		process.stdin.on("data", (c) => (data += c));
		process.stdin.on("end", () => {
			for (const value of values) data = data.replaceAll(value, "[REDACTED]");
			process.stdout.write(data);
		});
	'
}

publish_diag() {
	# stdin -> stderr, sanitized before publication. Degraded mode without
	# node passes the message through unchanged: those messages contain
	# field/tool names only.
	if command -v node >/dev/null 2>&1; then
		scrub >&2
	else
		cat >&2
	fi
}

publish_out() {
	# stdin -> stdout, sanitized through the same structural redaction
	# boundary as publish_diag. Every stdout line carrying DYNAMIC values
	# (operator-supplied paths, identifiers) flows through here, so a
	# secret-bearing path component can never reach the success/evidence
	# output even on a fully successful run.
	if command -v node >/dev/null 2>&1; then
		scrub
	else
		cat
	fi
}

print_tail() {
	# print_tail <label> <file> [lines]: scrubbed bounded tail for diagnosis.
	local label="$1" file="$2" lines="${3:-15}"
	if [ -s "$file" ]; then
		printf 't025: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't025: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Path-safety helpers (mirror the accepted T024 source-protection defenses)
# ---------------------------------------------------------------------------

media_paths_related() {
	# media_paths_related <a> <b>: true (return 0) when the two canonical
	# paths are equal or one is an ancestor of the other (component-safe:
	# a/bc is NOT inside a/b).
	if [ "$1" == "$2" ]; then
		return 0
	fi
	case $1 in
	"$2"/*) return 0 ;;
	esac
	case $2 in
	"$1"/*) return 0 ;;
	esac
	return 1
}

identity_reading_valid() {
	# stdin: one COMPLETE captured stat reading. Valid only when it is
	# EXACTLY one record matching the numeric device:inode tuple — no
	# embedded newlines, no additional content, no empty input.
	awk '
		NR != 1 { bad = 1 }
		$0 !~ /^[0-9]+:[0-9]+$/ { bad = 1 }
		END { exit bad ? 1 : NR == 1 ? 0 : 1 }
	'
}

# ---------------------------------------------------------------------------
# Cleanup: the temporary scratch directory and the staging area only. On
# success the published Recovery Set artifacts are never touched; on any
# failure nothing remains in the Recovery Set directory that this run put
# there.
# ---------------------------------------------------------------------------

cleanup() {
	if [ -n "$STAGING_DIR" ] && [ -d "$STAGING_DIR" ]; then
		rm -rf -- "$STAGING_DIR"
	fi
	if [ -n "$SCRATCH" ] && [ -d "$SCRATCH" ]; then
		rm -rf -- "$SCRATCH"
	fi
}

# ---------------------------------------------------------------------------
# P0 — tool prerequisites
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in node timeout mktemp sha256sum tar pg_dump pg_restore psql stat realpath od tr date find grep sed; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
}

# ---------------------------------------------------------------------------
# S1 — inputs, media store, output/source separation, publishable output
# ---------------------------------------------------------------------------

validate_inputs() {
	local missing=()
	local var
	for var in SONGHEALTH_RECOVERY_DIR PGHOST PGPORT PGDATABASE PGUSER; do
		if [ -z "${!var:-}" ]; then
			missing+=("$var")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		printf 't025: [S1] FAIL missing required input(s): %s\n' "${missing[*]}" >&2
		printf 't025: [S1] provide the documented inputs in the environment (see the script header); the credential travels through the protected native connection mechanism, never as a script input value\n' >&2
		exit "$EXIT_CONFIG"
	fi

	case $PGPORT in
	*[!0-9]*)
		die "$EXIT_CONFIG" 'PGPORT must be a TCP port number; the current value is not numeric'
		;;
	esac
	local pgport_value=$((10#$PGPORT))
	if [ "$pgport_value" -lt 1 ] || [ "$pgport_value" -gt 65535 ]; then
		die "$EXIT_CONFIG" 'PGPORT is outside the valid TCP port range 1-65535'
	fi

	case $SONGHEALTH_RECOVERY_DIR in
	/*) ;;
	*)
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR must be an absolute path'
		;;
	esac
	if [ ! -d "$SONGHEALTH_RECOVERY_DIR" ]; then
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR is not an existing directory; the Recovery Set location is operator-provided and is never created here'
	fi
	if [ ! -r "$SONGHEALTH_RECOVERY_DIR" ] || [ ! -x "$SONGHEALTH_RECOVERY_DIR" ]; then
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR is not readable/traversable'
	fi
	# The resolution failure path emits the raw path in cd's own error; that
	# output is discarded and replaced by a fixed message, so an
	# operator-supplied path component can never reach unsanitized output.
	if ! RECOVERY_DIR="$(cd -- "$SONGHEALTH_RECOVERY_DIR" 2>/dev/null && pwd -P)"; then
		die "$EXIT_CONFIG" 'SONGHEALTH_RECOVERY_DIR could not be resolved to a usable directory'
	fi

	# The media store at the stable application path: present, readable, and
	# carrying real designated content. A missing or unreadable store fails
	# closed — a replacement store is never created (spec edge cases).
	if [ ! -d "$MEDIA_DIR" ]; then
		fail_input 'the expected media mount at the stable application path is missing; a replacement store is never created — restore it before creating a Recovery Set'
	fi
	if [ ! -r "$MEDIA_DIR" ] || [ ! -x "$MEDIA_DIR" ]; then
		fail_input 'the expected media mount at the stable application path is unreadable; an unreadable store fails closed and no replacement is created'
	fi
	if ! find "$MEDIA_DIR" -type f -print -quit 2>/dev/null | grep -q .; then
		fail_input 'the media store contains no files; a Recovery Set for the known validation state requires nonempty designated media evidence'
	fi
	if find "$MEDIA_DIR" ! -type f ! -type d -print -quit 2>/dev/null | grep -q .; then
		fail_input 'the media store contains a non-regular entry (symlink or special file); a complete archive cannot be truthfully evidenced for it'
	fi
	if find "$MEDIA_DIR" -type f ! -readable -print -quit 2>/dev/null | grep -q .; then
		fail_input 'the media store contains an unreadable file; an unreadable store fails closed'
	fi

	check_output_source_separation
	check_publishable_output

	info S1 'inputs valid; media store present and readable at the stable application path; Recovery Set directory safely separated (canonical equal/ancestor/descendant, symlink, unresolved-tail, physical, and device:inode aliasing rejected)'
	pass S1 'fail-closed input validation passed before anything was read or created'
}

check_output_source_separation() {
	# The Recovery Set output must stay outside the active persistence: the
	# media store is the local active store, and an output directory that is
	# canonically equal to, inside, or containing it (or an alias of it)
	# would both damage the source and (for an output inside the store)
	# archive the Recovery Set into itself. Separation that cannot be
	# established fails closed.
	local out_canon='' media_canon=''
	if ! out_canon="$(realpath -m -- "${RECOVERY_DIR%/}" 2>/dev/null)" || [ -z "$out_canon" ]; then
		fail_input 'the Recovery Set directory path could not be canonically resolved; safe separation cannot be established — failing closed'
	fi
	if ! media_canon="$(realpath -m -- "${MEDIA_DIR%/}" 2>/dev/null)" || [ -z "$media_canon" ]; then
		fail_input 'the media store path could not be canonically resolved; safe separation cannot be established — failing closed'
	fi
	if media_paths_related "$out_canon" "$media_canon"; then
		fail_input 'the Recovery Set directory is canonically equal to, inside, or containing the active media store (equal/ancestor/descendant/symlink/unresolved-tail alias); recovery output must stay outside the active persistence'
	fi

	if [ -d "$out_canon" ] && [ -d "$media_canon" ]; then
		local out_phys='' media_phys='' out_stat='' media_stat=''
		if ! out_phys="$(cd -- "$out_canon" 2>/dev/null && pwd -P)" || \
			! media_phys="$(cd -- "$media_canon" 2>/dev/null && pwd -P)"; then
			fail_input 'an existing directory could not be physically resolved; safe separation cannot be established — failing closed'
		fi
		if media_paths_related "$out_phys" "$media_phys"; then
			fail_input 'the Recovery Set directory is physically equal to, inside, or containing the active media store; recovery output must stay outside the active persistence'
		fi
		# The underlying-identity probes are MANDATORY whenever both
		# directories exist: a failed, empty, or malformed device:inode
		# reading refuses — lexical/physical inequality alone cannot rule
		# out two paths referencing the same underlying directory.
		out_stat="$(stat -c '%d:%i' -- "$out_phys" 2>/dev/null)" ||
			fail_input 'the device:inode identity of the Recovery Set directory could not be determined; safe separation cannot be established — failing closed'
		media_stat="$(stat -c '%d:%i' -- "$media_phys" 2>/dev/null)" ||
			fail_input 'the device:inode identity of the media store could not be determined; safe separation cannot be established — failing closed'
		printf '%s' "$out_stat" | identity_reading_valid ||
			fail_input 'the complete device:inode reading of the Recovery Set directory is empty, multiline, or malformed; safe separation cannot be established — failing closed'
		printf '%s' "$media_stat" | identity_reading_valid ||
			fail_input 'the complete device:inode reading of the media store is empty, multiline, or malformed; safe separation cannot be established — failing closed'
		if [ "$out_stat" == "$media_stat" ]; then
			fail_input 'the Recovery Set directory and the active media store are the same underlying directory (device:inode); recovery output must stay outside the active persistence'
		fi
	fi
}

check_publishable_output() {
	# Existing evidence is never overwritten: publishing requires all three
	# basenames to be absent. -e alone misses a DANGLING SYMLINK, so an
	# existing link of that name (target present or not) is also refused —
	# plain mv would otherwise replace the link with this run's artifact.
	# Artifacts are staged beside the destination and renamed into place only
	# after every validation passes; publication itself re-checks each
	# destination immediately before moving (a late collision fails closed
	# without clobbering).
	local file
	for file in "$DB_ARCHIVE_NAME" "$MEDIA_ARCHIVE_NAME" "$RECOVERY_MANIFEST_NAME"; do
		if [ -e "$RECOVERY_DIR/$file" ] || [ -L "$RECOVERY_DIR/$file" ]; then
			fail_input 'a Recovery Set entry named %s already exists in the Recovery Set directory (regular file, directory, or symlink — including a dangling link); existing evidence is never overwritten — publish into a new Recovery Set directory' \
				"$file"
		fi
	done
}

# ---------------------------------------------------------------------------
# S2 — canonical known-state observation (before anything is archived)
# ---------------------------------------------------------------------------

observe_canonical_state() {
	# Read the observed native Site Setting tagline through the native
	# storage (options/site:tagline, JSON-encoded) and verify it against the
	# canonical T015 evidence, byte-exactly: psql writes the raw stored JSON
	# value to a mode-0600 scratch file; node decodes it and derives the
	# byte length, trailing-newline fact, and SHA-256 from the decoded
	# bytes. Nothing value-bearing ever reaches a command line or published
	# output; the canonical value/digest below are the non-secret T015
	# anchors, safe to print.
	local raw="$SCRATCH/tagline.raw" result="$SCRATCH/tagline.result"
	if ! timeout --kill-after=15 "${PSQL_TIMEOUT_SECONDS}s" \
		psql -X -w -t -A -c "$TAGLINE_QUERY" >"$raw" 2>"$SCRATCH/psql-tagline.err"; then
		print_tail 'psql tagline query diagnostics' "$SCRATCH/psql-tagline.err" 5
		fail_stage S2 'the native Site Setting tagline could not be read from the database; the canonical known validation state cannot be established'
	fi
	if ! [ -s "$raw" ]; then
		fail_stage S2 'the native Site Setting tagline is absent from the database; the canonical T015 known validation state is not present — refusing to create a Recovery Set'
	fi
	# The decoder reports FIXED messages only (the default node SyntaxError
	# echoes an excerpt of the raw input).
	if ! node -e '
		const fs = require("fs");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [rawFile, resultFile, expectedValue, expectedSha, expectedBytes] = process.argv.slice(1);
		let text;
		try {
			text = fs.readFileSync(rawFile, "utf8");
		} catch {
			refuse("the captured tagline observation could not be read");
		}
		// psql -t -A appends exactly one trailing newline; strip exactly one.
		if (text.endsWith("\n")) text = text.slice(0, -1);
		let value;
		try {
			value = JSON.parse(text);
		} catch {
			refuse("the stored tagline setting is not decodable native storage");
		}
		if (typeof value !== "string") refuse("the stored tagline setting is not a string value");
		const buf = Buffer.from(value, "utf8");
		const sha = require("crypto").createHash("sha256").update(buf).digest("hex");
		const lines = [
			`bytes ${buf.length}`,
			`trailingNewline ${value.endsWith("\n") ? "yes" : "no"}`,
			`valueMatches ${value === expectedValue ? "yes" : "no"}`,
			`shaMatches ${sha === expectedSha ? "yes" : "no"}`,
			`bytesMatch ${buf.length === Number(expectedBytes) ? "yes" : "no"}`,
		];
		fs.writeFileSync(resultFile, lines.join("\n") + "\n");
	' "$raw" "$result" "$TAGLINE_EXPECTED" "$TAGLINE_EXPECTED_SHA256" "$TAGLINE_EXPECTED_BYTES" \
		2>"$SCRATCH/tagline.decode.err"; then
		print_tail 'tagline decode diagnostics' "$SCRATCH/tagline.decode.err" 5
		fail_stage S2 'the observed native Site Setting tagline could not be decoded from its native storage'
	fi

	local key value tagline_bytes='' trailing_nl='' value_ok='' sha_ok='' bytes_ok=''
	while IFS=' ' read -r key value; do
		case $key in
		bytes) tagline_bytes="$value" ;;
		trailingNewline) trailing_nl="$value" ;;
		valueMatches) value_ok="$value" ;;
		shaMatches) sha_ok="$value" ;;
		bytesMatch) bytes_ok="$value" ;;
		esac
	done <"$result"
	if [ "$value_ok" != 'yes' ] || [ "$sha_ok" != 'yes' ]; then
		fail_stage S2 'the observed native Site Setting tagline does not match the canonical T015 evidence (exact value and SHA-256 required; no substituted anchor is acceptable) — refusing to create a Recovery Set for a non-canonical state'
	fi
	if [ "$bytes_ok" != 'yes' ] || [ "$tagline_bytes" != "$TAGLINE_EXPECTED_BYTES" ] || [ "$trailing_nl" != 'no' ]; then
		fail_stage S2 'the observed native Site Setting tagline is not the canonical %s-byte UTF-8 value without a trailing newline' \
			"$TAGLINE_EXPECTED_BYTES"
	fi

	# PostgreSQL server version — required version evidence, same connection.
	# Distribution builds legitimately report a suffixed form (e.g. "18.6
	# (Debian 18.6-1.pgdg13+2)"), so the accepted evidence charset is letters,
	# digits, dots, spaces, parentheses, plus, and minus — anything else
	# (empty, multiline, or carrying unusable characters) fails closed.
	local server_version_file="$SCRATCH/server_version.txt"
	if ! timeout --kill-after=15 "${PSQL_TIMEOUT_SECONDS}s" \
		psql -X -w -t -A -c 'SHOW server_version' >"$server_version_file" 2>"$SCRATCH/psql-version.err"; then
		print_tail 'psql server-version diagnostics' "$SCRATCH/psql-version.err" 5
		fail_stage S2 'the PostgreSQL server version could not be determined; the Recovery Set requires server version evidence'
	fi
	PG_SERVER_VERSION="$(sed -n '1p' "$server_version_file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
	if ! printf '%s' "$PG_SERVER_VERSION" | grep -qE '^[0-9][0-9A-Za-z.()+ -]*$'; then
		fail_stage S2 'the PostgreSQL server version reading is not a usable version string; refusing to record unusable version evidence'
	fi

	info S2 'observed native site:tagline equals the canonical T015 evidence: %s bytes, no trailing newline, sha256 %s' \
		"$TAGLINE_EXPECTED_BYTES" "$TAGLINE_EXPECTED_SHA256"
	info S2 'PostgreSQL server version: %s (quiescent known validation state; creation is sequential, not an atomic snapshot)' \
		"$PG_SERVER_VERSION"
	pass S2 'canonical known validation state observed and verified before anything was archived'
}

# ---------------------------------------------------------------------------
# S3 — database archive: complete unfiltered custom-format pg_dump
# ---------------------------------------------------------------------------

create_database_archive() {
	local dump="$STAGING_DIR/$DB_ARCHIVE_NAME"
	local toc="$SCRATCH/database-toc.txt"

	PG_DUMPER_VERSION="$(pg_dump --version 2>/dev/null || true)"
	PG_RESTORE_VERSION="$(pg_restore --version 2>/dev/null || true)"
	PSQL_VERSION="$(psql --version 2>/dev/null || true)"
	if [ -z "$PG_DUMPER_VERSION" ] || [ -z "$PG_RESTORE_VERSION" ] || [ -z "$PSQL_VERSION" ]; then
		fail_stage S3 'a required PostgreSQL tool did not report its version; version evidence is mandatory'
	fi

	# Complete unfiltered custom-format archive. The connection uses the
	# native PG* client inputs (libpq environment); --no-password keeps the
	# run non-interactive (never prompt, fail instead). NO schema/table/
	# data filtering of any kind: no -n/-t/--table/--schema, no
	# data-only/schema-only narrowing — the artifact must carry the whole
	# database (PostgreSQL 18 reference via Context7, 2026-10-11).
	if ! timeout --kill-after=15 "${DUMP_TIMEOUT_SECONDS}s" \
		pg_dump --format=custom --no-password --file "$dump" "$PGDATABASE" \
		>"$SCRATCH/pgdump.out" 2>"$SCRATCH/pgdump.err"; then
		print_tail 'pg_dump diagnostics' "$SCRATCH/pgdump.err" 5
		fail_stage S3 'pg_dump failed; no Recovery Set was published'
	fi
	if ! [ -s "$dump" ]; then
		fail_stage S3 'pg_dump produced an empty database archive; an empty artifact is never published'
	fi

	# Readability proof with UNFILTERED pg_restore --list (no -n/-t filters:
	# they would restrict the listing too) and a nonempty table of contents.
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		pg_restore --list "$dump" >"$toc" 2>"$SCRATCH/pgrestore-list.err"; then
		print_tail 'pg_restore --list diagnostics' "$SCRATCH/pgrestore-list.err" 5
		fail_stage S3 'the created database archive is not a readable custom-format archive (pg_restore --list failed)'
	fi
	if ! [ -s "$toc" ]; then
		fail_stage S3 'the created database archive has an empty table of contents; it does not carry the complete database state'
	fi
	DB_TOC_ENTRIES="$(grep -c -v '^;' "$toc" || true)"
	if [ "$DB_TOC_ENTRIES" -lt 1 ]; then
		fail_stage S3 'the database archive table of contents carries no archive entries'
	fi

	# Checksum/size evidence of the staged artifact. Underlying tool errors
	# are captured and published only through the scrubbed tail — a raw
	# diagnostic embeds the staging path (which contains the operator
	# supplied Recovery Set directory name).
	read -r DB_SHA256 _ < <(sha256sum -- "$dump" 2>"$SCRATCH/sha-db.err") || {
		print_tail 'sha256sum diagnostics (database archive)' "$SCRATCH/sha-db.err" 3
		fail_stage S3 'the created database archive could not be checksummed'
	}
	DB_SIZE="$(stat -c '%s' -- "$dump" 2>"$SCRATCH/stat-db.err")" || {
		print_tail 'stat diagnostics (database archive)' "$SCRATCH/stat-db.err" 3
		fail_stage S3 'the size of the created database archive could not be determined'
	}

	info S3 'database archive created: unfiltered custom-format pg_dump, %s TOC entries, %s bytes, sha256 %s' \
		"$DB_TOC_ENTRIES" "$DB_SIZE" "$DB_SHA256"
	pass S3 'complete unfiltered database archive created and proven readable (unfiltered pg_restore --list, nonempty table of contents)'
}

# ---------------------------------------------------------------------------
# S4 — media archive: complete separate archive of the stable ./media store
# ---------------------------------------------------------------------------

create_media_archive() {
	local archive="$STAGING_DIR/$MEDIA_ARCHIVE_NAME"
	local listing="$SCRATCH/media-listing.txt"
	local extract=''

	# Deterministic designated-entry evidence: every regular file under the
	# media store, relative path + byte size + SHA-256 (data-model §6 media
	# checksum manifest). Paths are recorded relative to the media root —
	# exactly the form the T024 S2 contract checks against the archive
	# listing.
	local files="$SCRATCH/media-files.txt"
	find "$MEDIA_DIR" -type f -printf '%P\n' 2>"$SCRATCH/find-media.err" | LC_ALL=C sort >"$files" || {
		print_tail 'find diagnostics (media store)' "$SCRATCH/find-media.err" 3
		fail_stage S4 'the media store could not be enumerated for designated-entry evidence'
	}
	MEDIA_ENTRY_COUNT="$(grep -c . "$files" || true)"
	if [ "$MEDIA_ENTRY_COUNT" -lt 1 ]; then
		fail_stage S4 'the media store stopped carrying designated files; a Recovery Set requires nonempty media evidence'
	fi
	local entries_json="$SCRATCH/media-entries.json"
	if ! node -e '
		const fs = require("fs");
		const crypto = require("crypto");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [mediaDir, listFile, outFile] = process.argv.slice(1);
		let paths;
		try {
			paths = fs.readFileSync(listFile, "utf8").split("\n").filter((p) => p !== "");
		} catch {
			refuse("the designated media list could not be read");
		}
		const entries = [];
		for (const p of paths) {
			let buf;
			try {
				buf = fs.readFileSync(`${mediaDir}/${p}`);
			} catch {
				refuse("a designated media file could not be read");
			}
			const st = fs.statSync(`${mediaDir}/${p}`);
			if (!st.isFile() || st.size !== buf.length) {
				refuse("a designated media entry changed while being evidenced");
			}
			entries.push({
				path: p,
				size: st.size,
				sha256: crypto.createHash("sha256").update(buf).digest("hex"),
			});
		}
		fs.writeFileSync(outFile, JSON.stringify(entries));
	' "$MEDIA_DIR" "$files" "$entries_json" 2>"$SCRATCH/media-entries.err"; then
		print_tail 'media evidence diagnostics' "$SCRATCH/media-entries.err" 5
		fail_stage S4 'the designated media evidence could not be derived from the media store'
	fi

	# Complete archive in the documented quickstart form: the whole store
	# directory as one tar from its own root, preserving contents.
	if ! timeout --kill-after=15 "${TAR_TIMEOUT_SECONDS}s" \
		tar --create --file "$archive" --directory "$MEDIA_DIR" . \
		>"$SCRATCH/tar-create.out" 2>"$SCRATCH/tar-create.err"; then
		print_tail 'tar --create diagnostics' "$SCRATCH/tar-create.err" 5
		fail_stage S4 'the media archive could not be created (tar failed); no Recovery Set was published'
	fi
	if ! [ -s "$archive" ]; then
		fail_stage S4 'the created media archive is empty; an empty artifact is never published'
	fi

	# Readability + completeness of the listing: every designated entry path
	# must appear in the archive listing (leading ./ normalized, the same
	# normalization the accepted T024 S2 applies).
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		tar --list --file "$archive" >"$listing" 2>"$SCRATCH/tar-list.err"; then
		print_tail 'tar --list diagnostics' "$SCRATCH/tar-list.err" 5
		fail_stage S4 'the created media archive is not readable (tar --list failed)'
	fi
	if ! [ -s "$listing" ]; then
		fail_stage S4 'the created media archive listing is empty; it does not carry the designated media'
	fi
	sed 's#^\./##' "$listing" | grep -v '^$' >"$listing.norm" || true
	local entry_path
	while IFS= read -r entry_path; do
		if ! grep -Fxq -- "$entry_path" "$listing.norm"; then
			fail_stage S4 'the created media archive does not contain the designated media entry %s' "$entry_path"
		fi
	done <"$files"

	# Byte-exact content proof: extract into scratch and re-verify every
	# designated entry size/SHA-256 against the recorded evidence, so the
	# manifest checksums provably describe the archived bytes.
	extract="$(mktemp -d "$SCRATCH/media-extract.XXXXXX")"
	if ! timeout --kill-after=15 "${TAR_TIMEOUT_SECONDS}s" \
		tar --extract --file "$archive" --directory "$extract" \
		>"$SCRATCH/tar-extract.out" 2>"$SCRATCH/tar-extract.err"; then
		print_tail 'tar --extract diagnostics' "$SCRATCH/tar-extract.err" 5
		fail_stage S4 'the created media archive could not be extracted for verification'
	fi
	if ! node -e '
		const fs = require("fs");
		const crypto = require("crypto");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [extractDir, entriesFile] = process.argv.slice(1);
		let entries;
		try {
			entries = JSON.parse(fs.readFileSync(entriesFile, "utf8"));
		} catch {
			refuse("the recorded media evidence could not be read back");
		}
		for (const e of entries) {
			let buf;
			try {
				buf = fs.readFileSync(`${extractDir}/${e.path}`);
			} catch {
				refuse("a designated media entry is absent from the extracted archive");
			}
			const sha = crypto.createHash("sha256").update(buf).digest("hex");
			if (buf.length !== e.size || sha !== e.sha256) {
				refuse("an extracted designated media entry does not match the recorded size/SHA-256 evidence");
			}
		}
	' "$extract" "$entries_json" 2>"$SCRATCH/media-verify.err"; then
		print_tail 'media archive verification diagnostics' "$SCRATCH/media-verify.err" 5
		fail_stage S4 'the extracted media archive does not match the recorded designated-entry evidence'
	fi

	read -r MEDIA_SHA256 _ < <(sha256sum -- "$archive" 2>"$SCRATCH/sha-media.err") || {
		print_tail 'sha256sum diagnostics (media archive)' "$SCRATCH/sha-media.err" 3
		fail_stage S4 'the created media archive could not be checksummed'
	}
	MEDIA_SIZE="$(stat -c '%s' -- "$archive" 2>"$SCRATCH/stat-media.err")" || {
		print_tail 'stat diagnostics (media archive)' "$SCRATCH/stat-media.err" 3
		fail_stage S4 'the size of the created media archive could not be determined'
	}

	info S4 'media archive created: %s designated entries, every entry present in the listing and byte-identical after extraction, %s bytes, sha256 %s' \
		"$MEDIA_ENTRY_COUNT" "$MEDIA_SIZE" "$MEDIA_SHA256"
	pass S4 'complete media archive created, checksum-evidenced per designated file, and verified against its own extracted bytes'
}

# ---------------------------------------------------------------------------
# S5 — manifest, publication, post-publication verification
# ---------------------------------------------------------------------------

publish_recovery_set() {
	# LC_ALL=C: a localized date (e.g. a non-Gregorian era) must never leak
	# into ISO-8601 evidence.
	CREATED_AT="$(LC_ALL=C date -u +%Y-%m-%dT%H:%M:%SZ)"
	RECOVERY_SET_ID="rs-$(printf '%s' "$CREATED_AT" | tr -d ':-')-$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"

	local manifest="$STAGING_DIR/$RECOVERY_MANIFEST_NAME"
	# The manifest is the T024 S2 contract plus non-secret version/size
	# evidence: no URLs, no secret-looking keys (asserted below before any
	# publication).
	if ! node -e '
		const fs = require("fs");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [outFile, setId, createdAt, dbFile, dbSha, dbSize, dbTocEntries,
			mediaFile, mediaSha, mediaSize, entriesFile, serverVersion,
			pgDumpVersion, pgRestoreVersion, psqlVersion,
			taglineValue, taglineSha] = process.argv.slice(1);
		let entries;
		try {
			entries = JSON.parse(fs.readFileSync(entriesFile, "utf8"));
		} catch {
			refuse("the recorded media evidence could not be read");
		}
		const manifest = {
			recoverySetId: setId,
			createdAt: createdAt,
			database: { file: dbFile, format: "custom", sha256: dbSha, size: Number(dbSize) },
			media: { file: mediaFile, sha256: mediaSha, size: Number(mediaSize), entries: entries },
			expected: { taglineValue: taglineValue, taglineSha256: taglineSha },
			versions: {
				postgresqlServer: serverVersion,
				pgDump: pgDumpVersion,
				pgRestore: pgRestoreVersion,
				psql: psqlVersion,
			},
			archiveSummary: { databaseTocEntries: Number(dbTocEntries), mediaEntryCount: entries.length },
		};
		fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
	' "$manifest" "$RECOVERY_SET_ID" "$CREATED_AT" \
		"$DB_ARCHIVE_NAME" "$DB_SHA256" "$DB_SIZE" "$DB_TOC_ENTRIES" \
		"$MEDIA_ARCHIVE_NAME" "$MEDIA_SHA256" "$MEDIA_SIZE" "$SCRATCH/media-entries.json" \
		"$PG_SERVER_VERSION" "$PG_DUMPER_VERSION" "$PG_RESTORE_VERSION" "$PSQL_VERSION" \
		"$TAGLINE_EXPECTED" "$TAGLINE_EXPECTED_SHA256" 2>"$SCRATCH/manifest-build.err"; then
		print_tail 'manifest build diagnostics' "$SCRATCH/manifest-build.err" 5
		fail_stage S5 'the Recovery Set manifest could not be built'
	fi

	# Self-check before publication: the manifest must parse back, and the
	# published evidence must stay secret-free — no URL-like strings, no
	# secret-looking keys (the exact scans the accepted T024 S2 applies).
	if ! node -e '
		const fs = require("fs");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const file = process.argv[1];
		let text;
		try {
			text = fs.readFileSync(file, "utf8");
		} catch {
			refuse("the manifest could not be read back");
		}
		try {
			JSON.parse(text);
		} catch {
			refuse("the manifest is not valid JSON");
		}
		if (/:\/\//.test(text)) refuse("the manifest contains a URL-like string");
		const secretKeys = [...text.matchAll(/"([A-Za-z]*(?:password|secret|token|credential)[A-Za-z]*)"/gi)].map((x) => x[1]);
		if (secretKeys.length > 0) refuse(`the manifest contains secret-looking key(s): ${secretKeys.join(",")}`);
	' "$manifest" 2>"$SCRATCH/manifest-selfcheck.err"; then
		print_tail 'manifest self-check diagnostics' "$SCRATCH/manifest-selfcheck.err" 5
		fail_stage S5 'the manifest failed the secret-free/validity self-check; nothing was published'
	fi
	read -r MANIFEST_SHA256 _ < <(sha256sum -- "$manifest" 2>"$SCRATCH/sha-manifest.err") || {
		print_tail 'sha256sum diagnostics (manifest)' "$SCRATCH/sha-manifest.err" 3
		fail_stage S5 'the manifest could not be checksummed for publication-ownership evidence'
	}

	# Publish by rename within the same directory, manifest LAST: until the
	# association evidence appears, an interrupted publish is detectably
	# incomplete. Each move is guarded (destination still absent, including
	# a dangling link), executed with mv --no-clobber --no-target-directory
	# (exact destination-basename semantics: a late directory or directory
	# symlink can never become a container or a redirection for the
	# artifact), verified to have actually moved the staged file, verified
	# to have landed as a regular file, and identity-recorded for rollback
	# ownership; any failure rolls back only what this invocation
	# demonstrably published and still owns.
	publish_single "$STAGING_DIR/$DB_ARCHIVE_NAME" "$DB_ARCHIVE_NAME" 'the database archive' PUBLISHED_DB_ID
	PUBLISHED_DB=1
	publish_single "$STAGING_DIR/$MEDIA_ARCHIVE_NAME" "$MEDIA_ARCHIVE_NAME" 'the media archive' PUBLISHED_MEDIA_ID
	PUBLISHED_MEDIA=1
	publish_single "$manifest" "$RECOVERY_MANIFEST_NAME" 'the manifest' PUBLISHED_MANIFEST_ID
	PUBLISHED_MANIFEST=1

	# Post-publication verification of the PUBLISHED objects: the artifacts
	# in the Recovery Set directory must still be this run's own file
	# objects (identity) carrying this run's bytes (checksums). A swap after
	# publication — even with identical bytes — fails here or at rollback
	# and the foreign replacement is left untouched. Underlying reader
	# errors are captured and published only through the scrubbed tail.
	local published_db_sha='' published_media_sha='' published_manifest_sha=''
	local current_db_id='' current_media_id='' current_manifest_id=''
	read -r published_db_sha _ < <(sha256sum -- "$RECOVERY_DIR/$DB_ARCHIVE_NAME" 2>"$SCRATCH/sha-pub-db.err") || {
		print_tail 'sha256sum diagnostics (published database archive)' "$SCRATCH/sha-pub-db.err" 3
		rollback_published
		fail_stage S5 'the published database archive could not be re-read for verification'
	}
	read -r published_media_sha _ < <(sha256sum -- "$RECOVERY_DIR/$MEDIA_ARCHIVE_NAME" 2>"$SCRATCH/sha-pub-media.err") || {
		print_tail 'sha256sum diagnostics (published media archive)' "$SCRATCH/sha-pub-media.err" 3
		rollback_published
		fail_stage S5 'the published media archive could not be re-read for verification'
	}
	read -r published_manifest_sha _ < <(sha256sum -- "$RECOVERY_DIR/$RECOVERY_MANIFEST_NAME" 2>"$SCRATCH/sha-pub-manifest.err") || {
		print_tail 'sha256sum diagnostics (published manifest)' "$SCRATCH/sha-pub-manifest.err" 3
		rollback_published
		fail_stage S5 'the published manifest could not be re-read for verification'
	}
	current_db_id="$(stat -c '%d:%i' -- "$RECOVERY_DIR/$DB_ARCHIVE_NAME" 2>/dev/null)" || current_db_id=''
	current_media_id="$(stat -c '%d:%i' -- "$RECOVERY_DIR/$MEDIA_ARCHIVE_NAME" 2>/dev/null)" || current_media_id=''
	current_manifest_id="$(stat -c '%d:%i' -- "$RECOVERY_DIR/$RECOVERY_MANIFEST_NAME" 2>/dev/null)" || current_manifest_id=''
	if [ "$published_db_sha" != "$DB_SHA256" ] || [ "$published_media_sha" != "$MEDIA_SHA256" ] ||
		[ "$published_manifest_sha" != "$MANIFEST_SHA256" ] ||
		[ "$current_db_id" != "$PUBLISHED_DB_ID" ] || [ "$current_media_id" != "$PUBLISHED_MEDIA_ID" ] ||
		[ "$current_manifest_id" != "$PUBLISHED_MANIFEST_ID" ]; then
		rollback_published
		fail_stage S5 'a published destination no longer carries this invocation''s own file object or bytes; the incomplete set was rolled back (replaced or swapped entries were left untouched)'
	fi

	pass S5 'Recovery Set published: database archive + media archive + manifest under one identifier, checksums re-verified after publication'
}

publish_single() {
	# publish_single <staged-source> <basename> <description> <id-var>:
	# move one staged artifact to its EXACT destination basename, fail-closed.
	#   - late-collision guard: the destination must STILL be absent
	#     (including as a dangling symlink) — an entry that appeared after
	#     the S1 preflight is never clobbered, and nothing of ours is
	#     published over or INTO it;
	#   - mv --no-clobber --no-target-directory closes the residual window
	#     between the guard and the move with EXACT-basename semantics: the
	#     source is consumed ONLY by a clean rename onto an absent name. An
	#     existing regular file, DIRECTORY, or symlink destination (however
	#     it appears) makes mv skip silently — never a move into a directory
	#     container — which the staged-source check below detects and
	#     refuses. A destination directory or directory symlink can
	#     therefore never receive or redirect the artifact;
	#   - the landed object is verified to be a regular file at the exact
	#     destination basename whose device:inode identity EQUALS the staged
	#     file object's identity read BEFORE the move: rename preserves the
	#     object's device:inode, so the landed object must be the original
	#     staged file object itself. A post-rename reading is never the sole
	#     ownership source — a replacement swapped in between the rename and
	#     the reading has a different identity and is refused as foreign;
	#   - both identity readings come from a single stat call that proves
	#     the file type and the object identity together;
	#   - the underlying mv error stream is captured and published only
	#     through the scrubbed tail (raw mv diagnostics embed the
	#     operator-supplied Recovery Set directory path).
	local src="$1" name="$2" what="$3" id_var="$4"
	local dest="$RECOVERY_DIR/$name" err="$SCRATCH/publish-$name.err"
	if [ -e "$dest" ] || [ -L "$dest" ]; then
		rollback_published
		fail_stage S5 'publication refused: the entry %s appeared in the Recovery Set directory after preflight (late collision); the existing entry was left untouched and nothing was published over it' \
			"$name"
	fi
	# The ownership identity originates from the STAGED file object this
	# invocation created, read BEFORE the move.
	local staged_reading='' staged_id=''
	staged_reading="$(stat -c '%d:%i|%F' -- "$src" 2>"$SCRATCH/stat-staged-$name.err")" || {
		print_tail "stat $name (staged) diagnostics" "$SCRATCH/stat-staged-$name.err" 3
		rollback_published
		fail_stage S5 'the staged %s could not be identity-read for publication ownership' "$what"
	}
	case $staged_reading in
	*"|regular file")
		staged_id="${staged_reading%|*}"
		;;
	*)
		rollback_published
		fail_stage S5 'publication refused: the staged %s is not a regular file object' "$what"
		;;
	esac
	if ! mv -n -T -- "$src" "$dest" 2>"$err"; then
		print_tail "mv $name diagnostics" "$err" 3
		rollback_published
		fail_stage S5 'publishing %s failed; the failure was captured and sanitized, and nothing of this run remains published' "$what"
	fi
	if [ -e "$src" ] || [ -L "$src" ]; then
		# mv --no-clobber skipped the move: the destination changed between
		# the guard and the move (a regular file, directory, or symlink) —
		# the same late-collision refusal, with no relocation anywhere.
		rollback_published
		fail_stage S5 'publication refused: %s could not be moved to its exact destination basename without overwriting an entry that appeared after preflight; the destination was left untouched and nothing was relocated into it' \
			"$name"
	fi
	# The landed object must be the ORIGINAL staged file object: same
	# device:inode, read (with its type proof) from one stat call.
	local identity='' landed_id=''
	identity="$(stat -c '%d:%i|%F' -- "$dest" 2>"$SCRATCH/stat-publish-$name.err")" || {
		print_tail "stat $name diagnostics" "$SCRATCH/stat-publish-$name.err" 3
		rollback_published
		fail_stage S5 'the published %s could not be identity-verified after the move' "$what"
	}
	case $identity in
	*"|regular file")
		landed_id="${identity%|*}"
		;;
	*)
		# A directory, symlink, or other non-regular entry at the destination
		# basename is never accepted as a publication result.
		rollback_published
		fail_stage S5 'publication refused: %s did not land as a regular file at the exact destination basename (a directory or symlink destination is never a container or a redirection for it)' \
			"$name"
		;;
	esac
	if [ "$landed_id" != "$staged_id" ]; then
		# The object at the destination is not the staged file object this
		# run created: it was replaced between the rename and this reading,
		# or the move did not preserve the object — either way it is foreign
		# and is left untouched, and this name was never published by us.
		rollback_published
		fail_stage S5 'publication refused: the landed %s is not the original staged file object this invocation created (replaced or ambiguous); the destination entry was left untouched' \
			"$name"
	fi
	printf -v "$id_var" '%s' "$staged_id"
}

owned_artifact() {
	# owned_artifact <file> <recorded-identity> <recorded-sha256>: 0 exactly
	# when the destination entry is THIS invocation's own published file
	# object. Evidence required: the entry is a regular file (a symlink is
	# refused even when it resolves to our own file), its device:inode
	# identity STILL equals the identity recorded at this run's verified
	# move, and its current bytes still equal the digest this run produced.
	# Digest equality alone is deliberately insufficient: an
	# identical-bytes replacement is a different file object and is refused.
	local file="$1" want_id="$2" want_sha="$3"
	local got_id='' got_sha=''
	[ -f "$file" ] || return 1
	[ -L "$file" ] && return 1
	got_id="$(stat -c '%d:%i' -- "$file" 2>/dev/null)" || return 1
	[ "$got_id" = "$want_id" ] || return 1
	read -r got_sha _ < <(sha256sum -- "$file" 2>/dev/null) || return 1
	[ "$got_sha" = "$want_sha" ]
}

rollback_published() {
	# Removes ONLY artifacts this invocation demonstrably published and still
	# owns: the per-artifact published flag proves this run moved the name,
	# the CURRENT device:inode identity must still equal the identity
	# recorded at the verified move (an identical-bytes replacement is a
	# different object and is refused), and the current digest must still
	# equal this run's. A destination that was replaced by another writer,
	# swapped, symlinked, or never published by this run is foreign and is
	# left untouched (reported by basename only).
	local left=''
	if [ "$PUBLISHED_DB" = 1 ]; then
		if owned_artifact "$RECOVERY_DIR/$DB_ARCHIVE_NAME" "$PUBLISHED_DB_ID" "$DB_SHA256"; then
			rm -f -- "$RECOVERY_DIR/$DB_ARCHIVE_NAME" 2>/dev/null || true
		else
			left+="${left:+, }$DB_ARCHIVE_NAME"
		fi
	fi
	if [ "$PUBLISHED_MEDIA" = 1 ]; then
		if owned_artifact "$RECOVERY_DIR/$MEDIA_ARCHIVE_NAME" "$PUBLISHED_MEDIA_ID" "$MEDIA_SHA256"; then
			rm -f -- "$RECOVERY_DIR/$MEDIA_ARCHIVE_NAME" 2>/dev/null || true
		else
			left+="${left:+, }$MEDIA_ARCHIVE_NAME"
		fi
	fi
	if [ "$PUBLISHED_MANIFEST" = 1 ]; then
		if owned_artifact "$RECOVERY_DIR/$RECOVERY_MANIFEST_NAME" "$PUBLISHED_MANIFEST_ID" "$MANIFEST_SHA256"; then
			rm -f -- "$RECOVERY_DIR/$RECOVERY_MANIFEST_NAME" 2>/dev/null || true
		else
			left+="${left:+, }$RECOVERY_MANIFEST_NAME"
		fi
	fi
	if [ -n "$left" ]; then
		printf 't025: [S5] NOTE rollback left a destination entry that is not this invocation''s own published file object (replaced, swapped, symlinked, or ambiguous) untouched: %s\n' "$left" | publish_diag
	fi
}

run_backup() {
	require_tools
	validate_inputs

	# Scratch/staging creation failures are reported with fixed messages:
	# the raw mktemp/cd diagnostics embed operator-supplied path components
	# and are discarded, never inherited.
	SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/t025-backup.XXXXXX" 2>/dev/null)" || {
		die "$EXIT_ENV" 'a scratch directory could not be created under TMPDIR'
	}
	chmod 700 "$SCRATCH"
	STAGING_DIR="$(mktemp -d "$RECOVERY_DIR/.t025-staging.XXXXXX" 2>/dev/null)" || {
		die "$EXIT_CONFIG" 'a staging directory could not be created inside the Recovery Set directory; check that it is writable'
	}

	observe_canonical_state
	create_database_archive
	create_media_archive
	publish_recovery_set

	printf 't025: ================================================================\n'
	printf 't025: T025 backup foundation: PASS\n'
	# The success/evidence line carries the operator-supplied Recovery Set
	# directory path: it is published through the structural redaction
	# boundary (publish_out), never directly.
	printf 't025: Recovery Set %s published to %s (created %s)\n' \
		"$RECOVERY_SET_ID" "$RECOVERY_DIR" "$CREATED_AT" | publish_out
	printf 't025: one identifier associates the database archive, the media archive, and the canonical T015 tagline evidence\n'
	printf 't025: creation was sequential under the declared quiescent state; no atomic cross-store snapshot is claimed\n'
	printf 't025: runtime-secret recovery is separate and is not part of this Recovery Set\n'
	printf 't025: restore (T026), restored-foundation verification (T027), and the recovery drill (T028) remain separate prerequisites\n'
	printf 't025: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')"
	printf 't025: ================================================================\n'
}

main() {
	if [ "$#" -gt 0 ]; then
		case "${1:-}" in
		-h | --help | help)
			usage
			return 0
			;;
		*)
			# Argument VALUES are never echoed: an accidentally supplied
			# secret on the command line must not be reflected in the usage
			# error.
			usage >&2
			die "$EXIT_USAGE" 'unexpected argument(s) were provided (this procedure takes no arguments); argument values are not echoed'
			;;
		esac
	fi

	trap cleanup EXIT
	trap 'cleanup; exit 130' INT TERM HUP

	run_backup
}

main "$@"
