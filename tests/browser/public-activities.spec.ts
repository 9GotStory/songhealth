// Activities (#56; spec #51 "Public reads" (Activities) and "Errors, redirects, preview and SEO").
//
// A citizen reads published Activities at /activities, the most recently held first, where an
// Activity without an Activity date takes its place by its publication (`04` §10). Each card is
// the Homepage's Activity card: the Activity's picture, or the Activity visual when it has none,
// and its summary (Product Owner, 2026-10-30: #64 comment 6526131459). Each Activity's page at
// /activities/{slug} shows its date, place, description, participants and a captioned gallery
// whose pictures carry their alt text. Drafts, unpublished and trashed Activities never show, and
// their addresses answer the site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Activities and media made through the native API and removed
// afterwards. The runtime may hold other Activities (the demo dataset, the Product Owner's own),
// so assertions look only at this suite's uniquely titled fixtures. Fixtures that must lead the
// list are held from 2030 on, after any real Activity; the paging test's are held latest, since
// earlier tests' fixtures stay until the suite ends.
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST …/publish accepts `publishedAt` to backdate a publication
//   (src/astro/routes/api/content/[collection]/[id]/publish.ts).
// - An image saved with only a media id, in an image field or inside a repeater item, takes its
//   alt text from the media library (src/emdash-runtime.ts, src/media/normalize.ts).
// - Deleting a media item removes its stored file and leaves the Activity that uses it unchanged
//   (src/api/handlers/media.ts handleMediaDelete).

import {
	createSyntheticDraft,
	deleteMedia,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPicture,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	SECTION_CRUMBS,
	detailOf,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	thaiDate,
} from "./public.helpers";

/** The fixed number of Activities a list page shows. */
const PAGE_SIZE = 12;

let admin: CmsActor;
let origin: string;

/** A synthetic Activity draft. Its title is unique, so a page shows it or does not. */
const createActivity = (label: string, fields: DraftFields = {}) =>
	createSyntheticDraft(admin, "activities", "กิจกรรม", label, fields);

/** Publish now, or backdated to `publishedAt`. Returns the stored publication instant. */
function publish(activity: DraftFixture, publishedAt?: string): Promise<string> {
	return publishEntryAt(admin, "activities", activity.id, publishedAt);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin));

test("/activities lists only published Activities, the most recently held first, an undated one placed by its publication", async ({
	page,
}) => {
	const heldInSeptember = await createActivity("held-september", {
		data: { activity_at: "2026-09-02T03:00:00.000Z" },
	});
	const undatedAugust = await createActivity("undated-august");
	// Held in July, published long after it: the Activity date places it, not the publication.
	const heldInJuly = await createActivity("held-july", {
		data: { activity_at: "2026-07-15T03:00:00.000Z" },
	});
	const undatedMay = await createActivity("undated-may");
	const draft = await createActivity("draft", {
		data: { activity_at: "2026-09-01T03:00:00.000Z" },
	});
	const unpublished = await createActivity("unpublished");
	const trashed = await createActivity("trashed");
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "activities", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "activities", trashed.id)).ok, "trash").toBe(true);
	const mayAt = await publish(undatedMay, "2026-05-20T03:00:00.000Z");
	await publish(heldInJuly);
	const augustAt = await publish(undatedAugust, "2026-08-10T03:00:00.000Z");
	await publish(heldInSeptember, "2026-06-01T03:00:00.000Z");

	const response = await page.goto("/activities");
	expect(response?.status(), "GET /activities").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("กิจกรรม");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.news], "กิจกรรม");

	expect(
		ownTitles(await listedTitles(page), [
			heldInSeptember,
			undatedAugust,
			heldInJuly,
			undatedMay,
			draft,
			unpublished,
			trashed,
		]),
		"published only, by Activity date, else by publication",
	).toEqual([heldInSeptember.title, undatedAugust.title, heldInJuly.title, undatedMay.title]);

	for (const [activity, shown] of [
		[heldInSeptember, "2026-09-02T03:00:00.000Z"],
		[undatedAugust, augustAt],
		[heldInJuly, "2026-07-15T03:00:00.000Z"],
		[undatedMay, mayAt],
	] as const) {
		const card = listedItem(page, activity.title);
		await expect(card.getByRole("link", { name: activity.title })).toHaveAttribute(
			"href",
			`/activities/${activity.slug}`,
		);
		await expect(card.locator("time"), `${activity.title} is dated`).toHaveText(thaiDate(shown));
	}
});

test("an Activity card shows its picture, or the Activity visual when it has none or its picture is gone, and its summary", async ({
	page,
}) => {
	const pictured = await createActivity("card-picture", {
		data: {
			activity_at: "2030-03-03T03:00:00.000Z",
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพการประชุม`),
			},
		},
	});
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมบนการ์ด`;
	const plain = await createActivity("card-plain", {
		data: { activity_at: "2030-03-02T03:00:00.000Z", summary },
	});
	const goneId = await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพที่ถูกลบ`);
	const pictureGone = await createActivity("card-picture-gone", {
		data: { activity_at: "2030-03-01T03:00:00.000Z", featured_image: { id: goneId } },
	});
	for (const activity of [pictured, plain, pictureGone]) await publish(activity);
	expect((await deleteMedia(admin, goneId)).ok, "deleting the media item").toBe(true);

	await page.goto("/activities");
	await expect(listedItem(page, pictured.title).getByRole("heading", { level: 2 })).toHaveText(
		pictured.title,
	);
	await expect(
		listedItem(page, pictured.title).getByText("กิจกรรม", { exact: true }),
	).toBeVisible();
	await expect(listedItem(page, pictured.title).locator("img")).toHaveCount(1);
	await expect(listedItem(page, pictured.title).getByTestId("activity-visual")).toHaveCount(0);
	for (const activity of [plain, pictureGone]) {
		await expect(listedItem(page, activity.title).locator("img"), activity.title).toHaveCount(0);
		await expect(
			listedItem(page, activity.title).getByTestId("activity-visual"),
			activity.title,
		).toHaveCount(1);
	}
	await expect(listedItem(page, plain.title).getByText(summary, { exact: true })).toBeVisible();
});

test("/activities pages through older Activities in the same order, with the page number in the address", async ({
	page,
}) => {
	const fixtures: DraftFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		const day = String(index + 1).padStart(2, "0");
		fixtures.push(
			await createActivity(`page-${day}`, {
				data: { activity_at: `2031-01-${day}T03:00:00.000Z` },
			}),
		);
	}
	// Published newest-held first, so the publication order is the reverse of the Activity order.
	for (const activity of fixtures.toReversed()) await publish(activity);
	const heldLatestFirst = fixtures.toReversed().map((activity) => activity.title);

	await page.goto("/activities");
	expect(ownTitles(await listedTitles(page), fixtures), "the first page").toEqual(
		heldLatestFirst.slice(0, PAGE_SIZE),
	);
	const pagination = page.getByRole("navigation", { name: "การแบ่งหน้า" });
	await expect(pagination.getByRole("link", { name: "หน้าก่อนหน้า" })).toHaveCount(0);
	await pagination.getByRole("link", { name: "หน้าถัดไป" }).click();
	await expect(page).toHaveURL(/\/activities\?page=2$/);
	expect(ownTitles(await listedTitles(page), fixtures), "the second page").toEqual(
		heldLatestFirst.slice(PAGE_SIZE),
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/activities?page=2`,
	);
	await expect(
		page
			.getByRole("navigation", { name: "การแบ่งหน้า" })
			.getByRole("link", { name: "หน้าก่อนหน้า" }),
	).toHaveAttribute("href", "/activities");

	const invalid = await page.goto("/activities?page=abc");
	expect(invalid?.status(), "a page number that is not one is ignored").toBe(200);
	expect(ownTitles(await listedTitles(page), fixtures)[0]).toBe(heldLatestFirst[0]);

	const beyond = await page.goto("/activities?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบกิจกรรมในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/activities");
});

test("an Activity page shows its date, place, description, participants, picture and a captioned gallery with alt text, under its breadcrumb", async ({
	page,
}) => {
	const featuredAlt = `${SYNTHETIC_FIXTURE_MARK} ภาพบรรยากาศการประชุม`;
	const firstAlt = `${SYNTHETIC_FIXTURE_MARK} ผู้เข้าร่วมลงทะเบียน`;
	const secondAlt = `${SYNTHETIC_FIXTURE_MARK} การบรรยายให้ความรู้`;
	const firstCaption = `${SYNTHETIC_FIXTURE_MARK} ลงทะเบียนผู้เข้าร่วมกิจกรรม`;
	const goneId = await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพที่ถูกลบ`);
	const summary = `${SYNTHETIC_FIXTURE_MARK} ประชุมติดตามงานควบคุมโรคไข้เลือดออก`;
	const location = `${SYNTHETIC_FIXTURE_MARK} ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง`;
	const participants = `${SYNTHETIC_FIXTURE_MARK} อสม. และเจ้าหน้าที่ รพ.สต.`;
	const activity = await createActivity("detail", {
		data: {
			summary,
			// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
			activity_at: "2026-09-23T17:30:00.000Z",
			location_text: location,
			participants_text: participants,
			featured_image: { id: await uploadSyntheticPicture(admin, featuredAlt) },
			gallery: [
				{ image: { id: await uploadSyntheticPicture(admin, firstAlt) }, caption: firstCaption },
				{ image: { id: goneId }, caption: `${SYNTHETIC_FIXTURE_MARK} ภาพที่ไม่มีแล้ว` },
				{ image: { id: await uploadSyntheticPicture(admin, secondAlt) } },
			],
		},
	});
	await publish(activity);
	expect((await deleteMedia(admin, goneId)).ok, "deleting the media item").toBe(true);

	const response = await page.goto(`/activities/${activity.slug}`);
	expect(response?.status(), "GET the Activity page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(activity.title);
	await expect(main.getByText(summary)).toBeVisible();
	await expect(detailOf(page, "วันที่จัดกิจกรรม")).toHaveText("24 ก.ย. 2569");
	await expect(detailOf(page, "สถานที่จัดกิจกรรม")).toHaveText(location);
	await expect(detailOf(page, "ผู้เข้าร่วม")).toHaveText(participants);
	await expect(main.getByRole("img", { name: featuredAlt })).toBeVisible();

	const gallery = main.getByRole("region", { name: "ภาพกิจกรรม" });
	const figures = gallery.getByRole("figure");
	await expect(figures, "the picture that is gone is left out").toHaveCount(2);
	await expect(figures.nth(0).getByRole("img")).toHaveAttribute("alt", firstAlt);
	await expect(figures.nth(0)).toContainText(firstCaption);
	await expect(page.getByRole("figure", { name: firstCaption })).toHaveCount(1);
	await expect(figures.nth(1).getByRole("img")).toHaveAttribute("alt", secondAlt);
	await expect(figures.nth(1).locator("figcaption")).toHaveCount(0);
	await expect(gallery.getByText("ภาพที่ไม่มีแล้ว")).toHaveCount(0);

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.news, ["กิจกรรม", "/activities"]],
		activity.title,
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "true");
});

test("an Activity page leaves out the details, picture and gallery it does not have", async ({
	page,
}) => {
	const activity = await createActivity("minimal");
	const publishedAt = await publish(activity);

	await page.goto(`/activities/${activity.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(activity.title);
	await expect(main.getByText(`เผยแพร่ ${thaiDate(publishedAt)}`)).toBeVisible();
	for (const name of ["วันที่จัดกิจกรรม", "สถานที่จัดกิจกรรม", "ผู้เข้าร่วม"]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.getByRole("img")).toHaveCount(0);
	await expect(main.getByRole("region", { name: "ภาพกิจกรรม" })).toHaveCount(0);
});

test("a draft, unpublished or trashed Activity answers the site 404 and stays out of the list", async ({
	page,
}) => {
	const draft = await createActivity("hidden-draft");
	const unpublished = await createActivity("hidden-unpublished");
	const trashed = await createActivity("hidden-trashed");
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "activities", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "activities", trashed.id)).ok, "trash").toBe(true);
	const hidden = [draft, unpublished, trashed];

	for (const activity of hidden) {
		await expectSiteNotFound(page, `/activities/${activity.slug}`, activity.title);
	}
	await page.goto("/activities");
	expect(ownTitles(await listedTitles(page), hidden), "the list hides them").toEqual([]);
});

test("a signed preview link renders a draft Activity, and the same address without a valid token answers 404", async ({
	page,
}) => {
	const draft = await createActivity("preview");
	const link = await expectPreviewRenders(
		page,
		admin,
		"activities",
		draft,
		`/activities/${draft.slug}`,
	);

	await expectSiteNotFound(page, link.pathname, "the draft without a token");
});

test("the Activity pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first and the summary as the fallback", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมสำหรับเครื่องมือค้นหา`;
	const plain = await createActivity("seo-plain", { data: { summary } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อกิจกรรมสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายกิจกรรมจากช่อง SEO`;
	const tuned = await createActivity("seo-tuned", {
		data: { summary },
		seo: { title: seoTitle, description: seoDescription },
	});
	await publish(plain);
	await publish(tuned);

	await page.goto(`/activities/${plain.slug}`);
	await expect(page).toHaveTitle(`${plain.title}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", summary);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/activities/${plain.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plain.title);
	await expect(meta('meta[property="og:url"]')).toHaveAttribute(
		"content",
		`${origin}/activities/${plain.slug}`,
	);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/activities/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", seoTitle);

	await page.goto("/activities");
	await expect(page).toHaveTitle(`กิจกรรม${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/activities`);
	await expect(meta('meta[property="og:type"]')).toHaveAttribute("content", "website");
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const detailed = await createActivity("a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมสำหรับตรวจการเข้าถึง`,
				activity_at: "2030-02-02T03:00:00.000Z",
				location_text: `${SYNTHETIC_FIXTURE_MARK} ศาลาประชาคมหมู่บ้าน`,
				participants_text: `${SYNTHETIC_FIXTURE_MARK} ผู้สูงอายุและผู้ดูแล`,
				featured_image: {
					id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพหลัก`),
				},
				gallery: [
					{
						image: {
							id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพที่หนึ่ง`),
						},
						caption: `${SYNTHETIC_FIXTURE_MARK} คำบรรยายภาพที่หนึ่ง`,
					},
					{
						image: {
							id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพที่สอง`),
						},
					},
				],
			},
		});
		const plain = await createActivity("a11y-plain", {
			data: { activity_at: "2030-02-01T03:00:00.000Z" },
		});
		await publish(detailed);
		await publish(plain);
		paths = [
			"/activities",
			"/activities?page=10000",
			`/activities/${detailed.slug}`,
			`/activities/${plain.slug}`,
		];
	});

	testAccessibilityAndReflow("the Activity pages", () => paths);
});
