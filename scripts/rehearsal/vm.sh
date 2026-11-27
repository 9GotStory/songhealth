#!/usr/bin/env bash
# The rehearsal machine (Feature 016, #456): an Ubuntu Server 26.04 cloud image under QEMU/KVM on
# the workstation, run as the workstation's own user. No libvirt daemon and no root on the
# workstation; QEMU's user-mode network, so the machine is not on the LAN and answers the
# workstation only through the two loopback forwards below, and everyone else only through its
# own Tailscale node (spec #450 "The rehearsal"; Product Owner, #456 comment 7164993353).
# Everything it has lives in one folder, its two SSH keys in another, and `remove` takes both away
# whole. The development runtime is never touched.
#
#   scripts/rehearsal/vm.sh create    download and check the image, make the disk and the seed
#   scripts/rehearsal/vm.sh start     boot it as the user unit songhealth-rehearsal-vm, then wait
#                                     until the Deployment account's units have started (#461)
#   scripts/rehearsal/vm.sh stop      shut it down (ACPI), waiting up to two minutes
#   scripts/rehearsal/vm.sh status    the unit's state and the forwards
#   scripts/rehearsal/vm.sh ssh [cmd] the administrator account, with Claude Code's key
#   scripts/rehearsal/vm.sh account [cmd]  the Deployment account, with its own key (made here; the
#                                     Operator authorizes it through scripts/host/root-setup.sh)
#   scripts/rehearsal/vm.sh tunnel [port]  forward a workstation loopback port (default 14321) to
#                                     the application's loopback publication on the machine, until
#                                     stopped: the demo dataset's way in (#458)
#   scripts/rehearsal/vm.sh stack-check [--stopped] [option...]
#                                     scripts/stack-check.ts against the machine: --inside its
#                                     tailnet address (read here, never printed), --outside the
#                                     https forward, --ca the Internal Test CA
#   scripts/rehearsal/vm.sh remove    stop it and delete its folder and keys (asks first)
#
# Size: 4 vCPU and 6 GB (Product Owner, #456 comment 7164993353); REHEARSAL_CPUS and
# REHEARSAL_MEMORY_MB change it for a later measurement (#464). The workstation runs
# `npm run test:node`, knip and jscpd while the machine is stopped: together with it up they hung
# the workstation until it restarted (#461).
set -euo pipefail

DIR=${REHEARSAL_DIR:-$HOME/.local/share/songhealth/rehearsal-vm}
KEY_DIR=${REHEARSAL_KEY_DIR:-$HOME/.local/state/songhealth-rehearsal}
KEY=$KEY_DIR/admin-key
DEPLOY_KEY=$KEY_DIR/deploy-key
ACCOUNT=songhealth
UNIT=songhealth-rehearsal-vm
CPUS=${REHEARSAL_CPUS:-4}
MEMORY_MB=${REHEARSAL_MEMORY_MB:-6144}
DISK_SIZE=40G
SSH_PORT=2222   # workstation loopback -> the machine's 22
HTTPS_PORT=8443 # workstation loopback -> the machine's 443: a source outside the allowed network
ADMIN=rehearsal

# The official cloud image: Ubuntu's own build serial, its checksum list and the list's signature by
# the UEC Image Automatic Signing Key (fingerprint below, keyserver.ubuntu.com).
SERIAL=release-20261108
IMAGE_BASE=https://cloud-images.ubuntu.com/releases/resolute/$SERIAL
IMAGE=ubuntu-26.04-server-cloudimg-amd64.img
SIGNING_KEY=D2EB44626FDDC30B513D5BB71A5D6C4C7DB87C81

die() { echo "rehearsal-vm: $*" >&2; exit 1; }

# When ssh cannot connect (status 255), says whether the machine's unit is down and why: the host's
# OOM killer can stop it silently, and ssh alone shows only "Connection refused" (#457 retro).
explain_down() {
  local state result
  state=$(systemctl --user show -p ActiveState --value "$UNIT" 2>/dev/null || true)
  [[ $state == active ]] && return 0
  result=$(systemctl --user show -p Result --value "$UNIT" 2>/dev/null || true)
  echo "rehearsal-vm: $UNIT is ${state:-unknown} (result: ${result:-unknown}); start it again with scripts/rehearsal/vm.sh start" >&2
}

ssh_admin() {
  local tty=() status=0
  [[ -t 0 && -t 1 ]] && tty=(-t) # a person at a terminal answers the guided script's questions
  ssh "${tty[@]}" -i "$KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="$DIR/known_hosts" -o ConnectTimeout=10 "$ADMIN@127.0.0.1" "$@" ||
    status=$?
  ((status == 255)) && explain_down
  return "$status"
}

tunnel() { # the application's 127.0.0.1:4321 on the machine, at the workstation's 127.0.0.1:<port>
  local port=${1:-14321}
  ssh -N -i "$KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o ExitOnForwardFailure=yes \
    -o UserKnownHostsFile="$DIR/known_hosts" -o ConnectTimeout=10 \
    -L "127.0.0.1:$port:127.0.0.1:4321" "$ADMIN@127.0.0.1"
}

# The deployed-stack check (production-foundation.md §10) from the workstation: the address a device
# on the private network uses is the machine's tailnet one, and the source outside it is the https
# forward above (#458, #460 retro).
stack_check() {
  local inside
  inside=$(ssh_admin tailscale ip -4 2>/dev/null | head -1) || true
  [[ $inside =~ ^[0-9]+([.][0-9]+){3}$ ]] || die "no tailnet address from the machine (is it up and on the tailnet?)"
  node "$(dirname "$0")/../stack-check.ts" --inside "$inside" --outside "127.0.0.1:$HTTPS_PORT" \
    --ca "$KEY_DIR/test-ca.crt" "$@"
}

ssh_account() {
  local status=0
  ssh -i "$DEPLOY_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="$DIR/known_hosts" -o ConnectTimeout=10 "$ACCOUNT@127.0.0.1" "$@" ||
    status=$?
  ((status == 255)) && explain_down
  return "$status"
}

verify_image() {
  local gnupg
  gnupg=$(mktemp -d)
  # shellcheck disable=SC2064 # expand now: the folder is this call's
  trap "rm -rf '$gnupg'" RETURN
  GNUPGHOME=$gnupg gpg --quiet --keyserver hkps://keyserver.ubuntu.com --recv-keys "$SIGNING_KEY"
  GNUPGHOME=$gnupg gpg --quiet --verify "$DIR/SHA256SUMS.gpg" "$DIR/SHA256SUMS" ||
    die "SHA256SUMS is not signed by $SIGNING_KEY"
  (cd "$DIR" && grep " \*$IMAGE\$" SHA256SUMS | sha256sum -c -) || die "$IMAGE does not match SHA256SUMS"
}

create() {
  [[ -e $DIR/disk.qcow2 ]] && die "$DIR/disk.qcow2 exists; remove the machine first"
  mkdir -p "$DIR" "$KEY_DIR"
  chmod 700 "$KEY_DIR"
  [[ -f $KEY ]] || ssh-keygen -q -t ed25519 -N '' -C "claude-code rehearsal admin" -f "$KEY"
  [[ -f $DEPLOY_KEY ]] ||
    ssh-keygen -q -t ed25519 -N '' -C "claude-code rehearsal deployment account" -f "$DEPLOY_KEY"
  for f in SHA256SUMS SHA256SUMS.gpg "$IMAGE"; do
    [[ -f $DIR/$f ]] || curl -fsS --retry 3 -o "$DIR/$f" "$IMAGE_BASE/$f"
  done
  verify_image
  qemu-img create -q -f qcow2 -F qcow2 -b "$DIR/$IMAGE" "$DIR/disk.qcow2" "$DISK_SIZE"
  cat >"$DIR/meta-data" <<EOF
instance-id: songhealth-rehearsal
local-hostname: songhealth-rehearsal
EOF
  cat >"$DIR/user-data" <<EOF
#cloud-config
users:
  - name: $ADMIN
    gecos: Rehearsal administrator (Claude Code, stand-in only)
    groups: [sudo, adm, systemd-journal]
    shell: /bin/bash
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    lock_passwd: true
    ssh_authorized_keys:
      - $(cat "$KEY.pub")
ssh_pwauth: false
timezone: Asia/Bangkok
package_update: false
package_upgrade: false
EOF
  genisoimage -quiet -output "$DIR/seed.iso" -volid cidata -joliet -rock "$DIR/user-data" "$DIR/meta-data"
  {
    echo "serial: $SERIAL"
    echo "image: $IMAGE"
    echo "sha256: $(sha256sum "$DIR/$IMAGE" | cut -d' ' -f1)"
    echo "signature: SHA256SUMS signed by $SIGNING_KEY"
    echo "created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } >"$DIR/image-record.txt"
  cat "$DIR/image-record.txt"
}

start() {
  [[ -f $DIR/disk.qcow2 ]] || die "no machine at $DIR; run create first"
  systemctl --user is-active --quiet "$UNIT" && die "$UNIT is already running"
  systemctl --user reset-failed "$UNIT" 2>/dev/null || true
  systemd-run --user --unit="$UNIT" --description="Songhealth rehearsal machine (#456)" \
    qemu-system-x86_64 -name songhealth-rehearsal -machine q35,accel=kvm -cpu host \
    -smp "$CPUS" -m "$MEMORY_MB" \
    -drive "file=$DIR/disk.qcow2,if=virtio,format=qcow2" \
    -drive "file=$DIR/seed.iso,if=virtio,format=raw,readonly=on" \
    -netdev "user,id=net0,hostfwd=tcp:127.0.0.1:$SSH_PORT-:22,hostfwd=tcp:127.0.0.1:$HTTPS_PORT-:443" \
    -device virtio-net-pci,netdev=net0 \
    -display none -serial "file:$DIR/console.log" \
    -qmp "unix:$DIR/qmp.sock,server=on,wait=off"
  echo "rehearsal-vm: waiting for SSH on 127.0.0.1:$SSH_PORT"
  for _ in $(seq 1 60); do
    ssh_admin -o BatchMode=yes true 2>/dev/null && { echo "rehearsal-vm: up"; settle; return; }
    sleep 5
  done
  die "no SSH after five minutes; see $DIR/console.log"
}

# The account's units start with its user manager at boot, the application's start job ending once
# it is healthy or has failed: a check run before that meets an application still activating (#461,
# twice). This waits, reading only, until the manager's start is over, and says how it ended.
settle() {
  local state units
  state=$(ssh_account 'timeout 300 systemctl --user is-system-running --wait' 2>/dev/null) || true
  units=$(ssh_account 'systemctl --user is-active songhealth-db.service songhealth-app.service' \
    2>/dev/null | paste -sd ' ') || true
  echo "rehearsal-vm: the account's start: ${state:-no answer}; database and application: ${units:-no answer}"
  echo "rehearsal-vm: it holds $MEMORY_MB MB of the workstation's memory; run npm run test:node, knip and jscpd after vm.sh stop"
}

stop() {
  systemctl --user is-active --quiet "$UNIT" || { echo "rehearsal-vm: not running"; return; }
  printf '%s\n' '{"execute":"qmp_capabilities"}' '{"execute":"system_powerdown"}' |
    python3 -c 'import socket,sys
s=socket.socket(socket.AF_UNIX); s.connect(sys.argv[1]); s.recv(4096)
for line in sys.stdin: s.sendall(line.encode()); s.recv(4096)' "$DIR/qmp.sock"
  for _ in $(seq 1 24); do
    systemctl --user is-active --quiet "$UNIT" || { echo "rehearsal-vm: stopped"; return; }
    sleep 5
  done
  die "still running after two minutes"
}

status() {
  systemctl --user status "$UNIT" --no-pager --lines=0 || true
  echo "forwards: ssh 127.0.0.1:$SSH_PORT, https 127.0.0.1:$HTTPS_PORT; folder $DIR"
}

remove() {
  [[ -d $DIR ]] || { echo "rehearsal-vm: nothing at $DIR"; return; }
  read -r -p "Delete the rehearsal machine and everything in $DIR? Type 'remove': " answer
  [[ $answer == remove ]] || die "not removed"
  systemctl --user stop "$UNIT" 2>/dev/null || true
  systemctl --user reset-failed "$UNIT" 2>/dev/null || true
  rm -rf "$DIR" "$KEY_DIR"
  echo "rehearsal-vm: removed $DIR and its keys in $KEY_DIR"
}

case ${1:-} in
  create) create ;;
  start) start ;;
  stop) stop ;;
  status) status ;;
  ssh) shift; ssh_admin "$@" ;;
  account) shift; ssh_account "$@" ;;
  tunnel) shift; tunnel "$@" ;;
  stack-check) shift; stack_check "$@" ;;
  remove) remove ;;
  *) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 2 ;;
esac
