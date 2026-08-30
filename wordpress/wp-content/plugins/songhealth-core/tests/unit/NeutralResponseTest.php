<?php
/**
 * Neutral public response tests (Delivery 002, T014).
 *
 * Proves the bounded neutral classes: fixed allowlisted bodies, no request
 * echo, no existence/lifecycle/user/protected-content disclosure, correct
 * statuses, and non-cacheable transport.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-008,
 * FR-012, FR-020; contracts/public-rest.md §Projection, references, errors,
 * transport.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Unit;

use SonghealthCore\Rest\NeutralResponse;
use WP_UnitTestCase;

/**
 * @group rest
 */
class NeutralResponseTest extends WP_UnitTestCase {

	/** @test */
	public function test_not_found_is_the_bounded_404_class() {
		$response = NeutralResponse::not_found();

		$this->assertSame( 404, $response->get_status() );
		$this->assertSame(
			array(
				'code'    => NeutralResponse::CODE_NOT_FOUND,
				'message' => 'Not found.',
				'data'    => array( 'status' => 404 ),
			),
			$response->get_data()
		);
	}

	/** @test */
	public function test_invalid_request_is_the_bounded_400_class() {
		$response = NeutralResponse::invalid_request();

		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( NeutralResponse::CODE_INVALID_REQUEST, $response->get_data()['code'] );
		$this->assertSame( array( 'status' => 400 ), $response->get_data()['data'] );
	}

	/** @test */
	public function test_unexpected_failure_is_the_bounded_500_class() {
		$response = NeutralResponse::unexpected_failure();

		$this->assertSame( 500, $response->get_status() );
		$this->assertSame( NeutralResponse::CODE_UNAVAILABLE, $response->get_data()['code'] );
		$this->assertSame( array( 'status' => 500 ), $response->get_data()['data'] );
	}

	/** @test */
	public function test_bodies_carry_no_request_echo_or_protected_vocabulary() {
		$forbidden = array(
			'songhealth_page',
			'songhealth_document',
			'basic-page',
			'document-resource',
			'wp/v2',
			'ID',
			'post_',
			'user',
			'author',
			'draft',
			'hidden',
			'withdrawn',
			'publish',
			'meta',
			'attachment',
			'uuid',
			'019',  // a canonical Public ID prefix must never appear
		);

		foreach ( array( 'not_found', 'invalid_request', 'unexpected_failure' ) as $factory ) {
			$body = (string) wp_json_encode( NeutralResponse::$factory()->get_data() );
			foreach ( $forbidden as $needle ) {
				$this->assertStringNotContainsString( $needle, $body, "neutral body must not contain '{$needle}'" );
			}
		}
	}

	/** @test */
	public function test_denials_and_errors_are_never_cacheable() {
		foreach ( array( 'not_found', 'invalid_request', 'unexpected_failure' ) as $factory ) {
			$response = NeutralResponse::$factory();
			$this->assertSame( 'no-store', $response->get_headers()['Cache-Control'] ?? '', $factory );
			$this->assertSame( 'nosniff', $response->get_headers()['X-Content-Type-Options'] ?? '', $factory );
		}
	}

	/** @test */
	public function test_neutral_classes_are_stable_and_indistinguishable_per_class() {
		$this->assertSame(
			NeutralResponse::not_found()->get_data(),
			NeutralResponse::not_found()->get_data(),
			'two callers must receive byte-identical neutral bodies'
		);
	}
}
