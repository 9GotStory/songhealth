// T030 post-test preservation verification: synthetic-fixture absence
// (entries, trash, media, taxonomy terms incl. the hierarchical area tree),
// full live-schema equality with the accepted seed (including the two-selector
// facility_services binding and the T028 coordinate ranges), queue/orphan
// state, and the credential file's unchanged mode. Modeled on the accepted
// T018 postcheck (../t018/t018-postcheck.mjs); the relation check is extended
// for facility_services's TWO bound selectors (parent + child sides over one
// edge set).
import { readFileSync, writeFileSync, lstatSync, statSync } from "node:fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4322";
const DEV_ACCESS = process.env.SONGHEALTH_DEV_ACCESS ?? "/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json";
const OUT = new URL("./post-test-verification.json", import.meta.url).pathname;
const st = lstatSync(DEV_ACCESS);
if ((st.mode & 0o777) !== 0o600) throw new Error("credential file mode changed");
const token = JSON.parse(readFileSync(DEV_ACCESS, "utf8")).token;
const seed = JSON.parse(readFileSync(new URL("../../../../seed/seed.json", import.meta.url).pathname, "utf8"));

async function req(method, path) {
	const res = await fetch(new URL(path, BASE_URL), { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, redirect: "error" });
	const text = await res.text();
	let body; try { body = text.length ? JSON.parse(text) : undefined; } catch { body = { nonJson: text.slice(0, 300) }; }
	return { status: res.status, ok: res.ok, body };
}
const listOf = (r, key) => r.body?.data?.[key] ?? r.body?.data?.items ?? (Array.isArray(r.body?.data) ? r.body.data : undefined);
const report = { capturedAt: new Date().toISOString(), checks: [], problems: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) report.problems.push(`${name}: ${JSON.stringify(detail).slice(0, 300)}`); };

// 1. collections set + full definition equality
const cols = (listOf(await req("GET", "/_emdash/api/schema/collections"), "collections") ?? []).map((c) => c.slug).sort();
check("collection set equals accepted ten (nine + health_services)", JSON.stringify(cols) === JSON.stringify(seed.collections.map((c) => c.slug).sort()), cols);

for (const c of seed.collections) {
	const r = await req("GET", `/_emdash/api/schema/collections/${c.slug}?includeFields=true`);
	const live = r.body?.data?.item;
	if (!r.ok || !live) { check(`${c.slug} readable`, false, r.status); continue; }
	const problems = [];
	if (live.label !== c.label) problems.push("label");
	if ((live.titleField ?? null) !== (c.titleField ?? null)) problems.push("titleField");
	if ((live.dateField ?? null) !== (c.dateField ?? null)) problems.push("dateField");
	const lf = (live.fields ?? []).filter((f) => f?.slug);
	if (lf.length !== c.fields.length) problems.push(`field count ${lf.length}!=${c.fields.length}`);
	if (JSON.stringify(lf.map((f) => f.slug)) !== JSON.stringify(c.fields.map((f) => f.slug))) problems.push("field order");
	const bySlug = new Map(lf.map((f) => [f.slug, f]));
	for (const sf of c.fields) {
		const f = bySlug.get(sf.slug);
		if (!f) { problems.push(`missing ${sf.slug}`); continue; }
		if (f.type !== sf.type || (f.required === true) !== (sf.required === true) || f.label !== sf.label) problems.push(`${sf.slug} def`);
		if (sf.validation?.relation && (f.validation?.relation !== sf.validation.relation || f.validation?.relationSide !== sf.validation.relationSide)) problems.push(`${sf.slug} binding`);
		if (sf.validation?.min !== undefined && f.validation?.min !== sf.validation.min) problems.push(`${sf.slug} min`);
		if (sf.validation?.max !== undefined && f.validation?.max !== sf.validation.max) problems.push(`${sf.slug} max`);
		if (sf.validation?.options && JSON.stringify(f.validation?.options) !== JSON.stringify(sf.validation.options)) problems.push(`${sf.slug} options`);
	}
	check(`${c.slug} definition equals seed`, problems.length === 0, problems);
}

// 2. relations — facility_services carries TWO bound selectors (one per side);
// every other accepted relation carries exactly one parent-side bound field.
const rels = listOf(await req("GET", "/_emdash/api/relations"), "relations") ?? [];
const relSlugs = rels.map((r) => r.slug).sort();
check("relation set equals accepted six", JSON.stringify(relSlugs) === JSON.stringify(seed.relations.map((r) => r.slug).sort()), relSlugs);
const connecting = rels.filter((r) => (r.parentCollection === "health_services" && r.childCollection === "services") || (r.parentCollection === "services" && r.childCollection === "health_services"));
check("exactly one relation connects health_services and services", connecting.length === 1 && connecting[0]?.slug === "facility_services", connecting.map((r) => r.slug));
for (const sr of seed.relations) {
	const live = rels.find((r) => r.slug === sr.slug);
	if (!live) { check(`relation ${sr.slug}`, false, "absent"); continue; }
	const ok = live.parentCollection === sr.parentCollection && live.childCollection === sr.childCollection
		&& (live.maxChildrenPerParent ?? null) === (sr.maxChildrenPerParent ?? null) && (live.maxParentsPerChild ?? null) === (sr.maxParentsPerChild ?? null);
	let bindingOk = false;
	if (sr.slug === "facility_services") {
		// Native boundFields entries carry { collectionSlug, fieldSlug, side }.
		const bound = Array.isArray(live.boundFields) ? live.boundFields : [];
		const parentSide = bound.some((b) => b.fieldSlug === "offered_services" && b.side === "parent" && b.collectionSlug === "health_services");
		const childSide = bound.some((b) => b.fieldSlug === "offering_facilities" && b.side === "child" && b.collectionSlug === "services");
		bindingOk = parentSide && childSide && bound.length === 2;
	} else {
		bindingOk = Array.isArray(live.boundFields) && live.boundFields.length === 1 && live.boundFields[0].side === "parent";
	}
	check(`relation ${sr.slug} endpoints/limits/binding`, ok && bindingOk, { maxC: live.maxChildrenPerParent, maxP: live.maxParentsPerChild, bound: live.boundFields });
}

// 3. taxonomies
const taxs = listOf(await req("GET", "/_emdash/api/taxonomies"), "taxonomies") ?? [];
for (const stx of seed.taxonomies) {
	const live = taxs.find((t) => t.name === stx.name);
	if (!live) { check(`taxonomy ${stx.name}`, false, "absent"); continue; }
	const a = [...(live.collections ?? [])].sort();
	const b = [...stx.collections].sort();
	check(`taxonomy ${stx.name} attachments`, JSON.stringify(a) === JSON.stringify(b), { live: a, seed: b });
	check(`taxonomy ${stx.name} hierarchical`, (live.hierarchical === true) === (stx.hierarchical === true), live.hierarchical);
}

// 4. synthetic fixture absence — entries, trash, media, terms
for (const slug of cols) {
	const live = await req("GET", `/_emdash/api/content/${slug}?q=songhealth-f002-synthetic&status=all&limit=100`);
	check(`${slug} zero synthetic entries`, live.ok && (listOf(live, "items") ?? []).length === 0, { status: live.status, count: (listOf(live, "items") ?? []).length });
	const trash = await req("GET", `/_emdash/api/content/${slug}/trash?limit=100`);
	check(`${slug} zero trash residue`, trash.ok && (listOf(trash, "items") ?? []).length === 0, { status: trash.status, count: (listOf(trash, "items") ?? []).length });
}
const media = await req("GET", "/_emdash/api/media?q=songhealth-f002-synthetic&limit=100");
check("zero synthetic media", media.ok && (listOf(media, "items") ?? []).length === 0, { status: media.status, count: (listOf(media, "items") ?? []).length });
const mediaAll = await req("GET", "/_emdash/api/media?limit=100");
check("media store empty", mediaAll.ok && (listOf(mediaAll, "items") ?? []).length === 0, { status: mediaAll.status, count: (listOf(mediaAll, "items") ?? []).length });

// Terms: walk the COMPLETE hierarchical tree for area (descendants appear only
// nested); flat listing for facility_type and topic. Any slug or label
// carrying the synthetic marker is residue.
const syntheticInTree = (nodes, found) => {
	for (const n of nodes ?? []) {
		if (typeof n?.slug === "string" && n.slug.includes("songhealth-f002-synthetic")) found.push(n.slug);
		if (typeof n?.label === "string" && n.label.includes("songhealth-f002-synthetic")) found.push(`label:${n.label.slice(0, 40)}`);
		syntheticInTree(n?.children, found);
	}
};
for (const name of ["area", "facility_type", "topic"]) {
	const r = await req("GET", `/_emdash/api/taxonomies/${name}/terms`);
	const terms = r.body?.data?.terms;
	if (!r.ok || !Array.isArray(terms)) { check(`taxonomy ${name} terms readable`, false, r.status); continue; }
	const found = [];
	syntheticInTree(terms, found);
	check(`taxonomy ${name} zero synthetic terms (complete tree)`, found.length === 0, found);
}

// 5. orphans + deletion queue
const orph = await req("GET", "/_emdash/api/schema/orphans");
check("orphan tables empty", orph.ok && JSON.stringify(orph.body?.data?.items ?? []) === "[]", orph.body?.data ?? orph.status);
for (const state of ["pending", "retry", "leased", "failed"]) {
	const r = await req("GET", `/_emdash/api/admin/media-usage/collection-deletions?state=${state}&limit=100`);
	check(`deletion queue ${state} empty`, r.ok && (listOf(r, "items") ?? []).length === 0, { status: r.status, count: (listOf(r, "items") ?? []).length });
}

// 6. credential file unchanged mode
const stat = statSync(DEV_ACCESS);
check("credential file still mode 0600 regular file", (stat.mode & 0o777) === 0o600 && stat.isFile(), { mode: (stat.mode & 0o777).toString(8), size: stat.size });

writeFileSync(OUT, JSON.stringify(report, null, "\t") + "\n");
console.log(`[T030-postcheck] ${report.checks.length} checks, ${report.problems.length} problems`);
if (report.problems.length) console.error(report.problems.join("\n"));
process.exit(report.problems.length === 0 ? 0 : 1);
