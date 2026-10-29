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

import { DESKTOP_VIEWPORT, expect, test } from "./public.helpers";

/** The office's official name, fixed interface text in the utility bar. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

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
