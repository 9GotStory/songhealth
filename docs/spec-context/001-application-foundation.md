# Delivery Context — 001-application-foundation / Application Foundation & Development Runtime

> Routing map only. Do not copy long requirements here.

## Identity

- **Delivery:** Application Foundation & Development Runtime
- **Key:** `001-application-foundation`
- **Intent (non-authoritative summary):** Establish the smallest runnable application and
  repository foundation, daily Development environment, and Production-like Verification profile
  required for later feature Deliveries. This Delivery establishes boundaries and verification
  capability; it does not implement Product features.

## Authoritative Sources

No stable `REQ-*` or `DEC-*` identifiers exist in the canonical documents for this Delivery.
Exact numbered headings are therefore the stable routing pointers.

| Ref | Source | Heading / IDs | Purpose |
|---|---|---|---|
| SRC-01 | `docs/website-modernization-docs/PROJECT-INDEX.md` | § 2 Current Canonical Documents; § 3 Current Canonical Status; Controlled Amendment v1.1 | Establish the Frozen canonical set and accepted Development/Verification amendment. |
| SRC-02 | `docs/website-modernization-docs/current/00-website-foundation.md` | §§ 1.1–1.2; §§ 3.1–3.2; §§ 3.20–3.21; § 16 | Define hosting/technology direction and the simplicity, maintainability, and sustainability goals. |
| SRC-03 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 1–4; §§ 18–22 | Define the Version 1 Modular Monolith, primary runtime, frontend direction, and infrastructure exclusions. |
| SRC-04 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 51–87 | Define the one-repository workspace, application/package boundaries, incremental logical shape, and repository anti-patterns. |
| SRC-05 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 89–113; §§ 115–146; §§ 217–246 | Define the accepted backend, database/data-access, runtime-validation, and Public Web framework baselines. |
| SRC-06 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 334–340; § 347; §§ 357–358; § 386; §§ 697–705 | Define Development, Production-like Verification, secrets/data safety, and the unchanged Production hosting boundary. |
| SRC-07 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 148–149; § 174 | Define the risk-based application-security and verification floor. |
| SRC-08 | `docs/website-modernization-docs/current/10-system-blueprint.md` | §§ 388–390; § 440 | Define risk-driven testing, preferred tooling, and merge/release quality gates. |
| SRC-09 | `.specify/memory/constitution.md` | Principles I–VI; Authority and Scope; Delivery and Quality Gates | Apply durable security, simplicity, traceability, privacy, verification, and operational rules. |

## Phase Routing

### Specify

- **Must read:** SRC-02 §§ 1.1–1.2, 3.1–3.2, 3.20–3.21, and 16 for WHAT/WHY;
  SRC-03 §§ 1–4 and 18–22 for accepted runtime boundaries; SRC-04 §§ 82–87 for the
  incremental foundation outcome; SRC-06 §§ 334–335 and 697–705 for the Development and
  verification outcome.
- **If needed:** SRC-01 to confirm canonical status; SRC-05 §§ 89, 92, 113, 115, 146, 218,
  and 246 when the specification must name an already-Frozen platform constraint.
- Keep the specification outcome-focused. Do not turn exact dependency versions, ports, image
  tags, commands, or deferred package-manager choices into Product requirements.

### Clarify

- Read the active `spec.md` and only the routed source sections tied to a material ambiguity.
- **Do not reopen:** SRC-03 §§ 2–4 and 19–22; SRC-04 §§ 52–54, 82–87; SRC-05 §§ 89–113,
  115–146, 218, and 246; SRC-06 §§ 697–705.
- Preserve deferred implementation/deployment constants unless they block a testable requirement.

### Plan

- Read the approved `spec.md` and SRC-09.
- Read SRC-04 §§ 51–87 for repository/application/package boundaries.
- Read SRC-05 §§ 89–113, 115–146, 217–223, and 245–246 for framework, validation,
  persistence, and rendering constraints relevant to the foundation.
- Read SRC-06 §§ 334–340, 347, 357–358, 386, and 697–705 for environment manifests,
  secrets, data safety, and hosting boundaries.
- Read SRC-07 and SRC-08 for security and verification design.
- Use Context7 only to verify current/version-specific third-party behavior. It cannot change an
  approved dependency or Frozen architecture decision.

### Checklist

- Read the approved `spec.md` and `plan.md` plus SRC-09.
- Use SRC-07 for security-control traceability and SRC-08 for risk-based quality gates.
- Use SRC-06 §§ 335, 339–340, 357–358, 699–703 for environment isolation, secrets,
  non-Production data safety, and proxy/application verification requirements.

### Tasks / Analyze

- Read the approved feature artifacts.
- Use SRC-04–SRC-08 only where task traceability, dependency ordering, verification coverage,
  or conflict checking requires the routed authority.
- Treat exact production runtime/database versions as unresolved until the required hosting
  evidence exists; do not convert provisional local choices into Frozen decisions.

### Implementation / Review

- Read only the authorized task references, affected foundation/configuration code, tests, and
  the routed sections cited by that task.
- Verify the diff creates only structure that has current code or an approved immediate need;
  empty architecture theatre and speculative services/packages are non-compliant.
- Verify local manifests use non-Production credentials/data and do not imply a Production
  container requirement.

### Converge / Acceptance

- Read the current `spec.md`, `plan.md`, `tasks.md`, implementation, and verification evidence.
- Use SRC-03–SRC-08 only to validate alignment or resolve a concrete conflict.
- Acceptance requires a reproducible daily Development path and the approved verification
  capability without Product-feature expansion or speculative infrastructure.

## Dependencies

| Dependency | Required state |
|---|---|
| Product Owner Delivery selection | SATISFIED — `PROJECT-STATUS.md` selects `001-application-foundation`. |
| Canonical Constitution | SATISFIED — `.specify/memory/constitution.md` v1.0.0. |
| Product/System Source of Truth | SATISFIED — canonical `00–08` and System Blueprint v1.1 are Frozen. |
| Spec Kit runtime and Codex/Claude integrations | MUST be verified on the target machine before Specify; currently not verified. |
| Bangmod runtime and database capabilities | MUST be inspected before locking Production Node.js or MySQL/MariaDB versions or claiming Production parity. |

## Approved Decisions to Preserve

- `SRC-03 § 2` — Version 1 is one Node.js Modular Monolith, not premature microservices.
- `SRC-03 §§ 3–4, 22` — Public, Admin, API, and operational entry points reuse one
  Application/Domain Core; React + Vite remains the frontend direction.
- `SRC-03 § 19` — local/CI Podman is allowed, but self-managed Production containers and
  speculative infrastructure are not Version 1 requirements.
- `SRC-04 §§ 52–54, 82–87` — use one lightweight workspace with `apps/web`, `apps/admin`, and
  `apps/server`; add shared packages and directories only when genuinely needed.
- `SRC-05 §§ 89–113` — backend baseline is TypeScript on supported Node.js LTS, Fastify as an
  HTTP adapter, pragmatic REST with explicit Domain actions, TypeBox/JSON Schema validation, and
  explicit dependency composition.
- `SRC-05 §§ 115–146` — use a real MySQL-compatible database, InnoDB/`utf8mb4`, Kysely, and
  version-controlled migrations; verify the exact Production engine rather than guessing it.
- `SRC-05 §§ 218, 246` — Public Web uses React Router Framework Mode + React + Vite with
  SSR-oriented hybrid rendering; Admin remains a separate CSR-oriented React + Vite application.
- `SRC-06 §§ 335, 697–705` — daily Development runs Node.js/React/Vite natively with a
  Podman-managed MySQL-compatible database and named volume; the Production-like profile may add
  Nginx and a production-built application container without changing the Bangmod Production
  boundary.
- `SRC-08 §§ 388–390, 440` — verification is risk/invariant-driven, using Vitest, Fastify
  `inject()`, and Playwright where applicable rather than arbitrary coverage targets.

## Explicit Out of Scope

- Product feature behavior or UI for content, CMS workflows, identity/access, publishing, Search,
  media processing, homepage, citizen/health services, ITA, Audit, or Dashboard domains.
- Domain schemas, production content tables, feature APIs, seed data, or migrations beyond the
  minimum foundation required to prove the approved runtime/database path.
- WordPress content migration and deferred `09-migration-plan.md` work.
- Production deployment, go-live, Production data movement, backup-policy finalization, or a claim
  that local Nginx/containers reproduce Bangmod/Plesk exactly.
- Freezing exact Production Node.js, MySQL/MariaDB, collation, image tags, ports, or resource limits
  before the required environment evidence exists.
- Microservices, Redis, queues/brokers, dedicated Search infrastructure, object storage/CDN,
  Kubernetes, self-managed Production container orchestration, Nx/Turborepo, remote caches,
  internal package publishing, or empty speculative packages/directories.
- Changes to Frozen Product/System behavior or to authoritative documents `00–08` and `10`.

## Cross-Cutting Routing

- **Security:** SRC-09 Principle I; SRC-07; SRC-06 §§ 339, 357–358, 700, and 702–703.
- **Privacy:** SRC-09 Principle IV; SRC-06 §§ 340 and 702. Production data MUST NOT be copied
  blindly into Development or Verification.
- **Data integrity:** SRC-05 §§ 115–146; SRC-06 §§ 335 and 698–699. Use a real
  MySQL-compatible engine for database-sensitive verification while keeping Production engine
  details evidence-based.
- **Deployment/hosting:** SRC-02 § 1.1; SRC-03 §§ 18–19; SRC-06 §§ 347, 386, and 697–705.
  Bangmod Expert Hosting remains Production authority; local Nginx/Podman verifies only bounded
  application contracts.

## Maintenance

Update only when authoritative routing, dependencies, or approved decisions change. Keep this file
short enough to read at the start of every phase.
