// T019 — focused native role/lifecycle/scheduling checks for Feature 002
// US6: the native RBAC matrix (Contributor/Author/Editor/Administrator,
// disabled and unauthenticated accounts), the native content lifecycle
// (publish/unpublish, Trash/restore, administrator-only trash-first permanent
// deletion), the separate native media-removal authority, applicable
// current-`_rev` preconditions, and one-time explicit-offset scheduling with
// no early publication, actual native due-time execution and truthful
// failure/overdue observation. Test support in tests/browser/ only: no
// application, schema, seed, dependency, infrastructure, or production change
// is made here, and NO runtime execution is claimed by authoring this file —
// the T022 serial join owns actually running these checks.
//
// Corrective round 1 (Lead review of candidate 32575f6, findings F1–F3)
// hardened: the /auth/me identity is verified through its actual envelope
// (`data.role`, not `data.item.role` — F1); fixture-account reconciliation
// is state-driven rather than flag-driven (an uncertain disable or role
// switch still triggers the supported repair), REPAIRS a drifted role to the
// captured original instead of merely asserting it, and afterEach/afterAll
// attempt every cleanup and reconciliation INDEPENDENTLY, reporting combined
// failures only after all attempts (F2); and the due-time case decides from
// the recorded observation TIMELINE — a publication observed strictly before
// the due instant is REJECTED as a no-early-publication violation instead of
// satisfying the case, with every sample verified inside its observation
// window (F3). Corrective round 2 (findings R2-F2/R2-F3 on candidate
// 7f942fc) further hardened: the disabled-account phase runs through
// runPhaseWithRestoration so a restoration error can never REPLACE the
// primary phase evidence (primary-only rethrown unchanged; both failures
// reported together — R2-F2); and the pre-due case CLOCK-VALIDATES every
// read and the unschedule against the due instant, reporting an overrun
// honestly as inconclusive instead of mislabeling a correct at-due
// publication as early, while the due-time evaluator validates the COMPLETE
// collected timeline (any out-of-window sample, wherever it falls, is a
// window violation) and the observation loop stops at the decisive published
// sample (R2-F3). Corrective round 3 (finding R3-F3 on candidate d1813b5)
// closed the last timing boundary: in the pre-due case, time is validated
// again IMMEDIATELY AFTER each awaited read, the unschedule and the final
// state read — before interpreting any state — because a response that
// starts before due may complete at/after it and then observed the post-due
// world, where publication is correct; crossing/reaching due reports the
// explicit overrun/inconclusive outcome (evaluatePreDueSample /
// expectPreDueInstant), never an early-publication verdict or an
// unconditional draft assertion. No behavior beyond the authorized T019
// scope.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T019 ("Author native
//   role/lifecycle/scheduling checks in tests/browser/cms-lifecycle.spec.ts:
//   Contributor publish/schedule refusal, Author/Editor own/others outcomes
//   and immediate publishing without another person's approval,
//   disabled/unauthorized and administrator-only operations, native
//   media-removal authority, Trash/restore and trash-first administrator
//   content purge; exercise explicit timezone/no early publication and actual
//   native due-time execution with bounded observation, optional omissions
//   and native failures/overdue states, without a custom scheduler, retry
//   manager or policy hook") and the shared "Path Conventions and Shared
//   Constraints" section (dev-bypass access discipline, distinct native role
//   credentials, returned IDs/current `_rev`, re-read uncertain outcomes,
//   serial runtime checks, clean only owned synthetic fixtures)
// - specs/002-cms-content-model/spec.md — US6 acceptance scenarios 1, 3, 4,
//   5, 6, 7, 8 (draft-only staff refused at the trusted system boundary;
//   authorized one-time scheduling with explicit timezone, never early,
//   live content retained until update success, overdue/failure evidence
//   observable; unpublish/trash keeps editable information while public
//   reads exclude it and permanent deletion additionally requires
//   administrator authority; stale/conflicting saves never silently
//   overwrite and uncertain outcomes are re-read before retry; disabled/
//   unauthorized accounts refused regardless of visible controls or public
//   job title; an actor lacking native permission is refused for
//   unpublish/trash/permanent-delete/media-removal without any promised
//   D-REF veto), FR-020/FR-021/FR-022/FR-023/FR-024 (applicable slice)/
//   FR-025/FR-026/FR-027, SC-005/SC-006
// - specs/002-cms-content-model/contracts/native-editorial.md — "Staff
//   Surface and Authorization" (native Contributor is the draft-only case;
//   Author/Editor ownership/publish permissions govern own/others' content;
//   Administrator owns trash-first permanent deletion; raw media deletion
//   follows its separate native ownership/role rules), the "Native Request
//   Shapes" table, and "Outcomes and Revision Limits" (native scheduler uses
//   EmDash's built-in publishing path at due time; native errors may leave a
//   scheduled/overdue item; no early publication; re-read uncertain results)
// - specs/002-cms-content-model/quickstart.md — Prerequisites (distinct
//   native Contributor, Author/Editor and Administrator access via supported
//   native account/role operations; an Admin token alone does not prove
//   draft-only refusal or own/others boundaries; no impersonation layer),
//   "Focused Native API Checks" (direct API requests and current-state
//   re-reads after uncertain actions; a native error stays a truthful
//   refusal/overdue state, never a fabricated success) and "Verification
//   Commands and Cleanup"
// - docs/website-modernization-docs/current/06-roles-permissions.md §§2–8
//   (draft authoring is not publish authority; ownership baseline; the
//   administrator boundary incl. permanent content deletion; client UI is
//   not security), 07-publishing-workflow.md §§2–3/5/9–10/13 (core
//   lifecycle, direct native publishing with no article approval, one-time
//   scheduling with explicit timezone and no early publication,
//   revisions/locks/concurrency as native capability, Trash/restore with
//   administrator-only trash-first permanent delete, re-read before retry)
//   and 05-admin-cms.md §9 (native RBAC publish authority acts directly)
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (loadDevAccessToken/createPatActor
//   development-credential actors, NATIVE_ROLES, assertDistinctActors,
//   assertSameNativeApp, withNativeRole supported-operation role phases with
//   verified restoration, native lifecycle request helpers, owned-fixture
//   cleanup with trash-aware reconciliation)
// - tests/browser/cms-document.spec.ts, cms-authoring.spec.ts and
//   cms-reuse.spec.ts — the accepted T003/T007/T014 patterns this file
//   follows (schema-readiness gating, refusal-family assertions, the
//   unauthenticated authorization control, direct Publish/Schedule of valid
//   incomplete fixtures, failure-safe teardown, the runner-configured
//   origin, the T013 test-authentication adaptation)
// - specs/002-cms-content-model/evidence/T018-us2-reuse.md — the applied
//   live schema standing (pages/news/... all eight US1+US2 collections
//   active) and the pinned-toolchain facts; T001-development-inputs.md §6 —
//   the distinct-role fixture input truthfully recorded as missing at this
//   baseline, which the prerequisite gating below reports rather than
//   invents
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// checked first through Context7 (/websites/emdashcms — "User roles" table
// Subscriber 10 / Contributor 20 / Author 30 / Editor 40 / Admin 50, the
// admin-panel "Roles and permissions" section, and the MCP role-requirements
// table for unversioned orientation; /microsoft/playwright v1.63.0 for
// Playwright semantics), then controlled by the PINNED FIRST-PARTY PACKAGE
// SOURCES: the `emdash@1.1.0` npm tarball (sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==,
// downloaded fresh from registry.npmjs.org and byte-equal to
// package-lock.json — the same integrity the T002/T003/T007/T014 files
// independently verified) and its pinned RBAC dependency `@emdash-cms/auth`
// 1.1.0 (npm tarball sha512-BEKRFTLkIsj/yhF83optrkzyPq0E1AiAnIvpqT9aDA9JJSvRKuzJMK9gZ7Xo8oDAsfUGZlKhloJsGHivFhAZpg==,
// byte-equal to package-lock.json). Facts actually relied on below:
// - RBAC core (@emdash-cms/auth src/rbac.ts Permissions, hasPermission,
//   canActOnOwn; src/types.ts Role): a permission is granted iff
//   `user.role >= Permissions[permission]`; ownership splits every content/
//   media action into an own and an any permission. Minimums relied on:
//   content:read 10, content:read_drafts 20, content:create 20,
//   content:edit_own 30, content:edit_any 40, content:delete_own 30,
//   content:delete_any 40, content:delete_permanent 50,
//   content:publish_own 30, content:publish_any 40, media:upload 20,
//   media:delete_own 30, media:delete_any 40, users:read 50, users:manage 50.
//   canActOnOwn answers the OWN permission when user.id === ownerId (an
//   empty-string ownerId never matches), else the ANY permission
// - refusal families (emdash src/api/authorize.ts requirePerm/
//   requireOwnerPerm; src/api/error.ts): anonymous → UNAUTHORIZED 401;
//   authenticated insufficient permission → FORBIDDEN 403 "Insufficient
//   permissions" — never VALIDATION_ERROR, so a permission refusal can never
//   masquerade as a validation outcome (and vice versa)
// - publish/unpublish/schedule/unschedule (src/astro/routes/api/content/
//   [collection]/[id]/{publish,unpublish,schedule}.ts): all four gate on
//   requireOwnerPerm(authorId, "content:publish_own", "content:publish_any")
//   — a Contributor (20) is refused on OWN and others' content alike; an
//   Author (30) may act on own content only; an Editor (40) on any. Supplying
//   a `publishedAt` backdate additionally requires content:publish_any
//   (publish.ts). The routes claim the native entry lock for the write
//   (claimEntryLockForWrite); deeper lock/concurrency coverage is T020
// - trash/restore (src/astro/routes/api/content/[collection]/[id].ts DELETE;
//   …/[id]/restore.ts): DELETE gates on requireOwnerPerm("content:delete_own",
//   "content:delete_any"); restore on ("content:edit_own", "content:edit_any")
// - permanent deletion (…/[id]/permanent.ts requirePerm
//   "content:delete_permanent" — Administrator-only; src/api/handlers/content.ts
//   handleContentPermanentDelete): a LIVE (not-yet-trashed) row is refused —
//   `if (!item || item.deletedAt === null) return false` maps to
//   `{ success: false, error: { code: "NOT_FOUND" } }` — the native
//   trash-first precondition, enforced even for an Administrator; success
//   returns `{ deleted: true, id }`
// - users administration (src/astro/routes/api/admin/users/index.ts,
//   [id]/index.ts, [id]/disable.ts, [id]/enable.ts): all Administrator-only
//   (role < 50 → FORBIDDEN 403); PUT refuses changing the caller's own role
//   (SELF_ROLE_CHANGE 400) and demoting the last administrator (LAST_ADMIN
//   400); POST …/disable refuses self-disable and last-admin disable (400),
//   sets disabled = true and revokes OAuth tokens; POST …/enable sets
//   disabled = false. These supported operations are what withNativeRole and
//   the disabled-account phase below use — no impersonation layer exists
// - disabled accounts (src/astro/middleware/auth.ts handleBearerAuth): the
//   middleware resolves the token's owning user record on EVERY request and
//   `if (!user || user.disabled) return "invalid"` → the middleware answers
//   INVALID_TOKEN 401 "Invalid or expired token". A disabled account's live
//   PAT is therefore refused at the authorization layer BEFORE any route
//   permission/validation logic, whatever role the account holds; the same
//   PAT works again once the account is re-enabled
// - media removal (src/astro/routes/api/media/[id].ts DELETE): a minimum
//   permission gate requirePerm("media:delete_own") (role 30+) followed by
//   an ownership check requireOwnerPerm(media.authorId, "media:delete_own",
//   "media:delete_any") — an Author deletes only owned assets, an Editor any
//   asset, a Contributor none; media removal is its own authority, neither
//   administrator-only nor trash-first (FR-025/FR-027)
// - scheduling (src/api/handlers/content.ts handleContentSchedule;
//   src/database/repositories/content.ts schedule()): the request body
//   requires ISO 8601 with "Z" or an explicit offset; a non-future time is
//   refused `EmDashValidationError("Scheduled date must be in the future")`
//   (400 VALIDATION_ERROR); an UNPUBLISHED entry transitions to status
//   "scheduled" while a published one keeps "published" (the schedule
//   applies to the pending draft); unschedule returns draft/scheduled
//   entries to "draft" and leaves published ones published. Uncertain
//   mutations throw ContentMutationConflictError → 409 CONFLICT
// - native scheduler (src/scheduled-publish.ts publishDueContent;
//   src/plugins/scheduler/node.ts NodeCronScheduler; src/emdash-runtime.ts
//   publishScheduled): the platform scheduler's maintenance pass runs at
//   most every 60 s on Node (MAX_INTERVAL_MS = 60_000) and sweeps every
//   collection for rows with scheduled_at <= now and deleted_at IS NULL,
//   publishing each through the runtime's handleContentPublish with
//   requireScheduledDue — the SAME native publishing path as a direct
//   request; success clears scheduled_at and sets status "published", and
//   the FIRST scheduled publication records published_at = the intended
//   scheduled time (not the sweep time); a failed publish is logged and
//   leaves the item scheduled/overdue (observable, never a hidden retry);
//   NOT_DUE/PUBLISH_REJECTED (rescheduled/unscheduled in the meantime) are
//   quiet skips. Due-time observation below is therefore bounded to exceed
//   the verified ≤60 s sweep cadence by a wide margin, and nothing here
//   substitutes a test-side scheduler, hook or retry manager
// - Playwright 1.63.0 semantics (Context7 /microsoft/playwright v1.63.0):
//   `--list` collects tests without running them (no browser launch, no
//   hooks) — discovery output is never a runtime PASS claim; tests in one
//   file run sequentially in one worker; `test.setTimeout` raises one test's
//   timeout; test-scoped afterEach runs in the SAME worker after every test
//
// Boundaries and non-claims (tasks.md T019; Constitution v3.0.0 II–V):
// - test authoring and static/discovery verification only. Every scenario
//   below is AUTHORED for the T022 serial runtime join; nothing here is
//   executed at authoring time and no runtime PASS, role outcome or
//   scheduler observation is claimed
// - the preparation/administration actor is the pre-existing development
//   credential's Administrator fixture (dev@emdash.local, role 50), loaded
//   from its controller-format mode-0600 JSON through the accepted T013
//   adaptation (loadDevAccessToken + createPatActor — never the dev-bypass
//   bootstrap, whose native endpoint replaces same-named tokens and applies
//   seed intent) and pinned to the RUNNER-CONFIGURED origin
//   (PLAYWRIGHT_BASE_URL or the documented development origin). It prepares
//   others'-content fixtures and performs the administrator-side operations;
//   it is NEVER presented as coverage of another role (assertDistinctActors
//   refuses that shortcut)
// - role evidence requires a genuinely DISTINCT second native account that
//   owns a PAT — the explicit test-owned prerequisite encoded below as
//   SONGHEALTH_ROLE_FIXTURE_ACCESS (path to a mode-0600 controller-format
//   JSON credential, the same fail-closed loader discipline as the
//   development credential). T001 §6 records this input as missing at this
//   baseline: when it is absent the role-phase tests SKIP truthfully with
//   the prerequisite named, and when it is configured but unreadable the
//   suite FAILS loudly — missing supported access is reported, never
//   disguised as coverage or permission success. Role phases run through
//   withNativeRole (the supported two-account users-API operation with
//   verified restoration on every exit path); the fixture account is
//   test-owned, and the shared dev Administrator and any real/shared user is
//   never mutated
// - the native SELF_ROLE_CHANGE and LAST_ADMIN guards are pinned-source
//   facts recorded above and deliberately NOT exercised: reaching either
//   would mean attempting a role mutation on the shared dev Administrator
//   itself (the only administrator), which this task forbids; the exercised
//   administrator boundary is the positive users read plus the Editor-level
//   refusals of users administration and permanent deletion
// - disabled-state coverage mutates only the test-owned fixture account
//   through the supported native disable/enable routes, and restoration is
//   proven by RE-READS (admin user record + live /auth/me), never claimed
//   from the enable request alone; the afterAll safety net re-reconciles
//   role and disabled state so an interrupted phase cannot silently strand
//   a mutated fixture account
// - scheduling observation is READ-ONLY bounded polling of current native
//   state: no test-side scheduler, hook, retry manager or forced
//   publication exists here; a failed or overdue publication FAILS the
//   due-time case with its observed state rendered in the failure message
//   — it never satisfies the success case. The no-early-publication case
//   samples strictly BEFORE the due time and then unschedules natively, so
//   it never waits past due. Observation windows are named constants sized
//   from the verified ≤60 s sweep cadence; T022 may tune them
// - deeper revision/lock/autosave/restore coverage (current/stale `_rev`
//   matrix depth, locks, live-vs-pending staging) is T020; only the
//   applicable lifecycle precondition slice is here (fresh `_rev` on every
//   lifecycle call through the T002 helpers, plus one stale-`_rev` publish
//   and schedule control with the re-read-then-retry discipline). Public
//   read/preview exclusion is T021; the Admin UI journey is T031
// - fixtures are clearly-marked synthetic public-publishable data; content
//   IDs, `_rev` values and media IDs come from native responses only.
//   Failure-safe owned-fixture cleanup runs per test (afterEach) plus an
//   afterAll safety net, for BOTH actors' registries (the fixture actor's
//   registry is executed by the development Administrator under
//   assertSameNativeApp, while the fixture's registry alone defines what may
//   be touched). No D-ITA/D-REF guarantee is claimed anywhere

import { expect, test } from "@playwright/test";

import {
	assertDistinctActors,
	assertSameNativeApp,
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	currentRev,
	DEFAULT_DEVELOPMENT_ORIGIN,
	deleteMedia,
	findTrashedEntry,
	getMe,
	getUser,
	listUsers,
	loadDevAccessToken,
	nativeDataOf,
	nativeErrorOf,
	nativeItemOf,
	nativeRefusalOf,
	nativeRoleName,
	NATIVE_ROLES,
	permanentlyDeleteEntry,
	publishEntry,
	readEntry,
	restoreEntry,
	scheduleEntry,
	setUserRole,
	trashEntry,
	unpublishEntry,
	unscheduleEntry,
	updateEntry,
	uploadSyntheticMedia,
	withNativeRole,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
	type NativeRoleLevel,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Collections, prerequisite configuration, scheduling windows
// ---------------------------------------------------------------------------

/**
 * The `pages` collection carries only a required semantic title at save
 * (T008/T013 definition, live at this baseline per the T018 evidence), which
 * makes it the minimal kind for lifecycle/scheduling fixtures: every
 * optional omission below is native-permitted, so any refusal can only be
 * about permission, state or time — never completeness.
 */
const PAGES_COLLECTION = "pages";

/**
 * Environment variable naming the distinct role-fixture credential: the path
 * to a mode-0600 controller-format JSON file (`{ token }`) whose PAT belongs
 * to a SECOND native account (never dev@emdash.local). The explicit
 * test-owned account/role prerequisite for every role-phase case (quickstart
 * Prerequisites; T001 §6 records the input pending at this baseline).
 */
const ROLE_FIXTURE_CREDENTIAL_ENV = "SONGHEALTH_ROLE_FIXTURE_ACCESS";

/** Bangkok UTC+7 — the explicit offset every scheduling case below uses. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Due-time case: schedule this far ahead, then observe. Small enough to keep
 * the T022 run short, far enough to schedule and sample before due.
 */
const DUE_TIME_OFFSET_MS = 15_000;

/**
 * Bounded observation budget for the due-time case: must exceed the verified
 * native sweep cadence (≤60 s between maintenance passes) by a wide margin
 * so a healthy scheduler is never declared overdue.
 */
const DUE_TIME_OBSERVATION_BUDGET_MS = 240_000;

/** Poll interval for the due-time bounded observation (reads only). */
const DUE_TIME_POLL_INTERVAL_MS = 5_000;

/**
 * No-early-publication case: due time far enough to take two pre-due
 * samples strictly before it, then unschedule (this case never waits past
 * due, so it can never observe — let alone force — a publication).
 */
const NO_EARLY_DUE_MS = 90_000;

/** Gap between the two pre-due samples (two gaps still end before due). */
const NO_EARLY_SAMPLE_GAP_MS = 20_000;

/** The explicit-offset scheduling read-back/acceptance case uses +6 h. */
const SCHEDULE_ACCEPTANCE_OFFSET_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
}

/**
 * Readiness for the exercised collection, decided once per worker in
 * beforeAll from the live native schema read: `missing` (collection not
 * initialized — the owning definition task outstanding) SKIPS explicitly;
 * `misconfigured` FAILS loudly so an unexpected schema mismatch stays
 * visible (the accepted T014 gating pattern).
 */
type CollectionReadiness =
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The development-credential Administrator fixture (preparation + admin side). */
let admin: CmsActor;

/**
 * The distinct test-owned role-fixture actor, or undefined while the
 * SONGHEALTH_ROLE_FIXTURE_ACCESS prerequisite is not provided (the role-phase
 * tests then skip truthfully). Set by beforeAll only.
 */
let roleFixture: CmsActor | undefined;

/** The fixture account's original native role, captured at first verify. */
let roleFixtureOriginalRole: number | undefined;

/** Readiness of the pages collection; set by beforeAll. */
let pagesReadiness: CollectionReadiness = { outcome: "missing" };

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003/T007/T014 checks): PLAYWRIGHT_BASE_URL
 * when set, otherwise the documented development origin. node:process is
 * loaded through a dynamic non-literal import because the pinned dependency
 * baseline ships no @types/node.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

/** Truthful schema gate for the pages collection (T014 gateCollection shape). */
function gatePages(): void {
	test.skip(
		pagesReadiness.outcome === "missing",
		"the pages collection is not initialized in the active native schema (T008/T013 prerequisite outstanding; this run cannot exercise the lifecycle fixtures)",
	);
	if (pagesReadiness.outcome === "misconfigured") {
		throw new Error(
			`the active native pages collection does not match the approved definition this file relies on: ${pagesReadiness.detail}`,
		);
	}
}

/**
 * Truthful prerequisite gate for the distinct role-fixture account: when the
 * credential is not provided the role-phase cases SKIP with the prerequisite
 * named — role coverage is never claimed from the shared Administrator token
 * and never silently skipped as if covered.
 */
function gateRoleFixture(): CmsActor {
	test.skip(
		roleFixture === undefined,
		`distinct role-fixture prerequisite missing: set ${ROLE_FIXTURE_CREDENTIAL_ENV} to the mode-0600 controller-format JSON credential of a second PAT-owning native account (T001 §6 records this input pending at this baseline)`,
	);
	return roleFixture!;
}

/** The entry's lifecycle status as the native read returns it, when present. */
function statusOfItem(item: Record<string, unknown> | undefined): string | undefined {
	return typeof item?.status === "string" ? item.status : undefined;
}

/** Parse a native datetime field into an epoch instant, or null. */
function instantOf(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * The SAME instant rendered with an explicit +07:00 offset (Asia/Bangkok —
 * the Songhealth site timezone context). Purely a test-side STRING FORMAT of
 * the submitted instant: FR-023's explicit-timezone requirement, not any
 * scheduler substitute.
 */
function isoWithBangkokOffset(instant: Date): string {
	return `${new Date(instant.getTime() + BANGKOK_OFFSET_MS)
		.toISOString()
		.replace("Z", "")}+07:00`;
}

/** Read-only wait between bounded-observation samples. */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertions (the accepted T003/T007/T014 contracts)
// ---------------------------------------------------------------------------

/**
 * A native insufficient-permission refusal: HTTP 403 with the FORBIDDEN code,
 * and explicitly NOT success and NOT a validation (400) or state-conflict
 * (409) outcome — a permission boundary can never masquerade as validation
 * or concurrency, and vice versa.
 */
function expectForbiddenRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the native operation must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: an authenticated insufficient-permission refusal is HTTP 403`,
	).toBe(403);
	expect(
		result.status === 400 || result.status === 409,
		`${caseLabel}: a permission refusal must stay distinguishable from validation (400) and state-conflict (409) failures`,
	).toBe(false);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native FORBIDDEN code`,
	).toBe("FORBIDDEN");
}

/**
 * A disabled account's live PAT: the authorization middleware resolves the
 * owning user record on every request and treats a disabled owner's token as
 * invalid — HTTP 401 INVALID_TOKEN, BEFORE any route permission, ownership
 * or validation logic, whatever role the account holds (US6.7: disabled
 * accounts cannot bypass through direct request).
 */
function expectDisabledTokenRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the request must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: a disabled account's bearer credential is refused at the authorization layer with 401`,
	).toBe(401);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native INVALID_TOKEN code (the disabled owner's token resolves invalid)`,
	).toBe("INVALID_TOKEN");
}

/**
 * A native optimistic-concurrency refusal: HTTP 409 CONFLICT — a stale
 * `_rev` precondition never silently overwrites newer work (US6.5, the
 * applicable T019 slice; deeper revision/lock coverage is T020).
 */
function expectConflictRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the operation must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: a stale _rev precondition is refused with 409`,
	).toBe(409);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native CONFLICT code`,
	).toBe("CONFLICT");
}

/**
 * The native non-future scheduling refusal: HTTP 400 VALIDATION_ERROR with
 * the "future" message, and explicitly NOT an authorization (401/403) or
 * conflict (409) outcome — the native time guard, never a Songhealth
 * predicate (SC-006: no false success, no invented policy cancellation).
 */
function expectNonFutureScheduleRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the schedule must be refused, not reported as success`,
	).toBe(false);
	expect(result.status, `${caseLabel}: a non-future time is HTTP 400`).toBe(400);
	expect(
		result.status === 401 || result.status === 403 || result.status === 409,
		`${caseLabel}: a time-validation refusal must stay distinguishable from authorization (401/403) and conflict (409) failures`,
	).toBe(false);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native VALIDATION_ERROR code`,
	).toBe("VALIDATION_ERROR");
	expect(
		nativeErrorOf(result)?.message.includes("future"),
		`${caseLabel}: the native refusal must state the future-time requirement`,
	).toBe(true);
}

// ---------------------------------------------------------------------------
// Fixture-account reconciliation (role and disabled state, by re-read)
// ---------------------------------------------------------------------------

/**
 * Reconcile the test-owned fixture account back to its CAPTURED original
 * state (corrective round 1, F2): state-driven, never flag-driven — a
 * disable or role switch may have committed even when no response proved it,
 * so an UNCERTAIN read still triggers the supported repair attempt. Every
 * repair is verified by RE-READ (administrative user record plus the live
 * credential's own /auth/me), never claimed from a request alone, and every
 * step is ATTEMPTED before any failure is reported: the collected failures
 * are thrown combined at the end, so one broken step can never prevent the
 * remaining reconciliations. Only the test-owned fixture account and its
 * captured original role are ever touched.
 */
async function reconcileFixtureAccountState(): Promise<void> {
	if (roleFixture === undefined || roleFixtureOriginalRole === undefined) {
		return;
	}
	const fixtureUserId = roleFixture.userId;
	const originalRole = roleFixtureOriginalRole as NativeRoleLevel;
	const failures: string[] = [];

	// --- Disabled state: repair by OBSERVED state. `undefined` (unread or
	// uncertain) is treated like `true` — the enable attempt is always safe
	// (an idempotent supported operation on the test-owned account) and is
	// never skipped, so an uncertain commit cannot silently strand a disabled
	// account (F2).
	let disabledObserved: boolean | undefined;
	try {
		const observed = nativeItemOf(await getUser(admin, fixtureUserId));
		disabledObserved = typeof observed?.disabled === "boolean" ? observed.disabled : undefined;
	} catch {
		disabledObserved = undefined;
	}
	if (disabledObserved !== false) {
		try {
			const enable = await cmsRequest(
				admin,
				`/_emdash/api/admin/users/${encodeURIComponent(fixtureUserId)}/enable`,
				{ method: "POST" },
			);
			if (!enable.ok) {
				failures.push(`enable request refused (${nativeRefusalOf(enable)})`);
			}
			const reRead = nativeItemOf(await getUser(admin, fixtureUserId));
			if (reRead?.disabled !== false) {
				failures.push(
					`disabled state not verified false by re-read (observed ${String(reRead?.disabled)})`,
				);
			}
		} catch (cause) {
			failures.push(`enable/verify attempt failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}

	// --- Role: REPAIR to the captured original through the supported users
	// operation, then verify — not merely assert — the original is back (F2).
	try {
		const current = nativeItemOf(await getUser(admin, fixtureUserId));
		const currentRole = typeof current?.role === "number" ? current.role : undefined;
		if (currentRole !== originalRole) {
			const restore = await setUserRole(admin, fixtureUserId, originalRole);
			if (!restore.ok) {
				failures.push(
					`role restore to ${nativeRoleName(originalRole)} refused (${nativeRefusalOf(restore)})`,
				);
			}
		}
		const afterAdmin = nativeItemOf(await getUser(admin, fixtureUserId));
		const afterRole = typeof afterAdmin?.role === "number" ? afterAdmin.role : undefined;
		if (afterRole !== originalRole) {
			failures.push(
				`role not verified back at ${nativeRoleName(originalRole)} by administrative re-read (observed ${
					afterRole === undefined ? "unknown" : nativeRoleName(afterRole)
				})`,
			);
		}
	} catch (cause) {
		failures.push(`role repair/verify attempt failed: ${cause instanceof Error ? cause.message : String(cause)}`);
	}

	// --- Live credential: the same PAT must verify at the original role
	// through the supported /auth/me envelope — `data.role`, NOT `data.item`
	// (corrective round 1, F1: /auth/me carries its identity in `data`
	// directly; reading `data.item.role` could never verify).
	try {
		const live = await getMe(roleFixture);
		const liveRoleValue = nativeDataOf(live)?.role;
		const liveRole = typeof liveRoleValue === "number" ? liveRoleValue : undefined;
		if (!live.ok || liveRole !== originalRole) {
			failures.push(
				`live credential did not verify at ${nativeRoleName(originalRole)} via /auth/me (${
					live.ok
						? `observed ${liveRole === undefined ? "unknown" : nativeRoleName(liveRole)}`
						: nativeRefusalOf(live)
				})`,
			);
		}
	} catch (cause) {
		failures.push(`live credential verification failed: ${cause instanceof Error ? cause.message : String(cause)}`);
	}

	if (failures.length > 0) {
		throw new Error(
			`fixture-account reconciliation unresolved after all attempts: ${failures.join("; ")}`,
		);
	}
}

/** Secret-free rendering of an arbitrary caught failure for reports. */
function renderFailure(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Run one mutation phase and ALWAYS run `restore` afterward (corrective
 * round 2, R2-F2). Restoration failures must never REPLACE the primary
 * phase evidence, so all four outcomes preserve it:
 * - phase failure only → the ORIGINAL error is rethrown unchanged;
 * - restoration failure only → the truthful restoration error is thrown;
 * - both → ONE combined error carrying BOTH renderings, so a committed
 *   mutation whose response was lost keeps its original evidence next to
 *   the unresolved-restoration report;
 * - neither → the phase's value is returned.
 * `restore` itself is expected to attempt every reconciliation before
 * throwing (see reconcileFixtureAccountState); secret safety relies on the
 * T002 helpers' scrubbed messages plus this file's own assertion strings.
 */
async function runPhaseWithRestoration<T>(
	phase: () => Promise<T>,
	restore: () => Promise<void>,
): Promise<T> {
	let value: T | undefined;
	let primaryFailure: unknown;
	let primaryFailed = false;
	try {
		value = await phase();
	} catch (cause) {
		primaryFailed = true;
		primaryFailure = cause;
	}
	let restorationFailure: unknown;
	let restorationFailed = false;
	try {
		await restore();
	} catch (cause) {
		restorationFailed = true;
		restorationFailure = cause;
	}
	if (primaryFailed && restorationFailed) {
		throw new Error(
			`phase failed AND its restoration is unresolved — primary failure: ${renderFailure(
				primaryFailure,
			)}; restoration: ${renderFailure(restorationFailure)}`,
		);
	}
	if (restorationFailed) {
		throw restorationFailure;
	}
	if (primaryFailed) {
		throw primaryFailure;
	}
	return value as T;
}

// ---------------------------------------------------------------------------
// Worker setup: development access, role-fixture prerequisite, schema reads
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	const origin = await configuredDevelopmentOrigin();
	// Development native access through the pre-existing development
	// credential (T013 test-authentication adaptation). This hook
	// deliberately creates no owned fixtures; Playwright --list discovery
	// performs no native calls at all (hooks run only at execution).
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// The distinct role-fixture prerequisite: a CONFIGURED credential that
	// fails to load/verify is a loud failure (the environment claims role
	// coverage it cannot deliver); an ABSENT one leaves the role-phase cases
	// to their truthful skip.
	const processSpecifier = "node:process";
	const nodeProcess = (await import(processSpecifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	const fixtureCredentialPath = nodeProcess.env[ROLE_FIXTURE_CREDENTIAL_ENV];
	if (fixtureCredentialPath !== undefined && fixtureCredentialPath.trim().length > 0) {
		const fixture = await createPatActor({
			baseUrl: origin,
			token: await loadDevAccessToken(fixtureCredentialPath.trim()),
		});
		assertDistinctActors(admin, fixture);
		assertSameNativeApp(admin, fixture);
		expect(
			fixture.email,
			"the role-fixture credential must belong to a genuinely distinct native account (never dev@emdash.local)",
		).not.toBe("dev@emdash.local");
		roleFixture = fixture;
		roleFixtureOriginalRole = fixture.role;
	}

	// One live schema read decides the exercised collection's readiness. The
	// only unconditional definition fact the checks below rely on is the
	// required semantic title, so every lifecycle refusal can only be about
	// permission, state or time — an absent optional field can never
	// masquerade as one.
	const schemaRead = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(PAGES_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (schemaRead.status === 404) {
		pagesReadiness = { outcome: "missing" };
	} else {
		expect(
			schemaRead.ok,
			`reading the native ${PAGES_COLLECTION} collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
		).toBe(true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(Array.isArray(fields), `the ${PAGES_COLLECTION} schema read must include fields`).toBe(
			true,
		);
		const bySlug = new Map<string, SchemaField>();
		for (const field of fields as SchemaField[]) {
			if (typeof field.slug === "string") bySlug.set(field.slug, field);
		}
		const title = bySlug.get("title");
		pagesReadiness =
			title?.type === "string" && title.required === true
				? { outcome: "ready" }
				: {
						outcome: "misconfigured",
						detail: "title must be a required native string field",
					};
	}
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup and fixture-account reconciliation
// ---------------------------------------------------------------------------

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so actors
	// that never finished bootstrapping have nothing to reconcile. Each
	// cleanup runs INDEPENDENTLY (corrective round 1, F2): an earlier
	// failure is recorded and the remaining cleanups still attempted, with
	// the combined failures reported only after all attempts.
	const failures: string[] = [];
	if (roleFixture !== undefined) {
		// The fixture account's registry defines WHAT may be touched; the
		// development Administrator (assertSameNativeApp-enforced) supplies
		// the deletion authority, since the fixture's original role may be
		// below the trash/purge minimums.
		try {
			const report = await cleanupOwnedFixtures(roleFixture, {
				adminActor: admin,
				permanent: true,
			});
			console.log(
				`[cms-lifecycle] role-fixture owned-fixture cleanup after test: ${
					report.complete ? "complete" : "UNRESOLVED"
				} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
			);
			expect(
				report.complete,
				"every owned synthetic fixture created by the role fixture must be proven resolved",
			).toBe(true);
		} catch (cause) {
			failures.push(`role-fixture cleanup: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	if (admin !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			console.log(
				`[cms-lifecycle] admin owned-fixture cleanup after test: ${
					report.complete ? "complete" : "UNRESOLVED"
				} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
			);
			expect(
				report.complete,
				"every owned synthetic fixture created by this test must be proven resolved (unresolved cleanup is a reported failure, not a silent leftover)",
			).toBe(true);
		} catch (cause) {
			failures.push(`admin cleanup: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`afterTest cleanup failures after all attempts: ${failures.join("; ")}`);
	}
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything). Every
	// reconciliation attempt runs INDEPENDENTLY — role-fixture cleanup, admin
	// cleanup, then the fixture-account state — so a failed cleanup assertion
	// can never prevent the account reconciliation (corrective round 1, F2);
	// the combined failures are reported only after ALL attempts.
	const failures: string[] = [];
	if (roleFixture !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(roleFixture, {
				adminActor: admin,
				permanent: true,
			});
			expect(
				report.complete,
				"the final role-fixture cleanup must leave zero unresolved owned fixtures",
			).toBe(true);
		} catch (cause) {
			failures.push(`role-fixture cleanup: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	if (admin !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			expect(
				report.complete,
				"the final admin cleanup must leave zero unresolved owned fixtures",
			).toBe(true);
		} catch (cause) {
			failures.push(`admin cleanup: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	// Reconcile the possibly-mutated fixture account (disabled state and role,
	// repaired to the captured original and verified by re-read) so an
	// interrupted phase cannot strand it silently.
	if (roleFixture !== undefined && roleFixtureOriginalRole !== undefined) {
		try {
			await reconcileFixtureAccountState();
		} catch (cause) {
			failures.push(`fixture-account reconciliation: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`afterAll reconciliation failures after all attempts: ${failures.join("; ")}`);
	}
});

// ---------------------------------------------------------------------------
// Schema precondition
// ---------------------------------------------------------------------------

test("pages schema precondition: the approved native definition is active", () => {
	gatePages();
	// Reaching here with the collection ready is the asserted precondition
	// itself (required semantic title; every other field optional).
	expect(pagesReadiness.outcome).toBe("ready");
});

// ---------------------------------------------------------------------------
// Contributor (20): draft authoring without publish authority (FR-021)
// ---------------------------------------------------------------------------

test("contributor: saves drafts while direct publish, schedule, trash and media removal are refused by native RBAC", async () => {
	const fixture = gateRoleFixture();
	gatePages();

	// An administrator-owned media fixture for the minimum-gate media refusal.
	const adminMedia = await uploadSyntheticMedia(admin);
	expect(adminMedia.result.ok, "the synthetic fixture media upload must succeed").toBe(true);

	await withNativeRole(
		admin,
		fixture,
		NATIVE_ROLES.contributor,
		async (contributor: CmsActor) => {
			// Draft authoring: content:create sits at Contributor (20).
			const draft = await createSyntheticEntry(contributor, PAGES_COLLECTION, {
				data: { title: uniqueTitle("contributor-draft") },
			});
			expect(
				draft.result.ok,
				"a native Contributor must save a draft (draft authoring is not publish authority)",
			).toBe(true);
			expect(draft.entryId, "the draft id must come from the native response").toBeTruthy();
			const draftStatus = statusOfItem(nativeItemOf(await readEntry(contributor, PAGES_COLLECTION, draft.entryId!)));
			expect(draftStatus, "the saved fixture must be a native draft").toBe("draft");

			// Direct publish of the contributor's OWN draft: publish_own sits
			// at Author (30) — the trusted boundary refuses the direct
			// request no matter what any visible control suggests.
			expectForbiddenRefusal(
				await publishEntry(contributor, PAGES_COLLECTION, draft.entryId!),
				"contributor publishing own draft directly",
			);
			// Direct schedule of the own draft: the schedule route carries the
			// same own/any publish permission.
			expectForbiddenRefusal(
				await scheduleEntry(
					contributor,
					PAGES_COLLECTION,
					draft.entryId!,
					isoWithBangkokOffset(new Date(Date.now() + SCHEDULE_ACCEPTANCE_OFFSET_MS)),
				),
				"contributor scheduling own draft directly",
			);
			// Trashing the own draft: delete_own also sits at Author (30).
			expectForbiddenRefusal(
				await trashEntry(contributor, PAGES_COLLECTION, draft.entryId!),
				"contributor trashing own draft",
			);
			// Media removal: the minimum permission gate media:delete_own
			// (30) refuses a Contributor before ownership is even consulted —
			// a distinct native authority, not a content-purge rule.
			expectForbiddenRefusal(
				await deleteMedia(contributor, adminMedia.mediaId!),
				"contributor removing administrator-owned media",
			);

			// The refusals changed nothing: the draft is still a live draft.
			const after = statusOfItem(nativeItemOf(await readEntry(contributor, PAGES_COLLECTION, draft.entryId!)));
			expect(after, "the refused lifecycle operations must leave the draft intact").toBe("draft");
		},
	);
});

// ---------------------------------------------------------------------------
// Author (30): own/others boundary and direct publishing (FR-021/FR-022)
// ---------------------------------------------------------------------------

test("author: publishes and unpublishes own incomplete draft directly with no approval step, and is refused on others' content", async () => {
	const fixture = gateRoleFixture();
	gatePages();

	// An administrator-owned draft: another author's content.
	const others = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("author-others") },
	});
	expect(others.result.ok, "the administrator-owned draft fixture must save").toBe(true);

	await withNativeRole(admin, fixture, NATIVE_ROLES.author, async (author: CmsActor) => {
		// Own title-only draft — every optional value omitted — published
		// DIRECTLY: publish_own sits at Author (30) and the native path has
		// no article review, approval queue or confirmation step (07 §3).
		const own = await createSyntheticEntry(author, PAGES_COLLECTION, {
			data: { title: uniqueTitle("author-own") },
		});
		expect(own.result.ok, "the author's own draft fixture must save").toBe(true);
		const published = await publishEntry(author, PAGES_COLLECTION, own.entryId!);
		expect(
			published.ok,
			"an Author must publish their own natively valid incomplete draft directly, with no other person's approval",
		).toBe(true);
		const publishedItem = nativeItemOf(published);
		expect(statusOfItem(publishedItem), "the published read-back must show the published state").toBe(
			"published",
		);
		expect(
			typeof publishedItem?.publishedAt === "string",
			"the published read-back must record a native publishedAt",
		).toBe(true);
		expect(
			instantOf(publishedItem?.scheduledAt),
			"a direct publish carries no scheduled time",
		).toBeNull();

		// Others' content: publish_any sits at Editor (40).
		expectForbiddenRefusal(
			await publishEntry(author, PAGES_COLLECTION, others.entryId!),
			"author publishing another account's draft",
		);
		expectForbiddenRefusal(
			await unpublishEntry(author, PAGES_COLLECTION, others.entryId!),
			"author unpublishing another account's draft",
		);
		expectForbiddenRefusal(
			await trashEntry(author, PAGES_COLLECTION, others.entryId!),
			"author trashing another account's draft",
		);

		// Unpublish of the OWN entry: the public version is removed while the
		// editable information remains (US6.4 / FR-022).
		const unpublished = await unpublishEntry(author, PAGES_COLLECTION, own.entryId!);
		expect(unpublished.ok, "an Author must unpublish their own content").toBe(true);
		const readBack = await readEntry(author, PAGES_COLLECTION, own.entryId!);
		expect(readBack.ok, "the unpublished entry must remain readable/editable").toBe(true);
		expect(statusOfItem(nativeItemOf(readBack)), "unpublish must return the entry to draft").toBe(
			"draft",
		);
	});
});

// ---------------------------------------------------------------------------
// Media-removal authority (30/40) — a separate native permission family
// ---------------------------------------------------------------------------

test("author: native media removal is ownership-bound — own media deletable, others' refused", async () => {
	const fixture = gateRoleFixture();

	// An administrator-owned media fixture (someone else's asset).
	const adminMedia = await uploadSyntheticMedia(admin);
	expect(adminMedia.result.ok, "the synthetic fixture media upload must succeed").toBe(true);

	await withNativeRole(admin, fixture, NATIVE_ROLES.author, async (author: CmsActor) => {
		// media:upload sits at Contributor (20): an Author registers an own
		// asset through the native media API.
		const own = await uploadSyntheticMedia(author);
		expect(own.result.ok, "the author's synthetic media upload must succeed").toBe(true);
		expect(own.mediaId, "the own media id must come from the native response").toBeTruthy();

		// Own asset: media:delete_own (30) + ownership allows removal.
		const removed = await deleteMedia(author, own.mediaId!);
		expect(
			removed.ok,
			"an Author must remove their OWN media (the native media-removal authority is separate from content purge)",
		).toBe(true);

		// Someone else's asset: media:delete_any sits at Editor (40).
		expectForbiddenRefusal(
			await deleteMedia(author, adminMedia.mediaId!),
			"author removing another account's media",
		);
		// The refused removal left the asset in place.
		const stillThere = await readMediaAuthoritative(adminMedia.mediaId!);
		expect(stillThere, "the refused media removal must leave the asset readable").toBe(true);
	});
});

/** Read-side check that a media fixture is still present (admin read). */
async function readMediaAuthoritative(mediaId: string): Promise<boolean> {
	const read = await cmsRequest(admin, `/_emdash/api/media/${encodeURIComponent(mediaId)}`);
	return read.ok;
}

// ---------------------------------------------------------------------------
// Editor (40): others' content and the administrator boundary
// ---------------------------------------------------------------------------

test("editor: publishes and manages others' content directly, and is refused the administrator-only purge and users administration", async () => {
	const fixture = gateRoleFixture();
	gatePages();

	// An administrator-owned draft: another account's content.
	const others = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("editor-others") },
	});
	expect(others.result.ok, "the administrator-owned draft fixture must save").toBe(true);

	await withNativeRole(admin, fixture, NATIVE_ROLES.editor, async (editor: CmsActor) => {
		// Direct publish of ANOTHER account's draft: publish_any (40) acts
		// immediately — no article review, approval or confirmation exists
		// anywhere in the native path (07 §3).
		const published = await publishEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(
			published.ok,
			"an Editor must publish another account's natively valid draft directly, with no approval step",
		).toBe(true);
		expect(statusOfItem(nativeItemOf(published)), "the published read-back must show the published state").toBe(
			"published",
		);

		// Unpublish of others' content (the same own/any publish permission).
		const unpublished = await unpublishEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(unpublished.ok, "an Editor must unpublish another account's content").toBe(true);

		// Trash and restore of others' content: delete_any (40) and
		// edit_any (40) — the reversible ordinary deletion path (FR-025).
		const trashed = await trashEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(trashed.ok, "an Editor must trash another account's content").toBe(true);
		const ordinaryRead = await readEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(
			ordinaryRead.status === 404,
			"a trashed entry must disappear from the ordinary read (the native trash listing, not this case, reconciles state)",
		).toBe(true);
		const restored = await restoreEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(restored.ok, "an Editor must restore the trashed content").toBe(true);
		const back = await readEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(back.ok, "the restored entry must be readable again").toBe(true);

		// The administrator boundary: permanent deletion (50) and users
		// administration (50) refuse an Editor flat out.
		expectForbiddenRefusal(
			await permanentlyDeleteEntry(editor, PAGES_COLLECTION, others.entryId!),
			"editor permanent deletion (content:delete_permanent is Administrator-only)",
		);
		expectForbiddenRefusal(
			await listUsers(editor),
			"editor listing users (users:read is Administrator-only)",
		);
		// The refused purge left the entry restored-and-live, not deleted.
		const stillLive = await readEntry(editor, PAGES_COLLECTION, others.entryId!);
		expect(stillLive.ok, "the refused permanent deletion must leave the restored entry live").toBe(true);
	});
});

test("editor: media removal of another account's asset succeeds at editor level (the separate native media authority)", async () => {
	const fixture = gateRoleFixture();

	// An administrator-owned media fixture: NOT the editor's asset.
	const adminMedia = await uploadSyntheticMedia(admin);
	expect(adminMedia.result.ok, "the synthetic fixture media upload must succeed").toBe(true);

	await withNativeRole(admin, fixture, NATIVE_ROLES.editor, async (editor: CmsActor) => {
		const removed = await deleteMedia(editor, adminMedia.mediaId!);
		expect(
			removed.ok,
			"an Editor must remove another account's media: media:delete_any (40) — media removal is its own native authority, neither administrator-only nor trash-first",
		).toBe(true);
		// The removal is proven by the read-side 404 (current state, not the
		// request alone).
		const gone = await cmsRequest(
			admin,
			`/_emdash/api/media/${encodeURIComponent(adminMedia.mediaId!)}`,
		);
		expect(gone.status, "the removed media must read back 404").toBe(404);
	});
});

// ---------------------------------------------------------------------------
// Administrator (50): trash-first permanent deletion and users read
// ---------------------------------------------------------------------------

test("administrator: permanent content deletion is trash-first and administrator-only, and users administration is an administrator boundary", async () => {
	gatePages();

	// The users listing is the administrator-reserved read this file relies
	// on for fixture orchestration (the Editor-level refusal is above).
	const users = await listUsers(admin);
	expect(users.ok, "the development Administrator must read the native users listing").toBe(true);
	expect(
		Array.isArray(nativeDataOf(users)?.items),
		"the users listing must return its documented items array",
	).toBe(true);

	// A live (not-yet-trashed) fixture: the native purge path refuses it EVEN
	// FOR an Administrator — permanent deletion requires the already-trashed
	// precondition (FR-025; the handler returns NOT_FOUND for a live row).
	const live = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("purge-live") },
	});
	expect(live.result.ok, "the live purge-precondition fixture must save").toBe(true);
	const livePurge = await permanentlyDeleteEntry(admin, PAGES_COLLECTION, live.entryId!);
	expect(
		livePurge.ok,
		"an Administrator's permanent deletion of a LIVE entry must be refused (trash-first precondition)",
	).toBe(false);
	expect(
		livePurge.status,
		"the trash-first refusal is the native NOT_FOUND family (the purge path sees a live row as not purgeable)",
	).toBe(404);
	expect(
		nativeErrorOf(livePurge)?.code,
		"the trash-first refusal must carry the native NOT_FOUND code",
	).toBe("NOT_FOUND");
	const stillLive = await readEntry(admin, PAGES_COLLECTION, live.entryId!);
	expect(stillLive.ok, "the refused purge must leave the live entry in place").toBe(true);

	// Trash first, then the administrator-only purge succeeds — and the
	// deletion is proven through BOTH the ordinary read and the native trash
	// listing (an ordinary 404 alone cannot distinguish "deleted" from
	// "sitting in Trash"; the T002 trash-aware reconciliation supplies it).
	const trashed = await trashEntry(admin, PAGES_COLLECTION, live.entryId!);
	expect(trashed.ok, "the ordinary deletion path must trash the entry first").toBe(true);
	const purged = await permanentlyDeleteEntry(admin, PAGES_COLLECTION, live.entryId!);
	expect(purged.ok, "the Administrator's trash-first permanent deletion must succeed").toBe(true);
	const afterPurge = await readEntry(admin, PAGES_COLLECTION, live.entryId!);
	expect(afterPurge.status, "the purged entry must be absent from the ordinary read").toBe(404);
	expect(
		await findTrashedEntry(admin, PAGES_COLLECTION, live.entryId!),
		"the purged entry must ALSO be proven absent from the native trash listing (genuinely deleted, not soft-deleted)",
	).toBe("not-in-trash");
});

// ---------------------------------------------------------------------------
// Disabled account (US6.7): authorization-layer refusal with verified
// restoration
// ---------------------------------------------------------------------------

test("disabled account: direct requests are refused by the authorization layer, and restoration is verified by re-read", async () => {
	const fixture = gateRoleFixture();
	gatePages();

	// The fixture account must start enabled (its verified live /auth/me in
	// beforeAll already proved the credential works).
	const before = nativeItemOf(await getUser(admin, fixture.userId));
	expect(before?.disabled, "the fixture account must start enabled").toBe(false);

	// A draft owned by the development Administrator: the disabled
	// credential's direct publish attempt must be refused by the
	// AUTHORIZATION LAYER before any ownership, role or validation logic —
	// whichever role the fixture account holds.
	const target = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("disabled-target") },
	});
	expect(target.result.ok, "the disabled-phase target draft must save").toBe(true);

	// A marker revision token: the disabled-phase publish control supplies a
	// `_rev` explicitly so the T002 helper performs NO pre-request read (the
	// read itself would be the 401) — the refusal under test is the request's.
	const disabledPhaseControlRev = "authorization-layer-control";

	// The disable is marked ATTEMPTED before its request is sent, and the
	// restoration reconciles by OBSERVED state — never by a committed flag: a
	// request that errors or loses its response after committing must still
	// be reconciled (corrective round 1, F2). runPhaseWithRestoration keeps
	// the PRIMARY failure evidence alongside any restoration failure instead
	// of letting the restoration error replace it (corrective round 2,
	// R2-F2).
	let disableAttempted = false;
	await runPhaseWithRestoration(
		async () => {
			disableAttempted = true;
			const disable = await cmsRequest(
				admin,
				`/_emdash/api/admin/users/${encodeURIComponent(fixture.userId)}/disable`,
				{ method: "POST" },
			);
			expect(
				disable.ok,
				"the supported native disable operation must succeed for the distinct test-owned fixture account (never the shared Administrator)",
			).toBe(true);

			const observed = nativeItemOf(await getUser(admin, fixture.userId));
			expect(observed?.disabled, "the native user record must read back disabled").toBe(true);

			// The live credential: every request resolves the owning user record,
			// so the disabled account's PAT is INVALID_TOKEN 401 — regardless of
			// the account's role or the target's ownership (US6.7).
			expectDisabledTokenRefusal(
				await getMe(fixture),
				"disabled account identity read",
			);
			expectDisabledTokenRefusal(
				await publishEntry(fixture, PAGES_COLLECTION, target.entryId!, {
					rev: disabledPhaseControlRev,
				}),
				"disabled account direct publish",
			);

			// The target was untouched by the refused request.
			const targetIntact = statusOfItem(nativeItemOf(await readEntry(admin, PAGES_COLLECTION, target.entryId!)));
			expect(targetIntact, "the refused disabled-account publish must leave the target a draft").toBe(
				"draft",
			);
		},
		async () => {
			if (!disableAttempted) {
				return;
			}
			// State-driven restoration of the test-owned account: repairs the
			// disabled state and any role drift back to the CAPTURED original,
			// verifies everything by re-read (administrative record + live
			// /auth/me at data.role), attempts every step, and reports any
			// combined failures after all attempts (F1/F2).
			await reconcileFixtureAccountState();
		},
	);
});

// ---------------------------------------------------------------------------
// Unauthenticated control (US6.1/US6.7): the trusted boundary, not validation
// ---------------------------------------------------------------------------

test("unauthenticated lifecycle requests are authorization refusals, never validation outcomes", async () => {
	gatePages();

	// One unauthenticated create to the same native endpoint with a VALID
	// body: only the authorization layer can refuse it (the accepted
	// T003/T007 control shape). The URL is built from the actor's origin —
	// the runner-configured origin the actor was pinned to in beforeAll; no
	// credential is sent, so nothing can leave the configured app.
	const url = new URL(`/_emdash/api/content/${PAGES_COLLECTION}`, `${admin.baseUrl}/`);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data: { title: uniqueTitle("unauthenticated") } }),
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
		"an unauthenticated native request must be refused by the authorization layer (401/403)",
	).toBe(true);
	expect(result.ok, "an unauthenticated native request must not be reported as success").toBe(false);
	const error = result.body as { error?: { code?: unknown } };
	expect(
		error?.error?.code,
		"the authorization refusal must carry its native error code",
	).toBeTruthy();
	expect(
		error?.error?.code,
		"an authorization refusal must not be mistaken for a validation refusal",
	).not.toBe("VALIDATION_ERROR");
});

// ---------------------------------------------------------------------------
// Applicable current-`_rev` preconditions (US6.5 slice; depth is T020)
// ---------------------------------------------------------------------------

test("stale _rev: publish and schedule refuse a stale revision token, and a re-read retry succeeds", async () => {
	gatePages();

	// Publish control: capture a `_rev`, invalidate it with a newer write,
	// then attempt the lifecycle action with the stale token — newer work is
	// never silently overwritten.
	const first = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("stale-publish") },
	});
	expect(first.result.ok, "the stale-rev publish fixture must save").toBe(true);
	const staleRev = await currentRev(admin, PAGES_COLLECTION, first.entryId!);
	const newer = await updateEntry(admin, PAGES_COLLECTION, first.entryId!, {
		data: { title: uniqueTitle("stale-publish-bumped") },
	});
	expect(newer.ok, "the newer write that invalidates the token must succeed").toBe(true);
	expectConflictRefusal(
		await publishEntry(admin, PAGES_COLLECTION, first.entryId!, { rev: staleRev }),
		"publishing with a stale _rev",
	);
	// The re-read discipline: refresh the precondition from current state,
	// then the retry succeeds (US6.6).
	const retried = await publishEntry(admin, PAGES_COLLECTION, first.entryId!);
	expect(
		retried.ok,
		"re-reading the current state and retrying with a fresh _rev must succeed",
	).toBe(true);

	// Schedule control: the same precondition applies to scheduling.
	const second = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("stale-schedule") },
	});
	expect(second.result.ok, "the stale-rev schedule fixture must save").toBe(true);
	const staleScheduleRev = await currentRev(admin, PAGES_COLLECTION, second.entryId!);
	const newerSecond = await updateEntry(admin, PAGES_COLLECTION, second.entryId!, {
		data: { title: uniqueTitle("stale-schedule-bumped") },
	});
	expect(newerSecond.ok, "the newer write that invalidates the token must succeed").toBe(true);
	expectConflictRefusal(
		await scheduleEntry(
			admin,
			PAGES_COLLECTION,
			second.entryId!,
			isoWithBangkokOffset(new Date(Date.now() + SCHEDULE_ACCEPTANCE_OFFSET_MS)),
			{ rev: staleScheduleRev },
		),
		"scheduling with a stale _rev",
	);
});

// ---------------------------------------------------------------------------
// Scheduling: explicit offset, optional omissions, native time guard
// ---------------------------------------------------------------------------

test("scheduling: an explicit-offset future time is accepted for an incomplete draft and read back; a non-future time is a native validation refusal", async () => {
	gatePages();

	// A title-only draft — every optional value omitted — accepted for
	// scheduling with no completeness predicate anywhere in the native path.
	const draft = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("schedule-acceptance") },
	});
	expect(draft.result.ok, "the title-only scheduling fixture must save").toBe(true);

	const scheduledFor = isoWithBangkokOffset(new Date(Date.now() + SCHEDULE_ACCEPTANCE_OFFSET_MS));
	const scheduled = await scheduleEntry(admin, PAGES_COLLECTION, draft.entryId!, scheduledFor);
	expect(
		scheduled.ok,
		"native Schedule must accept a natively valid incomplete draft with an explicit-offset future time (no article review or completeness hook)",
	).toBe(true);
	const scheduledItem = nativeItemOf(scheduled);
	expect(
		statusOfItem(scheduledItem),
		"an unpublished scheduled entry must hold the native scheduled status",
	).toBe("scheduled");
	expect(
		instantOf(scheduledItem?.scheduledAt),
		"the read-back scheduled time must be the SAME instant as the submitted +07:00 time",
	).toBe(Date.parse(scheduledFor));
	expect(
		instantOf(scheduledItem?.publishedAt),
		"a scheduled entry must not be published yet",
	).toBeNull();

	// The native time guard: a non-future explicit-offset time is refused as
	// field-level validation — truthfully, with no false success (SC-006).
	const past = isoWithBangkokOffset(new Date(Date.now() - 60 * 60 * 1000));
	expectNonFutureScheduleRefusal(
		await scheduleEntry(admin, PAGES_COLLECTION, draft.entryId!, past),
		"scheduling a non-future time",
	);

	// Native unschedule clears the scheduled time (draft/scheduled → draft)
	// and the entry stays unpublished throughout.
	const unscheduled = await unscheduleEntry(admin, PAGES_COLLECTION, draft.entryId!);
	expect(unscheduled.ok, "the native unschedule must succeed").toBe(true);
	const after = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, draft.entryId!));
	expect(statusOfItem(after), "unschedule must return a draft entry to draft").toBe("draft");
	expect(instantOf(after?.scheduledAt), "unschedule must clear the scheduled time").toBeNull();
	expect(instantOf(after?.publishedAt), "the entry must never have been published").toBeNull();
});

/**
 * Validate the timing of one pre-due observation against the due instant
 * (corrective round 2, R2-F3): a sample (or the unschedule request) taken
 * at/after due is NO LONGER pre-due evidence — an at-due publication
 * observed there is CORRECT behavior and must never be mislabeled an
 * early-publication violation. The honest outcome is "overran": the
 * observation window was missed, so the case's evidence is inconclusive and
 * must be reported as its own failure, not interpreted. Pure and
 * synchronous.
 */
function evaluatePreDueTiming(
	observedAt: number,
	dueAt: number,
): { outcome: "in-window" | "overran"; detail: string } {
	if (observedAt >= dueAt) {
		return {
			outcome: "overran",
			detail: `observation taken at ${observedAt} is not before the due instant ${dueAt} — the pre-due window was missed, so this evidence is inconclusive and is reported as an overrun (an at-due publication observed here would be correct behavior, not an early publication)`,
		};
	}
	return { outcome: "in-window", detail: "observation is strictly before the due instant" };
}

/**
 * Assert an instant is still strictly before due, throwing the honest
 * overrun/inconclusive report otherwise (corrective round 3, R3-F3). Used
 * both as the pre-request gate (kept from round 2) and as the completion
 * gate immediately after each awaited operation in the pre-due case.
 */
function expectPreDueInstant(instant: number, dueAt: number, label: string): void {
	const timing = evaluatePreDueTiming(instant, dueAt);
	if (timing.outcome !== "in-window") {
		throw new Error(`${label}: ${timing.detail}`);
	}
}

/**
 * Decide one pre-due observation from its COMPLETION timing (corrective
 * round 3, R3-F3): a read may START strictly before due and still COMPLETE
 * at/after it, in which case it observed the post-due world — where
 * publication is CORRECT behavior — so the only honest outcome is
 * "inconclusive", never an early-publication verdict:
 * - "inconclusive" — the response completed at/after due: report the
 *   overrun; the state is NOT interpreted;
 * - "early-violation" — completed strictly before due AND publication
 *   observed (status "published" or a parseable publishedAt): a genuine
 *   no-early-publication violation;
 * - "on-schedule" — completed strictly before due with no publication.
 * Pure and synchronous.
 */
function evaluatePreDueSample(
	completedAt: number,
	dueAt: number,
	status: string | undefined,
	publishedAt: unknown,
): { outcome: "on-schedule" | "early-violation" | "inconclusive"; detail: string } {
	const timing = evaluatePreDueTiming(completedAt, dueAt);
	if (timing.outcome !== "in-window") {
		return {
			outcome: "inconclusive",
			detail: `the read response completed at ${completedAt} — ${timing.detail}`,
		};
	}
	if (status === "published" || instantOf(publishedAt) !== null) {
		return {
			outcome: "early-violation",
			detail: `publication observed strictly before the due instant (status "${status ?? "unknown"}"${instantOf(publishedAt) !== null ? ", publishedAt recorded" : ""}) — a no-early-publication violation that must fail this case`,
		};
	}
	return { outcome: "on-schedule", detail: "no publication observed strictly before the due instant" };
}

test("scheduling: nothing is published before the scheduled time (bounded pre-due observation, then native unschedule)", async () => {
	gatePages();
	// Two pre-due samples strictly inside a 90 s window; this case never
	// waits past due, so it can never observe — let alone force — a
	// publication, and it ends by unscheduling natively. Every read and the
	// unschedule are CLOCK-VALIDATED against the due instant BOTH before the
	// request and immediately after the response completes, before any state
	// is interpreted (corrective rounds 2–3, R2-F3/R3-F3): a timing overrun
	// is reported honestly as an overrun, never misread as an
	// early-publication violation.
	test.setTimeout(120_000);

	const draft = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("no-early") },
	});
	expect(draft.result.ok, "the no-early fixture must save").toBe(true);

	const dueAt = Date.now() + NO_EARLY_DUE_MS;
	const scheduledFor = isoWithBangkokOffset(new Date(dueAt));
	const scheduled = await scheduleEntry(admin, PAGES_COLLECTION, draft.entryId!, scheduledFor);
	expect(scheduled.ok, "the future explicit-offset schedule must be accepted").toBe(true);

	for (let sample = 1; sample <= 2; sample += 1) {
		await sleep(NO_EARLY_SAMPLE_GAP_MS);
		// Pre-request gate (kept): fail fast when the sleep already overran.
		expectPreDueInstant(Date.now(), dueAt, `pre-due sample ${sample} before its read`);
		const read = await readEntry(admin, PAGES_COLLECTION, draft.entryId!);
		expect(read.ok, `pre-due sample ${sample}: the scheduled entry must be readable`).toBe(true);
		const item = nativeItemOf(read);
		// Completion gate (corrective round 3, R3-F3): a read that STARTED
		// before due may COMPLETE at/after it — only the response's
		// completion time decides whether the observed state is pre-due
		// evidence. A crossing/reaching read reports the inconclusive
		// overrun and its state is NEVER interpreted (an at-due publication
		// there is correct behavior, never an "early" violation); a read
		// completed strictly before due that shows publication is a genuine
		// early-publication violation.
		const verdict = evaluatePreDueSample(
			Date.now(),
			dueAt,
			statusOfItem(item),
			item?.publishedAt,
		);
		expect(
			verdict.outcome === "on-schedule",
			`pre-due sample ${sample}: ${verdict.outcome} — ${verdict.detail}`,
		).toBe(true);
	}

	// End the case BEFORE due. The unschedule keeps its pre-request gate and
	// gains a completion gate (R3-F3): an unschedule whose response crosses
	// due may have raced the scheduler's at-due publication, so the honest
	// outcome is the explicit inconclusive-window report — never an
	// unconditional draft assertion. The final state read is gated the same
	// way before its state is interpreted.
	expectPreDueInstant(Date.now(), dueAt, "unschedule before its request");
	const unscheduled = await unscheduleEntry(admin, PAGES_COLLECTION, draft.entryId!);
	expect(unscheduled.ok, "the native unschedule must succeed").toBe(true);
	expectPreDueInstant(Date.now(), dueAt, "unschedule completed");
	const afterRead = await readEntry(admin, PAGES_COLLECTION, draft.entryId!);
	expect(afterRead.ok, "the post-unschedule state read must succeed").toBe(true);
	expectPreDueInstant(Date.now(), dueAt, "final state read completed");
	const after = nativeItemOf(afterRead);
	expect(statusOfItem(after), "the unscheduled entry must be a draft again").toBe("draft");
});

// ---------------------------------------------------------------------------
// Scheduling: actual native due-time execution (FR-023 / SC-006)
// ---------------------------------------------------------------------------

/** One bounded-observation sample of the scheduled entry's current state. */
interface DueTimeSample {
	/** Epoch ms when the sample was taken (after its preceding sleep). */
	at: number;
	/** The observed native lifecycle status, when the read succeeded. */
	status?: string;
}

/** The bounded observation window the due-time case samples inside. */
interface DueTimeWindow {
	/** Epoch ms when the schedule request was initiated. */
	commitAt: number;
	/** Epoch ms the entry was scheduled for (the due instant). */
	dueAt: number;
	/** Epoch ms after which observation stops (due + budget). */
	deadline: number;
	/** The poll interval (one sleep may cross the deadline before its sample lands). */
	pollIntervalMs: number;
}

/**
 * Decide a due-time observation truthfully (corrective rounds 1 F3 and 2
 * R2-F3). The intended `publishedAt` alone does NOT prove the scheduler
 * waited until due, so the decision is made from the OBSERVATION TIMELINE —
 * validating the COMPLETE collected timeline before any acceptance, not
 * just the first published sample:
 * - first, EVERY sample must sit inside the observation window (each
 *   at/after the schedule commit and not beyond deadline + one poll
 *   interval) — any out-of-window sample, wherever it falls, is a
 *   "window-violation": the timeline cannot be trusted to prove anything;
 * - then the FIRST published sample decides: before the due instant →
 *   "rejected-early" (a no-early-publication violation that must FAIL the
 *   case — the intended publishedAt of an early publication proves
 *   nothing); at/after it → "accepted";
 * - no published sample at all → "overdue": the truthful native
 *   failure/overdue observation, also a failure.
 * Pure and synchronous; the read-only bounded observation loop below stops
 * at the decisive published sample and defers every decision to this
 * evaluator over everything actually collected.
 */
function evaluateDueTimeObservation(
	samples: readonly DueTimeSample[],
	window: DueTimeWindow,
): { outcome: "accepted" | "rejected-early" | "overdue" | "window-violation"; detail: string } {
	const windowSlack = window.pollIntervalMs;
	const at = (instant: number): string => `+${Math.round((instant - window.commitAt) / 100) / 10}s from commit`;
	// Complete-timeline validation FIRST (R2-F3): an out-of-window sample
	// invalidates the timeline even when it follows a valid published one.
	for (const sample of samples) {
		if (sample.at < window.commitAt || sample.at > window.deadline + windowSlack) {
			return {
				outcome: "window-violation",
				detail: `sample at ${at(sample.at)} falls outside the observation window [commit, deadline + one poll interval] — the complete timeline cannot be trusted to prove the publication waited until due`,
			};
		}
	}
	for (const sample of samples) {
		if (sample.status === "published") {
			if (sample.at < window.dueAt) {
				return {
					outcome: "rejected-early",
					detail: `publication observed at ${at(sample.at)}, STRICTLY BEFORE the due instant ${at(window.dueAt)} — a no-early-publication violation that never satisfies this case`,
				};
			}
			return {
				outcome: "accepted",
				detail: `publication observed at ${at(sample.at)}, at/after the due instant ${at(window.dueAt)}, with all ${samples.length} collected samples validated inside the observation window`,
			};
		}
	}
	const lastSample = samples.at(-1);
	return {
		outcome: "overdue",
		detail:
			samples.length === 0
				? "no sample was taken inside the observation window"
				: `no publication observed by the deadline; last sample at ${at(lastSample!.at)} observed status "${String(lastSample!.status ?? "unknown")}"`,
	};
}

test("scheduling: the native scheduler publishes at the due time (bounded observation, current-state assertion)", async () => {
	gatePages();
	// The budget exceeds the verified ≤60 s native sweep cadence by a wide
	// margin; the timeout carries slack beyond it.
	test.setTimeout(DUE_TIME_OBSERVATION_BUDGET_MS + 120_000);

	// A title-only draft scheduled shortly ahead: the actual due-time
	// publication must come from the platform's own scheduler through the
	// native publishing path — nothing here substitutes a scheduler, hook or
	// retry manager, and the observation below only READS current state.
	const draft = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("due-time") },
	});
	expect(draft.result.ok, "the due-time fixture must save").toBe(true);

	const commitAt = Date.now();
	const dueAt = commitAt + DUE_TIME_OFFSET_MS;
	const scheduledFor = isoWithBangkokOffset(new Date(dueAt));
	const scheduled = await scheduleEntry(admin, PAGES_COLLECTION, draft.entryId!, scheduledFor);
	expect(scheduled.ok, "the short-future explicit-offset schedule must be accepted").toBe(true);
	const scheduledInstant = instantOf(nativeItemOf(scheduled)?.scheduledAt);
	expect(scheduledInstant, "the scheduled time must read back as the submitted instant").toBe(
		Date.parse(scheduledFor),
	);

	// Bounded observation: poll current state, recording each sample with its
	// timestamp, STOPPING at the decisive published sample. Reads only — no
	// retry, no substitution; the evaluator below validates the COMPLETE
	// collected timeline (including rejecting a publication observed before
	// the due instant, and any out-of-window sample) before any acceptance.
	const deadline = dueAt + DUE_TIME_OBSERVATION_BUDGET_MS;
	const samples: DueTimeSample[] = [];
	let lastItem: Record<string, unknown> | undefined;
	while (Date.now() < deadline) {
		await sleep(DUE_TIME_POLL_INTERVAL_MS);
		const read = await readEntry(admin, PAGES_COLLECTION, draft.entryId!);
		expect(
			read.ok,
			"each observation sample must read the entry successfully (a read failure is a reported failure, never skipped)",
		).toBe(true);
		lastItem = nativeItemOf(read);
		samples.push({ at: Date.now(), status: statusOfItem(lastItem) });
		if (statusOfItem(lastItem) === "published") {
			// Decisive sample reached: stop collecting here so the validated
			// timeline is exactly what was observed up to publication.
			break;
		}
	}

	const verdict = evaluateDueTimeObservation(samples, {
		commitAt,
		dueAt,
		deadline,
		pollIntervalMs: DUE_TIME_POLL_INTERVAL_MS,
	});
	expect(
		verdict.outcome === "accepted",
		`the native scheduler must publish the entry at the due time within the bounded observation — ${verdict.outcome}: ${verdict.detail}`,
	).toBe(true);

	// The current-state publication assertion on the accepted sample's item:
	// published, the scheduled time cleared, and the FIRST scheduled
	// publication recording the intended scheduled time as publishedAt (the
	// pinned scheduler behavior).
	expect(
		instantOf(lastItem?.scheduledAt),
		"a completed due-time publication must clear the scheduled time",
	).toBeNull();
	expect(
		instantOf(lastItem?.publishedAt),
		"the first scheduled publication must record the INTENDED scheduled time as publishedAt (not the sweep time)",
	).toBe(Date.parse(scheduledFor));
	expect(
		statusOfItem(lastItem),
		"the accepted observation must be the published current state",
	).toBe("published");
});
