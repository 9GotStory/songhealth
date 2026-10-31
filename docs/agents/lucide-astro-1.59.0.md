# @lucide/astro 1.59.0: verified behaviour

Facts the public pages' icons rely on (#105; `docs/design/DESIGN.md` §5), read from the installed
package. Paths are relative to `node_modules/@lucide/astro/`, and a Songhealth file has a leading
`./`. When the pinned version changes, re-verify every line.

- Each icon is its own module, `@lucide/astro/icons/<name>`, whose default export is the icon's
  Astro component (`package.json` `exports`; `src/icons/chevron-right.ts`). The pages import each
  icon from its own module, because the package root re-exports every icon (`src/lucide-astro.ts`).
- An icon renders on the server as an inline `<svg>` and ships no client JavaScript:
  `src/createLucideIcon.ts` renders `src/Icon.astro`, which has no script. A build of #105 has
  Lucide in its server chunks only.
- An icon is hidden from assistive technology: it gets `aria-hidden="true"` unless it is given an
  `aria-*`, `role` or `title` prop (`src/utils/hasA11yProp.ts`, `src/utils/buildLucideIconNode.ts`).
  The site's icons are decorative and pass none; `./tests/browser/public.helpers.ts`
  `expectNoAxeViolations` fails on an icon that assistive technology can reach.
- `size` sets the `width` and `height` (24 by default) and the `viewBox` stays the icon's own 24
  units, so the 2-unit stroke scales with the icon, to 1.33 px at 16 px (`src/Icon.astro`,
  `src/utils/buildLucideIconNode.ts`, `src/utils/defaultAttributes.ts`). The stroke is
  `currentColor`, so a colour token sets it: the icon's own `text-*` class, or else its text's.
- `class` is added after `lucide lucide-<name>` on the `<svg>` (`src/utils/buildLucideIconNode.ts`).
  Tailwind's preflight makes every `svg` a block (`tailwindcss` 4.3.3 `preflight.css`), so an icon
  in running text takes `inline`, as `./src/components/ContentLink.astro` does.
- In a flex row, Chromium squeezes an icon beside text that wraps, despite its `width`: a 16 px
  icon beside a long label measured 5 px wide (#105). So every icon takes `shrink-0`.
