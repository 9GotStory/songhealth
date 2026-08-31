<?php
/**
 * Authorization boundary integration tests (Delivery 002, T030 / US2).
 *
 * Proves the accepted default-deny authorization primitives (T008/T009)
 * against the live WordPress identity store: the frozen role/capability
 * matrices, actor/action/scope/object/field/lifecycle/relationship context,
 * nonce-not-authorization, self-escalation denial, last-Administrator
 * protection, and next-request revocation/demotion through both the decision
 * primitive and the live Preview REST surface (FR-013, FR-014, FR-016,
 * FR-017; quickstart.md §7; SC-005).
 *
 * EXPECTED RED before T035: the two cases that drive the live Preview route
 * fail, because the pre-controller Preview handler always answers the
 * neutral class. Every decision-primitive case pins already-accepted T009
 * behavior and must be green from the start.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-013,
 * FR-014, FR-016, FR-017; specs/002-headless-wordpress-foundation/
 * contracts/preview.md; docs/website-modernization-docs/current/
 * 06-roles-permissions.md §§28–29, 33–34, 39–43 (FROZEN v1.0).
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Authorization\AuthorizationService;
use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\Routes;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group authorization
 * @group us2
 */
class AuthorizationBoundaryTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** Staff fixtures created for the matrix, keyed by role slug. */
	private $staff = array();

	public function set_up() {
		parent::set_up();

		/*
		 * The live-Preview cases read the lifecycle configuration, which
		 * memoizes per request: supply the complete valid server
		 * configuration before the first access and reset the memo.
		 */
		putenv( 'SONGHEALTH_ENVIRONMENT=development' );
		putenv( 'SONGHEALTH_PUBLIC_ORIGIN=http://127.0.0.1:4173' );
		putenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY=T030-contract-verification-signing-key-0123456789abcdef' );
		$reset = new \ReflectionProperty( \SonghealthCore\Plugin::class, 'configuration' );
		$reset->setAccessible( true );
		$reset->setValue( null, null );

		foreach ( array( 'songhealth_viewer', 'songhealth_editor', 'songhealth_publisher' ) as $role ) {
			$this->staff[ $role ] = $this->ensure_user( 'boundary_' . str_replace( 'songhealth_', '', $role ), $role );
		}
		wp_set_current_user( 0 );
	}

	/**
	 * Ensure a staff fixture exists exactly once.
	 *
	 * The creation service commits its bounded transaction, which also commits
	 * the test framework's isolation transaction for its own rows; a fixture
	 * user created in an earlier test of the same suite therefore survives
	 * that test's rollback. Re-creating it unconditionally would collide on
	 * the unique login, so an existing fixture is looked up and reused.
	 *
	 * @param string $login Fixture login.
	 * @param string $role  Songhealth role slug.
	 * @return int User ID.
	 */
	private function ensure_user( $login, $role ) {
		$existing = get_user_by( 'slug', $login );
		$user_id  = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => $login,
					'role'       => $role,
				)
			);

		/* Re-normalize the fixture: an escaped mid-test mutation must not leak into the next case. */
		wp_update_user( array( 'ID' => $user_id, 'role' => $role ) );
		update_user_meta( $user_id, CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );
		delete_user_meta( $user_id, AuthorizationService::META_ACCOUNT_STATUS );
		return $user_id;
	}

	public function tear_down() {
		wp_set_current_user( 0 );
		parent::tear_down();
		$this->songhealth_delete_tracked_records();

		/*
		 * The framework unregisters every registered meta key after each
		 * test (WP_UnitTestCase::unregister_all_meta_keys), while the
		 * foundation metadata registers once per process on init. Restore
		 * the registration so the suites that follow this file observe the
		 * same lifecycle state it started from.
		 */
		foreach ( FoundationTypes::supported_types() as $post_type ) {
			FoundationTypes::register_metadata( $post_type );
		}
	}

	/**
	 * Create an accepted Draft Basic Page fixture owned by an editor.
	 *
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_draft_page() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Authorization Boundary Fixture',
				'post_name'   => 'authorization-boundary-fixture',
				'post_status' => 'draft',
				'post_author' => $this->staff['songhealth_editor'],
			)
		);
		$this->assertIsArray( $created, 'fixture creation must succeed through the accepted boundary' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/** @test */
	public function test_the_frozen_role_capability_matrices_are_enforced() {
		$matrix = array(
			'songhealth_viewer'    => array(
				CapabilityMap::CAP_BASIC_PAGE_VIEW           => true,
				CapabilityMap::CAP_BASIC_PAGE_CREATE         => false,
				CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT     => false,
				CapabilityMap::CAP_BASIC_PAGE_PUBLISH        => false,
				CapabilityMap::CAP_BASIC_PAGE_SAVE_PUBLISHED => false,
			),
			'songhealth_editor'    => array(
				CapabilityMap::CAP_BASIC_PAGE_VIEW           => true,
				CapabilityMap::CAP_BASIC_PAGE_CREATE         => true,
				CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT     => true,
				CapabilityMap::CAP_BASIC_PAGE_PUBLISH        => false,
				CapabilityMap::CAP_BASIC_PAGE_SAVE_PUBLISHED => false,
			),
			'songhealth_publisher' => array(
				CapabilityMap::CAP_BASIC_PAGE_VIEW           => true,
				CapabilityMap::CAP_BASIC_PAGE_CREATE         => true,
				CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT     => true,
				CapabilityMap::CAP_BASIC_PAGE_PUBLISH        => true,
				CapabilityMap::CAP_BASIC_PAGE_SAVE_PUBLISHED => true,
			),
		);

		foreach ( $matrix as $role => $expectations ) {
			foreach ( $expectations as $capability => $allowed ) {
				$decision = AuthorizationService::decide(
					array(
						'actor'      => $this->staff[ $role ],
						'capability' => $capability,
						'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					)
				);
				$this->assertSame(
					$allowed,
					$decision->allowed(),
					"{$role} / {$capability} must follow the frozen matrix"
				);
			}
		}

		/* The WordPress system administrator is the Songhealth Administrator (FR-014). */
		$administrator = $this->ensure_user( 'boundary_admin', 'administrator' );
		$decision = AuthorizationService::decide(
			array(
				'actor'      => $administrator,
				'capability' => CapabilityMap::CAP_DOCUMENT_RESOURCE_CORRECT_PUBLISHED,
				'module'     => CapabilityMap::MODULE_DOCUMENT_RESOURCE,
			)
		);
		$this->assertTrue( $decision->allowed(), 'administrator holds the document correct-published capability' );
		/*
		 * Administrative capabilities are not module-scoped (T008): the
		 * module-aware decision has no module for them and denies, which is
		 * why they are exercised through the administrative decisions below
		 * and in the self-escalation case.
		 */
		$this->assertSame(
			AuthorizationService::REASON_MODULE_UNKNOWN,
			AuthorizationService::decide(
				array(
					'actor'      => $administrator,
					'capability' => CapabilityMap::CAP_PERMISSIONS_MANAGE,
				)
			)->reason()
		);
	}

	/** @test */
	public function test_default_deny_closes_every_unrecognized_dimension() {
		$page    = $this->create_draft_page();
		$editor  = $this->staff['songhealth_editor'];

		/* An unknown capability name is never a weaker alias of a known one. */
		$this->assertSame(
			AuthorizationService::REASON_CAPABILITY_UNKNOWN,
			AuthorizationService::decide(
				array( 'actor' => $editor, 'capability' => 'songhealth_basic_page_admin' )
			)->reason()
		);
		/* An unrecognized request key denies the whole request (no smuggling). */
		$this->assertSame(
			AuthorizationService::REASON_REQUEST_UNSAFE,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'bypass'     => true,
				)
			)->reason()
		);
		/* An unknown module and a capability/module mismatch deny. */
		$this->assertSame(
			AuthorizationService::REASON_MODULE_UNKNOWN,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => 'announcement',
				)
			)->reason()
		);
		$this->assertSame(
			AuthorizationService::REASON_MODULE_MISMATCH,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_DOCUMENT_RESOURCE,
				)
			)->reason()
		);
		/* Anonymous and disabled actors deny before any object work. */
		$this->assertSame(
			AuthorizationService::REASON_ACTOR_ANONYMOUS,
			AuthorizationService::decide(
				array( 'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW, 'module' => CapabilityMap::MODULE_BASIC_PAGE )
			)->reason()
		);
		update_user_meta( $editor, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_DISABLED );
		$this->assertSame(
			AuthorizationService::REASON_ACTOR_DISABLED,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
				)
			)->reason()
		);
		delete_user_meta( $editor, AuthorizationService::META_ACCOUNT_STATUS );

		/* Object context: absent, unsupported type, and wrong-module objects deny. */
		$this->assertSame(
			AuthorizationService::REASON_OBJECT_ABSENT,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => 990001,
				)
			)->reason()
		);
		$foreign = (int) self::factory()->post->create( array( 'post_type' => 'post', 'post_status' => 'publish' ) );
		$this->assertSame(
			AuthorizationService::REASON_OBJECT_UNSUPPORTED,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $foreign,
				)
			)->reason()
		);

		/* Field context: identity and audit fields are protected outright. */
		$this->assertSame(
			AuthorizationService::REASON_FIELD_PROTECTED,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
					'fields'     => array( 'public_id' ),
				)
			)->reason()
		);
		$this->assertSame(
			AuthorizationService::REASON_FIELD_NOT_ALLOWED,
			AuthorizationService::decide(
				array(
					'actor'      => $editor,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
					'fields'     => array( 'internal_audit_note' ),
				)
			)->reason()
		);
	}

	/** @test */
	public function test_scope_and_lifecycle_context_narrow_every_decision() {
		$page = $this->create_draft_page();

		/* Scope: a non-Administrator outside the module has no authority there. */
		update_user_meta( $this->staff['songhealth_editor'], CapabilityMap::META_MODULE_SCOPE, array( CapabilityMap::MODULE_DOCUMENT_RESOURCE ) );
		$this->assertSame(
			AuthorizationService::REASON_MODULE_OUT_OF_SCOPE,
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_editor'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
				)
			)->reason()
		);
		/* An absent or unrecognized scope fails closed the same way. */
		update_user_meta( $this->staff['songhealth_editor'], CapabilityMap::META_MODULE_SCOPE, array() );
		$this->assertSame(
			AuthorizationService::REASON_MODULE_OUT_OF_SCOPE,
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_editor'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
				)
			)->reason()
		);
		update_user_meta( $this->staff['songhealth_editor'], CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );

		/* Lifecycle: draft editing applies to Draft, not to the published state. */
		$this->assertTrue(
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_editor'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->allowed()
		);
		wp_update_post(
			array(
				'ID'          => $page['post_id'],
				'post_status' => 'publish',
			)
		);
		$this->assertSame(
			AuthorizationService::REASON_LIFECYCLE_NOT_ALLOWED,
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_editor'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->reason()
		);
		/* View applies in every state, including the withdrawn state. */
		update_post_meta( $page['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$this->assertTrue(
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_viewer'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->allowed()
		);
	}

	/** @test */
	public function test_a_relationship_never_confers_or_elevates_authority() {
		$page = $this->create_draft_page();

		$this->assertSame(
			AuthorizationService::REASON_RELATIONSHIP_ELEVATION,
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_viewer'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
					'via'        => array(
						'relationship'    => 'document_reference',
						'confers_authority' => true,
					),
				)
			)->reason()
		);
		/* A plain relationship declaration narrows nothing and grants nothing. */
		$this->assertTrue(
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_viewer'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
					'via'        => array( 'relationship' => 'document_reference' ),
				)
			)->allowed()
		);
	}

	/** @test */
	public function test_a_nonce_is_never_authorization() {
		$page = $this->create_draft_page();

		/*
		 * A perfectly valid REST nonce minted for an actor without the
		 * capability changes nothing: the decision primitive takes no nonce
		 * input at all, and the live Preview surface denies with the neutral
		 * class even when a valid nonce header is attached to the request.
		 */
		wp_set_current_user( $this->staff['songhealth_viewer'] );
		$valid_nonce = wp_create_nonce( 'wp_rest' );
		$this->assertSame( 1, wp_verify_nonce( $valid_nonce, 'wp_rest' ), 'the nonce itself is valid' );

		$this->assertFalse(
			AuthorizationService::decide(
				array(
					'actor'      => $this->staff['songhealth_viewer'],
					'capability' => CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->allowed(),
			'the viewer holds edit authority through no channel'
		);

		$request = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/basic-page/' . rawurlencode( (string) $page['public_id'] )
		);
		$request->set_header( 'X-WP-Nonce', $valid_nonce );
		$_SERVER['HTTP_ORIGIN'] = 'http://127.0.0.1:4173';
		$response               = rest_do_request( $request );
		unset( $_SERVER['HTTP_ORIGIN'] );

		$this->assertSame( 404, $response->get_status(), 'a valid nonce grants nothing on the privileged surface' );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'] );

		/* Anonymous with a leaked nonce grants nothing either. */
		wp_set_current_user( 0 );
		$anonymous = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/basic-page/' . rawurlencode( (string) $page['public_id'] )
		);
		$anonymous->set_header( 'X-WP-Nonce', $valid_nonce );
		$this->assertSame( 404, rest_do_request( $anonymous )->get_status() );
	}

	/** @test */
	public function test_self_escalation_is_denied_for_role_and_status_changes() {
		$administrator = $this->ensure_user( 'boundary_self_admin', 'administrator' );
		$editor        = $this->staff['songhealth_editor'];

		/* A capable actor can never change their own role (Frozen 06 §41.8). */
		$this->assertSame(
			AuthorizationService::REASON_SELF_ESCALATION,
			AuthorizationService::decide_role_change(
				array(
					'actor'  => $administrator,
					'target' => $administrator,
					'role'   => CapabilityMap::ROLE_PUBLISHER,
				)
			)->reason()
		);
		/* Nor their own account status, even when they hold users_manage. */
		$this->assertSame(
			AuthorizationService::REASON_SELF_ESCALATION,
			AuthorizationService::decide_account_status_change(
				array(
					'actor'  => $administrator,
					'target' => $administrator,
					'status' => AuthorizationService::ACCOUNT_DISABLED,
				)
			)->reason()
		);
		/* An actor without the administrative capability denies on capability. */
		$this->assertSame(
			AuthorizationService::REASON_CAPABILITY_DENIED,
			AuthorizationService::decide_role_change(
				array(
					'actor'  => $editor,
					'target' => $administrator,
					'role'   => CapabilityMap::ROLE_PUBLISHER,
				)
			)->reason()
		);
		/* An unknown role value denies on the role itself. */
		$this->assertSame(
			AuthorizationService::REASON_ROLE_UNKNOWN,
			AuthorizationService::decide_role_change(
				array(
					'actor'  => $administrator,
					'target' => $editor,
					'role'   => 'songhealth_owner',
				)
			)->reason()
		);
		/* An unknown status value denies on the status itself. */
		$this->assertSame(
			AuthorizationService::REASON_STATUS_UNKNOWN,
			AuthorizationService::decide_account_status_change(
				array(
					'actor'  => $administrator,
					'target' => $editor,
					'status' => 'suspended',
				)
			)->reason()
		);
	}

	/** @test */
	public function test_last_administrator_protection_refuses_losing_the_last_active_administrator() {
		$actor  = $this->ensure_user( 'boundary_guard_actor', 'administrator' );
		$first  = $this->ensure_user( 'boundary_guard_first', 'administrator' );
		$editor = $this->staff['songhealth_editor'];

		/*
		 * The clean test installation ships its own active Administrator
		 * (user 1). Suspend it for this case so the active-Administrator
		 * population is exactly the fixtures below; the role is untouched and
		 * the flag is removed again in the finally block below.
		 */
		update_user_meta( 1, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_DISABLED );

		try {
			/* With two active Administrators, neither is the last one. */
			$this->assertFalse( AuthorizationService::is_last_active_administrator( get_userdata( $actor ) ) );
			$this->assertFalse( AuthorizationService::is_last_active_administrator( get_userdata( $first ) ) );

			/* Legitimate management of a non-last Administrator is allowed. */
			$this->assertTrue(
				AuthorizationService::decide_role_change(
					array(
						'actor'  => $actor,
						'target' => $first,
						'role'   => CapabilityMap::ROLE_PUBLISHER,
					)
				)->allowed()
			);
			$this->assertTrue(
				AuthorizationService::decide_account_status_change(
					array(
						'actor'  => $actor,
						'target' => $first,
						'status' => AuthorizationService::ACCOUNT_DISABLED,
					)
				)->allowed()
			);

			/*
			 * Apply the accepted disablement of the second Administrator: the
			 * actor becomes the only active Administrator, and the guard
			 * recognizes that state.
			 */
			update_user_meta( $first, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_DISABLED );
			$this->assertTrue( AuthorizationService::is_last_active_administrator( get_userdata( $actor ) ) );

			/*
			 * Swap the states: the target is the only active Administrator
			 * and the guard reports it, while the disabled actor is refused by
			 * the decision path before the guard is even reached.
			 */
			update_user_meta( $first, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_ACTIVE );
			update_user_meta( $actor, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_DISABLED );
			$this->assertTrue( AuthorizationService::is_last_active_administrator( get_userdata( $first ) ) );

			$this->assertSame(
				AuthorizationService::REASON_ACTOR_DISABLED,
				AuthorizationService::decide_role_change(
					array(
						'actor'  => $actor,
						'target' => $first,
						'role'   => CapabilityMap::ROLE_PUBLISHER,
					)
				)->reason()
			);
		} finally {
			delete_user_meta( 1, AuthorizationService::META_ACCOUNT_STATUS );
		}

		/*
		 * The frozen capability map grants no permissions-manage authority
		 * outside the active Administrator set, so no decision path can reach
		 * the guard today: it is defense in depth for exactly that future
		 * configuration, and the truth table above is the protection proof
		 * (quickstart.md §7). A non-Administrator target is never protected.
		 */
		$this->assertFalse( AuthorizationService::is_last_active_administrator( get_userdata( $editor ) ) );
	}

	/** @test */
	public function test_revocation_and_demotion_take_effect_on_the_next_request() {
		$publisher = $this->staff['songhealth_publisher'];
		$page      = $this->create_draft_page();

		$decision = AuthorizationService::decide(
			array(
				'actor'      => $publisher,
				'capability' => CapabilityMap::CAP_BASIC_PAGE_PUBLISH,
				'module'     => CapabilityMap::MODULE_BASIC_PAGE,
				'object_id'  => $page['post_id'],
			)
		);
		$this->assertTrue( $decision->allowed(), 'the publisher is authorized before the change' );

		/* Demotion: the very next decision denies on capability. */
		wp_update_user( array( 'ID' => $publisher, 'role' => 'songhealth_viewer' ) );
		$this->assertSame(
			AuthorizationService::REASON_CAPABILITY_DENIED,
			AuthorizationService::decide(
				array(
					'actor'      => $publisher,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_PUBLISH,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->reason(),
			'demotion is effective immediately, with no cached authority'
		);

		/* Scope loss: the next decision denies on scope. */
		wp_update_user( array( 'ID' => $publisher, 'role' => 'songhealth_editor' ) );
		update_user_meta( $publisher, CapabilityMap::META_MODULE_SCOPE, array( CapabilityMap::MODULE_DOCUMENT_RESOURCE ) );
		$this->assertSame(
			AuthorizationService::REASON_MODULE_OUT_OF_SCOPE,
			AuthorizationService::decide(
				array(
					'actor'      => $publisher,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->reason()
		);

		/* Disablement: the next decision denies on the account itself. */
		update_user_meta( $publisher, CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );
		update_user_meta( $publisher, AuthorizationService::META_ACCOUNT_STATUS, AuthorizationService::ACCOUNT_DISABLED );
		$this->assertSame(
			AuthorizationService::REASON_ACTOR_DISABLED,
			AuthorizationService::decide(
				array(
					'actor'      => $publisher,
					'capability' => CapabilityMap::CAP_BASIC_PAGE_VIEW,
					'module'     => CapabilityMap::MODULE_BASIC_PAGE,
					'object_id'  => $page['post_id'],
				)
			)->reason()
		);
	}

	/**
	 * Drive the live Preview route once for the currently set user.
	 *
	 * @param string $public_id Public ID to request.
	 * @param string $grant     Grant token to attach.
	 * @return WP_REST_Response
	 */
	private function preview_request( $public_id, $grant ) {
		$request = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/basic-page/' . rawurlencode( $public_id )
		);
		$request->set_param( 'grant', $grant );
		/* A manually built request carries its headers itself; the server populates them from $_SERVER only inside serve_request. */
		$request->set_header( 'Origin', 'http://127.0.0.1:4173' );
		$_SERVER['HTTP_ORIGIN'] = 'http://127.0.0.1:4173';
		$response               = rest_do_request( $request );
		unset( $_SERVER['HTTP_ORIGIN'] );
		return $response;
	}

	/** @test */
	public function test_live_preview_authorization_is_fresh_on_every_request() {
		/*
		 * EXPECTED RED before T035: the Preview controller does not exist, so
		 * the authorized first request answers the neutral class instead of
		 * the bounded candidate projection, and the subsequent demoted
		 * request cannot be distinguished from it.
		 */
		$page = $this->create_draft_page();
		wp_set_current_user( $this->staff['songhealth_editor'] );

		$target = \SonghealthCore\Preview\PreviewController::initiation_target( (int) $page['post_id'] );
		$this->assertIsString( $target, 'an in-scope editor with view authority receives an initiation' );
		/* The one-time handoff travels in the URL fragment, never the query. */
		$this->assertNull( wp_parse_url( $target, PHP_URL_QUERY ), 'the initiation URL carries no query string' );
		$handoff = array();
		parse_str( (string) wp_parse_url( $target, PHP_URL_FRAGMENT ), $handoff );
		$this->assertArrayHasKey( 'g', $handoff );
		$grant = (string) $handoff['g'];

		$authorized = $this->preview_request( (string) $page['public_id'], $grant );
		$this->assertSame( 200, $authorized->get_status(), 'the currently authorized request receives the candidate' );

		/*
		 * Demotion below the Songhealth staff boundary revokes Preview on the
		 * very next request, with no anonymous fallback. (A demotion to
		 * Viewer would not: view applies in every state, and Viewer holds it
		 * — the frozen matrix case above pins exactly that.)
		 */
		wp_update_user( array( 'ID' => $this->staff['songhealth_editor'], 'role' => 'subscriber' ) );
		/* The next request re-instantiates its actor from persisted state; hop via the anonymous actor because wp_set_current_user short-circuits for the already-current ID. */
		wp_set_current_user( 0 );
		wp_set_current_user( $this->staff['songhealth_editor'] );
		$revoked = $this->preview_request( (string) $page['public_id'], $grant );
		$this->assertSame( 404, $revoked->get_status(), 'revocation is effective on the next request' );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $revoked->get_data()['code'] );
	}

	/** @test */
	public function test_draft_creation_receives_and_retains_its_immutable_public_id() {
		$draft = $this->create_draft_page();

		$this->assertNotSame( '', (string) $draft['public_id'] );
		$this->assertTrue( CreateTimePublicId::is_accepted( (int) $draft['post_id'] ), 'Draft creation is accepted creation' );

		wp_update_post(
			array(
				'ID'         => $draft['post_id'],
				'post_title' => 'Authorization Boundary Fixture Retitled',
				'post_name'  => 'authorization-boundary-fixture-retitled',
			)
		);
		wp_update_post( array( 'ID' => $draft['post_id'], 'post_status' => 'publish' ) );

		$this->assertSame(
			$draft['public_id'],
			PublicIdRegistry::public_id_for( 'basic-page', (int) $draft['post_id'] ),
			'identity is unchanged through title, slug, and lifecycle changes'
		);
	}
}
