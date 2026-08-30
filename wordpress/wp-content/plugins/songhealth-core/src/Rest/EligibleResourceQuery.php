<?php
/**
 * Eligibility-first bounded resource queries (Delivery 002, T017).
 *
 * The shared query primitive behind the Songhealth bounded-listing operation:
 * a deterministic Public-ID keyset scan over the identity registry, bounded
 * by a hard server-owned candidate budget per request, with every scanned
 * record accepted or rejected by the live authoritative eligibility decision
 * (T013). The envelope is the reconciled bounded continuation contract —
 * `data`, `hasMore`, and an optional opaque `nextCursor` — and carries no
 * totals or page counts (contracts/public-rest.md §Bounded listing;
 * Session 2026-08-30 G02C-B02 design boundary).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-007, FR-008, FR-030
 *   and the G02C-B02 design-boundary clarification;
 * - specs/002-headless-wordpress-foundation/contracts/public-rest.md
 *   §Bounded listing, §Projection, references, errors, transport;
 * - specs/002-headless-wordpress-foundation/data-model.md §Public Projection;
 * - specs/002-headless-wordpress-foundation/plan.md §Technical Context
 *   (Performance Goals: hard server-controlled candidate-scan and
 *   application-evaluation bounds, deterministic Public-ID keyset progress,
 *   no deep OFFSET or unbounded scan);
 * - .specify/memory/constitution.md I, II, V.
 *
 * Input contract: the only list inputs are the resource type (required,
 * allowlisted), `perPage` (positive, small default, hard server maximum),
 * `order` (closed allowlist), and an optional opaque `cursor`. No page
 * number, keyword, search, suggestion, filter, or raw query parameter is
 * supported, and none is interpreted (FR-030).
 *
 * Authority contract: `PublicEligibility` (T013) is the ONLY eligibility
 * authority. The query below reproduces NONE of its rules in SQL — the scan
 * reads the identity registry (identity is registry-owned, not eligibility
 * semantics) and hands every scanned record to the live decision. A record
 * enters `data` only after that decision accepts it, so revocation applies
 * to the very next request.
 *
 * Boundedness contract: each request scans at most
 * `MAX_CANDIDATES_PER_REQUEST` candidates in bounded keyset batches (plus a
 * one-row lookahead that decides `hasMore`) and evaluates at most that many
 * records at the application level, whatever the registry's size. At most
 * `perPage` items are returned. When the budget ends while further
 * candidates remain, the response preserves progress: `hasMore=true`, an
 * opaque `nextCursor`, and — if nothing eligible was found — an empty
 * `data` page, never a false exhaustion. `last_evaluation_count()` exposes
 * the application-level evaluation count as bounded verification evidence.
 *
 * Cursor contract: the cursor is server-issued continuation state only. It
 * is authenticated-encrypted (XSalsa20-Poly1305 via the standard sodium
 * extension: confidentiality AND integrity in one primitive) under a
 * purpose-derived site key, and its plaintext carries only a version, the
 * bound resource type and order, the last-scanned Public ID, and an expiry.
 * It discloses no internal identifier to its holder (the Public ID inside is
 * unreadable and is never one that was disclosed to the client), no scanned
 * ineligible identifier, no eligibility state, and no database position. Only
 * the exact issued canonical unpadded Base64URL token is accepted (G02C-B04):
 * standard-alphabet substitutions, `=` padding, whitespace, byte-equivalent
 * alternate encodings, and any other non-canonical text fail closed, as do
 * tampered, expired, version-mismatched, and type/order-mismatched cursors —
 * all through the bounded neutral invalid-request class. No persistent
 * cursor store exists or is needed.
 *
 * Determinism contract: the allowlisted orders are the Public ID order —
 * `newest` (descending) and `oldest` (ascending). UUIDv7 identifiers are
 * time-ordered and the registry's unique key makes the order a total order,
 * so a continuation walk never skips, repeats, or reshuffles a record.
 *
 * This module is a pure query primitive; it registers no hook of its own
 * (wiring is T019).
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Rest;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Eligibility\PublicEligibility;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Identity\RegistrySchema;
use WP_Error;
use WP_Post;

final class EligibleResourceQuery {

	/** Small default page size (contracts/public-rest.md §Bounded listing). */
	const DEFAULT_PER_PAGE = 20;

	/** Hard server maximum for perPage; larger requests are invalid input. */
	const MAX_PER_PAGE = 100;

	/** Order allowlist: deterministic Public ID order only. */
	const ORDER_NEWEST = 'newest';
	const ORDER_OLDEST = 'oldest';

	/**
	 * Hard server-owned candidate budget per request: the most registry
	 * candidates one request may scan and evaluate, whatever the client
	 * asks for. Not a client-controllable input.
	 */
	const MAX_CANDIDATES_PER_REQUEST = 200;

	/** Registry rows read per keyset batch while filling the candidate window. */
	const SCAN_BATCH_SIZE = 201;

	/** Cursor plaintext version; a cursor with any other version fails closed. */
	const CURSOR_VERSION = 1;

	/** Cursor lifetime in seconds (continuation state only; safe to expire). */
	const CURSOR_TTL_SECONDS = 3600;

	/**
	 * Bounded verification instrumentation (G02C-B02): how many records the
	 * most recent listing query evaluated at the application level — post
	 * load plus the authoritative eligibility decision. Evidence only, never
	 * behavior: bounded by MAX_CANDIDATES_PER_REQUEST regardless of registry
	 * size.
	 *
	 * @var int
	 */
	private static $last_evaluation_count = 0;

	/**
	 * Validate listing input against the closed allowlists, including cursor
	 * shape. Cursor CONTENT (authenticity, expiry, binding) is validated when
	 * the query runs.
	 *
	 * Returns true when every input is supported and in range, or a bounded
	 * value-free error naming only the stable invalid-input category — never
	 * the offending value (T014).
	 *
	 * @param array $params Raw input (type, perPage, order, cursor).
	 * @return true|WP_Error
	 */
	public static function validate_params( array $params ) {
		$type = isset( $params['type'] ) ? (string) $params['type'] : '';
		if ( null === FoundationTypes::post_type_for( $type ) ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}

		$per_page = isset( $params['perPage'] ) ? $params['perPage'] : self::DEFAULT_PER_PAGE;
		if ( ! self::is_positive_int( $per_page ) || (int) $per_page > self::MAX_PER_PAGE ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}

		$order = isset( $params['order'] ) ? (string) $params['order'] : self::ORDER_NEWEST;
		if ( ! in_array( $order, self::orders(), true ) ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}

		$cursor = isset( $params['cursor'] ) ? $params['cursor'] : null;
		if ( null !== $cursor && ( ! is_string( $cursor ) || '' === $cursor || strlen( $cursor ) > 512 ) ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}

		return true;
	}

	/**
	 * Validate one continuation cursor against a request's resource type and
	 * order without running the query: the same authenticity, version,
	 * expiry, and binding checks `query()` applies.
	 *
	 * A bounded, value-free invalid-input error is returned for a malformed,
	 * tampered, expired, version-mismatched, or type/order-mismatched
	 * cursor, so callers share one observable invalid-request class with all
	 * other unsupported list input (T014). A null cursor (no continuation
	 * requested) is valid.
	 *
	 * @param string      $type   Public resource type of the request.
	 * @param string      $order  Allowlisted order of the request.
	 * @param string|null $cursor Cursor supplied by the request, if any.
	 * @return true|WP_Error
	 */
	public static function validate_cursor( $type, $order, $cursor = null ) {
		if ( null === $cursor || '' === $cursor ) {
			return true;
		}
		$state = self::decode_cursor( (string) $cursor );
		if ( null === $state ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}
		if ( $state['t'] !== (string) $type || $state['o'] !== (string) $order ) {
			return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
		}
		return true;
	}

	/**
	 * The allowlisted order values.
	 *
	 * @return string[]
	 */
	public static function orders() {
		return array( self::ORDER_NEWEST, self::ORDER_OLDEST );
	}

	/**
	 * How many records the most recent listing query evaluated at the
	 * application level (post load + authoritative decision). Bounded by the
	 * hard server candidate budget; evidence for G02C-B02.
	 *
	 * @return int
	 */
	public static function last_evaluation_count() {
		return self::$last_evaluation_count;
	}

	/**
	 * Run one bounded eligibility-first listing query.
	 *
	 * The scan walks live registry mappings of the resource type in
	 * deterministic Public ID order, starting strictly beyond the cursor's
	 * continuation point when one is supplied. Each scanned candidate is
	 * evaluated by the live shared decision (T013) — the sole eligibility
	 * authority — and only accepted records enter `data`. The walk stops at
	 * `perPage` accepted items, at the hard candidate budget, or at the end
	 * of the candidates, whichever comes first; `hasMore` reports
	 * deterministic continuation (never an eligible count), and `nextCursor`
	 * is present exactly when continuation is available.
	 *
	 * Failure is the bounded value-free invalid-input error: unsupported
	 * input, or a malformed, tampered, expired, version-mismatched, or
	 * type/order-mismatched cursor (T014).
	 *
	 * @param array $params Raw input (type, perPage, order, cursor).
	 * The envelope carries exactly `data` and `hasMore`, plus a string
	 * `nextCursor` key on a continuing response only — a terminal response
	 * omits the key entirely (G02C-B03).
	 *
	 * @return array|WP_Error Envelope (data, hasMore[, nextCursor]), or the bounded invalid-input error.
	 */
	public static function query( array $params ) {
		$validated = self::validate_params( $params );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		$type       = (string) $params['type'];
		$per_page   = (int) ( isset( $params['perPage'] ) ? $params['perPage'] : self::DEFAULT_PER_PAGE );
		$order      = isset( $params['order'] ) ? (string) $params['order'] : self::ORDER_NEWEST;
		$descending = self::ORDER_NEWEST === $order;

		$after_public_id = null;
		if ( isset( $params['cursor'] ) ) {
			$state = self::decode_cursor( (string) $params['cursor'] );
			if ( null === $state ) {
				return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
			}
			if ( $state['t'] !== $type || $state['o'] !== $order ) {
				return new WP_Error( NeutralResponse::CODE_INVALID_REQUEST );
			}
			$after_public_id = $state['p'];
		}

		self::$last_evaluation_count = 0;

		if ( ! RegistrySchema::exists() ) {
			/* No registry means no established identity, so no candidates at all. */
			return array(
				'data'    => array(),
				'hasMore' => false,
			);
		}

		/*
		 * One bounded keyset fetch: the candidate budget plus a one-row
		 * lookahead. `hasMore` can therefore report deterministic
		 * continuation without a second count query and without scanning
		 * beyond the budget.
		 */
		$rows = self::fetch_candidates( $type, $after_public_id, $descending, self::MAX_CANDIDATES_PER_REQUEST + 1 );
		$has_more_candidates = count( $rows ) > self::MAX_CANDIDATES_PER_REQUEST;
		$candidates          = $has_more_candidates ? array_slice( $rows, 0, self::MAX_CANDIDATES_PER_REQUEST ) : $rows;

		$data             = array();
		$last_scanned     = $after_public_id;
		$scanned_position = 0;

		foreach ( $candidates as $row ) {
			self::$last_evaluation_count++;
			$last_scanned     = (string) $row->{RegistrySchema::COLUMN_PUBLIC_ID};
			$scanned_position++;

			$post = get_post( (int) $row->{RegistrySchema::COLUMN_INTERNAL_POST_ID} );
			if ( ! $post instanceof WP_Post || $post->post_type !== FoundationTypes::post_type_for( $type ) ) {
				continue;
			}
			if ( ! PublicEligibility::is_eligible( $post ) ) {
				continue;
			}

			$data[] = array(
				'post'      => $post,
				'public_id' => (string) $row->{RegistrySchema::COLUMN_PUBLIC_ID},
			);
			if ( count( $data ) >= $per_page ) {
				break;
			}
		}

		/*
		 * Deterministic continuation: more work exists when candidates remain
		 * inside this bounded fetch after the last one scanned, or when the
		 * lookahead proved the registry holds more beyond the budget. A full
		 * registry walk therefore reports hasMore=false exactly at its end.
		 */
		$has_more = $has_more_candidates
			|| count( $rows ) > $scanned_position;

		if ( ! $has_more ) {
			/*
			 * Terminal envelope: exactly `data` and `hasMore`. The
			 * `nextCursor` key is omitted entirely — a present-but-null key
			 * would be a third envelope shape (G02C-B03).
			 */
			return array(
				'data'    => $data,
				'hasMore' => false,
			);
		}

		return array(
			'data'       => $data,
			'hasMore'    => true,
			'nextCursor' => self::encode_cursor( $type, $order, $last_scanned ),
		);
	}

	/**
	 * Resolve one currently eligible record by its immutable Public ID.
	 *
	 * Resolution is by Public ID alone — a slug or internal ID never
	 * participates in identity lookup. The registry mapping must be live and
	 * of the requested type, and the record must pass the current shared
	 * eligibility decision (T013); otherwise null, which the caller turns
	 * into the neutral class (T014) indistinguishable from an unknown ID.
	 *
	 * @param string $resource_type Requested public resource type.
	 * @param mixed  $public_id     Requested Public ID.
	 * @return WP_Post|null
	 */
	public static function eligible_detail( $resource_type, $public_id ) {
		if ( null === FoundationTypes::post_type_for( (string) $resource_type ) ) {
			return null;
		}

		$mapping = PublicIdRegistry::mapping_for( $public_id );
		if ( ! is_object( $mapping ) || ! PublicIdRegistry::is_live( $mapping ) ) {
			return null;
		}
		if ( (string) $mapping->{RegistrySchema::COLUMN_RESOURCE_TYPE} !== (string) $resource_type ) {
			return null;
		}

		$post = get_post( (int) $mapping->{RegistrySchema::COLUMN_INTERNAL_POST_ID} );
		if ( ! $post instanceof WP_Post ) {
			return null;
		}
		if ( $post->post_type !== FoundationTypes::post_type_for( (string) $resource_type ) ) {
			return null;
		}
		if ( ! PublicEligibility::is_eligible( $post ) ) {
			return null;
		}
		return $post;
	}

	/**
	 * Fetch the next bounded window of live registry candidates for one type
	 * in Public ID order, strictly beyond the continuation point. Identity
	 * liveness only — no eligibility rule is reproduced here (G02C-B02).
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @param string      $resource_type   Public Songhealth resource type.
	 * @param string|null $after_public_id Continuation point (exclusive), or null to start.
	 * @param bool        $descending      True for newest-first order.
	 * @param int         $limit           Maximum rows to fetch (bounded by the candidate budget + lookahead).
	 * @return object[] Registry rows (public_id, internal_post_id).
	 */
	private static function fetch_candidates( $resource_type, $after_public_id, $descending, $limit ) {
		global $wpdb;

		$table  = RegistrySchema::table_name();
		$cursor_clause = '';
		$args          = array( $resource_type );

		if ( null !== $after_public_id ) {
			$operator      = $descending ? '<' : '>';
			$cursor_clause = ' AND ' . RegistrySchema::COLUMN_PUBLIC_ID . ' ' . $operator . ' %s';
			$args[]        = (string) $after_public_id;
		}

		$sql = 'SELECT ' . RegistrySchema::COLUMN_PUBLIC_ID . ', ' . RegistrySchema::COLUMN_INTERNAL_POST_ID
			. ' FROM ' . $table
			. ' WHERE ' . RegistrySchema::COLUMN_RESOURCE_TYPE . ' = %s'
			. ' AND ' . RegistrySchema::COLUMN_DELETED_AT . ' IS NULL'
			. $cursor_clause
			. ' ORDER BY ' . RegistrySchema::COLUMN_PUBLIC_ID . ( $descending ? ' DESC' : ' ASC' )
			. ' LIMIT %d';
		$args[] = $limit;

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $args ) );
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Issue one continuation cursor: authenticated-encrypted continuation
	 * state bound to resource type and order, carrying a version and an
	 * expiry. Opaque to its holder; integrity-protected by the cipher's MAC.
	 *
	 * @param string $type             Public resource type the walk is bound to.
	 * @param string $order            Allowlisted order the walk is bound to.
	 * @param string $last_scanned     Public ID of the last candidate scanned.
	 * @param int    $expires_at_unix  Explicit expiry as a Unix timestamp; defaults to now + CURSOR_TTL_SECONDS.
	 * @return string Opaque cursor.
	 */
	private static function encode_cursor( $type, $order, $last_scanned, $expires_at_unix = null ) {
		$payload = array(
			'v' => self::CURSOR_VERSION,
			't' => (string) $type,
			'o' => (string) $order,
			'p' => (string) $last_scanned,
			'e' => null === $expires_at_unix ? ( time() + self::CURSOR_TTL_SECONDS ) : (int) $expires_at_unix,
		);

		$nonce     = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$ciphertext = sodium_crypto_secretbox( wp_json_encode( $payload ), $nonce, self::cursor_key() );

		return self::base64url_encode( $nonce . $ciphertext );
	}

	/**
	 * Open and validate a continuation cursor. Returns the continuation
	 * state, or null for any malformed, tampered, wrong-version, or expired
	 * cursor — every case is the caller's bounded invalid-input failure.
	 *
	 * @param string $cursor Opaque cursor supplied by the request.
	 * @return array{v:int,t:string,o:string,p:string,e:int}|null
	 */
	private static function decode_cursor( $cursor ) {
		$raw = self::base64url_decode( $cursor );
		if ( null === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return null;
		}

		$nonce      = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$boxed      = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$plaintext  = sodium_crypto_secretbox_open( $boxed, $nonce, self::cursor_key() );
		if ( false === $plaintext ) {
			return null; // Tampered or not issued under this key.
		}

		$state = json_decode( (string) $plaintext, true );
		if ( ! is_array( $state ) ) {
			return null;
		}
		foreach ( array( 'v', 't', 'o', 'p', 'e' ) as $field ) {
			if ( ! array_key_exists( $field, $state ) ) {
				return null;
			}
		}
		if ( self::CURSOR_VERSION !== (int) $state['v'] ) {
			return null;
		}
		if ( ! is_string( $state['t'] ) || ! is_string( $state['o'] ) || ! is_string( $state['p'] ) ) {
			return null;
		}
		if ( ! PublicIdRegistry::is_valid_public_id( $state['p'] ) ) {
			return null;
		}
		if ( (int) $state['e'] < time() ) {
			return null; // Expired continuation state fails closed.
		}
		return array(
			'v' => (int) $state['v'],
			't' => $state['t'],
			'o' => $state['o'],
			'p' => $state['p'],
			'e' => (int) $state['e'],
		);
	}

	/**
	 * The purpose-bound cursor key: the site authentication salt, derived to
	 * a 32-byte key that serves only this continuation state. Rotating the
	 * site salt invalidates outstanding cursors — a safe fail-closed
	 * outcome for state that lives minutes.
	 *
	 * @return string 32-byte key material.
	 */
	private static function cursor_key() {
		return hash( 'sha256', 'songhealth/listing-cursor/v1|' . wp_salt( 'auth' ), true );
	}

	/**
	 * URL-safe base64 encoding for opaque cursor strings.
	 *
	 * @param string $bytes Raw bytes.
	 * @return string
	 */
	private static function base64url_encode( $bytes ) {
		return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
	}

	/**
	 * Strict canonical Base64URL decoding (G02C-B04): only the exact issued
	 * token form is accepted — unpadded URL-safe alphabet, no substitutions,
	 * no padding, no whitespace of any kind, no byte-equivalent alternate
	 * representation.
	 *
	 * Three gates, all fail-closed to null:
	 *
	 * 1. Alphabet/shape: the whole token must match `^[A-Za-z0-9_-]+$`. This
	 *    rejects standard-Base64 `+`/`/` substitutions of the URL-safe `-`/`_`
	 *    (which would otherwise decode to the same bytes), `=` padding, any
	 *    leading/trailing/internal whitespace, and every non-alphabet byte —
	 *    before any decoding happens.
	 * 2. Length: a token whose length is 1 modulo 4 cannot be Base64.
	 * 3. Canonical re-encode comparison: the decoded bytes must re-encode to
	 *    the identical token, rejecting any alternate encoding of the same
	 *    bytes (padding variants, non-canonical trailing bits).
	 *
	 * @param string $encoded Encoded cursor.
	 * @return string|null Decoded bytes, or null for any non-canonical input.
	 */
	private static function base64url_decode( $encoded ) {
		$token = (string) $encoded;
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]+$/', $token ) ) {
			return null;
		}
		if ( 1 === strlen( $token ) % 4 ) {
			return null;
		}

		$decoded = base64_decode( strtr( $token, '-_', '+/' ), true );
		if ( false === $decoded ) {
			return null;
		}
		if ( ! hash_equals( self::base64url_encode( $decoded ), $token ) ) {
			return null; // Byte-equivalent alternate representation.
		}
		return $decoded;
	}

	/**
	 * Whether a value is a positive integer (or its canonical integer string).
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	private static function is_positive_int( $value ) {
		if ( is_int( $value ) ) {
			return $value >= 1;
		}
		if ( is_string( $value ) && 1 === preg_match( '/^[1-9][0-9]*$/', $value ) ) {
			return true;
		}
		return false;
	}
}
