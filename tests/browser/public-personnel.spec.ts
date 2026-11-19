// Leadership and Personnel pages (#61; spec #51 "Public reads" (About), `03` §5, GLOSSARY
// Personnel and Leadership).
//
// /about/leadership lists the publicly visible Personnel that have a Leadership order, ascending,
// with ties broken by name. /about/personnel lists the publicly visible Personnel by organizational
// unit in Thai order, each unit's people by name. Each person shows their profile image, prefix and
// name, position and unit, and their public contact only when it is set. Personnel is
// non-routable, so nothing links to a per-person address, and a person with `public_visible` off
// or unset appears on neither page.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Personnel made through the native API the way the Admin makes
// them, and removed afterwards. Units and names carry the synthetic mark and a per-test ending, so
// the runtime's own Personnel (the demo dataset's, the Product Owner's) never change what the
// assertions read. The empty states need none of the runtime's own Personnel visible, so that test
// borrows them (public.helpers.ts BorrowedEntries).
//
// /about/leadership opens on the list's deep field (Feature 012 #367; spec #365 decisions 4, 8, 9
// and 11, "Leadership"): the label บุคลากร over the H1, the first leader in a featured card across
// the row and the others in white cards, each with the Homepage Leadership strip's ringed circle
// (public.helpers.ts ringedCircle), over the field's lower edge.
//
// Thai order puts a leading vowel by the consonant after it: เกด before ขวัญ, เกษตร before ขนส่ง.
// Code point order reverses both, so the fixtures tell the two apart.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticPerson,
	deleteMedia,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticMedia,
	visiblePublishedPersonnel,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	LIST_FIELD_LOOK,
	OFF_CENTRE_CROP,
	OFF_CENTRE_FOCAL_POINT,
	SECTION_CRUMBS,
	boxOf,
	cardList,
	entersAfter,
	expect,
	expectAboutSubpage,
	expectAccessibleAtEachWidth,
	expectBlocksOverFieldEdge,
	expectCrop,
	expectImageLoaded,
	expectListMovesOnlyWhenAllowed,
	expectNoHorizontalScroll,
	expectSiteNotFound,
	expectStartsOverFieldEdge,
	itemsPerRow,
	listHeading,
	listedItem,
	listedTitles,
	ownTitles,
	readListField,
	ringedCircle,
	shownOpacity,
	shownWhole,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testHeadingOnField,
	textStyle,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

const LEADERSHIP = { path: "/about/leadership", title: "ผู้บริหาร" } as const;

/** What the Leadership page's heading on the deep field reads (spec #365 decision 4). */
const LEADERSHIP_HEADING = {
	label: "บุคลากร",
	title: LEADERSHIP.title,
	lead: "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง",
} as const;
const PERSONNEL = { path: "/about/personnel", title: "บุคลากร" } as const;

/** What the Personnel page's heading on the deep field reads (spec #365 decision 4). */
const PERSONNEL_HEADING = {
	label: "เกี่ยวกับเรา",
	title: PERSONNEL.title,
	lead: "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน",
} as const;
const PAGES = [LEADERSHIP, PERSONNEL] as const;

/** The heading of the Personnel whose unit is not set. */
const NO_UNIT = "ไม่ระบุหน่วยงาน";

/** The label above a person's public contact. */
const CONTACT_LABEL = "ช่องทางติดต่อ";

let admin: CmsActor;

const borrowed = new BorrowedEntries();

/** A text unique to this test run, marked synthetic: `${mark} ${words} ${ending}`. */
const marked = (words: string, ending: string) => `${SYNTHETIC_FIXTURE_MARK} ${words} ${ending}`;

/** A synthetic, publicly visible Personnel draft named `${mark} ${name} ${ending}`. */
const createPerson = (name: string, data?: Record<string, unknown>) =>
	createSyntheticPerson(admin, name, data);

/** Borrow the runtime's own visible Personnel, so the test's leaders are the only ones shown. */
async function borrowPersonnel(): Promise<void> {
	for (const id of await visiblePublishedPersonnel(admin))
		await borrowed.borrow(admin, "personnel", id);
}

async function publish(...people: DraftFixture[]): Promise<void> {
	for (const person of people) {
		await publishEntryAt(admin, "personnel", person.id);
	}
}

/** The unit headings /about/personnel shows, in order. */
async function unitHeadings(page: Page): Promise<string[]> {
	return (await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents()).map(
		(text) => text.trim(),
	);
}

/** The section of /about/personnel for `unit`. */
function unitSection(page: Page, unit: string) {
	return page.getByRole("main").getByRole("region", { name: unit, exact: true });
}

/** The names a unit's section shows, in order. */
async function namesIn(page: Page, unit: string): Promise<string[]> {
	return (
		await unitSection(page, unit).getByRole("article").getByRole("heading").allTextContents()
	).map((text) => text.trim());
}

/** Fail unless the page is the About sub-page `title` at `path`, headed and titled `title`. */
async function expectPersonnelPage(page: Page, path: string, title: string): Promise<void> {
	const { siteTitle, separator } = await siteTitleParts(admin);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
	await expect(page).toHaveTitle(`${title}${separator}${siteTitle}`);
	await expectAboutSubpage(page, path, title);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
});

test.afterEach(async () => {
	await borrowed.giveBack(admin);
});

test.afterAll(() => removeSuiteFixtures(admin));

test("/about/leadership and /about/personnel show their empty states while no publicly visible Personnel is published", async ({
	page,
}) => {
	await borrowPersonnel();
	const hidden = await createPerson("ซ่อน", { public_visible: false, leadership_order: 1 });
	await publish(hidden);

	for (const [{ path, title }, message] of [
		[LEADERSHIP, "ยังไม่มีข้อมูลผู้บริหาร"],
		[PERSONNEL, "ยังไม่มีข้อมูลบุคลากร"],
	] as const) {
		const response = await page.goto(path);
		expect(response?.status(), `GET ${path}`).toBe(200);
		await expectPersonnelPage(page, path, title);
		await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
		await expect(page.getByRole("main").getByText(message)).toBeVisible();
		await expectAccessibleAtEachWidth(page, `${path} empty`);
	}

	// Each page's empty state lies over the field's lower edge, as a list's does, and shows at once
	// with motion allowed (Feature 012 #367, #370; spec #365 decision 9, "Motion").
	await page.emulateMedia({ reducedMotion: "no-preference" });
	const emptyState = async (path: string, message: string) => {
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.goto(path);
		const state = page.getByRole("main").getByText(message, { exact: true });
		await expect(state).toBeVisible();
		expect(await entersAfter(state), `${path}: the empty state shows at once`).toBe(-1);
		// The message's white card is the block that follows the heading.
		return state.locator("xpath=..");
	};
	const leadership = await emptyState(LEADERSHIP.path, "ยังไม่มีข้อมูลผู้บริหาร");
	await expectStartsOverFieldEdge(page, leadership, `${LEADERSHIP.path}: the message's card`);
	const personnel = await emptyState(PERSONNEL.path, "ยังไม่มีข้อมูลบุคลากร");
	await expectStartsOverFieldEdge(page, personnel, `${PERSONNEL.path}: the message's card`);
});

test("/about/leadership lists the publicly visible Personnel with a Leadership order, ascending with ties by name in Thai order", async ({
	page,
}) => {
	const chief = await createPerson("สมหญิง", { leadership_order: 1 });
	const khwan = await createPerson("ขวัญ", { leadership_order: 2 });
	const ked = await createPerson("เกด", { leadership_order: 2 });
	const tenth = await createPerson("กมล", { leadership_order: 10 });
	const staff = await createPerson("อรุณ");
	const hidden = await createPerson("ซ่อน", { public_visible: false, leadership_order: 1 });
	const unset = await createPerson("ไม่ตั้งค่า", { public_visible: null, leadership_order: 1 });
	const draft = await createPerson("ร่าง", { leadership_order: 1 });
	await publish(tenth, staff, khwan, hidden, unset, chief, ked);
	const all = [chief, khwan, ked, tenth, staff, hidden, unset, draft];

	const response = await page.goto(LEADERSHIP.path);
	expect(response?.status(), `GET ${LEADERSHIP.path}`).toBe(200);
	await expectPersonnelPage(page, LEADERSHIP.path, LEADERSHIP.title);
	expect(
		ownTitles(await listedTitles(page), all),
		"Leadership order, 10 after 2, and เกด before ขวัญ at the same order",
	).toEqual([chief, ked, khwan, tenth].map((person) => person.title));
});

test("/about/personnel groups the publicly visible Personnel by unit in Thai order, each unit's people by name, the Personnel without a unit last", async ({
	page,
}) => {
	const run = crypto.randomUUID().slice(0, 6);
	const [farming, transport, treasury, secret] = ["เกษตร", "ขนส่ง", "คลัง", "ลับ"].map((word) =>
		marked(`หน่วย${word}`, run),
	);
	const khwan = await createPerson("ขวัญ", { organizational_unit: transport });
	const ked = await createPerson("เกด", { organizational_unit: transport });
	const chief = await createPerson("สมหญิง", { organizational_unit: farming, leadership_order: 1 });
	const orn = await createPerson("อร", { organizational_unit: treasury });
	const kamon = await createPerson("กมล", { organizational_unit: treasury });
	const hidden = await createPerson("ซ่อน", {
		organizational_unit: treasury,
		public_visible: false,
	});
	const hiddenOnly = await createPerson("ลับ", {
		organizational_unit: secret,
		public_visible: false,
	});
	const draft = await createPerson("ร่าง", { organizational_unit: farming });
	const noUnit = await createPerson("ไร้สังกัด");
	await publish(khwan, ked, chief, orn, kamon, hidden, hiddenOnly, noUnit);

	const response = await page.goto(PERSONNEL.path);
	expect(response?.status(), `GET ${PERSONNEL.path}`).toBe(200);
	await expectPersonnelPage(page, PERSONNEL.path, PERSONNEL.title);
	const units = await unitHeadings(page);
	expect(
		units.filter((unit) => unit.endsWith(run)),
		"เกษตร before ขนส่ง before คลัง, and no unit whose only person is hidden",
	).toEqual([farming, transport, treasury]);
	expect(await namesIn(page, farming), "a draft is not listed").toEqual([chief.title]);
	expect(await namesIn(page, transport)).toEqual([ked.title, khwan.title]);
	expect(await namesIn(page, treasury), "a hidden person is not listed").toEqual([
		kamon.title,
		orn.title,
	]);
	expect(units.at(-1), "the Personnel without a unit come last").toBe(NO_UNIT);
	expect(ownTitles(await namesIn(page, NO_UNIT), [noUnit])).toEqual([noUnit.title]);
	await expect(page.getByRole("main").getByText(hidden.title)).toHaveCount(0);
	await expect(page.getByRole("main").getByText(draft.title)).toHaveCount(0);
});

test("each person shows their profile image, cropped around its top or around its focal point, prefix and name, position and unit, and their public contact only when set, and a plain surface-soft circle without a picture or with a deleted one; on Leadership every name is an H2, in Leadership order; nothing links to a per-person address", async ({
	page,
}) => {
	// The fixtures alone have a Leadership order, so the first of them takes the featured card.
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	const unit = marked("หน่วยบริหาร", run);
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic profile image must upload").toBeDefined();
	const position = marked("สาธารณสุขอำเภอ", run);
	const contact = [marked("โทร 000-000-0000", run), marked("อีเมล", run)];
	const withContact = await createPerson("สมชาย", {
		prefix: "นาย",
		profile_image: { id: media.mediaId },
		current_assignment: position,
		organizational_unit: unit,
		public_contact: contact.join("\n"),
		leadership_order: 1,
	});
	const withoutContact = await createPerson("สมศรี", {
		current_assignment: marked("นักวิชาการสาธารณสุข", run),
		organizational_unit: unit,
		leadership_order: 2,
	});
	const focused = await createPerson("สมใจ", {
		profile_image: { id: media.mediaId, ...OFF_CENTRE_FOCAL_POINT },
		leadership_order: 3,
	});
	const goneMedia = await uploadSyntheticMedia(admin);
	const gone = await createPerson("สมปอง", {
		profile_image: { id: goneMedia.mediaId },
		leadership_order: 4,
	});
	await publish(withContact, withoutContact, focused, gone);
	const removed = await deleteMedia(admin, goneMedia.mediaId!);
	expect(removed.ok, "deleting the media item").toBe(true);

	let surfaceSoft = "";
	for (const { path } of PAGES) {
		await page.goto(path);
		surfaceSoft ||= await tokenColor(page, "surface-soft");
		const card = listedItem(page, withContact.title);
		await expect(card, `${path} lists the person once`).toHaveCount(1);
		await expect(card.getByRole("heading"), `${path}: the prefix leads the name`).toHaveText(
			`นาย${withContact.displayName}`,
		);
		await expectImageLoaded(card.locator("img"), `${path}: the profile image`);
		await expectCrop(card.locator("img"), "50% 0%", `${path}: a portrait without a focal point`);
		await expect(card).toContainText(position);
		await expect(card).toContainText(CONTACT_LABEL);
		for (const line of contact) await expect(card.getByText(line)).toBeVisible();
		const plain = listedItem(page, withoutContact.title);
		await expect(plain).toHaveCount(1);
		await expect(plain, `${path}: no contact label without a contact`).not.toContainText(
			CONTACT_LABEL,
		);
		await expect(plain.locator("img"), `${path}: no picture without an image`).toHaveCount(0);
		await expect(plain.getByTestId("person-visual"), `${path}: the plain visual`).toHaveCount(1);
		await expect(card.locator("img"), `${path}: the picture is decorative`).toHaveAttribute(
			"alt",
			"",
		);
		await expect(
			listedItem(page, focused.title).locator("p"),
			`${path}: no position, unit or contact line for a person without them`,
		).toHaveCount(0);
		const deleted = listedItem(page, gone.title);
		await expect(deleted.locator("img"), `${path}: no picture once it is deleted`).toHaveCount(0);
		for (const [name, person] of [
			["without a picture", plain],
			["with a deleted picture", deleted],
		] as const) {
			await expect(
				person.getByTestId("person-visual"),
				`${path}: the plain surface-soft circle ${name}`,
			).toHaveCSS("background-color", surfaceSoft);
		}
		await expect(
			page.getByRole("main").getByRole("article").getByRole("link"),
			`${path}: a person links nowhere`,
		).toHaveCount(0);
		await expect(
			page.locator('a[href*="/personnel/"]'),
			`${path}: no per-person address`,
		).toHaveCount(0);
	}

	await page.goto(LEADERSHIP.path);
	await expect(listedItem(page, withContact.title), "Leadership names the unit").toContainText(
		unit,
	);
	const { cards } = cardList(page);
	await expect(
		cards.getByRole("heading", { level: 2 }),
		"each leader's name is an H2, in Leadership order",
	).toHaveText([
		`นาย${withContact.displayName}`,
		...[withoutContact, focused, gone].map(({ title }) => title),
	]);
	await page.goto(PERSONNEL.path);
	await expect(
		listedItem(page, withContact.title),
		"a person's row leaves out the unit its panel names",
	).not.toContainText(unit);
	expect(await namesIn(page, unit), "the unit's heading names the unit").toEqual([
		withContact.title,
		withoutContact.title,
	]);
	await expectSiteNotFound(page, `/personnel/${withContact.slug}`, "a per-person address");

	// Both pages are read before either is judged, so a failing run names each.
	const focusedCrops: string[] = [];
	for (const { path } of PAGES) {
		await page.goto(path);
		const portrait = listedItem(page, focused.title).locator("img");
		await expect(portrait, `${path}: the portrait covers its circle`).toHaveCSS(
			"object-fit",
			"cover",
		);
		focusedCrops.push(await portrait.evaluate((image) => getComputedStyle(image).objectPosition));
	}
	expect(focusedCrops, "a portrait with a focal point, on each page").toEqual([
		OFF_CENTRE_CROP,
		OFF_CENTRE_CROP,
	]);
});

// The Leadership page on the deep field (Feature 012 #367; spec #365 decisions 4, 8, 9 and 11,
// "Leadership"): its heading as every list's (public.helpers.ts testHeadingOnField), then the
// featured first leader and the others' cards over the field's lower edge.
testHeadingOnField({
	path: LEADERSHIP.path,
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.about],
	heading: LEADERSHIP_HEADING,
	icon: "user-round",
});

/** A name and a position longer than any other the suites hold, for the layout cases. */
const LONG_NAME = "ผู้บริหารที่มีชื่อและนามสกุลยาวมากเพื่อดูการตัดบรรทัดของการ์ด";
const LONG_POSITION = "นักวิชาการสาธารณสุขชำนาญการพิเศษรักษาราชการแทนสาธารณสุขอำเภอสอง";

/** A unit's name as long as the longest the suites hold. */
const LONG_UNIT = "หน่วยงานทดสอบการเข้าถึงที่มีชื่อยาวมากเพื่อดูการตัดบรรทัด";

/**
 * How many of `count` leaders' cards under the featured card, or of a unit's people in its panel,
 * sit in each row at `width` (spec #365 decision 8): three to a row from 1,024 px, two from 640 px
 * and one below.
 */
function rowsOf(count: number, width: number): number[] {
	const across = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
	return Array.from({ length: Math.ceil(count / across) }, (_, row) =>
		Math.min(across, count - row * across),
	);
}

/**
 * Where the Leadership page's cards lie as the page is laid out now: whether the first spans the
 * list, the cards in each row, how far under the first the others start, and the room between two
 * of them across and down ("none" where there is no such pair).
 */
async function leadersLayout(page: Page) {
	const { cards, grid } = cardList(page);
	const list = await boxOf(grid, "the leaders' list");
	const boxes = await cards.evaluateAll((elements) =>
		elements.map((element) => {
			const { x, y, width, bottom } = element.getBoundingClientRect();
			return { x, y, width, bottom };
		}),
	);
	const [featured, ...others] = boxes;
	const tops = [...new Set(others.map(({ y }) => Math.round(y)))];
	const firstRow = others.filter(({ y }) => Math.round(y) === tops[0]);
	return {
		featuredAcross:
			Math.abs(featured!.x - list.x) < 1 && Math.abs(featured!.width - list.width) < 1,
		rows: await itemsPerRow(cards),
		underFeatured: others.length > 0 ? Math.round(others[0]!.y - featured!.bottom) : "none",
		across:
			firstRow.length > 1
				? Math.round(firstRow[1]!.x - (firstRow[0]!.x + firstRow[0]!.width))
				: "none",
		down:
			tops.length > 1
				? Math.round(tops[1]! - Math.max(...firstRow.map(({ bottom }) => bottom)))
				: "none",
		// The list ends where its last card does, with no room of its own below.
		roomBelow: Math.round(list.y + list.height - Math.max(...boxes.map(({ bottom }) => bottom))),
	};
}

test("the first leader by Leadership order takes the featured card across the row with each part they have and none they lack, and the others follow in Leadership order 32 px under it, three to a row from 1,024 px, two from 640 px and one below, 20 px apart from 640 px and 16 px below, at one, two, three and six leaders, with nothing past the window; with one the featured card shows alone, and the list ends with its last card", async ({
	page,
}) => {
	test.setTimeout(240_000);
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	const unit = marked("หน่วยบริหาร", run);
	// The first has a name alone; the others the suite's longest name and position.
	const leaders = [await createPerson("ผู้บริหารลำดับแรก", { leadership_order: 1 })];
	for (const order of [2, 3, 4, 5, 6]) {
		leaders.push(
			await createPerson(`${LONG_NAME}${"กขคงจ"[order - 2]}`, {
				leadership_order: order,
				current_assignment: marked(LONG_POSITION, run),
				organizational_unit: unit,
			}),
		);
	}

	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	let shown = 0;
	for (const count of [1, 2, 3, 6]) {
		await publish(...leaders.slice(shown, count));
		shown = count;
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.goto(LEADERSHIP.path);
		const { cards } = cardList(page);
		seen[`${count}: names`] = (
			await cards.getByRole("heading", { level: 2 }).allTextContents()
		).map((text) => text.trim());
		expected[`${count}: names`] = leaders.slice(0, count).map(({ title }) => title);
		if (count === 1) {
			const featured = cards.first();
			seen["the featured card with a name alone"] = {
				pictures: await featured.locator("img").count(),
				circle: await featured.getByTestId("person-visual").count(),
				texts: await featured.locator("p").count(),
			};
			expected["the featured card with a name alone"] = { pictures: 0, circle: 1, texts: 0 };
		}
		for (const width of [1440, 1024, 1023, 768, 640, 639, 375, 320]) {
			await page.setViewportSize({ width, height: 900 });
			await expectNoHorizontalScroll(page, `${count} leaders at ${width} px`);
			seen[`${count} at ${width}`] = await leadersLayout(page);
			const rows = rowsOf(count - 1, width);
			const gap = width >= 640 ? 20 : 16;
			expected[`${count} at ${width}`] = {
				featuredAcross: true,
				rows: [1, ...rows],
				underFeatured: count > 1 ? 32 : "none",
				across: (rows[0] ?? 0) > 1 ? gap : "none",
				down: rows.length > 1 ? gap : "none",
				roomBelow: 0,
			};
		}
	}
	expect(seen, "the featured card and the others' cards by count").toEqual(expected);
});

/**
 * A leader's card as the page is laid out now: its surface, its ringed circle, the styles of its
 * name, `position` and `unit`, where its picture lies beside the name, and its decoration.
 */
async function leaderLook(card: Locator, position: string, unit: string) {
	const frame = card.getByTestId("person-picture");
	const name = card.getByRole("heading", { level: 2 });
	const [picture, title] = [
		await boxOf(card.locator('img, [data-testid="person-visual"]').first(), "the picture"),
		await boxOf(name, "the name"),
	];
	const decoration = card.getByTestId("leader-decoration");
	let decorated: unknown = "none";
	if ((await decoration.count()) > 0) {
		if (await decoration.isVisible()) {
			const [own, box] = [await boxOf(card, "the card"), await boxOf(decoration, "the circle")];
			decorated = {
				hidden: await decoration.getAttribute("aria-hidden"),
				colour: await decoration.evaluate((element) => getComputedStyle(element).backgroundColor),
				lowerRight:
					box.x + box.width / 2 > own.x + own.width / 2 &&
					box.y + box.height / 2 > own.y + own.height / 2,
			};
		} else decorated = "hidden";
	}
	return {
		...(await card.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				background: style.backgroundColor,
				shadow: style.boxShadow,
				radius: style.borderTopLeftRadius,
			};
		})),
		ringed: (await frame.count()) === 1 ? await ringedCircle(frame) : "no ringed circle",
		name: await textStyle(name),
		position: await textStyle(card.getByText(position, { exact: true })),
		unit: await textStyle(card.getByText(unit, { exact: true })),
		picture:
			picture.x + picture.width <= title.x
				? "beside"
				: picture.y + picture.height <= title.y
					? "above"
					: "neither",
		decoration: decorated,
	};
}

/**
 * The colour tokens a leader's card and a unit's panel are read against, by name, and the text
 * style that `textStyle` reads for a text at `size` px and `weight` in the token `tone`.
 */
async function personColours(page: Page) {
	const colour = Object.fromEntries(
		await Promise.all(
			[
				"surface-base",
				"surface-soft",
				"text-primary",
				"text-secondary",
				"brand-primary",
				"accent-warm",
				"border-default",
			].map(async (name) => [name, await tokenColor(page, name)] as const),
		),
	);
	return {
		colour,
		text: (size: number, weight: string, tone: string) => ({
			size,
			weight,
			colour: colour[tone],
			underline: false,
		}),
	};
}

test("the featured card is white with the deep shadow and radius 24, its ringed circle 96 px and from 640 px 128 px with a 6 px gap and the 3 px accent-warm ring above the text and from 640 px beside it, the name an H2 at H3 size and from 640 px H2 size, the position at body-large in brand-primary, the unit at small size in text-secondary, and from 640 px a surface-soft circle at its lower right; another leader's card is white with the card shadow and radius 24, its ringed circle 60 px and from 640 px 76 px with a 4 px gap and the 2 px border-default ring beside the text, the name at body-large semibold in text-primary, the position in text-secondary and the unit at small size in brand-primary", async ({
	page,
}) => {
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic profile image must upload").toBeDefined();
	const [position, unit, otherPosition, otherUnit] = [
		"สาธารณสุขอำเภอ",
		"หน่วยบริหาร",
		"นักวิชาการสาธารณสุข",
		"กลุ่มงานควบคุมโรค",
	].map((words) => marked(words, run));
	const first = await createPerson("สมชาย", {
		prefix: "นาย",
		profile_image: { id: media.mediaId },
		current_assignment: position,
		organizational_unit: unit,
		public_contact: marked("โทร 000-000-0000", run),
		leadership_order: 1,
	});
	const other = await createPerson("สมศรี", {
		profile_image: { id: media.mediaId },
		current_assignment: otherPosition,
		organizational_unit: otherUnit,
		leadership_order: 2,
	});
	await publish(first, other);
	await page.goto(LEADERSHIP.path);
	const { colour, text } = await personColours(page);
	const [deep, card] = [await tokenShadow(page, "deep"), await tokenShadow(page, "card")];

	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const width of [1440, 1024, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await expectNoHorizontalScroll(page, `${LEADERSHIP.path} at ${width} px`);
		const wide = width >= 640;
		seen[`the featured card at ${width}`] = await leaderLook(
			listedItem(page, first.title),
			position,
			unit,
		);
		expected[`the featured card at ${width}`] = {
			background: colour["surface-base"],
			shadow: deep,
			radius: "24px",
			ringed: {
				circle: wide ? 128 : 96,
				gap: 6,
				ring: { width: 3, colour: colour["accent-warm"] },
			},
			name: text(wide ? 34 : 24, "600", "text-primary"),
			position: text(18, "400", "brand-primary"),
			unit: text(13, "400", "text-secondary"),
			picture: wide ? "beside" : "above",
			decoration: wide
				? { hidden: "true", colour: colour["surface-soft"], lowerRight: true }
				: "hidden",
		};
		seen[`another card at ${width}`] = await leaderLook(
			listedItem(page, other.title),
			otherPosition,
			otherUnit,
		);
		expected[`another card at ${width}`] = {
			background: colour["surface-base"],
			shadow: card,
			radius: "24px",
			ringed: {
				circle: wide ? 76 : 60,
				gap: 4,
				ring: { width: 2, colour: colour["border-default"] },
			},
			name: text(18, "600", "text-primary"),
			position: text(16, "400", "text-secondary"),
			unit: text(13, "400", "brand-primary"),
			picture: "beside",
			decoration: "none",
		};
	}
	expect(seen, "the featured card and another card").toEqual(expected);
});

test("the field of /about/leadership has the corner glow and, from 1,024 px only, the large ring", async ({
	page,
}) => {
	await page.goto(LEADERSHIP.path);
	expect(await readListField(page), "the field's glow and ring").toEqual(LIST_FIELD_LOOK);
});

test("the leaders' cards start over the field's lower edge, 64 px above it below 640 px and 88 px from 640 px, where the lead ends 96 px and 128 px above it, and no card holds a focus ring that meets the field", async ({
	page,
}) => {
	await publish(await createPerson("ผู้บริหารขอบแถบ", { leadership_order: 1 }));
	await page.goto(LEADERSHIP.path);
	const heading = listHeading(page, LEADERSHIP_HEADING);
	await expectBlocksOverFieldEdge(
		page,
		heading.field,
		[heading.lead],
		[["the leaders", cardList(page).grid]],
	);
});

test("/about/leadership moves only when motion is allowed: the heading and then the lead rise in as the page opens while the breadcrumb shows at once, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await publish(await createPerson("ผู้บริหารเคลื่อนไหว", { leadership_order: 1 }));
	await expectListMovesOnlyWhenAllowed(
		page,
		LEADERSHIP.path,
		listHeading(page, LEADERSHIP_HEADING),
		[],
		{ grid: cardList(page).grid },
	);
});

test("with motion allowed each leader's card on /about/leadership, the featured one too, waits below the window and shows as it comes into it", async ({
	page,
}) => {
	for (const order of [1, 2, 3]) {
		await publish(
			await createPerson(`ผู้บริหารปรากฏ${"กขค"[order - 1]}`, { leadership_order: order }),
		);
	}
	// A window shorter than the field puts the cards below it as the page opens, well below: just
	// under a 300 px window Chromium gives a card's view timeline no progress, and it shows whole.
	const short = { width: 1440, height: 200 };
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.setViewportSize(short);
	await page.goto(LEADERSHIP.path);
	const items = cardList(page).grid.getByRole("listitem");
	const seen: Record<string, number> = {};
	const expected: Record<string, number> = {};
	// Every card is read before any comes into the window.
	for (const [index, item] of (await items.all()).entries()) {
		expect((await boxOf(item, "a card")).y, "a card lies below the window").toBeGreaterThan(
			short.height,
		);
		seen[`card ${index + 1} below the window`] = await shownOpacity(item);
		expected[`card ${index + 1} below the window`] = 0;
	}
	for (const item of await items.all()) {
		await item.scrollIntoViewIfNeeded();
		await expect.poll(() => shownOpacity(item), { message: "a card in the window shows" }).toBe(1);
	}
	expect(seen, "each card waits below the window").toEqual(expected);
});

test.describe("/about/leadership without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("/about/leadership shows its heading with its label and its lead, and each leader's card", async ({
		page,
	}) => {
		await borrowPersonnel();
		const leaders = [
			await createPerson("ผู้บริหารไม่ใช้สคริปต์ก", { leadership_order: 1 }),
			await createPerson("ผู้บริหารไม่ใช้สคริปต์ข", { leadership_order: 2 }),
		];
		await publish(...leaders);
		await page.goto(LEADERSHIP.path);
		const heading = listHeading(page, LEADERSHIP_HEADING);
		const seen: Record<string, unknown> = {
			title: (await page.getByRole("heading", { level: 1 }).textContent())?.trim(),
			label: await shownWhole(heading.label),
			lead: await shownWhole(heading.lead),
		};
		const expected: Record<string, unknown> = { title: LEADERSHIP.title, label: true, lead: true };
		for (const { title } of leaders) {
			seen[title] = await shownWhole(listedItem(page, title));
			expected[title] = true;
		}
		expect(seen, "the page without JavaScript").toEqual(expected);
	});
});

// The Personnel page on the deep field (Feature 012 #370; spec #365 decisions 4, 8, 9 and 12,
// "Personnel"): its heading as every list's (public.helpers.ts testHeadingOnField), then a white
// panel per unit over the field's lower edge, its people inside as compact rows.
testHeadingOnField({
	path: PERSONNEL.path,
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.about],
	heading: PERSONNEL_HEADING,
	icon: "users-round",
});

/** The units' panels on /about/personnel, in order, and the block that holds them. */
function unitPanels(page: Page) {
	const panels = page.getByRole("main").getByRole("region");
	return { panels, block: panels.first().locator("xpath=..") };
}

/** The head of a unit's panel, which holds its H2 and lies over its rule. */
const panelHead = (panel: Locator) => panel.getByRole("heading", { level: 2 }).locator("xpath=..");

/**
 * Where /about/personnel's panels for `units` lie as the page is laid out now: the room between two
 * panels, and in each panel its people's names, the rows they sit in, how far under the rule the
 * first row starts, and the room between two of them across and down ("none" where there is no
 * such pair).
 */
async function panelsLayout(page: Page, units: string[]) {
	const apart: number[] = [];
	const panels: Record<string, unknown> = {};
	let above: { y: number; height: number } | undefined;
	for (const unit of units) {
		const panel = unitSection(page, unit);
		const box = await boxOf(panel, unit);
		if (above) apart.push(Math.round(box.y - (above.y + above.height)));
		above = box;
		const people = panel.getByRole("listitem");
		const boxes = await people.evaluateAll((elements) =>
			elements.map((element) => {
				const { x, y, width, bottom } = element.getBoundingClientRect();
				return { x, y, width, bottom };
			}),
		);
		const tops = [...new Set(boxes.map(({ y }) => Math.round(y)))];
		const firstRow = boxes.filter(({ y }) => Math.round(y) === tops[0]);
		const head = await boxOf(panelHead(panel), `${unit}: the head`);
		panels[unit] = {
			names: (await panel.getByRole("heading", { level: 3 }).allTextContents()).map((text) =>
				text.trim(),
			),
			rows: await itemsPerRow(people),
			underRule: Math.round(boxes[0]!.y - (head.y + head.height)),
			across:
				firstRow.length > 1
					? Math.round(firstRow[1]!.x - (firstRow[0]!.x + firstRow[0]!.width))
					: "none",
			down:
				tops.length > 1
					? Math.round(tops[1]! - Math.max(...firstRow.map(({ bottom }) => bottom)))
					: "none",
		};
	}
	return { apart, panels };
}

test("/about/personnel shows a panel per unit in Thai order, 24 px apart, each its people as H3s by name, one to a row below 640 px, two from 640 px and three from 1,024 px, 24 px across and 20 px down, starting 20 px under the panel's rule, at one, two and four people, with nothing past the window", async ({
	page,
}) => {
	test.setTimeout(240_000);
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	// The suite's longest unit, name and position; the last letters keep the units' Thai order.
	const units = ["ก", "ข", "ค"].map((letter) => marked(`${LONG_UNIT}${letter}`, run));
	const counts = [1, 2, 4];
	const people: DraftFixture[][] = [];
	for (const [index, count] of counts.entries()) {
		const unitPeople: DraftFixture[] = [];
		for (const letter of "กขคง".slice(0, count)) {
			unitPeople.push(
				await createPerson(`${LONG_NAME}${letter}`, {
					organizational_unit: units[index],
					current_assignment: marked(LONG_POSITION, run),
				}),
			);
		}
		people.push(unitPeople);
	}
	await publish(...people.flat());
	await page.goto(PERSONNEL.path);
	expect(await unitHeadings(page), "a panel per unit, in Thai order").toEqual(units);

	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const width of [1440, 1024, 1023, 768, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await expectNoHorizontalScroll(page, `${PERSONNEL.path} at ${width} px`);
		seen[`at ${width}`] = await panelsLayout(page, units);
		expected[`at ${width}`] = {
			apart: [24, 24],
			panels: Object.fromEntries(
				units.map((unit, index) => {
					const rows = rowsOf(counts[index]!, width);
					return [
						unit,
						{
							names: people[index]!.map(({ title }) => title),
							rows,
							underRule: 20,
							across: rows[0]! > 1 ? 24 : "none",
							down: rows.length > 1 ? 20 : "none",
						},
					];
				}),
			),
		};
	}
	expect(seen, "the panels and their rows by count").toEqual(expected);
});

/**
 * A unit's panel as the page is laid out now: its surface and padding, its head's tile, icon,
 * heading and rule, and the row of the person named `name` in it with its ringed circle, the
 * styles of its name, `position`, the label over the contact and `contact`, and where its picture
 * lies beside the name. A part the panel lacks reads "none".
 */
async function panelLook(
	panel: Locator,
	name: string,
	{ position, contact }: { position: string; contact: string },
) {
	const box = await boxOf(panel, "the panel");
	const head = panelHead(panel);
	const heading = panel.getByRole("heading", { level: 2 });
	const tile = head.locator(':scope > [aria-hidden="true"]');
	let tiled: unknown = "none";
	let padding: unknown = "none";
	let rule: unknown = "none";
	if ((await tile.count()) === 1) {
		const [own, title] = [await boxOf(tile, "the tile"), await boxOf(heading, "the heading")];
		const icon = tile.locator("svg");
		tiled = {
			size: [Math.round(own.width), Math.round(own.height)],
			colour: await tile.evaluate((element) => getComputedStyle(element).backgroundColor),
			icon:
				(await icon.count()) === 1
					? {
							size: Math.round((await boxOf(icon, "the icon")).width),
							colour: await icon.evaluate((element) => getComputedStyle(element).color),
						}
					: "none",
			besideHeading: own.x + own.width <= title.x,
		};
		// The head is the panel's first part; its tile is centred on a heading that may wrap.
		const top = await boxOf(head, "the head");
		padding = { left: Math.round(top.x - box.x), top: Math.round(top.y - box.y) };
		rule = await head.evaluate(
			(element, { bottom }) => {
				const style = getComputedStyle(element);
				const width = parseFloat(style.borderBottomWidth);
				return {
					width,
					colour: style.borderBottomColor,
					under: Math.round(element.getBoundingClientRect().bottom - width - bottom),
				};
			},
			{ bottom: Math.max(own.y + own.height, title.y + title.height) },
		);
	}
	const row = panel.getByRole("article").filter({ hasText: name });
	const frame = row.getByTestId("person-picture");
	const [picture, title] = [
		await boxOf(row.locator('img, [data-testid="person-visual"]').first(), "the picture"),
		await boxOf(row.getByRole("heading", { level: 3 }), "the name"),
	];
	return {
		...(await panel.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				background: style.backgroundColor,
				shadow: style.boxShadow,
				radius: style.borderTopLeftRadius,
			};
		})),
		padding,
		tile: tiled,
		heading: await textStyle(heading),
		rule,
		ringed: (await frame.count()) === 1 ? await ringedCircle(frame) : "no ringed circle",
		name: await textStyle(row.getByRole("heading", { level: 3 })),
		position: await textStyle(row.getByText(position, { exact: true })),
		label: await textStyle(row.getByText(CONTACT_LABEL, { exact: true })),
		contact: await textStyle(row.getByText(contact, { exact: true })),
		picture: picture.x + picture.width <= title.x ? "beside" : "not beside",
	};
}

test("a unit's panel is white with the card shadow and radius 24 and 20 px of padding, 28 px from 640 px; its head a 40 px surface-soft tile with the 20 px users-round in brand-primary beside the unit's name, an H2 at H3 size in text-primary, over a 1 px border-default rule 16 px under them; a person's row has the ringed circle at 52 px, 60 px from 640 px, with a 2 px gap and the 2 px border-default ring beside the name, an H3 at body size, semibold, in text-primary, the position at label size in text-secondary and the public contact under ช่องทางติดต่อ at small size", async ({
	page,
}) => {
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic profile image must upload").toBeDefined();
	const [unit, position, contact] = ["หน่วยบริหาร", "นักวิชาการสาธารณสุข", "โทร 000-000-0000"].map(
		(words) => marked(words, run),
	) as [string, string, string];
	const person = await createPerson("สมศรี", {
		profile_image: { id: media.mediaId },
		current_assignment: position,
		organizational_unit: unit,
		public_contact: contact,
	});
	await publish(person);
	await page.goto(PERSONNEL.path);
	const { colour, text } = await personColours(page);
	const shadow = await tokenShadow(page, "card");

	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const width of [1440, 1024, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await expectNoHorizontalScroll(page, `${PERSONNEL.path} at ${width} px`);
		const wide = width >= 640;
		seen[`at ${width}`] = await panelLook(unitSection(page, unit), person.title, {
			position,
			contact,
		});
		expected[`at ${width}`] = {
			background: colour["surface-base"],
			shadow,
			radius: "24px",
			padding: { left: wide ? 28 : 20, top: wide ? 28 : 20 },
			tile: {
				size: [40, 40],
				colour: colour["surface-soft"],
				icon: { size: 20, colour: colour["brand-primary"] },
				besideHeading: true,
			},
			heading: text(24, "600", "text-primary"),
			rule: { width: 1, colour: colour["border-default"], under: 16 },
			ringed: {
				circle: wide ? 60 : 52,
				gap: 2,
				ring: { width: 2, colour: colour["border-default"] },
			},
			name: text(16, "600", "text-primary"),
			position: text(14, "400", "text-secondary"),
			label: text(13, "500", "text-secondary"),
			contact: text(13, "400", "text-primary"),
			picture: "beside",
		};
	}
	expect(seen, "a unit's panel and a person's row").toEqual(expected);
});

test("the field of /about/personnel has the corner glow and, from 1,024 px only, the large ring", async ({
	page,
}) => {
	await page.goto(PERSONNEL.path);
	expect(await readListField(page), "the field's glow and ring").toEqual(LIST_FIELD_LOOK);
});

test("the units' panels start over the field's lower edge, 64 px above it below 640 px and 88 px from 640 px, where the lead ends 96 px and 128 px above it, and no panel holds a focus ring that meets the field", async ({
	page,
}) => {
	await publish(await createPerson("บุคลากรขอบแถบ"));
	await page.goto(PERSONNEL.path);
	const heading = listHeading(page, PERSONNEL_HEADING);
	await expectBlocksOverFieldEdge(
		page,
		heading.field,
		[heading.lead],
		[["the units", unitPanels(page).block]],
	);
});

test("/about/personnel moves only when motion is allowed: the heading and then the lead rise in as the page opens while the breadcrumb shows at once, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await publish(await createPerson("บุคลากรเคลื่อนไหว"));
	await expectListMovesOnlyWhenAllowed(
		page,
		PERSONNEL.path,
		listHeading(page, PERSONNEL_HEADING),
		[],
		{ grid: unitPanels(page).block },
	);
});

test("with motion allowed each unit's panel on /about/personnel waits below the window and shows as it comes into it", async ({
	page,
}) => {
	const run = crypto.randomUUID().slice(0, 6);
	for (const letter of ["ก", "ข", "ค"]) {
		await publish(
			await createPerson(`บุคลากรปรากฏ${letter}`, {
				organizational_unit: marked(`หน่วยปรากฏ${letter}`, run),
			}),
		);
	}
	// A window shorter than the field puts the panels well below it as the page opens.
	const short = { width: 1440, height: 200 };
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.setViewportSize(short);
	await page.goto(PERSONNEL.path);
	const { panels } = unitPanels(page);
	const seen: Record<string, number> = {};
	const expected: Record<string, number> = {};
	// Every panel is read before any comes into the window.
	for (const [index, panel] of (await panels.all()).entries()) {
		expect((await boxOf(panel, "a panel")).y, "a panel lies below the window").toBeGreaterThan(
			short.height,
		);
		seen[`panel ${index + 1} below the window`] = await shownOpacity(panel);
		expected[`panel ${index + 1} below the window`] = 0;
	}
	for (const panel of await panels.all()) {
		await panel.scrollIntoViewIfNeeded();
		await expect
			.poll(() => shownOpacity(panel), { message: "a panel in the window shows" })
			.toBe(1);
	}
	expect(seen, "each panel waits below the window").toEqual(expected);
});

test.describe("/about/personnel without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("/about/personnel shows its heading with its label and its lead, and each unit's panel", async ({
		page,
	}) => {
		await borrowPersonnel();
		const run = crypto.randomUUID().slice(0, 6);
		const units = ["ก", "ข"].map((letter) => marked(`หน่วยไม่ใช้สคริปต์${letter}`, run));
		for (const unit of units) {
			await publish(await createPerson("บุคลากรไม่ใช้สคริปต์", { organizational_unit: unit }));
		}
		await page.goto(PERSONNEL.path);
		const heading = listHeading(page, PERSONNEL_HEADING);
		const seen: Record<string, unknown> = {
			title: (await page.getByRole("heading", { level: 1 }).textContent())?.trim(),
			label: await shownWhole(heading.label),
			lead: await shownWhole(heading.lead),
		};
		const expected: Record<string, unknown> = { title: PERSONNEL.title, label: true, lead: true };
		for (const unit of units) {
			seen[unit] = await shownWhole(unitSection(page, unit));
			expected[unit] = true;
		}
		expect(seen, "the page without JavaScript").toEqual(expected);
	});
});

test.describe("accessibility and reflow", () => {
	test.beforeAll(async () => {
		const run = crypto.randomUUID().slice(0, 6);
		const media = await uploadSyntheticMedia(admin);
		expect(media.mediaId, "the synthetic profile image must upload").toBeDefined();
		const unit = marked(LONG_UNIT, run);
		await publish(
			await createPerson("ผู้บริหารทดสอบการเข้าถึง", {
				prefix: "นายแพทย์",
				profile_image: { id: media.mediaId },
				current_assignment: marked("สาธารณสุขอำเภอ", run),
				organizational_unit: unit,
				public_contact: marked("โทร 000-000-0000", run),
				leadership_order: 1,
			}),
			await createPerson("บุคลากรทดสอบการเข้าถึง", { organizational_unit: unit }),
			await createPerson("บุคลากรไม่ระบุหน่วยงาน"),
		);
	});

	testAccessibilityAndReflow("the Leadership and Personnel pages", () =>
		PAGES.map(({ path }) => path),
	);
});
