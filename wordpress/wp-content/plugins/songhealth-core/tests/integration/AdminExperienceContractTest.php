<?php
/**
 * Admin experience contract tests (Delivery 002, G04-B01/G04-B02).
 *
 * Focused corrective regressions for the bounded wp-admin experience:
 * the real rendered visibility selector structure (B01) and the fail-closed
 * behavior of invalid or missing submitted visibility (B02), per the Human
 * rework authorization for Delivery 002 Gate 04.
 *
 * Source of truth: specs/002-headless-wordpress-foundation/spec.md FR-013,
 * FR-015; tasks.md T033; the G04-B01/G04-B02 rework authorization;
 * .specify/memory/constitution.md I, IV.
 *
 * @package SonghealthCore\Tests
 */

declare( strict_types=1 );

namespace SonghealthCore\Tests\Integration;

use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Content\AdminExperience;
use SonghealthCore\Content\FoundationTypes;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Tests\ServiceCreatedRecordCleanup;
use WP_UnitTestCase;

require_once __DIR__ . '/../ServiceCreatedRecordCleanup.php';

/**
 * @group admin
 * @group us2
 */
class AdminExperienceContractTest extends WP_UnitTestCase {

	use ServiceCreatedRecordCleanup;

	/** @var int Editor actor for the save path. */
	private $editor = 0;

	public function set_up() {
		parent::set_up();

		putenv( 'SONGHEALTH_ENVIRONMENT=development' );
		putenv( 'SONGHEALTH_PUBLIC_ORIGIN=http://127.0.0.1:4173' );
		putenv( 'SONGHEALTH_PREVIEW_SIGNING_KEY=B01B02-contract-verification-signing-key-0123456789' );
		$reset = new \ReflectionProperty( \SonghealthCore\Plugin::class, 'configuration' );
		$reset->setAccessible( true );
		$reset->setValue( null, null );

		$existing = get_user_by( 'slug', 'admin_contract_editor' );
		$this->editor = $existing
			? (int) $existing->ID
			: (int) self::factory()->user->create(
				array(
					'user_login' => 'admin_contract_editor',
					'role'       => 'songhealth_editor',
				)
			);
		wp_update_user( array( 'ID' => $this->editor, 'role' => 'songhealth_editor' ) );
		update_user_meta( $this->editor, CapabilityMap::META_MODULE_SCOPE, CapabilityMap::modules() );
		delete_user_meta( $this->editor, \SonghealthCore\Authorization\AuthorizationService::META_ACCOUNT_STATUS );

		wp_set_current_user( 0 );
		$_POST = array();
	}

	public function tear_down() {
		wp_set_current_user( 0 );
		$_POST = array();
		parent::tear_down();
		$this->songhealth_delete_tracked_records();

		foreach ( FoundationTypes::supported_types() as $post_type ) {
			FoundationTypes::register_metadata( $post_type );
		}
	}

	/**
	 * Create an accepted Draft Basic Page fixture.
	 *
	 * @param string $visibility Persisted visibility to start from.
	 * @return array{post_id: int, public_id: string}
	 */
	private function create_page( $visibility = FoundationTypes::VISIBILITY_PUBLIC ) {
		$created = CreateTimePublicId::create(
			array(
				'post_type'   => FoundationTypes::BASIC_PAGE,
				'post_title'  => 'Admin Contract Fixture',
				'post_name'   => 'admin-contract-fixture',
				'post_status' => 'draft',
				'post_author' => $this->editor,
			)
		);
		$this->assertIsArray( $created, 'fixture creation must succeed through the accepted boundary' );
		$this->songhealth_track_record( (int) $created['post_id'] );
		if ( FoundationTypes::VISIBILITY_PUBLIC !== $visibility ) {
			update_post_meta( (int) $created['post_id'], FoundationTypes::META_VISIBILITY, $visibility );
		}
		update_post_meta( (int) $created['post_id'], FoundationTypes::META_SUMMARY, 'Prior summary.' );
		return $created;
	}

	/**
	 * Render the real publication metabox for one record and parse it.
	 *
	 * @param int $post_id Record to render.
	 * @return \DOMDocument The parsed rendered metabox.
	 */
	private function render_publication_box( $post_id ) {
		$reflection = new \ReflectionMethod( AdminExperience::class, 'render_publication_box' );
		$reflection->setAccessible( true );

		ob_start();
		$reflection->invoke( null, get_post( $post_id ) );
		$html = (string) ob_get_clean();

		$document = new \DOMDocument();
		$this->assertNotFalse( $document->loadHTML( '<?xml encoding="utf-8" ?>' . $html ), 'the metabox renders parseable markup' );
		return $document;
	}

	/**
	 * Assert the rendered visibility selector structure against the contract.
	 *
	 * @param \DOMDocument $document        Parsed metabox.
	 * @param string       $expected_selected The visibility value that must be selected.
	 * @return void
	 */
	private function assert_visibility_structure( $document, $expected_selected ) {
		$selects = $document->getElementsByTagName( 'select' );
		$this->assertSame( 1, $selects->length, 'exactly one select is rendered in the publication metabox' );
		$select = $selects->item( 0 );
		$this->assertSame( 'songhealth_visibility', $select->getAttribute( 'id' ), 'the select is the visibility select' );

		/* The allowed options are the exact children of that select. */
		$allowed = array( FoundationTypes::VISIBILITY_PUBLIC, FoundationTypes::VISIBILITY_HIDDEN, FoundationTypes::VISIBILITY_INTERNAL );
		$children = array();
		for ( $child = $select->firstChild; null !== $child; $child = $child->nextSibling ) {
			if ( XML_ELEMENT_NODE === $child->nodeType ) {
				$this->assertSame( 'option', $child->nodeName, 'every element child of the select is an option' );
				$children[] = $child->getAttribute( 'value' );
			}
		}
		$this->assertSame( $allowed, $children, 'the three allowlisted options are the select children, in order' );

		/* No option markup is emitted anywhere outside the select. */
		$all_options = $document->getElementsByTagName( 'option' );
		$this->assertSame( 3, $all_options->length, 'no option element exists outside the visibility select' );

		/* Exactly the current persisted value is selected. */
		$selected = array();
		for ( $child = $select->firstChild; null !== $child; $child = $child->nextSibling ) {
			if ( XML_ELEMENT_NODE === $child->nodeType && $child->hasAttribute( 'selected' ) ) {
				$selected[] = $child->getAttribute( 'value' );
			}
		}
		$this->assertSame( array( $expected_selected ), $selected, 'exactly the current value is selected' );
	}

	/** @test */
	public function test_b01_the_visibility_options_are_inside_the_select_with_the_current_value_selected() {
		foreach ( array( FoundationTypes::VISIBILITY_PUBLIC, FoundationTypes::VISIBILITY_HIDDEN, FoundationTypes::VISIBILITY_INTERNAL ) as $visibility ) {
			$page = $this->create_page( $visibility );
			$this->assert_visibility_structure( $this->render_publication_box( (int) $page['post_id'] ), $visibility );
		}
	}

	/** @test */
	public function test_b01_an_absent_persisted_visibility_defaults_to_public_in_the_selector() {
		$page = $this->create_page();
		delete_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY );
		$this->assert_visibility_structure( $this->render_publication_box( (int) $page['post_id'] ), FoundationTypes::VISIBILITY_PUBLIC );
	}

	/** @test */
	public function test_b01_a_hostile_persisted_value_never_reaches_the_rendered_markup() {
		$page = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );
		/* Bypass the schema sanitizers the way no admin path can, to prove the renderer's own boundary. */
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, '<script>alert(1)</script>' );

		$html = $this->render_publication_box( (int) $page['post_id'] )->saveHTML();
		$this->assertStringNotContainsString( '<script>', $html, 'no raw markup from a hostile stored value reaches the metabox' );
		$this->assert_visibility_structure( $this->render_publication_box( (int) $page['post_id'] ), FoundationTypes::VISIBILITY_PUBLIC );
	}

	/**
	 * Drive the real save hook with one bounded-field submission.
	 *
	 * @param int   $post_id Record being saved.
	 * @param array $post    The submitted form values.
	 * @return void
	 */
	private function submit_save( $post_id, array $post ) {
		wp_set_current_user( $this->editor );
		$_POST = array(
			AdminExperience::SAVE_NONCE_FIELD => wp_create_nonce( AdminExperience::SAVE_NONCE_ACTION ),
			'songhealth_summary'              => $post['songhealth_summary'] ?? '',
			'songhealth_document_references'  => $post['songhealth_document_references'] ?? '',
		);
		if ( array_key_exists( 'songhealth_visibility', $post ) ) {
			$_POST['songhealth_visibility'] = $post['songhealth_visibility'];
		}
		do_action( 'save_post_' . FoundationTypes::BASIC_PAGE, $post_id, get_post( $post_id ) );
	}

	/**
	 * The queued bounded notices of the current editor, then cleared.
	 *
	 * @return string[]
	 */
	private function current_notices() {
		$key     = AdminExperience::NOTICE_TRANSIENT . '_' . $this->editor;
		$notices = get_transient( $key );
		delete_transient( $key );
		return is_array( $notices ) ? $notices : array();
	}

	/** @test */
	public function test_b02_hidden_with_an_invalid_submitted_visibility_is_preserved_fail_closed() {
		$page = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );

		$this->submit_save( (int) $page['post_id'], array(
			'songhealth_visibility' => 'everyone-visible',
			'songhealth_summary'    => 'Attempted replacement summary.',
		) );

		$this->assertSame( FoundationTypes::VISIBILITY_HIDDEN, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ), 'Hidden is never broadened by an invalid submission' );
		$this->assertSame( 'Prior summary.', (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_SUMMARY, true ), 'the invalid submission writes no unrelated field' );

		$notices = $this->current_notices();
		$this->assertCount( 1, $notices, 'exactly one bounded notice describes the outcome' );
		$this->assertStringContainsString( 'ไม่มีการบันทึกการเปลี่ยนแปลง', (string) $notices[0], 'the notice states that nothing was saved' );
		$this->assertStringContainsString( 'ค่าการมองเห็นเดิมยังคงอยู่', (string) $notices[0], 'the notice states that the previous visibility was kept' );
	}

	/** @test */
	public function test_b02_internal_with_an_invalid_submitted_visibility_is_preserved_fail_closed() {
		$page = $this->create_page( FoundationTypes::VISIBILITY_INTERNAL );

		$this->submit_save( (int) $page['post_id'], array(
			'songhealth_visibility' => 'public<script>',
		) );

		$this->assertSame( FoundationTypes::VISIBILITY_INTERNAL, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ), 'Internal is never broadened by a malformed submission' );
		$this->assertSame( 'Prior summary.', (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_SUMMARY, true ) );
		$this->assertCount( 1, $this->current_notices() );
	}

	/** @test */
	public function test_b02_a_missing_submitted_visibility_does_not_broaden_a_restrictive_value() {
		$page = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );

		$this->submit_save( (int) $page['post_id'], array(
			'songhealth_summary' => 'Attempted summary with the visibility field absent.',
		) );

		$this->assertSame( FoundationTypes::VISIBILITY_HIDDEN, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ), 'an absent visibility never broadens Hidden' );
		$this->assertSame( 'Prior summary.', (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_SUMMARY, true ), 'nothing else is written by the missing-input path' );
		$this->assertCount( 1, $this->current_notices() );
	}

	/** @test */
	public function test_b02_valid_visibility_transitions_still_apply() {
		foreach ( array( FoundationTypes::VISIBILITY_PUBLIC, FoundationTypes::VISIBILITY_HIDDEN, FoundationTypes::VISIBILITY_INTERNAL ) as $target ) {
			$page = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );

			$this->submit_save( (int) $page['post_id'], array(
				'songhealth_visibility' => $target,
				'songhealth_summary'    => 'Summary with a valid transition.',
			) );

			$this->assertSame( $target, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ), "a valid transition to {$target} is saved" );
			$this->assertSame( 'Summary with a valid transition.', (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_SUMMARY, true ), 'a valid save writes the other submitted fields' );
			$this->assertSame( array(), $this->current_notices(), 'a fully valid save queues no notice' );
		}
	}

	/** @test */
	public function test_b02_an_invalid_visibility_leaves_references_and_the_identity_untouched() {
		$page         = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );
		$reference    = $this->create_page();
		$stored_refs  = array( (string) $reference['public_id'] );
		update_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, $stored_refs );
		$identity_before = (string) \SonghealthCore\Identity\PublicIdRegistry::public_id_for( 'basic-page', (int) $page['post_id'] );

		$this->submit_save( (int) $page['post_id'], array(
			'songhealth_visibility'             => 'invalid-value',
			'songhealth_summary'                => 'Attempted summary.',
			'songhealth_document_references'    => (string) $reference['public_id'] . "\nnot-a-public-id",
		) );

		$this->assertSame( FoundationTypes::VISIBILITY_HIDDEN, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ) );
		$this->assertSame( 'Prior summary.', (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_SUMMARY, true ) );
		$this->assertSame( $stored_refs, (array) get_post_meta( (int) $page['post_id'], FoundationTypes::META_DOCUMENT_REFERENCES, true ), 'the invalid path leaves the references untouched' );
		$this->assertSame( $identity_before, (string) \SonghealthCore\Identity\PublicIdRegistry::public_id_for( 'basic-page', (int) $page['post_id'] ), 'identity is never written' );
	}

	/** @test */
	public function test_b02_a_save_without_this_form_changes_nothing() {
		$page = $this->create_page( FoundationTypes::VISIBILITY_HIDDEN );
		wp_set_current_user( $this->editor );
		unset( $_POST[ AdminExperience::SAVE_NONCE_FIELD ] );

		do_action( 'save_post_' . FoundationTypes::BASIC_PAGE, (int) $page['post_id'], get_post( (int) $page['post_id'] ) );

		$this->assertSame( FoundationTypes::VISIBILITY_HIDDEN, (string) get_post_meta( (int) $page['post_id'], FoundationTypes::META_VISIBILITY, true ), 'a write path without this form is untouched' );
		$this->assertSame( array(), $this->current_notices() );
	}
}
