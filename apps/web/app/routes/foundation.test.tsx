/**
 * T017 — Failing Public foundation route and no-Product-behavior tests
 * (rework for T017-B01).
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Summary / §Technical Context (Constraints, Scale/Scope) /
 * §Project Structure / §Runtime composition / §Testing and security evidence;
 * research.md Decision 3; System Blueprint §§217–219 (SSR-oriented Public
 * rendering); Constitution Principles I–VI (esp. III traceability, V
 * proportionate verification).
 *
 * This is the tests-first contract for the minimal Public foundation route
 * (`apps/web/app/routes/foundation.tsx`, implemented by T024). It imports the
 * planned route module and server-renders its default route component with
 * `react-dom/server` — the same SSR-oriented hybrid rendering the Public
 * boundary is approved to use (Blueprint §217–§219) — so the assertions prove
 * the primary foundation meaning is present in the INITIAL HTML without any
 * client JavaScript.
 *
 * T017-B01: the prohibited route behavior must be proven ABSENT by observing
 * the actual React Router route-module and render boundaries, not by searching
 * rendered HTML for source-code identifiers (which are never rendered content).
 * These tests therefore:
 *   - observe the route-module boundary and reject forbidden data/mutation
 *     route exports (`loader`, `clientLoader`, `action`, `clientAction`);
 *   - prove server rendering performs no fetch (spied `globalThis.fetch`);
 *   - reject navigation / form / interactive-mutation STRUCTURE (rendered
 *     tags and link attributes), not only selected words;
 *   - require a bounded semantic initial-HTML boundary (a `<main>` content
 *     boundary and a heading) so a non-empty token string is insufficient;
 *   - retain bounded rendered-copy checks for the explicitly out-of-scope
 *     Product/domain, Admin/CMS/editorial, and authentication/session surfaces.
 *
 * They deliberately do NOT invent Product copy, navigation, loaders/actions,
 * application capabilities, or an exact future visual design.
 *
 * EXPECTED RED: the only reason this suite fails is that the T024
 * `./foundation.js` route module does not exist yet. The failure is a
 * module-resolution error for that one intentionally absent module — not a
 * test-syntax, discovery, fixture, dependency, or forced-failure error.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ComponentType } from "react";

// The planned T024 route module, imported as a NAMESPACE so the test can
// observe the route-module boundary itself (its named exports) in addition to
// its default route component. This is the single, intentional dependency on
// the not-yet-implemented module.
import * as FoundationRouteModule from "./foundation.js";

// ---------------------------------------------------------------------------
// Sentinel tokens — bounded rendered-copy assertions.
//
// Each is a distinctive, non-Product marker the T024 route component is
// expected to render. They prove the presence of a recognizable Public
// boundary and static foundation/readiness copy without pinning an exact
// future visual design.
// ---------------------------------------------------------------------------

/** Recognizable Public responsibility boundary (FR-001). */
const PUBLIC_BOUNDARY_TOKEN = "Public";

/** Static foundation / readiness copy (FR-002 minimum behavior). */
const FOUNDATION_TOKEN = "Foundation";
const READINESS_TOKEN = "readiness";

// ---------------------------------------------------------------------------
// Forbidden rendered-copy surfaces (FR-002, FR-016).
//
// These are the explicitly out-of-scope Product / domain / Admin-CMS /
// editorial / authentication / session surfaces. If the route rendered any of
// this content, it would appear in the initial HTML, so bounded rendered-copy
// checks are the correct layer for these surfaces.
// ---------------------------------------------------------------------------

/** Product / domain content (FR-002, FR-016). */
const PRODUCT_TOKENS = [
  "Product",
  "dashboard",
  "Dashboard",
  "news",
  "News",
  "announcement",
  "Announcement",
  "health report",
  "Health Report",
  "citizen service",
  "Citizen Service",
  "homepage",
  "Homepage",
];

/** Admin / CMS / editorial workflow (FR-016). */
const ADMIN_CMS_TOKENS = [
  "Admin",
  "CMS",
  "editorial",
  "Editorial",
  "publish",
  "Publish",
  "draft",
  "Draft",
];

/** Authentication / session behavior (FR-016). */
const AUTH_TOKENS = [
  "login",
  "Login",
  "sign in",
  "Sign in",
  "sign up",
  "Sign up",
  "password",
  "Password",
  "session",
  "Session",
  "auth",
  "Auth",
];

// ---------------------------------------------------------------------------
// Structural (not word-based) patterns for navigation and interactive
// mutation. A foundation/readiness route renders static content only; it must
// not render navigation anchors, links, forms, or interactive mutation
// controls. Matching the rendered tags/attributes proves the structure is
// absent regardless of the surrounding copy.
// ---------------------------------------------------------------------------

const NAVIGATION_PATTERNS: readonly RegExp[] = [/<a[\s>]/i, /href\s*=/i];
const FORM_INTERACTIVE_PATTERNS: readonly RegExp[] = [
  /<form[\s>]/i,
  /<button[\s>]/i,
  /<input[\s>]/i,
  /<select[\s>]/i,
  /<textarea[\s>]/i,
];

/**
 * Render the route's default component to a string of initial HTML. This is
 * the SSR-oriented rendering path the Public boundary is approved to use; it
 * exercises the component on the Node side without a browser or client
 * JavaScript.
 */
function renderFoundationRouteHtml(): string {
  const Component: ComponentType = FoundationRouteModule.default;
  return renderToString(createElement(Component));
}

describe("Public foundation route — T017 (tests-first for T024)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes only a default route component — no data/mutation route exports", () => {
    // The route-module boundary: a minimal foundation route is a component
    // only. React Router loaders/client loaders and actions/client actions are
    // route-module exports whose behavior is NOT represented by rendered text,
    // so their absence is asserted on the module, not the HTML.
    //
    // Inspect the runtime namespace keys rather than statically selecting the
    // prohibited properties: a compliant default-only module would not
    // typecheck a `.loader`/`.action` access (TS2339), so the forbidden
    // exports are rejected by key membership, not by property reference.
    const exportedKeys = Object.keys(FoundationRouteModule);
    expect(exportedKeys).toContain("default");
    expect(typeof FoundationRouteModule.default).toBe("function");
    const forbiddenExports = ["loader", "clientLoader", "action", "clientAction"];
    for (const key of forbiddenExports) {
      expect(exportedKeys, `must not export route behavior: ${key}`).not.toContain(key);
    }
  });

  it("server-renders meaningful foundation content with a semantic content boundary", () => {
    const html = renderFoundationRouteHtml();
    // Non-empty is necessary but not sufficient: require a semantic content
    // boundary (a <main> region) and a heading so a bare token string cannot
    // satisfy the meaningful-SSR contract (Blueprint §217–§219).
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<main[\s>]/i);
    expect(html).toMatch(/<h[1-6][\s>]/i);
  });

  it("carries a recognizable Public boundary and static foundation/readiness copy", () => {
    const html = renderFoundationRouteHtml();
    expect(html).toContain(PUBLIC_BOUNDARY_TOKEN);
    expect(html).toContain(FOUNDATION_TOKEN);
    expect(html).toContain(READINESS_TOKEN);
  });

  it("performs no data fetching while server rendering", () => {
    // Behavioral proof that SSR does not fetch: any call is a failure.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        throw new Error("server rendering must not fetch");
      });
    renderFoundationRouteHtml();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders no navigation structure (no anchors or link attributes)", () => {
    const html = renderFoundationRouteHtml();
    for (const pattern of NAVIGATION_PATTERNS) {
      expect(html, `must not contain navigation structure: ${pattern}`).not.toMatch(pattern);
    }
  });

  it("renders no form or interactive mutation structure", () => {
    const html = renderFoundationRouteHtml();
    for (const pattern of FORM_INTERACTIVE_PATTERNS) {
      expect(html, `must not contain form/interactive structure: ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("contains no Product or domain content", () => {
    const html = renderFoundationRouteHtml();
    for (const token of PRODUCT_TOKENS) {
      expect(html, `must not contain Product/domain token: ${token}`).not.toContain(token);
    }
  });

  it("contains no Admin, CMS, or editorial workflow", () => {
    const html = renderFoundationRouteHtml();
    for (const token of ADMIN_CMS_TOKENS) {
      expect(html, `must not contain Admin/CMS token: ${token}`).not.toContain(token);
    }
  });

  it("contains no authentication or session behavior", () => {
    const html = renderFoundationRouteHtml();
    for (const token of AUTH_TOKENS) {
      expect(html, `must not contain auth/session token: ${token}`).not.toContain(token);
    }
  });
});
