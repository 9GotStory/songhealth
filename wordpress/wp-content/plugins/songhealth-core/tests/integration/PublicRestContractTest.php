<?php
/**
 * Public REST contract tests (Delivery 002, T021 / US1).
 *
 * Proves the live `songhealth/v1` resource-detail and bounded-listing
 * operations against the accepted contract: detail allowlists for both
 * supported types, the one neutral class for every unknown and ineligible
 * condition, bounded listing validation, deterministic Public-ID keyset
 * continuation, the hard candidate/evaluation bound with its empty
 * all-ineligible continuation window, authoritative eligibility of every
 * returned item, cursor confidentiality/integrity/type/order/version/expiry
 * with fail-closed rejection, the absence of exact totals/page counts, and
 * the absence of any Songhealth search parameter or route (FR-006–FR-008,
 * FR-012, FR-030; contracts/public-rest.md; SC-001, SC-003).
 *
 * EXPECTED RED before T025: every case that expects a working detail or
 * listing response fails against the fail-closed foundational handlers
 * (Routes::detail_item / Routes::list_items), which answer the neutral
 * not-found class until the authorized US1 controller exists.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-006–
 * FR-008, FR-011, FR-012, FR-030 and the G02C-B02 clarification;
 * contracts/public-rest.md; data-model.md §Public Projection.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Identity\RegistrySchema;
use SonghealthCore\Rest\EligibleResourceQuery;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\PublicProjector;
use SonghealthCore\Rest\Routes;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group rest
 * @group us1
 */
class PublicRestContractTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** Sentinel values that must never survive into a public response. */
	const SENTINEL_META_KEY   = '_songhealth_contract_sentinel';
	const SENTINEL_META_VALUE = 'SENTINEL-PROTECTED-META-8f31';
	const SENTINEL_AUTHOR     = 'sentinelcontractauthor';

	/** Phantom registry rows created for budget fixtures (no real posts). */
	private $phantom_post_ids = array();

	public function set_up() {
		parent::set_up();
		wp_set_current_user( 0 );
	}

	public function tear_down() {
		parent::tear_down();
		$this->delete_phantom_rows();
		$this->songhealth_delete_tracked_records();
	}

	/**
	 * Create an accepted Basic Page fixture with sentinel-protected internals.
	 *
	 * @param string $status WordPress post status.
	 * @param array  $args   Optional overrides (title, post_name, content, summary).
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $status = 'publish', $args = array() ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'    => FoundationTypes::BASIC_PAGE,
				'post_title'   => isset( $args['title'] ) ? $args['title'] : 'Contract Fixture Page',
				'post_name'    => isset( $args['post_name'] ) ? $args['post_name'] : 'contract-fixture-page',
				'post_content' => isset( $args['content'] ) ? $args['content'] : '<p>Bounded public body copy.</p>',
				'post_status'  => $status,
				'post_author'  => $this->ensure_sentinel_author(),
			)
		);
		$this->assertIsArray( $created, 'fixture creation must succeed through the accepted boundary' );
		$this->songhealth_track_record( (int) $created['post_id'] );

		update_post_meta( (int) $created['post_id'], self::SENTINEL_META_KEY, self::SENTINEL_META_VALUE );
		if ( isset( $args['summary'] ) ) {
			update_post_meta( (int) $created['post_id'], FoundationTypes::META_SUMMARY, $args['summary'] );
		}
		return $created;
	}

	/**
	 * Create (once) the sentinel CMS user whose identity must never project.
	 *
	 * @return int
	 */
	private function ensure_sentinel_author() {
		static $author_id = 0;
		if ( $author_id > 0 ) {
			return $author_id;
		}
		$existing = get_user_by( 'slug', self::SENTINEL_AUTHOR );
		if ( $existing ) {
			$author_id = (int) $existing->ID;
			return $author_id;
		}
		$author_id = (int) self::factory()->user->create(
			array(
				'user_login'   => self::SENTINEL_AUTHOR,
				'display_name' => 'Sentinel Contract Author',
				'role'         => 'editor',
			)
		);
		return $author_id;
	}

	/**
	 * Create an accepted Document Resource fixture, optionally validly attached.
	 *
	 * @param bool $attach Whether to attach a real, resolvable attachment.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document( $attach = true ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Contract Fixture Document',
				'post_name'   => 'contract-fixture-document',
				'post_status' => 'publish',
				'post_author' => $this->ensure_sentinel_author(),
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		update_post_meta( (int) $created['post_id'], self::SENTINEL_META_KEY, self::SENTINEL_META_VALUE );

		if ( $attach ) {
			/*
			 * The attachment is established through the accepted T042
			 * protected relationship: eligibility's document-specific rule is
			 * the valid one-to-one protected attachment, so a raw Media
			 * Library row alone no longer makes the fixture publishable.
			 */
			$tmp = tempnam( sys_get_temp_dir(), 'shc' );
			file_put_contents( $tmp, "%PDF-1.4\n%contract-fixture-document\n%%EOF\n" );
			$attached = \SonghealthCore\Binary\ProtectedAttachment::attach(
				(int) $created['post_id'],
				array(
					'tmp_name' => $tmp,
					'name'     => 'contract-fixture-document.pdf',
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
	 * Insert phantom live registry rows (mappings without posts) to exceed the
	 * hard candidate budget cheaply; removed in tear_down.
	 *
	 * @param int $count How many phantom rows to insert.
	 * @return void
	 */
	private function create_phantom_rows( $count ) {
		for ( $i = 0; $i < $count; $i++ ) {
			$post_id = 91000000 + count( $this->phantom_post_ids );
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
	 * Issue one listing request through the live REST surface.
	 *
	 * @param array $params Query parameters (type, perPage, order, cursor).
	 * @return WP_REST_Response
	 */
	private function list_resources( array $params ) {
		$request = new WP_REST_Request( 'GET', '/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_LISTING );
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
		return rest_do_request( $request );
	}

	/**
	 * Issue one detail request through the live REST surface.
	 *
	 * @param string $type      Public resource type.
	 * @param string $public_id Requested identifier.
	 * @return WP_REST_Response
	 */
	private function get_detail( $type, $public_id ) {
		return rest_do_request(
			new WP_REST_Request( 'GET', '/' . Routes::ROUTE_NAMESPACE . '/resources/' . $type . '/' . rawurlencode( $public_id ) )
		);
	}

	/**
	 * Assert no value anywhere in a public payload equals an internal
	 * identifier. A substring match on the encoded JSON would be satisfied
	 * coincidentally by identifier characters inside Public IDs, so every
	 * value is compared as a whole value instead.
	 *
	 * @param mixed $payload Public payload to walk.
	 * @param int   $post_id Internal post ID that must never appear.
	 * @return void
	 */
	private function assert_no_internal_id_values( $payload, $post_id ) {
		if ( is_array( $payload ) ) {
			foreach ( $payload as $value ) {
				$this->assert_no_internal_id_values( $value, $post_id );
			}
			return;
		}
		if ( is_object( $payload ) ) {
			foreach ( get_object_vars( $payload ) as $value ) {
				$this->assert_no_internal_id_values( $value, $post_id );
			}
			return;
		}
		$this->assertNotSame( (string) $post_id, is_scalar( $payload ) ? (string) $payload : '', 'the internal post ID never appears as a public value' );
	}

	/**
	 * The full externally observable contract of one response: status, decoded
	 * body, and the transport headers — the basis of every neutrality proof.
	 *
	 * @param WP_REST_Response $response Response to describe.
	 * @return array
	 */
	private function observable_contract( $response ) {
		return array(
			'status'  => $response->get_status(),
			'body'    => $response->get_data(),
			'cache'   => $response->get_headers()['Cache-Control'] ?? null,
			'nosniff' => $response->get_headers()['X-Content-Type-Options'] ?? null,
		);
	}

	/** @test */
	public function test_basic_page_detail_returns_exactly_the_allowlisted_dto() {
		$eligible_reference = $this->create_document( true );
		$ineligible_reference = $this->create_document( false ); /* No attachment: never eligible. */

		$page = $this->create_page(
			'publish',
			array(
				'title'   => 'Contract Fixture Page',
				'summary' => 'A bounded public summary.',
				'content' => '<p>Bounded public body copy.</p>',
			)
		);
		update_post_meta(
			(int) $page['post_id'],
			FoundationTypes::META_DOCUMENT_REFERENCES,
			array( (string) $eligible_reference['public_id'], (string) $ineligible_reference['public_id'] )
		);

		$response = $this->get_detail( 'basic-page', (string) $page['public_id'] );
		$this->assertSame( 200, $response->get_status(), 'an eligible record is disclosed through its allowlisted projection' );

		$dto = $response->get_data();
		$this->assertIsArray( $dto );
		$this->assertSame(
			array( 'type', 'publicId', 'title', 'canonicalPath', 'summary', 'body', 'documentReferences' ),
			array_keys( $dto ),
			'the detail DTO carries exactly the allowlisted fields'
		);
		$this->assertSame( 'basic-page', $dto['type'] );
		$this->assertSame( (string) $page['public_id'], $dto['publicId'] );
		$this->assertSame( 'Contract Fixture Page', $dto['title'] );
		$this->assertSame( '/pages/' . (string) $page['public_id'] . '/contract-fixture-page', $dto['canonicalPath'] );
		$this->assertSame( 'A bounded public summary.', $dto['summary'] );
		$this->assertSame( '<p>Bounded public body copy.</p>', $dto['body'] );

		/* References are retained only through their own current eligibility. */
		$this->assertSame( array( (string) $eligible_reference['public_id'] ), $dto['documentReferences'], 'an eligible parent never elevates an ineligible reference' );

		$encoded = (string) wp_json_encode( $dto );
		$this->assertStringNotContainsString( self::SENTINEL_META_VALUE, $encoded, 'internal meta values never project' );
		$this->assertStringNotContainsString( self::SENTINEL_AUTHOR, $encoded, 'CMS user identity never projects' );
		$this->assertStringNotContainsString( 'Sentinel Contract Author', $encoded );
		$this->assert_no_internal_id_values( $dto, (int) $page['post_id'] );
		$this->assertStringNotContainsString( FoundationTypes::BASIC_PAGE, $encoded, 'the internal post-type name never projects' );
		$this->assertStringNotContainsString( '"publish"', $encoded, 'the internal lifecycle value never projects' );
		$this->assertStringNotContainsString( self::SENTINEL_META_KEY, $encoded );
		$this->assertStringNotContainsString( '_links', $encoded );
		$this->assertStringNotContainsString( (string) $ineligible_reference['public_id'], $encoded, 'an ineligible reference is not even disclosed to exist' );
	}

	/** @test */
	public function test_document_resource_detail_returns_exactly_the_allowlisted_dto() {
		$document = $this->create_document( true );
		update_post_meta( (int) $document['post_id'], FoundationTypes::META_DOCUMENT_DATE, '2026-02-14' );

		$response = $this->get_detail( 'document-resource', (string) $document['public_id'] );
		$this->assertSame( 200, $response->get_status() );

		$dto = $response->get_data();
		$this->assertSame(
			array( 'type', 'publicId', 'title', 'canonicalPath', 'documentDate', 'downloadPath' ),
			array_keys( $dto ),
			'the Document Resource DTO carries exactly its allowlisted fields'
		);
		$this->assertSame( 'document-resource', $dto['type'] );
		$this->assertSame( '/documents/' . (string) $document['public_id'] . '/contract-fixture-document', $dto['canonicalPath'] );
		$this->assertSame( '/wp-json/songhealth/v1/documents/' . (string) $document['public_id'] . '/binary', $dto['downloadPath'] );

		$encoded = (string) wp_json_encode( $dto );
		$this->assertStringNotContainsString( 'contract-fixture-document.pdf', $encoded, 'no storage filename identity projects' );
		$this->assertStringNotContainsString( self::SENTINEL_META_VALUE, $encoded );
		$this->assert_no_internal_id_values( $dto, (int) $document['post_id'] );
	}

	/** @test */
	public function test_every_unknown_and_ineligible_detail_condition_is_one_neutral_class() {
		$draft     = $this->create_page( 'draft', array( 'title' => 'Neutral Draft Fixture' ) );
		$private   = $this->create_page( 'private', array( 'title' => 'Neutral Private Fixture' ) );
		$hidden    = $this->create_page( 'publish', array( 'title' => 'Neutral Hidden Fixture' ) );
		update_post_meta( (int) $hidden['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_HIDDEN );
		$internal  = $this->create_page( 'publish', array( 'title' => 'Neutral Internal Fixture' ) );
		update_post_meta( (int) $internal['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_INTERNAL );
		$withdrawn = $this->create_page( 'publish', array( 'title' => 'Neutral Withdrawn Fixture' ) );
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$untitled  = $this->create_page( 'publish', array( 'title' => 'Neutral Untitled Fixture' ) );
		wp_update_post( array( 'ID' => (int) $untitled['post_id'], 'post_title' => '' ) );

		$future_date = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );
		$scheduled   = CreateTimePublicId::create(
			array(
				'post_type'     => FoundationTypes::BASIC_PAGE,
				'post_title'    => 'Neutral Scheduled Fixture',
				'post_status'   => 'future',
				'post_date'     => $future_date,
				'post_date_gmt' => $future_date,
			)
		);
		$this->assertIsArray( $scheduled );
		$this->songhealth_track_record( (int) $scheduled['post_id'] );

		$tombstoned = $this->create_page( 'publish', array( 'title' => 'Neutral Tombstone Fixture' ) );
		wp_delete_post( (int) $tombstoned['post_id'], true );

		remove_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ) );
		$identityless = wp_insert_post(
			array( 'post_type' => FoundationTypes::BASIC_PAGE, 'post_title' => 'Neutral Identityless Fixture', 'post_status' => 'publish' ),
			true
		);
		add_filter( 'wp_insert_post_empty_content', array( CreateTimePublicId::class, 'contain_direct_creation' ), 10, 2 );
		$this->assertNotWPError( $identityless );
		wp_delete_post( (int) $identityless, true );

		$eligible_page = $this->create_page( 'publish', array( 'title' => 'Type Mismatch Fixture' ) );

		$conditions = array(
			'malformed'       => 'not-a-uuid',
			'uppercase'       => strtoupper( (string) $draft['public_id'] ),
			'non-v7'          => '00000000-0000-4000-8000-000000000000',
			'unknown'         => '00000000-0000-7000-8000-000000000000',
			'draft'           => (string) $draft['public_id'],
			'private'         => (string) $private['public_id'],
			'scheduled'       => (string) $scheduled['public_id'],
			'hidden'          => (string) $hidden['public_id'],
			'internal'        => (string) $internal['public_id'],
			'withdrawn'       => (string) $withdrawn['public_id'],
			'untitled'        => (string) $untitled['public_id'],
			'tombstoned'      => (string) $tombstoned['public_id'],
			'wrong-type'      => null, /* An eligible Basic Page asked of the document-resource surface. */
		);

		$reference = null;
		foreach ( $conditions as $condition => $identifier ) {
			if ( 'wrong-type' === $condition ) {
				$response = $this->get_detail( 'document-resource', (string) $eligible_page['public_id'] );
			} else {
				$response = $this->get_detail( 'basic-page', (string) $identifier );
			}
			$contract = $this->observable_contract( $response );

			if ( null === $reference ) {
				$reference = $contract;
				$this->assertSame( 404, $contract['status'], "{$condition} must be the bounded 404 class" );
				$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $contract['body']['code'] );
				$this->assertSame( 'no-store', $contract['cache'] );
				$this->assertSame( 'nosniff', $contract['nosniff'] );
				continue;
			}
			$this->assertSame( $reference, $contract, "'{$condition}' must be externally identical to every other condition" );

			/* Neutral denial is never a redirect and never discloses existence. */
			$this->assertArrayNotHasKey( 'Location', $response->get_headers() );
			$encoded = (string) wp_json_encode( $contract['body'] );
			$this->assertStringNotContainsString( 'Neutral', $encoded, 'no fixture title may leak through a denial' );
			$this->assertDoesNotMatchRegularExpression( '/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/', $encoded, 'no Public ID may leak through a denial' );
		}
	}

	/** @test */
	public function test_listing_returns_the_bounded_envelope_and_walks_every_eligible_record_once() {
		$eligible = array();
		for ( $i = 0; $i < 7; $i++ ) {
			$eligible[] = (string) $this->create_page( 'publish', array( 'title' => "Walk Fixture {$i}", 'post_name' => "walk-fixture-{$i}" ) )['public_id'];
		}
		$withdrawn = $this->create_page( 'publish', array( 'title' => 'Walk Withdrawn Fixture' ) );
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$ineligible = array(
			(string) $this->create_page( 'draft', array( 'title' => 'Walk Draft Fixture' ) )['public_id'],
			(string) $withdrawn['public_id'],
		);

		/* newest (default order): deterministic descending Public-ID order. */
		$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 3 ) );
		$this->assertSame( 200, $response->get_status() );
		$envelope = $response->get_data();
		$this->assertSame( array( 'data', 'hasMore', 'nextCursor' ), array_keys( $envelope ), 'a continuing envelope carries exactly data, hasMore, nextCursor' );
		$this->assertCount( 3, $envelope['data'], 'at most perPage items are returned' );
		$this->assertTrue( $envelope['hasMore'] );
		$this->assertIsString( $envelope['nextCursor'] );

		$expected_newest = $eligible;
		rsort( $expected_newest );
		$this->assertSame( array_slice( $expected_newest, 0, 3 ), wp_list_pluck( $envelope['data'], 'publicId' ) );

		/* Walk to the end: each eligible record exactly once, no ineligible record ever. */
		$seen     = wp_list_pluck( $envelope['data'], 'publicId' );
		$cursor   = $envelope['nextCursor'];
		$terminal = null;
		for ( $request = 0; $request < 20; $request++ ) {
			$next = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 3, 'cursor' => $cursor ) );
			$this->assertSame( 200, $next->get_status() );
			$body = $next->get_data();

			foreach ( $body['data'] as $dto ) {
				$this->assertSame( array_keys( PublicProjector::project( get_post( (int) PublicIdRegistry::mapping_for( $dto['publicId'] )->{RegistrySchema::COLUMN_INTERNAL_POST_ID} ) ) ), array_keys( $dto ), 'every listed item is the explicit allowlisted projection' );
			}
			$seen = array_merge( $seen, wp_list_pluck( $body['data'], 'publicId' ) );

			if ( ! $body['hasMore'] ) {
				$terminal = $body;
				break;
			}
			$this->assertArrayHasKey( 'nextCursor', $body );
			$cursor = (string) $body['nextCursor'];
		}
		$this->assertNotNull( $terminal, 'the walk must terminate' );
		$this->assertSame( array( 'data', 'hasMore' ), array_keys( $terminal ), 'a terminal envelope carries exactly data and hasMore' );
		$this->assertArrayNotHasKey( 'nextCursor', $terminal );
		$this->assertSame( $expected_newest, $seen, 'the walk covers every eligible record exactly once in deterministic order' );

		foreach ( $ineligible as $public_id ) {
			$this->assertNotContains( $public_id, $seen, 'an ineligible record is never listed' );
		}

		/* oldest order walks the same total order backwards from the start. */
		$oldest = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 2, 'order' => 'oldest' ) );
		$sorted = $eligible;
		sort( $sorted );
		$this->assertSame( array_slice( $sorted, 0, 2 ), wp_list_pluck( $oldest->get_data()['data'], 'publicId' ) );
	}

	/** @test */
	public function test_every_listed_item_passes_the_live_authoritative_decision_and_stays_type_scoped() {
		$page     = $this->create_page( 'publish', array( 'title' => 'Scoped Page Fixture' ) );
		$document = $this->create_document( true );

		$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 100 ) );
		$this->assertSame( 200, $response->get_status() );
		$envelope = $response->get_data();
		$this->assertFalse( $envelope['hasMore'] );

		$listed = wp_list_pluck( $envelope['data'], 'publicId' );
		$this->assertContains( (string) $page['public_id'], $listed );
		$this->assertNotContains( (string) $document['public_id'], $listed, 'the listing is scoped to the requested type' );

		foreach ( $envelope['data'] as $dto ) {
			$this->assertSame( 'basic-page', $dto['type'] );
			/* The live decision accepts every returned item, verified through the shared resolution path. */
			$resolved = EligibleResourceQuery::eligible_detail( 'basic-page', (string) $dto['publicId'] );
			$this->assertNotNull( $resolved, 'every returned item passes the live shared decision' );
			$this->assertSame( (string) $dto['publicId'], (string) PublicIdRegistry::public_id_for( 'basic-page', (int) $resolved->ID ) );
		}

		$documents = $this->list_resources( array( 'type' => 'document-resource', 'perPage' => 100 ) );
		$this->assertSame( 200, $documents->get_status() );
		$this->assertContains( (string) $document['public_id'], wp_list_pluck( $documents->get_data()['data'], 'publicId' ) );
	}

	/** @test */
	public function test_budget_exhaustion_with_candidates_remaining_returns_an_empty_continuation_page() {
		/*
		 * More live registry candidates than the hard server budget, all
		 * ineligible (no posts): the first request must stop at the budget,
		 * return an EMPTY data page — with the key present — hasMore=true, and
		 * an opaque cursor, never a false exhaustion (G02C-B02).
		 */
		$this->create_phantom_rows( EligibleResourceQuery::MAX_CANDIDATES_PER_REQUEST + 5 );
		usleep( 3000 ); /* The eligible fixtures must sort strictly after the phantoms. */
		$eligible = array();
		for ( $i = 0; $i < 3; $i++ ) {
			$eligible[] = (string) $this->create_page( 'publish', array( 'title' => "Budget Fixture {$i}" ) )['public_id'];
		}

		$first = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 3, 'order' => 'oldest' ) );
		$this->assertSame( 200, $first->get_status() );
		$envelope = $first->get_data();

		$this->assertIsArray( $envelope['data'] );
		$this->assertSame( array(), $envelope['data'], 'an exhausted budget with no eligible find returns an empty data page' );
		$this->assertTrue( $envelope['hasMore'], 'candidates remain: progress is preserved, never falsely reported as exhausted' );
		$this->assertIsString( $envelope['nextCursor'] );

		$second = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 3, 'order' => 'oldest', 'cursor' => (string) $envelope['nextCursor'] ) );
		$this->assertSame( 200, $second->get_status() );
		$continued = $second->get_data();
		sort( $eligible );
		$this->assertSame( $eligible, wp_list_pluck( $continued['data'], 'publicId' ), 'the continuation page returns the remaining eligible records' );
		$this->assertFalse( $continued['hasMore'] );
		$this->assertArrayNotHasKey( 'nextCursor', $continued );
	}

	/** @test */
	public function test_revocation_between_continuation_pages_suppresses_the_record_immediately() {
		$pages = array();
		for ( $i = 0; $i < 5; $i++ ) {
			$pages[] = $this->create_page( 'publish', array( 'title' => "Revocation Fixture {$i}" ) );
		}

		$first = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 2, 'order' => 'oldest' ) );
		$this->assertTrue( $first->get_data()['hasMore'] );

		$returned = wp_list_pluck( $first->get_data()['data'], 'publicId' );
		$pending  = null;
		foreach ( $pages as $page ) {
			if ( ! in_array( (string) $page['public_id'], $returned, true ) ) {
				$pending = $page;
				break;
			}
		}
		$this->assertNotNull( $pending );
		update_post_meta( (int) $pending['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$second = $this->list_resources(
			array(
				'type'    => 'basic-page',
				'perPage' => 3,
				'order'   => 'oldest',
				'cursor'  => (string) $first->get_data()['nextCursor'],
			)
		);
		$this->assertSame( 200, $second->get_status() );
		$this->assertNotContains( (string) $pending['public_id'], wp_list_pluck( $second->get_data()['data'], 'publicId' ), 'a record revoked between pages must not be disclosed' );
		$this->assertCount( 2, $second->get_data()['data'] );
		$this->assertFalse( $second->get_data()['hasMore'] );
	}

	/** @test */
	public function test_listing_input_and_cursor_failures_share_one_bounded_invalid_request_class() {
		/* Input bounds: bounded 400s at the route/argument boundary. */
		$missing_type = rest_do_request( new WP_REST_Request( 'GET', '/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_LISTING ) );
		$this->assertSame( 400, $missing_type->get_status(), 'type is required' );

		$bad_type = $this->list_resources( array( 'type' => 'post' ) );
		$this->assertSame( 400, $bad_type->get_status(), 'type is allowlisted' );

		foreach ( array( 0, -1, 101, 'many' ) as $per_page ) {
			$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => $per_page ) );
			$this->assertSame( 400, $response->get_status(), 'perPage ' . var_export( $per_page, true ) . ' is outside its bounds' );
		}
		$this->assertSame( 200, $this->list_resources( array( 'type' => 'basic-page', 'perPage' => EligibleResourceQuery::MAX_PER_PAGE ) )->get_status(), 'the hard maximum itself is accepted' );
		$this->assertSame( 400, $this->list_resources( array( 'type' => 'basic-page', 'order' => 'relevance' ) )->get_status(), 'order is allowlisted' );

		/* Cursor content failures: the one bounded invalid-request body. */
		for ( $i = 0; $i < 2; $i++ ) {
			$this->create_page( 'publish', array( 'title' => 'Cursor Contract Fixture' ) );
		}
		$genuine = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertTrue( $genuine->get_data()['hasMore'] );
		$cursor = (string) $genuine->get_data()['nextCursor'];

		$invalid = array(
			'empty'            => '', /* G03-B01: rejected inside the Songhealth path, not by the route boundary. */
			'overlength'       => str_repeat( 'x', 513 ),
			'garbage'          => 'not-base64!!',
			'truncated'        => substr( $cursor, 0, strlen( $cursor ) - 4 ),
			'flipped-byte'     => substr( $cursor, 0, 10 ) . ( 'A' === $cursor[10] ? 'B' : 'A' ) . substr( $cursor, 11 ),
			'appended-garbage' => $cursor . 'AAAA',
			'added-padding'    => $cursor . '==',
			'type-mismatch'    => null,
			'order-mismatch'   => null,
			'expired'          => null,
			'wrong-version'    => null,
		);

		/* Genuine continuation state re-sealed under the same purpose-derived key. */
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
		$invalid['expired']       = $seal( $expired );
		$invalid['wrong-version'] = $seal( $wrong_version );

		$reference = null;
		foreach ( $invalid as $condition => $value ) {
			$params = array( 'type' => 'basic-page', 'order' => 'oldest', 'perPage' => 2, 'cursor' => $value );
			if ( 'type-mismatch' === $condition ) {
				$params['type']   = 'document-resource';
				$params['cursor'] = $cursor;
			}
			if ( 'order-mismatch' === $condition ) {
				$params['order']  = 'newest';
				$params['cursor'] = $cursor;
			}
			$response = $this->list_resources( $params );
			$contract = $this->observable_contract( $response );

			if ( null === $reference ) {
				$reference = $contract;
				$this->assertSame( 400, $contract['status'], "{$condition} cursor must fail closed" );
				$this->assertSame(
					array( 'code' => NeutralResponse::CODE_INVALID_REQUEST, 'message' => 'Invalid request.', 'data' => array( 'status' => 400 ) ),
					$contract['body'],
					'the bounded invalid-request body is fixed'
				);
				continue;
			}
			$this->assertSame( $reference, $contract, "'{$condition}' must share the one bounded invalid-request class" );
		}
	}

	/** @test */
	public function test_continuation_cursors_are_confidential_and_carry_no_state() {
		for ( $i = 0; $i < 3; $i++ ) {
			$this->create_page( 'publish', array( 'title' => "Confidential Cursor Fixture {$i}" ) );
		}

		$first = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$cursor = (string) $first->get_data()['nextCursor'];
		$this->assertIsString( $cursor );

		$this->assertStringNotContainsString( 'basic-page', $cursor );
		$this->assertStringNotContainsString( 'oldest', $cursor );
		$this->assertDoesNotMatchRegularExpression( '/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/', $cursor, 'no scanned Public ID may appear in the cursor' );
		foreach ( array( 'internal_post_id', 'post_id', 'resource_type', 'public_id' ) as $word ) {
			$this->assertStringNotContainsString( $word, $cursor );
		}

		/* The full response text stays free of scanned ineligible identifiers and positions. */
		$encoded = (string) wp_json_encode( $first->get_data() );
		$this->assertStringNotContainsString( self::SENTINEL_META_VALUE, $encoded );
		$this->assertStringNotContainsString( 'OFFSET', $encoded );
	}

	/** @test */
	public function test_no_exact_totals_page_counts_or_native_collection_headers_exist() {
		for ( $i = 0; $i < 4; $i++ ) {
			$this->create_page( 'publish', array( 'title' => "Totals Fixture {$i}" ) );
		}

		$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 2 ) );
		$this->assertSame( 200, $response->get_status() );
		$encoded = (string) wp_json_encode( $response->get_data() );

		foreach ( array( 'total', 'totalPages', '"page"', '"perPage"', 'count' ) as $forbidden ) {
			$this->assertStringNotContainsString( $forbidden, $encoded, "the public contract never carries {$forbidden}" );
		}
		foreach ( array( 'X-WP-Total', 'X-WP-TotalPages' ) as $header ) {
			$this->assertArrayNotHasKey( $header, $response->get_headers(), "no native collection header may appear" );
		}

		/* Eligible responses share the safe transport posture. */
		$this->assertSame( 'no-store', $response->get_headers()['Cache-Control'] ?? null );
		$this->assertSame( 'nosniff', $response->get_headers()['X-Content-Type-Options'] ?? null );
	}

	/** @test */
	public function test_no_songhealth_search_route_parameter_or_native_search_surface_exists() {
		$routes = rest_get_server()->get_routes();
		foreach ( array_keys( $routes ) as $route ) {
			if ( 0 === strpos( $route, '/' . Routes::ROUTE_NAMESPACE ) ) {
				$this->assertStringNotContainsString( 'search', $route, 'no Songhealth search route exists' );
			}
		}

		$this->create_page( 'publish', array( 'title' => 'Search Absence Fixture' ) );

		$clean    = $this->list_resources( array( 'type' => 'basic-page' ) );
		$polluted = $this->list_resources(
			array(
				'type'    => 'basic-page',
				'search'  => 'Search Absence',
				's'       => 'Search Absence',
				'include' => '1,2,3',
				'orderby' => 'title',
				'page'    => 3,
			)
		);
		$this->assertSame( 200, $clean->get_status() );
		$this->assertSame( 200, $polluted->get_status() );
		$this->assertSame( $clean->get_data(), $polluted->get_data(), 'search-like parameters are not interpreted' );

		/* The native search surface stays contained for anonymous requests. */
		wp_set_current_user( 0 );
		$native = new WP_REST_Request( 'GET', '/wp/v2/search' );
		$native->set_param( 'search', 'Search Absence' );
		$contained = rest_do_request( $native );
		$this->assertSame( 404, $contained->get_status(), 'the native search surface never competes with the Songhealth contract' );
	}

	/**
	 * Many eligible Document Resource references for the FR-031 budget tests.
	 *
	 * @param int $count How many eligible documents to create.
	 * @return string[] Their Public IDs.
	 */
	private function create_reference_documents( $count ) {
		$ids = array();
		for ( $i = 0; $i < $count; $i++ ) {
			$document = $this->create_document( true );
			$ids[]    = (string) $document['public_id'];
		}
		return $ids;
	}

	/** @test */
	public function test_fr031_detail_with_over_bound_legacy_references_fails_whole_through_the_bounded_safe_class() {
		$page     = $this->create_page();
		$eligible = $this->create_reference_documents( 3 );

		/*
		 * Legacy/bypassed over-bound stored state (direct meta write, never
		 * an authorized write). The registered meta schema normalizes on
		 * write, so a persisted over-bound set requires DISTINCT entries:
		 * 3 real references plus 98 distinct unknown identifiers.
		 */
		$unknown = array();
		for ( $i = 0; $i < 101 - 3; $i++ ) {
			$unknown[] = '00000000-0000-7000-8000-' . str_pad( dechex( $i ), 12, '0', STR_PAD_LEFT );
		}
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, array_merge( $eligible, $unknown ) );

		$response = $this->get_detail( 'basic-page', (string) $page['public_id'] );

		$this->assertSame( 500, $response->get_status(), 'an over-bound reference set fails the whole detail response' );
		$data = $response->get_data();
		$this->assertSame( 'songhealth_unavailable', $data['code'], 'the failure is the generic bounded safe class' );
		$encoded = wp_json_encode( $data );
		$this->assertStringNotContainsString( 'documentReferences', (string) $encoded, 'no partial DTO body is emitted' );
		$this->assertStringNotContainsString( 'Contract Fixture Page', (string) $encoded, 'no record field is disclosed' );
		$this->assertStringNotContainsString( (string) $eligible[0], (string) $encoded, 'no reference is disclosed' );
		$this->assertStringNotContainsString( '101', (string) $encoded, 'the offending count is never exposed' );
		$this->assertStringNotContainsString( '100', (string) $encoded, 'the budget value is never exposed' );

		/* Stored state was not silently repaired or truncated. */
		$this->assertCount( 101, (array) get_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, true ) );
	}

	/** @test */
	public function test_fr031_listing_combined_reference_budget_fails_whole_without_partial_items() {
		$eligible = $this->create_reference_documents( 3 );
		$pages    = array();
		foreach ( array( 34, 33, 33 ) as $index => $raw_count ) {
			$page = $this->create_page( 'publish', array( 'title' => "Combined Budget Page {$index}", 'post_name' => "combined-budget-page-{$index}" ) );
			/* Distinct entries per page: the registered meta schema normalizes on write. */
			$raw = array_slice( $eligible, 0, 2 );
			for ( $i = 0; $i < $raw_count - 2; $i++ ) {
				$raw[] = sprintf( '00000000-0000-7000-8000-%01d%011d', $index, $i );
			}
			update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $raw );
			$pages[] = $page;
		}

		/* Combined raw count is exactly 100: the listing succeeds as a whole. */
		$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 20, 'order' => 'newest' ) );
		$this->assertSame( 200, $response->get_status(), 'a combined raw count at exactly the budget still serves the listing' );
		$envelope = $response->get_data();
		$this->assertCount( 3, $envelope['data'], 'every participating page projects' );
		$expected_references = array_slice( $eligible, 0, 2 );
		foreach ( $envelope['data'] as $dto ) {
			$this->assertSame( $expected_references, $dto['documentReferences'], 'each page carries its eligible references in stored order' );
		}

		/* One more raw entry on one page pushes the combined count past the budget: the WHOLE listing fails. */
		$stored   = (array) get_post_meta( (int) $pages[0]['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, true );
		$stored[] = '00000000-0000-7000-8000-000000000099';
		update_post_meta( (int) $pages[0]['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $stored );

		$response = $this->list_resources( array( 'type' => 'basic-page', 'perPage' => 20, 'order' => 'newest' ) );
		$this->assertSame( 500, $response->get_status(), 'a combined count above the budget fails the whole listing response' );
		$data = $response->get_data();
		$this->assertSame( 'songhealth_unavailable', $data['code'] );
		/* The failure body is EXACTLY the bounded error envelope — no list payload, no envelope keys of a partial page. */
		$this->assertSame( array( 'code', 'message', 'data' ), array_keys( (array) $data ), 'the failure body is the bounded error envelope only' );
		$this->assertSame( array( 'status' => 500 ), (array) $data['data'], 'the error data carries only the bounded status' );
		$encoded = wp_json_encode( $data );
		$this->assertStringNotContainsString( 'hasMore', (string) $encoded, 'no partial envelope shape is emitted' );
		$this->assertStringNotContainsString( 'nextCursor', (string) $encoded, 'no partial envelope shape is emitted' );
		$this->assertStringNotContainsString( 'Combined Budget Page', (string) $encoded, 'no earlier item is emitted as partial success' );
		$this->assertStringNotContainsString( (string) $eligible[0], (string) $encoded, 'no reference is disclosed by the failure' );
		$this->assertStringNotContainsString( '101', (string) $encoded, 'the offending combined count is never exposed' );
	}

	/** @test */
	public function test_fr031_reference_order_and_deduplication_survive_projection_at_the_bound() {
		$page     = $this->create_page();
		$eligible = $this->create_reference_documents( 2 );
		$ineligible = $this->create_document( false );
		wp_update_post( array( 'ID' => (int) $ineligible['post_id'], 'post_status' => 'draft' ) );

		/*
		 * 100 raw stored entries carrying DUPLICATES, an ineligible
		 * reference, and an unknown shape, in stored order. The registered
		 * meta schema deduplicates on every schema-mediated write, so this
		 * legacy/bypassed state is established by a direct postmeta row write
		 * that bypasses the schema sanitizer — exactly the persisted shape
		 * the projection-side deduplication must handle on its own.
		 */
		$raw = array();
		for ( $i = 0; $i < 49; $i++ ) {
			$raw[] = $eligible[0];
			$raw[] = $eligible[1];
		}
		$raw[] = (string) $ineligible['public_id'];
		$raw[] = '00000000-0000-7000-8000-0000000000ff';
		$this->assertCount( 100, $raw );

		global $wpdb;
		delete_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES );
		$wpdb->insert(
			$wpdb->postmeta,
			array(
				'post_id'    => (int) $page['post_id'],
				'meta_key'   => FoundationTypes::META_DOCUMENT_REFERENCES,
				'meta_value' => maybe_serialize( $raw ),
			)
		);
		wp_cache_delete( (int) $page['post_id'], 'post_meta' );

		$response = $this->get_detail( 'basic-page', (string) $page['public_id'] );
		$this->assertSame( 200, $response->get_status(), 'the at-bound projection serves detail as a whole' );
		$dto = $response->get_data();
		$this->assertSame(
			array( $eligible[0], $eligible[1] ),
			$dto['documentReferences'],
			'references are deduplicated in stored order; ineligible and unknown entries are omitted entirely'
		);
	}
}
