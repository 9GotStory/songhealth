<?php
/**
 * Basic Page and Document Resource foundation types (Delivery 002, T007).
 *
 * Registers exactly two distinct custom post types — the Basic Page and the
 * Document Resource foundation shells — and their explicit metadata schemas.
 * Nothing else is registered: no generic content type, no finished Product
 * module, no taxonomy, and no third resource (FR-003).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-003, FR-009, FR-015;
 * - specs/002-headless-wordpress-foundation/data-model.md §§Basic Page
 *   Foundation Record, Document Resource Foundation Record;
 * - specs/002-headless-wordpress-foundation/research.md §3;
 * - docs/website-modernization-docs/current/02-content-model.md §§4, 15;
 * - docs/website-modernization-docs/current/06-roles-permissions.md §36
 *   (staff-facing names use Songhealth work language).
 *
 * Containment contract: both types are `publicly_queryable=false`, have no
 * rewrite rules, no archives, and no feeds, are excluded from native search,
 * expose no query var, and are absent from the native REST infrastructure and
 * the custom-fields UI. WordPress Core therefore has no public URL shape for
 * either type; the Songhealth public contract (T016) is the only public
 * projection and the React canonical routes are the only public destinations.
 *
 * Identity contract: the WordPress post ID and post type stay internal. Public
 * identity is the immutable Public ID owned by the identity registry (T010,
 * T011); this module deliberately registers no identity metadata of its own.
 *
 * This module defines registration only. Calling `register()` on the WordPress
 * `init` hook and connecting it to the admin experience is T019/T033.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Content;

final class FoundationTypes {

	/** Internal post type names. WordPress limits post type names to 20 characters. */
	const BASIC_PAGE        = 'songhealth_page';
	const DOCUMENT_RESOURCE = 'songhealth_document';

	/** Public Songhealth resource types (registry and public contract vocabulary). */
	const RESOURCE_BASIC_PAGE        = 'basic-page';
	const RESOURCE_DOCUMENT_RESOURCE = 'document-resource';

	/**
	 * Shared Songhealth resource metadata (data-model.md §Shared Songhealth
	 * Resource policy). Keys are prefixed and underscore-hidden so none of them
	 * appears in the wp-admin custom-fields UI or in any default meta output.
	 */
	const META_SUMMARY   = '_songhealth_summary';
	const META_VISIBILITY = '_songhealth_visibility';
	const META_WITHDRAWN = '_songhealth_withdrawn';

	/** Basic Page only: optional ordered Document Resource references, stored by Public ID. */
	const META_DOCUMENT_REFERENCES = '_songhealth_document_references';

	/**
	 * The server-owned raw reference budget (FR-031): the maximum number of
	 * raw stored Document Resource reference entries one detail, listing, or
	 * Preview response may inspect — per record and combined across every
	 * Basic Page in the response — and the maximum raw entry count an
	 * authorized write may store. An implementation safety invariant: not a
	 * client parameter, not a public SLA, not a per-page Product setting.
	 */
	const MAX_RAW_DOCUMENT_REFERENCES = 100;

	/** Document Resource only. */
	const META_DOCUMENT_DATE        = '_songhealth_document_date';
	const META_BINARY_ATTACHMENT_ID = '_songhealth_binary_attachment_id';

	/** Songhealth visibility values (FR-008). */
	const VISIBILITY_PUBLIC   = 'public';
	const VISIBILITY_HIDDEN   = 'hidden';
	const VISIBILITY_INTERNAL = 'internal';

	/**
	 * Register both foundation types and their metadata schemas.
	 *
	 * Safe to call once per request on the `init` hook (standard
	 * `register_post_type()` / `register_post_meta()` semantics).
	 *
	 * @return void
	 */
	public static function register() {
		foreach ( self::supported_types() as $post_type ) {
			register_post_type( $post_type, self::registration_args( $post_type ) );
			self::register_metadata( $post_type );
		}
	}

	/**
	 * The two supported internal post type names.
	 *
	 * @return string[]
	 */
	public static function supported_types() {
		return array( self::BASIC_PAGE, self::DOCUMENT_RESOURCE );
	}

	/**
	 * Whether a post type name is one of the two foundation types.
	 *
	 * @param string $post_type Post type name.
	 * @return bool
	 */
	public static function is_supported_type( $post_type ) {
		return in_array( $post_type, self::supported_types(), true );
	}

	/**
	 * The public Songhealth resource type for a foundation post type, or null
	 * for anything else.
	 *
	 * @param string $post_type Post type name.
	 * @return string|null
	 */
	public static function resource_type_for( $post_type ) {
		$map = array(
			self::BASIC_PAGE        => self::RESOURCE_BASIC_PAGE,
			self::DOCUMENT_RESOURCE => self::RESOURCE_DOCUMENT_RESOURCE,
		);
		return $map[ $post_type ] ?? null;
	}

	/**
	 * The foundation post type for a public Songhealth resource type, or null
	 * for anything else.
	 *
	 * @param string $resource_type Public resource type.
	 * @return string|null
	 */
	public static function post_type_for( $resource_type ) {
		$map = array(
			self::RESOURCE_BASIC_PAGE        => self::BASIC_PAGE,
			self::RESOURCE_DOCUMENT_RESOURCE => self::DOCUMENT_RESOURCE,
		);
		return $map[ $resource_type ] ?? null;
	}

	/**
	 * Songhealth staff-facing labels for a foundation type (Frozen 06 §36: the
	 * interface uses work language, not technical identifiers).
	 *
	 * @param string $post_type Post type name.
	 * @return string[]
	 */
	public static function labels( $post_type ) {
		if ( self::DOCUMENT_RESOURCE === $post_type ) {
			return array(
				'name'               => 'เอกสารเผยแพร่',
				'singular_name'      => 'เอกสารเผยแพร่',
				'menu_name'          => 'เอกสารเผยแพร่',
				'all_items'          => 'เอกสารเผยแพร่ทั้งหมด',
				'add_new'            => 'เพิ่มเอกสารเผยแพร่',
				'add_new_item'       => 'เพิ่มเอกสารเผยแพร่ใหม่',
				'edit_item'          => 'แก้ไขเอกสารเผยแพร่',
				'new_item'           => 'เอกสารเผยแพร่ใหม่',
				'view_item'          => 'ดูเอกสารเผยแพร่',
				'view_items'         => 'ดูเอกสารเผยแพร่',
				'search_items'       => 'ค้นหาเอกสารเผยแพร่',
				'not_found'          => 'ไม่พบเอกสารเผยแพร่',
				'not_found_in_trash' => 'ไม่พบเอกสารเผยแพร่ในถังขยะ',
				'parent_item_colon'  => '',
			);
		}

		return array(
			'name'               => 'หน้าข้อมูลทั่วไป',
			'singular_name'      => 'หน้าข้อมูลทั่วไป',
			'menu_name'          => 'หน้าข้อมูลทั่วไป',
			'all_items'          => 'หน้าข้อมูลทั่วไปทั้งหมด',
			'add_new'            => 'เพิ่มหน้าข้อมูลทั่วไป',
			'add_new_item'       => 'เพิ่มหน้าข้อมูลทั่วไปใหม่',
			'edit_item'          => 'แก้ไขหน้าข้อมูลทั่วไป',
			'new_item'           => 'หน้าข้อมูลทั่วไปใหม่',
			'view_item'          => 'ดูหน้าข้อมูลทั่วไป',
			'view_items'         => 'ดูหน้าข้อมูลทั่วไป',
			'search_items'       => 'ค้นหาหน้าข้อมูลทั่วไป',
			'not_found'          => 'ไม่พบหน้าข้อมูลทั่วไป',
			'not_found_in_trash' => 'ไม่พบหน้าข้อมูลทั่วไปในถังขยะ',
			'parent_item_colon'  => '',
		);
	}

	/**
	 * Editor support for a foundation type. Deliberately minimal: a title and
	 * one body field. No thumbnails, excerpts, revisions, comments, page
	 * attributes, or custom-fields metabox — the Songhealth metadata schema
	 * below is the only structured data either type carries.
	 *
	 * @param string $post_type Post type name.
	 * @return string[]
	 */
	public static function supports( $post_type ) {
		return array( 'title', 'editor' );
	}

	/**
	 * The explicit metadata schema for a foundation type: every registered
	 * meta key with its declared type, cardinality, and sanitizer.
	 *
	 * @param string $post_type Post type name.
	 * @return array<string, array<string, mixed>>
	 */
	public static function metadata_schema( $post_type ) {
		$shared = array(
			self::META_SUMMARY   => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_summary' ),
			),
			self::META_VISIBILITY => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_visibility' ),
			),
			self::META_WITHDRAWN => array(
				'type'              => 'boolean',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_withdrawn' ),
			),
		);

		if ( self::BASIC_PAGE === $post_type ) {
			return $shared + array(
				self::META_DOCUMENT_REFERENCES => array(
					'type'              => 'array',
					'single'            => true,
					'show_in_rest'      => false,
					'sanitize_callback' => array( __CLASS__, 'sanitize_document_references' ),
				),
			);
		}

		return $shared + array(
			self::META_DOCUMENT_DATE        => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_document_date' ),
			),
			self::META_BINARY_ATTACHMENT_ID => array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_binary_attachment_id' ),
			),
		);
	}

	/**
	 * Register the metadata schema for one foundation type.
	 *
	 * Writing these keys still requires the type's edit authority: with no
	 * explicit auth callback, WordPress enforces the default
	 * `current_user_can( 'edit_post', $post_id )` meta-capability check, which
	 * `map_meta_cap` resolves against the least-privilege primitive
	 * capabilities declared below.
	 *
	 * @param string $post_type Post type name.
	 * @return void
	 */
	public static function register_metadata( $post_type ) {
		foreach ( self::metadata_schema( $post_type ) as $meta_key => $args ) {
			register_post_meta( $post_type, $meta_key, $args );
		}
	}

	/**
	 * The WordPress primitive capabilities WordPress Core derives for a
	 * foundation type from its `capability_type` and `map_meta_cap=true`.
	 *
	 * These are the least-privilege primitives that let Core's own screens and
	 * meta-capability mapping function at all. They carry no Songhealth
	 * meaning: every Songhealth decision is made against the Songhealth
	 * capability map (T008), never against these names.
	 *
	 * @param string $post_type Post type name.
	 * @return string[]
	 */
	public static function primitive_capabilities( $post_type ) {
		$singular = $post_type;
		$plural   = $post_type . 's';

		return array(
			"edit_{$singular}",
			"read_{$singular}",
			"delete_{$singular}",
			"edit_{$plural}",
			"edit_others_{$plural}",
			"publish_{$plural}",
			"read_private_{$plural}",
			"delete_{$plural}",
			"delete_private_{$plural}",
			"delete_published_{$plural}",
			"delete_others_{$plural}",
			"edit_private_{$plural}",
			"edit_published_{$plural}",
		);
	}

	/**
	 * The `register_post_type()` arguments for a foundation type.
	 *
	 * Every native public surface is closed: `publicly_queryable=false` with
	 * `rewrite=false`, `has_archive=false`, `query_var=false`,
	 * `exclude_from_search=true`, `show_in_rest=false`, and no navigation-menu
	 * or admin-bar exposure. The types remain usable in wp-admin (`show_ui`)
	 * for authorized staff, which is the bounded administrative surface Frozen
	 * 05/06 keep.
	 *
	 * @param string $post_type Post type name.
	 * @return array<string, mixed>
	 */
	public static function registration_args( $post_type ) {
		return array(
			'labels'              => self::labels( $post_type ),
			'supports'            => self::supports( $post_type ),
			'description'         => self::type_description( $post_type ),
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_nav_menus'   => false,
			'show_in_admin_bar'   => false,
			'show_in_rest'        => false,
			'hierarchical'        => false,
			'has_archive'         => false,
			'rewrite'             => false,
			'query_var'           => false,
			'capability_type'     => $post_type,
			'map_meta_cap'        => true,
			'delete_with_user'    => false,
		);
	}

	/**
	 * Bounded internal description for a foundation type.
	 *
	 * @param string $post_type Post type name.
	 * @return string
	 */
	public static function type_description( $post_type ) {
		if ( self::DOCUMENT_RESOURCE === $post_type ) {
			return 'Songhealth Document Resource foundation record. Non-public foundation shell owning protected binary delivery eligibility.';
		}
		return 'Songhealth Basic Page foundation record. Non-public foundation shell for general website information pages.';
	}

	/**
	 * Sanitize a summary: plain text, no markup.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_summary( $value ) {
		return sanitize_text_field( (string) $value );
	}

	/**
	 * Sanitize Songhealth visibility to the declared allowlist, defaulting to
	 * public. An unrecognized value never becomes a new visibility state.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_visibility( $value ) {
		$allowlisted = array( self::VISIBILITY_PUBLIC, self::VISIBILITY_HIDDEN, self::VISIBILITY_INTERNAL );
		$normalized  = sanitize_key( (string) $value );
		if ( in_array( $normalized, $allowlisted, true ) ) {
			return $normalized;
		}
		return self::VISIBILITY_PUBLIC;
	}

	/**
	 * Sanitize the withdrawn flag to a strict boolean.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function sanitize_withdrawn( $value ) {
		if ( is_bool( $value ) ) {
			return $value;
		}
		return '1' === (string) $value || 'true' === strtolower( (string) $value );
	}

	/**
	 * Sanitize the ordered Document Resource reference list. References are
	 * stored as Public ID strings, so an entry is kept only when it already has
	 * the UUID shape; anything else is dropped rather than coerced into a
	 * well-formed-looking but wrong identifier. Duplicates are removed while
	 * preserving order and the result is re-indexed.
	 *
	 * References never carry authority: eligibility of a referenced Document
	 * Resource is always its own current decision (FR-019), so nothing here
	 * resolves or validates the target — it only keeps the reference shape
	 * safe.
	 *
	 * @param mixed $value Raw value.
	 * @return string[]
	 */
	public static function sanitize_document_references( $value ) {
		if ( is_string( $value ) ) {
			$value = array( $value );
		}
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();
		foreach ( $value as $entry ) {
			if ( ! self::is_public_id_shape( $entry ) ) {
				continue;
			}
			$entry = strtolower( trim( (string) $entry ) );
			if ( in_array( $entry, $clean, true ) ) {
				continue;
			}
			$clean[] = $entry;
		}
		return array_values( $clean );
	}

	/**
	 * Whether a value has the shape of a Songhealth Public ID (UUIDv7). The
	 * identity registry owns issuance and validation of real identifiers; this
	 * is only the storage-shape check that keeps a reference from being coerced
	 * into a well-formed-looking but wrong one.
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	public static function is_public_id_shape( $value ) {
		return 1 === preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', strtolower( trim( (string) $value ) ) );
	}

	/**
	 * Sanitize a Document Resource date to an ISO calendar date or empty.
	 * The document date is the document's own date, deliberately distinct from
	 * any publication date (Content Model §15.4).
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_document_date( $value ) {
		$raw = trim( (string) $value );
		if ( '' === $raw ) {
			return '';
		}
		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $raw ) ) {
			return '';
		}
		$parts = explode( '-', $raw );
		if ( ! checkdate( (int) $parts[1], (int) $parts[2], (int) $parts[0] ) ) {
			return '';
		}
		return $raw;
	}

	/**
	 * Sanitize the internal binary attachment reference to a positive integer
	 * rendered as a string, or empty. This keeps the stored shape safe only;
	 * the one-to-one relationship, attachment safety, and the requirement that
	 * it exist before publication are owned by the protected-attachment module
	 * (T042).
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_binary_attachment_id( $value ) {
		$raw = trim( (string) $value );
		if ( '' === $raw || 1 !== preg_match( '/^\d+$/', $raw ) ) {
			return '';
		}
		$int = (int) $raw;
		if ( $int < 1 ) {
			return '';
		}
		return (string) $int;
	}
}
