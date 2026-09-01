<?php
/**
 * Protected Document Resource attachment relationship (Delivery 002, T042).
 *
 * The smallest one-to-one Document Resource → protected attachment
 * relationship the persisted model requires: the Document Resource owns the
 * relationship and anonymous delivery; the attachment owns storage metadata;
 * the bytes live in a server-denied protected location under the WordPress
 * uploads root, and no raw upload URL, attachment ID, filesystem path, or
 * filename becomes public resource identity (FR-018–FR-020; research.md §9;
 * data-model.md §Document Resource Foundation Record;
 * contracts/protected-binary.md).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-018–FR-020;
 * - specs/002-headless-wordpress-foundation/contracts/protected-binary.md;
 * - specs/002-headless-wordpress-foundation/data-model.md §Document Resource
 *   Foundation Record;
 * - specs/002-headless-wordpress-foundation/research.md §9;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Relationship contract: exactly one live attachment per Document Resource
 * and exactly one owning Document Resource per attachment, verified in both
 * directions. `attach()` replaces any existing attachment (removing the old
 * record and file) and `relationship_is_valid()` proves the live mapping,
 * the ownership direction, the safe content type, and the presence and bound
 * of the stored file. The attachment is WordPress Media Library machinery —
 * no second Product identity and no generalized media subsystem — but its
 * state alone never grants public eligibility: `PublicEligibility` (T013)
 * remains the sole eligibility authority and consults this validator only
 * for the Document Resource's publication validity.
 *
 * Storage contract (research.md §9 hosting condition): the bytes are moved
 * out of the standard uploads layout into a protected subdirectory whose
 * server-level denial (`ensure_protection()`) is proven by direct tests
 * (T040) in the verification runtime; the Production storage realization
 * remains the US4 evidence gate. Stored names are random — the upload
 * filename is never retained, not even as the stored basename — and the
 * original upload location keeps no copy, so no raw URL addresses the bytes.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Binary;

use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use WP_Error;
use WP_Post;

final class ProtectedAttachment {

	/** The protected subdirectory under the WordPress uploads root. */
	const PROTECTED_DIRECTORY = 'songhealth-protected';

	/** Attachment post meta holding the stored file path relative to the uploads root. */
	const META_STORED_FILE = '_songhealth_protected_file';

	/** The safe content types a protected attachment may carry. */
	const ALLOWED_MIME_TYPES = array( 'application/pdf' );

	/** The delivery size bound: no attachment larger than this is accepted or served. */
	const MAX_BYTES = 8388608; // 8 MiB.

	/**
	 * The exact direct-access denial control for the verification runtime's
	 * Apache, verified byte for byte before any protected byte is accepted.
	 */
	const DENIAL_CONTROL = "# Songhealth protected binary storage (Delivery 002, T042).\nRequire all denied\n";

	/**
	 * Attach the storage-disclosure containment seam to the WordPress
	 * lifecycle.
	 *
	 * The only hook this relationship needs: a protected attachment has no
	 * public URL, so WordPress's own attachment-URL API never discloses the
	 * protected storage path (the server-level denial remains the boundary;
	 * this keeps the path out of every URL-shaped output as well). Editing,
	 * uploading, and deleting media keep their ordinary behavior.
	 *
	 * @return void
	 */
	public static function register() {
		add_filter( 'wp_get_attachment_url', array( __CLASS__, 'contain_attachment_url' ), 10, 2 );
	}

	/**
	 * A protected attachment has no public URL: return an empty URL instead
	 * of the storage-path-derived one, whatever context asks for it.
	 *
	 * @param string $url            The default attachment URL.
	 * @param int    $attachment_id  The attachment post ID.
	 * @return string
	 */
	public static function contain_attachment_url( $url, $attachment_id ) {
		$stored = (string) get_post_meta( (int) $attachment_id, self::META_STORED_FILE, true );
		if ( '' !== $stored ) {
			return '';
		}
		return $url;
	}

	/**
	 * Attach one uploaded file to a Document Resource as its one protected
	 * attachment, replacing any existing attachment.
	 *
	 * Validation is fail-closed: the document must be an accepted Document
	 * Resource, the uploaded file must exist, be within the size bound, and
	 * prove a safe content type (real content inspection, not a declared
	 * label). Every failure returns a bounded `WP_Error` — `invalid_request`,
	 * `unsupported_type`, `not_accepted`, `unsafe_type`, `too_large`,
	 * `storage_unavailable` — and writes nothing.
	 *
	 * @param int   $document_id Document Resource post ID.
	 * @param array $file {
	 *     The uploaded file, in the `wp_handle_upload` shape.
	 *
	 *     @type string $tmp_name Absolute path to the uploaded temporary file.
	 *     @type string $name     The client-supplied filename (never retained).
	 *     @type string $type     The client-declared content type (never trusted).
	 *     @type int    $size     The client-declared size (never trusted).
	 * }
	 * @return array{attachment_id: int}|WP_Error
	 */
	public static function attach( $document_id, array $file ) {
		$document = get_post( $document_id );
		if ( ! $document instanceof WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $document->post_type ) {
			return new WP_Error( 'unsupported_type' );
		}
		if ( ! CreateTimePublicId::is_accepted( $document ) ) {
			return new WP_Error( 'not_accepted' );
		}

		$tmp_name = isset( $file['tmp_name'] ) ? (string) $file['tmp_name'] : '';
		if ( '' === $tmp_name || ! is_file( $tmp_name ) || ! is_readable( $tmp_name ) ) {
			return new WP_Error( 'invalid_request' );
		}
		$size = (int) filesize( $tmp_name );
		if ( $size < 1 || $size > self::MAX_BYTES ) {
			return new WP_Error( 'too_large' );
		}

		/*
		 * Safe content type: the real bytes decide, never the declared label.
		 * `wp_check_filetype_and_ext` inspects the content and resolves the
		 * extension against the allowlist of exactly the safe types.
		 */
		$checked = wp_check_filetype_and_ext( $tmp_name, 'fixture.pdf', array( 'pdf' => 'application/pdf' ) );
		$mime    = isset( $checked['type'] ) ? (string) $checked['type'] : '';
		if ( '' === $mime || ! in_array( $mime, self::ALLOWED_MIME_TYPES, true ) ) {
			return new WP_Error( 'unsafe_type' );
		}

		if ( ! self::ensure_protection() ) {
			return new WP_Error( 'storage_unavailable' );
		}

		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return new WP_Error( 'storage_unavailable' );
		}

		/*
		 * The stored name is random: the upload filename is never retained,
		 * not even as the stored basename, so it cannot become identity or a
		 * guessable URL.
		 */
		try {
			$stored_name = bin2hex( random_bytes( 16 ) ) . '.pdf';
		} catch ( \Exception $exception ) {
			return new WP_Error( 'storage_unavailable' );
		}
		$relative = trailingslashit( self::PROTECTED_DIRECTORY ) . $stored_name;
		$absolute = trailingslashit( $uploads['basedir'] ) . $relative;

		if ( ! wp_mkdir_p( dirname( $absolute ) ) || ! @rename( $tmp_name, $absolute ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- the failure is reported through the bounded error below.
			return new WP_Error( 'storage_unavailable' );
		}
		/*
		 * The move preserves the temporary upload's 0600 owner-only mode, so
		 * normalize to the platform's ordinary readable-file mode: the web
		 * server user must read the bytes for mediated delivery while no web
		 * request can ever address the file directly (the server denial owns
		 * that boundary).
		 */
		@chmod( $absolute, 0644 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- the mode is normalized explicitly.
		if ( ! self::file_is_usable( $absolute ) ) {
			@unlink( $absolute ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- cleanup of a partially failed attach.
			return new WP_Error( 'storage_unavailable' );
		}

		/* Replace the previous relationship: exactly one live attachment remains. */
		$previous = self::current_attachment( $document );
		if ( null !== $previous ) {
			wp_delete_post( (int) $previous->ID, true ); /* Also removes the previous protected file. */
		}

		$attachment_id = (int) wp_insert_post(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'post_parent'    => (int) $document->ID,
				'post_mime_type' => $mime,
				'post_title'     => '',
				'post_content'   => '',
			),
			true
		);
		if ( is_wp_error( $attachment_id ) || $attachment_id <= 0 ) {
			@unlink( $absolute ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- cleanup of a partially failed attach.
			return new WP_Error( 'storage_unavailable' );
		}

		update_post_meta( $attachment_id, self::META_STORED_FILE, $relative );
		update_post_meta( $attachment_id, '_wp_attached_file', $relative ); /* WordPress-native storage metadata owned by the attachment. */
		wp_update_attachment_metadata( $attachment_id, array( 'filesize' => $size ) );

		update_post_meta( (int) $document->ID, FoundationTypes::META_BINARY_ATTACHMENT_ID, (string) $attachment_id );

		return array( 'attachment_id' => $attachment_id );
	}

	/**
	 * Whether the Document Resource currently owns exactly one valid, safe,
	 * present protected attachment — the publication-validity question.
	 *
	 * Verified live: the document maps to one attachment whose owning parent
	 * is exactly this document (the one-to-one proof — an attachment has one
	 * parent), whose content type is allowlisted, and whose stored file
	 * exists under the protected directory within the size bound. A stale or
	 * forged reference from another record fails that record's own check and
	 * never disturbs the true owner. Attachment or media state alone never
	 * makes this true on its own — the mapping and the file must both be
	 * live.
	 *
	 * @param WP_Post|int|null $document Document Resource to evaluate.
	 * @return bool
	 */
	public static function relationship_is_valid( $document ) {
		$document = $document instanceof WP_Post ? $document : get_post( $document );
		if ( ! $document instanceof WP_Post || FoundationTypes::DOCUMENT_RESOURCE !== $document->post_type ) {
			return false;
		}

		$attachment = self::current_attachment( $document );
		if ( null === $attachment ) {
			return false;
		}
		if ( (int) $attachment->post_parent !== (int) $document->ID ) {
			return false; /* The one-to-one direction the attachment owns. */
		}
		if ( ! in_array( (string) $attachment->post_mime_type, self::ALLOWED_MIME_TYPES, true ) ) {
			return false;
		}

		$stored = self::stored_file_for( (int) $document->ID );
		if ( null === $stored || ! is_file( $stored ) || ! is_readable( $stored ) ) {
			return false;
		}
		$size = (int) filesize( $stored );
		if ( $size < 1 || $size > self::MAX_BYTES ) {
			return false;
		}

		/*
		 * The one-to-one proof is the ownership direction above: the
		 * attachment has exactly one parent, and this document is it. A stale
		 * or forged reference to this attachment from any other record never
		 * changes that ownership — the other record fails the parent check
		 * for itself, and this record stays the one owner.
		 */
		return true;
	}

	/**
	 * The validated safe delivery metadata for streaming, or null.
	 *
	 * Re-validates the relationship and derives the delivery facts: the
	 * absolute stored path, the validated content type, the exact size, and a
	 * public download filename derived from the DOCUMENT's presentation
	 * title — never the stored name and never the upload filename.
	 *
	 * @param WP_Post|int|null $document Document Resource to deliver.
	 * @return array{path: string, mime: string, size: int, filename: string}|null
	 */
	public static function delivery( $document ) {
		if ( ! self::relationship_is_valid( $document ) ) {
			return null;
		}
		$document = $document instanceof WP_Post ? $document : get_post( $document );
		if ( ! $document instanceof WP_Post ) {
			return null;
		}

		$stored = self::stored_file_for( (int) $document->ID );
		if ( null === $stored ) {
			return null;
		}

		$slug = sanitize_title( (string) $document->post_title );
		if ( '' === $slug ) {
			$slug = 'document';
		}

		return array(
			'path'     => $stored,
			'mime'     => 'application/pdf',
			'size'     => (int) filesize( $stored ),
			'filename' => $slug . '.pdf',
		);
	}

	/**
	 * The absolute stored file path of a document's attachment (internal
	 * only — never disclosed through any public surface).
	 *
	 * @param int $document_id Document Resource post ID.
	 * @return string|null
	 */
	public static function stored_file_for( $document_id ) {
		$attachment_id = (string) get_post_meta( (int) $document_id, FoundationTypes::META_BINARY_ATTACHMENT_ID, true );
		if ( 1 !== preg_match( '/^[1-9][0-9]*$/', $attachment_id ) ) {
			return null;
		}
		$relative = (string) get_post_meta( (int) $attachment_id, self::META_STORED_FILE, true );
		if ( '' === $relative || 0 !== strpos( $relative, self::PROTECTED_DIRECTORY . '/' ) ) {
			return null;
		}

		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return null;
		}
		$absolute = trailingslashit( $uploads['basedir'] ) . $relative;
		if ( false !== strpos( $relative, '..' ) ) {
			return null; /* No traversal into the protected directory is ever honored. */
		}
		return $absolute;
	}

	/**
	 * Ensure the protected directory exists and its direct-access denial is
	 * actually installed and verified.
	 *
	 * Verification contract (G05-B02): an existing or readable control file
	 * is never itself proof of denial. The exact expected control content is
	 * verified byte for byte — a missing control is safely installed, an
	 * exact control is accepted, and an empty, malformed, incomplete, or
	 * stale control is safely reconciled by rewriting the exact control —
	 * and the written state is RE-READ and verified after any write. A
	 * control that cannot be read for verification, or a mismatched control
	 * that cannot be rewritten (unwritable pre-existing file or unwritable
	 * directory), fails closed: `attach()` accepts no protected bytes until
	 * the verified denial is in place.
	 *
	 * This installs only the verification runtime's local Apache denial; the
	 * Production storage realization remains the US4 evidence gate.
	 *
	 * @return bool True only when the exact verified denial is installed and readable.
	 */
	public static function ensure_protection() {
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return false;
		}
		$dir = trailingslashit( $uploads['basedir'] ) . self::PROTECTED_DIRECTORY;
		if ( ! wp_mkdir_p( $dir ) ) {
			return false;
		}

		$htaccess = $dir . '/.htaccess';

		if ( file_exists( $htaccess ) ) {
			$installed = self::read_control( $htaccess );
			if ( null === $installed ) {
				return false; /* Present but unreadable or otherwise unverifiable: fail closed. */
			}
			if ( self::DENIAL_CONTROL !== $installed ) {
				/* Empty, malformed, incomplete, or stale: reconcile by rewriting the exact control. */
				if ( ! is_writable( $htaccess ) ) {
					return false; /* A mismatched control that cannot be corrected is not protection. */
				}
				if ( ! self::write_control( $htaccess ) ) {
					return false;
				}
			}
		} elseif ( ! self::write_control( $htaccess ) ) {
			return false; /* Missing control that cannot be installed: fail closed. */
		}

		/* Verify AFTER any write: the exact control, present and readable. */
		$verified = self::read_control( $htaccess );
		if ( null === $verified || self::DENIAL_CONTROL !== $verified ) {
			return false;
		}

		/*
		 * The silent index is defense-in-depth only; it never substitutes for
		 * the verified denial above and its absence is repaired best-effort.
		 */
		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			@file_put_contents( $index, "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- best-effort defense-in-depth only.
		}

		return true;
	}

	/**
	 * Read the installed control file's exact content for verification.
	 *
	 * @param string $htaccess Absolute control path.
	 * @return string|null The exact content, or null when unreadable or not a regular file.
	 */
	private static function read_control( $htaccess ) {
		if ( ! is_file( $htaccess ) || ! is_readable( $htaccess ) ) {
			return null;
		}
		$content = @file_get_contents( $htaccess ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- the failure is reported through the null below.
		return is_string( $content ) ? $content : null;
	}

	/**
	 * Write the exact denial control.
	 *
	 * @param string $htaccess Absolute control path.
	 * @return bool Whether the write succeeded.
	 */
	private static function write_control( $htaccess ) {
		return false !== @file_put_contents( $htaccess, self::DENIAL_CONTROL ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- the failure is reported through the boolean.
	}

	/**
	 * The current attachment post of a document, or null.
	 *
	 * @param WP_Post $document Document Resource.
	 * @return WP_Post|null
	 */
	private static function current_attachment( WP_Post $document ) {
		$attachment_id = (string) get_post_meta( (int) $document->ID, FoundationTypes::META_BINARY_ATTACHMENT_ID, true );
		if ( 1 !== preg_match( '/^[1-9][0-9]*$/', $attachment_id ) ) {
			return null;
		}
		$attachment = get_post( (int) $attachment_id );
		if ( ! $attachment instanceof WP_Post || 'attachment' !== $attachment->post_type ) {
			return null;
		}
		return $attachment;
	}

	/**
	 * Whether a path exists and is usable by this process.
	 *
	 * @param string $absolute Absolute path.
	 * @return bool
	 */
	private static function file_is_usable( $absolute ) {
		return is_string( $absolute ) && is_file( $absolute ) && is_readable( $absolute );
	}
}
