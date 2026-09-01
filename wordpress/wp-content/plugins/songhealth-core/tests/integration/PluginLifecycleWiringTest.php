<?php
/**
 * Plugin lifecycle wiring tests (Delivery 002, T019).
 *
 * Proves the accepted foundation modules are actually attached to the
 * WordPress lifecycle — types and capabilities on init, the creation-service
 * boundary as the only accepted creation path with update/autosave/revision
 * behavior preserved, REST routes on rest_api_init, containment filters in
 * place, configuration available to the lifecycle — and that the T006–T012
 * invariants they own still hold after the wiring (FR-004, FR-005).
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-001,
 * FR-004–FR-009, FR-030; tasks.md Phase 2.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Diagnostics\Configuration;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Plugin;
use SonghealthCore\Rest\NativeSurfaceContainment;
use SonghealthCore\Rest\Routes;
use WP_UnitTestCase;

/**
 * @group wiring
 */
class PluginLifecycleWiringTest extends WP_UnitTestCase {

	/** @test */
	public function test_foundation_types_are_registered_on_the_lifecycle() {
		$this->assertTrue( post_type_exists( FoundationTypes::BASIC_PAGE ) );
		$this->assertTrue( post_type_exists( FoundationTypes::DOCUMENT_RESOURCE ) );

		$basic = get_post_type_object( FoundationTypes::BASIC_PAGE );
		$this->assertFalse( $basic->publicly_queryable );
		$this->assertFalse( $basic->public );
		$this->assertFalse( $basic->show_in_rest );
		$this->assertTrue( $basic->exclude_from_search );

		foreach ( FoundationTypes::metadata_schema( FoundationTypes::BASIC_PAGE ) as $meta_key => $schema ) {
			$this->assertArrayHasKey( $meta_key, get_registered_meta_keys( 'post', FoundationTypes::BASIC_PAGE ), "meta {$meta_key} must be registered" );
			$this->assertFalse( $schema['show_in_rest'] );
		}
	}

	/** @test */
	public function test_roles_and_capabilities_are_registered_on_the_lifecycle() {
		foreach ( array( CapabilityMap::ROLE_VIEWER, CapabilityMap::ROLE_EDITOR, CapabilityMap::ROLE_PUBLISHER ) as $role_slug ) {
			$role = get_role( $role_slug );
			$this->assertNotNull( $role, "{$role_slug} must exist after wiring" );
			$this->assertTrue( $role->has_cap( CapabilityMap::CAP_BASIC_PAGE_VIEW ) );
		}

		$administrator = get_role( CapabilityMap::ROLE_ADMINISTRATOR );
		$this->assertTrue( $administrator->has_cap( CapabilityMap::CAP_PERMISSIONS_MANAGE ) );
	}

	/** @test */
	public function test_creation_service_boundary_is_attached_and_enforced() {
		$this->assertNotFalse( has_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ) ) );
		$this->assertNotFalse( has_action( 'deleted_post', array( CreateTimePublicId::class, 'on_deleted_post' ) ) );

		/* Direct creation of a supported type outside the service is refused. */
		$refused = wp_insert_post(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Direct Insert',
				'post_status' => 'draft',
			),
			true
		);
		if ( is_wp_error( $refused ) ) {
			$this->assertSame( 'empty_content', $refused->get_error_code() );
		} else {
			$this->assertSame( 0, $refused );
		}

		/* Service creation — including Draft — succeeds with established identity. */
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Wiring Fixture Page',
				'post_status' => 'draft',
			)
		);
		$this->assertIsArray( $created );
		$this->assertTrue( PublicIdRegistry::is_valid_public_id( $created['public_id'] ) );
		$this->assertTrue( CreateTimePublicId::is_accepted( (int) $created['post_id'] ) );
	}

	/** @test */
	public function test_direct_create_containment_scope_preserves_updates_autosaves_and_revisions() {
		/* Update of an already identified resource: passthrough. */
		$this->assertFalse(
			CreateTimePublicId::contain_direct_creation(
				false,
				array( 'ID' => 123, 'post_type' => FoundationTypes::BASIC_PAGE, 'post_title' => 'Update' )
			)
		);

		/* Revisions and autosaves carry the revision post type: passthrough. */
		$this->assertFalse(
			CreateTimePublicId::contain_direct_creation(
				false,
				array( 'post_type' => 'revision', 'post_title' => 'Revision', 'post_parent' => 123 )
			)
		);

		/* Every unsupported type: passthrough. */
		$this->assertFalse(
			CreateTimePublicId::contain_direct_creation( false, array( 'post_type' => 'post', 'post_title' => 'Post' ) )
		);
		$this->assertFalse(
			CreateTimePublicId::contain_direct_creation( false, array( 'post_type' => 'attachment' ) )
		);

		/* First creation of a supported type outside the service: refused. */
		$this->assertTrue(
			CreateTimePublicId::contain_direct_creation(
				false,
				array( 'post_type' => FoundationTypes::DOCUMENT_RESOURCE, 'post_title' => 'Document' )
			)
		);
	}

	/** @test */
	public function test_updates_of_accepted_resources_keep_ordinary_paths_and_identity() {
		$created   = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Identity Fixture',
				'post_status' => 'publish',
			)
		);
		$post_id   = (int) $created['post_id'];
		$public_id = (string) $created['public_id'];

		/* Ordinary WordPress update path, including title and slug changes. */
		wp_update_post( array( 'ID' => $post_id, 'post_title' => 'Identity Fixture Renamed', 'post_name' => 'identity-fixture-renamed' ) );
		wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );

		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ), 'identity is never written by an update' );
		$this->assertTrue( CreateTimePublicId::is_accepted( $post_id ) );
	}

	/** @test */
	public function test_deletion_retains_the_tombstone_mapping() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Tombstone Fixture',
				'post_status' => 'publish',
			)
		);
		$post_id   = (int) $created['post_id'];
		$public_id = (string) $created['public_id'];

		wp_delete_post( $post_id, true );

		$row = PublicIdRegistry::mapping_for( $public_id );
		$this->assertIsObject( $row, 'the registry row is retained' );
		$this->assertFalse( PublicIdRegistry::is_live( $row ), 'the mapping is tombstoned, never freed' );
		$this->assertSame( $public_id, (string) $row->{\SonghealthCore\Identity\RegistrySchema::COLUMN_PUBLIC_ID} );
	}

	/** @test */
	public function test_rest_routes_and_containment_are_attached_to_the_lifecycle() {
		$this->assertNotFalse( has_action( 'rest_api_init', array( Routes::class, 'register' ) ) );

		$this->assertNotFalse( has_filter( 'rest_pre_dispatch', array( NativeSurfaceContainment::class, 'contain_anonymous_rest' ) ) );
		$this->assertNotFalse( has_filter( 'rest_index', array( NativeSurfaceContainment::class, 'contain_rest_index' ) ) );
		$this->assertNotFalse( has_action( 'pre_get_posts', array( NativeSurfaceContainment::class, 'contain_front_end_query' ) ) );
		$this->assertNotFalse( has_filter( 'wp_sitemaps_post_types', array( NativeSurfaceContainment::class, 'contain_sitemap_post_types' ) ) );

		/* Registering routes through the live server proves rest_api_init wiring end to end. */
		do_action( 'rest_api_init', rest_get_server() );
		$ours = array();
		foreach ( rest_get_server()->get_routes() as $route => $handlers ) {
			if ( 0 === strpos( $route, '/' . Routes::ROUTE_NAMESPACE ) ) {
				$ours[] = $route;
			}
		}
		/*
		 * Six entries: the five approved shapes (detail, listing, Preview,
		 * Preview binary, Document binary) plus the '/songhealth/v1'
		 * namespace-index route WordPress itself registers per namespace.
		 */
		$this->assertCount( 6, $ours );
	}

	/** @test */
	public function test_configuration_is_available_to_the_lifecycle_without_secret_exposure() {
		$configuration = Plugin::configuration();

		$this->assertInstanceOf( Configuration::class, $configuration );
		$this->assertSame( $configuration, Plugin::configuration(), 'the lifecycle configuration is read once per request' );

		/* Whatever the environment, the only secret-related report is presence, never the value. */
		$status = $configuration->safe_status();
		$this->assertNotSame( '', (string) $status[ Configuration::KEY_PREVIEW_SIGNING_KEY ] );

		$secret = (string) getenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY' );
		if ( '' !== $secret ) {
			$this->assertStringNotContainsString( $secret, (string) wp_json_encode( $status ), 'no report of this class may ever carry the secret value' );
		}
	}

	/** @test */
	public function test_activation_provisions_and_reconciles_the_registry_table() {
		/*
		 * The bootstrap provisions the registry table before any test (the
		 * framework isolates per-test DDL as temporary tables), so creation
		 * from absence is proven by that provisioning on the fresh test
		 * database. Here activation is proven to run the same provisioning
		 * idempotently against the existing schema without disturbing it or
		 * failing — dbDelta reconciles rather than rebuilds.
		 */
		$this->assertTrue( \SonghealthCore\Identity\RegistrySchema::exists() );

		Plugin::activate();

		$this->assertTrue( \SonghealthCore\Identity\RegistrySchema::exists(), 'activation reconciles the identity registry table (T010)' );
		$this->assertNull( \SonghealthCore\Identity\PublicIdRegistry::mapping_for( '00000000-0000-7000-8000-000000000000' ), 'the registry remains an empty, working registry' );
	}
}
