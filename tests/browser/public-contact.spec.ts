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
// The page opens on the list's deep field with the list heading, and the details lie in a white
// card over the field's lower edge, a row per detail with its icon; the channels follow as pills
// under the Homepage's section heading, then the two routes as cards (Feature 012 #369; spec #365
// decisions 4, 8, 9 and 13, "`/contact`", "Motion"; Product Owner, 2026-11-20: #369 comment
// 7034812318).
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). It saves synthetic Office Contact values and `social` handles through the native
// settings APIs, the way the Admin saves them, and restores what was there afterwards
// (cms.helpers.ts showOfficeContact says what the native API cannot restore).

import type { Locator, Page } from "@playwright/test";

import {
	devAdminActor,
	SYNTHETIC_FIXTURE_MARK,
	withOfficeContact,
	type CmsActor,
	type OfficeContactValues,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	VIEWPORTS,
	boxOf,
	detailOf,
	expect,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectNoTextCutOff,
	expectVisibleFocusOnEveryStop,
	fieldEdge,
	fieldParts,
	itemsPerRow,
	pillStyle,
	readHeaderMotion,
	readWholeAtTwoWidths,
	ringsOverFieldUnbanded,
	test,
	testHeadingOnField,
	textStyle,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

const CONTACT_TITLE = "ติดต่อเรา";
const CONTACT_HEADING = {
	label: "ติดต่อ",
	title: CONTACT_TITLE,
	lead: "ที่อยู่ เวลาทำการ และช่องทางติดต่อสำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่",
};
const CHANNELS_HEADING = "ช่องทางทางการ";

/** The two routes onward, in order: heading, sentence, button, destination and the tile's icon. */
const ROUTES = [
	{
		heading: "ร้องเรียนและเสนอแนะ",
		sentence: "ขั้นตอนและช่องทางการร้องเรียน แจ้งเรื่อง หรือเสนอแนะ อยู่ในบริการประชาชน",
		button: "ดูบริการประชาชน",
		href: "/services",
		icon: "message-square",
		filled: true,
	},
	{
		heading: "ติดต่อหน่วยบริการสุขภาพ",
		sentence:
			"ที่อยู่ เวลาทำการ และช่องทางติดต่อของโรงพยาบาลและ รพ.สต. อยู่ในหน่วยบริการสุขภาพที่เกี่ยวข้อง",
		button: "ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง",
		href: "/health-services",
		icon: "hospital",
		filled: false,
	},
] as const;

/** The card's rows in order: the term and its icon. */
const ROWS = [
	["ที่ตั้ง", "map-pin"],
	["โทรศัพท์", "phone"],
	["อีเมล", "mail"],
	["เวลาทำการ", "clock"],
] as const;

/** The widths the card, the channels and the routes are read at, on both sides of 640 and 1,024. */
const WIDTHS = [320, 639, 640, 1023, 1024, 1440] as const;

let admin: CmsActor;

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
			opening_hours: `จันทร์–ศุกร์ 08:30–16:30 น. ${marker}\nเว้นวันหยุดราชการ`,
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

/** The parts of /contact under its heading: the card, its rows, the channels and the routes. */
function contactParts(page: Page) {
	const main = page.getByRole("main");
	const card = page.getByTestId("office-contact-card");
	const channels = main.getByRole("region", { name: CHANNELS_HEADING });
	return {
		...fieldParts(page),
		lead: fieldParts(page).field.getByText(CONTACT_HEADING.lead, { exact: true }),
		card,
		rows: card.locator(":scope > div"),
		channels,
		// The section heading's block: the tile, the label and the H2.
		channelsHeading: channels.locator(":scope > div").first(),
		pills: channelLinks(page, "main"),
		routes: ROUTES.map(({ heading }) => main.getByRole("region", { name: heading })),
	};
}

/**
 * The border width the stylesheet gives `part`, as written: Chromium draws a border in whole pixels
 * and reports a 1.5 px one as 1 px in its computed style, at one or two device pixels to the CSS
 * pixel alike (Playwright 1.63.0's Chromium), so the drawn width cannot tell 1.5 px from 1 px.
 */
function declaredBorderWidth(part: Locator) {
	return part.evaluate((element) => {
		const widths: string[] = [];
		const read = (rules: CSSRuleList) => {
			for (const rule of rules) {
				if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
					const width = rule.style.getPropertyValue("border-top-width");
					if (width) widths.push(width);
				} else if ("cssRules" in rule) {
					read((rule as CSSGroupingRule).cssRules);
				}
			}
		};
		for (const sheet of document.styleSheets) read(sheet.cssRules);
		return widths.at(-1) ?? "none";
	});
}

/** Where a part's box ends in the window. */
const bottomOf = (box: { y: number; height: number }) => box.y + box.height;

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
});

testHeadingOnField({
	path: "/contact",
	crumbs: [HOME_CRUMB],
	heading: CONTACT_HEADING,
	icon: "headset",
});

test("/contact shows the Office Contact saved in the plugin settings, with a map link built from its coordinates", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withOfficeContact(admin, values, social, async () => {
		const response = await page.goto("/contact");
		expect(response?.status(), "GET /contact").toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(CONTACT_TITLE);
		await expectBreadcrumb(page, [HOME_CRUMB], CONTACT_TITLE);
		await expect(page).toHaveTitle(new RegExp(`^${CONTACT_TITLE}`));
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
		expect(
			await detailOf(page, "เวลาทำการ").evaluate((value) => (value as HTMLElement).innerText),
			"the opening hours with their line break",
		).toBe(values.opening_hours);
	});
});

test("the details card lies over the field's lower edge, 64 px above it below 640 px and 88 px from 640 px, at the column's start and 64 rem wide at most: white, radius 24, the deep shadow, 20 px inside and 32 px from 640 px; its rows ที่ตั้ง, โทรศัพท์, อีเมล, เวลาทำการ in one column below 640 px and two from 640 px, 24 px apart down and 40 px across; no focus ring in it meets the field", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withOfficeContact(admin, values, social, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		await expect(parts.card.getByRole("term")).toHaveText(ROWS.map(([term]) => term));

		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		const places: Record<number, unknown> = {};
		const expectedPlaces: Record<number, unknown> = {};
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const edge = await fieldEdge(parts.field, at);
			const card = await boxOf(parts.card, `${at}: the card`);
			const column = await boxOf(parts.breadcrumb, `${at}: the breadcrumb`);
			const rows = await parts.rows.evaluateAll((elements) =>
				elements.map((element) => {
					const { x, y, width, height } = element.getBoundingClientRect();
					return { x, y, right: x + width, bottom: y + height };
				}),
			);
			const twoColumns = width >= 640;
			const lines = twoColumns ? [rows.slice(0, 2), rows.slice(2)] : rows.map((row) => [row]);
			places[width] = {
				overEdge: Math.round(edge - card.y),
				start: Math.round(card.x - column.x),
				width: Math.round(card.width),
				inside: await parts.card.evaluate((element) => {
					const style = getComputedStyle(element);
					return [style.paddingTop, style.paddingLeft];
				}),
				perRow: await itemsPerRow(parts.rows),
				down: lines
					.slice(1)
					.map((line, index) =>
						Math.round(
							Math.min(...line.map((row) => row.y)) -
								Math.max(...lines[index]!.map((row) => row.bottom)),
						),
					),
				across: twoColumns
					? lines.map(([first, second]) => Math.round(second!.x - first!.right))
					: [],
			};
			expectedPlaces[width] = {
				overEdge: twoColumns ? 88 : 64,
				start: 0,
				width: Math.min(1024, Math.round(column.width)),
				inside: twoColumns ? ["32px", "32px"] : ["20px", "20px"],
				perRow: twoColumns ? [2, 2] : [1, 1, 1, 1],
				down: twoColumns ? [24] : [24, 24, 24],
				across: twoColumns ? [40, 40] : [],
			};
		}
		seen.places = places;
		expected.places = expectedPlaces;

		const white = await tokenColor(page, "surface-base");
		seen.look = await parts.card.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				fill: style.backgroundColor,
				corners: style.borderTopLeftRadius,
				shadow: style.boxShadow,
			};
		});
		expected.look = { fill: white, corners: "24px", shadow: await tokenShadow(page, "deep") };
		const unbanded: Record<number, string[]> = {};
		for (const viewport of [DESKTOP_VIEWPORT, PHONE_VIEWPORT]) {
			await page.setViewportSize(viewport);
			unbanded[viewport.width] = await ringsOverFieldUnbanded(parts.card, parts.field, white);
		}
		seen.unbanded = unbanded;
		expected.unbanded = { 1440: [], 375: [] };
		expect(seen, "the card over the field's edge and its rows").toEqual(expected);
	});
});

test("each row of the card has a 44 px surface-soft tile with its 20 px icon in brand-primary, hidden from assistive technology, then the term at label size in text-secondary over the value; the address keeps its line breaks with เปิดแผนที่ 12 px under it, the outlined pill; the telephone number is at H3 size, semibold, brand-primary and underlined; the email and the opening hours, with its line breaks, at body size", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withOfficeContact(admin, values, social, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		const [soft, primary, secondary, text, input] = await Promise.all(
			["surface-soft", "brand-primary", "text-secondary", "text-primary", "border-input"].map(
				(name) => tokenColor(page, name),
			),
		);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		const tiles: Record<string, unknown> = {};
		for (const [term, icon] of ROWS) {
			const row = parts.rows.filter({
				has: page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) }),
			});
			const svg = row.locator(`svg.lucide-${icon}`);
			tiles[term] =
				(await svg.count()) === 1
					? await svg.evaluate((element) => {
							// The tile around the icon, which Lucide hides on its own too.
							const tile = element.parentElement?.closest('[aria-hidden="true"]') ?? null;
							const box = tile?.getBoundingClientRect();
							const own = element.getBoundingClientRect();
							return {
								hidden: tile !== null,
								tile: box ? [Math.round(box.width), Math.round(box.height)] : [],
								fill: tile ? getComputedStyle(tile).backgroundColor : "",
								icon: [Math.round(own.width), Math.round(own.height)],
								colour: getComputedStyle(element).color,
							};
						})
					: "no icon";
			const termStyle = await textStyle(row.getByRole("term"));
			tiles[`${term}: term`] = { size: termStyle.size, colour: termStyle.colour };
		}
		seen.tiles = tiles;
		expected.tiles = Object.fromEntries(
			ROWS.flatMap(([term]) => [
				[term, { hidden: true, tile: [44, 44], fill: soft, icon: [20, 20], colour: primary }],
				[`${term}: term`, { size: 14, colour: secondary }],
			]),
		);

		const location = detailOf(page, "ที่ตั้ง");
		const address = location.getByText(String(values.address).split("\n")[0]!);
		const map = location.getByRole("link", { name: "เปิดแผนที่ (เปิดในแท็บใหม่)" });
		seen.address = {
			text: await address.evaluate((element) => (element as HTMLElement).innerText),
			mapUnder: Math.round(
				(await boxOf(map, "the map")).y - bottomOf(await boxOf(address, "the address")),
			),
			map: { ...(await pillStyle(map)), height: Math.round((await boxOf(map, "the map")).height) },
		};
		expected.address = {
			text: values.address,
			mapUnder: 12,
			map: {
				fill: "rgba(0, 0, 0, 0)",
				colour: primary,
				type: ["14px", "22px", "500"],
				edge: "1px",
				height: 44,
			},
		};
		await expect(map).toHaveCSS("border-top-color", input);

		const telephone = detailOf(page, "โทรศัพท์").getByRole("link");
		seen.telephone = {
			...(await textStyle(telephone)),
			height: Math.round((await boxOf(telephone, "the telephone")).height),
		};
		expected.telephone = { size: 24, weight: "600", colour: primary, underline: true, height: 44 };
		const email = detailOf(page, "อีเมล").getByRole("link");
		seen.email = {
			...(await textStyle(email)),
			height: Math.round((await boxOf(email, "the email")).height),
		};
		expected.email = { size: 16, weight: "400", colour: primary, underline: true, height: 44 };
		const hours = detailOf(page, "เวลาทำการ");
		seen.hours = {
			...(await textStyle(hours)),
			text: await hours.evaluate((element) => (element as HTMLElement).innerText),
		};
		expected.hours = {
			size: 16,
			weight: "400",
			colour: text,
			underline: false,
			text: values.opening_hours,
		};
		expect(seen, "each row's tile, term and value").toEqual(expected);
	});
});

test("an empty value leaves its line out, and /contact still answers with no Office Contact set", async ({
	page,
}) => {
	// Only a telephone number that is not one number, and a latitude without its longitude.
	await withOfficeContact(
		admin,
		{ telephone: "054 591 234 ต่อ 12", latitude: 18.4686 },
		{},
		async () => {
			await page.goto("/contact");
			await expect(page.getByRole("main").getByRole("term")).toHaveText(["โทรศัพท์"]);
			await expect(detailOf(page, "โทรศัพท์")).toHaveText("054 591 234 ต่อ 12");
			await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
			await expect(page.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
		},
	);

	await withOfficeContact(admin, {}, {}, async () => {
		const response = await page.goto("/contact");
		expect(response?.status(), "GET /contact with nothing set").toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(CONTACT_TITLE);
		await expect(page.getByRole("main").getByRole("term")).toHaveCount(0);
		await expect(page.getByRole("heading", { name: CHANNELS_HEADING })).toHaveCount(0);
		await expect(page.getByRole("list", { name: CHANNELS_HEADING })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "ดูบริการประชาชน" })).toBeVisible();
	});
});

test("each row shows only while its detail is set, in the card's order; a telephone number that is not one number is plain text at H3 size, semibold, in text-primary and not underlined, and an email that is not one address plain text", async ({
	page,
}) => {
	const { values } = syntheticContact();
	const cases: Array<[string, OfficeContactValues, string[]]> = [
		["the coordinates alone", { latitude: 18.4686, longitude: 100.1834 }, ["ที่ตั้ง"]],
		[
			"the telephone and the opening hours",
			{ telephone: values.telephone, opening_hours: values.opening_hours },
			["โทรศัพท์", "เวลาทำการ"],
		],
		[
			"the address and the email",
			{ address: values.address, email: values.email },
			["ที่ตั้ง", "อีเมล"],
		],
	];
	for (const [name, contact, terms] of cases) {
		await withOfficeContact(admin, contact, {}, async () => {
			await page.goto("/contact");
			await expect(contactParts(page).card.getByRole("term"), name).toHaveText(terms);
		});
	}

	const plainEmail = "a@example.invalid, b@example.invalid";
	await withOfficeContact(
		admin,
		{ telephone: "054 591 234 ต่อ 12", email: plainEmail },
		{},
		async () => {
			await page.goto("/contact");
			await expect(detailOf(page, "อีเมล")).toHaveText(plainEmail);
			await expect(detailOf(page, "อีเมล").getByRole("link")).toHaveCount(0);
			await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
			const telephone = detailOf(page, "โทรศัพท์").getByText("054 591 234 ต่อ 12", {
				exact: true,
			});
			expect(await textStyle(telephone), "the telephone number as plain text").toEqual({
				size: 24,
				weight: "600",
				colour: await tokenColor(page, "text-primary"),
				underline: false,
			});
		},
	);
});

test("with no detail set /contact has no card and its field ends 40 px under the lead below 640 px and 48 px from 640 px, with nothing over its edge; ช่องทางทางการ follows 32 px under the field below 1,024 px and 40 px from 1,024 px, and without a channel the routes take its place", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	const read = async (first: Locator) => {
		const parts = contactParts(page);
		const places: Record<number, unknown> = {};
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const edge = await fieldEdge(parts.field, `at ${width} px`);
			places[width] = {
				fieldUnderLead: Math.round(edge - bottomOf(await boxOf(parts.lead, "the lead"))),
				firstUnderField: Math.round((await boxOf(first, "the first section")).y - edge),
			};
		}
		return places;
	};
	const expectedPlaces = Object.fromEntries(
		WIDTHS.map((width) => [
			width,
			{ fieldUnderLead: width >= 640 ? 48 : 40, firstUnderField: width >= 1024 ? 40 : 32 },
		]),
	);

	await withOfficeContact(admin, { line_url: values.line_url }, social, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		await expect(parts.card, "no card").toHaveCount(0);
		await expect(parts.pills).toHaveCount(3);
		seen.channels = await read(parts.channels);
		expected.channels = expectedPlaces;
	});
	await withOfficeContact(admin, {}, {}, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		await expect(parts.card, "no card").toHaveCount(0);
		await expect(parts.channels, "no channels").toHaveCount(0);
		seen.routes = await read(parts.routes[0]!);
		expected.routes = expectedPlaces;
	});
	expect(seen, "the field's end and what follows it, with no card").toEqual(expected);
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
	await withOfficeContact(admin, values, social, async () => {
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

test("ช่องทางทางการ follows 48 px under the card with the Homepage's section heading (the gradient tile with the 24 px share-2 and the label ติดต่อ), then 24 px under it, 28 px from 640 px, the channels as pills: white with a 1.5 px border-default edge, the network's name alone at body size, semibold, in brand-primary, and the 16 px arrow-up-right, 44 px high and 10 px apart, wrapping inside the column; brand-primary with white words under the pointer", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withOfficeContact(admin, values, social, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		await expect(parts.pills).toHaveCount(3);
		const [white, primary, border] = await Promise.all(
			["surface-base", "brand-primary", "border-default"].map((name) => tokenColor(page, name)),
		);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		const tile = parts.channelsHeading.locator('[aria-hidden="true"]').first();
		const label = parts.channelsHeading.locator("p");
		seen.heading = {
			gradient: await tile.evaluate((element) =>
				getComputedStyle(element).backgroundImage.startsWith("linear-gradient"),
			),
			icon: await tile.locator("svg.lucide-share-2").evaluate((element) => {
				const { width, height } = element.getBoundingClientRect();
				return [Math.round(width), Math.round(height)];
			}),
			label: (await label.textContent())?.trim(),
			labelColour: (await textStyle(label)).colour,
		};
		expected.heading = { gradient: true, icon: [24, 24], label: "ติดต่อ", labelColour: primary };

		const places: Record<number, unknown> = {};
		const expectedPlaces: Record<number, unknown> = {};
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const heading = await boxOf(parts.channelsHeading, `${at}: the heading`);
			const list = await boxOf(channelLinks(page, "main").first(), `${at}: the first pill`);
			const pills = await parts.pills.evaluateAll((elements) =>
				elements.map((element) => {
					const { x, y, width, height } = element.getBoundingClientRect();
					return { x, y, right: x + width, height };
				}),
			);
			const column = await boxOf(parts.breadcrumb, `${at}: the breadcrumb`);
			places[width] = {
				underCard: Math.round(
					(await boxOf(parts.channels, `${at}: ช่องทางทางการ`)).y -
						bottomOf(await boxOf(parts.card, `${at}: the card`)),
				),
				pillsUnderHeading: Math.round(list.y - bottomOf(heading)),
				heights: pills.map((pill) => Math.round(pill.height)),
				apart: pills
					.slice(1)
					.map((pill, index) =>
						Math.abs(pill.y - pills[index]!.y) < 1
							? Math.round(pill.x - pills[index]!.right)
							: Math.round(pill.y - pills[index]!.y - pills[index]!.height),
					),
				inside: pills.every((pill) => pill.right <= column.x + column.width + 0.5),
			};
			expectedPlaces[width] = {
				underCard: 48,
				pillsUnderHeading: width >= 640 ? 28 : 24,
				heights: [44, 44, 44],
				apart: [10, 10],
				inside: true,
			};
		}
		seen.places = places;
		expected.places = expectedPlaces;

		const first = parts.pills.first();
		seen.pill = {
			// The words a citizen sees: the text the pill holds itself, without the note for
			// assistive technology.
			visible: await first.evaluate((element) =>
				[...element.childNodes]
					.filter((node) => node.nodeType === Node.TEXT_NODE)
					.map((node) => node.textContent)
					.join("")
					.trim(),
			),
			arrow: await first.locator("svg.lucide-arrow-up-right").evaluate((element) => {
				const { width, height } = element.getBoundingClientRect();
				return [Math.round(width), Math.round(height)];
			}),
			look: await pillStyle(first),
			edgeColour: await first.evaluate((element) => getComputedStyle(element).borderTopColor),
			edgeWidth: await declaredBorderWidth(first),
		};
		expected.pill = {
			visible: "Facebook",
			arrow: [16, 16],
			look: { fill: white, colour: primary, type: ["16px", "26px", "600"], edge: "1px" },
			edgeColour: border,
			edgeWidth: "1.5px",
		};
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await first.hover();
		const hovered = await pillStyle(first);
		seen.hovered = { fill: hovered.fill, colour: hovered.colour };
		expected.hovered = { fill: primary, colour: white };
		expect(seen, "the channels' heading and pills").toEqual(expected);
	});
});

test("the two routes follow 48 px under the channels, or under the card without a channel: white cards with the card shadow and radius 24, side by side from 640 px and stacked below, 16 px apart and 20 px from 640 px; each with its 52 px gradient tile and 24 px icon, its H2 at H3 size, its sentence in text-secondary and its button with the 16 px arrow-right, semibold: ดูบริการประชาชน filled to the Service catalog, ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง outlined to the Health Service Directory", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	const [white, primary, secondary, input] = await (async () => {
		await page.goto("/contact");
		return Promise.all(
			["surface-base", "brand-primary", "text-secondary", "border-input"].map((name) =>
				tokenColor(page, name),
			),
		);
	})();
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};

	await withOfficeContact(admin, values, social, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		const cards: Record<string, unknown> = {};
		for (const [index, route] of ROUTES.entries()) {
			const card = parts.routes[index]!;
			await expect(card.getByRole("heading", { level: 2 })).toHaveText(route.heading);
			await expect(card.getByText(route.sentence, { exact: true })).toBeVisible();
			const button = card.getByRole("link", { name: route.button, exact: true });
			await expect(button).toHaveAttribute("href", route.href);
			const tile = card.locator('[aria-hidden="true"]').first();
			cards[route.heading] = {
				look: await card.evaluate((element) => {
					const style = getComputedStyle(element);
					return {
						fill: style.backgroundColor,
						corners: style.borderTopLeftRadius,
						shadow: style.boxShadow,
					};
				}),
				tile: await tile.evaluate((element) => {
					const { width, height } = element.getBoundingClientRect();
					return {
						size: [Math.round(width), Math.round(height)],
						gradient: getComputedStyle(element).backgroundImage.startsWith("linear-gradient"),
					};
				}),
				icon: await tile.locator(`svg.lucide-${route.icon}`).count(),
				heading: (await textStyle(card.getByRole("heading", { level: 2 }))).size,
				sentence: (await textStyle(card.getByText(route.sentence, { exact: true }))).colour,
				button: {
					...(await pillStyle(button)),
					arrow: await button.locator("svg.lucide-arrow-right").evaluate((element) => {
						const { width, height } = element.getBoundingClientRect();
						return [Math.round(width), Math.round(height)];
					}),
					height: Math.round((await boxOf(button, `${route.button}`)).height),
				},
			};
		}
		seen.cards = cards;
		const shadow = await tokenShadow(page, "card");
		expected.cards = Object.fromEntries(
			ROUTES.map((route) => [
				route.heading,
				{
					look: { fill: white, corners: "24px", shadow },
					tile: { size: [52, 52], gradient: true },
					icon: 1,
					heading: 24,
					sentence: secondary,
					button: {
						fill: route.filled ? primary : white,
						colour: route.filled ? white : primary,
						type: ["14px", "22px", "600"],
						edge: route.filled ? "0px" : "1px",
						arrow: [16, 16],
						height: 44,
					},
				},
			]),
		);
		await expect(parts.routes[1]!.getByRole("link"), "the outlined button's edge").toHaveCSS(
			"border-top-color",
			input,
		);

		const places: Record<number, unknown> = {};
		const expectedPlaces: Record<number, unknown> = {};
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const [first, second] = await Promise.all(
				parts.routes.map((route, index) => boxOf(route, `${at}: route ${index + 1}`)),
			);
			places[width] = {
				underChannels: Math.round(
					first!.y - bottomOf(await boxOf(parts.channels, `${at}: ช่องทางทางการ`)),
				),
				apart:
					Math.abs(first!.y - second!.y) < 1
						? ["across", Math.round(second!.x - first!.x - first!.width)]
						: ["down", Math.round(second!.y - bottomOf(first!))],
			};
			expectedPlaces[width] = {
				underChannels: 48,
				apart: width >= 640 ? ["across", 20] : ["down", 16],
			};
		}
		seen.places = places;
		expected.places = expectedPlaces;
	});

	// Every detail, and neither LINE nor a `social` handle.
	await withOfficeContact(admin, { ...values, line_url: null }, {}, async () => {
		await page.goto("/contact");
		const parts = contactParts(page);
		await expect(parts.channels, "no channels").toHaveCount(0);
		const underCard: Record<number, number> = {};
		for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			underCard[viewport.width] = Math.round(
				(await boxOf(parts.routes[0]!, "the first route")).y -
					bottomOf(await boxOf(parts.card, "the card")),
			);
		}
		seen.underCard = underCard;
		expected.underCard = { 375: 48, 1440: 48 };
	});
	expect(seen, "the two routes").toEqual(expected);
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

test("/contact moves only when motion is allowed: the heading block and then the lead rise in as the page opens while the breadcrumb, the card, the channels and the routes show at once; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	const { values, social } = syntheticContact();
	await withOfficeContact(admin, values, social, async () => {
		const parts = contactParts(page);
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the card", parts.card],
			["ช่องทางทางการ", parts.channels],
			...ROUTES.map(({ heading }, index): [string, Locator] => [heading, parts.routes[index]!]),
		];
		const { seen, expected } = await readHeaderMotion(
			page,
			"/contact",
			[
				["the H1", parts.title],
				["the lead", parts.lead, 0.1],
			],
			atOnce,
			[["the field", parts.field], ["the H1", parts.title], ...atOnce],
			false,
		);
		expect(seen, "the motion, and nothing moving without it").toEqual(expected);
	});
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("/contact shows its heading on the field, the card, the channels and the routes whole, at 375 and 1440 px", async ({
		page,
	}) => {
		const { values, social } = syntheticContact();
		await withOfficeContact(admin, values, social, async () => {
			await page.goto("/contact");
			const parts = contactParts(page);
			const { seen, expected } = await readWholeAtTwoWidths(page, [
				["the breadcrumb", parts.breadcrumb],
				["the H1", parts.title],
				["the lead", parts.lead],
				["the card", parts.card],
				["ช่องทางทางการ", parts.channels],
				...ROUTES.map(({ heading }, index): [string, Locator] => [heading, parts.routes[index]!]),
			]);
			expect(seen, "the page whole without JavaScript").toEqual(expected);
		});
	});
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
			await withOfficeContact(admin, values, social, () => check("with Office Contact set"));
			await withOfficeContact(admin, {}, {}, () => check("with nothing set"));
		});
	}

	test("/contact does not scroll sideways and cuts no text off at 375 and 320 px, even with a long email address", async ({
		page,
	}) => {
		const { values, social } = syntheticContact();
		const email = `songhealth-district-public-health-office-${crypto.randomUUID()}@example.invalid`;
		await withOfficeContact(admin, { ...values, email }, social, async () => {
			for (const viewport of [PHONE_VIEWPORT, MOBILE_VIEWPORT]) {
				await page.setViewportSize(viewport);
				await page.goto("/contact");
				await expectNoHorizontalScroll(page, `/contact at ${viewport.width} px`);
				await expectNoTextCutOff(page, `/contact at ${viewport.width} px`);
			}
		});
	});
});
