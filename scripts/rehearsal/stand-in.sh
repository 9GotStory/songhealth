#!/usr/bin/env bash
# The rehearsal machine's stand-in for the host's side of the contract
# (docs/operations/production-host-contract.md; spec #450 "The rehearsal"; #456). It is thrown
# away with the machine and is not the central infrastructure: the Production host's project
# builds its own. Run as root on the rehearsal machine by its administrator account (Product
# Owner, #456 comment 7164993353); Songhealth's own root steps are not here but in
# scripts/host/root-setup.sh, which the Operator runs.
#
#   sudo bash stand-in.sh caddy        Caddy from its official repository, the host's Caddyfile
#   sudo bash stand-in.sh tailscale    Tailscale from its official repository (the Product Owner
#                                      then adds the node with `tailscale up`)
#   sudo bash stand-in.sh test-ca      the Internal Test CA and its certificates, made here
#   sudo bash stand-in.sh name-check on|off
#                                      serve, or stop serving, the certificate issued for a name
#                                      outside the constraint, for the browsers' refusal check
#   sudo bash stand-in.sh caddyfile    write the host's Caddyfile again and reload Caddy (#458)
#   sudo bash stand-in.sh site <file>  place Songhealth's site file and reload Caddy, as the
#                                      Operator's scripts/host/root-setup.sh step 6 does: on the
#                                      rehearsal machine only, Claude Code installs it (Product
#                                      Owner, #458 comment 7209607314); it prints the file's SHA-256
#   sudo bash stand-in.sh alert        the contract's alert command (§4), songhealth-alert in
#                                      /usr/local/bin: it sends no email and drops each message
#                                      into /var/spool/songhealth-alerts instead (#460; #462 makes
#                                      it a mail sink)
#   sudo bash stand-in.sh backup       the central backup's stand-in (§3, #460): Restic from Ubuntu
#                                      into a throwaway repository on this machine, a root timer at
#                                      04:00 Asia/Bangkok, and its status file
#   sudo bash stand-in.sh backup-run   one run of that backup now (what its timer runs)
#   sudo bash stand-in.sh host-env     write the account's ~/.config/songhealth/host.env, naming the
#                                      alert command and the status file, as the host would (§3, §4)
#
# The Internal Test CA (spec #450, Product Owner, Windows client, 2026-11-25): short-lived,
# constrained to songhealth.moph.go.th, made on this machine, and its private key never leaves
# it. A second certificate it issues for a name outside the constraint is kept for the check
# that Windows, Chrome and Edge refuse it. The Ministry's key is never used here.
set -euo pipefail

SITE_NAME=songhealth.moph.go.th
OUTSIDE_NAME='name-check.invalid'
OTHER_SITE='other-system.invalid'
CA_DAYS=30
CA_DIR=/root/songhealth-test-ca
CERT_DIR=/etc/caddy/certs
SITES_DIR=/etc/caddy/sites
ACCOUNT=songhealth
SETS=/home/$ACCOUNT/recovery-sets
ALERT_COMMAND=/usr/local/bin/songhealth-alert
ALERT_SPOOL=/var/spool/songhealth-alerts
BACKUP_DIR=/root/songhealth-backup-stand-in
STATUS_DIR=/var/lib/songhealth-backup-stand-in
STATUS=$STATUS_DIR/status.json

[[ $(id -u) == 0 ]] || { echo "stand-in: run as root" >&2; exit 1; }

caddy_install() {
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gpg >/dev/null
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key |
    gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    >/etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
  install -d -m 0755 "$SITES_DIR"
  install -d -m 0750 -o root -g caddy "$CERT_DIR"
  write_caddyfile
  caddy version
}

write_caddyfile() {
  # The host's Caddyfile. Songhealth's site imports two snippets the host defines, so that no
  # address and no certificate path enters Songhealth's repository (contract §1):
  # songhealth_private (who may reach the site before the cutover: here the tailnet's address
  # range and the machine's own loopback) and songhealth_tls (the certificate files). The host
  # closes every name no system serves, and a second site stands in for another system on a shared
  # host, which that rule must leave answering (#458).
  cat >/etc/caddy/Caddyfile <<EOF
# Rehearsal stand-in (Songhealth #456, #458). Thrown away with the machine.
{
	auto_https disable_redirects
	skip_install_trust
}

(songhealth_private) {
	@songhealth_outside not remote_ip 100.64.0.0/10 fd7a:115c:a1e0::/48 127.0.0.0/8 ::1
	abort @songhealth_outside
}

(songhealth_tls) {
	tls $CERT_DIR/$SITE_NAME.crt $CERT_DIR/$SITE_NAME.key
}

# Another system's site on the shared host, under Caddy's own internal authority.
$OTHER_SITE {
	tls internal
	respond "Rehearsal stand-in: another system's site." 200
}

# The host's rule for a name no system serves: its requests are closed. A name with no certificate
# here fails at the TLS handshake; another name sent under a site's certificate reaches this block.
https:// {
	abort
}

import $SITES_DIR/*.caddy
import /etc/caddy/name-check*.caddy
EOF
}

reload() {
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
  systemctl reload caddy
}

site() { # site <file>: Songhealth's site file, validated in place before the reload
  local file=${1:-} target=$SITES_DIR/songhealth.caddy previous=''
  [[ -f $file ]] || { echo "stand-in: site <songhealth.caddy>" >&2; exit 2; }
  [[ -f $target ]] && previous=$(mktemp) && cp -p "$target" "$previous"
  install -m 0644 "$file" "$target"
  if ! caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null; then
    if [[ -n $previous ]]; then mv "$previous" "$target"; else rm -f "$target"; fi
    echo "stand-in: Caddy refuses the site file; the previous one is back and Caddy not reloaded" >&2
    exit 1
  fi
  [[ -n $previous ]] && rm -f "$previous"
  systemctl reload caddy
  sha256sum "$target"
}

tailscale_install() {
  curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/resolute.noarmor.gpg \
    -o /usr/share/keyrings/tailscale-archive-keyring.gpg
  curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/resolute.tailscale-keyring.list \
    -o /etc/apt/sources.list.d/tailscale.list
  apt-get update -qq && apt-get install -y -qq tailscale >/dev/null
  tailscale version | head -1
}

issue() { # issue <name> <out-base>: a leaf certificate for <name>, signed by the test CA
  local name=$1 out=$2
  openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout "$out.key" \
    -subj "/CN=$name" -out "$out.csr" 2>/dev/null
  openssl x509 -req -in "$out.csr" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" -CAcreateserial \
    -days "$CA_DAYS" -sha256 -out "$out.crt" -extfile <(printf '%s\n' \
      "basicConstraints=critical,CA:FALSE" "keyUsage=critical,digitalSignature" \
      "extendedKeyUsage=serverAuth" "subjectAltName=DNS:$name") 2>/dev/null
  rm -f "$out.csr"
}

test_ca() {
  [[ -f $CA_DIR/ca.key ]] && { echo "stand-in: $CA_DIR exists; remove it to make a new CA" >&2; exit 1; }
  install -d -m 0700 "$CA_DIR"
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days "$CA_DAYS" -sha256 \
    -keyout "$CA_DIR/ca.key" -out "$CA_DIR/ca.crt" \
    -subj "/CN=Songhealth Rehearsal Internal Test CA (not for production)" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "nameConstraints=critical,permitted;DNS:$SITE_NAME" 2>/dev/null
  issue "$SITE_NAME" "$CA_DIR/$SITE_NAME"
  issue "$OUTSIDE_NAME" "$CA_DIR/$OUTSIDE_NAME"
  install -m 0644 -o root -g caddy "$CA_DIR/$SITE_NAME.crt" "$CERT_DIR/$SITE_NAME.crt"
  install -m 0640 -o root -g caddy "$CA_DIR/$SITE_NAME.key" "$CERT_DIR/$SITE_NAME.key"
  # Only the authority's certificate is handed out (to the workstation's test browser and the
  # Windows computer); it carries no secret.
  install -m 0644 "$CA_DIR/ca.crt" /usr/local/share/songhealth-test-ca.crt
  openssl x509 -in "$CA_DIR/ca.crt" -noout -subject -startdate -enddate -fingerprint -sha256 \
    -ext nameConstraints
}

name_check() {
  local file=/etc/caddy/name-check.caddy
  case ${1:-} in
    on)
      install -m 0644 -o root -g caddy "$CA_DIR/$OUTSIDE_NAME.crt" "$CERT_DIR/$OUTSIDE_NAME.crt"
      install -m 0640 -o root -g caddy "$CA_DIR/$OUTSIDE_NAME.key" "$CERT_DIR/$OUTSIDE_NAME.key"
      cat >"$file" <<SITE
# Rehearsal stand-in (Songhealth #456): a certificate the test CA issued outside its constraint.
$OUTSIDE_NAME {
	tls $CERT_DIR/$OUTSIDE_NAME.crt $CERT_DIR/$OUTSIDE_NAME.key
	import songhealth_private
	respond "If you can read this, the name constraint was NOT enforced." 200
}
SITE
      ;;
    off) rm -f "$file" "$CERT_DIR/$OUTSIDE_NAME.crt" "$CERT_DIR/$OUTSIDE_NAME.key" ;;
    *) echo "stand-in: name-check on|off" >&2; exit 2 ;;
  esac
  reload
  echo "name-check $1"
}

alert_install() {
  install -d -m 1733 "$ALERT_SPOOL"
  cat >"$ALERT_COMMAND" <<'ALERT'
#!/usr/bin/env bash
# Rehearsal stand-in for the host contract's alert command (production-host-contract.md §4;
# Songhealth #460): `songhealth-alert <subject>`, the message's body on standard input, run
# without sudo. It sends no email: each message becomes one file in /var/spool/songhealth-alerts,
# which only root can list.
set -euo pipefail
[[ $# == 1 && -n $1 ]] || { echo "usage: songhealth-alert <subject>  (the body on standard input)" >&2; exit 2; }
umask 077
file=/var/spool/songhealth-alerts/$(date -u +%Y%m%dT%H%M%SZ)-$$.txt
{ printf 'Subject: %s\nFrom-account: %s\nAt: %s\n\n' "$1" "$(id -un)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"; cat; } >"$file"
ALERT
  chmod 0755 "$ALERT_COMMAND"
  echo "alert command $ALERT_COMMAND, messages in $ALERT_SPOOL"
}

host_env() {
  install -d -m 0700 -o "$ACCOUNT" -g "$ACCOUNT" "/home/$ACCOUNT/.config/songhealth"
  printf '%s\n' "# The host's names for Songhealth's side of the contract (rehearsal stand-in, #460)." \
    "SONGHEALTH_ALERT_COMMAND=$ALERT_COMMAND" "SONGHEALTH_BACKUP_STATUS=$STATUS" |
    install -m 0600 -o "$ACCOUNT" -g "$ACCOUNT" /dev/stdin "/home/$ACCOUNT/.config/songhealth/host.env"
  cat "/home/$ACCOUNT/.config/songhealth/host.env"
}

# The central backup's stand-in (contract §3): it only reads Songhealth's folder of finished sets,
# takes each complete set it does not hold yet into a Restic repository on this machine, keeps 30
# daily and 12 monthly by each set's own time, and writes its status where the account can read it.
# The repository's password is made here and never leaves /root; the repository is thrown away with
# the machine. No production data and no Google Drive are involved (#460).
backup_install() {
  apt-get install -y -qq restic >/dev/null
  install -d -m 0700 "$BACKUP_DIR"
  install -d -m 0755 "$STATUS_DIR"
  if [[ ! -f $BACKUP_DIR/password ]]; then
    (umask 077 && head -c 32 /dev/urandom | base64 >"$BACKUP_DIR/password")
    RESTIC_REPOSITORY=$BACKUP_DIR/repo RESTIC_PASSWORD_FILE=$BACKUP_DIR/password restic init --quiet
  fi
  install -m 0755 "$0" /usr/local/sbin/songhealth-stand-in.sh
  cat >/etc/systemd/system/songhealth-backup-stand-in.service <<UNIT
[Unit]
Description=Rehearsal stand-in for the central backup (Songhealth #460)

[Service]
Type=oneshot
ExecStart=/usr/bin/bash /usr/local/sbin/songhealth-stand-in.sh backup-run
UNIT
  cat >/etc/systemd/system/songhealth-backup-stand-in.timer <<UNIT
[Unit]
Description=Rehearsal stand-in for the central backup, at 04:00 Asia/Bangkok

[Timer]
OnCalendar=*-*-* 04:00:00 Asia/Bangkok

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now songhealth-backup-stand-in.timer
  restic version
  systemctl list-timers songhealth-backup-stand-in.timer --no-pager
}

backup_run() {
  export RESTIC_REPOSITORY=$BACKUP_DIR/repo RESTIC_PASSWORD_FILE=$BACKUP_DIR/password
  local result=ok dir name files held newest partial
  held=$(restic snapshots --json --tag songhealth-set | jq -r '.[].tags[]' | sed -n 's/^set=//p') ||
    result=failed
  shopt -s nullglob
  for dir in "$SETS"/*; do
    name=${dir##*/}
    if [[ ! $name =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z$ || -L $dir || ! -d $dir ]]; then
      echo "backup-run: skipped $name: not one of Songhealth's sets"
      continue
    fi
    files=$(find "$dir" -mindepth 1 -maxdepth 1 -type f -printf '%f\n' | sort | paste -sd' ')
    if [[ $files != 'database.dump manifest.json media.tar' || $(find "$dir" -mindepth 1 | wc -l) != 3 ]]; then
      echo "backup-run: skipped $name: not a complete set ($files)"
      continue
    fi
    grep -qx "$name" <<<"$held" && continue
    # The snapshot carries the set's own time, read in this machine's zone as Restic reads --time.
    if (cd "$SETS" && restic backup --quiet --host songhealth --tag songhealth-set --tag "set=$name" \
      --time "$(date -d "${name:0:13}:${name:13:2}:${name:15:2}Z" '+%Y-%m-%d %H:%M:%S')" "$name"); then
      echo "backup-run: took $name"
    else
      result=failed
    fi
  done
  restic forget --quiet --host songhealth --tag songhealth-set --group-by host \
    --keep-daily 30 --keep-monthly 12 --prune || result=failed
  newest=$(restic snapshots --json --tag songhealth-set |
    jq -r '[.[].tags[] | select(startswith("set=")) | ltrimstr("set=")] | sort | last // ""') ||
    result=failed
  partial=$STATUS.partial
  jq -n --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg result "$result" --arg newest "$newest" \
    '{time: $time, result: $result, newestSet: (if $newest == "" then null else $newest end)}' >"$partial"
  chmod 0644 "$partial"
  mv "$partial" "$STATUS"
  cat "$STATUS"
  [[ $result == ok ]]
}

case ${1:-} in
  caddy) caddy_install ;;
  tailscale) tailscale_install ;;
  test-ca) test_ca ;;
  name-check) name_check "${2:-}" ;;
  caddyfile) write_caddyfile && reload && echo "Caddyfile written, Caddy reloaded" ;;
  site) site "${2:-}" ;;
  alert) alert_install ;;
  backup) backup_install ;;
  backup-run) backup_run ;;
  host-env) host_env ;;
  *) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 2 ;;
esac
