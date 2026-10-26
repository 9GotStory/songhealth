#!/usr/bin/env bash
# Songhealth development Quadlet runtime — RESTORE (Phase 2 executor, DESTRUCTIVE
# to the qdev database/media ONLY). Guardrails: refuses by default; requires
# --confirm plus typed confirmations for each replacement; only ever touches the
# songhealth-qdev-* resources; never resets, prunes or recreates any other
# container/volume/network; refuses to restore onto a running service.
# F-02/F-06 (R3): archive admission = pure sha256 manifest + separate provenance
# metadata file + exact positional binding to the supplied dump/media arguments
# (independent of the caller working directory) + strict tar member policy,
# ALL before any destructive step. See verify_archives() for the testable unit.
set -Euo pipefail
die() { echo "dev-runtime-restore: FAIL: $*" >&2; exit 1; }
usage() { die "usage: dev-runtime-restore.sh --confirm <dump> <media-tar> <checksums-file> <meta-file>"; }
confirm() { local r; read -r -p "dev-runtime-restore: $1 [type yes]: " r; [[ "$r" == "yes" ]] || die "not confirmed; nothing changed"; }

verify_v_vector() { # F-03 (R6): the ownership/privilege vector must be EXACTLY
  # 'OK|OK|OK|OK|OK' — every character. Empty, truncated, extra, malformed,
  # whitespace-padded or BAD outputs are all rejected; no normalization is
  # applied to the output under test (diagnostic is echoed verbatim).
  [ "$1" = "OK|OK|OK|OK|OK" ] \
    || die "post-restore verification failed: ownership/privilege vector is not exactly OK|OK|OK|OK|OK (observed: '${1:-<empty>}')"
}
verify_v2_token() { # F-03 (R6): the schema/search-path status must be EXACTLY
  # 'OK' — byte-for-byte; padding/embedded whitespace/multi-token output rejects.
  [ "$1" = "OK" ] \
    || die "post-restore verification failed: app-role schema/search-path status is not exactly OK (observed: '${1:-<empty>}')"
}

manifest_hash_of() { # manifest_hash_of <manifest> <exact-basename> -> prints hash or nothing
  # EXACT string equality on the filename field: no regex metacharacter in the
  # supplied name can widen the match (`.dump` cannot match `Xdump`).
  awk -v n="$2" '$1 ~ /^[0-9a-f]{64}$/ && $2 == n { print $1; exit }' "$1"
}

verify_archives() { # uses DUMP MEDIA SUMS META (already validated non-empty paths)
  # --- absolute, existing-file binding (missing artifacts and bad paths fail here)
  DUMP="$(realpath -e "$DUMP")" || die "dump file not found: ${DUMP:-<unset>}"
  MEDIA="$(realpath -e "$MEDIA")" || die "media tar not found: ${MEDIA:-<unset>}"
  SUMS="$(realpath -e "$SUMS")" || die "checksums file not found: ${SUMS:-<unset>}"
  META="$(realpath -e "$META")" || die "metadata file not found: ${META:-<unset>}"
  # --- F-02: the manifest must be PURE sha256sum records (grammar enforced by --strict)
  ( cd "$(dirname "$SUMS")" && sha256sum --check --strict "$(basename "$SUMS")" ) \
    || die "checksum manifest failed sha256sum --check --strict (bad grammar or mismatched digest): refusing"
  # --- F-02: provenance lives ONLY in the separate metadata file
  local m_dump m_media m_sha
  m_dump="$(sed -n 's/^dump-name \(.*\)$/\1/p' "$META" | head -1)"
  m_media="$(sed -n 's/^media-name \(.*\)$/\1/p' "$META" | head -1)"
  m_sha="$(sed -n 's/^source-sha \([0-9a-f]\{40\}\)$/\1/p' "$META" | head -1)"
  [ -n "$m_sha" ] || die "metadata file lacks a valid 'source-sha <40-hex>' provenance record"
  # F-02 (R4): EXACT match against the installer-provisioned approved runtime source
  # identity; format-only validation is insufficient. Missing or malformed record =
  # fail-closed (report; never proceed, never invent an identity).
  APPROVED_ID="$HOME/dev/songhealth-quadlet/.songhealth-qdev-source-identity"
  if [ ! -r "$APPROVED_ID" ]; then
    die "approved runtime source identity record not found at \$HOME/dev/songhealth-quadlet/.songhealth-qdev-source-identity - backup provenance cannot be verified: fail-closed (report this; do not proceed)"
  fi
  # F-02 (R5): byte-exact, fail-closed validation with NO normalization of any
  # kind. The TRUSTED reference is the installer-provisioned record file itself;
  # the contract is EXACTLY 41 bytes = 40 lowercase hex + single LF. The whole
  # record is finally compared byte-for-byte with binary-safe `cmp` (piped
  # stdin), never through command substitution, so NUL/CR/whitespace/extraneous
  # bytes can never be normalized into a match.
  ID_BYTES="$(stat -c %s "$APPROVED_ID")"
  [ "$ID_BYTES" = "41" ]     || die "approved identity record fails the byte-exact contract: size is $ID_BYTES bytes (contract: exactly 41 = 40 lowercase hex + single LF): fail-closed"
  head -c 40 "$APPROVED_ID" | LC_ALL=C grep -aqE '^[0-9a-f]{40}$'     || die "approved identity record fails the byte-exact contract: first 40 bytes are not 40 lowercase hex (whitespace/NUL/CR embedded): fail-closed"
  [ "$(tail -c 1 "$APPROVED_ID" | od -An -tx1 | tr -d ' \n')" = "0a" ]     || die "approved identity record fails the byte-exact contract: final byte is not the single contract LF: fail-closed"
  printf '%s\n' "$m_sha" | cmp -s - "$APPROVED_ID"     || die "backup provenance source-sha does not equal the approved runtime source identity record byte-for-byte (contract: 40 lowercase hex + single LF): refusing"
  [ -n "$m_dump" ] && [ -n "$m_media" ] || die "metadata file lacks dump-name/media-name positional records"
  # --- F-02: EXACT positional binding (catches swapped/reordered/wrong archives)
  [ "$(basename "$DUMP")" = "$m_dump" ] \
    || die "supplied dump $(basename "$DUMP") is not the metadata-recorded dump $m_dump (swapped or wrong archive): refusing"
  [ "$(basename "$MEDIA")" = "$m_media" ] \
    || die "supplied media $(basename "$MEDIA") is not the metadata-recorded media $m_media (swapped or wrong archive): refusing"
  case "$(basename "$DUMP")" in qdev-db-*.dump) ;; *) die "dump basename must follow the qdev-db-*.dump backup contract";; esac
  case "$(basename "$MEDIA")" in qdev-media-*.tar) ;; *) die "media basename must follow the qdev-media-*.tar backup contract";; esac
  # --- F-02: each supplied file must hash to its own manifest entry (no other-file checksum may authorize)
  local want have
  want="$(manifest_hash_of "$SUMS" "$(basename "$DUMP")")"
  [ -n "$want" ] || die "checksum manifest has no entry for the supplied dump $(basename "$DUMP"): refusing"
  have="$(sha256sum "$DUMP" | awk '{print $1}')" || die "could not hash the supplied dump"
  [ "$want" = "$have" ] || die "supplied dump does not match its manifest checksum: refusing"
  want="$(manifest_hash_of "$SUMS" "$(basename "$MEDIA")")"
  [ -n "$want" ] || die "checksum manifest has no entry for the supplied media $(basename "$MEDIA"): refusing"
  have="$(sha256sum "$MEDIA" | awk '{print $1}')" || die "could not hash the supplied media"
  [ "$want" = "$have" ] || die "supplied media does not match its manifest checksum: refusing"
  # --- F-06 (R4): strict POSIX-ustar header walker (python3, no tar output
  # parsing). Byte-precise per the approved test design: stored checksum is
  # header bytes [148:156); recompute = sum of all 512 bytes with [148:156)
  # as spaces; typeflag byte [156:157) validated separately from the octal
  # numeric fields. Accepts regular files (0/NUL) and directories (5) ONLY;
  # rejects hardlink/symlink/devices/FIFO/reserved, PAX x/g and GNU L/K
  # indirection headers, non-ustar formats, bad checksums/numerics, unsafe
  # names (charset/absolute/traversal), directory size != 0, truncation and
  # nonzero trailing bytes. PAX effective paths are NEVER trusted: x/g are
  # rejected outright.
  python3 - "$MEDIA" <<'PYWALK' || die "media archive failed the strict ustar admission walker: refusing"
import sys
data = open(sys.argv[1], "rb").read()
ALLOWED_NAME = set(b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._/- ")
TYPE_NAMES = {0x31: b"hardlink", 0x32: b"symlink", 0x33: b"char-device", 0x34: b"block-device",
              0x36: b"fifo", 0x37: b"reserved", 0x78: b"pax-extended(x)", 0x67: b"pax-global(g)",
              0x4C: b"gnu-longname(L)", 0x4B: b"gnu-longlink(K)"}
def reject(reason):
    sys.stderr.write("walker-reject:%s\n" % reason.decode("ascii", "replace")); sys.exit(1)
def octal(raw, what):
    # strict: [ optional spaces ] octal digits [ NUL ] then ONLY NUL/space padding to
    # the field end — anything after the terminator, or any non-octal digit, rejects.
    nul = raw.find(b"\x00")
    head, tail = (raw, b"") if nul < 0 else (raw[:nul], raw[nul+1:])
    if any(c not in b"\x00 " for c in tail):
        reject(b"malformed-numeric-field:" + what + b":garbage-after-nul")
    t = head.strip(b" ")
    if not t or any(c not in b"01234567" for c in t):
        reject(b"malformed-numeric-field:" + what)
    return int(t, 8)
if len(data) == 0 or len(data) % 512 != 0:
    reject(b"malformed:not-512-aligned")
i, end_blocks, n = 0, 0, len(data)
while i < n:
    block = data[i:i+512]
    if len(block) < 512:
        reject(b"malformed:truncated-header")
    if block == b"\x00" * 512:
        end_blocks += 1; i += 512
        if end_blocks == 2:
            if any(b != 0 for b in data[i:]):
                reject(b"malformed:nonzero-trailing-bytes")
            sys.exit(0)
        continue
    if end_blocks != 0:
        reject(b"malformed:single-zero-block")
    if block[257:262] != b"ustar" or block[262:263] != b"\x00" or block[263:265] != b"00":
        reject(b"unsupported-format:magic=" + block[257:265].hex().encode())
    # rev-3 approved validation: EVERY numeric field is strict-octal
    octal(block[100:108], b"mode"); octal(block[108:116], b"uid"); octal(block[116:124], b"gid")
    octal(block[136:148], b"mtime")
    stored = octal(block[148:156], b"checksum")
    calc = sum(block[:148]) + 8 * 0x20 + sum(block[156:])
    if stored != calc:
        reject(b"malformed:checksum-mismatch")
    tf = block[156]
    if tf not in (0x30, 0x00, 0x35):
        reject(b"typeflag-" + TYPE_NAMES.get(tf, ("unknown-%02x" % tf).encode()))
    raw_name = block[0:100].split(b"\x00")[0]
    prefix = block[345:500].split(b"\x00")[0]
    if not raw_name:
        reject(b"name-charset")
    for part in (raw_name, prefix):
        if any(c not in ALLOWED_NAME for c in part):
            reject(b"name-charset")
    name = (prefix + b"/" + raw_name) if prefix else raw_name
    if name.startswith(b"/"):
        reject(b"name-absolute")
    if b".." in name.split(b"/"):
        reject(b"name-traversal")
    size = octal(block[124:136], b"size")
    if tf == 0x35 and size != 0:
        reject(b"directory-size-nonzero")
    payload_blocks = (size + 511) // 512
    i += 512
    if i + payload_blocks * 512 > n:
        reject(b"malformed:truncated-payload")
    i += payload_blocks * 512
reject(b"malformed:missing-end-blocks")
PYWALK
  echo "dev-runtime-restore: archive admission PASSED (manifest grammar+digests, positional binding, provenance, tar policy)"
}

[[ "${1:-}" == "--confirm" ]] || usage
shift; DUMP="${1:-}"; MEDIA="${2:-}"; SUMS="${3:-}"; META="${4:-}"
[[ -n "$DUMP" && -n "$MEDIA" && -n "$SUMS" && -n "$META" ]] || usage
verify_archives

podman container exists songhealth-qdev-db || die "db container missing (installation must exist first)"
STATE="$(systemctl --user is-active songhealth-dev-app.service 2>&1)" || true
[ "$STATE" = "active" ] && die "stop songhealth-dev-app.service before restore (it must not serve during replacement)"
case "$STATE" in inactive|failed) ;; *) die "cannot determine songhealth-dev-app.service state (got: $STATE): refusing destructive action";; esac
for v in songhealth-qdev-db-data songhealth-qdev-media; do
  podman volume inspect "$v" >/dev/null 2>&1 || die "expected volume $v not found: restore only touches the named qdev volumes"
  LB="$(podman volume inspect --format "{{index .Labels \"io.songhealth.runtime\"}}" "$v")"
  [ "$LB" = "qdev" ] || die "volume $v lacks the io.songhealth.runtime=qdev ownership label: refusing to touch it"
done
# F-06: pg_dump archive readability preflight (runtime container, still pre-destructive)
podman cp "$DUMP" songhealth-qdev-db:/tmp/restore.dump || die "could not stage dump for preflight"
staged_dump_cleanup() { # runs on every exit path once the dump is staged
  if podman exec songhealth-qdev-db rm -f /tmp/restore.dump >/dev/null 2>&1; then
    echo "dev-runtime-restore: staged /tmp/restore.dump removed" >&2
  else
    echo "dev-runtime-restore: WARNING: staged /tmp/restore.dump could not be removed - remove it manually before the next run" >&2
  fi
}
trap staged_dump_cleanup EXIT
podman exec songhealth-qdev-db pg_restore --list /tmp/restore.dump >/dev/null \
  || { podman exec songhealth-qdev-db rm -f /tmp/restore.dump; die "archive integrity preflight failed: dump is not a readable pg_dump archive"; }

echo "This replaces the songhealth_qdev DATABASE content from: $DUMP"
confirm "replace database content? (archive admission passed)"
# F-03: ownership-preserving reset — the app role keeps owning database+schema,
# and the restore runs AS the app role so restored objects keep that ownership.
podman exec -i songhealth-qdev-db psql -U songhealth_qdev_admin -d songhealth_qdev -v ON_ERROR_STOP=1 <<'SQL' || die "schema reset failed"
DROP SCHEMA public CASCADE;
CREATE SCHEMA public AUTHORIZATION songhealth_qdev_app;
ALTER DATABASE songhealth_qdev OWNER TO songhealth_qdev_app;
SQL
podman exec songhealth-qdev-db pg_restore -U songhealth_qdev_app -d songhealth_qdev --exit-on-error /tmp/restore.dump \
  || { podman exec songhealth-qdev-db rm -f /tmp/restore.dump; die "pg_restore failed: database left in restored-partial state — do not restart the app without review"; }
podman exec songhealth-qdev-db rm -f /tmp/restore.dump || true  # lifecycle now guaranteed + reported by the EXIT trap

# F-03 (R3): native EXACT post-restore verification. Every component emits the
# literal token OK or BAD:<detail>; bash accepts only exact OK fields, so no
# substring (public_shadow), duplicate, extra or shadowed schema can pass.
V="$(podman exec songhealth-qdev-db psql -U songhealth_qdev_admin -d songhealth_qdev -tAc "
SELECT array_to_string(ARRAY[
  CASE WHEN (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='songhealth_qdev') = 'songhealth_qdev_app' THEN 'OK' ELSE 'BAD:db-owner' END,
  CASE WHEN (SELECT count(*) FROM pg_namespace WHERE nspname='public' AND pg_get_userbyid(nspowner)='songhealth_qdev_app') = 1 THEN 'OK' ELSE 'BAD:schema-owner' END,
  CASE WHEN (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND pg_get_userbyid(c.relowner)<>'songhealth_qdev_app') = 0 THEN 'OK' ELSE 'BAD:relation-owner' END,
  CASE WHEN (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname='public' AND NOT (has_table_privilege('songhealth_qdev_app',c.oid,'SELECT') AND has_table_privilege('songhealth_qdev_app',c.oid,'INSERT') AND has_table_privilege('songhealth_qdev_app',c.oid,'UPDATE') AND has_table_privilege('songhealth_qdev_app',c.oid,'DELETE'))) = 0 THEN 'OK' ELSE 'BAD:table-dml' END,
  CASE WHEN (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname='public' AND NOT (has_sequence_privilege('songhealth_qdev_app',c.oid,'SELECT') AND has_sequence_privilege('songhealth_qdev_app',c.oid,'USAGE') AND has_sequence_privilege('songhealth_qdev_app',c.oid,'UPDATE'))) = 0 THEN 'OK' ELSE 'BAD:sequence-priv' END
], '|')")" || die "post-restore verification query failed"
# F-03 (R3): EXACT search-path contract as a native query token — creation schema
# public, effective schemas EXACTLY {public} (no extras/duplicates/shadows), no temp schema.
V2="$(podman exec songhealth-qdev-db psql -U songhealth_qdev_app -d songhealth_qdev -tAc "
SELECT CASE WHEN COALESCE(current_schema(),'NULL') = 'public' AND COALESCE(current_schemas(false), ARRAY[NULL]::name[]) = ARRAY['public']::name[] AND pg_my_temp_schema() = 0 AND (SELECT count(*) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema') = 1 AND (SELECT count(*) FROM pg_namespace WHERE nspname = 'public') = 1 THEN 'OK' ELSE 'BAD:'||COALESCE(current_schema(),'NULL')||'/'||COALESCE(array_to_string(current_schemas(false),','),'NULL')||'/'||pg_my_temp_schema()||'/'||COALESCE((SELECT array_to_string(array_agg(nspname ORDER BY nspname),',') FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'),'NULL') END")" \
  || die "post-restore search-path verification query failed"
verify_v_vector "$V"
verify_v2_token "$V2"
echo "dev-runtime-restore: post-restore verification PASSED (db/schema/relation ownership, table DML, sequence privileges, exact public-only search path)"

echo "This replaces the songhealth-qdev-media VOLUME content from: $MEDIA"
confirm "replace media content?"
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)"; [[ -n "$MP" ]] || die "media volume not inspectable"
confirm "ERASE current media volume contents (qdev only) and extract the tar?"
podman unshare find "$MP" -mindepth 1 -maxdepth 1 ! -name '.songhealth-qdev-media-store' -exec rm -rf -- {} + \
  || die "media clear failed"
podman unshare tar -xf "$MEDIA" -C "$MP" || die "media extract failed (marker preserved); inspect manually"
echo "dev-runtime-restore: restore sequence done. Verify with scripts/dev-runtime-verify.sh BEFORE restarting the app; restart is a separate explicit operator action."
