<?php
/**
 * Public ID identity tests (Delivery 002, T020 / US1).
 *
 * Proves the immutable-identity contract end to end at the registry and the
 * accepted creation boundary: Draft-time issuance of a canonical UUIDv7 with
 * a verified one-to-one mapping, uniqueness, immutability across title, slug,
 * and lifecycle changes, collision/non-reissue refusal, tombstone retention
 * without reuse, strict identifier syntax, and the creation-service
 * acceptance semantics — success only after mapping verification, service
 * failure on every actual issuance failure, quarantined identityless rows
 * never qualifying, and updates leaving identity unchanged (FR-004, FR-005;
 * data-model.md §Identity distinction, §State transitions; SC-002).
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-004,
 * FR-005, FR-007, FR-008 and the Session 2026-08-29 T012-B01 clarification;
 * contracts/public-rest.md §Detail; quickstart.md §2.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Identity\RegistrySchema;
use SonghealthCore\Rest\EligibleResourceQuery;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group identity
 * @group us1
 */
class PublicIdRegistryTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/**
	 * The post ID observed by an in-flight creation hook, if one ran.
	 *
	 * @var int
	 */
	private $observed_post_id = 0;

	public function tear_down() {
		$this->songhealth_delete_tracked_records();
		parent::tear_down();
	}

	/**
	 * Create an accepted Basic Page in a chosen lifecycle state.
	 *
	 * @param string $status WordPress post status.
	 * @param string $title  Optional title.
	 * @return array{post_id: int, public_id: string, resource_type: string}
	 */
	private function create_page( $status = 'publish', $title = 'Identity Fixture Page' ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => $title,
				'post_status' => $status,
			)
		);
		$this->assertIsArray( $created, 'a service creation must report success as an array' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/**
	 * Create an accepted Document Resource.
	 *
	 * @return array{post_id: int, public_id: string, resource_type: string}
	 */
	private function create_document() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Identity Fixture Document',
				'post_status' => 'draft',
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/**
	 * Assert a public ID is the canonical Songhealth shape: a lowercase
	 * hyphenated UUIDv7 with version 7 and the RFC 4122 variant.
	 *
	 * @param string $public_id Identifier to check.
	 * @return void
	 */
	private function assert_canonical_uuidv7( $public_id ) {
		$this->assertIsString( $public_id );
		$this->assertTrue( PublicIdRegistry::is_valid_public_id( $public_id ), 'the identifier must be a canonical UUIDv7' );
		$this->assertSame( 36, strlen( $public_id ) );
		$this->assertSame( '7', $public_id[14], 'the version nibble is 7' );
		$this->assertContains( $public_id[19], array( '8', '9', 'a', 'b' ), 'the variant nibble is RFC 4122' );
	}

	/** @test */
	public function test_draft_time_creation_establishes_a_verified_immutable_identity() {
		/*
		 * FR-004: the first successful creation — including creation as Draft —
		 * establishes the identity before success is reported. The mapping is
		 * verified in both directions here from outside the service, which is
		 * exactly what its own success guarantee claims.
		 */
		$created = $this->create_page( 'draft' );
		$post_id = (int) $created['post_id'];

		$this->assertSame( 'basic-page', $created['resource_type'] );
		$this->assert_canonical_uuidv7( (string) $created['public_id'] );

		/* The one-to-one mapping: Public ID -> resource, and resource -> Public ID. */
		$row = PublicIdRegistry::mapping_for( (string) $created['public_id'] );
		$this->assertIsObject( $row, 'success implies a registry mapping exists' );
		$this->assertTrue( PublicIdRegistry::is_live( $row ) );
		$this->assertSame( 'basic-page', (string) $row->{RegistrySchema::COLUMN_RESOURCE_TYPE} );
		$this->assertSame( $post_id, (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} );
		$this->assertSame( (string) $created['public_id'], PublicIdRegistry::public_id_for( 'basic-page', $post_id ) );

		$this->assertTrue( CreateTimePublicId::is_accepted( $post_id ), 'a Draft created through the service is an accepted Songhealth resource' );

		/* Draft acceptance is identity, not visibility: a Draft is not publicly eligible. */
		$this->assertFalse( PublicEligibility::is_eligible( $post_id ) );
	}

	/** @test */
	public function test_document_resources_receive_the_same_draft_time_identity_contract() {
		$document = $this->create_document();

		$this->assert_canonical_uuidv7( (string) $document['public_id'] );
		$this->assertSame( (string) $document['public_id'], PublicIdRegistry::public_id_for( 'document-resource', (int) $document['post_id'] ) );
		$this->assertTrue( CreateTimePublicId::is_accepted( (int) $document['post_id'] ) );
	}

	/** @test */
	public function test_issuance_is_unique_across_records_and_types() {
		$identifiers = array();
		for ( $i = 0; $i < 8; $i++ ) {
			$identifiers[] = (string) $this->create_page( 'publish', "Uniqueness Fixture {$i}" )['public_id'];
		}
		$identifiers[] = (string) $this->create_document()['public_id'];

		$this->assertCount( 9, array_unique( $identifiers ), 'every issued Public ID is globally unique' );
	}

	/** @test */
	public function test_generated_identifiers_are_time_ordered_uuidv7() {
		$first = PublicIdRegistry::generate_uuidv7();
		usleep( 3000 );
		$second = PublicIdRegistry::generate_uuidv7();

		$this->assertNotNull( $first );
		$this->assertNotNull( $second );
		$this->assert_canonical_uuidv7( $first );
		$this->assert_canonical_uuidv7( $second );
		$this->assertLessThan( 0, strcmp( $first, $second ), 'UUIDv7 generation is time-ordered, the deterministic listing order' );
	}

	/** @test */
	public function test_identity_survives_title_slug_and_lifecycle_changes_without_being_written() {
		$created   = $this->create_page( 'publish', 'Original Fixture Title' );
		$post_id   = (int) $created['post_id'];
		$public_id = (string) $created['public_id'];

		wp_update_post( array( 'ID' => $post_id, 'post_title' => 'Retitled Fixture', 'post_name' => 'retitled-fixture' ) );
		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ), 'a title/slug change never writes identity' );

		wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );
		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ), 'a lifecycle change never writes identity' );

		wp_update_post( array( 'ID' => $post_id, 'post_status' => 'publish' ) );
		update_post_meta( $post_id, FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_HIDDEN );
		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ), 'an eligibility change never writes identity' );

		/* The mapping row itself is unchanged: same Public ID, same resource key. */
		$row = PublicIdRegistry::mapping_for( $public_id );
		$this->assertSame( $post_id, (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} );
		$this->assertTrue( CreateTimePublicId::is_accepted( $post_id ), 'the record remains accepted through every ordinary update' );
	}

	/** @test */
	public function test_identity_is_established_once_and_never_reissued() {
		$created   = $this->create_page( 'draft' );
		$post_id   = (int) $created['post_id'];
		$public_id = (string) $created['public_id'];

		/* A resource that already holds a live mapping can never be assigned a second ID. */
		$this->assertNull( PublicIdRegistry::assign( 'basic-page', $post_id ), 'assign() refuses a resource that already holds a mapping' );
		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ), 'the refusal never disturbs the issued identity' );

		/* The creation service likewise refuses to "create" what already exists. */
		$update = CreateTimePublicId::create(
			array(
				'ID'        => $post_id,
				'post_type' => FoundationTypes::BASIC_PAGE,
				'post_title' => 'Identity Fixture Updated',
			)
		);
		$this->assertWPError( $update );
		$this->assertSame( 'update_not_supported', $update->get_error_code(), 'updates use ordinary WordPress paths, never the creation service' );
		$this->assertSame( $public_id, PublicIdRegistry::public_id_for( 'basic-page', $post_id ) );
	}

	/** @test */
	public function test_registry_unique_keys_arbitrate_collisions_and_fail_closed() {
		global $wpdb;

		$created = $this->create_page( 'publish' );
		$post_id = (int) $created['post_id'];
		$table   = RegistrySchema::table_name();

		/* The issued public_id is occupied: a second row with it is refused. */
		$duplicate_id = $wpdb->insert(
			$table,
			array(
				RegistrySchema::COLUMN_PUBLIC_ID        => (string) $created['public_id'],
				RegistrySchema::COLUMN_RESOURCE_TYPE    => 'document-resource',
				RegistrySchema::COLUMN_INTERNAL_POST_ID => $post_id + 1000,
				RegistrySchema::COLUMN_CREATED_AT       => '2026-01-01 00:00:00',
			),
			array( '%s', '%s', '%d', '%s' )
		);
		$this->assertFalse( $duplicate_id, 'the unique public_id key refuses a collision' );

		/* The resource key is occupied: a second mapping for the same resource is refused. */
		$duplicate_resource = $wpdb->insert(
			$table,
			array(
				RegistrySchema::COLUMN_PUBLIC_ID        => 'ffffffff-ffff-7fff-8fff-ffffffffffff',
				RegistrySchema::COLUMN_RESOURCE_TYPE    => 'basic-page',
				RegistrySchema::COLUMN_INTERNAL_POST_ID => $post_id,
				RegistrySchema::COLUMN_CREATED_AT       => '2026-01-01 00:00:00',
			),
			array( '%s', '%s', '%d', '%s' )
		);
		$this->assertFalse( $duplicate_resource, 'the unique resource key refuses a second mapping' );

		/* Neither refusal changed the issued identity. */
		$this->assertSame( (string) $created['public_id'], PublicIdRegistry::public_id_for( 'basic-page', $post_id ) );
	}

	/** @test */
	public function test_deletion_retains_a_tombstone_and_the_identifier_is_never_reused() {
		$deleted   = $this->create_page( 'publish', 'Tombstone Identity Fixture' );
		$post_id   = (int) $deleted['post_id'];
		$public_id = (string) $deleted['public_id'];

		wp_delete_post( $post_id, true );

		/* The mapping row is retained and tombstoned, never freed. */
		$row = PublicIdRegistry::mapping_for( $public_id );
		$this->assertIsObject( $row, 'the tombstone mapping is retained' );
		$this->assertFalse( PublicIdRegistry::is_live( $row ) );
		$this->assertSame( $public_id, (string) $row->{RegistrySchema::COLUMN_PUBLIC_ID} );
		$this->assertSame( $post_id, (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} );

		/* The tombstoned resource is never re-issued an identifier. */
		$this->assertNull( PublicIdRegistry::assign( 'basic-page', $post_id ), 'a tombstoned resource key never receives a second identity' );

		/* The issued identifier is never reassigned to a later resource. */
		$successor = $this->create_page( 'publish', 'Successor Fixture' );
		$this->assertNotSame( $public_id, (string) $successor['public_id'], 'an issued ID is never recycled' );
		$this->assertSame( $post_id, (int) PublicIdRegistry::mapping_for( $public_id )->{RegistrySchema::COLUMN_INTERNAL_POST_ID}, 'the retained mapping still points at its original resource' );

		/* A tombstoned identity never qualifies for any later behavior. */
		$this->assertFalse( CreateTimePublicId::is_accepted( $post_id ) );
		$this->assertFalse( PublicEligibility::is_eligible( $post_id ) );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', $public_id ) );
	}

	/** @test */
	public function test_service_failure_on_unavailable_issuance_writes_nothing() {
		global $wpdb;
		$prefix = $wpdb->prefix;
		$before = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT( ID ) FROM {$wpdb->posts} WHERE post_type = %s", FoundationTypes::BASIC_PAGE ) );

		/*
		 * A registry the issuance path cannot reach: the schema is pointed at a
		 * prefix with no table, so readiness fails before anything is written
		 * (the same technique as the accepted T017 registry-absence case).
		 */
		$wpdb->prefix = 'songhealth_absent_prefix_';
		$failure      = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Unavailable Issuance Fixture',
				'post_status' => 'draft',
			)
		);
		$wpdb->prefix = $prefix;

		$this->assertWPError( $failure, 'issuance unavailability is a service failure, never success' );
		$this->assertSame( 'issuance_unavailable', $failure->get_error_code() );

		$after = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT( ID ) FROM {$wpdb->posts} WHERE post_type = %s", FoundationTypes::BASIC_PAGE ) );
		$this->assertSame( $before, $after, 'no record of any state may survive an issuance-unavailable service failure' );
	}

	/** @test */
	public function test_every_actual_issuance_failure_returns_service_failure_and_no_accepted_resource() {
		/*
		 * A real issuance failure at the boundary: while the service's own
		 * creation is in flight, a registry row claiming the incoming resource
		 * key is inserted inside the same bounded transaction, so identity
		 * issuance cannot establish a one-to-one mapping. The service must
		 * return a bounded failure, and nothing accepted may survive.
		 */
		$this->observed_post_id = 0;
		$observer = function ( $post_id ) {
			$this->observed_post_id = (int) $post_id;
			global $wpdb;
			$wpdb->insert(
				RegistrySchema::table_name(),
				array(
					RegistrySchema::COLUMN_PUBLIC_ID        => 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee',
					RegistrySchema::COLUMN_RESOURCE_TYPE    => 'basic-page',
					RegistrySchema::COLUMN_INTERNAL_POST_ID => (int) $post_id,
					RegistrySchema::COLUMN_CREATED_AT       => current_time( 'mysql', true ),
				),
				array( '%s', '%s', '%d', '%s' )
			);
		};
		add_action( 'wp_insert_post', $observer, 10, 1 );

		$failure = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Issuance Failure Fixture',
				'post_status' => 'draft',
			)
		);

		remove_action( 'wp_insert_post', $observer, 10 );

		$this->assertWPError( $failure, 'an actual issuance failure is reported as service failure' );
		$this->assertNotSame( '', (string) $failure->get_error_message() . $failure->get_error_code() );
		$this->assertNotContains(
			$failure->get_error_code(),
			array( 'issuance_unavailable', 'insert_failed' ),
			'the failure is the issuance path specifically'
		);
		$this->assertGreaterThan( 0, $this->observed_post_id, 'the creation reached the record write' );

		clean_post_cache( $this->observed_post_id );
		$this->assertNull( get_post( $this->observed_post_id ), 'no accepted resource survives an issuance failure' );
		$this->assertNull( PublicIdRegistry::public_id_for( 'basic-page', $this->observed_post_id ), 'no live mapping survives an issuance failure' );
		$this->assertFalse( CreateTimePublicId::is_accepted( $this->observed_post_id ) );
	}

	/** @test */
	public function test_a_quarantined_identityless_row_never_qualifies_as_a_songhealth_resource() {
		/*
		 * A supported-type row created by raw Core insertion outside the
		 * creation service: it exists as an internal candidate only. No later
		 * behavior may treat it as a Songhealth resource (FR-004, FR-007).
		 */
		remove_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ) );
		$raw_id = wp_insert_post(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Raw Internal Candidate',
				'post_status' => 'publish',
			),
			true
		);
		add_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ), 10, 2 );
		$this->assertNotWPError( $raw_id );
		$this->assertGreaterThan( 0, (int) $raw_id );

		$this->assertNull( PublicIdRegistry::public_id_for( 'basic-page', (int) $raw_id ), 'an identityless row has no mapping' );
		$this->assertFalse( CreateTimePublicId::is_accepted( (int) $raw_id ), 'it is never accepted' );
		$this->assertFalse( PublicEligibility::is_eligible( (int) $raw_id ), 'it is never public-eligible, whatever its WordPress state' );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', 'not-its-identity' ), 'no identifier resolves to it' );

		/* The service cannot launder it into an accepted resource afterwards, either. */
		$launder = CreateTimePublicId::create(
			array(
				'ID'         => (int) $raw_id,
				'post_type'  => FoundationTypes::BASIC_PAGE,
				'post_title' => 'Raw Internal Candidate',
			)
		);
		$this->assertWPError( $launder );
		$this->assertSame( 'update_not_supported', $launder->get_error_code(), 'only first creation passes the boundary' );
		$this->assertFalse( CreateTimePublicId::is_accepted( (int) $raw_id ) );

		wp_delete_post( (int) $raw_id, true );
	}

	/** @test */
	public function test_identifier_syntax_validation_is_strict_canonical_uuidv7() {
		$valid = '018f6b2c-4a1b-7b3e-9c2d-1a2b3c4d5e6f';
		$this->assertTrue( PublicIdRegistry::is_valid_public_id( $valid ) );

		$rejected = array(
			'uppercase'   => strtoupper( $valid ),
			'uuid-v4'     => '018f6b2c-4a1b-4b3e-9c2d-1a2b3c4d5e6f',
			'uuid-v1'     => '018f6b2c-4a1b-1b3e-9c2d-1a2b3c4d5e6f',
			'bad-variant' => '018f6b2c-4a1b-7b3e-cc2d-1a2b3c4d5e6f',
			'braced'      => '{' . $valid . '}',
			'urn'         => 'urn:uuid:' . $valid,
			'padded'      => ' ' . $valid . ' ',
			'truncated'   => substr( $valid, 0, 35 ),
			'empty'       => '',
			'integer'     => 42,
			'null'        => null,
		);
		foreach ( $rejected as $condition => $value ) {
			$this->assertFalse( PublicIdRegistry::is_valid_public_id( $value ), "{$condition} must be rejected: exactly one canonical representation exists" );
		}
	}

	/** @test */
	public function test_reference_meta_shape_sanitization_is_bounded_but_resolution_stays_strict() {
		/*
		 * The registered metadata shape bound (FoundationTypes::is_public_id_shape)
		 * normalizes UUID-shaped text so a stored reference can never carry
		 * arbitrary values into later resolution. It is deliberately a SHAPE
		 * bound, not identity validation: whether a stored reference actually
		 * resolves remains the strict registry decision above.
		 */
		$valid = '018f6b2c-4a1b-7b3e-9c2d-1a2b3c4d5e6f';
		$this->assertTrue( FoundationTypes::is_public_id_shape( $valid ) );
		$this->assertTrue( FoundationTypes::is_public_id_shape( strtoupper( $valid ) ), 'the shape bound normalizes case for storage' );
		$this->assertTrue( FoundationTypes::is_public_id_shape( '018f6b2c-4a1b-4b3e-9c2d-1a2b3c4d5e6f' ), 'the shape bound accepts any UUID shape; resolution decides identity' );

		foreach ( array( 'not-a-uuid', '018f6b2c', '', 42, null ) as $value ) {
			$this->assertFalse( FoundationTypes::is_public_id_shape( $value ), var_export( $value, true ) . ' is not a storable reference shape' );
		}

		/* The registry's own validation stays strict: a non-v7 UUID never resolves. */
		$this->assertFalse( PublicIdRegistry::is_valid_public_id( '018f6b2c-4a1b-4b3e-9c2d-1a2b3c4d5e6f' ) );
		$this->assertNull( PublicIdRegistry::mapping_for( '018f6b2c-4a1b-4b3e-9c2d-1a2b3c4d5e6f' ) );
	}
}
