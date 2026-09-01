<?php
/**
 * Bounded continuation listing tests (Delivery 002, T017).
 *
 * Proves the reconciled bounded-listing contract: deterministic Public-ID
 * keyset continuation in both directions, page-size and hard server budget
 * bounds independent of registry size, empty-page continuation when the
 * budget ends with candidates remaining, terminal `hasMore=false` with no
 * cursor, the absence of totals/page counts, authoritative live eligibility
 * (and revocation) on every returned item, and a confidential,
 * integrity-protected cursor bound to type/order with version/expiry
 * behavior that fails closed through the bounded neutral invalid-request
 * class.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-007,
 * FR-008, FR-030 and the G02C-B02 design-boundary clarification;
 * contracts/public-rest.md §Bounded listing.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\EligibleResourceQuery;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group rest
 */
class EligibleResourceQueryTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** Phantom registry rows created for budget fixtures (no real posts). */
	private $phantom_post_ids = array();

	/** The most recently tracked fixture post ID. */
	private $last_tracked_id = 0;

	public function tear_down() {
		parent::tear_down();
		$this->delete_phantom_rows();
		$this->songhealth_delete_tracked_records();
	}

	/**
	 * Create an accepted Basic Page in a chosen lifecycle state.
	 *
	 * @param string $status WordPress post status.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $status = 'publish' ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Query Fixture Page',
				'post_status' => $status,
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		$this->last_tracked_id = (int) $created['post_id'];
		return $created;
	}

	/**
	 * Create an accepted Document Resource, optionally with a valid attachment.
	 *
	 * @param bool $attach Whether to attach a real attachment.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document( $attach = true ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Query Fixture Document',
				'post_status' => 'publish',
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		$this->last_tracked_id = (int) $created['post_id'];

		if ( $attach ) {
			/*
			 * The attachment is established through the accepted T042
			 * protected relationship: eligibility's document-specific rule is
			 * the valid one-to-one protected attachment, so a raw Media
			 * Library row alone no longer publishes the fixture.
			 */
			$tmp = tempnam( sys_get_temp_dir(), 'shq' );
			file_put_contents( $tmp, "%PDF-1.4\n%query-fixture\n%EOF\n" );
			$attached = \SonghealthCore\Binary\ProtectedAttachment::attach(
				(int) $created['post_id'],
				array(
					'tmp_name' => $tmp,
					'name'     => 'query-fixture.pdf',
					'type'     => 'application/pdf',
					'size'     => (int) filesize( $tmp ),
				)
			);
			if ( file_exists( $tmp ) ) {
				unlink( $tmp );
			}
			$this->assertIsArray( $attached, 'the fixture attachment is established through the accepted relationship' );
		}
		return $created;
	}

	/**
	 * Insert phantom live registry rows (mappings without real posts) to
	 * exercise the candidate budget cheaply; removed in tear_down.
	 *
	 * @param int $count How many phantom rows to insert.
	 * @return void
	 */
	private function create_phantom_rows( $count ) {
		for ( $i = 0; $i < $count; $i++ ) {
			$post_id = 90000000 + count( $this->phantom_post_ids );
			$this->assertIsString( PublicIdRegistry::assign( FoundationTypes::RESOURCE_BASIC_PAGE, $post_id ) );
			$this->phantom_post_ids[] = $post_id;
		}
	}

	/**
	 * Remove the phantom registry rows created for budget fixtures.
	 *
	 * @return void
	 */
	private function delete_phantom_rows() {
		global $wpdb;
		if ( array() === $this->phantom_post_ids ) {
			return;
		}
		$ids                   = $this->phantom_post_ids;
		$this->phantom_post_ids = array();
		$placeholders          = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}songhealth_identity_registry WHERE internal_post_id IN ( {$placeholders} )", $ids ) );
	}

	/**
	 * Walk a listing to its end, returning every data unit and every envelope.
	 *
	 * @param array $params      Base params (type, perPage, order).
	 * @param int   $max_requests Safety bound for the walk.
	 * @return array{units: array[], envelopes: array[]}
	 */
	private function walk_all( array $params, $max_requests = 60 ) {
		$units     = array();
		$envelopes = array();
		$cursor    = null;

		for ( $request = 0; $request < $max_requests; $request++ ) {
			$result = EligibleResourceQuery::query( $cursor ? $params + array( 'cursor' => $cursor ) : $params );
			$this->assertIsArray( $result );
			$envelopes[] = $result;
			$units       = array_merge( $units, $result['data'] );

			if ( ! $result['hasMore'] ) {
				$this->assertArrayNotHasKey( 'nextCursor', $result, 'a terminal envelope omits nextCursor entirely' );
				return array(
					'units'     => $units,
					'envelopes' => $envelopes,
				);
			}
			$this->assertArrayHasKey( 'nextCursor', $result, 'a continuing envelope carries nextCursor' );
			$this->assertIsString( $result['nextCursor'] );
			$cursor = $result['nextCursor'];
		}
		$this->fail( 'walk did not terminate within the safety bound' );
	}

	/** @test */
	public function test_type_is_required_and_allowlisted() {
		$this->assertWPError( EligibleResourceQuery::validate_params( array() ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( array( 'type' => 'post' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( array( 'type' => 'songhealth_page' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( array( 'type' => '' ) ) );

		$this->assertTrue( EligibleResourceQuery::validate_params( array( 'type' => 'basic-page' ) ) );
		$this->assertTrue( EligibleResourceQuery::validate_params( array( 'type' => 'document-resource' ) ) );
	}

	/** @test */
	public function test_per_page_must_be_positive_and_capped() {
		$base = array( 'type' => 'basic-page' );

		$this->assertTrue( EligibleResourceQuery::validate_params( $base ) );
		$this->assertTrue( EligibleResourceQuery::validate_params( $base + array( 'perPage' => 1 ) ) );
		$this->assertTrue( EligibleResourceQuery::validate_params( $base + array( 'perPage' => EligibleResourceQuery::MAX_PER_PAGE ) ) );

		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'perPage' => 0 ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'perPage' => EligibleResourceQuery::MAX_PER_PAGE + 1 ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'perPage' => 'many' ) ) );
	}

	/** @test */
	public function test_order_is_a_closed_allowlist() {
		$base = array( 'type' => 'basic-page' );

		$this->assertTrue( EligibleResourceQuery::validate_params( $base + array( 'order' => 'newest' ) ) );
		$this->assertTrue( EligibleResourceQuery::validate_params( $base + array( 'order' => 'oldest' ) ) );

		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'order' => 'title' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'order' => 'relevance' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'order' => 'RAND()' ) ) );
	}

	/** @test */
	public function test_cursor_shape_is_bounded() {
		$base = array( 'type' => 'basic-page' );

		$this->assertTrue( EligibleResourceQuery::validate_params( $base + array( 'cursor' => 'opaque-value' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'cursor' => '' ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'cursor' => array( 'not' => 'a string' ) ) ) );
		$this->assertWPError( EligibleResourceQuery::validate_params( $base + array( 'cursor' => str_repeat( 'x', 513 ) ) ) );
	}

	/** @test */
	public function test_invalid_input_yields_a_bounded_value_free_error() {
		$result = EligibleResourceQuery::query( array( 'type' => 'not-a-type' ) );
		$this->assertWPError( $result );
		/* The error code is the bounded invalid-input category; no value is echoed. */
		$this->assertSame( 'songhealth_invalid_request', $result->get_error_code() );
		$this->assertSame( '', (string) $result->get_error_message() );
	}

	/** @test */
	public function test_empty_type_is_a_terminal_empty_envelope() {
		$result = EligibleResourceQuery::query( array( 'type' => 'document-resource' ) );

		$this->assertSame( array( 'data', 'hasMore' ), array_keys( $result ), 'a terminal envelope contains exactly data and hasMore' );
		$this->assertSame( array(), $result['data'] );
		$this->assertFalse( $result['hasMore'] );
		$this->assertArrayNotHasKey( 'nextCursor', $result, 'a terminal response omits the cursor key entirely' );
	}

	/** @test */
	public function test_the_envelope_is_exactly_the_contract_shape_and_never_carries_totals() {
		$this->create_page( 'publish' );
		$this->create_page( 'publish' );

		/* Continuing response: exactly data, hasMore, nextCursor (string). */
		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1 ) );
		$this->assertIsArray( $result );
		$this->assertTrue( $result['hasMore'] );
		$this->assertSame( array( 'data', 'hasMore', 'nextCursor' ), array_keys( $result ) );
		$this->assertIsString( $result['nextCursor'] );

		/* Terminal response: exactly data and hasMore, cursor key absent. */
		$terminal = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 5 ) );
		$this->assertFalse( $terminal['hasMore'] );
		$this->assertSame( array( 'data', 'hasMore' ), array_keys( $terminal ) );
		$this->assertArrayNotHasKey( 'nextCursor', $terminal );

		foreach ( array( $result, $terminal ) as $envelope ) {
			$encoded = (string) wp_json_encode( $envelope );
			foreach ( array( 'total', 'perPage', 'page' ) as $forbidden ) {
				$this->assertStringNotContainsString( '"' . $forbidden . '"', $encoded, "the reconciled envelope must not carry {$forbidden}" );
			}
		}
	}

	/** @test */
	public function test_deterministic_forward_and_reverse_continuation_covers_every_eligible_record_once() {
		$eligible = array();
		for ( $i = 0; $i < 12; $i++ ) {
			$eligible[] = (string) $this->create_page( 'publish' )['public_id'];
		}
		$this->create_page( 'draft' );
		$withdrawn = $this->create_page( 'publish' );
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$oldest_sorted = $eligible;
		sort( $oldest_sorted );

		/* Forward: oldest order walks the deterministic Public-ID order. */
		$forward = $this->walk_all( array( 'type' => 'basic-page', 'perPage' => 5, 'order' => 'oldest' ) );
		$this->assertSame( $oldest_sorted, wp_list_pluck( $forward['units'], 'public_id' ), 'forward walk returns each eligible record exactly once in Public-ID order' );

		/* Reverse: newest order walks the same total order backwards. */
		$reverse = $this->walk_all( array( 'type' => 'basic-page', 'perPage' => 4, 'order' => 'newest' ) );
		$this->assertSame( array_reverse( $oldest_sorted ), wp_list_pluck( $reverse['units'], 'public_id' ) );

		/* Every envelope respected perPage and carried a cursor exactly when it continued. */
		foreach ( array_merge( $forward['envelopes'], $reverse['envelopes'] ) as $envelope ) {
			$this->assertLessThanOrEqual( 5, count( $envelope['data'] ) );
			if ( ! $envelope['hasMore'] ) {
				$this->assertArrayNotHasKey( 'nextCursor', $envelope );
			} else {
				$this->assertIsString( $envelope['nextCursor'] );
			}
		}
	}

	/** @test */
	public function test_continuation_walk_returns_exactly_the_authoritative_eligible_set() {
		/*
		 * `PublicEligibility` is the only eligibility authority: the walk must
		 * return exactly the set the live decision accepts, across every rule
		 * of the decision. (The query reproduces no rule in SQL — this matrix
		 * pins the scan + decision combination as a whole.)
		 */
		$fixtures = array();

		$fixtures['eligible_baseline'] = $this->create_page( 'publish' );
		$fixtures['draft']             = $this->create_page( 'draft' );
		$fixtures['private']           = $this->create_page( 'private' );
		$fixtures['trash']             = $this->create_page( 'publish' );
		wp_update_post( array( 'ID' => (int) $fixtures['trash']['post_id'], 'post_status' => 'trash' ) );

		$future = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );
		$fixtures['scheduled'] = CreateTimePublicId::create(
			array(
				'post_type'     => FoundationTypes::BASIC_PAGE,
				'post_title'    => 'Scheduled Matrix Fixture',
				'post_status'   => 'future',
				'post_date'     => $future,
				'post_date_gmt' => $future,
			)
		);
		$this->assertIsArray( $fixtures['scheduled'] );
		$this->songhealth_track_record( (int) $fixtures['scheduled']['post_id'] );

		$fixtures['visibility_hidden']   = $this->create_page( 'publish' );
		update_post_meta( (int) $fixtures['visibility_hidden']['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_HIDDEN );
		$fixtures['visibility_internal'] = $this->create_page( 'publish' );
		update_post_meta( (int) $fixtures['visibility_internal']['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_INTERNAL );

		$fixtures['withdrawn'] = $this->create_page( 'publish' );
		update_post_meta( (int) $fixtures['withdrawn']['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$fixtures['untitled'] = $this->create_page( 'publish' );
		wp_update_post( array( 'ID' => (int) $fixtures['untitled']['post_id'], 'post_title' => '' ) );

		$fixtures['tombstoned'] = $this->create_page( 'publish' );
		wp_delete_post( (int) $fixtures['tombstoned']['post_id'], true );

		/* An identityless row that bypassed the creation service: never a candidate at all. */
		remove_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ) );
		$bypassed = wp_insert_post(
			array( 'post_type' => FoundationTypes::BASIC_PAGE, 'post_title' => 'Bypassed Matrix Fixture', 'post_status' => 'publish' ),
			true
		);
		add_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ), 10, 2 );
		$this->assertNotWPError( $bypassed );
		$this->songhealth_track_record( (int) $bypassed );

		$expected = array();
		foreach ( $fixtures as $fixture ) {
			if ( PublicEligibility::is_eligible( (int) $fixture['post_id'] ) ) {
				$expected[] = (string) $fixture['public_id'];
			}
		}
		sort( $expected );
		$this->assertNotEmpty( $expected, 'matrix must include at least one eligible fixture' );

		$walk = $this->walk_all( array( 'type' => 'basic-page', 'perPage' => 3, 'order' => 'oldest' ) );
		$this->assertSame( $expected, wp_list_pluck( $walk['units'], 'public_id' ), 'the walk returns exactly the authoritative eligible set' );

		/* Document Resources: attachment validity is part of the matrix. */
		$document_with     = $this->create_document( true );
		$document_without  = $this->create_document( false );
		$document_dangling = $this->create_document( false );
		update_post_meta( (int) $document_dangling['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, '999999999' );

		$walk_documents = $this->walk_all( array( 'type' => 'document-resource', 'perPage' => 2, 'order' => 'oldest' ) );
		$this->assertSame( array( (string) $document_with['public_id'] ), wp_list_pluck( $walk_documents['units'], 'public_id' ), 'only the validly attached document is eligible' );
	}

	/** @test */
	public function test_revocation_applies_to_the_next_page_of_a_walk() {
		$pages = array();
		for ( $i = 0; $i < 5; $i++ ) {
			$pages[] = $this->create_page( 'publish' );
		}

		$first = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 2, 'order' => 'oldest' ) );
		$this->assertIsArray( $first );
		$this->assertCount( 2, $first['data'] );
		$this->assertTrue( $first['hasMore'] );

		/*
		 * Revoke a record that has not been returned yet: it must not appear
		 * on the continuation page — every returned item passes the live
		 * decision, and no eligibility is carried across requests.
		 */
		$returned = wp_list_pluck( $first['data'], 'public_id' );
		$pending  = null;
		foreach ( $pages as $page ) {
			if ( ! in_array( (string) $page['public_id'], $returned, true ) ) {
				$pending = $page;
				break;
			}
		}
		$this->assertNotNull( $pending );
		update_post_meta( (int) $pending['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$second = EligibleResourceQuery::query(
			array(
				'type'    => 'basic-page',
				'perPage' => 3,
				'order'   => 'oldest',
				'cursor'  => $first['nextCursor'],
			)
		);
		$this->assertIsArray( $second );
		$this->assertNotContains( (string) $pending['public_id'], wp_list_pluck( $second['data'], 'public_id' ), 'a record revoked between pages must not be disclosed' );
		$this->assertCount( 2, $second['data'], 'five records, two returned, one revoked: two remain' );
		$this->assertFalse( $second['hasMore'] );
		$this->assertArrayNotHasKey( 'nextCursor', $second, 'a terminal envelope omits the cursor key entirely' );
	}

	/** @test */
	public function test_hard_budget_bounds_evaluation_independently_of_registry_size() {
		/*
		 * G02C-B02 regression: more live registry candidates than the hard
		 * server budget. The first request must stop at the budget — never at
		 * the registry — and preserve progress with an empty data page when
		 * nothing eligible was found among the scanned candidates.
		 */
		$this->create_phantom_rows( EligibleResourceQuery::MAX_CANDIDATES_PER_REQUEST + 5 );
		usleep( 3000 ); /* Guarantee the eligible fixtures sort strictly after the phantoms. */
		$eligible = array();
		for ( $i = 0; $i < 3; $i++ ) {
			$eligible[] = (string) $this->create_page( 'publish' )['public_id'];
		}

		$first = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 3, 'order' => 'oldest' ) );
		$this->assertIsArray( $first );

		$this->assertSame(
			EligibleResourceQuery::MAX_CANDIDATES_PER_REQUEST,
			EligibleResourceQuery::last_evaluation_count(),
			'evaluation is bounded by the hard server budget, not the registry size'
		);
		$this->assertSame( array(), $first['data'], 'an exhausted budget with no eligible find returns an empty data page' );
		$this->assertTrue( $first['hasMore'], 'candidates remain: progress must be preserved, never falsely reported as exhausted' );
		$this->assertIsString( $first['nextCursor'] );

		$second = EligibleResourceQuery::query(
			array(
				'type'    => 'basic-page',
				'perPage' => 3,
				'order'   => 'oldest',
				'cursor'  => $first['nextCursor'],
			)
		);
		$this->assertIsArray( $second );
		sort( $eligible );
		$this->assertSame( $eligible, wp_list_pluck( $second['data'], 'public_id' ), 'the continuation page returns the remaining eligible records' );
		$this->assertFalse( $second['hasMore'], 'the walk terminates at the end of the candidates' );
		$this->assertArrayNotHasKey( 'nextCursor', $second, 'a terminal envelope omits the cursor key entirely' );
		$this->assertLessThanOrEqual( EligibleResourceQuery::MAX_CANDIDATES_PER_REQUEST, EligibleResourceQuery::last_evaluation_count() );
	}

	/** @test */
	public function test_page_size_bounds_data_and_evaluation_stops_when_the_page_fills() {
		/*
		 * With more eligible records than perPage, one request returns at
		 * most perPage items and evaluates only as many candidates as it
		 * needed — bounded by perPage when every scan is a hit.
		 */
		$eligible = array();
		for ( $i = 0; $i < 30; $i++ ) {
			$eligible[] = (string) $this->create_page( 'publish' )['public_id'];
		}

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 4, 'order' => 'newest' ) );
		$this->assertIsArray( $result );
		$this->assertCount( 4, $result['data'] );
		$this->assertTrue( $result['hasMore'] );
		$this->assertSame( 4, EligibleResourceQuery::last_evaluation_count(), 'a fully hit page evaluates exactly perPage candidates' );

		sort( $eligible );
		$expected_first_page = array_slice( array_reverse( $eligible ), 0, 4 );
		$this->assertSame( $expected_first_page, wp_list_pluck( $result['data'], 'public_id' ) );
	}

	/** @test */
	public function test_cursor_is_confidential_and_reveals_nothing() {
		$this->create_page( 'publish' );
		$this->create_page( 'draft' );
		$eligible = $this->create_page( 'publish' );

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertTrue( $result['hasMore'] );
		$cursor = $result['nextCursor'];
		$this->assertIsString( $cursor );

		/* Confidentiality: the cursor exposes no carried state to its holder. */
		$this->assertStringNotContainsString( 'basic-page', $cursor );
		$this->assertStringNotContainsString( 'oldest', $cursor );
		$this->assertStringNotContainsString( (string) $eligible['public_id'], $cursor );
		foreach ( array( 'public_id', 'internal_post_id', 'post_id', 'resource_type' ) as $word ) {
			$this->assertStringNotContainsString( $word, $cursor );
		}
		$this->assertDoesNotMatchRegularExpression( '/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/', $cursor, 'no Public ID may appear in the encoded cursor' );
	}

	/** @test */
	public function test_malformed_and_tampered_cursors_fail_closed() {
		$this->create_page( 'publish' );
		$this->create_page( 'publish' );

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertIsString( $result['nextCursor'] );
		$valid = $result['nextCursor'];

		$invalid_cursors = array(
			'garbage'          => 'not-base64!!',
			'truncated'        => substr( $valid, 0, strlen( $valid ) - 4 ),
			'flipped-byte'     => substr( $valid, 0, 10 ) . ( 'A' === $valid[10] ? 'B' : 'A' ) . substr( $valid, 11 ),
			'appended-garbage' => $valid . 'AAAA',
			'added-padding'    => $valid . '==',
		);
		foreach ( $invalid_cursors as $label => $cursor ) {
			$query = EligibleResourceQuery::query(
				array(
					'type'   => 'basic-page',
					'order'  => 'oldest',
					'cursor' => $cursor,
				)
			);
			$this->assertWPError( $query, "{$label} cursor must fail closed" );
			$this->assertSame( 'songhealth_invalid_request', $query->get_error_code(), "{$label} must use the bounded neutral invalid-request class" );
		}
	}

	/** @test */
	public function test_only_the_exact_issued_canonical_base64url_token_is_accepted() {
		/*
		 * G02C-B04: alternate encodings of the SAME ciphertext bytes — the
		 * standard-alphabet substitution of either URL-safe character, added
		 * padding, and any whitespace — must be rejected exactly like a
		 * tampered cursor, because each one is a different, non-issued token
		 * text that must never be laundered into an accepted request.
		 *
		 * Enough genuine cursors are minted that tokens containing `-` and
		 * tokens containing `_` BOTH exist deterministically, so each
		 * substitution case is exercised on a token that actually carries the
		 * character being substituted.
		 */
		/*
		 * Twenty eligible records give the perPage=1 walk up to nineteen
		 * genuine continuation tokens — enough that tokens containing `-` and
		 * tokens containing `_` both exist for certain in practice; the
		 * assertions below fail loudly if the minted set ever misses one.
		 */
		for ( $i = 0; $i < 20; $i++ ) {
			$this->create_page( 'publish' );
		}

		$with_dash       = null;
		$with_underscore = null;
		$cursor          = null;
		for ( $i = 0; $i < 19 && ( null === $with_dash || null === $with_underscore ); $i++ ) {
			$result = EligibleResourceQuery::query(
				array(
					'type'    => 'basic-page',
					'perPage' => 1,
					'order'   => 'oldest',
				) + ( null === $cursor ? array() : array( 'cursor' => $cursor ) )
			);
			$this->assertIsArray( $result );
			$this->assertTrue( $result['hasMore'], 'each round mints a continuing token while records remain' );
			$token = $result['nextCursor'];
			$this->assertIsString( $token );
			$cursor = $token;
			if ( null === $with_dash && false !== strpos( $token, '-' ) ) {
				$with_dash = $token;
			}
			if ( null === $with_underscore && false !== strpos( $token, '_' ) ) {
				$with_underscore = $token;
			}
		}
		$this->assertNotNull( $with_dash, 'a genuine token containing the URL-safe dash was minted' );
		$this->assertNotNull( $with_underscore, 'a genuine token containing the URL-safe underscore was minted' );

		$canonical = null;
		foreach ( array( 'dash' => $with_dash, 'underscore' => $with_underscore ) as $token ) {
			/* The issued token itself is accepted. */
			$this->assertIsArray(
				EligibleResourceQuery::query( array( 'type' => 'basic-page', 'order' => 'oldest', 'cursor' => $token ) ),
				'the exact issued token must be accepted'
			);

			$variants = array(
				'dash-to-plus'        => str_replace( '-', '+', $token ),
				'underscore-to-slash' => str_replace( '_', '/', $token ),
				'added-padding'       => $token . '==',
				'leading-space'       => ' ' . $token,
				'trailing-space'      => $token . ' ',
				'leading-newline'     => "\n" . $token,
				'trailing-tab'        => $token . "\t",
				'internal-space'      => substr( $token, 0, 10 ) . ' ' . substr( $token, 10 ),
				'internal-newline'    => substr( $token, 0, 10 ) . "\n" . substr( $token, 10 ),
				'lowercased-alphabet' => strtolower( $token ),
				'uppercased-alphabet' => strtoupper( $token ),
			);
			foreach ( $variants as $label => $variant ) {
				if ( $variant === $token ) {
					continue; /* A token with no cased letters would be unchanged; both minted tokens carry case. */
				}
				if ( null === $canonical ) {
					$canonical = array( $label => $variant );
				}
				$query = EligibleResourceQuery::query(
					array(
						'type'   => 'basic-page',
						'order'  => 'oldest',
						'cursor' => $variant,
					)
				);
				$this->assertWPError( $query, "{$label} must be rejected: only the exact issued canonical token is accepted" );
				$this->assertSame( 'songhealth_invalid_request', $query->get_error_code(), "{$label} must use the bounded neutral invalid-request class" );
			}
		}
		$this->assertNotNull( $canonical, 'at least one non-canonical variant was exercised' );
	}

	/** @test */
	public function test_cursor_is_bound_to_type_and_order() {
		$this->create_page( 'publish' );
		$this->create_page( 'publish' );

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertIsString( $result['nextCursor'] );
		$cursor = $result['nextCursor'];

		/* The same cursor under the other order or another type is a mismatch. */
		$this->assertWPError( EligibleResourceQuery::query( array( 'type' => 'basic-page', 'order' => 'newest', 'cursor' => $cursor ) ) );
		$this->assertWPError( EligibleResourceQuery::query( array( 'type' => 'document-resource', 'order' => 'oldest', 'cursor' => $cursor ) ) );

		/* The matching binding continues normally. */
		$this->assertIsArray( EligibleResourceQuery::query( array( 'type' => 'basic-page', 'order' => 'oldest', 'cursor' => $cursor ) ) );
	}

	/** @test */
	public function test_expired_and_wrong_version_cursors_fail_closed() {
		/*
		 * Genuine ciphertexts are rebuilt with the same purpose-derived key
		 * but an expired timestamp and a wrong version: both must fail closed
		 * through the bounded invalid-request class.
		 */
		$state = array(
			'v' => EligibleResourceQuery::CURSOR_VERSION,
			't' => 'basic-page',
			'o' => 'oldest',
			'p' => '00000000-0000-7000-8000-000000000000',
			'e' => time() + 60,
		);

		$expired            = $state;
		$expired['e']       = time() - 1;
		$wrong_version      = $state;
		$wrong_version['v'] = 99;

		$key  = hash( 'sha256', 'songhealth/listing-cursor/v1|' . wp_salt( 'auth' ), true );
		$seal = function ( array $payload ) use ( $key ) {
			$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$boxed = sodium_crypto_secretbox( wp_json_encode( $payload ), $nonce, $key );
			return rtrim( strtr( base64_encode( $nonce . $boxed ), '+/', '-_' ), '=' );
		};

		foreach ( array( 'expired' => $expired, 'wrong-version' => $wrong_version ) as $label => $payload ) {
			$cursor = $seal( $payload );
			$result = EligibleResourceQuery::query(
				array(
					'type'   => 'basic-page',
					'order'  => 'oldest',
					'cursor' => $cursor,
				)
			);
			$this->assertWPError( $result, "{$label} cursor must fail closed" );
			$this->assertSame( 'songhealth_invalid_request', $result->get_error_code() );
		}
	}

	/** @test */
	public function test_listing_is_scoped_to_the_requested_type() {
		$page     = $this->create_page( 'publish' );
		$document = $this->create_document( false );

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page' ) );
		$this->assertSame( array( (string) $page['public_id'] ), wp_list_pluck( $result['data'], 'public_id' ) );
		$this->assertFalse( $result['hasMore'] );

		$this->assertSame( array(), EligibleResourceQuery::query( array( 'type' => 'document-resource' ) )['data'], 'an invalid-for-publication document is never listed' );
	}

	/** @test */
	public function test_detail_resolves_by_public_id_through_current_eligibility() {
		$eligible = $this->create_page( 'publish' );
		$draft    = $this->create_page( 'draft' );

		$resolved = EligibleResourceQuery::eligible_detail( 'basic-page', (string) $eligible['public_id'] );
		$this->assertInstanceOf( 'WP_Post', $resolved );
		$this->assertSame( (int) $eligible['post_id'], (int) $resolved->ID );

		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', (string) $draft['public_id'] ) );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'document-resource', (string) $eligible['public_id'] ), 'a wrong type never resolves' );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', '00000000-0000-7000-8000-000000000000' ), 'an unknown ID is simply absent' );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', 'not-a-uuid' ) );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'post', (string) $eligible['public_id'] ) );
	}

	/** @test */
	public function test_detail_eligibility_is_current_per_call() {
		$created = $this->create_page( 'publish' );
		$post_id = (int) $created['post_id'];

		$this->assertInstanceOf( 'WP_Post', EligibleResourceQuery::eligible_detail( 'basic-page', (string) $created['public_id'] ) );

		update_post_meta( $post_id, FoundationTypes::META_WITHDRAWN, '1' );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', (string) $created['public_id'] ), 'revocation applies to the next request' );

		wp_delete_post( $post_id, true );
		$this->assertNull( EligibleResourceQuery::eligible_detail( 'basic-page', (string) $created['public_id'] ), 'a tombstoned mapping resolves to nothing' );
	}

	/** @test */
	public function test_registry_absence_fails_closed_to_a_terminal_empty_envelope() {
		/*
		 * A missing registry is produced by pointing the schema at a prefix
		 * with no table, rather than by DDL: the test framework isolates DDL
		 * per test, and the terminal empty envelope under a missing schema is
		 * exactly the fail-closed contract under proof.
		 */
		global $wpdb;
		$prefix       = $wpdb->prefix;
		$wpdb->prefix = 'songhealth_absent_prefix_';

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page' ) );

		$wpdb->prefix = $prefix;
		$this->assertSame( array( 'data', 'hasMore' ), array_keys( $result ) );
		$this->assertSame( array(), $result['data'] );
		$this->assertFalse( $result['hasMore'] );
		$this->assertArrayNotHasKey( 'nextCursor', $result );
	}
}
