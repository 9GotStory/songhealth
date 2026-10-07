#!/usr/bin/env bash
#
# Songhealth development PostgreSQL controls (Feature 001, task T005).
#
# Bounded start/stop/status lifecycle for the development PostgreSQL 18.6
# server using rootless Podman only. Node.js/npm/Astro/EmDash tooling stays
# native and is never containerized by this helper. This is development
# parity support, not a production stack (production uses Quadlet).
#
# Configuration comes from the native application inputs documented in
# .env.example. `start` requires PGHOST, PGPORT, PGDATABASE, PGUSER and
# PGPASSWORD in the environment; `stop` and `status` only inspect or stop
# the known container and need no secrets, so they must not be given any.
# Supply inputs from the environment or the ignored .env file, e.g.:
#
#   set -a; . ./.env; set +a; npm run dev-db:start
#
# The container publishes PostgreSQL only on the loopback boundary
# 127.0.0.1:${PGPORT}. Database files persist in the named volume below.
# `stop` never removes the container or the volume; this helper provides no
# reset, recreate, or delete behavior at all.
#
# Exit codes (stable contract for automation; only 0 means success/ready):
#   status   0 ready | 1 starting or unhealthy | 2 stopped | 3 absent
#   start    0 started and ready | 1 not ready within the bounded wait, or
#            the container failed during startup
#   stop     0 stopped (or already stopped/absent) | 1 failed to stop
#   all      4 missing or invalid required PG* input
#            5 environment error (podman missing, rootful session)
#            64 usage error
#
# Secret safety: this script never prints the value of any PG* input or any
# credential-bearing string; errors name the missing variable only.

set -euo pipefail

# Official PostgreSQL 18.6 OCI image, pinned by explicit version and by the
# immutable digest of the upstream multi-arch image index for tag 18.6
# (verified 2026-10-07 against docker.io registry metadata).
readonly IMAGE_REF='docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf'
readonly CONTAINER_NAME='songhealth-dev-db'
readonly VOLUME_NAME='songhealth-dev-db-data'
# Official PostgreSQL 18 images declare VOLUME /var/lib/postgresql with
# PGDATA=/var/lib/postgresql/18/docker, so the persistent named volume must
# mount the parent directory (mounting the pre-18 /var/lib/postgresql/data
# path would leave the real data directory unpersisted).
readonly PGDATA_MOUNT='/var/lib/postgresql'
readonly CONTAINER_PORT=5432
readonly READY_TIMEOUT_SECONDS=60
readonly POLL_INTERVAL_SECONDS=2
readonly STOP_TIMEOUT_SECONDS=10

readonly EXIT_NOT_READY=1
readonly EXIT_STOPPED=2
readonly EXIT_ABSENT=3
readonly EXIT_CONFIG=4
readonly EXIT_ENV=5
readonly EXIT_USAGE=64

usage() {
	cat <<'EOF'
Usage: scripts/dev-db.sh {start|stop|status}

Bounded lifecycle controls for the Songhealth development PostgreSQL 18.6
server (rootless Podman only; application tooling stays native).

  start    Create (if absent) and start the container, then wait a bounded
           time (60s) for PostgreSQL readiness. Requires the native inputs
           PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD in the
           environment. Idempotent: an already-ready container succeeds
           immediately; a stopped one is started without reinitialization.
  stop     Stop the container. The container and its persistent data volume
           are kept; nothing is deleted. Idempotent: stopping an already
           stopped or absent container succeeds.
  status   Report the state: ready, starting, unhealthy, stopped, or absent.
           Exits 0 only when PostgreSQL is ready.

Provide configuration from the environment or the ignored .env file (see
.env.example), e.g.:  set -a; . ./.env; set +a; npm run dev-db:start

Exit codes:
  status   0 ready | 1 starting or unhealthy | 2 stopped | 3 absent
  start    0 started and ready | 1 not ready within the timeout, or failed
  stop     0 stopped (or nothing to stop) | 1 failed to stop
  all      4 missing or invalid required PG* input
           5 environment error (podman missing or not rootless)
           64 usage error
EOF
}

die() {
	# die <exit-code> <message...>
	local code="$1"
	shift
	printf 'dev-db: %s\n' "$*" >&2
	exit "$code"
}

check_runtime() {
	if ! command -v podman >/dev/null 2>&1; then
		die "$EXIT_ENV" "podman is not available on PATH; install rootless Podman first"
	fi
	if [ "$(id -u)" -eq 0 ]; then
		die "$EXIT_ENV" "refusing to run as root: this helper requires rootless Podman"
	fi
	local rootless
	if ! rootless="$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)"; then
		die "$EXIT_ENV" "podman info failed; check the rootless Podman setup (run 'podman info' for details)"
	fi
	if [ "$rootless" != "true" ]; then
		die "$EXIT_ENV" "podman is operating rootful; this helper requires rootless Podman"
	fi
}

require_pg_config() {
	local missing=()
	local var
	for var in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD; do
		if [ -z "${!var:-}" ]; then
			missing+=("$var")
		fi
	done
	if [ "${#missing[@]}" -gt 0 ]; then
		printf 'dev-db: missing required input(s): %s\n' "${missing[*]}" >&2
		printf 'dev-db: provide the native PG* inputs in the environment (never committed); see .env.example, e.g. set -a; . ./.env; set +a\n' >&2
		exit "$EXIT_CONFIG"
	fi
	case $PGPORT in
	*[!0-9]*)
		die "$EXIT_CONFIG" "PGPORT must be a TCP port number; the current value is not numeric"
		;;
	esac
	if [ "$PGPORT" -lt 1 ] || [ "$PGPORT" -gt 65535 ]; then
		die "$EXIT_CONFIG" "PGPORT is outside the valid TCP port range 1-65535"
	fi
}

container_state() {
	podman container inspect --format '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true
}

container_health() {
	podman container inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true
}

container_exit_code() {
	podman container inspect --format '{{.State.ExitCode}}' "$CONTAINER_NAME" 2>/dev/null || true
}

published_port() {
	podman port "$CONTAINER_NAME" "$CONTAINER_PORT/tcp" 2>/dev/null || true
}

report_ready() {
	local endpoint
	endpoint="$(published_port)"
	printf 'dev-db: %s: ready (PostgreSQL accepting connections at %s; container %s, volume %s)\n' \
		"$CONTAINER_NAME" "${endpoint:-unknown published endpoint}" "$CONTAINER_NAME" "$VOLUME_NAME"
}

wait_until_ready() {
	# Bounded wait for a finite, clearly reported ready/not-ready outcome.
	# Loops only while the container is running; never claims success before
	# the container healthcheck reports healthy.
	local deadline=$((SECONDS + READY_TIMEOUT_SECONDS))
	local raw health
	printf 'dev-db: waiting up to %ss for PostgreSQL readiness (container %s)...\n' \
		"$READY_TIMEOUT_SECONDS" "$CONTAINER_NAME"
	while [ "$SECONDS" -lt "$deadline" ]; do
		raw="$(container_state)"
		if [ "$raw" != "running" ]; then
			local exit_code
			exit_code="$(container_exit_code)"
			die "$EXIT_NOT_READY" "container stopped during startup (state: ${raw:-absent}, exit code: ${exit_code:-unknown}); inspect with: podman logs ${CONTAINER_NAME}"
		fi
		health="$(container_health)"
		if [ "$health" = "healthy" ]; then
			report_ready
			return 0
		fi
		sleep "$POLL_INTERVAL_SECONDS"
	done
	health="$(container_health)"
	die "$EXIT_NOT_READY" "PostgreSQL did not become ready within ${READY_TIMEOUT_SECONDS}s (health: ${health:-unknown}); inspect with: podman logs ${CONTAINER_NAME} podman healthcheck run ${CONTAINER_NAME}"
}

cmd_start() {
	local raw health
	if podman container exists "$CONTAINER_NAME"; then
		raw="$(container_state)"
		health="$(container_health)"
		if [ "$raw" = "running" ]; then
			if [ "$health" = "healthy" ]; then
				printf 'dev-db: PostgreSQL is already ready (container %s)\n' "$CONTAINER_NAME"
				return 0
			fi
			printf 'dev-db: container %s is running but not ready yet (health: %s)\n' \
				"$CONTAINER_NAME" "${health:-not yet evaluated}"
			wait_until_ready
			return 0
		fi
		printf 'dev-db: starting existing container %s (data volume %s is preserved)...\n' \
			"$CONTAINER_NAME" "$VOLUME_NAME"
		if ! podman start "$CONTAINER_NAME"; then
			die "$EXIT_NOT_READY" "podman start failed for ${CONTAINER_NAME}; inspect with: podman logs ${CONTAINER_NAME}"
		fi
		wait_until_ready
		return 0
	fi

	# First creation: translate the native PG* application contract to the
	# official image's supported initialization inputs (POSTGRES_USER,
	# POSTGRES_DB, POSTGRES_PASSWORD). The values are exported and passed as
	# bare --env options so they travel through the environment, not the
	# command line. POSTGRES_PASSWORD is secret-bearing and is never printed.
	# The image initializes only when the mounted volume has no existing
	# database; an existing data directory is left untouched, so repeated
	# starts never reinitialize or erase persisted data.
	printf 'dev-db: creating container %s from %s\n' "$CONTAINER_NAME" "$IMAGE_REF"
	export POSTGRES_USER="$PGUSER"
	export POSTGRES_DB="$PGDATABASE"
	export POSTGRES_PASSWORD="$PGPASSWORD"
	if ! podman run --detach \
		--name "$CONTAINER_NAME" \
		--env POSTGRES_USER \
		--env POSTGRES_DB \
		--env POSTGRES_PASSWORD \
		--publish "127.0.0.1:${PGPORT}:${CONTAINER_PORT}" \
		--volume "${VOLUME_NAME}:${PGDATA_MOUNT}" \
		--health-cmd 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1' \
		--health-interval 5s \
		--health-timeout 3s \
		--health-retries 3 \
		--health-start-period 30s \
		"$IMAGE_REF" \
		>/dev/null
	then
		die "$EXIT_NOT_READY" "podman run failed for ${CONTAINER_NAME}; see the podman error above"
	fi
	wait_until_ready
}

cmd_stop() {
	if ! podman container exists "$CONTAINER_NAME"; then
		printf 'dev-db: %s: absent; nothing to stop\n' "$CONTAINER_NAME"
		return 0
	fi

	local raw
	raw="$(container_state)"
	if [ "$raw" != "running" ] && [ "$raw" != "paused" ]; then
		printf 'dev-db: %s: already stopped (state: %s); container and data volume %s are preserved\n' \
			"$CONTAINER_NAME" "$raw" "$VOLUME_NAME"
		return 0
	fi

	printf 'dev-db: stopping %s (timeout %ss)...\n' "$CONTAINER_NAME" "$STOP_TIMEOUT_SECONDS"
	if ! podman stop --time "$STOP_TIMEOUT_SECONDS" "$CONTAINER_NAME"; then
		die "$EXIT_NOT_READY" "podman stop failed for ${CONTAINER_NAME}; check with: podman ps -a --filter name=${CONTAINER_NAME}"
	fi
	printf 'dev-db: %s stopped; the container and data volume %s are preserved (nothing is deleted)\n' \
		"$CONTAINER_NAME" "$VOLUME_NAME"
}

cmd_status() {
	if ! podman container exists "$CONTAINER_NAME"; then
		printf 'dev-db: %s: absent (no development database container)\n' "$CONTAINER_NAME"
		return "$EXIT_ABSENT"
	fi

	local raw health
	raw="$(container_state)"
	health="$(container_health)"
	case "$raw" in
	running)
		case "$health" in
		healthy)
			report_ready
			return 0
			;;
		unhealthy)
			printf 'dev-db: %s: unhealthy; inspect with: podman logs %s podman healthcheck run %s\n' \
				"$CONTAINER_NAME" "$CONTAINER_NAME" "$CONTAINER_NAME"
			return "$EXIT_NOT_READY"
			;;
		*)
			printf 'dev-db: %s: starting (health: %s)\n' \
				"$CONTAINER_NAME" "${health:-not yet evaluated}"
			return "$EXIT_NOT_READY"
			;;
		esac
		;;
	paused)
		printf 'dev-db: %s: paused (not ready)\n' "$CONTAINER_NAME"
		return "$EXIT_NOT_READY"
		;;
	*)
		printf 'dev-db: %s: stopped (state: %s); data volume %s is preserved\n' \
			"$CONTAINER_NAME" "$raw" "$VOLUME_NAME"
		return "$EXIT_STOPPED"
		;;
	esac
}

main() {
	local action="${1:-}"
	if [ "$#" -ne 1 ]; then
		usage >&2
		die "$EXIT_USAGE" "expected exactly one action (start, stop, or status); got $# argument(s)"
	fi
	case "$action" in
	start)
		check_runtime
		require_pg_config
		cmd_start
		;;
	stop)
		check_runtime
		cmd_stop
		;;
	status)
		check_runtime
		cmd_status
		;;
	-h | --help | help)
		usage
		;;
	*)
		usage >&2
		die "$EXIT_USAGE" "unknown action: ${action} (expected start, stop, or status)"
		;;
	esac
}

main "$@"
