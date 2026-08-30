<?php
/**
 * Plugin Name: Songhealth Core
 * Description: First-party Songhealth foundation plugin boundary for the headless WordPress architecture. Owns Songhealth-specific semantics and safeguards; this batch intentionally adds no Product behavior beyond safe activation, deactivation, and module loading.
 * Version: 0.1.0
 * Requires PHP: 8.3
 *
 * Delivery 002, T005: the first-party plugin entry point. WordPress Core
 * supplies commodity CMS infrastructure and songhealth-core owns Songhealth
 * semantics (FR-001). Module wiring for configuration, content types,
 * authorization, identity, eligibility, REST, Preview, binary delivery, and
 * diagnostics belongs to their own authorized tasks (T006+) and is
 * deliberately absent here.
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
 *
 * Loading a module defines its declarations only. No module adds a WordPress
 * hook of its own, so registering types, roles, or validation into the live
 * request lifecycle remains T019's wiring decision, not a side effect of this
 * list.
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
	);
}

/**
 * Load the registered songhealth-core modules on the normal plugin load
 * order. Loading is require_once-based, so a double fire of `plugins_loaded`
 * cannot redeclare module code.
 *
 * @return void
 */
function songhealth_core_load_modules() {
	foreach ( songhealth_core_modules() as $module ) {
		require_once SONGHEALTH_CORE_DIR . $module;
	}
}
add_action( 'plugins_loaded', 'songhealth_core_load_modules' );

/**
 * Safe activation: records the active plugin version for future upgrade
 * detection only. Creates no Product data, no user, role, or capability
 * change, no content type, table, endpoint, or setting beyond this one
 * non-public bookkeeping value.
 *
 * @return void
 */
function songhealth_core_activate() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	update_option( 'songhealth_core_version', SONGHEALTH_CORE_VERSION, false );
}
register_activation_hook( __FILE__, 'songhealth_core_activate' );

/**
 * Safe deactivation: intentionally removes nothing. Songhealth data,
 * options, and configuration survive deactivation so deactivation is always
 * reversible and can never be used as an implicit deletion or retirement
 * mechanism.
 *
 * @return void
 */
function songhealth_core_deactivate() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
}
register_deactivation_hook( __FILE__, 'songhealth_core_deactivate' );
