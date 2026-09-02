<?php
/**
 * Songhealth Public ID registry (Delivery 002, T011).
 *
 * The single owner of public identity for Basic Page and Document Resource
 * records. It generates canonical UUIDv7 identifiers, validates their syntax,
 * resolves mappings in both directions, and inserts mappings collision-safely
 * — and it offers no operation that could reassign, recycle, or mutate one.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-004, FR-005, FR-006,
 *   FR-007, FR-008, FR-011;
 * - specs/002-headless-wordpress-foundation/research.md §4;
 * - specs/002-headless-wordpress-foundation/data-model.md §Identity
 *   distinction, §Shared Songhealth Resource policy;
 * - docs/website-modernization-docs/current/03-sitemap.md §§15.4, 17.22;
 * - docs/website-modernization-docs/current/10-system-blueprint.md §§123,
 *   677–678.
 *
 * Identity contract (FR-004, FR-005; §123): the Public ID is a canonical
 * UUIDv7 string — time-ordered, globally unique, and independent of title,
 * slug, filename, internal database ID, and native CMS identifier. Once
 * issued it is immutable and is never reassigned or recycled, whatever
 * happens to its resource.
 *
 * Immutability and non-reassignment are structural, not conventional:
 *
 * - `assign()` is the only issuance path, takes no caller-supplied
 *   identifier, and refuses a resource that already holds a mapping — live
 *   or tombstoned — so no second ID can ever be issued and no caller can
 *   select one;
 * - no method updates or deletes a mapping; there is no code path that
 *   writes `public_id`, `resource_type`, or `internal_post_id` after insert;
 * - deletion only tombstones: `mark_deleted()` sets `deleted_at` on the
 *   retained row, so the issued identifier and the resource key stay
 *   occupied forever (Frozen Sitemap §17.22);
 * - the two database unique keys (T010) enforce the same guarantees against
 *   races and any other writer.
 *
 * Fail-closed contract (research.md §4; §677): every failure — malformed
 * input, missing schema, database error, collision exhaustion — returns a
 * null/absent result, never a guessed identifier and never a fallback
 * identity. Malformed identifiers are rejected by syntax validation before
 * any query is issued, so they never become broad persistence lookups. A
 * public_id collision is the one retryable case: UUIDv7 collision odds are
 * negligible, but the database still arbitrates, and a fresh UUIDv7 is
 * generated per attempt up to a hard bound before failing closed.
 *
 * Tombstone and lookup contract (data-model.md; FR-008): lookups return the
 * mapping row including its tombstone state. A tombstoned or absent mapping
 * is the caller's neutral-denial signal; the registry itself never decides
 * public eligibility (that is T013) and never distinguishes the two cases to
 * any caller that would disclose which one applied.
 *
 * This module defines the registry operations only. Issuing at the creation
 * boundary and tombstoning at the deletion boundary are T012; lifecycle
 * wiring is T019.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Identity;

use SonghealthCore\Content\FoundationTypes;

final class PublicIdRegistry {

	/**
	 * Canonical UUIDv7 pattern: lowercase hex in the 8-4-4-4-12 hyphenated
	 * form. Version and variant nibbles are checked separately so the pattern
	 * stays readable.
	 */
	const CANONICAL_UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/';

	/** Hard bound on insert attempts per assign() call, collision or not. */
	const MAX_INSERT_ATTEMPTS = 5;

	/**
	 * Generate a canonical UUIDv7 identifier (RFC 9562).
	 *
	 * Layout: 48-bit Unix millisecond timestamp, version nibble 7, 12 random
	 * bits, RFC 4122 variant bits `10`, and 62 more random bits — 74 random
	 * bits in total. Time-ordering comes from the timestamp; uniqueness comes
	 * from the random bits plus the database unique key (T010). Returns the
	 * lowercase hyphenated 36-character canonical string, or null when the
	 * operating system randomness source or the clock fails — generation
	 * failure must never produce a fallback identifier.
	 *
	 * @return string|null
	 */
	public static function generate_uuidv7() {
		try {
			$bytes = random_bytes( 16 );
		} catch ( \Exception $exception ) {
			return null;
		}

		$milliseconds = (int) floor( microtime( true ) * 1000 );
		if ( $milliseconds <= 0 || $milliseconds > 0xffffffffffff ) {
			return null;
		}

		/*
		 * Force the RFC 9562 version (0111) and variant (10xx) fields into
		 * the random bytes, then overwrite the first six bytes with the
		 * timestamp. Every other bit keeps its random value.
		 */
		$bytes[6] = chr( ( 0x7 << 4 ) | ( ord( $bytes[6] ) & 0x0f ) );
		$bytes[8] = chr( 0x80 | ( ord( $bytes[8] ) & 0x3f ) );
		$hex      = bin2hex( $bytes );

		$time_hex = str_pad( dechex( $milliseconds ), 12, '0', STR_PAD_LEFT );
		$hex      = $time_hex . substr( $hex, 12 );

		return substr( $hex, 0, 8 ) . '-' . substr( $hex, 8, 4 ) . '-' . substr( $hex, 12, 4 ) . '-' . substr( $hex, 16, 4 ) . '-' . substr( $hex, 20, 12 );
	}

	/**
	 * Whether a value is a canonical Songhealth Public ID: a UUIDv7 in the
	 * lowercase hyphenated form with version 7 and the RFC 4122 variant.
	 *
	 * Deliberately strict — uppercase, braced, URN, whitespace-padded, or
	 * otherwise non-canonical representations are rejected rather than
	 * normalized, so exactly one representation of an identifier exists and a
	 * malformed value never reaches a database lookup (§677). Version 1–6
	 * and non-RFC-4122-variant UUIDs are rejected: they are well-formed UUIDs
	 * but not Songhealth Public IDs.
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	public static function is_valid_public_id( $value ) {
		if ( ! is_string( $value ) ) {
			return false;
		}
		if ( 1 !== preg_match( self::CANONICAL_UUID_PATTERN, $value ) ) {
			return false;
		}
		if ( '7' !== $value[14] ) {
			return false;
		}
		return in_array( $value[19], array( '8', '9', 'a', 'b' ), true );
	}

	/**
	 * Issue the immutable Public ID for a newly created supported resource.
	 *
	 * The only issuance path. The identifier is always generated here — there
	 * is no parameter for supplying one — and the mapping is inserted with
	 * both database unique keys arbitrating (T010). Outcomes:
	 *
	 * - string: the mapping was inserted; the resource's permanent identity;
	 * - null: fail closed. The resource already holds a mapping (live or
	 *   tombstoned — never reissued, never reassigned), the resource type or
	 *   post ID is not a supported identity, the registry schema is
	 *   unavailable, or the database refused the insert and no collision
	 *   retry could recover it.
	 *
	 * @param string $resource_type    Public Songhealth resource type.
	 * @param int    $internal_post_id Internal WordPress post ID.
	 * @return string|null
	 */
	public static function assign( $resource_type, $internal_post_id ) {
		if ( null === FoundationTypes::post_type_for( (string) $resource_type ) ) {
			return null;
		}
		$internal_post_id = (int) $internal_post_id;
		if ( $internal_post_id <= 0 ) {
			return null;
		}
		if ( ! self::ensure_schema() ) {
			return null;
		}

		if ( null !== self::row_for_resource( $resource_type, $internal_post_id ) ) {
			return null;
		}

		for ( $attempt = 1; $attempt <= self::MAX_INSERT_ATTEMPTS; $attempt++ ) {
			$public_id = self::generate_uuidv7();
			if ( null === $public_id ) {
				return null;
			}

			$inserted = self::insert_mapping( $resource_type, $internal_post_id, $public_id );
			if ( true === $inserted ) {
				return $public_id;
			}
			if ( self::is_public_id_collision() ) {
				continue;
			}
			return null;
		}
		return null;
	}

	/**
	 * The Public ID currently mapped to a supported resource, or null.
	 *
	 * Returns the identifier even when the mapping is tombstoned: the
	 * mapping is the retained historical record, and whether a tombstoned
	 * identity may be disclosed is a caller decision, not a registry one.
	 *
	 * @param string $resource_type    Public Songhealth resource type.
	 * @param int    $internal_post_id Internal WordPress post ID.
	 * @return string|null
	 */
	public static function public_id_for( $resource_type, $internal_post_id ) {
		$row = self::row_for_resource( $resource_type, $internal_post_id );
		if ( null === $row ) {
			return null;
		}
		return (string) $row->{RegistrySchema::COLUMN_PUBLIC_ID};
	}

	/**
	 * The registry mapping row for a Public ID, or null.
	 *
	 * The identifier is syntax-validated first, so a malformed value never
	 * reaches the database (§677); resolution is by Public ID alone — the
	 * requested slug never participates in identity lookup (§678). The row
	 * carries the tombstone column; an absent row and a tombstoned row are
	 * both simply "no live mapping", and which one applies is not
	 * distinguishable through this method's return shape.
	 *
	 * @param mixed $public_id Public ID to resolve.
	 * @return object|null
	 */
	/**
	 * Resolve many Public IDs to their registry mapping rows in ONE set-based
	 * query (FR-031 reference-projection retrieval).
	 *
	 * Retrieval only: rows are returned exactly as stored — live and
	 * tombstoned alike, every resource type alike — with no eligibility or
	 * liveness decision of any kind; the caller decides. Identifiers are
	 * syntax-validated first so a malformed value never reaches the database,
	 * and duplicate input identifiers collapse to one row. The result maps
	 * each found Public ID to its row; absent identifiers simply have no
	 * entry.
	 *
	 * @param string[] $public_ids Public IDs to resolve.
	 * @return object[] Public ID => mapping row, for the identifiers found.
	 */
	public static function mappings_for( array $public_ids ) {
		$ids = array();
		foreach ( $public_ids as $public_id ) {
			$public_id = strtolower( trim( (string) $public_id ) );
			if ( '' === $public_id || isset( $ids[ $public_id ] ) || ! self::is_valid_public_id( $public_id ) ) {
				continue;
			}
			$ids[ $public_id ] = true;
		}
		if ( array() === $ids || ! self::ensure_schema() ) {
			return array();
		}

		global $wpdb;
		$table         = RegistrySchema::table_name();
		$keys          = array_keys( $ids );
		$placeholders  = implode( ',', array_fill( 0, count( $keys ), '%s' ) );
		$rows          = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . $table . ' WHERE ' . RegistrySchema::COLUMN_PUBLIC_ID . ' IN (' . $placeholders . ')',
				$keys
			)
		);
		$by_public_id = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( is_object( $row ) && isset( $row->{RegistrySchema::COLUMN_PUBLIC_ID} ) ) {
				$by_public_id[ (string) $row->{RegistrySchema::COLUMN_PUBLIC_ID} ] = $row;
			}
		}
		return $by_public_id;
	}

	/**
	 * The registry mapping row for a Public ID, or null.
	 *
	 * @param mixed $public_id Public ID to resolve.
	 * @return object|null
	 */
	/**
	 * Run one bounded read phase against a request-local mapping cache
	 * (FR-031).
	 *
	 * The cache holds ONLY rows already resolved by the caller's ONE
	 * set-based query (and explicit absences), is consulted by
	 * `mapping_for()`/`public_id_for()` while the bracket is active, and is
	 * ALWAYS removed when the bracket ends — so it never outlives the
	 * response-scoped projection that primed it and can never serve another
	 * request or test. Within the bracket no registry write happens (the
	 * phase is pure evaluation), so a cached row cannot go stale; every
	 * decision — liveness, type, eligibility — is still made by the
	 * unchanged consumers from the row exactly as the database returned it.
	 *
	 * @param array<string, object|false> $rows_by_public_id Public ID => mapping row, or false for known-absent.
	 * @param callable                    $work              The read phase to run.
	 * @return mixed Whatever $work returns.
	 */
	public static function with_read_cache( array $rows_by_public_id, $work ) {
		$by_public_id = array();
		$by_resource  = array();
		foreach ( $rows_by_public_id as $public_id => $row ) {
			$public_id = strtolower( trim( (string) $public_id ) );
			if ( '' === $public_id ) {
				continue;
			}
			$by_public_id[ $public_id ] = $row;
			if ( is_object( $row )
				&& isset( $row->{RegistrySchema::COLUMN_RESOURCE_TYPE}, $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} ) ) {
				$by_resource[ $row->{RegistrySchema::COLUMN_RESOURCE_TYPE} . '|' . (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} ] = $row;
			}
		}

		$previous_by_public_id = self::$read_cache_by_public_id;
		$previous_by_resource  = self::$read_cache_by_resource;
		self::$read_cache_by_public_id = $by_public_id;
		self::$read_cache_by_resource  = $by_resource;

		try {
			return $work();
		} finally {
			self::$read_cache_by_public_id = $previous_by_public_id;
			self::$read_cache_by_resource  = $previous_by_resource;
		}
	}

	/** @var array<string, object|false>|null Active request-local rows by Public ID, or null when inactive. */
	private static $read_cache_by_public_id = null;

	/** @var array<string, object>|null Active request-local rows by resource key, or null when inactive. */
	private static $read_cache_by_resource = null;

	/**
	 * The registry mapping row for a Public ID, or null.
	 *
	 * @param mixed $public_id Public ID to resolve.
	 * @return object|null
	 */
	public static function mapping_for( $public_id ) {
		if ( ! self::is_valid_public_id( $public_id ) ) {
			return null;
		}
		if ( is_array( self::$read_cache_by_public_id ) && array_key_exists( strtolower( (string) $public_id ), self::$read_cache_by_public_id ) ) {
			$cached = self::$read_cache_by_public_id[ strtolower( (string) $public_id ) ];
			return is_object( $cached ) ? $cached : null;
		}
		if ( ! self::ensure_schema() ) {
			return null;
		}

		global $wpdb;
		$table = RegistrySchema::table_name();
		return $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . $table . ' WHERE ' . RegistrySchema::COLUMN_PUBLIC_ID . ' = %s',
				(string) $public_id
			)
		);
	}

	/**
	 * Whether a mapping row refers to a resource that still exists — its
	 * tombstone column is unset. A tombstoned row is retained history: the
	 * identifier stays occupied and non-reusable, but it no longer points at
	 * a live resource.
	 *
	 * @param object $row Registry mapping row.
	 * @return bool
	 */
	public static function is_live( $row ) {
		if ( ! is_object( $row ) ) {
			return false;
		}
		$deleted_at = $row->{RegistrySchema::COLUMN_DELETED_AT} ?? null;
		return null === $deleted_at || '' === $deleted_at;
	}

	/**
	 * Tombstone a mapping: record that its resource was deleted, and retain
	 * the row. This is the only write to a mapping after issuance, it can
	 * never free an identifier or a resource key, and it touches nothing else
	 * — the Public ID, resource type, and internal post ID stay exactly as
	 * issued. Idempotent and safe for absent mappings: an already-tombstoned
	 * or never-issued mapping is already in the intended end state, so the
	 * result is still success.
	 *
	 * Fail-closed: false only when the query itself failed.
	 *
	 * @param string $resource_type    Public Songhealth resource type.
	 * @param int    $internal_post_id Internal WordPress post ID.
	 * @return bool
	 */
	public static function mark_deleted( $resource_type, $internal_post_id ) {
		if ( null === FoundationTypes::post_type_for( (string) $resource_type ) ) {
			return false;
		}
		$internal_post_id = (int) $internal_post_id;
		if ( $internal_post_id <= 0 ) {
			return false;
		}
		if ( ! self::ensure_schema() ) {
			return false;
		}

		global $wpdb;
		$table = RegistrySchema::table_name();
		$updated = $wpdb->query(
			$wpdb->prepare(
				'UPDATE ' . $table . ' SET ' . RegistrySchema::COLUMN_DELETED_AT . ' = %s WHERE ' .
					RegistrySchema::COLUMN_RESOURCE_TYPE . ' = %s AND ' . RegistrySchema::COLUMN_INTERNAL_POST_ID . ' = %d AND ' .
					RegistrySchema::COLUMN_DELETED_AT . ' IS NULL',
				current_time( 'mysql', true ),
				$resource_type,
				$internal_post_id
			)
		);
		return false !== $updated;
	}

	/**
	 * Insert one mapping row. Returns true on success, false otherwise; the
	 * duplicate-key classification is read separately via
	 * `is_public_id_collision()` so the caller decides whether a retry is
	 * legal.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @param string $resource_type    Public Songhealth resource type.
	 * @param int    $internal_post_id Internal WordPress post ID.
	 * @param string $public_id        Generated canonical Public ID.
	 * @return bool
	 */
	private static function insert_mapping( $resource_type, $internal_post_id, $public_id ) {
		global $wpdb;
		return false !== $wpdb->insert(
			RegistrySchema::table_name(),
			array(
				RegistrySchema::COLUMN_PUBLIC_ID        => $public_id,
				RegistrySchema::COLUMN_RESOURCE_TYPE    => $resource_type,
				RegistrySchema::COLUMN_INTERNAL_POST_ID => $internal_post_id,
				RegistrySchema::COLUMN_CREATED_AT       => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%d', '%s' )
		);
	}

	/**
	 * The registry mapping row for a supported resource, or null.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @param string $resource_type    Public Songhealth resource type.
	 * @param int    $internal_post_id Internal WordPress post ID.
	 * @return object|null
	 */
	private static function row_for_resource( $resource_type, $internal_post_id ) {
		if ( null === FoundationTypes::post_type_for( (string) $resource_type ) ) {
			return null;
		}
		$internal_post_id = (int) $internal_post_id;
		if ( $internal_post_id <= 0 ) {
			return null;
		}
		if ( is_array( self::$read_cache_by_resource ) && isset( self::$read_cache_by_resource[ $resource_type . '|' . $internal_post_id ] ) ) {
			return self::$read_cache_by_resource[ $resource_type . '|' . $internal_post_id ];
		}
		if ( ! self::ensure_schema() ) {
			return null;
		}

		global $wpdb;
		$table = RegistrySchema::table_name();
		return $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . $table . ' WHERE ' . RegistrySchema::COLUMN_RESOURCE_TYPE . ' = %s AND ' . RegistrySchema::COLUMN_INTERNAL_POST_ID . ' = %d',
				$resource_type,
				$internal_post_id
			)
		);
	}

	/**
	 * Whether the most recent failed insert was refused specifically by the
	 * `public_id` unique key — a generated identifier collision, the one
	 * retryable failure. Any other duplicate (the resource-key unique key) or
	 * any other database failure is not a collision and must fail closed.
	 *
	 * The unique index names (T010) are distinct and neither contains the
	 * other, so the violated key named in the database error text is
	 * unambiguous.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	private static function is_public_id_collision() {
		global $wpdb;
		$error = (string) $wpdb->last_error;
		if ( '' === $error || false === strpos( $error, 'Duplicate entry' ) ) {
			return false;
		}
		return false !== strpos( $error, RegistrySchema::UNIQUE_PUBLIC_ID_NAME );
	}

	/**
	 * Ensure the registry table exists, creating it once if absent.
	 *
	 * Every operation funnels through here and fails closed when the schema
	 * cannot be guaranteed — a missing registry is never treated as an empty
	 * one.
	 *
	 * @return bool
	 */
	private static function ensure_schema() {
		if ( RegistrySchema::exists() ) {
			return true;
		}
		return RegistrySchema::create();
	}
}
