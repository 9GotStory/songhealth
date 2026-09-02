<?php
/**
 * Plugin Name: Songhealth Core
 * Description: First-party Songhealth foundation plugin boundary for the headless WordPress architecture. Owns Songhealth-specific semantics and safeguards; this batch intentionally adds no Product behavior beyond safe activation, deactivation, and module loading.
 * Version: 0.1.0
 * Requires PHP: 8.3
 *
 * Delivery 002, T005: the first-party plugin entry point. WordPress Core
 * supplies commodity CMS infrastructure and songhealth-core owns Songhealth
 * semantics (FR-001). The module files below own the declarations; the
 * lifecycle wiring lives in src/Plugin.php (T019), which this entry point
 * attaches after loading the modules. Preview, binary delivery, and the
 * safe diagnostics/startup-validation modules are loaded below as completed
 * declarations of their own authorized tasks (T035/T043/T044, T052/T053).
 *
 * @package SonghealthCore
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( defined( 'SONGHEALTH_CORE_VERSION' ) ) {
	return;
}

define( 'SONGHEALTH_CORE_VERSION', '0.1.0' );
define( 'SONGHEALTH_CORE_FILE', __FILE__ );
define( 'SONGHEALTH_CORE_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Modules owned by songhealth-core, as repository-relative paths under
 * SONGHEALTH_CORE_DIR.
 *
 * Each entry is a completed module definition loaded on the normal plugin
 * load order; final lifecycle wiring is T019. Loaded in dependency order:
 * the authorization modules reference the content and capability
 * declarations that precede them.
 *
 * - src/Diagnostics/Configuration.php (T006) — allowlisted, environment-
 *   separated, fail-closed configuration schema; no secret is ever exposed.
 * - src/Content/FoundationTypes.php (T007) — the two non-public foundation
 *   custom post types and their metadata schemas.
 * - src/Authorization/CapabilityMap.php (T008) — least-privilege Songhealth
 *   capabilities and the accepted four-role mapping.
 * - src/Authorization/AuthorizationService.php (T009) — default-deny
 *   authorization decision primitives.
 * - src/Identity/RegistrySchema.php (T010) — the plugin-owned identity
 *   registry table with unique public_id, unique (resource_type,
 *   internal_post_id), and retained tombstone mappings.
 * - src/Identity/PublicIdRegistry.php (T011) — canonical UUIDv7 generation
 *   and validation, lookups, collision-safe insertion, and the
 *   non-reassignment/non-recycling registry operations.
 * - src/Identity/CreateTimePublicId.php (T012) — create-time issuance
 *   enforcement: atomic-or-compensated Public ID before the first successful
 *   creation (including Draft) is reported, and no update/caller mutation.
 * - src/Eligibility/PublicEligibility.php (T013) — the shared current
 *   public-eligibility decision for the two supported types.
 * - src/Rest/NeutralResponse.php (T014) — neutral public denial and bounded
 *   invalid-input/unexpected-failure responses.
 * - src/Rest/PublicProjector.php (T015) — the explicit Basic Page and
 *   Document Resource public projectors.
 * - src/Rest/ReferenceProjection.php (G07-B01/FR-031) — the response-scoped
 *   bounded Document Resource reference projection context.
 * - src/Rest/Routes.php (T016) — the approved songhealth/v1 route shapes.
 * - src/Rest/EligibleResourceQuery.php (T017) — eligibility-first bounded
 *   resource queries with eligible-only totals.
 * - src/Rest/NativeSurfaceContainment.php (T018) — anonymous native surface
 *   containment.
 * - src/Rest/PublicResourcesController.php (T025) — the eligible-only detail
 *   and bounded opaque-continuation listing controllers for the US1 public
 *   contract.
 * - src/Content/AdminExperience.php (T033) — the bounded Songhealth wp-admin
 *   experience for the two foundation types: work-language metaboxes, the
 *   read-only Public ID display, bounded validation messages, capability-aware
 *   actions, and accepted creation routed through the creation service.
 * - src/Preview/PreviewGrant.php (T034) — short-lived single-purpose opaque
 *   signed Preview grants bound to user/resource/revision/audience/purpose,
 *   carrying no content and no credential.
 * - src/Preview/PreviewController.php (T035) — Preview initiation and
 *   retrieval with current session, fresh authorization, supplemental
 *   nonce/origin defenses, the bounded candidate projection, neutral denial,
 *   and private/no-store/noindex responses.
 * - src/Binary/ProtectedAttachment.php (T042) — the one-to-one Document
 *   Resource → protected attachment relationship with safe metadata
 *   validation and server-denied protected storage.
 * - src/Binary/BinaryController.php (T043) — anonymous protected binary
 *   delivery by Public ID with fresh owning-Document eligibility, bounded
 *   ranges, conservative caching, and neutral denial.
 * - src/Binary/PreviewBinaryController.php (T044) — the separate
 *   session-bound Preview binary surface re-using the accepted Gate 04
 *   Preview authorization semantics.
 * - src/Diagnostics/DiagnosticsController.php (T052) — the minimal public
 *   liveness response and the currently authorized protected diagnostics
 *   report: stable category/status output with a safe correlation code and
 *   no protected environment values.
 * - src/Diagnostics/StartupValidator.php (T053) — fail-closed startup
 *   validation: withholds the data-bearing REST surfaces and refuses new
 *   resource acceptance while the configuration is invalid, preserving
 *   bounded actionable operator evidence.
 * - src/Plugin.php (T019) — the lifecycle wiring module.
 *
 * Loading a module defines its declarations only. No module adds a WordPress
 * hook of its own; the single wiring decision is `SonghealthCore\Plugin::register()`,
 * which this entry point calls after the modules have loaded (T019).
 *
 * @return string[]
 */
function songhealth_core_modules() {
	return array(
		'src/Diagnostics/Configuration.php',
		'src/Content/FoundationTypes.php',
		'src/Authorization/CapabilityMap.php',
		'src/Authorization/AuthorizationService.php',
		'src/Identity/RegistrySchema.php',
		'src/Identity/PublicIdRegistry.php',
		'src/Identity/CreateTimePublicId.php',
		'src/Eligibility/PublicEligibility.php',
		'src/Rest/NeutralResponse.php',
		'src/Rest/PublicProjector.php',
		'src/Rest/ReferenceProjection.php',
		'src/Rest/Routes.php',
		'src/Rest/EligibleResourceQuery.php',
		'src/Rest/NativeSurfaceContainment.php',
		'src/Rest/PublicResourcesController.php',
		'src/Content/AdminExperience.php',
		'src/Preview/PreviewGrant.php',
		'src/Preview/PreviewController.php',
		'src/Binary/ProtectedAttachment.php',
		'src/Binary/BinaryController.php',
		'src/Binary/PreviewBinaryController.php',
		'src/Diagnostics/DiagnosticsController.php',
		'src/Diagnostics/StartupValidator.php',
		'src/Plugin.php',
	);
}

/**
 * Load the registered songhealth-core modules on the normal plugin load
 * order, then attach the lifecycle wiring. Loading is require_once-based, so
 * a double fire of `plugins_loaded` cannot redeclare module code or wire the
 * lifecycle twice.
 *
 * @return void
 */
function songhealth_core_load_modules() {
	foreach ( songhealth_core_modules() as $module ) {
		require_once SONGHEALTH_CORE_DIR . $module;
	}
	SonghealthCore\Plugin::register();
}
add_action( 'plugins_loaded', 'songhealth_core_load_modules' );

/**
 * Safe activation: records the active plugin version for future upgrade
 * detection and provisions the foundation surfaces owned by activation —
 * the identity registry table (T010) and the role/capability grants (T008).
 * Creates no Product data, no user, no content, and no setting beyond the
 * one non-public bookkeeping value.
 *
 * @return void
 */
function songhealth_core_activate() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	update_option( 'songhealth_core_version', SONGHEALTH_CORE_VERSION, false );
	SonghealthCore\Plugin::activate();
}
register_activation_hook( __FILE__, 'songhealth_core_activate' );

/**
 * Safe deactivation: intentionally removes nothing. Songhealth data,
 * options, roles, capabilities, and configuration survive deactivation so
 * deactivation is always reversible and can never be used as an implicit
 * deletion or retirement mechanism.
 *
 * @return void
 */
function songhealth_core_deactivate() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	SonghealthCore\Plugin::deactivate();
}
register_deactivation_hook( __FILE__, 'songhealth_core_deactivate' );
