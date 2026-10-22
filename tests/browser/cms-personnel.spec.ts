// T023 — focused current-directory checks for the Feature 002 US3 Personnel
// collection (`personnel`). Test support in tests/browser/ only: no
// application, schema, seed, dependency, infrastructure, or production
// change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T023 ("Author current-directory
//   checks in tests/browser/cms-personnel.spec.ts for native display-title
//   requiredness, optional current fields, valid false/0 visibility,
//   same-ID assignment changes, appropriate public contact, absence of
//   sensitive/history fields and unchanged account permissions/authorship;
//   activate Organization assertions only for T001's demonstrated reuse
//   case") under the bounded 2026-10-22 Product Owner exception (GitHub
//   issue #26 comment 6333413235): accepted T018 inputs plus the
//   already-authored US6 test sources permit T023 test-source authoring
//   only while T022 stays DEFERRED — NOT PASSED, the unmet runtime
//   acceptance dependency. This file is authored source, not runtime
//   evidence; its runtime execution belongs to T026 after T024 defines
//   the collection
// - specs/002-cms-content-model/spec.md — the Q1 matrix Personnel row
//   ("Display-name title required; other fields optional" at create/save;
//   "Native RBAC/lifecycle only; no assignment/profile hook" at
//   Publish/Schedule), US3 acceptance scenarios 1–5 (public directory
//   fields representable with Citizen ID/private address/date of
//   birth/sensitive HR absent; assignment change keeps the same Personnel
//   record rather than another executive type; ended assignment updates
//   current information on the same identity with native editorial
//   revisions as the traceability baseline; visibility changes neither
//   provision/disable an editing account nor redefine permissions nor
//   erase historical authorship), FR-008 (current public
//   assignment/unit/visibility on the same identity; no
//   assignment-history feature), FR-009 (Personnel distinct from editing
//   accounts), FR-010 (Organization only conditional), FR-028
//   (public-publishable data only), FR-030, SC-001, SC-008
// - specs/002-cms-content-model/data-model.md — the personnel collection
//   row ("`title` (display name) string S; `prefix`, `first_name`,
//   `last_name` strings O; `profile_image` image O; `current_assignment`,
//   `organizational_unit` strings O; `public_visible` boolean O;
//   `public_contact` text O", "Organization O only when activated; no
//   account link, assignment history, Citizen ID/DOB/private address"),
//   the Common Native Contract ("Native Save validation rejects missing
//   required values and empty required required strings … Valid numeric
//   zero and boolean false/native 0/1 are not missing values"), and the
//   conditional `personnel_organization` relation (one maximum; many)
//   that stays unactivated here
// - specs/002-cms-content-model/contracts/native-editorial.md — "Staff
//   Surface and Authorization" ("Personnel assignment/visibility changes
//   do not change login accounts/permissions or erase native authorship"),
//   the "Native Request Shapes" table (create/read/update bodies, latest
//   returned `_rev` preconditions, references as a separate body object)
//   and "Validation Contract — Native Only" §1 (required fields enforced
//   at create/save; supplied invalid values still rejected)
// - docs/website-modernization-docs/current/02-content-model.md §8
//   (Personnel logical fields; ผู้บูริหารเป็น role/assignment view ไม่ใช่
//   Personnel type ใหม่; CMS login account ≠ Personnel record; only
//   public-appropriate data, no Citizen ID/private address/DOB/HR-sensitive
//   data; V1 updates the same identity with no assignment-history dates or
//   past-assignment directory) and §15 (Personnel public contact stays in
//   Personnel fields, no generic Contact entity)
// - docs/website-modernization-docs/current/06-roles-permissions.md §6
//   (a government position grants no CMS permission automatically; leaving
//   a Personnel position erases no historical authorship; administrators
//   provision/disable accounts) and §7 (schema changes stay
//   administrator-bounded)
// - specs/002-cms-content-model/evidence/T001-development-inputs.md §6 —
//   **no demonstrated shared Organization reuse case exists** (PENDING,
//   not demonstrated; the owner-text default governs and T025's branch is
//   expected N/A): Organization assertions are therefore NOT activated in
//   this file, no Organization collection/inventory/link is exercised or
//   required, and the `organizational_unit` owner text remains the unit
//   representation. A future demonstrated case activates T025 under its
//   own authorization, not here
// - specs/002-cms-content-model/evidence/T018-us2-reuse.md — the accepted
//   US2 schema/verification standing these checks build on: the applied
//   native model at the T018 join holds the eight US1/US2 collections,
//   relations and taxonomies, and **no `personnel` collection exists yet**
//   (T018 §3 "US2 objects absent" pattern; the personnel definition is
//   T024's, so the schema gate below treats a missing `personnel`
//   collection as the truthful T024 prerequisite, never as a validation
//   result or PASS)
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (PAT actor from the mode-0600 development
//   credential loader, synthetic entries/media with owned-fixture cleanup,
//   fresh-`_rev` update preconditions, secret-redacted results)
// - tests/browser/cms-document.spec.ts / cms-authoring.spec.ts — the
//   accepted T003/T007 patterns this file follows (schema-readiness
//   gating, refusal-family assertions, failure-safe teardown, the
//   runner-configured origin, the media normalization boundary)
// - tests/browser/cms-revisions.spec.ts — the accepted T020 record of the
//   native revision surface consumed below (revision shape, listing
//   envelope, create-stages-no-revision, bounded 50-revision working
//   history)
//
// Verified API surface (recorded per AGENTS.md §External Documentation; the
// release-sensitive claims below were verified for this file against the
// pinned `emdash@1.1.0` archive extracted from the offline npm cache, npm
// tarball sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==
// — byte-equal to package-lock.json, the same integrity the T002 helpers
// and research.md §Evidence independently verified) plus Context7
// /microsoft/playwright v1.63.0 for the Playwright semantics:
// - boolean content fields (src/schema/zod-generator.ts `case "boolean"`):
//   boolean fields map to INTEGER columns; the validator wraps
//   `z.preprocess((v) => (v === 0 || v === 1 ? Boolean(v) : v),
//   z.boolean())`, so supplied `true`/`false` AND the native stored shape
//   `0`/`1` both pass validation (no truthiness-based rejection of a
//   valid `false`), while any other number or a string falls through to
//   `z.boolean()` and is refused. `serializeValue`
//   (src/database/repositories/content.ts) writes booleans as 0/1 and
//   `deserializeValue` passes numbers through unchanged, so the READ-BACK
//   of a boolean field is the NUMBER 0/1, never a JS boolean — the
//   read-back assertions below expect exactly that native normalization
//   instead of inventing a boolean round-trip
// - optional fields (src/schema/zod-generator.ts generateFieldSchema):
//   non-required fields use `.nullish()`, so `null` is a valid supplied
//   value for an optional field (an ended assignment may clear
//   `current_assignment` to null) while required fields still refuse it;
//   update validation runs the same schema in partial mode, so an update
//   may omit unchanged required fields but a PRESENT required key with an
//   invalid value (`title: ""`/`null`) is still refused
//   (src/api/handlers/validation.ts validateContentData: the separate
//   empty-string-on-required pass; unknown non-`_` keys are reported as
//   `unknown_field` VALIDATION_ERROR — not exercised below, because the
//   approved model promises sensitive-field SCHEMA ABSENCE, not
//   arbitrary-input rejection)
// - the ordinary content read serializes `authorId` on the item
//   (src/database/repositories/types.ts ContentItem.authorId), which is
//   the native authorship evidence the unchanged-authorship assertions
//   use; GET /_emdash/api/auth/me → `data { id, email, name, role, … }`
//   is the live editing-account identity/permission evidence
//   (verified live in the accepted suites)
// - the native revision listing
//   GET /_emdash/api/content/{collection}/{id}/revisions
//   (content:read_drafts) → `data { items, total }` with each revision
//   `{ id, collection, entryId, data, authorId, createdAt }`, newest
//   first, and CREATE stages no revision — the first save/update stages
//   one (the accepted T020 record of the pinned source)
// - GET /_emdash/api/schema/collections/{slug}?includeFields=true; a
//   missing collection is `404 COLLECTION_NOT_FOUND` — used as the
//   truthful schema-readiness gate for the not-yet-defined personnel
//   collection, never as a validation result
// - Playwright 1.63.0 semantics (Context7 /microsoft/playwright v1.63.0,
//   docs/test-annotations + docs/test-parallel): `test.skip(condition,
//   description)` inside a test body aborts that test at runtime with a
//   recorded reason; tests in one file run in order in one worker; the
//   same hook/`--list` semantics the accepted suites record (collection
//   runs no hooks, so discovery performs no native calls)
//
// Boundaries and non-claims (tasks.md T023; Constitution v3.0.0 II–V):
// - test authoring only. Nothing here is executed at authoring time and
//   no runtime PASS, Personnel schema state, or US3/SC-001 acceptance is
//   claimed. The native model has NO personnel collection yet (T018
//   evidence; T024 owns the definition): until T024 is applied on the
//   authorized runtime, the personnel-gated checks below SKIP with that
//   prerequisite named — a skip, a `--list` discovery count, or a source
//   review is never a functional PASS. The one unauthenticated control
//   runs regardless of the personnel schema prerequisite (authorization
//   precedes collection resolution in the native request path), so a
//   reachable runtime always produces at least one live check; it asserts
//   only the authorization refusal family, never personnel coverage
// - no Organization assertions: T001 §6 records no demonstrated shared
//   Organization reuse case, so the conditional branch is not activated;
//   `organizational_unit` owner text is the unit representation exercised
//   below, and the schema gate at most TOLERATES the single approved
//   conditional `organization` reference field if T025 later activates
//   it — no Organization collection, inventory, relation or link is
//   created, asserted or speculated about here
// - sensitive/history/account-link fields are verified as SCHEMA ABSENCE
//   only (the approved T024 field set, with the enumerated FR-028
//   forbidden slugs explicitly absent). No Citizen-ID/DOB/private-address/
//   patient/clinical/HR sample value is ever supplied to the API merely to
//   observe a rejection — the accepted model does not promise
//   arbitrary-input rejection, and synthetic fixtures stay
//   public-publishable (FR-028; Constitution IV)
// - the acting account is the pre-existing development credential's
//   Administrator (dev@emdash.local, role 50) loaded through the accepted
//   T013 test-authentication adaptation (loadDevAccessToken +
//   createPatActor — never the dev-bypass bootstrap). Personnel
//   assignment/visibility changes are made and observed through native
//   content APIs only: this file does not provision or disable users,
//   change any role (no withNativeRole/setUserRole), impersonate a native
//   role, or assume any Personnel-to-account relationship —
//   FR-009/06 §6 evidence comes from unchanged /auth/me identity and
//   unchanged entry authorship around the edits, which is the observable
//   native evidence, not a permission-matrix claim (the role matrix is
//   T019's)
// - no public-read assertions: no anonymous public-query/directory route
//   or filter exists or is invented here (public-read safety is T021/T022
//   scope); privileged Admin reads are not substituted for it. Visibility
//   (`public_visible`) is exercised as an editable current field only
// - native editorial revisions are asserted as the Q2 traceability
//   baseline for same-identity maintenance only: they are a bounded
//   50-revision working history (accepted T020 record), NOT an
//   assignment-history feature, public past-assignment directory, or
//   D-ITA preservation — no such model is created or asserted
// - fixtures are clearly-marked synthetic public-publishable data (no
//   realistic personal identifiers); entry/media IDs and `_rev` values
//   come from native responses only. Owned-fixture cleanup runs as
//   failure-safe teardown in the owning worker (afterEvery pass/fail plus
//   an afterAll safety net), the same accepted contract as T003/T007. A
//   media selection asserts the returned identity only — no byte
//   availability or retention claim (D-REF stays deferred)

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
	// precondition itself: required display-name title, the eight approved
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

test("valid control: optional current fields save and read back, with boolean false/native 0 surviving as native 0", async () => {
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
	// The image selection reads back the uploaded media id (returned
	// identity only).
	expect(
		(data.profile_image as { id?: unknown } | undefined)?.id,
		"the profile image selection must read back the uploaded media id",
	).toBe(upload.mediaId);
	// Boolean false is a VALID value (no truthiness-based rejection), and
	// the pinned native storage returns it as the INTEGER 0 — the verified
	// normalization/read-back, not an invented boolean round-trip.
	expect(
		data.public_visible,
		"supplied boolean false must persist (native 0 integer read-back, the pinned normalization)",
	).toBe(0);

	// The same field updated to true reads back as native 1 …
	const visibleTrue = await updateEntry(admin, PERSONNEL_COLLECTION, created.entryId!, {
		data: { public_visible: true },
	});
	expect(visibleTrue.ok, "updating public_visible to true must succeed").toBe(true);
	const readTrue = await readEntry(admin, PERSONNEL_COLLECTION, created.entryId!);
	expect(readTrue.ok, "the updated record must be readable").toBe(true);
	expect(
		dataOfItem(nativeItemOf(readTrue)).public_visible,
		"supplied boolean true must read back as native 1",
	).toBe(1);

	// … and supplying the NATIVE 0/1 shape directly is equally valid input
	// (the pinned boolean preprocess coerces exactly 0/1), still without
	// truthiness-based rejection.
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
		"the native 0 input must persist as 0 (valid false, not a missing value)",
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
		"the visibility change must read back as native 0 (valid false) on the same identity",
	).toBe(0);
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
