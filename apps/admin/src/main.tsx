/**
 * T025 — Admin CSR entry: mounts the foundation shell at the `#root` boundary.
 *
 * References: FR-001–FR-002, FR-016; User Story 1;
 * plan.md §Project Structure / §Runtime composition; research.md Decision 3;
 * accepted T018 contract `./app.test.tsx`; Constitution Principles II, III, V.
 *
 * This is the separate React/Vite CSR entry loaded by `apps/admin/index.html`
 * (T003). It only locates the existing `#root` element and renders the
 * default-only shell component from `./app.js`. It adds no routing, data
 * access, fetching, or other behavior (FR-002, FR-016).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminShell from "./app.js";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Admin shell entry requires the #root element from index.html.");
}

createRoot(container).render(
  <StrictMode>
    <AdminShell />
  </StrictMode>,
);
