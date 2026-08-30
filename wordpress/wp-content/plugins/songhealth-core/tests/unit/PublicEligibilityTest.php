<?php
/**
 * Shared current public-eligibility decision tests (Delivery 002, T013).
 *
 * Proves every rule of the decision — supported type, valid live identity,
 * currently public lifecycle, public visibility, withdrawal, and
 * type-specific publication validity — plus the neutral behavior owed by
 * FR-007/FR-008: an identityless internal candidate is never eligible, and
 * the decision is re-read live from the record at every call.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md
 * FR-006–FR-008, FR-012, FR-019; data-model.md §Shared Songhealth Resource
 * policy.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_UnitTestCase;

/**
 * @group eligibility
 */
class PublicEligibilityTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	public function tear_down() {
		parent::tear_down();
		$this->songhealth_delete_tracked_records();
	}

	/**
	 * Create an accepted Basic Page through the Songhealth supported-resource
	 * creation service, in the given lifecycle state.
	 *
	 * @param string $status WordPress post status.
	 * @param array  $args   Extra post fields.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_basic_page( $status = 'draft', $args = array() ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'    => FoundationTypes::BASIC_PAGE,
				'post_title'   => isset( $args['post_title'] ) ? $args['post_title'] : 'Eligibility Fixture Page',
				'post_content' => isset( $args['post_content'] ) ? $args['post_content'] : 'Fixture body.',
				'post_status'  => $status,
			)
		);
		$this->assertIsArray( $created, 'service creation of a fixture must succeed' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/**
	 * Create an accepted Document Resource with a valid attachment.
	 *
	 * @param string $status WordPress post status.
	 * @param bool   $attach Whether to satisfy the attachment validity rule.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document( $status = 'draft', $attach = true ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'  => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title' => 'Eligibility Fixture Document',
				'post_status' => $status,
			)
		);
		$this->assertIsArray( $created, 'service creation of a fixture must succeed' );
		$this->songhealth_track_record( (int) $created['post_id'] );

		if ( $attach ) {
			$attachment_id = self::factory()->attachment->create_object(
				'fixture.pdf',
				(int) $created['post_id'],
				array(
					'post_mime_type' => 'application/pdf',
					'post_type'      => 'attachment',
				)
			);
			update_post_meta( (int) $created['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $attachment_id );
		}
		return $created;
	}

	/** @test */
	public function test_absent_record_is_not_eligible() {
		$decision = PublicEligibility::decide( 999999999 );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_ABSENT, $decision->reason() );
		$this->assertFalse( PublicEligibility::is_eligible( 999999999 ) );
	}

	/** @test */
	public function test_unsupported_type_is_not_eligible() {
		$post_id = self::factory()->post->create( array( 'post_status' => 'publish' ) );
		$decision = PublicEligibility::decide( $post_id );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_TYPE_UNSUPPORTED, $decision->reason() );
	}

	/** @test */
	public function test_identityless_internal_candidate_is_never_eligible() {
		/*
		 * A row that bypassed the creation-service boundary (FR-004 edge
		 * case): simulate the bypass by lifting the containment filter for
		 * the insert only. The row exists, but with no established Public ID
		 * mapping it is a quarantined internal candidate — never eligible.
		 */
		remove_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ) );
		$bypassed = wp_insert_post(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Bypassed Row',
				'post_status' => 'publish',
			),
			true
		);
		add_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ), 10, 2 );

		$this->assertNotWPError( $bypassed );
		$this->assertGreaterThan( 0, (int) $bypassed );
		$this->songhealth_track_record( (int) $bypassed );

		$decision = PublicEligibility::decide( (int) $bypassed );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_IDENTITY_NOT_LIVE, $decision->reason() );
		$this->assertFalse( CreateTimePublicId::is_accepted( (int) $bypassed ) );
	}

	/** @test */
	public function test_draft_is_not_eligible() {
		$created = $this->create_basic_page( 'draft' );
		$decision = PublicEligibility::decide( (int) $created['post_id'] );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_LIFECYCLE_NOT_PUBLIC, $decision->reason() );
	}

	/** @test */
	public function test_scheduled_record_is_not_yet_publicly_eligible() {
		$future = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );
		$created = CreateTimePublicId::create(
			array(
				'post_type'     => FoundationTypes::BASIC_PAGE,
				'post_title'    => 'Scheduled Fixture',
				'post_status'   => 'future',
				'post_date'     => $future,
				'post_date_gmt' => $future,
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );

		$post = get_post( (int) $created['post_id'] );
		$this->assertSame( 'future', $post->post_status, 'fixture must actually be scheduled' );
		$this->assertFalse( PublicEligibility::is_eligible( $post ), 'a scheduled record is not publicly disclosable yet' );
	}

	/** @test */
	public function test_private_and_trashed_records_are_not_eligible() {
		$created = $this->create_basic_page( 'private' );
		$this->assertFalse( PublicEligibility::is_eligible( (int) $created['post_id'] ) );

		$created = $this->create_basic_page( 'publish' );
		wp_update_post( array( 'ID' => (int) $created['post_id'], 'post_status' => 'trash' ) );
		$this->assertFalse( PublicEligibility::is_eligible( (int) $created['post_id'] ) );
	}

	/** @test */
	public function test_published_basic_page_with_public_defaults_is_eligible() {
		$created  = $this->create_basic_page( 'publish' );
		$decision = PublicEligibility::decide( (int) $created['post_id'] );
		$this->assertTrue( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_ELIGIBLE, $decision->reason() );
	}

	/** @test */
	public function test_hidden_and_internal_visibility_are_not_eligible() {
		$created = $this->create_basic_page( 'publish' );

		update_post_meta( (int) $created['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_HIDDEN );
		$decision = PublicEligibility::decide( (int) $created['post_id'] );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_VISIBILITY_NOT_PUBLIC, $decision->reason() );

		update_post_meta( (int) $created['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_INTERNAL );
		$this->assertFalse( PublicEligibility::is_eligible( (int) $created['post_id'] ) );

		/*
		 * A value that bypassed the schema sanitizer (registered sanitizers
		 * rewrite ordinary meta writes to the default) is written directly,
		 * and the decision must still fail closed on it.
		 */
		global $wpdb;
		$wpdb->replace(
			$wpdb->postmeta,
			array(
				'post_id'    => (int) $created['post_id'],
				'meta_key'   => FoundationTypes::META_VISIBILITY,
				'meta_value' => 'not-a-visibility',
			)
		);
		clean_post_cache( (int) $created['post_id'] );
		$this->assertFalse( PublicEligibility::is_eligible( (int) $created['post_id'] ), 'an unrecognized visibility value must fail closed' );
	}

	/** @test */
	public function test_withdrawn_record_is_not_eligible() {
		$created = $this->create_basic_page( 'publish' );

		update_post_meta( (int) $created['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$decision = PublicEligibility::decide( (int) $created['post_id'] );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_WITHDRAWN, $decision->reason() );
	}

	/** @test */
	public function test_untitled_published_basic_page_fails_type_validity() {
		$created = $this->create_basic_page( 'publish' );
		wp_update_post( array( 'ID' => (int) $created['post_id'], 'post_title' => '' ) );

		$decision = PublicEligibility::decide( (int) $created['post_id'] );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_TYPE_VALIDITY, $decision->reason() );
	}

	/** @test */
	public function test_document_requires_a_resolvable_attachment_before_publication() {
		$without = $this->create_document( 'publish', false );
		$decision = PublicEligibility::decide( (int) $without['post_id'] );
		$this->assertFalse( $decision->is_eligible() );
		$this->assertSame( PublicEligibility::REASON_TYPE_VALIDITY, $decision->reason() );

		$with = $this->create_document( 'publish', true );
		$this->assertTrue( PublicEligibility::is_eligible( (int) $with['post_id'] ) );
	}

	/** @test */
	public function test_document_with_dangling_attachment_reference_is_not_eligible() {
		$created = $this->create_document( 'publish', false );
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, '999999999' );

		$this->assertFalse( PublicEligibility::is_eligible( (int) $created['post_id'] ) );
	}

	/** @test */
	public function test_decision_is_current_and_changes_with_the_record() {
		$created = $this->create_basic_page( 'publish' );
		$post_id = (int) $created['post_id'];

		$this->assertTrue( PublicEligibility::is_eligible( $post_id ) );

		update_post_meta( $post_id, FoundationTypes::META_WITHDRAWN, '1' );
		$this->assertFalse( PublicEligibility::is_eligible( $post_id ), 'revocation must apply to the very next decision' );

		update_post_meta( $post_id, FoundationTypes::META_WITHDRAWN, '0' );
		$this->assertTrue( PublicEligibility::is_eligible( $post_id ) );
	}

	/** @test */
	public function test_deleted_resource_tombstone_is_not_eligible() {
		$created = $this->create_basic_page( 'publish' );
		$post_id = (int) $created['post_id'];
		$this->assertTrue( PublicEligibility::is_eligible( $post_id ) );

		wp_delete_post( $post_id, true );

		$this->assertNull( get_post( $post_id ) );
		$this->assertFalse( PublicEligibility::is_eligible( $post_id ) );
	}
}
