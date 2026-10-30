// Personnel's native authoring contract (Feature 002 T023; specs/002-cms-content-model spec.md US3,
// FR-008–FR-010, FR-028, SC-001, SC-008; data-model.md, the personnel row; `02` §8; Feature 003
// #61 adds `leadership_order`).
//
// What it checks, over the native content and schema APIs as the development Administrator:
// - the schema has exactly the approved fields: the required display-name `title` and optional
//   current-directory fields, with no sensitive, history or account-link field (FR-028). The
//   conditional `organization` reference is tolerated, never required: no shared Organization
//   reuse case is demonstrated (T001 §6), so `organizational_unit` text is the unit;
// - a title-only record saves and the optional fields save and read back. A missing or empty
//   title, a value of the wrong type for an optional field, an unauthenticated save and a stale
//   `_rev` are refused;
// - an assignment or visibility change updates the same Personnel identity and leaves the editing
//   account, its permissions and the entry's authorship unchanged (FR-009, `06` §6). Native
//   revisions are the traceability baseline only, not an assignment history (Q2).
//
// Fixtures are synthetic and public-publishable, and are removed after each test. No public page is
// read here; tests/browser/public-personnel.spec.ts covers the About pages.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A boolean field is an INTEGER column. Validation accepts true/false and 0/1
//   (src/schema/zod-generator.ts). A fresh create reads back from the columns as the number 0/1;
//   after an update the staged revision reads back exactly as supplied
//   (src/database/repositories/content.ts serializeValue; src/emdash-runtime.ts hydrateDraftData).
// - Optional fields are `.nullish()`, so null clears one; a present required key is still checked
//   on update (src/schema/zod-generator.ts generateFieldSchema, src/api/handlers/validation.ts).
// - GET /_emdash/api/schema/collections/{slug}?includeFields=true lists the fields; a missing
//   collection answers 404, which the schema gate reports as a skip, never a PASS.
// - Content items carry `authorId`, and GET …/{id}/revisions lists revisions newest first; a
//   create stages none (src/database/repositories/types.ts, the accepted T020 record).

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	DEFAULT_DEVELOPMENT_ORIGIN,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeRevOf,
	NATIVE_ROLES,
	readEntry,
	scrubEmbeddedSecrets,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// The approved T024 personnel definition (data-model.md collection row)
// ---------------------------------------------------------------------------

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
}

/**
 * The approved personnel field set: `title` (display name, ชื่อที่แสดง) is
 * the save-time required string; every current-directory data field is
 * optional. These are the ONLY unconditional fields the approved T024
 * definition declares, so the schema gate also uses this set to prove the
 * FR-028/SC-008 schema absence of sensitive, history and account-link
 * fields (nothing outside the approved set may exist).
 */
const APPROVED_FIELDS: ReadonlyArray<{ slug: string; type: string; required?: boolean }> = [
	{ slug: "title", type: "string", required: true },
	{ slug: "prefix", type: "string" },
	{ slug: "first_name", type: "string" },
	{ slug: "last_name", type: "string" },
	{ slug: "profile_image", type: "image" },
	{ slug: "current_assignment", type: "string" },
	{ slug: "organizational_unit", type: "string" },
	{ slug: "public_visible", type: "boolean" },
	{ slug: "public_contact", type: "text" },
	// The Leadership rank (#61; spec #51): empty means the person is not Leadership.
	{ slug: "leadership_order", type: "integer" },
];

/**
 * The single approved CONDITIONAL addition: the optional `organization`
 * reference (data-model `personnel_organization`, "one maximum; many")
 * exists only if T025 is activated by a demonstrated shared-object case.
 * T001 §6 records no such case, so this file never exercises it; the
 * schema gate merely tolerates its presence so a later activated T025 does
 * not misread as drift. No Organization schema/link is asserted here.
 */
const CONDITIONAL_ORGANIZATION_FIELD_SLUG = "organization";

/**
 * Sensitive/history/account-link field slugs FR-028 and the approved data
 * model forbid in the Personnel schema. Enumerated from the owning
 * authorities (02 §8; data-model personnel row; spec US3.1/FR-008/FR-028):
 * Citizen-ID/national-ID, date of birth, private address, HR-sensitive
 * data, any editing-account link, and assignment-history start/end/retained
 * past assignments. The allow-list above already forbids everything
 * outside the approved set; this explicit list gives the FR-028 absence a
 * readable, directly-attributable failure message.
 */
const FORBIDDEN_FIELD_SLUGS: readonly string[] = [
	"citizen_id",
	"national_id",
	"id_card",
	"date_of_birth",
	"dob",
	"birth_date",
	"private_address",
	"home_address",
	"salary",
	"hr_data",
	"account_id",
	"user_id",
	"account",
	"user",
	"login",
	"assignment_history",
	"past_assignments",
	"assignment_start",
	"assignment_end",
];

/** The native Personnel collection under check (T024's definition). */
const PERSONNEL_COLLECTION = "personnel";

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/**
 * Readiness for the personnel collection, decided once per worker in
 * beforeAll from the live native schema read: `missing` (collection not
 * initialized — the T024 definition prerequisite outstanding) SKIPS
 * explicitly; `misconfigured` (collection present but not matching the
 * approved definition, or carrying a field outside it) FAILS loudly so an
 * unexpected schema mismatch — including a sensitive-field surprise —
 * stays visible instead of producing wrong expectations.
 */
type PersonnelReadiness =
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The development-credential fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Personnel readiness; set by beforeAll. */
let personnelReadiness: PersonnelReadiness = { outcome: "missing" };

/** One clearly synthetic unique display-name title (never real personal data). */
function uniqueTitle(): string {
	return `${SYNTHETIC_FIXTURE_MARK} personnel ${crypto.randomUUID().slice(0, 8)}`;
}

/** A clearly synthetic public-publishable value for a text-like field. */
function syntheticText(name: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${name}`;
}

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003/T007/T014/T019 checks):
 * PLAYWRIGHT_BASE_URL when set, otherwise the documented development
 * origin. node:process is loaded through a dynamic non-literal import
 * because the pinned dependency baseline ships no @types/node.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

/** Truthful schema gate for the personnel collection (accepted T007 shape). */
function gatePersonnel(): void {
	test.skip(
		personnelReadiness.outcome === "missing",
		"the personnel collection is not initialized in the active native schema (T024 definition prerequisite outstanding; this run cannot exercise Personnel current-directory checks)",
	);
	if (personnelReadiness.outcome === "misconfigured") {
		throw new Error(
			`the active native personnel collection does not match the approved T024 definition this file relies on: ${personnelReadiness.detail}`,
		);
	}
}

/** The entry's field-data object as the native read returns it, when present. */
function dataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.data !== null && typeof item?.data === "object"
		? (item.data as Record<string, unknown>)
		: {};
}

/** The entry's native authorship identity (`authorId`), when present. */
function authorIdOfItem(item: Record<string, unknown> | undefined): unknown {
	return item?.authorId;
}

/** The live editing-account identity/permission view from /auth/me. */
interface NativeIdentity {
	userId: unknown;
	email: unknown;
	role: unknown;
}

async function liveIdentityOf(actor: CmsActor): Promise<NativeIdentity> {
	const me = await cmsRequest(actor, "/_emdash/api/auth/me");
	expect(me.ok, "the acting account's live identity must be readable through /auth/me").toBe(true);
	const identity = nativeDataOf(me);
	expect(
		identity?.id !== undefined && identity.email !== undefined && identity.role !== undefined,
		"the /auth/me response must carry id, email and role",
	).toBe(true);
	return { userId: identity?.id, email: identity?.email, role: identity?.role };
}

/** One revision record from the native listing (accepted T020 shape). */
interface RevisionRecord {
	id?: unknown;
	entryId?: unknown;
	data?: unknown;
	authorId?: unknown;
}

/** GET …/revisions — the native revision-history listing (content:read_drafts). */
async function listRevisions(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/revisions`,
	);
}

function revisionsOf(result: NativeResult): { ok: boolean; items: RevisionRecord[] } {
	const data = nativeDataOf(result);
	return {
		ok: result.ok,
		items: Array.isArray(data?.items) ? (data.items as RevisionRecord[]) : [],
	};
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertions (the accepted T003/T007 contracts)
// ---------------------------------------------------------------------------

/**
 * A native field-validation refusal: HTTP 400 with the VALIDATION_ERROR
 * code, and explicitly NOT an authorization (401/403) or state (409)
 * refusal — so authorization, schema-missing and concurrency problems can
 * never masquerade as field-validation outcomes (and vice versa).
 */
function expectValidationRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the native save must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: a native validation refusal is HTTP 400`,
	).toBe(400);
	expect(
		result.status === 401 || result.status === 403 || result.status === 404 || result.status === 409,
		`${caseLabel}: a validation refusal must stay distinguishable from authorization (401/403), missing-schema (404) and state-conflict (409) failures`,
	).toBe(false);
	const error = result.body as { success?: unknown; error?: { code?: unknown } };
	expect(
		error?.error?.code,
		`${caseLabel}: the refusal must carry the native VALIDATION_ERROR code`,
	).toBe("VALIDATION_ERROR");
}

// ---------------------------------------------------------------------------
// Worker setup: development access and the live schema read
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// Development native access through the pre-existing development
	// credential (T013 test-authentication adaptation), pinned to the
	// runner-configured origin so a nondefault PLAYWRIGHT_BASE_URL run
	// cannot silently exercise another app. createPatActor verifies the
	// live identity through /auth/me and pins the expected Administrator
	// role; the expected development fixture account is asserted by email.
	// This hook deliberately creates no owned fixtures (credential load,
	// identity verification and the schema read only).
	admin = await createPatActor({
		baseUrl: await configuredDevelopmentOrigin(),
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// One live schema read decides personnel readiness. A 404
	// COLLECTION_NOT_FOUND is the truthful T024 prerequisite (T018 evidence
	// records the applied model without a personnel collection); anything
	// else that is not a clean success fails loudly.
	const schemaRead = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(PERSONNEL_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (schemaRead.status === 404) {
		personnelReadiness = { outcome: "missing" };
		return;
	}
	expect(
		schemaRead.ok,
		`reading the native ${PERSONNEL_COLLECTION} collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
	).toBe(true);
	const fields = nativeItemOf(schemaRead)?.fields;
	expect(
		Array.isArray(fields),
		`the ${PERSONNEL_COLLECTION} schema read must include fields`,
	).toBe(true);
	const bySlug = new Map<string, SchemaField>();
	for (const field of fields as SchemaField[]) {
		if (typeof field.slug === "string") {
			expect(
				bySlug.has(field.slug),
				`the ${PERSONNEL_COLLECTION} schema must not declare duplicate field '${field.slug}'`,
			).toBe(false);
			bySlug.set(field.slug, field);
		}
	}

	const problems: string[] = [];
	// Every approved field must exist with its approved native type and
	// requiredness, so a supplied-value refusal below can only ever be
	// about the VALUE.
	for (const approved of APPROVED_FIELDS) {
		const field = bySlug.get(approved.slug);
		if (field?.type !== approved.type) {
			problems.push(`${approved.slug} must exist as a native ${approved.type} field`);
		} else if (approved.required === true && field.required !== true) {
			problems.push(`${approved.slug} must be a native required field`);
		} else if (approved.required !== true && field.required === true) {
			problems.push(`${approved.slug} must stay optional (an approved O field)`);
		}
	}
	// FR-028/SC-008 schema absence: no field outside the approved set (the
	// single approved conditional `organization` reference is tolerated),
	// with the enumerated sensitive/history/account-link slugs called out
	// explicitly for readable evidence.
	const approvedSlugs = new Set([
		...APPROVED_FIELDS.map((field) => field.slug),
		CONDITIONAL_ORGANIZATION_FIELD_SLUG,
	]);
	for (const slug of bySlug.keys()) {
		if (!approvedSlugs.has(slug)) {
			problems.push(
				`unexpected field '${slug}' is outside the approved T024 personnel definition (no speculative, sensitive, history or account-link field may exist)`,
			);
		}
	}
	for (const forbidden of FORBIDDEN_FIELD_SLUGS) {
		if (bySlug.has(forbidden)) {
			problems.push(
				`forbidden field '${forbidden}' must be absent from the Personnel schema (FR-028: no sensitive, history or account-link fields)`,
			);
		}
	}
	personnelReadiness =
		problems.length > 0 ? { outcome: "misconfigured", detail: problems.join("; ") } : { outcome: "ready" };
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup
// ---------------------------------------------------------------------------

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) {
		return;
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	console.log(
		`[cms-personnel] owned-fixture cleanup after test: ${
			report.complete ? "complete" : "UNRESOLVED"
		} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
	);
	expect(
		report.complete,
		"every owned synthetic fixture created by this test must be proven resolved (unresolved cleanup is a reported failure, not a silent leftover)",
	).toBe(true);
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything); anything
	// still registered here is an unresolved earlier attempt, retried and
	// reported truthfully as the worker's final standing.
	if (admin === undefined) {
		return;
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	expect(
		report.complete,
		"the final worker cleanup must leave zero unresolved owned fixtures",
	).toBe(true);
});

// ---------------------------------------------------------------------------
// Schema precondition — the approved T024 definition, and nothing else
// ---------------------------------------------------------------------------

test("personnel schema precondition: approved native definition is active with no sensitive/history/account-link fields", () => {
	gatePersonnel();
	// gatePersonnel skips when the collection is missing and throws when it
	// is misconfigured; reaching here with outcome "ready" is the asserted
	// precondition itself: required display-name title, the nine approved
	// optional current-directory fields, nothing outside the approved set,
	// and the FR-028 forbidden fields absent. The conditional `organization`
	// reference is tolerated, never required (T001 §6: no demonstrated
	// shared Organization reuse case; T025 stays unactivated).
	expect(personnelReadiness.outcome).toBe("ready");
});

// ---------------------------------------------------------------------------
// Valid controls — create/save/reopen with permitted optional omissions
// ---------------------------------------------------------------------------

test("create/save/reopen: title-only minimal Personnel record saves with permitted optional omissions", async () => {
	gatePersonnel();
	// Q1 matrix Personnel row: display-name title required; every other
	// field optional. A title-only record is a valid save — no
	// assignment/profile/visibility completeness rule exists.
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, { data: { title } });
	expect(
		created.result.ok,
		"the title-only minimal Personnel record must save (optional omissions are permitted)",
	).toBe(true);
	expect(created.result.status, "a native create succeeds with 201").toBe(201);
	expect(
		created.entryId,
		"the entry id must come from the native response",
	).toBeTruthy();
	expect(created.rev, "a native `_rev` must be returned").toBeTruthy();

	// Reopen by returned id only: the same display name reads back and the
	// record is a native draft.
	const read = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(read.ok, "the saved Personnel record must be readable by returned id").toBe(true);
	const item = nativeItemOf(read);
	expect(dataOfItem(item).title, "the read-back title must match the supplied display name").toBe(title);
	expect(item?.status, "a fresh native create is a draft").toBe("draft");
});

test("valid control: optional current fields save and read back, with boolean false/0 accepted and each native read-back path asserted exactly", async () => {
	gatePersonnel();
	// One synthetic fixture media id for profile_image; the read-back
	// asserts the SELECTION identity only (no byte-availability claim —
	// D-REF stays deferred).
	const upload = await uploadSyntheticMedia(admin);
	expect(
		upload.result.ok,
		"the synthetic fixture media upload for the profile image must succeed",
	).toBe(true);
	expect(upload.mediaId, "a media id must be returned by the native response").toBeTruthy();

	const title = uniqueTitle();
	const optional: Record<string, unknown> = {
		prefix: syntheticText("prefix"),
		first_name: syntheticText("first-name"),
		last_name: syntheticText("last-name"),
		profile_image: { id: upload.mediaId! },
		current_assignment: syntheticText("assignment"),
		organizational_unit: syntheticText("organizational-unit"),
		public_visible: false,
		public_contact: syntheticText("public-contact"),
		leadership_order: 3,
	};
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
		data: { title, ...optional },
	});
	expect(
		created.result.ok,
		"valid supplied optional current fields must save alongside the required display name",
	).toBe(true);
	expect(created.entryId, "the created entry id must come from the native response").toBeTruthy();

	const read = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(read.ok, "the saved Personnel record must be readable by returned id").toBe(true);
	const data = dataOfItem(nativeItemOf(read));
	// Text-like fields read back exactly as supplied.
	expect(data.prefix, "the supplied prefix must read back").toBe(optional.prefix);
	expect(data.first_name, "the supplied first name must read back").toBe(optional.first_name);
	expect(data.last_name, "the supplied last name must read back").toBe(optional.last_name);
	expect(data.current_assignment, "the supplied current assignment must read back").toBe(
		optional.current_assignment,
	);
	expect(data.organizational_unit, "the supplied organizational unit must read back").toBe(
		optional.organizational_unit,
	);
	expect(data.public_contact, "the supplied appropriate public contact must read back").toBe(
		optional.public_contact,
	);
	expect(data.leadership_order, "the supplied Leadership order must read back").toBe(3);
	// The image selection reads back the uploaded media id (returned
	// identity only).
	expect(
		(data.profile_image as { id?: unknown } | undefined)?.id,
		"the profile image selection must read back the uploaded media id",
	).toBe(upload.mediaId);
	// Boolean false is a VALID value (no truthiness-based rejection). A
	// fresh create stages no revision, so this read is served from the
	// content columns, where the pinned serialization stores booleans as
	// the INTEGER 0/1 — create false reads back as the number 0.
	expect(
		data.public_visible,
		"supplied boolean false must persist; the column-served create read-back is the native integer 0",
	).toBe(0);

	// The same field updated to true reads back as the boolean true: the
	// update stages a draft revision preserving the SUPPLIED value
	// (validation accepts it without replacing the payload), and the
	// authorized read overlays that revision JSON without conversion …
	const visibleTrue = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { public_visible: true },
	});
	expect(visibleTrue.ok, "updating public_visible to true must succeed").toBe(true);
	const readTrue = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(readTrue.ok, "the updated record must be readable").toBe(true);
	expect(
		dataOfItem(nativeItemOf(readTrue)).public_visible,
		"the revision-hydrated read-back preserves the supplied boolean true exactly",
	).toBe(true);

	// … and supplying the NATIVE 0/1 shape directly is equally valid input
	// (the pinned boolean preprocess accepts exactly 0/1), still without
	// truthiness-based rejection. Revision hydration preserves the ORIGINAL
	// SUPPLIED data, so the numeric 0 input reads back as the number 0 —
	// the update path does not convert it to a boolean.
	const visibleZero = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { public_visible: 0 },
	});
	expect(visibleZero.ok, "supplying the native 0 boolean shape must be accepted (0/1 are valid values)").toBe(
		true,
	);
	const readZero = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(readZero.ok, "the updated record must be readable").toBe(true);
	expect(
		dataOfItem(nativeItemOf(readZero)).public_visible,
		"the revision-hydrated read-back preserves the supplied numeric 0 exactly (valid false, not a missing value)",
	).toBe(0);
});

// ---------------------------------------------------------------------------
// Required display-name title refusals (create) and invalid clears (update)
// ---------------------------------------------------------------------------

test("create refuses missing, null and empty required display-name title", async () => {
	gatePersonnel();
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title omitted", data: {} },
		{ label: "title null", data: { title: null } },
		{ label: "title empty string", data: { title: "" } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

test("update refuses invalid clearing of the required display-name title; the record stays intact", async () => {
	gatePersonnel();
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, { data: { title } });
	expect(created.result.ok, "the valid Personnel draft fixture must save").toBe(true);

	// Each invalid clear is its own update with a fresh `_rev` (updateEntry
	// re-reads), so the refusal is about the supplied value, never a stale
	// precondition.
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title cleared to empty string", data: { title: "" } },
		{ label: "title cleared to null", data: { title: null } },
	];
	for (const fieldCase of cases) {
		const refusal = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal, fieldCase.label);
	}

	// Re-read after the refused clears: the required display name is intact
	// on the same identity.
	const read = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(read.ok, "the Personnel record must remain readable after refused clears").toBe(true);
	expect(
		dataOfItem(nativeItemOf(read)).title,
		"the refused title clear must not have taken effect",
	).toBe(title);
});

// ---------------------------------------------------------------------------
// Representative invalid supplied values (per approved native field types)
// ---------------------------------------------------------------------------

test("create refuses representative invalid supplied values for the approved optional field types", async () => {
	gatePersonnel();
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title (string) supplied as a number", data: { title: 123 } },
		{ label: "prefix (string) supplied as a number", data: { prefix: 123 } },
		{ label: "public_contact (text) supplied as a number", data: { public_contact: 123 } },
		// Only the native 0/1 shapes are coerced on a boolean field; a
		// string or any other number reaches z.boolean() and is refused —
		// verified pinned behavior, not an extrapolation.
		{ label: "public_visible (boolean) supplied as a string", data: { public_visible: "false" } },
		{ label: "public_visible (boolean) supplied as a non-0/1 number", data: { public_visible: 2 } },
		// The accepted image-value boundary (T003/T006/T007): an object
		// without id and a non-string/non-object value reach the schema
		// unchanged and are refused. Bare strings are NOT asserted — the
		// documented media normalization path may accept them (the same
		// accepted V1 limitation boundary the authoring checks record).
		{ label: "profile_image (image) supplied as an object without id", data: { profile_image: {} } },
		{ label: "profile_image (image) supplied as a number", data: { profile_image: 123 } },
		// An integer field takes whole numbers only (src/schema/zod-generator.ts).
		{ label: "leadership_order (integer) supplied as a fraction", data: { leadership_order: 1.5 } },
		{ label: "leadership_order (integer) supplied as a string", data: { leadership_order: "1" } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
			data: { title: uniqueTitle(), ...fieldCase.data },
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Same-identity current-directory maintenance (Q2/FR-008/FR-009, SC-001)
// ---------------------------------------------------------------------------

test("assignment, unit and visibility changes update the SAME Personnel identity with a current native _rev", async () => {
	gatePersonnel();
	// 02 §8: ผู้บูริหารเป็น role/assignment view ไม่ใช่ Personnel type ใหม่ —
	// a changed leadership assignment is an UPDATE of the one Personnel
	// record, never another executive kind. Every edit below reuses the
	// single returned entry id with the helper's fresh-`_rev` re-read.
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
		data: {
			title,
			current_assignment: syntheticText("assignment-initial"),
			organizational_unit: syntheticText("unit-initial"),
			public_visible: true,
		},
	});
	expect(created.result.ok, "the initial Personnel fixture must save").toBe(true);
	const personId = created.entryId!;

	// The assignment changes on the same identity (fresh `_rev` supplied by
	// updateEntry's precondition re-read).
	const changed = await updateEntry(admin, PERSONNEL_COLLECTION, personId, {
		data: {
			current_assignment: syntheticText("assignment-updated"),
			organizational_unit: syntheticText("unit-updated"),
			public_visible: false,
		},
	});
	expect(
		changed.ok,
		"the assignment/unit/visibility change must save on the same Personnel identity",
	).toBe(true);

	const afterChange = await readEntry(admin, PERSONNEL_COLLECTION, personId);
	expect(afterChange.ok, "the same Personnel identity must be readable after the change").toBe(true);
	const afterChangeItem = nativeItemOf(afterChange);
	const afterChangeData = dataOfItem(afterChangeItem);
	expect(afterChangeItem?.id, "the read-back must be the SAME Personnel entry id").toBe(personId);
	expect(
		afterChangeData.current_assignment,
		"the current assignment must read back as the updated scalar value on the same identity",
	).toBe(syntheticText("assignment-updated"));
	expect(
		afterChangeData.organizational_unit,
		"the organizational unit must read back as the updated owner text",
	).toBe(syntheticText("unit-updated"));
	expect(
		afterChangeData.public_visible,
		"the revision-hydrated visibility change must read back as the supplied boolean false on the same identity",
	).toBe(false);
	// The untouched required display name survived an update that omitted
	// it (partial update mode), and the native `_rev` advanced on the same
	// identity — current-native-`_rev` maintenance, not a recreate.
	expect(
		afterChangeData.title,
		"an update omitting the title must leave the display name intact",
	).toBe(title);
	const revAfterChange = nativeRevOf(afterChange);
	expect(
		typeof revAfterChange === "string" && revAfterChange.length > 0 && revAfterChange !== created.rev,
		"the native _rev must have advanced on the same identity (no recreate)",
	).toBe(true);

	// The assignment ENDS: clearing the optional current assignment to null
	// is a valid Q2 update on the same identity — no end date, no retained
	// past-assignment record, no new directory entry (native editorial
	// revisions remain the traceability baseline; see the revision check).
	const ended = await updateEntry(admin, PERSONNEL_COLLECTION, personId, {
		data: { current_assignment: null },
	});
	expect(
		ended.ok,
		"ending the current assignment (clearing the optional field to null) must save on the same identity",
	).toBe(true);
	const afterEnd = await readEntry(admin, PERSONNEL_COLLECTION, personId);
	expect(afterEnd.ok, "the same Personnel identity must be readable after the assignment ends").toBe(true);
	const afterEndItem = nativeItemOf(afterEnd);
	const afterEndData = dataOfItem(afterEndItem);
	expect(afterEndItem?.id, "the ended-assignment record keeps the SAME Personnel entry id").toBe(personId);
	expect(
		afterEndData.current_assignment,
		"the ended assignment must read back as a cleared scalar (null), not a history entry",
	).toBe(null);
	expect(
		afterEndData.title,
		"the display name must remain on the same identity after the assignment ends",
	).toBe(title);
});

test("Personnel visibility changes leave the editing account's identity/permissions and the record's authorship unchanged", async () => {
	gatePersonnel();
	// FR-009 / 06 §6: a public job/assignment/status change neither
	// provisions or disables an editing account, redefines permissions, nor
	// erases authorship. The observable native evidence is the acting
	// account's live /auth/me identity (id/email/role) and the record's
	// native authorId, asserted BEFORE and AFTER the visibility edits. This
	// file itself performs no account/role operation at all — no user
	// provisioning, role change or impersonation exists here to observe.
	const before = await liveIdentityOf(admin);
	expect(
		before.role,
		"the acting development account is at its native Administrator level before the edits",
	).toBe(NATIVE_ROLES.administrator);

	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
		data: { title, public_visible: true },
	});
	expect(created.result.ok, "the initial Personnel fixture must save").toBe(true);
	const personId = created.entryId!;
	const initialRead = await readEntry(admin, PERSONNEL_COLLECTION, personId);
	expect(initialRead.ok, "the Personnel record must be readable before the edit").toBe(true);
	const initialAuthor = authorIdOfItem(nativeItemOf(initialRead));
	expect(
		typeof initialAuthor === "string" && initialAuthor.length > 0,
		"the Personnel record must carry its native authorship (authorId)",
	).toBe(true);

	// The public visibility/current-directory edit on the same identity.
	const edited = await updateEntry(admin, PERSONNEL_COLLECTION, personId, {
		data: { public_visible: false, current_assignment: syntheticText("assignment-after-visibility") },
	});
	expect(edited.ok, "the visibility/assignment edit must save").toBe(true);

	const afterRead = await readEntry(admin, PERSONNEL_COLLECTION, personId);
	expect(afterRead.ok, "the Personnel record must be readable after the edit").toBe(true);
	expect(
		authorIdOfItem(nativeItemOf(afterRead)),
		"native authorship must be unchanged by the assignment/visibility edit (no erased authorship)",
	).toBe(initialAuthor);

	const after = await liveIdentityOf(admin);
	expect(
		after.userId,
		"the editing account's native identity must be unchanged by Personnel visibility changes",
	).toBe(before.userId);
	expect(
		after.email,
		"the editing account's email must be unchanged by Personnel visibility changes",
	).toBe(before.email);
	expect(
		after.role,
		"the editing account's native role/permissions must be unchanged by Personnel visibility changes",
	).toBe(before.role);
	expect(
		after.role,
		"the role evidence is the live native value (a public job title never grants or revokes CMS permissions)",
	).toBe(NATIVE_ROLES.administrator);
});

test("native editorial revisions record the same-identity maintenance (traceability baseline, not an assignment-history feature)", async () => {
	gatePersonnel();
	// Q2/FR-008: no assignment-history feature exists — the traceability
	// baseline is the record's native editorial revision history (a bounded
	// 50-revision working history per the accepted T020 record, NOT a
	// retained past-assignment directory or D-ITA preservation). CREATE
	// stages no revision; the assignment change below stages the first.
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
		data: { title, current_assignment: syntheticText("assignment-initial") },
	});
	expect(created.result.ok, "the initial Personnel fixture must save").toBe(true);

	const initialRevisions = revisionsOf(await listRevisions(admin, PERSONNEL_COLLECTION, created.entryId!));
	expect(
		initialRevisions.ok,
		"the native revision listing must be readable for the Personnel record",
	).toBe(true);

	const changed = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { current_assignment: syntheticText("assignment-revised") },
	});
	expect(changed.ok, "the assignment change must save").toBe(true);

	const listing = revisionsOf(await listRevisions(admin, PERSONNEL_COLLECTION, created.entryId!));
	expect(listing.ok, "the native revision listing must be readable after the change").toBe(true);
	expect(
		listing.items.length,
		"the same-identity assignment change must be recorded as a native editorial revision",
	).toBeGreaterThan(initialRevisions.items.length);
	expect(listing.items.length).toBeGreaterThan(0);
	for (const revision of listing.items) {
		expect(
			revision.entryId,
			"every revision must belong to the SAME Personnel entry",
		).toBe(created.entryId);
		expect(
			revision.authorId,
			"every revision must carry its native authorship (the traceability baseline)",
		).toBe(admin.userId);
	}
	// The newest revision (the listing is newest-first) carries the changed
	// current assignment — the native traceability record of the edit. The
	// CURRENT read stays one scalar value on one identity: no history array,
	// no past-assignment entries.
	const newest = listing.items[0]!;
	expect(
		newest.data !== null && typeof newest.data === "object"
			? (newest.data as Record<string, unknown>).current_assignment
			: undefined,
		"the newest native revision must record the changed current assignment",
	).toBe(syntheticText("assignment-revised"));
	const read = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(read.ok, "the Personnel record must be readable").toBe(true);
	expect(
		dataOfItem(nativeItemOf(read)).current_assignment,
		"the current read stays the scalar current assignment (no assignment-history model exists)",
	).toBe(syntheticText("assignment-revised"));
});

// ---------------------------------------------------------------------------
// Refusal-family distinction controls
// ---------------------------------------------------------------------------

test("unauthenticated Save is an authorization refusal, distinct from native validation", async () => {
	// This control intentionally runs WITHOUT the personnel schema gate:
	// the native request path resolves authorization before the collection,
	// so an unauthenticated create is refused by the authorization layer
	// regardless of the personnel collection's T024 standing — keeping one
	// live check in every runtime run while never claiming personnel
	// coverage from it. The URL is built from the actor's origin (the
	// runner-configured origin the actor was pinned to in beforeAll); no
	// credential is sent, so nothing can leave the configured app.
	const url = new URL(
		`/_emdash/api/content/${PERSONNEL_COLLECTION}`,
		`${admin.baseUrl}/`,
	);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data: { title: uniqueTitle() } }),
		redirect: "error",
	});
	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch {
		parsed = { nonJsonBody: scrubEmbeddedSecrets(await response.text()) };
	}
	const result: NativeResult = { ok: response.ok, status: response.status, body: parsed };
	expect(
		result.status === 401 || result.status === 403,
		"an unauthenticated native save must be refused by the authorization layer (401/403)",
	).toBe(true);
	expect(result.ok, "an unauthenticated native save must not be reported as success").toBe(false);
	const error = result.body as { error?: { code?: unknown } };
	expect(
		error?.error?.code,
		"the authorization refusal must carry its native error code (not VALIDATION_ERROR)",
	).toBeTruthy();
	expect(
		error?.error?.code,
		"an authorization refusal must not be mistaken for a field-validation refusal",
	).not.toBe("VALIDATION_ERROR");
});

test("a stale _rev assignment update is a native state conflict, distinct from validation and authorization", async () => {
	gatePersonnel();
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, { data: { title } });
	expect(created.result.ok, "the valid Personnel draft fixture must save").toBe(true);

	// Consume the create `_rev` with a first assignment update (updateEntry
	// re-reads a fresh one), then replay the ORIGINAL token: the platform
	// must refuse the stale precondition as a native CONFLICT — a state
	// refusal, not a field-validation (400 VALIDATION_ERROR), authorization
	// (401/403) or missing-schema (404) outcome. The full
	// revision/lock/concurrency surface is T020's; this is the one family
	// distinction the same-identity `_rev` discipline needs.
	const stale = created.rev!;
	const first = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { current_assignment: syntheticText("assignment-first") },
	});
	expect(first.ok, "the first assignment update with a fresh `_rev` must succeed").toBe(true);

	const replay = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { current_assignment: syntheticText("assignment-replay") },
		rev: stale,
	});
	expect(
		replay.ok,
		"a stale `_rev` assignment update must be refused, not reported as success",
	).toBe(false);
	expect(replay.status, "a stale precondition refusal is the native 409 CONFLICT family").toBe(409);
	expect(
		replay.status === 400 || replay.status === 401 || replay.status === 403 || replay.status === 404,
		"a state conflict must stay distinguishable from validation (400), authorization (401/403) and missing-schema (404)",
	).toBe(false);
	const error = replay.body as { error?: { code?: unknown } };
	expect(error?.error?.code, "the refusal must carry the native CONFLICT code").toBe("CONFLICT");
});
