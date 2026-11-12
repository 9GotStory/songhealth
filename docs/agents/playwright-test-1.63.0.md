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

## Timers

- **`page.clock` moves a page's timers.** `await page.clock.install()` before `goto`, then
  `page.clock.fastForward(ms)` runs the timers due in that span (the types, `Clock`). Time still
  runs by itself after `install()`, so read a state on both sides of a timer with spans that leave
  seconds of room, as the submit-state test does with 5 and 6 seconds around a 10-second timer.
