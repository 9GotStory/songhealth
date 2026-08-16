# Foundation Security Evidence Contract

This contract defines the security/privacy quality gate for the application foundation. It scopes
evidence to this Delivery, uses OWASP ASVS 5.0.0 requirement identifiers, and does not claim blanket
ASVS compliance or Production-hosting readiness.

## Evidence artifact

Implementation creates `docs/security/asvs-foundation-evidence.md`. Each row contains:

| Field | Contract |
|---|---|
| Requirement | Exact versioned ASVS identifier and short project-owned description. |
| Applicable level | `L1`, selected `L2`, `N/A`, or `deferred-hosting`. |
| Applicability / rationale | Foundation surface and risk, or a bounded reason the control is outside FR-001–FR-017. |
| Implementation | Concrete code/configuration that addresses the requirement. |
| Verification | Discoverable automated or manual check with non-zero failure semantics where deterministic. |
| Evidence | Repository path or Verification result; no credentials, raw logs, or mutable external-only link. |

Every applicable row requires implementation, verification, and evidence. Every selected L2 row
also requires a foundation-specific risk rationale. An omitted ASVS chapter requires a chapter-level
`N/A` or `deferred-hosting` rationale so absence cannot be mistaken for review.

## Minimum applicability inventory

The matrix includes, at minimum:

| ASVS 5.0.0 requirement | Foundation disposition |
|---|---|
| `v5.0.0-1.2.4` | L1: parameterized database statements for migration bookkeeping and marker operations. |
| `v5.0.0-1.2.5` | L1: orchestration uses fixed executables and argument arrays; no configuration-derived shell evaluation. |
| `v5.0.0-2.1.1` | L1: document all external configuration validation and rejection classes. |
| `v5.0.0-2.2.1` | L1: allowlist, type, format, and range validation before startup work. |
| `v5.0.0-2.2.2` | L1: server-side enforcement of the same validation for every process/command. |
| `v5.0.0-4.1.1` | L1: explicit HTTP content types. |
| `v5.0.0-13.4.1` | L1: release image excludes repository metadata and development-only content. |
| `v5.0.0-15.1.1` | L1: documented vulnerability review and remediation/triage. |
| `v5.0.0-15.2.1` | L1: locked dependencies and time-bounded handling of actionable findings. |
| `v5.0.0-15.3.1` | L1: HTTP and diagnostic schemas expose only required allowlisted fields. |
| `v5.0.0-4.1.3` | selected L2: only the trusted single Verification proxy hop may supply forwarded metadata. |
| `v5.0.0-14.1.1`, `v5.0.0-14.1.2` | selected L2: protected-data inventory and handling rules cover configuration, logs, reports, and local state. |
| `v5.0.0-15.3.4` | selected L2: proxy/client metadata is trusted only from the configured proxy boundary. |
| `v5.0.0-16.1.1` | selected L2: every operational output surface is inventoried. |
| `v5.0.0-16.2.5` | selected L2: protected values are prohibited from all inventoried logging/reporting surfaces. |
| `v5.0.0-16.3.4` | selected L2: unexpected errors are converted to safe diagnostics and retain primary-failure semantics. |
| `v5.0.0-16.5.1` | selected L2: external errors use the closed Safe Diagnostic contract. |
| `v5.0.0-16.5.3` | selected L2: configuration, ownership, proxy, migration, and interruption failures fail closed. |

Authentication, session management, Product authorization, Product access control, uploads, and
Product API controls are `N/A` because FR-016 excludes those surfaces. TLS/HSTS and other controls
owned by the hosted Production edge are `deferred-hosting` pending the approved Production
inspection; local HTTP Verification is not treated as equivalent evidence.

The authoritative control text is the
[OWASP ASVS 5.0.0 release](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0). The implementation matrix
records identifiers and project evidence rather than copying ASVS prose.

## Gate behavior

- `npm run security:secrets` runs
  `ghcr.io/gitleaks/gitleaks:v8.29.1@sha256:aa036a2f4bdfe3cc3c55fa4326308efabb4a6be498c883c864fd1d0d5585438a`.
  It first scans a generated temporary synthetic canary that must be detected, then scans tracked
  repository content. A failed canary or finding returns non-zero; no committed canary, long-running
  service, floating image, or unpinned download is permitted.
- `npm run security:dependencies` examines the committed npm lock graph. Every actionable finding
  must have explicit relevance, severity, reachability, disposition, owner, and review date; an
  unreviewed actionable finding returns non-zero.
- `npm run security:asvs` validates the matrix schema, required applicability inventory, chapter
  coverage, selected-L2 rationale, and non-empty repository-verifiable evidence. Incomplete
  applicable evidence returns non-zero.
- `npm run security:check` runs all three gates. `npm run check` includes their deterministic parts
  together with typecheck, lint/static/import-boundary checks, independent builds, diagnostic
  nondisclosure, HTTP/readiness, real-database/migration, and profile/proxy/route checks.

Evidence and fallback diagnostics themselves follow the Safe Diagnostic and protected-data rules;
raw scanner, package-manager, container, proxy, database, or child-process output is not copied into
the Verification report.
