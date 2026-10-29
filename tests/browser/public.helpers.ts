// Feature 003 public-page test harness (#52; spec #51 "Testing Decisions").
//
// Shared by every public-page suite (Seam A: public pages over HTTP on the
// single development runtime, http://127.0.0.1:4324):
// - `test`: Playwright's test with an automatic third-party request guard.
//   Every request and WebSocket a page opens must stay on the configured
//   origin, so loading a page never sends the visit to a font host, map or
//   tracker elsewhere (#51 user story 11). The guard fails the test after it
//   has run.
// - `expectNoAxeViolations`: axe-core with the WCAG 2.2 AA tag set.
// - `DESKTOP_VIEWPORT` / `MOBILE_VIEWPORT`: the two widths every template is
//   checked at. The mobile width is 320 CSS px, the narrowest width the site
//   must reflow to without horizontal scrolling (WCAG 2.2 SC 1.4.10).
//
// Verified against the pinned @axe-core/playwright 4.14.0 (axe-core 4.14.0,
// node_modules/@axe-core/playwright/dist/index.d.ts): `new AxeBuilder({ page })
// .withTags(tags).analyze()` resolves to the axe results, whose `violations`
// lists each failed rule with the nodes it failed on.

import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

export { expect };

/** WCAG 2.2 level A and AA, as axe-core tags (#51 Testing Decisions). */
export const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The Figma Homepage Concept v1 desktop frame width. */
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** The narrowest width the site supports (WCAG 2.2 SC 1.4.10 reflow). */
export const MOBILE_VIEWPORT = { width: 320, height: 640 };

export const VIEWPORTS = { desktop: DESKTOP_VIEWPORT, mobile: MOBILE_VIEWPORT };

const NETWORK_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

export const test = base.extend<{ thirdPartyRequests: string[] }>({
	thirdPartyRequests: [
		async ({ page, baseURL }, use) => {
			if (baseURL === undefined) {
				throw new Error("the public-page suites need a configured baseURL (PLAYWRIGHT_BASE_URL)");
			}
			const siteHost = new URL(baseURL).host;
			const requests: string[] = [];
			const record = (url: string) => {
				const { protocol, host } = new URL(url);
				if (NETWORK_PROTOCOLS.has(protocol) && host !== siteHost) {
					requests.push(url);
				}
			};
			page.on("request", (request) => record(request.url()));
			page.on("websocket", (socket) => record(socket.url()));
			await use(requests);
			expect(requests, "a public page must not contact any third-party origin").toEqual([]);
		},
		{ auto: true },
	],
});

/**
 * Run axe with the WCAG 2.2 AA tag set on the page as it is now, and fail with
 * a readable summary (rule, impact and the offending nodes) on any violation.
 */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
	const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();
	const violations = results.violations.map(
		(violation) =>
			`${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.help} — ${violation.nodes
				.map((node) => node.target.join(" "))
				.join(", ")}`,
	);
	expect(violations, `${label}: axe must report no WCAG 2.2 AA violations`).toEqual([]);
}
