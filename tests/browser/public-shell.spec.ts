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

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	loadDevAccessToken,
	nativeDataOf,
	NATIVE_ROLES,
	uploadSyntheticMedia,
	type CmsActor,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	test,
} from "./public.helpers";

/** The office's official name, fixed interface text in the utility bar. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The site title shown while the native site settings name none. */
const DEFAULT_SITE_TITLE = "สำนักงานสาธารณสุขอำเภอสอง";

/** `03` §2 main navigation, in order. */
const MAIN_NAVIGATION = [
	{ name: "หน้าแรก", href: "/" },
	{ name: "เกี่ยวกับเรา", href: "/about" },
	{ name: "ข่าวสาร", href: "/news" },
	{ name: "บริการประชาชน", href: "/services" },
	{ name: "ข้อมูลสุขภาพ", href: "/health" },
	{ name: "เอกสารเผยแพร่", href: "/documents" },
];

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
	await expect(navigation.locator("[aria-current]"), "only the current section is marked").toHaveCount(1);

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
	const response = await page.goto(`/news/songhealth-f003-unknown-${crypto.randomUUID()}`);
	expect(response?.status(), "an unknown route must answer 404").toBe(404);
	await expect(page.locator("html")).toHaveAttribute("lang", "th");
	await expect(page).toHaveTitle(/^ไม่พบหน้าที่คุณต้องการ/);

	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText("ไม่พบหน้าที่คุณต้องการ");
	await expect(main.getByRole("link", { name: "กลับไปหน้าแรก" })).toHaveAttribute("href", "/");
	await expect(main.getByRole("link", { name: "ค้นหาข้อมูล" })).toHaveAttribute("href", "/search");

	const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
	await expect(navigation.getByRole("link")).toHaveCount(MAIN_NAVIGATION.length);
	await expect(navigation.locator("[aria-current]"), "the 404 page marks no section").toHaveCount(0);
	await expect(page.getByRole("contentinfo")).toBeVisible();
});

test.describe("at the 320 px mobile width without JavaScript", () => {
	test.use({ viewport: MOBILE_VIEWPORT, javaScriptEnabled: false });

	test("the main navigation opens from the menu, and no page scrolls sideways", async ({ page }) => {
		await page.goto("/");
		const navigation = page.getByRole("navigation", { name: "เมนูหลัก" });
		await expect(navigation, "the menu starts closed").toBeHidden();
		await expect(page.getByRole("banner").getByRole("link", { name: "ค้นหา", exact: true })).toBeVisible();
		await expectNoHorizontalScroll(page, "/ with the menu closed");

		await page.getByText("เมนู", { exact: true }).click();
		const links = navigation.getByRole("link");
		await expect(links).toHaveText(MAIN_NAVIGATION.map((item) => item.name));
		await expect(navigation.getByRole("link", { name: "หน้าแรก" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expectNoHorizontalScroll(page, "/ with the menu open");

		await navigation.getByRole("link", { name: "เอกสารเผยแพร่" }).click();
		await expect(page).toHaveURL(/\/documents$/);

		await page.goto(`/songhealth-f003-unknown-${crypto.randomUUID()}`);
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

			await page.goto(`/songhealth-f003-unknown-${crypto.randomUUID()}`);
			if (width === "mobile") {
				// With the menu open, the walk continues from the menu button through
				// the navigation into the page: nothing it opens may cover the page.
				await page.getByText("เมนู", { exact: true }).click();
			}
			await expectVisibleFocusOnEveryStop(page, `the 404 page at ${width}`);
		});
	}
});

test.describe("site identity from the native site settings", () => {
	interface SiteSettingsView {
		title?: string;
		tagline?: string;
		logo?: { mediaId: string; alt?: string; url?: string };
	}

	async function writeSettings(
		admin: CmsActor,
		update: Record<string, unknown>,
	): Promise<SiteSettingsView> {
		const result = await cmsRequest(admin, "/_emdash/api/settings", { method: "POST", body: update });
		expect(result.ok, `the native settings update must succeed (status ${result.status})`).toBe(true);
		return nativeDataOf(result) as SiteSettingsView;
	}

	test("the header and footer show the title, tagline and logo, falling back to the placeholder mark", async ({
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
		const title = `songhealth-f003-synthetic ชื่อเว็บไซต์ ${marker}`;
		const tagline = `songhealth-f003-synthetic คำโปรย ${marker}`;
		try {
			const media = await uploadSyntheticMedia(admin);
			expect(media.mediaId, "the synthetic logo must upload").toBeDefined();
			const written = await writeSettings(admin, { title, tagline, logo: { mediaId: media.mediaId } });
			expect(written.logo?.url, "the native settings resolve the logo URL").toBeTruthy();

			await page.goto("/");
			const identity = page.getByRole("banner").getByRole("link", { name: title });
			await expect(identity).toHaveAttribute("href", "/");
			await expect(identity).toContainText(tagline);
			await expect(identity.locator("img")).toHaveAttribute("src", written.logo!.url!);
			await expect(identity.getByTestId("placeholder-mark")).toHaveCount(0);
			await expect(page.getByRole("contentinfo")).toContainText(title);
			await expect(page).toHaveTitle(title);

			// No logo, title or tagline: the placeholder mark and the default title stand in.
			await writeSettings(admin, { title: "", tagline: "", logo: null });
			await page.reload();
			const fallback = page.getByRole("banner").getByRole("link", { name: DEFAULT_SITE_TITLE });
			await expect(fallback).toHaveAttribute("href", "/");
			await expect(fallback.getByTestId("placeholder-mark")).toBeVisible();
			await expect(fallback.locator("img")).toHaveCount(0);
			await expect(page.getByRole("banner")).not.toContainText(tagline);
			await expect(page).toHaveTitle(DEFAULT_SITE_TITLE);
		} finally {
			// Restore what was there. The native API cannot delete a title or
			// tagline, so an unset one is restored as empty, which renders the same.
			await writeSettings(admin, {
				title: before.title ?? "",
				tagline: before.tagline ?? "",
				logo: before.logo === undefined ? null : { mediaId: before.logo.mediaId, alt: before.logo.alt },
			});
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			expect(report.complete, "the synthetic logo must be removed").toBe(true);
		}
	});
});
