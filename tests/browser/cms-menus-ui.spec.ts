// The Admin menu editor picks the Homepage's content (#65; spec #51 "Homepage (`04`, Figma order)",
// approved Q11; `04` §14: staff pick canonical content and never type its URL or id).
//
// In the native editor of homepage-featured, whose heading is the menu's label stating its purpose
// (Product Owner, 2026-10-31: #65 comment 6538358352), "Add Content" opens EmDash's content picker,
// which browses every collection (emdash 1.1.0 @emdash-cms/admin/dist/index.js
// ContentPickerModal). Staff pick an entry of each kind that can be Featured, and the menu then
// holds a `collection` item with that entry's id for each, in the order picked. The Homepage shows
// the first as Featured.
//
// Session: the browser signs in through EmDash's development-only
// GET /_emdash/api/auth/dev-bypass, opted in with SONGHEALTH_ADMIN_SESSION=dev-bypass, which
// scripts/dev-runtime-env.sh sets, and logs out afterwards; without the opt-in the test skips. The
// menu is emptied first and put back afterwards (cms.helpers.ts withHomepageMenus). Fixtures are
// synthetic entries, removed afterwards.

import { expect, test } from "@playwright/test";

import {
	ADMIN_SESSION_ENV,
	HOMEPAGE_MENUS,
	closeDevAdminSession,
	cmsRequest,
	createSyntheticDraft,
	createSyntheticHealthReport,
	devAdminActor,
	devAdminSessionRequested,
	nativeDataOf,
	openDevAdminSession,
	publishEntryAt,
	removeSuiteFixtures,
	withHomepageMenus,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers";

/** homepage-featured's label (seed/seed.json), the heading of its editor. */
const FEATURED_LABEL = "หน้าแรก: เรื่องเด่น (แสดงรายการแรกที่เผยแพร่อยู่)";

/**
 * Each kind that can be Featured, and the label the picker lists its collection by
 * (seed/seed.json).
 */
const FEATURED_KINDS = [
	["news", "ข่าว"],
	["announcements", "ประกาศ"],
	["health_content", "ความรู้สุขภาพ"],
	["services", "บริการ"],
	["activities", "กิจกรรม"],
	["health_reports", "รายงานสุขภาพ"],
] as const;

let admin: CmsActor;
let sessionRequested = false;

test.beforeAll(async () => {
	sessionRequested = await devAdminSessionRequested();
	admin = await devAdminActor();
});

test.afterAll(() => removeSuiteFixtures(admin));

test("the menu editor picks an entry of each Featured kind, saved by its id, and the Homepage shows the first", async ({
	page,
	context,
}) => {
	test.skip(
		!sessionRequested,
		`set ${ADMIN_SESSION_ENV}=dev-bypass to run the native Admin UI journeys with the development Admin session`,
	);
	const picked: Array<{ collection: string; label: string; entry: DraftFixture }> = [];
	for (const [collection, label] of FEATURED_KINDS) {
		const entry =
			collection === "health_reports"
				? await createSyntheticHealthReport(admin, "picker")
				: await createSyntheticDraft(admin, collection, label, "picker");
		await publishEntryAt(admin, collection, entry.id);
		picked.push({ collection, label, entry });
	}

	await withHomepageMenus(admin, { featured: [] }, async () => {
		await openDevAdminSession(context);
		try {
			await page.goto(`/_emdash/admin/menus/${HOMEPAGE_MENUS.featured}`);
			await page.locator("#emdash-boot-loader").waitFor({ state: "detached", timeout: 20_000 });
			await expect(page.getByRole("heading", { name: FEATURED_LABEL })).toBeVisible();
			for (const { label, entry } of picked) {
				// The editor's header and its empty state each have an Add Content button.
				await page.getByRole("button", { name: "Add Content" }).first().click();
				// The picker is named by its title, because the "Item added" toast is a dialog too.
				const picker = page.getByRole("dialog", { name: "Select content" });
				await picker.getByRole("combobox", { name: "Collection" }).click();
				await page.getByRole("option", { name: label, exact: true }).click();
				await picker.getByPlaceholder("Search content...").fill(entry.slug.slice(-6));
				await picker.getByRole("button", { name: entry.title }).click();
				await expect(picker).toHaveCount(0);
			}
		} finally {
			expect(await closeDevAdminSession(context), "the native logout").toBe(200);
		}

		const menu = nativeDataOf(
			await cmsRequest(admin, `/_emdash/api/menus/${HOMEPAGE_MENUS.featured}`),
		);
		const items = (menu?.items ?? []) as Array<{
			type: string;
			referenceCollection: string;
			referenceId: string;
		}>;
		expect(
			items.map(({ type, referenceCollection, referenceId }) => [
				type,
				referenceCollection,
				referenceId,
			]),
		).toEqual(picked.map(({ collection, entry }) => ["collection", collection, entry.id]));

		await page.goto("/");
		const first = picked[0]!.entry.title;
		await expect(
			page.getByRole("region", { name: first }).getByRole("heading", { level: 2 }),
		).toHaveText(first);
	});
});
