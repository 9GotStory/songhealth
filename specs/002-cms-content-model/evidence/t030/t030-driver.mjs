// T030 [US4] — native EmDash schema inventory/apply driver for the accepted
// T028/T029 US4 delta, modeled on the accepted T018 driver
// (../t018/t018-driver.mjs). Run with the pinned Node 24.21.0 toolchain
// against the persistent development runtime origin http://127.0.0.1:4322.
//
// Modes:
//   node t030-driver.mjs inventory     — Phase A/B only: read + verify + plan (no writes)
//   node t030-driver.mjs apply         — full run: Phase A/B, then C (writes), then D (after-reads)
//
// Non-destructive discipline (T018 precedent + T030 scope):
//  - every existing object is read and compared to the accepted seed BEFORE any write;
//  - a write is issued only when the object is absent (additive creates, the one
//    attachment assignment retains every visible preimage entry);
//  - exact matches are verify-and-skip (idempotent re-run support);
//  - any mismatch with the accepted seed, any non-empty collection-deletion queue
//    state, or any unexpected visible taxonomy preimage STOPS before writing;
//  - no DELETE/DROP/reset/recovery/retry operation is ever issued here;
//  - the PAT travels only in the Authorization header and never appears in the
//    journal/snapshots (they record method/path/status/request bodies only).
//
// Accepted source of truth: seed/seed.json at the T029 baseline
// c729aa6e702c886ad63c62c75f71712227a4ed4c.
//
// Scope: ONLY the accepted T028/T029 definitions — the `health_services`
// collection (11 data fields + the T029 `offered_services` parent-side
// selector), the single `facility_services` relation (many;many), the
// `facility_type` taxonomy, the `area` attachment addition, and the T029
// `services.offering_facilities` child-side selector appended to the EXISTING
// services collection. `personnel` (T024/T026 scope) is NEVER applied here;
// its live presence/absence is recorded truthfully and, when present, verified
// against the seed as a preservation input.

import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4322";
const DEV_ACCESS = process.env.SONGHEALTH_DEV_ACCESS
	?? "/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json";
const SEED_PATH = process.env.T030_SEED ?? new URL("../../../../seed/seed.json", import.meta.url).pathname;
const OUT_DIR = process.env.T030_OUT ?? new URL("./", import.meta.url).pathname;
const MODE = process.argv[2] ?? "inventory";

const fail = (msg) => {
	console.error(`\n[T030-STOP] ${msg}`);
	process.exit(2);
};

// --- credential load (same fail-closed discipline as cms.helpers.ts / T018) ---
const st = lstatSync(DEV_ACCESS);
if (!st.isFile() || st.isSymbolicLink()) fail(`${DEV_ACCESS} is not a regular non-symlink file`);
if ((st.mode & 0o777) !== 0o600) fail(`${DEV_ACCESS} must be mode 0600`);
const token = JSON.parse(readFileSync(DEV_ACCESS, "utf8")).token;
if (typeof token !== "string" || token.length === 0) fail("dev-access.json carries no token");

// --- journal ---
mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString();
const journalPath = `${OUT_DIR}/apply-journal.jsonl`;
const journal = [];
let journalWrites = 0;
let journalGets = 0;
const logLine = (entry) => {
	journal.push(entry);
	writeFileSync(journalPath, journal.map((e) => JSON.stringify(e)).join("\n") + "\n");
};

async function req(method, path, body, tag) {
	const url = new URL(path, BASE_URL);
	const headers = { Authorization: `Bearer ${token}` };
	let payload;
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
		payload = JSON.stringify(body);
	}
	const t0 = Date.now();
	let res, text;
	try {
		res = await fetch(url, { method, headers, body: payload, redirect: "error" });
		text = await res.text();
	} catch (cause) {
		logLine({ ts: new Date().toISOString(), phase: tag, method, path, transportError: String(cause).slice(0, 300) });
		fail(`transport failure on ${method} ${path}: ${String(cause).slice(0, 300)}`);
	}
	let parsed;
	try {
		parsed = text.length > 0 ? JSON.parse(text) : undefined;
	} catch {
		parsed = { nonJsonBody: text.slice(0, 500) };
	}
	const isWrite = method !== "GET";
	if (isWrite) journalWrites += 1; else journalGets += 1;
	logLine({
		ts: new Date().toISOString(),
		phase: tag,
		method,
		path,
		status: res.status,
		ms: Date.now() - t0,
		...(body !== undefined ? { requestBody: body } : {}),
		...(parsed?.error !== undefined ? { errorCode: parsed.error.code } : {}),
	});
	return { status: res.status, ok: res.ok, body: parsed };
}

const dataOf = (r) => r.body?.data ?? undefined;
const listOf = (r, key) => r.body?.data?.[key] ?? r.body?.data?.items ?? (Array.isArray(r.body?.data) ? r.body.data : undefined);

// --- accepted seed (T029 baseline) ---
const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
const seedCollections = new Map(seed.collections.map((c) => [c.slug, c]));
const seedRelations = new Map(seed.relations.map((r) => [r.slug, r]));
const seedTaxonomies = new Map(seed.taxonomies.map((t) => [t.name, t]));

const ALL_SEED_COLLECTIONS = seed.collections.map((c) => c.slug);
const PRESERVE_COLLECTIONS = ["documents", "pages", "news", "activities", "announcements", "health_content", "services", "health_reports"];
const T028_COLLECTION = "health_services";
const T029_RELATION = "facility_services";
const T029_PARENT_FIELD = { collection: "health_services", slug: "offered_services" };
const T029_CHILD_FIELD = { collection: "services", slug: "offering_facilities" };
const T028_TAXONOMY = "facility_type";
// T018's journaled final attachment lists (evidence T018-us2-reuse.md §5) — the
// accepted preimage the visible reads below must reproduce before the one
// whole-list area attachment PUT may run. T028/T029 change only `area`.
const T018_FINAL_ATTACHMENTS = {
	topic: ["documents", "news", "activities", "announcements", "health_content", "services", "health_reports"],
	audience: ["news", "announcements", "health_content", "services"],
	area: ["news", "activities", "health_reports"],
};

// --- comparison helpers (accepted-definition projection only) ---
// Projection: only the keys the ACCEPTED SEED declares. Native reads enrich
// reference-field validation with resolved metadata (e.g. targetCollection);
// those native additions are recorded in the snapshots but are not definition
// drift. Unlike the T018 projection, this one includes numeric min/max (the
// T028 coordinate ranges).
function fieldProjection(f, seedField) {
	const p = { slug: f.slug, label: f.label, type: f.type, required: f.required === true };
	if (f.validation && typeof f.validation === "object") {
		const seedValidation = seedField?.validation ?? {};
		const v = {};
		for (const key of ["options", "relation", "relationSide", "multiple", "min", "max"]) {
			if (seedValidation[key] !== undefined) v[key] = f.validation[key];
		}
		if (seedValidation.subFields !== undefined) {
			v.subFields = f.validation.subFields.map((s) => ({
				slug: s.slug, label: s.label, type: s.type, required: s.required === true,
			}));
		}
		if (Object.keys(v).length > 0) p.validation = v;
	}
	return p;
}
function collectionProblems(live, seedDef, { expectMissingFields = [] } = {}) {
	const problems = [];
	if (live.label !== seedDef.label) problems.push(`label ${JSON.stringify(live.label)} ≠ ${JSON.stringify(seedDef.label)}`);
	if ((live.labelSingular ?? null) !== (seedDef.labelSingular ?? null)) problems.push(`labelSingular mismatch`);
	const sup = live.supports ?? [];
	for (const s of seedDef.supports ?? []) if (!sup.includes(s)) problems.push(`supports missing ${s}`);
	if ((live.titleField ?? null) !== (seedDef.titleField ?? null)) problems.push(`titleField ${live.titleField} ≠ ${seedDef.titleField}`);
	if ((live.dateField ?? null) !== (seedDef.dateField ?? null)) problems.push(`dateField ${live.dateField} ≠ ${seedDef.dateField}`);
	const expectedFields = seedDef.fields.filter((f) => !expectMissingFields.includes(f.slug));
	const liveFields = (live.fields ?? []).filter((f) => f && f.slug);
	if (liveFields.length !== expectedFields.length) problems.push(`field count ${liveFields.length} ≠ ${expectedFields.length}`);
	const bySlug = new Map(liveFields.map((f) => [f.slug, f]));
	for (const sf of expectedFields) {
		const lf = bySlug.get(sf.slug);
		if (!lf) { problems.push(`field ${sf.slug} missing`); continue; }
		const a = JSON.stringify(fieldProjection(lf, sf));
		const b = JSON.stringify(fieldProjection(sf, sf));
		if (a !== b) problems.push(`field ${sf.slug}: live ${a} ≠ seed ${b}`);
	}
	const order = liveFields.map((f) => f.slug).filter((s) => expectedFields.some((f) => f.slug === s));
	const seedOrder = expectedFields.map((f) => f.slug);
	if (JSON.stringify(order) !== JSON.stringify(seedOrder)) problems.push(`field order ${JSON.stringify(order)} ≠ seed ${JSON.stringify(seedOrder)}`);
	return problems;
}
function relationProblems(live, seedDef) {
	const problems = [];
	if (live.parentCollection !== seedDef.parentCollection) problems.push("parentCollection mismatch");
	if (live.childCollection !== seedDef.childCollection) problems.push("childCollection mismatch");
	for (const k of ["parentLabel", "parentLabelSingular", "childLabel", "childLabelSingular"]) {
		if ((live[k] ?? null) !== (seedDef[k] ?? null)) problems.push(`${k} mismatch`);
	}
	if ((live.maxChildrenPerParent ?? null) !== (seedDef.maxChildrenPerParent ?? null)) problems.push(`maxChildrenPerParent ${live.maxChildrenPerParent} ≠ ${seedDef.maxChildrenPerParent}`);
	if ((live.maxParentsPerChild ?? null) !== (seedDef.maxParentsPerChild ?? null)) problems.push(`maxParentsPerChild ${live.maxParentsPerChild} ≠ ${seedDef.maxParentsPerChild}`);
	return problems;
}
const sameSet = (a, b) => (a ?? []).length === (b ?? []).length && (a ?? []).every((x) => (b ?? []).includes(x));

// =====================================================================
// PHASE A — before-inventory
// =====================================================================
console.log(`[T030] mode=${MODE} origin=${BASE_URL} seed=${SEED_PATH} out=${OUT_DIR}`);
console.log(`[T030] driver start ${stamp}`);

const me = await req("GET", "/_emdash/api/auth/me", undefined, "A:identity");
if (!me.ok) fail(`auth/me refused: ${me.status}`);
console.log(`[T030] actor: ${dataOf(me).email} role ${dataOf(me).role} id ${dataOf(me).id}`);
if (dataOf(me).role !== 50) fail(`expected role 50 (Administrator), got ${dataOf(me).role}`);

const before = { capturedAt: stamp, origin: BASE_URL, actor: { id: dataOf(me).id, email: dataOf(me).email, role: dataOf(me).role } };

const colList = await req("GET", "/_emdash/api/schema/collections", undefined, "A:collections");
if (!colList.ok) fail(`collection list refused: ${colList.status}`);
const liveCollectionSlugs = (listOf(colList, "collections") ?? []).map((c) => c.slug).sort();
before.collectionSlugs = liveCollectionSlugs;
console.log(`[T030] live collections: ${JSON.stringify(liveCollectionSlugs)}`);

before.collections = {};
for (const slug of ALL_SEED_COLLECTIONS) {
	const r = await req("GET", `/_emdash/api/schema/collections/${slug}?includeFields=true`, undefined, "A:collection-read");
	before.collections[slug] = r.status === 404 ? null : r.body?.data?.item ?? r.body;
}

const relList = await req("GET", "/_emdash/api/relations", undefined, "A:relations");
if (!relList.ok) fail(`relations list refused: ${relList.status}`);
const liveRelations = listOf(relList, "relations") ?? [];
before.relations = liveRelations;
console.log(`[T030] live relations: ${JSON.stringify(liveRelations.map((r) => `${r.slug}(${r.linkCount ?? "?"} links)`))}`);

const taxList = await req("GET", "/_emdash/api/taxonomies", undefined, "A:taxonomies");
if (!taxList.ok) fail(`taxonomies list refused: ${taxList.status}`);
const liveTaxonomies = listOf(taxList, "taxonomies") ?? [];
before.taxonomies = liveTaxonomies;
console.log(`[T030] live taxonomies: ${JSON.stringify(liveTaxonomies.map((t) => `${t.name}${t.hierarchical ? "(h)" : ""}${JSON.stringify(t.collections)}`))}`);

const orph = await req("GET", "/_emdash/api/schema/orphans", undefined, "A:orphans");
before.orphans = orph.body?.data ?? orph.body;
console.log(`[T030] orphan tables: ${JSON.stringify(before.orphans)}`);

// collection-deletion queue — the actual platform deletion job queue (NOT orphans)
before.collectionDeletionQueue = {};
for (const state of ["pending", "retry", "leased", "failed"]) {
	const r = await req("GET", `/_emdash/api/admin/media-usage/collection-deletions?state=${state}&limit=100`, undefined, "A:deletion-queue");
	before.collectionDeletionQueue[state] = { status: r.status, ok: r.ok, items: listOf(r, "items") ?? r.body?.error?.code ?? null };
}
const queueNonEmpty = Object.entries(before.collectionDeletionQueue)
	.filter(([, v]) => Array.isArray(v.items) && v.items.length > 0)
	.map(([k]) => k);
console.log(`[T030] deletion queue non-empty states: ${JSON.stringify(queueNonEmpty)} ${queueNonEmpty.length ? "<-- STOP CONDITION" : "(all empty or refused)"}`);

// media-usage support read (bounded): the supported native inventory route used
// to establish media-usage side effects of schema maintenance
const mediaUsage = await req("GET", "/_emdash/api/admin/media-usage?limit=1", undefined, "A:media-usage-probe");
before.mediaUsageProbe = { status: mediaUsage.status, ok: mediaUsage.ok };

// content + media inventory (existing data before any write)
before.contentCounts = {};
for (const slug of liveCollectionSlugs) {
	const live = await req("GET", `/_emdash/api/content/${slug}?status=all&limit=100`, undefined, "A:content-count");
	const trash = await req("GET", `/_emdash/api/content/${slug}/trash?limit=100`, undefined, "A:trash-count");
	before.contentCounts[slug] = {
		liveStatus: live.status,
		liveCount: listOf(live, "items")?.length ?? null,
		liveNextCursor: dataOf(live)?.nextCursor ?? null,
		trashStatus: trash.status,
		trashCount: listOf(trash, "items")?.length ?? null,
	};
}
const media = await req("GET", "/_emdash/api/media?limit=100", undefined, "A:media-count");
before.media = { status: media.status, count: listOf(media, "items")?.length ?? null, nextCursor: dataOf(media)?.nextCursor ?? null };
console.log(`[T030] content counts: ${JSON.stringify(before.contentCounts)}`);
console.log(`[T030] media count: ${before.media.count} (status ${before.media.status})`);

// =====================================================================
// PHASE B — verify pre-existing state; establish exact US4 delta
// =====================================================================
const stopProblems = [];

// B1 — every pre-existing seed-defined collection must match the accepted seed.
// services is expected to lack EXACTLY the T029 child-side selector before
// apply; anything else mismatched is a stop condition. personnel is T026 scope:
// recorded present/absent truthfully, verified against the seed when present,
// but never applied or failed-on for absence.
for (const slug of PRESERVE_COLLECTIONS) {
	const live = before.collections[slug];
	if (live === null || live === undefined) { stopProblems.push(`pre-existing collection ${slug} absent from live schema — expected applied at the accepted joins`); continue; }
	const expectMissing = slug === "services" ? [T029_CHILD_FIELD.slug] : [];
	const p = collectionProblems(live, seedCollections.get(slug), { expectMissingFields: expectMissing });
	if (p.length) stopProblems.push(`${slug}: ${p.join("; ")}`);
}
const personnelLive = before.collections["personnel"];
before.personnelStanding = personnelLive == null
	? "absent (T024/T026 scope — NOT applied by T030)"
	: "present (verified below; T026 scope untouched)";
if (personnelLive != null) {
	const p = collectionProblems(personnelLive, seedCollections.get("personnel"));
	if (p.length) stopProblems.push(`personnel (preservation input): ${p.join("; ")}`);
}

// B2 — pre-existing relations unchanged
for (const rslug of seed.relations.map((r) => r.slug)) {
	if (rslug === T029_RELATION) continue;
	const live = liveRelations.find((r) => r.slug === rslug);
	if (!live) { stopProblems.push(`pre-existing relation ${rslug} absent`); continue; }
	const p = relationProblems(live, seedRelations.get(rslug));
	if (p.length) stopProblems.push(`relation ${rslug}: ${p.join("; ")}`);
}
// No unexpected relation may connect health_services and services in EITHER orientation
const connecting = liveRelations.filter(
	(r) =>
		(r.parentCollection === "health_services" && r.childCollection === "services") ||
		(r.parentCollection === "services" && r.childCollection === "health_services"),
);
if (connecting.length > 1) {
	stopProblems.push(`multiple relations connect health_services and services: ${connecting.map((r) => r.slug).join(", ")} — duplicated backlink edge set`);
}

// B3 — taxonomies: definitions unchanged; shared attachments equal T018's journaled final state
for (const t of liveTaxonomies) {
	const def = seedTaxonomies.get(t.name);
	if (!def) continue; // platform built-ins (category/tag) — untouched
	if (t.label !== def.label || (t.hierarchical === true) !== (def.hierarchical === true)) {
		stopProblems.push(`taxonomy ${t.name} definition mismatch (label/hierarchical)`);
	}
}
for (const [name, expected] of Object.entries(T018_FINAL_ATTACHMENTS)) {
	const live = liveTaxonomies.find((t) => t.name === name);
	if (!live) { stopProblems.push(`taxonomy ${name} absent`); continue; }
	if (!sameSet(live.collections, expected)) {
		stopProblems.push(`taxonomy ${name} visible attachments ${JSON.stringify(live.collections)} ≠ T018 accepted final ${JSON.stringify(expected)} — unknown mutation, refusing whole-list update`);
	}
}

// B4 — US4 objects: record present/absent; present must match exactly (verify-and-skip)
const us4Present = {
	[T028_COLLECTION]: before.collections[T028_COLLECTION] != null,
	[T029_RELATION]: liveRelations.some((r) => r.slug === T029_RELATION),
	[T028_TAXONOMY]: liveTaxonomies.some((t) => t.name === T028_TAXONOMY),
	[`${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug}`]:
		before.collections[T029_PARENT_FIELD.collection]?.fields?.some((f) => f.slug === T029_PARENT_FIELD.slug) ?? false,
	[`${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug}`]:
		before.collections[T029_CHILD_FIELD.collection]?.fields?.some((f) => f.slug === T029_CHILD_FIELD.slug) ?? false,
};
if (us4Present[T028_COLLECTION]) {
	const p = collectionProblems(before.collections[T028_COLLECTION], seedCollections.get(T028_COLLECTION));
	if (p.length) stopProblems.push(`${T028_COLLECTION} already present but mismatched: ${p.join("; ")}`);
}
if (us4Present[T029_RELATION]) {
	const p = relationProblems(liveRelations.find((r) => r.slug === T029_RELATION), seedRelations.get(T029_RELATION));
	if (p.length) stopProblems.push(`relation ${T029_RELATION} already present but mismatched: ${p.join("; ")}`);
}
if (us4Present[T028_TAXONOMY]) {
	const live = liveTaxonomies.find((t) => t.name === T028_TAXONOMY);
	const def = seedTaxonomies.get(T028_TAXONOMY);
	if (!sameSet(live.collections, def.collections)) stopProblems.push(`taxonomy ${T028_TAXONOMY} present with attachments ${JSON.stringify(live.collections)} ≠ seed ${JSON.stringify(def.collections)}`);
}
console.log(`[T030] US4 objects already present: ${JSON.stringify(us4Present)}`);
console.log(`[T030] personnel standing: ${before.personnelStanding}`);

if (queueNonEmpty.length > 0) {
	stopProblems.push(`collection-deletion queue non-empty for states ${JSON.stringify(queueNonEmpty)} — refusing collection creation (finishPendingDeletion side effect)`);
}
if (stopProblems.length > 0) {
	writeFileSync(`${OUT_DIR}/before-state.json`, JSON.stringify(before, null, "\t") + "\n");
	console.error(`[T030-STOP] before-state verification failed:\n  - ${stopProblems.join("\n  - ")}`);
	logLine({ ts: new Date().toISOString(), phase: "B:verify", stopped: true, problems: stopProblems });
	process.exit(3);
}
console.log(`[T030] PHASE B OK — pre-existing definitions equal the accepted seed (services missing exactly the T029 selector); area preimage matches T018 final state; deletion queue empty`);

// planned writes
const planned = [];
if (!us4Present[T028_COLLECTION]) planned.push(`POST /schema/collections ${T028_COLLECTION}`);
{
	const def = seedCollections.get(T028_COLLECTION);
	const ordinary = def.fields.filter((f) => f.type !== "reference");
	if (!us4Present[T028_COLLECTION]) planned.push(`POST ${ordinary.length} ordinary fields → ${T028_COLLECTION}`);
}
if (!us4Present[T029_RELATION]) planned.push(`POST /relations ${T029_RELATION}`);
if (!us4Present[`${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug}`]) planned.push(`POST bound reference field ${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug} (parent side)`);
if (!us4Present[`${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug}`]) planned.push(`POST bound reference field ${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug} (child side, appended to existing services)`);
if (!us4Present[T028_COLLECTION]) planned.push(`PUT /schema/collections/${T028_COLLECTION} titleField`);
if (!us4Present[T028_TAXONOMY]) planned.push(`POST /taxonomies ${T028_TAXONOMY} (attached: ${JSON.stringify(seedTaxonomies.get(T028_TAXONOMY).collections)})`);
{
	const target = seedTaxonomies.get("area").collections;
	const current = liveTaxonomies.find((t) => t.name === "area")?.collections ?? [];
	if (!sameSet(current, target)) planned.push(`PUT /taxonomies/area attachments ${JSON.stringify(current)} → ${JSON.stringify(target)} (retains every visible entry)`);
}
console.log(`[T030] planned writes (${planned.length} steps):\n  - ${planned.join("\n  - ")}`);
writeFileSync(`${OUT_DIR}/before-state.json`, JSON.stringify(before, null, "\t") + "\n");
if (MODE !== "apply") {
	console.log(`[T030] inventory mode complete — no writes issued (journal: ${journalGets} GETs, ${journalWrites} writes)`);
	logLine({ ts: new Date().toISOString(), phase: "B:plan", planned });
	process.exit(0);
}

// =====================================================================
// PHASE C — apply the accepted US4 delta (additive only)
// =====================================================================
const created = { collections: [], fields: [], relations: [], referenceFields: [], metadataPuts: [], taxonomyCreates: [], attachmentPuts: [] };
const expect = (r, what, status = 201) => {
	if (!r.ok) fail(`${what} refused: ${r.status} ${r.body?.error?.code ?? ""} ${JSON.stringify(r.body?.error?.details ?? "").slice(0, 300)}`);
	return r;
};

// C1 — collection first
if (!us4Present[T028_COLLECTION]) {
	const def = seedCollections.get(T028_COLLECTION);
	expect(
		await req("POST", "/_emdash/api/schema/collections", {
			slug: def.slug, label: def.label, labelSingular: def.labelSingular, supports: def.supports,
		}, "C1:collection-create"),
		`create collection ${T028_COLLECTION}`,
	);
	created.collections.push(T028_COLLECTION);
} else {
	console.log(`[T030] C1 skip ${T028_COLLECTION} (already present, verified)`);
}

// C2 — ordinary fields (seed order, explicit sortOrder; the T029 reference
// selector is deferred to C4 so the relation exists before binding)
if (!us4Present[T028_COLLECTION]) {
	const def = seedCollections.get(T028_COLLECTION);
	let order = 0;
	for (const f of def.fields) {
		if (f.type === "reference") continue;
		const body = { slug: f.slug, label: f.label, type: f.type, sortOrder: order };
		if (f.required === true) body.required = true;
		if (f.validation) body.validation = f.validation;
		expect(
			await req("POST", `/_emdash/api/schema/collections/${T028_COLLECTION}/fields`, body, "C2:field-create"),
			`create field ${T028_COLLECTION}.${f.slug}`,
		);
		created.fields.push(`${T028_COLLECTION}.${f.slug}`);
		order += 1;
	}
}

// C3 — the named relation BEFORE binding either selector
if (!us4Present[T029_RELATION]) {
	const def = seedRelations.get(T029_RELATION);
	expect(
		await req("POST", "/_emdash/api/relations", {
			slug: def.slug, parentCollection: def.parentCollection, childCollection: def.childCollection,
			parentLabel: def.parentLabel, parentLabelSingular: def.parentLabelSingular,
			childLabel: def.childLabel, childLabelSingular: def.childLabelSingular,
			maxChildrenPerParent: def.maxChildrenPerParent, maxParentsPerChild: def.maxParentsPerChild,
		}, "C3:relation-create"),
		`create relation ${T029_RELATION}`,
	);
	created.relations.push(T029_RELATION);
} else {
	console.log(`[T030] C3 skip ${T029_RELATION} (already present, verified)`);
}

// C4 — bound reference selectors (parent side on health_services; child side
// appended to the EXISTING services collection at its seed order position)
{
	const parentSeed = seedCollections.get(T029_PARENT_FIELD.collection).fields.find((f) => f.slug === T029_PARENT_FIELD.slug);
	if (!us4Present[`${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug}`]) {
		const def = seedCollections.get(T029_PARENT_FIELD.collection);
		expect(
			await req("POST", `/_emdash/api/schema/collections/${T029_PARENT_FIELD.collection}/fields`, {
				slug: parentSeed.slug, label: parentSeed.label, type: "reference",
				validation: { relation: parentSeed.validation.relation, relationSide: parentSeed.validation.relationSide },
				sortOrder: def.fields.findIndex((f) => f.slug === parentSeed.slug),
			}, "C4:reference-field-create"),
			`create bound reference field ${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug}`,
		);
		created.referenceFields.push(`${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug}`);
	} else {
		console.log(`[T030] C4 skip ${T029_PARENT_FIELD.collection}.${T029_PARENT_FIELD.slug} (already present, verified)`);
	}
	const childSeed = seedCollections.get(T029_CHILD_FIELD.collection).fields.find((f) => f.slug === T029_CHILD_FIELD.slug);
	if (!us4Present[`${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug}`]) {
		const def = seedCollections.get(T029_CHILD_FIELD.collection);
		expect(
			await req("POST", `/_emdash/api/schema/collections/${T029_CHILD_FIELD.collection}/fields`, {
				slug: childSeed.slug, label: childSeed.label, type: "reference",
				validation: { relation: childSeed.validation.relation, relationSide: childSeed.validation.relationSide },
				sortOrder: def.fields.findIndex((f) => f.slug === childSeed.slug),
			}, "C4:reference-field-create"),
			`create bound reference field ${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug}`,
		);
		created.referenceFields.push(`${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug}`);
	} else {
		console.log(`[T030] C4 skip ${T029_CHILD_FIELD.collection}.${T029_CHILD_FIELD.slug} (already present, verified)`);
	}
}

// C5 — collection metadata (titleField; health_services has no dateField)
if (!us4Present[T028_COLLECTION]) {
	const def = seedCollections.get(T028_COLLECTION);
	const body = { titleField: def.titleField };
	if (def.dateField != null) body.dateField = def.dateField;
	expect(
		await req("PUT", `/_emdash/api/schema/collections/${T028_COLLECTION}`, body, "C5:collection-meta"),
		`set ${T028_COLLECTION} titleField`,
		200,
	);
	created.metadataPuts.push(T028_COLLECTION);
}

// C6 — the facility_type taxonomy with its accepted attachment
if (!us4Present[T028_TAXONOMY]) {
	const def = seedTaxonomies.get(T028_TAXONOMY);
	expect(
		await req("POST", "/_emdash/api/taxonomies", {
			name: def.name, label: def.label, labelSingular: def.labelSingular,
			hierarchical: def.hierarchical === true, collections: def.collections,
		}, "C6:taxonomy-create"),
		`create taxonomy ${T028_TAXONOMY}`,
	);
	created.taxonomyCreates.push(T028_TAXONOMY);
} else {
	console.log(`[T030] C6 skip ${T028_TAXONOMY} (already present, verified)`);
}

// C7 — the one shared attachment update (whole-list PUT; every visible entry
// retained). Precondition re-verified live immediately before the PUT, after
// C1–C6 (collection creation can only ever UNHIDE additional attachments).
{
	const name = "area";
	const reRead = await req("GET", "/_emdash/api/taxonomies", undefined, "C7:taxonomy-reread");
	const now = (listOf(reRead, "taxonomies") ?? []).find((t) => t.name === name);
	if (!now) fail(`taxonomy ${name} disappeared before attachment update`);
	const t018 = T018_FINAL_ATTACHMENTS[name];
	const unhid = (now.collections ?? []).filter((c) => !t018.includes(c));
	if (unhid.length > 0) {
		fail(`taxonomy ${name} newly visible attachments ${JSON.stringify(unhid)} after collection creation — preimage differs from the accepted state; refusing whole-list update`);
	}
	if (!sameSet(now.collections, t018)) {
		fail(`taxonomy ${name} visible attachments changed to ${JSON.stringify(now.collections)} — refusing whole-list update`);
	}
	const target = seedTaxonomies.get(name).collections;
	const dropped = (now.collections ?? []).filter((c) => !target.includes(c));
	if (dropped.length > 0) fail(`attachment update would DROP visible ${name} attachments ${JSON.stringify(dropped)} — accepted seed does not include them; stopping`);
	if (sameSet(now.collections, target)) { console.log(`[T030] C7 skip ${name} (already at accepted list)`); }
	else {
		expect(
			await req("PUT", `/_emdash/api/taxonomies/${name}`, { collections: target }, "C7:taxonomy-attach"),
			`update ${name} attachments to the accepted list`,
			200,
		);
		created.attachmentPuts.push(name);
	}
	// topic/audience must already sit at the accepted seed lists (verified in
	// B3 against T018-final == seed); no PUT is issued for them.
	for (const other of ["topic", "audience"]) {
		const live = (listOf(reRead, "taxonomies") ?? []).find((t) => t.name === other);
		if (!sameSet(live?.collections, seedTaxonomies.get(other).collections)) {
			fail(`taxonomy ${other} drifted to ${JSON.stringify(live?.collections)} — expected the accepted seed list ${JSON.stringify(seedTaxonomies.get(other).collections)}; no write authorized for it`);
		}
	}
}

console.log(`[T030] PHASE C complete: ${JSON.stringify(created)}`);

// =====================================================================
// PHASE D — after-inventory + full comparison against the accepted seed
// =====================================================================
const after = { capturedAt: new Date().toISOString(), origin: BASE_URL };
const colList2 = await req("GET", "/_emdash/api/schema/collections", undefined, "D:collections");
after.collectionSlugs = (listOf(colList2, "collections") ?? []).map((c) => c.slug).sort();
after.collections = {};
for (const slug of ALL_SEED_COLLECTIONS) {
	const r = await req("GET", `/_emdash/api/schema/collections/${slug}?includeFields=true`, undefined, "D:collection-read");
	after.collections[slug] = r.status === 404 ? null : r.body?.data?.item ?? r.body;
}
const relList2 = await req("GET", "/_emdash/api/relations", undefined, "D:relations");
after.relations = listOf(relList2, "relations") ?? [];
const taxList2 = await req("GET", "/_emdash/api/taxonomies", undefined, "D:taxonomies");
after.taxonomies = listOf(taxList2, "taxonomies") ?? [];
const orph2 = await req("GET", "/_emdash/api/schema/orphans", undefined, "D:orphans");
after.orphans = orph2.body?.data ?? orph2.body;
after.collectionDeletionQueue = {};
for (const state of ["pending", "retry", "leased", "failed"]) {
	const r = await req("GET", `/_emdash/api/admin/media-usage/collection-deletions?state=${state}&limit=100`, undefined, "D:deletion-queue");
	after.collectionDeletionQueue[state] = { status: r.status, ok: r.ok, items: listOf(r, "items") ?? r.body?.error?.code ?? null };
}
after.contentCounts = {};
for (const slug of after.collectionSlugs) {
	const live = await req("GET", `/_emdash/api/content/${slug}?status=all&limit=100`, undefined, "D:content-count");
	const trash = await req("GET", `/_emdash/api/content/${slug}/trash?limit=100`, undefined, "D:trash-count");
	after.contentCounts[slug] = {
		liveStatus: live.status, liveCount: listOf(live, "items")?.length ?? null, liveNextCursor: dataOf(live)?.nextCursor ?? null,
		trashStatus: trash.status, trashCount: listOf(trash, "items")?.length ?? null,
	};
}
const media2 = await req("GET", "/_emdash/api/media?limit=100", undefined, "D:media-count");
after.media = { status: media2.status, count: listOf(media2, "items")?.length ?? null, nextCursor: dataOf(media2)?.nextCursor ?? null };

// final comparison: every seed collection PRESENT LIVE must match exactly;
// the US4 objects must now be present and exact; personnel absence (T026
// scope) is recorded truthfully, not failed.
const finalProblems = [];
const expectedLive = new Set(liveCollectionSlugs);
expectedLive.add(T028_COLLECTION);
for (const c of seed.collections) {
	const live = after.collections[c.slug];
	if (!live) {
		if (c.slug === "personnel") { after.personnelStanding = "absent (T024/T026 scope — not applied by T030; recorded truthfully)"; continue; }
		finalProblems.push(`${c.slug} missing after apply`);
		continue;
	}
	const p = collectionProblems(live, c);
	if (p.length) finalProblems.push(`${c.slug}: ${p.join("; ")}`);
}
for (const r of seed.relations) {
	const live = after.relations.find((x) => x.slug === r.slug);
	if (!live) { finalProblems.push(`relation ${r.slug} missing after apply`); continue; }
	const p = relationProblems(live, r);
	if (p.length) finalProblems.push(`relation ${r.slug}: ${p.join("; ")}`);
}
const connectingAfter = after.relations.filter(
	(r) =>
		(r.parentCollection === "health_services" && r.childCollection === "services") ||
		(r.parentCollection === "services" && r.childCollection === "health_services"),
);
if (connectingAfter.length !== 1 || connectingAfter[0].slug !== T029_RELATION) {
	finalProblems.push(`expected exactly one ${T029_RELATION} relation connecting the two collections; found ${JSON.stringify(connectingAfter.map((r) => r.slug))}`);
}
for (const t of seed.taxonomies) {
	const live = after.taxonomies.find((x) => x.name === t.name);
	if (!live) { finalProblems.push(`taxonomy ${t.name} missing after apply`); continue; }
	if (live.label !== t.label || (live.hierarchical === true) !== (t.hierarchical === true)) finalProblems.push(`taxonomy ${t.name} definition mismatch`);
	if (!sameSet(live.collections, t.collections)) finalProblems.push(`taxonomy ${t.name} attachments ${JSON.stringify(live.collections)} ≠ ${JSON.stringify(t.collections)}`);
}
// pre-existing content/media preservation: counts must be unchanged by the apply
for (const slug of Object.keys(before.contentCounts)) {
	const b = before.contentCounts[slug];
	const a = after.contentCounts[slug];
	if (a && (a.liveCount !== b.liveCount || a.trashCount !== b.trashCount)) {
		finalProblems.push(`content count drift for ${slug}: before live=${b.liveCount} trash=${b.trashCount}, after live=${a.liveCount} trash=${a.trashCount}`);
	}
}
if (after.media.count !== before.media.count) {
	finalProblems.push(`media count drift: before ${before.media.count}, after ${after.media.count}`);
}
writeFileSync(`${OUT_DIR}/after-state.json`, JSON.stringify(after, null, "\t") + "\n");
logLine({ ts: new Date().toISOString(), phase: "D:verify", problems: finalProblems, journalWrites, journalGets });
console.log(`[T030] after-state captured. Final verification: ${finalProblems.length === 0 ? "ACTIVE SCHEMA EQUALS THE ACCEPTED SEED FOR EVERY LIVE COLLECTION" : "PROBLEMS"}`);
if (finalProblems.length) console.error(`[T030]\n  - ${finalProblems.join("\n  - ")}`);
console.log(`[T030] journal: ${journalWrites} writes + ${journalGets} GETs → ${journalPath}`);
process.exit(finalProblems.length === 0 ? 0 : 4);
