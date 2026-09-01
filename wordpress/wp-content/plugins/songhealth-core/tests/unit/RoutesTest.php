<?php
/**
 * Approved route shapes tests (Delivery 002, T016).
 *
 * Proves the registered surface is exactly the approved `songhealth/v1`
 * shapes (no Songhealth search route), that route patterns enforce the
 * public vocabulary, that listing input validation is bounded, and that
 * every handler fails closed with the same neutral class until the
 * authorized user-story controllers exist.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-006,
 * FR-007, FR-012, FR-016, FR-030; contracts/public-rest.md.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Rest\EligibleResourceQuery;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\Routes;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group rest
 */
class RoutesTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	public function set_up() {
		parent::set_up();
		wp_set_current_user( 0 );
	}

	public function tear_down() {
		parent::tear_down();
		$this->songhealth_delete_tracked_records();
	}

	/**
	 * The Songhealth route paths registered on the live REST server.
	 *
	 * @return string[]
	 */
	private function songhealth_routes() {
		$routes = rest_get_server()->get_routes();
		$ours   = array();
		foreach ( $routes as $route => $handlers ) {
			if ( 0 === strpos( $route, '/' . Routes::ROUTE_NAMESPACE ) ) {
				$ours[] = $route;
			}
		}
		sort( $ours );
		return $ours;
	}

	/** @test */
	public function test_exactly_the_approved_route_shapes_are_registered() {
		/*
		 * WordPress itself registers one extra entry per namespace: the
		 * namespace index route at '/songhealth/v1'. Every other entry must
		 * be one of the seven approved shapes: the five data-bearing shapes
		 * (detail, listing, Preview, Preview-binary, binary) plus the two
		 * operator channels (minimal public liveness, protected
		 * diagnostics; T052).
		 */
		$expected = array(
			'/' . Routes::ROUTE_NAMESPACE,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_BINARY,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_DETAIL,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_DIAGNOSTICS,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_HEALTH,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_LISTING,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_PREVIEW,
			'/' . Routes::ROUTE_NAMESPACE . Routes::ROUTE_PREVIEW_BINARY,
		);
		sort( $expected );

		$this->assertSame( $expected, $this->songhealth_routes(), 'only the approved detail, listing, Preview, Preview-binary, binary, liveness, and diagnostics shapes may exist' );
	}

	/** @test */
	public function test_no_songhealth_search_route_or_parameter_exists() {
		foreach ( $this->songhealth_routes() as $route ) {
			$this->assertStringNotContainsString( 'search', $route, 'no Songhealth search route may exist' );
		}

		$server  = rest_get_server();
		$indexed = wp_json_encode( $server->get_data_for_routes( $server->get_routes(), 'help' ) );
		$this->assertStringNotContainsString( 'songhealth/v1/search', (string) $indexed );

		foreach ( $this->songhealth_routes() as $route ) {
			foreach ( rest_get_server()->get_routes()[ $route ] as $handler ) {
				if ( empty( $handler['args'] ) ) {
					continue;
				}
				$this->assertArrayNotHasKey( 'search', $handler['args'], "route {$route} must not declare a search argument" );
				$this->assertArrayNotHasKey( 's', $handler['args'], "route {$route} must not declare a native search argument" );
			}
		}
	}

	/** @test */
	public function test_route_patterns_enforce_the_public_vocabulary() {
		/* The resource type is public vocabulary: an unknown type is not a route. */
		$unknown_type = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources/post/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $unknown_type->get_status() );

		$search_route = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/search' ) );
		$this->assertSame( 404, $search_route->get_status() );
	}

	/**
	 * The full bounded contract of the neutral not-found class, as one comparable
	 * value: status, code, body, and the nondisclosing headers.
	 *
	 * @param WP_REST_Response $response Response to describe.
	 * @return array
	 */
	private function neutral_contract( $response ) {
		return array(
			'status'  => $response->get_status(),
			'code'    => isset( $response->get_data()['code'] ) ? $response->get_data()['code'] : null,
			'body'    => $response->get_data(),
			'cache'   => $response->get_headers()['Cache-Control'] ?? null,
			'nosniff' => $response->get_headers()['X-Content-Type-Options'] ?? null,
		);
	}

	/** @test */
	public function test_malformed_unknown_and_ineligible_identifiers_are_one_neutral_class() {
		/*
		 * A real ineligible record (a Draft created through the accepted
		 * creation service) gives the identifier conditions a live
		 * ineligible case with a canonical identifier.
		 */
		$draft = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Neutral Equivalence Fixture',
				'post_status' => 'draft',
			)
		);
		$this->assertIsArray( $draft );
		$this->songhealth_track_record( (int) $draft['post_id'] );

		$identifier_conditions = array(
			'not-a-uuid'  => 'not-a-uuid',
			'uppercase'   => strtoupper( $draft['public_id'] ),
			'non-v7'      => '00000000-0000-4000-8000-000000000000',
			'unknown'     => '00000000-0000-7000-8000-000000000000',
			'ineligible'  => (string) $draft['public_id'],
		);

		$surfaces = array(
			'detail'  => '/songhealth/v1/resources/basic-page/%s',
			'preview' => '/songhealth/v1/preview/basic-page/%s',
			'binary'  => '/songhealth/v1/documents/%s/binary',
		);

		foreach ( $surfaces as $surface => $pattern ) {
			wp_set_current_user( 0 );
			$reference = null;
			foreach ( $identifier_conditions as $condition => $identifier ) {
				$response = rest_do_request( new WP_REST_Request( 'GET', sprintf( $pattern, $identifier ) ) );
				$contract = $this->neutral_contract( $response );

				if ( null === $reference ) {
					$reference = $contract;
					$this->assertSame( 404, $contract['status'], "{$surface}/{$condition} must be the bounded 404 class" );
					$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $contract['code'] );
					/*
					 * The Preview surface carries its T035 confidentiality
					 * posture on every answer, denial included (FR-016:
					 * private/no-store); the anonymous public surfaces keep
					 * the accepted plain no-store class.
					 */
					$expected_cache = 'preview' === $surface ? 'private, no-store' : 'no-store';
					$this->assertSame( $expected_cache, $contract['cache'] );
					$this->assertSame( 'nosniff', $contract['nosniff'] );
					continue;
				}
				$this->assertSame( $reference, $contract, "{$surface}: '{$condition}' must be externally identical to every other identifier condition" );
			}

			/* The same equivalence must hold for an authenticated staff session (Preview surface). */
			$administrator_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
			wp_set_current_user( $administrator_id );
			foreach ( $identifier_conditions as $condition => $identifier ) {
				$response = rest_do_request( new WP_REST_Request( 'GET', sprintf( $pattern, $identifier ) ) );
				$this->assertSame( $reference, $this->neutral_contract( $response ), "{$surface}/staff/{$condition} must remain identical to the neutral class" );
			}
			wp_set_current_user( 0 );
		}
	}

	/** @test */
	public function test_every_handler_fails_closed_with_the_neutral_class() {
		wp_set_current_user( 0 );

		$detail = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $detail->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $detail->get_data()['code'] );

		$binary = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/documents/00000000-0000-7000-8000-000000000000/binary' ) );
		$this->assertSame( 404, $binary->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $binary->get_data()['code'] );

		/*
		 * The resource-detail and listing operations are live since T025: an
		 * unknown record still answers the neutral 404 class through the
		 * controller, and an empty-type listing is the terminal bounded
		 * envelope (PublicRestContractTest owns the live-contract matrix).
		 */
		$listing = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$listing->set_param( 'type', 'document-resource' );
		$response = rest_do_request( $listing );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( array( 'data', 'hasMore' ), array_keys( (array) $response->get_data() ) );
		$this->assertSame( array(), $response->get_data()['data'] );
		$this->assertFalse( $response->get_data()['hasMore'] );
	}

	/** @test */
	public function test_every_invalid_cursor_condition_converges_on_the_songhealth_invalid_request_contract() {
		/*
		 * G03-B01: every invalid continuation-cursor condition — including the
		 * empty and overlength values the route boundary no longer rejects
		 * itself — must reach the ONE bounded Songhealth invalid-request
		 * contract, never the platform's invalid-parameter class. The full
		 * observable response (status, code, body, transport headers) is
		 * compared as one value, so any split between the conditions fails.
		 */
		for ( $i = 0; $i < 2; $i++ ) {
			$created = CreateTimePublicId::create(
				array(
					'post_type'   => FoundationTypes::BASIC_PAGE,
					'post_title'  => 'Cursor Convergence Fixture',
					'post_status' => 'publish',
				)
			);
			$this->assertIsArray( $created );
			$this->songhealth_track_record( (int) $created['post_id'] );
		}
		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertTrue( $result['hasMore'] );
		$genuine = (string) $result['nextCursor'];

		$cursor_conditions = array(
			'empty'          => '',
			'overlength'     => str_repeat( 'x', 513 ),
			'max-boundary'   => str_repeat( 'x', 512 ), /* At the bound: still an invalid (undecodable) cursor, never a bypass. */
			'malformed'      => 'not-base64!!',
			'padded'         => $genuine . '==',
			'whitespace'     => ' ' . $genuine,
			'tampered'       => substr( $genuine, 0, 10 ) . ( 'A' === $genuine[10] ? 'B' : 'A' ) . substr( $genuine, 11 ),
			'truncated'      => substr( $genuine, 0, strlen( $genuine ) - 4 ),
			'appended'       => $genuine . 'AAAA',
			'genuine'        => $genuine, /* Control: the exact issued token is NOT an invalid cursor. */
		);

		$reference = null;
		$genuine_contract = null;
		foreach ( $cursor_conditions as $condition => $cursor ) {
			$request = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
			$request->set_param( 'type', 'basic-page' );
			$request->set_param( 'order', 'oldest' );
			$request->set_param( 'cursor', $cursor );
			$response = rest_do_request( $request );
			$contract = $this->neutral_contract( $response );

			if ( 'genuine' === $condition ) {
				$genuine_contract = $contract;
				$this->assertSame( 200, $contract['status'], 'the exact issued token continues through the Songhealth path' );
				continue;
			}

			if ( null === $reference ) {
				$reference = $contract;
				$this->assertSame( 400, $contract['status'], "an {$condition} cursor must fail closed" );
				$this->assertSame( NeutralResponse::CODE_INVALID_REQUEST, $contract['code'], "the {$condition} cursor must use the Songhealth invalid-request class" );
				$this->assertSame(
					array( 'code' => NeutralResponse::CODE_INVALID_REQUEST, 'message' => 'Invalid request.', 'data' => array( 'status' => 400 ) ),
					$contract['body'],
					'the bounded invalid-request body is fixed'
				);
				$this->assertSame( 'no-store', $contract['cache'] );
				$this->assertSame( 'nosniff', $contract['nosniff'] );
				continue;
			}
			$this->assertSame( $reference, $contract, "'{$condition}' must be externally identical to every other invalid cursor condition" );
			$this->assertStringNotContainsString( 'rest_invalid_param', (string) wp_json_encode( $contract['body'] ), 'no platform invalid-parameter class may appear' );
		}
		$this->assertNotNull( $genuine_contract );
		$this->assertNotSame( $reference, $genuine_contract, 'the genuine token is observably distinct from the invalid class' );
	}

	/** @test */
	public function test_invalid_listing_input_is_rejected_bounded_before_any_handler() {
		$missing_type = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources' ) );
		$this->assertSame( 400, $missing_type->get_status(), 'type is required' );

		$bad_type = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$bad_type->set_param( 'type', 'post' );
		$this->assertSame( 400, rest_do_request( $bad_type )->get_status() );

		$bad_per_page = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$bad_per_page->set_param( 'type', 'basic-page' );
		$bad_per_page->set_param( 'perPage', 10000 );
		$this->assertSame( 400, rest_do_request( $bad_per_page )->get_status(), 'perPage is capped by the hard server maximum' );

		$bad_order = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$bad_order->set_param( 'type', 'basic-page' );
		$bad_order->set_param( 'order', 'relevance' );
		$this->assertSame( 400, rest_do_request( $bad_order )->get_status() );

		/*
		 * An invalid cursor shares the one bounded invalid-request class with
		 * every other unsupported input (contracts/public-rest.md), including
		 * non-canonical encodings of a genuine token.
		 */
		$invalid_cursor_values = array( 'tampered-or-malformed-value', 'padded-or-spaced-value==', " leading-space", "trailing-space\t" );
		foreach ( $invalid_cursor_values as $cursor_value ) {
			$bad_cursor = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
			$bad_cursor->set_param( 'type', 'basic-page' );
			$bad_cursor->set_param( 'cursor', $cursor_value );
			$response = rest_do_request( $bad_cursor );
			$this->assertSame( 400, $response->get_status(), var_export( $cursor_value, true ) . ' must be rejected as invalid input' );
			$this->assertSame( NeutralResponse::CODE_INVALID_REQUEST, $response->get_data()['code'] );
			$this->assertSame(
				array( 'code' => NeutralResponse::CODE_INVALID_REQUEST, 'message' => 'Invalid request.', 'data' => array( 'status' => 400 ) ),
				$response->get_data(),
				'every invalid cursor receives the identical bounded body'
			);
		}
	}

	/** @test */
	public function test_supported_listing_parameters_reach_the_live_controller() {
		/*
		 * Since T025 the validated listing input reaches the live controller,
		 * which answers the bounded envelope for every supported combination
		 * (the eligible-content matrix belongs to PublicRestContractTest).
		 */
		foreach ( array( 'basic-page', 'document-resource' ) as $type ) {
			foreach ( array( 'newest', 'oldest' ) as $order ) {
				$request = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
				$request->set_param( 'type', $type );
				$request->set_param( 'perPage', 5 );
				$request->set_param( 'order', $order );
				$response = rest_do_request( $request );
				$this->assertSame( 200, $response->get_status(), "validated input for {$type}/{$order} must reach the live controller" );
				$keys = array_keys( (array) $response->get_data() );
				$this->assertContains( 'data', $keys );
				$this->assertContains( 'hasMore', $keys );
			}
		}
	}

	/** @test */
	public function test_a_genuine_cursor_reaches_the_live_controller_and_a_bound_mismatch_does_not() {
		/* Two records: one page leaves a genuine continuation to be issued. */
		for ( $i = 0; $i < 2; $i++ ) {
			$created = CreateTimePublicId::create(
				array(
					'post_type'   => FoundationTypes::BASIC_PAGE,
					'post_title'  => 'Cursor Route Fixture',
					'post_status' => 'publish',
				)
			);
			$this->assertIsArray( $created );
			$this->songhealth_track_record( (int) $created['post_id'] );
		}

		$result = EligibleResourceQuery::query( array( 'type' => 'basic-page', 'perPage' => 1, 'order' => 'oldest' ) );
		$this->assertTrue( $result['hasMore'] );
		$cursor = $result['nextCursor'];

		$valid = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$valid->set_param( 'type', 'basic-page' );
		$valid->set_param( 'order', 'oldest' );
		$valid->set_param( 'cursor', $cursor );
		$response = rest_do_request( $valid );
		$this->assertSame( 200, $response->get_status(), 'a genuine cursor reaches the live controller' );
		$this->assertCount( 1, $response->get_data()['data'], 'the continuation page carries the remaining record' );
		$this->assertFalse( $response->get_data()['hasMore'] );

		$mismatch = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$mismatch->set_param( 'type', 'basic-page' );
		$mismatch->set_param( 'order', 'newest' );
		$mismatch->set_param( 'cursor', $cursor );
		$response = rest_do_request( $mismatch );
		$this->assertSame( 400, $response->get_status(), 'an order-mismatched cursor fails closed as invalid input' );
		$this->assertSame( NeutralResponse::CODE_INVALID_REQUEST, $response->get_data()['code'] );

		/*
		 * A non-canonical encoding of the genuine token — standard-alphabet
		 * substitution or padding — is rejected at the route boundary with
		 * the same bounded invalid-request class (G02C-B04).
		 */
		$non_canonical = array(
			str_replace( array( '-', '_' ), array( '+', '/' ), $cursor ),
			$cursor . '==',
			' ' . $cursor,
		);
		foreach ( $non_canonical as $variant ) {
			$request = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
			$request->set_param( 'type', 'basic-page' );
			$request->set_param( 'order', 'oldest' );
			$request->set_param( 'cursor', $variant );
			$response = rest_do_request( $request );
			$this->assertSame( 400, $response->get_status(), 'a non-canonical cursor encoding fails closed at the route' );
			$this->assertSame( NeutralResponse::CODE_INVALID_REQUEST, $response->get_data()['code'] );
		}
	}

	/** @test */
	public function test_search_like_parameters_have_no_effect_on_the_listing_shape() {
		$clean = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$clean->set_param( 'type', 'basic-page' );

		$polluted = new WP_REST_Request( 'GET', '/songhealth/v1/resources' );
		$polluted->set_param( 'type', 'basic-page' );
		$polluted->set_param( 'search', 'secret' );
		$polluted->set_param( 's', 'secret' );
		$polluted->set_param( 'include', '1,2,3' );
		$polluted->set_param( 'orderby', 'title' );
		$polluted->set_param( 'page', 3 );

		$this->assertSame(
			rest_do_request( $clean )->get_data(),
			rest_do_request( $polluted )->get_data(),
			'unsupported parameters are not interpreted: the response is identical with or without them'
		);
	}

	/** @test */
	public function test_preview_is_never_publicly_reachable_regardless_of_identity() {
		wp_set_current_user( 0 );
		$anonymous = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/preview/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $anonymous->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $anonymous->get_data()['code'] );

		$subscriber_id = self::factory()->user->create( array( 'role' => 'subscriber' ) );
		wp_set_current_user( $subscriber_id );
		$non_staff = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/preview/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $non_staff->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $non_staff->get_data()['code'] );

		$administrator_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $administrator_id );
		$staff = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/preview/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $staff->get_status() );
		$this->assertSame(
			$anonymous->get_data(),
			$staff->get_data(),
			'an authenticated staff session passes the route boundary and then meets the same neutral fail-closed handler — indistinguishable from outside'
		);
	}
}
