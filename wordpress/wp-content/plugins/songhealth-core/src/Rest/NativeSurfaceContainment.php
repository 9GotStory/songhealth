<?php
/**
 * Native anonymous surface containment (Delivery 002, T018).
 *
 * Contains the anonymous native WordPress surfaces that could otherwise
 * disclose more than the Songhealth public contract or create competing
 * canonical routes: the native REST namespaces and their metadata, the REST
 * index metadata, native search, feeds, sitemaps, front-end archives, single
 * and direct routes, and attachment/media rendering — while leaving
 * authenticated editor REST fully usable (FR-008, FR-009; research.md §6).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-007–FR-009, FR-012,
 *   FR-020, FR-030;
 * - specs/002-headless-wordpress-foundation/research.md §6;
 * - specs/002-headless-wordpress-foundation/data-model.md §Shared Songhealth
 *   Resource policy;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Layering contract: registration (T007) already closes every native URL
 * shape of the two types — `publicly_queryable=false`, no rewrites, no
 * archives, no feeds, excluded from native search and REST. The hooks below
 * are the explicit containment layer on top of that registration: they hold
 * when a theme, a plugin, or a later WordPress behavior tries to surface the
 * types anyway, and they contain the anonymous native REST namespaces that
 * exist independently of the types. Every hook is anonymous-side only: an
 * authenticated Songhealth staff request keeps the native REST surface the
 * WordPress editor needs, and wp-admin is never touched.
 *
 * Neutrality contract: every contained response is the same neutral class —
 * the platform's uniform not-routed/not-found 404 — never a redirect, never
 * a hint, never a distinction between "exists but protected" and "does not
 * exist" (FR-012).
 *
 * Boundary notes:
 * - The REST root index stays available (200 JSON) because the accepted Gate
 *   01.5 readiness proof requires it; for anonymous requests its native
 *   route and namespace metadata is reduced to the Songhealth contract, so
 *   the index discloses no native surface inventory.
 * - oEmbed: the oEmbed endpoint is a native REST namespace and is contained
 *   anonymously by the same namespace rule; the two types have no public URL
 *   (T007 registration), so no oEmbed discovery target for them can exist.
 * - Raw upload-path delivery is NOT interceptable by PHP and belongs to the
 *   protected-attachment storage boundary (T042, US3); this module contains
 *   the attachment TEMPLATE/rendering surface only.
 *
 * This module attaches its hooks when the plugin lifecycle wiring (T019)
 * calls register(); loading the file alone attaches nothing.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use WP_Error;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class NativeSurfaceContainment {

	/**
	 * Attach the containment hooks.
	 *
	 * @return void
	 */
	public static function register() {
		/*
		 * Anonymous native REST containment. `rest_pre_dispatch` runs after
		 * REST authentication is resolved and receives the parsed request, so
		 * the Songhealth namespace can be exempted precisely and the current
		 * user's staff identity is already known.
		 */
		add_filter( 'rest_pre_dispatch', array( __CLASS__, 'contain_anonymous_rest' ), 10, 3 );

		/* REST index metadata: anonymous index reduced to the Songhealth contract. */
		add_filter( 'rest_index', array( __CLASS__, 'contain_rest_index' ), 10, 2 );

		/* Front-end rendering containment: search, feeds, archives, single, direct routes, attachment pages. */
		add_action( 'pre_get_posts', array( __CLASS__, 'contain_front_end_query' ) );

		/* Sitemap containment. */
		add_filter( 'wp_sitemaps_post_types', array( __CLASS__, 'contain_sitemap_post_types' ) );

		/* Anonymous-facing metadata: CMS identity and structure links in the public head and headers. */
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );
		remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
		remove_action( 'template_redirect', 'rest_output_link_header', 11 );
		add_filter( 'the_generator', array( __CLASS__, 'suppress_generator' ) );
		add_filter( 'wp_headers', array( __CLASS__, 'contain_response_headers' ) );
	}

	/**
	 * Contain anonymous requests to native REST namespaces.
	 *
	 * The Songhealth public contract namespace always passes — it IS the
	 * approved public surface, with its own per-request eligibility decisions.
	 * The REST root index passes here so the accepted readiness proof keeps
	 * its 200 JSON shape; its metadata is contained separately below. Any
	 * other namespace is served only to an authenticated Songhealth staff
	 * user; everyone else receives the same neutral not-found error the
	 * platform returns for an unrouted request, so a contained native
	 * endpoint is indistinguishable from one that does not exist.
	 *
	 * @param mixed              $result  Pre-calculated dispatch result, or null.
	 * @param WP_REST_Server     $server  REST server.
	 * @param WP_REST_Request    $request Current request.
	 * @return mixed
	 */
	public static function contain_anonymous_rest( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result; // Already decided upstream; never widen a prior decision.
		}
		if ( ! $request instanceof WP_REST_Request ) {
			return $result;
		}

		$route = (string) $request->get_route();
		if ( '/' === $route || 0 === strpos( $route, '/' . Routes::ROUTE_NAMESPACE ) ) {
			return $result;
		}

		if ( self::is_staff_request() ) {
			return $result; // Authenticated editor REST stays fully usable.
		}

		return new WP_Error(
			NeutralResponse::CODE_NOT_FOUND,
			'Not found.',
			array( 'status' => 404 )
		);
	}

	/**
	 * Reduce the anonymous REST index to the Songhealth contract: no native
	 * namespaces, no native route inventory, no authentication-method
	 * metadata. Authenticated staff keep the full operational index.
	 *
	 * @param WP_REST_Response $response Index response.
	 * @param WP_REST_Request  $request  Index request.
	 * @return WP_REST_Response
	 */
	public static function contain_rest_index( $response, $request ) {
		if ( self::is_staff_request() ) {
			return $response;
		}

		$data = $response->get_data();
		if ( ! is_array( $data ) ) {
			return $response;
		}

		$namespace = Routes::ROUTE_NAMESPACE;
		$data['namespaces'] = array( $namespace );
		$data['routes']     = array();

		$server = rest_get_server();
		if ( $server instanceof WP_REST_Server ) {
			foreach ( $server->get_data_for_routes( $server->get_routes(), 'view' ) as $route => $route_data ) {
				if ( 0 === strpos( $route, '/' . $namespace ) ) {
					$data['routes'][ $route ] = $route_data;
				}
			}
		}
		unset( $data['authentication'] );

		$response->set_data( $data );
		return $response;
	}

	/**
	 * Contain the anonymous front-end rendering surface: native search,
	 * feeds, archives, author/date listings, direct single routes, and
	 * attachment pages.
	 *
	 * Runs only on the public front-end MAIN query — the query the WordPress
	 * router actually resolves a public URL into — never in wp-admin, REST,
	 * AJAX, cron, XML-RPC, or in internal/CLI queries, which are never the
	 * main query. Where the registration layer (T007) already gives the two
	 * types no URL shape, this is the defense-in-depth layer: supported
	 * types are stripped from the main front-end query, and a query that
	 * would resolve directly to a supported-type record — or to an
	 * attachment of one — is forced to the neutral 404 class.
	 *
	 * @param WP_Query $query Current query.
	 * @return void
	 */
	public static function contain_front_end_query( $query ) {
		if ( self::is_excluded_context() ) {
			return;
		}
		if ( ! $query instanceof WP_Query || ! $query->is_main_query() ) {
			return;
		}

		self::strip_supported_types( $query );
		self::contain_direct_resolution( $query );
	}

	/**
	 * Remove the supported foundation types from the sitemap provider's post
	 * types. Registration already keeps non-publicly-queryable types out of
	 * core sitemaps; this holds the line for any code that adds them back.
	 *
	 * @param array<string, \WP_Post_Type> $post_types Sitemap post types.
	 * @return array<string, \WP_Post_Type>
	 */
	public static function contain_sitemap_post_types( $post_types ) {
		if ( ! is_array( $post_types ) ) {
			return $post_types;
		}
		foreach ( FoundationTypes::supported_types() as $post_type ) {
			unset( $post_types[ $post_type ] );
		}
		return $post_types;
	}

	/**
	 * Suppress the generator meta output entirely (belt and braces with the
	 * removed wp_head callback, which themes and plugins sometimes re-add).
	 *
	 * @param string $generator Generator markup.
	 * @return string
	 */
	public static function suppress_generator( $generator ) {
		return '';
	}

	/**
	 * Contain response headers that disclose CMS structure: the pingback
	 * header. Headers added by other code are left untouched.
	 *
	 * @param array<string, string> $headers Response headers.
	 * @return array<string, string>
	 */
	public static function contain_response_headers( $headers ) {
		if ( is_array( $headers ) ) {
			unset( $headers['X-Pingback'] );
		}
		return $headers;
	}

	/**
	 * Whether the current request is an authenticated Songhealth staff
	 * request — the requester holds one of the accepted Songhealth roles.
	 * This is the boundary that keeps authenticated editor REST usable while
	 * every anonymous request to a native namespace is contained (Frozen 06;
	 * research.md §6).
	 *
	 * @return bool
	 */
	private static function is_staff_request() {
		$user = wp_get_current_user();
		if ( ! $user->exists() ) {
			return false;
		}
		return null !== CapabilityMap::resolve_role( $user );
	}

	/**
	 * Whether the current context is NOT public front-end rendering. wp-admin
	 * screens, REST requests, AJAX, cron, and XML-RPC keep WordPress's
	 * ordinary behavior — the containment boundary is the anonymous public
	 * surface only.
	 *
	 * @return bool
	 */
	private static function is_excluded_context() {
		return is_admin()
			|| ( defined( 'REST_REQUEST' ) && REST_REQUEST )
			|| wp_doing_ajax()
			|| wp_doing_cron()
			|| ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST );
	}

	/**
	 * Strip the supported types from a front-end query's post type list, so
	 * no theme, widget, feed, or search query lists Songhealth-managed
	 * records even if something puts the types into the query.
	 *
	 * @param WP_Query $query Current query.
	 * @return void
	 */
	private static function strip_supported_types( $query ) {
		$post_type = $query->get( 'post_type' );
		if ( is_array( $post_type ) ) {
			$remaining = array();
			foreach ( $post_type as $entry ) {
				if ( ! FoundationTypes::is_supported_type( (string) $entry ) ) {
					$remaining[] = $entry;
				}
			}
			if ( count( $remaining ) !== count( $post_type ) ) {
				$query->set( 'post_type', $remaining );
			}
			return;
		}

		if ( is_string( $post_type ) && FoundationTypes::is_supported_type( $post_type ) ) {
			$query->set( 'post_type', 'post' );
		}
	}

	/**
	 * Force the neutral 404 class when a front-end query would resolve
	 * directly to a supported-type record (`p`, `page_id`) or to an
	 * attachment whose parent is one (`attachment_id`). Direct access by
	 * internal identifier never discloses a Songhealth-managed record or its
	 * protected media identity on a native surface.
	 *
	 * @param WP_Query $query Current query.
	 * @return void
	 */
	private static function contain_direct_resolution( $query ) {
		$resolvable = array(
			'p'             => (int) $query->get( 'p', 0 ),
			'page_id'       => (int) $query->get( 'page_id', 0 ),
			'attachment_id' => (int) $query->get( 'attachment_id', 0 ),
		);

		foreach ( $resolvable as $var => $post_id ) {
			if ( $post_id < 1 ) {
				continue;
			}
			if ( self::is_contained_post( $post_id ) ) {
				/*
				 * Neutralize the resolver to an unresolvable negative ID so
				 * the query returns no rows. WordPress's own 404 handling
				 * then produces the full neutral 404 — status header, no-cache
				 * headers, and the 404 template — which is why this does NOT
				 * call set_404() itself: core's handle_404() refuses to send
				 * the status header for a query already marked 404, and
				 * clearing the variable to 0 instead of -1 would degrade the
				 * query into a normal listing that finds posts and answers
				 * 200 with the 404 template.
				 */
				if ( 'attachment_id' === $var ) {
					$query->set( 'attachment_id', -1 );
					$query->set( 'p', -1 );
				} else {
					$query->set( $var, -1 );
				}
				return;
			}
		}
	}

	/**
	 * Whether a post ID is contained from native public rendering: either a
	 * supported-type record itself, or an attachment whose parent is one.
	 *
	 * @param int $post_id Post ID to evaluate.
	 * @return bool
	 */
	private static function is_contained_post( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return false;
		}
		if ( FoundationTypes::is_supported_type( $post->post_type ) ) {
			return true;
		}
		if ( 'attachment' === $post->post_type && (int) $post->post_parent > 0 ) {
			$parent = get_post( (int) $post->post_parent );
			return $parent instanceof \WP_Post && FoundationTypes::is_supported_type( $parent->post_type );
		}
		return false;
	}
}
