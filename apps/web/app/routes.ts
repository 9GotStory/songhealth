/**
 * T024/T028 — Public route registration (React Router Framework Mode).
 *
 * References: FR-001–FR-002, FR-011, FR-016, FR-030; User Story 1;
 * plan.md §Project Structure / §Runtime composition;
 * accepted T017 contract `apps/web/app/routes/foundation.test.tsx`;
 * Constitution Principles II, III.
 *
 * Registers exactly two Public surfaces: the minimal foundation/readiness
 * route (T024) and the `/pages/{publicId}/{slug?}` Basic Page resolution
 * route (T028). The optional-slug behavior is expressed as the two exact
 * path shapes mapped to the same route module, so no other `/pages` path —
 * and no public `/pages` hub or listing route — exists (FR-030 scope
 * guardrail). No Product, Admin, or API routes exist in this Delivery
 * (FR-002, FR-016).
 */

import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/foundation.tsx"),
  route("pages/:publicId", "routes/pages.$publicId.$slug.tsx", { id: "routes/pages.publicId" }),
  route("pages/:publicId/:slug", "routes/pages.$publicId.$slug.tsx"),
] satisfies RouteConfig;
