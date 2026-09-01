<?php
/**
 * Fail-closed startup validation (Delivery 002, T053 / US4).
 *
 * Implements the accepted T006 contract end to end: while any declared
 * configuration setting is missing, malformed, unsafe, or wrong-origin, the
 * whole configuration is invalid and protected work MUST be refused rather
 * than run on partial configuration (spec.md FR-021; Blueprint §78).
 *
 * What "protected work" means here, exactly:
 *
 * - The data-bearing `songhealth/v1` surfaces — resource detail, bounded
 *   listing, Preview retrieval, Preview binary, and the mediated Document
 *   binary — are withheld from dispatch through a `rest_pre_dispatch` gate
 *   that answers the bounded `songhealth_unavailable` class before any
 *   handler, projection, eligibility decision, or byte of protected data
 *   runs. Every condition shares that one class, so an invalid-configuration
 *   outage is publicly indistinguishable from any other unexpected failure
 *   and discloses no category or value (FR-020, FR-022).
 * - Acceptance of NEW Songhealth resources is refused at the creation
 *   service boundary (`CreateTimePublicId::create()` consults
 *   `protected_work_allowed()`), so no immutable identity is established and
 *   no resource becomes "accepted" while the configuration is invalid.
 *
 * What is deliberately NOT blocked: ordinary updates, autosaves, and
 * revisions of already-identified resources (FR-005 — accepted update
 * behavior must survive), the anonymous native-surface containment filters
 * (protections are never disabled by a validation failure), the minimal
 * public liveness surface, and this module's own protected diagnostics
 * surface — the operator needs the evidence channel precisely when startup
 * validation fails.
 *
 * Bounded actionable operator evidence (FR-022, Constitution VI): when
 * startup validation fails, the module preserves exactly three safe
 * channels — one bounded log line naming only setting keys and stable
 * failure categories, one wp-admin notice for the currently authorized
 * administrative actor, and the protected diagnostics report with its safe
 * correlation code. All three carry the same deterministic correlation
 * code, a one-way digest of category STATUSES only: it correlates the
 * channels without encoding any configuration value, path, query, identity,
 * record, or stack.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-021, FR-022, FR-024;
 * - specs/002-headless-wordpress-foundation/research.md §10;
 * - specs/002-headless-wordpress-foundation/quickstart.md §1;
 * - docs/website-modernization-docs/current/10-system-blueprint.md §78;
 * - .specify/memory/constitution.md I, IV, VI.
 *
 * Timing contract: validation always re-derives from the lifecycle
 * configuration accessor (`Plugin::configuration()`), the accepted
 * read-once-per-request memo (T019). The startup evaluation in `register()`
 * therefore observes the same request-scoped configuration that the
 * dispatch and creation gates observe, without a second configuration read
 * or a stale cached verdict.
 *
 * This module attaches its hooks when the plugin lifecycle wiring calls
 * register(); loading the file alone attaches nothing.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Diagnostics;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Plugin;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\Routes;
use WP_REST_Request;
use WP_REST_Response;

final class StartupValidator {

	/** Log line prefix: bounded, fixed, greppable by an operator. */
	const LOG_PREFIX = '[songhealth-core]';

	/** Correlation code prefix. */
	const CORRELATION_PREFIX = 'shdiag-';

	/** Hex characters retained from the category-status digest. */
	const CORRELATION_LENGTH = 12;

	/**
	 * Attach the startup validation gates and evidence channels.
	 *
	 * Called once by the plugin lifecycle wiring during `plugins_loaded`,
	 * before any content, REST, or admin lifecycle point fires.
	 *
	 * @return void
	 */
	public static function register() {
		/*
		 * Startup evaluation: read the request-scoped configuration once
		 * through the accepted accessor and, when it is invalid, record the
		 * one bounded log line. A valid startup records nothing — the
		 * absence of noise is itself the healthy signal.
		 */
		$configuration = self::configuration();
		if ( ! $configuration->is_valid() ) {
			self::log_failure();
		}

		/*
		 * Dispatch gate: runs at priority 5, BEFORE the native-surface
		 * containment filter (priority 10), so an invalid configuration
		 * withholds the data-bearing surfaces upstream of every handler
		 * while containment still passes the bounded answer through
		 * untouched ("never widen a prior decision" — T018).
		 */
		add_filter( 'rest_pre_dispatch', array( __CLASS__, 'withhold_data_surfaces' ), 5, 3 );

		/* Operator evidence in wp-admin for the currently authorized actor. */
		add_action( 'admin_notices', array( __CLASS__, 'render_admin_evidence' ) );
	}

	/**
	 * The request-scoped lifecycle configuration (T006/T019). Single source
	 * for every validity decision below.
	 *
	 * @return Configuration
	 */
	public static function configuration() {
		return Plugin::configuration();
	}

	/**
	 * Whether the startup configuration is currently valid. While false,
	 * protected work must be refused (FR-021).
	 *
	 * @return bool
	 */
	public static function is_valid() {
		return self::configuration()->is_valid();
	}

	/**
	 * Whether protected work may be accepted or served right now. The gate
	 * the creation service and the REST dispatch path consult; re-derived
	 * from the request-scoped configuration, never from a cached verdict.
	 *
	 * @return bool
	 */
	public static function protected_work_allowed() {
		return self::is_valid();
	}

	/**
	 * The bounded operator evidence for the current state: the redacted
	 * configuration summary (setting keys and stable failure categories
	 * only), the registry category, and the safe correlation code shared by
	 * the log line, the wp-admin notice, and the diagnostics report.
	 *
	 * @return array<string, mixed>
	 */
	public static function operator_evidence() {
		$configuration = self::configuration();
		$report        = DiagnosticsController::report();

		return array(
			'summary'     => $configuration->redacted_summary(),
			'status'      => $configuration->is_valid() ? 'ok' : 'invalid',
			'correlation' => $report['correlation'],
			'categories'  => $report['categories'],
		);
	}

	/**
	 * The safe correlation code for the current category/status state: a
	 * one-way digest of the stable statuses ONLY. Two operators looking at
	 * the same failure signature see the same code; the code cannot be
	 * inverted to any configuration value, and a changed code means a
	 * changed category state, nothing else.
	 *
	 * @return string
	 */
	public static function correlation_code() {
		$configuration = self::configuration();

		/* Category statuses only — never a value, never a key's content. */
		$signature = array(
			'configuration'    => $configuration->is_valid() ? 'valid' : 'invalid',
			'configuration_issues' => array_map(
				static function ( $issue ) {
					return $issue['key'] . '=' . $issue['category'];
				},
				$configuration->validation_issues()
			),
			'identity_registry' => \SonghealthCore\Identity\RegistrySchema::exists() ? 'available' : 'unavailable',
		);

		$digest = hash( 'sha256', (string) wp_json_encode( $signature ) );
		return self::CORRELATION_PREFIX . substr( $digest, 0, self::CORRELATION_LENGTH );
	}

	/**
	 * Withhold the data-bearing Songhealth REST surfaces when the startup
	 * configuration is invalid.
	 *
	 * One interception point upstream of every data-bearing handler: when
	 * validation fails, requests to the resource detail, bounded listing,
	 * Preview, Preview binary, and Document binary shapes receive the
	 * bounded unexpected-failure class before any handler runs. The minimal
	 * liveness surface, the protected diagnostics surface, and the index
	 * shapes stay reachable — they are the operator channels an outage
	 * needs, and they carry no protected record data. Non-Songhealth
	 * namespaces are not this module's boundary and pass through untouched.
	 *
	 * @param mixed           $result  Pre-calculated dispatch result, or null.
	 * @param mixed           $server  REST server.
	 * @param WP_REST_Request $request Current request.
	 * @return mixed
	 */
	public static function withhold_data_surfaces( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result; // Already decided upstream; never widen a prior decision.
		}
		if ( ! $request instanceof WP_REST_Request ) {
			return $result;
		}
		if ( self::is_valid() ) {
			return $result; // Fail closed only; never a behavior change when valid.
		}

		$route = (string) $request->get_route();
		if ( ! self::is_songhealth_data_surface( $route ) ) {
			return $result;
		}

		return NeutralResponse::unexpected_failure();
	}

	/**
	 * Render the bounded startup-validation evidence in wp-admin for the
	 * currently authorized administrative actor.
	 *
	 * Re-decides authorization and validity at render time, so a notice
	 * never outlives the state it describes and is never shown to anyone
	 * without the settings capability. The line carries only the redacted
	 * summary and the correlation code.
	 *
	 * @return void
	 */
	public static function render_admin_evidence() {
		if ( ! current_user_can( CapabilityMap::CAP_SETTINGS_MANAGE ) ) {
			return;
		}
		if ( self::is_valid() ) {
			return;
		}

		$evidence = self::operator_evidence();
		printf(
			'<div class="notice notice-error"><p>%1$s %2$s %3$s</p></div>',
			esc_html__( 'Songhealth foundation: protected work is disabled by invalid configuration.', 'songhealth-core' ),
			esc_html( (string) $evidence['summary'] ),
			esc_html( (string) $evidence['correlation'] )
		);
	}

	/**
	 * Record the one bounded log line for a failed startup validation:
	 * prefix, redacted summary (setting keys and stable failure categories
	 * only), and the correlation code. No value, no path, no query, no
	 * identity, no stack.
	 *
	 * @return void
	 */
	private static function log_failure() {
		$evidence = self::operator_evidence();
		error_log(
			sprintf(
				'%s startup validation failed — %s; correlation=%s',
				self::LOG_PREFIX,
				(string) $evidence['summary'],
				(string) $evidence['correlation']
			)
		);
	}

	/**
	 * Whether a REST route is a Songhealth data-bearing surface — a
	 * `songhealth/v1` route other than the operator channels (namespace
	 * index, minimal liveness, protected diagnostics) and other than the
	 * namespace root itself.
	 *
	 * @param string $route Request route.
	 * @return bool
	 */
	private static function is_songhealth_data_surface( $route ) {
		$namespace = '/' . Routes::ROUTE_NAMESPACE;
		if ( $namespace === $route || 0 !== strpos( $route, $namespace . '/' ) ) {
			return false;
		}

		$channels = array(
			$namespace . Routes::ROUTE_HEALTH,
			$namespace . Routes::ROUTE_DIAGNOSTICS,
		);
		return ! in_array( $route, $channels, true );
	}
}
