// Feature 003 site shell (#52): what a citizen sees around every public page.
//
// Authority: ticket #52 and spec #51 (Presentation; Testing Decisions, Seam A);
// `03` §2 (global navigation), `04` §4 and §16 (header, accessibility), ADR 0001.
// Compact Header B: #191; spec #190 and PO comment 6707205912.
// The new shell: #240; spec #239 "Header (every page)", "Footer (every page)" and "Accessibility";
// PO, #239 comment 6786536858 (the search link, no utility bar).
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
	devAdminActor,
	nativeDataOf,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticMedia,
	writeSiteSettings,
	type CmsActor,
} from "./cms.helpers";
import {
	boxOf,
	DEFAULT_SITE_TITLE,
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	NOT_FOUND_HEADING,
	PHONE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	test,
	tokenColor,
} from "./public.helpers";

/** The office's official name, which the utility bar showed until #240 removed the bar. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The footer's line under the site title (spec #239 "Footer (every page)"). */
const FOOTER_AFFILIATION = "จังหวัดแพร่ · กระทรวงสาธารณสุข";

/** The header's identity, the logo and the site title: its first link to the Homepage. */
const IDENTITY_LINK = 'a[href="/"]';

/** An inner page, which carries the same shell as the Homepage. */
const INNER_PAGE = "/news";

/** `03` §2 main navigation, in order, with ITA last (#124; spec #121 "Public routes"). */
const MAIN_NAVIGATION = [
	{ name: "หน้าแรก", href: "/" },
	{ name: "เกี่ยวกับเรา", href: "/about" },
	{ name: "ข่าวสาร", href: "/news" },
	{ name: "บริการประชาชน", href: "/services" },
	{ name: "ข้อมูลสุขภาพ", href: "/health" },
	{ name: "เอกสารเผยแพร่", href: "/documents" },
	{ name: "ITA", href: "/ita" },
];

/** An address no page will ever have, optionally inside a section such as "/news". */
function unknownPath(within = ""): string {
	return `${within}/songhealth-unknown-${crypto.randomUUID()}`;
}

/** Open the compact menu by its accessible name (#191). */
async function openMenu(page: Page): Promise<void> {
	await page.locator("summary").filter({ hasText: "เปิดเมนู" }).click();
}

test.use({ viewport: DESKTOP_VIEWPORT });

test("the Homepage and an inner page carry the shell: the search link, the main navigation and the footer, with no utility bar", async ({
	page,
}) => {
	for (const [path, current] of [
		["/", "หน้าแรก"],
		[INNER_PAGE, "ข่าวสาร"],
	]) {
		const response = await page.goto(path);
		expect(response?.status(), `GET ${path} must succeed`).toBe(200);
		await expect(page.locator("html")).toHaveAttribute("lang", "th");

		const banner = page.getByRole("banner");
		await expect(banner.getByRole("link", { name: "ค้นหา", exact: true })).toHaveAttribute(
			"href",
			"/search",
		);

		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		const links = navigation.getByRole("link");
		await expect(links).toHaveText(MAIN_NAVIGATION.map((item) => item.name));
		expect(
			await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href"))),
		).toEqual(MAIN_NAVIGATION.map((item) => item.href));
		await expect(navigation.getByRole("link", { name: current })).toHaveAttribute(
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

		await expect(banner.getByText(OFFICE_NAME), `${path} shows no utility bar`).toHaveCount(0);
		await expect(
			banner.locator('a[href="/contact"]'),
			`no header link on ${path} goes to /contact`,
		).toHaveCount(0);
	}
	await page.goto("/");
	await expect(
		page.getByRole("navigation", { name: "เส้นทางนำทาง" }),
		"the Homepage has no breadcrumb",
	).toHaveCount(0);
});

test("the footer shows the site title, the official channels, the policy pages and the contact link", async ({
	page,
}) => {
	for (const path of ["/", INNER_PAGE]) {
		await page.goto(path);
		const footer = page.getByRole("contentinfo");
		const title = await page.getByRole("banner").locator(IDENTITY_LINK).first().innerText();
		await expect(footer).toContainText(title.split("\n")[0]);
		const channels = footer.getByRole("list", { name: "ช่องทางทางการ" }).getByRole("link");
		expect(await channels.count(), "the runtime's Office Contact sets channels").toBeGreaterThan(0);
		for (const channel of await channels.all()) {
			await expect(channel).toHaveAttribute("target", "_blank");
			await expect(channel).toHaveAccessibleName(/\(เว็บไซต์ภายนอก\) \(เปิดในแท็บใหม่\)$/);
		}
		const pageLinks = footer.getByRole("navigation", { name: "ลิงก์ท้ายหน้า" }).getByRole("link");
		await expect(pageLinks.last()).toHaveText("ติดต่อเรา");
		await expect(pageLinks.last()).toHaveAttribute("href", "/contact");
		await expect(footer.getByText(FOOTER_AFFILIATION, { exact: true })).toBeVisible();
		await expect(footer.getByText(OFFICE_NAME, { exact: true })).toHaveCount(0);
	}
});

for (const width of [375, 1440]) {
	test(`the header stays at the top of the window while the page scrolls, at ${width} px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		for (const path of ["/", INNER_PAGE]) {
			await page.goto(path);
			const banner = page.getByRole("banner");
			expect((await banner.boundingBox())?.y, `${path} before scrolling`).toBe(0);
			await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
			expect(
				await page.evaluate(() => window.scrollY),
				`${path} is taller than the window`,
			).toBeGreaterThan(900);
			expect((await banner.boundingBox())?.y, `${path} scrolled to its end`).toBe(0);
			await expect(banner.getByRole("link", { name: "ค้นหา", exact: true })).toBeInViewport();
		}
	});
}

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
	await expect(
		page.getByRole("navigation", { name: "เส้นทางนำทาง" }),
		"the 404 page has no breadcrumb",
	).toHaveCount(0);
	await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("below 1024 px one 48 px icon-only menu button opens the same items as full-width rows", async ({
	page,
}) => {
	for (const width of [320, 375, 768, 1023]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/");
		const control = page.locator("summary").filter({ hasText: "เปิดเมนู" });
		await expect(control).toBeVisible();
		const box = await control.boundingBox();
		expect(box?.width).toBe(48);
		expect(box?.height).toBe(48);
		const label = control.getByText("เปิดเมนู", { exact: true });
		const labelBox = await label.boundingBox();
		expect(labelBox?.width, "the accessible label is visually clipped").toBe(1);
		expect(labelBox?.height).toBe(1);
		await expect(control).toHaveAccessibleName("เปิดเมนู");
		await expect(control.locator("svg").nth(0)).toBeVisible();
		await expect(control.locator("svg").nth(1)).toBeHidden();
		await expect(control.locator("..")).not.toHaveAttribute("open");
		await control.focus();
		await page.keyboard.press("Enter");
		const close = page.locator("summary").filter({ hasText: "ปิดเมนู" });
		await expect(close).toHaveAccessibleName("ปิดเมนู");
		await expect(close.locator("svg").nth(0)).toBeHidden();
		await expect(close.locator("svg").nth(1)).toBeVisible();
		await expect(close.locator("..")).toHaveAttribute("open", "");
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		await expect(navigation).toBeVisible();
		await expect(navigation.getByRole("link")).toHaveText(MAIN_NAVIGATION.map((item) => item.name));
		const panel = await boxOf(navigation, `the open panel at ${width} px`);
		let above = panel.y;
		for (const link of await navigation.getByRole("link").all()) {
			const row = await boxOf(link, `a menu row at ${width} px`);
			expect(row.y, "each row sits below the one before it").toBeGreaterThanOrEqual(above);
			expect(row.width, `a row spans the panel at ${width} px`).toBeGreaterThanOrEqual(
				panel.width - 2 * 24,
			);
			above = row.y + row.height;
		}
		await page.keyboard.press("Space");
		await expect(control).toBeFocused();
		await expect(page.getByRole("navigation", { name: "เมนูหลัก" })).toBeHidden();
	}
});

test("the search link is a 44 px target inside the window at every width, and the header changes at 1024 px", async ({
	page,
}) => {
	for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/");
		const banner = page.getByRole("banner");
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		const search = banner.getByRole("link", { name: "ค้นหา", exact: true });
		const searchBox = await boxOf(search, `the search link at ${width} px`);
		expect(searchBox.height, `search target at ${width} px`).toBeGreaterThanOrEqual(44);
		if (width < 1024) {
			await expect(navigation).toBeHidden();
			await expect(banner.locator("summary")).toBeVisible();
		} else {
			await expect(banner.locator("summary")).toBeHidden();
			await expect(navigation.getByRole("link")).toHaveText(
				MAIN_NAVIGATION.map((item) => item.name),
			);
			await expect(navigation.getByRole("link", { name: "หน้าแรก" })).toHaveAttribute(
				"aria-current",
				"page",
			);
		}
		await expectNoHorizontalScroll(page, `header at ${width} px`);
		expect(searchBox.width, `search target at ${width} px`).toBeGreaterThanOrEqual(44);
		expect(searchBox.x + searchBox.width, `search link at ${width} px`).toBeLessThanOrEqual(width);
		await search.click();
		await expect(page).toHaveURL(/\/search$/);
	}
});

test("from 1024 px the header is one row, and the current item is a soft green pill", async ({
	page,
}) => {
	for (const width of [1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(INNER_PAGE);
		const banner = page.getByRole("banner");
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		const rows = await navigation
			.getByRole("link")
			.evaluateAll((anchors) => [...new Set(anchors.map((a) => a.getBoundingClientRect().y))]);
		expect(rows, `the navigation is one line at ${width} px`).toHaveLength(1);
		await expectNoHorizontalScroll(page, `header at ${width} px`);

		const header = await boxOf(banner, `the header at ${width} px`);
		const middle = header.y + header.height / 2;
		for (const [name, part] of [
			["the identity", banner.locator(IDENTITY_LINK).first()],
			["the navigation", navigation],
			["the search link", banner.getByRole("link", { name: "ค้นหา", exact: true })],
		] as const) {
			const box = await boxOf(part, `${name} at ${width} px`);
			expect(box.y, `${name} crosses the row's middle at ${width} px`).toBeLessThan(middle);
			expect(box.y + box.height, `${name} crosses the row's middle`).toBeGreaterThan(middle);
			expect(box.x + box.width, `${name} stays inside the window`).toBeLessThanOrEqual(width);
		}

		const current = navigation.getByRole("link", { name: "ข่าวสาร" });
		await expect(current).toHaveAttribute("aria-current", "page");
		const other = navigation.getByRole("link", { name: "เอกสารเผยแพร่" });
		await expect(other).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
		await expect(current).toHaveCSS("color", await tokenColor(page, "brand-primary"));
		await expect(current).toHaveCSS("background-color", await tokenColor(page, "surface-soft"));
		const pill = await boxOf(current, "the current item");
		const radius = await current.evaluate((a) =>
			Number.parseFloat(getComputedStyle(a).borderRadius),
		);
		expect(radius, "the current item's ends are round").toBeGreaterThanOrEqual(pill.height / 2);
	}
});

test("at 320 px the identity, the search link and the menu button share the row inside the window", async ({
	page,
}) => {
	await page.setViewportSize(MOBILE_VIEWPORT);
	await page.goto("/");
	const banner = page.getByRole("banner");
	const identity = await boxOf(banner.locator(IDENTITY_LINK).first(), "the identity");
	const menu = await boxOf(banner.locator("summary"), "the menu button");
	expect(identity.x).toBeGreaterThanOrEqual(0);
	expect(identity.x + identity.width, "the identity ends before the menu").toBeLessThanOrEqual(
		menu.x,
	);
	expect(menu.x + menu.width, "the menu button stays inside the window").toBeLessThanOrEqual(320);
	const search = await boxOf(
		banner.getByRole("link", { name: "ค้นหา", exact: true }),
		"the search link",
	);
	expect(
		identity.x + identity.width,
		"the identity ends before the search link",
	).toBeLessThanOrEqual(search.x);
	expect(search.x + search.width, "the search link ends before the menu").toBeLessThanOrEqual(
		menu.x,
	);
	expect(
		Math.abs(search.y + search.height / 2 - (menu.y + menu.height / 2)),
		"the two buttons sit on one line",
	).toBeLessThanOrEqual(1);
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

		const mainBefore = await page.getByRole("main").boundingBox();
		await openMenu(page);
		const mainAfter = await page.getByRole("main").boundingBox();
		const navBox = await navigation.boundingBox();
		expect(mainAfter!.y - mainBefore!.y).toBeCloseTo(navBox!.height, 0);
		await expect(page.locator("summary")).toHaveAccessibleName("ปิดเมนู");
		await page.locator("summary").focus();
		await page.keyboard.press("Space");
		await expect(navigation).toBeHidden();
		await expect(page.locator("summary")).toHaveAccessibleName("เปิดเมนู");
		expect((await page.getByRole("main").boundingBox())!.y).toBeCloseTo(mainBefore!.y, 0);
		await page.keyboard.press("Enter");
		await expect(navigation).toBeVisible();
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

for (const width of [375, 1023, 1024]) {
	test.describe(`at ${width} px`, () => {
		test.use({ viewport: { width, height: 900 } });
		test("navigation, focus and accessibility remain usable", async ({ page }) => {
			await page.goto("/");
			await expectNoAxeViolations(page, `header at ${width} px`);
			await expectVisibleFocusOnEveryStop(page, `header at ${width} px`);
			if (width < 1024) {
				await page.locator("summary").focus();
				await page.keyboard.press("Enter");
				await expect(page.locator("summary")).toHaveAccessibleName("ปิดเมนู");
				await expectNoAxeViolations(page, `open menu at ${width} px`);
				await expectVisibleFocusOnEveryStop(page, `open menu at ${width} px`);
			}
			await expectNoHorizontalScroll(page, `header at ${width} px`);
			const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
			await navigation.getByRole("link", { name: "เอกสารเผยแพร่" }).click();
			await expect(page).toHaveURL(/\/documents$/);
			if (width < 1024) await openMenu(page);
			await expect(navigation.getByRole("link", { name: "เอกสารเผยแพร่" })).toHaveAttribute(
				"aria-current",
				"page",
			);
		});
	});
}

test.describe("keyboard", () => {
	test("the skip link is the first stop and moves focus to the main content", async ({ page }) => {
		await page.goto("/");
		await page.keyboard.press("Tab");
		const skipLink = page.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" });
		await expect(skipLink).toBeFocused();
		await expect(skipLink).toBeInViewport();
		const header = await boxOf(page.getByRole("banner"), "the header");
		const shown = await boxOf(skipLink, "the skip link");
		await page.keyboard.press("Enter");
		await expect(page.getByRole("main")).toBeFocused();
		expect(shown.y, "the skip link shows below the header").toBeGreaterThanOrEqual(
			header.y + header.height,
		);
	});

	test("the Tab order follows the header's visual order, then the page", async ({ page }) => {
		const banner = page.getByRole("banner");
		const search = banner.getByRole("link", { name: "ค้นหา", exact: true });
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });

		await page.goto("/");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await expect(banner.locator(IDENTITY_LINK).first()).toBeFocused();
		for (const item of MAIN_NAVIGATION) {
			await page.keyboard.press("Tab");
			await expect(navigation.getByRole("link", { name: item.name, exact: true })).toBeFocused();
		}
		await page.keyboard.press("Tab");
		await expect(search).toBeFocused();

		await page.setViewportSize(PHONE_VIEWPORT);
		await page.goto("/");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await expect(banner.locator(IDENTITY_LINK).first()).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(search).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(banner.locator("summary")).toBeFocused();
		await page.keyboard.press("Tab");
		expect(
			await page.evaluate(() => document.querySelector("main")?.contains(document.activeElement)),
			"with the menu closed, the next stop is in the page",
		).toBe(true);
	});

	test("the focus ring is brand green on the light header and accent-warm on the deep footer", async ({
		page,
	}) => {
		await page.goto(INNER_PAGE);
		const contact = page
			.getByRole("contentinfo")
			.getByRole("link", { name: "ติดต่อเรา", exact: true });
		await contact.focus();
		await expect(contact).toHaveCSS("outline-color", await tokenColor(page, "accent-warm"));
		await expect(contact).toHaveCSS("outline-style", "solid");
		const search = page.getByRole("banner").getByRole("link", { name: "ค้นหา", exact: true });
		await search.focus();
		await expect(search).toHaveCSS("outline-style", "solid");
		await expect(search).toHaveCSS("outline-color", await tokenColor(page, "brand-primary"));
	});

	test("a stop reached backwards is not left under the header", async ({ page }) => {
		for (const viewport of [DESKTOP_VIEWPORT, PHONE_VIEWPORT]) {
			await page.setViewportSize(viewport);
			await page.goto(INNER_PAGE);
			await page.getByRole("contentinfo").getByRole("link").last().focus();
			const header = page.getByRole("banner");
			for (let step = 0; step < 12; step += 1) {
				await page.keyboard.press("Shift+Tab");
				const covered = await page.evaluate(() => {
					const element = document.activeElement!;
					if (document.querySelector("header")!.contains(element)) return false;
					const rect = element.getClientRects()[0] ?? element.getBoundingClientRect();
					const hit = document.elementFromPoint(
						rect.left + rect.width / 2,
						rect.top + rect.height / 2,
					);
					return hit === null || !element.contains(hit);
				});
				expect(covered, `stop ${step} back from the footer at ${viewport.width} px`).toBe(false);
			}
			await expect(header).toBeInViewport();
		}
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
		const result = await writeSiteSettings(admin, update);
		expect(result.ok, `the native settings update must succeed (status ${result.status})`).toBe(
			true,
		);
		return nativeDataOf(result) as SiteSettingsView;
	}

	test("the header, footer and page titles follow the settings, with the placeholder mark and the office name as fallbacks", async ({
		page,
	}) => {
		const admin = await devAdminActor();
		const saved = await cmsRequest(admin, "/_emdash/api/settings");
		expect(saved.ok, "the native settings read must succeed").toBe(true);
		const before = (nativeDataOf(saved) ?? {}) as SiteSettingsView;
		const marker = crypto.randomUUID().slice(0, 8);
		const title = `${SYNTHETIC_FIXTURE_MARK} ชื่อเว็บไซต์สำนักงานสาธารณสุขอำเภอสอง ${marker}`;
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
			for (const width of [320, 375, 639, 640, 1023, 1024]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto("/");
				await expect(identity).toHaveAccessibleName(`${title} ${tagline}`);
				await expect(identity).toContainText(tagline);
				await expect(identity.locator("img")).toBeVisible();
				await expectNoHorizontalScroll(page, `configured identity at ${width} px`);
				if (width < 1024) {
					const name = identity.getByText(title, { exact: true });
					await expect(name).toHaveCSS("font-size", width < 640 ? "16px" : "18px");
					const box = await identity.boundingBox();
					const search = await page
						.getByRole("banner")
						.getByRole("link", { name: "ค้นหา", exact: true })
						.boundingBox();
					expect(
						box!.x + box!.width,
						"identity leaves room for the search link and the menu",
					).toBeLessThanOrEqual(search!.x);
					if (width === 320) {
						const lineHeight = await name.evaluate((span) =>
							Number.parseFloat(getComputedStyle(span).lineHeight),
						);
						expect((await name.boundingBox())!.height, "the title wraps at 320 px").toBeGreaterThan(
							lineHeight,
						);
					}
				}
			}

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
			for (const width of [320, 375, 639, 640, 1023, 1024]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto("/");
				await expect(fallback).toBeVisible();
				await expectNoHorizontalScroll(page, `fallback identity at ${width} px`);
			}

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
