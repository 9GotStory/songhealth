# @playwright/test 1.63.0: verified behaviour

Facts the browser suites rely on (#246 retro), read from the installed packages or observed on the
development runtime, as each line says. `@playwright/test` only re-exports `playwright`, whose
code is in the package playwright-core: its bundle is lib/coreBundle.js and its types are
types/types.d.ts there, named here without a code span because they are outside this package.
When the pinned version changes, re-verify every line and rename this file:
`./tests/node/package-facts.test.ts` checks that the name carries the pinned version.

## A page that is leaving

- **A locator waits while a navigation is pending.** An action or an `expect` on a locator logs
  "waiting for … navigation to finish..." and waits for the main frame's pending document (the
  bundle, `pendingDocument()`). A test that holds a navigation's request with `page.route` to look
  at the page it leaves therefore waits on itself until its timeout (#246: the submit state).
- **Keep the page with a 204 answer.** `route.fulfill({ status: 204 })` ends the navigation with no
  new document, so the page stays and its locators answer
  (`./tests/browser/public-homepage.spec.ts` "after submit, the button of …"). Observed on the
  runtime.
- **`click()` returns after the navigation it starts**, so the next line already reads the new
  page. Observed on the runtime.
- **Going back loads the page again.** After `goto`, `goto`, `goBack` the first page's script
  state is gone and no `pageshow` with `persisted` arrives: this Chromium does not restore a page
  from the back/forward cache. A test of what a page does when it is shown again from history
  sends the event itself, `new PageTransitionEvent("pageshow", { persisted: true })`. Observed on
  the runtime (#246 retro).

## Routes

- **A glob's `?` does not match a query string's `?`.** `page.route("**/search?q=*", …)` held no
  request for `/search?q=x`. Match by a predicate, `(url) => url.pathname === "/search"`, which
  `toHaveURL` and `unroute` take as well. Observed on the runtime (#246).

- **A page the test fulfilled cannot open the runtime's socket.** After
  `route.fulfill({ response, body })` on the document itself, Chromium 153 refuses the page's
  WebSocket to the same loopback origin (`net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`), Vite's
  client then tries `ws://localhost:4324`, and the third-party request guard fails the test. A
  fulfilled stylesheet or script does not do this: rewrite those and leave the document. The
  development runtime also serves each stylesheet as a module (`**/*.css`, resource type
  `script`) that replaces the copy in the page. Observed on the runtime (#249).

## Media and motion

- **Every page prefers reduced motion** through `contextOptions: { reducedMotion: "reduce" }` in
  `./playwright.config.ts`; `page.emulateMedia({ reducedMotion: "no-preference" })` allows motion
  for a page, and applies at once to a page already open. `emulateMedia` changes only the
  features it names (#249).
- **Chromium 153 has no switch that turns scroll-driven animation off.** With
  `--disable-blink-features=ScrollTimeline`, `ViewTimeline` or `--disable-features=ScrollTimeline`
  `CSS.supports("animation-timeline: view()")` stays true, and no other browser is installed. The
  Homepage's motion test serves the stylesheet with its support query changed instead. Observed
  with a launched browser (#249).
- **A scroll-driven animation follows a scroll one frame later.** Right after
  `scrollIntoViewIfNeeded()`, a key press that moves focus, or `window.scrollTo`, a part with a
  view timeline still has the style of its place before the scroll: a box read then is 28 px off
  on the Homepage, and an opacity read is stale. Poll until the part shows whole, or wait two
  animation frames in the page, before reading its place. Observed on the runtime (#249: two hover
  tests failed in a full run, and a measuring script read 19 focused links as transparent).
- **A full-page screenshot does not scroll**, so a view timeline holds back what lies below the
  window; `./scripts/capture-screenshots.mjs` opens its pages with reduced motion preferred (#249).
  `page.screenshot({ path })` creates the path's folder before it writes (the bundle, `screenshot`:
  `mkdirIfNeeded`), so a script takes a folder that does not exist yet (#276).
- **Reading a box does not scroll the page.** `locator.boundingBox()` gives the box in the window
  as the page is scrolled now: "Scrolling affects the returned bounding box, similarly to
  Element.getBoundingClientRect" (the types, `Locator.boundingBox`). A part below the window is
  read where it waits, and a waiting part's box includes the 28 px its reveal has yet to rise
  (#276: `./scripts/check-built-reveal.ts` read 4974 px against 4946 px with reduced motion).
- **A wait for the page's own effects takes a limit.** An effect's `finished` promise rejects with
  an `AbortError` when the effect is cancelled, and never settles for an endless one, so wait with
  `Promise.allSettled` raced against a timer, as `./scripts/check-built-reveal.ts` does before a
  screenshot. Observed with a launched browser (#276).

## The pointer

- **`locator.hover()` waits until the element itself receives the pointer.** It runs the
  actionability checks first (the types, `Locator.hover`: "Wait for actionability checks on the
  element, unless `force` option is set"), and over a part that another element covers it retries
  with "<element> intercepts pointer events" (the bundle) until the test's timeout. A whole-card
  link covers its card's picture, so a test points at the picture with the mouse at its box's
  centre, as `pointAtCardSurface` and `clickCardSurface` in
  `./tests/browser/public-cards.spec.ts` do. Observed on the runtime (#283: 15 cases timed out at
  30 s each).
- **A link keeps its focus styles under the pointer.** After a keyboard check focuses a link, a
  hover still shows `:focus-visible` styles, such as `focus-ring-banded`'s band. Blur the link
  before reading what the pointer alone does. Observed on the runtime (#283).

## Timers

- **`page.clock` moves a page's timers.** `await page.clock.install()` before `goto`, then
  `page.clock.fastForward(ms)` runs the timers due in that span (the types, `Clock`). Time still
  runs by itself after `install()`, so read a state on both sides of a timer with spans that leave
  seconds of room, as the submit-state test does with 5 and 6 seconds around a 10-second timer.
