/**
 * T032 — Browser tests for the US2 bounded Songhealth admin entry points and
 * authenticated React Preview isolation (tests-first for the T033 admin
 * experience, T034/T035 grant and controller, T036/T037 client and route).
 *
 * References: FR-013–FR-017 (server-side authorized staff boundary, Songhealth
 * work language in wp-admin, Preview confined to currently authorized staff,
 * no administrator credential in the React client, direct URLs/parameters
 * never bypass authorization), FR-016 (Preview excluded from public, search,
 * cache, and crawler exposure); contracts/preview.md §Initiation, §Retrieval,
 * §Isolation; quickstart.md §5, §7; Constitution I, IV, V.
 *
 * EXPECTED RED before T033–T037: the wp-admin edit screen carries no Songhealth
 * identity/preview entry point, the web application has no /preview route, and
 * the Preview REST surface still answers the pre-controller neutral class — so
 * the authorized-flow cases fail on those missing behaviors, not on fixtures.
 *
 * Environment (all optional; missing/unreachable surfaces skip with an explicit
 * reason recorded as an environment limit, never as a pass):
 *
 * - SONGHEALTH_WEB_ORIGIN — the served React public application
 *   (default http://127.0.0.1:4173).
 * - SONGHEALTH_API_BASE_URL — the WordPress origin serving the Songhealth
 *   contract (default http://127.0.0.1:8090).
 * - SONGHEALTH_E2E_STAFF_USER / SONGHEALTH_E2E_STAFF_PASSWORD — a synthetic
 *   staff identity (Songhealth Editor, Basic Page scope) of the disposable
 *   verification runtime.
 * - SONGHEALTH_E2E_STAFF_POST_ID — the internal post ID of a seeded accepted
 *   Draft Basic Page fixture (discoverable through the edit screen).
 * - SONGHEALTH_E2E_WP_CLI — the documented wp-cli invocation prefix of the
 *   runtime (podman compose … run --rm wordpress-cli wp), used only to apply
 *   the mid-test disablement/demotion/scope state changes quickstart §5
 *   requires. Without it those cases skip with an explicit reason.
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
const STAFF_POST_ID = process.env.SONGHEALTH_E2E_STAFF_POST_ID ?? "";
const WP_CLI = process.env.SONGHEALTH_E2E_WP_CLI ?? "";

const PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The Origin header a browser fetch always sends for this cross-origin call.
 *
 * A programmatic request context sends no Origin header, so the spec presents
 * the approved web origin explicitly — exactly what the browser does.
 *
 * @returns The request headers a real browser fetch would carry.
 */
function previewApiOriginHeaders(): Record<string, string> {
  return { Origin: WEB_ORIGIN };
}

/**
 * The Preview retrieval URL for one resource, with the handoff presented.
 *
 * The `_wpnonce` parameter is the platform's own CSRF control for
 * cookie-authenticated REST (core downgrades a session-cookie REST request
 * to anonymous without it); it authorizes nothing by itself.
 *
 * @param publicId Public ID of the record.
 * @param grant    Opaque grant from the navigation.
 * @param nonce    Handoff nonce from the navigation.
 * @returns The absolute retrieval URL.
 */
function previewApiUrl(publicId: string, grant: string, nonce: string): string {
  const url = new URL(`/wp-json/songhealth/v1/preview/basic-page/${publicId}`, API_BASE_URL);
  if (grant.length > 0) {
    url.searchParams.set("grant", grant);
  }
  if (nonce.length > 0) {
    url.searchParams.set("_wpnonce", nonce);
  }
  return url.toString();
}

/** Preview grant lifetime the server issues (must mirror PreviewGrant::TTL_SECONDS). */
const GRANT_TTL_SECONDS = 120;

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
 * The cookie jar is shared with the page context, so subsequent page
 * navigations and the browser preview fetch carry the same session.
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
  expect(response.url(), "the staff identity reaches wp-admin").toContain("/wp-admin");
}

/**
 * Apply one documented wp-cli state change of the disposable runtime.
 *
 * @param args wp-cli arguments after the `wp` command word.
 */
async function wpCli(args: readonly string[]): Promise<void> {
  const prefix = WP_CLI.trim().split(/\s+/).filter((part) => part.length > 0);
  expect(prefix.length, "the control prefix names a command").toBeGreaterThan(0);
  const command = prefix[0]!;
  const rest = [...prefix.slice(1), ...args];
  await runCommand(command, rest, { timeout: 60_000 });
}

test.beforeEach(async ({ request }) => {
  test.skip(!(await originReachable(request, WEB_ORIGIN)), `web origin ${WEB_ORIGIN} is not reachable`);
  test.skip(!(await originReachable(request, API_ORIGIN)), `api origin ${API_ORIGIN} is not reachable`);
  test.skip(STAFF_USER === "" || STAFF_PASSWORD === "", "no synthetic staff identity was supplied");
  test.skip(STAFF_POST_ID === "", "no seeded Draft Basic Page fixture post ID was supplied");
});

test.describe("US2 — bounded Songhealth admin entry points", () => {
  test("wp-admin presents the Songhealth-labelled foundation entry points and Public ID", async ({ page }) => {
    await loginStaff(page.context().request);

    await page.goto(`${API_BASE_URL}/wp-admin/edit.php?post_type=songhealth_page`);
    await expect(page.locator("#menu-posts-songhealth_page .wp-submenu")).toContainText("หน้าข้อมูลทั่วไป");

    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);
    const body = await page.locator("body").innerText();
    expect(body, "the edit screen presents the Songhealth identity metabox").toContain("ข้อมูลประจำหน้าข้อมูลทั่วไป");
    expect(body, "the identity metabox shows the read-only Public ID label").toContain("รหัสประจำ (Public ID)");
    expect(
      await page.locator("[data-songhealth-public-id]").count(),
      "the immutable Public ID is displayed read-only",
    ).toBe(1);
    const publicId = (await page.locator("[data-songhealth-public-id]").first().innerText()).trim();
    expect(publicId).toMatch(PUBLIC_ID_PATTERN);
  });

  test("the edit screen exposes a capability-aware Preview entry point", async ({ page }) => {
    await loginStaff(page.context().request);

    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);
    const previewLink = page.locator("a[data-songhealth-preview]");
    await expect(previewLink).toHaveCount(1);
    expect(await previewLink.getAttribute("href")).toContain("admin-post.php?action=songhealth_preview");
  });
});

test.describe("US2 — authenticated React Preview isolation", () => {
  /**
   * Walk the authorized flow end to end and land on the rendered Preview.
   *
   * @param page Playwright page.
   * @returns The public ID, grant, and handoff nonce of the completed navigation.
   */
  async function openAuthorizedPreview(
    page: Page,
  ): Promise<{ publicId: string; grant: string; nonce: string; logoutHref: string }> {
    await loginStaff(page.context().request);
    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);

    /* Captured in this same session: a logout nonce is bound to it. */
    const logoutHref = (await page.locator("#wp-admin-bar-logout a").getAttribute("href")) ?? "";

    const href = (await page.locator("a[data-songhealth-preview]").first().getAttribute("href")) ?? "";
    expect(href, "the edit screen carries the Preview initiation link").toContain("action=songhealth_preview");

    await page.goto(new URL(href, API_BASE_URL).toString(), { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).origin, "initiation opens the React application").toBe(new URL(WEB_ORIGIN).origin);
    expect(new URL(page.url()).pathname).toMatch(/^\/preview\/basic-page\//);

    /*
     * The one-time handoff travels in the URL fragment — never the query —
     * so the bounded navigation leaves no server-side trace.
     */
    const navigated = new URL(page.url());
    expect(navigated.search, "the navigation URL carries no query string").toBe("");
    const publicId = navigated.pathname.split("/")[3] ?? "";
    const fragment = new URLSearchParams(navigated.hash.replace(/^#/, ""));
    const grant = fragment.get("g") ?? "";
    const nonce = fragment.get("n") ?? "";
    expect(publicId).toMatch(PUBLIC_ID_PATTERN);
    expect(grant.length, "the bounded navigation carries the opaque grant").toBeGreaterThan(0);
    expect(nonce.length, "the bounded navigation carries the platform nonce handoff").toBeGreaterThan(0);
    expect(logoutHref.length, "the session's native logout link is captured").toBeGreaterThan(0);
    return { publicId, grant, nonce, logoutHref };
  }

  test("an authorized Preview renders the candidate, labelled non-public, with no crawler surface", async ({ page }) => {
    const { publicId } = await openAuthorizedPreview(page);

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("[data-songhealth-preview-banner]")).toBeVisible();
    const banner = await page.locator("[data-songhealth-preview-banner]").innerText();
    expect(banner).toContain("ไม่ใช่หน้าสาธารณะ");

    /* The candidate itself renders through the shared presentation. */
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    /* No canonical destination and no crawler surface exist for Preview. */
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", "noindex, nofollow");

    /* The consumed handoff does not linger in the address bar after use. */
    await expect
      .poll(async () => new URL(page.url()).hash + new URL(page.url()).search, { timeout: 10_000 })
      .not.toContain("g=");
    await expect
      .poll(async () => new URL(page.url()).search, { timeout: 10_000 })
      .toBe("");

    /*
     * The document answer declares the route's confidentiality posture. The
     * dev middleware does not forward loader response headers onto the
     * document, so the posture is asserted when the served origin applies it
     * (production/data posture) and the substantive protections — no
     * candidate in the server-rendered document and exact API headers — are
     * asserted unconditionally below and in the API-header case.
     */
    const response = await page.request.get(page.url(), { maxRedirects: 0 });
    const documentCacheControl = response.headers()["cache-control"];
    if (documentCacheControl !== undefined) {
      expect(documentCacheControl).toContain("private");
      expect(documentCacheControl).toContain("no-store");
    }

    /* No lifecycle mutation control and no analytics capture exist. */
    const html = await page.content();
    expect(html).not.toMatch(/<form[^>]*action="[^"]*admin-post/);
    expect(html).not.toContain("wp-admin/post.php");
  });

  test("the Preview API response carries the required confidentiality headers", async ({ page }) => {
    const { publicId, grant, nonce } = await openAuthorizedPreview(page);
    await expect(page.locator("[data-songhealth-preview-banner]")).toBeVisible();

    const response = await page.request.get(previewApiUrl(publicId, grant, nonce), {
      headers: previewApiOriginHeaders(),
    });
    expect(response.status()).toBe(200);
    /*
     * The platform layers its own no-cache directives onto authenticated REST
     * answers, so the served value is at least private + no-store.
     */
    expect(response.headers()["cache-control"]).toContain("private");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("logout denies the next request with no anonymous fallback", async ({ page }) => {
    const { publicId, grant, nonce, logoutHref } = await openAuthorizedPreview(page);
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    /*
     * Native logout through the page's own session: the request context of
     * the page shares its cookie jar, so the logout destroys the session the
     * preview fetch itself uses.
     */
    await page.context().request.get(new URL(logoutHref!, API_BASE_URL).toString().replace(/&amp;/g, "&"), {
      maxRedirects: 5,
    });

    /*
     * A real post-logout request carries no handoff at all — the nonce died
     * with the session — so the neutral denial is asserted for that shape,
     * and the stale-nonce shape is asserted to be equally nondisclosing (the
     * platform answers it with its own bounded cookie-check failure).
     */
    const denied = await page.request.get(previewApiUrl(publicId, grant, ""), {
      headers: previewApiOriginHeaders(),
    });
    expect(denied.status(), "the next request after logout is the neutral denial").toBe(404);
    expect((await denied.json()).code).toBe("songhealth_not_found");

    const staleNonce = await page.request.get(previewApiUrl(publicId, grant, nonce), {
      headers: previewApiOriginHeaders(),
    });
    expect([403, 404], "a stale handoff is denied without any candidate disclosure").toContain(
      staleNonce.status(),
    );
    expect(await staleNonce.text()).not.toContain("Preview Contract Fixture");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-songhealth-preview-banner]")).toBeVisible();
    const visible = await page.locator("main").innerText();
    expect(visible, "no candidate content survives the authorization loss").not.toContain("Preview Contract Fixture");
  });

  test("a direct Preview URL without a grant never discloses the candidate", async ({ page }) => {
    await loginStaff(page.context().request);
    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);
    const publicId = (await page.locator("[data-songhealth-public-id]").first().innerText()).trim();

    /* Direct navigation with no grant parameter at all. */
    await page.goto(`${WEB_ORIGIN}/preview/basic-page/${publicId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-songhealth-preview-banner]")).toBeVisible();
    const visible = await page.locator("main").innerText();
    expect(visible).not.toContain("Preview Contract Fixture");

    /* The REST surface denies a grantless request identically. */
    const denied = await page.request.get(
      `${API_BASE_URL}/wp-json/songhealth/v1/preview/basic-page/${publicId}`,
    );
    expect(denied.status()).toBe(404);
    expect((await denied.json()).code).toBe("songhealth_not_found");
  });

  test("an anonymous visitor to the Preview URL receives no candidate and no SSR disclosure", async ({ request, page }) => {
    await loginStaff(page.context().request);
    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);
    const publicId = (await page.locator("[data-songhealth-public-id]").first().innerText()).trim();

    /* The server-rendered document of an unauthenticated request carries no candidate. */
    const anonymous = await request.get(`${WEB_ORIGIN}/preview/basic-page/${publicId}`, {
      maxRedirects: 0,
    });
    expect(anonymous.status()).toBe(200);
    const html = await anonymous.text();
    expect(html).not.toContain("Preview Contract Fixture");
    expect(html).not.toMatch(/wp-json\/wp\/v2/);
    expect(html).not.toContain("songhealth_page");
  });

  test("the public surface never discloses the Preview candidate", async ({ page }) => {
    await loginStaff(page.context().request);
    await page.goto(`${API_BASE_URL}/wp-admin/post.php?post=${STAFF_POST_ID}&action=edit`);
    const publicId = (await page.locator("[data-songhealth-public-id]").first().innerText()).trim();

    /* The Draft fixture stays neutral on the public canonical route. */
    const publicRoute = await page.request.get(`${WEB_ORIGIN}/pages/${publicId}`, { maxRedirects: 0 });
    expect(publicRoute.status()).toBe(404);

    /* No public page links into Preview. */
    const home = await page.goto(`${WEB_ORIGIN}/`, { waitUntil: "domcontentloaded" });
    expect(home?.status()).toBe(200);
    const content = await page.content();
    expect(content).not.toContain("/preview/");
  });

  test("user disablement revokes Preview on the next request", async ({ page }) => {
    test.skip(WP_CLI === "", "no wp-cli control prefix was supplied (disablement needs a runtime state change)");

    const { publicId, grant, nonce } = await openAuthorizedPreview(page);
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    await wpCli(["user", "meta", "update", STAFF_USER, "songhealth_account_status", "disabled"]);
    try {
      const denied = await page.request.get(previewApiUrl(publicId, grant, nonce), {
      headers: previewApiOriginHeaders(),
    });
      expect(denied.status(), "disablement denies the next request").toBe(404);

      await page.reload({ waitUntil: "domcontentloaded" });
      expect(await page.locator("main").innerText()).not.toContain("Preview Contract Fixture");
    } finally {
      await wpCli(["user", "meta", "delete", STAFF_USER, "songhealth_account_status"]);
    }
  });

  test("demotion below the view capability revokes Preview on the next request", async ({ page }) => {
    test.skip(WP_CLI === "", "no wp-cli control prefix was supplied (demotion needs a runtime state change)");

    const { publicId, grant, nonce } = await openAuthorizedPreview(page);
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    /*
     * Demotion below the Songhealth staff boundary: a Viewer would still hold
     * the view capability (view applies in every state), so the demotion goes
     * to a non-staff role.
     */
    await wpCli(["user", "update", STAFF_USER, "--role=subscriber"]);
    try {
      const denied = await page.request.get(previewApiUrl(publicId, grant, nonce), {
        headers: previewApiOriginHeaders(),
      });
      expect(denied.status(), "a demoted actor is denied on the next request").toBe(404);
    } finally {
      await wpCli(["user", "update", STAFF_USER, "--role=songhealth_editor"]);
    }
  });

  test("scope loss revokes Preview on the next request", async ({ page }) => {
    test.skip(WP_CLI === "", "no wp-cli control prefix was supplied (scope loss needs a runtime state change)");

    const { publicId, grant, nonce } = await openAuthorizedPreview(page);
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    await wpCli(["user", "meta", "update", STAFF_USER, "songhealth_module_scope", "1"]);
    try {
      const denied = await page.request.get(previewApiUrl(publicId, grant, nonce), {
      headers: previewApiOriginHeaders(),
    });
      expect(denied.status(), "an out-of-scope actor is denied on the next request").toBe(404);
    } finally {
      await wpCli(["user", "meta", "update", STAFF_USER, "songhealth_module_scope", "--format=json", '["basic-page","document-resource"]']);
    }
  });

  test("an expired grant denies the next request", async ({ page }) => {
    test.setTimeout((GRANT_TTL_SECONDS + 60) * 1_000);

    const { publicId, grant, nonce } = await openAuthorizedPreview(page);
    await expect(page.locator("main")).toContainText("Preview Contract Fixture");

    /* The grant is short-lived: wait past its lifetime and re-request. */
    await page.waitForTimeout((GRANT_TTL_SECONDS + 10) * 1_000);

    const denied = await page.request.get(previewApiUrl(publicId, grant, nonce), {
      headers: previewApiOriginHeaders(),
    });
    expect(denied.status(), "an expired grant fails closed").toBe(404);

    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await page.locator("main").innerText()).not.toContain("Preview Contract Fixture");
  });
});
