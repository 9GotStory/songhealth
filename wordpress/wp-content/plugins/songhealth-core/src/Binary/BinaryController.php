<?php
/**
 * Anonymous protected binary delivery (Delivery 002, T043).
 *
 * The mediated delivery boundary for Document Resource bytes: anonymous
 * delivery by Songhealth Public ID only, with the owning Document
 * Resource's CURRENT public eligibility re-decided on every request, the
 * protected attachment relationship and safe delivery metadata validated
 * before any byte moves, bounded range/size/abuse behavior, conservative
 * caching, and neutral denial (FR-018–FR-020;
 * contracts/protected-binary.md §Decision order; SC-004).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-018–FR-020;
 * - specs/002-headless-wordpress-foundation/contracts/protected-binary.md;
 * - specs/002-headless-wordpress-foundation/data-model.md §Document Resource
 *   Foundation Record;
 * - .specify/memory/constitution.md I, IV.
 *
 * Decision order (contracts/protected-binary.md): validate the Public ID
 * syntax; resolve exactly one accepted Document Resource by its immutable
 * ID; evaluate that record's OWN current eligibility through the shared
 * decision (T013) — never a reference, never prior state, never cache; only
 * then validate the one-to-one relationship and the safe delivery metadata
 * (T042); and only then stream. Unknown, ineligible, broken-relationship,
 * and unsafe-metadata conditions all fail closed as the one neutral class,
 * disclosing no existence, lifecycle, storage, or authorization fact.
 *
 * Never trusted: attachment existence, raw Media Library accessibility, a
 * previous successful delivery, a public Basic Page reference, frontend
 * concealment, or stale cache state. `Cache-Control: private, no-store`
 * keeps every delivery answer unshared and uncached, so the next request is
 * always re-decided from live state.
 *
 * Transport contract: byte responses are served raw through the
 * `rest_pre_serve_request` seam (the platform's own mechanism for non-JSON
 * REST bodies), carrying the validated content type, a safe attachment
 * disposition whose filename derives from the document's presentation
 * title, anti-sniffing, and exact lengths. Range behavior is bounded: one
 * satisfiable range serves the exact slice; an unsatisfiable start is
 * refused with no bytes; malformed, suffix, and multi-range requests degrade
 * to the bounded full response.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Binary;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\NeutralResponse;
use WP_REST_Request;
use WP_REST_Response;

final class BinaryController {

	/** The confidentiality posture of every delivery answer. */
	const CACHE_CONTROL = 'private, no-store';

	/**
	 * Attach the raw-byte serving seam to the REST lifecycle.
	 *
	 * @return void
	 */
	public static function register() {
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'serve_raw_bytes' ), 10, 3 );
	}

	/**
	 * Serve one protected binary response as raw bytes.
	 *
	 * @param bool               $served  Whether the request is already served.
	 * @param WP_REST_Response   $result  The dispatched response.
	 * @param WP_REST_Request    $request The request.
	 * @return bool True when this response was served here.
	 */
	public static function serve_raw_bytes( $served, $result, $request ) {
		if ( true === $served || ! $result instanceof RawBinaryResponse ) {
			return $served;
		}

		status_header( $result->get_status() );
		foreach ( $result->get_headers() as $name => $value ) {
			if ( is_string( $value ) ) {
				header( $name . ': ' . $value, true );
			}
		}
		echo $result->get_data(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- validated binary bytes with a safe content type and disposition.
		return true;
	}

	/**
	 * The anonymous delivery handler (dispatched by the T016 route).
	 *
	 * Every failure is the accepted neutral class (T014) — identical status,
	 * body, and transport headers — so no outside observer can tell an
	 * unknown record from an ineligible, broken, or unsafe one.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function deliver( $request ) {
		$public_id = (string) $request->get_param( 'publicId' );
		if ( ! PublicIdRegistry::is_valid_public_id( $public_id ) ) {
			return NeutralResponse::not_found();
		}

		$mapping = PublicIdRegistry::mapping_for( $public_id );
		if ( ! is_object( $mapping ) || ! PublicIdRegistry::is_live( $mapping ) ) {
			return NeutralResponse::not_found();
		}
		if ( FoundationTypes::RESOURCE_DOCUMENT_RESOURCE !== (string) $mapping->resource_type ) {
			return NeutralResponse::not_found();
		}

		$document = get_post( (int) $mapping->internal_post_id );
		if ( ! $document instanceof \WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $document->post_type ) {
			return NeutralResponse::not_found();
		}
		if ( ! CreateTimePublicId::is_accepted( $document ) ) {
			return NeutralResponse::not_found();
		}

		/* The owning Document Resource's own current eligibility — re-decided live on every request. */
		if ( ! PublicEligibility::is_eligible( $document ) ) {
			return NeutralResponse::not_found();
		}

		/* Only now the relationship and the safe delivery metadata. */
		$delivery = ProtectedAttachment::delivery( $document );
		if ( null === $delivery ) {
			return NeutralResponse::not_found();
		}

		return self::stream( $delivery, (string) $request->get_header( 'Range' ) );
	}

	/**
	 * Build the bounded byte response for validated delivery metadata.
	 *
	 * @param array  $delivery The validated delivery facts (path, mime, size, filename).
	 * @param string $range    The raw Range header value, if any.
	 * @return WP_REST_Response
	 */
	private static function stream( array $delivery, $range ) {
		$bytes = file_get_contents( $delivery['path'] ); // phpcs:ignore WordPress.PHP.DiscouragedFunctions.Discouraged -- bounded by the validated size below.
		if ( false === $bytes || strlen( $bytes ) !== (int) $delivery['size'] ) {
			return NeutralResponse::unexpected_failure(); /* The file changed under validation: no bytes move. */
		}

		$headers = array(
			'Content-Type'              => $delivery['mime'],
			'Content-Disposition'       => 'attachment; filename="' . $delivery['filename'] . '"',
			'X-Content-Type-Options'    => 'nosniff',
			'Cache-Control'             => self::CACHE_CONTROL,
			'Accept-Ranges'             => 'bytes',
		);

		$parsed = self::parse_single_range( $range, (int) $delivery['size'] );
		if ( 'invalid' === $parsed['kind'] ) {
			/* Unsatisfiable start: refuse without any bytes (no partial leak). */
			$response = new RawBinaryResponse( '', 416 );
			$response->header( 'Content-Range', 'bytes */' . (string) $delivery['size'] );
			$response->header( 'X-Content-Type-Options', 'nosniff' );
			$response->header( 'Cache-Control', self::CACHE_CONTROL );
			return $response;
		}
		if ( 'partial' === $parsed['kind'] ) {
			$slice = substr( $bytes, $parsed['start'], $parsed['length'] );
			$response = new RawBinaryResponse( $slice, 206 );
			foreach ( $headers as $name => $value ) {
				$response->header( $name, $value );
			}
			$response->header( 'Content-Range', 'bytes ' . $parsed['start'] . '-' . ( $parsed['start'] + $parsed['length'] - 1 ) . '/' . (string) $delivery['size'] );
			$response->header( 'Content-Length', (string) $parsed['length'] );
			return $response;
		}

		$response = new RawBinaryResponse( $bytes, 200 );
		foreach ( $headers as $name => $value ) {
			$response->header( $name, $value );
		}
		$response->header( 'Content-Length', (string) $delivery['size'] );
		return $response;
	}

	/**
	 * Parse one Range header against a known size, bounded.
	 *
	 * Only a single satisfiable `bytes=start-end` (or open-ended) range is
	 * honored; malformed values, suffix ranges, and multi-range requests
	 * degrade to the full response, and a start beyond the last byte is
	 * unsatisfiable.
	 *
	 * @param string $range The raw Range header.
	 * @param int    $size  The validated byte size.
	 * @return array{kind: 'full'|'partial'|'invalid', start: int, length: int}
	 */
	private static function parse_single_range( $range, $size ) {
		$range = trim( (string) $range );
		if ( '' === $range || 1 !== preg_match( '/^bytes=([0-9]+)-([0-9]*)$/', $range, $matches ) ) {
			return array( 'kind' => 'full', 'start' => 0, 'length' => $size );
		}

		$start = (int) $matches[1];
		if ( $start >= $size ) {
			return array( 'kind' => 'invalid', 'start' => $start, 'length' => 0 );
		}

		/*
		 * Every numerical invariant is established BEFORE any partial shape is
		 * returned (G05-B01): an explicit end below the start — reversed
		 * adjacent (`bytes=10-9`) or clearly reversed (`bytes=10-5`) — is not
		 * a satisfiable range at all; it joins the existing bounded malformed
		 * class (full response), never a partial response with a negative
		 * length, an invalid Content-Range, a negative Content-Length, or
		 * unintended bytes. The end is clipped to the last valid byte only
		 * after the ordering invariant holds, so the constructed length is
		 * always at least 1.
		 */
		$end = '' === $matches[2] ? $size - 1 : (int) $matches[2];
		if ( $end < $start ) {
			return array( 'kind' => 'full', 'start' => 0, 'length' => $size );
		}
		$end = min( $end, $size - 1 );

		$length = $end - $start + 1;
		if ( $length < 1 || $start + $length > $size ) {
			return array( 'kind' => 'full', 'start' => 0, 'length' => $size ); // Unreachable guard: never construct an invalid partial.
		}

		return array(
			'kind'   => 'partial',
			'start'  => $start,
			'length' => $length,
		);
	}
}

/**
 * A raw binary REST response.
 *
 * Marks byte responses for the `rest_pre_serve_request` serving seam; without
 * it the platform would JSON-encode the bytes.
 */
final class RawBinaryResponse extends WP_REST_Response {

	/**
	 * Constructor.
	 *
	 * @param string $bytes   The validated byte string.
	 * @param int    $status  The HTTP status.
	 */
	public function __construct( $bytes, $status ) {
		parent::__construct( $bytes, $status );
	}
}
