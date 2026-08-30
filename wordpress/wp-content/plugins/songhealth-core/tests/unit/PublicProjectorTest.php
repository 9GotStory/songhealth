<?php
/**
 * Explicit public projector tests (Delivery 002, T015).
 *
 * Proves the DTO allowlist (Songhealth concepts only, no WordPress/internal/
 * user/raw-media fields), the projection's dependence on a fresh eligibility
 * decision, and reference filtering that never elevates an ineligible
 * Document Resource.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-006,
 * FR-007, FR-011, FR-019; contracts/public-rest.md §Detail, §Canonical
 * behavior; data-model.md §Public Projection.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\PublicProjector;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_UnitTestCase;

/**
 * @group rest
 */
class PublicProjectorTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	public function tear_down() {
		parent::tear_down();
		$this->songhealth_delete_tracked_records();
	}

	/**
	 * Create an accepted published Basic Page.
	 *
	 * @param array $args Optional post overrides.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $args = array() ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'    => FoundationTypes::BASIC_PAGE,
				'post_title'   => isset( $args['post_title'] ) ? $args['post_title'] : 'Projection Fixture Page',
				'post_content' => isset( $args['post_content'] ) ? $args['post_content'] : '<p>Projection fixture body.</p>',
				'post_name'    => isset( $args['post_name'] ) ? $args['post_name'] : 'projection-fixture-page',
				'post_status'  => 'publish',
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/**
	 * Create an accepted Document Resource with an attachment.
	 *
	 * @param string $status WordPress post status.
	 * @param array  $meta   Meta to set after creation.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document( $status = 'publish', $meta = array() ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'  => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title' => 'Projection Fixture Document',
				'post_name'  => 'fixture-document',
				'post_status' => $status,
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );

		$attachment_id = self::factory()->attachment->create_object(
			'projection-fixture.pdf',
			(int) $created['post_id'],
			array(
				'post_mime_type' => 'application/pdf',
				'post_type'      => 'attachment',
			)
		);
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $attachment_id );
		foreach ( $meta as $key => $value ) {
			update_post_meta( (int) $created['post_id'], $key, $value );
		}
		return $created;
	}

	/** @test */
	public function test_basic_page_projection_is_exactly_the_allowlisted_dto() {
		$created = $this->create_page();
		$post_id = (int) $created['post_id'];

		update_post_meta( $post_id, FoundationTypes::META_SUMMARY, 'A bounded summary.' );
		$public_id = (string) $created['public_id'];

		$dto = PublicProjector::project( $post_id );
		$this->assertIsArray( $dto );

		$this->assertSame(
			array( 'type', 'publicId', 'title', 'canonicalPath', 'summary', 'body' ),
			array_keys( $dto ),
			'the Basic Page DTO must contain exactly the allowlisted fields'
		);
		$this->assertSame( 'basic-page', $dto['type'] );
		$this->assertSame( $public_id, $dto['publicId'] );
		$this->assertSame( 'Projection Fixture Page', $dto['title'] );
		$this->assertSame( '/pages/' . $public_id . '/projection-fixture-page', $dto['canonicalPath'] );
		$this->assertSame( 'A bounded summary.', $dto['summary'] );
		$this->assertSame( '<p>Projection fixture body.</p>', $dto['body'] );
	}

	/** @test */
	public function test_basic_page_projection_never_carries_internal_fields() {
		$created = $this->create_page();
		$post_id = (int) $created['post_id'];

		$author = self::factory()->user->create();
		wp_update_post( array( 'ID' => $post_id, 'post_author' => $author ) );

		$dto     = PublicProjector::project( $post_id );
		$encoded = (string) wp_json_encode( $dto );

		$forbidden = array(
			'post_',
			'ID',
			'status',
			'author',
			'user',
			'meta',
			'guid',
			'menu_order',
			'comment',
			'ping',
			'attachment',
			'filename',
			'uploads',
			'wp-content',
		);
		foreach ( $forbidden as $needle ) {
			$this->assertStringNotContainsString( $needle, $encoded, "projection must not contain '{$needle}'" );
		}

		/*
		 * The internal post ID must not appear as a value or key anywhere.
		 * It is checked on the DTO WITHOUT the two legitimate identifier
		 * fields, because a short numeric ID can occur inside the public
		 * UUID's hex by coincidence.
		 */
		$without_public_identity = $dto;
		unset( $without_public_identity['publicId'], $without_public_identity['canonicalPath'] );
		$this->assertStringNotContainsString( (string) $post_id, (string) wp_json_encode( $without_public_identity ), 'the internal post ID must never project' );

		$this->assertArrayNotHasKey( 'downloadPath', $dto, 'a Basic Page never carries a download path' );
	}

	/** @test */
	public function test_document_resource_projection_carries_only_document_fields() {
		$created  = $this->create_document( 'publish', array( FoundationTypes::META_DOCUMENT_DATE => '2026-08-30' ) );
		$dto      = PublicProjector::project( (int) $created['post_id'] );
		$public_id = (string) $created['public_id'];

		$this->assertSame(
			array( 'type', 'publicId', 'title', 'canonicalPath', 'documentDate', 'downloadPath' ),
			array_keys( $dto ),
			'the Document Resource DTO must contain exactly the allowlisted fields'
		);
		$this->assertSame( 'document-resource', $dto['type'] );
		$this->assertSame( '/documents/' . $public_id . '/fixture-document', $dto['canonicalPath'] );
		$this->assertSame( '2026-08-30', $dto['documentDate'] );
		$this->assertSame( '/wp-json/songhealth/v1/documents/' . $public_id . '/binary', $dto['downloadPath'] );

		$encoded = (string) wp_json_encode( $dto );
		$this->assertStringNotContainsString( '.pdf', $encoded, 'the raw filename identity must never project' );
		$this->assertStringNotContainsString( 'projection-fixture.pdf', $encoded, 'no storage identity leaks through the projection' );
	}

	/** @test */
	public function test_projection_requires_current_eligibility() {
		$created = $this->create_page();
		$post_id = (int) $created['post_id'];

		$this->assertIsArray( PublicProjector::project( $post_id ) );

		wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );
		$this->assertNull( PublicProjector::project( $post_id ), 'a non-public record has no public projection at all' );

		wp_update_post( array( 'ID' => $post_id, 'post_status' => 'publish' ) );
		$this->assertIsArray( PublicProjector::project( $post_id ), 'projection follows the current decision, not history' );

		update_post_meta( $post_id, FoundationTypes::META_WITHDRAWN, '1' );
		$this->assertNull( PublicProjector::project( $post_id ) );
	}

	/** @test */
	public function test_unsupported_and_absent_records_have_no_projection() {
		$this->assertNull( PublicProjector::project( 999999999 ) );

		$post_id = self::factory()->post->create( array( 'post_status' => 'publish' ) );
		$this->assertNull( PublicProjector::project( $post_id ) );
	}

	/** @test */
	public function test_eligible_references_are_retained_and_ineligible_references_omitted() {
		$page      = $this->create_page();
		$eligible  = $this->create_document( 'publish' );
		$draft     = $this->create_document( 'draft' );
		$withdrawn = $this->create_document( 'publish' );
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$unknown_shape = '00000000-0000-7000-8000-000000000000';
		$references    = array(
			(string) $eligible['public_id'],
			(string) $draft['public_id'],
			(string) $withdrawn['public_id'],
			$unknown_shape,
		);
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $references );

		$dto = PublicProjector::project( (int) $page['post_id'] );
		$this->assertIsArray( $dto );
		$this->assertSame(
			array( (string) $eligible['public_id'] ),
			$dto['documentReferences'],
			'only the currently eligible Document Resource may be retained as a reference'
		);
	}

	/** @test */
	public function test_reference_eligibility_is_redecided_per_projection() {
		$page     = $this->create_page();
		$document = $this->create_document( 'draft' );
		$post_id  = (int) $page['post_id'];
		$doc_id   = (int) $document['post_id'];

		update_post_meta( $post_id, FoundationTypes::META_DOCUMENT_REFERENCES, array( (string) $document['public_id'] ) );

		$dto = PublicProjector::project( $post_id );
		$this->assertIsArray( $dto );
		$this->assertArrayNotHasKey( 'documentReferences', $dto, 'a draft reference must be omitted entirely' );

		wp_update_post( array( 'ID' => $doc_id, 'post_status' => 'publish' ) );
		$dto = PublicProjector::project( $post_id );
		$this->assertIsArray( $dto );
		$this->assertSame( array( (string) $document['public_id'] ), $dto['documentReferences'] );

		update_post_meta( $doc_id, FoundationTypes::META_WITHDRAWN, '1' );
		$dto = PublicProjector::project( $post_id );
		$this->assertIsArray( $dto );
		$this->assertArrayNotHasKey( 'documentReferences', $dto, 'a withdrawn reference must be omitted again' );
	}

	/** @test */
	public function test_canonical_path_omits_unsafe_or_missing_slug_segments() {
		$public_id = '00000000-0000-7000-8000-000000000000';

		$this->assertSame( '/pages/' . $public_id, PublicProjector::canonical_path( 'basic-page', $public_id, '' ), 'a missing slug is omitted: identity is the Public ID' );
		$this->assertSame( '/documents/' . $public_id, PublicProjector::canonical_path( 'document-resource', $public_id ) );
		$this->assertSame( '/pages/' . $public_id . '/safe-slug', PublicProjector::canonical_path( 'basic-page', $public_id, 'safe-slug' ) );
		$this->assertSame(
			'/pages/' . $public_id,
			PublicProjector::canonical_path( 'basic-page', $public_id, 'not a safe/slug!' ),
			'a slug outside the safe single-segment shape is omitted, never normalized into identity'
		);
		$this->assertSame( '/pages/' . $public_id, PublicProjector::canonical_path( 'basic-page', $public_id, '../traversal' ) );
	}
}
