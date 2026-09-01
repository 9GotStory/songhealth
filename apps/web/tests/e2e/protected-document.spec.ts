/**
 * T041 — Browser tests for the US3 protected Document Resource boundary
 * (tests-first for the T045 renderer, the T046 canonical route, and the
 * T043/T044 binary controllers).
 *
 * References: FR-018–FR-020 (binary existence is not delivery eligibility;
 * anonymous delivery only while the owning Document Resource is itself
 * currently eligible; references never elevate; retained URLs never
 * authorize; failures bounded and neutral), FR-016/FR-017 (Preview binary is
 * separate, authenticated, currently authorized);
 * contracts/protected-binary.md; quickstart.md §6; SC-004.
 *
 * EXPECTED RED before T043–T046: the React application has no `/documents`
 * route and the binary surfaces answer the pre-controller neutral class, so
 * the delivery and routing cases fail on those missing behaviors, not on
 * fixtures.
 *
 * Environment (all optional; missing/unreachable surfaces skip with an
 * explicit reason recorded as an environment limit, never as a pass):
 *
 * - SONGHEALTH_WEB_ORIGIN — the served React public application
 *   (default http://127.0.0.1:4173).
 * - SONGHEALTH_API_BASE_URL — the WordPress origin serving the Songhealth
 *   contract (default http://127.0.0.1:8090).
 * - SONGHEALTH_E2E_ELIGIBLE_DOCUMENT_PUBLIC_ID — a seeded eligible Document
 *   Resource with a valid protected attachment, discovered through the
 *   bounded listing when absent.
 * - SONGHEALTH_E2E_ELIGIBLE_DOCUMENT_POST_ID — the internal post ID of that
 *   eligible fixture, used only with the wp-cli control for the mid-test
 *   revocation case.
 * - SONGHEALTH_E2E_INELIGIBLE_DOCUMENT_PUBLIC_ID — a seeded Draft Document
 *   Resource with a valid attachment (never publicly deliverable), required
 *   for the reference non-elevation and Preview-binary cases.
 * - SONGHEALTH_E2E_STAFF_USER / SONGHEALTH_E2E_STAFF_PASSWORD — a synthetic
 *   staff identity (Songhealth Editor, document scope) for the authenticated
 *   Preview binary case.
 * - SONGHEALTH_E2E_WP_CLI — the documented wp-cli control prefix of the
 *   runtime, used only for the mid-test revocation quickstart §6 requires.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const runCommand = promisify(execFile);

const WEB_ORIGIN = process.env.SONGHEALTH_WEB_ORIGIN ?? "http://127.0.0.1:4173";
const API_BASE_URL = process.env.SONGHEALTH_API_BASE_URL ?? "http://127.0.0.1:8090";
const API_ORIGIN = new URL(API_BASE_URL).origin;
const STAFF_USER = process.env.SONGHEALTH_E2E_STAFF_USER ?? "";
const STAFF_PASSWORD = process.env.SONGHEALTH_E2E_STAFF_PASSWORD ?? "";
const WP_CLI = process.env.SONGHEALTH_E2E_WP_CLI ?? "";

const PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Probe whether an origin answers at all.
 *
 * @param request Playwright request context.
 * @param origin Origin to probe.
 */
async function originReachable(request: APIRequestContext, origin: string): Promise<boolean> {
  try {
    const response = await request.get(origin, { timeout: 5_000 });
    return response.status() < 500 || response.status() >= 200; /* any answer means "served" */
  } catch {
    return false;
  }
}

/**
 * Log the synthetic staff identity in through the native WordPress login form.
 *
 * @param request Playwright request context.
 */
async function loginStaff(request: APIRequestContext): Promise<void> {
  await request.get(`${API_BASE_URL}/wp-login.php`);
  const response = await request.post(`${API_BASE_URL}/wp-login.php`, {
    form: {
      log: STAFF_USER,
      pwd: STAFF_PASSWORD,
      "wp-submit": "Log In",
      redirect_to: `${API_BASE_URL}/wp-admin/`,
      testcookie: "1",
    },
    maxRedirects: 5,
  });
  expect(response.status(), "the synthetic staff identity logs in").toBe(200);
}

/**
 * Apply one documented wp-cli state change of the disposable runtime.
 *
 * @param args wp-cli arguments after the `wp` command word.
 */
async function wpCli(args: readonly string[]): Promise<void> {
  const prefix = WP_CLI.trim().split(/\s+/).filter((part) => part.length > 0);
  expect(prefix.length, "the control prefix names a command").toBeGreaterThan(0);
  await runCommand(prefix[0]!, [...prefix.slice(1), ...args], { timeout: 60_000 });
}

/** The discovered eligible fixture. */
let eligible: { publicId: string; canonicalPath: string } | null = null;

test.beforeEach(async ({ request }) => {
  test.skip(!(await originReachable(request, WEB_ORIGIN)), `web origin ${WEB_ORIGIN} is not reachable`);
  test.skip(!(await originReachable(request, API_ORIGIN)), `api origin ${API_ORIGIN} is not reachable`);

  if (eligible) {
    return;
  }
  const supplied = process.env.SONGHEALTH_E2E_ELIGIBLE_DOCUMENT_PUBLIC_ID ?? "";
  if (supplied !== "") {
    /* The canonical path (with its optional slug) is authoritative from the public contract itself. */
    const detail = await request.get(
      `${API_BASE_URL}/wp-json/songhealth/v1/resources/document-resource/${supplied}`,
    );
    test.skip(detail.status() !== 200, "the supplied eligible document fixture is not currently eligible");
    const dto = (await detail.json()) as { canonicalPath?: string };
    test.skip(typeof dto.canonicalPath !== "string", "the eligible document fixture carries no canonical path");
    eligible = { publicId: supplied, canonicalPath: dto.canonicalPath as string };
    return;
  }

  /* Discover an eligible Document Resource through the approved public contract. */
  const listing = await request.get(
    `${API_BASE_URL}/wp-json/songhealth/v1/resources?type=document-resource&perPage=5&order=newest`,
  );
  test.skip(listing.status() !== 200, "the Songhealth bounded listing is not serving eligible document fixtures");
  const envelope = (await listing.json()) as { data?: unknown };
  const data = Array.isArray(envelope?.data) ? (envelope.data as Record<string, unknown>[]) : [];
  const candidate = data.find(
    (item) =>
      typeof item.publicId === "string" &&
      PUBLIC_ID_PATTERN.test(item.publicId) &&
      typeof item.downloadPath === "string" &&
      typeof item.canonicalPath === "string" &&
      item.canonicalPath.startsWith(`/documents/${item.publicId}`),
  );
  test.skip(!candidate, "no eligible Document Resource fixture exists to resolve");
  const resolved = candidate as { publicId: string; canonicalPath: string };
  eligible = { publicId: resolved.publicId, canonicalPath: resolved.canonicalPath };
});

test.describe("US3 — canonical Document Resource route and anonymous delivery", () => {
  test("an eligible Document Resource renders at its canonical route with only the mediated download path", async ({ page }) => {
    const response = await page.goto(`${WEB_ORIGIN}${eligible!.canonicalPath}`, { waitUntil: "domcontentloaded" });
    expect(response?.status(), "the canonical route renders the eligible record").toBe(200);
    await expect(page.locator("main")).toBeVisible();

    /* Only the mediated Songhealth path appears — never a media URL, attachment id, or filename. */
    const html = await page.content();
    expect(html).not.toMatch(/wp-content\/uploads/);
    expect(html).not.toContain("attachment_id");
    expect(html).not.toMatch(/wp-json\/wp\/v2/);

    const download = page.locator("a[data-songhealth-download]");
    await expect(download).toHaveCount(1);
    expect(await download.getAttribute("href")).toBe(
      `${API_BASE_URL}/wp-json/songhealth/v1/documents/${eligible!.publicId}/binary`,
    );

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", `${WEB_ORIGIN}${eligible!.canonicalPath}`);
  });

  test("slug variants redirect to the one canonical destination", async ({ request, page }) => {
    const missing = await request.get(`${WEB_ORIGIN}/documents/${eligible!.publicId}`, { maxRedirects: 0 });
    expect(missing.status()).toBe(302);
    expect(missing.headers()["location"]).toBe(eligible!.canonicalPath);

    await page.goto(`${WEB_ORIGIN}/documents/${eligible!.publicId}/outdated-slug`);
    expect(new URL(page.url()).pathname).toBe(eligible!.canonicalPath);
  });

  test("an anonymous visitor downloads the bytes through the mediated path only", async ({ request }) => {
    const download = await request.get(
      `${API_BASE_URL}/wp-json/songhealth/v1/documents/${eligible!.publicId}/binary`,
    );
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toBe("application/pdf");
    expect((await download.body()).length).toBeGreaterThan(0);
    expect(download.headers()["cache-control"]).toContain("no-store");

    /* The stored upload filename never becomes the download identity. */
    const disposition = download.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).not.toContain("upload");
  });

  test("revocation denies the retained prior-success URL on the next request", async ({ request, page }) => {
    const postId = process.env.SONGHEALTH_E2E_ELIGIBLE_DOCUMENT_POST_ID ?? "";
    test.skip(WP_CLI === "" || postId === "", "no wp-cli control prefix and fixture post ID were supplied (revocation needs a runtime state change)");

    const url = `${API_BASE_URL}/wp-json/songhealth/v1/documents/${eligible!.publicId}/binary`;
    expect((await request.get(url)).status(), "the URL delivers while currently eligible").toBe(200);

    await wpCli(["post", "meta", "update", postId, "_songhealth_withdrawn", "1"]);
    try {
      const denied = await request.get(url);
      expect(denied.status(), "the retained prior-success URL denies after revocation").toBe(404);
      expect((await denied.json()).code).toBe("songhealth_not_found");

      /* The public canonical route is neutral for the revoked record too. */
      const route = await page.goto(`${WEB_ORIGIN}${eligible!.canonicalPath}`, { waitUntil: "domcontentloaded" });
      expect(route?.status(), "the revoked record is neutral on its public route").toBe(404);
    } finally {
      await wpCli(["post", "meta", "delete", postId, "_songhealth_withdrawn"]);
    }
  });
});

test.describe("US3 — public-parent reference non-elevation and neutral behavior", () => {
  test("an ineligible referenced document stays neutral on its public route and binary path", async ({ request, page }) => {
    const ineligible = process.env.SONGHEALTH_E2E_INELIGIBLE_DOCUMENT_PUBLIC_ID ?? "";
    test.skip(ineligible === "", "no ineligible Document Resource fixture was supplied");

    const route = await page.goto(`${WEB_ORIGIN}/documents/${ineligible}/any-slug`, { waitUntil: "domcontentloaded" });
    expect(route?.status(), "the public route is neutral for an ineligible document").toBe(404);
    const visible = await page.locator("main").innerText();
    expect(visible.toLowerCase()).not.toContain("draft");

    const binary = await request.get(`${API_BASE_URL}/wp-json/songhealth/v1/documents/${ineligible}/binary`);
    expect(binary.status()).toBe(404);
    expect((await binary.json()).code).toBe("songhealth_not_found");
  });

  test("an eligible public Basic Page links its eligible references and nothing more", async ({ page }) => {
    const home = await page.goto(`${WEB_ORIGIN}/`, { waitUntil: "domcontentloaded" });
    expect(home?.status()).toBe(200);
    const html = await page.content();
    expect(html).not.toContain("wp-content/uploads");

    /* No /documents listing hub exists. */
    const hub = await page.request.get(`${WEB_ORIGIN}/documents`, { maxRedirects: 0 });
    expect(hub.status(), "no public /documents hub route exists").toBe(404);
  });
});

test.describe("US3 — authenticated Preview binary is a separate surface", () => {
  /**
   * Walk the authorized Preview flow for the ineligible fixture and return
   * its handoff, captured before the route consumes it.
   *
   * @param page Playwright page.
   * @returns The public ID, grant, and nonce of the navigation.
   */
  async function openDocumentPreview(
    page: Page,
  ): Promise<{ publicId: string; grant: string; nonce: string }> {
    const ineligible = process.env.SONGHEALTH_E2E_INELIGIBLE_DOCUMENT_PUBLIC_ID ?? "";
    test.skip(ineligible === "", "no ineligible Document Resource fixture was supplied");

    await loginStaff(page.context().request);
    /* Discover the record's edit screen through the admin list. */
    await page.goto(`${API_BASE_URL}/wp-admin/edit.php?post_type=songhealth_document`);
    const row = page.locator(`#the-list a.row-title`).first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    await page.waitForLoadState("domcontentloaded");

    const href = (await page.locator("a[data-songhealth-preview]").first().getAttribute("href")) ?? "";
    expect(href, "the edit screen carries the Preview initiation link").toContain("action=songhealth_preview");

    await page.goto(new URL(href, API_BASE_URL).toString(), { waitUntil: "domcontentloaded" });
    const landed = new URL(page.url());
    expect(landed.pathname).toMatch(/^\/preview\/document-resource\//);
    const fragment = new URLSearchParams(landed.hash.replace(/^#/, ""));
    const publicId = landed.pathname.split("/")[3] ?? "";
    const grant = fragment.get("g") ?? "";
    const nonce = fragment.get("n") ?? "";
    expect(publicId).toMatch(PUBLIC_ID_PATTERN);
    expect(grant.length).toBeGreaterThan(0);
    expect(nonce.length).toBeGreaterThan(0);
    return { publicId, grant, nonce };
  }

  test("the Preview binary delivers to the authenticated session and denies everyone else", async ({ page }) => {
    test.skip(STAFF_USER === "" || STAFF_PASSWORD === "", "no synthetic staff identity was supplied");

    const { publicId, grant, nonce } = await openDocumentPreview(page);

    /* The candidate preview renders the non-public document. */
    await expect(page.locator("[data-songhealth-preview-banner]")).toBeVisible();

    const previewBinaryUrl = `${API_BASE_URL}/wp-json/songhealth/v1/preview/document-resource/${publicId}/binary?grant=${encodeURIComponent(grant)}&_wpnonce=${encodeURIComponent(nonce)}`;

    /* Authenticated session with the bound grant: bytes arrive with Preview isolation. */
    const authorized = await page.context().request.get(previewBinaryUrl, {
      headers: { Origin: WEB_ORIGIN },
    });
    expect(authorized.status(), "the Preview binary serves the authenticated session").toBe(200);
    expect(authorized.headers()["content-type"]).toBe("application/pdf");
    expect((authorized.headers()["cache-control"] ?? "")).toContain("no-store");
    expect((authorized.headers()["x-robots-tag"] ?? "")).toContain("noindex");

    /* The anonymous binary route for the same record stays neutral. */
    const anonymous = await page.request.get(`${API_BASE_URL}/wp-json/songhealth/v1/documents/${publicId}/binary`, {
      headers: { Origin: WEB_ORIGIN },
    });
    expect(anonymous.status(), "Preview state never changes anonymous eligibility").toBe(404);
  });

  test("the Preview binary denies an anonymous direct request carrying a leaked grant", async ({ request }) => {
    const ineligible = process.env.SONGHEALTH_E2E_INELIGIBLE_DOCUMENT_PUBLIC_ID ?? "";
    test.skip(ineligible === "", "no ineligible Document Resource fixture was supplied");

    const response = await request.get(
      `${API_BASE_URL}/wp-json/songhealth/v1/preview/document-resource/${ineligible}/binary`,
      { headers: { Origin: WEB_ORIGIN } },
    );
    expect(response.status(), "an anonymous Preview binary request is the neutral denial").toBe(404);
  });
});
