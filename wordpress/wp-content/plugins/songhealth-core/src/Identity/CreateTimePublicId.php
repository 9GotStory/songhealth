<?php
/**
 * Songhealth supported-resource creation service (Delivery 002, T012).
 *
 * The plugin-owned boundary through which — and only through which — a Basic
 * Page or Document Resource record comes into existence as an accepted
 * Songhealth resource. The service creates the record, establishes its
 * immutable Public ID, verifies the one-to-one registry mapping, and only
 * then reports success. Raw `wp_insert_post()` success is an internal
 * outcome with no Product meaning, and no WordPress insertion callback or
 * its ordering participates in the acceptance decision.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-004, FR-005, FR-007
 *   (Session 2026-08-29 T012-B01 design boundary clarification);
 * - specs/002-headless-wordpress-foundation/research.md §4;
 * - specs/002-headless-wordpress-foundation/data-model.md §Identity
 *   distinction, §Shared Songhealth Resource policy, §State transitions;
 * - specs/002-headless-wordpress-foundation/tasks.md T012;
 * - specs/002-headless-wordpress-foundation/quickstart.md §2;
 * - docs/website-modernization-docs/current/03-sitemap.md §§15.4, 17.22;
 * - docs/website-modernization-docs/current/10-system-blueprint.md §123;
 * - .specify/memory/constitution.md I, II, V.
 *
 * Acceptance contract (FR-004): `create()` returns success only after the
 * immutable UUIDv7 identity is established and the one-to-one registry
 * mapping is verified in both directions. Every actual issuance or
 * verification failure returns a bounded `WP_Error` — never a successful
 * numeric resource result. Success carries the post ID and its Public ID.
 *
 * Atomicity contract (research.md §4): creation prefers a verified safe
 * bounded transaction. `START TRANSACTION` wraps the record insert, the
 * identity insert, and the verification read-back, so a failure rolls both
 * rows away atomically with no reliance on callback ordering. Readiness
 * (registry schema, UUIDv7 source, registry writability) is proven before
 * the transaction opens, so no DDL can implicitly commit it. Where the
 * transaction cannot deliver — an implicitly ended transaction, a failed
 * COMMIT, a non-transactional edge — the service falls back to fail-return
 * plus verified compensation: the candidate row is force-deleted and the
 * deletion verified. A row whose compensation cannot complete is retained
 * only as a quarantined, unaccepted internal candidate, and quarantine is
 * a verified state, never an assumption: any live mapping the candidate
 * already established — including one durable before a post-commit failure
 * — is transitioned to the existing retained non-live/tombstoned state
 * through the unchanged T011 contract, preserving the mapping row, the
 * issued Public ID, and the resource key (immutable, occupied,
 * non-reassignable, non-recyclable), and the transition is re-verified
 * from persisted state together with `is_accepted() === false`. When that
 * verification cannot be made, the service reports the distinct fail-closed
 * blocker `quarantine_unverified` instead of claiming a safe quarantine,
 * and only bounded non-sensitive evidence records each event.
 * The object cache is deliberately flushed after any rollback or
 * compensation check, because `get_post()` would otherwise serve the
 * pre-rollback cached row and misreport a rolled-back candidate as absent
 * from the database.
 *
 * Containment contract (FR-005): direct creation of the two supported
 * types outside this service is refused before any database write, through
 * the `wp_insert_post_empty_content` filter (post.php:4695) — the only
 * plugin-reachable pre-insert refusal. Containment is a boundary guard,
 * not the success mechanism: even a row that bypassed it would remain an
 * unaccepted internal candidate, because acceptance is decided only by
 * this service's verification. Containment is deliberately scoped to
 * first creation of supported types: updates of already identified
 * resources (an existing ID), their autosaves and revisions (post type
 * `revision`), and every unsupported post type pass through untouched, so
 * ordinary WordPress update/autosave/revision behavior is preserved. The
 * service authenticates its own creation with a per-call random marker in
 * `$postarr`; the marker is ignored by Core's column list, never reaches
 * the database, and cannot be reused by another caller.
 *
 * Identity contract (FR-004, FR-005; Frozen Sitemap §17.22): identity is
 * established once, at first accepted creation, including Draft and
 * auto-draft; it is never caller-selected, never written again by any
 * update path, never reassigned or recycled; hard deletion tombstones the
 * retained registry mapping via the `deleted_post` action — a lifecycle
 * bookkeeping hook that carries no acceptance meaning. A valid, live
 * mapping is the first prerequisite of any later eligibility, REST,
 * Preview, protected-binary, or canonical behavior.
 *
 * This module defines the service and containment declarations only.
 * Calling `register()` on the plugin lifecycle is T019's wiring decision,
 * matching the module convention established by T006–T010: loading this
 * file adds no WordPress hook of its own.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Identity;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Identity\RegistrySchema;
use WP_Error;
use WP_Post;

final class CreateTimePublicId {

	/**
	 * Bounded compensation evidence: a counter and the UTC timestamp of the
	 * most recent verified compensation. The only recorded values;
	 * deliberately not autoloaded and deliberately free of post IDs,
	 * titles, identifiers, users, content, and database error text
	 * (FR-022, Constitution IV).
	 */
	const COMPENSATION_OPTION = 'songhealth_core_identity_compensations';

	/**
	 * Bounded quarantine evidence: a counter and the UTC timestamp of the
	 * most recent candidate that could not be compensated and therefore
	 * remains an unaccepted internal row. Same non-disclosure bounds as
	 * the compensation evidence.
	 */
	const QUARANTINE_OPTION = 'songhealth_core_identity_quarantined';

	/**
	 * Bounded fail-closed blocker evidence: a counter and the UTC timestamp
	 * of the most recent surviving candidate whose non-accepted transition
	 * could NOT be verified — reported as `quarantine_unverified`, never as
	 * a safely quarantined outcome. Same non-disclosure bounds.
	 */
	const QUARANTINE_BLOCKER_OPTION = 'songhealth_core_identity_quarantine_blockers';

	/**
	 * Private `$postarr` key carrying the per-call service marker. Core's
	 * insert builds its column list from known post fields only, so the
	 * marker never reaches the database; it exists only so the containment
	 * filter can recognize this service's own creation.
	 */
	const SERVICE_MARKER = '_songhealth_service_creation';

	/** The marker value of the creation currently in flight, or null. */
	private static $active_marker = null;

	/**
	 * Attach the boundary guards to the WordPress lifecycle.
	 *
	 * Called by the plugin lifecycle wiring (T019). Loading this module
	 * alone attaches nothing.
	 *
	 * @return void
	 */
	public static function register() {
		add_filter( 'wp_insert_post_empty_content', array( __CLASS__, 'contain_direct_creation' ), 10, 2 );
		add_action( 'deleted_post', array( __CLASS__, 'on_deleted_post' ), 10, 2 );
	}

	/**
	 * Create a Basic Page or Document Resource as an accepted Songhealth
	 * resource.
	 *
	 * The only accepted creation path (FR-004). Sequence: prove issuance
	 * readiness before any write; open a bounded transaction; insert the
	 * record through Core; establish the immutable UUIDv7 identity; verify
	 * the one-to-one mapping in both directions; commit; confirm durability
	 * after commit. Any failure at any point aborts the creation — rolled
	 * back, or compensated with verified deletion, or quarantined — and
	 * returns a bounded failure.
	 *
	 * Failure codes, all value-free: `invalid_request`, `update_not_supported`
	 * (updates of accepted resources use ordinary WordPress paths and never
	 * pass through this service), `unsupported_type`, `issuance_unavailable`
	 * (registry or randomness not ready — nothing was written),
	 * `insert_failed`, `issuance_failed`, `mapping_verification_failed`,
	 * `commit_failed`, and the abort outcomes `creation_rolled_back`,
	 * `creation_compensated`, `creation_quarantined` (reported only when the
	 * surviving candidate is verified non-live and unaccepted from persisted
	 * state, including transitioning any already-durable live mapping to the
	 * retained tombstoned state), and `quarantine_unverified` — the distinct
	 * fail-closed blocker reported when a surviving candidate's non-accepted
	 * transition cannot be verified.
	 *
	 * @param array $postarr Post data for the new supported-type record.
	 * @return array|WP_Error Success: array( 'post_id', 'public_id', 'resource_type' ). Failure: WP_Error.
	 */
	public static function create( $postarr ) {
		if ( ! is_array( $postarr ) ) {
			return new WP_Error( 'invalid_request' );
		}
		if ( ! empty( $postarr['ID'] ) ) {
			return new WP_Error( 'update_not_supported' );
		}
		$post_type = isset( $postarr['post_type'] ) ? (string) $postarr['post_type'] : '';
		$resource_type = FoundationTypes::resource_type_for( $post_type );
		if ( null === $resource_type ) {
			return new WP_Error( 'unsupported_type' );
		}

		if ( ! self::issuance_ready() ) {
			return new WP_Error( 'issuance_unavailable' );
		}

		/*
		 * Mark this as the service's own creation. The random marker is
		 * ignored by Core's column list, never persisted, and is the only
		 * thing the containment filter accepts as a pass-through. Page
		 * templates are not part of either foundation type's schema, and
		 * stripping the key keeps Core's only after-write error path
		 * (invalid_page_template) out of the transaction.
		 */
		unset( $postarr[ self::SERVICE_MARKER ], $postarr['page_template'] );
		try {
			$marker = bin2hex( random_bytes( 16 ) );
		} catch ( \Exception $exception ) {
			return new WP_Error( 'issuance_unavailable' );
		}
		$postarr[ self::SERVICE_MARKER ] = $marker;
		self::$active_marker            = $marker;

		$transaction = self::begin_transaction();

		$inserted = wp_insert_post( $postarr, true );
		if ( is_wp_error( $inserted ) || ! is_int( $inserted ) || $inserted <= 0 ) {
			/*
			 * Core's remaining failure returns happen before the row is
			 * written, so nothing durable exists: roll the empty
			 * transaction back and fail the service.
			 */
			return self::abort_creation( 0, $transaction, 'insert_failed' );
		}
		$post_id = $inserted;

		$public_id = PublicIdRegistry::assign( $resource_type, $post_id );
		if ( null === $public_id ) {
			return self::abort_creation( $post_id, $transaction, 'issuance_failed' );
		}

		if ( ! self::verify_one_to_one( $resource_type, $post_id, $public_id ) ) {
			return self::abort_creation( $post_id, $transaction, 'mapping_verification_failed' );
		}

		if ( $transaction && ! self::commit_transaction() ) {
			return self::abort_creation( $post_id, false, 'commit_failed' );
		}

		/*
		 * Durability check after commit: the accepted record and its
		 * verified mapping must both be readable from the database, not
		 * merely from the object cache.
		 */
		clean_post_cache( $post_id );
		if ( null === get_post( $post_id ) || ! self::verify_one_to_one( $resource_type, $post_id, $public_id ) ) {
			return self::abort_creation( $post_id, false, 'commit_failed' );
		}

		self::$active_marker = null;
		return array(
			'post_id'       => $post_id,
			'public_id'     => $public_id,
			'resource_type' => $resource_type,
		);
	}

	/**
	 * Whether a post is an accepted Songhealth resource: a supported type
	 * with an established, live, one-to-one Public ID mapping. A raw or
	 * quarantined internal row — including one that bypassed containment —
	 * has no mapping and is therefore never accepted, never eligible, and
	 * never reportable as a Songhealth resource.
	 *
	 * @param int|WP_Post|null $post Post ID or object.
	 * @return bool
	 */
	public static function is_accepted( $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post );
		if ( ! $post instanceof WP_Post ) {
			return false;
		}
		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		if ( null === $resource_type ) {
			return false;
		}
		$public_id = PublicIdRegistry::public_id_for( $resource_type, (int) $post->ID );
		if ( null === $public_id ) {
			return false;
		}
		return self::verify_one_to_one( $resource_type, (int) $post->ID, $public_id );
	}

	/**
	 * Containment: refuse direct creation of a supported type outside this
	 * service, before any database write (post.php:4695).
	 *
	 * Scoped by construction: an existing ID (an update of an already
	 * identified resource), a revision post type (autosaves and revisions),
	 * and every unsupported post type pass through untouched, so legitimate
	 * ordinary WordPress update/autosave/revision behavior is never
	 * disrupted. The service's own in-flight creation, authenticated by
	 * its per-call marker, passes. Everything else that would create a
	 * supported-type record directly returns true, which makes
	 * `wp_insert_post()` return its contract failure (`0`, or
	 * `WP_Error('empty_content')`) without writing anything.
	 *
	 * @param bool  $maybe_empty Whether Core considers the post content empty.
	 * @param array $postarr     Sanitized post data being inserted.
	 * @return bool True refuses the direct creation; anything else passes through.
	 */
	public static function contain_direct_creation( $maybe_empty, $postarr ) {
		if ( ! empty( $postarr['ID'] ) ) {
			return $maybe_empty;
		}
		$post_type = isset( $postarr['post_type'] ) ? (string) $postarr['post_type'] : '';
		if ( null === FoundationTypes::resource_type_for( $post_type ) ) {
			return $maybe_empty;
		}
		if ( self::is_service_creation( $postarr ) ) {
			return $maybe_empty;
		}
		return true;
	}

	/**
	 * The deletion boundary: tombstone the retained mapping of a deleted
	 * accepted resource. The registry row is never removed and the issued
	 * identifier is never freed (Frozen Sitemap §17.22); non-foundation
	 * post types have no mapping and change nothing. Lifecycle bookkeeping
	 * only — this hook never carries acceptance meaning.
	 *
	 * @param int     $post_id Deleted post ID.
	 * @param WP_Post $post    Deleted post.
	 * @return void
	 */
	public static function on_deleted_post( $post_id, $post ) {
		$post = $post instanceof WP_Post ? $post : get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return;
		}

		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		if ( null === $resource_type ) {
			return;
		}

		PublicIdRegistry::mark_deleted( $resource_type, (int) $post->ID );
	}

	/**
	 * Verify the one-to-one mapping in both directions: the Public ID
	 * resolves to exactly this resource as a live mapping, and the resource
	 * resolves to exactly this Public ID.
	 *
	 * @param string $resource_type Public Songhealth resource type.
	 * @param int    $post_id       Internal post ID.
	 * @param string $public_id     Issued Public ID.
	 * @return bool
	 */
	private static function verify_one_to_one( $resource_type, $post_id, $public_id ) {
		$row = PublicIdRegistry::mapping_for( $public_id );
		if ( ! is_object( $row ) ) {
			return false;
		}
		if ( $row->resource_type !== $resource_type || (int) $row->internal_post_id !== $post_id ) {
			return false;
		}
		if ( ! PublicIdRegistry::is_live( $row ) ) {
			return false;
		}
		return PublicIdRegistry::public_id_for( $resource_type, $post_id ) === $public_id;
	}

	/**
	 * Abort a failed creation and return its bounded outcome.
	 *
	 * Order of operations: roll the transaction back (removing the record
	 * and the mapping atomically where the transaction held), flush the
	 * object cache so the absence check reads the database rather than a
	 * stale cache entry, verify the record is gone, and — only if a row
	 * survived — compensate with a verified force-delete. A row that
	 * survives compensation is quarantined, and quarantine is only ever
	 * REPORTED as such when it is verified: any live mapping the candidate
	 * already holds is first transitioned to the existing retained
	 * non-live/tombstoned state (T011 `mark_deleted`, which preserves the
	 * mapping row, the issued Public ID, and the resource key), and the
	 * transition is then re-verified from persisted state — same Public ID,
	 * same resource key, non-live, and `is_accepted()` false. A surviving
	 * candidate whose non-accepted transition cannot be verified is
	 * reported accurately as the distinct fail-closed blocker outcome
	 * `quarantine_unverified`, never as safely quarantined.
	 *
	 * @param int    $post_id     Candidate post ID (0 when the insert never returned one).
	 * @param bool   $transaction Whether a transaction opened for this creation.
	 * @param string $code        Bounded failure code for the originating failure.
	 * @return WP_Error
	 */
	private static function abort_creation( $post_id, $transaction, $code ) {
		self::$active_marker = null;

		if ( $transaction ) {
			self::rollback_transaction();
		}

		$outcome = $code;
		if ( $post_id > 0 ) {
			clean_post_cache( $post_id );
			$post = get_post( $post_id );
			if ( ! $post instanceof WP_Post ) {
				$outcome = 'creation_rolled_back';
			} else {
				$resource_type = FoundationTypes::resource_type_for( $post->post_type );

				wp_delete_post( $post_id, true );
				clean_post_cache( $post_id );

				if ( null === get_post( $post_id ) ) {
					/*
					 * Compensation verified: the candidate is gone. Retire
					 * any mapping it had already established so nothing
					 * live remains for a resource that no longer exists;
					 * an unverifiable retirement is reported as the same
					 * fail-closed blocker, not as a clean compensation.
					 */
					if ( null === $resource_type || self::verified_unaccepted( $resource_type, $post_id ) ) {
						self::record_evidence( self::COMPENSATION_OPTION );
						$outcome = 'creation_compensated';
					} else {
						self::record_evidence( self::QUARANTINE_BLOCKER_OPTION );
						$outcome = 'quarantine_unverified';
					}
				} elseif ( null !== $resource_type && self::verified_unaccepted( $resource_type, $post_id ) ) {
					/* Surviving row verified non-live and unaccepted. */
					self::record_evidence( self::QUARANTINE_OPTION );
					$outcome = 'creation_quarantined';
				} else {
					/*
					 * The row survives and cannot be proven unaccepted —
					 * fail closed and say exactly that. Its mapping (if
					 * any) keeps its database-enforced uniqueness, so the
					 * identifier remains occupied and non-reassignable
					 * even though safe quarantine could not be verified.
					 */
					self::record_evidence( self::QUARANTINE_BLOCKER_OPTION );
					$outcome = 'quarantine_unverified';
				}
			}
		}

		return new WP_Error( $outcome );
	}

	/**
	 * Transition a candidate's live mapping — if it has one — to the
	 * existing retained non-live/tombstoned state, and verify the outcome
	 * from persisted state: the mapping row is retained with the same
	 * Public ID and the same resource key (still immutable, occupied,
	 * non-reassignable, and non-recyclable, T010/T011 contract), it is no
	 * longer live, and the candidate is not accepted.
	 *
	 * True means verified non-live and unaccepted. False means the
	 * transition could not be performed or proven — the caller must
	 * report the fail-closed blocker outcome, never a safe quarantine.
	 *
	 * @param string $resource_type Public Songhealth resource type.
	 * @param int    $post_id       Candidate post ID.
	 * @return bool
	 */
	private static function verified_unaccepted( $resource_type, $post_id ) {
		$public_id = PublicIdRegistry::public_id_for( $resource_type, $post_id );

		if ( null !== $public_id ) {
			if ( false === PublicIdRegistry::mark_deleted( $resource_type, $post_id ) ) {
				return false;
			}
			$row = PublicIdRegistry::mapping_for( $public_id );
			if ( ! is_object( $row ) ) {
				return false;
			}
			if ( $row->{RegistrySchema::COLUMN_PUBLIC_ID} !== $public_id
				|| $row->{RegistrySchema::COLUMN_RESOURCE_TYPE} !== $resource_type
				|| (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} !== $post_id ) {
				return false;
			}
			if ( PublicIdRegistry::is_live( $row ) ) {
				return false;
			}
			if ( PublicIdRegistry::public_id_for( $resource_type, $post_id ) !== $public_id ) {
				return false;
			}
		}

		return ! self::is_accepted( $post_id );
	}

	/**
	 * Whether issuance is ready for a creation about to happen: the
	 * registry schema is in place (created now if absent and creatable),
	 * the UUIDv7 source produces an identifier, and the registry accepts
	 * the mapping write. Established before the transaction opens so that
	 * no schema creation can implicitly commit it. A false here fails the
	 * service before anything is written.
	 *
	 * @return bool
	 */
	private static function issuance_ready() {
		if ( ! RegistrySchema::exists() ) {
			RegistrySchema::create();
		}
		if ( ! RegistrySchema::exists() ) {
			return false;
		}
		if ( null === PublicIdRegistry::generate_uuidv7() ) {
			return false;
		}
		return self::registry_write_ready();
	}

	/**
	 * Prove the mapping write is possible without writing anything: a
	 * zero-row INSERT … SELECT with the exact column list of the real
	 * mapping insert. Statement parsing resolves the column list and checks
	 * the write privilege before the optimizer produces zero rows, so a
	 * registry that is structurally broken or refuses writes fails here.
	 * `WHERE 1 = 0` guarantees no row is ever produced in any SQL mode.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	private static function registry_write_ready() {
		global $wpdb;

		$probe = $wpdb->query(
			$wpdb->prepare(
				'INSERT INTO ' . RegistrySchema::table_name() . ' ( ' .
					RegistrySchema::COLUMN_PUBLIC_ID . ', ' .
					RegistrySchema::COLUMN_RESOURCE_TYPE . ', ' .
					RegistrySchema::COLUMN_INTERNAL_POST_ID . ', ' .
					RegistrySchema::COLUMN_CREATED_AT .
					' ) SELECT %s, %s, %d, %s FROM DUAL WHERE 1 = 0',
				'issuance-readiness',
				'issuance-readiness',
				0,
				'1970-01-01 00:00:00'
			)
		);
		return false !== $probe;
	}

	/**
	 * Whether a `$postarr` carries the marker of the creation currently in
	 * flight. Compared in constant time so the marker cannot be probed.
	 *
	 * @param array $postarr Post data being inserted.
	 * @return bool
	 */
	private static function is_service_creation( $postarr ) {
		$marker = isset( $postarr[ self::SERVICE_MARKER ] ) ? (string) $postarr[ self::SERVICE_MARKER ] : '';
		if ( '' === $marker || null === self::$active_marker ) {
			return false;
		}
		return hash_equals( self::$active_marker, $marker );
	}

	/**
	 * Open the bounded creation transaction.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	private static function begin_transaction() {
		global $wpdb;
		return false !== $wpdb->query( 'START TRANSACTION' );
	}

	/**
	 * Commit the creation transaction and report whether the commit held.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	private static function commit_transaction() {
		global $wpdb;
		return false !== $wpdb->query( 'COMMIT' );
	}

	/**
	 * Roll the creation transaction back. Best effort: whether the rows are
	 * actually gone is verified afterwards, never assumed.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return void
	 */
	private static function rollback_transaction() {
		global $wpdb;
		$wpdb->query( 'ROLLBACK' );
	}

	/**
	 * Record one bounded evidence event — a counter and the UTC timestamp,
	 * nothing else (FR-022; Constitution IV).
	 *
	 * @param string $option Evidence option name.
	 * @return void
	 */
	private static function record_evidence( $option ) {
		$evidence = get_option( $option, array() );
		$count    = is_array( $evidence ) && isset( $evidence['count'] ) ? (int) $evidence['count'] : 0;

		update_option(
			$option,
			array(
				'count'   => $count + 1,
				'last_at' => current_time( 'mysql', true ),
			),
			false
		);
	}
}
