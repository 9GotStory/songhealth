#!/usr/bin/env python3
"""T036 recheck: compare seed/seed.json with the live EmDash schema (GET requests only).

Reports the collections, fields, taxonomies and relations of the seed that the running
development runtime lacks. The development PAT is read from its 0600 file and never
printed. Exit 0 when nothing is missing.
"""
import json
import os
import sys
import urllib.request

API = "http://127.0.0.1:4324/_emdash/api"
with open(sys.argv[1] if len(sys.argv) > 1 else "seed/seed.json") as f:
    seed = json.load(f)
with open(os.path.expanduser("~/.local/state/songhealth-qdev/dev-pat")) as f:
    PAT = f.read().strip()


def data(path, *keys):
    req = urllib.request.Request(API + path, headers={"Authorization": f"Bearer {PAT}"})
    d = json.load(urllib.request.urlopen(req, timeout=30))["data"]
    if isinstance(d, list):
        return d
    for k in keys:
        if k in d:
            return d[k]
    raise KeyError(f"{path}: none of {keys} in the response")


live_cols = {c["slug"] for c in data("/schema/collections", "items")}
missing_cols = sorted({c["slug"] for c in seed["collections"]} - live_cols)
missing_fields, nfields = {}, 0
for c in seed["collections"]:
    want = {f["slug"] for f in c.get("fields", [])}
    nfields += len(want)
    if c["slug"] in missing_cols:
        continue
    live = {f["slug"] for f in data(f"/schema/collections/{c['slug']}/fields", "items", "fields")}
    if want - live:
        missing_fields[c["slug"]] = sorted(want - live)
seed_tax = {t["name"] for t in seed["taxonomies"]}
live_tax = {t["name"] for t in data("/taxonomies", "taxonomies", "items")}
seed_rel = {r["slug"] for r in seed["relations"]}
live_rel = {r["slug"] for r in data("/relations", "relations", "items")}
skipped = {
    "content": sum(len(v) for v in (seed.get("content") or {}).values()),
    "terms": sum(len(t.get("terms", [])) for t in seed["taxonomies"]),
    "bylines": len(seed.get("bylines", [])),
}

print(f"collections: {len(seed['collections'])} in the seed; missing live: {missing_cols or 'none'}")
print(f"fields: {nfields} in the seed; missing live: {missing_fields or 'none'}")
print(f"taxonomies: {len(seed_tax)} in the seed; missing live: {sorted(seed_tax - live_tax) or 'none'}; "
      f"live only (EmDash built-ins): {sorted(live_tax - seed_tax) or 'none'}")
print(f"relations: {len(seed_rel)} in the seed; missing live: {sorted(seed_rel - live_rel) or 'none'}")
print(f"seed items that setup's content=0 skips: {skipped}")
ok = not (missing_cols or missing_fields or seed_tax - live_tax or seed_rel - live_rel)
print("SEED-SCHEMA: PASS" if ok else "SEED-SCHEMA: FAIL")
sys.exit(0 if ok else 1)
