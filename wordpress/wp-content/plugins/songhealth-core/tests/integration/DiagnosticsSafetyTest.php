<?php
/**
 * Configuration and diagnostics safety integration tests (Delivery 002, T048 / US4).
 *
 * Quickstart §1 evidence: valid startup is actionable; every missing,
 * malformed, unsafe, and wrong-origin configuration fails closed BEFORE
 * protected work is accepted; public liveness stays minimal; protected
 * diagnostics require current authorization and expose only stable
 * category/status evidence with a safe correlation code; and no surface of
 * this batch discloses secrets, credentials, protected content, sensitive
 * paths, raw queries, CMS users/identities, records, stacks, or
 * unnecessary environment detail (FR-021, FR-022, FR-024; SC-007).
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-021,
 * FR-022, FR-024; specs/002-headless-wordpress-foundation/quickstart.md §1;
 * specs/002-headless-wordpress-foundation/research.md §10;
 * specs/002-headless-wordpress-foundation/data-model.md §Verification
 * Evidence.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Diagnostics\Configuration;
use SonghealthCore\Diagnostics\DiagnosticsController;
use SonghealthCore\Diagnostics\StartupValidator;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\Routes;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group diagnostics
 * @group us4
 */
class DiagnosticsSafetyTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/**
	 * Distinctive sentinel values. Every assertion below proves these never
	 * appear in any public or protected output of this batch: the real
	 * signing-key value, the test database credential, the installation
	 * path, the table prefix, a protected record's title, and a CMS user
	 * login are the disclosure classes SC-007 enumerates.
	 */
	const SENTINEL_KEY    = 'T048-sentinel-signing-key-zzz-not-a-real-secret-9876543210';
	const SENTINEL_RECORD = 'T048-Sentinel-Protected-Record-Title';
	const SENTINEL_LOGIN  = 't048-sentinel-staff-login';

	/** Baseline configuration captured before any per-case override. */
	private $baseline = array();

	/** Staff fixtures, keyed by role slug. */
	private $staff = array();

	public function set_up() {
		parent::set_up();

		/* Capture the harness baseline so every case restores it exactly. */
		foreach ( array(
			'SONGHEALTH_ENVIRONMENT',
			'SONGHEALTH_PUBLIC_ORIGIN',
			'SONGHEALTH_PREVIEW_SIGNING_KEY',
		) as $key ) {
			$this->baseline[ $key ] = (string) getenv( $key );
		}

		$this->staff = array(
			'administrator'          => $this->ensure_user( 'diag_administrator', CapabilityMap::ROLE_ADMINISTRATOR ),
			CapabilityMap::ROLE_VIEWER   => $this->ensure_user( 'diag_viewer', CapabilityMap::ROLE_VIEWER ),
			CapabilityMap::ROLE_PUBLISHER => $this->ensure_user( 'diag_publisher', CapabilityMap::ROLE_PUBLISHER ),
			'sentinel'               => $this->ensure_user( self::SENTINEL_LOGIN, CapabilityMap::ROLE_VIEWER ),
		);
		wp_set_current_user( 0 );

		$this->use_valid_configuration();
	}

	public function tear_down() {
		wp_set_current_user( 0 );
		$this->restore_baseline_configuration();
		parent::tear_down();
		$this->songhealth_delete_tracked_records();

		/*
		 * The framework unregisters every registered meta key after each
		 * test (WP_UnitTestCase::unregister_all_meta_keys), while the
		 * foundation metadata registers once per process on init. Restore
		 * the registration so the suites that follow this file observe the
		 * same lifecycle state it started from.
		 */
		foreach ( FoundationTypes::supported_types() as $post_type ) {
			FoundationTypes::register_metadata( $post_type );
		}
	}

	/**
	 * Pin the complete valid configuration for a case and reset the
	 * request-scoped memo so the decision path re-reads it.
	 *
	 * @param array<string, string> $overrides Setting values by environment key; a missing key means UNSET (the missing-setting case).
	 * @return void
	 */
	private function use_configuration( array $overrides ) {
		$keys = array(
			'SONGHEALTH_ENVIRONMENT',
			'SONGHEALTH_PUBLIC_ORIGIN',
			'SONGHEALTH_PREVIEW_SIGNING_KEY',
		);
		foreach ( $keys as $key ) {
			if ( array_key_exists( $key, $overrides ) ) {
				putenv( $key . '=' . (string) $overrides[ $key ] );
			} else {
				putenv( $key . '=' ); // Absent: no environment variable and no wp-config constant.
			}
		}
		$this->reset_configuration_memo();
	}

	/**
	 * The valid baseline of a case.
	 *
	 * @param array<string, string> $overrides Per-case overrides.
	 * @return array<string, string>
	 */
	private function valid_configuration( array $overrides = array() ) {
		return array_merge(
			array(
				'SONGHEALTH_ENVIRONMENT'        => 'development',
				'SONGHEALTH_PUBLIC_ORIGIN'      => 'http://127.0.0.1:4173',
				'SONGHEALTH_PREVIEW_SIGNING_KEY' => self::SENTINEL_KEY,
			),
			$overrides
		);
	}

	private function use_valid_configuration() {
		$this->use_configuration( $this->valid_configuration() );
	}

	private function restore_baseline_configuration() {
		foreach ( $this->baseline as $key => $value ) {
			putenv( $key . '=' . $value );
		}
		$this->reset_configuration_memo();
	}

	private function reset_configuration_memo() {
		$reset = new \ReflectionProperty( \SonghealthCore\Plugin::class, 'configuration' );
		$reset->setAccessible( true );
		$reset->setValue( null, null );
	}

	/**
	 * Ensure a staff fixture exists exactly once (the creation service
	 * commits its bounded transaction, so a fixture from an earlier test of
	 * the same suite survives that test's rollback).
	 *
	 * @param string $login Fixture login.
	 * @param string $role  Role slug.
	 * @return int User ID.
	 */
	private function ensure_user( $login, $role ) {
		$existing = get_user_by( 'slug', $login );
		$user_id  = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => $login,
					'user_email' => $login . '@example.invalid',
					'role'       => $role,
				)
			);

		wp_update_user( array( 'ID' => $user_id, 'role' => $role ) );
		return $user_id;
	}

	/**
	 * The one REST request helper: dispatch through the live server so the
	 * registered routes, the startup dispatch gate, and the containment
	 * filters all run exactly as in a real request.
	 *
	 * @param string $route Route path.
	 * @return WP_REST_Response
	 */
	private function get( $route ) {
		return rest_do_request( new WP_REST_Request( 'GET', $route ) );
	}

	/**
	 * Create a service-accepted record and track it for durable cleanup.
	 *
	 * @param string $post_type Post type.
	 * @param string $title    Title.
	 * @return array|WP_Error
	 */
	private function create_tracked( $post_type, $title ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => $post_type,
				'post_title'  => $title,
				'post_status' => 'draft',
			)
		);
		if ( is_array( $created ) ) {
			$this->songhealth_track_record( (int) $created['post_id'] );
		}
		return $created;
	}

	/** @test */
	public function test_valid_configuration_is_actionable_for_protected_work_and_operators() {
		$this->use_valid_configuration();

		/* Startup validation accepts: protected work is allowed. */
		$this->assertTrue( StartupValidator::is_valid() );
		$this->assertTrue( StartupValidator::protected_work_allowed() );

		/* Acceptance of a new protected resource works through the service. */
		$created = $this->create_tracked( FoundationTypes::BASIC_PAGE, 'T048 Valid Startup Fixture' );
		$this->assertIsArray( $created, 'valid configuration must not block acceptance' );

		/* The operator report is actionable: per-setting status, presence-only for secrets. */
		$status = \SonghealthCore\Plugin::configuration()->safe_status();
		$this->assertSame( 'development', $status[ Configuration::KEY_ENVIRONMENT ] );
		$this->assertSame( 'http://127.0.0.1:4173', $status[ Configuration::KEY_PUBLIC_ORIGIN ] );
		$this->assertSame( 'set-and-valid', $status[ Configuration::KEY_PREVIEW_SIGNING_KEY ] );

		/* The data surfaces are served (an unknown identifier is the neutral class, not the outage class). */
		$detail = $this->get( '/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000' );
		$this->assertSame( 404, $detail->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $detail->get_data()['code'] );
	}

	/**
	 * Every invalid variant: the setting key, the environment override, and
	 * the stable failure category the operator must see.
	 *
	 * @return array<int, array<int, mixed>>
	 */
	public function data_provider_invalid_configurations() {
		return array(
			'missing environment'          => array( 'SONGHEALTH_ENVIRONMENT', array( 'SONGHEALTH_ENVIRONMENT' => null ), 'missing' ),
			'missing public origin'        => array( 'SONGHEALTH_PUBLIC_ORIGIN', array( 'SONGHEALTH_PUBLIC_ORIGIN' => null ), 'missing' ),
			'missing signing key'          => array( 'SONGHEALTH_PREVIEW_SIGNING_KEY', array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => null ), 'missing' ),
			'environment not allowlisted'  => array( 'SONGHEALTH_ENVIRONMENT', array( 'SONGHEALTH_ENVIRONMENT' => 'staging' ), 'environment_not_allowlisted' ),
			'origin malformed'             => array( 'SONGHEALTH_PUBLIC_ORIGIN', array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'not-a-url' ), 'origin_malformed' ),
			'origin not bare'              => array( 'SONGHEALTH_PUBLIC_ORIGIN', array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'https://example.org/path?x=1' ), 'origin_not_bare' ),
			'origin scheme unsafe'         => array( 'SONGHEALTH_PUBLIC_ORIGIN', array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'ftp://example.org' ), 'origin_scheme_unsafe' ),
			'origin host malformed'        => array( 'SONGHEALTH_PUBLIC_ORIGIN', array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'http://bad_host!' ), 'origin_host_malformed' ),
			'secret too short'             => array( 'SONGHEALTH_PREVIEW_SIGNING_KEY', array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => 'short-key' ), 'secret_too_short' ),
			'secret characters unsafe'     => array( 'SONGHEALTH_PREVIEW_SIGNING_KEY', array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => "has whitespace and spaces not allowed here\n" ), 'secret_characters_unsafe' ),
			'secret placeholder value'     => array( 'SONGHEALTH_PREVIEW_SIGNING_KEY', array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => 'change-me-this-is-a-placeholder-value-0123456789' ), 'secret_placeholder_value' ),
			'production origin wrong scheme' => array( 'SONGHEALTH_PUBLIC_ORIGIN', array(
				'SONGHEALTH_ENVIRONMENT'   => 'production',
				'SONGHEALTH_PUBLIC_ORIGIN' => 'http://example.org',
			), 'origin_scheme_unsafe' ),
			'production host without dot' => array( 'SONGHEALTH_PUBLIC_ORIGIN', array(
				'SONGHEALTH_ENVIRONMENT'   => 'production',
				'SONGHEALTH_PUBLIC_ORIGIN' => 'https://localhost',
			), 'origin_host_malformed' ),
		);
	}

	/**
	 * @dataProvider data_provider_invalid_configurations
	 * @param string               $setting   The setting under test.
	 * @param array<string, string|null> $overrides The environment override (null unsets).
	 * @param string               $category  The stable failure category.
	 * @test
	 */
	public function test_every_invalid_variant_fails_closed_before_protected_work_is_accepted( $setting, $overrides, $category ) {
		$configuration = $this->valid_configuration();
		foreach ( $overrides as $key => $value ) {
			if ( null === $value ) {
				unset( $configuration[ $key ] );
			} else {
				$configuration[ $key ] = $value;
			}
		}
		$this->use_configuration( $configuration );

		/* Fail closed, with the actionable category and never the value. */
		$this->assertFalse( StartupValidator::is_valid() );
		$this->assertFalse( StartupValidator::protected_work_allowed() );

		$issues = StartupValidator::configuration()->validation_issues();
		$this->assertNotEmpty( $issues );
		$setting_key = $this->setting_key( $setting );
		$matching    = array_filter(
			$issues,
			static function ( $issue ) use ( $setting_key, $category ) {
				return $setting_key === $issue['key'] && $category === $issue['category'];
			}
		);
		$this->assertNotEmpty( $matching, "{$setting} must fail with the category {$category}" );

		/* No new protected work is accepted: the service refuses before any write. */
		$refused = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'T048 Refused Creation',
				'post_status' => 'draft',
			)
		);
		$this->assertWPError( $refused, 'creation must fail closed' );
		$this->assertSame( 'configuration_invalid', $refused->get_error_code() );
		$this->assertSame( 0, (int) post_exists( 'T048 Refused Creation', '', '', FoundationTypes::BASIC_PAGE ), 'nothing was written' );

		/* The data-bearing REST surfaces are withheld before any handler. */
		foreach ( array(
			'/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000',
			'/songhealth/v1/resources?type=basic-page',
			'/songhealth/v1/documents/00000000-0000-7000-8000-000000000000/binary',
		) as $route ) {
			$withheld = $this->get( $route );
			$this->assertSame( 500, $withheld->get_status(), "{$route} must be withheld" );
			$this->assertSame( NeutralResponse::CODE_UNAVAILABLE, $withheld->get_data()['code'] );
			$this->assertSame( 'no-store', $this->cache_control( $withheld ) );
		}

		/* The operator channels stay reachable and actionable. */
		$health = $this->get( '/songhealth/v1/health' );
		$this->assertSame( 200, $health->get_status() );

		wp_set_current_user( $this->staff['administrator'] );
		$diagnostics = $this->get( '/songhealth/v1/diagnostics' );
		$this->assertSame( 200, $diagnostics->get_status() );
		$report = $diagnostics->get_data();
		$this->assertSame( 'invalid', $report['status'] );
		$this->assertSame( $category, $report['categories']['configuration']['settings'][ $this->setting_key( $setting ) ] );
	}

	/** @test */
	public function test_public_liveness_is_minimal_and_constant_across_every_state() {
		$cases = array(
			'valid configuration'   => array( 'valid' ),
			'invalid configuration' => array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => null ),
			'unsafe configuration'  => array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'ftp://example.org' ),
		);

		$bodies = array();
		foreach ( $cases as $label => $override ) {
			if ( array( 'valid' ) === $override ) {
				$this->use_valid_configuration();
			} else {
				$this->use_configuration( $this->valid_configuration( $override ) );
			}

			/* Anonymous and authenticated see the identical minimal body. */
			$anonymous     = $this->get( '/songhealth/v1/health' );
			$bodies[]      = $anonymous->get_data();
			$this->assertSame( 200, $anonymous->get_status(), "{$label}: liveness stays up" );
			$this->assertSame( array( 'status' => 'ok' ), $anonymous->get_data(), "{$label}: exactly one fixed field" );
			$this->assertSame( 'no-store', $this->cache_control( $anonymous ) );
			$this->assertSame( 'nosniff', $this->nosniff( $anonymous ) );

			wp_set_current_user( $this->staff['administrator'] );
			$authenticated = $this->get( '/songhealth/v1/health' );
			$this->assertSame( $anonymous->get_data(), $authenticated->get_data(), "{$label}: no requester variation" );
			wp_set_current_user( 0 );
		}

		$this->assertSame( $bodies[0], $bodies[1], 'liveness never varies with configuration state' );
		$this->assertSame( $bodies[0], $bodies[2] );
	}

	/** @test */
	public function test_protected_diagnostics_require_current_authorization_with_one_denial_class() {
		$this->use_valid_configuration();

		/* Anonymous, non-staff, and insufficient staff all share ONE class. */
		wp_set_current_user( 0 );
		$anonymous = $this->get( '/songhealth/v1/diagnostics' );

		wp_set_current_user( $this->staff[ CapabilityMap::ROLE_VIEWER ] );
		$viewer = $this->get( '/songhealth/v1/diagnostics' );

		wp_set_current_user( $this->staff[ CapabilityMap::ROLE_PUBLISHER ] );
		$publisher = $this->get( '/songhealth/v1/diagnostics' );

		foreach ( array( 'anonymous' => $anonymous, 'viewer' => $viewer, 'publisher' => $publisher ) as $label => $denied ) {
			$this->assertSame( 403, $denied->get_status(), "{$label} is not authorized" );
			$this->assertSame( DiagnosticsController::CODE_DIAGNOSTICS_FORBIDDEN, $denied->get_data()['code'] );
			$this->assertSame( 'Not authorized.', $denied->get_data()['message'] );
			$this->assertSame( 'no-store', $this->cache_control( $denied ) );
		}
		$this->assertSame( $anonymous->get_data(), $viewer->get_data(), 'no distinction between denial conditions' );
		$this->assertSame( $anonymous->get_data(), $publisher->get_data() );

		/* The currently authorized administrator receives the bounded report. */
		wp_set_current_user( $this->staff['administrator'] );
		$authorized = $this->get( '/songhealth/v1/diagnostics' );
		$this->assertSame( 200, $authorized->get_status() );
		$this->assertSame( DiagnosticsController::CODE_DIAGNOSTICS, $authorized->get_data()['code'] );
	}

	/** @test */
	public function test_authorized_diagnostics_report_stable_categories_and_a_safe_correlation_code() {
		$this->use_valid_configuration();
		wp_set_current_user( $this->staff['administrator'] );

		$report = $this->get( '/songhealth/v1/diagnostics' )->get_data();

		$this->assertSame( 'ok', $report['status'] );
		$this->assertSame(
			array( 'code', 'status', 'correlation', 'categories' ),
			array_keys( $report ),
			'the report is exactly the bounded operator vocabulary'
		);
		$this->assertSame( array( 'configuration', 'identity_registry' ), array_keys( $report['categories'] ) );
		$this->assertSame( 'valid', $report['categories']['configuration']['status'] );
		$this->assertSame( 'available', $report['categories']['identity_registry']['status'] );

		/* The correlation code is shared with the startup operator evidence and stable per state. */
		$this->assertSame( StartupValidator::correlation_code(), $report['correlation'] );
		$this->assertMatchesRegularExpression( '/^shdiag-[0-9a-f]{12}$/', (string) $report['correlation'] );

		/* A different failure state changes the code; the same state reproduces it. */
		$this->use_configuration( $this->valid_configuration( array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => null ) ) );
		$invalid_report = $this->get( '/songhealth/v1/diagnostics' )->get_data();
		$this->assertNotSame( $report['correlation'], $invalid_report['correlation'] );
		$this->assertNotSame( 'ok', $invalid_report['status'] );

		$again = $this->get( '/songhealth/v1/diagnostics' )->get_data();
		$this->assertSame( $invalid_report['correlation'], $again['correlation'], 'the code is deterministic for the same state' );
	}

	/** @test */
	public function test_diagnostics_authorization_is_re_decided_on_the_next_request() {
		$this->use_valid_configuration();

		wp_set_current_user( $this->staff['administrator'] );
		$this->assertSame( 200, $this->get( '/songhealth/v1/diagnostics' )->get_status() );

		/*
		 * Demotion takes effect on the next request: the role change is
		 * committed, then the next request re-establishes the actor from
		 * the stored identity exactly as a real request does (a fresh
		 * actor object — clearing the current actor first — because a
		 * same-ID re-establishment reuses the in-memory object). No cached
		 * authority survives.
		 */
		wp_update_user( array( 'ID' => $this->staff['administrator'], 'role' => CapabilityMap::ROLE_VIEWER ) );
		wp_set_current_user( 0 );
		wp_set_current_user( $this->staff['administrator'] );
		$this->assertSame( 403, $this->get( '/songhealth/v1/diagnostics' )->get_status() );

		wp_update_user( array( 'ID' => $this->staff['administrator'], 'role' => CapabilityMap::ROLE_ADMINISTRATOR ) );
		wp_set_current_user( 0 );
		wp_set_current_user( $this->staff['administrator'] );
		$this->assertSame( 200, $this->get( '/songhealth/v1/diagnostics' )->get_status() );
	}

	/** @test */
	public function test_operator_evidence_is_bounded_and_actionable_without_any_value() {
		$this->use_configuration( $this->valid_configuration( array( 'SONGHEALTH_PUBLIC_ORIGIN' => 'ftp://example.org' ) ) );

		$evidence = StartupValidator::operator_evidence();
		$this->assertSame( 'invalid', $evidence['status'] );
		$this->assertSame( StartupValidator::correlation_code(), $evidence['correlation'] );

		/* Names the setting key and the corrective category; carries nothing else. */
		$this->assertSame(
			'configuration: invalid [public_origin=origin_scheme_unsafe]',
			$evidence['summary']
		);

		/* The wp-admin channel renders the same bounded line for the authorized actor only. */
		wp_set_current_user( $this->staff['administrator'] );
		$notice = $this->render_admin_evidence();
		$this->assertStringContainsString( (string) $evidence['correlation'], $notice );
		$this->assertStringContainsString( 'public_origin=origin_scheme_unsafe', $notice );

		wp_set_current_user( $this->staff[ CapabilityMap::ROLE_VIEWER ] );
		$this->assertSame( '', $this->render_admin_evidence(), 'no evidence to an unauthorized actor' );

		/* A valid startup renders nothing at all. */
		$this->use_valid_configuration();
		wp_set_current_user( $this->staff['administrator'] );
		$this->assertSame( '', $this->render_admin_evidence() );
	}

	/** @test */
	public function test_no_surface_of_this_batch_discloses_any_forbidden_class() {
		/*
		 * Seed protected state a disclosure would leak: a real sentinel
		 * signing key, a sentinel protected record, and a sentinel CMS
		 * identity. The configuration is then invalid, which is the state
		 * most likely to reach for a value while reporting a failure.
		 */
		$this->use_valid_configuration();
		$created = $this->create_tracked( FoundationTypes::DOCUMENT_RESOURCE, self::SENTINEL_RECORD );
		$this->assertIsArray( $created );

		$this->use_configuration( $this->valid_configuration( array( 'SONGHEALTH_ENVIRONMENT' => 'staging' ) ) );

		/* Every output this batch can produce, anonymous and authorized. */
		wp_set_current_user( 0 );
		$outputs = array(
			$this->get( '/songhealth/v1/health' ),
			$this->get( '/songhealth/v1/diagnostics' ),
			$this->get( '/songhealth/v1/resources/basic-page/00000000-0000-7000-8000-000000000000' ),
			$this->get( '/songhealth/v1/resources?type=basic-page' ),
			$this->get( '/songhealth/v1/documents/00000000-0000-7000-8000-000000000000/binary' ),
		);
		wp_set_current_user( $this->staff['administrator'] );
		$outputs[] = $this->get( '/songhealth/v1/health' );
		$outputs[] = $this->get( '/songhealth/v1/diagnostics' );

		$evidence = StartupValidator::operator_evidence();
		$encoded  = wp_json_encode( $evidence );
		foreach ( $outputs as $response ) {
			$encoded .= (string) wp_json_encode( $response->get_data() );
			$encoded .= (string) wp_json_encode( $response->get_headers() );
		}
		wp_set_current_user( $this->staff['administrator'] );
		$encoded .= $this->render_admin_evidence();

		/*
		 * The forbidden classes, each seeded with a distinctive sentinel:
		 * secret values, database credentials, installation paths, the
		 * database table prefix (raw-query vocabulary), protected record
		 * content, CMS user identity, platform versions (unnecessary
		 * environment detail), and stack traces.
		 */
		$forbidden = array(
			self::SENTINEL_KEY,
			self::SENTINEL_RECORD,
			self::SENTINEL_LOGIN,
			(string) DB_USER,
			(string) DB_PASSWORD,
			(string) DB_NAME,
			(string) ABSPATH,
			$this->table_prefix(),
			phpversion(),
			get_bloginfo( 'version' ),
			'Stack trace',
			'Exception',
			'SELECT ',
			'songhealth_public_id_registry',
		);

		foreach ( $forbidden as $needle ) {
			if ( '' === $needle ) {
				continue;
			}
			$this->assertStringNotContainsString( $needle, $encoded, "the forbidden class '{$this->forbidden_label( $needle )}' must never appear" );
		}
	}

	/** @test */
	public function test_the_startup_gate_never_touches_non_songhealth_surfaces_or_updates() {
		$this->use_valid_configuration();
		$created = $this->create_tracked( FoundationTypes::BASIC_PAGE, 'T048 Update Preservation Fixture' );
		$this->assertIsArray( $created );
		$public_id = (string) $created['public_id'];

		$this->use_configuration( $this->valid_configuration( array( 'SONGHEALTH_PREVIEW_SIGNING_KEY' => 'short' ) ) );

		/*
		 * Ordinary updates of an already-identified resource keep working
		 * while startup validation holds: the identity is untouched and no
		 * new acceptance is attempted (FR-005).
		 */
		wp_update_post(
			array(
				'ID'         => (int) $created['post_id'],
				'post_title' => 'T048 Update Preservation Fixture (retitled)',
			)
		);
		$this->assertSame( $public_id, (string) PublicIdRegistry::public_id_for( $created['resource_type'], (int) $created['post_id'] ) );

		/*
		 * A non-Songhealth REST surface is not this gate's boundary: the
		 * anonymous native index keeps its contained (Songhealth-only)
		 * shape — containment still applies — instead of the outage class.
		 */
		$index = $this->get( '/' );
		$this->assertSame( 200, $index->get_status() );
		$this->assertSame( array( Routes::ROUTE_NAMESPACE ), $index->get_data()['namespaces'] );
	}

	/**
	 * The Cache-Control directive of a response, normalized.
	 *
	 * @param WP_REST_Response $response Response.
	 * @return string
	 */
	private function cache_control( $response ) {
		$headers = $response->get_headers();
		$value   = (string) ( $headers['Cache-Control'] ?? '' );
		return strtolower( trim( $value ) );
	}

	/**
	 * The X-Content-Type-Options directive of a response, normalized.
	 *
	 * @param WP_REST_Response $response Response.
	 * @return string
	 */
	private function nosniff( $response ) {
		$headers = $response->get_headers();
		$value   = (string) ( $headers['X-Content-Type-Options'] ?? '' );
		return strtolower( trim( $value ) );
	}

	/**
	 * Capture the wp-admin evidence channel output.
	 *
	 * @return string
	 */
	private function render_admin_evidence() {
		ob_start();
		StartupValidator::render_admin_evidence();
		return (string) ob_get_clean();
	}

	/**
	 * The declared setting key for an environment variable name.
	 *
	 * @param string $environment_key Environment variable name.
	 * @return string
	 */
	private function setting_key( $environment_key ) {
		return strtolower( str_replace( 'SONGHEALTH_', '', $environment_key ) );
	}

	/**
	 * The disposable test database table prefix.
	 *
	 * @return string
	 */
	private function table_prefix() {
		global $table_prefix;
		return (string) $table_prefix;
	}

	/**
	 * A short label for a forbidden sentinel, so failures read as classes.
	 *
	 * @param string $needle Sentinel value.
	 * @return string
	 */
	private function forbidden_label( $needle ) {
		if ( $needle === self::SENTINEL_KEY ) {
			return 'secret value';
		}
		if ( $needle === self::SENTINEL_RECORD ) {
			return 'protected record content';
		}
		if ( $needle === self::SENTINEL_LOGIN ) {
			return 'CMS user identity';
		}
		if ( $needle === (string) ABSPATH ) {
			return 'sensitive path';
		}
		if ( $needle === $this->table_prefix() ) {
			return 'raw-query vocabulary';
		}
		if ( $needle === phpversion() ) {
			return 'platform version detail';
		}
		return 'forbidden value';
	}
}
