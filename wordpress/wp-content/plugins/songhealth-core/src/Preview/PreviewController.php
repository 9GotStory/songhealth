<?php
/**
 * Preview initiation and retrieval (Delivery 002, T035).
 *
 * The authenticated, currently authorized, read-only Preview boundary for
 * candidate Basic Page and Document Resource state: an authorized staff
 * action in the Songhealth-configured wp-admin record initiates one bounded
 * navigation, and one REST retrieval serves the explicit candidate
 * projection to the shared React renderer (contracts/preview.md;
 * research.md §8; data-model.md §Preview Context).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-013–FR-017;
 * - specs/002-headless-wordpress-foundation/contracts/preview.md
 *   §Initiation, §Retrieval, §Isolation;
 * - specs/002-headless-wordpress-foundation/research.md §8;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Authorization contract (FR-013, FR-016, FR-017): every retrieval freshly
 * validates, in order — an authenticated active Songhealth staff session; the
 * supplemental CSRF defenses; the grant's signature, expiry, purpose,
 * audience, resource, revision, and user binding; the live identity mapping
 * and accepted-resource prerequisite; and the current capability/scope/object
 * decision from the shared default-deny primitive (T009). A grant is binding
 * context for one navigation, never authorization: session loss, disablement,
 * demotion, scope loss, candidate movement, or expiry denies the NEXT request.
 * There is no anonymous or public fallback anywhere in this controller.
 *
 * CSRF contract: REST nonce and origin controls are supplemental defenses
 * over cookie-authenticated requests, never authorization. A retrieval must
 * carry origin evidence — an Origin or Referer matching the approved public
 * React origin or this WordPress origin — and a presented nonce (the standard
 * `wp_rest` nonce, by header or parameter) must verify. A missing or
 * unapproved origin denies; a present-but-invalid nonce denies; a valid nonce
 * grants nothing. This mirrors the platform's own cookie-authentication CSRF
 * posture (core enforces the nonce on state-changing methods and relies on
 * origin/CORS for reads) made strictly fail-closed for this privileged read.
 *
 * Confidentiality contract: every response this controller produces — success
 * or denial — carries `Cache-Control: private, no-store`,
 * `X-Robots-Tag: noindex, nofollow`, and `nosniff`. The denial is the accepted
 * neutral class (T014) with those headers, so every failure dimension is
 * externally identical and no status, header, or body variation discloses
 * which condition applied.
 *
 * Projection contract: the candidate DTO is an explicit allowlist built field
 * by field (never a serialized post). It contains only what the shared React
 * renderer presents — the public identity, title, canonical path, optional
 * summary, the Basic Page body and stored candidate references, or the
 * Document Resource document date — and no WordPress ID, status, author,
 * meta row, attachment identity, lifecycle value, or binary path (the
 * protected-binary surface is US3, T044).
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Preview;

use SonghealthCore\Authorization\AuthorizationService;
use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\PublicProjector;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;

final class PreviewController {

	/** The wp-admin initiation action (admin-post.php). */
	const ADMIN_ACTION = 'songhealth_preview';

	/** The query parameter carrying the opaque grant on a Preview retrieval request. */
	const GRANT_PARAMETER = 'grant';

	/** The URL-fragment parameter carrying the opaque grant through the bounded navigation. */
	const GRANT_FRAGMENT_PARAMETER = 'g';

	/** The URL-fragment parameter carrying the supplemental `wp_rest` nonce handoff. */
	const NONCE_FRAGMENT_PARAMETER = 'n';

	/** The confidentiality posture of every Preview response. */
	const CACHE_CONTROL = 'private, no-store';
	const ROBOTS_TAG     = 'noindex, nofollow';

	/**
	 * Attach the initiation surface to the WordPress lifecycle.
	 *
	 * Retrieval is dispatched by the REST route (T016); this registers only
	 * the wp-admin initiation action and its anonymous counterpart, which
	 * answers the same bounded denial rather than a platform login redirect
	 * that would disclose the action's existence shape.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'admin_post_' . self::ADMIN_ACTION, array( __CLASS__, 'handle_initiation' ) );
		add_action( 'admin_post_nopriv_' . self::ADMIN_ACTION, array( __CLASS__, 'handle_initiation' ) );
	}

	/**
	 * The neutral Preview denial: the accepted neutral class with the Preview
	 * confidentiality headers.
	 *
	 * @return WP_REST_Response
	 */
	public static function denial() {
		$response = NeutralResponse::not_found();
		$response->header( 'Cache-Control', self::CACHE_CONTROL );
		$response->header( 'X-Robots-Tag', self::ROBOTS_TAG );
		return $response;
	}

	/**
	 * The bounded navigation target of one authorized initiation: the approved
	 * public React origin plus the Preview route and the fresh grant.
	 *
	 * This is a privileged action decided by the shared default-deny primitive
	 * with full object context (FR-013): the actor must hold the resource's
	 * view capability in scope, and the object must be an accepted Songhealth
	 * resource — a quarantined internal candidate has no identity and no
	 * Preview. The lifecycle rule for view allows every state (Frozen 06
	 * §42.5: drafts are organizational work).
	 *
	 * Handoff contract: the grant and one `wp_rest` nonce travel in the URL
	 * FRAGMENT, never the query. A fragment is never sent to any server and
	 * never appears in an access log or referer, and the React route removes
	 * it from the address bar immediately after consuming it (T037) — so the
	 * bounded navigation leaves no server-side or URL-bar trace. The nonce is
	 * the platform's own supplemental CSRF control for cookie-authenticated
	 * REST: without it, WordPress treats a session-cookie REST request as
	 * anonymous by design (the admin-path auth cookie, not the logged-in
	 * cookie, is core's REST CSRF anchor), so the browser retrieval presents
	 * it alongside the grant. It is never authorization — the grant binding
	 * and the fresh capability decision are.
	 *
	 * @param int $post_id Record to preview.
	 * @return string|null The absolute Preview URL with its fresh grant and nonce handoff, or null.
	 */
	public static function initiation_target( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return null;
		}
		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		if ( null === $resource_type ) {
			return null;
		}

		/* A valid, live identity mapping is the first prerequisite (FR-007). */
		$public_id = PublicIdRegistry::public_id_for( $resource_type, (int) $post->ID );
		if ( null === $public_id || ! CreateTimePublicId::is_accepted( $post ) ) {
			return null;
		}

		$capability = self::view_capability( $resource_type );
		$decision   = AuthorizationService::decide(
			array(
				'capability' => $capability,
				'module'     => $resource_type,
				'object_id'  => (int) $post->ID,
			)
		);
		if ( ! $decision->allowed() ) {
			return null;
		}

		$configuration = \SonghealthCore\Plugin::configuration();
		if ( ! $configuration->is_valid() || ! $configuration->secret_is_configured( \SonghealthCore\Diagnostics\Configuration::KEY_PREVIEW_SIGNING_KEY ) ) {
			return null; // No protected work on invalid configuration.
		}

		$user  = wp_get_current_user();
		$grant = PreviewGrant::issue(
			(int) $user->ID,
			$resource_type,
			$public_id,
			PreviewGrant::candidate_revision( $post )
		);
		if ( null === $grant ) {
			return null;
		}

		return $configuration->public_origin()
			. '/preview/' . rawurlencode( $resource_type ) . '/' . rawurlencode( $public_id )
			. '#' . self::GRANT_FRAGMENT_PARAMETER . '=' . rawurlencode( $grant )
			. '&' . self::NONCE_FRAGMENT_PARAMETER . '=' . rawurlencode( wp_create_nonce( 'wp_rest' ) );
	}

	/**
	 * Handle the wp-admin initiation request (admin-post.php).
	 *
	 * The standard administrative nonce/referer check gates the action itself;
	 * the privileged decision is then made fresh by initiation_target(). A
	 * denied initiation answers with the bounded staff-facing notice and a
	 * 404 status — no candidate state, no reason, no redirect that would
	 * disclose anything.
	 *
	 * @return void
	 */
	public static function handle_initiation() {
		$post_id = isset( $_GET['post'] ) ? (int) $_GET['post'] : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified below.

		if ( ! check_admin_referer( self::ADMIN_ACTION ) ) {
			wp_die( 'ไม่สามารถเปิดตัวอย่างได้', 404 ); // Bounded Songhealth-language denial.
		}

		$target = self::initiation_target( $post_id );
		if ( null === $target ) {
			wp_die( 'ไม่สามารถเปิดตัวอย่างได้', 404 );
		}

		wp_safe_redirect( $target );
		exit;
	}

	/**
	 * The Preview retrieval handler (dispatched by the T016 route).
	 *
	 * Every failure is the identical neutral denial with the Preview
	 * confidentiality headers; the order of the checks is itself the security
	 * property — session before identifier work, CSRF before grant parsing,
	 * grant binding before resolution, and the live authorization decision
	 * last, immediately before the projection.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function retrieve( $request ) {
		if ( ! self::is_staff_session() ) {
			return self::denial();
		}

		if ( ! self::origin_allows( $request ) ) {
			return self::denial();
		}
		if ( ! self::nonce_if_present_verifies( $request ) ) {
			return self::denial();
		}

		$resource_type = (string) $request->get_param( 'resourceType' );
		$public_id     = (string) $request->get_param( 'publicId' );
		$post_type     = FoundationTypes::post_type_for( $resource_type );
		if ( null === $post_type || ! PublicIdRegistry::is_valid_public_id( $public_id ) ) {
			return self::denial();
		}

		$mapping = PublicIdRegistry::mapping_for( $public_id );
		if ( ! is_object( $mapping ) || ! PublicIdRegistry::is_live( $mapping ) ) {
			return self::denial();
		}
		if ( (string) $mapping->resource_type !== $resource_type ) {
			return self::denial();
		}

		$post = get_post( (int) $mapping->internal_post_id );
		if ( ! $post instanceof WP_Post || $post->post_type !== $post_type ) {
			return self::denial();
		}
		if ( ! CreateTimePublicId::is_accepted( $post ) ) {
			return self::denial(); // A quarantined internal candidate never previews.
		}

		$user = wp_get_current_user();
		if ( ! PreviewGrant::verify(
			(string) $request->get_param( self::GRANT_PARAMETER ),
			array(
				'user_id'            => (int) $user->ID,
				'resource_type'      => $resource_type,
				'public_id'          => $public_id,
				'candidate_revision' => PreviewGrant::candidate_revision( $post ),
			)
		) ) {
			return self::denial();
		}

		$decision = AuthorizationService::decide(
			array(
				'capability' => self::view_capability( $resource_type ),
				'module'     => $resource_type,
				'object_id'  => (int) $post->ID,
			)
		);
		if ( ! $decision->allowed() ) {
			return self::denial(); // Fresh authorization: revocation hits this request.
		}

		$dto = self::project_candidate( $post );
		if ( null === $dto ) {
			return self::denial();
		}

		$response = new WP_REST_Response( $dto, 200 );
		$response->header( 'Cache-Control', self::CACHE_CONTROL );
		$response->header( 'X-Robots-Tag', self::ROBOTS_TAG );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}

	/**
	 * The explicit bounded candidate projection.
	 *
	 * Field by field from an allowlist; never a serialized post. The shared
	 * React renderer (T027) presents the Basic Page; the Document Resource
	 * candidate carries its own date but deliberately no binary surface,
	 * which belongs to US3 (T044/T045).
	 *
	 * @param WP_Post $post Accepted record to project.
	 * @return array|null The candidate DTO, or null when it cannot be safely built.
	 */
	public static function project_candidate( $post ) {
		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		if ( null === $resource_type ) {
			return null;
		}
		$public_id = PublicIdRegistry::public_id_for( $resource_type, (int) $post->ID );
		if ( null === $public_id ) {
			return null;
		}

		$dto = array(
			'type'          => $resource_type,
			'publicId'      => $public_id,
			'title'         => (string) $post->post_title,
			'canonicalPath' => PublicProjector::canonical_path( $resource_type, $public_id, $post->post_name ),
		);

		$summary = trim( (string) get_post_meta( (int) $post->ID, FoundationTypes::META_SUMMARY, true ) );
		if ( '' !== $summary ) {
			$dto['summary'] = $summary;
		}

		if ( FoundationTypes::BASIC_PAGE === $post->post_type ) {
			$dto['body'] = wp_kses_post( (string) $post->post_content );

			/* Candidate references project as the stored candidate state (FR-019 keeps their own eligibility authoritative for any public delivery). */
			$stored = get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, true );
			if ( is_array( $stored ) && array() !== $stored ) {
				$dto['documentReferences'] = array_values( array_map( 'strval', $stored ) );
			}
			return $dto;
		}

		$document_date = trim( (string) get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_DATE, true ) );
		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}$/', $document_date ) ) {
			$dto['documentDate'] = $document_date;
		}
		return $dto;
	}

	/**
	 * The view capability of a resource type's module.
	 *
	 * @param string $resource_type Public resource type.
	 * @return string
	 */
	private static function view_capability( $resource_type ) {
		return CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type
			? CapabilityMap::CAP_DOCUMENT_RESOURCE_VIEW
			: CapabilityMap::CAP_BASIC_PAGE_VIEW;
	}

	/**
	 * Whether the current request carries an authenticated Songhealth staff
	 * session (the accepted staff boundary; identical to the route gate).
	 *
	 * Public for the accepted Preview consumers only: the Preview binary
	 * surface (T044) re-uses this gate verbatim so the two surfaces share one
	 * staff boundary.
	 *
	 * @return bool
	 */
	public static function is_staff_session() {
		$user = wp_get_current_user();
		return $user->exists() && null !== CapabilityMap::resolve_role( $user );
	}

	/**
	 * The supplemental origin defense.
	 *
	 * The request must present an Origin (or Referer) whose parsed origin is
	 * EXACTLY one of the approved origins — the configured public React
	 * origin or this WordPress origin — compared by scheme, host, and
	 * effective port (G04-B03). A browser request always presents one of the
	 * two for a cross-origin fetch or a same-origin form/navigation action; a
	 * request presenting neither is not a browser navigation this surface
	 * serves, and fails closed.
	 *
	 * Exactness contract: textual prefixes are never origin identity. A
	 * candidate is parsed before comparison, so suffix-host confusions
	 * (`https://example.com.attacker.test`), hostname-prefix and path-prefix
	 * confusions, userinfo disguises, wrong schemes, wrong explicit or
	 * effective ports, and malformed values all fail closed. An Origin must
	 * itself be a bare origin; a Referer may carry a path and query only
	 * after its parsed origin has proven equal.
	 *
	 * Public for the accepted Preview consumers only: the Preview binary
	 * surface (T044) re-uses this exact boundary.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return bool
	 */
	public static function origin_allows( $request ) {
		$approved = array();
		$configuration = \SonghealthCore\Plugin::configuration();
		if ( $configuration->is_valid() ) {
			$approved[] = (string) $configuration->public_origin();
		}
		$approved[] = home_url( '/' );

		$parsed_approved = array();
		foreach ( $approved as $base ) {
			$parsed = self::parse_origin( (string) $base, true );
			if ( null !== $parsed ) {
				$parsed_approved[] = $parsed;
			}
		}
		if ( array() === $parsed_approved ) {
			return false; // No approved origin could be parsed: fail closed.
		}

		$origin  = trim( (string) $request->get_header( 'Origin' ) );
		$referer = trim( (string) $request->get_header( 'Referer' ) );
		if ( '' === $origin && '' === $referer ) {
			return false; // No origin evidence at all: fail closed.
		}

		if ( '' !== $origin ) {
			$parsed_origin = self::parse_origin( $origin, false );
			if ( null !== $parsed_origin && self::origin_is_approved( $parsed_origin, $parsed_approved ) ) {
				return true;
			}
		}
		if ( '' !== $referer ) {
			$parsed_referer = self::parse_origin( $referer, true );
			if ( null !== $parsed_referer && self::origin_is_approved( $parsed_referer, $parsed_approved ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Parse one candidate origin-bearing header into its exact origin.
	 *
	 * Returns the normalized (lowercase scheme and host, effective port)
	 * origin components, or null for anything that is not a safe, complete
	 * http(s) URL origin: missing scheme or host, a non-http(s) scheme,
	 * userinfo of any kind, a malformed value, or — when `$allow_path` is
	 * false, the Origin header's contract — any path, query, or fragment.
	 *
	 * @param string $value     Raw header value.
	 * @param bool   $allow_path Whether a path and query may follow the origin (true for Referer).
	 * @return array{scheme: string, host: string, port: int}|null
	 */
	private static function parse_origin( $value, $allow_path ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return null;
		}

		$parts = wp_parse_url( $value );
		if ( false === $parts || ! is_array( $parts ) ) {
			return null; // Malformed.
		}

		$scheme = isset( $parts['scheme'] ) ? strtolower( (string) $parts['scheme'] ) : '';
		$host   = isset( $parts['host'] ) ? strtolower( (string) $parts['host'] ) : '';
		if ( '' === $scheme || '' === $host ) {
			return null;
		}
		if ( 'http' !== $scheme && 'https' !== $scheme ) {
			return null;
		}
		if ( isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return null; // Userinfo never disambiguates a host: reject outright.
		}

		$path = isset( $parts['path'] ) ? (string) $parts['path'] : '';
		if ( ! $allow_path ) {
			if ( '' !== $path && '/' !== $path ) {
				return null; // An Origin is a bare origin; a path is a confusion attempt.
			}
			if ( isset( $parts['query'] ) || isset( $parts['fragment'] ) ) {
				return null;
			}
		} elseif ( isset( $parts['fragment'] ) ) {
			return null; // A Referer carries no fragment; one is malformed input.
		}

		$port = isset( $parts['port'] ) ? (int) $parts['port'] : null;
		if ( null === $port ) {
			$port = 'https' === $scheme ? 443 : 80; // The effective default port.
		}
		if ( $port < 1 || $port > 65535 ) {
			return null;
		}

		return array(
			'scheme' => $scheme,
			'host'   => $host,
			'port'   => $port,
		);
	}

	/**
	 * Whether one parsed candidate origin is exactly an approved origin.
	 *
	 * @param array $candidate  Parsed candidate origin.
	 * @param array $approved   Parsed approved origins.
	 * @return bool
	 */
	private static function origin_is_approved( array $candidate, array $approved ) {
		foreach ( $approved as $base ) {
			if ( $candidate['scheme'] === $base['scheme']
				&& $candidate['host'] === $base['host']
				&& $candidate['port'] === $base['port'] ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The supplemental nonce defense: a presented nonce must verify.
	 *
	 * A nonce is never required (origin evidence is the required control) and
	 * never sufficient (the authorization decision is); but a request that
	 * presents one that does not verify is denied, so a stale or forged nonce
	 * can never ride along with an otherwise valid request.
	 *
	 * Public for the accepted Preview consumers only: the Preview binary
	 * surface (T044) re-uses this exact defense.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return bool
	 */
	public static function nonce_if_present_verifies( $request ) {
		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( null === $nonce ) {
			$nonce = $request->get_param( '_wpnonce' );
		}
		if ( null === $nonce || '' === trim( (string) $nonce ) ) {
			return true; // Absent: nothing to verify; authorization decides.
		}
		return false !== wp_verify_nonce( trim( (string) $nonce ), 'wp_rest' );
	}
}
