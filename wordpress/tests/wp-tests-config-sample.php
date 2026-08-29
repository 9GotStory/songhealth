<?php
/**
 * Sample test installation configuration for the clean WordPress
 * verification profile (Delivery 002, T002).
 *
 * Copy this file to `wordpress/wp-tests-config.php` (git-ignored) and adjust.
 * Every value below describes ONLY the disposable local verification profile.
 *
 * ABSPATH must point at a clean WordPress core installation (the verification
 * version pinned by the profile, for example the one installed by WordPress's
 * `bin/install-wp-tests.sh`); it must never point at the legacy Songhealth
 * WordPress installation or any Production host. The database must be a
 * disposable test database, never a Production or legacy database.
 */

/* Path to the clean WordPress core installation under test. */
if ( ! defined( 'ABSPATH' ) ) {
	$test_abspath = (string) getenv( 'WORDPRESS_TEST_ABSPATH' );
	define( 'ABSPATH', $test_abspath !== '' ? $test_abspath : rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress/' );
}

/* Disposable verification database only. */
if ( ! defined( 'DB_NAME' ) ) {
	define( 'DB_NAME', (string) ( getenv( 'WORDPRESS_TEST_DB_NAME' ) ?: 'wordpress_test' ) );
}
if ( ! defined( 'DB_USER' ) ) {
	define( 'DB_USER', (string) ( getenv( 'WORDPRESS_TEST_DB_USER' ) ?: 'root' ) );
}
if ( ! defined( 'DB_PASSWORD' ) ) {
	define( 'DB_PASSWORD', (string) ( getenv( 'WORDPRESS_TEST_DB_PASSWORD' ) ?: 'root' ) );
}
if ( ! defined( 'DB_HOST' ) ) {
	define( 'DB_HOST', (string) ( getenv( 'WORDPRESS_TEST_DB_HOST' ) ?: 'localhost' ) );
}
if ( ! defined( 'DB_CHARSET' ) ) {
	define( 'DB_CHARSET', 'utf8' );
}
if ( ! defined( 'DB_COLLATE' ) ) {
	define( 'DB_COLLATE', '' );
}

$table_prefix = (string) ( getenv( 'WORDPRESS_TEST_TABLE_PREFIX' ) ?: 'wptests_' );

define( 'WP_TESTS_DOMAIN', 'example.org' );
define( 'WP_TESTS_EMAIL', 'admin@example.org' );
define( 'WP_TESTS_TITLE', 'Test Blog' );
define( 'WP_DEBUG', true );
define( 'WP_PHP_BINARY', 'php' );
define( 'WPLANG', '' );
