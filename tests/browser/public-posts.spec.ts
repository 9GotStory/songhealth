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
// details and then the picture (Activity). A post without a picture keeps one column. Each
// template, with a picture and without, passes the axe, focus and reflow checks at the harness's
// widths and at 375 px.
//
// A News or Health Content post ends with what it holds (#198; spec #190 "Empty trailing content
// on News/Health Content Post pages", #190 comment 6707205912, Empty Post page row B): its body,
// its source and its Health Topics show only when it has them, in that order, at least 2 rem under
// what comes before them, and a post with none of the three ends with its header, or with its
// picture's link where the picture is the taller, with no empty row after it. Each case (none,
// each alone, all three) is checked with a picture and without, at 320, 375 and 1023 px in one
// column and at 1024 and 1440 px in two. A post whose long summary makes its header taller than
// its picture shows where the empty row was, and its picture stops where its header ends.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness. Its fixtures are synthetic News, Activities and Health Content and a Health Topic made
// through the native API and removed afterwards, each post with a summary, and those with a
// picture carry a portrait A4 stand-in for a One Page. The Activity's participants run to many
// lines, so its left column outlasts the picture on a 1440 × 900 window and the picture follows it
// for a while.

import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
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
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	boxOf,
	detailOf,
	expect,
	expectImageLoaded,
	expectNoAxeViolations,
	expectPictureFillsBox,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	test,
	testAccessibilityAndReflow,
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

/** The width of the picture's column from lg, 28 rem. */
const PICTURE_COLUMN = 448;

/** The space above a post's first trailing part, 2 rem. */
const TRAILING_GAP = 32;

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

/** A post's picture and its เปิดภาพขนาดเต็ม link, and the two as named parts in their order. */
function pictureParts(page: Page, picture: Picture) {
	const shown = pictureOf(page, picture);
	const link = page.getByRole("main").getByRole("link", { name: FULL_SIZE });
	const named: NamedPart[] = [
		["the picture", shown],
		[FULL_SIZE, link],
	];
	return { shown, link, named };
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
 * Scroll the page through at 1440 px and fail unless `picture` stays in view, below the sticky
 * header, while the left column
 * scrolls (its `title` above the window and its last part, `end`, below it), as it does at some
 * offsets, and its link never passes the bottom of `end`, where the two columns end, and stops
 * there. Gives the boxes at each offset of the picture, its link and each of `more`.
 */
async function expectPictureFollows(
	page: Page,
	picture: Locator,
	title: Locator,
	end: Locator,
	more: Locator[] = [],
): Promise<Array<{ at: number; picture: Box; link: Box; more: Box[] }>> {
	const windowHeight = DESKTOP_VIEWPORT.height;
	// The sticky header covers the top of the window (#240).
	const headerHeight = (await page.getByRole("banner").boundingBox())!.height;
	const link = page.getByRole("main").getByRole("link", { name: FULL_SIZE });
	const offsets = await scrolledBoxes(page, [picture, link, title, end, ...more]);
	const outOfView: string[] = [];
	const pastTheEnd: string[] = [];
	let following = 0;
	let stopped = 0;
	for (const {
		at,
		boxes: [shown, linkBox, titleBox, endBox],
	} of offsets) {
		const linkBottom = linkBox!.y + linkBox!.height;
		const endBottom = endBox!.y + endBox!.height;
		if (linkBottom > endBottom + 0.5)
			pastTheEnd.push(`at ${at} px: by ${linkBottom - endBottom} px`);
		if (Math.abs(linkBottom - endBottom) <= 0.5) stopped += 1;
		if (titleBox!.y + titleBox!.height < 0 && endBottom > windowHeight) {
			following += 1;
			if (shown!.y < headerHeight || shown!.y + shown!.height > windowHeight) {
				outOfView.push(`at ${at} px: from ${shown!.y} to ${shown!.y + shown!.height}`);
			}
		}
	}
	expect(following, "the left column scrolls past the window at some offsets").toBeGreaterThan(0);
	expect(outOfView, "the picture stays in view while the left column scrolls").toEqual([]);
	expect(pastTheEnd, "the picture's link never passes the end of the left column").toEqual([]);
	expect(stopped, "the picture's link stops at the end of the left column").toBeGreaterThan(0);
	return offsets.map(({ at, boxes: [shown, linkBox, , , ...moreBoxes] }) => ({
		at,
		picture: shown!,
		link: linkBox!,
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
 * A post's header as it reads: the title, the summary, the publication date and, on Health
 * Content, the review date.
 */
function headerOf(page: Page, post: TrailingPost): NamedPart[] {
	const main = page.getByRole("main");
	const header: NamedPart[] = [
		["the title", titleOf(page, post)],
		["the summary", main.getByText(post.summary, { exact: true })],
		["the date", main.getByText(/^เผยแพร่ /)],
	];
	if (post.template === "health_content") {
		header.push(["the review date", main.getByText(/^ทบทวนล่าสุด /)]);
	}
	return header;
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

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

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

test("at 1440 px a News, an Activity and a Health Content post with a picture show it whole on the right of the title, the rest of the text under the header, and เปิดภาพขนาดเต็ม opens its file", async ({
	page,
}) => {
	for (const template of ALL_TEMPLATES) {
		const post = pictured[template];
		const label = `${post.title} at 1440 px`;
		await page.goto(post.path);
		const main = page.getByRole("main");
		// The left column goes on in the page's order: the details card, or the body and its source.
		const rest: NamedPart[] =
			template === "activities"
				? [["the details", main.locator("dl")]]
				: [
						["the body", main.getByText(BODY, { exact: true })],
						["the source", main.getByText(`แหล่งที่มา: ${SOURCE}`, { exact: true })],
					];
		await expectPictureBeside(
			pictureOf(page, post),
			main.getByRole("heading", { level: 1 }),
			rest,
			label,
		);
		await expectStacked(label, [["the date", main.getByText(/^เผยแพร่ /)], ...rest]);
		await expectFullSizeOpens(page, post.png, label);
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
	const photos = main.getByRole("region", { name: "ภาพกิจกรรม" });
	const overlaps: string[] = [];
	for (const {
		at,
		picture: shown,
		link,
		more: [photosBox],
	} of await expectPictureFollows(
		page,
		picture,
		main.getByRole("heading", { level: 1 }),
		// The details card, the end of the left column, which is the longer.
		main.locator("dl"),
		[photos],
	)) {
		if (overlap(shown, photosBox!)) overlaps.push(`the picture at ${at} px`);
		if (overlap(link, photosBox!)) overlaps.push(`its link at ${at} px`);
	}
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
	});

	for (const template of TEXT_TEMPLATES) {
		const { kind } = TEMPLATES[template];
		for (const withPicture of [true, false]) {
			test(`a ${kind} post ${withPicture ? "with" : "without"} a picture shows its body, source and topics only when it has them, in their order 2 rem under what comes before, and ends with its last part, at 320, 375, 1023, 1024 and 1440 px`, async ({
				page,
			}) => {
				const cases = posts.filter(
					(post) => post.template === template && (post.picture !== undefined) === withPicture,
				);
				for (const post of cases) {
					await page.goto(post.path);
					const trailing = trailingOf(page, topic);
					const shown = post.parts.flatMap((part) => trailing[part]);
					const pictureShown = post.picture && pictureParts(page, post.picture);
					const picture = pictureShown?.named ?? [];
					for (const viewport of LAYOUT_VIEWPORTS) {
						await page.setViewportSize(viewport);
						const label = `${post.title} at ${viewport.width} px`;
						const header = headerOf(page, post);
						const twoColumns = pictureShown !== undefined && viewport.width >= 1024;
						// From lg the picture is beside the text; below it, it comes after the header.
						const column = twoColumns ? [...header, ...shown] : [...header, ...picture, ...shown];
						await expectStacked(label, column);
						if (twoColumns) {
							const box = await expectPictureBeside(
								pictureShown.shown,
								titleOf(page, post),
								[...header, ...shown],
								label,
							);
							expect(box.width, `${label}: the picture fills its 28 rem column`).toBeCloseTo(
								PICTURE_COLUMN,
								0,
							);
						}
						for (const part of (["body", "source", "topic"] as const).filter(
							(part) => !post.parts.includes(part),
						)) {
							const [name, absent] = trailing[part][0]!;
							await expect(absent, `${label}: no ${name}`).toHaveCount(0);
						}
						if (shown.length > 0) {
							const [aboveName, above] = column[column.length - shown.length - 1]!;
							const [firstName, first] = shown[0]!;
							const aboveBox = await boxOf(above, `${label}: ${aboveName}`);
							const firstBox = await boxOf(first, `${label}: ${firstName}`);
							const gap = firstBox.y - aboveBox.y - aboveBox.height;
							if (post.parts[0] === "topic") {
								// The topics' heading sits under their own divider and padding (TopicPills.astro),
								// so the 2 rem before the section is a lower bound on the heading's space.
								expect(
									gap,
									`${label}: ${firstName} is at least 2 rem under ${aboveName}`,
								).toBeGreaterThanOrEqual(TRAILING_GAP - 0.5);
							} else {
								expect(gap, `${label}: ${firstName} is 2 rem under ${aboveName}`).toBeCloseTo(
									TRAILING_GAP,
									0,
								);
							}
						}
						expect(
							await spaceAfter(page, [...header, ...picture, ...shown], label),
							`${label}: nothing empty follows the post's last part`,
						).toBeCloseTo(0, 0);
					}
				}
			});
		}
	}

	test("at 1440 px a News and a Health Content post with no body, source or topics end with the picture's link where the picture is the taller, and with the header where the header is, with no empty row after it; เปิดภาพขนาดเต็ม opens the file", async ({
		page,
	}) => {
		for (const template of TEXT_TEMPLATES) {
			const pictureTaller = posts.find(
				(post) => post.template === template && post.parts.length === 0 && post.picture,
			)!;
			for (const [post, taller] of [
				[pictureTaller, "picture"],
				[tallHeader[template], "header"],
			] as const) {
				await page.goto(post.path);
				const label = `${post.title} at 1440 px, its ${taller} the taller`;
				const header = headerOf(page, post);
				const picture = pictureParts(page, post.picture!);
				await expectStacked(label, header);
				await expectPictureBeside(picture.shown, titleOf(page, post), header, label);
				const headerEnd = await boxOf(header.at(-1)![1], label);
				const linkEnd = await boxOf(picture.link, label);
				expect(
					taller === "header"
						? headerEnd.y + headerEnd.height > linkEnd.y + linkEnd.height
						: linkEnd.y + linkEnd.height > headerEnd.y + headerEnd.height,
					`${label}: the ${taller} is the taller`,
				).toBe(true);
				const space = await spaceAfter(page, [...header, ...picture.named], label);
				await expectFullSizeOpens(page, post.picture!.png, label);
				expect(
					space,
					`${label}: the post ends with its ${taller === "header" ? "header" : "picture's link"}, with no empty row after it`,
				).toBeCloseTo(0, 0);
			}
		}
	});

	test("while a News and a Health Content post whose header is taller than its picture scroll at 1440 px, the picture stays in view beside the header and stops where the header ends", async ({
		page,
	}) => {
		for (const template of TEXT_TEMPLATES) {
			const post = tallHeader[template];
			await page.goto(post.path);
			const header = headerOf(page, post);
			const picture = pictureOf(page, post.picture!);
			await expectImageLoaded(picture, `${post.title}: the picture`);
			await expectPictureFollows(page, picture, titleOf(page, post), header.at(-1)![1]);
		}
	});

	testPostAccessibility("the post pages with no body, source or topics", emptyPaths);
});

test.describe("accessibility and reflow", () => {
	/** Each template's post with a picture and without. */
	const paths = () =>
		ALL_TEMPLATES.flatMap((template) => [pictured[template].path, plain[template].path]);

	testPostAccessibility("the post pages", paths);
});
