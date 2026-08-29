<?php
/**
 * Songhealth foundation server configuration schema (Delivery 002, T006).
 *
 * Defines the allowlisted, environment-separated server configuration for
 * songhealth-core and nothing else. Every recognized setting is declared in
 * one closed schema below; configuration is never discovered generically from
 * the environment, the request, cookies, the database, or the frontend.
 *
 * Source of truth:
 *
 * - specs/002-headless-wordpress-foundation/spec.md FR-021, FR-022;
 * - specs/002-headless-wordpress-foundation/research.md §10;
 * - docs/website-modernization-docs/current/10-system-blueprint.md §§78, 358;
 * - .specify/memory/constitution.md I, IV, VI.
 *
 * Fail-closed contract: a required setting that is missing, malformed, or unsafe
 * makes the whole configuration invalid. Callers must refuse protected work
 * while `is_valid()` is false rather than proceeding on partial configuration
 * (Blueprint §78: missing critical configuration must fail clearly instead of
 * silently falling back to unsafe defaults).
 *
 * Nondisclosure contract: this class never exposes a secret value. Secret
 * settings are read only to be validated and are then discarded; there is no
 * accessor that returns them, and every report this class produces names keys
 * and stable status categories only. A consumer that needs a secret value (for
 * example the Preview grant signer) reads its own environment source in its own
 * reviewed module; it never goes through this class.
 *
 * This module defines the schema and its validation only. Wiring it into the
 * plugin lifecycle (startup validation, diagnostics surfacing) is T019.
 *
 * @package SonghealthCore
 */

declare( strict_types=1 );

namespace SonghealthCore\Diagnostics;

final class Configuration {

	/**
	 * Environment names the foundation distinguishes (FR-021: configuration is
	 * separated by environment). WordPress itself has no environment concept, so
	 * the environment is an explicit declared setting.
	 */
	const ENVIRONMENT_DEVELOPMENT = 'development';
	const ENVIRONMENT_PRODUCTION  = 'production';

	/** Declared setting keys (the closed allowlist). */
	const KEY_ENVIRONMENT          = 'environment';
	const KEY_PUBLIC_ORIGIN        = 'public_origin';
	const KEY_PREVIEW_SIGNING_KEY  = 'preview_signing_key';

	/** Minimum length for a secret setting. */
	const MIN_SECRET_LENGTH = 32;

	/**
	 * Placeholder fragments a real secret never contains. Used to reject
	 * committed-example or obviously non-secret values (FR-021: required secrets
	 * stay outside public source).
	 */
	const PLACEHOLDER_FRAGMENTS = array(
		'change-me',
		'changeme',
		'change_me',
		'placeholder',
		'example',
		'not-a-secret',
		'insert-',
		'todo',
		'dummy',
		'testing',
	);

	/**
	 * The configuration schema: every recognized setting, its environment-
	 * separated sources, and whether it is a secret.
	 *
	 * `required` is true for every declared setting; the foundation has no
	 * optional configuration yet, so absence is always a failure category and
	 * never an implicit default.
	 *
	 * Source order per key: environment variable first, then the wp-config.php
	 * constant. Both are server-side, environment-separated channels that never
	 * exist in public source or in the React bundle. Nothing else is read.
	 *
	 * @return array<string, array{name: string, env: string, constant: string, required: bool, secret: bool}>
	 */
	public static function schema() {
		return array(
			self::KEY_ENVIRONMENT         => array(
				'name'     => 'Songhealth environment name',
				'env'      => 'SONGHEALTH_ENVIRONMENT',
				'constant' => 'SONGHEALTH_ENVIRONMENT',
				'required' => true,
				'secret'   => false,
			),
			self::KEY_PUBLIC_ORIGIN       => array(
				'name'     => 'Canonical public React origin',
				'env'      => 'SONGHEALTH_PUBLIC_ORIGIN',
				'constant' => 'SONGHEALTH_PUBLIC_ORIGIN',
				'required' => true,
				'secret'   => false,
			),
			self::KEY_PREVIEW_SIGNING_KEY => array(
				'name'     => 'Preview grant signing key',
				'env'      => 'SONGHEALTH_PREVIEW_SIGNING_KEY',
				'constant' => 'SONGHEALTH_PREVIEW_SIGNING_KEY',
				'required' => true,
				'secret'   => true,
			),
		);
	}

	/**
	 * The declared setting keys, in schema order.
	 *
	 * @return string[]
	 */
	public static function allowlisted_keys() {
		return array_keys( self::schema() );
	}

	/**
	 * Read the configuration from the environment-separated server sources and
	 * validate it. This is the only production construction path.
	 *
	 * @return self
	 */
	public static function from_environment() {
		$issues = array();
		$values = array();

		foreach ( self::schema() as $key => $spec ) {
			$raw = self::read_source( $spec );

			if ( '' === $raw ) {
				$issues[] = array(
					'key'      => $key,
					'category' => 'missing',
				);
				continue;
			}

			$category = self::validate( $key, $raw );
			if ( null !== $category ) {
				$issues[] = array(
					'key'      => $key,
					'category' => $category,
				);
				continue;
			}

			if ( $spec['secret'] ) {
				/*
				 * A secret is validated and then deliberately discarded. It is
				 * never retained on the instance, so no later method call,
				 * var_dump, error path, or report can surface it.
				 */
				$values[ $key ] = '';
			} else {
				$values[ $key ] = $raw;
			}
		}

		return new self( $values, $issues );
	}

	/**
	 * Whether every declared setting is present and safe. While this is false,
	 * protected work must be refused rather than run on partial configuration.
	 *
	 * @return bool
	 */
	public function is_valid() {
		return array() === $this->issues;
	}

	/**
	 * Bounded validation evidence: one entry per failing setting, naming the
	 * setting key and a stable failure category only. Never a value, never a
	 * path, never the offending input.
	 *
	 * @return array<int, array{key: string, category: string}>
	 */
	public function validation_issues() {
		return $this->issues;
	}

	/**
	 * The configured environment name. Empty string when the setting did not
	 * validate; callers gate on is_valid() first.
	 *
	 * @return string
	 */
	public function environment() {
		return $this->values[ self::KEY_ENVIRONMENT ] ?? '';
	}

	/**
	 * The canonical public React origin (Blueprint §679: canonical absolute
	 * URLs come from trusted validated configuration, never from request
	 * headers). Empty string when the setting did not validate.
	 *
	 * @return string
	 */
	public function public_origin() {
		return $this->values[ self::KEY_PUBLIC_ORIGIN ] ?? '';
	}

	/**
	 * Whether the secret setting is present and passed validation. This is the
	 * only secret-related fact this class ever reports: presence and validity,
	 * never the value.
	 *
	 * @param string $key Declared setting key.
	 * @return bool
	 */
	public function secret_is_configured( $key ) {
		$spec = self::schema()[ $key ] ?? null;
		if ( null === $spec || ! $spec['secret'] ) {
			return false;
		}
		return null === self::find_issue( $key );
	}

	/**
	 * Safe per-setting status report. Secret settings report only
	 * `set-and-valid`; non-secret settings report their validated value or the
	 * failure category. Suitable for bounded operator diagnostics (FR-022) and
	 * safe to log.
	 *
	 * @return array<string, string>
	 */
	public function safe_status() {
		$status = array();
		foreach ( self::schema() as $key => $spec ) {
			$issue = self::find_issue( $key );
			if ( null !== $issue ) {
				$status[ $key ] = $issue['category'];
			} elseif ( $spec['secret'] ) {
				$status[ $key ] = 'set-and-valid';
			} else {
				$status[ $key ] = $this->values[ $key ];
			}
		}
		return $status;
	}

	/**
	 * One-line bounded configuration summary for operator evidence. Contains
	 * only the overall state and the failing keys with their categories.
	 *
	 * @return string
	 */
	public function redacted_summary() {
		if ( $this->is_valid() ) {
			return 'configuration: valid';
		}
		$parts = array();
		foreach ( $this->issues as $issue ) {
			$parts[] = $issue['key'] . '=' . $issue['category'];
		}
		return 'configuration: invalid [' . implode( ', ', $parts ) . ']';
	}

	/**
	 * Constructor. Private: construct through from_environment().
	 *
	 * @param string[]                                            $values Validated non-secret values.
	 * @param array<int, array{key: string, category: string}> $issues Failure categories.
	 */
	private function __construct( array $values, array $issues ) {
		$this->values = $values;
		$this->issues = $issues;
	}

	/**
	 * Validated non-secret values, keyed by setting key. Secrets are never
	 * present in this array.
	 *
	 * @var string[]
	 */
	private $values;

	/**
	 * Validation failures as bounded key/category pairs.
	 *
	 * @var array<int, array{key: string, category: string}>
	 */
	private $issues;

	/**
	 * Read one setting from its environment-separated sources without ever
	 * interpreting the value as code.
	 *
	 * @param array{name: string, env: string, constant: string, required: bool, secret: bool} $spec Setting spec.
	 * @return string
	 */
	private static function read_source( array $spec ) {
		$from_env = getenv( $spec['env'] );
		if ( false !== $from_env && '' !== $from_env ) {
			return (string) $from_env;
		}
		if ( defined( $spec['constant'] ) ) {
			$constant = constant( $spec['constant'] );
			if ( is_string( $constant ) && '' !== $constant ) {
				return $constant;
			}
		}
		return '';
	}

	/**
	 * Validate one raw setting value, returning a stable failure category or
	 * null when the value is safe.
	 *
	 * Categories are deliberately coarse and value-free so they can be reported
	 * to an operator without disclosing the input (FR-022).
	 *
	 * @param string $key Declared setting key.
	 * @param string $raw Raw value from the environment-separated source.
	 * @return string|null
	 */
	private static function validate( $key, $raw ) {
		switch ( $key ) {
			case self::KEY_ENVIRONMENT:
				return self::validate_environment( $raw );
			case self::KEY_PUBLIC_ORIGIN:
				return self::validate_public_origin( $raw );
			case self::KEY_PREVIEW_SIGNING_KEY:
				return self::validate_secret( $raw );
		}
		return 'unknown_setting';
	}

	/**
	 * The environment name must be exactly one of the declared names. Any other
	 * value — including a guessed or misspelled name — is rejected rather than
	 * coerced, because behavior keyed on the environment must never be inferred
	 * from an unrecognized input.
	 *
	 * @param string $raw Raw value.
	 * @return string|null
	 */
	private static function validate_environment( $raw ) {
		$allowlisted = array( self::ENVIRONMENT_DEVELOPMENT, self::ENVIRONMENT_PRODUCTION );
		if ( ! in_array( $raw, $allowlisted, true ) ) {
			return 'environment_not_allowlisted';
		}
		return null;
	}

	/**
	 * The canonical public origin must be a bare scheme://host[:port] value:
	 * scheme and host present, no userinfo, path, query, or fragment, and a
	 * plain http/https scheme. In production the origin must be https, because
	 * the Frozen deployment baseline is HTTPS-only (Blueprint §167).
	 *
	 * @param string $raw Raw value.
	 * @return string|null
	 */
	private static function validate_public_origin( $raw ) {
		$parts = parse_url( $raw );
		if ( false === $parts || ! is_array( $parts ) ) {
			return 'origin_malformed';
		}

		$scheme = $parts['scheme'] ?? '';
		$host   = $parts['host'] ?? '';

		if ( '' === $scheme || '' === $host ) {
			return 'origin_malformed';
		}
		if ( isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['path'] )
			|| isset( $parts['query'] ) || isset( $parts['fragment'] ) ) {
			return 'origin_not_bare';
		}
		if ( 'http' !== $scheme && 'https' !== $scheme ) {
			return 'origin_scheme_unsafe';
		}
		if ( 1 !== preg_match( '/^[a-z0-9.-]+$/i', $host ) ) {
			return 'origin_host_malformed';
		}

		$environment = self::current_environment_name();
		if ( self::ENVIRONMENT_PRODUCTION === $environment ) {
			if ( 'https' !== $scheme ) {
				return 'origin_scheme_unsafe';
			}
			if ( false === strpos( $host, '.' ) ) {
				return 'origin_host_malformed';
			}
		}

		return null;
	}

	/**
	 * A secret setting must be long enough to be a real generated key, must be
	 * plain printable ASCII without whitespace, and must not look like a
	 * committed placeholder value.
	 *
	 * @param string $raw Raw value.
	 * @return string|null
	 */
	private static function validate_secret( $raw ) {
		if ( strlen( $raw ) < self::MIN_SECRET_LENGTH ) {
			return 'secret_too_short';
		}
		if ( 1 !== preg_match( '/^[\x21-\x7e]+$/', $raw ) ) {
			return 'secret_characters_unsafe';
		}
		$lowered = strtolower( $raw );
		foreach ( self::PLACEHOLDER_FRAGMENTS as $fragment ) {
			if ( false !== strpos( $lowered, $fragment ) ) {
				return 'secret_placeholder_value';
			}
		}
		return null;
	}

	/**
	 * The environment name as currently supplied, used only for cross-setting
	 * safety rules such as the production HTTPS requirement. Returns an empty
	 * string when the environment itself is missing or not allowlisted; in that
	 * case the environment setting already carries its own failure category.
	 *
	 * @return string
	 */
	private static function current_environment_name() {
		$spec = self::schema()[ self::KEY_ENVIRONMENT ];
		$raw  = self::read_source( $spec );
		if ( '' === $raw ) {
			return '';
		}
		if ( null !== self::validate_environment( $raw ) ) {
			return '';
		}
		return $raw;
	}

	/**
	 * Find the recorded issue for one setting key, if any.
	 *
	 * @param string $key Declared setting key.
	 * @return array{key: string, category: string}|null
	 */
	private function find_issue( $key ) {
		foreach ( $this->issues as $issue ) {
			if ( $issue['key'] === $key ) {
				return $issue;
			}
		}
		return null;
	}
}
