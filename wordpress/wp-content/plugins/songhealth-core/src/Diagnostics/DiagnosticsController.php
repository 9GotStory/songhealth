<?php
/**
 * Safe liveness and protected diagnostics responses (Delivery 002, T052 / US4).
 *
 * Two surfaces in the approved `songhealth/v1` namespace:
 *
 * - Public liveness (`/health`): the minimal anonymous signal that the
 *   foundation is serving. It answers exactly one bounded fact — the plugin
 *   boundary is loaded and reachable — with one fixed body, no environment
 *   name, no version, no counts, and no configuration state. Deliberately
 *   NOT a readiness surface: reporting configuration or dependency state
 *   publicly would disclose operational detail to unauthenticated callers
 *   (FR-022; research.md §10: "Public liveness is minimal").
 *
 * - Protected diagnostics (`/diagnostics`): the bounded operator evidence
 *   channel. Its FIRST action is a fresh authorization decision — only the
 *   currently authenticated Songhealth administrative actor holds the
 *   settings capability (frozen 06 role matrix; T008/T009 vocabulary) — and
 *   anonymous or insufficiently authorized requests receive one bounded
 *   denial class that does not distinguish the two. Authorized callers
 *   receive stable category/status output plus a safe correlation code:
 *   never a secret value, never a path, never a raw query, never a CMS user
 *   identity, never a record, never a stack, never a version.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-021, FR-022, FR-024;
 * - specs/002-headless-wordpress-foundation/research.md §10;
 * - specs/002-headless-wordpress-foundation/quickstart.md §1;
 * - specs/002-headless-wordpress-foundation/data-model.md §Verification
 *   Evidence ("Public diagnostics never expose CMS identity");
 * - .specify/memory/constitution.md I, IV, VI.
 *
 * Nondisclosure contract: every body this controller emits is assembled from
 * allowlisted status vocabulary only. The configuration settings status is
 * re-used verbatim from the accepted T006 `Configuration::safe_status()`
 * report — the reviewed operator report in which secret settings contribute
 * only `set-and-valid` and nothing else — and the correlation code is a
 * one-way digest of category statuses, so it carries no configurable value.
 *
 * The two route shapes are registered by the lifecycle wiring through
 * Routes (T016); loading this file alone attaches nothing. Both surfaces
 * stay reachable when startup validation fails closed (T053): liveness is
 * the minimal public signal and diagnostics is the corrective-category
 * evidence channel an operator needs precisely then.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Diagnostics;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Plugin;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class DiagnosticsController {

	/** Stable response code of the protected diagnostics body. */
	const CODE_DIAGNOSTICS = 'songhealth_diagnostics';

	/** One bounded denial class for anonymous and unauthorized alike. */
	const CODE_DIAGNOSTICS_FORBIDDEN = 'songhealth_diagnostics_forbidden';

	/** Fixed liveness body: one word, nothing else. */
	const LIVENESS_OK = 'ok';

	/**
	 * Public minimal liveness.
	 *
	 * One fixed 200 body for every anonymous or authenticated caller. The
	 * answer never varies with configuration validity, registry state, or
	 * requester identity: any such variation would be an operational-detail
	 * disclosure on a public surface (FR-022), and a liveness signal that
	 * degraded under failure would invite cache-state confusion rather than
	 * help anyone. Bounded and non-cacheable.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function liveness( $request ) {
		$response = new WP_REST_Response(
			array(
				'status' => self::LIVENESS_OK,
			),
			200
		);
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}

	/**
	 * Protected bounded diagnostics for the currently authorized operator.
	 *
	 * Authorization is the first action and is re-decided from live state on
	 * every request: the current actor must hold the Songhealth settings
	 * capability. Anonymous, non-staff, and insufficiently authorized
	 * requests share ONE bounded denial — status, code, message, and headers
	 * identical — so the surface never discloses which condition applied or
	 * anything about which accounts exist.
	 *
	 * The authorized body is stable category/status evidence plus the safe
	 * correlation code shared with the startup validator's operator evidence
	 * (T053): an operator matches the code here against the startup log line
	 * or the wp-admin notice to confirm they are looking at the same state.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function diagnostics( $request ) {
		if ( ! self::is_authorized_operator() ) {
			return self::denial();
		}

		$response = new WP_REST_Response( self::report(), 200 );
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}

	/**
	 * The bounded diagnostics report: stable categories, statuses, and the
	 * safe correlation code. Also the body behind
	 * StartupValidator::operator_evidence() correlation, so the two channels
	 * can never drift apart.
	 *
	 * Categories are limited to the foundation's own declared infrastructure
	 * — the environment-separated configuration (T006) and the identity
	 * registry (T010) — and never include platform versions, PHP/WordPress
	 * detail, paths, or identities (FR-022: no unnecessary environment
	 * detail).
	 *
	 * @return array<string, mixed>
	 */
	public static function report() {
		$configuration = Plugin::configuration();
		$settings      = $configuration->safe_status();

		$categories = array(
			'configuration'    => array(
				'status'   => $configuration->is_valid() ? 'valid' : 'invalid',
				'settings' => $settings,
			),
			'identity_registry' => array(
				'status' => \SonghealthCore\Identity\RegistrySchema::exists() ? 'available' : 'unavailable',
			),
		);

		return array(
			'code'        => self::CODE_DIAGNOSTICS,
			'status'      => $configuration->is_valid() ? 'ok' : 'invalid',
			'correlation' => StartupValidator::correlation_code(),
			'categories'  => $categories,
		);
	}

	/**
	 * Whether the current request carries the currently authorized
	 * Songhealth administrative actor: a live user holding the frozen
	 * settings capability. Default deny — no session, no capability, no
	 * role, no answer.
	 *
	 * @return bool
	 */
	private static function is_authorized_operator() {
		$user = wp_get_current_user();
		if ( ! $user->exists() ) {
			return false;
		}
		if ( null === CapabilityMap::resolve_role( $user ) ) {
			return false;
		}
		return current_user_can( CapabilityMap::CAP_SETTINGS_MANAGE );
	}

	/**
	 * The one bounded denial for every not-currently-authorized caller:
	 * fixed status, code, and message, nondisclosing headers, nothing about
	 * the requester, the resource, or the state.
	 *
	 * @return WP_REST_Response
	 */
	private static function denial() {
		$response = new WP_REST_Response(
			array(
				'code'    => self::CODE_DIAGNOSTICS_FORBIDDEN,
				'message' => 'Not authorized.',
				'data'    => array(
					'status' => 403,
				),
			),
			403
		);
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}
