<?php
/**
 * Songhealth least-privilege capability map (Delivery 002, T008).
 *
 * Defines the Songhealth capabilities and maps the four accepted Version 1
 * roles — Viewer, Editor, Publisher, and Administrator — onto them exactly as
 * the Frozen roles baseline freezes them. Nothing is invented here and nothing
 * is left to the caller: the capability names, the role names, the
 * role-to-capability matrices, and the module vocabulary are all fixed
 * declarations.
 *
 * Source of truth:
 *
 * - docs/website-modernization-docs/current/06-roles-permissions.md
 *   §§2.2, 7, 27–29, 39.1–39.3, 39.9, 39.13, 41.8 (FROZEN v1.0);
 * - specs/002-headless-wordpress-foundation/spec.md FR-013, FR-014;
 * - specs/002-headless-wordpress-foundation/research.md §2;
 * - .specify/memory/constitution.md I, II.
 *
 * Identity contract (FR-014): WordPress is and remains the only identity
 * store. The four roles are WordPress roles and role membership is WordPress
 * role membership — there is no Songhealth user table, no parallel role
 * authority, and no per-user capability override.
 *
 * One-role contract (Frozen 06 §§28–29): a user's Songhealth authority is the
 * single Songhealth role they hold. Membership in more than one Songhealth
 * role is never unioned; it resolves deterministically to the highest role
 * held. Songhealth decisions are made against the resolved role's frozen
 * capability set, never against `WP_User->has_cap()`, so a capability granted
 * to an individual user outside a role has no effect on Songhealth
 * authorization.
 *
 * Scope contract (Frozen 06 §§39.1, 40.5, 41.11): Viewer, Editor, and
 * Publisher hold a module scope of at least one module; Administrator holds
 * every module by definition. A non-Administrator whose scope is absent or
 * unrecognized has no scope, and therefore no authority — fail closed.
 *
 * This module defines the map and its registration only. Calling `register()`
 * on plugin activation is T019; the decision primitive that consumes this map
 * is T009.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Authorization;

use SonghealthCore\Content\FoundationTypes;
use WP_User;

final class CapabilityMap {

	/**
	 * The four accepted Version 1 roles as WordPress role slugs.
	 *
	 * Administrator maps onto the WordPress system `administrator` role rather
	 * than a parallel Songhealth copy: the CMS's system administrator is the
	 * Songhealth Administrator, which keeps exactly one administrative
	 * authority and no second identity store. The other three are
	 * Songhealth-specific bundles that WordPress does not ship.
	 */
	const ROLE_VIEWER       = 'songhealth_viewer';
	const ROLE_EDITOR       = 'songhealth_editor';
	const ROLE_PUBLISHER    = 'songhealth_publisher';
	const ROLE_ADMINISTRATOR = 'administrator';

	/** Songhealth modules with capabilities in this Delivery. */
	const MODULE_BASIC_PAGE        = 'basic-page';
	const MODULE_DOCUMENT_RESOURCE = 'document-resource';

	/** User meta key holding a non-Administrator's Songhealth module scope. */
	const META_MODULE_SCOPE = 'songhealth_module_scope';

	/* Basic Page capabilities (Frozen 06 §39.3). */
	const CAP_BASIC_PAGE_VIEW           = 'songhealth_basic_page_view';
	const CAP_BASIC_PAGE_CREATE         = 'songhealth_basic_page_create';
	const CAP_BASIC_PAGE_EDIT_DRAFT     = 'songhealth_basic_page_edit_draft';
	const CAP_BASIC_PAGE_PUBLISH        = 'songhealth_basic_page_publish';
	const CAP_BASIC_PAGE_SAVE_PUBLISHED = 'songhealth_basic_page_save_published';
	const CAP_BASIC_PAGE_LIFECYCLE      = 'songhealth_basic_page_lifecycle';

	/* Document Resource capabilities (Frozen 06 §39.9). */
	const CAP_DOCUMENT_RESOURCE_VIEW              = 'songhealth_document_resource_view';
	const CAP_DOCUMENT_RESOURCE_CREATE            = 'songhealth_document_resource_create';
	const CAP_DOCUMENT_RESOURCE_EDIT_DRAFT        = 'songhealth_document_resource_edit_draft';
	const CAP_DOCUMENT_RESOURCE_PUBLISH           = 'songhealth_document_resource_publish';
	const CAP_DOCUMENT_RESOURCE_SUPERSEDE         = 'songhealth_document_resource_supersede';
	const CAP_DOCUMENT_RESOURCE_ARCHIVE           = 'songhealth_document_resource_archive';
	const CAP_DOCUMENT_RESOURCE_CORRECT_PUBLISHED = 'songhealth_document_resource_correct_published';

	/*
	 * Administrative capabilities (Frozen 06 §39.13): the five the baseline
	 * declares, with Administrator receiving all of them by default. All five
	 * are declared and mapped even though only `permissions_manage` and
	 * `users_manage` are consumed by this Delivery's guardrails — §38 keeps
	 * them independently permissioned administrative domains and the frozen
	 * Administrator bundle is not narrowed by the absence of a consumer. All
	 * five remain Administrator-only (§43.2: audit.view is Administrator-only
	 * by default).
	 */
	const CAP_PERMISSIONS_MANAGE     = 'songhealth_permissions_manage';
	const CAP_USERS_MANAGE           = 'songhealth_users_manage';
	const CAP_AUDIT_VIEW             = 'songhealth_audit_view';
	const CAP_SETTINGS_MANAGE        = 'songhealth_settings_manage';
	const CAP_REFERENCE_DATA_MANAGE  = 'songhealth_reference_data_manage';

	/**
	 * The accepted roles in ascending authority order. The order is also the
	 * deterministic precedence used when a user holds more than one Songhealth
	 * role, so multi-role membership can never be unioned into combined
	 * authority (Frozen 06 §28).
	 *
	 * @return string[]
	 */
	public static function roles() {
		return array( self::ROLE_VIEWER, self::ROLE_EDITOR, self::ROLE_PUBLISHER, self::ROLE_ADMINISTRATOR );
	}

	/**
	 * Human-readable Songhealth name for an accepted role (Frozen 06 §40.4).
	 *
	 * @param string $role Role slug.
	 * @return string
	 */
	public static function role_name( $role ) {
		$names = array(
			self::ROLE_VIEWER        => 'Viewer',
			self::ROLE_EDITOR        => 'Editor',
			self::ROLE_PUBLISHER     => 'Publisher',
			self::ROLE_ADMINISTRATOR => 'Administrator',
		);
		return $names[ $role ] ?? '';
	}

	/**
	 * All declared Songhealth capabilities.
	 *
	 * @return string[]
	 */
	public static function capabilities() {
		return array_merge(
			self::basic_page_capabilities(),
			self::document_resource_capabilities(),
			self::administrative_capabilities()
		);
	}

	/**
	 * Whether a capability name is a declared Songhealth capability. Unknown
	 * names are never treated as a weaker alias of a known one.
	 *
	 * @param string $capability Capability name.
	 * @return bool
	 */
	public static function is_songhealth_capability( $capability ) {
		return in_array( $capability, self::capabilities(), true );
	}

	/**
	 * Basic Page capabilities (Frozen 06 §39.3: View, Create, Edit Draft,
	 * Publish/Schedule, Save Published Changes, Archive/Domain Lifecycle).
	 *
	 * @return string[]
	 */
	public static function basic_page_capabilities() {
		return array(
			self::CAP_BASIC_PAGE_VIEW,
			self::CAP_BASIC_PAGE_CREATE,
			self::CAP_BASIC_PAGE_EDIT_DRAFT,
			self::CAP_BASIC_PAGE_PUBLISH,
			self::CAP_BASIC_PAGE_SAVE_PUBLISHED,
			self::CAP_BASIC_PAGE_LIFECYCLE,
		);
	}

	/**
	 * Document Resource capabilities (Frozen 06 §39.9: View/Use, Create, Edit
	 * Draft, Publish, Supersede, Archive, Correct Published File).
	 *
	 * @return string[]
	 */
	public static function document_resource_capabilities() {
		return array(
			self::CAP_DOCUMENT_RESOURCE_VIEW,
			self::CAP_DOCUMENT_RESOURCE_CREATE,
			self::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT,
			self::CAP_DOCUMENT_RESOURCE_PUBLISH,
			self::CAP_DOCUMENT_RESOURCE_SUPERSEDE,
			self::CAP_DOCUMENT_RESOURCE_ARCHIVE,
			self::CAP_DOCUMENT_RESOURCE_CORRECT_PUBLISHED,
		);
	}

	/**
	 * The five administrative capabilities the Frozen baseline declares
	 * (Frozen 06 §39.13). Administrator receives all of them by default; no
	 * other role receives any.
	 *
	 * @return string[]
	 */
	public static function administrative_capabilities() {
		return array(
			self::CAP_PERMISSIONS_MANAGE,
			self::CAP_USERS_MANAGE,
			self::CAP_AUDIT_VIEW,
			self::CAP_SETTINGS_MANAGE,
			self::CAP_REFERENCE_DATA_MANAGE,
		);
	}

	/**
	 * The capabilities of one accepted role, from the frozen matrices.
	 *
	 * Basic Page (§39.3) and Document Resource (§39.9):
	 *
	 * | Action                      | Viewer | Editor | Publisher | Administrator |
	 * |-----------------------------|--------|--------|-----------|---------------|
	 * | View                        |   ✓    |   ✓    |    ✓      |      ✓        |
	 * | Create                      |   —    |   ✓    |    ✓      |      ✓        |
	 * | Edit Draft                  |   —    |   ✓    |    ✓      |      ✓        |
	 * | Publish / Schedule          |   —    |   —    |    ✓      |      ✓        |
	 * | Save Published Changes      |   —    |   —    |    ✓      |      ✓        |
	 * | Archive / Domain Lifecycle  |   —    |   —    |    ✓      |      ✓        |
	 * | Supersede (Document)        |   —    |   —    |    ✓      |      ✓        |
	 * | Correct Published File      |   —    |   —    |    —      |      ✓        |
	 * | Administrative capabilities |   —    |   —    |    —      |      ✓        |
	 *
	 * @param string $role Role slug.
	 * @return string[]
	 */
	public static function role_capabilities( $role ) {
		switch ( $role ) {
			case self::ROLE_VIEWER:
				return array(
					self::CAP_BASIC_PAGE_VIEW,
					self::CAP_DOCUMENT_RESOURCE_VIEW,
				);

			case self::ROLE_EDITOR:
				return array(
					self::CAP_BASIC_PAGE_VIEW,
					self::CAP_BASIC_PAGE_CREATE,
					self::CAP_BASIC_PAGE_EDIT_DRAFT,
					self::CAP_DOCUMENT_RESOURCE_VIEW,
					self::CAP_DOCUMENT_RESOURCE_CREATE,
					self::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT,
				);

			case self::ROLE_PUBLISHER:
				return array(
					self::CAP_BASIC_PAGE_VIEW,
					self::CAP_BASIC_PAGE_CREATE,
					self::CAP_BASIC_PAGE_EDIT_DRAFT,
					self::CAP_BASIC_PAGE_PUBLISH,
					self::CAP_BASIC_PAGE_SAVE_PUBLISHED,
					self::CAP_BASIC_PAGE_LIFECYCLE,
					self::CAP_DOCUMENT_RESOURCE_VIEW,
					self::CAP_DOCUMENT_RESOURCE_CREATE,
					self::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT,
					self::CAP_DOCUMENT_RESOURCE_PUBLISH,
					self::CAP_DOCUMENT_RESOURCE_SUPERSEDE,
					self::CAP_DOCUMENT_RESOURCE_ARCHIVE,
				);

			case self::ROLE_ADMINISTRATOR:
				return array(
					self::CAP_BASIC_PAGE_VIEW,
					self::CAP_BASIC_PAGE_CREATE,
					self::CAP_BASIC_PAGE_EDIT_DRAFT,
					self::CAP_BASIC_PAGE_PUBLISH,
					self::CAP_BASIC_PAGE_SAVE_PUBLISHED,
					self::CAP_BASIC_PAGE_LIFECYCLE,
					self::CAP_DOCUMENT_RESOURCE_VIEW,
					self::CAP_DOCUMENT_RESOURCE_CREATE,
					self::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT,
					self::CAP_DOCUMENT_RESOURCE_PUBLISH,
					self::CAP_DOCUMENT_RESOURCE_SUPERSEDE,
					self::CAP_DOCUMENT_RESOURCE_ARCHIVE,
					self::CAP_DOCUMENT_RESOURCE_CORRECT_PUBLISHED,
					self::CAP_PERMISSIONS_MANAGE,
					self::CAP_USERS_MANAGE,
					self::CAP_AUDIT_VIEW,
					self::CAP_SETTINGS_MANAGE,
					self::CAP_REFERENCE_DATA_MANAGE,
				);
		}
		return array();
	}

	/**
	 * Whether an accepted role holds a Songhealth capability.
	 *
	 * @param string $role       Role slug.
	 * @param string $capability Capability name.
	 * @return bool
	 */
	public static function role_has_capability( $role, $capability ) {
		if ( ! in_array( $role, self::roles(), true ) ) {
			return false;
		}
		return in_array( $capability, self::role_capabilities( $role ), true );
	}

	/**
	 * The modules a capability belongs to. Administrative capabilities are not
	 * module-scoped; module capabilities belong to exactly one module.
	 *
	 * @param string $capability Capability name.
	 * @return string[]
	 */
	public static function capability_modules( $capability ) {
		if ( in_array( $capability, self::basic_page_capabilities(), true ) ) {
			return array( self::MODULE_BASIC_PAGE );
		}
		if ( in_array( $capability, self::document_resource_capabilities(), true ) ) {
			return array( self::MODULE_DOCUMENT_RESOURCE );
		}
		return array();
	}

	/**
	 * The declared Songhealth modules.
	 *
	 * @return string[]
	 */
	public static function modules() {
		return array( self::MODULE_BASIC_PAGE, self::MODULE_DOCUMENT_RESOURCE );
	}

	/**
	 * Whether a module name is a declared Songhealth module.
	 *
	 * @param string $module Module name.
	 * @return bool
	 */
	public static function is_songhealth_module( $module ) {
		return in_array( $module, self::modules(), true );
	}

	/**
	 * Resolve a user's single Songhealth role, or null when they hold none.
	 *
	 * WordPress allows a user to carry several roles. This never unions them:
	 * the resolved role is the highest accepted role present, and only that
	 * role's frozen capability set ever applies (Frozen 06 §28). A user whose
	 * roles include no accepted Songhealth role — including every built-in
	 * WordPress role except `administrator` — resolves to null and holds no
	 * Songhealth authority at all.
	 *
	 * @param WP_User $user User to resolve.
	 * @return string|null
	 */
	public static function resolve_role( $user ) {
		if ( ! $user instanceof WP_User ) {
			return null;
		}

		$held = array();
		$membership = (array) $user->roles;
		foreach ( self::roles() as $role ) {
			if ( in_array( $role, $membership, true ) ) {
				$held[] = $role;
			}
		}

		if ( array() === $held ) {
			return null;
		}
		return $held[ count( $held ) - 1 ];
	}

	/**
	 * The Songhealth decision for a capability: does the user's single
	 * resolved role hold it?
	 *
	 * This is the only capability question Songhealth asks. It deliberately
	 * bypasses `WP_User->has_cap()`, so a capability attached to an individual
	 * user rather than to a role cannot grant Songhealth authority (Frozen 06
	 * §29: no per-user permission overrides).
	 *
	 * @param WP_User $user       User to evaluate.
	 * @param string  $capability Capability name.
	 * @return bool
	 */
	public static function user_can( $user, $capability ) {
		$role = self::resolve_role( $user );
		if ( null === $role ) {
			return false;
		}
		return self::role_has_capability( $role, $capability );
	}

	/**
	 * The modules a user's authority applies to.
	 *
	 * Administrator holds every module by definition and never reads a scope
	 * list (Frozen 06 §§39.1, 40.10). Every other role reads its stored module
	 * scope, reduced to the declared module vocabulary; anything unrecognized
	 * is discarded, and an empty result means no authority in any module
	 * (Frozen 06 §41.11: an active non-Administrator must not be left with a
	 * zero-module scope — that state fails closed here until corrected).
	 *
	 * @param WP_User $user User to evaluate.
	 * @return string[]
	 */
	public static function module_scope( $user ) {
		if ( ! $user instanceof WP_User ) {
			return array();
		}
		if ( self::ROLE_ADMINISTRATOR === self::resolve_role( $user ) ) {
			return self::modules();
		}

		$stored = get_user_meta( $user->ID, self::META_MODULE_SCOPE, true );
		if ( ! is_array( $stored ) ) {
			return array();
		}

		$scope = array();
		foreach ( self::modules() as $module ) {
			if ( in_array( $module, $stored, true ) ) {
				$scope[] = $module;
			}
		}
		return $scope;
	}

	/**
	 * Register the roles and their capabilities in WordPress.
	 *
	 * Adds the three Songhealth roles WordPress does not ship and grants the
	 * frozen capability sets to them and to the WordPress `administrator`
	 * role. The grant is additive and idempotent: an already-present role or
	 * capability is left intact rather than removed, because retracting
	 * authority is a separately reviewed change, never a registration
	 * side effect. Consistent with the accepted entry point, nothing is
	 * removed anywhere — not on deactivation, not here.
	 *
	 * Alongside the Songhealth capabilities, each role receives the WordPress
	 * primitive capabilities its level needs for Core's own screens and
	 * meta-capability mapping to function at all. Those primitives carry no
	 * Songhealth meaning and are always narrower than the Songhealth level:
	 * no role below Administrator receives any delete primitive, because hard
	 * delete is Administrator-only by default (Frozen 06 §§10, 43.3), and no
	 * role below Publisher receives any publish primitive.
	 *
	 * @return void
	 */
	public static function register() {
		foreach ( self::wordpress_role_capabilities() as $role_slug => $capabilities ) {
			$role = get_role( $role_slug );
			if ( ! $role ) {
				/*
				 * WordPress requires the initial capability grant as a
				 * `capability => bool` map. `wordpress_role_capabilities()`
				 * returns a list of names, so it is converted here — passing
				 * the list directly would store numeric keys and provision the
				 * role with none of its capabilities on a clean installation.
				 */
				add_role( $role_slug, self::role_name( $role_slug ), array_fill_keys( $capabilities, true ) );
				continue;
			}
			foreach ( $capabilities as $capability ) {
				$role->add_cap( $capability );
			}
		}
	}

	/**
	 * The full WordPress capability grant per accepted role: the frozen
	 * Songhealth capabilities plus the WordPress primitives that level needs.
	 *
	 * @return array<string, string[]>
	 */
	public static function wordpress_role_capabilities() {
		$both_primitives = array();
		foreach ( FoundationTypes::supported_types() as $post_type ) {
			$both_primitives = array_merge( $both_primitives, FoundationTypes::primitive_capabilities( $post_type ) );
		}

		$editor_primitives = array( 'read', 'upload_files' );
		foreach ( $both_primitives as $capability ) {
			if ( 0 === strpos( $capability, 'delete_' ) ) {
				continue;
			}
			if ( 0 === strpos( $capability, 'publish_' ) ) {
				continue;
			}
			/*
			 * Editing already-published content is a public-impact action:
			 * Editor primitives stop at draft-level editing, and the
			 * published-content primitives are added at Publisher level below
			 * (Frozen 06 §§11, 13).
			 */
			if ( 0 === strpos( $capability, 'edit_published_' ) ) {
				continue;
			}
			$editor_primitives[] = $capability;
		}

		$publisher_primitives = $editor_primitives;
		foreach ( $both_primitives as $capability ) {
			if ( 0 === strpos( $capability, 'publish_' ) || 0 === strpos( $capability, 'edit_published_' ) ) {
				$publisher_primitives[] = $capability;
			}
		}

		return array(
			self::ROLE_VIEWER        => array( 'read', self::CAP_BASIC_PAGE_VIEW, self::CAP_DOCUMENT_RESOURCE_VIEW ),
			self::ROLE_EDITOR        => array_merge( $editor_primitives, self::role_capabilities( self::ROLE_EDITOR ) ),
			self::ROLE_PUBLISHER     => array_merge( $publisher_primitives, self::role_capabilities( self::ROLE_PUBLISHER ) ),
			self::ROLE_ADMINISTRATOR => array_merge( $both_primitives, self::role_capabilities( self::ROLE_ADMINISTRATOR ) ),
		);
	}
}
