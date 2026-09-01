<?php
/**
 * Protected-binary contract tests (Delivery 002, T039 / US3).
 *
 * Proves the mediated anonymous binary delivery boundary against the live
 * REST surface and the real filesystem: unknown and every ineligible state,
 * eligible delivery, publish → deliver → revoke → retry, non-elevating
 * public references, broken relationships, unsafe metadata/type, bounded
 * range behavior, neutral equivalence, and fresh owning-Document eligibility
 * on every anonymous request (FR-018–FR-020; contracts/protected-binary.md;
 * SC-004).
 *
 * EXPECTED RED before T042/T043: the attachment relationship module and the
 * binary controller do not exist, and the pre-controller binary handler
 * answers the neutral class for every case — so every delivery expectation
 * fails, not the ineligible ones.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-018–
 * FR-020; contracts/protected-binary.md; data-model.md §Document Resource
 * Foundation Record; quickstart.md §6.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Binary\BinaryController;
use SonghealthCore\Binary\ProtectedAttachment;
use SonghealthCore\Content\FoundationTypes;
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
 * @group binary
 * @group us3
 */
class ProtectedBinaryContractTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** Sentinel body bytes used for every fixture file. */
	const FIXTURE_BYTES = "%PDF-1.4\n%songhealth-protected-fixture-bytes\n%%EOF\n";

	/** @var int Editor actor owning the fixtures. */
	private $editor = 0;

	/** @var int[] Attachment posts created outside the creation service. */
	private $attachments = array();

	public function set_up() {
		parent::set_up();

		/*
		 * The Preview binary case drives the accepted Preview initiation,
		 * which requires the valid lifecycle configuration; supply it before
		 * the first access and reset the per-request memo.
		 */
		putenv( 'SONGHEALTH_ENVIRONMENT=development' );
		putenv( 'SONGHEALTH_PUBLIC_ORIGIN=http://127.0.0.1:4173' );
		putenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY=T039-contract-verification-signing-key-0123456789abcdef' );
		$reset = new \ReflectionProperty( \SonghealthCore\Plugin::class, 'configuration' );
		$reset->setAccessible( true );
		$reset->setValue( null, null );

		$existing = get_user_by( 'slug', 'binary_contract_editor' );
		$this->editor = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => 'binary_contract_editor',
					'role'       => 'songhealth_editor',
				)
			);
		wp_update_user( array( 'ID' => $this->editor, 'role' => 'songhealth_editor' ) );
		update_user_meta( $this->editor, \SonghealthCore\Authorization\CapabilityMap::META_MODULE_SCOPE, \SonghealthCore\Authorization\CapabilityMap::modules() );
		delete_user_meta( $this->editor, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS );

		wp_set_current_user( 0 );
	}

	public function tear_down() {
		wp_set_current_user( 0 );
		parent::tear_down();

		foreach ( $this->attachments as $attachment_id ) {
			wp_delete_attachment( $attachment_id, true );
		}
		$this->attachments = array();
		$this->songhealth_delete_tracked_records();

		foreach ( FoundationTypes::supported_types() as $post_type ) {
			FoundationTypes::register_metadata( $post_type );
		}
	}

	/**
	 * Create one accepted Document Resource fixture.
	 *
	 * @param string $status WordPress post status.
	 * @param array  $args  Optional overrides (title, post_name).
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_document( $status = 'draft', $args = array() ) {
		$payload = array(
			'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
			'post_title'  => isset( $args['title'] ) ? $args['title'] : 'Binary Contract Fixture',
			'post_name'   => isset( $args['post_name'] ) ? $args['post_name'] : 'binary-contract-fixture',
			'post_status' => $status,
			'post_author' => $this->editor,
		);
		if ( 'future' === $status ) {
			/* A scheduled record needs a real future date: WordPress collapses a dateless future status to publish. */
			$payload['post_date']     = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );
			$payload['post_date_gmt'] = gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS );
		}
		$created = CreateTimePublicId::create( $payload );
		$this->assertIsArray( $created, 'fixture creation must succeed through the accepted boundary' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		return $created;
	}

	/**
	 * Create an eligible published Document Resource with a valid protected
	 * attachment attached.
	 *
	 * @param array $args Optional document overrides.
	 * @return array{post_id: int, public_id: string, attachment_id: int}
	 */
	private function create_eligible_document( $args = array() ) {
		$document = $this->create_document( 'publish', $args );
		$attached = $this->attach_fixture( (int) $document['post_id'] );
		$this->assertIsArray( $attached );
		return $document + array( 'attachment_id' => (int) $attached['attachment_id'] );
	}

	/**
	 * Attach one real temporary fixture file to a Document Resource.
	 *
	 * @param int    $document_id Document post ID.
	 * @param string $mime        Fixture content type.
	 * @param int    $repeat      Multiplier for the fixture size.
	 * @return array|WP_Error The attachment result.
	 */
	private function attach_fixture( $document_id, $mime = 'application/pdf', $repeat = 1, $content = null ) {
		$tmp = tempnam( sys_get_temp_dir(), 'shb' );
		file_put_contents( $tmp, null === $content ? str_repeat( self::FIXTURE_BYTES, $repeat ) : $content );

		$result = ProtectedAttachment::attach(
			$document_id,
			array(
				'tmp_name' => $tmp,
				'name'     => 'sensitive-upload-filename.pdf',
				'type'     => $mime,
				'size'     => (int) filesize( $tmp ),
			)
		);
		if ( file_exists( $tmp ) ) {
			unlink( $tmp ); /* attach() takes ownership by renaming the file on success. */
		}
		if ( is_array( $result ) ) {
			$this->attachments[] = (int) $result['attachment_id'];
		}
		return $result;
	}

	/**
	 * Issue one anonymous binary request through the live REST surface.
	 *
	 * @param string $public_id Public ID to request.
	 * @param array  $headers   Explicit request headers.
	 * @return WP_REST_Response
	 */
	private function get_binary( $public_id, $headers = array() ) {
		$request = new WP_REST_Request(
			'GET',
			'/' . Routes::ROUTE_NAMESPACE . '/documents/' . rawurlencode( $public_id ) . '/binary'
		);
		foreach ( $headers as $name => $value ) {
			$request->set_header( $name, $value );
		}
		return rest_do_request( $request );
	}

	/**
	 * The full externally observable contract of one denial, for equivalence.
	 *
	 * @param WP_REST_Response $response Response to describe.
	 * @return array
	 */
	private function observable_contract( $response ) {
		return array(
			'status'  => $response->get_status(),
			'body'    => $response->get_data(),
			'cache'   => $response->get_headers()['Cache-Control'] ?? null,
			'nosniff' => $response->get_headers()['X-Content-Type-Options'] ?? null,
		);
	}

	/** @test */
	public function test_an_eligible_document_delivers_its_protected_bytes_with_safe_headers() {
		$document = $this->create_eligible_document( array( 'title' => 'Binary Contract Fixture', 'post_name' => 'binary-contract-fixture' ) );

		$response = $this->get_binary( (string) $document['public_id'] );
		$this->assertSame( 200, $response->get_status(), 'a currently eligible document delivers its bytes anonymously' );
		$this->assertSame( str_repeat( self::FIXTURE_BYTES, 1 ), $response->get_data(), 'the delivered bytes are the stored protected bytes' );

		$headers = $response->get_headers();
		$this->assertSame( 'application/pdf', $headers['Content-Type'] );
		$this->assertSame( 'nosniff', $headers['X-Content-Type-Options'] );
		$this->assertSame( (string) strlen( str_repeat( self::FIXTURE_BYTES, 1 ) ), (string) $headers['Content-Length'] );
		$this->assertStringContainsString( 'private', (string) $headers['Cache-Control'] );
		$this->assertStringContainsString( 'no-store', (string) $headers['Cache-Control'] );

		/* Identity is the Public ID: no attachment id, path, upload URL, or stored filename appears. */
		$disposition = (string) ( $headers['Content-Disposition'] ?? '' );
		$this->assertStringContainsString( 'attachment', $disposition );
		$this->assertStringNotContainsString( 'sensitive-upload-filename', $disposition, 'the upload filename is never the public filename' );
		$this->assertStringNotContainsString( (string) $document['attachment_id'], $disposition );
		$this->assertStringNotContainsString( 'uploads', $disposition );
	}

	/** @test */
	public function test_every_ineligible_and_unknown_condition_is_one_neutral_class() {
		$eligible = $this->create_eligible_document();
		$reference = (string) $eligible['public_id'];

		/* Freshly ineligible variants of the same record. */
		$draft     = $this->create_document( 'draft' );
		$this->attach_fixture( (int) $draft['post_id'] );
		$hidden    = $this->create_document( 'private' );
		$this->attach_fixture( (int) $hidden['post_id'] );
		$pending   = $this->create_document( 'pending' );
		$this->attach_fixture( (int) $pending['post_id'] );
		$scheduled = $this->create_document( 'future' );
		$this->attach_fixture( (int) $scheduled['post_id'] );

		$withdrawn = $this->create_eligible_document();
		update_post_meta( (int) $withdrawn['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$invisible = $this->create_eligible_document();
		update_post_meta( (int) $invisible['post_id'], FoundationTypes::META_VISIBILITY, FoundationTypes::VISIBILITY_HIDDEN );

		$identityless = $this->create_eligible_document();
		delete_post_meta( (int) $identityless['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID );

		$conditions = array(
			'unknown canonical'   => '00000000-0000-7000-8000-000000000000',
			'malformed'           => 'not-a-uuid',
			'uppercase'           => strtoupper( $reference ),
			'draft'               => (string) $draft['public_id'],
			'hidden status'       => (string) $hidden['public_id'],
			'unpublished pending' => (string) $pending['public_id'],
			'unpublished future'  => (string) $scheduled['public_id'],
			'withdrawn'           => (string) $withdrawn['public_id'],
			'hidden visibility'   => (string) $invisible['public_id'],
			'no attachment meta'  => (string) $identityless['public_id'],
		);

		$reference_contract = $this->observable_contract( $this->get_binary( '00000000-0000-7000-8000-000000000000' ) );
		foreach ( $conditions as $label => $public_id ) {
			$response = $this->get_binary( $public_id );
			$this->assertSame( 404, $response->get_status(), "{$label} fails closed" );
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'], "{$label} is the neutral class" );
			$this->assertSame(
				$reference_contract,
				$this->observable_contract( $response ),
				"{$label}: the denial is externally identical to the unknown-record denial"
			);
		}
	}

	/** @test */
	public function test_publish_deliver_revoke_retry_revokes_on_the_next_request() {
		$document = $this->create_document( 'draft' );
		$this->assertIsArray( $this->attach_fixture( (int) $document['post_id'] ) );
		$public_id = (string) $document['public_id'];

		$this->assertSame( 404, $this->get_binary( $public_id )->get_status(), 'a Draft never delivers, even with a valid attachment' );

		wp_update_post( array( 'ID' => (int) $document['post_id'], 'post_status' => 'publish' ) );
		$this->assertSame( 200, $this->get_binary( $public_id )->get_status(), 'publication makes the same URL deliver' );

		/* Revocation by withdrawal: the retained, previously successful URL denies on the NEXT request. */
		update_post_meta( (int) $document['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$retry = $this->get_binary( $public_id );
		$this->assertSame( 404, $retry->get_status(), 'a retained prior-success URL is re-evaluated every request' );
		$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $retry->get_data()['code'] );

		/* Re-eligibility restores delivery: current state is the only authority. */
		delete_post_meta( (int) $document['post_id'], FoundationTypes::META_WITHDRAWN );
		$this->assertSame( 200, $this->get_binary( $public_id )->get_status(), 'restored eligibility restores delivery' );

		/* Revocation by trash/unpublish behaves the same. */
		wp_update_post( array( 'ID' => (int) $document['post_id'], 'post_status' => 'draft' ) );
		$this->assertSame( 404, $this->get_binary( $public_id )->get_status(), 'returning to Draft revokes the next request' );
	}

	/** @test */
	public function test_a_public_basic_page_reference_never_elevates_document_eligibility() {
		$ineligible_document = $this->create_document( 'draft' );
		$this->assertIsArray( $this->attach_fixture( (int) $ineligible_document['post_id'] ) );

		$withdrawn_document = $this->create_eligible_document();
		update_post_meta( (int) $withdrawn_document['post_id'], FoundationTypes::META_WITHDRAWN, '1' );

		$parent = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Referencing Public Page',
				'post_name'   => 'referencing-public-page',
				'post_status' => 'publish',
				'post_author' => $this->editor,
			)
		);
		$this->assertIsArray( $parent );
		$this->songhealth_track_record( (int) $parent['post_id'] );
		update_post_meta(
			(int) $parent['post_id'],
			FoundationTypes::META_DOCUMENT_REFERENCES,
			array( (string) $ineligible_document['public_id'], (string) $withdrawn_document['public_id'] )
		);
		$this->assertTrue( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $parent['post_id'] ), 'the referencing page itself is eligible' );

		foreach ( array( $ineligible_document, $withdrawn_document ) as $document ) {
			$response = $this->get_binary( (string) $document['public_id'] );
			$this->assertSame( 404, $response->get_status(), 'an eligible public reference never elevates the referenced document' );
			$this->assertSame( NeutralResponse::CODE_NOT_FOUND, $response->get_data()['code'] );
		}
	}

	/** @test */
	public function test_a_broken_attachment_relationship_is_neutral_and_never_eligible() {
		$document = $this->create_eligible_document();
		$public_id = (string) $document['public_id'];
		$this->assertSame( 200, $this->get_binary( $public_id )->get_status() );

		/* The attachment post disappears: the relationship breaks. */
		wp_delete_post( (int) $document['attachment_id'], true );
		$this->assertFalse( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $document['post_id'] ), 'a broken relationship is not publication-valid' );
		$this->assertSame( 404, $this->get_binary( $public_id )->get_status(), 'a broken relationship never delivers' );

		/* The stored file disappears while the record remains. */
		$second = $this->create_eligible_document();
		$stored = ProtectedAttachment::stored_file_for( (int) $second['post_id'] );
		$this->assertIsString( $stored );
		unlink( $stored );
		$this->assertFalse( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $second['post_id'] ) );
		$this->assertSame( 404, $this->get_binary( (string) $second['public_id'] )->get_status(), 'a missing file never delivers' );
	}

	/** @test */
	public function test_unsafe_metadata_and_types_are_rejected_at_attach_and_never_deliver() {
		/*
		 * An unsafe content type is refused at the relationship boundary: the
		 * BYTES decide (content inspection), so the fixture carries genuinely
		 * non-PDF bytes while declaring the safe type — a declared safe label
		 * must never launder unsafe content.
		 */
		$document = $this->create_document( 'publish' );
		$rejected = $this->attach_fixture( (int) $document['post_id'], 'application/pdf', 1, '<html><body>sensitive-upload-filename</body></html>' );
		$this->assertWPError( $rejected, 'unsafe content is refused whatever label it declares' );
		$this->assertSame( 'unsafe_type', $rejected->get_error_code() );
		$this->assertSame( 'unsafe_type', $rejected->get_error_code() );
		$this->assertFalse( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $document['post_id'] ), 'no attachment means no publication validity' );

		/* A tampered meta value pointing at a non-attachment never becomes valid. */
		$tampered = $this->create_eligible_document();
		update_post_meta( (int) $tampered['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $tampered['post_id'] );
		$this->assertFalse( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $tampered['post_id'] ) );
		$this->assertSame( 404, $this->get_binary( (string) $tampered['public_id'] )->get_status() );

		/* A relationship to an attachment owned by another document never delivers for this one. */
		$owner    = $this->create_eligible_document();
		$impersonator = $this->create_document( 'publish' );
		update_post_meta( (int) $impersonator['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $owner['attachment_id'] );
		$this->assertFalse( \SonghealthCore\Eligibility\PublicEligibility::is_eligible( (int) $impersonator['post_id'] ), 'a one-to-one relationship cannot be borrowed' );
		$this->assertSame( 404, $this->get_binary( (string) $impersonator['public_id'] )->get_status() );
		$this->assertSame( 200, $this->get_binary( (string) $owner['public_id'] )->get_status(), 'the owning document still delivers' );
	}

	/** @test */
	public function test_replacement_keeps_the_relationship_one_to_one() {
		$document = $this->create_document( 'publish' );
		$first    = $this->attach_fixture( (int) $document['post_id'] );
		$this->assertIsArray( $first );
		$second   = $this->attach_fixture( (int) $document['post_id'] );
		$this->assertIsArray( $second );

		$this->assertNotSame( (int) $first['attachment_id'], (int) $second['attachment_id'] );
		$this->assertNull( get_post( (int) $first['attachment_id'] ), 'replacing removes the previous attachment record' );
		$this->assertSame( (string) $second['attachment_id'], (string) get_post_meta( (int) $document['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, true ) );
		$this->assertTrue( ProtectedAttachment::relationship_is_valid( get_post( (int) $document['post_id'] ) ), 'exactly one live relationship remains' );

		wp_update_post( array( 'ID' => (int) $document['post_id'], 'post_status' => 'publish' ) );
		$this->assertSame( 200, $this->get_binary( (string) $document['public_id'] )->get_status() );
		$this->assertSame( str_repeat( self::FIXTURE_BYTES, 1 ), $this->get_binary( (string) $document['public_id'] )->get_data(), 'the current file is the delivered file' );
	}

	/** @test */
	public function test_range_requests_are_bounded_and_correct() {
		$document = $this->create_eligible_document();
		$body     = str_repeat( self::FIXTURE_BYTES, 1 );
		$size     = strlen( $body );
		$public_id = (string) $document['public_id'];

		/* A satisfiable single range serves the exact slice. */
		$ranged = $this->get_binary( $public_id, array( 'Range' => 'bytes=5-14' ) );
		$this->assertSame( 206, $ranged->get_status(), 'a satisfiable single range is served partially' );
		$this->assertSame( substr( $body, 5, 10 ), $ranged->get_data() );
		$this->assertSame( "bytes 5-14/{$size}", $ranged->get_headers()['Content-Range'] );
		$this->assertSame( '10', (string) $ranged->get_headers()['Content-Length'] );

		/* An open-ended range serves to the end. */
		$open = $this->get_binary( $public_id, array( 'Range' => 'bytes=10-' ) );
		$this->assertSame( 206, $open->get_status() );
		$this->assertSame( substr( $body, 10 ), $open->get_data() );

		/* A final-byte range serves one byte. */
		$tail = $this->get_binary( $public_id, array( 'Range' => "bytes=" . ( $size - 1 ) . '-' ) );
		$this->assertSame( 206, $tail->get_status() );
		$this->assertSame( substr( $body, -1 ), $tail->get_data() );

		/* An unsatisfiable start is refused without any bytes. */
		$unsatisfiable = $this->get_binary( $public_id, array( 'Range' => 'bytes=' . $size . '-' ) );
		$this->assertSame( 416, $unsatisfiable->get_status(), 'an unsatisfiable range start is refused' );
		$this->assertSame( "bytes */{$size}", $unsatisfiable->get_headers()['Content-Range'] );
		$this->assertStringNotContainsString( 'PDF', (string) $unsatisfiable->get_data(), 'no bytes leak from an unsatisfiable range' );

		/* Malformed and multi-range requests degrade to the bounded full response. */
		foreach ( array( 'bytes=', 'not-bytes=5-10', "bytes=0-4,10-14", 'bytes=-5' ) as $malformed ) {
			$response = $this->get_binary( $public_id, array( 'Range' => $malformed ) );
			$this->assertSame( 200, $response->get_status(), "a malformed or multi range ({$malformed}) serves the bounded full response" );
			$this->assertSame( $body, $response->get_data() );
		}
	}

	/** @test */
	public function test_b01_reversed_and_boundary_ranges_are_bounded_before_any_partial_response() {
		$document  = $this->create_eligible_document();
		$body      = str_repeat( self::FIXTURE_BYTES, 1 );
		$size      = strlen( $body );
		$public_id = (string) $document['public_id'];

		/*
		 * Every rejected or malformed shape degrades to the bounded FULL
		 * response (the bytes the requester could already obtain) — never a
		 * partial response with a negative length, an invalid Content-Range,
		 * a negative Content-Length, or unintended bytes.
		 */
		$degrades_to_full = array(
			'reversed adjacent' => "bytes=10-" . ( 10 - 1 ),
			'clearly reversed'  => 'bytes=10-5',
			'reversed at start' => 'bytes=0-0',
			'malformed'         => 'bytes=',
			'non-numeric'       => 'not-bytes=5-10',
			'multi-range'       => 'bytes=0-4,10-14',
			'suffix range'      => 'bytes=-5',
		);
		/*
		 * `bytes=0-0` is the smallest reversed-range shape on any file: its
		 * explicit end (0) is not below its start (0), so it is a VALID
		 * single-byte range; it belongs to the ascending set below, and its
		 * accidental presence in the degrade list would be a test bug.
		 */
		unset( $degrades_to_full['reversed at start'] );

		foreach ( $degrades_to_full as $label => $range ) {
			$response = $this->get_binary( $public_id, array( 'Range' => $range ) );
			$this->assertSame( 200, $response->get_status(), "a reversed/malformed range ({$label}: {$range}) degrades to the bounded full response" );
			$this->assertSame( $body, $response->get_data(), "{$label}: exactly the full body, no unintended slice" );
			$this->assertArrayNotHasKey( 'Content-Range', $response->get_headers(), "{$label}: no Content-Range is constructed" );
			$length = (string) ( $response->get_headers()['Content-Length'] ?? '' );
			$this->assertSame( (string) $size, $length, "{$label}: the Content-Length is the exact full size" );
			$this->assertStringNotContainsString( '-', $length, "{$label}: never a negative Content-Length" );
		}

		/* The ascending family: every valid shape serves its exact slice with valid headers. */
		$ascending = array(
			'equal endpoints'     => array( 'bytes=5-5', 5, 1 ),
			'ordinary ascending'  => array( 'bytes=5-14', 5, 10 ),
			'first byte'          => array( 'bytes=0-0', 0, 1 ),
			'end clipped to file' => array( 'bytes=' . ( $size - 5 ) . '-' . ( $size + 100 ), $size - 5, 5 ),
			'final valid byte'    => array( 'bytes=' . ( $size - 1 ) . '-' . ( $size - 1 ), $size - 1, 1 ),
			'open to end'         => array( 'bytes=10-', 10, $size - 10 ),
			'whole file explicit' => array( 'bytes=0-' . ( $size - 1 ), 0, $size ),
		);
		foreach ( $ascending as $label => $spec ) {
			list( $range, $start, $length ) = $spec;
			$response = $this->get_binary( $public_id, array( 'Range' => $range ) );
			$this->assertSame( 206, $response->get_status(), "a valid range ({$label}) is served partially" );
			$this->assertSame( substr( $body, $start, $length ), $response->get_data(), "{$label}: the exact requested slice" );
			$this->assertSame( "bytes {$start}-" . ( $start + $length - 1 ) . "/{$size}", $response->get_headers()['Content-Range'], "{$label}: a valid Content-Range" );
			$declared = (string) $response->get_headers()['Content-Length'];
			$this->assertSame( (string) $length, $declared, "{$label}: the exact slice length" );
			$this->assertStringNotContainsString( '-', $declared, "{$label}: never a negative Content-Length" );
		}

		/*
		 * The applicable zero-length condition is at the accepted boundary
		 * itself: an empty upload never becomes a stored file, so no
		 * zero-length delivery or zero-length range slice can ever exist.
		 */
		$empty_document = $this->create_document( 'publish' );
		$empty_rejected = $this->attach_fixture( (int) $empty_document['post_id'], 'application/pdf', 1, '' );
		$this->assertWPError( $empty_rejected, 'an empty upload is refused before any stored file exists' );

		/* The unsatisfiable boundary: start at and after the file boundary refuse with no bytes. */
		foreach ( array( $size, $size + 1, $size + 1000 ) as $start ) {
			$response = $this->get_binary( $public_id, array( 'Range' => "bytes={$start}-" ) );
			$this->assertSame( 416, $response->get_status(), "a start at/after the boundary ({$start}) is refused" );
			$this->assertSame( "bytes */{$size}", $response->get_headers()['Content-Range'] );
			$this->assertSame( '', (string) $response->get_data(), 'no bytes leak from an unsatisfiable range' );
		}
	}

	/** @test */
	public function test_no_denial_or_delivery_leaks_storage_identity() {
		$document = $this->create_eligible_document();
		$public_id = (string) $document['public_id'];
		$stored   = ProtectedAttachment::stored_file_for( (int) $document['post_id'] );
		$this->assertIsString( $stored );
		$storage_markers = array(
			'sensitive-upload-filename',
			basename( $stored ),
			dirname( $stored ),
			(string) $document['attachment_id'],
			'wp-content/uploads',
		);

		update_post_meta( (int) $document['post_id'], FoundationTypes::META_WITHDRAWN, '1' );
		$denial = wp_json_encode( $this->get_binary( $public_id ) );
		foreach ( $storage_markers as $marker ) {
			$this->assertStringNotContainsString( $marker, (string) $denial, "the denial never discloses {$marker}" );
		}

		delete_post_meta( (int) $document['post_id'], FoundationTypes::META_WITHDRAWN );
		$delivery = wp_json_encode( $this->get_binary( $public_id ) );
		foreach ( array_slice( $storage_markers, 0, 4 ) as $marker ) {
			$this->assertStringNotContainsString( $marker, (string) $delivery, "the delivery never discloses {$marker}" );
		}
	}

	/** @test */
	public function test_the_preview_binary_surface_is_separate_and_session_bound() {
		/*
		 * T044: the candidate bytes of an INELIGIBLE document (a Draft) reach
		 * an authorized staff session through the Preview binary surface while
		 * the anonymous surface stays neutral for the same record — and every
		 * unbound request to the Preview surface denies.
		 */
		$document = $this->create_document( 'draft' );
		$this->assertIsArray( $this->attach_fixture( (int) $document['post_id'] ) );
		$public_id = (string) $document['public_id'];

		$this->assertSame( 404, $this->get_binary( $public_id )->get_status(), 'the anonymous surface stays neutral for the Draft' );

		wp_set_current_user( $this->editor );
		$target = \SonghealthCore\Preview\PreviewController::initiation_target( (int) $document['post_id'] );
		$this->assertIsString( $target, 'the authorized initiation produces a preview target' );
		$parts = array();
		parse_str( (string) wp_parse_url( $target, PHP_URL_FRAGMENT ), $parts );
		$grant = (string) $parts['g'];
		$nonce = (string) $parts['n'];

		$preview_request = new WP_REST_Request( 'GET', '/' . Routes::ROUTE_NAMESPACE . '/preview/document-resource/' . rawurlencode( $public_id ) . '/binary' );
		$preview_request->set_param( 'grant', $grant );
		$preview_request->set_param( '_wpnonce', $nonce );
		$preview_request->set_header( 'Origin', 'http://127.0.0.1:4173' );
		$_SERVER['HTTP_ORIGIN'] = 'http://127.0.0.1:4173';

		$authorized = rest_do_request( $preview_request );
		unset( $_SERVER['HTTP_ORIGIN'] );
		$this->assertSame( 200, $authorized->get_status(), 'the bound session previews the candidate bytes' );
		$this->assertSame( str_repeat( self::FIXTURE_BYTES, 1 ), $authorized->get_data() );
		$this->assertSame( 'application/pdf', $authorized->get_headers()['Content-Type'] );
		$this->assertStringContainsString( 'no-store', (string) $authorized->get_headers()['Cache-Control'] );
		$this->assertSame( 'noindex, nofollow', $authorized->get_headers()['X-Robots-Tag'] );

		/* Anonymous direct request carrying the same grant: neutral denial. */
		wp_set_current_user( 0 );
		$anonymous = new WP_REST_Request( 'GET', '/' . Routes::ROUTE_NAMESPACE . '/preview/document-resource/' . rawurlencode( $public_id ) . '/binary' );
		$anonymous->set_param( 'grant', $grant );
		$anonymous->set_header( 'Origin', 'http://127.0.0.1:4173' );
		$_SERVER['HTTP_ORIGIN'] = 'http://127.0.0.1:4173';
		$denied = rest_do_request( $anonymous );
		unset( $_SERVER['HTTP_ORIGIN'] );
		$this->assertSame( 404, $denied->get_status(), 'Preview state is never anonymously reachable' );

		/* Demotion denies the next Preview binary request; anonymous delivery stays neutral either way. */
		wp_set_current_user( $this->editor );
		wp_update_user( array( 'ID' => $this->editor, 'role' => 'subscriber' ) );
		wp_set_current_user( 0 );
		wp_set_current_user( $this->editor );
		$revoked = rest_do_request( $preview_request );
		$this->assertSame( 404, $revoked->get_status(), 'revocation hits the next Preview binary request' );

		/* The eligible parent stays deliverable and unaffected by Preview use. */
		$eligible = $this->create_eligible_document();
		$this->assertSame( 200, $this->get_binary( (string) $eligible['public_id'] )->get_status() );
	}

	/**
	 * The absolute control path of the test uploads tree (internal to the suite).
	 *
	 * @return string
	 */
	private function control_path() {
		$uploads = wp_upload_dir();
		return trailingslashit( $uploads['basedir'] ) . ProtectedAttachment::PROTECTED_DIRECTORY . '/.htaccess';
	}

	/**
	 * Reset the protection state for the next case and restore operability.
	 *
	 * @return void
	 */
	private function reset_protection_state() {
		$control = $this->control_path();
		if ( file_exists( $control ) ) {
			@chmod( $control, 0644 );
			unlink( $control );
		}
	}

	/** @test */
	public function test_b02_protection_is_verified_not_assumed_from_file_existence() {
		$control = $this->control_path();
		$this->reset_protection_state();

		/* Missing control: safely installed, verified after the write. */
		$this->assertFileDoesNotExist( $control );
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'a missing control is installed' );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ), 'the installed control is the exact verified denial' );

		/* Exact pre-existing control: accepted as-is, unchanged. */
		$mtime = filemtime( $control );
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'an exact control is accepted' );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ) );
		$this->assertSame( $mtime, filemtime( $control ), 'an exact control is not rewritten' );

		/* Idempotent repeated verification. */
		$this->assertTrue( ProtectedAttachment::ensure_protection() );
		$this->assertTrue( ProtectedAttachment::ensure_protection() );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ) );

		/* Empty control: not protection; reconciled to the exact verified control. */
		file_put_contents( $control, '' );
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'an empty control is safely reconciled' );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ), 'the reconciled control is verified after the write' );

		/* Malformed control (an explicit ALLOW): reconciled, never accepted. */
		file_put_contents( $control, "Require all granted\n" );
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'a malformed control is safely reconciled' );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ) );

		/* Incomplete/stale control (denial line missing): reconciled. */
		file_put_contents( $control, "# an older control header without any denial\n" );
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'a stale control is safely reconciled' );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ) );

		$this->reset_protection_state();
	}

	/** @test */
	public function test_b02_unverifiable_or_uncorrectable_controls_fail_closed() {
		$control = $this->control_path();

		/* Unwritable mismatched pre-existing control: no safe correction → fail closed. */
		$this->reset_protection_state();
		ProtectedAttachment::ensure_protection();
		file_put_contents( $control, "Require all granted\n" );
		chmod( $control, 0444 ); /* Readable but not writable: the mismatch can be read, the correction cannot be made. */
		$correction_result = ProtectedAttachment::ensure_protection();
		chmod( $control, 0644 );
		$this->assertFalse( $correction_result, 'a mismatched control that cannot be corrected is not protection' );

		/* An unreadable control: unverifiable → fail closed. */
		file_put_contents( $control, ProtectedAttachment::DENIAL_CONTROL );
		chmod( $control, 0000 );
		$unreadable_result = ProtectedAttachment::ensure_protection();
		chmod( $control, 0644 );
		$this->assertFalse( $unreadable_result, 'an unreadable control cannot be verified and fails closed' );

		/* A control path occupied by a directory: not a regular file → fail closed. */
		$this->reset_protection_state();
		mkdir( $control, 0755 );
		$occupied_result = ProtectedAttachment::ensure_protection();
		rmdir( $control );
		$this->assertFalse( $occupied_result, 'a control path that is not a regular file fails closed' );

		$this->reset_protection_state();
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'the protection returns to the verified state' );
	}

	/** @test */
	public function test_b02_attach_accepts_bytes_only_after_verified_protection() {
		$control  = $this->control_path();
		$document = $this->create_document( 'publish' );

		/* With an uncorrectable control in place, attachment is refused and nothing is stored. */
		$this->reset_protection_state();
		ProtectedAttachment::ensure_protection();
		file_put_contents( $control, "Require all granted\n" );
		chmod( $control, 0444 );

		$tmp = tempnam( sys_get_temp_dir(), 'shb' );
		file_put_contents( $tmp, self::FIXTURE_BYTES );
		$refused = ProtectedAttachment::attach(
			(int) $document['post_id'],
			array(
				'tmp_name' => $tmp,
				'name'     => 'gate05b02-upload.pdf',
				'type'     => 'application/pdf',
				'size'     => (int) filesize( $tmp ),
			)
		);
		$this->assertWPError( $refused, 'attachment acceptance requires verified protection' );
		$this->assertSame( 'storage_unavailable', $refused->get_error_code() );
		$this->assertFileExists( $tmp, 'the unaccepted upload is left in place, never stored' );
		$this->assertNull( ProtectedAttachment::stored_file_for( (int) $document['post_id'] ), 'no stored file exists for the refused attachment' );
		$this->assertSame( '', (string) get_post_meta( (int) $document['post_id'], FoundationTypes::META_BINARY_ATTACHMENT_ID, true ), 'no attachment reference was written' );
		unlink( $tmp );
		chmod( $control, 0644 );

		/* Once the protection is verified again, the same upload is accepted. */
		$this->reset_protection_state();
		$accepted = $this->attach_fixture( (int) $document['post_id'] );
		$this->assertIsArray( $accepted, 'attachment acceptance follows verified protection' );
		$this->assertTrue( ProtectedAttachment::relationship_is_valid( get_post( (int) $document['post_id'] ) ) );
		$this->assertSame( ProtectedAttachment::DENIAL_CONTROL, (string) file_get_contents( $control ), 'the verified denial is in place for the accepted bytes' );

		$this->reset_protection_state();
	}

	/** @test */
	public function test_the_stored_file_is_outside_the_standard_upload_layout() {
		$document = $this->create_eligible_document();
		$stored   = ProtectedAttachment::stored_file_for( (int) $document['post_id'] );
		$this->assertIsString( $stored );
		$this->assertStringContainsString( ProtectedAttachment::PROTECTED_DIRECTORY, $stored, 'the bytes live under the protected directory' );

		$uploads = wp_upload_dir();
		$this->assertStringStartsWith( $uploads['basedir'], $stored, 'the protected directory lives under the WordPress uploads root' );
		$this->assertStringNotContainsString( 'sensitive-upload-filename', $stored, 'the stored name is never the upload filename' );

		/* The mediation denies direct requests into the protected directory at the server layer. */
		$this->assertTrue( ProtectedAttachment::ensure_protection(), 'the protected directory server denial is in place' );
	}
}
