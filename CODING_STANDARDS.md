# Coding standards

Judgement calls for review. The mechanical rules are enforced by the checks that CI runs on every
pull request: `npm run build`, `npm run typecheck`, `npm run test:node`, `npm run format:check` and
`npm run lint:shell`.

## Comments

- A comment states the contract and the reason for it. A file header may cite the ticket and
  spec section that define its contract, such as `(#54; spec #51 "Public reads")`. History
  (review rounds, task-by-task changes, what an earlier version did) belongs in git and the pull
  request.
- When code relies on platform behaviour, the comment names the package, its pinned version and
  the source path, for example `emdash 1.1.0 src/api/schemas/settings.ts`.
- Accepted Feature 001 and 002 files carry long historical headers. Trim them when a change
  touches the file.

## Public pages

- Colours, type, radii, shadows and the page container come from the tokens in
  `src/styles/global.css` (ADR 0001; the Figma frame is described in
  `docs/design/homepage-concept-v1.md`). A colour or type style that the tokens lack becomes a
  named token there, with its source.
- Status is stated in text; colour supports it.
- Pages work without client JavaScript. Something that opens without JavaScript, like the
  mobile menu, opens in the flow of the page.
- A list or detail page reuses the shared pieces in `src/components/` and follows the shape of
  `src/pages/news/`. That shape covers reads through EmDash's query functions, `?page=` and GET
  filters, `Astro.rewrite("/404")` for anything not visible, and the SiteLayout head props. A
  piece that two pages need moves into `src/components/` or `src/lib/`.
- CMS images go through EmDash's `Image` with a `sizes` that matches their box. Image size
  evidence from the development runtime shows renditions that production does not serve
  (ADR 0003).

## Tests

- Public-page suites take `test` and `expect` from `tests/browser/public.helpers.ts`, so the
  third-party request guard runs. Each template is checked at both `VIEWPORTS` with
  `expectNoAxeViolations` and `expectVisibleFocusOnEveryStop`, and at 320 px with
  `expectNoHorizontalScroll`.
- Tests assert what people see and use: text, links, status and focus. A `data-testid` marks
  only an element with no accessible role or name, such as a decorative mark.
- A test that changes shared runtime state (site settings, menus, plugin settings) saves it first
  and restores it in `finally`, and says what the native API cannot restore.
- A test leaves nothing it can remove. A slug change leaves a native redirect after its entry is
  deleted, so the test deletes that too.
- A request for a missing page stays in EmDash's 404 log, which only clears as a whole. Such a
  request is deliberate and uses a synthetic path. Where a native API can show the outcome first
  (a redirect list, an entry read), the test asks it before requesting the page.
