// Authoring the five US1 content kinds (Feature 002 T007; specs/002-cms-content-model/,
// data-model.md, the pages, news, activities, announcements and health_content rows; `02` §3–§7
// and §20; `07` §3 and §5).
//
// The suite checks, table-driven over `pages`, `news`, `activities`, `announcements` and
// `health_content`:
// - a missing, null or empty title, an invalid clear and representative invalid supplied values
//   are refused as native validation, and the optional fields, classifications and media may be
//   omitted;
// - the optional Page and Announcement Document selections save through the native `references`
//   payload and read back, while an unknown target and a field that is not a reference field are
//   refused;
// - topic terms attach where the approved model attaches `topic`;
// - a natively valid but incomplete entry publishes, and another schedules for a future time with
//   an explicit offset, under native permissions only: no approval, confirmation or completeness
//   hook exists or is expected;
// - a stale `_rev` is a state conflict, and an unauthenticated save an authorization refusal,
//   each distinct from validation.
// A valid media or Document selection proves only that the save accepted the identity: no
// availability is asserted. Roles, revision depth, the scheduler's due-time run and public reads
// belong to other suites.
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST /_emdash/api/content/{collection} takes `data`, `slug`, `taxonomies` and `references`,
//   and resolves the references in the create (src/api/handlers/content.ts handleContentCreate).
//   A field that is not a reference field is refused 400 VALIDATION_ERROR and an unknown target
//   404 NOT_FOUND; a draft target resolves (src/relations/ resolveReferenceSelectionTargets).
// - GET …/{id}/references/{relation}/children reads a draft's staged selection first
//   (handleReferenceChildrenGet).
// - `taxonomies` refuses an unknown term slug with VALIDATION_ERROR; GET …/{id}/terms/{taxonomy}
//   reads the assignment. Terms are made with POST /_emdash/api/taxonomies/{name}/terms and
//   removed with DELETE …/terms/{slug}, which answers 404 for an absent term; after an uncertain
//   DELETE the term is read before any retry. GET /_emdash/api/taxonomies answers
//   `data.taxonomies`, which topicAttachmentFrom parses here (handleTaxonomyList).
// - Publish and schedule need content:publish_own or publish_any. Scheduling takes ISO 8601 with
//   Z or an offset, sets status `scheduled` and refuses a non-future time; an entry's
//   `scheduledAt` may be stored in an equivalent form, so it is compared as an instant.
// - Media normalization (src/media/normalize.ts) runs before validation and accepts `file: ""`,
//   `file: "not-an-object"` and `file: { id: 123 }` as degenerate values, a V1 limitation the
//   Product Owner accepted, so no bare string on an image or file field is asserted as a refusal
//   here. An object without `id` and a number are still refused.
// - Datetime fields need an offset; text fields refuse a number; portableText and repeater
//   fields refuse a non-array (src/schema/zod-generator.ts).
// - A stale `_rev` answers 409 CONFLICT (src/api/rev.ts); an unauthenticated request 401 and an
//   insufficient one 403 (src/api/authorize.ts); an unknown collection 404 COLLECTION_NOT_FOUND,
//   which the schema gate reports as a skip, never a PASS.
//
// Credentials and fixtures: the development Administrator PAT (SONGHEALTH_DEV_ACCESS), which
// holds content:publish_any, acts on the configured origin; no role boundary is claimed from it.
// Fixtures and terms are synthetic. Cleanup runs after every test, passed or failed, and again in
// afterAll; a term stays registered until its deletion is proven. beforeAll creates none.

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createSyntheticEntry,
	CmsHelperError,
	devAdminActor,
	nativeDataOf,
	nativeItemOf,
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
	validation?: {
		options?: unknown;
		subFields?: unknown;
		relation?: unknown;
		relationSide?: unknown;
	};
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
			{
				label: "featured_image (image) supplied as an object without id",
				data: { featured_image: {} },
			},
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
			{
				label: "activity_at supplied as a non-datetime string",
				data: { activity_at: "not-a-datetime" },
			},
			{
				label: "activity_at supplied without a timezone offset",
				data: { activity_at: "2026-10-15T10:00:00" },
			},
			{ label: "gallery (repeater) supplied as a string", data: { gallery: "not-an-array" } },
			{
				label: "featured_image (image) supplied as an object without id",
				data: { featured_image: {} },
			},
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
			{
				label: "announcement_at supplied as a non-datetime string",
				data: { announcement_at: "not-a-datetime" },
			},
			{
				label: "announcement_at supplied without a timezone offset",
				data: { announcement_at: "2026-10-15T10:00:00" },
			},
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
			{
				label: "next_review_at supplied without a timezone offset",
				data: { next_review_at: "2026-10-15T10:00:00" },
			},
			{
				label: "reviewed_at supplied as a non-datetime string",
				data: { reviewed_at: "not-a-datetime" },
			},
			{
				label: "featured_image (image) supplied as an object without id",
				data: { featured_image: {} },
			},
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
	{ outcome: "ready" } | { outcome: "missing" } | { outcome: "misconfigured"; detail: string };

/** The development-credential fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Per-kind readiness, keyed by collection slug; set by beforeAll. */
const kindReadiness = new Map<string, KindReadiness>();

/** Per-kind field map from the live schema read (for repeater subfields). */
const kindFields = new Map<string, Map<string, SchemaField>>();

/**
 * The verified attachment state of the shared `topic` taxonomy, derived once
 * per worker in beforeAll from the native taxonomy listing: `attached` (the
 * definition exists with a well-formed collections array), `missing` (a
 * readable, well-formed listing defines no `topic`), or `unverified` (the
 * listing request failed or its response was malformed). The distinction
 * keeps a transport/refusal/shape problem from ever reading as a clean
 * missing-attachment finding.
 */
type TopicAttachment =
	| { state: "attached"; collections: string[] }
	| { state: "missing" }
	| { state: "unverified"; detail: string };

/** Set by beforeAll; consumed by the per-kind readiness gate. */
let topicAttachment: TopicAttachment = {
	state: "unverified",
	detail: "the native taxonomy listing has not been read yet",
};

/**
 * Parse the shared-topic attachment state out of a native taxonomy-listing
 * result. The pinned 1.1.0 `handleTaxonomyList` returns
 * `{ success: true, data: { taxonomies: [...] } }` — an envelope key the
 * accepted `nativeItemsOf` helper deliberately does not read (it handles
 * `data.items` and bare-array envelopes), so this endpoint is parsed and
 * validated LOCALLY here and the accepted helper stays unchanged. Failed
 * requests and malformed responses map to `unverified` (visible as a
 * readiness problem), never to a silent missing-attachment conclusion.
 */
function topicAttachmentFrom(result: NativeResult): TopicAttachment {
	if (!result.ok) {
		return {
			state: "unverified",
			detail: `the native taxonomy listing was refused (${nativeRefusalOf(result)})`,
		};
	}
	const listed = nativeDataOf(result)?.taxonomies;
	if (!Array.isArray(listed)) {
		return {
			state: "unverified",
			detail:
				"the native taxonomy listing response did not carry its documented data.taxonomies array",
		};
	}
	const topic = listed.find(
		(item) =>
			item !== null &&
			typeof item === "object" &&
			((item as { name?: unknown }).name === "topic" ||
				(item as { slug?: unknown }).slug === "topic"),
	) as { collections?: unknown } | undefined;
	if (topic === undefined) {
		return { state: "missing" };
	}
	if (
		!Array.isArray(topic.collections) ||
		!topic.collections.every((slug): slug is string => typeof slug === "string")
	) {
		return {
			state: "unverified",
			detail: "the topic taxonomy definition carried a malformed collections array",
		};
	}
	return { state: "attached", collections: topic.collections };
}

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
function optionalValuesFor(kind: KindCase, mediaId: string | undefined): Record<string, unknown> {
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
 * taxonomies:manage authority proven by the native response) and register it for
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

/**
 * Delete the synthetic term registered by ensureSyntheticTopicTerm.
 *
 * The registration is RETAINED until deletion is actually proven — direct
 * success, a native 404 on the DELETE (the pinned handler answers NOT_FOUND
 * for an already-absent term), or a native read that proves absence — so a
 * transport failure or native refusal leaves the term registered for the
 * afterAll safety-net retry (corrective round 1, finding F2; the same
 * retain-until-resolved contract the T002 registry applies to entries and
 * media). An unresolved term throws a secret-free error naming the owned
 * identity — never a false success, and never dropping the only record of
 * what still needs cleanup.
 *
 * Corrective round 2 (F2 residual): a transport failure on the DELETE loses
 * the response, so the deletion MAY have committed — an UNCERTAIN outcome —
 * and the shared constraint requires re-reading native state before a retry
 * ("Re-read uncertain outcomes before a retry", tasks.md). The protocol
 * therefore verifies presence through a native read BEFORE every DELETE: at
 * entry (a registration carried over from an earlier unresolved cleanup may
 * refer to a term whose last deletion outcome was an uncertain transport
 * loss, so no DELETE is ever issued without a just-verified presence — and a
 * term already absent on entry resolves with no mutation at all) and after
 * every uncertain DELETE outcome (verified absence resolves; verified
 * presence permits exactly one deletion re-attempt; an unreadable state
 * stays registered and is reported unresolved with no further mutation).
 * Definite refusals keep the round-1 reconcile-before-absence-claim
 * behavior.
 */
async function deleteSyntheticTerm(): Promise<void> {
	const term = syntheticTerm;
	if (term === undefined) return;
	const termPath = `/_emdash/api/taxonomies/${term.taxonomy}/terms/${encodeURIComponent(term.slug)}`;

	const resolved = (): void => {
		syntheticTerm = undefined;
	};
	const unresolved = (detail: string): never => {
		throw new CmsHelperError(
			"TERM_DELETE_UNRESOLVED",
			`the owned synthetic ${term.taxonomy} term '${term.slug}' could not be proven deleted (${detail}); it stays registered for the safety-net retry`,
		);
	};

	/**
	 * Native presence read for reconciling uncertain outcomes: 404 proves
	 * absence, success proves presence, anything else is unknown. Never
	 * throws — an unreadable state is data, not an exception.
	 */
	const readPresence = async (): Promise<
		{ presence: "absent" } | { presence: "present" } | { presence: "unknown"; detail: string }
	> => {
		let probe: NativeResult;
		try {
			probe = await cmsRequest(admin, termPath);
		} catch {
			return {
				presence: "unknown",
				detail: "the follow-up read failed before reaching the app",
			};
		}
		if (probe.status === 404) return { presence: "absent" };
		if (probe.ok) return { presence: "present" };
		return { presence: "unknown", detail: `follow-up read: ${nativeRefusalOf(probe)}` };
	};

	// Entry reconciliation: verify presence BEFORE any DELETE. Verified
	// absence resolves the registration without a single mutation (an
	// already-deleted term never sees a repeated DELETE); an unreadable
	// entry state is unresolved — no mutation on an unknown state.
	const entry = await readPresence();
	if (entry.presence === "absent") {
		resolved();
		return;
	}
	if (entry.presence === "unknown") {
		unresolved(`the pre-deletion presence read could not establish native state (${entry.detail})`);
	}

	let removal: NativeResult | undefined;
	try {
		removal = await cmsRequest(admin, termPath, { method: "DELETE" });
	} catch {
		// Lost response: the deletion outcome is uncertain — read native
		// state BEFORE any repeated DELETE (corrective round 2, F2 residual).
		const afterLoss = await readPresence();
		if (afterLoss.presence === "absent") {
			resolved();
			return;
		}
		if (afterLoss.presence === "present") {
			try {
				removal = await cmsRequest(admin, termPath, { method: "DELETE" });
			} catch {
				unresolved(
					"transport failure on the deletion; the term was verified present, but the re-attempted deletion then failed before its outcome was known",
				);
			}
		} else {
			unresolved(`transport failure on the deletion and ${afterLoss.detail}`);
		}
	}
	if (removal === undefined) {
		// Defensive: unreachable by construction; resolution is never claimed
		// without an outcome to ground it in. (A direct throw — a throwing
		// statement is what proves this branch ends.)
		throw new CmsHelperError(
			"TERM_DELETE_UNRESOLVED",
			`the owned synthetic ${term.taxonomy} term '${term.slug}' could not be proven deleted (no deletion outcome was established); it stays registered for the safety-net retry`,
		);
	}
	const deletion: NativeResult = removal;
	if (deletion.ok || deletion.status === 404) {
		resolved();
		return;
	}
	// A definite refusal (other than the already-absent 404): reconcile
	// through a native read before any absence claim.
	const afterRefusal = await readPresence();
	if (afterRefusal.presence === "absent") {
		resolved();
		return;
	}
	unresolved(
		afterRefusal.presence === "present"
			? `${nativeRefusalOf(deletion)}; a native read still finds the term`
			: `${nativeRefusalOf(deletion)}; ${afterRefusal.detail}`,
	);
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
 * an unknown selected entry id is refused `404 NOT_FOUND` by
 * resolveReferenceSelectionTargets.)
 */
function expectTargetRefusal(result: NativeResult, caseLabel: string): void {
	expect(result.ok, `${caseLabel}: the native save must be refused, not reported as success`).toBe(
		false,
	);
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
	// The development Administrator. This hook creates no owned fixtures, only reads, so a partial
	// setup leaves nothing for teardown to miss.
	admin = await devAdminActor();

	// One live taxonomy read for the approved shared classification, parsed
	// and validated locally through topicAttachmentFrom (corrective round 1,
	// finding F1: this endpoint's `data.taxonomies` envelope is not one the
	// accepted nativeItemsOf helper reads — parsing it through that helper
	// always produced an empty list and misconfigured every topic-bearing
	// kind). `topic` has existed since T004/T005; its per-kind ATTACHMENT is
	// part of the T009–T012 definitions and is checked per kind below.
	const taxonomiesRead = await cmsRequest(admin, "/_emdash/api/taxonomies");
	topicAttachment = topicAttachmentFrom(taxonomiesRead);

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
		expect(Array.isArray(fields), `the ${kind.collection} schema read must include fields`).toBe(
			true,
		);
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
		// health_content). An unreadable or malformed listing surfaces as its
		// own problem; it never masquerades as a missing attachment.
		if (kind.classificationTaxonomy === "topic") {
			if (topicAttachment.state === "unverified") {
				problems.push(
					`the shared topic attachment could not be verified (${topicAttachment.detail})`,
				);
			} else if (topicAttachment.state === "missing") {
				problems.push("the shared topic taxonomy must exist in the active native schema");
			} else if (!topicAttachment.collections.includes(kind.collection)) {
				problems.push("the shared topic taxonomy must be attached to this collection");
			}
		}
		// The optional Document selector must be a bound native reference
		// field on its approved relation, when this kind exercises it.
		if (kind.documentsRelation !== undefined) {
			const documentsField = bySlug.get(kind.documentsRelation.fieldSlug);
			if (documentsField?.type !== "reference") {
				problems.push(`${kind.documentsRelation.fieldSlug} must exist as a native reference field`);
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
// the entries that reference them, and a term whose deletion is not yet
// proven stays registered so this safety net can retry it — with every
// uncertain deletion outcome re-read through a native presence check BEFORE
// any repeated DELETE (corrective rounds 1–2, finding F2). Unresolved cleanup
// fails the run truthfully; only owned synthetic fixtures, terms, and the
// T002 registry are ever touched.

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
		expect(created.result.status, `${kind.collection}: a native create succeeds with 201`).toBe(
			201,
		);
		expect(
			created.entryId,
			`${kind.collection}: the entry id must come from the native response`,
		).toBeTruthy();
		expect(created.rev, `${kind.collection}: a native \`_rev\` must be returned`).toBeTruthy();

		// Reopen by returned id only: the same title reads back and the entry
		// is a native draft.
		const read = await readEntry(admin, kind.collection, created.entryId!);
		expect(read.ok, `${kind.collection}: the saved draft must be readable by returned id`).toBe(
			true,
		);
		const item = nativeItemOf(read);
		expect(
			(item?.data as Record<string, unknown> | undefined)?.title,
			`${kind.collection}: the read-back title must match the supplied title`,
		).toBe(title);
		expect(item?.status, `${kind.collection}: a fresh native create is a draft`).toBe("draft");
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
		expect(read.ok, `${kind.collection}: the saved entry must be readable by returned id`).toBe(
			true,
		);
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
			} else if (
				kind.exercisedOptionalFields.find((field) => field.slug === slug)?.type === "datetime"
			) {
				// Native datetime storage normalization (pinned 1.1.0
				// normalizeDatetime): an explicit-offset supplied value is
				// stored as its UTC ISO instant, so the read-back asserts the
				// INSTANT, not the string — the same discipline as the
				// schedule read-back below (T013 runtime observation).
				expect(
					typeof data?.[slug] === "string" &&
						!Number.isNaN(new Date(data![slug] as string).getTime()) &&
						new Date(data![slug] as string).getTime() === new Date(value as string).getTime(),
					`${kind.collection}: the supplied ${slug} instant must read back (native UTC ISO normalization)`,
				).toBe(true);
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
		expect(created.result.ok, `${kind.collection}: the valid draft fixture must save`).toBe(true);

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
		expect(read.ok, `${kind.collection}: the draft must remain readable after refused clears`).toBe(
			true,
		);
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
		expect(read.ok, `${kind.collection}: the saved entry must be readable by returned id`).toBe(
			true,
		);
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
		// development-credential Administrator carries native publishing authority
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
		expect(read.ok, `${kind.collection}: the published entry must be readable by returned id`).toBe(
			true,
		);
		const item = nativeItemOf(read);
		expect(item?.status, `${kind.collection}: the read-back status must be published`).toBe(
			"published",
		);
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
		const scheduled = await scheduleEntry(
			admin,
			kind.collection,
			created.entryId!,
			offsetScheduledAt,
		);
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
		expect(read.ok, `${kind.collection}: the scheduled entry must be readable by returned id`).toBe(
			true,
		);
		const item = nativeItemOf(read);
		expect(item?.status, `${kind.collection}: the read-back status must be scheduled`).toBe(
			"scheduled",
		);
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

test("a stale _rev update is a native state conflict, distinct from validation and authorization", async () => {
	const kinds = readyKinds();
	test.skip(
		kinds.length === 0,
		"no US1 collection is initialized in the active native schema (T008–T012 schema prerequisites outstanding)",
	);
	const kind = kinds[0];
	const title = uniqueTitle(kind.collection);
	const created = await createSyntheticEntry(admin, kind.collection, { data: { title } });
	expect(created.result.ok, `${kind.collection}: the valid draft fixture must save`).toBe(true);

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
	expect(first.ok, `${kind.collection}: the first update with a fresh \`_rev\` must succeed`).toBe(
		true,
	);

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
