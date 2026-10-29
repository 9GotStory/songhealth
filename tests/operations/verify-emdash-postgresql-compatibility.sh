#!/usr/bin/env bash
# node -e programs are single-quoted on purpose: the JavaScript must not be
# shell-expanded.
# shellcheck disable=SC2016
#
# Songhealth native EmDash/PostgreSQL compatibility gate (Feature 001, T006).
#
# Blocking verification that the pinned native combination — EmDash 1.1.0 with
# its native PostgreSQL adapter and core migrations, against PostgreSQL 18.6 —
# builds, migrates, and starts as one integrated Astro application, using the
# accepted T004 application configuration and the T005 rootless-Podman
# development database controls. This is the hard compatibility gate from
# tasks.md Phase 2: on any failure, dependent work halts; this script must not
# patch EmDash, add a compatibility adapter/layer, introduce a migration
# framework or service, use an alternate database or architecture, or add
# Product content. It consumes native EmDash behavior only and never mirrors
# or synthesizes the schema.
#
# Steps (all fail closed; only exit 0 is PASS):
#
#   S1  validate the native runtime/migration inputs and prove — comparing
#       non-secret identity components only (host, port, database, user) —
#       that the PG* application inputs and EMDASH_MIGRATION_DATABASE_URL
#       identify the same intended database, before any migration runs
#   S2  npm ci from the committed lockfile and verify the installed EmDash
#       and pg versions equal the versions pinned in package.json
#   S3  start (or reuse) the T005 development PostgreSQL container through
#       scripts/dev-db.sh, then prove connectivity and the exact server
#       version through the application's own pg driver reading the PG*
#       runtime inputs
#   S4  build the exact application (astro build), prove it emits the native
#       .emdash/migrations.json manifest, record the manifest checksum, and
#       prove the manifest is secret-free and records only the migration
#       connection variable NAME
#   S5  inspect the intended target with `emdash migrate --status --json`,
#       derive the target fingerprint from that inspected target, and prove
#       the reported target label agrees with the PG* identity
#   S6  apply pending native migrations with plain `emdash migrate` carrying
#       the required non-interactive --expected-target-fingerprint safety
#   S7  verify the resulting state with `emdash migrate --check` (exit 0
#       means nothing pending and nothing unknown)
#   S8  start the integrated built application (dist/server/entry.mjs) with
#       the native runtime inputs and prove startup success: the server
#       answers, and the native EmDash admin path — which performs full
#       runtime initialization and enforces the applied migration state —
#       responds 2xx/3xx. No T007+ behavior (configuration validation
#       wiring, SSR verification page, readiness helper) is added or
#       required by this check.
#   S9  bounded cleanup: stop the application process this run started; stop
#       the development database container only if this run started it;
#       never delete or reinitialize the container or its persistent volume
#
# Inputs come from the environment (never committed). Supply them from the
# ignored .env file, e.g.:
#
#   set -a; . ./.env; set +a; ./tests/operations/verify-emdash-postgresql-compatibility.sh
#
# Required inputs (see .env.example): PGHOST, PGPORT, PGDATABASE, PGUSER,
# PGPASSWORD, EMDASH_MIGRATION_DATABASE_URL, EMDASH_SITE_URL, HOST, PORT,
# EMDASH_ENCRYPTION_KEY.
#
# The gate is idempotent and suitable for independent rerun: a database that
# already has every migration applied reports nothing pending, the apply step
# is a verified no-op, and --check still proves the clean state. Because the
# T005 volume persists, reruns never reinitialize existing data.
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

# Pinned versions this gate must exercise (package.json is the manifest
# authority; the installed packages are asserted against these).
readonly PINNED_EMDASH_VERSION='1.1.0'
readonly PINNED_PG_PACKAGE_VERSION='8.23.1'
# The gate exists to prove compatibility with PostgreSQL 18.6 specifically.
readonly EXPECTED_PG_SERVER_PREFIX='PostgreSQL 18.6'

# Bounded waits so the harness can never hang (seconds).
readonly NPM_CI_TIMEOUT_SECONDS=900
readonly BUILD_TIMEOUT_SECONDS=900
readonly EMDASH_CMD_TIMEOUT_SECONDS=600
readonly APP_READY_TIMEOUT_SECONDS=90
readonly APP_TERM_WAIT_SECONDS=15
readonly CURL_MAX_TIME_SECONDS=20
readonly PORT_PROBE_MAX_TIME_SECONDS=2

# Migration connection variable NAME the native manifest must record
# (set for the PostgreSQL adapter in the accepted astro.config.mjs).
readonly EXPECTED_MIGRATION_ENV_NAME='EMDASH_MIGRATION_DATABASE_URL'

# Set while the gate runs.
ROOT=''
TMP_DIR=''
APP_PID=''
DB_STARTED_BY_RUN=0

usage() {
	cat <<'EOF'
Usage: tests/operations/verify-emdash-postgresql-compatibility.sh

Blocking T006 compatibility gate: prove the pinned native combination
(EmDash 1.1.0 + PostgreSQL 18.6) builds, migrates, and starts as one
integrated Astro application using the accepted T004 configuration and the
T005 rootless-Podman development database controls.

Sequence: input validation and PG*/migration-URL identity agreement ->
npm ci from the committed lockfile with pinned-version asserts -> T005
database start/reuse and pg-driver server-version proof -> exact application
build emitting the native .emdash/migrations.json (checksum + secret-free
asserts) -> emdash migrate --status --json target inspection and fingerprint
derivation -> non-interactive emdash migrate apply with
--expected-target-fingerprint -> emdash migrate --check -> integrated
application startup proof -> bounded cleanup.

Cleanup: the application process this run started is always stopped; the
development database container is stopped only if this run started it (a
container that was already ready is left running). The container and its
persistent volume are never deleted or reinitialized.

Provide all required inputs in the environment (see .env.example), e.g.:
  set -a; . ./.env; set +a; ./tests/operations/verify-emdash-postgresql-compatibility.sh

Exit codes: 0 PASS | 1 FAIL | 2 environment error | 4 missing/invalid
input | 64 usage error.
EOF
}

die() {
	# die <exit-code> <message...>
	local code="$1"
	shift
	printf 't006: %s\n' "$*" >&2
	exit "$code"
}

step() {
	# step <name> <status> <printf-format> [args...]
	local name="$1" status="$2"
	shift 2
	printf 't006: [%s] %s ' "$name" "$status"
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
	printf 't006: [%s] FAIL ' "$name" >&2
	# The format is always this script's own literal message.
	# shellcheck disable=SC2059
	printf -- "$*" >&2
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
		printf 't006: %s (last %s lines, secret-scrubbed):\n' "$label" "$lines" >&2
		tail -n "$lines" "$file" | scrub >&2
	else
		printf 't006: %s: (no captured output)\n' "$label" >&2
	fi
}

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

cleanup() {
	if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
		# Stop exactly the process this run started.
		kill -TERM "$APP_PID" 2>/dev/null || true
		local waited=0
		while kill -0 "$APP_PID" 2>/dev/null && [ "$waited" -lt "$APP_TERM_WAIT_SECONDS" ]; do
			sleep 1
			waited=$((waited + 1))
		done
		if kill -0 "$APP_PID" 2>/dev/null; then
			kill -KILL "$APP_PID" 2>/dev/null || true
			printf 't006: [cleanup] WARN application process %s needed SIGKILL\n' "$APP_PID" >&2
		else
			step cleanup INFO 'application process %s stopped' "$APP_PID"
		fi
		wait "$APP_PID" 2>/dev/null || true
		APP_PID=''
	fi
	if [ "$DB_STARTED_BY_RUN" -eq 1 ]; then
		# Stop only a container this run started; dev-db.sh stop never
		# deletes the container or the persistent volume.
		if "$ROOT/scripts/dev-db.sh" stop >/dev/null 2>&1; then
			step cleanup INFO 'development database container stopped (container and data volume preserved)'
		else
			step cleanup WARN 'development database container stop failed; inspect with: npm run dev-db:status'
		fi
	fi
	if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
		rm -rf "$TMP_DIR"
	fi
}

# ---------------------------------------------------------------------------
# S1 — inputs and identity agreement (before any migration)
# ---------------------------------------------------------------------------

require_tools() {
	local missing=()
	local tool
	for tool in node npm podman curl sha256sum timeout git; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		die "$EXIT_ENV" "required tool(s) not on PATH: ${missing[*]}"
	fi
	if [ "$(id -u)" -eq 0 ]; then
		die "$EXIT_ENV" "refusing to run as root: the T005 database controls require rootless Podman"
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
		printf 't006: [S1] FAIL missing required input(s): %s\n' "${missing[*]}" >&2
		printf 't006: [S1] provide the documented native inputs in the environment; see .env.example, e.g. set -a; . ./.env; set +a\n' >&2
		exit "$EXIT_CONFIG"
	fi

	local port_var port_value
	for port_var in PGPORT PORT; do
		port_value="${!port_var}"
		case $port_value in
		*[!0-9]*)
			die "$EXIT_CONFIG" "${port_var} must be a TCP port number; the current value is not numeric"
			;;
		esac
		port_value=$((10#$port_value))
		if [ "$port_value" -lt 1 ] || [ "$port_value" -gt 65535 ]; then
			die "$EXIT_CONFIG" "${port_var} is outside the valid TCP port range 1-65535"
		fi
	done
	# HOST and PORT are the native Astro application-server input names.
	# shellcheck disable=SC2153
	if [ "$PORT" = "$PGPORT" ]; then
		die "$EXIT_CONFIG" "PORT and PGPORT must differ: the application and the development database cannot share one host port"
	fi

	# The gate proves a loopback development boundary only; anything else is
	# an environment this harness must not operate on.
	# shellcheck disable=SC2153
	case $HOST in
	127.0.0.1 | localhost | ::1) ;;
	*)
		die "$EXIT_CONFIG" "HOST must be a local loopback host for this gate (supported forms: 127.0.0.1, localhost, ::1)"
		;;
	esac

	case $EMDASH_SITE_URL in
	http://* | https://*) ;;
	*)
		die "$EXIT_CONFIG" "EMDASH_SITE_URL must be an absolute http:// or https:// origin"
		;;
	esac
}

probe_host_url() {
	# probe_host_url <host> <port> -> prints the http:// base URL with an
	# IPv6 host bracketed for curl.
	local host="$1" port="$2"
	case $host in
	*:*) printf 'http://[%s]:%s' "$host" "$port" ;;
	*) printf 'http://%s:%s' "$host" "$port" ;;
	esac
}

require_app_port_free() {
	local probe_url rc=0
	probe_url="$(probe_host_url "$HOST" "$PORT")/"
	curl -s --max-time "$PORT_PROBE_MAX_TIME_SECONDS" -o /dev/null "$probe_url" || rc=$?
	if [ "$rc" -eq 0 ]; then
		die "$EXIT_CONFIG" "the application port is already answering on the configured HOST/PORT boundary; stop the occupying process or configure another PORT"
	elif [ "$rc" -ne 7 ]; then
		# 7 = connection refused (port free); anything else is undeterminable.
		die "$EXIT_CONFIG" "could not determine whether the application port is free (curl exit ${rc}); refusing to continue"
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
		printf 't006: [S1] FAIL the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: %s\n' \
			"${mismatches[*]}" >&2
		exit "$EXIT_CONFIG"
	fi

	# These four components are the documented non-secret identity evidence.
	info S1 'identity agreement: host=%s port=%s database=%s user=%s (password and full URL never printed)' \
		"$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER"
	pass S1 'inputs valid and PG*/migration-URL identity agreement proven (non-secret components only)'
}

# ---------------------------------------------------------------------------
# S2 — reproducible install with pinned-version asserts
# ---------------------------------------------------------------------------

record_tool_versions() {
	info S2 'node %s, npm %s, podman %s' \
		"$(node --version)" "$(npm --version)" "$(podman --version 2>/dev/null | head -1 | sed 's/^podman version //')"

	local engines_node engines_npm
	engines_node="$(node -p 'require("./package.json").engines.node')"
	engines_npm="$(node -p 'require("./package.json").engines.npm')"
	if [ "$(node --version)" != "v${engines_node}" ]; then
		info S2 'NOTE installed node %s differs from the package.json engines pin v%s (recorded for review; this gate pins EmDash/PostgreSQL, not the host toolchain)' \
			"$(node --version)" "$engines_node"
	fi
	if [ "$(npm --version)" != "$engines_npm" ]; then
		info S2 'NOTE installed npm %s differs from the package.json pin %s (recorded for review)' \
			"$(npm --version)" "$engines_npm"
	fi
}

run_npm_ci() {
	if ! timeout --kill-after=30 "${NPM_CI_TIMEOUT_SECONDS}s" npm ci \
		>"$TMP_DIR/npm-ci.out" 2>"$TMP_DIR/npm-ci.err"; then
		print_tail 'npm ci output' "$TMP_DIR/npm-ci.out"
		print_tail 'npm ci diagnostics' "$TMP_DIR/npm-ci.err"
		fail_gate S2 'npm ci failed against the committed lockfile'
	fi

	local installed_emdash installed_pg pinned_dep_emdash pinned_dep_pg
	installed_emdash="$(node -p 'require("./node_modules/emdash/package.json").version')"
	installed_pg="$(node -p 'require("./node_modules/pg/package.json").version')"
	pinned_dep_emdash="$(node -p 'require("./package.json").dependencies.emdash')"
	pinned_dep_pg="$(node -p 'require("./package.json").dependencies.pg')"
	if [ "$installed_emdash" != "$PINNED_EMDASH_VERSION" ] || [ "$pinned_dep_emdash" != "$PINNED_EMDASH_VERSION" ]; then
		fail_gate S2 'installed/pinned EmDash version is not %s (installed %s, manifest dependency %s)' \
			"$PINNED_EMDASH_VERSION" "$installed_emdash" "$pinned_dep_emdash"
	fi
	if [ "$installed_pg" != "$PINNED_PG_PACKAGE_VERSION" ] || [ "$pinned_dep_pg" != "$PINNED_PG_PACKAGE_VERSION" ]; then
		fail_gate S2 'installed/pinned pg version is not %s (installed %s, manifest dependency %s)' \
			"$PINNED_PG_PACKAGE_VERSION" "$installed_pg" "$pinned_dep_pg"
	fi
	pass S2 'npm ci completed from the committed lockfile; installed emdash %s and pg %s match the pinned manifest' \
		"$installed_emdash" "$installed_pg"
}

# ---------------------------------------------------------------------------
# S3 — T005 development database + pg-driver server proof
# ---------------------------------------------------------------------------

start_development_database() {
	local status_rc=0
	"$ROOT/scripts/dev-db.sh" status >/dev/null 2>"$TMP_DIR/db-status-before.err" || status_rc=$?
	case $status_rc in
	0)
		info S3 'development database already ready (container and persistent volume preserved; left running)'
		;;
	2 | 3)
		# stopped | absent: this run starts it and therefore also stops it
		# during cleanup (stop never deletes the container or volume).
		DB_STARTED_BY_RUN=1
		if ! "$ROOT/scripts/dev-db.sh" start >"$TMP_DIR/db-start.out" 2>"$TMP_DIR/db-start.err"; then
			print_tail 'dev-db start output' "$TMP_DIR/db-start.out"
			print_tail 'dev-db start diagnostics' "$TMP_DIR/db-start.err"
			fail_gate S3 'T005 dev-db.sh start failed'
		fi
		info S3 'development database started through T005 controls (stopped again at cleanup; data volume preserved)'
		;;
	*)
		print_tail 'dev-db status diagnostics' "$TMP_DIR/db-status-before.err"
		fail_gate S3 'T005 dev-db.sh status is not ready/stopped/absent (exit %s); inspect with: npm run dev-db:status' \
			"$status_rc"
		;;
	esac

	local ready_rc=0
	"$ROOT/scripts/dev-db.sh" status >"$TMP_DIR/db-status-after.out" 2>/dev/null || ready_rc=$?
	if [ "$ready_rc" -ne 0 ]; then
		fail_gate S3 'development database did not report ready after start (dev-db.sh status exit %s)' "$ready_rc"
	fi

	# Record the pinned image reference from the accepted T005 helper (the
	# authority for the pin) and the running container's image identity.
	local pinned_image_ref container_image
	pinned_image_ref="$(sed -n "s/^readonly IMAGE_REF='\(.*\)'$/\1/p" "$ROOT/scripts/dev-db.sh")"
	if [ -z "$pinned_image_ref" ]; then
		fail_gate S3 'could not read the pinned IMAGE_REF from scripts/dev-db.sh'
	fi
	container_image="$(podman container inspect --format '{{.ImageName}}' songhealth-dev-db 2>/dev/null || true)"
	info S3 'pinned PostgreSQL image: %s' "$pinned_image_ref"
	info S3 'running container image: %s' "${container_image:-unknown}"
}

prove_database_server() {
	# Connect with the application's own pg driver using only the native PG*
	# runtime inputs (the Client constructor reads them from the
	# environment), then read the server version. No credential appears on
	# any command line, and the query proves the pinned pg driver speaks to
	# the pinned PostgreSQL server.
	local server_version rc=0
	server_version="$(node -e '
		const { Client } = require("pg");
		const client = new Client({ connectionTimeoutMillis: 10000 });
		client
			.connect()
			.then(() => client.query("select version()"))
			.then((result) => {
				process.stdout.write(String(result.rows[0].version));
				return client.end();
			})
			.catch((error) => {
				console.error(`pg connection/query failed: ${error.code ?? "UNKNOWN"} ${error.message}`);
				process.exit(1);
			});
	' 2>"$TMP_DIR/pg-version.err")" || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'pg driver diagnostics' "$TMP_DIR/pg-version.err"
		fail_gate S3 'the application pg driver could not query the database through the PG* runtime inputs'
	fi

	case $server_version in
	"$EXPECTED_PG_SERVER_PREFIX"*)
		info S3 'database server reports: %s' "$server_version"
		pass S3 'connectivity proven through the application pg driver; server is %s' \
			"$EXPECTED_PG_SERVER_PREFIX"
		;;
	*)
		fail_gate S3 'database server version is not the pinned %s (reported: %s)' \
			"$EXPECTED_PG_SERVER_PREFIX" "$server_version"
		;;
	esac
}

# ---------------------------------------------------------------------------
# S4 — exact application build and native manifest
# ---------------------------------------------------------------------------

build_application() {
	# Remove any stale generated manifest first so this run provably consumes
	# the manifest emitted by the exact application build (.emdash/ is
	# generated, gitignored output; never a tracked artifact).
	rm -f .emdash/migrations.json

	if ! timeout --kill-after=30 "${BUILD_TIMEOUT_SECONDS}s" npm run build \
		>"$TMP_DIR/build.out" 2>"$TMP_DIR/build.err"; then
		print_tail 'build output' "$TMP_DIR/build.out"
		print_tail 'build diagnostics' "$TMP_DIR/build.err"
		fail_gate S4 'astro build failed'
	fi
	pass S4 'exact application built (npm run build)'

	if [ ! -f .emdash/migrations.json ]; then
		fail_gate S4 'the exact application build did not emit the native .emdash/migrations.json manifest'
	fi
	if [ ! -f dist/server/entry.mjs ]; then
		fail_gate S4 'the exact application build did not emit dist/server/entry.mjs'
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
		fail_gate S4 'the emitted migration manifest is not valid JSON'
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

	if [ "$schema_version" != '1' ]; then
		fail_gate S4 'unexpected manifest schemaVersion %s' "${schema_version:-missing}"
	fi
	if [ "$emdash_version" != "$PINNED_EMDASH_VERSION" ]; then
		fail_gate S4 'manifest emdashVersion %s does not match the pinned %s' \
			"${emdash_version:-missing}" "$PINNED_EMDASH_VERSION"
	fi
	if ! printf '%s' "$migration_count" | grep -qE '^[0-9]+$' || [ "$migration_count" -lt 1 ]; then
		fail_gate S4 'manifest migration set is empty or missing'
	fi
	if ! printf '%s' "$set_fp" | grep -qE '^[0-9a-f]{64}$'; then
		fail_gate S4 'manifest migration-set fingerprint is missing or not a SHA-256 value'
	fi
	if [ "$db_type" != 'postgres' ]; then
		fail_gate S4 'manifest database type %s is not the native postgres adapter' "${db_type:-missing}"
	fi
	if [ "$env_name" != "$EXPECTED_MIGRATION_ENV_NAME" ]; then
		fail_gate S4 'manifest migration connection variable is %s, expected the NAME %s' \
			"${env_name:-missing}" "$EXPECTED_MIGRATION_ENV_NAME"
	fi
	if [ -n "$url_like" ]; then
		fail_gate S4 'manifest contains a URL-like string; the native manifest must be secret-free'
	fi
	if [ -n "$secret_keys" ]; then
		fail_gate S4 'manifest contains secret-looking key(s): %s' "$secret_keys"
	fi

	local checksum
	checksum="$(sha256sum "$manifest" | awk '{print $1}')"
	info S4 'manifest: emdash %s, %s migrations, migration-set fingerprint %s' \
		"$emdash_version" "$migration_count" "$set_fp"
	info S4 'manifest sha256: %s' "$checksum"
	info S4 'manifest records migration connection variable NAME %s (secret-free: no URLs, no secret keys)' \
		"$env_name"
	pass S4 'native .emdash/migrations.json emitted by the exact build; identity, checksum, and secret safety verified'
}

# ---------------------------------------------------------------------------
# S5/S6/S7 — native migration sequence
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
		fail_gate S5 'native emdash migrate --status failed'
	fi
	if ! parse_status_json "$status_file"; then
		print_tail 'emdash migrate --status report' "$status_file"
		fail_gate S5 'the native status report is not the expected JSON shape'
	fi

	if [ "$STATUS_KIND" != 'postgres' ]; then
		fail_gate S5 'inspected migration target kind is %s, expected postgres' "${STATUS_KIND:-missing}"
	fi
	if ! printf '%s' "$STATUS_FINGERPRINT" | grep -qE '^[0-9a-f]{64}$'; then
		fail_gate S5 'inspected target fingerprint is missing or not a SHA-256 value'
	fi

	# The native postgres target label is host:port/database built from the
	# migration connection URL; it must agree with the PG* identity proven
	# in S1, so the inspected target is the intended database.
	local expected_label="${PGHOST}:${PGPORT}/${PGDATABASE}"
	if [ "$STATUS_LABEL" != "$expected_label" ]; then
		fail_gate S5 'inspected target label %s does not match the intended database identity %s' \
			"${STATUS_LABEL:-missing}" "$expected_label"
	fi

	info S5 'inspected target: %s %s' "$STATUS_KIND" "$STATUS_LABEL"
	info S5 'target fingerprint (sha256 of the non-secret target identity): %s' "$STATUS_FINGERPRINT"
	info S5 'migration state before apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"
	pass S5 'target inspected with emdash migrate --status (no mutation); fingerprint derived from the inspected target'
}

apply_migrations() {
	# Plain native apply with the required non-interactive safety guard.
	# The fingerprint comes from the inspected target above — never
	# hard-coded — and EmDash fails the apply (exit 4) on any mismatch.
	local apply_file="$TMP_DIR/apply.json"
	if ! run_emdash "$apply_file" migrate --expected-target-fingerprint "$STATUS_FINGERPRINT"; then
		print_tail 'emdash migrate apply diagnostics' "$apply_file.err"
		fail_gate S6 'native emdash migrate apply failed (fingerprint guard or migration error)'
	fi

	local after="$TMP_DIR/status-after.json"
	if ! run_emdash "$after" migrate --status --json; then
		print_tail 'emdash migrate --status diagnostics' "$after.err"
		fail_gate S6 'post-apply status inspection failed'
	fi
	if ! parse_status_json "$after"; then
		fail_gate S6 'the post-apply status report is not the expected JSON shape'
	fi
	if [ "$STATUS_PENDING" -ne 0 ] || [ "$STATUS_UNKNOWN" -ne 0 ]; then
		fail_gate S6 'after apply, migrations remain pending=%s unknown=%s' "$STATUS_PENDING" "$STATUS_UNKNOWN"
	fi
	info S6 'migration state after apply: applied=%s pending=%s unknown=%s' \
		"$STATUS_APPLIED" "$STATUS_PENDING" "$STATUS_UNKNOWN"
	pass S6 'native emdash migrate applied with --expected-target-fingerprint from the inspected target'
}

check_migrations() {
	local check_file="$TMP_DIR/check.out"
	local rc=0
	run_emdash "$check_file" migrate --check || rc=$?
	if [ "$rc" -ne 0 ]; then
		print_tail 'emdash migrate --check diagnostics' "$check_file.err"
		fail_gate S7 'emdash migrate --check failed (exit %s: pending or unknown migrations remain, or an error occurred)' "$rc"
	fi
	info S7 'emdash migrate --check: no pending and no unknown migrations (exit 0; applies nothing)'
	pass S7 'migration state verified with emdash migrate --check'
}

# ---------------------------------------------------------------------------
# S8 — integrated application startup
# ---------------------------------------------------------------------------

prove_integrated_startup() {
	require_app_port_free

	node ./dist/server/entry.mjs >"$TMP_DIR/app.out" 2>"$TMP_DIR/app.err" &
	APP_PID=$!

	local base
	base="$(probe_host_url "$HOST" "$PORT")"

	# Bounded wait for any HTTP answer from the application server.
	local waited=0 code
	code='000'
	while [ "$waited" -lt "$APP_READY_TIMEOUT_SECONDS" ]; do
		code="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' "$base/_emdash/admin/")" || true
		if [ "$code" != '000' ]; then
			break
		fi
		if ! kill -0 "$APP_PID" 2>/dev/null; then
			print_tail 'application output' "$TMP_DIR/app.out"
			print_tail 'application diagnostics' "$TMP_DIR/app.err"
			fail_gate S8 'the integrated application process exited during startup'
		fi
		sleep 1
		waited=$((waited + 1))
	done
	if [ "$code" = '000' ]; then
		fail_gate S8 'the integrated application did not answer within %ss' "$APP_READY_TIMEOUT_SECONDS"
	fi
	info S8 'integrated application answered after %ss (dist/server/entry.mjs on %s:%s)' \
		"$waited" "$HOST" "$PORT"

	# The admin path performs full EmDash runtime initialization, which
	# enforces the applied migration state through the configured runtime
	# "check" policy: an unmigrated or incompatible database surfaces as a
	# 503 site-unavailable response, so a redirect/200 result proves the
	# integrated Astro + EmDash + PostgreSQL 18.6 runtime started.
	local admin_status admin_final admin_final_line root_status
	admin_status="$(curl -s --max-time "$CURL_MAX_TIME_SECONDS" -o /dev/null -w '%{http_code}' "$base/_emdash/admin/")" || true
	admin_final_line="$(curl -s -L --max-time "$CURL_MAX_TIME_SECONDS" -o "$TMP_DIR/admin-body.html" \
		-w '%{http_code} %{url_effective}' "$base/_emdash/admin/")" || true
	admin_final="${admin_final_line%% *}"
	root_status="$(curl -s --max-time "$CURL_MAX_TIME_SECONDS" -o /dev/null -w '%{http_code}' "$base/")" || true

	info S8 'GET /_emdash/admin/ -> %s (final after redirects: %s)' \
		"${admin_status:-none}" "${admin_final_line:-none}"
	info S8 'GET / -> %s (any HTTP answer proves the public server; the minimum SSR verification page is T011 scope)' \
		"${root_status:-none}"

	case $admin_status in
	2* | 3*) ;;
	*)
		print_tail 'application output' "$TMP_DIR/app.out"
		print_tail 'application diagnostics' "$TMP_DIR/app.err"
		fail_gate S8 'native EmDash admin route did not return 2xx/3xx (status %s); integrated startup failed' \
			"${admin_status:-none}"
		;;
	esac
	if [ "$admin_final" != '200' ]; then
		print_tail 'application output' "$TMP_DIR/app.out"
		print_tail 'application diagnostics' "$TMP_DIR/app.err"
		fail_gate S8 'the resolved admin response is not HTTP 200 (status %s); integrated startup failed' \
			"${admin_final:-none}"
	fi
	pass S8 'integrated Astro + EmDash application started; admin runtime initialization succeeded against the migrated database (HTTP %s -> %s)' \
		"$admin_status" "$admin_final"

	# Stop exactly the process this run started, bounded.
	kill -TERM "$APP_PID" 2>/dev/null || true
	local term_waited=0
	while kill -0 "$APP_PID" 2>/dev/null && [ "$term_waited" -lt "$APP_TERM_WAIT_SECONDS" ]; do
		sleep 1
		term_waited=$((term_waited + 1))
	done
	if kill -0 "$APP_PID" 2>/dev/null; then
		fail_gate S8 'the integrated application did not stop within %ss after SIGTERM' "$APP_TERM_WAIT_SECONDS"
	fi
	wait "$APP_PID" 2>/dev/null || true
	APP_PID=''
	info S8 'integrated application stopped cleanly after SIGTERM (waited %ss)' "$term_waited"
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

	TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/t006-emdash-pg-compat.XXXXXX")"
	trap cleanup EXIT

	require_tools
	record_tool_versions
	validate_inputs
	require_app_port_free

	# S1 — inputs and identity agreement, before anything touches the database.
	migration_url_identity >"$TMP_DIR/url-identity.txt"
	check_identity_agreement "$TMP_DIR/url-identity.txt"

	# S2 — reproducible install with pinned versions.
	run_npm_ci

	# S3 — development database through T005 controls.
	start_development_database
	prove_database_server

	# S4 — exact application build and native manifest.
	build_application
	inspect_manifest .emdash/migrations.json

	# S5-S7 — native migration sequence.
	inspect_target
	apply_migrations
	check_migrations

	# S8 — integrated application startup.
	prove_integrated_startup

	printf 't006: ================================================================\n'
	printf 't006: T006 EmDash %s + PostgreSQL 18.6 compatibility gate: PASS\n' \
		"$PINNED_EMDASH_VERSION"
	printf 't006: tested tree: %s\n' "$(git rev-parse HEAD 2>/dev/null || echo 'unknown (git unavailable)')"
	printf 't006: ================================================================\n'
}

main "$@"
