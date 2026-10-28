#!/usr/bin/env bash
# Songhealth development Quadlet runtime — BACKUP (Phase 2 executor).
# Produces a timestamped logical DB dump (pg_dump -Fc inside the db container)
# plus a tar of the media volume, into a user-specified output directory.
# Read-only against the live runtime; never touches other resources or secrets.
set -Euo pipefail
die() { echo "dev-runtime-backup: FAIL: $*" >&2; exit 1; }
OUT="${1:-}"
[[ -n "$OUT" && -d "$OUT" ]] || die "usage: dev-runtime-backup.sh <existing-output-directory>"
command -v podman >/dev/null || die "podman not found"
podman container exists songhealth-qdev-db || die "db container missing: nothing to back up"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SRC="$HOME/dev/songhealth-quadlet"
podman exec songhealth-qdev-db pg_dump -U songhealth_qdev_admin -d songhealth_qdev -Fc -f "/tmp/qdev-${TS}.dump" \
  || die "pg_dump failed"
podman cp "songhealth-qdev-db:/tmp/qdev-${TS}.dump" "$OUT/qdev-db-${TS}.dump" || die "could not copy dump out"
podman exec songhealth-qdev-db rm -f "/tmp/qdev-${TS}.dump" || die "in-container cleanup of the staged dump failed"
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)"
[[ -n "$MP" ]] || die "media volume not inspectable"
# POSIX ustar ONLY: restore admission accepts this format exclusively (fail-closed
# against PAX x/g and GNU L/K indirection headers; see dev-runtime-restore.sh).
podman unshare tar --format=ustar -cf "$OUT/qdev-media-${TS}.tar" -C "$MP" . || die "media tar failed"
echo "dev-runtime-backup: wrote $OUT/qdev-db-${TS}.dump and $OUT/qdev-media-${TS}.tar"
if [ -d "$SRC/.git" ]; then echo "dev-runtime-backup: source identity: $( cd "$SRC" && git rev-parse HEAD )"; else echo "dev-runtime-backup: WARNING: source checkout not found at $SRC (identity not recorded)" >&2; fi
echo "dev-runtime-backup: record file sizes and sha256 in the operator log; recovery requires the EXTERNAL env files and podman secrets (see docs)"
# F-02 (R3): the checksum manifest is PURE sha256sum records (any metadata line
# would break `sha256sum --check --strict`); provenance lives in a separate file.
DUMPNAME="qdev-db-${TS}.dump"; MEDIANAME="qdev-media-${TS}.tar"
# entries must be BARE basenames so restore's exact string binding matches
( cd "$OUT" && sha256sum "$DUMPNAME" "$MEDIANAME" ) > "$OUT/qdev-checksums-${TS}.sha256" \
  || die "checksum generation failed: the backup set is incomplete and must not be treated as successful"
SRC_SHA="$( [ -d "$SRC/.git" ] && cd "$SRC" && git rev-parse HEAD || echo UNKNOWN )"
printf 'dump-name %s\nmedia-name %s\nsource-sha %s\ncreated-utc %s\n' \
  "$DUMPNAME" "$MEDIANAME" "$SRC_SHA" "$TS" > "$OUT/qdev-meta-${TS}.txt" \
  || die "could not write backup metadata: the backup set is incomplete and must not be treated as successful"
# restore admission requires source-sha to be a real 40-hex identity; UNKNOWN fails there.
echo "dev-runtime-backup: SUCCESS - backup set is FOUR files ($DUMPNAME, $MEDIANAME, qdev-checksums-${TS}.sha256, qdev-meta-${TS}.txt)"
