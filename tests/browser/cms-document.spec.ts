// Saving a Document (Feature 002 T003; specs/002-cms-content-model/, data-model.md, the
// `documents` row; `02` §13 and §20).
//
// The suite checks the native save of the shared `documents` collection: a missing, null or empty
// title, a missing, null or empty-object file, invalid supplied types, select values and dates,
// and an invalid clear of the title or file are refused as native validation; a valid uploaded
// media `id`, the optional values and the permitted omissions save. An unauthenticated save is
// refused by the authorization layer instead, and every validation refusal is checked not to be
// one. A saved file selection proves only that the save accepted the media id: no immutability or
// continued byte availability is asserted. Publishing, lifecycle and public reads belong to other
// suites.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A create validates with `partial: false` and an update with `partial: true`, so an update may
//   omit an unchanged required field but every supplied value is checked, including an invalid
//   clear (src/emdash-runtime.ts handleContentCreate, handleContentUpdate).
// - A refused value answers 400 VALIDATION_ERROR with `details.issues`
//   (src/api/handlers/validation.ts validateContentData; src/api/errors.ts mapErrorStatus). An
//   empty string on a required field is refused, although z.string() accepts "".
// - A file value is an object whose required member is a string media `id`
//   (src/schema/zod-generator.ts). Media normalization runs first and turns a bare string into an
//   external file value and `{ id: 123 }` into `{ id: "", provider: "local" }`
//   (src/media/normalize.ts), so `file: ""`, `file: "not-an-object"` and `file: { id: 123 }` save
//   with those degenerate values, a V1 limitation the Product Owner accepted. Such a value selects
//   no file.
// - string, integer, datetime (with an offset) and select fields map to z.string(),
//   z.number().int(), z.iso.datetime({ offset: true }) and z.enum (zod-generator.ts).
// - An unauthenticated request is refused 401 and an insufficient one 403 FORBIDDEN
//   (src/api/authorize.ts); an unknown collection answers 404 COLLECTION_NOT_FOUND, which the
//   schema gate reports as a skip, never a PASS.
// - GET /_emdash/api/schema/collections/{slug}?includeFields=true lists the fields
//   (src/api/handlers/schema.ts handleSchemaCollectionGet).
//
// Credentials and fixtures: the development Administrator PAT (SONGHEALTH_DEV_ACCESS) acts on the
// configured origin, and no role boundary is claimed from it. Fixtures are synthetic; cleanup runs
// after every test, passed or failed, and again in afterAll, and beforeAll creates none.

import { expect, test } from "@playwright/test";

import {
	anonymousRequest,
	cleanupOwnedFixtures,
	createSyntheticEntry,
	cmsRequest,
	devAdminActor,
	expectAuthorizationRefusal,
	expectValidationRefusal,
	nativeItemOf,
	readEntry,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Constants and shared local helpers
// ---------------------------------------------------------------------------

/** The shared native Document collection under check (data-model.md row). */
const DOCUMENT_COLLECTION = "documents";

/** Approved `domain_status` select values (data-model.md; 02 §13). */
const DOMAIN_STATUS_OPTION = "current";

/**
 * Readiness state for the `documents` collection, decided once per worker in
 * beforeAll from the live native schema read.
 */
type SchemaReadiness =
	{ outcome: "ready" } | { outcome: "missing" } | { outcome: "misconfigured"; detail: string };

/** The development-credential fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Set by beforeAll; consumed by the per-test readiness gate. */
let documentsSchema: SchemaReadiness = { outcome: "missing" };

/** One clearly synthetic unique Document title (never real editorial data). */
function uniqueTitle(): string {
	return `${SYNTHETIC_FIXTURE_MARK} document ${crypto.randomUUID().slice(0, 8)}`;
}

/** A valid native file value for an uploaded fixture media id. */
function fileValueFor(mediaId: string): { id: string } {
	return { id: mediaId };
}

/**
 * Truthful schema gate for every Document Save check: a missing `documents`
 * collection is the T005/T006 schema prerequisite outstanding and SKIPS
 * explicitly (never a field-validation failure, never PASS); a present but
 * wrongly-configured collection FAILS loudly instead of producing wrong
 * validation expectations from an unmatched schema. Every field this file
 * exercises is verified present with its approved native type (and the
 * `domain_status` select options), so a supplied-value refusal can only ever
 * be about the VALUE — an absent field (whose supplied key would surface as
 * the same VALIDATION_ERROR family via "unknown_field") cannot masquerade as
 * a type/select/date check.
 */
function gateDocumentsSchema(): void {
	test.skip(
		documentsSchema.outcome === "missing",
		"the documents collection is not initialized in the active native schema (T005/T006 schema prerequisite outstanding; this run cannot exercise Document Save validation)",
	);
	if (documentsSchema.outcome === "misconfigured") {
		throw new Error(
			`the active native documents collection does not match the approved definitions: ${documentsSchema.detail}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Worker setup: development access and one live schema-readiness read
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// The development Administrator: an unreachable app or an unverified identity fails every test
	// here, never as a validation result. This hook creates no owned fixtures, only a schema read.
	admin = await devAdminActor();

	// One live schema read decides readiness. The credential's effective
	// permissions are proven by the native responses themselves; the request
	// stays inside the configured app's native API.
	const schemaRead = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${DOCUMENT_COLLECTION}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (schemaRead.status === 404) {
		// COLLECTION_NOT_FOUND: the shared native definitions are not applied
		// yet. T003 authors the checks; T005 defines and T006 inspects/applies
		// the schema and runs them. Skipping here is the truthful outcome.
		documentsSchema = { outcome: "missing" };
		return;
	}
	expect(
		schemaRead.ok,
		`reading the native documents collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
	).toBe(true);
	const fields = nativeItemOf(schemaRead)?.fields;
	expect(Array.isArray(fields), "the schema read must include fields").toBe(true);
	type SchemaField = {
		slug?: unknown;
		type?: unknown;
		required?: unknown;
		validation?: { options?: unknown };
	};
	const bySlug = new Map<string, SchemaField>();
	for (const field of fields as SchemaField[]) {
		if (typeof field.slug === "string") bySlug.set(field.slug, field);
	}
	const problems: string[] = [];
	const titleField = bySlug.get("title");
	if (titleField?.type !== "string" || titleField.required !== true) {
		problems.push("title must be a required native string field");
	}
	const fileField = bySlug.get("file");
	if (fileField?.type !== "file" || fileField.required !== true) {
		problems.push("file must be a required native file field");
	}
	if (bySlug.get("document_at")?.type !== "datetime") {
		problems.push("document_at must exist as a native datetime field");
	}
	if (bySlug.get("fiscal_year")?.type !== "integer") {
		problems.push("fiscal_year must exist as a native integer field");
	}
	const domainStatus = bySlug.get("domain_status");
	if (domainStatus?.type !== "select") {
		problems.push("domain_status must exist as a native select field");
	} else {
		const options = domainStatus.validation?.options;
		const approved = ["current", "superseded", "expired"];
		if (!Array.isArray(options) || !approved.every((value) => options.includes(value))) {
			problems.push("domain_status must offer the approved options current/superseded/expired");
		}
	}
	documentsSchema =
		problems.length > 0
			? { outcome: "misconfigured", detail: problems.join("; ") }
			: { outcome: "ready" };
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup (corrective round 1, finding 1)
// ---------------------------------------------------------------------------
//
// Cleanup runs as guaranteed TEARDOWN for the actor that created the
// fixtures, never as a trailing ordinary test: a test-scoped afterEach runs
// in the same worker after EVERY test — passed, failed, or individually
// selected by a filter — and Playwright discards a failed test's worker only
// for LATER tests, after this hook has already reconciled that worker's
// registry (docs/test-retries#failures). The afterAll safety net afterwards
// retries anything still registered (the T002 registry retains unresolved
// ids exactly for that). Unresolved cleanup fails the run truthfully. Only
// the T002 owned-fixture registry is ever touched.

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) {
		return;
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	// Secret-free redacted evidence line for the run output.
	console.log(
		`[cms-document] owned-fixture cleanup after test: ${
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
// Precondition
// ---------------------------------------------------------------------------

test("documents schema precondition: required title/file configuration is active", () => {
	gateDocumentsSchema();
	// gateDocumentsSchema skips when the collection is missing and throws when
	// it is misconfigured; reaching here with outcome "ready" is the asserted
	// precondition itself (title string S + file file S per data-model.md).
	expect(documentsSchema.outcome).toBe("ready");
});

// ---------------------------------------------------------------------------
// Valid controls — proof that saves DO succeed with this actor, fresh `_rev`
// preconditions and returned IDs, so the refusals below are field-validation
// outcomes and not authorization, stale-state or runtime artifacts
// ---------------------------------------------------------------------------

test("valid control: minimal Document saves with only required fields and permitted optional omissions", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(
		upload.result.ok,
		"the synthetic fixture media upload must succeed (an owned fixture for the valid file selection)",
	).toBe(true);
	expect(
		upload.mediaId,
		"a media id must be returned by the native response and registered for owned cleanup",
	).toBeTruthy();

	// Only `title` and `file` supplied: summary, document_at, fiscal_year,
	// owner_source, domain_status, document_type/topic classifications and the
	// successor relation are all permitted omissions at native save.
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title, file: fileValueFor(upload.mediaId!) },
	});
	expect(created.result.ok, "the minimal valid Document must save").toBe(true);
	expect(created.result.status, "a native create succeeds with 201").toBe(201);
	expect(created.entryId, "the entry id must come from the native response").toBeTruthy();
	expect(created.rev, "a native `_rev` must be returned").toBeTruthy();

	// Read back with returned IDs only. The file value carries the uploaded
	// media id — this asserts the SELECTION shape only; it deliberately does
	// not assert anything about the media bytes, their immutability or their
	// continued availability (D-REF stays deferred).
	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the saved Document must be readable by returned id").toBe(true);
	const data = nativeItemOf(read)?.data as Record<string, unknown> | undefined;
	expect(data).toMatchObject({ title, file: fileValueFor(upload.mediaId!) });
});

test("valid control: optional supplied values save (summary, offset-aware datetime, integer year, owner, select)", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);

	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: {
			title,
			file: fileValueFor(upload.mediaId!),
			summary: `${SYNTHETIC_FIXTURE_MARK} summary`,
			// Domain dates are native offset-aware datetimes (data-model.md);
			// an explicit +07:00 offset is the valid supplied form.
			document_at: "2026-10-15T10:00:00+07:00",
			fiscal_year: 2568,
			owner_source: `${SYNTHETIC_FIXTURE_MARK} owner`,
			domain_status: DOMAIN_STATUS_OPTION,
		},
	});
	expect(
		created.result.ok,
		"valid supplied optional values must save alongside the required fields",
	).toBe(true);
	expect(created.entryId).toBeTruthy();
});

test("valid control: an update may omit unchanged required fields", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title: uniqueTitle(), file: fileValueFor(upload.mediaId!) },
	});
	expect(created.result.ok, "the valid Document fixture must save").toBe(true);

	// Native update validation is partial (pinned 1.1.0): required fields are
	// only checked when present in `data`, so omitting the unchanged
	// title/file is permitted (native-editorial.md "Native Request Shapes").
	// updateEntry supplies a fresh re-read `_rev` for the precondition.
	const updated = await updateEntry(admin, DOCUMENT_COLLECTION, created.entryId!, {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} updated summary` },
	});
	expect(
		updated.ok,
		"an update omitting unchanged required fields must succeed with a fresh `_rev`",
	).toBe(true);

	// Re-read with the returned id: the omitted required values are intact.
	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the updated Document must still be readable").toBe(true);
	const data = nativeItemOf(read)?.data as { title?: unknown; file?: { id?: unknown } } | undefined;
	expect(data?.title, "the omitted required title must remain").toBeTruthy();
	expect(data?.file?.id, "the omitted required file selection must remain").toBe(upload.mediaId);
});

// ---------------------------------------------------------------------------
// Required-title Save refusals (create)
// ---------------------------------------------------------------------------

test("create refuses missing, null and empty required title", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title omitted", data: { file: fileValueFor(upload.mediaId!) } },
		{ label: "title null", data: { title: null, file: fileValueFor(upload.mediaId!) } },
		{ label: "title empty string", data: { title: "", file: fileValueFor(upload.mediaId!) } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Required-file Save refusals (create): missing/null/empty-object file values
// ---------------------------------------------------------------------------
//
// CORRECTIVE ROUND 1 (approval 01a13ed2…; wording narrowed round 2): the
// three formerly asserted "malformed" shapes that the pinned platform
// actually ACCEPTS via its documented create/update-time media value
// normalization moved out of this refusal loop into the focused normalization
// regression tests below — the exact inputs file:"" and file:"not-an-object"
// (strings that are neither http(s) URLs, internal media URLs nor resolvable
// local media IDs → {provider:"external", id:"", src:<the string>}) and
// file:{id:123} with no explicit provider/src → {id:"", provider:"local"}.
// These are observed results for those exact inputs, NOT universal rules.
// Genuine native refusals are retained
// here exactly as before: omitted, null, and an object with neither id nor src.

test("create refuses missing, null and empty-object required file values", async () => {
	gateDocumentsSchema();
	const title = uniqueTitle();
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "file omitted", data: { title } },
		{ label: "file null", data: { title, file: null } },
		{ label: "file object without id", data: { title, file: {} } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Accepted V1 limitation (corrective round 1): pinned native media value
// normalization precedes field validation, so three malformed RAW inputs are
// accepted and stored as their normalized representations. One focused
// regression test per input, each asserting the exact stored value through
// native read-back. These assertions document the normalization boundary:
// an empty id/src is a degenerate stored reference, NOT a selection of any
// real available file, and confers no file-availability/retention guarantee
// (D-REF stays deferred).
// ---------------------------------------------------------------------------

test("accepted V1 limitation: bare empty-string file input stores an empty external reference, not a real file selection", async () => {
	gateDocumentsSchema();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title: uniqueTitle(), file: "" },
	});
	expect(
		created.result.ok,
		"file:'' is accepted by the pinned platform's documented normalization (URL-input path) and the Product Owner accepts this as a V1 limitation",
	).toBe(true);
	expect(created.result.status).toBe(201);
	expect(
		created.entryId,
		"the accepted create must return a native entry id for read-back",
	).toBeTruthy();

	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the stored Document must be readable by returned id").toBe(true);
	const file = (nativeItemOf(read)?.data as Record<string, unknown> | undefined)?.file;
	expect(file, "the stored file value must be the normalized representation").toEqual({
		provider: "external",
		id: "",
		src: "",
	});
	expect(
		(file as { id?: unknown })?.id,
		"the normalized empty-string input selects NO real file: its id is empty",
	).toBe("");
});

test("accepted V1 limitation: bare non-URL string file input stores the string as an external src with empty id", async () => {
	gateDocumentsSchema();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title: uniqueTitle(), file: "not-an-object" },
	});
	expect(
		created.result.ok,
		"a bare non-URL string is the documented URL-input shape, normalized before validation; acceptance is a Product-Owner-approved V1 limitation",
	).toBe(true);
	expect(created.result.status).toBe(201);
	expect(created.entryId).toBeTruthy();

	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the stored Document must be readable by returned id").toBe(true);
	const file = (nativeItemOf(read)?.data as Record<string, unknown> | undefined)?.file;
	expect(
		file,
		"the stored file value must preserve the raw string as src under the external provider",
	).toEqual({
		provider: "external",
		id: "",
		src: "not-an-object",
	});
	expect(
		(file as { id?: unknown })?.id,
		"an empty id is not a media selection: this documents normalization, never a real available file",
	).toBe("");
});

test("accepted V1 limitation: non-string file id is coerced to an empty local-provider id", async () => {
	gateDocumentsSchema();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title: uniqueTitle(), file: { id: 123 } },
	});
	expect(
		created.result.ok,
		'the pinned normalization coerces a non-string id object to {id:"", provider:"local"}; acceptance is a Product-Owner-approved V1 limitation',
	).toBe(true);
	expect(created.result.status).toBe(201);
	expect(created.entryId).toBeTruthy();

	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the stored Document must be readable by returned id").toBe(true);
	const file = (nativeItemOf(read)?.data as Record<string, unknown> | undefined)?.file;
	expect(
		file,
		"the stored file value must be the coerced local-provider representation with an empty id",
	).toEqual({
		id: "",
		provider: "local",
	});
	expect(
		(file as { id?: unknown })?.id,
		"the coerced empty id selects NO local media item: this documents normalization, never a real available file",
	).toBe("");
});

// ---------------------------------------------------------------------------
// Invalid clears of required values on update
// ---------------------------------------------------------------------------

test("update refuses invalid clearing of required title and file", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const title = uniqueTitle();
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title, file: fileValueFor(upload.mediaId!) },
	});
	expect(created.result.ok, "the valid Document fixture must save").toBe(true);

	// Each case is its own update with a fresh `_rev` (updateEntry re-reads),
	// so a refusal is about the supplied value, never a stale precondition.
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "file cleared to null", data: { file: null } },
		{ label: "file cleared to an object without id", data: { file: {} } },
		{ label: "title cleared to empty string", data: { title: "" } },
		{ label: "title cleared to null", data: { title: null } },
	];
	for (const fieldCase of cases) {
		const refusal = await updateEntry(admin, DOCUMENT_COLLECTION, created.entryId!, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal, fieldCase.label);
	}

	// Uncertain outcomes are re-read (tasks.md shared constraints): after the
	// refused clears, the required values are still in place on the entry.
	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the Document must remain readable after refused clears").toBe(true);
	const data = nativeItemOf(read)?.data as { title?: unknown; file?: { id?: unknown } } | undefined;
	expect(data?.title, "the refused title clear must not have taken effect").toBe(title);
	expect(data?.file?.id, "the refused file clear must not have taken effect").toBe(upload.mediaId);
});

// ---------------------------------------------------------------------------
// Supplied invalid field types, select values and dates
// ---------------------------------------------------------------------------

test("create refuses supplied invalid types, select values and dates", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const valid = (): Record<string, unknown> => ({
		title: uniqueTitle(),
		file: fileValueFor(upload.mediaId!),
	});
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title supplied as a number", data: { ...valid(), title: 123 } },
		{
			label: "fiscal_year supplied as a string",
			data: { ...valid(), fiscal_year: "not-a-number" },
		},
		{
			label: "fiscal_year supplied as a non-integer number",
			data: { ...valid(), fiscal_year: 2568.5 },
		},
		{
			label: "domain_status supplied outside the approved select options",
			data: { ...valid(), domain_status: `${SYNTHETIC_FIXTURE_MARK}-not-an-option` },
		},
		{
			label: "document_at supplied as a non-datetime string",
			data: { ...valid(), document_at: "not-a-datetime" },
		},
		{
			label: "document_at supplied without a timezone offset",
			data: { ...valid(), document_at: "2026-10-15T10:00:00" },
		},
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
	}
});

test("update refuses a representative supplied invalid select value", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title: uniqueTitle(), file: fileValueFor(upload.mediaId!) },
	});
	expect(created.result.ok, "the valid Document fixture must save").toBe(true);

	// Update validation also type-checks every SUPPLIED value (partial mode),
	// so an invalid select value is refused on update as well.
	const refusal = await updateEntry(admin, DOCUMENT_COLLECTION, created.entryId!, {
		data: { domain_status: `${SYNTHETIC_FIXTURE_MARK}-not-an-option` },
	});
	expectValidationRefusal(
		refusal,
		"domain_status supplied outside the approved select options on update",
	);
});

// ---------------------------------------------------------------------------
// Authorization-failure control — the other side of the distinction
// ---------------------------------------------------------------------------

test("unauthenticated Save is an authorization refusal, distinct from native validation", async () => {
	gateDocumentsSchema();
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);

	// One unauthenticated request to the same native endpoint with a VALID
	// body: only the authorization layer can refuse it. The URL is built from
	// the actor's origin — the runner-configured origin the actor was pinned
	// to in beforeAll — plus the native API path (the same on-origin
	// discipline as the T002 helpers); no credential is sent, so nothing can
	// leave the configured app. Pinned 1.1.0: requirePerm answers
	// UNAUTHORIZED 401 for an anonymous caller (FORBIDDEN 403 for an
	// authenticated insufficient permission).
	const result = await anonymousRequest(
		admin.baseUrl,
		`/_emdash/api/content/${DOCUMENT_COLLECTION}`,
		{
			method: "POST",
			body: {
				data: { title: uniqueTitle(), file: fileValueFor(upload.mediaId!) },
			},
		},
	);
	expectAuthorizationRefusal(result, "an unauthenticated native save");
});
