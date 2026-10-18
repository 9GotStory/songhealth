// T018 post-test preservation verification: synthetic-fixture absence,
// full active-schema equality with the accepted seed, and queue/orphan state.
import { readFileSync, writeFileSync, lstatSync } from "node:fs";

const BASE_URL = "http://127.0.0.1:4322";
const DEV_ACCESS = "/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json";
const OUT = new URL("./t018-artifacts/", import.meta.url).pathname;
const st = lstatSync(DEV_ACCESS);
if ((st.mode & 0o777) !== 0o600) throw new Error("credential file mode changed");
const token = JSON.parse(readFileSync(DEV_ACCESS, "utf8")).token;
const seed = JSON.parse(readFileSync(new URL("./songhealth/seed/seed.json", import.meta.url).pathname, "utf8"));

async function req(method, path) {
	const res = await fetch(new URL(path, BASE_URL), { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, redirect: "error" });
	const text = await res.text();
	let body; try { body = text.length ? JSON.parse(text) : undefined; } catch { body = { nonJson: text.slice(0, 300) }; }
	return { status: res.status, ok: res.ok, body };
}
const listOf = (r, key) => r.body?.data?.[key] ?? r.body?.data?.items ?? (Array.isArray(r.body?.data) ? r.body.data : undefined);
const report = { capturedAt: new Date().toISOString(), checks: [], problems: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) report.problems.push(`${name}: ${JSON.stringify(detail).slice(0, 300)}`); };

// 1. collections set + full definition equality (reuse driver projections inline)
const cols = (listOf(await req("GET", "/_emdash/api/schema/collections"), "collections") ?? []).map((c) => c.slug).sort();
check("collection set equals accepted ten", JSON.stringify(cols) === JSON.stringify(seed.collections.map((c) => c.slug).sort()), cols);

const seedColl = new Map(seed.collections.map((c) => [c.slug, c]));
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
	const bySlug = new Map(lf.map((f) => [f.slug, f]));
	for (const sf of c.fields) {
		const f = bySlug.get(sf.slug);
		if (!f) { problems.push(`missing ${sf.slug}`); continue; }
		if (f.type !== sf.type || (f.required === true) !== (sf.required === true) || f.label !== sf.label) problems.push(`${sf.slug} def`);
		if (sf.validation?.relation && (f.validation?.relation !== sf.validation.relation || f.validation?.relationSide !== sf.validation.relationSide)) problems.push(`${sf.slug} binding`);
	}
	check(`${c.slug} definition equals seed`, problems.length === 0, problems);
}

// 2. relations
const rels = listOf(await req("GET", "/_emdash/api/relations"), "relations") ?? [];
const relSlugs = rels.map((r) => r.slug).sort();
check("relation set equals accepted five", JSON.stringify(relSlugs) === JSON.stringify(seed.relations.map((r) => r.slug).sort()), relSlugs);
for (const sr of seed.relations) {
	const live = rels.find((r) => r.slug === sr.slug);
	if (!live) { check(`relation ${sr.slug}`, false, "absent"); continue; }
	const ok = live.parentCollection === sr.parentCollection && live.childCollection === sr.childCollection
		&& (live.maxChildrenPerParent ?? null) === (sr.maxChildrenPerParent ?? null) && (live.maxParentsPerChild ?? null) === (sr.maxParentsPerChild ?? null)
		&& Array.isArray(live.boundFields) && live.boundFields.length === 1 && live.boundFields[0].side === "parent";
	check(`relation ${sr.slug} endpoints/limits/binding`, ok, { maxC: live.maxChildrenPerParent, maxP: live.maxParentsPerChild, bound: live.boundFields });
}

// 3. taxonomies
const taxs = listOf(await req("GET", "/_emdash/api/taxonomies"), "taxonomies") ?? [];
for (const stx of seed.taxonomies) {
	const live = taxs.find((t) => t.name === stx.name);
	if (!live) { check(`taxonomy ${stx.name}`, false, "absent"); continue; }
	const a = [...(live.collections ?? [])].sort();
	const b = [...stx.collections].sort();
	check(`taxonomy ${stx.name} attachments`, JSON.stringify(a) === JSON.stringify(b), { live: a, seed: b });
}

// 4. synthetic fixture absence
for (const slug of cols) {
	const live = await req("GET", `/_emdash/api/content/${slug}?q=songhealth-f002-synthetic&status=all&limit=100`);
	check(`${slug} zero synthetic entries`, live.ok && (listOf(live, "items") ?? []).length === 0, { status: live.status, count: (listOf(live, "items") ?? []).length });
	const trash = await req("GET", `/_emdash/api/content/${slug}/trash?limit=100`);
	check(`${slug} zero trash residue`, trash.ok && (listOf(trash, "items") ?? []).length === 0, { status: trash.status, count: (listOf(trash, "items") ?? []).length });
}
const media = await req("GET", "/_emdash/api/media?q=songhealth-f002-synthetic&limit=100");
check("zero synthetic media", media.ok && (listOf(media, "items") ?? []).length === 0, { status: media.status, count: (listOf(media, "items") ?? []).length });
const mediaAll = await req("GET", "/_emdash/api/media?limit=100");
check("media store empty", mediaAll.ok && (listOf(mediaAll, "items") ?? []).length === 0, { count: (listOf(mediaAll, "items") ?? []).length });
const terms = await req("GET", "/_emdash/api/taxonomies/topic/terms?limit=100");
check("zero synthetic topic terms", terms.ok && (listOf(terms, "terms") ?? listOf(terms, "items") ?? []).length === 0, { status: terms.status, body: terms.status !== 200 ? terms.body?.error?.code : (listOf(terms, "terms") ?? listOf(terms, "items") ?? []).length });

// 5. orphan tables + deletion queue
const orph = await req("GET", "/_emdash/api/schema/orphans");
check("orphan tables empty", orph.ok && (listOf(orph, "items") ?? []).length === 0, orph.body?.data ?? orph.body);
for (const state of ["pending", "retry", "leased", "failed"]) {
	const q = await req("GET", `/_emdash/api/admin/media-usage/collection-deletions?state=${state}&limit=100`);
	check(`deletion queue ${state} empty`, q.ok && (listOf(q, "items") ?? []).length === 0, { status: q.status, count: (listOf(q, "items") ?? []).length });
}

writeFileSync(`${OUT}/post-test-verification.json`, JSON.stringify(report, null, "\t") + "\n");
console.log(`[T018-postcheck] ${report.checks.length} checks, ${report.problems.length} problems`);
for (const c of report.checks.filter((c) => !c.ok)) console.log(`  FAIL ${c.name}: ${JSON.stringify(c.detail).slice(0, 200)}`);
console.log(report.problems.length === 0 ? "[T018-postcheck] ALL CHECKS PASS — schema equals seed, zero fixture/trash/media/term residue, queues empty" : "[T018-postcheck] PROBLEMS FOUND");
process.exit(report.problems.length === 0 ? 0 : 5);
