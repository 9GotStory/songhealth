// T031 — compact native Admin maintenance smoke for the Feature 002 CMS
// content model (US7): one representative editor journey through the NATIVE
// EmDash Admin UI with understandable Thai collection/field labels and the
// platform's correct English fallback — ordinary list + available
// search/status filter, finding and reopening an existing task-owned entry,
// the applicable native media/reference/taxonomy selectors plus the native
// activities.gallery repeater, selecting and reusing task-owned native
// fixtures, an explicit Save, one real native validation error surfaced
// readably and corrected, and the domain date kept separate from publication
// state and system metadata. Test support in tests/browser/ only: no
// application, schema, seed, dependency, infrastructure, or production
// change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T031 ("Author a compact native Admin
//   maintenance smoke in tests/browser/cms-editor.spec.ts using T002
//   development access and representative existing fixtures: recognize
//   labels, find/reopen/select/reuse and correct one agreed native
//   validation error; reuse native controls and available
//   search/filter/pagination, with no production Passkey ceremony or
//   repetition of every API fixture in browser UI") and its T030 dependency
//   edge, under the bounded Product Owner authorization of 2026-10-24
//   (GitHub issue #26 comment 6377440215): T031 authors test source ONLY —
//   static checks and Playwright --list discovery; no live browser/runtime
//   execution, no helper/seed/config/accepted-test change, no T032 dispatch.
//   T032 separately runs this smoke with actual staff evidence; this file
//   claims no SC-007 PASS and no staff comprehension
// - specs/002-cms-content-model/spec.md — User Story 7 (staff recognize,
//   find, select/reuse and correct retained records through native Admin),
//   FR-026 (native required/type/value validation returns truthful
//   outcomes; no Songhealth completeness hook), FR-029 ("Staff MUST maintain
//   content with understandable Thai content/field labels, ordinary CMS
//   lists and available search/filter/pagination/bulk
//   operations/reusable selectors. Correct English platform fallback is
//   permitted; no replacement Admin is required"), FR-030 (domain dates
//   stay separate from system metadata), SC-007 (staff demonstrate the
//   journeys — pending until actual staff evidence exists)
// - specs/002-cms-content-model/data-model.md — the applied model's Thai
//   collection labels (health_services หน่วยบริการสุขภาพ, services บริการ,
//   announcements ประกาศ), field labels (health_services title ชื่อทางการ
//   S, image ภาพหน่วยบริการ O, offered_services บริการที่ให้ O; services
//   title ชื่อบริการ S, external_url ลิงก์บริการภายนอก url O;
//   announcements announcement_at วันที่ประกาศ O), the facility_type /
//   area taxonomies attached to health_services with intentionally EMPTY
//   term inventories pending authoritative sources, and the single
//   facility_services reciprocal edge set behind offered_services
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes", latest `_rev` preconditions, truthful native outcomes
// - docs/website-modernization-docs/current/05-admin-cms.md §1 (use the
//   CMS, do not rebuild the CMS), §3 (editor baseline: explicit Save,
//   preview, taxonomy/relation selectors, media picker, native validation
//   only), §4 (native lists with search/filter/pagination as baseline; no
//   custom list framework), §5 (native Media Library baseline), §12
//   (collection/field labels in understandable Thai; platform
//   localization where available; untranslated platform strings MAY fall
//   back to English in V1; no Admin UI fork just to translate), §13
//   (extension gate — no custom Admin component is created here)
// - docs/website-modernization-docs/current/06-roles-permissions.md §7 (no
//   super-admin/override role; native permission boundaries untouched) and
//   10-system-blueprint.md §21 (test Songhealth configuration and
//   assumptions, not EmDash internals)
// - specs/002-cms-content-model/evidence/T030-us4-facilities.md — the
//   accepted T030 apply/verification join that put health_services,
//   facility_services and facility_type on the shared runtime; this file
//   gates on that schema readably and skips (never fabricates) if it is
//   absent on the runtime it faces
// - tests/browser/cms.helpers.ts — the accepted T002 helpers this file
//   consumes: the mode-0600 development-credential PAT actor
//   (loadDevAccessToken + createPatActor), synthetic entries/media with
//   owned-fixture registry cleanup, secret-redacted results. API FIXTURE
//   PREPARATION ONLY: a PAT cannot establish a browser session (see
//   "Authentication and session truth" below), so every browser-evidenced
//   step below runs in the real native Admin UI
// - tests/browser/foundation.spec.ts — the accepted T010 Admin availability
//   boundary (the two native unauthenticated outcomes are /_emdash/admin/
//   setup and /_emdash/admin/login; passkey login is never automated) and
//   tests/browser/cms-facilities.spec.ts — the accepted T027 pattern
//   (schema-readiness gating with explicit prerequisite skips, synthetic
//   taxonomy terms through the native term API with per-registration
//   OWNERSHIP classification and a trusted-tree identity guard, failure-safe
//   owned-fixture teardown, the runner-configured origin) this file follows
//
// Verified UI/auth surface (recorded per AGENTS.md §External Documentation;
// checked first through Context7 — /websites/emdashcms for unversioned
// orientation and /microsoft/playwright v1.63.0 for Playwright semantics —
// then against the pinned `emdash@1.1.0` / `@emdash-cms/admin@1.1.0` dist
// sources installed by the lockfile-exact `npm ci` under node_modules (the
// same package-lock.json integrity sha512-VXo1fIMr44PEiE1A9Z5aFWvjs
// qhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg== the T002
// helpers record):
// - Admin SPA routes (dist/index.js createAdminRouter): /content/$collection
//   (list), /content/$collection/$id (entry editor), /login, plus /media;
//   the unauthenticated Admin outcomes are exactly the two foundation.spec
//   accepts (setup / login)
// - localization: the admin shell resolves the locale server-side per
//   request (emdash-locale cookie → Accept-Language → en,
//   @emdash-cms/admin dist/locales/config.js resolveLocale) and renders
//   <html lang={resolvedLocale}>; the NATIVE locale switcher persists
//   exactly `emdash-locale=<code>; Path=/_emdash` (dist
//   LocaleDirectionProvider-*.js), and `th` is a fully bundled locale
//   (dist/locales/th/messages.mjs, 3184 messages). This file selects Thai
//   through that same native cookie mechanism — ordinary browser-side
//   configuration, not an Admin fork or a translation layer
// - Thai platform chrome asserted below (th/messages.mjs ids): the list
//   search aria-label "ค้นหา {collectionLabel}" (vvZIY6) and placeholder
//   "ค้นหา {label}..." (FpEIAP); the status filter "กรองตามสถานะ" (KwybLi)
//   with the "ฉบับร่าง" Draft option (eneWvv); Save states
//   บันทึก/กำลังบันทึก.../บันทึกแล้ว (tfDRzk/XvjC4F/idD8Ev); the
//   save-failed toast title บันทึกไม่สำเร็จ (+Ya+b9) whose description is
//   describeContentValidationError — per-issue readable sentences built from
//   the SCHEMA field labels (describeIssue/fieldName; getFieldLabel returns
//   field.label verbatim); the image field's empty-state button เลือกรูปภาพ
//   (oDodff), the field-specific picker titles "เลือก {label}" (pov/PW) and
//   the fresh single-select confirmation เลือก (rG3WVm), with search aria
//   ค้นหามีเดีย (GzM+mT) / placeholder ค้นหาตามชื่อไฟล์... (Fwo2VZ); the
//   term-assignment toast
//   "อัปเดต {label} แล้ว" (KDffey); the draft badge ฉบับร่าง (M8kJqa); the
//   passkey sign-in copy "ใช้ Passkey ที่ลงทะเบียนไว้เพื่อเข้าสู่ระบบอย่าง
//   ปลอดภัย" (+ET/av)
// - CORRECT ENGLISH PLATFORM FALLBACK verified in the th locale (FR-029
//   permits this; asserted below as Thai|English alternations, never as
//   failure): the reference picker stays "Add references"/"Add selected"
//   (rUWN6C/wiQMMj), the taxonomy picker trigger frames "Choose
//   {label}"/"Edit {label}" (hBlIcx/wIP0Ho), its scoped search placeholder
//   "Search {label}…" (0JMPeZ) and group name "{label} options" (75js2e),
//   the entry-select checkbox aria "Select {title}" (135JuL), "Open {0} in
//   a new tab" (rSCGc2), the validation sentence frames "{name} is
//   required." (05MRDk) and "{name} must be a valid URL." (2sfwCE) — the
//   SCHEMA's Thai field label inside the platform's English frame — and the
//   immediate-term-save note (8nzS9o). Field/collection labels themselves
//   come from the applied Songhealth schema, so they are the seed's Thai
//   labels in every locale. The repeater chrome is natively Thai (เพิ่ม
//   รายการแรก/เพิ่มรายการ/ยังไม่มีรายการ — 924qJl/qgF8ew/bWmJ0A)
// - entry editor form (dist/index.js ContentEditor): fields render labeled
//   inputs (label association via htmlFor); SaveButton is type=submit whose
//   text walks บันทึก → กำลังบันทึก... → บันทึกแล้ว (Saved) with a
//   PreviewButton beside it when the collection supports preview. The
//   search input, list rows (an entry-title Link per row), and the status
//   filter combobox are the only list controls exercised — nothing invented
// - THE VALIDATION VECTOR (dist/index.js UrlFieldEditor): a url field
//   renders type="text" inputMode="url" — NO browser URL constraint can
//   intercept the interaction — and on blur of an invalid URL the PLATFORM
//   itself renders the readable inline native error "ป้อน URL ที่ถูกต้อง
//   (เช่น https://example.com)" (KPnpQW), which clears when the value is
//   corrected. services.external_url (ลิงก์บริการภายนอก) carries it; the
//   corrected value is then Saved explicitly and read back through the
//   native API. This is the ONE agreed native validation error corrected
//   below — no stronger validation requirement is invented (FR-026)
// - reference selector (ReferenceFieldRenderer → ContentPickerModal): the
//   optional offered_services field renders an "Add references" button; the
//   modal lists target-collection entries by their titles (getEntryTitle
//   over titleField), multi-select rows carry a "Select {title}" checkbox,
//   and "Add selected" confirms. The saved selection is verified through the
//   native relation children listing (T027-verified shape data.children) —
//   identity only, no availability claim (D-REF stays deferred)
// - taxonomy selector (TaxonomySection → TaxonomyTermPicker): each attached
//   taxonomy renders under its schema label. With no assignment yet the
//   picker's empty state exposes a square trigger button labeled "Choose
//   {label}" (hBlIcx — the English frame carries the schema's Thai label;
//   once terms are selected the overlay trigger becomes "Edit {label}",
//   wIP0Ho). Opening it reveals a scoped search input (placeholder
//   "Search {label}…" 0JMPeZ) and a role=group "{label} options" (75js2e)
//   whose choices are CHECKBOX rows labeled by each term.label — not
//   listbox options. Checking a term saves IMMEDIATELY through setEntryTerms
//   with the "อัปเดต {label} แล้ว" toast (KDffey; the platform's own
//   immediate-save semantics — asserted as observed, not re-saved).
//   facility_type is NONhierarchical (`hierarchical: false` in the accepted
//   seed; the term listing still emits the uniform TermWithCount shape with
//   an explicit children array on every node — leaves carry empty arrays —
//   so the trusted-tree identity guard below stays valid), and its term
//   inventory is intentionally empty (T004 evidence), so this file creates
//   ONE clearly synthetic task-owned term through the native term API and
//   selects it; synthetic terms are never presented as official inventories
// - media selector (schema image field → ImageFieldRenderer →
//   MediaPickerModal): the empty image field renders an h-32 dashed button
//   labeled "Select image" (oDodff — natively Thai เลือกรูปภาพ; the
//   "Select media"/1Tq98c string belongs to a different compact renderer,
//   never to the schema image field). It opens the picker titled with the
//   FIELD-SPECIFIC "Select {label}" (pov/PW — Thai "เลือก {label}"; an
//   existing value would switch it to "Replace {label}" with confirmLabel
//   "Replace", not the fresh-selection case here): เลือก ภาพหน่วยบริการ for
//   the facility image and เลือก ภาพ for the gallery subfield. The picker
//   searches by filename and lists library assets; CLICKING an item only
//   runs updateSelection (toggling it into selectedItems — dist
//   :8837/:9801/:9831), so the journey then clicks the dialog's native
//   single-select confirmation — "Select"/rG3WVm (Thai เลือก), enabled by
//   the marked selection, whose handleConfirm sends the item and closes
//   the picker (:9016, wiring :9942). The task-owned upload (a fresh owned
//   fixture, deduplicate=false — the T002 helper) is selected by its
//   unique filename this way. The saved image value is the selected asset
//   identity only ({ id } — T027-verified read-back)
// - gallery selector: `activities.gallery` (แกลเลอรีภาพ) IS the approved
//   model's gallery — a native repeater (seed.json) whose subFields are the
//   REQUIRED image ภาพ and the optional caption คำบรรยายภาพ (string). The
//   pinned RepeaterField renders the empty state "ยังไม่มีรายการ" with an
//   "เพิ่มรายการแรก"/"Add First Item" button (924qJl; subsequent rows
//   "เพิ่มรายการ"/qgF8ew), adds rows EXPANDED (a new item is never in the
//   collapsed set), renders each subField through SubFieldInput keyed by its
//   slug — the image subField reuses the same ImageFieldRenderer
//   (เลือกรูปภาพ → the same MediaPickerModal, here titled เลือก ภาพ) — and
//   emits row values keyed by subField
//   slug, so the saved data shape is [{ image: { id }, caption }]. One
//   focused representative interaction below exercises it with a task-owned
//   asset; no gallery primitive/widget is invented. Pagination is likewise
//   source-verified native behavior (หน้าถัดไป/หน้าก่อนหน้า aria labels) but
//   cannot be exercised deterministically with one task-owned fixture, so no
//   multi-page state is manufactured to force it
// - domain dates (dist/index.js toDatetimeLocalInputValue): a datetime
//   field renders a datetime-local input whose value is the STORED domain
//   date converted into the site's configured timezone (settings.timezone,
//   default UTC; readable through GET /_emdash/api/settings,
//   settings:read). announcements.announcement_at (วันที่ประกาศ) carries
//   the domain date below; publication state (the ฉบับร่าง draft badge) and
//   system timestamps are asserted as SEPARATE surfaced concepts, and the
//   native API read keeps the stored domain value distinct from
//   createdAt/updatedAt
// - native term API (the T027-verified contract reused here): POST
//   /_emdash/api/taxonomies/{name}/terms { slug, label, description? }
//   (taxonomies:manage; a duplicate slug is refused 409); GET
//   /_emdash/api/taxonomies/{name}/terms returns the term tree as
//   data.terms (TermWithCount: an explicit children array on every node,
//   leaves empty — uniform for hierarchical AND nonhierarchical taxonomies);
//   DELETE /_emdash/api/taxonomies/{name}/terms/{slug} removes a term
// - Playwright 1.63.0 URL-wait semantics (pinned
//   playwright-core lib — Context7 /microsoft/playwright v1.63.0):
//   page.waitForURL matches a RegExp/substring against the COMPLETE URL
//   string, never against URL.pathname alone, so a pathname-anchored
//   pattern can never match http://host/_emdash/admin/login. Both redirect
//   waits below therefore use a URL PREDICATE examining url.pathname —
//   with an unexpected path or a settle failure treated as FAIL, never as
//   the session prerequisite
//
// Authentication and session truth (the dispatch's explicit boundary):
// - within accepted access there is NO legitimate way to establish a
//   browser Admin session from this suite. The pinned 1.1.0 source creates
//   native sessions only in: passkey verification (a WebAuthn ceremony —
//   never automated here), email magic-link verification, OAuth provider
//   callbacks, invite/signup completion, and the development-only
//   /_emdash/api/auth/dev-bypass session endpoint. The development PAT the
//   T002 helpers carry authenticates REST requests (Authorization: Bearer)
//   only — it establishes no browser session and proves no editor journey,
//   and no REST check is substituted for UI evidence below (the API calls
//   here only PREPARE task-owned fixtures and read back what the UI wrote)
// - Product Owner decision 2026-10-29 (T032 on the single development
//   runtime): the development-only session route below MAY now be used,
//   opted in with SONGHEALTH_ADMIN_SESSION=dev-bypass. The gated journeys
//   then sign in through openDevAdminSession() (cms.helpers.ts) and log out
//   after each test; without the opt-in they keep the detection-based skip.
//   The text that follows is the original T031 finding, kept as written:
// - a pinned-source FINDING for the Lead/Product Owner, surfaced here
//   rather than used: EmDash 1.1.0 ships a development-only native session
//   facility, GET/POST /_emdash/api/auth/dev-bypass
//   (src/astro/routes/api/auth/dev-bypass.ts, gated on import.meta.env.DEV,
//   403 otherwise), which finds-or-creates the fixed dev@emdash.local
//   administrator and sets the native session cookie — its own header
//   documents it "for agent/browser testing" via
//   /_emdash/api/auth/dev-bypass?redirect=/_emdash/admin. It is DISTINCT
//   from the forbidden setup bootstrap (POST /_emdash/api/setup/dev-bypass,
//   which mints PATs and applies the seed and must not be re-run on the
//   initialized shared runtime), but it is NOT part of any accepted access
//   evidence, so this file does NOT call it. Should automated development
//   browser sessions be wanted, that endpoint needs its own explicit
//   review and Product Owner authorization first
// - therefore every browser-journey test below first DETECTS the session
//   state through the native UI itself: navigating to the collection list
//   either lands on the native sign-in/setup outcome (unauthenticated — the
//   test SKIPs with this prerequisite named verbatim: an authenticated
//   native Admin browser session is required, as T032's bounded staff
//   session provides through the native passkey sign-in) or shows the
//   authenticated list (the journey proceeds). The skip is detection-based,
//   never assumed: a session that exists — a staff member signed in with
//   their own passkey in this browser context — runs the full journey. One
//   availability test runs UNGATED so a reachable runtime always yields at
//   least one live check (the native sign-in boundary and its Thai
//   localization), exactly the T010/T027 discipline
//
// Boundaries and non-claims (tasks.md T031; Constitution v3.0.0 II–V):
// - test authoring only: nothing here executes at authoring time and no
//   runtime PASS, staff comprehension, SC-007 outcome, or T032 claim is
//   made. A skip, a --list discovery count, or a source review is never a
//   functional PASS
// - no custom Admin control, filter, bulk capability, saved view, or
//   stronger validation requirement is invented: only the native controls
//   verified above are exercised (list, typed search, the status filter
//   combobox, the reference/taxonomy/media selectors, explicit Save)
// - no production Passkey automation, no setup/dev-bypass re-run, no
//   cookie forging, no auth bypass, no second server/stack: the suite
//   targets the runner-configured existing application only
//   (playwright.config.ts contract; PLAYWRIGHT_BASE_URL or the documented
//   development origin), exactly like every accepted cms-*.spec.ts. The
//   emdash-locale cookie set below is locale selection through the
//   platform's own documented mechanism, not authentication
// - fixtures are clearly-marked synthetic public-publishable data created
//   through the native API by the development credential; entry/media IDs
//   come from native responses only and are registered for owned-fixture
//   cleanup; the synthetic facility_type term is tracked with an explicit
//   per-registration OWNERSHIP state (a natively CONFIRMED 2xx create — a
//   duplicate slug is refused 409 — is this file's own term and is deleted
//   only after a trusted-tree slug+label identity guard; a definitively
//   refused 4xx create owns nothing; transport failures/5xx stay explicitly
//   unresolved and are reported, never silently dropped). No official
//   inventory, personal/clinical/HR data, or real/shared record is adopted
//   as owned
// - cleanup is failure-safe and two-phase (corrective round 1, finding S1):
//   afterEach (plus an afterAll safety net) ALWAYS attempts the entry/media
//   reconciliation first and the synthetic-term reconciliation second, even
//   when the first phase returns incomplete or throws; scrubbed failures and
//   unresolved identities from BOTH phases are collected, reported as one
//   combined standing, and only then asserted. Unresolved outcomes remain
//   registered and are reported loudly as failures rather than left silently

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
	ADMIN_SESSION_ENV,
	cleanupOwnedFixtures,
	closeDevAdminSession,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	DEFAULT_DEVELOPMENT_ORIGIN,
	devAdminSessionRequested,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	openDevAdminSession,
	readEntry,
	scrubEmbeddedSecrets,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type CleanupReport,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Collections, Thai schema labels, and the verified platform chrome
// ---------------------------------------------------------------------------

/** The US4 Health Service collection — the primary maintenance journey. */
const HEALTH_SERVICE_COLLECTION = "health_services";

/** The US2 Service collection — reference target and validation vector. */
const SERVICE_COLLECTION = "services";

/** The US1 Announcement collection — the domain-date/timezone journey. */
const ANNOUNCEMENT_COLLECTION = "announcements";

/** The US1 Activities collection — the native gallery repeater journey. */
const ACTIVITIES_COLLECTION = "activities";

// Schema-defined Thai labels (seed.json — deterministic in every UI locale).
const HEALTH_SERVICE_LABEL = "หน่วยบริการสุขภาพ";
const SERVICE_LABEL = "บริการ";
const ANNOUNCEMENT_LABEL = "ประกาศ";
const FACILITY_TITLE_FIELD_LABEL = "ชื่อทางการ";
const FACILITY_IMAGE_FIELD_LABEL = "ภาพหน่วยบริการ";
const OFFERED_SERVICES_FIELD_LABEL = "บริการที่ให้";
const FACILITY_TYPE_LABEL = "ประเภทหน่วยบริการ";
const SERVICE_TITLE_FIELD_LABEL = "ชื่อบริการ";
const SERVICE_EXTERNAL_URL_FIELD_LABEL = "ลิงก์บริการภายนอก";
const ANNOUNCEMENT_AT_FIELD_LABEL = "วันที่ประกาศ";
const ACTIVITIES_LABEL = "กิจกรรม";
const GALLERY_FIELD_LABEL = "แกลเลอรีภาพ";
const GALLERY_IMAGE_SUBFIELD_LABEL = "ภาพ";
const GALLERY_CAPTION_SUBFIELD_LABEL = "คำบรรยายภาพ";

/**
 * The taxonomy picker's native trigger/search/group names for one taxonomy
 * label (TaxonomyTermPicker): "Choose {label}" when nothing is assigned
 * ("Edit {label}" once terms are selected), the scoped search placeholder
 * "Search {label}…", and the "{label} options" checkbox group. All three
 * keep their English frame around the schema's Thai label in the th locale
 * (verified fallback), so each pattern accepts the Thai frame as well.
 */
const chooseTermsTrigger = (label: string): RegExp =>
	new RegExp(`(?:Choose|เลือก)\\s*${label}`);
const editTermsTrigger = (label: string): RegExp => new RegExp(`(?:Edit|แก้ไข)\\s*${label}`);
const searchTermsPlaceholder = (label: string): RegExp =>
	new RegExp(`(?:Search|ค้นหา)\\s*${label}`);
const termsOptionsGroup = (label: string): RegExp =>
	new RegExp(`${label}\\s*(?:options|ตัวเลือก)`);

/** Native repeater chrome (natively Thai in the th locale; fallback kept). */
const REPEATER_ADD_FIRST_ITEM = /^(เพิ่มรายการแรก|Add First Item)$/;
const REPEATER_EMPTY_STATE = /(ยังไม่มีรายการ|No items yet)/;

// Verified platform chrome, asserted as Thai|English alternations because
// the pinned th locale itself keeps these strings/frames in English (FR-029
// permits the correct English platform fallback; the source-verified th ids
// are recorded in the header above).
const SAVE_LABEL = /^(บันทึก|Save)$/;
const SAVED_LABEL = /^(บันทึกแล้ว|Saved)$/;
/**
 * The schema image field's native empty-state control (ImageFieldRenderer):
 * the h-32 dashed button labeled "Select image" (oDodff — natively Thai
 * เลือกรูปภาพ). The unrelated "Select media"/1Tq98c string belongs to a
 * different compact renderer, never to the schema image field.
 */
const MEDIA_SELECT_LABEL = /^(เลือกรูปภาพ|Select image)$/;
/**
 * The image picker dialog's FIELD-SPECIFIC title for a fresh selection:
 * ImageFieldRenderer passes "Select {label}" (pov/PW — Thai "เลือก {label}")
 * with the field's own schema label, so the facility dialog is titled
 * "เลือก ภาพหน่วยบริการ" and the gallery row's subfield dialog "เลือก ภาพ".
 * (An existing value switches the title to "Replace {label}" 7w2lA2 with
 * confirmLabel "Replace" — never the fresh-selection case exercised here.)
 */
const selectImageDialogTitle = (fieldLabel: string): RegExp =>
	new RegExp(`^(?:เลือก|Select)\\s*${fieldLabel}$`);
/**
 * The picker's native single-select confirmation: clicking a library item
 * only runs updateSelection (toggling it into selectedItems), and the
 * dialog's footer confirm button — enabled by that selection, labeled
 * "Select" (rG3WVm — Thai เลือก) for a fresh single-select — is what sends
 * the item through handleConfirm and closes the picker.
 */
const MEDIA_CONFIRM_LABEL = /^(เลือก|Select)$/;
const MEDIA_PICKER_SEARCH = /(ค้นหามีเดีย|Search media)/;
const ADD_REFERENCES_LABEL = /^Add references?$/;
const ADD_SELECTED_LABEL = /^Add selected$/;
const INVALID_URL_ERROR = /(ป้อน URL ที่ถูกต้อง|Enter a valid URL)/;
const TERM_UPDATED_TOAST = /(อัปเดต\s|\bupdated\b)/;
const DRAFT_BADGE = /(ฉบับร่าง|Draft)/;
const STATUS_FILTER_LABEL = /(กรองตามสถานะ|Filter by status)/;
const DRAFT_OPTION_LABEL = /^(ฉบับร่าง|Draft)$/;
const PASSKEY_SIGNIN_COPY = /(ใช้ Passkey ที่ลงทะเบียนไว้|Passkey)/;

/**
 * The task-owned synthetic domain date: a public synthetic value with an
 * explicit +07:00 offset, deliberately unrelated to any real announcement.
 */
const DOMAIN_DATE_WITH_OFFSET = "2026-10-24T09:00:00+07:00";

/** The one agreed native validation error and its correction (url format). */
const INVALID_URL_VALUE = `${SYNTHETIC_FIXTURE_MARK}-not-a-valid-url`;
const CORRECTED_URL_VALUE = `https://example.com/${SYNTHETIC_FIXTURE_MARK}`;

/**
 * The session prerequisite named verbatim by every gated skip: accepted
 * access supplies a development PAT (API-only), never a browser session.
 */
const SESSION_PREREQUISITE =
	"an authenticated native Admin browser session is required for this editor journey " +
	"and accepted access supplies none: the development PAT authenticates REST requests only. " +
	"Sign in to the native Admin through the native passkey flow in this browser context " +
	"(T032's bounded staff session), then re-run — this skip is a detected prerequisite, " +
	"not a PASS. Pinned 1.1.0 source also ships a development-only native session facility " +
	"(GET /_emdash/api/auth/dev-bypass, import.meta.env.DEV-gated): set " +
	`${ADMIN_SESSION_ENV}=dev-bypass to sign in with it (Product Owner decision 2026-10-29).`;

// ---------------------------------------------------------------------------
// Synthetic-fixture identity helpers (the accepted T027 discipline)
// ---------------------------------------------------------------------------

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** One clearly synthetic unique facility_type term (slug = synthetic code). */
function syntheticTermIdentity(): { slug: string; label: string } {
	const id = crypto.randomUUID().slice(0, 8);
	return {
		slug: `${SYNTHETIC_FIXTURE_MARK}-facility-type-${id}`,
		label: `${SYNTHETIC_FIXTURE_MARK} ประเภทสังเคราะห์ ${id}`,
	};
}

/**
 * Synthetic taxonomy terms this worker has attempted to create, with the
 * OWNERSHIP state classified from the native outcome BEFORE any fallible
 * shape assertion (the accepted T027 contract):
 * - "unconfirmed" — a create was issued but native confirmation is absent
 *   (transport failure / 5xx): cleanup never deletes on it; it stays
 *   explicitly unresolved;
 * - "confirmed" — the native create was ACCEPTED (2xx; a duplicate slug is
 *   refused 409, so acceptance proves this file's creation): cleanup may
 *   delete it after the trusted-tree slug+label identity guard;
 * - "not-created" — the platform definitively REFUSED (4xx, including 409
 *   on a pre-existing slug) or the term is proven gone: nothing of this
 *   file's exists at that slug and any term found there is pre-existing —
 *   never deleted, never reported as residue.
 */
type OwnedSyntheticTerm = {
	taxonomy: string;
	slug: string;
	label: string;
	ownership: "unconfirmed" | "confirmed" | "not-created";
};

const ownedSyntheticTerms: OwnedSyntheticTerm[] = [];

// ---------------------------------------------------------------------------
// Run control: runner-configured origin, Thai locale cookie, session gate
// ---------------------------------------------------------------------------

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003/T007/T014/T019/T023/T027 checks).
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

/**
 * Select the platform's Thai localization through its OWN native mechanism:
 * the admin shell resolves the `emdash-locale` cookie (the native switcher
 * writes exactly `emdash-locale=th; Path=/_emdash`). This is browser-side
 * locale configuration — not an Admin fork, patch, or translation layer.
 */
test.beforeEach(async ({ page }) => {
	const origin = (await configuredDevelopmentOrigin()).replace(/\/+$/, "");
	await page.context().addCookies([{ name: "emdash-locale", value: "th", url: `${origin}/` }]);
});

/** The native unauthenticated Admin outcomes (the accepted T010 contract). */
const UNAUTHENTICATED_ADMIN_PATHS = /^\/_emdash\/admin\/(login|setup)\/?$/;

/**
 * The URL predicate for the native login/setup redirect. Playwright 1.63.0's
 * page.waitForURL matches a RegExp against the COMPLETE URL string, so the
 * pathname-anchored pattern above is applied through this predicate on
 * url.pathname instead — never handed to waitForURL directly.
 */
const isUnauthenticatedAdminUrl = (url: URL): boolean =>
	UNAUTHENTICATED_ADMIN_PATHS.test(url.pathname);

/** The list search input locator for a collection's Thai label. */
function listSearchInput(page: Page, collectionLabel: string): Locator {
	return page.getByLabel(new RegExp(`(?:ค้นหา|Search)\\s*${collectionLabel}`));
}

/**
 * Open the collection list and detect, through the native UI itself, whether
 * an authenticated Admin session exists in this browser context. Landing on
 * the native sign-in/setup outcome means no session: the test SKIPS with the
 * session prerequisite named verbatim (a detected prerequisite, never a
 * silent PASS). Otherwise the authenticated list's search input is awaited
 * so the caller continues on a settled, session-backed page.
 */
/** Set when a test signed in with the development session; afterEach logs it out. */
let sessionOpened = false;

async function requireAdminSession(
	page: Page,
	collection: string,
	collectionLabel: string,
): Promise<Locator> {
	if (await devAdminSessionRequested()) {
		await openDevAdminSession(page.context());
		sessionOpened = true;
	}
	await page.goto(`/_emdash/admin/content/${encodeURIComponent(collection)}`);
	const searchInput = listSearchInput(page, collectionLabel);
	const outcome = await Promise.race([
		page
			.waitForURL(isUnauthenticatedAdminUrl, { timeout: 20_000 })
			.then(() => "unauthenticated" as const),
		searchInput.waitFor({ state: "visible", timeout: 20_000 }).then(() => "authenticated" as const),
	]).catch(() => {
		throw new Error(
			`neither the native sign-in/setup redirect nor the authenticated ${collection} list appeared at /_emdash/admin/content/${collection} within 20s — the Admin surface did not settle into a known native outcome (environment failure, not a skip)`,
		);
	});
	if (outcome === "unauthenticated") {
		test.skip(true, SESSION_PREREQUISITE);
	}
	return searchInput;
}

// ---------------------------------------------------------------------------
// Schema readiness gates (truthful: missing SKIPS, misconfigured FAILS)
// ---------------------------------------------------------------------------

type Readiness = { outcome: "missing" | "misconfigured" | "ready"; detail?: string };

/** The T030-applied model pieces this smoke relies on. */
let journeyReadiness: Readiness = {
	outcome: "missing",
	detail: "T028/T029/T030 health_services + facility_services definitions",
};
let announcementReadiness: Readiness = { outcome: "missing", detail: "announcements definition" };
let galleryReadiness: Readiness = { outcome: "missing", detail: "activities gallery repeater definition" };
let siteTimezone: string | undefined;

/** Truthful schema gate: missing SKIPS with the prerequisite; misconfigured FAILS. */
function gate(readiness: Readiness): void {
	if (readiness.outcome === "missing") {
		test.skip(
			true,
			`the ${readiness.detail ?? "schema"} prerequisite is outstanding on the runtime this suite faces; this run cannot exercise these US7 checks`,
		);
		return;
	}
	if (readiness.outcome === "misconfigured") {
		throw new Error(
			`the active native schema does not match the approved definition these checks rely on: ${readiness.detail}`,
		);
	}
}

/** Field map of a native collection schema read (`data.item.fields`). */
function fieldsOf(
	result: NativeResult,
): Map<string, { type?: string; required?: boolean }> {
	const fields = nativeItemOf(result)?.fields;
	const map = new Map<string, { type?: string; required?: boolean }>();
	if (Array.isArray(fields)) {
		for (const field of fields as Array<{ slug?: unknown; type?: unknown; required?: unknown }>) {
			if (typeof field.slug === "string") {
				map.set(field.slug, {
					type: typeof field.type === "string" ? field.type : undefined,
					required: field.required === true,
				});
			}
		}
	}
	return map;
}

// ---------------------------------------------------------------------------
// Development access and read-only readiness (beforeAll — no owned fixtures)
// ---------------------------------------------------------------------------

let admin: CmsActor | undefined;

test.beforeAll(async () => {
	// Development native access through the pre-existing development
	// credential (the accepted T013 test-authentication adaptation), pinned
	// to the runner-configured origin so a nondefault PLAYWRIGHT_BASE_URL run
	// cannot silently exercise another app. createPatActor verifies the live
	// identity through /auth/me and pins the expected Administrator role; the
	// expected development fixture account is asserted by email. This hook
	// creates no owned fixtures (credential load, identity verification and
	// read-only schema/settings reads only) — Playwright --list discovery
	// performs no native calls at all (hooks run only at execution).
	admin = await createPatActor({
		baseUrl: await configuredDevelopmentOrigin(),
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// --- the journey collections: exactly the fields this smoke exercises ---
	const healthServices = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	const services = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(SERVICE_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (healthServices.status === 404 || services.status === 404) {
		// The T028/T029/T030 definitions are not on this runtime: skipping is
		// the truthful outcome (the T030 evidence records them applied on the
		// shared runtime; another environment may legitimately lack them).
		journeyReadiness = {
			outcome: "missing",
			detail: "T028/T029/T030 health_services + facility_services definitions",
		};
	} else {
		expect(
			healthServices.ok,
			`reading the native ${HEALTH_SERVICE_COLLECTION} schema must succeed when it is not a 404 (got ${healthServices.status})`,
		).toBe(true);
		expect(
			services.ok,
			`reading the native ${SERVICE_COLLECTION} schema must succeed when it is not a 404 (got ${services.status})`,
		).toBe(true);
		const problems: string[] = [];
		const facilityFields = fieldsOf(healthServices);
		if (facilityFields.get("title")?.type !== "string" || !facilityFields.get("title")?.required) {
			problems.push("health_services.title must be the required native string field (ชื่อทางการ)");
		}
		if (facilityFields.get("image")?.type !== "image") {
			problems.push("health_services.image must be the native image field (ภาพหน่วยบริการ)");
		}
		if (facilityFields.get("offered_services")?.type !== "reference") {
			problems.push(
				"health_services.offered_services must be the native reference selector (บริการที่ให้)",
			);
		}
		const serviceFields = fieldsOf(services);
		if (serviceFields.get("title")?.type !== "string" || !serviceFields.get("title")?.required) {
			problems.push("services.title must be the required native string field (ชื่อบริการ)");
		}
		if (serviceFields.get("external_url")?.type !== "url") {
			problems.push(
				"services.external_url must be the native url field (ลิงก์บริการภายนอก) for the validation vector",
			);
		}
		// The facility_type taxonomy must exist (the applied T004 definition;
		// its term inventory is intentionally empty pending authoritative
		// sources, so the journey mints one clearly synthetic task-owned term).
		const taxonomy = await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${encodeURIComponent("facility_type")}`,
		);
		if (taxonomy.status === 404) {
			journeyReadiness = { outcome: "missing", detail: "facility_type taxonomy definition" };
		} else {
			journeyReadiness =
				problems.length > 0
					? { outcome: "misconfigured", detail: problems.join("; ") }
					: { outcome: "ready" };
		}
	}

	// --- announcements: the domain-date journey ---
	const announcements = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(ANNOUNCEMENT_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (announcements.status === 404) {
		announcementReadiness = { outcome: "missing", detail: "announcements definition" };
	} else {
		expect(
			announcements.ok,
			`reading the native ${ANNOUNCEMENT_COLLECTION} schema must succeed when it is not a 404 (got ${announcements.status})`,
		).toBe(true);
		if (fieldsOf(announcements).get("announcement_at")?.type !== "datetime") {
			announcementReadiness = {
				outcome: "misconfigured",
				detail: "announcements.announcement_at must be the native datetime field (วันที่ประกาศ)",
			};
		} else {
			announcementReadiness = { outcome: "ready" };
		}
	}

	// --- activities: the native gallery repeater journey ---
	const activities = await cmsRequest(
		admin,
		`/_emdash/api/schema/collections/${encodeURIComponent(ACTIVITIES_COLLECTION)}`,
		{ searchParams: { includeFields: "true" } },
	);
	if (activities.status === 404) {
		galleryReadiness = { outcome: "missing", detail: "activities gallery repeater definition" };
	} else {
		expect(
			activities.ok,
			`reading the native ${ACTIVITIES_COLLECTION} schema must succeed when it is not a 404 (got ${activities.status})`,
		).toBe(true);
		const galleryField = (
			nativeItemOf(activities)?.fields as
				| Array<{ slug?: string; type?: string; validation?: { subFields?: unknown } }>
				| undefined
		)?.find((field) => field.slug === "gallery");
		const subFields = Array.isArray(galleryField?.validation?.subFields)
			? (galleryField!.validation!.subFields as Array<{
					slug?: string;
					type?: string;
					required?: boolean;
				}>)
			: [];
		const imageSub = subFields.find((sub) => sub.slug === "image");
		const captionSub = subFields.find((sub) => sub.slug === "caption");
		if (
			galleryField?.type !== "repeater" ||
			imageSub?.type !== "image" ||
			imageSub.required !== true ||
			captionSub?.type !== "string" ||
			captionSub.required === true
		) {
			galleryReadiness = {
				outcome: "misconfigured",
				detail: "activities.gallery must be the native repeater with the required image (ภาพ) and optional caption (คำบรรยายภาพ) subfields",
			};
		} else {
			galleryReadiness = { outcome: "ready" };
		}
	}

	// --- the site timezone (best effort; used only to state the EXPECTED
	// datetime-local rendering of the domain date). A refusal here is not a
	// journey failure: the separation assertions do not depend on it. ---
	const settings = await cmsRequest(admin, "/_emdash/api/settings");
	const timezone = nativeDataOf(settings)?.timezone;
	if (settings.ok && typeof timezone === "string" && timezone.length > 0) {
		siteTimezone = timezone;
	}
});

// ---------------------------------------------------------------------------
// Failure-safe teardown: owned entries/media first, then the synthetic term
// ---------------------------------------------------------------------------

/**
 * Locate one slug in the complete hierarchical native term listing
 * (data.terms with nested children — the T027-verified shape), returning the
 * node when found. An unreadable/untrusted listing returns undefined-so-
 * unresolvable rather than a false absence (the caller reports it).
 */
function findTermInTree(
	nodes: unknown[],
	slug: string,
): { trusted: boolean; node?: Record<string, unknown> } {
	let found: Record<string, unknown> | undefined;
	const walk = (entries: unknown[], depth: number): boolean => {
		if (depth > 64) return false;
		for (const entry of entries) {
			if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return false;
			const node = entry as Record<string, unknown>;
			if (typeof node.slug !== "string" || node.slug.length === 0) return false;
			if (!Array.isArray(node.children)) return false;
			if (node.slug === slug && found === undefined) found = node;
			if (!walk(node.children as unknown[], depth + 1)) return false;
		}
		return true;
	};
	const trusted = walk(nodes, 0);
	return { trusted, node: found };
}

/** Delete terms this file natively CONFIRMED creating, last-created first. */
async function deleteOwnedSyntheticTerms(): Promise<string[]> {
	if (admin === undefined) return [];
	const unresolved: string[] = [];
	for (const owned of [...ownedSyntheticTerms].reverse()) {
		if (owned.ownership === "not-created") continue;
		try {
			// Identity guard before ANY delete: the complete native listing must
			// show this slug carrying exactly this file's synthetic label.
			const listing = await cmsRequest(
				admin,
				`/_emdash/api/taxonomies/${encodeURIComponent(owned.taxonomy)}/terms`,
			);
			const roots = nativeDataOf(listing)?.terms;
			if (!listing.ok || !Array.isArray(roots)) {
				unresolved.push(`${owned.slug} (term listing unreadable: ${nativeRefusalOf(listing)})`);
				continue;
			}
			const located = findTermInTree(roots, owned.slug);
			if (!located.trusted) {
				unresolved.push(`${owned.slug} (term listing untrusted; absence unproven)`);
				continue;
			}
			if (located.node === undefined) {
				// Confirmed created but absent everywhere now — already resolved.
				owned.ownership = "not-created";
				continue;
			}
			if (located.node.label !== owned.label) {
				// A pre-existing or renamed term sits at this slug: not ours.
				unresolved.push(`${owned.slug} (identity mismatch; left untouched)`);
				continue;
			}
			if (owned.ownership === "unconfirmed") {
				unresolved.push(`${owned.slug} (create never natively confirmed; left untouched)`);
				continue;
			}
			const removed = await cmsRequest(
				admin,
				`/_emdash/api/taxonomies/${encodeURIComponent(owned.taxonomy)}/terms/${encodeURIComponent(owned.slug)}`,
				{ method: "DELETE" },
			);
			if (!removed.ok && removed.status !== 404) {
				unresolved.push(`${owned.slug} (delete refused: ${nativeRefusalOf(removed)})`);
				continue;
			}
			owned.ownership = "not-created";
		} catch (cause) {
			unresolved.push(
				`${owned.slug} (${cause instanceof Error ? scrubEmbeddedSecrets(cause.message) : "transport failure"})`,
			);
		}
	}
	return unresolved;
}

/**
 * Run BOTH cleanup phases in the authorized order and collect every scrubbed
 * failure and unresolved identity from each, so the second phase is ALWAYS
 * attempted — even when the first phase returns incomplete or throws
 * (corrective round 1, finding S1). Phase A reconciles owned entries then
 * media through the shared T002 registry (its own resilience contract never
 * throws past a failed step, but a throw is still captured here rather than
 * allowed to skip phase B). Phase B reconciles the registered synthetic
 * terms (already per-term try/catch internally). Ownership registrations,
 * identity guards and unresolved retention are preserved exactly: only a
 * proven-resolved fixture leaves the registry, and only a trusted-tree
 * slug+label identity match is ever deleted. Returns the combined problem
 * list for the caller to report and then assert.
 */
async function reconcileOwnedResources(phase: string): Promise<string[]> {
	const problems: string[] = [];

	// Phase A — entries first (their deletion releases term assignments),
	// then media, through the shared owned-fixture registry.
	let report: CleanupReport | undefined;
	try {
		report = await cleanupOwnedFixtures(admin!, { permanent: true });
	} catch (cause) {
		problems.push(
			`entry/media cleanup threw: ${
				cause instanceof Error ? scrubEmbeddedSecrets(cause.message) : "non-error rejection"
			}`,
		);
	}
	if (report !== undefined) {
		for (const entry of report.entries) {
			if (!entry.resolved) {
				problems.push(
					`entry ${entry.collection}/${entry.id} unresolved (${entry.refusal ?? entry.note ?? "no reason recorded"})`,
				);
			}
		}
		for (const media of report.media) {
			if (!media.resolved) {
				problems.push(
					`media ${media.id} unresolved (${media.refusal ?? media.note ?? "no reason recorded"})`,
				);
			}
		}
	}

	// Phase B — the synthetic term cleanup runs REGARDLESS of phase A's
	// outcome; deleteOwnedSyntheticTerms already captures per-term failures
	// as unresolved identities and never throws past one.
	let unresolvedTerms: string[] = [];
	try {
		unresolvedTerms = await deleteOwnedSyntheticTerms();
	} catch (cause) {
		unresolvedTerms = [
			`term cleanup threw: ${
				cause instanceof Error ? scrubEmbeddedSecrets(cause.message) : "non-error rejection"
			}`,
		];
	}
	problems.push(...unresolvedTerms);

	console.log(
		`[cms-editor] owned-resource cleanup ${phase}: ${
			problems.length === 0 ? "complete" : `UNRESOLVED (${problems.length} problem(s))`
		} (entries attempted ${report?.entries.length ?? 0}, media attempted ${report?.media.length ?? 0}, terms registered ${ownedSyntheticTerms.length})`,
	);
	if (problems.length > 0) {
		console.log(`[cms-editor] unresolved identities/failures: ${problems.join("; ")}`);
	}
	return problems;
}

test.afterEach(async ({ context }) => {
	if (sessionOpened) {
		sessionOpened = false;
		expect(await closeDevAdminSession(context), "the development Admin session must log out").toBe(200);
	}
	// Partial-setup guard: beforeAll creates no owned fixtures, so an actor
	// that never finished bootstrapping has nothing to reconcile.
	if (admin === undefined) return;
	const problems = await reconcileOwnedResources("after test");
	expect(
		problems,
		"every owned synthetic entry/media fixture and synthetic taxonomy term created by this test must be proven resolved (entries/media first, then terms, with all phases attempted and every unresolved identity reported — never a silent leftover)",
	).toEqual([]);
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything); anything
	// still registered here is an unresolved earlier attempt, retried through
	// the same two-phase reconciliation and reported truthfully as the
	// worker's final standing.
	if (admin === undefined) return;
	const problems = await reconcileOwnedResources("final worker");
	expect(
		problems,
		"the final worker cleanup must leave zero unresolved owned entries, media or synthetic taxonomy terms, with every phase attempted and every unresolved identity reported",
	).toEqual([]);
});

// ---------------------------------------------------------------------------
// Fixture preparation through the native API (task-owned, returned IDs only)
// ---------------------------------------------------------------------------

/** The data object of a native entry read (`data.item.data`). */
function dataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.data !== null && typeof item?.data === "object"
		? (item.data as Record<string, unknown>)
		: {};
}

/** Create one task-owned synthetic facility_type term (guarded ownership). */
async function createSyntheticFacilityTypeTerm(): Promise<{ slug: string; label: string }> {
	const { slug, label } = syntheticTermIdentity();
	const registration: OwnedSyntheticTerm = {
		taxonomy: "facility_type",
		slug,
		label,
		ownership: "unconfirmed",
	};
	// Registered BEFORE the create request is issued, so an in-flight create
	// can never be untracked (the accepted T027 discipline).
	ownedSyntheticTerms.push(registration);
	const created = await cmsRequest(
		admin!,
		`/_emdash/api/taxonomies/${encodeURIComponent("facility_type")}/terms`,
		{
			method: "POST",
			body: {
				slug,
				label,
				description: `${SYNTHETIC_FIXTURE_MARK} synthetic facility-type fixture (T031); not an official inventory value`,
			},
		},
	);
	// Classify ownership from the native outcome BEFORE any fallible shape
	// assertion: 2xx confirms this file's creation (409 refuses a colliding
	// slug); a definitive 4xx means nothing of ours exists; 5xx/transport
	// stay unconfirmed and are never deleted on.
	registration.ownership = created.ok
		? "confirmed"
		: created.status >= 400 && created.status < 500
			? "not-created"
			: "unconfirmed";
	expect(
		created.ok,
		`the synthetic facility_type term fixture must be created through the native term API (got ${nativeRefusalOf(created)})`,
	).toBe(true);
	const term = nativeDataOf(created)?.term;
	expect(
		term !== null && typeof term === "object" && typeof (term as Record<string, unknown>).id === "string",
		"the created term must carry its native id",
	).toBe(true);
	return { slug, label };
}

// ---------------------------------------------------------------------------
// The maintenance smoke
// ---------------------------------------------------------------------------

test("native Admin boundary is reachable and localized in Thai with correct English fallback (always runs)", async ({
	page,
}) => {
	// Availability + localization only, exactly the accepted T010 boundary:
	// navigate to the native Admin root and accept exactly the two native
	// unauthenticated outcomes, or a POSITIVELY VERIFIED authenticated
	// surface. The passkey flow is never completed or automated. Any other
	// settled path — or no recognizable surface at all — FAILS this check
	// rather than being silently accepted.
	await page.goto("/_emdash/admin/");
	// The SPA may redirect client-side to sign-in; give that a bounded window
	// (predicate form: waitForURL matches RegExps against the complete URL,
	// so the pathname pattern is applied through the URL predicate).
	await page
		.waitForURL(isUnauthenticatedAdminUrl, { timeout: 8_000 })
		.catch(() => undefined);

	// The native shell resolves the locale per request (the emdash-locale
	// cookie set in beforeEach — the platform's own switcher mechanism), so
	// the document language is the first localization truth.
	await expect(page.locator("html")).toHaveAttribute("lang", "th");

	if (isUnauthenticatedAdminUrl(new URL(page.url()))) {
		const finalPath = new URL(page.url()).pathname.replace(/\/+$/, "");
		// Unauthenticated: the sign-in surface must present the native Thai
		// passkey copy (or the correct English fallback — never a third,
		// unrecognizable state). The first-admin setup outcome carries its own
		// wizard copy; only the document language is asserted there, truthfully.
		if (finalPath.endsWith("/login")) {
			// Bounded native readiness wait (ported from the T032 PR #37
			// corrective round 2): the sign-in copy is SPA-rendered after the
			// AdminApp mounts, and the mount removes #emdash-boot-loader
			// (pinned @emdash-cms/admin 1.1.0). Waiting for that landmark keeps
			// the copy assertion's default window unchanged.
			await page
				.locator("#emdash-boot-loader")
				.waitFor({ state: "detached", timeout: 20_000 });
			await expect(page.getByText(PASSKEY_SIGNIN_COPY).first()).toBeVisible();
		}
		console.log(
			`[cms-editor] Admin boundary reached at ${finalPath} (unauthenticated; no session attempted)`,
		);
	} else {
		// Any non-login/setup outcome must prove a real authenticated surface:
		// the admin sidebar renders the applied collections (SidebarNav links
		// carry the schema's Thai collection labels). Without this landmark
		// the check fails — an unexpected path is never accepted as coverage.
		await expect(
			page.getByRole("link", { name: HEALTH_SERVICE_LABEL }).first(),
			"a non-login/setup Admin path must render the authenticated sidebar with the applied collections' Thai labels",
		).toBeVisible();
		console.log(
			`[cms-editor] Admin boundary reached at ${new URL(page.url()).pathname} (an authenticated session exists in this context)`,
		);
	}
});

test("maintenance journey: Thai labels, search/status filter, find and reopen, native media/reference/taxonomy selectors, reuse, and explicit save", async ({
	page,
}) => {
	gate(journeyReadiness);
	// DETECTION-BASED SESSION GATE (see SESSION_PREREQUISITE): skip — never
	// silently pass — when no authenticated Admin session exists. Fixtures are
	// created only after the gate, so a session-less runtime owns nothing.
	const searchInput = await requireAdminSession(page, HEALTH_SERVICE_COLLECTION, HEALTH_SERVICE_LABEL);

	// --- task-owned native fixtures through the API (returned IDs only) ---
	const serviceTitle = uniqueTitle("service");
	const service = await createSyntheticEntry(admin!, SERVICE_COLLECTION, {
		data: { title: serviceTitle },
	});
	expect(service.result.ok, "the task-owned Service fixture must be created").toBe(true);
	expect(service.entryId, "the Service fixture id must come from the native response").toBeTruthy();

	const mediaFilename = `${SYNTHETIC_FIXTURE_MARK}-editor-${crypto.randomUUID().slice(0, 8)}.png`;
	const media = await uploadSyntheticMedia(admin!, { filename: mediaFilename });
	expect(media.result.ok, "the task-owned synthetic media fixture must upload").toBe(true);
	expect(
		media.mediaId,
		"the upload must return a fresh owned media id (deduplicate=false)",
	).toBeTruthy();

	const term = await createSyntheticFacilityTypeTerm();

	const facilityTitle = uniqueTitle("health-service");
	const facility = await createSyntheticEntry(admin!, HEALTH_SERVICE_COLLECTION, {
		data: { title: facilityTitle },
	});
	expect(facility.result.ok, "the task-owned Health Service fixture must be created").toBe(true);
	expect(
		facility.entryId,
		"the Health Service fixture id must come from the native response",
	).toBeTruthy();

	// --- the ordinary list, in Thai, with the available search ---
	// The list search input's accessible name carries the SCHEMA's Thai
	// collection label (source-verified aria-label "ค้นหา {label}").
	await expect(searchInput).toBeVisible();

	// Search narrows the list to the task-owned fixture (its unique title
	// fragment appears in both the title and the slug, so client- and
	// server-side matching modes both find it).
	const facilityFragment = facilityTitle.slice(-8);
	// Each list row carries two native links to the editor: the title link
	// and the edit icon, whose accessible name is "แก้ไข <title>"; the exact
	// full title selects the title link alone (strict-mode safe).
	const facilityRow = () => page.getByRole("link", { name: facilityTitle, exact: true });
	await searchInput.fill(facilityFragment);
	await expect(
		facilityRow(),
		"the searched fixture row must appear in the ordinary list",
	).toBeVisible();

	// The available native status filter (กรองตามสถานะ) with its ฉบับร่าง
	// Draft option: the fixture is a draft, so filtering to drafts keeps it
	// visible. No invented filter or bulk capability is touched.
	const statusFilter = page.getByRole("combobox", { name: STATUS_FILTER_LABEL });
	await expect(
		statusFilter,
		"the native status filter must be available on the ordinary list",
	).toBeVisible();
	await statusFilter.click();
	await page.getByRole("option", { name: DRAFT_OPTION_LABEL }).first().click();
	await expect(
		facilityRow(),
		"the draft fixture must remain visible under the native Draft status filter",
	).toBeVisible();

	// --- finding and reopening the entry through the native row link ---
	await facilityRow().click();
	await page.waitForURL(new RegExp(`/_emdash/admin/content/${HEALTH_SERVICE_COLLECTION}/[^/]+`));
	expect(
		new URL(page.url()).pathname.endsWith(`/${facility.entryId}`),
		"the reopened editor must be the task-owned fixture's own entry",
	).toBe(true);

	// --- recognizable Thai field labels in the reopened editor ---
	await expect(page.getByText(FACILITY_IMAGE_FIELD_LABEL).first()).toBeVisible();
	await expect(page.getByText(OFFERED_SERVICES_FIELD_LABEL).first()).toBeVisible();
	await expect(page.getByText(FACILITY_TYPE_LABEL).first()).toBeVisible();
	const titleInput = page.getByLabel(FACILITY_TITLE_FIELD_LABEL);
	await expect(titleInput, "the required Thai-labeled title field must be present").toBeVisible();

	// --- the native media selector: select the task-owned asset ---
	// The empty image field's button (เลือกรูปภาพ/Select image) opens the
	// picker titled with the FIELD's own Thai label (เลือก ภาพหน่วยบริการ).
	await page.getByRole("button", { name: MEDIA_SELECT_LABEL }).first().click();
	const mediaDialog = page.getByRole("dialog");
	await expect(
		mediaDialog.getByText(selectImageDialogTitle(FACILITY_IMAGE_FIELD_LABEL)),
	).toBeVisible();
	await mediaDialog.getByLabel(MEDIA_PICKER_SEARCH).fill(mediaFilename);
	// Clicking the library item only MARKS the selection; the native Select
	// confirmation (เลือก) inside the dialog is what confirms and closes.
	await mediaDialog.getByText(mediaFilename).first().click();
	const confirmButton = mediaDialog.getByRole("button", { name: MEDIA_CONFIRM_LABEL });
	await expect(
		confirmButton,
		"marking the task-owned asset must enable the picker's native Select confirmation",
	).toBeEnabled();
	await confirmButton.click();
	await expect(
		mediaDialog,
		"the media picker must close after the native Select confirmation",
	).toBeHidden();

	// --- the native reference selector: select and reuse the Service fixture ---
	await page.getByRole("button", { name: ADD_REFERENCES_LABEL }).first().click();
	const referenceDialog = page.getByRole("dialog");
	await expect(referenceDialog).toBeVisible();
	// Pinned @emdash-cms/admin 1.1.0: each picker checkbox carries the item
	// title as aria-label but also aria-labelledby pointing at the FIELD
	// label, which wins the accessible-name computation, so every checkbox is
	// named after the field. Each row is a <label>: clicking the item's title
	// toggles its checkbox, which is then identified by its title aria-label.
	await referenceDialog.getByText(serviceTitle, { exact: true }).click();
	await expect(
		referenceDialog.locator(`[role="checkbox"][aria-label="${serviceTitle}"]`),
		"clicking the Service row must check its native picker checkbox",
	).toHaveAttribute("aria-checked", "true");
	await referenceDialog.getByRole("button", { name: ADD_SELECTED_LABEL }).click();
	await expect(
		referenceDialog,
		"the reference picker must close after confirming the selection",
	).toBeHidden();

	// --- the native taxonomy selector: select the task-owned Thai term ---
	// The pinned TaxonomyTermPicker's empty state exposes a "Choose {label}"
	// trigger (the English frame carries the schema's Thai taxonomy label —
	// verified fallback); opening it reveals the scoped "Search {label}…"
	// input and the "{label} options" CHECKBOX group. Checking the term
	// saves immediately through the platform's own setEntryTerms semantics —
	// asserted as observed, never re-saved — and the field's overlay trigger
	// becomes "Edit {label}" once a term is assigned.
	await page
		.getByRole("button", { name: chooseTermsTrigger(FACILITY_TYPE_LABEL) })
		.first()
		.click();
	await page
		.getByPlaceholder(searchTermsPlaceholder(FACILITY_TYPE_LABEL))
		.fill(term.label);
	await page
		.getByRole("group", { name: termsOptionsGroup(FACILITY_TYPE_LABEL) })
		.getByRole("checkbox", { name: term.label, exact: true })
		.click();
	await expect(
		page.getByText(TERM_UPDATED_TOAST).first(),
		"the native immediate term-assignment toast must surface the taxonomy's Thai label",
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: editTermsTrigger(FACILITY_TYPE_LABEL) }).first(),
		"the assigned taxonomy field must now expose its native Edit trigger",
	).toBeVisible();

	// --- edit, then explicit Save through the native button ---
	await titleInput.fill(`${facilityTitle} (แก้ไข)`);
	const saveButton = page.getByRole("button", { name: SAVE_LABEL }).first();
	await expect(saveButton, "the Save button must enable after real edits").toBeEnabled();
	await saveButton.click();
	await expect(
		page.getByRole("button", { name: SAVED_LABEL }).first(),
		"the native editor must reach its saved state (บันทึกแล้ว/Saved)",
	).toBeVisible();

	// --- the persisted identities, read back through the native API ---
	// The UI evidence is the journey above; this read confirms what the
	// selectors actually wrote — identities only, no availability claims.
	const read = await readEntry(admin!, HEALTH_SERVICE_COLLECTION, facility.entryId!);
	expect(read.ok, "the saved fixture must be readable through the native API").toBe(true);
	const savedData = dataOfItem(nativeItemOf(read));
	expect(
		(savedData.image as { id?: unknown } | undefined)?.id,
		"the media selector's task-owned asset must be the saved image selection",
	).toBe(media.mediaId);
	expect(savedData.title, "the edited Thai title must read back after the explicit save").toBe(
		`${facilityTitle} (แก้ไข)`,
	);
	const relationChildren = await cmsRequest(
		admin!,
		`/_emdash/api/content/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}/${encodeURIComponent(facility.entryId!)}/references/${encodeURIComponent("facility_services")}/children`,
	);
	expect(relationChildren.ok, "the relation children listing must be readable").toBe(true);
	const childIds = (
		(nativeDataOf(relationChildren)?.children as Array<{ id?: unknown }> | undefined) ?? []
	)
		.map((child) => child.id)
		.filter((id): id is string => typeof id === "string");
	expect(
		childIds,
		"the reference selector's task-owned Service must be the saved relation selection",
	).toContain(service.entryId);
	const assignedTerms = await cmsRequest(
		admin!,
		`/_emdash/api/content/${encodeURIComponent(HEALTH_SERVICE_COLLECTION)}/${encodeURIComponent(facility.entryId!)}/terms/${encodeURIComponent("facility_type")}`,
	);
	expect(assignedTerms.ok, "the entry's facility_type assignments must be readable").toBe(true);
	const assignedSlugs = (
		(nativeDataOf(assignedTerms)?.terms as Array<Record<string, unknown>> | undefined) ?? []
	).map((assigned) => assigned.slug);
	expect(
		assignedSlugs,
		"the taxonomy selector's task-owned synthetic term must be the saved assignment",
	).toContain(term.slug);
});

test("a real native validation error surfaces readably and is corrected (services ลิงก์บริการภายนอก)", async ({
	page,
}) => {
	gate(journeyReadiness);
	// DETECTION-BASED SESSION GATE (see SESSION_PREREQUISITE).
	const searchInput = await requireAdminSession(page, SERVICE_COLLECTION, SERVICE_LABEL);

	// One task-owned Service fixture whose url field starts empty.
	const serviceTitle = uniqueTitle("validation");
	const service = await createSyntheticEntry(admin!, SERVICE_COLLECTION, {
		data: { title: serviceTitle },
	});
	expect(service.result.ok, "the task-owned Service fixture must be created").toBe(true);

	// Find and reopen it in the ordinary list.
	const fragment = serviceTitle.slice(-8);
	await searchInput.fill(fragment);
	await page.getByRole("link", { name: serviceTitle, exact: true }).click();
	await page.waitForURL(new RegExp(`/_emdash/admin/content/${SERVICE_COLLECTION}/[^/]+`));

	// Recognizable Thai labels on this collection's editor too.
	await expect(page.getByText(SERVICE_TITLE_FIELD_LABEL).first()).toBeVisible();
	const urlInput = page.getByLabel(SERVICE_EXTERNAL_URL_FIELD_LABEL);
	await expect(urlInput, "the Thai-labeled url field must be present").toBeVisible();

	// THE ONE AGREED NATIVE VALIDATION ERROR: the url field's input is a
	// plain text input (no browser constraint can intercept this), and the
	// PLATFORM itself renders the readable inline error on blur of an
	// invalid URL — Thai in the th locale, English fallback accepted.
	await urlInput.fill(INVALID_URL_VALUE);
	await urlInput.blur();
	await expect(
		page.getByText(INVALID_URL_ERROR).first(),
		"the native editor must surface the readable url validation error",
	).toBeVisible();

	// Correct it: the error clears when the value becomes valid, and the
	// corrected value survives an explicit Save.
	await urlInput.fill(CORRECTED_URL_VALUE);
	await urlInput.blur();
	await expect(
		page.getByText(INVALID_URL_ERROR).first(),
		"correcting the value must clear the native validation error",
	).toBeHidden();
	const saveButton = page.getByRole("button", { name: SAVE_LABEL }).first();
	await saveButton.click();
	await expect(
		page.getByRole("button", { name: SAVED_LABEL }).first(),
		"the corrected entry must reach the native saved state",
	).toBeVisible();

	const read = await readEntry(admin!, SERVICE_COLLECTION, service.entryId!);
	expect(read.ok, "the corrected fixture must be readable through the native API").toBe(true);
	expect(
		dataOfItem(nativeItemOf(read)).external_url,
		"the corrected url must read back after the explicit save",
	).toBe(CORRECTED_URL_VALUE);
});

test("the domain date stays separate from publication state and system metadata (announcements วันที่ประกาศ)", async ({
	page,
}) => {
	gate(announcementReadiness);
	// DETECTION-BASED SESSION GATE (see SESSION_PREREQUISITE).
	const searchInput = await requireAdminSession(page, ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_LABEL);

	// One task-owned Announcement carrying a fixed synthetic domain date with
	// an explicit +07:00 offset — public synthetic data, not a real event.
	const announcementTitle = uniqueTitle("announcement");
	const announcement = await createSyntheticEntry(admin!, ANNOUNCEMENT_COLLECTION, {
		data: { title: announcementTitle, announcement_at: DOMAIN_DATE_WITH_OFFSET },
	});
	expect(announcement.result.ok, "the task-owned Announcement fixture must be created").toBe(true);

	// Find and reopen it in the ordinary list.
	const fragment = announcementTitle.slice(-8);
	await searchInput.fill(fragment);
	await page.getByRole("link", { name: announcementTitle, exact: true }).click();
	await page.waitForURL(new RegExp(`/_emdash/admin/content/${ANNOUNCEMENT_COLLECTION}/[^/]+`));

	// The domain date is its own Thai-labeled control. The platform renders
	// it as a datetime-local input in the SITE's configured timezone, so the
	// expected value is the stored instant expressed in that timezone.
	const dateInput = page.getByLabel(ANNOUNCEMENT_AT_FIELD_LABEL);
	await expect(dateInput, "the Thai-labeled domain-date field must be present").toBeVisible();
	const expectedLocal = siteLocalInputValue(DOMAIN_DATE_WITH_OFFSET, siteTimezone);
	if (expectedLocal !== undefined) {
		await expect(
			dateInput,
			`the domain date must render in the site timezone (${siteTimezone ?? "UTC"}) as ${expectedLocal}`,
		).toHaveValue(expectedLocal);
	} else {
		expect(
			await dateInput.inputValue(),
			"the domain date input must carry a rendered value even when the site timezone is unreadable",
		).not.toBe("");
	}

	// Publication state is a SEPARATE surfaced concept: the fresh fixture is
	// a draft (ฉบับร่าง), and the system's own timestamps never stand in for
	// the domain date — the API read keeps them distinct values.
	await expect(
		page.getByText(DRAFT_BADGE).first(),
		"the native draft publication state must be surfaced separately from the domain date",
	).toBeVisible();
	const read = await readEntry(admin!, ANNOUNCEMENT_COLLECTION, announcement.entryId!);
	expect(read.ok, "the fixture must be readable through the native API").toBe(true);
	const item = nativeItemOf(read);
	const savedData = dataOfItem(item);
	// EmDash 1.1.0 stores datetimes normalized to UTC ISO (observed on the
	// single runtime: 2026-10-24T09:00:00+07:00 reads back as
	// 2026-10-24T02:00:00.000Z), so the domain date must keep its INSTANT.
	expect(
		Date.parse(String(savedData.announcement_at)),
		`the stored domain date must keep its instant (read back ${String(savedData.announcement_at)})`,
	).toBe(Date.parse(DOMAIN_DATE_WITH_OFFSET));
	const createdAt = typeof item?.createdAt === "string" ? item.createdAt : undefined;
	const updatedAt = typeof item?.updatedAt === "string" ? item.updatedAt : undefined;
	expect(
		createdAt !== undefined && createdAt !== savedData.announcement_at,
		"the system creation timestamp must be a different value from the domain date (FR-030 separation)",
	).toBe(true);
	expect(
		updatedAt !== undefined && updatedAt !== savedData.announcement_at,
		"the system update timestamp must be a different value from the domain date (FR-030 separation)",
	).toBe(true);
});

test("the native gallery repeater: one task-owned image row with its optional caption, saved explicitly (activities แกลเลอรีภาพ)", async ({
	page,
}) => {
	gate(galleryReadiness);
	// DETECTION-BASED SESSION GATE (see SESSION_PREREQUISITE).
	const searchInput = await requireAdminSession(page, ACTIVITIES_COLLECTION, ACTIVITIES_LABEL);

	// Task-owned fixtures: the activity entry and a fresh owned media asset
	// (deduplicate=false keeps the upload a fresh owned fixture).
	const activityTitle = uniqueTitle("gallery");
	const activity = await createSyntheticEntry(admin!, ACTIVITIES_COLLECTION, {
		data: { title: activityTitle },
	});
	expect(activity.result.ok, "the task-owned Activity fixture must be created").toBe(true);
	const mediaFilename = `${SYNTHETIC_FIXTURE_MARK}-gallery-${crypto.randomUUID().slice(0, 8)}.png`;
	const media = await uploadSyntheticMedia(admin!, { filename: mediaFilename });
	expect(media.result.ok, "the task-owned gallery media fixture must upload").toBe(true);
	expect(media.mediaId, "the upload must return a fresh owned media id").toBeTruthy();

	// Find and reopen the fixture in the ordinary list.
	const fragment = activityTitle.slice(-8);
	await searchInput.fill(fragment);
	await page.getByRole("link", { name: activityTitle, exact: true }).click();
	await page.waitForURL(new RegExp(`/_emdash/admin/content/${ACTIVITIES_COLLECTION}/[^/]+`));

	// The gallery is the native repeater under its Thai schema label,
	// initially empty (ยังไม่มีรายการ / No items yet).
	await expect(page.getByText(GALLERY_FIELD_LABEL).first()).toBeVisible();
	await expect(page.getByText(REPEATER_EMPTY_STATE).first()).toBeVisible();

	// Add the FIRST row through the native button (rows render expanded).
	// The image subfield reuses the same ImageFieldRenderer (เลือกรูปภาพ → the
	// same MediaPickerModal, here titled with the subfield's own label เลือก
	// ภาพ) as the top-level image field; the row's control is the newly
	// appeared Select-image button — the count delta pins it, and the gallery
	// renders after featured_image in the applied field order, so the new
	// control is the last one in DOM order.
	const selectMediaButtons = page.getByRole("button", { name: MEDIA_SELECT_LABEL });
	const selectMediaCountBeforeRow = await selectMediaButtons.count();
	await page.getByRole("button", { name: REPEATER_ADD_FIRST_ITEM }).first().click();
	await expect(
		selectMediaButtons,
		"adding the first gallery row must expose exactly one new native Select-image control (the row's required image subfield)",
	).toHaveCount(selectMediaCountBeforeRow + 1);
	// The expanded row surfaces the required image subfield's Thai label
	// (exact text — ภาพ is a prefix of other labels such as ภาพปก).
	await expect(
		page.getByText(GALLERY_IMAGE_SUBFIELD_LABEL, { exact: true }).first(),
	).toBeVisible();
	await selectMediaButtons.last().click();
	const mediaDialog = page.getByRole("dialog");
	await expect(
		mediaDialog.getByText(selectImageDialogTitle(GALLERY_IMAGE_SUBFIELD_LABEL)),
	).toBeVisible();
	await mediaDialog.getByLabel(MEDIA_PICKER_SEARCH).fill(mediaFilename);
	// Clicking the library item only MARKS the selection; the native Select
	// confirmation (เลือก) inside the dialog is what confirms and closes.
	await mediaDialog.getByText(mediaFilename).first().click();
	const confirmButton = mediaDialog.getByRole("button", { name: MEDIA_CONFIRM_LABEL });
	await expect(
		confirmButton,
		"marking the task-owned asset must enable the picker's native Select confirmation",
	).toBeEnabled();
	await confirmButton.click();
	await expect(
		mediaDialog,
		"the media picker must close after the native Select confirmation",
	).toBeHidden();

	// The optional caption subfield (คำบรรยายภาพ) on the same expanded row.
	const caption = `${SYNTHETIC_FIXTURE_MARK} gallery caption`;
	await page.getByLabel(GALLERY_CAPTION_SUBFIELD_LABEL).first().fill(caption);

	// Explicit Save, then the persisted row identity read back through the
	// native API (the repeater emits row values keyed by subField slug).
	const saveButton = page.getByRole("button", { name: SAVE_LABEL }).first();
	await expect(saveButton, "the Save button must enable after the gallery edits").toBeEnabled();
	await saveButton.click();
	await expect(
		page.getByRole("button", { name: SAVED_LABEL }).first(),
		"the native editor must reach its saved state (บันทึกแล้ว/Saved)",
	).toBeVisible();

	const read = await readEntry(admin!, ACTIVITIES_COLLECTION, activity.entryId!);
	expect(read.ok, "the saved fixture must be readable through the native API").toBe(true);
	const gallery = dataOfItem(nativeItemOf(read)).gallery;
	expect(Array.isArray(gallery), "the saved gallery must read back as the native repeater array").toBe(
		true,
	);
	const galleryRow = (gallery as Array<Record<string, unknown>>)[0];
	expect(
		(galleryRow?.image as { id?: unknown } | undefined)?.id,
		"the gallery row's image must be the selected task-owned asset identity",
	).toBe(media.mediaId);
	expect(galleryRow?.caption, "the gallery row's optional caption must read back").toBe(caption);
});

// ---------------------------------------------------------------------------
// Site-timezone rendering of a stored instant (matches the pinned
// toDatetimeLocalInputValue contract: an offset-bearing ISO instant rendered
// as the site-timezone local "YYYY-MM-DDTHH:mm")
// ---------------------------------------------------------------------------

/**
 * The datetime-local input value the native editor shows for a stored
 * offset-bearing instant in the given IANA timezone — computed with the
 * runtime's own Intl support, the same primitive the platform uses. Returns
 * undefined when the instant or the timezone cannot be resolved (the caller
 * then asserts non-emptiness instead of an exact value).
 */
function siteLocalInputValue(stored: string, timezone: string | undefined): string | undefined {
	const instant = new Date(stored);
	if (Number.isNaN(instant.getTime()) || timezone === undefined) return undefined;
	try {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(instant);
		const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
		const hour = get("hour") === "24" ? "00" : get("hour");
		const rendered = `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
		return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rendered) ? rendered : undefined;
	} catch {
		return undefined;
	}
}
