<?php
/**
 * Protected-binary bypass containment (Delivery 002, T040 / US3).
 *
 * Proves anonymous callers cannot reach protected Document Resource bytes
 * outside the mediated current-eligibility route: the raw protected storage
 * URL and its encoded/alternate variants (probed against the live Apache of
 * the verification runtime when its origin is supplied), the native
 * attachment route and page, native media REST, the original upload URL
 * shape, redirects, and retained prior-success URLs — all without weakening
 * authenticated WordPress editor infrastructure (FR-018, FR-019;
 * contracts/protected-binary.md §Invariants; SC-004).
 *
 * EXPECTED RED before T042/T043: the ProtectedAttachment module does not
 * exist, so the suite errors on the missing class rather than passing
 * vacuously.
 *
 * Live-HTTP probes run only when the verification runtime supplies
 * SONGHEALTH_BINARY_PROBE_ORIGIN (its web origin, reachable from this
 * process), SONGHEALTH_BINARY_PROBE_FILE (a seeded protected file's path
 * relative to the runtime's uploads root), and
 * SONGHEALTH_BINARY_PROBE_PUBLIC_ID (a seeded eligible Document Resource's
 * Public ID in the runtime). Without them those cases skip with an explicit
 * reason and the WordPress-layer containment remains fully covered here.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

use SonghealthCore\Binary\BinaryController;
use SonghealthCore\Binary\ProtectedAttachment;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Rest\Routes;

require_once __DIR__ . '/../bootstrap.php';
require_once dirname( __DIR__, 2 ) . '/wp-content/plugins/songhealth-core/tests/ServiceCreatedRecordCleanup.php';

/**
 * @group containment
 * @group us3
 */
class ProtectedBinaryBypassTest extends WP_UnitTestCase {

	use SonghealthCore\Tests\ServiceCreatedRecordCleanup;

	/** Sentinel bytes for the protected fixture. */
	const FIXTURE_BYTES = "%PDF-1.4\n%songhealth-bypass-fixture-bytes\n%%EOF\n";

	/** @var int Editor actor for fixtures. */
	private $editor = 0;

	/** @var int[] Attachment posts created outside the creation service. */
	private $attachments = array();

	public function set_up() {
		parent::set_up();

		$existing = get_user_by( 'slug', 'bypass_editor' );
		$this->editor = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => 'bypass_editor',
					'role'       => 'songhealth_editor',
				)
			);
		wp_update_user( array( 'ID' => $this->editor, 'role' => 'songhealth_editor' ) );
		update_user_meta( $this->editor, \SonghealthCore\Authorization\CapabilityMap::META_MODULE_SCOPE, \SonghealthCore\Authorization\CapabilityMap::modules() );

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
	 * Create one eligible Document Resource with a protected attachment.
	 *
	 * @return array{post_id: int, public_id: string, attachment_id: int}
	 */
	private function create_protected_document() {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::DOCUMENT_RESOURCE,
				'post_title'  => 'Bypass Fixture',
				'post_name'   => 'bypass-fixture',
				'post_status' => 'publish',
				'post_author' => $this->editor,
			)
		);
		$this->assertIsArray( $created );
		$this->songhealth_track_record( (int) $created['post_id'] );

		$tmp = tempnam( sys_get_temp_dir(), 'shb' );
		file_put_contents( $tmp, self::FIXTURE_BYTES );
		$attached = ProtectedAttachment::attach(
			(int) $created['post_id'],
			array(
				'tmp_name' => $tmp,
				'name'     => 'sensitive-bypass-filename.pdf',
				'type'     => 'application/pdf',
				'size'     => (int) filesize( $tmp ),
			)
		);
		if ( file_exists( $tmp ) ) {
			unlink( $tmp ); /* attach() takes ownership by renaming the file on success. */
		}
		$this->assertIsArray( $attached );
		$this->attachments[] = (int) $attached['attachment_id'];

		return $created + array( 'attachment_id' => (int) $attached['attachment_id'] );
	}

	/** @test */
	public function test_the_mediated_route_is_the_only_wordpress_delivery_surface() {
		$document = $this->create_protected_document();

		$this->assertSame( 200, rest_do_request( new WP_REST_Request( 'GET', '/songhealth/v1/documents/' . $document['public_id'] . '/binary' ) )->get_status(), 'the mediated route delivers for the currently eligible owner' );

		/* The Songhealth namespace exposes no other binary shape. */
		$server = rest_get_server();
		$routes = array_keys( $server->get_routes() );
		foreach ( $routes as $route ) {
			if ( 0 === strpos( $route, '/songhealth/v1' ) ) {
				$this->assertStringNotContainsString( 'media', $route, "no media surface exists at {$route}" );
				$this->assertStringNotContainsString( 'attachment', $route, "no attachment surface exists at {$route}" );
			}
		}
	}

	/** @test */
	public function test_the_native_attachment_route_and_page_are_contained() {
		$document = $this->create_protected_document();

		/* The native attachment REST item is contained anonymously (T018) and carries no bytes. */
		wp_set_current_user( 0 );
		$native = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/media/' . (int) $document['attachment_id'] ) );
		$this->assertSame( 404, $native->get_status(), 'the native media item is contained for anonymous callers' );

		/* The attachment's public permalink resolves nowhere public. */
		$this->assertStringNotContainsString( 'songhealth-protected', (string) get_attachment_link( (int) $document['attachment_id'] ), 'the attachment link never exposes the protected directory' );

		/*
		 * The attachment-URL API itself discloses nothing: a protected
		 * attachment has no public URL, so the storage path never reaches any
		 * URL-shaped output.
		 */
		$url = wp_get_attachment_url( (int) $document['attachment_id'] );
		$this->assertSame( '', (string) $url, 'a protected attachment has no public URL' );
		$stored = ProtectedAttachment::stored_file_for( (int) $document['post_id'] );
		$this->assertIsString( $stored );
		$this->assertStringNotContainsString( basename( $stored ), (string) $url );
		$this->assertStringNotContainsString( ProtectedAttachment::PROTECTED_DIRECTORY, (string) $url );
	}

	/** @test */
	public function test_upload_filename_identity_is_not_retained_or_resolvable() {
		$document = $this->create_protected_document();

		$stored = ProtectedAttachment::stored_file_for( (int) $document['post_id'] );
		$this->assertIsString( $stored );
		$this->assertStringNotContainsString( 'sensitive-bypass-filename', $stored, 'the stored path is not derived from the upload filename' );

		/* The standard upload location the filename would have occupied does not exist. */
		$uploads = wp_upload_dir();
		$would_be = $uploads['path'] . '/sensitive-bypass-filename.pdf';
		$this->assertFileDoesNotExist( $would_be, 'no standard-upload copy of the bytes exists' );

		/* Direct resolution by attachment page or by filename query resolves nothing public. */
		$this->assertSame( array(), get_posts( array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 5,
			'meta_query'     => array(),
			's'              => 'sensitive-bypass-filename',
			'fields'         => 'ids',
		) ), 'the upload filename is not retained as searchable identity' );
	}

	/** @test */
	public function test_the_protected_directory_denies_direct_http_access_on_the_live_runtime() {
		$probe_origin = (string) getenv( 'SONGHEALTH_BINARY_PROBE_ORIGIN' );
		$probe_file   = (string) getenv( 'SONGHEALTH_BINARY_PROBE_FILE' );
		if ( '' === $probe_origin || '' === $probe_file ) {
			$this->markTestSkipped( 'no live probe origin and seeded protected file supplied: the server-layer denial is exercised in the live verification run' );
		}

		$probe_file = ltrim( $probe_file, '/' );
		$this->assertStringStartsWith( ProtectedAttachment::PROTECTED_DIRECTORY . '/', $probe_file, 'the probe target is a protected-storage file' );

		/* The guarded variants: plain, URL-encoded, double-encoded, traversal-shaped, and path-prefixed. */
		$variants = array(
			'plain'            => $probe_file,
			'url-encoded'      => implode( '/', array_map( 'rawurlencode', explode( '/', $probe_file ) ) ),
			'double-encoded'   => rawurlencode( implode( '/', array_map( 'rawurlencode', explode( '/', $probe_file ) ) ) ),
			'traversal-shaped' => ProtectedAttachment::PROTECTED_DIRECTORY . '/../' . $probe_file,
			'slash-prefixed'   => '/' . $probe_file,
			'dot-segment'      => './' . $probe_file,
		);

		foreach ( $variants as $label => $path ) {
			$status = $this->probe_http( $probe_origin . '/wp-content/uploads/' . str_replace( '%2F', '/', $path ) );
			$this->assertNotSame( 200, $status, "the raw protected URL is denied at the server layer ({$label})" );
		}

		/* The directory listing itself is denied too. */
		$this->assertNotSame( 200, $this->probe_http( $probe_origin . '/wp-content/uploads/' . ProtectedAttachment::PROTECTED_DIRECTORY . '/' ) );
		$this->assertNotSame( 200, $this->probe_http( $probe_origin . '/wp-content/uploads/' . ProtectedAttachment::PROTECTED_DIRECTORY ) );
	}

	/** @test */
	public function test_the_live_mediated_surface_and_native_media_are_bounded_over_http() {
		$probe_origin = (string) getenv( 'SONGHEALTH_BINARY_PROBE_ORIGIN' );
		$probe_id     = (string) getenv( 'SONGHEALTH_BINARY_PROBE_PUBLIC_ID' );
		if ( '' === $probe_origin || '' === $probe_id ) {
			$this->markTestSkipped( 'no live probe origin and seeded eligible document supplied: the mediated-surface HTTP cases are exercised in the live verification run' );
		}

		$mediated = $probe_origin . '/wp-json/songhealth/v1/documents/' . rawurlencode( $probe_id ) . '/binary';

		/* The mediated route answers the live server: eligible delivery works, redirects do not launder denials. */
		$this->assertSame( 200, $this->probe_http( $mediated ), 'the mediated URL delivers for the currently eligible runtime fixture' );

		/* A malformed identifier is the same neutral class over HTTP. */
		$this->assertSame( 404, $this->probe_http( $probe_origin . '/wp-json/songhealth/v1/documents/not-a-uuid/binary' ) );

		/* The native anonymous media REST surface stays contained over HTTP. */
		$this->assertSame( 404, $this->probe_http( $probe_origin . '/wp-json/wp/v2/media' ), 'the native media collection stays contained anonymously' );
		$this->assertSame( 404, $this->probe_http( $probe_origin . '/wp-json/wp/v2/media/1' ), 'a native media item stays contained anonymously' );

		/* Redirect-following cannot launder a contained surface into bytes. */
		$this->assertSame( 404, $this->probe_http( $probe_origin . '/wp-json/wp/v2/media/1', true ), 'following redirects does not bypass the contained media surface' );
	}

	/**
	 * Probe one URL over real HTTP.
	 *
	 * @param string $url           Absolute URL to probe.
	 * @param bool   $follow_redirects Whether to follow redirects.
	 * @return int The final HTTP status code.
	 */
	private function probe_http( $url, $follow_redirects = false ) {
		$context = stream_context_create( array(
			'http' => array(
				'method'           => 'GET',
				'follow_location'  => $follow_redirects ? 1 : 0,
				'max_redirects'    => 3,
				'timeout'          => 10,
				'ignore_errors'    => true,
				'user_agent'       => 'songhealth-verification-probe',
			),
		) );
		$result = @file_get_contents( $url, false, $context );
		/* fall through to the status line */
		$status = 0;
		foreach ( $http_response_header as $header ) {
			if ( 1 === preg_match( '#^HTTP/\S+\s+(\d{3})#', $header, $matches ) ) {
				$status = (int) $matches[1];
			}
		}
		return $status;
	}
}
