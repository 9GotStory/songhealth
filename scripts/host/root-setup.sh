#!/usr/bin/env bash
# Songhealth's guided root script (Feature 016, #456): every root step Songhealth itself needs on an
# Ubuntu Server 26.04 host, run by the Operator, never by Claude Code (spec #450, "The Operator, the
# Deployment account and Claude Code"; production-host-contract.md §1, §2). It explains each step
# and waits for the Operator's yes before it acts. It prints no secret.
#
#   sudo bash root-setup.sh --account <name> --authorized-key <public-key-file> \
#     --site-config <songhealth.caddy> --caddy-sites-dir <directory the host's Caddyfile imports>
#
# Steps, in order (each idempotent; a step already done says so and changes nothing):
#   1. the packages rootless Podman needs, without the ones it only recommends
#   2. the Deployment account, without sudo, with its subordinate UID and GID ranges
#   3. lingering for the account, so its units run with nobody logged in and start at boot
#   4. the account's SSH key (Claude Code's own, which the Operator can revoke)
#   5. Songhealth's secrets and environment files, created on the host; the recovery copy goes to
#      a root-only folder the Operator moves to their protected store and then deletes
#   6. Songhealth's site configuration placed where the host's Caddy imports it, and Caddy reloaded
#
# What it never does: install Node, an image, the units or any dependency (the account does those,
# production-foundation.md §4, §11), change a host safeguard (AppArmor), or touch another system.
set -euo pipefail

SITE_URL=https://songhealth.moph.go.th
DB_ADMIN=songhealth_admin # POSTGRES_USER: the bootstrap administrator, never the application
DB_NAME=songhealth
APP_ROLE=songhealth_app # PGUSER: the least-privilege application role
# Without recommends, so each package Podman needs and only recommends is named (contract §2):
# uidmap, passt (pasta) and catatonit for podman; aardvark-dns (the name server of a Podman network,
# without which the application cannot resolve the database's name) and nftables for netavark.
PACKAGES=(podman uidmap passt catatonit dbus-user-session aardvark-dns nftables)

account='' key_file='' site_config='' sites_dir=''
while (($#)); do
  case $1 in
    --account) account=$2; shift 2 ;;
    --authorized-key) key_file=$2; shift 2 ;;
    --site-config) site_config=$2; shift 2 ;;
    --caddy-sites-dir) sites_dir=$2; shift 2 ;;
    *) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$*"; }
fail() { echo "root-setup: $*" >&2; exit 1; }
confirm() {
  local answer
  read -r -p "$1 [y/N] " answer
  [[ $answer == y || $answer == Y ]] || fail "stopped before: $1"
}

[[ $(id -u) == 0 ]] || fail "run as root (sudo)"
[[ $account =~ ^[a-z][a-z0-9-]{1,30}$ ]] || fail "--account needs a lower-case account name"
[[ -f $key_file ]] || fail "--authorized-key needs the public key file"
[[ -f $site_config ]] || fail "--site-config needs Songhealth's deploy/caddy/songhealth.caddy"
[[ -d $sites_dir ]] || fail "--caddy-sites-dir needs the directory the host's Caddyfile imports"
# shellcheck source=/dev/null
. /etc/os-release
[[ ${ID:-} == ubuntu && ${VERSION_ID:-} == 26.04 ]] || fail "written for Ubuntu 26.04; this is ${PRETTY_NAME:-unknown}"

as_account() { # run a command as the account inside its user manager's environment
  local uid
  uid=$(id -u "$account")
  # from the account's home: Podman refuses to start in a directory the account cannot enter
  (cd "$(getent passwd "$account" | cut -d: -f6)" && runuser -u "$account" -- env \
    XDG_RUNTIME_DIR="/run/user/$uid" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" "$@")
}
SECRETS=(songhealth-db-password songhealth-migration-database-url songhealth-encryption-key)

say "1. Packages rootless Podman needs: ${PACKAGES[*]}"
echo "Installed without the packages Podman only recommends; those it needs are named (contract §2)."
confirm "Install them?"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "${PACKAGES[@]}" >/dev/null
podman --version
dpkg-query -W -f='${Package} ${Version}\n' "${PACKAGES[@]}"

say "2. The Deployment account '$account', without sudo"
if id "$account" >/dev/null 2>&1; then
  echo "exists"
else
  confirm "Create it?"
  useradd --create-home --shell /bin/bash --comment "Songhealth Deployment account" "$account"
fi
for group in sudo admin wheel; do
  id -nG "$account" | tr ' ' '\n' | grep -qx "$group" && fail "$account is in $group; it must have no sudo"
done
for f in /etc/subuid /etc/subgid; do
  # useradd allocates the ranges once uidmap is installed (login.defs SUB_UID_*); an account made
  # before that has none, and choosing a free range on a shared host is the Operator's call.
  grep "^$account:" "$f" || fail "$account has no range in $f; add one with usermod --add-subuids/--add-subgids"
done

say "3. Lingering for $account"
if [[ $(loginctl show-user "$account" --property=Linger --value 2>/dev/null) == yes ]]; then
  echo "already on"
else
  confirm "Enable lingering?"
  loginctl enable-linger "$account"
fi
for _ in $(seq 1 30); do [[ -S /run/user/$(id -u "$account")/bus ]] && break; sleep 1; done
[[ -S /run/user/$(id -u "$account")/bus ]] || fail "the user manager of $account did not start"
echo "Linger=$(loginctl show-user "$account" --property=Linger --value)"

say "4. The account's SSH key"
home=$(getent passwd "$account" | cut -d: -f6)
install -d -m 0700 -o "$account" -g "$account" "$home/.ssh"
if grep -qxF "$(cat "$key_file")" "$home/.ssh/authorized_keys" 2>/dev/null; then
  echo "already authorized"
else
  confirm "Authorize the key in $key_file for $account?"
  cat "$key_file" >>"$home/.ssh/authorized_keys"
fi
chown "$account:$account" "$home/.ssh/authorized_keys"
chmod 0600 "$home/.ssh/authorized_keys"
ssh-keygen -l -f "$key_file"

say "5. Songhealth's secrets and environment files"
config="$home/.config/containers/systemd"
present=0
for secret in "${SECRETS[@]}"; do as_account podman secret exists "$secret" && present=$((present + 1)); done
if ((present == ${#SECRETS[@]})); then
  echo "already created; not replaced (a new value would not match the database's role or data)"
elif ((present > 0)); then
  fail "only $present of ${#SECRETS[@]} secrets exist; a partial set is the Operator's to investigate (runtime-secret-recovery.md)"
else
  echo "Creates, without printing a value: the bootstrap administrator's password, the application"
  echo "role's password, the migration URL and EmDash's encryption key (runtime-secret-recovery.md §3)."
  confirm "Create them?"
  umask 077
  db_password=$(openssl rand -hex 32)
  app_password=$(openssl rand -hex 32)
  encryption_key="emdash_enc_v1_$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n')"
  migration_url="postgres://$APP_ROLE:$app_password@systemd-songhealth-db:5432/$DB_NAME"
  install -d -m 0700 -o "$account" -g "$account" "$home/.config" "$home/.config/containers" "$config"
  printf 'POSTGRES_USER=%s\nPOSTGRES_DB=%s\n' "$DB_ADMIN" "$DB_NAME" >"$config/songhealth-db.env"
  {
    echo "# PGPASSWORD is SECRET-BEARING: the application role's credential (production-foundation.md §4.3)."
    printf 'HOST=127.0.0.1\nPORT=4321\nPGHOST=systemd-songhealth-db\nPGPORT=5432\n'
    printf 'PGDATABASE=%s\nPGUSER=%s\nPGPASSWORD=%s\nEMDASH_SITE_URL=%s\n' \
      "$DB_NAME" "$APP_ROLE" "$app_password" "$SITE_URL"
  } >"$config/songhealth-app.env"
  chown "$account:$account" "$config/songhealth-db.env" "$config/songhealth-app.env"
  chmod 0600 "$config/songhealth-db.env" "$config/songhealth-app.env"
  printf '%s' "$db_password" | as_account podman secret create songhealth-db-password - >/dev/null
  printf '%s' "$migration_url" | as_account podman secret create songhealth-migration-database-url - >/dev/null
  printf '%s' "$encryption_key" | as_account podman secret create songhealth-encryption-key - >/dev/null
  recovery="/root/songhealth-recovery-copy/$(date -u +%Y%m%dT%H%M%SZ)"
  install -d -m 0700 "$recovery"
  printf '%s\n' "$app_password" >"$recovery/1-PGPASSWORD"
  printf '%s\n' "$migration_url" >"$recovery/2-songhealth-migration-database-url"
  printf '%s\n' "$encryption_key" >"$recovery/3-songhealth-encryption-key"
  printf '%s\n' "$db_password" >"$recovery/4-songhealth-db-password"
  unset db_password app_password encryption_key migration_url
  echo "Recovery copy: $recovery (root only). Move it to your protected store, then delete it here."
fi
as_account podman secret ls --format '{{.Name}}'

say "6. Songhealth's site configuration in the host's Caddy"
if cmp -s "$site_config" "$sites_dir/songhealth.caddy"; then
  echo "already in place"
else
  confirm "Install it as $sites_dir/songhealth.caddy and reload Caddy?"
  install -m 0644 "$site_config" "$sites_dir/songhealth.caddy"
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 ||
  fail "Caddy refuses the configuration; the running one stays (caddy validate --config /etc/caddy/Caddyfile)"
systemctl reload caddy
echo "Caddy reloaded"

say "Done. The account's own steps follow: production-foundation.md §11."
