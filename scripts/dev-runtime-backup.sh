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
podman exec songhealth-qdev-db pg_dump -U songhealth_qdev_admin -d songhealth_qdev -Fc -f "/tmp/qdev-${TS}.dump" \
  || die "pg_dump failed"
podman cp "songhealth-qdev-db:/tmp/qdev-${TS}.dump" "$OUT/qdev-db-${TS}.dump" || die "could not copy dump out"
podman exec songhealth-qdev-db rm -f "/tmp/qdev-${TS}.dump" || true
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)"
[[ -n "$MP" ]] || die "media volume not inspectable"
podman unshare tar -cf "$OUT/qdev-media-${TS}.tar" -C "$MP" . || die "media tar failed"
( cd "$SRC" 2>/dev/null; true )
echo "dev-runtime-backup: wrote $OUT/qdev-db-${TS}.dump and $OUT/qdev-media-${TS}.tar"
echo "dev-runtime-backup: record file sizes and sha256 in the operator log; recovery requires the EXTERNAL env files and podman secrets (see docs)"
sha256sum "$OUT/qdev-db-${TS}.dump" "$OUT/qdev-media-${TS}.tar" || true
