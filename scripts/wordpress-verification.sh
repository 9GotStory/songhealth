#!/usr/bin/env bash
#
# Operations boundary for the disposable local WordPress verification runtime
# (Delivery 002 Gate 01.5 — Multica issue 9GOTSTORY-37; prerequisite for
# specs/002-headless-wordpress-foundation/tasks.md T006).
#
# One documented workflow per lifecycle step, all bounded, all failing closed
# with one actionable category line and a non-zero exit:
#
#   preflight  environment/tooling/configuration checks only, starts nothing
#   start      bring the runtime up, initialize it on first run, and PROVE
#              readiness: WordPress serving on the loopback origin and the
#              first-party songhealth-core plugin loaded and the only active
#              plugin. Idempotent: reconciles an already-running profile and
#              changes nothing on a routine re-run.
#   ready      readiness/loaded proof only (no state change)
#   stop       routine stop: halt containers, preserve both named volumes
#   restart    stop + start, preserving exactly the runtime-owned state
#   status     resource inventory: containers, health, volumes, ownership
#   reset      EXPLICIT disposable reset (--confirm-disposable-reset required):
#              remove this project's containers, volumes, and network only
#
# LOCAL VERIFICATION ONLY. This tool is not a deployment, Production parity, or
# migration mechanism, and it authorizes no importer, Trial Migration,
# Production Import, or cutover work (FR-002, FR-027, FR-028). It can only
# address resources it created: everything it names is derived from this
# checkout's Compose project prefix (songhealth-wp-<hash>) and carries the
# ownership labels of infra/compose.wordpress-verification.yaml, so it can
# never stop, reset, or inspect a Delivery 001 resource or anything else it
# does not own.
#
# Nondisclosure: credentials live only in the ignored
# .env.wordpress-verification.local file (see .env.wordpress-verification.example).
# This script never echoes a configuration value, and every child-process output
# it may print is passed through a redaction filter that masks secret values
# first. See docs/operations/wordpress-local-verification.md for the full guide.
#
# Exit codes: 0 success · 2 usage · 3 podman/preflight · 4 configuration ·
# 5 database readiness · 6 WordPress HTTP readiness · 7 WordPress/plugin
# readiness · 8 resource/ownership guard.

set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$REPO_ROOT/infra/compose.wordpress-verification.yaml"
CONTAINER_TOOLS_DIR="/songhealth-tools"
ENV_EXAMPLE="$REPO_ROOT/.env.wordpress-verification.example"
ENV_LOCAL="$REPO_ROOT/.env.wordpress-verification.local"
PLUGIN_ENTRY="$REPO_ROOT/wordpress/wp-content/plugins/songhealth-core/songhealth-core.php"

# Checkout-scoped identity, mirroring the Delivery 001 convention in
# scripts/foundation-operations.mjs: the same checkout always resolves to the
# same project (so repetition reconciles instead of duplicating resources),
# different checkouts never collide, and the project prefix is distinct from
# Delivery 001's songhealth-dev-* / songhealth-verify-*.
REPO_HASH=$(printf '%s' "$REPO_ROOT" | sha256sum | cut -c1-12)
PROJECT="songhealth-wp-${REPO_HASH}"
CHECKOUT_ID=$(printf '%s' "$REPO_ROOT" | sha256sum | cut -c1-16)

# Bounded waits (seconds). A first run initializes MySQL (slow); later runs
# are far quicker. Every wait below turns into a categorized failure.
DB_WAIT_TIMEOUT=300
HTTP_WAIT_TIMEOUT=180
READY_WAIT_TIMEOUT=120
HTTP_OK_WAIT_TIMEOUT=90
INIT_ATTEMPTS=3

EXIT_USAGE=2
EXIT_PODMAN=3
EXIT_CONFIG=4
EXIT_DATABASE=5
EXIT_WORDPRESS_HTTP=6
EXIT_WORDPRESS_READY=7
EXIT_RESOURCE=8

WORK_LOG=$(mktemp)
trap 'rm -f "$WORK_LOG"' EXIT

declare -a CONFIG_KEYS=(
    WORDPRESS_VERIFY_PORT
    WORDPRESS_VERIFY_SITE_URL
    WORDPRESS_VERIFY_SITE_TITLE
    WORDPRESS_VERIFY_ADMIN_USER
    WORDPRESS_VERIFY_ADMIN_PASSWORD
    WORDPRESS_VERIFY_ADMIN_EMAIL
    WORDPRESS_DB_NAME
    WORDPRESS_DB_USER
    WORDPRESS_DB_PASSWORD
    WORDPRESS_DB_ROOT_PASSWORD
)
declare -A CONFIG_VALUES=()
declare -a SECRET_VALUES=()

info() { printf '%s\n' "$*"; }

fail() {
    local code="$1" category="$2"
    shift 2
    printf '[%s] %s\n' "$category" "$*" >&2
    exit "$code"
}

usage_fail() {
    cat >&2 <<'USAGE'
Usage: scripts/wordpress-verification.sh <command> [options]

Commands:
  preflight   Check Podman, the Compose provider, configuration, and plugin
              source. Starts nothing.
  start       Start (or reconcile) the runtime, initialize on first run, and
              prove WordPress + songhealth-core readiness. Idempotent.
  ready       Readiness/loaded proof only.
  stop        Routine stop; both named volumes are preserved.
  restart     stop then start; runtime-owned state is preserved.
  status      Resource inventory with ownership labels. No secrets.
  reset       Explicit disposable reset. Requires --confirm-disposable-reset.
              Removes ONLY this checkout project's resources.

Options:
  --confirm-disposable-reset   Required confirmation for reset.

Environment: configuration is read from .env.wordpress-verification.local
(create it from .env.wordpress-verification.example). For stop/status/reset the
local configuration is optional; the manifest is rendered with inert
placeholders when it is absent so cleanup always stays available.
USAGE
    exit "$EXIT_USAGE"
}

# Redaction: mask every locally configured secret VALUE (its literal string)
# plus generic credential-looking tokens. Applied to anything printed from a
# child process; summary lines printed by this script contain no values.
redact() {
    local text secret
    if [ $# -ge 1 ]; then
        text="$1"
    else
        text=$(cat)
    fi
    for secret in "${SECRET_VALUES[@]}"; do
        if [ -n "$secret" ]; then
            text=${text//"$secret"/<redacted>}
        fi
    done
    printf '%s' "$text" | sed -E \
        -e 's/(PASSWORD|PASS|SECRET|TOKEN|CREDENTIAL)[A-Za-z0-9_]*[[:space:]]*[:=][[:space:]]*[^ ]+/\1=<redacted>/g'
}

print_child_failure() {
    local what="$1"
    printf '[child-output] %s (redacted, last lines):\n' "$what" >&2
    tail -n 20 "$WORK_LOG" | redact | sed 's/^/  /' >&2
}

# Parse an environment file into CONFIG_VALUES without evaluating anything.
read_env_file() {
    local file="$1" line key value
    CONFIG_VALUES=()
    SECRET_VALUES=()
    [ -f "$file" ] || return 1
    while IFS= read -r line || [ -n "$line" ]; do
        line=${line%$'\r'}
        case "$line" in ''|'#'*) continue ;; esac
        case "$line" in *=*) ;; *) continue ;; esac
        key=${line%%=*}
        value=${line#*=}
        CONFIG_VALUES["$key"]="$value"
        case "$key" in
            *PASSWORD*|*SECRET*|*TOKEN*) SECRET_VALUES+=("$value") ;;
        esac
    done <"$file"
    return 0
}

cfg() { printf '%s' "${CONFIG_VALUES[$1]-}"; }

require_config() {
    local key
    if [ ! -f "$ENV_LOCAL" ]; then
        fail "$EXIT_CONFIG" config \
            "local configuration is missing: $ENV_LOCAL — copy .env.wordpress-verification.example to .env.wordpress-verification.local, fill in local values, and rerun"
    fi
    for key in "${CONFIG_KEYS[@]}"; do
        if [ -z "$(cfg "$key")" ]; then
            fail "$EXIT_CONFIG" config \
                "required configuration key '$key' is missing or empty in .env.wordpress-verification.local (no value is shown here by design)"
        fi
    done

    local port site_url
    port=$(cfg WORDPRESS_VERIFY_PORT)
    case "$port" in
        ''|*[!0-9]*)
            fail "$EXIT_CONFIG" config "WORDPRESS_VERIFY_PORT must be a port number" ;;
    esac
    if [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
        fail "$EXIT_CONFIG" config "WORDPRESS_VERIFY_PORT must be between 1024 and 65535"
    fi

    site_url=$(cfg WORDPRESS_VERIFY_SITE_URL)
    case "$site_url" in
        "http://127.0.0.1:$port"|"http://localhost:$port") ;;
        *)
            fail "$EXIT_CONFIG" config \
                "WORDPRESS_VERIFY_SITE_URL must be exactly http://127.0.0.1:<WORDPRESS_VERIFY_PORT> (or http://localhost:<port>) — the runtime is loopback-only" ;;
    esac

    case "$(cfg WORDPRESS_VERIFY_ADMIN_USER)" in
        *[!A-Za-z0-9_.@-]*|'')
            fail "$EXIT_CONFIG" config "WORDPRESS_VERIFY_ADMIN_USER contains characters WordPress user logins reject" ;;
    esac
    case "$(cfg WORDPRESS_VERIFY_ADMIN_EMAIL)" in
        *@*) ;;
        *) fail "$EXIT_CONFIG" config "WORDPRESS_VERIFY_ADMIN_EMAIL must be an email address" ;;
    esac
}

# Render inputs for Compose. For up/ready flows the real local configuration is
# required; for stop/status/reset an absent file falls back to inert
# placeholder values so teardown and cleanup never depend on configuration.
compose_environment() {
    local mode="$1" key
    read_env_file "$ENV_LOCAL" || true
    if [ "$mode" = required ]; then
        require_config
    fi
    for key in "${CONFIG_KEYS[@]}"; do
        if [ -n "$(cfg "$key")" ]; then
            export "$key=$(cfg "$key")"
        elif [ "$key" = WORDPRESS_VERIFY_PORT ]; then
            # Valid-but-inert port so the manifest still renders for
            # stop/status/reset without local configuration (no port is
            # bound by those commands).
            export "$key=0"
        else
            export "$key=unused-placeholder"
        fi
    done
    export SONGHEALTH_WP_CHECKOUT_ID="$CHECKOUT_ID"
}

run_compose() {
    : >"$WORK_LOG"
    if podman compose \
        --file "$COMPOSE_FILE" \
        --project-name "$PROJECT" \
        "$@" >"$WORK_LOG" 2>&1; then
        return 0
    fi
    return 1
}

run_cli_tool() {
    local script="$1"
    : >"$WORK_LOG"
    if podman compose \
        --file "$COMPOSE_FILE" \
        --project-name "$PROJECT" \
        --profile tools \
        run --rm wordpress-cli "$CONTAINER_TOOLS_DIR/$script" \
        >"$WORK_LOG" 2>&1; then
        return 0
    fi
    return 1
}

container_name() {
    podman ps -a \
        --filter "label=com.docker.compose.project=$PROJECT" \
        --filter "label=com.docker.compose.service=$1" \
        --format '{{.Names}}' | head -n 1
}

project_resources() {
    # kind name — every resource carrying this project's Compose label.
    podman ps -aq --filter "label=com.docker.compose.project=$PROJECT" \
        --format 'container {{.Names}}'
    podman volume ls -q --filter "label=com.docker.compose.project=$PROJECT" \
        | sed 's/^/volume /'
    podman network ls -q --filter "label=com.docker.compose.project=$PROJECT" \
        | sed 's/^/network /'
}

check_podman() {
    command -v podman >/dev/null 2>&1 \
        || fail "$EXIT_PODMAN" podman "podman is not installed or not on PATH"
    podman version >/dev/null 2>&1 \
        || fail "$EXIT_PODMAN" podman "podman is not usable by this user"
    : >"$WORK_LOG"
    podman compose version >"$WORK_LOG" 2>&1 \
        || fail "$EXIT_PODMAN" podman \
            "the podman Compose provider is not installed (podman compose failed); install podman-compose or docker-compose"
    [ -f "$COMPOSE_FILE" ] \
        || fail "$EXIT_CONFIG" config "compose manifest not found: infra/compose.wordpress-verification.yaml"
    [ -f "$PLUGIN_ENTRY" ] \
        || fail "$EXIT_CONFIG" config \
            "first-party plugin source not found at wordpress/wp-content/plugins/songhealth-core/songhealth-core.php — run from the repository root of a complete checkout"
}

wait_for() {
    local desc="$1" timeout_s="$2" interval_s="$3"
    shift 3
    local deadline=$((SECONDS + timeout_s))
    while [ "$SECONDS" -lt "$deadline" ]; do
        if "$@" >/dev/null 2>&1; then
            return 0
        fi
        sleep "$interval_s"
    done
    info "timeout waiting for: $desc (bounded at ${timeout_s}s)" >&2
    return 1
}

db_is_healthy() {
    local name status
    name=$(container_name wordpress-db)
    [ -n "$name" ] || return 1
    status=$(podman inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null)
    [ "$status" = healthy ]
}

http_code() {
    curl -sS -o /dev/null -w '%{http_code}' --max-time 5 \
        "$(cfg WORDPRESS_VERIFY_SITE_URL)$1" 2>/dev/null || printf '000'
}

http_any_response() {
    [ "$(http_code /)" != 000 ]
}

http_ok() {
    [ "$(http_code "$1")" = 200 ]
}

# REST-root proof. A fresh clean installation ships without pretty permalinks,
# so /wp-json/ would serve front-page HTML with HTTP 200 — a status-only check
# there proves nothing about REST. The query-string route ?rest_route=/ is
# always routed by core, so requiring HTTP 200 AND an application/json
# content type is an honest REST-readiness predicate.
rest_root_ok() {
    local out
    out=$(curl -sS -o /dev/null -w '%{http_code} %{content_type}' --max-time 5 \
        "$(cfg WORDPRESS_VERIFY_SITE_URL)/?rest_route=/" 2>/dev/null)
    case "$out" in
        '200 application/json'*) return 0 ;;
        *) return 1 ;;
    esac
}

port_in_use() {
    (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

wordpress_container_running() {
    local name
    name=$(container_name wordpress)
    [ -n "$name" ] || return 1
    [ "$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null)" = running ]
}

check_port_available() {
    if wordpress_container_running; then
        return 0 # our own reconcile; compose up is idempotent
    fi
    if port_in_use "$(cfg WORDPRESS_VERIFY_PORT)"; then
        fail "$EXIT_CONFIG" config \
            "port $(cfg WORDPRESS_VERIFY_PORT) on 127.0.0.1 is already in use by something other than this runtime; choose another WORDPRESS_VERIFY_PORT"
    fi
}

proof_summary() {
    local ready_line="$1"
    info "---- verification summary ----"
    info "origin:            $(cfg WORDPRESS_VERIFY_SITE_URL) (loopback-only)"
    info "http /:            $(http_code /)"
    info "http REST root:    $(http_code '/?rest_route=/') $(rest_root_ok && printf 'application/json' || printf 'NOT-JSON')"
    info "loaded proof:      $ready_line"
    info "project:           $PROJECT (checkout-scoped)"
    info "database volume:   ${PROJECT}_wordpress-db-data (preserved by stop, removed only by reset)"
    info "core volume:       ${PROJECT}_wordpress-core"
    info "-----------------------------"
}

cmd_preflight() {
    check_podman
    compose_environment required
    check_port_available
    local img
    for img in \
        docker.io/library/wordpress@sha256:5a93c470ae8220fddf71f6ebe3bc94e615ddc2ae4d9810f795b830fb11c41a17 \
        docker.io/library/mysql@sha256:b3b90af2a6552ae30c266fdb7d5dd55f3afb72404bb78d37fe8a23eb857fd3fb \
        docker.io/library/wordpress@sha256:2b5e9d4d3e51909dca1aaa4732e9f5e5bf0377c2114dbd8ff39f060bff202586; do
        if podman image inspect "$img" >/dev/null 2>&1; then
            info "image present:     ${img:0:60}…"
        else
            info "image not local:   ${img:0:60}… (pulled automatically on first start)"
        fi
    done
    info "preflight: ok (configuration valid, plugin source present, nothing started)"
}

hint_name() {
    local name
    name=$(container_name "$1")
    printf '%s' "${name:-<container-not-found>}"
}

cmd_start() {
    check_podman
    compose_environment required
    check_port_available

    info "starting runtime (project $PROJECT)…"
    if ! run_compose up --detach --remove-orphans; then
        print_child_failure 'podman compose up'
        fail "$EXIT_PODMAN" podman \
            "failed to bring up the runtime; run 'podman compose --project-name $PROJECT ps -a' after fixing the cause"
    fi

    info "waiting for the MySQL-compatible database (bounded ${DB_WAIT_TIMEOUT}s)…"
    if ! wait_for 'database health' "$DB_WAIT_TIMEOUT" 3 db_is_healthy; then
        print_child_failure 'database container'
        fail "$EXIT_DATABASE" database \
            "the database did not become healthy in ${DB_WAIT_TIMEOUT}s; inspect logs with: podman logs $(hint_name wordpress-db)"
    fi

    info "waiting for WordPress HTTP on $(cfg WORDPRESS_VERIFY_SITE_URL) (bounded ${HTTP_WAIT_TIMEOUT}s)…"
    if ! wait_for 'WordPress HTTP' "$HTTP_WAIT_TIMEOUT" 3 http_any_response; then
        print_child_failure 'wordpress container'
        fail "$EXIT_WORDPRESS_HTTP" wordpress \
            "WordPress did not answer on the loopback origin; inspect logs with: podman logs $(hint_name wordpress)"
    fi

    info "initializing profile (first run installs core and activates songhealth-core)…"
    local attempt ready_line=""
    for attempt in $(seq 1 "$INIT_ATTEMPTS"); do
        if run_cli_tool container-init.sh; then
            break
        fi
        if [ "$attempt" -eq "$INIT_ATTEMPTS" ]; then
            print_child_failure 'profile initialization'
            fail "$EXIT_WORDPRESS_READY" plugin \
                "profile initialization failed after $INIT_ATTEMPTS attempts; see the redacted output above"
        fi
        sleep 5
    done

    info "proving readiness (WordPress + songhealth-core loaded)…"
    if ! wait_for 'plugin readiness proof' "$READY_WAIT_TIMEOUT" 5 prove_ready; then
        print_child_failure 'readiness proof'
        fail "$EXIT_WORDPRESS_READY" plugin \
            "WordPress or the songhealth-core plugin did not become ready in ${READY_WAIT_TIMEOUT}s"
    fi
    ready_line=$last_ready_line
    if ! wait_for 'HTTP 200 on / and a JSON REST root' "$HTTP_OK_WAIT_TIMEOUT" 3 http_ok_root_json; then
        fail "$EXIT_WORDPRESS_HTTP" wordpress \
            "the origin answered but the readiness HTTP proof failed (200 on / and application/json at /?rest_route=/); inspect the WordPress container logs"
    fi

    info "$(redact "$ready_line")"
    proof_summary "$ready_line"
    info "start: runtime ready (WordPress serving, songhealth-core loaded and the only active plugin)"
}

last_ready_line=""
prove_ready() {
    if run_cli_tool container-ready.sh; then
        last_ready_line=$(grep '^READY ' "$WORK_LOG" | tail -n 1)
        [ -n "$last_ready_line" ]
        return
    fi
    return 1
}

http_ok_root_json() {
    http_ok / && rest_root_ok
}

cmd_ready() {
    check_podman
    compose_environment required
    if ! wordpress_container_running; then
        fail "$EXIT_PODMAN" preflight \
            "the runtime is not running; run scripts/wordpress-verification.sh start first"
    fi
    info "proving readiness (bounded ${READY_WAIT_TIMEOUT}s)…"
    if ! wait_for 'plugin readiness proof' "$READY_WAIT_TIMEOUT" 5 prove_ready; then
        print_child_failure 'readiness proof'
        fail "$EXIT_WORDPRESS_READY" plugin \
            "WordPress or the songhealth-core plugin is not ready; the redacted output above names the failed check"
    fi
    if ! wait_for 'HTTP 200 on / and a JSON REST root' "$HTTP_OK_WAIT_TIMEOUT" 3 http_ok_root_json; then
        fail "$EXIT_WORDPRESS_HTTP" wordpress \
            "the readiness HTTP proof failed (200 on / and application/json at /?rest_route=/)"
    fi
    info "$(redact "$last_ready_line")"
    proof_summary "$last_ready_line"
    info "ready: WordPress serving, songhealth-core loaded and the only active plugin"
}

cmd_stop() {
    compose_environment optional
    info "stopping runtime (named volumes are preserved)…"
    if ! run_compose stop -t 60; then
        print_child_failure 'podman compose stop'
        fail "$EXIT_PODMAN" podman "failed to stop the runtime containers"
    fi
    info "stop: containers stopped; volumes ${PROJECT}_wordpress-db-data and ${PROJECT}_wordpress-core preserved (reset disposes them)"
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_status() {
    compose_environment optional
    local line name kind kindname label_ok value
    info "project: $PROJECT"
    info "resources:"
    if [ -z "$(project_resources)" ]; then
        info "  (none — the runtime was never started or was reset)"
    else
        local state hstat
        while read -r line; do
            kind=${line%% *}
            name=${line#* }
            case "$kind" in
                container)
                    state=$(podman inspect --format '{{.State.Status}}' "$name" 2>/dev/null || printf 'gone')
                    hstat=$(podman inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null || true)
                    case "$hstat" in
                        healthy|unhealthy|starting) kindname="$state (health $hstat)" ;;
                        *) kindname="$state" ;;
                    esac
                    ;;
                volume|network) kindname=present ;;
                *) kindname='?' ;;
            esac
            info "  $kind $name — $kindname"
        done <<<"$(project_resources)"
    fi
    info "ownership check:"
    label_ok=yes
    if [ -z "$(project_resources)" ]; then
        info "  (no resources to check)"
    else
        while read -r line; do
            kind=${line%% *}
            name=${line#* }
            case "$kind" in
                container) value=$(podman inspect --format '{{index .Config.Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
                volume) value=$(podman volume inspect --format '{{index .Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
                network) value=$(podman network inspect --format '{{index .Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
            esac
            if [ "${value:-}" != "wordpress-local-verification" ]; then
                info "  UNEXPECTED ownership on $kind $name — refusing to consider it part of this runtime"
                label_ok=no
            fi
        done <<<"$(project_resources)"
        if [ "$label_ok" = yes ]; then
            info "  every project resource carries operation-target=wordpress-local-verification"
        fi
    fi
    info "configuration: $([ -f "$ENV_LOCAL" ] && printf 'present (values never shown)' || printf 'absent (start requires it)')"
}

cmd_reset() {
    [ "${1-}" = "--confirm-disposable-reset" ] || usage_fail
    compose_environment optional

    info "explicit disposable reset of project $PROJECT"
    info "pre-check: enumerating this project's resources and verifying ownership…"
    local resources line kind name value
    local unexpected=0
    resources=$(project_resources)
    if [ -z "$resources" ]; then
        info "nothing to remove — the runtime is not running and no state exists"
        return 0
    fi
    while read -r line; do
        kind=${line%% *}
        name=${line#* }
        case "$kind" in
            container) value=$(podman inspect --format '{{index .Config.Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
            volume) value=$(podman volume inspect --format '{{index .Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
            network) value=$(podman network inspect --format '{{index .Labels "org.songhealth.foundation.operation-target"}}' "$name" 2>/dev/null) ;;
        esac
        info "  will remove: $kind $name"
        if [ "${value:-}" != "wordpress-local-verification" ]; then
            unexpected=1
        fi
    done <<<"$resources"
    if [ "$unexpected" -ne 0 ]; then
        fail "$EXIT_RESOURCE" resource \
            "a project-scoped resource lacks the wordpress-local-verification ownership label; reset aborted without removing anything — resolve the naming collision manually"
    fi

    if ! run_compose down --volumes --remove-orphans; then
        print_child_failure 'podman compose down'
        fail "$EXIT_PODMAN" podman "failed to tear down the project"
    fi

    if [ -n "$(project_resources)" ]; then
        fail "$EXIT_RESOURCE" resource \
            "resources remain after teardown; inspect them with: podman ps -a --filter label=com.docker.compose.project=$PROJECT"
    fi

    info "reset: all project containers, volumes, and network removed (disposable reset complete)"
    info "isolation note: Delivery 001 resources (label delivery=001-application-foundation) were not addressed by this command:"
    info "  $(podman ps -a --filter 'label=org.songhealth.foundation.delivery=001-application-foundation' --format '{{.Names}}' | wc -l) Delivery 001 containers present on this host (unchanged)"
}

main() {
    [ $# -ge 1 ] || usage_fail
    local command="$1"
    shift
    case "$command" in
        preflight) cmd_preflight "$@" ;;
        start) cmd_start "$@" ;;
        ready) cmd_ready "$@" ;;
        stop) cmd_stop "$@" ;;
        restart) cmd_restart "$@" ;;
        status) cmd_status "$@" ;;
        reset) cmd_reset "$@" ;;
        help|-h|--help) usage_fail ;;
        *) usage_fail ;;
    esac
}

main "$@"
