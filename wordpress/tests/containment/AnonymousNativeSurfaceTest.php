<?php
/**
 * Anonymous native surface containment tests (Delivery 002, T018).
 *
 * Runs against the clean WordPress installation profile (containment suite
 * bootstrap). Proves the anonymous native surfaces are contained — native
 * REST namespaces, REST index metadata, front-end single/direct routes,
 * search, attachment pages, sitemaps, and CMS-identity metadata — while an
 * authenticated Songhealth staff request keeps full native REST use.
 *
 * This is the Foundational-phase (Phase 2) proportionate matrix for the
 * surfaces that exist before the user-story controllers; the complete US1
 * containment matrix belongs to its own authorized task (T022).
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-007–
 * FR-009, FR-012, FR-020, FR-030; research.md §6.
 *
 * @package SonghealthCore\Tests\Containment
 */

declare( strict_types=1 );

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Rest\NeutralResponse;

/**
 * @group containment
 */
class AnonymousNativeSurfaceTest extends WP_UnitTestCase {

	public function set_up() {
		parent::set_up();
		wp_set_current_user( 0 );
	}

	/**
	 * Create an accepted, published Basic Page fixture.
	 *
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_public_page() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Containment Fixture Page',
				'post_status' => 'publish',
			)
		);
		$this->assertIsArray( $created );
		return $created;
	}

	/** @test */
	public function test_anonymous_native_rest_namespaces_are_contained() {
		$native_routes = array(
			'/wp/v2/posts',
			'/wp/v2/pages',
			'/wp/v2/media',
			'/wp/v2/users',
			'/wp/v2/search',
			'/wp/v2/types',
			'/wp/v2/settings',
			'/oembed/1.0/embed',
		);

		foreach ( $native_routes as $route ) {
			$request  = new WP_REST_Request( 'GET', $route );
			$response = rest_do_request( $request );
			$this->assertSame( 404, $response->get_status(), "anonymous {$route} must be contained" );
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'], "anonymous {$route} must receive the neutral class" );
		}
	}

	/** @test */
	public function test_anonymous_native_rest_discloses_no_songhealth_records() {
		$created = $this->create_public_page();

		$search = new WP_REST_Request( 'GET', '/wp/v2/search' );
		$search->set_param( 'search', 'Containment Fixture' );
		$response = rest_do_request( $search );
		$this->assertSame( 404, $response->get_status() );

		$posts = new WP_REST_Request( 'GET', '/wp/v2/posts' );
		$posts->set_param( 'search', 'Containment Fixture' );
		$this->assertSame( 404, rest_do_request( $posts )->get_status() );

		$encoded = (string) wp_json_encode( $response->get_data() );
		$this->assertStringNotContainsString( (string) $created['public_id'], $encoded );
		$this->assertStringNotContainsString( 'Containment Fixture', $encoded );
	}

	/** @test */
	public function test_authenticated_staff_rest_remains_usable() {
		$administrator_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $administrator_id );

		foreach ( array( '/wp/v2/posts', '/wp/v2/types', '/wp/v2/users' ) as $route ) {
			$response = rest_do_request( new WP_REST_Request( 'GET', $route ) );
			$this->assertSame( 200, $response->get_status(), "authenticated staff {$route} must remain usable" );
		}

		/* Staff also keeps the REST index. */
		$index = rest_do_request( new WP_REST_Request( 'GET', '/' ) );
		$this->assertSame( 200, $index->get_status() );
		$this->assertContains( 'wp/v2', $index->get_data()['namespaces'] );
	}

	/** @test */
	public function test_anonymous_rest_index_stays_json_but_discloses_no_native_inventory() {
		$index = rest_do_request( new WP_REST_Request( 'GET', '/' ) );

		/*
		 * The index stays 200 JSON — the accepted Gate 01.5 readiness proof
		 * depends on that shape — but for anonymous requests it names only
		 * the Songhealth contract.
		 */
		$this->assertSame( 200, $index->get_status() );

		$data = $index->get_data();
		$this->assertSame( array( 'songhealth/v1' ), $data['namespaces'] );
		$this->assertArrayNotHasKey( 'authentication', $data );

		foreach ( array_keys( $data['routes'] ) as $route ) {
			$this->assertStringStartsWith( '/songhealth/v1', $route, 'no native route metadata may remain in the anonymous index' );
		}
		$this->assertArrayNotHasKey( '/wp/v2/posts', $data['routes'] );
	}

	/** @test */
	public function test_songhealth_contract_namespace_stays_publicly_reachable() {
		$detail = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $detail->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $detail->get_data()['code'], 'the Songhealth namespace is exempt from containment' );
	}

	/** @test */
	public function test_direct_front_end_access_by_internal_id_is_contained() {
		$created = $this->create_public_page();
		$post_id = (int) $created['post_id'];

		/*
		 * An ordinary published post must exist: if containment degraded the
		 * direct query into a normal listing, the listing would find it and
		 * the response would stop being a real 404.
		 */
		self::factory()->post->create( array( 'post_title' => 'Ordinary Public Post', 'post_status' => 'publish' ) );

		$this->go_to( add_query_arg( 'p', $post_id, home_url( '/' ) ) );
		$this->assertTrue( is_404(), 'a supported-type record must not render on any native front-end route' );

		global $wp_query;
		$this->assertEmpty( $wp_query->posts, 'the contained direct query must resolve to nothing — a non-empty result would answer 200 with the 404 template' );
		$this->assertNotContains( $post_id, wp_list_pluck( $wp_query->posts, 'ID' ), 'the contained record must not even enter the query results' );
	}

	/** @test */
	public function test_front_end_search_and_feeds_never_list_supported_types() {
		$created = $this->create_public_page();

		$this->go_to( add_query_arg( 's', 'Containment Fixture', home_url( '/' ) ) );
		global $wp_query;
		$this->assertTrue( $wp_query->is_search() );
		$this->assertNotContains( (int) $created['post_id'], wp_list_pluck( $wp_query->posts, 'ID' ) );
		$this->assertNotContains( FoundationTypes::BASIC_PAGE, (array) $wp_query->get( 'post_type' ) );

		/*
		 * go_to() replaces the global query object, so it is re-imported
		 * after each navigation rather than held across them.
		 */
		$this->go_to( home_url( '/?feed=rss2' ) );
		$feed_query = $GLOBALS['wp_query'];
		$this->assertTrue( $feed_query->is_feed() );
		$this->assertNotContains( (int) $created['post_id'], wp_list_pluck( $feed_query->posts, 'ID' ), 'supported types never enter native feeds' );
		$this->assertNotContains( FoundationTypes::BASIC_PAGE, (array) $feed_query->get( 'post_type' ) );
	}

	/** @test */
	public function test_attachment_of_a_supported_type_has_no_native_attachment_page() {
		$created = $this->create_public_page();

		$attachment_id = self::factory()->attachment->create_object(
			'contained-fixture.pdf',
			(int) $created['post_id'],
			array(
				'post_mime_type' => 'application/pdf',
				'post_type'      => 'attachment',
			)
		);

		$this->go_to( add_query_arg( 'attachment_id', $attachment_id, home_url( '/' ) ) );
		$this->assertTrue( is_404(), 'an attachment of a supported-type record has no native attachment surface' );
		$this->assertEmpty( $GLOBALS['wp_query']->posts, 'the contained attachment query must resolve to nothing' );

		/* An ordinary site attachment keeps its normal behavior. */
		$ordinary_id = self::factory()->attachment->create_object(
			'ordinary-fixture.png',
			0,
			array(
				'post_mime_type' => 'image/png',
				'post_type'      => 'attachment',
			)
		);
		$this->go_to( add_query_arg( 'attachment_id', $ordinary_id, home_url( '/' ) ) );
		$this->assertFalse( is_404(), 'containment is scoped to Songhealth-managed records, not the whole media library' );
	}

	/** @test */
	public function test_supported_types_are_absent_from_core_sitemaps() {
		$post_types = apply_filters( 'wp_sitemaps_post_types', array() );
		$this->assertArrayNotHasKey( FoundationTypes::BASIC_PAGE, $post_types );
		$this->assertArrayNotHasKey( FoundationTypes::DOCUMENT_RESOURCE, $post_types );

		if ( class_exists( 'WP_Sitemaps_Posts' ) ) {
			$provider = new WP_Sitemaps_Posts();
			$subtypes = $provider->get_object_subtypes();
			$this->assertIsArray( $subtypes );
			$this->assertArrayNotHasKey( FoundationTypes::BASIC_PAGE, $subtypes );
			$this->assertArrayNotHasKey( FoundationTypes::DOCUMENT_RESOURCE, $subtypes );
		}
	}

	/** @test */
	public function test_public_head_metadata_no_longer_discloses_cms_identity() {
		$this->assertFalse( has_action( 'wp_head', 'rsd_link' ), 'the RSD edit-protocol link must be removed' );
		$this->assertFalse( has_action( 'wp_head', 'wp_generator' ), 'the generator tag must be removed' );
		$this->assertFalse( has_action( 'wp_head', 'wp_shortlink_wp_head' ), 'the shortlink must be removed' );
		$this->assertFalse( has_action( 'wp_head', 'rest_output_link_wp_head' ), 'the REST head link must be removed' );
		$this->assertFalse( has_action( 'template_redirect', 'rest_output_link_header' ), 'the REST Link header must be removed' );

		$this->assertSame( '', apply_filters( 'the_generator', '<meta name="generator" content="WordPress 7.1" />' ) );

		$headers = apply_filters( 'wp_headers', array( 'X-Pingback' => 'https://example.org/xmlrpc.php' ) );
		$this->assertArrayNotHasKey( 'X-Pingback', $headers );
	}

	/** @test */
	public function test_containment_does_not_touch_admin_or_internal_queries() {
		$created = $this->create_public_page();

		/* wp-admin context: ordinary behavior. */
		set_current_screen( 'edit.php' );
		$this->assertTrue( is_admin() );
		$admin_query = new WP_Query(
			array(
				'post_type'              => FoundationTypes::BASIC_PAGE,
				'post_status'            => 'any',
				'suppress_filters'       => false,
			)
		);
		$this->assertNotEmpty( $admin_query->posts, 'admin queries for the supported types keep ordinary behavior' );
		set_current_screen( 'front' );

		/* Internal (non-main) queries outside the public router: ordinary behavior. */
		$internal = new WP_Query(
			array(
				'post_type'        => FoundationTypes::BASIC_PAGE,
				'post_status'      => 'publish',
				'suppress_filters' => false,
			)
		);
		$this->assertContains( (int) $created['post_id'], wp_list_pluck( $internal->posts, 'ID' ), 'containment scopes to the public main query, not to internal queries' );
	}
}
