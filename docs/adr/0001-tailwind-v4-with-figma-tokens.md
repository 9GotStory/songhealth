---
status: accepted
---

# Visual design: Tailwind CSS v4 with tokens from the Figma Homepage Concept

The public site takes its colour and type tokens from the Product Owner's Figma file "Songhealth —
Homepage Concept v1" (file `Lxdfd1dBgNNO28Rx62zGYO`, frame `5:2`), keeping the Figma variable names.
It expresses them as Tailwind CSS v4 `@theme` variables. The Product Owner chose Tailwind v4 over
plain CSS custom properties on 2026-10-29, which closes the visual-token open decision of `00` §13.
Tailwind generates CSS at build time and ships no client JavaScript, so `04` §18 still holds.

## Consequences

- Every public template is written in Tailwind utility classes, so replacing Tailwind later means
  touching every template.
- Pinned versions, verified 2026-10-29 with npm and Context7 (`/withastro/docs`,
  `/tailwindlabs/tailwindcss.com`):
  - `tailwindcss` 4.3.3 and `@tailwindcss/vite` 4.3.3, released 2026-07-16;
  - the plugin's peer range `vite ^5.2 || ^6 || ^7 || ^8` covers the vite 8.3.3 used by Astro 7.3.5.
