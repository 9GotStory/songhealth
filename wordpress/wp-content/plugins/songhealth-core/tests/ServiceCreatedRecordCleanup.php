<?php
/**
 * Shared cleanup for Songhealth service-created records (test support).
 *
 * The supported-resource creation service (T012) is deliberately
 * transactional: it commits its bounded creation transaction in production,
 * which also commits the test framework's isolation transaction for its own
 * rows. Those rows therefore survive the framework's per-test rollback and
 * must be deleted explicitly, with the deletion committed, so one test's
 * fixtures can never leak into another test's eligibility or listing result.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests;

trait ServiceCreatedRecordCleanup {

	/** @var int[] Service-created post IDs to remove after the test. */
	private $songhealth_tracked_post_ids = array();

	/**
	 * Track a service-created record for cleanup.
	 *
	 * @param int $post_id Service-created post ID.
	 * @return void
	 */
	private function songhealth_track_record( $post_id ) {
		$this->songhealth_tracked_post_ids[] = (int) $post_id;
	}

	/**
	 * Delete every tracked service-created record durably.
	 *
	 * Call AFTER parent::tear_down(): the framework has rolled its
	 * transaction back by then, and the deletion is committed here so the
	 * next test starts without this test's fixtures. Deletion tombstones the
	 * retained identity mapping through the accepted deletion boundary
	 * (T011/T012), which is exactly the production transition.
	 *
	 * @return void
	 */
	private function songhealth_delete_tracked_records() {
		global $wpdb;

		if ( array() === $this->songhealth_tracked_post_ids ) {
			return;
		}
		$ids = $this->songhealth_tracked_post_ids;
		$this->songhealth_tracked_post_ids = array();

		$wpdb->query( 'COMMIT' );
		$wpdb->query( 'START TRANSACTION' );
		foreach ( $ids as $post_id ) {
			if ( null !== get_post( $post_id ) ) {
				wp_delete_post( $post_id, true );
			}
		}
		$wpdb->query( 'COMMIT' );
	}
}
