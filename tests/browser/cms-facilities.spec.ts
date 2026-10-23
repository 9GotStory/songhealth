// T027 — focused US4 facility/Service/Area checks for the Feature 002 CMS
// content model: the `health_services` collection contract (T028's definition),
// the single reciprocal `facility_services` relation (T029's declaration), the
// four Service ownership modes on the applied `services` collection, the
// hierarchical `area` taxonomy semantics and `operational_status` versus
// publication state. Test support in tests/browser/ only: no application,
// schema, seed, dependency, infrastructure, or production change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T027 ("Author native facility/Area
//   checks in tests/browser/cms-facilities.spec.ts for T015's four Service
//   ownership modes and optional guidance, one shared offering relation,
//   official-code/source/hierarchy fixtures, label edits, coordinate
//   type/range boundaries and valid zero values, optional empty links and
//   operational status versus publication; distinguish synthetic fixture codes
//   from actual authoritative inputs and never fabricate inventory
//   acceptance") under the bounded 2026-10-23 Product Owner authorization
//   (GitHub issue #26 comment 6355618294, "T027 IMPLEMENTATION AUTHORIZED —
//   SOURCE/TEST ONLY"): T027 authors test source only, skips explicitly on the
//   outstanding T028/T029 definition prerequisites, and never claims a
//   functional PASS or fabricates green; the accepted T026 Final Acceptance
//   (GitHub issue #26 comment 6354634573) satisfies this task's T026
//   predecessor edge. Runtime execution of these checks belongs to T030 after
//   T028/T029 define and apply the US4 schema; T022 stays DEFERRED — NOT PASSED
// - specs/002-cms-content-model/spec.md — User Story 4 scenarios 1–5 (Service
//   guidance fields with ownership type and channel distinct; one Service
//   offered at two facilities referring to the same identities from both
//   directions without duplicate Services; Health Service official name/code,
//   optional display name/image/affiliation, type, operational status,
//   address/coordinates, hours/public contacts, offered services and service
//   areas representable with location not replacing service area; shared
//   Province → District → Subdistrict → Village references retaining
//   applicable hierarchy and official/stable codes; operational metadata
//   changes alone not changing publication state), FR-011 (Service guidance
//   attributes; ownership/channel distinction), FR-012 (Health Service real
//   facility attributes), FR-013 (shared Area references retain hierarchy and
//   official/stable codes without owning analytical data), FR-019 (facility
//   contact stays with its owner), FR-030, the Q1 matrix Health Service row
//   ("Official-name title required; other fields optional, supplied values
//   type-checked … no Area/code/coordinate hook" at Publish/Schedule) and
//   SC-003 (service/facility/Area fixtures preserve the same relationship
//   from both directions)
// - specs/002-cms-content-model/data-model.md — the health_services collection
//   row ("`title` (official name) string S; `facility_code` string O;
//   `display_name` string O; `operational_status` select O
//   (active/temporarily_closed/inactive); `address` text O; `latitude`/
//   `longitude` number O; `opening_hours`, `public_contact` text O;
//   `affiliation_text` string O; `image` image O", "`facility_type` O; `area`
//   O for service coverage; offered Services O; Organization O if activated"),
//   the services row (four ownership meanings, channels repeater with label
//   string O + native url O, guidance fields, `external_url` url O), the
//   Common Native Contract ("Native Save validation rejects missing required
//   values and empty required strings … Valid numeric zero and boolean
//   false/native 0/1 are not missing values"), "Coordinates use supplied
//   numeric values and native range constraints (latitude −90..90, longitude
//   −180..180)", the `area` taxonomy row ("Explicit official/stable code in
//   native term slug, name in label, parent via native group identity"),
//   "Area terms model applicable Province → District → Subdistrict → Village
//   hierarchy … Use explicit verified code slugs when connecting data,
//   preserve them during label edits and record source in native description
//   when needed … Physical facility address/coordinates remain distinct from
//   service-area selection", and the `facility_services` relation row
//   ("Health Service `offered_services` parent → Service; Service
//   `offering_facilities` child → Health Service; many; many; Both O, two
//   selectors over one relationship; same identities in both directions")
//   plus "Native lifecycle decides when a pending reciprocal edit becomes
//   live; inverse read verification must use the appropriate saved/published
//   state rather than promise immediate cross-entry draft views"
// - specs/002-cms-content-model/contracts/native-editorial.md — the "Native
//   Request Shapes" table (create/update bodies, the separate `references`
//   and `taxonomies` objects, latest `_rev` preconditions), "Validation
//   Contract — Native Only" §1 (required fields and supplied invalid values
//   at create/save) and §2 (no Songhealth publication completeness gate;
//   native RBAC/lifecycle only; "Announcement dates/close state and review
//   dates do not auto-unpublish content" — the operational-status analogue
//   asserted below), and "Outcomes and Revision Limits" (native errors
//   reported truthfully)
// - docs/website-modernization-docs/current/02-content-model.md §10 (Area:
//   shared hierarchical Province → District → Subdistrict → Village
//   reference; official/stable codes must be retained when connecting data),
//   §11 (Health Service: real facility, not HIS; official name/code, type,
//   operational status, affiliation optional, address + map coordinates,
//   hours, public contacts, service area references, offered-services
//   relation, image optional; "Location ≠ Service Area"; no patient/EMR/
//   appointment/queue/billing/stock), §12 (Service: ownership type, provider,
//   channels, eligibility/steps/documents guidance, external URL when
//   external; no transaction engine) and §20 (CMS publishing state and domain
//   state are different things)
// - docs/website-modernization-docs/current/06-roles-permissions.md §6 (CMS
//   account ≠ directory data; a government position grants no CMS permission)
//   and §7 (schema changes stay administrator-bounded; no super-admin/override
//   role is created)
// - specs/002-cms-content-model/evidence/T001-development-inputs.md §6 — real
//   classification/official Area code sources, service/facility inventories
//   and any demonstrated Organization reuse case are PENDING population/UAT
//   inputs; no synthetic fixture below is an official inventory and none is
//   presented as one
// - specs/002-cms-content-model/evidence/T004-native-taxonomies.md — the
//   applied taxonomies carry INTENTIONALLY EMPTY term inventories pending
//   authoritative sources; the synthetic Area/facility-type terms below are
//   clearly labeled fixtures created and cleaned up through supported native
//   term operations, never seeded "official" codes
// - specs/002-cms-content-model/evidence/T018-us2-reuse.md — the applied
//   native model at the accepted join holds the eight US1/US2 collections,
//   five relations and ten taxonomies (T025 kept it nine collections +
//   personnel): `health_services`, `facility_services`, `facility_type` and
//   the health_services area attachment DO NOT exist yet (they are T028/T029
//   definitions), so the schema gates below treat those as truthful missing
//   prerequisites, never as validation results or PASS
// - specs/002-cms-content-model/evidence/T026-us3-directory.md §2 — the
//   accepted T025 N/A disposition: no demonstrated shared Organization reuse
//   case exists, owner text governs, `facility_organization` stays
//   inactivated and T028 preserves `affiliation_text`; the accepted T026
//   Final Acceptance (GitHub issue #26 comment 6354634573) records
//   "Organization remains N/A" — so this file exercises `affiliation_text`
//   owner text, tolerates (and never exercises) the single conditional
//   `organization` reference field, and creates no Organization schema,
//   inventory, relation or link
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (PAT actor from the mode-0600 development
//   credential loader, synthetic entries/media with owned-fixture cleanup,
//   fresh-`_rev` update preconditions, secret-redacted results)
// - tests/browser/cms-personnel.spec.ts / cms-reuse.spec.ts /
//   cms-authoring.spec.ts — the accepted T023/T014/T007 patterns this file
//   follows (schema-readiness gating with explicit prerequisite skips,
//   refusal-family assertions, relation children read-backs, failure-safe
//   teardown, the runner-configured origin, the T013 test-authentication
//   adaptation)
//
// Verified API surface (recorded per AGENTS.md §External Documentation; checked
// first through Context7 — /websites/emdashcms for unversioned orientation and
// /microsoft/playwright v1.63.0 for Playwright semantics — then against the
// pinned `emdash@1.1.0` dist sources installed by the lockfile-exact `npm ci`
// under node_modules/emdash, the same package-lock.json integrity value
// (sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==)
// the T002 helpers and T004 evidence §4 independently recomputed from the
// registry tarball):
// - number fields (dist zod-generator bundle, src/schema/zod-generator.ts):
//   `case "number"` maps to `z.number()` and the field's `validation.min`/
//   `validation.max` are applied as `z.number().min(...)`/`.max(...` — zod
//   min/max are INCLUSIVE bounds, so −90/90 and −180/180 are valid supplied
//   coordinates while 90.0001/−90.5/180.5/−180.5001 are refused; a supplied
//   string or boolean reaches `z.number()` and is refused (numeric 0 is a
//   valid value, not a missing one). Optional (non-required) fields are
//   `.nullish()`, so `null` is a valid supplied value for an optional field
//   while required fields refuse it; update validation runs the same schema
//   in partial mode (a present required key with an invalid value is refused)
// - select fields: options map to a zod enum of the declared options, so an
//   option outside `active`/`temporarily_closed`/`inactive`
//   (operational_status) or the four ownership meanings is a native
//   VALIDATION_ERROR refusal
// - native term operations (dist/astro/routes/api/taxonomies/[name]/terms/,
//   handlers in dist/taxonomies-*.mjs): POST `/_emdash/api/taxonomies/{name}/terms`
//   creates a term (taxonomies:manage) with body `{ slug?, label (min 1),
//   parentId? (nullish), description?, locale?, translationOf? }` — an explicit
//   slug is retained instead of deriving one from the label, and a create whose
//   slug already exists in the taxonomy is refused `409 CONFLICT` ("Term
//   '<slug>' already exists", handleTermCreate) — the native collision guard
//   behind the ownership states below; GET `…/terms` lists
//   `data { terms: [{ id, name, slug, label, parentId, description?, children:
//   […], … }] }` — a HIERARCHICAL tree whose descendants appear ONLY nested
//   under their ancestors' `children`, never in the root array, so absence is
//   provable only against the complete tree — and GET `…/terms/{slug}` reads
//   one term back by its CURRENT slug (taxonomies:read); PUT `…/terms/{slug}`
//   updates `{ slug?, label?, parentId?, description? }` (taxonomies:manage) —
//   a label-only edit leaves the slug and id identity intact, which is the
//   "code in slug survives label edits" mechanism; DELETE `…/terms/{slug}`
//   removes the term but is REFUSED `400 VALIDATION_ERROR` ("Cannot delete
//   term with children. Delete children first.", handleTermDelete) while
//   children survive — the native behavior behind the child-before-parent
//   deletion order and the tree-reconciled refused-delete path below. Terms
//   have no content publication lifecycle (current metadata), which is why
//   these fixtures are cleaned up as terms, not trashed as content
// - taxonomy definitions: GET `/_emdash/api/taxonomies` →
//   `data { taxonomies: [{ name, label, hierarchical, collections, … }] }`
//   — the readiness gates below read `hierarchical` and the attachment list
//   from this supported listing
// - relation inventory: GET `/_emdash/api/relations` →
//   `data { relations: [{ slug, parentCollection, childCollection,
//   maxChildrenPerParent, maxParentsPerChild, … }] }` — the one-edge-set
//   precondition counts every relation connecting health_services and
//   services in EITHER orientation, so a duplicated backlink relation fails
//   loudly instead of hiding behind the declared one
// - reciprocal reference reads (dist relations bundle,
//   src/api/handlers/relations.ts): GET
//   `/_emdash/api/content/{collection}/{id}/references/{relation}/children`
//   answers only on the relation's PARENT side and GET `…/parents` only on
//   the CHILD side (`data { children|parents: [{ id, slug, collection, … }],
//   nextCursor? }`; content:read); for a drafts-reading caller an entry with
//   a pending draft revision shows its STAGED selection for the viewing
//   field (stagedPageFor), otherwise the live link rows answer — trashed
//   targets stop resolving in these listings
// - reference writes (dist api/runtime bundles): a CREATE resolves its whole
//   `references` payload and writes the link rows in the same transaction
//   (writeReferenceSelection), so a fresh facility's selection is a live edge
//   immediately; an UPDATE of a revisions-supporting collection STAGES every
//   supplied `references` entry into the entry's draft revision instead of
//   writing links (the runtime handleContentUpdate usesDraftRevisions branch,
//   with liveSelection baselines), and PUBLISH revalidates the staged
//   selection (validateStagedReferences) and promotes it
//   (applyStagedReferences) — the exact staged/live boundary asserted below:
//   a pending published-side edit is not a live reciprocal edge until native
//   publication, and no immediate cross-entry draft view is promised. A
//   child-side bound field (`offering_facilities`) selects the entries
//   pointing at this one over the SAME edge set — both selectors address one
//   relation, never two
// - content taxonomy assignments: create/update `taxonomies` payloads are
//   `{ taxonomyName: [termSlug, …] }`; GET
//   `/_emdash/api/content/{collection}/{id}/terms/{taxonomy}` reads one
//   entry's assignments back as `data { terms: [{ id, name, slug, label,
//   parentId, … }], unresolved, … }` (content:read)
// - published-entry read overlay: an item with a draftRevisionId returns
//   `data` = the staged draft revision's data and exposes the published
//   values as `liveData` for drafts-reading callers (the accepted T018
//   record) — the operational-status edit below asserts the staged value,
//   the live value and the unchanged publication status separately
// - Playwright 1.63.0 semantics (Context7 /microsoft/playwright v1.63.0):
//   `test.skip(condition, description)` inside a test body aborts that test
//   at runtime with a recorded reason; `--list` runs only the load tasks (no
//   browsers, no global setup, no hooks), so discovery performs no native
//   calls; tests in one file run in order in one worker
//
// Boundaries and non-claims (tasks.md T027; Constitution v3.0.0 II–V):
// - test authoring only. Nothing here is executed at authoring time and no
//   runtime PASS, US4 schema state, or SC-003 acceptance is claimed. The
//   active native model has NO health_services collection, facility_services
//   relation, facility_type taxonomy or health_services area attachment yet
//   (T018/T026 evidence; T028/T029 own them): until those are applied on the
//   authorized runtime, the gated checks SKIP with the exact prerequisite
//   named — a skip, a `--list` discovery count, or a source review is never a
//   functional PASS. The one unauthenticated control runs regardless of the
//   US4 schema prerequisites (authorization precedes collection resolution in
//   the native request path), so a reachable runtime always produces at least
//   one live check; it asserts only the authorization refusal family, never
//   facility coverage. The Service ownership-mode checks gate only on the
//   already-applied services collection, so they are runnable the moment an
//   authorized runtime executes this file — their ownership/channel coverage
//   is Service-side and claims nothing about health_services
// - no Organization assertions: the accepted T025 N/A disposition (T026
//   evidence §2) keeps Organization unactivated, so `affiliation_text` owner
//   text is the affiliation representation exercised below and the schema
//   gate at most TOLERATES the single approved conditional `organization`
//   reference field — no Organization collection, inventory, relation or link
//   is created, asserted or speculated about here
// - synthetic fixture codes/terms are explicitly labeled synthetic and are
//   never presented as official inventories: real official Area
//   codes/populations and facility inventories remain PENDING population/UAT
//   inputs (T001 §6, T004 §6) and their absence is not fabricated into
//   acceptance. No real government geographic code, facility code or service
//   inventory value is copied; the hierarchy fixture uses clearly-marked
//   synthetic Province/District/Subdistrict/Village terms whose slugs ARE the
//   supplied synthetic codes, whose labels carry the synthetic marker, and
//   whose description records the synthetic source provenance
// - operational_status is domain metadata on one axis and native publication
//   state is another: no automatic unpublish/completeness rule is expected or
//   asserted to exist (the accepted model has none), and no Songhealth
//   publication hook, policy-cancellation code, role change or account
//   operation is performed or expected. The acting account is the
//   pre-existing development credential's Administrator (dev@emdash.local,
//   role 50) loaded through the accepted T013 test-authentication adaptation
//   (loadDevAccessToken + createPatActor — never the dev-bypass bootstrap);
//   native editorial/RBAC behavior is preserved unchanged
// - no public-read assertions (T021/T022 scope), no role-matrix claims
//   (T019), no revision/lock depth (T020), no Admin UI journey (T031): a
//   reciprocal identity proves only the recorded native link state at read
//   time — no target availability, immutability or retention claim (D-REF
//   stays deferred); a media selection asserts the returned identity only
// - fixtures are clearly-marked synthetic public-publishable data; entry and
//   media IDs and `_rev` values come from native responses only, and every
//   update/lifecycle call supplies a fresh re-read `_rev` through the T002
//   helpers. Owned-fixture cleanup runs as failure-safe teardown in the
//   owning worker (afterEvery pass/fail plus an afterAll safety net). The
//   synthetic area/facility_type terms are tracked separately with an
//   explicit OWNERSHIP state per registration: only a natively CONFIRMED
//   create (2xx — a duplicate slug would be refused 409) is ever deleted,
//   deepest-parent-first and only after its slug AND label both match the
//   synthetic fixture identity; a definitively refused create (4xx,
//   including 409 on a pre-existing slug) owns nothing and never deletes
//   the pre-existing term; unconfirmed outcomes (transport failure / 5xx)
//   stay explicitly unresolved — registration alone never authorizes
//   deletion. Absence is reconciled against the COMPLETE hierarchical
//   listing (nested children included), never a root-only scan or a failed
//   single read; an unresolvable term cleanup is reported, never silently
//   dropped
// - this file performs no schema operations: the schema/relations/taxonomies
//   reads below are read-only readiness gates; applying T028/T029 definitions
//   to the shared runtime is those tasks' separately authorized scope

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
	nativeItemsOf,
	NATIVE_ROLES,
	publishEntry,
	readEntry,
	scrubEmbeddedSecrets,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Collections, relation, taxonomies and the approved T028 field contract
// ---------------------------------------------------------------------------

/** The US2 Service collection (applied at the accepted T018 join). */
const SERVICE_COLLECTION = "services";

/** The US4 Health Service collection (T028's definition owns it). */
const HEALTH_SERVICE_COLLECTION = "health_services";

/**
 * The single approved reciprocal edge set (data-model `facility_services`):
 * Health Service `offered_services` parent-side selector → Service, and
 * Service `offering_facilities` child-side selector → Health Service — two
 * selectors over ONE relation, both optional, both maxima unbounded.
 */
const FACILITY_SERVICES = {
	relation: "facility_services",
	parentCollection: HEALTH_SERVICE_COLLECTION,
	parentField: "offered_services",
	childCollection: SERVICE_COLLECTION,
	childField: "offering_facilities",
} as const;

/** The hierarchical coverage taxonomy attached to Health Service by T028. */
const AREA_TAXONOMY = "area";

/** The Health-Service-only classification taxonomy defined by T028. */
const FACILITY_TYPE_TAXONOMY = "facility_type";

/** The four approved Service ownership meanings (current/00 §8.1 via T015). */
const OWNERSHIP_MODES: readonly string[] = [
	"direct",
	"coordinated",
	"related_health_service",
	"external_digital",
];

/** The three approved operational_status domain values (data-model row). */
const OPERATIONAL_STATUSES: readonly string[] = ["active", "temporarily_closed", "inactive"];

/**
 * The approved T028 health_services DATA-field set: `title` (official name,
 * ชื่อทางการ) is the save-time required string; every other data field is
 * optional; latitude/longitude carry the approved native inclusive ranges.
 * T028 owns the collection and its taxonomy attachments — NOT the
 * `facility_services` relation: `offered_services` is T029's parent-side
 * selector, so its absence is the outstanding T029 prerequisite (a valid
 * T028-only collection must qualify for these facility-field checks), its
 * presence is tolerated here, and the relation gate below validates it
 * (present-but-wrong FAILS). Nothing outside this set (plus `offered_services`
 * and the single conditional `organization` reference) may exist on the
 * collection.
 */
const APPROVED_FACILITY_FIELDS: ReadonlyArray<{
	slug: string;
	type: string;
	required?: boolean;
	selectOptions?: readonly string[];
	range?: { min: number; max: number };
}> = [
	{ slug: "title", type: "string", required: true },
	{ slug: "facility_code", type: "string" },
	{ slug: "display_name", type: "string" },
	{ slug: "operational_status", type: "select", selectOptions: OPERATIONAL_STATUSES },
	{ slug: "address", type: "text" },
	{ slug: "latitude", type: "number", range: { min: -90, max: 90 } },
	{ slug: "longitude", type: "number", range: { min: -180, max: 180 } },
	{ slug: "opening_hours", type: "text" },
	{ slug: "public_contact", type: "text" },
	{ slug: "affiliation_text", type: "string" },
	{ slug: "image", type: "image" },
];

/**
 * The T029-owned reciprocal selectors, with the binding each side must carry:
 * health_services `offered_services` on the parent side and services
 * `offering_facilities` on the child side of the ONE `facility_services` edge
 * set. Both belong to T029's declaration/binding scope — the relation gate
 * treats their absence (together with the relation's) as the truthful T029
 * prerequisite and any present-but-wrong binding as a loud failure.
 */
const FACILITY_SERVICES_SELECTORS: ReadonlyArray<{
	collection: string;
	field: string;
	side: "parent" | "child";
}> = [
	{
		collection: HEALTH_SERVICE_COLLECTION,
		field: FACILITY_SERVICES.parentField,
		side: "parent",
	},
	{
		collection: SERVICE_COLLECTION,
		field: FACILITY_SERVICES.childField,
		side: "child",
	},
];

/**
 * The single approved CONDITIONAL addition: the optional `organization`
 * reference (data-model `facility_organization`) exists only if a genuine
 * shared Organization reuse case ever activates that branch. The accepted
 * T025 N/A disposition (T026 evidence §2) records no such case, so this file
 * never exercises it; the schema gate merely tolerates its presence so a
 * future activated branch does not misread as drift. No Organization schema,
 * inventory, relation or link is asserted here.
 */
const CONDITIONAL_ORGANIZATION_FIELD_SLUG = "organization";

/**
 * Source-provenance description recorded on every synthetic area term: the
 * data-model's "record source in native description" mechanism, used here to
 * state the truthful synthetic provenance instead of an official one.
 */
const SYNTHETIC_AREA_DESCRIPTION =
	"songhealth-f002-synthetic area fixture code — explicitly synthetic test data, not an official government code; authoritative inventory pending (T001 §6)";

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
	validation?: {
		options?: unknown;
		min?: unknown;
		max?: unknown;
		subFields?: unknown;
		relation?: unknown;
		relationSide?: unknown;
	};
}

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/**
 * Readiness for one exercised aspect, decided once per worker in beforeAll
 * from live supported native reads: `missing` (the owning definition task's
 * prerequisite outstanding — T028's health_services collection data fields,
 * its facility_type/area taxonomy attachments, or T029's facility_services
 * declaration/binding) SKIPS explicitly with that prerequisite named;
 * `misconfigured` (present but not matching the approved definition these
 * checks rely on — including a wrong selector binding or a duplicated
 * backlink relation between the two collections) FAILS loudly so an
 * unexpected schema mismatch stays visible instead of producing wrong
 * expectations.
 */
type Readiness =
	| { outcome: "ready" }
	| { outcome: "missing"; prerequisite: string }
	| { outcome: "misconfigured"; detail: string };

/** The development-credential fixture actor owning every synthetic fixture made here. */
let admin: CmsActor;

/** Service-side ownership readiness (the applied services collection). */
let serviceReadiness: Readiness = { outcome: "missing", prerequisite: "T015 services definition" };

/** health_services collection readiness (T028). */
let facilityReadiness: Readiness = { outcome: "missing", prerequisite: "T028 health_services definition" };

/** facility_services reciprocal relation readiness (T029 declaration/binding). */
let relationReadiness: Readiness = {
	outcome: "missing",
	prerequisite: "T029 facility_services relation declaration/binding",
};

/** area-taxonomy-for-coverage readiness (hierarchical + attached by T028). */
let areaReadiness: Readiness = { outcome: "missing", prerequisite: "T028 area attachment" };

/** facility_type classification readiness (defined + attached by T028). */
let facilityTypeReadiness: Readiness = {
	outcome: "missing",
	prerequisite: "T028 facility_type taxonomy",
};

/** The services collection's fields as read in beforeAll (relation gate input). */
let serviceFieldsBySlug: Map<string, SchemaField> | undefined;

/** The health_services collection's fields as read in beforeAll (relation gate input). */
let facilityFieldsBySlug: Map<string, SchemaField> | undefined;

/**
 * Synthetic taxonomy terms this worker has attempted to create, in creation
 * order (cleanup visits them reversed — deepest/last-created first). Each
 * entry records the exact slug AND label minted here plus the OWNERSHIP
 * state established from the native outcome:
 * - "unconfirmed" — a create was issued but native confirmation is absent
 *   (transport failure, a 5xx, or an outcome not yet classified). Cleanup
 *   NEVER deletes on an unconfirmed registration — it stays explicitly
 *   unresolved — because registration alone cannot prove this file created
 *   whatever term may sit at that slug.
 * - "confirmed" — the native create was ACCEPTED (2xx): the platform
 *   created this file's term (a duplicate slug is refused 409 CONFLICT, so
 *   an accepted create is this file's creation). Cleanup may delete it
 *   after the slug+label identity guard; the native term id is recorded
 *   when the response carries one.
 * - "not-created" — the native platform definitively REFUSED the create
 *   (4xx, including 409 CONFLICT on a pre-existing slug): nothing of this
 *   file's exists at that slug, and any term found there is pre-existing
 *   and NOT ours — cleanup neither deletes it nor reports it as residue.
 */
type OwnedAreaTerm = {
	taxonomy: string;
	slug: string;
	label: string;
	ownership: "unconfirmed" | "confirmed" | "not-created";
	/** Native term id from the accepted create response, when carried. */
	termId?: string;
};

const ownedAreaTerms: OwnedAreaTerm[] = [];

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** A clearly synthetic public-publishable value for a text-like field. */
function syntheticText(name: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${name}`;
}

/** One explicitly synthetic unique term code (the term slug). */
function syntheticTermCode(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK}-${kind}-${crypto.randomUUID().slice(0, 8)}`;
}

/** One explicitly synthetic term label carrying the marker. */
function syntheticTermLabel(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} พื้นที่สังเคราะห์ ${kind}`;
}

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003/T007/T014/T019/T023 checks):
 * PLAYWRIGHT_BASE_URL when set, otherwise the documented development origin.
 * node:process is loaded through a dynamic non-literal import because the
 * pinned dependency baseline ships no @types/node.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

/** Truthful schema gate: missing SKIPS with the prerequisite; misconfigured FAILS. */
function gate(readiness: Readiness): void {
	if (readiness.outcome === "missing") {
		test.skip(
			true,
			`the ${readiness.prerequisite} prerequisite is outstanding in the active native schema; this run cannot exercise these US4 checks`,
		);
		return;
	}
	if (readiness.outcome === "misconfigured") {
		throw new Error(
			`the active native schema does not match the approved US4 definition these checks rely on: ${readiness.detail}`,
		);
	}
}

/** The entry's field-data object as the native read returns it, when present. */
function dataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.data !== null && typeof item?.data === "object"
		? (item.data as Record<string, unknown>)
		: {};
}

/** The entry's published live values (`liveData`), when a drafts read exposes them. */
function liveDataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.liveData !== null && typeof item?.liveData === "object"
		? (item.liveData as Record<string, unknown>)
		: {};
}

/**
 * Read the parent-side reciprocal selection (offered services) through the
 * native relation children listing and return the resolved child ids — the
 * returned identities only, never an availability claim about any child.
 */
async function offeredServiceIds(facilityId: string): Promise<string[]> {
	const children = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}/${encodeURIComponent(facilityId)}/references/${encodeURIComponent(FACILITY_SERVICES.relation)}/children`,
	);
	expect(
		children.ok,
		`health_services/${facilityId}: the saved offered-services selection must be readable through the native relation children listing`,
	).toBe(true);
	const listed = nativeDataOf(children)?.children;
	expect(
		Array.isArray(listed),
		`health_services/${facilityId}: the children read must return its documented array`,
	).toBe(true);
	return (listed as Array<{ id?: unknown }>)
		.map((child) => child.id)
		.filter((id): id is string => typeof id === "string");
}

/**
 * Read the child-side reciprocal view (offering facilities) through the
 * native relation parents listing and return the resolved parent ids — the
 * same edge set read from the Service side.
 */
async function offeringFacilityIds(serviceId: string): Promise<string[]> {
	const parents = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(SERVICE_COLLECTION)}/${encodeURIComponent(serviceId)}/references/${encodeURIComponent(FACILITY_SERVICES.relation)}/parents`,
	);
	expect(
		parents.ok,
		`services/${serviceId}: the offering-facilities view must be readable through the native relation parents listing`,
	).toBe(true);
	const listed = nativeDataOf(parents)?.parents;
	expect(
		Array.isArray(listed),
		`services/${serviceId}: the parents read must return its documented array`,
	).toBe(true);
	return (listed as Array<{ id?: unknown }>)
		.map((parent) => parent.id)
		.filter((id): id is string => typeof id === "string");
}

/** Count entries whose display fields match an exact text (native listing). */
async function countListedByQuery(collection: string, text: string): Promise<number> {
	const listed = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(collection)}`,
		{ searchParams: { q: text, status: "all" } },
	);
	expect(
		listed.ok,
		`${collection}: the native listing used for the duplicate check must succeed`,
	).toBe(true);
	return nativeItemsOf(listed).length;
}

/** The term object of a term-result envelope (`data.term`), when present. */
function termOf(result: NativeResult): Record<string, unknown> | undefined {
	const term = nativeDataOf(result)?.term;
	return term !== null && typeof term === "object" ? (term as Record<string, unknown>) : undefined;
}

/**
 * Create one clearly synthetic taxonomy term through the supported native
 * term API (POST /_emdash/api/taxonomies/{name}/terms) with the supplied
 * synthetic code AS the term slug, the marker-carrying label, and the
 * synthetic source description; optionally under a parent term id. The
 * known synthetic identity (slug + label) is registered BEFORE the create
 * request is issued (an in-flight create must never be untracked), and the
 * registration's OWNERSHIP state is classified from the native outcome
 * BEFORE any fallible response-shape assertion: a 2xx acceptance confirms
 * this file's creation (and records the native term id when carried); a
 * definitive 4xx refusal — including 409 CONFLICT on a colliding slug —
 * marks the registration not-created, so a pre-existing same-slug term can
 * NEVER be deleted by this file's cleanup; transport failures and 5xx
 * leave the registration unconfirmed, which cleanup only ever reports as
 * explicitly unresolved, never deletes on.
 */
async function createSyntheticAreaTerm(
	taxonomy: string,
	kind: string,
	parentTermId?: string,
): Promise<{ slug: string; termId: string; label: string }> {
	const slug = syntheticTermCode(kind);
	const label = syntheticTermLabel(kind);
	const registration: OwnedAreaTerm = { taxonomy, slug, label, ownership: "unconfirmed" };
	ownedAreaTerms.push(registration);
	const created = await cmsRequest(
		admin,
		`/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms`,
		{
			method: "POST",
			body: {
				slug,
				label,
				description: SYNTHETIC_AREA_DESCRIPTION,
				...(parentTermId !== undefined ? { parentId: parentTermId } : {}),
			},
		},
	);
	// Ownership classification precedes the fallible assertions below: even
	// when they fail (a malformed success envelope), the registration already
	// carries the truthful ownership state for cleanup.
	if (created.ok) {
		registration.ownership = "confirmed";
		const nativeId = termOf(created)?.id;
		if (typeof nativeId === "string" && nativeId.length > 0) {
			registration.termId = nativeId;
		}
	} else if (created.status >= 400 && created.status < 500) {
		registration.ownership = "not-created";
	}
	expect(
		created.ok,
		`the synthetic ${taxonomy} term fixture (${kind}) must be created through the native term API`,
	).toBe(true);
	const term = termOf(created);
	expect(
		typeof term?.id === "string" && term.id.length > 0,
		`the created ${taxonomy} term must carry its native id`,
	).toBe(true);
	expect(
		term?.slug,
		`the created ${taxonomy} term must retain the supplied synthetic code as its slug`,
	).toBe(slug);
	return { slug, termId: term!.id as string, label };
}

/** Read one term back by its slug (GET …/terms/{slug}). */
async function readTerm(
	taxonomy: string,
	slug: string,
): Promise<Record<string, unknown> | undefined> {
	return termOf(
		await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms/${encodeURIComponent(slug)}`,
		),
	);
}

/**
 * Locate one slug in the COMPLETE supported hierarchical term listing
 * (GET /_emdash/api/taxonomies/{name}/terms). The pinned 1.1.0 listing
 * returns each term WITH its nested `children`, and hierarchical
 * descendants appear ONLY under their ancestors — never in the root array —
 * so a root-only scan can neither prove a child's absence nor find a
 * surviving child whose single-term read failed. Returns `{ known: false }`
 * when the listing itself cannot be trusted (request refusal, transport
 * failure, or a malformed success — non-array terms/children, a non-object
 * node, or unbounded nesting): an unknown listing proves NOTHING about
 * absence. `{ known: true, node }` is the located term node (carrying its
 * label for the identity guard); `{ known: true }` with no node is absence
 * proven against a fully trusted tree.
 */
async function findTermNodeInListing(
	taxonomy: string,
	slug: string,
): Promise<{ known: boolean; node?: Record<string, unknown> }> {
	let listing: NativeResult;
	try {
		listing = await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms`,
		);
	} catch {
		return { known: false };
	}
	if (!listing.ok) {
		return { known: false };
	}
	const roots = nativeDataOf(listing)?.terms;
	if (!Array.isArray(roots)) {
		return { known: false };
	}
	let trusted = true;
	let found: Record<string, unknown> | undefined;
	const walk = (nodes: unknown[], depth: number): void => {
		if (!trusted || depth > 64) {
			trusted = false;
			return;
		}
		for (const entry of nodes) {
			if (entry === null || typeof entry !== "object") {
				trusted = false;
				return;
			}
			const node = entry as Record<string, unknown>;
			if (node.slug === slug) {
				found = node;
				return;
			}
			const children = node.children;
			if (children !== undefined && !Array.isArray(children)) {
				trusted = false;
				return;
			}
			if (Array.isArray(children)) {
				walk(children, depth + 1);
			}
			if (!trusted || found !== undefined) {
				return;
			}
		}
	};
	walk(roots, 0);
	if (!trusted) {
		return { known: false };
	}
	return { known: true, node: found };
}

/**
 * Reconcile a registered owned term's expected label from the term's
 * readable current state after an UNCERTAIN label mutation (a refused or
 * transport-failed PUT whose commit state is not proven). Only the two
 * labels this file could have written — the attempted edit and the standing
 * expectation — are adopted; any other value, or an unreadable term,
 * leaves the standing expectation untouched so cleanup can only report the
 * term unresolved, never delete on an unproven identity.
 */
async function reconcileOwnedTermLabel(
	taxonomy: string,
	slug: string,
	attemptedLabel: string,
): Promise<void> {
	const owned = ownedAreaTerms.find((entry) => entry.taxonomy === taxonomy && entry.slug === slug);
	if (owned === undefined) {
		return;
	}
	let current: Record<string, unknown> | undefined;
	try {
		current = await readTerm(taxonomy, slug);
	} catch {
		return;
	}
	if (current?.label === attemptedLabel || current?.label === owned.label) {
		owned.label = current.label;
	}
}

/**
 * Rename one registered synthetic term through the native term API
 * (PUT …/terms/{slug}) while keeping the cleanup ownership expectation
 * truthful on every outcome: a CONFIRMED PUT updates the registered
 * expected label immediately, before any read-back verification runs, so a
 * later failed read can never strand the renamed term behind the original
 * label at cleanup's identity guard; an UNCERTAIN PUT (refused or
 * transport-failed) is reconciled from the term's readable state, and an
 * unreadable term keeps the standing expectation — reported as unresolved
 * by cleanup rather than deleted. The caller still asserts the returned
 * result truthfully; this helper only keeps ownership tracking correct.
 */
async function renameOwnedAreaTerm(
	taxonomy: string,
	slug: string,
	editedLabel: string,
): Promise<NativeResult> {
	let result: NativeResult;
	try {
		result = await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms/${encodeURIComponent(slug)}`,
			{ method: "PUT", body: { label: editedLabel } },
		);
	} catch (cause) {
		// The transport failed after the request was issued — the commit
		// state is uncertain. Reconcile what is readable, then surface the
		// original failure unchanged.
		await reconcileOwnedTermLabel(taxonomy, slug, editedLabel);
		throw cause;
	}
	const owned = ownedAreaTerms.find((entry) => entry.taxonomy === taxonomy && entry.slug === slug);
	if (result.ok) {
		// Confirmed mutation: the owned term's expected label is the edited
		// one from this point onward, BEFORE any fallible read-back.
		if (owned !== undefined) {
			owned.label = editedLabel;
		}
	} else {
		// A refused PUT is ordinarily a clean non-commit, but the commit
		// state of an error response is not proven — reconcile.
		await reconcileOwnedTermLabel(taxonomy, slug, editedLabel);
	}
	return result;
}

/**
 * Failure-safe cleanup of the synthetic taxonomy terms this worker
 * registered — and only those it can PROVE it created. Ownership state
 * decides everything: a "not-created" registration (definitive 4xx refusal,
 * including 409 CONFLICT on a pre-existing slug) resolves with no request
 * at all — any term at that slug is pre-existing and NOT ours; an
 * "unconfirmed" registration (transport failure / 5xx / unclassified) is
 * reported explicitly unresolved and NEVER deleted, because registration
 * alone cannot authorize deletion; only a "confirmed" registration may be
 * deleted, guarded by the slug+label identity match. For confirmed terms a
 * failed or ambiguous single-term read is NOT treated as absence:
 * reconciliation goes through the COMPLETE hierarchical listing (nested
 * `children` included, `known` distinguishing a trusted traversal from an
 * unknown one), so a surviving child whose single read failed is found in
 * the tree and deleted rather than silently dropped, and a refused parent
 * deletion (the native platform refuses deleting a term that still has
 * children) is reconciled against the tree, not assumed. Deletion runs
 * reversed (deepest/last-created first); every term is attempted
 * independently; an unresolvable term stays registered and reported. Never
 * throws; returns the unresolved slugs.
 */
async function deleteOwnedAreaTerms(): Promise<string[]> {
	const unresolved: string[] = [];
	for (const owned of ownedAreaTerms.slice().reverse()) {
		try {
			if (owned.ownership === "not-created") {
				// The native platform definitively refused this create: this
				// file created nothing at the slug, and any term found there
				// is pre-existing — never deleted, never reported as residue.
				ownedAreaTerms.splice(ownedAreaTerms.indexOf(owned), 1);
				continue;
			}
			if (owned.ownership !== "confirmed") {
				// Unconfirmed ownership: a term may exist at the slug (a
				// mid-flight commit), but this file cannot prove it created
				// it — keep the registration and report it unresolved.
				unresolved.push(owned.slug);
				continue;
			}
			let current = await readTerm(owned.taxonomy, owned.slug);
			if (current === undefined) {
				// The single-term read failed or was ambiguous — that is not
				// absence. Reconcile through the complete hierarchical tree.
				const located = await findTermNodeInListing(owned.taxonomy, owned.slug);
				if (!located.known) {
					unresolved.push(owned.slug);
					continue;
				}
				if (located.node === undefined) {
					// Absence proven against a fully trusted tree listing.
					ownedAreaTerms.splice(ownedAreaTerms.indexOf(owned), 1);
					continue;
				}
				current = located.node;
			}
			if (current.label !== owned.label) {
				// Not provably this file's fixture (label drifted or a
				// pre-existing term under a colliding slug) — never delete.
				unresolved.push(owned.slug);
				continue;
			}
			const removed = await cmsRequest(
				admin,
				`/_emdash/api/taxonomies/${encodeURIComponent(owned.taxonomy)}/terms/${encodeURIComponent(owned.slug)}`,
				{ method: "DELETE" },
			);
			if (!removed.ok) {
				// A refused deletion (e.g. the native "Cannot delete term with
				// children" refusal while a child survives) is resolved only
				// if the term is proven gone from the trusted tree.
				const located = await findTermNodeInListing(owned.taxonomy, owned.slug);
				if (located.known && located.node === undefined) {
					ownedAreaTerms.splice(ownedAreaTerms.indexOf(owned), 1);
					continue;
				}
				unresolved.push(owned.slug);
				continue;
			}
			const after = await readTerm(owned.taxonomy, owned.slug);
			if (after !== undefined) {
				unresolved.push(owned.slug);
				continue;
			}
			// Post-delete verification: a failed re-read is not proof of
			// deletion either — the trusted tree decides.
			const located = await findTermNodeInListing(owned.taxonomy, owned.slug);
			if (located.known && located.node === undefined) {
				ownedAreaTerms.splice(ownedAreaTerms.indexOf(owned), 1);
				continue;
			}
			unresolved.push(owned.slug);
		} catch {
			unresolved.push(owned.slug);
		}
	}
	return unresolved;
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertion (the accepted T003/T007/T023 contract)
// ---------------------------------------------------------------------------

/**
 * A native field-validation refusal: HTTP 400 with the VALIDATION_ERROR code,
 * and explicitly NOT an authorization (401/403), missing-schema (404) or
 * state-conflict (409) refusal — so authorization, prerequisite and
 * concurrency problems can never masquerade as field-validation outcomes
 * (and vice versa).
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
// Worker setup: development access and the live supported native reads
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	// Development native access through the pre-existing development
	// credential (T013 test-authentication adaptation), pinned to the
	// runner-configured origin so a nondefault PLAYWRIGHT_BASE_URL run cannot
	// silently exercise another app. createPatActor verifies the live identity
	// through /auth/me and pins the expected Administrator role; the expected
	// development fixture account is asserted by email. This hook deliberately
	// creates no owned fixtures (credential load, identity verification and
	// read-only schema/relations/taxonomies reads only), so a partial setup
	// cannot leak anything for teardown to miss — and Playwright --list
	// discovery performs no native calls at all (hooks run only at execution).
	admin = await createPatActor({
		baseUrl: await configuredDevelopmentOrigin(),
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// --- services collection: the fields the Service-side checks rely on ---
	const serviceRead = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(SERVICE_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (serviceRead.status === 404) {
		serviceReadiness = { outcome: "missing", prerequisite: "T015 services definition" };
	} else {
		expect(
			serviceRead.ok,
			`reading the native ${SERVICE_COLLECTION} collection schema must succeed when it is not a 404 (got ${serviceRead.status})`,
		).toBe(true);
		const serviceFields = nativeItemOf(serviceRead)?.fields;
		expect(
			Array.isArray(serviceFields),
			`the ${SERVICE_COLLECTION} schema read must include fields`,
		).toBe(true);
		serviceFieldsBySlug = new Map<string, SchemaField>();
		for (const field of serviceFields as SchemaField[]) {
			if (typeof field.slug === "string") serviceFieldsBySlug.set(field.slug, field);
		}
		const serviceProblems: string[] = [];
		const title = serviceFieldsBySlug.get("title");
		if (title?.type !== "string" || title.required !== true) {
			serviceProblems.push("title must be a required native string field");
		}
		const ownership = serviceFieldsBySlug.get("ownership_type");
		if (ownership?.type !== "select") {
			serviceProblems.push("ownership_type must exist as a native select field");
		} else {
			const options = ownership.validation?.options;
			if (!Array.isArray(options) || !OWNERSHIP_MODES.every((mode) => options.includes(mode))) {
				serviceProblems.push(
					`ownership_type must offer the four approved meanings ${OWNERSHIP_MODES.join("/")}`,
				);
			}
		}
		const channels = serviceFieldsBySlug.get("channels");
		if (channels?.type !== "repeater") {
			serviceProblems.push("channels must exist as a native repeater field (ownership's distinct companion)");
		} else {
			const subFields = Array.isArray(channels.validation?.subFields)
				? (channels.validation!.subFields as SchemaField[])
				: [];
			const bySlug = new Map<string, SchemaField>();
			for (const subField of subFields) {
				if (typeof subField.slug === "string") bySlug.set(subField.slug, subField);
			}
			if (bySlug.get("label")?.type !== "string" || bySlug.get("url")?.type !== "url") {
				serviceProblems.push(
					"channels rows must carry the optional label string and native url subfields",
				);
			}
		}
		const externalUrl = serviceFieldsBySlug.get("external_url");
		if (externalUrl?.type !== "url") {
			serviceProblems.push("external_url must exist as a native url field");
		}
		serviceReadiness =
			serviceProblems.length > 0
				? { outcome: "misconfigured", detail: serviceProblems.join("; ") }
				: { outcome: "ready" };
	}

	// --- health_services collection: the approved T028 DATA fields, exactly ---
	const facilityRead = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (facilityRead.status === 404) {
		// COLLECTION_NOT_FOUND: T028 has not defined/applied health_services
		// yet (T018/T026 evidence record the applied model without it).
		// Skipping is the truthful outcome; T030 runs these checks after the
		// T028/T029 verification join.
		facilityReadiness = { outcome: "missing", prerequisite: "T028 health_services definition" };
	} else {
		expect(
			facilityRead.ok,
			`reading the native ${HEALTH_SERVICE_COLLECTION} collection schema must succeed when it is not a 404 (got ${facilityRead.status})`,
		).toBe(true);
		const facilityFields = nativeItemOf(facilityRead)?.fields;
		expect(
			Array.isArray(facilityFields),
			`the ${HEALTH_SERVICE_COLLECTION} schema read must include fields`,
		).toBe(true);
		const bySlug = new Map<string, SchemaField>();
		for (const field of facilityFields as SchemaField[]) {
			if (typeof field.slug === "string") {
				expect(
					bySlug.has(field.slug),
					`the ${HEALTH_SERVICE_COLLECTION} schema must not declare duplicate field '${field.slug}'`,
				).toBe(false);
				bySlug.set(field.slug, field);
			}
		}
		facilityFieldsBySlug = bySlug;
		const facilityProblems: string[] = [];
		for (const approved of APPROVED_FACILITY_FIELDS) {
			const field = bySlug.get(approved.slug);
			if (field?.type !== approved.type) {
				facilityProblems.push(`${approved.slug} must exist as a native ${approved.type} field`);
				continue;
			}
			if (approved.required === true && field.required !== true) {
				facilityProblems.push(`${approved.slug} must be a native required field`);
			} else if (approved.required !== true && field.required === true) {
				facilityProblems.push(`${approved.slug} must stay optional (an approved O field)`);
			}
			if (approved.selectOptions !== undefined) {
				const options = field.validation?.options;
				if (
					!Array.isArray(options) ||
					!approved.selectOptions.every((value) => options.includes(value))
				) {
					facilityProblems.push(
						`${approved.slug} must offer the approved options ${approved.selectOptions.join("/")}`,
					);
				}
			}
			if (approved.range !== undefined) {
				const validation = field.validation;
				if (
					validation?.min !== approved.range.min ||
					validation?.max !== approved.range.max
				) {
					facilityProblems.push(
						`${approved.slug} must carry the approved native inclusive range ${approved.range.min}..${approved.range.max}`,
					);
				}
			}
		}
		// No field outside the approved set: the T029-owned `offered_services`
		// selector is tolerated here (its absence is T029's outstanding
		// prerequisite, never a T028 failure; the relation gate validates its
		// binding when present), and the single approved conditional
		// `organization` reference is tolerated (never exercised — the
		// accepted T025 N/A disposition keeps Organization unactivated).
		const approvedSlugs = new Set([
			...APPROVED_FACILITY_FIELDS.map((field) => field.slug),
			FACILITY_SERVICES.parentField,
			CONDITIONAL_ORGANIZATION_FIELD_SLUG,
		]);
		for (const slug of bySlug.keys()) {
			if (!approvedSlugs.has(slug)) {
				facilityProblems.push(
					`unexpected field '${slug}' is outside the approved T028 health_services definition (no speculative or duplicated field may exist)`,
				);
			}
		}
		facilityReadiness =
			facilityProblems.length > 0
				? { outcome: "misconfigured", detail: facilityProblems.join("; ") }
				: { outcome: "ready" };
	}

	// --- the one reciprocal facility_services edge set (T029 declaration/binding) ---
	const relationsRead = await cmsRequest(admin, "/_emdash/api/relations");
	expect(
		relationsRead.ok,
		"reading the native relations inventory must succeed to decide the facility_services prerequisite",
	).toBe(true);
	const relations = Array.isArray(nativeDataOf(relationsRead)?.relations)
		? (nativeDataOf(relationsRead)!.relations as Array<Record<string, unknown>>)
		: [];
	const connecting = relations.filter(
		(relation) =>
			(relation.parentCollection === HEALTH_SERVICE_COLLECTION &&
				relation.childCollection === SERVICE_COLLECTION) ||
			(relation.parentCollection === SERVICE_COLLECTION &&
				relation.childCollection === HEALTH_SERVICE_COLLECTION),
	);
	if (facilityReadiness.outcome === "misconfigured") {
		// A present-but-wrong T028 definition is a loud failure, not a
		// prerequisite: the relation checks cannot stand on a schema that
		// already failed its own definition gate.
		relationReadiness = {
			outcome: "misconfigured",
			detail: `the health_services collection does not match the approved T028 definition: ${facilityReadiness.detail}`,
		};
	} else if (facilityReadiness.outcome === "missing") {
		// health_services itself outstanding: T028 prerequisite, truthfully
		// skipped — never called a T029 problem.
		relationReadiness = {
			outcome: "missing",
			prerequisite: "T028 health_services definition",
		};
	} else {
		const relationProblems: string[] = [];
		if (connecting.length > 1) {
			relationProblems.push(
				`exactly one relation may connect ${HEALTH_SERVICE_COLLECTION} and ${SERVICE_COLLECTION}; found ${connecting.length} (${connecting
					.map((relation) => String(relation.slug))
					.join(", ")}) — a duplicated backlink edge set is not the approved model`,
			);
		}
		// The named declaration is located in the FULL relations inventory —
		// NOT the expected-pair subset — so a present `facility_services`
		// with wrong endpoints (e.g. health_services → pages) is validated
		// and FAILS loudly here instead of being invisible to the pair filter
		// and skipped as a missing T029 prerequisite.
		const declared = relations.find(
			(relation) => relation.slug === FACILITY_SERVICES.relation,
		);
		if (connecting.length > 0 && !connecting.some((relation) => relation.slug === FACILITY_SERVICES.relation)) {
			relationProblems.push(
				`a relation connects ${HEALTH_SERVICE_COLLECTION} and ${SERVICE_COLLECTION} but is not the approved ${FACILITY_SERVICES.relation} edge set (${connecting
					.map((relation) => String(relation.slug))
					.join(", ")})`,
			);
		}
		if (
			declared !== undefined &&
			(declared.parentCollection !== FACILITY_SERVICES.parentCollection ||
				declared.childCollection !== FACILITY_SERVICES.childCollection)
		) {
			relationProblems.push(
				`the ${FACILITY_SERVICES.relation} relation is declared with parent ${String(declared.parentCollection)} and child ${String(declared.childCollection)}; the approved edge set must connect parent ${FACILITY_SERVICES.parentCollection} and child ${FACILITY_SERVICES.childCollection}`,
			);
		} else if (
			declared !== undefined &&
			(declared.maxChildrenPerParent !== null || declared.maxParentsPerChild !== null)
		) {
			relationProblems.push(
				`the ${FACILITY_SERVICES.relation} relation must keep unbounded maxima (many; many), found maxChildrenPerParent=${String(declared.maxChildrenPerParent)} maxParentsPerChild=${String(declared.maxParentsPerChild)}`,
			);
		}
		// Present-but-invalid selector bindings FAIL, independently of the
		// relation declaration; ABSENT selectors are the T029 binding
		// prerequisite outstanding and only ever skip.
		const selectorFields = new Map<string, SchemaField | undefined>([
			[HEALTH_SERVICE_COLLECTION, facilityFieldsBySlug?.get(FACILITY_SERVICES.parentField)],
			[SERVICE_COLLECTION, serviceFieldsBySlug?.get(FACILITY_SERVICES.childField)],
		]);
		for (const selector of FACILITY_SERVICES_SELECTORS) {
			const field = selectorFields.get(selector.collection);
			if (
				field !== undefined &&
				(field.type !== "reference" ||
					field.validation?.relation !== FACILITY_SERVICES.relation ||
					field.validation?.relationSide !== selector.side ||
					field.required === true)
			) {
				relationProblems.push(
					`${selector.collection}.${selector.field} must be an optional native reference field bound to the ${FACILITY_SERVICES.relation} relation on the ${selector.side} side`,
				);
			}
		}
		if (relationProblems.length > 0) {
			relationReadiness = { outcome: "misconfigured", detail: relationProblems.join("; ") };
		} else if (declared === undefined || selectorFields.get(HEALTH_SERVICE_COLLECTION) === undefined || selectorFields.get(SERVICE_COLLECTION) === undefined) {
			// Nothing present is invalid; pieces of the T029 declaration/
			// binding are still absent — the truthful outstanding T029
			// prerequisite, never a hidden failure.
			relationReadiness = {
				outcome: "missing",
				prerequisite: "T029 facility_services relation declaration/binding",
			};
		} else {
			relationReadiness = { outcome: "ready" };
		}
	}

	// --- taxonomy readiness: hierarchical area attached, facility_type defined ---
	const taxonomiesRead = await cmsRequest(admin, "/_emdash/api/taxonomies");
	expect(
		taxonomiesRead.ok,
		"reading the native taxonomies inventory must succeed to decide the area/facility_type prerequisites",
	).toBe(true);
	const taxonomies = Array.isArray(nativeDataOf(taxonomiesRead)?.taxonomies)
		? (nativeDataOf(taxonomiesRead)!.taxonomies as Array<Record<string, unknown>>)
		: [];
	const areaTaxonomy = taxonomies.find((taxonomy) => taxonomy.name === AREA_TAXONOMY);
	if (areaTaxonomy === undefined) {
		areaReadiness = { outcome: "missing", prerequisite: "T004 area taxonomy" };
	} else if (areaTaxonomy.hierarchical !== true) {
		areaReadiness = {
			outcome: "misconfigured",
			detail: "the area taxonomy must stay hierarchical for the Province → District → Subdistrict → Village model",
		};
	} else {
		const collections = Array.isArray(areaTaxonomy.collections)
			? (areaTaxonomy.collections as unknown[])
			: [];
		areaReadiness = collections.includes(HEALTH_SERVICE_COLLECTION)
			? { outcome: "ready" }
			: {
					outcome: "missing",
					prerequisite: "T028 area attachment to health_services",
				};
	}
	const facilityTypeTaxonomy = taxonomies.find(
		(taxonomy) => taxonomy.name === FACILITY_TYPE_TAXONOMY,
	);
	if (facilityTypeTaxonomy === undefined) {
		facilityTypeReadiness = {
			outcome: "missing",
			prerequisite: "T028 facility_type taxonomy",
		};
	} else {
		const collections = Array.isArray(facilityTypeTaxonomy.collections)
			? (facilityTypeTaxonomy.collections as unknown[])
			: [];
		facilityTypeReadiness = collections.includes(HEALTH_SERVICE_COLLECTION)
			? { outcome: "ready" }
			: {
					outcome: "missing",
					prerequisite: "T028 facility_type attachment to health_services",
				};
	}
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup (the accepted T003/T007/T023 contract)
// ---------------------------------------------------------------------------

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) {
		return;
	}
	// Entries first (their deletion releases term assignments), then the
	// synthetic terms — both failure-safe and truthfully reported.
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	console.log(
		`[cms-facilities] owned-fixture cleanup after test: ${
			report.complete ? "complete" : "UNRESOLVED"
		} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
	);
	expect(
		report.complete,
		"every owned synthetic entry/media fixture created by this test must be proven resolved (unresolved cleanup is a reported failure, not a silent leftover)",
	).toBe(true);
	const termsAttempted = ownedAreaTerms.length;
	const unresolvedTerms = await deleteOwnedAreaTerms();
	console.log(
		`[cms-facilities] synthetic-term cleanup after test: ${
			unresolvedTerms.length === 0 ? "complete" : `UNRESOLVED (${unresolvedTerms.join(", ")})`
		} (terms attempted ${termsAttempted})`,
	);
	expect(
		unresolvedTerms.length,
		"every synthetic taxonomy term created by this test must be proven deleted or already absent (owned-term cleanup is a reported failure, not a silent leftover)",
	).toBe(0);
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
		"the final worker cleanup must leave zero unresolved owned entry/media fixtures",
	).toBe(true);
	const unresolvedTerms = await deleteOwnedAreaTerms();
	expect(
		unresolvedTerms.length,
		"the final worker cleanup must leave zero unresolved synthetic taxonomy terms",
	).toBe(0);
});

// ---------------------------------------------------------------------------
// Schema preconditions — the approved T028/T029 definitions, and nothing else
// ---------------------------------------------------------------------------

test("health_services schema precondition: approved native data-field definition with inclusive coordinate ranges and no extra fields", () => {
	gate(facilityReadiness);
	// gate() skips when the collection is missing and throws when it is
	// misconfigured; reaching here with outcome "ready" is the asserted T028
	// precondition itself: required official-name title, the approved optional
	// facility data fields with their select options and native inclusive
	// latitude −90..90 / longitude −180..180 ranges, and nothing outside the
	// approved set — the T029-owned offered_services selector is tolerated
	// whether or not T029 has declared/bound the relation yet (the relation
	// precondition test owns that), and at most the tolerated conditional
	// `organization` reference exists (Organization stays N/A under the
	// accepted T025 disposition — affiliation_text governs).
	expect(facilityReadiness.outcome).toBe("ready");
});

test("facility_services precondition: exactly one reciprocal edge set, bound on both sides with unbounded maxima", async () => {
	gate(relationReadiness);
	// A fresh live read of the relations inventory and both collection
	// schemas (independent of beforeAll's snapshot): facility_services is the
	// SINGLE relation connecting the two collections in either orientation —
	// no duplicated backlink edge set — with parent health_services, child
	// services, many;many maxima, an optional parent-side offered_services
	// selector on health_services and an optional child-side
	// offering_facilities selector on services, each bound to that one
	// relation on its own side. Two selectors, one edge set.
	const relationsRead = await cmsRequest(admin, "/_emdash/api/relations");
	expect(
		relationsRead.ok,
		"the live relations inventory must be readable for the one-edge-set precondition",
	).toBe(true);
	const relations = Array.isArray(nativeDataOf(relationsRead)?.relations)
		? (nativeDataOf(relationsRead)!.relations as Array<Record<string, unknown>>)
		: [];
	const connecting = relations.filter(
		(relation) =>
			(relation.parentCollection === HEALTH_SERVICE_COLLECTION &&
				relation.childCollection === SERVICE_COLLECTION) ||
			(relation.parentCollection === SERVICE_COLLECTION &&
				relation.childCollection === HEALTH_SERVICE_COLLECTION),
	);
	expect(
		connecting.length,
		`exactly one relation may connect ${HEALTH_SERVICE_COLLECTION} and ${SERVICE_COLLECTION} (a duplicated backlink edge set is not the approved model)`,
	).toBe(1);
	const declared = connecting[0]!;
	expect(
		declared.slug,
		"the single connecting relation must be the declared facility_services edge set",
	).toBe(FACILITY_SERVICES.relation);
	expect(
		declared.parentCollection,
		"facility_services must have Health Service as its parent side",
	).toBe(HEALTH_SERVICE_COLLECTION);
	expect(declared.childCollection, "facility_services must have Service as its child side").toBe(
		SERVICE_COLLECTION,
	);
	expect(
		declared.maxChildrenPerParent,
		"facility_services must allow many Services per Health Service (unbounded maximum)",
	).toBeNull();
	expect(
		declared.maxParentsPerChild,
		"facility_services must allow many Health Services per Service (unbounded maximum)",
	).toBeNull();
	// Both selectors are live-read and verified against the one edge set.
	for (const selector of FACILITY_SERVICES_SELECTORS) {
		const schemaRead = await cmsRequest(
			admin,
			`/_emdash/api/schema/collections/${encodeURIComponent(selector.collection)}`,
			{ searchParams: { includeFields: "true" } },
		);
		expect(
			schemaRead.ok,
			`the live ${selector.collection} schema must be readable for the selector-binding precondition`,
		).toBe(true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(Array.isArray(fields), `the ${selector.collection} schema read must include fields`).toBe(
			true,
		);
		const field = (fields as SchemaField[]).find(
			(entry) => entry.slug === selector.field,
		);
		expect(
			field?.type === "reference" &&
				field.validation?.relation === FACILITY_SERVICES.relation &&
				field.validation?.relationSide === selector.side &&
				field.required !== true,
			`${selector.collection}.${selector.field} must be an optional native reference field bound to the ${FACILITY_SERVICES.relation} relation on the ${selector.side} side (two selectors over one edge set)`,
		).toBe(true);
	}
});

// ---------------------------------------------------------------------------
// Service ownership modes (the applied services collection; T015's definition)
// ---------------------------------------------------------------------------

test("the four Service ownership modes save and read back distinctly, ownership independent from channels", async () => {
	gate(serviceReadiness);
	// US4 scenario 1 / FR-011: ownership_type preserves the four approved
	// meanings and the service channel remains a SEPARATE field — a Service
	// carries ownership on one field and channels on another, each holding
	// its own supplied value. The external_digital mode carries the useful
	// external URL editorially (still optional in native validation).
	const channelRow = { label: syntheticText("channel-online"), url: "https://example.org/songhealth-f002-synthetic-service" };
	const externalUrlValue = "https://example.org/songhealth-f002-synthetic-external";
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{
			label: "direct",
			data: {
				ownership_type: "direct",
				provider_text: syntheticText("provider-direct"),
				channels: [channelRow],
			},
		},
		{ label: "coordinated", data: { ownership_type: "coordinated" } },
		{ label: "related_health_service", data: { ownership_type: "related_health_service" } },
		{
			label: "external_digital",
			data: { ownership_type: "external_digital", external_url: externalUrlValue },
		},
	];
	const createdIds: string[] = [];
	for (const ownershipCase of cases) {
		const title = uniqueTitle(`service-${ownershipCase.label}`);
		const created = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
			data: { title, ...ownershipCase.data },
		});
		expect(
			created.result.ok,
			`the ${ownershipCase.label} ownership-mode Service fixture must save (ownership and channel are distinct optional fields)`,
		).toBe(true);
		expect(created.entryId, "the created Service id must come from the native response").toBeTruthy();
		createdIds.push(created.entryId!);

		const read = await readEntry(admin, SERVICE_COLLECTION, created.entryId!);
		expect(read.ok, `the ${ownershipCase.label} Service fixture must be readable`).toBe(true);
		const data = dataOfItem(nativeItemOf(read));
		expect(
			data.ownership_type,
			`the ${ownershipCase.label} ownership value must read back exactly`,
		).toBe(ownershipCase.data.ownership_type);
		if (ownershipCase.data.provider_text !== undefined) {
			expect(
				data.provider_text,
				`the ${ownershipCase.label} provider text must read back alongside ownership`,
			).toBe(ownershipCase.data.provider_text);
		}
		if (ownershipCase.data.channels !== undefined) {
			const rows = Array.isArray(data.channels) ? (data.channels as Array<Record<string, unknown>>) : [];
			expect(
				rows.length,
				`the ${ownershipCase.label} channel selection must read back its supplied row (channels ≠ ownership)`,
			).toBe(1);
			expect(rows[0]?.label, "the channel label must read back exactly").toBe(channelRow.label);
			expect(rows[0]?.url, "the channel url must read back exactly").toBe(channelRow.url);
		}
		if (ownershipCase.data.external_url !== undefined) {
			expect(
				data.external_url,
				"the external_digital mode's editorially maintained external URL must read back exactly",
			).toBe(externalUrlValue);
		}
	}
	// Ownership distinct from channel, stated from the data: the direct-mode
	// fixture holds BOTH an ownership value and channel rows whose values are
	// not the ownership value (and no mode's channel row masquerades as
	// ownership). The four fixtures themselves prove the four meanings coexist
	// on one field without redefining each other.
	expect(createdIds.length, "all four ownership modes must have produced fixtures").toBe(4);
});

test("Service ownership guidance omissions are permitted and an invalid ownership value is refused", async () => {
	gate(serviceReadiness);
	// Optional guidance/channels/URL omissions: an ownership-only Service
	// (every guidance field, channel row and external URL omitted) is a valid
	// save — no completeness rule exists. Supplying an ownership value outside
	// the four approved meanings is a native validation refusal.
	const minimal = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-ownership-only"), ownership_type: "related_health_service" },
	});
	expect(
		minimal.result.ok,
		"the ownership-only Service fixture (guidance/channels/URL omitted) must save — optional omissions are permitted",
	).toBe(true);

	const refusal = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-ownership-invalid"), ownership_type: "internal" },
	});
	expectValidationRefusal(refusal.result, "ownership_type supplied outside the four approved meanings");
	expect(
		refusal.entryId,
		"no entry id may be returned for a refused ownership value",
	).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Health Service field contract (T028's definition)
// ---------------------------------------------------------------------------

test("create/save/reopen: title-only minimal Health Service saves with permitted optional omissions", async () => {
	gate(facilityReadiness);
	// Q1 matrix Health Service row: official-name title required; every other
	// field optional. A title-only record is a valid save — no
	// code/location/contact/area completeness rule exists.
	const title = uniqueTitle("facility");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, { data: { title } });
	expect(
		created.result.ok,
		"the title-only minimal Health Service must save (optional omissions are permitted)",
	).toBe(true);
	expect(created.result.status, "a native create succeeds with 201").toBe(201);
	expect(created.entryId, "the entry id must come from the native response").toBeTruthy();
	expect(created.rev, "a native `_rev` must be returned").toBeTruthy();

	const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(read.ok, "the saved Health Service must be readable by returned id").toBe(true);
	const item = nativeItemOf(read);
	expect(dataOfItem(item).title, "the read-back title must match the supplied official name").toBe(title);
	expect(item?.status, "a fresh native create is a draft").toBe("draft");
});

test("create refuses missing, null and empty required official-name title", async () => {
	gate(facilityReadiness);
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title omitted", data: {} },
		{ label: "title null", data: { title: null } },
		{ label: "title empty string", data: { title: "" } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

test("update refuses invalid clearing of the required official-name title; the record stays intact", async () => {
	gate(facilityReadiness);
	const title = uniqueTitle("facility");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, { data: { title } });
	expect(created.result.ok, "the valid Health Service draft fixture must save").toBe(true);

	// Each invalid clear is its own update with a fresh `_rev` (updateEntry
	// re-reads), so the refusal is about the supplied value, never a stale
	// precondition.
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title cleared to empty string", data: { title: "" } },
		{ label: "title cleared to null", data: { title: null } },
	];
	for (const fieldCase of cases) {
		const refusal = await updateEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!, {
			data: fieldCase.data,
		});
		expectValidationRefusal(refusal, fieldCase.label);
	}

	const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(read.ok, "the Health Service must remain readable after refused clears").toBe(true);
	expect(
		dataOfItem(nativeItemOf(read)).title,
		"the refused title clear must not have taken effect",
	).toBe(title);
});

test("valid control: optional facility fields save and read back, including affiliation owner text and an image selection", async () => {
	gate(facilityReadiness);
	// One synthetic fixture media id for image; the read-back asserts the
	// SELECTION identity only (no byte-availability claim — D-REF stays
	// deferred). affiliation_text is the accepted owner-text representation
	// (Organization N/A under the accepted T025 disposition).
	const upload = await uploadSyntheticMedia(admin);
	expect(
		upload.result.ok,
		"the synthetic fixture media upload for the facility image must succeed",
	).toBe(true);
	expect(upload.mediaId, "a media id must be returned by the native response").toBeTruthy();

	const title = uniqueTitle("facility-optional-fields");
	const optional: Record<string, unknown> = {
		facility_code: syntheticText("facility-code"),
		display_name: syntheticText("display-name"),
		operational_status: "active",
		address: syntheticText("address"),
		latitude: 16.4321,
		longitude: 102.8375,
		opening_hours: syntheticText("opening-hours"),
		public_contact: syntheticText("public-contact"),
		affiliation_text: syntheticText("affiliation"),
		image: { id: upload.mediaId! },
	};
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title, ...optional },
	});
	expect(
		created.result.ok,
		"valid supplied optional facility fields must save alongside the required official name",
	).toBe(true);
	expect(created.entryId, "the created entry id must come from the native response").toBeTruthy();

	const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(read.ok, "the saved Health Service must be readable by returned id").toBe(true);
	const data = dataOfItem(nativeItemOf(read));
	expect(data.facility_code, "the supplied facility code must read back").toBe(optional.facility_code);
	expect(data.display_name, "the supplied display name must read back").toBe(optional.display_name);
	expect(data.operational_status, "the supplied operational status must read back").toBe("active");
	expect(data.address, "the supplied address must read back").toBe(optional.address);
	expect(data.latitude, "the supplied latitude must read back exactly").toBe(16.4321);
	expect(data.longitude, "the supplied longitude must read back exactly").toBe(102.8375);
	expect(data.opening_hours, "the supplied opening hours must read back").toBe(optional.opening_hours);
	expect(data.public_contact, "the supplied public contact must read back").toBe(optional.public_contact);
	expect(
		data.affiliation_text,
		"the supplied affiliation owner text must read back (Organization stays N/A)",
	).toBe(optional.affiliation_text);
	expect(
		(data.image as { id?: unknown } | undefined)?.id,
		"the image selection must read back the uploaded media id",
	).toBe(upload.mediaId);
});

test("coordinates: valid numeric zero and inclusive boundaries save and read back; invalid types and out-of-range values are refused", async () => {
	gate(facilityReadiness);
	// Valid numeric zero is not a missing value, and the native ranges are
	// inclusive: (0, 0), (90, 180) and (−90, −180) are all valid supplied
	// coordinates that read back exactly.
	const validCases: Array<{ label: string; latitude: number; longitude: number }> = [
		{ label: "numeric zero", latitude: 0, longitude: 0 },
		{ label: "inclusive upper boundaries", latitude: 90, longitude: 180 },
		{ label: "inclusive lower boundaries", latitude: -90, longitude: -180 },
	];
	for (const coordinateCase of validCases) {
		const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
			data: {
				title: uniqueTitle(`facility-coordinates-${coordinateCase.label}`),
				latitude: coordinateCase.latitude,
				longitude: coordinateCase.longitude,
			},
		});
		expect(
			created.result.ok,
			`${coordinateCase.label}: the valid supplied coordinates (lat ${coordinateCase.latitude}, lon ${coordinateCase.longitude}) must save`,
		).toBe(true);
		const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
		expect(read.ok, `${coordinateCase.label}: the coordinate fixture must be readable`).toBe(true);
		const data = dataOfItem(nativeItemOf(read));
		expect(data.latitude, `${coordinateCase.label}: latitude must read back exactly`).toBe(
			coordinateCase.latitude,
		);
		expect(data.longitude, `${coordinateCase.label}: longitude must read back exactly`).toBe(
			coordinateCase.longitude,
		);
	}

	// Supplied invalid values are refused: out-of-range numbers beyond the
	// inclusive boundaries, and non-numeric types on a native number field.
	const refusalCases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "latitude above the inclusive maximum (90.0001)", data: { latitude: 90.0001 } },
		{ label: "latitude below the inclusive minimum (−90.5)", data: { latitude: -90.5 } },
		{ label: "longitude above the inclusive maximum (180.5)", data: { longitude: 180.5 } },
		{ label: "longitude below the inclusive minimum (−180.5001)", data: { longitude: -180.5001 } },
		{ label: "latitude supplied as a string", data: { latitude: "13.75" } },
		{ label: "longitude supplied as a boolean", data: { longitude: true } },
	];
	for (const fieldCase of refusalCases) {
		const refusal = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
			data: { title: uniqueTitle("facility-coordinates-invalid"), ...fieldCase.data },
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

test("create refuses representative invalid supplied values for the approved optional facility types", async () => {
	gate(facilityReadiness);
	const cases: Array<{ label: string; data: Record<string, unknown> }> = [
		{ label: "title (string) supplied as a number", data: { title: 123 } },
		{ label: "facility_code (string) supplied as a number", data: { facility_code: 123 } },
		{ label: "address (text) supplied as a number", data: { address: 123 } },
		{
			// Only the three approved values are valid options; anything else
			// reaches the select enum and is refused.
			label: "operational_status (select) supplied outside the approved options",
			data: { operational_status: "closed" },
		},
		// The accepted image-value boundary (T003/T006/T007): an object
		// without id and a non-string/non-object value reach the schema
		// unchanged and are refused. Bare strings are NOT asserted — the
		// documented media normalization path may accept them.
		{ label: "image (image) supplied as an object without id", data: { image: {} } },
		{ label: "image (image) supplied as a number", data: { image: 123 } },
	];
	for (const fieldCase of cases) {
		const refusal = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
			data: { title: uniqueTitle("facility-invalid-value"), ...fieldCase.data },
		});
		expectValidationRefusal(refusal.result, fieldCase.label);
		expect(
			refusal.entryId,
			`${fieldCase.label}: no entry id may be returned for a refused save`,
		).toBeUndefined();
	}
});

// ---------------------------------------------------------------------------
// Operational status versus publication state (US4 scenario 5)
// ---------------------------------------------------------------------------

test("operational_status changes alone never change publication state; no completeness rule gates publishing", async () => {
	gate(facilityReadiness);
	// 02 §20 / US4 scenario 5: operational metadata is domain data on one
	// axis, native publication state another. No automatic unpublish or
	// completeness rule exists — a title-only facility (every optional value
	// omitted) publishes directly under native RBAC, and operational_status
	// transitions leave the publication state untouched while native
	// revisions stage the domain edit.
	const titleOnly = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-title-only-publish") },
	});
	expect(titleOnly.result.ok, "the title-only facility fixture must save").toBe(true);
	const publishedTitleOnly = await publishEntry(admin, HEALTH_SERVICE_COLLECTION, titleOnly.entryId!);
	expect(
		publishedTitleOnly.ok,
		"a natively valid title-only facility must publish directly (no completeness gate)",
	).toBe(true);
	expect(
		nativeItemOf(publishedTitleOnly)?.status,
		"the published title-only facility is in the native published state",
	).toBe("published");

	// A published facility whose operational status changes through all three
	// approved values: the publication state stays published at every step,
	// the staged domain value reads back for the drafts-reading caller, and
	// the live published value stays intact underneath (staged/live overlay).
	const title = uniqueTitle("facility-operational-status");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title, operational_status: "active" },
	});
	expect(created.result.ok, "the operational-status facility fixture must save").toBe(true);
	const published = await publishEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(published.ok, "the operational-status facility must publish").toBe(true);

	const stagedStatuses = ["temporarily_closed", "inactive"] as const;
	for (const status of stagedStatuses) {
		const changed = await updateEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!, {
			data: { operational_status: status },
		});
		expect(
			changed.ok,
			`the operational_status change to ${status} must save on the published facility`,
		).toBe(true);
		const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
		expect(read.ok, "the facility must be readable after the operational change").toBe(true);
		const item = nativeItemOf(read);
		expect(
			item?.status,
			`an operational_status change to ${status} alone must NOT change the publication state`,
		).toBe("published");
		expect(
			dataOfItem(item).operational_status,
			`the staged operational value ${status} must read back for the drafts-reading caller`,
		).toBe(status);
	}
	// The live published value underneath the staged edits: "active" was the
	// published operational status and remains the live view (the read overlay
	// exposes liveData to drafts-reading callers).
	const finalRead = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(finalRead.ok, "the facility must be readable for the live-value check").toBe(true);
	expect(
		liveDataOfItem(nativeItemOf(finalRead)).operational_status,
		"the live published operational value must remain 'active' underneath the staged domain edits",
	).toBe("active");
});

// ---------------------------------------------------------------------------
// Area hierarchy: synthetic Province → District → Subdistrict → Village
// ---------------------------------------------------------------------------

test("synthetic area hierarchy retains supplied codes in slugs, parent identities and source description; label edits retain code/identity", async () => {
	gate(areaReadiness);
	// data-model area row: explicit code in the native term slug, name in the
	// label, parent through native group identity; codes survive label edits;
	// source provenance lives in the native description. The four terms below
	// are EXPLICITLY SYNTHETIC fixtures (clearly labeled codes/labels/
	// description) — real official Area codes remain a pending population
	// input (T001 §6) and are never fabricated into acceptance here.
	const province = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-province");
	const district = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-district", province.termId);
	const subdistrict = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-subdistrict", district.termId);
	const village = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-village", subdistrict.termId);

	// Read each term back by its code slug: the slug is the supplied code,
	// the parent identity is the parent term's native id, and the description
	// records the synthetic source provenance.
	const expectations: Array<{ term: { slug: string; termId: string }; parentTermId?: string }> = [
		{ term: province },
		{ term: district, parentTermId: province.termId },
		{ term: subdistrict, parentTermId: district.termId },
		{ term: village, parentTermId: subdistrict.termId },
	];
	for (const expectation of expectations) {
		const read = await readTerm(AREA_TAXONOMY, expectation.term.slug);
		expect(
			read !== undefined,
			`the ${expectation.term.slug} term must be readable back by its code slug`,
		).toBe(true);
		expect(read?.slug, "the term slug must be the supplied synthetic code").toBe(expectation.term.slug);
		expect(read?.id, "the term identity must be its native id").toBe(expectation.term.termId);
		expect(read?.description, "the term description must record the synthetic source provenance").toBe(
			SYNTHETIC_AREA_DESCRIPTION,
		);
		expect(
			read?.parentId,
			expectation.parentTermId === undefined
				? "a Province-level term must have no parent"
				: "the term's parent must be its parent level's native group identity",
		).toBe(expectation.parentTermId ?? null);
	}

	// Label edit on the Province term: the display name changes while the
	// supplied code (slug) and native identity survive the edit — the exact
	// "preserve code slugs during label edits" behavior the model requires.
	// renameOwnedAreaTerm reconciles the cleanup ownership expectation at the
	// confirmed write itself, so a failed read below can never strand the
	// renamed term behind the original label at cleanup's identity guard.
	const editedLabel = `${syntheticTermLabel("province")} แก้ไขชื่อ`;
	const updatedLabel = await renameOwnedAreaTerm(AREA_TAXONOMY, province.slug, editedLabel);
	expect(updatedLabel.ok, "the area term label edit must succeed").toBe(true);
	const afterEdit = await readTerm(AREA_TAXONOMY, province.slug);
	expect(afterEdit !== undefined, "the edited term must still be reachable by its original code slug").toBe(true);
	expect(afterEdit?.label, "the edited label must read back").toBe(editedLabel);
	expect(afterEdit?.slug, "the label edit must NOT change the supplied code slug").toBe(province.slug);
	expect(afterEdit?.id, "the label edit must NOT change the term identity").toBe(province.termId);
	// The hierarchy below the renamed term is unaffected: the District still
	// points at the same parent identity.
	const districtAfterEdit = await readTerm(AREA_TAXONOMY, district.slug);
	expect(
		districtAfterEdit?.parentId,
		"the child hierarchy must keep pointing at the unchanged parent identity after the label edit",
	).toBe(province.termId);
});

test("facility physical address/coordinates are distinct from the coverage area selection", async () => {
	gate(facilityReadiness);
	gate(areaReadiness);
	// 02 §11 "Location ≠ Service Area": one facility carries BOTH a physical
	// address with map coordinates AND a coverage area term — the two hold
	// their own values independently, and neither replaces the other.
	const village = (async () => {
		const province = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-province");
		const district = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-district", province.termId);
		const subdistrict = await createSyntheticAreaTerm(AREA_TAXONOMY, "area-subdistrict", district.termId);
		return createSyntheticAreaTerm(AREA_TAXONOMY, "area-village", subdistrict.termId);
	})();

	const title = uniqueTitle("facility-location-vs-area");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: {
			title,
			address: syntheticText("physical-address"),
			latitude: 16.4321,
			longitude: 102.8375,
		},
		taxonomies: { [AREA_TAXONOMY]: [(await village).slug] },
	});
	expect(
		created.result.ok,
		"the facility carrying both a physical location and a coverage area term must save",
	).toBe(true);

	const read = await readEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!);
	expect(read.ok, "the location/area facility must be readable").toBe(true);
	const data = dataOfItem(nativeItemOf(read));
	expect(data.address, "the physical address must read back").toBe(syntheticText("physical-address"));
	expect(data.latitude, "the physical latitude must read back exactly").toBe(16.4321);
	expect(data.longitude, "the physical longitude must read back exactly").toBe(102.8375);

	// The coverage selection reads back as the assigned area term — a
	// taxonomy assignment alongside, never instead of, the physical fields.
	const assignments = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}/${encodeURIComponent(created.entryId!)}/terms/${encodeURIComponent(AREA_TAXONOMY)}`,
	);
	expect(
		assignments.ok,
		"the facility's area term assignment must be readable through the native terms endpoint",
	).toBe(true);
	const terms = nativeDataOf(assignments)?.terms;
	expect(Array.isArray(terms), "the area assignment read must return its documented array").toBe(true);
	const assignedSlugs = (terms as Array<{ slug?: unknown }>)
		.map((term) => term.slug)
		.filter((slug): slug is string => typeof slug === "string");
	expect(
		assignedSlugs,
		"the coverage area selection must read back exactly the assigned synthetic village term",
	).toEqual([(await village).slug]);
});

test("optional facility_type classification selects a clearly synthetic term", async () => {
	gate(facilityReadiness);
	gate(facilityTypeReadiness);
	// data-model health_services classification column: `facility_type` O — a
	// Health-Service-only native classification, not an entity or publication
	// gate. One explicitly synthetic term is created, assigned and read back;
	// no official facility-type inventory exists or is invented.
	const typeTerm = await createSyntheticAreaTerm(FACILITY_TYPE_TAXONOMY, "facility-type");
	const title = uniqueTitle("facility-type-selection");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title },
		taxonomies: { [FACILITY_TYPE_TAXONOMY]: [typeTerm.slug] },
	});
	expect(
		created.result.ok,
		"the facility with an optional facility_type classification must save",
	).toBe(true);

	const assignments = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}/${encodeURIComponent(created.entryId!)}/terms/${encodeURIComponent(FACILITY_TYPE_TAXONOMY)}`,
	);
	expect(
		assignments.ok,
		"the facility_type assignment must be readable through the native terms endpoint",
	).toBe(true);
	const terms = nativeDataOf(assignments)?.terms;
	expect(Array.isArray(terms), "the facility_type assignment read must return its documented array").toBe(true);
	const assignedSlugs = (terms as Array<{ slug?: unknown }>)
		.map((term) => term.slug)
		.filter((slug): slug is string => typeof slug === "string");
	expect(
		assignedSlugs,
		"the facility_type selection must read back exactly the assigned synthetic term",
	).toEqual([typeTerm.slug]);
});

// ---------------------------------------------------------------------------
// The one reciprocal facility_services edge set (T029's declaration)
// ---------------------------------------------------------------------------

test("one shared Service at two facilities: exact reciprocal identities in both directions, no copied Service", async () => {
	gate(relationReadiness);
	// US4 scenario 2 / SC-003 / FR-012: one Service related to two Health
	// Services refers to the SAME identities from both directions over the
	// one edge set — the facilities' offered_services selections and the
	// Service's offering_facilities view carry exact reciprocal IDs, with no
	// duplicate Service record created by relating it.
	const serviceTitle = uniqueTitle("service-shared");
	const service = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: serviceTitle },
	});
	expect(service.result.ok, "the shared Service fixture must save").toBe(true);

	const facilityOne = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-offering-one") },
		references: { [FACILITY_SERVICES.parentField]: [service.entryId!] },
	});
	expect(
		facilityOne.result.ok,
		"the first facility's offered_services selection must save (parent-side selector)",
	).toBe(true);
	const facilityTwo = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-offering-two") },
		references: { [FACILITY_SERVICES.parentField]: [service.entryId!] },
	});
	expect(
		facilityTwo.result.ok,
		"the second facility's offered_services selection must save (the same shared Service, not a copy)",
	).toBe(true);

	// Parent side: each facility's children listing resolves exactly the one
	// shared Service id — once, not twice (no duplicated edge row).
	const childrenOne = await offeredServiceIds(facilityOne.entryId!);
	const childrenTwo = await offeredServiceIds(facilityTwo.entryId!);
	expect(
		childrenOne,
		"the first facility's offered-services view must be exactly the shared Service identity",
	).toEqual([service.entryId]);
	expect(
		childrenTwo,
		"the second facility's offered-services view must be exactly the same shared Service identity",
	).toEqual([service.entryId]);

	// Child side: the Service's offering-facilities view resolves exactly the
	// two facility identities — the exact reciprocal set, each once.
	const parents = await offeringFacilityIds(service.entryId!);
	expect(
		parents.filter((id) => id === facilityOne.entryId).length,
		"the first facility must appear exactly once in the Service's offering-facilities view",
	).toBe(1);
	expect(
		parents.filter((id) => id === facilityTwo.entryId).length,
		"the second facility must appear exactly once in the Service's offering-facilities view",
	).toBe(1);
	expect(
		parents.length,
		"the Service's offering-facilities view must hold exactly the two reciprocal facility identities",
	).toBe(2);

	// No copied Service: relating the Service at two facilities created no
	// duplicate Service record.
	expect(
		await countListedByQuery(SERVICE_COLLECTION, serviceTitle),
		"the shared Service must exist exactly once (no duplicate Service record from relating it)",
	).toBe(1);
});

test("the child-side offering_facilities selector writes the same single edge set", async () => {
	gate(relationReadiness);
	// The Service-side selector (offering_facilities, bound child-side)
	// addresses the SAME facility_services edges as the facility-side
	// selector — writing through it is visible from the facility's
	// parent-side view, proving one edge set with two selectors rather than
	// two relations.
	const facility = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-child-side") },
	});
	expect(facility.result.ok, "the facility fixture must save").toBe(true);

	const service = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-child-side") },
		references: { [FACILITY_SERVICES.childField]: [facility.entryId!] },
	});
	expect(
		service.result.ok,
		"the Service's child-side offering_facilities selection must save over the same relation",
	).toBe(true);

	const parents = await offeringFacilityIds(service.entryId!);
	expect(
		parents,
		"the child-side selection must read back the exact facility identity from the Service side",
	).toEqual([facility.entryId]);
	const children = await offeredServiceIds(facility.entryId!);
	expect(
		children,
		"the same edge must be visible from the facility's parent-side view — one edge set, two selectors",
	).toEqual([service.entryId]);
});

test("empty optional selections are permitted on both sides of the relation", async () => {
	gate(relationReadiness);
	// Both selectors are optional: an explicit empty selection is a valid
	// save on either side, and the reciprocal views read back empty.
	const facility = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-empty-selection") },
		references: { [FACILITY_SERVICES.parentField]: [] },
	});
	expect(
		facility.result.ok,
		"an explicit empty offered_services selection must save (an optional relation field)",
	).toBe(true);
	const service = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-empty-selection") },
		references: { [FACILITY_SERVICES.childField]: [] },
	});
	expect(
		service.result.ok,
		"an explicit empty offering_facilities selection must save (an optional relation field)",
	).toBe(true);
	expect(
		await offeredServiceIds(facility.entryId!),
		"the empty facility selection must read back as no offered services",
	).toEqual([]);
	expect(
		await offeringFacilityIds(service.entryId!),
		"the empty Service selection must read back as no offering facilities",
	).toEqual([]);
});

test("staged versus live reciprocal semantics: a pending published-side edit is not a live edge until native publication", async () => {
	gate(relationReadiness);
	// data-model: "Native lifecycle decides when a pending reciprocal edit
	// becomes live; inverse read verification must use the appropriate
	// saved/published state rather than promise immediate cross-entry draft
	// views." A published facility's update STAGES its new offered_services
	// selection in the native revision; the facility's own view shows the
	// staged selection, the newly added Service's inverse view does NOT yet
	// carry the live edge, and native publication promotes it.
	const serviceOne = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-staged-one") },
	});
	expect(serviceOne.result.ok, "the first Service fixture must save").toBe(true);
	const serviceTwo = await createSyntheticEntry(admin, SERVICE_COLLECTION, {
		data: { title: uniqueTitle("service-staged-two") },
	});
	expect(serviceTwo.result.ok, "the second Service fixture must save").toBe(true);

	const facility = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, {
		data: { title: uniqueTitle("facility-staged") },
		references: { [FACILITY_SERVICES.parentField]: [serviceOne.entryId!] },
	});
	expect(facility.result.ok, "the facility fixture must save with its initial selection").toBe(true);
	const published = await publishEntry(admin, HEALTH_SERVICE_COLLECTION, facility.entryId!);
	expect(published.ok, "the facility with its initial selection must publish").toBe(true);

	// The initial selection is live: the first Service's inverse view carries
	// the facility identity.
	expect(
		(await offeringFacilityIds(serviceOne.entryId!)).includes(facility.entryId!),
		"the published initial selection must be a live reciprocal edge",
	).toBe(true);

	// Stage the reciprocal edit: add the second Service to the PUBLISHED
	// facility's offered_services selection (an update of a
	// revisions-supporting collection stages supplied references).
	const staged = await updateEntry(admin, HEALTH_SERVICE_COLLECTION, facility.entryId!, {
		references: {
			[FACILITY_SERVICES.parentField]: [serviceOne.entryId!, serviceTwo.entryId!],
		},
	});
	expect(
		staged.ok,
		"the published facility's new offered_services selection must stage as a pending native revision",
	).toBe(true);

	// The facility's own view (drafts-reading caller) prefers the STAGED
	// selection: both Services.
	expect(
		await offeredServiceIds(facility.entryId!),
		"the facility's own view must show the staged selection (both Services) before publication",
	).toEqual([serviceOne.entryId, serviceTwo.entryId]);

	// The inverse view of the newly added Service reads the LIVE edges: the
	// pending reciprocal edit is not yet a live edge — no immediate
	// cross-entry draft view is promised or asserted.
	expect(
		(await offeringFacilityIds(serviceTwo.entryId!)).includes(facility.entryId!),
		"the newly added Service's inverse view must NOT yet carry the pending edit as a live edge",
	).toBe(false);

	// Native publication decides when the pending edit becomes live: the
	// re-publish promotes the staged selection, and only then does the second
	// Service's inverse view carry the facility identity.
	const republished = await publishEntry(admin, HEALTH_SERVICE_COLLECTION, facility.entryId!);
	expect(
		republished.ok,
		"re-publishing the facility must promote the staged reciprocal selection",
	).toBe(true);
	expect(
		(await offeringFacilityIds(serviceTwo.entryId!)).includes(facility.entryId!),
		"after native publication the promoted selection must be a live reciprocal edge",
	).toBe(true);
	expect(
		(await offeringFacilityIds(serviceOne.entryId!)).includes(facility.entryId!),
		"the original live reciprocal edge must survive the promotion",
	).toBe(true);
	expect(
		await offeredServiceIds(facility.entryId!),
		"the facility's view after promotion must hold both reciprocal Service identities",
	).toEqual([serviceOne.entryId, serviceTwo.entryId]);
});

// ---------------------------------------------------------------------------
// Refusal-family distinction controls
// ---------------------------------------------------------------------------

test("unauthenticated Save is an authorization refusal, distinct from native validation", async () => {
	// This control intentionally runs WITHOUT the US4 schema gates: the
	// native request path resolves authorization before the collection, so an
	// unauthenticated create is refused by the authorization layer regardless
	// of the T028/T029 standing — keeping one live check in every runtime run
	// while never claiming facility coverage from it. The URL is built from
	// the actor's origin (the runner-configured origin the actor was pinned
	// to in beforeAll); no credential is sent, so nothing can leave the
	// configured app.
	const url = new URL(
		`/_emdash/api/content/${HEALTH_SERVICE_COLLECTION}`,
		`${admin.baseUrl}/`,
	);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data: { title: uniqueTitle("facility-unauthenticated") } }),
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

test("a stale _rev facility update is a native state conflict, distinct from validation and authorization", async () => {
	gate(facilityReadiness);
	const title = uniqueTitle("facility-stale-rev");
	const created = await createSyntheticEntry(admin, HEALTH_SERVICE_COLLECTION, { data: { title } });
	expect(created.result.ok, "the valid Health Service draft fixture must save").toBe(true);

	// Consume the create `_rev` with a first update (updateEntry re-reads a
	// fresh one), then replay the ORIGINAL token: the platform must refuse
	// the stale precondition as a native CONFLICT — a state refusal, not a
	// field-validation (400 VALIDATION_ERROR), authorization (401/403) or
	// missing-schema (404) outcome.
	const stale = created.rev!;
	const first = await updateEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!, {
		data: { address: syntheticText("address-first") },
	});
	expect(first.ok, "the first address update with a fresh `_rev` must succeed").toBe(true);

	const replay = await updateEntry(admin, HEALTH_SERVICE_COLLECTION, created.entryId!, {
		data: { address: syntheticText("address-replay") },
		rev: stale,
	});
	expect(
		replay.ok,
		"a stale `_rev` facility update must be refused, not reported as success",
	).toBe(false);
	expect(replay.status, "a stale precondition refusal is the native 409 CONFLICT family").toBe(409);
	expect(
		replay.status === 400 || replay.status === 401 || replay.status === 403 || replay.status === 404,
		"a state conflict must stay distinguishable from validation (400), authorization (401/403) and missing-schema (404)",
	).toBe(false);
	const error = replay.body as { error?: { code?: unknown } };
	expect(error?.error?.code, "the refusal must carry the native CONFLICT code").toBe("CONFLICT");
});
