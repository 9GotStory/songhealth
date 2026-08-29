#!/bin/sh
# Readiness and loaded proof for the disposable Songhealth WordPress
# verification profile (Delivery 002 Gate 01.5). Executed INSIDE the one-shot
# wordpress-cli service container by scripts/wordpress-verification.sh.
#
# Proves, against the same wordpress-core volume and the same live
# songhealth-core mount the web service serves from:
#   - clean WordPress Core is installed and bootable;
#   - the first-party songhealth-core plugin is the only active plugin;
#   - the plugin entry point actually LOADED in a full WordPress boot (its
#     version constant is defined and readable), which is the strongest
#     loaded-proof available at this gate: T005 deliberately adds no public
#     behavior for HTTP to observe.
#
# Emits exactly one READY summary line (no secrets) on success and exits 0.
# Every failure path exits non-zero with one actionable category message.

set -eu

fail() {
    echo "[container-ready] $1" >&2
    exit 1
}

cd /var/www/html

# Distinguish a database outage from a genuinely uninstalled profile so the
# operator gets the right category (the internal hostname in wp-cli's raw text
# is a fixed manifest value, never a credential).
install_out=$(wp core is-installed 2>&1) || {
    case "$install_out" in
        *"establishing a database connection"*|*"select database"*)
            fail "database-unreachable; WordPress cannot reach its database — check the wordpress-db container state and, if it is running, the credentials in .env.wordpress-verification.local" ;;
        *)
            fail "wordpress-not-installed; run the start workflow first (the database was reachable but WordPress Core is not installed)" ;;
    esac
}

wp plugin is-active songhealth-core 2>/dev/null \
    || fail "songhealth-core-not-active; the plugin is present but not activated — rerun the start workflow"

# Loaded proof: wp eval boots full WordPress (plugins loaded); the T005 entry
# point defines SONGHEALTH_CORE_VERSION when it actually loads.
plugin_version=$(wp eval 'echo SONGHEALTH_CORE_VERSION;' 2>/dev/null)
[ -n "$plugin_version" ] \
    || fail "songhealth-core-not-loaded; the plugin is active but its entry point did not load — check the plugin source in the checkout"

active=$(wp plugin list --status=active --field=name | paste -sd, -)
[ "$active" = "songhealth-core" ] \
    || fail "unexpected active plugin set: [$active]; expected exactly [songhealth-core]"

core_version=$(wp core version)

echo "READY wordpress=$core_version songhealth-core=$plugin_version active-plugins=$active"
