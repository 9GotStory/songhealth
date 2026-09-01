<?php
/**
 * Session-bound Preview binary delivery (Delivery 002, T044).
 *
 * The separate authenticated delivery surface for candidate Document
 * Resource bytes: it reuses the accepted Gate 04 Preview authorization
 * semantics — current staff session, supplemental origin/nonce defenses,
 * one verified single-purpose grant, and the fresh default-deny capability
 * decision — and applies them to the same validated protected attachment
 * relationship (T042) without consulting public eligibility at all
 * (FR-016, FR-017, FR-019; contracts/preview.md §Isolation;
 * contracts/protected-binary.md §Invariants).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-016–FR-019;
 * - specs/002-headless-wordpress-foundation/contracts/preview.md;
 * - specs/002-headless-wordpress-foundation/contracts/protected-binary.md;
 * - specs/002-headless-wordpress-foundation/research.md §8, §9;
 * - .specify/memory/constitution.md I, IV.
 *
 * Separation contract: anonymous binary eligibility is decided solely by the
 * owning Document Resource's own current `PublicEligibility` (T043); this
 * surface never consults it, never changes it, and is never reachable
 * anonymously. Preview state — a candidate Draft, a withdrawn record, a
 * hidden record — may be previewed here by an authorized staff member while
 * remaining neutral everywhere public. There is no second Preview
 * authentication system: the session, the grant, and the decision are all
 * the accepted Gate 04 mechanisms, re-used verbatim.
 *
 * Confidentiality contract: every answer carries the Preview posture —
 * `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`,
 * `nosniff` — success and denial alike, and every failure is the one neutral
 * class.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Binary;

use SonghealthCore\Authorization\AuthorizationService;
use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Preview\PreviewController;
use SonghealthCore\Preview\PreviewGrant;
use SonghealthCore\Rest\NeutralResponse;
use WP_REST_Request;
use WP_REST_Response;

final class PreviewBinaryController {

	/**
	 * The Preview binary retrieval handler (dispatched by the T016 route).
	 *
	 * The Gate order, re-used verbatim from the accepted Preview controller:
	 * staff session first, then the supplemental CSRF defenses, then the
	 * grant's full binding, then the live identity/accepted-resource
	 * prerequisite, then the fresh authorization decision — and only then the
	 * validated relationship and the bytes. The candidate state is delivered
	 * WITHOUT any eligibility requirement: that is the point of Preview.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function deliver( $request ) {
		if ( ! PreviewController::is_staff_session() ) {
			return self::denial();
		}
		if ( ! PreviewController::origin_allows( $request ) ) {
			return self::denial();
		}
		if ( ! PreviewController::nonce_if_present_verifies( $request ) ) {
			return self::denial();
		}

		$public_id = (string) $request->get_param( 'publicId' );
		if ( ! PublicIdRegistry::is_valid_public_id( $public_id ) ) {
			return self::denial();
		}

		$mapping = PublicIdRegistry::mapping_for( $public_id );
		if ( ! is_object( $mapping ) || ! PublicIdRegistry::is_live( $mapping ) ) {
			return self::denial();
		}
		if ( FoundationTypes::RESOURCE_DOCUMENT_RESOURCE !== (string) $mapping->resource_type ) {
			return self::denial();
		}

		$document = get_post( (int) $mapping->internal_post_id );
		if ( ! $document instanceof \WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $document->post_type ) {
			return self::denial();
		}
		if ( ! CreateTimePublicId::is_accepted( $document ) ) {
			return self::denial();
		}

		$user = wp_get_current_user();
		if ( ! PreviewGrant::verify(
			(string) $request->get_param( PreviewController::GRANT_PARAMETER ),
			array(
				'user_id'            => (int) $user->ID,
				'resource_type'      => FoundationTypes::RESOURCE_DOCUMENT_RESOURCE,
				'public_id'          => $public_id,
				'candidate_revision' => PreviewGrant::candidate_revision( $document ),
			)
		) ) {
			return self::denial();
		}

		/* The fresh decision, immediately before the bytes. */
		$decision = AuthorizationService::decide(
			array(
				'capability' => CapabilityMap::CAP_DOCUMENT_RESOURCE_VIEW,
				'module'     => FoundationTypes::RESOURCE_DOCUMENT_RESOURCE,
				'object_id'  => (int) $document->ID,
			)
		);
		if ( ! $decision->allowed() ) {
			return self::denial();
		}

		/* The candidate bytes still require the valid, safe relationship — never eligibility. */
		$delivery = ProtectedAttachment::delivery( $document );
		if ( null === $delivery ) {
			return self::denial();
		}

		$bytes = file_get_contents( $delivery['path'] ); // phpcs:ignore WordPress.PHP.DiscouragedFunctions.Discouraged -- bounded by the validated size below.
		if ( false === $bytes || strlen( $bytes ) !== (int) $delivery['size'] ) {
			return self::denial();
		}

		$response = new RawBinaryResponse( $bytes, 200 );
		$response->header( 'Content-Type', $delivery['mime'] );
		$response->header( 'Content-Disposition', 'attachment; filename="' . $delivery['filename'] . '"' );
		$response->header( 'Content-Length', (string) $delivery['size'] );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		$response->header( 'Cache-Control', 'private, no-store' );
		$response->header( 'X-Robots-Tag', 'noindex, nofollow' );
		return $response;
	}

	/**
	 * The neutral Preview binary denial with the Preview confidentiality
	 * posture — the accepted class, never a distinct binary failure shape.
	 *
	 * @return WP_REST_Response
	 */
	private static function denial() {
		return PreviewController::denial();
	}
}
