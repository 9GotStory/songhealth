<?php
/**
 * Shared current public-eligibility decision (Delivery 002, T013).
 *
 * The one server-authoritative decision of whether a Basic Page or Document
 * Resource record may be disclosed anonymously right now. Every anonymous
 * disclosure path — REST detail, bounded listing, projection, reference
 * retention — asks this module again at disclosure time; no projection, list,
 * reference, cache, slug, identifier, or byte count ever confers eligibility
 * (FR-007).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-006–FR-008, FR-012,
 *   FR-019, FR-020;
 * - specs/002-headless-wordpress-foundation/data-model.md §Shared Songhealth
 *   Resource policy (`eligible = supported type + valid live identity +
 *   currently public lifecycle + public visibility + not withdrawn +
 *   type-specific publication validity`), §Public Eligibility Decision;
 * - specs/002-headless-wordpress-foundation/research.md §5;
 * - .specify/memory/constitution.md I, IV.
 *
 * Decision order (data-model.md): a supported type is checked first; a valid,
 * LIVE one-to-one Public ID mapping is the first prerequisite after it — a
 * raw-inserted or quarantined identityless row is an internal candidate and is
 * never eligible through any later behavior; then the current public
 * lifecycle, the public visibility input, the withdrawal input, and finally
 * the type-specific publication validity. Every input is read live at decision
 * time; nothing is cached and no caller can pass a decision forward as
 * authority.
 *
 * Lifecycle and withdrawal: the WordPress status is an internal primitive
 * the Songhealth lifecycle maps onto (data-model.md §Shared Songhealth
 * Resource policy). For the PUBLIC question this decision answers, exactly
 * one status is currently public — `publish`. The T009 authorization
 * vocabulary additionally treats scheduled (`future`) work as
 * published-level for STAFF actions, which is a different question: a
 * scheduled record is not publicly disclosable before its time, so the
 * public mapping here does not inherit that equivalence, and withdrawal
 * overrides the mapped state either way.
 *
 * Nondisclosure contract (FR-008, FR-020): the decision's reason category is
 * internal evidence for operators and authorization code only. Public
 * behavior NEVER reflects it: unknown, malformed, ineligible, and withdrawn
 * are indistinguishable from outside through the neutral response class
 * (T014), and no reason, count, or hint derived from these decisions reaches
 * a public interface.
 *
 * This module is a pure decision primitive; it registers no hook of its own
 * (wiring is T019).
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Eligibility;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use WP_Post;

final class PublicEligibility {

	/* Bounded reason categories. Internal only — never disclosed publicly. */
	const REASON_ELIGIBLE            = 'eligible';
	const REASON_ABSENT              = 'record_absent';
	const REASON_TYPE_UNSUPPORTED    = 'type_unsupported';
	const REASON_IDENTITY_NOT_LIVE   = 'identity_not_live';
	const REASON_LIFECYCLE_NOT_PUBLIC = 'lifecycle_not_public';
	const REASON_VISIBILITY_NOT_PUBLIC = 'visibility_not_public';
	const REASON_WITHDRAWN           = 'withdrawn';
	const REASON_TYPE_VALIDITY       = 'type_publication_validity';

	/**
	 * The shared current public-eligibility decision for one record.
	 *
	 * Everything is re-read from the live post at call time: identity
	 * (registry), lifecycle (post status + withdrawal), visibility, and the
	 * type-specific publication rule. The result is a decision value object,
	 * never a bare boolean, so internal callers can use the bounded reason
	 * without any public surface ever seeing it.
	 *
	 * @param WP_Post|int|null $post Post object or ID to evaluate.
	 * @return PublicEligibilityDecision
	 */
	public static function decide( $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post );
		if ( ! $post instanceof WP_Post ) {
			return new PublicEligibilityDecision( false, self::REASON_ABSENT );
		}

		if ( ! FoundationTypes::is_supported_type( $post->post_type ) ) {
			return new PublicEligibilityDecision( false, self::REASON_TYPE_UNSUPPORTED );
		}

		/*
		 * First prerequisite (FR-007): a valid, live, one-to-one Public ID
		 * mapping established through the Songhealth supported-resource
		 * creation service. `is_accepted()` verifies the mapping live in both
		 * directions; a raw Core insert, a quarantined candidate, or a
		 * tombstoned mapping fails here and is never eligible.
		 */
		if ( ! CreateTimePublicId::is_accepted( $post ) ) {
			return new PublicEligibilityDecision( false, self::REASON_IDENTITY_NOT_LIVE );
		}

		if ( ! self::lifecycle_is_currently_public( $post ) ) {
			return new PublicEligibilityDecision( false, self::REASON_LIFECYCLE_NOT_PUBLIC );
		}

		if ( ! self::visibility_is_public( $post ) ) {
			return new PublicEligibilityDecision( false, self::REASON_VISIBILITY_NOT_PUBLIC );
		}

		if ( self::is_withdrawn( $post ) ) {
			return new PublicEligibilityDecision( false, self::REASON_WITHDRAWN );
		}

		if ( ! self::type_publication_validity( $post ) ) {
			return new PublicEligibilityDecision( false, self::REASON_TYPE_VALIDITY );
		}

		return new PublicEligibilityDecision( true, self::REASON_ELIGIBLE );
	}

	/**
	 * Whether a record is currently public-eligible.
	 *
	 * @param WP_Post|int|null $post Post object or ID to evaluate.
	 * @return bool
	 */
	public static function is_eligible( $post ) {
		return self::decide( $post )->is_eligible();
	}

	/**
	 * The currently-public lifecycle question (FR-007): the `publish` state is
	 * the only currently public one. Draft, pending, auto-draft, scheduled
	 * (`future`), private, trashed, and any unknown status are not currently
	 * public — fail closed. Withdrawal is a separate decision input below.
	 *
	 * @param WP_Post $post Post to evaluate.
	 * @return bool
	 */
	private static function lifecycle_is_currently_public( WP_Post $post ) {
		return 'publish' === $post->post_status;
	}

	/**
	 * The visibility input: only a declared public value — or the schema's
	 * public default for an unset key — is public. `hidden`, `internal`, and
	 * any value that bypassed the schema sanitizer fail closed.
	 *
	 * @param WP_Post $post Post to evaluate.
	 * @return bool
	 */
	private static function visibility_is_public( WP_Post $post ) {
		$stored = (string) get_post_meta( (int) $post->ID, FoundationTypes::META_VISIBILITY, true );
		if ( '' === $stored ) {
			return true; // Schema default (FoundationTypes::sanitize_visibility).
		}
		return FoundationTypes::VISIBILITY_PUBLIC === $stored;
	}

	/**
	 * The withdrawal input: an explicitly set truthy flag withdraws the
	 * record from public eligibility regardless of its mapped lifecycle.
	 *
	 * @param WP_Post $post Post to evaluate.
	 * @return bool
	 */
	private static function is_withdrawn( WP_Post $post ) {
		$stored = (string) get_post_meta( (int) $post->ID, FoundationTypes::META_WITHDRAWN, true );
		return '1' === $stored || 'true' === strtolower( $stored );
	}

	/**
	 * Type-specific publication validity (data-model.md §§Basic Page /
	 * Document Resource Foundation Record).
	 *
	 * - Basic Page: a title is required to publish (a candidate title is
	 *   allowed only while non-public).
	 * - Document Resource: the internal binary attachment reference is
	 *   required before publication and must resolve to an existing
	 *   attachment. Attachment SAFETY (one-to-one relationship, safe
	 *   metadata, protected storage) is owned by the protected-attachment
	 *   module (T042); this is the publication-validity prerequisite only.
	 *
	 * @param WP_Post $post Post to evaluate.
	 * @return bool
	 */
	private static function type_publication_validity( WP_Post $post ) {
		if ( FoundationTypes::BASIC_PAGE === $post->post_type ) {
			return '' !== trim( (string) $post->post_title );
		}

		/*
		 * A Document Resource is publication-valid only with a valid, safe,
		 * present one-to-one protected attachment relationship (T042). This
		 * stays the eligibility AUTHORITY's single delegation for the
		 * type-specific rule — the validator answers only the relationship
		 * question and never confers eligibility by itself.
		 */
		return \SonghealthCore\Binary\ProtectedAttachment::relationship_is_valid( $post );
	}
}

/**
 * A single public-eligibility decision.
 *
 * Carries only the boolean outcome and a bounded internal reason category, in
 * the shape of the accepted T009 AuthorizationDecision. It never carries the
 * record, its identifiers, content, or state, and its reason is internal
 * evidence only — no public response may ever reflect it (FR-008, FR-020).
 */
final class PublicEligibilityDecision {

	/** @var bool */
	private $eligible;

	/** @var string */
	private $reason;

	/**
	 * Constructor.
	 *
	 * @param bool   $eligible Whether the record is currently public-eligible.
	 * @param string $reason   Bounded internal reason category.
	 */
	public function __construct( $eligible, $reason ) {
		$this->eligible = (bool) $eligible;
		$this->reason   = (string) $reason;
	}

	/**
	 * Whether the record may be disclosed anonymously right now.
	 *
	 * @return bool
	 */
	public function is_eligible() {
		return $this->eligible;
	}

	/**
	 * The bounded internal reason category. Internal evidence for operators
	 * and authorization code; never part of any public response.
	 *
	 * @return string
	 */
	public function reason() {
		return $this->reason;
	}
}
