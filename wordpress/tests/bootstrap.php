<?php
/**
 * WordPress plugin unit/integration suite bootstrap (Delivery 002, T002).
 *
 * Boots the clean local WordPress verification profile for the first-party
 * songhealth-core plugin and nothing else:
 *
 * - WordPress core and the WordPress PHPUnit test library, both resolved from
 *   the T001 composer baseline;
 * - the songhealth-core plugin, loaded as the only first-party boundary via
 *   `muplugins_loaded`;
 * - no legacy WordPress theme or plugin is loaded, no mu-plugin is registered,
 *   and no Delivery 001 runtime asset (Fastify/Kysely server, admin app,
 *   container infrastructure) is ever included.
 *
 * Every prerequisite below fails closed with an actionable message instead of
 * silently testing a different, dirty, or Production-shaped profile.
 *
 * Environment overrides (all optional):
 * - WP_TESTS_DIR: WordPress test library root. Default: composer-installed
 *   wp-phpunit package (`vendor/wp-phpunit/wp-phpunit`).
 * - WP_PHPUNIT__TESTS_CONFIG: path to the real test installation
 *   configuration. Default: `wp-tests-config.php` in the wordpress root.
 *
 * ABSPATH itself (the clean WordPress core installation under test) and the
 * disposable verification database are defined by wp-tests-config.php; see
 * wp-tests-config-sample.php. Neither may point at a Production or legacy
 * installation.
 */

declare(strict_types=1);

$wordpress_root = dirname( __DIR__ );

/*
 * Composer autoloader from the T001 baseline (phpunit, wp-phpunit,
 * phpunit-polyfills).
 */
if ( ! file_exists( $wordpress_root . '/vendor/autoload.php' ) ) {
	fwrite( STDERR, "[songhealth-tests] composer dependencies are not installed.\n" );
	fwrite( STDERR, "[songhealth-tests] Run `composer install` inside `wordpress/` to create the verification baseline.\n" );
	exit( 1 );
}
require_once $wordpress_root . '/vendor/autoload.php';

/*
 * WordPress test library: wp-phpunit vendors the WordPress core PHPUnit
 * library (`includes/functions.php`, `includes/bootstrap.php`).
 */
$wp_tests_dir = (string) getenv( 'WP_TESTS_DIR' );
if ( '' === $wp_tests_dir ) {
	$wp_tests_dir = $wordpress_root . '/vendor/wp-phpunit/wp-phpunit';
}
if ( ! file_exists( $wp_tests_dir . '/includes/functions.php' ) ) {
	fwrite( STDERR, "[songhealth-tests] WordPress test library not found at: {$wp_tests_dir}\n" );
	fwrite( STDERR, "[songhealth-tests] Run `composer install` inside `wordpress/` (or set WP_TESTS_DIR).\n" );
	exit( 1 );
}

/*
 * Real test installation configuration for the clean profile. The wp-phpunit
 * package reads WP_PHPUNIT__TESTS_CONFIG when its proxied wp-tests-config.php
 * is loaded by the test library bootstrap, so the variable must be exported
 * before that bootstrap runs. Relative values (the phpunit.xml.dist default)
 * are resolved against the wordpress root.
 */

/**
 * Whether a path is absolute (Unix or Windows drive-rooted).
 *
 * @param string $path Path to check.
 * @return bool
 */
function _songhealth_core_tests_is_absolute( $path ) {
	return (bool) preg_match( '#^(?:[A-Za-z]:)?[/\\\\]#', (string) $path );
}

$wp_tests_config = (string) getenv( 'WP_PHPUNIT__TESTS_CONFIG' );
if ( '' === $wp_tests_config ) {
	$wp_tests_config = 'wp-tests-config.php';
}
if ( ! _songhealth_core_tests_is_absolute( $wp_tests_config ) ) {
	$wp_tests_config = $wordpress_root . '/' . ltrim( $wp_tests_config, '/' );
}
if ( ! file_exists( $wp_tests_config ) ) {
	fwrite( STDERR, "[songhealth-tests] test installation configuration not found at: {$wp_tests_config}\n" );
	fwrite( STDERR, "[songhealth-tests] Copy `wordpress/wp-tests-config-sample.php` to `wordpress/wp-tests-config.php`, point ABSPATH at a clean WordPress core installation and the disposable test database, then rerun.\n" );
	exit( 1 );
}
putenv( 'WP_PHPUNIT__TESTS_CONFIG=' . $wp_tests_config );

/*
 * Valid baseline configuration for the clean verification profile.
 *
 * The disposable profile supplies a complete, valid, environment-separated
 * server configuration exactly as a real deployment would (T006 schema:
 * environment variable first, wp-config constant second). This matters
 * since T053: startup validation fails closed on any missing, malformed,
 * unsafe, or wrong-origin setting — withholding the data-bearing REST
 * surfaces and refusing new resource acceptance — so a profile with NO
 * configuration would leave every protected-work test exercising the outage
 * path instead of the behavior under test. The values are non-secret,
 * non-Production, loopback-only fixtures of this disposable profile; the
 * safety suite (DiagnosticsSafetyTest) pins each invalid variant
 * explicitly against this baseline. An already-exported variable wins, so
 * an operator may supply the profile configuration from outside.
 */
foreach ( array(
	'SONGHEALTH_ENVIRONMENT'        => 'development',
	'SONGHEALTH_PUBLIC_ORIGIN'      => 'http://127.0.0.1:4173',
	'SONGHEALTH_PREVIEW_SIGNING_KEY' => 'T002-verification-profile-signing-key-0123456789abcdef',
) as $songhealth_key => $songhealth_value ) {
	$current = getenv( $songhealth_key );
	if ( false === $current || '' === $current ) {
		putenv( $songhealth_key . '=' . $songhealth_value );
	}
}

/*
 * Load ONLY the first-party plugin as the Songhealth boundary. Registered
 * before the test library bootstrap so the plugin is active on the clean
 * installation from the first request, exactly like a normal load order.
 */
require_once $wp_tests_dir . '/includes/functions.php';

function _songhealth_core_tests_load_plugin() {
	require_once dirname( __DIR__ ) . '/wp-content/plugins/songhealth-core/songhealth-core.php';
}
tests_add_filter( 'muplugins_loaded', '_songhealth_core_tests_load_plugin' );

/*
 * Start the clean WordPress test environment (installs the disposable test
 * database schema and boots WordPress core with its default theme).
 */
require $wp_tests_dir . '/includes/bootstrap.php';

/*
 * Provision the plugin-owned identity registry table on the installed test
 * database BEFORE any test runs.
 *
 * The test framework isolates every test inside a transaction and rewrites
 * CREATE TABLE to CREATE TEMPORARY TABLE while a test is running, and MySQL
 * does not list temporary tables in SHOW TABLES — so a table created lazily
 * from inside a test would be invisible to the schema check and every
 * registry operation would fail closed. Creating it here makes it a real
 * table of the disposable test database; the rows written by tests are still
 * rolled back per test. This mirrors how WordPress core provisions its own
 * tables during the test install and asserts the plugin's schema actually
 * installs on the real engine.
 */
if ( ! \SonghealthCore\Identity\RegistrySchema::create() ) {
	fwrite( STDERR, "[songhealth-tests] the songhealth identity registry table could not be created on the test database.\n" );
	exit( 1 );
}
