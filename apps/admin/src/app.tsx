/**
 * T025 — Minimal Admin CSR foundation shell component.
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Project Structure / §Runtime composition; research.md Decision 3
 * (Admin is served as separate CSR assets, never SSR-adapted); Delivery
 * Context approved separate Admin CSR boundary and explicit out-of-scope
 * boundary; System Blueprint §§4–5 (separate presentation boundaries),
 * §218, §246 (Admin remains a separate CSR-oriented React + Vite
 * application); accepted T018 contract `./app.test.tsx`; Constitution
 * Principles II, III, V.
 *
 * This module is deliberately default-only: it exports only the shell
 * component and no `loader`/`clientLoader`/`action`/`clientAction` — it
 * performs no fetching and no mutation (FR-002, FR-016; the accepted T018
 * boundary tests reject those exports and spy `fetch` while rendering).
 * The component renders static, semantic foundation/readiness copy for the
 * Admin boundary in the browser through `apps/admin/src/main.tsx`, the
 * separate React/Vite CSR entry mounted at the `apps/admin/index.html`
 * `#root` boundary.
 *
 * It contains no navigation, forms, or interactive controls and no
 * Product/domain, CMS/editorial, or authentication/session content; it is
 * not a template for future Admin Product UI. The shell is anonymous by
 * construction in this Delivery; that is NOT a durable or Production
 * security decision: authentication is required by later Version 1 scope
 * but is explicitly excluded from this Delivery (FR-016).
 */

export default function AdminShell() {
  return (
    <main>
      <h1>Admin Foundation</h1>
      <p>
        The Admin presentation boundary of the application foundation is running as a separate
        client-side application and reports foundation readiness for later feature work.
      </p>
    </main>
  );
}
