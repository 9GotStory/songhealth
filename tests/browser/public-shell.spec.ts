// Feature 003 site shell (#52): what a citizen sees around every public page.
//
// Authority: ticket #52 and spec #51 (Presentation; Testing Decisions, Seam A);
// `03` §2 (global navigation), `04` §4 and §16 (header, accessibility), ADR 0001.
//
// The suite drives the single development runtime over public HTTP, the way a
// citizen does, through the shared public-page harness (third-party request
// guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px mobile widths).
// It asserts what people see and use: text, links, the current-section mark,
// HTTP status and focus. It never asserts Tailwind classes or markup for its
// own sake.

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	loadDevAccessToken,
	nativeDataOf,
	NATIVE_ROLES,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticMedia,
	type CmsActor,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	test,
} from "./public.helpers";

/** The office's official name, fixed interface text in the utility bar. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The site title shown while the native site settings name none. */
const DEFAULT_SITE_TITLE = "สำนักงานสาธารณสุขอำเภอสอง";

/** The heading, and the page title, of the site-designed 404 page. */
const NOT_FOUND_HEADING = "ไม่พบหน้าที่คุณต้องการ";

/** `03` §2 main navigation, in order. */
const MAIN_NAVIGATION = [
	{ name: "หน้าแรก", href: "/" },
	{ name: "เกี่ยวกับเรา", href: "/about" },
	{ name: "ข่าวสาร", href: "/news" },
	{ name: "บริการประชาชน", href: "/services" },
	{ name: "ข้อมูลสุขภาพ", href: "/health" },
	{ name: "เอกสารเผยแพร่", href: "/documents" },
];

/** An address no page will ever have, optionally inside a section such as "/news". */
function unknownPath(within = ""): string {
	return `${within}/songhealth-unknown-${crypto.randomUUID()}`;
}

/** Open the mobile menu the way a citizen does: its button reads "เมนู". */
async function openMenu(page: Page): Promise<void> {
	await page.getByText("เมนู", { exact: true }).click();
}

test.use({ viewport: DESKTOP_VIEWPORT });

test("the Homepage carries the site shell: utility bar, main navigation and footer", async ({
	page,
}) => {
	const response = await page.goto("/");
	expect(response?.status(), "GET / must succeed").toBe(200);
	await expect(page.locator("html")).toHaveAttribute("lang", "th");

	const banner = page.getByRole("banner");
	await expect(banner.getByText(OFFICE_NAME)).toBeVisible();
	await expect(banner.getByRole("link", { name: "ค้นหา", exact: true })).toHaveAttribute(
		"href",
		"/search",
	);
	await expect(banner.getByRole("link", { name: "ติดต่อเรา", exact: true })).toHaveAttribute(
		"href",
		"/contact",
	);

	const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
	const links = navigation.getByRole("link");
	await expect(links).toHaveText(MAIN_NAVIGATION.map((item) => item.name));
	expect(await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")))).toEqual(
		MAIN_NAVIGATION.map((item) => item.href),
	);
	await expect(navigation.getByRole("link", { name: "หน้าแรก" })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await expect(
		navigation.locator("[aria-current]"),
		"only the current section is marked",
	).toHaveCount(1);

	const footer = page.getByRole("contentinfo");
	await expect(footer.getByRole("link", { name: "ติดต่อเรา", exact: true })).toHaveAttribute(
		"href",
		"/contact",
	);
});

test("an unknown address answers 404 with the site-designed page inside the shell", async ({
	page,
}) => {
	// A nested path inside a section: the 404 page still marks no section.
	const response = await page.goto(unknownPath("/news"));
	expect(response?.status(), "an unknown route must answer 404").toBe(404);
	await expect(page.locator("html")).toHaveAttribute("lang", "th");
	await expect(page).toHaveTitle(new RegExp(`^${NOT_FOUND_HEADING}`));

	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND_HEADING);
	await expect(main.getByRole("link", { name: "กลับไปหน้าแรก" })).toHaveAttribute("href", "/");
	await expect(main.getByRole("link", { name: "ค้นหาข้อมูล" })).toHaveAttribute("href", "/search");

	const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
	await expect(navigation.getByRole("link")).toHaveCount(MAIN_NAVIGATION.length);
	await expect(navigation.locator("[aria-current]"), "the 404 page marks no section").toHaveCount(
		0,
	);
	await expect(page.getByRole("contentinfo")).toBeVisible();
});

test.describe("at the 320 px mobile width without JavaScript", () => {
	test.use({ viewport: MOBILE_VIEWPORT, javaScriptEnabled: false });

	test("the main navigation opens from the menu, and no page scrolls sideways", async ({
		page,
	}) => {
		await page.goto("/");
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		await expect(navigation, "the menu starts closed").toBeHidden();
		await expect(
			page.getByRole("banner").getByRole("link", { name: "ค้นหา", exact: true }),
		).toBeVisible();
		await expectNoHorizontalScroll(page, "/ with the menu closed");

		await openMenu(page);
		const links = navigation.getByRole("link");
		await expect(links).toHaveText(MAIN_NAVIGATION.map((item) => item.name));
		await expect(navigation.getByRole("link", { name: "หน้าแรก" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expectNoHorizontalScroll(page, "/ with the menu open");

		await navigation.getByRole("link", { name: "เอกสารเผยแพร่" }).click();
		await expect(page).toHaveURL(/\/documents$/);

		await page.goto(unknownPath());
		await expectNoHorizontalScroll(page, "the 404 page");
	});
});

test.describe("keyboard", () => {
	test("the skip link is the first stop and moves focus to the main content", async ({ page }) => {
		await page.goto("/");
		await page.keyboard.press("Tab");
		const skipLink = page.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" });
		await expect(skipLink).toBeFocused();
		await expect(skipLink).toBeInViewport();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("main")).toBeFocused();
	});

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`focus is always visible at the ${width} width`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto("/");
			await expectVisibleFocusOnEveryStop(page, `/ at ${width}`);

			await page.goto(unknownPath());
			if (width === "mobile") {
				// With the menu open, the walk continues from the menu button through
				// the navigation into the page: nothing it opens may cover the page.
				await openMenu(page);
			}
			await expectVisibleFocusOnEveryStop(page, `the 404 page at ${width}`);
		});
	}
});

for (const [width, viewport] of Object.entries(VIEWPORTS)) {
	test(`axe reports no WCAG 2.2 AA violation on / and the 404 page at the ${width} width`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await page.goto("/");
		await expectNoAxeViolations(page, `/ at ${width}`);
		if (width === "mobile") {
			await openMenu(page);
			await expectNoAxeViolations(page, `/ at ${width} with the menu open`);
		}

		const response = await page.goto(unknownPath());
		expect(response?.status()).toBe(404);
		await expectNoAxeViolations(page, `the 404 page at ${width}`);
	});
}

test("Noto Sans Thai comes from the site's own origin, in four weights, with font-display swap", async ({
	page,
	baseURL,
}) => {
	const fontRequests: string[] = [];
	page.on("request", (request) => {
		if (request.resourceType() === "font") fontRequests.push(request.url());
	});
	await page.goto("/");
	// The faces of the family the page text is set in. Astro's Fonts API makes
	// the family name unique, "Noto Sans Thai-<hash>" (astro 7.3.5
	// dist/assets/fonts/core/resolve-family.js, `uniqueName`), so a copy
	// installed on the visitor's device can never stand in for the site's files.
	const { family, faces } = await page.evaluate(async () => {
		await document.fonts.ready;
		const primary = getComputedStyle(document.body)
			.fontFamily.split(",")[0]
			.trim()
			.replaceAll('"', "");
		return {
			family: primary,
			faces: [...document.fonts]
				.filter((face) => face.family.replaceAll('"', "") === primary)
				.map((face) => ({ weight: face.weight, display: face.display, status: face.status })),
		};
	});
	expect(family, "the page text is set in Noto Sans Thai").toMatch(/^Noto Sans Thai(?:-\w+)?$/);
	expect(faces.map((face) => face.weight).sort()).toEqual(["400", "500", "600", "700"]);
	expect(
		faces.every((face) => face.display === "swap"),
		"every face uses font-display: swap",
	).toBe(true);
	expect(faces.find((face) => face.weight === "400")?.status, "body text loads its face").toBe(
		"loaded",
	);

	expect(fontRequests.length, "the page loads its font files").toBeGreaterThan(0);
	const siteOrigin = new URL(baseURL ?? "").origin;
	for (const url of fontRequests) {
		expect(new URL(url).origin, `${url} must come from the site itself`).toBe(siteOrigin);
	}
});

/**
 * The scripts `astro dev` adds to every page for hot reloading: Vite's client
 * and one module per stylesheet. A production page carries none of them.
 */
const DEV_SERVER_SCRIPT_SRC = /^\/@vite\/client$|\.css(\?url)?$/;

test("the shell adds no client JavaScript", async ({ page }) => {
	for (const path of ["/", unknownPath()]) {
		const response = await page.goto(path);
		const html = (await response?.text()) ?? "";
		const pageScripts = [...html.matchAll(/<script\b[^>]*>/gi)]
			.map((match) => match[0])
			.filter((tag) => {
				const type = /\btype="([^"]*)"/i.exec(tag)?.[1] ?? "";
				// Scripts of a non-JavaScript type, such as JSON-LD, are data.
				if (type !== "" && type !== "module" && !/javascript/i.test(type)) return false;
				const src = /\bsrc="([^"]*)"/i.exec(tag)?.[1];
				return src === undefined || !DEV_SERVER_SCRIPT_SRC.test(src);
			});
		expect(pageScripts, `${path} must not run page JavaScript`).toEqual([]);
	}
});

test.describe("site identity from the native site settings", () => {
	interface SiteSettingsView {
		title?: string;
		tagline?: string;
		logo?: { mediaId: string; alt?: string; url?: string };
		seo?: { titleSeparator?: string };
	}

	async function writeSettings(
		admin: CmsActor,
		update: Record<string, unknown>,
	): Promise<SiteSettingsView> {
		const result = await cmsRequest(admin, "/_emdash/api/settings", {
			method: "POST",
			body: update,
		});
		expect(result.ok, `the native settings update must succeed (status ${result.status})`).toBe(
			true,
		);
		return nativeDataOf(result) as SiteSettingsView;
	}

	test("the header, footer and page titles follow the settings, with the placeholder mark and the office name as fallbacks", async ({
		page,
		baseURL,
	}) => {
		const admin = await createPatActor({
			baseUrl: baseURL,
			token: await loadDevAccessToken(),
			expected: { role: NATIVE_ROLES.administrator },
		});
		const saved = await cmsRequest(admin, "/_emdash/api/settings");
		expect(saved.ok, "the native settings read must succeed").toBe(true);
		const before = (nativeDataOf(saved) ?? {}) as SiteSettingsView;
		const marker = crypto.randomUUID().slice(0, 8);
		const title = `${SYNTHETIC_FIXTURE_MARK} ชื่อเว็บไซต์ ${marker}`;
		const tagline = `${SYNTHETIC_FIXTURE_MARK} คำโปรย ${marker}`;
		try {
			const media = await uploadSyntheticMedia(admin);
			expect(media.mediaId, "the synthetic logo must upload").toBeDefined();
			const written = await writeSettings(admin, {
				title,
				tagline,
				logo: { mediaId: media.mediaId },
				seo: { titleSeparator: " — " },
			});
			expect(written.logo?.url, "the native settings resolve the logo URL").toBeTruthy();

			await page.goto("/");
			const identity = page.getByRole("banner").getByRole("link", { name: title });
			await expect(identity).toHaveAttribute("href", "/");
			await expect(identity).toContainText(tagline);
			await expect(identity.locator("img")).toHaveAttribute("src", written.logo!.url!);
			await expect(identity.getByTestId("placeholder-mark")).toHaveCount(0);
			await expect(page.getByRole("contentinfo")).toContainText(title);
			await expect(page).toHaveTitle(title);
			await page.goto(unknownPath());
			await expect(page).toHaveTitle(`${NOT_FOUND_HEADING} — ${title}`);

			// Nothing set: the placeholder mark, the office name and "|" stand in.
			await writeSettings(admin, {
				title: "",
				tagline: "",
				logo: null,
				seo: { titleSeparator: "" },
			});
			await page.goto("/");
			const fallback = page.getByRole("banner").getByRole("link", { name: DEFAULT_SITE_TITLE });
			await expect(fallback).toHaveAttribute("href", "/");
			await expect(fallback.getByTestId("placeholder-mark")).toBeVisible();
			await expect(fallback.locator("img")).toHaveCount(0);
			await expect(page.getByRole("banner")).not.toContainText(tagline);
			await expect(page).toHaveTitle(DEFAULT_SITE_TITLE);
			await page.goto(unknownPath());
			await expect(page).toHaveTitle(`${NOT_FOUND_HEADING} | ${DEFAULT_SITE_TITLE}`);
		} finally {
			// Restore what was there. The native API cannot delete a title, tagline
			// or separator, so an unset one is restored as empty, which renders the same.
			await writeSettings(admin, {
				title: before.title ?? "",
				tagline: before.tagline ?? "",
				logo:
					before.logo === undefined ? null : { mediaId: before.logo.mediaId, alt: before.logo.alt },
				seo: { titleSeparator: before.seo?.titleSeparator ?? "" },
			});
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			expect(report.complete, "the synthetic logo must be removed").toBe(true);
		}
	});
});
