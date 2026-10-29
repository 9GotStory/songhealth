#!/usr/bin/env bash
# Songhealth development runtime — RESIDUE (#53 retro): a read-only count of what test runs leave
# behind, through the native API with the development PAT, which is never printed. Synthetic
# fixtures carry the mark songhealth-f002-synthetic (tests/browser/cms.helpers.ts
# SYNTHETIC_FIXTURE_MARK), and requests for missing pages use songhealth-unknown- paths.
#   scripts/dev-runtime-residue.sh
# Entries (live or in trash), media, terms, bylines and redirects must all be gone after a task
# run: any that remain are listed and the exit status is 1. EmDash's 404 log keeps the tests'
# misses too, but it can only be cleared as a whole, so those are counted without failing
# (docs/operations/development-quadlet.md). Exit status 2: the count itself failed.
set -uo pipefail
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

[[ -s $STATE_DIR/dev-pat && $(stat -c %a "$STATE_DIR/dev-pat") == 600 ]] \
  || die "the development PAT $STATE_DIR/dev-pat is missing or not mode 0600"
python3 -I - "$STATE_DIR/dev-pat" "$ORIGIN" <<'PY'
import json, sys, urllib.error, urllib.parse, urllib.request

token = open(sys.argv[1]).read().strip()
origin = sys.argv[2]
FIXTURE = "songhealth-f002-synthetic"
MISSES = (FIXTURE, "songhealth-unknown-")


def get(path, **query):
    url = origin + path + ("?" + urllib.parse.urlencode(query) if query else "")
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["data"]


def every(path, **query):
    """Every item of a native list, following nextCursor."""
    cursor = None
    while True:
        data = get(path, limit=100, **query, **({"cursor": cursor} if cursor else {}))
        yield from data["items"]
        cursor = data.get("nextCursor")
        if not cursor:
            return


def marked(items, marks=(FIXTURE,)):
    return sum(1 for item in items if any(m in json.dumps(item, ensure_ascii=False) for m in marks))


try:
    left = {}
    for collection in get("/_emdash/api/schema/collections")["items"]:
        slug = collection["slug"]
        left[f"{slug} entries"] = marked(every(f"/_emdash/api/content/{slug}"))
        left[f"{slug} entries in trash"] = marked(every(f"/_emdash/api/content/{slug}/trash"))
    left["media"] = marked(every("/_emdash/api/media"))
    for taxonomy in get("/_emdash/api/taxonomies")["taxonomies"]:
        name = taxonomy["name"]
        left[f"{name} terms"] = marked(get(f"/_emdash/api/taxonomies/{name}/terms")["terms"])
    left["bylines"] = marked(every("/_emdash/api/admin/bylines", search=FIXTURE))
    left["redirects"] = marked(every("/_emdash/api/redirects", search=FIXTURE))
    misses = marked(every("/_emdash/api/redirects/404s"), MISSES)
except (urllib.error.URLError, KeyError, ValueError) as error:
    reason = error.code if isinstance(error, urllib.error.HTTPError) else type(error).__name__
    print(f"RESIDUE: UNKNOWN (the count failed: {reason})")
    sys.exit(2)

for kind, count in left.items():
    if count:
        print(f"LEFT: {count} synthetic {kind}")
print(f"404 log: {misses} synthetic misses, cleared as a whole before the Product Owner's review")
found = any(left.values())
print("RESIDUE: FOUND" if found else "RESIDUE: NONE")
sys.exit(1 if found else 0)
PY
