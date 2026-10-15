// T003 — focused native Document Save checks for the Feature 002 shared
// `documents` collection. Test support in tests/browser/ only: no application,
// schema, seed, dependency, infrastructure, or production change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T003 ("Author focused native Document
//   Save checks in tests/browser/cms-document.spec.ts using T002: missing/
//   null/empty title, missing/malformed/cleared file object, valid
//   uploaded-media `id`, permitted optional omissions and supplied invalid
//   type/select/date values; distinguish native validation from authorization
//   and do not assert file immutability or continued byte availability") and
//   the shared "Path Conventions and Shared Constraints" section (dev-bypass
//   access, returned IDs/current `_rev`, re-read uncertain outcomes, clean
//   only owned synthetic fixtures, serial runtime checks)
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes" (create must supply required fields; an update may omit
//   an unchanged field but must not invalidly clear it) and "Validation
//   Contract — Native Only" §1 (EmDash schema enforces required fields,
//   type/format values; native validation failures remain distinguishable
//   from permission/state refusals)
// - specs/002-cms-content-model/data-model.md — `documents` row (`title`
//   string S; `summary` text O; `file` file S; `document_at` datetime O;
//   `fiscal_year` integer O; `owner_source` text O; `domain_status` select O
//   (current/superseded/expired)) and the Common Native Contract ("Native
//   Save validation rejects missing required values and empty required
//   strings; malformed supplied values retain native refusal")
// - specs/002-cms-content-model/spec.md — Q1 matrix Document row ("Title and
//   native file required at save; Native RBAC/lifecycle only; Type, owner,
//   dates, successor editorial") and FR-002/FR-026
// - specs/002-cms-content-model/quickstart.md — "Focused Native API Checks"
//   (cover missing/null/empty title, missing or malformed Document file
//   object, invalid clear of a required value, and representative invalid
//   supplied type/format/select values; a valid native file value has an
//   uploaded fixture media `id`; its presence does not prove later byte
//   availability)
// - docs/website-modernization-docs/current/02-content-model.md §13
//   (Document fields) and §20 "V1 validation and native limitation boundary"
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (dev-bypass actor, synthetic media/entries,
//   fresh `_rev` preconditions, secret-redacted results, owned-fixture
//   cleanup)
// - specs/002-cms-content-model/evidence/T001-development-inputs.md §6–§7 —
//   the truthful readiness limitations these checks skip on rather than
//   masquerading as field-validation results
//
// Verified API surface (recorded per AGENTS.md §External Documentation; every
// release-sensitive claim below was checked against the pinned `emdash@1.1.0`
// archive, npm tarball integrity sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==
// — byte-equal to package-lock.json, the same integrity research.md §Evidence
// and the T002 helpers independently verified):
// - create validates content data with `partial: false` and update with
//   `partial: true` (src/emdash-runtime.ts handleContentCreate/handleContent
//   Update call sites) — so a create may omit nothing required, while an
//   update may omit an unchanged required field but has every SUPPLIED value
//   validated, including invalid clears of required fields
// - required-field and supplied-value issues surface as the native envelope
//   `{ success: false, error: { code: "VALIDATION_ERROR", message, details:
//   { issues: [{ path, code, message }] } } }` with HTTP 400
//   (src/api/handlers/validation.ts validateContentData; src/api/errors.ts
//   mapErrorStatus)
// - empty-string on a required field is refused as `required (empty value
//   not allowed)` even though z.string() itself accepts "" (validation.ts
//   separate pass; in partial mode only fields present in `data` are checked)
// - a native file value is an object whose REQUIRED member is a string media
//   `id` (src/schema/zod-generator.ts file case: z.object({ id: z.string(),
//   url?, src?, filename?, mimeType?, size?, provider?, meta? })) — a missing
//   `file`, null, or an object with neither `id` nor `src` is a supplied-value
//   type refusal, never a valid clear
// - CORRECTIVE ROUND 1 (Product Owner approval 01a13ed2-7a42-7aa7-b8a9-546c558ef316,
//   Human Gate 01a13ecf-ec08-7d27-8b6d-c0d292c1e943, Lead reproduction in the
//   T006 review): a DOCUMENTED media value normalization layer runs at content
//   create/update time BEFORE the field schema (src/media/normalize.ts, invoked
//   from src/emdash-runtime.ts before create/update validation) and makes a
//   BARE STRING a first-class native file shape (the URL-input path:
//   "seed scripts, media picker, WP import, URL input"):
//   file:"" and file:"not-an-object" → {provider:"external", id:"", src:<the
//   string>}; file:{id:123} is coerced to {id:"", provider:"local"}. These
//   three inputs are ACCEPTED (201) with exactly those stored representations,
//   and the Product Owner accepts this pinned behavior as a documented V1
//   limitation. An accepted normalized value with id:"" is NOT a real file
//   selection — the regression tests below assert the exact degenerate stored
//   shape through native read-back and never imply an empty id/src selects an
//   available file (no availability guarantee exists; D-REF stays deferred)
// - string → z.string(); integer → z.number().int(); datetime →
//   z.iso.datetime({ offset: true }) (offset-aware; an offset-less timestamp
//   is refused); select → z.enum(configured options) (zod-generator.ts)
// - authorization refusals are a different family entirely: an
//   unauthenticated request is `UNAUTHORIZED` 401 and an insufficient
//   permission is `FORBIDDEN` 403 (src/api/authorize.ts requirePerm) — the
//   authorization-failure control below proves that boundary live and every
//   validation-refusal assertion below also asserts the refusal is NOT
//   401/403, so an authorization problem can never masquerade as a
//   field-validation outcome (and vice versa)
// - an unknown collection is `COLLECTION_NOT_FOUND` 404 (errors.ts) — used
//   here as the truthful schema-readiness gate, not a validation result
// - GET /_emdash/api/schema/collections/{slug}?includeFields=true
//   (schema:read) → data { item: { …collection, fields: [{ slug, type,
//   required, … }] } } (src/astro/routes/api/schema/collections/[slug]/
//   index.ts; src/api/handlers/schema.ts handleSchemaCollectionGet)
// - Playwright 1.63.0 semantics (Context7 /microsoft/playwright v1.63.0):
//   tests in one file run sequentially in one worker; test-scoped hooks
//   (afterEach) and fixture teardown are guaranteed to run when a test
//   finishes — including after a failure — in the SAME worker, while a
//   FAILED test causes Playwright to discard that worker for LATER tests
//   (docs/test-retries#failures). Owned-fixture cleanup therefore runs as
//   test-scoped teardown below, never as a trailing ordinary test whose
//   fresh-worker registry would make cleanup vacuously "complete" after a
//   failure, and never as something a test filter could exclude
//
// Boundaries and non-claims (tasks.md T003; Constitution v3.0.0 II–V):
// - Save checks only: no publish/schedule/lifecycle/revision/public-read
//   assertion (owned by T007/T014/T019–T022), no Admin UI journey (T031)
// - a valid file selection proves only that the native save accepted the
//   uploaded fixture media `id`: NO file immutability, continued byte
//   availability, published-target or removal-protection outcome is asserted
//   (D-REF stays deferred; native-editorial.md "Availability")
// - the actor is the README §7 development-only dev-bypass Administrator
//   fixture, pinned to the RUNNER-CONFIGURED origin (playwright.config.ts
//   contract: PLAYWRIGHT_BASE_URL or the documented development origin —
//   never the helper default, which could silently target a different
//   running app); the unauthenticated control builds its request from the
//   same actor origin. Distinct-role coverage is NOT claimed from this
//   actor (T001 §6 records that input as pending; an Administrator token
//   cannot prove role boundaries). The unauthenticated control below proves
//   the authorization REFUSAL side only
// - fixtures are clearly-marked synthetic public-publishable data; IDs come
//   from native responses only; every update sends a fresh re-read `_rev`
//   (updateEntry re-reads when none is supplied). Owned-fixture cleanup runs
//   as FAILURE-SAFE TEARDOWN in the worker whose actor created the fixtures:
//   after every test (pass, fail, or individually selected — after an
//   earlier failure Playwright discards the worker only for LATER tests, so
//   this teardown has already reconciled that worker's registry) plus an
//   afterAll safety net that retries anything still registered. beforeAll
//   deliberately creates no owned fixtures, so a partial setup cannot leak
//   any; a hard worker kill (SIGKILL) is the one path no in-process teardown
//   can cover, and the run reports it through the helper's unresolved
//   registry instead of claiming success. Cleanup touches only the T002
//   owned-fixture registry, and unresolved cleanup FAILS the run truthfully
// - runtime prerequisites the environment does not provide are reported
//   truthfully: an unreachable app fails the worker loudly (helper transport
//   error), and a missing `documents` collection skips as an explicit
//   T005/T006 schema precondition — a skip or discovery listing is NOT a
//   runtime PASS claim

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	createDevBypassActor,
	createSyntheticEntry,
	cmsRequest,
	DEFAULT_DEVELOPMENT_ORIGIN,
	nativeItemOf,
	readEntry,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
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
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The dev-bypass fixture actor owning every synthetic fixture made here. */
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
 * The runner-configured origin for this suite, mirroring playwright.config.ts
 * exactly: the PLAYWRIGHT_BASE_URL environment variable when set, otherwise
 * the documented development origin (the helper default constant). Every
 * actor this file creates is pinned to it, so the checks always exercise the
 * application the runner was pointed at — never a silently defaulted origin
 * that could be a different running development app — and the
 * unauthenticated control below inherits the same origin from the actor.
 *
 * node:process is loaded through a dynamic non-literal import because the
 * pinned dependency baseline intentionally ships no @types/node (the same
 * pattern as readSecretScratch in cms.helpers.ts); the structural cast keeps
 * this file strict-typed.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
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

/**
 * The shared native-validation refusal assertion. A field-validation refusal
 * is the 400 VALIDATION_ERROR envelope — and, explicitly, NOT an
 * authorization (401/403) or any other refusal family, so authorization
 * problems cannot masquerade as field-validation outcomes.
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
		result.status === 401 || result.status === 403,
		`${caseLabel}: a validation refusal must stay distinguishable from an authorization failure (401/403)`,
	).toBe(false);
	const error = result.body as { success?: unknown; error?: { code?: unknown } };
	expect(
		error?.error?.code,
		`${caseLabel}: the refusal must carry the native VALIDATION_ERROR code`,
	).toBe("VALIDATION_ERROR");
}

// ---------------------------------------------------------------------------
// Worker setup: development access and one live schema-readiness read
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// Development-only native access (README §7), pinned to the
	// runner-configured origin so a nondefault PLAYWRIGHT_BASE_URL run
	// cannot silently exercise another app. An unreachable app, a production
	// refusal (403) or an unverified identity throws a scrubbed helper error
	// here — a truthful environment failure for every test in this file,
	// never a field-validation result. This hook deliberately creates no
	// owned fixtures (bootstrap and a schema read only), so a partial setup
	// cannot leak anything for teardown to miss.
	admin = await createDevBypassActor({
		baseUrl: await configuredDevelopmentOrigin(),
	});

	// One live schema read decides readiness. The dev-bypass PAT carries
	// schema:read; the request stays inside the configured app's native API.
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
		problems.length > 0 ? { outcome: "misconfigured", detail: problems.join("; ") } : { outcome: "ready" };
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
		expect(refusal.entryId, `${fieldCase.label}: no entry id may be returned for a refused save`).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Required-file Save refusals (create): missing/null/empty-object file values
// ---------------------------------------------------------------------------
//
// CORRECTIVE ROUND 1 (approval 01a13ed2…): the three formerly asserted
// "malformed" shapes that the pinned platform actually ACCEPTS via its
// documented create/update-time media value normalization (bare "" and bare
// non-URL strings → {provider:"external", id:"", src:<string>}; {id:123} →
// {id:"", provider:"local"}) moved out of this refusal loop into the focused
// normalization regression tests below. Genuine native refusals are retained
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
		expect(refusal.entryId, `${fieldCase.label}: no entry id may be returned for a refused save`).toBeUndefined();
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
	expect(created.entryId, "the accepted create must return a native entry id for read-back").toBeTruthy();

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
	expect(file, "the stored file value must preserve the raw string as src under the external provider").toEqual({
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
		"the pinned normalization coerces a non-string id object to {id:\"\", provider:\"local\"}; acceptance is a Product-Owner-approved V1 limitation",
	).toBe(true);
	expect(created.result.status).toBe(201);
	expect(created.entryId).toBeTruthy();

	const read = await readEntry(admin, DOCUMENT_COLLECTION, created.entryId!);
	expect(read.ok, "the stored Document must be readable by returned id").toBe(true);
	const file = (nativeItemOf(read)?.data as Record<string, unknown> | undefined)?.file;
	expect(file, "the stored file value must be the coerced local-provider representation with an empty id").toEqual({
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
		{ label: "fiscal_year supplied as a string", data: { ...valid(), fiscal_year: "not-a-number" } },
		{ label: "fiscal_year supplied as a non-integer number", data: { ...valid(), fiscal_year: 2568.5 } },
		{
			label: "domain_status supplied outside the approved select options",
			data: { ...valid(), domain_status: `${SYNTHETIC_FIXTURE_MARK}-not-an-option` },
		},
		{ label: "document_at supplied as a non-datetime string", data: { ...valid(), document_at: "not-a-datetime" } },
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
	expectValidationRefusal(refusal, "domain_status supplied outside the approved select options on update");
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
	const url = new URL(`/_emdash/api/content/${DOCUMENT_COLLECTION}`, `${admin.baseUrl}/`);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			data: { title: uniqueTitle(), file: fileValueFor(upload.mediaId!) },
		}),
		redirect: "error",
	});
	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch {
		parsed = { nonJsonBody: await response.text() };
	}
	const result: NativeResult = { ok: response.ok, status: response.status, body: parsed };
	expect(
		result.status === 401 || result.status === 403,
		"an unauthenticated native save must be refused by the authorization layer (401/403)",
	).toBe(true);
	expect(
		result.ok,
		"an unauthenticated native save must not be reported as success",
	).toBe(false);
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
