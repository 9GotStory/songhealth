/**
 * T024 — Public route registration (React Router Framework Mode).
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Project Structure / §Runtime composition;
 * accepted T017 contract `apps/web/app/routes/foundation.test.tsx`;
 * Constitution Principles II, III.
 *
 * Registers exactly one Public route: the minimal foundation/readiness route
 * implemented in `app/routes/foundation.tsx`, served through the existing
 * Framework Mode boundary (react-router.config.ts `ssr: true` + the Vite
 * plugin). No Product, Admin, or API routes exist in this Delivery
 * (FR-002, FR-016).
 */

import { type RouteConfig, route } from "@react-router/dev/routes";

export default [route("/", "routes/foundation.tsx")] satisfies RouteConfig;
