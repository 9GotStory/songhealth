<?php
/**
 * Native public-surface containment suite bootstrap (Delivery 002, T003).
 *
 * Runs the containment suite against a CLEAN WordPress installation. It
 * reuses the plugin-suite harness (tests/bootstrap.php), which boots the
 * clean verification profile — WordPress core, its default theme, and the
 * first-party songhealth-core plugin loaded as the only plugin — and then
 * fails closed unless that clean-installation state actually holds.
 *
 * Containment evidence is only meaningful for the native surfaces
 * (REST, single, archive, search, feed, sitemap, taxonomy, author, date,
 * oEmbed, attachment/media, direct routes) of an unmodified profile, so a
 * dirty or misrouted profile is reported, never silently tested.
 *
 * Invocation (from `wordpress/`):
 *   composer test:containment
 *   vendor/bin/phpunit --bootstrap tests/containment/bootstrap.php tests/containment
 */

declare(strict_types=1);

require_once dirname( __DIR__ ) . '/bootstrap.php';

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "[songhealth-containment] the clean WordPress installation did not boot; refusing to run containment evidence.\n" );
	exit( 1 );
}

if ( ! defined( 'SONGHEALTH_CORE_VERSION' ) ) {
	fwrite( STDERR, "[songhealth-containment] the songhealth-core plugin boundary did not load; refusing to run containment evidence.\n" );
	exit( 1 );
}

/*
 * Clean-installation invariant: no plugin is active through the normal
 * plugin-loading path. songhealth-core itself is loaded by the harness as a
 * test-time must-use boundary, so any additionally active plugin means the
 * profile is not the clean installation containment evidence requires.
 */
$active_plugins = get_option( 'active_plugins', array() );
if ( ! empty( $active_plugins ) ) {
	$count = count( $active_plugins );
	fwrite( STDERR, "[songhealth-containment] {$count} active plugin(s) found on the installation under test; a clean profile has none.\n" );
	fwrite( STDERR, "[songhealth-containment] Recreate the disposable verification profile (clean WordPress core + wp-tests-config.php) and rerun.\n" );
	exit( 1 );
}

define( 'SONGHEALTH_CONTAINMENT_BOOTSTRAPPED', true );
