/**
 * T018 — Failing Admin CSR shell boundary and no-authentication tests.
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Summary / §Technical Context (Constraints, Scale/Scope) /
 * §Project Structure / §Runtime composition / §Testing and security evidence;
 * Delivery Context approved separate Admin CSR boundary and explicit
 * out-of-scope boundary; System Blueprint §§4–5 (separate presentation
 * boundaries), §218, §246 (Admin remains a separate CSR-oriented React + Vite
 * application); Constitution Principles I–VI (esp. III traceability, V
 * proportionate verification).
 *
 * This is the tests-first contract for the separate minimal Admin CSR
 * foundation shell (`apps/admin/src/app.tsx`, implemented by T025). It imports
 * the planned module and renders its default component with
 * `react-dom/server` strictly as a DETERMINISTIC COMPONENT-MARKUP TEST
 * UTILITY: `renderToString` runs the component on the Node side without a
 * browser so the initial markup can be asserted. It does NOT add SSR runtime
 * behavior and does NOT imply the approved Admin application is anything other
 * than a separate CSR boundary (Blueprint §218, §246).
 *
 * These tests:
 *   - require a renderable default component and a semantic main/heading
 *     shell with recognizable Admin and foundation/readiness-only copy;
 *   - use runtime key/ownership inspection (not statically selected exports)
 *     to reject data/mutation route exports;
 *   - prove rendering performs no network fetch (spied `globalThis.fetch`);
 *   - reject navigation, form, input/control, and interactive-mutation
 *     STRUCTURE (rendered tags and attributes), not only selected words;
 *   - retain bounded rendered-copy checks proving no authentication/session/
 *     access-control, Product/domain, or CMS/editorial workflow content.
 *
 * They deliberately do NOT invent Admin Product copy, CMS workflow UI,
 * authentication flows, application capabilities, or an exact future visual
 * design.
 *
 * Security note: this shell is anonymous by construction in this Delivery.
 * That is NOT a durable or Production security decision: authentication is
 * required by later Version 1 scope but is explicitly excluded from this
 * Delivery (FR-016).
 *
 * EXPECTED RED: the only reason this suite fails is that the T025
 * `./app.js` module does not exist yet. The failure is a module-resolution
 * error for that one intentionally absent module — not a test-syntax,
 * discovery, fixture, dependency, or forced-failure error.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ComponentType } from "react";

// The planned T025 Admin shell module, imported as a NAMESPACE so the test
// can observe the module boundary itself (its named exports) in addition to
// its default component. This is the single, intentional dependency on the
// not-yet-implemented module.
import * as AdminAppModule from "./app.js";

// ---------------------------------------------------------------------------
// Sentinel tokens — bounded rendered-copy assertions.
//
// Each is a distinctive, non-Product marker the T025 shell component is
// expected to render. They prove the presence of a recognizable Admin
// responsibility boundary and static foundation/readiness-only copy without
// pinning an exact future visual design.
// ---------------------------------------------------------------------------

/** Recognizable Admin responsibility boundary (FR-001). */
const ADMIN_BOUNDARY_TOKEN = "Admin";

/** Static foundation / readiness-only copy (FR-002 minimum behavior). */
const FOUNDATION_TOKEN = "Foundation";
const READINESS_TOKEN = "readiness";

// ---------------------------------------------------------------------------
// Forbidden rendered-copy surfaces (FR-002, FR-016).
//
// These are the explicitly out-of-scope authentication/session/access-control,
// Product/domain, and CMS/editorial workflow surfaces. If the shell rendered
// any of this content, it would appear in the markup, so bounded rendered-copy
// checks are the correct layer for these surfaces. "Admin" itself is a
// REQUIRED boundary token here and is therefore not forbidden.
// ---------------------------------------------------------------------------

/** Authentication / session / access-control behavior (FR-016). */
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
  "credential",
  "Credential",
  "token",
  "Token",
  "permission",
  "Permission",
  "role",
  "Role",
];

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
  "article",
  "Article",
];

/** CMS / editorial workflow (FR-016). */
const CMS_EDITORIAL_TOKENS = [
  "CMS",
  "editorial",
  "Editorial",
  "publish",
  "Publish",
  "draft",
  "Draft",
  "workflow",
  "Workflow",
];

// ---------------------------------------------------------------------------
// Structural (not word-based) patterns for navigation and interactive
// mutation. A foundation/readiness shell renders static content only; it must
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
 * Render the shell's default component to a string of markup. `renderToString`
 * is used only as a deterministic component-markup test utility here — the
 * approved Admin application remains a separate CSR boundary, and this test
 * adds no SSR runtime behavior to it.
 */
function renderAdminShellHtml(): string {
  const Component: ComponentType = AdminAppModule.default;
  return renderToString(createElement(Component));
}

describe("Admin CSR foundation shell — T018 (tests-first for T025)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes a renderable default component — no data/mutation route exports", () => {
    // The module boundary: a minimal CSR shell is a component only.
    // Data/mutation route exports (`loader`, `clientLoader`, `action`,
    // `clientAction`) carry behavior that rendered markup cannot represent, so
    // their absence is asserted on the module, not the HTML.
    //
    // Inspect the runtime namespace keys rather than statically selecting the
    // prohibited properties: a compliant default-only module would not
    // typecheck a `.loader`/`.action` access (TS2339), so the forbidden
    // exports are rejected by key membership, not by property reference.
    const exportedKeys = Object.keys(AdminAppModule);
    expect(exportedKeys).toContain("default");
    expect(typeof AdminAppModule.default).toBe("function");
    const forbiddenExports = ["loader", "clientLoader", "action", "clientAction"];
    for (const key of forbiddenExports) {
      expect(exportedKeys, `must not export route behavior: ${key}`).not.toContain(key);
    }
  });

  it("renders a semantic main/heading shell with recognizable Admin and foundation/readiness copy", () => {
    const html = renderAdminShellHtml();
    // Non-empty is necessary but not sufficient: require a semantic content
    // boundary (a <main> region) and a heading so a bare token string cannot
    // satisfy the shell contract.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<main[\s>]/i);
    expect(html).toMatch(/<h[1-6][\s>]/i);
    expect(html).toContain(ADMIN_BOUNDARY_TOKEN);
    expect(html).toContain(FOUNDATION_TOKEN);
    expect(html).toContain(READINESS_TOKEN);
  });

  it("performs no network fetch while rendering", () => {
    // Behavioral proof that rendering does not fetch: any call is a failure.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        throw new Error("admin shell rendering must not fetch");
      });
    renderAdminShellHtml();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders no navigation structure (no anchors or link attributes)", () => {
    const html = renderAdminShellHtml();
    for (const pattern of NAVIGATION_PATTERNS) {
      expect(html, `must not contain navigation structure: ${pattern}`).not.toMatch(pattern);
    }
  });

  it("renders no form, input/control, or interactive mutation structure", () => {
    const html = renderAdminShellHtml();
    for (const pattern of FORM_INTERACTIVE_PATTERNS) {
      expect(html, `must not contain form/interactive structure: ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("contains no authentication, session, or access-control content", () => {
    const html = renderAdminShellHtml();
    for (const token of AUTH_TOKENS) {
      expect(html, `must not contain auth/session/access-control token: ${token}`).not.toContain(
        token,
      );
    }
  });

  it("contains no Product or domain content", () => {
    const html = renderAdminShellHtml();
    for (const token of PRODUCT_TOKENS) {
      expect(html, `must not contain Product/domain token: ${token}`).not.toContain(token);
    }
  });

  it("contains no CMS or editorial workflow content", () => {
    const html = renderAdminShellHtml();
    for (const token of CMS_EDITORIAL_TOKENS) {
      expect(html, `must not contain CMS/editorial token: ${token}`).not.toContain(token);
    }
  });
});
