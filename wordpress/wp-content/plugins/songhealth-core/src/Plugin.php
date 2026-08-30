<?php
/**
 * Plugin lifecycle wiring (Delivery 002, T019).
 *
 * Connects the completed foundation modules — configuration (T006), types
 * (T007), capabilities (T008/T009), identity (T010–T012), eligibility
 * (T013), and REST/containment (T014–T018) — to the WordPress request
 * lifecycle. Each module stays a pure declaration; this is the single place
 * that decides when each runs.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-001, FR-004–FR-009,
 *   FR-012, FR-030;
 * - specs/002-headless-wordpress-foundation/plan.md §Design Sequence;
 * - specs/002-headless-wordpress-foundation/tasks.md Phase 2;
 * - .specify/memory/constitution.md I, II.
 *
 * Wiring decisions:
 *
 * - Foundation types and the capability map register on `init`, the
 *   WordPress lifecycle point for post types, meta registration, and roles.
 *   The capability registration is additive and idempotent (T008), so it
 *   reconciles roles on every request without ever retracting authority.
 * - The supported-resource creation service's boundary guards (T012) attach
 *   immediately at plugin load — before any insert can occur in the request
 *   — and remain the ONLY accepted creation boundary for the two supported
 *   types. Containment is scoped by construction to first creation: updates,
 *   autosaves, and revisions of already identified resources pass through
 *   ordinary WordPress paths with identity untouched (FR-005).
 * - Songhealth REST routes register on `rest_api_init`; native anonymous
 *   surface containment (T018) attaches its filters at plugin load so it is
 *   in place for every request path.
 * - The identity registry table is created on plugin activation (T010) and,
 *   when absent, lazily by the registry itself.
 * - Configuration (T006) becomes available to the lifecycle through the
 *   memoized accessor below. Startup VALIDATION that blocks protected work
 *   on invalid configuration is deliberately NOT implemented here: it is the
 *   authorized diagnostics task (T053), and this wiring adds no behavior of
 *   its own around validity.
 *
 * Activation and deactivation remain non-destructive (T005): activation
 * provisions only the registry table and the role/capability grants;
 * deactivation removes nothing, so it can never serve as implicit deletion.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Diagnostics\Configuration;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\RegistrySchema;
use SonghealthCore\Rest\NativeSurfaceContainment;
use SonghealthCore\Rest\Routes;

final class Plugin {

	/** @var Configuration|null Memoized lifecycle configuration. */
	private static $configuration = null;

	/**
	 * Attach the foundation modules to the WordPress lifecycle.
	 *
	 * Called once by the plugin entry point after the module files have
	 * loaded, inside `plugins_loaded` — after WordPress core's default
	 * filters are in place and before any content, REST, or admin lifecycle
	 * point fires.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'init', array( FoundationTypes::class, 'register' ) );
		add_action( 'init', array( CapabilityMap::class, 'register' ) );

		CreateTimePublicId::register();

		add_action( 'rest_api_init', array( Routes::class, 'register' ) );

		NativeSurfaceContainment::register();
	}

	/**
	 * The lifecycle configuration (T006), read once per request from the
	 * environment-separated server sources.
	 *
	 * Availability wiring only: consumers gate on `is_valid()` themselves,
	 * and startup blocking validation belongs to the diagnostics task (T053).
	 *
	 * @return Configuration
	 */
	public static function configuration() {
		if ( null === self::$configuration ) {
			self::$configuration = Configuration::from_environment();
		}
		return self::$configuration;
	}

	/**
	 * Activation: provision the identity registry table (T010) and the role
	 * and capability grants (T008). Creates no content, no user, and no
	 * setting; reverses nothing elsewhere.
	 *
	 * @return void
	 */
	public static function activate() {
		RegistrySchema::create();
		CapabilityMap::register();
	}

	/**
	 * Deactivation: intentionally removes nothing. Songhealth data, options,
	 * roles, capabilities, and configuration survive deactivation so it is
	 * always reversible and never an implicit deletion mechanism.
	 *
	 * @return void
	 */
	public static function deactivate() {
	}
}
