<?php
/**
 * Songhealth public REST route shapes (Delivery 002, T016).
 *
 * Registers exactly the approved `songhealth/v1` shapes and nothing else:
 * resource detail, bounded listing, Preview retrieval, and the Document
 * Resource binary route. No Songhealth search route or parameter exists
 * (FR-030; contracts/public-rest.md, contracts/preview.md,
 * contracts/protected-binary.md).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-006, FR-007, FR-012,
 *   FR-016, FR-019, FR-030;
 * - specs/002-headless-wordpress-foundation/contracts/public-rest.md,
 *   contracts/preview.md, contracts/protected-binary.md;
 * - specs/002-headless-wordpress-foundation/research.md §5, §8, §9;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Route-shape contract: the resource type remains a fixed alternation in
 * the route pattern (the type is public vocabulary, not a protected fact),
 * while the identifier segment accepts any single non-empty segment so
 * every identifier condition reaches the one neutral handler answer
 * (G02C-B01). Every query argument declares an explicit schema and an
 * explicit validation callback against the shared allowlists (T17), so
 * invalid listing input fails before any handler runs, bounded, without
 * honoring any keyword/search/filter parameter.
 *
 * Permission contract: all four shapes are route-level public reads —
 * anonymity is the design, and whether a record is actually disclosed is
 * decided per request by the current eligibility decision (T013) in the
 * response path, never by the permission callback. The Preview surface's
 * authenticated Songhealth staff session boundary is the handler's FIRST
 * action (see preview_permission for why it cannot live in the permission
 * callback): anonymous and non-staff requests fail closed with the neutral
 * class before any candidate state, identifier validation, or record access.
 * Fresh grant, capability, scope, object, and candidate-availability
 * authorization remain the Preview controller's per-request decision (T035).
 *
 * Neutrality contract (G02C-B01, FR-012, FR-020): malformed, canonical-shaped
 * unknown, and ineligible identifiers on the detail, binary, and Preview
 * surfaces resolve to ONE externally observable response — the bounded
 * neutral not-found class with identical status, code, body, and
 * nondisclosing headers. Canonical UUIDv7 validation stays strict and runs
 * inside the handler before any resolution or database work; the route
 * pattern accepts any single non-empty identifier segment precisely so that
 * malformed identifiers reach that one neutral answer instead of the
 * platform's distinct unrouted-response body.
 *
 * Handler boundary: the working projections belong to the user-story
 * controllers. PublicResourcesController (T025) owns the resource-detail and
 * bounded-listing responses and is dispatched to below; PreviewController
 * (T035) and BinaryController (T043) are NOT part of this batch, so those
 * two handlers still fail closed with the same neutral not-found class
 * (T014): the registered surface exposes its approved shapes and bounded
 * input behavior, and discloses nothing else — not records, not existence,
 * not lifecycle state.
 *
 * This module registers its routes on `rest_api_init` when the plugin
 * lifecycle wiring (T019) calls register(); loading the file alone attaches
 * nothing.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\PublicIdRegistry;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class Routes {

	/** The Songhealth public contract namespace (FR-001, FR-030). */
	const ROUTE_NAMESPACE = 'songhealth/v1';

	/** Bounded listing collection route. */
	const ROUTE_LISTING = '/resources';

	/*
	 * Identifier route patterns. The identifier segment accepts any single
	 * non-empty path segment on purpose (G02C-B01): if the canonical UUIDv7
	 * shape were encoded here, a malformed identifier would be answered by
	 * the platform's unrouted-response body while a canonical-shaped unknown
	 * identifier would be answered by the neutral class — an observable
	 * distinction between malformed, unknown, and ineligible records
	 * (FR-012, FR-020; contracts/public-rest.md §Detail). The canonical
	 * validation stays STRICT; it runs inside the handler (see
	 * `neutral_for_identifier()`), so every identifier condition resolves to
	 * the identical bounded neutral not-found response.
	 */
	const IDENTIFIER_SEGMENT_PATTERN = '(?P<publicId>[^/]+)';

	/** Resource detail route pattern. */
	const ROUTE_DETAIL = '/resources/(?P<resourceType>basic-page|document-resource)/' . self::IDENTIFIER_SEGMENT_PATTERN;

	/** Authenticated Preview retrieval route pattern. */
	const ROUTE_PREVIEW = '/preview/(?P<resourceType>basic-page|document-resource)/' . self::IDENTIFIER_SEGMENT_PATTERN;

	/** Mediated Document Resource binary route pattern. */
	const ROUTE_BINARY = '/documents/' . self::IDENTIFIER_SEGMENT_PATTERN . '/binary';

	/**
	 * Register the approved route shapes on the REST infrastructure.
	 *
	 * @return void
	 */
	public static function register() {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			self::ROUTE_DETAIL,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'detail_item' ),
					'permission_callback' => array( __CLASS__, 'public_read_permission' ),
					'args'                => array(
						'resourceType' => self::resource_type_arg(),
						'publicId'     => self::public_id_arg(),
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			self::ROUTE_LISTING,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'list_items' ),
					'permission_callback' => array( __CLASS__, 'public_read_permission' ),
					'args'                => array(
						'type'    => self::listing_type_arg(),
						'perPage' => self::per_page_arg(),
						'order'   => self::order_arg(),
						'cursor'  => self::cursor_arg(),
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			self::ROUTE_PREVIEW,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'preview_item' ),
					'permission_callback' => array( __CLASS__, 'preview_permission' ),
					'args'                => array(
						'resourceType' => self::resource_type_arg(),
						'publicId'     => self::public_id_arg(),
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			self::ROUTE_BINARY,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'binary_item' ),
					'permission_callback' => array( __CLASS__, 'public_read_permission' ),
					'args'                => array(
						'publicId' => self::public_id_arg(),
					),
				),
			)
		);
	}

	/**
	 * Route-level public read permission.
	 *
	 * Anonymous reads are the design of these shapes: returning true authorizes
	 * the REQUEST, never a record. Whether any record is disclosed is decided
	 * per request by the current eligibility decision in the response path,
	 * so this callback never grants visibility by itself (FR-007).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true
	 */
	public static function public_read_permission( $request ) {
		return true;
	}

	/**
	 * Preview route permission: route-level public read.
	 *
	 * The Preview session boundary is enforced INSIDE the handler, not here
	 * (G02C-B01): a permission callback can only fail with a bare WP_Error,
	 * which cannot carry the neutral class's nondisclosing transport headers,
	 * so an anonymous denial produced at the permission layer would be
	 * observable different from the handler's neutral response. The handler's
	 * FIRST action is the authenticated-Songhealth-staff session check, which
	 * fails closed with the identical neutral class before any candidate
	 * state, identifier validation, or record access happens — anonymous and
	 * non-staff requests never proceed past it (FR-016, FR-017).
	 *
	 * Grant validity, capability, scope, object, and candidate availability
	 * remain the Preview controller's per-request decisions (T035).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true
	 */
	public static function preview_permission( $request ) {
		return true;
	}

	/**
	 * Whether the current request carries an authenticated Songhealth staff
	 * session — the accepted staff boundary (Frozen 06; T008/T009
	 * vocabulary). Anonymous and non-staff requests resolve identically to
	 * not-staff.
	 *
	 * @return bool
	 */
	private static function is_staff_session() {
		$user = wp_get_current_user();
		return $user->exists() && null !== CapabilityMap::resolve_role( $user );
	}

	/**
	 * The single neutral answer for every identifier condition on the detail,
	 * binary, and Preview surfaces (G02C-B01, FR-012, FR-020).
	 *
	 * Canonical validation stays STRICT and happens here, before any
	 * resolution, eligibility, or database work: a malformed identifier, a
	 * canonical-shaped unknown identifier, and an ineligible record all
	 * resolve to exactly one response — the bounded neutral not-found class
	 * with its fixed body and nondisclosing headers — so no outside observer
	 * can tell which condition applied. Returns null only when the identifier
	 * IS canonical, telling the caller it may proceed to the (still
	 * neutral-failing, pre-controller) record path.
	 *
	 * @param WP_REST_Request $request Request carrying the publicId argument.
	 * @return WP_REST_Response|null The neutral response, or null when the identifier is canonical.
	 */
	private static function neutral_for_identifier( $request ) {
		$public_id = (string) $request->get_param( 'publicId' );
		if ( ! PublicIdRegistry::is_valid_public_id( $public_id ) ) {
			return NeutralResponse::not_found();
		}
		return null;
	}

	/**
	 * Resource detail handler: dispatch to the US1 controller (T025).
	 *
	 * Every identifier condition — malformed, canonical-shaped unknown,
	 * ineligible — still resolves to the identical neutral class; that answer
	 * is produced inside the controller, after the same strict canonical
	 * validation this route's neutrality contract requires.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function detail_item( $request ) {
		return PublicResourcesController::detail( $request );
	}

	/**
	 * Bounded listing handler: dispatch to the US1 controller (T025).
	 *
	 * Input is re-validated against the shared allowlists inside the
	 * controller (defense in depth behind the route argument validation), and
	 * invalid list input and invalid cursor input share the one bounded
	 * invalid-request class there.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function list_items( $request ) {
		return PublicResourcesController::listing( $request );
	}

	/**
	 * Preview retrieval handler.
	 *
	 * The staff-session boundary is the first action (see preview_permission
	 * for why it lives here), followed by the same neutral identifier
	 * treatment as the other surfaces; the bounded candidate projection
	 * belongs to the authorized US2 controller (T035).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function preview_item( $request ) {
		if ( ! self::is_staff_session() ) {
			return NeutralResponse::not_found();
		}
		$neutral = self::neutral_for_identifier( $request );
		if ( null !== $neutral ) {
			return $neutral;
		}
		return NeutralResponse::not_found();
	}

	/**
	 * Document Resource binary handler.
	 *
	 * Every identifier condition resolves to the identical neutral class; the
	 * owning Document Resource's current-eligibility mediated delivery
	 * belongs to the authorized US3 controller (T043).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function binary_item( $request ) {
		$neutral = self::neutral_for_identifier( $request );
		if ( null !== $neutral ) {
			return $neutral;
		}
		return NeutralResponse::not_found();
	}

	/**
	 * The resource type path argument: fixed to the public vocabulary by the
	 * route pattern, re-checked here against the same allowlist.
	 *
	 * @return array<string, mixed>
	 */
	private static function resource_type_arg() {
		return array(
			'type'              => 'string',
			'required'          => true,
			'validate_callback' => function ( $value ) {
				return null !== FoundationTypes::post_type_for( (string) $value );
			},
		);
	}

	/**
	 * The identifier path argument: one non-empty path segment (the route
	 * pattern guarantees the segment shape).
	 *
	 * Deliberately NO canonical rejection here (G02C-B01): failing an
	 * argument at this layer makes WordPress answer with its
	 * invalid-parameter class — an observable 400 distinct from the neutral
	 * not-found class, telling an outsider that an identifier was
	 * well-formed enough to be rejected as a record identifier. The strict
	 * canonical UUIDv7 validation is enforced inside the handler (see
	 * `neutral_for_identifier()`), where every identifier condition resolves
	 * to the one neutral response.
	 *
	 * @return array<string, mixed>
	 */
	private static function public_id_arg() {
		return array(
			'type'              => 'string',
			'required'          => true,
			'validate_callback' => function ( $value ) {
				return is_string( $value ) && '' !== $value;
			},
		);
	}

	/**
	 * The listing type argument: required and allowlisted to the two
	 * supported resource types (contracts/public-rest.md §Bounded listing).
	 *
	 * @return array<string, mixed>
	 */
	private static function listing_type_arg() {
		return array(
			'type'              => 'string',
			'required'          => true,
			'enum'              => array( FoundationTypes::RESOURCE_BASIC_PAGE, FoundationTypes::RESOURCE_DOCUMENT_RESOURCE ),
			'validate_callback' => function ( $value ) {
				return null !== FoundationTypes::post_type_for( (string) $value );
			},
		);
	}

	/**
	 * The optional opaque continuation cursor. Transport-typed only: the
	 * cursor's emptiness, maximum size, canonical form, authenticity,
	 * expiry, and type/order binding are all validated by the Songhealth
	 * cursor/query path inside the handler (EligibleResourceQuery
	 * `validate_params`/`validate_cursor`), and every one of those failures
	 * shares the one bounded `songhealth_invalid_request` class with all
	 * other unsupported list input (G03-B01; contracts/public-rest.md
	 * §Bounded listing).
	 *
	 * Rejecting an empty or overlength cursor at THIS layer instead would
	 * make WordPress answer with its own invalid-parameter class — an
	 * observable 400 body distinct from the Songhealth class — splitting the
	 * invalid-cursor conditions into two externally distinguishable groups.
	 * The hard maximum-size bound is retained unchanged, one layer deeper,
	 * where it fails closed through the neutral class.
	 *
	 * @return array<string, mixed>
	 */
	private static function cursor_arg() {
		return array(
			'type'              => 'string',
			'required'          => false,
			'validate_callback' => function ( $value ) {
				return is_string( $value );
			},
			'sanitize_callback' => function ( $value ) {
				return (string) $value;
			},
		);
	}

	/**
	 * The perPage argument: positive and capped by the hard server maximum.
	 *
	 * @return array<string, mixed>
	 */
	private static function per_page_arg() {
		return array(
			'type'              => 'integer',
			'required'          => false,
			'default'           => EligibleResourceQuery::DEFAULT_PER_PAGE,
			'minimum'           => 1,
			'maximum'           => EligibleResourceQuery::MAX_PER_PAGE,
			'validate_callback' => function ( $value ) {
				return is_numeric( $value )
					&& (int) $value >= 1
					&& (int) $value <= EligibleResourceQuery::MAX_PER_PAGE;
			},
			'sanitize_callback' => function ( $value ) {
				return (int) $value;
			},
		);
	}

	/**
	 * The order argument: a closed allowlist with deterministic Public ID
	 * ordering (T17). No search, keyword, filter, or raw query parameter is
	 * declared or interpreted.
	 *
	 * @return array<string, mixed>
	 */
	private static function order_arg() {
		return array(
			'type'              => 'string',
			'required'          => false,
			'default'           => EligibleResourceQuery::ORDER_NEWEST,
			'enum'              => EligibleResourceQuery::orders(),
			'validate_callback' => function ( $value ) {
				return in_array( (string) $value, EligibleResourceQuery::orders(), true );
			},
		);
	}
}
