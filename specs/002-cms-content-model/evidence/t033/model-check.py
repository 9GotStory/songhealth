#!/usr/bin/env python3
"""T033: compare the live EmDash schema of the development runtime with data-model.md.

GET requests only. Checks the ten unconditional collections (and that the conditional
`organizations` variant is absent), every field's native type and save-time requiredness,
select options, coordinate ranges, repeater subfields, native supports, the taxonomy
attachments and the six unconditional relation edge sets with their maxima and bindings.
The development PAT is read from its 0600 file and never printed. Exit 0 when all match.
"""
import json
import os
import urllib.request

API = "http://127.0.0.1:4324/_emdash/api"
with open(os.path.expanduser("~/.local/state/songhealth-qdev/dev-pat")) as f:
    PAT = f.read().strip()


def data(path):
    req = urllib.request.Request(API + path, headers={"Authorization": f"Bearer {PAT}"})
    d = json.load(urllib.request.urlopen(req, timeout=30))["data"]
    if isinstance(d, dict):
        for k in ("items", "fields", "taxonomies", "relations"):
            if k in d and isinstance(d[k], list):
                return d[k]
    return d


# data-model.md "Collection Fields" (S = required at save; everything else optional) plus the
# reference fields bound by "Native Relationship Accounting".
S = "S"
MODEL = {
    "pages": {"title": ("string", S), "summary": "text", "body": "portableText", "documents": "reference"},
    "news": {"title": ("string", S), "summary": "text", "body": "portableText",
             "featured_image": "image", "source_text": "text"},
    "activities": {"title": ("string", S), "summary": "text", "activity_at": "datetime",
                   "location_text": "string", "featured_image": "image", "gallery": "repeater",
                   "participants_text": "text"},
    "announcements": {"title": ("string", S), "details": "portableText", "announcement_at": "datetime",
                      "opens_at": "datetime", "closes_at": "datetime", "documents": "reference"},
    "health_content": {"title": ("string", S), "summary": "text", "body": "portableText",
                       "source_text": "text", "featured_image": "image", "reviewed_at": "datetime",
                       "next_review_at": "datetime"},
    "personnel": {"title": ("string", S), "prefix": "string", "first_name": "string",
                  "last_name": "string", "profile_image": "image", "current_assignment": "string",
                  "organizational_unit": "string", "public_visible": "boolean", "public_contact": "text"},
    "health_services": {"title": ("string", S), "facility_code": "string", "display_name": "string",
                        "operational_status": "select", "address": "text", "latitude": "number",
                        "longitude": "number", "opening_hours": "text", "public_contact": "text",
                        "affiliation_text": "string", "image": "image", "offered_services": "reference"},
    "services": {"title": ("string", S), "summary": "text", "ownership_type": "select",
                 "provider_text": "string", "channels": "repeater", "eligibility": "portableText",
                 "steps": "portableText", "required_documents_guidance": "portableText",
                 "contact_location_guidance": "portableText", "duration": "text", "fees": "text",
                 "notes": "text", "external_url": "url", "documents": "reference",
                 "offering_facilities": "reference"},
    "documents": {"title": ("string", S), "summary": "text", "file": ("file", S),
                  "document_at": "datetime", "fiscal_year": "integer", "owner_source": "text",
                  "domain_status": "select", "successor": "reference"},
    "health_reports": {"title": ("string", S), "summary": "text", "reporting_period": "text",
                       "owner_source": "text", "report_at": "datetime", "fiscal_year": "integer",
                       "report_document": ("reference", S)},
}
VALIDATION = {
    ("health_services", "operational_status"): {"options": ["active", "temporarily_closed", "inactive"]},
    ("health_services", "latitude"): {"min": -90, "max": 90},
    ("health_services", "longitude"): {"min": -180, "max": 180},
    ("documents", "domain_status"): {"options": ["current", "superseded", "expired"]},
    ("services", "ownership_type"): {"options": ["direct", "coordinated", "related_health_service",
                                                 "external_digital"]},
}
SUBFIELDS = {
    ("services", "channels"): [("label", "string", False), ("url", "url", False)],
    ("activities", "gallery"): [("image", "image", True), ("caption", "string", False)],
}
SUPPORTS = {"drafts", "revisions", "preview", "scheduling"}
# data-model.md "Taxonomies, Area and Owner Settings".
TAXONOMIES = {
    "topic": ({"news", "activities", "announcements", "health_content", "documents",
               "health_reports", "services"}, False),
    "audience": ({"news", "announcements", "health_content", "services"}, False),
    "news_category": ({"news"}, False),
    "announcement_type": ({"announcements"}, False),
    "document_type": ({"documents"}, False),
    "report_type": ({"health_reports"}, False),
    "facility_type": ({"health_services"}, False),
    "service_category": ({"services"}, False),
    "area": ({"news", "activities", "health_services", "health_reports"}, True),
}
BUILTIN_TAXONOMIES = {"category", "tag"}  # EmDash's own; must stay unattached
# (parent, child, maxChildrenPerParent, maxParentsPerChild, bound fields as collection.field:side)
RELATIONS = {
    "report_document": ("health_reports", "documents", 1, None, {"health_reports.report_document:parent"}),
    "announcement_documents": ("announcements", "documents", None, None, {"announcements.documents:parent"}),
    "service_documents": ("services", "documents", None, None, {"services.documents:parent"}),
    "page_documents": ("pages", "documents", None, None, {"pages.documents:parent"}),
    "facility_services": ("health_services", "services", None, None,
                          {"health_services.offered_services:parent", "services.offering_facilities:child"}),
    "document_successor": ("documents", "documents", 1, None, {"documents.successor:parent"}),
}

problems = []
cols = {c["slug"]: c for c in data("/schema/collections")}
if set(cols) != set(MODEL):
    problems.append(f"collections differ: live {sorted(cols)}")
if "organizations" in cols:
    problems.append("the conditional organizations variant exists without a recorded reuse case")
nfields = 0
for slug, fields in MODEL.items():
    if slug not in cols:
        continue
    c = cols[slug]
    if set(c.get("supports") or []) != SUPPORTS:
        problems.append(f"{slug}: supports {c.get('supports')}")
    if c.get("hasSeo"):
        problems.append(f"{slug}: SEO enabled although the model enables it nowhere")
    live = {f["slug"]: f for f in data(f"/schema/collections/{slug}/fields")}
    if set(live) != set(fields):
        problems.append(f"{slug}: fields differ (extra {sorted(set(live) - set(fields))}, "
                        f"missing {sorted(set(fields) - set(live))})")
    for name, spec in fields.items():
        f = live.get(name)
        if f is None:
            continue
        nfields += 1
        want_type, want_req = spec if isinstance(spec, tuple) else (spec, None)
        if f["type"] != want_type:
            problems.append(f"{slug}.{name}: type {f['type']} (model {want_type})")
        if bool(f.get("required")) != (want_req == S):
            problems.append(f"{slug}.{name}: required={bool(f.get('required'))} (model {want_req or 'O'})")
        validation = f.get("validation") or {}
        for key, want in VALIDATION.get((slug, name), {}).items():
            if validation.get(key) != want:
                problems.append(f"{slug}.{name}: {key} {validation.get(key)} (model {want})")
        if (slug, name) in SUBFIELDS:
            got = [(s["slug"], s["type"], bool(s.get("required"))) for s in validation.get("subFields", [])]
            if got != SUBFIELDS[(slug, name)]:
                problems.append(f"{slug}.{name}: subfields {got}")
tax = {t["name"]: t for t in data("/taxonomies")}
for name, (attached, hierarchical) in TAXONOMIES.items():
    t = tax.get(name)
    if t is None:
        problems.append(f"taxonomy {name} missing")
    elif set(t.get("collections") or []) != attached or bool(t.get("hierarchical")) != hierarchical:
        problems.append(f"taxonomy {name}: attached {sorted(t.get('collections') or [])}, "
                        f"hierarchical {t.get('hierarchical')}")
for name in set(tax) - set(TAXONOMIES):
    if name not in BUILTIN_TAXONOMIES or tax[name].get("collections"):
        problems.append(f"unexpected taxonomy {name} attached to {tax[name].get('collections')}")
rels = {r["slug"]: r for r in data("/relations")}
if set(rels) != set(RELATIONS):
    problems.append(f"relations differ: live {sorted(rels)}")
for name, (parent, child, max_children, max_parents, bound) in RELATIONS.items():
    r = rels.get(name)
    if r is None:
        continue
    got = {f"{b['collectionSlug']}.{b['fieldSlug']}:{b['side']}" for b in r.get("boundFields", [])}
    if (r["parentCollection"], r["childCollection"], r["maxChildrenPerParent"], r["maxParentsPerChild"],
            got) != (parent, child, max_children, max_parents, bound):
        problems.append(f"relation {name}: {r['parentCollection']}->{r['childCollection']} "
                        f"max {r['maxChildrenPerParent']}/{r['maxParentsPerChild']} bound {sorted(got)}")

print(f"collections: {len(cols)} live, {len(MODEL)} in the model; organizations variant absent: "
      f"{'organizations' not in cols}")
print(f"fields checked: {nfields} (type, save-time requiredness, options, ranges, subfields)")
print(f"taxonomies checked: {len(TAXONOMIES)} attached + built-ins {sorted(BUILTIN_TAXONOMIES & set(tax))} unattached")
print(f"relations checked: {len(RELATIONS)} (parent/child, maxima, bound fields)")
for p in problems:
    print("MISMATCH:", p)
print("MODEL-CHECK: PASS" if not problems else "MODEL-CHECK: FAIL")
raise SystemExit(0 if not problems else 1)
