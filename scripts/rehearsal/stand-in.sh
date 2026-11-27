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

case ${1:-} in
  caddy) caddy_install ;;
  tailscale) tailscale_install ;;
  test-ca) test_ca ;;
  name-check) name_check "${2:-}" ;;
  caddyfile) write_caddyfile && reload && echo "Caddyfile written, Caddy reloaded" ;;
  site) site "${2:-}" ;;
  *) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 2 ;;
esac
