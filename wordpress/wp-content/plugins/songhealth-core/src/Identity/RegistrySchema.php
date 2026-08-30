<?php
/**
 * Songhealth identity registry schema (Delivery 002, T010).
 *
 * The tiny plugin-owned identity registry table that gives every Basic Page
 * and Document Resource record its durable public identity: one row per
 * resource, holding the immutable Public ID and the internal resource key,
 * with database-enforced uniqueness on both. The WordPress post ID and post
 * type stay internal; only the Public ID is ever a public identity
 * (FR-004, FR-005; Frozen Sitemap §15.4 "Database PK ≠ Public ID").
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-004, FR-005, FR-006;
 * - specs/002-headless-wordpress-foundation/research.md §4;
 * - specs/002-headless-wordpress-foundation/data-model.md §Identity
 *   distinction;
 * - docs/website-modernization-docs/current/03-sitemap.md §§15.4, 17.22;
 * - docs/website-modernization-docs/current/10-system-blueprint.md §123.
 *
 * Uniqueness contract (§123, data-model.md): `public_id` is UNIQUE, so an
 * issued identifier can never be attached to a second resource, and
 * `(resource_type, internal_post_id)` is UNIQUE, so one resource can never
 * hold a second mapping. Both keys are real database constraints, not
 * application-level checks — the database itself rejects reassignment.
 *
 * Tombstone contract (§17.22, research.md §4): deleting a resource never
 * deletes its registry row. The row is retained with `deleted_at` set, so the
 * mapping is tombstoned rather than freed: the issued Public ID and the
 * resource key both stay occupied forever and cannot be recycled by a later
 * insert. There is deliberately no DROP path and no column removal path in
 * this module.
 *
 * Storage shape (§123): an internal BIGINT auto-increment primary key keeps
 * the row addressable, while the publicly addressable identity is the
 * separate canonical UUIDv7 string. For Version 1 the UUID is stored as a
 * readable CHAR(36) string, favoring operational debuggability over premature
 * binary-storage optimization, exactly as §123 directs.
 *
 * This module defines the schema and its idempotent creation only. The
 * registry operations that use it are T011; creating the table at plugin
 * activation is part of T019 lifecycle wiring, not a side effect of loading
 * this file. `create()` is safe to call repeatedly: dbDelta() reconciles the
 * existing table with the declared schema and adds only what is missing.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Identity;

final class RegistrySchema {

	/** Registry table name suffix, prefixed at runtime with the site's `$wpdb->prefix`. */
	const TABLE_SUFFIX = 'songhealth_identity_registry';

	/* Column vocabulary shared with the registry operations (T011). */
	const COLUMN_ID               = 'id';
	const COLUMN_PUBLIC_ID        = 'public_id';
	const COLUMN_RESOURCE_TYPE    = 'resource_type';
	const COLUMN_INTERNAL_POST_ID = 'internal_post_id';
	const COLUMN_CREATED_AT       = 'created_at';
	const COLUMN_DELETED_AT       = 'deleted_at';

	/** Canonical UUIDv7 string length (8-4-4-4-12 lowercase hex plus hyphens). */
	const PUBLIC_ID_LENGTH = 36;

	/** Longest supported resource type (`document-resource`). */
	const RESOURCE_TYPE_LENGTH = 32;

	/*
	 * Unique index names. Distinct on purpose: a duplicate-key database error
	 * names the violated index, and the registry (T011) distinguishes a
	 * public_id collision — retry with a fresh UUIDv7 — from a resource-key
	 * violation — fail closed — by these names. Neither name contains the
	 * other, so the two cases can never be confused in the error text.
	 */
	const UNIQUE_PUBLIC_ID_NAME = 'unique_public_id';
	const UNIQUE_RESOURCE_NAME  = 'unique_resource';

	/**
	 * The fully prefixed registry table name.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return string
	 */
	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE_SUFFIX;
	}

	/**
	 * Whether the registry table exists in the current database.
	 *
	 * Fail-closed primitive for every registry operation: a missing table is
	 * reported as missing, never silently treated as an empty registry, so
	 * callers deny rather than guess.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	public static function exists() {
		global $wpdb;
		$table = self::table_name();
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
		return $found === $table;
	}

	/**
	 * Create (or reconcile) the registry table. Idempotent.
	 *
	 * dbDelta() compares the declared schema with the installed table and
	 * applies only the missing pieces, so an existing table is never dropped
	 * and existing identity rows are never touched. Returns false — never an
	 * exception or a silent pass — when the table cannot be created or
	 * verified, which is the fail-closed signal the registry consumes.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return bool
	 */
	public static function create() {
		if ( ! function_exists( 'dbDelta' ) ) {
			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		}
		if ( ! function_exists( 'dbDelta' ) ) {
			return false;
		}

		dbDelta( self::schema() );

		if ( self::last_error() ) {
			return false;
		}
		return self::exists();
	}

	/**
	 * The declared table schema in dbDelta() form.
	 *
	 * dbDelta() parsing rules: the PRIMARY KEY definition and each index
	 * declaration live on their own line, PRIMARY KEY is followed by two
	 * spaces, and indexes are declared with KEY. The unique keys are the
	 * §123/database-enforced non-reassignment guarantees; `deleted_at` is the
	 * retained tombstone column (data-model.md §Identity distinction).
	 *
	 * @return string
	 */
	public static function schema() {
		global $wpdb;

		$table      = self::table_name();
		$collation  = trim( (string) $wpdb->get_charset_collate() );
		$collation  = '' === $collation ? '' : ' ' . $collation;

		return "CREATE TABLE {$table} (
	" . self::COLUMN_ID . " bigint unsigned NOT NULL AUTO_INCREMENT,
	" . self::COLUMN_PUBLIC_ID . " char(" . self::PUBLIC_ID_LENGTH . ") NOT NULL,
	" . self::COLUMN_RESOURCE_TYPE . " varchar(" . self::RESOURCE_TYPE_LENGTH . ") NOT NULL,
	" . self::COLUMN_INTERNAL_POST_ID . " bigint unsigned NOT NULL,
	" . self::COLUMN_CREATED_AT . " datetime NOT NULL,
	" . self::COLUMN_DELETED_AT . " datetime NULL DEFAULT NULL,
	PRIMARY KEY  (" . self::COLUMN_ID . "),
	UNIQUE KEY " . self::UNIQUE_PUBLIC_ID_NAME . " (" . self::COLUMN_PUBLIC_ID . "),
	UNIQUE KEY " . self::UNIQUE_RESOURCE_NAME . " (" . self::COLUMN_RESOURCE_TYPE . ", " . self::COLUMN_INTERNAL_POST_ID . ")
)" . $collation . ";\n";
	}

	/**
	 * The bounded database error from the most recent schema operation, or an
	 * empty string when none occurred. Used only as a boolean fail signal; the
	 * message text is never surfaced to any caller or public response.
	 *
	 * @global \wpdb $wpdb WordPress database abstraction.
	 * @return string
	 */
	private static function last_error() {
		global $wpdb;
		return (string) $wpdb->last_error;
	}
}
