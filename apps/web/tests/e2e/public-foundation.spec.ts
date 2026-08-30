/**
 * T024 — Browser tests for the US1 public foundation (tests-first for the
 * T026 client / T027 presentation / T028 canonical route).
 *
 * References: FR-006–FR-012 (allowlisted fields, current eligibility, native
 * containment, Songhealth-contract-only consumption, Public-ID identity with
 * optional display slug, neutral unknown/ineligible behavior), FR-030 and the
 * G02C-B02 clarification (bounded listing, no hub, no search);
 * contracts/public-rest.md §Canonical behavior; tasks.md US1 scope guardrails
 * ("no public `/pages` hub"); Constitution I, IV, V.
 *
 * The spec discovers its eligible fixture through the approved public
 * contract itself (the bounded listing) rather than through CMS-internal
 * knowledge, and takes the identity/slug assertions from the detail DTO's
 * canonical path — the same authority the React route uses.
 *
 * EXPECTED RED before T026–T028: the `/pages/…` routes do not exist in the
 * React application, so every page-navigation case fails at navigation or on
 * the neutral-fixture assertions — not through test-syntax, fixture, or
 * forced-failure errors.
 *
 * Environment (all optional; missing/unreachable surfaces skip with an
 * explicit reason recorded as an environment limit, never as a pass):
 *
 * - SONGHEALTH_WEB_ORIGIN — the served React public application
 *   (default http://127.0.0.1:4173).
 * - SONGHEALTH_API_BASE_URL — the WordPress origin serving the Songhealth
 *   contract (default http://127.0.0.1:8090).
 * - SONGHEALTH_E2E_INELIGIBLE_PUBLIC_ID — a known-ineligible (e.g. Draft)
 *   fixture's Public ID. Ineligible identities are undiscoverable BY DESIGN,
 *   so the neutral-ineligible case needs one supplied by the seeding setup.
 */

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const WEB_ORIGIN = process.env.SONGHEALTH_WEB_ORIGIN ?? "http://127.0.0.1:4173";
const API_BASE_URL = process.env.SONGHEALTH_API_BASE_URL ?? "http://127.0.0.1:8090";
const API_ORIGIN = new URL(API_BASE_URL).origin;
const INELIGIBLE_PUBLIC_ID = process.env.SONGHEALTH_E2E_INELIGIBLE_PUBLIC_ID ?? "";

const PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The discovered eligible fixture and its authoritative canonical path. */
let fixture: { publicId: string; canonicalPath: string; title: string; raw: unknown } | null = null;

/**
 * Probe whether an origin answers at all.
 *
 * @param request Playwright request context.
 * @param origin  Origin to probe.
 */
async function originReachable(request: APIRequestContext, origin: string): Promise<boolean> {
  try {
    const response = await request.get(origin, { timeout: 5_000 });
    return response.status() < 500 || response.status() >= 200; /* any answer means "served" */
  } catch {
    return false;
  }
}

test.beforeEach(async ({ request }) => {
  test.skip(!(await originReachable(request, WEB_ORIGIN)), `web origin ${WEB_ORIGIN} is not reachable`);
  test.skip(!(await originReachable(request, API_ORIGIN)), `api origin ${API_ORIGIN} is not reachable`);

  if (fixture) {
    return;
  }

  /* Discover an eligible Basic Page through the approved public contract. */
  const listing = await request.get(
    `${API_BASE_URL}/wp-json/songhealth/v1/resources?type=basic-page&perPage=5&order=newest`,
  );
  test.skip(listing.status() !== 200, "the Songhealth bounded listing is not serving eligible fixtures");
  const envelope = (await listing.json()) as { data?: unknown };

  const data = Array.isArray(envelope?.data) ? (envelope.data as Record<string, unknown>[]) : [];
  const candidate = data.find(
    (item) =>
      typeof item.publicId === "string" &&
      PUBLIC_ID_PATTERN.test(item.publicId) &&
      typeof item.canonicalPath === "string" &&
      item.canonicalPath.startsWith(`/pages/${item.publicId}`),
  );
  test.skip(!candidate, "no eligible Basic Page fixture exists to resolve");
  const resolved = candidate as { publicId: string; canonicalPath: string; title?: string };
  fixture = {
    publicId: resolved.publicId,
    canonicalPath: resolved.canonicalPath,
    title: resolved.title ?? "",
    raw: candidate,
  };
});

/**
 * Navigate in the browser and describe the answer.
 *
 * @param page Playwright page.
 * @param path Path to navigate to.
 */
async function navigate(page: Page, path: string) {
  return page.goto(`${WEB_ORIGIN}${path}`, { waitUntil: "domcontentloaded" });
}

test.describe("US1 public foundation — Public-ID resolution and canonical behavior", () => {
  test("an eligible Basic Page resolves by Public ID and renders only public content", async ({ page }) => {
    const response = await navigate(page, fixture!.canonicalPath);
    expect(response?.status(), "the canonical route renders the eligible record").toBe(200);

    await expect(page.locator("main")).toBeVisible();
    if (fixture!.title) {
      await expect(page.locator("main")).toContainText(fixture!.title);
    }

    /* Only public data renders: no CMS-internal identity ever reaches the page. */
    const html = await page.content();
    expect(html).not.toMatch(/wp-content\/uploads/);
    expect(html).not.toMatch(/wp-json\/wp\/v2/);
    expect(html).not.toContain("songhealth_page");
  });

  test("the canonical route advertises exactly one canonical destination", async ({ page }) => {
    await navigate(page, fixture!.canonicalPath);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", `${WEB_ORIGIN}${fixture!.canonicalPath}`);
  });

  test("a missing display slug redirects directly to the canonical path", async ({ request, page }) => {
    const response = await request.get(`${WEB_ORIGIN}/pages/${fixture!.publicId}`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toBe(fixture!.canonicalPath);

    /* In the browser, the same navigation lands on the one canonical destination. */
    await navigate(page, `/pages/${fixture!.publicId}`);
    expect(new URL(page.url()).pathname).toBe(fixture!.canonicalPath);
  });

  test("an outdated display slug redirects directly to the canonical path", async ({ request, page }) => {
    const response = await request.get(`${WEB_ORIGIN}/pages/${fixture!.publicId}/outdated-legacy-slug`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toBe(fixture!.canonicalPath);

    await navigate(page, `/pages/${fixture!.publicId}/outdated-legacy-slug`);
    expect(new URL(page.url()).pathname).toBe(fixture!.canonicalPath);
  });

  test("a differently-normalized slug variant redirects to the canonical path", async ({ request, page }) => {
    const response = await request.get(`${WEB_ORIGIN}/pages/${fixture!.publicId}/NotCanonical`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toBe(fixture!.canonicalPath);

    await navigate(page, `/pages/${fixture!.publicId}/NotCanonical`);
    expect(new URL(page.url()).pathname).toBe(fixture!.canonicalPath);
  });

  test("a malformed Public ID receives the neutral not-found behavior, never a homepage redirect", async ({ page }) => {
    const response = await navigate(page, "/pages/not-a-uuid");
    expect(response?.status(), "unknown identifiers are neutral, not redirected").toBe(404);
    expect(new URL(page.url()).pathname, "no blind homepage redirect").toBe("/pages/not-a-uuid");
  });

  test("an unknown canonical Public ID is neutral and indistinguishable from a malformed one", async ({ page }) => {
    const response = await navigate(page, "/pages/00000000-0000-7000-8000-000000000000");
    expect(response?.status()).toBe(404);

    /* The rendered answer is the neutral copy: no state, no CMS identity, no suggestion. */
    const main = page.locator("main");
    await expect(main).toContainText("Not found");
    const visible = await main.innerText();
    expect(visible.toLowerCase()).not.toContain("wordpress");
    expect(visible.toLowerCase()).not.toContain("draft");
  });

  test("a known ineligible Public ID is neutral without disclosing existence or state", async ({ page }) => {
    test.skip(
      INELIGIBLE_PUBLIC_ID === "",
      "no known-ineligible fixture was supplied (ineligible identities are undiscoverable by design)",
    );

    const response = await navigate(page, `/pages/${INELIGIBLE_PUBLIC_ID}`);
    expect(response?.status()).toBe(404);

    /* The neutral answer: the visible page discloses neither existence nor lifecycle. */
    const main = page.locator("main");
    await expect(main).toContainText("Not found");
    const visible = await main.innerText();
    expect(visible.toLowerCase()).not.toContain("draft");
    expect(visible.toLowerCase()).not.toContain("unavailable");
  });

  test("no public /pages listing hub exists", async ({ request }) => {
    const response = await request.get(`${WEB_ORIGIN}/pages`, { maxRedirects: 0 });
    expect(response.status(), "the listing API creates no public hub route").toBe(404);
  });

  test("no Songhealth public search route or parameter surface exists", async ({ request, page }) => {
    const searched = await request.get(`${WEB_ORIGIN}/search?q=fixture`, { maxRedirects: 0 });
    expect(searched.status(), "no Songhealth search route exists in the public application").toBe(404);

    const hubSearched = await request.get(`${WEB_ORIGIN}/pages?search=fixture`, { maxRedirects: 0 });
    expect(hubSearched.status()).toBe(404);

    /* The public application never sends a search request to the contract. */
    const searchRequests: string[] = [];
    page.on("request", (intercepted) => {
      if (intercepted.url().includes("search=") || intercepted.url().includes("/search")) {
        searchRequests.push(intercepted.url());
      }
    });
    await navigate(page, fixture!.canonicalPath);
    expect(searchRequests, "no search request is ever issued from the public surface").toHaveLength(0);
  });
});
