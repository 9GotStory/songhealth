<?php
/**
 * Bounded Songhealth admin experience (Delivery 002, T033).
 *
 * The minimum Basic Page and Document Resource wp-admin experience, built
 * with WordPress-native administration mechanisms only: Songhealth work
 * language (Frozen 06 §36), two bounded metaboxes, a read-only Public ID
 * display, bounded validation messages, capability-aware actions, and
 * accepted creation routed exclusively through the Songhealth
 * supported-resource creation service (FR-015, FR-016; tasks.md T033).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-004, FR-005, FR-013,
 *   FR-015, FR-016, FR-017;
 * - docs/website-modernization-docs/current/05-admin-cms.md effective v1.1;
 * - docs/website-modernization-docs/current/06-roles-permissions.md §§36,
 *   42 (FROZEN v1.0);
 * - specs/002-headless-wordpress-foundation/data-model.md §§Basic Page
 *   Foundation Record, Document Resource Foundation Record;
 * - .specify/memory/constitution.md I, II, IV.
 *
 * Boundary contract: WordPress Core remains the admin infrastructure and the
 * only identity store — there is no custom Admin SPA, no second user or role
 * authority, and no parallel CMS concept here (FR-014, FR-015). What this
 * module adds is strictly Songhealth-owned presentation and routing:
 *
 * - Accepted creation only through CreateTimePublicId::create (T012): the
 *   "Add New" entry point creates the accepted Draft — immutable Public ID
 *   established before success is reported — and then hands the editor the
 *   ordinary WordPress editor. Raw Core insertion stays refused by the T012
 *   boundary, so no admin path can create an unaccepted row.
 * - Updates, autosaves, and revisions of already identified resources keep
 *   their ordinary WordPress behavior (FR-005): the bounded fields save
 *   through the ordinary meta path under the shared authorization decision,
 *   autosave is never intercepted, and identity is never written.
 * - Every privileged action is capability-aware through the shared
 *   default-deny primitive (T009): field saves are decided against the
 *   record's current lifecycle, and the Preview action appears only for an
 *   actor whose fresh decision allows the record's view.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Content;

use SonghealthCore\Authorization\AuthorizationService;
use SonghealthCore\Authorization\CapabilityMap;
use SonghealthCore\Identity\CreateTimePublicId;
use SonghealthCore\Identity\PublicIdRegistry;
use SonghealthCore\Preview\PreviewController;
use WP_Post;

final class AdminExperience {

	/** The metabox save action. */
	const SAVE_NONCE_ACTION = 'songhealth_save_record';
	const SAVE_NONCE_FIELD  = 'songhealth_record_nonce';

	/** The transient namespace for one user's bounded validation notices. */
	const NOTICE_TRANSIENT = 'songhealth_admin_notices';

	/**
	 * Attach the bounded admin experience to the WordPress lifecycle.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_boxes' ) );
		add_action( 'save_post_' . FoundationTypes::BASIC_PAGE, array( __CLASS__, 'save_bounded_fields' ), 10, 2 );
		add_action( 'save_post_' . FoundationTypes::DOCUMENT_RESOURCE, array( __CLASS__, 'save_bounded_fields' ), 10, 2 );
		add_action( 'load-post-new.php', array( __CLASS__, 'route_new_record_through_the_creation_service' ) );
		add_action( 'admin_notices', array( __CLASS__, 'render_validation_notices' ) );
		add_filter( 'post_row_actions', array( __CLASS__, 'bounded_row_actions' ), 10, 2 );
	}

	/**
	 * Register the two bounded metaboxes for a supported record.
	 *
	 * @param string $post_type Post type of the screen.
	 * @return void
	 */
	public static function add_meta_boxes( $post_type ) {
		if ( ! FoundationTypes::is_supported_type( $post_type ) ) {
			return;
		}

		add_meta_box(
			'songhealth-identity',
			self::is_document_type( $post_type ) ? 'ข้อมูลประจำเอกสารเผยแพร่' : 'ข้อมูลประจำหน้าข้อมูลทั่วไป',
			array( __CLASS__, 'render_identity_box' ),
			$post_type,
			'side',
			'high'
		);
		add_meta_box(
			'songhealth-publication',
			'การเผยแพร่ของ Songhealth',
			array( __CLASS__, 'render_publication_box' ),
			$post_type,
			'normal',
			'default'
		);
	}

	/**
	 * The identity box: the immutable Public ID, read-only, and the
	 * capability-aware Preview action.
	 *
	 * @param WP_Post $post Record being edited.
	 * @return void
	 */
	public static function render_identity_box( $post ) {
		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		$public_id     = null === $resource_type ? null : PublicIdRegistry::public_id_for( $resource_type, (int) $post->ID );

		wp_nonce_field( self::SAVE_NONCE_ACTION, self::SAVE_NONCE_FIELD );

		if ( null === $public_id ) {
			/*
			 * Only reachable for a quarantined internal candidate, which no
			 * admin path creates: the creation service owns accepted creation.
			 * The bounded message states the fact and names nothing.
			 */
			echo '<p class="description">ระเบียนนี้ยังไม่ใช่ทรัพยากรของ Songhealth ที่ถูกยอมรับ จึงยังไม่มีรหัสประจำ</p>';
			return;
		}

		echo '<p><strong>รหัสประจำ (Public ID)</strong></p>';
		printf(
			'<p><code data-songhealth-public-id="%1$s">%1$s</code></p>',
			esc_html( $public_id )
		);
		echo '<p class="description">รหัสนี้ออกให้ครั้งเดียวเมื่อสร้างระเบียนสำเร็จ และไม่เปลี่ยนแปลงอีกไม่ว่าจะแก้ไขชื่อหรือสถานะใด ๆ</p>';

		$target = PreviewController::initiation_target( (int) $post->ID );
		if ( null !== $target ) {
			printf(
				'<p><a class="button" data-songhealth-preview="1" href="%1$s">ดูตัวอย่าง (ไม่ใช่หน้าสาธารณะ)</a></p>',
				esc_url( self::initiation_url( (int) $post->ID ) )
			);
			echo '<p class="description">ตัวอย่างเปิดได้เฉพาะผู้ที่มีสิทธิ์ปัจจุบันเท่านั้น และเป็นการอ่านอย่างเดียว</p>';
		}
	}

	/**
	 * The bounded publication fields of one record.
	 *
	 * @param WP_Post $post Record being edited.
	 * @return void
	 */
	public static function render_publication_box( $post ) {
		$is_document = self::is_document_type( $post->post_type );

		$summary    = (string) get_post_meta( (int) $post->ID, FoundationTypes::META_SUMMARY, true );
		$visibility = (string) get_post_meta( (int) $post->ID, FoundationTypes::META_VISIBILITY, true );
		if ( '' === $visibility ) {
			$visibility = FoundationTypes::VISIBILITY_PUBLIC;
		}

		echo '<table class="form-table" role="presentation"><tbody>';

		printf(
			'<tr><th scope="row"><label for="songhealth_summary">%1$s</label></th><td><textarea id="songhealth_summary" name="songhealth_summary" rows="3" class="large-text code">%2$s</textarea><p class="description">ข้อความสั้น ๆ สำหรับผู้อ่าน ไม่รองรับโค้ด</p></td></tr>',
			esc_html( 'สรุป' ),
			esc_textarea( $summary )
		);

		printf(
			'<tr><th scope="row"><label for="songhealth_visibility">%1$s</label></th><td><select id="songhealth_visibility" name="songhealth_visibility">%2$s</select><p class="description">กำหนดว่าระเบียนที่เผยแพร่แล้วจะปรากฏตามการมองเห็นใด</p></td></tr>',
			esc_html( 'การมองเห็น' ),
			self::visibility_options( $visibility )
		);

		if ( $is_document ) {
			printf(
				'<tr><th scope="row"><label for="songhealth_document_date">%1$s</label></th><td><input type="text" id="songhealth_document_date" name="songhealth_document_date" value="%2$s" class="regular-text" placeholder="YYYY-MM-DD" /><p class="description">วันที่ของตัวเอกสารเอง ไม่ใช่วันที่เผยแพร่ (รูปแบบ YYYY-MM-DD)</p></td></tr>',
				esc_html( 'วันที่เอกสาร' ),
				esc_attr( (string) get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_DATE, true ) )
			);
		} else {
			$references = get_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, true );
			$rendered   = is_array( $references ) ? implode( "\n", $references ) : '';
			printf(
				'<tr><th scope="row"><label for="songhealth_document_references">%1$s</label></th><td><textarea id="songhealth_document_references" name="songhealth_document_references" rows="4" class="large-text code">%2$s</textarea><p class="description">รหัสประจำ (Public ID) ของเอกสารเผยแพร่ที่เกี่ยวข้อง หนึ่งรหัสต่อบรรทัด</p></td></tr>',
				esc_html( 'เอกสารเผยแพร่ที่เกี่ยวข้อง' ),
				esc_textarea( $rendered )
			);
		}

		echo '</tbody></table>';
	}

	/**
	 * Save the bounded fields of one record through the ordinary update path.
	 *
	 * Authorization is the shared default-deny decision against the record's
	 * CURRENT lifecycle (T009): draft work is decided with the edit-draft
	 * capability and published work with save-published. Autosaves and
	 * revision writes are never intercepted (FR-005), identity is never
	 * written, and a denied or absent decision changes nothing.
	 *
	 * Validation is fail-closed (G04-B02): an invalid or missing visibility
	 * refuses the entire bounded-field save, preserving the persisted value
	 * and every other field, so no malformed submission can broaden a
	 * restrictive visibility or partially apply itself.
	 *
	 * @param int     $post_id Post ID being saved.
	 * @param WP_Post $post    Post being saved.
	 * @return void
	 */
	public static function save_bounded_fields( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return; // Ordinary WordPress autosave behavior is preserved.
		}
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( ! isset( $_POST[ self::SAVE_NONCE_FIELD ] ) ) {
			return; // Not this form (quick edit, bulk, or a non-admin write path).
		}
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::SAVE_NONCE_FIELD ] ) ), self::SAVE_NONCE_ACTION ) ) {
			return;
		}
		if ( ! $post instanceof WP_Post || ! FoundationTypes::is_supported_type( $post->post_type ) ) {
			return;
		}

		$resource_type = FoundationTypes::resource_type_for( $post->post_type );
		$capability    = AuthorizationService::LIFECYCLE_PUBLISHED === AuthorizationService::current_lifecycle( $post )
			? ( CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type ? CapabilityMap::CAP_DOCUMENT_RESOURCE_SAVE_PUBLISHED : CapabilityMap::CAP_BASIC_PAGE_SAVE_PUBLISHED )
			: ( CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type ? CapabilityMap::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT : CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT );

		$fields = array( 'title', 'summary', 'visibility' );
		$fields[] = CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type ? 'document_date' : 'document_references';

		$decision = AuthorizationService::decide(
			array(
				'capability' => $capability,
				'module'     => $resource_type,
				'object_id'  => (int) $post->ID,
				'fields'     => $fields,
			)
		);
		if ( ! $decision->allowed() ) {
			self::queue_notice( 'ไม่มีสิทธิ์บันทึกฟิลด์เหล่านี้ในสถานะปัจจุบันของระเบียน จึงไม่มีการเปลี่ยนแปลง' );
			return;
		}

		/*
		 * Visibility fails closed first (G04-B02): an unrecognized, malformed,
		 * or absent submitted visibility never broadens the persisted value and
		 * never silently writes the public default. The whole bounded-field
		 * save is refused — no field of this submission is written, so the
		 * invalid path cannot modify unrelated fields either — and the notice
		 * states exactly that outcome.
		 */
		$raw_visibility = sanitize_key( (string) wp_unslash( $_POST['songhealth_visibility'] ?? '' ) );
		if ( ! in_array( $raw_visibility, array( FoundationTypes::VISIBILITY_PUBLIC, FoundationTypes::VISIBILITY_HIDDEN, FoundationTypes::VISIBILITY_INTERNAL ), true ) ) {
			self::queue_notice( 'ค่าการมองเห็นไม่ถูกต้องหรือขาดหาย จึงไม่มีการบันทึกการเปลี่ยนแปลงใด ๆ ของระเบียนนี้ และค่าการมองเห็นเดิมยังคงอยู่' );
			return;
		}

		$invalid = array();

		/* Summary: plain text always sanitizes cleanly. */
		update_post_meta( (int) $post->ID, FoundationTypes::META_SUMMARY, FoundationTypes::sanitize_summary( wp_unslash( $_POST['songhealth_summary'] ?? '' ) ) );

		/* Visibility: the allowlisted submitted value, validated above. */
		update_post_meta( (int) $post->ID, FoundationTypes::META_VISIBILITY, $raw_visibility );

		if ( CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type ) {
			$raw_date = trim( (string) wp_unslash( $_POST['songhealth_document_date'] ?? '' ) );
			$clean    = FoundationTypes::sanitize_document_date( $raw_date );
			if ( '' !== $raw_date && '' === $clean ) {
				$invalid[] = 'วันที่เอกสาร';
			}
			update_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_DATE, $clean );
		} else {
			$raw_references = (string) wp_unslash( $_POST['songhealth_document_references'] ?? '' );
			$lines          = array_filter( array_map( 'trim', preg_split( '/\r\n|\r|\n/', $raw_references ) ) );
			$kept           = array();
			$dropped        = false;
			foreach ( $lines as $line ) {
				if ( FoundationTypes::is_public_id_shape( $line ) ) {
					$kept[] = strtolower( $line );
				} else {
					$dropped = true;
				}
			}
			if ( $dropped ) {
				$invalid[] = 'เอกสารเผยแพร่ที่เกี่ยวข้อง';
			}
			update_post_meta( (int) $post->ID, FoundationTypes::META_DOCUMENT_REFERENCES, FoundationTypes::sanitize_document_references( $kept ) );
		}

		if ( array() !== $invalid ) {
			self::queue_notice( 'ค่าบางฟิลด์ไม่ถูกต้องจึงไม่ถูกบันทึก: ' . implode( ', ', $invalid ) );
		}
	}

	/**
	 * Route "Add New" for a supported type through the creation service.
	 *
	 * The accepted Draft is created by CreateTimePublicId::create — immutable
	 * Public ID established and verified before success is reported (FR-004) —
	 * and the staff member is handed the ordinary editor for it. Creation is
	 * a freshly decided capability (T009); a denied actor receives the
	 * bounded Songhealth message and no record exists.
	 *
	 * @return void
	 */
	public static function route_new_record_through_the_creation_service() {
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';
		if ( ! FoundationTypes::is_supported_type( $post_type ) ) {
			return;
		}
		$resource_type = FoundationTypes::resource_type_for( $post_type );
		if ( null === $resource_type ) {
			return;
		}

		$capability = CapabilityMap::MODULE_DOCUMENT_RESOURCE === $resource_type
			? CapabilityMap::CAP_DOCUMENT_RESOURCE_CREATE
			: CapabilityMap::CAP_BASIC_PAGE_CREATE;

		$decision = AuthorizationService::decide(
			array(
				'capability' => $capability,
				'module'     => $resource_type,
			)
		);
		if ( ! $decision->allowed() ) {
			wp_die( 'ไม่มีสิทธิ์สร้างระเบียนประเภทนี้', 403 );
		}

		$actor  = wp_get_current_user();
		$labels = FoundationTypes::labels( $post_type );
		$prefix = self::is_document_type( $post_type ) ? 'เอกสารเผยแพร่' : 'หน้าข้อมูลทั่วไป';

		$created = CreateTimePublicId::create(
			array(
				'post_type'   => $post_type,
				/* translators: %s: the Songhealth singular work label. */
				'post_title'  => sprintf( '%s (ร่างใหม่)', $prefix ),
				'post_status' => 'draft',
				'post_author' => (int) $actor->ID,
			)
		);

		if ( is_wp_error( $created ) || ! is_array( $created ) ) {
			wp_die( 'ไม่สามารถสร้างระเบียนได้ในขณะนี้', 503 ); // Bounded: no cause detail (FR-020 posture).
		}

		wp_safe_redirect( add_query_arg( array( 'post' => (int) $created['post_id'], 'action' => 'edit' ), admin_url( 'post.php' ) ) );
		exit;
	}

	/**
	 * The bounded row actions of a supported record.
	 *
	 * The native "View" action links to a permalink these non-public types do
	 * not have — WordPress Core renders it only when the type is publicly
	 * viewable, but where it appears it competes with the React canonical
	 * destination (FR-009), so it is removed. The Songhealth Preview action
	 * appears only when the actor's fresh decision allows the record's view.
	 *
	 * @param string[] $actions Existing actions.
	 * @param WP_Post  $post    Record of the row.
	 * @return string[]
	 */
	public static function bounded_row_actions( $actions, $post ) {
		if ( ! $post instanceof WP_Post || ! FoundationTypes::is_supported_type( $post->post_type ) ) {
			return $actions;
		}

		unset( $actions['view'] );

		if ( null !== PreviewController::initiation_target( (int) $post->ID ) ) {
			$actions['songhealth-preview'] = sprintf(
				'<a href="%1$s" data-songhealth-preview="1">%2$s</a>',
				esc_url( self::initiation_url( (int) $post->ID ) ),
				'ดูตัวอย่าง'
			);
		}
		return $actions;
	}

	/**
	 * Render and clear the bounded validation notices of the current user.
	 *
	 * @return void
	 */
	public static function render_validation_notices() {
		$user = wp_get_current_user();
		if ( ! $user->exists() ) {
			return;
		}

		$key     = self::NOTICE_TRANSIENT . '_' . (int) $user->ID;
		$notices = get_transient( $key );
		if ( ! is_array( $notices ) || array() === $notices ) {
			return;
		}
		delete_transient( $key );

		foreach ( $notices as $notice ) {
			printf(
				'<div class="notice notice-warning is-dismissible"><p>%s</p></div>',
				esc_html( (string) $notice )
			);
		}
	}

	/**
	 * The admin-post initiation URL of one record, with its nonce.
	 *
	 * @param int $post_id Record to preview.
	 * @return string
	 */
	private static function initiation_url( $post_id ) {
		return wp_nonce_url(
			add_query_arg(
				array(
					'action' => PreviewController::ADMIN_ACTION,
					'post'   => (int) $post_id,
				),
				admin_url( 'admin-post.php' )
			),
			PreviewController::ADMIN_ACTION
		);
	}

	/**
	 * The allowlisted visibility options with Songhealth work language.
	 *
	 * Returns the escaped `<option>` markup for the caller to place inside the
	 * visibility `<select>`; nothing is echoed here, so no option markup can
	 * land outside the select (G04-B01).
	 *
	 * @param string $current Currently stored visibility.
	 * @return string The concatenated escaped option elements.
	 */
	private static function visibility_options( $current ) {
		$options = array(
			FoundationTypes::VISIBILITY_PUBLIC   => 'สาธารณะ',
			FoundationTypes::VISIBILITY_HIDDEN   => 'ซ่อน',
			FoundationTypes::VISIBILITY_INTERNAL => 'ภายใน',
		);

		$html = '';
		foreach ( $options as $value => $label ) {
			$html .= sprintf(
				'<option value="%1$s"%2$s>%3$s</option>',
				esc_attr( $value ),
				selected( $current, $value, false ),
				esc_html( $label )
			);
		}
		return $html;
	}

	/**
	 * Queue one bounded notice for the current user.
	 *
	 * The notice text is built from fixed Songhealth copy and field labels
	 * only; a stored value never reaches it (Constitution IV).
	 *
	 * @param string $message Bounded message.
	 * @return void
	 */
	private static function queue_notice( $message ) {
		$user = wp_get_current_user();
		if ( ! $user->exists() ) {
			return;
		}
		$key     = self::NOTICE_TRANSIENT . '_' . (int) $user->ID;
		$notices = get_transient( $key );
		$notices = is_array( $notices ) ? $notices : array();
		$notices[] = $message;
		set_transient( $key, $notices, 60 );
	}

	/**
	 * Whether a supported post type is the Document Resource type.
	 *
	 * @param string $post_type Post type name.
	 * @return bool
	 */
	private static function is_document_type( $post_type ) {
		return FoundationTypes::DOCUMENT_RESOURCE === $post_type;
	}
}
