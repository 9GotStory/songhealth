#!/bin/sh
# Songhealth development runtime — application container entrypoint (Feature 002 T036).
# Runs INSIDE songhealth-qdev-app (deploy/dev-quadlet/songhealth-dev-app.container):
#   dev            start the Astro + EmDash dev server (the unit's command)
#   migrate-check  the native, non-mutating `emdash migrate --check` (used by verify)
# It refuses with exit 78, which the unit does not restart, when dependencies are missing,
# the checkout is not the promoted commit, or the persistent media store is absent. The
# three podman secret files are exported into this process only; values are never printed.
set -eu
refuse() { echo "songhealth-qdev-app: $* - refusing" >&2; exit 78; }

cd /src
if [ ! -f node_modules/astro/bin/astro.mjs ] || [ ! -f node_modules/emdash/dist/cli/index.mjs ]; then
  refuse "pinned dependencies are not installed (run scripts/dev-runtime-install.sh)"
fi
# A detached checkout's .git/HEAD holds its commit; it must equal the commit the install or
# update script promoted (this needs no git binary in the image).
head='' want=''
IFS= read -r head < .git/HEAD || :
IFS= read -r want < .songhealth-qdev-source-identity || :
if [ -z "$want" ] || [ "$head" != "$want" ]; then
  refuse "/src is not at the promoted commit (promote with scripts/dev-runtime-update.sh)"
fi
grep -q ' /src/media ' /proc/mounts || refuse "media volume songhealth-qdev-media is not mounted at /src/media"
[ -f media/.songhealth-qdev-media-store ] \
  || refuse "media store marker missing (the store was replaced or never provisioned)"

load() { # load VAR FILE — the whole file must be one non-empty line without a newline
  value=''
  IFS= read -r value < "$2" || :
  if [ -z "$value" ] || [ "$(wc -c < "$2")" -ne "${#value}" ]; then
    refuse "secret $2 is missing or malformed"
  fi
  export "$1=$value"
}
load PGPASSWORD /run/secrets/songhealth-qdev-app-password
load EMDASH_MIGRATION_DATABASE_URL /run/secrets/songhealth-qdev-migration-database-url
load EMDASH_ENCRYPTION_KEY /run/secrets/songhealth-qdev-encryption-key
unset value

case "${1:-dev}" in
  dev) exec node node_modules/astro/bin/astro.mjs dev ;;
  migrate-check) exec node node_modules/emdash/dist/cli/index.mjs migrate --from-config --config astro.config.mjs --check ;;
  *) refuse "unknown mode: $1" ;;
esac
