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
  `tests/node/cited-source-paths.test.ts` checks that each cited path exists, and that a path
  found only in EmDash comes with its pinned version in the comment or in the file's header.
  Review reads the cited source for each platform claim a changed comment makes: a claim the
  source does not show, or one without a source, is a finding (#124 retro: a routing claim cited a
  function that only serves error pages, and a comment said PostgreSQL refuses a five-digit year).
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
  `src/styles/global.css`. A colour or type style that the tokens lack becomes a named token
  there, with its source, and `docs/design/DESIGN.md` §3.1 records it.
- The design's source is the code with `docs/design/DESIGN.md` v1.0 (ADR 0007, Feature 006): a
  design change updates both in the same pull request. A page that departs from `DESIGN.md`, or a
  difference between it and a decision, is a pending confirmation (Product Owner, 2026-10-31: #64
  comment 6535747409). The Figma frame is history, described in
  `docs/design/homepage-concept-v1.md`.
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
- Icons are Lucide's (Product Owner, 2026-10-31: #51 comments 6536026977, 6536052180). An onward
  link on this site ends in `chevron-right` and a link that leaves it in `arrow-up-right`. An icon
  is decorative: Lucide hides it from assistive technology, and the text names the link or button
  (`docs/agents/lucide-astro-1.59.0.md`). Its size follows its role (Product Owner, 2026-10-31:
  #105 comment 6536890963): 16 px for a direction icon beside label or small text, 20 px for an
  icon that shows the action itself at the start of its button, such as the menu's or the
  download's, and 24 px on a card. Its colour is a token, through `currentColor`.
  `tests/node/public-icons.test.ts` checks the mechanics: no typed mark or hand-drawn `<svg>`, and
  each icon from its own module, sized 16, 20 or 24 px, with `shrink-0`.
- A title renders through `src/components/ThaiTitle.astro`, which keeps the Thai compound words of
  `src/lib/thai-title.ts` on one line (spec #144): every page's H1, every section heading, every
  card and row title, the Featured title, and the site title in the header, the footer and the
  Contact Summary. Body text, summaries and labels render as they are.
  `tests/node/public-titles.test.ts` checks the headings, and review checks the titles that are no
  heading, such as a Quick Link card's label.
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
  `expectNoHorizontalScroll`; `testAccessibilityAndReflow` declares those tests. A spec or ticket
  that names more widths, such as axe at 375 px, adds checks at them (#147 retro).
- A helper that a second suite needs moves to a shared module: page checks (the 404 page, Thai
  dates, list titles, an image's load) to `tests/browser/public.helpers.ts`, native API fixtures
  (entries, media, terms) and refusal checks (`expectValidationRefusal`) to
  `tests/browser/cms.helpers.ts`, and a node test's builders to `tests/node/<area>.helpers.ts`,
  named as the browser suites name theirs (`tests/node/ita.helpers.ts` `fileBlock`).
- Tests assert what people see and use: text, links, status and focus. A link or button is
  checked by its accessible name (`getByRole(…, { name })`, `toHaveAccessibleName`), which leaves
  out decorative `aria-hidden` icons. A `data-testid` marks only an element with no accessible
  role or name, such as a decorative mark.
- A test that changes shared runtime state (site settings, menus, plugin settings) saves it first
  and restores it in `finally`, and says what the native API cannot restore.
- A suite's fixtures stay until the suite ends, so a test that needs its fixtures to lead an
  ordered list (newest first, a page boundary) dates them after every earlier test's fixtures.
- A test of a precedence rule, such as the longest listed word first or the newest entry first,
  gives its input in an order the rule must overturn, so the test fails without the rule (#145
  retro: a list already sorted longest first passed with the sort removed).
- A rule with an edge is tested on both sides of the edge: a count such as "the first eight" or
  "eight or fewer" with eight and nine items, a breakpoint such as "from `lg`" at 1023 and 1024 px,
  and a place where something stops or starts with a fixture that reaches it. The spec's coverage
  line stays beside these (#147 and #148 retros: in both, review found an edge untested).
- Logic that `tests/node` checks lives in a `src/lib` module, or a script's planning module such as
  `scripts/demo-dataset/plan.ts`, with no runtime import, because node:test loads it with plain
  Node: no `emdash`, no extensionless relative import. `src/lib/dated-lists.ts` and
  `src/lib/excerpt.ts` are examples; the module that reads through EmDash imports them. One
  exception: the migration script's reader, `scripts/migration/legacy-site.ts`, and its tests load
  EmDash's exported WXR parsers (Product Owner, #177 comment 6719251511, item 1) and its HTML
  converter package (Product Owner, #178 comment 6720200201, item 3), which plain Node loads. The
  reader also passes on EmDash's content hash for the verify command, which no test calls.
- A state the shared development runtime cannot produce, such as a failed read, is driven in
  node:test: the module that decides it takes the reads as a function, as
  `src/lib/search-matcher.ts` `searchOutcome` does (Product Owner, 2026-10-30: #63 comment
  6518347225).
- A test leaves nothing it can remove. A slug change leaves a native redirect after its entry is
  deleted, so the test deletes that too.
- A request for a missing page stays in EmDash's 404 log, which only clears as a whole. Such a
  request is deliberate and uses a synthetic path where it can. Every test request also carries a
  synthetic referrer (`playwright.config.ts`), so a miss whose path cannot carry the mark, such as
  a fiscal year's `/ita/2404`, still counts as the tests'. Where a native API can show the outcome
  first (a redirect list, an entry read), the test asks it before requesting the page.

## Documents

The current documents (`docs/website-modernization-docs/current/`) and `docs/design/` each give
one current answer (`00`'s Clean Rebaseline Rule). A change to them is reviewed for:

- **Citers.** Every citation of an amended section still holds what it is cited for, wherever it
  sits: another document, a code or test comment, a script. Grep the section's citers, such as
  `` `02` §18 `` and `02-content-model.md`: in #127, `06` §7 still cited `02` §18 for deferred
  guarantees after §18 became the ITA model. `tests/node/document-versions.test.ts` checks the
  cited versions.
- **Owners.** A rule that another section owns is pointed to, or restated with its owner's scope
  and conditions. In #127, `02` §18 widened `03` §11's slug rule, and `05` §7 said search finds a
  file where `08` §8 shows its MOIT.
- **History.** The body states the current answer; history lives in the decision banners, and in
  `docs/design/DESIGN.md`'s change history.
- **Facts.** `docs/design/DESIGN.md` states what the code does at its head: each size, count,
  crop and breakpoint is read from the code, and each measure names its commit and script. A claim
  that something is unchanged is checked against the base commit's code. In #150 a tablet change,
  a crop the Homepage does not show and a spec's figure in place of a measure reached review.
- **Preconditions.** A document that has staff rely on an Admin feature states who can use it and
  when it takes effect: the role it needs (`@emdash-cms/auth/src/rbac.ts`), its setup and warning
  states (`@emdash-cms/admin/dist/index.js`), and whether a later change reaches content that
  already uses it. In #127 the media-usage setup, and in #150 an Author's own-media limit and alt
  text copied at the pick, were missing from the first draft.
- **Amendments.** A feature or a standalone ticket that amends a current document bumps its
  Version, names the feature or the ticket and the date in Last Updated, and adds a decision banner
  after the earlier ones: "Feature N decision (Product Owner, date)", as Feature 003 (`c2ac189`)
  and Feature 004 (#127) did, or "<subject> decision (Product Owner, date; #<ticket> comment
  <id>)", as #169 did. It bumps the version once: a later change in the same feature, before the
  feature reaches `main`, keeps that version and adds its decision to the feature's banner (#128).
