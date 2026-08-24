/**
 * T024 — Minimal Public SSR foundation route component.
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Project Structure / §Runtime composition; research.md Decision 3;
 * System Blueprint §§217–219 (SSR-oriented Public rendering);
 * accepted T017 contract `./foundation.test.tsx`; Constitution Principles
 * II, III, V.
 *
 * This route module is deliberately default-only: it exports only the route
 * component and no `loader`/`clientLoader`/`action`/`clientAction` — it
 * performs no fetching and no mutation (FR-002, FR-016; the accepted T017
 * boundary tests reject those exports and spy `fetch` during server
 * rendering). The component server-renders static, semantic
 * foundation/readiness copy for the Public boundary through the Framework
 * Mode SSR pipeline (react-router.config.ts `ssr: true`).
 *
 * It contains no navigation, forms, or interactive controls and no
 * Product/domain, Admin/CMS/editorial, or authentication/session content;
 * it is not a template for future Product UI.
 */

export default function FoundationRoute() {
  return (
    <main>
      <h1>Public Foundation</h1>
      <p>
        The Public presentation boundary of the application foundation is running and reports
        foundation readiness for later feature work.
      </p>
    </main>
  );
}
