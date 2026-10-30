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
// Thai order puts a leading vowel by the consonant after it: เกด before ขวัญ, เกษตร before ขนส่ง.
// Code point order reverses both, so the fixtures tell the two apart.
//
// Platform behaviour relied on (emdash 1.1.0): GET /_emdash/api/content/{collection} lists entries
// by `status`, at most 100 a page, with `nextCursor` while more remain (src/api/schemas/content.ts
// contentListQuery, src/api/schemas/common.ts).

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createSyntheticEntry,
	devAdminActor,
	nativeDataOf,
	nativeRefusalOf,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	uploadSyntheticMedia,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	VIEWPORTS,
	expect,
	expectAboutSubpage,
	expectImageLoaded,
	expectNoAxeViolations,
	expectSiteNotFound,
	expectVisibleFocusOnEveryStop,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
} from "./public.helpers";

const LEADERSHIP = { path: "/about/leadership", title: "ผู้บริหาร" } as const;
const PERSONNEL = { path: "/about/personnel", title: "บุคลากร" } as const;
const PAGES = [LEADERSHIP, PERSONNEL] as const;

/** The heading of the Personnel whose unit is not set. */
const NO_UNIT = "ไม่ระบุหน่วยงาน";

/** The label above a person's public contact. */
const CONTACT_LABEL = "ช่องทางติดต่อ";

let admin: CmsActor;

const borrowed = new BorrowedEntries();

/** A text unique to this test run, marked synthetic: `${mark} ${words} ${ending}`. */
const marked = (words: string, ending: string) => `${SYNTHETIC_FIXTURE_MARK} ${words} ${ending}`;

/** A synthetic Personnel fixture: `title` is the name the site shows it by. */
interface PersonFixture extends DraftFixture {
	/** The display name, as staff type it. */
	displayName: string;
}

/**
 * A synthetic Personnel draft with the display name `${mark} ${name} ${ending}`, publicly visible
 * unless `data` says otherwise. Its `title` is the prefix, when given, before the display name.
 */
async function createPerson(
	name: string,
	data: Record<string, unknown> = {},
): Promise<PersonFixture> {
	const slug = syntheticSlug("person");
	const displayName = marked(name, slug.slice(-6));
	const created = await createSyntheticEntry(admin, "personnel", {
		data: { title: displayName, public_visible: true, ...data },
		slug,
	});
	expect(created.result.ok, `Personnel ${slug}: ${nativeRefusalOf(created.result)}`).toBe(true);
	const prefix = typeof data.prefix === "string" ? data.prefix : "";
	return { id: created.entryId!, slug, title: `${prefix}${displayName}`, displayName };
}

async function publish(...people: DraftFixture[]): Promise<void> {
	for (const person of people) {
		await publishEntryAt(admin, "personnel", person.id);
	}
}

/** The ids of the runtime's published Personnel that are publicly visible. */
async function visiblePublishedPersonnel(): Promise<string[]> {
	const ids: string[] = [];
	let cursor: string | undefined;
	do {
		const listed = await cmsRequest(admin, "/_emdash/api/content/personnel", {
			searchParams: { status: "published", limit: "100", ...(cursor ? { cursor } : {}) },
		});
		expect(listed.ok, `listing the published Personnel: ${nativeRefusalOf(listed)}`).toBe(true);
		const data = nativeDataOf(listed) as {
			items: Array<{ id: string; data?: { public_visible?: unknown } }>;
			nextCursor?: string;
		};
		for (const item of data.items) {
			const visible = item.data?.public_visible;
			if (visible === true || visible === 1) ids.push(item.id);
		}
		cursor = data.nextCursor || undefined;
	} while (cursor !== undefined);
	return ids;
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

test.afterAll(async () => {
	if (admin === undefined) return;
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	expect(report.complete, `owned fixtures left: ${JSON.stringify(report)}`).toBe(true);
});

test("/about/leadership and /about/personnel show their empty states while no publicly visible Personnel is published", async ({
	page,
}) => {
	for (const id of await visiblePublishedPersonnel()) await borrowed.borrow(admin, "personnel", id);
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
		for (const [width, viewport] of Object.entries(VIEWPORTS)) {
			await page.setViewportSize(viewport);
			await expectNoAxeViolations(page, `${path} empty at ${width}`);
			await expectVisibleFocusOnEveryStop(page, `${path} empty at ${width}`);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);
	}
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

test("each person shows their profile image, prefix and name, position and unit, and their public contact only when set; nothing links to a per-person address", async ({
	page,
}) => {
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
	await publish(withContact, withoutContact);

	for (const { path } of PAGES) {
		await page.goto(path);
		const card = listedItem(page, withContact.title);
		await expect(card, `${path} lists the person once`).toHaveCount(1);
		await expect(card.getByRole("heading"), `${path}: the prefix leads the name`).toHaveText(
			`นาย${withContact.displayName}`,
		);
		await expectImageLoaded(card.locator("img"), `${path}: the profile image`);
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
	await page.goto(PERSONNEL.path);
	expect(await namesIn(page, unit), "the unit's heading names the unit").toEqual([
		withContact.title,
		withoutContact.title,
	]);
	await expectSiteNotFound(page, `/personnel/${withContact.slug}`, "a per-person address");
});

test.describe("accessibility and reflow", () => {
	test.beforeAll(async () => {
		const run = crypto.randomUUID().slice(0, 6);
		const media = await uploadSyntheticMedia(admin);
		expect(media.mediaId, "the synthetic profile image must upload").toBeDefined();
		const unit = marked("หน่วยงานทดสอบการเข้าถึงที่มีชื่อยาวมากเพื่อดูการตัดบรรทัด", run);
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
