#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth restore foundation (Feature 001, T026 — clean recovery restore).
#
# Bounded restore procedure for one validated Recovery Set (quickstart §7.2;
# plan "Backup, restore, and secret recovery"; data-model §6; tasks.md T026).
# It consumes the Recovery Set produced by the accepted T025 backup procedure
# (scripts/backup-foundation.sh): a complete unfiltered custom-format
# PostgreSQL archive, a separate complete media archive, and
# recovery-manifest.json associating both artifact classes with one quiescent
# known validation state. This script restores them into a CLEAN, EXTERNALLY
# PROVISIONED restore target:
#
#   - the restore database, addressed through the native PG* client identity
#     inputs, must already exist, be reachable, and be demonstrably empty of
#     user objects/data (recreation of cluster-global roles and of the clean
#     database itself is EXTERNAL to this script — research §9; this script
#     never creates, initializes, drops, clears, overwrites, or reinitializes
#     any store);
#   - the restore media destination must already exist as an empty, safe
#     directory (a missing or nonempty destination is refused; a replacement
#     store is never created).
#
# Ordering (each stage fails closed and stops every later stage):
#
#   S1   inputs, restore-target identity agreement, and source protection,
#        before any external mutation: required environment inputs present
#        and well-formed; the restore target's PG* runtime inputs and
#        EMDASH_MIGRATION_DATABASE_URL identify the same intended database,
#        proven by comparing non-secret identity components only (host
#        case-insensitively, exactly like the accepted T008/T013/T024
#        boundary); the declared restore database identity must differ from
#        the declared active source database identity (SONGHEALTH_SOURCE_DB_
#        IDENTITY as host:port/database, the source port validated and
#        compared NUMERICALLY so leading-zero spellings cannot disguise the
#        same port); and source media mount, restore media destination, and
#        Recovery Set directory must be pairwise safely SEPARATE (canonical
#        equal/ancestor/descendant, symlink-alias, unresolved-tail-alias,
#        physical, and same-device:inode relationships all rejected, with
#        MANDATORY device:inode probes whenever both paths exist and refusal
#        on any failed, empty, or malformed identity reading).
#   S2   complete Recovery Set validation strictly BEFORE any target restore
#        (direct invocation enforces this even without the T024 harness):
#        manifest present/readable/valid JSON/secret-free with one nonempty
#        recovery-set identifier and creation time; T025/T024 manifest shape
#        database.{file,format:"custom",sha256},
#        media.{file,sha256,entries:[{path,size,sha256}]},
#        expected.{taglineValue,taglineSha256} (T025's additional non-secret
#        size/version evidence is accepted); safe artifact basenames (path
#        traversal rejected); both artifacts present/readable; both actual
#        SHA-256 checksums matching; readable UNFILTERED pg_restore --list
#        table of contents; readable media archive whose every member is a
#        plain relative path of regular-file or directory type (absolute
#        paths, `..` components, symlinks, hard links, special objects, and
#        ambiguous duplicate members rejected BEFORE any extraction can
#        modify unrelated objects); every designated media entry present in
#        the archive; each recorded media size/SHA-256 validated against the
#        archive's extracted BYTES (extraction happens only into private
#        scratch outside every store); and the recorded expected tagline
#        evidence equal to the canonical T015 anchor (exact UTF-8 value
#        `Songhealth Feature 001 foundation validation`, exactly 44 bytes,
#        no trailing newline, SHA-256 84753035c0ee9863ab9cd4fa18bf797e6776f
#        b3280e606a579d827a938a4415). Malformed, incomplete, corrupt,
#        mismatched, or substituted inputs are rejected and NEVER invoke a
#        target restore.
#   S3   clean-target verification (still before any mutation): the restore
#        media destination exists as a directory, is not a symlink, is
#        readable/traversable/writable, and is EMPTY; the restore database is
#        reachable through the native PG* inputs, current_database() equals
#        PGDATABASE, and user objects of EVERY kind are absent — relations
#        of all kinds, ROUTINES (functions/procedures/aggregates), and
#        standalone TYPES (with their array types) alongside non-default
#        schemas, extensions, and large objects — so a database carrying
#        only a function or only an enum is a populated existing store and
#        is refused just like one carrying tables. Existing user database
#        objects/data and nonempty or unsafe media destinations are
#        refused — never dropped, cleared, overwritten, or reinitialized.
#   S4   the bounded restoration itself, latest-stage-first-rollbackable:
#        media first (archive extracted into a private staging directory
#        created INSIDE the destination — same filesystem, so publication is
#        an atomic guarded rename; every designated entry re-verified by
#        bytes; each top-level entry published with mv --no-clobber
#        --no-target-directory exact-basename semantics, staged-object
#        device:inode ownership proof, and post-move verification, WITH a
#        per-descendant identity record taken at each verified move; the
#        published destination is then proven to contain EXACTLY the
#        archived entries — a late foreign or replacement entry fails the
#        run and rolls back only what this invocation demonstrably
#        published and still owns: because owning a directory does not
#        establish ownership of its descendants, rollback removes recorded
#        objects one by one (rmdir-only for directories), PRESERVING
#        foreign additions and replaced descendants — including
#        identical-bytes replacements with a different inode — and keeps
#        any directory still holding such an object; staging cleanup
#        follows the same rule), then the database: native `pg_restore
#        --exit-on-error --no-owner --no-privileges` (plus --no-password
#        for non-interactive use) restoring the WHOLE archive into the
#        validated clean target with NO schema/table/section/data-only
#        filtering and NO selected TOC lists; any restore error stops the
#        run nonzero, rolls the media publication back, and refuses a
#        zero-object result. The non-rollbackable native restore runs LAST,
#        after every rollbackable step has been verified; because
#        pg_restore --exit-on-error stops at the first error without
#        undoing applied work, a failed database restore leaves the media
#        destination as it was found (empty, except preserved foreign
#        objects) while the DATABASE may carry partial objects and must be
#        externally reprovisioned before any retry — it is never dropped or
#        cleared here.
#
# Division of ownership: this script performs ONLY this bounded database and
# media restoration. Exit 0 means exactly that restoration succeeded — it is
# NOT a READY result and NOT operational recovery acceptance: the native
# migration status/apply/check gate and the restored-foundation comparison
# belong to the accepted T024 harness S4/S5 (T013/T027 authorities), the
# recovery drill to T028, and runtime-secret recovery stays a separate
# prerequisite (docs/operations/runtime-secret-recovery.md; FR-014).
# Runtime secrets are NOT part of the Recovery Set and are never read,
# restored, accessed, or required here — in particular
# EMDASH_ENCRYPTION_KEY is not a Recovery Set member and is not an input of
# this script. PGPASSWORD travels only through the protected native libpq
# connection mechanism (environment or its supported fallback); no
# credential is ever placed on a command line.
#
# Inputs come from the environment (never committed; never arguments):
#
#   SONGHEALTH_RECOVERY_DIR        Recovery Set directory (absolute,
#                                  existing, readable): database archive +
#                                  media archive + recovery-manifest.json
#   PGHOST/PGPORT/PGDATABASE/PGUSER
#                                  the RESTORE target's identity (non-secret
#                                  components; the restored environment's
#                                  own native runtime inputs)
#   EMDASH_MIGRATION_DATABASE_URL  the restored environment's migration
#                                  connection; must identify the same
#                                  intended database as PG* (checked by
#                                  non-secret identity components only)
#   SONGHEALTH_SOURCE_DB_IDENTITY  the ACTIVE source database identity as
#                                  host:port/database (non-secret) — the
#                                  restore target must differ
#   SONGHEALTH_SOURCE_MEDIA_MOUNT  absolute path of the ACTIVE source media
#                                  mount — the restore destination must be
#                                  safely separate from it (and from the
#                                  Recovery Set directory)
#   SONGHEALTH_RESTORE_MEDIA_MOUNT
#                                  absolute path of the clean restore media
#                                  volume's stable application mount path
#                                  (must already exist, empty)
#
# Fail-closed behavior (every case exits nonzero): missing/invalid inputs;
# missing tools; identity disagreement; source/target collision (including
# numeric-port aliases) or unavailable/unsafe separation evidence; unsafe
# media destination (missing, non-directory, symlink, nonempty, or
# unwritable); unavailable or non-clean restore database; malformed,
# incomplete, corrupt, mismatched, or substituted Recovery Set inputs;
# unsafe or ambiguous archive members; checksum, readability, or
# byte-validation failures; pg_restore or media restoration failures; late
# foreign or replacement destination entries; zero-object restores. Active
# source stores, Recovery Set inputs, and unrelated filesystem objects are
# preserved — including on failure and during cleanup: rollback removes
# only entries this invocation demonstrably published and still owns
# (device:inode object identity plus this run's digest; equal content alone
# never proves ownership).
#
# Secret safety: this script never prints PGPASSWORD, the migration URL, the
# migration credential, the encryption key, or any other secret value.
# Redaction is structural (mirroring the accepted T024/T025 sources) and
# covers ALL published output, not only diagnostics: every status/evidence
# line (pass/info step output and the success banner, which carry dynamic
# values such as identity components, artifact basenames, paths, and the
# recovery-set identifier) flows through publish_out/scrub, and every
# diagnostic (fail_stage/die/fail_input messages, captured tails) flows
# through publish_diag/scrub — so a non-secret-looking value that happens
# to EQUAL a supplied secret (for example a PGDATABASE equal to
# PGPASSWORD, or an artifact basename carrying a credential) can never
# reach unsanitized output on either a successful or a failing run;
# underlying tool error streams (psql, pg_restore, tar, mv, sha256sum,
# stat, mktemp) are captured and released only through the scrubbed tail,
# never inherited; node-side JSON readers report parser failures with
# FIXED messages (the default SyntaxError echoes an excerpt of the raw
# input) and refuse control characters in emitted identifier strings (an
# embedded newline cannot forge later parse lines); errors name the
# failing field/resource only; invalid invocations never echo argument
# values.
#
# Version-sensitive external semantics verified for this script (Context7
# first where supported, per AGENTS.md; see the T026 implementation evidence
# for the dated record): PostgreSQL 18 `pg_restore` — `--exit-on-error` exits
# at the first error while sending SQL commands (the default is to continue
# and report an error count), `--no-owner` and `--no-privileges` suppress
# ownership and grant/revoke restoration, and a custom archive restored
# whole with `--dbname` reconstructs the dumped database
# (postgresql.org/docs/18/app-pgrestore.html, via Context7, 2026-10-12;
# `--list` semantics per the accepted T024 record of 2026-10-11). GNU tar —
# by default tar strips a leading `/` on extraction and complains about
# member names containing `..` (gnu.org/software/tar manual, "Absolute File
# Names", 2026-10-12); this script does NOT rely on those defaults: every
# member name and type is validated from the verbose listing BEFORE any
# extraction (the accepted listing shape `perm owner/group size date time
# name` with type character d/-/l/h/p was verified against GNU tar 1.35).
#
# Exit codes: 0 PASS | 1 FAIL (any stage) | 2 environment error (missing
# tools) | 4 missing or invalid input | 64 usage error.

set -euo pipefail

readonly EXIT_FAIL=1
readonly EXIT_ENV=2
readonly EXIT_CONFIG=4
readonly EXIT_USAGE=64

# Bounded waits so the procedure can never hang (seconds). Each stage is
# individually bounded; a wrapping harness may impose its own tighter
# overall bound, which can only turn an in-flight stage into a failure.
readonly PSQL_TIMEOUT_SECONDS=60
readonly ARCHIVE_LIST_TIMEOUT_SECONDS=120
readonly TAR_EXTRACT_TIMEOUT_SECONDS=300
readonly PG_RESTORE_TIMEOUT_SECONDS=840

# Canonical T015 database validation evidence (T015 §5; identical anchors to
# the accepted T016/T024/T025 sources): the exact native EmDash Site Setting
# tagline value, its UTF-8 byte length, and its SHA-256 digest. The restore
# comparator (T027) owns comparing the RESTORED tagline; here the anchor
# only validates the Recovery Set's recorded expected evidence, so a
# substituted anchor can never be fed downstream.
readonly TAGLINE_EXPECTED='Songhealth Feature 001 foundation validation'
readonly TAGLINE_EXPECTED_SHA256='84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415'
readonly TAGLINE_EXPECTED_BYTES=44

# Recovery Set manifest file name (T025 output contract, validated in S2).
readonly RECOVERY_MANIFEST_NAME='recovery-manifest.json'

# Set while the procedure runs.
SCRATCH=''
STAGING_DIR=''
RECOVERY_DIR=''
RESTORE_MOUNT=''
# Evidence gathered by the stages.
RECOVERY_SET_ID_VALUE=''
MANIFEST_DB_FILE=''
MANIFEST_MEDIA_FILE=''
DB_ARCHIVE=''
MEDIA_ARCHIVE=''
DB_TOC_ENTRIES=''
AGREED_HOST=''
AGREED_PORT=''
AGREED_DATABASE=''
AGREED_USER=''
# Media publication bookkeeping: every top-level entry this invocation
# demonstrably published (parallel arrays: destination basename, recorded
# device:inode identity, directory-ness flag) for the ownership-checked
# rollback.
PUBLISHED_NAMES=()
PUBLISHED_IDS=()
PUBLISHED_ISDIR=()
PUBLISHED_TREES=()
# Staging tree identity record (set after the verified staging extraction).
STAGING_TREE=''

usage() {
	cat <<'EOF'
Usage: scripts/restore-foundation.sh

T026 restore foundation: restore one validated Recovery Set — a complete
unfiltered custom-format PostgreSQL archive plus a separate complete media
archive plus recovery-manifest.json, all produced by the accepted T025
backup procedure — into a CLEAN, EXTERNALLY PROVISIONED restore target.

The complete Recovery Set is validated before any target restore (manifest
shape and secret-freeness, safe basenames, artifact checksums, unfiltered
pg_restore --list readability, safe media member names/types with traversal,
link, special-object, and duplicate rejection, per-entry size/SHA-256
validation against the archive bytes, and the canonical T015 tagline anchor).
The restore database must be reachable and demonstrably empty of user
objects; the media destination must exist, be empty, and be safe. The
database is restored whole with pg_restore --exit-on-error --no-owner
--no-privileges (no schema/table/section/data-only filters, no TOC
selection); media is restored through guarded, ownership-proven publication
into the validated clean destination. Every failure fails closed; active
source stores, Recovery Set inputs, and unrelated filesystem objects are
never modified; nothing is ever dropped, cleared, overwritten, or
reinitialized, and no replacement store is ever created.

Exit 0 means exactly this bounded database/media restoration succeeded —
NOT READY and NOT operational recovery acceptance: the native migration
gate and restored-foundation comparison (T024 S4/S5, T013/T027) and the
recovery drill (T028) remain separate, and runtime secrets are recovered
separately (docs/operations/runtime-secret-recovery.md), never from the
Recovery Set.

Provide the inputs in the environment (see the script header):
SONGHEALTH_RECOVERY_DIR, the restore target's PGHOST/PGPORT/PGDATABASE/
PGUSER and EMDASH_MIGRATION_DATABASE_URL (same intended database, compared
by non-secret identity components only), SONGHEALTH_SOURCE_DB_IDENTITY,
SONGHEALTH_SOURCE_MEDIA_MOUNT, and SONGHEALTH_RESTORE_MEDIA_MOUNT. The
credential travels through the protected native libpq connection mechanism,
never on a command line.

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
	printf 't026: ' >&2
	printf '%s\n' "$message" | publish_diag
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]: the formatted message
	# is published through the structural redaction boundary (publish_out),
	# like every dynamic status/evidence line — an identity component,
	# artifact basename, or path that happens to carry a supplied secret
	# VALUE (for example a PGDATABASE equal to PGPASSWORD) can never reach
	# unsanitized output, on success or failure.
	local name="$1" status="$2"
	shift 2
	local message=''
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't026: [%s] %s %s\n' "$name" "$status" "$message" | publish_out
}

pass() { step "$1" PASS "${@:2}"; }
info() { step "$1" INFO "${@:2}"; }

fail_stage() {
	# fail_stage <stage-name> <printf-format> [args...]: the message is
	# sanitized before publication (publish_diag), so substituted values
	# cannot carry a secret VALUE into evidence. Exits 1; any media
	# rollback decision belongs to the caller (S4 rolls back before
	# failing).
	local name="$1"
	shift
	local message=''
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't026: [%s] FAIL ' "$name" >&2
	printf '%s\n' "$message" | publish_diag
	exit "$EXIT_FAIL"
}

fail_input() {
	# fail_input <message...>: an invalid input or unsafe preconditions
	# (exit 4), sanitized like every published diagnostic.
	local message=''
	# shellcheck disable=SC2059
	message="$(printf -- "$@")"
	printf 't026: [S1] FAIL ' >&2
	printf '%s\n' "$message" | publish_diag
	exit "$EXIT_CONFIG"
}

# ---------------------------------------------------------------------------
# Secret-safe helpers (structural redaction, mirroring the accepted T024
# harness and T025 backup procedure)
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
		printf 't026: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't026: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Path-safety helpers (mirror the accepted T024/T025 source-protection
# defenses)
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

check_paths_separated() {
	# check_paths_separated <a-label> <a-path> <b-label> <b-path>: refuses
	# (fail_input) when the two paths are canonically equal/related, or —
	# when both exist as directories — physically related, or the same
	# underlying device:inode object. Any resolution or identity-evidence
	# failure refuses: separation that cannot be established was not proven.
	local a_label="$1" a_path="$2" b_label="$3" b_path="$4"
	local a_canon='' b_canon=''
	if ! a_canon="$(realpath -m -- "${a_path%/}" 2>/dev/null)" || [ -z "$a_canon" ]; then
		fail_input 'the %s path could not be canonically resolved; safe separation cannot be established — failing closed' \
			"$a_label"
	fi
	if ! b_canon="$(realpath -m -- "${b_path%/}" 2>/dev/null)" || [ -z "$b_canon" ]; then
		fail_input 'the %s path could not be canonically resolved; safe separation cannot be established — failing closed' \
			"$b_label"
	fi
	if media_paths_related "$a_canon" "$b_canon"; then
		fail_input 'the %s and the %s are canonically equal to, inside, or containing each other (equal/ancestor/descendant/symlink/unresolved-tail alias); active source stores, restore targets, and the Recovery Set directory must stay pairwise safely separated' \
			"$a_label" "$b_label"
	fi
	if [ -d "$a_canon" ] && [ -d "$b_canon" ]; then
		local a_phys='' b_phys='' a_stat='' b_stat=''
		if ! a_phys="$(cd -- "$a_canon" 2>/dev/null && pwd -P)" || \
			! b_phys="$(cd -- "$b_canon" 2>/dev/null && pwd -P)"; then
			fail_input 'an existing directory (%s or %s) could not be physically resolved; safe separation cannot be established — failing closed' \
				"$a_label" "$b_label"
		fi
		if media_paths_related "$a_phys" "$b_phys"; then
			fail_input 'the %s and the %s are physically equal to, inside, or containing each other; active source stores, restore targets, and the Recovery Set directory must stay pairwise safely separated' \
				"$a_label" "$b_label"
		fi
		# The underlying-identity probes are MANDATORY whenever both
		# directories exist: a failed, empty, or malformed device:inode
		# reading refuses — lexical/physical inequality alone cannot rule
		# out two paths referencing the same underlying directory.
		a_stat="$(stat -c '%d:%i' -- "$a_phys" 2>/dev/null)" ||
			fail_input 'the device:inode identity of the %s could not be determined; safe separation cannot be established — failing closed' \
				"$a_label"
		b_stat="$(stat -c '%d:%i' -- "$b_phys" 2>/dev/null)" ||
			fail_input 'the device:inode identity of the %s could not be determined; safe separation cannot be established — failing closed' \
				"$b_label"
		printf '%s' "$a_stat" | identity_reading_valid ||
			fail_input 'the complete device:inode reading of the %s is empty, multiline, or not exactly one numeric device:inode tuple; safe separation cannot be established — failing closed' \
				"$a_label"
		printf '%s' "$b_stat" | identity_reading_valid ||
			fail_input 'the complete device:inode reading of the %s is empty, multiline, or not exactly one numeric device:inode tuple; safe separation cannot be established — failing closed' \
				"$b_label"
		if [ "$a_stat" == "$b_stat" ]; then
			fail_input 'the %s and the %s are the same underlying directory (device:inode); active source stores, restore targets, and the Recovery Set directory must stay pairwise safely separated' \
				"$a_label" "$b_label"
		fi
	fi
}

# ---------------------------------------------------------------------------
# Cleanup and rollback. Cleanup removes only this invocation's own scratch
# and staging trees, and staging is removed ownership-safely (see below).
# Rollback removes ONLY destination objects this invocation demonstrably
# published and still owns — INCLUDING per-descendant proofs inside
# published directories: ownership of a directory does NOT establish
# ownership of its descendants, so no unproven descendant is ever removed
# recursively. Foreign additions and replaced descendants (including
# identical-bytes replacements with a different inode) are preserved;
# owned directories are removed only by rmdir when they are empty, and a
# directory still holding a foreign object is kept (reported by basename).
# ---------------------------------------------------------------------------

record_tree() {
	# record_tree <root> <record-file>: evidence of object identity for
	# every entry under <root> (the root itself excluded), as
	# <relative-path>TAB<device:inode>TAB<type> lines (%D is the device
	# number, matching stat's %d). The record is taken at a moment when
	# the whole tree is demonstrably this invocation's own (immediately
	# after a verified move, or after the verified staging extraction), so
	# any later object that does not match it — a foreign addition or an
	# identical-bytes replacement with a different inode — is not provably
	# ours and is never removed.
	find "$1" -mindepth 1 -printf '%P\t%D:%i\t%y\n' 2>/dev/null | LC_ALL=C sort >"$2"
}

remove_owned_tree() {
	# remove_owned_tree <root> <record-file>: removes only recorded objects
	# that STILL carry their recorded device:inode identity. Recorded
	# regular files are removed individually; recorded directories are
	# removed deepest-first by rmdir ONLY when empty; <root> itself is
	# removed by rmdir only when empty. Anything absent, replaced, or never
	# recorded is foreign and preserved; the function returns nonzero when
	# anything under (or including) <root> had to be left in place.
	local root="$1" record="$2"
	local left=0
	local rel id type cur
	while IFS=$'\t' read -r rel id type; do
		[ "$type" = 'f' ] || continue
		cur="$(stat -c '%d:%i' -- "$root/$rel" 2>/dev/null)" || {
			left=1
			continue
		}
		if [ "$cur" != "$id" ]; then
			left=1
			continue
		fi
		rm -f -- "$root/$rel" 2>/dev/null || left=1
	done <"$record"
	# Directories deepest-first, rmdir only — a directory containing a
	# foreign or unproven object refuses removal, which is exactly the
	# required preservation.
	while IFS=$'\t' read -r rel id type; do
		[ "$type" = 'd' ] || continue
		cur="$(stat -c '%d:%i' -- "$root/$rel" 2>/dev/null)" || {
			left=1
			continue
		}
		if [ "$cur" != "$id" ]; then
			left=1
			continue
		fi
		rmdir -- "$root/$rel" 2>/dev/null || left=1
	done < <(awk -F'\t' '$3 == "d" {print}' "$record" |
		awk -F'\t' '{n = gsub(/\//, "/"); print n "\t" $0}' |
		sort -rn | cut -f2-)
	rmdir -- "$root" 2>/dev/null || left=1
	return "$left"
}

cleanup() {
	# Staging removal is ownership-safe: the staging tree identity record
	# (taken after the verified extraction) governs which descendants are
	# provably ours; unexpected entries — the same objects whose presence
	# already makes S4 refuse — are preserved rather than recursively
	# deleted. Without a record (extraction never completed), the staging
	# directory is only rmdir'd when empty. The private mode-0700 scratch
	# tree in TMPDIR is this invocation's own mktemp creation and is
	# removed wholesale.
	if [ -n "$STAGING_DIR" ] && [ -d "$STAGING_DIR" ]; then
		if [ -n "${STAGING_TREE:-}" ] && [ -f "$STAGING_TREE" ]; then
			remove_owned_tree "$STAGING_DIR" "$STAGING_TREE" 2>/dev/null || true
		else
			rmdir -- "$STAGING_DIR" 2>/dev/null || true
		fi
	fi
	if [ -n "$SCRATCH" ] && [ -d "$SCRATCH" ]; then
		rm -rf -- "$SCRATCH" 2>/dev/null || true
	fi
}

owned_published_entry() {
	# owned_published_entry <dest-entry> <recorded-identity> <is-dir>: 0
	# exactly when the destination entry is THIS invocation's own published
	# object: it exists, is of the recorded kind, and STILL carries the
	# device:inode identity recorded at this run's verified move (an
	# identical-bytes replacement is a different file object and is
	# refused — equal content never proves ownership). Descendants inside
	# a published directory are governed by their own recorded identities
	# (remove_owned_tree), never by the directory's.
	local entry="$1" want_id="$2" is_dir="$3"
	local reading='' got_id='' got_type=''
	[ -e "$entry" ] || return 1
	[ -L "$entry" ] && return 1
	reading="$(stat -c '%d:%i|%F' -- "$entry" 2>/dev/null)" || return 1
	got_id="${reading%|*}"
	got_type="${reading#*|}"
	if [ "$is_dir" = 1 ]; then
		[ "$got_type" = 'directory' ] || return 1
	else
		[ "$got_type" = 'regular file' ] || return 1
	fi
	[ "$got_id" = "$want_id" ]
}

rollback_published_media() {
	# Removes ONLY what this invocation demonstrably published and still
	# owns. A published REGULAR FILE is a single proven object (rm -f). A
	# published DIRECTORY is proven only at its own boundary: its
	# descendants are removed solely through the per-descendant identity
	# record taken at its verified move (remove_owned_tree — rmdir-only for
	# directories, preserving foreign additions and replaced descendants),
	# never by an unproven recursive delete. Entries replaced, swapped,
	# symlinked, or never published by this run are foreign and are left
	# untouched.
	local i='' left='' incomplete=''
	for i in "${!PUBLISHED_NAMES[@]}"; do
		if [ -z "${PUBLISHED_NAMES[$i]:-}" ]; then
			continue
		fi
		if ! owned_published_entry "$RESTORE_MOUNT/${PUBLISHED_NAMES[$i]}" "${PUBLISHED_IDS[$i]}" "${PUBLISHED_ISDIR[$i]}"; then
			left+="${left:+, }${PUBLISHED_NAMES[$i]}"
			continue
		fi
		if [ "${PUBLISHED_ISDIR[$i]}" = 1 ]; then
			if ! remove_owned_tree "$RESTORE_MOUNT/${PUBLISHED_NAMES[$i]:?}" "${PUBLISHED_TREES[$i]}" 2>/dev/null; then
				# The directory (or a descendant) still holds an object
				# that is not provably this run's own — preserved.
				incomplete+="${incomplete:+, }${PUBLISHED_NAMES[$i]}"
			fi
		else
			rm -f -- "$RESTORE_MOUNT/${PUBLISHED_NAMES[$i]:?}" 2>/dev/null || left+="${left:+, }${PUBLISHED_NAMES[$i]}"
		fi
	done
	if [ -n "$left" ]; then
		printf 't026: [S4] NOTE rollback left a destination entry that is not an object demonstrably published and still owned by this invocation (replaced, swapped, symlinked, or ambiguous) untouched: %s\n' \
			"$left" | publish_diag
	fi
	if [ -n "$incomplete" ]; then
		printf 't026: [S4] NOTE rollback preserved unproven descendant object(s) (foreign additions or replacements) inside: %s — owned siblings were removed, the rest was left untouched\n' \
			"$incomplete" | publish_diag
	fi
}

# ---------------------------------------------------------------------------
# P0 — tool prerequisites
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in node timeout mktemp sha256sum tar pg_restore psql stat realpath find grep sed awk sort head cmp; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
}

# ---------------------------------------------------------------------------
# S1 — inputs, restore-target identity agreement, source protection
# ---------------------------------------------------------------------------

migration_url_identity() {
	# Prints the non-secret identity components of EMDASH_MIGRATION_DATABASE_URL
	# as "<key> <value>" lines (host, port, database, user), mirroring the
	# accepted T013/T024 boundary. The URL itself — including its password,
	# present or absent — is read inside the node process from the
	# environment and never appears on a command line or in output. Parsing
	# mirrors the native EmDash 1.1.0 postgres migration executor: postgres
	# or postgresql scheme, port defaulting to 5432, no percent-decoding. A
	# usable credential is NOT required here (native protected libpq
	# authentication stays external); a credential-less URL is rejected only
	# by the T024 S6 secret-acceptance checks, never here.
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
		printf 't026: [S1] FAIL missing required input(s): %s\n' "${missing[*]}" | publish_diag
		printf 't026: [S1] provide the documented inputs in the environment (see the script header); no credential is a script input value — the credential travels through the protected native connection mechanism\n' >&2
		exit "$EXIT_CONFIG"
	fi

	local path_input
	for path_input in SONGHEALTH_RECOVERY_DIR SONGHEALTH_SOURCE_MEDIA_MOUNT SONGHEALTH_RESTORE_MEDIA_MOUNT; do
		case ${!path_input} in
		/*) ;;
		*)
			die "$EXIT_CONFIG" '%s must be an absolute path' "$path_input"
			;;
		esac
	done

	case $PGPORT in
	*[!0-9]*)
		die "$EXIT_CONFIG" 'PGPORT must be a TCP port number; the current value is not numeric'
		;;
	esac
	local pgport_value=$((10#$PGPORT))
	if [ "$pgport_value" -lt 1 ] || [ "$pgport_value" -gt 65535 ]; then
		die "$EXIT_CONFIG" 'PGPORT is outside the valid TCP port range 1-65535'
	fi

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

	# PG* / migration-URL identity agreement (non-secret components only;
	# host case-insensitively as in the accepted T008/T013 boundary).
	migration_url_identity >"$SCRATCH/url-identity.txt"
	local url_host='' url_port='' url_database='' url_user='' key value
	while IFS=' ' read -r key value; do
		case $key in
		host) url_host="$value" ;;
		port) url_port="$value" ;;
		database) url_database="$value" ;;
		user) url_user="$value" ;;
		esac
	done <"$SCRATCH/url-identity.txt"
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
		printf 't026: [S1] FAIL the restore target PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: %s\n' \
			"${mismatches[*]}" | publish_diag
		exit "$EXIT_CONFIG"
	fi
	AGREED_HOST="$url_host"
	AGREED_PORT="$url_port"
	AGREED_DATABASE="$url_database"
	AGREED_USER="$url_user"
	info S1 'restore-target identity agreement: host=%s port=%s database=%s user=%s (host compared case-insensitively as in the accepted T008/T013 boundary; password and full URL never printed)' \
		"$AGREED_HOST" "$AGREED_PORT" "$AGREED_DATABASE" "$AGREED_USER"

	# Source-database collision: the operator declares the active source
	# database identity (host:port/database, non-secret); its port is
	# validated and NORMALIZED NUMERICALLY so leading-zero spellings cannot
	# disguise the same port (mirroring the accepted T024 S1 defense).
	node -e '
		const raw = process.env.SONGHEALTH_SOURCE_DB_IDENTITY;
		const m = /^([^:\/]+):(\d+)\/(.+)$/.exec(String(raw).trim());
		if (!m) {
			console.error("SONGHEALTH_SOURCE_DB_IDENTITY must be host:port/database");
			process.exit(4);
		}
		const port = Number(m[2]);
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			console.error("SONGHEALTH_SOURCE_DB_IDENTITY port is outside the valid TCP port range 1-65535");
			process.exit(4);
		}
		process.stdout.write(`host ${m[1]}\nport ${port}\ndatabase ${m[3]}\n`);
	' >"$SCRATCH/source-identity.txt" || die "$EXIT_CONFIG" 'SONGHEALTH_SOURCE_DB_IDENTITY is malformed or its port is not a valid TCP port (expected host:port/database)'
	local src_host='' src_port='' src_database=''
	while IFS=' ' read -r key value; do
		case $key in
		host) src_host="$value" ;;
		port) src_port="$value" ;;
		database) src_database="$value" ;;
		esac
	done <"$SCRATCH/source-identity.txt"
	if [ "${src_host,,}" == "${AGREED_HOST,,}" ] && [ "$src_port" -eq $((10#$AGREED_PORT)) ] &&
		[ "$src_database" == "$AGREED_DATABASE" ]; then
		fail_input 'the declared restore target IS the active source database (host/port/database agree after numeric port normalization); source active stores must never be recovery targets'
	fi

	# Pairwise safe separation of the active source media mount, the restore
	# media destination, and the Recovery Set directory.
	check_paths_separated 'active source media mount' "$SONGHEALTH_SOURCE_MEDIA_MOUNT" \
		'restore media destination' "$SONGHEALTH_RESTORE_MEDIA_MOUNT"
	check_paths_separated 'Recovery Set directory' "$SONGHEALTH_RECOVERY_DIR" \
		'restore media destination' "$SONGHEALTH_RESTORE_MEDIA_MOUNT"
	check_paths_separated 'Recovery Set directory' "$SONGHEALTH_RECOVERY_DIR" \
		'active source media mount' "$SONGHEALTH_SOURCE_MEDIA_MOUNT"

	info S1 'source-store protection: restore target %s:%s/%s, restore media destination, and the Recovery Set directory are pairwise safely separated from the declared active source database identity and source media mount (canonical equal/ancestor/descendant, symlink, unresolved-tail, and physical aliasing rejected; underlying device:inode identities compared, with any failed, empty, or malformed identity reading refusing)' \
		"$AGREED_HOST" "$AGREED_PORT" "$AGREED_DATABASE"
	pass S1 'fail-closed input validation passed before anything was read, created, or mutated'
}

# ---------------------------------------------------------------------------
# S2 — complete Recovery Set validation, before ANY target restore
# ---------------------------------------------------------------------------

parse_recovery_manifest() {
	# parse_recovery_manifest <manifest-file> <entries-tsv-out>: emits
	# "<key> <value>" lines (values contain no spaces) and writes one
	# <path>\t<size>\t<sha256> line per media entry to the TSV file.
	# Parser failures print FIXED messages with captured stderr: the default
	# node SyntaxError would echo an excerpt of the raw manifest.
	local manifest="$1" entries_tsv="$2"
	local rc=0
	node -e '
		const fs = require("fs");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [file, entriesOut, expectedValue, expectedSha, expectedBytes] = process.argv.slice(1);
		let text;
		try {
			text = fs.readFileSync(file, "utf8");
		} catch {
			refuse("the Recovery Set manifest could not be read");
		}
		let m;
		try {
			m = JSON.parse(text);
		} catch {
			refuse("the Recovery Set manifest is not valid JSON");
		}
		if (typeof m !== "object" || m === null) refuse("the Recovery Set manifest is not a JSON object");
		const expected = m.expected ?? {};
		const value = typeof expected.taglineValue === "string" ? expected.taglineValue : "";
		const safeBasename = (s) =>
			typeof s === "string" && s !== "" && s !== "." && s !== ".." && !s.includes("/") &&
			!/[\x00-\x1f\x7f]/.test(s);
		const shaOk = (s) => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
		const lines = [];
		lines.push(`dbFile ${typeof m.database?.file === "string" ? m.database.file : ""}`);
		lines.push(`dbFileSafe ${safeBasename(m.database?.file) ? "yes" : "no"}`);
		lines.push(`mediaFile ${typeof m.media?.file === "string" ? m.media.file : ""}`);
		lines.push(`mediaFileSafe ${safeBasename(m.media?.file) ? "yes" : "no"}`);
		lines.push(`dbFormat ${m.database?.format ?? ""}`);
		lines.push(`dbSha256 ${shaOk(m.database?.sha256) ? m.database.sha256 : "INVALID"}`);
		lines.push(`mediaSha256 ${shaOk(m.media?.sha256) ? m.media.sha256 : "INVALID"}`);
		const entries = Array.isArray(m.media?.entries) ? m.media.entries : [];
		// Control characters in emitted identifier strings could forge
		// additional "<key> <value>" parse lines (an embedded newline
		// cannot be allowed to speak as a later field), so they are
		// refused outright with a FIXED message.
		const ctrl = /[\x00-\x1f\x7f]/;
		if (typeof m.recoverySetId === "string" && ctrl.test(m.recoverySetId)) {
			refuse("the manifest recovery-set identifier contains a control character");
		}
		if (typeof m.createdAt === "string" && ctrl.test(m.createdAt)) {
			refuse("the manifest creation time contains a control character");
		}
		lines.push(`mediaEntryCount ${entries.length}`);
		lines.push(`recoverySetId ${typeof m.recoverySetId === "string" && m.recoverySetId ? "present" : "missing"}`);
		lines.push(`recoverySetIdValue ${typeof m.recoverySetId === "string" ? m.recoverySetId : ""}`);
		lines.push(`createdAt ${typeof m.createdAt === "string" && m.createdAt ? "present" : "missing"}`);
		lines.push(`taglineBytes ${Buffer.byteLength(value, "utf8")}`);
		lines.push(`taglineTrailingNewline ${value.endsWith("\n") ? "yes" : "no"}`);
		lines.push(`taglineValueMatches ${value === expectedValue ? "yes" : "no"}`);
		lines.push(`taglineShaMatches ${expected.taglineSha256 === expectedSha ? "yes" : "no"}`);
		lines.push(`taglineBytesMatch ${Buffer.byteLength(value, "utf8") === Number(expectedBytes) ? "yes" : "no"}`);
		if (/:\/\//.test(text)) lines.push("urlLike present");
		const secretKeys = [...text.matchAll(/"([A-Za-z]*(?:password|secret|token|credential)[A-Za-z]*)"/gi)].map((x) => x[1]);
		if (secretKeys.length > 0) lines.push(`secretKeys ${secretKeys.join(",")}`);
		// T025 records non-secret size/version evidence (database.size,
		// media.size, versions, archiveSummary); those extra keys are
		// accepted — only the T024/T025 contract fields above are required.
		const tsv = [];
		let badEntry = "no";
		let duplicates = "no";
		const seen = new Set();
		for (const e of entries) {
			const shapeOk = e && typeof e === "object" && !Array.isArray(e) &&
				typeof e.path === "string" && e.path !== "" && e.path !== "." &&
				!e.path.startsWith("/") && !e.path.endsWith("/") &&
				!/[\x00-\x1f\x7f]/.test(e.path) &&
				!e.path.split("/").some((c) => c === "" || c === "." || c === "..") &&
				Number.isInteger(e.size) && e.size >= 0 && shaOk(e.sha256);
			if (!shapeOk) { badEntry = "yes"; continue; }
			if (seen.has(e.path)) { duplicates = "yes"; continue; }
			seen.add(e.path);
			tsv.push(`${e.path}\t${e.size}\t${e.sha256}`);
		}
		lines.push(`badEntry ${badEntry}`);
		lines.push(`duplicateEntries ${duplicates}`);
		fs.writeFileSync(entriesOut, tsv.length > 0 ? tsv.join("\n") + "\n" : "");
		process.stdout.write(lines.join("\n") + "\n");
	' "$manifest" "$entries_tsv" "$TAGLINE_EXPECTED" "$TAGLINE_EXPECTED_SHA256" "$TAGLINE_EXPECTED_BYTES" \
		>"$SCRATCH/manifest.parsed" 2>"$SCRATCH/manifest.parse.err" || rc=$?
	if [ "$rc" -ne 0 ]; then
		return 1
	fi
}

validate_media_listing() {
	# validate_media_listing <archive> : validates EVERY member of the media
	# archive from the verbose listing BEFORE any extraction into any store:
	# accepted types are plain regular files and directories only; member
	# names must be relative, traversal-free, component-safe, and
	# control-character-free; duplicate (ambiguous) normalized names are
	# rejected. Emits the validated member set to
	# "$SCRATCH/media-members.txt" as "<f|d> <normalized-name>" lines and the
	# normalized regular-file set (sorted) to "$SCRATCH/expected-files.txt"
	# / directories to "$SCRATCH/expected-dirs.txt" for the post-restore
	# set-equality proof. The GNU tar verbose listing shape (perm
	# owner/group size date time name, type character first in perm) was
	# verified against GNU tar 1.35; any unparseable line refuses.
	local archive="$1"
	local listing="$SCRATCH/media-listing.txt"
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		tar --list --verbose --file "$archive" >"$listing" 2>"$SCRATCH/tar-list.err"; then
		print_tail 'tar --list diagnostics' "$SCRATCH/tar-list.err" 5
		return 1
	fi
	if ! [ -s "$listing" ]; then
		printf 't026: [S2] the media archive listing is empty; it does not carry the designated media\n' >&2
		return 1
	fi
	# Reconstruct names with awk from field 7 onward so file names containing
	# spaces survive; reject any line that does not match the documented
	# listing shape (which also catches member names with embedded newlines
	# corrupting the listing).
	local validated="$SCRATCH/media-members.raw"
	if ! awk '
		NF < 6 { printf "UNPARSEABLE\n"; exit }
		$1 !~ /^[d-][rwxstST-]{9}$/ { printf "UNPARSEABLE\n"; exit }
		$4 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ { printf "UNPARSEABLE\n"; exit }
		$5 !~ /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/ { printf "UNPARSEABLE\n"; exit }
		{
			name = $6
			for (i = 7; i <= NF; i++) name = name " " $i
			print substr($1, 1, 1) " " name
		}
	' "$listing" >"$validated" 2>/dev/null; then
		return 1
	fi
	if grep -qx 'UNPARSEABLE' "$validated"; then
		printf 't026: [S2] the media archive verbose listing contains an unparseable line (unexpected tar output shape or an embedded-newline member name); failing closed before extraction\n' >&2
		return 1
	fi
	# Normalize, classify, and safety-check every member.
	local members="$SCRATCH/media-members.txt"
	if ! node -e '
		const fs = require("fs");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [inFile, membersOut, filesOut, dirsOut] = process.argv.slice(1);
		const lines = fs.readFileSync(inFile, "utf8").split("\n").filter((l) => l !== "");
		const seen = new Set();
		const members = [];
		const files = [];
		const dirs = [];
		for (const line of lines) {
			const type = line.slice(0, 1);
			let name = line.slice(2);
			if (type !== "d" && type !== "-") {
				refuse(`the media archive contains a non-plain member type (symlink, hard link, or special object): ${type === "l" || type === "h" ? "link" : "special"}`);
			}
			if (name.startsWith("/")) refuse("the media archive contains an absolute member name (absolute paths are rejected before extraction)");
			while (name.startsWith("./")) name = name.slice(2);
			if (name.endsWith("/")) name = name.slice(0, -1);
			if (name === "." || name === "") {
				// the archive root member itself (./) — nothing to record
				continue;
			}
			if (/[\x00-\x1f\x7f]/.test(name)) refuse("the media archive contains a member name with control characters");
			const parts = name.split("/");
			for (const p of parts) {
				if (p === "" || p === "." ) refuse("the media archive contains a malformed member name (empty or . component)");
				if (p === "..") refuse("the media archive contains a traversal (..) member name; rejected before extraction can modify unrelated objects");
			}
			if (seen.has(name)) refuse(`the media archive contains an ambiguous duplicate member name: ${name}`);
			seen.add(name);
			members.push(`${type} ${name}`);
			if (type === "d") dirs.push(name);
			else files.push(name);
		}
		files.sort();
		dirs.sort();
		fs.writeFileSync(membersOut, members.join("\n") + (members.length ? "\n" : ""));
		fs.writeFileSync(filesOut, files.join("\n") + (files.length ? "\n" : ""));
		fs.writeFileSync(dirsOut, dirs.join("\n") + (dirs.length ? "\n" : ""));
	' "$validated" "$members" "$SCRATCH/expected-files.txt" "$SCRATCH/expected-dirs.txt" \
		2>"$SCRATCH/media-members.err"; then
		print_tail 'media member validation diagnostics' "$SCRATCH/media-members.err" 5
		return 1
	fi
	if ! [ -s "$SCRATCH/expected-files.txt" ]; then
		printf 't026: [S2] the media archive carries no regular-file members; the designated media is absent\n' >&2
		return 1
	fi
	return 0
}

validate_recovery_set() {
	local dir="$RECOVERY_DIR"
	local manifest="$dir/$RECOVERY_MANIFEST_NAME"

	# (a) manifest present, readable, valid, secret-free.
	if [ ! -f "$manifest" ]; then
		fail_stage S2 'the Recovery Set manifest %s is absent from the Recovery Set directory; without the common association evidence the set cannot be validated or restored' \
			"$RECOVERY_MANIFEST_NAME"
	fi
	if [ ! -r "$manifest" ]; then
		fail_stage S2 'the Recovery Set manifest is present but unreadable'
	fi
	if ! parse_recovery_manifest "$manifest" "$SCRATCH/media-entries.tsv"; then
		print_tail 'manifest parse diagnostics' "$SCRATCH/manifest.parse.err" 5
		fail_stage S2 'the Recovery Set manifest could not be parsed; a malformed manifest fails closed before any restore'
	fi

	local key value
	local recovery_set_id='' created_at='' db_format='' db_sha='' media_sha='' entry_count=0
	local db_file_safe='' media_file_safe=''
	local bad_entry='' duplicate_entries=''
	local tagline_bytes='' tagline_trailing_nl='' tagline_value_ok='' tagline_sha_ok='' tagline_bytes_ok=''
	local url_like='' secret_keys=''
	while IFS=' ' read -r key value; do
		case $key in
		recoverySetId) recovery_set_id="$value" ;;
		recoverySetIdValue) RECOVERY_SET_ID_VALUE="$value" ;;
		createdAt) created_at="$value" ;;
		dbFile) MANIFEST_DB_FILE="$value" ;;
		dbFileSafe) db_file_safe="$value" ;;
		dbFormat) db_format="$value" ;;
		dbSha256) db_sha="$value" ;;
		mediaFile) MANIFEST_MEDIA_FILE="$value" ;;
		mediaFileSafe) media_file_safe="$value" ;;
		mediaSha256) media_sha="$value" ;;
		mediaEntryCount) entry_count="$value" ;;
		badEntry) bad_entry="$value" ;;
		duplicateEntries) duplicate_entries="$value" ;;
		taglineBytes) tagline_bytes="$value" ;;
		taglineTrailingNewline) tagline_trailing_nl="$value" ;;
		taglineValueMatches) tagline_value_ok="$value" ;;
		taglineShaMatches) tagline_sha_ok="$value" ;;
		taglineBytesMatch) tagline_bytes_ok="$value" ;;
		urlLike) url_like="$value" ;;
		secretKeys) secret_keys="$value" ;;
		esac
	done <"$SCRATCH/manifest.parsed"

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

	# Artifact names must be safe basenames inside the Recovery Set
	# directory — a manifest pointing outside the set (path traversal) is
	# unusable. The parser flags unsafe basenames; the shell patterns are
	# defense in depth (the *..* form mirrors the accepted T024 harness).
	local file
	if [ "$db_file_safe" != 'yes' ] || [ "$media_file_safe" != 'yes' ]; then
		fail_stage S2 'a manifest artifact name is missing, unsafe, or not a basename inside the Recovery Set directory (path traversal rejected)'
	fi
	for file in "$MANIFEST_DB_FILE" "$MANIFEST_MEDIA_FILE"; do
		case $file in
		'' | */* | *..* | *$'\t'* | *$'\n'*)
			fail_stage S2 'a manifest artifact name is empty or is not a basename inside the Recovery Set directory (path traversal rejected)'
			;;
		esac
	done
	if [ "$db_format" != 'custom' ]; then
		fail_stage S2 'the recorded database archive format is %s; the contract requires a complete custom-format pg_dump archive' \
			"${db_format:-missing}"
	fi
	if [ "$db_sha" = 'INVALID' ] || [ "$media_sha" = 'INVALID' ]; then
		fail_stage S2 'a recorded artifact checksum is missing or not a SHA-256 value'
	fi
	if [ "$bad_entry" != 'no' ]; then
		fail_stage S2 'a designated media evidence entry is malformed (relative traversal-free path, integer size, and SHA-256 required)'
	fi
	if [ "$duplicate_entries" != 'no' ]; then
		fail_stage S2 'the manifest designates a duplicate media entry path; ambiguous evidence is rejected'
	fi
	if ! printf '%s' "$entry_count" | grep -qE '^[0-9]+$' || [ "$entry_count" -lt 1 ]; then
		fail_stage S2 'the manifest records no designated media evidence; a recovery set for the known validation state must designate at least one media item'
	fi

	DB_ARCHIVE="$RECOVERY_DIR/$MANIFEST_DB_FILE"
	MEDIA_ARCHIVE="$RECOVERY_DIR/$MANIFEST_MEDIA_FILE"

	# (b) BOTH artifact classes present and readable — a set missing either
	# one when both were present at backup time is incomplete (spec edge
	# case) and fails before any restore attempt.
	for file in "$DB_ARCHIVE" "$MEDIA_ARCHIVE"; do
		if [ ! -e "$file" ]; then
			fail_stage S2 'the Recovery Set is incomplete: %s is absent; an incomplete set fails validation and no restore is attempted' \
				"$(basename "$file")"
		fi
		if [ ! -f "$file" ] || [ -L "$file" ]; then
			fail_stage S2 'the Recovery Set artifact %s is not a regular file' "$(basename "$file")"
		fi
		if [ ! -r "$file" ]; then
			fail_stage S2 'the Recovery Set artifact %s is unreadable; an unreadable input fails validation and no restore is attempted' \
				"$(basename "$file")"
		fi
	done

	# (c) both artifact checksums must match the recorded values — a
	# mismatched (corrupt or substituted) artifact is rejected before any
	# readability probing and before any restore attempt.
	local actual_db_sha='' actual_media_sha=''
	actual_db_sha="$(sha256sum -- "$DB_ARCHIVE" 2>"$SCRATCH/sha-db.err" | awk '{print $1}')" || {
		print_tail 'sha256sum diagnostics (database archive)' "$SCRATCH/sha-db.err" 3
		fail_stage S2 'the database archive could not be checksummed'
	}
	actual_media_sha="$(sha256sum -- "$MEDIA_ARCHIVE" 2>"$SCRATCH/sha-media.err" | awk '{print $1}')" || {
		print_tail 'sha256sum diagnostics (media archive)' "$SCRATCH/sha-media.err" 3
		fail_stage S2 'the media archive could not be checksummed'
	}
	if [ "$actual_db_sha" != "$db_sha" ]; then
		fail_stage S2 'database archive checksum mismatch: the artifact does not match the checksum recorded for this recovery-set state (corrupt or mismatched input rejected before restore)'
	fi
	if [ "$actual_media_sha" != "$media_sha" ]; then
		fail_stage S2 'media archive checksum mismatch: the artifact does not match the checksum recorded for this recovery-set state (corrupt or mismatched input rejected before restore)'
	fi
	info S2 'artifact checksums match the recorded recovery-set evidence (database %s, media %s)' \
		"${actual_db_sha:0:16}…" "${actual_media_sha:0:16}…"

	# (d) the database archive is a readable custom-format archive: the
	# table of contents must list successfully. NO filter flags are passed —
	# the listing and the later restore are unfiltered by contract.
	local toc="$SCRATCH/database-toc.txt"
	if ! timeout --kill-after=15 "${ARCHIVE_LIST_TIMEOUT_SECONDS}s" \
		pg_restore --list "$DB_ARCHIVE" >"$toc" 2>"$SCRATCH/pgrestore-list.err"; then
		print_tail 'pg_restore --list diagnostics' "$SCRATCH/pgrestore-list.err" 5
		fail_stage S2 'the database archive is not a readable custom-format archive: pg_restore --list failed (corrupt or unusable input rejected before restore)'
	fi
	if ! [ -s "$toc" ]; then
		fail_stage S2 'the database archive table of contents is empty: the archive does not carry the complete database state'
	fi
	DB_TOC_ENTRIES="$(grep -c -v '^;' "$toc" || true)"
	if [ "$DB_TOC_ENTRIES" -lt 1 ]; then
		fail_stage S2 'the database archive table of contents carries no archive entries'
	fi
	info S2 'database archive readable: unfiltered pg_restore --list produced a nonempty table of contents (%s entries)' \
		"$DB_TOC_ENTRIES"

	# (e) the media archive is readable, every member is a safe plain
	# relative path of regular-file/directory type (no traversal, links,
	# special objects, or ambiguous duplicates), and every designated media
	# entry path is present in the validated member set.
	if ! validate_media_listing "$MEDIA_ARCHIVE"; then
		fail_stage S2 'the media archive failed member validation; unsafe, ambiguous, or unreadable input is rejected before extraction can modify unrelated objects'
	fi
	local epath
	while IFS=$'\t' read -r epath _ _; do
		# Exact full-line match: a substring match would let
		# assets/a.png satisfy a designated assets/a.png.bak.
		if ! grep -qxF -- "- $epath" "$SCRATCH/media-members.txt"; then
			fail_stage S2 'the media archive does not contain the designated media entry %s recorded for this recovery-set state (mismatched set rejected before restore)' \
				"$epath"
		fi
	done <"$SCRATCH/media-entries.tsv"
	info S2 'media archive readable and member-safe: tar --list succeeded, every member is a plain relative regular file/directory, and every designated media entry path is present'

	# (f) per-entry byte validation BEFORE restoration: the archive is
	# extracted once into PRIVATE SCRATCH (outside every store) and every
	# recorded media size/SHA-256 is validated against the extracted bytes,
	# so the manifest checksums provably describe the bytes that will be
	# restored.
	local extract="$SCRATCH/media-extract"
	mkdir -p "$extract"
	if ! timeout --kill-after=15 "${TAR_EXTRACT_TIMEOUT_SECONDS}s" \
		tar --extract --file "$MEDIA_ARCHIVE" --directory "$extract" \
		>"$SCRATCH/tar-extract.out" 2>"$SCRATCH/tar-extract.err"; then
		print_tail 'tar --extract diagnostics' "$SCRATCH/tar-extract.err" 5
		fail_stage S2 'the media archive could not be extracted for byte validation (corrupt or unusable input rejected before restore)'
	fi
	if ! node -e '
		const fs = require("fs");
		const crypto = require("crypto");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [extractDir, entriesFile] = process.argv.slice(1);
		let text;
		try {
			text = fs.readFileSync(entriesFile, "utf8");
		} catch {
			refuse("the designated media evidence could not be read");
		}
		for (const line of text.split("\n")) {
			if (line === "") continue;
			const [path, size, sha] = line.split("\t");
			const target = `${extractDir}/${path}`;
			let st;
			try {
				st = fs.lstatSync(target);
			} catch {
				refuse(`a designated media entry is absent from the extracted archive: ${path}`);
			}
			if (!st.isFile()) refuse(`a designated media entry did not extract as a regular file: ${path}`);
			if (st.size !== Number(size)) refuse(`an extracted designated media entry has the wrong size: ${path}`);
			let buf;
			try {
				buf = fs.readFileSync(target);
			} catch {
				refuse(`a designated media entry could not be read back: ${path}`);
			}
			if (crypto.createHash("sha256").update(buf).digest("hex") !== sha) {
				refuse(`an extracted designated media entry does not match the recorded SHA-256 evidence: ${path}`);
			}
		}
	' "$extract" "$SCRATCH/media-entries.tsv" 2>"$SCRATCH/media-bytes.err"; then
		print_tail 'media byte-validation diagnostics' "$SCRATCH/media-bytes.err" 5
		fail_stage S2 'the media archive bytes do not match the recorded per-entry size/SHA-256 evidence; corrupt or substituted input is rejected before restore'
	fi
	info S2 'every designated media entry validated against the archive bytes (size and SHA-256) in private scratch before any target mutation'

	# (g) the recorded expected tagline evidence equals the canonical T015
	# anchor, so no later comparator can be fed a substituted anchor.
	if [ "$tagline_value_ok" != 'yes' ] || [ "$tagline_sha_ok" != 'yes' ]; then
		fail_stage S2 'the recorded expected tagline evidence does not match the canonical T015 evidence (exact value and SHA-256 required; no substituted anchor is acceptable)'
	fi
	if [ "$tagline_bytes_ok" != 'yes' ] || [ "$tagline_bytes" != "$TAGLINE_EXPECTED_BYTES" ] || [ "$tagline_trailing_nl" != 'no' ]; then
		fail_stage S2 'the recorded expected tagline is not the canonical %s-byte UTF-8 value without a trailing newline' \
			"$TAGLINE_EXPECTED_BYTES"
	fi
	info S2 'expected tagline evidence equals the canonical T015 value: %s bytes, no trailing newline, sha256 %s' \
		"$TAGLINE_EXPECTED_BYTES" "$TAGLINE_EXPECTED_SHA256"

	pass S2 'complete Recovery Set validated pre-restore: manifest shape and secret-freeness, safe basenames, matching checksums, unfiltered pg_restore --list readability, member-safe media archive with per-entry byte validation, one association identifier, canonical T015 anchor (ordering: existence -> checksums -> readability -> association/anchor; no restore attempt before this pass)'
}

# ---------------------------------------------------------------------------
# S3 — clean-target verification (media destination and database; still
# before any mutation)
# ---------------------------------------------------------------------------

check_clean_media_destination() {
	local mount_input="${SONGHEALTH_RESTORE_MEDIA_MOUNT%/}"
	if [ ! -e "$mount_input" ]; then
		fail_stage S3 'the restore media destination is absent; the clean destination is externally provisioned and a replacement store is never created here'
	fi
	if [ -L "$mount_input" ]; then
		fail_stage S3 'the restore media destination is a symlink; an unsafe destination is refused and never followed or created'
	fi
	if [ ! -d "$mount_input" ]; then
		fail_stage S3 'the restore media destination exists but is not a directory'
	fi
	# Physical resolution for every later operation.
	if ! RESTORE_MOUNT="$(cd -- "$mount_input" 2>/dev/null && pwd -P)"; then
		fail_stage S3 'the restore media destination could not be physically resolved'
	fi
	if [ ! -r "$RESTORE_MOUNT" ] || [ ! -x "$RESTORE_MOUNT" ] || [ ! -w "$RESTORE_MOUNT" ]; then
		fail_stage S3 'the restore media destination is not readable/traversable/writable'
	fi
	# Clean = empty: ANY pre-existing entry (including hidden files) is a
	# dirty destination and is refused, never cleared.
	if find "$RESTORE_MOUNT" -mindepth 1 -print -quit 2>/dev/null | grep -q .; then
		fail_stage S3 'the restore media destination is not clean (pre-existing content present); existing stores are never dropped, cleared, overwritten, or reinitialized — restore into a newly provisioned clean destination'
	fi
	pass S3 'restore media destination verified clean: existing directory, not a symlink, readable/traversable/writable, and empty (nothing was created or removed)'
}

check_clean_database() {
	# The restore database must be REACHABLE and DEMONSTRABLY EMPTY of user
	# objects. Connection uses the native PG* client inputs through libpq
	# (-X -w: never read startup files, never prompt, fail instead). A
	# connection failure fails closed: no target is ever created,
	# initialized, or substituted here.
	#
	# The user-object count covers every object class a user can leave in a
	# populated database — relations of all kinds, ROUTINES (functions,
	# procedures, aggregates; pg_proc), and standalone TYPES (enums,
	# domains, composites and their array types; pg_type) — not only the
	# relation subset (native catalog ownership per the PostgreSQL 18
	# pg_proc/pg_type references). All three are counted in the SECOND
	# field so the probe stays one five-field line. Only built-ins of a
	# genuinely fresh database are permitted: pg_catalog/pg_toast/
	# information_schema content is namespace-excluded, array types are
	# attributed to their base type, plpgsql is the allowed default
	# extension, and extension-owned objects (pg_depend deptype 'e') are
	# attributed to the extension gate rather than the routine/type gates.
	# Schemas, non-default extensions, and large objects complete the
	# proof. Verified against real PostgreSQL 18.6: a fresh database
	# reports 0; a database carrying only public.existing_marker() reports
	# 1; a database carrying only enum public.existing_marker reports 2
	# (the enum and its array type).
	local probe="$SCRATCH/db-clean-probe.txt"
	if ! timeout --kill-after=15 "${PSQL_TIMEOUT_SECONDS}s" \
		psql -X -w -t -A -c "SELECT current_database() || '|' ||
			((SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
				WHERE c.relkind IN ('r','p','v','m','S','f')
				AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
			(SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
				WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
				AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')) +
			(SELECT count(*) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
				WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
				AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e'))) || '|' ||
			(SELECT count(*) FROM pg_catalog.pg_namespace
				WHERE nspname !~ '^pg_' AND nspname <> 'information_schema' AND nspname <> 'public') || '|' ||
			(SELECT count(*) FROM pg_catalog.pg_extension WHERE extname <> 'plpgsql') || '|' ||
			(SELECT count(*) FROM pg_catalog.pg_largeobject_metadata)" \
		>"$probe" 2>"$SCRATCH/psql-clean.err"; then
		print_tail 'psql clean-target diagnostics' "$SCRATCH/psql-clean.err" 5
		fail_stage S3 'the restore database could not be inspected (unreachable or authentication refused); an unavailable target is never created or initialized here, and no restore is attempted'
	fi
	local line
	line="$(sed -n '1p' "$probe")"
	if [ -z "$line" ]; then
		fail_stage S3 'the restore database cleanliness probe returned no result'
	fi
	local probe_db='' objects='' schemas='' extensions='' largeobjs=''
	IFS='|' read -r probe_db objects schemas extensions largeobjs <<<"$line"
	if [ "$probe_db" != "$PGDATABASE" ]; then
		fail_stage S3 'the inspected database is not the declared restore target PGDATABASE (connected database disagrees with the agreed identity)'
	fi
	local bad=0
	printf '%s\n' "$objects" "$schemas" "$extensions" "$largeobjs" | grep -qvE '^[0-9]+$' && bad=1
	if [ "$bad" -ne 0 ] || [ "$objects" -ne 0 ] || [ "$schemas" -ne 0 ] || [ "$extensions" -ne 0 ] || [ "$largeobjs" -ne 0 ]; then
		fail_stage S3 'the restore database is not clean (user objects (relations/routines/types)=%s non-default schemas=%s non-default extensions=%s large objects=%s); an existing populated store is never dropped, cleared, overwritten, or reinitialized — provision a fresh clean database externally' \
			"${objects:-?}" "${schemas:-?}" "${extensions:-?}" "${largeobjs:-?}"
	fi
	pass S3 'restore database verified clean and reachable: connected database equals PGDATABASE, zero user objects of every kind (relations, routines, standalone types), zero non-default schemas, zero non-default extensions, zero large objects'
}

# ---------------------------------------------------------------------------
# S4 — the bounded restoration (media first, then the non-rollbackable
# native database restore last)
# ---------------------------------------------------------------------------

restore_media() {
	# Stage INSIDE the validated-clean destination so publication is a
	# same-filesystem rename; the staging directory is this invocation's
	# own mktemp creation and is removed after publication (or by cleanup).
	STAGING_DIR="$(mktemp -d "$RESTORE_MOUNT/.t026-staging.XXXXXX" 2>/dev/null)" || {
		fail_stage S4 'a staging directory could not be created inside the restore media destination; check that it is writable'
	}

	if ! timeout --kill-after=15 "${TAR_EXTRACT_TIMEOUT_SECONDS}s" \
		tar --extract --file "$MEDIA_ARCHIVE" --directory "$STAGING_DIR" \
		>"$SCRATCH/tar-stage.out" 2>"$SCRATCH/tar-stage.err"; then
		print_tail 'tar --extract (staging) diagnostics' "$SCRATCH/tar-stage.err" 5
		rollback_published_media
		fail_stage S4 'the media archive could not be extracted into staging; no restore succeeded'
	fi

	# Re-verify the staged bytes (defense in depth after the S2 scratch
	# validation): every designated entry must be present in staging with
	# the recorded size and SHA-256 before anything is published.
	if ! node -e '
		const fs = require("fs");
		const crypto = require("crypto");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [stagingDir, entriesFile] = process.argv.slice(1);
		const text = fs.readFileSync(entriesFile, "utf8");
		for (const line of text.split("\n")) {
			if (line === "") continue;
			const [path, size, sha] = line.split("\t");
			const target = `${stagingDir}/${path}`;
			const st = fs.lstatSync(target);
			if (!st.isFile()) refuse(`a staged media entry is not a regular file: ${path}`);
			if (st.size !== Number(size)) refuse(`a staged media entry has the wrong size: ${path}`);
			const buf = fs.readFileSync(target);
			if (crypto.createHash("sha256").update(buf).digest("hex") !== sha) {
				refuse(`a staged media entry does not match the recorded SHA-256 evidence: ${path}`);
			}
		}
	' "$STAGING_DIR" "$SCRATCH/media-entries.tsv" 2>"$SCRATCH/media-stage.err"; then
		print_tail 'staged media verification diagnostics' "$SCRATCH/media-stage.err" 5
		rollback_published_media
		fail_stage S4 'the staged media does not match the recorded designated-entry evidence; nothing was published'
	fi

	# Ownership evidence for the staging tree, taken at the moment every
	# staged object is provably this invocation's own: cleanup removes only
	# descendants still carrying these identities, so unexpected entries in
	# staging are preserved instead of recursively deleted.
	STAGING_TREE="$SCRATCH/staging.tree"
	record_tree "$STAGING_DIR" "$STAGING_TREE"

	# Publish every top-level staged entry with exact-basename, no-clobber,
	# ownership-proven semantics: late destination entries are never
	# clobbered, and a landed object must BE the staged object this run
	# created (rename preserves device:inode; equal content alone never
	# proves ownership).
	local top_level="$SCRATCH/staging-top.txt"
	find "$STAGING_DIR" -mindepth 1 -maxdepth 1 -printf '%f\n' 2>"$SCRATCH/find-staging.err" |
		LC_ALL=C sort >"$top_level" || {
			print_tail 'find diagnostics (staging)' "$SCRATCH/find-staging.err" 3
			rollback_published_media
			fail_stage S4 'the staging area could not be enumerated for publication'
		}
	if ! [ -s "$top_level" ]; then
		rollback_published_media
		fail_stage S4 'the staged media archive produced no top-level entries; an empty restoration is refused'
	fi
	local name src dest staged_reading staged_id landed_reading landed_id
	while IFS= read -r name; do
		src="$STAGING_DIR/$name"
		dest="$RESTORE_MOUNT/$name"
		if [ -e "$dest" ] || [ -L "$dest" ]; then
			rollback_published_media
			fail_stage S4 'publication refused: the entry %s appeared in the restore destination after the clean-target verification (late collision); the existing entry was left untouched and nothing was published over it' \
				"$name"
		fi
		staged_reading="$(stat -c '%d:%i|%F' -- "$src" 2>"$SCRATCH/stat-staged.err")" || {
			print_tail 'stat (staged entry) diagnostics' "$SCRATCH/stat-staged.err" 3
			rollback_published_media
			fail_stage S4 'a staged entry could not be identity-read for publication ownership'
		}
		local is_dir=0
		case $staged_reading in
		*'|directory')
			staged_id="${staged_reading%|*}"
			is_dir=1
			;;
		*'|regular file')
			staged_id="${staged_reading%|*}"
			;;
		*)
			rollback_published_media
			fail_stage S4 'publication refused: the staged entry %s is not a regular file or directory object' "$name"
			;;
		esac
		if ! mv -n -T -- "$src" "$dest" 2>"$SCRATCH/mv-publish.err"; then
			print_tail 'mv (publication) diagnostics' "$SCRATCH/mv-publish.err" 3
			rollback_published_media
			fail_stage S4 'publishing the media entry %s failed; the failure was captured and sanitized, and nothing of this run remains published' \
				"$name"
		fi
		if [ -e "$src" ] || [ -L "$src" ]; then
			# mv --no-clobber skipped the move: the destination changed
			# between the guard and the move — the same late-collision
			# refusal, with no relocation anywhere.
			rollback_published_media
			fail_stage S4 'publication refused: the media entry %s could not be moved to its exact destination basename without overwriting an entry that appeared after the clean-target verification; the destination was left untouched' \
				"$name"
		fi
		landed_reading="$(stat -c '%d:%i|%F' -- "$dest" 2>"$SCRATCH/stat-publish.err")" || {
			print_tail 'stat (published entry) diagnostics' "$SCRATCH/stat-publish.err" 3
			rollback_published_media
			fail_stage S4 'the published media entry %s could not be identity-verified after the move' "$name"
		}
		case $landed_reading in
		*'|directory' | *'|regular file') landed_id="${landed_reading%|*}" ;;
		*)
			rollback_published_media
			fail_stage S4 'publication refused: the media entry %s did not land as a regular file or directory at the exact destination basename' \
				"$name"
			;;
		esac
		if [ "$landed_id" != "$staged_id" ]; then
			rollback_published_media
			fail_stage S4 'publication refused: the landed media entry %s is not the original staged object this invocation created (replaced or ambiguous); the destination entry was left untouched' \
				"$name"
		fi
		# Per-descendant ownership evidence, taken at the moment the landed
		# tree is provably this run's own: rollback of a published directory
		# removes only descendants that STILL carry these recorded
		# identities — foreign additions and identical-bytes replacements
		# (different objects) are preserved, never recursively deleted.
		local pub_tree="$SCRATCH/pub-tree-${#PUBLISHED_NAMES[@]}.tree"
		record_tree "$dest" "$pub_tree"
		PUBLISHED_NAMES+=("$name")
		PUBLISHED_IDS+=("$staged_id")
		PUBLISHED_ISDIR+=("$is_dir")
		PUBLISHED_TREES+=("$pub_tree")
	done <"$top_level"

	# Remove this run's own now-empty staging directory before the final
	# set-equality proof (rmdir only: it must be empty; anything else is a
	# foreign or unexpected object and fails the run).
	if ! rmdir -- "$STAGING_DIR" 2>"$SCRATCH/rmdir-staging.err"; then
		print_tail 'rmdir (staging) diagnostics' "$SCRATCH/rmdir-staging.err" 3
		rollback_published_media
		fail_stage S4 'the staging directory was not empty after publication (unexpected or foreign object); the restoration was rolled back'
	fi
	STAGING_DIR=''
	STAGING_TREE=''

	# Final destination proof: the destination must contain EXACTLY the
	# archived entries — no foreign additions, no replacements, no
	# non-plain objects — and every designated entry must still carry its
	# recorded bytes. A late foreign or replacement entry fails here and is
	# rolled back only for entries this run demonstrably owns.
	local actual_files="$SCRATCH/actual-files.txt" actual_dirs="$SCRATCH/actual-dirs.txt"
	find "$RESTORE_MOUNT" -mindepth 1 ! -type f ! -type d -print -quit 2>"$SCRATCH/find-dest.err" |
		grep -q . && {
			rollback_published_media
			fail_stage S4 'the restore destination contains a non-regular entry (symlink or special object) after publication; a foreign or unsafe entry is refused and the restoration was rolled back'
		}
	find "$RESTORE_MOUNT" -mindepth 1 -type d -printf '%P\n' 2>>"$SCRATCH/find-dest.err" |
		LC_ALL=C sort >"$actual_dirs" || {
			print_tail 'find diagnostics (destination)' "$SCRATCH/find-dest.err" 3
			rollback_published_media
			fail_stage S4 'the restore destination could not be enumerated for the final set-equality proof'
		}
	find "$RESTORE_MOUNT" -type f -printf '%P\n' 2>>"$SCRATCH/find-dest.err" |
		LC_ALL=C sort >"$actual_files" || {
			print_tail 'find diagnostics (destination)' "$SCRATCH/find-dest.err" 3
			rollback_published_media
			fail_stage S4 'the restore destination could not be enumerated for the final set-equality proof'
		}
	if ! cmp -s "$SCRATCH/expected-files.txt" "$actual_files"; then
		rollback_published_media
		fail_stage S4 'the restore destination does not contain exactly the archived media files (late foreign or replacement entry, or missing entry); the restoration was rolled back and foreign entries were left untouched'
	fi
	if ! cmp -s "$SCRATCH/expected-dirs.txt" "$actual_dirs"; then
		rollback_published_media
		fail_stage S4 'the restore destination does not contain exactly the archived media directories (late foreign or replacement entry, or missing directory); the restoration was rolled back and foreign entries were left untouched'
	fi
	if ! node -e '
		const fs = require("fs");
		const crypto = require("crypto");
		const refuse = (m) => { console.error(m); process.exit(1); };
		const [mount, entriesFile] = process.argv.slice(1);
		const text = fs.readFileSync(entriesFile, "utf8");
		for (const line of text.split("\n")) {
			if (line === "") continue;
			const [path, size, sha] = line.split("\t");
			const buf = fs.readFileSync(`${mount}/${path}`);
			if (buf.length !== Number(size)) refuse(`a published media entry has the wrong size: ${path}`);
			if (crypto.createHash("sha256").update(buf).digest("hex") !== sha) {
				refuse(`a published media entry does not match the recorded SHA-256 evidence (replaced after publication?): ${path}`);
			}
		}
	' "$RESTORE_MOUNT" "$SCRATCH/media-entries.tsv" 2>"$SCRATCH/media-final.err"; then
		print_tail 'final media verification diagnostics' "$SCRATCH/media-final.err" 5
		rollback_published_media
		fail_stage S4 'the published media does not match the recorded designated-entry evidence; the restoration was rolled back'
	fi

	info S4 'media restored: %s designated entries published from the validated archive; destination proven to contain exactly the archived files/directories by path set and per-entry size/SHA-256' \
		"$(grep -c . "$SCRATCH/media-entries.tsv" || true)"
	pass S4 'media restoration complete into the verified clean destination (guarded no-clobber publication with ownership-proven rollback; foreign entries never touched)'
}

restore_database() {
	# The native, non-rollbackable step runs LAST, after every rollbackable
	# step has been verified. Complete unfiltered custom-format restore with
	# the exact contract flags — no schema/table/section/data-only filters,
	# no TOC selection, no --clean/--if-exists of any kind: the target was
	# proven empty, so nothing is ever dropped or overwritten. Connection
	# through the native PG* libpq inputs; --no-password keeps the run
	# non-interactive (fail instead of prompt).
	info S4 'restore invocation: pg_restore --exit-on-error --no-owner --no-privileges --no-password --dbname %s <recovery-set>/%s' \
		"$PGDATABASE" "$MANIFEST_DB_FILE"
	if ! timeout --kill-after=30 "${PG_RESTORE_TIMEOUT_SECONDS}s" \
		pg_restore --exit-on-error --no-owner --no-privileges --no-password \
			--dbname "$PGDATABASE" -- "$DB_ARCHIVE" \
		>"$SCRATCH/pgrestore.out" 2>"$SCRATCH/pgrestore.err"; then
		print_tail 'pg_restore diagnostics' "$SCRATCH/pgrestore.err" 10
		# The database step is not itself reversible, so the bounded
		# restoration failed as a unit: roll the media publication back too,
		# leaving the destination as it was found (empty) for an externally
		# reprovisioned retry. pg_restore --exit-on-error stops at the first
		# error but does not undo already-applied work, so the DATABASE may
		# now carry partial objects and must be externally reprovisioned
		# before any retry — never dropped or cleared here.
		rollback_published_media
		fail_stage S4 'pg_restore failed (error-stopping restore: --exit-on-error stopped at the first error); the media publication was rolled back, the bounded restoration did NOT succeed, the database may carry partial objects and must be externally reprovisioned before any retry, and no success is claimed'
	fi

	# The restore must have landed content: a zero-object "successful"
	# restore is refused (an empty result never claims restoration success).
	local probe="$SCRATCH/db-after-probe.txt"
	if ! timeout --kill-after=15 "${PSQL_TIMEOUT_SECONDS}s" \
		psql -X -w -t -A -c "SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
			WHERE c.relkind IN ('r','p','v','m','S','f')
			AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'" \
		>"$probe" 2>"$SCRATCH/psql-after.err"; then
		print_tail 'psql post-restore diagnostics' "$SCRATCH/psql-after.err" 5
		rollback_published_media
		fail_stage S4 'the restored database could not be inspected after pg_restore; the media publication was rolled back and no success is claimed'
	fi
	local restored_objects
	restored_objects="$(sed -n '1p' "$probe")"
	if ! printf '%s' "$restored_objects" | grep -qE '^[0-9]+$' || [ "$restored_objects" -lt 1 ]; then
		rollback_published_media
		fail_stage S4 'the restore reported success but the target carries no user objects; the media publication was rolled back and an empty restoration never claims success'
	fi
	info S4 'database restored whole: unfiltered pg_restore --exit-on-error --no-owner --no-privileges exited 0; the target now carries %s user relations (integrity comparison belongs to T027/T024 S4-S5, not this script)' \
		"$restored_objects"
	pass S4 'database restoration complete into the verified clean target (whole archive, error-stopping, no filters, no TOC selection)'
}

# ---------------------------------------------------------------------------
# main flow
# ---------------------------------------------------------------------------

run_restore() {
	require_tools

	# Scratch creation failures are reported with fixed messages: the raw
	# mktemp/cd diagnostics embed operator-supplied path components and are
	# discarded, never inherited.
	SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/t026-restore.XXXXXX" 2>/dev/null)" || {
		die "$EXIT_ENV" 'a scratch directory could not be created under TMPDIR'
	}
	chmod 700 "$SCRATCH"

	# S1 — inputs and source protection, before any external mutation.
	validate_inputs

	# S2 — complete Recovery Set validation; no restore attempt before this
	# passes (direct invocation enforces this without the T024 harness).
	validate_recovery_set

	# S3 — clean targets (media destination and database), still before any
	# mutation.
	check_clean_media_destination
	check_clean_database

	# S4 — the bounded restoration: rollbackable media publication first,
	# then the non-rollbackable native database restore last.
	restore_media
	restore_database

	# Every banner line flows through the structural redaction boundary:
	# the success/evidence lines carry operator-supplied dynamic values
	# (recovery-set identifier, target identity components, tested tree),
	# and the static lines follow the same boundary for uniformity.
	printf 't026: ================================================================\n' | publish_out
	printf 't026: T026 restore foundation: PASS\n' | publish_out
	printf 't026: the bounded database/media restoration into the clean target succeeded (whole unfiltered error-stopping pg_restore + guarded media publication)\n' | publish_out
	printf 't026: recovery set %s restored into target %s:%s/%s and the restore media destination\n' \
		"${RECOVERY_SET_ID_VALUE:-unknown}" \
		"$AGREED_HOST" "$AGREED_PORT" "$AGREED_DATABASE" | publish_out
	printf 't026: exit 0 means exactly this bounded restoration succeeded — NOT READY and NOT operational recovery acceptance\n' | publish_out
	printf 't026: the native migration gate and restored-foundation comparison remain with the T024 harness S4/S5 (T013/T027 authorities) and the T028 drill\n' | publish_out
	printf 't026: runtime-secret recovery is separate and was not performed; the Recovery Set contains no secrets and none were required here\n' | publish_out
	printf 't026: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')" | publish_out
	printf 't026: ================================================================\n' | publish_out
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
	trap 'rollback_published_media; cleanup; exit 130' INT TERM HUP

	run_restore
}

main "$@"
