<?php
/**
 * Response-scoped bounded Document Resource reference projection (Delivery
 * 002, G07-B01 / FR-031).
 *
 * One detail, listing, or Preview response owns ONE instance of this context.
 * It is the single place where a Basic Page's stored Document Resource
 * references become public output, and it enforces the reconciled reference
 * boundary end to end:
 *
 * - a hard server-owned budget of MAX_RAW_DOCUMENT_REFERENCES raw stored
 *   entries per response — per record and combined across every Basic Page
 *   participating in the response — checked BEFORE any reference iteration
 *   or normalization, so malformed, duplicate, or legacy entries cannot hide
 *   unbounded work;
 * - an over-budget record or response is REPORTED (whole-response bounded
 *   safe failure; never a partial body, truncation, count disclosure, or
 *   implied completeness) — this class never repairs stored data;
 * - resolution is set-based for the whole response: at most one set-based
 *   registry mapping query and one set-based referenced-post load, with
 *   request-local mapping/post/meta caches primed so per-reference
 *   processing performs no further database lookups;
 * - retrieval is retrieval only. It never reproduces or replaces
 *   eligibility semantics: every candidate is handed to the UNCHANGED
 *   current PublicEligibility decision (T013), which stays the sole
 *   authority for every emitted reference (FR-019);
 * - stored order and deduplication semantics are preserved for the
 *   references that are valid for projection.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-031;
 * reconciled plan.md, data-model.md, contracts/public-rest.md; quickstart
 * §3. This is a bounded projection primitive specific to the foundation —
 * not a generalized relationship, query, or cache subsystem — and it
 * registers no hook of its own.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Identity\RegistrySchema;
use WP_Post;

final class ReferenceProjection {

	/**
	 * Build the response-scoped context for the Basic Pages one response will
	 * project, and preflight their raw stored reference counts.
	 *
	 * Reads each page's stored reference meta once (request-local raw cache)
	 * and computes both the per-record and the combined raw counts before any
	 * iteration or normalization of entries happens anywhere.
	 *
	 * @param WP_Post[] $posts The Basic Pages participating in one response.
	 * @return self
	 */
	public static function for_posts( array $posts ) {
		$context             = new self();
		$context->raw_counts = array();
		$combined            = 0;

		foreach ( $posts as $post ) {
			$post = $post instanceof WP_Post ? $post : get_post( $post );
			if ( ! $post instanceof WP_Post || FoundationTypes::BASIC_PAGE !== $post->post_type ) {
				continue;
			}
			$stored = get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, true );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
			$context->raw[ (int) $post->ID ] = array_values( $stored );
			$count                           = count( $stored );
			$context->raw_counts[ (int) $post->ID ] = $count;
			$combined                       += $count;
		}

		$context->over_budget = $combined > FoundationTypes::MAX_RAW_DOCUMENT_REFERENCES;
		return $context;
	}

	/**
	 * Whether a single record's raw stored reference set is within the
	 * server-owned budget, without projecting anything.
	 *
	 * The bounded write/Preview preflight: it reads only the raw entry count,
	 * never an entry value, and reveals nothing beyond the boolean.
	 *
	 * @param WP_Post|int $post Basic Page post or ID.
	 * @return bool True when the raw stored count is within the budget.
	 */
	public static function record_within_budget( $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post );
		if ( ! $post instanceof WP_Post || FoundationTypes::BASIC_PAGE !== $post->post_type ) {
			return true;
		}
		$stored = get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, true );
		$count  = is_array( $stored ) ? count( $stored ) : 0;
		return $count <= FoundationTypes::MAX_RAW_DOCUMENT_REFERENCES;
	}

	/** @var array<int, array> Raw stored reference entries per Basic Page ID (request-local). */
	private $raw = array();

	/** @var array<int, int> Raw stored entry count per Basic Page ID. */
	private $raw_counts = array();

	/** @var bool Whether any participating record or the combined response exceeds the budget. */
	private $over_budget = false;

	/** @var bool|null Prepared-once marker for the response-wide resolution. */
	private $prepared = false;

	/** @var array<string, bool> Public ID => currently eligible, filled once per response. */
	private $eligible = array();

	/**
	 * Whether the preflight found over-budget raw reference work. The caller
	 * must fail the whole response through the bounded safe failure class and
	 * emit no partial body.
	 *
	 * @return bool
	 */
	public function over_budget() {
		return $this->over_budget;
	}

	/**
	 * The currently eligible Document Resource references of one
	 * participating Basic Page, in that page's stored order, deduplicated,
	 * as Public IDs only.
	 *
	 * Unknown, wrong-type, ineligible, withdrawn, and tombstoned references
	 * are omitted entirely — never marked, never counted — exactly as the
	 * single-record projector always has (FR-019): an eligible parent never
	 * elevates a reference, and a reference's omission discloses nothing.
	 *
	 * @param WP_Post|int $post Basic Page post or ID.
	 * @return string[] Public IDs of currently eligible Document Resources.
	 */
	public function eligible_references( $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post );
		if ( ! $post instanceof WP_Post ) {
			return array();
		}
		$page_id = (int) $post->ID;
		if ( ! isset( $this->raw_counts[ $page_id ] ) ) {
			/*
			 * The page was not part of this response's preflight: never
			 * project references that were not budgeted — no set-based
			 * resolution exists for them.
			 */
			return array();
		}

		$this->prepare_once();

		$eligible_in_order = array();
		foreach ( $this->raw[ $page_id ] as $public_id ) {
			$public_id = strtolower( trim( (string) $public_id ) );
			if ( '' === $public_id || isset( $eligible_in_order[ $public_id ] ) ) {
				continue;
			}
			if ( isset( $this->eligible[ $public_id ] ) && $this->eligible[ $public_id ] ) {
				$eligible_in_order[ $public_id ] = true;
			}
		}
		return array_keys( $eligible_in_order );
	}

	/**
	 * Resolve and evaluate every budgeted reference of the response exactly
	 * once, set-based, then cache the per-candidate eligibility outcomes
	 * request-locally.
	 *
	 * Query shape per response: ONE set-based registry mapping query
	 * (PublicIdRegistry::mappings_for), ONE set-based referenced-post load
	 * (_prime_post_caches over the referenced Document Resources plus the
	 * attachment posts their publication validity reads), and set-based meta
	 * priming. The UNCHANGED PublicEligibility decision then runs per
	 * candidate against primed caches — retrieval never decides anything.
	 *
	 * @return void
	 */
	private function prepare_once() {
		if ( $this->prepared ) {
			return;
		}
		$this->prepared = true;

		/*
		 * Over-budget raw state never iterates: no reference of an
		 * over-budget response is read, resolved, or evaluated here. The
		 * caller reports the whole-response bounded failure; this class
		 * never repairs, truncates, or partially projects stored data.
		 */
		if ( $this->over_budget ) {
			return;
		}

		/* The budgeted work list: stored order across the response, deduplicated, shape-validated. */
		$candidates = array();
		foreach ( $this->raw as $entries ) {
			foreach ( $entries as $public_id ) {
				$public_id = strtolower( trim( (string) $public_id ) );
				if ( '' === $public_id || isset( $candidates[ $public_id ] ) ) {
					continue;
				}
				if ( ! FoundationTypes::is_public_id_shape( $public_id ) ) {
					/* Stored but not a resolvable identifier: it stays a counted work unit and resolves to nothing. */
					continue;
				}
				$candidates[ $public_id ] = true;
			}
		}
		if ( array() === $candidates ) {
			return;
		}

		/* ONE set-based mapping query for the whole response. */
		$mappings = PublicIdRegistry::mappings_for( array_keys( $candidates ) );

		/*
		 * The response-local mapping cache: every candidate's row (or its
		 * known absence), from the query above. Primed for the evaluation
		 * bracket only, so the unchanged per-candidate decision — which
		 * re-verifies the live one-to-one identity itself — reads rows
		 * already resolved instead of issuing per-reference registry
		 * queries. The bracket ALWAYS ends with the response.
		 */
		$resolved = array();
		foreach ( array_keys( $candidates ) as $public_id ) {
			$resolved[ $public_id ] = isset( $mappings[ $public_id ] ) ? $mappings[ $public_id ] : false;
		}

		$post_ids = array();
		foreach ( $mappings as $public_id => $mapping ) {
			if ( ! PublicIdRegistry::is_live( $mapping ) ) {
				continue;
			}
			if ( FoundationTypes::RESOURCE_DOCUMENT_RESOURCE !== (string) $mapping->{RegistrySchema::COLUMN_RESOURCE_TYPE} ) {
				continue;
			}
			$post_ids[ (int) $mapping->{RegistrySchema::COLUMN_INTERNAL_POST_ID} ] = $public_id;
		}
		if ( array() === $post_ids ) {
			return;
		}

		/*
		 * Prime the referenced Document Resources' meta cache set-based
		 * first, so the attachment posts their publication validity reads are
		 * known before the ONE set-based post load below covers documents and
		 * attachments together.
		 */
		\update_meta_cache( 'post', array_keys( $post_ids ) );

		$attachment_ids = array();
		foreach ( array_keys( $post_ids ) as $document_id ) {
			$attachment_id = (string) get_post_meta( $document_id, FoundationTypes::META_BINARY_ATTACHMENT_ID, true );
			if ( 1 === preg_match( '/^[1-9][0-9]*$/', $attachment_id ) ) {
				$attachment_ids[ (int) $attachment_id ] = true;
			}
		}

		/* The ONE set-based referenced-post load of the response (documents plus their attachments). */
		_prime_post_caches( array_merge( array_keys( $post_ids ), array_keys( $attachment_ids ) ) );

		/*
		 * Evaluation: the UNCHANGED current decision per candidate, against
		 * primed caches. The type check is re-proven from the loaded post
		 * itself, never trusted from the registry row alone — identical to
		 * the single-record projector's contract.
		 */
		PublicIdRegistry::with_read_cache( $resolved, function () use ( $post_ids ) {
			foreach ( $post_ids as $document_id => $public_id ) {
				$referenced = get_post( $document_id );
				if ( ! $referenced instanceof WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $referenced->post_type ) {
					continue;
				}
				$this->eligible[ $public_id ] = PublicEligibility::is_eligible( $referenced );
			}
		} );
	}
}
