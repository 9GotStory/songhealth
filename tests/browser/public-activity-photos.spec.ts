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
// whose media item was deleted among them, so the page can show twenty; another has the first
// eight; a third has two photos without alt text, one with a caption and one without.
//
// Chromium's accessibility tree is read through the DevTools protocol (Playwright 1.63.0
// `newCDPSession`), because Playwright's own role model gives a `<summary>` no role: Chromium
// exposes it to assistive technology as a disclosure that is expanded or collapsed.

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
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	test,
	testAccessibilityAndReflow,
} from "./public.helpers";

/** The control's label while the twenty photos are folded, and while they all show. */
const CLOSED = "ดูรูปทั้งหมด (20 รูป)";
const OPEN = "ซ่อนรูป 12 รูป";

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
/** The Activity with the twenty photos, the one with the first eight, and one without alt text. */
let many: Activity;
let eight: Activity;
let unnamed: Activity;
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
	const control = controlOf(photos, text);
	await expect(control, `${label}: the control reads ${text}`).toBeVisible();
	const top = (await control.boundingBox())!.y;
	const bottom = await photos
		.getByRole("figure")
		.evaluateAll((figures) =>
			Math.max(...figures.map((figure) => figure.getBoundingClientRect().bottom)),
		);
	expect(top, `${label}: the control is under the photos`).toBeGreaterThanOrEqual(bottom - 0.5);
}

/**
 * Fail unless the Activity with twenty photos shows the first eight with the control under them,
 * all twenty above it once it is activated, and the first eight again once it is activated again.
 */
async function expectPhotosFold(page: Page, label: string): Promise<void> {
	await page.goto(many.path);
	const photos = photosOf(page);
	await expectShown(photos, PHOTOS.slice(0, 8), `${label}, closed`);
	for (const photo of PHOTOS.slice(8)) {
		const folded = photos.getByRole("link", { name: photo.alt, exact: true, includeHidden: true });
		await expect(folded, `${label}, closed: ${photo.alt} is in the page`).toHaveCount(1);
		await expect(folded, `${label}, closed: ${photo.alt} is folded`).toBeHidden();
	}
	await expectControlUnder(photos, CLOSED, `${label}, closed`);

	await controlOf(photos, CLOSED).click();
	await expectShown(photos, PHOTOS, `${label}, open`);
	await expectControlUnder(photos, OPEN, `${label}, open`);
	await expect(controlOf(photos, CLOSED), `${label}, open: ${CLOSED} is gone`).toBeHidden();

	await controlOf(photos, OPEN).click();
	await expectShown(photos, PHOTOS.slice(0, 8), `${label}, closed again`);
	await expectControlUnder(photos, CLOSED, `${label}, closed again`);
}

/**
 * The expanded state Chromium exposes to assistive technology on the node named `name` that has
 * one, or undefined when none has: the DevTools protocol's Accessibility.queryAXTree.
 */
async function exposedExpanded(page: Page, name: string): Promise<boolean | undefined> {
	const session = await page.context().newCDPSession(page);
	try {
		const { root } = await session.send("DOM.getDocument", { depth: 0 });
		const { nodes } = await session.send("Accessibility.queryAXTree", {
			nodeId: root.nodeId,
			accessibleName: name,
		});
		const expanded = nodes
			.flatMap((node) => node.properties ?? [])
			.find((property) => property.name === "expanded");
		return expanded?.value.value as boolean | undefined;
	} finally {
		await session.detach();
	}
}

/** How many of the photos that show sit in each row, top to bottom. */
function photosPerRow(photos: Locator): Promise<number[]> {
	return photos.getByRole("link").evaluateAll((links) => {
		const rows = new Map<number, number>();
		for (const link of links) {
			const top = Math.round(link.getBoundingClientRect().top);
			rows.set(top, (rows.get(top) ?? 0) + 1);
		}
		return [...rows.values()];
	});
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
});

test.afterAll(() => removeSuiteFixtures(admin));

test("an Activity with twenty photos shows the first eight with ดูรูปทั้งหมด (20 รูป) under them, all twenty with ซ่อนรูป 12 รูป under them once it is activated, and the eight again after", async ({
	page,
}) => {
	await expectPhotosFold(page, "with JavaScript");
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("the twenty photos fold and unfold the same way", async ({ page }) => {
		await expectPhotosFold(page, "without JavaScript");
	});
});

test("an Activity with eight photos shows them all and has no control", async ({ page }) => {
	await page.goto(eight.path);
	const photos = photosOf(page);
	await expectShown(photos, PHOTOS.slice(0, 8), "eight photos");
	await expect(photos.getByText(/^(ดูรูปทั้งหมด|ซ่อนรูป)/), "no control").toHaveCount(0);
});

test("the control follows the eighth photo in the Tab order, opens with Enter, closes with Space, and tells assistive technology whether it is expanded", async ({
	page,
}) => {
	await page.goto(many.path);
	const photos = photosOf(page);
	const focused = page.locator(":focus");
	await photos.getByRole("link").nth(7).focus();
	await page.keyboard.press("Tab");
	await expect(focused, "Tab from the eighth photo reaches the control").toHaveAccessibleName(
		CLOSED,
	);
	expect(await exposedExpanded(page, CLOSED), "closed, it is exposed as collapsed").toBe(false);

	await page.keyboard.press("Enter");
	await expectShown(photos, PHOTOS, "after Enter");
	await expect(focused, "the control keeps the focus").toHaveAccessibleName(OPEN);
	expect(await exposedExpanded(page, OPEN), "open, it is exposed as expanded").toBe(true);

	await page.keyboard.press("Space");
	await expectShown(photos, PHOTOS.slice(0, 8), "after Space");
	await expect(focused, "the control keeps the focus").toHaveAccessibleName(CLOSED);
	expect(await exposedExpanded(page, CLOSED), "closed again, it is exposed as collapsed").toBe(
		false,
	);
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
		expect(await photosPerRow(photos), `at ${width} px, closed`).toEqual(closed);
		await controlOf(photos, CLOSED).click();
		expect(await photosPerRow(photos), `at ${width} px, open`).toEqual(open);
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
		await controlOf(photos, OPEN).click();
	}
});

test("each thumbnail opens its own photo's file", async ({ page }) => {
	await page.goto(many.path);
	const photos = photosOf(page);
	await controlOf(photos, CLOSED).click();
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
			await controlOf(photosOf(page), CLOSED).click();
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
		await controlOf(photosOf(page), CLOSED).click();
		await expectShown(photosOf(page), PHOTOS, "open at 320 px");
		await expectNoHorizontalScroll(page, "open at 320 px");
	});
});
