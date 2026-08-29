<?php
/**
 * Songhealth default-deny authorization primitives (Delivery 002, T009).
 *
 * The server-side authorization boundary for privileged Songhealth behavior.
 * A request is allowed only when every applicable dimension — actor, action,
 * scope, object, field, lifecycle, and relationship — passes, and is denied in
 * every other case, including every case this module does not understand
 * (FR-013: default deny and least privilege).
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-013, FR-014, FR-017;
 * - specs/002-headless-wordpress-foundation/research.md §8;
 * - docs/website-modernization-docs/current/06-roles-permissions.md
 *   §§33–34, 41.5–41.8, 42 (FROZEN v1.0);
 * - docs/website-modernization-docs/current/10-system-blueprint.md
 *   §§165–166, 3768 ff.;
 * - .specify/memory/constitution.md I, IV.
 *
 * Decision order mirrors Frozen 06 §42.1 (account status, then module access,
 * then required capability, then current domain state) and keeps the meanings
 * of §42.2 separate: a denial reason here is a server-side category for the
 * caller to act on, never content to echo to a public surface, and never a
 * disclosure of the target record's protected state.
 *
 * Currency contract: every decision is computed from state read at decision
 * time. Nothing is cached, nothing is snapshot at login, and no nonce, cookie,
 * grant, URL, or prior authorization is ever an input — a nonce defends
 * against CSRF and is not authorization (plan.md §Constraints, Frozen 06
 * §42.4). Revocation therefore takes effect on the next request.
 *
 * Guardrails implemented here: no self-escalation (Frozen 06 §§33, 41.8) and
 * last-Administrator protection (Frozen 06 §§34, 41.8).
 *
 * This module defines the decision primitives only. Applying them to REST
 * permission callbacks, Preview, and the admin experience is T016/T019/T033.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Authorization;

use WP_User;

final class AuthorizationService {

	/* Songhealth account status values (Frozen 06 §§30, 41.1). */
	const ACCOUNT_ACTIVE   = 'active';
	const ACCOUNT_DISABLED = 'disabled';

	/** User meta key holding the Songhealth account status. */
	const META_ACCOUNT_STATUS = 'songhealth_account_status';

	/* Songhealth lifecycle states for authorization (data-model.md). */
	const LIFECYCLE_DRAFT     = 'draft';
	const LIFECYCLE_PUBLISHED = 'published';
	const LIFECYCLE_HIDDEN    = 'hidden';
	const LIFECYCLE_WITHDRAWN = 'withdrawn';

	/*
	 * Fields no caller may ever write. `public_id` is issued by the identity
	 * registry at creation and is immutable and never caller-selected
	 * (FR-004, FR-005); the rest are internal or audit values.
	 */
	const PROTECTED_FIELDS = array(
		'public_id',
		'resource_type',
		'internal_post_id',
		'author_user_id',
		'created_at',
		'updated_at',
	);

	/* Denial reason categories. Stable, bounded, and value-free. */
	const REASON_ALLOWED                = 'allowed';
	const REASON_REQUEST_UNSAFE         = 'request_unsafe';
	const REASON_CAPABILITY_UNKNOWN     = 'capability_unknown';
	const REASON_MODULE_UNKNOWN         = 'module_unknown';
	const REASON_MODULE_MISMATCH        = 'module_mismatch';
	const REASON_ACTOR_ANONYMOUS        = 'actor_anonymous';
	const REASON_ACTOR_ABSENT           = 'actor_absent';
	const REASON_ACTOR_DISABLED         = 'actor_disabled';
	const REASON_ROLE_ABSENT            = 'role_absent';
	const REASON_MODULE_OUT_OF_SCOPE    = 'module_out_of_scope';
	const REASON_CAPABILITY_DENIED      = 'capability_denied';
	const REASON_OBJECT_UNSUPPORTED     = 'object_unsupported';
	const REASON_OBJECT_ABSENT          = 'object_absent';
	const REASON_LIFECYCLE_NOT_ALLOWED  = 'lifecycle_not_allowed';
	const REASON_FIELD_PROTECTED        = 'field_protected';
	const REASON_FIELD_NOT_ALLOWED      = 'field_not_allowed';
	const REASON_RELATIONSHIP_ELEVATION = 'relationship_elevation';
	const REASON_SELF_ESCALATION        = 'self_escalation';
	const REASON_TARGET_ABSENT          = 'target_absent';
	const REASON_ROLE_UNKNOWN           = 'role_unknown';
	const REASON_STATUS_UNKNOWN         = 'status_unknown';
	const REASON_LAST_ADMINISTRATOR     = 'last_administrator';
	const REASON_DEFAULT_DENY           = 'default_deny';

	/**
	 * Decide a privileged Songhealth request.
	 *
	 * The request is a closed allowlist of keys. Any unrecognized key denies
	 * the whole request, so a caller cannot smuggle an extra dimension past
	 * the checks that follow.
	 *
	 * @param array $request {
	 *     Authorization request context.
	 *
	 *     @type string|null $actor      WP_User to evaluate. Defaults to the current user.
	 *     @type string      $capability Required Songhealth capability name.
	 *     @type string|null $module     Songhealth module the action applies to. Required
	 *                                   for module capabilities and derived from the
	 *                                   capability when omitted.
	 *     @type int|null    $object_id  Target post ID. Read live when present.
	 *     @type string[]    $fields     Fields the action would write.
	 *     @type array|null  $via        Referencing relationship context, if the action is
	 *                                   reached through another resource.
	 * }
	 * @return AuthorizationDecision
	 */
	public static function decide( array $request ) {
		$allowlisted = array( 'actor', 'capability', 'module', 'object_id', 'fields', 'via' );
		foreach ( array_keys( $request ) as $key ) {
			if ( ! in_array( $key, $allowlisted, true ) ) {
				return AuthorizationDecision::deny( self::REASON_REQUEST_UNSAFE );
			}
		}

		$capability = isset( $request['capability'] ) ? (string) $request['capability'] : '';
		if ( '' === $capability || ! CapabilityMap::is_songhealth_capability( $capability ) ) {
			return AuthorizationDecision::deny( self::REASON_CAPABILITY_UNKNOWN );
		}

		$module = isset( $request['module'] ) ? (string) $request['module'] : '';
		if ( '' === $module ) {
			$owned = CapabilityMap::capability_modules( $capability );
			$module = $owned[0] ?? '';
		}
		if ( ! CapabilityMap::is_songhealth_module( $module ) ) {
			return AuthorizationDecision::deny( self::REASON_MODULE_UNKNOWN );
		}
		if ( ! in_array( $module, CapabilityMap::capability_modules( $capability ), true ) ) {
			return AuthorizationDecision::deny( self::REASON_MODULE_MISMATCH );
		}

		$actor = self::resolve_actor( $request['actor'] ?? null );
		if ( null === $actor ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_ANONYMOUS );
		}
		if ( self::is_actor_disabled( $actor ) ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_DISABLED );
		}

		$role = CapabilityMap::resolve_role( $actor );
		if ( null === $role ) {
			return AuthorizationDecision::deny( self::REASON_ROLE_ABSENT );
		}

		if ( ! in_array( $module, CapabilityMap::module_scope( $actor ), true ) ) {
			return AuthorizationDecision::deny( self::REASON_MODULE_OUT_OF_SCOPE );
		}

		if ( ! CapabilityMap::user_can( $actor, $capability ) ) {
			return AuthorizationDecision::deny( self::REASON_CAPABILITY_DENIED );
		}

		$object = null;
		if ( isset( $request['object_id'] ) && null !== $request['object_id'] ) {
			$object_id = (int) $request['object_id'];
			$post      = $object_id > 0 ? get_post( $object_id ) : null;
			if ( ! $post ) {
				return AuthorizationDecision::deny( self::REASON_OBJECT_ABSENT );
			}
			if ( ! \SonghealthCore\Content\FoundationTypes::is_supported_type( $post->post_type ) ) {
				return AuthorizationDecision::deny( self::REASON_OBJECT_UNSUPPORTED );
			}
			if ( \SonghealthCore\Content\FoundationTypes::resource_type_for( $post->post_type ) !== $module ) {
				return AuthorizationDecision::deny( self::REASON_OBJECT_UNSUPPORTED );
			}

			$lifecycle = self::current_lifecycle( $post );
			if ( ! self::lifecycle_allows( $capability, $lifecycle ) ) {
				return AuthorizationDecision::deny( self::REASON_LIFECYCLE_NOT_ALLOWED );
			}
			$object = $post;
		}

		if ( isset( $request['fields'] ) ) {
			$fields = $request['fields'];
			if ( ! is_array( $fields ) ) {
				return AuthorizationDecision::deny( self::REASON_REQUEST_UNSAFE );
			}
			foreach ( $fields as $field ) {
				$field = (string) $field;
				if ( in_array( $field, self::PROTECTED_FIELDS, true ) ) {
					return AuthorizationDecision::deny( self::REASON_FIELD_PROTECTED );
				}
				if ( ! in_array( $field, self::writable_fields( $module ), true ) ) {
					return AuthorizationDecision::deny( self::REASON_FIELD_NOT_ALLOWED );
				}
			}
		}

		if ( isset( $request['via'] ) ) {
			$via = $request['via'];
			if ( ! is_array( $via ) ) {
				return AuthorizationDecision::deny( self::REASON_REQUEST_UNSAFE );
			}
			/*
			 * A relationship can only ever narrow a decision. It is consulted
			 * by nothing above and it grants nothing: authority over the target
			 * was already decided from the actor, module, and object alone.
			 * Any declaration that the relationship itself confers or elevates
			 * authority is denied outright (FR-019, Frozen 06 §42.9).
			 */
			if ( ! empty( $via['confers_authority'] ) ) {
				return AuthorizationDecision::deny( self::REASON_RELATIONSHIP_ELEVATION );
			}
		}

		return AuthorizationDecision::allow();
	}

	/**
	 * Decide a role or permission assignment change.
	 *
	 * Guardrails: the actor must hold `songhealth_permissions_manage`; a user
	 * can never change their own role, whatever capability they hold (Frozen 06
	 * §41.8 — self-escalation is a security invariant, not a preference); and
	 * demoting the last active Administrator is refused so the system always
	 * keeps at least one (Frozen 06 §§34, 41.8).
	 *
	 * @param array $request {
	 *     @type string|null $actor   WP_User to evaluate. Defaults to the current user.
	 *     @type int|null    $target  User whose role would change.
	 *     @type string      $role    Proposed Songhealth role.
	 * }
	 * @return AuthorizationDecision
	 */
	public static function decide_role_change( array $request ) {
		$allowlisted = array( 'actor', 'target', 'role' );
		foreach ( array_keys( $request ) as $key ) {
			if ( ! in_array( $key, $allowlisted, true ) ) {
				return AuthorizationDecision::deny( self::REASON_REQUEST_UNSAFE );
			}
		}

		$actor = self::resolve_actor( $request['actor'] ?? null );
		if ( null === $actor ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_ANONYMOUS );
		}
		if ( self::is_actor_disabled( $actor ) ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_DISABLED );
		}
		if ( null === CapabilityMap::resolve_role( $actor ) ) {
			return AuthorizationDecision::deny( self::REASON_ROLE_ABSENT );
		}
		if ( ! CapabilityMap::user_can( $actor, CapabilityMap::CAP_PERMISSIONS_MANAGE ) ) {
			return AuthorizationDecision::deny( self::REASON_CAPABILITY_DENIED );
		}

		$target = self::resolve_target( $request['target'] ?? null );
		if ( null === $target ) {
			return AuthorizationDecision::deny( self::REASON_TARGET_ABSENT );
		}

		if ( (int) $target->ID === (int) $actor->ID ) {
			return AuthorizationDecision::deny( self::REASON_SELF_ESCALATION );
		}

		$role = isset( $request['role'] ) ? (string) $request['role'] : '';
		if ( '' === $role || ! in_array( $role, CapabilityMap::roles(), true ) ) {
			return AuthorizationDecision::deny( self::REASON_ROLE_UNKNOWN );
		}

		$is_demotion = CapabilityMap::ROLE_ADMINISTRATOR === CapabilityMap::resolve_role( $target )
			&& CapabilityMap::ROLE_ADMINISTRATOR !== $role;
		if ( $is_demotion && self::is_last_active_administrator( $target ) ) {
			return AuthorizationDecision::deny( self::REASON_LAST_ADMINISTRATOR );
		}

		return AuthorizationDecision::allow();
	}

	/**
	 * Decide an account status change (active/disabled).
	 *
	 * Guardrails: the actor must hold `songhealth_users_manage`; a user can
	 * never change their own account status (Frozen 06 §41.8); and disabling
	 * the last active Administrator is refused (Frozen 06 §§34, 41.8).
	 *
	 * Disabling an account removes effective access on the next request
	 * (Frozen 06 §41.5); it preserves role, scope, content, authorship, and
	 * audit history, and this decision never implies any of those change.
	 *
	 * @param array $request {
	 *     @type string|null $actor  WP_User to evaluate. Defaults to the current user.
	 *     @type int|null    $target User whose status would change.
	 *     @type string      $status Proposed Songhealth account status.
	 * }
	 * @return AuthorizationDecision
	 */
	public static function decide_account_status_change( array $request ) {
		$allowlisted = array( 'actor', 'target', 'status' );
		foreach ( array_keys( $request ) as $key ) {
			if ( ! in_array( $key, $allowlisted, true ) ) {
				return AuthorizationDecision::deny( self::REASON_REQUEST_UNSAFE );
			}
		}

		$actor = self::resolve_actor( $request['actor'] ?? null );
		if ( null === $actor ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_ANONYMOUS );
		}
		if ( self::is_actor_disabled( $actor ) ) {
			return AuthorizationDecision::deny( self::REASON_ACTOR_DISABLED );
		}
		if ( null === CapabilityMap::resolve_role( $actor ) ) {
			return AuthorizationDecision::deny( self::REASON_ROLE_ABSENT );
		}
		if ( ! CapabilityMap::user_can( $actor, CapabilityMap::CAP_USERS_MANAGE ) ) {
			return AuthorizationDecision::deny( self::REASON_CAPABILITY_DENIED );
		}

		$target = self::resolve_target( $request['target'] ?? null );
		if ( null === $target ) {
			return AuthorizationDecision::deny( self::REASON_TARGET_ABSENT );
		}

		if ( (int) $target->ID === (int) $actor->ID ) {
			return AuthorizationDecision::deny( self::REASON_SELF_ESCALATION );
		}

		$status = isset( $request['status'] ) ? (string) $request['status'] : '';
		if ( ! in_array( $status, array( self::ACCOUNT_ACTIVE, self::ACCOUNT_DISABLED ), true ) ) {
			return AuthorizationDecision::deny( self::REASON_STATUS_UNKNOWN );
		}

		if ( self::ACCOUNT_DISABLED === $status
			&& self::is_last_active_administrator( $target ) ) {
			return AuthorizationDecision::deny( self::REASON_LAST_ADMINISTRATOR );
		}

		return AuthorizationDecision::allow();
	}

	/**
	 * The fields a module's records expose for authorized writing. Version 1
	 * has no field-level permission model (Frozen 06 §9); this allowlist is
	 * the field boundary — anything not listed is not writable, and the
	 * immutable identity and audit fields are protected outright.
	 *
	 * @param string $module Songhealth module.
	 * @return string[]
	 */
	public static function writable_fields( $module ) {
		$shared = array( 'title', 'summary', 'body', 'display_slug', 'visibility' );

		if ( CapabilityMap::MODULE_BASIC_PAGE === $module ) {
			return array_merge( $shared, array( 'document_references' ) );
		}
		if ( CapabilityMap::MODULE_DOCUMENT_RESOURCE === $module ) {
			return array_merge( $shared, array( 'document_date', 'binary_attachment_id' ) );
		}
		return array();
	}

	/**
	 * The Songhealth lifecycle states in which each capability may act.
	 *
	 * View applies in every state (Frozen 06 §42.5: drafts are organizational
	 * work, not private documents). Editing applies to non-public work, and
	 * public-impact actions apply only from the states the accepted data model
	 * allows: publication is an authorized transition out of any non-public
	 * state, changes to already-published content require the record to be
	 * published now, and supersede/archive/correct act on published records.
	 *
	 * `create` has no object and therefore no lifecycle rule; it is absent
	 * from the map and skips the object checks entirely.
	 *
	 * @return array<string, string[]>
	 */
	public static function lifecycle_rules() {
		$all_states = array(
			self::LIFECYCLE_DRAFT,
			self::LIFECYCLE_PUBLISHED,
			self::LIFECYCLE_HIDDEN,
			self::LIFECYCLE_WITHDRAWN,
		);
		$non_public = array(
			self::LIFECYCLE_DRAFT,
			self::LIFECYCLE_HIDDEN,
			self::LIFECYCLE_WITHDRAWN,
		);

		return array(
			CapabilityMap::CAP_BASIC_PAGE_VIEW           => $all_states,
			CapabilityMap::CAP_BASIC_PAGE_EDIT_DRAFT     => array( self::LIFECYCLE_DRAFT ),
			CapabilityMap::CAP_BASIC_PAGE_PUBLISH        => $non_public,
			CapabilityMap::CAP_BASIC_PAGE_SAVE_PUBLISHED => array( self::LIFECYCLE_PUBLISHED ),
			CapabilityMap::CAP_BASIC_PAGE_LIFECYCLE      => array( self::LIFECYCLE_PUBLISHED ),

			CapabilityMap::CAP_DOCUMENT_RESOURCE_VIEW              => $all_states,
			CapabilityMap::CAP_DOCUMENT_RESOURCE_EDIT_DRAFT        => array( self::LIFECYCLE_DRAFT ),
			CapabilityMap::CAP_DOCUMENT_RESOURCE_PUBLISH           => $non_public,
			CapabilityMap::CAP_DOCUMENT_RESOURCE_SUPERSEDE         => array( self::LIFECYCLE_PUBLISHED ),
			CapabilityMap::CAP_DOCUMENT_RESOURCE_ARCHIVE           => array( self::LIFECYCLE_PUBLISHED ),
			CapabilityMap::CAP_DOCUMENT_RESOURCE_CORRECT_PUBLISHED => array( self::LIFECYCLE_PUBLISHED ),
		);
	}

	/**
	 * Whether a capability may act in a lifecycle state. Unknown combinations
	 * are denied: the map is the allowlist, not a default.
	 *
	 * @param string $capability Capability name.
	 * @param string $lifecycle  Current lifecycle state.
	 * @return bool
	 */
	public static function lifecycle_allows( $capability, $lifecycle ) {
		$allowed = self::lifecycle_rules()[ $capability ] ?? null;
		if ( null === $allowed ) {
			return false;
		}
		return in_array( $lifecycle, $allowed, true );
	}

	/**
	 * The current Songhealth lifecycle state of a foundation record, read at
	 * decision time from the live post.
	 *
	 * The WordPress status is the internal primitive the Songhealth lifecycle
	 * maps onto (data-model.md); withdrawal is a Songhealth eligibility input
	 * and overrides the mapped state. This vocabulary feeds authorization
	 * only — the public eligibility decision is a separate module (T013).
	 *
	 * @param \WP_Post $post Post to evaluate.
	 * @return string
	 */
	public static function current_lifecycle( $post ) {
		$withdrawn = get_post_meta( (int) $post->ID, \SonghealthCore\Content\FoundationTypes::META_WITHDRAWN, true );
		if ( '1' === (string) $withdrawn || 'true' === strtolower( (string) $withdrawn ) ) {
			return self::LIFECYCLE_WITHDRAWN;
		}

		switch ( $post->post_status ) {
			case 'publish':
			case 'future':
				return self::LIFECYCLE_PUBLISHED;
			case 'draft':
			case 'pending':
			case 'auto-draft':
				return self::LIFECYCLE_DRAFT;
			case 'private':
				return self::LIFECYCLE_HIDDEN;
			case 'trash':
				return self::LIFECYCLE_WITHDRAWN;
		}
		return 'unknown';
	}

	/**
	 * The current Songhealth account status of a user. Absence of the flag
	 * means the account was never disabled, which is the active state; only an
	 * explicit disabled value removes access.
	 *
	 * @param WP_User $user User to evaluate.
	 * @return string
	 */
	public static function account_status( $user ) {
		$stored = get_user_meta( (int) $user->ID, self::META_ACCOUNT_STATUS, true );
		return self::ACCOUNT_DISABLED === (string) $stored ? self::ACCOUNT_DISABLED : self::ACCOUNT_ACTIVE;
	}

	/**
	 * Whether a user is the only active Administrator.
	 *
	 * "Active" combines the WordPress administrator role with a Songhealth
	 * account status that is not disabled, matching the guardrail that at
	 * least one Active Administrator must always remain (Frozen 06 §41.8).
	 *
	 * @param WP_User $target User to evaluate.
	 * @return bool
	 */
	public static function is_last_active_administrator( $target ) {
		if ( CapabilityMap::ROLE_ADMINISTRATOR !== CapabilityMap::resolve_role( $target ) ) {
			return false;
		}

		$administrators = get_users( array( 'role__in' => array( CapabilityMap::ROLE_ADMINISTRATOR ) ) );
		$active         = array();
		foreach ( $administrators as $administrator ) {
			if ( self::ACCOUNT_DISABLED !== self::account_status( $administrator ) ) {
				$active[] = (int) $administrator->ID;
			}
		}

		return array( (int) $target->ID ) === $active;
	}

	/**
	 * Resolve the actor for a decision. Explicit input wins; otherwise the
	 * current WordPress user is read live. Anonymous or missing users resolve
	 * to null.
	 *
	 * @param mixed $actor Requested actor.
	 * @return WP_User|null
	 */
	private static function resolve_actor( $actor ) {
		if ( $actor instanceof WP_User ) {
			return $actor->exists() ? $actor : null;
		}
		if ( is_numeric( $actor ) && (int) $actor > 0 ) {
			$user = get_userdata( (int) $actor );
			return $user ? $user : null;
		}
		$current = wp_get_current_user();
		return $current->exists() ? $current : null;
	}

	/**
	 * Resolve the target user of a user-administration decision.
	 *
	 * @param mixed $target Requested target.
	 * @return WP_User|null
	 */
	private static function resolve_target( $target ) {
		if ( $target instanceof WP_User ) {
			return $target->exists() ? $target : null;
		}
		if ( is_numeric( $target ) && (int) $target > 0 ) {
			$user = get_userdata( (int) $target );
			return $user ? $user : null;
		}
		return null;
	}

	/**
	 * Whether the actor's Songhealth account is disabled.
	 *
	 * @param WP_User $actor Actor to evaluate.
	 * @return bool
	 */
	private static function is_actor_disabled( $actor ) {
		return self::ACCOUNT_DISABLED === self::account_status( $actor );
	}
}

/**
 * A single Songhealth authorization decision.
 *
 * Carries only the boolean outcome and a bounded reason category. It never
 * carries the actor, the target, the capability, or any protected record
 * state, so passing a decision to a less trusted layer cannot disclose them.
 */
final class AuthorizationDecision {

	/**
	 * Constructor. Use AuthorizationDecision::allow() or ::deny().
	 *
	 * @param bool   $allowed Whether the request is allowed.
	 * @param string $reason  Reason category.
	 */
	private function __construct( $allowed, $reason ) {
		$this->allowed = $allowed;
		$this->reason  = $reason;
	}

	/**
	 * An allowing decision.
	 *
	 * @return self
	 */
	public static function allow() {
		return new self( true, AuthorizationService::REASON_ALLOWED );
	}

	/**
	 * A denying decision with its reason category.
	 *
	 * @param string $reason Reason category.
	 * @return self
	 */
	public static function deny( $reason ) {
		return new self( false, $reason );
	}

	/**
	 * Whether the request is allowed.
	 *
	 * @return bool
	 */
	public function allowed() {
		return $this->allowed;
	}

	/**
	 * The bounded reason category.
	 *
	 * @return string
	 */
	public function reason() {
		return $this->reason;
	}

	/**
	 * Whether the decision is an allowing one.
	 *
	 * @var bool
	 */
	private $allowed;

	/**
	 * The reason category.
	 *
	 * @var string
	 */
	private $reason;
}
