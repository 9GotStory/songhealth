// Post pages: News, Activity and Health Content (Feature 006 #147; spec #144 "Post pages: News,
// Activity and Health Content" and "Testing Decisions", Seam A).
//
// A post states its story in words: a News or Health Content post shows its summary under its
// title, as an Activity post does (grill Q14), so a story told only in its One Page still reaches a
// citizen who cannot see the picture.
//
// From lg, 1024 px, a post with a picture reads in two columns: on the left what the page has, in
// its order, and on the right the picture whole with a "เปิดภาพขนาดเต็ม" link that opens its file.
// The picture stays in view while the left column scrolls, and stops where the two columns end, so
// it never covers what follows them, such as an Activity's photos. Below lg a post reads in one
// column in its order: the header, then the picture and the body (News, Health Content), or the
// details and then the picture (Activity). A post without a picture keeps one column.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness. Its fixtures are synthetic News, Activities and Health Content made through the native
// API and removed afterwards, each with a summary, and those with a picture carry a portrait A4
// stand-in for a One Page. The Activity's participants run to many lines, so its left column
// outlasts the picture on a 1440 × 900 window and the picture follows it for a while.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticDraft,
	devAdminActor,
	gradientPng,
	ONE_PAGE_SIZE,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticPicture,
	type CmsActor,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	detailOf,
	expect,
	expectImageLoaded,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectPictureWhole,
	expectVisibleFocusOnEveryStop,
	test,
} from "./public.helpers";

/**
 * The post templates, by collection: what the tests call a post, the kind its title names, the
 * address of a post, and what a post holds besides its title, summary and picture.
 */
const TEMPLATES = {
	news: {
		name: "News",
		kind: "ข่าว",
		path: (slug: string) => `/news/${slug}`,
		content: () => ({ body: [portableTextBlock(BODY)] }),
	},
	activities: {
		name: "Activity",
		kind: "กิจกรรม",
		path: (slug: string) => `/activities/${slug}`,
		content: () => ({
			location_text: `${SYNTHETIC_FIXTURE_MARK} ห้องประชุมสำนักงาน`,
			participants_text: Array.from(
				{ length: 48 },
				(_, index) => `${SYNTHETIC_FIXTURE_MARK} ผู้แทนหน่วยงานที่ ${index + 1}`,
			).join("\n"),
		}),
	},
	health_content: {
		name: "Health Content",
		kind: "ความรู้สุขภาพ",
		path: (slug: string) => `/health/content/${slug}`,
		content: () => ({ body: [portableTextBlock(BODY)] }),
	},
} as const;

type Template = keyof typeof TEMPLATES;

const ALL_TEMPLATES = Object.keys(TEMPLATES) as Template[];

/** The body of a News or Health Content fixture. */
const BODY = `${SYNTHETIC_FIXTURE_MARK} เนื้อหาของโพสต์`;

/** The full-size link's label. */
const FULL_SIZE = "เปิดภาพขนาดเต็ม";

/** A published fixture post: its address, title and summary. */
interface Post {
	path: string;
	title: string;
	summary: string;
}

/** A published fixture post with a picture: also the picture's alt text and its file. */
interface PicturedPost extends Post {
	alt: string;
	png: Uint8Array<ArrayBuffer>;
}

let admin: CmsActor;
/** Each template's post with a One Page as its picture; the Activity's has photos too. */
const pictured = {} as Record<Template, PicturedPost>;
/** Each template's post without a picture. */
const plain = {} as Record<Template, Post>;

/** Create and publish a post of `template` labelled `label`, with a summary and `data`. */
async function publishPost(
	template: Template,
	label: string,
	data: Record<string, unknown>,
): Promise<Post> {
	const { kind, path } = TEMPLATES[template];
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุป${kind} ${label}`;
	const draft = await createSyntheticDraft(admin, template, kind, label, {
		data: { summary, ...data },
	});
	await publishEntryAt(admin, template, draft.id);
	return { path: path(draft.slug), title: draft.title, summary };
}

/** `part`'s box in the window as the page is laid out and scrolled now, once it shows. */
async function boxOf(part: Locator, label: string) {
	await expect(part, label).toBeVisible();
	return (await part.boundingBox())!;
}

/**
 * Fail unless every one of `parts` shows, each one below the one before it, as the page is laid out
 * now.
 */
async function expectStacked(label: string, parts: Array<[name: string, part: Locator]>) {
	let above: { name: string; bottom: number } | undefined;
	for (const [name, part] of parts) {
		const box = await boxOf(part, `${label}: ${name}`);
		if (above) {
			expect(box.y, `${label}: ${name} is below ${above.name}`).toBeGreaterThanOrEqual(
				above.bottom - 0.5,
			);
		}
		above = { name, bottom: box.y + box.height };
	}
}

/** Whether two boxes share any area. */
function overlap(
	a: { x: number; y: number; width: number; height: number },
	b: { x: number; y: number; width: number; height: number },
): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The picture of a post with one, by its alt text. */
const pictureOf = (page: Page, post: PicturedPost) =>
	page.getByRole("main").getByRole("img", { name: post.alt });

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	const photos = [];
	for (const number of [1, 2, 3, 4]) {
		const caption = `${SYNTHETIC_FIXTURE_MARK} ภาพกิจกรรมที่ ${number}`;
		photos.push({ image: { id: await uploadSyntheticPicture(admin, caption) }, caption });
	}
	for (const [template, colours] of [
		["news", ["#123c33", "#bae0cf"]],
		["activities", ["#0b6b57", "#e8f0d9"]],
		["health_content", ["#bae0cf", "#f2d17a"]],
	] as const) {
		const { kind, content } = TEMPLATES[template];
		const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพ One Page ${kind}`;
		const png = gradientPng(colours[0], colours[1], ONE_PAGE_SIZE);
		const post = await publishPost(template, "pictured", {
			...content(),
			featured_image: { id: await uploadSyntheticPicture(admin, alt, png) },
			...(template === "activities" ? { gallery: photos } : {}),
		});
		pictured[template] = { ...post, alt, png };
		plain[template] = await publishPost(template, "plain", content());
	}
});

test.afterAll(() => removeSuiteFixtures(admin));

test("a News post and a Health Content post show their summary under the title, above its dates, at 375 and 1440 px", async ({
	page,
}) => {
	for (const template of ["news", "health_content"] as const) {
		const post = pictured[template];
		for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			await page.goto(post.path);
			const main = page.getByRole("main");
			await expectStacked(`${post.title} at ${viewport.width} px`, [
				["the title", main.getByRole("heading", { level: 1, name: post.title })],
				["the summary", main.getByText(post.summary, { exact: true })],
				["the date", main.getByText(/^เผยแพร่ /)],
			]);
		}
	}
});

test("at 1440 px a News, an Activity and a Health Content post with a picture show it whole on the right of the title, and เปิดภาพขนาดเต็ม opens its file", async ({
	page,
}) => {
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		const label = `${post.title} at 1440 px`;
		await page.goto(post.path);
		const main = page.getByRole("main");
		const picture = pictureOf(page, post);
		const { width, height } = await expectPictureWhole(picture, label);
		const shown = await boxOf(picture, label);
		// The picture fills its own box, so the placeholder EmDash's Image paints behind it never shows
		// beside it (#147 comment 6628040681).
		expect(
			Math.abs(shown.width - width) + Math.abs(shown.height - height),
			`${label}: the picture fills its box`,
		).toBeLessThan(1);
		const title = await boxOf(main.getByRole("heading", { level: 1 }), `${label}: the title`);
		expect(shown.x, `${label}: the picture is on the right of the title`).toBeGreaterThanOrEqual(
			title.x + title.width,
		);
		expect(shown.y, `${label}: the picture is beside the title, not below it`).toBeLessThan(
			title.y + title.height,
		);

		const opened = page.waitForResponse((response) => response.request().isNavigationRequest());
		await main.getByRole("link", { name: FULL_SIZE }).click();
		const file = await opened;
		expect(file.status(), `${label}: ${FULL_SIZE} opens a file`).toBe(200);
		expect(
			Buffer.from(await file.body()).equals(Buffer.from(post.png)),
			`${label}: ${FULL_SIZE} opens the picture's own file`,
		).toBe(true);
	}
});

test("at 1440 px a post without a picture keeps one column, its text wider than beside a picture", async ({
	page,
}) => {
	for (const template of ALL_TEMPLATES) {
		const textWidth = async (post: Post) => {
			await page.goto(post.path);
			const summary = page.getByRole("main").getByText(post.summary, { exact: true });
			return (await boxOf(summary, `${post.title}: the summary`)).width;
		};
		const beside = await textWidth(pictured[template]);
		const alone = await textWidth(plain[template]);
		const label = plain[template].title;
		await expect(page.getByRole("main").getByRole("img"), `${label}: no picture`).toHaveCount(0);
		await expect(
			page.getByRole("main").getByRole("link", { name: FULL_SIZE }),
			`${label}: no ${FULL_SIZE}`,
		).toHaveCount(0);
		expect(alone, `${label}: the text keeps the one column's width`).toBeGreaterThan(beside + 1);
	}
});

test("while an Activity post with photos scrolls at 1440 px, its picture stays in view beside the details, stops where they end, and never overlaps the photos", async ({
	page,
}) => {
	const post = pictured.activities;
	await page.goto(post.path);
	const main = page.getByRole("main");
	const picture = pictureOf(page, post);
	await expectImageLoaded(picture, "the picture");
	const parts = [
		picture,
		main.getByRole("link", { name: FULL_SIZE }),
		main.getByRole("heading", { level: 1 }),
		// The details card, the end of the left column, which is the longer.
		main.locator("dl"),
		main.getByRole("region", { name: "ภาพกิจกรรม" }),
	];
	const windowHeight = DESKTOP_VIEWPORT.height;
	const end = await page.evaluate(
		() => document.documentElement.scrollHeight - document.documentElement.clientHeight,
	);
	const overlaps: string[] = [];
	const outOfView: string[] = [];
	const pastTheDetails: string[] = [];
	let following = 0;
	for (let offset = 0; offset < end + 100; offset += 100) {
		const at = Math.min(offset, end);
		await page.evaluate((top) => window.scrollTo(0, top), at);
		const [shown, link, title, details, photos] = await Promise.all(
			parts.map((part) => boxOf(part, `scrolled ${at} px`)),
		);
		if (overlap(shown!, photos!)) overlaps.push(`the picture at ${at} px`);
		if (overlap(link!, photos!)) overlaps.push(`its link at ${at} px`);
		// The two columns end with the details, so the picture and its link stop there.
		if (link!.y + link!.height > details!.y + details!.height + 0.5) {
			pastTheDetails.push(
				`at ${at} px: by ${link!.y + link!.height - details!.y - details!.height} px`,
			);
		}
		// The left column scrolls: its title is above the window, and its details run on below it.
		if (title!.y + title!.height < 0 && details!.y + details!.height > windowHeight) {
			following += 1;
			if (shown!.y < 0 || shown!.y + shown!.height > windowHeight) {
				outOfView.push(`at ${at} px: from ${shown!.y} to ${shown!.y + shown!.height}`);
			}
		}
	}
	expect(following, "the left column scrolls past the window at some offsets").toBeGreaterThan(0);
	expect(outOfView, "the picture stays in view while the left column scrolls").toEqual([]);
	expect(pastTheDetails, "the picture and its link stop where the details end").toEqual([]);
	expect(overlaps, "the picture and its link never overlap the photos").toEqual([]);
});

test("at 375 px a post reads in one column in its order, the picture and its link after the header", async ({
	page,
}) => {
	await page.setViewportSize(PHONE_VIEWPORT);
	for (const template of ["news", "health_content"] as const) {
		const post = pictured[template];
		await page.goto(post.path);
		const main = page.getByRole("main");
		await expectStacked(`${post.title} at 375 px`, [
			["the title", main.getByRole("heading", { level: 1 })],
			["the date", main.getByText(/^เผยแพร่ /)],
			["the picture", pictureOf(page, post)],
			[FULL_SIZE, main.getByRole("link", { name: FULL_SIZE })],
			["the body", main.getByText(BODY, { exact: true })],
		]);
	}
	const activity = pictured.activities;
	await page.goto(activity.path);
	const main = page.getByRole("main");
	await expectStacked(`${activity.title} at 375 px`, [
		["the title", main.getByRole("heading", { level: 1 })],
		["the date", main.getByText(/^เผยแพร่ /)],
		["the details", detailOf(page, "ผู้เข้าร่วม")],
		["the picture", pictureOf(page, activity)],
		[FULL_SIZE, main.getByRole("link", { name: FULL_SIZE })],
		["the photos", main.getByRole("region", { name: "ภาพกิจกรรม" })],
	]);
});

for (const template of ALL_TEMPLATES) {
	for (const kind of ["pictured", "plain"] as const) {
		const name = `a ${TEMPLATES[template].name} post ${kind === "pictured" ? "with" : "without"} a picture`;
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on ${name} at 375 and 1440 px, and it does not scroll sideways at 320 px`, async ({
			page,
		}) => {
			const post = (kind === "pictured" ? pictured : plain)[template];
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				await page.goto(post.path);
				await expectNoAxeViolations(page, `${name} at ${viewport.width} px`);
				await expectVisibleFocusOnEveryStop(page, `${name} at ${viewport.width} px`);
			}
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, `${name} at 320 px`);
		});
	}
}
