// Reuse of Documents and media (Feature 002 T014, US2, FR-004–FR-007; specs/002-cms-content-model/,
// data-model.md, the documents, services and health_reports rows and the Native Relationship
// Accounting table; contracts/public-read.md; `02` §13, §14, §16 and §20).
//
// The suite checks, over the native content and media APIs:
// - one Document and its file selected unchanged from an Announcement, a Service and a Health
//   Report, with no duplicate Document or media record;
// - raw media reused without a Document, its alt text and caption maintained, its MIME type,
//   size and dimensions read back, and its usage count read as an opt-in of the documented shape;
// - a Document's domain status and successor kept apart from its publication state;
// - the Health Report's required `report_document`: an omitted, empty, wrong-target or excessive
//   selection and an invalid clear refused; a valid selection lets a draft be otherwise
//   incomplete, and optional relations may stay empty;
// - publishing rechecks requiredness and cardinality, so a Report whose only target was purged is
//   refused re-publication, while scheduling applies no reference check;
// - removing or replacing a target or a media item is not vetoed, and the selection keeps its
//   identity with no promise of availability.
// No availability, immutability or atomicity is asserted, and no custom publish predicate exists
// or is expected.
//
// Platform behaviour relied on (emdash 1.1.0):
// - validateReferenceSelection refuses an over-limit or, on a required field, empty selection
//   with VALIDATION_ERROR, and validateRequiredReferencesPresent a create that omits a required
//   field's key; cardinality lives on the relation (src/api/handlers/validate-references.ts).
// - Selected ids resolve within the relation's other collection, so an unknown id and another
//   collection's id are both refused 404 NOT_FOUND; a field that is not a reference field is
//   400 VALIDATION_ERROR. An update resolves only the supplied keys: an omitted key keeps the
//   selection and an empty array clears it (src/api/handlers/relations.ts,
//   src/api/handlers/content.ts).
// - Publishing revalidates the staged selection, or with nothing staged the live edges, then
//   promotes it, and re-publishing keeps `published_at` (src/api/handlers/staged-references.ts
//   validateStagedReferences, handleContentPublish). Scheduling checks no references, keeps a
//   published entry `published` and refuses a non-future time (handleContentSchedule).
// - Purging the last row of a translation group clears its live reference edges first
//   (handleContentPermanentDelete clearReferencesForGroup); trash, purge and media deletion carry
//   no consumer veto.
// - A read by a drafts reader answers a pending draft as `data` and the published values as
//   `liveData` (src/emdash-runtime.ts hydrateDraftData). The relation children listing prefers a
//   draft's staged page and leaves out trashed targets.
// - GET /_emdash/api/content/{collection}?q=…&status=all and GET /_emdash/api/media?q=… (cursor
//   pages) find duplicates by the fixture's unique title or filename.
// - Media items carry filename, mimeType, size, width, height, alt and caption; PUT
//   /_emdash/api/media/{id} sets alt and caption; upload reads the dimensions from the bytes
//   (src/media/enrich.ts). `?includeUsage=1` adds `usage: { count, coverage }`, where count is a
//   number only with complete coverage, so no immediacy or exact count is asserted. PUT
//   …/{id}/replace swaps the bytes under the same id and storage key and needs the same MIME
//   type.
//
// Credentials and fixtures: the development Administrator PAT (SONGHEALTH_DEV_ACCESS) acts on the
// configured origin, and no role boundary is claimed from it. Fixtures are synthetic; cleanup runs
// after every test, passed or failed, and again in afterAll, including the entries a maintenance
// case leaves in Trash. beforeAll creates none.

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createSyntheticEntry,
	devAdminActor,
	nativeDataOf,
	nativeItemOf,
	nativeItemsOf,
	permanentlyDeleteEntry,
	publishEntry,
	readEntry,
	readMedia,
	scheduleEntry,
	trashEntry,
	unscheduleEntry,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Collections, relations and fixture constants (data-model.md rows)
// ---------------------------------------------------------------------------

/** The shared native Document collection (T005/T006, live at this baseline). */
const DOCUMENT_COLLECTION = "documents";

/** US1 collections live at this baseline; US2 collections arrive with T015–T017. */
const ANNOUNCEMENT_COLLECTION = "announcements";
const NEWS_COLLECTION = "news";
const SERVICE_COLLECTION = "services";
const REPORT_COLLECTION = "health_reports";

/** The four relations this file exercises, with their bound selecting fields. */
const SUCCESSOR_RELATION = {
	collection: DOCUMENT_COLLECTION,
	field: "successor",
	relation: "document_successor",
};
const ANNOUNCEMENT_DOCUMENTS_RELATION = {
	collection: ANNOUNCEMENT_COLLECTION,
	field: "documents",
	relation: "announcement_documents",
};
const SERVICE_DOCUMENTS_RELATION = {
	collection: SERVICE_COLLECTION,
	field: "documents",
	relation: "service_documents",
};
const REPORT_DOCUMENT_RELATION = {
	collection: REPORT_COLLECTION,
	field: "report_document",
	relation: "report_document",
};

/**
 * Canonical 1×1 opaque-white PNG — the replacement fixture for the media
 * maintenance observation. A genuinely DIFFERENT byte stream from the
 * transparent canonical upload fixture (70 versus 68 bytes), valid PNG, same
 * image/png MIME (the pinned replace route requires the replacement MIME to
 * match), same 1×1 dimensions. Clearly synthetic public-publishable data.
 */
const REPLACEMENT_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function replacementPngBytes(): Uint8Array<ArrayBuffer> {
	const binary = atob(REPLACEMENT_PNG_BASE64);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
	validation?: { options?: unknown; relation?: unknown };
}

/**
 * Readiness for one exercised collection, decided once per worker in beforeAll
 * from the live native schema read: `missing` (collection not initialized —
 * the owning definition task outstanding) SKIPS explicitly; `misconfigured`
 * (present but not matching the approved definition this file relies on)
 * FAILS loudly so an unexpected schema mismatch stays visible.
 */
type CollectionReadiness =
	{ outcome: "ready" } | { outcome: "missing" } | { outcome: "misconfigured"; detail: string };

/** The development-credential fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Per-collection readiness, keyed by collection slug; set by beforeAll. */
const readiness = new Map<string, CollectionReadiness>();

/** Readiness of one collection, defaulting to missing before beforeAll completes. */
function readinessOf(collection: string): CollectionReadiness {
	return readiness.get(collection) ?? { outcome: "missing" };
}

/**
 * Truthful schema gate for one collection: a missing collection is the owning
 * definition task's prerequisite outstanding and SKIPS explicitly (at this
 * baseline `services`/`health_reports` and their relations are T015–T017
 * scope; T018 applies and runs them); a present but wrongly-configured
 * collection FAILS loudly instead of producing wrong expectations.
 */
function gateCollection(collection: string, owner: string): void {
	const state = readinessOf(collection);
	test.skip(
		state.outcome === "missing",
		`the ${collection} collection is not initialized in the active native schema (${owner} prerequisite outstanding; this run cannot exercise ${collection} reuse)`,
	);
	if (state.outcome === "misconfigured") {
		throw new Error(
			`the active native ${collection} collection does not match the approved definitions: ${state.detail}`,
		);
	}
}

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** A valid native file/image value for an uploaded fixture media id. */
function fileValueFor(mediaId: string): { id: string } {
	return { id: mediaId };
}

/**
 * Create one owned synthetic Document fixture (uploaded media file + required
 * title) in the shared collection and return its returned identities plus
 * the marker-unique title/filename the duplicate checks list by. Only called
 * inside test bodies, never beforeAll.
 */
async function createOwnedDocument(): Promise<{
	entryId: string;
	mediaId: string;
	title: string;
	filename: string;
}> {
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	expect(
		upload.mediaId,
		"a media id must be returned by the native response and registered for owned cleanup",
	).toBeTruthy();
	const title = uniqueTitle(DOCUMENT_COLLECTION);
	const created = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: { title, file: fileValueFor(upload.mediaId!) },
	});
	expect(
		created.result.ok,
		"the synthetic Document fixture must save in the shared documents collection",
	).toBe(true);
	expect(created.entryId, "the Document id must come from the native response").toBeTruthy();
	// The returned filename is REQUIRED, not optional (corrective round 1,
	// finding F2): it is the exact identity the zero-duplicate media check
	// lists by, and an absent filename must fail loudly rather than silently
	// bypass that check.
	const filename = nativeItemOf(upload.result)?.filename;
	if (typeof filename !== "string" || filename.length === 0) {
		throw new Error(
			"the media upload response must carry the fixture's non-empty native filename (the identity the zero-duplicate media check lists by)",
		);
	}
	return {
		entryId: created.entryId!,
		mediaId: upload.mediaId!,
		title,
		filename,
	};
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertions (the same contracts as T003/T007)
// ---------------------------------------------------------------------------

/**
 * A native field-validation refusal: HTTP 400 with the VALIDATION_ERROR code,
 * and explicitly NOT an authorization (401/403) or state-conflict (409)
 * refusal — so authorization and concurrency problems can never masquerade as
 * reference-validation outcomes (and vice versa).
 */
function expectValidationRefusal(result: NativeResult, caseLabel: string): void {
	expect(result.ok, `${caseLabel}: the native save must be refused, not reported as success`).toBe(
		false,
	);
	expect(result.status, `${caseLabel}: a native validation refusal is HTTP 400`).toBe(400);
	expect(
		result.status === 401 || result.status === 403 || result.status === 409,
		`${caseLabel}: a validation refusal must stay distinguishable from authorization (401/403) and state-conflict (409) failures`,
	).toBe(false);
	const error = result.body as { success?: unknown; error?: { code?: unknown } };
	expect(
		error?.error?.code,
		`${caseLabel}: the refusal must carry the native VALIDATION_ERROR code`,
	).toBe("VALIDATION_ERROR");
}

/**
 * A native reference-target refusal: HTTP 404 with a NOT_FOUND-family code,
 * and explicitly NOT success and NOT an authorization failure. (Pinned 1.1.0:
 * an unknown selected id AND a valid id belonging to another collection both
 * fail resolution inside the relation's target collection and are refused
 * `404 NOT_FOUND` by resolveReferenceTargets — the truthful "wrong target"
 * family; no separate fabricated error code is asserted.)
 */
function expectTargetRefusal(result: NativeResult, caseLabel: string): void {
	expect(result.ok, `${caseLabel}: the native save must be refused, not reported as success`).toBe(
		false,
	);
	expect(result.status, `${caseLabel}: an unresolvable reference target is refused with 404`).toBe(
		404,
	);
	expect(
		result.status === 401 || result.status === 403,
		`${caseLabel}: a target refusal must stay distinguishable from an authorization failure`,
	).toBe(false);
	const error = result.body as { success?: unknown; error?: { code?: unknown } };
	expect(
		typeof error?.error?.code === "string" && error.error.code.includes("NOT_FOUND"),
		`${caseLabel}: the refusal must carry a native NOT_FOUND-family code`,
	).toBe(true);
}

/**
 * Read a saved selection back through the native relation children listing
 * and return the resolved child ids (the returned identities only — never an
 * availability claim about any child).
 */
async function selectedChildIds(
	collection: string,
	entryId: string,
	relation: string,
): Promise<string[]> {
	const children = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(entryId)}/references/${encodeURIComponent(relation)}/children`,
	);
	expect(
		children.ok,
		`${collection}/${entryId}: the saved selection must be readable through the native relation children listing`,
	).toBe(true);
	const listed = nativeDataOf(children)?.children;
	expect(
		Array.isArray(listed),
		`${collection}/${entryId}: the children read must return its documented array`,
	).toBe(true);
	return (listed as Array<{ id?: unknown }>)
		.map((child) => child.id)
		.filter((id): id is string => typeof id === "string");
}

/**
 * Count entries in a collection whose display fields match an exact synthetic
 * marker-unique text (native listing, status=all) — the supported read behind
 * the zero-duplicate assertions. The listing itself is asserted successful,
 * so an unreadable listing fails the caller rather than reading as zero.
 */
async function countListedByQuery(collection: string, text: string): Promise<number> {
	const listed = await cmsRequest(admin, `/_emdash/api/content/${encodeURIComponent(collection)}`, {
		searchParams: { q: text, status: "all" },
	});
	expect(
		listed.ok,
		`${collection}: the native listing used for the duplicate check must succeed`,
	).toBe(true);
	return nativeItemsOf(listed).length;
}

// ---------------------------------------------------------------------------
// Worker setup: development access and the live schema reads
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// The development Administrator. This hook creates no owned fixtures, only reads, so a partial
	// setup leaves nothing for teardown to miss.
	admin = await devAdminActor();

	// One live schema read per exercised collection decides its readiness.
	// Each check names only the UNCONDITIONAL approved fields the checks below
	// rely on, so a supplied-value or selection refusal can only ever be about
	// the value/selection — an absent field cannot masquerade as one.
	const expectations: Array<{
		collection: string;
		owner: string;
		checks: Array<(bySlug: Map<string, SchemaField>) => string | null>;
	}> = [
		{
			collection: DOCUMENT_COLLECTION,
			owner: "T005/T006",
			checks: [
				(bySlug) => {
					const title = bySlug.get("title");
					return title?.type === "string" && title.required === true
						? null
						: "title must be a required native string field";
				},
				(bySlug) => {
					const file = bySlug.get("file");
					return file?.type === "file" && file.required === true
						? null
						: "file must be a required native file field";
				},
				(bySlug) => {
					const domainStatus = bySlug.get("domain_status");
					if (domainStatus?.type !== "select")
						return "domain_status must exist as a native select field";
					const options = domainStatus.validation?.options;
					const approved = ["current", "superseded", "expired"];
					return Array.isArray(options) && approved.every((value) => options.includes(value))
						? null
						: "domain_status must offer the approved options current/superseded/expired";
				},
				(bySlug) => {
					const successor = bySlug.get(SUCCESSOR_RELATION.field);
					return successor?.type === "reference" &&
						successor.validation?.relation === SUCCESSOR_RELATION.relation
						? null
						: "successor must be a native reference field bound to the document_successor relation";
				},
			],
		},
		{
			collection: ANNOUNCEMENT_COLLECTION,
			owner: "T011/T013",
			checks: [
				(bySlug) => {
					const title = bySlug.get("title");
					return title?.type === "string" && title.required === true
						? null
						: "title must be a required native string field";
				},
				(bySlug) => {
					const documents = bySlug.get(ANNOUNCEMENT_DOCUMENTS_RELATION.field);
					return documents?.type === "reference" &&
						documents.validation?.relation === ANNOUNCEMENT_DOCUMENTS_RELATION.relation &&
						documents.required !== true
						? null
						: "documents must be an optional native reference field bound to the announcement_documents relation";
				},
			],
		},
		{
			collection: NEWS_COLLECTION,
			owner: "T009/T013",
			checks: [
				(bySlug) => {
					const title = bySlug.get("title");
					return title?.type === "string" && title.required === true
						? null
						: "title must be a required native string field";
				},
				(bySlug) => {
					const image = bySlug.get("featured_image");
					return image?.type === "image" && image.required !== true
						? null
						: "featured_image must exist as an optional native image field";
				},
			],
		},
		{
			collection: SERVICE_COLLECTION,
			owner: "T015",
			checks: [
				(bySlug) => {
					const title = bySlug.get("title");
					return title?.type === "string" && title.required === true
						? null
						: "title must be a required native string field";
				},
				(bySlug) => {
					const documents = bySlug.get(SERVICE_DOCUMENTS_RELATION.field);
					return documents?.type === "reference" &&
						documents.validation?.relation === SERVICE_DOCUMENTS_RELATION.relation &&
						documents.required !== true
						? null
						: "documents must be an optional native reference field bound to the service_documents relation";
				},
			],
		},
		{
			collection: REPORT_COLLECTION,
			owner: "T016/T017",
			checks: [
				(bySlug) => {
					const title = bySlug.get("title");
					return title?.type === "string" && title.required === true
						? null
						: "title must be a required native string field";
				},
				(bySlug) => {
					const reportDocument = bySlug.get(REPORT_DOCUMENT_RELATION.field);
					return reportDocument?.type === "reference" &&
						reportDocument.validation?.relation === REPORT_DOCUMENT_RELATION.relation &&
						reportDocument.required === true
						? null
						: "report_document must be a required native reference field bound to the report_document relation";
				},
			],
		},
	];

	for (const expectation of expectations) {
		const schemaRead = await cmsRequest(
			admin,
			`/_emdash/api/schema/collections/${encodeURIComponent(expectation.collection)}`,
			{ searchParams: { includeFields: "true" } },
		);
		if (schemaRead.status === 404) {
			// COLLECTION_NOT_FOUND: the owning definition task has not applied
			// this collection yet (services/health_reports at this baseline).
			// T014 authors the checks; T018 inspects/applies the US2
			// definitions and runs them. Skipping is the truthful outcome.
			readiness.set(expectation.collection, { outcome: "missing" });
			continue;
		}
		expect(
			schemaRead.ok,
			`reading the native ${expectation.collection} collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
		).toBe(true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(
			Array.isArray(fields),
			`the ${expectation.collection} schema read must include fields`,
		).toBe(true);
		const bySlug = new Map<string, SchemaField>();
		for (const field of fields as SchemaField[]) {
			if (typeof field.slug === "string") bySlug.set(field.slug, field);
		}
		const problems = expectation.checks
			.map((check) => check(bySlug))
			.filter((problem): problem is string => problem !== null);
		readiness.set(
			expectation.collection,
			problems.length > 0
				? { outcome: "misconfigured", detail: problems.join("; ") }
				: { outcome: "ready" },
		);
	}
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup (the accepted T003/T007 contract)
// ---------------------------------------------------------------------------
//
// Cleanup runs as guaranteed TEARDOWN for the actor that created the
// fixtures, never as a trailing ordinary test: a test-scoped afterEach runs
// in the same worker after EVERY test — passed, failed, or individually
// selected by a filter — and Playwright discards a failed test's worker only
// for LATER tests, after this hook has already reconciled that worker's
// registry. The afterAll safety net retries anything still registered. An
// entry deliberately left TRASHED by a maintenance observation is reconciled
// by the T002 trash-aware cleanup (the trash listing proves its state before
// the trash-first purge). Unresolved cleanup fails the run truthfully; only
// the T002 owned-fixture registry is ever touched.

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) {
		return;
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	console.log(
		`[cms-reuse] owned-fixture cleanup after test: ${
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
// Per-collection schema preconditions
// ---------------------------------------------------------------------------

test("documents and announcements schema precondition: approved native definitions are active", () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	// The gates skip when a collection is missing and throw when one is
	// misconfigured; reaching here with both ready is the asserted
	// precondition itself (required title/file, domain_status select, the
	// successor and announcement documents reference bindings).
	expect(readinessOf(DOCUMENT_COLLECTION).outcome).toBe("ready");
	expect(readinessOf(ANNOUNCEMENT_COLLECTION).outcome).toBe("ready");
});

test("services schema precondition: approved native definition is active", () => {
	gateCollection(SERVICE_COLLECTION, "T015");
	expect(readinessOf(SERVICE_COLLECTION).outcome).toBe("ready");
});

test("health_reports schema precondition: approved native definition with the required report_document binding is active", () => {
	gateCollection(REPORT_COLLECTION, "T016/T017");
	// The T017 binding is the decisive one: report_document is the single
	// reference field carrying native required: true on the report_document
	// relation (one maximum; many reports may reuse one Document).
	expect(readinessOf(REPORT_COLLECTION).outcome).toBe("ready");
});

// ---------------------------------------------------------------------------
// Shared Document/file identity across Announcement, Service and Health
// Report (US2.1/US2.2, FR-004/FR-006, SC-002)
// ---------------------------------------------------------------------------

test("shared identity: one Document and its native file are selected unchanged from Announcement, Service and Health Report with zero duplicates", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	gateCollection(SERVICE_COLLECTION, "T015");
	gateCollection(REPORT_COLLECTION, "T016/T017");

	// ONE authoritative Document around ONE uploaded file — the single
	// source every context below selects. Identities come from the native
	// responses only.
	const source = await createOwnedDocument();

	// Each context selects the SAME returned Document id through its own
	// bound field in the separate native references payload — never a copy in
	// data, never another upload.
	const announcement = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
		references: { [ANNOUNCEMENT_DOCUMENTS_RELATION.field]: [source.entryId] },
	});
	expect(
		announcement.result.ok,
		"the Announcement must save with its optional Document selection",
	).toBe(true);
	expect(announcement.entryId).toBeTruthy();

	const service = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle(SERVICE_COLLECTION) },
		references: { [SERVICE_DOCUMENTS_RELATION.field]: [source.entryId] },
	});
	expect(service.result.ok, "the Service must save with its optional Document selection").toBe(
		true,
	);
	expect(service.entryId).toBeTruthy();

	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(
		report.result.ok,
		"the Health Report must save with its required Document selection while every optional field is omitted",
	).toBe(true);
	expect(report.result.status, "a native create succeeds with 201").toBe(201);
	expect(report.entryId).toBeTruthy();

	// Reopen each context by returned id and assert the SAME Document
	// identity is in each saved selection, exactly once — one edge per
	// context, no duplicate selection entries.
	for (const context of [
		{
			label: "Announcement",
			collection: ANNOUNCEMENT_COLLECTION,
			entryId: announcement.entryId!,
			relation: ANNOUNCEMENT_DOCUMENTS_RELATION.relation,
		},
		{
			label: "Service",
			collection: SERVICE_COLLECTION,
			entryId: service.entryId!,
			relation: SERVICE_DOCUMENTS_RELATION.relation,
		},
		{
			label: "Health Report",
			collection: REPORT_COLLECTION,
			entryId: report.entryId!,
			relation: REPORT_DOCUMENT_RELATION.relation,
		},
	]) {
		const reopened = await readEntry(admin, context.collection, context.entryId);
		expect(reopened.ok, `${context.label}: the entry must be reopenable by returned id`).toBe(true);
		const children = await selectedChildIds(context.collection, context.entryId, context.relation);
		expect(
			children.filter((id) => id === source.entryId).length,
			`${context.label}: the reopened selection must contain the shared Document id exactly once`,
		).toBe(1);
	}

	// The Document itself is unchanged by reuse: same returned id, same file
	// selection of the ORIGINAL uploaded media id (one upload; no copies).
	const reopenedDocument = await readEntry(admin, DOCUMENT_COLLECTION, source.entryId);
	expect(reopenedDocument.ok, "the shared Document must be reopenable by returned id").toBe(true);
	const documentData = nativeItemOf(reopenedDocument)?.data as
		{ file?: { id?: unknown } } | undefined;
	expect(
		documentData?.file?.id,
		"the shared Document's file selection must still be the original uploaded media id (selection identity only; no byte-availability claim)",
	).toBe(source.mediaId);

	// Zero duplicates: the marker-unique title still lists exactly ONE
	// Document, and no media asset other than the original upload exists
	// anywhere in the library under the marker-unique fixture filename —
	// reuse created no context copies of either (corrective round 1, F2: the
	// media check traverses the filename-filtered native listing to EXPLICIT
	// cursor exhaustion and asserts the FULL result set equals the original
	// asset — no filter-before-count that could hide a copied asset under a
	// different id, and no silent bypass when the shape is unexpected).
	expect(
		await countListedByQuery(DOCUMENT_COLLECTION, source.title),
		"reuse across three contexts must not create any duplicate Document record",
	).toBe(1);
	const listedMediaIds: string[] = [];
	let mediaCursor: string | undefined;
	let mediaPages = 0;
	do {
		const page = await cmsRequest(admin, "/_emdash/api/media", {
			searchParams: {
				q: source.filename,
				limit: "100",
				...(mediaCursor !== undefined ? { cursor: mediaCursor } : {}),
			},
		});
		expect(page.ok, "the native media listing used for the duplicate check must succeed").toBe(
			true,
		);
		const pageData = nativeDataOf(page);
		const items = pageData?.items;
		expect(Array.isArray(items), "the media listing must return its documented items array").toBe(
			true,
		);
		for (const item of items as Array<{ id?: unknown }>) {
			expect(typeof item?.id === "string", "every listed media item must carry its native id").toBe(
				true,
			);
			listedMediaIds.push(item.id as string);
		}
		const nextCursor: unknown = pageData?.nextCursor;
		expect(
			nextCursor === undefined || (typeof nextCursor === "string" && nextCursor.length > 0),
			"the media listing pagination must follow its documented nextCursor contract (absent, or a non-empty string while more pages remain)",
		).toBe(true);
		mediaCursor = typeof nextCursor === "string" ? nextCursor : undefined;
		mediaPages += 1;
		expect(
			mediaPages <= 50,
			"the filename-filtered media listing must exhaust within a bounded page budget",
		).toBe(true);
	} while (mediaCursor !== undefined);
	expect(
		listedMediaIds.length,
		"the exhausted filename-filtered media library must contain exactly one asset for the fixture file (no duplicate uploads from reuse)",
	).toBe(1);
	expect(
		listedMediaIds[0],
		"the single matching asset must be the original uploaded media id",
	).toBe(source.mediaId);
});

// ---------------------------------------------------------------------------
// Raw native Media reuse without a semantic Document (US2.3/US2.5, FR-005)
// ---------------------------------------------------------------------------

test("raw media: a public image is selected and reused without any semantic Document", async () => {
	gateCollection(NEWS_COLLECTION, "T009/T013");
	// One raw public image in the native media resource — NOT wrapped in a
	// Document — selected directly by a retained V1 content kind's image
	// field (the same selection shape the accepted T007 checks use).
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	expect(
		upload.mediaId,
		"a media id must be returned by the native response and registered for owned cleanup",
	).toBeTruthy();

	const first = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: {
			title: uniqueTitle(NEWS_COLLECTION),
			featured_image: fileValueFor(upload.mediaId!),
		},
	});
	expect(
		first.result.ok,
		"a raw image selection must save without any Document being created for it",
	).toBe(true);

	// A SECOND context reuses the SAME raw media id — still no Document, no
	// second upload (two distinct entries, one shared native asset).
	const second = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: {
			title: uniqueTitle(NEWS_COLLECTION),
			featured_image: fileValueFor(upload.mediaId!),
		},
	});
	expect(
		second.result.ok,
		"the same raw image must be reusable from a second context without a new upload",
	).toBe(true);

	// Reopen both by returned id: each carries the SAME media id in its image
	// selection (selection identity only — never a byte-availability claim).
	const firstRead = await readEntry(admin, NEWS_COLLECTION, first.entryId!);
	expect(firstRead.ok, "the first entry must be reopenable by returned id").toBe(true);
	expect(
		(nativeItemOf(firstRead)?.data as { featured_image?: { id?: unknown } } | undefined)
			?.featured_image?.id,
		"the first context's image selection must read back the same raw media id",
	).toBe(upload.mediaId);
	const secondRead = await readEntry(admin, NEWS_COLLECTION, second.entryId!);
	expect(secondRead.ok, "the second entry must be reopenable by returned id").toBe(true);
	expect(
		(nativeItemOf(secondRead)?.data as { featured_image?: { id?: unknown } } | undefined)
			?.featured_image?.id,
		"the second context's image selection must read back the same raw media id",
	).toBe(upload.mediaId);
});

test("raw media: native alt and caption are maintainable and MIME type, size and dimensions read back", async () => {
	gateCollection(NEWS_COLLECTION, "T009/T013");
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	expect(upload.mediaId).toBeTruthy();
	const mediaId = upload.mediaId!;

	// Native metadata maintenance through the supported media metadata
	// endpoint (PUT /_emdash/api/media/{id}, mediaUpdateBody: alt and caption
	// are both supported string fields — 02 §14 "alt text, caption,
	// dimensions/type/size metadata").
	const alt = `${SYNTHETIC_FIXTURE_MARK} alt ${crypto.randomUUID().slice(0, 8)}`;
	const caption = `${SYNTHETIC_FIXTURE_MARK} caption ${crypto.randomUUID().slice(0, 8)}`;
	const updated = await cmsRequest(admin, `/_emdash/api/media/${encodeURIComponent(mediaId)}`, {
		method: "PUT",
		body: { alt, caption },
	});
	expect(
		updated.ok,
		"maintaining native alt/caption through the media metadata endpoint must succeed for the owning administrator",
	).toBe(true);

	// Read the item back and assert the maintained values plus the
	// upload-derived metadata: mimeType/size/dimensions come from the actual
	// uploaded PNG bytes (pinned enrichImageMetadata reads the image header),
	// so the canonical 1×1 fixture reads back exactly these values.
	const read = await readMedia(admin, mediaId);
	expect(read.ok, "the media item must be readable by returned id").toBe(true);
	const item = nativeItemOf(read);
	expect(item?.alt, "the maintained alt text must read back").toBe(alt);
	expect(item?.caption, "the maintained caption must read back").toBe(caption);
	expect(item?.mimeType, "the native MIME type must read back the uploaded image/png").toBe(
		"image/png",
	);
	expect(
		typeof item?.size === "number" && item.size > 0,
		"the native file size must read back as a positive byte count",
	).toBe(true);
	expect(item?.width, "the native width must read back the 1×1 fixture's actual dimension").toBe(1);
	expect(item?.height, "the native height must read back the 1×1 fixture's actual dimension").toBe(
		1,
	);

	// The raw image is usable by content while carrying this metadata — the
	// selection and the maintained metadata belong to the same native asset.
	const news = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: {
			title: uniqueTitle(NEWS_COLLECTION),
			featured_image: fileValueFor(mediaId),
		},
	});
	expect(news.result.ok, "the raw image with maintained metadata must remain selectable").toBe(
		true,
	);
});

test("raw media: usage metadata is an opt-in native read whose count-or-null shape is asserted truthfully", async () => {
	gateCollection(NEWS_COLLECTION, "T009/T013");
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const mediaId = upload.mediaId!;
	// Reference the asset from one content entry so the usage surface is
	// exercised on a used item.
	const news = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: {
			title: uniqueTitle(NEWS_COLLECTION),
			featured_image: fileValueFor(mediaId),
		},
	});
	expect(news.result.ok, "the referencing entry must save").toBe(true);

	// Without the flag the ordinary read carries no usage key (usage is an
	// opt-in summary, mediaGetQuery includeUsage).
	const plain = await readMedia(admin, mediaId);
	expect(plain.ok, "the plain media read must succeed").toBe(true);
	expect(
		nativeItemOf(plain)?.usage,
		"the ordinary media read must not carry a usage summary (it is opt-in)",
	).toBeUndefined();

	// With includeUsage=1 the documented shape must be present: count is a
	// non-negative integer when the caller may read counts AND coverage is
	// complete, otherwise null — usage indexing is asynchronous (capture
	// triggers + background work), so the observed count is recorded but its
	// immediacy is NOT asserted (a truthful native boundary, not a gap being
	// papered over: no exact count is claimed at any point in time).
	const withUsage = await cmsRequest(admin, `/_emdash/api/media/${encodeURIComponent(mediaId)}`, {
		searchParams: { includeUsage: "1" },
	});
	expect(withUsage.ok, "the opt-in usage read must be accepted by the native media endpoint").toBe(
		true,
	);
	const usage = nativeItemOf(withUsage)?.usage as
		{ count?: unknown; coverage?: { scope?: unknown; status?: unknown } } | undefined;
	expect(
		usage !== null && typeof usage === "object",
		"the includeUsage=1 read must carry the documented usage object",
	).toBe(true);
	expect(
		usage?.count === null ||
			(typeof usage?.count === "number" && Number.isInteger(usage.count) && usage.count >= 0),
		"usage.count must be a non-negative integer or null (null is the native answer when the caller cannot read counts or coverage is not complete)",
	).toBe(true);
	expect(usage?.coverage?.scope, "usage.coverage.scope must read back its documented value").toBe(
		"all_content_collections",
	);
	expect(
		typeof usage?.coverage?.status === "string" &&
			["complete", "never", "running", "partial", "failed", "stale", "unknown"].includes(
				usage.coverage.status,
			),
		"usage.coverage.status must be one of the documented native states",
	).toBe(true);
	console.log(
		`[cms-reuse] media usage observation for ${SYNTHETIC_FIXTURE_MARK} fixture: count=${String(
			usage?.count,
		)} coverage=${String(usage?.coverage?.status)} (asynchronous indexing; no immediacy claimed)`,
	);
});

// ---------------------------------------------------------------------------
// Document successor context distinct from publication state (US2.4, FR-004)
// ---------------------------------------------------------------------------

test("document successor: domain status and successor identity stay distinct from publication state", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	const predecessorUpload = await uploadSyntheticMedia(admin);
	expect(predecessorUpload.result.ok, "the predecessor Document's media upload must succeed").toBe(
		true,
	);
	const successorUpload = await uploadSyntheticMedia(admin);
	expect(successorUpload.result.ok, "the successor Document's media upload must succeed").toBe(
		true,
	);
	const extraUpload = await uploadSyntheticMedia(admin);
	expect(
		extraUpload.result.ok,
		"the cardinality-control Document's media upload must succeed",
	).toBe(true);

	const predecessor = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: {
			title: uniqueTitle(DOCUMENT_COLLECTION),
			file: fileValueFor(predecessorUpload.mediaId!),
		},
	});
	expect(predecessor.result.ok, "the predecessor Document fixture must save").toBe(true);
	const successor = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: {
			title: uniqueTitle(DOCUMENT_COLLECTION),
			file: fileValueFor(successorUpload.mediaId!),
		},
	});
	expect(successor.result.ok, "the successor Document fixture must save").toBe(true);
	const extra = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: {
			title: uniqueTitle(DOCUMENT_COLLECTION),
			file: fileValueFor(extraUpload.mediaId!),
		},
	});
	expect(extra.result.ok, "the cardinality-control Document fixture must save").toBe(true);

	// Cardinality of the optional successor relation: "one maximum; many
	// predecessor records may point to it" — selecting TWO successors is a
	// native over-limit refusal, distinguishable from authorization and
	// state-conflict families. The refused create leaves no fixture behind.
	const excessive = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
		data: {
			title: uniqueTitle(DOCUMENT_COLLECTION),
			file: fileValueFor(predecessorUpload.mediaId!),
		},
		references: { [SUCCESSOR_RELATION.field]: [successor.entryId!, extra.entryId!] },
	});
	expectValidationRefusal(
		excessive.result,
		"two successors selected through the one-maximum successor relation",
	);
	expect(
		excessive.entryId,
		"excessive successor selection: no entry id may be returned for a refused save",
	).toBeUndefined();

	// Domain context on a DRAFT: expiry metadata plus a successor selection
	// changes nothing about editorial state — the Document stays a draft.
	const expiring = await updateEntry(admin, DOCUMENT_COLLECTION, predecessor.entryId!, {
		data: { domain_status: "expired" },
		references: { [SUCCESSOR_RELATION.field]: [successor.entryId!] },
	});
	expect(
		expiring.ok,
		"setting domain_status=expired with a successor selection must save (domain context is editorial data, not a lifecycle gate)",
	).toBe(true);
	let reopened = await readEntry(admin, DOCUMENT_COLLECTION, predecessor.entryId!);
	expect(reopened.ok, "the expired-context Document must be reopenable").toBe(true);
	expect(
		nativeItemOf(reopened)?.status,
		"an expired domain status must NOT change editorial state: the Document remains a draft",
	).toBe("draft");
	expect(
		(nativeItemOf(reopened)?.data as { domain_status?: unknown } | undefined)?.domain_status,
		"the supplied domain_status=expired must read back exactly (domain context is stored editorial data, correctively asserted per F3)",
	).toBe("expired");
	expect(
		await selectedChildIds(DOCUMENT_COLLECTION, predecessor.entryId!, SUCCESSOR_RELATION.relation),
		"the successor selection must read back exactly the selected successor identity",
	).toEqual([successor.entryId]);

	// Domain context on a PUBLISHED Document: superseding it changes nothing
	// about publication — no automatic unpublish, no new editorial state
	// (02 §20: CMS publishing state and domain state are different things).
	const published = await publishEntry(admin, DOCUMENT_COLLECTION, successor.entryId!);
	expect(
		published.ok,
		"publishing the successor Document must succeed under native authority",
	).toBe(true);
	const capturedPublishedAt = nativeItemOf(published)?.publishedAt;
	expect(
		typeof capturedPublishedAt === "string" && capturedPublishedAt.length > 0,
		"the initial publish must return a native publishedAt for the exact pre-edit comparison",
	).toBe(true);
	const superseded = await updateEntry(admin, DOCUMENT_COLLECTION, successor.entryId!, {
		data: { domain_status: "superseded" },
	});
	expect(superseded.ok, "setting domain_status=superseded on a published Document must save").toBe(
		true,
	);
	reopened = await readEntry(admin, DOCUMENT_COLLECTION, successor.entryId!);
	expect(reopened.ok, "the superseded Document must be reopenable").toBe(true);
	const supersededItem = nativeItemOf(reopened);
	expect(
		supersededItem?.status,
		"a superseded domain status must NOT automatically unpublish: the Document remains published",
	).toBe("published");
	expect(
		supersededItem?.publishedAt,
		"the domain-context edit must not alter the recorded publication time (exact captured pre-edit value)",
	).toBe(capturedPublishedAt);
	expect(
		(supersededItem?.data as { domain_status?: unknown } | undefined)?.domain_status,
		"the supplied domain_status=superseded must read back exactly in the staged draft data a drafts-reading caller sees (correctively asserted per F3)",
	).toBe("superseded");
	const supersededLive = (supersededItem as { liveData?: unknown } | undefined)?.liveData;
	expect(
		supersededLive !== null && typeof supersededLive === "object",
		"the drafts-reading read-back must expose the published values as liveData alongside the staged draft (pinned hydrateDraftData overlay)",
	).toBe(true);
	expect(
		(supersededLive as { domain_status?: unknown } | undefined)?.domain_status,
		"the published values exposed as liveData must still carry no domain status (staged domain context and live publication data remain separate)",
	).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Health Report mandatory reference semantics (US2.6, FR-002/FR-007/FR-026)
// ---------------------------------------------------------------------------

test("health report: create refuses omitted, empty, wrong-target and excessive report_document selections", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	const source = await createOwnedDocument();
	const title = uniqueTitle(REPORT_COLLECTION);

	// Omitted: no references payload at all — the required reference key is
	// missing on initial create.
	const omitted = await createSyntheticEntry(admin, REPORT_COLLECTION, { data: { title } });
	expectValidationRefusal(omitted.result, "report_document omitted entirely from create");
	expect(
		omitted.entryId,
		"omitted: no entry id may be returned for a refused save",
	).toBeUndefined();

	// Empty: the key is present with an empty selection.
	const empty = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title },
		references: { [REPORT_DOCUMENT_RELATION.field]: [] },
	});
	expectValidationRefusal(empty.result, "report_document supplied as an empty selection");
	expect(empty.entryId, "empty: no entry id may be returned for a refused save").toBeUndefined();

	// Wrong target — two truthful variants of the same native family:
	// an unknown id, and a VALID id belonging to a different collection
	// (an Announcement), which fails resolution inside the relation's target
	// collection and is refused 404 NOT_FOUND exactly like the unknown id.
	const foreignContext = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
	});
	expect(
		foreignContext.result.ok,
		"the foreign-collection fixture used as a wrong target must save",
	).toBe(true);
	for (const wrongTarget of [
		{ label: "unknown target id", id: `${SYNTHETIC_FIXTURE_MARK}-no-such-entry` },
		{
			label: "valid id from the wrong collection (an Announcement)",
			id: foreignContext.entryId!,
		},
	]) {
		const refusal = await createSyntheticEntry(admin, REPORT_COLLECTION, {
			data: { title },
			references: { [REPORT_DOCUMENT_RELATION.field]: [wrongTarget.id] },
		});
		expectTargetRefusal(refusal.result, `report_document selecting ${wrongTarget.label}`);
		expect(
			refusal.entryId,
			`${wrongTarget.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}

	// Excessive cardinality: the relation's one-maximum limit refuses two
	// perfectly valid Document ids in one selection.
	const secondDocument = await createOwnedDocument();
	const excessive = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title },
		references: {
			[REPORT_DOCUMENT_RELATION.field]: [source.entryId, secondDocument.entryId],
		},
	});
	expectValidationRefusal(
		excessive.result,
		"two Documents selected through the one-maximum report_document relation",
	);
	expect(
		excessive.entryId,
		"excessive: no entry id may be returned for a refused save",
	).toBeUndefined();
});

test("health report: an invalid clear of the required selection is refused and the selection survives", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	const source = await createOwnedDocument();
	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(report.result.ok, "the valid report fixture must save with its required selection").toBe(
		true,
	);

	// An explicit empty selection on update is an invalid clear of the
	// required reference (an update may omit the unchanged selection, but
	// must not clear it invalidly). updateEntry supplies the fresh `_rev`.
	const cleared = await updateEntry(admin, REPORT_COLLECTION, report.entryId!, {
		references: { [REPORT_DOCUMENT_RELATION.field]: [] },
	});
	expectValidationRefusal(cleared, "report_document cleared to an empty selection on update");

	// Re-read the uncertain outcome (shared constraint): the selection is
	// still in place.
	const reopened = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(reopened.ok, "the report must remain readable after the refused clear").toBe(true);
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the refused clear must not have taken effect: the selection still reads back the Document id",
	).toEqual([source.entryId]);
});

test("health report: a valid selection permits incomplete drafts and optional relations may be supplied empty", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	const source = await createOwnedDocument();

	// The valid-selection incomplete draft: title + the required selection,
	// EVERY optional report field omitted (summary, report_type, topic,
	// reporting_period, owner_source, report_at, fiscal_year, area) —
	// US2.6 "A draft with that selection may omit other values allowed by
	// native validation."
	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(
		report.result.ok,
		"a valid Document selection must permit an otherwise-incomplete report draft",
	).toBe(true);
	expect(report.result.status).toBe(201);
	expect(report.entryId).toBeTruthy();
	const reopened = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(reopened.ok, "the incomplete draft must be reopenable by returned id").toBe(true);
	const item = nativeItemOf(reopened);
	expect(item?.status, "the saved report is a native draft").toBe("draft");
	expect(
		(item?.data as { title?: unknown } | undefined)?.title,
		"the supplied title must read back",
	).toBeTruthy();
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the required selection must read back the shared Document identity",
	).toEqual([source.entryId]);

	// Permitted empty OPTIONAL relations: an Announcement may save with an
	// explicitly empty Document selection — an optional field's empty
	// selection is never a save gate.
	const emptyOptional = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
		references: { [ANNOUNCEMENT_DOCUMENTS_RELATION.field]: [] },
	});
	expect(
		emptyOptional.result.ok,
		"an explicitly empty OPTIONAL relation selection must be permitted at native save",
	).toBe(true);
	// Omitting the optional key entirely is equally permitted (no
	// required-references-present refusal exists for optional fields).
	const omittedOptional = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
	});
	expect(
		omittedOptional.result.ok,
		"an omitted OPTIONAL relation selection must be permitted at native save",
	).toBe(true);
});

// ---------------------------------------------------------------------------
// Native publication rechecks and Schedule's own semantics (US2.6, FR-026,
// SC-006; no Songhealth predicate anywhere)
// ---------------------------------------------------------------------------

test("publication: native Publish accepts valid incomplete reports and multi-Document announcements after its requiredness/cardinality recheck", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	// COVERAGE SCOPE (corrective round 1, finding F1): this test exercises
	// the publication recheck's ACCEPTANCE side — a valid required selection
	// with every optional omission, and a VALID many-side two-Document
	// cardinality. It deliberately claims NO over-limit publication refusal:
	// an over-limit selection cannot be staged through the supported native
	// API in the first place (save/update refuse it), so no negative
	// cardinality outcome is fabricated here. The actually exercised
	// publication REFUSAL — the emptied REQUIRED selection boundary — is the
	// dedicated test after the schedule check below.
	const source = await createOwnedDocument();
	const secondDocument = await createOwnedDocument();

	// A valid but maximally incomplete report: only title + the required
	// selection. Native publish revalidates the staged selection's
	// requiredness/cardinality before the publishing statement (pinned
	// handleContentPublish), then publishes — optional omissions are NOT
	// publication refusals and no Songhealth completeness hook exists.
	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(report.result.ok, "the incomplete report fixture must save").toBe(true);
	const published = await publishEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(
		published.ok,
		"direct native Publish of a valid incomplete report by an authorized publisher must be accepted (native rechecks pass; no completeness hook)",
	).toBe(true);
	expect(
		nativeItemOf(published)?.status,
		"the publish response item must report the native published status",
	).toBe("published");
	const reopened = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(reopened.ok, "the published report must be reopenable by returned id").toBe(true);
	expect(nativeItemOf(reopened)?.status, "the read-back status must be published").toBe(
		"published",
	);
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the required selection must remain live after publication (identity only; no target-availability claim)",
	).toEqual([source.entryId]);

	// Cardinality on the many-side: an Announcement selecting TWO Documents
	// publishes through the same native recheck (the many;many relation's
	// limit is not exceeded) — proving the recheck is native cardinality, not
	// a Songhealth one-selection predicate.
	const announcement = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
		references: {
			[ANNOUNCEMENT_DOCUMENTS_RELATION.field]: [source.entryId, secondDocument.entryId],
		},
	});
	expect(announcement.result.ok, "the two-Document announcement fixture must save").toBe(true);
	const announcementPublished = await publishEntry(
		admin,
		ANNOUNCEMENT_COLLECTION,
		announcement.entryId!,
	);
	expect(
		announcementPublished.ok,
		"native Publish must accept a many-side two-Document selection (cardinality recheck passes; no invented one-selection rule)",
	).toBe(true);
	const announcementChildren = await selectedChildIds(
		ANNOUNCEMENT_COLLECTION,
		announcement.entryId!,
		ANNOUNCEMENT_DOCUMENTS_RELATION.relation,
	);
	expect(
		announcementChildren.filter((id) => id === source.entryId || id === secondDocument.entryId)
			.length,
		"both shared Document identities must be live in the published announcement's selection",
	).toBe(2);
});

test("schedule: a valid incomplete report schedules under native semantics with no Songhealth reference predicate", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	const source = await createOwnedDocument();
	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(report.result.ok, "the valid incomplete report fixture must save").toBe(true);

	// One future instant (~1 hour out) with an explicit +07:00 offset, as
	// FR-023/the editorial contract require (the +07:00 wall clock of an
	// instant is its UTC wall clock shifted seven hours ahead). Schedule
	// acceptance applies native role/time/entry checks and does NOT run the
	// publish-time reference predicate — the editorial contract's "Schedule
	// retains its actual native action semantics"; actual due-time execution
	// belongs to T019/T022 and is not claimed here.
	const scheduledInstant = Date.now() + 60 * 60 * 1000;
	const offsetScheduledAt = `${new Date(scheduledInstant + 7 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 19)}.000+07:00`;
	const scheduled = await scheduleEntry(
		admin,
		REPORT_COLLECTION,
		report.entryId!,
		offsetScheduledAt,
	);
	expect(
		scheduled.ok,
		"direct native Schedule of a valid incomplete report must be accepted (native action semantics; no Songhealth reference predicate, no approval step)",
	).toBe(true);
	expect(
		nativeItemOf(scheduled)?.status,
		"the schedule response item must report the native scheduled status",
	).toBe("scheduled");
	const scheduleError = scheduled.body as { error?: { code?: unknown } };
	expect(
		scheduleError?.error?.code,
		"no custom policy-cancellation code may appear on a native schedule acceptance",
	).toBeUndefined();

	// Read the state back by returned id; the stored scheduledAt may be
	// normalized, so the INSTANT is compared, not the string.
	const reopened = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(reopened.ok, "the scheduled report must be reopenable by returned id").toBe(true);
	const item = nativeItemOf(reopened);
	expect(item?.status, "the read-back status must be scheduled").toBe("scheduled");
	expect(
		typeof item?.scheduledAt === "string" &&
			Math.abs(new Date(item.scheduledAt).getTime() - scheduledInstant) < 1000,
		"the read-back scheduledAt must express the supplied future instant",
	).toBe(true);

	// Clear the schedule through the native endpoint so the owned fixture
	// returns to draft before teardown.
	const unscheduled = await unscheduleEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(
		unscheduled.ok,
		"the owned schedule must be clearable through the native endpoint before cleanup",
	).toBe(true);
});

// ---------------------------------------------------------------------------
// Required publication boundary (corrective round 1, finding F1): the case
// that actually DISTINGUISHES "Publish enforces required references" from
// "Schedule acquires the reference predicate the contract excludes". The
// route is fully supported-native and source-verified in pinned 1.1.0:
// authorized trash + administrator trash-first purge of the sole owned
// Document clears its translation group's live reference edges
// (handleContentPermanentDelete → clearReferencesForGroup, last-of-group,
// edges before row); with no pending replacement selection staged, the next
// Publish re-validates requiredness against the CURRENT LIVE edges
// (validateStagedReferences falls back to liveFieldSelection for unstaged
// fields) and must refuse the emptied required selection, while
// handleContentSchedule applies role/time/entry checks only — no reference
// validation exists anywhere in its path. Authored for T018's runtime
// verification join; not executed at authoring time.
// ---------------------------------------------------------------------------

test("publication boundary: an emptied required selection refuses re-Publish while Schedule acceptance applies no reference predicate", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(REPORT_COLLECTION, "T016/T017");
	const source = await createOwnedDocument();

	// A valid Report with its required selection, published — the starting
	// state whose required boundary the rest of this check empties through
	// entirely authorized, entirely native operations (no schema mutation,
	// no custom veto, no fabricated state).
	const report = await createSyntheticEntry(admin, REPORT_COLLECTION, {
		data: { title: uniqueTitle(REPORT_COLLECTION) },
		references: { [REPORT_DOCUMENT_RELATION.field]: [source.entryId] },
	});
	expect(report.result.ok, "the valid report fixture must save").toBe(true);
	const published = await publishEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(published.ok, "the initial publish must succeed").toBe(true);
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the required selection must be live after the initial publication",
	).toEqual([source.entryId]);

	// Authorized maintenance taken to completion: trash the sole owned
	// Document, then purge it. The purge is the native administrator-only,
	// trash-first permanent deletion; the pinned last-of-group path clears
	// the live edges before the row goes, emptying the published Report's
	// required selection. This simultaneously exercises the required-target
	// maintenance boundary the optional Announcement trash case cannot.
	const trashed = await trashEntry(admin, DOCUMENT_COLLECTION, source.entryId);
	expect(trashed.ok, "authorized target trash must be accepted (no custom D-REF veto exists)").toBe(
		true,
	);
	const purged = await permanentlyDeleteEntry(admin, DOCUMENT_COLLECTION, source.entryId);
	expect(
		purged.ok,
		"the authorized administrator purge (trash-first precondition satisfied) must be accepted, clearing the last-of-group live edges",
	).toBe(true);

	// Current state, observed truthfully: the required selection is now empty.
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the purged target must leave the required live selection empty",
	).toEqual([]);

	// THE distinguishing publication assertion: with no pending replacement
	// selection staged, native Publish re-validates requiredness against the
	// now-empty effective selection and REFUSES. This assertion fails if
	// Publish stops enforcing required references. Exact family per the
	// pinned source: 400 VALIDATION_ERROR (distinguishable from 401/403/409),
	// naming the emptied required field. publishEntry supplies the fresh
	// `_rev` precondition.
	const refused = await publishEntry(admin, REPORT_COLLECTION, report.entryId!);
	expectValidationRefusal(
		refused,
		"re-Publish of a published Report whose required selection was emptied by the authorized target purge",
	);
	const refusalError = refused.body as { error?: { message?: unknown } };
	expect(
		typeof refusalError?.error?.message === "string" &&
			refusalError.error.message.includes(REPORT_DOCUMENT_RELATION.field),
		"the publish refusal must name the emptied required field",
	).toBe(true);

	// Refused-state re-read (fresh native state, never the response alone):
	// the entry is unchanged — still published (the refusal published
	// nothing new), selection still empty.
	const afterRefusal = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(afterRefusal.ok, "the report must remain readable after the refused re-publish").toBe(
		true,
	);
	expect(
		nativeItemOf(afterRefusal)?.status,
		"the refused re-publish must not change editorial state",
	).toBe("published");
	expect(
		await selectedChildIds(REPORT_COLLECTION, report.entryId!, REPORT_DOCUMENT_RELATION.relation),
		"the refused re-publish must not resurrect the purged selection",
	).toEqual([]);

	// THE distinguishing schedule assertion: the same emptied required
	// selection that Publish refused is ACCEPTED at schedule time —
	// handleContentSchedule performs no reference validation. This assertion
	// fails if Schedule acquires the reference predicate the contract
	// excludes. Pinned status semantics: scheduling an already-published
	// item PRESERVES `published` (the schedule applies to the pending draft;
	// FR-023's live-until-update-success boundary).
	const scheduledInstant = Date.now() + 60 * 60 * 1000;
	const offsetScheduledAt = `${new Date(scheduledInstant + 7 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 19)}.000+07:00`;
	const scheduled = await scheduleEntry(
		admin,
		REPORT_COLLECTION,
		report.entryId!,
		offsetScheduledAt,
	);
	expect(
		scheduled.ok,
		"native Schedule acceptance must apply no reference predicate (the emptied required selection is not a schedule-time refusal)",
	).toBe(true);
	const scheduledItem = nativeItemOf(scheduled);
	expect(
		scheduledItem?.status,
		"scheduling an already-published item preserves the published status (the schedule applies to the pending draft)",
	).toBe("published");
	expect(
		typeof scheduledItem?.scheduledAt === "string" &&
			Math.abs(new Date(scheduledItem.scheduledAt).getTime() - scheduledInstant) < 1000,
		"the schedule read-back must express the supplied future instant",
	).toBe(true);
	const scheduleError = scheduled.body as { error?: { code?: unknown } };
	expect(
		scheduleError?.error?.code,
		"no custom policy-cancellation code may appear on a native schedule acceptance",
	).toBeUndefined();

	// Clear the schedule through the native endpoint so the owned fixture
	// state is normalized before teardown (unscheduling preserves published).
	const unscheduled = await unscheduleEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(
		unscheduled.ok,
		"the owned schedule must be clearable through the native endpoint before cleanup",
	).toBe(true);
	const afterUnschedule = await readEntry(admin, REPORT_COLLECTION, report.entryId!);
	expect(
		nativeItemOf(afterUnschedule)?.status,
		"unscheduling a published item must leave it published",
	).toBe("published");
});

// ---------------------------------------------------------------------------
// Maintenance boundaries: authorized target/media replacement and removal
// have no custom D-REF veto (US2.8, FR-025/FR-026; D-REF stays deferred)
// ---------------------------------------------------------------------------

test("maintenance: authorized target removal has no custom veto and current state is observed truthfully", async () => {
	gateCollection(DOCUMENT_COLLECTION, "T005/T006");
	gateCollection(ANNOUNCEMENT_COLLECTION, "T011/T013");
	const source = await createOwnedDocument();

	// Publish a parent whose live selection points at the authorized
	// Document — the exact situation the deferred D-REF removal veto would
	// have gated.
	const announcement = await createSyntheticEntry(admin, ANNOUNCEMENT_COLLECTION, {
		data: { title: uniqueTitle(ANNOUNCEMENT_COLLECTION) },
		references: { [ANNOUNCEMENT_DOCUMENTS_RELATION.field]: [source.entryId] },
	});
	expect(announcement.result.ok, "the announcement fixture must save").toBe(true);
	const published = await publishEntry(admin, ANNOUNCEMENT_COLLECTION, announcement.entryId!);
	expect(published.ok, "the announcement must publish").toBe(true);

	// Authorized native Trash of the reused target: the pinned platform has
	// NO published-required-dependent veto — the trash is accepted as an
	// ordinary native operation (an authorization or state refusal would be a
	// truthful native outcome to report; a custom dependency-veto code is not
	// expected to exist and none is fabricated).
	const trashed = await cmsRequest(
		admin,
		`/_emdash/api/content/${DOCUMENT_COLLECTION}/${encodeURIComponent(source.entryId)}`,
		{ method: "DELETE" },
	);
	expect(
		trashed.ok,
		"authorized target trash must be accepted by the native lifecycle (no custom D-REF veto exists)",
	).toBe(true);
	const trashError = trashed.body as { error?: { code?: unknown } };
	expect(trashError?.error?.code, "the accepted trash must carry no error code").toBeUndefined();

	// Current state, observed truthfully: the trashed target disappears from
	// the parent's live children resolution (the ordinary content lookup
	// excludes trashed entries), while the PARENT's publication state is
	// untouched — no cascade, no automatic unpublish, and no claim about the
	// link row's history, future availability or atomicity.
	const childrenAfterTrash = await selectedChildIds(
		ANNOUNCEMENT_COLLECTION,
		announcement.entryId!,
		ANNOUNCEMENT_DOCUMENTS_RELATION.relation,
	);
	expect(
		childrenAfterTrash.includes(source.entryId),
		"a trashed target must not resolve in the parent's current children listing",
	).toBe(false);
	const reopenedAnnouncement = await readEntry(
		admin,
		ANNOUNCEMENT_COLLECTION,
		announcement.entryId!,
	);
	expect(reopenedAnnouncement.ok, "the parent must remain readable after the target trash").toBe(
		true,
	);
	expect(
		nativeItemOf(reopenedAnnouncement)?.status,
		"trashing a reused target must NOT change the parent's publication state (no cascade; D-REF deferred)",
	).toBe("published");

	// Restore the target so the owned fixture's state is normalized before
	// teardown (the T002 trash-aware cleanup reconciles either way).
	const restored = await cmsRequest(
		admin,
		`/_emdash/api/content/${DOCUMENT_COLLECTION}/${encodeURIComponent(source.entryId)}/restore`,
		{ method: "POST" },
	);
	expect(
		restored.ok,
		"the owned target must be restorable through the native endpoint before cleanup",
	).toBe(true);
});

test("maintenance: authorized media replacement and removal keep selection identity with no availability promise", async () => {
	gateCollection(NEWS_COLLECTION, "T009/T013");
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const mediaId = upload.mediaId!;
	const before = await readMedia(admin, mediaId);
	expect(before.ok, "the media item must be readable before replacement").toBe(true);
	const beforeItem = nativeItemOf(before);
	expect(
		beforeItem?.status,
		"only ready media can be replaced (the pinned native precondition); the fresh upload must be ready",
	).toBe("ready");

	// One referencing consumer of the raw image.
	const news = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: {
			title: uniqueTitle(NEWS_COLLECTION),
			featured_image: fileValueFor(mediaId),
		},
	});
	expect(news.result.ok, "the referencing news fixture must save").toBe(true);

	// Authorized native replacement under the SAME media id: the pinned
	// replace endpoint stores different bytes under the same identity and
	// updates size/dimensions/contentHash. This is the shared-current-source
	// mechanism: consumers keep the identity while the source changes — and
	// NO immutable-bytes or atomicity claim is made (the differing byte count
	// is an observed fact, not a guarantee about later reads).
	const replacementForm = new FormData();
	replacementForm.append(
		"file",
		new File([replacementPngBytes()], `${SYNTHETIC_FIXTURE_MARK}-replacement.png`, {
			type: "image/png",
		}),
	);
	replacementForm.append("width", "1");
	replacementForm.append("height", "1");
	const replaced = await cmsRequest(
		admin,
		`/_emdash/api/media/${encodeURIComponent(mediaId)}/replace`,
		{ method: "PUT", form: replacementForm },
	);
	expect(
		replaced.ok,
		"authorized media replacement must be accepted by the native endpoint (no custom veto; same-MIME image)",
	).toBe(true);
	const replacedRead = await readMedia(admin, mediaId);
	expect(replacedRead.ok, "the replaced media item must be readable by the same id").toBe(true);
	const replacedItem = nativeItemOf(replacedRead);
	expect(replacedItem?.id, "replacement must keep the same media identity").toBe(mediaId);
	expect(
		replacedItem?.mimeType,
		"replacement keeps the item's MIME type (the native precondition)",
	).toBe("image/png");
	expect(
		typeof replacedItem?.size === "number" &&
			typeof beforeItem?.size === "number" &&
			replacedItem.size !== beforeItem.size,
		"the observed byte count changed with the replacement bytes (observed fact, not an immutability or availability claim)",
	).toBe(true);

	// The consumer's selection identity is unaffected by the replacement.
	const reopenedNews = await readEntry(admin, NEWS_COLLECTION, news.entryId!);
	expect(reopenedNews.ok, "the referencing news must be reopenable after replacement").toBe(true);
	expect(
		(nativeItemOf(reopenedNews)?.data as { featured_image?: { id?: unknown } } | undefined)
			?.featured_image?.id,
		"the consumer's selection must still carry the same media id after replacement (current shared source; no byte-availability promise)",
	).toBe(mediaId);

	// Authorized native removal of the referenced asset: accepted without a
	// custom D-REF veto. The surviving selection identity in the consumer is
	// a truthful stale-identity observation — the safe missing-file state for
	// public reads belongs to T021/T022, and NO availability, retention or
	// cross-record atomicity outcome is asserted here.
	const removed = await cmsRequest(admin, `/_emdash/api/media/${encodeURIComponent(mediaId)}`, {
		method: "DELETE",
	});
	expect(
		removed.ok,
		"authorized media removal must be accepted by the native endpoint even while a consumer's selection references it (no custom D-REF veto)",
	).toBe(true);
	const afterRemoval = await readMedia(admin, mediaId);
	expect(
		afterRemoval.status,
		"the removed asset must read back as gone (404) through the native media read",
	).toBe(404);
	const reopenedAfterRemoval = await readEntry(admin, NEWS_COLLECTION, news.entryId!);
	expect(
		reopenedAfterRemoval.ok,
		"the consumer entry must remain readable after asset removal",
	).toBe(true);
	expect(
		(nativeItemOf(reopenedAfterRemoval)?.data as { featured_image?: { id?: unknown } } | undefined)
			?.featured_image?.id,
		"the consumer's stored selection identity is observed truthfully after removal (no availability promise; safe public-read handling is T021/T022 scope)",
	).toBe(mediaId);
});
