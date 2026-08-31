<?php
/**
 * Short-lived single-purpose opaque Preview grants (Delivery 002, T034).
 *
 * The smallest mechanism the persisted Preview boundary requires: an opaque,
 * authenticated-encrypted token that binds one authorized staff navigation to
 * exactly one user, resource type, Public ID, candidate revision, audience,
 * and purpose, and carries nothing else — no protected content, no
 * credential, and no session or cookie value (research.md §8; data-model.md
 * §Preview Context; contracts/preview.md §Initiation).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-016, FR-017;
 * - specs/002-headless-wordpress-foundation/contracts/preview.md;
 * - specs/002-headless-wordpress-foundation/data-model.md §Preview Context;
 * - specs/002-headless-wordpress-foundation/research.md §8;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Token contract: the payload is sealed with sodium_crypto_secretbox under a
 * purpose-derived key, so the holder sees only opaque Base64URL text; the
 * cipher's MAC is the integrity control. The payload carries the binding
 * context of data-model.md §Preview Context — a random opaque grant
 * identifier, the bound user, resource type and Public ID, the candidate
 * revision, the fixed `preview` audience and purpose, and the issued/expiry
 * timestamps — and nothing else. Rotating the configured signing key or the
 * site it derives from invalidates every outstanding grant, which is the safe
 * fail-closed outcome for state that lives minutes.
 *
 * Fail-closed contract: verification rejects malformed, tampered, padded,
 * non-canonically encoded, wrong-version, expired, mis-audience, mis-purpose,
 * or context-mismatched tokens identically, and no grant is issued or
 * verified at all while the configured signing key is absent.
 *
 * Authority contract (FR-017): a grant is never authorization, never an
 * authentication credential, and never a share link. It is one navigation's
 * binding context; every request re-validates it AND the current session AND
 * the current capability/scope/object decision in the Preview controller
 * (T035). It is deliberately not stored anywhere: an unverified token has no
 * server-side state to consult, and a revocation therefore never needs to
 * reach it — session, capability, scope, and candidate state are all read
 * live on the next request.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Preview;

use WP_Post;

final class PreviewGrant {

	/** The fixed grant version. */
	const VERSION = 1;

	/** The fixed single purpose of every Preview grant. */
	const PURPOSE = 'preview';

	/** The fixed audience of every Preview grant (the Preview surface, never public). */
	const AUDIENCE = 'preview';

	/** Grant lifetime in seconds. Short by construction (research.md §8). */
	const TTL_SECONDS = 120;

	/** The environment variable carrying the dedicated signing key. */
	const KEY_ENVIRONMENT = 'SONGHEALTH_PREVIEW_SIGNING_KEY';

	/** The wp-config constant carrying the dedicated signing key. */
	const KEY_CONSTANT = 'SONGHEALTH_PREVIEW_SIGNING_KEY';

	/** The key-derivation label; a grant never shares key material with any other use. */
	const KEY_LABEL = 'songhealth/preview-grant/v1';

	/**
	 * Issue one Preview grant.
	 *
	 * @param int         $user_id           Bound WordPress user.
	 * @param string      $resource_type     Public Songhealth resource type.
	 * @param string      $public_id         Immutable Public ID of the one bound record.
	 * @param string      $candidate_revision Candidate revision the grant is bound to.
	 * @param int|null    $expires_at        Explicit expiry (Unix); defaults to now + TTL_SECONDS.
	 * @return string|null Opaque grant, or null when the signing key is unavailable.
	 */
	public static function issue( $user_id, $resource_type, $public_id, $candidate_revision, $expires_at = null ) {
		$key = self::signing_key();
		if ( null === $key ) {
			return null;
		}

		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$boxed = sodium_crypto_secretbox(
			wp_json_encode(
				array(
					'v' => self::VERSION,
					'g' => bin2hex( random_bytes( 16 ) ),
					'u' => (int) $user_id,
					'r' => (string) $resource_type,
					'p' => (string) $public_id,
					'c' => (string) $candidate_revision,
					'a' => self::AUDIENCE,
					'k' => self::PURPOSE,
					'i' => time(),
					'e' => null === $expires_at ? time() + self::TTL_SECONDS : (int) $expires_at,
				)
			),
			$nonce,
			$key
		);

		return self::base64url_encode( $nonce . $boxed );
	}

	/**
	 * Verify a Preview grant against the requesting context.
	 *
	 * Every dimension is checked: canonical encoding, integrity under the
	 * configured key, version, the fixed audience and purpose, expiry, and the
	 * exact user, resource type, Public ID, and candidate revision binding.
	 * Any failure is the one boolean false — the caller answers the neutral
	 * denial, so no failure dimension is ever observable.
	 *
	 * @param string     $token              Opaque grant from the request.
	 * @param array      $context {
	 *     The requesting context the grant must match.
	 *
	 *     @type int    $user_id            Current WordPress user.
	 *     @type string $resource_type      Requested public resource type.
	 *     @type string $public_id          Requested Public ID.
	 *     @type string $candidate_revision Current candidate revision of the record.
	 * }
	 * @return bool
	 */
	public static function verify( $token, array $context ) {
		$payload = self::open( $token );
		if ( null === $payload ) {
			return false;
		}

		if ( self::VERSION !== (int) $payload['v'] ) {
			return false;
		}
		if ( self::AUDIENCE !== $payload['a'] || self::PURPOSE !== $payload['k'] ) {
			return false;
		}
		if ( (int) $payload['e'] <= time() ) {
			return false; // Expired: the single-purpose grant is over.
		}
		if ( (int) $payload['i'] > time() ) {
			return false; // Issued in the future: fail closed, never wait.
		}
		if ( (int) $payload['u'] !== (int) ( $context['user_id'] ?? 0 ) ) {
			return false; // Bound to another user.
		}
		if ( (string) $payload['r'] !== (string) ( $context['resource_type'] ?? '' ) ) {
			return false; // Bound to another resource type.
		}
		if ( (string) $payload['p'] !== (string) ( $context['public_id'] ?? '' ) ) {
			return false; // Bound to another record.
		}
		if ( (string) $payload['c'] !== (string) ( $context['candidate_revision'] ?? '' ) ) {
			return false; // The candidate moved on after issuance.
		}

		return true;
	}

	/**
	 * The candidate revision a grant binds to: the record's current modified
	 * time. Foundation types deliberately carry no WordPress revision history
	 * (T007 supports title and editor only), so the live modified timestamp is
	 * the smallest honest stand-in for "the candidate state being previewed":
	 * it changes on every save of the record, which is exactly when a
	 * single-purpose grant must stop applying, and it is unaffected by
	 * metadata-only or unrelated writes.
	 *
	 * @param WP_Post $post Record being previewed.
	 * @return string
	 */
	public static function candidate_revision( $post ) {
		return (string) $post->post_modified_gmt;
	}

	/**
	 * Open a grant for bounded audit: the binding context only, never a
	 * verification result.
	 *
	 * Used by the verification suite to prove the token carries no content and
	 * no credential. It opens nothing when the token is malformed, tampered, or
	 * sealed under another key — an audit never invents a payload.
	 *
	 * @param string $token Opaque grant.
	 * @return array|null The binding context, or null.
	 */
	public static function open_for_audit( $token ) {
		return self::open( $token );
	}

	/**
	 * Open and shape-check one token under the configured key.
	 *
	 * @param string $token Opaque grant.
	 * @return array|null The payload, or null for any non-canonical, tampered, or unshapely token.
	 */
	private static function open( $token ) {
		$key = self::signing_key();
		if ( null === $key ) {
			return null;
		}

		if ( ! is_string( $token ) || '' === $token ) {
			return null;
		}
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]+$/', $token ) ) {
			return null; // Non-canonical encoding (padding, whitespace, alternate alphabets).
		}

		$raw = self::base64url_decode( $token );
		if ( null === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return null;
		}

		$plaintext = sodium_crypto_secretbox_open(
			substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ),
			substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ),
			$key
		);
		if ( false === $plaintext ) {
			return null; // Tampered, or not sealed under this key.
		}

		$payload = json_decode( (string) $plaintext, true );
		if ( ! is_array( $payload ) ) {
			return null;
		}
		foreach ( array( 'v', 'g', 'u', 'r', 'p', 'c', 'a', 'k', 'i', 'e' ) as $field ) {
			if ( ! array_key_exists( $field, $payload ) ) {
				return null;
			}
		}
		return $payload;
	}

	/**
	 * The purpose-bound grant key, derived from the dedicated Preview signing
	 * key declared by the configuration schema (T006). The raw secret is read
	 * only here and never stored; absence or an unusable value yields null and
	 * every grant operation fails closed.
	 *
	 * @return string|null 32-byte key material, or null when unavailable.
	 */
	private static function signing_key() {
		$secret = getenv( self::KEY_ENVIRONMENT );
		if ( false === $secret || '' === $secret ) {
			if ( defined( self::KEY_CONSTANT ) ) {
				$constant = constant( self::KEY_CONSTANT );
				$secret   = is_string( $constant ) ? $constant : '';
			}
		}
		if ( ! is_string( $secret ) || '' === $secret ) {
			return null;
		}
		return hash( 'sha256', self::KEY_LABEL . '|' . $secret, true );
	}

	/**
	 * URL-safe Base64 encoding for the opaque token transport.
	 *
	 * @param string $bytes Raw bytes.
	 * @return string
	 */
	private static function base64url_encode( $bytes ) {
		return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
	}

	/**
	 * Strict canonical Base64URL decoding: only text that re-encodes to
	 * exactly the input decodes, so padding variants and non-canonical
	 * trailing bits fail closed (mirrors the accepted cursor discipline,
	 * G02C-B04).
	 *
	 * @param string $token Canonical Base64URL text.
	 * @return string|null Decoded bytes, or null for any non-canonical input.
	 */
	private static function base64url_decode( $token ) {
		$raw = base64_decode( strtr( $token, '-_', '+/' ) . str_repeat( '=', ( 4 - strlen( $token ) % 4 ) % 4 ), true );
		if ( false === $raw ) {
			return null;
		}
		if ( self::base64url_encode( $raw ) !== $token ) {
			return null;
		}
		return $raw;
	}
}
