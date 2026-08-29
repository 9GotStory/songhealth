#!/bin/sh
# First-run initialization for the disposable Songhealth WordPress verification
# profile (Delivery 002 Gate 01.5). Executed INSIDE the one-shot wordpress-cli
# service container by scripts/wordpress-verification.sh against the same
# wordpress-core volume and the same live songhealth-core mount as the web
# service:
#
#   1. install clean WordPress Core (only when not already installed), using
#      the synthetic local administrator from the container environment;
#   2. activate the first-party songhealth-core plugin (the only plugin ever
#      activated in this profile);
#   3. verify the clean-profile invariant: exactly one active plugin.
#
# Nondisclosure: every value below is read from the container environment, so
# no credential appears in a command line, in this script, or in its output.
# The emitted summary lines contain no secret values.
#
# This script initializes local verification state only. It implements no
# Product behavior, adds no content, no user beyond the synthetic local
# administrator, and no setting outside core installation bookkeeping.

set -eu

fail() {
    echo "[container-init] $1" >&2
    exit 1
}

require_env() {
    value=$(eval "printf '%s' \"\$$1\"")
    if [ -z "$value" ]; then
        fail "required configuration $$1 is missing or empty"
    fi
}

require_env WORDPRESS_DB_NAME
require_env WORDPRESS_DB_USER
require_env WORDPRESS_DB_PASSWORD
require_env WORDPRESS_VERIFY_SITE_URL
require_env WORDPRESS_VERIFY_SITE_TITLE
require_env WORDPRESS_VERIFY_ADMIN_USER
require_env WORDPRESS_VERIFY_ADMIN_PASSWORD
require_env WORDPRESS_VERIFY_ADMIN_EMAIL

cd /var/www/html

# 1. Clean core installation, exactly once. A routine stop/start or restart
#    finds core installed and changes nothing. A database outage is reported
#    as its own category, never as an installer rejection.
install_status=0
install_probe=$(wp core is-installed 2>&1) || install_status=$?
if [ "$install_status" -eq 0 ]; then
    echo "wordpress: core already installed (existing profile state)"
else
    case "$install_probe" in
        *"establishing a database connection"*|*"select database"*)
            fail "database-unreachable; WordPress cannot reach its database — this runtime's start workflow waits for database health first, so rerun the start workflow" ;;
    esac
    wp core install \
        --url="$WORDPRESS_VERIFY_SITE_URL" \
        --title="$WORDPRESS_VERIFY_SITE_TITLE" \
        --admin_user="$WORDPRESS_VERIFY_ADMIN_USER" \
        --admin_password="$WORDPRESS_VERIFY_ADMIN_PASSWORD" \
        --admin_email="$WORDPRESS_VERIFY_ADMIN_EMAIL" \
        --skip-email \
        --quiet \
        || fail "WordPress core installation failed; the database was reachable but the installer rejected the request (check the site URL values in .env.wordpress-verification.local)"
    echo "wordpress: clean core installed"
fi

# 2. Activate only the first-party plugin, sourced live from this checkout.
if wp plugin is-active songhealth-core 2>/dev/null; then
    echo "songhealth-core: already active"
else
    wp plugin activate songhealth-core --quiet \
        || fail "songhealth-core activation failed; the plugin must be present at wp-content/plugins/songhealth-core in the repository checkout"
    echo "songhealth-core: activated"
fi

# 3. Clean-profile invariant: songhealth-core is the ONLY active plugin. Any
#    other active plugin means the profile is not the clean installation this
#    runtime is scoped to, so initialization fails closed instead of running a
#    dirty profile.
active=$(wp plugin list --status=active --field=name | paste -sd, -)
if [ "$active" != "songhealth-core" ]; then
    fail "unexpected active plugin set: [$active]; expected exactly [songhealth-core]"
fi
echo "active-plugins: songhealth-core"
