/**
 * T024/T028/T037 — Public and Preview route registration (React Router
 * Framework Mode).
 *
 * References: FR-001–FR-002, FR-011, FR-016, FR-017, FR-030; User Stories 1
 * and 2; plan.md §Project Structure / §Runtime composition; accepted T017
 * contract `apps/web/app/routes/foundation.test.tsx`; Constitution Principles
 * II, III.
 *
 * Registers exactly three route surfaces: the minimal foundation/readiness
 * route (T024), the `/pages/{publicId}/{slug?}` Basic Page resolution route
 * (T028), and the authenticated read-only `/preview/{resourceType}/{publicId}`
 * route (T037). The optional-slug behavior is expressed as the two exact path
 * shapes mapped to the same route module, so no other `/pages` path — and no
 * public `/pages` hub or listing route — exists (FR-030 scope guardrail).
 *
 * The Preview route is an authenticated staff surface, not a public one: its
 * candidate data comes only from the Preview-only client inside an authorized
 * WordPress session (FR-016, FR-017), and it is labelled, read-only, and
 * `noindex` (T037). No Product or Admin application routes exist in this
 * Delivery (FR-002, FR-015).
 */

import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/foundation.tsx"),
  route("pages/:publicId", "routes/pages.$publicId.$slug.tsx", { id: "routes/pages.publicId" }),
  route("pages/:publicId/:slug", "routes/pages.$publicId.$slug.tsx"),
  route("preview/:resourceType/:publicId", "routes/preview.$resourceType.$publicId.tsx"),
] satisfies RouteConfig;
