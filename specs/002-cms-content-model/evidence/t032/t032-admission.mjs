// T032 [US7] — read-only runtime admission capture for the T031 maintenance
// smoke execution, modeled on the accepted T030 driver's credential
// discipline (../t030/t030-driver.mjs). Run with the pinned Node 24.21.0
// toolchain against the persistent development runtime origin
// http://127.0.0.1:4322.
//
// READ-ONLY: GETs only. No write, no DELETE, no dev-bypass, no cookie or
// session material. The PAT travels only in the Authorization header and
// never appears in the capture (which records method/path/status and response
// data only). Fails closed on a non-0600 credential file, exactly like the
// accepted cms.helpers.ts loader.
//
// Captures:
//  - the live PAT identity through GET /_emdash/api/auth/me (email + role
//    only; no credential material);
//  - the schema pieces the accepted T031 smoke gates on: the four journey
//    collections (health_services, services, announcements, activities) with
//    their Thai labels and the fields/selectors the journey exercises, the
//    facility_type taxonomy, the facility_services relation and the area
//    attachments;
//  - the site timezone through GET /_emdash/api/settings (used by the smoke's
//    domain-date rendering expectation);
//  - pre-run state of the collections the smoke creates fixtures in (live +
//    trash counts) and the media listing, so the post-run comparison can
//    prove no residue.

import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4322";
const DEV_ACCESS = process.env.SONGHEALTH_DEV_ACCESS
	?? "/home/multica-agent/.local/share/dev-runtimes/songhealth/dev-access.json";
const OUT_PATH = process.env.T032_OUT ?? new URL("./admission.json", import.meta.url).pathname;

const fail = (msg) => {
	console.error(`\n[T032-STOP] ${msg}`);
	process.exit(2);
};

// --- credential load (same fail-closed discipline as cms.helpers.ts) ---
const st = lstatSync(DEV_ACCESS);
if (!st.isFile() || st.isSymbolicLink()) fail(`${DEV_ACCESS} is not a regular non-symlink file`);
if ((st.mode & 0o777) !== 0o600) fail(`${DEV_ACCESS} must be mode 0600`);
const token = JSON.parse(readFileSync(DEV_ACCESS, "utf8")).token;
if (typeof token !== "string" || token.length === 0) fail("dev-access.json carries no token");

const calls = [];
async function get(path) {
	const response = await fetch(`${BASE_URL}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
		redirect: "error",
	});
	let body;
	try {
		body = await response.json();
	} catch {
		body = { nonJsonBody: true };
	}
	calls.push({ method: "GET", path, status: response.status });
	return { ok: response.ok, status: response.status, body };
}

const dataOf = (r) => (r.body && typeof r.body === "object" && r.body.data && typeof r.body.data === "object" ? r.body.data : undefined);
const itemOf = (r) => {
	const data = dataOf(r);
	return data && typeof data.item === "object" ? data.item : undefined;
};

const capture = {
	stamp: new Date().toISOString(),
	baseUrl: BASE_URL,
	purpose: "T032 read-only runtime admission (controller status/verify run separately through runtime.sh)",
	identity: undefined,
	schema: {},
	preState: {},
	calls,
};

// --- live identity (email/role only; never the credential) ---
const me = await get("/_emdash/api/auth/me");
const identity = dataOf(me);
if (!me.ok || !identity) fail(`dev credential did not authenticate via /auth/me (HTTP ${me.status})`);
capture.identity = { email: identity.email, name: identity.name, role: identity.role };

// --- the four journey collections with their field maps ---
for (const collection of ["health_services", "services", "announcements", "activities"]) {
	const r = await get(`/_emdash/api/schema/collections/${encodeURIComponent(collection)}?includeFields=true`);
	const item = itemOf(r);
	capture.schema[collection] = r.ok
		? {
				label: item?.label,
				labelSingular: item?.labelSingular,
				titleField: item?.titleField,
				dateField: item?.dateField,
				fields: Array.isArray(item?.fields)
					? item.fields.map((f) => ({
							slug: f.slug,
							type: f.type,
							label: f.label,
							required: f.required === true,
							...(f.validation && typeof f.validation === "object"
								? {
										relation: f.validation.relation,
										relationSide: f.validation.relationSide,
										subFieldSlugs: Array.isArray(f.validation.subFields)
											? f.validation.subFields.map((s) => s.slug)
											: undefined,
									}
								: {}),
						}))
					: undefined,
			}
		: { httpStatus: r.status };
}

// --- the facility_type taxonomy + the relation + area attachments ---
const taxonomy = await get("/_emdash/api/taxonomies/facility_type");
capture.schema.facility_type = taxonomy.ok
	? {
			label: dataOf(taxonomy)?.taxonomy?.label,
			hierarchical: dataOf(taxonomy)?.taxonomy?.hierarchical,
			collections: dataOf(taxonomy)?.taxonomy?.collections,
		}
	: { httpStatus: taxonomy.status };
const taxonomyTerms = await get("/_emdash/api/taxonomies/facility_type/terms");
capture.schema.facility_type_terms = taxonomyTerms.ok
	? { count: (dataOf(taxonomyTerms)?.terms ?? []).length }
	: { httpStatus: taxonomyTerms.status };
const relations = await get("/_emdash/api/relations");
capture.schema.facility_services_relation = Array.isArray(dataOf(relations)?.relations)
	? dataOf(relations).relations
			.filter((rel) => rel.slug === "facility_services")
			.map((rel) => ({
				parentCollection: rel.parentCollection,
				childCollection: rel.childCollection,
				maxChildrenPerParent: rel.maxChildrenPerParent,
				maxParentsPerChild: rel.maxParentsPerChild,
				boundFields: rel.boundFields,
				linkCount: rel.linkCount,
			}))
	: undefined;
const areaTaxonomy = await get("/_emdash/api/taxonomies/area");
capture.schema.area_attachments = areaTaxonomy.ok
	? dataOf(areaTaxonomy)?.taxonomy?.collections
	: { httpStatus: areaTaxonomy.status };

// --- the site timezone the smoke's domain-date expectation uses ---
const settings = await get("/_emdash/api/settings");
capture.schema.siteTimezone = dataOf(settings)?.timezone;
capture.schema.settingsDataEmpty = settings.ok && Object.keys(dataOf(settings) ?? {}).length === 0;

// --- pre-run owned-fixture surface: synthetic residue should be zero ---
for (const collection of ["health_services", "services", "announcements", "activities"]) {
	const live = await get(`/_emdash/api/content/${encodeURIComponent(collection)}?q=${encodeURIComponent("songhealth-f002-synthetic")}&status=all&limit=1`);
	const trash = await get(`/_emdash/api/content/${encodeURIComponent(collection)}/trash?limit=100`);
	capture.preState[collection] = {
		syntheticLiveCount: live.ok ? ((dataOf(live)?.items ?? []).length ?? dataOf(live)?.total) : `HTTP ${live.status}`,
		trashCount: trash.ok ? (dataOf(trash)?.items ?? []).length : `HTTP ${trash.status}`,
	};
}
const media = await get("/_emdash/api/media?limit=1");
capture.preState.media = media.ok
	? { syntheticOrAnyCount: (dataOf(media)?.items ?? []).length ?? dataOf(media)?.total }
	: { httpStatus: media.status };

mkdirSync(new URL("./", import.meta.url).pathname, { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(capture, null, "\t")}\n`);
console.log(`[T032-admission] ${calls.length} GETs captured → ${OUT_PATH}`);
console.log(`[T032-admission] identity: ${capture.identity.email} role ${capture.identity.role}`);
for (const [name, value] of Object.entries(capture.schema)) {
	console.log(`[T032-admission] schema ${name}: ${String(JSON.stringify(value) ?? "undefined").slice(0, 220)}`);
}
console.log(`[T032-admission] preState: ${JSON.stringify(capture.preState)}`);
