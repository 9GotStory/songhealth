// The Health Service Directory (#57; spec #51 "Public reads" (Health Service Directory) and
// "Maps", `03` §8).
//
// A citizen finds a related Health Service at /health-services, filtered by Area and by name with
// the filters kept in the address, and opens each at its canonical /health-services/{slug} address
// to read its names, type, affiliation, operational status, address, opening hours, public
// contact, Area and the Services it offers in staff order. A temporarily closed or inactive Health
// Service says so in text. "เปิดแผนที่" links out to a map app by the coordinates; no page embeds a
// map. Drafts, unpublished and trashed Health Services never show, and their addresses answer the
// site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Health Services and Services with synthetic `area` and
// `facility_type` terms, made through the native API the way the Admin makes them and removed
// afterwards. The runtime may hold other Health Services (the demo dataset, the Product Owner's
// own), so assertions look only at this suite's uniquely named fixtures.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A create takes `references: { offered_services: [ids] }` and keeps them in the order given,
//   which a reference page returns (src/references/staged.ts, src/references/resolve.ts).
// - A reference target resolves only while it is published (src/references/resolve.ts).

import {
	createOwnedTerm,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import type { Locator } from "@playwright/test";
import {
	DESKTOP_VIEWPORT,
	HEADER_WIDEST,
	HOME_CRUMB,
	LIST_END,
	SECTION_CRUMBS,
	boxOf,
	cardOverFieldEdge,
	cardOverFieldEdgeAsSpecified,
	deepField,
	detailOf,
	entersAfter,
	expect,
	expectAttentionLabelsOnOwnLine,
	expectBreadcrumb,
	expectPostTitleSizes,
	expectPreviewRenders,
	expectSecondLinkPlaces,
	expectServiceCardInteraction,
	expectSiteNotFound,
	expectVisuallyHidden,
	fieldEdge,
	fieldParts,
	itemsPerRow,
	listedItem,
	listedTitles,
	ownTitles,
	pointAt,
	pressOpens,
	readHeaderOnField,
	rowShadow,
	shownLines,
	shownOpacity,
	shownWhole,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	textStyle,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

/** The fixed number of Health Services a list page shows. */
const PAGE_SIZE = 20;

/** The lead of /health-services, under its heading. */
const DIRECTORY_LEAD =
	"ค้นหาโรงพยาบาล รพ.สต. และหน่วยบริการสุขภาพอื่นที่เกี่ยวข้องกับอำเภอสอง ตามพื้นที่รับผิดชอบหรือชื่อ พร้อมที่อยู่ เวลาทำการ ช่องทางติดต่อ และลิงก์เปิดแผนที่";

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** A synthetic Health Service draft (cms.helpers.ts createSyntheticHealthService). */
const createHealthService = (
	label: string,
	fields?: Parameters<typeof createSyntheticHealthService>[2],
) => createSyntheticHealthService(admin, label, fields);

/** Publish now. */
async function publish(collection: string, fixture: DraftFixture): Promise<void> {
	await publishEntryAt(admin, collection, fixture.id);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

// First in the suite, while the runtime holds only its own Health Services (Feature 011 #339;
// spec #338 "Decisions", 5 and 6): the directory opens on the deep field, and its filter form, rows
// and pager follow over the field's lower edge. It orders by the name it shows, so these are shown
// with ฮ, the last Thai consonant, and follow every other test's.
testListOnField({
	path: "/health-services",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.services],
	heading: { label: "หน่วยบริการ", title: "หน่วยบริการสุขภาพที่เกี่ยวข้อง", lead: DIRECTORY_LEAD },
	icon: "hospital",
	collection: "health_services",
	pageSize: PAGE_SIZE,
	noneYet: "ยังไม่มีข้อมูลหน่วยบริการ",
	pastLast: "ไม่พบหน่วยบริการในหน้านี้",
	form: {
		name: "ค้นหาหน่วยบริการ",
		unmatched: `name=${syntheticSlug("no-such-name")}`,
		empty: {
			message: "ไม่พบหน่วยบริการตามที่ค้นหา",
			back: { label: "ดูหน่วยบริการทั้งหมด", href: "/health-services" },
		},
	},
	admin: () => admin,
	publishItem: async (label) => {
		const healthService = await createHealthService(label, { displayName: "ฮ หน่วยบริการ" });
		await publishEntryAt(admin, "health_services", healthService.id, LIST_END);
		return healthService;
	},
	// Each row reveals as it comes into the window (Feature 011 #341; spec #338 "Motion").
	itemsMove: "rows",
});

test("/health-services lists only published Health Services by name, each with its type, Area, address and a closed status in text", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const area = await createTerm("area", "ตำบลสอง");
	const address = `${SYNTHETIC_FIXTURE_MARK} 99 หมู่ 1 ตำบลสอง อำเภอสอง จังหวัดแพร่`;
	// "ก" and "ข" order the two published fixtures in Thai, whatever their random suffixes.
	const listed = await createHealthService("listed", {
		displayName: "ก รพ.สต.บ้านกลาง",
		data: { address, operational_status: "active" },
		taxonomies: { facility_type: [type.slug], area: [area.slug] },
	});
	const closed = await createHealthService("closed", {
		displayName: "ข รพ.สต.บ้านใต้",
		data: { operational_status: "temporarily_closed" },
	});
	const inactive = await createHealthService("inactive", {
		displayName: "ค สถานีอนามัยเดิม",
		data: { operational_status: "inactive" },
	});
	const draft = await createHealthService("draft");
	const unpublished = await createHealthService("unpublished");
	const trashed = await createHealthService("trashed");
	for (const fixture of [listed, closed, inactive, unpublished, trashed]) {
		await publish("health_services", fixture);
	}
	expect((await unpublishEntry(admin, "health_services", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_services", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto("/health-services");
	expect(response?.status(), "GET /health-services").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.services],
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	);

	expect(
		ownTitles(await listedTitles(page), [listed, closed, inactive, draft, unpublished, trashed]),
		"published only, by the shown name",
	).toEqual([listed.title, closed.title, inactive.title]);

	const row = listedItem(page, listed.title);
	await expect(row.getByRole("link", { name: listed.title, exact: true })).toHaveAttribute(
		"href",
		`/health-services/${listed.slug}`,
	);
	await expect(row).toContainText(listed.officialName);
	await expect(row).toContainText(type.label);
	await expect(row).toContainText(area.label);
	await expect(row).toContainText(address);
	await expect(row, "an open Health Service needs no status in a list").not.toContainText(
		"เปิดให้บริการ",
	);
	await expect(listedItem(page, closed.title)).toContainText("ปิดให้บริการชั่วคราว");
	await expect(listedItem(page, inactive.title)).toContainText("ไม่เปิดให้บริการแล้ว");

	const body = await page.content();
	for (const word of ["ใกล้บ้าน", "ในพื้นที่"]) {
		expect(body.includes(word), `the directory never says "${word}"`).toBe(false);
	}
});

/** A synthetic Health Service, its title the name it is shown by. */
type HealthServiceFixture = DraftFixture & { officialName: string };

/** The Google Maps link the pages build from these coordinates (Maps URLs, search action). */
const mapLinkOf = (latitude: number, longitude: number) =>
	`https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;

/** A place in อำเภอสอง, as a Health Service's coordinates. */
const AT_SONG = { latitude: 18.4719, longitude: 100.1953 };

/** A shown name longer than two lines of a row at every width. */
const LONG_NAME =
	"ก โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลางและเครือข่ายหน่วยบริการปฐมภูมิร่วมกับศูนย์สุขภาพชุมชนของตำบลบ้านกลางและตำบลห้วยหม้าย ซึ่งให้บริการตรวจรักษาโรคทั่วไป ส่งเสริมสุขภาพ ป้องกันโรค และฟื้นฟูสภาพแก่ประชาชนในพื้นที่รับผิดชอบทุกกลุ่มวัย ทั้งเด็กเล็ก วัยเรียน วัยทำงาน ผู้สูงอายุ และผู้ป่วยติดเตียงที่ต้องการการดูแลต่อเนื่องที่บ้านโดยทีมสหวิชาชีพของเครือข่าย";

/** An address longer than two lines of a row at every width. */
const LONG_ADDRESS = `${SYNTHETIC_FIXTURE_MARK} ${"เลขที่ 123 หมู่ 1 ถนนสายหลักบ้านกลาง ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120 ".repeat(4)}`;

/**
 * The parts of a Health Service row a citizen meets, found by what they say and do: the tile by
 * its icon, the name by its heading, the map by its words.
 */
function rowParts(row: Locator) {
	return {
		tile: row.locator("svg.lucide-hospital").locator("xpath=.."),
		title: row.getByRole("heading", { level: 2 }),
		map: row.getByRole("link", { name: /^เปิดแผนที่/ }),
	};
}

/** A row's facts line, found by `fact`, the words of one of its facts. */
const factsLine = (row: Locator, fact: string) =>
	row.getByText(fact, { exact: true }).locator("xpath=..");

/** A fact on one line, which fits the line by itself. */
const one = { lines: 1, widerThanLine: false };

/** The row that follows `row` in its list, or none. */
const nextRow = (row: Locator) =>
	row.locator("xpath=ancestor::li[1]/following-sibling::li[1]").getByRole("article");

test("each /health-services row: the hospital tile, 68 px below 640 px and 92 px from 640 px; the facts line; the shown name as an H2 in two lines at most, linking to its page; the official name when the display name differs; the address in two lines at most at label size at every width; the name and the map its two links; rows 14 px apart", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const area = await createTerm("area", "ตำบลบ้านกลาง");
	const long = await createHealthService("row-long", {
		displayName: `ก${LONG_NAME}`,
		data: { address: LONG_ADDRESS, ...AT_SONG },
		taxonomies: { facility_type: [type.slug], area: [area.slug] },
	});
	const plain = await createHealthService("row-plain");
	for (const fixture of [long, plain]) await publish("health_services", fixture);

	await page.goto("/health-services");
	const row = listedItem(page, long.title);
	const parts = { ...rowParts(row), facts: factsLine(row, type.label) };
	// What today's rows already show: the name linking to the page, the facts, the official name.
	await expect(
		row.getByRole("link", { name: long.title, exact: true }),
		"the name links to the Health Service's page",
	).toHaveAttribute("href", `/health-services/${long.slug}`);
	await expect(parts.facts).toContainText(area.label);
	const official = row.getByText(long.officialName, { exact: true });
	const address = row.getByText(LONG_ADDRESS.trim());

	const tileOnce = async () => {
		if ((await parts.tile.count()) === 0) return undefined;
		return parts.tile.evaluate((tile) => ({
			decorative: tile.closest('[aria-hidden="true"]') !== null,
			gradient: getComputedStyle(tile).backgroundImage.includes("linear-gradient"),
			icon: [
				tile.querySelector("svg")?.getBoundingClientRect().width,
				getComputedStyle(tile.querySelector("svg") ?? tile).color,
			],
		}));
	};
	const [secondary, primary, accentWarm] = [
		await tokenColor(page, "text-secondary"),
		await tokenColor(page, "text-primary"),
		await tokenColor(page, "accent-warm"),
	];
	const seen: Record<string, unknown> = {
		tile: await tileOnce(),
		facts: await textStyle(parts.facts),
		titleColour: (await textStyle(parts.title.getByRole("link"))).colour,
		official: await textStyle(official),
		address: await textStyle(address),
		// A Health Service whose shown name is its official name shows it once.
		plainOfficial: await listedItem(page, plain.title)
			.locator("p", { hasText: plain.officialName })
			.count(),
		// The Facility Type and the Area, separated by a dot.
		factsParts: await parts.facts.evaluate((line) =>
			[...line.children].map((part) => part.textContent?.trim()),
		),
		surface: await row.evaluate((article) => {
			const style = getComputedStyle(article);
			return [style.backgroundColor, style.borderTopLeftRadius];
		}),
	};
	const expected: Record<string, unknown> = {
		tile: { decorative: true, gradient: true, icon: [24, accentWarm] },
		facts: { size: 13, weight: "400", colour: secondary, underline: false },
		// The name's colour and sizes as the Document row's (#315 comment 6908747140, item 1).
		titleColour: primary,
		official: { size: 13, weight: "400", colour: secondary, underline: false },
		address: { size: 14, weight: "500", colour: secondary, underline: false },
		plainOfficial: 0,
		factsParts: [type.label, "•", area.label],
		surface: [await tokenColor(page, "surface-base"), "22px"],
	};
	for (const width of [1440, 1024, 768, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const wide = width >= 640;
		const [upper, lower] = [
			await boxOf(row, "the first row"),
			await boxOf(nextRow(row), "the next row"),
		];
		const tile = (await parts.tile.count()) > 0 ? await boxOf(parts.tile, "the tile") : undefined;
		seen[width] = {
			tile: tile && [Math.round(tile.width), Math.round(tile.height)],
			titleSize: (await textStyle(parts.title)).size,
			// The name's link holds its lines, so its focus ring is not cut where they are.
			title: await shownLines(parts.title.getByRole("link")),
			address: (await address.isVisible()) ? await shownLines(address) : "hidden",
			links: await row.getByRole("link").count(),
			gap: Math.round(lower.y - (upper.y + upper.height)),
		};
		expected[width] = {
			tile: wide ? [92, 92] : [68, 68],
			titleSize: wide ? 18 : 16,
			title: { lines: 2, clamped: true },
			address: { lines: 2, clamped: true },
			links: 2,
			gap: 14,
		};
	}
	expect(seen, "the row's parts").toEqual(expected);
});

test("a row's facts line wraps between its facts, and inside a fact only when that fact alone is wider than the line", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const near = await createTerm("area", "ตำบลบ้านกลาง");
	const far = await createTerm(
		"area",
		"ตำบลที่มีชื่อพื้นที่รับผิดชอบยาวกว่าหนึ่งบรรทัดของแถวบนจอแคบและจอขนาดกลางของแท็บเล็ต",
	);
	const between = await createHealthService("facts-between", {
		displayName: "ก ข้อมูลตัดระหว่างกัน",
		taxonomies: { facility_type: [type.slug], area: [near.slug] },
	});
	const inside = await createHealthService("facts-inside", {
		displayName: "ก ข้อมูลตัดในข้อมูล",
		taxonomies: { area: [far.slug] },
	});
	for (const fixture of [between, inside]) await publish("health_services", fixture);

	await page.goto("/health-services");
	/** The line's lines, and each fact's lines and whether it alone is wider than the line. */
	const factsOf = (fixture: DraftFixture, fact: string) =>
		factsLine(listedItem(page, fixture.title), fact).evaluate((line) => {
			const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
			const facts = [...line.children].filter(
				(part) => part.getAttribute("aria-hidden") !== "true",
			);
			return {
				lines: Math.round(line.getBoundingClientRect().height / lineHeight),
				facts: facts.map((fact) => {
					// The fact on one line, in the line's own type.
					const alone = fact.cloneNode(true) as HTMLElement;
					alone.style.cssText = "position:absolute;white-space:nowrap;visibility:hidden";
					line.append(alone);
					const width = alone.getBoundingClientRect().width;
					alone.remove();
					return {
						lines: Math.round(fact.getBoundingClientRect().height / lineHeight),
						widerThanLine: width > line.clientWidth,
					};
				}),
			};
		});
	const seen: Record<number, unknown> = {};
	for (const width of [1440, 640]) {
		await page.setViewportSize({ width, height: 900 });
		seen[width] = {
			between: await factsOf(between, type.label),
			inside: await factsOf(inside, far.label),
		};
	}
	// A term's label opens with the suites' mark, so a synthetic fact is long: at 640 px the first
	// row's two facts fit the line apart, not together, and the second row's Area alone is wider.
	const expected = {
		1440: { between: { lines: 1, facts: [one, one] }, inside: { lines: 1, facts: [one] } },
		640: {
			between: { lines: 2, facts: [one, one] },
			inside: { lines: 2, facts: [{ lines: 2, widerThanLine: true }] },
		},
	};
	expect(seen, "where the facts line wraps").toEqual(expected);
});

test("a temporarily closed or an inactive Health Service's row shows its attention label on its own line between the facts and the name, and an active one shows none", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "สถานีอนามัย");
	const fields = (status: string) => ({
		data: { operational_status: status },
		taxonomies: { facility_type: [type.slug] },
	});
	const closed = await createHealthService("row-closed", {
		displayName: "ก ปิดชั่วคราว",
		...fields("temporarily_closed"),
	});
	const inactive = await createHealthService("row-inactive", {
		displayName: "ก ไม่เปิดแล้ว",
		...fields("inactive"),
	});
	const active = await createHealthService("row-active", {
		displayName: "ก เปิดอยู่",
		...fields("active"),
	});
	for (const fixture of [closed, inactive, active]) await publish("health_services", fixture);

	await page.goto("/health-services");
	await expect(listedItem(page, active.title)).not.toContainText(
		/เปิดให้บริการ|ปิดให้บริการชั่วคราว|ไม่เปิดให้บริการแล้ว/,
	);
	await expectAttentionLabelsOnOwnLine(
		page,
		(
			[
				[closed, "ปิดให้บริการชั่วคราว"],
				[inactive, "ไม่เปิดให้บริการแล้ว"],
			] as const
		).map(([fixture, label]) => {
			const row = listedItem(page, fixture.title);
			return { row, title: rowParts(row).title, facts: factsLine(row, type.label), label };
		}),
	);
});

test("a row's เปิดแผนที่ is a 44 px pill with a border-input edge, the 20 px map-pin before its semibold brand-primary words and the 16 px arrow-up-right after, named by the words, the shown name and (เปิดในแท็บใหม่), linking to the map address of its coordinates in a new tab; without both coordinates the row has no map link", async ({
	page,
}) => {
	const mapped = await createHealthService("map", {
		displayName: "ก มีแผนที่",
		data: AT_SONG,
	});
	const unmapped = await createHealthService("no-map", { displayName: "ก ไม่มีแผนที่" });
	const halfMapped = await createHealthService("half-map", {
		displayName: "ก มีแต่ละติจูด",
		data: { latitude: AT_SONG.latitude },
	});
	for (const fixture of [mapped, unmapped, halfMapped]) await publish("health_services", fixture);

	await page.goto("/health-services");
	const map = rowParts(listedItem(page, mapped.title)).map;
	const seen: Record<string, unknown> = {
		links: await map.count(),
		without: [
			await rowParts(listedItem(page, unmapped.title)).map.count(),
			await rowParts(listedItem(page, halfMapped.title)).map.count(),
		],
	};
	const expected: Record<string, unknown> = {
		links: 1,
		without: [0, 0],
		href: mapLinkOf(AT_SONG.latitude, AT_SONG.longitude),
		target: ["_blank", "noopener"],
		name: `เปิดแผนที่ ${mapped.title} (เปิดในแท็บใหม่)`,
		height: 44,
		edge: await tokenColor(page, "border-input"),
		words: { colour: await tokenColor(page, "brand-primary"), weight: "600" },
		order: ["map-pin 20", "เปิดแผนที่", "arrow-up-right 16"],
		// Across the row below 640 px, its icons and words sit in the pill's middle.
		centredAt375: true,
	};
	if ((await map.count()) === 1) {
		const style = await textStyle(map);
		Object.assign(seen, {
			href: await map.getAttribute("href"),
			target: [await map.getAttribute("target"), await map.getAttribute("rel")],
			name: await map.evaluate((link) => link.textContent?.replace(/\s+/g, " ").trim()),
			height: Math.round((await boxOf(map, "the map link")).height),
			edge: await map.evaluate((link) => getComputedStyle(link).borderTopColor),
			words: { colour: style.colour, weight: style.weight },
			// What shows in the pill, left to right: its icons by name and size, and its words.
			order: await map.evaluate((link) =>
				[...link.childNodes].flatMap((node) => {
					if (node instanceof SVGElement) {
						const icon = [...node.classList].find(
							(name) => name.startsWith("lucide-") && name !== "lucide-icon",
						);
						return [`${icon?.slice("lucide-".length)} ${node.getBoundingClientRect().width}`];
					}
					if (node instanceof HTMLElement && node.classList.contains("sr-only")) return [];
					const text = node.textContent?.trim();
					return text ? [text] : [];
				}),
			),
		});
		await page.setViewportSize({ width: 375, height: 900 });
		const [pill, pin, arrow] = [
			await boxOf(map, "the map link at 375 px"),
			await boxOf(map.locator("svg.lucide-map-pin"), "the map-pin"),
			await boxOf(map.locator("svg.lucide-arrow-up-right"), "the arrow"),
		];
		seen.centredAt375 =
			Math.abs((pin.x + arrow.x + arrow.width) / 2 - (pill.x + pill.width / 2)) <= 1;
		await expect(map).toHaveAccessibleName(expected.name as string);
		await expectVisuallyHidden(map.getByText(mapped.title), "the name in the map link");
	}
	expect(seen, "the row's map link").toEqual(expected);
});

test("a row's เปิดแผนที่ sits at the row's right from 1,024 px, under the text at its start from 640 px to 1,023 px, and across the row under the tile and the text below 640 px", async ({
	page,
}) => {
	const healthService = await createHealthService("map-place", {
		displayName: "ก ที่ของแผนที่",
		data: { address: `${SYNTHETIC_FIXTURE_MARK} 45 หมู่ 3 ตำบลบ้านกลาง อำเภอสอง`, ...AT_SONG },
	});
	await publish("health_services", healthService);

	await page.goto("/health-services");
	const row = listedItem(page, healthService.title);
	const { tile, title, map } = rowParts(row);
	await expect(row.getByRole("link", { name: healthService.title, exact: true })).toBeVisible();
	await expectSecondLinkPlaces(page, { row, tile, title, link: map }, "map link");
});

test("a row's name and map are its two focus stops; under the pointer its name turns brand-primary and underlined on its own link only, the row takes the deep shadow only when motion is allowed, and a press elsewhere on the row opens nothing", async ({
	page,
}) => {
	const word = `ก${crypto.randomUUID().slice(0, 6)}`;
	const first = await createHealthService("pointer-first", {
		displayName: `${word} 1`,
		data: AT_SONG,
	});
	const second = await createHealthService("pointer-second", { displayName: `${word} 2` });
	for (const fixture of [first, second]) await publish("health_services", fixture);
	/** Press `x`, `y` on `target` and say which address the page then shows. */
	const pressAt = (target: Locator, x: number, y: number, label: string) =>
		pressOpens(page, target, { x, y }, label, "/health-services");

	await page.goto("/health-services");
	const row = listedItem(page, first.title);
	const { tile, title, map } = rowParts(row);
	// Today's row has no tile: its official name stands in, so a red run reaches the last assertion.
	const away = (await tile.count()) === 1 ? tile : row.getByText(first.officialName);
	const nameLink = title.getByRole("link");
	const focused = (part: Locator) =>
		part.evaluate((element) => element === document.activeElement).catch(() => false);
	await nameLink.focus();
	await page.keyboard.press("Tab");
	const afterName = (await map.count()) === 1 && (await focused(map));
	await page.keyboard.press("Tab");
	const afterThat = await focused(
		listedItem(page, second.title).getByRole("heading", { level: 2 }).getByRole("link"),
	);

	await pointAt(page, away);
	const onTile = { name: await textStyle(nameLink), row: await rowShadow(row) };
	await pointAt(page, nameLink);
	const onName = await textStyle(nameLink);
	const awayBox = await boxOf(away, "the tile");
	const rowBox = await boxOf(row, "the row");
	const pressed = {
		tile: await pressAt(
			away,
			awayBox.x + awayBox.width / 2,
			awayBox.y + awayBox.height / 2,
			"the tile",
		),
		// Inside the row's rounded corner, 22 px across, where nothing is drawn but the row.
		corner: await pressAt(row, rowBox.x + rowBox.width - 12, rowBox.y + 12, "the row's corner"),
	};

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/health-services");
	await listedItem(page, first.title).scrollIntoViewIfNeeded();
	await expect
		.poll(() => shownOpacity(listedItem(page, first.title)), { message: "the row has come in" })
		.toBe(1);
	await pointAt(page, away);
	const moving = await rowShadow(listedItem(page, first.title));

	const [primary, text] = [
		await tokenColor(page, "brand-primary"),
		await tokenColor(page, "text-primary"),
	];
	expect(
		{ afterName, afterThat, onTile, onName, pressed, moving },
		"the row's links, under the pointer and the keyboard",
	).toEqual({
		// Tab goes from the name to its map, then to the next row's name.
		afterName: true,
		afterThat: true,
		onTile: {
			name: { size: 18, weight: "600", colour: text, underline: false },
			row: "card",
		},
		onName: { size: 18, weight: "600", colour: primary, underline: true },
		pressed: { tile: "/health-services", corner: "/health-services" },
		moving: "deep",
	});
});

test("the Area and name filters narrow /health-services alone and combined, and a shared filtered address reproduces the results", async ({
	page,
	browser,
}) => {
	const north = await createTerm("area", "ตำบลเหนือ");
	const south = await createTerm("area", "ตำบลใต้");
	const unused = await createTerm("area", "ตำบลที่ไม่มีหน่วยบริการ");
	const draftOnly = await createTerm("area", "ตำบลที่มีแต่ฉบับร่าง");
	// A word only this test's names contain, so a name filter selects exactly its fixtures.
	const word = `ทดสอบ${crypto.randomUUID().slice(0, 6)}`;
	const northClinic = await createHealthService("filter-north-clinic", {
		displayName: `ก รพ.สต.${word}เหนือ`,
		taxonomies: { area: [north.slug] },
	});
	const bothHospital = await createHealthService("filter-both-hospital", {
		displayName: `ข โรงพยาบาล${word}`,
		taxonomies: { area: [north.slug, south.slug] },
	});
	const southClinic = await createHealthService("filter-south-clinic", {
		displayName: `ค รพ.สต.${word}ใต้`,
		taxonomies: { area: [south.slug] },
	});
	await createHealthService("filter-draft", { taxonomies: { area: [draftOnly.slug] } });
	const all = [northClinic, bothHospital, southClinic];
	for (const fixture of all) await publish("health_services", fixture);

	await page.goto("/health-services");
	const filters = page.getByRole("form", { name: "ค้นหาหน่วยบริการ" });
	const areaField = filters.getByLabel("พื้นที่รับผิดชอบ");
	const nameField = filters.getByLabel("ชื่อหน่วยบริการ");
	const submit = async () => {
		await filters.getByRole("button", { name: "แสดงผล" }).click();
		await page.waitForLoadState();
	};
	const params = () => Object.fromEntries(new URL(page.url()).searchParams);

	const offered = (await areaField.locator("option").allTextContents()).map((text) => text.trim());
	expect(offered[0], "the first choice is no filter").toBe("ทุกพื้นที่");
	expect(offered).toEqual(expect.arrayContaining([north.label, south.label]));
	expect(offered, "an Area no Health Service uses is not offered").not.toContain(unused.label);
	expect(offered, "an Area only a draft uses is not offered").not.toContain(draftOnly.label);

	await areaField.selectOption({ label: north.label });
	await submit();
	expect(params()).toMatchObject({ area: north.slug });
	expect(ownTitles(await listedTitles(page), all), "by Area").toEqual([
		northClinic.title,
		bothHospital.title,
	]);
	await expect(areaField).toHaveValue(north.slug);

	await nameField.fill("รพ.สต.");
	await submit();
	expect(params()).toMatchObject({ area: north.slug, name: "รพ.สต." });
	expect(ownTitles(await listedTitles(page), all), "by Area and name").toEqual([northClinic.title]);
	await expect(nameField).toHaveValue("รพ.สต.");
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health-services?${new URLSearchParams({ area: north.slug, name: "รพ.สต." })}`,
	);

	const shared = page.url();
	const context = await browser.newContext();
	try {
		const other = await context.newPage();
		await other.goto(shared);
		expect(
			ownTitles(await listedTitles(other), all),
			"the shared address reproduces the results",
		).toEqual([northClinic.title]);
	} finally {
		await context.close();
	}

	await areaField.selectOption({ label: "ทุกพื้นที่" });
	await nameField.fill(word);
	await submit();
	expect(params()).toMatchObject({ area: "", name: word });
	expect(ownTitles(await listedTitles(page), all), "by name alone").toEqual(
		all.map((fixture) => fixture.title),
	);

	// The official name counts too, in any Latin case.
	await page.goto(`/health-services?name=${encodeURIComponent("FILTER-BOTH-HOSPITAL")}`);
	expect(ownTitles(await listedTitles(page), all), "by the official name").toEqual([
		bothHospital.title,
	]);

	await page.goto(`/health-services?area=${south.slug}`);
	expect(ownTitles(await listedTitles(page), all), "by the other Area").toEqual([
		bothHospital.title,
		southClinic.title,
	]);
	await filters.getByRole("link", { name: "ล้างตัวกรอง" }).click();
	await expect(page).toHaveURL("/health-services");
});

test("an unmatched filter shows the empty state, and a filtered directory pages through with its filters kept", async ({
	page,
}) => {
	const word = `หน้า${crypto.randomUUID().slice(0, 6)}`;
	const fixtures: DraftFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		fixtures.push(
			await createHealthService(`page-${index}`, {
				displayName: `${word} ${String(index).padStart(2, "0")}`,
			}),
		);
	}
	for (const fixture of fixtures) await publish("health_services", fixture);
	const byName = fixtures.map((fixture) => fixture.title);

	await page.goto(`/health-services?name=${encodeURIComponent(word)}`);
	expect(await listedTitles(page), "the first page").toEqual(byName.slice(0, PAGE_SIZE));
	await page
		.getByRole("navigation", { name: "การแบ่งหน้า" })
		.getByRole("link", { name: "หน้าถัดไป" })
		.click();
	await expect(page).toHaveURL(`/health-services?name=${encodeURIComponent(word)}&page=2`);
	expect(await listedTitles(page), "the second page").toEqual(byName.slice(PAGE_SIZE));
	await expect(
		page.getByRole("form", { name: "ค้นหาหน่วยบริการ" }).getByLabel("ชื่อหน่วยบริการ"),
	).toHaveValue(word);

	for (const path of [
		`/health-services?area=${syntheticSlug("no-such-area")}`,
		`/health-services?name=${encodeURIComponent(`ไม่มีชื่อนี้${word}`)}`,
	]) {
		const response = await page.goto(path);
		expect(response?.status(), `${path} is not an error`).toBe(200);
		await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
		await expect(page.getByRole("main").getByText("ไม่พบหน่วยบริการตามที่ค้นหา")).toBeVisible();
		await expect(
			page.getByRole("main").getByRole("link", { name: "ดูหน่วยบริการทั้งหมด" }),
		).toHaveAttribute("href", "/health-services");
	}
});

/** A synthetic Service draft, which a Health Service can offer. */
const createService = (label: string) => createSyntheticService(admin, label);

test("a Health Service page shows its shown name and its official name under it, type, affiliation, status, address, hours, contact, Area, map link and offered Services in staff order", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const area = await createTerm("area", "ตำบลบ้านกลาง");
	// Staff link "second" before "first": the page keeps that order, not the name order.
	const first = await createService("first");
	const second = await createService("second");
	const draftService = await createService("draft");
	await publish("services", first);
	await publish("services", second);
	const affiliation = `${SYNTHETIC_FIXTURE_MARK} องค์การบริหารส่วนจังหวัดแพร่`;
	const address = `${SYNTHETIC_FIXTURE_MARK} 12 หมู่ 3 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120`;
	const hours = `${SYNTHETIC_FIXTURE_MARK} จันทร์–ศุกร์ 08.30–16.30 น.`;
	const contact = `${SYNTHETIC_FIXTURE_MARK} โทร 054 000 000`;
	const healthService = await createHealthService("detail", {
		displayName: "รพ.สต.บ้านกลาง",
		data: {
			facility_code: "07999",
			affiliation_text: affiliation,
			operational_status: "temporarily_closed",
			address,
			opening_hours: hours,
			public_contact: contact,
			latitude: 18.12345,
			longitude: 100.12346,
		},
		taxonomies: { facility_type: [type.slug], area: [area.slug] },
		references: { offered_services: [second.id, draftService.id, first.id] },
	});
	await publish("health_services", healthService);

	const response = await page.goto(`/health-services/${healthService.slug}`);
	expect(response?.status(), "GET the Health Service page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(healthService.title);
	await expect(detailOf(page, "รหัสหน่วยบริการ")).toHaveText("07999");
	await expect(detailOf(page, "ประเภทหน่วยบริการ")).toHaveText(type.label);
	await expect(detailOf(page, "สังกัด")).toHaveText(affiliation);
	await expect(detailOf(page, "สถานะการให้บริการ")).toHaveText("ปิดให้บริการชั่วคราว");
	await expect(detailOf(page, "ที่ตั้ง")).toContainText("12 หมู่ 3 ตำบลบ้านกลาง");
	await expect(detailOf(page, "ที่ตั้ง")).toContainText("อำเภอสอง จังหวัดแพร่ 54120");
	await expect(detailOf(page, "เวลาทำการ")).toHaveText(hours);
	await expect(detailOf(page, "ช่องทางติดต่อ")).toHaveText(contact);
	await expect(
		detailOf(page, "พื้นที่รับผิดชอบ").getByRole("link", { name: area.label }),
	).toHaveAttribute("href", `/health-services?area=${area.slug}`);

	const map = detailOf(page, "ที่ตั้ง").getByRole("link", { name: /เปิดแผนที่/ });
	await expect(map).toHaveAttribute("href", mapLinkOf(18.12345, 100.12346));
	await expect(map).toHaveAttribute("target", "_blank");
	await expect(map).toHaveAttribute("rel", "noopener");
	await expect(main.locator("iframe, embed, object"), "no map is embedded").toHaveCount(0);

	const offered = main.getByRole("region", { name: "บริการที่ให้" });
	await expect(offered.getByRole("link", { name: first.title, exact: true })).toHaveAttribute(
		"href",
		`/services/${first.slug}`,
	);
	await expect(offered.getByText(draftService.title), "a draft Service is left out").toHaveCount(0);

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.services, ["หน่วยบริการสุขภาพที่เกี่ยวข้อง", "/health-services"]],
		healthService.title,
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");

	const body = await page.content();
	for (const word of ["ใกล้บ้าน", "ในพื้นที่"]) {
		expect(body.includes(word), `a Health Service page never says "${word}"`).toBe(false);
	}

	// Since #345 the page opens on the deep field, its official name under the H1 and out of the
	// card, and its Services are cards named by H3s, in the order staff linked them.
	expect({
		field: await deepField(page).count(),
		under: await fieldParts(page).header.locator("h1 ~ p").allInnerTexts(),
		officialNameTerm: await main.getByRole("term").filter({ hasText: "ชื่อทางการ" }).count(),
		services: await offered.getByRole("heading", { level: 3 }).allInnerTexts(),
	}).toEqual({
		field: 1,
		under: [healthService.officialName],
		officialNameTerm: 0,
		services: [second.title, first.title],
	});
});

test("a Health Service page leaves out what is not set, and the map link without both coordinates", async ({
	page,
}) => {
	const minimal = await createHealthService("minimal");
	const latitudeOnly = await createHealthService("latitude-only", {
		data: { address: `${SYNTHETIC_FIXTURE_MARK} ที่อยู่ไม่มีพิกัด`, latitude: 18.1 },
	});
	const inactive = await createHealthService("inactive-detail", {
		data: { operational_status: "inactive", latitude: 18.1, longitude: 100.1 },
	});
	for (const fixture of [minimal, latitudeOnly, inactive])
		await publish("health_services", fixture);

	await page.goto(`/health-services/${minimal.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(minimal.title);
	for (const name of [
		"ชื่อทางการ",
		"รหัสหน่วยบริการ",
		"ประเภทหน่วยบริการ",
		"สังกัด",
		"สถานะการให้บริการ",
		"ที่ตั้ง",
		"เวลาทำการ",
		"ช่องทางติดต่อ",
		"พื้นที่รับผิดชอบ",
	]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
	await expect(main.getByRole("region", { name: "บริการที่ให้" })).toHaveCount(0);

	await page.goto(`/health-services/${latitudeOnly.slug}`);
	await expect(detailOf(page, "ที่ตั้ง")).toHaveText(`${SYNTHETIC_FIXTURE_MARK} ที่อยู่ไม่มีพิกัด`);
	await expect(main.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);

	await page.goto(`/health-services/${inactive.slug}`);
	await expect(detailOf(page, "สถานะการให้บริการ")).toHaveText("ไม่เปิดให้บริการแล้ว");
	await expect(
		detailOf(page, "ที่ตั้ง").getByRole("link", { name: /เปิดแผนที่/ }),
		"coordinates alone give the map link",
	).toHaveAttribute("href", mapLinkOf(18.1, 100.1));
});

test.describe("a Health Service's page on the field", () => {
	type WithServices = HealthServiceFixture & { services: DraftFixture[] };
	/**
	 * Shown by its display name, closed for now, with every detail: a two-line address with
	 * coordinates, hours, contact, two Areas, and three Services linked out of their names' order,
	 * one with a name long enough to wrap.
	 */
	let full: WithServices & { type: SyntheticTerm; areas: SyntheticTerm[] };
	/** Inactive, shown by its official name, its address without coordinates, two Services. */
	let inactive: WithServices;
	/** Open, its location with coordinates, one Service. */
	let active: WithServices;
	/** Its code and Facility Type alone: the details without a location, no status. */
	let noLocation: HealthServiceFixture;
	/** Its address and coordinates alone: the location without the details. */
	let locationOnly: HealthServiceFixture;
	/** Nothing set: no row of pills, no card and no Services. */
	let bare: HealthServiceFixture;
	let type: SyntheticTerm;
	const pathOf = (fixture: DraftFixture) => `/health-services/${fixture.slug}`;
	const text = (words: string) => `${SYNTHETIC_FIXTURE_MARK} ${words}`;
	const ADDRESS = text("45 หมู่ 3 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120");
	const DETAILS = ["รหัสหน่วยบริการ", "ประเภทหน่วยบริการ", "สังกัด", "สถานะการให้บริการ"];
	const LOCATION = ["ที่ตั้ง", "เวลาทำการ", "ช่องทางติดต่อ"];
	const OFFERED = { label: "บริการ", title: "บริการที่ให้" };

	/** A published Service for each label, in the order given; "field-long" has a long name. */
	const publishedServices = async (labels: string[]) => {
		const services = [];
		for (const label of labels) {
			const service = await createSyntheticService(admin, label, {
				name:
					label === "field-long"
						? "บริการตรวจคัดกรองและติดตามดูแลผู้ป่วยโรคเรื้อรังที่บ้าน"
						: "บริการ",
			});
			await publish("services", service);
			services.push(service);
		}
		return services;
	};

	test.beforeAll(async () => {
		type = await createTerm("facility_type", "โรงพยาบาลชุมชน");
		const areas = [
			await createTerm("area", "ตำบลบ้านกลาง"),
			await createTerm("area", "ตำบลห้วยหม้าย"),
		];
		// Linked third, first, second: the page keeps the order staff linked them.
		const services = await publishedServices(["field-third", "field-long", "field-second"]);
		full = {
			...(await createHealthService("field-full", {
				displayName: "รพ.สต.บ้านกลาง",
				data: {
					facility_code: "07998",
					affiliation_text: text("องค์การบริหารส่วนจังหวัดแพร่"),
					operational_status: "temporarily_closed",
					address: ADDRESS,
					opening_hours: text("จันทร์–ศุกร์ 08.30–16.30 น."),
					public_contact: text("โทร 054 000 000"),
					...AT_SONG,
				},
				taxonomies: { facility_type: [type.slug], area: areas.map((area) => area.slug) },
				references: { offered_services: services.map((service) => service.id) },
			})),
			services,
			type,
			areas,
		};
		const two = await publishedServices(["field-inactive-1", "field-inactive-2"]);
		inactive = {
			...(await createHealthService("field-inactive", {
				data: { operational_status: "inactive", address: text("ที่ตั้งเดิม ตำบลสอง") },
				taxonomies: { facility_type: [type.slug] },
				references: { offered_services: two.map((service) => service.id) },
			})),
			services: two,
		};
		const one = await publishedServices(["field-active"]);
		active = {
			...(await createHealthService("field-active", {
				data: { operational_status: "active", address: text("1 หมู่ 1 ตำบลสอง"), ...AT_SONG },
				taxonomies: { facility_type: [type.slug] },
				references: { offered_services: one.map((service) => service.id) },
			})),
			services: one,
		};
		noLocation = await createHealthService("field-no-location", {
			data: { facility_code: "07997" },
			taxonomies: { facility_type: [type.slug] },
		});
		locationOnly = await createHealthService("field-location-only", {
			data: { address: text("2 หมู่ 2 ตำบลสอง"), ...AT_SONG },
		});
		bare = await createHealthService("field-bare");
		for (const fixture of [full, inactive, active, noLocation, locationOnly, bare]) {
			await publish("health_services", fixture);
		}
	});

	test("the page opens on the deep field: the breadcrumb in white, 24 px under it its Facility Type in an outlined white pill and, only when it is temporarily closed or inactive, its status in an accent-warm pill, then its shown name as the page's one H1 in today's sizes and, only when the display name differs, its official name under it, each on the field, 48 rem wide at most; without a pill the row is left out", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		// What today's page already shows: one H1 in its sizes.
		await page.goto(pathOf(full));
		await expectPostTitleSizes(page);
		const { seen, expected } = await readHeaderOnField(page, {
			pills: [
				{ words: type.label, look: "outlined" },
				{ words: "ปิดให้บริการชั่วคราว", look: "warm" },
			],
			under: { text: full.officialName, lines: 1 },
		});
		const onField = seen.field === true;
		seen.title = onField && (await parts.title.innerText());
		expected.title = full.title;

		/** The words of the header's row of pills, or "no pill", and its lines under the title. */
		const header = async () => {
			const pill = parts.field.getByText(type.label, { exact: true });
			return {
				row:
					(await pill.count()) === 1
						? await pill.locator("xpath=..").locator("span").allInnerTexts()
						: "no pill",
				under: await parts.header.locator("h1 ~ p").count(),
			};
		};
		for (const [fixture, row] of [
			[inactive, [type.label, "ไม่เปิดให้บริการแล้ว"]],
			[active, [type.label]],
			// No status at all: the type alone.
			[noLocation, [type.label]],
		] as const) {
			await page.goto(pathOf(fixture));
			seen[fixture.title] = onField && (await header());
			// Shown by its official name: nothing under the title.
			expected[fixture.title] = { row, under: 0 };
		}

		// Neither a type nor a status: no row of pills, the title 24 px under the breadcrumb.
		await page.goto(pathOf(bare));
		const bareHeader = await readHeaderOnField(page, { pills: [] });
		seen.bare = bareHeader.seen;
		expected.bare = bareHeader.expected;
		expect(seen, "the header on the field").toEqual(expected);
	});

	test("the card starts 48 px above the field's lower edge below 640 px and 56 px from 640 px, where the header ends 80 and 96 px above it: white, radius 24, the deep shadow, 20 px inside, in the text column at most 48 rem wide; it holds first the location (ที่ตั้ง with the address and เปิดแผนที่ under it, named with the Health Service, เวลาทำการ, ช่องทางติดต่อ), then 20 px under it a 1 px border-default rule and 20 px under that the details (code, Facility Type, affiliation, status, Areas linking to the filtered directory), each row only when set; without a location the details alone and without the details the location alone, without the rule; a Health Service with neither has no card; nothing is past the window at 375 or 320 px", async ({
		page,
	}) => {
		const widths = [320, 375, 639, 640, 1440];
		const parts = fieldParts(page);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		const ruleColour = await (async () => {
			await page.goto(pathOf(full));
			return tokenColor(page, "border-default");
		})();
		for (const [fixture, terms, rule] of [
			[full, [...LOCATION, ...DETAILS, "พื้นที่รับผิดชอบ"], true],
			[inactive, ["ที่ตั้ง", "ประเภทหน่วยบริการ", "สถานะการให้บริการ"], true],
			[noLocation, ["รหัสหน่วยบริการ", "ประเภทหน่วยบริการ"], false],
			[locationOnly, ["ที่ตั้ง"], false],
		] as const) {
			await page.goto(pathOf(fixture));
			const past: number[] = [];
			for (const width of [375, 320]) {
				await page.setViewportSize({ width, height: 900 });
				past.push(
					await page.evaluate(
						() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
					),
				);
			}
			const card = await cardOverFieldEdge(page, widths);
			const lists = parts.card.locator("dl");
			const separator = parts.card.getByRole("separator");
			const ruleRead = async () => {
				if ((await separator.count()) !== 1 || (await lists.count()) !== 2) {
					return { rules: await separator.count(), lists: await lists.count() };
				}
				const line = await boxOf(separator, "the rule");
				const location = await boxOf(lists.first(), "the location");
				const details = await boxOf(lists.last(), "the details");
				return {
					aboveRule: Math.round(line.y - location.y - location.height),
					underRule: Math.round(details.y - line.y - line.height),
					edge: await separator.evaluate((element) => {
						const style = getComputedStyle(element);
						return [style.borderTopWidth, style.borderTopStyle, style.borderTopColor];
					}),
				};
			};
			seen[fixture.title] = {
				card,
				past,
				inCard: card !== "no card" && {
					terms: await parts.card.getByRole("term").allInnerTexts(),
					rule: await ruleRead(),
				},
			};
			expected[fixture.title] = {
				card: await cardOverFieldEdgeAsSpecified(page, widths),
				past: [0, 0],
				inCard: {
					terms,
					rule: rule
						? { aboveRule: 20, underRule: 20, edge: ["1px", "solid", ruleColour] }
						: { rules: 0, lists: 1 },
				},
			};
		}

		// The location's map: today's pill without a map-pin, 12 px under the address, 44 px high,
		// named with the Health Service.
		await page.goto(pathOf(full));
		const place = detailOf(page, "ที่ตั้ง");
		const map = place.getByRole("link", { name: /^เปิดแผนที่/ });
		const address = place.getByText(ADDRESS.split("\n")[0]!).first();
		for (const width of [320, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const shown = (await map.count()) === 1;
			seen[`map ${at}`] = shown && {
				underAddress: Math.round(
					(await boxOf(map, `${at}: the map`)).y -
						(await boxOf(address, `${at}: the address`)).y -
						(await boxOf(address, `${at}: the address`)).height,
				),
				height: Math.round((await boxOf(map, `${at}: the map`)).height),
			};
			expected[`map ${at}`] = { underAddress: 12, height: 44 };
		}
		seen.map = {
			named: await place
				.getByRole("link", { name: `เปิดแผนที่ ${full.title} (เปิดในแท็บใหม่)`, exact: true })
				.count(),
			pins: await map.locator("svg.lucide-map-pin").count(),
			address: await address.evaluate((element) => element.textContent),
		};
		expected.map = { named: 1, pins: 0, address: ADDRESS };
		seen.areaLinks = (
			await detailOf(page, "พื้นที่รับผิดชอบ")
				.getByRole("link")
				.evaluateAll((links) =>
					links.map(
						(link) => `${link.getAttribute("href")} ${link.getBoundingClientRect().height}`,
					),
				)
		).sort();
		// TermLinks' 44 px targets, each to the directory filtered by its Area.
		expected.areaLinks = full.areas.map((area) => `/health-services?area=${area.slug} 44`).sort();

		// The status: the attention label out of service, the plain label when open.
		const statusFill = () =>
			detailOf(page, "สถานะการให้บริการ")
				.locator("span")
				.evaluate((label) => getComputedStyle(label).backgroundColor);
		const attention = await tokenColor(page, "accent-warm");
		seen.status = { [full.title]: await statusFill() };
		for (const fixture of [inactive, active]) {
			await page.goto(pathOf(fixture));
			(seen.status as Record<string, string>)[fixture.title] = await statusFill();
		}
		expected.status = {
			[full.title]: attention,
			[inactive.title]: attention,
			[active.title]: await tokenColor(page, "surface-soft"),
		};

		// Nothing set: no card; the field is as high as the header.
		await page.goto(pathOf(bare));
		seen.bare = { field: await parts.field.count(), cards: await parts.card.count() };
		expected.bare = { field: 1, cards: 0 };
		for (const width of [375, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			if ((await parts.field.count()) === 0) break;
			const label = `${bare.title} at ${width} px`;
			const edge = await fieldEdge(parts.field, label);
			const title = await boxOf(parts.title, `${label}: the title`);
			seen[`bare at ${width}`] = Math.round(edge - title.y - title.height);
			expected[`bare at ${width}`] = width < 640 ? 40 : 48;
		}
		expect(seen, "the card over the field's edge").toEqual(expected);
	});

	test("under the card บริการที่ให้ follows 32 px below 1,024 px and 40 px from 1,024 px, in the text column, under the Homepage's section heading (the users tile, the label บริการ, the H2), its Service cards 24 px under the heading below 640 px and 28 px from 640 px, names H3, two to a row from 640 px and one below at one, two and three Services, 20 px apart from 640 px and 12 px below, resting with the card shadow", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		const region = page.getByRole("main").getByRole("region", { name: OFFERED.title });
		const heading = region.getByRole("heading", { level: 2, name: OFFERED.title });
		const label = region.getByText(OFFERED.label, { exact: true });
		const tile = region.locator("svg.lucide-users").first().locator("xpath=..");
		const items = region.getByRole("listitem");
		const surfaces = region.getByTestId("service-surface");
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		await page.goto(pathOf(full));
		const hasLabel = (await label.count()) === 1;
		seen.heading = {
			label: hasLabel && (await label.evaluate((element) => getComputedStyle(element).color)),
			tile: hasLabel && {
				hidden: await tile.getAttribute("aria-hidden"),
				gradient: await tile.evaluate((element) =>
					getComputedStyle(element).backgroundImage.startsWith("linear-gradient"),
				),
			},
			h3: await region.getByRole("heading", { level: 3 }).count(),
			resting: await surfaces.evaluateAll((elements) =>
				elements.map((element) => getComputedStyle(element).boxShadow),
			),
		};
		const cardShadow = await tokenShadow(page, "card");
		expected.heading = {
			label: await tokenColor(page, "brand-primary"),
			tile: { hidden: "true", gradient: true },
			h3: 3,
			resting: [cardShadow, cardShadow, cardShadow],
		};

		for (const fixture of [active, inactive, full]) {
			await page.goto(pathOf(fixture));
			const count = fixture.services.length;
			for (const width of [320, 639, 640, 1023, 1024, 1440]) {
				await page.setViewportSize({ width, height: 900 });
				const at = `${count} at ${width} px`;
				if ((await items.count()) !== count || !hasLabel) break;
				const card = await boxOf(parts.card, `${at}: the card`);
				const section = await boxOf(region, `${at}: the section`);
				const head = await boxOf(heading, `${at}: the H2`);
				const tileBox = await boxOf(tile, `${at}: the tile`);
				const labelBox = await boxOf(label, `${at}: the label`);
				const boxes = [];
				for (let index = 0; index < count; index += 1) {
					boxes.push(await boxOf(items.nth(index), `${at}: Service ${index + 1}`));
				}
				const [first, second] = boxes;
				seen[at] = {
					underCard: Math.round(section.y - card.y - card.height),
					column: [Math.round(section.x - card.x), Math.round(section.width) <= HEADER_WIDEST],
					labelAboveHeading: labelBox.y < head.y,
					tileBeforeHeading: tileBox.x + tileBox.width <= head.x,
					cardsUnderHeading: Math.round(
						first!.y - Math.max(tileBox.y + tileBox.height, head.y + head.height),
					),
					perRow: await itemsPerRow(items),
					apart:
						second &&
						(Math.abs(second.y - first!.y) <= 1
							? Math.round(second.x - first!.x - first!.width)
							: Math.round(second.y - first!.y - first!.height)),
				};
				const rows = width < 640 ? Array(count).fill(1) : count === 3 ? [2, 1] : [count];
				expected[at] = {
					underCard: width < 1024 ? 32 : 40,
					column: [0, true],
					labelAboveHeading: true,
					tileBeforeHeading: true,
					cardsUnderHeading: width < 640 ? 24 : 28,
					perRow: rows,
					apart: count > 1 ? (width < 640 ? 12 : 20) : undefined,
				};
			}
		}

		// Each card is the catalog's, named by its H3, the card shadow at rest and deep under the
		// pointer; read only where the page shows cards, so a red run reaches the reads above.
		await page.goto(pathOf(full));
		const cards = region.getByRole("article");
		seen.cards = await cards.count();
		expected.cards = 3;
		if (seen.cards === 3) {
			await expectServiceCardInteraction(page, cards.first(), full.services[0]!.title, 3);
		}
		expect(seen, "บริการที่ให้ under the card").toEqual(expected);
	});

	test("with motion allowed the header rises in as the page opens and the card after it, while the breadcrumb and บริการที่ให้ with its cards show at once", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		const region = page.getByRole("main").getByRole("region", { name: OFFERED.title });
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(full), { waitUntil: "commit" });
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		const onField = (await parts.field.count()) === 1 && (await parts.card.count()) === 1;
		const headerEnters = onField ? await entersAfter(parts.title) : "no field";
		/** When `part` starts to enter, or "missing" for a part the page does not show. */
		const enters = async (part: Locator) =>
			(await part.count()) === 1 ? await entersAfter(part) : "missing";
		const seen = {
			title: headerEnters,
			cardAfterHeader: onField && (await entersAfter(parts.card)) > Number(headerEnters),
			breadcrumb: onField ? await entersAfter(parts.breadcrumb) : "no field",
			section: await enters(region),
			card: await enters(region.getByRole("listitem").first()),
		};
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(seen, "the header and the card rise in; the rest shows at once").toEqual({
			title: 0,
			cardAfterHeader: true,
			breadcrumb: -1,
			section: -1,
			card: -1,
		});
	});
});

test.describe("a Health Service's page without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("a Health Service's page shows its header on the field, its card with the location, the map and the details, and its Services as cards", async ({
		page,
	}) => {
		const type = await createTerm("facility_type", "สถานีอนามัย");
		const area = await createTerm("area", "ตำบลไม่ใช้สคริปต์");
		const service = await createService("no-script");
		await publish("services", service);
		const healthService = await createHealthService("no-script", {
			displayName: "รพ.สต.ไม่ใช้สคริปต์",
			data: {
				operational_status: "temporarily_closed",
				address: `${SYNTHETIC_FIXTURE_MARK} 3 หมู่ 3 ตำบลสอง`,
				...AT_SONG,
			},
			taxonomies: { facility_type: [type.slug], area: [area.slug] },
			references: { offered_services: [service.id] },
		});
		await publish("health_services", healthService);

		await page.goto(`/health-services/${healthService.slug}`);
		const parts = fieldParts(page);
		const region = page.getByRole("main").getByRole("region", { name: "บริการที่ให้" });
		const read: Array<[string, Locator]> = [
			["the title", parts.title],
			["the type's pill", parts.field.getByText(type.label, { exact: true })],
			["the status's pill", parts.field.getByText("ปิดให้บริการชั่วคราว", { exact: true })],
			["the official name", parts.header.locator("h1 ~ p")],
			["the card", parts.card],
			["the map", detailOf(page, "ที่ตั้ง").getByRole("link", { name: /^เปิดแผนที่/ })],
			["the Area", detailOf(page, "พื้นที่รับผิดชอบ").getByRole("link")],
			["the section's H2", region.getByRole("heading", { level: 2 })],
			["the Service's card", region.getByRole("heading", { level: 3, name: service.title })],
		];
		const seen: Record<string, boolean> = {};
		for (const [name, part] of read) seen[name] = await shownWhole(part);
		expect(seen, "each part shows whole without JavaScript").toEqual(
			Object.fromEntries(read.map(([name]) => [name, true])),
		);
	});
});

test("a draft, unpublished or trashed Health Service answers the site 404, and a signed preview renders a draft", async ({
	page,
}) => {
	const draft = await createHealthService("hidden-draft");
	const unpublished = await createHealthService("hidden-unpublished");
	const trashed = await createHealthService("hidden-trashed");
	await publish("health_services", unpublished);
	await publish("health_services", trashed);
	expect((await unpublishEntry(admin, "health_services", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_services", trashed.id)).ok, "trash").toBe(true);
	for (const fixture of [draft, unpublished, trashed]) {
		await expectSiteNotFound(page, `/health-services/${fixture.slug}`, fixture.title);
	}

	await expectPreviewRenders(
		page,
		admin,
		"health_services",
		draft,
		`/health-services/${draft.slug}`,
	);
});

test("the directory pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const plain = await createHealthService("seo-plain", { displayName: "รพ.สต.ค้นหาได้" });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อหน่วยบริการสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายหน่วยบริการจากช่อง SEO`;
	const tuned = await createHealthService("seo-tuned", {
		seo: { title: seoTitle, description: seoDescription },
	});
	await publish("health_services", plain);
	await publish("health_services", tuned);

	await page.goto(`/health-services/${plain.slug}`);
	await expect(page).toHaveTitle(`${plain.title}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute(
		"content",
		`ที่อยู่ เวลาทำการ ช่องทางติดต่อ และบริการของ ${plain.title}`,
	);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health-services/${plain.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plain.title);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/health-services/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);

	await page.goto("/health-services?page=1");
	await expect(page).toHaveTitle(`หน่วยบริการสุขภาพที่เกี่ยวข้อง${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/health-services`);
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const type = await createTerm("facility_type", "โรงพยาบาลชุมชน");
		const area = await createTerm("area", "ตำบลสอง");
		const service = await createService("a11y");
		await publish("services", service);
		const detailed = await createHealthService("a11y", {
			displayName: "โรงพยาบาลสอง",
			data: {
				affiliation_text: `${SYNTHETIC_FIXTURE_MARK} สำนักงานปลัดกระทรวงสาธารณสุข`,
				operational_status: "temporarily_closed",
				address: `${SYNTHETIC_FIXTURE_MARK} 1 หมู่ 1 ตำบลสอง อำเภอสอง จังหวัดแพร่`,
				opening_hours: `${SYNTHETIC_FIXTURE_MARK} ทุกวัน 24 ชั่วโมง`,
				public_contact: `${SYNTHETIC_FIXTURE_MARK} โทร 054 000 001`,
				latitude: 18.48,
				longitude: 100.19,
			},
			taxonomies: { facility_type: [type.slug], area: [area.slug] },
			references: { offered_services: [service.id] },
		});
		await publish("health_services", detailed);
		const minimal = await createHealthService("a11y-minimal");
		await publish("health_services", minimal);
		paths = [
			"/health-services",
			`/health-services?area=${area.slug}&name=${encodeURIComponent("โรงพยาบาล")}`,
			`/health-services?area=${syntheticSlug("no-such-area")}`,
			`/health-services/${detailed.slug}`,
			`/health-services/${minimal.slug}`,
		];
	});

	testAccessibilityAndReflow("the directory pages", () => paths);
});
