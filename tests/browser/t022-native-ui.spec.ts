// T022 — minimal focused NATIVE UI check, SOURCE ONLY (offline-recovery
// preparation under PO gate 6404739593 item 3(iv), completing the last-round
// scope 6328849596 #4: "run the minimum already-available focused native UI
// check(s) ... If not demonstrable, report truthful PENDING"). The original
// calibration file lived only as an uncommitted Multica-workspace artifact
// that could not be recovered (0700 workspace; no copy on any reachable
// system), so this is a bounded RECREATION, not a transplant.
//
// THIS FILE WAS NEVER EXECUTED under the offline-only gate and asserts
// nothing about any runtime: it exists so a future, SEPARATELY authorized
// T022 runtime gate has the minimum native UI journey ready — the
// unauthenticated Admin boundary (native Thai sign-in copy, no authenticated
// surface) plus the locale-propagation calibration that the T032 round
// root-caused across hosts. It claims no T032 staff evidence and no
// SC-007 comprehension.
import { expect, test } from "@playwright/test";

/** The native passkey sign-in copy (Thai, with the platform English fallback). */
const PASSKEY_SIGNIN_COPY = /(ใช้ Passkey ที่ลงทะเบียนไว้|Passkey)/;

/** An applied collection's Thai label — visible only to an authenticated session. */
const AUTHENTICATED_SIDEBAR_LABEL = /หน่วยบริการสุขภาพ|บริการ/;

/**
 * The admitted disposable origin (loopback, never the persistent 4322).
 * Resolved lazily inside the tests so discovery (`--list`) never needs a
 * runtime: an unset/invalid value fails the test itself, never silently
 * falls back to another origin.
 */
function admittedTargetOrigin(): string {
	const raw = (process.env.SONGHEALTH_T021_TARGET_ORIGIN ?? "").trim();
	const portMatch = /^http:\/\/127\.0\.0\.1:([0-9]+)$/.exec(raw);
	const port = portMatch === null ? NaN : Number(portMatch[1]);
	if (
		portMatch === null ||
		portMatch[1].length > 5 ||
		(portMatch[1].length > 1 && portMatch[1].startsWith("0")) ||
		port > 65535 ||
		port === 4322
	) {
		throw new Error(
			"t022-native-ui: SONGHEALTH_T021_TARGET_ORIGIN must name the admitted disposable loopback origin with a canonical numeric port (never the persistent shared origin 4322)",
		);
	}
	return raw;
}

test.beforeEach(async ({ page }) => {
	const origin = admittedTargetOrigin();
	// Native locale selection through the documented cookie
	// (`emdash-locale=th; Path=/_emdash`), host-scoped to the admitted origin.
	await page.context().addCookies([
		{ name: "emdash-locale", value: "th", url: `${origin}/` },
	]);
});

test("unauthenticated Admin boundary renders the native sign-in copy", async ({ page }) => {
	await page.goto(`${admittedTargetOrigin()}/_emdash/admin`, {
		waitUntil: "domcontentloaded",
	});
	// The platform's own mount signal: the boot loader is removed when the
	// Admin app mounts and the login UI renders with it (pinned
	// @emdash-cms/admin 1.1.0 dist behavior, as observed by T031/T032).
	await page
		.locator("#emdash-boot-loader")
		.waitFor({ state: "detached", timeout: 20_000 });
	await expect(page.getByText(PASSKEY_SIGNIN_COPY).first()).toBeVisible();
});

test("no authenticated surface exists without a session", async ({ page }) => {
	await page.goto(`${admittedTargetOrigin()}/_emdash/admin`, {
		waitUntil: "domcontentloaded",
	});
	await page
		.locator("#emdash-boot-loader")
		.waitFor({ state: "detached", timeout: 20_000 });
	// The applied collections' Thai sidebar labels render only inside a real
	// authenticated session; the boundary must NOT leak them.
	await expect(
		page.getByRole("link", { name: AUTHENTICATED_SIDEBAR_LABEL }).first(),
	).toHaveCount(0);
});

test("the Thai locale cookie propagates on the admitted origin itself", async ({ page }) => {
	const response = await page.goto(`${admittedTargetOrigin()}/_emdash/admin`, {
		waitUntil: "domcontentloaded",
	});
	expect(response?.status()).toBe(200);
	// The T032 finding was cookie loss ACROSS hosts (127.0.0.1 -> localhost
	// redirect); on the single admitted host the document must stay Thai.
	await expect(page.locator("html")).toHaveAttribute("lang", "th");
});
