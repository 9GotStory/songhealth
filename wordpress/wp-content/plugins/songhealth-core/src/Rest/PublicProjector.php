<?php
/**
 * Explicit public projectors (Delivery 002, T015).
 *
 * The only approved way a Basic Page or Document Resource becomes a public
 * representation. Each supported type has one explicit projector that builds
 * a Songhealth DTO field by field from an allowlist; default serialization is
 * forbidden, so a WP_Post — with its WordPress ID, status, author, metadata,
 * and raw media identity — can never leak into a public response (FR-006).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-006–FR-008, FR-011,
 *   FR-019;
 * - specs/002-headless-wordpress-foundation/contracts/public-rest.md
 *   §Detail, §Canonical behavior, §Projection, references, errors, transport;
 * - specs/002-headless-wordpress-foundation/data-model.md §Public Projection,
 *   §Basic Page Foundation Record, §Document Resource Foundation Record;
 * - specs/002-headless-wordpress-foundation/research.md §5;
 * - .specify/memory/constitution.md IV.
 *
 * Eligibility contract (FR-007): the projector is NOT an authority and never
 * confers eligibility — it re-evaluates the shared current decision
 * (T013) at projection time and returns null for anything not currently
 * eligible. A projection, a reference, a slug, or an identifier never
 * elevates a record.
 *
 * Reference contract (FR-019): a Basic Page's Document Resource references
 * are retained only when each referenced Document Resource passes its OWN
 * current eligibility decision. An eligible parent can never elevate an
 * ineligible reference; ineligible references are omitted entirely rather
 * than marked, so their existence is not disclosed either.
 *
 * Identity contract: the public identity is the immutable Public ID; the
 * WordPress post ID, post status, author user, meta rows, attachment ID,
 * filename, and any Media Library path or URL never appear. The canonical
 * path is the validated relative React route, with the display slug as
 * optional readability metadata only (FR-011).
 *
 * This module is a pure projection primitive; it registers no hook of its
 * own (wiring is T019).
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\PublicIdRegistry;
use WP_Post;

final class PublicProjector {

	/** Canonical React public routes (FR-011; contracts/public-rest.md). */
	const CANONICAL_BASE_BASIC_PAGE        = '/pages';
	const CANONICAL_BASE_DOCUMENT_RESOURCE = '/documents';

	/** The mediated Document Resource binary route (contracts/protected-binary.md). */
	const DOWNLOAD_PATH_FORMAT = '/wp-json/songhealth/v1/documents/%s/binary';

	/**
	 * Project one record into its explicit public DTO.
	 *
	 * The shared current eligibility decision (T013) is re-evaluated here; a
	 * record that is not currently eligible has no public projection at all
	 * and returns null — the caller then applies the neutral response class
	 * (T014), indistinguishable from an unknown record.
	 *
	 * @param WP_Post|int|null $post Post object or ID to project.
	 * @return array|null The allowlisted DTO, or null when not currently eligible.
	 */
	public static function project( $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post );
		if ( ! $post instanceof WP_Post ) {
			return null;
		}
		if ( ! FoundationTypes::is_supported_type( $post->post_type ) ) {
			return null;
		}
		if ( ! PublicEligibility::is_eligible( $post ) ) {
			return null;
		}

		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		$public_id     = PublicIdRegistry::public_id_for( $resource_type, (int) $post->ID );
		if ( null === $public_id ) {
			/*
			 * Unreachable after the eligibility decision (a live mapping is
			 * its first prerequisite), but the projector never assumes: no
			 * verified identity means no projection.
			 */
			return null;
		}

		$dto = array(
			'type'         => $resource_type,
			'publicId'     => $public_id,
			'title'        => (string) $post->post_title,
			'canonicalPath' => self::canonical_path( $resource_type, $public_id, $post->post_name ),
		);

		$summary = self::summary( $post );
		if ( '' !== $summary ) {
			$dto['summary'] = $summary;
		}

		if ( FoundationTypes::BASIC_PAGE === $post->post_type ) {
			$dto['body'] = self::body( $post );

			$references = self::eligible_document_references( $post );
			if ( array() !== $references ) {
				$dto['documentReferences'] = $references;
			}
			return $dto;
		}

		$document_date = self::document_date( $post );
		if ( '' !== $document_date ) {
			$dto['documentDate'] = $document_date;
		}

		$dto['downloadPath'] = sprintf( self::DOWNLOAD_PATH_FORMAT, $public_id );
		return $dto;
	}

	/**
	 * The validated relative canonical React path for a resource: identity is
	 * the Public ID; the display slug is optional readability metadata and is
	 * omitted unless it is a safe single path segment (FR-011).
	 *
	 * @param string $resource_type Public Songhealth resource type.
	 * @param string $public_id     Immutable Public ID.
	 * @param string $display_slug  Optional display slug (WordPress post name).
	 * @return string
	 */
	public static function canonical_path( $resource_type, $public_id, $display_slug = '' ) {
		$base = FoundationTypes::RESOURCE_DOCUMENT_RESOURCE === $resource_type
			? self::CANONICAL_BASE_DOCUMENT_RESOURCE
			: self::CANONICAL_BASE_BASIC_PAGE;

		$path = $base . '/' . rawurlencode( $public_id );

		$slug = self::safe_slug( $display_slug );
		if ( '' !== $slug ) {
			$path .= '/' . $slug;
		}
		return $path;
	}

	/**
	 * A display slug safe for a canonical path segment: the WordPress
	 * sanitize_title shape, or empty. Anything else is omitted, because the
	 * slug is optional metadata and is never identity.
	 *
	 * @param string $display_slug Raw display slug.
	 * @return string
	 */
	private static function safe_slug( $display_slug ) {
		$slug = trim( (string) $display_slug );
		if ( '' === $slug ) {
			return '';
		}
		if ( 1 !== preg_match( '/^[a-z0-9-]+$/', $slug ) ) {
			return '';
		}
		return $slug;
	}

	/**
	 * The optional summary: plain text, projected only when present.
	 *
	 * @param WP_Post $post Post to project.
	 * @return string
	 */
	private static function summary( WP_Post $post ) {
		return trim( (string) get_post_meta( (int) $post->ID, FoundationTypes::META_SUMMARY, true ) );
	}

	/**
	 * The controlled Basic Page body. The eligible record's own content,
	 * reduced to the safe WordPress post markup vocabulary; presentation and
	 * any further control belong to the React renderer, never to this DTO.
	 *
	 * @param WP_Post $post Post to project.
	 * @return string
	 */
	private static function body( WP_Post $post ) {
		return wp_kses_post( (string) $post->post_content );
	}

	/**
	 * The optional Document Resource document date: its own date, distinct
	 * from any publication date, projected only when it holds the schema's
	 * ISO calendar-date shape.
	 *
	 * @param WP_Post $post Post to project.
	 * @return string
	 */
	private static function document_date( WP_Post $post ) {
		$stored = trim( (string) get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_DATE, true ) );
		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $stored ) ) {
			return '';
		}
		return $stored;
	}

	/**
	 * The currently eligible Document Resource references of a Basic Page, in
	 * their stored order, as Public IDs only.
	 *
	 * Every reference is re-resolved through the identity registry and must
	 * pass its OWN current eligibility decision (FR-019). An ineligible or
	 * unknown reference is omitted entirely — never marked, never counted —
	 * so the projection neither elevates it nor discloses its existence.
	 *
	 * @param WP_Post $post Basic Page post.
	 * @return string[] Public IDs of currently eligible Document Resources.
	 */
	private static function eligible_document_references( WP_Post $post ) {
		$stored = get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, true );
		if ( ! is_array( $stored ) ) {
			return array();
		}

		$eligible = array();
		foreach ( $stored as $public_id ) {
			$public_id = strtolower( trim( (string) $public_id ) );
			if ( '' === $public_id ) {
				continue;
			}

			$mapping = PublicIdRegistry::mapping_for( $public_id );
			if ( ! is_object( $mapping ) || ! PublicIdRegistry::is_live( $mapping ) ) {
				continue;
			}
			if ( FoundationTypes::RESOURCE_DOCUMENT_RESOURCE !== (string) $mapping->resource_type ) {
				continue;
			}

			$referenced = get_post( (int) $mapping->internal_post_id );
			if ( ! $referenced instanceof WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $referenced->post_type ) {
				continue;
			}
			if ( ! PublicEligibility::is_eligible( $referenced ) ) {
				continue;
			}

			$eligible[] = $public_id;
		}
		return $eligible;
	}
}
