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

import type { Locator, Page } from "@playwright/test";

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
	expectFieldLinks,
	expectVisibleFocusOnEveryStop,
	LIST_FIELD_LOOK,
	listHeading,
	NOT_FOUND_CONTENT,
	NOT_FOUND_SENTENCE,
	partsOverFieldEdge,
	readHeaderMotion,
	readListField,
	readWholeAtTwoWidths,
	searchPath,
	searchPill,
	shownAddress,
	shownBox,
	siteIdentityLink,
	test,
	thaiWord,
	tokenColor,
} from "./public.helpers";

/** The office's official name, which no part of the shell shows. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The footer's line under the site title (spec #239 "Footer (every page)"). */
const FOOTER_AFFILIATION = "จังหวัดแพร่ · กระทรวงสาธารณสุข";

/** The page container's side gutter from 640 px, the wider of its two, in px. */
const WIDEST_GUTTER = 24;

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

test("the footer shows the site title, the official channels and its page links, ending in the contact link", async ({
	page,
}) => {
	for (const path of ["/", INNER_PAGE]) {
		await page.goto(path);
		const footer = page.getByRole("contentinfo");
		const title = await siteIdentityLink(page).innerText();
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
				`${path} scrolls further than the header is tall`,
			).toBeGreaterThan(200);
			expect((await banner.boundingBox())?.y, `${path} scrolled to its end`).toBe(0);
			await expect(banner.getByRole("link", { name: "ค้นหา", exact: true })).toBeInViewport();
		}
	});
}

test("an unknown address answers 404 with the site-designed page inside the shell: its title and H1 as before, no section marked, no breadcrumb, and in its main content the label ขออภัย, the H1, the sentence, the search pill and the links to the Homepage and to /contact, with no ค้นหาข้อมูล link", async ({
	page,
}) => {
	// A nested path inside a section: the 404 page still marks no section.
	const response = await page.goto(unknownPath("/news"));
	expect(response?.status(), "an unknown route must answer 404").toBe(404);
	await expect(page.locator("html")).toHaveAttribute("lang", "th");
	await expect(page).toHaveTitle(new RegExp(`^${NOT_FOUND_HEADING}`));

	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND_HEADING);
	await expect(main.getByText(NOT_FOUND_SENTENCE, { exact: true })).toBeVisible();

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
	// Spec #432 decision 5: the site search stands where the link to /search was.
	expect(
		{
			searchLink: await main.getByRole("link", { name: "ค้นหาข้อมูล" }).count(),
			content: await main.ariaSnapshot(),
		},
		"the 404 page's main content",
	).toEqual({ searchLink: 0, content: NOT_FOUND_CONTENT });
});

/** The 404 page's label above its H1 (spec #432 decision 11). */
const NOT_FOUND_LABEL = "ขออภัย";

/** The Homepage hero's placeholder, which the 404 page's search pill shows (spec #432). */
const HERO_PLACEHOLDER = "คุณกำลังมองหาอะไร?";

/** The parts of the 404 page on its deep field (spec #432 "The 404 page"). */
function notFoundParts(page: Page) {
	const heading = listHeading(page, { label: NOT_FOUND_LABEL, lead: NOT_FOUND_SENTENCE });
	return {
		...heading,
		tile: heading.field.locator("span:has(> svg.lucide-search-x)"),
		icon: heading.field.locator("span > svg.lucide-search-x"),
		pill: searchPill(page),
		home: heading.field.getByRole("link", { name: "กลับไปหน้าแรก", exact: true }),
		contact: heading.field.getByRole("link", { name: "ติดต่อเรา", exact: true }),
	};
}

/** How far, in px, `lower` starts below where `upper` ends, or "missing". */
async function gapBetween(upper: Locator[], lower: Locator): Promise<number | "missing"> {
	const boxes = await Promise.all([lower, ...upper].map(shownBox));
	if (!boxes.every(Boolean)) return "missing";
	const [low, ...ups] = boxes;
	return Math.round(low!.y - Math.max(...ups.map((box) => box!.y + box!.height)));
}

test.describe("the 404 page", () => {
	test("it opens on a list's deep field without a breadcrumb: the label ขออภัย, the H1 beside search-x in the accent-warm tile, the sentence at body-large 16 px under the heading, then the search pill and the links to the Homepage and to /contact, one under another 24 px apart below 640 px and 32 px from 640 px, every text in surface-base; no ค้นหาข้อมูล link, no button but the pill's and no 404 numeral", async ({
		page,
	}) => {
		await page.goto(unknownPath());
		const parts = notFoundParts(page);
		const [white, warm, dark] = await Promise.all(
			["surface-base", "accent-warm", "brand-dark"].map((name) => tokenColor(page, name)),
		);
		const colourOf = async (part: Locator) =>
			(await part.count()) === 1
				? part.evaluate((element) => getComputedStyle(element).color)
				: "missing";
		const seen: Record<string, unknown> = {
			tile:
				(await parts.tile.count()) === 1
					? {
							fill: await parts.tile.evaluate(
								(element) => getComputedStyle(element).backgroundColor,
							),
							icon: await colourOf(parts.icon),
							size: await parts.icon.evaluate((element) => {
								const box = element.getBoundingClientRect();
								return [Math.round(box.width), Math.round(box.height)];
							}),
						}
					: "missing",
			colours: {
				label: await colourOf(parts.label),
				title: await colourOf(parts.title),
				sentence: await colourOf(parts.lead),
				home: await colourOf(parts.home),
				contact: await colourOf(parts.contact),
			},
			sentenceSize:
				(await parts.lead.count()) === 1
					? await parts.lead.evaluate((element) => getComputedStyle(element).fontSize)
					: "missing",
			fieldLinks: await parts.field
				.getByRole("link")
				.evaluateAll((links) =>
					links.map((link) => [link.textContent?.trim(), link.getAttribute("href")]),
				),
			fieldButtons: await parts.field.getByRole("button").allTextContents(),
			// Today's buttons were pills; the links on the field have no fill and no edge.
			linkFills: await parts.field
				.getByRole("link")
				.evaluateAll((links) =>
					links.map((link) => [
						getComputedStyle(link).backgroundColor,
						getComputedStyle(link).borderTopWidth,
					]),
				),
			numeral: (await page.getByRole("main").innerText()).includes("404"),
		};
		const expected: Record<string, unknown> = {
			tile: { fill: warm, icon: dark, size: [24, 24] },
			colours: { label: white, title: white, sentence: white, home: white, contact: white },
			// body-large, src/styles/global.css --text-body-large: 1.125rem.
			sentenceSize: "18px",
			fieldLinks: [
				["กลับไปหน้าแรก", "/"],
				["ติดต่อเรา", "/contact"],
			],
			fieldButtons: [expect.stringMatching(/^\s*ค้นหา\s*$/)],
			linkFills: [
				["rgba(0, 0, 0, 0)", "0px"],
				["rgba(0, 0, 0, 0)", "0px"],
			],
			numeral: false,
		};
		// The heading block ends where the lower of its tile and its H1 does.
		const heading = [parts.tile, parts.title];
		for (const width of [320, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const apart = width >= 640 ? 32 : 24;
			const [tileBox, titleBox] = await Promise.all([parts.tile, parts.title].map(shownBox));
			seen[width] = {
				tileBeforeTitle: tileBox && titleBox ? tileBox.x + tileBox.width <= titleBox.x : "missing",
				labelAboveTitle: await gapBetween([parts.label], parts.title).then((gap) =>
					gap === "missing" ? gap : gap >= 0,
				),
				sentenceUnderHeading: await gapBetween(heading, parts.lead),
				pillUnderSentence: await gapBetween([parts.lead], parts.pill.form),
				linksUnderPill: await gapBetween([parts.pill.form], parts.home),
			};
			expected[width] = {
				tileBeforeTitle: true,
				labelAboveTitle: true,
				sentenceUnderHeading: 16,
				pillUnderSentence: apart,
				linksUnderPill: apart,
			};
		}
		expect(seen, "the 404 page's parts on its field").toEqual(expected);
	});

	test("its field is a list's: the glow and the large ring from 1,024 px alone, lower corners of 24 px and 32 px from 640 px; its content starts 40 px under the header below 640 px, 56 px from 640 px and 72 px from 1,024 px, the field ends 48, 64 and 80 px under the links, nothing lies over its edge and the footer follows 64 px under it, 80 px from 1,024 px; the H1 is 26, 36 and 42 px; nothing is past the window at 320, 375, 639, 640, 1023, 1024 and 1440 px", async ({
		page,
	}) => {
		await page.goto(unknownPath());
		const parts = notFoundParts(page);
		const seen: Record<string, unknown> = { field: await readListField(page) };
		const expected: Record<string, unknown> = { field: LIST_FIELD_LOOK };
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			// A short window, so the page is taller than it and the footer follows the content.
			await page.setViewportSize({ width, height: 300 });
			await expectNoHorizontalScroll(page, `the 404 page at ${width} px`);
			const [header, field, tile, label, home, contact, footer] = await Promise.all(
				[
					page.getByRole("banner"),
					parts.field,
					parts.tile,
					parts.label,
					parts.home,
					parts.contact,
					page.getByRole("contentinfo"),
				].map(shownBox),
			);
			seen[width] =
				header && field && tile && label && home && contact && footer
					? {
							contentUnderHeader: Math.round(
								Math.min(tile.y, label.y) - (header.y + header.height),
							),
							fieldUnderLinks: Math.round(
								field.y + field.height - Math.max(home.y + home.height, contact.y + contact.height),
							),
							footerUnderField: Math.round(footer.y - (field.y + field.height)),
							over: await partsOverFieldEdge(page, parts.field),
							corners: await parts.field.evaluate((element) => [
								getComputedStyle(element).borderBottomLeftRadius,
								getComputedStyle(element).borderBottomRightRadius,
							]),
							titleSize: await parts.title.evaluate(
								(element) => getComputedStyle(element).fontSize,
							),
						}
					: "missing";
			const corner = width >= 640 ? "32px" : "24px";
			expected[width] = {
				contentUnderHeader: width >= 1024 ? 72 : width >= 640 ? 56 : 40,
				fieldUnderLinks: width >= 1024 ? 80 : width >= 640 ? 64 : 48,
				footerUnderField: width >= 1024 ? 80 : 64,
				over: [],
				corners: [corner, corner],
				titleSize: width >= 1024 ? "42px" : width >= 640 ? "36px" : "26px",
			};
		}
		expect(seen, "the 404 page's field at each width").toEqual(expected);
	});

	test("its search pill is the site's: the page's one search landmark, named ค้นหาในเว็บไซต์ as its field is, for assistive technology alone, its button ค้นหา; empty with the hero's placeholder คุณกำลังมองหาอะไร?, as wide as the column up to 540 px and from 1,024 px up to 640 px; a typed query, by Enter or by the button, opens /search with that query alone, and the pill shows no spinner after the submit", async ({
		page,
	}) => {
		const path = unknownPath();
		const pill = searchPill(page);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		await page.goto(path);
		seen.landmarks = await page.getByRole("search").count();
		expected.landmarks = 1;
		seen.named = {
			form: await pill.form.count(),
			field: await pill.field.count(),
			button: await pill.button.count(),
		};
		expected.named = { form: 1, field: 1, button: 1 };
		seen.field =
			(await pill.field.count()) === 1
				? {
						value: await pill.field.inputValue(),
						placeholder: await pill.field.getAttribute("placeholder"),
						shown: await pill.field.evaluate((element) => element.matches(":placeholder-shown")),
					}
				: "missing";
		expected.field = { value: "", placeholder: HERO_PLACEHOLDER, shown: true };
		// The field's name and the button's word take no room in sight.
		seen.inSight =
			(await pill.form.count()) === 1
				? await pill.form.evaluate((form) =>
						[...form.querySelectorAll("label, button span")]
							.filter((element) => {
								const box = element.getBoundingClientRect();
								return Math.max(box.width, box.height) > 1;
							})
							.map((element) => element.textContent?.trim()),
					)
				: "missing";
		expected.inSight = [];
		for (const width of [320, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			seen[width] =
				(await pill.form.count()) === 1
					? await pill.form.evaluate((element) => {
							const column = element.parentElement!;
							const style = getComputedStyle(column);
							return {
								width: Math.round(element.getBoundingClientRect().width),
								column: Math.round(
									column.clientWidth -
										parseFloat(style.paddingLeft) -
										parseFloat(style.paddingRight),
								),
							};
						})
					: "missing";
			const column = (seen[width] as { column?: number }).column ?? "no column";
			expected[width] = {
				width: typeof column === "number" ? Math.min(column, width >= 1024 ? 640 : 540) : column,
				column,
			};
		}

		const query = thaiWord();
		for (const how of ["Enter", "the button"]) {
			await page.goto(path);
			if ((await pill.field.count()) === 1) {
				await pill.field.fill(query);
				if (how === "Enter") await pill.field.press("Enter");
				else await pill.button.click();
				await page.waitForURL(searchPath({ q: query }), { timeout: 5_000 }).catch(() => undefined);
			}
			seen[`sent by ${how}`] = shownAddress(page);
			expected[`sent by ${how}`] = searchPath({ q: query });
		}
		// The result answers 204 No Content, so the page stays in sight after the submit.
		await page.goto(path);
		const result = (url: URL) => url.pathname === "/search";
		await page.route(result, (route) => route.fulfill({ status: 204 }));
		if ((await pill.field.count()) === 1) {
			await pill.field.fill(query);
			await pill.field.press("Enter");
			await page.waitForTimeout(500);
		}
		seen.spinner = await page.getByTestId("submit-spinner").count();
		expected.spinner = 0;
		await page.unroute(result);
		seen.pillShown = (await shownBox(pill.form)) ? "shown" : "missing";
		expected.pillShown = "shown";
		expect(seen, "what the 404 page's search pill is named, holds and sends").toEqual(expected);
	});

	test("its links to the Homepage and to /contact are /services' links under its lead: surface-base words, semibold, at label size and underlined, each with a 16 px arrow-right and 44 px high, 24 px apart on one row at 1,440 and at 320 px, keeping their colour under the pointer; with focus each shows the field's accent-warm ring", async ({
		page,
	}) => {
		await page.goto(unknownPath());
		const { home, contact } = notFoundParts(page);
		await expectFieldLinks(
			page,
			[
				["กลับไปหน้าแรก", home],
				["ติดต่อเรา", contact],
			],
			[
				[DESKTOP_VIEWPORT, "one row"],
				[MOBILE_VIEWPORT, "one row"],
			],
		);
		const warm = await tokenColor(page, "accent-warm");
		for (const link of [home, contact]) {
			await link.focus();
			await expect(link).toHaveCSS("outline-style", "solid");
			await expect(link).toHaveCSS("outline-color", warm);
		}
	});

	test("it moves only when motion is allowed: the heading block, then the sentence, then the search pill rise in as the page opens, while the two links show at once; with reduced motion preferred, and on paper, nothing moves, and each part's place is the same either way", async ({
		page,
	}) => {
		const parts = notFoundParts(page);
		const { seen, expected } = await readHeaderMotion(
			page,
			unknownPath(),
			[
				["the H1", parts.title],
				["the sentence", parts.lead, 0.1],
				["the search pill", parts.pill.form, 0.22],
			],
			[
				["กลับไปหน้าแรก", parts.home],
				["ติดต่อเรา", parts.contact],
			],
			[
				["the field", parts.field],
				["the H1", parts.title],
				["the sentence", parts.lead],
				["the search pill", parts.pill.form],
				["กลับไปหน้าแรก", parts.home],
				["ติดต่อเรา", parts.contact],
			],
			false,
		);
		expect(seen, "the 404 page's motion, and nothing moving without it").toEqual(expected);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("it shows its label, H1, sentence, search pill and links whole at 375 and 1440 px, and the pill sends its query alone to /search", async ({
			page,
		}) => {
			await page.goto(unknownPath());
			const parts = notFoundParts(page);
			const whole = await readWholeAtTwoWidths(page, [
				["the label", parts.label],
				["the H1", parts.title],
				["the sentence", parts.lead],
				["the search pill", parts.pill.form],
				["กลับไปหน้าแรก", parts.home],
				["ติดต่อเรา", parts.contact],
			]);
			const query = thaiWord();
			if ((await parts.pill.field.count()) === 1) {
				await parts.pill.field.fill(query);
				await parts.pill.field.press("Enter");
				await page.waitForURL(searchPath({ q: query }), { timeout: 5_000 }).catch(() => undefined);
			}
			expect(
				{ whole: whole.seen, sent: shownAddress(page) },
				"the 404 page whole without JavaScript, and what the pill sends",
			).toEqual({ whole: whole.expected, sent: searchPath({ q: query }) });
		});
	});
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
		const label = control.getByText("เปิดเมนู", { exact: true });
		const labelBox = await label.boundingBox();
		expect(labelBox?.width, "the accessible label is visually clipped").toBe(1);
		expect(labelBox?.height).toBe(1);
		await expect(control).toHaveAccessibleName("เปิดเมนู");
		await expect(control.locator("svg").nth(0)).toBeVisible();
		await expect(control.locator("svg").nth(1)).toBeHidden();
		await expect(control.locator("..")).not.toHaveAttribute("open");
		expect(box?.width, `the menu button at ${width} px`).toBe(48);
		expect(box?.height).toBe(48);
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
				panel.width - 2 * WIDEST_GUTTER,
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
			["the identity", siteIdentityLink(page)],
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
	const identity = await boxOf(siteIdentityLink(page), "the identity");
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
		await expect(siteIdentityLink(page)).toBeFocused();
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
		await expect(siteIdentityLink(page)).toBeFocused();
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

/** The script tags of the page at `path` that run JavaScript, the development server's aside. */
async function pageScripts(page: Page, path: string): Promise<string[]> {
	const response = await page.goto(path);
	const html = (await response?.text()) ?? "";
	return [...html.matchAll(/<script\b[^>]*>/gi)]
		.map((match) => match[0])
		.filter((tag) => {
			const type = /\btype="([^"]*)"/i.exec(tag)?.[1] ?? "";
			// Scripts of a non-JavaScript type, such as JSON-LD, are data.
			if (type !== "" && type !== "module" && !/javascript/i.test(type)) return false;
			const src = /\bsrc="([^"]*)"/i.exec(tag)?.[1];
			return src === undefined || !DEV_SERVER_SCRIPT_SRC.test(src);
		});
}

test("the shell adds no client JavaScript, and the Homepage carries its one inline script, the submit state", async ({
	page,
}) => {
	for (const path of ["/contact", unknownPath()]) {
		expect(await pageScripts(page, path), `${path} must not run page JavaScript`).toEqual([]);
	}
	// The Homepage's own script (Feature 008 #246; spec #239 "Motion and loading").
	expect(await pageScripts(page, "/"), "/ runs one inline script").toEqual(["<script>"]);
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
				if (width === 320) {
					const name = fallback.getByText(DEFAULT_SITE_TITLE, { exact: true });
					const lineHeight = await name.evaluate((span) =>
						Number.parseFloat(getComputedStyle(span).lineHeight),
					);
					expect(
						(await name.boundingBox())!.height,
						"the office's own name wraps at 320 px",
					).toBeGreaterThan(lineHeight);
				}
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
