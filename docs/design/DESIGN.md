# Songhealth — Design System & Public UI Contract

> **Status:** DRAFT v0.2 — rechecked; for Product Owner review; **not** an accepted/FROZEN rule or implementation authorization  
> **Prepared:** 2026-10-30  
> **Target:** Songhealth public website (Astro SSR + integrated EmDash)  
> **Repository path:** `docs/design/DESIGN.md`  
> **Figma concept:** [Songhealth Homepage Concept v1](https://www.figma.com/design/Lxdfd1dBgNNO28Rx62zGYO)  
> **Design policy:** Tailwind CSS **v4 only**, Astro-first, Lucide vector icons, no emoji as UI iconography.

## 1. Scope, authority, and status

This draft translates the approved Songhealth product direction and the existing Figma concept into a **public-facing presentation contract**. It does not authorize implementation, change CMS architecture, create content types, or change the public sitemap.

Higher-priority sources prevail:

1. Product Owner decisions.
2. `docs/website-modernization-docs/current/00`–`09` (product/behavior) and `current/10-system-blueprint.md` (architecture).
3. `GLOSSARY.md` and accepted decisions in `docs/adr/`.
4. Accepted feature scope/tickets; then implementation and tests.

This design document is subordinate to these sources. **Figma is a visual proposal, not the source of truth for V1 capabilities or routes.** Where a visible Figma item conflicts with current documents, log it as a Figma correction rather than silently expanding product scope.

Current engineering baseline (verified in repository `main` on 2026-10-30): one server-rendered Astro 7.3.5 application, integrated EmDash 1.1.0 CMS/Admin, TypeScript, PostgreSQL 18.6. The public UI must not create a second frontend application or a custom CMS/page-builder subsystem.

## 2. Design direction

**Modern Local Health Civic:** citizen-first, useful, credible, accessible, calm, editorial, and recognizably connected to the local health-service network.

- **Prioritize tasks and content**, not decorative dashboard statistics or giant portal menus.
- **Neutral surfaces first**; use health green/teal as a meaningful accent, not an all-green interface.
- **Clear reading hierarchy:** prominent featured content, useful search, visible service choices, recent news, health knowledge and contact details.
- **Imagery:** genuine permitted local/community/service imagery, with consent/usage rights. Decorative gradients are placeholders, not substitutes for credible editorial images.
- **Content-driven cards:** never invent CMS records to fill a grid; show fewer cards or hide optional sections as required by `04-homepage.md`.

## 3. Mandatory technology and styling rules

1. **Tailwind CSS v4 only** for public UI styling. Declare tokens using Tailwind v4's CSS-first `@theme` model and apply styling using utility classes in Astro components.
2. Integrate through the official `@tailwindcss/vite` plugin when implementation is authorized, with dependencies pinned per project policy. Do not assume Tailwind is already installed: the current `package.json` does not list it.
3. A minimal global stylesheet containing `@import "tailwindcss";` and approved `@theme` declarations is allowed because it is part of Tailwind v4 configuration.
4. **Do not author plain CSS selectors for component styling** (`.card { ... }`, `.button:hover { ... }`), CSS Modules, Astro `<style>` styling blocks, CSS-in-JS, or inline `style` attributes. No Tailwind v3 setup, `tailwind.config.js` baseline, or legacy `@tailwind base/components/utilities` syntax.
5. Use Tailwind v4's `hover:`, `focus-visible:`, `disabled:`, `group-hover:`, responsive variants and reduced-motion variants as needed. Avoid unnecessary client JavaScript for static SSR content.
6. Prefer shared tokens and explicit component variants over arbitrary values and repeated long class lists. One-off Tailwind arbitrary values may be justified for exact measured details, but should not become a hidden second token system.
7. These rules apply to the **Songhealth public presentation layer**. Do not override or restyle EmDash's native Admin internals without a separate accepted requirement.

### 3.1 Example Tailwind v4 theme contract (proposed)

This is a **design example**, not an instruction to create a production file before feature authorization. Its color values are taken from Figma Concept v1 and must be visually reviewed after the pending Figma cleanup.

```css
@import "tailwindcss";

@theme {
  --font-sans: "Noto Sans Thai", sans-serif;
  --color-page: #F6F9F7;
  --color-surface: #FFFFFF;
  --color-surface-soft: #EAF5F0;
  --color-brand: #0B6B57;
  --color-brand-dark: #123C33;
  --color-accent: #F3C95F;
  --color-ink: #16211D;
  --color-ink-muted: #65736D;
  --color-outline: #DCE7E2;
  --color-alert: #C95644;
  --radius-card: 1.25rem;
  --radius-feature: 2rem;
  --shadow-card: 0 10px 30px rgb(13 46 36 / 8%);
  --container-site: 75rem;
}
```

Examples of the intended utilities are `bg-page`, `bg-surface`, `text-brand`, `text-ink`, `border-outline`, `rounded-card`, `rounded-feature`, `shadow-card`, and `max-w-site`. Verify compiled class generation against the pinned Tailwind v4 version when implementation starts. Font loading and license/asset strategy must be confirmed separately; specifying `--font-sans` alone does not fetch the typeface.

### 3.2 Color/contrast validation (recheck finding)

**The sample theme values are visual proposals, not proof of WCAG AA compliance.** A basic contrast recheck of the Figma-derived pairs found:

| Foreground / background | Approx. contrast | Intended interpretation |
| --- | ---: | --- |
| `brand #0B6B57` on white | 6.45:1 | Meets 4.5:1 for normal text |
| `ink-muted #65736D` on white | 4.97:1 | Meets 4.5:1, with limited margin |
| `ink-muted #65736D` on `surface-soft #EAF5F0` | 4.45:1 | **Below 4.5:1**; adjust when used as normal text |
| `alert #C95644` on white | 4.29:1 | **Below 4.5:1**; do not use for normal-size alert text without correction |
| `accent #F3C95F` on white | 1.58:1 | Decorative/background accent only; not readable text |

Do **not** silently replace Figma colors across the entire design to address one failed pairing. Define a validated foreground/background role or revise the affected pairing in the Figma QA pass, then update tokens as a coordinated change. Re-test normal text, large text, icons and control boundaries on every surface actually used.


## 4. Typography and copy

- **Primary Figma typeface:** Noto Sans Thai; use compatible fallbacks and make Thai rendering/line breaks part of review.
- **Editorial type scale (desktop concept):** display 60/72, H1 46/58, H2 34/46, H3 24/34, body-large 18/30, body 16/26, label 14/22, small 13/20 (`font-size/line-height` in px). These are Figma reference values, **not an immutable type scale**; adapt mobile responsively without losing semantics.
- Keep headings readable, avoid long unbroken lines, and preserve logical `h1` → `h2` → `h3` order independent of visual size.
- Use concise, natural Thai for citizen-facing tasks. Do not hard-code misleading current dates, opening hours, news, phone numbers, or service status in the final UI.
- Use metadata (date/category) at lower visual emphasis than the title; never rely only on color to communicate category/status.

## 5. Iconography — mandatory no-emoji rule

**No emoji, text glyphs or Unicode arrows used as UI icon substitutes.** In particular replace the Figma concept's `+`, `↗`, and `→` used as icons, and any symbol pretending to be an official logo. Use one consistent outlined vector icon family: **Lucide** is proposed for the public UI (exact package/integration selected at implementation, with version checked).

- Typical icon slots: 16 px utility/meta; 20 px navigation/inline; 24 px actions/service cards. Align on a shared 24 px grid; consistent stroke treatment (normally 2 px at 24 px).
- Icons in buttons/cards must remain vector/editable in Figma and accessible in code. Decorative icons use `aria-hidden="true"`; icon-only actions need an accessible name.
- Do not create icons by typing emoji, arrows, plus signs, or font-based symbol stand-ins into text layers.
- All icon colors should come from design tokens and achieve sufficient contrast in context.
- For Figma: component instances or imported SVG vectors; keep icons in consistent named slots. For Astro: use the approved Lucide SVG integration; no raster icon substitute.

**Suggested Lucide mapping (to validate visually):**

| UI meaning | Lucide icon name |
| --- | --- |
| ร้องเรียน / เสนอแนะ | `message-square-more` |
| แจ้งปัญหาสุขภาพ | `circle-alert` |
| ค้นหาหน่วยบริการ | `hospital` or `map-pin` |
| บริการสำหรับ อสม. | `users` |
| คู่มือและแบบฟอร์ม | `file-text` |
| ขอข้อมูลจากสำนักงาน | `file-search` |
| Search | `search` |
| Link onward | `arrow-up-right` or `chevron-right` (one convention per context) |
| Location / phone / email / hours | `map-pin` / `phone` / `mail` / `clock` |
| Mobile menu | `menu` |

**Logo is not an icon.** Replace the provisional plus-mark/wordmark with approved, authentic office identity assets once supplied; do not pass a decorative medical plus off as an official government mark.

## 6. Layout, spacing and responsive behavior

- Design mobile-first; same server-provided content, routes and priorities across devices. No mobile-only CMS configuration or duplicated editorial content.
- **Reference frames:** mobile 390 px and desktop 1440 px. Check narrow phones (including 320–360 px), tablet (~768–1024 px) and desktop; these are test widths, not extra custom breakpoints.
- Prefer Tailwind's supported `sm:`, `md:`, `lg:` and `xl:` breakpoints. Only add custom breakpoints with a measured need.
- Desktop content container targets approximately **1200 px**, centered with responsive side padding. The Figma concept's desktop side margins are 120 px at 1440 px. Mobile side padding is approximately 20 px.
- Use the 4/8/12/16/24/32/48/64/80 px spacing rhythm from Concept v1. Consolidate recurring measures into approved Tailwind theme variables/utilities; no scattered one-off spacing rules.
- Maintain generous section separation and consistent card baselines, but do not preserve a fixed page height at the cost of cropped content.
- Collapse service cards to 2 columns on suitable phones only if text and 44 px targets remain usable; otherwise 1 column. Avoid horizontal content carousels for primary content.
- Avoid fixed-height text containers; allow content reflow for Thai and browser zoom (including 200% and text spacing changes).

## 7. Components and interaction contracts

### 7.1 Shared components

Use a small, justified set of Astro components (proposed names; not a required directory layout):

- `SiteHeader`, `SiteFooter`, `SearchField`, `SectionHeading`.
- `Button` or `ActionLink`, `ServiceCard`, `NewsCard`, `AnnouncementItem`, `HealthContentCard`, `ActivityCard`, `QuickLink`, `ContactItem`.
- `Icon` wrapper only when it simplifies consistent SVG sizing and accessibility. Avoid creating a separate component for every visual fragment.

### 7.2 Component rules

- Use native `<a>` for navigation and `<button>` for actions; preserve real focus order and semantic controls.
- **Service card:** meaningful Lucide icon, title, optional short description, consistent onward indicator; 4–6 curated items as homepage guideline, not a forced six-card placeholder grid.
- **News vs Announcement:** news is editorial and prioritizes a headline; announcement emphasizes current relevance. Both link to canonical published content.
- **Health knowledge:** clearly distinguish reading/learning content from action links and from Health Reports.
- **Quick Access:** compact navigation to **already-approved existing V1 destinations**, curated via the native CMS capability. Do not create a second sitemap.
- Make interactive affordances clear using cursor, outline, fill, motion and focus states. Hover is progressive enhancement: the link must be understandable without hover.
- Loading, empty, invalid/expired, failure and disabled states must never render inaccessible dead links.
- Do not force non-existent content into a card layout; hide or gracefully compact optional sections.

## 8. Homepage contract (visual composition constrained by product authority)

Source: `current/04-homepage.md` v2.3 and `current/03-sitemap.md` v2.4, both dated 2026-10-29.

1. Header / navigation / reachable search.
2. Featured / Priority (optional; one primary item if shown, not an autoplay carousel).
3. Frequently Used Services (manually curated, approximately 4–6 useful destinations).
4. Latest News + Current Announcements (canonical links, published/current records, simple ordering).
5. Health Information (health knowledge, not recommendations or reports by default).
6. Health Service Discovery CTA linking into `/health-services` (no homepage near-me, geolocation, open-now engine or full directory app).
7. Activities (small recent set, real activity dates, genuine images or graceful fallback).
8. Quick Access (optional, approved canonical destinations only).
9. Contact Summary (true office/address/phone/hours when available, optional map; essential text remains if map fails).
10. Footer (orientation, privacy/accessibility/contact and maintained official links).

### 8.1 ITA and Dashboard — deferred, not deleted

**Deferred ≠ removed or cancelled.** ITA and Dashboard remain in Songhealth's longer-term product direction and in the Figma design inventory. Deferral affects **implementation/publication timing**, not the decision to retain their design concepts.

| Area | V1 live/public version | Future-state design |
| --- | --- | --- |
| ITA | No new V1 ITA route, main navigation link or Homepage shortcut under the current approved scope | **Retain** ITA screen concepts, components and possible navigation/Quick Access placements for the phase when ITA is authorized |
| Dashboard | No V1 `/dashboard` route, main navigation link or Homepage shortcut under the current approved scope | **Retain** Dashboard screen concepts, components and possible navigation/Quick Access placements for its separately approved future scope |
| Figma Homepage | Maintain an explicitly labeled **V1 implementation** frame consistent with `03-sitemap.md` and `04-homepage.md` | Preserve an explicitly labeled **Future State / Vision** frame or variant displaying ITA/Dashboard if envisioned; do not delete the original concepts |

**Figma preservation rule:** when reconciling the V1 frame, **do not permanently delete ITA/Dashboard layers or component definitions**. Copy/preserve their current appearance in a Future State frame first; V1 visibility is a separate presentation choice. Future-state placement is a proposal, not a newly approved public IA decision.

**Release rule:** do not render future/deferred cards as enabled links in a V1 build or invent placeholder routes. Their later public activation requires Product Owner authorization and corresponding updates to the higher-priority product/IA documents. This does not prevent continuing the visual design for their future release.

The visual search field and hero text must represent actual product journeys, not a second search or static marketing-only content owner.

## 9. Accessibility and motion QA

- Semantic landmarks (`header`, `nav`, `main`, `footer`), heading hierarchy, and logical reading/tab order.
- Every actionable link/button has visible `focus-visible` styling; no keyboard trap. Mobile menu is an accessible disclosure with state/name rather than a static visual badge.
- Target approximately **44×44 CSS px** interactive hit areas on touch surfaces, with sufficient spacing. Check actual mobile layouts, not just Figma bounding boxes.
- Contrast: text and interactive controls should satisfy the website-wide adopted accessibility target; use **WCAG AA contrast ratios** (4.5:1 normal text, 3:1 large text and relevant UI boundaries) as design-review checks unless a stricter site standard is adopted.
- Informative images have descriptive alt text; decorative assets have empty alt. Icon-only buttons have a programmatic name; search input has an accessible label.
- Respect `motion-reduce:` / `prefers-reduced-motion`, avoid autoplay hero and non-essential motion; never use motion to convey information exclusively.
- Verify at 320, 360, 390, 768, 1024 and 1440 px; keyboard only; zoom 200%; long Thai headings; empty/expired content.

## 10. Figma cleanup and acceptance gate — OPEN

These items are **not marked complete**. The Figma MCP Starter quota prevented the requested final editing round. Before v1.0 of this design document:

- [ ] Replace all UI-symbol text/emoji (`+`, `↗`, `→`, any pictographic glyphs) with a consistent Lucide-equivalent editable vector/icon-component treatment. Replace provisional medical-plus branding only after approved logo is available.
- [ ] **Preserve first:** make a clearly named `Future State / Vision` design frame or variant containing the existing ITA and Dashboard concepts/components. Then reconcile only the `V1 Implementation` frame's navigation/Quick Access against the current sitemap; no active V1 ITA/Dashboard links or invented routes. Do not delete the future design inventory.
- [ ] Audit every desktop service card and mobile equivalent for correct icon, title, description, consistent spacing, equal heights and no clipping.
- [ ] Review featured content card for clear one-primary-item hierarchy, honest content source, primary/secondary CTA, and sensible image fallback.
- [ ] Make News, Announcement, Health Content and Quick Access visually distinguishable by role; check dates/categories and published-link states.
- [ ] Ensure Health Service Discovery is a directory entry CTA, not a simulated search with unimplemented direct results.
- [ ] Replace map/location and activity-image placeholders with appropriately labeled mock assets or verified real assets; preserve textual alternatives.
- [ ] Review responsive spacing, 44 px target sizes, mobile menu design, visible focus states and long Thai text at narrow widths.
- [ ] Validate actual foreground/background color pairings; especially avoid `ink-muted` on `surface-soft`, `alert` normal text on white, or yellow `accent` on white without approved contrast-safe alternatives.
- [ ] Clean Figma layer naming, component overrides, icon instances, token bindings and visual overflow; review the final 1440/390 frames plus a narrow-phone check.
- [ ] Obtain Product Owner visual approval and reconcile this draft with accepted architectural/ADR decisions before declaring `DESIGN.md v1.0`.

## 11. Developer/AI agent handoff rules

- Before implementing a public UI ticket, read current `00`–`10`, the relevant accepted issue/spec, `CLAUDE.md`, and the accepted design baseline. Confirm Figma screenshots do not introduce deferred product scope.
- Implement through **Astro SSR + Tailwind CSS v4**. EmDash native CMS owns content/admin behavior. React islands require a demonstrated interactive need, not because a Figma mock looks interactive.
- Reuse canonical CMS data and published routes. No second homepage database, separate editorial content copies, custom page builder, or duplicate mobile data configuration.
- Don't silently add UI dependencies, CSS frameworks, private assets, animation engines, or new architecture. Verify version-specific installation/integration before proposing a dependency change.
- Never claim browser/accessibility QA passed from an inspection of Figma alone. Verify rendered UI and actual navigation with the project test/runtime process at the authorized implementation phase.
- The Product Owner approves design changes that affect content hierarchy, route scope, institutional identity or technical direction. Cosmetic changes within a scoped ticket may follow ordinary review.

## 12. References and change history

- Product/behavior: `docs/website-modernization-docs/current/04-homepage.md` (v2.3, 2026-10-29); `03-sitemap.md` (v2.4, 2026-10-29).
- Architecture: `docs/website-modernization-docs/current/10-system-blueprint.md` (v2.6, 2026-10-29); `README.md`; `CLAUDE.md`.
- Figma: [Songhealth — Homepage Concept v1](https://www.figma.com/design/Lxdfd1dBgNNO28Rx62zGYO) (design under cleanup).
- Tailwind official: [Astro installation](https://tailwindcss.com/docs/installation/framework-guides/astro), [Theme variables](https://tailwindcss.com/docs/theme), [State variants](https://tailwindcss.com/docs/hover-focus-and-other-states).
- **v0.1 draft (2026-10-30):** establish Tailwind-v4-only public styling, Lucide/no-emoji policy, Figma token proposal, V1 scope reconciliation, responsive/QA gates. Recorded as a draft only; not accepted or deployed.
- **v0.1 clarification (Product Owner):** ITA and Dashboard are **deferred from V1, not removed from Songhealth**. Retain future-state Figma designs and planned capabilities; do not publish inactive V1 links without a separate approved scope decision.
- **v0.2 recheck (2026-10-30):** make the V1/Future State separation explicit without deleting ITA/Dashboard concepts; validate the Tailwind v4 token namespaces against upstream documentation; record color-contrast failures in the proposed Figma palette for later visual QA. Still a draft; adding it to the repository does not authorize implementation or confer Product Owner acceptance.