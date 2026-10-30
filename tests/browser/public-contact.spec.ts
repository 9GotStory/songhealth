// The Contact page and the footer's official channels (#62; spec #51 "Public reads" (Contact),
// "Maps" and "Office Contact plugin", `01` §10, `03` §12).
//
// A citizen reaches the office from /contact: the Office Contact staff saved in the Office Contact
// plugin's settings (address with an "เปิดแผนที่" link built from the coordinates, telephone,
// email, opening hours), the official channels (the native `social` settings and LINE), a
// complaint and feedback call to action that leads to the Service catalog, and a pointer to the
// Health Service Directory for facility contacts. Every page's footer shows the official channels
// that are set. An empty value leaves its line out, and /contact still answers with nothing set.
// No map is embedded: the map link opens a new tab with rel="noopener".
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). It saves synthetic Office Contact values and `social` handles through the native
// settings APIs, the way the Admin saves them, and restores what was there afterwards
// (cms.helpers.ts showOfficeContact says what the native API cannot restore).

import type { Page } from "@playwright/test";

import {
	devAdminActor,
	showOfficeContact,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type OfficeContactValues,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	detailOf,
	expect,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	test,
} from "./public.helpers";

const CONTACT_TITLE = "ติดต่อเรา";
const CHANNELS_HEADING = "ช่องทางทางการ";

let admin: CmsActor;

/** Run `body` with exactly `values` as Office Contact and `social` as the only handles, then restore. */
async function withContact(
	values: OfficeContactValues,
	social: Record<string, string>,
	body: () => Promise<void>,
): Promise<void> {
	const restore = await showOfficeContact(admin, values, social);
	try {
		await body();
	} finally {
		await restore();
	}
}

/** A full synthetic Office Contact and two `social` handles, unique to this run. */
function syntheticContact(): {
	values: OfficeContactValues;
	social: Record<string, string>;
	marker: string;
} {
	const marker = crypto.randomUUID().slice(0, 8);
	return {
		marker,
		values: {
			address: `${SYNTHETIC_FIXTURE_MARK} 123 หมู่ 1 ${marker}\nอำเภอสอง จังหวัดแพร่ 54120`,
			telephone: "054 591 234",
			email: `contact-${marker}@example.invalid`,
			opening_hours: `จันทร์–ศุกร์ 08:30–16:30 น. ${marker}`,
			latitude: 18.4686,
			longitude: 100.1834,
			line_url: `https://lin.ee/${marker}`,
		},
		social: { facebook: `songhealth.${marker}`, youtube: `@songhealth${marker}` },
	};
}

/** The official channel links /contact (`main`) or the footer (`contentinfo`) shows. */
function channelLinks(page: Page, scope: "main" | "contentinfo") {
	return page.getByRole(scope).getByRole("list", { name: CHANNELS_HEADING }).getByRole("link");
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
});

test("/contact shows the Office Contact saved in the plugin settings, with a map link built from its coordinates", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withContact(values, social, async () => {
		const response = await page.goto("/contact");
		expect(response?.status(), "GET /contact").toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(CONTACT_TITLE);
		await expectBreadcrumb(page, [HOME_CRUMB], CONTACT_TITLE);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			"href",
			`${new URL(page.url()).origin}/contact`,
		);

		const location = detailOf(page, "ที่ตั้ง");
		await expect(location).toContainText(String(values.address).split("\n")[0]!);
		await expect(location).toContainText("อำเภอสอง จังหวัดแพร่ 54120");
		const map = location.getByRole("link", { name: "เปิดแผนที่ (เปิดในแท็บใหม่)" });
		await expect(map).toHaveAttribute(
			"href",
			"https://www.google.com/maps/search/?api=1&query=18.4686%2C100.1834",
		);
		await expect(map).toHaveAttribute("target", "_blank");
		await expect(map).toHaveAttribute("rel", "noopener");
		await expect(page.locator("iframe, embed, object"), "no map is embedded").toHaveCount(0);

		await expect(
			detailOf(page, "โทรศัพท์").getByRole("link", { name: "054 591 234" }),
		).toHaveAttribute("href", "tel:054591234");
		await expect(
			detailOf(page, "อีเมล").getByRole("link", { name: String(values.email) }),
		).toHaveAttribute("href", `mailto:${values.email}`);
		await expect(detailOf(page, "เวลาทำการ")).toHaveText(String(values.opening_hours));
	});
});

test("/contact and the footer of every page link the official channels that are set, each in a new tab", async ({
	page,
}) => {
	const { values, social, marker } = syntheticContact();
	const expected = [
		["Facebook (เว็บไซต์ภายนอก) (เปิดในแท็บใหม่)", `https://www.facebook.com/songhealth.${marker}`],
		["LINE (เว็บไซต์ภายนอก) (เปิดในแท็บใหม่)", `https://lin.ee/${marker}`],
		["YouTube (เว็บไซต์ภายนอก) (เปิดในแท็บใหม่)", `https://www.youtube.com/@songhealth${marker}`],
	];
	await withContact(values, social, async () => {
		await page.goto("/contact");
		await expect(page.getByRole("heading", { level: 2, name: CHANNELS_HEADING })).toBeVisible();
		for (const scope of ["main", "contentinfo"] as const) {
			const links = channelLinks(page, scope);
			await expect(links).toHaveCount(expected.length);
			for (const [index, [name, href]] of expected.entries()) {
				await expect(links.nth(index), `${scope}: ${name}`).toHaveAccessibleName(name);
				await expect(links.nth(index)).toHaveAttribute("href", href);
				await expect(links.nth(index)).toHaveAttribute("target", "_blank");
				await expect(links.nth(index)).toHaveAttribute("rel", "noopener");
			}
		}

		await page.goto("/");
		await expect(channelLinks(page, "contentinfo"), "the Homepage footer").toHaveCount(
			expected.length,
		);
	});
});

test("an empty value leaves its line out, and /contact still answers with no Office Contact set", async ({
	page,
}) => {
	// Only a telephone number that is not one number, and a latitude without its longitude.
	await withContact({ telephone: "054 591 234 ต่อ 12", latitude: 18.4686 }, {}, async () => {
		await page.goto("/contact");
		await expect(page.getByRole("main").getByRole("term")).toHaveText(["โทรศัพท์"]);
		await expect(detailOf(page, "โทรศัพท์")).toHaveText("054 591 234 ต่อ 12");
		await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
		await expect(page.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
	});

	await withContact({}, {}, async () => {
		const response = await page.goto("/contact");
		expect(response?.status(), "GET /contact with nothing set").toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(CONTACT_TITLE);
		await expect(page.getByRole("main").getByRole("term")).toHaveCount(0);
		await expect(page.getByRole("heading", { name: CHANNELS_HEADING })).toHaveCount(0);
		await expect(page.getByRole("list", { name: CHANNELS_HEADING })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "ดูบริการประชาชน" })).toBeVisible();
	});
});

test("the complaint and feedback call to action leads to the Service catalog, and facility contacts to the Health Service Directory", async ({
	page,
}) => {
	await page.goto("/contact");
	const complaints = page.getByRole("region", { name: "ร้องเรียนและเสนอแนะ" });
	await expect(complaints.getByRole("link", { name: "ดูบริการประชาชน" })).toHaveAttribute(
		"href",
		"/services",
	);
	const facilities = page.getByRole("region", { name: "ติดต่อหน่วยบริการสุขภาพ" });
	await expect(
		facilities.getByRole("link", { name: "ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง" }),
	).toHaveAttribute("href", "/health-services");

	await complaints.getByRole("link", { name: "ดูบริการประชาชน" }).click();
	await expect(page).toHaveURL("/services");
});

test.describe("accessibility and reflow", () => {
	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on /contact at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			const check = async (label: string) => {
				const response = await page.goto("/contact");
				expect(response?.status(), `GET /contact ${label}`).toBe(200);
				await expectNoAxeViolations(page, `/contact ${label} at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `/contact ${label} at ${width}`);
			};
			const { values, social } = syntheticContact();
			await withContact(values, social, () => check("with Office Contact set"));
			await withContact({}, {}, () => check("with nothing set"));
		});
	}

	test("/contact does not scroll sideways at 320 px, even with a long email address", async ({
		page,
	}) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		const { values, social } = syntheticContact();
		const email = `songhealth-district-public-health-office-${crypto.randomUUID()}@example.invalid`;
		await withContact({ ...values, email }, social, async () => {
			await page.goto("/contact");
			await expectNoHorizontalScroll(page, "/contact");
		});
	});
});
