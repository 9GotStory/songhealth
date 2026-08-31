<?php
/**
 * Preview contract tests (Delivery 002, T031 / US2).
 *
 * Proves the authenticated Preview boundary against the live REST surface:
 * valid grant behavior, signature/integrity, expiry, purpose, audience,
 * resource, revision, and user binding, active WordPress session, fresh
 * current authorization, neutral denial, the bounded safe candidate
 * projection, the required confidentiality headers, and revocation effective
 * on the next request (FR-016, FR-017; contracts/preview.md; SC-005).
 *
 * EXPECTED RED before T034/T035: the Preview controller and grant do not
 * exist, so every case fails on the missing classes or on the pre-controller
 * neutral handler — not through test-syntax or fixture errors.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-016,
 * FR-017; specs/002-headless-wordpress-foundation/contracts/preview.md;
 * specs/002-headless-wordpress-foundation/data-model.md §Preview Context;
 * research.md §8.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Preview\PreviewController;
use SonghealthCore\Preview\PreviewGrant;
use SonghealthCore\Rest\NeutralResponse;
use SonghealthCore\Rest\Routes;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_REST_Request;
use WP_REST_Response;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group preview
 * @group us2
 */
class PreviewContractTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** The approved public React origin used for the supplemental CSRF origin defense. */
	const APPROVED_ORIGIN = 'http://127.0.0.1:4173';

	/** Sentinel values that must never survive into any Preview response. */
	const SENTINEL_META_KEY   = '_songhealth_preview_sentinel';
	const SENTINEL_META_VALUE = 'SENTINEL-PREVIEW-PROTECTED-2c4a';

	/** @var int Editor actor for the authorized path. */
	private $editor = 0;

	public function set_up() {
		parent::set_up();

		/*
		 * The Preview boundary reads its configuration through the lifecycle
		 * accessor, which memoizes per request. The test supplies the complete
		 * valid server configuration before the first access and resets the
		 * memo so each suite run reads exactly this environment.
		 */
		putenv( 'SONGHEALTH_ENVIRONMENT=development' );
		putenv( 'SONGHEALTH_PUBLIC_ORIGIN=' . self::APPROVED_ORIGIN );
		putenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY=T031-contract-verification-signing-key-0123456789abcdef' );
		$reset = new \ReflectionProperty( \SonghealthCore\Plugin::class, 'configuration' );
		$reset->setAccessible( true );
		$reset->setValue( null, null );

		$this->editor = $this->ensure_user( 'preview_contract_editor', 'songhealth_editor' );
		wp_set_current_user( 0 );
	}

	/**
	 * Ensure a staff fixture exists exactly once, in its intended state.
	 *
	 * The creation service commits its bounded transaction, which also commits
	 * the test framework's isolation transaction for its own rows; fixture
	 * users created by an earlier test of the same suite therefore survive
	 * that test's rollback, together with any mid-test role, scope, or
	 * account-status mutation. Re-creating unconditionally would collide on
	 * the unique login, so an existing fixture is looked up, reused, and
	 * re-normalized to its intended state.
	 *
	 * @param string $login Fixture login.
	 * @param string $role  Songhealth role slug.
	 * @return int User ID.
	 */
	private function ensure_user( $login, $role ) {
		$existing = get_user_by( 'slug', $login );
		$user_id  = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => $login,
					'role'       => $role,
				)
			);

		wp_update_user( array( 'ID' => $user_id, 'role' => $role ) );
		update_user_meta( $user_id, CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );
		delete_user_meta( $user_id, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS );
		return $user_id;
	}

	public function tear_down() {
		wp_set_current_user( 0 );
		unset( $_SERVER['HTTP_ORIGIN'] );
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
	 * Create an accepted Draft Basic Page fixture with sentinel internals.
	 *
	 * @param string $status WordPress post status.
	 * @param array  $args   Optional overrides.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $status = 'draft', $args = array() ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'    => FoundationTypes::BASIC_PAGE,
				'post_title'   => isset( $args['title'] ) ? $args['title'] : 'Preview Contract Fixture',
				'post_name'    => isset( $args['post_name'] ) ? $args['post_name'] : 'preview-contract-fixture',
				'post_content' => isset( $args['content'] ) ? $args['content'] : '<p>Candidate working body copy.</p>',
				'post_status'  => $status,
				'post_author'  => $this->editor,
			)
		);
		$this->assertIsArray( $created, 'fixture creation must succeed through the accepted boundary' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		update_post_meta( (int) $created['post_id'], self::SENTINEL_META_KEY, self::SENTINEL_META_VALUE );
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_SUMMARY, 'Candidate working summary.' );
		return $created;
	}

	/**
	 * Create an accepted Document Resource Draft fixture.
	 *
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Preview Contract Document',
				'post_name'   => 'preview-contract-document',
				'post_status' => 'draft',
				'post_author' => $this->editor,
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );
		update_post_meta( (int) $created['post_id'], self::SENTINEL_META_KEY, self::SENTINEL_META_VALUE );
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_DOCUMENT_DATE, '2026-08-31' );
		return $created;
	}

	/**
	 * Mint a grant through the authorized initiation path for the current user.
	 *
	 * @param int    $post_id Record to preview.
	 * @param int    $user_id Actor the initiation runs as.
	 * @return array{target: string, grant: string}
	 */
	private function initiate( $post_id, $user_id ) {
		$post          = get_post( $post_id );
		$resource_type = null === $post ? '' : (string) FoundationTypes::resource_type_for( $post->post_type );

		wp_set_current_user( $user_id );
		$target = PreviewController::initiation_target( $post_id );
		$this->assertIsString( $target, 'the authorized initiation produces a preview target' );
		$this->assertStringStartsWith( self::APPROVED_ORIGIN . '/preview/' . $resource_type . '/', $target );

		/*
		 * The handoff travels in the URL fragment: no query string exists at
		 * all, so the bounded navigation leaves no server-side trace.
		 */
		$this->assertNull( wp_parse_url( $target, PHP_URL_QUERY ), 'the initiation URL carries no query string' );
		$fragment = (string) wp_parse_url( $target, PHP_URL_FRAGMENT );
		$parts    = array();
		parse_str( $fragment, $parts );
		$this->assertArrayHasKey( 'g', $parts );
		$this->assertNotSame( '', $parts['g'] );
		$this->assertArrayHasKey( 'n', $parts, 'the handoff carries the supplemental platform nonce' );

		return array(
			'target' => $target,
			'grant'  => (string) $parts['g'],
			'nonce'  => (string) $parts['n'],
		);
	}

	/**
	 * Issue one Preview retrieval request through the live REST surface.
	 *
	 * @param string $type      Public resource type.
	 * @param string $public_id Record identifier.
	 * @param string $grant     Grant token (omit to send none).
	 * @param array  $headers   Explicit request headers.
	 * @return WP_REST_Response
	 */
	private function preview_request( $type, $public_id, $grant = '', $headers = array() ) {
		$request = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/' . $type . '/' . rawurlencode( $public_id )
		);
		if ( '' !== $grant ) {
			$request->set_param( 'grant', $grant );
		}
		foreach ( $headers as $name => $value ) {
			$request->set_header( $name, $value );
			$_SERVER[ 'HTTP_' . strtoupper( str_replace( '-', '_', $name ) ) ] = $value;
		}
		if ( ! isset( $headers['Origin'] ) && ! isset( $headers['Referer'] ) ) {
			$_SERVER['HTTP_ORIGIN'] = self::APPROVED_ORIGIN;
			$request->set_header( 'Origin', self::APPROVED_ORIGIN );
		}
		$response = rest_do_request( $request );
		foreach ( array_keys( $headers ) as $name ) {
			unset( $_SERVER[ 'HTTP_' . strtoupper( str_replace( '-', '_', $name ) ) ] );
		}
		if ( ! isset( $headers['Origin'] ) && ! isset( $headers['Referer'] ) ) {
			unset( $_SERVER['HTTP_ORIGIN'] );
		}
		return $response;
	}

	/**
	 * Assert no value anywhere in a projection equals an internal identifier.
	 *
	 * A substring match on the encoded JSON would be satisfied coincidentally
	 * by identifier characters inside Public IDs, so every value is compared
	 * as a whole value instead (the accepted US1 discipline).
	 *
	 * @param mixed $payload Projection to walk.
	 * @param int   $post_id Internal post ID that must never appear.
	 * @return void
	 */
	private function assert_no_internal_id_values( $payload, $post_id ) {
		if ( is_array( $payload ) ) {
			foreach ( $payload as $value ) {
				$this->assert_no_internal_id_values( $value, $post_id );
			}
			return;
		}
		if ( is_object( $payload ) ) {
			foreach ( get_object_vars( $payload ) as $value ) {
				$this->assert_no_internal_id_values( $value, $post_id );
			}
			return;
		}
		$this->assertNotSame( (string) $post_id, is_scalar( $payload ) ? (string) $payload : '', 'the internal post ID never appears as a projection value' );
	}

	/**
	 * The full externally observable contract of one response.
	 *
	 * @param WP_REST_Response $response Response to describe.
	 * @return array
	 */
	private function observable_contract( $response ) {
		return array(
			'status'  => $response->get_status(),
			'body'    => $response->get_data(),
			'cache'   => $response->get_headers()['Cache-Control'] ?? null,
			'robots'  => $response->get_headers()['X-Robots-Tag'] ?? null,
			'nosniff' => $response->get_headers()['X-Content-Type-Options'] ?? null,
		);
	}

	/**
	 * Assert one response is exactly the neutral Preview denial, identical to
	 * the neutral class for an unknown identifier.
	 *
	 * @param WP_REST_Response $response Response under test.
	 * @param string           $public_id Any canonical-shaped identifier for the reference denial.
	 * @return void
	 */
	private function assert_neutral_denial( $response, $public_id = '00000000-0000-7000-8000-000000000000' ) {
		$reference = $this->observable_contract(
			$this->preview_request( 'basic-page', $public_id, 'irrelevant-grant-value' )
		);
		$actual    = $this->observable_contract( $response );
		unset( $reference['body'], $actual['body'] );
		$this->assertSame( 404, $response->get_status() );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'] );
		$this->assertSame(
			$reference,
			$actual,
			'every Preview denial is the identical neutral class: no status, header, or body variation'
		);
		$this->assertSame(
			$this->preview_request( 'basic-page', $public_id, 'irrelevant-grant-value' )->get_data(),
			$response->get_data(),
			'the denial body is byte-identical to the unknown-identifier body'
		);
	}

	/** @test */
	public function test_a_valid_grant_receives_the_bounded_candidate_projection() {
		$page    = $this->create_page();
		$init    = $this->initiate( (int) $page['post_id'], $this->editor );
		$request = $this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] );

		$this->assertSame( 200, $request->get_status(), 'a currently authorized Preview request succeeds' );
		$dto = $request->get_data();
		$this->assertIsArray( $dto );

		/* The bounded candidate DTO is exactly the allowlisted projection. */
		$this->assertEquals(
			array( 'type', 'publicId', 'title', 'canonicalPath', 'summary', 'body' ),
			array_keys( $dto ),
			'the Preview projection carries only the allowlisted candidate fields'
		);
		$this->assertSame( 'basic-page', $dto['type'] );
		$this->assertSame( $page['public_id'], $dto['publicId'] );
		$this->assertSame( 'Preview Contract Fixture', $dto['title'] );
		$this->assertSame( 'Candidate working summary.', $dto['summary'] );
		$this->assertSame( '<p>Candidate working body copy.</p>', $dto['body'] );
		$this->assertSame( '/pages/' . $page['public_id'] . '/preview-contract-fixture', $dto['canonicalPath'] );
	}

	/** @test */
	public function test_the_candidate_projection_never_carries_protected_or_cms_fields() {
		$page       = $this->create_page();
		$reference  = $this->create_document();
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, array( (string) $reference['public_id'] ) );

		$init  = $this->initiate( (int) $page['post_id'], $this->editor );
		$dto   = $this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] )->get_data();
		$bound = wp_json_encode( $dto );

		$this->assertSame( array( $reference['public_id'] ), $dto['documentReferences'], 'candidate references project as stored candidate state' );
		$this->assertStringNotContainsString( self::SENTINEL_META_VALUE, $bound, 'protected meta never projects' );
		$this->assertStringNotContainsString( FoundationTypes::BASIC_PAGE, $bound, 'the internal post type never projects' );
		$this->assertStringNotContainsString( 'draft', $bound, 'the internal lifecycle never projects as a field' );
		$this->assertStringNotContainsString( 'preview_contract_editor', $bound, 'CMS user identity never projects' );
		/*
		 * The internal post ID never appears as a whole value anywhere in the
		 * projection: a plain substring match would be satisfied
		 * coincidentally by identifier characters inside Public IDs, so every
		 * scalar value is compared whole (the accepted US1 discipline).
		 */
		$this->assert_no_internal_id_values( $dto, (int) $page['post_id'] );

		/* The Document Resource projection carries no binary surface (US3 owns it). */
		$document = $this->initiate( (int) $reference['post_id'], $this->editor );
		$document_dto = $this->preview_request( 'document-resource', (string) $reference['public_id'], $document['grant'] )->get_data();
		$this->assertArrayNotHasKey( 'downloadPath', $document_dto, 'the Preview projection adds no binary path' );
		$this->assertSame( '2026-08-31', $document_dto['documentDate'] );
	}

	/** @test */
	public function test_required_confidentiality_headers_are_present_on_success_and_denial() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		$granted = $this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] );
		$this->assertSame( 'private, no-store', $granted->get_headers()['Cache-Control'] ?? null );
		$this->assertSame( 'noindex, nofollow', $granted->get_headers()['X-Robots-Tag'] ?? null );
		$this->assertSame( 'nosniff', $granted->get_headers()['X-Content-Type-Options'] ?? null );

		$denied = $this->preview_request( 'basic-page', (string) $page['public_id'], 'tampered-token' );
		$this->assertStringContainsString( 'no-store', (string) ( $denied->get_headers()['Cache-Control'] ?? '' ) );
	}

	/** @test */
	public function test_integrity_failures_are_the_neutral_denial() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );
		$token = $init['grant'];

		$variants = array(
			'byte-flipped'      => substr( $token, 0, -2 ) . str_repeat( 'A', 2 ),
			'character-swapped' => ( 'a' === $token[0] ? 'b' : 'a' ) . substr( $token, 1 ),
			'truncated'         => substr( $token, 0, 16 ),
			'appended'          => $token . 'extra',
			'leading-space'     => ' ' . $token,
			'padded'            => $token . '==',
			'alternate-alphabet' => str_replace( array( '-', '_' ), array( '+', '/' ), $token ),
			'empty'             => '',
			'random-garbage'    => 'not-a-grant-at-all',
		);

		foreach ( $variants as $label => $variant ) {
			$response = $this->preview_request( 'basic-page', (string) $page['public_id'], $variant );
			$this->assertSame(
				404,
				$response->get_status(),
				"{$label} grant fails closed with the neutral class"
			);
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'], "{$label} is the neutral denial" );
		}

		/* No grant at all. */
		$this->assert_neutral_denial( $this->preview_request( 'basic-page', (string) $page['public_id'] ) );
	}

	/** @test */
	public function test_expired_grants_fail_closed() {
		$page = $this->create_page();
		wp_set_current_user( $this->editor );
		$post = get_post( (int) $page['post_id'] );

		$expired = PreviewGrant::issue(
			$this->editor,
			'basic-page',
			(string) $page['public_id'],
			PreviewGrant::candidate_revision( $post ),
			time() - 10
		);
		$this->assertIsString( $expired );
		$this->assert_neutral_denial( $this->preview_request( 'basic-page', (string) $page['public_id'], $expired ) );
	}

	/** @test */
	public function test_purpose_and_audience_bindings_are_enforced() {
		$page = $this->create_page();
		wp_set_current_user( $this->editor );
		$post = get_post( (int) $page['post_id'] );

		/*
		 * White-box: mint a correctly sealed token whose purpose and audience
		 * are NOT the fixed Preview values. A grant is only ever issued for
		 * the Preview audience and purpose (data-model.md §Preview Context),
		 * so a token claiming any other audience or purpose must not verify,
		 * whatever its signature.
		 */
		$misbound = array(
			'share-purpose' => array( 'k' => 'share', 'a' => 'preview' ),
			'public-audience' => array( 'k' => 'preview', 'a' => 'public' ),
		);
		foreach ( $misbound as $label => $override ) {
			$token = $this->mint_token(
				array_merge(
					array(
						'v' => 1,
						'g' => bin2hex( random_bytes( 8 ) ),
						'u' => $this->editor,
						'r' => 'basic-page',
						'p' => (string) $page['public_id'],
						'c' => PreviewGrant::candidate_revision( $post ),
						'i' => time(),
						'e' => time() + 60,
					),
					$override
				)
			);
			$this->assert_neutral_denial(
				$this->preview_request( 'basic-page', (string) $page['public_id'], $token ),
				(string) $page['public_id']
			);
		}

		/* A wrong-version sealed token fails closed the same way. */
		$wrong_version = $this->mint_token(
			array(
				'v' => 2,
				'g' => bin2hex( random_bytes( 8 ) ),
				'u' => $this->editor,
				'r' => 'basic-page',
				'p' => (string) $page['public_id'],
				'c' => PreviewGrant::candidate_revision( $post ),
				'a' => 'preview',
				'k' => 'preview',
				'i' => time(),
				'e' => time() + 60,
			)
		);
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $wrong_version ),
			(string) $page['public_id']
		);
	}

	/**
	 * Seal a token under the configured Preview signing key (white-box helper).
	 *
	 * @param array $payload Grant payload fields.
	 * @return string Opaque token.
	 */
	private function mint_token( array $payload ) {
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$boxed = sodium_crypto_secretbox( wp_json_encode( $payload ), $nonce, $this->grant_key() );
		return rtrim( strtr( base64_encode( $nonce . $boxed ), '+/', '-_' ), '=' );
	}

	/**
	 * The Preview grant key derived exactly as the grant module derives it.
	 *
	 * @return string 32-byte key material.
	 */
	private function grant_key() {
		return hash( 'sha256', 'songhealth/preview-grant/v1|' . getenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY' ), true );
	}

	/** @test */
	public function test_resource_type_and_identifier_bindings_are_enforced() {
		$page     = $this->create_page();
		$document = $this->create_document();
		$init     = $this->initiate( (int) $page['post_id'], $this->editor );

		/* A Basic Page grant used against the Document Resource route denies. */
		$this->assert_neutral_denial(
			$this->preview_request( 'document-resource', (string) $document['public_id'], $init['grant'] ),
			(string) $document['public_id']
		);
		/* A grant for one record used against another record of the same type denies. */
		$other = $this->create_page( 'draft', array( 'title' => 'Second Fixture', 'post_name' => 'second-fixture' ) );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $other['public_id'], $init['grant'] ),
			(string) $other['public_id']
		);
		/* A malformed or unknown identifier is the same neutral denial. */
		$this->assert_neutral_denial( $this->preview_request( 'basic-page', 'not-a-uuid', $init['grant'], array(), ) );
	}

	/** @test */
	public function test_revision_and_user_bindings_are_enforced() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		/* The candidate moved on: the single-purpose grant no longer applies. */
		wp_update_post(
			array(
				'ID'         => $page['post_id'],
				'post_title' => 'Preview Contract Fixture Revised',
			)
		);
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);

		/* A different authorized staff member cannot use another user's grant. */
		$revised = $this->create_page( 'draft', array( 'title' => 'User Binding Fixture', 'post_name' => 'user-binding-fixture' ) );
		$own     = $this->initiate( (int) $revised['post_id'], $this->editor );
		$publisher = $this->ensure_user( 'preview_contract_publisher', 'songhealth_publisher' );
		wp_set_current_user( $publisher );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $revised['public_id'], $own['grant'] ),
			(string) $revised['public_id']
		);
		/* The bound user's own request still succeeds. */
		wp_set_current_user( $this->editor );
		$granted = $this->preview_request( 'basic-page', (string) $revised['public_id'], $own['grant'] );
		$this->assertSame( 200, $granted->get_status() );
	}

	/** @test */
	public function test_an_active_session_is_required_on_every_request() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		/* Anonymous request carrying a valid grant: the neutral denial. */
		wp_set_current_user( 0 );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);

		/* A non-staff authenticated session is equally denied. */
		$subscriber = $this->ensure_user( 'preview_contract_subscriber', 'subscriber' );
		wp_set_current_user( $subscriber );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);
	}

	/** @test */
	public function test_authorization_is_fresh_and_revocation_hits_the_next_request() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		$this->assertSame(
			200,
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] )->get_status(),
			'the authorized request succeeds first'
		);

		/* Disablement: the next request denies. */
		update_user_meta( $this->editor, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS, \SonghealthCore\Authorization\AuthorizationService::ACCOUNT_DISABLED );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);
		delete_user_meta( $this->editor, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS );

		/* Scope loss: the next request denies. */
		update_user_meta( $this->editor, CapabilityMap::META_MODULE_SCOPE, array( CapabilityMap::MODULE_DOCUMENT_RESOURCE ) );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);
		update_user_meta( $this->editor, CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );

		/* Demotion below the view capability: the next request denies. */
		wp_update_user( array( 'ID' => $this->editor, 'role' => 'subscriber' ) );
		/* The next request re-instantiates its actor from persisted state; wp_set_current_user short-circuits for the already-current ID, so hop via the anonymous actor. */
		wp_set_current_user( 0 );
		wp_set_current_user( $this->editor );
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'] ),
			(string) $page['public_id']
		);
	}

	/** @test */
	public function test_b03_origin_boundaries_are_exact_parsed_origin_comparisons() {
		/*
		 * G04-B03: approved origins here are the configured public React
		 * origin (http://127.0.0.1:4173) and the WordPress home origin
		 * (http://example.org). Every comparison is on the parsed origin —
		 * scheme, host, and effective port exactly — never on text prefixes.
		 */
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		$allowed = array(
			'exact origin'                      => array( 'Origin' => self::APPROVED_ORIGIN ),
			'exact referer with a path'         => array( 'Referer' => self::APPROVED_ORIGIN . '/preview/somewhere/else' ),
			'referer on the wordpress origin'   => array( 'Referer' => 'http://example.org/wp-admin/post.php' ),
			'explicit default port equivalence' => array( 'Origin' => 'http://example.org:80' ),
		);
		foreach ( $allowed as $label => $headers ) {
			$response = $this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'], $headers );
			$this->assertSame( 200, $response->get_status(), "{$label} is the exact approved origin" );
		}

		$rejected = array(
			'suffix-host confusion'        => array( 'Origin' => 'http://127.0.0.1.evil.test:4173' ),
			'hostname-suffix confusion'    => array( 'Referer' => 'http://evil-127.0.0.1.test:4173/anything' ),
			'path-prefix confusion'        => array( 'Referer' => 'http://evil.test/' . self::APPROVED_ORIGIN ),
			'userinfo disguising the host' => array( 'Origin' => 'http://127.0.0.1@evil.test:4173' ),
			'userinfo on an exact host'    => array( 'Origin' => 'http://user:secret@127.0.0.1:4173' ),
			'scheme mismatch'              => array( 'Origin' => 'https://127.0.0.1:4173' ),
			'explicit port mismatch'       => array( 'Origin' => 'http://127.0.0.1:4174' ),
			'nondefault port on wordpress' => array( 'Referer' => 'http://example.org:8080/wp-admin/' ),
			'malformed origin (text)'      => array( 'Origin' => 'not-a-url' ),
			'malformed origin (no host)'   => array( 'Origin' => 'http://' ),
			'malformed referer'            => array( 'Referer' => '::::' ),
			'origin carrying a path'       => array( 'Origin' => self::APPROVED_ORIGIN . '/wp-admin' ),
			'referer with a fragment'      => array( 'Referer' => self::APPROVED_ORIGIN . '/path#fragment' ),
			'non-http scheme'              => array( 'Origin' => 'ftp://127.0.0.1:4173' ),
		);
		foreach ( $rejected as $label => $headers ) {
			$response = $this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'], $headers );
			$this->assertSame( 404, $response->get_status(), "{$label} fails closed" );
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'], "{$label} is the neutral denial" );
			$this->assertSame( 'private, no-store', $response->get_headers()['Cache-Control'] ?? null, "{$label} keeps the Preview confidentiality posture" );
			$this->assertSame( 'noindex, nofollow', $response->get_headers()['X-Robots-Tag'] ?? null, "{$label} keeps the crawler posture" );
		}
	}

	/** @test */
	public function test_nonce_and_origin_defenses_supplement_but_never_replace_authorization() {
		$page = $this->create_page();
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		/* The initiation's own handoff nonce is the platform's control for the session's REST request. */
		$with_handoff_nonce = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/basic-page/' . rawurlencode( (string) $page['public_id'] )
		);
		$with_handoff_nonce->set_param( 'grant', $init['grant'] );
		$with_handoff_nonce->set_param( '_wpnonce', $init['nonce'] );
		$with_handoff_nonce->set_header( 'Origin', self::APPROVED_ORIGIN );
		$_SERVER['HTTP_ORIGIN'] = self::APPROVED_ORIGIN;
		$handoff_response       = rest_do_request( $with_handoff_nonce );
		unset( $_SERVER['HTTP_ORIGIN'] );
		$this->assertSame( 200, $handoff_response->get_status(), 'the handoff nonce rides along and adds nothing but CSRF defense' );

		/* A missing Origin/Referer denies even with session and valid grant. */
		$bare = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/preview/basic-page/' . rawurlencode( (string) $page['public_id'] )
		);
		$bare->set_param( 'grant', $init['grant'] );
		$this->assertSame( 404, rest_do_request( $bare )->get_status(), 'a request with no origin evidence fails closed' );

		/* An unapproved origin denies the same way. */
		$this->assert_neutral_denial(
			$this->preview_request( 'basic-page', (string) $page['public_id'], $init['grant'], array( 'Origin' => 'https://attacker.example' ) ),
			(string) $page['public_id']
		);

		/* An invalid nonce denies even with an approved origin. */
		$this->assert_neutral_denial(
			$this->preview_request(
				'basic-page',
				(string) $page['public_id'],
				$init['grant'],
				array(
					'Origin'    => self::APPROVED_ORIGIN,
					'X-WP-Nonce' => 'definitely-not-a-valid-nonce',
				)
			),
			(string) $page['public_id']
		);

		/* A valid nonce with an approved origin still succeeds; the nonce adds nothing. */
		$with_nonce = $this->preview_request(
			'basic-page',
			(string) $page['public_id'],
			$init['grant'],
			array(
				'Origin'    => self::APPROVED_ORIGIN,
				'X-WP-Nonce' => wp_create_nonce( 'wp_rest' ),
			)
		);
		$this->assertSame( 200, $with_nonce->get_status() );
	}

	/** @test */
	public function test_initiation_is_itself_a_freshly_authorized_privileged_action() {
		$page = $this->create_page();

		/* Anonymous initiation produces nothing. */
		wp_set_current_user( 0 );
		$this->assertNull( PreviewController::initiation_target( (int) $page['post_id'] ) );

		/* An out-of-scope actor produces nothing. */
		$scoped = $this->ensure_user( 'preview_contract_scoped', 'songhealth_editor' );
		update_user_meta( $scoped, CapabilityMap::META_MODULE_SCOPE, array( CapabilityMap::MODULE_DOCUMENT_RESOURCE ) );
		$this->assertNull( PreviewController::initiation_target( (int) $page['post_id'] ) );

		/* An unsupported object produces nothing. */
		wp_set_current_user( $this->editor );
		$this->assertNull( PreviewController::initiation_target( 990002 ) );

		/*
		 * A quarantined internal candidate — a supported-type row created
		 * outside the creation service — has no identity and no Preview.
		 */
		$this->assertSame( 0, wp_insert_post(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Raw Quarantined Candidate',
				'post_status' => 'draft',
			)
		), 'raw Core insertion of a supported type is refused before any write' );

		/* Disablement stops initiation on the next call. */
		update_user_meta( $this->editor, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS, \SonghealthCore\Authorization\AuthorizationService::ACCOUNT_DISABLED );
		$this->assertNull( PreviewController::initiation_target( (int) $page['post_id'] ) );
	}

	/** @test */
	public function test_the_grant_carries_no_content_and_no_credentials() {
		$page = $this->create_page(
			'draft',
			array(
				'title'   => 'Grant Payload Secrecy Fixture',
				'content' => '<p>Grant payload secrecy body copy.</p>',
			)
		);
		$init = $this->initiate( (int) $page['post_id'], $this->editor );

		$this->assertIsString( $init['grant'] );
		/* The opaque token itself reveals nothing as text. */
		$this->assertStringNotContainsString( 'Grant Payload Secrecy', $init['grant'] );
		$this->assertStringNotContainsString( 'body copy', $init['grant'] );
		$this->assertStringNotContainsString( 'preview_contract_editor', $init['grant'] );

		/* Opened under the signing key, the payload carries binding context only. */
		$raw     = PreviewGrant::open_for_audit( $init['grant'] );
		$this->assertIsArray( $raw, 'the audit helper opens a token sealed under the configured key' );
		$encoded = wp_json_encode( $raw );
		$this->assertStringNotContainsString( 'Grant Payload Secrecy', $encoded );
		$this->assertStringNotContainsString( 'body copy', $encoded );
		$this->assertStringNotContainsString( 'Candidate working summary', $encoded );
		$this->assertSame( 'preview', $raw['k'], 'the purpose is the fixed preview value' );
		$this->assertSame( 'preview', $raw['a'], 'the audience is the fixed preview value' );
		$this->assertSame( $page['public_id'], $raw['p'] );
		$this->assertSame( $this->editor, (int) $raw['u'] );
		$this->assertLessThanOrEqual( time() + PreviewGrant::TTL_SECONDS, (int) $raw['e'] );
		$this->assertGreaterThan( time(), (int) $raw['e'], 'the grant is short-lived' );
	}

	/** @test */
	public function test_preview_of_an_accepted_draft_and_a_published_record_both_project() {
		$draft      = $this->create_page();
		$published  = $this->create_page( 'publish', array( 'title' => 'Published Fixture', 'post_name' => 'published-fixture' ) );

		foreach ( array( $draft, $published ) as $fixture ) {
			$init = $this->initiate( (int) $fixture['post_id'], $this->editor );
			$this->assertSame(
				200,
				$this->preview_request( 'basic-page', (string) $fixture['public_id'], $init['grant'] )->get_status(),
				'Preview is the authorized candidate view whatever the lifecycle state'
			);
		}

		/* A live mapping stays the first prerequisite: the identity is retained. */
		wp_update_post(
			array(
				'ID'         => $published['post_id'],
				'post_title' => 'Published Fixture Retitled',
				'post_name'  => 'published-fixture-retitled',
			)
		);
		$this->assertSame(
			$published['public_id'],
			PublicIdRegistry::public_id_for( 'basic-page', (int) $published['post_id'] ),
			'Preview never mutates identity through the lifecycle'
		);
	}
}
