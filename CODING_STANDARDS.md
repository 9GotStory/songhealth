# Coding standards

Judgement calls for review. The mechanical rules are enforced by the checks that CI runs on every
pull request: `npm run build:check`, `npm run typecheck`, `npm run test:node`,
`npm run format:check`, `npm run knip`, `npm run jscpd` and `npm run lint:shell`. `npm run jscpd`
fails on a new clone of 100 tokens or more over 5 lines; `.jscpd.json` lists the clones that stay
and why, and `.jscpd-baseline.json` records them.

## Comments

- A comment states the contract and the reason for it. A file header may cite the ticket and
  spec section that define its contract, such as `(#54; spec #51 "Public reads")`. History
  (review rounds, task-by-task changes, what an earlier version did) belongs in git and the pull
  request.
- When code relies on platform behaviour, the comment names the package, its pinned version and
  the source path, for example `emdash 1.1.0 src/api/schemas/settings.ts`.
  `tests/node/cited-source-paths.test.ts` checks that each cited path exists.
- A Songhealth helper, hook or plugin that does what EmDash might do names its native gap: its
  comment cites the fact in `docs/agents/emdash-1.1.0.md` that shows EmDash lacks it, and a
  missing fact is added there with its source path (CLAUDE.md "Platform-native first";
  `src/lib/navigation.ts` breadcrumbTrail is an example).
- Code that departs from the spec or the current docs on a Product Owner decision cites the
  decision (issue and comment) where it departs, so a later change does not "fix" it back.
- Accepted Feature 001 and 002 files carry long historical headers. Trim them when a change
  touches the file, keeping only the platform claims checked again against the pinned source: an
  old header can be wrong, as #93 found a 401 that EmDash answers with 403 CSRF_REJECTED.

## Public pages

- Colours, type, radii, shadows and the page container come from the tokens in
  `src/styles/global.css` (ADR 0001; the Figma frame is described in
  `docs/design/homepage-concept-v1.md`). A colour or type style that the tokens lack becomes a
  named token there, with its source.
- `docs/design/DESIGN.md` is the Product Owner's draft design system for the public UI (v0.2, not
  yet accepted; its §1 and §10). It sets direction. A difference between it and an accepted page
  or decision is a pending confirmation (Product Owner, 2026-10-31: #64 comment 6535747409).
- A colour keeps the meaning its token's comment states, such as accent-warm's status that needs
  attention. Emphasis inside text takes weight and text-primary, as search marks the words it
  matched (Product Owner, 2026-10-30: #63 comment 6518347225).
- Interface text the shell or a Homepage section shows (headings, link labels such as the footer's)
  comes from `docs/design/homepage-concept-v1.md` where it names one.
- Text and choices that follow an accepted page's precedent (the same kind of lead, label, empty
  state, page size or card) are accepted as built, and the pull request lists them under "Built on
  precedent". A choice with no precedent, a departure from the spec or the current docs, or new
  scope is a pending confirmation for the Product Owner (Product Owner, 2026-10-30: #59 comment
  6515274921).
- Status is stated in text; colour supports it.
- Icons are Lucide's, each imported from its own `@lucide/astro/icons/<name>` module
  (`docs/agents/lucide-astro-1.59.0.md`), and no text stands in for one (Product Owner,
  2026-10-31: #51 comments 6536026977, 6536052180). An onward link on this site ends in
  `chevron-right` and a link that leaves it in `arrow-up-right`. An icon takes a DESIGN.md §5
  slot: 16 px beside label or small text, 20 px leading a button, 24 px on a card. It is
  decorative and takes its text's colour; the text names the link or button.
  `tests/node/public-icons.test.ts` fails on a text arrow, a lone "+" or a hand-drawn `<svg>`.
- Pages work without client JavaScript. Something that opens without JavaScript, like the
  mobile menu, opens in the flow of the page.
- A list or detail page reuses the shared pieces in `src/components/` and follows the shape of
  `src/pages/news/`. That shape covers reads through EmDash's query functions, `?page=` and GET
  filters, `Astro.rewrite("/404")` for anything not visible, and the SiteLayout head props. A
  piece that two pages need moves into `src/components/` or `src/lib/`. So does a page's title
  that another page shows as a crumb or link: one constant in its section's module, as
  `HEALTH_CONTENT_TITLE` is.
- CMS images go through EmDash's `Image` with a `sizes` that matches their box. Image size
  evidence from the development runtime shows renditions that production does not serve
  (ADR 0003).
- A CMS image or file is shown only while `src/lib/media.ts` (`availableMedia`,
  `downloadableFile`) says its media can be served, because Admin can delete a media item that
  content still uses. A rich-text body goes through `availableBody` before EmDash's
  `PortableText` renders it, which leaves out its images whose media is gone; `RichText.astro`
  does this. `tests/node/public-media.test.ts` checks both for EmDash's `Image` and
  `PortableText`.

## Tests

- Public-page suites take `test` and `expect` from `tests/browser/public.helpers.ts`, so the
  third-party request guard runs. Each template's pages are checked at both `VIEWPORTS` with
  `expectNoAxeViolations` and `expectVisibleFocusOnEveryStop`, and at 320 px with
  `expectNoHorizontalScroll`; `testAccessibilityAndReflow` declares those tests.
- A helper that a second suite needs moves to a shared module: page checks (the 404 page, Thai
  dates, list titles, an image's load) to `tests/browser/public.helpers.ts`, native API fixtures
  (entries, media, terms) and refusal checks (`expectValidationRefusal`) to
  `tests/browser/cms.helpers.ts`.
- Tests assert what people see and use: text, links, status and focus. A link or button is
  checked by its accessible name (`getByRole(…, { name })`, `toHaveAccessibleName`), which leaves
  out decorative `aria-hidden` icons. A `data-testid` marks only an element with no accessible
  role or name, such as a decorative mark.
- A test that changes shared runtime state (site settings, menus, plugin settings) saves it first
  and restores it in `finally`, and says what the native API cannot restore.
- A suite's fixtures stay until the suite ends, so a test that needs its fixtures to lead an
  ordered list (newest first, a page boundary) dates them after every earlier test's fixtures.
- Logic that `tests/node` checks lives in a `src/lib` module with no runtime import, because
  node:test loads it with plain Node: no `emdash`, no extensionless relative import.
  `src/lib/dated-lists.ts` and `src/lib/excerpt.ts` are examples; the module that reads through
  EmDash imports them.
- A state the shared development runtime cannot produce, such as a failed read, is driven in
  node:test: the module that decides it takes the reads as a function, as
  `src/lib/search-matcher.ts` `searchOutcome` does (Product Owner, 2026-10-30: #63 comment
  6518347225).
- A test leaves nothing it can remove. A slug change leaves a native redirect after its entry is
  deleted, so the test deletes that too.
- A request for a missing page stays in EmDash's 404 log, which only clears as a whole. Such a
  request is deliberate and uses a synthetic path. Where a native API can show the outcome first
  (a redirect list, an entry read), the test asks it before requesting the page.
