<?php
/**
 * Neutral public responses (Delivery 002, T014).
 *
 * The only approved shape for public denial, invalid-input, and
 * unexpected-failure responses on the Songhealth public contract. Every body
 * is a fixed allowlisted constant: a stable Songhealth code, one bounded
 * message, and the status. Nothing echoes the request — no identifier, path,
 * query, parameter name, slug, lifecycle state, existence fact, user, or
 * protected content ever appears (FR-008, FR-012, FR-020).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-008, FR-012, FR-020;
 * - specs/002-headless-wordpress-foundation/contracts/public-rest.md
 *   §Projection, references, errors, transport;
 * - specs/002-headless-wordpress-foundation/research.md §5;
 * - .specify/memory/constitution.md I, IV.
 *
 * Neutrality contract: the same neutral class serves unknown, malformed,
 * ineligible, withdrawn, and not-yet-implemented cases alike — no outside
 * observer can distinguish which one applied, so no existence or lifecycle
 * fact is disclosed through variation in status, code, message, headers, or
 * timing of these responses.
 *
 * Transport contract: every response this class produces is JSON with
 * `Cache-Control: no-store`, so a denial or failure can never be cached into
 * a stale eligibility decision. Cache is never eligibility authority
 * (FR-007).
 *
 * Correlation codes: the stable code IS the safe category required by the
 * contract; a random per-request correlation identifier is deliberately not
 * invented here, because nothing in this Delivery records one for an operator
 * to correlate against (Constitution II — no ceremonial output).
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use WP_REST_Response;

final class NeutralResponse {

	/** Neutral not-found class: unknown, malformed, and ineligible alike. */
	const CODE_NOT_FOUND = 'songhealth_not_found';

	/** Bounded invalid-input class for the supported request parameters. */
	const CODE_INVALID_REQUEST = 'songhealth_invalid_request';

	/** Generic unexpected-failure class; carries no cause detail. */
	const CODE_UNAVAILABLE = 'songhealth_unavailable';

	/**
	 * Neutral public denial: the bounded 404 class shared by unknown,
	 * malformed, ineligible, withdrawn, and absent records (FR-012).
	 *
	 * @return WP_REST_Response
	 */
	public static function not_found() {
		return self::response(
			self::CODE_NOT_FOUND,
			'Not found.',
			404
		);
	}

	/**
	 * Bounded invalid-input response. The message names no parameter and
	 * echoes nothing from the request; only the fact that a supported input
	 * was outside its allowlist is reported (contracts/public-rest.md).
	 *
	 * @return WP_REST_Response
	 */
	public static function invalid_request() {
		return self::response(
			self::CODE_INVALID_REQUEST,
			'Invalid request.',
			400
		);
	}

	/**
	 * Generic unexpected-failure response. Carries no cause, no stack, no
	 * query, no path, and no protected detail — only the safe category and
	 * status (FR-020).
	 *
	 * @return WP_REST_Response
	 */
	public static function unexpected_failure() {
		return self::response(
			self::CODE_UNAVAILABLE,
			'Unavailable.',
			500
		);
	}

	/**
	 * Build one neutral response: fixed allowlisted body, status, and the
	 * uniform transport headers.
	 *
	 * @param string $code    Stable Songhealth category code.
	 * @param string $message Fixed bounded message.
	 * @param int    $status  HTTP status.
	 * @return WP_REST_Response
	 */
	private static function response( $code, $message, $status ) {
		$response = new WP_REST_Response(
			array(
				'code'    => $code,
				'message' => $message,
				'data'    => array(
					'status' => $status,
				),
			),
			$status
		);
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}
