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
use SonghealthCore\Rest\ReferenceProjection;
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

		/*
		 * The attachment is established through the accepted T042 protected
		 * relationship: eligibility's document-specific rule is the valid
		 * one-to-one protected attachment, so a raw Media Library row alone
		 * no longer publishes the fixture.
		 */
		$tmp = tempnam( sys_get_temp_dir(), 'shp' );
		file_put_contents( $tmp, "%PDF-1.4\n%projection-fixture\n%%EOF\n" );
		$attached = \SonghealthCore\Binary\ProtectedAttachment::attach(
			(int) $created['post_id'],
			array(
				'tmp_name' => $tmp,
				'name'     => 'projection-fixture.pdf',
				'type'     => 'application/pdf',
				'size'     => (int) filesize( $tmp ),
			)
		);
		if ( file_exists( $tmp ) ) {
			unlink( $tmp );
		}
		$this->assertIsArray( $attached, 'the fixture attachment is established through the accepted relationship' );
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

	/**
	 * Build many eligible Document Resource fixtures for the budget tests.
	 *
	 * @param int $count How many eligible documents to create.
	 * @return string[] Their Public IDs, in creation order.
	 */
	private function create_eligible_documents( $count ) {
		$ids = array();
		for ( $i = 0; $i < $count; $i++ ) {
			$document = $this->create_document( 'publish' );
			$ids[]    = (string) $document['public_id'];
		}
		return $ids;
	}

	/** @test */
	public function test_exactly_100_raw_references_project_within_the_server_owned_budget() {
		$page       = $this->create_page();
		$eligible   = $this->create_eligible_documents( 99 );
		$withdrawn  = $this->create_document( 'publish' );
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		/* Exactly 100 RAW stored entries: 99 eligible, one withdrawn, none truncated. */
		$raw = array_merge( $eligible, array( (string) $withdrawn['public_id'] ) );
		$this->assertCount( 100, $raw );
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $raw );

		$context = ReferenceProjection::for_posts( array( get_post( (int) $page['post_id'] ) ) );
		$this->assertFalse( $context->over_budget(), '100 raw entries are within the response budget' );

		$dto = PublicProjector::project( get_post( (int) $page['post_id'] ), $context );
		$this->assertIsArray( $dto, 'the at-bound projection succeeds as a whole' );
		$this->assertSame( $eligible, $dto['documentReferences'], 'stored order is preserved and only currently eligible references are emitted' );
	}

	/** @test */
	public function test_over_bound_legacy_reference_state_fails_the_whole_projection() {
		$page     = $this->create_page();
		$eligible = $this->create_eligible_documents( 20 );

		/*
		 * The registered meta schema itself normalizes on write, so a
		 * persisted over-bound legacy set can only exist as DISTINCT
		 * shape-valid entries: 20 real references plus 81 distinct unknown
		 * identifiers, 101 raw stored entries in total.
		 */
		$unknown = array();
		for ( $i = 0; $i < 101 - 20; $i++ ) {
			$unknown[] = '00000000-0000-7000-8000-' . str_pad( dechex( $i ), 12, '0', STR_PAD_LEFT );
		}
		$raw = array_merge( $eligible, $unknown );
		$this->assertCount( 101, $raw );

		/* Legacy/bypassed over-bound stored state (direct meta write, not an authorized write). */
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $raw );

		$context = ReferenceProjection::for_posts( array( get_post( (int) $page['post_id'] ) ) );
		$this->assertTrue( $context->over_budget(), 'a 101-entry raw set is reported as over budget before any iteration' );

		$this->assertSame( array(), $context->eligible_references( $page['post_id'] ), 'an over-budget context resolves no reference at all' );
		$this->assertNull( PublicProjector::project( $page['post_id'], $context ), 'no partial DTO is produced for over-budget stored state' );
		$this->assertNull( PublicProjector::project( $page['post_id'] ), 'the projector fails closed even for a caller that skipped the preflight' );

		/* Nothing was silently repaired or truncated in storage. */
		$this->assertCount( 101, (array) get_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, true ) );
	}

	/** @test */
	public function test_reference_projection_is_set_based_without_per_reference_queries() {
		$many  = $this->create_eligible_documents( 25 );
		$one   = $this->create_eligible_documents( 1 );
		$pageA = $this->create_page();
		$pageB = $this->create_page();
		update_post_meta( (int) $pageA['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $many );
		update_post_meta( (int) $pageB['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $one );

		$countsA = $this->captured_projection_queries( (int) $pageA['post_id'] );
		$countsB = $this->captured_projection_queries( (int) $pageB['post_id'] );

		/*
		 * The work shape is FIXED for the response: one set-based mapping
		 * query and one set-based post load, whether the page references one
		 * document or twenty-five. Growing per-reference counts would be the
		 * N+1 fan-out FR-031 forbids.
		 */
		$this->assertSame( 1, $countsA['registry_set'], '25 references: exactly one set-based registry mapping query' );
		$this->assertSame( 1, $countsB['registry_set'], '1 reference: exactly one set-based registry mapping query' );
		$this->assertSame( $countsA['registry_single'], $countsB['registry_single'], 'the single-key registry lookups do not grow with the reference count' );
		$this->assertLessThanOrEqual( 1, $countsA['registry_single'], 'at most the parent page\'s own identity verification runs a single-key registry lookup — never one per reference' );
		$this->assertLessThanOrEqual( 1, $countsB['registry_single'], 'at most the parent page\'s own identity verification runs a single-key registry lookup — never one per reference' );

		$this->assertSame( 1, $countsA['posts_set'], '25 references: exactly one set-based referenced-post load' );
		$this->assertSame( 1, $countsB['posts_set'], '1 reference: exactly one set-based referenced-post load' );
		$this->assertSame( 0, $countsA['posts_single'], 'no per-reference single-post load (25 references)' );
		$this->assertSame( 0, $countsB['posts_single'], 'no per-reference single-post load (1 reference)' );

		$this->assertSame( 0, $countsA['postmeta_single_for_references'], 'no per-reference single-row metadata query (25 references)' );
		$this->assertSame( 0, $countsB['postmeta_single_for_references'], 'no per-reference single-row metadata query (1 reference)' );

		/* The projection result itself stays correct on both sides. */
		$dto = PublicProjector::project( (int) $pageA['post_id'] );
		$this->assertSame( $many, $dto['documentReferences'] );
	}

	/**
	 * Project one page with a clean object cache and classify every SQL
	 * query the projection issued, by shape.
	 *
	 * @param int $page_id Basic Page to project.
	 * @return int[] Query counts by classification.
	 */
	private function captured_projection_queries( $page_id ) {
		global $wpdb;

		/* Hold the parent page object across the flush so its own load is never counted as reference work. */
		$page = get_post( $page_id );
		wp_cache_flush();
		/* The parent page's own meta is outside the reference projection; prime it so only reference work is counted. */
		update_meta_cache( 'post', array( $page_id ) );

		$captured = array();
		$capture  = static function ( $query ) use ( &$captured ) {
			$captured[] = (string) $query;
			return $query;
		};
		add_filter( 'query', $capture );
		$dto = PublicProjector::project( $page );
		remove_filter( 'query', $capture );
		$this->assertIsArray( $dto, 'the instrumented projection must succeed' );

		$registry       = preg_quote( \SonghealthCore\Identity\RegistrySchema::table_name(), '/' );
		$posts          = preg_quote( $wpdb->posts, '/' );
		$postmeta       = preg_quote( $wpdb->postmeta, '/' );
		$reference_rows = array();

		/*
		 * Identify the internal post IDs the projection may legitimately
		 * touch one at a time (none: the page is primed above, references
		 * are set-based) — every single-row postmeta hit below is attributed
		 * by matching the referenced documents' and attachments' post IDs.
		 */
		$context = ReferenceProjection::for_posts( array( get_post( $page_id ) ) );
		foreach ( (array) get_post_meta( $page_id, FoundationTypes::META_DOCUMENT_REFERENCES, true ) as $public_id ) {
			$mapping = PublicIdRegistry::mapping_for( $public_id );
			if ( is_object( $mapping ) ) {
				$reference_rows[ (int) $mapping->internal_post_id ] = true;
				$attachment_id = (string) get_post_meta( (int) $mapping->internal_post_id, FoundationTypes::META_BINARY_ATTACHMENT_ID, true );
				if ( 1 === preg_match( '/^[1-9][0-9]*$/', $attachment_id ) ) {
					$reference_rows[ (int) $attachment_id ] = true;
				}
			}
		}

		$counts = array(
			'registry_set'                 => 0,
			'registry_single'              => 0,
			'posts_set'                    => 0,
			'posts_single'                 => 0,
			'postmeta_single_for_references' => 0,
		);
		foreach ( $captured as $query ) {
			if ( false !== strpos( $query, \SonghealthCore\Identity\RegistrySchema::table_name() ) ) {
				if ( 1 === preg_match( '/' . $registry . '.*' . preg_quote( 'public_id IN (', '/' ) . '/', $query ) ) {
					$counts['registry_set']++;
				} elseif ( 1 === preg_match( '/public_id\s*=/', $query ) ) {
					$counts['registry_single']++;
				}
				continue;
			}
			if ( false !== stripos( $query, 'FROM ' . $wpdb->posts ) ) {
				if ( 1 === preg_match( '/' . $posts . '.*' . preg_quote( 'ID IN (', '/' ) . '/', $query ) ) {
					$counts['posts_set']++;
				} elseif ( 1 === preg_match( '/' . $posts . '\s+WHERE ID = /', $query ) ) {
					$counts['posts_single']++;
				}
				continue;
			}
			if ( false !== stripos( $query, 'FROM ' . $wpdb->postmeta ) && 1 === preg_match( '/post_id\s*=/', $query ) ) {
				foreach ( array_keys( $reference_rows ) as $reference_post_id ) {
					if ( false !== strpos( $query, 'post_id = ' . $reference_post_id ) ) {
						$counts['postmeta_single_for_references']++;
						break;
					}
				}
			}
		}
		return $counts;
	}
}
