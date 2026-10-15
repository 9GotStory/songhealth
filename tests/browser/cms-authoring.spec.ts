// T007 — table-driven native authoring checks for the five Feature 002 US1
// content kinds (`pages`, `news`, `activities`, `announcements`,
// `health_content`). Test support in tests/browser/ only: no application,
// schema, seed, dependency, infrastructure, or production change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T007 ("Author table-driven native
//   authoring checks in tests/browser/cms-authoring.spec.ts for all five kinds
//   using T002/T006, title requiredness, representative supplied-value errors,
//   optional omissions/classifications/media, optional Page/Announcement
//   Document selectors, and direct permitted Publish/Schedule of natively
//   valid incomplete fixtures; include no human-approval or custom
//   policy-cancellation expectation") and the shared "Path Conventions and
//   Shared Constraints" section (dev-bypass access, returned IDs/current
//   `_rev`, re-read uncertain outcomes, clean only owned synthetic fixtures,
//   synthetic public-publishable fixtures through native APIs, no invented
//   official inventories)
// - specs/002-cms-content-model/spec.md — Q1 matrix rows for the five kinds
//   ("Title required; other fields optional" at create/save; "Native
//   RBAC/lifecycle only" at Publish/Schedule with no body/image/category/
//   date/gallery/media hook), US1 acceptance scenarios 1–7 (scenario 7:
//   publish/schedule applies native RBAC/lifecycle/revision and built-in
//   validation only — no article reviewer, approval, custom confirm or
//   completeness hook), FR-001/FR-002/FR-003/FR-026/FR-030, SC-001/SC-006
// - specs/002-cms-content-model/data-model.md — the five collection rows
//   (`pages`: title string S; summary text O; body portableText O; image/file
//   fields only "O when useful"; `news`: title S; summary/body O;
//   featured_image image O; source_text text O; news_category/topic O;
//   area/audience O. `activities`: title S; summary/activity_at/location_text/
//   featured_image/gallery/participants_text O; topic/area O. `announcements`:
//   title S; details/announcement_at/opens_at/closes_at O; announcement_type/
//   topic/audience O; Documents O. `health_content`: title S; summary/body/
//   source_text/featured_image/reviewed_at/next_review_at O; topic/audience O),
//   the taxonomies table (topic attached to News, Activity, Announcement,
//   Health Content), the relations table (page_documents and
//   announcement_documents: "many; many", O) and the Common Native Contract
//   ("Native Save validation rejects missing required values and empty
//   required strings; malformed supplied values retain native refusal" with
//   the accepted file-value normalization limitation below)
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes" (create/update/publish/schedule bodies, `references` as a
//   separate body object mapping bound field slug to selected entry ID arrays,
//   "it does not belong in `data`"; latest returned `_rev` preconditions) and
//   "Validation Contract — Native Only" (§1 create/save requiredness with
//   supplied-value refusal, §2 direct Publish/Schedule under native authority
//   without article review/approval/confirmation/completeness gate, §3
//   relationships stay editorial context with no selection adapter, §4 no
//   availability guarantee)
// - specs/002-cms-content-model/quickstart.md — "Focused Native API Checks"
//   (missing/null/empty title, invalid clear, representative invalid supplied
//   type/format values; publish a title-only Page and schedule another with a
//   valid future timezone-offset timestamp/current `_rev`; "Do not assert a
//   universal schedule/reference atomicity guarantee or expect custom
//   `PUBLISH_REJECTED` policy cancellation") and "Feature Journeys"
//   (native save requiredness; direct Publish/Schedule)
// - specs/002-cms-content-model/evidence/T006-shared-model.md — the accepted
//   shared-model verification, the pinned runtime/toolchain standing, and the
//   accepted EmDash 1.1.0 file-value normalization limitation (final
//   corrective-round wording): the three exact observed raw inputs
//   (`file: ""` / `file: "not-an-object"` → `{provider:"external", id:"",
//   src:<the string>}`; `file: {id: 123}` with no explicit provider/src →
//   `{id:"", provider:"local"}`) are accepted-and-normalized results for those
//   exact inputs, NOT universal rules; omitted/null files and objects with
//   neither `id` nor `src` remain native refusals
// - docs/website-modernization-docs/current/02-content-model.md §§3–7 (the
//   five kinds' owning Product fields) and §20 (V1 validation and native
//   limitation boundary)
// - docs/website-modernization-docs/current/07-publishing-workflow.md §3
//   (direct native publishing, no article approval) and §5 (one-time future
//   scheduling, explicit timezone, no early publication)
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (dev-bypass actor pinned to the
//   runner-configured origin, synthetic media/entries with owned-fixture
//   cleanup, fresh `_rev` preconditions, publish/schedule/unschedule request
//   helpers, secret-redacted results)
// - tests/browser/cms-document.spec.ts — the accepted T003 patterns this file
//   follows (schema-readiness gating, refusal-family assertions,
//   failure-safe teardown, the runner-configured origin, the normalization
//   limitation boundary)
// - specs/002-cms-content-model/evidence/T001-development-inputs.md §6–§7 —
//   the truthful readiness limitations these checks skip on rather than
//   masquerading as field-validation results
//
// Verified API surface (recorded per AGENTS.md §External Documentation; every
// release-sensitive claim below was checked first through Context7
// (/microsoft/playwright v1.63.0 for Playwright semantics; /websites/emdashcms
// for unversioned REST orientation) and then against the pinned `emdash@1.1.0`
// archive, npm tarball integrity
// sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==
// — byte-equal to package-lock.json, the same integrity research.md §Evidence
// and the T002/T003 helpers independently verified):
// - POST /_emdash/api/content/{collection} with `data`, `slug?`, `status?
//   "draft"`, `taxonomies?`, `references?` (contentCreateBody; the native API
//   create status is draft-only); `references` maps bound field slug → entry
//   ID array and is resolved IN the create transaction
//   (src/api/handlers/content.ts handleContentCreate: every supplied
//   references entry is resolved by resolveReferenceSelectionTargets and, for
//   the created entry's translation group, written by writeReferenceSelection
//   — `if (created.translationGroup)`), so the optional Page/Announcement
//   Document selections below use the separate native `references` payload
//   exactly as the editorial contract documents
// - resolveReferenceSelectionTargets (src/relations/…): a field slug that is
//   not a bound reference field → `400 VALIDATION_ERROR "Field '…' is not a
//   reference field"`; an unknown target entry → `404 NOT_FOUND "Parent entry
//   '…' not found"`; over-limit selection → VALIDATION_ERROR. A draft target
//   entry resolves (findManyByIdOrSlug does not filter status) — a valid
//   selection asserts the returned identity only, never the target's
//   availability (D-REF deferred)
// - GET /_emdash/api/content/{collection}/{id}/references/{relation}/children
//   (content:read; `includeDrafts` with content:read_drafts) → `data
//   { children: [{ id, slug, collection, title, … }], nextCursor? }`; for a
//   draft entry with a staged selection the staged page is preferred
//   (handleReferenceChildrenGet → stagedPageFor), so the read-back reflects
//   the saved/pending native state rather than promising immediate live edges
// - taxonomies at create/update (`taxonomies: { name: [termSlug, …] }`):
//   assignTaxonomies refuses a non-array and an unknown term slug
//   (`VALIDATION_ERROR "Unknown taxonomy term: …"`) — terms must already
//   exist; the assignment is read back through
//   GET /_emdash/api/content/{collection}/{id}/terms/{taxonomy}
//   (content:read) → `data { terms: [{ id, name, slug, label, … }], … }`
// - synthetic classification fixtures: POST /_emdash/api/taxonomies/{name}/terms
//   (taxonomies:manage) with `{ slug?, label }` creates a term; DELETE
//   /_emdash/api/taxonomies/{name}/terms/{slug} removes it (no in-use guard);
//   GET /_emdash/api/taxonomies (taxonomies:read) lists definitions with
//   their attached `collections` — used to verify the approved `topic`
//   attachment per kind before exercising classification, never to invent an
//   official term inventory (the fixture term below is clearly synthetic and
//   owned-cleaned; the dev-bypass PAT's `admin` scope grants taxonomies:
//   manage/read per @emdash-cms/auth "The `admin` scope grants access to
//   everything")
// - publish/schedule: POST …/publish `{ _rev?, overrideLock? }` and POST
//   …/schedule `{ scheduledAt, _rev?, overrideLock? }` both gate on
//   content:publish_own/content:publish_any (requireOwnerPerm in the routes);
//   the repository `schedule()` sets status "scheduled" + scheduled_at and
//   refuses a non-future time (`VALIDATION_ERROR "Scheduled date must be in
//   the future"`); contentScheduleBody requires ISO 8601 with Z or an
//   explicit offset; the schedule T002 helper additionally refuses an
//   offset-less value locally. DELETE …/schedule unschedules (published stays
//   published; draft/scheduled revert to draft)
// - the content item shape carries `status` ("draft", "published", or
//   "scheduled"), `publishedAt`, `scheduledAt`, `data` (contentItemSchema) —
//   publish/schedule read-backs below assert those native fields by returned
//   id only; `scheduledAt` may be stored in a normalized equivalent form, so
//   the schedule read-back compares the INSTANT (Date.getTime()), not the
//   string
// - image/file value boundary (pinned zod-generator + normalize): image/file
//   fields are objects with required string `id`; the create/update-time
//   media value normalization (src/media/normalize.ts, the documented
//   URL-input path) runs BEFORE field validation and accepts the three exact
//   raw inputs recorded in the T006 limitation — a bare string on an image or
//   file field is therefore NOT asserted as a refusal anywhere in this file
//   (no extrapolation beyond those exact inputs; the required-file
//   regressions live in T003). Values that still reach the schema unchanged
//   ARE genuine refusals and are asserted: an object without `id` (normalize
//   returns null for it, leaving the raw `{}` for the schema) and a
//   non-string non-object value (e.g. a number)
// - offset-less or non-datetime supplied domain dates are refused
//   (z.iso.datetime({ offset: true }) for datetime fields); string/text fields
//   refuse a supplied number; portableText/repeater fields refuse a supplied
//   non-array (only an empty-trimmed STRING on an array-type field is
//   normalized to null, which an optional field accepts)
// - stale `_rev` preconditions: PUT with a superseded `_rev` → `409 CONFLICT`
//   (validateRev → apiError CONFLICT; mapErrorStatus), a native STATE refusal
//   distinct from both field validation (400 VALIDATION_ERROR) and
//   authorization (401/403) — one focused distinction control below; the full
//   revision/lock/concurrency surface is T020's, not T007's
// - authorization refusals: UNAUTHORIZED 401 / FORBIDDEN 403
//   (src/api/authorize.ts requirePerm) — the unauthenticated control below
//   proves that family live against the same endpoint, so an authorization
//   problem can never masquerade as a field-validation outcome (and vice
//   versa)
// - an unknown collection is `404 COLLECTION_NOT_FOUND` (errors.ts) — used as
//   the truthful schema-readiness gate for the not-yet-defined kinds, never
//   as a validation result
// - Playwright 1.63.0 semantics (Context7 /microsoft/playwright v1.63.0,
//   docs/test-api/class-test + docs/test-retries): `test.skip(condition,
//   description)` inside a test body aborts that test at runtime with a
//   recorded reason; tests in one file run sequentially in one worker;
//   test-scoped hooks (afterEach) run when a test finishes — including after a
//   failure and for individually selected tests — in the SAME worker, while a
//   FAILED test causes Playwright to discard that worker for LATER tests.
//   `--list` collects tests without running them (no browser launch) —
//   discovery output is never a runtime PASS claim
//
// Boundaries and non-claims (tasks.md T007; Constitution v3.0.0 II–V):
// - authoring checks only: no role-matrix coverage (T001 §6 records the
//   distinct-role input as pending; T019 owns the Contributor/Author/Editor
//   matrix), no revision/lock depth (T020), no public-read assertions (T021),
//   no actual due-time scheduler execution (T019/T022 — the schedule checks
//   below verify native schedule ACCEPTANCE and read-back of a future
//   explicit-offset time only), no Admin UI journey (T031)
// - the actor is the README §7 development-only dev-bypass Administrator
//   fixture, pinned to the RUNNER-CONFIGURED origin (playwright.config.ts
//   contract: PLAYWRIGHT_BASE_URL or the documented development origin —
//   never the helper default). It carries native publishing authority
//   (content:publish_any), which is exactly what "direct permitted
//   Publish/Schedule under native RBAC" needs; distinct-role coverage is NOT
//   claimed from this actor
// - no human-approval or custom policy-cancellation expectation: every
//   publish/schedule below asserts the NATIVE outcome only (native success
//   envelope or a truthful native refusal family); no Songhealth
//   completeness-hook code, article-review step, confirmation, or
//   `PUBLISH_REJECTED`-style policy cancellation is expected or asserted —
//   none exists in the native-only architecture
// - no availability/retention claim: a valid media selection or Document
//   reference proves only that the native save accepted the returned identity
//   — NO file immutability, byte availability, published-target or
//   removal-protection outcome is asserted (D-REF stays deferred;
//   native-editorial.md "Availability")
// - no Page media field is exercised or required: the approved `pages`
//   definition makes image/file fields conditional ("O when useful"), and
//   this file invents nothing beyond it; the schema gate checks only the
//   unconditional approved fields each exercised check relies on
// - fixtures are clearly-marked synthetic public-publishable data; content
//   IDs, `_rev` values, media IDs and term identities come from native
//   responses only. Owned-fixture cleanup runs as FAILURE-SAFE TEARDOWN in
//   the worker whose actor created the fixtures (after every test — pass,
//   fail, or individually selected — plus an afterAll safety net), and
//   synthetic classification terms are deleted after the entries that use
//   them. beforeAll deliberately creates no owned fixtures. A hard worker
//   kill (SIGKILL) is the one path no in-process teardown can cover; the run
//   reports it through unresolved cleanup instead of claiming success
// - runtime prerequisites the environment does not provide are reported
//   truthfully: an unreachable app fails the worker loudly (helper transport
//   error), and a missing collection skips as an explicit T008–T012 schema
//   prerequisite — a skip, a discovery listing, or a source review is NOT a
//   runtime PASS claim; T013 owns the complete US1 runtime verification

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createDevBypassActor,
	createSyntheticEntry,
	CmsHelperError,
	DEFAULT_DEVELOPMENT_ORIGIN,
	nativeDataOf,
	nativeItemOf,
	nativeItemsOf,
	nativeRefusalOf,
	publishEntry,
	readEntry,
	scheduleEntry,
	scrubEmbeddedSecrets,
	unscheduleEntry,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// The five-kind table (data-model.md collection rows; tasks.md T008–T012)
// ---------------------------------------------------------------------------

/** A repeater subfield definition as the native schema read returns it. */
interface RepeaterSubField {
	slug?: unknown;
	type?: unknown;
}

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
	validation?: { options?: unknown; subFields?: unknown; relation?: unknown; relationSide?: unknown };
}

/**
 * One exercised US1 kind. `requiredFields`/`optionalFields` name only the
 * UNCONDITIONAL approved fields the checks below rely on (title plus each
 * kind's exercised optional data fields); the `pages` image/file fields are
 * deliberately absent — their approved definition is conditional ("O when
 * useful") and nothing here may invent or require them.
 */
interface KindCase {
	collection: string;
	/** Approved optional fields this file exercises, with their native types. */
	exercisedOptionalFields: Array<{ slug: string; type: string }>;
	/**
	 * Representative INVALID supplied values for this kind's approved native
	 * field types. Each case layers onto a valid title-only body so the
	 * refusal can only be about the supplied VALUE.
	 */
	invalidSuppliedCases: Array<{ label: string; data: Record<string, unknown> }>;
	/**
	 * The approved shared classification attached to this kind (data-model
	 * taxonomies table). `topic` exists since T004/T005; T009–T012 attach it
	 * to these kinds. Pages carries no classification in the approved model.
	 */
	classificationTaxonomy?: "topic";
	/** The optional Page/Announcement Document relation, when this kind has one. */
	documentsRelation?: { fieldSlug: string; relation: string };
}

const KINDS: readonly KindCase[] = [
	{
		collection: "pages",
		exercisedOptionalFields: [
			{ slug: "summary", type: "text" },
			{ slug: "body", type: "portableText" },
		],
		invalidSuppliedCases: [
			{ label: "body (portableText) supplied as a number", data: { body: 123 } },
		],
		documentsRelation: { fieldSlug: "documents", relation: "page_documents" },
	},
	{
		collection: "news",
		exercisedOptionalFields: [
			{ slug: "summary", type: "text" },
			{ slug: "body", type: "portableText" },
			{ slug: "featured_image", type: "image" },
			{ slug: "source_text", type: "text" },
		],
		invalidSuppliedCases: [
			{ label: "featured_image (image) supplied as an object without id", data: { featured_image: {} } },
			{ label: "featured_image (image) supplied as a number", data: { featured_image: 123 } },
			{ label: "source_text (text) supplied as a number", data: { source_text: 123 } },
		],
		classificationTaxonomy: "topic",
	},
	{
		collection: "activities",
		exercisedOptionalFields: [
			{ slug: "summary", type: "text" },
			{ slug: "activity_at", type: "datetime" },
			{ slug: "location_text", type: "string" },
			{ slug: "featured_image", type: "image" },
			{ slug: "gallery", type: "repeater" },
			{ slug: "participants_text", type: "text" },
		],
		invalidSuppliedCases: [
			{ label: "activity_at supplied as a non-datetime string", data: { activity_at: "not-a-datetime" } },
			{ label: "activity_at supplied without a timezone offset", data: { activity_at: "2026-10-15T10:00:00" } },
			{ label: "gallery (repeater) supplied as a string", data: { gallery: "not-an-array" } },
			{ label: "featured_image (image) supplied as an object without id", data: { featured_image: {} } },
		],
		classificationTaxonomy: "topic",
	},
	{
		collection: "announcements",
		exercisedOptionalFields: [
			{ slug: "details", type: "portableText" },
			{ slug: "announcement_at", type: "datetime" },
			{ slug: "opens_at", type: "datetime" },
			{ slug: "closes_at", type: "datetime" },
		],
		invalidSuppliedCases: [
			{ label: "announcement_at supplied as a non-datetime string", data: { announcement_at: "not-a-datetime" } },
			{ label: "announcement_at supplied without a timezone offset", data: { announcement_at: "2026-10-15T10:00:00" } },
			{ label: "details (portableText) supplied as a number", data: { details: 123 } },
		],
		classificationTaxonomy: "topic",
		documentsRelation: { fieldSlug: "documents", relation: "announcement_documents" },
	},
	{
		collection: "health_content",
		exercisedOptionalFields: [
			{ slug: "summary", type: "text" },
			{ slug: "body", type: "portableText" },
			{ slug: "source_text", type: "text" },
			{ slug: "featured_image", type: "image" },
			{ slug: "reviewed_at", type: "datetime" },
			{ slug: "next_review_at", type: "datetime" },
		],
		invalidSuppliedCases: [
			{ label: "next_review_at supplied without a timezone offset", data: { next_review_at: "2026-10-15T10:00:00" } },
			{ label: "reviewed_at supplied as a non-datetime string", data: { reviewed_at: "not-a-datetime" } },
			{ label: "featured_image (image) supplied as an object without id", data: { featured_image: {} } },
		],
		classificationTaxonomy: "topic",
	},
];

/** The shared native Document collection (T005/T006) the selectors target. */
const DOCUMENT_COLLECTION = "documents";

/** Approved explicit-offset sample for valid supplied domain dates (+07:00). */
const VALID_OFFSET_DATETIME = "2026-10-15T10:00:00+07:00";

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/**
 * Readiness for one kind, decided once per worker in beforeAll from live
 * native schema/taxonomy reads: `missing` (collection not initialized — the
 * T008–T012 schema prerequisite outstanding) skips explicitly; `misconfigured`
 * (collection present but not matching the approved definition) FAILS loudly
 * so an unexpected schema mismatch stays visible.
 */
type KindReadiness =
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The dev-bypass fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Per-kind readiness, keyed by collection slug; set by beforeAll. */
const kindReadiness = new Map<string, KindReadiness>();

/** Per-kind field map from the live schema read (for repeater subfields). */
const kindFields = new Map<string, Map<string, SchemaField>>();

/** The `topic` taxonomy definition read in beforeAll, when it exists. */
let topicTaxonomy: { attachedCollections: string[] } | undefined;

/** Synthetic classification term created on demand and cleaned in teardown. */
let syntheticTerm: { taxonomy: string; slug: string } | undefined;

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** A minimal valid portableText value (typed loosely by the native schema). */
function portableTextValue(): Array<Record<string, unknown>> {
	return [{ _type: `${SYNTHETIC_FIXTURE_MARK}-paragraph`, _key: crypto.randomUUID().slice(0, 8) }];
}

/**
 * A valid native image/file value for an uploaded fixture media id (the same
 * selection shape as the accepted T003 checks; presence of the id asserts the
 * SELECTION only, never byte availability).
 */
function imageValueFor(mediaId: string): { id: string } {
	return { id: mediaId };
}

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003 checks): PLAYWRIGHT_BASE_URL when set,
 * otherwise the documented development origin. node:process is loaded through
 * a dynamic non-literal import because the pinned dependency baseline ships
 * no @types/node.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

/** Readiness of one kind, defaulting to missing before beforeAll completes. */
function readinessOf(kind: KindCase): KindReadiness {
	return kindReadiness.get(kind.collection) ?? { outcome: "missing" };
}

/**
 * Truthful schema gate for one kind: a missing collection is the T008–T012
 * schema prerequisite outstanding and SKIPS explicitly (never a validation
 * failure, never PASS); a present but wrongly-configured collection FAILS
 * loudly instead of producing wrong expectations from an unmatched schema.
 */
function gateKind(kind: KindCase): void {
	const readiness = readinessOf(kind);
	test.skip(
		readiness.outcome === "missing",
		`the ${kind.collection} collection is not initialized in the active native schema (T008–T012 schema prerequisite outstanding; this run cannot exercise ${kind.collection} authoring)`,
	);
	if (readiness.outcome === "misconfigured") {
		throw new Error(
			`the active native ${kind.collection} collection does not match the approved definitions: ${readiness.detail}`,
		);
	}
}

/** The kinds whose collections are live and approved in this environment. */
function readyKinds(): KindCase[] {
	return KINDS.filter((kind) => readinessOf(kind).outcome === "ready");
}

/**
 * Build one valid gallery row from the LIVE repeater subfield definitions
 * (image subfields get the uploaded fixture media id, string subfields a
 * synthetic caption, others are skipped): the row shape is derived from the
 * applied schema rather than invented here, because T010 owns the subfield
 * definitions.
 */
function syntheticGalleryRow(kind: KindCase, mediaId: string): Record<string, unknown> | undefined {
	const fields = kindFields.get(kind.collection);
	const gallery = fields?.get("gallery");
	const subFields = gallery?.validation?.subFields;
	if (!Array.isArray(subFields) || subFields.length === 0) {
		return undefined;
	}
	const row: Record<string, unknown> = {};
	for (const subField of subFields as RepeaterSubField[]) {
		if (typeof subField.slug !== "string") continue;
		if (subField.type === "image") row[subField.slug] = imageValueFor(mediaId);
		else if (subField.type === "string" || subField.type === "text") {
			row[subField.slug] = `${SYNTHETIC_FIXTURE_MARK} gallery caption`;
		}
	}
	return Object.keys(row).length > 0 ? row : undefined;
}

/**
 * Representative valid optional values for one kind, from the approved
 * data-model row. Media-bearing kinds need the uploaded fixture media id.
 */
function optionalValuesFor(
	kind: KindCase,
	mediaId: string | undefined,
): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	for (const field of kind.exercisedOptionalFields) {
		switch (field.type) {
			case "text":
				data[field.slug] = `${SYNTHETIC_FIXTURE_MARK} ${field.slug}`;
				break;
			case "string":
				data[field.slug] = `${SYNTHETIC_FIXTURE_MARK} ${field.slug}`;
				break;
			case "portableText":
				data[field.slug] = portableTextValue();
				break;
			case "image":
				if (mediaId !== undefined) data[field.slug] = imageValueFor(mediaId);
				break;
			case "datetime":
				data[field.slug] = VALID_OFFSET_DATETIME;
				break;
			case "repeater": {
				if (mediaId === undefined) break;
				const row = syntheticGalleryRow(kind, mediaId);
				if (row !== undefined) data[field.slug] = [row];
				break;
			}
		}
	}
	return data;
}

/**
 * Ensure one clearly-synthetic classification term exists in the shared
 * `topic` taxonomy (native POST /_emdash/api/taxonomies/{name}/terms,
 * taxonomies:manage via the dev-bypass admin scope) and register it for
 * teardown deletion. The term is a synthetic public-publishable fixture, not
 * an official inventory entry; its identity comes from the native response.
 */
async function ensureSyntheticTopicTerm(): Promise<string> {
	if (syntheticTerm !== undefined) {
		return syntheticTerm.slug;
	}
	const slug = `${SYNTHETIC_FIXTURE_MARK}-topic-${crypto.randomUUID().slice(0, 8)}`;
	const created = await cmsRequest(admin, "/_emdash/api/taxonomies/topic/terms", {
		method: "POST",
		body: { slug, label: `${SYNTHETIC_FIXTURE_MARK} topic term` },
	});
	if (!created.ok) {
		throw new CmsHelperError(
			"TERM_CREATE_FAILED",
			`creating the synthetic topic term must succeed when topic is attached (${nativeRefusalOf(created)})`,
		);
	}
	syntheticTerm = { taxonomy: "topic", slug };
	return slug;
}

/** Delete the synthetic term registered by ensureSyntheticTopicTerm. */
async function deleteSyntheticTerm(): Promise<void> {
	const term = syntheticTerm;
	syntheticTerm = undefined;
	if (term === undefined) return;
	const removal = await cmsRequest(
		admin,
		`/_emdash/api/taxonomies/${term.taxonomy}/terms/${encodeURIComponent(term.slug)}`,
		{ method: "DELETE" },
	);
	expect(
		removal.ok,
		`the owned synthetic ${term.taxonomy} term '${term.slug}' must be deleted by its returned slug (unresolved cleanup is a reported failure, not a silent leftover)`,
	).toBe(true);
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertions
// ---------------------------------------------------------------------------

/**
 * A native field-validation refusal: HTTP 400 with the VALIDATION_ERROR code,
 * and explicitly NOT an authorization (401/403) or state (409) refusal — so
 * authorization and concurrency problems can never masquerade as field
 * validation outcomes (and vice versa).
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
 * an unknown selected entry id is refused `404 NOT_FOUND` by
 * resolveReferenceSelectionTargets.)
 */
function expectTargetRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the native save must be refused, not reported as success`,
	).toBe(false);
	expect(result.status, `${caseLabel}: an unknown reference target is refused with 404`).toBe(404);
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

// ---------------------------------------------------------------------------
// Worker setup: development access and the live schema/taxonomy reads
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// Development-only native access (README §7), pinned to the
	// runner-configured origin so a nondefault PLAYWRIGHT_BASE_URL run cannot
	// silently exercise another app. This hook deliberately creates no owned
	// fixtures (bootstrap and schema/taxonomy reads only), so a partial setup
	// cannot leak anything for teardown to miss.
	admin = await createDevBypassActor({
		baseUrl: await configuredDevelopmentOrigin(),
	});

	// One live taxonomy read for the approved shared classification. `topic`
	// has existed since T004/T005; its per-kind ATTACHMENT is part of the
	// T009–T012 definitions and is checked per kind below.
	const taxonomiesRead = await cmsRequest(admin, "/_emdash/api/taxonomies");
	if (taxonomiesRead.ok) {
		const topic = nativeItemsOf(taxonomiesRead).find(
			(item) =>
				(item as { name?: unknown }).name === "topic" ||
				(item as { slug?: unknown }).slug === "topic",
		) as { collections?: unknown } | undefined;
		topicTaxonomy =
			topic !== undefined && Array.isArray(topic.collections)
				? { attachedCollections: topic.collections.filter((c): c is string => typeof c === "string") }
				: undefined;
	}

	// One live schema read per kind decides its readiness.
	for (const kind of KINDS) {
		const schemaRead = await cmsRequest(
			admin,
			`/_emdash/api/schema/collections/${encodeURIComponent(kind.collection)}`,
			{ searchParams: { includeFields: "true" } },
		);
		if (schemaRead.status === 404) {
			// COLLECTION_NOT_FOUND: this kind's T008–T012 definition is not
			// applied yet. T007 authors the checks; T013 inspects/applies the
			// US1 definitions and runs them. Skipping is the truthful outcome.
			kindReadiness.set(kind.collection, { outcome: "missing" });
			continue;
		}
		expect(
			schemaRead.ok,
			`reading the native ${kind.collection} collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
		).toBe(true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(Array.isArray(fields), `the ${kind.collection} schema read must include fields`).toBe(true);
		const bySlug = new Map<string, SchemaField>();
		for (const field of fields as SchemaField[]) {
			if (typeof field.slug === "string") bySlug.set(field.slug, field);
		}
		kindFields.set(kind.collection, bySlug);

		const problems: string[] = [];
		const titleField = bySlug.get("title");
		if (titleField?.type !== "string" || titleField.required !== true) {
			problems.push("title must be a required native string field");
		}
		// Every exercised optional field must exist with its approved native
		// type, so a supplied-value refusal below can only ever be about the
		// VALUE — an absent field (whose supplied key would surface as the
		// same VALIDATION_ERROR family via "unknown_field") cannot masquerade
		// as a type/datetime/image check.
		for (const field of kind.exercisedOptionalFields) {
			if (bySlug.get(field.slug)?.type !== field.type) {
				problems.push(`${field.slug} must exist as a native ${field.type} field`);
			}
		}
		// The approved shared classification must actually be attached to this
		// kind when the checks exercise it (data-model taxonomies table;
		// T009–T012 attach topic to news/activities/announcements/
		// health_content).
		if (
			kind.classificationTaxonomy === "topic" &&
			(topicTaxonomy === undefined || !topicTaxonomy.attachedCollections.includes(kind.collection))
		) {
			problems.push("the shared topic taxonomy must be attached to this collection");
		}
		// The optional Document selector must be a bound native reference
		// field on its approved relation, when this kind exercises it.
		if (kind.documentsRelation !== undefined) {
			const documentsField = bySlug.get(kind.documentsRelation.fieldSlug);
			if (documentsField?.type !== "reference") {
				problems.push(
					`${kind.documentsRelation.fieldSlug} must exist as a native reference field`,
				);
			} else if (documentsField.validation?.relation !== kind.documentsRelation.relation) {
				problems.push(
					`${kind.documentsRelation.fieldSlug} must be bound to the ${kind.documentsRelation.relation} relation`,
				);
			}
		}
		kindReadiness.set(
			kind.collection,
			problems.length > 0
				? { outcome: "misconfigured", detail: problems.join("; ") }
				: { outcome: "ready" },
		);
	}
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup
// ---------------------------------------------------------------------------
//
// Cleanup runs as guaranteed TEARDOWN for the actor that created the fixtures,
// never as a trailing ordinary test (same contract as the accepted T003
// checks): a test-scoped afterEach runs in the same worker after EVERY test —
// passed, failed, or individually selected by a filter — and Playwright
// discards a failed test's worker only for LATER tests, after this hook has
// already reconciled that worker's registry. The afterAll safety net retries
// anything still registered. Synthetic classification terms are deleted AFTER
// the entries that reference them. Unresolved cleanup fails the run
// truthfully; only owned synthetic fixtures, terms, and the T002 registry are
// ever touched.

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) {
		return;
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	await deleteSyntheticTerm();
	console.log(
		`[cms-authoring] owned-fixture cleanup after test: ${
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
	await deleteSyntheticTerm();
	expect(
		report.complete,
		"the final worker cleanup must leave zero unresolved owned fixtures",
	).toBe(true);
});

// ---------------------------------------------------------------------------
// Per-kind schema preconditions (table-driven; generated from KINDS)
// ---------------------------------------------------------------------------

for (const kind of KINDS) {
	test(`${kind.collection} schema precondition: approved native definition is active`, () => {
		gateKind(kind);
		// gateKind skips when the collection is missing and throws when it is
		// misconfigured; reaching here with outcome "ready" is the asserted
		// precondition itself (title string S, the exercised optional fields,
		// the approved topic attachment, and the bound Document selector where
		// applicable).
		expect(readinessOf(kind).outcome).toBe("ready");
	});
}

// ---------------------------------------------------------------------------
// Valid controls — create/save/reopen with permitted optional omissions
// ---------------------------------------------------------------------------

test("create/save/reopen: title-only minimal drafts save with permitted optional omissions", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		// Only `title` supplied: every other approved field of this kind —
		// summary/body/media, the shared classifications, and the optional
		// Document selectors — is a permitted omission at native save.
		const title = uniqueTitle(kind.collection);
		const created = await createSyntheticEntry(admin, kind.collection, { data: { title } });
		expect(
			created.result.ok,
			`${kind.collection}: the title-only minimal draft must save (optional omissions are permitted)`,
		).toBe(true);
		expect(
			created.result.status,
			`${kind.collection}: a native create succeeds with 201`,
		).toBe(201);
		expect(
			created.entryId,
			`${kind.collection}: the entry id must come from the native response`,
		).toBeTruthy();
		expect(
			created.rev,
			`${kind.collection}: a native \`_rev\` must be returned`,
		).toBeTruthy();

		// Reopen by returned id only: the same title reads back and the entry
		// is a native draft.
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the saved draft must be readable by returned id`,
		).toBe(true);
		const item = nativeItemOf(read);
		expect(
			(item?.data as Record<string, unknown> | undefined)?.title,
			`${kind.collection}: the read-back title must match the supplied title`,
		).toBe(title);
		expect(
			item?.status,
			`${kind.collection}: a fresh native create is a draft`,
		).toBe("draft");
	}
});

test("valid control: representative optional supplied values save and read back", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		// Kinds with an exercised image field need one uploaded synthetic
		// fixture media id; its read-back asserts the SELECTION identity only
		// (no byte-availability claim — D-REF stays deferred).
		const needsMedia = kind.exercisedOptionalFields.some(
			(field) => field.type === "image" || field.type === "repeater",
		);
		let mediaId: string | undefined;
		if (needsMedia) {
			const upload = await uploadSyntheticMedia(admin);
			expect(
				upload.result.ok,
				`${kind.collection}: the synthetic fixture media upload must succeed`,
			).toBe(true);
			expect(
				upload.mediaId,
				`${kind.collection}: a media id must be returned by the native response and registered for owned cleanup`,
			).toBeTruthy();
			mediaId = upload.mediaId;
		}

		const optional = optionalValuesFor(kind, mediaId);
		expect(
			Object.keys(optional).length,
			`${kind.collection}: the optional-value control must exercise at least one field`,
		).toBeGreaterThan(0);
		const title = uniqueTitle(kind.collection);
		const created = await createSyntheticEntry(admin, kind.collection, {
			data: { title, ...optional },
		});
		expect(
			created.result.ok,
			`${kind.collection}: valid supplied optional values must save alongside the required title`,
		).toBe(true);
		expect(
			created.entryId,
			`${kind.collection}: the created entry id must come from the native response`,
		).toBeTruthy();

		// Read back the supplied values by returned id; media selections come
		// back with the uploaded media id (the returned native identity).
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the saved entry must be readable by returned id`,
		).toBe(true);
		const data = nativeItemOf(read)?.data as Record<string, unknown> | undefined;
		for (const [slug, value] of Object.entries(optional)) {
			if (slug === "gallery") {
				// The repeater read-back preserves the supplied row count; the
				// row itself may be enriched by the platform's normalization.
				expect(
					Array.isArray(data?.[slug]) && (data![slug] as unknown[]).length,
					`${kind.collection}: the supplied gallery rows must read back`,
				).toBeGreaterThan(0);
			} else if (typeof value === "object" && value !== null && "id" in value) {
				expect(
					(data?.[slug] as { id?: unknown } | undefined)?.id,
					`${kind.collection}: the ${slug} selection must read back the uploaded media id`,
				).toBe((value as { id: unknown }).id);
			} else {
				expect(
					data?.[slug],
					`${kind.collection}: the supplied ${slug} value must read back`,
				).toEqual(value);
			}
		}
	}
});

test("native classification attachment saves and reads back by returned term identity", async () => {
	const kinds = readyKinds().filter((kind) => kind.classificationTaxonomy === "topic");
	test.skip(
		kinds.length === 0,
		"no US1 collection with an approved topic classification is initialized (T009–T012 schema prerequisites outstanding)",
	);
	const termSlug = await ensureSyntheticTopicTerm();
	for (const kind of kinds) {
		const title = uniqueTitle(kind.collection);
		const created = await createSyntheticEntry(admin, kind.collection, {
			data: { title },
			taxonomies: { topic: [termSlug] },
		});
		expect(
			created.result.ok,
			`${kind.collection}: a valid shared-classification assignment must save (classifications are optional, never a save gate)`,
		).toBe(true);
		expect(
			created.entryId,
			`${kind.collection}: the classified entry id must come from the native response`,
		).toBeTruthy();

		// Read the assignment back through the native entry-terms endpoint and
		// assert the RETURNED term identity (slug), never an invented one.
		const terms = await cmsRequest(
			admin,
			`/_emdash/api/content/${encodeURIComponent(kind.collection)}/${encodeURIComponent(created.entryId!)}/terms/topic`,
		);
		expect(
			terms.ok,
			`${kind.collection}: the assigned terms must be readable through the native entry-terms endpoint`,
		).toBe(true);
		const assigned = nativeDataOf(terms)?.terms;
		expect(
			Array.isArray(assigned) &&
				(assigned as Array<{ slug?: unknown }>).some((term) => term.slug === termSlug),
			`${kind.collection}: the read-back terms must include the synthetic term by its returned slug`,
		).toBe(true);
	}
});

// ---------------------------------------------------------------------------
// Required-title refusals (create) and invalid clears (update)
// ---------------------------------------------------------------------------

test("create refuses missing, null and empty required title", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		const cases: Array<{ label: string; data: Record<string, unknown> }> = [
			{ label: `${kind.collection}: title omitted`, data: {} },
			{ label: `${kind.collection}: title null`, data: { title: null } },
			{ label: `${kind.collection}: title empty string`, data: { title: "" } },
		];
		for (const fieldCase of cases) {
			const refusal = await createSyntheticEntry(admin, kind.collection, {
				data: fieldCase.data,
			});
			expectValidationRefusal(refusal.result, fieldCase.label);
			expect(
				refusal.entryId,
				`${fieldCase.label}: no entry id may be returned for a refused save`,
			).toBeUndefined();
		}
	}
});

test("update refuses invalid clearing of the required title", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		const title = uniqueTitle(kind.collection);
		const created = await createSyntheticEntry(admin, kind.collection, { data: { title } });
		expect(
			created.result.ok,
			`${kind.collection}: the valid draft fixture must save`,
		).toBe(true);

		// Each invalid clear is its own update with a fresh `_rev` (updateEntry
		// re-reads), so the refusal is about the supplied value, never a stale
		// precondition.
		const cases: Array<{ label: string; data: Record<string, unknown> }> = [
			{ label: `${kind.collection}: title cleared to empty string`, data: { title: "" } },
			{ label: `${kind.collection}: title cleared to null`, data: { title: null } },
		];
		for (const fieldCase of cases) {
			const refusal = await updateEntry(admin, kind.collection, created.entryId!, {
				data: fieldCase.data,
			});
			expectValidationRefusal(refusal, fieldCase.label);
		}

		// Re-read after the refused clears: the required title is intact.
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the draft must remain readable after refused clears`,
		).toBe(true);
		expect(
			(nativeItemOf(read)?.data as { title?: unknown } | undefined)?.title,
			`${kind.collection}: the refused title clear must not have taken effect`,
		).toBe(title);
	}
});

// ---------------------------------------------------------------------------
// Representative invalid supplied values (per approved native field types)
// ---------------------------------------------------------------------------

test("create refuses representative invalid supplied values for the approved native field types", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		for (const fieldCase of kind.invalidSuppliedCases) {
			const refusal = await createSyntheticEntry(admin, kind.collection, {
				data: { title: uniqueTitle(kind.collection), ...fieldCase.data },
			});
			expectValidationRefusal(refusal.result, fieldCase.label);
			expect(
				refusal.entryId,
				`${fieldCase.label}: no entry id may be returned for a refused save`,
			).toBeUndefined();
		}
	}
	// Normalization boundary (accepted T006 limitation, final wording): the
	// three exact raw file inputs the pinned platform normalizes are NOT
	// asserted here — a bare string on an image/file field is the documented
	// URL-input path, not a guaranteed rejection, and no new image requirement
	// is extrapolated. The refusals above are only values that still reach the
	// native schema unchanged (objects without `id`, non-string non-objects).
});

// ---------------------------------------------------------------------------
// Optional Page/Announcement Document selections (separate references payload)
// ---------------------------------------------------------------------------

test("optional Page/Announcement Document selections save via separate native references payloads and read back by returned identity", async () => {
	const kinds = readyKinds().filter((kind) => kind.documentsRelation !== undefined);
	test.skip(
		kinds.length === 0,
		"neither pages nor announcements is initialized with its bound Document selector (T008/T011 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		const relation = kind.documentsRelation!;
		// One synthetic Document in the SHARED collection T005/T006 already
		// defined and verified — never an invented target, and never a claim
		// about the Document's later availability (D-REF deferred).
		const upload = await uploadSyntheticMedia(admin);
		expect(
			upload.result.ok,
			`${kind.collection}: the synthetic fixture media upload for the Document must succeed`,
		).toBe(true);
		expect(
			upload.mediaId,
			`${kind.collection}: a media id must be returned by the native response and registered for owned cleanup`,
		).toBeTruthy();
		const document = await createSyntheticEntry(admin, DOCUMENT_COLLECTION, {
			data: {
				title: uniqueTitle(DOCUMENT_COLLECTION),
				file: imageValueFor(upload.mediaId!),
			},
		});
		expect(
			document.result.ok,
			`${kind.collection}: the synthetic Document fixture must save in the shared documents collection`,
		).toBe(true);
		expect(
			document.entryId,
			`${kind.collection}: the Document id must come from the native response`,
		).toBeTruthy();

		// The selection is a separate native `references` payload keyed by the
		// bound field slug — it does not belong in `data` (native-editorial
		// contract; this is the distinction that closed B-Q1-REF without an
		// adapter).
		const title = uniqueTitle(kind.collection);
		const created = await createSyntheticEntry(admin, kind.collection, {
			data: { title },
			references: { [relation.fieldSlug]: [document.entryId!] },
		});
		expect(
			created.result.ok,
			`${kind.collection}: a valid optional Document selection must save with the title-only body`,
		).toBe(true);
		expect(
			created.entryId,
			`${kind.collection}: the entry id must come from the native response`,
		).toBeTruthy();

		// `data` carries no references key: the selection stays in the native
		// references channel.
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the saved entry must be readable by returned id`,
		).toBe(true);
		expect(
			(nativeItemOf(read)?.data as Record<string, unknown> | undefined)?.[relation.fieldSlug],
			`${kind.collection}: the references payload must not be stored inside data`,
		).toBeUndefined();

		// Read the selection back through the native relation children
		// listing and assert the RETURNED Document identity. For a draft entry
		// this reflects the saved native selection state (staged, with
		// read_drafts authority) — it asserts identity only, never the
		// target's availability or any live/public state.
		const children = await cmsRequest(
			admin,
			`/_emdash/api/content/${encodeURIComponent(kind.collection)}/${encodeURIComponent(created.entryId!)}/references/${encodeURIComponent(relation.relation)}/children`,
		);
		expect(
			children.ok,
			`${kind.collection}: the saved selection must be readable through the native relation children listing`,
		).toBe(true);
		const selected = nativeDataOf(children)?.children;
		expect(
			Array.isArray(selected) &&
				(selected as Array<{ id?: unknown }>).some((child) => child.id === document.entryId),
			`${kind.collection}: the read-back selection must contain the Document by its returned id`,
		).toBe(true);

		// Representative invalid SUPPLIED reference values are refused by the
		// native resolver — an unknown target id and a non-reference field
		// slug — both distinguishable from authorization failures.
		const unknownTarget = await createSyntheticEntry(admin, kind.collection, {
			data: { title: uniqueTitle(kind.collection) },
			references: { [relation.fieldSlug]: [`${SYNTHETIC_FIXTURE_MARK}-no-such-entry`] },
		});
		expectTargetRefusal(
			unknownTarget.result,
			`${kind.collection}: unknown Document target id in the references payload`,
		);
		expect(
			unknownTarget.entryId,
			`${kind.collection}: no entry id may be returned for a refused reference selection`,
		).toBeUndefined();

		const notAReferenceField = await createSyntheticEntry(admin, kind.collection, {
			data: { title: uniqueTitle(kind.collection) },
			references: { title: [document.entryId!] },
		});
		expectValidationRefusal(
			notAReferenceField.result,
			`${kind.collection}: references keyed by a non-reference field slug`,
		);
		expect(
			notAReferenceField.entryId,
			`${kind.collection}: no entry id may be returned for a refused reference selection`,
		).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Direct native Publish and Schedule of natively valid incomplete fixtures
// ---------------------------------------------------------------------------

test("direct native Publish accepts valid incomplete title-only content and read-back shows published", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	for (const kind of kinds) {
		// A title-only draft is valid-but-incomplete under the native-only Q1
		// matrix: every other field is a permitted omission at Publish. The
		// dev-bypass Administrator carries native publishing authority
		// (content:publish_any); no article review, confirmation, or
		// Songhealth completeness hook exists to expect (native-only
		// architecture) — only the native outcome is asserted.
		const created = await createSyntheticEntry(admin, kind.collection, {
			data: { title: uniqueTitle(kind.collection) },
		});
		expect(
			created.result.ok,
			`${kind.collection}: the title-only fixture must save before publishing`,
		).toBe(true);

		// publishEntry supplies a fresh re-read `_rev` precondition.
		const published = await publishEntry(admin, kind.collection, created.entryId!);
		expect(
			published.ok,
			`${kind.collection}: direct native Publish of valid incomplete content by an authorized publisher must be accepted (native RBAC/lifecycle only; no completeness hook)`,
		).toBe(true);
		expect(
			nativeItemOf(published)?.status,
			`${kind.collection}: the publish response item must report the native published status`,
		).toBe("published");

		// Read the state back by returned id (never assume the response alone).
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the published entry must be readable by returned id`,
		).toBe(true);
		const item = nativeItemOf(read);
		expect(
			item?.status,
			`${kind.collection}: the read-back status must be published`,
		).toBe("published");
		expect(
			typeof item?.publishedAt === "string" && item.publishedAt.length > 0,
			`${kind.collection}: publishing must record a native publishedAt`,
		).toBe(true);
	}
});

test("direct native Schedule accepts valid incomplete title-only content with an explicit-offset future time", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	// One future instant (~1 hour out), expressed with an explicit +07:00
	// offset as FR-023/the editorial contract require (the +07:00 wall clock of
	// an instant is its UTC wall clock shifted seven hours ahead). Actual
	// due-time execution belongs to T019/T022; this check verifies native
	// schedule ACCEPTANCE and read-back only.
	const scheduledInstant = Date.now() + 60 * 60 * 1000;
	const offsetScheduledAt = `${new Date(scheduledInstant + 7 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 19)}.000+07:00`;
	for (const kind of kinds) {
		const created = await createSyntheticEntry(admin, kind.collection, {
			data: { title: uniqueTitle(kind.collection) },
		});
		expect(
			created.result.ok,
			`${kind.collection}: the title-only fixture must save before scheduling`,
		).toBe(true);

		// scheduleEntry supplies a fresh re-read `_rev` precondition and
		// refuses an offset-less timestamp locally; the supplied time is
		// future with an explicit offset.
		const scheduled = await scheduleEntry(admin, kind.collection, created.entryId!, offsetScheduledAt);
		expect(
			scheduled.ok,
			`${kind.collection}: direct native Schedule of valid incomplete content by an authorized publisher must be accepted (native RBAC/time checks only; no completeness hook)`,
		).toBe(true);
		expect(
			nativeItemOf(scheduled)?.status,
			`${kind.collection}: the schedule response item must report the native scheduled status`,
		).toBe("scheduled");

		// Read the state back by returned id; the stored scheduledAt may be
		// normalized, so the INSTANT is compared, not the string.
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(
			read.ok,
			`${kind.collection}: the scheduled entry must be readable by returned id`,
		).toBe(true);
		const item = nativeItemOf(read);
		expect(
			item?.status,
			`${kind.collection}: the read-back status must be scheduled`,
		).toBe("scheduled");
		expect(
			typeof item?.scheduledAt === "string" &&
				Math.abs(new Date(item.scheduledAt).getTime() - scheduledInstant) < 1000,
			`${kind.collection}: the read-back scheduledAt must express the supplied future instant`,
		).toBe(true);

		// Clear the schedule through the native endpoint afterwards so the
		// owned fixture returns to draft before teardown (native permission
		// checks apply; the author of the schedule may clear it).
		const unscheduled = await unscheduleEntry(admin, kind.collection, created.entryId!);
		expect(
			unscheduled.ok,
			`${kind.collection}: the owned schedule must be clearable through the native endpoint before cleanup`,
		).toBe(true);
	}
});

// ---------------------------------------------------------------------------
// Refusal-family distinction controls
// ---------------------------------------------------------------------------

test("unauthenticated Save is an authorization refusal, distinct from native validation", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	const kind = kinds[0];
	// One unauthenticated request to the same native endpoint with a VALID
	// body: only the authorization layer can refuse it. The URL is built from
	// the actor's origin — the runner-configured origin the actor was pinned
	// to in beforeAll — plus the native API path (the same on-origin
	// discipline as the T002 helpers); no credential is sent, so nothing can
	// leave the configured app.
	const url = new URL(`/_emdash/api/content/${kind.collection}`, `${admin.baseUrl}/`);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data: { title: uniqueTitle(kind.collection) } }),
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
		`an unauthenticated native save must be refused by the authorization layer (401/403)`,
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

test("a stale _rev update is a native state conflict, distinct from validation and authorization", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	const kind = kinds[0];
	const title = uniqueTitle(kind.collection);
	const created = await createSyntheticEntry(admin, kind.collection, { data: { title } });
	expect(
		created.result.ok,
		`${kind.collection}: the valid draft fixture must save`,
	).toBe(true);

	// Consume the create `_rev` with a first update (updateEntry re-reads a
	// fresh one), then replay the ORIGINAL token: the platform must refuse the
	// stale precondition as a native CONFLICT — a state refusal, not a field
	// validation (400 VALIDATION_ERROR) or authorization (401/403) outcome.
	// Revisions/locks depth is T020's; this is the one family distinction
	// T007's refusals need.
	const stale = created.rev!;
	const first = await updateEntry(admin, kind.collection, created.entryId!, {
		data: { title: uniqueTitle(kind.collection) },
	});
	expect(
		first.ok,
		`${kind.collection}: the first update with a fresh \`_rev\` must succeed`,
	).toBe(true);

	const replay = await updateEntry(admin, kind.collection, created.entryId!, {
		data: { title: uniqueTitle(kind.collection) },
		rev: stale,
	});
	expect(
		replay.ok,
		`${kind.collection}: a stale \`_rev\` update must be refused, not reported as success`,
	).toBe(false);
	expect(
		replay.status,
		`${kind.collection}: a stale precondition refusal is the native 409 CONFLICT family`,
	).toBe(409);
	expect(
		replay.status === 400 || replay.status === 401 || replay.status === 403,
		`${kind.collection}: a state conflict must stay distinguishable from validation (400) and authorization (401/403)`,
	).toBe(false);
	const error = replay.body as { error?: { code?: unknown } };
	expect(
		error?.error?.code,
		`${kind.collection}: the refusal must carry the native CONFLICT code`,
	).toBe("CONFLICT");
});
