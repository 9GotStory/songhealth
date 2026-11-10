// The shared filter form's clear action (Feature 007 #197; spec #190 "FilterForm clear action",
// Seam A; Product Owner, #190 comment 6707205912, FilterForm B), in the five lists the form serves.
// The suite's own terms and entries make each list's real filtered results.

import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	syntheticSlug,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	SECTION_CRUMBS,
	boxOf,
	expect,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	listedTitles,
	test,
	testAccessibilityAndReflow,
	thaiWord,
} from "./public.helpers";

const SUBMIT = "แสดงผล";
const CLEAR = "ล้างตัวกรอง";
const FISCAL_YEAR = 2569;
/**
 * The widths spec #190 Seam A names: the ticket's 320, 375 and 1,440 px, both sides of the form's
 * 640 px edge and of the header's 1024 px edge, and 768 px.
 */
const WIDTHS = [320, 375, 639, 640, 768, 1023, 1024, 1440];
/** `sm:w-72` on a field from 640 px. */
const FIELD_WIDTH = 288;

const BRAND_PRIMARY = "rgb(11, 107, 87)";
const BRAND_DARK = "rgb(18, 60, 51)";
const SURFACE_SOFT = "rgb(234, 245, 240)";
const WHITE = "rgb(255, 255, 255)";
const BORDER_INPUT = "rgb(122, 138, 131)";

/** One list the form serves. */
interface ListForm {
	/** Names the list in the test titles. */
	name: string;
	path: string;
	/** The form's accessible name. */
	form: string;
	heading: string;
	crumbs: ReadonlyArray<readonly [label: string, href: string]>;
	/** Queries with a value the list's parser sets aside, so they apply no filter. */
	unapplied?: string[];
}

const SERVICES: ListForm = {
	name: "Services",
	path: "/services",
	form: "กรองบริการ",
	heading: "บริการประชาชน",
	crumbs: [HOME_CRUMB],
};
const DOCUMENTS: ListForm = {
	name: "Documents",
	path: "/documents",
	form: "กรองเอกสาร",
	heading: "เอกสารเผยแพร่",
	crumbs: [HOME_CRUMB],
	unapplied: ["year=not-a-year"],
};
const HEALTH_NEWS: ListForm = {
	name: "Health News",
	path: "/news/health",
	form: "กรองข่าวสุขภาพ",
	heading: "ข่าวสุขภาพ",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.news],
};
const HEALTH_CONTENT: ListForm = {
	name: "Health Content",
	path: "/health/content",
	form: "กรองความรู้สุขภาพ",
	heading: "ความรู้สุขภาพ",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.health],
};
const DIRECTORY: ListForm = {
	name: "Health Service Directory",
	path: "/health-services",
	form: "ค้นหาหน่วยบริการ",
	heading: "หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.services],
};
const LIST_FORMS = [SERVICES, DOCUMENTS, HEALTH_NEWS, HEALTH_CONTENT, DIRECTORY];

/** One filter as a person sets it. A select's filter names the option; a text field has none. */
interface AppliedFilter {
	label: string;
	param: string;
	value: string;
	option?: string;
}

/** What the suite made for one list: every filter its form has, and the one entry they all keep. */
interface ListFixtures {
	filters: AppliedFilter[];
	matching: DraftFixture;
}

let admin: CmsActor;
const ownedTerms: SyntheticTerm[] = [];
const fixtures = new Map<ListForm, ListFixtures>();

const fixturesOf = (list: ListForm) => fixtures.get(list)!;
const formOf = (page: Page, { form }: ListForm) => page.getByRole("form", { name: form });
const submitOf = (form: Locator) => form.getByRole("button", { name: SUBMIT, exact: true });
const clearOf = (form: Locator) => form.getByRole("link", { name: CLEAR, exact: true });
const fieldsOf = (form: Locator, filters: AppliedFilter[]) =>
	filters.map(({ label }) => form.getByLabel(label));

/** The list's address with its filters applied, in the order the form submits them. */
const filteredPath = (list: ListForm) =>
	`${list.path}?${new URLSearchParams(fixturesOf(list).filters.map(({ param, value }) => [param, value]))}`;

/** Set every field, as a draft the form has not submitted. */
async function chooseFilters(form: Locator, filters: AppliedFilter[]): Promise<void> {
	for (const { label, value, option } of filters) {
		const field = form.getByLabel(label);
		if (option === undefined) await field.fill(value);
		else await field.selectOption({ label: option });
	}
}

/** The list's own heading and breadcrumb, whatever its filters. */
async function expectListIdentity(page: Page, list: ListForm): Promise<void> {
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(list.heading);
	await expectBreadcrumb(page, list.crumbs, list.heading);
}

/** What a control looks like now. */
const lookOf = (part: Locator) =>
	part.evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			background: style.backgroundColor,
			color: style.color,
			borderColor: style.borderTopColor,
			borderWidth: style.borderTopWidth,
			radius: style.borderTopLeftRadius,
			underline: style.textDecorationLine,
		};
	});

/** The two actions and the form as the page lays them out now. */
async function measureActions(form: Locator) {
	return {
		form: await boxOf(form, "the form"),
		primary: await boxOf(submitOf(form), "the primary action"),
		primaryLook: await lookOf(submitOf(form)),
		secondary: await boxOf(clearOf(form), "the clear link"),
		secondaryLook: await lookOf(clearOf(form)),
	};
}

type MeasuredActions = Awaited<ReturnType<typeof measureActions>>;

/** The primary stays solid green at 44 px, and the actions sit apart inside the form. */
function expectActionsFit(
	{ form, primary, primaryLook, secondary }: MeasuredActions,
	label: string,
): void {
	expect(primary.height, `${label}: the primary's 44 px target`).toBeGreaterThanOrEqual(44);
	expect(primaryLook, `${label}: the primary is solid green`).toMatchObject({
		background: BRAND_PRIMARY,
		color: WHITE,
	});
	for (const [name, box] of [
		["the primary", primary],
		["the clear link", secondary],
	] as const) {
		expect(box.x, `${label}: ${name} starts inside the form`).toBeGreaterThanOrEqual(form.x);
		expect(box.x + box.width, `${label}: ${name} ends inside the form`).toBeLessThanOrEqual(
			form.x + form.width,
		);
	}
	const beside = primary.x + primary.width <= secondary.x;
	const below = primary.y + primary.height <= secondary.y;
	expect(beside || below, `${label}: the actions do not overlap`).toBe(true);
}

/** The clear link is an outlined soft pill as tall as the primary. */
function expectSecondaryAction(
	{ primary, secondary, secondaryLook }: MeasuredActions,
	label: string,
): void {
	expect(secondary.height, `${label}: the clear link's height matches the primary's`).toBe(
		primary.height,
	);
	expect(secondaryLook, `${label}: the clear link is an outlined soft pill`).toEqual({
		background: SURFACE_SOFT,
		color: BRAND_PRIMARY,
		borderColor: BORDER_INPUT,
		borderWidth: "1px",
		radius: "999px",
		underline: "none",
	});
}

/**
 * Press Enter on each action in turn: the primary applies the filters, the clear link undoes them.
 */
async function applyThenClearWithEnter(page: Page, list: ListForm): Promise<void> {
	const { filters, matching } = fixturesOf(list);
	const form = formOf(page, list);
	await page.goto(list.path);
	await chooseFilters(form, filters);
	await submitOf(form).press("Enter");
	await expect(page).toHaveURL(filteredPath(list));
	expect(await listedTitles(page), `${list.name}: the filtered results`).toEqual([matching.title]);

	await clearOf(form).press("Enter");
	await expect(page).toHaveURL(list.path);
	await expect(clearOf(form), `${list.name}: nothing left to clear`).toHaveCount(0);
}

test.use({ viewport: MOBILE_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	const term = (taxonomy: string, label: string) =>
		createOwnedTerm(admin, taxonomy, label, ownedTerms);
	const published = async <T extends DraftFixture>(collection: string, draft: Promise<T>) => {
		const fixture = await draft;
		await publishEntryAt(admin, collection, fixture.id);
		return fixture;
	};
	const topic = await term("topic", "ประเด็นที่กรอง");
	const otherTopic = await term("topic", "ประเด็นอื่น");
	const topicFilter: AppliedFilter = {
		label: "ประเด็นสุขภาพ",
		param: "topic",
		value: topic.slug,
		option: topic.label,
	};

	const category = await term("service_category", "หมวดที่กรอง");
	const otherCategory = await term("service_category", "หมวดอื่น");
	const service = (label: string, slug: string) =>
		published(
			"services",
			createSyntheticService(admin, label, { taxonomies: { service_category: [slug] } }),
		);
	fixtures.set(SERVICES, {
		filters: [
			{
				label: "หมวดบริการ",
				param: "category",
				value: category.slug,
				option: category.label,
			},
		],
		matching: await service("clear-matching", category.slug),
	});
	await service("clear-other", otherCategory.slug);

	const type = await term("document_type", "ประเภทที่กรอง");
	const otherType = await term("document_type", "ประเภทอื่น");
	const file = await uploadSyntheticPdf(admin);
	const document = (label: string, fields: { type: string; topic: string; year: number }) =>
		published(
			"documents",
			createSyntheticDocument(admin, label, {
				file,
				data: { fiscal_year: fields.year },
				taxonomies: { document_type: [fields.type], topic: [fields.topic] },
			}),
		);
	const matchingFields = { type: type.slug, topic: topic.slug, year: FISCAL_YEAR };
	fixtures.set(DOCUMENTS, {
		filters: [
			{ label: "ประเภทเอกสาร", param: "type", value: type.slug, option: type.label },
			topicFilter,
			{
				label: "ปีงบประมาณ",
				param: "year",
				value: String(FISCAL_YEAR),
				option: String(FISCAL_YEAR),
			},
		],
		matching: await document("clear-matching", matchingFields),
	});
	await document("clear-other-type", { ...matchingFields, type: otherType.slug });
	await document("clear-other-topic", { ...matchingFields, topic: otherTopic.slug });
	await document("clear-other-year", { ...matchingFields, year: FISCAL_YEAR - 1 });

	for (const [list, collection] of [
		[HEALTH_NEWS, "news"],
		[HEALTH_CONTENT, "health_content"],
	] as const) {
		const entry = (label: string, slug: string) =>
			published(
				collection,
				createSyntheticDraft(admin, collection, list.name, label, {
					taxonomies: { topic: [slug] },
				}),
			);
		fixtures.set(list, {
			filters: [topicFilter],
			matching: await entry("clear-matching", topic.slug),
		});
		await entry("clear-other", otherTopic.slug);
	}

	const area = await term("area", "ตำบลที่กรอง");
	const otherArea = await term("area", "ตำบลอื่น");
	const nameWord = thaiWord();
	const healthService = (label: string, displayName: string, slug: string) =>
		published(
			"health_services",
			createSyntheticHealthService(admin, label, { displayName, taxonomies: { area: [slug] } }),
		);
	fixtures.set(DIRECTORY, {
		filters: [
			{ label: "พื้นที่รับผิดชอบ", param: "area", value: area.slug, option: area.label },
			{ label: "ชื่อหน่วยบริการ", param: "name", value: nameWord },
		],
		matching: await healthService("clear-matching", `รพ.สต.${nameWord}`, area.slug),
	});
	await healthService("clear-other-name", "โรงพยาบาลอื่น", area.slug);
	await healthService("clear-other-area", `รพ.สต.${nameWord}ใต้`, otherArea.slug);
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

for (const list of LIST_FORMS) {
	test(`${list.name}: a submitted filter narrows the list in its address, and the clear link opens the whole list`, async ({
		page,
		browser,
	}) => {
		const { filters, matching } = fixturesOf(list);
		const form = formOf(page, list);
		await page.goto(list.path);
		const whole = await listedTitles(page);
		await expect(clearOf(form), "no filter is applied yet").toHaveCount(0);

		await chooseFilters(form, filters);
		await expect(clearOf(form), "a draft change is not an applied filter").toHaveCount(0);
		await expect(page, "a draft change stays out of the address").toHaveURL(list.path);

		await submitOf(form).click();
		await expect(page).toHaveURL(filteredPath(list));
		expect(await listedTitles(page), "only what every filter keeps").toEqual([matching.title]);
		for (const { label, value } of filters) {
			await expect(form.getByLabel(label), `${label} shows what is applied`).toHaveValue(value);
		}
		await expect(clearOf(form), "the clear link opens the list's own address").toHaveAttribute(
			"href",
			list.path,
		);
		await expectListIdentity(page, list);

		const context = await browser.newContext();
		try {
			const other = await context.newPage();
			await other.goto(page.url());
			expect(await listedTitles(other), "the shared address reproduces the results").toEqual([
				matching.title,
			]);
		} finally {
			await context.close();
		}

		// A draft back to "any" in the first field, a select in every list.
		await form.getByLabel(filters[0].label).selectOption("");
		await expect(
			clearOf(form),
			"a draft change does not take away an applied filter's clear link",
		).toHaveAttribute("href", list.path);

		await clearOf(form).click();
		await expect(page).toHaveURL(list.path);
		expect(await listedTitles(page), "the whole list again").toEqual(whole);
		for (const { label } of filters) {
			await expect(form.getByLabel(label), `${label} is empty again`).toHaveValue("");
		}
		await expect(clearOf(form), "nothing left to clear").toHaveCount(0);
		await expectListIdentity(page, list);
	});

	test(`${list.name}: the clear link shows only for a filter the server applied`, async ({
		page,
	}) => {
		const { filters } = fixturesOf(list);
		const form = formOf(page, list);
		const matchesNothing = syntheticSlug("no-such-value");
		for (const query of [
			"page=2",
			"utm_source=synthetic",
			...filters.flatMap(({ param }) => [`${param}=`, `${param}=%20`]),
			...(list.unapplied ?? []),
		]) {
			await page.goto(`${list.path}?${query}`);
			await expect(clearOf(form), `${query} applies no filter`).toHaveCount(0);
		}
		for (const query of [
			...filters.map(({ param, value }) => `${param}=${encodeURIComponent(value)}`),
			`${filters[0].param}=${matchesNothing}`,
		]) {
			await page.goto(`${list.path}?${query}`);
			await expect(clearOf(form), `${query} is applied`).toHaveAttribute("href", list.path);
		}
	});

	// The form carries no page number, so a page past the end of a short list shows the restart.
	test(`${list.name}: submitting from a later page starts the list again, and clearing drops the page too`, async ({
		page,
	}) => {
		const { matching } = fixturesOf(list);
		const form = formOf(page, list);
		const laterPage = `${filteredPath(list)}&page=2`;
		await page.goto(laterPage);
		expect(await listedTitles(page), "the short list has no second page").toEqual([]);

		await submitOf(form).click();
		await expect(page).toHaveURL(filteredPath(list));
		expect(await listedTitles(page), "the filter's first page").toEqual([matching.title]);

		await page.goto(laterPage);
		await clearOf(form).click();
		await expect(page).toHaveURL(list.path);
	});

	test(`${list.name}: the actions fit the form and the clear link matches the primary at every width`, async ({
		page,
	}) => {
		const { filters } = fixturesOf(list);
		const form = formOf(page, list);
		await page.goto(filteredPath(list));
		await page.evaluate(() => document.fonts.ready);
		const measured: Array<[label: string, actions: MeasuredActions]> = [];
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${list.name} at ${width} px`;
			await expectNoHorizontalScroll(page, label);
			const fields = fieldsOf(form, filters);
			if (width < 640) {
				await expectStacked(label, [
					...fields.map((field, index): [string, Locator] => [filters[index].label, field]),
					["the primary action", submitOf(form)],
				]);
			} else {
				for (const [index, field] of fields.entries()) {
					const { width: fieldWidth } = await boxOf(field, filters[index].label);
					expect(fieldWidth, `${label}: ${filters[index].label} keeps its width`).toBe(FIELD_WIDTH);
				}
			}
			measured.push([label, await measureActions(form)]);
		}
		for (const [label, actions] of measured) expectActionsFit(actions, label);

		// The viewport is the widest of WIDTHS here, where a pointer can hover.
		await submitOf(form).hover();
		expect(await lookOf(submitOf(form)), "the primary's hover").toMatchObject({
			background: BRAND_DARK,
		});

		for (const [label, actions] of measured) expectSecondaryAction(actions, label);

		const clear = clearOf(form);
		const atRest = await boxOf(clear, "the clear link at rest");
		await clear.hover();
		expect(await lookOf(clear), "the clear link's hover").toMatchObject({ background: WHITE });
		expect(await boxOf(clear, "the clear link hovered"), "hover moves nothing").toEqual(atRest);
	});

	test(`${list.name}: Tab goes from the last field to the primary and the clear link, and Enter follows each`, async ({
		page,
	}) => {
		const { filters } = fixturesOf(list);
		const form = formOf(page, list);
		await page.goto(filteredPath(list));
		await form.getByLabel(filters.at(-1)!.label).focus();
		await page.keyboard.press("Tab");
		await expect(submitOf(form)).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(clearOf(form)).toBeFocused();

		await applyThenClearWithEnter(page, list);
	});
}

testAccessibilityAndReflow("the five filtered lists", () => LIST_FORMS.map(filteredPath));

test("the five filtered lists stay accessible and keep visible focus at 375 px", async ({
	page,
}) => {
	await page.setViewportSize(PHONE_VIEWPORT);
	for (const list of LIST_FORMS) {
		await page.goto(filteredPath(list));
		await expectNoAxeViolations(page, `${list.name} at 375 px`);
		await expectVisibleFocusOnEveryStop(page, `${list.name} at 375 px`);
	}
});

test.describe("without client JavaScript", () => {
	test.use({ javaScriptEnabled: false });
	for (const width of [320, 1440]) {
		for (const list of LIST_FORMS) {
			test(`${list.name}: at ${width} px the form applies and the link clears, as a plain form and link`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 900 });
				await applyThenClearWithEnter(page, list);
			});
		}
	}
});
