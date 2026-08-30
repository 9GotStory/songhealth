<?php
/**
 * Public surface containment matrix (Delivery 002, T022 / US1).
 *
 * The complete US1 anonymous native-surface matrix: REST namespaces, single
 * and direct routes, archives, native search, feeds, sitemaps, taxonomy,
 * author, and date surfaces, oEmbed, attachment/media rendering, encoding
 * variants, and canonical-route competition — no native surface may disclose
 * more than the Songhealth public contract or compete with the React
 * canonical routes, while authenticated editor infrastructure keeps ordinary
 * behavior (FR-008, FR-009, FR-012; quickstart.md §4; SC-003).
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-007–
 * FR-009, FR-011, FR-012, FR-030; research.md §6; data-model.md §Shared
 * Songhealth Resource policy.
 *
 * @package SonghealthCore\Tests\Containment
 */

declare( strict_types=1 );

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\PublicProjector;
use SonghealthCore\Rest\Routes;

/**
 * @group containment
 * @group us1
 */
class PublicSurfaceContainmentTest extends WP_UnitTestCase {

	/** Fixture identifiers of the current test. */
	private $fixture_ids = array();

	public function set_up() {
		parent::set_up();
		wp_set_current_user( 0 );
	}

	public function tear_down() {
		parent::tear_down();
		global $wpdb;
		/*
		 * Service-created records commit outside the framework's isolation
		 * transaction; remove them durably so no test's fixtures leak into
		 * another's containment answer (same accepted technique as the plugin
		 * suites' ServiceCreatedRecordCleanup).
		 */
		$wpdb->query( 'COMMIT' );
		$wpdb->query( 'START TRANSACTION' );
		foreach ( $this->fixture_ids as $post_id ) {
			if ( null !== get_post( $post_id ) ) {
				wp_delete_post( $post_id, true );
			}
		}
		$wpdb->query( 'COMMIT' );
		$this->fixture_ids = array();
	}

	/**
	 * Create an accepted Basic Page fixture in a chosen state.
	 *
	 * @param string $status WordPress post status.
	 * @param string $title  Fixture title.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $status = 'publish', $title = 'Containment Matrix Fixture' ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => $title,
				'post_name'   => sanitize_title( $title ),
				'post_status' => $status,
			)
		);
		$this->assertIsArray( $created );
		$this->fixture_ids[] = (int) $created['post_id'];
		return $created;
	}

	/**
	 * Create an accepted, published Document Resource with an attachment.
	 *
	 * @return array{post_id: int, public_id: string, attachment_id: int}
	 */
	private function create_document_with_attachment() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Containment Matrix Document',
				'post_name'   => 'containment-matrix-document',
				'post_status' => 'publish',
			)
		);
		$this->assertIsArray( $created );
		$this->fixture_ids[] = (int) $created['post_id'];

		$attachment_id = self::factory()->attachment->create_object(
			'containment-matrix-fixture.pdf',
			(int) $created['post_id'],
			array(
				'post_mime_type' => 'application/pdf',
				'post_type'      => 'attachment',
			)
		);
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $attachment_id );
		return array(
			'post_id'       => (int) $created['post_id'],
			'public_id'     => (string) $created['public_id'],
			'attachment_id' => (int) $attachment_id,
		);
	}

	/**
	 * Assert a rendered front-end navigation resolves to the neutral 404 class
	 * with no rows, without degrading into a listing that answers 200.
	 *
	 * @param string $url URL to navigate to.
	 * @return void
	 */
	private function assert_neutral_404( $url ) {
		$this->go_to( $url );
		$this->assertTrue( is_404(), "{$url} must resolve to the neutral 404 class" );
		$this->assertEmpty( $GLOBALS['wp_query']->posts, 'the contained query must resolve to nothing' );
	}

	/** @test */
	public function test_anonymous_native_rest_matrix_is_contained() {
		$eligible = $this->create_page();
		$document = $this->create_document_with_attachment();

		$native_routes = array(
			'/wp/v2/posts',
			'/wp/v2/pages',
			'/wp/v2/media',
			'/wp/v2/users',
			'/wp/v2/search',
			'/wp/v2/types',
			'/wp/v2/taxonomies',
			'/wp/v2/categories',
			'/wp/v2/tags',
			'/wp/v2/comments',
			'/oembed/1.0/embed',
		);
		foreach ( $native_routes as $route ) {
			$response = rest_do_request( new WP_REST_Request( 'GET', $route ) );
			$this->assertSame( 404, $response->get_status(), "anonymous {$route} must be contained" );
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'], "anonymous {$route} must receive the neutral class" );
		}

		/* Query-shaped probes against the same surfaces disclose nothing either. */
		$probes = array(
			array( '/wp/v2/search', array( 'search' => 'Containment Matrix' ) ),
			array( '/wp/v2/posts', array( 'search' => 'Containment Matrix' ) ),
			array( '/wp/v2/media', array( 'search' => 'containment-matrix-fixture' ) ),
			array( '/wp/v2/types', array( 'type' => FoundationTypes::BASIC_PAGE ) ),
		);
		foreach ( $probes as list( $route, $params ) ) {
			$request = new WP_REST_Request( 'GET', $route );
			foreach ( $params as $key => $value ) {
				$request->set_param( $key, $value );
			}
			$response = rest_do_request( $request );
			$this->assertSame( 404, $response->get_status() );

			$encoded = (string) wp_json_encode( $response->get_data() );
			$this->assertStringNotContainsString( (string) $eligible['public_id'], $encoded );
			$this->assertStringNotContainsString( (string) $document['public_id'], $encoded );
			$this->assertStringNotContainsString( 'containment-matrix-fixture.pdf', $encoded, 'no storage filename identity on any native surface' );
			$this->assertStringNotContainsString( 'Containment Matrix', $encoded );
		}
	}

	/** @test */
	public function test_the_songhealth_contract_is_the_only_public_rest_surface() {
		$eligible = $this->create_page();

		/* The contract namespace answers through its own neutral/allowlisted classes, never through containment. */
		$detail = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources/basic-page/' . (string) $eligible['public_id'] ) );
		$this->assertContains( $detail->get_status(), array( 200, 404 ), 'the Songhealth namespace is served by its own eligibility decision' );

		$unknown = rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000' ) );
		$this->assertSame( 404, $unknown->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $unknown->get_data()['code'] );

		/* No native namespace carries Songhealth record data for an anonymous request. */
		foreach ( array( '/wp/v2', '/wp/v2/pages/' . (int) $eligible['post_id'] ) as $route ) {
			$response = rest_do_request( new WP_REST_Request( 'GET', $route ) );
			$this->assertSame( 404, $response->get_status() );
			$this->assertStringNotContainsString( (string) $eligible['public_id'], (string) wp_json_encode( $response->get_data() ) );
		}
	}

	/** @test */
	public function test_single_and_direct_route_matrix_is_contained() {
		$eligible = $this->create_page();
		$post_id  = (int) $eligible['post_id'];
		self::factory()->post->create( array( 'post_title' => 'Ordinary Public Post', 'post_status' => 'publish' ) );

		/* Direct resolution by internal identifier, and its encoding variants. */
		$variants = array(
			'p'             => array( 'p' => (string) $post_id ),
			'p-encoded'     => array( 'p' => rawurlencode( (string) $post_id ) ),
			'page_id'       => array( 'page_id' => (string) $post_id ),
			'page_id-encoded' => array( 'page_id' => rawurlencode( (string) $post_id ) ),
		);
		foreach ( $variants as $label => $query ) {
			$this->assert_neutral_404( add_query_arg( $query, home_url( '/' ) ) );
		}

		/*
		 * Slug-shaped native routes: the record's own display slug cannot
		 * address it on any resolvable native query surface.
		 */
		$this->assert_neutral_404( add_query_arg( 'pagename', 'containment-matrix-fixture', home_url( '/' ) ) );
		$this->assert_neutral_404( add_query_arg( 'name', 'containment-matrix-fixture', home_url( '/' ) ) );

		/*
		 * A supported-type archive query is stripped by the containment layer:
		 * it degrades to the ordinary front-end query and never lists the
		 * supported type or its records.
		 */
		$this->go_to( add_query_arg( 'post_type', FoundationTypes::BASIC_PAGE, home_url( '/' ) ) );
		$query = $GLOBALS['wp_query'];
		$this->assertNotContains( $post_id, wp_list_pluck( $query->posts, 'ID' ), 'a supported-type archive query never lists the record' );
		$this->assertNotContains( FoundationTypes::BASIC_PAGE, (array) $query->get( 'post_type' ), 'the supported type is stripped from the query' );

		/*
		 * A pretty-permalink path of the record's display slug (the shape a
		 * pretty-permalink profile would produce) renders the record on no
		 * native surface, whatever the profile's permalink structure answers
		 * for an unknown path generally.
		 */
		$this->go_to( home_url( '/containment-matrix-fixture/' ) );
		$this->assertNotContains( $post_id, wp_list_pluck( $GLOBALS['wp_query']->posts, 'ID' ), 'the record never renders on a slug-shaped native path' );
		$this->assertNotContains( FoundationTypes::BASIC_PAGE, (array) $GLOBALS['wp_query']->get( 'post_type' ) );
	}

	/** @test */
	public function test_native_search_archive_feed_taxonomy_author_and_date_surfaces_never_list_supported_types() {
		$eligible = $this->create_page();
		$post_id  = (int) $eligible['post_id'];
		$author   = self::factory()->user->create( array( 'user_login' => 'matrixauthor', 'role' => 'author' ) );
		wp_update_post( array( 'ID' => $post_id, 'post_author' => $author ) );

		$probes = array(
			'search'   => array( 's' => 'Containment Matrix' ),
			'archive'  => array( 'post_type' => FoundationTypes::BASIC_PAGE ),
			'taxonomy' => array( 'cat' => '1' ),
			'tag'      => array( 'tag' => 'containment' ),
			'author'   => array( 'author' => (string) $author ),
			'date'     => array( 'm' => gmdate( 'Ym' ) ),
		);
		foreach ( $probes as $label => $query ) {
			$this->go_to( add_query_arg( $query, home_url( '/' ) ) );
			$query_object = $GLOBALS['wp_query'];

			$this->assertNotContains( $post_id, wp_list_pluck( $query_object->posts, 'ID' ), "the {$label} surface must not list a Songhealth-managed record" );
			$this->assertNotContains( FoundationTypes::BASIC_PAGE, (array) $query_object->get( 'post_type' ), "the {$label} surface must not query the supported types" );
		}

		/* Feeds: every native feed shape, including the comments feed. */
		foreach ( array( 'rss2', 'atom', 'rdf', 'comments-rss2' ) as $feed ) {
			$this->go_to( add_query_arg( 'feed', $feed, home_url( '/' ) ) );
			$feed_query = $GLOBALS['wp_query'];
			$this->assertTrue( $feed_query->is_feed() );
			$this->assertNotContains( $post_id, wp_list_pluck( $feed_query->posts, 'ID' ), "the {$feed} feed must not carry a Songhealth-managed record" );
		}
	}

	/** @test */
	public function test_sitemaps_and_oembed_disclose_no_supported_record() {
		$eligible = $this->create_page();
		$post_id  = (int) $eligible['post_id'];

		/* Sitemap providers never carry the supported types. */
		$this->assertArrayNotHasKey( FoundationTypes::BASIC_PAGE, apply_filters( 'wp_sitemaps_post_types', array() ) );

		if ( class_exists( 'WP_Sitemaps_Posts' ) ) {
			$provider = new WP_Sitemaps_Posts();
			$subtypes = $provider->get_object_subtypes();
			$this->assertIsArray( $subtypes );
			$this->assertArrayNotHasKey( FoundationTypes::BASIC_PAGE, $subtypes );

			foreach ( array_keys( is_array( $subtypes ) ? $subtypes : array() ) as $subtype ) {
				$urls = $provider->get_url_list( 1, $subtype );
				$this->assertStringNotContainsString( (string) $eligible['public_id'], (string) wp_json_encode( $urls ), "the {$subtype} sitemap must not carry the record's identity" );
				$this->assertStringNotContainsString( 'containment-matrix-fixture', (string) wp_json_encode( $urls ) );
			}
		}

		/*
		 * oEmbed: contained as a native REST namespace anonymously, and no
		 * discovery target can exist for a record with no public native URL.
		 */
		$oembed = new WP_REST_Request( 'GET', '/oembed/1.0/embed' );
		$oembed->set_param( 'url', home_url( '/?p=' . $post_id ) );
		$response = rest_do_request( $oembed );
		$this->assertSame( 404, $response->get_status(), 'the oEmbed surface is contained for anonymous requests' );
		$this->assertStringNotContainsString( 'Containment Matrix', (string) wp_json_encode( $response->get_data() ) );
	}

	/** @test */
	public function test_attachment_and_media_surfaces_never_disclose_protected_media_identity() {
		$document   = $this->create_document_with_attachment();
		$attachment = get_post( (int) $document['attachment_id'] );

		/* The attachment of a supported-type record has no native attachment page. */
		$this->assert_neutral_404( add_query_arg( 'attachment_id', (string) $document['attachment_id'], home_url( '/' ) ) );
		$this->assert_neutral_404( add_query_arg( 'attachment_id', rawurlencode( (string) $document['attachment_id'] ), home_url( '/' ) ) );

		/* The Document Resource itself has no native single route. */
		$this->assert_neutral_404( add_query_arg( 'p', (string) $document['post_id'], home_url( '/' ) ) );

		/* Native media REST stays contained and discloses neither identity. */
		$media = new WP_REST_Request( 'GET', '/wp/v2/media' );
		$media->set_param( 'parent', (string) $document['post_id'] );
		$response = rest_do_request( $media );
		$this->assertSame( 404, $response->get_status() );

		$encoded = (string) wp_json_encode( $response->get_data() );
		$this->assertStringNotContainsString( 'containment-matrix-fixture.pdf', $encoded );
		$this->assertStringNotContainsString( (string) $attachment->guid, $encoded, 'no Media Library URL may appear on a contained surface' );
		$this->assertStringNotContainsString( (string) $document['attachment_id'], $encoded, 'no attachment identity may appear' );
	}

	/** @test */
	public function test_native_surfaces_never_compete_with_the_react_canonical_route() {
		$eligible = $this->create_page();
		$post_id  = (int) $eligible['post_id'];

		/*
		 * The one approved canonical destination is the Songhealth projection's
		 * React path; the WordPress permalink for a Songhealth-managed record is
		 * not a public canonical route and never renders.
		 */
		$projection = PublicProjector::project( $post_id );
		$this->assertIsArray( $projection );
		$this->assertSame( '/pages/' . (string) $eligible['public_id'] . '/containment-matrix-fixture', $projection['canonicalPath'] );

		$this->assert_neutral_404( get_permalink( $post_id ) );
		$this->assert_neutral_404( add_query_arg( 'page_id', (string) $post_id, home_url( '/' ) ) );

		/* No canonical/shortlink/REST metadata advertises a native URL for the record. */
		$this->assertFalse( has_action( 'wp_head', 'wp_shortlink_wp_head' ), 'the native shortlink surface is removed' );
		$this->assertFalse( has_action( 'wp_head', 'rest_output_link_wp_head' ), 'the native REST head link is removed' );
		$this->assertStringNotContainsString( (string) $eligible['public_id'], wp_get_shortlink( $post_id ) );

		/* The Songhealth canonical route itself is a React route, never registered inside WordPress. */
		foreach ( rest_get_server()->get_routes() as $route => $handlers ) {
			if ( 0 === strpos( $route, '/' . Routes::ROUTE_NAMESPACE ) ) {
				$this->assertStringNotContainsString( '/pages', $route, 'no public /pages hub or listing route exists in the contract' );
			}
		}
	}

	/** @test */
	public function test_authenticated_editor_infrastructure_keeps_ordinary_behavior() {
		$eligible = $this->create_page();

		$administrator_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $administrator_id );

		/* Staff keep full native REST use. */
		foreach ( array( '/wp/v2/posts', '/wp/v2/types', '/wp/v2/users', '/wp/v2/media' ) as $route ) {
			$response = rest_do_request( new WP_REST_Request( 'GET', $route ) );
			$this->assertSame( 200, $response->get_status(), "authenticated staff {$route} must remain usable" );
		}
		$index = rest_do_request( new WP_REST_Request( 'GET', '/' ) );
		$this->assertContains( 'wp/v2', $index->get_data()['namespaces'], 'the full operational index stays available to staff' );

		/* wp-admin and internal queries keep ordinary behavior for the supported types. */
		set_current_screen( 'edit.php' );
		$admin_query = new WP_Query(
			array(
				'post_type'        => FoundationTypes::BASIC_PAGE,
				'post_status'      => 'any',
				'suppress_filters' => false,
			)
		);
		$this->assertNotEmpty( $admin_query->posts, 'editor queries for the supported types keep ordinary behavior' );
		set_current_screen( 'front' );

		wp_set_current_user( 0 );
	}
}
