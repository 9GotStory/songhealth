<?php
/**
 * Public resource detail and bounded listing controllers (Delivery 002, T025 / US1).
 *
 * The working `songhealth/v1` resource operations: eligible-only detail by
 * Public ID and the bounded opaque-continuation listing. Both are thin
 * compositions of the shared foundational primitives — the strict registry
 * identifier validation (T011), the live eligibility decision and keyset
 * scan (T013/T017), the explicit type projectors (T015), and the neutral
 * response classes (T014) — so this controller owns no eligibility rule, no
 * projection field, and no response shape of its own (FR-006–FR-008, FR-030;
 * contracts/public-rest.md).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-006–FR-008, FR-011,
 *   FR-012, FR-030 and the G02C-B02/B03 design-boundary clarifications;
 * - specs/002-headless-wordpress-foundation/contracts/public-rest.md
 *   §Detail, §Bounded listing, §Projection, references, errors, transport;
 * - specs/002-headless-wordpress-foundation/data-model.md §Public Projection;
 * - .specify/memory/constitution.md I, IV, V.
 *
 * Detail contract: resolution is by Public ID alone; strict canonical
 * validation runs before any resolution, and every identifier condition —
 * malformed, canonical-shaped unknown, wrong type, and ineligible — resolves
 * to the ONE neutral not-found class (T014), indistinguishable from outside.
 * Only the explicit per-type projector builds a public DTO, and it
 * re-evaluates the current eligibility decision itself, so an item is
 * disclosed only if BOTH the query's decision and the projection-time
 * decision accept it.
 *
 * Listing contract: the envelope carries exactly `data`, `hasMore`, and — on
 * a continuing response only — a string `nextCursor`; never exact totals or
 * page counts, never a native collection header. Invalid input and every
 * malformed, tampered, expired, version-mismatched, or type/order-mismatched
 * cursor share the one bounded invalid-request class. An empty `data` page
 * with `hasMore=true` and an opaque cursor is a legitimate continuing
 * response when the hard candidate budget ends with candidates remaining
 * (G02C-B02).
 *
 * Transport: every response this controller produces is JSON with
 * `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` — cache is
 * never eligibility authority, so no public response of this foundation is
 * cacheable into a stale eligibility decision (FR-007).
 *
 * This module is a pure controller; the route shapes (T016) dispatch into it
 * and it registers no hook of its own.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Identity\PublicIdRegistry;
use WP_REST_Request;
use WP_REST_Response;

final class PublicResourcesController {

	/**
	 * Resource detail: the currently eligible public projection of one record,
	 * resolved by its immutable Public ID.
	 *
	 * @param WP_REST_Request $request Request carrying resourceType and publicId.
	 * @return WP_REST_Response
	 */
	public static function detail( $request ) {
		/*
		 * Strict canonical validation first (G02C-B01): malformed identifiers
		 * reach the same neutral answer as unknown and ineligible ones, before
		 * any resolution or database work.
		 */
		$public_id = (string) $request->get_param( 'publicId' );
		if ( ! PublicIdRegistry::is_valid_public_id( $public_id ) ) {
			return NeutralResponse::not_found();
		}

		$post = EligibleResourceQuery::eligible_detail( (string) $request->get_param( 'resourceType' ), $public_id );
		if ( ! $post ) {
			return NeutralResponse::not_found();
		}

		/*
		 * FR-031 response preflight: the raw stored reference work of this
		 * response is counted before any reference iteration or projection.
		 * Over-budget stored state fails the WHOLE response through the
		 * bounded safe failure class — no partial DTO, no truncation, no
		 * count disclosure, no implied completeness.
		 */
		$context = ReferenceProjection::for_posts( array( $post ) );
		if ( $context->over_budget() ) {
			return NeutralResponse::unexpected_failure();
		}

		$dto = PublicProjector::project( $post, $context );
		if ( ! is_array( $dto ) ) {
			/*
			 * Unreachable after the resolution above (it re-evaluates the same
			 * live decision), but the controller never assumes: no verified
			 * projection means no disclosure, through the same neutral class.
			 */
			return NeutralResponse::not_found();
		}

		return self::public_ok( $dto );
	}

	/**
	 * Bounded listing: the eligible-only continuation envelope for one
	 * supported resource type.
	 *
	 * @param WP_REST_Request $request Request carrying type, perPage, order, cursor.
	 * @return WP_REST_Response
	 */
	public static function listing( $request ) {
		$order  = $request->get_param( 'order' ) ? (string) $request->get_param( 'order' ) : EligibleResourceQuery::ORDER_NEWEST;
		$cursor = $request->get_param( 'cursor' );
		$cursor = null === $cursor ? null : (string) $cursor;
		$type   = (string) $request->get_param( 'type' );

		/*
		 * Defense in depth behind the route argument validation: the same
		 * shared allowlists decide again, and any unsupported input — or a
		 * malformed, tampered, expired, version-mismatched, or
		 * type/order-mismatched cursor — shares the one bounded
		 * invalid-request class (T014; G02C-B04).
		 */
		$validated = EligibleResourceQuery::validate_params(
			array(
				'type'    => $type,
				'perPage' => $request->get_param( 'perPage' ),
				'order'   => $order,
				'cursor'  => $cursor,
			)
		);
		if ( is_wp_error( $validated )
			|| is_wp_error( EligibleResourceQuery::validate_cursor( $type, $order, $cursor ) ) ) {
			return NeutralResponse::invalid_request();
		}

		$result = EligibleResourceQuery::query(
			array(
				'type'    => $type,
				'perPage' => $request->get_param( 'perPage' ),
				'order'   => $order,
				'cursor'  => $cursor,
			)
		);
		if ( is_wp_error( $result ) ) {
			return NeutralResponse::invalid_request();
		}

		/*
		 * FR-031 response preflight: the COMBINED raw stored reference count
		 * of every Basic Page participating in this response is counted
		 * before any reference iteration or projection. A combined count
		 * above the server-owned budget fails the WHOLE listing through the
		 * bounded safe failure class — no earlier item is emitted as partial
		 * success, no partial envelope, no truncation, no count disclosure.
		 */
		$context = ReferenceProjection::for_posts(
			array_map(
				static function ( $unit ) {
					return $unit['post'];
				},
				$result['data']
			)
		);
		if ( $context->over_budget() ) {
			return NeutralResponse::unexpected_failure();
		}

		/*
		 * Every scanned record was accepted by the live decision inside the
		 * query; each is now projected by its explicit type projector, which
		 * re-evaluates the same decision. A projection that cannot be made is
		 * omitted entirely — never partially disclosed, never marked.
		 */
		$data = array();
		foreach ( $result['data'] as $unit ) {
			$dto = PublicProjector::project( $unit['post'], $context );
			if ( is_array( $dto ) ) {
				$data[] = $dto;
			}
		}

		/*
		 * The envelope is exactly the reconciled contract (G02C-B03): `data`
		 * and `hasMore` always, `nextCursor` as a string exactly when
		 * continuation is available, and no other key — no totals, no page
		 * counts, no echoed input.
		 */
		$envelope = array(
			'data'    => $data,
			'hasMore' => (bool) $result['hasMore'],
		);
		if ( array_key_exists( 'nextCursor', $result ) ) {
			$envelope['nextCursor'] = (string) $result['nextCursor'];
		}

		return self::public_ok( $envelope );
	}

	/**
	 * One public 200 response: the payload and the uniform safe transport
	 * headers. No public response of this foundation is cacheable — cache is
	 * never eligibility authority (FR-007; contracts/public-rest.md).
	 *
	 * @param mixed $payload Decoded public payload.
	 * @return WP_REST_Response
	 */
	private static function public_ok( $payload ) {
		$response = new WP_REST_Response( $payload, 200 );
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}
