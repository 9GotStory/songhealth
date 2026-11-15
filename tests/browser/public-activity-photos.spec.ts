// An Activity's photos (Feature 006 #148; spec #144 "An Activity's photos (its gallery field)" and
// "Testing Decisions", Seam A).
//
// An Activity's photos show as square thumbnails, four to a row from lg, 1024 px, and three below,
// each a link to its photo's file named by its alt text, with its caption under it on at most two
// lines. The first eight show, and the rest show while the control under them is open, so the
// control stays under the photos it opens. It reads "ดูรูปทั้งหมด (N รูป)" while closed and
// "ซ่อนรูป M รูป" while open, where N counts the photos the page can show and M those it folds. An
// Activity with eight photos or fewer has no control. Nothing needs JavaScript, and the control is
// reached and operated with the keyboard and tells assistive technology whether it is expanded.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness. Its fixtures are synthetic Activities and photos made through the native API and
// removed afterwards: twenty landscape photos, each its own picture with alt text and a caption,
// the first caption longer than two lines at any width. One Activity has the twenty, with a photo
// whose media item was deleted among them, so the page can show twenty; others have the first
// nine, where the fold starts, and the first eight; another has two photos without alt text, one
// with a caption and one without.
//
// Chromium's accessibility tree is read through the DevTools protocol (Playwright 1.63.0
// `newCDPSession`), because Playwright's own role model gives a `<summary>` no role
// (playwright-core 1.63.0 lib/coreBundle.js `kImplicitRoleByTagName`): Chromium exposes it to
// assistive technology as a disclosure that is expanded or collapsed and controls the list of
// photos.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticDraft,
	deleteMedia,
	devAdminActor,
	gradientPng,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticMedia,
	uploadSyntheticPicture,
	type CmsActor,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	boxOf,
	deepField,
	entersAfter,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	heldBack,
	itemsPerRow,
	test,
	testAccessibilityAndReflow,
} from "./public.helpers";

/** The control's labels: while the photos are folded, and while they all show. */
interface Labels {
	closed: string;
	open: string;
}

/** The labels for twenty photos and for nine. */
const TWENTY: Labels = { closed: "ดูรูปทั้งหมด (20 รูป)", open: "ซ่อนรูป 12 รูป" };
const NINE: Labels = { closed: "ดูรูปทั้งหมด (9 รูป)", open: "ซ่อนรูป 1 รูป" };

/** A fixture photo: its alt text, its caption and its file. */
interface Photo {
	alt: string;
	caption: string;
	png: Uint8Array<ArrayBuffer>;
}

/** A published fixture Activity: its address. */
interface Activity {
	path: string;
}

let admin: CmsActor;
/** The twenty photos, in the order the Activities list them. */
const PHOTOS: Photo[] = [];
/**
 * The Activities with the twenty photos, the first nine and the first eight, and one with photos
 * without alt text.
 */
let many: Activity;
let nine: Activity;
let eight: Activity;
let unnamed: Activity;
/** An Activity without photos. */
let none: Activity;
/** The caption of the photo without alt text that has one; the other has none. */
let unnamedCaption: string;

/** Publish a synthetic Activity labelled `label` with `gallery` as its photos. */
async function publishActivity(label: string, gallery: unknown[]): Promise<Activity> {
	const draft = await createSyntheticDraft(admin, "activities", "กิจกรรม", label, {
		data: { gallery },
	});
	await publishEntryAt(admin, "activities", draft.id);
	return { path: `/activities/${draft.slug}` };
}

/** The Activity's photos, the region its heading names. */
const photosOf = (page: Page) => page.getByRole("main").getByRole("region", { name: "ภาพกิจกรรม" });

/** The small label over the photos' heading, which has no role; a crumb reads the same. */
const labelIn = (scope: Locator) => scope.locator("p").filter({ hasText: /^\s*กิจกรรม\s*$/ });

/** The control that reads `label`. */
const controlOf = (photos: Locator, label: string) => photos.getByText(label, { exact: true });

/**
 * Fail unless the photos that show are `shown`, in their order, each a link named by its alt text.
 */
async function expectShown(photos: Locator, shown: readonly Photo[], label: string): Promise<void> {
	const links = photos.getByRole("link");
	await expect(links, `${label}: ${shown.length} photos show`).toHaveCount(shown.length);
	for (const [index, photo] of shown.entries()) {
		await expect(links.nth(index), `${label}: photo ${index + 1}`).toHaveAccessibleName(photo.alt);
	}
}

/**
 * Fail unless the control reads `text` and shows under every photo that shows, caption included.
 */
async function expectControlUnder(photos: Locator, text: string, label: string): Promise<void> {
	const { y: top } = await boxOf(controlOf(photos, text), `${label}: the control reads ${text}`);
	const bottom = await photos
		.getByRole("figure")
		.evaluateAll((figures) =>
			Math.max(...figures.map((figure) => figure.getBoundingClientRect().bottom)),
		);
	expect(top, `${label}: the control is under the photos`).toBeGreaterThanOrEqual(bottom - 0.5);
}

/**
 * Fail unless `activity`, whose photos are `all`, shows the first eight with the control under them
 * reading `labels.closed`, all of them above it reading `labels.open` once it is activated, and the
 * first eight again once it is activated again.
 */
async function expectPhotosFold(
	page: Page,
	activity: Activity,
	all: readonly Photo[],
	labels: Labels,
	label: string,
): Promise<void> {
	await page.goto(activity.path);
	const photos = photosOf(page);
	await expectShown(photos, all.slice(0, 8), `${label}, closed`);
	for (const photo of all.slice(8)) {
		const folded = photos.getByRole("link", { name: photo.alt, exact: true, includeHidden: true });
		await expect(folded, `${label}, closed: ${photo.alt} is in the page`).toHaveCount(1);
		await expect(folded, `${label}, closed: ${photo.alt} is folded`).toBeHidden();
	}
	await expectControlUnder(photos, labels.closed, `${label}, closed`);

	await controlOf(photos, labels.closed).click();
	await expectShown(photos, all, `${label}, open`);
	await expectControlUnder(photos, labels.open, `${label}, open`);
	await expect(
		controlOf(photos, labels.closed),
		`${label}, open: no ${labels.closed}`,
	).toBeHidden();

	await controlOf(photos, labels.open).click();
	await expectShown(photos, all.slice(0, 8), `${label}, closed again`);
	await expectControlUnder(photos, labels.closed, `${label}, closed again`);
}

/**
 * What Chromium exposes to assistive technology on the node named `name` that states whether it is
 * expanded: that state, and the ids of the elements it controls (the DevTools protocol's
 * Accessibility.queryAXTree).
 */
async function exposedDisclosure(
	page: Page,
	name: string,
): Promise<{ expanded?: boolean; controls: string[] }> {
	const session = await page.context().newCDPSession(page);
	try {
		const { root } = await session.send("DOM.getDocument", { depth: 0 });
		const { nodes } = await session.send("Accessibility.queryAXTree", {
			nodeId: root.nodeId,
			accessibleName: name,
		});
		const properties = nodes
			.map((node) => node.properties ?? [])
			.find((list) => list.some((property) => property.name === "expanded"));
		const value = (property: string) => properties?.find(({ name }) => name === property)?.value;
		return {
			expanded: value("expanded")?.value as boolean | undefined,
			controls: (value("controls")?.relatedNodes ?? []).map((node) => node.idref ?? ""),
		};
	} finally {
		await session.detach();
	}
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	for (let number = 1; number <= 20; number += 1) {
		const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพบรรยากาศ ${number}`;
		const caption =
			number === 1
				? `${SYNTHETIC_FIXTURE_MARK} คำบรรยายภาพบรรยากาศ 1 ผู้เข้าร่วมกิจกรรมจากทุกตำบลรับฟังการบรรยายเรื่องการป้องกันโรคไข้เลือดออก การตรวจคัดกรองเบาหวานและความดันโลหิตสูง และการดูแลผู้สูงอายุในชุมชนอย่างต่อเนื่องตลอดทั้งปี`
				: `${SYNTHETIC_FIXTURE_MARK} คำบรรยายภาพบรรยากาศ ${number}`;
		// Each photo is its own landscape picture, so a link's file tells which photo it is.
		const png = gradientPng("#0b6b57", `#${(64 + number * 8).toString(16)}d0c0`, {
			width: 400,
			height: 250,
		});
		PHOTOS.push({ alt, caption, png });
	}
	const items = [];
	for (const photo of PHOTOS) {
		items.push({
			image: { id: await uploadSyntheticPicture(admin, photo.alt, photo.png) },
			caption: photo.caption,
		});
	}
	const goneId = await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพที่ถูกลบ`);
	many = await publishActivity("many-photos", [
		...items.slice(0, 2),
		{ image: { id: goneId }, caption: `${SYNTHETIC_FIXTURE_MARK} ภาพที่ไม่มีแล้ว` },
		...items.slice(2),
	]);
	expect((await deleteMedia(admin, goneId)).ok, "deleting the media item").toBe(true);
	nine = await publishActivity("nine-photos", items.slice(0, 9));
	eight = await publishActivity("eight-photos", items.slice(0, 8));

	const withoutAlt = async () => {
		const uploaded = await uploadSyntheticMedia(admin, {
			file: {
				bytes: gradientPng("#123c33", "#f2d17a", { width: 400, height: 250 }),
				type: "image/png",
			},
		});
		expect(uploaded.mediaId, "a photo without alt text").toBeDefined();
		return uploaded.mediaId!;
	};
	unnamedCaption = `${SYNTHETIC_FIXTURE_MARK} คำบรรยายภาพที่ไม่มีข้อความแทนภาพ`;
	unnamed = await publishActivity("unnamed-photos", [
		{ image: { id: await withoutAlt() }, caption: unnamedCaption },
		{ image: { id: await withoutAlt() } },
	]);
	none = await publishActivity("no-photos", []);
});

test.afterAll(() => removeSuiteFixtures(admin));

test("an Activity with twenty photos shows the first eight with ดูรูปทั้งหมด (20 รูป) under them, all twenty with ซ่อนรูป 12 รูป under them once it is activated, and the eight again after, at 375 and 1440 px", async ({
	page,
}) => {
	for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
		await page.setViewportSize(viewport);
		await expectPhotosFold(page, many, PHOTOS, TWENTY, `at ${viewport.width} px`);
	}
});

test("an Activity's photos open under the Homepage's section heading, its icon tile, the label กิจกรรม and the H2 ภาพกิจกรรม, 48 px under the columns below 640 px and 64 px from 640 px, 24 and 28 px above the photos, shown at once with no effect and nothing past the window; an Activity without photos shows no heading", async ({
	page,
}) => {
	await page.goto(none.path);
	const main = page.getByRole("main");
	await expect(
		main.getByRole("heading", { level: 1 }),
		"the Activity without photos",
	).toBeVisible();
	await expect(
		main.getByRole("heading", { name: "ภาพกิจกรรม" }),
		"no heading without photos",
	).toHaveCount(0);
	await expect(labelIn(main), "no label without photos").toHaveCount(0);

	// The heading and the photos show at once, with no effect, even where motion is allowed.
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto(many.path);
	const photos = photosOf(page);
	const heading = photos.getByRole("heading", { level: 2, name: "ภาพกิจกรรม", exact: true });
	expect(await heldBack(photos), "nothing in the photos held back").toEqual([]);
	expect(await entersAfter(heading), "the heading has no entrance").toBe(-1);
	await page.emulateMedia({ reducedMotion: "reduce" });
	// The tile is decorative, hidden from assistive technology.
	const label = labelIn(photos);
	const tile = photos.locator('[aria-hidden="true"]').filter({ has: page.locator("svg") });
	// The end of the columns: the deep field under the header, as the Activity has no details and no
	// picture (Feature 009 #285).
	const field = deepField(page);
	for (const [width, under, above] of [
		[320, 48, 24],
		[375, 48, 24],
		[639, 48, 24],
		[640, 64, 28],
		[1024, 64, 28],
		[1440, 64, 28],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		const at = `at ${width} px`;
		await expectNoHorizontalScroll(page, at);
		await expectStacked(at, [
			["the field", field],
			["the label", label],
			["the H2", heading],
			["the first photo", photos.getByRole("link").first()],
		]);
		await expect(tile, `${at}: the gradient tile`).toHaveCSS("background-image", /linear-gradient/);
		await expect(tile.locator("svg"), `${at}: the images icon`).toHaveClass(
			/(?:^| )lucide-images(?: |$)/,
		);
		const tileBox = await boxOf(tile, `${at}: the tile`);
		const headingBox = await boxOf(heading, `${at}: the H2`);
		expect(tileBox.x + tileBox.width, `${at}: the tile is left of the H2`).toBeLessThanOrEqual(
			headingBox.x,
		);
		const fieldBox = await boxOf(field, `${at}: the field`);
		const region = await boxOf(photos, `${at}: the photos`);
		expect(
			region.y - fieldBox.y - fieldBox.height,
			`${at}: the heading is ${under} px under the columns`,
		).toBeCloseTo(under, 0);
		const first = await boxOf(photos.getByRole("link").first(), `${at}: the first photo`);
		expect(
			first.y - headingBox.y - headingBox.height,
			`${at}: the photos are ${above} px under the H2`,
		).toBeCloseTo(above, 0);
	}
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("the twenty photos fold and unfold the same way at 375 and 1440 px", async ({ page }) => {
		for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			await expectPhotosFold(
				page,
				many,
				PHOTOS,
				TWENTY,
				`without JavaScript at ${viewport.width} px`,
			);
		}
	});
});

test("an Activity with nine photos folds the ninth under ดูรูปทั้งหมด (9 รูป), which reads ซ่อนรูป 1 รูป once it is activated", async ({
	page,
}) => {
	await expectPhotosFold(page, nine, PHOTOS.slice(0, 9), NINE, "nine photos");
});

test("an Activity with eight photos shows them all and has no control", async ({ page }) => {
	await page.goto(eight.path);
	const photos = photosOf(page);
	await expectShown(photos, PHOTOS.slice(0, 8), "eight photos");
	await expect(photos.getByText(/^(ดูรูปทั้งหมด|ซ่อนรูป)/), "no control").toHaveCount(0);
});

test("the control follows the eighth photo in the Tab order, opens with Enter, closes with Space, and tells assistive technology whether it is expanded and which list it controls", async ({
	page,
}) => {
	await page.goto(many.path);
	const photos = photosOf(page);
	const focused = page.locator(":focus");
	await photos.getByRole("link").nth(7).focus();
	await page.keyboard.press("Tab");
	await expect(focused, "Tab from the eighth photo reaches the control").toHaveAccessibleName(
		TWENTY.closed,
	);
	const closed = await exposedDisclosure(page, TWENTY.closed);
	expect(closed.expanded, "closed, it is exposed as collapsed").toBe(false);
	expect(closed.controls, "it controls one element").toHaveLength(1);
	const controlled = page.locator(`[id="${closed.controls[0]}"]`);
	await expect(controlled.getByRole("link"), "it controls the photos that show").toHaveCount(8);

	await page.keyboard.press("Enter");
	await expectShown(photos, PHOTOS, "after Enter");
	await expect(focused, "the control keeps the focus").toHaveAccessibleName(TWENTY.open);
	expect((await exposedDisclosure(page, TWENTY.open)).expanded, "open, it is expanded").toBe(true);
	await expect(controlled.getByRole("link"), "the list it controls holds all twenty").toHaveCount(
		20,
	);

	await page.keyboard.press("Space");
	await expectShown(photos, PHOTOS.slice(0, 8), "after Space");
	await expect(focused, "the control keeps the focus").toHaveAccessibleName(TWENTY.closed);
	expect(
		(await exposedDisclosure(page, TWENTY.closed)).expanded,
		"closed again, it is collapsed",
	).toBe(false);
});

test("the thumbnails are square, cropped around their middle, four to a row from 1024 px and three below, and the folded photos carry on the rows", async ({
	page,
}) => {
	await page.goto(many.path);
	const photos = photosOf(page);
	const widths = [
		[1440, [4, 4], [4, 4, 4, 4, 4]],
		[1024, [4, 4], [4, 4, 4, 4, 4]],
		[1023, [3, 3, 2], [3, 3, 3, 3, 3, 3, 2]],
		[375, [3, 3, 2], [3, 3, 3, 3, 3, 3, 2]],
	] as const;
	for (const [width, closed, open] of widths) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(photos.getByRole("link")), `at ${width} px, closed`).toEqual(closed);
		await controlOf(photos, TWENTY.closed).click();
		expect(await itemsPerRow(photos.getByRole("link")), `at ${width} px, open`).toEqual(open);
		// The crop is the photo's object-fit and object-position as computed, which decide whether the
		// square shows the middle of the photo or squeezes all of it in; expectPictureWhole
		// (public.helpers.ts) reads the same values. Its aspect ratio alone cannot tell the two apart.
		const shapes = await photos.getByRole("img").evaluateAll((images) =>
			images.map((image) => {
				const { width, height } = image.getBoundingClientRect();
				const style = getComputedStyle(image);
				return { width, height, crop: [style.objectFit, style.objectPosition] };
			}),
		);
		for (const [index, shape] of shapes.entries()) {
			const label = `at ${width} px, photo ${index + 1}`;
			expect(Math.abs(shape.width - shape.height), `${label} is square`).toBeLessThan(1);
			expect(shape.crop, `${label} is cropped around its middle, not squashed`).toEqual([
				"cover",
				"50% 50%",
			]);
		}
		await controlOf(photos, TWENTY.open).click();
	}
});

test("each thumbnail opens its own photo's file", async ({ page }) => {
	await page.goto(many.path);
	const photos = photosOf(page);
	await controlOf(photos, TWENTY.closed).click();
	for (const photo of PHOTOS) {
		const href = await photos
			.getByRole("link", { name: photo.alt, exact: true })
			.getAttribute("href");
		const file = await page.request.get(href!);
		expect(file.status(), `${photo.alt} opens a file`).toBe(200);
		expect(
			Buffer.from(await file.body()).equals(Buffer.from(photo.png)),
			`${photo.alt} opens its own file`,
		).toBe(true);
	}
	const opened = page.waitForResponse((response) => response.request().isNavigationRequest());
	await photos.getByRole("link", { name: PHOTOS[0]!.alt, exact: true }).click();
	const file = await opened;
	expect(
		Buffer.from(await file.body()).equals(Buffer.from(PHOTOS[0]!.png)),
		"following the first thumbnail opens its file",
	).toBe(true);
});

test("each caption shows under its thumbnail, on two lines at most, at 375 and 1440 px", async ({
	page,
}) => {
	for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
		await page.setViewportSize(viewport);
		await page.goto(many.path);
		const photos = photosOf(page);
		for (const photo of PHOTOS.slice(0, 8)) {
			const figure = photos.getByRole("figure", { name: photo.caption, exact: true });
			await expectStacked(`${photo.alt} at ${viewport.width} px`, [
				["the thumbnail", figure.getByRole("link")],
				["its caption", figure.getByText(photo.caption, { exact: true })],
			]);
		}
		const long = photos.getByText(PHOTOS[0]!.caption, { exact: true });
		const lines = await long.evaluate((caption) => ({
			shown: caption.clientHeight / Number.parseFloat(getComputedStyle(caption).lineHeight),
			cut: caption.scrollHeight > caption.clientHeight + 1,
		}));
		expect(lines.cut, `at ${viewport.width} px the long caption needs more lines`).toBe(true);
		expect(lines.shown, `at ${viewport.width} px it shows two`).toBeCloseTo(2, 1);
	}
});

test("a photo without alt text is named by its caption, and one without a caption either by its place", async ({
	page,
}) => {
	await page.goto(unnamed.path);
	const links = photosOf(page).getByRole("link");
	await expect(links).toHaveCount(2);
	await expect(links.nth(0)).toHaveAccessibleName(unnamedCaption);
	await expect(links.nth(1)).toHaveAccessibleName("ภาพที่ 2");
});

test.describe("accessibility and reflow", () => {
	testAccessibilityAndReflow("the Activities with photos", () => [
		many.path,
		eight.path,
		unnamed.path,
	]);

	for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the Activity with twenty photos at ${viewport.width} px, closed and open`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			await page.goto(many.path);
			await expectNoAxeViolations(page, `closed at ${viewport.width} px`);
			await expectVisibleFocusOnEveryStop(page, `closed at ${viewport.width} px`);
			await controlOf(photosOf(page), TWENTY.closed).click();
			// The walk starts again at the main content, the skip link's target, past the header.
			await page.getByRole("main").focus();
			await expectNoAxeViolations(page, `open at ${viewport.width} px`);
			await expectVisibleFocusOnEveryStop(page, `open at ${viewport.width} px`);
		});
	}

	test("the Activity with twenty photos does not scroll sideways at 320 px with its photos open", async ({
		page,
	}) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto(many.path);
		await controlOf(photosOf(page), TWENTY.closed).click();
		await expectShown(photosOf(page), PHOTOS, "open at 320 px");
		await expectNoHorizontalScroll(page, "open at 320 px");
	});
});
