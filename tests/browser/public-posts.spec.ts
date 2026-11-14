// Post pages: News, Activity and Health Content (Feature 006 #147; spec #144 "Post pages: News,
// Activity and Health Content" and "Testing Decisions", Seam A).
//
// A post states its story in words: a News or Health Content post shows its summary under its
// title, as an Activity post does (grill Q14), so a story told only in its One Page still reaches a
// citizen who cannot see the picture.
//
// A post opens on the deep field (Feature 009 #285; spec #280 "Post page: the header", "Post page:
// the picture", "Post page: the text"): its breadcrumb in white, a row of "เผยแพร่" and the date in
// an accent-warm pill and a News item's category in an outlined white pill, the title as the one
// H1, the summary and Health Content's review date. Its picture shows whole in a white frame with a
// "เปิดภาพขนาดเต็ม" link that opens its file. From lg, 1024 px, a post with a picture reads in two
// columns: the text column on the left and the frame's 28 rem column on the right, the frame
// starting on the field and staying in view while the text scrolls, stopping where the two columns
// end, so it never covers what follows them, such as an Activity's photos. Below lg a post reads in
// one column: the header on the field, the frame over the field's lower edge, then the text, an
// Activity's details card first (Product Owner, 2026-11-14: #285 comment 6877659654, item 1). A
// post without a picture keeps one column. The header rises in as the page opens and the frame
// after it, only where motion is allowed. Each template, with a picture and without, passes the
// axe, focus and reflow checks at the harness's widths and at 375 px.
//
// A News or Health Content post ends with what it holds (#198; spec #190 "Empty trailing content
// on News/Health Content Post pages", #190 comment 6707205912, Empty Post page row B): its body,
// its source and its Health Topics show only when it has them, in that order, 2 rem apart and the
// first 32 px under the field below lg and 40 px from lg, or 32 px under the frame where the frame
// comes before it (#285 comment 6877659654, item 2); a post with none of the three ends with its
// field, or with its frame where the frame is the taller, with no empty row after it. Each case
// (none, each alone, all three) is checked with a picture and without, at 320, 375 and 1023 px in
// one column and at 1024 and 1440 px in two. A post whose long summary makes its header taller
// than its picture shows where the empty row was, and its frame stops where its field ends.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness. Its fixtures are synthetic News, Activities and Health Content, a News category and a
// Health Topic made through the native API and removed afterwards, each post with a summary, and
// those with a picture carry a portrait A4 stand-in for a One Page. The News with a picture has a
// category and a summary of two lines, and each Health Content post a review date. The Activity's
// participants run to many lines, so its left column outlasts the picture on a 1440 × 900 window
// and the picture follows it for a while.

import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
	createSyntheticDraft,
	devAdminActor,
	gradientPng,
	mintPreviewLink,
	ONE_PAGE_SIZE,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	uploadSyntheticPicture,
	type CmsActor,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	boxOf,
	deepField,
	expect,
	expectFocusRingWhole,
	expectImageLoaded,
	entersAfter,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectPictureFillsBox,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	heldBack,
	selfRunningEnds,
	shownLines,
	test,
	testAccessibilityAndReflow,
	tokenColor,
} from "./public.helpers";

/**
 * The post templates, by collection: the kind a post's title names, the address of a post, and what
 * a post holds besides its title, summary and picture.
 */
const TEMPLATES = {
	news: {
		kind: "ข่าว",
		path: (slug: string) => `/news/${slug}`,
		content: () => ({ body: [portableTextBlock(BODY)], source_text: SOURCE }),
	},
	activities: {
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
		kind: "ความรู้สุขภาพ",
		path: (slug: string) => `/health/content/${slug}`,
		content: () => ({ body: [portableTextBlock(BODY)], source_text: SOURCE }),
	},
} as const;

type Template = keyof typeof TEMPLATES;

const ALL_TEMPLATES = Object.keys(TEMPLATES) as Template[];

/** The body of a News or Health Content fixture, and the source it names. */
const BODY = `${SYNTHETIC_FIXTURE_MARK} เนื้อหาของโพสต์`;
const SOURCE = `${SYNTHETIC_FIXTURE_MARK} สำนักงานสาธารณสุขอำเภอสอง`;

/** The full-size link's label. */
const FULL_SIZE = "เปิดภาพขนาดเต็ม";

/** The heading over a post's Health Topics (TopicPills.astro). */
const TOPICS_HEADING = "ประเด็นสุขภาพ";

/** The templates whose posts hold a body, a source and Health Topics after the header. */
const TEXT_TEMPLATES = ["news", "health_content"] as const;

type TextTemplate = (typeof TEXT_TEMPLATES)[number];

/** What a News or Health Content post can hold after its header and picture, in its order. */
type TrailingPart = "body" | "source" | "topic";

/**
 * The trailing parts of each case: each one alone, all three, and none, last, so a test reaches the
 * cases with parts before the one with none.
 */
const TRAILING_CASES: ReadonlyArray<readonly TrailingPart[]> = [
	["body"],
	["source"],
	["topic"],
	["body", "source", "topic"],
	[],
];

/** The widths a post's layout is checked at: one column up to 1023 px, two columns from 1024. */
const LAYOUT_VIEWPORTS = [
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	{ width: 1023, height: 900 },
	{ width: 1024, height: 900 },
	DESKTOP_VIEWPORT,
];

/** The frame's column from lg, 28 rem, and the gap between it and the text column, 3 rem. */
const FRAME_COLUMN = 448;
const COLUMN_GAP = 48;

/** The text column's widest, 44 rem, beside the frame from lg. */
const TEXT_COLUMN = 704;

/** The frame's padding around the picture and its link. */
const FRAME_PADDING = 10;

/** From lg the frame starts 4.25 rem under the field's top; below lg 48 px above its lower edge. */
const FRAME_FROM_FIELD_TOP = 68;
const FRAME_OVER_EDGE = 48;

/** The frame's widest below lg, 48 rem. */
const FRAME_WIDEST = 768;

/** The space between a post's trailing parts, 2 rem. */
const TRAILING_GAP = 32;

/** How far under the field a post's text starts, below lg and from lg. */
const TEXT_UNDER_FIELD = { belowLg: 32, fromLg: 40 };

/** How far under the frame a post's text starts below lg, where the frame comes before it. */
const TEXT_UNDER_FRAME = 32;

/** How far the field reaches under its header, below `sm` and from `sm`; below lg with a frame. */
const FIELD_UNDER_HEADER = { belowSm: 40, fromSm: 48, withFrame: 80 };

/** The header's widest, 48 rem, the breadcrumb's with it. */
const HEADER_WIDEST = 768;

/** The breadcrumb's accessible name (Breadcrumb.astro). */
const BREADCRUMB = "เส้นทางนำทาง";

/** The page's gutter beside its column, below `sm` and from `sm`. */
const gutterAt = (width: number) => (width < 640 ? 16 : 24);

/** When the Health Content fixtures were last reviewed, so their header ends with ทบทวนล่าสุด. */
const REVIEWED_AT = "2026-09-23T17:30:00.000Z";

/** A summary of 48 lines, which staff's line breaks keep, so its header outlasts the picture. */
const LONG_SUMMARY = Array.from(
	{ length: 48 },
	(_, index) => `${SYNTHETIC_FIXTURE_MARK} สรุปบรรทัดที่ ${index + 1}`,
).join("\n");

/** A published fixture post: its address, title and summary. */
interface Post {
	path: string;
	title: string;
	summary: string;
}

/** A picture's alt text and its file. */
interface Picture {
	alt: string;
	png: Uint8Array<ArrayBuffer>;
}

/** A published fixture post with a picture. */
type PicturedPost = Post & Picture;

/** A part of a page, with the name the failures give it. */
type NamedPart = [name: string, part: Locator];

/** A part's box in the window. */
type Box = Awaited<ReturnType<typeof boxOf>>;

/**
 * A published News or Health Content fixture: its trailing parts, and its picture if it has one.
 */
interface TrailingPost extends Post {
	template: TextTemplate;
	parts: readonly TrailingPart[];
	picture?: Picture;
}

let admin: CmsActor;
/** The category of the News with a picture. */
let category: SyntheticTerm;
/** Each template's post with a One Page as its picture; the Activity's has photos too. */
const pictured = {} as Record<Template, PicturedPost>;
/** Each template's post without a picture. */
const plain = {} as Record<Template, Post>;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/**
 * Create and publish a post of `template` labelled `label`, with `data`, `summary` or a short one
 * naming its label, and `taxonomies`.
 */
async function publishPost(
	template: Template,
	label: string,
	data: Record<string, unknown>,
	{ summary, taxonomies }: { summary?: string; taxonomies?: Record<string, string[]> } = {},
): Promise<Post> {
	const { kind, path } = TEMPLATES[template];
	const shown = summary ?? `${SYNTHETIC_FIXTURE_MARK} สรุป${kind} ${label}`;
	const draft = await createSyntheticDraft(admin, template, kind, label, {
		data: { summary: shown, ...data },
		...(taxonomies === undefined ? {} : { taxonomies }),
	});
	await publishEntryAt(admin, template, draft.id);
	return { path: path(draft.slug), title: draft.title, summary: shown };
}

/** Whether two boxes share any area. */
function overlap(a: Box, b: Box): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The picture of a post with one, by its alt text. */
const pictureOf = (page: Page, picture: Picture) =>
	page.getByRole("main").getByRole("img", { name: picture.alt });

/** A post's title, the page's one H1. */
const titleOf = (page: Page, post: Post) =>
	page.getByRole("main").getByRole("heading", { level: 1, name: post.title });

/** The white frame that holds a post's picture and its เปิดภาพขนาดเต็ม link, a part with no role. */
const frameOf = (page: Page) => page.getByTestId("picture-frame");

/** The page's breadcrumb, on the field. */
const breadcrumbOf = (page: Page) => deepField(page).getByRole("navigation", { name: BREADCRUMB });

/** An Activity's photos, which follow the columns, as a part to place; none for another kind. */
const photosOf = (page: Page, template: Template): NamedPart[] =>
	template === "activities"
		? [["the photos", page.getByRole("main").getByRole("region", { name: "ภาพกิจกรรม" })]]
		: [];

/**
 * A post's picture, its เปิดภาพขนาดเต็ม link and the frame that holds them, and the picture and the
 * link as named parts in their order.
 */
function pictureParts(page: Page, picture: Picture) {
	const shown = pictureOf(page, picture);
	const link = page.getByRole("main").getByRole("link", { name: FULL_SIZE });
	const named: NamedPart[] = [
		["the picture", shown],
		[FULL_SIZE, link],
	];
	return { shown, link, frame: frameOf(page), named };
}

/**
 * Fail unless, as the page is laid out now, `frame` is white with its corners of 24 px and its
 * shadow, and holds `picture`, whose corners are 18 px, 10 px inside it, and under the picture the
 * เปิดภาพขนาดเต็ม link. Gives the frame's box.
 */
async function expectFramed(
	page: Page,
	frame: Locator,
	picture: Locator,
	label: string,
): Promise<Box> {
	await expect(frame, `${label}: the white frame`).toHaveCSS(
		"background-color",
		await tokenColor(page, "surface-base"),
	);
	await expect(frame, `${label}: the frame's corners`).toHaveCSS("border-top-left-radius", "24px");
	// The deep shadow (DESIGN.md §3.1), after Tailwind's empty ring and inset layers.
	await expect(frame, `${label}: the frame's deep shadow`).toHaveCSS(
		"box-shadow",
		/rgba\(13, 46, 36, 0\.35\) 0px 30px 60px -20px$/,
	);
	await expect(picture, `${label}: the picture's corners`).toHaveCSS(
		"border-top-left-radius",
		"18px",
	);
	await expectPictureFillsBox(picture, label);
	const box = await boxOf(frame, `${label}: the frame`);
	const shown = await boxOf(picture, `${label}: the picture`);
	const link = await boxOf(
		frame.getByRole("link", { name: FULL_SIZE }),
		`${label}: ${FULL_SIZE} in the frame`,
	);
	expect(shown.x - box.x, `${label}: the picture 10 px inside the frame`).toBeCloseTo(
		FRAME_PADDING,
		0,
	);
	expect(shown.y - box.y, `${label}: the picture 10 px under the frame's top`).toBeCloseTo(
		FRAME_PADDING,
		0,
	);
	expect(shown.width, `${label}: the picture fills the frame's width`).toBeCloseTo(
		box.width - 2 * FRAME_PADDING,
		0,
	);
	expect(link.y, `${label}: ${FULL_SIZE} under the picture`).toBeGreaterThanOrEqual(
		shown.y + shown.height - 0.5,
	);
	expect(
		link.y + link.height,
		`${label}: ${FULL_SIZE} inside the frame, 10 px above its foot`,
	).toBeCloseTo(box.y + box.height - FRAME_PADDING, 0);
	return box;
}

/**
 * Fail unless, as the page is laid out now, `picture` shows whole on the right of `title` and
 * beside it, and each of `text` on its left.
 */
async function expectPictureBeside(
	picture: Locator,
	title: Locator,
	text: NamedPart[],
	label: string,
): Promise<Box> {
	// The picture fills its own box, so the placeholder EmDash's Image paints behind it never shows
	// beside it (#147 comment 6628040681).
	await expectPictureFillsBox(picture, label);
	const shown = await boxOf(picture, label);
	const heading = await boxOf(title, `${label}: the title`);
	expect(shown.x, `${label}: the picture is on the right of the title`).toBeGreaterThanOrEqual(
		heading.x + heading.width,
	);
	expect(shown.y, `${label}: the picture is beside the title, not below it`).toBeLessThan(
		heading.y + heading.height,
	);
	for (const [name, part] of text) {
		const box = await boxOf(part, `${label}: ${name}`);
		expect(
			box.x + box.width,
			`${label}: ${name} is on the left of the picture`,
		).toBeLessThanOrEqual(shown.x);
	}
	return shown;
}

/** Fail unless เปิดภาพขนาดเต็ม on the page opens `png`, the picture's own file. */
async function expectFullSizeOpens(
	page: Page,
	png: Uint8Array<ArrayBuffer>,
	label: string,
): Promise<void> {
	const opened = page.waitForResponse((response) => response.request().isNavigationRequest());
	await page.getByRole("main").getByRole("link", { name: FULL_SIZE }).click();
	const file = await opened;
	expect(file.status(), `${label}: ${FULL_SIZE} opens a file`).toBe(200);
	expect(
		Buffer.from(await file.body()).equals(Buffer.from(png)),
		`${label}: ${FULL_SIZE} opens the picture's own file`,
	).toBe(true);
}

/**
 * Scroll the page from its top to its end 100 px at a time, and give at each offset the boxes of
 * `parts` in the window.
 */
async function scrolledBoxes(
	page: Page,
	parts: Locator[],
): Promise<Array<{ at: number; boxes: Box[] }>> {
	const end = await page.evaluate(
		() => document.documentElement.scrollHeight - document.documentElement.clientHeight,
	);
	const offsets = [];
	for (let offset = 0; offset < end + 100; offset += 100) {
		const at = Math.min(offset, end);
		await page.evaluate((top) => window.scrollTo(0, top), at);
		offsets.push({
			at,
			boxes: await Promise.all(parts.map((part) => boxOf(part, `scrolled ${at} px`))),
		});
	}
	return offsets;
}

/**
 * Scroll the page through at 1440 px and fail unless the frame of the picture stays in view,
 * 1.5 rem below the sticky header, while the left column scrolls (its `title` above the window and
 * its last part, `end`, below it), as it does at some offsets, and the frame never passes the
 * bottom of `end`, where the two columns end, and stops there. Gives the boxes at each offset of
 * the frame and each of `more`.
 */
async function expectFrameFollows(
	page: Page,
	title: Locator,
	end: Locator,
	more: Locator[] = [],
): Promise<Array<{ at: number; frame: Box; more: Box[] }>> {
	const windowHeight = DESKTOP_VIEWPORT.height;
	// The sticky header covers the top of the window (#240).
	const headerHeight = (await page.getByRole("banner").boundingBox())!.height;
	const offsets = await scrolledBoxes(page, [frameOf(page), title, end, ...more]);
	const outOfView: string[] = [];
	const pastTheEnd: string[] = [];
	let following = 0;
	let stuck = 0;
	let stopped = 0;
	for (const {
		at,
		boxes: [frame, titleBox, endBox],
	} of offsets) {
		const frameBottom = frame!.y + frame!.height;
		const endBottom = endBox!.y + endBox!.height;
		if (frameBottom > endBottom + 0.5)
			pastTheEnd.push(`at ${at} px: by ${frameBottom - endBottom} px`);
		if (Math.abs(frameBottom - endBottom) <= 0.5) stopped += 1;
		if (titleBox!.y + titleBox!.height < 0 && endBottom > windowHeight) {
			following += 1;
			if (frame!.y < headerHeight || frameBottom > windowHeight) {
				outOfView.push(`at ${at} px: from ${frame!.y} to ${frameBottom}`);
			}
			if (Math.abs(frame!.y - headerHeight - 24) <= 0.5) stuck += 1;
		}
	}
	expect(following, "the left column scrolls past the window at some offsets").toBeGreaterThan(0);
	expect(outOfView, "the frame stays in view while the left column scrolls").toEqual([]);
	expect(stuck, "the frame stays 1.5 rem under the site's header").toBeGreaterThan(0);
	expect(pastTheEnd, "the frame never passes the end of the left column").toEqual([]);
	expect(stopped, "the frame stops at the end of the left column").toBeGreaterThan(0);
	return offsets.map(({ at, boxes: [frame, , , ...moreBoxes] }) => ({
		at,
		frame: frame!,
		more: moreBoxes,
	}));
}

/**
 * How far the post runs on below the lowest of `parts`, as the page is laid out now: from that
 * part's bottom to the end of the article's content, inside its padding. 0 means nothing empty
 * follows the post's last part.
 */
async function spaceAfter(page: Page, parts: NamedPart[], label: string): Promise<number> {
	let lowest = -Infinity;
	for (const [name, part] of parts) {
		const box = await boxOf(part, `${label}: ${name}`);
		lowest = Math.max(lowest, box.y + box.height);
	}
	const end = await page
		.getByRole("main")
		.getByRole("article")
		.evaluate(
			(article) =>
				article.getBoundingClientRect().bottom -
				Number.parseFloat(getComputedStyle(article).paddingBottom),
		);
	return end - lowest;
}

/**
 * A post's header as it reads on its field: the publication date, the title, the summary and, on
 * Health Content, the review date.
 */
function headerOf(page: Page, post: Post, template: Template): NamedPart[] {
	const field = deepField(page);
	const header: NamedPart[] = [
		["the date", field.getByText(/^เผยแพร่ /)],
		["the title", field.getByRole("heading", { level: 1, name: post.title })],
		["the summary", field.getByText(post.summary, { exact: true })],
	];
	if (template === "health_content") {
		header.push(["the review date", field.getByText(/^ทบทวนล่าสุด /)]);
	}
	return header;
}

/** A post's text after its header and frame, as `expectStacked` reads it: its first part. */
function textOf(page: Page, template: Template): NamedPart {
	const main = page.getByRole("main");
	return template === "activities"
		? ["the details", main.locator("dl")]
		: ["the body", main.getByText(BODY, { exact: true })];
}

/** What each trailing part shows, in its order: the topic's are its heading, then its list. */
function trailingOf(page: Page, topic: SyntheticTerm): Record<TrailingPart, NamedPart[]> {
	const main = page.getByRole("main");
	return {
		body: [["the body", main.getByText(BODY, { exact: true })]],
		source: [["the source", main.getByText(`แหล่งที่มา: ${SOURCE}`, { exact: true })]],
		topic: [
			["the topics' heading", main.getByRole("heading", { name: TOPICS_HEADING })],
			[
				"the topics",
				main.getByRole("list").filter({ has: page.getByRole("link", { name: topic.label }) }),
			],
		],
	};
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	category = await createOwnedTerm(admin, "news_category", "ประชาสัมพันธ์", ownedTerms);
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
		const post = await publishPost(
			template,
			"pictured",
			{
				...content(),
				featured_image: { id: await uploadSyntheticPicture(admin, alt, png) },
				...(template === "activities" ? { gallery: photos } : {}),
				...(template === "health_content" ? { reviewed_at: REVIEWED_AT } : {}),
			},
			template === "news"
				? {
						summary: `${SYNTHETIC_FIXTURE_MARK} สรุปข่าวบรรทัดแรก\n${SYNTHETIC_FIXTURE_MARK} บรรทัดที่สอง`,
						taxonomies: { news_category: [category.slug] },
					}
				: {},
		);
		pictured[template] = { ...post, alt, png };
		plain[template] = await publishPost(template, "plain", {
			...content(),
			...(template === "health_content" ? { reviewed_at: REVIEWED_AT } : {}),
		});
	}
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

test("a News, an Activity and a Health Content post open on the deep field: the breadcrumb in white, 24 px under it เผยแพร่ and the date in an accent-warm pill beside a News item's category in an outlined white pill, the title as the page's one H1, the summary with its line breaks and Health Content's ทบทวนล่าสุด, in that order, each on the field in surface-base, at 375 and 1440 px; a part the post lacks is left out", async ({
	page,
}) => {
	const colours = {} as Record<"white" | "warm" | "dark", string>;
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		await page.goto(post.path);
		colours.white ??= await tokenColor(page, "surface-base");
		colours.warm ??= await tokenColor(page, "accent-warm");
		colours.dark ??= await tokenColor(page, "brand-dark");
		const field = deepField(page);
		const breadcrumb = breadcrumbOf(page);
		const header = headerOf(page, post, template);
		const [[, date], [, title], [, summary]] = header;
		const pill = field.getByText(category.label, { exact: true });
		await expect(page.getByRole("heading", { level: 1 }), `${template}: one H1`).toHaveCount(1);
		for (const viewport of [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			const label = `${post.title} at ${viewport.width} px`;
			await expectStacked(label, [["the breadcrumb", breadcrumb], ...header]);
			const fieldBox = await boxOf(field, `${label}: the field`);
			for (const [name, part] of [["the breadcrumb", breadcrumb] as const, ...header]) {
				const box = await boxOf(part, `${label}: ${name}`);
				expect(box.y, `${label}: ${name} starts on the field`).toBeGreaterThanOrEqual(fieldBox.y);
				expect(box.y + box.height, `${label}: ${name} ends on the field`).toBeLessThanOrEqual(
					fieldBox.y + fieldBox.height,
				);
			}
			const crumbs = await boxOf(breadcrumb, `${label}: the breadcrumb`);
			expect(
				(await boxOf(date, `${label}: the date`)).y - crumbs.y - crumbs.height,
				`${label}: the date's row 24 px under the breadcrumb`,
			).toBeCloseTo(24, 0);
			for (const [name, part] of [
				["the breadcrumb's current page", breadcrumb.locator('[aria-current="page"]')],
				["a breadcrumb's link", breadcrumb.getByRole("link").first()],
				...header.slice(1),
			] as const) {
				await expect(part, `${label}: ${name} in surface-base`).toHaveCSS("color", colours.white);
			}
			await expect(date, `${label}: the date's accent-warm pill`).toHaveCSS(
				"background-color",
				colours.warm,
			);
			await expect(date, `${label}: the date in brand-dark`).toHaveCSS("color", colours.dark);
			await expect(date, `${label}: the date at 13 px`).toHaveCSS("font-size", "13px");
			await expect(date, `${label}: the date's 20 px line`).toHaveCSS("line-height", "20px");
			await expect(date, `${label}: the date semibold`).toHaveCSS("font-weight", "600");
			if (template === "news") {
				const dateBox = await boxOf(date, `${label}: the date`);
				const pillBox = await boxOf(pill, `${label}: the category`);
				// The category follows the date on its row, or, too long for what is left of it, on the
				// next row 8 px under it.
				if (Math.abs(pillBox.y - dateBox.y) <= 1) {
					expect(pillBox.x, `${label}: the category after the date`).toBeGreaterThan(
						dateBox.x + dateBox.width,
					);
				} else {
					expect(pillBox.x, `${label}: the category starts the next row`).toBeCloseTo(dateBox.x, 0);
					expect(
						pillBox.y - dateBox.y - dateBox.height,
						`${label}: the category's row 8 px under the date's`,
					).toBeCloseTo(8, 0);
				}
				await expect(pill, `${label}: the category in surface-base`).toHaveCSS(
					"color",
					colours.white,
				);
				await expect(pill, `${label}: the category's outline`).toHaveCSS(
					"border-top-style",
					"solid",
				);
				await expect(pill, `${label}: the outline 1 px wide`).toHaveCSS("border-top-width", "1px");
				// surface-base at 40 %, which the browser gives in oklab.
				await expect(pill, `${label}: the outline white at 40 %`).toHaveCSS(
					"border-top-color",
					/^oklab\(0\.99\d* [-\d.e]+ [-\d.e]+ \/ 0\.4\)$/,
				);
				await expect(pill, `${label}: the category's pill is not filled`).toHaveCSS(
					"background-color",
					"rgba(0, 0, 0, 0)",
				);
				// Staff's line break keeps the summary's second line; at 1440 px each line fits.
				if (viewport === DESKTOP_VIEWPORT) {
					expect((await shownLines(summary)).lines, `${label}: the summary's two lines`).toBe(2);
				}
			} else {
				await expect(pill, `${label}: no category`).toHaveCount(0);
			}
		}
		// The title in today's sizes: H3 below 640 px, H2 from 640 px and H1 from 1,024 px.
		for (const [width, size] of [
			[639, "24px"],
			[640, "34px"],
			[1023, "34px"],
			[1024, "46px"],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await expect(title, `${template}: the title at ${width} px`).toHaveCSS("font-size", size);
		}
	}
	// A News item without a category shows the date alone on its row.
	await page.goto(plain.news.path);
	const date = deepField(page).getByText(/^เผยแพร่ /);
	await expect(date.locator("xpath=.."), "the row holds the date alone").toHaveText(
		(await date.textContent())!,
	);
	// A draft has no publication date and an Activity no category, so its preview has no row:
	// its title follows the breadcrumb.
	const draft = await createSyntheticDraft(admin, "activities", "กิจกรรม", "draft", {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมฉบับร่าง` },
	});
	await page.goto((await mintPreviewLink(admin, "activities", draft.id)).toString());
	const field = deepField(page);
	await expect(field.getByRole("heading", { level: 1 }), "the draft's title").toHaveText(
		draft.title,
	);
	await expect(field.getByText(/เผยแพร่/), "no publication date").toHaveCount(0);
	const crumbs = await boxOf(breadcrumbOf(page), "the draft");
	expect(
		(await boxOf(field.getByRole("heading", { level: 1 }), "the draft's title")).y -
			crumbs.y -
			crumbs.height,
		"the draft's title 24 px under the breadcrumb, with no row of pills between",
	).toBeCloseTo(24, 0);
});

test("a Post page's field has the small glow in its upper right corner from 640 px and the phone glow below, no ring or other decoration, lower corners of 32 and 24 px, and reaches 48 px under the header from 640 px and 40 px below, or 80 px below 1,024 px where the frame follows; its focus ring is accent-warm, and the frame's link keeps the page's", async ({
	page,
}) => {
	for (const [post, template, widths] of [
		[plain.news, "news", [375, 639, 640, 1024, 1440]],
		[pictured.news, "news", [375, 1023, 1024, 1440]],
		[plain.health_content, "health_content", [375, 1440]],
	] as const) {
		await page.goto(post.path);
		const field = deepField(page);
		await expect(
			field.locator(':scope > [aria-hidden="true"] > *'),
			`${post.title}: no ring or other decoration`,
		).toHaveCount(0);
		const header = headerOf(page, post, template);
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${post.title} at ${width} px`;
			const glow = await field.evaluate((element) =>
				getComputedStyle(element).getPropertyValue("--deep-field-glow").trim(),
			);
			expect(glow, `${label}: the field's glow`).toBe(
				width < 640 ? "45% 18rem at 100% 0%" : "28% 12rem at 100% 0%",
			);
			for (const side of ["left", "right"]) {
				await expect(field, `${label}: the field's lower corners`).toHaveCSS(
					`border-bottom-${side}-radius`,
					width < 640 ? "24px" : "32px",
				);
			}
			const last = await boxOf(header.at(-1)![1], `${label}: the header's last part`);
			const fieldBox = await boxOf(field, `${label}: the field`);
			const room =
				post === pictured.news && width < 1024
					? FIELD_UNDER_HEADER.withFrame
					: width < 640
						? FIELD_UNDER_HEADER.belowSm
						: FIELD_UNDER_HEADER.fromSm;
			expect(
				fieldBox.y + fieldBox.height - last.y - last.height,
				`${label}: the field reaches ${room} px under the header`,
			).toBeCloseTo(room, 0);
		}
	}

	await page.setViewportSize(DESKTOP_VIEWPORT);
	await page.goto(pictured.news.path);
	const crumbs = breadcrumbOf(page).getByRole("link");
	await expectFocusRingWhole(crumbs.first(), "the breadcrumb's first link");
	await expect(crumbs.first(), "the field's focus ring").toHaveCSS(
		"outline-color",
		await tokenColor(page, "accent-warm"),
	);
	await crumbs.last().focus();
	await page.keyboard.press("Tab");
	const link = frameOf(page).getByRole("link", { name: FULL_SIZE });
	await expect(link, "the keyboard goes from the breadcrumb to the frame's link").toBeFocused();
	await expect(link, "the page's focus ring in the white frame").toHaveCSS(
		"outline-color",
		await tokenColor(page, "brand-primary"),
	);
	await expect(link, "a whole focus ring").toHaveCSS("outline-width", "3px");
});

test("from 1,024 px a News, an Activity and a Health Content post with a picture read in two columns: the text column at most 44 rem, 3 rem from the frame's 28 rem column; the frame, white with the picture whole 10 px inside it and เปิดภาพขนาดเต็ม under the picture, starts on the field 4.25 rem under its top, level with the date's row, and runs over the field's lower edge; the field is as high as the header, the text starts 40 px under it, and เปิดภาพขนาดเต็ม opens the picture's file", async ({
	page,
}) => {
	let levelRead = 0;
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		await page.goto(post.path);
		const field = deepField(page);
		const breadcrumb = breadcrumbOf(page);
		const header = headerOf(page, post, template);
		const text = textOf(page, template);
		const { shown, frame } = pictureParts(page, post);
		for (const width of [1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${post.title} at ${width} px`;
			await expectNoHorizontalScroll(page, label);
			await expectPictureBeside(shown, header[1][1], [...header, text], label);
			const box = await expectFramed(page, frame, shown, label);
			// The breadcrumb spans the text column.
			const crumbs = await boxOf(breadcrumb, `${label}: the text column`);
			const fieldBox = await boxOf(field, `${label}: the field`);
			expect(box.width, `${label}: the frame's 28 rem column`).toBeCloseTo(FRAME_COLUMN, 0);
			expect(crumbs.width, `${label}: the text column`).toBeCloseTo(
				Math.min(TEXT_COLUMN, width - 2 * gutterAt(width) - FRAME_COLUMN - COLUMN_GAP),
				0,
			);
			expect(box.x - crumbs.x - crumbs.width, `${label}: 3 rem between the columns`).toBeCloseTo(
				COLUMN_GAP,
				0,
			);
			expect(box.y - fieldBox.y, `${label}: the frame 4.25 rem under the field's top`).toBeCloseTo(
				FRAME_FROM_FIELD_TOP,
				0,
			);
			// Level with the date's row where the breadcrumb takes one line; a breadcrumb that wraps
			// moves the row down, and the frame keeps its place.
			if (crumbs.height <= 20.5) {
				levelRead += 1;
				expect(
					Math.abs((await boxOf(header[0][1], `${label}: the date`)).y - box.y),
					`${label}: the frame level with the date's row`,
				).toBeLessThanOrEqual(1);
			}
			expect(
				box.y + box.height,
				`${label}: the frame runs over the field's lower edge`,
			).toBeGreaterThan(fieldBox.y + fieldBox.height);
			const last = await boxOf(header.at(-1)![1], `${label}: the header's last part`);
			expect(
				fieldBox.y + fieldBox.height - last.y - last.height,
				`${label}: the field as high as the header`,
			).toBeCloseTo(FIELD_UNDER_HEADER.fromSm, 0);
			expect(
				(await boxOf(text[1], `${label}: ${text[0]}`)).y - fieldBox.y - fieldBox.height,
				`${label}: ${text[0]} 40 px under the field`,
			).toBeCloseTo(TEXT_UNDER_FIELD.fromLg, 0);
		}
		await expectFullSizeOpens(page, post.png, `${post.title} at 1440 px`);
	}
	expect(levelRead, "the frame read level with a one-line breadcrumb's date row").toBeGreaterThan(
		0,
	);
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
		await expect(frameOf(page), `${label}: no frame`).toHaveCount(0);
		await expect(
			page.getByRole("main").getByRole("link", { name: FULL_SIZE }),
			`${label}: no ${FULL_SIZE}`,
		).toHaveCount(0);
		expect(alone, `${label}: the text keeps the one column's width`).toBeGreaterThan(beside + 1);
		expect(
			(await boxOf(breadcrumbOf(page), `${label}: the breadcrumb`)).width,
			`${label}: the header, its breadcrumb with it, at most 48 rem wide`,
		).toBeLessThanOrEqual(HEADER_WIDEST + 0.5);
	}
});

test("while an Activity post with photos scrolls at 1440 px, its frame stays in view beside the details, stops where they end, and never overlaps the photos, which follow the columns across the page", async ({
	page,
}) => {
	const post = pictured.activities;
	await page.goto(post.path);
	const main = page.getByRole("main");
	await expectImageLoaded(pictureOf(page, post), "the picture");
	const photos = main.getByRole("region", { name: "ภาพกิจกรรม" });
	const overlaps: string[] = [];
	for (const {
		at,
		frame,
		more: [photosBox],
	} of await expectFrameFollows(
		page,
		main.getByRole("heading", { level: 1 }),
		// The details card, the end of the left column, which is the longer.
		main.locator("dl"),
		[photos],
	)) {
		if (overlap(frame, photosBox!)) overlaps.push(`the frame at ${at} px`);
	}
	expect(overlaps, "the frame never overlaps the photos").toEqual([]);
	await page.evaluate(() => window.scrollTo(0, 0));
	const column = await boxOf(breadcrumbOf(page), "the text column");
	const frame = await boxOf(frameOf(page), "the frame");
	// The section spans the page's column with the gutter inside it.
	const region = await boxOf(photos, "the photos");
	const gutter = gutterAt(DESKTOP_VIEWPORT.width);
	expect(region.x + gutter, "the photos start at the page's column").toBeCloseTo(column.x, 0);
	expect(region.x + region.width - gutter, "the photos reach the frame's right edge").toBeCloseTo(
		frame.x + frame.width,
		0,
	);
});

test("below 1,024 px a News, an Activity and a Health Content post with a picture read in one column: the header on the field, the frame at most 48 rem wide starting 48 px above the field's lower edge with the picture whole and เปิดภาพขนาดเต็ม inside it, then the text 32 px under the frame, an Activity's details card first and its photos after, at 320, 375, 768 and 1023 px", async ({
	page,
}) => {
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		await page.goto(post.path);
		const field = deepField(page);
		const header = headerOf(page, post, template);
		const text = textOf(page, template);
		const { shown, link, frame } = pictureParts(page, post);
		for (const width of [320, 375, 768, 1023]) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${post.title} at ${width} px`;
			await expectNoHorizontalScroll(page, label);
			await expectStacked(label, [
				...header,
				["the picture", shown],
				[FULL_SIZE, link],
				text,
				...photosOf(page, template),
			]);
			const box = await expectFramed(page, frame, shown, label);
			const fieldBox = await boxOf(field, `${label}: the field`);
			expect(box.width, `${label}: the frame at most 48 rem wide`).toBeCloseTo(
				Math.min(FRAME_WIDEST, width - 2 * gutterAt(width)),
				0,
			);
			expect(
				fieldBox.y + fieldBox.height - box.y,
				`${label}: the frame starts 48 px above the field's lower edge`,
			).toBeCloseTo(FRAME_OVER_EDGE, 0);
			expect(
				(await boxOf(text[1], `${label}: ${text[0]}`)).y - box.y - box.height,
				`${label}: ${text[0]} 32 px under the frame`,
			).toBeCloseTo(TEXT_UNDER_FRAME, 0);
		}
	}
});

test("a post moves only when motion is allowed: its header rises in as the page opens and its frame after it, while the breadcrumb, the text, an Activity's details card and its photos show at once, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	const main = page.getByRole("main");
	const running = () => page.evaluate(() => document.getAnimations().length);
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		const field = deepField(page);
		const header = headerOf(page, post, template);
		const frame = frameOf(page);
		const atOnce: NamedPart[] = [
			["the breadcrumb", breadcrumbOf(page)],
			textOf(page, template),
			...photosOf(page, template),
		];
		const parts: NamedPart[] = [["the field", field], ...header, ["the frame", frame], ...atOnce];
		const layouts = async () => {
			const read = [];
			for (const viewport of [PHONE_VIEWPORT, MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				await page.evaluate(() => window.scrollTo(0, 0));
				const places = [];
				for (const [name, part] of parts) places.push([name, await boxOf(part, name)]);
				read.push({
					width: viewport.width,
					height: await page.evaluate(() => document.documentElement.scrollHeight),
					places,
				});
			}
			return read;
		};
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(post.path);
		expect(await running(), `${template}: nothing is mid-animation`).toBe(0);
		expect(await heldBack(main), `${template}: nothing waits for an effect`).toEqual([]);
		const still = await layouts();

		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(post.path, { waitUntil: "commit" });
		await expect(header[1][1]).toBeVisible();
		const ends = await selfRunningEnds(page.locator("html"));
		expect(Math.max(0, ...ends), `${template}: the last effect to end, in ms`).toBeLessThanOrEqual(
			5_000,
		);
		const headerEnters = await entersAfter(header[1][1]);
		expect(headerEnters, `${template}: the header enters as the page opens`).toBe(0);
		for (const [name, part] of header) {
			expect(await entersAfter(part), `${template}: ${name} enters with the header`).toBe(0);
		}
		expect(
			await entersAfter(frame),
			`${template}: the frame enters after the header`,
		).toBeGreaterThan(headerEnters);
		for (const [name, part] of atOnce) {
			expect(await entersAfter(part), `${template}: ${name} shows at once`).toBe(-1);
		}
		await expect
			.poll(() => heldBack(main), {
				message: `${template}: the page shows whole after the entrance`,
			})
			.toEqual([]);
		expect(await layouts(), `${template}: the page with motion, after its entrance`).toEqual(still);

		await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
		await page.goto(post.path);
		await expect(header[1][1]).toBeVisible();
		expect(await running(), `${template} on paper: nothing is mid-animation`).toBe(0);
		expect(await heldBack(main), `${template} on paper: nothing waits for an effect`).toEqual([]);
		await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
	}
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("a News, an Activity and a Health Content post show their header on the field, the frame with its picture and เปิดภาพขนาดเต็ม, and their text, at 375 and 1440 px", async ({
		page,
	}) => {
		for (const template of ALL_TEMPLATES) {
			const post = pictured[template];
			await page.goto(post.path);
			const { shown, link } = pictureParts(page, post);
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				const label = `${post.title} without JavaScript at ${viewport.width} px`;
				for (const [name, part] of [
					...headerOf(page, post, template),
					["the picture", shown],
					[FULL_SIZE, link],
					textOf(page, template),
				] as NamedPart[]) {
					await expect(part, `${label}: ${name}`).toBeVisible();
				}
			}
		}
	});
});

/**
 * Declare testAccessibilityAndReflow's tests of `pages`, and its axe and focus checks at 375 px,
 * which spec #144 names for the post pages.
 */
function testPostAccessibility(pages: string, paths: () => readonly string[]): void {
	testAccessibilityAndReflow(pages, paths);

	test(`axe reports no WCAG 2.2 AA violation and focus stays visible on ${pages} at 375 px`, async ({
		page,
	}) => {
		await page.setViewportSize(PHONE_VIEWPORT);
		for (const path of paths()) {
			const response = await page.goto(path);
			expect(response?.status(), `GET ${path}`).toBe(200);
			await expectNoAxeViolations(page, `${path} at 375 px`);
			await expectVisibleFocusOnEveryStop(page, `${path} at 375 px`);
		}
	});
}

test.describe("a News or Health Content post's body, source and topics", () => {
	let topic: SyntheticTerm;
	/** A post of each template for each trailing case, with a picture and without. */
	const posts: TrailingPost[] = [];
	/** Each template's post with no trailing part whose long summary outlasts its picture. */
	const tallHeader = {} as Record<TextTemplate, TrailingPost>;
	/** A News post with two Health Topics, whose chips share a row. */
	let twoTopics: Post;

	/** Publish a `template` post holding `parts`, with `picture` and `summary` when given. */
	async function publishTrailingPost(
		template: TextTemplate,
		parts: readonly TrailingPart[],
		picture?: Picture & { id: string },
		summary?: string,
	): Promise<TrailingPost> {
		const label = [parts.join("-") || "none", picture && "pictured", summary && "tall"]
			.filter(Boolean)
			.join("-");
		const post = await publishPost(
			template,
			label,
			{
				...(parts.includes("body") ? { body: [portableTextBlock(BODY)] } : {}),
				...(parts.includes("source") ? { source_text: SOURCE } : {}),
				...(template === "health_content" ? { reviewed_at: REVIEWED_AT } : {}),
				...(picture ? { featured_image: { id: picture.id } } : {}),
			},
			{ summary, ...(parts.includes("topic") ? { taxonomies: { topic: [topic.slug] } } : {}) },
		);
		return { ...post, template, parts, ...(picture ? { picture } : {}) };
	}

	/** The paths of the posts with no body, source or topics. */
	const emptyPaths = () => [
		...posts.filter(({ parts }) => parts.length === 0).map(({ path }) => path),
		...TEXT_TEMPLATES.map((template) => tallHeader[template].path),
	];

	test.beforeAll(async () => {
		topic = await createOwnedTerm(admin, "topic", "ผู้สูงอายุ", ownedTerms);
		const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพ One Page ของโพสต์`;
		const png = gradientPng("#0b6b57", "#f2d17a", ONE_PAGE_SIZE);
		const picture = { alt, png, id: await uploadSyntheticPicture(admin, alt, png) };
		for (const template of TEXT_TEMPLATES) {
			for (const withPicture of [true, false]) {
				for (const parts of TRAILING_CASES) {
					posts.push(await publishTrailingPost(template, parts, withPicture ? picture : undefined));
				}
			}
			tallHeader[template] = await publishTrailingPost(template, [], picture, LONG_SUMMARY);
		}
		const second = await createOwnedTerm(admin, "topic", "ไข้เลือดออก", ownedTerms);
		twoTopics = await publishPost(
			"news",
			"two-topics",
			{},
			{
				taxonomies: { topic: [topic.slug, second.slug] },
			},
		);
	});

	for (const template of TEXT_TEMPLATES) {
		const { kind } = TEMPLATES[template];
		for (const withPicture of [true, false]) {
			test(`a ${kind} post ${withPicture ? "with" : "without"} a picture shows its body, source and topics only when it has them, in their order 2 rem apart, the first 32 px under the field below 1,024 px and 40 px from it, or 32 px under the frame where it follows the frame, and ends with its last part, at 320, 375, 1023, 1024 and 1440 px`, async ({
				page,
			}) => {
				const cases = posts.filter(
					(post) => post.template === template && (post.picture !== undefined) === withPicture,
				);
				for (const post of cases) {
					await page.goto(post.path);
					const field = deepField(page);
					const trailing = trailingOf(page, topic);
					const shown = post.parts.flatMap((part) => trailing[part]);
					const pictureShown = post.picture && pictureParts(page, post.picture);
					const picture = pictureShown?.named ?? [];
					const framed: NamedPart[] = pictureShown ? [["the frame", pictureShown.frame]] : [];
					for (const viewport of LAYOUT_VIEWPORTS) {
						await page.setViewportSize(viewport);
						const label = `${post.title} at ${viewport.width} px`;
						const header = headerOf(page, post, template);
						const twoColumns = pictureShown !== undefined && viewport.width >= 1024;
						// From lg the frame is beside the text; below it, it comes after the header.
						const column = twoColumns ? [...header, ...shown] : [...header, ...picture, ...shown];
						await expectStacked(label, column);
						if (twoColumns) {
							await expectPictureBeside(
								pictureShown.shown,
								titleOf(page, post),
								[...header, ...shown],
								label,
							);
							expect(
								(await boxOf(pictureShown.frame, `${label}: the frame`)).width,
								`${label}: the frame fills its 28 rem column`,
							).toBeCloseTo(FRAME_COLUMN, 0);
						}
						for (const part of (["body", "source", "topic"] as const).filter(
							(part) => !post.parts.includes(part),
						)) {
							const [name, absent] = trailing[part][0]!;
							await expect(absent, `${label}: no ${name}`).toHaveCount(0);
						}
						if (shown.length > 0) {
							// The text starts under the frame where the frame comes before it, else under the
							// field (Product Owner, 2026-11-14: #285 comment 6877659654, item 2).
							const [aboveName, above] =
								pictureShown && !twoColumns ? framed[0]! : (["the field", field] as NamedPart);
							const under =
								pictureShown && !twoColumns
									? TEXT_UNDER_FRAME
									: viewport.width >= 1024
										? TEXT_UNDER_FIELD.fromLg
										: TEXT_UNDER_FIELD.belowLg;
							const [firstName, first] = shown[0]!;
							const aboveBox = await boxOf(above, `${label}: ${aboveName}`);
							const firstBox = await boxOf(first, `${label}: ${firstName}`);
							const gap = firstBox.y - aboveBox.y - aboveBox.height;
							if (post.parts[0] === "topic") {
								// The topics' heading sits under their own divider and padding (TopicPills.astro),
								// so the space before the section is a lower bound on the heading's space.
								expect(
									gap,
									`${label}: ${firstName} is at least ${under} px under ${aboveName}`,
								).toBeGreaterThanOrEqual(under - 0.5);
							} else {
								expect(gap, `${label}: ${firstName} is ${under} px under ${aboveName}`).toBeCloseTo(
									under,
									0,
								);
							}
							for (const [index, [name, part]] of shown.entries()) {
								if (index === 0 || name === "the topics") continue;
								const [prevName, prev] = shown[index - 1]!;
								const prevBox = await boxOf(prev, `${label}: ${prevName}`);
								const box = await boxOf(part, `${label}: ${name}`);
								const apart = box.y - prevBox.y - prevBox.height;
								if (name === "the topics' heading") {
									expect(
										apart,
										`${label}: ${name} at least 2 rem under ${prevName}`,
									).toBeGreaterThanOrEqual(TRAILING_GAP - 0.5);
								} else {
									expect(apart, `${label}: ${name} 2 rem under ${prevName}`).toBeCloseTo(
										TRAILING_GAP,
										0,
									);
								}
							}
						}
						expect(
							await spaceAfter(
								page,
								[["the field", field], ...header, ...framed, ...picture, ...shown],
								label,
							),
							`${label}: nothing empty follows the post's last part`,
						).toBeCloseTo(0, 0);
					}
				}
			});
		}
	}

	test("at 1440 px a News and a Health Content post with no body, source or topics end with the frame where the frame is the taller, and with the field where the header is, with no empty row after it; เปิดภาพขนาดเต็ม opens the file", async ({
		page,
	}) => {
		for (const template of TEXT_TEMPLATES) {
			const pictureTaller = posts.find(
				(post) => post.template === template && post.parts.length === 0 && post.picture,
			)!;
			for (const [post, taller] of [
				[pictureTaller, "frame"],
				[tallHeader[template], "field"],
			] as const) {
				await page.goto(post.path);
				const label = `${post.title} at 1440 px, its ${taller} the taller`;
				const field = deepField(page);
				const header = headerOf(page, post, template);
				const picture = pictureParts(page, post.picture!);
				await expectStacked(label, header);
				await expectPictureBeside(picture.shown, titleOf(page, post), header, label);
				const fieldEnd = await boxOf(field, label);
				const frameEnd = await boxOf(picture.frame, label);
				expect(
					taller === "field"
						? fieldEnd.y + fieldEnd.height > frameEnd.y + frameEnd.height
						: frameEnd.y + frameEnd.height > fieldEnd.y + fieldEnd.height,
					`${label}: the ${taller} is the taller`,
				).toBe(true);
				const space = await spaceAfter(
					page,
					[["the field", field], ...header, ["the frame", picture.frame], ...picture.named],
					label,
				);
				await expectFullSizeOpens(page, post.picture!.png, label);
				expect(
					space,
					`${label}: the post ends with its ${taller}, with no empty row after it`,
				).toBeCloseTo(0, 0);
			}
		}
	});

	test("while a News and a Health Content post whose header is taller than its picture scroll at 1440 px, the frame stays in view beside the header and stops where the field ends", async ({
		page,
	}) => {
		for (const template of TEXT_TEMPLATES) {
			const post = tallHeader[template];
			await page.goto(post.path);
			await expectImageLoaded(pictureOf(page, post.picture!), `${post.title}: the picture`);
			await expectFrameFollows(page, titleOf(page, post), deepField(page));
		}
	});

	test("a News and a Health Content post's Health Topics are the Homepage's chips under ประเด็นสุขภาพ: white with a 1.5 px border-default edge and brand-primary words, brand-primary with white words under the pointer, 44 px high at 320, 375 and 1440 px, 13 / 20 then 14 / 22 from 640 px and 8 then 10 px apart, each opening the list it narrows, shown at once with no effect and nothing past the window; a post without a topic shows neither the heading nor a chip", async ({
		page,
	}) => {
		const colours = {} as Record<"white" | "edge" | "primary", string>;
		for (const template of TEXT_TEMPLATES) {
			const { kind } = TEMPLATES[template];
			const withTopic = posts.find(
				(post) =>
					post.template === template && post.parts.length === 1 && post.parts[0] === "topic",
			)!;
			const withoutTopic = posts.find(
				(post) => post.template === template && !post.parts.includes("topic"),
			)!;
			await page.goto(withoutTopic.path);
			const absent = page.getByRole("main");
			await expect(
				absent.getByRole("heading", { name: TOPICS_HEADING }),
				`${kind}: no heading`,
			).toHaveCount(0);
			await expect(absent.getByRole("link", { name: topic.label }), `${kind}: no chip`).toHaveCount(
				0,
			);

			await page.goto(withTopic.path);
			colours.white ??= await tokenColor(page, "surface-base");
			colours.edge ??= await tokenColor(page, "border-default");
			colours.primary ??= await tokenColor(page, "brand-primary");
			const chip = page.getByRole("main").getByRole("link", { name: topic.label, exact: true });
			const list = template === "news" ? "/news/health" : "/health/content";
			await expect(chip, `${kind}: the chip's address`).toHaveAttribute(
				"href",
				`${list}?topic=${topic.slug}`,
			);
			// The heading and the chips show at once, with no effect, even where motion is allowed.
			await page.emulateMedia({ reducedMotion: "no-preference" });
			await page.reload();
			const heading = page.getByRole("main").getByRole("heading", { name: TOPICS_HEADING });
			const chips = page
				.getByRole("main")
				.getByRole("list")
				.filter({ has: page.getByRole("link", { name: topic.label, exact: true }) });
			expect(await heldBack(chips), `${kind}: no chip held back`).toEqual([]);
			expect(await heldBack(heading), `${kind}: the heading not held back`).toEqual([]);
			expect(await entersAfter(chip), `${kind}: the chip has no entrance`).toBe(-1);
			expect(await entersAfter(heading), `${kind}: the heading has no entrance`).toBe(-1);
			await page.emulateMedia({ reducedMotion: "reduce" });
			for (const viewport of [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				const label = `${kind} at ${viewport.width} px`;
				await expectNoHorizontalScroll(page, label);
				expect((await boxOf(chip, label)).height, `${label}: the chip is 44 px high`).toBeCloseTo(
					44,
					0,
				);
				await page.mouse.move(0, 0);
				await expect(chip, `${label}: white`).toHaveCSS("background-color", colours.white);
				// Chromium draws the 1.5 px edge on a whole CSS pixel and reads it 1px
				// (docs/agents/playwright-test-1.63.0.md "Computed styles").
				await expect(chip, `${label}: the 1.5 px edge`).toHaveCSS("border-top-width", "1px");
				await expect(chip, `${label}: a border-default edge`).toHaveCSS(
					"border-top-color",
					colours.edge,
				);
				await expect(chip, `${label}: brand-primary words`).toHaveCSS("color", colours.primary);
				await chip.hover();
				await expect(chip, `${label}, under the pointer: brand-primary`).toHaveCSS(
					"background-color",
					colours.primary,
				);
				await expect(chip, `${label}, under the pointer: white words`).toHaveCSS(
					"color",
					colours.white,
				);
			}
			await chip.click();
			await expect(page, `${kind}: the chip opens the list it narrows`).toHaveURL(
				`${list}?topic=${topic.slug}`,
			);
			await expect(page.getByLabel(TOPICS_HEADING), `${kind}: the list's topic`).toHaveValue(
				topic.slug,
			);
		}

		// The Homepage's chip changes its type, side padding and spacing at 640 px (Product Owner,
		// #286 comment 6876267675, item 1).
		await page.goto(twoTopics.path);
		const pair = page
			.getByRole("main")
			.getByRole("list")
			.filter({ has: page.getByRole("link", { name: topic.label, exact: true }) })
			.getByRole("link");
		await expect(pair, "the post's two chips").toHaveCount(2);
		for (const [width, font, padding, gap] of [
			[639, "13px", "12px", 8],
			[640, "14px", "16px", 10],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			const at = `two chips at ${width} px`;
			for (const chip of await pair.all()) {
				await expect(chip, `${at}: the chip's type`).toHaveCSS("font-size", font);
				await expect(chip, `${at}: the chip's side padding`).toHaveCSS("padding-left", padding);
			}
			const first = await boxOf(pair.nth(0), `${at}: the first`);
			const next = await boxOf(pair.nth(1), `${at}: the second`);
			// A synthetic label is long, so the second chip may wrap: the gap is the same across rows.
			const sameRow = Math.abs(next.y - first.y) < 0.5;
			const apart = sameRow ? next.x - first.x - first.width : next.y - first.y - first.height;
			expect(apart, `${at}: the chips are ${gap} px apart`).toBeCloseTo(gap, 0);
		}
	});

	testPostAccessibility("the post pages with no body, source or topics", emptyPaths);
	testPostAccessibility("the post pages with a body, a source and Health Topics", () =>
		posts.filter(({ parts }) => parts.length === 3).map(({ path }) => path),
	);
});

test.describe("accessibility and reflow", () => {
	/** Each template's post with a picture and without. */
	const paths = () =>
		ALL_TEMPLATES.flatMap((template) => [pictured[template].path, plain[template].path]);

	testPostAccessibility("the post pages", paths);
});
