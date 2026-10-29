// T018 [US2] — native EmDash schema inventory/apply driver.
// Run with the pinned Node 24.21.0 toolchain against the persistent
// development runtime origin http://127.0.0.1:4322.
//
// Modes:
//   node t018-driver.mjs inventory     — Phase A/B only: read + verify + plan (no writes)
//   node t018-driver.mjs apply         — full run: Phase A/B, then C (writes), then D (after-reads)
//
// Non-destructive discipline:
//  - every existing object is read and compared to the accepted seed BEFORE any write;
//  - a write is issued only when the object is absent (additive creates, metadata/
//    attachment assignments that retain every visible preimage entry);
//  - any mismatch with the accepted seed, any non-empty collection-deletion queue
//    state, or any unexpected visible taxonomy preimage STOPS before writing;
//  - no DELETE/DROP/reset/recovery/retry operation is ever issued here;
//  - the PAT travels only in the Authorization header and never appears in the
//    journal/snapshots (they record method/path/status/body summaries only).
//
// Accepted source of truth: seed/seed.json at the task baseline.

import { readFileSync, writeFileSync, mkdirSync, statSync, lstatSync } from "node:fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4322";
const DEV_ACCESS = process.env.SONGHEALTH_DEV_ACCESS
	?? "/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json";
const SEED_PATH = process.env.T018_SEED ?? new URL("./songhealth/seed/seed.json", import.meta.url).pathname;
const OUT_DIR = process.env.T018_OUT ?? new URL("./t018-artifacts/", import.meta.url).pathname;
const MODE = process.argv[2] ?? "inventory";

const fail = (msg) => {
	console.error(`\n[T018-STOP] ${msg}`);
	process.exit(2);
};

// --- credential load (same fail-closed discipline as cms.helpers.ts) ---
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
const itemOf = (r) => r.body?.data?.item ?? undefined;
const listOf = (r, key) => r.body?.data?.[key] ?? r.body?.data?.items ?? (Array.isArray(r.body?.data) ? r.body.data : undefined);

// --- accepted seed ---
const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
const seedCollections = new Map(seed.collections.map((c) => [c.slug, c]));
const seedRelations = new Map(seed.relations.map((r) => [r.slug, r]));
const seedTaxonomies = new Map(seed.taxonomies.map((t) => [t.name, t]));

const US1_COLLECTIONS = ["documents", "pages", "news", "activities", "announcements", "health_content"];
const US2_COLLECTIONS = ["services", "health_reports"];
const US2_RELATIONS = ["service_documents", "report_document"];
const US2_TAXONOMIES = ["service_category", "report_type"];
// T013's journaled final attachment lists (evidence T013-us1-authoring.md §4.6)
// — the accepted preimage the visible reads below must reproduce before any
// whole-list attachment PUT may run.
const T013_FINAL_ATTACHMENTS = {
	topic: ["documents", "news", "activities", "announcements", "health_content"],
	audience: ["news", "announcements", "health_content"],
	area: ["news", "activities"],
};

// --- comparison helpers (accepted-definition projection only) ---
// Projection for comparison: only the keys the ACCEPTED SEED declares. Native
// reads enrich reference-field validation with resolved metadata (e.g.
// targetCollection) the seed does not declare; those native additions are
// recorded in the snapshots but do not constitute a definition mismatch.
function fieldProjection(f, seedField) {
	const p = { slug: f.slug, label: f.label, type: f.type, required: f.required === true };
	if (f.validation && typeof f.validation === "object") {
		const seedValidation = seedField?.validation ?? {};
		const v = {};
		for (const key of ["options", "relation", "relationSide", "multiple"]) {
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
function collectionProblems(live, seedDef) {
	const problems = [];
	if (live.label !== seedDef.label) problems.push(`label ${JSON.stringify(live.label)} ≠ ${JSON.stringify(seedDef.label)}`);
	if ((live.labelSingular ?? null) !== (seedDef.labelSingular ?? null)) problems.push(`labelSingular mismatch`);
	const sup = live.supports ?? [];
	for (const s of seedDef.supports ?? []) if (!sup.includes(s)) problems.push(`supports missing ${s}`);
	if ((live.titleField ?? null) !== (seedDef.titleField ?? null)) problems.push(`titleField ${live.titleField} ≠ ${seedDef.titleField}`);
	if ((live.dateField ?? null) !== (seedDef.dateField ?? null)) problems.push(`dateField ${live.dateField} ≠ ${seedDef.dateField}`);
	const liveFields = (live.fields ?? []).filter((f) => f && f.slug);
	if (liveFields.length !== seedDef.fields.length) problems.push(`field count ${liveFields.length} ≠ ${seedDef.fields.length}`);
	const bySlug = new Map(liveFields.map((f) => [f.slug, f]));
	for (const sf of seedDef.fields) {
		const lf = bySlug.get(sf.slug);
		if (!lf) { problems.push(`field ${sf.slug} missing`); continue; }
		const a = JSON.stringify(fieldProjection(lf, sf));
		const b = JSON.stringify(fieldProjection(sf, sf));
		if (a !== b) problems.push(`field ${sf.slug}: live ${a} ≠ seed ${b}`);
	}
	const order = liveFields.map((f) => f.slug).filter((s) => seedDef.fields.some((f) => f.slug === s));
	const seedOrder = seedDef.fields.map((f) => f.slug);
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
console.log(`[T018] mode=${MODE} origin=${BASE_URL} seed=${SEED_PATH} out=${OUT_DIR}`);
console.log(`[T018] driver start ${stamp}`);

const me = await req("GET", "/_emdash/api/auth/me", undefined, "A:identity");
if (!me.ok) fail(`auth/me refused: ${me.status}`);
console.log(`[T018] actor: ${dataOf(me).email} role ${dataOf(me).role} id ${dataOf(me).id}`);
if (dataOf(me).role !== 50) fail(`expected role 50 (Administrator), got ${dataOf(me).role}`);

const before = { capturedAt: stamp, origin: BASE_URL, actor: { id: dataOf(me).id, email: dataOf(me).email, role: dataOf(me).role } };

const colList = await req("GET", "/_emdash/api/schema/collections", undefined, "A:collections");
if (!colList.ok) fail(`collection list refused: ${colList.status}`);
const liveCollectionSlugs = (listOf(colList, "collections") ?? []).map((c) => c.slug).sort();
before.collectionSlugs = liveCollectionSlugs;
console.log(`[T018] live collections: ${JSON.stringify(liveCollectionSlugs)}`);

before.collections = {};
for (const slug of [...US1_COLLECTIONS, ...US2_COLLECTIONS]) {
	const r = await req("GET", `/_emdash/api/schema/collections/${slug}?includeFields=true`, undefined, "A:collection-read");
	before.collections[slug] = r.status === 404 ? null : r.body?.data?.item ?? r.body;
}

const relList = await req("GET", "/_emdash/api/relations", undefined, "A:relations");
if (!relList.ok) fail(`relations list refused: ${relList.status}`);
const liveRelations = listOf(relList, "relations") ?? [];
before.relations = liveRelations;
console.log(`[T018] live relations: ${JSON.stringify(liveRelations.map((r) => `${r.slug}(${r.linkCount ?? "?"} links)`))}`);

const taxList = await req("GET", "/_emdash/api/taxonomies", undefined, "A:taxonomies");
if (!taxList.ok) fail(`taxonomies list refused: ${taxList.status}`);
const liveTaxonomies = listOf(taxList, "taxonomies") ?? [];
before.taxonomies = liveTaxonomies;
console.log(`[T018] live taxonomies: ${JSON.stringify(liveTaxonomies.map((t) => `${t.name}${t.hierarchical ? "(h)" : ""}${JSON.stringify(t.collections)}`))}`);

const orph = await req("GET", "/_emdash/api/schema/orphans", undefined, "A:orphans");
before.orphans = orph.body?.data ?? orph.body;
console.log(`[T018] orphan tables: ${JSON.stringify(before.orphans)}`);

// collection-deletion queue — the actual platform deletion job queue (NOT orphans)
before.collectionDeletionQueue = {};
for (const state of ["pending", "retry", "leased", "failed"]) {
	const r = await req("GET", `/_emdash/api/admin/media-usage/collection-deletions?state=${state}&limit=100`, undefined, "A:deletion-queue");
	before.collectionDeletionQueue[state] = { status: r.status, ok: r.ok, items: listOf(r, "items") ?? r.body?.error?.code ?? null };
}
const queueNonEmpty = Object.entries(before.collectionDeletionQueue)
	.filter(([, v]) => Array.isArray(v.items) && v.items.length > 0)
	.map(([k]) => k);
console.log(`[T018] deletion queue non-empty states: ${JSON.stringify(queueNonEmpty)} ${queueNonEmpty.length ? "<-- STOP CONDITION" : "(all empty or refused)"}`);

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
console.log(`[T018] content counts: ${JSON.stringify(before.contentCounts)}`);
console.log(`[T018] media count: ${before.media.count} (status ${before.media.status})`);

// =====================================================================
// PHASE B — verify US1/Document state equals the accepted seed
// =====================================================================
const stopProblems = [];
for (const slug of US1_COLLECTIONS) {
	const live = before.collections[slug];
	if (live === null || live === undefined) { stopProblems.push(`US1 collection ${slug} absent from live schema`); continue; }
	const p = collectionProblems(live, seedCollections.get(slug));
	if (p.length) stopProblems.push(`${slug}: ${p.join("; ")}`);
}
for (const rslug of ["document_successor", "page_documents", "announcement_documents"]) {
	const live = liveRelations.find((r) => r.slug === rslug);
	if (!live) { stopProblems.push(`US1 relation ${rslug} absent`); continue; }
	const p = relationProblems(live, seedRelations.get(rslug));
	if (p.length) stopProblems.push(`relation ${rslug}: ${p.join("; ")}`);
}
for (const t of liveTaxonomies) {
	const def = seedTaxonomies.get(t.name);
	if (!def) continue; // platform built-ins (category/tag) — untouched
	if (t.label !== def.label || (t.hierarchical === true) !== (def.hierarchical === true)) {
		stopProblems.push(`taxonomy ${t.name} definition mismatch (label/hierarchical)`);
	}
}
// visible attachment preimage must equal T013's journaled final state exactly
for (const [name, expected] of Object.entries(T013_FINAL_ATTACHMENTS)) {
	const live = liveTaxonomies.find((t) => t.name === name);
	if (!live) { stopProblems.push(`taxonomy ${name} absent`); continue; }
	if (!sameSet(live.collections, expected)) {
		stopProblems.push(`taxonomy ${name} visible attachments ${JSON.stringify(live.collections)} ≠ T013 accepted final ${JSON.stringify(expected)} — unknown mutation, refusing whole-list update`);
	}
}
// US2 objects: record whether already present (then they must match exactly; no write)
const us2Present = {};
for (const slug of US2_COLLECTIONS) us2Present[slug] = before.collections[slug] != null;
for (const rslug of US2_RELATIONS) us2Present[rslug] = liveRelations.some((r) => r.slug === rslug);
for (const tname of US2_TAXONOMIES) us2Present[tname] = liveTaxonomies.some((t) => t.name === tname);
console.log(`[T018] US2 objects already present: ${JSON.stringify(us2Present)}`);

if (queueNonEmpty.length > 0) {
	stopProblems.push(`collection-deletion queue non-empty for states ${JSON.stringify(queueNonEmpty)} — refusing collection creation (finishPendingDeletion side effect)`);
}
if (stopProblems.length > 0) {
	writeFileSync(`${OUT_DIR}/before-state.json`, JSON.stringify(before, null, "\t") + "\n");
	console.error(`[T018-STOP] before-state verification failed:\n  - ${stopProblems.join("\n  - ")}`);
	logLine({ ts: new Date().toISOString(), phase: "B:verify", stopped: true, problems: stopProblems });
	process.exit(3);
}
console.log(`[T018] PHASE B OK — US1/Document definitions equal the accepted seed; preimage matches T013 final state; deletion queue empty`);

// planned writes
const planned = [];
for (const slug of US2_COLLECTIONS) if (!us2Present[slug]) planned.push(`POST /schema/collections ${slug}`);
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) continue;
	const def = seedCollections.get(slug);
	const ordinary = def.fields.filter((f) => f.type !== "reference");
	planned.push(`POST ${ordinary.length} ordinary fields → ${slug}`);
}
for (const rslug of US2_RELATIONS) if (!us2Present[rslug]) planned.push(`POST /relations ${rslug}`);
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) continue;
	const def = seedCollections.get(slug);
	const refs = def.fields.filter((f) => f.type === "reference");
	for (const f of refs) planned.push(`POST bound reference field ${slug}.${f.slug}`);
	planned.push(`PUT /schema/collections/${slug} titleField${def.dateField != null ? " + dateField" : ""}`);
}
for (const t of US2_TAXONOMIES) if (!us2Present[t]) planned.push(`POST /taxonomies ${t} (attached: ${JSON.stringify(seedTaxonomies.get(t).collections)})`);
for (const name of ["topic", "audience", "area"]) {
	const target = seedTaxonomies.get(name).collections;
	const current = liveTaxonomies.find((t) => t.name === name)?.collections ?? [];
	if (!sameSet(current, target)) planned.push(`PUT /taxonomies/${name} attachments ${JSON.stringify(current)} → ${JSON.stringify(target)} (retains every visible entry)`);
}
console.log(`[T018] planned writes (${planned.length} steps):\n  - ${planned.join("\n  - ")}`);
writeFileSync(`${OUT_DIR}/before-state.json`, JSON.stringify(before, null, "\t") + "\n");
if (MODE !== "apply") {
	console.log(`[T018] inventory mode complete — no writes issued (journal: ${journalGets} GETs, ${journalWrites} writes)`);
	process.exit(0);
}

// =====================================================================
// PHASE C — apply the accepted US2 delta (additive only)
// =====================================================================
const created = { collections: [], fields: [], relations: [], referenceFields: [], metadataPuts: [], taxonomyCreates: [], attachmentPuts: [] };
const expect = (r, what, status = 201) => {
	if (!r.ok) fail(`${what} refused: ${r.status} ${r.body?.error?.code ?? ""} ${JSON.stringify(r.body?.error?.details ?? "").slice(0, 300)}`);
	return r;
};

// C1 — collections first
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) { console.log(`[T018] C1 skip ${slug} (already present)`); continue; }
	const def = seedCollections.get(slug);
	expect(
		await req("POST", "/_emdash/api/schema/collections", {
			slug: def.slug, label: def.label, labelSingular: def.labelSingular, supports: def.supports,
		}, "C1:collection-create"),
		`create collection ${slug}`,
	);
	created.collections.push(slug);
}

// C2 — ordinary fields (seed order, explicit sortOrder; reference fields deferred to C4)
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) continue;
	const def = seedCollections.get(slug);
	let order = 0;
	for (const f of def.fields) {
		if (f.type === "reference") continue;
		const body = { slug: f.slug, label: f.label, type: f.type, sortOrder: order };
		if (f.required === true) body.required = true;
		if (f.validation) body.validation = f.validation;
		expect(
			await req("POST", `/_emdash/api/schema/collections/${slug}/fields`, body, "C2:field-create"),
			`create field ${slug}.${f.slug}`,
		);
		created.fields.push(`${slug}.${f.slug}`);
		order += 1;
	}
}

// C3 — named relations BEFORE binding reference fields
for (const rslug of US2_RELATIONS) {
	if (us2Present[rslug]) { console.log(`[T018] C3 skip ${rslug} (already present)`); continue; }
	const def = seedRelations.get(rslug);
	expect(
		await req("POST", "/_emdash/api/relations", {
			slug: def.slug, parentCollection: def.parentCollection, childCollection: def.childCollection,
			parentLabel: def.parentLabel, parentLabelSingular: def.parentLabelSingular,
			childLabel: def.childLabel, childLabelSingular: def.childLabelSingular,
			maxChildrenPerParent: def.maxChildrenPerParent, maxParentsPerChild: def.maxParentsPerChild,
		}, "C3:relation-create"),
		`create relation ${rslug}`,
	);
	created.relations.push(rslug);
}

// C4 — bound reference fields (parent side only)
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) continue;
	const def = seedCollections.get(slug);
	const total = def.fields.length;
	for (const f of def.fields.filter((x) => x.type === "reference")) {
		const body = {
			slug: f.slug, label: f.label, type: "reference",
			validation: { relation: f.validation.relation, relationSide: f.validation.relationSide },
			sortOrder: def.fields.indexOf(f),
		};
		if (f.required === true) body.required = true;
		expect(
			await req("POST", `/_emdash/api/schema/collections/${slug}/fields`, body, "C4:reference-field-create"),
			`create bound reference field ${slug}.${f.slug}`,
		);
		created.referenceFields.push(`${slug}.${f.slug}`);
	}
}

// C5 — title/date metadata
for (const slug of US2_COLLECTIONS) {
	if (us2Present[slug]) continue;
	const def = seedCollections.get(slug);
	const body = { titleField: def.titleField };
	if (def.dateField != null) body.dateField = def.dateField;
	expect(
		await req("PUT", `/_emdash/api/schema/collections/${slug}`, body, "C5:collection-meta"),
		`set ${slug} titleField/dateField`,
		200,
	);
	created.metadataPuts.push(slug);
}

// C6 — new taxonomies (service_category, report_type) with their accepted attachments
for (const tname of US2_TAXONOMIES) {
	if (us2Present[tname]) { console.log(`[T018] C6 skip ${tname} (already present)`); continue; }
	const def = seedTaxonomies.get(tname);
	expect(
		await req("POST", "/_emdash/api/taxonomies", {
			name: def.name, label: def.label, labelSingular: def.labelSingular,
			hierarchical: def.hierarchical === true, collections: def.collections,
		}, "C6:taxonomy-create"),
		`create taxonomy ${tname}`,
	);
	created.taxonomyCreates.push(tname);
}

// C7 — shared attachment updates (whole-list PUT; every visible entry retained).
// Precondition re-verified live: the immediately-prior filtered read must still
// show exactly the accepted T013 final lists (checked again here, after C1-C6,
// because collection creation can only ever UNHIDE additional attachments).
for (const name of ["topic", "audience", "area"]) {
	const reRead = await req("GET", "/_emdash/api/taxonomies", undefined, "C7:taxonomy-reread");
	const now = (listOf(reRead, "taxonomies") ?? []).find((t) => t.name === name);
	if (!now) fail(`taxonomy ${name} disappeared before attachment update`);
	const t013 = T013_FINAL_ATTACHMENTS[name];
	const unhid = (now.collections ?? []).filter((c) => !t013.includes(c));
	if (unhid.length > 0) {
		fail(`taxonomy ${name} newly visible attachments ${JSON.stringify(unhid)} after collection creation — preimage differs from the accepted state; refusing whole-list update`);
	}
	if (!sameSet(now.collections, t013)) {
		fail(`taxonomy ${name} visible attachments changed to ${JSON.stringify(now.collections)} — refusing whole-list update`);
	}
	const target = seedTaxonomies.get(name).collections;
	const dropped = (now.collections ?? []).filter((c) => !target.includes(c));
	if (dropped.length > 0) fail(`attachment update would DROP visible ${name} attachments ${JSON.stringify(dropped)} — accepted seed does not include them; stopping`);
	if (sameSet(now.collections, target)) { console.log(`[T018] C7 skip ${name} (already at accepted list)`); continue; }
	expect(
		await req("PUT", `/_emdash/api/taxonomies/${name}`, { collections: target }, "C7:taxonomy-attach"),
		`update ${name} attachments to the accepted list`,
		200,
	);
	created.attachmentPuts.push(name);
}

console.log(`[T018] PHASE C complete: ${JSON.stringify(created)}`);

// =====================================================================
// PHASE D — after-inventory + full comparison against the accepted seed
// =====================================================================
const after = { capturedAt: new Date().toISOString(), origin: BASE_URL };
const colList2 = await req("GET", "/_emdash/api/schema/collections", undefined, "D:collections");
after.collectionSlugs = (listOf(colList2, "collections") ?? []).map((c) => c.slug).sort();
after.collections = {};
for (const slug of [...US1_COLLECTIONS, ...US2_COLLECTIONS]) {
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

// final comparison: EVERY seed collection/relation/taxonomy must now match exactly
const finalProblems = [];
if (JSON.stringify(after.collectionSlugs) !== JSON.stringify([...US1_COLLECTIONS, ...US2_COLLECTIONS].sort())) {
	finalProblems.push(`collection set ${JSON.stringify(after.collectionSlugs)} ≠ accepted ten`);
}
for (const c of seed.collections) {
	const live = after.collections[c.slug];
	if (!live) { finalProblems.push(`${c.slug} missing after apply`); continue; }
	const p = collectionProblems(live, c);
	if (p.length) finalProblems.push(`${c.slug}: ${p.join("; ")}`);
}
for (const r of seed.relations) {
	const live = after.relations.find((x) => x.slug === r.slug);
	if (!live) { finalProblems.push(`relation ${r.slug} missing after apply`); continue; }
	const p = relationProblems(live, r);
	if (p.length) finalProblems.push(`relation ${r.slug}: ${p.join("; ")}`);
}
for (const t of seed.taxonomies) {
	const live = after.taxonomies.find((x) => x.name === t.name);
	if (!live) { finalProblems.push(`taxonomy ${t.name} missing after apply`); continue; }
	if (live.label !== t.label || (live.hierarchical === true) !== (t.hierarchical === true)) finalProblems.push(`taxonomy ${t.name} definition mismatch`);
	if (!sameSet(live.collections, t.collections)) finalProblems.push(`taxonomy ${t.name} attachments ${JSON.stringify(live.collections)} ≠ ${JSON.stringify(t.collections)}`);
}
writeFileSync(`${OUT_DIR}/after-state.json`, JSON.stringify(after, null, "\t") + "\n");
logLine({ ts: new Date().toISOString(), phase: "D:verify", problems: finalProblems, journalWrites, journalGets });
console.log(`[T018] after-state captured. Final verification: ${finalProblems.length === 0 ? "ACTIVE SCHEMA EQUALS THE ACCEPTED SEED" : "PROBLEMS"}`);
if (finalProblems.length) console.error(`[T018]\n  - ${finalProblems.join("\n  - ")}`);
console.log(`[T018] journal: ${journalWrites} writes + ${journalGets} GETs → ${journalPath}`);
process.exit(finalProblems.length === 0 ? 0 : 4);
