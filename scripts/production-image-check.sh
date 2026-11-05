#!/usr/bin/env bash
# Production image check (#67 retro; Product Owner, #67 comment 6558736325): build
# deploy/Containerfile for one commit, check its native pieces, run it once against the development
# runtime's data, show how a News picture is served, and remove the container and the image.
#   scripts/production-image-check.sh --sha <commit> [<news-path>]
# The run is the Product Owner's exception to "one application server" (#67 comment 6558196151):
# a temporary container on the runtime's private network that connects to its database as the
# least-privilege app role, with the runtime's own podman secrets as environment variables, the
# media volume read-only, published on 127.0.0.1:4325 only. Production's native migration mode is
# `check`, so it changes no schema; like any server, it adds a missed address to EmDash's 404 log.
# The image is never deployed or tagged as a release. A base image that is missing locally is
# pulled by the digest deploy/Containerfile pins.
# Cleanup: the decision named removing the build's intermediate images by the IDs it added. Other
# projects share this image storage and may build meanwhile, so the build instead runs with
# `--layers=false`, which commits the final image alone (podman 5.8.4, 2026-11-01), and only its
# tag is removed. Any image the run added that is still there at the end is listed, not removed.
# <news-path> defaults to the demo dataset's Featured News, which has a picture. sharp is optional
# (spec #51 "Dependencies"), so a sharp that does not load is reported, not failed. Exit status 1:
# a step failed; 2: a wrong argument. Log lines are printed only with credentials masked.
set -euo pipefail
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

usage() { echo "usage: ${0##*/} --sha <commit> [<news-path>]" >&2; exit 2; }
[[ ${1:-} == --sha && -n ${2:-} ]] || usage
REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMMIT=$(git -C "$REPO" rev-parse --verify -q "$2^{commit}") || die "no commit $2"
NEWS_PATH=${3:-/news/demo-news-ncd-screening}
CHECK_PORT=4325
CHECK_ORIGIN=http://127.0.0.1:$CHECK_PORT
TAG=localhost/songhealth-image-check:${COMMIT:0:7}
CTR=songhealth-image-check

# The database the runtime's app unit names: one source of truth for the connection.
unit_env() { sed -n "s/^Environment=$1=//p" "$SRC/deploy/dev-quadlet/songhealth-dev-app.container"; }
# Log lines with anything shaped like a credential masked: a PAT, the encryption key, a database
# URL, or a long hexadecimal string such as the database password.
masked() {
  sed -E 's/(ec_pat_|ec_oat_|emdash_enc_v1_)[A-Za-z0-9_-]+/\1[masked]/g
    s#postgres(ql)?://[^[:space:]]*#postgres://[masked]#g; s/[0-9a-fA-F]{32,}/[masked]/g'
}

podman container exists "$CTR" && die "container $CTR exists: another check is running or was left behind"
podman image exists "$TAG" && die "image $TAG exists: remove it first (podman rmi $TAG)"
curl -s -o /dev/null --max-time 2 "$CHECK_ORIGIN/" && die "$CHECK_ORIGIN already answers"

work=$(mktemp -d)
podman images -aq --no-trunc | sort >"$work/images-before"
cleanup() {
  podman rm -f -t 0 "$CTR" >/dev/null 2>&1 || true
  podman rmi "$TAG" >/dev/null 2>&1 || true
  local left
  left=$(podman images -aq --no-trunc | sort | comm -13 "$work/images-before" -)
  rm -rf "$work"
  if [[ -n $left ]]; then warn "images added during the run are still present: ${left//$'\n'/ }"
  else note "removed the container and the image; no image the run added is left"; fi
}
trap cleanup EXIT

note "building deploy/Containerfile at ${COMMIT:0:7} from a git archive"
mkdir "$work/context"
{ git -C "$REPO" archive "$COMMIT" | tar -x -C "$work/context"; } || die "could not export ${COMMIT:0:7}"
started=$SECONDS
podman build --layers=false -f "$work/context/deploy/Containerfile" -t "$TAG" \
  "$work/context" >"$work/build.log" 2>&1 || { tail -20 "$work/build.log" >&2; die "the image build failed"; }
note "built $(podman image inspect "$TAG" --format '{{.Id}}' | cut -c1-12) in $((SECONDS - started)) s," \
  "$(podman image inspect "$TAG" --format '{{.Size}}' | numfmt --to=si) bytes"

note "native pieces, in a container with no network:"
pieces=$(podman run --rm --network none "$TAG" node -e '
const out = { node: process.version };
try { require("@tailwindcss/oxide").Scanner; out.oxide = "loads"; } catch (e) { out.oxide = "FAILS: " + e.message.split("\n")[0]; }
import("sharp").then(async ({ default: sharp }) => {
  const png = await sharp({ create: { width: 4, height: 3, channels: 3, background: "#0b6b57" } }).png().toBuffer();
  out.sharp = `loads (libvips ${sharp.versions.vips}), made a ${(await sharp(png).metadata()).width}x3 PNG`;
}).catch((e) => { out.sharp = "FAILS: " + e.message.split("\n")[0]; })
  .finally(() => { console.log(JSON.stringify(out)); process.exit(out.oxide === "loads" ? 0 : 1); });
') || { printf '%s\n' "$pieces"; die "Tailwind's oxide binary does not load"; }
printf '%s\n' "$pieces"
if [[ $pieces == *'"sharp":"FAILS'* ]]; then
  warn "sharp does not load: pages still serve original pictures (ADR 0003), but its revisit needs sharp"
fi

note "running the image on $CHECK_ORIGIN against the development database"
podman run -d --name "$CTR" --network "$NETWORK" -p "127.0.0.1:$CHECK_PORT:$CHECK_PORT" \
  -e HOST=0.0.0.0 -e PORT="$CHECK_PORT" -e EMDASH_SITE_URL="$CHECK_ORIGIN" \
  -e PGHOST="$(unit_env PGHOST)" -e PGPORT="$(unit_env PGPORT)" \
  -e PGDATABASE="$(unit_env PGDATABASE)" -e PGUSER="$(unit_env PGUSER)" \
  --secret songhealth-qdev-app-password,type=env,target=PGPASSWORD \
  --secret songhealth-qdev-migration-database-url,type=env,target=EMDASH_MIGRATION_DATABASE_URL \
  --secret songhealth-qdev-encryption-key,type=env,target=EMDASH_ENCRYPTION_KEY \
  -v "$MEDIA_VOLUME:/app/media:ro" "$TAG" >/dev/null || die "the image did not start"
deadline=$((SECONDS + 60))
until serves_marker "$CHECK_ORIGIN" 5; do
  if ((SECONDS >= deadline)); then
    podman logs --tail 20 "$CTR" 2>&1 | masked >&2
    die "the image did not serve the public marker within 60 s"
  fi
  sleep 1
done
note "it serves the public marker at /"

note "the first picture on $NEWS_PATH, in production and on the development runtime:"
python3 -I - "$CHECK_ORIGIN" "$ORIGIN" "$NEWS_PATH" <<'PY' || die "the News page or its picture could not be read"
import sys, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser


class FirstImage(HTMLParser):
    """The first <img> inside <main>."""

    def __init__(self):
        super().__init__()
        self.in_main, self.image = False, None

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.in_main = True
        elif tag == "img" and self.in_main and self.image is None:
            self.image = dict(attrs)


def served(origin, path):
    parser = FirstImage()
    with urllib.request.urlopen(origin + path, timeout=30) as page:
        parser.feed(page.read().decode())
    image = parser.image
    if image is None:
        return f"{origin}: no picture in <main>"
    src = image["src"]
    candidates = {entry.split()[0] for entry in image.get("srcset", "").split(",") if entry.strip()}
    with urllib.request.urlopen(urllib.request.Request(urllib.parse.urljoin(origin, src)), timeout=30) as file:
        body = file.read()
        kind = file.headers.get("content-type")
    return (f"{origin}: declared {image.get('width')} x {image.get('height')}; src {src.split('?')[0]}"
            f"{' (a rendition)' if src.startswith('/_image') else ' (the original)'}; "
            f"{len(candidates)} distinct srcset file(s); src downloads {len(body):,} bytes of {kind}")


failed = False
for origin in sys.argv[1:3]:
    try:
        print("  " + served(origin, sys.argv[3]))
    except (OSError, ValueError) as error:  # urllib's errors are OSErrors
        reason = error.code if isinstance(error, urllib.error.HTTPError) else type(error).__name__
        print(f"  {origin}: {sys.argv[3]} failed ({reason})")
        failed = True
sys.exit(1 if failed else 0)
PY

lines=$(podman logs "$CTR" 2>&1)
note "its log: $(grep -c . <<<"$lines") lines, $(grep -ciE 'error|warn' <<<"$lines" || true) with an error or a warning"
grep -qE 'ec_pat_|ec_oat_|emdash_enc_v1_|postgres(ql)?://' <<<"$lines" && die "its log holds a credential"
note "PRODUCTION IMAGE CHECK: PASS at ${COMMIT:0:7}"
