/**
 * T024 — Minimal Public SSR document shell (React Router Framework Mode root).
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Project Structure / §Runtime composition; research.md Decision 3;
 * System Blueprint §§217–219 (SSR-oriented Public rendering) and §1919 (Thai
 * remains appropriate for authored content and UI labels);
 * accepted T017 contract `apps/web/app/routes/foundation.test.tsx`;
 * Constitution Principles II, III, VI.
 *
 * This is the smallest correct Framework Mode document shell: the root
 * component renders the HTML document with the framework-owned `<Meta />`,
 * `<Links />`, and `<Scripts />` boundaries plus an `<Outlet />` for route
 * content. It deliberately adds no styling, no navigation, no copy of its
 * own, and no Product/domain, Admin/CMS/editorial, or authentication
 * structure (FR-002, FR-016). Route content is owned by
 * `app/routes/foundation.tsx`.
 */

import { Links, Meta, Outlet, Scripts } from "react-router";

export default function Root() {
  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
