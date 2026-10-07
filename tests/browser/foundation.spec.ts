// T010 — RED browser smoke definition for the Feature 001 public and Admin
// integration surfaces (Songhealth-owned contract, verified at the browser
// boundary).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T010/T011 (graph: T008 -> T010 ->
//   T011) — T010 defines verification before the protected behavior exists
// - specs/001-platform-foundation/spec.md FR-002 (public runtime serves its
//   minimum verification behavior), FR-003 (readiness is separate; no public
//   health/readiness endpoint), FR-015/FR-016/FR-019, US1, and the 2026-10-06
//   clarification that minimum public behavior and operator readiness are
//   separate
// - specs/001-platform-foundation/plan.md ("One Astro + EmDash platform":
//   src/pages/index.astro is only the minimum SSR verification surface;
//   "Runtime verification and readiness": public-runtime verification is a
//   normal request to `/` with the expected SSR marker, the native Admin
//   route is verified separately, and a setup redirect or authenticated Admin
//   response is an expected availability result — routine checks do not
//   automate passkey login)
// - specs/001-platform-foundation/research.md §6 (Admin availability only; no
//   external identity providers), §11 (browser automation for only the two
//   browser surfaces), §12 (Songhealth does not own or reimplement `/_emdash/*`)
// - specs/001-platform-foundation/quickstart.md §1 (localhost:4321 returns the
//   minimum SSR marker; /_emdash/admin/ reaches native setup or sign-in), §2
// - docs/website-modernization-docs/current/10-system-blueprint.md §21
//
// Expected result at the T010 baseline:
// - the public marker test is intentionally RED until T011 implements
//   src/pages/index.astro; the only acceptable current failure is the missing
//   minimum public SSR surface (e.g. 404 from the running application or the
//   absent marker), never an environment/connection error;
// - the Admin availability test is a live boundary check and passes whenever
//   the externally started, configured platform is available.
//
// Boundaries: exactly the two approved integration surfaces. No Homepage
// composition or Product content is asserted, no EmDash internals/copy are
// asserted, no passkey or setup flow is completed, no authentication is
// performed, no public readiness endpoint is probed, and no secret is read,
// printed, or committed.

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// The one Songhealth-owned public SSR marker contract (implemented by T011).
//
// The server-rendered HTML document at `/` contains a meta element named
// "songhealth-foundation" with the exact content value "public-runtime". The
// pattern tolerates only serialization details (whitespace and the optional
// self-closing slash); the element name and value are the stable contract.
//
// This marker proves normal public runtime behavior through a normal page
// response read from the server-sent body. It is intentionally NOT a health or
// readiness signal (FR-003), carries no Homepage composition beyond the
// minimum verification surface, and contains no Product content (FR-019,
// spec.md "Explicitly Out of Scope").
// ---------------------------------------------------------------------------
const SSR_MARKER_PATTERN =
  /<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*\/?>/;

test("public / serves the minimum Songhealth SSR verification marker", async ({
  page,
}) => {
  const response = await page.goto("/");

  // The navigation itself must produce a server response (a connection-level
  // failure throws before these assertions; that would be an environment
  // error, not the intentional RED).
  expect(response, "GET / must return an HTTP response").not.toBeNull();
  expect(
    response!.status(),
    "GET / must succeed so the public runtime serves its verification surface",
  ).toBe(200);
  expect(
    response!.headers()["content-type"] ?? "",
    "GET / must serve an HTML document",
  ).toContain("text/html");

  // Reading the server-sent body (not the client DOM) keeps this a
  // server-rendered-response contract.
  const body = await response!.text();
  expect(
    body,
    "the SSR response at / must contain the songhealth-foundation marker " +
      "(missing until T011 implements src/pages/index.astro)",
  ).toMatch(SSR_MARKER_PATTERN);
});

test("native EmDash Admin is available at /_emdash/admin/ (native setup or sign-in)", async ({
  page,
}) => {
  // Availability boundary only: navigating to the native Admin route must be
  // handled by the running EmDash integration. The native first-admin setup
  // outcome and the native sign-in outcome are both accepted; the flow is
  // never completed and no passkey interaction, authentication, EmDash UI
  // copy, markup, or other implementation detail is asserted.
  const response = await page.goto("/_emdash/admin/");

  expect(
    response,
    "GET /_emdash/admin/ must return an HTTP response",
  ).not.toBeNull();
  expect(
    response!.status(),
    "the native Admin route must be reachable and served successfully",
  ).toBe(200);

  // After any native redirect (e.g. to first-admin setup or sign-in), the
  // browser must remain inside the native /_emdash route namespace of the
  // configured origin.
  const finalUrl = new URL(page.url());
  expect(finalUrl.pathname, "the Admin flow must stay under /_emdash").toMatch(
    /^\/_emdash(\/|$)/,
  );
});
